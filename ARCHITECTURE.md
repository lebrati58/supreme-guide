# Architecture

## Stack (and why)
| Choice | Reason |
|---|---|
| **Vite + React 18 + TypeScript** (static SPA) | GitHub Pages hosting is static; no SSR needed, so Next.js would add complexity without benefit. Fast builds, strict typing. |
| **MapLibre GL JS 6** | Open-source (BSD-3), vector maps, no API key. |
| **Natural Earth 1:50m (bundled)** | Offline base map + offline point-in-country lookup. Public domain. |
| **OpenFreeMap** (optional, online) | Free vector tiles of OSM without keys or quotas; attribution shown. |
| **vite-plugin-pwa / Workbox** | Versioned precache (hash revisions), runtime caches for tiles & Wikipedia, update prompt. |
| **IndexedDB (idb)** | Profiles, trips, offline packs, sync outbox. Memory fallback if blocked. |
| **Hash router** | Works on GitHub Pages and offline without rewrites. |
| **Vitest + Playwright** | Unit tests on data/engine/time zones; e2e with real airplane-mode emulation. |

## Layout
```
src/
  types.ts                 domain types (Trip, Question, Country…)
  data/loaders.ts          fetch + cache of public/data/*.json, TopoJSON → GeoJSON
  geo/geo.ts               haversine, great circles, densify, locate on path, antimeridian unwrap
  geo/countryIndex.ts      offline point-in-polygon & “countries along a path”
  content/                 curated questions, landmarks, events, journeys (verified, sourced)
  game/engine.ts           question generators from structured data + session builder + validator
  game/progression.ts      XP, levels, badges, stamps, daily streak, world-tour unlocks
  game/mascot.ts           contextual lines with shuffle-bags (no repetition)
  transport/               time zones (Intl), flight schedule/estimate, lookup client, OSRM routing, Wikipedia packs, trip factory
  storage/db.ts, sync.ts   IndexedDB + outbox (sync-ready, no remote configured)
  map/WorldMap.tsx         MapLibre map (lazy-loaded chunk)
  components/              Quiz runner, SVG world map, mascot, place search, UI bits
  screens/                 Home, Planner, TripView, Play, QuizScreen, Passport, Country, Profile
  i18n/                    dictionary per locale + RTL support (en ready; fr/es/he/de planned)
scripts/build_data.py      reproducible data pipeline (reads package data files, never runs their code)
server/flight-lookup/      optional serverless proxy template (keeps API key server-side)
tests/unit, tests/e2e
```

## Honesty rules built into the code
- Flight position = **schedule-based estimate** along a great circle; the UI labels it “Estimated” and never as live. GPS (opt-in) is shown separately and preferred when it matches the route.
- Train/cruise lines are **stop-to-stop**, labelled as such; road/walk routes use OSM routing when online, else stop-to-stop.
- Countries along a route are computed from 1:50m borders; microstates (e.g. Vatican City) and narrow islands can be missed — stated in the UI.
- Generated questions use **structured data only** (capitals, borders, area, currencies, regions); free text (Wikipedia) is shown as “Did you know?” cards, never turned into answers.
- Politically sensitive capitals/borders are excluded from generated questions (explicit lists in `engine.ts`).
- Offline: the game, data, outline map, routes and progress always work offline; detailed street tiles are only cached for areas already viewed online.

## Offline model
1. First online visit: service worker precaches app shell, data (~3.9 MB raw, ~1.3 MB compressed) and the MapLibre worker.
2. Trip creation works offline (local search, stop-to-stop geometry, offline country detection).
3. “Download for offline” adds Wikipedia cards + photos along the route to IndexedDB / Cache Storage and requests persistent storage.
4. Cache names are versioned (`sg-*-v1`) and outdated precaches are cleaned on update.

## Security & privacy
- No secrets in the client. `VITE_*` variables are public by design; the flight provider key lives only in the serverless proxy.
- No analytics, no accounts, no third-party scripts. GPS off by default; position never leaves the device.
- External links use `rel="noopener noreferrer"`; Wikipedia text is rendered as text (no HTML injection).
- `npm audit --omit=dev`: 0 vulnerabilities (remaining advisories are in build-only tooling).

## Accounts, leaderboards & sync (evaluated, not connected)
Supabase (Postgres + Auth + Row Level Security, free tier) fits accounts, global leaderboards and cloud saves.
Not connected without the owner’s authorization. Plan: anonymous-first, opt-in account, children’s profiles never published,
leaderboards show nicknames only, `storage/sync.ts#registerRemote` flushes the existing outbox.

## Transport data providers (evaluated)
| Need | Options | Status |
|---|---|---|
| Flight number → schedule | AeroDataBox (RapidAPI, free/basic tier), Aviationstack (free tier, HTTPS limits), FlightAware AeroAPI (paid) | Proxy template ready (`server/flight-lookup`), **not deployed** |
| Live aircraft position | OpenSky Network (research/non-commercial terms) | Not used — estimates + GPS instead |
| Train timetables | GTFS feeds per operator, Transitland, national APIs (SNCF, DB, JR…) | Planned per country |
| Road routing | OSRM demo / FOSSGIS (fair use) → self-hosted OSRM/Valhalla for scale | Used on demand, fallback offline |
| Geocoding | Nominatim (1 req/s, explicit action only) | Used on demand |
