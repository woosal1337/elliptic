import type { ReactNode } from "react";
import { Bug, MessagesSquare, ShieldCheck, AtSign, ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { FeaturePageShell, FeatureHero, FeatureSection } from "@/components/marketing/feature-page";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with Elliptic. Questions and ideas, bug reports, and security disclosures, all in the open on GitHub.",
  path: "/contact",
});

function ContactLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-xs transition-colors duration-150 hover:border-input"
    >
      <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground [&_svg]:size-5">
        {icon}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="flex items-center gap-1.5 text-h4 text-foreground">
          {title}
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </h3>
        <p className="text-small leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}

export default function ContactPage() {
  return (
    <FeaturePageShell>
      <FeatureHero
        index="0.1"
        eyebrow="Contact"
        titleLead="Built in the open,"
        titleRest="so the best ways to reach us are public."
        lede="Questions, bugs, and security disclosures, all on GitHub. Pick whichever fits, and you will not be talking to a contact form."
        primary={{ label: "Open a discussion", href: "https://github.com/woosal1337/elliptic/discussions" }}
        secondary={{ label: "Report a bug", href: "https://github.com/woosal1337/elliptic/issues" }}
      />

      <FeatureSection
        index="0.2"
        eyebrow="Reach us"
        titleLead="Four ways in,"
        titleRest="each one public and on the record."
        tone="surface"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <ContactLink
            href="https://github.com/woosal1337/elliptic/discussions"
            icon={<MessagesSquare aria-hidden="true" />}
            title="Questions and ideas"
            description="Open a thread in GitHub Discussions for product questions, ideas, and general conversation."
          />
          <ContactLink
            href="https://github.com/woosal1337/elliptic/issues"
            icon={<Bug aria-hidden="true" />}
            title="Bugs and features"
            description="File an issue with steps to reproduce and the version or commit you are on. Feature requests welcome too."
          />
          <ContactLink
            href="https://github.com/woosal1337/elliptic/blob/main/SECURITY.md"
            icon={<ShieldCheck aria-hidden="true" />}
            title="Security"
            description="Report vulnerabilities privately through the repository's Security tab, as described in the security policy."
          />
          <ContactLink
            href="https://x.com/woosal1337"
            icon={<AtSign aria-hidden="true" />}
            title="Updates"
            description="Follow along on X, and read the story behind Elliptic on the blog."
          />
        </div>
      </FeatureSection>

      <FinalCTA />
    </FeaturePageShell>
  );
}
