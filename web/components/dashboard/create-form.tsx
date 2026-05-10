"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { createNoopSigner, type Address } from "@solana/kit";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/landing/wheel";
import { WalletDropdown } from "@/components/wallet-dropdown";
import {
  findRafflePda,
  getCreateRaffleInstructionAsync,
  PrizeType,
} from "@/lib/program-client/src/generated";
import { useSendTransaction } from "@/lib/tx";
import { useActiveWallet } from "@/lib/wallet";

const MIN_TICKETS_FLOOR = 2;
const MAX_DESCRIPTION_LENGTH = 128;
const HOUR_SECONDS = 3600;
const DAY_SECONDS = 86_400;

function generateNonce(): bigint {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let nonce = 0n;
  for (const b of buf) nonce = (nonce << 8n) | BigInt(b);
  // Mask to fit in i64-safe range (program treats as u64 but using high bit risks signed comparisons elsewhere)
  return nonce & 0x7fff_ffff_ffff_ffffn;
}

function defaultEndTimeLocal(): string {
  // Default: now + 24h, in YYYY-MM-DDTHH:mm format the datetime-local input expects
  const d = new Date(Date.now() + 24 * HOUR_SECONDS * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateRaffleForm() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { wallet } = useActiveWallet();
  const send = useSendTransaction();

  const [description, setDescription] = useState("");
  const [prizeSol, setPrizeSol] = useState("1");
  const [ticketPriceSol, setTicketPriceSol] = useState("0.05");
  const [maxTickets, setMaxTickets] = useState("100");
  const [minTickets, setMinTickets] = useState("10");
  const [endsAt, setEndsAt] = useState(defaultEndTimeLocal());
  const [submitting, setSubmitting] = useState(false);

  const creatorAddress = wallet?.address ?? null;

  const validation = useMemo(() => validateForm({
    description,
    prizeSol,
    ticketPriceSol,
    maxTickets,
    minTickets,
    endsAt,
  }), [description, prizeSol, ticketPriceSol, maxTickets, minTickets, endsAt]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorAddress) return;
    if (!validation.ok) return;

    setSubmitting(true);
    try {
      const nonce = generateNonce();
      const creator = createNoopSigner(creatorAddress as Address);
      const [rafflePda] = await findRafflePda({
        creator: creatorAddress as Address,
        nonce,
      });

      const ix = await getCreateRaffleInstructionAsync({
        creator,
        nonce,
        prizeType: PrizeType.Sol,
        prizeAmount: BigInt(Math.round(parseFloat(prizeSol) * 1_000_000_000)),
        prizeDescription: description.trim(),
        ticketPrice: BigInt(Math.round(parseFloat(ticketPriceSol) * 1_000_000_000)),
        maxTickets: parseInt(maxTickets, 10),
        minTickets: parseInt(minTickets, 10),
        endTime: BigInt(Math.floor(new Date(endsAt).getTime() / 1000)),
      });

      await send(ix, {
        label: "Creating raffle",
        invalidate: ["raffles"],
      });

      router.push(`/raffle/${rafflePda}`);
    } catch (err) {
      // sendTransaction already toasts errors
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="dash-shell">
        <CreateHeader />
        <div className="dash-body">
          <div className="panel">
            <div className="empty">Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="dash-shell">
        <CreateHeader />
        <div className="dash-body">
          <div className="panel" style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>Connect to create a raffle</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              You need a wallet to escrow the prize and sign the create transaction.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={login}>
                Login
              </button>
              <Link href="/dashboard" className="btn btn-ghost">
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <CreateHeader />
      <div className="dash-body">
        <form onSubmit={onSubmit} className="create-form">
          <div className="create-form-head">
            <h1>New raffle</h1>
            <p className="muted">SOL prizes only in v0.1. The full prize amount is escrowed on submit.</p>
          </div>

          <Field
            label="Prize description"
            hint={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
            error={validation.errors.description}
          >
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="e.g. AirPods Max"
              required
            />
          </Field>

          <div className="form-grid-2">
            <Field
              label="Prize amount (SOL)"
              error={validation.errors.prizeSol}
            >
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={prizeSol}
                onChange={(e) => setPrizeSol(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Ticket price (SOL)"
              error={validation.errors.ticketPriceSol}
            >
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={ticketPriceSol}
                onChange={(e) => setTicketPriceSol(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="form-grid-2">
            <Field
              label="Min tickets"
              hint={`≥ ${MIN_TICKETS_FLOOR}`}
              error={validation.errors.minTickets}
            >
              <input
                type="number"
                step="1"
                min={MIN_TICKETS_FLOOR}
                value={minTickets}
                onChange={(e) => setMinTickets(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Max tickets"
              error={validation.errors.maxTickets}
            >
              <input
                type="number"
                step="1"
                min="1"
                value={maxTickets}
                onChange={(e) => setMaxTickets(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field
            label="Ends at"
            hint="1 hour to 30 days from now"
            error={validation.errors.endsAt}
          >
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </Field>

          <div className="create-form-foot">
            <Link href="/dashboard" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={!validation.ok || submitting}
            >
              {submitting ? "Submitting…" : "Create raffle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateHeader() {
  return (
    <div className="dash-header">
      <div className="dash-header-row">
        <Link href="/dashboard" className="dash-brand-link" aria-label="Back to dashboard">
          <ArrowLeft className="size-4" />
          <BrandMark size={28} />
          <span className="dash-eyebrow">/ create</span>
        </Link>
        <div className="dash-header-actions">
          <WalletDropdown />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <div className="field-label-row">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

type FormState = {
  description: string;
  prizeSol: string;
  ticketPriceSol: string;
  maxTickets: string;
  minTickets: string;
  endsAt: string;
};

type ValidationResult = {
  ok: boolean;
  errors: Partial<Record<keyof FormState, string>>;
};

function validateForm(s: FormState): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (!s.description.trim()) {
    errors.description = "Required";
  } else if (s.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Max ${MAX_DESCRIPTION_LENGTH} characters`;
  }

  const prize = parseFloat(s.prizeSol);
  if (!Number.isFinite(prize) || prize <= 0) errors.prizeSol = "Must be greater than 0";

  const price = parseFloat(s.ticketPriceSol);
  if (!Number.isFinite(price) || price <= 0) errors.ticketPriceSol = "Must be greater than 0";

  const minT = parseInt(s.minTickets, 10);
  if (!Number.isFinite(minT) || minT < MIN_TICKETS_FLOOR)
    errors.minTickets = `Must be at least ${MIN_TICKETS_FLOOR}`;

  const maxT = parseInt(s.maxTickets, 10);
  if (!Number.isFinite(maxT) || maxT < 1) {
    errors.maxTickets = "Required";
  } else if (Number.isFinite(minT) && maxT < minT) {
    errors.maxTickets = "Must be ≥ min tickets";
  }

  if (!s.endsAt) {
    errors.endsAt = "Required";
  } else {
    const endUnix = Math.floor(new Date(s.endsAt).getTime() / 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(endUnix)) {
      errors.endsAt = "Invalid date";
    } else if (endUnix < nowUnix + HOUR_SECONDS) {
      errors.endsAt = "Must be at least 1 hour from now";
    } else if (endUnix > nowUnix + 30 * DAY_SECONDS) {
      errors.endsAt = "Must be within 30 days";
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
