import { SEVERITIES, type Severity, type SecurityEvent } from "../types";

/**
 * Defensive normalization for security events.
 *
 * The backend (and real-world telemetry) cannot be trusted to send clean data:
 * the mock set alone contains events with missing `sourceIp`/`userId`, a missing
 * `description`, and a `CRITICAL` severity the original UI didn't understand.
 * Rather than scatter `?.` and `|| ""` across every component, we normalize once
 * at the boundary so the rest of the app can rely on a fully-populated
 * `SecurityEvent`.
 */

const PLACEHOLDER = "—";

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function normalizeSeverity(value: unknown): Severity {
  const upper = asString(value).toUpperCase();
  return (SEVERITIES as readonly string[]).includes(upper) ? (upper as Severity) : "LOW";
}

/** Returns a valid ISO timestamp, or "" if the input can't be parsed. */
function normalizeTimestamp(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : raw;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => asString(t)).filter(Boolean);
  }
  // Tolerate a comma-separated string, which some sources emit.
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Coerce one raw record into a safe `SecurityEvent`. Returns `null` only when the
 * record is too broken to be useful (not an object, or no id) — callers can
 * filter those out and surface a count of dropped records.
 */
export function normalizeEvent(raw: unknown, index: number): SecurityEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id = asString(r.id) || (r.id == null ? "" : String(r.id));
  if (!id) return null;

  return {
    id,
    timestamp: normalizeTimestamp(r.timestamp),
    severity: normalizeSeverity(r.severity),
    title: asString(r.title) || "(untitled event)",
    description: asString(r.description) || "No description provided for this event.",
    assetHostname: asString(r.assetHostname) || PLACEHOLDER,
    assetIp: asString(r.assetIp) || PLACEHOLDER,
    sourceIp: asString(r.sourceIp) || PLACEHOLDER,
    tags: normalizeTags(r.tags),
    userId: asString(r.userId) || `unknown-${index}`,
  };
}

export interface NormalizeResult {
  events: SecurityEvent[];
  dropped: number;
}

/** Normalize a raw list, reporting how many records were unusable. */
export function normalizeEvents(rawList: unknown): NormalizeResult {
  if (!Array.isArray(rawList)) return { events: [], dropped: 0 };
  const events: SecurityEvent[] = [];
  let dropped = 0;
  rawList.forEach((raw, i) => {
    const ev = normalizeEvent(raw, i);
    if (ev) events.push(ev);
    else dropped += 1;
  });
  return { events, dropped };
}
