# Changelog

## 1.0.0 — 2026-11-08
### Fixed
- The site showed a generic compass emoji instead of the Supreme Guide logo (`brand.svg`). The **official logo** is now used everywhere (home hero, splash, PWA icons, favicon, mascot, social card).

### Added
- Complete rewrite as an installable, offline-first React + TypeScript PWA.
- Interactive MapLibre world map (offline countries + optional detailed online map).
- Flight, Train, Bus, Road Trip (driver safety lock), Walking (GPS discoveries) and Cruise modes; curated real journeys.
- Flight time-zone-aware schedules, estimated progress, delays, countries overflown; flight-lookup proxy template.
- Quiz engine with 10 challenge types, 71 curated sourced questions, 73 landmarks, 30 dated events, and generators over 250 countries.
- XP, levels, 15 badges, passport stamps, World Tour unlocks, daily challenge & streak, family profiles with kid mode, friend challenge links.
- Offline packs (Wikipedia cards & photos), IndexedDB persistence, update prompt, data export & erase.
- Data pipeline, unit tests (29), Playwright airplane-mode e2e (mobile + desktop), GitHub Actions CI/CD to Pages.

### Preserved
- Original prototype kept at `public/legacy/` (served at `/supreme-guide/legacy/`).
