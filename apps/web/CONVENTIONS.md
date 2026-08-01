# Conventions

## Component library policy

- Every shared visual primitive lives in `@elliptic/ui`. Apps never duplicate primitives.
- If a primitive is missing, add it to `packages/ui` with typed props, CVA variants where sensible, `forwardRef`, and correct aria behavior (Radix where applicable). Then consume it from the app.
- `@elliptic/ui` is consumed as raw TypeScript source via `transpilePackages`. No build step, no dist.
- Design tokens live only in `packages/ui/src/styles.css` (Tailwind v4 `@theme` CSS variables). The app never hardcodes brand colors, radii, or font stacks. If a value is not a token, it does not exist.

## Visual language

- Professional neutral B2B: OKLch neutral grays plus a single accent color.
- Inter via `next/font`, generous spacing, restrained shadows, no decorative gradients.
- Light and dark themes are both defined in the token sheet.

## Code

- TypeScript strict everywhere. No `any`.
- No explanatory inline comments. Only functional directives (for example `eslint-disable` with rule names) are allowed.
- Every user-facing async state handles loading, empty, and error explicitly.
- Mutations show toasts on success and failure.
- Forms use `react-hook-form` + `zod`.
- Server state goes through TanStack Query hooks in `apps/web/src/hooks/use-*-queries.ts`, one file per domain, each with a query-key factory. No raw `fetch` in components.
- The API client (`src/lib/api.ts`) unwraps the `{success, message, data}` envelope, throws `ApiError`, sends credentials, and redirects to `/login` on 401.

## Tooling

- Bun only. `bun install`, `bunx turbo ...`. Never npm/npx/yarn/pnpm.
- Turborepo drives `dev`, `build`, `lint`, `typecheck` across workspaces.
- ESLint flat configs come from `@elliptic/eslint-config`. tsconfigs come from `@elliptic/typescript-config`.
- CI runs `bun install`, then `turbo run lint typecheck build`. All three must be green before merge.
