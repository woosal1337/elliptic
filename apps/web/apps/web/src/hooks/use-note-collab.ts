"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { api } from "@/lib/api";

export interface NoteCollab {
  doc: Y.Doc;
  provider: WebsocketProvider;
  user: { name: string; color: string };
}

const COLORS = [
  "#F5F5F5", "#DCDCDC", "#C4C4C4", "#ADADAD", "#9A9A9A",
  "#8A8A8A", "#7C7C7C", "#6E6E6E", "#616161", "#545454",
];
function colorFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length]!;
}

function realtimeBase(): string | null {
  const explicit = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (typeof window === "undefined") return null;
  return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
}

export function useNoteCollab(
  noteId: string,
  userId: string | undefined,
  userName: string | undefined,
  enabled = true
): NoteCollab | null {
  const [collab, setCollab] = useState<NoteCollab | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;
    const base = realtimeBase();
    if (!base) return;

    let provider: WebsocketProvider | null = null;
    let doc: Y.Doc | null = null;
    let cancelled = false;

    void (async () => {
      let token: string;
      try {
        const res = await api.get<{ token: string }>("/api/v1/realtime/token");
        token = res.token;
      } catch {
        return;
      }
      if (cancelled) return;

      doc = new Y.Doc();
      provider = new WebsocketProvider(`${base}/api/v1/ws/notes`, noteId, doc, {
        params: { token },
        connect: true,
      });
      const user = { name: userName || "Someone", color: colorFor(userId) };
      provider.awareness.setLocalStateField("user", user);
      setCollab({ doc, provider, user });
    })();

    return () => {
      cancelled = true;
      provider?.destroy();
      doc?.destroy();
      setCollab(null);
    };
  }, [noteId, userId, userName, enabled]);

  return collab;
}
