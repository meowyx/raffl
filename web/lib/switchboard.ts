"use client";

import { useCallback } from "react";
import { AnchorProvider, Program, Wallet, web3 } from "@coral-xyz/anchor";
import * as sb from "@switchboard-xyz/on-demand";
import { Gateway } from "@switchboard-xyz/common";
import { toast } from "sonner";
import { mutate } from "swr";
import bs58 from "bs58";
import rafflIdlJson from "@/lib/idl/raffl.json";
import { KEY_RAFFLE, KEY_RAFFLES } from "@/lib/hooks";
import type { Raffle } from "@/lib/types";
import { useActiveWallet } from "@/lib/wallet";

const RAFFL_PROGRAM_ID = new web3.PublicKey(
  "Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA",
);

const TICKET_SEED = Buffer.from("ticket");

function rpcEndpoint(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/rpc`;
  }
  return "https://api.devnet.solana.com";
}

class PrivyWalletAdapter implements Wallet {
  readonly publicKey: web3.PublicKey;
  readonly payer: web3.Keypair;

  constructor(
    private readonly wallet: ReturnType<typeof useActiveWallet>["wallet"],
  ) {
    if (!wallet) throw new Error("PrivyWalletAdapter: no wallet");
    this.publicKey = new web3.PublicKey(wallet.address);
    // Required by the Wallet interface but never used; signing always goes
    // through signTransaction below.
    this.payer = web3.Keypair.generate();
  }

  async signTransaction<
    T extends web3.Transaction | web3.VersionedTransaction,
  >(tx: T): Promise<T> {
    if (!this.wallet) throw new Error("No wallet");
    const isVersioned = "version" in tx;
    const wireBytes = isVersioned
      ? (tx as web3.VersionedTransaction).serialize()
      : (tx as web3.Transaction).serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

    const { signedTransaction } = await this.wallet.signTransaction({
      transaction: new Uint8Array(wireBytes),
      chain: "solana:devnet",
    });

    if (isVersioned) {
      return web3.VersionedTransaction.deserialize(signedTransaction) as T;
    }
    return web3.Transaction.from(signedTransaction) as T;
  }

  async signAllTransactions<
    T extends web3.Transaction | web3.VersionedTransaction,
  >(txs: T[]): Promise<T[]> {
    const out: T[] = [];
    for (const t of txs) out.push(await this.signTransaction(t));
    return out;
  }
}

async function buildAnchorContext(
  wallet: ReturnType<typeof useActiveWallet>["wallet"],
) {
  if (!wallet) throw new Error("No wallet connected");
  const connection = new web3.Connection(rpcEndpoint(), "confirmed");
  const adapter = new PrivyWalletAdapter(wallet);
  const provider = new AnchorProvider(connection, adapter, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const sbProgram = await sb.AnchorUtils.loadProgramFromConnection(
    connection,
    adapter as Wallet,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rafflProgram = new Program(rafflIdlJson as any, provider) as Program;
  return { connection, provider, adapter, sbProgram, rafflProgram };
}

async function sendV0(
  connection: web3.Connection,
  adapter: PrivyWalletAdapter,
  ixs: web3.TransactionInstruction[],
  extraSigners: web3.Keypair[] = [],
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const message = new web3.TransactionMessage({
    payerKey: adapter.publicKey,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();
  let tx = new web3.VersionedTransaction(message);
  if (extraSigners.length) tx.sign(extraSigners);
  tx = await adapter.signTransaction(tx);
  const sig = await connection.sendTransaction(tx, { maxRetries: 3 });
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return sig;
}

// Mirrors the on-chain `u64::from_le_bytes(value[0..8])` in settle_raffle.
// Gateway type says `value: string` but at runtime it's typically number[].
function entropyToWinningTicket(value: unknown, ticketsSold: number): number {
  let bytes: Uint8Array;
  if (Array.isArray(value)) {
    bytes = new Uint8Array(value as number[]);
  } else if (typeof value === "string") {
    try {
      bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    } catch {
      bytes = new Uint8Array(
        (value.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)),
      );
    }
  } else {
    throw new Error(`Unexpected gateway value shape: ${typeof value}`);
  }
  if (bytes.length < 8) {
    throw new Error(`Gateway randomness too short: ${bytes.length} bytes`);
  }
  let acc = 0n;
  for (let i = 0; i < 8; i++) {
    acc |= BigInt(bytes[i] & 0xff) << BigInt(8 * i);
  }
  return Number(acc % BigInt(ticketsSold));
}

function deriveTicketPda(
  raffle: web3.PublicKey,
  ticketNumber: number,
): web3.PublicKey {
  const ticketIdx = Buffer.alloc(4);
  ticketIdx.writeUInt32LE(ticketNumber, 0);
  const [pda] = web3.PublicKey.findProgramAddressSync(
    [TICKET_SEED, raffle.toBuffer(), ticketIdx],
    RAFFL_PROGRAM_ID,
  );
  return pda;
}

export function useSettleRaffle() {
  const { wallet } = useActiveWallet();

  return useCallback(
    async (rafflePubkey: string, raffle: Raffle): Promise<string> => {
      if (!wallet) {
        toast.error("No wallet connected");
        throw new Error("No wallet connected");
      }
      if (raffle.ticketsSold < raffle.minTickets) {
        toast.error("Not enough tickets sold to settle");
        throw new Error("Not enough tickets");
      }

      const toastId = toast.loading("Settle: preparing...");
      try {
        const { connection, adapter, sbProgram, rafflProgram } =
          await buildAnchorContext(wallet);

        const queue = await sb.Queue.loadDefault(sbProgram);
        const rafflePk = new web3.PublicKey(rafflePubkey);

        toast.loading("Settle (1/3): creating randomness account...", {
          id: toastId,
        });
        const rngKp = web3.Keypair.generate();
        const [randomness, createIx] = await sb.Randomness.create(
          sbProgram,
          rngKp,
          queue.pubkey,
          adapter.publicKey,
        );
        await sendV0(connection, adapter, [createIx], [rngKp]);

        toast.loading("Settle (2/3): committing randomness...", {
          id: toastId,
        });
        const commitIx = await randomness.commitIx(
          queue.pubkey,
          adapter.publicKey,
        );
        const requestDrawIx = await rafflProgram.methods
          .requestDraw()
          .accountsPartial({
            initiator: adapter.publicKey,
            raffle: rafflePk,
            creator: new web3.PublicKey(raffle.creator),
            randomnessAccountData: randomness.pubkey,
          })
          .instruction();
        await sendV0(connection, adapter, [commitIx, requestDrawIx]);

        toast.loading("Settle: waiting for seed slot...", { id: toastId });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rngData: any = await randomness.loadData();
        const seedSlot: number = rngData.seedSlot.toNumber();
        const start = Date.now();
        while (Date.now() - start < 30_000) {
          const cur = await connection.getSlot("confirmed");
          if (cur > seedSlot) break;
          await new Promise((r) => setTimeout(r, 800));
        }

        toast.loading("Settle: fetching entropy from oracle...", {
          id: toastId,
        });
        const oracle = new sb.Oracle(sbProgram, rngData.oracle);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oracleData: any = await oracle.loadData();
        const gatewayUrl = String.fromCharCode(...oracleData.gatewayUri).replace(
          /\0+$/,
          "",
        );
        const gateway = new Gateway(gatewayUrl);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let revealResp: any = null;
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            revealResp = await gateway.fetchRandomnessReveal({
              randomnessAccount: rngKp.publicKey,
              slothash: bs58.encode(rngData.seedSlothash),
              slot: seedSlot,
              rpc: rpcEndpoint(),
            });
            break;
          } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        if (!revealResp) {
          throw new Error(
            `Gateway entropy fetch failed: ${
              lastErr instanceof Error ? lastErr.message : String(lastErr)
            }`,
          );
        }

        const winningTicket = entropyToWinningTicket(
          revealResp.value,
          raffle.ticketsSold,
        );
        const ticketPda = deriveTicketPda(rafflePk, winningTicket);

        toast.loading("Settle (3/3): revealing + settling...", {
          id: toastId,
        });
        const revealIx = await randomness.revealIx(adapter.publicKey);
        const settleIx = await rafflProgram.methods
          .settleRaffle()
          .accountsPartial({
            initiator: adapter.publicKey,
            raffle: rafflePk,
            randomnessAccountData: randomness.pubkey,
            ticket: ticketPda,
          })
          .instruction();
        const sig = await sendV0(connection, adapter, [revealIx, settleIx]);

        toast.success(`Settled. Winner: ticket #${winningTicket}`, {
          id: toastId,
        });

        await Promise.all([
          mutate(KEY_RAFFLES),
          mutate([KEY_RAFFLE, rafflePubkey]),
        ]);

        return sig;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "failed";
        toast.error(`Settle: ${msg}`, { id: toastId });
        console.error("[settle]", err);
        throw err;
      }
    },
    [wallet],
  );
}
