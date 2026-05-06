import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { RafflPrivyProvider } from "@/components/privy-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "raffl: on-chain raffles on Solana",
  description:
    "Permissionless on-chain raffles. Deposit a prize, set a ticket price, let buyers enter from any wallet. Switchboard VRF picks the winner.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body>
        <RafflPrivyProvider>{children}</RafflPrivyProvider>
      </body>
    </html>
  );
}
