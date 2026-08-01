export type DefaultHome = "inbox" | "my-tasks" | "projects" | "activity";

export interface DefaultHomeOption {
  value: DefaultHome;
  label: string;
}

export const DEFAULT_HOME_OPTIONS: readonly DefaultHomeOption[] = [
  { value: "projects", label: "Projects" },
  { value: "inbox", label: "Inbox" },
  { value: "my-tasks", label: "My Tasks" },
  { value: "activity", label: "Activity" },
] as const;

export const FALLBACK_DEFAULT_HOME: DefaultHome = "projects";

const STORAGE_KEY = "elliptic:default-home";

const VALID_VALUES = new Set<DefaultHome>(
  DEFAULT_HOME_OPTIONS.map((option) => option.value)
);

function isDefaultHome(value: string): value is DefaultHome {
  return VALID_VALUES.has(value as DefaultHome);
}

export function getDefaultHome(): DefaultHome {
  if (typeof window === "undefined") return FALLBACK_DEFAULT_HOME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isDefaultHome(raw)) return raw;
  } catch {
    return FALLBACK_DEFAULT_HOME;
  }
  return FALLBACK_DEFAULT_HOME;
}

export function setDefaultHome(value: DefaultHome): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
}

export function defaultHomePath(orgId: string, home: DefaultHome): string {
  const base = `/app/${orgId}`;
  switch (home) {
    case "inbox":
      return `${base}/inbox`;
    case "my-tasks":
      return `${base}/my-tasks`;
    case "activity":
      return `${base}/activity`;
    case "projects":
    default:
      return `${base}/projects`;
  }
}
