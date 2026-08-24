import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { POSTS } from "@/app/blog/_content/posts";
import { ORDERED_SLUGS, hrefForSlug } from "@/app/docs/_content/nav";

/**
 * Every public page, and only the public ones.
 *
 * `/app`, `/login`, `/signup` and `/authorize` stay out: the first is behind a
 * session and the rest are steps, not destinations. `robots.ts` already refuses
 * `/app/`, so listing it here would be two files disagreeing.
 *
 * The docs are listed on this origin rather than on `docs.elliptic.sh`. Both
 * hostnames serve the same pages — the middleware rewrites the docs host onto
 * `/docs` — and a sitemap may only speak for the host that serves it. These are
 * the URLs this file's own origin answers, so these are the ones it may claim.
 *
 * The four feature pages were missing until now, and every docs page with them.
 */
const MARKETING_PATHS = [
  "/",
  "/about",
  "/projects",
  "/meetings",
  "/notes",
  "/activity",
  "/contact",
  "/blog",
  "/changelog",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries = MARKETING_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
  }));

  const postEntries = POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(`${post.date}T00:00:00Z`),
  }));

  const docEntries = ORDERED_SLUGS.map((slug) => ({
    url: `${SITE_URL}${hrefForSlug(slug)}`,
    lastModified: now,
  }));

  return [...staticEntries, ...postEntries, ...docEntries];
}
