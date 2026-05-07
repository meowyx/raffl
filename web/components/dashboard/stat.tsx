import type { ReactNode } from "react";

type SparklineProps = {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
};

export function Sparkline({ data, color = "var(--ink-3)", height = 40, width = 96 }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="stat-spark" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StatProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  sparkColor?: string;
};

export function Stat({ label, value, sub, delta, deltaDir, spark, sparkColor }: StatProps) {
  return (
    <div className="stat">
      <div className="lbl">{label}</div>
      <div className="num">{value}</div>
      <div className="sub">
        {delta && (
          <span className={`delta ${deltaDir ?? "up"}`}>
            {deltaDir === "down" ? "↓" : "↑"} {delta}
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
      {spark && <Sparkline data={spark} color={sparkColor} />}
    </div>
  );
}
