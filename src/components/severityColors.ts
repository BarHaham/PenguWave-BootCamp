import type { Severity } from "../types";

/** Maps a severity to its CSS custom-property color (for charts/swatches). */
export const SEVERITY_VAR: Record<Severity, string> = {
  CRITICAL: "var(--sev-critical)",
  HIGH: "var(--sev-high)",
  MEDIUM: "var(--sev-medium)",
  LOW: "var(--sev-low)",
};
