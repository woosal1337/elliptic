"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Kbd,
} from "@elliptic/ui";
import {
  formatKeysForDisplay,
  useKeyboard,
  useShortcut,
  type ShortcutBinding,
  type ShortcutScope,
} from "@/lib/keyboard";

const SCOPE_ORDER: ShortcutScope[] = ["global", "navigation", "action"];

const SCOPE_HEADINGS: Record<ShortcutScope, string> = {
  global: "General",
  navigation: "Navigation",
  action: "Task actions",
};

interface ShortcutGroup {
  scope: ShortcutScope;
  heading: string;
  items: { id: string; label: string; tokens: string[] }[];
}

function groupBindings(bindings: ShortcutBinding[]): ShortcutGroup[] {
  const seen = new Set<string>();
  const byScope = new Map<ShortcutScope, ShortcutGroup["items"]>();

  for (const binding of bindings) {
    const dedupeKey = `${binding.scope}:${binding.label}:${binding.keys}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const tokens = formatKeysForDisplay(binding.keys);
    const list = byScope.get(binding.scope) ?? [];
    list.push({ id: binding.id, label: binding.label, tokens });
    byScope.set(binding.scope, list);
  }

  return SCOPE_ORDER.flatMap((scope) => {
    const items = byScope.get(scope);
    if (!items || items.length === 0) return [];
    items.sort((a, b) => a.label.localeCompare(b.label));
    return [{ scope, heading: SCOPE_HEADINGS[scope], items }];
  });
}

export function ShortcutHelp() {
  const { list, setSuppressed } = useKeyboard();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ShortcutGroup[]>([]);

  useShortcut(
    { id: "help-open", keys: "?", label: "Open keyboard shortcuts", scope: "global" },
    () => setOpen((value) => !value)
  );

  useEffect(() => {
    if (!open) {
      setSuppressed(false);
      return;
    }
    setGroups(groupBindings(list()));
    setSuppressed(true);
    return () => setSuppressed(false);
  }, [open, list, setSuppressed]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="lg" className="max-h-[80dvh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-muted-foreground" aria-hidden="true" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> anytime to open this list. Press <Kbd>Esc</Kbd> to close.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-2 grid max-h-[60dvh] grid-cols-1 gap-x-8 gap-y-6 overflow-y-auto px-2 sm:grid-cols-2">
          {groups.length === 0 ? (
            <p className="text-small text-muted-foreground">No shortcuts available here.</p>
          ) : (
            groups.map((group) => (
              <section key={group.scope} className="flex flex-col gap-1.5">
                <h3 className="text-mono-label font-mono uppercase tracking-wider text-muted-foreground">
                  {group.heading}
                </h3>
                <ul className="flex flex-col">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 py-1.5 text-small text-foreground/90"
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.tokens.map((token, index) => (
                          <Kbd key={`${item.id}-${index}`}>{token}</Kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
