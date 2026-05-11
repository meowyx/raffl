import { notFound } from "next/navigation";
import { Metadata } from "next";
import { PAGES } from "@/lib/docs/content";
import { getDocsItem, getDocsSection, getPager, getAllSlugs } from "@/lib/docs/nav";
import { DocsToc } from "@/components/docs/docs-toc";
import { DocsPager } from "@/components/docs/docs-pager";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = PAGES[slug];
  if (!entry) return { title: "raffl docs" };
  return {
    title: `${entry.meta.title} - raffl docs`,
    description: entry.meta.description,
  };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = PAGES[slug];
  const item = getDocsItem(slug);
  const section = getDocsSection(slug);
  if (!entry || !item || !section) notFound();

  const { Page, toc, file } = entry;
  const { prev, next } = getPager(slug);

  return (
    <>
      <main className="docs-content">
        <div className="docs-breadcrumb">
          <span>Docs</span>
          <span className="sep">/</span>
          <span>{section.label}</span>
          <span className="sep">/</span>
          <span>{item.name}</span>
        </div>
        <Page />
        <DocsPager prev={prev} next={next} />
      </main>
      <DocsToc items={toc} editPath={`content/docs/${file}`} />
    </>
  );
}
