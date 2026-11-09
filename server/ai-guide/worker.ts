/**
 * OPTIONAL "AI guide" for Supreme Guide: grounded route questions written by Claude.
 * NOT deployed by default — the game works fully without it (data + Wikipedia, free).
 *
 * Safety & honesty rules:
 *  - The API key stays here, as a Worker secret. It never reaches the browser or the repository.
 *  - Claude may ONLY use the source texts the game sends (Wikipedia extracts about places on the
 *    route). It is told not to add outside facts; every question must cite one of those sources.
 *  - The output is schema-validated here, then validated again in the client, and labelled “AI”.
 *  - It costs money per request (Anthropic API pricing). Rate-limit it and set a spending limit
 *    in the Anthropic Console.
 *
 * Deploy (Cloudflare free tier):
 *   cd server/ai-guide && npm install
 *   npx wrangler secret put ANTHROPIC_API_KEY
 *   npx wrangler secret put ALLOWED_ORIGIN        # e.g. https://lebrati58.github.io
 *   npx wrangler deploy worker.ts --name supreme-guide-ai --compatibility-flag nodejs_compat
 * Then build the game with VITE_AI_GUIDE_URL=https://supreme-guide-ai.<you>.workers.dev
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

interface Env { ANTHROPIC_API_KEY: string; ALLOWED_ORIGIN?: string }

const Source = z.object({ title: z.string().max(200), extract: z.string().max(2000), url: z.string().url() });
const RequestBody = z.object({
  lang: z.string().regex(/^[a-z]{2}$/),                 // player's language
  route: z.string().max(300),                           // “Paris → Marseille by train”
  stops: z.array(z.string().max(120)).max(40),
  sources: z.array(Source).min(1).max(12),
});

const Output = z.object({
  questions: z.array(z.object({
    prompt: z.string(),
    options: z.array(z.string()).length(4),
    answer: z.number().int().min(0).max(3),
    explanation: z.string(),
    sourceIndex: z.number().int().min(0),               // index in `sources` the answer comes from
  })),
});

const SYSTEM = `You write short quiz questions for travellers, in the language the user asks for.
Use ONLY the facts stated in the numbered source texts. Do not add any fact, date or number that is not in them; if a source has nothing quiz-worthy, skip it.
Each question has exactly 4 options, one of them correct; wrong options must be plausible but clearly wrong according to the source.
The explanation restates the fact from the source in one sentence. sourceIndex is the number of the source used.
Write at most 8 questions, friendly and suitable for all ages.`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://lebrati58.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });

    const parsed = RequestBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400, headers: cors });
    const body = parsed.data;

    const sources = body.sources.map((s, i) => `[${i}] ${s.title}: ${s.extract}`).join('\n\n');
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const response = await client.messages.parse({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        output_config: { effort: 'low', format: zodOutputFormat(Output) },
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `Language: ${body.lang}\nJourney: ${body.route}\nStops: ${body.stops.join(', ')}\n\nSources:\n${sources}`,
        }],
      });
      if (response.stop_reason === 'refusal' || !response.parsed_output) {
        return Response.json({ questions: [] }, { headers: cors });
      }
      // Keep only well-formed questions tied to a real source.
      const questions = response.parsed_output.questions
        .filter((q) => q.sourceIndex < body.sources.length && new Set(q.options).size === 4)
        .map((q) => ({ ...q, source: body.sources[q.sourceIndex].url }));
      return Response.json({ questions, model: response.model }, { headers: cors });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return Response.json({ error: 'busy' }, { status: 429, headers: cors });
      if (e instanceof Anthropic.APIError) return Response.json({ error: 'upstream' }, { status: 502, headers: cors });
      throw e;
    }
  },
};
