# Apple targets

Native app extensions, generated into `ios/` at prebuild by
[`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets).

`ios/` is gitignored and regenerated. **This directory is the source of truth.**
Editing the extension inside Xcode works until the next `expo prebuild --clean`
erases it.

```
targets/
  tasks/                      the Tasks widget (WidgetKit)
    expo-target.config.js     target definition: type, families, entitlements
    Snapshot.swift            the app → widget data contract + App Group reader
    ConfigurationIntent.swift the "Edit Widget" sheet
    TasksWidget.swift         timeline provider, filtering, ordering
    TasksWidgetView.swift     layouts per widget family
```

## How data reaches the widget

The app writes; the widget reads. It never fetches.

That is forced, not preferred. `services/secureTokens.ts` stores auth with
`WHEN_UNLOCKED_THIS_DEVICE_ONLY` and no shared Keychain access group, so the
extension cannot read the session — and a Lock Screen widget draws precisely
while the device is locked, when those tokens are unreadable by anyone. There is
no moment at which the widget could authenticate.

```
app  ──JSON──▶  UserDefaults(suiteName: "group.sh.elliptic")  ──▶  widget
     app/services/widget/index.ts        targets/tasks/Snapshot.swift
              │
              └── modules/widget-bridge  (local Expo module, iOS)
```

### Why the write goes through a local module

`@bacons/apple-targets` ships an `ExtensionStorage` class for exactly this, and
it does not work on SDK 55. The package declares `"platforms": ["ios"]` in its
`expo-module.config.json`, but Expo renamed that key to `"apple"` in SDK 51, so
autolinking rejects it:

```
$ pod install --verbose
  - @bacons/apple-targets doesn't support iOS platform
```

The pod is never installed, and the JS class throws when called. The failure is
silent from the app's side — `publishSnapshot` catches everything by design — and
looks exactly like "the widget has no data yet". It cost an afternoon; do not
reach for `ExtensionStorage` again without checking that line of `pod install`.

`modules/widget-bridge` replaces only that runtime bridge. The config-plugin half
of the package is unaffected and still generates the widget target. Writing our
own also lets the reload be scoped to one widget kind rather than every widget on
the device.

`app/services/widget/contract.ts` and `targets/tasks/Snapshot.swift` describe the
same JSON. Nothing checks that at build time — separate targets, separate
languages, no codegen — so `contract.test.ts` asserts the exact key names and
`SNAPSHOT_VERSION` guards the rest. **Change the two files in one commit.**

The snapshot is a *pool*, not a result. Each widget instance carries its own
organisation, project and status filter, which the app cannot know, so the app
writes up to `MAX_TASKS` open tasks and the widget filters them. That also lets
the configuration sheet populate its pickers with no network and while locked.

## Configuration

`TaskFilterIntent` is a `WidgetConfigurationIntent`, so long-pressing a widget
and tapping **Edit Widget** offers organisation, project and status. The
configuration lives on the instance, so two widgets on one screen can watch
different workspaces — the reason this is an `AppIntentConfiguration` widget and
not a `StaticConfiguration` one.

The project picker lists every project rather than only the selected
organisation's: narrowing one parameter by another needs
`@IntentParameterDependency`, which is iOS 18, and this target deploys to 17.
Choosing a mismatched project simply matches nothing, because the provider
filters on organisation *and* project.

## Deep links

A tapped row opens `elliptic://open?entity_type=task&entity_id=…&identifier=…&org_id=…`
— the same four fields a push notification carries, deliberately. A widget can be
configured for a workspace the app is not currently in, and opening a task
without switching first fetches it under the wrong organisation and reports it
deleted. Push shipped that bug once; `PushRegistrar` already switches org before
routing, and the widget should go through the same path.

## Provisioning

`group.sh.elliptic` must exist as an App Group identifier on the Apple Developer
account (team `7TXTQ6TTGQ`), and both the app and the extension need provisioning
profiles that include it. The profile in build 19 has no app-group entitlement,
so the next build regenerates credentials. EAS does this automatically; a local
`xcodebuild` archive needs the profiles refreshed first.

## Working on it

```bash
npx expo prebuild -p ios --clean     # after ANY change here or to app.json
npx expo run:ios                      # dev client must be rebuilt — the widget
                                      # is a native target, not a JS change
```

The widget will not appear in the gallery until the app has been installed once
from a build that contains the extension. To see real data, sign in and let the
app publish a snapshot; before that the widget shows "Open Elliptic to sync",
which is deliberately a different empty state from "Nothing matches this filter".

## Not done yet

- `publishSnapshot()` has one call site — `useWidgetSnapshot` on the Home screen
  — and it publishes **the active organisation only**, because that is all the
  app ever has loaded. A widget pointed at another workspace stays empty until
  that workspace has been opened once. Closing that needs a background fetch
  across every org, which is the push-driven refresh work.
- The `elliptic://open` URL is emitted by the widget but the app has no route for
  it: `app.tsx`'s linking config maps only the five tabs. `routeFromData` in
  `PushRegistrar.tsx` should be extracted and shared.
- Android. No code here applies — Glance/RemoteViews is a separate target and a
  separate config plugin. Only the snapshot contract would carry over.
