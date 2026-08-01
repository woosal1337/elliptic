import { BrowserFrame, IsoStack, IsoFan, WireMesh } from "@companyos/ui";
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
import { NotesMockup } from "@/components/marketing/notes-mockup";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata = pageMetadata({
  title: "Notes & wiki",
  description:
    "Docs and a company wiki with live, multi-cursor co-editing on Yjs, conflict-free over a realtime relay. Link notes to tasks, people, and pages with mentions and backlinks.",
  path: "/notes",
});

const ROWS: FeatureRowData[] = [
  {
    index: "4.2.1",
    label: "Co-editing",
    titleLead: "Many cursors, one document.",
    titleRest: "No merge conflicts, ever.",
    description:
      "Co-editing runs on Yjs, a CRDT, over a realtime relay that lives next to the API. Everyone sees everyone's cursor and edits as they happen, and concurrent changes merge without a conflict, even after a spell offline.",
    points: [
      "Conflict-free editing on a CRDT (Yjs)",
      "Live cursors and presence for every editor",
      "Concurrent edits merge cleanly, offline then online",
    ],
    visual: (
      <BrowserFrame url="app.companyos.com/wiki/launch-runbook" className="bg-surface shadow-xl">
        <NotesMockup />
      </BrowserFrame>
    ),
    figure: <WireMesh className="size-full" />,
    figureLabel: "FIG 4.1",
  },
  {
    index: "4.2.2",
    label: "Wikilinks",
    titleLead: "Everything links to everything.",
    titleRest: "Notes, tasks, people, and pages, one graph.",
    description:
      "Reference a task, a person, or another page with a mention. The link is bidirectional, so a task knows which notes discuss it, and a note knows which tasks it spawned. Knowledge stops being a dead end.",
    points: [
      "Mentions and wikilinks across the workspace",
      "Bidirectional backlinks, kept in sync",
      "A note can become the source of a task",
    ],
    visual: (
      <CodeShowcase
        caption="launch-runbook.md"
        code={`# Launch runbook

Owner: @ada  ·  Tracking: [[DEMO-42]]

When CI is green on [[DEMO-42]], flip the
launch flag and post in #launch.

---
backlinks
  <- DEMO-42 (task)
  <- Weekly platform sync (meeting)`}
      />
    ),
    figure: <IsoFan className="size-full" />,
    figureLabel: "FIG 4.2",
  },
  {
    index: "4.2.3",
    label: "One relay",
    titleLead: "The same sync that powers the page",
    titleRest: "powers the board and the inbox too.",
    description:
      "The realtime relay runs in-process next to the API and fans changes out over server-sent events. The mechanism that keeps two cursors in step is the mechanism that keeps every surface in Elliptic live.",
    points: [
      "One relay behind notes, boards, and inboxes",
      "Updates pushed over SSE, never polled",
      "Everything stays org-scoped and private",
    ],
    visual: (
      <CodeShowcase
        caption="realtime"
        code={`// a keystroke becomes a CRDT update
doc.transact(() => title.insert(7, "today"))

// the relay fans it out over SSE
event: doc.update
data: { "doc": "launch-runbook",
        "actor": "ada", "v": 5142 }`}
      />
    ),
    figure: <IsoStack className="size-full" />,
    figureLabel: "FIG 4.3",
  },
];

const CAPABILITIES = [
  {
    title: "Live co-editing",
    description: "Multi-cursor editing on Yjs, with presence, so a doc is never locked to one person.",
  },
  {
    title: "Wiki and docs",
    description: "A structured company wiki and free-form notes, both first-class and searchable.",
  },
  {
    title: "Mentions and wikilinks",
    description: "Link a note to a task, a person, or another page, and the reference stays live.",
  },
  {
    title: "Bidirectional backlinks",
    description: "Every page knows what links to it, so context is never one-directional.",
  },
  {
    title: "Notes as sources",
    description: "Turn a note into the source of a task, keeping the thinking next to the work.",
  },
  {
    title: "Org-scoped and private",
    description: "Every page carries an org id, so a note can only ever be seen inside its workspace.",
  },
];

export default function NotesPage() {
  return (
    <FeaturePageShell>
      <FeatureHero
        index="4.1"
        eyebrow="Notes & wiki"
        titleLead="A wiki your whole team"
        titleRest="edits together, in the same second."
        lede="Docs and a company wiki with live, multi-cursor co-editing. Link a note to a task, a person, or another page, and keep the thinking next to the work it produced."
        primary={{ label: "Start free", href: "/signup" }}
        secondary={{ label: "Read the docs", href: "https://docs.company.chele.bi/notes-wiki-pages" }}
        visual={
          <BrowserFrame
            url="app.companyos.com/wiki/launch-runbook"
            className="w-full min-w-[64rem] border-border-strong shadow-xl"
          >
            <NotesMockup />
          </BrowserFrame>
        }
      />

      <FeatureSpecs
        specs={[
          { value: "Yjs", label: "Conflict-free CRDT co-editing" },
          { value: "Multi", label: "Cursor presence, in real time" },
          { value: "[[ ]]", label: "Wikilinks across the workspace" },
          { value: "SSE", label: "Synced over one realtime relay" },
        ]}
      />

      <FeatureRowsSection
        index="4.2"
        eyebrow="How it works"
        titleLead="A document that keeps up with the room."
        titleRest="Co-editing, links, and one live relay underneath."
        intro="Here is what each part looks like in practice."
        rows={ROWS}
      />

      <FeatureSection
        index="4.3"
        eyebrow="Capabilities"
        titleLead="Knowledge that stays connected,"
        titleRest="instead of rotting in a folder somewhere."
        tone="surface"
      >
        <FeatureGrid items={CAPABILITIES} />
      </FeatureSection>

      <FeatureSection
        index="4.4"
        eyebrow="For agents"
        titleLead="Agents read and write the wiki over MCP."
        titleRest="The same pages your team keeps, kept current."
        intro="An agent can read a page for context, draft a new one, or update a runbook, all over the MCP server and all scoped to one organization."
      >
        <CodeShowcase
          caption="company-brain MCP"
          code={`get_note(note="launch-runbook")        # read for context
create_note(title="Postmortem: 1.0 launch",
            body="## Timeline ...")
update_note(note="on-call", body="...")    # keep it current`}
        />
      </FeatureSection>

      <FinalCTA />
    </FeaturePageShell>
  );
}
