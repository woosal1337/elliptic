import * as React from "react";
import Link from "next/link";
import {
  Blueprint,
  Button,
  Container,
  FeatureCard,
  Section,
  SectionNumber,
  StatBlock,
  cn,
} from "@elliptic/ui";
import { ArrowRight, Check } from "lucide-react";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";

interface CtaLink {
  label: string;
  href: string;
}

export function FeaturePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function FeatureHero({
  index,
  eyebrow,
  titleLead,
  titleRest,
  lede,
  primary,
  secondary,
  visual,
}: {
  index: string;
  eyebrow: string;
  titleLead: string;
  titleRest: string;
  lede: string;
  primary?: CtaLink;
  secondary?: CtaLink;
  visual?: React.ReactNode;
}) {
  return (
    <Section spacing="xl" className="relative overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-hero-glow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-dot-grid mask-fade-b opacity-40"
      />
      <Container className="relative">
        <div className="flex max-w-3xl flex-col items-start">
          <SectionNumber index={index} label={eyebrow} />
          <h1 className="mt-7 text-pretty text-display font-display text-foreground">
            <b className="font-display">{titleLead} </b>
            <span className="text-muted-foreground">{titleRest}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lead text-muted-foreground">{lede}</p>
          {primary || secondary ? (
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {primary ? (
                <Button asChild variant="primary" size="xl">
                  <Link href={primary.href}>
                    {primary.label}
                    <ArrowRight />
                  </Link>
                </Button>
              ) : null}
              {secondary ? (
                <Button asChild variant="ghost" size="xl">
                  <Link href={secondary.href}>{secondary.label}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {visual ? (
          <div className="relative mt-20 mask-fade-b sm:mt-24">
            <div className="relative -mr-6 overflow-hidden md:-mr-16 lg:-mr-32 xl:-mr-48">{visual}</div>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}

export function FeatureSpecs({
  specs,
}: {
  specs: { value: React.ReactNode; label: React.ReactNode; hint?: React.ReactNode }[];
}) {
  return (
    <Section spacing="md" className="border-y border-border bg-surface">
      <Container>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {specs.map((s, i) => (
            <StatBlock key={i} value={s.value} label={s.label} hint={s.hint} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function Checklist({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {points.map((point) => (
        <li key={point} className="flex items-start gap-2.5 text-small">
          <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-foreground">{point}</span>
        </li>
      ))}
    </ul>
  );
}

export interface FeatureRowData {
  index: string;
  label: string;
  titleLead: string;
  titleRest: string;
  description: string;
  points: string[];
  visual: React.ReactNode;
  figure?: React.ReactNode;
  figureLabel?: string;
}

function FeatureRow({ row, position }: { row: FeatureRowData; position: number }) {
  const bleedRight = position % 2 === 0;
  return (
    <article className="flex flex-col gap-12">
      <header className="grid items-start gap-x-12 gap-y-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <SectionNumber index={row.index} label={row.label} />
          <h3 className="text-pretty text-h1 font-display text-foreground">
            <b className="font-display">{row.titleLead} </b>
            <span className="text-muted-foreground">{row.titleRest}</span>
          </h3>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5 lg:pt-12">
          <p className="max-w-prose text-pretty text-body text-muted-foreground">{row.description}</p>
          <Checklist points={row.points} />
        </div>
      </header>
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div
          className={cn("relative lg:col-span-9", bleedRight ? "lg:order-1" : "lg:order-2")}
        >
          <div className="relative overflow-hidden rounded-2xl">{row.visual}</div>
        </div>
        {row.figure ? (
          <div className={cn("lg:col-span-3", bleedRight ? "lg:order-2" : "lg:order-1")}>
            <Blueprint label={row.figureLabel ?? "FIG"}>{row.figure}</Blueprint>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function FeatureRowsSection({
  index,
  eyebrow,
  titleLead,
  titleRest,
  intro,
  rows,
}: {
  index: string;
  eyebrow: string;
  titleLead: string;
  titleRest: string;
  intro?: string;
  rows: FeatureRowData[];
}) {
  return (
    <Section spacing="xl" className="bg-canvas">
      <Container>
        <div className="flex max-w-3xl flex-col gap-6">
          <SectionNumber index={index} label={eyebrow} />
          <h2 className="text-pretty text-display font-display text-foreground">
            <b className="font-display">{titleLead} </b>
            <span className="text-muted-foreground">{titleRest}</span>
          </h2>
          {intro ? (
            <p className="max-w-xl text-pretty text-body text-muted-foreground">{intro}</p>
          ) : null}
        </div>
        <div className="mt-24 flex flex-col gap-32 sm:gap-40">
          {rows.map((row, position) => (
            <FeatureRow key={row.index} row={row} position={position} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function FeatureSection({
  id,
  index,
  eyebrow,
  titleLead,
  titleRest,
  intro,
  children,
  tone = "canvas",
}: {
  id?: string;
  index: string;
  eyebrow: string;
  titleLead: string;
  titleRest: string;
  intro?: string;
  children: React.ReactNode;
  tone?: "canvas" | "surface";
}) {
  return (
    <Section id={id} spacing="xl" className={tone === "surface" ? "border-y border-border bg-surface" : "bg-canvas"}>
      <Container>
        <div className="flex max-w-3xl flex-col gap-6">
          <SectionNumber index={index} label={eyebrow} />
          <h2 className="text-pretty text-h1 font-display text-foreground">
            <b className="font-display">{titleLead} </b>
            <span className="text-muted-foreground">{titleRest}</span>
          </h2>
          {intro ? (
            <p className="max-w-xl text-pretty text-body text-muted-foreground">{intro}</p>
          ) : null}
        </div>
        <div className="mt-14">{children}</div>
      </Container>
    </Section>
  );
}

export function FeatureGrid({
  items,
}: {
  items: { title: string; description: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <FeatureCard key={item.title} icon={item.icon} title={item.title} description={item.description} />
      ))}
    </div>
  );
}

export function CodeShowcase({
  caption,
  code,
}: {
  caption: string;
  code: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-elevated shadow-xl">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <span className="size-3 rounded-full bg-danger/50" aria-hidden="true" />
        <span className="size-3 rounded-full bg-warning/50" aria-hidden="true" />
        <span className="size-3 rounded-full bg-success/50" aria-hidden="true" />
        <span className="ml-3 font-mono text-mono-label text-muted-foreground">
          {caption}
        </span>
      </div>
      <pre className="overflow-x-auto p-6 font-mono text-small leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
