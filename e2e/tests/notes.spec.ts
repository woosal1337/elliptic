import { expect, test } from "@playwright/test";
import { bootstrap, createNote, uiLogin, type Session } from "./helpers";

let session: Session;

test.beforeAll(async ({ request }) => {
  session = await bootstrap(request, "Notes E2E");
  const handbook = await createNote(request, session, { title: "Handbook", isFolder: true });
  await createNote(request, session, {
    title: "Welcome aboard",
    parentId: handbook.id,
    content: "# Welcome aboard\n\nStart with the first-week checklist.",
  });
  await createNote(request, session, {
    title: "Scratchpad",
    content: "Loose thoughts land here.",
  });
});

test.beforeEach(async ({ page }) => {
  await uiLogin(page, session.email);
  await page.goto(`/app/${session.orgId}/notes`);
});

test("the tree, the folder cards, and the note table show the library", async ({ page }) => {
  const tree = page.getByRole("navigation", { name: "Note folders" });
  await expect(tree.getByRole("button", { name: "All notes" })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^Handbook/ })).toBeVisible();

  const cards = page.locator('section[aria-label="Folders here"]');
  await expect(cards.getByText("Handbook")).toBeVisible();
  await expect(cards.getByText("1 item")).toBeVisible();

  const table = page.getByRole("table", { name: "Notes" });
  await expect(table.getByRole("row", { name: /Scratchpad/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Welcome aboard/ })).toHaveCount(0);
});

test("a folder opens from the card and from the tree", async ({ page }) => {
  await page
    .locator('section[aria-label="Folders here"]')
    .getByRole("button", { name: /^Handbook/ })
    .click();
  const table = page.getByRole("table", { name: "Notes" });
  await expect(table.getByRole("row", { name: /Welcome aboard/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Scratchpad/ })).toHaveCount(0);

  await page
    .getByRole("navigation", { name: "Note folders" })
    .getByRole("button", { name: "All notes" })
    .click();
  await expect(table.getByRole("row", { name: /Scratchpad/ })).toBeVisible();
});

test("a note row opens the note", async ({ page }) => {
  await page
    .getByRole("table", { name: "Notes" })
    .getByRole("link", { name: /Scratchpad/ })
    .click();
  await page.waitForURL("**/notes/**");
  await expect(page.getByText("Loose thoughts land here.")).toBeVisible();
});

test("the New folder button files a folder in place", async ({ page }) => {
  await page.getByRole("button", { name: "New folder" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Folder name").fill("Ideas");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(
    page.getByRole("navigation", { name: "Note folders" }).getByRole("button", { name: /^Ideas/ })
  ).toBeVisible();
});
