import { SEVERITIES, type Severity, type SecurityEvent } from "../types";

export type SeverityCounts = Record<Severity, number>;

export interface Bucket {
  label: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  bySeverity: SeverityCounts;
  last24h: number;
  last7d: number;
  last30d: number;
  topHosts: Bucket[];
  topTags: Bucket[];
  timeline: Bucket[]; // events per day, oldest -> newest
  latest: SecurityEvent | null;
}

function emptySeverityCounts(): SeverityCounts {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
}

function topN(counts: Map<string, number>, n: number): Bucket[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, n);
}

/**
 * Single pass over the events to derive every figure the dashboard shows.
 * `now` is injected (not read from Date.now() internally) so the result is
 * deterministic and the relative-time windows are testable.
 */
export function computeStats(events: SecurityEvent[], now: number = Date.now()): DashboardStats {
  const bySeverity = emptySeverityCounts();
  const hostCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  let last24h = 0;
  let last7d = 0;
  let last30d = 0;
  let latest: SecurityEvent | null = null;
  let latestTs = -Infinity;

  const DAY = 1000 * 60 * 60 * 24;

  for (const e of events) {
    bySeverity[e.severity] += 1;

    if (e.assetHostname && e.assetHostname !== "—") {
      hostCounts.set(e.assetHostname, (hostCounts.get(e.assetHostname) ?? 0) + 1);
    }
    for (const tag of e.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    const t = e.timestamp ? new Date(e.timestamp).getTime() : NaN;
    if (!Number.isNaN(t)) {
      const age = now - t;
      if (age >= 0) {
        if (age <= DAY) last24h += 1;
        if (age <= 7 * DAY) last7d += 1;
        if (age <= 30 * DAY) last30d += 1;
      }
      const dayKey = new Date(e.timestamp).toISOString().slice(0, 10);
      dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
      if (t > latestTs) {
        latestTs = t;
        latest = e;
      }
    }
  }

  const timeline = [...dayCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    total: events.length,
    bySeverity,
    last24h,
    last7d,
    last30d,
    topHosts: topN(hostCounts, 5),
    topTags: topN(tagCounts, 12),
    timeline,
    latest,
  };
}

/** Severities most-to-least urgent — handy for stable ordering in the UI. */
export const SEVERITY_ORDER: Severity[] = [...SEVERITIES];
