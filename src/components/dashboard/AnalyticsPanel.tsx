import { useMemo } from "react";
import { Droplets, Zap, Waves, MessageSquare, Clock, Users, Construction } from "lucide-react";
import { INCIDENT_META, type Incident } from "@/lib/incidents";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-2 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="size-3.5" style={{ color }} />
      </div>
      <div className="flex items-end justify-between mt-1.5">
        <div className="text-xl font-mono font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export function AnalyticsPanel({
  incidents,
  selectedRisk,
  language,
  onResolveIncident,
}: {
  incidents: Incident[];
  selectedRisk: Incident | null;
  language: "ru" | "kz";
  onResolveIncident: (id: string) => void;
}) {
  const stats = useMemo(() => {
    const total = incidents.length;
    const water = incidents.filter((i) => i.type === "water").length;
    const power = incidents.filter((i) => i.type === "power").length;
    const uniqueUsers = new Set(incidents.map((i) => i.userId).filter((userId) => userId != null))
      .size;
    const latestCreatedAt = incidents
      .map((i) => i.createdAt)
      .sort((a, b) => +new Date(b) - +new Date(a))[0];

    return { total, water, power, uniqueUsers, latestCreatedAt };
  }, [incidents]);

  const recent = [...incidents]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 8);

  const riskScore = Number((selectedRisk as any)?.riskScore ?? 0);
  const reportCount = Number((selectedRisk as any)?.reportCount ?? 0);

  const riskLevel =
    riskScore >= 80
      ? "CRITICAL"
      : riskScore >= 60
        ? "HIGH"
        : riskScore >= 40
          ? "MEDIUM"
          : "LOW";

  const t = language === "ru"
    ? {
        totalReports: "Всего обращений",
        water: "Водоснабжение",
        power: "Электросети",
        users: "Пользователи",
        aiMonitoring: "AI Мониторинг",
        liveFeed: "Лента инцидентов",
        latestReport: "Последний отчёт",
        aiThreatAnalysis: "AI Анализ угроз",
        riskZone: "Зона риска электросетей",
        riskScore: "Оценка риска",
        severity: "Критичность",
        category: "Категория",
        reports: "Обращения",
        recommendation: "Рекомендация",
        selectRiskZone: "Выберите HIGH RISK ZONE на карте для просмотра AI анализа.",
        multipleReports: "Обнаружено несколько независимых сообщений об отключении электроэнергии в одной зоне.",
        dispatchTeam: "Направить выездную инспекционную группу.",
        unknown: "Неизвестно",
        resolved: "Решено",
        newStatus: "Новый",
        resolveButton: "✔ Завершить",
      }
    : {
        totalReports: "Барлық өтініштер",
        water: "Су жүйесі",
        power: "Электр желісі",
        users: "Пайдаланушылар",
        aiMonitoring: "AI Мониторинг",
        liveFeed: "Оқиғалар лентасы",
        latestReport: "Соңғы есеп",
        aiThreatAnalysis: "AI Қауіп талдауы",
        riskZone: "Электр желісі тәуекел аймағы",
        riskScore: "Тәуекел көрсеткіші",
        severity: "Қауіп деңгейі",
        category: "Санат",
        reports: "Өтініштер",
        recommendation: "Ұсыныс",
        selectRiskZone: "AI талдауын көру үшін картадағы HIGH RISK ZONE аймағын таңдаңыз.",
        multipleReports: "Бір аймақта электр қуатының өшуі туралы бірнеше тәуелсіз хабарлама анықталды.",
        dispatchTeam: "Тексеру тобын жіберу ұсынылады.",
        unknown: "Белгісіз",
        resolved: "Шешілді",
        newStatus: "Жаңа",
        resolveButton: "✔ Шешілді деп белгілеу",
      };

  const riskLevelLabel =
    language === "ru"
      ? {
          CRITICAL: "Критическая",
          HIGH: "Высокая",
          MEDIUM: "Средняя",
          LOW: "Низкая",
        }[riskLevel]
      : {
          CRITICAL: "Критикалық",
          HIGH: "Жоғары",
          MEDIUM: "Орташа",
          LOW: "Төмен",
        }[riskLevel];

  const getCategoryLabel = (type: string) => {
    if (type === "power") {
      return language === "ru" ? "Электросети" : "Электр желісі";
    }

    if (type === "water") {
      return language === "ru" ? "Водоснабжение" : "Су жүйесі";
    }

    return type;
  };

  return (
    <aside className="w-[300px] shrink-0 border-l border-border bg-card/60 backdrop-blur flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex justify-end">
        <span className="text-[10px] font-mono text-success">● LIVE</span>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            icon={MessageSquare}
            label={t.totalReports}
            value={stats.total}
            color="oklch(0.72 0.18 200)"
          />
          <MetricCard
            icon={Droplets}
            label={t.water}
            value={stats.water}
            color={INCIDENT_META.water.color}
          />
          <MetricCard
            icon={Zap}
            label={t.power}
            value={stats.power}
            color={INCIDENT_META.power.color}
          />
          <MetricCard
            icon={Users}
            label={t.users}
            value={stats.uniqueUsers}
            color="oklch(0.72 0.18 150)"
          />
        </div>

        {selectedRisk ? (
          <div className="rounded-md border border-destructive/40 bg-card/60 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-destructive">
              {t.aiThreatAnalysis}
            </div>

            <div className="mt-2 text-lg font-semibold">
              {t.riskZone}
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div><strong>{t.riskScore}:</strong> {riskScore}</div>
              <div><strong>{t.severity}:</strong> {riskLevelLabel}</div>
              <div><strong>{t.category}:</strong> {getCategoryLabel(selectedRisk.type)}</div>
              <div><strong>{t.reports}:</strong> {reportCount}</div>
              <div><strong>{t.users}:</strong> {reportCount}</div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              {t.multipleReports}
            </div>

            <div className="mt-3 text-xs text-destructive font-semibold">
              {t.recommendation}: {riskScore >= 80
                ? t.dispatchTeam
                : language === "ru"
                  ? "Продолжить мониторинг ситуации."
                  : "Жағдайды бақылауды жалғастыру."}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card/60 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.aiMonitoring}
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              {t.selectRiskZone}
            </div>
          </div>
        )}

        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.latestReport}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-semibold">
              {stats.latestCreatedAt ? timeAgo(stats.latestCreatedAt) : language === "ru" ? "Нет обращений" : "Өтініш жоқ"}
            </div>
            <div className="font-mono text-sm text-primary">
              {stats.total} {language === "ru" ? "всего" : "барлығы"}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {t.liveFeed}
          </div>
          <div className="space-y-1.5">
            {recent.map((i) => {
              const meta = INCIDENT_META[i.type];
              return (
                <div
                  key={i.id}
                  className="flex items-start gap-2.5 p-2 rounded border border-border/60 bg-background/30 hover:border-primary/40 transition-colors"
                >
                  <span
                    className="mt-1 size-2 rounded-full shrink-0"
                    style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">{getCategoryLabel(i.type)}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {timeAgo(i.createdAt)}
                      </span>
                    </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        User {i.userId ?? t.unknown} · {i.status === "resolved" ? t.resolved : t.newStatus}
                      </div>
                    {i.description && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                        {i.description}
                      </div>
                    )}
                    {i.status !== "resolved" && (
                      <button
                        onClick={() => onResolveIncident(i.id)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20"
                      >
                        {t.resolveButton}
                      </button>
                    )}
                    {i.status === "resolved" && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                        ✅ {t.resolved}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
