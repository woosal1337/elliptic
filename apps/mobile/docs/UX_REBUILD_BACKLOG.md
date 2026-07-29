# CompanyOS Mobile — Linear-grade UI/UX Rebuild Backlog

Derived from: Linear mobile UX reference, mobile codebase audit, web→mobile brand token extraction, API consumption map, and a live 18-screen simulator audit (iPhone 17 Pro, iOS 26.5).

**Guiding principle:** build a shared, tokenized component kit first, then rebuild screens on top of it. Every value below is grounded in the real web brand tokens (`packages/ui/src/styles.css`) and the real API enums (`modules/tasks/models.py`).

**Key facts locked from the audit:**
- Status enum: `backlog · todo · in_progress · in_review · done · cancelled` (+`duplicate` hidden). Category band: backlog/unstarted/started/completed/cancelled.
- Priority enum: `none · low · medium · high · urgent`.
- Brand is **dark-first**, accent indigo `#7079EC` (dark) / `#515BE4` (light); neutrals cool-gray (mobile currently ships warm taupe + wrong indigo `#6366F1`).
- Fonts: **Inter / Inter Tight / JetBrains Mono** (mobile currently ships Space Grotesk everywhere).
- Perf toolkit already installed but unused: reanimated 4.2, worklets, gesture-handler 2.30. `expo-haptics` and `lucide-react-native` NOT installed.
- The top-right floating gear is the **Expo dev-client launcher** (dev-only), not app UI.

---

## EPIC A — Design system foundation (do first; everything styles on top)

- **A1. Rebuild theme color tokens (light + dark) from web brand.** Replace Ignite taupe palette + `#6366F1` with cool-gray neutrals and correct indigo. Add layer tokens (background/canvas/surface/elevated/muted/subtle), text hierarchy, border/inputBorder, status tokens (6), priority tokens (5), feedback (error/success/warning/info). Exact hex in brand report §7.1. Make dark a designed palette, not a key-inversion. Fixes the Avatar/Fab dark-mode black-on-dark bug.
- **A2. Swap typography to Inter / Inter Tight / JetBrains Mono.** Drop `@expo-google-fonts/space-grotesk`; add the three families. Rebuild `Text` presets to the web scale (h1–caption, monoLabel, num with tabular-nums). Task identifiers (`COS-42`) render in JetBrains Mono everywhere.
- **A3. Add shape/motion token files + navigation theme.** New `radius.ts` (xs4…xxl24, full), `shadow` helpers (iOS/Android, dark leans on surface-lightening), `timing` → `{quick:100, regular:250, slow:350}` with `bezier(0.16,1,0.3,1)`. Map React Navigation theme to app colors (headers/back tint currently pure white ≠ app bg).
- **A4. Rebrand app icon + splash + assets.** Generate iOS/Android icons from the web pixel-O mark (`apps/web/apps/web/public/logo.png`; needs 1024px master). Splash bg `#191015`→`#0E0E11`. Purge all Ignite placeholders (`assets/images/*`, `assets/icons/demo/*`).
- **A5. Consolidate icon system + add haptics util.** One `lucide-react-native` wrapper with a semantic name map; delete the legacy PNG `Icon.tsx` registry; add `@expo/vector-icons` explicitly. Install `expo-haptics`; `haptics.ts` (selection/success/warning).

## EPIC B — Shared component kit (the reusable primitives)

- **B1. Gesture-driven BottomSheet foundation.** Replace `Sheet.tsx` (RN Modal, no gestures) with `@gorhom/bottom-sheet` (or Reanimated custom — libs already installed): snap points, drag-to-dismiss, keyboard avoidance, spring. Migrate all 6 consumers (OptionSheet, CreateTaskSheet, DatePickerSheet, OrgSwitcher, decline-reason, chat history). *Highest-leverage single change.*
- **B2. StatusIcon + PriorityIcon.** Linear-style status glyphs for the 6 statuses (dashed→partial→check) using status tokens; priority signal-bars/alert-octagon (lucide MoreHorizontal/SignalLow/Med/High/AlertOctagon) using priority tokens.
- **B3. Avatar rework + AvatarStack.** Image URI support, size ramp, fixed contrast foreground (fix dark bug), deterministic tint from tokens; `AvatarStack` with overlap + "+N".
- **B4. LabelChip + LabelRow.** Neutral chip (surface bg, border, 6px dot tinted by API `label.color`), wrapping row. (No label picker exists anywhere yet — add one in B/screen work.)
- **B5. TaskRow — the core list unit.** StatusIcon · mono identifier · title (1 line) · PriorityIcon · due (overdue tint) · assignee Avatar · label dots. ~44–52pt, full-width tap target, hairline separators. Replaces generic `ListRow` for tasks.
- **B6. SwipeableRow + long-press context menu.** `ReanimatedSwipeable` (gesture-handler, installed-unused) with configurable actions + haptic ticks; Zeego/native context menu wrapper with ActionSheet fallback. Wire to task/note/inbox/triage rows.
- **B7. SegmentedControl.** Animated-thumb segment (Reanimated) replacing the two hand-rolled chip segments (Tasks Assigned/Created, Inbox All/Unread).
- **B8. SearchBar + useDebouncedSearch.** Leading icon, clear, cancel, loading; shared hook (debounce currently inline in SearchScreen; Home has a fake field).
- **B9. EmptyState (compact, product).** Icon/illustration + title + caption + optional CTA. Adopt across all 8 list screens (today each is a bare centered `Text`).
- **B10. SectionHeader.** Status icon + name + count + optional collapse; shared by ProjectDetail board and grouped task lists.
- **B11. Toast v2.** Variants (success/error/info), optional action (undo for delete/complete), swipe-dismiss, queue, haptic.
- **B12. Composed skeletons.** `TaskRowSkeleton` / `DetailSkeleton` presets (shimmer via Reanimated) so screens stop hand-placing bars.
- **B13. Restyle Button + TextField to brand.** Keep the (good) APIs; new presets/sizes, primary + destructive semantics, loading spinner, press-scale + haptic; radius/token alignment.

## EPIC C — Screen rebuilds (on the kit)

- **C1. Tasks list rebuild.** Group-by-status sections (SectionHeader), TaskRow, swipe actions, SegmentedControl, RefreshControl. (Today: title+identifier+text pills, flat.)
- **C2. Task detail rebuild.** Chip property row (status/priority/assignee/labels/due) opening B1 sheets; **pinned** keyboard-attached composer (currently scrolls with content); inline mention tokens (currently text-append); status/priority glyphs; label picker.
- **C3. Inbox rebuild.** Swipe actions (read/snooze/archive), group-by-day, entity-type icons, relative timestamps (`created_at` currently unused). API: `/notifications` read/archive/snooze all exist.
- **C4. Triage rebuild.** Swipe accept/snooze/decline replacing 3 crammed inline buttons per row.
- **C5. Home rebuild.** Replace the "Refresh" text button with pull-to-refresh; TaskRow in "Your tasks"; real search entry (wire the fake field to SearchBar); keep QuickLinks with live badges.
- **C6. Notes editor.** Markdown editor with preview/toolbar (today: raw plaintext in a giant TextField — literal `#`/`**`/`[](/__mention/…)` shown); fix render inconsistency vs task descriptions; delete-confirm already present (keep).
- **C7. Chat/Assistant rebuild.** Streaming or typing indicator (API is blocking POST — needs client spinner or F1 SSE); fix double `KeyboardAvoidingView`; message bubbles on kit.
- **C8. Login/Register rebrand.** Logo, password-visibility toggle, branded error states, primary button; 2FA `two_factor_required` path (API supports TOTP).
- **C9. Projects + ProjectDetail.** Project rows with progress/counts (today: name+key only); board view polish on SectionHeader + TaskRow.
- **C10. CreateTaskSheet rework.** Add description, labels, status (currently title/project/priority/assignee/due only), on the B1 sheet foundation.

## EPIC D — Navigation & interaction polish

- **D1. Custom floating tab bar.** Linear-style frosted pill (BlurView), haptic on tab press, active-tint from tokens; replace stock bottom tabs. Move Triage out of the Inbox stack if it should be top-level (audit finding: Triage's back button reads "Notifications").
- **D2. Shared large-title header + global Create action.** One header component (replace per-screen inline heading text); persistent Create-task affordance in headers (Linear pattern).
- **D3. Optimistic-update haptics.** Fire selection/success haptics on status/priority change, task complete, swipe commits, sheet snaps.

## EPIC E — Data layer & realtime

- **E1. Adopt TanStack Query.** Replace `useCachedList` (cache-then-network, no invalidation) with TanStack Query + MMKV persister; keep the offline queue. Invalidate on mutations (kills the manual `onCreated={refresh}` chains).
- **E2. Wire SSE live updates.** Subscribe to `GET /orgs/{id}/stream` (Bearer works) while foregrounded; refetch affected lists on events; treat as lossy, refetch on resume. Fallback: unread-count poll.
- **E3. Secure token storage.** Move `auth.accessToken`/`auth.refreshToken` out of plaintext MMKV into `expo-secure-store` / encrypted MMKV.

## EPIC F — Cleanup & correctness

- **F1. Delete Ignite cruft.** i18n demo layer (~3,200 lines), unused components (AutoImage, Card, ListItem, Header+useHeader, Toggle/*), demo assets, `apiProblem.*`, `spacingDark.ts`, stale `exitRoutes:["Welcome"]`.
- **F2. Real dev/prod env split.** `config.dev.ts` currently === `config.prod.ts` (both point at production). Add a dev API URL + env switch.

## EPIC G — Backend enablers (API-side; unblock mobile polish) — optional / separate track

- **G1.** `updated_since` delta-sync params on task/note/notification lists (no delta sync today → full refetches).
- **G2.** Offset/cursor + `before` pagination on `/notifications` (limit-only today, capped at 200).
- **G3.** Bulk task mutation endpoint (`PATCH /tasks/bulk`) for multi-select actions (none today).
- **G4.** User avatars (`avatar_object_id` on User; storage already supports it) + member search endpoint (members list is unpaginated; pickers load-all + filter client-side).
- **G5.** AI chat streaming (SSE) variant of the send endpoint.
