"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

function findScroller(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

interface AvailableHeightOptions {
  /** Space to leave free below the element, e.g. the page's bottom padding. */
  gutter?: number;
  /** Floor, so a short window still leaves the surface usable. */
  min?: number;
}

/**
 * How tall an element can grow before it pushes its scroll container past the
 * fold. Measured rather than hard-coded as `calc(100dvh - …)` because the chrome
 * above the element — page header, toolbars that wrap on narrow screens — has no
 * fixed height. Null until the first measurement.
 */
export function useAvailableHeight(
  ref: React.RefObject<HTMLElement | null>,
  { gutter = 0, min = 240 }: AvailableHeightOptions = {}
): number | null {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const scroller = useCallback(() => {
    const element = ref.current;
    if (!element) return null;
    const cached = scrollerRef.current;
    if (!cached || !cached.isConnected || !cached.contains(element)) {
      scrollerRef.current = findScroller(element);
    }
    return scrollerRef.current;
  }, [ref]);

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const box = scroller();
    // Offset from the top of the scrolled content rather than the viewport, so
    // the answer stays put while the container scrolls.
    const top = box
      ? element.getBoundingClientRect().top -
        box.getBoundingClientRect().top -
        box.clientTop +
        box.scrollTop
      : element.getBoundingClientRect().top + window.scrollY;
    const visible = box ? box.clientHeight : window.innerHeight;
    const next = Math.max(min, Math.round(visible - top - gutter));
    setHeight((current) => (current === next ? current : next));
  }, [ref, scroller, gutter, min]);

  // No dependency array: anything rendered above the element moves it, and that
  // can happen on any render. Re-measuring is two rect reads and only commits
  // when the number actually changes.
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const box = scroller();
    const observer = new ResizeObserver(measure);
    if (box) observer.observe(box);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, scroller]);

  return height;
}
