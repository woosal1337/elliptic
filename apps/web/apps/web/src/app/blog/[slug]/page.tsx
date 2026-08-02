import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Blocks } from "@/app/docs/_components/blocks";
import { POSTS, getPost, formatPostDate, readingMinutes } from "../_content/posts";
import { SITE_URL } from "@/lib/seo";

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Blog" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      siteName: "Elliptic",
      publishedTime: post.date,
      authors: post.authorUrl ? [post.authorUrl] : [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
      ...(post.authorUrl ? { url: post.authorUrl } : {}),
    },
    publisher: { "@type": "Organization", name: "Elliptic" },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <main className="flex-1">
        <article className="mx-auto flex w-full max-w-3xl flex-col px-6 py-16 lg:py-24">
          <Link
            href="/blog"
            className="text-small text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            ← Blog
          </Link>

          <p className="mt-8 font-mono text-mono-label text-muted-foreground">
            {formatPostDate(post.date)} · {readingMinutes(post)} min read
          </p>
          <h1 className="mt-3 font-display text-h1 font-semibold tracking-[-0.02em] text-foreground">
            {post.title}
          </h1>
          <p className="mt-3 text-lead text-muted-foreground">{post.description}</p>
          <p className="mt-4 text-small text-muted-foreground">
            By{" "}
            {post.authorUrl ? (
              <a
                href={post.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                {post.author}
              </a>
            ) : (
              post.author
            )}
          </p>

          <div className="mt-10 border-t border-border pt-10">
            <Blocks blocks={post.blocks} />
          </div>

          <div className="mt-16 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-8">
            <p className="font-display text-h3 font-semibold text-foreground">
              Run Elliptic yourself
            </p>
            <p className="text-body leading-relaxed text-muted-foreground">
              It is open source and self-hostable. Bring your own model keys, and your data never
              leaves your own infrastructure.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/woosal1337/elliptic"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-small font-medium text-accent-foreground transition-opacity duration-150 hover:opacity-90"
              >
                GitHub
              </a>
              <a
                href="https://docs.elliptic.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-small font-medium text-foreground transition-colors duration-150 hover:border-input"
              >
                Docs
              </a>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
