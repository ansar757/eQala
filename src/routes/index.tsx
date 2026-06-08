import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar, type ModuleKey } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { mapIncidentRow, type Incident } from "@/lib/incidents";
import { MapView } from "@/components/dashboard/MapView";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [active, setActive] = useState<ModuleKey>("overview");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<Incident | null>(null);
  const [language, setLanguage] = useState<"ru" | "kz">("kz");

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

  return (
    <div className="h-screen flex">
      <Sidebar
        active={active}
        onChange={setActive}
        language={language}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          totalActive={8}
          language={language}
          setLanguage={setLanguage}
        />

        <div className="flex-1 relative">
          <MapView
            incidents={incidents}
            language={language}
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
        incidents={incidents}
        selectedRisk={selectedRisk}
        language={language}
      />
    </div>
  );
}
