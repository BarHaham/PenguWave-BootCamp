import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { computeStats, SEVERITY_ORDER } from "../data/analytics";
import { SEVERITY_VAR } from "../components/severityColors";
import Donut from "../components/charts/Donut";
import BarList from "../components/charts/BarList";
import Timeline from "../components/charts/Timeline";
import SeverityBadge from "../components/SeverityBadge";
import { CardSkeleton, ErrorState, EmptyState } from "../components/states/States";
import { formatRelative } from "../utils/format";
import type { Severity } from "../types";

export default function DashboardPage() {
  const { status, events, error, reload } = useEvents();
  const stats = useMemo(() => computeStats(events), [events]);
  const navigate = useNavigate();

  const goToEvents = (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    navigate(`/events${qs}`);
  };

  if (status === "loading") {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Overview</h1>
        </div>
        <div className="stat-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} height={92} />
          ))}
        </div>
        <div className="dash-grid">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Overview</h1>
        </div>
        <ErrorState message={error ?? "Unknown error"} onRetry={reload} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Overview</h1>
        </div>
        <EmptyState icon="🐧" title="No events to summarize" message="Once events arrive, you’ll see stats here." />
      </div>
    );
  }

  const donutSegments = SEVERITY_ORDER.map((s) => ({
    label: s,
    value: stats.bySeverity[s],
    color: SEVERITY_VAR[s],
  }));

  const criticalAndHigh = stats.bySeverity.CRITICAL + stats.bySeverity.HIGH;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p className="page-subtitle">
            {stats.total} events
            {stats.latest && <> · latest {formatRelative(stats.latest.timestamp)}</>}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard label="Total events" value={stats.total} onClick={() => goToEvents()} />
        {SEVERITY_ORDER.map((s) => (
          <StatCard
            key={s}
            label={s}
            value={stats.bySeverity[s]}
            accent={SEVERITY_VAR[s]}
            onClick={() => goToEvents({ sev: s })}
          />
        ))}
      </div>

      {/* Recent-activity windows */}
      <div className="stat-grid">
        <StatCard label="Last 24 hours" value={stats.last24h} />
        <StatCard label="Last 7 days" value={stats.last7d} />
        <StatCard label="Last 30 days" value={stats.last30d} />
        <StatCard
          label="Critical + High"
          value={criticalAndHigh}
          accent={SEVERITY_VAR.CRITICAL}
          onClick={() => goToEvents({ sev: "CRITICAL,HIGH" })}
        />
      </div>

      {/* Severity distribution + timeline */}
      <div className="dash-grid">
        <div className="card">
          <div className="card-title">Severity distribution</div>
          <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
            <Donut segments={donutSegments} centerLabel={String(stats.total)} centerSub="EVENTS" />
            <div className="donut-legend" style={{ flex: 1, minWidth: 160 }}>
              {SEVERITY_ORDER.map((s) => (
                <button
                  key={s}
                  className="btn-ghost donut-legend-row"
                  style={{ width: "100%" }}
                  onClick={() => goToEvents({ sev: s })}
                  title={`View ${s} events`}
                >
                  <span className="swatch" style={{ background: SEVERITY_VAR[s] }} />
                  <span>{s}</span>
                  <span className="legend-count">{stats.bySeverity[s]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Activity over time</div>
          <Timeline buckets={stats.timeline} />
        </div>
      </div>

      {/* Insights */}
      <div className="dash-grid-3">
        <div className="card">
          <div className="card-title">Top affected hosts</div>
          <BarList items={stats.topHosts} onSelect={(label) => goToEvents({ q: label })} />
        </div>

        <div className="card">
          <div className="card-title">Most common tags</div>
          <div>
            {stats.topTags.map((t) => (
              <span
                key={t.label}
                className="tag-chip"
                role="button"
                tabIndex={0}
                onClick={() => goToEvents({ tags: t.label })}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToEvents({ tags: t.label })}
                title={`View "${t.label}" events`}
              >
                {t.label} · {t.count}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Needs attention</div>
          <PriorityList
            severities={["CRITICAL", "HIGH"]}
            events={events}
            onSelect={(id) => goToEvents({ q: id })}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  accent?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className="stat-card"
      onClick={onClick}
      style={onClick ? { cursor: "pointer", textAlign: "left", width: "100%" } : undefined}
    >
      {accent && <span className="stat-accent" style={{ background: accent }} />}
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </Tag>
  );
}

/** Highest-urgency, most-recent events that warrant a look. */
function PriorityList({
  severities,
  events,
  onSelect,
}: {
  severities: Severity[];
  events: ReturnType<typeof useEvents>["events"];
  onSelect: (id: string) => void;
}) {
  const items = events
    .filter((e) => severities.includes(e.severity))
    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
    .slice(0, 5);

  if (items.length === 0) {
    return <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nothing urgent right now. 🎉</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((e) => (
        <button
          key={e.id}
          className="btn-ghost"
          style={{ textAlign: "left", width: "100%", padding: "6px 8px" }}
          onClick={() => onSelect(e.id)}
        >
          <div className="row-gap">
            <SeverityBadge severity={e.severity} />
            <span style={{ fontSize: 12.5, color: "var(--text-faint)", marginLeft: "auto" }}>
              {formatRelative(e.timestamp)}
            </span>
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: "var(--text)" }}>{e.title}</div>
        </button>
      ))}
    </div>
  );
}
