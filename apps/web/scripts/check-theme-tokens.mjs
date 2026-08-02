#!/usr/bin/env node
//
// Fail the build on colour utilities that name a token the theme does not
// define.
//
// Tailwind v4 resolves `bg-foo` against the `@theme` block at build time. When
// `--color-foo` does not exist it emits **nothing at all** — no warning, no
// error, exit code 0 — and the element renders with a transparent background
// that looks plausible enough to ship. We have shipped it twice: once renaming
// a token without renaming its uses, once building a class name by string
// concatenation so Tailwind never saw it in the source to begin with.
//
// So: every `bg-`/`border-`/`ring-`/`fill-`/`stroke-`/`divide-`/`text-` class in
// our source must name either a token declared in styles.css or one of the
// CSS-wide keywords below. Anything else is a typo or a stale rename.
//
//   node scripts/check-theme-tokens.mjs

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const THEME = join(ROOT, "packages/ui/src/styles.css");

// Colours that are not tokens: CSS-wide keywords Tailwind always understands.
const KEYWORDS = new Set(["transparent", "current", "inherit", "white", "black"]);

// Utilities whose value is a colour token. `text-` is overloaded — it also
// takes font sizes — so its allowed set is the union of both token families.
// `from-`/`via-`/`to-` are deliberately absent: gradient stops are rare here and
// they collide with ordinary English ("day-to-day", "from-address"), which
// would make the check noisy enough to be ignored.
const COLOUR_PREFIXES = ["bg", "border", "ring", "fill", "stroke", "divide", "outline", "caret"];

function tokens(prefix) {
  const css = readFileSync(THEME, "utf8");
  const found = new Set();
  const re = new RegExp(`--${prefix}-([a-z0-9-]+)\\s*:`, "g");
  let m;
  while ((m = re.exec(css)) !== null) found.add(m[1]);
  return found;
}

const colours = tokens("color");
const fontSizes = tokens("text");

// Utilities hand-written as plain CSS classes (`.bg-dot-grid { … }`) are real
// even though no token backs them.
const handWritten = new Set(
  [...readFileSync(THEME, "utf8").matchAll(/^\s*\.([a-z][a-z0-9-]*)\s*\{/gm)].map((m) => m[1])
);
if (colours.size === 0) {
  console.error(`no --color-* tokens found in ${THEME} — has the theme moved?`);
  process.exit(2);
}

// Only our own source. Generated CSS and dependencies are not ours to police.
const files = execFileSync(
  "git",
  ["ls-files", "*.tsx", "*.ts", "*.jsx", "*.js"],
  { cwd: ROOT, encoding: "utf8" }
)
  .split("\n")
  .filter(
    (f) =>
      f &&
      !f.includes("node_modules") &&
      !f.endsWith(".d.ts") &&
      // Documentation bodies are English prose in template literals, not markup.
      !f.includes("/docs/_content/") &&
      !f.includes("/llms")
  );

// A utility, optionally behind variants (hover:, dark:, group-hover/x:) and
// optionally carrying an opacity modifier (/50). Arbitrary values in brackets
// and CSS variables are Tailwind's business, not ours.
// The leading guard rejects `--border-strong` (a custom property named in a
// test) and `background-color` (half of a CSS property): a utility never has a
// letter or hyphen immediately before it.
const USAGE = new RegExp(
  `(?<![\\w-])(?:[a-z0-9-]+(?:/[a-z0-9-]+)?:)*(${[...COLOUR_PREFIXES, "text"].join("|")})-` +
    `([a-z][a-z0-9-]*)(?:/\\d+)?\\b`,
  "g"
);

// Tailwind ships these families itself; they are not theme tokens but are
// legitimate. Anything matching `<name>-<number>` is a stock palette shade.
const STOCK_SUFFIX = /^(?:[a-z]+)-\d{2,3}$/;
// `border-t-2`, `divide-x-0`: a side plus a width, never a colour.
const SIDE_WIDTH = /^[trblxyse]-\d+$/;
// `ring-offset-2`, `outline-offset-4` — a width. `ring-offset-background` is a
// colour, so the name after `offset-` still has to resolve.
const OFFSET_WIDTH = /^offset(-\d+)?$/;
// Non-colour values these prefixes also accept.
const NON_COLOUR = new Set([
  // border-/divide-/ring- widths and styles
  "solid", "dashed", "dotted", "double", "none", "hidden", "collapse", "separate",
  "inset",
  // border- side shorthands with no colour (border-t, border-x)
  "t", "b", "l", "r", "x", "y", "s", "e",
  // bg- utilities that are not colours
  "cover", "contain", "center", "top", "bottom", "left", "right", "repeat",
  "no-repeat", "fixed", "local", "scroll", "clip", "origin", "blend",
  "gradient-to-r", "gradient-to-l", "gradient-to-t", "gradient-to-b",
  "gradient-to-br", "gradient-to-bl", "gradient-to-tr", "gradient-to-tl",
  // text- alignment / transform / decoration / wrapping
  "left", "center", "right", "justify", "start", "end", "wrap", "nowrap",
  "balance", "pretty", "ellipsis", "clip", "underline", "overline",
  "line-through", "uppercase", "lowercase", "capitalize",
  // shadow- sizes
  "xs", "sm", "md", "lg", "xl", "2xl", "inner",
  // outline-/ring- offsets and widths
  "offset", "0", "1", "2", "4", "8",
  // from-/via-/to- gradient positions
  "auto",
]);

const problems = [];
for (const file of files) {
  const source = readFileSync(join(ROOT, file), "utf8");
  const lines = source.split("\n");
  lines.forEach((rawLine, i) => {
    // Arbitrary values hold raw CSS — `transition-[color,border-color,…]` — and
    // are Tailwind's to resolve, not ours.
    const line = rawLine.replace(/\[[^\]]*\]/g, "");
    USAGE.lastIndex = 0;
    let m;
    while ((m = USAGE.exec(line)) !== null) {
      const [full, prefix, name] = m;
      if (
        KEYWORDS.has(name) ||
        NON_COLOUR.has(name) ||
        handWritten.has(`${prefix}-${name}`) ||
        STOCK_SUFFIX.test(name) ||
        SIDE_WIDTH.test(name) ||
        OFFSET_WIDTH.test(name)
      )
        continue;
      // `ring-offset-<colour>` / `outline-offset-<colour>`.
      const value = name.startsWith("offset-") ? name.slice("offset-".length) : name;
      const allowed =
        prefix === "text"
          ? colours.has(value) || fontSizes.has(value)
          : colours.has(value) || KEYWORDS.has(value);
      if (!allowed) {
        problems.push({ file, line: i + 1, cls: full, name: value });
      }
    }
  });
}

if (problems.length > 0) {
  console.error(
    `${problems.length} class${problems.length === 1 ? "" : "es"} name a token the theme does not define.\n` +
      `Tailwind emits no CSS for these — they render as nothing:\n`
  );
  for (const p of problems) {
    console.error(`  ${relative(".", p.file)}:${p.line}  ${p.cls}  (no --color-${p.name})`);
  }
  console.error(`\nDefine the token in packages/ui/src/styles.css or fix the name.`);
  process.exit(1);
}

console.log(`theme tokens ok — ${files.length} files, ${colours.size} colours`);
