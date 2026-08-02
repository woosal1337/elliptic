"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, MessagesSquare, Send } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DatePicker,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@elliptic/ui";
import { useProjects } from "@/hooks/use-project-queries";
import { useCreateNote } from "@/hooks/use-note-queries";
import { useSendOrgMeetingChat, type OrgChatScope } from "@/hooks/use-meeting-queries";
import { confidenceBand } from "@/lib/confidence";
import { citationHref, citationLabel } from "@/lib/citations";
import { CoverageNote } from "@/components/ai/coverage-note";
import type { MeetingChatCitation } from "@/lib/types";

interface Turn {
  role: "user" | "assistant";
  content: string;
  citations?: MeetingChatCitation[];
  coverage?: { consulted: number; total: number };
  confidence?: number;
}

const ALL_PROJECTS = "all";

export function OrgMeetingChat({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState(ALL_PROJECTS);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const projects = useProjects(orgId);
  const chat = useSendOrgMeetingChat(orgId);
  const createNote = useCreateNote(orgId);
  const router = useRouter();

  const saveAsPage = (turn: Turn, question: string) => {
    const title = (question.trim() || "AI answer").slice(0, 120);
    const content = `# ${title}\n\n${turn.content}`;
    createNote.mutate(
      { title, content },
      { onSuccess: (note) => router.push(`/app/${orgId}/notes/${note.id}`) }
    );
  };

  const send = () => {
    const question = input.trim();
    if (question.length === 0 || chat.isPending) return;
    const history: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(history);
    setInput("");

    const scope: OrgChatScope = {};
    if (projectId !== ALL_PROJECTS) scope.project_id = projectId;
    if (from) scope.from = new Date(from).toISOString();
    if (to) scope.to = new Date(to).toISOString();

    chat.mutate(
      {
        messages: history.map(({ role, content }) => ({ role, content })),
        scope: Object.keys(scope).length > 0 ? scope : undefined,
      },
      {
        onSuccess: (result) => {
          setTurns((prev) => [
            ...prev,
            {
              role: "assistant",
              content: result.reply,
              citations: result.citations,
              coverage: result.coverage,
            },
          ]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <MessagesSquare className="size-4" />
          Ask across meetings
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Ask across meetings</DialogTitle>
          <DialogDescription className="text-small">
            Query the whole archive. Every answer cites the meetings it drew from.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-chat-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="org-chat-project" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {(projects.data ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-chat-from">From</Label>
            <DatePicker
              id="org-chat-from"
              value={from}
              onChange={(value) => setFrom(value ?? "")}
              placeholder="From"
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-chat-to">To</Label>
            <DatePicker
              id="org-chat-to"
              value={to}
              onChange={(value) => setTo(value ?? "")}
              placeholder="To"
              className="w-40"
            />
          </div>
        </div>

        <div className="flex min-h-40 flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-canvas p-4">
          {turns.length === 0 ? (
            <p className="m-auto max-w-sm text-center text-small text-muted-foreground">
              Ask something like &ldquo;What did we decide about the API redesign this quarter?&rdquo;
            </p>
          ) : (
            turns.map((turn, index) => (
              <div key={index} className="flex flex-col gap-2">
                <span className="text-caption font-medium text-muted-foreground">
                  {turn.role === "user" ? "You" : "Elliptic"}
                </span>
                <p className="whitespace-pre-wrap text-small text-foreground">{turn.content}</p>
                {turn.citations && turn.citations.length > 0 ? (
                  <ol className="flex flex-col gap-1">
                    {turn.citations.map((citation, citationIndex) => (
                      <li key={citationIndex} className="flex items-start gap-1.5 text-caption">
                        <span className="tabular font-mono text-muted-foreground">
                          [{citationIndex + 1}]
                        </span>
                        <Link
                          href={citationHref(orgId, citation)}
                          className="text-accent hover:underline"
                        >
                          {citationLabel(citation)}
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : null}
                {turn.role === "assistant" ? (
                  <div className="flex items-center justify-between gap-2">
                    <CoverageNote
                      band={confidenceBand(
                        turn.confidence ?? (turn.citations?.length ? 0.8 : 0.2)
                      )}
                      coverage={turn.coverage}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={createNote.isPending}
                      onClick={() =>
                        saveAsPage(turn, turns[index - 1]?.content ?? "AI answer")
                      }
                    >
                      <FilePlus2 className="size-3.5" />
                      Save as page
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={input}
            placeholder="Ask the archive…"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} loading={chat.isPending} disabled={input.trim().length === 0}>
            <Send className="size-4" />
            Ask
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
