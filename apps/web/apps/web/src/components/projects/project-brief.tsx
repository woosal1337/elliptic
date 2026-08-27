"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Plus, X } from "lucide-react";
import { Badge, Button, IconButton, Input, Separator, Skeleton } from "@elliptic/ui";
import { formatDate } from "@/lib/format";
import { useProject, useProjectMembers, useUpdateProject } from "@/hooks/use-project-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useNotes } from "@/hooks/use-note-queries";
import { useTasks } from "@/hooks/use-task-queries";
import { ErrorState } from "@/components/error-state";
import { MarkdownBody } from "@/components/notes/markdown-body";
import type { MentionConfig, MentionItem } from "@/components/notes/editor-extensions";

type Artifact = { label: string; url: string };

const ARTIFACT_MARKER = "\n\n<!--brief:links-->\n";

function parseDescription(raw: string | null): { body: string; artifacts: Artifact[] } {
  if (!raw) return { body: "", artifacts: [] };
  const index = raw.indexOf(ARTIFACT_MARKER);
  if (index === -1) return { body: raw, artifacts: [] };
  const body = raw.slice(0, index);
  const tail = raw.slice(index + ARTIFACT_MARKER.length).trim();
  try {
    const parsed = JSON.parse(tail) as Artifact[];
    if (Array.isArray(parsed)) {
      return {
        body,
        artifacts: parsed.filter(
          (item): item is Artifact =>
            typeof item?.label === "string" && typeof item?.url === "string"
        ),
      };
    }
  } catch {
    return { body, artifacts: [] };
  }
  return { body, artifacts: [] };
}

function serializeDescription(body: string, artifacts: Artifact[]): string {
  if (artifacts.length === 0) return body;
  return `${body}${ARTIFACT_MARKER}${JSON.stringify(artifacts)}`;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function shortTitle(value: string, max = 40): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

export function ProjectBrief({ orgId, projectId }: { orgId: string; projectId: string }) {
  const router = useRouter();
  const project = useProject(orgId, projectId);
  const projectMembers = useProjectMembers(orgId, projectId);
  const orgMembers = useOrgMembers(orgId);
  const tasks = useTasks(orgId, projectId);
  const notes = useNotes(orgId, projectId);
  const updateProject = useUpdateProject(orgId, projectId);
  const saveProject = updateProject.mutate;

  const [body, setBody] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const savedRef = useRef<string>("");
  const latestRef = useRef<string>("");
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (project.isSuccess && !hydrated) {
      const parsed = parseDescription(project.data.description);
      setBody(parsed.body);
      setArtifacts(parsed.artifacts);
      savedRef.current = project.data.description ?? "";
      latestRef.current = project.data.description ?? "";
      setHydrated(true);
      hydratedRef.current = true;
    }
  }, [project.isSuccess, project.data, hydrated]);

  const serialized = useMemo(
    () => serializeDescription(body, artifacts),
    [body, artifacts]
  );
  latestRef.current = serialized;

  const dirty = hydrated && serialized !== savedRef.current;

  useEffect(() => {
    if (!hydrated || !dirty) return;
    const id = setTimeout(() => {
      saveProject(
        { description: serialized },
        { onSuccess: () => (savedRef.current = serialized) }
      );
    }, 800);
    return () => clearTimeout(id);
  }, [serialized, dirty, hydrated, saveProject]);

  useEffect(() => {
    return () => {
      if (!hydratedRef.current) return;
      if (latestRef.current !== savedRef.current) {
        saveProject({ description: latestRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const memberItems = useMemo<MentionItem[]>(() => {
    const ids = new Set(projectMembers.data?.map((member) => member.user_id));
    const source = orgMembers.data ?? [];
    return source
      .filter((member) => ids.size === 0 || ids.has(member.user_id))
      .map((member) => ({
        id: member.user_id,
        label: member.full_name || member.email,
        hint: member.email,
        kind: "user" as const,
      }));
  }, [orgMembers.data, projectMembers.data]);

  const taskItems = useMemo<MentionItem[]>(() => {
    return (tasks.data ?? []).map((task) => ({
      id: task.id,
      label: task.title,
      hint: task.identifier,
      kind: "task" as const,
    }));
  }, [tasks.data]);

  const noteItems = useMemo<MentionItem[]>(() => {
    return (notes.data ?? []).map((note) => ({
      id: note.id,
      label: shortTitle(note.title),
      hint: note.title,
      kind: "note" as const,
    }));
  }, [notes.data]);

  const mention = useMemo<MentionConfig>(
    () => ({
      resolve: (query) => {
        const normalized = query.trim().toLowerCase();
        const pool = [...memberItems, ...taskItems, ...noteItems];
        const filtered =
          normalized.length === 0
            ? pool
            : pool.filter((item) =>
                `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(normalized)
              );
        return filtered.slice(0, 8);
      },
      onActivate: (item) => {
        if (item.kind === "note") {
          router.push(`/app/${orgId}/notes/${item.id}`);
        }
      },
    }),
    [memberItems, taskItems, noteItems, router, orgId]
  );

  const addArtifact = useCallback(() => {
    const url = normalizeUrl(linkUrl);
    if (url.length === 0) return;
    const label = linkLabel.trim() || url.replace(/^https?:\/\//i, "");
    setArtifacts((current) => [...current, { label, url }]);
    setLinkLabel("");
    setLinkUrl("");
  }, [linkLabel, linkUrl]);

  const removeArtifact = useCallback((index: number) => {
    setArtifacts((current) => current.filter((_, i) => i !== index));
  }, []);

  if (project.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (project.isError) {
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;
  }

  const memberCount = projectMembers.data?.length ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <MarkdownBody
          value={body}
          onChange={setBody}
          orgId={orgId}
          mention={mention}
          placeholder="Capture the vision. Why it matters, what good looks like, where it stands. Type “/” for blocks, “@” to mention…"
          emptyLabel="Click to write the brief…"
        />
      </div>

      <aside className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h2 className="text-mono-label font-mono text-muted-foreground">
            Metadata
          </h2>
          <dl className="flex flex-col gap-2.5">
            <MetaRow label="Key">
              <Badge variant="outline" className="font-mono">
                {project.data.key}
              </Badge>
            </MetaRow>
            <MetaRow label="Status">
              {project.data.status === "archived" ? (
                <Badge variant="neutral">Archived</Badge>
              ) : (
                <Badge variant="success" dot>
                  Active
                </Badge>
              )}
            </MetaRow>
            <MetaRow label="Members">
              <span className="text-small text-foreground">{memberCount}</span>
            </MetaRow>
            <MetaRow label="Created">
              <span className="text-small text-foreground">
                {formatDate(project.data.created_at)}
              </span>
            </MetaRow>
          </dl>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <h2 className="text-mono-label font-mono text-muted-foreground">
            Linked artifacts
          </h2>
          {artifacts.length === 0 ? (
            <p className="text-caption text-muted-foreground">
              No links yet. Add Figma, docs, or PRs below.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {artifacts.map((artifact, index) => (
                <li
                  key={`${artifact.url}-${index}`}
                  className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                >
                  <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <a
                    href={artifact.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-small text-foreground hover:text-accent hover:underline"
                  >
                    {artifact.label}
                  </a>
                  <IconButton
                    aria-label={`Remove ${artifact.label}`}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => removeArtifact(index)}
                  >
                    <X />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addArtifact();
            }}
          >
            <Input
              aria-label="Link label"
              value={linkLabel}
              onChange={(event) => setLinkLabel(event.target.value)}
              placeholder="Label (optional)"
              className="h-8"
            />
            <div className="flex items-center gap-2">
              <Input
                aria-label="Link URL"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://…"
                className="h-8"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                disabled={linkUrl.trim().length === 0}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </form>
        </section>
      </aside>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="flex items-center">{children}</dd>
    </div>
  );
}
