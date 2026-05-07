"use client";

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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase58(bytes: Uint8Array): string {
  const ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  // Math.ceil keeps size an integer; a float breaks the result-collection loop.
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

export async function fetchAllRaffles(): Promise<Raffle[]> {
  // Fetch all program accounts and filter discriminator client-side; the kit
  // memcmp filter with offset: 0n returns empty due to a BigInt round-trip bug.
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

// Full-scan; replace with an indexer once raffle count outgrows devnet.
export async function fetchAllTickets(): Promise<Ticket[]> {
  const response = await fetchAllRawProgramAccounts();
  const tickets: Ticket[] = [];
  for (const item of response) {
    const decoded = decodeTicketSafe(item);
    if (decoded) tickets.push(decoded.ticket);
  }
  return tickets.sort((a, b) => b.purchasedAt - a.purchasedAt);
}
