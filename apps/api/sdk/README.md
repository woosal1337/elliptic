# CompanyOS SDKs (COS-219)

Typed clients for the [CompanyOS public REST API](../) (`/api/v1`, OpenAPI at
`/api/v1/docs`). Both authenticate with a **personal access token** sent as the
`x-api-key` header, or a **client-credentials bot token** from a confidential
OAuth app.

## Python (`sdk/python/elliptic_sdk.py`)

```python
from elliptic_sdk import EllipticClient

with EllipticClient("https://api.elliptic.sh", token="cos_pat_...") as cos:
    me = cos.me()
    for project in cos.projects(org_id):
        print(project["name"])
    cos.create_task(org_id, project_id, "Investigate latency", priority="high")
```

Bot token (OAuth client_credentials):

```python
token = EllipticClient.bot_token(base_url, client_id="app-...", client_secret="cos_secret_...")
cos = EllipticClient(base_url, token=token)
```

Requires `httpx`.

## Node / TypeScript (`sdk/node/elliptic.ts`)

```ts
import { EllipticClient } from "./elliptic";

const cos = new EllipticClient("https://api.elliptic.sh", "cos_pat_...");
const me = await cos.me();
const projects = await cos.projects(orgId);
await cos.createTask(orgId, projectId, "Investigate latency", { priority: "high" });
```

Uses the global `fetch` (Node 18+ / browsers). No runtime dependencies.

## Coverage

Both SDKs cover: `me`, `orgs`, `projects`/`createProject`, `tasks`/`createTask`,
`search`, `pql`, plus the `botToken` OAuth helper. They are thin, hand-written
clients over the stable REST surface; extend by adding methods that mirror the
documented endpoints.
