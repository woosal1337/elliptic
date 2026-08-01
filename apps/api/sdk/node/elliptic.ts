/**
 * CompanyOS Node/TypeScript SDK (COS-219).
 *
 * A small, typed client over the CompanyOS public REST API. Authenticate with a
 * personal access token (Profile -> Tokens) sent as `x-api-key`, or a
 * client-credentials bot token (Settings -> OAuth apps).
 *
 *   import { EllipticClient } from "./elliptic";
 *
 *   const cos = new EllipticClient("https://api.elliptic.sh", "cos_pat_...");
 *   const me = await cos.me();
 *   const projects = await cos.projects(orgId);
 *
 * OAuth client-credentials helper:
 *
 *   const token = await EllipticClient.botToken(
 *     "https://api.elliptic.sh", "app-...", "cos_secret_..."
 *   );
 */

export interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export class EllipticError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(`[${statusCode}] ${message}`);
    this.name = "EllipticError";
  }
}

export class EllipticClient {
  private readonly base: string;

  constructor(
    baseUrl: string,
    private readonly token: string
  ) {
    this.base = `${baseUrl.replace(/\/$/, "")}/api/v1`;
  }

  /** Exchange a confidential app's credentials for a bot token (COS-198). */
  static async botToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!resp.ok) throw new EllipticError(resp.status, await resp.text());
    const json = (await resp.json()) as { access_token: string };
    return json.access_token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number>
  ): Promise<T> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));
    const resp = await fetch(url, {
      method,
      headers: {
        "x-api-key": this.token,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const envelope = (await resp.json().catch(() => undefined)) as Envelope<T> | undefined;
    if (!resp.ok || !envelope?.success) {
      throw new EllipticError(resp.status, envelope?.message ?? `Request failed (${resp.status})`);
    }
    return envelope.data;
  }

  me(): Promise<Record<string, unknown>> {
    return this.request("GET", "/users/me");
  }

  orgs(): Promise<Record<string, unknown>[]> {
    return this.request("GET", "/orgs");
  }

  projects(orgId: string): Promise<Record<string, unknown>[]> {
    return this.request("GET", `/orgs/${orgId}/projects`);
  }

  createProject(orgId: string, name: string, key: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/orgs/${orgId}/projects`, { name, key });
  }

  tasks(
    orgId: string,
    projectId: string,
    query?: Record<string, string | number>
  ): Promise<Page<Record<string, unknown>>> {
    return this.request("GET", `/orgs/${orgId}/projects/${projectId}/tasks`, undefined, query);
  }

  createTask(
    orgId: string,
    projectId: string,
    title: string,
    fields: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    return this.request("POST", `/orgs/${orgId}/projects/${projectId}/tasks`, { title, ...fields });
  }

  search(orgId: string, q: string, limit = 20): Promise<Record<string, unknown>> {
    return this.request("GET", `/orgs/${orgId}/search`, undefined, { q, limit });
  }

  pql(orgId: string, query: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/orgs/${orgId}/pql/execute`, { query });
  }
}
