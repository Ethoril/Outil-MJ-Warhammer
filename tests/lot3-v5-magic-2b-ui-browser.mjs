import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { BEAST_PROFILES, KADON_PROFILES, creatureWounds } from '../js/core/v5-magic-arbitrations.js';

/**
 * Livraison 2b du lot 3, retours de vérification, côté interface : désignation de plusieurs ennemis engagés, réponses de
 * nature conservées, cible par défaut protégée, aperçu après Protection, destinataires secondaires affichés, réponses non
 * reportées d'une attaque à la suivante, cases à cocher alignées. Livraison 2c : délai de mort d'Apothéose Verdoyante,
 * profil du monstre de Transformation de Kadon, restauration des Bmax du Fléau des Démons (bandeau de combat).
 */
const ROOT = resolve('.');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const LAUNCH_OPTS = {
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : existsSync(EDGE_PATH) ? { executablePath: EDGE_PATH } : {})
};
const MIME_TYPES = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const rawPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const filePath = resolve(join(ROOT, normalize(rawPath).replace(/^(\.\.[/\\])+/, '')));
      if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
      const info = await stat(filePath);
      const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
      res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(await readFile(target));
    } catch { res.writeHead(404).end('Not Found'); }
  });
  return new Promise((ok, ko) => { server.once('error', ko); server.listen(0, '127.0.0.1', () => ok({ server, baseUrl: 'http://127.0.0.1:' + server.address().port })); });
}

// `s` = cast (le mage lance) ou attack (le Guerrier attaque le mage) ; `w` = sorts déjà lancés (séparés par |, `Sort@lanceur>cible`), sinon par `t` sur lui-même.
const HARNESS_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lot 3 Magie V5 — 2b UI</title>
<link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body>
<div id="combat-banner"></div><div id="workspace-mount"></div>
<script type="module">
import { createStore } from '/js/core/store.js';
import { initWorkspaceView } from '/js/ui/workspace-view.js';
import { getSpellContract } from '/js/core/v5-spell-contracts.js';
import { initCombatBanner } from '/js/ui/combat-banner.js';
const params = new URLSearchParams(location.search), scenario = params.get('s') || 'cast', casterOfWards = params.get('t') || 'mage-1';
let saved = null; const listeners = new Map();
const bus = { on(e, f) { if (!listeners.has(e)) listeners.set(e, new Set()); listeners.get(e).add(f); }, emit(e, ...a) { for (const f of listeners.get(e) || []) f(...a); } };
const store = createStore({ bus, persistence: { async load() { return structuredClone(saved); }, async saveAtomic({ state }) {
  if (window.__TEST__?.delayMs) await new Promise(resolve => setTimeout(resolve, window.__TEST__.delayMs));
  if (window.__TEST__?.saveFailure) return { ok: false, error: 'Écriture locale refusée pour la recette' };
  saved = structuredClone(state); return { ok: true };
} } });
await store.ready;
const sp = n => { const c = getSpellContract(n); return { id: c.id, name: n }; };
const mage = { id: 'mage-1', name: 'Aldous Flammecoeur', kind: 'PJ', camp: 'pj', zone: 'active', init: 55, hp: 14, maxHp: 14,
  caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 35 },
  skills: [{ name: 'Focalisation (Aqshy)', characteristic: 'FM', advances: 10, value: 60 }, { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }],
  spells: ['Robe scintillante', 'Lames Azurées', 'Lumière aveuglante', 'Dôme', 'Carreau'].map(sp),
  actions: [{ id: 'staff-1', note: 'Bâton de sorcier', type: 'attack', attr: 'CC', base: 45, mod: 0, damage: 4, qualities: [] }],
  states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, magic: { lore: 'fire' }, channelling: { sl: 30, type: 'winds' } } } };
const ally = { id: 'ally-1', name: 'Greta Alliée', kind: 'PJ', camp: 'pj', zone: 'active', init: 45, hp: 8, maxHp: 14, caracs: { CC: 35, CT: 35, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 30, FM: 30, Soc: 35 }, states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [], extensions: { v5: { hasMomentum: false } } };
const enemy = (id, name, init) => ({ id, name, kind: 'Créature', camp: 'ennemi', zone: 'active', init, hp: 15, maxHp: 15, caracs: { CC: 45, CT: 40, F: 40, E: 30, I: 35, Ag: 30, Dex: 25, Int: 30, FM: 35, Soc: 20 },
  actions: [{ id: 'axe-' + id, note: 'Hache du Chaos', type: 'attack', attr: 'CC', base: 45, mod: 0, damage: 4, qualities: [] }, { id: 'bow-' + id, note: 'Arc court', type: 'attack', attr: 'CT', base: 45, mod: 0, damage: 4, qualities: [] }],
  skills: [{ name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }, { name: 'Focalisation (Aqshy)', characteristic: 'FM', advances: 10, value: 60 }],
  states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false, channelling: { sl: 30, type: 'winds' } } } });
const people = [mage, ally, enemy('enemy-1', 'Guerrier du Chaos', 40), enemy('enemy-2', 'Maraudeur', 35)];
if (params.get('x')) Object.assign(mage, JSON.parse(params.get('x')));
if (params.get('y')) Object.assign(people[2], JSON.parse(params.get('y')));
if (params.get('i')) {
  mage.spells.push(sp('Apothéose'));
  mage.extensions.v5.channelling.type = 'high';
  mage.extensions.v5.cadaiRunes = { deployed: 0, max: 5 };
  mage.talents = [{ id: 'talent-eye-of-the-storm', status: 'resolved', rank: 1 }, { id: 'talent-high-magic', status: 'resolved', rank: 1 }];
  mage.skills.push({ name: 'Prière', total: 60 });
}
// d=1 : Greta est morte (0 B, marqueur de mort) ; m=1 : le Guerrier du Chaos est un Démon d'Endurance 70 (Int du mage 50 < 70 < 100).
if (params.get('d')) Object.assign(ally, { hp: 0, extensions: { v5: { dead: true } } });
if (params.get('m')) Object.assign(people[2], { tags: ['Démon'], hp: 20, maxHp: 20, caracs: { ...people[2].caracs, E: 70 } });
await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: scenario === 'attack' ? 'enemy-1' : 'mage-1', order: people.map(p => p.id), participants: people }, diceLines: [], log: [] });
// Format Sort@lanceur>cible ; sans précision, la cible lance sur elle-même.
for (const entry of (params.get('w') || '').split('|').filter(Boolean)) { const [name, who] = entry.split('@'), [caster, target] = (who || casterOfWards).split('>'); await store.applySpellExecution(name, { actorId: caster, targetIds: [target || caster], roll: 25 }); }
const banner = initCombatBanner({ Store: store, mount: document.getElementById('combat-banner') });
bus.on('combat', () => banner.render('play')); bus.on('combat:update', () => banner.render('play')); banner.render('play');
window.__TEST__ = { Store: store, getSpellContract, banner };
const view = initWorkspaceView({ mount: document.getElementById('workspace-mount'), Store: store, Bus: bus, actions: { applyResolution: p => store.applyResolution(p), acquireStates: (a, s, m) => store.acquireStates(a, s, m), recoverState: (a, k, o) => store.recoverState(a, k, o), setStates: (a, s, l) => store.setStates(a, s, l), setMomentum: (a, v) => store.setMomentum(a, v) } });
view.setSpace('play');
</script></body></html>`;

const { server, baseUrl } = await startStaticServer();
const browser = await chromium.launch(LAUNCH_OPTS);
const RECIPIENTS = 'Ennemis engagés ou créatures affectées (désignés par le MJ) : ';
const text = async page => (await page.locator('.workspace-resolution').innerText()).split('\n').filter(Boolean).join(' | ');
const states = (page, id) => page.evaluate(id => window.__TEST__.Store.listParticipants().find(p => p.id === id).states.map(s => s.key || s.name), id);

async function open(scenario, { w = '', t = 'mage-1', extra = '' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(url => url.pathname === '/__lot3_magic_2b__.html', route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS_HTML }));
  await page.goto(`${baseUrl}/__lot3_magic_2b__.html?s=${scenario}&w=${encodeURIComponent(w)}&t=${t}${extra}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');
  return { page, context, errors };
}
async function pickSpell(page, name) {
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.waitForSelector('[data-focus-key="magic-spell"]');
  await page.selectOption('[data-focus-key="magic-spell"]', await page.evaluate(n => window.__TEST__.getSpellContract(n).id, name));
  await page.waitForTimeout(250);
}
/** Ne cible que les participants donnés (cases « Cible du sort »). */
async function targetOnly(page, ...names) {
  await page.locator('summary', { hasText: 'Cibles multiples' }).click(); await page.waitForTimeout(150);
  for (const name of ['Aldous Flammecoeur', 'Greta Alliée', 'Guerrier du Chaos', 'Maraudeur']) {
    const box = page.getByLabel('Cible du sort : ' + name, { exact: true });
    if ((await box.isChecked()) !== names.includes(name)) { await box.setChecked(names.includes(name)); await page.waitForTimeout(200); }
  }
}
async function calcAny(page, roll) {
  await page.fill('[data-roll-input="attack"]', String(roll));
  await page.click('[data-focus-key="calculate"]');
  await page.waitForTimeout(500);
}
async function calc(page, roll) {
  await page.fill('[data-roll-input="attack"]', String(roll));
  await page.click('[data-focus-key="calculate"]');
  await page.waitForSelector('.workspace-magic-result, .workspace-result');
  await page.waitForTimeout(250);
}

try {
  if (!process.env.LOT3_INTEGRATION_ONLY) {
  // P2 + mise en forme : plusieurs ennemis engagés, champ d'Endurance dès la désignation, cases sur la ligne du nom.
  {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Robe scintillante');
    assert.match(await text(page), /Aucun destinataire désigné/);
    await page.getByLabel(RECIPIENTS + 'Guerrier du Chaos').check(); await page.waitForTimeout(250);
    assert.equal(await page.getByLabel('Jet de Endurance de Guerrier du Chaos (1d100)').count(), 1, 'jet d’Endurance dès la désignation, sans Calculer');
    assert.doesNotMatch(await text(page), /Aucun destinataire désigné/);
    await page.getByLabel(RECIPIENTS + 'Maraudeur').check(); await page.waitForTimeout(250);
    assert.equal(await page.getByLabel(RECIPIENTS + 'Guerrier du Chaos').isChecked(), true, 'la première désignation est conservée');
    assert.equal(await page.getByLabel(RECIPIENTS + 'Maraudeur').isChecked(), true);
    assert.equal(await page.getByLabel('Jet de Endurance de Maraudeur (1d100)').count(), 1);
    assert.equal(await page.getByLabel('Jet de Endurance de Guerrier du Chaos (1d100)').count(), 1);
    await page.getByLabel(RECIPIENTS + 'Maraudeur').uncheck(); await page.waitForTimeout(250);
    assert.equal(await page.getByLabel('Jet de Endurance de Maraudeur (1d100)').count(), 0);
    const layout = await page.evaluate(label => {
      const input = document.querySelector(`input[aria-label="${label}"]`), row = input.closest('label'), box = input.getBoundingClientRect(), line = row.getBoundingClientRect();
      return { direction: getComputedStyle(row).flexDirection, sameLine: box.top >= line.top - 1 && box.bottom <= line.bottom + 1 && line.height < 40 };
    }, RECIPIENTS + 'Guerrier du Chaos');
    assert.equal(layout.direction, 'row');
    assert.ok(layout.sameLine, 'la case à cocher partage la ligne du nom');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // P3, P4, P8 : la cible par défaut (brouillon vide) a ses contrôles ; chaque réponse est conservée ; l'aperçu donne la valeur après Protection.
  {
    const { page, context, errors } = await open('cast', { w: 'Égide d’Aqshy@enemy-1|Dôme@enemy-2>enemy-1' });
    await pickSpell(page, 'Carreau');
    const origin = page.getByLabel('Guerrier du Chaos : origine extérieure à la zone ?', { exact: true });
    assert.equal(await origin.count(), 1, 'contrôle de Protection pour la cible par défaut');
    assert.equal(await page.getByLabel('Protection de Guerrier du Chaos : résultat du d10').count(), 1);
    const fire = page.getByLabel('Guerrier du Chaos : feu ?', { exact: true });
    assert.equal(await fire.count(), 1, 'le feu se déclare quand l’Égide en dépend');
    assert.match(await fire.locator('option').first().innerText(), /Déduit : (oui|non)/);
    await origin.selectOption('true'); await page.waitForTimeout(250);
    await page.getByLabel('Guerrier du Chaos : feu ?', { exact: true }).selectOption('false'); await page.waitForTimeout(250);
    assert.equal(await page.getByLabel('Guerrier du Chaos : origine extérieure à la zone ?', { exact: true }).inputValue(), 'true', 'la première réponse n’est pas perdue');
    assert.equal(await page.getByLabel('Guerrier du Chaos : feu ?', { exact: true }).inputValue(), 'false');
    await page.getByLabel('Protection de Guerrier du Chaos : résultat du d10').fill('10'); await page.waitForTimeout(150);
    await calc(page, 25);
    const result = await page.locator('.workspace-magic-result').innerText();
    assert.match(result, /0 Blessures \(Protection \d\+ réussie/, 'l’aperçu montre les Blessures après Protection : ' + result);
    assert.doesNotMatch(result, /→ [1-9]\d* Blessures/);
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Lames Azurées et Lumière aveuglante : destinataires affichés dans l'aperçu.
  {
    const { page, context } = await open('cast');
    await pickSpell(page, 'Lumière aveuglante');
    await page.getByLabel(RECIPIENTS + 'Guerrier du Chaos').check(); await page.waitForTimeout(250);
    await calc(page, 25);
    assert.match(await page.locator('.workspace-magic-result').innerText(), /Guerrier du Chaos : Aveuglé, Aveuglé, Aveuglé/);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(400);
    assert.ok((await states(page, 'enemy-1')).includes('aveugle'));
    await context.close();
  }
  {
    const { page, context } = await open('cast');
    await pickSpell(page, 'Lames Azurées');
    await page.getByLabel(RECIPIENTS + 'Maraudeur').check(); await page.waitForTimeout(250);
    assert.match(await text(page), /Maraudeur sera frappé à chacun de ses Tours/);
    assert.equal(await page.getByLabel(/Localisations de Maraudeur/).count(), 0, 'aucun jet de localisation au lancement');
    await calc(page, 25);
    assert.match(await page.locator('.workspace-magic-result').innerText(), /Maraudeur : sera frappé à chacun de ses Tours/);
    await context.close();
  }
  // P6 : les réponses d'une attaque ne passent pas à la suivante.
  {
    const { page, context } = await open('attack', { w: 'Dôme' });
    await page.click('[data-action-key="bow-enemy-1"]'); await page.waitForTimeout(300);
    const origin = () => page.getByLabel('Aldous Flammecoeur : origine extérieure à la zone ?', { exact: true });
    await origin().selectOption('true'); await page.waitForTimeout(250);
    await page.fill('input[aria-label="Protection magique : résultat du d10"]', '3'); await page.waitForTimeout(150);
    await calc(page, 25);
    await page.locator('button', { hasText: /^Appliquer/ }).first().click(); await page.waitForTimeout(500);
    await page.click('[data-action-key="bow-enemy-1"]'); await page.waitForTimeout(300);
    assert.equal(await origin().inputValue(), '', 'la nature de l’attaque précédente est oubliée');
    assert.equal(await page.inputValue('input[aria-label="Protection magique : résultat du d10"]'), '', 'le d10 précédent est oublié');
    await context.close();
  }
  // Contact contre un Dôme : aucune question d'origine.
  {
    const { page, context } = await open('attack', { w: 'Dôme' });
    await page.click('[data-action-key="axe-enemy-1"]'); await page.waitForTimeout(300);
    assert.equal(await page.getByLabel('Aldous Flammecoeur : origine extérieure à la zone ?', { exact: true }).count(), 0);
    await context.close();
  }
  // A-04 : Apothéose Verdoyante exige un délai de mort saisi, moins d'une minute ; une cible vivante est refusée.
  {
    const { page, context, errors } = await open('cast', { extra: '&d=1' });
    await pickSpell(page, 'Apothéose Verdoyante');
    await targetOnly(page, 'Greta Alliée');
    const delay = page.getByLabel('Délai depuis la mort de Greta Alliée (secondes, moins d’une minute)');
    assert.equal(await delay.count(), 1, 'champ du délai de mort pour chaque cible');
    await calcAny(page, 5);
    assert.match(await text(page), /délai depuis la mort/i, 'sans délai saisi : bloqué, pas de 0 par défaut');
    await delay.fill('59'); await page.waitForTimeout(200);
    await calcAny(page, 5);
    assert.match(await page.locator('.workspace-magic-result').innerText(), /revient à la vie|Apothéose Verdoyante/);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const greta = await page.evaluate(() => { const p = window.__TEST__.Store.listParticipants().find(x => x.id === 'ally-1'); return { hp: p.hp, dead: p.extensions.v5.dead }; });
    assert.deepEqual(greta, { hp: 14, dead: false }, 'revenue avec 1 B par DR final, plafonnée aux Bmax');
    assert.deepEqual(errors, []);
    await context.close();
  }
  {
    const { page, context } = await open('cast');
    await pickSpell(page, 'Apothéose Verdoyante');
    await targetOnly(page, 'Greta Alliée');
    await page.getByLabel('Délai depuis la mort de Greta Alliée (secondes, moins d’une minute)').fill('10'); await page.waitForTimeout(200);
    await calcAny(page, 5);
    assert.match(await text(page), /vivant|non admissible/i, 'cible vivante : refusée');
    assert.equal(await page.evaluate(() => window.__TEST__.Store.listParticipants().find(x => x.id === 'ally-1').hp), 8, 'jamais blessée');
    await context.close();
  }
  // A-06 : Transformation de Kadon applique le profil saisi pour le monstre choisi.
  {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Transformation de Kadon');
    await page.selectOption('[data-focus-key="magic-kadon-monster"]', 'manual'); await page.waitForTimeout(250);
    await page.getByLabel('Monstre : nom', { exact: true }).fill('Dragon'); await page.waitForTimeout(80);
    await targetOnly(page, 'Aldous Flammecoeur');
    assert.equal(await page.getByLabel('Monstre : Mouvement', { exact: true }).count(), 1, 'profil du monstre saisissable');
    await calcAny(page, 5);
    assert.match(await text(page), /saisir le profil/i, 'sans profil : bloqué, jamais un Loup');
    await page.getByLabel('Monstre : Taille',{exact:true}).selectOption('enormous');
    const values = { 'Monstre : Mouvement': 6, 'Monstre : Blessures (B)': 60, 'Monstre : CC': 70, 'Monstre : CT': 0, 'Monstre : F': 90, 'Monstre : E': 80, 'Monstre : I': 40, 'Monstre : Ag': 30, 'Monstre : Dex': 0, 'Monstre : Soc': 15 };
    for (const [label, value] of Object.entries(values)) { await page.getByLabel(label, { exact: true }).fill(String(value)); await page.waitForTimeout(80); }
    await calcAny(page, 5);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const mage = await page.evaluate(() => { const p = window.__TEST__.Store.listParticipants().find(x => x.id === 'mage-1'); return { F: p.caracs.F, Int: p.caracs.Int, FM: p.caracs.FM, hp: p.hp, name: p.extensions.v5.beastForm?.name, rounds: p.extensions.v5.spellEffects.find(e => e.beastFormMarker)?.durationRounds }; });
    assert.deepEqual(mage, { F: 90, Int: 50, FM: 50, hp: 60, name: 'Dragon', rounds: 5 }, 'Dragon appliqué, Int et FM conservées, BFM Rounds');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Forme bestiale : sélecteur dédié (hors du bloc de surpuissance), chaque animal du livre, B recalculées, attaques de l'animal, équipement inactif.
  {
    const { page, context } = await open('cast');
    await pickSpell(page, 'Forme bestiale');
    assert.equal(await page.locator('[data-focus-key="magic-beast-key"]').count(), 1, 'sélecteur d’animal pour Forme bestiale');
    assert.equal(await page.locator('[data-focus-key="magic-kadon-monster"]').count(), 0, 'pas de sélecteur de monstre');
    const optionsBlock = page.locator('details', { has: page.locator('summary', { hasText: 'Options du sort : Forme bestiale' }) });
    assert.equal(await optionsBlock.locator('[data-focus-key="magic-beast-key"]').count(), 1, 'dans le bloc des options du sort');
    const overcastBlock = page.locator('details', { has: page.locator('summary', { hasText: 'Surpuissance & Paramètres du sort' }) });
    assert.equal(await overcastBlock.locator('[data-focus-key="magic-beast-key"]').count(), 0, 'plus dans la surpuissance');
    assert.equal(await overcastBlock.getByLabel('Palier Main de Gloire').count(), 0, 'aucun champ d’un autre sort');
    assert.equal(await page.getByLabel('Jet 3d10 commun (Main de Gloire)').count(), 0);
    assert.deepEqual(await page.locator('[data-focus-key="magic-beast-key"] option').allInnerTexts(), ['— Choisir un animal —', ...Object.values(BEAST_PROFILES).map(p => `${p.name} (Taille ${{ small: 'Petite', average: 'Moyenne', large: 'Grande' }[p.size]}, p. ${p.page})`)]);
    await context.close();
  }
  for (const [key, profile] of Object.entries(BEAST_PROFILES)) {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Forme bestiale');
    await page.selectOption('[data-focus-key="magic-beast-key"]', key); await page.waitForTimeout(250);
    await targetOnly(page, 'Aldous Flammecoeur');
    await calcAny(page, 5);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const mage = await page.evaluate(() => { const p = window.__TEST__.Store.listParticipants().find(x => x.id === 'mage-1'); return { c: p.caracs, hp: p.hp, maxHp: p.maxHp, equipment: p.equipment || [], armor: p.armorLocations, form: p.extensions.v5.beastForm?.name, absent: p.extensions.v5.beastForm?.absentCaracs }; });
    const expected = creatureWounds({ caracs: { F: profile.caracs.F, E: profile.caracs.E, FM: 50 }, size: profile.size }).wounds;
    assert.deepEqual([mage.c.M, mage.c.F, mage.c.E, mage.c.Ag], [profile.M, profile.caracs.F, profile.caracs.E, profile.caracs.Ag], key + ' : M, F, E, Ag');
    assert.equal(mage.c.Dex, profile.caracs.Dex ?? undefined, key + ' : Dex');
    assert.deepEqual(mage.absent, profile.caracs.Dex === null ? ['Dex'] : [], key + ' : Dex « – » absente');
    assert.deepEqual([mage.hp, mage.maxHp], [expected, expected], key + ' : Blessures recalculées avec la FM du lanceur (BFM 5)');
    assert.equal(mage.form, profile.name);
    assert.deepEqual(mage.equipment, []);
    assert.ok(Object.values(mage.armor).every(ap => ap === (profile.armor?.ap ?? 0)), key + ' : seule l’armure standard de l’animal');
    const proposed = await page.locator('[data-action-key^="beast-form:"]').count();
    assert.equal(proposed, profile.attacks.length, key + ' : attaques de l’animal proposées');
    assert.equal(await page.locator('[data-action-key="staff-1"]').count(), 0, key + ' : l’arme du lanceur n’est plus proposée');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Trait optionnel à +2 DR (case, limité par les DR), autre sort sans sélecteur d'animal.
  {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Forme bestiale');
    await page.selectOption('[data-focus-key="magic-beast-key"]', 'wolf'); await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-focus-key="magic-beast-trait-Nuée"]').count(), 0);
    const trait = page.getByLabel('Trait optionnel : Frénésie', { exact: true });
    assert.equal(await trait.count(), 1, 'trait optionnel du loup proposé');
    const layout = await page.evaluate(label => {
      const input = document.querySelector(`input[aria-label="${label}"]`), row = input.closest('label'), box = input.getBoundingClientRect(), line = row.getBoundingClientRect();
      return { direction: getComputedStyle(row).flexDirection, sameLine: box.top >= line.top - 1 && box.bottom <= line.bottom + 1 && line.height < 40, left: box.left - line.left < 20 };
    }, 'Trait optionnel : Frénésie');
    assert.deepEqual(layout, { direction: 'row', sameLine: true, left: true }, 'case à gauche de son libellé');
    await trait.check(); await page.waitForTimeout(250);
    await targetOnly(page, 'Aldous Flammecoeur');
    await calcAny(page, 5);
    assert.match(await page.locator('.workspace-magic-result').innerText(), /Frénésie|Transformation/);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const mage = await page.evaluate(() => { const p = window.__TEST__.Store.listParticipants().find(x => x.id === 'mage-1'); return { traits: p.traits, optional: p.extensions.v5.beastForm.optionalTraits }; });
    assert.deepEqual(mage.optional, ['Frénésie']);
    assert.ok(mage.traits.includes('Frénésie'), 'trait optionnel acquis');
    assert.deepEqual(errors, []);
    await context.close();
  }
  {
    const { page, context } = await open('cast');
    await pickSpell(page, 'Carreau');
    for (const key of ['magic-beast-key', 'magic-kadon-monster']) assert.equal(await page.locator(`[data-focus-key="${key}"]`).count(), 0, key + ' absent pour un autre sort');
    assert.equal(await page.locator('summary', { hasText: 'Options du sort' }).count(), 0, 'aucune option propre à Carreau');
    await pickSpell(page, 'Main de Gloire');
    assert.equal(await page.getByLabel('Palier Main de Gloire').count(), 1);
    assert.equal(await page.locator('[data-focus-key="magic-beast-key"]').count(), 0);
    const hogLayout = await page.evaluate(() => { const input = document.querySelector('input[aria-label="Option +3 DR : retirer les états Brisé des alliés"]'), row = input.closest('label'); return { direction: getComputedStyle(row).flexDirection, left: input.getBoundingClientRect().left - row.getBoundingClientRect().left < 20 }; });
    assert.deepEqual(hogLayout, { direction: 'row', left: true }, 'cases à cocher du panneau sur la ligne de leur libellé');
    await context.close();
  }
  // Kadon : monstre du livre choisi dans le sélecteur dédié, trait optionnel à +4 DR, Compétences et Talents remplacés.
  {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Transformation de Kadon');
    assert.equal(await page.locator('[data-focus-key="magic-beast-key"]').count(), 0, 'pas de sélecteur d’animal pour Kadon');
    assert.deepEqual((await page.locator('[data-focus-key="magic-kadon-monster"] option').allInnerTexts()).slice(-1), ['Autre monstre : saisie du profil']);
    assert.equal((await page.locator('[data-focus-key="magic-kadon-monster"] option').count()), 2 + Object.keys(KADON_PROFILES).length);
    await page.selectOption('[data-focus-key="magic-kadon-monster"]', 'troll'); await page.waitForTimeout(250);
    assert.equal(await page.getByLabel('Monstre : Mouvement', { exact: true }).count(), 0, 'pas de saisie quand le monstre vient du livre');
    await page.getByLabel('Trait optionnel : Vision nocturne', { exact: true }).check(); await page.waitForTimeout(250);
    await targetOnly(page, 'Aldous Flammecoeur');
    await calcAny(page, 5);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const mage = await page.evaluate(() => { const p = window.__TEST__.Store.listParticipants().find(x => x.id === 'mage-1'); return { F: p.caracs.F, Int: p.caracs.Int, FM: p.caracs.FM, hp: p.hp, traits: p.traits, skills: (p.skills || []).map(s => s.name), talents: p.talents || [], name: p.extensions.v5.beastForm.name, rounds: p.extensions.v5.spellEffects.find(e => e.beastFormMarker)?.durationRounds }; });
    assert.deepEqual([mage.F, mage.Int, mage.FM, mage.hp, mage.name, mage.rounds], [55, 50, 50, 30, 'Troll', 5]);
    assert.ok(mage.traits.includes('Vision nocturne') && mage.traits.includes('Régénération'));
    assert.deepEqual(mage.skills, ['Corps à corps (Bagarre)', 'Corps à corps (Base)', 'Résistance'], 'Compétences du monstre');
    assert.deepEqual(mage.talents, [], 'Talents remplacés');
    assert.equal(await page.locator('[data-action-key^="beast-form:"]').count(), KADON_PROFILES.troll.attacks.length);
    assert.deepEqual(errors, []);
    await context.close();
  }
  // A-07 : le bandeau rappelle les Bmax divisées par le Fléau des Démons ; l'action MJ les restaure.
  {
    const { page, context, errors } = await open('cast', { extra: '&m=1' });
    assert.equal(await page.locator('[data-daemonbane-reminder]').isVisible(), false, 'aucun rappel avant le sort');
    await pickSpell(page, 'Fléau des Démons');
    await targetOnly(page, 'Guerrier du Chaos');
    await calcAny(page, 5);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const maxHp = () => page.evaluate(() => window.__TEST__.Store.listParticipants().find(x => x.id === 'enemy-1').maxHp);
    assert.equal(await maxHp(), 10);
    await page.evaluate(() => window.__TEST__.banner.render('play'));
    const reminder = page.locator('[data-daemonbane-reminder]');
    assert.equal(await reminder.isVisible(), true, 'rappel visible tant que les Bmax sont divisées');
    assert.match(await reminder.innerText(), /Guerrier du Chaos 10\/20/);
    await page.click('[data-action="restore-daemonbane"]'); await page.waitForTimeout(500);
    assert.equal(await maxHp(), 20, 'Bmax restaurées par l’action MJ');
    assert.equal(await reminder.isVisible(), false, 'rappel retiré une fois restaurées');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // X-05 / X-07 / D-18 / D-19 : dissipation persistante — effet choisi dans la liste filtrée, distance et visibilité saisies, Test étendu, recommencer.
  {
    const { page, context, errors } = await open('cast', { w: 'Robe scintillante@enemy-1>enemy-1' });
    await page.evaluate(() => window.__TEST__.Store.applySpellEffects('enemy-1', { id: 'meditation-1', spellId: 'talent-eye-of-the-storm', magicTalentId: 'talent-eye-of-the-storm', duration: '1 heure' }));
    await page.click('[data-action-key="v5-magic:dispel"]');
    const effect = page.getByLabel('Sort persistant à dissiper', { exact: true });
    await effect.waitFor();
    const options = await effect.locator('option').allInnerTexts();
    assert.equal(options.length, 2, 'Choisir un effet + le seul sort persistant (méditation exclue) : ' + options);
    assert.match(options[1], /Robe scintillante — Guerrier du Chaos \(NI \d+\)/, 'NI explicite dans le libellé');
    await effect.selectOption({ index: 1 }); await page.waitForTimeout(250);
    const visible = page.getByLabel('Sort persistant ou point ciblé visible du dissipateur', { exact: true });
    assert.equal(await visible.inputValue(), '', 'visibilité non renseignée par défaut');
    assert.equal(await page.getByLabel(/^Distance au sort persistant/).inputValue(), '', 'distance vide par défaut');
    await calcAny(page, 53);
    assert.match(await text(page), /Dissipation impossible : Saisir une distance valide/, 'refus sans distance, jamais 0 par défaut');
    await page.getByLabel(/^Distance au sort persistant/).fill('10'); await page.waitForTimeout(150);
    await calcAny(page, 53);
    assert.match(await text(page), /Dissipation impossible : Saisir explicitement la visibilité/, 'refus sans visibilité, jamais « non » par défaut');
    await visible.selectOption('true'); await page.waitForTimeout(250);
    await calcAny(page, 53);
    assert.match(await text(page), /Test étendu : \+\d+ DR ; progression \d+\/\d+ DR/);
    assert.equal(await page.getByLabel('Recommencer la tentative : repartir de zéro DR').count(), 0, 'pas de recommencement tant que le Test n’a pas échoué');
    // Échec sous zéro : la tentative est marquée échouée, puis une nouvelle tentative explicite repart de zéro.
    await calcAny(page, 99);
    assert.match(await text(page), /Total négatif/);
    assert.equal(await page.getByLabel('Recommencer la tentative : repartir de zéro DR').count(), 1, 'proposé après un total négatif');
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    await calcAny(page, 53);
    assert.match(await text(page), /Dissipation impossible : .*nouvelle tentative/i, 'sans confirmation, pas de reprise silencieuse');
    await page.getByLabel('Recommencer la tentative : repartir de zéro DR').check(); await page.waitForTimeout(250);
    await calcAny(page, 53);
    assert.match(await text(page), /Test étendu : \+\d+ DR ; progression \d+\/\d+ DR/);
    assert.deepEqual(errors, []);
    await context.close();
  }
  // X-01 : réaction de dissipation — DR nets et total restant affichés ; sort dissipé sans effet.
  {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Carreau');
    await targetOnly(page, 'Guerrier du Chaos');
    await page.getByLabel('Réaction de dissipation adverse', { exact: true }).selectOption('enemy-2'); await page.waitForTimeout(250);
    assert.equal(await page.getByLabel('Lanceur ou point ciblé visible du dissipateur', { exact: true }).inputValue(), '', 'visibilité non renseignée par défaut');
    await page.fill('[data-focus-key="magicDispelRoll"]', '14');
    await page.getByLabel(/^Distance du dissipateur/).fill('10');
    await page.getByLabel('Lanceur ou point ciblé visible du dissipateur', { exact: true }).selectOption('true'); await page.waitForTimeout(250);
    await calc(page, 5);
    const gained = await page.locator('.workspace-magic-result').innerText();
    assert.match(gained, /Opposition de dissipation : Test du lanceur \+6 DR − dissipateur \+5 DR = \+1 DR nets/, gained);
    assert.match(gained, /Le lanceur gagne l’opposition : \+1 DR nets \+ réserve 30 DR = \+31 DR restants contre NI 4\./);
    // Le même lanceur à +1 DR contre un dissipateur à +6 DR : net négatif, la réserve ne sauve pas le sort.
    await page.fill('[data-focus-key="magicDispelRoll"]', '5'); await page.waitForTimeout(100);
    await calc(page, 49);
    const dispelled = await page.locator('.workspace-magic-result').innerText();
    assert.match(dispelled, /= −4 DR nets/, dispelled);
    assert.match(dispelled, /Sort DISSIPÉ/);
    assert.match(dispelled, /aucun effet ni épuisement/);
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    const after = await page.evaluate(() => { const list = window.__TEST__.Store.listParticipants(); return { hp: list.find(p => p.id === 'enemy-1').hp, reaction: list.find(p => p.id === 'enemy-2').extensions.v5.dispelReactionRound, reserve: list.find(p => p.id === 'mage-1').extensions.v5.channelling?.sl ?? 0 }; });
    assert.deepEqual(after, { hp: 15, reaction: 1, reserve: 0 }, 'cible intacte, quota du dissipateur consommé, réserve du lanceur consommée');
    assert.deepEqual(errors, []);
    await context.close();
  }
  // H-01 (HEPG p. 84) : relance par rune d'une incantation de Haute Magie, refusée pour un sort d'Arcane ; L-07 : deux jets supplémentaires de l'incident 91-95.
  {
    const { page, context, errors } = await open('cast');
    const runes = () => page.evaluate(() => window.__TEST__.Store.getCadaiRunes('mage-1').deployed);
    await page.evaluate(async () => { const store = window.__TEST__.Store, mage = store.listParticipants().find(p => p.id === 'mage-1'); await store.updateParticipant('mage-1', { extensions: { ...mage.extensions, v5: { ...mage.extensions.v5, channelling: { sl: 30, type: 'high' }, cadaiRunes: { deployed: 2, max: 5 } } } }); });
    await page.click('[data-action-key="v5-magic:channelling"]'); await page.click('[data-action-key="v5-magic:cast"]');
    await pickSpell(page, 'Carreau');
    await page.getByLabel('Consommer une rune pour relancer', { exact: true }).check();
    await page.getByLabel('Rune visible et à portée de bras', { exact: true }).check();
    await page.getByLabel('Relancer le Test par une rune : nouveau jet (1d100)', { exact: true }).fill('25');
    await calcAny(page, 95);
    assert.match(await text(page), /Haute Magie/, 'rune refusée pour un sort d’Arcane');
    assert.equal(await page.isDisabled('[data-focus-key="apply"]').catch(() => true), true);
    await pickSpell(page, 'Apothéose'); await targetOnly(page, 'Greta Alliée');
    await page.getByLabel('Relancer le Test par une rune : nouveau jet (1d100)', { exact: true }).fill('25'); // le changement de sort efface les dés saisis
    await calc(page, 95);
    assert.match(await text(page), /Sort lancé/, 'le Test relancé à 25 réussit : ' + await text(page));
    assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, await page.locator('.workspace-magic-result').innerText());
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(600);
    assert.equal(await runes(), 1, 'une seule rune payée');
    await page.evaluate(() => window.__TEST__.Store.undo()); await page.waitForTimeout(300);
    assert.equal(await runes(), 2, 'Undo rend la rune');
    // Incident 91-95 : un critique déclenche l'incident ; les deux jets supplémentaires et leurs dés de durée sont saisis dans l'interface.
    await pickSpell(page, 'Apothéose'); await targetOnly(page, 'Greta Alliée');
    await calcAny(page, 11);
    await page.fill('[data-focus-key="magicMiscastRoll"]', '93');
    await calcAny(page, 11);
    assert.match(await text(page), /jet supplémentaire n° 1 de l’incident.*jet supplémentaire n° 2 de l’incident/, 'dés manquants nommés : ' + await text(page));
    await page.fill('[data-focus-key="magicExtraRoll1"]', '3'); await page.fill('[data-focus-key="magicExtraRoll2"]', '68');
    await calcAny(page, 11);
    assert.match(await text(page), /dé de durée de l’incident du jet supplémentaire n° 1/, await text(page));
    await page.fill('[data-focus-key="magicExtraDuration1"]', '2'); await page.fill('[data-focus-key="magicExtraDuration2"]', '4');
    await calc(page, 11);
    assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, await text(page));
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(600);
    assert.ok((await page.evaluate(() => window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1').extensions.v5.miscastEffects || [])).length >= 1, 'les conséquences des deux jets sont enregistrées');
    // L-03 : Regard maudit (incident Majeur 38) — le bouton de retrait de l'État est désactivé, le retrait manuel refusé par le Store.
    await page.evaluate(async () => { const store = window.__TEST__.Store; await store.applyMiscast(store.previewMiscast({ actorId: 'mage-1', severity: 'MAJOR', roll: 38, secondaryRolls: { duration: 2 } }), { actorId: 'mage-1' }); });
    await page.waitForTimeout(400);
    const remove = page.getByRole('button', { name: 'Retirer Aveuglé de Aldous Flammecoeur' });
    assert.equal(await remove.count(), 1);
    assert.equal(await remove.isDisabled(), true, 'retrait désactivé pour un État lié à un incident en cours');
    assert.deepEqual(errors, []);
    await context.close();
  }
  }
  // Phase 9 : double-clic réel, exécution de Haute Magie, Corruption par rune et Undo.
  {
    const { page, context, errors } = await open('cast', { extra: '&i=1' });
    await pickSpell(page, 'Apothéose');
    await page.fill('[data-focus-key="magicRuneKnowledgeRoll"]', '25');
    await page.getByLabel('Lire/Écrire, matériel et conditions de déploiement confirmés').check();
    await page.evaluate(() => { window.__TEST__.delayMs = 200; });
    const deploy = page.getByRole('button', { name: 'Déployer une rune (1 Round)', exact: true });
    const rect = await deploy.boundingBox();
    await page.mouse.dblclick(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForFunction(() => window.__TEST__.Store.getCadaiRunes('mage-1').deployed === 1);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => window.__TEST__.Store.getCadaiRunes('mage-1').deployed), 1, 'un double-clic ne déploie qu’une rune');
    await page.evaluate(() => { window.__TEST__.delayMs = 0; });
    await targetOnly(page, 'Greta Alliée');
    await calc(page, 25); await page.click('[data-focus-key="apply"]');
    await page.waitForFunction(() => window.__TEST__.Store.getHighMagicExecutions('mage-1').length === 1);
    await page.getByLabel('Consommer une rune pour relancer').check();
    await page.getByLabel('Rune visible et à portée de bras').check();
    const executionId = await page.evaluate(() => window.__TEST__.Store.getHighMagicExecutions('mage-1')[0].id);
    assert.equal(await page.locator('[data-focus-key="magicCorruptionExecutionId"] option').count(), 2);
    await page.selectOption('[data-focus-key="magicCorruptionExecutionId"]', executionId);
    await page.fill('[data-focus-key="magicCorruptionId"]', 'exposition-1');
    await page.fill('[data-focus-key="magicCorruptionInitialRoll"]', '85');
    await page.fill('[data-focus-key="magicCadaiCorruptionRoll"]', '25');
    await page.getByRole('button', { name: 'Résoudre la relance de Corruption', exact: true }).click();
    await page.waitForFunction(() => window.__TEST__.Store.getCadaiRunes('mage-1').deployed === 0);
    await page.evaluate(async () => { await window.__TEST__.Store.undo(); });
    await page.waitForFunction(() => window.__TEST__.Store.getCadaiRunes('mage-1').deployed === 1);
    assert.deepEqual(await page.evaluate(() => window.__TEST__.Store.getHighMagicExecutions('mage-1')[0].rerolledCorruption), []);
    assert.deepEqual(errors, []); await context.close();
  }
  // Vérification de la phase 9 : deux clics espacés (pas un dblclick) pendant et après une persistance courte, saisies séquentielles sans perte.
  for (const [delay, gap] of [[10, 120], [10, 60], [30, 120]]) {
    const { page, context, errors } = await open('cast', { extra: '&i=1' });
    await pickSpell(page, 'Apothéose');
    await page.evaluate(() => { window.__TEST__.calls = { deploy: 0, meditation: 0 };
      for (const [method, key] of [['deployCadaiRune', 'deploy'], ['applyMagicMeditation', 'meditation']]) { const original = window.__TEST__.Store[method]; window.__TEST__.Store[method] = (...args) => { window.__TEST__.calls[key]++; return original.apply(window.__TEST__.Store, args); }; } });
    const clickTwice = async (name, gap) => {
      const button = page.getByRole('button', { name, exact: true }); await button.scrollIntoViewIfNeeded();
      const rect = await button.boundingBox(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      await page.mouse.click(x, y); await page.waitForTimeout(gap); await page.mouse.click(x, y); await page.waitForTimeout(600);
    };
    await page.fill('[data-focus-key="magicRuneKnowledgeRoll"]', '25');
    await page.getByLabel('Lire/Écrire, matériel et conditions de déploiement confirmés').check();
    await page.evaluate(ms => { window.__TEST__.delayMs = ms; }, delay);
    await clickTwice('Déployer une rune (1 Round)', gap);
    assert.equal(await page.evaluate(() => window.__TEST__.Store.getCadaiRunes('mage-1').deployed), 1, `rune : ${delay} ms de persistance, clics à ${gap} ms`);
    assert.equal(await page.evaluate(() => window.__TEST__.calls.deploy), 1, 'le second clic n’appelle même pas le Store');
    await page.evaluate(() => { window.__TEST__.delayMs = 0; });
    // Après succès, les saisies ponctuelles sont vidées : un nouveau jet est requis pour une seconde rune.
    assert.equal(await page.inputValue('[data-focus-key="magicRuneKnowledgeRoll"]'), '');
    await page.selectOption('[data-focus-key="magicMeditationId"]', 'talent-eye-of-the-storm');
    await page.fill('[data-focus-key="magicMeditationMinutes"]', '20');
    await page.fill('[data-focus-key="magicMeditationRoll"]', '25');
    await page.fill('[data-focus-key="magicMeditationDice"]', '3 3 3 3 3');
    await page.evaluate(ms => { window.__TEST__.delayMs = ms; }, delay);
    await clickTwice('Résoudre la méditation', gap);
    assert.equal(await page.evaluate(() => JSON.parse(window.__TEST__.Store.getFullJSON()).log.filter(e => /méditation réussie/.test(e.text)).length), 1, `méditation : ${delay} ms, clics à ${gap} ms`);
    assert.equal(await page.evaluate(() => window.__TEST__.calls.meditation), 1);
    // Une saisie nouvelle réarme l'opération.
    await page.evaluate(() => { window.__TEST__.delayMs = 0; });
    await page.fill('[data-focus-key="magicMeditationRoll"]', '30');
    assert.equal(await page.getByRole('button', { name: 'Résoudre la méditation', exact: true }).isDisabled(), false, 'une saisie nouvelle réarme le bouton');
    assert.deepEqual(errors, []); await context.close();
  }
  {
    const { page, context, errors } = await open('cast', { extra: '&x=' + encodeURIComponent(JSON.stringify({ talents: [{ id: 'talent-magic-defiance', status: 'resolved', rank: 1 }] })) });
    await page.click('[data-action-key="v5-magic:cast"]');
    await page.evaluate(() => { window.__TEST__.calls = { adventure: 0 }; const original = window.__TEST__.Store.startMagicAdventure; window.__TEST__.Store.startMagicAdventure = (...args) => { window.__TEST__.calls.adventure++; return original.apply(window.__TEST__.Store, args); }; window.__TEST__.delayMs = 20; });
    const button = page.getByRole('button', { name: 'Commencer une nouvelle aventure (Défiance magique)', exact: true }); await button.scrollIntoViewIfNeeded();
    const rect = await button.boundingBox(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    await page.mouse.click(x, y); await page.waitForTimeout(90); await page.mouse.click(x, y); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => window.__TEST__.calls.adventure), 1, 'une seule nouvelle aventure');
    assert.deepEqual(errors, []); await context.close();
  }
  // Saisies séquentielles : les d10 de Protection (Lileath, 1/2 puis 2/2) et les options propres au sort ne s'écrasent pas.
  {
    const { page, context, errors } = await open('cast', { extra: '&y=' + encodeURIComponent(JSON.stringify({ talents: [{ id: 'talent-lileath-s-blessing', status: 'resolved', rank: 1 }] })) });
    await page.evaluate(async () => { for (const n of ['Protection', 'Dôme']) { const a = window.__TEST__.Store.listParticipants().find(q => q.id === 'enemy-1'); await window.__TEST__.Store.updateParticipant('enemy-1', { extensions: { ...a.extensions, v5: { ...a.extensions.v5, channelling: { type: 'winds', sl: 30 } } } }); await window.__TEST__.Store.applySpellExecution(n, { actorId: 'enemy-1', targetIds: ['enemy-1'], roll: 3, attributeActive: false }); } });
    await pickSpell(page, 'Carreau');
    await page.getByLabel('Guerrier du Chaos : origine extérieure à la zone ?', { exact: true }).selectOption('true'); await page.waitForTimeout(300);
    const wards = page.getByLabel(/^Protection de Guerrier du Chaos.*résultat du d10$/);
    assert.equal(await wards.count(), 2);
    await wards.nth(0).click(); await page.keyboard.type('3'); await wards.nth(1).click(); await page.keyboard.type('4'); await page.waitForTimeout(300);
    assert.equal(await wards.nth(0).inputValue(), '3', 'premier d10 conservé');
    await calc(page, 25);
    assert.match(await page.locator('.workspace-magic-result').innerText(), /Projectile magique/, 'les deux d10 saisis à la suite sont pris en compte');
    await wards.nth(0).fill('5'); await wards.nth(1).fill('6'); await page.waitForTimeout(200);
    assert.deepEqual([await wards.nth(0).inputValue(), await wards.nth(1).inputValue()], ['5', '6']);
    assert.deepEqual(errors, []); await context.close();
  }
  {
    const { page, context, errors } = await open('cast');
    await pickSpell(page, 'Couronne de Flamme');
    const fear = page.locator('[data-focus-key="magic-specific-fear"]'), war = page.locator('[data-focus-key="magic-specific-war-leader"]');
    await fear.scrollIntoViewIfNeeded(); await fear.fill('1'); await war.fill('1'); await page.waitForTimeout(300);
    assert.equal(await war.inputValue(), '1');
    await calc(page, 5);
    assert.equal(await fear.inputValue(), '1', 'la première option propre reste saisie');
    assert.equal(await war.inputValue(), '1');
    assert.match(await page.locator('.workspace-magic-result').innerText(), /Chef de guerre repris 1 fois/, 'le Chef de guerre est rappelé');
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(500);
    assert.match(JSON.stringify(await page.evaluate(() => window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1').extensions.v5.spellEffects)), /Peur/, 'la Peur choisie en premier est appliquée');
    assert.deepEqual(errors, []); await context.close();
  }
  // U-01/U-03 : méditation protégée, erreurs synchrones de récupération et de rune visibles.
  {
    const { page, context, errors } = await open('cast', { extra: '&i=1' });
    await pickSpell(page, 'Apothéose');
    await page.getByRole('button', { name: 'Déployer une rune (1 Round)', exact: true }).click();
    await page.waitForTimeout(200); assert.match(await text(page), /Rune non déployée|matériel|conditions/);
    await page.selectOption('[data-focus-key="magicMeditationId"]', 'talent-eye-of-the-storm');
    await page.fill('[data-focus-key="magicMeditationMinutes"]', '20');
    await page.fill('[data-focus-key="magicMeditationRoll"]', '25');
    await page.fill('[data-focus-key="magicMeditationDice"]', '3 3 3 3 3');
    await page.evaluate(() => { window.__TEST__.delayMs = 200; });
    const meditate = await page.getByRole('button', { name: 'Résoudre la méditation', exact: true }).boundingBox();
    await page.mouse.dblclick(meditate.x + meditate.width / 2, meditate.y + meditate.height / 2);
    await page.waitForFunction(() => window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1').extensions.v5.spellEffects?.some(e => e.magicTalentId === 'talent-eye-of-the-storm'));
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => JSON.parse(window.__TEST__.Store.getFullJSON()).log.filter(e => /méditation réussie/.test(e.text)).length), 1);
    await page.evaluate(async () => { window.__TEST__.delayMs = 0; const store = window.__TEST__.Store, actor = store.listParticipants().find(p => p.id === 'mage-1'); await store.updateParticipant(actor.id, { extensions: { ...actor.extensions, v5: { ...actor.extensions.v5, burnout: { active: true, permanent: false, days: 2 } } } }); });
    await page.getByRole('button', { name: 'Dépenser 1 Chance pour récupérer', exact: true }).click();
    await page.waitForTimeout(250); assert.match(await text(page), /Compteur de Chance non initialisé|Récupération impossible/);
    assert.deepEqual(errors, []); await context.close();
  }
  // U-04 : l'échec durable affiche une erreur, conserve jet et aperçu, puis permet de réessayer.
  {
    const { page, context, errors } = await open('cast', { extra: '&i=1' });
    await pickSpell(page, 'Apothéose'); await targetOnly(page, 'Greta Alliée'); await calc(page, 25);
    await page.evaluate(() => { window.__TEST__.saveFailure = true; });
    await page.click('[data-focus-key="apply"]'); await page.waitForTimeout(300);
    assert.match(await text(page), /Écriture locale refusée/);
    assert.equal(await page.inputValue('[data-roll-input="attack"]'), '25');
    assert.equal(await page.locator('.workspace-magic-result, .workspace-result').count() > 0, true);
    assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false);
    assert.equal(await page.evaluate(() => window.__TEST__.Store.getHighMagicExecutions('mage-1').length), 0);
    await page.evaluate(() => { window.__TEST__.saveFailure = false; });
    await page.click('[data-focus-key="apply"]');
    await page.waitForFunction(() => window.__TEST__.Store.getHighMagicExecutions('mage-1').length === 1);
    assert.deepEqual(errors, []); await context.close();
  }
  // U-09 : recherche dans la vue Règles, accents neutralisés, nouveaux arbitrages et sources.
  {
    const { page, context, errors } = await open('cast');
    await page.evaluate(async () => {
      const root = document.createElement('div'); root.id = 'panel-rules'; document.body.append(root);
      const { renderReferenceTables } = await import('/js/ui/rules-view.js'); renderReferenceTables('', root);
    });
    for (const term of ['Dex', 'chaque protection', 'Coruscating Arc', 'seconde vue', '11 octobre 2026']) {
      await page.getByRole('searchbox', { name: 'Rechercher dans les règles' }).fill(term);
      await page.waitForTimeout(100);
      assert.match(await page.locator('#panel-rules .rules-list').innerText(), /Magie V5 & règles de la table/, term);
    }
    assert.deepEqual(errors, []); await context.close();
  }
  console.log('Lot 3 Magie V5 2b UI : recettes existantes et phase 9 (double-clic, méditation, récupération, Corruption/Undo, refus durable, recherche) réussies.');
} finally {
  await browser.close();
  server.close();
}
