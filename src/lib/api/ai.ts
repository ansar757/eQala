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

Rules:
- Think like a municipal operations center and strategic advisor to the Akim.
- Do not repeat raw statistics unless they support a conclusion.
- Every bullet must contain an insight, risk assessment, trend, forecast, or management recommendation.
- Avoid obvious statements such as 'Total incidents = X' or 'Resolved incidents = X'.
- Explain what the numbers mean for city operations.
- Highlight dominant infrastructure sectors and citizen concerns.
- The summary section must explain why the dominant category is operationally important.
- The summary section must identify the highest-priority infrastructure issue.
- Analyze all categories: water, power, gas, garbage, lighting, and road.
- Determine which category generates the greatest operational pressure.
- Discuss citizen service issues separately from core infrastructure issues.
- Compare categories and identify which requires the most attention.
- Mention concentrations of similar incidents when detected.
- Never display raw latitude or longitude coordinates.
- Present findings as an executive operational briefing.
- Use concise but professional language.
- Every section must contain bullet points only.
- Maximum 3 bullet points per section.
- ${summarySection} must contain exactly 3 bullets.
- ${statusSection} must contain exactly 3 bullets.
- ${trendsSection} must contain exactly 3 bullets.
- ${riskSection} must contain exactly 2 bullets.
- ${actionsSection} must contain exactly 3 bullets.
- If Total hotspot zones is greater than 0, NEVER state that no hotspots exist.
- ${riskSection} must identify the dominant hotspot category using HOTSPOT ANALYSIS data only.
- Never confuse the dominant hotspot category with the dominant incident category.
- A hotspot exists only when at least 3 nearby incidents of the same category are clustered together.
- ${riskSection} must explicitly mention hotspot counts.
- Include a short forecast whenever possible.
- Create a forecast based on the dominant incident category.
- Forecast the likely development of the dominant category over the next operational period.
- Mention whether service stability is improving or deteriorating.
- Discuss likely future developments if current trends continue.
- Highlight emerging infrastructure risks.
- Recommendations must be practical and prioritized.
- The first recommendation must address the dominant category.
- Prioritize actions according to operational impact and incident volume.
- Recommendations must directly reference observed incidents.
- Do not recommend citywide action unless incident data supports it.
- Treat incidents with reportCount >= 3 as hotspot zones.
- If hotspot zones exist, describe them as clusters of citizen reports.
- Rank hotspot zones by severity.
- Clearly identify the highest-priority infrastructure issue.
- Include percentages when useful, but focus on interpretation rather than reporting.
- Include water share percentage and power share percentage in ${trendsSection}.
- Include resolution rate percentage in ${statusSection}.
- Use incident descriptions to infer probable root causes.
- Add management-oriented language such as operational stability, service reliability, response effectiveness, concentration of complaints, infrastructure pressure, risk escalation, and preventive measures.
- Sound similar to a Palantir, emergency operations center, or urban intelligence report.
- Never mention AI, datasets, missing information, limitations, or assumptions.
- Base all conclusions only on available incident data.

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
    temperature: 0.3,
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