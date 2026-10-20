import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { effectHandlers } from '../js/core/v5-divine-effect-handlers.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

// Up in Arms p.79 : les neuf miracles de Myrmidia raccordés au module docs/divin/sources/miracles/myrmidia-up-in-arms.mjs,
// contre les vrais contrats générés (à lancer après `node tools/build-v5-divine-contracts.mjs`).
const inventory = JSON.parse(readFileSync('docs/divin/DIVIN_INVENTAIRE.json', 'utf8'));
const clone = value => structuredClone(value);
const SHA = '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07';
const nine = [
  ['Commander la Légion', 'Command the Legion', 'commander-la-legion', 'assisted'],
  ["Effrayer l'Ennemi", 'Dismay Foe', 'effrayer-l-ennemi', 'assisted'],
  ['En Bon Ordre', 'In Good Order', 'en-bon-ordre', 'assisted'],
  ['Connaître son Ennemi', 'Know Your Enemy', 'connaitre-son-ennemi', 'manual'],
  ['Sur un Terrain Mortel', 'On Deadly Ground', 'sur-un-terrain-mortel', 'assisted'],
  ['Attaque Rapide', 'Quick Strike', 'attaque-rapide', 'assisted'],
  ['Dévotion de la Guerrière', 'Shieldmaiden’s Devotion', 'devotion-de-la-guerriere', 'assisted'],
  ['Compétence Martiale', 'Skill of Combat', 'competence-martiale', 'assisted'],
  ['Vindicte Vengeresse', 'Vengeful Wrath', 'vindicte-vengeresse', 'manual']
];
const byName = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.catalogueName === name);
const LEGION = 'divine:miracle:commander-la-legion', DISMAY = 'divine:miracle:effrayer-l-ennemi', SKILL = 'divine:miracle:competence-martiale';
const BATTLE = 'divine:blessing:myrmidia:battle';

test('provenance : les neuf contrats gardent leur id et leur entrée de catalogue, sans doublon de module', () => {
  const rows = registry.contracts.filter(row => row.type === 'miracle' && row.source.document === 'Up in arms.pdf');
  assert.equal(rows.length, 9);
  assert.equal(registry.contracts.filter(row => row.id.startsWith('divine:miracle:myrmidia:')).length, 0, 'aucun id de module Myrmidia en doublon');
  assert.equal(new Set(registry.contracts.map(row => row.id)).size, registry.contracts.length);
  for (const [name, canonical, slug, status] of nine) {
    const row = byName(name);
    assert.equal(row.id, `divine:miracle:${slug}`);
    assert.equal(row.canonicalName, canonical);
    assert.equal(row.status, status, name);
    assert.deepEqual(Object.keys(row.catalogueEntry), ['nom', 'portee', 'cible', 'duree', 'effet']);
    assert.equal(row.catalogueEntry.nom, name);
    assert.deepEqual(Object.keys(row.sourceReceipt), ['catalogueCsvSha256', 'referenceSnapshotSha256', 'catalogueSnapshotVersion', 'sourceBookSha256']);
    assert.equal(row.sourceReceipt.sourceBookSha256, SHA);
    assert.equal(row.source.fileSha256, SHA);
    assert.equal(row.source.printedPage, 79);
    assert.equal(row.source.edition, 'V4 EN');
    assert.equal(row.clauses[0].id, 'catalogue-entry');
    assert.ok(row.clauses.some(clause => clause.mode === 'manual'), `${name} garde au moins un rappel manuel`);
    assert.ok(row.effects.every(effect => effectHandlers[effect.type]), name);
  }
  assert.ok(registry.sourceManifest.supplementBooks.some(book => book.bookId === 'L13' && book.document === 'Up in arms.pdf' && book.fileSha256 === SHA));
});

test('inventaire : plus aucun miracle bloqué, neuf miracles Up in Arms connectés', () => {
  assert.equal(inventory.counts.miracles, 15);
  assert.equal(inventory.counts.miraclesSupplementSourceFound, 9);
  assert.equal(inventory.counts.miraclesV4AdaptationBlocked, 0);
  assert.equal(inventory.sourceCounts.miraclesUpInArmsConnected, 9);
  assert.deepEqual(inventory.sourceCounts.upInArmsByStatus, { assisted: 7, manual: 2 });
  assert.equal(registry.contracts.some(row => row.status === 'blocked'), false);
  assert.equal(inventory.items.filter(row => row.type === 'miracle' && row.source.document === 'Up in arms.pdf').length, 9);
});

test('paramètres : portées, durées et zones arbitrées par le MJ', () => {
  const params = name => byName(name).params;
  assert.deepEqual(params('Commander la Légion'), { range: { kind: 'special' }, targets: { kind: 'special' }, duration: { kind: 'fixed', value: 1, unit: 'rounds' } });
  assert.deepEqual(params('Effrayer l\'Ennemi').duration, { kind: 'fixed', value: 1, unit: 'rounds' });
  // Q4 : zones en Bonus de Volonté, portée de Connaître son Ennemi en caractéristique entière.
  assert.deepEqual(params('En Bon Ordre').targets, { kind: 'area', characteristicBonus: 'FM', unit: 'yards' });
  assert.deepEqual(params('Connaître son Ennemi').range, { kind: 'characteristic', characteristic: 'FM', unit: 'yards' });
  assert.deepEqual(params('Connaître son Ennemi').duration, { kind: 'instant' });
  // Q6 : durée de Sur un Terrain Mortel non imprimée, Bonus de Volonté en Rounds, signalée comme non attestée.
  assert.deepEqual(params('Sur un Terrain Mortel').duration, { kind: 'characteristic-bonus', characteristic: 'FM', unit: 'rounds' });
  assert.ok(byName('Sur un Terrain Mortel').clauses.some(clause => clause.id === 'duration-unattested' && /NON ATTESTÉE/.test(clause.text)));
  assert.match(byName('Sur un Terrain Mortel').sourceDelta, /Durée non attestée/);
  assert.deepEqual(params('Attaque Rapide').duration, { kind: 'fixed', value: 3, unit: 'rounds' });
  assert.deepEqual(params('Dévotion de la Guerrière').range, { kind: 'fixed', value: 36, unit: 'yards' });
  assert.deepEqual(params('Dévotion de la Guerrière').duration, { kind: 'fixed', value: 4, unit: 'rounds' });
  assert.deepEqual(params('Compétence Martiale').range, { kind: 'fixed', value: 24, unit: 'yards' });
  assert.deepEqual(params('Compétence Martiale').duration, { kind: 'fixed', value: 4, unit: 'rounds' });
  assert.deepEqual(params('Vindicte Vengeresse').duration, { kind: 'fixed', value: 6, unit: 'rounds' });
});

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest'), actor('ally', { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const mods = (store, id) => person(store, id).extensions.v5.testModifiers ?? {};
const allyFacts = { targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinRange: true } } } };

test('Commander la Légion : +1 DR aux Tests de Commandement du prêtre, rien pour l’allié, retiré à l’échéance', async () => {
  const contract = getDivineContract(LEGION);
  assert.deepEqual(contract.effects.map(effect => [effect.type, effect.modifiers, effect.appliesTo]), [['test-modifier', { Commandement: 1 }, 'caster']]);
  const store = await fixture();
  const { preview } = await cast(store, LEGION, { targetIds: ['ally'], expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
  assert.deepEqual(preview.preview.effects[0].modifiers, { Commandement: 1 });
  assert.deepEqual(mods(store, 'priest'), { Commandement: 1 });
  assert.deepEqual(mods(store, 'ally'), {});
  await store.undo();
  assert.deepEqual(mods(store, 'priest'), {});
  await store.redo();
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.deepEqual(mods(store, 'priest'), {});
  assert.equal((person(store, 'priest').extensions.v5.divineEffects || []).length, 0);
});

test('Effrayer l’Ennemi : Trait Terreur (1) sur le prêtre pendant la durée, puis retiré', async () => {
  const store = await fixture();
  await cast(store, DISMAY, { expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
  assert.ok(person(store, 'priest').traits.includes('Terreur (1)'));
  assert.ok(!person(store, 'ally').traits.includes('Terreur (1)'));
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.ok(!person(store, 'priest').traits.includes('Terreur (1)'));
});

test('Compétence Martiale : +10 CC et +10 CT à l’allié désigné, retiré à l’échéance', async () => {
  const store = await fixture();
  const before = { CC: person(store, 'ally').caracs.CC, CT: person(store, 'ally').caracs.CT };
  const preview = store.previewDivineExecution(SKILL, input({ ...allyFacts, expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' } }));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  assert.equal(person(store, 'ally').caracs.CC, before.CC, 'l’aperçu ne modifie rien');
  const result = await store.applyDivineExecution(SKILL, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(person(store, 'ally').caracs.CC, before.CC + 10);
  assert.equal(person(store, 'ally').caracs.CT, before.CT + 10);
  assert.equal(person(store, 'priest').caracs.CC, 40, 'le prêtre n’est pas désigné');
  await store.undo();
  assert.equal(person(store, 'ally').caracs.CC, before.CC);
  await store.redo();
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.equal(person(store, 'ally').caracs.CC, before.CC);
  assert.equal(person(store, 'ally').caracs.CT, before.CT);
  assert.equal((person(store, 'ally').extensions.v5.divineEffects || []).length, 0);
});

test('Compétence Martiale : non-cumul des +10 CC avec la Bénédiction de Bataille (règle établie), +10 CT conservé', async () => {
  const store = await fixture();
  await cast(store, BATTLE, allyFacts);
  assert.equal(person(store, 'ally').caracs.CC, 50);
  // Deux prières distinctes ne s'excluent pas (la p.217 n'interdit que la même prière), mais le bonus de caractéristique ne s'additionne pas : le meilleur seul vaut.
  const { result } = await cast(store, SKILL, { ...allyFacts, expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' } });
  assert.equal(person(store, 'ally').caracs.CC, 50, 'les deux +10 CC ne se cumulent pas');
  assert.equal(person(store, 'ally').caracs.CT, 50, 'le +10 CT de Compétence Martiale s’applique');
  assert.ok(result.ready);
  await store.undo();
  assert.equal(person(store, 'ally').caracs.CC, 50);
  assert.equal(person(store, 'ally').caracs.CT, 40);
  // Relancer la même prière tant qu'elle est active reste interdit.
  assert.equal(store.previewDivineExecution(BATTLE, input(allyFacts)).ready, false);
});

test('statuts honnêtes : un contrat manuel ne porte aucun effet appliqué, les clauses restantes sont des rappels', () => {
  for (const [name, , , status] of nine) {
    const row = byName(name);
    if (status === 'manual') {
      assert.deepEqual(row.effects, [], name);
      assert.ok(row.clauses.filter(clause => clause.id !== 'catalogue-entry').every(clause => clause.mode === 'manual'), name);
    }
  }
  // Dévotion de la Guerrière : assistée, l'ennemi est saisi au lancement (un Intrépide sans spécialisation ne s'applique à aucun ennemi : fait manquant talent.specialization).
  assert.equal(byName('Dévotion de la Guerrière').status, 'assisted');
  assert.match(byName('Dévotion de la Guerrière').sourceDelta, /talent.specialization/);
  assert.ok(byName('En Bon Ordre').clauses.some(clause => clause.id === 'broken-from-fleeing'));
  assert.ok(byName('Vindicte Vengeresse').clauses.some(clause => clause.id === 'unrepentant'));
  assert.ok(byName('Attaque Rapide').clauses.some(clause => clause.id === 'free-attack'));
});

test('un contrat manuel Up in Arms ne produit aucun effet via le Store (rappels seulement)', async () => {
  const store = await fixture();
  const row = byName('Vindicte Vengeresse');
  const preview = store.previewDivineExecution(row.id, input());
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  assert.deepEqual(preview.preview.effects, []);
  const before = clone(person(store, 'priest').caracs);
  await store.applyDivineExecution(row.id, { preview });
  assert.deepEqual(mods(store, 'priest'), {});
  assert.deepEqual(person(store, 'priest').caracs, before);
  // Seule une couche de rappel manuel est posée : aucune donnée de jeu (modificateur, Trait, caractéristique).
  const layers = person(store, 'priest').extensions.v5.divineEffects || [];
  assert.ok(layers.every(layer => layer.id.endsWith(':manual-prayer-reminder') && !layer.testModifiers && !layer.traits && !layer.characteristics));
});
