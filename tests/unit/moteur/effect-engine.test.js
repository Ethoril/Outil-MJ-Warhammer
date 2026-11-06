// U8 lot L2 : moteur d'effets unifié pur (js/core/effect-engine.js), docs/specs/moteur-effets-unifie/.
// Règles citées : R1 et R2 V5 p. 130, R3 V5 p. 235 (sorts : meilleur bonus, pire pénalité), arbitrages du MJ Q2-Q4 (05/11)
// et prières entre elles (06/11) ; Bénédiction de Lileath HEPG p. 83 (D-06).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEARER_KINDS, BETWEEN_GROUPS, STACK_POLICIES, applyStackPolicy, betweenGroupsRule, combineEffects, mergeProposals,
  normalizeTestTarget, targetAppliesToTest, validateBearer, validateEffectClause,
} from '../../../js/core/effect-engine.js';

const bearer = (kind, sourceId, extra = {}) => ({ kind, sourceId, ...extra });
const sl = (amount, stack, extra = {}) => ({ op: 'modifySL', amount, stack, stackGroup: 'sl', ...extra });
const spell = (layerId, target, amount) => ({ bearer: bearer('spell', 'spell-' + layerId, { layerId }), effect: sl(amount, 'bestBonusWorstPenalty', { target }) });
const prayer = (layerId, target, amount) => ({ bearer: bearer('prayer', 'prayer-' + layerId, { layerId }), effect: sl(amount, 'bestBonusWorstPenalty', { target }) });
const resistance = { skill: 'Résistance', carac: 'E' };

// ---- Porteur et validation (CA9) ----
test('porteur : familles connues, champ inconnu et famille inconnue nommés', () => {
  assert.equal(validateBearer(bearer('spell', 's', { layerId: 'l', casterId: 'c' })), true);
  assert.deepEqual([...BEARER_KINDS].sort(), ['condition','gm','mount','prayer','quality','situation','spell','talent','trait']);
  assert.throws(() => validateBearer(bearer('rumeur', 's')), error => error.field === 'bearer.kind' && /rumeur/.test(error.message));
  assert.throws(() => validateBearer(bearer('spell', 's', { couleur: 'rouge' })), error => error.field === 'bearer.couleur' && /couleur/.test(error.message));
  assert.throws(() => validateBearer({ kind: 'spell' }), error => error.field === 'bearer.sourceId');
});

test('CA9 clause commune : une brique inconnue ou un champ mal formé est refusé en nommant l\'élément et le champ', () => {
  const clause = (patch = {}) => ({ id: 'supplement-x', event: 'test.beforeRoll', role: 'actor', when: [], effects: [sl(1, 'add')], bearer: bearer('talent', 'talent-x'), ...patch });
  assert.equal(validateEffectClause(clause()), true);
  assert.throws(() => validateEffectClause(clause({ effects: [{ op: 'teleport', stack: 'unique', stackGroup: 'g' }] })), /Clause « supplement-x » \(champ « op »\) : Opération v2 non couverte/);
  assert.throws(() => validateEffectClause(clause({ effects: [{ op: 'teleport', stack: 'unique', stackGroup: 'g' }] })), error => error.element === 'supplement-x' && error.field === 'op');
  assert.throws(() => validateEffectClause(clause({ bearer: bearer('rumeur', 's') })), error => error.element === 'supplement-x' && error.field === 'bearer.kind');
  assert.throws(() => validateEffectClause(clause({ effects: [sl(1, 'add', { bonus: true })] })), error => error.field === 'bonus' && /supplement-x/.test(error.message));
  assert.throws(() => validateEffectClause(clause({ bearer: undefined })), error => error.field === 'bearer');
});

// ---- Cibles normalisées ----
test('cibles : « carac:e », « Endurance » et « Résistance » visent le même Test de Résistance', () => {
  for (const key of ['carac:e', 'Endurance', 'Résistance', 'resistance', 'all', 'Tous les Tests', 'Tous les Tests (Secousse)']) assert.equal(targetAppliesToTest(key, resistance), true, key);
  assert.equal(targetAppliesToTest('Tous les Tests (sous la pluie)', resistance), false, 'un qualificatif non lu est une condition, jamais présumée');
  assert.equal(targetAppliesToTest('carac:ag', resistance), false);
  assert.equal(targetAppliesToTest('Athlétisme', resistance), false);
  assert.deepEqual({ ...normalizeTestTarget('Mêlée (Escrime)') }, { scope: 'self', kind: 'skill', skill: 'corps a corps', spec: 'escrime' });
});

test('cibles : spécialité par nom du Test ou contexte déclaré ; « … adverse » vise le Test de l\'opposant', () => {
  assert.equal(targetAppliesToTest('Discrétion (Urbaine)', { skill: 'Discrétion (Urbaine)' }), true);
  assert.equal(targetAppliesToTest('Discrétion (Urbaine)', { skill: 'Discrétion (Rurale)' }), false);
  assert.equal(targetAppliesToTest('Discrétion (Urbaine)', { skill: 'Discrétion', skillContext: ['Urbaine'] }), true);
  assert.equal(targetAppliesToTest('Discrétion', { skill: 'Discrétion (Rurale)' }), true);
  assert.equal(targetAppliesToTest('Perception adverse', { skill: 'Perception' }), false, 'pas sur le Test du porteur');
  assert.equal(targetAppliesToTest('Perception adverse', { skill: 'Perception', scope: 'opponent' }), true);
  assert.equal(targetAppliesToTest('Mêlée adverse', { skill: 'Corps à corps (Base)', scope: 'opponent' }), true);
  assert.equal(targetAppliesToTest('Résistance', { skill: 'Résistance', scope: 'opponent' }), false);
});

// ---- Politiques dans une famille ----
test('politiques unique / add / max / strongest', () => {
  const members = [{ amount: 1 }, { amount: -3 }, { amount: 2 }];
  assert.equal(applyStackPolicy('add', members).amount, 0);
  assert.equal(applyStackPolicy('max', members).amount, 2);
  assert.equal(applyStackPolicy('strongest', members).amount, -3);
  const unique = applyStackPolicy('unique', [{ key: 'a' }, { key: 'b' }]);
  assert.deepEqual(unique.kept, [{ key: 'a' }]);
  assert.deepEqual(unique.dropped.map(row => row.rule), ['unique']);
  assert.throws(() => applyStackPolicy('moyenne', members), /moyenne/);
  assert.throws(() => applyStackPolicy('add', [{ amount: Number.MAX_SAFE_INTEGER }, { amount: 1 }]), /hors plage/);
  assert.deepEqual(Object.keys(STACK_POLICIES).sort(), ['add','bestBonusWorstPenalty','max','strongest','unique']);
});

test('bestBonusWorstPenalty : meilleur bonus et pire pénalité (R3 p. 235), une couche = une source, exceptions cumulables', () => {
  assert.equal(applyStackPolicy('bestBonusWorstPenalty', [{ amount: 2 }, { amount: 1 }, { amount: -1 }, { amount: -2 }]).amount, 0);
  // Une même couche qui vise deux fois le Test : ses montants de même signe s'additionnent (+1 +1 = +2 contre +2 d'une autre : +2).
  const layered = applyStackPolicy('bestBonusWorstPenalty', [{ amount: 1, source: 'a' }, { amount: 1, source: 'a' }, { amount: 2, source: 'b' }, { amount: 3, source: 'c', stackable: true }]);
  assert.equal(layered.amount, 5);
  assert.equal(layered.dropped.length, 1, 'la couche ex aequo non retenue reste listée « non cumulée »');
  assert.ok(layered.dropped.every(row => row.rule === 'bestBonusWorstPenalty'));
});

test('bestBonusWorstPenalty : Bénédiction de Lileath, sources supplémentaires du seul lanceur qui a le rang (HEPG p. 83, D-06)', () => {
  const members = [{ amount: 3, source: 'x', casterId: 'autre' }, { amount: 2, source: 'a', casterId: 'lileath', extraBonusSources: 1 }, { amount: 1, source: 'b', casterId: 'lileath', extraBonusSources: 1 }, { amount: 2, source: 'y', casterId: 'autre' }];
  assert.equal(applyStackPolicy('bestBonusWorstPenalty', members).amount, 3 + 2);
});

test('mergeProposals : contrat des talents (groupe [op, key, stackGroup], origines concaténées, cumul contradictoire refusé)', () => {
  const p = (amount, stack, origin, extra = {}) => ({ op: 'modifySL', amount, stack, stackGroup: 'g', origins: [origin], ...extra });
  const [added] = mergeProposals([p(1, 'add', 'a'), p(2, 'add', 'b')]);
  assert.equal(added.amount, 3); assert.deepEqual(added.origins, ['a', 'b']);
  assert.equal(mergeProposals([p(1, 'max', 'a'), p(2, 'max', 'b')])[0].amount, 2);
  const [unique] = mergeProposals([{ op: 'grantAdvantage', stack: 'unique', stackGroup: 'g', origins: ['a'] }, { op: 'grantAdvantage', stack: 'unique', stackGroup: 'g', origins: ['b'] }]);
  assert.equal(Object.hasOwn(unique, 'amount'), false); assert.deepEqual(unique.origins, ['a', 'b']);
  assert.equal(mergeProposals([p(1, 'add', 'a'), p(1, 'add', 'b', { key: 'autre' })]).length, 2);
  assert.throws(() => mergeProposals([p(1, 'add', 'a'), p(1, 'max', 'b')]), /Cumul contradictoire/);
  assert.throws(() => mergeProposals([p(1, 'add', 'a'), p(1, 'add', 'b')], { assertCompatible: () => { throw new TypeError('incompatible'); } }), /incompatible/);
});

// ---- Cumul par Test résolu (CA1, CA2) ----
test('CA1 deux sorts différents, clés différentes, même Test : meilleur bonus seul (+2, pas +4)', () => {
  const result = combineEffects([spell('roc', 'carac:e', 2), spell('dents', 'Endurance', 2)], { test: resistance });
  assert.equal(result.ready, true);
  assert.equal(result.totals.modifySL, 2);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].dropped.length, 1);
  assert.equal(result.groups[0].dropped[0].rule, 'bestBonusWorstPenalty');
});

test('CA2 deux sorts, pénalités par clés différentes : la pire seule (-2, pas -3)', () => {
  const result = combineEffects([spell('a', 'Tous les Tests', -1), spell('b', 'Résistance', -2), spell('c', 'Athlétisme', -4)], { test: resistance });
  assert.equal(result.totals.modifySL, -2);
});

test('sans Test résolu, la clé brute reste la clé de groupe', () => {
  assert.equal(combineEffects([spell('roc', 'carac:e', 2), spell('dents', 'Endurance', 2)]).groups.length, 2);
});

// ---- Table entre familles ----
test('Q2 prière et sort au même Test se somment ; prières entre elles au meilleur bonus (MJ 06/11)', () => {
  const result = combineEffects([spell('s1', 'carac:e', 2), spell('s2', 'Endurance', 1), prayer('p1', 'Résistance', 1), prayer('p2', 'Tous les Tests', 2)], { test: resistance });
  assert.equal(result.ready, true);
  assert.equal(result.totals.modifySL, 4);
  assert.equal(betweenGroupsRule('spell', 'prayer').policy, 'sum');
});

test('Q3 pénalité d\'États (la plus forte) et malus de sort s\'additionnent', () => {
  const condition = (key, amount) => ({ bearer: bearer('condition', key), effect: sl(amount, 'strongest') });
  const result = combineEffects([condition('sonne', -1), condition('epuise', -2), spell('d', 'Tous les Tests', -1)], { test: resistance });
  assert.equal(result.ready, true);
  assert.equal(result.totals.modifySL, -3);
});

test('Q4 Avantage de cavalerie et Avantage d\'un talent : deux sources distinctes', () => {
  const advantage = (kind, sourceId) => ({ bearer: bearer(kind, sourceId), effect: { op: 'grantAdvantage', stack: 'unique', stackGroup: 'advantage' } });
  const result = combineEffects([advantage('mount', 'cavalry'), advantage('talent', 'talent-x')]);
  assert.equal(result.ready, true);
  assert.equal(result.groups.filter(group => group.op === 'grantAdvantage' && group.status === 'applied').length, 2);
});

test('table entre familles : lignes tracées seulement (R1, Q2, Q3, Q4), chacune avec sa référence', () => {
  for (const rule of Object.values(BETWEEN_GROUPS)) { assert.equal(rule.policy, 'sum'); assert.match(rule.reference, /R1|Q2|Q3|Q4/); }
  for (const kind of BEARER_KINDS) if (kind !== 'quality') assert.ok(betweenGroupsRule('quality', kind), kind);
  assert.equal(betweenGroupsRule('talent', 'spell').reference.startsWith('R1'), true);
  assert.throws(() => betweenGroupsRule('spell', 'spell'), /distinctes/);
});

// ---- CA5 ----
test('CA5 paire non arbitrée (Trait et sort, question ouverte au MJ) : signalée, hors du total, montants visibles', () => {
  const trait = { bearer: bearer('trait', 'trait-x'), effect: sl(1, 'add') };
  const result = combineEffects([trait, spell('s', 'Résistance', 2), prayer('p', 'Résistance', 1)], { test: resistance });
  assert.equal(result.ready, false);
  assert.deepEqual(result.signals, [{ type: 'pairNotArbitrated', op: 'modifySL', kinds: ['prayer', 'trait'] }, { type: 'pairNotArbitrated', op: 'modifySL', kinds: ['spell', 'trait'] }]);
  assert.deepEqual(result.groups.map(group => [group.kind, group.amount, group.status]), [['trait', 1, 'unresolved'], ['spell', 2, 'unresolved'], ['prayer', 1, 'unresolved']]);
  assert.equal(result.totals.modifySL, undefined, 'jamais additionné en silence');
});

test('CA5 une paire non arbitrée sur une opération ne bloque pas les autres opérations', () => {
  const result = combineEffects([{ bearer: bearer('trait', 't'), effect: sl(1, 'add') }, { bearer: bearer('gm', 'mj'), effect: { op: 'grantAdvantage', stack: 'unique', stackGroup: 'a' } }, spell('s', 'Résistance', 2)], { test: resistance });
  assert.equal(result.groups.find(group => group.op === 'grantAdvantage').status, 'applied');
  assert.equal(result.signals.length, 1);
});
