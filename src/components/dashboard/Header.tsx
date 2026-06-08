import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CloudRain, Search, Wifi } from "lucide-react";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-destructive"
          : "text-primary";
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-card/60 border border-border">
      <Icon className={`size-3.5 ${toneClass}`} />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-mono font-medium">{value}</span>
      </div>
    </div>
  );
}

export function Header({
  totalActive,
  language,
  setLanguage,
}: {
  totalActive: number;
  language: "ru" | "kz";
  setLanguage: (lang: "ru" | "kz") => void;
}) {
  const now = useClock();
  return (
    <header className="h-12 shrink-0 border-b border-border bg-card/60 backdrop-blur flex items-center px-3 gap-3 z-30 relative">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-success animate-pulse" />
        <h1 className="text-xs font-semibold tracking-wide whitespace-nowrap">ҚАСКЕЛЕҢ · ҚАЛАЛЫҚ БАСҚАРУ ОРТАЛЫҒЫ</h1>
      </div>

      <div className="hidden lg:flex items-center flex-1 max-w-sm mx-2 px-3 h-8 rounded-md bg-background/60 border border-border focus-within:border-primary/60 transition-colors">
        <Search className="size-4 text-muted-foreground" />
        <input
          placeholder="Санат, пайдаланушы немесе ID бойынша іздеу..."
          className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
          ⌘K
        </span>
      </div>

      <div className="ml-auto flex xl:hidden items-center gap-1">
        <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 bg-card/60">
          <button
            onClick={() => setLanguage("ru")}
            className={`text-xs font-medium ${language === "ru" ? "text-primary" : "text-muted-foreground"}`}
          >
            RU
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={() => setLanguage("kz")}
            className={`text-xs font-medium ${language === "kz" ? "text-primary" : "text-muted-foreground"}`}
          >
            KZ
          </button>
        </div>

        <Stat
          icon={Activity}
          label="Инциденты"
          value={String(totalActive)}
          tone="warning"
        />
      </div>

      <div className="ml-auto hidden xl:flex items-center gap-1.5">
        <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 bg-card/60">
          <button
            onClick={() => setLanguage("ru")}
            className={`text-xs font-medium ${language === "ru" ? "text-primary" : "text-muted-foreground"}`}
          >
            RU
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={() => setLanguage("kz")}
            className={`text-xs font-medium ${language === "kz" ? "text-primary" : "text-muted-foreground"}`}
          >
            KZ
          </button>
        </div>
        <Stat
          icon={Activity}
          label="Активные инциденты"
          value={String(totalActive)}
          tone="warning"
        />
        <Stat icon={CloudRain} label="Погода" value="4°C · Дождь" tone="default" />
        <Stat icon={AlertTriangle} label="Уровень угрозы" value="ПОВЫШЕН" tone="danger" />
        <Stat icon={Wifi} label="Телеметрия" value="НОРМА" tone="success" />
        <div className="px-2 py-1 rounded-md bg-card/60 border border-border font-mono text-[11px] tabular-nums">
          {now.toLocaleTimeString("en-GB")}
        </div>
      </div>
    </header>
  );
}
