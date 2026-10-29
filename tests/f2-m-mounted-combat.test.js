import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { applyResolution, previewResolution } from '../js/core/resolution.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { fixture as spellFixture, input as spellInput, contractFor } from './helpers/lot3-catalogue-fixture.js';
import {
  resolveMountedMount, planMountedAttack, planMountedDodge,
  planMountedChargeDamage, planMountedFall
} from '../js/core/v5-mounted-combat.js';

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
