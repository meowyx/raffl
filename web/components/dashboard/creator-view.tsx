"use client";

import { Stat } from "./stat";
import { StatusBadge } from "./status-badge";
import {
  capSol,
  colorForPubkey,
  countdownFromUnix,
  formatSol,
  pct,
  relativeAgo,
  revenueSol,
  selectByPubkey,
  selectMyCreated,
  shortAddress,
  type Raffle,
  type Ticket,
} from "@/lib/mock-data";

type Props = {
  now: number;
  raffles: Raffle[];
  recentTickets: Ticket[];
  me: string | null;
};

export function CreatorView({ now, raffles, recentTickets, me }: Props) {
  const mine = selectMyCreated(raffles, me);
  const open = mine.filter((r) => r.state === "active" || r.state === "drawing");
  const settled = mine.filter((r) => r.state === "settled" || r.state === "claimed");

  const myActivePubkeys = new Set(open.map((r) => r.pubkey));
  const ticketsForMyRaffles = recentTickets.filter((t) => myActivePubkeys.has(t.raffle));

  return (
    <>
      <CreatorStats mine={mine} />

      <div className="banner">
        <div>
          <h4>Run another raffle.</h4>
          <p>Drop a prize. Pick a price. The chain handles the draw.</p>
        </div>
        <button type="button" className="btn btn-accent btn-lg" disabled>
          + Create raffle
        </button>
      </div>

      <div className="dash-main">
        <CreatorRaffleList list={open} now={now} />
        <div className="dash-side">
          <PayoutsCard settled={settled} me={me} />
          <BuyerFeed tickets={ticketsForMyRaffles} raffles={raffles} now={now} />
        </div>
      </div>

      <div className="dash-main">
        <SettledHistory list={settled} />
        <RevenueChart />
      </div>
    </>
  );
}

function CreatorStats({ mine }: { mine: Raffle[] }) {
  const open = mine.filter((r) => r.state === "active");
  const ticketsSold = mine.reduce((acc, r) => acc + r.ticketsSold, 0);
  const revenue = mine.reduce((acc, r) => acc + revenueSol(r), 0);
  const cap = mine.reduce((acc, r) => acc + capSol(r), 0);
  const sellThru = cap > 0 ? Math.round((revenue / cap) * 100) : 0;

  return (
    <div className="stat-grid">
      <Stat
        label="Active raffles"
        value={String(open.length)}
        sub={`${mine.length - open.length} settled`}
      />
      <Stat
        label="Tickets sold"
        value={ticketsSold.toLocaleString()}
        sub={`across ${mine.length} raffle${mine.length === 1 ? "" : "s"}`}
      />
      <Stat
        label="Revenue"
        value={
          <>
            {revenue.toFixed(2)}{" "}
            <span style={{ fontSize: 18, color: "var(--muted)" }}>SOL</span>
          </>
        }
        sub="lifetime"
      />
      <Stat
        label="Sell-through"
        value={`${sellThru}%`}
        sub={`${mine.length} raffles avg`}
      />
    </div>
  );
}

function CreatorRaffleList({ list, now }: { list: Raffle[]; now: number }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>My active raffles</h3>
        <span className="meta">
          <span className="live-dot" aria-hidden />
          live
        </span>
      </div>
      {list.length === 0 ? (
        <div className="empty">No active raffles. Hit + Create raffle to launch one.</div>
      ) : (
        <div className="raffle-list">
          {list.map((r) => (
            <CreatorRaffleRow key={r.pubkey} raffle={r} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreatorRaffleRow({ raffle: r, now }: { raffle: Raffle; now: number }) {
  const progress = pct(r.ticketsSold, r.maxTickets);
  return (
    <div className="raffle-row">
      <div className="raffle-thumb placeholder-stripe" />
      <div className="raffle-top">
        <div className="raffle-name">
          <div className="title">{r.prizeDescription}</div>
          <div className="sub">
            {r.state === "drawing" ? (
              <StatusBadge state="drawing">drawing · VRF pending</StatusBadge>
            ) : (
              `Ends in ${countdownFromUnix(r.endTime, now)}`
            )}
          </div>
        </div>
        <div className="raffle-actions">
          {r.state === "drawing" ? (
            <button type="button" className="btn btn-primary btn-sm" disabled>
              Settle
            </button>
          ) : (
            <>
              <button type="button" className="icon-btn" title="View">
                ↗
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Cancel"
                style={{ color: "var(--danger)" }}
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>
      <div className="raffle-bottom">
        <div className="raffle-progress">
          <div className="row">
            <span className="label">
              {r.ticketsSold} / {r.maxTickets}
            </span>
            <span className="pct">{progress}%</span>
          </div>
          <div className="bar">
            <div className="bar-fill accent" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="raffle-cell">
          <span className="lbl">Revenue</span>
          <span className="val">{revenueSol(r).toFixed(2)} SOL</span>
        </div>
        <div className="raffle-cell">
          <span className="lbl">At cap</span>
          <span className="val" style={{ color: "var(--muted)" }}>
            {capSol(r).toFixed(2)} SOL
          </span>
        </div>
        <div className="raffle-cell">
          <span className="lbl">Sell-thru</span>
          <span className="val">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

function PayoutsCard({ settled, me }: { settled: Raffle[]; me: string | null }) {
  const owned = me
    ? settled.filter((r) => r.winner === me || r.creator === me)
    : [];
  const total = owned.reduce((acc, r) => acc + revenueSol(r) * 0.95, 0);
  return (
    <div className="payouts-card">
      <div>
        <div className="lbl">Payouts ready to claim</div>
        <div className="num" style={{ marginTop: 4 }}>
          {total.toFixed(2)}
          <em>SOL</em>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-accent"
        style={{ width: "100%", justifyContent: "center" }}
        disabled
      >
        Claim {total.toFixed(2)} SOL
      </button>
      <div className="breakdown">
        <div>
          <div className="b-lbl">From</div>
          <div className="b-val">
            {owned.length} raffle{owned.length === 1 ? "" : "s"}
          </div>
        </div>
        <div>
          <div className="b-lbl">Net of fees</div>
          <div className="b-val">−{(total * 0.05).toFixed(2)} SOL</div>
        </div>
      </div>
    </div>
  );
}

function BuyerFeed({
  tickets,
  raffles,
  now,
}: {
  tickets: Ticket[];
  raffles: Raffle[];
  now: number;
}) {
  const top = tickets.slice(0, 8);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Recent buyers</h3>
        <span className="meta">
          <span className="live-dot" aria-hidden />
          live
        </span>
      </div>
      {top.length === 0 ? (
        <div className="empty">No ticket activity yet on your raffles.</div>
      ) : (
        <div className="buyer-feed">
          {top.map((t, i) => {
            const raffle = selectByPubkey(raffles, t.raffle);
            return (
              <div key={t.pubkey} className="buyer-row">
                <div
                  className="buyer-avatar"
                  style={{ background: `hsl(${(i * 47) % 360}, 60%, 60%)` }}
                  aria-hidden
                />
                <div>
                  <div className="wallet">{shortAddress(t.buyer)}</div>
                  <div className="raffle">→ {raffle?.prizeDescription ?? "unknown raffle"}</div>
                </div>
                <span className="qty">×1</span>
                <span className="ago">{relativeAgo(t.purchasedAt, now)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettledHistory({ list }: { list: Raffle[] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Settled raffles</h3>
        <span className="meta meta-link">View all →</span>
      </div>
      {list.length === 0 ? (
        <div className="empty">No settled raffles yet.</div>
      ) : (
        <div className="history-shell">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Raffle</th>
                <th>Tickets</th>
                <th>Revenue</th>
                <th>Payout</th>
                <th>Winner</th>
                <th>VRF</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.pubkey}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        className="raffle-thumb"
                        style={{ width: 36, height: 36, background: colorForPubkey(r.pubkey) }}
                      />
                      <span style={{ fontWeight: 600 }}>{r.prizeDescription}</span>
                    </div>
                  </td>
                  <td className="mono">
                    {r.ticketsSold} / {r.maxTickets}
                  </td>
                  <td className="mono">{revenueSol(r).toFixed(2)} SOL</td>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {(revenueSol(r) * 0.95).toFixed(2)} SOL
                  </td>
                  <td className="mono">{r.winner ? shortAddress(r.winner) : "—"}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>
                    {shortAddress(r.vrfAccount)}
                  </td>
                  <td>
                    <StatusBadge state={r.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RevenueChart() {
  // Static placeholder until we wire daily revenue derivation from settled
  // raffles + ticket sales over time. Real data lands once a few raffles
  // settle on devnet.
  const data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...data) || 1;
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Revenue · last 14 days</h3>
        <span className="meta">total {total.toFixed(2)} SOL</span>
      </div>
      <div className="chart-shell">
        <svg viewBox="0 0 480 180" width="100%" height="180" aria-hidden>
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
            <line
              key={i}
              x1="0"
              x2="480"
              y1={180 - g * 160 - 10}
              y2={180 - g * 160 - 10}
              stroke="var(--line)"
              strokeWidth="1"
              strokeDasharray={g === 0 ? "0" : "2 4"}
            />
          ))}
          {data.map((v, i) => {
            const w = 480 / data.length;
            const h = (v / max) * 160;
            const x = i * w + 4;
            const y = 170 - h;
            const isLast = i === data.length - 1;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w - 8}
                height={h}
                rx="4"
                fill={isLast ? "var(--accent)" : "var(--ink)"}
                opacity={isLast ? 1 : 0.78}
              />
            );
          })}
        </svg>
        <div className="chart-axis">
          <span>14d ago</span>
          <span>7d ago</span>
          <span>today</span>
        </div>
      </div>
    </div>
  );
}
