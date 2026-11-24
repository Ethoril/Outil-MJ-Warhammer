// Passe G · lot G10 (recette manuelle du MJ) : R11 menu « Autres actions » avec Test…, R14 distance de la carte redemandée à chaque
// déplacement, R2 ligne « Taille (arme) » d'une Vermine de choc du bestiaire L06 contre un PJ à 5 PA au Corps (p. 304).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { otherMenuEntries } from '../../../js/ui/resolution-panel/menu-autres.js';
import { carriesTailleArme, tailleArmeModel } from '../../../js/ui/resolution-panel/taille-arme.js';
import { mapAnswerContext, rangedDodgeRight } from '../../../js/ui/combat-distance.js';
import { setMapDistanceProvider, refreshMapDistance } from '../../../js/ui/resolution-panel.js';
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { createStore } from '../../../js/core/store.js';
import { calculateArmor } from '../../../js/core/equipment.js';

// ── R11 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('R11 · le menu « Autres actions » porte magie, prière, Corruption et Test…', () => {
  const entries = otherMenuEntries({ actions: [{ id: 'x', type: 'cast' }] });
  assert.deepEqual(entries.map(row => row.label), ['Focalisation V5', 'Incantation V5', 'Dissipation persistante V5', 'Prière', 'Corruption', 'Test…']);
  assert.equal(entries.find(row => row.id === 'test').disabled, false);
  assert.ok(entries.find(row => row.id === 'test'), 'Test… est une entrée du menu');
});
test('R11 · sans action préparée, Test… est grisé comme son bouton de la ligne Action', () => {
  const entries = otherMenuEntries({ actions: [] });
  assert.equal(entries.find(row => row.id === 'test').disabled, true);
  assert.equal(entries.find(row => row.id === 'prayer').disabled, false);
});

// ── R14 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const bands = { actorId: 'a', targetId: 'b' };
test('R14 · la bande écrite par la carte suit la nouvelle mesure (24 m → 2 m)', () => {
  const before = mapAnswerContext({}, { meters: 24, band: 'courte', ...bands }).context;
  assert.deepEqual([before.shotRange, before.mapDistance.meters, before.mapDistance.band], ['courte', 24, 'courte']);
  const after = mapAnswerContext(before, { meters: 2, band: 'a-bout-portant', ...bands }).context;
  assert.equal(after.mapDistance.meters, 2);
  assert.equal(after.shotRange, 'a-bout-portant');
});
test('R14 · une bande choisie par le MJ reste, la mesure change', () => {
  const chosen = { shotRange: 'longue', mapDistance: { meters: 24, band: 'courte', ...bands } };
  const after = mapAnswerContext(chosen, { meters: 2, band: 'a-bout-portant', ...bands }).context;
  assert.equal(after.shotRange, 'longue');
  assert.equal(after.mapDistance.meters, 2);
});
test('R14 · même mesure : rien à écrire ; le droit d’esquiver suit la mesure (p. 165)', () => {
  const ctx = mapAnswerContext({}, { meters: 24, band: 'courte', ...bands }).context;
  assert.equal(mapAnswerContext(ctx, { meters: 24, band: 'courte', ...bands }).context, null);
  const person = (id, extra = {}) => ({ id, name: id, caracs: { I: 42 }, equipment: [], states: [], extensions: { v5: {} }, ...extra });
  const right = context => rangedDodgeRight({ actor: person('a'), target: person('b'), context, plateau: {} });
  assert.equal(right(ctx).status, 'forbidden');
  assert.equal(right(mapAnswerContext(ctx, { meters: 2, band: 'courte', ...bands }).context).status, 'allowed');
});
test('R14 · `refreshMapDistance` existe et ne casse rien sans résolution de tir affichée', () => {
  setMapDistanceProvider(() => Promise.resolve({ ok: false }));
  assert.doesNotThrow(() => refreshMapDistance());
  setMapDistanceProvider(null);
});

// ── R2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const books = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8'));
const records = Array.isArray(books) ? books : books.profiles || books.records || Object.values(books);
const piece = (id, name, ap, layer = 'chain') => ({ id, baseId: id, kind: 'armour', name, category: layer === 'leather' ? 'Cuir' : 'Mailles', damage: '', reach: '', range: '', ap, locations: ['body'], layer, keywords: [], notes: '', source: '', custom: false });
async function struck(equipment) {
  const store = createStore({ storage: null });
  await store.ready;
  const vermine = buildParticipantFromBestiary('E0-P-110', { library: records, camp: 'ennemi', zone: 'active' });
  const pj = { id: 'pj', name: 'Caelel', kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, initiative: 40, caracs: { CC: 35, CT: 40, F: 25, E: 30, I: 40, Ag: 40, Dex: 35, Int: 30, FM: 30, Soc: 30 },
    states: [], skills: [], equipment, armorLocations: calculateArmor(equipment), armor: { head: 0, body: 5, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };
  if (!equipment.length) pj.armorLocations = { head: 0, body: 5, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'g10', turnIndex: 1 } },
    combat: { round: 1, currentActorId: vermine.id, order: [vermine.id, 'pj'], participants: [vermine, pj] }, diceLines: [], log: [] });
  const preview = store.previewResolution({ resolutionId: 'g10', actorId: vermine.id, targetId: 'pj', action: vermine.actions[0], roll: 54, defense: { base: 70, roll: 95, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
  return { vermine, preview };
}
test('R2 · la Vermine de choc du bestiaire L06 porte la qualité Taille, reconnue par l’interface (alias « Hack » compris)', async () => {
  const { vermine } = await struck([piece('p1', 'Plastron', 5)]);
  const action = vermine.actions[0];
  assert.ok(carriesTailleArme({ action, type: 'attack', target: { id: 'pj' } }));
  assert.ok(carriesTailleArme({ action: { qualities: ['Defensive', 'Hack', 'Impale'] }, type: 'attack', target: { id: 'pj' } }), 'qualités imprimées brutes');
  assert.ok(carriesTailleArme({ action: { qualities: [{ id: 'Hack' }] }, type: 'attack', target: { id: 'pj' } }));
  assert.ok(!carriesTailleArme({ action: { qualities: ['Defensive'] }, type: 'attack', target: { id: 'pj' } }));
  assert.ok(!carriesTailleArme({ action, type: 'attack', target: null }));
});
test('R2 · une seule pièce de 5 PA au Corps : « Taille (arme) : Plastron perd 1 PA. », sans liste', async () => {
  const { preview } = await struck([piece('p1', 'Plastron', 5)]);
  const model = tailleArmeModel({ hack: preview.hack, hasPreview: true });
  assert.equal(model.mode, 'note');
  assert.equal(model.text, 'Taille (arme) : Plastron perd 1 PA.');
  assert.equal(preview.hack.damage.after, 4);
});
test('R2 · plusieurs pièces : liste, la plus forte précochée', async () => {
  const { preview } = await struck([piece('p1', 'Veste', 2), piece('p2', 'Plastron', 3, 'leather')]);
  const model = tailleArmeModel({ hack: preview.hack, hasPreview: true });
  assert.equal(model.mode, 'list');
  assert.equal(model.label, 'Taille (arme) : pièce touchée');
  assert.equal(model.selectedId, 'p2');
  assert.equal(model.choices.length, 2);
});
test('R2 · PA sans pièce identifiable : phrase et nom libre facultatif', async () => {
  const { preview } = await struck([]);
  const model = tailleArmeModel({ hack: preview.hack, hasPreview: true });
  assert.equal(model.mode, 'note');
  assert.equal(model.manual, true);
  assert.equal(model.text, 'Taille (arme) : la protection touchée perd 1 PA.');
  assert.equal(tailleArmeModel({ hack: null, hasPreview: false }).text, 'Taille (arme) : pièce touchée déduite au calcul.');
});
