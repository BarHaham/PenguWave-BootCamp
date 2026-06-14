// Canonical severities. NOTE: the original starter omitted CRITICAL even though
// the mock data contains CRITICAL events — that bug made critical alerts render
// as "safe" (green). The union below is the single source of truth.
export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * A security event as consumed by the UI. Every field is guaranteed present and
 * well-typed here — raw/messy records from the API are run through
 * `normalizeEvent` (see data/normalize.ts) before they ever reach a component.
 */
export interface SecurityEvent {
  id: string;
  timestamp: string; // ISO-8601, validated
  severity: Severity;
  title: string;
  description: string;
  assetHostname: string;
  assetIp: string;
  sourceIp: string;
  tags: string[];
  userId: string;
}

/**
 * User as returned by the backend. Passwords are intentionally NOT modeled here:
 * the original code stored and rendered plaintext passwords, which the API
 * contract forbids ("Passwords must never be included in the response").
 */
export interface User {
  id: string;
  email: string;
  role: "admin" | "analyst" | "viewer" | string;
  status: "active" | "disabled" | string;
}
