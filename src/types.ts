export type Mode = 'flight' | 'train' | 'bus' | 'car' | 'walk' | 'cruise';
export const MODES: Mode[] = ['flight', 'train', 'bus', 'car', 'walk', 'cruise'];

/** [longitude, latitude] — GeoJSON order. */
export type LngLat = [number, number];

export type Region = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania' | 'Antarctic';

export interface Country {
  iso2: string; iso3: string; num: string;
  name: string; official: string;
  capital: string; capitals: string[];
  region: Region; subregion: string;
  lat: number; lng: number; area: number;
  borders: string[]; landlocked: boolean; flag: string;
  independent: boolean; un: boolean;
  currencies: string[]; currencyCodes: string[]; languages: string[]; languageCodes: string[]; demonym: string;
}

export interface Airport {
  iata: string; icao: string; name: string; cc: string;
  lat: number; lng: number; tz: string; size: 'L' | 'M';
}

export interface City { name: string; cc: string; lat: number; lng: number; pop: number; capital: boolean }

export type Category = 'geography' | 'capitals' | 'history' | 'culture' | 'landmarks' | 'transport' | 'nature' | 'flags';
export type QuestionKind =
  | 'mcq' | 'truefalse' | 'mapfind' | 'monument' | 'chronology'
  | 'capital' | 'blitz' | 'history' | 'observation' | 'surprise';
export type Difficulty = 1 | 2 | 3;

export interface Source { label: string; url: string }

export interface Question {
  id: string;
  kind: QuestionKind;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  /** Multiple choice / true-false options. */
  options?: string[];
  answer?: number;
  /** Chronology: items given in the CORRECT order (oldest → newest); UI shuffles them. */
  order?: { label: string; year: number }[];
  /** Map-find: ISO 3166-1 numeric id of the country to tap. */
  targetNum?: string;
  targetName?: string;
  explanation: string;
  source?: Source;
  /** ISO3 codes this question is about (used to match route countries). */
  countries?: string[];
  /** Wikipedia title for an optional photo (monument recognition). */
  imageTitle?: string;
  clue?: string;
  timeLimit?: number;
  bonus?: boolean;
  /** General-knowledge filler on a trip whose route offers too little material. */
  general?: boolean;
}

export interface Stop { name: string; lat: number; lng: number; cc?: string; note?: string }

export type GeometrySource = 'great-circle' | 'stop-to-stop' | 'road-network' | 'walking-network' | 'gps-trace';

export interface FlightInfo {
  number?: string;
  from: string; to: string;          // IATA
  date: string;                      // YYYY-MM-DD (local departure date)
  depLocal: string; arrLocal: string; // HH:MM local times at each airport
  depUtc: number; arrUtc: number;     // epoch ms
  delayMin: number;
  scheduleSource: 'player' | 'provider' | 'estimated';
}

export interface WikiCard { title: string; extract: string; url: string; thumb?: string; lat?: number; lng?: number }

export interface Trip {
  id: string;
  mode: Mode;
  title: string;
  stops: Stop[];
  geometry: LngLat[];
  geometrySource: GeometrySource;
  distanceKm: number;
  /** ISO3 codes in travel order with the fraction of the route where they are first entered. */
  countries: { iso3: string; at: number }[];
  createdAt: number;
  label?: string; // train number, bus line…
  flight?: FlightInfo;
  depUtc?: number; arrUtc?: number;
  role?: 'passenger' | 'driver';
  packAt?: number; // when the offline pack was downloaded
  packLang?: string; // language of the downloaded place cards
  /** Optional AI questions (grounded on `wiki`, same language), only when the AI guide is configured. */
  ai?: { prompt: string; options: string[]; answer: number; explanation: string; source: string }[];
  wiki?: WikiCard[];
  progress?: number; // last known 0..1
  answeredIds?: string[];
  completedAt?: number;
  curatedId?: string;
}
