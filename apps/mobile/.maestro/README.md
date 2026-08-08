# Elliptic mobile — Maestro test & reference harness

Cross-platform [Maestro](https://maestro.dev) flows that drive **two** devices:

| Target | Device | Purpose |
|---|---|---|
| **iOS** | booted iPhone 17 Pro simulator | where Elliptic mobile is developed & tested |
| **Android** | `Android_1` emulator (`emulator-5554`) | runs **Linear** (`app.linear`) — our UX north star — for reference capture |

## Runner

```bash
scripts/maestro.sh devices                                   # list connected iOS + Android devices
scripts/maestro.sh ios     .maestro/capture/elliptic-tour.yaml
scripts/maestro.sh android .maestro/reference/linear-onboarding.yaml
```

Env overrides: `IOS_DEVICE` (UDID), `ANDROID_DEVICE` (adb id), `MAESTRO_BIN`, `ADB`,
`JAVA_HOME`. The runner resolves a JDK itself (Homebrew `openjdk` if macOS has no
JRE), so no export is needed. Screenshots land under `.maestro/output/<app>/…`
(git-ignored).

## E2E account

Flows sign in as `mobile-e2e@chele.bi` (an account email in the database, not a
host — unchanged by the elliptic.sh migration) (org **Maestro QA**, project **MOB** —
seeded fixtures, isolated from real workspaces). The password is never stored
anywhere: generate a fresh one and reset it via the API container on the prod
host (hash with `elliptic.core.security.hash_password`, `UPDATE users SET
password_hash=… WHERE email='mobile-e2e@chele.bi'`), then pass it to flows as
`MAESTRO_EMAIL` / `MAESTRO_PASSWORD` env vars. `flows/Login.yaml` handles the
dev-client onboarding sheet and the iOS save-password dialog.

## Layout

```
.maestro/
  reference/     # flows that drive Linear on Android → the design reference library
    linear-onboarding.yaml
  capture/       # flows that tour Elliptic itself (before/after redesign diffs)
    elliptic-tour.yaml
  flows/         # functional test flows
    Login.yaml       # sign in with MAESTRO_EMAIL / MAESTRO_PASSWORD
    TaskUndo.yaml    # swipe → Done, toast undo, toast queueing (undoes its writes)
    TaskDetail.yaml  # label picker round-trip + pinned composer (appends a comment)
  output/        # captured screenshots (git-ignored)
```

Functional flows assert on `testID`s (`swipe-action-<key>`, `toast`,
`toast-action`) rather than on visible copy, so wording changes don't break them.

## Maestro MCP (agent-driven)

The Maestro MCP server is registered with Claude Code so an agent can drive both
devices directly (`list_devices`, `inspect_screen`, `take_screenshot`, `run`):

```bash
claude mcp add maestro --scope user \
  --env JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home \
  -- ~/.maestro/bin/maestro mcp
```

## Reference workflow (Linear → Elliptic redesign)

1. Sign into Linear on `Android_1` (one-time; see note below).
2. Capture Linear's screens with `reference/` flows → `.maestro/output/linear/`.
3. Capture Elliptic's matching screens with `capture/elliptic-tour.yaml`.
4. Redesign each Elliptic screen against its Linear counterpart (tracked as
   the C-epic tasks, COS-371..380).

> **Linear login note:** Linear signs in via a web OAuth flow (Chrome custom
> tab). The stock `Android_1` emulator is not Play-Protect certified, which can
> block Google sign-in — use Linear's **email magic-link** option instead, or
> run against a Google-Play-enabled AVD.

## Dev-client Tools button

Expo's dev client floats a **Tools** button over the top-right corner — exactly
where `ScreenHeader`'s action pill lives — and it swallows taps there, so
screenshot runs and flows see it, not the app. Turn it off per install:

```bash
xcrun simctl spawn booted defaults write sh.elliptic EXDevMenuShowFloatingActionButton -bool false
# then relaunch the app (dev menu → Tools button toggle does the same thing)
```

## Android findings (2026-08-08, first Android build)

The app builds, installs and launches. Login, Home and the launcher icon are
correct — the adaptive icon masks properly in a real launcher, which had only
ever been verified by measuring pixels.

Three defects, in the order they matter:

1. **`@expo/ui/swift-ui` crashes the app.** `ProfileScreen` and
   `CreateTaskSheet` use `Section`/`Form` from that package with no
   `Platform.OS` guard. Android has no such view manager, so Fabric throws
   `Can't find ViewManager 'ViewManagerAdapter_ExpoUI_SectionView'` and the whole
   app red-boxes — it does not degrade, it dies. This fires when the tab
   navigator pre-renders those screens, so it can take down Tasks too.
   Both need an Android branch built from plain components.

2. **The tab bar does not render.** On Home it is a black slab with the first
   label clipped and the rest absent, so only the first tab is reachable —
   `tapOn: "Notes"` cannot find its target.

3. **Status bar icons are invisible in light mode.** Dark-on-light at the top;
   the status bar content style is never set for Android.

Also: Maestro's `inputText` does not deliver text to a focused field on this
emulator. Fields are found and focused and the keyboard opens, but nothing
arrives — sign in by hand until that is understood.
