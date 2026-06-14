// Display formatting helpers.

/**
 * Absolute timestamp in a fixed, unambiguous format for security ops —
 * "Feb 18, 2025, 04:32 PM". en-US locale + hour12 keep it consistent across
 * machines (analysts comparing notes shouldn't see different formats).
 */
export function formatAbsolute(iso: string): string {
  if (!iso) return "Unknown time";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Relative timestamp ("3h ago", "in 2d"). `now` is injectable so this stays
 * pure and testable. Falls back gracefully on bad input.
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";

  const diffMs = d.getTime() - now;
  const abs = Math.abs(diffMs);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "just now";
}

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Time display tuned for incident investigation:
 *  - Events within the last 7 days show relative time ("2 hours ago") with the
 *    exact timestamp in `title` (hover) so the precise time is one hover away.
 *  - Older events show the full absolute timestamp directly — relative ages like
 *    "last year" are useless for forensics.
 * Future-dated and unparseable timestamps fall back to the absolute form.
 */
export function formatEventTime(
  iso: string,
  now: number = Date.now()
): { display: string; title: string } {
  const absolute = formatAbsolute(iso);
  if (!iso) return { display: absolute, title: absolute };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { display: absolute, title: absolute };

  const age = now - d.getTime();
  if (age >= 0 && age < SEVEN_DAYS_MS) {
    return { display: formatRelative(iso, now), title: absolute };
  }
  return { display: absolute, title: absolute };
}
