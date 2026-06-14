import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_FILTERS, type FilterState, type SortDir, type SortKey } from "../data/filter";
import { SEVERITIES, type Severity } from "../types";

const LS_KEY = "pw_event_filters";

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
    sortKey: (params.get("sort") as SortKey) || DEFAULT_FILTERS.sortKey,
    sortDir: (params.get("dir") as SortDir) || DEFAULT_FILTERS.sortDir,
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

function loadFromStorage(): FilterState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<FilterState>) } : null;
  } catch {
    return null;
  }
}

/**
 * Filter state with two-way persistence:
 *  - URL query params make any filtered view shareable / bookmarkable / back-able.
 *  - localStorage restores the analyst's last view on a fresh visit (no params).
 * URL wins over storage when present.
 */
export function useEventFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<FilterState>(() => {
    return parseFromParams(searchParams) ?? loadFromStorage() ?? DEFAULT_FILTERS;
    // Re-derive whenever the URL changes.
  }, [searchParams]);

  // Mirror current filters into localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(filters));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, [filters]);

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
