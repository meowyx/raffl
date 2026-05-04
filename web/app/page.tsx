import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="flex max-w-2xl flex-col items-center gap-7 text-center">
        <Image
          src="/logo.png"
          alt="raffl"
          width={96}
          height={96}
          priority
        />

        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          raffl
        </h1>

        <p className="text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
          Create a raffle. Anyone can enter. Chain picks the winner.
        </p>

        <p className="max-w-md text-sm leading-relaxed text-zinc-500">
          Permissionless on-chain raffles on Solana. Provably fair settlement
          via verifiable randomness.
        </p>

        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          Building for Colosseum · May 2026
        </span>
      </div>
    </main>
  );
}
