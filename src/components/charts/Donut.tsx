interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

/**
 * Dependency-free SVG donut chart.
 *
 * Built by hand rather than pulling in Recharts/Chart.js: it's ~40 lines, has
 * no React-19 peer-dependency risk, renders crisp at any size, and is fully
 * understood/ownable for the presentation. Accessible via role="img" + label.
 */
export default function Donut({
  segments,
  size = 160,
  thickness = 22,
  centerLabel,
  centerSub,
}: DonutProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const summary = segments.map((s) => `${s.label}: ${s.value}`).join(", ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Distribution — ${summary || "no data"}`}
    >
      {/* track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--bg-elev-2)"
        strokeWidth={thickness}
      />
      {total > 0 &&
        segments.map((seg) => {
          if (seg.value === 0) return null;
          const frac = seg.value / total;
          const dash = frac * circumference;
          const circle = (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return circle;
        })}
      {centerLabel != null && (
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text)"
          style={{ fontSize: 26, fontWeight: 800 }}
        >
          {centerLabel}
        </text>
      )}
      {centerSub != null && (
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-dim)"
          style={{ fontSize: 11, letterSpacing: "0.05em" }}
        >
          {centerSub}
        </text>
      )}
    </svg>
  );
}
