import { expect, test } from "@playwright/test";
import { auth, bootstrap, uiLogin, type Session } from "./helpers";

let session: Session;
let meetingId: string;

test.beforeAll(async ({ request }) => {
  session = await bootstrap(request, "Meetings E2E");
  const response = await request.post(`/api/v1/orgs/${session.orgId}/meetings`, {
    headers: auth(session.token),
    data: { title: "Junk sync", started_at: "2026-08-21T09:00:00+00:00" },
  });
  expect(response.ok(), `meeting create failed (${response.status()})`).toBe(true);
  meetingId = ((await response.json()) as { data: { id: string } }).data.id;
});

test("the delete action removes the meeting", async ({ page }) => {
  await uiLogin(page, session.email);
  await page.goto(`/app/${session.orgId}/meetings/${meetingId}`);
  await expect(page.getByRole("heading", { name: "Junk sync" })).toBeVisible();

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete meeting" }).click();

  await page.waitForURL("**/meetings");
  await expect(page.getByRole("heading", { name: "Meetings" })).toBeVisible();
  await expect(page.getByText("Junk sync")).toHaveCount(0);
});
