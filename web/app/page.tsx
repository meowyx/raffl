import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { TrustStrip } from "@/components/landing/trust-strip";
import { HowItWorks } from "@/components/landing/how-it-works";
import { WhyRaffl } from "@/components/landing/why-raffl";
import { CreatorSection } from "@/components/landing/creator-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="page">
      <Nav active="home" />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <WhyRaffl />
      <CreatorSection />
      <Footer />
    </div>
  );
}
