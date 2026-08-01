import type { ReactNode } from "react";
import Link from "next/link";
import { cn, Container, Logo } from "@companyos/ui";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  index: string;
  heading: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    index: "01",
    heading: "Product",
    links: [
      { label: "Projects", href: "/projects" },
      { label: "Meetings", href: "/meetings" },
      { label: "Notes", href: "/notes" },
      { label: "Activity", href: "/activity" },
    ],
  },
  {
    index: "02",
    heading: "Features",
    links: [
      { label: "BYOK", href: "https://docs.company.chele.bi/ai-byok-assistant" },
      { label: "Board", href: "https://docs.company.chele.bi/workflows-statuses-transitions" },
      { label: "Transcripts", href: "https://docs.company.chele.bi/meetings" },
      { label: "Activity log", href: "https://docs.company.chele.bi/activity-calendar-inbox" },
    ],
  },
  {
    index: "03",
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    index: "04",
    heading: "Resources",
    links: [
      { label: "Docs", href: "https://docs.company.chele.bi" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    index: "05",
    heading: "Connect",
    links: [
      { label: "X (Twitter)", href: "https://x.com/woosal1337" },
      { label: "GitHub", href: "https://github.com/woosal1337/companyos" },
    ],
  },
];

const LEGAL: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const linkClass =
  "inline-flex items-center gap-2 text-small text-muted-foreground transition-colors duration-150 hover:text-foreground";

const legalClass =
  "text-caption text-muted-foreground transition-colors duration-150 hover:text-foreground";

const isExternal = (href: string) => /^https?:\/\//.test(href);

function FooterLinkItem({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-canvas">
      <Container className="py-20">
        <div className="flex flex-col gap-16 lg:flex-row lg:justify-between">
          <div className="flex max-w-xs flex-col gap-4">
            <Logo />
            <p className="text-small text-muted-foreground">
              Jira for your agents. Boards, tasks, meetings, and AI agents on your own
              key.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-16">
            {COLUMNS.map((column) => (
              <div key={column.heading} className="flex flex-col gap-4">
                <p className="flex items-center gap-2 font-mono text-mono-label uppercase text-muted-foreground">
                  <span className="text-foreground/50">{column.index}</span>
                  <span>{column.heading}</span>
                </p>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <FooterLinkItem href={link.href} className={linkClass}>
                        {link.label}
                      </FooterLinkItem>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-6">
            {LEGAL.map((link) => (
              <FooterLinkItem key={link.href} href={link.href} className={cn(legalClass)}>
                {link.label}
              </FooterLinkItem>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">© 2026 Elliptic</p>
        </div>
      </Container>
    </footer>
  );
}
