"use client";

// Real on-chain reads for the raffl program.
// Returns view-model objects shaped identically to web/lib/mock-data.ts so the
// dashboard components can swap mock for real with a single import change.
//
// Architecture:
//   1. rpc.ts          → kit RPC against /api/rpc (Helius proxied) + WS to devnet
//   2. program-client/ → Codama-generated decoders + instruction builders
//   3. program.ts (this file) → discriminator-filtered fetches + chain→view-model adapters
//
// Components consume `Raffle` / `Ticket` view models. Both mock-data.ts and this
// module produce that shape; components don't know or care which one rendered.

import { isSome, type Address, type Base58EncodedBytes } from "@solana/kit";
import {
  RAFFLE_DISCRIMINATOR,
  TICKET_DISCRIMINATOR,
  decodeRaffle,
  decodeTicket,
  fetchMaybeRaffle as fetchMaybeRaffleAccount,
} from "@/lib/program-client/src/generated/accounts";
import { RAFFL_PROGRAM_ADDRESS } from "@/lib/program-client/src/generated/programs";
import {
  PrizeType as ChainPrizeType,
  RaffleState as ChainRaffleState,
} from "@/lib/program-client/src/generated/types";
import { rpc } from "./rpc";
import type { PrizeType, Raffle, RaffleState, Ticket } from "./mock-data";

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
  let length = 0;
  const size = ((bytes.length - zeros) * 138) / 100 + 1;
  const buf = new Uint8Array(size);
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

const RAFFLE_DISC_BS58 = bytesToBase58(
  new Uint8Array(RAFFLE_DISCRIMINATOR),
) as Base58EncodedBytes;
const TICKET_DISC_BS58 = bytesToBase58(
  new Uint8Array(TICKET_DISCRIMINATOR),
) as Base58EncodedBytes;

// ---- Fetchers ----

export async function fetchAllRaffles(): Promise<Raffle[]> {
  const response = await rpc
    .getProgramAccounts(RAFFL_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        { memcmp: { offset: 0n, bytes: RAFFLE_DISC_BS58, encoding: "base58" } },
      ],
    })
    .send();

  return response.map((item) => {
    const [b64] = item.account.data;
    const bytes = base64ToBytes(b64);
    const decoded = decodeRaffle({
      address: item.pubkey,
      data: bytes,
      executable: item.account.executable,
      lamports: item.account.lamports,
      programAddress: item.account.owner,
      space: BigInt(bytes.length),
    });
    return adaptRaffle(item.pubkey, decoded.data);
  });
}

export async function fetchRaffle(pubkey: string): Promise<Raffle | null> {
  const maybe = await fetchMaybeRaffleAccount(rpc, pubkey as Address);
  if (maybe.exists === false) return null;
  return adaptRaffle(maybe.address, maybe.data);
}

async function fetchTicketsByMemcmp(
  fieldOffset: bigint,
  matchPubkey: string,
): Promise<Ticket[]> {
  const response = await rpc
    .getProgramAccounts(RAFFL_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        { memcmp: { offset: 0n, bytes: TICKET_DISC_BS58, encoding: "base58" } },
        {
          memcmp: {
            offset: fieldOffset,
            bytes: matchPubkey as Base58EncodedBytes,
            encoding: "base58",
          },
        },
      ],
    })
    .send();

  return response.map((item) => {
    const [b64] = item.account.data;
    const bytes = base64ToBytes(b64);
    const decoded = decodeTicket({
      address: item.pubkey,
      data: bytes,
      executable: item.account.executable,
      lamports: item.account.lamports,
      programAddress: item.account.owner,
      space: BigInt(bytes.length),
    });
    return adaptTicket(item.pubkey, decoded.data);
  });
}

// Ticket layout: [8 disc][32 raffle][32 buyer][4 ticket_number][8 purchased_at][1 bump]
// Filter on raffle pubkey at offset 8.
export function fetchTicketsForRaffle(rafflePubkey: string): Promise<Ticket[]> {
  return fetchTicketsByMemcmp(8n, rafflePubkey);
}

// Filter on buyer pubkey at offset 8 + 32 = 40.
export function fetchTicketsForBuyer(buyerPubkey: string): Promise<Ticket[]> {
  return fetchTicketsByMemcmp(40n, buyerPubkey);
}

// All tickets across the program, ordered newest-first by purchasedAt.
// v0.1: full scan is fine on devnet. Replace with an indexer (Helius webhooks
// → Supabase) once the active-raffle count grows past a few dozen.
export async function fetchAllTickets(): Promise<Ticket[]> {
  const response = await rpc
    .getProgramAccounts(RAFFL_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        { memcmp: { offset: 0n, bytes: TICKET_DISC_BS58, encoding: "base58" } },
      ],
    })
    .send();

  const tickets = response.map((item) => {
    const [b64] = item.account.data;
    const bytes = base64ToBytes(b64);
    const decoded = decodeTicket({
      address: item.pubkey,
      data: bytes,
      executable: item.account.executable,
      lamports: item.account.lamports,
      programAddress: item.account.owner,
      space: BigInt(bytes.length),
    });
    return adaptTicket(item.pubkey, decoded.data);
  });

  return tickets.sort((a, b) => b.purchasedAt - a.purchasedAt);
}
