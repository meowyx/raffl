"use client";

import Link from "next/link";
import { Stat } from "./stat";
import { StatusBadge } from "./status-badge";
import {
  colorForPubkey,
  countdownFromUnix,
  displayStatus,
  formatSol,
  groupMyTicketsByRaffle,
  pct,
  shortAddress,
  type MyTicketGroup,
  type Raffle,
  type Ticket,
} from "@/lib/types";
import { explorerAccountUrl } from "@/lib/explorer";

type Props = {
  now: number;
  raffles: Raffle[];
  myTickets: Ticket[];
  me: string | null;
};

export function BuyerView({ now, raffles, myTickets, me }: Props) {
  const groups = groupMyTicketsByRaffle(myTickets, raffles, me);
  const activeGroups = groups.filter((g) => g.raffle.state === "active");
  const wonRaffles = me ? raffles.filter((r) => r.winner === me) : [];

  return (
    <>
      <BuyerStats groups={groups} wonRaffles={wonRaffles} />
      <div className="dash-main">
        <MyTickets groups={activeGroups} now={now} />
        <WinsCard wonRaffles={wonRaffles} />
      </div>
      <div className="dash-main">
        <DiscoverPanel raffles={raffles} now={now} />
        <BuyerHistory groups={groups} me={me} />
      </div>
    </>
  );
}

function BuyerStats({
  groups,
  wonRaffles,
}: {
  groups: MyTicketGroup[];
  wonRaffles: Raffle[];
}) {
  const activeGroups = groups.filter((g) => g.raffle.state === "active");
  const activeTickets = activeGroups.reduce((acc, g) => acc + g.count, 0);
  const lifetimeSpent = groups.reduce(
    (acc, g) => acc + Number(g.raffle.ticketPrice) * g.count,
    0,
  );

  return (
    <div className="stat-grid">
      <Stat
        label="Active tickets"
        value={String(activeTickets)}
        sub={`across ${activeGroups.length} raffle${activeGroups.length === 1 ? "" : "s"}`}
      />
      <Stat
        label="Spent (lifetime)"
        value={
          <>
            {(lifetimeSpent / 1_000_000_000).toFixed(2)}{" "}
            <span style={{ fontSize: 18, color: "var(--muted)" }}>SOL</span>
          </>
        }
        sub={`${groups.length} raffles entered`}
      />
      <Stat
        label="Won"
        value={String(wonRaffles.length)}
        sub={wonRaffles.length > 0 ? wonRaffles[0]?.prizeDescription : "no wins yet"}
      />
      <Stat
        label="Win rate"
        value={
          groups.length > 0
            ? `${((wonRaffles.length / groups.length) * 100).toFixed(1)}%`
            : "-"
        }
        sub={groups.length > 0 ? `${groups.length} raffles entered` : "enter a raffle to start"}
      />
    </div>
  );
}

function MyTickets({ groups, now }: { groups: MyTicketGroup[]; now: number }) {
  const totalTickets = groups.reduce((acc, g) => acc + g.count, 0);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>My tickets</h3>
        <span className="meta">
          {groups.length} raffles · {totalTickets} entries
        </span>
      </div>
      {groups.length === 0 ? (
        <div className="empty">
          No active tickets yet.{" "}
          <Link href="/explore" className="link-btn">Browse all raffles</Link>
          {" "}to find one you like.
        </div>
      ) : (
        <div className="ticket-grid">
          {groups.map((g) => (
            <MyTicketCard key={g.raffle.pubkey} group={g} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyTicketCard({ group, now }: { group: MyTicketGroup; now: number }) {
  const odds =
    group.raffle.ticketsSold > 0
      ? Math.round(group.raffle.ticketsSold / group.count)
      : 0;
  const status = displayStatus(group.raffle, now);
  return (
    <div className="ticket-card">
      <div className="tc-top">
        <StatusBadge state={status} />
        {status === "active" && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            {countdownFromUnix(group.raffle.endTime, now)}
          </span>
        )}
        <a
          href={explorerAccountUrl(group.raffle.pubkey)}
          target="_blank"
          rel="noopener noreferrer"
          className="explorer-link"
          title="View raffle on Solana Explorer"
          aria-label="View raffle on Solana Explorer"
          style={{ marginLeft: "auto" }}
        >
          ↗
        </a>
      </div>
      <div className="tc-name">{group.raffle.prizeDescription}</div>
      <div className="tc-stats">
        <div className="tc-stat">
          <span className="k">My tickets</span>
          <span className="v">×{group.count}</span>
        </div>
        <div className="tc-stat">
          <span className="k">Win odds</span>
          <span className="v" style={{ color: "var(--accent)" }}>
            {odds > 0 ? `1 in ${odds}` : "-"}
          </span>
        </div>
      </div>
      <Link
        href={`/raffle/${group.raffle.pubkey}`}
        className="btn btn-ghost btn-sm"
        style={{ width: "100%", justifyContent: "center" }}
      >
        View raffle ↗
      </Link>
    </div>
  );
}

function WinsCard({ wonRaffles }: { wonRaffles: Raffle[] }) {
  const unclaimed = wonRaffles.filter((r) => r.state === "settled");
  if (unclaimed.length === 0) {
    return (
      <div className="payouts-card">
        <div>
          <div className="lbl">Prizes ready to claim</div>
          <div className="num" style={{ marginTop: 4 }}>
            0<em>prizes</em>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-accent"
          style={{ width: "100%", justifyContent: "center" }}
          disabled
        >
          No prizes to claim
        </button>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7, textAlign: "center" }}>
          When you win, the prize shows up here with a claim button.
        </p>
      </div>
    );
  }
  const first = unclaimed[0];
  return (
    <div className="payouts-card">
      <div>
        <div className="lbl">Prizes ready to claim</div>
        <div className="num" style={{ marginTop: 4 }}>
          {unclaimed.length}
          <em>prize{unclaimed.length === 1 ? "" : "s"}</em>
        </div>
      </div>
      <div
        style={{
          background: "color-mix(in oklab, var(--paper) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--paper) 14%, transparent)",
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>{first.prizeDescription}</div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.6,
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            marginTop: 6,
          }}
        >
          {formatSol(first.prizeAmount)} SOL · ticket #{first.winningTicket ?? "?"}
        </div>
      </div>
      <Link
        href={`/raffle/${first.pubkey}`}
        className="btn btn-accent"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Claim prize
      </Link>
    </div>
  );
}

function DiscoverPanel({ raffles, now }: { raffles: Raffle[]; now: number }) {
  const top = raffles
    .filter(
      (r) => r.state === "active" && r.endTime > now && r.ticketsSold < r.maxTickets,
    )
    .slice(0, 4);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Closing soon</h3>
        <Link href="/explore" className="meta meta-link">
          Browse all →
        </Link>
      </div>
      {top.length === 0 ? (
        <div className="empty">No active raffles right now.</div>
      ) : (
        <div className="raffle-list">
          {top.map((r) => {
            const progress = pct(r.ticketsSold, r.maxTickets);
            return (
              <div key={r.pubkey} className="raffle-row discover-row">
                <div
                  className="raffle-thumb"
                  style={{ background: colorForPubkey(r.pubkey) }}
                />
                <div className="raffle-name">
                  <div className="title">{r.prizeDescription}</div>
                  <div className="sub">{formatSol(r.prizeAmount)} SOL prize</div>
                </div>
                <div className="raffle-progress">
                  <div className="row">
                    <span className="label">
                      {r.ticketsSold}/{r.maxTickets}
                    </span>
                    <span className="pct">{progress}%</span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="raffle-cell">
                  <span className="lbl">Ticket</span>
                  <span className="val">{formatSol(r.ticketPrice, 3)} SOL</span>
                </div>
                <div className="raffle-actions">
                  <a
                    href={explorerAccountUrl(r.pubkey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                    title="View raffle on Solana Explorer"
                    aria-label="View raffle on Solana Explorer"
                  >
                    ↗
                  </a>
                  <Link href={`/raffle/${r.pubkey}`} className="btn btn-primary btn-sm">
                    Buy
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BuyerHistory({
  groups,
  me,
}: {
  groups: MyTicketGroup[];
  me: string | null;
}) {
  const past = groups.filter(
    (g) => g.raffle.state === "settled" || g.raffle.state === "claimed",
  );
  const wins = me ? past.filter((g) => g.raffle.winner === me) : [];
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>My results</h3>
        <span className="meta">
          {past.length} settled · {wins.length} win{wins.length === 1 ? "" : "s"}
        </span>
      </div>
      {past.length === 0 ? (
        <div className="empty">No settled results yet.</div>
      ) : (
        <div className="history-shell">
          <table className="tbl">
            <thead>
              <tr>
                <th>Raffle</th>
                <th>My tickets</th>
                <th>Outcome</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {past.map((g) => {
                const won = me ? g.raffle.winner === me : false;
                return (
                  <tr key={g.raffle.pubkey}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          className="raffle-thumb"
                          style={{
                            width: 36,
                            height: 36,
                            background: colorForPubkey(g.raffle.pubkey),
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{g.raffle.prizeDescription}</span>
                      </div>
                    </td>
                    <td className="mono">×{g.count}</td>
                    <td>
                      <StatusBadge state={won ? "won" : "lost"} />
                    </td>
                    <td className="mono" style={{ color: "var(--muted)" }}>
                      {shortAddress(g.raffle.pubkey)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
