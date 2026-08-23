/**
 * Capture the web screenshots that the README shows.
 *
 * It reads the workspace that `seed_showcase.py` built, signs in through the
 * real login page, and writes one PNG per surface into `.github/assets/`.
 * Each surface is captured twice, once in the dark theme and once in the light
 * one, so the README can pair them.
 *
 *   scripts/dev-stack.sh up
 *   apps/api/.venv/bin/python scripts/screenshots/seed_showcase.py
 *   node scripts/screenshots/capture.mjs
 *
 * Set WEB_ORIGIN if the web app is not on port 3000.
 */

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

// Playwright lives in the e2e workspace, not here, so load it by path.
const { chromium } = await import(
  pathToFileURL(join(ROOT, "e2e", "node_modules", "@playwright", "test", "index.mjs")).href
);

const OUT = join(ROOT, ".github", "assets");
const WEB = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const THEME_KEY = "elliptic:theme";

const PAGE_VIEW = { width: 1680, height: 1050 };
// The page content is capped at `max-w-7xl`, so a wider window only adds empty
// margins. The board window is sized so that cap fills the frame edge to edge,
// and the kanban overflow then reads as an ordinary sideways scroll.
const BOARD_VIEW = { width: 1530, height: 1000 };

const showcase = JSON.parse(readFileSync(join(HERE, "showcase.json"), "utf8"));
const { org_id: orgId, email, password, projects, meeting_id: meetingId, note_id: noteId } =
  showcase;

/** The surfaces the README shows. `wait` is the text that proves the page rendered. */
const SHOTS = [
  {
    name: "board",
    path: `/app/${orgId}/projects/${projects.PLAT}?tab=board`,
    wait: "Stream board updates over the realtime relay",
    view: BOARD_VIEW,
  },
  {
    name: "tasks",
    path: `/app/${orgId}/projects/${projects.PLAT}?tab=tasks`,
    wait: "Rate-limit the MCP tool surface per token",
  },
  {
    name: "overview",
    path: `/app/${orgId}/projects/${projects.PLAT}?tab=overview`,
    wait: "Platform",
  },
  {
    name: "insights",
    path: `/app/${orgId}/projects/${projects.PLAT}?tab=insights`,
    wait: "Platform",
  },
  { name: "task", path: `/app/${orgId}/browse/PLAT-2`, wait: "Agents lose the org scope" },
  { name: "my-tasks", path: `/app/${orgId}/my-tasks`, wait: null },
  { name: "meetings", path: `/app/${orgId}/meetings`, wait: "Launch sync" },
  {
    name: "meeting",
    path: `/app/${orgId}/meetings/${meetingId}`,
    wait: "cut line",
  },
  { name: "notes", path: `/app/${orgId}/notes`, wait: "Agent beta" },
  { name: "note", path: `/app/${orgId}/notes/${noteId}`, wait: "cut line" },
  { name: "inbox", path: `/app/${orgId}/inbox`, wait: null },
  { name: "activity", path: `/app/${orgId}/activity`, wait: null },
  { name: "search", path: `/app/${orgId}/search?q=agent`, wait: null },
  { name: "drive", path: `/app/${orgId}/drive`, wait: null },
  { name: "projects", path: `/app/${orgId}/projects`, wait: "Platform" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Hide anything that moves, so a re-capture makes a clean diff. */
const CALM_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  [data-sonner-toaster] { opacity: 0 !important; }
  /* The Next.js dev badge floats over the sidebar footer. */
  nextjs-portal { display: none !important; }
`;

/** Type into a controlled field, and make sure the value stuck. */
async function fill(page, selector, value) {
  const field = page.locator(selector);
  for (let attempt = 0; attempt < 3; attempt++) {
    await field.fill("");
    await field.fill(value);
    if ((await field.inputValue()) === value) return;
    await sleep(700);
  }
  throw new Error(`could not type into ${selector}`);
}

async function shoot(context, shot, file) {
  const page = await context.newPage();
  try {
    await page.goto(`${WEB}${shot.path}`, { waitUntil: "domcontentloaded" });
    if (shot.wait) {
      await page.getByText(shot.wait, { exact: false }).first().waitFor({ timeout: 20_000 });
    }
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.addStyleTag({ content: CALM_CSS });
    await page.mouse.move(0, 0);
    await sleep(1500);
    await page.screenshot({ path: file });
    console.log(`  ${shot.name}`);
  } catch (error) {
    console.log(`  ${shot.name} — FAILED: ${error.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();

  // Sign in one time and reuse the cookies. The API rate-limits repeated logins.
  const gateContext = await browser.newContext({ viewport: PAGE_VIEW });
  const gate = await gateContext.newPage();
  console.log("signing in…");
  await gate.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  // The form is a controlled React component. A value written before the page
  // hydrates is thrown away, and the form then reports an empty field, so wait
  // for the page to settle and read each value back.
  await gate.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await sleep(500);
  await fill(gate, "#email", email);
  await fill(gate, "#password", password);
  await gate.getByRole("button", { name: "Sign in" }).click();
  await gate.waitForURL(/\/app(\/|$)/, { timeout: 45_000 });
  const storageState = await gateContext.storageState();
  await gateContext.close();

  for (const theme of ["dark", "light"]) {
    console.log(`${theme}:`);
    // One context per window size. A page that measures itself on mount must
    // never see a resize after it renders.
    for (const view of [PAGE_VIEW, BOARD_VIEW]) {
      const group = SHOTS.filter((shot) => (shot.view ?? PAGE_VIEW) === view);
      if (group.length === 0) continue;

      const context = await browser.newContext({
        viewport: view,
        deviceScaleFactor: 2,
        colorScheme: theme,
        storageState,
      });
      // The app reads the theme before it paints, so seed the store first.
      await context.addInitScript(
        ([key, mode]) => {
          try {
            window.localStorage.setItem(key, mode);
          } catch {
            /* a blocked store must not stop the capture */
          }
        },
        [THEME_KEY, theme]
      );

      for (const shot of group) {
        const suffix = theme === "light" ? "-light" : "";
        await shoot(context, shot, join(OUT, `web-${shot.name}${suffix}.png`));
      }
      await context.close();
    }
  }

  await browser.close();
  console.log(`\nwrote PNGs into ${OUT}`);
}

await main();
