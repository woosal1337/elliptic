import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { DeepDive } from "@/components/marketing/deep-dive";
import { NowGrid } from "@/components/marketing/now-grid";
import { SceneStrip } from "@/components/marketing/scene-strip";
import { FinalCTA } from "@/components/marketing/final-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: { absolute: "Elliptic · Jira for your agents" },
  description:
    "Jira for your agents. Boards, tasks, and sprints your AI agents run over a built-in MCP server, with meetings, notes, and a full activity log. Every AI feature runs on your own model key.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Elliptic · Jira for your agents",
    description:
      "Boards, tasks, and sprints your agents run, with meetings, notes, and an activity log. Bring your own OpenAI or Anthropic key.",
    url: "/",
    type: "website",
    siteName: "Elliptic",
    images: ["/opengraph-image"],
  },
};

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Elliptic",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: ["https://github.com/woosal1337/elliptic", "https://x.com/woosal1337"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Elliptic",
    url: SITE_URL,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <LogoCloud />
        <DeepDive />
        <NowGrid />
        <SceneStrip />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
