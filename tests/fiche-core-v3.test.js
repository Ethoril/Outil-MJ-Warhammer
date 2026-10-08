import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync, applyFicheSync, equipmentActionKey } from '../js/core/fiche-sync.js';
import { Profile } from '../js/core/models.js';
import { createStore } from '../js/core/store.js';
import { parseProfileJson } from '../js/core/json-profile-import.js';
import { parseProfileText } from '../js/core/text-profile-import.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
const raw = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const profile = () => ({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 8, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], talents: [{ id: 'hardy', name: 'Dur à cuire', rank: 1 }] });
const memory = () => { let state = null; return { load: async () => structuredClone(state), saveAtomic: async input => { state = structuredClone(input.state); return { ok: true }; } }; };
const item = extra => ({ id: 'shield', baseId: 'custom-shield', catalogVersion: 'fixture', kind: 'shield', name: 'Bouclier de recette', category: 'Bouclier', damage: 'BF+2', reach: 'Courte', range: '', ap: 0, locations: [], layer: 'none', keywords: [], notes: '', source: 'Recette', custom: true, ...extra });

test('Fiche v3 — talents absents ou invalides ne retirent ni Dur à cuire ni son maximum de Blessures', () => {
  const absent = { ...raw }; delete absent.talentsAcq;
  for (const input of [absent, { ...raw, talentsAcq: {} }]) {
    const snapshot = ficheSnapshot('caelel', input);
    assert.equal(snapshot.woundsMax, null);
    assert.ok(snapshot.warnings.some(row => row.code === 'talents-unavailable'));
    const prior = profile();
    const next = applyFicheSync({ reserve: [prior] }, [{ charId: 'caelel', profileId: 'pj', snapshot }]);
    assert.equal(next.reserve[0].hp, 8); assert.equal(next.reserve[0].maxHp, 14);
    assert.deepEqual(next.reserve[0].talents, prior.talents);
  }
});

test('Fiche v3 — basicSpecs et caractéristique de référence remplacent les anciens libellés et caracs erronées', () => {
  const snapshot = ficheSnapshot('caelel', { ...raw, basicSpecs: { Art: 'Peinture' }, skillsAdvanced: [{ id: 's1', nom: 'Corps à corps (Escrime)', carac: 'ct', adv: 5 }] });
  const art = snapshot.skills.find(row => row.storageKey === 'Art');
  assert.equal(art.name, 'Art (Peinture)'); assert.equal(art.carac, 'dex'); assert.equal(art.total, 47);
  const melee = snapshot.skills.find(row => row.storageKey === 's1');
  assert.equal(melee.carac, 'cc'); assert.equal(melee.total, 59);
});

test('Fiche v3 — collection de compétences invalide exclue entièrement, précédentes conservées', () => {
  const snapshot = ficheSnapshot('caelel', { ...raw, skillsAdvanced: [{ nom: 'Savoir', adv: 'texte' }] });
  assert.equal(snapshot.coverage.skills, 'invalid'); assert.deepEqual(snapshot.skills, []);
  const prior = { ...profile(), skills: [{ id: 'known', total: 55 }] };
  const next = applyFicheSync({ reserve: [prior] }, [{ charId: 'caelel', profileId: 'pj', snapshot }]);
  assert.deepEqual(next.reserve[0].skills, prior.skills);
});

test('Fiche v3 — catégorie Deux-Mains propose uniquement sa compétence du contrat publié', () => {
  const weapon = item({ id: 'weapon', kind: 'weapon', category: 'Deux-Mains', name: 'Marteau à deux mains' });
  const snapshot = ficheSnapshot('caelel', { ...raw, equipment: [weapon], skillsAdvanced: [{ nom: 'Corps à corps (Deux mains)', carac: 'cc', adv: 7 }] });
  const planned = planProfileSync(snapshot, profile());
  assert.equal(planned.equipmentActions[0].proposed, 'Corps à corps (Deux mains)');
  assert.equal(planned.equipmentActions[0].requiresLink, true);
  const key = equipmentActionKey('caelel', 'weapon', 'attack');
  const confirmed = planProfileSync(snapshot, profile(), { equipmentLinks: { [key]: 'Corps à corps (Deux mains)' } });
  assert.equal(confirmed.equipmentActions[0].action.base, 61);
});

test('Fiche v3 — révision locale vérifiée dans la file durable, avant toute synchronisation', async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  await store.addProfile(profile()); const revision = store.getLocalRevision();
  const edit = store.updateProfile('pj', { notes: 'Changement en vol' });
  const sync = store.applyFicheSync([{ profileId: 'pj', charId: 'caelel', snapshot: ficheSnapshot('caelel', raw) }], { expectedLocalRevision: revision });
  await edit;
  await assert.rejects(sync, error => error.code === 'fiche-plan-stale');
  assert.equal(store.getProfile('pj').hp, 8); assert.equal(store.getProfile('pj').maxHp, 14);
  assert.equal(store.getProfile('pj').notes, 'Changement en vol');
  assert.equal(store.getLocalRevision(), revision + 1);
});

test('Fiche v3 — import de profil lié conserve collections, mots clés paramétrés et action non liée', () => {
  const weapon = { ...structuredClone(getReferenceCatalogue().items.find(row => row.kind === 'weapon')), id: 'instance', custom: true, catalogVersion: 'fixture' };
  const data = { name: 'PJ importé', kind: 'PJ', hp: 8, maxHp: 14, armorLocations: { head: 0, body: 2, rightArm: 3, leftArm: 1, rightLeg: 0, leftLeg: 2 }, equipment: [weapon], talents: [{ name: 'Dur à cuire', rank: 2 }], skills: [], spells: [{ nom: 'Sort' }], prayers: [{ nom: 'Prière' }], extensions: { ficheId: 'caelel' }, ficheSnapshot: { format: 1, charId: 'caelel' }, diceLines: [{ id: 'linked', type: 'attack', note: 'Arme liée', base: '', damage: 'BF+4', qualities: [{ id: 'recharge', parameter: 'à préciser' }], extensions: { fiche: { charId: 'caelel', equipmentId: 'instance', role: 'attack', requiresLink: true } } }] };
  const parsed = parseProfileJson(JSON.stringify(data));
  assert.equal(parsed.blocks[0].blocking, false);
  const restored = parsed.profiles[0];
  for (const field of ['maxHp', 'armorLocations', 'equipment', 'talents', 'spells', 'prayers', 'extensions', 'ficheSnapshot']) assert.deepEqual(restored[field], data[field], field);
  assert.equal(restored.actions[0].id, 'linked'); assert.equal(restored.actions[0].base, '');
  assert.equal(restored.actions[0].qualities[0].parameter, 'à préciser');
  assert.equal(restored.actions[0].qualities[0].rating, undefined);
});

test('Fiche v3 — import texte des protections distingue les côtés', () => {
  const parsed = parseProfileText('Nom: PNJ\nPV: 12\nArmure corps: 2\nArmure bras droit: 3\nArmure bras gauche: 1\nArmure jambe droite: 0\nArmure jambe gauche: 2');
  assert.deepEqual(parsed.profiles[0].armorLocations, { head: 0, body: 2, rightArm: 3, leftArm: 1, rightLeg: 0, leftLeg: 2 });
});

for (const simulation of [false, true]) test(`Fiche v3 — attaque au bouclier ${simulation ? 'simulée' : 'directe'}, suspension et prochain tour conservent puis réactivent sa protection`, async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const shield = item();
  const action = { id: 'shield-action', type: 'attack', base: 60, damage: 2, damageFormula: 'BF+2', qualities: [], extensions: { fiche: { charId: 'caelel', equipmentId: 'shield', role: 'attack', skillId: null, skillName: 'Corps à corps (Base)', bindingVersion: 1 } } };
  await store.addProfile(new Profile({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, initiative: 60, equipment: [shield], caracs: { F: 30, E: 40 }, diceLines: [action] }));
  await store.addProfile(new Profile({ id: 'target', name: 'Cible', hp: 40, initiative: 30, caracs: { E: 20 } }));
  await store.saveEncounter({ id: 'enc', title: 'Combat', entries: [{ id: 'e1', profileId: 'pj', quantity: 1, zone: 'active' }, { id: 'e2', profileId: 'target', quantity: 1, zone: 'active' }] });
  await store.launchEncounter('enc'); await store.nextTurn();
  const actor = store.listParticipants().find(row => row.profileId === 'pj');
  const target = store.listParticipants().find(row => row.profileId === 'target');
  const input = { actorId: actor.id, targetId: target.id, action: actor.actions[0], roll: 42 };
  const outcome = simulation ? await store.applySimulation(store.simulateAction(input)) : await store.applyResolution(store.previewResolution(input));
  assert.equal(outcome.status, 'applied');
  assert.deepEqual(store.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, ['shield']);
  await store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot: ficheSnapshot('caelel', { ...raw, equipment: [shield] }) }]);
  assert.deepEqual(store.getActiveScene().participants.find(row => row.id === actor.id).extensions.shieldUnavailable, ['shield'], 'fiche ne réactive pas le bouclier');
  const sceneId = store.getActiveScene().id; await store.suspendActiveScene();
  assert.deepEqual(store.listSuspendedScenes()[0].participants.find(row => row.id === actor.id).extensions.shieldUnavailable, ['shield']);
  await store.resumeScene(sceneId); await store.nextTurn();
  assert.deepEqual(store.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, ['shield'], 'tour de la cible : indisponibilité conservée');
  await store.nextTurn();
  assert.equal(store.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, undefined, 'début du prochain tour de Caelel');
  await store.undo();
  assert.deepEqual(store.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, ['shield'], 'annulation du changement de tour');
});


test('Fiche v3 — collection de compétences exclue conserve les liaisons et scores des armes déjà synchronisées', () => {
  const weapon = item({ kind: 'weapon', category: 'Base' });
  const firstSnapshot = ficheSnapshot('caelel', { ...raw, equipment: [weapon] });
  const attackKey = equipmentActionKey('caelel', weapon.id, 'attack');
  const defenseKey = equipmentActionKey('caelel', weapon.id, 'defense');
  const initial = applyFicheSync({ reserve: [profile()] }, [{ profileId: 'pj', snapshot: firstSnapshot, equipmentLinks: { [attackKey]: 'Corps à corps (Base)', [defenseKey]: 'Corps à corps (Base)' } }]);
  for (const rawSkills of [undefined, 'invalid']) {
    const input = { ...raw, equipment: [weapon] }; delete input.skillsBasic; delete input.skillsAdvanced; delete input.basicSpecs;
    if (rawSkills) input.skillsAdvanced = rawSkills;
    const snapshot = ficheSnapshot('caelel', input);
    const next = applyFicheSync(initial, [{ profileId: 'pj', snapshot }]);
    assert.deepEqual(next.reserve[0].skills, initial.reserve[0].skills);
    for (const action of next.reserve[0].diceLines) {
      const old = initial.reserve[0].diceLines.find(row => row.id === action.id);
      assert.equal(action.base, old.base);
      assert.equal(action.extensions.fiche.skillId, old.extensions.fiche.skillId);
      assert.equal(action.extensions.fiche.requiresLink, false);
    }
  }
});
