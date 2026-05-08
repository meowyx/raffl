"use client";

import type { CSSProperties, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type RaffleStatus =
  | "active"
  | "drawing"
  | "expired"
  | "settled"
  | "claimed"
  | "cancelled"
  | "won"
  | "lost";

const palette: Record<RaffleStatus, { bg: string; fg: string }> = {
  active: {
    bg: "color-mix(in oklab, var(--positive) 14%, transparent)",
    fg: "var(--positive)",
  },
  drawing: {
    bg: "color-mix(in oklab, var(--accent-violet) 14%, transparent)",
    fg: "var(--accent-violet)",
  },
  expired: { bg: "var(--paper-2)", fg: "var(--muted)" },
  settled: { bg: "var(--paper-2)", fg: "var(--muted)" },
  claimed: { bg: "var(--paper-2)", fg: "var(--muted)" },
  cancelled: {
    bg: "color-mix(in oklab, var(--danger) 14%, transparent)",
    fg: "var(--danger)",
  },
  won: {
    bg: "color-mix(in oklab, var(--accent) 18%, transparent)",
    fg: "var(--accent)",
  },
  lost: { bg: "var(--paper-2)", fg: "var(--muted-2)" },
};

const baseStyle: CSSProperties = {
  height: "auto",
  padding: "4px 10px",
  borderRadius: 999,
  border: 0,
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

export function StatusBadge({
  state,
  children,
}: {
  state: RaffleStatus;
  children?: ReactNode;
}) {
  const c = palette[state];
  return (
    <Badge style={{ ...baseStyle, background: c.bg, color: c.fg }}>
      {children ?? state}
    </Badge>
  );
}
