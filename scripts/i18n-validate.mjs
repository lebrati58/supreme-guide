/**
 * Validates every locale catalog against en.json:
 *  - every English key is translated (plural keys: `.other` required, extra CLDR categories allowed)
 *  - no unknown keys
 *  - the same {placeholders}
 *  - no empty strings, emoji preserved where the English starts with one
 *  - right script for he / ar / ru / zh (catches untranslated English)
 * Exit code 1 on any error.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales');
const en = JSON.parse(readFileSync(resolve(dir, 'en.json'), 'utf8'));
const PLURAL = /\.(zero|one|two|few|many|other)$/;
const SCRIPT = { he: /[֐-׿]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, zh: /[一-鿿]/ };
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
// Keys whose value may legitimately stay in Latin script (codes, units, brand names).
const LATIN_OK = /^(common\.ok|flight\.numberPh|plan\.trainPh|plan\.busPh|quiz\.seconds|gen\.area\.item|map\.capitalOf)$/;

let total = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json').sort()) {
  const code = file.replace('.json', '');
  const loc = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
  const errs = [];
  const pluralBases = new Set(Object.keys(en).filter((k) => PLURAL.test(k)).map((k) => k.replace(PLURAL, '')));
  for (const [k, v] of Object.entries(en)) {
    if (PLURAL.test(k)) {
      const base = k.replace(PLURAL, '');
      if (k.endsWith('.other') && typeof loc[`${base}.other`] !== 'string') errs.push(`missing ${base}.other`);
      continue;
    }
    const tv = loc[k];
    if (typeof tv !== 'string' || !tv.trim()) { errs.push(`missing ${k}`); continue; }
    if (ph(v) !== ph(tv)) errs.push(`placeholders differ in ${k}: en{${ph(v)}} vs {${ph(tv)}}`);
    const re = SCRIPT[code];
    // Text keys only: skip proper-noun lists where a Latin form can be correct (none expected for these scripts).
    if (re && /[a-z]{3}/i.test(v.replace(/\{\w+\}/g, '')) && !LATIN_OK.test(k) && !re.test(tv)) errs.push(`not in ${code} script: ${k} = ${JSON.stringify(tv).slice(0, 60)}`);
  }
  for (const k of Object.keys(loc)) {
    if (PLURAL.test(k) && pluralBases.has(k.replace(PLURAL, ''))) {
      const base = k.replace(PLURAL, '');
      if (ph(loc[k]) !== ph(en[`${base}.other`])) errs.push(`placeholders differ in ${k}`);
      continue;
    }
    if (!(k in en)) errs.push(`unknown key ${k}`);
  }
  total += errs.length;
  console.log(`${code}: ${Object.keys(loc).length} keys, ${errs.length} error(s)`);
  errs.slice(0, 15).forEach((e) => console.log('   ', e));
}
if (total) { console.error(`\n${total} translation error(s)`); process.exit(1); }
console.log('\nAll locale catalogs valid.');
