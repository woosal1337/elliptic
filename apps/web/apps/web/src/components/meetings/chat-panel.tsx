"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MessagesSquare,
  Plus,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Input,
  Kbd,
  Pill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@elliptic/ui";
import type { MeetingChatMessage, TranscriptSegment } from "@/lib/types";
import { useMeeting, useSendMeetingChat, useTranscript } from "@/hooks/use-meeting-queries";
import { useMeetingRecipes, useSaveRecipe } from "@/hooks/use-meeting-template-queries";
import { matchRecipes, parseRecipeTrigger } from "@/lib/meeting-templates";
import type { MeetingRecipe } from "@/lib/types";
import { useProjects } from "@/hooks/use-project-queries";
import { useCreateTask } from "@/hooks/use-task-queries";
import { useShortcut } from "@/lib/keyboard";
import { formatTimestamp } from "@/lib/format";
import {
  matchTextToSegments,
  parseSummarySections,
  stripMarkup,
  type SourceMatch,
} from "./provenance";
import { useAnchor } from "./anchor-context";

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `local-${messageCounter}`;
}

const PRESET_PROMPTS = [
  "What did I miss?",
  "Summarize the last 5 minutes",
  "List decisions made",
  "Suggest questions for me to ask",
] as const;

const LOW_CONFIDENCE_SIGNALS = [
  "i don't know",
  "i do not know",
  "not sure",
  "isn't clear",
  "is not clear",
  "no mention",
  "not mentioned",
  "wasn't discussed",
  "was not discussed",
  "doesn't appear",
  "does not appear",
  "can't find",
  "cannot find",
  "no information",
  "not enough",
  "unable to",
];

function isLowConfidence(reply: string): boolean {
  const text = reply.toLowerCase();
  return LOW_CONFIDENCE_SIGNALS.some((signal) => text.includes(signal));
}

interface ChatEntry extends MeetingChatMessage {
  grounded?: boolean;
}

function AssistantFooter({ grounded }: { grounded: boolean }) {
  if (!grounded) {
    return (
      <span className="mt-1.5 flex items-center gap-1.5 text-caption text-warning">
        <TriangleAlert className="size-3" />
        Low confidence — this may not be answered in the transcript. Verify directly.
      </span>
    );
  }
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-caption text-muted-foreground">
      <ShieldCheck className="size-3" />
      AI-generated. Check the transcript tab to verify.
    </span>
  );
}

function CitationChip({ match, index }: { match: SourceMatch; index: number }) {
  const { requestSegment } = useAnchor();
  const { segment } = match;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => requestSegment(segment.id)}
            aria-label={`View source ${index + 1}: ${segment.speaker} at ${formatTimestamp(segment.start_seconds)}`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-accent-subtle bg-accent-muted px-1 font-mono text-caption tabular-nums text-accent transition-colors duration-150 hover:bg-accent hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {index + 1}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 bg-surface text-left text-foreground shadow-lg ring-1 ring-border">
          <span className="flex items-center justify-between gap-3 text-caption">
            <span className="font-semibold text-accent">{segment.speaker}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatTimestamp(segment.start_seconds)}
            </span>
          </span>
          <span className="mt-1.5 block text-small leading-relaxed text-foreground/90">
            &ldquo;{truncate(segment.text, 200)}&rdquo;
          </span>
          <span className="mt-2 block text-caption font-medium text-accent">
            Click to jump to transcript
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

interface ChatActionTaskValue {
  projectId: string | null;
  createTask: (title: string) => void;
  creating: boolean;
}

const ChatActionTaskContext = createContext<ChatActionTaskValue | null>(null);

function useChatActionTask(): ChatActionTaskValue | null {
  return useContext(ChatActionTaskContext);
}

function taskTitleFromLine(raw: string): string {
  return stripMarkup(raw).replace(/^\[[ x]\]\s*/i, "").trim();
}

function actionItemTexts(content: string): Set<string> {
  const sections = parseSummarySections(content);
  const actions = sections.find((section) => section.kind === "actions");
  return new Set((actions?.lines ?? []).map((line) => taskTitleFromLine(line.raw)));
}

function ChatActionTaskProvider({
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
  const value = useMemo<ChatActionTaskValue>(
    () => ({ projectId, createTask, creating: create.isPending }),
    [projectId, createTask, create.isPending]
  );
  return (
    <ChatActionTaskContext.Provider value={value}>{children}</ChatActionTaskContext.Provider>
  );
}

function CreateTaskLineButton({ title }: { title: string }) {
  const action = useChatActionTask();
  if (!action || title.length === 0) return null;

  const disabled = !action.projectId || action.creating;
  const tip = action.projectId
    ? "Create a task from this line"
    : "Set a project for this meeting to file tasks";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Create task from this line"
            className="h-5 shrink-0 px-1 text-caption opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/line:opacity-100 aria-disabled:opacity-50"
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (disabled) return;
              action.createTask(title);
            }}
          >
            <Plus className="size-3" />
            Task
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AssistantReply({
  content,
  grounded,
  segments,
}: {
  content: string;
  grounded: boolean;
  segments: TranscriptSegment[];
}) {
  const citations = useMemo<SourceMatch[]>(
    () => (grounded && segments.length > 0 ? matchTextToSegments(content, segments) : []),
    [content, grounded, segments]
  );
  const actionTitles = useMemo(() => actionItemTexts(content), [content]);
  const lines = useMemo(() => content.split("\n"), [content]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-small leading-relaxed text-foreground">
        {lines.map((line, index) => {
          const title = taskTitleFromLine(line);
          const isAction = title.length > 0 && actionTitles.has(title);
          return (
            <span
              key={index}
              className="group/line flex min-h-5 items-start justify-between gap-2"
            >
              <span className="whitespace-pre-wrap">{line.length > 0 ? line : " "}</span>
              {isAction ? <CreateTaskLineButton title={title} /> : null}
            </span>
          );
        })}
      </div>
      {citations.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-muted-foreground/70">Sources</span>
          {citations.map((match, index) => (
            <CitationChip key={match.segment.id} match={match} index={index} />
          ))}
        </span>
      ) : null}
    </div>
  );
}

export function ChatPanel({ orgId, meetingId }: { orgId: string; meetingId: string }) {
  const meeting = useMeeting(orgId, meetingId);
  const send = useSendMeetingChat(orgId, meetingId);
  const transcript = useTranscript(orgId, meetingId);
  const projects = useProjects(orgId);
  const { recipes } = useMeetingRecipes(orgId);
  const saveRecipeMutation = useSaveRecipe(orgId);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [message, setMessage] = useState("");
  const [chosenProjectId, setChosenProjectId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const segments = useMemo(() => transcript.data ?? [], [transcript.data]);
  const meetingProjectId = meeting.data?.project_id ?? null;
  const targetProjectId = meetingProjectId ?? chosenProjectId;
  const projectOptions = projects.data ?? [];
  const showProjectPicker =
    meetingProjectId === null && messages.some((entry) => entry.role === "assistant");

  const sendQuestion = (question: string) => {
    const trimmed = question.trim();
    if (trimmed.length === 0 || send.isPending) return;
    const userMessage: ChatEntry = { id: nextId(), role: "user", content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setMessage("");
    send.mutate(
      history.map((entry) => ({ role: entry.role, content: entry.content })),
      {
        onSuccess: (result) => {
          setMessages((current) => [
            ...current,
            {
              id: nextId(),
              role: "assistant",
              content: result.reply,
              grounded: !isLowConfidence(result.reply),
            },
          ]);
        },
      }
    );
  };

  const submit = () => sendQuestion(message);

  const recipeQueryValue = parseRecipeTrigger(message);
  const matchedRecipes = useMemo(
    () => (recipeQueryValue === null ? [] : matchRecipes(recipeQueryValue, recipes)),
    [recipeQueryValue, recipes]
  );
  const showRecipeMenu = recipeQueryValue !== null;

  const runRecipe = (recipe: MeetingRecipe) => {
    setMessage("");
    sendQuestion(recipe.prompt);
  };

  const saveRecipe = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    saveRecipeMutation.mutate(
      { name: trimmed, prompt: trimmed },
      { onSuccess: () => setMessage("") }
    );
  };

  useShortcut(
    {
      id: "meeting-ask-focus",
      keys: "mod+j",
      label: "Focus Ask panel",
      scope: "action",
    },
    () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "nearest" });
    }
  );

  return (
    <ChatActionTaskProvider orgId={orgId} meetingId={meetingId} projectId={targetProjectId}>
    <div className="flex h-full min-h-80 flex-col rounded-lg border border-border bg-surface shadow-xs xl:max-h-[calc(100dvh-7rem)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent-muted text-accent">
          <Sparkles className="size-3.5" />
        </span>
        <h3 className="text-small font-semibold text-foreground">Ask about this meeting</h3>
        <span className="ml-auto flex items-center gap-2">
          <Kbd>⌘J</Kbd>
          <Badge variant="accent">AI</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="m-auto flex max-w-64 flex-col items-center gap-3 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-subtle text-muted-foreground">
              <MessagesSquare className="size-5" />
            </span>
            <p className="text-small text-muted-foreground">
              Ask anything about what was discussed, decided, or assigned in this meeting.
            </p>
            <p className="text-caption text-muted-foreground/70">
              Quick answers are ephemeral and AI-generated. They are not saved to the meeting
              document. Always verify against the transcript.
            </p>
          </div>
        ) : (
          messages.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex max-w-[85%] flex-col",
                entry.role === "user" ? "items-end self-end" : "items-start self-start"
              )}
            >
              {entry.role === "assistant" ? (
                <div className="flex items-start gap-2">
                  <Avatar name="AI" size="xs" className="mt-1" />
                  <AssistantReply
                    content={entry.content}
                    grounded={entry.grounded ?? true}
                    segments={segments}
                  />
                </div>
              ) : (
                <p className="whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-small leading-relaxed text-primary-foreground">
                  {entry.content}
                </p>
              )}
              {entry.role === "assistant" ? (
                <span className="pl-8">
                  <AssistantFooter grounded={entry.grounded ?? true} />
                </span>
              ) : null}
            </div>
          ))
        )}
        {send.isPending ? (
          <div className="flex items-center gap-2 self-start">
            <Avatar name="AI" size="xs" className="mt-1" />
            <span className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-caption text-muted-foreground">
              <Spinner size="sm" />
              Thinking…
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        {showProjectPicker && projectOptions.length > 0 ? (
          <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <span>File tasks in</span>
            <Select
              value={chosenProjectId ?? undefined}
              onValueChange={setChosenProjectId}
            >
              <SelectTrigger className="h-7 w-40 px-2 text-caption" aria-label="Project for tasks">
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={send.isPending}
              onClick={() => sendQuestion(prompt)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
            >
              <Pill
                size="sm"
                className="cursor-pointer hover:border-accent-subtle hover:bg-accent-muted hover:text-accent"
              >
                {prompt}
              </Pill>
            </button>
          ))}
        </div>
        {showRecipeMenu ? (
          <div className="flex flex-col gap-0.5 rounded-md border border-border bg-elevated p-1 shadow-sm">
            <span className="px-2 py-1 text-caption font-medium uppercase tracking-wide text-muted-foreground">
              Recipes
            </span>
            {matchedRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                disabled={send.isPending}
                onClick={() => runRecipe(recipe)}
                className="flex flex-col rounded-sm px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
              >
                <span className="text-small text-foreground">{recipe.name}</span>
                <span className="truncate text-caption text-muted-foreground">{recipe.prompt}</span>
              </button>
            ))}
            {recipeQueryValue && recipeQueryValue.length > 0 && matchedRecipes.length === 0 ? (
              <button
                type="button"
                disabled={saveRecipeMutation.isPending}
                onClick={() => saveRecipe(recipeQueryValue)}
                className="rounded-sm px-2 py-1.5 text-left text-small text-accent hover:bg-muted/60 disabled:opacity-50"
              >
                Save &ldquo;{recipeQueryValue}&rdquo; as a recipe
              </button>
            ) : null}
          </div>
        ) : null}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Input
            ref={inputRef}
            aria-label="Ask about this meeting"
            placeholder="Ask a question, or / for recipes…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <IconButton
            aria-label="Send"
            variant="primary"
            type="submit"
            disabled={message.trim().length === 0 || send.isPending}
          >
            <SendHorizontal />
          </IconButton>
        </form>
      </div>
    </div>
    </ChatActionTaskProvider>
  );
}
