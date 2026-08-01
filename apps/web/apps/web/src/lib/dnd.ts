export const ENTITY_DND_MIME = "application/x-elliptic-entity";

export type EntityRefKind = "task" | "meeting" | "note" | "decision";

export interface EntityRef {
  kind: EntityRefKind;
  id: string;
  title: string;
  href: string | null;
}

export function entityHref(orgId: string, kind: EntityRefKind, id: string): string | null {
  switch (kind) {
    case "meeting":
      return `/app/${orgId}/meetings/${id}`;
    case "note":
      return `/app/${orgId}/notes/${id}`;
    default:
      return null;
  }
}

export function serializeEntityRef(ref: EntityRef): string {
  return JSON.stringify(ref);
}

export function parseEntityRef(raw: string | null | undefined): EntityRef | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EntityRef>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.kind !== "string"
    ) {
      return null;
    }
    return {
      kind: parsed.kind as EntityRefKind,
      id: parsed.id,
      title: parsed.title,
      href: typeof parsed.href === "string" ? parsed.href : null,
    };
  } catch {
    return null;
  }
}

export function citationHtml(ref: EntityRef): string {
  const label = escapeHtml(`${ref.title}`);
  if (ref.href) {
    return `<a href="${escapeHtml(ref.href)}" data-entity-kind="${ref.kind}" data-entity-id="${escapeHtml(ref.id)}">${label}</a>&nbsp;`;
  }
  return `${label}&nbsp;`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
