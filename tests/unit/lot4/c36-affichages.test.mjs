// C36 · G-DIV-14 / C17 / G-DIV-3 : affichages de l'aperçu de prière et du choix de Test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';

const clone = value => structuredClone(value);
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const base = (id, extra = {}) => ({ id, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const priest = god => base('priest', { initiative: 70,
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: god }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: god }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })) });
async function fixture(god = 'Myrmidia') {
  const store = createStore({ storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'], participants: [priest(god), base('ally', { initiative: 50 }), base('foe', { initiative: 30 })] } });
  return store;
}

test('C17 : aperçu de prière sans score défini — jamais « score undefined » dans ce que l’interface affiche (99 extensions de portée)', async () => {
  const store = await fixture('Myrmidia');
  const result = store.previewDivineExecution('divine:blessing:myrmidia:battle', { actorId: 'priest', targetIds: ['ally'], roll: 25, canSpeak: true,
    choices: { range: 99, targets: 0, duration: 0, effect: 0 }, facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfRound', round: 1 } });
  assert.equal(result.ready, false, 'précondition : 99 paliers demandés pour 3 disponibles');
  assert.ok(result.preview?.prayer, 'précondition : un aperçu de prière est quand même renvoyé');
  // v5-divine-panel.js lit preview.skillScore pour écrire « Prière réussie · N DR · score X ».
  assert.equal(typeof result.preview.skillScore, 'number', `skillScore = ${result.preview.skillScore}`);
});

test('C17 (témoin) : aperçu prêt, le score est bien renvoyé', async () => {
  const store = await fixture('Myrmidia');
  const result = store.previewDivineExecution('divine:blessing:myrmidia:battle', { actorId: 'priest', targetIds: ['ally'], roll: 25, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfRound', round: 1 } });
  assert.equal(typeof result.preview?.skillScore, 'number', JSON.stringify(result.needsInput));
});

// G-DIV-14 · Faire monter les enjeux (Ranald, +6 / −6 DR au prochain Test de la cible).
const STAKES = 'divine:miracle:ranald:up-the-stakes';
async function stakesFixture() {
  const store = await fixture('Ranald');
  const preview = store.previewDivineExecution(STAKES, { actorId: 'priest', targetIds: ['ally'], roll: 25, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.equal((await store.applyDivineExecution(STAKES, { preview })).ready, true);
  return store;
}
const attack60 = { resolutionId: 'stakes-1', actorId: 'ally', targetId: 'foe', roll: 60, action: { type: 'attack', base: 50, attr: 'CC', damage: 5 },
  defense: { base: 30, roll: 90, v5: { kind: 'melee' } }, v5: { kind: 'melee', advantageSources: [{ id: 'adv', label: 'Avantage déclaré' }] } };

test('G-DIV-14 : la carte « Conserver 60 » affiche les mêmes DR que le résultat principal (−6, pas −1)', async () => {
  const store = await stakesFixture();
  const preview = store.previewResolution(attack60);
  assert.equal(preview.sl, -6, 'résultat principal');
  const keep = preview.decisions.actor.options.find(option => option.id === 'keep');
  assert.ok(keep, 'précondition : option « Conserver 60 » proposée (Avantage, inversion possible)');
  assert.equal(keep.label, 'Conserver 60');
  assert.equal(keep.summary.sl, preview.sl, `carte = ${keep.summary.sl} DR, résultat = ${preview.sl} DR`);
});

test('G-DIV-14 : la carte d’inversion applique aussi la faveur (réussite ⇒ DR ≥ +6)', async () => {
  const store = await stakesFixture();
  const preview = store.previewResolution(attack60);
  const reverse = preview.decisions.actor.options.find(option => option.id === 'reverse');
  assert.ok(reverse, 'précondition : option d’inversion proposée');
  assert.equal(reverse.summary.success, true, 'précondition : 06 sous 50 réussit');
  assert.ok(reverse.summary.sl >= 6, `carte inversée = ${reverse.summary.sl} DR`);
});

// G-DIV-3 · Sauvagerie (Ulric) : chaque motif de blocage n'apparaît qu'une fois avant la saisie.
const SAVAGERY = 'divine:blessing:ulric:savagery';
async function savageryFixture() {
  const store = await fixture('Ulric');
  const preview = store.previewDivineExecution(SAVAGERY, { actorId: 'priest', targetIds: ['ally'], roll: 25, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    facts: { targets: { ally: { withinRange: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.equal((await store.applyDivineExecution(SAVAGERY, { preview })).ready, true);
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'ally');
  return store;
}
const duplicates = rows => rows.filter((row, index) => rows.indexOf(row) !== index);

test('G-DIV-3 : un critique sous Sauvagerie, avant saisie des gravités, sans motif en double', async () => {
  const store = await savageryFixture();
  const preview = store.previewResolution({ resolutionId: 'sauv-1', actorId: 'ally', targetId: 'foe', roll: 22, action: { type: 'attack', base: 50, attr: 'CC', damage: 5 },
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 45 } });
  const motifs = (preview.unresolved || []).filter(row => /Frappe blessante/.test(row));
  assert.ok(motifs.some(row => /saisir les deux gravités/.test(row)), `précondition : motif de saisie présent (${JSON.stringify(preview.unresolved)})`);
  assert.ok(motifs.some(row => /choisir la gravité/.test(row)), 'précondition : motif de choix présent');
  assert.deepEqual(duplicates(preview.unresolved || []), [], JSON.stringify(preview.unresolved));
});
