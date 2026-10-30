import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { previewResolution, applyResolution } from '../../../js/core/resolution.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { fixture as spellFixture, input as spellInput, contractFor } from '../../helpers/lot3-catalogue-fixture.js';
import { resolveMountedMount, planMountedAttack, planMountedDodge, planMountedChargeDamage, planMountedFall } from '../../../js/core/v5-mounted-combat.js';
import { acquireV5Conditions, recoverV5Condition } from '../../../js/core/v5-effects.js';
import { applyGrappleAction, applyGrappleInitiation, previewGrappleAction, previewGrappleInitiation, previewGrappleTurnActionGate, V5_GRAPPLING_RULE_VERSION } from '../../../js/core/v5-grappling.js';

describe('Monture caractérisation', () => {
const clone = value => structuredClone(value);

const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'rider' ? 'pj' : 'ennemi', zone: 'active', initiative: 50,
  hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 40, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } },
  ...extra
});

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}

test('F2-M caractérisation — la pénalité Esquive montée manuelle reste portée par la défense', () => {
  const preview = previewResolution({
    actor: person('attacker'), target: person('rider'), roll: 25,
    action: { type: 'attack', attr: 'CC', base: 50, damage: 4 },
    defense: { base: 40, roll: 70, label: 'Esquive', v5: { kind: 'test', context: { penalties: { mounted: -2 } } } },
    v5: { kind: 'melee' }
  });
  const penalty = preview.defenderTest.details.modifiers.find(row => row.id === 'penalty:mounted');
  assert.equal(penalty?.amount, -2);
  assert.equal(preview.test.details.modifiers.some(row => row.id === 'penalty:mounted'), false,
    'la pénalité de monture ne doit pas fuiter sur le Test de l’attaquant');
});

test('F2-M caractérisation — le marqueur monté existant survit à update, persistance et rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [], log: [], diceLines: [],
    extensions: { v5: { combatId: 'f2-m-characterization', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'rider', order: ['rider', 'mount'], participants: [
      person('rider', { extensions: { v5: { hasMomentum: false, mounted: true } } }),
      person('mount', { kind: 'Créature', camp: 'pj', size: 'large' })
    ] }
  });

  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, true);
  assert.equal((await store.updateParticipant('rider', { initiative: 51 })).ok, true);
  assert.equal(persistence.read().combat.participants.find(row => row.id === 'rider').extensions.v5.mounted, true);

  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, true);
});
});

describe('Combat monté', () => {
const actor = (id, { size = 'average', strength = 40, mounted = false, mountId, talents = [], states = [] } = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'attacker' ? 'pj' : 'ennemi', zone: 'active', size,
  hp: 20, maxHp: 20, caracs: { CC: 60, CT: 40, F: strength, E: 40, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [], talents, states, equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { mounted, ...(mountId ? { mountId } : {}) } }
});
const horse = (id = 'horse', { size = 'large', strength = 50, traits = [] } = {}) => ({
  id, kind: 'Créature', zone: 'active', size, caracs: { F: strength }, traits, states: []
});
const catalogWeapon = (category, reach = 'Moyenne') => ({ category, reach });
const hasSource = (rows, id) => rows.some(row => row.id === id);
const clone = value => structuredClone(value);
function memoryPersistence() { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }, read() { return saved && clone(saved); } }; }

test('F2-M — résolution du lien monté requiert une monture réelle et laisse les démontés inchangés', () => {
  const unmounted = actor('rider');
  assert.deepEqual(resolveMountedMount(unmounted, [unmounted, horse()]), { mounted: false, mount: null, unresolved: [] });

  const missingLink = actor('rider', { mounted: true });
  assert.ok(resolveMountedMount(missingLink, [missingLink]).unresolved.some(row => /monture/i.test(row)));
  assert.deepEqual(planMountedAttack({ actor: missingLink, target: actor('target'), weapon: catalogWeapon('Corps à corps') }),
    { active: true, advantageSources: [], disadvantageSources: [], unresolved: [] },
    'un lien de monture absent ne bloque pas une attaque sans clause qui l’exige');
  const linked = actor('rider', { mounted: true, mountId: 'horse' });
  assert.equal(resolveMountedMount(linked, [linked, horse()]).mount.id, 'horse');
  assert.ok(resolveMountedMount(linked, [linked]).unresolved.some(row => /introuvable/i.test(row)));
  assert.ok(resolveMountedMount(linked, [linked, { ...horse(), zone: 'bench' }]).unresolved.some(row => /active/i.test(row)));
  const legacyMounted = actor('legacy-rider', { mounted: true });
  const legacyAttack = planMountedAttack({ actor: actor('attacker'), target: legacyMounted, weapon: catalogWeapon('Corps à corps') });
  assert.deepEqual(legacyAttack.unresolved, [], 'le drapeau monté historique sans lien ne bloque pas une attaque ordinaire et ne suppose aucune taille');
  const brokenExplicitLink = actor('broken-rider', { mounted: true, mountId: 'missing-horse' });
  assert.ok(planMountedAttack({ actor: actor('attacker'), target: brokenExplicitLink, weapon: catalogWeapon('Corps à corps') }).unresolved.some(row => /Monture liée/i.test(row)));
});

test('F2-M — arme de Cavalerie donne Élan contre une cible plus petite que la monture', () => {
  const rider = actor('rider', { mounted: true, mountId: 'horse' });
  const mount = horse();
  const small = actor('small-target', { size: 'small' });
  const sameSize = actor('large-target', { size: 'large' });
  const cavalry = planMountedAttack({ actor: rider, target: small, actorMount: mount, weapon: catalogWeapon('Cavalerie') });
  assert.equal(cavalry.advantageSources.length, 1);
  assert.ok(hasSource(cavalry.advantageSources, 'mounted:cavalry-against-smaller'));
  assert.equal(planMountedAttack({ actor: rider, target: sameSize, actorMount: mount, weapon: catalogWeapon('Cavalerie') }).advantageSources.length, 0);
  assert.equal(planMountedAttack({ actor: rider, target: small, actorMount: mount, weapon: catalogWeapon('Corps à corps') }).advantageSources.length, 0);
  assert.equal(planMountedAttack({ actor: actor('foot'), target: small, mount, weapon: catalogWeapon('Cavalerie') }).active, false);

  const unknown = actor('unknown-target', { size: null });
  const blocked = planMountedAttack({ actor: rider, target: unknown, actorMount: mount, weapon: catalogWeapon('Cavalerie') });
  assert.equal(blocked.advantageSources.length, 0);
  assert.ok(blocked.unresolved.some(row => /Choisir explicitement la taille/i.test(row)));
  const chosen = planMountedAttack({ actor: rider, target: unknown, actorMount: mount, weapon: catalogWeapon('Cavalerie'),
    sizeChoices: { target: 'small', actorMount: 'large' } });
  assert.equal(chosen.unresolved.length, 0);
  assert.equal(chosen.advantageSources.length, 1, 'le choix MJ explicite tranche la règle sans taille supposée');
});

test('F2-M — attaquer le cavalier plus petit impose Désavantage sauf portée Longue ou supérieure', () => {
  const mount = horse();
  const defender = actor('rider', { mounted: true, mountId: 'horse', size: 'average' });
  const attacker = actor('small-attacker', { size: 'small' });
  const medium = planMountedAttack({ actor: attacker, target: defender, targetMount: mount, weapon: catalogWeapon('Corps à corps', 'Moyenne') });
  assert.equal(medium.disadvantageSources.length, 1);
  assert.ok(hasSource(medium.disadvantageSources, 'mounted:protected-rider'));
  for (const reach of ['Longue', 'Très longue', 'Massive']) {
    assert.equal(planMountedAttack({ actor: attacker, target: defender, targetMount: mount, weapon: catalogWeapon('Corps à corps', reach) }).disadvantageSources.length, 0);
  }
  assert.equal(planMountedAttack({ actor: actor('large-attacker', { size: 'large' }), target: defender, targetMount: mount, weapon: catalogWeapon('Corps à corps') }).disadvantageSources.length, 0);
});

test('F2-M — l’Esquive montée est pénalisée sauf Trick Rider selon la décision du MJ', () => {
  const rider = actor('rider', { mounted: true });
  const penalty = planMountedDodge(rider);
  assert.equal(penalty.disadvantageSources.length, 1);
  assert.ok(hasSource(penalty.disadvantageSources, 'mounted:dodge'));
  assert.ok(hasSource(planMountedDodge(actor('unresolved', { mounted: true, talents: [{ id: 'talent-roughrider', status: 'unresolved' }] })).disadvantageSources, 'mounted:dodge'),
    'un talent non résolu ne donne pas l’exception');
  assert.equal(planMountedDodge(actor('rider', { mounted: true, talents: [{ id: 'talent-roughrider', status: 'resolved' }] })).disadvantageSources.length, 1,
    'Cavalier émérite ne remplace pas Trick Rider');
  assert.equal(planMountedDodge(actor('rider', { mounted: true, talents: [{ id: 'talent-trick-rider', status: 'resolved' }] })).disadvantageSources.length, 0);
  assert.equal(planMountedDodge(actor('rider')).disadvantageSources.length, 0);
});

test('F2-M intégration — vraie Lance de cavalerie ajoute Élan contre une cible plus petite que la monture', () => {
  const catalogue = getReferenceCatalogue();
  const lance = catalogue.items.find(row => row.kind === 'weapon' && row.name === 'Lance de cavalerie');
  assert.ok(lance, 'l’objet d’essai vient du catalogue réel');
  const rider = actor('attacker', { mounted: true, mountId: 'horse' });
  rider.equipment = [lance];
  const target = actor('target', { size: 'small' });
  const mount = horse();
  const preview = previewResolution({ actor: rider, target, action: { type: 'attack', attr: 'CC', base: 60, damage: 5,
    extensions: { fiche: { equipmentId: lance.id } } }, roll: 25, v5: { kind: 'melee' },
    v5State: { participants: [rider, target, mount] } });
  assert.ok(preview.test.advantage.advantage.some(row => row.id === 'mounted:cavalry-against-smaller'));
});

test('F2-M intégration — attaque contre cavalier applique Désavantage sur Esquive avec ID de compétence', () => {
  const rider = actor('target', { mounted: true, mountId: 'horse', talents: [] });
  const attacker = actor('attacker', { size: 'small' });
  const dagger = getReferenceCatalogue().items.find(row => row.kind === 'weapon' && row.name === 'Dague');
  assert.ok(dagger, 'l’objet d’essai vient du catalogue réel');
  attacker.equipment = [dagger];
  const mount = horse();
  const preview = previewResolution({ actor: attacker, target: rider,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: dagger.id } } }, roll: 25,
    defense: { base: 55, roll: 75, label: 'Esquive', extensions: { fiche: { skillId: 'skill-45_73_71_75_69_76_65-base' } }, v5: { kind: 'test', context: { penalties: { mounted: -2 } }, disadvantageSources: [{ id: 'mounted:dodge', label: 'ancien Désavantage monté' }] } },
    v5: { kind: 'melee' }, v5State: { participants: [attacker, rider, mount] } });
  assert.ok(preview.defenderTest.advantage.disadvantage.some(row => row.id === 'mounted:dodge'));
  assert.equal(preview.defenderTest.advantage.disadvantage.filter(row => row.id === 'mounted:dodge').length, 1, 'une ancienne source n’est pas dupliquée');
  assert.equal(preview.defenderTest.details.modifiers.some(row => row.id === 'penalty:mounted'), false, 'le vieux −2 DR est remplacé, même depuis le context sauvegardé');
  assert.ok(preview.test.advantage.disadvantage.some(row => row.id === 'mounted:protected-rider'));

  const exemptRider = actor('target', { mounted: true, mountId: 'horse', talents: [{ id: 'talent-trick-rider', status: 'resolved' }] });
  const exemptPreview = previewResolution({ actor: attacker, target: exemptRider,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: dagger.id } } }, roll: 25,
    defense: { base: 55, roll: 75, label: 'Esquive', extensions: { fiche: { skillId: 'skill-45_73_71_75_69_76_65-base' } }, v5: { kind: 'test', context: { penalties: { mounted: -2 } } } },
    v5: { kind: 'melee' }, v5State: { participants: [attacker, exemptRider, mount] } });
  assert.equal(exemptPreview.defenderTest.advantage.disadvantage.some(row => row.id === 'mounted:dodge'), false,
    'Trick Rider résolu garde son exemption');
  assert.equal(exemptPreview.defenderTest.details.modifiers.some(row => row.id === 'penalty:mounted'), false,
    'l’ancien −2 est retiré même lorsque le talent exempte du Désavantage automatique');
});

test('F2-M intégration — critique défensif qui donne Sonné au cavalier réclame Chevaucher avant calcul final', () => {
  const rider = actor('attacker', { mounted: true, mountId: 'horse' }), defender = actor('target');
  const mount = horse('horse');
  const input = { actor: rider, target: defender, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 22,
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } },
    criticalRolls: { location: 57, effect: 65 }, defenderCriticalRolls: { location: 4, effect: 20 },
    v5: { kind: 'melee' }, v5State: { participants: [rider, defender, mount] } };
  const missing = previewResolution(input);
  assert.ok(missing.defenderCritical.application.states.some(row => row.key === 'sonne'));
  assert.ok(missing.unresolved.some(text => /Chevaucher requis/.test(text)));
  assert.equal(missing.mountedFall?.[0]?.participantId, rider.id);
  const resolved = previewResolution({ ...input, v5: { kind: 'melee', context: { mountedRideScore: 55, mountedRideRoll: 40 } } });
  assert.ok(!resolved.unresolved.some(text => /Chevaucher requis/.test(text)));
  assert.equal(resolved.mountedFall?.[0]?.test?.success, true);
  assert.equal(resolved.mountedFall?.[0]?.dismount, false);
});

test('F2-M reprise — une résolution demande un d100 distinct à chaque cavalier touché', () => {
  const attacker = actor('a', { mounted: true, mountId: 'ma' });
  const defender = actor('t', { mounted: true, mountId: 'mt' });
  const mountA = horse('ma'), mountT = horse('mt');
  const input = { actor: attacker, target: defender,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 22,
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } },
    criticalRolls: { location: 1, effect: 20 }, defenderCriticalRolls: { location: 4, effect: 20 },
    v5: { kind: 'melee' }, v5State: { participants: [attacker, defender, mountA, mountT] } };
  const missing = previewResolution(input);
  assert.deepEqual(missing.mountedFall.map(row => row.participantId).sort(), ['a', 't']);
  assert.equal(missing.mountedFall.filter(row => row.unresolved?.some(text => /Test de Chevaucher requis/.test(text))).length, 2);
  const answered = previewResolution({ ...input, v5: { kind: 'melee', context: {
    mountedRideTestsById: { a: { score: 55, roll: 99 }, t: { score: 45, roll: 10 } }
  } } });
  assert.deepEqual(Object.fromEntries(answered.mountedFall.map(row => [row.participantId, row.test?.roll])), { t: 10, a: 99 });
  assert.equal(answered.unresolved.some(text => /Chevaucher requis/.test(text)), false);
});

test('F2-M intégration — chute mortelle explicitement confirmée démonte le cavalier et retire le lien', () => {
  const attacker = actor('attacker');
  const rider = actor('rider', { mounted: true, mountId: 'horse', states: [{ id: 'unconscious', key: 'inconscient', name: 'Inconscient', level: 1 }] });
  const mount = horse('horse');
  const dagger = getReferenceCatalogue().items.find(row => row.kind === 'weapon' && row.name === 'Dague');
  attacker.equipment = [dagger];
  const preview = previewResolution({ actor: attacker, target: rider,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: dagger.id } } }, roll: 25,
    v5: { kind: 'melee', context: { lethalIntent: true, lethalTableEnabled: true, confirmLethalDeath: true } },
    v5State: { participants: [attacker, rider, mount] } });
  assert.equal(preview.mountedFall?.[0]?.event, 'rider-dead');
  const applied = applyResolution(preview, { revision: preview.baseRevision,
    participants: [preview.input.actor, preview.input.target, mount], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  const appliedRider = applied.state.participants.find(row => row.id === 'rider');
  assert.equal(appliedRider.extensions.v5.mounted, false);
  assert.equal(appliedRider.extensions.v5.mountId, undefined);
});

test('F2-M intégration — une empoignade réussie sur un cavalier déclenche Chevaucher puis l’opposition de Force à Taille de monture', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const holder = actor('holder'); holder.camp = 'pj'; holder.caracs.F = 70; holder.skills = [{ id: 'bh', name: 'Bagarre', total: 60, status: 'resolved' }, { id: 'fh', name: 'Force', total: 70, status: 'resolved' }];
  const rider = actor('rider', { mounted: true, mountId: 'horse', strength: 30 }); rider.camp = 'npc'; rider.skills = [{ id: 'bt', name: 'Bagarre', total: 50, status: 'resolved' }, { id: 'ft', name: 'Force', total: 30, status: 'resolved' }];
  const mount = horse('horse');
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'f2-m-grapple' } },
    combat: { round: 1, currentActorId: 'holder', order: ['holder','rider','horse'], participants: [holder,rider,mount] } });
  const preview = store.previewResolution({ actorId: 'holder', targetId: 'rider',
    action: { id: 'act-bh', type: 'attack', attr: 'CC', base: 50, damage: 4, extensions: { fiche: { skillId: 'bh' } } }, roll: 1,
    defense: { type: 'skill', attr: 'CC', base: 50, roll: 70, label: 'Bagarre', v5: { kind: 'melee', choice: 'keep', context: { skillId: 'bt' } } },
    v5: { kind: 'melee', choice: 'reverse', context: { skillId: 'bh', grappleDeclared: true, mountedRideScore: 55, mountedRideRoll: 25,
      mountedForceRolls: { holder: 20, rider: 50 }, mountedSizeChoices: { actor: 'average', targetMount: 'large' } } } });
  assert.equal(preview.grapple?.won, true);
  assert.equal(preview.mountedFall?.[0]?.event, 'rider-restrained');
  assert.equal(preview.mountedFall?.[0]?.requiredTest?.modifier, 0);
  assert.equal(preview.mountedFall?.[0]?.opposedStrengthSize, 'mount');
  assert.equal(preview.mountedFall?.[0]?.test?.success, true);
  assert.equal(preview.mountedFall?.[0]?.strengthOpposition?.winner, 'rider', 'la taille Grande de la monture renverse l’opposition Force favorable au holder en Taille Moyenne');
  assert.equal(preview.mountedFall?.[0]?.strengthOpposition?.sizeAutomatic, true);
});

test('F2-M — BF de la monture ne remplace la BF du cavalier qu’en charge montée', () => {
  const rider = actor('rider', { mounted: true, mountId: 'horse', strength: 30 });
  const mount = horse('horse', { strength: 50 });
  assert.deepEqual(planMountedChargeDamage({ actor: rider, mount, charging: true, useMountStrengthBonus: true }), { available: true, useMountStrengthBonus: true, strengthBonus: 5, unresolved: [] });
  assert.equal(planMountedChargeDamage({ actor: rider, mount, charging: true }).useMountStrengthBonus, false,
    'l’emploi de la BF de monture reste le choix du cavalier');
  assert.equal(planMountedChargeDamage({ actor: rider, mount, charging: false }).useMountStrengthBonus, false);
  const dagger = getReferenceCatalogue().items.find(row => row.kind === 'weapon' && row.name === 'Dague');
  rider.equipment = [dagger];
  const preview = previewResolution({ actor: rider, target: actor('target'), action: { type: 'attack', attr: 'CC', base: 60, damage: 'BF+2',
    extensions: { fiche: { equipmentId: dagger.id } } }, roll: 25,
    v5: { kind: 'melee', charging: true, context: { useMountStrengthBonus: true } }, v5State: { participants: [rider, mount] } });
  assert.equal(preview.damage.strengthBonus, 5, 'la BF de monture remplace la BF du cavalier dans les dégâts de la charge');
  assert.equal(planMountedChargeDamage({ actor: rider, mount: null, charging: true }).unresolved.length, 0,
    'aucun lien de monture ne bloque la charge tant que le joueur ne choisit pas sa BF');
  assert.ok(planMountedChargeDamage({ actor: rider, mount: null, charging: true, useMountStrengthBonus: true }).unresolved.length);
  for (const force of [null, undefined, '']) {
    assert.ok(planMountedChargeDamage({ actor: rider, mount: { ...horse(), caracs: { F: force } }, charging: true, useMountStrengthBonus: true }).unresolved.length,
      `Force absente ${String(force)} ne doit pas devenir BF 0`);
  }
});

test('F2-M — chutes mortelles, Inconscient ou À Terre désarçonnent sauf équipement confirmé', () => {
  for (const event of ['rider-dead', 'rider-unconscious', 'rider-prone', 'mount-dead', 'mount-unconscious', 'mount-prone']) {
    assert.equal(planMountedFall({ event }).falls, true, event);
    assert.equal(planMountedFall({ event, fallPreventedByEquipment: true }).falls, event.startsWith('rider-') ? false : true, event);
  }
});

test('F2-M — Surpris, Sonné et monture Craintive produisent les Tests de Chevaucher source', () => {
  const ride = 'skill-43_68_65_76_61_75_63_68_65_72-base';
  assert.deepEqual(planMountedFall({ event: 'rider-surprised' }).requiredTest, { skillId: ride, modifier: 4, purpose: 'stay-mounted' });
  assert.deepEqual(planMountedFall({ event: 'rider-stunned' }).requiredTest, { skillId: ride, modifier: 0, purpose: 'stay-mounted' });
  assert.deepEqual(planMountedFall({ event: 'mount-surprised', mountTraits: ['Craintif'] }).requiredTest,
    { skillId: ride, modifier: 4, purpose: 'stay-mounted' });
  assert.equal(planMountedFall({ event: 'mount-surprised', mountTraits: [] }).requiredTest, null);
});

test('F2-M — prise tenue/ancrée, lien et Enchevêtré exigent les Tests conditionnels exacts', () => {
  const ride = 'skill-43_68_65_76_61_75_63_68_65_72-base';
  assert.deepEqual(planMountedFall({ event: 'rider-restrained', restraint: 'held' }).requiredTest,
    { skillId: ride, modifier: 0, purpose: 'keep-saddle-and-use-mount-size' });
  assert.deepEqual(planMountedFall({ event: 'rider-restrained', restraint: 'anchored' }).requiredTest,
    { skillId: ride, modifier: 0, purpose: 'keep-saddle-and-use-mount-size' });
  assert.deepEqual(planMountedFall({ event: 'mount-entangled', riderEntangled: false, mountTraits: ['Craintif'] }).requiredTest,
    { skillId: ride, modifier: 0, purpose: 'stay-mounted' });
  assert.equal(planMountedFall({ event: 'mount-entangled', riderEntangled: false, mountTraits: [] }).requiredTest, null);
  assert.equal(planMountedFall({ event: 'mount-entangled', riderEntangled: true, mountTraits: ['Craintif'] }).requiredTest, null,
    'monture et cavalier tous deux Enchevêtrés s’opposent normalement');
});

test('F2-M Store — lien monté validé, conservé après rechargement, nettoyage au banc/retrait, Undo/Redo', async () => {
  const persistence = memoryPersistence(), store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
    extensions: { v5: { combatId: 'f2-m-lifecycle', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'rider', order: ['rider', 'horse'], participants: [
      actor('rider'), horse('horse')
    ] }
  });
  await assert.rejects(store.setMountedState('rider', { mounted: true, mountId: 'missing' }), /monture/i);
  assert.equal((await store.setMountedState('rider', { mounted: true, mountId: 'horse' })).ok, true);
  const reload = createStore({ persistence, storage: null }); await reload.ready;
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, 'horse');

  await reload.updateParticipant('horse', { zone: 'bench' });
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, false);
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, undefined);
  await reload.undo();
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, 'horse');
  await reload.redo();
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, undefined);

  await reload.updateParticipant('horse', { zone: 'active' });
  await reload.setMountedState('rider', { mounted: true, mountId: 'horse' });
  await reload.restartCombat();
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, 'horse');
  await reload.removeParticipant('horse');
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, false);
  await reload.undo();
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, 'horse');
  await reload.redo();
  assert.equal(reload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, undefined);
  const finalReload = createStore({ persistence, storage: null }); await finalReload.ready;
  assert.equal(finalReload.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, undefined);
});

test('F2-M Store — retirer un ancien lien monté reste possible depuis le banc', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const rider = actor('rider', { mounted: true, mountId: 'horse' }); rider.zone = 'bench';
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
    combat: { round: 0, currentActorId: null, order: [], participants: [rider, horse('horse')] } });
  const receipt = await store.setMountedState('rider', { mounted: false });
  assert.equal(receipt.ok, true);
  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, false);
  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, undefined);
});

test('F2-M Store — Psychologie (Craintif) paramétré déclenche le Test réel sur monture surprise', async () => {
  const store = createStore({ storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'rider', order: ['rider', 'horse'], participants: [
      actor('rider'), { ...horse('horse'), traits: [{ name: 'Psychologie', param: 'Craintif' }] }
    ] } });
  await store.setMountedState('rider', { mounted: true, mountId: 'horse' });
  const missing = await store.acquireConditions('horse', ['Surpris']);
  assert.equal(missing.status, 'requires-input');
  assert.ok(missing.requests.some(row => row.field === 'mountedRideRoll:rider'));
  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, true, 'aucune mutation avant les données du Test');
  const applied = await store.acquireConditions('horse', ['Surpris'], { 'mountedRideScore:rider': 55, 'mountedRideRoll:rider': 99 });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.mountedFall[0].event, 'mount-surprised');
  assert.equal(applied.mountedFall[0].dismount, true);
  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, false);
});

test('F2-M embuscade — Surpris réclame Chevaucher avant application et démonte en cas d’échec', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const rider = actor('rider', { mounted: true, mountId: 'horse' }); rider.camp = 'ambush'; rider.initiative = 50;
  rider.caracs.I = 50; rider.skills = [{ id: 'skill-43_68_65_76_61_75_63_68_65_72-base', total: 55 }];
  const mount = horse('horse'); mount.camp = 'ambush'; mount.initiative = 30; mount.caracs.I = 30;
  const attacker = actor('attacker'); attacker.camp = 'heroes'; attacker.initiative = 40; attacker.caracs.I = 40;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 0, currentActorId: null, order: [], participants: [rider, mount, attacker] } });
  const request = { startCombat: true, surprisedCamp: 'ambush', characteristicById: { rider: 50, horse: 30, attacker: 40 }, diceById: { rider: 5, horse: 4, attacker: 3 } };
  const missing = store.previewCombatInitialization(request);
  assert.equal(missing.ready, false); assert.equal(missing.mountedFall?.[0]?.event, 'rider-surprised');
  assert.ok(missing.needsInput.some(row => row.field === 'mountedRideRoll:rider'));
  const answered = store.previewCombatInitialization({ ...request, mountedRideTests: { rider: { score: 55, roll: 95 } } });
  assert.equal(answered.ready, true, answered.needsInput.map(row => row.label).join(' '));
  assert.equal(answered.mountedFall[0].dismount, true);
  const applied = await store.applyCombatInitialization(answered);
  assert.equal(applied?.ok, true);
  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, false);
  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mountId, undefined);
});

test('F2-M sort — état Sonné prévu bloque l’application sans Chevaucher, puis applique la chute', async () => {
  const { store } = await spellFixture();
  const state = JSON.parse(store.getFullJSON());
  const rider = state.combat.participants.find(row => row.id === 'foe');
  rider.extensions.v5 = { ...(rider.extensions.v5 || {}), mounted: true, mountId: 'horse' };
  state.combat.participants.push({ id: 'horse', name: 'Horse', kind: 'Créature', camp: 'ennemi', zone: 'active', size: 'large',
    caracs: { F: 50 }, traits: [], states: [], skills: [], equipment: [] });
  await store.loadFromJSON(state);
  const input = spellInput('Choc', { actorId: 'mage', targetIds: ['foe'], sl: 12 });
  const missing = store.previewSpellExecution(contractFor('Choc').id, input);
  assert.equal(missing.ready, false, missing.error);
  assert.equal(missing.mountedFall?.[0]?.event, 'rider-stunned');
  assert.ok(missing.needsInput.some(row => row.field === 'mountedRideRoll:foe'));
  const noMutation = await store.applySpellExecution(contractFor('Choc').id, input);
  assert.equal(noMutation.status, 'requires-input');
  assert.equal(store.listParticipants().find(row => row.id === 'foe').states.some(row => row.key === 'sonne'), false);
  const answeredInput = { ...input, mountedRideTests: { foe: { score: 55, roll: 99 } } };
  const preview = store.previewSpellExecution(contractFor('Choc').id, answeredInput);
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.mountedFall[0].dismount, true);
  await store.applySpellExecution(contractFor('Choc').id, { ...answeredInput, preview });
  assert.equal(store.listParticipants().find(row => row.id === 'foe').extensions.v5.mounted, false);
  assert.equal(store.listParticipants().find(row => row.id === 'foe').extensions.v5.mountId, undefined);
  assert.ok(store.listParticipants().find(row => row.id === 'foe').states.some(row => row.key === 'sonne'));
});
});

describe('Empoignade caractérisation', () => {
test('F2-N caractérisation — Enchevêtré est un état V5 cumulable et sa récupération attend une opposition de Force', () => {
  const participant = { id: 'cible', name: 'Cible', states: [] };
  const first = acquireV5Conditions(participant, [{ name: 'Enchevêtré', level: 1, source: { kind: 'weapon', id: 'filet' } }]);

  assert.equal(participant.states.length, 0, 'l’acquisition travaille sur une copie');
  assert.equal(first.participant.states.find(state => state.key === 'enchevetre')?.level, 1);

  const second = acquireV5Conditions(first.participant, [{ name: 'Enchevêtré', level: 2, source: { kind: 'grapple', id: 'empoignade' } }]);
  assert.equal(second.participant.states.filter(state => state.key === 'enchevetre').reduce((sum, state) => sum + state.level, 0), 3);

  const missingTest = recoverV5Condition(second.participant, 'enchevetre', { method: 'opposed-strength' });
  assert.ok(missingTest.needsInput.some(item => item.field === 'recoveryTest'), 'la sortie réclame le résultat du Test opposé');
  assert.equal(missingTest.participant.states.filter(state => state.key === 'enchevetre').reduce((sum, state) => sum + state.level, 0), 3);

  const passedTest = recoverV5Condition(second.participant, 'enchevetre', {
    method: 'opposed-strength',
    test: { success: true, sl: 2 }
  });
  assert.equal(passedTest.participant.states.filter(state => state.key === 'enchevetre').reduce((sum, state) => sum + state.level, 0), 1, 'les DR retirent autant de niveaux que le Test en a obtenu');
});

test('F2-N caractérisation — sans déclaration, une Bagarre reste une attaque ordinaire', async () => {
  const { previewResolution } = await import('../../../js/core/resolution.js');
  const preview = previewResolution({
    actor: { id: 'attaquant', name: 'Attaquant', states: [] },
    target: { id: 'cible', name: 'Cible', hp: 12, states: [] },
    action: { id: 'bagarre', type: 'attack', base: 50, damage: 4, qualities: [] },
    v5: { kind: 'melee' },
    roll: 25,
    baseRevision: 0
  });

  assert.equal(preview.success, true);
  assert.ok(preview.damage, 'sans déclaration, l’attaque suit le chemin ordinaire');
  assert.equal(preview.grapple, undefined, 'aucune déclaration ne déclenche de prise');
});
});

describe('Empoignade garde préparatoire', () => {
const participant = (id, F = 40, states = []) => ({ id, name: id, hp: 20, maxHp: 20, caracs: { F, E: 30 }, states });
const attack = (winner = 'attacker') => ({
  attack: true, hit: winner === 'attacker', unresolved: [],
  opposition: { mode: 'opposed', winner, netSl: winner === 'attacker' ? 2 : -2 }
});
const link = (overrides = {}) => ({
  id: 'grapple:entry-1', resolutionId: 'entry-1', initiatorId: 'holder', targetId: 'held',
  status: 'active', ruleVersion: V5_GRAPPLING_RULE_VERSION, targetConditionIds: ['grapple-state'], ...overrides
});
const stateLevel = person => person.states
  .filter(row => row.key === 'enchevetre')
  .reduce((sum, row) => sum + row.level, 0);

test('F2-N garde préparatoire — première Action sous prise : Test de Force déclaré avant tout autre Action',()=>{
  const held=participant('held');held.extensions={v5:{grapples:[link()]}};
  assert.equal(previewGrappleTurnActionGate({actor:held,action:'damage',skillName:'Force'}).allowed,true);
  assert.match(previewGrappleTurnActionGate({actor:held,action:'damage',skillName:'Corps à corps'}).unresolved.join(' '),/première Action.*Force/);
  assert.match(previewGrappleTurnActionGate({actor:held,action:'attack',skillName:'Force',alreadySpentAction:true}).unresolved.join(' '),/avant toute autre Action/);
  assert.equal(previewGrappleTurnActionGate({actor:participant('free'),action:'attack',skillName:'Corps à corps'}).required,false);
});

test('F2-N — déclaration avant le jet : victoire crée une prise persistante et Enchevêtré sans dégâts', () => {
  const actor = participant('holder');
  const target = participant('held');
  assert.deepEqual(previewGrappleInitiation({ actor, target, declared: false }), { ruleVersion: V5_GRAPPLING_RULE_VERSION, handled: false });

  const plan = previewGrappleInitiation({
    actor, target, declared: true, eligibleBrawling: true, attack: attack(), resolutionId: 'entry-1', round: 1
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.won, true);
  assert.equal(plan.suppressOrdinaryDamage, true);
  assert.equal(plan.targetCondition.level, 1);
  assert.equal(plan.targetCondition.source.linkId, plan.link.id);

  const applied = applyGrappleInitiation(plan, target);
  assert.equal(applied.status, 'applied');
  assert.equal(stateLevel(applied.participant), 1);
  assert.equal(applied.participant.hp, target.hp);
  assert.equal(applied.link.targetConditionIds.length, 1);
  assert.equal(applied.participant.states[0].source.linkId, applied.link.id);
  assert.deepEqual(JSON.parse(JSON.stringify(applied.link)), applied.link, 'identité du lien sérialisable pour la sauvegarde');
  assert.equal(applyGrappleInitiation(plan, applied.participant).status, 'duplicate');
});

test('F2-N — l’échec ou une déclaration inadmissible ne crée aucun lien', () => {
  const actor = participant('holder');
  const target = participant('held');
  const failed = previewGrappleInitiation({
    actor, target, declared: true, eligibleBrawling: true, attack: attack('defender'), resolutionId: 'miss-1'
  });
  assert.equal(failed.status, 'opposition-lost');
  assert.equal(failed.link, null);
  assert.equal(failed.targetCondition, null);

  const inadmissible = previewGrappleInitiation({
    actor, target, declared: true, eligibleBrawling: false, attack: attack(), resolutionId: 'armed-1'
  });
  assert.equal(inadmissible.ready, false);
  assert.match(inadmissible.unresolved.join(' '), /Bagarre/);
  assert.equal(applyGrappleInitiation(inadmissible, target).participant, target);
});

test('F2-N — Test de Force gagné blesse de BF + DR - BE, ignore les PA et localise avec le jet', () => {
  const plan = previewGrappleAction({
    actor: participant('holder', 45), target: participant('held'), link: link(), action: 'damage',
    actorTest: { roll: 23, success: true, sl: 4 }, opponentTest: { roll: 72, success: true, sl: 1 },
    resolutionId: 'damage-1', round: 2
  });
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.effects[0], {
    type: 'damage', targetId: 'held', amount: 4, armourApplied: false,
    strengthBonus: 4, toughnessBonus: 3, netSL: 3,
    location: { roll: 32, name: 'Bras Droit', key: 'ARM' }
  });
  assert.equal(applyGrappleAction(plan, { actor: participant('holder', 45), target: participant('held'), link: link() }).damage.amount, 4);
});

test('F2-N — Bonus d’Endurance absent bloque les Blessures au lieu de les sous-calculer',()=>{
  const plan=previewGrappleAction({actor:participant('holder',40),target:{id:'held',states:[],caracs:{}},link:link(),action:'damage',actorTest:{roll:23,sl:2},opponentTest:{sl:0},resolutionId:'unknown-be'});
  assert.equal(plan.ready,false);assert.match(plan.unresolved.join(' '),/Bonus d’Endurance/);
});

test('F2-N — immobiliser ajoute un niveau, puis un par DR au-delà du premier', () => {
  const actor = participant('holder');
  const target = participant('held');
  const originalLink = link();
  const plan = previewGrappleAction({
    actor, target, link: originalLink, action: 'immobilize',
    actorTest: { roll: 40, success: true, sl: 3 }, opponentTest: { roll: 55, success: true, sl: 0 },
    resolutionId: 'hold-1', round: 2
  });
  assert.equal(plan.effects[0].condition.level, 3);
  assert.equal(stateLevel(target), 0, 'l’aperçu ne mute pas le participant');

  const applied = applyGrappleAction(plan, { actor, target, link: originalLink });
  assert.equal(applied.status, 'applied');
  assert.equal(stateLevel(applied.target), 3);
  assert.equal(applied.link.targetConditionIds.length, 2);
  assert.equal(stateLevel(target), 0);
  assert.equal(applyGrappleAction(plan, { actor, target: applied.target, link: applied.link }).status, 'duplicate');
});

test('F2-N — dégagement retire 1 + DR après le premier uniquement de l’Enchevêtré de cette prise', () => {
  const target = participant('held', 40, [
    { id: 'grapple-state', key: 'enchevetre', name: 'Enchevêtré', level: 3, source: { kind: 'grapple', linkId: 'grapple:entry-1' } },
    { id: 'net-state', key: 'enchevetre', name: 'Enchevêtré', level: 2, source: { kind: 'net' } }
  ]);
  const holder = participant('holder');
  const active = link();
  const plan = previewGrappleAction({
    actor: target, target: holder, link: active, action: 'escape',
    actorTest: { roll: 34, success: true, sl: 3 }, opponentTest: { roll: 77, success: true, sl: 1 },
    resolutionId: 'escape-1', round: 3
  });
  assert.equal(plan.effects[0].amount, 2);
  assert.equal(plan.endLink, false, 'un niveau appartenant au lien subsiste');

  const result = applyGrappleAction(plan, { actor: target, target: holder, link: active });
  assert.equal(stateLevel(result.actor), 3, 'un niveau du lien et deux niveaux étrangers subsistent');
  assert.equal(result.actor.states.find(row => row.id === 'net-state').level, 2, 'une entrave étrangère n’est pas retirée');
  assert.equal(result.link.status, 'active');
});

test('F2-N — dégagement retire les niveaux de toutes les occurrences liées avant de libérer la prise',()=>{
  const holder=participant('holder',40,[
    {id:'grapple-state-a',key:'enchevetre',name:'Enchevêtré',level:1,source:{kind:'grapple',linkId:'grapple:entry-1'}},
    {id:'foreign',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'net'}},
    {id:'grapple-state-b',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'grapple',linkId:'grapple:entry-1'}}
  ]),opponent=participant('held'),active=link({targetConditionIds:['grapple-state-a','grapple-state-b']});
  const plan=previewGrappleAction({actor:holder,target:opponent,link:active,action:'escape',actorTest:{roll:34,sl:4},opponentTest:{sl:0},resolutionId:'escape-all',round:3});
  assert.deepEqual(plan.effects.map(row=>[row.conditionId,row.amount]),[['grapple-state-a',1],['grapple-state-b',2]]);
  assert.equal(plan.endLink,true);
  const result=applyGrappleAction(plan,{actor:holder,target:opponent,link:active});
  assert.equal(result.link.status,'released');assert.equal(stateLevel(result.actor),2);
  assert.deepEqual(result.actor.states.map(row=>row.id),['foreign']);
});

test('F2-N caractérisation T2 bis — le dégagement de l’initiateur libère aussi le partenaire lié',()=>{
  const holder=participant('holder',40,[
    {id:'holder-grapple-state',key:'enchevetre',name:'Enchevêtré',level:1,source:{kind:'grapple',linkId:'grapple:entry-1'}}
  ]);
  const held=participant('held',40,[
    {id:'held-grapple-state',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'grapple',linkId:'grapple:entry-1'}}
  ]);
  const active=link({targetConditionIds:['held-grapple-state']});
  const plan=previewGrappleAction({actor:holder,target:held,link:active,action:'escape',
    actorTest:{roll:34,success:true,sl:2},opponentTest:{sl:0},resolutionId:'holder-escape',round:3});
  assert.equal(plan.endLink,true);
  const result=applyGrappleAction(plan,{actor:holder,target:held,link:active});
  assert.equal(result.link.status,'released');
  assert.equal(stateLevel(result.actor),0,'l’initiateur est libéré');
  assert.equal(stateLevel(result.target),0,'le partenaire est libéré par la clôture du même lien');
});

test('F2-N — perdre l’opposition laisse lien, Blessures et États inchangés', () => {
  const actor = participant('holder');
  const target = participant('held', 40, [{ id: 'grapple-state', key: 'enchevetre', level: 2, source: { kind: 'grapple', linkId: 'grapple:entry-1' } }]);
  const active = link();
  const before = structuredClone({ actor, target, active });
  const plan = previewGrappleAction({
    actor, target, link: active, action: 'immobilize',
    actorTest: { roll: 80, success: false, sl: -3 }, opponentTest: { roll: 20, success: true, sl: 2 },
    resolutionId: 'lose-1', round: 2
  });
  assert.equal(plan.won, false);
  assert.deepEqual(plan.effects, []);
  const result = applyGrappleAction(plan, { actor, target, link: active });
  assert.deepEqual(structuredClone({ actor: result.actor, target: result.target }), { actor: before.actor, target: before.target });
  assert.equal(result.link.status, 'active');
  assert.deepEqual(result.link.targetConditionIds, before.active.targetConditionIds);
  assert.ok(result.link.appliedActionIds.includes('lose-1'), 'la tentative est journalisable sans réussir l’action choisie');
});

test('F2-N — scénario sur trois Tours : engager, blesser, se dégager', () => {
  const holder = participant('holder', 40);
  let held = participant('held', 30);
  const entry = previewGrappleInitiation({
    actor: holder, target: held, declared: true, eligibleBrawling: true,
    attack: attack(), resolutionId: 'three-turn-entry', round: 1
  });
  const acquired = applyGrappleInitiation(entry, held);
  held = acquired.participant;
  let currentLink = acquired.link;
  assert.equal(stateLevel(held), 1);

  const injury = previewGrappleAction({
    actor: holder, target: held, link: currentLink, action: 'damage',
    actorTest: { roll: 43, success: true, sl: 3 }, opponentTest: { roll: 55, success: true, sl: 1 },
    resolutionId: 'three-turn-damage', round: 2
  });
  assert.equal(injury.effects[0].amount, 3);
  assert.equal(injury.effects[0].armourApplied, false);
  assert.equal(injury.effects[0].toughnessBonus,3);

  const escape = previewGrappleAction({
    actor: held, target: holder, link: currentLink, action: 'escape',
    actorTest: { roll: 40, success: true, sl: 2 }, opponentTest: { roll: 50, success: true, sl: 0 },
    resolutionId: 'three-turn-escape', round: 3
  });
  const released = applyGrappleAction(escape, { actor: held, target: holder, link: currentLink });
  held = released.actor;
  currentLink = released.link;
  assert.equal(stateLevel(held), 0);
  assert.equal(currentLink.status, 'released');
  assert.equal(JSON.parse(JSON.stringify({ held, currentLink })).currentLink.status, 'released');
});

test('F2-N — entrée sans jet ou Action sans opposition est bloquée sans mutation', () => {
  const missing = previewGrappleInitiation({ actor: participant('holder'), target: participant('held'), declared: true, eligibleBrawling: true });
  assert.equal(missing.ready, false);
  assert.ok(missing.unresolved.some(message => /Test opposé/.test(message)));

  const noOpposition = previewGrappleAction({ actor: participant('holder'), target: participant('held'), link: link(), action: 'damage', resolutionId: 'none' });
  assert.equal(noOpposition.ready, false);
  assert.ok(noOpposition.unresolved.some(message => /résultat du Test de Force opposé/.test(message)));
});
});

describe('Empoignade intégration', () => {
const clone=structuredClone;
const memory=()=>{let saved;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const fighter=(id,bagarre,force)=>({id,name:id,kind:'PJ',camp:id==='holder'?'pj':'npc',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30,Ag:30},states:[],skills:[{id:bagarre,name:'Bagarre',total:50},{id:force,name:'Force',total:40}],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:false}}});
const person=(store,id)=>store.listParticipants().find(row=>row.id===id);
const input=(store,{actorId,targetId,skillId,roll,defenseRoll,declared=false,grappleAction,defenseSkillId})=>({actorId,targetId,action:{id:`act-${skillId}`,type:'attack',attr:'CC',base:50,damage:4,extensions:{fiche:{skillId}}},roll,defense:{type:'skill',attr:'CC',base:50,roll:defenseRoll,label:'Bagarre',v5:{kind:'melee',choice:'keep',context:{skillId:defenseSkillId}}},v5:{kind:'melee',choice:'keep',context:{skillId,grappleDeclared:declared||undefined,grappleAction}}});
async function fixture(){
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'holder',order:['holder','held'],participants:[fighter('holder','bh','fh'),fighter('held','bt','ft')]},log:[],diceLines:[]});
 return{store,persistence};
}

test('F2-N intégré : trois Tours engagent, blessent sans PA, puis libèrent; Undo, Redo et reload gardent le lien',async()=>{
 const{store,persistence}=await fixture();
 let preview=store.previewResolution(input(store,{actorId:'holder',targetId:'held',skillId:'bh',defenseSkillId:'bt',roll:25,defenseRoll:70,declared:true}));
 assert.equal(preview.grapple.status,'grappled');
 const appliedEntry=await store.applyResolution(preview);assert.equal(appliedEntry.status,'applied',JSON.stringify({reason:appliedEntry.reason,unresolved:preview.unresolved,grapple:preview.grapple}));
 let held=person(store,'held'),holder=person(store,'holder');
 assert.equal(held.states.filter(row=>row.key==='enchevetre').reduce((n,row)=>n+row.level,0),1);
 assert.equal(held.hp,20,'prise sans Blessures ordinaires');
 assert.equal(holder.extensions.v5.grapples[0].status,'active');
 await store.setRoundTurn(2,'holder');
 preview=store.previewResolution(input(store,{actorId:'holder',targetId:'held',skillId:'fh',defenseSkillId:'ft',roll:30,defenseRoll:70,grappleAction:'damage'}));
 assert.equal(preview.grapple.status,'ready');
 assert.equal(preview.damage,null,'les dégâts armés ne s’appliquent pas dans l’empoignade');
 const appliedDamage=await store.applyResolution(preview);assert.equal(appliedDamage.status,'applied',JSON.stringify({reason:appliedDamage.reason,unresolved:preview.unresolved,grapple:preview.grapple}));
 assert.equal(person(store,'held').hp,13,'BF 4 + 6 DR - BE 3, sans PA');
 await store.setRoundTurn(3,'held');
 preview=store.previewResolution(input(store,{actorId:'held',targetId:'holder',skillId:'ft',defenseSkillId:'fh',roll:20,defenseRoll:70,grappleAction:'escape'}));
 assert.equal(preview.grapple.status,'ready');
 assert.ok(preview.test.details.modifiers.some(row=>row.id==='conditions'&&row.amount===-1),'Enchevêtré applique −1 DR au Test de Force d’empoignade impliquant un mouvement');
 const appliedEscape=await store.applyResolution(preview);assert.equal(appliedEscape.status,'applied',JSON.stringify({reason:appliedEscape.reason,unresolved:preview.unresolved,grapple:preview.grapple}));
 assert.equal(person(store,'holder').extensions.v5.grapples[0].status,'released');
 assert.equal(person(store,'held').states.filter(row=>row.key==='enchevetre').reduce((n,row)=>n+row.level,0),0);
 const released=clone(person(store,'holder').extensions.v5.grapples);
 assert.equal(await store.undo(),true);assert.equal(person(store,'holder').extensions.v5.grapples[0].status,'active');
 assert.equal(await store.redo(),true);assert.deepEqual(person(store,'holder').extensions.v5.grapples,released);
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.deepEqual(person(reloaded,'holder').extensions.v5.grapples,released);
});

test('F2-N intégré : quand l’initiateur se dégage, il libère aussi le participant tenu',async()=>{
 const{store}=await fixture(),link={id:'grapple:initiator-escape',initiatorId:'holder',targetId:'held',status:'active'};
 await store.updateParticipant('holder',{extensions:{v5:{grapples:[link]}}});
 await store.updateParticipant('held',{states:[{id:'held-by-link',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'grapple',linkId:link.id}}],extensions:{v5:{grapples:[link]}}});
 await store.setRoundTurn(2,'holder');
 const escape=input(store,{actorId:'holder',targetId:'held',skillId:'fh',defenseSkillId:'ft',roll:20,defenseRoll:70,grappleAction:'escape'});
 const preview=store.previewResolution(escape);assert.equal(preview.grapple.status,'ready');
 assert.equal((await store.applyResolution(preview)).status,'applied');
 assert.equal(person(store,'holder').extensions.v5.grapples[0].status,'released');
 assert.equal(person(store,'held').states.filter(row=>row.source?.linkId===link.id).length,0);
});

test('F2-N intégré : le double critique d’une prise réussie reste visible',async()=>{
 const{store}=await fixture();
 const preview=store.previewResolution(input(store,{actorId:'holder',targetId:'held',skillId:'bh',defenseSkillId:'bt',roll:22,defenseRoll:70,declared:true}));
 assert.equal(preview.grapple.status,'grappled');
 assert.ok(preview.critical,'l’empoignade supprime les Blessures ordinaires, pas le Coup critique du double');
});

test('F2-N intégré : recommencer un combat sans scène purge les liens d’empoignade',async()=>{
 const{store}=await fixture(),link={id:'grapple:restart',initiatorId:'holder',targetId:'held',status:'active'};
 await store.updateParticipant('holder',{extensions:{v5:{grapples:[link]}}});
 await store.updateParticipant('held',{states:[{id:'held-by-link',key:'enchevetre',name:'Enchevêtré',level:1,source:{kind:'grapple',linkId:link.id}}],extensions:{v5:{grapples:[link]}}});
 await store.restartCombat();
 assert.equal(person(store,'holder').extensions.v5.grapples,undefined);
 assert.equal(person(store,'held').extensions.v5.grapples,undefined);
 assert.deepEqual(person(store,'held').states,[]);
});

test('F2-N intégré : sous empoignade, le Tour bloque une autre Action et accepte la déclaration Force',async()=>{
 const{store}=await fixture();const link={id:'grapple:preexisting',initiatorId:'holder',targetId:'held',status:'active'};
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:2,currentActorId:'holder',order:['holder','held'],participants:[fighter('holder','bh','fh'),fighter('held','bt','ft')]},extensions:{v5:{combatId:'f2-n-turn-gate',turnIndex:2}},log:[],diceLines:[]});
 await store.updateParticipant('held',{states:[{id:'held-by-link',key:'enchevetre',name:'Enchevêtré',level:1,source:{kind:'grapple',linkId:link.id}}]});
 await store.updateParticipant('holder',{extensions:{v5:{hasMomentum:false,grapples:[link]}}});
 await store.updateParticipant('held',{extensions:{v5:{hasMomentum:false,grapples:[link]}}});
 const unrelated=input(store,{actorId:'holder',targetId:'held',skillId:'bh',defenseSkillId:'bt',roll:40,defenseRoll:70});
 const blocked=store.previewResolution(unrelated);
 assert.equal(blocked.ready,false);assert.equal(blocked.code,'F2_GRAPPLE_FIRST_ACTION');
 const force=input(store,{actorId:'holder',targetId:'held',skillId:'fh',defenseSkillId:'ft',roll:30,defenseRoll:70,grappleAction:'damage'});
 assert.equal(store.previewResolution(force).grapple?.status,'ready');
 const spent=await store.applyResolution(store.previewResolution(force));assert.equal(spent.status,'applied');
 assert.ok(person(store,'held').hp<20,'le Test Force déclaré applique les Blessures d’empoignade');
 assert.equal(await store.undo(),true);assert.equal(person(store,'held').hp,20,'Undo annule les dégâts du Test imposé');
});
});
