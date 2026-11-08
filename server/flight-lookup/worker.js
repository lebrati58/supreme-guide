/**
 * OPTIONAL flight-number lookup proxy for Supreme Guide — NOT deployed by default.
 * Cloudflare Worker template (free tier available). It keeps the provider API key
 * server-side and returns a small normalised JSON to the game.
 *
 * Provider: AeroDataBox via RapidAPI (has a free/basic plan; check current pricing & terms).
 * Deploy:
 *   npm i -g wrangler && wrangler init flight-lookup
 *   wrangler secret put AERODATABOX_KEY
 *   wrangler secret put ALLOWED_ORIGIN   # e.g. https://lebrati58.github.io
 *   wrangler deploy
 * Then build the game with VITE_FLIGHT_LOOKUP_URL=https://<your-worker>.workers.dev
 *
 * Response: { from, to, date, depLocal, arrLocal } (IATA codes and HH:MM local times) or 404.
 */
export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', 'Cache-Control': 'public, max-age=900' };
    const url = new URL(request.url);
    const number = (url.searchParams.get('number') || '').toUpperCase().replace(/\s/g, '');
    const date = url.searchParams.get('date') || '';
    if (!/^([A-Z0-9]{2}|[A-Z]{3})\d{1,4}[A-Z]?$/.test(number) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: cors });
    }
    const r = await fetch(`https://aerodatabox.p.rapidapi.com/flights/number/${number}/${date}?withAircraftImage=false&withLocation=false`, {
      headers: { 'X-RapidAPI-Key': env.AERODATABOX_KEY, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' },
    });
    if (r.status === 204 || r.status === 404) return new Response('{}', { status: 404, headers: cors });
    if (!r.ok) return new Response(JSON.stringify({ error: 'provider error' }), { status: 502, headers: cors });
    const list = await r.json();
    const f = Array.isArray(list) ? list[0] : null;
    if (!f) return new Response('{}', { status: 404, headers: cors });
    const hhmm = (s) => (s && s.length >= 16 ? s.slice(11, 16) : undefined); // "2026-11-08 14:25+01:00" → 14:25 (local)
    return new Response(JSON.stringify({
      from: f.departure?.airport?.iata, to: f.arrival?.airport?.iata, date,
      depLocal: hhmm(f.departure?.scheduledTime?.local), arrLocal: hhmm(f.arrival?.scheduledTime?.local),
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
