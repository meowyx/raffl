"use client";

// Opens a single WebSocket subscription to programNotifications for the raffl
// program and triggers SWR cache invalidation whenever an account inside the
// program changes (raffle created/updated, ticket purchased, settle, claim,
// cancel, refund, reclaim — they all surface through this single channel).
//
// Mount this inside subtrees that consume the SWR hooks (dashboard, account).
// Mounting it on the landing page would open a WS we don't need.

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { rpcSubscriptions } from "@/lib/rpc";
import { RAFFL_PROGRAM_ADDRESS } from "@/lib/program-client/src/generated/programs";
import {
  KEY_RAFFLE,
  KEY_RAFFLES,
  KEY_TICKETS,
  KEY_TICKETS_FOR_BUYER,
  KEY_TICKETS_FOR_RAFFLE,
} from "@/lib/hooks";
import { identifyRafflAccount, RafflAccount } from "@/lib/program-client/src/generated/programs";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const subscription = await rpcSubscriptions
          .programNotifications(RAFFL_PROGRAM_ADDRESS, {
            commitment: "confirmed",
            encoding: "base64",
          })
          .subscribe({ abortSignal: controller.signal });

        for await (const notification of subscription) {
          // notification.value.account.data is [base64, "base64"].
          // Use the discriminator to figure out which keys to invalidate.
          // If the account is something we don't recognize (program upgrades,
          // unknown discriminators), fall back to coarse "invalidate all".
          const data = notification.value.account.data;
          const b64 = Array.isArray(data) ? data[0] : data;
          let kind: RafflAccount | null = null;
          try {
            const bytes = base64ToBytes(b64);
            kind = identifyRafflAccount(bytes);
          } catch {
            kind = null;
          }

          if (kind === RafflAccount.Raffle) {
            mutate((key) => keyMatchesRaffle(key, notification.value.pubkey));
          } else if (kind === RafflAccount.Ticket) {
            mutate((key) => keyMatchesTicket(key));
          } else {
            // Unknown / RafflePlatform / future account type — invalidate
            // everything. Cheap on a low-traffic devnet program.
            mutate(() => true);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // eslint-disable-next-line no-console
        console.error("[realtime] programNotifications failed", err);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [mutate]);

  return <>{children}</>;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function keyMatchesRaffle(key: unknown, changedPubkey: string): boolean {
  if (key === KEY_RAFFLES) return true;
  if (Array.isArray(key) && key[0] === KEY_RAFFLE && key[1] === changedPubkey) {
    return true;
  }
  return false;
}

function keyMatchesTicket(key: unknown): boolean {
  if (key === KEY_TICKETS) return true;
  if (
    Array.isArray(key) &&
    (key[0] === KEY_TICKETS_FOR_BUYER || key[0] === KEY_TICKETS_FOR_RAFFLE)
  ) {
    // Without decoding, we can't tell which buyer/raffle this ticket touches.
    // Coarse-invalidate every ticket-related key. SWR dedupes, so it's cheap.
    return true;
  }
  return false;
}
