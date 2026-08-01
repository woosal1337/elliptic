const LAST_ORG_KEY = "elliptic:last-org-id";
const RECENT_COMMANDS_KEY = "elliptic:recent-commands";
const MAX_RECENT_COMMANDS = 5;

export function getRecentCommandIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function pushRecentCommandId(id: string): string[] {
  const next = [id, ...getRecentCommandIds().filter((value) => value !== id)].slice(
    0,
    MAX_RECENT_COMMANDS
  );
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
    } catch {
      return next;
    }
  }
  return next;
}

export function getLastOrgId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_ORG_KEY);
  } catch {
    return null;
  }
}

export function setLastOrgId(orgId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ORG_KEY, orgId);
  } catch {
    return;
  }
}

export function clearLastOrgId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LAST_ORG_KEY);
  } catch {
    return;
  }
}
