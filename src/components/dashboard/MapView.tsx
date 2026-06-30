import { useEffect, useRef } from "react";
import type * as LeafletType from "leaflet";
import { INCIDENT_META, KASKELEN_CENTER, type Incident, type IncidentType } from "@/lib/incidents";

interface Props {
  incidents: Incident[];
  language: "ru" | "kz";
  onSelect?: (i: Incident) => void;
  viewMode?: "incidents" | "risk";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

export function MapView({ incidents, language, onSelect, viewMode = "incidents" }: Props) {
  const t = language === "ru"
    ? {
        citizenReport: "Обращение гражданина",
        category: "Категория",
        status: "Статус",
        created: "Создан",
        userId: "Пользователь",
        unknown: "Неизвестно",
        highRiskZone: "⚠ ЗОНА ВЫСОКОГО РИСКА",
      }
    : {
        citizenReport: "Тұрғын өтініші",
        category: "Санат",
        status: "Күйі",
        created: "Құрылған",
        userId: "Пайдаланушы",
        unknown: "Белгісіз",
        highRiskZone: "⚠ ЖОҒАРЫ ҚАУІП АЙМАҒЫ",
      };
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const markersRef = useRef<LeafletType.LayerGroup | null>(null);

  useEffect(() => {
    let leaflet: typeof LeafletType;
    let isMounted = true;
    let map: LeafletType.Map;
    let markersLayer: LeafletType.LayerGroup;
    let tileLayer: LeafletType.TileLayer;

    async function load() {
      leaflet = await import("leaflet");
      if (!isMounted) return;
      if (!containerRef.current) return;
      // Remove existing map if any
      if (mapRef.current) {
        mapRef.current.remove();
      }

      map = leaflet.map(containerRef.current).setView(KASKELEN_CENTER, 13);
      mapRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      tileLayer = leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tileLayer.addTo(map);

      markersLayer = leaflet.layerGroup().addTo(map);
      markersRef.current = markersLayer;

      const showRiskZones = viewMode === "risk";

      const getDistanceMeters = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
      ) => {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      if (showRiskZones && incidents.length >= 2) {
        const processedIndexes = new Set<number>();

        incidents.forEach((candidate, index) => {
          if (processedIndexes.has(index)) {
            return;
          }

          const nearby = incidents.filter((other) => {
            if (other.type !== candidate.type) {
              return false;
            }

            return (
              getDistanceMeters(
                candidate.latitude,
                candidate.longitude,
                other.latitude,
                other.longitude,
              ) <= 200
            );
          });

          if (nearby.length < 3) {
            return;
          }

          nearby.forEach((_, idx) => {
            const originalIndex = incidents.indexOf(nearby[idx]);
            if (originalIndex !== -1) {
              processedIndexes.add(originalIndex);
            }
          });

          const centerLat =
            nearby.reduce((sum, item) => sum + item.latitude, 0) /
            nearby.length;

          const centerLng =
            nearby.reduce((sum, item) => sum + item.longitude, 0) /
            nearby.length;

          const powerCount = nearby.filter(i => i.type === "power").length;
          const waterCount = nearby.filter(i => i.type === "water").length;
          const gasCount = nearby.filter(i => i.type === "gas").length;
          const garbageCount = nearby.filter(i => i.type === "garbage").length;
          const lightingCount = nearby.filter(i => i.type === "lighting").length;
          const roadCount = nearby.filter(i => i.type === "road").length;
          const hotspotCount = nearby.length;

          const uniqueUsersInCluster = new Set(
            nearby
              .map((i) => i.userId)
              .filter(Boolean)
          ).size;

          const clusterType =
            roadCount >= 3 ? "road" :
            garbageCount >= 3 ? "garbage" :
            lightingCount >= 3 ? "lighting" :
            gasCount >= 3 ? "gas" :
            powerCount >= 3 ? "power" :
            "water";

          let color = "";
          let label = "";
          let riskScore = 0;

          if (hotspotCount >= 6) {
            color = "#ff3b30";
            label = language === "ru" ? "HIGH RISK ZONE" : "ЖОҒАРЫ ҚАУІП АЙМАҒЫ";
            riskScore = 90;
          } else if (hotspotCount >= 3) {
            color = "#ffcc00";
            label = language === "ru" ? "MEDIUM RISK" : "ОРТАША ҚАУІП";
            riskScore = 60;
          } else {
            return;
          }

          const riskCircle = leaflet.circle([centerLat, centerLng], {
            radius: 300,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.28,
          }).addTo(map);

          leaflet.circle([centerLat, centerLng], {
            radius: 600,
            color,
            weight: 1,
            fillColor: color,
            fillOpacity: 0.12,
          }).addTo(map);

          leaflet.marker([centerLat, centerLng], {
            icon: leaflet.divIcon({
              className: "",
              iconSize: [80, 80],
              iconAnchor: [40, 40],
              html: `
                <div style="
                  width:80px;
                  height:80px;
                  border-radius:50%;
                  border:3px solid ${color};
                  position:relative;
                  animation:eq-hotspot-pulse 2s infinite;
                  box-shadow:0 0 20px ${color};
                "></div>
              `,
            }),
            interactive: false,
          }).addTo(map);

          riskCircle.bindPopup(`
<div style="min-width:240px">
  <div style="color:${color};font-weight:700;margin-bottom:8px">
    ${language === "ru" ? "AI АНАЛИЗ УГРОЗ" : "AI ҚАУІП ТАЛДАУЫ"}
  </div>
  <div>${language === "ru" ? "Всего обращений" : "Барлық өтініштер"}: ${hotspotCount}</div>
  <div>${language === "ru" ? "Уникальных пользователей" : "Бірегей пайдаланушылар"}: ${Math.max(uniqueUsersInCluster, 1)}</div>
  <div>${language === "ru" ? "⚡ Электроснабжение" : "⚡ Электрмен жабдықтау"}: ${powerCount}</div>
  <div>${language === "ru" ? "💧 Водоснабжение" : "💧 Су жабдықтау"}: ${waterCount}</div>
  <div>${language === "ru" ? "🔥 Газоснабжение" : "🔥 Газ жүйесі"}: ${gasCount}</div>
  <div>${language === "ru" ? "🗑 Мусор" : "🗑 Қоқыс"}: ${garbageCount}</div>
  <div>${language === "ru" ? "💡 Освещение" : "💡 Жарық"}: ${lightingCount}</div>
  <div>${language === "ru" ? "🛣 Дороги" : "🛣 Жолдар"}: ${roadCount}</div>
  <div>AI Risk Score: ${riskScore}%</div>
  <div>${language === "ru" ? "Кластер обращений обнаружен" : "Өтініштер кластері анықталды"}</div>
</div>
`);

          riskCircle.on("click", () => {
            if (onSelect) {
              onSelect({
                ...nearby[0],
                type: clusterType,
                latitude: centerLat,
                longitude: centerLng,
                reportCount: hotspotCount,
                uniqueUsers: Math.max(uniqueUsersInCluster, 1),
                riskScore,
              } as Incident);
            }
          });

          const riskMarker = leaflet.marker([centerLat, centerLng], {
            icon: leaflet.divIcon({
              className: "",
              html: `
                <div style="
                  display:flex;
                  flex-direction:column;
                  align-items:center;
                  gap:0;
                  color:${color};
                  font-weight:700;
                  text-shadow:0 0 12px ${color};
                  white-space:nowrap;
                ">
                  <div style="font-size:12px;">${label}</div>
                </div>
              `,
            }),
          }).addTo(map);

          riskMarker.on("click", () => {
            if (onSelect) {
              onSelect({
                ...nearby[0],
                type: clusterType,
                latitude: centerLat,
                longitude: centerLng,
                reportCount: hotspotCount,
                uniqueUsers: Math.max(uniqueUsersInCluster, 1),
                riskScore,
              } as Incident);
            }
          });
        });
      }

      if (viewMode === "incidents") {
        incidents.forEach((incident) => {
          const meta = INCIDENT_META[incident.type as IncidentType];
          const categoryLabel =
            incident.type === "power"
              ? language === "ru"
                ? "Электросети"
                : "Электр желісі"
              : incident.type === "gas"
                ? language === "ru"
                  ? "Газоснабжение"
                  : "Газ жүйесі"
                : incident.type === "garbage"
                  ? language === "ru"
                    ? "Проблемы с мусором"
                    : "Қоқыс мәселелері"
                  : incident.type === "lighting"
                    ? language === "ru"
                      ? "Уличное освещение"
                      : "Көше жарығы"
                    : incident.type === "road"
                      ? language === "ru"
                        ? "Проблемы с дорогой"
                        : "Жол мәселелері"
                      : language === "ru"
                        ? "Водоснабжение"
                        : "Су жүйесі";

          const statusLabel =
            incident.status === "resolved"
              ? language === "ru"
                ? "Решено"
                : "Шешілді"
              : incident.status === "in_progress"
                ? language === "ru"
                  ? "В работе"
                  : "Жұмыста"
                : language === "ru"
                  ? "Новый"
                  : "Жаңа";

          const createdLabel = new Date(incident.createdAt).toLocaleString(
            language === "ru" ? "ru-RU" : "kk-KZ",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          );

          const icon = leaflet.divIcon({
            className: "",
            iconSize: [26, 34],
            iconAnchor: [13, 34],
            popupAnchor: [0, -30],
            html: `
              <div class="eq-marker-pin eq-marker-pulse" style="--marker-color:${meta.color}">
                <span></span>
              </div>
            `,
          });
          const marker = leaflet.marker([incident.latitude, incident.longitude], { icon });
          marker.bindPopup(`
<div style="min-width:260px">
  <div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${meta.color}">
    ${t.citizenReport}
  </div>

  ${incident.photoUrl ? `
    <div style="margin-top:8px">
      <img
        src="${escapeHtml(String(incident.photoUrl))}"
        alt="Incident photo"
        style="width:100%;max-height:180px;object-fit:cover;border-radius:8px"
      />
    </div>
  ` : ""}

  <div style="display:grid;gap:6px;margin-top:8px;font-size:12px">
    <div><strong>${t.category}:</strong> ${escapeHtml(categoryLabel)}</div>
    <div><strong>${t.status}:</strong> ${statusLabel}</div>

    ${incident.address ? `
      <div><strong>📍 ${language === "ru" ? "Адрес" : "Мекенжай"}:</strong> ${escapeHtml(String(incident.address))}</div>
    ` : ""}

    ${incident.description ? `
      <div><strong>📝 ${language === "ru" ? "Описание" : "Сипаттама"}:</strong> ${escapeHtml(String(incident.description))}</div>
    ` : ""}

    <div><strong>${t.created}:</strong> ${createdLabel}</div>
    <div><strong>${t.userId}:</strong> ${escapeHtml(String(incident.userId ?? t.unknown))}</div>
  </div>
</div>
`);
          marker.on("click", () => {
            if (onSelect) {
              onSelect(incident);
            }
          });
          marker.addTo(markersLayer);
        });
      }

      if (incidents.length > 0) {
        const bounds = leaflet.latLngBounds(
          incidents.map((i) => [i.latitude, i.longitude] as [number, number]),
        );
        map.fitBounds(bounds, {
          maxZoom: 14,
          padding: [120, 120],
        });

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      } else {
        map.setView(KASKELEN_CENTER, 13);
      }
    }

    load();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, viewMode]);

  return (
    <>
      <style>{`
        @keyframes eq-hotspot-pulse {
          0% { transform: scale(0.8); opacity: 0.9; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}
