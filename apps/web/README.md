# Elliptic Web

Frontend monorepo for Elliptic, an agent-native work platform (Jira for your agents). Orgs, teams, projects, Linear-style tasks, meetings with transcripts and AI summaries, notes, and org settings including BYOK AI provider keys and custom AI users.

## Why

Elliptic gives a company one place to coordinate work. The web app talks to a FastAPI backend at `http://localhost:8000` using httpOnly cookie auth and a `{success, message, data}` response envelope. All org-scoped routes live under `/api/v1/orgs/{org_id}/...`, auth routes under `/api/v1/auth/*`.

## Quickstart

```bash
bun install
bun run dev
```

The app runs on `http://localhost:3000` and proxies `/api/*` to `http://localhost:8000/api/*` via Next.js rewrites so auth cookies stay same-origin. Start the backend first.

Other commands:

```bash
bun run lint
bun run typecheck
bun run build
```

## Run with Docker

```bash
docker compose up -d --build      # web on http://localhost:3000
```

The image is a Next.js standalone build served by Node. The `/api` rewrite target is baked at build time from the `BACKEND_ORIGIN` build arg (declared in `turbo.json` so Turborepo's strict env mode passes it through), defaulting to `http://host.docker.internal:8001` to reach the API container that the `companyos-api` repo publishes on host port 8001. Override for a different backend:

```bash
BACKEND_ORIGIN=http://host.docker.internal:8000 docker compose up -d --build
```

Run the `companyos-api` stack first (`docker compose up -d --build` there), then this.

## Structure

```
apps/
  web/                  Next.js 16 App Router app (React 19, TanStack Query v5, Tailwind v4)
packages/
  ui/                   @companyos/ui, the component library and design tokens (raw TS source, no build step)
  typescript-config/    Shared tsconfig presets (base, nextjs, react-library)
  eslint-config/        Shared ESLint flat configs (base, next-js, react-internal)
```

- `apps/web/src/app` holds the routes: `(auth)` for login/signup/invite, `app/[orgId]` for the dashboard (projects, board, tasks, meetings, notes, activity, settings).
- `apps/web/src/lib` holds the typed API client, query client, and backend types.
- `apps/web/src/hooks` holds per-domain TanStack Query hooks with query-key factories.
- `packages/ui/src/styles.css` owns every design token (Tailwind v4 `@theme`, OKLch neutral scale plus one accent, light and dark).

See `CONVENTIONS.md` for the rules that keep this codebase coherent.

## License

Licensed under the [Apache License 2.0](LICENSE).
