export type PaletteEntityKind = "project" | "meeting" | "note" | "task";

export interface PaletteEntity {
  kind: PaletteEntityKind;
  id: string;
  label: string;
  hint: string | null;
  keywords: string[];
  route: string;
}

/**
 * The cached payloads to mine, one array per entity kind. Each array is the
 * `data` of every query the palette matched, and a query key matches by
 * prefix: `["orgs", orgId, "tasks"]` also selects the single-task query, whose
 * data is one object rather than a list. Anything that is not an array of
 * records is dropped here instead of throwing at the call site.
 */
export interface PaletteCacheGroups {
  projects: readonly unknown[];
  meetings: readonly unknown[];
  notes: readonly unknown[];
  tasks: readonly unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function records(group: readonly unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const data of group) {
    if (!Array.isArray(data)) continue;
    for (const item of data) {
      if (isRecord(item)) out.push(item);
    }
  }
  return out;
}

export function collectPaletteEntities(groups: PaletteCacheGroups): PaletteEntity[] {
  const entities: PaletteEntity[] = [];
  const seen = new Set<string>();

  const push = (entity: PaletteEntity) => {
    const key = `${entity.kind}-${entity.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push(entity);
  };

  for (const project of records(groups.projects)) {
    const id = text(project.id);
    const label = text(project.name);
    if (!id || !label) continue;
    const projectKey = text(project.key);
    push({
      kind: "project",
      id,
      label,
      hint: projectKey,
      keywords: projectKey ? [projectKey, "project"] : ["project"],
      route: `/projects/${id}`,
    });
  }

  for (const meeting of records(groups.meetings)) {
    const id = text(meeting.id);
    const label = text(meeting.title);
    if (!id || !label) continue;
    push({
      kind: "meeting",
      id,
      label,
      hint: "Meeting",
      keywords: ["meeting"],
      route: `/meetings/${id}`,
    });
  }

  for (const note of records(groups.notes)) {
    const id = text(note.id);
    const label = text(note.title);
    if (!id || !label) continue;
    push({
      kind: "note",
      id,
      label,
      hint: "Note",
      keywords: ["note"],
      route: `/notes/${id}`,
    });
  }

  for (const task of records(groups.tasks)) {
    const id = text(task.id);
    const label = text(task.title);
    const projectId = text(task.project_id);
    if (!id || !label || !projectId) continue;
    const identifier = text(task.identifier);
    push({
      kind: "task",
      id,
      label,
      hint: identifier,
      keywords: identifier ? [identifier, "task"] : ["task"],
      route: `/projects/${projectId}?task=${id}`,
    });
  }

  return entities;
}
