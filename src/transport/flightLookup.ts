import { normaliseFlightNumber } from './flight';

/**
 * Flight-number lookup through a server-side proxy that holds the provider key
 * (see server/flight-lookup). No key ever ships in this public bundle.
 * Without VITE_FLIGHT_LOOKUP_URL the game says so honestly and the player enters times manually.
 */
export interface LookupResult {
  status: 'found' | 'not-found' | 'unavailable' | 'error';
  message?: string;
  from?: string; to?: string;          // IATA
  depLocal?: string; arrLocal?: string; // HH:MM
  date?: string;
}

const ENDPOINT = (import.meta.env.VITE_FLIGHT_LOOKUP_URL as string | undefined)?.trim();

export const lookupConfigured = () => !!ENDPOINT;

export async function lookupFlight(number: string, date: string): Promise<LookupResult> {
  const n = normaliseFlightNumber(number);
  if (!n) return { status: 'error', message: 'That does not look like a flight number (e.g. AF1234).' };
  if (!ENDPOINT) return { status: 'unavailable', message: 'Live flight lookup is not connected yet. Enter airports and times from your boarding pass.' };
  if (!navigator.onLine) return { status: 'unavailable', message: 'You are offline. Enter airports and times manually.' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`${ENDPOINT}?number=${encodeURIComponent(n)}&date=${encodeURIComponent(date)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (r.status === 404) return { status: 'not-found', message: `No schedule found for ${n} on ${date}.` };
    if (!r.ok) return { status: 'error', message: `Lookup failed (${r.status}).` };
    const j = (await r.json()) as LookupResult;
    return { ...j, status: 'found' };
  } catch {
    return { status: 'error', message: 'Lookup failed. Enter the details manually.' };
  }
}
