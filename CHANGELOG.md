# Changelog

## 1.4.0 — 2026-11-09
### Added
- **On-demand route content**: opening a trip online prepares its Wikipedia place cards in your language automatically (kept for offline); new quiz “which place on your route is described here?”.
- **🌟 10 legendary journeys**: Route 66, California coast, Glacier Express, Trans-Siberian, Eurostar, Tōkaidō Shinkansen, Great Ocean Road, Norwegian fjords, Amalfi Coast, Western Mediterranean. Each has verified stories told at the right stop in guide mode, 5 special questions, and useful phrases in the local language with pronunciation, read aloud by a local voice. New home-page section. New journeys: Route 66 and the Amalfi Coast.
- **Share from Waze / Google Maps / Apple Maps**: on an installed app (Android), “Share” a destination to Supreme Guide to create the road trip and its quiz.
- **Optional AI questions** (Claude), grounded only on the route's Wikipedia texts and labelled 🤖 AI. Server template in `server/ai-guide/`; off by default (needs your own API key, paid per use).
- **When the route runs dry, general knowledge in your favourite subjects**: the trip asks once which subjects you like — history, geography, life sciences, physics & chemistry, maths, philosophy, arts & literature — and completes the quiz with clearly labelled “🌍 General knowledge” questions. New hand-checked banks (≈70 questions with sources) and computed travel maths (time, speed, percentages). Also as a **🧠 Themed quiz** in Play; subjects editable in Profile.
- Translated in all 10 languages.


## 1.3.0 — 2026-11-09
### Fixed
- **Trip quizzes now follow the route.** Questions were country-generic and could drift to other countries (e.g. Congo on the Shinkansen). On a trip, every question is now about the route or its countries, mostly about the route itself: which place comes first, which town is on your route, the biggest town you pass, crow-flies distance, direction of travel, next country, landmark near the route. Built from the trip's own stops, GeoNames towns in a corridor around the path and nearby landmarks.
- Trans-Siberian line no longer cuts through China/Mongolia (added real intermediate stations as waypoints).

### Added
- **Guide mode** (🧭): statements instead of questions — the Supreme Guide tells you about the countries, towns, landmarks, facts and history along your route, in order, with “coming up next”. Optional read-aloud in the player's language (device voices, works offline); the audio guide keeps talking on the driver safety screen.
- Translated in all 10 languages.


## 1.2.0 — 2026-11-09
### Added
- **Sound effects & vibrations**: correct / wrong answers, streaks, level-ups, badges, passport stamps, take-off and landing, and the last seconds of the Blitz timer. Synthesised with Web Audio (no audio files: offline, no download, no licence). Vibrations via the Vibration API (Android; iPhone has none).
- Profile switches for sound and vibrations (on by default), translated in all 10 languages.


## 1.1.0 — 2026-11-08
### Added
- **10 languages**: English, French, Spanish, German, Italian, Portuguese, Russian, Hebrew, Arabic, Chinese (Simplified). Everything is translated: interface, questions, explanations, landmarks, timelines, journeys, badges, ranks and the mascot.
- Right-to-left layout for Hebrew and Arabic; automatic language detection; 🌐 language switcher; each family profile keeps its own language.
- Official CLDR names for countries, currencies and languages; Wikipedia cards in the player's language.
- Translation validator + per-language unit tests + Hebrew airplane-mode e2e test, enforced in CI.

### Changed
- The hero shows the whole logo (the circular crop cut the plane); a larger gold SVG plane with a contrail orbits it.


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
