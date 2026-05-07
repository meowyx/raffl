// Anchor migration. Runs once after `anchor deploy` (or standalone via

import * as anchor from "@anchor-lang/core";
import type { Raffl } from "../target/types/raffl";

const FEE_BPS = 500;

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  const program = anchor.workspace.Raffl as anchor.Program<Raffl>;

  const [platformPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );

  console.log(`Authority:    ${provider.wallet.publicKey.toBase58()}`);
  console.log(`Platform PDA: ${platformPda.toBase58()}`);

  const existing = await provider.connection.getAccountInfo(platformPda);
  if (existing) {
    console.log("Platform already initialized. Nothing to do.");
    return;
  }

  const treasury = provider.wallet.publicKey;
  const tx = await program.methods
    .initializePlatform(FEE_BPS, treasury)
    .accounts({
      authority: provider.wallet.publicKey,
    })
    .rpc({ commitment: "confirmed" });

  console.log(`Treasury:     ${treasury.toBase58()}`);
  console.log(`Fee:          ${FEE_BPS} bps (${FEE_BPS / 100}%)`);
  console.log(`✓ Platform initialized. Tx: ${tx}`);
};
