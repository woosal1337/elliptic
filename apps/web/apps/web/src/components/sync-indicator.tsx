"use client";

import { useEffect, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@elliptic/ui";

const SHOW_DELAY_MS = 400;
const MIN_VISIBLE_MS = 600;

const DOT_DELAYS = [
  0, 480, 160, 720, 600, 240, 880, 360, 320, 800, 80, 560, 920, 400, 680, 200,
] as const;

export function SyncIndicator() {
  const active = useIsFetching() + useIsMutating();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef<number>(0);

  useEffect(() => {
    if (active > 0) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (!visible && !showTimer.current) {
        showTimer.current = setTimeout(() => {
          showTimer.current = null;
          shownAt.current = Date.now();
          setVisible(true);
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (visible && !hideTimer.current) {
      const elapsed = Date.now() - shownAt.current;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimer.current = setTimeout(() => {
        hideTimer.current = null;
        setVisible(false);
      }, remaining);
    }
  }, [active, visible]);

  useEffect(
    () => () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  if (!visible) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-caption text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-label="Syncing latest changes"
        >
          <div className="grid grid-cols-4 gap-[2px]">
            {DOT_DELAYS.map((delay, i) => (
              <span
                key={i}
                className="sync-dot size-1 rounded-full bg-muted-foreground"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <span className="font-medium">Syncing</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">Syncing latest changes</p>
        <p className="mt-0.5 font-normal text-background/70">
          Fetching recent changes from Elliptic.
        </p>
      </TooltipContent>

      <style>{`
        @keyframes sync-dot-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes sync-dot-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .sync-dot {
          opacity: 0.35;
          animation: sync-dot-twinkle 1200ms ease-in-out infinite;
          will-change: opacity, transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .sync-dot {
            animation: sync-dot-pulse 1600ms ease-in-out infinite;
            animation-delay: 0ms !important;
          }
        }
      `}</style>
    </Tooltip>
  );
}
