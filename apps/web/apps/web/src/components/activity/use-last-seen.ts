"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "elliptic:activity:last-seen";

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}:${orgId}`;
}

function read(orgId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(orgId));
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export interface LastSeen {
  lastSeen: number | null;
  ready: boolean;
  markSeen: () => void;
}

export function useLastSeen(orgId: string): LastSeen {
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLastSeen(read(orgId));
    setReady(true);
  }, [orgId]);

  const markSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(orgId), String(Date.now()));
  }, [orgId]);

  return { lastSeen, ready, markSeen };
}
