/**
 * Type-resolution entry point.
 *
 * Metro prefers `index.ios.tsx` / `index.android.tsx` over this file, so it is
 * never bundled — it exists so TypeScript and editors can resolve
 * `@/components/form`, which they cannot do from platform-suffixed files alone.
 * Re-exporting the Android implementation keeps the types honest: it is the one
 * written against `types.ts` rather than against a native package.
 */
export * from "./index.android"
export type * from "./types"
