"use client";

import Link from "next/link";
import { Logo, MarketingNav, type NavLink as NavLinkType } from "@elliptic/ui";
import { linkProps } from "@/lib/analytics";

const NAV_LINKS: NavLinkType[] = [
  { label: "Product", href: "/#how-it-works" },
  { label: "Docs", href: "https://docs.elliptic.sh" },
  { label: "Now", href: "/#now" },
  { label: "Contact", href: "/contact" },
];

export function SiteNav() {
  return (
    <MarketingNav
      brand={
        <Link href="/" aria-label="Elliptic home" className="flex items-center">
          <Logo />
        </Link>
      }
      links={NAV_LINKS}
      /*
       * The nav renders its own log-in and sign-up through this callback, so
       * attaching the tracking attributes here covers those two as well as the
       * links above — and covers the mobile menu, which renders the same set a
       * second time. Nothing in @elliptic/ui has to know about analytics.
       */
      renderLink={(link) =>
        /^https?:\/\//.test(link.href) ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            {...linkProps(link.href, "nav")}
          >
            {link.label}
          </a>
        ) : (
          <Link href={link.href} {...linkProps(link.href, "nav")}>
            {link.label}
          </Link>
        )
      }
      loginHref="/login"
      signupHref="/signup"
    />
  );
}
