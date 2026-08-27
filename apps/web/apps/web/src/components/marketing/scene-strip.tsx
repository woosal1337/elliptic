import Image from "next/image";
import { Container, Section, SectionNumber, cn } from "@elliptic/ui";

interface Scene {
  src: string;
  eyebrow: string;
  outcome: string;
}

const SCENES: Scene[] = [
  {
    src: "/scenes/scene-1-signal.webp",
    eyebrow: "Signal",
    outcome: "See what changed before it reaches you.",
  },
  {
    src: "/scenes/scene-3-coordinate.webp",
    eyebrow: "Coordinate",
    outcome: "One board your agents and team read the same way.",
  },
  {
    src: "/scenes/scene-4-build.webp",
    eyebrow: "Build",
    outcome: "Decisions keep their context as work ships.",
  },
  {
    src: "/scenes/scene-5-scale.webp",
    eyebrow: "Scale",
    outcome: "The system holds as the team grows.",
  },
];

function SceneFrame({ scene, className }: { scene: Scene; className?: string }) {
  return (
    <figure
      className={cn(
        "group relative isolate aspect-[4/5] overflow-hidden rounded-xl border border-border bg-background",
        className
      )}
    >
      <Image
        src={scene.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 22vw, 45vw"
        draggable={false}
        className="select-none object-cover opacity-90 transition-[opacity,transform] duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grain opacity-20 mix-blend-soft-light"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas via-canvas/40 to-transparent"
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
        <span className="font-mono text-mono-label text-bold">
          {scene.eyebrow}
        </span>
        <span className="text-balance text-small font-medium text-foreground">{scene.outcome}</span>
      </figcaption>
    </figure>
  );
}

export function SceneStrip() {
  return (
    <Section spacing="lg" className="relative overflow-hidden bg-canvas">
      <Container className="relative">
        <div className="flex max-w-2xl flex-col items-start">
          <SectionNumber index="2.5" label="From signal to scale" />
          <h2 className="mt-6 text-balance font-display text-h1 text-foreground">
            The arc of one decision, end to end.
          </h2>
          <p className="mt-4 max-w-md text-body text-muted-foreground">
            A raised concern becomes a tracked decision, a shipped change, and a
            system that still reads clearly at scale.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {SCENES.map((scene) => (
            <SceneFrame key={scene.src} scene={scene} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
