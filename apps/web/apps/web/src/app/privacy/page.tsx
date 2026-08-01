import { pageMetadata } from "@/lib/seo";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Blocks } from "@/app/docs/_components/blocks";
import type { DocBlock } from "@/app/docs/_content/types";

export const metadata = pageMetadata({
  title: "Privacy",
  description:
    "How Elliptic handles your data. Open source and self-hostable by default, bring-your-own-key, and nothing leaves your own infrastructure.",
  path: "/privacy",
});

const BLOCKS: DocBlock[] = [
  { type: "p", text: "Last updated 28 June 2026." },
  {
    type: "p",
    text: "Elliptic is open source and self-hostable. This policy explains how data is handled when you run your own instance, and what the hosted instance at [company.chele.bi](https://company.chele.bi) collects. The Elliptic software is licensed under [Apache-2.0](https://github.com/woosal1337/elliptic/blob/main/LICENSE).",
  },
  { type: "h2", text: "Self-hosted deployments" },
  {
    type: "p",
    text: "When you run Elliptic on your own infrastructure, everything you create stays in your own Postgres database on your own servers. Projects, tasks, meetings, notes, files, and model keys never reach us. You are the data controller, and this page is a reference for your own users rather than a contract with us.",
  },
  { type: "h2", text: "What the hosted instance collects" },
  {
    type: "ul",
    items: [
      "Your name, email, and organization membership.",
      "The work you create, from projects and tasks to meetings, notes, and comments, and the activity and audit events they generate.",
      "The session cookies and tokens that keep you signed in.",
      "Request and error logs we keep to run the service reliably.",
    ],
  },
  {
    type: "callout",
    variant: "info",
    title: "No tracking",
    text: "There are no third-party advertising or analytics cookies. We do not sell data, and there are no data brokers in the loop.",
  },
  { type: "h2", text: "Your model keys (BYOK)" },
  {
    type: "p",
    text: "AI features run on your own OpenAI or Anthropic key. Keys are encrypted at rest with **AES-256-GCM** under a per-deployment key-encryption key, are never written to logs, and only the last four characters are ever shown back to you. Prompts and completions are sent directly to the provider you configure, under your key, and every AI run is recorded in your own audit log.",
  },
  { type: "h2", text: "Where your data goes" },
  {
    type: "p",
    text: "Beyond your own deployment, data only leaves to services you explicitly configure.",
  },
  {
    type: "ul",
    items: [
      "The AI provider whose key you supply (OpenAI or Anthropic), for AI features only.",
      "Your own S3-compatible object storage, if you enable file uploads.",
      "Your identity provider, if you enable SSO, SCIM, or LDAP.",
    ],
  },
  { type: "h2", text: "Data retention and deletion" },
  {
    type: "p",
    text: "Your data is kept while your account and organization are active. Deleting an organization removes its data. To request an export or deletion, reach us through the [contact page](/contact).",
  },
  { type: "h2", text: "Changes to this policy" },
  {
    type: "p",
    text: "We will post any changes on this page and update the date above.",
  },
  { type: "h2", text: "Contact" },
  {
    type: "p",
    text: "Questions about privacy or your data go to the [contact page](/contact). To report a security issue, follow the [security policy](https://github.com/woosal1337/elliptic/blob/main/SECURITY.md).",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-16 lg:py-24">
          <p className="font-mono text-mono-label uppercase text-muted-foreground">Legal</p>
          <h1 className="mt-3 font-display text-h1 font-semibold tracking-[-0.02em] text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-3 text-lead text-muted-foreground">
            Elliptic is open source and self-hostable. Your data stays on your own
            infrastructure.
          </p>
          <article className="mt-8">
            <Blocks blocks={BLOCKS} />
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
