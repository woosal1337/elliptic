import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { sortedPosts, formatPostDate } from "./_content/posts";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Blog",
    description:
      "Product updates and notes on building an agent-native company, from the team behind Elliptic.",
    path: "/blog",
  }),
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/rss.xml" },
  },
};

export default function BlogIndexPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-16 lg:py-24">
          <p className="font-mono text-mono-label uppercase text-muted-foreground">Blog</p>
          <h1 className="mt-3 font-display text-h1 font-semibold tracking-[-0.02em] text-foreground">
            The Elliptic blog
          </h1>
          <p className="mt-3 text-lead text-muted-foreground">
            Product updates, and notes on building an agent-native company.
          </p>

          <ul className="mt-12 flex flex-col">
            {sortedPosts.map((post) => (
              <li key={post.slug} className="border-t border-border first:border-t-0">
                <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-2 py-8">
                  <span className="font-mono text-mono-label uppercase text-muted-foreground">
                    {formatPostDate(post.date)}
                  </span>
                  <span className="font-display text-h3 font-semibold text-foreground transition-colors duration-150 group-hover:text-accent">
                    {post.title}
                  </span>
                  <span className="text-body leading-relaxed text-muted-foreground">
                    {post.description}
                  </span>
                  <span className="mt-1 text-small font-medium text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    Read →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
