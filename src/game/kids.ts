import type { Country, Source } from '../types';
import type { GameData } from './engine';
import { FAMOUS } from './engine';
import { pick, shuffle, type Rng } from './rng';
import { LANDMARKS } from '../content/landmarks';
import { KID_ANIMAL_FACTS, KID_ANIMALS } from '../content/kids';
import { countryName, lmCity, lmName } from '../i18n/content';
import { tc } from '../i18n';
import type { LandmarkPhotos } from '../data/photos';

/**
 * “Little travellers” — questions for kids who can't read yet: the question is read aloud and the
 * answers are pictures (emoji, flags, offline landmark photos) with a short name read on tap.
 * Every question has a verified answer, an explanation and a source, like the rest of the game.
 */
export interface KidOption { label: string; emoji?: string; img?: string }
export interface KidQuestion {
  id: string; kind: 'animal' | 'flag' | 'landmark' | 'sea';
  say: string; options: KidOption[]; answer: number; explanation: string; source: Source; countries: string[];
}

const W = (t: string): Source => ({ label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURI(t.replace(/ /g, '_'))}` });
/** Landlocked countries on the Caspian Sea: “by the sea?” would be ambiguous for a child. */
const CASPIAN = new Set(['KAZ', 'TKM', 'AZE']);
/** Well-known landlocked countries, so the “sea” question is not always “yes”. */
const KID_LANDLOCKED = ['CHE', 'AUT', 'HUN', 'CZE', 'NPL', 'MNG', 'BOL', 'PRY', 'LUX', 'ETH', 'SVK', 'LAO'];

export const animalName = (id: string) => tc(`kids.animal.${id}`, KID_ANIMALS.find((a) => a.id === id)?.name ?? id);
const animalOpt = (id: string): KidOption => ({ label: animalName(id), emoji: KID_ANIMALS.find((a) => a.id === id)!.emoji });

function placeAnswer<T>(right: T, wrong: T[], rnd: Rng): { options: T[]; answer: number } {
  const options = shuffle([right, ...wrong], rnd);
  return { options, answer: options.indexOf(right) };
}

function animalQ(c: Country, rnd: Rng): KidQuestion | null {
  const facts = KID_ANIMAL_FACTS.filter(([iso]) => iso === c.iso3);
  if (!facts.length) return null;
  const [iso, right, wrong] = pick(facts, rnd);
  const a = KID_ANIMALS.find((x) => x.id === right)!;
  const { options, answer } = placeAnswer(animalOpt(right), wrong.map(animalOpt), rnd);
  return { id: `kid-animal-${iso}-${right}`, kind: 'animal', countries: [iso], options, answer, source: W(a.wiki),
    say: tc('kids.q.animal', 'Which animal lives in the wild in {country}?', { country: countryName(c) }),
    explanation: tc('kids.e.animal', 'Yes! The {animal} lives in the wild in {country}.', { animal: animalName(right), country: countryName(c) }) };
}

function flagQ(data: GameData, c: Country, rnd: Rng): KidQuestion | null {
  if (!data.flagsOk || !c.flag) return null;
  const others = shuffle(data.countries.filter((x) => x.iso3 !== c.iso3 && FAMOUS.has(x.iso3) && x.flag && x.region !== c.region), rnd).slice(0, 2);
  if (others.length < 2) return null;
  const opt = (x: Country): KidOption => ({ label: countryName(x), emoji: x.flag });
  const { options, answer } = placeAnswer(opt(c), others.map(opt), rnd);
  return { id: `kid-flag-${c.iso3}`, kind: 'flag', countries: [c.iso3], options, answer, source: W(`Flag of ${c.name}`),
    say: tc('kids.q.flag', 'Which one is the flag of {country}?', { country: countryName(c) }),
    explanation: tc('kids.e.flag', 'Well done! That is the flag of {country}.', { country: countryName(c) }) };
}

function seaQ(c: Country, rnd: Rng): KidQuestion | null {
  if (CASPIAN.has(c.iso3)) return null;
  const yes: KidOption = { label: tc('kids.yesSea', 'Yes, there is a sea'), emoji: '🏖️' };
  const no: KidOption = { label: tc('kids.noSea', 'No, no sea'), emoji: '⛰️' };
  const options = rnd() < 0.5 ? [yes, no] : [no, yes];
  const answer = options.indexOf(c.landlocked ? no : yes);
  return { id: `kid-sea-${c.iso3}`, kind: 'sea', countries: [c.iso3], options, answer, source: W(c.landlocked ? 'Landlocked_country' : c.name),
    say: tc('kids.q.sea', 'Can you go to the seaside in {country}?', { country: countryName(c) }),
    explanation: c.landlocked
      ? tc('kids.e.seaNo', '{country} has no sea: it is surrounded by other countries.', { country: countryName(c) })
      : tc('kids.e.seaYes', 'Yes! {country} has a coast, you can go to the beach.', { country: countryName(c) }) };
}

function landmarkQ(photos: LandmarkPhotos, rnd: Rng, iso3?: string): KidQuestion | null {
  const withPhoto = LANDMARKS.filter((l) => photos[l.id]);
  const pool = iso3 ? withPhoto.filter((l) => l.iso3 === iso3) : withPhoto;
  if (!pool.length) return null;
  const l = pick(pool, rnd);
  const others = shuffle(withPhoto.filter((x) => x.iso3 !== l.iso3), rnd).slice(0, 2);
  const base = import.meta.env.BASE_URL ?? '/';
  const opt = (x: typeof l): KidOption => ({ label: lmName(x), img: `${base}${photos[x.id].f}` });
  const { options, answer } = placeAnswer(opt(l), others.map(opt), rnd);
  return { id: `kid-lm-${l.id}`, kind: 'landmark', countries: [l.iso3], options, answer, source: W(decodeURIComponent(l.wiki)),
    say: tc('kids.q.landmark', 'Where is {landmark}?', { landmark: lmName(l) }),
    explanation: tc('kids.e.landmark', 'Bravo! This is {landmark}, in {city}.', { landmark: lmName(l), city: lmCity(l) }) };
}

/**
 * `focus`: countries of the trip (route quiz) — questions are about them first; general otherwise.
 * Never twice the same question in a session.
 */
export function buildKidQuiz(data: GameData, photos: LandmarkPhotos, o: { count: number; rnd: Rng; focus?: string[] }): KidQuestion[] {
  const { rnd } = o;
  const focus = (o.focus ?? []).map((i) => data.byIso3.get(i)).filter((c): c is Country => !!c);
  const known = data.countries.filter((c) => FAMOUS.has(c.iso3) || KID_LANDLOCKED.includes(c.iso3));
  const out: KidQuestion[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < o.count && tries < o.count * 30; tries++) {
    const local = focus.length > 0 && rnd() < 0.75;
    const c = local ? pick(focus, rnd) : pick(known, rnd);
    const k = rnd();
    const q = k < 0.3 ? animalQ(local ? c : pick(known.filter((x) => KID_ANIMAL_FACTS.some(([i]) => i === x.iso3)), rnd), rnd)
      : k < 0.55 ? landmarkQ(photos, rnd, local ? c.iso3 : undefined)
      : k < 0.8 ? flagQ(data, c, rnd)
      : seaQ(c, rnd);
    if (q && !seen.has(q.id)) { seen.add(q.id); out.push(q); }
  }
  return out;
}
