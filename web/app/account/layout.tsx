import { RealtimeProvider } from "@/components/realtime-provider";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
