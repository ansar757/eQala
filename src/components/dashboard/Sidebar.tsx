import { LayoutDashboard, Droplets, Zap, MessageSquare, Settings, Shield } from "lucide-react";

export type ModuleKey = "overview" | "water" | "power" | "reports";

const items = [
  { key: "overview", ru: "Главная", kz: "Басты бет", icon: LayoutDashboard },
  { key: "water", ru: "Водоснабжение", kz: "Су жүйесі", icon: Droplets },
  { key: "power", ru: "Электросети", kz: "Электр желісі", icon: Zap },
  { key: "reports", ru: "Обращения граждан", kz: "Тұрғындар өтініштері", icon: MessageSquare },
] as const;

export function Sidebar({
  active,
  onChange,
  language,
}: {
  active: ModuleKey;
  onChange: (k: ModuleKey) => void;
  language: "ru" | "kz";
}) {

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/60 flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Shield className="size-5" />
        <div>
          <div className="font-semibold">eQaskelen</div>
          <div className="text-xs opacity-70">Guardian</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key as ModuleKey)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded ${active === item.key ? "border" : ""}`}
            >
              <Icon className="size-4" />
              <span>{language === "ru" ? item.ru : item.kz}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded">
          <Settings className="size-4" />
          {language === "ru" ? "Настройки" : "Баптаулар"}
        </button>
      </div>
    </aside>
  );
}
