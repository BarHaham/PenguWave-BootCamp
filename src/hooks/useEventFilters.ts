import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_FILTERS, type FilterState, type SortDir, type SortKey } from "../data/filter";
import { SEVERITIES, type Severity } from "../types";

const SORT_KEYS: readonly SortKey[] = ["timestamp", "severity", "title", "assetHostname"];
const SORT_DIRS: readonly SortDir[] = ["asc", "desc"];

const validSortKey = (v: unknown): SortKey =>
  (SORT_KEYS as readonly string[]).includes(v as string) ? (v as SortKey) : DEFAULT_FILTERS.sortKey;
const validSortDir = (v: unknown): SortDir =>
  (SORT_DIRS as readonly string[]).includes(v as string) ? (v as SortDir) : DEFAULT_FILTERS.sortDir;

function parseFromParams(params: URLSearchParams): FilterState | null {
  if ([...params.keys()].length === 0) return null;
  const sevs = (params.get("sev") ?? "")
    .split(",")
    .filter((s): s is Severity => (SEVERITIES as readonly string[]).includes(s));
  const tags = (params.get("tags") ?? "").split(",").map(decodeURIComponent).filter(Boolean);
  return {
    search: params.get("q") ?? "",
    severities: sevs,
    tags,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    sortKey: validSortKey(params.get("sort")),
    sortDir: validSortDir(params.get("dir")),
  };
}

function toParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set("q", f.search);
  if (f.severities.length) p.set("sev", f.severities.join(","));
  if (f.tags.length) p.set("tags", f.tags.map(encodeURIComponent).join(","));
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.sortKey !== DEFAULT_FILTERS.sortKey) p.set("sort", f.sortKey);
  if (f.sortDir !== DEFAULT_FILTERS.sortDir) p.set("dir", f.sortDir);
  return p;
}

/**
 * Filter state lives entirely in the URL query params — the single source of
 * truth. This makes any filtered view shareable / bookmarkable / back-able, and,
 * importantly, makes an empty URL mean "no filters" unconditionally:
 *  - Arriving at `/events?sev=CRITICAL` (e.g. an Overview severity badge) applies
 *    that filter.
 *  - Arriving at a bare `/events` (the main nav link) shows all events — a clean
 *    slate. There is no localStorage restore that could resurrect a stale filter.
 */
export function useEventFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<FilterState>(() => {
    return parseFromParams(searchParams) ?? DEFAULT_FILTERS;
    // Re-derive whenever the URL changes.
  }, [searchParams]);

  const setFilters = useCallback(
    (next: FilterState) => {
      const params = toParams(next);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const patch = useCallback(
    (partial: Partial<FilterState>) => setFilters({ ...filters, ...partial }),
    [filters, setFilters]
  );

  const reset = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  return { filters, setFilters, patch, reset };
}
