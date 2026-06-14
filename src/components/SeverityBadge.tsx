import type { Severity } from "../types";

/** Color-coded severity pill. Now includes CRITICAL, which the original UI
 *  silently rendered as green ("safe"). */
export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`sev-badge sev-${severity}`} aria-label={`Severity: ${severity}`}>
      {severity}
    </span>
  );
}
