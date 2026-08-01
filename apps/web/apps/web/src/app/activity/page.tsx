import { BrowserFrame, IsoStack, IsoCubes, IsoFan } from "@elliptic/ui";
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
import { ActivityMockup } from "@/components/marketing/activity-mockup";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata = pageMetadata({
  title: "Activity & live sync",
  description:
    "An append-only activity log on every entity, and a workspace that stays live over server-sent events via Postgres LISTEN/NOTIFY. Notifications, an inbox, and an outbox for webhooks.",
  path: "/activity",
});

const ROWS: FeatureRowData[] = [
  {
    index: "5.2.1",
    label: "Live sync",
    titleLead: "No refresh, no polling.",
    titleRest: "Postgres LISTEN/NOTIFY, fanned out over SSE.",
    description:
      "When a row changes, Postgres NOTIFY wakes the API, which pushes the change to every connected client over server-sent events. The client cache updates in place, so the board and the feed move the instant the work does.",
    points: [
      "Postgres LISTEN/NOTIFY to SSE, with no polling loop",
      "Client caches update in place, not on a timer",
      "One stream behind boards, notes, and inboxes",
    ],
    visual: (
      <BrowserFrame url="app.companyos.com/activity" className="bg-surface shadow-xl">
        <ActivityMockup />
      </BrowserFrame>
    ),
    figure: <IsoFan className="size-full" />,
    figureLabel: "FIG 5.1",
  },
  {
    index: "5.2.2",
    label: "The audit trail",
    titleLead: "Who did what, on every entity.",
    titleRest: "An append-only log you can trust.",
    description:
      "Every create, update, and transition is recorded against the entity it touched, with the actor, human or agent, and the time. The activity log is the audit trail, and it is the durable memory an agent reads when it comes back to work.",
    points: [
      "Append-only activity on every entity",
      "Actor attribution for people and agents alike",
      "The record an agent reads to resume where it left off",
    ],
    visual: (
      <CodeShowcase
        caption="activity.json"
        code={`{
  "entity":  "task:DEMO-42",
  "verb":    "status.transitioned",
  "actor":   "agent:release-bot",
  "from":    "in_progress",
  "to":      "done",
  "at":      "2026-06-28T09:14:22Z"
}`}
      />
    ),
    figure: <IsoStack className="size-full" />,
    figureLabel: "FIG 5.2",
  },
  {
    index: "5.2.3",
    label: "It finds you",
    titleLead: "The right change reaches the right person.",
    titleRest: "An inbox, notifications, and an outbox for webhooks.",
    description:
      "Mentions and assignments raise notifications and fill an inbox. An outbox backbone delivers the same changes to your webhooks, reliably and in order, so the systems outside Elliptic stay in step too.",
    points: [
      "Notifications and an inbox that track what is yours",
      "An outbox backbone for reliable webhook delivery",
      "Favorites and full-text search across everything",
    ],
    visual: (
      <CodeShowcase
        caption="event stream"
        code={`event: task.updated
data: { "id": "DEMO-42", "status": "done" }

event: notification
data: { "to": "ada", "task": "DEMO-42",
        "reason": "mention" }`}
      />
    ),
    figure: <IsoCubes className="size-full" />,
    figureLabel: "FIG 5.3",
  },
];

const CAPABILITIES = [
  {
    title: "Live sync over SSE",
    description: "Postgres LISTEN/NOTIFY pushed to clients, so the whole workspace moves in real time.",
  },
  {
    title: "Activity log",
    description: "An append-only trail on every entity, attributing each change to a person or an agent.",
  },
  {
    title: "Notifications and inbox",
    description: "Mentions and assignments surface in a notifications inbox that tracks what is yours.",
  },
  {
    title: "Webhooks and outbox",
    description: "An outbox backbone delivers events to your webhooks reliably, in order, with retries.",
  },
  {
    title: "Full-text search",
    description: "Search across tasks, notes, meetings, and people from one box.",
  },
  {
    title: "Favorites and stickies",
    description: "Pin the work you care about and keep quick notes close, per person.",
  },
];

export default function ActivityPage() {
  return (
    <FeaturePageShell>
      <FeatureHero
        index="5.1"
        eyebrow="Activity & live sync"
        titleLead="Watch the work happen,"
        titleRest="as the agents and the team do it."
        lede="Every change to every entity lands in an append-only activity log, and the whole workspace stays live over server-sent events. The board moves, the inbox fills, and the audit trail writes itself."
        primary={{ label: "Start free", href: "/signup" }}
        secondary={{ label: "Read the docs", href: "https://docs.elliptic.sh/activity-calendar-inbox" }}
        visual={
          <BrowserFrame
            url="app.companyos.com/activity"
            className="w-full min-w-[64rem] border-border-strong shadow-xl"
          >
            <ActivityMockup />
          </BrowserFrame>
        }
      />

      <FeatureSpecs
        specs={[
          { value: "NOTIFY", label: "Postgres to SSE, no polling" },
          { value: "Append", label: "Only audit trail, every entity" },
          { value: "Inbox", label: "Notifications that find you" },
          { value: "Outbox", label: "Reliable events for webhooks" },
        ]}
      />

      <FeatureRowsSection
        index="5.2"
        eyebrow="How it works"
        titleLead="A workspace that never goes stale."
        titleRest="Live sync, an audit trail, and events that travel."
        intro="Here is what each part looks like in practice."
        rows={ROWS}
      />

      <FeatureSection
        index="5.3"
        eyebrow="Capabilities"
        titleLead="The pulse of the company,"
        titleRest="recorded and delivered, not left to chance."
        tone="surface"
      >
        <FeatureGrid items={CAPABILITIES} />
      </FeatureSection>

      <FeatureSection
        index="5.4"
        eyebrow="For agents"
        titleLead="Activity is an agent's memory."
        titleRest="It reads the log to know what changed since."
        intro="Between runs, an agent reads the activity log over MCP to catch up on everything that moved, then picks up exactly where the work left off."
      >
        <CodeShowcase
          caption="company-brain MCP"
          code={`brain_changes_since(cursor="2026-06-28T08:00Z")
# -> everything that moved across the org

get_entity_activity(entity="task:DEMO-42")
list_notifications(unread=true)`}
        />
      </FeatureSection>

      <FinalCTA />
    </FeaturePageShell>
  );
}
