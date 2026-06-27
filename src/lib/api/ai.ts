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

  const highestPriorityIssue =
    waterIncidents > powerIncidents
      ? "Water infrastructure"
      : powerIncidents > waterIncidents
        ? "Power infrastructure"
        : "Mixed infrastructure";

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

RECENT INCIDENT DESCRIPTIONS
- ${recentDescriptions || "No descriptions available"}

Under every section heading, output only bullet points beginning with '-'.

Rules:
- Think like a municipal operations center.
- Identify patterns and recurring infrastructure problems.
- Mention concentrations of similar incidents when detected.
- Never display raw latitude or longitude coordinates in the final report.
- Present findings in executive-report style rather than chatbot style.
- Prioritize actions by urgency.
- Use concise bullet points.
- Every section must contain bullet points only.
- Maximum 3 bullet points per section.
- ${summarySection} must contain exactly 3 bullets.
- ${statusSection} must contain exactly 3 bullets.
- ${trendsSection} must contain exactly 3 bullets.
- ${riskSection} must contain exactly 2 bullets.
- If Total hotspot zones is greater than 0, NEVER state that no hotspots exist.
- ${riskSection} must explicitly mention hotspot counts.
- ${riskSection} must identify the dominant hotspot type (water or power).
- ${actionsSection} must contain exactly 3 bullets.
- Never write explanatory text outside the required sections.
- Do not mention AI, datasets, limitations, or missing information.
- Provide practical recommendations for city management.
- Recommendations must directly reference observed incidents or descriptions.
- Do not recommend citywide actions unless supported by incident data.
- Treat incidents with reportCount >= 3 as hotspot zones.
- If hotspot zones exist, describe them as detected clusters of citizen reports.
- Highlight recurring complaints as potential infrastructure failures.
- Use incident descriptions to infer root causes when possible.
- Rank hotspot zones by severity.
- Clearly identify the highest-priority infrastructure problem.
- Use percentages whenever possible.
- Compare water incidents versus power incidents.
- Include water share percentage and power share percentage in the TRENDS section.
- Include resolution rate percentage in the CURRENT STATUS section.
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