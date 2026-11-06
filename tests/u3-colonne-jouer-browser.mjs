// U3 (05/11) : colonne Jouer allégée — équipement en puces sur la fiche, repli des projectiles hors duel.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import { launchBrowser } from './helpers/browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => { try { const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); assert.ok(pathname.startsWith(base)); const path = resolve(root, pathname.slice(base.length) || 'index.html'); assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile()); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(path)); } catch { res.writeHead(404); res.end('Not found'); } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  const pavise = reference.equipment.items.find(i => i.id === 'shield-armures-bouclier-pavois-pavise');
  const ratling = reference.equipment.items.find(i => i.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const actor = { id: 'a', name: 'Porteur', kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 60, CT: 60, F: 40, E: 40, FM: 40, Ag: 40, Int: 40 }, skills: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
    equipment: [pavise, ratling, { id: 'lev', name: 'Leviathan Plate', kind: 'armour', ap: 2, locations: ['body'], layer: 'rigid', keywords: [], extensions: {} }],
    actions: [{ id: 'hit', name: 'Coup', type: 'attack', attr: 'CC', base: 60, damage: 4, qualities: [], extensions: {} }],
    extensions: { v5: { lodgedProjectiles: [{ id: 'p1', ammunitionId: 'fleche', removal: 'surgery' }] } } };
  const target = { ...actor, id: 't', name: 'Cible', camp: 'ennemi', equipment: [], actions: [], extensions: { v5: {} } };
  const extra = { id: 'x', name: 'Figurant', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 0, maxHp: 8, states: [], talents: [], extensions: { v5: { lodgedProjectiles: [{ id: 'p2', ammunitionId: 'carreau', removal: 'surgery' }] } } };
  await page.evaluate(async s => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; await Store.loadFromJSON(JSON.stringify(s)); },
    { schemaVersion: 3, reserve: [], diceLines: [], log: [], combat: { round: 1, currentActorId: 'a', orderMode: 'manual', order: ['a', 't', 'x'], participants: [actor, target, extra] }, extensions: { v5: { combatId: 'u3', turnIndex: 1, suddenDeathEnabled: true } } });
  await page.locator('#tab-combat').click();
  await page.waitForSelector('.workspace-duel');
  const center = page.locator('.workspace-duel').locator('xpath=..'), actorSheet = page.locator('.workspace-sheet-actor'), targetSheet = page.locator('.workspace-sheet-target');
  const chips = sheet => sheet.locator('details.workspace-equipment-chip > summary').allInnerTexts();
  const norm = list => list.map(text => text.replace(/[▾▴]/g, '').trim());
  assert.deepEqual(norm(await chips(actorSheet)), ['Pavois', 'Plate de léviathan', 'Rechargement', 'Projectiles fichés (1)'], 'puces de l’acteur');
  assert.deepEqual(await chips(targetSheet), [], 'aucune puce sur une cible sans équipement en jeu');
  for (const selector of ['.workspace-pavise-setup', '.workspace-leviathan-encumbrance', '.workspace-weapon-reload'])
    assert.equal(await center.locator(`:scope > ${selector}`).count(), 0, `${selector} n’est plus un bloc de la colonne`);
  assert.equal(await actorSheet.locator('details.workspace-equipment-chip[open]').count(), 0, 'puces fermées par défaut');
  // Repli : le figurant hors duel garde son panneau de projectiles dans la colonne.
  const fallback = center.locator(':scope > .workspace-impaled-projectiles');
  assert.equal(await fallback.count(), 1, 'projectiles d’un combattant hors duel encore accessibles');
  assert.match(await fallback.innerText(), /Figurant · carreau/);
  assert.doesNotMatch(await fallback.innerText(), /Porteur/, 'pas de doublon pour l’acteur, servi par sa puce');
  // La puce ouverte reste ouverte après l’enregistrement (rendu complet).
  const open = async label => actorSheet.locator('details.workspace-equipment-chip > summary', { hasText: label }).click();
  await open('Plate de léviathan');
  await actorSheet.getByLabel('Encombrement de la pièce métallique équivalente (MJ)').fill('4');
  await actorSheet.getByRole('button', { name: 'Enregistrer la référence métal' }).click();
  await page.waitForFunction(() => document.querySelector('.workspace-sheet-actor .workspace-leviathan-encumbrance')?.textContent.includes('léviathan 3 Encombrement'));
  assert.equal(await actorSheet.locator('.workspace-leviathan-encumbrance').isVisible(), true, 'la puce reste ouverte après le rendu');
  // Retrait d’un projectile depuis la puce de la fiche.
  await open('Projectiles fichés');
  const lodged = actorSheet.locator('.workspace-impaled-projectiles');
  await lodged.getByRole('checkbox').check();
  await lodged.getByRole('button', { name: 'Enregistrer le retrait' }).click();
  await page.waitForFunction(() => ![...document.querySelectorAll('.workspace-sheet-actor details.workspace-equipment-chip > summary')].some(row => row.textContent.includes('Projectiles')));
  const saved = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().find(row => row.id === 'a').extensions.v5.lodgedProjectiles; });
  assert.equal(saved.find(row => row.id === 'p1').removed, true, 'retrait enregistré par le Store');
  assert.deepEqual(errors, []);
  console.log('U3 navigateur : puces d’équipement sur la fiche, puce gardée ouverte après rendu, retrait de projectile, repli hors duel.');
} finally { await browser.close(); server.close(); }
