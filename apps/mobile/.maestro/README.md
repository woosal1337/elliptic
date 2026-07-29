# CompanyOS mobile — Maestro test & reference harness

Cross-platform [Maestro](https://maestro.dev) flows that drive **two** devices:

| Target | Device | Purpose |
|---|---|---|
| **iOS** | booted iPhone 17 Pro simulator | where CompanyOS mobile is developed & tested |
| **Android** | `Android_1` emulator (`emulator-5554`) | runs **Linear** (`app.linear`) — our UX north star — for reference capture |

## Runner

```bash
scripts/maestro.sh devices                                   # list connected iOS + Android devices
scripts/maestro.sh ios     .maestro/capture/companyos-tour.yaml
scripts/maestro.sh android .maestro/reference/linear-onboarding.yaml
```

Env overrides: `IOS_DEVICE` (UDID), `ANDROID_DEVICE` (adb id), `MAESTRO_BIN`, `ADB`.
Screenshots land under `.maestro/output/<app>/…` (git-ignored).

## Layout

```
.maestro/
  reference/     # flows that drive Linear on Android → the design reference library
    linear-onboarding.yaml
  capture/       # flows that tour CompanyOS itself (before/after redesign diffs)
    companyos-tour.yaml
  flows/         # functional test flows (Login, …)
  output/        # captured screenshots (git-ignored)
```

## Maestro MCP (agent-driven)

The Maestro MCP server is registered with Claude Code so an agent can drive both
devices directly (`list_devices`, `inspect_screen`, `take_screenshot`, `run`):

```bash
claude mcp add maestro --scope user \
  --env JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
  -- ~/.maestro/bin/maestro mcp
```

## Reference workflow (Linear → CompanyOS redesign)

1. Sign into Linear on `Android_1` (one-time; see note below).
2. Capture Linear's screens with `reference/` flows → `.maestro/output/linear/`.
3. Capture CompanyOS's matching screens with `capture/companyos-tour.yaml`.
4. Redesign each CompanyOS screen against its Linear counterpart (tracked as
   the C-epic tasks, COS-371..380).

> **Linear login note:** Linear signs in via a web OAuth flow (Chrome custom
> tab). The stock `Android_1` emulator is not Play-Protect certified, which can
> block Google sign-in — use Linear's **email magic-link** option instead, or
> run against a Google-Play-enabled AVD.
