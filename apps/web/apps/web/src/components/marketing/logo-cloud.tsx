import { Container, Section, SectionNumber, cn } from "@elliptic/ui";

interface Integration {
  name: string;
}

const INTEGRATIONS: Integration[] = [
  { name: "OpenAI" },
  { name: "Anthropic" },
  { name: "Folio" },
  { name: "Slack" },
  { name: "GitHub" },
  { name: "Notion" },
];

export function LogoCloud() {
  return (
    <Section spacing="lg" reveal>
      <Container>
        <SectionNumber index="0.1" label="Works with your stack" />
        <p className="mt-4 max-w-xl text-small text-muted-foreground">
          Elliptic plugs into the tools your team already runs on. Bring your own model key and
          connect the surfaces where work happens.
        </p>
        <div className="mt-12 mask-fade-edges">
          <ul className="flex flex-wrap items-center gap-x-12 gap-y-6 sm:gap-x-16">
            {INTEGRATIONS.map((integration) => (
              <li key={integration.name}>
                <span
                  className={cn(
                    "font-display text-h4 font-semibold tracking-tight text-muted-foreground transition-colors",
                    "hover:text-foreground"
                  )}
                >
                  {integration.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
