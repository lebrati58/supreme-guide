import { normaliseFlightNumber } from './flight';
import { t } from '../i18n';

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
  if (!n) return { status: 'error', message: t('lookup.badNumber') };
  if (!ENDPOINT) return { status: 'unavailable', message: t('lookup.notConnected') };
  if (!navigator.onLine) return { status: 'unavailable', message: t('lookup.offline') };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`${ENDPOINT}?number=${encodeURIComponent(n)}&date=${encodeURIComponent(date)}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.status === 404) return { status: 'not-found', message: t('lookup.notFound', { flight: n, date }) };
    if (!r.ok) return { status: 'error', message: t('lookup.failedStatus', { status: String(r.status) }) };
    const j = (await r.json()) as LookupResult;
    return { ...j, status: 'found' };
  } catch {
    return { status: 'error', message: t('lookup.failed') };
  }
}
