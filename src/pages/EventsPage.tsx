import { useMemo, useState } from "react";
import { useEvents } from "../hooks/useEvents";
import { useEventFilters } from "../hooks/useEventFilters";
import { activeFilterCount, filterAndSort, type SortKey } from "../data/filter";
import type { SecurityEvent } from "../types";
import SeverityBadge from "../components/SeverityBadge";
import FilterBar from "../components/FilterBar";
import ExportMenu from "../components/ExportMenu";
import EventDetailPanel from "../components/EventDetailPanel";
import { TableSkeleton, EmptyState, ErrorState } from "../components/states/States";
import { formatAbsolute, formatRelative } from "../utils/format";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "severity", label: "Severity" },
  { key: "title", label: "Title" },
  { key: "assetHostname", label: "Asset" },
  { key: "timestamp", label: "Time" },
];

export default function EventsPage() {
  const { status, events, dropped, error, reload } = useEvents();
  const { filters, patch, reset } = useEventFilters();
  const [selected, setSelected] = useState<SecurityEvent | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [events]);

  const visible = useMemo(() => filterAndSort(events, filters), [events, filters]);

  // "Related events": same asset or a shared tag, excluding the event itself.
  const related = useMemo(() => {
    if (!selected) return [];
    return events
      .filter(
        (e) =>
          e.id !== selected.id &&
          (e.assetHostname === selected.assetHostname ||
            e.tags.some((t) => selected.tags.includes(t)))
      )
      .slice(0, 6);
  }, [selected, events]);

  const toggleSort = (key: SortKey) => {
    if (filters.sortKey === key) {
      patch({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" });
    } else {
      patch({ sortKey: key, sortDir: key === "title" || key === "assetHostname" ? "asc" : "desc" });
    }
  };

  const activeCount = activeFilterCount(filters);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Security Events</h1>
          <p className="page-subtitle">Investigate, filter, and export security telemetry.</p>
        </div>
        <ExportMenu events={visible} />
      </div>

      {dropped > 0 && (
        <div className="banner" role="status">
          ⚠️ {dropped} malformed record{dropped === 1 ? "" : "s"} could not be parsed and were
          skipped.
        </div>
      )}

      <FilterBar filters={filters} patch={patch} allTags={allTags} />

      {status === "loading" && <TableSkeleton />}

      {status === "error" && <ErrorState message={error ?? "Unknown error"} onRetry={reload} />}

      {status === "success" && (
        <>
          <div className="results-meta">
            <span>
              Showing <strong>{visible.length}</strong> of {events.length} events
            </span>
            {activeCount > 0 && (
              <button className="btn-ghost" onClick={reset}>
                Clear {activeCount} filter{activeCount === 1 ? "" : "s"} ✕
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            events.length === 0 ? (
              <EmptyState
                icon="🐧"
                title="No events yet"
                message="There are no security events to display."
              />
            ) : (
              <EmptyState
                title="No events match your filters"
                message="Try broadening your search or clearing some filters."
                action={
                  <button className="btn-primary" onClick={reset}>
                    Clear all filters
                  </button>
                }
              />
            )
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {COLUMNS.map((c) => {
                      const active = filters.sortKey === c.key;
                      return (
                        <th
                          key={c.key}
                          className="sortable"
                          onClick={() => toggleSort(c.key)}
                          aria-sort={
                            active ? (filters.sortDir === "asc" ? "ascending" : "descending") : "none"
                          }
                        >
                          {c.label}
                          {active && (
                            <span className="sort-arrow" aria-hidden>
                              {filters.sortDir === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr
                      key={e.id}
                      className={`row-clickable ${selected?.id === e.id ? "row-selected" : ""}`}
                      onClick={() => setSelected(e)}
                      tabIndex={0}
                      onKeyDown={(ev) =>
                        (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setSelected(e))
                      }
                      aria-label={`${e.severity} — ${e.title}`}
                    >
                      <td>
                        <SeverityBadge severity={e.severity} />
                      </td>
                      <td className="cell-title">{e.title}</td>
                      <td className="mono">{e.assetHostname}</td>
                      <td className="cell-time" title={formatAbsolute(e.timestamp)}>
                        {formatRelative(e.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <EventDetailPanel
          event={selected}
          related={related}
          onClose={() => setSelected(null)}
          onSelectRelated={(e) => setSelected(e)}
        />
      )}
    </div>
  );
}
