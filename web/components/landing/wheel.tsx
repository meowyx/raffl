type WheelProps = {
  size?: number;
  segments?: number;
  winnerIndex?: number;
  pointer?: boolean;
};

export function Wheel({
  size = 32,
  segments = 8,
  winnerIndex = 1,
  pointer = true,
}: WheelProps) {
  const r = 92;
  const segs = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;
    const x0 = Math.cos(a0) * r;
    const y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const y1 = Math.sin(a1) * r;
    const isWinner = i === winnerIndex;
    segs.push(
      <path
        key={i}
        d={`M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
        fill={isWinner ? "var(--accent)" : "var(--ink)"}
        opacity={isWinner ? 1 : i % 2 === 0 ? 0.92 : 0.55}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <g transform="translate(128 128)">
        <g>
          {segs}
          <circle r="18" fill="var(--paper)" />
          <circle r="5" fill="var(--ink)" />
        </g>
        {pointer && <path d="M0 -110 L-13 -88 L13 -88 Z" fill="var(--ink)" />}
      </g>
    </svg>
  );
}

export function BigWheel({
  segments = 12,
  winnerIndex = 2,
}: {
  segments?: number;
  winnerIndex?: number;
}) {
  const r = 110;
  const segs = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;
    const x0 = Math.cos(a0) * r;
    const y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const y1 = Math.sin(a1) * r;
    const isWinner = i === winnerIndex;
    let fill: string;
    let opacity: number;
    if (isWinner) {
      fill = "var(--accent)";
      opacity = 1;
    } else if (i % 2 === 0) {
      fill = "var(--ink)";
      opacity = 0.95;
    } else {
      fill = "var(--ink)";
      opacity = 0.55;
    }
    segs.push(
      <path
        key={i}
        d={`M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
        fill={fill}
        opacity={opacity}
      />
    );
  }
  return (
    <svg className="big-wheel" viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <g transform="translate(128 128)">
        <g className="wheel-rotate">
          {segs}
          <circle r="22" fill="var(--paper)" />
          <circle r="6" fill="var(--ink)" />
        </g>
        <g>
          <path d="M0 -126 L-14 -100 L14 -100 Z" fill="var(--ink)" />
          <circle cx="0" cy="-100" r="3" fill="var(--paper)" />
        </g>
      </g>
    </svg>
  );
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Wheel size={size} pointer />
      <span className="brand-name">raffl</span>
    </div>
  );
}
