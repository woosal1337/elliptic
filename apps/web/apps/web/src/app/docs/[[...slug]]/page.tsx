import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Blocks } from "../_components/blocks";
import { CopyPageButton } from "../_components/copy-page-button";
import {
  FIRST_SLUG,
  adjacentSlugs,
  getPage,
  labelForSlug,
} from "../_content/nav";
import { getDocsBasePath } from "../_lib/base-path";
import { pageToMarkdown } from "../_lib/to-markdown";

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

function resolveSlug(slug?: string[]): string {
  return slug?.[0] ?? FIRST_SLUG;
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(resolveSlug(slug));
  if (!page) return { title: "Docs" };
  return {
    title: `${page.title} · Elliptic Docs`,
    description: page.description,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const current = resolveSlug(slug);
  const page = getPage(current);
  if (!page) notFound();

  const basePath = await getDocsBasePath();
  const { prev, next } = adjacentSlugs(current);
  const href = (s: string) => (s === FIRST_SLUG ? basePath || "/" : `${basePath}/${s}`);
  const markdown = pageToMarkdown(page);

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-6 py-10 lg:px-10 lg:py-12">
      <div className="flex items-center justify-between gap-4">
        <span className="text-eyebrow font-semibold uppercase text-muted-foreground">
          Documentation
        </span>
        <CopyPageButton markdown={markdown} />
      </div>
      <h1 className="mt-2 font-display text-h2 font-semibold tracking-[-0.02em] text-foreground">
        {page.title}
      </h1>
      <p className="mt-3 text-lead text-muted-foreground">{page.description}</p>

      <article className="mt-6">
        <Blocks blocks={page.blocks} />
      </article>

      <nav className="mt-16 flex items-stretch justify-between gap-4 border-t border-border pt-6">
        {prev ? (
          <a
            href={href(prev)}
            className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-small transition-colors duration-150 hover:border-input"
          >
            <span className="flex items-center gap-1 text-caption text-muted-foreground/70">
              <ArrowLeft className="size-3" aria-hidden /> Previous
            </span>
            <span className="font-medium text-foreground">{labelForSlug(prev)}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a
            href={href(next)}
            className="flex flex-col items-end gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-right text-small transition-colors duration-150 hover:border-input"
          >
            <span className="flex items-center gap-1 text-caption text-muted-foreground/70">
              Next <ArrowRight className="size-3" aria-hidden />
            </span>
            <span className="font-medium text-foreground">{labelForSlug(next)}</span>
          </a>
        ) : (
          <span />
        )}
      </nav>

      <footer className="mt-10 border-t border-border pt-6 text-caption text-muted-foreground">
        © 2026 Elliptic ·{" "}
        <a
          href="https://elliptic.sh"
          className="text-accent underline-offset-4 hover:underline"
        >
          elliptic.sh
        </a>
      </footer>
    </div>
  );
}
