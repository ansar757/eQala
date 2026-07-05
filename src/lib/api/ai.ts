import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function askCityAnalyst(
  question: string,
  incidents: any[],
  language: "ru" | "kz" = "ru"
) {
  const totalIncidents = incidents.length;
  const waterIncidents = incidents.filter((i) => i.type === "water").length;
  const powerIncidents = incidents.filter((i) => i.type === "power").length;
  const gasIncidents = incidents.filter((i) => i.type === "gas").length;
  const garbageIncidents = incidents.filter((i) => i.type === "garbage").length;
  const lightingIncidents = incidents.filter((i) => i.type === "lighting").length;
  const roadIncidents = incidents.filter((i) => i.type === "road").length;
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved").length;
  const activeIncidents = totalIncidents - resolvedIncidents;

  const waterPercentage =
    totalIncidents > 0
      ? Math.round((waterIncidents / totalIncidents) * 100)
      : 0;

  const powerPercentage =
    totalIncidents > 0
      ? Math.round((powerIncidents / totalIncidents) * 100)
      : 0;

  const resolutionRate =
    totalIncidents > 0
      ? Math.round((resolvedIncidents / totalIncidents) * 100)
      : 0;

  const recentDescriptions = incidents
    .map((i) => i.description)
    .filter(Boolean)
    .slice(0, 10)
    .join("; ");

  const highRiskIncidents = incidents.filter((incident) => {
    const lat = Number(incident.latitude);
    const lng = Number(incident.longitude);

    if (!lat || !lng) return false;

    const nearby = incidents.filter((other) => {
      const otherLat = Number(other.latitude);
      const otherLng = Number(other.longitude);

      if (!otherLat || !otherLng) return false;

      const distance = Math.sqrt(
        Math.pow(lat - otherLat, 2) +
        Math.pow(lng - otherLng, 2),
      );

      return distance < 0.003;
    });

    return nearby.length >= 3;
  });

  const hotspotSummary =
    highRiskIncidents.length > 0
      ? highRiskIncidents
          .map(
            (i) =>
              `Type: ${i.type}, Clustered citizen reports detected`,
          )
          .join(" | ")
      : "No major hotspots detected";

  const waterHotspots = highRiskIncidents.filter(
    (i) => i.type === "water",
  ).length;

  const powerHotspots = highRiskIncidents.filter(
    (i) => i.type === "power",
  ).length;

  const totalHotspots = highRiskIncidents.length;

  const categoryStats = [
    { type: "water", count: waterIncidents, label: "Water infrastructure" },
    { type: "power", count: powerIncidents, label: "Power infrastructure" },
    { type: "gas", count: gasIncidents, label: "Gas infrastructure" },
    { type: "garbage", count: garbageIncidents, label: "Waste management" },
    { type: "lighting", count: lightingIncidents, label: "Street lighting" },
    { type: "road", count: roadIncidents, label: "Road infrastructure" },
  ];

  const hotspotStats = [
    { type: "water", count: waterHotspots },
    { type: "power", count: powerHotspots },
    {
      type: "gas",
      count: highRiskIncidents.filter((i) => i.type === "gas").length,
    },
    {
      type: "garbage",
      count: highRiskIncidents.filter((i) => i.type === "garbage").length,
    },
    {
      type: "lighting",
      count: highRiskIncidents.filter((i) => i.type === "lighting").length,
    },
    {
      type: "road",
      count: highRiskIncidents.filter((i) => i.type === "road").length,
    },
  ];

  const dominantHotspot = [...hotspotStats].sort((a, b) => b.count - a.count)[0];

  const dominantCategory = [...categoryStats].sort((a, b) => b.count - a.count)[0];

  const highestPriorityIssue = dominantCategory?.label || "Mixed infrastructure";

  const reportLanguage =
    language === "kz"
      ? "Kazakh"
      : "Russian";

  const sectionNames =
    language === "kz"
      ? `
Бөлім атаулары:
- ЖАЛПЫ ҚОРЫТЫНДЫ
- АҒЫМДАҒЫ ЖАҒДАЙ
- ҮРДІСТЕР
- ҚАУІП АЙМАҚТАРЫ
- ҰСЫНЫЛАТЫН ӘРЕКЕТТЕР
`
      : `
Названия разделов:
- ОБЩАЯ СВОДКА
- ТЕКУЩЕЕ СОСТОЯНИЕ
- ТЕНДЕНЦИИ
- ЗОНЫ РИСКА
- РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ
`;

  const summarySection =
    language === "kz" ? "ЖАЛПЫ ҚОРЫТЫНДЫ" : "ОБЩАЯ СВОДКА";

  const statusSection =
    language === "kz" ? "АҒЫМДАҒЫ ЖАҒДАЙ" : "ТЕКУЩЕЕ СОСТОЯНИЕ";

  const trendsSection =
    language === "kz" ? "ҮРДІСТЕР" : "ТЕНДЕНЦИИ";

  const riskSection =
    language === "kz" ? "ҚАУІП АЙМАҚТАРЫ" : "ЗОНЫ РИСКА";

  const actionsSection =
    language === "kz" ? "ҰСЫНЫЛАТЫН ӘРЕКЕТТЕР" : "РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ";

  const cityContext = `
You are the Chief Urban Intelligence Officer of eQaskelen.

You are preparing an operational briefing for city officials.

LANGUAGE REQUIREMENT
- Generate the entire report only in ${reportLanguage}.
- Do not use English.
- Translate all section headers.
- Translate all recommendations.
- Use the following translated section headers exactly:
${sectionNames}

CITY STATISTICS
- Total incidents: ${totalIncidents}
- Water incidents: ${waterIncidents}
- Power incidents: ${powerIncidents}
- Gas incidents: ${gasIncidents}
- Garbage incidents: ${garbageIncidents}
- Lighting incidents: ${lightingIncidents}
- Road incidents: ${roadIncidents}
- Active incidents: ${activeIncidents}
- Resolved incidents: ${resolvedIncidents}
- Water share: ${waterPercentage}%
- Power share: ${powerPercentage}%
- Resolution rate: ${resolutionRate}%
- Total hotspot zones: ${totalHotspots}
- Highest priority issue: ${highestPriorityIssue}

HOTSPOT ANALYSIS
- ${hotspotSummary}
- Water hotspot zones: ${waterHotspots}
- Power hotspot zones: ${powerHotspots}
- Dominant hotspot category: ${dominantHotspot?.type || "none"}

TOP ISSUE ANALYSIS
- Dominant category: ${dominantCategory.type}
- Incident count: ${dominantCategory.count}
- Operational priority: ${highestPriorityIssue}

RECENT INCIDENT DESCRIPTIONS
- ${recentDescriptions || "No descriptions available"}

Under every section heading, output only bullet points beginning with '-'.

CRITICAL REPORTING RULES

This report is intended for municipal executives.
Do NOT repeat the same idea across different sections.
Each section must provide unique information.

SECTION PURPOSES

${summarySection}
- Explain the most important factual conclusion.
- Identify the dominant category.
- Explain its share of total incidents.
- No recommendations.
- No forecasts.

${statusSection}
- Describe current service performance.
- Discuss active vs resolved issues.
- Mention response effectiveness and service stability.
- No forecasts.
- No recommendations.

${trendsSection}
- Compare categories by incident volume.
- Identify the largest and second-largest categories.
- Include water share percentage and power share percentage.
- Use only observable trends from current data.
- No forecasts.

${riskSection}
- Focus ONLY on hotspot clusters.
- Mention hotspot counts.
- Identify the dominant hotspot category.
- Explain what hotspot concentration indicates.
- Do NOT discuss citywide statistics.

${actionsSection}
- Provide concrete management actions.
- Every recommendation must be different.
- Recommendation 1 must address the dominant category.
- Recommendation 2 must address hotspot zones.
- Recommendation 3 must address service reliability or prevention.

CONTENT RULES
- Think like a city operations center.
- Do not repeat the same sentence structure.
- Do not repeat the same conclusion in multiple sections.
- Avoid phrases like 'this issue must be solved' or 'special measures are required'.
- Every bullet must contain a different insight.
- Prefer comparisons, interpretations and measurable observations.
- Explain the category using available statistics.
- Explain WHAT action should be prioritized.
- Use management language.
- Sound like a Palantir-style operational briefing.
- Maximum 25 words per bullet.
- Be concise and specific.
- Never invent locations.
- Never invent statistics.
- Never mention AI.
- Never mention AI.
- Do not use words equivalent to operational significance, escalation, strategic importance, priority pressure, or future growth.
- Do not invent forecasts.
- Use only facts that can be derived from the provided incident statistics.
- Avoid abstract management language.

Current incident database:
Generate a professional municipal operations briefing.
The response must be concise and dashboard-ready.
Use only the required section headers.
Do not write introductions or conclusions.
Do not output JSON.
Do not output coordinates.
Do not invent locations.
Use percentages where possible.
Focus on measurable statistics and current city status.
Use short management-ready bullet points.
${JSON.stringify(incidents, null, 2)}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.15,
    messages: [
      {
        role: "system",
        content: cityContext,
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  return completion.choices[0]?.message?.content || "No response received.";
}