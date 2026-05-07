"use client";

// Real on-chain reads for the raffl program.
// Returns view-model objects shaped per `lib/types.ts` so dashboard components
// stay agnostic to the data source.
//
// Architecture:
//   1. rpc.ts          → kit RPC against /api/rpc (Helius proxied) + WS to devnet
//   2. program-client/ → Codama-generated decoders + instruction builders
//   3. program.ts (this file) → discriminator-filtered fetches + chain→view-model adapters
//
// Components consume `Raffle` / `Ticket` view models from `lib/types.ts`.

import {
  isSome,
  type Address,
  type ReadonlyUint8Array,
} from "@solana/kit";
import {
  RAFFLE_DISCRIMINATOR,
  TICKET_DISCRIMINATOR,
  decodeRaffle,
  decodeTicket,
  fetchMaybeRaffle as fetchMaybeRaffleAccount,
  fetchMaybeRafflePlatform,
} from "@/lib/program-client/src/generated/accounts";
import { findPlatformPda } from "@/lib/program-client/src/generated/pdas";
import { RAFFL_PROGRAM_ADDRESS } from "@/lib/program-client/src/generated/programs";
import {
  PrizeType as ChainPrizeType,
  RaffleState as ChainRaffleState,
} from "@/lib/program-client/src/generated/types";
import { rpc } from "./rpc";
import type { PrizeType, Raffle, RaffleState, Ticket } from "./types";

export type Platform = {
  authority: string;
  treasury: string;
  feeBps: number;
};

// ---- Adapters: chain shape → view-model ----

const PRIZE_TYPE_NAME: Record<ChainPrizeType, PrizeType> = {
  [ChainPrizeType.Sol]: "sol",
  [ChainPrizeType.Token]: "token",
  [ChainPrizeType.Nft]: "nft",
  [ChainPrizeType.Physical]: "physical",
};

const RAFFLE_STATE_NAME: Record<ChainRaffleState, RaffleState> = {
  [ChainRaffleState.Active]: "active",
  [ChainRaffleState.Drawing]: "drawing",
  [ChainRaffleState.Settled]: "settled",
  [ChainRaffleState.Claimed]: "claimed",
  [ChainRaffleState.Cancelled]: "cancelled",
};

type ChainRaffleData = ReturnType<typeof decodeRaffle> extends infer R
  ? R extends { data: infer D }
    ? D
    : never
  : never;

function adaptRaffle(pubkey: Address, data: ChainRaffleData): Raffle {
  return {
    pubkey: pubkey as string,
    creator: data.creator as string,
    nonce: data.nonce,
    prizeDescription: data.prizeDescription,
    prizeType: PRIZE_TYPE_NAME[data.prizeType],
    ticketPrice: data.ticketPrice,
    maxTickets: data.maxTickets,
    minTickets: data.minTickets,
    ticketsSold: data.ticketsSold,
    prizeAmount: data.prizeAmount,
    endTime: Number(data.endTime),
    createdAt: Number(data.createdAt),
    state: RAFFLE_STATE_NAME[data.state],
    winningTicket: isSome(data.winningTicket) ? data.winningTicket.value : null,
    winner: isSome(data.winner) ? (data.winner.value as string) : null,
    vrfAccount: data.vrfAccount as string,
  };
}

type ChainTicketData = ReturnType<typeof decodeTicket> extends infer R
  ? R extends { data: infer D }
    ? D
    : never
  : never;

function adaptTicket(pubkey: Address, data: ChainTicketData): Ticket {
  return {
    pubkey: pubkey as string,
    raffle: data.raffle as string,
    buyer: data.buyer as string,
    ticketNumber: data.ticketNumber,
    purchasedAt: Number(data.purchasedAt),
  };
}

// ---- Helpers ----

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Encodes a small byte array (the 8-byte account discriminator) as a base58
// string for use in `memcmp.bytes`. We hand-roll this to avoid pulling in
// `bs58` as a dep — kit ships its codecs but doesn't expose a one-shot
// "bytes → base58 string" the way old web3.js v1 did. Eight bytes is tiny;
// this runs once per fetch.
function bytesToBase58(bytes: Uint8Array): string {
  const ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  // Math.ceil keeps `size` an integer — using a float here breaks
  // Uint8Array indexing in the result-collection loop and yields garbage
  // strings (e.g. "11" instead of the real 32-byte pubkey).
  const size = Math.ceil(((bytes.length - zeros) * 138) / 100) + 1;
  const buf = new Uint8Array(size);
  let length = 0;
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i] ?? 0;
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k !== -1; k--, j++) {
      carry += 256 * (buf[k] ?? 0);
      buf[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }
  let it = size - length;
  while (it !== size && buf[it] === 0) it++;
  let str = "1".repeat(zeros);
  for (; it < size; it++) str += ALPHABET[buf[it] ?? 0];
  return str;
}

// ---- Fetchers ----

export async function fetchAllRaffles(): Promise<Raffle[]> {
  // Fetch all program accounts and filter by discriminator client-side.
  // The kit memcmp filter with `offset: 0n` was returning empty results — the
  // BigInt apparently doesn't round-trip through the JSON-RPC layer cleanly.
  const response = await rpc
    .getProgramAccounts(RAFFL_PROGRAM_ADDRESS, { encoding: "base64" })
    .send();

  const raffles: Raffle[] = [];
  for (const item of response) {
    try {
      const [b64] = item.account.data;
      const bytes = base64ToBytes(b64);
      if (!bytesStartsWith(bytes, RAFFLE_DISCRIMINATOR)) continue;
      const decoded = decodeRaffle({
        address: item.pubkey,
        data: bytes,
        executable: item.account.executable,
        lamports: item.account.lamports,
        programAddress: item.account.owner,
        space: BigInt(bytes.length),
      });
      raffles.push(adaptRaffle(item.pubkey, decoded.data));
    } catch (err) {
      console.error("[fetchAllRaffles] decode failed for", item.pubkey, err);
    }
  }
  return raffles;
}

function bytesStartsWith(bytes: Uint8Array, prefix: ReadonlyUint8Array): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

export async function fetchRaffle(pubkey: string): Promise<Raffle | null> {
  const maybe = await fetchMaybeRaffleAccount(rpc, pubkey as Address);
  if (maybe.exists === false) return null;
  return adaptRaffle(maybe.address, maybe.data);
}

export async function fetchPlatform(): Promise<Platform | null> {
  const [pda] = await findPlatformPda();
  const maybe = await fetchMaybeRafflePlatform(rpc, pda);
  if (maybe.exists === false) return null;
  return {
    authority: maybe.data.authority as string,
    treasury: maybe.data.treasury as string,
    feeBps: maybe.data.feeBps,
  };
}

// Ticket layout: [8 disc][32 raffle][32 buyer][4 ticket_number][8 purchased_at][1 bump]
const TICKET_RAFFLE_OFFSET = 8;
const TICKET_BUYER_OFFSET = 40;

async function fetchAllRawProgramAccounts() {
  return rpc
    .getProgramAccounts(RAFFL_PROGRAM_ADDRESS, { encoding: "base64" })
    .send();
}

type RawProgramAccount = Awaited<ReturnType<typeof fetchAllRawProgramAccounts>>[number];

function decodeTicketSafe(item: RawProgramAccount): { bytes: Uint8Array; ticket: Ticket } | null {
  try {
    const data = item.account.data;
    const b64 = Array.isArray(data) ? data[0] : (data as unknown as string);
    const bytes = base64ToBytes(b64);
    if (!bytesStartsWith(bytes, TICKET_DISCRIMINATOR)) return null;
    const decoded = decodeTicket({
      address: item.pubkey,
      data: bytes,
      executable: item.account.executable,
      lamports: item.account.lamports,
      programAddress: item.account.owner,
      space: BigInt(bytes.length),
    });
    return { bytes, ticket: adaptTicket(item.pubkey, decoded.data) };
  } catch (err) {
    console.error("[decodeTicket] failed for", item.pubkey, err);
    return null;
  }
}

function readPubkeyAt(bytes: Uint8Array, offset: number): string {
  // Base58-encode 32 bytes starting at `offset`. We already have a bytes→base58
  // helper above; reuse it.
  return bytesToBase58(bytes.slice(offset, offset + 32));
}

export async function fetchTicketsForRaffle(rafflePubkey: string): Promise<Ticket[]> {
  const response = await fetchAllRawProgramAccounts();
  const tickets: Ticket[] = [];
  for (const item of response) {
    const decoded = decodeTicketSafe(item);
    if (!decoded) continue;
    if (readPubkeyAt(decoded.bytes, TICKET_RAFFLE_OFFSET) !== rafflePubkey) continue;
    tickets.push(decoded.ticket);
  }
  return tickets;
}

export async function fetchTicketsForBuyer(buyerPubkey: string): Promise<Ticket[]> {
  const response = await fetchAllRawProgramAccounts();
  const tickets: Ticket[] = [];
  for (const item of response) {
    const decoded = decodeTicketSafe(item);
    if (!decoded) continue;
    if (readPubkeyAt(decoded.bytes, TICKET_BUYER_OFFSET) !== buyerPubkey) continue;
    tickets.push(decoded.ticket);
  }
  return tickets;
}

// All tickets across the program, ordered newest-first by purchasedAt.
// v0.1: full scan is fine on devnet. Replace with an indexer (Helius webhooks
// → Supabase) once the active-raffle count grows past a few dozen.
export async function fetchAllTickets(): Promise<Ticket[]> {
  const response = await fetchAllRawProgramAccounts();
  const tickets: Ticket[] = [];
  for (const item of response) {
    const decoded = decodeTicketSafe(item);
    if (decoded) tickets.push(decoded.ticket);
  }
  return tickets.sort((a, b) => b.purchasedAt - a.purchasedAt);
}
