# Linear mobile — UX patterns to mirror (redesign reference)

Observed live from the Linear Android app (`app.linear`) on the `Android_1`
emulator, 2026-07-04. Screenshots are kept out of git (private workspace data);
this file captures the reusable patterns for the CompanyOS redesign.

## Global language
- **Type**: large, tight sans (Inter-family). Screen titles are big and bold;
  body is calm and generous. Dense but airy — lots of whitespace between rows.
- **Accent**: an indigo almost identical to our `#7079EC` (validates A1).
- **Chrome-less**: no visible top nav bar; the screen title *is* the header,
  with small round pill-grouped actions top-right (compose ✎, overflow •••).
- **Floating toolbar**: an icon-only frosted pill floating above the home
  indicator (not an edge-to-edge tab bar). Active item sits in a lighter
  capsule. Items are customizable/pinnable. → this is our **D1** target.

## Login (→ C8)
- Centered mark, "Log in to Linear", stacked full-width buttons:
  **Continue with Google** (accent, primary), Continue with email, Continue
  with SAML SSO, Log in with passkey. Rounded-full buttons, generous height.

## Workspace switcher (→ OrgSwitcher / D1 long-press)
- "Which workspace would you like to log in to?" list. Each workspace = a
  **rounded-square** (not circle) avatar with an initial in a saturated tint +
  the workspace name. Footer: "Add an account", "Log out of all accounts"
  (destructive red). Reachable from Settings **or by long-pressing the Home tab**.

## Inbox (→ C3)
- Large "Inbox" title; top-right compose + overflow in a pill.
- Rows: **actor avatar** (photo / integration glyph) on the left, sometimes with
  a small **status badge** overlaid (blue check = completed); then an **unread
  blue dot** + issue title (1 line), and a dim **reason line** below
  ("Reopened by GitHub · Jun 4", "Marked as completed…", "Overdue · Jun 11").
  Date right-aligned. **Read items are dimmed.**
- Tall rows, no hard separators. Swipe actions: Unread / Snooze / Delete.

## Issue detail (→ C2)
- **Title** big and bold at top.
- **Chip property row** in a subtle rounded container: `○ Todo` (status glyph),
  `··· Priority`, `[avatar] Assignee`, `+` to add — wraps to a second line for
  `Label`, `📦 Project`. Each chip = small icon + short label. Tapping a chip
  opens a picker. → build our C2 property row exactly like this.
- **Description**: rendered markdown (arrows, lists) — never raw source.
- **+ Sub-issue** outlined pill.
- **Activity** timeline: small status-circle nodes + connector line, actor +
  action + timestamp; participant avatars stacked top-right.
- **Pinned bottom composer**: `+ Comment` field pinned above the home indicator,
  with a leading action and a trailing pip icon (keyboard-attached).

## Direct implications for the CompanyOS backlog
- **C2 Task detail**: adopt the chip property row + rendered markdown + pinned
  composer + activity timeline. (COS-372)
- **C3 Inbox**: actor avatar + status badge + unread dot + reason line + dimmed
  read + swipe Unread/Snooze/Delete. (COS-373)
- **D1 tab bar**: floating icon-only frosted pill; workspace switch via
  long-press on Home. (COS-381)
- **OrgSwitcher**: rounded-square workspace avatars with saturated tints.
- **C8 Login**: stacked full-width provider buttons, accent primary. (COS-378)
