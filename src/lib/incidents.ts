export type IncidentType = "water" | "power" | "gas";

export interface Incident {
  id: string;
  type: IncidentType;
  category: string;
  description: string | null;
  photoUrl: string | null;
  address: string | null;
  createdAt: string;
  status: string;
  latitude: number;
  longitude: number;
  userId: number | string | null;
}

export const INCIDENT_META: Record<IncidentType, { label: string; color: string; cssVar: string }> =
  {
    water: { label: "Water outage", color: "#4ab8ff", cssVar: "var(--water)" },
    power: { label: "Power outage", color: "#f4d03f", cssVar: "var(--power)" },
    gas: { label: "Gas issue", color: "#ff6b35", cssVar: "var(--gas)" },
  };

// Kaskelen, Kazakhstan ~ 43.2050, 76.6200
const CENTER: [number, number] = [43.205, 76.62];

export interface IncidentRow {
  id: string;
  created_at: string;
  user_id: number | string | null;
  category: string;
  description: string | null;
  photo_url: string | null;
  address: string | null;
  lat: number;
  lon: number;
  status: string;
}

export function normalizeIncidentType(value: string): IncidentType {
  const normalized = value.trim().toLowerCase();

  if (normalized === "water" || normalized.includes("вод") || normalized.includes("water")) {
    return "water";
  }

  if (
    normalized === "power" ||
    normalized.includes("свет") ||
    normalized.includes("элект") ||
    normalized.includes("power")
  ) {
    return "power";
  }

  if (
    normalized === "gas" ||
    normalized.includes("газ") ||
    normalized.includes("gas")
  ) {
    return "gas";
  }

  return "water";
}

export function mapIncidentRow(row: IncidentRow): Incident {
  const category = row.category ?? "road";
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  const type = normalizeIncidentType(category);

  return {
    id: row.id,
    type,
    category,
    description: row.description,
    photoUrl: row.photo_url,
    address: row.address,
    createdAt: row.created_at,
    status: row.status,
    latitude,
    longitude,
    userId: row.user_id,
  };
}

export const KASKELEN_CENTER = CENTER;
