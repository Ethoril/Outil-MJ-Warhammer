import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// Barre du haut à 390 px : les quatre onglets (Préparer, Jouer, Campagne, Bibliothèque) sur une ligne, sans troncature ni débordement.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.locator('#app-content').waitFor({ state: 'visible' });
  const measure = () => page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.topbar-main .tabs [role="tab"]')];
    return {
      labels: tabs.map(t => t.textContent.trim()),
      tops: tabs.map(t => Math.round(t.getBoundingClientRect().top)),
      clipped: tabs.filter(t => t.scrollWidth > t.clientWidth).map(t => t.textContent.trim()),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  for (const active of ['#tab-prepare', '#tab-library']) {
    await page.locator(active).click();
    const layout = await measure();
    assert.deepEqual(layout.labels, ['Préparer', 'Jouer', 'Campagne', 'Bibliothèque']);
    assert.equal(new Set(layout.tops).size, 1, `les quatre onglets tiennent sur une ligne (hauts : ${layout.tops.join(', ')})`);
    assert.deepEqual(layout.clipped, [], 'aucun libellé d’onglet tronqué');
    assert.ok(layout.docOverflow <= 0, 'pas de débordement horizontal à 390 px');
  }
  if (process.env.ONGLETS_SHOT) await page.screenshot({ path: process.env.ONGLETS_SHOT });
  assert.deepEqual(errors, []);
  console.log('topbar-onglets-mobile: OK');
} finally { await browser.close(); server.close(); }
