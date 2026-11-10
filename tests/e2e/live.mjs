/**
 * Live multiplayer end-to-end: two phones (browser contexts) play a full game together.
 * A local PeerServer replaces the public PeerJS server so the test runs without internet.
 *   npm run build && npm run preview &   then   npm run test:e2e:live
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { ExpressPeerServer } = require('peer');
const express = require('express');

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/supreme-guide/';
const SHOTS = process.env.SHOTS;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const fail = (msg) => { console.error(`  ✘ ${msg}`); process.exitCode = 1; };

const app = express();
const server = app.listen(9123, '127.0.0.1');
app.use('/sg', ExpressPeerServer(server, { path: '/' }));
const PEER = JSON.stringify({ host: '127.0.0.1', port: 9123, path: '/sg', secure: false, config: { iceServers: [] } });

const browser = await chromium.launch();
async function phone(name, locale) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale });
  await ctx.addInitScript((peer) => localStorage.setItem('sg.peerServer', peer), PEER);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' });
  await page.fill('#nm', name);
  return { page, errors };
}

try {
  console.log('\n▶ live multiplayer');
  const host = await phone('Ana', 'en');
  const guest = await phone('Ben', 'fr');

  await host.page.goto(`${BASE}#/live`);
  await host.page.click('.btn.big');
  await host.page.waitForSelector('.live-code-big', { timeout: 20000 });
  const code = (await host.page.textContent('.live-code-big')).trim();
  /^[A-Z2-9]{5}$/.test(code) ? ok(`room created (${code})`) : fail(`bad room code ${code}`);
  (await host.page.isVisible('.live-qr')) ? ok('QR code shown') : fail('no QR code');

  // The guest joins through the shared link (code pre-filled).
  await guest.page.goto(`${BASE}#/live?join=${code}`);
  await guest.page.click('.btn.blue');
  await host.page.waitForSelector('.live-board li:nth-child(2)', { timeout: 20000 })
    .then(() => ok('guest joined, host sees 2 players'), () => fail('guest did not join'));
  await guest.page.waitForSelector('.live-board li:nth-child(2)', { timeout: 10000 })
    .then(() => ok('guest sees the lobby'), () => fail('guest lobby missing'));
  if (SHOTS) await host.page.screenshot({ path: `${SHOTS}/live-lobby.png` });

  await host.page.click('.chip >> nth=0'); // 5 questions
  await host.page.click('.btn.big.green');
  for (let q = 0; q < 5; q++) {
    await Promise.all([host.page.waitForSelector('.answer:not([disabled])', { timeout: 20000 }), guest.page.waitForSelector('.answer:not([disabled])', { timeout: 20000 })]);
    const [hq, gq] = await Promise.all([host.page.textContent('.question'), guest.page.textContent('.question')]);
    if (q === 0) (hq !== gq ? ok('same question shown to each player in their own language') : ok('same question on both phones'));
    await host.page.click('.answer >> nth=0');
    await guest.page.click('.answer >> nth=1');
    await Promise.all([host.page.waitForSelector('.answer.right', { timeout: 10000 }), guest.page.waitForSelector('.answer.right', { timeout: 10000 })]);
    const [ha, ga] = await Promise.all([host.page.$$eval('.answers .answer', (b) => b.findIndex((x) => x.classList.contains('right'))), guest.page.$$eval('.answers .answer', (b) => b.findIndex((x) => x.classList.contains('right')))]);
    if (ha !== ga) fail(`question ${q + 1}: different right answers (${ha} vs ${ga})`);
    if (q === 0 && SHOTS) await guest.page.screenshot({ path: `${SHOTS}/live-reveal-fr.png` });
  }
  ok('5 questions played together, same right answer on both phones');

  await Promise.all([host.page.waitForSelector('.podium', { timeout: 15000 }), guest.page.waitForSelector('.podium', { timeout: 15000 })])
    .then(() => ok('podium on both phones'), () => fail('no podium'));
  const [hs, gs] = await Promise.all([host.page.textContent('.live-board'), guest.page.textContent('.live-board')]);
  hs.replace(/[^\p{L}\d]/gu, '') === gs.replace(/[^\p{L}\d]/gu, '') ? ok('identical final scores') : fail(`scores differ: ${hs} | ${gs}`);
  if (SHOTS) await host.page.screenshot({ path: `${SHOTS}/live-podium.png` });

  // Host leaves → guest is told.
  await host.page.click('text=Leave the game');
  await guest.page.waitForSelector('.notice.warn', { timeout: 15000 }).then(() => ok('guest is told when the host leaves'), () => fail('guest not told'));

  const errs = [...host.errors, ...guest.errors];
  errs.length ? fail(`JS errors: ${errs.join(' | ')}`) : ok('no JavaScript errors');
} catch (e) {
  fail(e.message);
} finally {
  await browser.close();
  server.close?.();
  console.log(process.exitCode ? '\nLIVE E2E FAILED' : '\nLIVE E2E PASSED');
  process.exit(process.exitCode ?? 0);
}
