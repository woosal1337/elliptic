"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AtSign,
  Bot,
  Globe,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Wand2,
  X,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Textarea,
} from "@elliptic/ui";
import {
  type ActionProposal,
  useExecuteAction,
  useProposeAction,
} from "@/hooks/use-ai-actions";
import { type RunActionEntry, useRunAction } from "@/hooks/use-ai-run-action";
import { type WebSearchResult, useWebSearch } from "@/hooks/use-web-search";
import { useProjects } from "@/hooks/use-project-queries";
import { useTasks } from "@/hooks/use-task-queries";
import {
  type ChatMode,
  type Conversation,
  useChatMessages,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessageFeedback,
  useSendChatMessage,
  useUpdateConversation,
} from "@/hooks/use-ai-chat-queries";

interface Mention {
  type: "task" | "project";
  id: string;
  label: string;
}

function MentionPicker({
  orgId,
  onPick,
}: {
  orgId: string;
  onPick: (mention: Mention) => void;
}) {
  const projects = useProjects(orgId);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const tasks = useTasks(orgId, projectId ?? "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton aria-label="Reference a project or work item" variant="ghost" size="sm">
          <AtSign className="size-4" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="max-h-72 overflow-y-auto p-1.5">
          {projectId === null ? (
            <>
              <p className="px-2 py-1 text-caption font-medium text-muted-foreground">Projects</p>
              {(projects.data ?? []).map((project) => (
                <div key={project.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex-1 truncate rounded px-2 py-1.5 text-left text-small hover:bg-muted"
                    onClick={() => {
                      onPick({ type: "project", id: project.id, label: project.key });
                      setOpen(false);
                    }}
                  >
                    {project.name}
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1.5 text-caption text-muted-foreground hover:bg-muted"
                    onClick={() => setProjectId(project.id)}
                  >
                    items →
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                className="px-2 py-1 text-caption text-muted-foreground hover:text-foreground"
                onClick={() => setProjectId(null)}
              >
                ← Projects
              </button>
              {(tasks.data ?? []).slice(0, 50).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="flex w-full items-center gap-2 truncate rounded px-2 py-1.5 text-left text-small hover:bg-muted"
                  onClick={() => {
                    onPick({ type: "task", id: task.id, label: task.identifier });
                    setOpen(false);
                  }}
                >
                  <span className="shrink-0 font-mono text-caption text-muted-foreground">
                    {task.identifier}
                  </span>
                  <span className="truncate">{task.title}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Thread({ orgId, conversation }: { orgId: string; conversation: Conversation }) {
  const messages = useChatMessages(orgId, conversation.id);
  const send = useSendChatMessage(orgId, conversation.id);
  const feedback = useMessageFeedback(orgId, conversation.id);
  const propose = useProposeAction(orgId);
  const execute = useExecuteAction(orgId);
  const update = useUpdateConversation(orgId);
  const run = useRunAction(orgId, conversation.id);
  const webSearch = useWebSearch(orgId);
  const [webResult, setWebResult] = useState<WebSearchResult | null>(null);

  const searchWeb = () => {
    if (!draft.trim() || webSearch.isPending) return;
    webSearch.mutate(draft.trim(), { onSuccess: (result) => setWebResult(result) });
  };
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [batch, setBatch] = useState<RunActionEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const isBuild = conversation.mode === "build";

  const proposeAction = () => {
    if (!draft.trim() || propose.isPending) return;
    propose.mutate(draft.trim(), { onSuccess: (result) => setProposal(result) });
  };

  const runAction = () => {
    if (!draft.trim() || run.isPending) return;
    run.mutate(draft.trim(), {
      onSuccess: (entry) => {
        setBatch((current) => [...current, entry]);
        setDraft("");
      },
    });
  };

  const confirmAction = () => {
    if (!proposal) return;
    execute.mutate(proposal, {
      onSuccess: () => {
        setProposal(null);
        setDraft("");
      },
    });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length, send.isPending]);

  const addMention = (mention: Mention) => {
    setMentions((current) =>
      current.some((m) => m.id === mention.id) ? current : [...current, mention]
    );
  };

  const submit = () => {
    if (!draft.trim() || send.isPending) return;
    const content = draft.trim();
    setDraft("");
    send.mutate({ content, mentions: mentions.map(({ type, id }) => ({ type, id })) });
    setMentions([]);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-caption font-medium capitalize ${
            conversation.mode === "build"
              ? "bg-warning-muted text-warning"
              : "bg-accent-muted text-accent"
          }`}
        >
          {conversation.mode}
        </span>
        <span className="truncate text-small font-medium text-foreground">{conversation.title}</span>
        {isBuild ? (
          <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 text-caption text-muted-foreground">
            <input
              type="checkbox"
              checked={conversation.auto_run}
              onChange={(event) =>
                update.mutate({ id: conversation.id, auto_run: event.target.checked })
              }
            />
            Auto-run
          </label>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (messages.data ?? []).length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Sparkles className="size-6" />
            <p className="text-small">
              Ask about your projects, work items, and cycles
              {conversation.mode === "build" ? " — or describe a change to make." : "."}
            </p>
          </div>
        ) : (
          (messages.data ?? []).map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  message.role === "user" ? "bg-muted" : "bg-accent-muted text-accent"
                }`}
              >
                {message.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <div className="flex max-w-[80%] flex-col gap-1">
                <div
                  className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-small ${
                    message.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "border border-border bg-surface text-foreground"
                  }`}
                >
                  {message.content}
                </div>
                {message.role === "assistant" ? (
                  <div className="flex items-center gap-1">
                    <IconButton
                      aria-label="Helpful"
                      variant="ghost"
                      size="sm"
                      className={message.feedback === 1 ? "text-success" : "text-muted-foreground"}
                      onClick={() =>
                        feedback.mutate({ messageId: message.id, value: message.feedback === 1 ? 0 : 1 })
                      }
                    >
                      <ThumbsUp className="size-3.5" />
                    </IconButton>
                    <IconButton
                      aria-label="Not helpful"
                      variant="ghost"
                      size="sm"
                      className={message.feedback === -1 ? "text-danger" : "text-muted-foreground"}
                      onClick={() =>
                        feedback.mutate({ messageId: message.id, value: message.feedback === -1 ? 0 : -1 })
                      }
                    >
                      <ThumbsDown className="size-3.5" />
                    </IconButton>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
        {send.isPending ? (
          <div className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
              <Bot className="size-4" />
            </span>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-small text-muted-foreground">
              Thinking…
            </div>
          </div>
        ) : null}
        {batch.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-success/30 bg-success-muted/20 p-3">
            <span className="text-caption font-medium text-foreground">
              Auto-run review · {batch.length} action{batch.length === 1 ? "" : "s"}
            </span>
            <ul className="flex flex-col gap-1">
              {batch.map((entry, index) => (
                <li
                  key={`${entry.result.task_id}-${index}`}
                  className="flex items-center gap-2 text-caption text-foreground"
                >
                  <Wand2 className="size-3 shrink-0 text-success" />
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {entry.result.identifier}
                  </span>
                  <span className="truncate">{entry.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        {webResult ? (
          <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-caption font-medium text-foreground">
                <Globe className="size-3.5 text-accent" />
                Web answer
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setWebResult(null)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-small text-foreground">{webResult.answer}</p>
            {webResult.sources.length > 0 ? (
              <ol className="flex flex-col gap-0.5 text-caption text-muted-foreground">
                {webResult.sources.map((source, index) => (
                  <li key={`${source.url}-${index}`} className="truncate">
                    [{index + 1}]{" "}
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        {source.title || source.url}
                      </a>
                    ) : (
                      source.title
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
        {proposal ? (
          <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning-muted/30 p-3">
            <div className="flex items-center gap-2 text-caption font-medium text-foreground">
              <Wand2 className="size-3.5 text-warning" />
              Proposed action
            </div>
            <p className="text-small text-foreground">{proposal.summary}</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>
                Discard
              </Button>
              <Button size="sm" onClick={confirmAction} loading={execute.isPending}>
                Confirm &amp; run
              </Button>
            </div>
          </div>
        ) : null}
        {mentions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {mentions.map((mention) => (
              <span
                key={mention.id}
                className="flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-caption text-accent"
              >
                <AtSign className="size-3" />
                {mention.label}
                <button
                  type="button"
                  aria-label={`Remove ${mention.label}`}
                  onClick={() => setMentions((c) => c.filter((m) => m.id !== mention.id))}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <MentionPicker orgId={orgId} onPick={addMention} />
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={`Message the assistant (${conversation.mode})…`}
            className="min-h-[2.5rem] flex-1"
          />
          {isBuild && conversation.auto_run ? (
            <Button
              variant="outline"
              onClick={runAction}
              loading={run.isPending}
              disabled={!draft.trim()}
            >
              <Wand2 className="size-4" />
              Run
            </Button>
          ) : isBuild ? (
            <Button
              variant="outline"
              onClick={proposeAction}
              loading={propose.isPending}
              disabled={!draft.trim()}
            >
              <Wand2 className="size-4" />
              Propose
            </Button>
          ) : null}
          <IconButton
            aria-label="Search the web"
            variant="ghost"
            size="lg"
            disabled={!draft.trim() || webSearch.isPending}
            onClick={searchWeb}
          >
            <Globe className={`size-4 ${webSearch.isPending ? "animate-pulse text-accent" : ""}`} />
          </IconButton>
          <Button onClick={submit} loading={send.isPending} disabled={!draft.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [search, setSearch] = useState("");
  const conversations = useConversations(orgId, search);
  const create = useCreateConversation(orgId);
  const remove = useDeleteConversation(orgId);
  const update = useUpdateConversation(orgId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rows = conversations.data ?? [];
  const active = rows.find((c) => c.id === activeId) ?? null;

  const startChat = (mode: ChatMode) => {
    create.mutate(mode, { onSuccess: (convo) => setActiveId(convo.id) });
  };

  const rename = (convo: Conversation) => {
    const next = window.prompt("Rename conversation", convo.title);
    if (next && next.trim() && next.trim() !== convo.title) {
      update.mutate({ id: convo.id, title: next.trim() });
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-3rem)] max-w-6xl gap-4 p-4">
      <aside className="flex w-64 shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-accent" />
          <h1 className="text-h4 font-semibold text-foreground">Assistant</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => startChat("ask")} loading={create.isPending}>
            <Plus className="size-3.5" />
            Ask
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => startChat("build")}>
            <Plus className="size-3.5" />
            Build
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            className="h-8 pl-8 text-small"
          />
        </div>
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {rows.map((convo) => (
            <li key={convo.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveId(convo.id)}
                className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-small transition-colors ${
                  activeId === convo.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
                onDoubleClick={() => rename(convo)}
              >
                {convo.pinned ? <Pin className="size-3 shrink-0 text-accent" /> : null}
                <span className="truncate">{convo.title}</span>
              </button>
              <IconButton
                aria-label={convo.pinned ? "Unpin" : "Pin"}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => update.mutate({ id: convo.id, pinned: !convo.pinned })}
              >
                {convo.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </IconButton>
              <IconButton
                aria-label="Delete conversation"
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => {
                  remove.mutate(convo.id);
                  if (activeId === convo.id) setActiveId(null);
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        {active ? (
          <Thread orgId={orgId} conversation={active} />
        ) : (
          <div className="m-auto flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Sparkles className="size-8" />
            <p className="text-small">Start an Ask or Build chat to talk to your workspace.</p>
          </div>
        )}
      </div>
    </div>
  );
}
