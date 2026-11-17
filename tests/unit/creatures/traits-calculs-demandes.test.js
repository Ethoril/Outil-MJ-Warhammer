import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { traitRequest, resolveTraitAnswer, collectRoundTraitEffects, applyTraitPatches, markLostTurn, liftLostTurn, momentumCount } from '../../../js/core/trait-effects.js';
import { previewV5Test } from '../../../js/core/v5-roll.js';

const person = (id, extra = {}) => ({ id, name: id.toUpperCase(), camp: 'monstres', zone: 'active', hp: 10, maxHp: 10, caracs: { E: 40, Int: 30, FM: 40 }, traits: [], extensions: { v5: {} }, ...extra });
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };

describe('demande de dé uniforme (CA0)', () => {
  test('la demande porte champ, genre, participant et libellé ; le libellé d\'un d10 nomme le dé', () => {
    const d10 = traitRequest({ key: 'corrosiveBlood', kind: 'd10', participantId: 'a', label: 'Sang corrosif' });
    assert.equal(d10.field, 'corrosiveBlood');
    assert.equal(d10.kind, 'd10');
    assert.equal(d10.participantId, 'a');
    assert.match(d10.label, /d10/);
    const named = traitRequest({ key: 'x', kind: 'd10', participantId: 'a', label: 'Dégâts : d10 de dégâts' });
    assert.equal(named.label, 'Dégâts : d10 de dégâts');
    const choice = traitRequest({ key: 'g', kind: 'choice', participantId: 'a', label: 'Guidé ?' });
    assert.equal(choice.label, 'Guidé ?');
    assert.equal('testTarget' in choice, false);
  });

  test('d10 : valeur tirée ou valeur saisie, même réponse ; hors bornes refusé', () => {
    const request = traitRequest({ key: 'k', kind: 'd10', participantId: 'a', label: 'x' });
    assert.deepEqual(resolveTraitAnswer(request, 7), resolveTraitAnswer(request, { value: 7 }));
    assert.equal(resolveTraitAnswer(request, 0), null);
    assert.equal(resolveTraitAnswer(request, 11), null);
    assert.equal(resolveTraitAnswer(request, undefined), null);
  });

  test('Test : le d100 tiré et le résultat saisi donnent la même réponse', () => {
    const testTarget = { score: 50, slModifiers: [{ id: 'trait-dr', label: 'DR du Trait', amount: 4 }], advantageSources: [], disadvantageSources: [] };
    const request = traitRequest({ key: 'k', kind: 'test', participantId: 'a', label: 'x', testTarget });
    for (const roll of [12, 47, 73, 91]) {
      const direct = previewV5Test({ score: 50, roll, slModifiers: testTarget.slModifiers }).options[0].result;
      assert.deepEqual(resolveTraitAnswer(request, roll), resolveTraitAnswer(request, { success: direct.success, sl: direct.sl }), `jet ${roll}`);
    }
    assert.equal(resolveTraitAnswer(request, 12).success, true);
    assert.equal(resolveTraitAnswer(request, 91).success, false);
    assert.equal(resolveTraitAnswer(traitRequest({ key: 'k', kind: 'test', participantId: 'a', label: 'x' }), 12), null, 'sans testTarget, un d100 ne se déduit pas');
  });

  test('un Test d\'une demande du moteur : jet ou résultat saisi donnent le même patch (Stupide)', () => {
    const stupid = person('s', { traits: ['Stupid'], caracs: { E: 40, Int: 30 } });
    const round = inputs => collectRoundTraitEffects({ participants: [stupid], phase: 'startOfRound', round: 2, turnIndex: 5, inputs });
    const asked = round({});
    assert.equal(asked.requests.length, 1);
    const request = asked.requests[0];
    assert.equal(request.kind, 'test');
    assert.ok(request.testTarget);
    const byRoll = round({ s: { [request.field]: 90 } });
    const answer = resolveTraitAnswer(request, 90);
    const byResult = round({ s: { [request.field]: { success: answer.success, sl: answer.sl } } });
    assert.deepEqual(byRoll.patches, byResult.patches);
    assert.equal(byRoll.patches[0].type, 'lost-turn');
  });
});

describe('marqueur « tour perdu » et patches', () => {
  test('markLostTurn et liftLostTurn : levée au Tour suivant seulement', () => {
    const base = deepFreeze(person('a'));
    const marked = markLostTurn(base, { cause: 'hungry', sourceId: 'v', since: { round: 1, turnIndex: 3 } });
    assert.deepEqual(marked.extensions.v5.lostTurn, { cause: 'hungry', sourceId: 'v', since: { round: 1, turnIndex: 3 } });
    assert.equal(base.extensions.v5.lostTurn, undefined);
    assert.ok(liftLostTurn(marked, { turnIndex: 3 }).extensions.v5.lostTurn, 'pas levé le Tour de la pose');
    assert.equal(liftLostTurn(marked, { turnIndex: 4 }).extensions.v5.lostTurn, undefined);
  });

  test('la fin du Tour du porteur lève le marqueur ; celle d\'un autre non', () => {
    const marked = markLostTurn(person('a'), { cause: 'stupid', since: { round: 2, turnIndex: 4 } });
    const other = person('b');
    const lifted = collectRoundTraitEffects({ participants: [marked, other], phase: 'endOfTurn', round: 2, turnIndex: 5, actorId: 'a' });
    assert.deepEqual(lifted.patches.map(patch => patch.type), ['lift-lost-turn']);
    assert.equal(applyTraitPatches([marked, other], lifted.patches)[0].extensions.v5.lostTurn, undefined);
    const none = collectRoundTraitEffects({ participants: [marked, other], phase: 'endOfTurn', round: 2, turnIndex: 5, actorId: 'b' });
    assert.deepEqual(none.patches, []);
    const same = collectRoundTraitEffects({ participants: [marked, other], phase: 'endOfTurn', round: 2, turnIndex: 4, actorId: 'a' });
    assert.deepEqual(same.patches, [], 'jamais le Tour où il a été posé');
  });

  test('applyTraitPatches : entrées gelées intactes, sortie neuve', () => {
    const participants = deepFreeze([person('a'), person('b')]);
    const out = applyTraitPatches(participants, [{ type: 'wounds', participantId: 'a', amount: 3 }, { type: 'lost-turn', participantId: 'b', cause: 'stupid', since: { round: 1, turnIndex: 0 } }]);
    assert.equal(out[0].hp, 7);
    assert.equal(participants[0].hp, 10);
    assert.ok(out[1].extensions.v5.lostTurn);
    assert.notEqual(out[0], participants[0]);
    assert.equal(applyTraitPatches(participants, [{ type: 'wounds', participantId: 'a', amount: 99 }])[0].hp, 0);
  });

  test('momentumCount : booléen du moteur lu comme 0 ou 1', () => {
    assert.equal(momentumCount(person('a')), 0);
    assert.equal(momentumCount(person('a', { extensions: { v5: { hasMomentum: true } } })), 1);
    assert.equal(momentumCount(null), 0);
  });
});
