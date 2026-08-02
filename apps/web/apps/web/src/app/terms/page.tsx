import { pageMetadata } from "@/lib/seo";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Blocks } from "@/app/docs/_components/blocks";
import type { DocBlock } from "@/app/docs/_content/types";

export const metadata = pageMetadata({
  title: "Terms",
  description:
    "Terms of service for the hosted Elliptic at elliptic.sh. The Elliptic software itself is open source under Apache-2.0.",
  path: "/terms",
});

const BLOCKS: DocBlock[] = [
  { type: "p", text: "Last updated 28 June 2026." },
  {
    type: "p",
    text: "These terms cover use of the hosted Elliptic service at [elliptic.sh](https://elliptic.sh). The Elliptic software itself is open source, and self-hosting it is governed by its license rather than by these terms.",
  },
  { type: "h2", text: "The software license" },
  {
    type: "p",
    text: "Elliptic is licensed under the [Apache License 2.0](https://github.com/woosal1337/elliptic/blob/main/LICENSE). You are free to self-host, modify, and redistribute it under that license. When you run your own instance, these hosted terms do not apply to you.",
  },
  { type: "h2", text: "Acceptable use" },
  { type: "p", text: "When using the hosted service, you agree not to do the following." },
  {
    type: "ul",
    items: [
      "Break the law, or infringe anyone's rights with content you store or generate.",
      "Attack, overload, or probe the service, or attempt to bypass the isolation between organizations.",
      "Resell or expose the service to third parties in a way that abuses shared infrastructure.",
    ],
  },
  { type: "h2", text: "Your account" },
  {
    type: "p",
    text: "You are responsible for your account, the members you invite to your organization, and the model keys and spend you configure. Keep your credentials secure.",
  },
  { type: "h2", text: "Availability and changes" },
  {
    type: "p",
    text: "The hosted service is provided on a reasonable-effort basis. We may add, change, or remove features, and we may suspend access to protect the service or other users.",
  },
  { type: "h2", text: "No warranty" },
  {
    type: "p",
    text: 'The service is provided "as is" and "as available", without warranties of any kind, to the maximum extent permitted by law. This mirrors the disclaimer in the Apache-2.0 license.',
  },
  { type: "h2", text: "Limitation of liability" },
  {
    type: "p",
    text: "To the maximum extent permitted by law, the operator is not liable for any indirect, incidental, or consequential damages, or for loss of data or profits, arising from your use of the service.",
  },
  { type: "h2", text: "Termination" },
  {
    type: "p",
    text: "You can stop using the service at any time. We may suspend or terminate access for breach of these terms.",
  },
  { type: "h2", text: "Governing law" },
  {
    type: "p",
    text: "These terms are governed by the laws of the jurisdiction in which the service operator is established, without regard to conflict-of-law rules.",
  },
  { type: "h2", text: "Contact" },
  {
    type: "p",
    text: "Questions about these terms go to the [contact page](/contact).",
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-16 lg:py-24">
          <p className="font-mono text-mono-label text-muted-foreground">Legal</p>
          <h1 className="mt-3 font-display text-h1 font-semibold tracking-[-0.02em] text-foreground">
            Terms of Service
          </h1>
          <p className="mt-3 text-lead text-muted-foreground">
            For the hosted service. The software itself is open source under Apache-2.0.
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
