import * as React from "react";
import {
  Blueprint,
  BrowserFrame,
  Container,
  IsoCubes,
  IsoFan,
  IsoStack,
  Section,
  SectionNumber,
  cn,
} from "@companyos/ui";
import { Check } from "lucide-react";
import { ProductMockup } from "./product-mockup";
import { MeetingMockup } from "./meeting-mockup";
import { ByokMockup } from "./byok-mockup";

interface DeepDiveRow {
  index: string;
  label: string;
  href: string;
  lead: string;
  rest: string;
  description: string;
  points: string[];
  url: string;
  figureLabel: string;
  figure: React.ReactNode;
  visual: React.ReactNode;
}

const ROWS: DeepDiveRow[] = [
  {
    index: "1.1",
    label: "Plan",
    href: "#how-it-works",
    lead: "Run the work on one board.",
    rest: "Backlog to done, moving as fast as the agents and team behind it.",
    description:
      "Drag tasks across statuses, set priority and assignees, and group with labels. Every task carries a stable identifier, so any conversation can point straight at it.",
    points: [
      "Backlog to done, with in-progress and in-review in between",
      "Per-org projects with their own key and members",
      "Priorities, labels, and assignees that stay in sync",
    ],
    url: "app.companyos.com/q3-platform",
    figureLabel: "FIG 0.2",
    figure: <IsoStack className="size-full" />,
    visual: <ProductMockup />,
  },
  {
    index: "1.2",
    label: "Meet",
    href: "#how-it-works",
    lead: "Every meeting becomes an answer.",
    rest: "A transcript, a summary, and a chat that knows what was said.",
    description:
      "Import a recording from the Folio recorder and Elliptic keeps the transcript, generates a summary, and lets anyone ask the meeting a question in plain language.",
    points: [
      "Speaker-attributed, timestamped transcripts",
      "AI summaries that capture the decisions, not the noise",
      "Ask-the-meeting chat grounded in the transcript",
    ],
    url: "app.companyos.com/meetings/weekly-sync",
    figureLabel: "FIG 0.3",
    figure: <IsoFan className="size-full" />,
    visual: <MeetingMockup />,
  },
  {
    index: "1.3",
    label: "Bring your key",
    href: "#how-it-works",
    lead: "Your AI runs on your key.",
    rest: "Never a shared pool, never our account, never a surprise on the bill.",
    description:
      "Connect your organization's OpenAI or Anthropic key once. Every summary and every chat reply executes on that key, so cost and data control stay with you.",
    points: [
      "Per-org OpenAI and Anthropic keys",
      "Set a default and rotate without downtime",
      "Usage attributed to your account, not ours",
    ],
    url: "app.companyos.com/settings/ai",
    figureLabel: "FIG 0.4",
    figure: <IsoCubes className="size-full" />,
    visual: <ByokMockup />,
  },
];

function Checklist({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {points.map((point) => (
        <li key={point} className="flex items-start gap-2.5 text-small text-muted-foreground">
          <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-foreground">{point}</span>
        </li>
      ))}
    </ul>
  );
}

function DeepDiveRowBlock({ row, position }: { row: DeepDiveRow; position: number }) {
  const bleedRight = position % 2 === 0;
  return (
    <article className="flex flex-col gap-12">
      <header className="grid items-start gap-x-12 gap-y-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <SectionNumber index={row.index} label={row.label} href={row.href} />
          <h3 className="text-pretty text-h1 font-display text-foreground">
            <b className="font-display">{row.lead} </b>
            <span className="text-muted-foreground">{row.rest}</span>
          </h3>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5 lg:pt-12">
          <p className="max-w-prose text-pretty text-body text-muted-foreground">
            {row.description}
          </p>
          <Checklist points={row.points} />
        </div>
      </header>

      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div
          className={cn(
            "relative lg:col-span-9",
            bleedRight ? "lg:order-1 lg:-mr-24 xl:-mr-40" : "lg:order-2 lg:-ml-24 xl:-ml-40"
          )}
        >
          <div className="relative overflow-hidden rounded-2xl">
            <BrowserFrame url={row.url} className="bg-surface shadow-xl">
              {row.visual}
            </BrowserFrame>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-vignette mask-fade-edges"
            />
          </div>
        </div>

        <div className={cn("lg:col-span-3", bleedRight ? "lg:order-2" : "lg:order-1")}>
          <Blueprint label={row.figureLabel}>{row.figure}</Blueprint>
        </div>
      </div>
    </article>
  );
}

export function DeepDive() {
  return (
    <Section id="how-it-works" spacing="xl" className="bg-canvas">
      <Container>
        <div className="flex max-w-3xl flex-col gap-6">
          <SectionNumber index="1.0" label="How it works" />
          <h2 className="text-pretty text-display font-display text-foreground">
            <b className="font-display">One workspace your agents can run. </b>
            <span className="text-muted-foreground">
              Three connected surfaces, one coherent model your agents and team share.
            </span>
          </h2>
          <p className="max-w-xl text-pretty text-body text-muted-foreground">
            Here is what each surface looks like in practice.
          </p>
        </div>

        <div className="mt-24 flex flex-col gap-32 sm:gap-40">
          {ROWS.map((row, position) => (
            <DeepDiveRowBlock key={row.index} row={row} position={position} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
