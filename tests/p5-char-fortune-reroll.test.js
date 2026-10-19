// Tests de caractérisation : chemin « Relance par la Chance » (V5).
// Ces tests figent le comportement ACTUEL du Store pour qu'une refacturation
// ne puisse pas le casser silencieusement. Ils ne testent pas la règle du livre,
// seulement ce que le code fait aujourd'hui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const MESSAGE_JET_MANQUANT = 'Relance de Fortune : saisir le nouveau jet d100 (1 à 100).';

function mageDeBase() {
  return {
    id: 'mage',
    profileId: 'mage-profile',
    name: 'Mage',
    kind: 'PJ',
    camp: 'pj',
    zone: 'active',
    hp: 20,
    maxHp: 20,
    caracs: { CC: 30, CT: 30, F: 30, E: 30, Int: 60, FM: 50, I: 40, Ag: 40, Soc: 35 },
    skills: [{ name: 'Langue (Magick)', total: 90 }],
    states: []
  };
}

// Montage identique au test de bout en bout du Lot 3 (P1 #3) : un combat avec
// le mage comme acteur courant, plus un allié et un ennemi.
async function monterCombat() {
  const store = createStore();
  await store.ready;
  const base = mageDeBase();
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'ally', 'enemy'],
      participants: [
        { ...structuredClone(base), actions: [{ name: 'Coup de bâton', type: 'attack', attr: 'CC', base: 50, damage: 'BF+2' }] },
        { ...structuredClone(base), id: 'ally', profileId: 'ally-profile', name: 'Allié' },
        { ...structuredClone(base), id: 'enemy', profileId: 'enemy-profile', name: 'Ennemi', kind: 'PNJ', camp: 'ennemi' }
      ]
    },
    diceLines: [],
    log: []
  });
  return store;
}

// Test de FM (score 50) raté d'office avec un 88, éventuellement accompagné
// d'une demande de relance par la Chance avec le nouveau jet fourni.
function previsualiserRelance(store, options = {}) {
  const mageParticipant = store.listParticipants().find(p => p.id === 'mage');
  const v5 = { kind: 'test', fortuneReroll: true };
  if ('fortuneRerollRoll' in options) v5.fortuneRerollRoll = options.fortuneRerollRoll;
  return store.previewResolution({
    actor: mageParticipant,
    action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 },
    targetId: 'enemy',
    roll: '88',
    v5
  });
}

test('Relance par la Chance — un test raté (88) devient une réussite (24) et la prévisualisation le reflète', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);
  assert.equal(store.getFortune('mage').balance, 3);

  const sansRelance = store.previewResolution({
    actor: store.listParticipants().find(p => p.id === 'mage'),
    action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 },
    targetId: 'enemy',
    roll: '88',
    v5: { kind: 'test' }
  });
  assert.equal(sansRelance.success, false, 'Un 88 sur score 50 est un échec sans relance');

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  assert.equal(apercu.success, true, 'Le nouveau jet d100 (24) remplace le 88 et transforme l’échec en réussite');
  assert.equal(apercu.fortuneReroll.active, true);
  assert.equal(apercu.fortuneReroll.used, true, 'La prévisualisation signale que la relance est utilisée');
  assert.equal(apercu.fortuneReroll.rerollRoll, 24);
  assert.equal(apercu.fortuneReroll.initialRoll, 88, 'Le jet initial d’avant relance est conservé dans la prévisualisation');
  assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1),
    'La prévisualisation prévoit un coût d’exactement 1 Point de Chance');
});

test('Relance par la Chance — l’application débite exactement 1 Point de Chance permanent (sans Chance temporaire)', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);
  assert.equal(store.getFortune('mage').balance, 3);
  assert.equal(store.getFortune('mage').temporary, 0);

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  await store.applyResolution(apercu);

  const fortune = store.getFortune('mage');
  assert.equal(fortune.balance, 2, 'Exactement 1 Point de Chance est débité (3 -> 2)');
  assert.equal(fortune.permanent, 2);
  assert.equal(fortune.temporary, 0);
});

test('Relance par la Chance — la Chance temporaire est dépensée avant la Chance permanente', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 2);

  // « Le Second Signe d’Amul » octroie 3 Points de Chance temporaires (même montage que le Lot 3, P1 #3).
  await store.applySpellExecution('Le Second Signe d’Amul', {
    actorId: 'mage',
    targetIds: ['mage'],
    roll: 12,
    attributeActive: false
  });
  assert.equal(store.getFortune('mage').balance, 5, '2 permanents + 3 temporaires');
  assert.equal(store.getFortune('mage').permanent, 2);
  assert.equal(store.getFortune('mage').temporary, 3);

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  await store.applyResolution(apercu);

  const fortune = store.getFortune('mage');
  assert.equal(fortune.temporary, 2, 'Le point dépensé vient de la composante temporaire (3 -> 2)');
  assert.equal(fortune.permanent, 2, 'Le solde permanent est inchangé');
  assert.equal(fortune.balance, 4);
});

test('Relance par la Chance — sans nouveau jet d100, un besoin est signalé et la relance n’est pas utilisée', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);

  const apercu = previsualiserRelance(store);
  assert.ok((apercu.unresolved || []).includes(MESSAGE_JET_MANQUANT),
    'La prévisualisation signale qu’il faut saisir le nouveau jet d100');
  assert.equal(apercu.fortuneReroll.active, true);
  assert.equal(apercu.fortuneReroll.used, false, 'Sans jet de relance, la relance n’est pas marquée utilisée');
  assert.equal(apercu.fortuneReroll.rerollRoll, null);
  assert.equal(apercu.success, false, 'Le 88 initial reste un échec tant que le nouveau jet n’est pas fourni');
  assert.equal(apercu.ready, false);
});

test('Relance par la Chance — l’annulation (Undo) restaure le solde de Chance', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  await store.applyResolution(apercu);
  assert.equal(store.getFortune('mage').balance, 2);

  await store.undo();
  const fortune = store.getFortune('mage');
  assert.equal(fortune.balance, 3, 'Undo rétablit le solde d’avant la relance');
  assert.equal(fortune.permanent, 3);
  assert.equal(fortune.temporary, 0);
});
