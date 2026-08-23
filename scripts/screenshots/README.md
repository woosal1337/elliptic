# Screenshots

The images the repository README shows. Everything here rebuilds them from a
running Elliptic, so a screenshot never drifts from the product.

| File | What it does |
|---|---|
| `seed_showcase.py` | Builds the **Northwind** demo workspace over the API: six members (two of them agents), two projects, 26 work items, three meeting transcripts, notes, and Drive documents. |
| `capture.mjs` | Signs in with Playwright and writes one PNG per web surface, in both themes. |
| `readme-shots.yaml` | The Maestro flow that tours the iOS app. It lives in `apps/mobile/.maestro/capture/`. |
| `optimize.py` | Shrinks each PNG to the width the README draws it at. |
| `run.sh` | Runs all four in order. |
| `showcase.json` | Written by the seeder. Holds the ids the capture scripts need. |

Every person, project, and sentence in the seed is invented. No live workspace
data reaches an image.

## Rebuild them

```bash
scripts/dev-stack.sh up
scripts/screenshots/run.sh          # web + mobile
scripts/screenshots/run.sh web      # web only
```

`run.sh` writes into `.github/assets/`. It needs `node` for the web pass, the
API virtual environment for the seeder, and a `python3` with Pillow for the
shrink step. A file named `web-board.png` is the dark
theme, and `web-board-light.png` is the light one. The README pairs them with a
`<picture>` element, so each reader sees their own theme.

## Before the mobile pass

The mobile step drives a booted iOS simulator. Install the app on it first,
pointed at the local API:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1 \
  npx expo run:ios --device "$IOS_DEVICE"
```

Build Debug, not Release. Only `config.dev.ts` reads `EXPO_PUBLIC_API_URL`, so
a Release build talks to production whatever that variable says.

A Debug build floats the Expo dev-menu button over every screen. `run.sh`
turns it off with the app's own preference:

```bash
xcrun simctl spawn "$IOS_DEVICE" defaults write sh.elliptic \
  EXDevMenuShowFloatingActionButton -bool NO
```

The flow therefore never launches with `clearState`, because that erases the
preference. It signs out at the start instead.

## Gotchas

- **Object storage.** The Drive screen needs an S3-compatible endpoint. Start
  one the way `scripts/e2e.sh` does, then restart the API with `R2_ENDPOINT_URL`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET` set. Without it the
  Drive is empty and the seeder fails on the upload step.
- **Port 3000.** `dev-stack.sh` gives the port up when another app already holds
  it. Read the port from the web log, then pass `WEB_ORIGIN` to `run.sh`.
- **One login.** The API rate-limits repeated sign-ins, so `capture.mjs` signs in
  one time and reuses the cookies across every context.
- **Page width.** The app caps its content at `max-w-7xl`. A wider window only
  adds empty margins, so the board is captured in a window sized to that cap.
