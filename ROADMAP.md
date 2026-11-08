# Roadmap

## ✅ Done (v1.0)
Audit · real logo & identity · React/TS PWA · offline world map · 6 transport modes · flight schedule estimates with time zones ·
10 challenge types · XP/levels/badges/passport/world tour/daily/family/friend links · offline packs · unit + airplane-mode e2e tests · CI/CD.

## Next
1. **Publish**: merge to `main`, set Pages source to GitHub Actions, verify the public site on real phones (iOS Safari, Android Chrome).
2. **Flight lookup**: deploy `server/flight-lookup` (owner’s provider account & key) and set `VITE_FLIGHT_LOOKUP_URL`.
3. **Languages**: ✅ 10 languages shipped. Next: native-speaker review of each catalog, localized city search (GeoNames alternate names), more languages (Japanese, Turkish, Hindi…).
4. **Content**: 300+ curated questions, regional packs (Israel, France, Japan, USA…), more landmarks with photos cached at build time.
5. **Offline map regions**: downloadable vector-tile extracts (PMTiles) per region, respecting provider licences.
6. **Train data**: GTFS-based station search & timetables for major networks.
7. **Accounts & leaderboards** (opt-in, Supabase) with child-safe defaults; asynchronous multiplayer (same-seed duels with result sync).
8. **Audio**: mascot voice lines & sound effects (toggle exists in profile data).
9. **Store apps**: wrap PWA with Capacitor if store presence is wanted.
