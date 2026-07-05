const BASE_URL =
  "https://gis.kgp.kz/arcgis/rest/services/KPSSU/crime/FeatureServer/1/query";

export async function getCrimeData() {
  const params = new URLSearchParams({
    where: "reg_code='191952' AND yr=2025",
    outFields: "*",
    returnGeometry: "true",
    f: "json",
  });

  const response = await fetch(
    `${BASE_URL}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch crime data");
  }

  return await response.json();
}

export async function getCrimeStats() {
  const params = new URLSearchParams({
    where: "reg_code='191952' AND yr=2025",
    outFields: "crime_code,period,hard_code",
    returnGeometry: "false",
    f: "json",
  });

  const response = await fetch(
    `${BASE_URL}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch crime statistics");
  }

  const data = await response.json();

  const stats: Record<string, number> = {};
  const monthly: Record<number, number> = {};
  const severity: Record<string, number> = {};

  data.features?.forEach((feature: any) => {
    const code = feature.attributes?.crime_code ?? "unknown";
    const month = feature.attributes?.period;
    const hard = feature.attributes?.hard_code;
    stats[code] = (stats[code] || 0) + 1;
    monthly[month] = (monthly[month] || 0) + 1;
    severity[hard] = (severity[hard] || 0) + 1;
  });

  return {
    total: data.features?.length || 0,
    stats,
    monthly,
    severity,
  };
}

export async function getCrimeHotspots() {
  const data = await getCrimeData();

  const clusters = new Map<string, {
    count: number;
    fraud: number;
    theft: number;
    robbery: number;
  }>();

  data.features?.forEach((feature: any) => {
    const x = feature?.geometry?.x;
    const y = feature?.geometry?.y;

    if (typeof x !== "number" || typeof y !== "number") {
      return;
    }

    const cellX = Math.round(x / 500);
    const cellY = Math.round(y / 500);
    const key = `${cellX}:${cellY}`;

    const crimeCode = String(feature.attributes?.crime_code ?? "");

    if (!clusters.has(key)) {
      clusters.set(key, {
        count: 0,
        fraud: 0,
        theft: 0,
        robbery: 0,
      });
    }

    const cluster = clusters.get(key)!;

    cluster.count += 1;

    if (crimeCode === "1900") cluster.fraud += 1;
    if (crimeCode === "1880") cluster.theft += 1;
    if (crimeCode === "1910") cluster.robbery += 1;
  });

  return [...clusters.entries()]
    .map(([id, cluster]) => ({
      id,
      ...cluster,
      risk:
        cluster.count >= 150
          ? "HIGH"
          : cluster.count >= 80
            ? "MEDIUM"
            : "LOW",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}