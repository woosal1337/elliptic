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
import { MeetingMockup } from "@/components/marketing/meeting-mockup";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata = pageMetadata({
  title: "Meetings",
  description:
    "Speaker-attributed transcripts, AI summaries on your own model key, and ask-the-meeting grounded in the transcript. Import recordings from Folio and turn decisions into tracked work.",
  path: "/meetings",
});

const ROWS: FeatureRowData[] = [
  {
    index: "3.2.1",
    label: "The transcript",
    titleLead: "Speaker-attributed, to the second.",
    titleRest: "Every line knows who said it and when.",
    description:
      "Import from the Folio recorder and the full transcript lands in Elliptic, diarized and timestamped. Scrub to any moment, quote a line straight into a task, and keep the record next to the work it produced.",
    points: [
      "Speaker attribution and timestamps on every line",
      "Quote a segment straight into a task or a note",
      "The recording lives next to the project it belongs to",
    ],
    visual: (
      <BrowserFrame url="app.companyos.com/meetings/weekly-sync" className="bg-surface shadow-xl">
        <MeetingMockup />
      </BrowserFrame>
    ),
    figure: <IsoFan className="size-full" />,
    figureLabel: "FIG 3.1",
  },
  {
    index: "3.2.2",
    label: "The summary",
    titleLead: "The decisions, not the noise.",
    titleRest: "Written the moment the meeting lands.",
    description:
      "An AI summary captures what was decided and what comes next, generated on your own model key. Turn a decision into a task on the right project without retyping a word of your notes.",
    points: [
      "Summaries that capture decisions and owners",
      "Generated on your own OpenAI or Anthropic key",
      "Decisions become tasks on the right project",
    ],
    visual: (
      <CodeShowcase
        caption="summary.json"
        code={`{
  "meeting": "Weekly platform sync",
  "decisions": [
    "Ship 1.0 on Friday behind a feature flag",
    "BYOK stays required for the hosted tier"
  ],
  "action_items": [
    { "task": "DEMO-42", "owner": "release-bot",
      "due": "2026-06-28" }
  ]
}`}
      />
    ),
    figure: <IsoStack className="size-full" />,
    figureLabel: "FIG 3.2",
  },
  {
    index: "3.2.3",
    label: "Ask the meeting",
    titleLead: "Question a recording instead of rewatching it.",
    titleRest: "Answers grounded in the transcript, with citations.",
    description:
      "Ask a meeting a question and get an answer grounded in the transcript, with the segments it came from. People and agents query the exact same record, so nobody has to sit through the replay.",
    points: [
      "Grounded answers, with the cited segments",
      "Works across one meeting or a whole series",
      "The same ask-the-meeting is available to agents",
    ],
    visual: (
      <CodeShowcase
        caption="ask the meeting"
        code={`ask_meeting(meeting="weekly-sync",
  q="What did we decide about the launch?")

> "Ship 1.0 on Friday behind a feature flag.
>  BYOK stays required for the hosted tier."
>  cited: [00:14:22] Mara, [00:15:01] Daniel`}
      />
    ),
    figure: <IsoCubes className="size-full" />,
    figureLabel: "FIG 3.3",
  },
];

const CAPABILITIES = [
  {
    title: "Folio import",
    description: "Bring recordings in from the Folio macOS recorder, transcript and all, in a click.",
  },
  {
    title: "Speaker attribution",
    description: "Diarized, timestamped transcripts so every line is tied to who said it.",
  },
  {
    title: "AI summaries",
    description: "Decisions, owners, and next steps, summarized on your own model key.",
  },
  {
    title: "Ask the meeting",
    description: "Grounded question-and-answer over one meeting or a whole series, with citations.",
  },
  {
    title: "Templates and recurring",
    description: "Reusable meeting templates and recurring meetings that keep their structure.",
  },
  {
    title: "Shares and links",
    description: "Share a meeting with a public link, scoped and revocable, for people outside the org.",
  },
];

export default function MeetingsPage() {
  return (
    <FeaturePageShell>
      <FeatureHero
        index="3.1"
        eyebrow="Meetings"
        titleLead="Every meeting becomes"
        titleRest="a transcript, a summary, and an answer."
        lede="Bring a recording in from Folio. Elliptic keeps the speaker-attributed transcript, writes the summary on your own key, and lets anyone, or any agent, ask the meeting a question in plain language."
        primary={{ label: "Start free", href: "/signup" }}
        secondary={{ label: "Read the docs", href: "https://docs.company.chele.bi/meetings" }}
        visual={
          <BrowserFrame
            url="app.companyos.com/meetings/weekly-sync"
            className="w-full min-w-[64rem] border-border-strong shadow-xl"
          >
            <MeetingMockup />
          </BrowserFrame>
        }
      />

      <FeatureSpecs
        specs={[
          { value: "Folio", label: "Import recordings in a click" },
          { value: "Speaker", label: "Attributed, timestamped transcripts" },
          { value: "Ask", label: "Question any meeting in plain language" },
          { value: "BYOK", label: "Summaries run on your own key" },
        ]}
      />

      <FeatureRowsSection
        index="3.2"
        eyebrow="How it works"
        titleLead="From a recording to an answer."
        titleRest="Transcript, summary, and a chat that knows what was said."
        intro="Here is what each part looks like in practice."
        rows={ROWS}
      />

      <FeatureSection
        index="3.3"
        eyebrow="Capabilities"
        titleLead="The whole meeting, kept usable,"
        titleRest="instead of a recording nobody opens again."
        tone="surface"
      >
        <FeatureGrid items={CAPABILITIES} />
      </FeatureSection>

      <FeatureSection
        index="3.4"
        eyebrow="For agents"
        titleLead="Agents read the room over MCP."
        titleRest="Summaries, answers, and the tasks that follow."
        intro="An agent can summarize a meeting, ask it questions, and turn the decisions into tracked tasks, all over the same MCP server, scoped to one organization."
      >
        <CodeShowcase
          caption="company-brain MCP"
          code={`summarize_meeting(meeting="weekly-sync")
ask_meeting(meeting="weekly-sync", q="Any blockers raised?")

# turn a decision into tracked work
create_task(project="DEMO", title="Wire the launch flag",
            source_meeting="weekly-sync")`}
        />
      </FeatureSection>

      <FinalCTA />
    </FeaturePageShell>
  );
}
