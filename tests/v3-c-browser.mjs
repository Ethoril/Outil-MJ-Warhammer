import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Lot v3-C : parcours navigateur sur l'application complète et son vrai Store (livre de base V5 v3) :
// Diction instinctive refusée après un Test raté (p.121), attribut des Bêtes (p.245), attaque gratuite du Trait Grim (p.358).
const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(base));
    const path = resolve(root, pathname.slice(base.length) || 'index.html');
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const person = (id, name, camp, extra = {}) => ({ id, name, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative: 40, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, BE: 3, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 50, Soc: 40 },
  skills: [{ id: 'dodge', name: 'Esquive', status: 'resolved', total: 40, carac: 'Ag' }, { name: 'Langue (Magick)', total: 30 }, { name: 'Focalisation', total: 60 }],
  actions: [], equipment: [], traits: [], talents: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } }, ...extra });
const fixture = () => ({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { combatId: 'v3-c-browser', turnIndex: 1 } },
  combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'm'], participants: [
    person('a', 'Mage', 'pj', { talents: [{ id: 'talent-instinctive-diction', status: 'resolved', rank: 1 }], extensions: { v5: { hasMomentum: false, channelling: { type: 'winds', sl: 2 } } } }),
    person('b', 'Orque', 'ennemi', { extensions: { v5: { hasMomentum: true } } }),
    person('m', 'Fauve', 'ennemi', { traits: ['Grim'], actions: [{ id: 'claw', note: 'Griffe', type: 'attack', attr: 'CC', base: 60, damage: 5 }], extensions: { v5: { hasMomentum: true } } })
  ] } });

await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.locator('#tab-combat').click();
  const load = state => page.evaluate(async value => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; await Store.loadFromJSON(value); }, state);
  const read = () => page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; return JSON.parse(Store.getFullJSON()); });
  const hasMomentum = (state, id) => state.combat.participants.find(row => row.id === id).extensions.v5.hasMomentum;

  // 1. Diction instinctive : refusée après un Test de lancement raté (maladresse), appliquée après un double réussi (p.121).
  await load(fixture());
  const casting = roll => page.evaluate(async value => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready;
    const { getSpellContract } = await import('/Outil-MJ-Warhammer/js/core/v5-spell-contracts.js');
    const preview = Store.previewCasting(getSpellContract('Carreau'), { actorId: 'a', roll: value.roll, miscastRoll: 15, instinctiveDiction: true, ...value.extra });
    return { miscast: preview.miscast ? { cancelled: preview.miscast.cancelled, modifier: preview.miscast.modifier, refused: preview.miscast.mitigationRefused } : null, ready: preview.ready };
  }, roll);
  const failed = await casting({ roll: 99, extra: {} });
  assert.equal(failed.miscast?.modifier, 0, 'Test raté : le jet d’incident n’est pas réduit de 20');
  assert.equal(failed.miscast?.refused, true, 'la Diction instinctive est signalée comme refusée');
  const succeeded = await casting({ roll: 11, extra: {} });
  assert.equal(succeeded.miscast, null, 'double réussi : 15 − 20 annule l’incident');

  // 2. Attribut des Bêtes : le lanceur gagne l'Élan, l'ennemi vivant perd le sien (p.245).
  await load(fixture());
  const applied = await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready;
    const preview = Store.previewLoreAttribute({ casterId: 'a', lore: 'beasts', spell: { cn: 6 } });
    return Store.applyLoreAttribute(preview, { casterId: 'a', cn: 6 });
  });
  assert.notEqual(applied?.ok, false, JSON.stringify(applied));
  let state = await read();
  assert.equal(hasMomentum(state, 'a'), true, 'le lanceur gagne l’Élan');
  assert.equal(hasMomentum(state, 'b'), false, 'l’ennemi vivant perd l’Élan');
  assert.equal(hasMomentum(state, 'm'), false, 'le fauve ennemi aussi');

  // 3. Trait Grim : l'attaque gratuite ne dépense pas l'Élan (il en faut un) ; le coût passe en exemption.
  await load(fixture());
  const grim = momentum => page.evaluate(async value => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready;
    await Store.updateParticipant('m', { extensions: { v5: { hasMomentum: value } } });
    const preview = Store.previewResolution({ resolutionId: 'grim-' + value, actorId: 'm', targetId: 'a', roll: 25, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
      defense: { base: 35, roll: 80, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', extraAttack: true, context: { freeAttackTalent: 'grim' } } });
    return { ready: preview.actionCosts.ready, paid: preview.actionCosts.paid.length, waived: preview.actionCosts.waived.length };
  }, momentum);
  assert.deepEqual(await grim(true), { ready: true, paid: 0, waived: 1 });
  assert.equal((await grim(false)).ready, false, 'sans Élan, pas d’attaque gratuite');
  // L'interface propose la case de l'attaque gratuite de Grim.
  await page.locator('#workspace-root [data-workspace-select="m"]').click();
  await page.locator('#workspace-root [data-action-key="claw"]').click();
  await page.locator('#workspace-root').getByLabel('Type d’action').selectOption('attack');
  assert.ok(await page.locator('#workspace-root').getByLabel(/Attaque gratuite de Grim/u).count() >= 1, 'case Grim présente');
  // 4. Souffle : la cible choisie dans l'espace de travail reste la cible cochée par défaut (jamais le lanceur).
  await load(fixture());
  await page.locator('#workspace-root [data-workspace-select="a"]').click();
  await page.locator('#workspace-root').locator('[data-focus-key="target-m"]').click();
  await page.locator('#workspace-root').getByLabel('Type d’action').selectOption('cast');
  const spellSelect = page.locator('#workspace-root').getByLabel(/Sort/u).first();
  await spellSelect.selectOption({ label: 'Souffle · NI 6 (arcane)' });
  const box = page.locator('#workspace-root details.workspace-v5-context-details', { hasText: 'Cibles multiples' });
  await box.locator('summary').click();
  assert.equal(await box.getByLabel('Cible du sort : Fauve').isChecked(), true, 'la cible choisie reste cochée');
  assert.equal(await box.getByLabel('Cible du sort : Orque').isChecked(), false);
  assert.equal(await box.getByLabel('Cible du sort : Mage').isChecked(), false, 'le lanceur n’est pas coché');
  assert.deepEqual(errors, []);
  console.log('v3-C navigateur : OK');
} finally { await browser.close(); server.close(); }
