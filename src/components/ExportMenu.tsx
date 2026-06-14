import { useEffect, useRef, useState } from "react";
import type { SecurityEvent } from "../types";
import { downloadFile, eventsToCsv, eventsToJson, exportStamp } from "../utils/export";

/**
 * Exports the events currently in view (i.e. after filters/search/sort), so the
 * analyst always exports exactly what they're looking at. CSV is hardened
 * against formula injection (see utils/export.ts).
 */
export default function ExportMenu({ events }: { events: SecurityEvent[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const disabled = events.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const doExport = (kind: "csv" | "json") => {
    const stamp = exportStamp();
    if (kind === "csv") {
      downloadFile(eventsToCsv(events), `penguwave_events_${stamp}.csv`, "text/csv;charset=utf-8");
    } else {
      downloadFile(eventsToJson(events), `penguwave_events_${stamp}.json`, "application/json");
    }
    setOpen(false);
  };

  return (
    <div className="export-menu" ref={ref}>
      <button
        className="btn"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title={disabled ? "Nothing to export" : "Export current view"}
      >
        ⬇ Export
      </button>
      {open && (
        <div className="export-dropdown" role="menu">
          <div className="menu-hint">Exports the {events.length} event{events.length === 1 ? "" : "s"} in view</div>
          <button role="menuitem" onClick={() => doExport("csv")}>
            Export as CSV
          </button>
          <button role="menuitem" onClick={() => doExport("json")}>
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
}
