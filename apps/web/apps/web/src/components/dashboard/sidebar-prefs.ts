"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SidebarSection = "personal" | "team";

export interface SidebarItemDef {
  key: string;
  label: string;
  segment: string;
  section: SidebarSection;
}

export const SIDEBAR_ITEMS: readonly SidebarItemDef[] = [
  { key: "my-tasks", label: "My Tasks", segment: "my-tasks", section: "personal" },
  { key: "inbox", label: "Inbox", segment: "inbox", section: "personal" },
  { key: "assistant", label: "Assistant", segment: "assistant", section: "personal" },
  { key: "triage", label: "Triage", segment: "triage", section: "personal" },
  { key: "notes", label: "Notes", segment: "notes", section: "personal" },
  { key: "stickies", label: "Stickies", segment: "stickies", section: "personal" },
  { key: "projects", label: "Projects", segment: "projects", section: "team" },
  { key: "initiatives", label: "Initiatives", segment: "initiatives", section: "team" },
  { key: "releases", label: "Releases", segment: "releases", section: "team" },
  { key: "customers", label: "Customers", segment: "customers", section: "team" },
  { key: "meetings", label: "Meetings", segment: "meetings", section: "team" },
  { key: "calendar", label: "Calendar", segment: "calendar", section: "team" },
  { key: "activity", label: "Activity", segment: "activity", section: "team" },
  { key: "query", label: "Query", segment: "query", section: "team" },
  { key: "dashboards", label: "Dashboards", segment: "dashboards", section: "team" },
  { key: "settings", label: "Settings", segment: "settings", section: "team" },
] as const;

const ITEM_KEYS = SIDEBAR_ITEMS.map((item) => item.key);

// Only the most-used items live in the sidebar by default; everything else starts
// in the collapsible "More" section. Users can still pin/hide/reorder from there.
const DEFAULT_HIDDEN: readonly string[] = [
  "assistant",
  "triage",
  "stickies",
  "initiatives",
  "releases",
  "customers",
  "meetings",
  "calendar",
  "query",
  "dashboards",
];

export interface SidebarPrefs {
  order: string[];
  hidden: string[];
}

function defaults(): SidebarPrefs {
  return {
    order: [...ITEM_KEYS],
    hidden: [...DEFAULT_HIDDEN],
  };
}

const STORAGE_KEY = "elliptic:sidebar";
// Bump when the curated default changes so existing installs migrate once.
const PREFS_VERSION = 2;

function isKnownKey(value: unknown): value is string {
  return typeof value === "string" && ITEM_KEYS.includes(value);
}

function reconcile(order: string[], hidden: string[]): SidebarPrefs {
  const seen = new Set<string>();
  const cleanOrder: string[] = [];
  for (const key of order) {
    if (isKnownKey(key) && !seen.has(key)) {
      seen.add(key);
      cleanOrder.push(key);
    }
  }
  for (const key of ITEM_KEYS) {
    if (!seen.has(key)) {
      seen.add(key);
      cleanOrder.push(key);
    }
  }
  const hiddenSet = new Set<string>();
  for (const key of hidden) {
    if (isKnownKey(key)) hiddenSet.add(key);
  }
  return { order: cleanOrder, hidden: [...hiddenSet] };
}

function read(): SidebarPrefs {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs> & { version?: number };
    const order = Array.isArray(parsed.order) ? parsed.order : [];
    let hidden = Array.isArray(parsed.hidden) ? parsed.hidden : [];
    // One-time migration to the curated default: installs from before the default
    // was curated (no version) that never hid anything adopt DEFAULT_HIDDEN once.
    // Anyone who deliberately curated visibility keeps their own choice.
    if (parsed.version !== PREFS_VERSION) {
      if (hidden.length === 0) hidden = [...DEFAULT_HIDDEN];
      const migrated = reconcile(order, hidden);
      write(migrated);
      return migrated;
    }
    return reconcile(order, hidden);
  } catch {
    return defaults();
  }
}

function write(prefs: SidebarPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, version: PREFS_VERSION }));
  } catch {
    return;
  }
}

export interface ResolvedSidebarItem extends SidebarItemDef {
  hidden: boolean;
}

export interface UseSidebarPrefs {
  visible: ResolvedSidebarItem[];
  hiddenItems: ResolvedSidebarItem[];
  isHidden: (key: string) => boolean;
  hide: (key: string) => void;
  show: (key: string) => void;
  pinToTop: (key: string) => void;
  reorder: (key: string, beforeKey: string | null) => void;
  reset: () => void;
}

export function useSidebarPrefs(): UseSidebarPrefs {
  const [prefs, setPrefs] = useState<SidebarPrefs>(defaults);

  useEffect(() => {
    setPrefs(read());
  }, []);

  const apply = useCallback((next: SidebarPrefs) => {
    const reconciled = reconcile(next.order, next.hidden);
    write(reconciled);
    setPrefs(reconciled);
  }, []);

  const hide = useCallback(
    (key: string) =>
      setPrefs((current) => {
        if (!isKnownKey(key) || current.hidden.includes(key)) return current;
        const next = { order: current.order, hidden: [...current.hidden, key] };
        const reconciled = reconcile(next.order, next.hidden);
        write(reconciled);
        return reconciled;
      }),
    []
  );

  const show = useCallback(
    (key: string) =>
      setPrefs((current) => {
        if (!current.hidden.includes(key)) return current;
        const next = { order: current.order, hidden: current.hidden.filter((k) => k !== key) };
        const reconciled = reconcile(next.order, next.hidden);
        write(reconciled);
        return reconciled;
      }),
    []
  );

  const pinToTop = useCallback(
    (key: string) =>
      setPrefs((current) => {
        if (!isKnownKey(key)) return current;
        const order = [key, ...current.order.filter((k) => k !== key)];
        const hidden = current.hidden.filter((k) => k !== key);
        const reconciled = reconcile(order, hidden);
        write(reconciled);
        return reconciled;
      }),
    []
  );

  const reorder = useCallback(
    (key: string, beforeKey: string | null) =>
      setPrefs((current) => {
        if (!isKnownKey(key) || key === beforeKey) return current;
        const without = current.order.filter((k) => k !== key);
        if (beforeKey === null) {
          without.push(key);
        } else {
          const index = without.indexOf(beforeKey);
          if (index === -1) {
            without.push(key);
          } else {
            without.splice(index, 0, key);
          }
        }
        const reconciled = reconcile(without, current.hidden);
        write(reconciled);
        return reconciled;
      }),
    []
  );

  const reset = useCallback(() => apply(defaults()), [apply]);

  return useMemo(() => {
    const byKey = new Map(SIDEBAR_ITEMS.map((item) => [item.key, item]));
    const hiddenSet = new Set(prefs.hidden);
    const ordered: ResolvedSidebarItem[] = [];
    for (const key of prefs.order) {
      const def = byKey.get(key);
      if (def) ordered.push({ ...def, hidden: hiddenSet.has(key) });
    }
    return {
      visible: ordered.filter((item) => !item.hidden),
      hiddenItems: ordered.filter((item) => item.hidden),
      isHidden: (key: string) => hiddenSet.has(key),
      hide,
      show,
      pinToTop,
      reorder,
      reset,
    };
  }, [prefs, hide, show, pinToTop, reorder, reset]);
}
