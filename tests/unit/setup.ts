import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Serve /public files to the data loaders (they use fetch in the browser).
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  const m = url.match(/data\/([\w.-]+\.json)$/);
  if (!m) throw new Error(`Unexpected network call in tests: ${url}`);
  const body = readFileSync(resolve(__dirname, '../../public/data', m[1]), 'utf8');
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;
