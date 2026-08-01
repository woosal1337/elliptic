# Contributing to Elliptic

First off — thank you. Elliptic is an open, agent-native work platform, and it
gets better every time someone reports a bug, sharpens the docs, or ships a fix.
This guide takes you from a fresh clone to a merged pull request. It should be the
only document you need; if something here is wrong or unclear, that itself is a
bug worth reporting.

- **New here?** Skim [Ways to contribute](#ways-to-contribute), then
  [Getting started](#getting-started).
- **Fixing something specific?** Jump to [Development workflow](#development-workflow)
  and the [Pull request checklist](#pull-request-checklist).
- **Found a vulnerability?** Do **not** open a public issue — see
  [Security](#security).

By participating you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Ways to contribute

You don't have to write code to help.

- **Report a bug** — open a [Bug report](https://github.com/woosal1337/companyos/issues/new?template=bug_report.yml).
  A good report is often more valuable than a rushed fix.
- **Request a feature or flag a gap** — open a
  [Feature request](https://github.com/woosal1337/companyos/issues/new?template=feature_request.yml).
- **Improve the docs** — typos, missing steps, and confusing wording are all fair game.
- **Pick up an issue** — anything labeled
  [`good first issue`](https://github.com/woosal1337/companyos/labels/good%20first%20issue)
  is a friendly entry point. Comment to claim it so we don't double up.
- **Review a pull request** — thoughtful review from anyone is welcome.

If you're planning a large or architectural change, please open an issue to
discuss it **before** writing the code. It saves everyone a redo.

---

## Getting help

- **Questions & ideas:** [GitHub Discussions](https://github.com/woosal1337/companyos/discussions).
- **Docs:** [docs.company.chele.bi](https://docs.company.chele.bi).
- **Bugs:** a GitHub issue, using the templates above.

---

## Getting started

### Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| [Docker](https://docs.docker.com/get-docker/) + Compose | latest | the one-command full stack |
| [Bun](https://bun.sh) | `1.3.14` (pinned in `package.json`) | the web workspace — **Bun only, never npm/pnpm/yarn** |
| [uv](https://docs.astral.sh/uv/) | latest | the Python API |
| Python | `>= 3.13` | the API (uv manages this for you) |
| PostgreSQL | 16+ | only if you run the API outside Docker |

### Run the whole stack (recommended)

The fastest path — Postgres, API, and web, with migrations applied automatically:

```bash
git clone https://github.com/woosal1337/companyos.git
cd companyos
cp .env.example .env
docker compose up --build
```

- Web app → <http://localhost:3000>
- API → <http://localhost:8000> (health at `/api/v1/health`)

The defaults in `.env.example` are safe for local evaluation. For anything
internet-facing, generate real secrets — the file explains each one.

### Run an app directly

Useful when you're iterating on one side and want hot reload.

**API** (`apps/api`)

```bash
cd apps/api
uv sync --all-groups
uv run alembic upgrade head          # apply migrations (needs Postgres)
uv run uvicorn companyos.main:app --reload
```

**Web** (`apps/web`)

```bash
cd apps/web
bun install
bun run dev
```

---

## Repository layout

Elliptic is a Bun + Turborepo monorepo with three apps:

```
companyos/
├── apps/
│   ├── api/                  # Python / FastAPI backend
│   │   ├── src/companyos/
│   │   │   ├── core/         # config, security, deps, shared plumbing
│   │   │   └── modules/      # one folder per domain: router · service · schemas · models
│   │   ├── alembic/          # database migrations
│   │   └── tests/
│   ├── web/                  # web workspace (Bun + Turborepo)
│   │   ├── apps/web/         # ← the Next.js app itself (note the nested path)
│   │   │   └── src/
│   │   │       ├── app/      # Next.js App Router routes
│   │   │       ├── components/
│   │   │       ├── hooks/    # TanStack Query hooks: use-*-queries.ts
│   │   │       └── lib/      # api client, i18n, keyboard, etc.
│   │   └── packages/ui/      # @companyos/ui — shared design system (raw TS source)
│   └── mobile/               # Expo / React Native app
└── .github/workflows/        # CI, deploy, release
```

> **Gotcha:** the Next.js app lives at **`apps/web/apps/web`**, not `apps/web`.
> The outer `apps/web` is the workspace root; the inner one is the app. Design
> tokens and shared primitives live in `apps/web/packages/ui`.

Each API module follows the same four-file shape — `router.py` (HTTP),
`service.py` (business logic), `schemas.py` (Pydantic), `models.py` (SQLAlchemy).
Mirror that shape when you add one.

---

## Development workflow

1. **Branch off `main`.** Use a short, descriptive name, e.g.
   `fix/invite-empty-project` or `feat/google-sign-in`.
2. **Keep each change focused.** One logical change per pull request. Small,
   reviewable PRs merge far faster than sprawling ones.
3. **Follow the conventions.** They are not optional style preferences — CI
   enforces them:
   - Web: [`apps/web/CONVENTIONS.md`](apps/web/CONVENTIONS.md)
   - API: [`apps/api/CONVENTIONS.md`](apps/api/CONVENTIONS.md)
4. **Run the checks locally** (see below) before you push.
5. **Open a pull request** and fill in the template.

### Commit messages

- Imperative mood, present tense: *"Add Google sign-in"*, not *"Added"* / *"Adds"*.
- Keep the subject under ~72 characters; explain the *why* in the body if it
  isn't obvious.
- Reference issues where relevant: `Fixes #123`.
- Group related work; avoid "wip"/"fix typo" noise — squash before review.

---

## Coding standards

**Web** — TypeScript strict, no `any`. Shared visual primitives live only in
`@companyos/ui`; apps never duplicate them or hardcode brand colors, radii, or
fonts (tokens live in `packages/ui/src/styles.css`). Server state goes through
TanStack Query hooks (`src/hooks/use-*-queries.ts`), never raw `fetch` in a
component. Forms use `react-hook-form` + `zod`. Every async surface handles
loading, empty, and error states; mutations toast on success and failure.

**API** — Ruff-formatted, `mypy`-clean, fully typed. New schema changes ship with
an Alembic migration. Keep endpoints thin and push logic into the service layer.

When in doubt, match the surrounding code.

---

## Checks must pass

CI runs the exact commands below. Run them before opening a PR — green locally
means green in CI.

**API** (`apps/api`)

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy src/
uv run alembic upgrade head       # migrations apply cleanly
uv run pytest -q                  # needs Postgres (docker compose up postgres)
```

`make lint`, `make format`, `make typecheck`, and `make test` wrap these.

**Web** (`apps/web`)

```bash
bun install --frozen-lockfile
bunx turbo run lint
bunx turbo run typecheck
bunx turbo run build
```

---

## Pull request checklist

Before you hit "Ready for review":

- [ ] Branched off `main`, one focused change.
- [ ] All checks above pass locally.
- [ ] New/changed behavior is covered by tests where practical.
- [ ] User-facing changes handle loading, empty, and error states.
- [ ] Schema changes include an Alembic migration.
- [ ] No secrets, keys, or `.env` values committed.
- [ ] The PR description says **what** changed and **why**, with screenshots for
      UI changes.

A maintainer will review, may request changes, and will merge once CI is green
and the change looks good. Be patient and responsive — reviews are a
conversation, not a gate.

---

## Reporting bugs

Great bug reports are specific and reproducible. Use the
[Bug report template](https://github.com/woosal1337/companyos/issues/new?template=bug_report.yml)
and include:

- **What happened** vs. **what you expected**.
- **Exact steps to reproduce** — the smallest sequence that triggers it.
- **Environment** — Docker vs. local, browser/OS, and the app version or commit.
- **Evidence** — screenshots, the failing request/response, and any relevant
  console or server logs (with secrets redacted).

---

## Security

Please **do not** open public issues for security vulnerabilities. Follow the
private disclosure process in [`SECURITY.md`](SECURITY.md). We take these
seriously and will work with you on a fix and coordinated disclosure.

---

## License

By contributing, you agree that your contributions are licensed under the
project's [Apache License 2.0](LICENSE).
