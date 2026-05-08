"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/landing/wheel";
import { WalletDropdown } from "@/components/wallet-dropdown";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useRaffles } from "@/lib/hooks";
import {
  colorForPubkey,
  countdownFromUnix,
  displayStatus,
  formatSol,
  pct,
  shortAddress,
  type Raffle,
} from "@/lib/types";

type FilterKey = "active" | "closing-soon" | "expired" | "settled" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "closing-soon", label: "Closing soon" },
  { key: "expired", label: "Expired" },
  { key: "settled", label: "Settled" },
  { key: "all", label: "All" },
];

const ONE_HOUR = 3600;

export function ExploreContent() {
  const { data: raffles, loading } = useRaffles();
  const [filter, setFilter] = useState<FilterKey>("active");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return raffles;
    if (filter === "active")
      return raffles.filter(
        (r) => r.state === "active" && r.endTime > now && r.ticketsSold < r.maxTickets,
      );
    if (filter === "settled")
      return raffles.filter((r) => r.state === "settled" || r.state === "claimed");
    if (filter === "closing-soon")
      return raffles.filter(
        (r) => r.state === "active" && r.endTime - now > 0 && r.endTime - now < ONE_HOUR,
      );
    if (filter === "expired")
      return raffles.filter(
        (r) =>
          (r.state === "active" && (r.endTime <= now || r.ticketsSold >= r.maxTickets)) ||
          r.state === "drawing",
      );
    return raffles;
  }, [raffles, filter, now]);

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      // Active first, then by closest end time
      if (a.state === "active" && b.state !== "active") return -1;
      if (b.state === "active" && a.state !== "active") return 1;
      return a.endTime - b.endTime;
    });
  }, [filtered]);

  return (
    <div className="dash-shell">
      <ExploreHeader />
      <div className="dash-body">
        <section className="explore-head">
          <div>
            <h1>Explore raffles</h1>
            <p className="muted">
              {raffles.length} raffle{raffles.length === 1 ? "" : "s"} on devnet.
              Click any to see the details and buy a ticket.
            </p>
          </div>
        </section>

        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && raffles.length === 0 ? (
          <div className="panel">
            <div className="empty">Loading raffles…</div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="panel">
            <div className="empty">
              {filter === "active"
                ? "No active raffles right now. Check back soon, or "
                : filter === "closing-soon"
                  ? "Nothing closing in the next hour. Try "
                  : filter === "expired"
                    ? "No expired raffles awaiting resolution. Try "
                    : filter === "settled"
                      ? "No settled raffles yet. Try "
                      : "No raffles yet. "}
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="link-btn"
                >
                  see all
                </button>
              )}
              .
            </div>
          </div>
        ) : (
          <div className="explore-grid">
            {sorted.map((r) => (
              <ExploreCard key={r.pubkey} raffle={r} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExploreCard({ raffle: r, now }: { raffle: Raffle; now: number }) {
  const progress = pct(r.ticketsSold, r.maxTickets);
  const status = displayStatus(r, now);
  return (
    <Link href={`/raffle/${r.pubkey}`} className="explore-card">
      <div
        className="explore-card-thumb"
        style={{ background: colorForPubkey(r.pubkey) }}
        aria-hidden
      />
      <div className="explore-card-body">
        <div className="explore-card-state">
          <StatusBadge state={status} />
          {status === "active" && (
            <span className="explore-card-countdown">
              {countdownFromUnix(r.endTime, now)}
            </span>
          )}
        </div>
        <div className="explore-card-title">{r.prizeDescription}</div>
        <div className="explore-card-prize">
          {formatSol(r.prizeAmount)} <span>SOL prize</span>
        </div>
        <div className="explore-card-stats">
          <div>
            <span className="lbl">Ticket</span>
            <span className="val">{formatSol(r.ticketPrice, 3)} SOL</span>
          </div>
          <div>
            <span className="lbl">Sold</span>
            <span className="val">
              {r.ticketsSold} / {r.maxTickets}
            </span>
          </div>
        </div>
        <div className="explore-card-bar">
          <div className="bar-fill accent" style={{ width: `${progress}%` }} />
        </div>
        <div className="explore-card-creator">by {shortAddress(r.creator)}</div>
      </div>
    </Link>
  );
}

function ExploreHeader() {
  return (
    <div className="dash-header">
      <div className="dash-header-row">
        <Link href="/" className="dash-brand-link" aria-label="raffl home">
          <BrandMark size={32} />
          <span className="dash-eyebrow">/ explore</span>
        </Link>
        <div className="dash-header-actions">
          <Link href="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
          <WalletDropdown />
        </div>
      </div>
    </div>
  );
}
