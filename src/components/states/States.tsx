import type { ReactNode } from "react";

/** Shimmering placeholder rows for a loading table. */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading events">
      <table>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div
                    className="skeleton"
                    style={{ height: 14, width: c === 1 ? "85%" : "55%" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ height = 180 }: { height?: number }) {
  return <div className="skeleton" style={{ height, borderRadius: "var(--radius)" }} />;
}

interface StateBlockProps {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "🔍", title, message, action }: StateBlockProps) {
  return (
    <div className="state-block">
      <div className="state-icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block" role="alert">
      <div className="state-icon" aria-hidden>
        ⚠️
      </div>
      <h3>Couldn’t load events</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
