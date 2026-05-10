import type { ComponentType } from "react";
import type { TocItem } from "@/components/docs/docs-toc";

import IntroductionPage, { toc as introductionToc, meta as introductionMeta } from "@/content/docs/introduction.mdx";
import GettingStartedPage, { toc as gettingStartedToc, meta as gettingStartedMeta } from "@/content/docs/getting-started.mdx";
import CoreConceptsPage, { toc as coreConceptsToc, meta as coreConceptsMeta } from "@/content/docs/core-concepts.mdx";
import CreatorsOverviewPage, { toc as creatorsOverviewToc, meta as creatorsOverviewMeta } from "@/content/docs/creators-overview.mdx";
import CreateRafflePage, { toc as createRaffleToc, meta as createRaffleMeta } from "@/content/docs/create-raffle.mdx";
import ManageRafflePage, { toc as manageRaffleToc, meta as manageRaffleMeta } from "@/content/docs/manage-raffle.mdx";
import PayoutsPage, { toc as payoutsToc, meta as payoutsMeta } from "@/content/docs/payouts.mdx";
import BuyersOverviewPage, { toc as buyersOverviewToc, meta as buyersOverviewMeta } from "@/content/docs/buyers-overview.mdx";
import BuyTicketsPage, { toc as buyTicketsToc, meta as buyTicketsMeta } from "@/content/docs/buy-tickets.mdx";
import ClaimPrizePage, { toc as claimPrizeToc, meta as claimPrizeMeta } from "@/content/docs/claim-prize.mdx";
import OnChainPage, { toc as onChainToc, meta as onChainMeta } from "@/content/docs/on-chain.mdx";
import PdasPage, { toc as pdasToc, meta as pdasMeta } from "@/content/docs/pdas.mdx";
import InstructionsPage, { toc as instructionsToc, meta as instructionsMeta } from "@/content/docs/instructions.mdx";
import IdlPage, { toc as idlToc, meta as idlMeta } from "@/content/docs/idl.mdx";
import VrfPage, { toc as vrfToc, meta as vrfMeta } from "@/content/docs/vrf.mdx";
import VerifyDrawPage, { toc as verifyDrawToc, meta as verifyDrawMeta } from "@/content/docs/verify-draw.mdx";
import FeesPage, { toc as feesToc, meta as feesMeta } from "@/content/docs/fees.mdx";
import GlossaryPage, { toc as glossaryToc, meta as glossaryMeta } from "@/content/docs/glossary.mdx";
import ErrorsPage, { toc as errorsToc, meta as errorsMeta } from "@/content/docs/errors.mdx";
import SdkPage, { toc as sdkToc, meta as sdkMeta } from "@/content/docs/sdk.mdx";
import RestPage, { toc as restToc, meta as restMeta } from "@/content/docs/rest.mdx";
import FaqPage, { toc as faqToc, meta as faqMeta } from "@/content/docs/faq.mdx";

export type DocMeta = {
  title: string;
  description: string;
  lastUpdated: string;
};

type Entry = {
  Page: ComponentType;
  toc: TocItem[];
  meta: DocMeta;
  file: string;
};

export const PAGES: Record<string, Entry> = {
  introduction: { Page: IntroductionPage, toc: introductionToc, meta: introductionMeta, file: "introduction.mdx" },
  "getting-started": { Page: GettingStartedPage, toc: gettingStartedToc, meta: gettingStartedMeta, file: "getting-started.mdx" },
  "core-concepts": { Page: CoreConceptsPage, toc: coreConceptsToc, meta: coreConceptsMeta, file: "core-concepts.mdx" },
  "creators-overview": { Page: CreatorsOverviewPage, toc: creatorsOverviewToc, meta: creatorsOverviewMeta, file: "creators-overview.mdx" },
  "create-raffle": { Page: CreateRafflePage, toc: createRaffleToc, meta: createRaffleMeta, file: "create-raffle.mdx" },
  "manage-raffle": { Page: ManageRafflePage, toc: manageRaffleToc, meta: manageRaffleMeta, file: "manage-raffle.mdx" },
  payouts: { Page: PayoutsPage, toc: payoutsToc, meta: payoutsMeta, file: "payouts.mdx" },
  "buyers-overview": { Page: BuyersOverviewPage, toc: buyersOverviewToc, meta: buyersOverviewMeta, file: "buyers-overview.mdx" },
  "buy-tickets": { Page: BuyTicketsPage, toc: buyTicketsToc, meta: buyTicketsMeta, file: "buy-tickets.mdx" },
  "claim-prize": { Page: ClaimPrizePage, toc: claimPrizeToc, meta: claimPrizeMeta, file: "claim-prize.mdx" },
  "on-chain": { Page: OnChainPage, toc: onChainToc, meta: onChainMeta, file: "on-chain.mdx" },
  pdas: { Page: PdasPage, toc: pdasToc, meta: pdasMeta, file: "pdas.mdx" },
  instructions: { Page: InstructionsPage, toc: instructionsToc, meta: instructionsMeta, file: "instructions.mdx" },
  idl: { Page: IdlPage, toc: idlToc, meta: idlMeta, file: "idl.mdx" },
  vrf: { Page: VrfPage, toc: vrfToc, meta: vrfMeta, file: "vrf.mdx" },
  "verify-draw": { Page: VerifyDrawPage, toc: verifyDrawToc, meta: verifyDrawMeta, file: "verify-draw.mdx" },
  fees: { Page: FeesPage, toc: feesToc, meta: feesMeta, file: "fees.mdx" },
  glossary: { Page: GlossaryPage, toc: glossaryToc, meta: glossaryMeta, file: "glossary.mdx" },
  errors: { Page: ErrorsPage, toc: errorsToc, meta: errorsMeta, file: "errors.mdx" },
  sdk: { Page: SdkPage, toc: sdkToc, meta: sdkMeta, file: "sdk.mdx" },
  rest: { Page: RestPage, toc: restToc, meta: restMeta, file: "rest.mdx" },
  faq: { Page: FaqPage, toc: faqToc, meta: faqMeta, file: "faq.mdx" },
};
