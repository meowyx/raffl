// Solana Explorer URL builders. Devnet only for now to match the rest of the
// app; if the project ever runs on mainnet, swap the cluster query off
// `NEXT_PUBLIC_SOLANA_CLUSTER`.

const CLUSTER = "devnet";

export function explorerAccountUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;
}
