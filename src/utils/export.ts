import type { SecurityEvent } from "../types";

/**
 * Escape a single CSV cell.
 *
 * Two distinct concerns are handled here:
 *  1. RFC-4180 escaping — wrap in quotes and double internal quotes when the
 *     value contains a comma, quote, or newline (most descriptions do).
 *  2. CSV/Formula injection — a cell beginning with = + - @ (or tab/CR) is
 *     interpreted as a formula by Excel/Sheets and can execute on open. We
 *     prefix such values with a single quote to neutralize them. The original
 *     `toCsv` did neither, so any comma in a description corrupted the file.
 */
function escapeCsvCell(value: unknown): string {
  let str = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const CSV_COLUMNS: { key: keyof SecurityEvent; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "timestamp", label: "Timestamp" },
  { key: "severity", label: "Severity" },
  { key: "title", label: "Title" },
  { key: "assetHostname", label: "Asset Hostname" },
  { key: "assetIp", label: "Asset IP" },
  { key: "sourceIp", label: "Source IP" },
  { key: "tags", label: "Tags" },
  { key: "description", label: "Description" },
];

export function eventsToCsv(events: SecurityEvent[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCsvCell(c.label)).join(",");
  const rows = events.map((e) =>
    CSV_COLUMNS.map((c) => {
      const v = e[c.key];
      return escapeCsvCell(Array.isArray(v) ? v.join("; ") : v);
    }).join(",")
  );
  return [header, ...rows].join("\r\n");
}

export function eventsToJson(events: SecurityEvent[]): string {
  return JSON.stringify(events, null, 2);
}

/** Trigger a client-side file download for the given text content. */
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** A filesystem-safe timestamp suffix for export filenames, e.g. 2026-06-14_1530. */
export function exportStamp(now: Date = new Date()): string {
  // 2026-06-14T15:30:00.000Z -> 2026-06-14_1530
  const [date, time] = now.toISOString().split("T");
  return `${date}_${time.slice(0, 5).replace(":", "")}`;
}
