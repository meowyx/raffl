"use client";

import useSWR, { type SWRConfiguration } from "swr";
import {
  fetchAllRaffles,
  fetchAllTickets,
  fetchPlatform,
  fetchRaffle,
  fetchTicketsForBuyer,
  fetchTicketsForRaffle,
  type Platform,
} from "./program";
import type { Raffle, Ticket } from "./types";

// Key prefixes also matched by the realtime invalidation logic.
export const KEY_RAFFLES = "raffles";
export const KEY_TICKETS = "tickets";
export const KEY_RAFFLE = "raffle";
export const KEY_TICKETS_FOR_BUYER = "tickets-for-buyer";
export const KEY_TICKETS_FOR_RAFFLE = "tickets-for-raffle";
export const KEY_PLATFORM = "platform";

const config: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  dedupingInterval: 1500,
  errorRetryCount: 2,
};

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: Error | null;
};

function unwrap<T, F>(
  result: { data: T | undefined; error: unknown; isLoading: boolean },
  fallback: F,
): AsyncState<T | F> {
  return {
    data: (result.data ?? fallback) as T | F,
    loading: result.isLoading,
    error:
      result.error instanceof Error
        ? result.error
        : result.error
        ? new Error(String(result.error))
        : null,
  };
}

export function useRaffles(): AsyncState<Raffle[]> {
  const result = useSWR<Raffle[]>(KEY_RAFFLES, fetchAllRaffles, config);
  return unwrap(result, [] as Raffle[]);
}

export function useRaffle(pubkey: string | null): AsyncState<Raffle | null> {
  const result = useSWR<Raffle | null>(
    pubkey ? [KEY_RAFFLE, pubkey] : null,
    ([, pk]: [string, string]) => fetchRaffle(pk),
    config,
  );
  return unwrap(result, null);
}

export function useAllTickets(): AsyncState<Ticket[]> {
  const result = useSWR<Ticket[]>(KEY_TICKETS, fetchAllTickets, config);
  return unwrap(result, [] as Ticket[]);
}

export function useTicketsForBuyer(buyer: string | null): AsyncState<Ticket[]> {
  const result = useSWR<Ticket[]>(
    buyer ? [KEY_TICKETS_FOR_BUYER, buyer] : null,
    ([, b]: [string, string]) => fetchTicketsForBuyer(b),
    config,
  );
  return unwrap(result, [] as Ticket[]);
}

export function useTicketsForRaffle(
  raffle: string | null,
): AsyncState<Ticket[]> {
  const result = useSWR<Ticket[]>(
    raffle ? [KEY_TICKETS_FOR_RAFFLE, raffle] : null,
    ([, r]: [string, string]) => fetchTicketsForRaffle(r),
    config,
  );
  return unwrap(result, [] as Ticket[]);
}

export function usePlatform(): AsyncState<Platform | null> {
  const result = useSWR<Platform | null>(KEY_PLATFORM, fetchPlatform, config);
  return unwrap(result, null);
}
