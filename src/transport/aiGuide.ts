import type { Trip, WikiCard } from '../types';
import { locale } from '../i18n';

/**
 * OPTIONAL AI questions (see server/ai-guide/worker.ts). Off unless the site is built with
 * VITE_AI_GUIDE_URL. The worker only rewrites the Wikipedia extracts we send into questions;
 * we validate every question again here, keep it with the trip (offline), and label it “AI”.
 */
export interface AiQuestion { prompt: string; options: string[]; answer: number; explanation: string; source: string }

const ENDPOINT = (import.meta.env.VITE_AI_GUIDE_URL as string | undefined)?.trim();
export const aiConfigured = () => !!ENDPOINT;

export function validAi(q: unknown, sources: string[]): q is AiQuestion {
  const x = q as AiQuestion;
  return !!x && typeof x.prompt === 'string' && x.prompt.length > 5 && x.prompt.length < 400
    && Array.isArray(x.options) && x.options.length === 4 && x.options.every((o) => typeof o === 'string' && o.length > 0 && o.length < 160)
    && new Set(x.options).size === 4 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4
    && typeof x.explanation === 'string' && x.explanation.length < 600 && sources.includes(x.source);
}

export async function fetchAiQuestions(trip: Trip, cards: WikiCard[], routeLabel: string): Promise<AiQuestion[]> {
  if (!ENDPOINT || cards.length === 0) return [];
  const sources = cards.slice(0, 12).map((c) => ({ title: c.title, extract: c.extract.slice(0, 2000), url: c.url }));
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: locale(), route: routeLabel.slice(0, 300), stops: trip.stops.slice(0, 40).map((s) => s.name.slice(0, 120)), sources }),
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { questions?: unknown[] };
    const urls = sources.map((s) => s.url);
    return (j.questions ?? []).filter((q): q is AiQuestion => validAi(q, urls)).slice(0, 8);
  } catch { return []; } finally { clearTimeout(id); }
}
