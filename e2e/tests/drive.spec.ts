import { expect, test } from "@playwright/test";
import { bootstrap, uiLogin, uploadDoc, type Session } from "./helpers";

let session: Session;

test.beforeAll(async ({ request }) => {
  session = await bootstrap(request, "Drive E2E");
  await uploadDoc(request, session, {
    filename: "root-doc.txt",
    content: "A document at the Drive root.",
  });
  await uploadDoc(request, session, {
    filename: "spec.txt",
    content: "The genlab spec.",
    folderPath: "genlab",
  });
  await uploadDoc(request, session, {
    filename: "plan.txt",
    content: "The weekly plan.",
    folderPath: "genlab/2026-08-21",
  });
});

test.beforeEach(async ({ page }) => {
  await uiLogin(page, session.email);
  await page.goto(`/app/${session.orgId}/drive`);
});

test("the tree, the folder cards, and the file table show the Drive", async ({ page }) => {
  const tree = page.getByRole("navigation", { name: "Drive folders" });
  await expect(tree.getByRole("button", { name: "Drive" })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^genlab/ })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^2026-08-21/ })).toBeVisible();

  const cards = page.locator('section[aria-label="Folders here"]');
  await expect(cards.getByText("genlab")).toBeVisible();
  await expect(cards.getByText("2 files")).toBeVisible();

  const table = page.getByRole("table", { name: "Documents" });
  await expect(table.getByRole("row", { name: /root-doc/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /spec\.txt/ })).toHaveCount(0);
});

test("a folder card and a tree row both open the folder", async ({ page }) => {
  await page
    .locator('section[aria-label="Folders here"]')
    .getByRole("button", { name: /genlab/ })
    .click();
  const table = page.getByRole("table", { name: "Documents" });
  await expect(table.getByRole("row", { name: /spec\.txt/ })).toBeVisible();
  await expect(
    page.locator('section[aria-label="Folders here"]').getByText("2026-08-21")
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Drive folders" })
    .getByRole("button", { name: /^2026-08-21/ })
    .click();
  await expect(table.getByRole("row", { name: /plan\.txt/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /spec\.txt/ })).toHaveCount(0);
});

test("search sweeps the whole Drive and shows the folder column", async ({ page }) => {
  await page.getByLabel("Search the Drive").fill("plan");
  const table = page.getByRole("table", { name: "Documents" });
  const row = table.getByRole("row", { name: /plan\.txt/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("genlab/2026-08-21")).toBeVisible();
  await expect(table.getByRole("row", { name: /root-doc/ })).toHaveCount(0);
});

test("a row opens the preview dialog with the document text", async ({ page }) => {
  await page
    .getByRole("table", { name: "Documents" })
    .getByRole("button", { name: /^root-doc/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("A document at the Drive root.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("a long unwrapped line stays inside the preview dialog", async ({ page, request }) => {
  await uploadDoc(request, session, {
    filename: "wide.md",
    content: `# Wide\n\n| ${"cell | ".repeat(80)}\n\nA table row far wider than any dialog.`,
  });
  await page.reload();
  await page
    .getByRole("table", { name: "Documents" })
    .getByRole("button", { name: /^wide/ })
    .click();

  const dialog = page.getByRole("dialog");
  const block = dialog.locator("pre");
  await expect(block).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const blockBox = await block.boundingBox();
  if (!dialogBox || !blockBox) throw new Error("No bounding boxes to compare");
  expect(blockBox.width).toBeLessThanOrEqual(dialogBox.width);
  expect(blockBox.x + blockBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width + 1);
  await page.keyboard.press("Escape");
});

test("the preview dialog deletes the document", async ({ page, request }) => {
  await uploadDoc(request, session, {
    filename: "doomed.txt",
    content: "This document exists to be deleted.",
  });
  await page.reload();
  const table = page.getByRole("table", { name: "Documents" });
  await table.getByRole("button", { name: /^doomed/ }).click();

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(table.getByRole("row", { name: /doomed/ })).toHaveCount(0);
});

test("an upload through the browser lands in the open folder", async ({ page }) => {
  await page.locator('input[aria-label="Upload documents"]').setInputFiles({
    name: "uploaded-live.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Uploaded through the browser during the e2e run."),
  });
  await expect(
    page.getByRole("table", { name: "Documents" }).getByRole("row", { name: /uploaded-live/ })
  ).toBeVisible({ timeout: 15_000 });
});
