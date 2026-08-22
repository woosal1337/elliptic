import { expect, type APIRequestContext, type Page } from "@playwright/test";

const API = "/api/v1";
export const PASSWORD = "e2e-password-123";

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

async function unwrap<T>(response: {
  ok(): boolean;
  status(): number;
  url(): string;
  json(): Promise<unknown>;
  text(): Promise<string>;
}): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `API call failed (${response.status()} ${response.url()}): ${await response.text()}`
    );
  }
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.success) throw new Error(`API call not successful: ${envelope.message}`);
  return envelope.data;
}

export interface Session {
  email: string;
  token: string;
  orgId: string;
}

/** Register a fresh user, log in over the API, and create a workspace. */
export async function bootstrap(request: APIRequestContext, orgName: string): Promise<Session> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
  await unwrap(
    await request.post(`${API}/auth/register`, {
      data: { email, password: PASSWORD, full_name: "E2E Tester" },
    })
  );
  const login = await unwrap<{ tokens: { access_token: string } }>(
    await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } })
  );
  const token = login.tokens.access_token;
  const org = await unwrap<{ id: string }>(
    await request.post(`${API}/orgs`, {
      data: { name: orgName },
      headers: auth(token),
    })
  );
  return { email, token, orgId: org.id };
}

export function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Presign, PUT the bytes to MinIO, and register the document — the real upload path. */
export async function uploadDoc(
  request: APIRequestContext,
  session: Session,
  input: { filename: string; content: string; folderPath?: string; name?: string }
): Promise<{ id: string; name: string }> {
  const presign = await unwrap<{ object_id: string; upload_url: string }>(
    await request.post(`${API}/orgs/${session.orgId}/drive/presign-upload`, {
      headers: auth(session.token),
      data: {
        filename: input.filename,
        content_type: "text/plain",
        size_bytes: Buffer.byteLength(input.content),
      },
    })
  );
  const put = await request.fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    data: input.content,
  });
  expect(put.ok(), `PUT to storage failed (${put.status()})`).toBe(true);
  return unwrap(
    await request.post(`${API}/orgs/${session.orgId}/drive/files`, {
      headers: auth(session.token),
      data: {
        object_id: presign.object_id,
        name: input.name ?? null,
        folder_path: input.folderPath ?? "",
        description: null,
      },
    })
  );
}

export async function createNote(
  request: APIRequestContext,
  session: Session,
  input: { title: string; isFolder?: boolean; parentId?: string | null; content?: string }
): Promise<{ id: string; title: string }> {
  return unwrap(
    await request.post(`${API}/orgs/${session.orgId}/notes`, {
      headers: auth(session.token),
      data: {
        title: input.title,
        content: input.content ?? "",
        is_folder: input.isFolder ?? false,
        parent_id: input.parentId ?? null,
      },
    })
  );
}

/** Sign in through the real login page, so the cookies the app uses exist. */
export async function uiLogin(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Land anywhere under /app — the workspace picker sits at /app exactly.
  await page.waitForURL(/\/app(\/|$)/, { timeout: 30_000 });
}
