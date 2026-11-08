# 🌍 SUPREME GUIDE — Every Journey Is a Game!

<p align="center"><img src="public/brand/logo-640.jpg" width="320" alt="Supreme Guide — The Global Travel Quiz Game"></p>

**Supreme Guide** turns any trip — ✈️ flight, 🚆 train, 🚌 bus, 🚗 road trip, 🚶 walk, 🚢 cruise — into a travel quiz adventure,
anywhere in the world, **online or in airplane mode**. Hosted by the Supreme Guide himself: slightly pompous, always kind.

**Play:** https://lebrati58.github.io/supreme-guide/ (installable PWA)

## Features (v1.0)
- **Official brand identity**: original logo, animated mascot, PWA icons, favicon, splash screen, social card.
- **Interactive world map** (MapLibre GL): offline country map (Natural Earth), optional detailed online map (OpenFreeMap / OSM), routes, progress, landmarks, visited & unlocked regions.
- **6 transport modes**
  - Flight: airports (3,638 with scheduled service), local times with real time zones, great-circle route, **schedule-based estimated position** (always labelled as an estimate), delays, optional GPS, countries overflown computed offline. Flight-number lookup ready via a server proxy (not connected yet).
  - Train / Bus / Cruise: stations, ports and stops from 9,126 cities (GeoNames) + online search; curated real journeys (Tōkaidō Shinkansen, Glacier Express, Trans-Siberian…).
  - Road trip: road routing on OSM (OSRM) when online, **passenger/driver mode with a GPS safety lock**.
  - Walking: explore around you (GPS, opt-in) with proximity discoveries, or explore a city.
- **Game engine** with 10 challenge types: multiple choice, true/false, find-the-country on a map, landmark recognition (photo online / text clue offline), timelines, capitals, timed blitz, history & culture, observation (flags, areas), surprise double-XP challenges. Every question has a verified answer, explanation, difficulty, category and source.
- **Progression**: XP, levels & titles, 15 badges, virtual passport with stamps, World Tour with region unlocks, daily challenge & streak, family profiles (kid mode), family leaderboard, friend challenges by link (no account, no server).
- **Offline-first PWA**: versioned precache of the whole game & data, IndexedDB storage, offline trip packs (Wikipedia place cards & photos), update prompt, sync-ready outbox.

## Develop
```bash
npm install
npm run dev          # http://localhost:5173/supreme-guide/
npm test             # unit tests (Vitest)
npm run build        # production build → dist/
npm run preview &    # serve dist on :4173
npm run test:e2e     # Playwright smoke + airplane-mode test
npm run data         # rebuild public/data from npm data packages
```

## Deploy
GitHub Actions (`.github/workflows/ci-deploy.yml`) type-checks, tests, builds, runs the airplane-mode e2e test and deploys `dist/` to GitHub Pages on every push to `main`.
**One-time setting:** *Settings → Pages → Build and deployment → Source: “GitHub Actions”.*

## Credits & licences
Logo & mascot © Supreme Guide. Code: see repository owner.
Data: [mledoze/countries](https://github.com/mledoze/countries) (ODbL) · [Natural Earth](https://www.naturalearthdata.com/) (public domain) ·
[OurAirports](https://ourairports.com/data/) via airport-data-js (CC BY 4.0) · [GeoNames](https://www.geonames.org/) via all-the-cities (CC BY 4.0) ·
online: [OpenFreeMap](https://openfreemap.org) / © OpenMapTiles / © OpenStreetMap contributors, OSRM, Nominatim, Wikipedia (CC BY-SA).
Map engine: MapLibre GL JS (BSD-3). Fonts: Baloo 2, Nunito (OFL).

See [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md).
The original prototype is preserved at [`public/legacy/`](public/legacy/index.html).
