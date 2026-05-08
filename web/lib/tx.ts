"use client";

import { useCallback } from "react";
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase58Decoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type Signature,
} from "@solana/kit";
import { mutate } from "swr";
import { toast } from "sonner";
import { rpc } from "./rpc";
import { useActiveWallet } from "./wallet";
import { explorerTxUrl } from "./explorer";

type SendOptions = {
  invalidate?: string[];
  label?: string;
  confirmTimeoutMs?: number;
};

export function useSendTransaction() {
  const { wallet } = useActiveWallet();

  return useCallback(
    async (
      ix: Instruction | Instruction[],
      options?: SendOptions,
    ): Promise<string> => {
      if (!wallet) {
        toast.error("No wallet connected");
        throw new Error("No wallet connected");
      }

      const label = options?.label ?? "Transaction";
      const ixs = Array.isArray(ix) ? ix : [ix];
      const toastId = toast.loading(`${label}: preparing…`);

      try {
        const {
          value: { blockhash, lastValidBlockHeight },
        } = await rpc.getLatestBlockhash().send();

        const message = pipe(
          createTransactionMessage({ version: 0 }),
          (m) => setTransactionMessageFeePayer(wallet.address as Address, m),
          (m) =>
            setTransactionMessageLifetimeUsingBlockhash(
              { blockhash, lastValidBlockHeight },
              m,
            ),
          (m) => appendTransactionMessageInstructions(ixs, m),
        );

        const compiled = compileTransaction(message);
        const wireBytes = getTransactionEncoder().encode(compiled) as Uint8Array;

        toast.loading(`${label}: signing with ${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}…`, {
          id: toastId,
        });

        // Direct method-on-wallet bypasses Privy's hook, which routes to the
        // first-injected wallet when multiple Solana extensions are present.
        const { signature: signatureBytes } = await wallet.signAndSendTransaction({
          transaction: wireBytes,
          chain: "solana:devnet",
        });
        const signature = getBase58Decoder().decode(signatureBytes);

        toast.loading(`${label}: confirming…`, { id: toastId });
        await waitForConfirmation(signature, options?.confirmTimeoutMs ?? 30_000);

        toast.success(`${label}: confirmed`, {
          id: toastId,
          action: {
            label: "View ↗",
            onClick: () => window.open(explorerTxUrl(signature), "_blank", "noopener,noreferrer"),
          },
        });

        if (options?.invalidate?.length) {
          await Promise.all(options.invalidate.map((key) => mutate(key)));
        }

        return signature;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "failed";
        toast.error(`${label}: ${msg}`, { id: toastId });
        throw err;
      }
    },
    [wallet],
  );
}

async function waitForConfirmation(signature: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { value } = await rpc.getSignatureStatuses([signature as Signature]).send();
    const status = value[0];
    if (status?.err) {
      throw new Error(`On-chain failure: ${JSON.stringify(status.err)}`);
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Confirmation timeout (30s)");
}
