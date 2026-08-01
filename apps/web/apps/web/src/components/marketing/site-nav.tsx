"use client";

import Link from "next/link";
import { Logo, MarketingNav, type NavLink as NavLinkType } from "@companyos/ui";

const NAV_LINKS: NavLinkType[] = [
  { label: "Product", href: "/#how-it-works" },
  { label: "Docs", href: "https://docs.company.chele.bi" },
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
      renderLink={(link) =>
        /^https?:\/\//.test(link.href) ? (
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ) : (
          <Link href={link.href}>{link.label}</Link>
        )
      }
      loginHref="/login"
      signupHref="/signup"
    />
  );
}
