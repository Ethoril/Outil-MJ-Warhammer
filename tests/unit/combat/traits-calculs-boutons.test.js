// Lot L5 du second chantier des Traits : les commandes annulables des boutons de la fiche (Rencontre : Effrayé et Animosité,
// Entrer en Frénésie, soin Vampirique, Se cabrer, cadavre frais d'Affamé, drapeaux de Bestial) et la cause des événements de monture.
// CA13, CA14, CA16, CA20 (câblage), CA21, CA25 ; D9, D13.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { planNaturalAttack } from '../../../js/core/creature-combat.js';
import { readCombatPosition } from '../../../js/core/v5-game-time.js';

const person = (id, extra = {}) => ({ id, name: id.toUpperCase(), kind: 'PNJ', camp: 'monstres', zone: 'active', initiative: 30, hp: 10, maxHp: 10,
  caracs: { E: 30, Int: 25, FM: 40, Ag: 30, I: 30, F: 50 }, states: [], traits: [], extensions: { v5: {} }, ...extra });
const envelope = (participants, { round = 1, current = participants[0]?.id, v5 = {} } = {}) => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
  combat: { round, currentActorId: current, order: participants.map(row => row.id), participants }, extensions: { v5: { turnIndex: 1, ...v5 } } });

async function open(participants, options) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON(envelope(participants, options));
  return store;
}
const full = store => JSON.parse(store.getFullJSON());
const who = (store, id) => full(store).combat.participants.find(row => row.id === id);
const logs = store => full(store).log.map(row => row.text).join('\n');
const pass = { success: true, sl: 1 }, fail = { success: false, sl: 0 };

describe('Rencontre : Effrayé et Animosité (CA13, D9)', () => {
  test('Effrayé : Peur (2) de la cible nommée posée sur le porteur, un seul ↶, ↷ rejoue', async () => {
    const store = await open([person('a', { traits: ['Afraid (Orc)'] }), person('o', { keywords: ['Orc'], camp: 'pj' })]);
    const result = await store.applyCreatureEncounter('a', 'afraid', { targetId: 'o' });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.ok(who(store, 'a').states.length > 0, 'état de Peur posé');
    assert.match(logs(store), /Effrayé/);
    await store.undo();
    assert.equal(who(store, 'a').states.length, 0, '↶ retire la Peur');
    await store.redo();
    assert.ok(who(store, 'a').states.length > 0, '↷ rejoue');
  });

  test('Effrayé : une cible sans le mot-clé nommé est refusée en français, rien n\'est écrit', async () => {
    const store = await open([person('a', { traits: ['Afraid (Orc)'] }), person('e', { keywords: ['Elfe'], camp: 'pj' })]);
    const result = await store.applyCreatureEncounter('a', 'afraid', { targetId: 'e' });
    assert.equal(result.ok, false);
    assert.match(result.message, /Effrayé/);
    assert.equal(who(store, 'a').states.length, 0);
  });

  test('Animosité : demande du Test de Calme tant que la réponse manque ; échec : journal, aucun état ; ↶ ↷', async () => {
    const store = await open([person('a', { traits: ['Animosity (Orc)'] }), person('o', { keywords: ['Orc'], camp: 'pj' })]);
    const asked = await store.applyCreatureEncounter('a', 'animosity', { targetId: 'o' });
    assert.equal(asked.ok, false);
    assert.equal(asked.status, 'requires-input');
    assert.equal(asked.requests[0].kind, 'test');
    assert.equal(asked.requests[0].participantId, 'a');
    const done = await store.applyCreatureEncounter('a', 'animosity', { targetId: 'o', inputs: { a: { [asked.requests[0].field]: fail } } });
    assert.equal(done.ok, true, JSON.stringify(done));
    assert.match(logs(store), /Animosité/);
    assert.equal(who(store, 'a').states.length, 0);
    assert.equal(await store.undo(), true, 'la commande est annulable (le journal reste, comme pour les autres effets)');
    assert.equal(await store.redo(), true);
  });

  test('Effrayé sans cible désignée (MJ 17/11) : Peur (2) posée sur le porteur, un seul ↶', async () => {
    const store = await open([person('a', { traits: ['Afraid (Orc)'] })]);
    const result = await store.applyCreatureEncounter('a', 'afraid', {});
    assert.equal(result.ok, true, JSON.stringify(result));
    const fear = who(store, 'a').states.find(row => row.key === 'fear-of-talent');
    assert.ok(fear, 'état de Peur posé');
    assert.equal(fear.rating, 2);
    assert.match(logs(store), /Effrayé/);
    await store.undo();
    assert.equal(who(store, 'a').states.length, 0, '↶ retire la Peur');
  });

  test('Animosité sans cible désignée (MJ 17/11) : Test de Calme demandé, échec : journal ; ↶ ↷', async () => {
    const store = await open([person('a', { traits: ['Animosity (Orc)'] })]);
    const asked = await store.applyCreatureEncounter('a', 'animosity', { targetId: null });
    assert.equal(asked.status, 'requires-input', JSON.stringify(asked));
    assert.equal(asked.requests[0].testTarget.score, 40, 'Calme sur la Force Mentale du porteur');
    const done = await store.applyCreatureEncounter('a', 'animosity', { inputs: { a: { [asked.requests[0].field]: fail } } });
    assert.equal(done.ok, true, JSON.stringify(done));
    assert.match(logs(store), /Animosité.*Calme raté/);
    assert.equal(await store.undo(), true);
    assert.equal(await store.redo(), true);
  });

  test('Animosité : une cible sans le mot-clé nommé est refusée', async () => {
    const store = await open([person('a', { traits: ['Animosity (Orc)'] }), person('e', { keywords: ['Elfe'], camp: 'pj' })]);
    const result = await store.applyCreatureEncounter('a', 'animosity', { targetId: 'e' });
    assert.equal(result.ok, false);
    assert.notEqual(result.status, 'requires-input');
    assert.match(result.message, /Animosité/);
  });

  test('porteur sans le Trait, ou clé inconnue : refus', async () => {
    const store = await open([person('a'), person('o', { camp: 'pj' })]);
    assert.equal((await store.applyCreatureEncounter('a', 'afraid', { targetId: 'o' })).ok, false);
    assert.equal((await store.applyCreatureEncounter('a', 'nimportequoi', { targetId: 'o' })).ok, false);
  });
});

describe('constat 1 : Calme lu sur la compétence de la fiche', () => {
  const skills = [{ id: 'skill-43_61_6c_6d_65-base', name: 'Calme', total: 61 }];
  test('Frénésie et Animosité demandent le total de Calme', async () => {
    const store = await open([person('f', { traits: ['Frenzy', 'Animosity (Orc)'], skills }), person('o', { keywords: ['Orc'], camp: 'pj' })]);
    assert.equal((await store.enterTraitFrenzy('f')).requests[0].testTarget.score, 61);
    assert.equal((await store.applyCreatureEncounter('f', 'animosity', { targetId: 'o' })).requests[0].testTarget.score, 61);
  });
});

describe('Entrer en Frénésie (CA14)', () => {
  test('Volonté demandée ; réussie : état Frénésie actif comme le Talent ; ↶ ↷', async () => {
    const store = await open([person('f', { traits: ['Frenzy'] })]);
    const asked = await store.enterTraitFrenzy('f');
    assert.equal(asked.status, 'requires-input');
    assert.equal(asked.requests[0].kind, 'test');
    assert.equal(who(store, 'f').states.some(row => row.key === 'frenzy'), false, 'rien avant la réponse');
    const done = await store.enterTraitFrenzy('f', { inputs: { f: { [asked.requests[0].field]: pass } } });
    assert.equal(done.ok, true, JSON.stringify(done));
    assert.equal(who(store, 'f').states.filter(row => row.key === 'frenzy').length, 1);
    await store.undo();
    assert.equal(who(store, 'f').states.some(row => row.key === 'frenzy'), false);
    await store.redo();
    assert.equal(who(store, 'f').states.filter(row => row.key === 'frenzy').length, 1);
  });

  test('Test raté : aucune Frénésie, une ligne de journal', async () => {
    const store = await open([person('f', { traits: ['Frenzy'] })]);
    const asked = await store.enterTraitFrenzy('f');
    const done = await store.enterTraitFrenzy('f', { inputs: { f: { [asked.requests[0].field]: fail } } });
    assert.equal(done.ok, true);
    assert.equal(who(store, 'f').states.some(row => row.key === 'frenzy'), false);
    assert.match(logs(store), /Frénésie/);
  });

  test('le résultat d\'un d100 donne le même effet que la réussite saisie', async () => {
    const store = await open([person('f', { traits: ['Frenzy'] })]);
    const asked = await store.enterTraitFrenzy('f');
    await store.enterTraitFrenzy('f', { inputs: { f: { [asked.requests[0].field]: 1 } } });
    assert.equal(who(store, 'f').states.filter(row => row.key === 'frenzy').length, 1);
  });

  test('sans le Trait : refus', async () => {
    const store = await open([person('f')]);
    assert.equal((await store.enterTraitFrenzy('f')).ok, false);
  });
});

describe('Soin Vampirique (CA16)', () => {
  const vampire = hp => person('v', { hp, maxHp: 10, traits: ['Vampiric'] });
  test('soigne de la valeur saisie sur Morsure et proie admissible, plafonné aux Blessures maximales ; ↶ ↷', async () => {
    const store = await open([vampire(4)]);
    const result = await store.applyVampiricHeal('v', { wounds: 3, viaBite: true, preyAdmissible: true });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(who(store, 'v').hp, 7);
    const capped = await store.applyVampiricHeal('v', { wounds: 20, viaBite: true, preyAdmissible: true });
    assert.equal(capped.ok, true);
    assert.equal(who(store, 'v').hp, 10);
    await store.undo();
    assert.equal(who(store, 'v').hp, 7);
    await store.undo();
    assert.equal(who(store, 'v').hp, 4);
    await store.redo();
    assert.equal(who(store, 'v').hp, 7);
  });

  test('sans Morsure ou sans proie admissible cochée : refus, rien ne change', async () => {
    const store = await open([vampire(4)]);
    assert.equal((await store.applyVampiricHeal('v', { wounds: 3, viaBite: false, preyAdmissible: true })).ok, false);
    assert.equal((await store.applyVampiricHeal('v', { wounds: 3, viaBite: true, preyAdmissible: false })).ok, false);
    assert.equal((await store.applyVampiricHeal('v', { viaBite: true, preyAdmissible: true })).ok, false);
    assert.equal(who(store, 'v').hp, 4);
  });

  test('sans le Trait : refus', async () => {
    const store = await open([person('v', { hp: 4 })]);
    assert.equal((await store.applyVampiricHeal('v', { wounds: 3, viaBite: true, preyAdmissible: true })).ok, false);
  });
});

describe('Se cabrer (CA21)', () => {
  const rider = (extra = {}) => person('h', { traits: ['Size (Large)'], camp: 'pj', ...extra });
  const small = person('p', { traits: ['Size (Small)'], hp: 10 });
  const expectedDamage = () => planNaturalAttack(rider(), 'stomp', { via: 'rear', ordinary: true, actorSize: 4, targetSize: 2 }).damageFormula;

  test('applique les dégâts du Piétinement moins Endurance et armure, sans toucher à l\'Élan ; ↶ ↷', async () => {
    const store = await open([rider({ extensions: { v5: { hasMomentum: true } } }), small]);
    const result = await store.rearUp('h', 'p', { rollLocation: () => 50 });
    assert.equal(result.ok, true, JSON.stringify(result));
    const lost = 10 - who(store, 'p').hp;
    assert.ok(lost > 0 && lost <= Number(expectedDamage()), `${lost} Blessures pour des dégâts de ${expectedDamage()}`);
    assert.equal(who(store, 'h').extensions.v5.hasMomentum, true, 'aucun Élan dépensé');
    assert.match(logs(store), /Se cabrer/);
    await store.undo();
    assert.equal(who(store, 'p').hp, 10);
    await store.redo();
    assert.equal(10 - who(store, 'p').hp, lost);
  });

  test('refusée contre une cible non plus petite', async () => {
    const store = await open([rider(), person('g', { traits: ['Size (Large)'] })]);
    const result = await store.rearUp('h', 'g', { rollLocation: () => 50 });
    assert.equal(result.ok, false);
    assert.match(result.message, /plus petite/);
    assert.equal(who(store, 'g').hp, 10);
  });

  test('coût en déplacement : le quota « system:turn-move » du Tour est consommé ; un second déplacement est refusé', async () => {
    const store = await open([rider(), small], { v5: { combatId: 'c1' } });
    assert.equal((await store.rearUp('h', 'p', { rollLocation: () => 50 })).ok, true);
    const ledger = full(store).extensions.v5.actionLedger;
    const row = ledger.quotaUsage.find(item => item.actorId === 'h' && item.quotaId === 'system:turn-move');
    assert.equal(row?.used, 1);
    const again = await store.rearUp('h', 'p', { rollLocation: () => 50 });
    assert.equal(again.ok, false);
    assert.match(again.message, /déplacement/);
    await store.undo();
    assert.equal(full(store).extensions.v5.actionLedger?.quotaUsage?.some(item => item.quotaId === 'system:turn-move') ?? false, false, '↶ rend le déplacement');
  });
});

describe('Affamé : cadavre frais', () => {
  test('Calme (+2 DR) demandé ; raté : marqueur de tour perdu ; réussi : rien ; ↶ ↷', async () => {
    const store = await open([person('g', { traits: ['Hungry'] })]);
    const asked = await store.markFreshCorpse('g');
    assert.equal(asked.status, 'requires-input');
    assert.equal(asked.requests[0].kind, 'test');
    const ok = await store.markFreshCorpse('g', { inputs: { g: { [asked.requests[0].field]: pass } } });
    assert.equal(ok.ok, true);
    assert.equal(who(store, 'g').extensions.v5.lostTurn, undefined);
    const done = await store.markFreshCorpse('g', { inputs: { g: { [asked.requests[0].field]: fail } } });
    assert.equal(done.ok, true);
    assert.equal(who(store, 'g').extensions.v5.lostTurn.cause, 'hungry');
    assert.match(logs(store), /Affamé/);
    await store.undo();
    assert.equal(who(store, 'g').extensions.v5.lostTurn, undefined);
    await store.redo();
    assert.equal(who(store, 'g').extensions.v5.lostTurn.cause, 'hungry');
  });

  test('constat 5 : le marqueur lit la position par readCombatPosition (scène active comprise)', async () => {
    const rows = [person('g', { traits: ['Hungry'] })];
    const store = createStore({ storage: null });
    await store.ready;
    await store.loadFromJSON({ ...envelope(rows), activeScene: { id: 'scene-1', status: 'active', extensions: { v5: { turnIndex: 4 } } } });
    const asked = await store.markFreshCorpse('g');
    await store.markFreshCorpse('g', { inputs: { g: { [asked.requests[0].field]: fail } } });
    assert.equal(who(store, 'g').extensions.v5.lostTurn.since.turnIndex, readCombatPosition({ ...envelope(rows), activeScene: { id: 'scene-1', status: 'active', extensions: { v5: { turnIndex: 4 } } } }).turnIndex);
    assert.equal(who(store, 'g').extensions.v5.lostTurn.since.turnIndex, 4);
  });

  test('sans le Trait : refus', async () => {
    const store = await open([person('g')]);
    assert.equal((await store.markFreshCorpse('g')).ok, false);
  });
});

describe('Drapeaux de Bestial', () => {
  test('« protège ses petits » et « acculé » s\'écrivent dans extensions.v5.flags ; ↶ ↷', async () => {
    const store = await open([person('b', { traits: ['Bestial'] })]);
    assert.equal((await store.setCreatureFlag('b', 'protectsYoung', true)).ok, true);
    assert.equal(who(store, 'b').extensions.v5.flags.protectsYoung, true);
    assert.equal((await store.setCreatureFlag('b', 'cornered', true)).ok, true);
    assert.equal(who(store, 'b').extensions.v5.flags.cornered, true);
    await store.setCreatureFlag('b', 'cornered', false);
    assert.equal(who(store, 'b').extensions.v5.flags.cornered, false);
    await store.undo();
    assert.equal(who(store, 'b').extensions.v5.flags.cornered, true);
    await store.redo();
    assert.equal(who(store, 'b').extensions.v5.flags.cornered, false);
  });

  test('drapeau inconnu, ou porteur sans Bestial : refus', async () => {
    const store = await open([person('b', { traits: ['Bestial'] }), person('n')]);
    assert.equal((await store.setCreatureFlag('b', 'autre', true)).ok, false);
    assert.equal((await store.setCreatureFlag('n', 'cornered', true)).ok, false);
  });
});

describe('Cause des événements de monture (CA20, câblage)', () => {
  const horse = traits => person('horse', { traits, extensions: { v5: {} } });
  const rider = person('rider', { camp: 'pj', skills: [], extensions: { v5: {} } });
  const skittish = { name: 'Skittish' };
  async function mounted(traits) {
    const store = await open([rider, horse(traits)], { current: 'rider' });
    await store.setMountedState('rider', { mounted: true, mountId: 'horse' });
    return store;
  }

  test('monture surprise par un bruit fort, Craintif et Dressé (Guerre) : aucun Test de Chevaucher demandé', async () => {
    const store = await mounted([skittish, { name: 'Trained', param: 'War' }]);
    const result = await store.acquireConditions('horse', ['Surpris'], { mountedFallCause: 'loud-noise' });
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(who(store, 'rider').extensions.v5.mounted, true, 'le cavalier reste en selle');
  });

  test('autre combinaison, ou sans cause : le Test est demandé comme avant', async () => {
    const store = await mounted([skittish, { name: 'Trained', param: 'War' }]);
    assert.equal((await store.acquireConditions('horse', ['Surpris'], { mountedFallCause: 'magic' })).status, 'requires-input');
    assert.equal((await store.acquireConditions('horse', ['Surpris'])).status, 'requires-input');
  });
});
