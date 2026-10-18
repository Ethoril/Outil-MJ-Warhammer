import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createStore } from '../js/core/store.js';
import { computeDamage } from '../js/core/damage.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { getReferenceCatalogue, aggregateTalents } from '../js/core/reference-catalog.js';

// All participants, acquisitions and equipment are synthetic, with public rule identities.
const talents = (...names) => aggregateTalents(names.map(nom => ({ nom }))).items;
const skill = name => getReferenceCatalogue().skills.find(row => row.nom === name).id;
const person = (id, extra = {}) => ({ id, name: 'Personnage synthétique ' + id,
  kind: id === 'a' ? 'PJ' : 'Créature', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active',
  hp: 40, maxHp: 40, initiative: 60, caracs: { CC: 60, CT: 60, F: 30, E: 30 },
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], talents: [],
  extensions: { v5: { hasMomentum: false } }, ...extra });
const object = (id, extra = {}) => ({ id, baseId: 'synthetic-model-' + id, catalogVersion: 'synthetic',
  kind: 'armour', name: 'Objet synthétique ' + id, category: 'Armure', damage: '', reach: '', range: '',
  ap: 1, locations: ['body'], layer: 'leather', keywords: [], notes: '', source: 'Recette synthétique', custom: true, ...extra });
const words = (...ids) => ids.map(id => ({ id, parameter: '' }));
const weapon = (id, ids = [], extra = {}) => object(id, { kind: 'weapon', category: 'Base',
  damage: 'BF+1', ap: null, locations: [], layer: 'none', keywords: words(...ids), ...extra });
const bow = (ids = []) => weapon('bow', ids, { category: 'Arc', range: '50' });
const ammo = (ids = []) => object('arrow', { kind: 'ammunition', category: 'Arc', damage: '+0',
  ap: null, locations: [], layer: 'none', keywords: words(...ids) });
const attack = (extra = {}) => ({ id: 'synthetic-attack', type: 'attack', base: 60, damage: 4, qualities: [], ...extra });
const raw = (extra = {}) => ({ resolutionId: 'keyword-interaction', actor: person('a'), target: person('t'),
  baseRevision: 2, round: 1, roll: 23, action: attack(),
  defense: { base: 30, roll: 47, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const pureState = p => ({ revision: p.baseRevision, round: p.input.round,
  participants: [p.input.actor, p.input.target], appliedResolutionIds: [] });
const proposals = p => p.talentPlans.flatMap(plan => plan.proposals || []);
const frozen = value => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const snapshotStore = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
async function setup(a = person('a'), t = person('t')) {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, extensions: { v5: { combatId: 'keyword-synthetic-combat', turnIndex: 1 } },
    reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a', 't'], participants: [a, t] }, diceLines: [], log: [] });
  return { store, persistence };
}
const storeInput = extra => ({ actorId: 'a', targetId: 't', resolutionId: 'keyword-store-interaction',
  roll: 23, action: attack(), defense: { base: 30, roll: 47, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
function isolated(source) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('Mots clés × talents — arc et munition Empaleuse dédoublonnés, Tir précis, armure et reçu Store', async () => {
  const equipment = [bow(['empaleuse']), ammo(['empaleuse'])];
  const protection = [object('helmet', { locations: ['head'] }),
    object('plates', { ap: 3, layer: 'rigid', keywords: words('points-faibles', 'impenetrable') })];
  const a = person('a', { equipment, talents: talents('Tir précis', 'Coup puissant') });
  const t = person('t', { equipment: protection, talents: talents('Tir précis', 'Coup puissant') });
  const { store, persistence } = await setup(a, t);
  const before = snapshotStore(store);
  const input = frozen(storeInput({ roll: 20, defense: undefined, ammunitionId: 'arrow',
    action: attack({ extensions: { fiche: { equipmentId: 'bow' } } }),
    criticalRolls: { location: 50, effect: 4 }, v5: { kind: 'ranged', aimed: true } }));
  const p = store.previewResolution(input);
  assert.equal(p.input.action.qualities.filter(row => row.id === 'empaleuse').length, 1);
  assert.equal(p.input.ammunitionSources.length, 2);
  assert.equal(p.critical.expanded, true); assert.equal(p.location.key, 'HEAD');
  assert.equal(p.critical.details.location.key, 'BODY');
  assert.equal(p.protection.ap, 1); assert.equal(p.critical.details.protection.ap, 0);
  assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, 6);
  assert.deepEqual(snapshotStore(store), before, 'aperçu pur malgré pièces et munition liées');
  assert.equal((await store.applyResolution(p)).status, 'applied');
  const applied = snapshotStore(store);
  assert.equal(p.critical.application.extraWounds, 0);
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 34);
  for (const participant of applied.combat.participants) {
    const original = before.combat.participants.find(row => row.id === participant.id);
    assert.deepEqual(participant.equipment, original.equipment);
  }
  const detail = store.getLog()[0].detail;
  assert.equal(detail.damage.talentDamage, 2); assert.equal(detail.ammunitionSources.length, 2);
  assert.equal(detail.critical.details.protection.ap, 0);
  assert.equal((await store.applyResolution(p)).status, 'duplicate');
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.deepEqual(reloaded.listParticipants(), store.listParticipants());
  assert.deepEqual(reloaded.getLog()[0].detail, detail);
  await reloaded.undo(); assert.deepEqual(snapshotStore(reloaded).combat.participants, before.combat.participants);
});

test('Mots clés × talents — Empaleuse exige réussite propre, même sur opposition gagnée', () => {
  for (const roll of [55, 60, 100]) {
    const p = previewResolution(raw({ roll, action: attack({ base: 40, qualities: ['empaleuse'] }),
      actor: person('a', { talents: talents('Coup puissant') }),
      defense: { base: 0, roll: 94, v5: { kind: 'melee' } } }));
    assert.equal(p.success, false); assert.equal(p.critical, null);
    if (roll !== 100) assert.equal(p.hit, true, 'victoire opposée ne suffit pas à déclencher Empaleuse');
  }
});

test('Mots clés × talents — critique Empaleuse indépendant de victoire et armure de sa localisation', () => {
  const target = person('t', { equipment: [object('plates', { ap: 2, layer: 'rigid', keywords: words('impenetrable') })] });
  const common = raw({ target, actor: person('a', { talents: talents('Coup puissant') }), roll: 33,
    action: attack({ base: 50, qualities: ['empaleuse'] }),
    defense: { base: 70, roll: 20, v5: { kind: 'melee' } } });
  const protectedBody = previewResolution({ ...common, criticalRolls: { location: 50, effect: 20 } });
  assert.equal(protectedBody.hit, false); assert.equal(protectedBody.success, true);
  assert.equal(protectedBody.damage, null); assert.equal(protectedBody.critical, null);
  assert.equal(proposals(protectedBody).some(row => row.op === 'modifyDamage'), false);
  const bareHead = previewResolution({ ...common, criticalRolls: { location: 2, effect: 20 } });
  assert.equal(bareHead.hit, false); assert.equal(bareHead.critical.expanded, false);
  assert.equal(bareHead.critical.details.location.key, 'HEAD'); assert.equal(bareHead.critical.application.extraWounds, 1);
  const even = previewResolution({ ...common, roll: 30, criticalRolls: { location: 50, effect: 20 } });
  assert.equal(even.hit, false); assert.equal(even.critical.expanded, true);
});

test('Mots clés × talents — défense Empaleuse a son propre jet et protège seulement la localisation critique de l’attaquant', () => {
  const actor = person('a', { equipment: [object('plates', { ap: 2, layer: 'rigid', keywords: words('impenetrable') })],
    talents: talents('Coup puissant') });
  for (const [roll, location, expectedCritical] of [[33, 50, false], [33, 2, true], [30, 50, true]]) {
    const p = previewResolution(raw({ actor, target: person('t', { talents: talents('Coup puissant') }), action: attack({ base: 30 }),
      defense: { base: 70, roll, qualities: ['empaleuse'], v5: { kind: 'melee' } },
      defenderCriticalRolls: { location, effect: 20 } }));
    assert.equal(Boolean(p.defenderCritical), expectedCritical);
    assert.equal(proposals(p).some(row => row.op === 'modifyDamage'), false, 'talent du défenseur ne devient pas bonus de blessure critique');
    if (p.defenderCritical) assert.equal(p.defenderCritical.targetId, 'a');
  }
});

test('Mots clés × talents — inversion contextuelle choisit le jet qui déclenche Empaleuse', () => {
  const action = attack({ qualities: ['empaleuse'], extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } });
  const actor = person('a', { talents: talents('Mains agiles', 'Coup puissant') });
  const initialMultiple = previewResolution(raw({ actor, action, roll: 70,
    v5: { kind: 'melee', choice: 'reverse', context: { touchingOpponent: true } } }));
  assert.equal(initialMultiple.test.advantage.net, 1); assert.equal(initialMultiple.roll, 7);
  assert.equal(initialMultiple.critical, null); assert.equal(initialMultiple.damage.talentDamage, 2);
  const finalMultiple = previewResolution(raw({ actor, action, roll: 4,
    criticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', context: { touchingOpponent: true }, disadvantageSources: [{ id: 'synthetic-one' }, { id: 'synthetic-two' }] } }));
  assert.equal(finalMultiple.test.advantage.net, -1); assert.equal(finalMultiple.roll, 40);
  assert.equal(finalMultiple.test.optionId, 'reverse'); assert.equal(finalMultiple.critical.expanded, true);
  assert.equal(finalMultiple.damage.talentDamage, 1, 'avantage talent annulé ne majore pas Coup puissant');
});

test('Mots clés × talents — Défensive/Déséquilibrée face à une inversion Bagarre, sans avantage de défense Mains agiles', () => {
  const action = attack({ base: 40, extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } });
  const actor = person('a', { talents: talents('Mains agiles', 'Coup puissant') });
  const target = person('t', { talents: talents('Mains agiles', 'Coup puissant') });
  const defense = { base: 50, roll: 42, qualities: ['defensive', 'Defensive'],
    extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } }, v5: { kind: 'melee', context: { touchingOpponent: true } } };
  const absent = previewResolution(raw({ action, target, roll: 61, defense }));
  assert.equal(absent.hit, false); assert.equal(absent.test.advantage.net, 0);
  const supplied = previewResolution(raw({ action, actor, target, roll: 61, defense,
    v5: { kind: 'melee', choice: 'reverse', context: { touchingOpponent: true } } }));
  assert.equal(supplied.roll, 16); assert.equal(supplied.defenderTest.advantage.net, 0);
  assert.equal(supplied.defenderTest.sl, 2); assert.equal(supplied.opposition.netSl, 1);
  assert.equal(supplied.damage.talentDamage, 2); assert.equal(supplied.damage.finalDamage, 4);
  const unwieldy = previewResolution(raw({ action, actor, target, roll: 61,
    defense: { ...defense, qualities: [...defense.qualities, 'desequilibree'] },
    v5: { kind: 'melee', choice: 'reverse', context: { touchingOpponent: true } } }));
  assert.equal(unwieldy.defenderTest.sl, 0); assert.equal(unwieldy.opposition.netSl, 3);
  assert.equal(unwieldy.damage.finalDamage, 6);
  assert.equal(unwieldy.defenderTest.details.modifiers.some(row => row.id === 'defensive-protection'), false);
});

test('Mots clés × talents — Pointue conditionnelle, Imprécise prioritaire et Coup puissant avant protection', () => {
  for (const [qualities, expectedSl, bareDamage, talentDamage] of [
    [[], 1, 3, 4], [['pointue'], 2, 4, 5], [['pointue', 'imprecise'], 0, 2, 3]
  ]) {
    for (const acquired of [false, true]) {
      const input = frozen(raw({ roll: 49, action: attack({ base: 50, qualities }),
        actor: person('a', { talents: acquired ? talents('Coup puissant') : [] }) }));
      const before = structuredClone(input), p = previewResolution(input);
      assert.equal(p.sl, expectedSl); assert.equal(p.success, true);
      assert.equal(p.damage.finalDamage, acquired ? talentDamage : bareDamage);
      assert.equal(p.damage.talentDamage || 0, acquired ? 1 : 0);
      assert.deepEqual(input, before);
    }
  }
  const failed = previewResolution(raw({ roll: 49, action: attack({ base: 40, qualities: ['pointue'] }),
    defense: { base: 0, roll: 94, v5: { kind: 'melee' } } }));
  assert.equal(failed.success, false); assert.equal(failed.hit, true); assert.equal(failed.sl, 0);
  assert.equal(failed.test.details.modifiers.some(row => row.id === 'quality-success'), false);
});

test('Mots clés × talents — Pointue d’arme, Imprécise de munition et Tir précis suivent visée et réussite', () => {
  for (const [ammoQualities, expectedSl, expectedDamage] of [[[], 2, 5], [['imprecise'], 0, 3]]) {
    const equipment = [bow(['pointue']), ammo(ammoQualities)];
    const p = previewResolution(raw({ actor: person('a', { equipment, talents: talents('Tir précis', 'Coup puissant') }),
      target: person('t', { armor: { head: 0, body: 1, arms: 0, legs: 0 } }), defense: undefined, roll: 49,
      ammunitionId: 'arrow', action: attack({ base: 50, extensions: { fiche: { equipmentId: 'bow' } } }),
      v5: { kind: 'ranged', aimed: true } }));
    assert.equal(p.sl, expectedSl); assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, expectedDamage);
    assert.deepEqual(p.input.actor.equipment, equipment);
    const ordinary = previewResolution({ ...p.input, v5: { kind: 'ranged', aimed: false } });
    assert.equal(ordinary.damage.talentDamage, 1); assert.equal(ordinary.damage.finalDamage, expectedDamage - 1);
  }
  const miss = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }), defense: undefined,
    action: attack({ base: 30, qualities: ['pointue'] }), roll: 49, v5: { kind: 'ranged' } }));
  assert.equal(miss.success, false); assert.equal(miss.damage, null);
  assert.equal(miss.unresolved.some(row => row.includes('aimed')), false);
});

test('Mots clés × talents — Inoffensive annule Dévastatrice sans supprimer Coup puissant ni le seuil de zéro', () => {
  for (const [qualities, present, advantage, expected] of [
    [['devastatrice'], false, false, 8], [['devastatrice'], true, false, 9],
    [['inoffensive', 'devastatrice'], false, false, 0], [['inoffensive', 'devastatrice'], true, false, 0],
    [['inoffensive', 'devastatrice'], true, true, 1]
  ]) {
    const p = previewResolution(raw({ roll: 38,
      actor: person('a', { talents: present ? talents('Coup puissant') : [] }),
      target: person('t', { armor: { head: 2, body: 2, arms: 2, legs: 2 } }),
      action: attack({ base: 40, damage: 5, qualities }),
      defense: { base: 40, roll: 42, v5: { kind: 'melee' } },
      v5: { kind: 'melee', ...(advantage ? { advantageSources: [{ id: 'synthetic-advantage' }] } : {}) } }));
    assert.equal(p.damage.finalDamage, expected); assert.equal(p.damage.sl, qualities.includes('inoffensive') ? 1 : 8);
    assert.equal(p.damage.talentDamage || 0, present ? advantage ? 2 : 1 : 0);
    assert.equal(p.damage.paEffectif, qualities.includes('inoffensive') ? 4 : 2);
  }
});

test('Mots clés × talents — Inoffensive et Dévastatrice gardent Tir précis hors multiplication des PA', () => {
  for (const [aimed, expected] of [[false, 0], [true, 1]]) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }), defense: undefined,
      target: person('t', { armor: { head: 2, body: 2, arms: 2, legs: 2 } }), roll: 38,
      action: attack({ base: 40, damage: 5, qualities: ['inoffensive', 'devastatrice'] }), v5: { kind: 'ranged', aimed } }));
    assert.equal(p.damage.sl, 1); assert.equal(p.damage.paEffectif, 4);
    assert.equal(p.damage.talentDamage, aimed ? 2 : 1); assert.equal(p.damage.finalDamage, expected);
  }
});

test('Mots clés × talents — inversion choisie modifie Partielle et opposition, sans réécrire l’armure', async () => {
  const equipment = [object('leather'), object('partial', { ap: 2, layer: 'rigid', keywords: words('partielle') })];
  const { store } = await setup(person('a', { talents: talents('Mains agiles', 'Coup puissant') }), person('t', { equipment }));
  const before = snapshotStore(store);
  const input = storeInput({ roll: 74, action: attack({ base: 80, damage: 5,
    extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } }),
    defense: { base: 40, roll: 32, v5: { kind: 'melee' } },
    v5: { kind: 'melee', choice: 'keep', context: { touchingOpponent: true } } });
  const keep = store.previewResolution(input), reversed = store.previewResolution({ ...input, v5: { ...input.v5, choice: 'reverse' } });
  assert.equal(keep.roll, 74); assert.equal(keep.location.roll, 47); assert.equal(keep.protection.ap, 3); assert.equal(keep.damage.finalDamage, 1);
  assert.equal(reversed.roll, 47); assert.equal(reversed.location.roll, 74); assert.equal(reversed.protection.ap, 1); assert.equal(reversed.damage.finalDamage, 6);
  assert.equal(reversed.protection.ignored.find(row => row.item.id === 'partial').reason, 'Partielle : localisation paire');
  assert.deepEqual(snapshotStore(store), before);
  assert.equal((await store.applyResolution(reversed)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 34);
  assert.deepEqual(store.listParticipants().find(row => row.id === 't').equipment, equipment);
  await store.undo(); assert.deepEqual(snapshotStore(store).combat.participants, before.combat.participants);
});

test('Mots clés × talents — zones gauche/droite et couches exactes avec Tir précis', () => {
  const equipment = [object('leather', { locations: ['leftArm', 'rightArm'] }),
    object('left-mail', { ap: 2, locations: ['leftArm'], layer: 'flexible', keywords: words('flexible') }),
    object('right-plates', { ap: 4, locations: ['rightArm'], layer: 'rigid' }),
    object('right-lesser', { ap: 2, locations: ['rightArm'], layer: 'rigid' })];
  const target = frozen(person('t', { equipment })), before = structuredClone(target);
  for (const [roll, side, armour, damage] of [[51, 'left', 3, 2], [52, 'right', 5, 1]]) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }), target, roll, defense: undefined,
      action: attack({ base: 80 }), v5: { kind: 'ranged', aimed: false } }));
    assert.equal(p.location.side, side); assert.equal(p.protection.ap, armour); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.damage.talentDamage, 1);
  }
  assert.deepEqual(target, before);
});

test('Mots clés × talents — Assommante déjà présente ne s’ajoute pas avec Frappe, Mâchoires réduit une seule acquisition', async () => {
  const equipment = [weapon('club', ['assommante'])];
  const { store } = await setup(person('a', { equipment, talents: talents('Frappe assommante', 'Coup puissant') }),
    person('t', { talents: talents('Mâchoires d’acier') }));
  const p = store.previewResolution(storeInput({ roll: 10,
    action: attack({ base: 40, qualities: ['assommante', 'Pummel'], extensions: { fiche: { equipmentId: 'club' } } }),
    defense: { base: 40, roll: 32, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { weaponImprovised: true } } }));
  assert.equal(p.input.action.qualities.filter(row => row.id === 'assommante').length, 1);
  assert.equal(proposals(p).filter(row => row.op === 'addQuality').length, 0);
  assert.equal(p.damage.talentDamage, 1); assert.equal(p.damage.finalDamage, 4);
  assert.equal(p.weaponConditions.proposed.length, 1); assert.equal(p.weaponConditions.applied.length, 0);
  assert.equal(p.talentUsageRequests.length, 1);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 36);
  assert.equal(store.listParticipants().find(row => row.id === 't').states.some(row => row.key === 'sonne'), false);
  assert.deepEqual(store.listParticipants().find(row => row.id === 'a').equipment, equipment);
  assert.equal(snapshotStore(store).extensions.v5.actionLedger.quotaUsage.length, 1);
});

test('Mots clés × talents — Battement remplace Empaleuse/Dévastatrice/Assommante et conserve le critique défensif', async () => {
  const equipment = [weapon('club', ['assommante', 'empaleuse', 'devastatrice'])];
  const { store } = await setup(person('a', { equipment, talents: talents('Battement', 'Frappe assommante', 'Coup puissant') }),
    person('t', { talents: talents('Mâchoires d’acier') }));
  const p = store.previewResolution(storeInput({ roll: 22,
    action: attack({ base: 90, damage: 40, extensions: { fiche: { equipmentId: 'club' } } }),
    defense: { base: 30, roll: 22, qualities: ['empaleuse'], v5: { kind: 'melee' } },
    criticalRolls: { location: 2, effect: 20 }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', actorSize: 3, targetSize: 3, context: { weaponImprovised: true },
      talentChoices: { 'talent-beat-blade:replace-damage': true } } }));
  assert.equal(p.damage, null); assert.equal(p.critical, null); assert.equal(p.weaponConditions.proposed.length, 0);
  assert.equal(p.talentUsageRequests.length, 0); assert.equal(p.defenderCritical.application.extraWounds, 1);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  const [a, t] = ['a', 't'].map(id => store.listParticipants().find(row => row.id === id));
  assert.equal(a.hp, 39); assert.equal(t.hp, 40); assert.ok(a.states.some(row => row.key === 'sonne'));
  assert.ok(t.states.some(row => row.kind === 'talent-active')); assert.equal(t.states.some(row => row.key === 'sonne'), false);
  assert.deepEqual(a.equipment, equipment); assert.equal(snapshotStore(store).extensions.v5.actionLedger.quotaUsage.length, 0);
});

test('Mots clés × talents — V4 Précise/Percutante ne deviennent pas DR V5 avec Coup puissant', () => {
  for (const quality of ['precise', 'percutante']) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Coup puissant') }),
      action: attack({ qualities: [quality] }) }));
    assert.equal(p.test.score, 60); assert.equal(p.sl, 4); assert.equal(p.damage, null);
    assert.ok(p.mechanicalWarnings.some(row => row.keywordId === quality));
    assert.equal(applyResolution(p, pureState(p)).status, 'manual');
  }
});

test('Mots clés × talents — inconnu reste rappel visible sans moteur, armure inconnue ne vaut pas zéro', () => {
  const base = raw({ actor: person('a', { talents: talents('Coup puissant') }) });
  const unknown = previewResolution({ ...base, action: attack({ qualities: ['unknown-editorial-word'] }) });
  const ordinary = previewResolution(base);
  assert.equal(unknown.mechanics[0].status, 'manual'); assert.equal(unknown.mechanics[0].engine, null);
  assert.equal(unknown.damage.finalDamage, ordinary.damage.finalDamage);
  assert.equal(unknown.sl, ordinary.sl); assert.equal(applyResolution(unknown, pureState(unknown)).status, 'applied', 'politique historique du rappel sans moteur');
  const missing = previewResolution({ ...base, target: person('t', { equipment: [object('unknown-ap', { ap: null, locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] })] }) });
  assert.equal(missing.protection.ap, null); assert.equal(missing.damage, null);
  assert.equal(applyResolution(missing, pureState(missing)).status, 'manual');
});

test('Mots clés × talents — sources retirées ou V4 désactivent qualités et bonus sans deviner', () => {
  isolated(`
    import assert from 'node:assert/strict';
    import snapshot from './js/data/reference-snapshot.json' with { type: 'json' };
    const pack = structuredClone(snapshot);
    pack.equipment.keywords = pack.equipment.keywords.filter(row => row.id !== 'empaleuse');
    pack.equipment.keywords.find(row => row.id === 'impenetrable').edition = 'V4';
    pack.talents.entries = pack.talents.entries.filter(row => row.id !== 'talent-strike-mighty-blow');
    globalThis.localStorage = { getItem: () => JSON.stringify({ data: pack, updatedAt: '2030-01-01T00:00:00Z' }) };
    const { previewResolution, applyResolution } = await import('./js/core/resolution.js');
    const a = { id:'a',hp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}] };
    const t = { id:'t',hp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[] };
    const base={actor:a,target:t,roll:20,baseRevision:2,round:1,action:{type:'attack',base:60,damage:4,qualities:['empaleuse']},defense:{base:30,roll:47,v5:{kind:'melee'}},v5:{kind:'melee'}};
    const p=previewResolution(base);assert.equal(p.critical,null);assert.equal(p.damage,null);assert.equal(applyResolution(p,{revision:2,round:1,participants:[a,t]}).status,'manual');
    const ordinary=previewResolution({...base,roll:23,action:{...base.action,qualities:[]}});
    assert.equal(ordinary.damage.talentDamage,undefined);assert.ok(ordinary.talentPlans.some(plan=>plan.trace.some(row=>row.status==='sourceUnavailable')));
    const armored={...t,equipment:[{id:'plate',kind:'armour',name:'Plate synthétique',ap:2,locations:['body'],layer:'rigid',keywords:[{id:'impenetrable',parameter:''}]}]};
    const protectedCritical=previewResolution({...base,target:armored,roll:33,action:{...base.action,qualities:[]},criticalRolls:{location:50,effect:20}});
    assert.ok(protectedCritical.critical);assert.ok(protectedCritical.unresolved.some(row=>row.includes('impenetrable')));
    assert.equal(applyResolution(protectedCritical,{revision:2,round:1,participants:[a,armored]}).status,'manual');
  `);
});

for (const affected of ['pointue', 'defensive', 'impenetrable', 'partielle']) {
  test('Mots clés × talents — confirmation Store refuse source changée : ' + affected, () => {
    isolated(`
      import assert from 'node:assert/strict';
      import { readFile } from 'node:fs/promises';
      import { createStore } from './js/core/store.js';
      import { getReferenceCatalogue, refreshReferences } from './js/core/reference-catalog.js';
      const id=${JSON.stringify(affected)};
      const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
      const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
      if(['impenetrable','partielle'].includes(id))t.equipment=[{id:'helmet',kind:'armour',name:'Casque synthétique',ap:2,locations:['head'],layer:'rigid',keywords:[{id,parameter:''}]}];
      const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
      await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-source-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-source-result',roll:id==='impenetrable'?33:id==='partielle'?40:23,
        action:{type:'attack',base:60,damage:4,qualities:id==='pointue'?['pointue']:[]},
        defense:{base:30,roll:47,qualities:id==='defensive'?['defensive']:[],v5:{kind:'melee'}},
        criticalRolls:{location:2,effect:20},v5:{kind:'melee'}});
      assert.equal(p.unresolved.length,0);assert.ok(p.damage);
      if(id==='impenetrable')assert.equal(p.critical,null);
      if(id==='partielle')assert.equal(p.protection.counted.length,0);
      const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
      const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
      const oldText=getReferenceCatalogue().keywords.find(row=>row.id===id).effect;
      const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{
        const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');
        if(sheet==='Mots Clés Armes et Armures'){assert.ok(csv.includes(oldText));csv=csv.replace(oldText,'Effet synthétique modifié pour la recette de confirmation.');}
        return {ok:true,text:async()=>csv};
      }});
      assert.equal(refreshed.ok,true,refreshed.status?.error);
      assert.equal((await store.applyResolution(p)).status,'manual');
      assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
    `);
  });
}



test('Mots clés × talents — Protectrice changée avant aperçu ne donne ni DR ni défense contre le tir', () => {
  isolated(`
    import assert from 'node:assert/strict';
    import snapshot from './js/data/reference-snapshot.json' with { type: 'json' };
    const pack=structuredClone(snapshot);pack.equipment.keywords.find(row=>row.id==='protectrice').effect+=' Effet changé.';
    globalThis.localStorage={getItem:key=>key==='wfrp.references.v1'?JSON.stringify({data:pack,updatedAt:'2030-01-01T00:00:00Z'}):null};
    const {createStore}=await import('./js/core/store.js');
    const {v5ShieldDefense}=await import('./js/core/v5-combat-rules.js');
    const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
    const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[],
      equipment:[{id:'shield',kind:'shield',name:'Bouclier synthétique',ap:2,locations:[],layer:'none',keywords:[{id:'protectrice',parameter:'2'}]}]};
    const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
    await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-shield-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
    const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
    const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
    for(const kind of ['melee','ranged']){
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-shield-'+kind,roll:47,
        action:{type:'attack',base:20,damage:4,qualities:[]},defense:{base:40,roll:23,label:kind==='ranged'?'Esquive':'CC',v5:{kind:kind==='ranged'?'test':'melee'}},
        protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true,lineOfSight:true},v5:{kind}});
      assert.equal(p.hit,false);assert.equal(p.defenderTest.sl,2);assert.equal(p.defenderTest.details.modifiers.some(row=>row.id==='defensive-protection'),false);
      assert.equal(v5ShieldDefense(p.input).rangedDodgeAllowed,false);assert.ok(p.unresolved.some(row=>row.includes('Protectrice')));
      if(kind==='ranged')assert.ok(p.unresolved.some(row=>row.includes('défense contre un tir')));
      assert.equal((await store.applyResolution(p)).status,'manual');
      assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
    }
  `);
});

for (const change of ['unrelated', 'source-only']) {
  test('Mots clés × talents — actualisation ' + change + ' respecte les seules sources utilisées', () => {
    isolated(`
      import assert from 'node:assert/strict';
      import {readFile} from 'node:fs/promises';
      import {createStore} from './js/core/store.js';
      import {refreshReferences,parseReferenceCSV} from './js/core/reference-catalog.js';
      const change=${JSON.stringify(change)};
      const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
      const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
      const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
      await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-freshness-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-freshness-'+change,roll:23,
        action:{type:'attack',base:60,damage:4,qualities:['pointue']},defense:{base:30,roll:47,v5:{kind:'melee'}},v5:{kind:'melee'}});
      assert.equal(p.sl,5);assert.equal(p.damage.finalDamage,8);
      const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
      const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
      const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{
        const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');
        if(sheet==='Mots Clés Armes et Armures'){
          const rows=parseReferenceCSV(csv),headers=rows[0];
          const row=rows.find(cells=>cells[headers.indexOf('Identifiant')]===(change==='source-only'?'pointue':'imprecise'));
          assert.ok(row);row[headers.indexOf(change==='source-only'?'Source':'Effet')]+=' Recette synthétique.';
          const quote=String.fromCharCode(34);csv=rows.map(cells=>cells.map(cell=>quote+cell.replaceAll(quote,quote+quote)+quote).join(',')).join(String.fromCharCode(13,10));
        }
        return {ok:true,text:async()=>csv};
      }});
      assert.equal(refreshed.ok,true,refreshed.status?.error);
      const result=await store.applyResolution(p);
      if(change==='source-only'){
        assert.equal(result.status,'manual');assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
      }else{
        assert.equal(result.status,'applied');assert.equal(store.listParticipants().find(row=>row.id==='t').hp,32);
        assert.equal(store.getLog()[0].detail.sl,5);assert.equal(store.getLog()[0].detail.damage.talentDamage,1);
      }
    `);
  });
}

for (const scenario of ['lower-partial', 'unavailable-shield', 'defensive-critical-impenetrable']) {
  test('Mots clés × talents — fraîcheur exacte des règles consultées : ' + scenario, () => {
    isolated(`
      import assert from 'node:assert/strict';
      import {readFile} from 'node:fs/promises';
      import {createStore} from './js/core/store.js';
      import {getReferenceCatalogue,refreshReferences} from './js/core/reference-catalog.js';
      const scenario=${JSON.stringify(scenario)};
      const affected=scenario==='lower-partial'?'partielle':scenario==='unavailable-shield'?'protectrice':'impenetrable';
      const armour=(id,ap,locations,keywords=[])=>({id,kind:'armour',name:'Armure synthétique '+id,ap,locations,layer:'rigid',keywords});
      const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
      const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
      if(scenario==='lower-partial')t.equipment=[armour('better',3,['rightArm']),armour('lower',1,['rightArm'],[{id:'partielle',parameter:''}])];
      if(scenario==='unavailable-shield')t.equipment=[{id:'shield',kind:'shield',name:'Bouclier synthétique',ap:2,locations:[],layer:'none',keywords:[{id:'protectrice',parameter:'2'}]}];
      if(scenario==='defensive-critical-impenetrable')a.equipment=[armour('helmet',2,['head'],[{id:'impenetrable',parameter:''}])];
      const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
      await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-exact-source-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-exact-'+scenario,roll:23,
        action:{type:'attack',base:60,damage:4,qualities:[]},
        defense:{base:scenario==='defensive-critical-impenetrable'?70:30,roll:scenario==='defensive-critical-impenetrable'?33:47,v5:{kind:'melee'}},
        ...(scenario==='unavailable-shield'?{protectionContext:{shieldId:'shield',shieldAvailable:false,opposedWithShield:true}}:{}),
        defenderCriticalRolls:{location:2,effect:20},v5:{kind:'melee'}});
      assert.equal(p.unresolved.length,0);assert.ok(p.damage);
      if(scenario==='lower-partial'){
        assert.equal(p.protection.ap,3);assert.ok(p.protection.ignored.some(row=>row.item.id==='lower'));
        assert.equal(p.damage.finalDamage,4);
      }
      if(scenario==='unavailable-shield'){
        assert.equal(p.defenderTest.sl,-1);assert.equal(p.protection.shieldAp,0);assert.equal(p.damage.finalDamage,7);
      }
      if(scenario==='defensive-critical-impenetrable'){
        assert.equal(p.defenderTest.critical,true);assert.equal(p.defenderCritical,null);
        assert.ok(p.mechanics.some(row=>row.id==='impenetrable'));
      }else assert.equal(p.mechanics.some(row=>row.id===affected),false,'mot clé jamais évalué ne périme pas l’action');
      const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
      const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
      const oldText=getReferenceCatalogue().keywords.find(row=>row.id===affected).effect;
      const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{
        const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');
        if(sheet==='Mots Clés Armes et Armures'){assert.ok(csv.includes(oldText));csv=csv.replace(oldText,'Effet synthétique modifié pour la fraîcheur exacte.');}
        return {ok:true,text:async()=>csv};
      }});
      assert.equal(refreshed.ok,true,refreshed.status?.error);
      const result=await store.applyResolution(p);
      if(scenario==='defensive-critical-impenetrable'){
        assert.equal(result.status,'manual');assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
      }else{
        assert.equal(result.status,'applied');assert.equal(store.listParticipants().find(row=>row.id==='t').hp,scenario==='lower-partial'?36:33);
        assert.equal(store.getLog()[0].detail.damage.finalDamage,scenario==='lower-partial'?4:7);
        for(const participant of capture().combat.participants){const original=before.combat.participants.find(row=>row.id===participant.id);assert.deepEqual(participant.equipment,original.equipment);}
      }
    `);
  });
}

test('Mots clés × talents — Dévastatrice garde zéro aux dizaines, dégâts opposés et Coup puissant avant protection', async () => {
  const target = person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } });
  const actor = person('a', { talents: talents('Coup puissant', 'Tir précis') });
  const action = attack({ qualities: ['devastatrice'] });
  const defense = { base: 40, roll: 32, v5: { kind: 'melee' } };
  for (const [roll, margin, damage] of [[20, 3, 4], [30, 2, 3], [40, 1, 2], [50, 0, 1]]) {
    const p = previewResolution(raw({ actor, target, action, defense, roll }));
    assert.equal(p.opposition.netSl, margin); assert.equal(p.damage.sl, margin);
    assert.equal(p.damage.talentDamage, 1); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.damage.targetArmour, 1); assert.equal(p.damage.be, 3);
  }
  const { store } = await setup(actor, target);
  const before = snapshotStore(store);
  const p = store.previewResolution(storeInput({ roll: 20, action, defense }));
  assert.equal(p.sl, 4); assert.equal(p.damage.sl, 3); assert.equal(p.damage.finalDamage, 4);
  assert.deepEqual(snapshotStore(store), before);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 36);
  const detail = store.getLog()[0].detail;
  assert.equal(detail.sl, 4); assert.equal(detail.damage.sl, 3); assert.equal(detail.damage.talentDamage, 1);
  assert.equal(detail.damage.finalDamage, 4);
  await store.undo(); assert.deepEqual(snapshotStore(store).combat.participants, before.combat.participants);
});

test('Mots clés × talents — Dévastatrice zéro au tir conserve DR et Tir précis avant les PA', () => {
  const target = person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } });
  for (const [roll, dr, damage] of [[20, 4, 6], [30, 3, 5], [40, 2, 4], [60, 0, 2]]) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis', 'Coup puissant') }),
      target, roll, defense: undefined, action: attack({ qualities: ['devastatrice'] }), v5: { kind: 'ranged', aimed: true } }));
    assert.equal(p.success, true); assert.equal(p.sl, dr); assert.equal(p.damage.sl, dr);
    assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.damage.paEffectif, 1); assert.equal(p.damage.absorption, 4);
  }
});

test('Mots clés × talents — Dévastatrice utilise encore unités non nulles et Inoffensive annule le remplacement', () => {
  const actor = person('a', { talents: talents('Coup puissant') });
  const target = person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } });
  const defense = { base: 40, roll: 32, v5: { kind: 'melee' } };
  for (const [roll, units, damage] of [[23, 3, 4], [28, 8, 9]]) {
    const input = raw({ actor, target, defense, roll, action: attack({ base: 50, qualities: ['devastatrice'] }) });
    const p = previewResolution(input);
    assert.equal(p.opposition.netSl, 2); assert.equal(p.damage.sl, units);
    assert.equal(p.damage.talentDamage, 1); assert.equal(p.damage.finalDamage, damage);
    const harmless = previewResolution({ ...input, action: { ...input.action, qualities: ['devastatrice', 'inoffensive'] } });
    assert.equal(harmless.damage.sl, 2); assert.equal(harmless.damage.talentDamage, 1);
    assert.equal(harmless.damage.paEffectif, 2); assert.equal(harmless.damage.finalDamage, 2);
  }
  const zero = previewResolution(raw({ actor, target, defense, roll: 20,
    action: attack({ qualities: ['devastatrice', 'inoffensive'] }) }));
  assert.equal(zero.damage.sl, 3); assert.equal(zero.damage.talentDamage, 1);
  assert.equal(zero.damage.paEffectif, 2); assert.equal(zero.damage.finalDamage, 3);
});

test('Mots clés × talents — Dévastatrice prend le chiffre du jet retenu après choix ou inversion forcée', () => {
  const actor = person('a', { talents: talents('Mains agiles', 'Coup puissant') });
  const target = person('t', { armor: { head: 1, body: 3, arms: 2, legs: 1 } });
  const defense = { base: 40, roll: 32, v5: { kind: 'melee' } };
  const action = base => attack({ base, qualities: ['devastatrice'],
    extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } });
  for (const [initialRoll, base, choice, finalRoll, margin, damageDr, damage] of [
    [20, 60, 'keep', 20, 3, 3, 5], [20, 60, 'reverse', 2, 5, 5, 6],
    [61, 70, 'keep', 61, 0, 1, 2], [61, 70, 'reverse', 16, 5, 6, 6]
  ]) {
    const p = previewResolution(raw({ actor, target, defense, roll: initialRoll, action: action(base),
      v5: { kind: 'melee', choice, context: { touchingOpponent: true } } }));
    assert.equal(p.roll, finalRoll); assert.equal(p.opposition.netSl, margin); assert.equal(p.damage.sl, damageDr);
    assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.test.advantage.net, 1);
  }
  const forced = previewResolution(raw({ actor, target, defense, roll: 2, action: action(60),
    v5: { kind: 'melee', context: { touchingOpponent: true },
      disadvantageSources: [{ id: 'synthetic-first' }, { id: 'synthetic-second' }] } }));
  assert.equal(forced.roll, 20); assert.equal(forced.test.optionId, 'reverse'); assert.equal(forced.test.advantage.net, -1);
  assert.equal(forced.damage.sl, 3); assert.equal(forced.damage.talentDamage, 1); assert.equal(forced.damage.finalDamage, 4);
});

test('Mots clés × talents — Dévastatrice max littéral peut porter DR négatif à zéro sans transformer un échec', () => {
  const zero = computeDamage({ weaponDamage: 4, sl: -3, roll: 20, targetToughnessBonus: 3, targetArmour: 1, qualities: ['devastatrice'] });
  assert.equal(zero.sl, 0); assert.equal(zero.net, 0); assert.equal(zero.finalDamage, 1);
  const positive = computeDamage({ weaponDamage: 4, sl: -3, roll: 23, targetToughnessBonus: 3, targetArmour: 1, qualities: ['devastatrice'] });
  assert.equal(positive.sl, 3); assert.equal(positive.finalDamage, 3);
  const harmless = computeDamage({ weaponDamage: 4, sl: -3, roll: 20, targetToughnessBonus: 3, targetArmour: 1,
    qualities: ['devastatrice', 'inoffensive'] });
  assert.equal(harmless.sl, -3); assert.equal(harmless.finalDamage, 0);
  const hit = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }),
    target: person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } }), roll: 20, defense: undefined,
    action: attack({ base: 0, qualities: ['devastatrice'] }),
    v5: { kind: 'ranged', aimed: true, context: { targetCannotDefend: true, pointBlank: true } } }));
  assert.equal(hit.hit, true); assert.equal(hit.success, false); assert.equal(hit.sl, -2);
  assert.equal(hit.damage.sl, 0); assert.equal(hit.damage.finalDamage, 1);
  assert.equal(hit.damage.talentDamage, undefined, 'Tir précis requiert sa propre réussite');
});
