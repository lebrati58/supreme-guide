# Changelog

## 1.16.0 — 2026-11-26
### Added
- **🎯 Road bingo** (Play, and on every trip): a 3×3 or 4×4 card of things to spot through the window, by transport mode — cows and tunnels by car, another train and vineyards by train, clouds below and snowy mountains by plane, dolphins and harbours at sea, fountains and street musicians on foot (66 items, in the 10 languages). Tap a picture when you see it (its name is read aloud); a full row, column or diagonal = **Bingo!**, a full card too. On a trip, up to 3 gold cells are about the actual route (rivers, summits with their side, borders, landmarks) and unlock as you get close. Several players, each with their own card, on one phone; the driver never plays. Modest XP for profiles. Cards are kept if you leave the screen. Fully offline.
### Fixed
- Trip stage card: ghost buttons and chips (duel, memory quiz, bingo) were white on the light gold card; they now use the card's ink.

## 1.15.0 — 2026-11-25
### Added
- **🧳 Memory quiz** at the end of a trip: up to 8 questions only about what the guide told along THIS route, in the order of the journey — rivers crossed, mountain ranges and deserts, which side a summit was on, how the clocks changed, the driving side, landmarks passed, countries entered, towns passed and which came first, and the legendary journeys' stories. Wrong options are certainly wrong (features near the route but not on it, landmarks and towns away from it, countries not crossed). Shown once the trip is complete, when the route gave at least 4 facts (14 of the 18 curated journeys); replayable, and playable as a one-phone duel (“who listened best?”). Works offline.
- New badge 🐘 **Elephant Memory** for a perfect memory quiz.

## 1.14.0 — 2026-11-22
### Added
- **🌙 Night mode** for night flights, night trains and night drives: a dark theme with dim cards instead of white ones, softer gold, dimmed photos and maps (text contrast checked ≥ 4.5:1 by a unit test). **Auto** by default: on when the phone is in dark mode and every evening from 21:00 to 07:00 local time; or forced 🌙 / ☀️ in Profile. Works offline.
- In night mode, sounds and vibrations are muted by default (Profile switch), confetti is lighter and the read-aloud voice is softer.
- On a road trip at night (for passengers), a one-time tip: turn the brightness down so the screen doesn't dazzle the driver.

## 1.13.0 — 2026-11-21
### Added
- **🧸 Little travellers** — a real mode for children who can't read yet (Play, first tile for kid profiles; also the stage quiz on trips for kid profiles):
  - the question is **read aloud** with the phone's voice (offline), 🔊 to hear it again; a clear message when the phone has no voice for the language;
  - **picture answers**: 2–3 big cards — animals, flags, offline landmark photos, seaside or not — with their name underneath;
  - no timer and never “wrong!”: a soft sound, the mascot encourages, try again until found;
  - questions from verified data only: 16 hand-checked “which animal lives in the wild in…” facts (with sources; the other choices have no wild population there), flags (only on devices that show flag emoji), landmark photos, coast or landlocked (Caspian countries left out); on a trip, mostly about the trip's countries;
  - a **sticker** every 3 pictures found on the first try, in a new **sticker album** in the passport (kept in backups and transfers).
### Fixed
- Passport: rotated stamps could make the page scroll sideways on phones.

## 1.12.0 — 2026-11-19
### Added
- **🛋️ Duel on one phone** (Play, and on every trip): 2 to 6 players take turns on the same phone with the same questions — family profiles and added first names — fully offline (airplane, train without signal, one phone for the family). A “pass the phone to…” screen hides everyone's answers until all have played; the right answer, who picked what, and the scores are then shown. Classic, Elimination and Teams modes (parents vs kids), 20 s per turn, the first player rotates each question, podium at the end. On a trip the questions are about the route; when this phone's player is the driver, that profile can't play. XP goes to each family profile.
### Fixed
- Saving several profiles at once could drop all but the last one (one save timer per profile now).

## 1.11.0 — 2026-11-18
### Added
- **📷 Landmark photos, even in airplane mode**: “Recognise this landmark!” now shows a real photo for 72 of the 73 landmarks, stored in the app (≈20 KB each, 1.4 MB in all) so it works offline. Photos from Wikimedia Commons under clearly free licences only (public domain, CC0, CC BY, CC BY-SA, Free Art License, KOGL Type 1); the author and licence are shown under each photo, and the full list is in Profile → Credits. The one landmark without a free photo (Sheikh Zayed Grand Mosque) keeps its text clue.
- **📷 Photo only** (Play): a harder quiz — name the landmark from its photo alone, the clue appears only after you answer.
- Rebuild with `scripts/build_landmark_photos.py`.

## 1.10.0 — 2026-11-16
### Added
- **🕐 Time changes along the way**: the guide (and the trip radio) tells you when you enter a new time zone — “put your watch forward (+1 h); local time is now UTC+3” — for the trip's date, daylight saving time included. Local zones come from the nearest airport in the country being crossed.
- **🚗 Driving side at the border**: on road trips, the guide warns when you enter a country that drives on the other side (and at the start if it is on the left). Data: OpenStreetMap country-coder (ISC).

## 1.9.0 — 2026-11-15
### Added
- **📥 Restore a backup**: the “Export my data” file can now be restored (Profile). A preview shows the players and trips first; **merge** keeps the best of both (XP, stamps, badges, records, trip progress) — nothing is lost — or **replace** after confirmation. Backup files are strictly checked (types, sizes, http(s)-only links).
- **📲 Transfer to another phone**: directly phone to phone (no account, nothing stored online) with a code or QR code; the sending phone confirms before anything is sent.
- **💾 Reminder**: after 3 trips without a backup for 30 days, a gentle reminder on the home screen (dismiss for a week).

## 1.8.0 — 2026-11-11
### Added (ideas from GuideAlong, Autio and Flyover Country)
- **Rivers, mountains and deserts along the way**: the guide tells you when your route crosses a river, enters a mountain range, a desert or a plateau, and which summits are in view (with their height). New quiz questions about them. Offline data: Natural Earth (public domain) with names in the 10 languages (GeoNames for rivers).
- **⬅️ Left or right?** Landmarks and summits come with the side to look at, and the trip radio warns you a few km before. Given only where it is reliable: on real road/walking routes, or far enough from approximate train/flight lines (a wrong side is worse than none).
- **📻 Trip radio**: the guide reads every story in order as you reach it, without skipping any, plus heads-ups for things to see.
- **🔊 Hear place names in the local language** (Москва, ירושלים, 北京…), with the phone's local voice — for countries with one official language, and Israel.
- **🗺️ Choose your trip on the map**: tap the start, then the destination.

## 1.7.0 — 2026-11-11
### Added (ideas from GeoGuessr and Seterra)
- **🔥 Survival**: questions until your first mistake; your record is kept.
- **🔁 Review my mistakes**: replay only the questions you got wrong (the last 40); a question leaves the list once you get it right.
- **🌱 Learn mode**: no timer, no points — try again until you find the answer.
- **Live multiplayer modes**: 💀 Elimination (a wrong or late answer and you're out; last one standing wins) and 🔵🔴 Teams (blue vs red, best average wins; the host moves players between teams).
### Fixed
- Live: a “Leave the game” button during questions; opening a new invite link while on the Live screen now joins the new game.

## 1.6.0 — 2026-11-10
### Added
- **📡 Live multiplayer**: play together in real time, each on your own phone. The host creates a game (short code + QR code / link), up to 8 players join, everyone gets the same questions at the same time — each in their own language — with a 20-second timer, points for right answers plus a speed bonus, a live scoreboard and a podium. XP counts like any quiz.
- Peer-to-peer (WebRTC via PeerJS): no account and nothing stored online; the free public PeerJS server only introduces the phones. Needs internet on every phone; strict networks that block direct connections show a clear message.
- Tests: referee logic and identical quizzes across languages (unit); a full two-phone game against a local PeerServer (e2e, in CI).

## 1.5.0 — 2026-11-10
### Added
- **City names in your language, offline**: search a city in any of the 10 languages — “Londres”, “Moscou”, “Pekin” (accents optional), “לונדון”, “Лондон”, “伦敦” — even in airplane mode. Towns along the route are named in your language in quizzes and in the guide (“Moscou”, “מוסקבה”, “莫斯科”). Names from GeoNames alternate names (CC BY 4.0) for 9,126 cities (Chinese converted to Simplified with OpenCC); when a name is missing the usual name is kept. Rebuild with `scripts/build_city_names.py`.

## 1.4.1 — 2026-11-10
### Fixed
- The mascot's speech bubble now follows a language switch.

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
