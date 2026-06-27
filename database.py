from __future__ import annotations

import asyncio
import logging
import math
import os
import random
from dataclasses import dataclass
from typing import Any, Final

import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

INCIDENTS_TABLE: Final[str] = "incidents"
TRANSIENT_STATUS_CODES: Final[set[int]] = {408, 425, 429, 500, 502, 503, 504}


class DatabaseConfigurationError(RuntimeError):
    """Raised when mandatory database configuration is missing or invalid."""


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    key: str

    @classmethod
    def from_env(cls) -> "SupabaseConfig":
        load_dotenv()

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")

        missing = [name for name, value in (("SUPABASE_URL", url), ("SUPABASE_KEY", key)) if not value]
        if missing:
            raise DatabaseConfigurationError(
                "Missing required Supabase environment variable(s): "
                f"{', '.join(missing)}. Define them in .env before starting the bot."
            )

        assert url is not None
        assert key is not None

        return cls(url=url.rstrip("/"), key=key)


class SupabaseIncidentDatabase:
    """Async Supabase PostgREST wrapper for Telegram incident ingestion."""

    def __init__(
        self,
        config: SupabaseConfig,
        *,
        max_retries: int = 5,
        base_backoff_seconds: float = 0.5,
        max_backoff_seconds: float = 8.0,
    ) -> None:
        self._config = config
        self._max_retries = max_retries
        self._base_backoff_seconds = base_backoff_seconds
        self._max_backoff_seconds = max_backoff_seconds
        self._client: httpx.AsyncClient | None = None
        self._client_lock = asyncio.Lock()

    @property
    def is_open(self) -> bool:
        return self._client is not None and not self._client.is_closed

    async def open(self) -> None:
        async with self._client_lock:
            if self.is_open:
                return

            timeout = httpx.Timeout(connect=10.0, read=20.0, write=20.0, pool=10.0)
            limits = httpx.Limits(max_connections=20, max_keepalive_connections=10, keepalive_expiry=30.0)

            self._client = httpx.AsyncClient(
                base_url=f"{self._config.url}/rest/v1",
                headers={
                    "apikey": self._config.key,
                    "Authorization": f"Bearer {self._config.key}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=timeout,
                limits=limits,
                http2=True,
            )

        try:
            await self._healthcheck()
        except Exception:
            await self.close()
            raise

        logger.info("Supabase database client initialized successfully.")

    async def close(self) -> None:
        async with self._client_lock:
            if self._client is None:
                return

            await self._client.aclose()
            self._client = None
            logger.info("Supabase database client closed successfully.")

    async def insert_incident_report(
        self,
        user_id: int,
        category: str,
        lat: float,
        lon: float,
        description: str | None = None,
    ) -> bool:
        """Insert one incident report into Supabase.

        The database stores Telegram user id, category, and coordinates as
        category/lat/lon so the citizen reports map can render rows directly.
        """
        if not category.strip():
            logger.error("Incident insert rejected: empty category for user_id=%s.", user_id)
            return False

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            logger.error(
                "Incident insert rejected: invalid coordinates for user_id=%s lat=%s lon=%s.",
                user_id,
                lat,
                lon,
            )
            return False

        payload: dict[str, Any] = {
            "user_id": int(user_id),
            "category": category.strip(),
            "description": description.strip() if description else None,
            "lat": float(lat),
            "lon": float(lon),
            "status": "new",
        }

        for attempt in range(1, self._max_retries + 1):
            try:
                client = await self._get_client()
                response = await client.post(
                    f"/{INCIDENTS_TABLE}",
                    json=payload,
                    headers={"Prefer": "return=minimal"},
                )

                if 200 <= response.status_code < 300:
                    logger.info(
                        "Incident report inserted: user_id=%s category=%s description=%s lat=%s lon=%s.",
                        user_id,
                        category,
                        description,
                        lat,
                        lon,
                    )
                    return True

                if response.status_code not in TRANSIENT_STATUS_CODES:
                    logger.error(
                        "Permanent Supabase insert failure: user_id=%s status=%s body=%s.",
                        user_id,
                        response.status_code,
                        response.text,
                    )
                    return False

                logger.warning(
                    "Transient Supabase insert failure: attempt=%s/%s user_id=%s status=%s body=%s.",
                    attempt,
                    self._max_retries,
                    user_id,
                    response.status_code,
                    response.text,
                )
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.PoolTimeout, httpx.RemoteProtocolError) as exc:
                logger.warning(
                    "Transient Supabase network failure: attempt=%s/%s user_id=%s error=%r.",
                    attempt,
                    self._max_retries,
                    user_id,
                    exc,
                )
            except Exception:
                logger.exception("Unexpected Supabase insert failure: user_id=%s.", user_id)
                return False

            if attempt < self._max_retries:
                await asyncio.sleep(self._retry_delay(attempt))

        logger.error("Supabase insert exhausted retries: user_id=%s category=%s.", user_id, category)
        return False

    async def count_incidents_by_category(
        self,
        category: str,
        center_lat: float,
        center_lon: float,
        radius_meters: float = 300.0,
    ) -> int:
        """Count incidents of the same category within a radius."""

        try:
            client = await self._get_client()
            response = await client.get(
                f"/{INCIDENTS_TABLE}",
                params={
                    "select": "lat,lon",
                    "category": f"eq.{category}",
                },
            )

            if not (200 <= response.status_code < 300):
                logger.warning(
                    "Failed to count nearby incidents for category=%s status=%s",
                    category,
                    response.status_code,
                )
                return 0

            data = response.json()
            if not isinstance(data, list):
                return 0

            count = 0

            for incident in data:
                lat = incident.get("lat")
                lon = incident.get("lon")

                if lat is None or lon is None:
                    continue

                distance = self._haversine_meters(
                    center_lat,
                    center_lon,
                    float(lat),
                    float(lon),
                )

                if distance <= radius_meters:
                    count += 1

            return count

        except Exception:
            logger.exception("Failed to count nearby incidents for category=%s", category)
            return 0

    def _haversine_meters(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        earth_radius = 6371000.0

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2) ** 2
            + math.cos(phi1)
            * math.cos(phi2)
            * math.sin(delta_lambda / 2) ** 2
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return earth_radius * c

    async def _healthcheck(self) -> None:
        for attempt in range(1, self._max_retries + 1):
            try:
                client = await self._get_client()
                response = await client.get(f"/{INCIDENTS_TABLE}", params={"select": "id", "limit": "1"})

                if 200 <= response.status_code < 300:
                    return

                if response.status_code not in TRANSIENT_STATUS_CODES:
                    raise RuntimeError(
                        f"Supabase healthcheck failed with status={response.status_code}: {response.text}"
                    )

                logger.warning(
                    "Transient Supabase healthcheck failure: attempt=%s/%s status=%s body=%s.",
                    attempt,
                    self._max_retries,
                    response.status_code,
                    response.text,
                )
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.PoolTimeout, httpx.RemoteProtocolError) as exc:
                logger.warning(
                    "Transient Supabase healthcheck network failure: attempt=%s/%s error=%r.",
                    attempt,
                    self._max_retries,
                    exc,
                )

            if attempt < self._max_retries:
                await asyncio.sleep(self._retry_delay(attempt))

        raise RuntimeError("Supabase healthcheck exhausted retries; database is unavailable.")

    async def _get_client(self) -> httpx.AsyncClient:
        if not self.is_open:
            await self.open()

        assert self._client is not None
        return self._client

    def _retry_delay(self, attempt: int) -> float:
        exponential_delay = self._base_backoff_seconds * (2 ** (attempt - 1))
        capped_delay = min(exponential_delay, self._max_backoff_seconds)
        jitter = random.uniform(0.0, self._base_backoff_seconds)
        return capped_delay + jitter


database = SupabaseIncidentDatabase(SupabaseConfig.from_env())
