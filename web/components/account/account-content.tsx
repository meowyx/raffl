"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Check, Copy } from "lucide-react";
import { BrandMark } from "@/components/landing/wheel";
import { Stat } from "@/components/dashboard/stat";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { WalletDropdown } from "@/components/wallet-dropdown";
import { useActiveWallet } from "@/lib/wallet";
import {
  colorForPubkey,
  countdownFromUnix,
  formatSol,
  groupMyTicketsByRaffle,
  relativeAgo,
  selectMyCreated,
  shortAddress,
  type Raffle,
} from "@/lib/types";
import { useRaffles, useTicketsForBuyer } from "@/lib/hooks";

export function AccountContent() {
  const { ready, authenticated, login } = usePrivy();
  const { wallet: active } = useActiveWallet();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const me = active?.address ?? null;

  const { data: raffles } = useRaffles();
  const { data: myTickets } = useTicketsForBuyer(me);

  const created = useMemo(() => selectMyCreated(raffles, me), [raffles, me]);
  const myGroups = useMemo(
    () => groupMyTicketsByRaffle(myTickets, raffles, me),
    [myTickets, raffles, me],
  );
  const totalTickets = useMemo(
    () => (me ? myTickets.filter((t) => t.buyer === me).length : 0),
    [myTickets, me],
  );
  const wonRaffles = useMemo(
    () =>
      me
        ? raffles.filter(
            (r) =>
              r.winner === me && (r.state === "settled" || r.state === "claimed"),
          )
        : [],
    [raffles, me],
  );
  const claimable = useMemo(
    () => wonRaffles.filter((r) => r.state === "settled"),
    [wonRaffles],
  );
  const claimableSol = useMemo(
    () => claimable.reduce((sum, r) => sum + Number(r.prizeAmount), 0) / 1_000_000_000,
    [claimable],
  );

  const recentActivity = useMemo(() => {
    if (!me) return [];
    const events: { kind: string; at: number; raffle: Raffle; meta?: string }[] = [];
    for (const t of myTickets.filter((t) => t.buyer === me)) {
      const r = raffles.find((x) => x.pubkey === t.raffle);
      if (r) events.push({ kind: "ticket", at: t.purchasedAt, raffle: r, meta: `#${t.ticketNumber}` });
    }
    for (const r of created) {
      events.push({ kind: "create", at: r.createdAt, raffle: r });
    }
    return events.sort((a, b) => b.at - a.at).slice(0, 6);
  }, [created, raffles, myTickets, me]);

  const onCopy = async () => {
    if (!me) return;
    await navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!ready) {
    return (
      <div className="dash-shell">
        <AccountHeader />
        <div className="dash-body">
          <div className="panel">
            <div className="empty">Loading account…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || !me) {
    return (
      <div className="dash-shell">
        <AccountHeader />
        <div className="dash-body">
          <div className="panel" style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>Connect your wallet</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Sign in to see raffles you&apos;ve created, tickets you hold, and prizes ready to claim.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={login}>
                Login
              </button>
              <Link href="/" className="btn btn-ghost">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <AccountHeader />
      <div className="dash-body">
        <section className="account-identity">
          <div
            className="account-avatar"
            style={{ background: colorForPubkey(me) }}
            aria-hidden
          />
          <div className="account-identity-meta">
            <div className="account-handle">{shortAddress(me, 6, 6)}</div>
            <div className="account-sub">
              <span className="chain-pill">solana · devnet</span>
              <button
                type="button"
                className="copy-btn"
                onClick={onCopy}
                aria-label="Copy address"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="stat-grid" style={{ marginTop: 24 }}>
          <Stat
            label="Raffles created"
            value={created.length}
            sub={`${created.filter((r) => r.state === "active" || r.state === "drawing").length} live`}
          />
          <Stat
            label="Tickets bought"
            value={totalTickets}
            sub={`across ${myGroups.length} ${myGroups.length === 1 ? "raffle" : "raffles"}`}
          />
          <Stat label="Wins" value={wonRaffles.length} sub={`${claimable.length} unclaimed`} />
          <Stat
            label="Claimable"
            value={`${claimableSol.toFixed(2)} SOL`}
            sub={claimable.length ? "Tap a row below to claim" : "Nothing to claim"}
          />
        </section>

        {claimable.length > 0 && (
          <section className="panel" style={{ marginTop: 24 }}>
            <div className="panel-head">
              <h3>Prizes to claim</h3>
              <span className="meta">{claimable.length}</span>
            </div>
            <div className="raffle-list">
              {claimable.map((r) => (
                <div className="raffle-row" key={r.pubkey}>
                  <div
                    className="raffle-thumb"
                    style={{ background: colorForPubkey(r.pubkey) }}
                    aria-hidden
                  />
                  <div className="raffle-top">
                    <div className="raffle-name">
                      <div className="title">{r.prizeDescription}</div>
                      <div className="sub">{formatSol(r.prizeAmount)} SOL prize · ended {relativeAgo(r.endTime, now)} ago</div>
                    </div>
                    <div className="raffle-actions">
                      <StatusBadge state={r.state} />
                      <button type="button" className="btn btn-primary btn-sm" disabled title="Claim wiring lands with the buy/settle flow">
                        Claim
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h3>Recent activity</h3>
            <Link href="/dashboard" className="meta-link">
              Open dashboard →
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <div className="empty">No activity yet. Buy a ticket or create a raffle to get started.</div>
          ) : (
            <div className="activity-list">
              {recentActivity.map((e, i) => (
                <div className="activity-row" key={`${e.kind}-${e.raffle.pubkey}-${i}`}>
                  <div
                    className="activity-thumb"
                    style={{ background: colorForPubkey(e.raffle.pubkey) }}
                    aria-hidden
                  />
                  <div className="activity-meta">
                    <div className="activity-title">
                      {e.kind === "ticket" ? "Bought ticket" : "Created raffle"} · {e.raffle.prizeDescription}
                    </div>
                    <div className="activity-sub">
                      {e.kind === "ticket" && e.meta ? `${e.meta} · ` : ""}
                      {relativeAgo(e.at, now)} ago
                    </div>
                  </div>
                  <StatusBadge state={e.raffle.state} />
                </div>
              ))}
            </div>
          )}
        </section>

        {myGroups.length > 0 && (
          <section className="panel" style={{ marginTop: 24 }}>
            <div className="panel-head">
              <h3>My active tickets</h3>
              <span className="meta">{myGroups.length}</span>
            </div>
            <div className="raffle-list">
              {myGroups.map((g) => (
                <div className="raffle-row" key={g.raffle.pubkey}>
                  <div
                    className="raffle-thumb"
                    style={{ background: colorForPubkey(g.raffle.pubkey) }}
                    aria-hidden
                  />
                  <div className="raffle-top">
                    <div className="raffle-name">
                      <div className="title">{g.raffle.prizeDescription}</div>
                      <div className="sub">
                        {g.count} {g.count === 1 ? "ticket" : "tickets"} ·{" "}
                        {g.raffle.state === "active"
                          ? `ends in ${countdownFromUnix(g.raffle.endTime, now)}`
                          : g.raffle.state}
                      </div>
                    </div>
                    <div className="raffle-actions">
                      <StatusBadge state={g.raffle.state} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AccountHeader() {
  return (
    <div className="dash-header">
      <div className="dash-header-row">
        <Link href="/" className="dash-brand-link" aria-label="raffl home">
          <BrandMark size={32} />
          <span className="dash-eyebrow">/ account</span>
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
