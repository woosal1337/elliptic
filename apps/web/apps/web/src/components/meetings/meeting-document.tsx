"use client";

import {
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  CircleHelp,
  FileText,
  Info,
  ListChecks,
  ListPlus,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Square,
  Stamp,
  UserPen,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import {
  useMeeting,
  useSummaries,
  useSummarizeMeeting,
  useTranscript,
  useUpdateMeeting,
} from "@/hooks/use-meeting-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { useCreateTask } from "@/hooks/use-task-queries";
import { useMeetingTemplates } from "@/hooks/use-meeting-template-queries";
import { FREEFORM_TEMPLATE_ID } from "@/lib/meeting-templates";
import { ErrorState } from "@/components/error-state";
import { NoteEditor } from "@/components/notes/note-editor";
import { stripMarkup } from "./provenance";
import type { MeetingSummary, TranscriptSegment } from "@/lib/types";
import {
  matchLineToSegment,
  parseSummaryLines,
  parseSummarySections,
  type SummaryLine,
  type SummarySection,
  type SummarySectionKind,
} from "./provenance";
import { SourceAnchor } from "./source-anchor";

const SECTION_META: Record<
  SummarySectionKind,
  { label: string; icon: typeof Stamp; tone: string }
> = {
  decisions: { label: "Decisions", icon: Stamp, tone: "text-success" },
  actions: { label: "Action items", icon: ListTodo, tone: "text-accent" },
  questions: { label: "Open questions", icon: CircleHelp, tone: "text-warning" },
  highlights: { label: "Key points", icon: ListChecks, tone: "text-muted-foreground" },
};

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded-xs bg-subtle px-1 py-0.5 font-mono text-mono-label text-foreground/80"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

interface ActionTaskValue {
  orgId: string;
  meetingId: string;
  projectId: string | null;
  createTask: (title: string) => void;
  creating: boolean;
}

const ActionTaskContext = createContext<ActionTaskValue | null>(null);

function useActionTask(): ActionTaskValue | null {
  return useContext(ActionTaskContext);
}

function actionItemTitle(raw: string): string {
  return stripMarkup(raw).replace(/^\[[ x]\]\s*/i, "").trim();
}

function ActionTaskProvider({
  orgId,
  meetingId,
  projectId,
  children,
}: {
  orgId: string;
  meetingId: string;
  projectId: string | null;
  children: ReactNode;
}) {
  const create = useCreateTask(orgId, projectId ?? "");
  const createTask = useCallback(
    (title: string) => {
      if (!projectId || title.length === 0) return;
      create.mutate({
        title,
        status: "backlog",
        priority: "none",
        source_meeting_id: meetingId,
      });
    },
    [create, projectId, meetingId]
  );
  const value = useMemo<ActionTaskValue>(
    () => ({ orgId, meetingId, projectId, createTask, creating: create.isPending }),
    [orgId, meetingId, projectId, createTask, create.isPending]
  );
  return <ActionTaskContext.Provider value={value}>{children}</ActionTaskContext.Provider>;
}

function CreateTaskButton({ raw }: { raw: string }) {
  const action = useActionTask();
  if (!action) return null;

  const title = actionItemTitle(raw);
  const disabled = !action.projectId || title.length === 0 || action.creating;
  const tip = action.projectId
    ? "Create a task from this action item"
    : "Set a project for this meeting to file tasks";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Create task from action item"
            className="h-6 px-1.5 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/line:opacity-100 aria-disabled:opacity-50"
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (disabled) return;
              action.createTask(title);
            }}
          >
            <Plus className="size-3.5" />
            Task
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CreateAllTasksButton({ lines }: { lines: SummaryLine[] }) {
  const action = useActionTask();
  if (!action) return null;

  const titles = lines.map((line) => actionItemTitle(line.raw)).filter((title) => title.length > 0);
  const disabled = !action.projectId || titles.length === 0 || action.creating;
  const tip = action.projectId
    ? "Create one task for every action item"
    : "Set a project for this meeting to file tasks";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-1.5"
            aria-disabled={disabled || undefined}
            loading={action.creating}
            onClick={() => {
              if (disabled) return;
              for (const title of titles) action.createTask(title);
            }}
          >
            <ListPlus className="size-3.5" />
            Create all tasks
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ProjectFilePicker({
  orgId,
  value,
  onChange,
}: {
  orgId: string;
  value: string | null;
  onChange: (projectId: string) => void;
}) {
  const projects = useProjects(orgId);
  const options = projects.data ?? [];
  if (options.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
      <span>File tasks in</span>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-44 px-2 text-caption" aria-label="Project for tasks">
          <SelectValue placeholder="Pick a project" />
        </SelectTrigger>
        <SelectContent>
          {options.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProvenanceLegend() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What the colors mean"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/50" aria-hidden />
              AI
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-foreground" aria-hidden />
              You
            </span>
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">
          Dimmed text is AI-generated. Full-contrast text is your own notes. Hover any AI line for
          its transcript source.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionItem({
  line,
  segments,
  kind,
}: {
  line: SummaryLine;
  segments: TranscriptSegment[];
  kind: SummarySectionKind;
}) {
  const match = useMemo(() => matchLineToSegment(line.raw, segments), [line.raw, segments]);

  if (kind === "actions") {
    return (
      <li className="group/line flex items-start gap-2">
        <Square className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
        <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="flex-1 text-small leading-relaxed text-muted-foreground">
            {renderInline(line.raw)}
          </p>
          <Badge variant="outline" size="sm" className="shrink-0">
            Action item
          </Badge>
          <CreateTaskButton raw={line.raw} />
        </div>
        <SourceAnchor match={match} />
      </li>
    );
  }

  return (
    <li className="group/line flex items-start gap-2">
      <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
      <p className="flex-1 text-small leading-relaxed text-muted-foreground">
        {renderInline(line.raw)}
      </p>
      <SourceAnchor match={match} />
    </li>
  );
}

function SummarySectionBlock({
  section,
  segments,
}: {
  section: SummarySection;
  segments: TranscriptSegment[];
}) {
  const meta = SECTION_META[section.kind];
  const Icon = meta.icon;
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center gap-2">
        <Icon className={`size-3.5 ${meta.tone}`} aria-hidden />
        <h4 className="text-mono-label font-mono uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </h4>
        <span className="text-caption tabular-nums text-muted-foreground/60">
          {section.lines.length}
        </span>
        {section.kind === "actions" ? <CreateAllTasksButton lines={section.lines} /> : null}
      </header>
      <ul className="flex flex-col gap-1.5">
        {section.lines.map((line) => (
          <SectionItem key={line.id} line={line} segments={segments} kind={section.kind} />
        ))}
      </ul>
    </section>
  );
}

function AISummaryBlock({
  summary,
  segments,
}: {
  summary: MeetingSummary;
  segments: TranscriptSegment[];
}) {
  const sections = useMemo(() => parseSummarySections(summary.content), [summary.content]);
  const lines = useMemo(() => parseSummaryLines(summary.content), [summary.content]);
  const anchored = useMemo(
    () => lines.filter((line) => matchLineToSegment(line.raw, segments)).length,
    [lines, segments]
  );

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-accent-subtle bg-accent-muted/30 p-4 shadow-xs">
      <header className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        <Badge variant="accent" dot>
          AI-generated
        </Badge>
        <span className="font-mono tabular-nums">{summary.model}</span>
        <span aria-hidden>·</span>
        <span>{formatRelative(summary.created_at)}</span>
        {segments.length > 0 ? (
          <span className="ml-auto">
            {anchored} of {lines.length} lines linked to transcript
          </span>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">
        {sections.length > 0 ? (
          sections.map((section) => (
            <SummarySectionBlock key={section.kind} section={section} segments={segments} />
          ))
        ) : (
          <ul className="flex flex-col gap-1.5">
            {lines.map((line) => (
              <SectionItem
                key={line.id}
                line={line}
                segments={segments}
                kind="highlights"
              />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function HumanNotes({
  markdown,
  edited,
  onSave,
  saving,
}: {
  markdown: string;
  edited: boolean;
  onSave: (markdown: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(markdown);
  const wasSaving = useRef(saving);

  useEffect(() => {
    if (!editing) setDraft(markdown);
  }, [markdown, editing]);

  useEffect(() => {
    if (wasSaving.current && !saving && editing) {
      setEditing(false);
    }
    wasSaving.current = saving;
  }, [saving, editing]);

  const paragraphs = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <article className="group/notes flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-xs">
      <header className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        <Badge variant={edited ? "accent" : "outline"} dot>
          {edited ? "Edited by you" : "Your notes"}
        </Badge>
        <span>{edited ? "Human-edited, no longer pure AI output" : "Source material, not AI-generated"}</span>
        {!editing ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 px-2 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/notes:opacity-100"
            onClick={() => {
              setDraft(markdown);
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : (
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              disabled={saving}
              onClick={() => {
                setDraft(markdown);
                setEditing(false);
              }}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              loading={saving}
              onClick={() => onSave(draft)}
            >
              <Check className="size-3.5" />
              Save
            </Button>
          </div>
        )}
      </header>
      {editing ? (
        <div className="rounded-md border border-input bg-background px-3 py-2">
          <NoteEditor
            value={draft}
            onChange={setDraft}
            placeholder="Write your own notes. Edits here are saved as your words, not the AI's."
            className="min-h-[12rem]"
          />
        </div>
      ) : paragraphs.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {paragraphs.map((line, index) => (
            <p key={index} className="text-small leading-relaxed text-foreground">
              {renderInline(line)}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-small text-muted-foreground">
          Nothing here yet. Click Edit to write your own notes or adopt the AI summary as your own.
        </p>
      )}
    </article>
  );
}

function summaryToMarkdown(summary: MeetingSummary): string {
  return summary.content.trim();
}

export function MeetingDocument({
  orgId,
  meetingId,
  rawMarkdown,
}: {
  orgId: string;
  meetingId: string;
  rawMarkdown: string | null;
}) {
  const meeting = useMeeting(orgId, meetingId);
  const summaries = useSummaries(orgId, meetingId);
  const transcript = useTranscript(orgId, meetingId);
  const summarize = useSummarizeMeeting(orgId, meetingId);
  const updateMeeting = useUpdateMeeting(orgId, meetingId);
  const { templates } = useMeetingTemplates(orgId);
  const [templateId, setTemplateId] = useState(FREEFORM_TEMPLATE_ID);

  const runSummarize = (preserveHuman: boolean) =>
    summarize.mutate({
      template_id: templateId === FREEFORM_TEMPLATE_ID ? undefined : templateId,
      preserve_human: preserveHuman,
    });

  const segments = transcript.data ?? [];
  const hasSummaries = Boolean(summaries.data && summaries.data.length > 0);
  const latestSummary = summaries.data?.[0] ?? null;

  const meetingProjectId = meeting.data?.project_id ?? null;
  const [chosenProjectId, setChosenProjectId] = useState<string | null>(null);
  const targetProjectId = meetingProjectId ?? chosenProjectId;

  const notes = rawMarkdown ?? "";
  const hasNotes = notes.trim().length > 0;

  const handleSaveNotes = (markdown: string) => {
    updateMeeting.mutate({ raw_markdown: markdown });
  };

  const handleAdopt = () => {
    if (!latestSummary) return;
    const adopted = [notes.trim(), summaryToMarkdown(latestSummary)]
      .filter((part) => part.length > 0)
      .join("\n\n");
    updateMeeting.mutate({ raw_markdown: adopted });
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent-muted text-accent">
            <Sparkles className="size-3.5" />
          </span>
          <h2 className="text-h4 font-semibold text-foreground">Summary</h2>
          {hasSummaries ? <ProvenanceLegend /> : null}
        </div>
        <div className="flex items-center gap-2">
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="h-8 w-44 text-caption" aria-label="Summary template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasSummaries ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={summarize.isPending}
                    onClick={() => runSummarize(true)}
                  >
                    <RefreshCw className="size-4" />
                    Re-enhance
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Regenerate the AI summary from the transcript, optionally under a new template.
                  Your edited notes are kept.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              size="sm"
              variant="outline"
              loading={summarize.isPending}
              onClick={() => runSummarize(false)}
            >
              <Sparkles className="size-4 text-accent" />
              Summarize
            </Button>
          )}
        </div>
      </div>

      {summarize.isPending ? (
        <p className="flex items-center gap-2 text-caption text-accent">
          <Loader2 className="size-3.5 animate-spin" />
          {hasSummaries ? "Re-enhancing with AI…" : "Generating summary with AI…"}
        </p>
      ) : null}

      {summaries.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : summaries.isError ? (
        <ErrorState error={summaries.error} onRetry={() => void summaries.refetch()} />
      ) : !hasSummaries ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-surface p-5">
          <p className="text-small text-muted-foreground">
            No summary yet. Generate one with your org&apos;s AI key. Every AI line will link back to
            the transcript it came from.
          </p>
        </div>
      ) : (
        <ActionTaskProvider orgId={orgId} meetingId={meetingId} projectId={targetProjectId}>
          <div className="flex flex-col gap-6">
            {meetingProjectId === null ? (
              <ProjectFilePicker
                orgId={orgId}
                value={chosenProjectId}
                onChange={setChosenProjectId}
              />
            ) : null}
            {summaries.data.map((summary) => (
              <AISummaryBlock key={summary.id} summary={summary} segments={segments} />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <FileText className="size-3.5" />
                AI summary. Hover any line for its source, or open the transcript tab to verify.
              </p>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      loading={updateMeeting.isPending}
                      onClick={handleAdopt}
                    >
                      <UserPen className="size-3.5" />
                      Edit as your notes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Copies this AI summary into your notes below so you can edit it. Once edited it
                    reads as your own words, not AI output.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </ActionTaskProvider>
      )}

      <HumanNotes
        markdown={notes}
        edited={hasNotes}
        onSave={handleSaveNotes}
        saving={updateMeeting.isPending}
      />
    </section>
  );
}
