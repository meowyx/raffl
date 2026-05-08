// View-model types + format/selector helpers.
// All raffle / ticket data flows from `lib/program.ts` via the SWR hooks in
// `lib/hooks.ts`. The view-model shape mirrors the on-chain accounts so the
// adapter in program.ts is a thin field-rename.

export type RaffleState =
  | "active"
  | "drawing"
  | "settled"
  | "claimed"
  | "cancelled";

export type PrizeType = "sol" | "token" | "nft" | "physical";

export type Raffle = {
  pubkey: string;
  creator: string;
  nonce: bigint;
  prizeDescription: string;
  prizeType: PrizeType;
  ticketPrice: bigint;
  maxTickets: number;
  minTickets: number;
  ticketsSold: number;
  prizeAmount: bigint;
  endTime: number;
  createdAt: number;
  state: RaffleState;
  winningTicket: number | null;
  winner: string | null;
  vrfAccount: string;
};

export type Ticket = {
  pubkey: string;
  raffle: string;
  buyer: string;
  ticketNumber: number;
  purchasedAt: number;
};

// ---- Format helpers ----

const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function formatSol(lamports: bigint, fractionDigits = 2): string {
  return lamportsToSol(lamports).toFixed(fractionDigits);
}

export function pct(sold: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((sold / max) * 100);
}

export function shortAddress(pk: string, head = 4, tail = 4): string {
  if (pk.length <= head + tail + 1) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

export function countdownFromUnix(endUnix: number, nowUnix: number): string {
  const remaining = Math.max(0, endUnix - nowUnix);
  if (remaining <= 0) return "ENDED";
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function relativeAgo(unixSeconds: number, nowUnix: number): string {
  const diff = Math.max(0, nowUnix - unixSeconds);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

// Deterministic placeholder color from a pubkey. v0.1 has no on-chain image,
// so we draw a stable swatch per raffle until R2 + Supabase metadata land.
export function colorForPubkey(pk: string): string {
  let hash = 0;
  for (let i = 0; i < pk.length; i++) {
    hash = (hash * 31 + pk.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `oklch(0.62 0.14 ${hue})`;
}

// ---- Derived selectors ----

export function revenueSol(r: Raffle): number {
  return Number(r.ticketPrice * BigInt(r.ticketsSold)) / LAMPORTS_PER_SOL;
}

export function capSol(r: Raffle): number {
  return Number(r.ticketPrice * BigInt(r.maxTickets)) / LAMPORTS_PER_SOL;
}

export function selectMyCreated(all: Raffle[], me: string | null): Raffle[] {
  if (!me) return [];
  return all.filter((r) => r.creator === me);
}

export type RaffleDisplayStatus = RaffleState | "expired";

// On-chain `state` stays "active" past end_time until someone calls
// cancel_raffle / request_draw. UI needs a derived label so an under-subscribed
// or sold-out-but-undrawn raffle doesn't look buyable.
export function displayStatus(r: Raffle, nowUnix: number): RaffleDisplayStatus {
  if (r.state === "active" && (r.endTime <= nowUnix || r.ticketsSold >= r.maxTickets)) {
    return "expired";
  }
  return r.state;
}

export function selectActive(all: Raffle[]): Raffle[] {
  return all.filter((r) => r.state === "active");
}

export function selectByPubkey(all: Raffle[], pubkey: string): Raffle | undefined {
  return all.find((r) => r.pubkey === pubkey);
}

export type TicketWithRaffle = Ticket & { raffleData: Raffle | undefined };

export function joinTicketsToRaffles(
  tickets: Ticket[],
  raffles: Raffle[],
): TicketWithRaffle[] {
  return tickets.map((t) => ({
    ...t,
    raffleData: raffles.find((r) => r.pubkey === t.raffle),
  }));
}

export type MyTicketGroup = {
  raffle: Raffle;
  count: number;
  ticketNumbers: number[];
};

export function groupMyTicketsByRaffle(
  tickets: Ticket[],
  raffles: Raffle[],
  me: string | null,
): MyTicketGroup[] {
  if (!me) return [];
  const mine = tickets.filter((t) => t.buyer === me);
  const byRaffle = new Map<string, MyTicketGroup>();
  for (const t of mine) {
    const raffle = raffles.find((r) => r.pubkey === t.raffle);
    if (!raffle) continue;
    const existing = byRaffle.get(t.raffle);
    if (existing) {
      existing.count++;
      existing.ticketNumbers.push(t.ticketNumber);
    } else {
      byRaffle.set(t.raffle, { raffle, count: 1, ticketNumbers: [t.ticketNumber] });
    }
  }
  return Array.from(byRaffle.values());
}
