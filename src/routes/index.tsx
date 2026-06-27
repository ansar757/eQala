import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar, type ModuleKey } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { mapIncidentRow, type Incident } from "@/lib/incidents";
import { MapView } from "@/components/dashboard/MapView";
import { askCityAnalyst } from "@/lib/api/ai";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [active, setActive] = useState<ModuleKey>("overview");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<Incident | null>(null);
  const [language, setLanguage] = useState<"ru" | "kz">("kz");
  const [viewMode, setViewMode] = useState<"incidents" | "risk">("incidents");
  const [aiReport, setAiReport] = useState("");

  useEffect(() => {
    async function loadIncidents() {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setIncidents((data || []).map(mapIncidentRow));
    }

    loadIncidents();
  }, []);

  const filteredIncidents =
    active === "water"
      ? incidents.filter((i) => i.type === "water")
      : active === "power"
        ? incidents.filter((i) => i.type === "power")
        : incidents;

  console.log("ACTIVE MODULE:", active);
  console.log("FILTERED INCIDENTS:", filteredIncidents);

  const testAI = async () => {
    try {
      let question = "Generate an executive city report";

      if (active === "water") {
        question = "Analyze the water infrastructure situation and provide recommendations";
      }

      if (active === "power") {
        question = "Analyze the electrical infrastructure situation and provide recommendations";
      }

      console.log("AI QUESTION:", question);
      console.log("AI DATA SENT:", filteredIncidents);

      const answer = await askCityAnalyst(
        question,
        filteredIncidents,
        language,
      );

      console.log(answer);
      setAiReport(answer);
    } catch (error) {
      console.error("AI Analyst error:", error);
      setAiReport("AI Analyst error. Check console.");
    }
  };

  const resolveIncident = async (id: string) => {
    const incident = incidents.find((i) => i.id === id);

    const comment = window.prompt(
      language === "ru"
        ? "Введите комментарий службы"
        : "Қызмет түсіндірмесін енгізіңіз",
      language === "ru"
        ? "Выполнены ремонтные работы на участке."
        : "Учаскеде жөндеу жұмыстары жүргізілді.",
    );

    if (!comment) return;

    const { error } = await supabase
      .from("incidents")
      .update({ status: "resolved" })
      .eq("id", id);

    if (error) {
      console.error("Resolve error:", error);
      return;
    }

    if (incident?.userId) {
      await supabase.from("notifications").insert({
        user_id: Number(incident.userId),
        category: incident.type,
        message: `✅ Ваше обращение было рассмотрено.\n\nКатегория: ${incident.type}\nСтатус: Решено\n\nКомментарий службы:\n${comment}\n\nСпасибо за участие в развитии цифрового Каскелена.`,
        sent: false,
      });
    }

    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id
          ? { ...incident, status: "resolved" }
          : incident,
      ),
    );
  };

  const reportSections = aiReport
    .split(/\n(?=[#A-ZА-ЯӘҚҢӨҰҮҺ])/)
    .filter(Boolean);

  return (
    <div className="h-screen flex">
      <Sidebar
        active={active}
        onChange={setActive}
        language={language}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          totalActive={incidents.length}
          language={language}
          setLanguage={(lang) => {
            setLanguage(lang);
            setAiReport("");
          }}
        />

        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-[1000] flex overflow-hidden rounded-lg border border-white/10 bg-black/80 backdrop-blur">
            <button
              onClick={() => setViewMode("incidents")}
              className={`px-4 py-2 text-sm ${viewMode === "incidents" ? "bg-white/20" : ""}`}
            >
              {language === "ru" ? "📍 Обращения" : "📍 Өтініштер"}
            </button>
            <button
              onClick={() => setViewMode("risk")}
              className={`px-4 py-2 text-sm ${viewMode === "risk" ? "bg-white/20" : ""}`}
            >
              {language === "ru" ? "🔥 Зоны риска" : "🔥 Қауіп аймақтары"}
            </button>
            <button
              onClick={testAI}
              className="px-4 py-2 text-sm transition-all duration-300 hover:scale-105 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] active:scale-95"
            >
              {language === "ru" ? "🤖 AI Аналитик" : "🤖 AI Аналитик"}
            </button>
          </div>
          {aiReport && (
            <div className="absolute top-20 left-4 z-[1500] w-[480px] max-h-[650px] overflow-auto rounded-3xl border border-cyan-500/20 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-bold tracking-wide text-cyan-300">
                    {language === "ru"
                      ? "🤖 AI Аналитик Города"
                      : "🤖 Қалалық AI Аналитик"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === "ru"
                      ? "Оперативная городская сводка"
                      : "Қалалық жедел есеп"}
                  </p>
                </div>

                <button
                  onClick={() => setAiReport("")}
                  className="rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {reportSections.map((section, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-cyan-500/10 bg-black/20 p-4 transition-all duration-300 hover:border-cyan-400/30 hover:bg-black/30"
                  >
                    <div className="mb-3 text-sm font-bold uppercase tracking-wider text-cyan-300">
                      {section.includes("ҚОРЫТЫНДЫ") || section.includes("СВОДКА")
                        ? "📊 "
                        : section.includes("ЖАҒДАЙ") || section.includes("СОСТОЯНИЕ")
                          ? "📈 "
                          : section.includes("ҚАУІП") || section.includes("РИСК")
                            ? "🔥 "
                            : section.includes("ӘРЕКЕТ") || section.includes("ДЕЙСТВ")
                              ? "🎯 "
                              : "📋 "}
                      {section.split("\n")[0].replace(/^#+\s*/, "")}
                    </div>

                    <div className="space-y-2 text-sm leading-7 text-slate-100">
                      {section
                        .split("\n")
                        .slice(1)
                        .filter(Boolean)
                        .map((line, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 font-medium"
                          >
                            <span className="text-cyan-300 mr-2">✓</span>
                            {line.replace(/^[-•]\s*/, "")}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <MapView
            incidents={filteredIncidents}
            language={language}
            viewMode={viewMode}
            onSelect={(incident) => {
              const reportsCount = Number((incident as any)?.reportCount ?? 0);

              if (reportsCount >= 3) {
                setSelectedRisk(incident);
              } else {
                setSelectedRisk(null);
              }
            }}
          />
        </div>
      </div>

      <AnalyticsPanel
        incidents={filteredIncidents}
        selectedRisk={selectedRisk}
        language={language}
        onResolveIncident={resolveIncident}
      />
    </div>
  );
}
