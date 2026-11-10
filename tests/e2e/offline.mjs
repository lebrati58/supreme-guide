/**
 * End-to-end smoke + AIRPLANE-MODE test (Playwright library, no test runner needed).
 *   npm run build && npm run preview &   then   npm run test:e2e
 * Env: BASE_URL (default http://localhost:4173/supreme-guide/), SHOTS=dir to save screenshots.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/supreme-guide/';
const SHOTS = process.env.SHOTS;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const fail = (msg) => { console.error(`  ✘ ${msg}`); process.exitCode = 1; };

async function run(name, ctxOpts) {
  console.log(`\n▶ ${name}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::|Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  const shot = (f) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}-${f}.png` });

  // 1. Online first visit
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hero-logo img');
  const logoOk = await page.$eval('.hero-logo img', (i) => i.complete && i.naturalWidth > 0);
  logoOk ? ok('official logo renders') : fail('logo image missing');
  await page.waitForTimeout(1500); // let animations move (the logo orbit rotates)
  const overflow = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const culprits = [...document.querySelectorAll('body *')]
      .filter((e) => !e.closest('.maplibregl-map') && e.getBoundingClientRect().right > W + 0.5)
      .slice(0, 3).map((e) => `${e.tagName}.${String(e.className).slice(0, 30)}`);
    return { px: document.documentElement.scrollWidth - W, culprits };
  });
  overflow.px <= 0 ? ok('no horizontal scroll') : fail(`horizontal overflow ${overflow.px}px (${overflow.culprits.join(', ')})`);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null || false, null, { timeout: 20000 }).catch(() => {});
  // Ensure SW controls the page (first load installs it; reload to be controlled).
  await page.reload({ waitUntil: 'networkidle' });
  const controlled = await page.evaluate(() => !!navigator.serviceWorker?.controller);
  controlled ? ok('service worker controls the page') : fail('service worker not controlling');
  await page.waitForSelector('.map[data-loaded="1"]', { timeout: 20000 }).then(() => ok('interactive map loaded (online)'), () => fail('map did not load online'));
  (await page.$$('.legend-card')).length === 10 ? ok('10 legendary journeys on the home page') : fail('legendary journeys missing');
  await shot('home');

  // 2. AIRPLANE MODE
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.hero-logo img', { timeout: 15000 });
  ok('app shell reloads offline');
  (await page.isVisible('text=Offline')) ? ok('offline badge visible') : fail('offline badge missing');

  // Quiz offline
  await page.goto(`${BASE}#/quiz/quick`);
  await page.waitForSelector('.question-card', { timeout: 15000 });
  for (let i = 0; i < 8; i++) {
    if (await page.$('.chrono-item')) { for (const it of await page.$$('.chrono-item')) await it.click(); await page.click('text=Check order'); }
    else if (await page.$('.svgmap')) { await page.click('text=Can’t tap the map? Choose from a list'); await page.click('.answer >> nth=0'); }
    else await page.click('.answer >> nth=0');
    await page.waitForSelector('.feedback');
    await page.click('.feedback .btn');
  }
  await page.waitForSelector('.big-score');
  ok('full quiz played offline');
  await shot('quiz-result');

  // Trip creation offline (curated train, stop-to-stop geometry, offline country detection)
  await page.goto(`${BASE}#/plan/train`);
  await page.click('text=Ride this route → >> nth=0');
  await page.waitForSelector('text=Countries along the way', { timeout: 20000 });
  ok('trip created offline with countries computed locally');
  (await page.isVisible('.phrases')) ? ok('local phrases card on a legendary journey') : fail('phrases card missing');
  await page.waitForSelector('.map[data-loaded="1"]', { timeout: 20000 }).then(() => ok('interactive map loaded OFFLINE with route'), () => fail('map did not load offline'));
  await page.click('text=Play stage quiz');
  await page.waitForSelector('.question-card');
  // Finish the stage quiz: countries reached on the trip are stamped whatever the score.
  while (await page.$('.question-card')) {
    if (await page.$('.chrono-item')) { for (const it of await page.$$('.chrono-item')) await it.click(); await page.click('text=Check order'); }
    else if (await page.$('.svgmap')) { await page.click('text=Can’t tap the map? Choose from a list'); await page.click('.answer >> nth=0'); }
    else await page.click('.answer >> nth=0');
    await page.waitForSelector('.feedback');
    await page.click('.feedback .btn');
  }
  ok('stage quiz played offline');
  // Guide mode (statements instead of questions), still offline.
  await page.click('.seg button >> nth=1');
  await page.waitForSelector('.guide-now', { timeout: 10000 }).then(() => ok('guide mode shows facts offline'), () => fail('guide mode did not render'));
  await page.click('.seg button >> nth=0');
  await shot('trip');

  // Persisted progress survives reload offline
  const xp = await page.textContent('.topbar .pill.gold');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.topbar .pill.gold');
  (await page.textContent('.topbar .pill.gold')) === xp ? ok('progress persisted (IndexedDB)') : fail('progress lost after reload');

  // Passport & airports search offline
  await page.goto(`${BASE}#/passport`);
  await page.waitForSelector('.stamp');
  ok('passport stamps shown');
  await page.goto(`${BASE}#/plan/flight`);
  await page.fill('#ap-from', 'TLV');
  await page.waitForSelector('.suggest button');
  ok('airport search works offline');
  // City search in another language, offline (GeoNames names): “Londres” finds London.
  await page.goto(`${BASE}#/plan/car`);
  await page.fill('.field input >> nth=0', 'Londres');
  await page.waitForSelector('.suggest button:has-text("London")', { timeout: 10000 })
    .then(() => ok('city search in another language works offline'), () => fail('“Londres” did not find London offline'));

  // Languages, still in airplane mode: switch to Hebrew (right-to-left) and play a quiz.
  if (name === 'mobile') {
    await page.goto(`${BASE}#/`);
    await page.click('.lang-btn');
    await page.click('.lang-chip[lang="he"]');
    await page.waitForFunction(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'he', null, { timeout: 10000 })
      .then(() => ok('switched to Hebrew offline (dir=rtl)'), () => fail('language switch failed'));
    // Nothing on screen may stay in the previous language (e.g. the mascot's speech bubble).
    const bubble = (await page.textContent('.bubble')) ?? '';
    /[֐-׿]/.test(bubble) ? ok('mascot bubble switched to Hebrew') : fail(`mascot bubble not in Hebrew: ${bubble}`);
    await page.goto(`${BASE}#/quiz/quick`);
    await page.waitForSelector('.question-card');
    const qText = await page.textContent('.question');
    /[\u0590-\u05FF]/.test(qText ?? '') ? ok('quiz question shown in Hebrew') : fail(`question not in Hebrew: ${qText}`);
    const rtlOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rtlOverflow <= 0 ? ok('no horizontal scroll in RTL') : fail(`RTL overflow ${rtlOverflow}px`);
    await shot('hebrew-quiz');
    await page.goto(`${BASE}#/`);
    await page.click('.lang-btn');
    await page.click('.lang-chip[lang="en"]');
    await page.waitForFunction(() => document.documentElement.dir === 'ltr');
  }

  await ctx.setOffline(false);
  errors.length ? fail(`JS errors: ${errors.join(' | ')}`) : ok('no JavaScript errors');
  await browser.close();
}

await run('mobile', { ...devices['iPhone 13'] });
await run('desktop', { viewport: { width: 1366, height: 900 } });
console.log(process.exitCode ? '\nE2E FAILED' : '\nE2E PASSED');
