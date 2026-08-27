import { Fragment, type ReactNode } from "react";
import Link from "next/link";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[(?:\\.|[^\]\\])+\]\([^)]+\))/g;
const LINK_PATTERN = /^\[((?:\\.|[^\]\\])+)\]\(([^)]+)\)$/;
const DELIMITER_CELL = /^:?-+:?$/;
const DIVIDER_LINE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
const BULLET_LINE = /^\s*[-*]\s+(.*)$/;
const ORDERED_LINE = /^\s*\d{1,9}[.)]\s+(.*)$/;
const QUOTE_LINE = /^\s*>\s?(.*)$/;

import {
  MENTION_GLYPH,
  mentionTarget,
  parseMentionHref as parseMention,
  type MentionKind,
} from "@/lib/mentions";

type CellAlign = "left" | "center" | "right";

interface TableBlock {
  header: string[];
  aligns: CellAlign[];
  rows: string[][];
  next: number;
}

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

function hasPipe(line: string): boolean {
  return /(?:^|[^\\])\|/.test(line);
}

function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\\" && line[index + 1] === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  if (cells.length > 1 && cells[0]?.trim() === "") cells.shift();
  if (cells.length > 1 && cells[cells.length - 1]?.trim() === "") cells.pop();
  return cells.map((cell) => cell.trim());
}

function alignOf(cell: string): CellAlign {
  const starts = cell.startsWith(":");
  const ends = cell.endsWith(":");
  if (starts && ends) return "center";
  if (ends) return "right";
  return "left";
}

function readTable(lines: string[], start: number): TableBlock | null {
  const headerLine = lines[start];
  const delimiterLine = lines[start + 1];
  if (headerLine === undefined || delimiterLine === undefined) return null;
  if (!hasPipe(headerLine) || !hasPipe(delimiterLine)) return null;

  const header = splitRow(headerLine);
  const delimiters = splitRow(delimiterLine);
  if (header.length < 1 || header.length !== delimiters.length) return null;
  if (!delimiters.every((cell) => DELIMITER_CELL.test(cell))) return null;

  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length) {
    const line = lines[index];
    if (line === undefined || line.trim().length === 0 || !hasPipe(line)) break;
    const cells = splitRow(line);
    rows.push(header.map((_, column) => cells[column] ?? ""));
    index += 1;
  }

  return { header, aligns: delimiters.map(alignOf), rows, next: index };
}

function startsBlock(lines: string[], index: number): boolean {
  const line = lines[index];
  if (line === undefined) return true;
  if (line.trim().length === 0) return true;
  if (line.trimEnd().startsWith("```")) return true;
  if (DIVIDER_LINE.test(line)) return true;
  if (BULLET_LINE.test(line)) return true;
  if (ORDERED_LINE.test(line)) return true;
  if (QUOTE_LINE.test(line)) return true;
  if (HEADING_LINE.test(line)) return true;
  return readTable(lines, index) !== null;
}

function readContinuation(lines: string[], start: number): { text: string; next: number } {
  const parts: string[] = [];
  let index = start;
  while (index < lines.length && !startsBlock(lines, index)) {
    parts.push((lines[index] ?? "").trim());
    index += 1;
  }
  return { text: parts.join(" "), next: index };
}

const ALIGN_CLASS: Record<CellAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function TableBlockView({
  block,
  orgId,
}: {
  block: TableBlock;
  orgId?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-small leading-relaxed text-foreground">
        <thead>
          <tr>
            {block.header.map((cell, column) => (
              <th
                key={column}
                className={`border border-border bg-subtle px-3 py-1.5 font-semibold ${
                  ALIGN_CLASS[block.aligns[column] ?? "left"]
                }`}
              >
                {renderInline(cell, orgId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, column) => (
                <td
                  key={column}
                  className={`border border-border px-3 py-1.5 align-top ${
                    ALIGN_CLASS[block.aligns[column] ?? "left"]
                  }`}
                >
                  {renderInline(cell, orgId)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Markdown({ source, orgId }: { source: string; orgId?: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const key = blocks.length;

    if (line.trimEnd().startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && (lines[index] ?? "").trimEnd() !== "```") {
        code.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre
          key={`code-${key}`}
          className="overflow-x-auto rounded-md bg-subtle p-3 font-mono text-caption leading-relaxed"
        >
          {code.join("\n")}
        </pre>
      );
      continue;
    }

    const table = readTable(lines, index);
    if (table) {
      blocks.push(<TableBlockView key={`table-${key}`} block={table} orgId={orgId} />);
      index = table.next;
      continue;
    }

    if (DIVIDER_LINE.test(line)) {
      blocks.push(<hr key={`divider-${key}`} className="border-border" />);
      index += 1;
      continue;
    }

    const bullet = BULLET_LINE.exec(line);
    if (bullet) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = BULLET_LINE.exec(lines[index] ?? "");
        if (!match || match[1] === undefined) break;
        const rest = readContinuation(lines, index + 1);
        items.push(rest.text ? `${match[1]} ${rest.text}` : match[1]);
        index = rest.next;
      }
      blocks.push(
        <ul
          key={`list-${key}`}
          className="list-disc space-y-1 pl-5 text-small leading-relaxed text-foreground marker:text-muted-foreground"
        >
          {items.map((item, position) => (
            <li key={position}>{renderInline(item, orgId)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const ordered = ORDERED_LINE.exec(line);
    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = ORDERED_LINE.exec(lines[index] ?? "");
        if (!match || match[1] === undefined) break;
        const rest = readContinuation(lines, index + 1);
        items.push(rest.text ? `${match[1]} ${rest.text}` : match[1]);
        index = rest.next;
      }
      blocks.push(
        <ol
          key={`ordered-${key}`}
          className="list-decimal space-y-1 pl-5 text-small leading-relaxed text-foreground marker:text-muted-foreground"
        >
          {items.map((item, position) => (
            <li key={position}>{renderInline(item, orgId)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const quote = QUOTE_LINE.exec(line);
    if (quote) {
      const quoted: string[] = [];
      while (index < lines.length) {
        const match = QUOTE_LINE.exec(lines[index] ?? "");
        if (!match || match[1] === undefined) break;
        const rest = readContinuation(lines, index + 1);
        quoted.push(rest.text ? `${match[1]} ${rest.text}` : match[1]);
        index = rest.next;
      }
      blocks.push(
        <blockquote
          key={`quote-${key}`}
          className="border-l-2 border-border pl-3 text-small leading-relaxed text-muted-foreground"
        >
          {quoted.map((item, position) => (
            <p key={position}>{renderInline(item, orgId)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const heading = HEADING_LINE.exec(line);
    if (heading && heading[1] && heading[2] !== undefined) {
      const level = heading[1].length;
      const content = renderInline(heading[2], orgId);
      if (level === 1) {
        blocks.push(
          <h1 key={`heading-${key}`} className="text-h4 font-semibold tracking-[-0.01em] text-foreground">
            {content}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={`heading-${key}`} className="text-body font-semibold text-foreground">
            {content}
          </h2>
        );
      } else {
        blocks.push(
          <h3 key={`heading-${key}`} className="text-small font-semibold text-foreground">
            {content}
          </h3>
        );
      }
      index += 1;
      continue;
    }

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    const paragraph = readContinuation(lines, index);
    blocks.push(
      <p key={`paragraph-${key}`} className="text-small leading-relaxed text-foreground">
        {renderInline(paragraph.text, orgId)}
      </p>
    );
    index = paragraph.next;
  }

  if (blocks.length === 0) {
    return <p className="text-small text-muted-foreground">Nothing here yet.</p>;
  }

  return <div className="flex flex-col gap-3">{blocks}</div>;
}

export function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^[\s|:-]*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[((?:\\.|[^\]\\])+)\]\(([^)]+)\)/g, (_match, rawLabel: string, href: string) => {
      const label = unescapeLabel(rawLabel);
      const mention = parseMention(href);
      return mention ? `${MENTION_GLYPH[mention.kind]}${label}` : label;
    })
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d{1,9}[.)]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
