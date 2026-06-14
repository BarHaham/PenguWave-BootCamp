import type { Severity, SecurityEvent } from "../types";

export type SortKey = "timestamp" | "severity" | "title" | "assetHostname";
export type SortDir = "asc" | "desc";

export interface FilterState {
  search: string;
  severities: Severity[]; // empty = all
  tags: string[]; // empty = all; matches events having ANY selected tag
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
  sortKey: SortKey;
  sortDir: SortDir;
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  severities: [],
  tags: [],
  from: "",
  to: "",
  sortKey: "timestamp",
  sortDir: "desc",
};

// Most-urgent-first ranking, used when sorting by severity.
const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function matchesSearch(e: SecurityEvent, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    e.title.toLowerCase().includes(needle) ||
    e.description.toLowerCase().includes(needle) ||
    e.assetHostname.toLowerCase().includes(needle) ||
    e.assetIp.toLowerCase().includes(needle) ||
    e.sourceIp.toLowerCase().includes(needle) ||
    e.id.toLowerCase().includes(needle) ||
    e.tags.some((t) => t.toLowerCase().includes(needle))
  );
}

function withinDateRange(e: SecurityEvent, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!e.timestamp) return false; // undated events fall out of a date-filtered view
  const t = new Date(e.timestamp).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < new Date(from + "T00:00:00").getTime()) return false;
  if (to && t > new Date(to + "T23:59:59").getTime()) return false;
  return true;
}

/** Pure filter + sort. Memoize at the call site. */
export function filterAndSort(events: SecurityEvent[], f: FilterState): SecurityEvent[] {
  const sevSet = new Set(f.severities);
  const tagSet = new Set(f.tags);

  const filtered = events.filter((e) => {
    if (sevSet.size > 0 && !sevSet.has(e.severity)) return false;
    if (tagSet.size > 0 && !e.tags.some((t) => tagSet.has(t))) return false;
    if (!withinDateRange(e, f.from, f.to)) return false;
    if (!matchesSearch(e, f.search)) return false;
    return true;
  });

  const dir = f.sortDir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (f.sortKey) {
      case "severity":
        cmp = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "assetHostname":
        cmp = a.assetHostname.localeCompare(b.assetHostname);
        break;
      case "timestamp":
      default: {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        cmp = ta - tb;
        break;
      }
    }
    // Stable tiebreaker so equal keys keep a deterministic order.
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * dir;
  });

  return sorted;
}

export function activeFilterCount(f: FilterState): number {
  return (
    (f.search ? 1 : 0) +
    f.severities.length +
    f.tags.length +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0)
  );
}
