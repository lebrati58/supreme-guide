import type { Question } from '../types';
import type { GameData } from './engine';
import type { RouteCtx } from './route';
import { featureName } from './nature';
import { placeName as placeLabel } from './guide';
import { formatShift } from './practical';
import { shuffle, type Rng } from './rng';
import { LANDMARKS } from '../content/landmarks';
import { legendFor } from '../content/legendary';
import { cityName, countryName, legendQuestion, lmName } from '../i18n/content';
import { fmtNum, tc } from '../i18n';

/**
 * “Memory quiz” at the end of a trip: questions only about what the guide told along THIS route
 * (the same data as buildGuide: rivers crossed, ranges, summits and their side, time changes, driving
 * side, landmarks passed, countries entered, legendary stories), in the order of the journey.
 * Wrong options are certainly wrong: features near the route but not on it, landmarks of countries the
 * route doesn't cross, countries not on the route, the other side of the road.
 */
export const MEMORY_MIN = 4;
const NE_SRC = { label: 'Natural Earth · GeoNames', url: 'https://www.naturalearthdata.com/' };
type Cand = Question & { at: number; group: string };

function mcq(id: string, at: number, group: string, prompt: string, right: string, wrong: string[], rnd: Rng, explanation: string, source: Question['source'], countries: string[], category: Question['category'] = 'geography'): Cand | null {
  const others = wrong.filter((w, k, a) => w !== right && a.indexOf(w) === k);
  if (!others.length) return null;
  const options = shuffle([right, ...others], rnd);
  return { id, at, group, kind: 'mcq', category, difficulty: 2, prompt, options, answer: options.indexOf(right), explanation, source, countries };
}

export function buildMemoryQuiz(route: RouteCtx, data: GameData, rnd: Rng, count = 8): Question[] {
  if (route.explore) return [];
  const isos = route.countries.map((c) => c.iso3);
  const onRoute = new Set(isos);
  const c = (iso3: string) => data.byIso3.get(iso3);
  const out: Cand[] = [];
  const push = (q: Cand | null) => { if (q) out.push(q); };

  // Rivers crossed (wrong: rivers of the same area the route doesn't cross)
  const crossed = new Set(route.nature.rivers.map((r) => r.name));
  for (const r of route.nature.rivers.slice(0, 3)) {
    const name = featureName(r);
    const wrong = shuffle(route.nature.nearRivers.filter((x) => !crossed.has(x.name)), rnd).map(featureName).slice(0, 3);
    if (wrong.length < 2) continue;
    push(mcq(`mem-river-${r.name}`, r.at, 'river', tc('mem.river.q', 'Which river did we cross on the way?'), name, wrong, rnd,
      tc('mem.river.e', 'We crossed {name}, about {km} km into the trip.', { name, km: Math.round(r.at * route.pathKm) }), NE_SRC, isos, 'nature'));
  }
  // Mountain ranges / deserts / plateaus
  const inside = new Set(route.nature.regions.map((g) => g.name));
  for (const g of route.nature.regions.slice(0, 2)) {
    const name = featureName(g);
    const wrong = shuffle(route.nature.nearRegions.filter((x) => !inside.has(x.name)), rnd).map(featureName).slice(0, 3);
    if (wrong.length < 2) continue;
    push(mcq(`mem-region-${g.name}`, g.at, 'region', tc('mem.region.q', 'Which mountain range, desert or plateau did we go through?'), name, wrong, rnd,
      tc('mem.region.e', 'We went through {name}.', { name }), NE_SRC, isos, 'nature'));
  }
  // Summits: on which side? (only when the guide gave a side — it does so only when reliable)
  for (const pk of route.nature.peaks.filter((p) => p.side).slice(0, 2)) {
    const name = featureName(pk);
    const left = tc('mem.left', 'On the left'), right = tc('mem.right', 'On the right');
    push(mcq(`mem-peak-${pk.name}`, pk.at, 'peak', tc('mem.peak.q', 'On which side was {name}?', { name }), pk.side === 'left' ? left : right, [pk.side === 'left' ? right : left], rnd,
      tc('mem.peak.e', '{name} ({m} m) was {side}.', { name, m: fmtNum(pk.elevation), side: (pk.side === 'left' ? left : right).toLowerCase() }), NE_SRC, isos, 'nature'));
  }
  // Time changes: total shift over the trip
  if (route.practical.tz.length) {
    const tz = route.practical.tz;
    const total = tz.reduce((s, z) => s + (z.toMin - z.fromMin), 0);
    if (total !== 0) {
      const vals = [total, -total, total + (total > 0 ? 60 : -60), total > 60 || total < -60 ? total - Math.sign(total) * 60 : 0]
        .filter((v, k, a) => a.indexOf(v) === k);
      const label = (v: number) => (v === 0 ? tc('mem.tz.none', 'No change') : formatShift(v));
      push(mcq('mem-tz', tz[tz.length - 1].at, 'tz', tc('mem.tz.q', 'Over the whole trip, how did we change our watches?'), label(total), vals.slice(1).map(label), rnd,
        tc('mem.tz.e', 'In total, the clocks changed by {shift}.', { shift: formatShift(total) }),
        { label: 'IANA time zone database', url: 'https://www.iana.org/time-zones' }, isos));
    }
  }
  // Driving side (road trips), when the guide announced it
  if (route.mode === 'car' || route.mode === 'bus') {
    // Same rule as the guide: announced at the start when it is the left, and whenever it changes.
    let prev: 'l' | 'r' | undefined;
    route.countries.forEach(({ iso3, at }, k) => {
      const cc = c(iso3);
      const side = cc ? route.practical.drive[cc.iso2] : undefined;
      if (!cc || !side) return;
      if ((k === 0 && side === 'l') || (prev && side !== prev)) {
        const left = tc('mem.driveLeft', 'On the left'), right = tc('mem.driveRight', 'On the right');
        push(mcq(`mem-drive-${iso3}`, at, 'drive', tc('mem.drive.q', 'On which side of the road do people drive in {country}?', { country: countryName(cc) }), side === 'l' ? left : right, [side === 'l' ? right : left], rnd,
          tc('mem.drive.e', 'In {country}, people drive {side}.', { country: countryName(cc), side: (side === 'l' ? left : right).toLowerCase() }),
          { label: 'OpenStreetMap · country-coder', url: 'https://github.com/rapideditor/country-coder' }, [iso3]));
      }
      prev = side;
    });
  }
  // Landmarks passed (wrong: landmarks of countries the route doesn't cross)
  const passed = new Set(route.landmarks.map((x) => x.l.id));
  const far = LANDMARKS.filter((l) => !passed.has(l.id) && !onRoute.has(l.iso3) && !(l.shared ?? []).some((s) => onRoute.has(s)));
  for (const { l, at } of route.landmarks.slice(0, 3)) {
    const wrong = shuffle(far.filter((x) => x.kind === l.kind), rnd).concat(shuffle(far, rnd)).map(lmName).slice(0, 3);
    push(mcq(`mem-lm-${l.id}`, at, 'lm', tc('mem.lm.q', 'Which of these did we pass near?'), lmName(l), wrong, rnd,
      tc('mem.lm.e', 'We passed near {name}.', { name: lmName(l) }), { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${l.wiki}` }, [l.iso3], 'landmarks'));
  }
  // Countries entered, in order (wrong: countries not on the route)
  const notOn = data.countries.filter((x) => !onRoute.has(x.iso3) && x.independent);
  route.countries.forEach(({ iso3, at }, k) => {
    if (k === 0) return;
    const prev = c(route.countries[k - 1].iso3), cur = c(iso3);
    if (!prev || !cur) return;
    const near = shuffle(notOn.filter((x) => x.region === cur.region), rnd);
    const wrong = near.concat(shuffle(notOn, rnd)).slice(0, 3).map(countryName);
    push(mcq(`mem-country-${iso3}`, at, 'country', tc('mem.country.q', 'Which country did we enter after {country}?', { country: countryName(prev) }), countryName(cur), wrong, rnd,
      tc('mem.country.e', 'After {from}, we entered {to}.', { from: countryName(prev), to: countryName(cur) }),
      { label: 'Natural Earth', url: 'https://www.naturalearthdata.com/' }, [iso3]));
  });
  // Towns and stops the guide presented (same selection as buildGuide)
  const told = [...route.places.filter((x) => x.stop), ...route.places.filter((x) => !x.stop).sort((a, b) => b.pop - a.pop).slice(0, 18)]
    .filter((p) => p !== route.from && p !== route.to)
    .filter((p, k, a) => a.findIndex((q) => q.name === p.name) === k)
    .sort((a, b) => a.at - b.at);
  const label = (p: (typeof told)[number]) => placeLabel(p, route);
  // “Which town did we pass through?” (wrong: towns of the same countries far from the route)
  const offNames = shuffle(route.offRoute, rnd).map((x) => cityName(x)).filter((n) => !told.some((p) => label(p) === n));
  const usedPlaces = new Set<string>();
  for (const p of shuffle(told.filter((x) => !x.stop), rnd).slice(0, 2)) {
    usedPlaces.add(p.name);
    push(mcq(`mem-place-${p.name}`, p.at, 'town', tc('mem.town.q', 'Which of these towns did we pass?'), label(p), offNames.splice(0, 3), rnd,
      tc('mem.town.e', 'We passed {place}, about {km} km into the trip.', { place: label(p), km: Math.round(p.at * route.pathKm) }),
      { label: 'GeoNames', url: 'https://www.geonames.org/' }, isos));
  }
  // “Which did we reach first?” (the order is certain: positions along the path)
  for (let k = 0; k + 2 < told.length && out.filter((q) => q.group === 'order').length < 2; k++) {
    const trio = [told[k], told[k + 1], told[k + 2]].filter((p, i, a) => a.findIndex((q) => label(q) === label(p)) === i);
    if (trio.length < 3 || trio[1].at - trio[0].at < 0.01 || trio.some((x) => usedPlaces.has(x.name))) continue;
    trio.forEach((x) => usedPlaces.add(x.name));
    push(mcq(`mem-order-${trio[0].name}`, trio[2].at, 'order', tc('mem.order.q', 'Which of these did we reach first?'), label(trio[0]), trio.slice(1).map(label), rnd,
      tc('mem.order.e', 'In order: {list}.', { list: trio.map(label).join(' → ') }), { label: 'GeoNames', url: 'https://www.geonames.org/' }, isos));
  }

  // Legendary journeys: their verified questions (the guide told these stories)
  const legend = legendFor(route.curatedId);
  if (legend) {
    for (const q of shuffle(legend.questions, rnd).slice(0, 2)) {
      const loc = legendQuestion(legend, q);
      const order = shuffle(loc.options.map((_, i) => i), rnd);
      out.push({ id: `mem-legend-${legend.journey}-${q.id}`, at: 0.5, group: 'legend', kind: 'mcq', category: 'history', difficulty: 2, prompt: loc.prompt,
        options: order.map((i) => loc.options[i]), answer: order.indexOf(q.a), explanation: loc.explanation,
        source: { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${legend.wiki}` }, countries: isos });
    }
  }

  const uniq = out.filter((q, k) => out.findIndex((x) => x.id === q.id) === k);
  out.length = 0; out.push(...uniq);
  if (out.length < MEMORY_MIN) return [];
  // Variety first: one of each kind, then fill; keep the order of the journey.
  const picked: Cand[] = [];
  const groups = [...new Set(out.map((q) => q.group))];
  for (let round = 0; picked.length < count && round < 4; round++) {
    for (const g of groups) {
      const next = out.filter((q) => q.group === g && !picked.includes(q))[0];
      if (next && picked.length < count) picked.push(next);
    }
  }
  return picked.sort((a, b) => a.at - b.at).map(({ at: _a, group: _g, ...q }) => q);
}
