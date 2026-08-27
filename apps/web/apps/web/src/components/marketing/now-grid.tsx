import {
  Blueprint,
  Container,
  IsoCubes,
  IsoFan,
  IsoStack,
  Section,
  SectionNumber,
  WireMesh,
  cn,
} from "@elliptic/ui";

type NowFigure = "stack" | "mesh" | "cubes" | "fan";

interface NowEntry {
  figureLabel: string;
  figure: NowFigure;
  title: string;
  description: string;
  author: string;
  date: string;
}

const FIGURES: Record<NowFigure, React.ReactNode> = {
  stack: <IsoStack className="size-full" />,
  mesh: <WireMesh className="size-full" />,
  cubes: <IsoCubes className="size-full" />,
  fan: <IsoFan className="size-full" />,
};

const ENTRIES: NowEntry[] = [
  {
    figureLabel: "FIG 4.1",
    figure: "stack",
    title: "Ask-the-meeting runs on your key",
    description:
      "Every transcript answer now executes on your org's own model key. Cost and data stay where they belong, never a shared pool.",
    author: "Vera",
    date: "May 28, 2026",
  },
  {
    figureLabel: "FIG 4.2",
    figure: "mesh",
    title: "Activity that compounds context",
    description:
      "A single timeline threads tasks, meetings, and decisions. Open any item and the surrounding history is already there.",
    author: "Idris",
    date: "May 21, 2026",
  },
  {
    figureLabel: "FIG 4.3",
    figure: "cubes",
    title: "Board drag-and-drop, reworked",
    description:
      "Reordering is now pointer-perfect across statuses and lanes. Stable task identifiers survive every move and every regroup.",
    author: "Mara",
    date: "May 14, 2026",
  },
  {
    figureLabel: "FIG 4.4",
    figure: "fan",
    title: "Summaries that capture decisions",
    description:
      "The summarizer was retuned to surface what was decided and who owns it, instead of replaying the full conversation back.",
    author: "Soren",
    date: "May 7, 2026",
  },
  {
    figureLabel: "FIG 4.5",
    figure: "stack",
    title: "Per-org keys, rotated live",
    description:
      "Swap or rotate an OpenAI or Anthropic key with no downtime. In-flight summaries finish on the key they started on.",
    author: "Vera",
    date: "Apr 30, 2026",
  },
  {
    figureLabel: "FIG 4.6",
    figure: "mesh",
    title: "Search across every surface",
    description:
      "One query now spans projects, transcripts, and people. Results carry the identifier so a conversation can point straight back.",
    author: "Idris",
    date: "Apr 23, 2026",
  },
];

function NowCard({ entry }: { entry: NowEntry }) {
  return (
    <article
      className={cn(
        "group flex flex-col gap-5 rounded-xl border border-transparent p-2 transition-[translate,border-color] duration-300 ease-out",
        "hover:-translate-y-1 hover:border-border-strong"
      )}
    >
      <Blueprint
        label={entry.figureLabel}
        className="transition-colors duration-300 group-hover:border-border-strong"
      >
        {FIGURES[entry.figure]}
      </Blueprint>
      <div className="flex flex-col gap-2 px-1">
        <h3 className="text-balance font-display text-h4 text-foreground">{entry.title}</h3>
        <p className="line-clamp-2 text-pretty text-small text-muted-foreground">
          {entry.description}
        </p>
        <p className="mt-2 font-mono text-caption text-muted-foreground">
          {entry.author} · {entry.date}
        </p>
      </div>
    </article>
  );
}

export function NowGrid() {
  return (
    <Section id="now" spacing="xl" className="bg-canvas">
      <Container>
        <div className="flex max-w-2xl flex-col gap-5">
          <SectionNumber index="3.0" label="Now" href="#now" />
          <h2 className="text-balance font-display text-h1 text-foreground">
            <b className="font-display">Built in the open. </b>
            <span className="text-muted-foreground">Small, dated, traceable.</span>
          </h2>
          <p className="text-pretty text-body text-muted-foreground">
            The changelog we ship against. Every release traces back to the surface it touched.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {ENTRIES.map((entry) => (
            <NowCard key={entry.figureLabel} entry={entry} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
