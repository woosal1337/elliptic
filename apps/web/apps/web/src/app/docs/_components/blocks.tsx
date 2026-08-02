import { Fragment, type ReactNode } from "react";
import { Info, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@elliptic/ui";
import type { DocBlock } from "../_content/types";

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(<Fragment key={key++}>{text.slice(last, start)}</Fragment>);
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded-sm border border-border bg-subtle px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const close = token.indexOf("](");
      const label = token.slice(1, close);
      const url = token.slice(close + 2, -1);
      const external = /^https?:\/\//.test(url);
      nodes.push(
        <a
          key={key++}
          href={url}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="text-accent underline-offset-4 transition-colors duration-150 hover:underline"
        >
          {label}
        </a>,
      );
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(<Fragment key={key}>{text.slice(last)}</Fragment>);
  return nodes;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

const CALLOUT = {
  info: { Icon: Info, ring: "border-info/30 bg-info-muted", icon: "text-info" },
  tip: { Icon: Lightbulb, ring: "border-success/30 bg-success-muted", icon: "text-success" },
  warning: {
    Icon: AlertTriangle,
    ring: "border-warning/30 bg-warning-muted",
    icon: "text-warning",
  },
} as const;

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "h2": {
      const id = slugify(block.text ?? "");
      return (
        <h2
          id={id}
          className="scroll-mt-24 font-display text-h2 font-semibold tracking-[-0.02em] text-foreground first:mt-0 mt-12"
        >
          {parseInline(block.text ?? "")}
        </h2>
      );
    }
    case "h3": {
      if (!block.text?.trim()) return null;
      const id = slugify(block.text);
      return (
        <h3
          id={id}
          className="scroll-mt-24 font-display text-h3 font-semibold tracking-[-0.01em] text-foreground mt-8"
        >
          {parseInline(block.text)}
        </h3>
      );
    }
    case "p":
      return (
        <p className="mt-4 text-body leading-relaxed text-muted-foreground">
          {parseInline(block.text ?? "")}
        </p>
      );
    case "ul":
      return (
        <ul className="mt-4 flex flex-col gap-2 text-body text-muted-foreground">
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="flex gap-2.5 leading-relaxed">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent/70" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 flex flex-col gap-2 text-body text-muted-foreground">
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="flex gap-2.5 leading-relaxed">
              <span
                aria-hidden
                className="mt-0.5 w-4 shrink-0 font-mono text-small text-foreground/70 tabular"
              >
                {i + 1}.
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    case "steps":
      return (
        <ol className="mt-5 flex flex-col gap-4">
          {(block.steps ?? []).map((step, i) => (
            <li key={i} className="flex gap-4">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent-subtle bg-accent-muted font-mono text-small font-medium text-accent tabular"
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="text-body font-medium text-foreground">
                  {parseInline(step.title)}
                </div>
                <div className="mt-1 text-small leading-relaxed text-muted-foreground">
                  {parseInline(step.text)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <div className="mt-5 overflow-hidden rounded-lg border border-border bg-canvas">
          {block.lang ? (
            <div className="border-b border-border bg-surface px-4 py-2 font-mono text-mono-label text-muted-foreground">
              {block.lang}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-4 font-mono text-small leading-relaxed text-foreground">
            <code>{block.code ?? ""}</code>
          </pre>
        </div>
      );
    case "callout": {
      const variant = block.variant ?? "info";
      const { Icon, ring, icon } = CALLOUT[variant];
      return (
        <div className={cn("mt-5 flex gap-3 rounded-lg border p-4", ring)}>
          <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden />
          <div className="min-w-0">
            {block.title ? (
              <div className="text-small font-semibold text-foreground">{block.title}</div>
            ) : null}
            <div className="mt-1 text-small leading-relaxed text-muted-foreground">
              {parseInline(block.text ?? "")}
            </div>
          </div>
        </div>
      );
    }
    case "table":
      return (
        <div className="mt-5 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-small">
            <thead>
              <tr className="border-b border-border bg-surface">
                {(block.headers ?? []).map((header, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left font-semibold text-foreground"
                  >
                    {parseInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(block.rows ?? []).map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 align-top">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        "px-4 py-2.5 leading-relaxed text-muted-foreground",
                        ci === 0 && "font-medium text-foreground",
                      )}
                    >
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export function Blocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="text-foreground">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
