import test from 'node:test';
import assert from 'node:assert/strict';
import lots from '../docs/plans-gpt/f2/F2_LOTS.json' with { type: 'json' };
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import { F2_F_RULE_IDS, previewSupplementalEquipment } from '../js/core/v5-supplemental-equipment.js';
import { applyResolution, previewResolution } from '../js/core/resolution.js';
import { locationProtection } from '../js/core/equipment.js';
import { createStore } from '../js/core/store.js';
import { createV5ReloadState } from '../js/core/v5-reloading.js';

const row = id => ({ supplementalRuleId: id, id: `test:${id}`, name: id });
const actor = { id: 'actor', name: 'A', equipment: [] };
const target = { id: 'target', name: 'T' };

test('F2-F — each of the 17 selected source rows has an executable supplement clause', () => {
  assert.equal(lots['F2-F'].length, 17);
  assert.deepEqual(F2_F_RULE_IDS, lots['F2-F'].map(entry => entry.id));
  for (const id of F2_F_RULE_IDS) assert.equal(previewSupplementalEquipment({ item: row(id), actor, target })?.ruleId, id);
});

test('F2-F — all four skaven weapon exposures use the real wounded target and retain intensity/modifier', () => {
  const cases = [
    ['F-L11-0013', 'minor', 2], ['F-L11-0016', 'moderate', 0],
    ['F-L11-0017', 'minor', 0], ['F-L11-0018', 'minor', 0]
  ];
  for (const [id, influence, skillModifier] of cases) {
    const plan = previewSupplementalEquipment({ item: row(id), actor, target, hit: true, damage: { finalDamage: 1 } });
    assert.deepEqual([plan.exposure.participantId, plan.exposure.influence, plan.exposure.skillModifier, plan.exposure.thresholdTestRequired], [target.id, influence, skillModifier, true]);
    assert.equal(previewSupplementalEquipment({ item: row(id), actor, target, hit: true, damage: { finalDamage: 0 } }).exposure, null);
  }
});

test('F2-F — knife, antler blades, and dragon shards propose only the source effects on the required trigger', () => {
  const poison = previewSupplementalEquipment({ item: row('F-L11-0076'), actor, target, hit: true, damage: { finalDamage: 1 } });
  assert.match(poison.unresolved.join(' '), /Endurance.*−1 DR/);
  assert.deepEqual(previewSupplementalEquipment({ item: row('F-L11-0076'), actor, target, hit: true, damage: { finalDamage: 1 }, context: { supplementalPoisonTest: { success: false } } }).effects.map(effect => effect.state), ['Empoisonné']);
  assert.deepEqual(previewSupplementalEquipment({ item: row('F-L11-0079'), actor, target, critical: { id: 'critical' }, context: { antlerHandleOrigin: 'violent' } }).effects.map(effect => effect.participantId), ['target', 'actor']);
  assert.deepEqual(previewSupplementalEquipment({ item: row('F-L11-0083'), actor, target, hit: true, damage: { finalDamage: 1 } }).effects.map(effect => effect.state), ['Hémorragique']);
});

test('F2-F — tiger claws disguise a wound from a successful Brawling attack', () => {
  const item = row('F-L24-0008');
  const success = previewSupplementalEquipment({ item, actor, target, hit: true, damage: { finalDamage: 1 } });
  assert.equal(success.effects[0].disguiseAs, 'grand félin');
  assert.equal(previewSupplementalEquipment({ item, actor, target, hit: false, damage: { finalDamage: 0 } }).effects.length, 0);
});

test('F2-F — secret d10 exhausts the Fell Dagger poison and breaks it on its next use', () => {
  const linked = { ...row('F-L11-0076'), extensions: { v5: {} } };
  const firstUse = previewSupplementalEquipment({ item: linked, actor, target, used: true, context: { fellDaggerSecretRoll: 1 } });
  assert.deepEqual(firstUse.weaponDispositionUpdate, { itemId: linked.id, weaponDisposition: null, fellDaggerBreakNextUse: true });
  assert.equal(firstUse.unresolved.length, 0, 'le poison épuisé ne demande pas de Test d’Endurance');
  const secondUse = previewSupplementalEquipment({ item: { ...linked, extensions: { v5: { fellDaggerBreakNextUse: true } } }, actor, target, used: true });
  assert.deepEqual(secondUse.weaponDispositionUpdate, { itemId: linked.id, weaponDisposition: 'broken', fellDaggerBreakNextUse: false });
});

test('F2-F — carried/planted pavise, leviathan plate, fallen antler, and warpstone shard state their exact limits', () => {
  assert.match(previewSupplementalEquipment({ item: row('F-L13-0086') }).reminders.join(' '), /Protectrice 3.*BF\+2/);
  assert.match(previewSupplementalEquipment({ item: row('F-L13-0087') }).reminders.join(' '), /2 Actions.*Protectrice 5/);
  assert.match(previewSupplementalEquipment({ item: row('F-L11-0081') }).reminders.join(' '), /Encombrement.*−1.*PA et Taille inchangés/);
  assert.match(previewSupplementalEquipment({ item: row('F-L11-0078'), context: { antlerHandleOrigin: 'naturally-fallen' } }).reminders.join(' '), /ne se brise pas.*combat/);
  assert.ok(previewSupplementalEquipment({ item: row('F-L22-0139'), hit: true, damage: { finalDamage: 1 } }).reminders.some(line => /Pénétrante/.test(line)));
});

test('F2-F — planted pavise changes effective protection only within declared facing, range and first melee turn', () => {
  const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
  const wearer = { id: 'wearer', equipment:[pavise,{id:'mail',name:'mail',kind:'armour',ap:2,locations:['body'],layer:'rigid',keywords:[]}],extensions:{v5:{paviseDeploymentByItemId:{[pavise.id]:{status:'planted',actionsPaid:2,facing:'north'}}}} };
  const base = { location: 'body', paviseId:pavise.id, attackDirection: 'north', paviseDistanceYards: 1, ranged: true };
  assert.equal(locationProtection(wearer, base).ap, 5);
  assert.equal(locationProtection(wearer, { ...base, attackDirection: 'south' }).ap, 2);
  assert.equal(locationProtection(wearer, { ...base, paviseDistanceYards: 2 }).ap, 2);
  assert.equal(locationProtection(wearer, { ...base, ranged: false, paviseMeleeFirstTurn: false }).ap, 2);
  assert.equal(locationProtection(wearer, { ...base, ranged: false, paviseMeleeFirstTurn: true }).ap, 5);
});

test('F2-F — the actual catalogue pavise supplies its carried PA to an opposed resolution', () => {
  const pavise = reference.equipment.items.find(item => item.id === 'shield-armures-bouclier-pavois-pavise');
  assert.ok(pavise, 'objet source Pavois (Pavise)');
  const wearer = { id: 'wearer', armorLocations: { head: 0, body: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 }, equipment: [pavise] };
  const protection = locationProtection(wearer, { location: 'body', shieldId: pavise.id, shieldAvailable: true, opposedWithShield: true, defenseProvided: true, ranged: false });
  assert.equal(protection.ap, 3);
});

test('F2-F — robes never grant Focalisation DR on another domain or an unknown rank', () => {
  const robe = { ...row('F-L06-1105'), associatedDomain: 'Aqshy', robeRank: 3 };
  assert.match(previewSupplementalEquipment({ item: robe, spell: { wind: 'Ghur' } }).reminders.join(' '), /aucun bonus/);
  const matching = previewSupplementalEquipment({ item: robe, spell: { wind: 'Aqshy' } });
  assert.match(matching.reminders.join(' '), /\+3 DR.*Aqshy seulement/);
  assert.equal(matching.casting.focusSL, 3);
  assert.ok(previewSupplementalEquipment({ item: { ...robe, robeRank: 4 }, spell: { wind: 'Aqshy' } }).unresolved.some(line => /choisir le rang/.test(line)));
  const staff = previewSupplementalEquipment({ item: { ...row('F-L06-1104'), associatedDomain: 'Aqshy', focusRank: 2 }, spell: { wind: 'Aqshy' } });
  assert.equal(staff.casting.focusSL, 2);
  assert.equal(staff.casting.cnReduction, undefined, 'le bâton ne réduit pas le NI, selon la décision T4');
  assert.ok(previewSupplementalEquipment({ item: { ...row('F-L06-1104'), associatedDomain: 'Aqshy' }, spell: { wind: 'Aqshy' } }).unresolved.some(line => /choisir le rang/.test(line)));
});

test('F2-F — matching robe rank changes only a real Focalisation Test DR', () => {
  const input = {
    actor: { id: 'mage', states: [] }, target: null,
    action: { type: 'test', name: 'Focalisation (Aqshy)', base: 50 }, roll: 56,
    v5: { context: { focalisationSupplementRuleId: 'F-L06-1105', focalisationAssociatedDomain: 'Aqshy', focalisationDomain: 'Aqshy', focalisationRobeRank: 2 } },
    baseRevision: 1
  };
  const boosted = previewResolution(input);
  const plain = previewResolution({ ...input, v5: { context: {} } });
  assert.equal(boosted.sl, plain.sl + 2);
  const otherDomain = previewResolution({ ...input, action: { ...input.action, name: 'Focalisation (Ghur)' }, v5: { context: { ...input.v5.context, focalisationDomain: 'Ghur' } } });
  assert.equal(otherDomain.sl, plain.sl);
});

test('F2-F — the source snapshot profiles remain byte-for-byte at the authoritative sheet values', () => {
  const ratling = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const lance = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-lance-feu-a-malepierre-skaven');
  assert.deepEqual([ratling.damage, ratling.range], ['+9', '60']);
  assert.deepEqual([lance.damage, lance.range, lance.keywords.find(word => word.id === 'explosion')?.parameter], ['+10', '30', '3']);
});

test('F2-F — linked Ratling resolution emits a K1 exposure only when it wounds', () => {
  const ratling = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const actorWithWeapon = { id: 'ratling-user', caracs: { F: 40, CT: 80 }, skills: [{ name: 'Projectiles (Ingénierie)', total: 80 }], equipment: [ratling], states: [] };
  const victim = { id: 'victim', hp: 20, caracs: { E: 10 }, armor: {}, states: [] };
  const preview = previewResolution({ actor: actorWithWeapon, target: victim,
    action: { type: 'attack', name: 'Mitrailleuse Ratling', base: 80, damage: 9, qualities: [], extensions: { fiche: { equipmentId: ratling.id } } },
    v5: { kind: 'ranged', context: {} }, roll: 31, baseRevision: 1 });
  assert.equal(preview.supplementalEquipment?.exposure?.sourceRuleId, 'F-L11-0013');
  assert.equal(preview.supplementalEquipment.exposure.skillModifier, 2);
  assert.ok(preview.reminders.some(line => /Test de Corruption mineure \(\+2 au Test\)/.test(line)));
});

test('F2-F — Store carries a wounded Ratling exposure into the target K1 queue and resolves it without a session', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const sourceRatling = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const ratling = { ...sourceRatling, extensions: { v5: { reloadState: createV5ReloadState({ repeaterRating: 10, reloadSuccesses: 1 }).state } } };
  const shooter = { ...actor, id: 'shooter', zone: 'active', hp: 20, maxHp: 20, caracs: { CT: 80, F: 30 },
    skills: [{ id: 'skill-50_72_6f_6a_65_63_74_69_6c_65_73-49_6e_67_e9_6e_69_65_72_69_65', name: 'Projectiles (Ingénierie)', status: 'resolved', total: 80, carac: 'CT' }], equipment: [ratling], extensions: { v5: {} } };
  const victim = { ...target, zone: 'active', hp: 20, maxHp: 20, caracs: { E: 40, FM: 50 }, equipment: [], skills: [{ id: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', name: 'Résistance', total: 50 }], extensions: { v5: { corruptionPoints: 0 } } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: shooter.id, order: [shooter.id, victim.id], participants: [shooter, victim] }, extensions: { v5: { turnIndex: 1 } } });
  const attack = store.previewResolution({ actorId: shooter.id, targetId: victim.id, roll: 31,
    action: { type: 'attack', name: 'Mitrailleuse Ratling', base: 80, damage: 9, qualities: [], extensions: { fiche: { equipmentId: ratling.id } } },
    v5: { kind: 'ranged', context: { weaponAdvances: 10 } } });
  assert.equal(attack.supplementalEquipment?.exposure?.participantId, victim.id);
  assert.equal((await store.applyResolution(attack)).status, 'applied');
  const queued = store.listParticipants().find(row => row.id === victim.id).extensions.v5.pendingCorruptionExposures;
  assert.equal(queued.length, 1);
  const exposure = store.previewCorruptionExposure(victim.id, { immediateExposureId: queued[0].id, skillId: victim.skills[0].id, roll: 51 });
  assert.equal(exposure.status, 'ready');
  assert.equal(exposure.input.difficultyDR, 2);
  assert.equal((await store.applyCorruptionExposure(victim.id, exposure)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === victim.id).extensions.v5.pendingCorruptionExposures.length, 0);
});

test('F2-F — Store application persists Fell Dagger poison exhaustion and blocks it after its next use', () => {
  const weapon = { id: 'fell-dagger-1', name: 'Dague funeste', kind: 'weapon', extensions: { v5: {} } };
  const owner = { id: 'owner', caracs: { CC: 80, F: 40 }, equipment: [weapon], states: [] };
  const victim = { id: 'victim', hp: 100, caracs: { E: 10 }, armor: {}, states: [] };
  const input = { actor: owner, target: victim, action: { type: 'attack', name: weapon.name, base: 80, damage: 1, qualities: [], extensions: { fiche: { equipmentId: weapon.id } } },
    v5: { context: { fellDaggerSecretRoll: 1 } }, defense: { type: 'test', base: 30, roll: 90, label: 'Esquive' }, roll: 62, baseRevision: 0 };
  const first = previewResolution(input);
  assert.equal(first.supplementalEquipment?.weaponDispositionUpdate?.fellDaggerBreakNextUse, true);
  assert.deepEqual(first.unresolved, []);
  const applied = applyResolution(first, { revision: 0, participants: [owner, victim], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  const exhaustedOwner = applied.state.participants.find(row => row.id === owner.id);
  const exhaustedVictim = applied.state.participants.find(row => row.id === victim.id);
  assert.equal(exhaustedOwner.equipment[0].extensions.v5.fellDaggerBreakNextUse, true);
  const next = previewResolution({ ...input, actor: exhaustedOwner, target: exhaustedVictim, v5: { choice: 'keep', context: {} }, baseRevision: 1 });
  assert.equal(next.supplementalEquipment?.weaponDispositionUpdate?.weaponDisposition, 'broken');
  const broken = applyResolution(next, { revision: 1, participants: applied.state.participants, appliedResolutionIds: applied.state.appliedResolutionIds });
  assert.equal(broken.status, 'applied');
  const brokenOwner = broken.state.participants.find(row => row.id === owner.id);
  assert.equal(brokenOwner.equipment[0].extensions.v5.weaponDisposition, 'broken');
  assert.ok(previewResolution({ ...input, actor: brokenOwner, target: broken.state.participants.find(row => row.id === victim.id), v5: { choice: 'keep', context: {} }, baseRevision: 2 }).unresolved.some(message => /lame s’est brisée/.test(message)));
});
