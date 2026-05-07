import type { ComponentType } from "react";
import type { TocItem } from "@/components/docs/docs-toc";

import IntroductionPage, { toc as introductionToc } from "@/content/docs/introduction.mdx";
import GettingStartedPage, { toc as gettingStartedToc } from "@/content/docs/getting-started.mdx";
import CoreConceptsPage, { toc as coreConceptsToc } from "@/content/docs/core-concepts.mdx";
import CreatorsOverviewPage, { toc as creatorsOverviewToc } from "@/content/docs/creators-overview.mdx";
import CreateRafflePage, { toc as createRaffleToc } from "@/content/docs/create-raffle.mdx";
import ManageRafflePage, { toc as manageRaffleToc } from "@/content/docs/manage-raffle.mdx";
import PayoutsPage, { toc as payoutsToc } from "@/content/docs/payouts.mdx";
import BuyersOverviewPage, { toc as buyersOverviewToc } from "@/content/docs/buyers-overview.mdx";
import BuyTicketsPage, { toc as buyTicketsToc } from "@/content/docs/buy-tickets.mdx";
import ClaimPrizePage, { toc as claimPrizeToc } from "@/content/docs/claim-prize.mdx";
import OnChainPage, { toc as onChainToc } from "@/content/docs/on-chain.mdx";
import PdasPage, { toc as pdasToc } from "@/content/docs/pdas.mdx";
import InstructionsPage, { toc as instructionsToc } from "@/content/docs/instructions.mdx";
import IdlPage, { toc as idlToc } from "@/content/docs/idl.mdx";
import VrfPage, { toc as vrfToc } from "@/content/docs/vrf.mdx";
import VerifyDrawPage, { toc as verifyDrawToc } from "@/content/docs/verify-draw.mdx";
import FeesPage, { toc as feesToc } from "@/content/docs/fees.mdx";
import SdkPage, { toc as sdkToc } from "@/content/docs/sdk.mdx";
import RestPage, { toc as restToc } from "@/content/docs/rest.mdx";
import FaqPage, { toc as faqToc } from "@/content/docs/faq.mdx";

type Entry = {
  Page: ComponentType;
  toc: TocItem[];
  file: string;
};

export const PAGES: Record<string, Entry> = {
  introduction: { Page: IntroductionPage, toc: introductionToc, file: "introduction.mdx" },
  "getting-started": { Page: GettingStartedPage, toc: gettingStartedToc, file: "getting-started.mdx" },
  "core-concepts": { Page: CoreConceptsPage, toc: coreConceptsToc, file: "core-concepts.mdx" },
  "creators-overview": { Page: CreatorsOverviewPage, toc: creatorsOverviewToc, file: "creators-overview.mdx" },
  "create-raffle": { Page: CreateRafflePage, toc: createRaffleToc, file: "create-raffle.mdx" },
  "manage-raffle": { Page: ManageRafflePage, toc: manageRaffleToc, file: "manage-raffle.mdx" },
  payouts: { Page: PayoutsPage, toc: payoutsToc, file: "payouts.mdx" },
  "buyers-overview": { Page: BuyersOverviewPage, toc: buyersOverviewToc, file: "buyers-overview.mdx" },
  "buy-tickets": { Page: BuyTicketsPage, toc: buyTicketsToc, file: "buy-tickets.mdx" },
  "claim-prize": { Page: ClaimPrizePage, toc: claimPrizeToc, file: "claim-prize.mdx" },
  "on-chain": { Page: OnChainPage, toc: onChainToc, file: "on-chain.mdx" },
  pdas: { Page: PdasPage, toc: pdasToc, file: "pdas.mdx" },
  instructions: { Page: InstructionsPage, toc: instructionsToc, file: "instructions.mdx" },
  idl: { Page: IdlPage, toc: idlToc, file: "idl.mdx" },
  vrf: { Page: VrfPage, toc: vrfToc, file: "vrf.mdx" },
  "verify-draw": { Page: VerifyDrawPage, toc: verifyDrawToc, file: "verify-draw.mdx" },
  fees: { Page: FeesPage, toc: feesToc, file: "fees.mdx" },
  sdk: { Page: SdkPage, toc: sdkToc, file: "sdk.mdx" },
  rest: { Page: RestPage, toc: restToc, file: "rest.mdx" },
  faq: { Page: FaqPage, toc: faqToc, file: "faq.mdx" },
};
