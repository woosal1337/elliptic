import { BrowserFrame, IsoStack, IsoCubes } from "@elliptic/ui";
import { pageMetadata } from "@/lib/seo";
import {
  FeaturePageShell,
  FeatureHero,
  FeatureSpecs,
  FeatureRowsSection,
  FeatureSection,
  FeatureGrid,
  CodeShowcase,
  type FeatureRowData,
} from "@/components/marketing/feature-page";
import { ProductMockup } from "@/components/marketing/product-mockup";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata = pageMetadata({
  title: "Projects & tasks",
  description:
    "Linear-style projects and tasks with stable identifiers, List, Board, and Table views, sub-tasks, labels, priorities, epics, and per-team workflow states. Your agents run the same board your team does.",
  path: "/projects",
});

const ROWS: FeatureRowData[] = [
  {
    index: "2.2.1",
    label: "The board",
    titleLead: "Backlog to done,",
    titleRest: "moving as fast as the agents and the team behind it.",
    description:
      "Drag tasks across statuses on a Kanban board, or switch to a dense List or a spreadsheet-style Table over the same data. Set priority and assignees, group by label, and every change lands for everyone the moment it happens.",
    points: [
      "List, Board, and Table views over one model",
      "Statuses from backlog to in-progress, in-review, and done",
      "Sub-tasks, labels, priorities, and assignees in sync",
    ],
    visual: (
      <BrowserFrame url="app.elliptic.com/q3-platform" className="bg-surface shadow-xl">
        <ProductMockup />
      </BrowserFrame>
    ),
    figure: <IsoStack className="size-full" />,
    figureLabel: "FIG 2.1",
  },
  {
    index: "2.2.2",
    label: "Stable identity",
    titleLead: "Every task has a name everything points at.",
    titleRest: "DEMO-42 today, DEMO-42 forever.",
    description:
      "Each project owns a key, and every task gets the next number from a per-organization counter, claimed under a row lock so two tasks can never collide. A meeting, a comment, a webhook, or an agent can reference DEMO-42 and always resolve the same work.",
    points: [
      "Stable, human-readable identifiers per project",
      "Allocated with SELECT FOR UPDATE, so numbers never clash",
      "Referenced from meetings, comments, and agents alike",
    ],
    visual: (
      <CodeShowcase
        caption="task.json"
        code={`{
  "identifier": "DEMO-42",
  "title":      "Ship the 1.0 rewrite",
  "status":     "in_progress",
  "priority":   "high",
  "assignee":   "ada@acme.com",
  "labels":     ["launch", "p0"],
  "estimate":   "5"
}

// the number is claimed atomically, per org:
//   SELECT last_number FROM project_counters
//     WHERE project_id = $1 FOR UPDATE;`}
      />
    ),
    figure: <IsoCubes className="size-full" />,
    figureLabel: "FIG 2.2",
  },
];

const CAPABILITIES = [
  {
    title: "Three views, one model",
    description: "List, Board (Kanban), and Table render the same tasks. Switch without losing your place.",
  },
  {
    title: "Sub-tasks and dependencies",
    description: "Break work down, roll progress up, and block a task on the ones it waits for.",
  },
  {
    title: "Labels and priorities",
    description: "Tag work with colored labels and order by priority, both filterable in PQL.",
  },
  {
    title: "Workflow statuses",
    description: "Define statuses per team across categories from backlog to done, and gate which transitions are allowed.",
  },
  {
    title: "Epics and relations",
    description: "Group work under an epic, and relate items that block, duplicate, or depend on each other.",
  },
  {
    title: "Saved views and custom fields",
    description: "Save a slice of the board for yourself, your team, or the org, and add the fields you track.",
  },
];

export default function ProjectsPage() {
  return (
    <FeaturePageShell>
      <FeatureHero
        index="2.1"
        eyebrow="Projects & tasks"
        titleLead="Linear-style tasks your agents"
        titleRest="and your team run on one board, in real time."
        lede="Projects, tasks, sub-tasks, and the planning layers above them. Every task carries a stable identifier, so a meeting, a comment, or an agent can point straight at it."
        primary={{ label: "Start free", href: "/signup" }}
        secondary={{ label: "Read the docs", href: "https://docs.elliptic.sh/projects-and-tasks" }}
        visual={
          <BrowserFrame
            url="app.elliptic.com/q3-platform"
            className="w-full min-w-[64rem] border-border-strong shadow-xl"
          >
            <ProductMockup />
          </BrowserFrame>
        }
      />

      <FeatureSpecs
        specs={[
          { value: "DEMO-42", label: "Stable task identifiers" },
          { value: "3", label: "List, Board, and Table views" },
          { value: "0", label: "Global endpoints, every row org-scoped" },
        ]}
      />

      <FeatureRowsSection
        index="2.2"
        eyebrow="How it works"
        titleLead="One board your agents can run."
        titleRest="Stable identity, real views, and a query language underneath."
        intro="Here is what each part looks like in practice."
        rows={ROWS}
      />

      <FeatureSection
        index="2.3"
        eyebrow="Capabilities"
        titleLead="Everything a tracker needs,"
        titleRest="and nothing an agent has to be told twice."
        tone="surface"
      >
        <FeatureGrid items={CAPABILITIES} />
      </FeatureSection>

      <FeatureSection
        index="2.4"
        eyebrow="For agents"
        titleLead="Agents operate the board over MCP."
        titleRest="The same tasks, the same statuses, scoped to one org."
        intro="An agent connects once over OAuth and gets the whole task surface as callable tools. It creates work, moves it, and closes it out, and your team sees every change live."
      >
        <CodeShowcase
          caption="company-brain MCP"
          code={`# an agent creates and moves real work
create_task(project="DEMO", title="Ship the 1.0 rewrite",
            priority="high", labels=["launch"])
# -> { "identifier": "DEMO-42", "status": "backlog" }

transition_task_status(task="DEMO-42", status="in_progress")
add_comment(task="DEMO-42", body="Tag pushed, CI is green.")
transition_task_status(task="DEMO-42", status="done")`}
        />
      </FeatureSection>

      <FinalCTA />
    </FeaturePageShell>
  );
}
