import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract, validateSpellTargets } from '../js/core/v5-spell-contracts.js';

// Lot v3-C : talents, magie et créatures du livre de base V5 EN v3.

test('v3 Souffle (p.243) : le lanceur est immunisé à son propre Souffle, il ne peut pas être touché', () => {
  const contract = getSpellContract('Souffle');
  const caster = { id: 'mage', camp: 'pj' }, foe = { id: 'foe', camp: 'ennemi' };
  assert.equal(validateSpellTargets(contract, caster, [foe]).valid, true);
  const own = validateSpellTargets(contract, caster, [foe, caster]);
  assert.equal(own.valid, false);
  assert.equal(own.status, 'invalid-target-admissibility');
});

test('v3 Diction instinctive et Harmonie aethyrique (p.121, p.114) : refusées après un Test raté, appliquées après une réussite', async () => {
  const { resolveMiscast } = await import('../js/core/v5-magic-miscasts.js');
  const failed = resolveMiscast({ severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 1, testSucceeded: false });
  assert.equal(failed.cancelled, false, 'le jet 15 n’est pas réduit de 20 après un Test raté');
  assert.equal(failed.modifier, 0);
  assert.notEqual(failed.choicesRequired, 'attunement', 'pas de second jet après un Test raté');
  const succeeded = resolveMiscast({ severity: 'MINOR', roll: 15, instinctiveDiction: true, testSucceeded: true });
  assert.equal(succeeded.cancelled, true, 'après une réussite, 15 − 20 ≤ 0 : aucun incident');
  const attuned = resolveMiscast({ severity: 'MINOR', roll: 15, attunementRank: 1, testSucceeded: true });
  assert.equal(attuned.choicesRequired, 'attunement', 'après une réussite, second jet demandé');
});

test('v3 Diction instinctive : l’incident d’une maladresse de lancement n’est pas réduit, celui d’un critique réussi l’est', async () => {
  const { previewCasting } = await import('../js/core/v5-magic-casting.js');
  const { previewChannelling } = await import('../js/core/v5-magic-channelling.js');
  const talent = id => ({ id: 'talent-' + id, status: 'resolved', rank: 1 });
  const mage = { id: 'm', name: 'm', caracs: { Int: 50, FM: 50, I: 40, Ag: 40 }, skills: [{ name: 'Langue (Magick)', total: 30 }, { name: 'Focalisation', total: 30 }],
    talents: [talent('instinctive-diction')], states: [], extensions: { v5: { channelling: { type: 'winds', sl: 2 } } } };
  const spell = getSpellContract('Carreau');
  const fumble = previewCasting(mage, spell, { roll: 99, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(fumble.miscast?.cancelled ?? false, false, 'maladresse (Test raté) : jet 15 conservé');
  assert.equal(fumble.miscast?.modifier, 0);
  const critical = previewCasting({ ...mage, skills: [{ name: 'Langue (Magick)', total: 80 }] }, spell, { roll: 11, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(critical.miscast, null, 'critique réussi : 15 − 20 ≤ 0, aucun incident');
  const loss = previewChannelling(mage, { type: 'winds', roll: 99, lossRoll: 1, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(loss.miscast?.modifier, 10, 'Focalisation ratée : seul le +10 par DR perdu s’applique, pas −20');
});

test('v3 Pause de Focalisation (p.236) : Test de Focalisation Accessible (+2 DR), plus de Résistance', async () => {
  const { previewChannellingPause } = await import('../js/core/v5-magic-channelling.js');
  const mage = { id: 'm', name: 'm', caracs: { Int: 54, FM: 52, E: 38 }, equipment: [], states: [],
    skills: [{ name: 'Focalisation', total: 70 }, { name: 'Focalisation (Haute Magie)', total: 30 }, { name: 'Résistance', total: 30 }],
    extensions: { v5: { channelling: { type: 'winds', sl: 6 } } } };
  const winds = previewChannellingPause(mage, { roll: 60 });
  assert.equal(winds.score, 70, 'la Focalisation remplace la Résistance');
  assert.equal(winds.success, true);
  assert.equal(winds.test.sl, 3, 'Accessible : +2 DR sur 7 − 6 = 1');
  const high = previewChannellingPause({ ...mage, extensions: { v5: { channelling: { type: 'high', sl: 6 } } } }, { roll: 60 });
  assert.equal(high.score, 30, 'réserve de Haute Magie : Focalisation (Haute Magie)');
  assert.equal(high.success, false);
  const sea = previewChannellingPause({ ...mage, profileId: 'E0-P-909', skills: [], caracs: { F: 60, FM: 10 } }, { roll: 99 });
  assert.equal(sea.ready, true);
  assert.equal(sea.score, 70, 'élémentaire de mer : sans compétence imprimée, Force + 10 (comme la Focalisation)');
});

test('v3 attribut des Bêtes (p.245) : le lanceur gagne l’Élan, les ennemis vivants perdent le leur (alliés, morts-vivants et Peur exclus)', async () => {
  const { createStore } = await import('../js/core/store.js');
  const person = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, hp: 20, maxHp: 20, zone: 'active', init: 40, caracs: { CC: 40, F: 30, E: 30, FM: 50, Int: 40, I: 40, Ag: 40 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true } }, ...extra });
  const store = createStore(); await store.ready;
  const people = [person('mage', 'pj', { extensions: { v5: { hasMomentum: false } } }), person('ally', 'pj'), person('orc', 'ennemi'), person('zombie', 'ennemi', { tags: ['Mort-vivant'] })];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  const preview = store.previewLoreAttribute({ casterId: 'mage', lore: 'beasts', spell: { cn: 6 } });
  await store.applyLoreAttribute(preview, { casterId: 'mage', cn: 6 });
  const has = id => store.listParticipants().find(p => p.id === id).extensions.v5.hasMomentum;
  assert.equal(has('mage'), true, 'le lanceur gagne l’Élan');
  assert.equal(has('orc'), false, 'l’ennemi vivant perd l’Élan');
  assert.equal(has('ally'), true, 'un allié le garde');
  assert.equal(has('zombie'), true, 'un ennemi non vivant n’est pas touché');
  assert.ok(!(store.listParticipants().find(p => p.id === 'mage').traits || []).includes('Peur (1)'), 'plus de Peur (1)');
});

test('v3 Trait Grim (p.358) : l’attaque gratuite ne fait pas perdre l’Élan mais en exige un ; Trait non retenu refusé', async () => {
  const { createStore } = await import('../js/core/store.js');
  const person = (id, extra = {}) => ({ id, name: id, kind: id === 'a' ? 'PJ' : 'PNJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40, init: 40,
    caracs: { CC: 60, CT: 40, F: 40, E: 40, Ag: 40, I: 40, Int: 40, FM: 40, Dex: 40, Soc: 40, M: 4 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true } }, ...extra });
  const run = async (traits, momentum) => {
    const store = createStore({ storage: null }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3c-grim', turnIndex: 1 } },
      combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [person('a', { traits, extensions: { v5: { hasMomentum: momentum } } }), person('b')] } });
    const input = { resolutionId: 'grim-free', actorId: 'a', targetId: 'b', roll: 25, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
      defense: { base: 35, roll: 80, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', extraAttack: true, context: { freeAttackTalent: 'grim' } } };
    return { store, input };
  };
  const withGrim = await run(['Grim'], true);
  const ok = withGrim.store.previewResolution(withGrim.input);
  assert.equal(ok.actionCosts.ready, true);
  assert.equal(ok.actionCosts.paid.length, 0, 'aucun Élan dépensé');
  assert.equal(ok.actionCosts.waived.length, 1);
  const noMomentum = await run(['Grim'], false);
  assert.equal(noMomentum.store.previewResolution(noMomentum.input).actionCosts.ready, false, 'sans Élan, pas d’attaque gratuite');
  const notRetained = await run([], true);
  assert.throws(() => notRetained.store.previewResolution(notRetained.input), /Grim/);
});
