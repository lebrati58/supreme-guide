---
name: playwright
description: Drive SUPREME GUIDE in a real browser with Playwright — launch the built app, run the e2e suites, take screenshots at phone and desktop sizes, check for console errors and horizontal overflow, and verify UI changes end to end. Use when asked to test, screenshot, debug or verify anything visual or interactive in the app, or to run `test:e2e` / `test:e2e:live`.
---

# Playwright for SUPREME GUIDE

Playwright and Chromium are already installed in the environment. `require('playwright')`
works from any directory and `chromium.launch()` needs no options.
**Never run `npx playwright install`** or add another Playwright version — it won't find the browser.
Tools that need a Chrome binary use `/opt/pw-browsers/chromium` with `--headless --no-sandbox`.

## 1. Start the app

The e2e tests target the **production preview** (service worker + PWA), not `vite dev`:

```bash
npm run build
npm run preview            # strict port 4173, run in background
# app URL: http://localhost:4173/supreme-guide/
```

Wait until `curl -sf http://localhost:4173/supreme-guide/` succeeds before driving it.
For quick UI iteration, `npm run dev` is fine (read the port from Vite's output).

## 2. Run the existing suites

| Command | What it covers |
|---|---|
| `npm run test:e2e` | `tests/e2e/offline.mjs` — smoke test, logo render, no horizontal scroll, airplane-mode/offline via the service worker |
| `npm run test:e2e:live` | `tests/e2e/live.mjs` — multiplayer Live mode over a local PeerJS server on port 9123 |

Env: `BASE_URL` (default `http://localhost:4173/supreme-guide/`), `SHOTS=<dir>` saves screenshots.
Run a suite once on failure to reproduce, fix, then show it passing.

## 3. Ad-hoc checks (write scripts in the scratchpad, not the repo)

```js
const { chromium, devices } = require('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] }); // or { viewport: { width: 1280, height: 800 } }
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:4173/supreme-guide/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'shot.png', fullPage: true });
await browser.close();
```

Always check, for every visual change:
- **Phone first** — the app is portrait/mobile; test `iPhone 13` and a desktop viewport.
- **No horizontal overflow** — `document.documentElement.scrollWidth <= clientWidth`
  (ignore elements inside `.maplibregl-map`).
- **No console/page errors** — ignore `net::`/`Failed to load resource` noise from blocked tiles.
- **Offline still works** if you touched assets, the SW or `vite.config.ts`
  (`ctx.setOffline(true)` then reload).
- **Dark and light** — `page.emulateMedia({ colorScheme: 'dark' })`.

## 4. Screenshots

- For the user to see: `deviceScaleFactor: 2` (unless emulating a named device, which sets its own).
- For your own check: `deviceScaleFactor: 1`.
- Save to the scratchpad and send with SendUserFile; don't commit screenshots.

## 5. Playwright MCP (optional)

If the `mcp__playwright__*` tools are loaded (configured in `.mcp.json`), use them for
interactive exploration: `browser_navigate` → `browser_snapshot` (accessibility tree, preferred
over screenshots for locating elements) → `browser_click` / `browser_type` → `browser_take_screenshot`.
Turn any flow worth keeping into a script under `tests/e2e/`.

## 6. Clean up

Stop the preview/dev server and any PeerJS server you started when you're done.
