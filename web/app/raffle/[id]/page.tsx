import { RaffleDetail } from "@/components/raffle/raffle-detail";

export default async function RafflePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RaffleDetail rafflePubkey={id} />;
}
