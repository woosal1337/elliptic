import { Fragment, type ReactNode } from "react";
import Link from "next/link";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[(?:\\.|[^\]\\])+\]\([^)]+\))/g;
const LINK_PATTERN = /^\[((?:\\.|[^\]\\])+)\]\(([^)]+)\)$/;

import {
  MENTION_GLYPH,
  mentionTarget,
  parseMentionHref as parseMention,
  type MentionKind,
} from "@/lib/mentions";

function unescapeLabel(label: string): string {
  return label.replace(/\\([[\]])/g, "$1");
}

function linkKind(href: string): "internal" | "external" | "unsafe" {
  const value = href.trim();
  if (value.startsWith("//")) return "external";
  if (value.startsWith("/") || value.startsWith("#")) return "internal";
  if (/^(https?:\/\/|mailto:)/i.test(value)) return "external";
  return "unsafe";
}

function MentionLink({
  kind,
  id,
  label,
  orgId,
}: {
  kind: MentionKind;
  id: string;
  label: string;
  orgId?: string;
}) {
  const className =
    "rounded bg-accent-muted px-1 font-medium text-accent no-underline hover:underline";
  const text = `${MENTION_GLYPH[kind]}${label}`;
  const href = mentionTarget(kind, id, label, orgId);
  if (href) {
    return (
      <Link href={href} className={className}>
        {text}
      </Link>
    );
  }
  return <span className={className}>{text}</span>;
}

function renderInline(text: string, orgId?: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={index} className="rounded-xs bg-subtle px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = LINK_PATTERN.exec(part);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      const label = unescapeLabel(linkMatch[1]);
      const href = linkMatch[2];
      const mention = parseMention(href);
      if (mention) {
        return (
          <MentionLink key={index} kind={mention.kind} id={mention.id} label={label} orgId={orgId} />
        );
      }
      const kind = linkKind(href);
      if (kind === "internal") {
        return (
          <Link key={index} href={href} className="text-accent underline underline-offset-2">
            {label}
          </Link>
        );
      }
      if (kind === "external") {
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            {label}
          </a>
        );
      }
      return <Fragment key={index}>{label}</Fragment>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function Markdown({ source, orgId }: { source: string; orgId?: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] | null = null;

  const flushList = (key: number) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`list-${key}`}
        className="list-disc space-y-1 pl-5 text-small leading-relaxed text-foreground marker:text-muted-foreground"
      >
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item, orgId)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    if (codeLines !== null) {
      if (line.trimEnd() === "```") {
        blocks.push(
          <pre
            key={`code-${index}`}
            className="overflow-x-auto rounded-md bg-subtle p-3 font-mono text-caption leading-relaxed"
          >
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = null;
      } else {
        codeLines.push(line);
      }
      return;
    }
    if (line.trimEnd().startsWith("```")) {
      flushList(index);
      codeLines = [];
      return;
    }
    const listMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listMatch && listMatch[1] !== undefined) {
      listItems.push(listMatch[1]);
      return;
    }
    flushList(index);
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch && headingMatch[1] && headingMatch[2] !== undefined) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], orgId);
      if (level === 1) {
        blocks.push(
          <h1 key={index} className="text-h4 font-semibold tracking-[-0.01em] text-foreground">
            {content}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={index} className="text-body font-semibold text-foreground">
            {content}
          </h2>
        );
      } else {
        blocks.push(
          <h3 key={index} className="text-small font-semibold text-foreground">
            {content}
          </h3>
        );
      }
      return;
    }
    if (line.trim().length === 0) {
      return;
    }
    blocks.push(
      <p key={index} className="text-small leading-relaxed text-foreground">
        {renderInline(line, orgId)}
      </p>
    );
  });
  flushList(lines.length);

  if (blocks.length === 0) {
    return <p className="text-small text-muted-foreground">Nothing here yet.</p>;
  }

  return <div className="flex flex-col gap-3">{blocks}</div>;
}

export function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[((?:\\.|[^\]\\])+)\]\(([^)]+)\)/g, (_match, rawLabel: string, href: string) => {
      const label = unescapeLabel(rawLabel);
      const mention = parseMention(href);
      return mention ? `${MENTION_GLYPH[mention.kind]}${label}` : label;
    })
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
