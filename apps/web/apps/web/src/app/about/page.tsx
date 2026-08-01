import { BrowserFrame } from "@elliptic/ui";
import { pageMetadata } from "@/lib/seo";
import {
  FeaturePageShell,
  FeatureHero,
  FeatureSpecs,
  FeatureSection,
  FeatureGrid,
  CodeShowcase,
} from "@/components/marketing/feature-page";
import { ProductMockup } from "@/components/marketing/product-mockup";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata = pageMetadata({
  title: "About",
  description:
    "Elliptic is an agent-native work platform. Projects, tasks, meetings, and notes where humans and AI agents work together over a built-in MCP server, on your own keys. Open source, multi-tenant, and self-hostable.",
  path: "/about",
});

const WHY = [
  {
    title: "Agents are members",
    description:
      "Not a chatbot on the side. Agents create, move, and close real work over the MCP server, scoped to your organization.",
  },
  {
    title: "A durable environment",
    description:
      "A chat window forgets when it closes. Elliptic persists, so an agent comes back to a board that remembers.",
  },
  {
    title: "Shared with your team",
    description:
      "One invitation hands a teammate or an agent the whole living project, with full history. There is no cold start.",
  },
];

const PILLARS = [
  {
    title: "Multi-tenant isolation",
    description:
      "An org id on every row and no global list endpoints, so a tenant only ever touches its own data.",
  },
  {
    title: "Built-in MCP server",
    description:
      "OAuth 2.1 and about 144 tools at /api/v1/mcp expose the whole workspace to agents.",
  },
  {
    title: "Bring your own key",
    description:
      "Every AI call runs on your OpenAI or Anthropic key, encrypted at rest, with an audit record.",
  },
  {
    title: "Live sync",
    description: "Postgres LISTEN/NOTIFY over SSE keeps every surface moving in real time.",
  },
  {
    title: "Conflict-free co-editing",
    description: "Notes and the wiki edit together on Yjs, a CRDT, with no merge conflicts.",
  },
  {
    title: "Enterprise-ready",
    description: "SSO, SCIM, LDAP, RBAC with audit logs, webhooks, and dashboards out of the box.",
  },
];

export default function AboutPage() {
  return (
    <FeaturePageShell>
      <FeatureHero
        index="1.1"
        eyebrow="About"
        titleLead="Elliptic is Jira for your agents."
        titleRest="An agent-native work platform you run on your own keys."
        lede="Projects, tasks, meetings, and notes in one place, where humans and AI agents work side by side over a built-in MCP server. Open source, multi-tenant, and self-hostable."
        primary={{ label: "Start free", href: "/signup" }}
        secondary={{ label: "View on GitHub", href: "https://github.com/woosal1337/companyos" }}
        visual={
          <BrowserFrame
            url="app.companyos.com/q3-platform"
            className="w-full min-w-[64rem] border-border-strong shadow-xl"
          >
            <ProductMockup />
          </BrowserFrame>
        }
      />

      <FeatureSpecs
        specs={[
          { value: "144", label: "MCP tools over OAuth 2.1" },
          { value: "AES-256-GCM", label: "Model keys encrypted at rest" },
          { value: "1", label: "Postgres and one API container" },
          { value: "Apache-2.0", label: "Open source and self-hostable" },
        ]}
      />

      <FeatureSection
        index="1.2"
        eyebrow="Why it exists"
        titleLead="The busywork of a tracker is agent work."
        titleRest="But agents need somewhere durable to do it."
        intro="Task creation, status updates, and chasing progress are exactly what agents should do. They just need a shared environment that does not forget. Elliptic is that environment."
      >
        <FeatureGrid items={WHY} />
      </FeatureSection>

      <FeatureSection
        index="1.3"
        eyebrow="Architecture"
        titleLead="One coherent system,"
        titleRest="simple to run and safe to hand an agent."
        tone="surface"
        intro="A FastAPI modular monolith over Postgres, with a Next.js web app. One database, two services, and an MCP server built in."
      >
        <FeatureGrid items={PILLARS} />
      </FeatureSection>

      <FeatureSection
        index="1.4"
        eyebrow="Open source"
        titleLead="Run the whole thing yourself."
        titleRest="Apache-2.0, on your own infrastructure."
        intro="Clone it, bring your keys, and the full stack comes up with one command. Built in the open by @woosal1337 and contributors, and your data never leaves a boundary you control."
      >
        <CodeShowcase
          caption="quickstart"
          code={`git clone https://github.com/woosal1337/companyos.git
cd companyos
cp .env.example .env
docker compose up --build

# web on :3000, api on :8000`}
        />
      </FeatureSection>

      <FinalCTA />
    </FeaturePageShell>
  );
}
