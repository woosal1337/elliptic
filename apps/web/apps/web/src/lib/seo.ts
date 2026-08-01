import type { Metadata } from "next";

/** Absolute origin of the marketing site, used for canonical URLs, OG, sitemap, and robots. */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://company.chele.bi";

interface PageMetaInput {
  title: string;
  description: string;
  /** Absolute path, e.g. "/privacy". */
  path: string;
  type?: "website" | "article";
}

/**
 * Per-page metadata with a canonical URL and OpenGraph populated from the page's own
 * title/description (Twitter and the OG image are inherited from the root layout +
 * the opengraph-image convention).
 */
export function pageMetadata({ title, description, path, type = "website" }: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: "Elliptic",
    },
  };
}
