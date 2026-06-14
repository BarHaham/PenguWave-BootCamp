import type { Bucket } from "../../data/analytics";

interface TimelineProps {
  buckets: Bucket[]; // chronological, label = YYYY-MM-DD
  height?: number;
}

/**
 * Compact SVG area chart of events-per-day. Hand-rolled to stay dependency-free.
 * Uses a viewBox so it scales fluidly to the container width.
 */
export default function Timeline({ buckets, height = 120 }: TimelineProps) {
  if (buckets.length === 0) {
    return <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No dated events to plot.</p>;
  }

  const W = 600;
  const H = height;
  const pad = { top: 10, right: 8, bottom: 22, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(...buckets.map((b) => b.count), 1);

  const n = buckets.length;
  const x = (i: number) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePts = buckets.map((b, i) => `${x(i)},${y(b.count)}`).join(" ");
  const areaPts = `${pad.left},${pad.top + innerH} ${linePts} ${pad.left + innerW},${pad.top + innerH}`;

  const first = buckets[0].label;
  const last = buckets[n - 1].label;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Events per day from ${first} to ${last}, peak ${max} in a day`}
    >
      <defs>
        <linearGradient id="tl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#tl-fill)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {buckets.map((b, i) => (
        <circle key={b.label} cx={x(i)} cy={y(b.count)} r={2.5} fill="var(--brand)">
          <title>{`${b.label}: ${b.count} event${b.count === 1 ? "" : "s"}`}</title>
        </circle>
      ))}
      <text x={pad.left} y={H - 6} fill="var(--text-faint)" style={{ fontSize: 10 }}>
        {first}
      </text>
      <text x={W - pad.right} y={H - 6} textAnchor="end" fill="var(--text-faint)" style={{ fontSize: 10 }}>
        {last}
      </text>
    </svg>
  );
}
