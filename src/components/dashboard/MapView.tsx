import { useEffect, useRef } from "react";
import type * as LeafletType from "leaflet";
import { INCIDENT_META, KASKELEN_CENTER, type Incident, type IncidentType } from "@/lib/incidents";

interface Props {
  incidents: Incident[];
  language: "ru" | "kz";
  onSelect?: (i: Incident) => void;
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

export function MapView({ incidents, language, onSelect }: Props) {
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

      const powerIncidents = incidents.filter((i) => i.type === "power");

      const calculateRiskScore = (count: number) => {
        if (count <= 1) return 15;
        if (count === 2) return 30;
        if (count === 3) return 50;
        if (count === 4) return 70;
        if (count === 5) return 85;
        return 100;
      };

      if (powerIncidents.length >= 3) {
        let hotspotGroup: typeof powerIncidents = [];
        let hotspotCount = 0;

        powerIncidents.forEach((candidate) => {
          const nearby = powerIncidents.filter((other) => {
            const latDiff = Math.abs(candidate.latitude - other.latitude);
            const lonDiff = Math.abs(candidate.longitude - other.longitude);
            return latDiff < 0.01 && lonDiff < 0.01;
          });

          if (nearby.length > hotspotCount) {
            hotspotCount = nearby.length;
            hotspotGroup = nearby;
          }
        });

        if (hotspotCount >= 3) {
          const centerLat =
            hotspotGroup.reduce((sum, item) => sum + item.latitude, 0) /
            hotspotGroup.length;

          const centerLng =
            hotspotGroup.reduce((sum, item) => sum + item.longitude, 0) /
            hotspotGroup.length;

          const hotspot = {
            ...hotspotGroup[0],
            latitude: centerLat,
            longitude: centerLng,
            riskScore: calculateRiskScore(hotspotCount),
            reportCount: hotspotCount,
          };

          const riskCircle = leaflet.circle([hotspot.latitude, hotspot.longitude], {
            radius: 1200,
            color: "#ff3b30",
            weight: 2,
            fillColor: "#ff3b30",
            fillOpacity: 0.18,
          }).addTo(map);

          leaflet.circle([hotspot.latitude, hotspot.longitude], {
            radius: 2200,
            color: "#ff3b30",
            weight: 1,
            fillColor: "#ff3b30",
            fillOpacity: 0.06,
          }).addTo(map);

          riskCircle.bindPopup(`
<div style="min-width:240px">
  <div style="color:#ff4d4d;font-weight:700;margin-bottom:8px">
    ${language === "ru" ? "AI АНАЛИЗ УГРОЗ" : "AI ҚАУІП ТАЛДАУЫ"}
  </div>
  <div>${language === "ru" ? "Оценка риска" : "Тәуекел көрсеткіші"}: ${calculateRiskScore(hotspotCount)}</div>
  <div>${language === "ru" ? "Обращений" : "Өтініштер"}: ${hotspotCount}</div>
  <div>${language === "ru" ? "Критичность" : "Қауіп деңгейі"}: ${language === "ru" ? "Критическая" : "Критикалық"}</div>
  <div style="margin-top:8px">
    ${language === "ru"
      ? "Обнаружено несколько сообщений об отключении электроснабжения в одной зоне."
      : "Бір аймақта электр қуатының өшуі туралы бірнеше хабарлама анықталды."}
  </div>
</div>
`);

          riskCircle.on("click", () => {
            if (onSelect) {
              onSelect({
                ...hotspot,
                riskScore: calculateRiskScore(hotspotCount),
                reportCount: hotspotCount,
              } as Incident);
            }
          });

          const riskMarker = leaflet.marker([hotspot.latitude, hotspot.longitude], {
            icon: leaflet.divIcon({
              className: "",
              html: `
                <div style="
                  color:#ff4d4d;
                  font-size:12px;
                  font-weight:700;
                  text-shadow:0 0 12px #ff4d4d;
                  white-space:nowrap;
                ">
                  ${t.highRiskZone}
                </div>
              `,
            }),
          }).addTo(map);

          riskMarker.on("click", () => {
            if (onSelect) {
              onSelect({
                ...hotspot,
                riskScore: calculateRiskScore(hotspotCount),
                reportCount: hotspotCount,
              } as Incident);
            }
          });
        }
      }

      incidents.forEach((incident) => {
        const meta = INCIDENT_META[incident.type as IncidentType];
        const categoryLabel =
          incident.type === "power"
            ? language === "ru"
              ? "Электросети"
              : "Электр желісі"
            : language === "ru"
              ? "Водоснабжение"
              : "Су жүйесі";

        const statusLabel = language === "ru" ? "Новый" : "Жаңа";

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
<div style="min-width:220px">
  <div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${meta.color}">
    ${t.citizenReport}
  </div>

  <div style="display:grid;gap:6px;margin-top:8px;font-size:12px">
    <div><strong>${t.category}:</strong> ${escapeHtml(categoryLabel)}</div>
    <div><strong>${t.status}:</strong> ${statusLabel}</div>
    <div><strong>${t.created}:</strong> ${createdLabel}</div>
    <div><strong>${t.userId}:</strong> ${escapeHtml(String(incident.userId ?? t.unknown))}</div>
  </div>
</div>
`);
        marker.on("click", () => {
          if (onSelect) {
            onSelect(null as unknown as Incident);
          }
        });
        marker.addTo(markersLayer);
      });

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
  }, [incidents]);

  return <div ref={containerRef} className="w-full h-full" />;
}
