import Link from "next/link";
import { linkProps } from "@/lib/analytics";
import { Button, Container, Section } from "@elliptic/ui";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <Section spacing="xl" reveal className="relative overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[560px] bg-accent-glow mask-fade-radial opacity-25"
      />
      <Container className="relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-balance font-display text-mega text-two-tone">
            <b>Built for the way your agents and team work.</b> Available today.
          </h2>
          <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="xl">
              <Link href="/signup" {...linkProps("/signup", "final-cta")}>
                Start free
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/contact" {...linkProps("/contact", "final-cta")}>
                Talk to us
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
