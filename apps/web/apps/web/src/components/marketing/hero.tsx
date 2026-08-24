import Link from "next/link";
import { linkProps } from "@/lib/analytics";
import {
  BrowserFrame,
  Button,
  Container,
  IsoStack,
  Section,
  SectionNumber,
} from "@elliptic/ui";
import { ArrowRight } from "lucide-react";
import { ProductMockup } from "./product-mockup";

export function Hero() {
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
        <div className="flex max-w-3xl flex-col items-start text-left">
          <SectionNumber index="0.0" label="Agent-native" />
          <h1 className="mt-7 max-w-3xl text-pretty text-two-tone font-display text-hero">
            <b>Jira</b> for your agents.
          </h1>
          <p className="mt-6 max-w-md text-lead text-muted-foreground">
            Boards, tasks, and sprints your agents run alongside your team.
            Every decision keeps its context, and AI runs on your own key.
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="primary" size="xl">
              <Link href="/signup" {...linkProps("/signup", "hero")}>
                Start free
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="xl">
              <Link href="#how-it-works" {...linkProps("#how-it-works", "hero")}>
                See how it works
              </Link>
            </Button>
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 top-24 hidden size-40 text-border-strong lg:block">
          <IsoStack className="size-full" />
        </div>

        <div className="relative mt-20 mask-fade-b sm:mt-24">
          <div className="relative -mr-6 overflow-hidden md:-mr-16 lg:-mr-32 xl:-mr-48">
            <BrowserFrame
              url="app.elliptic.com/q3-platform"
              className="w-full min-w-[64rem] border-border-strong shadow-xl"
            >
              <ProductMockup />
            </BrowserFrame>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-vignette"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
