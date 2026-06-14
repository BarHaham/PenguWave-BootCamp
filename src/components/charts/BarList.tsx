import type { Bucket } from "../../data/analytics";

interface BarListProps {
  items: Bucket[];
  emptyText?: string;
  /** Optional click handler, e.g. to drill into the table filtered by this value. */
  onSelect?: (label: string) => void;
}

/** Horizontal bar list for "top hosts / top tags" style breakdowns. */
export default function BarList({ items, emptyText = "No data", onSelect }: BarListProps) {
  if (items.length === 0) {
    return <p style={{ color: "var(--text-faint)", fontSize: 13 }}>{emptyText}</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div>
      {items.map((item) => {
        const pct = Math.round((item.count / max) * 100);
        const content = (
          <>
            <div className="bar-row">
              <span className="bar-label" title={item.label}>
                {item.label}
              </span>
              <span className="bar-count">{item.count}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </>
        );
        return onSelect ? (
          <button
            key={item.label}
            onClick={() => onSelect(item.label)}
            className="btn-ghost"
            style={{ width: "100%", padding: "2px 0", display: "block" }}
            title={`Filter by ${item.label}`}
          >
            {content}
          </button>
        ) : (
          <div key={item.label}>{content}</div>
        );
      })}
    </div>
  );
}
