// Lot L3 du second chantier des Traits : les effets de Traits branchés à la résolution (aperçu puis commit d'un seul ↶).
// À la blessure (Sang corrosif, Infecté, Bestial, Affamé), Parasité, Bestial en défense, Champion, Rage, Bouclier (n).
// CA1, CA2, CA3, CA4, CA5, CA10, CA11, CA12, CA15, CA24, CA25 ; D1, D13, D14, D19.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { sourceActive } from '../../../js/core/v5-talent-actions.js';

const subject = (id, extra = {}) => ({ id, name: id.toUpperCase(), kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40, FM: 40, Soc: 40, Int: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function open(participants, current = 'a') {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'traits-l3', turnIndex: 1 } },
    combat: { round: 1, currentActorId: current, order: participants.map(row => row.id), participants } });
  return store;
}
const who = (store, id) => store.listParticipants().find(row => row.id === id);
const logs = store => JSON.parse(store.getFullJSON()).log;

// Mêlée de A contre B : A touche (25 contre 60), B rate sa défense (80 contre 30).
const melee = (id, { actorId = 'a', targetId = 'b', traitInputs, defense = {}, roll = 25, ...extra } = {}) => ({ resolutionId: id, actorId, targetId,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll,
  defense: { base: 30, roll: 80, damage: 5, v5: { kind: 'melee' }, ...defense },
  v5: { kind: 'melee', context: traitInputs ? { traitInputs } : {} }, ...extra });
const dodge = { label: 'Esquive', attr: 'Ag', v5: { kind: 'test' } };

describe('Sang corrosif à la résolution (CA1, D14, D19, CA25)', () => {
  const carrier = () => subject('b', { traits: ['Corrosive Blood'], extensions: { v5: { engagements: { e: { since: 1, lastAttackRound: 1 } } } } });
  const other = () => subject('e', { camp: 'pj', extensions: { v5: { engagements: { b: { since: 1, lastAttackRound: 1 } } } } });

  test('une demande de d10 bloque le commit ; répondue, chaque engagé (attaquant compris) perd d10 − BE − PA ; ↶ puis ↷', async () => {
    const store = await open([subject('a'), carrier(), other()]);
    const asked = store.previewResolution(melee('cor-1'));
    assert.equal(asked.hit, true);
    const request = asked.traitPlans.requests.find(row => row.field === 'corrosiveBlood');
    assert.ok(request, JSON.stringify(asked.traitPlans));
    assert.equal(request.kind, 'd10');
    assert.equal(request.participantId, 'b');
    assert.ok(asked.needsInput.some(row => row.field === 'corrosiveBlood'));
    assert.notEqual((await store.applyResolution(asked)).status, 'applied', 'pas de commit sans le d10');

    const answered = store.previewResolution(melee('cor-1', { traitInputs: { b: { corrosiveBlood: 8 } } }));
    assert.deepEqual(answered.traitPlans.requests, []);
    const hits = Object.fromEntries(answered.traitPlans.plans.find(plan => plan.key === 'corrosive').hits.map(hit => [hit.id, hit.amount]));
    assert.deepEqual(hits, { a: 5, e: 5 }, '8 − BE 3 − PA 0, pour l\'attaquant engagé par sa mêlée comme pour l\'engagé du plateau');
    const hpB = who(store, 'b').hp;
    assert.equal((await store.applyResolution(answered)).status, 'applied');
    assert.equal(who(store, 'a').hp, 35);
    assert.equal(who(store, 'e').hp, 35);
    assert.ok(who(store, 'b').hp < hpB, 'le coup lui-même est appliqué dans la même commande');
    assert.ok(logs(store).some(row => /Sang corrosif/.test(row.text)), 'ligne de journal');
    await store.undo();
    assert.equal(who(store, 'a').hp, 40);
    assert.equal(who(store, 'e').hp, 40);
    assert.equal(who(store, 'b').hp, hpB, 'un seul ↶ rétablit le coup et le Sang corrosif');
    await store.redo();
    assert.equal(who(store, 'a').hp, 35);
    assert.equal(who(store, 'e').hp, 35);
  });
});

describe('Infecté, Bestial, Affamé à la résolution (CA2, CA4, CA5)', () => {
  test('Infecté : Test d\'Endurance +4 DR demandé à la victime vivante ; échec : ligne « Plaie purulente », aucun état', async () => {
    const store = await open([subject('a', { traits: ['Infected'] }), subject('b')]);
    const asked = store.previewResolution(melee('inf-1'));
    const request = asked.traitPlans.requests.find(row => row.field === 'infectedEndurance');
    assert.equal(request.participantId, 'b');
    assert.equal(request.kind, 'test');
    const done = store.previewResolution(melee('inf-1', { traitInputs: { b: { infectedEndurance: { success: false, sl: -1 } } } }));
    const states = who(store, 'b').states.length;
    assert.equal((await store.applyResolution(done)).status, 'applied');
    assert.ok(logs(store).some(row => /Plaie purulente/.test(row.text)));
    assert.equal(who(store, 'b').states.length, states, 'aucun état ajouté');
  });

  test('Infecté contre un Mort-vivant : aucune demande', () => {
    const preview = previewResolution(melee('inf-2', { actor: subject('a', { traits: ['Infected'] }), target: subject('b', { traits: ['Undead'] }) }));
    assert.equal(preview.hit, true);
    assert.deepEqual(preview.traitPlans?.requests || [], []);
  });

  test('Bestial qui passe sous la moitié de ses Blessures : ligne « fuite » au commit', async () => {
    const store = await open([subject('a'), subject('b', { hp: 22, traits: ['Bestial'] })]);
    const preview = store.previewResolution(melee('bes-1', { defense: dodge }));
    assert.equal(preview.hit, true);
    assert.ok(preview.traitPlans.plans.some(plan => plan.key === 'bestial' && plan.reaction === 'flee'), JSON.stringify(preview.traitPlans));
    assert.equal((await store.applyResolution(preview)).status, 'applied');
    assert.ok(logs(store).some(row => /Bestial/.test(row.text) && /fuite/.test(row.text)));
  });

  test('Affamé qui met un vivant à 0 Blessure : Test de Calme +2 DR ; échec : tour perdu', async () => {
    const store = await open([subject('a', { traits: ['Hungry'] }), subject('b', { hp: 11 })]);
    const asked = store.previewResolution(melee('hun-1'));
    const request = asked.traitPlans.requests.find(row => row.field === 'hungryCalm');
    assert.equal(request.participantId, 'a');
    const done = store.previewResolution(melee('hun-1', { traitInputs: { a: { hungryCalm: { success: false, sl: -2 } } } }));
    assert.equal((await store.applyResolution(done)).status, 'applied');
    assert.equal(who(store, 'a').extensions.v5.lostTurn.cause, 'hungry');
    await store.undo();
    assert.equal(who(store, 'a').extensions.v5.lostTurn, undefined);
  });
});

describe('Parasité et Bestial en défense (CA3, CA10)', () => {
  test('Parasité : −1 DR sur l\'attaque de mêlée contre le porteur ; un tir, rien', () => {
    const target = subject('b', { traits: ['Infestation'] });
    const hit = previewResolution(melee('par-1', { actor: subject('a'), target }));
    assert.ok(hit.test.details.modifiers.some(row => row.id === 'trait:infestation' && row.amount === -1), JSON.stringify(hit.test.details.modifiers));
    const shot = previewResolution({ actor: subject('a'), target, roll: 25, action: { type: 'attack', base: 60, attr: 'CT', damage: 5 }, v5: { kind: 'ranged' } });
    assert.equal(shot.test.details.modifiers.some(row => row.id === 'trait:infestation'), false);
  });

  test('Bestial : le plan de défense ne propose que l\'Esquive ; une défense de Corps à corps est refusée', () => {
    const target = subject('b', { traits: ['Bestial'] });
    const parried = previewResolution(melee('bes-2', { actor: subject('a'), target, defense: { label: 'Corps à corps (Base)', attr: 'CC' } }));
    assert.deepEqual(parried.defensePlan.allowed, ['Esquive']);
    assert.ok(parried.unresolved.some(row => /Bestial/.test(row) && /Esquive/.test(row)), JSON.stringify(parried.unresolved));
    const dodged = previewResolution(melee('bes-3', { actor: subject('a'), target, defense: dodge }));
    assert.equal(dodged.unresolved.some(row => /Bestial/.test(row)), false);
  });

  test('Bestial : une défense en valeur libre du MJ (ni compétence ni Caractéristique, ou « Autre ») n’est pas refusée', () => {
    const target = subject('b', { traits: ['Bestial'] });
    for (const defense of [{}, { label: 'Autre' }]) {
      const free = previewResolution(melee('bes-4', { actor: subject('a'), target, defense }));
      assert.deepEqual(free.defensePlan.allowed, ['Esquive']);
      assert.equal(free.defensePlan.refused, undefined);
      assert.equal(free.unresolved.some(row => /Bestial/.test(row)), false, JSON.stringify(free.unresolved));
    }
  });
});

describe('Champion (CA11)', () => {
  // A rate (80 contre 60), B réussit sa défense de mêlée (24 contre 60) : B gagne l'opposition.
  const lost = id => melee(id, { roll: 80, defense: { base: 60, roll: 24 } });

  test('opposition de mêlée défensive gagnée : dégâts de riposte, deux fois dans le même Round, sans quota de Riposte', async () => {
    const store = await open([subject('a'), subject('b', { traits: ['Champion'] })]);
    const first = store.previewResolution(lost('cha-1'));
    assert.equal(first.hit, false);
    assert.ok(first.defenderDamage, 'riposte de Champion calculée');
    assert.equal(first.riposteUsed, null, 'le quota de Riposte du Talent n\'est pas consommé');
    assert.equal((await store.applyResolution(first)).status, 'applied');
    const hpA = who(store, 'a').hp;
    assert.ok(hpA < 40);
    const second = store.previewResolution(lost('cha-2'));
    assert.ok(second.defenderDamage, 'seconde riposte dans le même Round');
    assert.equal((await store.applyResolution(second)).status, 'applied');
    assert.ok(who(store, 'a').hp < hpA);
  });

  test('opposition perdue : aucun dégât', () => {
    const preview = previewResolution(melee('cha-3', { actor: subject('a'), target: subject('b', { traits: ['Champion'] }) }));
    assert.equal(preview.hit, true);
    assert.equal(preview.defenderDamage, null);
  });
});

describe('Rage (CA15, CA25)', () => {
  test('le porteur qui gagne l\'Élan reçoit la Frénésie et perd l\'Élan ; ↶ rétablit les deux, ↷ rejoue', async () => {
    const store = await open([subject('a', { traits: ['Fury'] }), subject('b')]);
    const preview = store.previewResolution(melee('rag-1'));
    const change = preview.momentum.find(row => row.participantId === 'a');
    assert.equal(change.before, false);
    assert.equal(change.after, false, 'l\'Élan gagné est aussitôt perdu');
    assert.equal((await store.applyResolution(preview)).status, 'applied');
    const raged = who(store, 'a');
    const frenzy = raged.states.find(row => row.key === 'frenzy');
    assert.ok(frenzy, 'état Frénésie posé');
    assert.ok(sourceActive(frenzy), 'Frénésie lue par le moteur (+1 dégât, attaque gratuite)');
    assert.notEqual(raged.extensions.v5.hasMomentum, true);
    await store.undo();
    assert.equal(who(store, 'a').states.some(row => row.key === 'frenzy'), false);
    await store.redo();
    assert.ok(who(store, 'a').states.some(row => row.key === 'frenzy'));
  });

  test('sans Rage, l\'Élan gagné est gardé', () => {
    const preview = previewResolution(melee('rag-2', { actor: subject('a'), target: subject('b') }));
    assert.equal(preview.momentum.find(row => row.participantId === 'a').after, true);
  });
});

describe('Bouclier (n) (CA12)', () => {
  test('bouclier virtuel : n PA sur la zone touchée et +1 DR à l\'opposition par Mêlée ou Esquive', () => {
    const preview = previewResolution(melee('shi-1', { actor: subject('a'), target: subject('b', { traits: ['Shield (2)'] }) }));
    assert.equal(preview.hit, true);
    assert.equal(preview.protection.ap, 2);
    assert.ok(preview.defenderTest.details.modifiers.some(row => row.id === 'trait:shield' && row.amount === 1), JSON.stringify(preview.defenderTest.details.modifiers));
    const dodged = previewResolution(melee('shi-2', { actor: subject('a'), target: subject('b', { traits: ['Shield (2)'] }), defense: dodge }));
    assert.ok(dodged.defenderTest.details.modifiers.some(row => row.id === 'trait:shield'));
  });

  test('profil L22 « Shield 2* » : rappel seul', () => {
    const preview = previewResolution(melee('shi-3', { actor: subject('a'), target: subject('b', { traits: ['Shield 2*'] }) }));
    assert.equal(preview.protection.ap, 0);
    assert.equal(preview.defenderTest.details.modifiers.some(row => row.id === 'trait:shield'), false);
    assert.ok(preview.reminders.some(row => /Bouclier/.test(row) && /dos/.test(row)), JSON.stringify(preview.reminders));
  });
});

describe('Sans ces Traits, rien ne change (CA24)', () => {
  test('aucun plan de Trait, aucun modificateur de Trait, aucune demande', () => {
    const preview = previewResolution(melee('none-1', { actor: subject('a'), target: subject('b') }));
    assert.equal(preview.traitPlans, undefined);
    assert.equal(preview.needsInput, undefined);
    assert.equal(preview.defensePlan, undefined);
    assert.equal(preview.championRiposte, undefined);
    assert.equal(preview.test.details.modifiers.some(row => row.id.startsWith('trait:')), false);
    assert.equal(preview.defenderTest.details.modifiers.some(row => row.id.startsWith('trait:')), false);
  });
});
