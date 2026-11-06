// U8 lot L5c (CA4, montures) : Avantage de cavalerie, Désavantage du cavalier protégé et Esquive à cheval, passés en clauses puis par
// combineEffects, donnent les mêmes sources que le calcul actuel (planMountedAttack, previewResolution). Adaptateur pur, non branché (L5z).
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { planMountedAttack, planMountedDodge, mountedAdvantageClauses } from '../../../js/core/v5-mounted-combat.js';
import { combineEffects, clauseEntries } from '../../../js/core/effect-engine.js';

const fighter = (id, camp, extra = {}) => ({
  id, name: id, kind: 'PNJ', camp, zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  states: [], talents: [], skills: [], equipment: [], traits: [], armor: {}, extensions: { v5: { hasMomentum: false, ...extra } } });
const weapon = name => { const item = getReferenceCatalogue().items.find(row => row.kind === 'weapon' && row.name === name); assert.ok(item, name); return item; };
const horse = () => ({ id: 'horse', kind: 'Créature', zone: 'active', size: 'large', caracs: { F: 50 }, traits: [], states: [] });
const talentEntry = (op, id) => ({ bearer: { kind: 'talent', sourceId: id }, effect: { op, stack: 'unique', stackGroup: id } });
const count = (combined, op) => combined.groups.filter(group => group.op === op && group.status === 'applied').length;

function cavalryScenario() {
  const lance = weapon('Lance de cavalerie');
  const rider = fighter('attacker', 'pj', { mounted: true, mountId: 'horse' }); rider.caracs.CC = 60; rider.equipment = [lance];
  const target = fighter('target', 'ennemi'); target.size = 'small';
  return { lance, rider, target };
}

test('L5c Avantage de cavalerie : une clause grantAdvantage de la famille mount, même source que le calcul actuel', () => {
  const { lance, rider, target } = cavalryScenario();
  const plan = planMountedAttack({ actor: rider, target, actorMount: horse(), weapon: lance, kind: 'melee' });
  assert.deepEqual(plan.advantageSources.map(row => row.id), ['mounted:cavalry-against-smaller']);
  const clauses = mountedAdvantageClauses(plan, { ownerId: rider.id });
  assert.deepEqual(clauses.map(clause => [clause.id, clause.effects[0].op, clause.bearer.kind]), [['mounted:cavalry-against-smaller', 'grantAdvantage', 'mount']]);
  const preview = previewResolution({ actor: rider, target, roll: 25,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: lance.id } } },
    v5: { kind: 'melee' }, v5State: { participants: [rider, target, horse()] } });
  assert.deepEqual(preview.test.advantage.advantage.map(row => row.id).filter(id => id.startsWith('mounted:')), clauses.map(clause => clause.id));
});

test('L5c Q4 Avantage de cavalerie et Avantage d\'un talent : deux sources distinctes (deux groupes, aucun écarté)', () => {
  const { lance, rider, target } = cavalryScenario();
  const plan = planMountedAttack({ actor: rider, target, actorMount: horse(), weapon: lance, kind: 'melee' });
  const combined = combineEffects([...clauseEntries(mountedAdvantageClauses(plan, { ownerId: rider.id })), talentEntry('grantAdvantage', 'talent-test')]);
  assert.equal(combined.ready, true);
  assert.equal(count(combined, 'grantAdvantage'), 2);
  assert.deepEqual(combined.groups.flatMap(group => group.dropped), []);
});

test('L5c Désavantage du cavalier protégé et autre Désavantage : deux sources distinctes', () => {
  const dagger = weapon('Dague');
  const attacker = fighter('attacker', 'pj'); attacker.caracs.CC = 60; attacker.size = 'small'; attacker.equipment = [dagger];
  const rider = fighter('target', 'ennemi', { mounted: true, mountId: 'horse' });
  const plan = planMountedAttack({ actor: attacker, target: rider, targetMount: horse(), weapon: dagger, kind: 'melee' });
  assert.deepEqual(plan.disadvantageSources.map(row => row.id), ['mounted:protected-rider']);
  const clauses = mountedAdvantageClauses(plan, { ownerId: attacker.id });
  assert.deepEqual(clauses.map(clause => [clause.id, clause.effects[0].op]), [['mounted:protected-rider', 'grantDisadvantage']]);
  const combined = combineEffects([...clauseEntries(clauses), talentEntry('grantDisadvantage', 'other-disadvantage')]);
  assert.equal(count(combined, 'grantDisadvantage'), 2);
  assert.equal(count(combined, 'grantAdvantage'), 0);
});

test('L5c Esquive à cheval : Désavantage, sauf Cavalier acrobate (V5 p. 168)', () => {
  const mounted = { extensions: { v5: { mounted: true } }, talents: [] };
  assert.deepEqual(mountedAdvantageClauses(planMountedDodge(mounted)).map(clause => clause.id), ['mounted:dodge']);
  const acrobat = { ...mounted, talents: [{ id: 'talent-trick-rider', status: 'resolved' }] };
  assert.deepEqual(mountedAdvantageClauses(planMountedDodge(acrobat)), []);
  assert.deepEqual(mountedAdvantageClauses(planMountedDodge({ extensions: { v5: {} } })), []);
});

test('L5c plan sans source, vide ou invalide : aucune clause', () => {
  assert.deepEqual(mountedAdvantageClauses({ active: false, advantageSources: [], disadvantageSources: [] }), []);
  assert.deepEqual(mountedAdvantageClauses(null), []);
});

test('L5c Q4 la monture se somme avec les autres familles (qualité, surnombre) sur la même attaque, sans signalement', () => {
  const { lance, rider, target } = cavalryScenario();
  const plan = planMountedAttack({ actor: rider, target, actorMount: horse(), weapon: lance, kind: 'melee' });
  const combined = combineEffects([...clauseEntries(mountedAdvantageClauses(plan)),
    { bearer: { kind: 'situation', sourceId: 'o' }, effect: { op: 'modifySL', amount: 1, stack: 'max', stackGroup: 'outnumber' } },
    { bearer: { kind: 'quality', sourceId: 'q' }, effect: { op: 'modifySL', amount: 1, stack: 'max', stackGroup: 'quality-pointue' } }]);
  assert.equal(combined.ready, true);
  assert.equal(combined.totals.modifySL, 2);
  assert.equal(count(combined, 'grantAdvantage'), 1);
});
