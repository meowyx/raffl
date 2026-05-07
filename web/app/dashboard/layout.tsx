import { RealtimeProvider } from "@/components/realtime-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
