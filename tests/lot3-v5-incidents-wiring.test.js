import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { magicTalentRank } from '../js/core/v5-magic-talents.js';
import { isMiscastConditionLocked } from '../js/core/v5-magic-miscasts.js';
import { recoverV5Condition, advanceV5Effects } from '../js/core/v5-effects.js';
import { expireSpellEffects } from '../js/core/v5-magic-effects.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { commitV5Resources } from '../js/core/v5-resources.js';

// Raccordements Lot 3 (incidents) : horloge, verrou unremovable, traits, Chance/Corruption, casting.
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);
const miscast = (store, roll, duration, severity = 'MAJOR') => store.applyMiscast(store.previewMiscast({ severity, roll, secondaryRolls: { duration } }), { actorId: 'mage' });
const cursedState = actor => actor.states.find(s => s.key === 'aveugle' && s.source?.miscastEffectId);

test('L-03/L-04 — horloge unique : le temps écoulé retire l’État, rétablit le talent et le trait', async () => {
  const store = await combat(wizard('mage', { talents: [talent('magical-sense')] }));
  await miscast(store, 38, 2); await miscast(store, 8, 1);
  assert.equal(magicTalentRank(person(store), 'magical-sense'), 0);
  assert.ok(person(store).traits.includes('Distracting'));
  await store.advanceTalentMinutes(60);
  assert.equal(person(store).traits.includes('Distracting'), false);
  assert.ok(cursedState(person(store)), 'Regard maudit : encore 60 minutes');
  await store.advanceTalentMinutes(60);
  assert.equal(cursedState(person(store)), undefined);
  assert.equal(magicTalentRank(person(store), 'magical-sense'), 1);
});

test('L-03 — l’échéance en Rounds suit une avance en minutes (une seule horloge)', async () => {
  const store = await combat(wizard());
  await miscast(store, 38, 2);
  const before = person(store).extensions.v5.miscastEffects[0].expiresAtRound;
  await store.advanceTalentMinutes(30);
  assert.equal(person(store).extensions.v5.miscastEffects[0].expiresAtRound, before - 180);
});

test('L-03 — Regard maudit : ni Fortune, ni récupération, ni retrait automatique d’Aveuglé', async () => {
  const store = await combat(wizard());
  await miscast(store, 38, 2);
  const actor = person(store), state = cursedState(actor);
  assert.equal(isMiscastConditionLocked(actor, state), true);
  for (const options of [{ method: 'fortune' }, { method: 'cause-ended', causeEnded: true }, { method: 'medical-attention', medicalAttention: true }]) {
    assert.ok(cursedState(recoverV5Condition(actor, state.id, options).participant), options.method);
  }
  const advanced = advanceV5Effects(actor, { phase: 'endOfTurn', round: 2, actorId: 'mage' });
  assert.ok(cursedState(advanced.participant));
});

test('L-03 — Regard maudit : retrait manuel refusé par le Store, y compris par modification brute de states', async () => {
  const store = await combat(wizard());
  await miscast(store, 38, 2);
  const actor = person(store), state = cursedState(actor);
  await assert.rejects(async () => store.updateParticipant('mage', { states: actor.states.filter(s => s.id !== state.id) }), /Regard|incident|retir/i);
  assert.ok(cursedState(person(store)));
  await store.updateParticipant('mage', { hp: 20 });
  assert.equal(person(store).hp, 20);
});

test('L-04 — l’expiration d’un sort portant le même trait laisse Puanteur infernale active', async () => {
  const store = await combat(wizard());
  await miscast(store, 8, 1);
  const actor = structuredClone(person(store));
  actor.extensions.v5.spellEffects = [{ id: 'spell-trait', spellId: 'x', spellName: 'X', traits: ['Distracting'] }];
  const after = expireSpellEffects(actor, { effectId: 'spell-trait' }).participant;
  assert.ok(after.traits.includes('Distracting'));
  assert.ok(after.extensions.v5.temporaryTraits.includes('Distracting'));
});

test('L-10 — incantation : l’unique inversion forcée remplace un ancien choix keep', async () => {
  const store = await combat(wizard());
  const p = store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 19, choice: 'keep', disadvantageSources: [{ id: 'fixture' }] });
  assert.equal(p.test.roll, 91); assert.equal(p.test.optionId, 'reverse');
});

test('L-11 — Store.previewMiscast utilise l’acteur du Store, pas un acteur fourni par l’appelant', async () => {
  const bare = wizard();
  const store = await combat(bare);
  const forged = { ...bare, talents: [talent('instinctive-diction'), talent('aethyric-attunement')] };
  const input = { actorId: 'mage', severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 2, participant: forged };
  assert.equal(store.previewMiscast(input).cancelled, false, 'talents du client ignorés');
  await store.updateParticipant('mage', { talents: forged.talents });
  assert.equal(store.previewMiscast({ ...input, participant: bare }).ready, false, 'talents du Store pris en compte : second jet requis');
});

// L-05 — V5 p. 239, Clairvoyance chaotique : 1 Corruption par Point de Chance dépensé, par identité canonique.
const pc = (id, extra = {}) => ({ id, name: id, kind: 'PJ', extensions: { ficheId: 'c1', v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 1, ...extra } } });
const envelope = (participants, fortune = 5) => ({ reserve: [], persistentCharacters: [], combat: { participants },
  extensions: { v5: { characterResources: [{ characterId: 'fiche:c1', fortune, initializedFrom: 'mj' }] } } });
const withFortune = (participant, value) => ({ ...participant, extensions: { ...participant.extensions, v5: { ...participant.extensions.v5, resources: { fortune: value } } } });
const corruption = participant => participant.extensions.v5.corruptionPoints;

test('L-05 — dépense de 2 Points de Chance : +2 Corruption', () => {
  const mage = pc('a'), env = envelope([mage]);
  const paid = commitV5Resources(env, [withFortune(mage, 3)]);
  assert.equal(corruption(paid.combat.participants[0]), 3);
  assert.equal(paid.extensions.v5.characterResources[0].fortune, 3);
});

test('L-05 — la Chance temporaire dépensée compte aussi', () => {
  const mage = pc('a', { spellEffects: [{ id: 'e', remainingTempFortune: 2 }] }), env = envelope([mage], 3);
  const paid = commitV5Resources(env, [withFortune(mage, 3)]);
  assert.equal(corruption(paid.combat.participants[0]), 3);
});

test('L-05 — plusieurs projections du même personnage : un seul crédit, reflété sur chacune', () => {
  const first = pc('a'), second = pc('b', { corruptionPerFortuneSpent: undefined });
  const env = envelope([first, second]);
  const paid = commitV5Resources(env, [withFortune(first, 3), withFortune(second, 3)]);
  assert.deepEqual(paid.combat.participants.map(corruption), [3, 3]);
});

test('L-05 — aucun crédit pour une initialisation, une augmentation ou sans Clairvoyance', () => {
  const mage = pc('a'), env = envelope([mage]);
  assert.equal(corruption(commitV5Resources(env, [withFortune(mage, 8)]).combat.participants[0]), 1);
  assert.equal(corruption(commitV5Resources({ ...env, extensions: { v5: { characterResources: [] } } }, [withFortune(mage, 4)]).combat.participants[0]), 1);
  const plain = pc('a', { corruptionPerFortuneSpent: undefined });
  assert.equal(corruption(commitV5Resources(envelope([plain]), [withFortune(plain, 3)]).combat.participants[0]), 1);
});

test('L-05 — dépense par le Store (Fortune de récupération) créditée et annulée par Undo', async () => {
  const store = await combat(wizard('mage', { kind: 'PJ', states: [{ name: 'Brisé' }], extensions: { v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 0 } } }));
  await store.setFortune('mage', 2);
  const state = person(store).states[0];
  await store.recoverCondition('mage', state.id, { method: 'fortune' });
  assert.equal(store.getFortune('mage').balance, 1);
  assert.equal(corruption(person(store)), 1);
  await store.undo();
  assert.equal(corruption(person(store)), 0);
});

test('L-05 — Chance temporaire consommée par le Store : Corruption créditée', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 0,
    spellEffects: [{ id: 'e', spellId: 's', remainingTempFortune: 2 }] } } }));
  await store.consumeTemporaryFortune('mage', 2);
  assert.equal(corruption(person(store)), 2);
});

test('L-05 — V5 p. 239 : la nouvelle séance lève Clairvoyance chaotique', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { corruptionPerFortuneSpent: 1 } } }));
  await store.startTalentSession();
  assert.equal(person(store).extensions.v5.corruptionPerFortuneSpent, undefined);
});

test('L-07 — incantation critique, incident 91-95 : jets supplémentaires nommés puis appliqués par l’exécution du sort', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } } }), wizard('enemy', { camp: 'ennemi' }));
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 11, miscastRoll: 93, attributeActive: false };
  const missing = store.previewSpellExecution('Carreau', input);
  assert.equal(missing.ready, false);
  assert.match(missing.error, /jet supplémentaire n° 1.*jet supplémentaire n° 2/);
  const full = { ...input, secondaryRolls: { additionalRolls: [50, 85], additionalSecondaryRolls: [{ duration: 2 }, { duration: 4 }] } };
  const p = store.previewSpellExecution('Carreau', full);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.miscast.details.results.length, 2);
  await store.applySpellExecution('Carreau', full);
  await store.undo();
  assert.deepEqual(person(store).states, []);
});
