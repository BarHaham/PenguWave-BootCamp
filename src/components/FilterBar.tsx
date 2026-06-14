import { useEffect, useState } from "react";
import { SEVERITIES, type Severity } from "../types";
import type { FilterState } from "../data/filter";
import { useDebounced } from "../hooks/useDebounced";

interface Props {
  filters: FilterState;
  patch: (partial: Partial<FilterState>) => void;
  /** All tags present in the dataset, for the tag filter. */
  allTags: string[];
}

/** Search + multi-select severity + tag + date-range controls. */
export default function FilterBar({ filters, patch, allTags }: Props) {
  // Local search text is debounced before it hits the (memoized) filter pass.
  const [searchText, setSearchText] = useState(filters.search);
  const debounced = useDebounced(searchText, 200);

  useEffect(() => {
    if (debounced !== filters.search) patch({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Keep local input in sync if filters are reset/changed externally (e.g. URL).
  useEffect(() => {
    setSearchText(filters.search);
  }, [filters.search]);

  const toggleSeverity = (s: Severity) => {
    const set = new Set(filters.severities);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    patch({ severities: [...set] });
  };

  const toggleTag = (t: string) => {
    const set = new Set(filters.tags);
    if (set.has(t)) set.delete(t);
    else set.add(t);
    patch({ tags: [...set] });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden>
            🔎
          </span>
          <input
            type="search"
            placeholder="Search title, description, host, IP, tag…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Search events"
          />
        </div>

        <div className="sev-filter" role="group" aria-label="Filter by severity">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              className={`sev-pill sev-pill-${s}`}
              aria-pressed={filters.severities.includes(s)}
              onClick={() => toggleSeverity(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span>From</span>
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => patch({ from: e.target.value })}
            style={{ width: "auto" }}
            aria-label="From date"
          />
        </label>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span>To</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => patch({ to: e.target.value })}
            style={{ width: "auto" }}
            aria-label="To date"
          />
        </label>
      </div>

      {allTags.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: 13 }}>
            Filter by tag {filters.tags.length > 0 ? `(${filters.tags.length} selected)` : ""}
          </summary>
          <div style={{ marginTop: 8 }} role="group" aria-label="Filter by tag">
            {allTags.map((t) => (
              <span
                key={t}
                className="tag-chip"
                role="button"
                tabIndex={0}
                aria-pressed={filters.tags.includes(t)}
                onClick={() => toggleTag(t)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggleTag(t))}
              >
                {t}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
