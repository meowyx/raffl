"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  createNoopSigner,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getU32Encoder,
  type Address,
} from "@solana/kit";
import { mutate } from "swr";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/landing/wheel";
import { WalletDropdown } from "@/components/wallet-dropdown";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  KEY_RAFFLES,
  KEY_RAFFLE,
  KEY_TICKETS_FOR_RAFFLE,
  usePlatform,
  useRaffle,
  useTicketsForRaffle,
} from "@/lib/hooks";
import {
  getBuyTicketInstructionAsync,
  getCancelRaffleInstruction,
  getClaimPrizeInstructionAsync,
  getReclaimPrizeInstructionAsync,
  getRefundTicketInstructionAsync,
  RAFFL_PROGRAM_ADDRESS,
} from "@/lib/program-client/src/generated";
import {
  colorForPubkey,
  countdownFromUnix,
  displayStatus,
  formatSol,
  pct,
  relativeAgo,
  shortAddress,
  type Ticket,
} from "@/lib/types";
import { explorerAccountUrl } from "@/lib/explorer";
import { useSendTransaction } from "@/lib/tx";
import { useSettleRaffle } from "@/lib/switchboard";
import { useActiveWallet } from "@/lib/wallet";

const TICKET_SEED = new Uint8Array([116, 105, 99, 107, 101, 116]); // "ticket"
const ONE_HOUR = 3600;

async function deriveTicketPda(raffle: Address, ticketNumber: number) {
  const [pda] = await getProgramDerivedAddress({
    programAddress: RAFFL_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(TICKET_SEED),
      getAddressEncoder().encode(raffle),
      getU32Encoder().encode(ticketNumber),
    ],
  });
  return pda;
}

export function RaffleDetail({ rafflePubkey }: { rafflePubkey: string }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallet } = useActiveWallet();
  const send = useSendTransaction();
  const settle = useSettleRaffle();

  const { data: raffle, loading, error } = useRaffle(rafflePubkey);
  const { data: tickets } = useTicketsForRaffle(rafflePubkey);
  const { data: platform } = usePlatform();

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const myTickets = useMemo<Ticket[]>(() => {
    if (!wallet) return [];
    return tickets.filter((t) => t.buyer === wallet.address);
  }, [tickets, wallet]);

  const invalidate = async () => {
    await Promise.all([
      mutate(KEY_RAFFLES),
      mutate([KEY_RAFFLE, rafflePubkey]),
      mutate([KEY_TICKETS_FOR_RAFFLE, rafflePubkey]),
    ]);
  };

  const onBuy = async () => {
    if (!raffle || !wallet) return;
    setSubmitting(true);
    try {
      const buyer = createNoopSigner(wallet.address as Address);
      const ticketPda = await deriveTicketPda(rafflePubkey as Address, raffle.ticketsSold);
      const ix = await getBuyTicketInstructionAsync({
        buyer,
        raffle: rafflePubkey as Address,
        ticket: ticketPda,
      });
      await send(ix, { label: "Buying ticket" });
      await invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async () => {
    if (!raffle || !wallet) return;
    setSubmitting(true);
    try {
      const initiator = createNoopSigner(wallet.address as Address);
      const ix = getCancelRaffleInstruction({
        initiator,
        raffle: rafflePubkey as Address,
      });
      await send(ix, { label: "Cancelling raffle" });
      await invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onClaim = async () => {
    if (!raffle || !wallet || !platform) return;
    setSubmitting(true);
    try {
      const winner = createNoopSigner(wallet.address as Address);
      const ix = await getClaimPrizeInstructionAsync({
        winner,
        raffle: rafflePubkey as Address,
        creator: raffle.creator as Address,
        treasury: platform.treasury as Address,
      });
      await send(ix, { label: "Claiming prize" });
      await invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onRefund = async () => {
    if (!raffle || !wallet || myTickets.length === 0) return;
    setSubmitting(true);
    try {
      const buyer = createNoopSigner(wallet.address as Address);
      for (const t of myTickets) {
        const ticketPda = await deriveTicketPda(rafflePubkey as Address, t.ticketNumber);
        const ix = await getRefundTicketInstructionAsync({
          buyer,
          raffle: rafflePubkey as Address,
          ticket: ticketPda,
        });
        await send(ix, { label: `Refunding ticket #${t.ticketNumber}` });
      }
      await invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onSettle = async () => {
    if (!raffle || !wallet) return;
    setSubmitting(true);
    try {
      await settle(rafflePubkey, raffle);
      await invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onReclaim = async () => {
    if (!raffle || !wallet) return;
    setSubmitting(true);
    try {
      const creator = createNoopSigner(wallet.address as Address);
      const ix = await getReclaimPrizeInstructionAsync({
        creator,
        raffle: rafflePubkey as Address,
      });
      await send(ix, { label: "Reclaiming prize" });
      await invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="dash-shell">
        <RaffleHeader />
        <div className="dash-body">
          <div className="panel">
            <div className="empty">Loading raffle…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="dash-shell">
        <RaffleHeader />
        <div className="dash-body">
          <div className="panel" style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>Raffle not found</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              {error?.message ?? "We couldn't find a raffle at that address."}
            </p>
            <Link href="/explore" className="btn btn-primary">
              Browse raffles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progress = pct(raffle.ticketsSold, raffle.maxTickets);
  const isActive = raffle.state === "active";
  const isDrawing = raffle.state === "drawing";
  const isSettled = raffle.state === "settled";
  const isCancelled = raffle.state === "cancelled";
  const isCreator = wallet?.address === raffle.creator;
  const isWinner = wallet?.address === raffle.winner;
  const ended = now >= raffle.endTime;

  const canCancel =
    (isActive && ended && raffle.ticketsSold < raffle.minTickets) ||
    (isDrawing && now > raffle.endTime + ONE_HOUR);

  const canSettle = isCreator && isActive && ended && raffle.ticketsSold >= raffle.minTickets;
  const canClaim = isSettled && isWinner;
  const canRefund = isCancelled && myTickets.length > 0;
  const canReclaim = isCancelled && isCreator;

  const recentBuyers = tickets
    .slice()
    .sort((a, b) => b.purchasedAt - a.purchasedAt)
    .slice(0, 8);

  return (
    <div className="dash-shell">
      <RaffleHeader />
      <div className="dash-body">
        <section className="raffle-hero">
          <div
            className="raffle-hero-thumb"
            style={{ background: colorForPubkey(raffle.pubkey) }}
            aria-hidden
          />
          <div className="raffle-hero-meta">
            <div className="raffle-hero-state">
              <StatusBadge state={displayStatus(raffle, now)} />
              {isActive && !ended && (
                <span className="raffle-hero-countdown">
                  ends in {countdownFromUnix(raffle.endTime, now)}
                </span>
              )}
              {isActive && ended && (
                <span className="raffle-hero-countdown">ended {relativeAgo(raffle.endTime, now)} ago</span>
              )}
              <a
                href={explorerAccountUrl(raffle.pubkey)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
                title="View raffle on Solana Explorer"
                aria-label="View raffle on Solana Explorer"
              >
                ↗
              </a>
            </div>
            <h1 className="raffle-hero-title">{raffle.prizeDescription}</h1>
            <div className="raffle-hero-prize">
              {formatSol(raffle.prizeAmount)} <span>SOL</span>
            </div>
            <div className="raffle-hero-sub">
              Created by {shortAddress(raffle.creator)}
              {isCreator && <span className="you-tag">you</span>}
            </div>
          </div>
        </section>

        <section className="raffle-stats">
          <div className="raffle-stat">
            <div className="lbl">Ticket price</div>
            <div className="val">{formatSol(raffle.ticketPrice, 3)} SOL</div>
          </div>
          <div className="raffle-stat">
            <div className="lbl">Tickets sold</div>
            <div className="val">
              {raffle.ticketsSold} / {raffle.maxTickets}
            </div>
          </div>
          <div className="raffle-stat">
            <div className="lbl">Min to draw</div>
            <div className="val">{raffle.minTickets}</div>
          </div>
          <div className="raffle-stat">
            <div className="lbl">Progress</div>
            <div className="val">{progress}%</div>
          </div>
        </section>

        <div className="raffle-progress-bar">
          <div className="bar">
            <div className="bar-fill accent" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <section className="raffle-cta">
          <RaffleActions
            authenticated={authenticated}
            login={login}
            submitting={submitting}
            isActive={isActive}
            isDrawing={isDrawing}
            isSettled={isSettled}
            isCancelled={isCancelled}
            isWinner={isWinner}
            isCreator={isCreator}
            canCancel={canCancel}
            canSettle={canSettle}
            canClaim={canClaim}
            canRefund={canRefund}
            canReclaim={canReclaim}
            myTicketCount={myTickets.length}
            ticketPriceSol={formatSol(raffle.ticketPrice, 3)}
            ticketsSold={raffle.ticketsSold}
            maxTickets={raffle.maxTickets}
            winner={raffle.winner}
            onBuy={onBuy}
            onCancel={onCancel}
            onClaim={onClaim}
            onRefund={onRefund}
            onReclaim={onReclaim}
            onSettle={onSettle}
          />
        </section>

        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h3>Recent buyers</h3>
            <span className="meta">
              {tickets.length} {tickets.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {recentBuyers.length === 0 ? (
            <div className="empty">No tickets yet. Be the first.</div>
          ) : (
            <div className="activity-list">
              {recentBuyers.map((t) => (
                <div className="activity-row" key={t.pubkey}>
                  <div
                    className="activity-thumb"
                    style={{ background: colorForPubkey(t.buyer) }}
                    aria-hidden
                  />
                  <div className="activity-meta">
                    <div className="activity-title">
                      {shortAddress(t.buyer)}
                      {wallet?.address === t.buyer && <span className="you-tag">you</span>}
                    </div>
                    <div className="activity-sub">
                      ticket #{t.ticketNumber} · {relativeAgo(t.purchasedAt, now)} ago
                    </div>
                  </div>
                  <a
                    href={explorerAccountUrl(t.pubkey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                    title="View ticket on Solana Explorer"
                    aria-label="View ticket on Solana Explorer"
                  >
                    ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type ActionsProps = {
  authenticated: boolean;
  login: () => void;
  submitting: boolean;
  isActive: boolean;
  isDrawing: boolean;
  isSettled: boolean;
  isCancelled: boolean;
  isWinner: boolean;
  isCreator: boolean;
  canCancel: boolean;
  canSettle: boolean;
  canClaim: boolean;
  canRefund: boolean;
  canReclaim: boolean;
  myTicketCount: number;
  ticketPriceSol: string;
  ticketsSold: number;
  maxTickets: number;
  winner: string | null;
  onBuy: () => void;
  onCancel: () => void;
  onClaim: () => void;
  onRefund: () => void;
  onReclaim: () => void;
  onSettle: () => void;
};

function RaffleActions(p: ActionsProps) {
  if (!p.authenticated) {
    return (
      <button type="button" className="btn btn-accent btn-lg" onClick={p.login}>
        Connect to interact
      </button>
    );
  }

  const buttons: React.ReactNode[] = [];

  if (p.isActive) {
    if (p.ticketsSold >= p.maxTickets) {
      buttons.push(
        <button key="sold-out" type="button" className="btn btn-accent btn-lg" disabled>
          Sold out
        </button>,
      );
    } else {
      buttons.push(
        <button
          key="buy"
          type="button"
          className="btn btn-accent btn-lg"
          onClick={p.onBuy}
          disabled={p.submitting}
        >
          {p.submitting ? "Submitting…" : `Buy a ticket · ${p.ticketPriceSol} SOL`}
        </button>,
      );
    }
  }

  if (p.canSettle) {
    buttons.push(
      <button
        key="settle"
        type="button"
        className="btn btn-primary btn-lg"
        onClick={p.onSettle}
        disabled={p.submitting}
        title="Runs the 3-tx Switchboard commit/reveal pipeline"
      >
        {p.submitting ? "Submitting…" : "Settle (Switchboard)"}
      </button>,
    );
  }

  if (p.canClaim) {
    buttons.push(
      <button
        key="claim"
        type="button"
        className="btn btn-accent btn-lg"
        onClick={p.onClaim}
        disabled={p.submitting}
      >
        {p.submitting ? "Submitting…" : "Claim prize"}
      </button>,
    );
  }

  if (p.canRefund) {
    buttons.push(
      <button
        key="refund"
        type="button"
        className="btn btn-primary btn-lg"
        onClick={p.onRefund}
        disabled={p.submitting}
      >
        {p.submitting
          ? "Submitting…"
          : `Refund ${p.myTicketCount} ticket${p.myTicketCount === 1 ? "" : "s"}`}
      </button>,
    );
  }

  if (p.canReclaim) {
    buttons.push(
      <button
        key="reclaim"
        type="button"
        className="btn btn-primary btn-lg"
        onClick={p.onReclaim}
        disabled={p.submitting}
      >
        {p.submitting ? "Submitting…" : "Reclaim prize"}
      </button>,
    );
  }

  if (p.canCancel) {
    buttons.push(
      <button
        key="cancel"
        type="button"
        className="btn btn-ghost"
        onClick={p.onCancel}
        disabled={p.submitting}
      >
        {p.submitting ? "Submitting…" : "Cancel raffle"}
      </button>,
    );
  }

  if (buttons.length === 0) {
    return (
      <div className="raffle-cta-info">
        {p.isDrawing && "Raffle ended. VRF is selecting a winner."}
        {p.isSettled &&
          (p.isWinner
            ? "You won! Click Claim above to collect."
            : `Winner: ${p.winner ? shortAddress(p.winner) : "-"}`)}
        {!p.isDrawing && !p.isSettled && !p.isCancelled && !p.isActive && "No actions available."}
        {p.isCancelled && p.myTicketCount === 0 && !p.isCreator && "Raffle cancelled."}
      </div>
    );
  }

  return <div className="raffle-cta-stack">{buttons}</div>;
}

function RaffleHeader() {
  return (
    <div className="dash-header">
      <div className="dash-header-row">
        <Link href="/explore" className="dash-brand-link" aria-label="Browse raffles">
          <ArrowLeft className="size-4" />
          <BrandMark size={28} />
          <span className="dash-eyebrow">/ raffle</span>
        </Link>
        <div className="dash-header-actions">
          <WalletDropdown />
        </div>
      </div>
    </div>
  );
}
