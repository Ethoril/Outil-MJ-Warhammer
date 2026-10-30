import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { createStore } from '../../../js/core/store.js';
import { getReferenceCatalogue, parseReferenceCSV, parseKeywordCSV, getReferenceSnapshot, getReferenceStatus, refreshReferences, referenceContentPayload, sha256, resolveSkill, resolveTalent, aggregateTalents, createReferenceResolvers } from '../../../js/core/reference-catalog.js';
import { FICHE_CHAR_IDS, ficheSnapshot, woundsMax, matchFiches, suggestSkill, planProfileSync, applyFicheSync, ficheErrorMessage, equipmentActionKey, planHealthSync } from '../../../js/core/fiche-sync.js';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEquipmentRows } from '../../../js/data/reference-equipment-builder.js';
import snapshot from '../../../js/data/reference-snapshot.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';
import { normalizeEquipment, armourProtection, calculateArmor, normalizeArmorLocations, locationProtection, equipmentFormula, equipmentQualities, mergeEquipmentQualities, ammunitionCompatibility } from '../../../js/core/equipment.js';
import { armourProtection as sourceArmour, equipmentFormula as sourceFormula } from '../../../js/data/shared/fiche/equipment.js';
import { keywordMechanicalStatus } from '../../../js/core/keywords.js';
import { qualityLabel } from '../../../js/core/quality-normalization.js';
import { computeDamage } from '../../../js/core/damage.js';
import { previewResolution, applyResolution, describeResolutionDetail } from '../../../js/core/resolution.js';
import { v5TalentCoverage } from '../../../js/core/v5-talent-coverage.js';
import { Profile, Participant } from '../../../js/core/models.js';
import { parseProfileJson } from '../../../js/core/json-profile-import.js';
import { parseProfileText } from '../../../js/core/text-profile-import.js';
import { sanitizeProfile, sanitizeParticipant } from '../../../js/core/sanitize.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { launchEncounter } from '../../../js/core/encounters.js';
import { V5_RULES, V5_CORRUPTION_BANDS } from '../../../js/data/v5-rules.js';
import { V5_CRIT_DATA, getV5CriticalEffect } from '../../../js/data/v5-crits.js';

describe('Synchronisation des fiches et equipement', () => {
const caelel = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const snapshot = ficheSnapshot('caelel', caelel);
const confirmed = { links: { epee: 'Corps à corps (Base)', arc: 'Projectiles (Arc)', esq: 'Esquive', perc: 'Perception' }, convert: { epee: true } };
const skill = name => snapshot.skills.find(item => item.name === name);
// La vraie fiche n’a pas de seconde spécialisation de mêlée : copie dérivée avec « Corps à corps (Escrime) » à +5.
const avecEscrime = ficheSnapshot('caelel', { ...caelel, skillsAdvanced: [...caelel.skillsAdvanced, { nom: 'Corps à corps (Escrime)', carac: 'cc', adv: 5 }] });

function memoryPersistence() {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
}

const profile = (extra = {}) => ({
  id: 'caelel-pj', name: 'Caelel', kind: 'PJ', initiative: 40, hp: 12, group: 'Groupe', tags: ['elfe'], notes: 'À garder', favorite: true,
  armor: { head: 1, body: 2, arms: 0, legs: 0 }, caracs: { CC: 50, F: 25, E: 40, M: 5 }, extensions: { autre: 1 },
  diceLines: [
    { id: 'epee', note: 'Épée', type: 'attack', base: 50, mod: 5, damage: 7, qualities: [], extensions: { garde: true } },
    { id: 'arc', note: 'Arc long', type: 'attack', base: 40, mod: 0, damage: 0, damageFormula: 'BF+3', qualities: [] },
    { id: 'esq', note: 'Esquive', type: 'defense', base: 45, mod: 0, damage: 0, qualities: [] },
    { id: 'perc', note: 'Perception', type: 'skill', base: '', mod: 0, damage: 0, qualities: [] },
    { id: 'rien', note: 'Prière', type: 'skill', base: 33, mod: 0, damage: 0, qualities: [] }
  ],
  ...extra
});

test('fiche — totaux, initiative et compétences de Caelel', () => {
  assert.deepEqual(snapshot.caracs, { CC: 54, CT: 59, F: 30, E: 43, I: 55, Ag: 51, Dex: 47, Int: 51, FM: 36, Soc: 40 });
  assert.equal(snapshot.initiative, 55);
  assert.equal(skill('Corps à corps (Base)').total, 69);
  assert.equal(skill('Esquive').total, 55);
  assert.equal(skill('Projectiles (Arc)').total, 59);
  assert.equal(avecEscrime.skills.find(item => item.name === 'Corps à corps (Escrime)').total, 59);
  assert.equal(skill('Perception').total, 65);
  assert.equal(skill('Athlétisme').total, 66);
  assert.equal(skill('Calme').total, 36, 'une compétence de base sans avance reste utilisable');
});

test('synchronisation — une suppression catalogue conserve l’exemplaire V4 et son action sans conversion', () => {
  const oldItem = { id: 'instance-main-gauche-v4', baseId: 'weapon-armes-corps-a-corps-parade-main-gauche', kind: 'weapon', name: 'Main gauche V4 personnalisée', category: 'Parade',
    damage: 'BF+1', ap: null, locations: [], qualities: [], keywords: [{ id: 'protectrice', parameter: '1' }, { id: 'v4-custom', parameter: 'ancien' }],
    source: 'copie V4', catalogVersion: 'legacy' };
  const oldAction = { id: 'main-gauche-action', note: 'Main gauche', type: 'attack', base: 51, damage: 4, qualities: [{ id: 'protectrice', parameter: '1' }],
    extensions: { fiche: { charId: 'caelel', equipmentId: oldItem.id, role: 'attack', skillName: 'Corps à corps (Parade)' }, equipment: structuredClone(oldItem) } };
  const prior = profile({ equipment: [oldItem], diceLines: [oldAction], extensions: { ficheId: 'caelel' } });
  const movedModel = getReferenceCatalogue().items.find(item => item.id === 'weapon-armes-corps-a-corps-escrime-main-gauche');
  const movedItem = { ...structuredClone(movedModel), id: 'instance-main-gauche-v5', baseId: movedModel.id, custom: true };
  assert.ok(movedItem, 'l’objet V5 correspondant est disponible dans le catalogue');
  const nextSnapshot = ficheSnapshot('caelel', { ...caelel, equipment: [] });
  nextSnapshot.equipment = [structuredClone(movedItem)];
  const plan = planProfileSync(nextSnapshot, prior);
  assert.equal(plan.removedActions.length, 0);
  assert.deepEqual(plan.updated.equipment.map(item => item.id), [oldItem.id], 'le plan conserve l’ancien sans ajouter l’instance V5 comme si son identité était connue');
  const identityWarning = plan.warnings.find(warning => warning.code === 'moved-instance-arbitration-required');
  assert.ok(identityWarning);
  assert.match(identityWarning.message, /Main gauche V4 personnalisée/);
  assert.match(identityWarning.message, /« Main gauche » \(instance instance-main-gauche-v5\)/);
  assert.match(identityWarning.message, /fiche externe/);
  assert.deepEqual(plan.updated.diceLines.find(action => action.id === oldAction.id), oldAction);
  const draft = { reserve: [prior], combat: { participants: [{ id: 'live', profileId: prior.id, equipment: [oldItem], actions: [oldAction] }] } };
  assert.throws(() => applyFicheSync(draft, [{ profileId: prior.id, snapshot: nextSnapshot }]), error => error.code === 'fiche-equipment-arbitration-required');
  assert.deepEqual(draft.reserve[0].equipment, [oldItem], 'le blocage conserve la partie sans effet partiel');
  const repeated = planProfileSync(nextSnapshot, draft.reserve[0]);
  assert.equal(repeated.updated.equipment.filter(item => item.id === oldItem.id).length, 1);
  assert.equal(repeated.updated.diceLines.filter(action => action.id === oldAction.id).length, 1);

  const absentSnapshot = ficheSnapshot('caelel', { ...caelel, equipment: [] });
  const absent = planProfileSync(absentSnapshot, draft.reserve[0]);
  assert.equal(absent.updated.equipment.some(item => item.id === oldItem.id), false,
    'sans le nouvel ID correspondant dans la fiche, l’ancien exemplaire est supprimé');
  assert.equal(absent.updated.diceLines.some(action => action.id === oldAction.id), false);
  assert.ok(absent.removedActions.some(action => action.id === oldAction.id), 'l’action V4 figure parmi les suppressions');

  const ordinaryItem = { ...oldItem, id: 'ordinary-removed-item', baseId: 'ordinary-removed-item' };
  const ordinaryAction = { ...oldAction, id: 'ordinary-removed-action', extensions: { ...oldAction.extensions,
    fiche: { ...oldAction.extensions.fiche, equipmentId: ordinaryItem.id }, equipment: ordinaryItem } };
  const ordinaryPlan = planProfileSync(absentSnapshot, profile({ equipment: [ordinaryItem], diceLines: [ordinaryAction], extensions: { ficheId: 'caelel' } }));
  assert.deepEqual(ordinaryPlan.updated.equipment, [], 'une suppression ordinaire de la fiche est appliquée');
  assert.equal(ordinaryPlan.updated.diceLines.some(action => action.id === ordinaryAction.id), false);
  assert.deepEqual(ordinaryPlan.removedActions, [{ id: ordinaryAction.id, name: ordinaryAction.note }]);

  const duplicateOld = { ...oldItem, id: 'instance-main-gauche-v4-second' };
  const ambiguous = planProfileSync(nextSnapshot, profile({ equipment: [oldItem, duplicateOld], diceLines: [], extensions: { ficheId: 'caelel' } }));
  assert.deepEqual(ambiguous.updated.equipment.map(item => item.id), [oldItem.id, duplicateOld.id]);
  assert.ok(ambiguous.warnings.some(warning => warning.code === 'moved-instance-arbitration-required'),
    'les correspondances multiples sont exposées au MJ sans décider quel exemplaire convertir');

  const oldShield = { id: 'instance-shield-v4', baseId: 'shield-armes-corps-a-corps-bouclier-bouclier', kind: 'shield',
    name: 'Bouclier V4 personnalisé', category: 'Bouclier', ap: 2, damage: '', locations: [], layer: 'none',
    keywords: [{ id: 'protectrice', parameter: '2' }, { id: 'v4-custom', parameter: 'garde' }], custom: true };
  const shieldModel = getReferenceCatalogue().items.find(item => item.id === 'shield-armures-bouclier-bouclier');
  const newShield = { ...structuredClone(shieldModel), id: 'instance-shield-v5', baseId: shieldModel.id, custom: true };
  const shieldSnapshot = ficheSnapshot('caelel', { ...caelel, equipment: [] });
  shieldSnapshot.equipment = [newShield];
  const shieldPlan = planProfileSync(shieldSnapshot, profile({ equipment: [oldShield], diceLines: [], extensions: { ficheId: 'caelel' } }));
  assert.deepEqual(shieldPlan.updated.equipment, [oldShield], 'le plan conserve le bouclier V4 sans compter l’instance V5 comme une même pièce');
  assert.equal(shieldPlan.updated.protection.shields.length, 1, 'la protection du bouclier n’est calculée qu’une fois');
  assert.ok(shieldPlan.warnings.some(warning => warning.code === 'moved-instance-arbitration-required'));

  const sameIdSnapshot = ficheSnapshot('caelel', { ...caelel, equipment: [] });
  sameIdSnapshot.equipment = [{ ...movedItem, id: 'instance-main-gauche-v4', baseId: movedModel.id }];
  const sameIdPlan = planProfileSync(sameIdSnapshot, prior);
  assert.deepEqual(sameIdPlan.updated.equipment, [oldItem], 'un baseId changé sous le même id d’instance ne remplace pas l’ancien objet');
  const sameIdWarning = sameIdPlan.warnings.find(warning => warning.code === 'moved-instance-arbitration-required');
  assert.ok(sameIdWarning);
  assert.match(sameIdWarning.message, /Main gauche V4 personnalisée/);
  assert.match(sameIdWarning.message, /Main gauche/);
  assert.throws(() => applyFicheSync({ reserve: [prior] }, [{ profileId: prior.id, snapshot: sameIdSnapshot }]),
    error => error.code === 'fiche-equipment-arbitration-required');
});

test('blessures — Caelel : 3 + 2×4 + 3 + 4 (Dur à cuire) = 18', () => {
  assert.equal(snapshot.wounds, 18);
});

test('blessures — Dur à cuire par rang, halfelin avec BF', () => {
  const totals = { F: 35, E: 42, FM: 28 };
  assert.equal(woundsMax({ totals, race: 'humain' }), 3 + 8 + 2);
  assert.equal(woundsMax({ totals, race: 'humain', talents: [{ nom: 'Dur à cuire' }, { nom: 'dur a cuire' }, { nom: 'Vision nocturne' }] }), 13 + 8);
  assert.equal(woundsMax({ totals, race: 'halfelin' }), 3 + 8 + 2);
  assert.equal(woundsMax({ totals, race: 'halfling' }), 13);
});

test('fiche — données incomplètes sans plantage', () => {
  const vide = ficheSnapshot('wren', {});
  assert.deepEqual(vide.caracs, {});
  assert.equal(vide.initiative, null);
  assert.equal(vide.wounds, null, 'F, E ou FM absente : blessures non calculables');
  assert.deepEqual(vide.skills, [], 'sans caractéristique, aucune compétence utilisable');
  const sansForce = ficheSnapshot('wren', { ...caelel, carac: { ...caelel.carac, f: undefined } });
  assert.equal(sansForce.wounds, null);
  assert.equal(ficheSnapshot('wren', { ...caelel, race: 'halfelin', carac: { ...caelel.carac, f: undefined } }).wounds, null, 'un halfelin a besoin de F');
  assert.equal(sansForce.skills.some(item => item.name === 'Escalade'), false, 'Escalade dépend de F');
});

test('fiche incomplète — ne touche ni les PV ni les caracs absentes', () => {
  const sansEndurance = ficheSnapshot('caelel', { ...caelel, carac: { ...caelel.carac, e: undefined } });
  const plan = planProfileSync(sansEndurance, profile());
  assert.deepEqual(plan.hp, { old: 12, new: 12, computable: false });
  assert.equal(plan.caracs.some(item => item.key === 'E'), false);
  const draft = { reserve: [profile()], persistentCharacters: [{ id: 'pc', name: 'Caelel', hp: 4 }], encounters: [] };
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot: sansEndurance }]);
  assert.equal(next.reserve[0].hp, 12);
  assert.equal(next.reserve[0].caracs.E, 40, 'la carac absente de la fiche n’est pas écrasée');
  assert.equal(next.persistentCharacters[0].hp, 4);
});

test('lien enregistré introuvable — conservé, jet inchangé, signalé', () => {
  const lie = profile();
  lie.diceLines[0].extensions.ficheSkill = 'Corps à corps (Hast)';
  const plan = planProfileSync(snapshot, lie);
  assert.equal(plan.actions[0].missing, 'Corps à corps (Hast)');
  assert.equal(plan.actions[0].newBase, 50);
  const next = applyFicheSync({ reserve: [lie] }, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot }]);
  assert.equal(next.reserve[0].diceLines[0].base, 50);
  assert.equal(next.reserve[0].diceLines[0].extensions.ficheSkill, 'Corps à corps (Hast)');
  const delie = applyFicheSync({ reserve: [lie] }, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot, links: { epee: '' } }]);
  assert.equal(delie.reserve[0].diceLines[0].extensions.ficheSkill, '', 'le MJ peut délier explicitement');
  const relie = applyFicheSync({ reserve: [lie] }, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot, links: { epee: 'Corps à corps (Base)' } }]);
  assert.equal(relie.reserve[0].diceLines[0].base, 69);
});

test('rapprochement — mots courts et articles ignorés, identifiant préféré', () => {
  const dame = ficheSnapshot('wren', { nom: 'Le Grand Wren' });
  const autres = [{ id: 'a', name: 'Le Borgne', kind: 'PJ' }, { id: 'b', name: 'Grand Wren', kind: 'PJ' }];
  assert.deepEqual(matchFiches([dame], autres), { wren: 'b' });
  const de = ficheSnapshot('wren', { nom: 'De La Tour' });
  assert.deepEqual(matchFiches([de], [{ id: 'a', name: 'Le Borgne', kind: 'PJ' }, { id: 'b', name: 'De Vries', kind: 'PJ' }]), { wren: null }, '« de » n’est pas un rapprochement');
  assert.deepEqual(matchFiches([snapshot], [{ id: 'a', name: 'Caelel Autre', kind: 'PJ' }, { id: 'b', name: 'caelel', kind: 'PJ' }]), { caelel: 'b' });
});

test('liens proposés — correspondance large prudente, pas de lien pour sorts et morsures', () => {
  const { skills } = snapshot;
  assert.equal(suggestSkill({ note: 'Morsure', type: 'attack' }, skills), '');
  assert.equal(suggestSkill({ note: 'Sort de flamme', type: 'skill' }, skills), '');
  assert.equal(suggestSkill({ note: 'Souffle', type: 'attack' }, skills), '');
  assert.equal(suggestSkill({ note: 'Art', type: 'skill' }, skills), 'Art', 'nom exact court accepté');
  assert.equal(suggestSkill({ note: 'Artillerie', type: 'skill' }, skills), '', 'pas de correspondance par sous-chaîne');
  assert.equal(suggestSkill({ note: 'Test de Perception', type: 'skill' }, skills), 'Perception');
  assert.equal(suggestSkill({ note: 'Per', type: 'skill' }, skills), '');
});

test('application sans changement — pas de modification, pas de commande', async () => {
  const draft = { reserve: [profile()], persistentCharacters: [], encounters: [] };
  assert.equal(applyFicheSync(draft, [{ charId: 'caelel', profileId: 'absent', snapshot }]), draft);
  const once = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot }]);
  assert.notEqual(once, draft);
  assert.equal(applyFicheSync(once, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot }]), once, 'deuxième passage identique');

  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile(profile());
  const entry = { charId: 'caelel', profileId: 'caelel-pj', snapshot, links: {}, convert: {} };
  assert.equal((await store.applyFicheSync([entry])).changed, undefined);
  const revision = store.getLocalRevision();
  assert.deepEqual(await store.applyFicheSync([entry]), { ok: true, changed: false });
  assert.deepEqual(await store.applyFicheSync([{ ...entry, profileId: 'disparu' }]), { ok: true, changed: false });
  assert.equal(store.getLocalRevision(), revision, 'aucune entrée d’historique');
});

test('rapprochement — lien enregistré, nom, premier mot ; un profil ne sert qu’une fois', () => {
  const autre = ficheSnapshot('wren', { nom: 'Wren Vif' });
  const profiles = [
    profile({ id: 'a', name: 'Caélel' }),
    { id: 'b', name: 'Cible', kind: 'PJ', extensions: { ficheId: 'wren' } },
    { id: 'c', name: 'Caelel', kind: 'PNJ' }
  ];
  assert.deepEqual(matchFiches([snapshot, autre], profiles), { caelel: 'a', wren: 'b' });
  assert.deepEqual(matchFiches([snapshot], [{ id: 'x', name: 'Elysia', kind: 'PJ' }]), { caelel: null });
  assert.deepEqual(matchFiches([snapshot], [{ id: 'x', name: 'Caelel Feuille Grise', kind: 'PJ' }, { id: 'y', name: 'Caelel', kind: 'PJ' }]), { caelel: 'x' });
  assert.deepEqual(matchFiches([snapshot], [{ id: 'x', name: 'caelel', kind: 'PJ' }, { id: 'y', name: 'Caelel 2', kind: 'PJ' }]), { caelel: 'x' });
  assert.deepEqual(FICHE_CHAR_IDS, ['bhelgi', 'caelel', 'elysia', 'hellaya', 'wren']);
});

test('liens proposés — mêlée, tir, esquive, parade, compétence', () => {
  const { skills } = snapshot;
  assert.equal(suggestSkill({ note: 'Épée', type: 'attack' }, skills), 'Corps à corps (Base)');
  assert.equal(suggestSkill({ note: 'Escrime', type: 'attack' }, avecEscrime.skills), 'Corps à corps (Escrime)');
  assert.equal(suggestSkill({ note: 'Arc long', type: 'attack' }, skills), 'Projectiles (Arc)');
  assert.equal(suggestSkill({ note: 'Arbalète', type: 'attack' }, skills), '', 'deux compétences de tir (Arc, Entraves) : aucune ne s’impose');
  assert.equal(suggestSkill({ note: 'Arbalète', type: 'attack' }, skills.filter(item => item.name !== 'Projectiles (Entraves)')), 'Projectiles (Arc)', 'une seule compétence de tir : proposée');
  assert.equal(suggestSkill({ note: 'Esquive', type: 'defense' }, skills), 'Esquive');
  assert.equal(suggestSkill({ note: 'Parade', type: 'defense' }, skills), 'Corps à corps (Base)');
  assert.equal(suggestSkill({ note: 'Perception', type: 'skill' }, skills), 'Perception');
  assert.equal(suggestSkill({ note: 'Prière', type: 'skill' }, skills), '');
  assert.equal(suggestSkill({ note: 'Arc', type: 'attack' }, skills.filter(item => !item.name.startsWith('Projectiles'))), '');
});

test('plan — écarts, jets liés et conversion des dégâts fixes', () => {
  const plan = planProfileSync(snapshot, profile(), confirmed);
  assert.deepEqual(plan.caracs.find(item => item.key === 'F'), { key: 'F', old: 25, new: 30, changed: true });
  assert.deepEqual(plan.initiative, { old: 40, new: 55 });
  assert.deepEqual(plan.hp, { old: 12, new: 18, computable: true });
  const [epee, arc, esquive, perception, priere] = plan.actions;
  assert.equal(epee.newBase, 69);
  assert.deepEqual(epee.damage, { from: 7, bonus: 5, formula: 'BF+5', enabled: true }, 'BF avant = 2 (F 25) : 7 = BF+5');
  assert.equal(arc.newBase, 59);
  assert.equal(arc.damage, null, 'formule déjà liée à la Force');
  assert.equal(esquive.newBase, 55);
  assert.equal(perception.newBase, 65);
  assert.equal(priere.skill, '');
  assert.equal(priere.newBase, 33);
  const sansConversion = planProfileSync(snapshot, profile(), { convert: { epee: false }, links: { arc: '' } });
  assert.equal(sansConversion.actions[0].damage.enabled, false);
  assert.equal(sansConversion.actions[1].skill, '');
  const sansForce = planProfileSync(snapshot, profile({ caracs: { CC: 50 } }));
  assert.equal(sansForce.actions[0].damage, null, 'sans F avant, rien à proposer');
});

test('application — uniquement les champs prévus, sur un brouillon', () => {
  const draft = {
    reserve: [profile(), { id: 'pnj', name: 'Garde', kind: 'PNJ', hp: 9, diceLines: [] }],
    persistentCharacters: [{ id: 'pc', name: 'Caelel', hp: 4, states: ['Sonné|1'] }, { id: 'pc2', name: 'Autre', hp: 5 }],
    encounters: [], combat: { participants: [{ id: 'p1', profileId: 'caelel-pj', hp: 3, maxHp: 12 }] }, log: []
  };
  const copy = structuredClone(draft);
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot, ...confirmed, links: { ...confirmed.links, rien: '' } }]);
  assert.deepEqual(draft, copy, 'le brouillon d’entrée n’est pas modifié');
  const pj = next.reserve[0];
  assert.deepEqual(pj.caracs, { CC: 54, F: 30, E: 43, M: 5, CT: 59, I: 55, Ag: 51, Dex: 47, Int: 51, FM: 36, Soc: 40 });
  assert.equal(pj.initiative, 55);
  assert.equal(pj.hp, 18);
  // B10b : Destin et Résilience de la fiche (1 et 1) sont importés (réponse du MJ du 24/10 à BR-02).
  assert.deepEqual(pj.extensions, { autre: 1, ficheId: 'caelel', v5: { fate: 1, resilience: 1 } });
  const [epee, arc, esq, perc, rien] = pj.diceLines;
  assert.equal(epee.base, 69); assert.equal(epee.mod, 5); assert.equal(epee.note, 'Épée');
  assert.equal(epee.damage, 5); assert.equal(epee.damageFormula, 'BF+5');
  assert.equal(epee.extensions.garde, true); assert.equal(epee.extensions.ficheSkill, 'Corps à corps (Base)'); assert.equal(epee.extensions.fiche.bindingVersion, 1);
  assert.equal(arc.base, 59); assert.equal(arc.damageFormula, 'BF+3');
  assert.equal(esq.base, 55); assert.equal(perc.base, 65);
  assert.equal(rien.base, 33); assert.equal(rien.extensions?.ficheSkill, '', 'déliaison explicite mémorisée');
  for (const key of ['name', 'kind', 'group', 'tags', 'notes', 'favorite', 'armor']) assert.deepEqual(pj[key], draft.reserve[0][key], key);
  assert.deepEqual(next.reserve[1], draft.reserve[1]);
  assert.equal(next.persistentCharacters[0].hp, 4, 'ancien maximum inconnu : PV conservés');
  assert.deepEqual(next.persistentCharacters[0].states, ['Sonné|1']);
  assert.equal(next.persistentCharacters[1].hp, 5);
  assert.equal(next.combat.participants[0].hp, 9, '9 blessures subies conservées');
  assert.equal(next.combat.participants[0].maxHp, 18);
  assert.equal(next.combat.participants[0].caracs.F, 30);
});

test('application — le lien choisi est enregistré, « aucune » aussi, et le lien enregistré prime', () => {
  const draft = { reserve: [profile()], persistentCharacters: [], encounters: [] };
  const first = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot: avecEscrime, links: { epee: 'Corps à corps (Escrime)', esq: '' }, convert: { epee: false } }]);
  const [epee, , esq] = first.reserve[0].diceLines;
  assert.equal(epee.base, 59); assert.equal(epee.extensions.ficheSkill, 'Corps à corps (Escrime)');
  assert.equal(epee.damage, 7); assert.equal(epee.damageFormula, undefined);
  assert.equal(esq.base, 45); assert.equal(esq.extensions?.ficheSkill, '', 'déliaison explicitement mémorisée');
  const again = planProfileSync(avecEscrime, first.reserve[0]);
  assert.equal(again.actions[0].skill, 'Corps à corps (Escrime)', 'le lien enregistré n’est pas reproposé');
  const unlinked = applyFicheSync({ reserve: [first.reserve[0]] }, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot: avecEscrime, links: { epee: '' } }]);
  assert.equal(unlinked.reserve[0].diceLines[0].extensions.ficheSkill, '');
  assert.equal(unlinked.reserve[0].diceLines[0].base, 59);
});

test('application — personnage persistant lié par la rencontre plutôt que par le nom', () => {
  const draft = {
    reserve: [profile()],
    persistentCharacters: [{ id: 'lié', name: 'Autre nom', hp: 2 }, { id: 'homonyme', name: 'Caelel', hp: 2 }],
    encounters: [{ id: 'r', entries: [{ profileId: 'caelel-pj', persistentCharacterId: 'lié' }] }]
  };
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot }]);
  assert.deepEqual(next.persistentCharacters.map(item => item.hp), [2, 2], 'ancien maximum inconnu conserve les PV');
  assert.equal(next.persistentCharacters[0].maxHp, 18);
  assert.equal(next.persistentCharacters[1].maxHp, undefined);
});

test('Store.applyFicheSync — combat et scène mis à jour, persistés et annulables', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile(profile());
  await store.savePersistentCharacter({ id: 'pc', name: 'Caelel', hp: 4 });
  await store.saveEncounter({ id: 'r', title: 'Rencontre', entries: [{ id: 'e1', profileId: 'caelel-pj', quantity: 1, zone: 'active', persistentCharacterId: 'pc' }] });
  await store.launchEncounter('r');
  const actorId = store.listParticipants()[0].id;
  await store.updateParticipant(actorId, { hp: -2, states: ['Sonné|1'] });
  const combatBefore = JSON.stringify(store.listParticipants());
  const sceneBefore = store.getActiveScene();
  const reserveBefore = JSON.stringify(store.listProfiles());
  const revision = store.getLocalRevision();

  await store.applyFicheSync([{ charId: 'caelel', profileId: 'caelel-pj', snapshot, ...confirmed }]);
  assert.equal(store.getLocalRevision(), revision + 1);
  const updated = store.listProfiles().find(item => item.id === 'caelel-pj');
  assert.equal(updated.hp, 18); assert.equal(updated.caracs.F, 30);
  assert.equal(updated.diceLines[0].base, 69);
  assert.equal(store.listPersistentCharacters()[0].hp, 4, 'ancien maximum inconnu');
  const participant = store.listParticipants()[0];
  assert.equal(participant.hp, 4, '14 blessures subies conservées au delta +6');
  assert.equal(participant.maxHp, 18);
  assert.equal(participant.initiative, 55);
  assert.equal(participant.caracs.F, 30);
  assert.equal(participant.actions[0].base, 69);
  assert.equal(participant.actions[0].damageFormula, 'BF+5');
  assert.deepEqual(participant.states, JSON.parse(combatBefore)[0].states);
  const scene = store.getActiveScene();
  assert.equal(scene.round, sceneBefore.round);
  assert.equal(scene.currentActorId, sceneBefore.currentActorId);
  assert.deepEqual(scene.order, sceneBefore.order);
  assert.equal(scene.participants[0].actions[0].base, 69);
  const reloaded = createStore({ persistence });
  await reloaded.ready;
  assert.deepEqual(reloaded.listParticipants(), store.listParticipants());
  assert.deepEqual(reloaded.getActiveScene(), scene);

  await store.undo();
  assert.equal(JSON.stringify(store.listProfiles()), reserveBefore);
  assert.equal(store.listPersistentCharacters()[0].hp, 4);
  assert.equal(JSON.stringify(store.listParticipants()), combatBefore);
  assert.equal(JSON.stringify(store.getActiveScene().participants), combatBefore);
});

test('Store.applyFicheSync — répare le combat même quand la bibliothèque est déjà à jour', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile(profile());
  await store.importFromReserve(['caelel-pj']);
  // État produit par la version précédente : seule la bibliothèque était actualisée.
  const entry = { charId: 'caelel', profileId: 'caelel-pj', snapshot, ...confirmed };
  const updated = applyFicheSync({ reserve: [profile()] }, [entry]).reserve[0];
  await store.updateProfile('caelel-pj', updated);
  const before = structuredClone(store.getDiceLines());
  const revision = store.getLocalRevision();
  await store.applyFicheSync([entry]);
  assert.equal(store.getLocalRevision(), revision + 1);
  assert.equal(store.listParticipants()[0].caracs.F, 30);
  assert.equal(store.listParticipants()[0].hp, 18, 'ancien 12/12 devient 18/18');
  assert.equal(store.listParticipants()[0].maxHp, 18);
  assert.equal(store.getDiceLines()[0].base, 69);
  assert.equal(store.getDiceLines()[0].damageFormula, 'BF+5');
  assert.equal(store.getDiceLines()[0].id, before[0].id);
  assert.deepEqual(await store.applyFicheSync([entry]), { ok: true, changed: false });
  await store.undo();
  assert.equal(store.listParticipants()[0].caracs.F, 25);
  assert.deepEqual(structuredClone(store.getDiceLines()), before);
});

test('combat — copies actives et en attente, ajustements locaux et participants étrangers', () => {
  const makeParticipant = (id, zone) => ({
    id, zone, profileId: 'caelel-pj', name: 'Nom de combat', hp: 3, maxHp: 12,
    initiative: 40, caracs: { ...profile().caracs, M: 6 }, states: ['Sonné|1'],
    armor: { body: 4 }, camp: 'pj',
    actions: [...profile().diceLines.map(action => ({ ...action, mod: -20, targetId: 'ennemi' })), { id: 'locale', note: 'Action locale', base: 17 }]
  });
  const draft = {
    reserve: [profile()],
    combat: { round: 4, currentActorId: 'actif', order: ['actif', 'ennemi', 'banc'], participants: [makeParticipant('actif', 'active'), makeParticipant('banc', 'bench'), { ...makeParticipant('ennemi', 'active'), profileId: 'autre' }] }
  };
  const before = structuredClone(draft);
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot, links: { ...confirmed.links, esq: '' }, convert: { epee: false } }]);
  for (const participant of next.combat.participants.slice(0, 2)) {
    const original = draft.combat.participants.find(item => item.id === participant.id);
    for (const key of ['id', 'name', 'zone', 'states', 'armor', 'camp']) assert.deepEqual(participant[key], original[key], key);
    assert.equal(participant.hp, 9, '3/12 devient 9/18');
    assert.equal(participant.caracs.M, 6);
    assert.equal(participant.maxHp, 18);
    assert.equal(participant.actions[0].base, 69);
    assert.equal(participant.actions[0].mod, -20);
    assert.equal(participant.actions[0].targetId, 'ennemi');
    assert.equal(participant.actions[0].damage, 7, 'conversion décochée');
    assert.equal(participant.actions[2].base, 45, 'action non liée');
    assert.deepEqual(participant.actions.at(-1), original.actions.at(-1));
  }
  assert.deepEqual(next.combat.participants[2], draft.combat.participants[2]);
  for (const key of ['round', 'currentActorId', 'order']) assert.deepEqual(next.combat[key], draft.combat[key]);
  assert.deepEqual(draft, before, 'aucune mutation du brouillon');
});

test('erreurs de lecture — messages lisibles', () => {
  assert.match(ficheErrorMessage({ code: 'permission-denied' }), /Accès refusé/);
  assert.match(ficheErrorMessage({ code: 'appCheck/fetch-status-error' }), /App Check/);
  assert.match(ficheErrorMessage({ code: 'unavailable' }), /injoignables/);
  assert.match(ficheErrorMessage(new Error('x'), { online: false }), /injoignables/);
  assert.match(ficheErrorMessage({ code: 'auth/popup-closed-by-user' }), /annulée/);
});

test('première reprise — suggestions visibles mais aucun lien implicite ni conversion', () => {
  const plan = planProfileSync(snapshot, profile());
  assert.equal(plan.actions[0].proposed, 'Corps à corps (Base)');
  assert.equal(plan.actions[0].skill, '');
  assert.equal(plan.actions[0].newBase, 50);
  assert.equal(plan.actions[0].damage.enabled, false);
  const result = applyFicheSync({ reserve: [profile()] }, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot }]);
  assert.equal(result.reserve[0].diceLines[0].base, 50);
  assert.equal(result.reserve[0].diceLines[0].damage, 7);
  assert.equal(result.reserve[0].diceLines[0].extensions.ficheSkill, undefined);
});
});

describe('Generateur de referentiel et equipement', () => {
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const json=(path,value)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');};
const hash=value=>createHash('sha256').update(value).digest('hex');

test('CSV équipement : conserve l’astérisque et ignore le verbe « inflige » dans la note spéciale Blackbriar',()=>{
 const dir=join(repo,'js/data/reference-source-csv');
 const tables={};
 for(const name of ['Mots Clés Armes et Armures','Armes Corps à Corps','Armes à Distance','Armures'])
  tables[name]=parseReferenceCSV(readFileSync(join(dir,`${name}.csv`),'utf8'));
 const rebuilt=buildEquipmentRows(tables),items=rebuilt.items;
 assert.deepEqual(items.map(({catalogVersion,...item})=>item),snapshot.equipment.items.map(({catalogVersion,...item})=>item));
 assert.deepEqual(rebuilt.keywords,snapshot.equipment.keywords);
 const pepperbox=items.find(item=>item.name==='Poivrière');
 assert.ok(pepperbox.keywords.some(word=>word.id==='a-repetition'&&word.parameter==='4'&&word.asterisk===true));
 const repeater=items.find(item=>item.name==='Arquebuse à répétition (2M)');
 assert.ok(repeater.keywords.some(word=>word.id==='a-repetition'&&word.parameter==='4'&&!word.asterisk),'aucun astérisque n’est inventé si le CSV n’en porte pas');
 const blackbriar=items.find(item=>item.name==='Javelot Blackbriar elfe sylvain');
 assert.ok(blackbriar.keywords.some(word=>word.id==='empaleuse'));
 assert.ok(!blackbriar.keywords.some(word=>word.id==='inflige'),'le verbe de la note Spécial ne constitue pas la qualité V5 Inflige');
 assert.match(blackbriar.notes,/Spécial \(si a passé la nuit dans une terre fertile, inflige la condition Empoisonné 1/);
});

test('génération équipement-seul : préserve le snapshot non-équipement et les fichiers partagés',()=>{
 const temp=mkdtempSync(join(tmpdir(),'e27-reference-equipment-only-'));
 try{
  const root=join(temp,'tool'),source=join(temp,'fiches'),tools=join(root,'tools');
  mkdirSync(tools,{recursive:true});
  writeFileSync(join(tools,'generate-reference-catalog.mjs'),readFileSync(join(repo,'tools/generate-reference-catalog.mjs')));
  const equipmentSource='export const equipmentOnlyFixture = true;\n';
  const refreshSource=[
   'const fold = value => String(value).toLowerCase();',
   'const helper = true;',
   'const sources = [];',
   'const keywordRows = [];',
   '/* Required source-shape markers exercised by the generator guard:',
   'const params = [];',
   "const regex = new RegExp(`(?:^|[,;]|\\\\bou\\\\s)\\\\s*${escaped}(?=$|[\\\\s.(,;])\\\\s*([+-]?\\\\d+|\\\\([^)]*\\\\))?`, 'gu');",
   'for (const match of folded.matchAll(regex)) {',
   '                matched = true;',
   'const start = match.index + match[0].length - match[1].length;',
   "if (matched) result.push({ id: entry.id, parameter: entry.parameter ? params.join(', ') : '' });",
   '*/',
   'const items = [];',
   'const keywords = [];',
   "const catalogVersion = 'after';",
   ''
  ].join('\n');
  mkdirSync(join(source,'js/fiche'),{recursive:true});mkdirSync(join(source,'js/data'),{recursive:true});mkdirSync(join(source,'tools'),{recursive:true});
  writeFileSync(join(source,'js/fiche/equipment.js'),equipmentSource);
  const catalog={catalogVersion:'equipment:new',fetchedAt:'2026-10-27T12:00:00.000Z',items:[{id:'v5-item',catalogVersion:'equipment:new'}],keywords:[{id:'v5-keyword'}],sources:{'Armes Corps à Corps':{url:'new-url',sha256:'new-hash'}}};
  json(join(source,'js/data/equipment-catalog.json'),catalog);
  writeFileSync(join(source,'tools/refresh-equipment-catalog.mjs'),refreshSource);
  const previous={schemaVersion:1,contentVersion:'references:old',fetchedAt:'keep-top-date',localRevision:'keep-local-revision',
   published:{skills:{entries:[{id:'skill'}]},talents:{entries:[{id:'talent-contract'}]}},
   talents:{entries:[{id:'talent'}],legacyAliases:[{from:'old'}],specializationTranslations:{Sight:'Vue'}},
   equipment:{items:[{id:'old-item'}],keywords:[{id:'old-keyword'}]},additionalSkills:[{id:'extra-skill'}],
   magic:{spells:[{id:'spell'}],miracles:[{id:'miracle'}]},otherField:{keep:true},
   sourceFiles:{'js/fiche/equipment.js':{sha256:'old-equipment'},'js/data/equipment-catalog.json':{sha256:'old-catalog'},
    'tools/refresh-equipment-catalog.mjs':{sha256:'old-refresh'},'js/catalogue/talent-source.js':{sha256:'keep-talent'}},
   sourceManifest:[{worksheet:'Armes Corps à Corps',url:'old-url',sha256:'old-hash',status:'public-export',fetchedAt:'old-date'},
    {worksheet:'Magie',url:'magic-url',sha256:'keep-magic',status:'public-export',fetchedAt:'old-date'}]};
  json(join(root,'js/data/reference-snapshot.json'),previous);
  mkdirSync(join(root,'js/data/shared/catalogue'),{recursive:true});
  mkdirSync(join(root,'js/data/shared/fiche'),{recursive:true});
  writeFileSync(join(root,'js/data/shared/catalogue/talent-source.js'),'export const sentinel = "talents";\n');
  writeFileSync(join(root,'js/data/shared/fiche/equipment.js'),'export const sentinel = "old equipment";\n');

  const run=()=>execFileSync(process.execPath,[join(tools,'generate-reference-catalog.mjs'),'--equipment-only',`--source-dir=${source}`],{cwd:root,encoding:'utf8'});
  const output=run();
  assert.match(output,/"mode":"equipment-only"/);
  const after=JSON.parse(readFileSync(join(root,'js/data/reference-snapshot.json'),'utf8'));
  for(const key of ['schemaVersion','fetchedAt','localRevision','published','talents','additionalSkills','magic','otherField'])assert.deepEqual(after[key],previous[key],`${key} doit rester intact`);
  assert.deepEqual(after.equipment,catalog);
  assert.notEqual(after.contentVersion,previous.contentVersion);
  assert.deepEqual(after.sourceFiles['js/catalogue/talent-source.js'],previous.sourceFiles['js/catalogue/talent-source.js']);
  assert.equal(after.sourceFiles['js/fiche/equipment.js'].sha256,hash(equipmentSource));
  assert.equal(after.sourceFiles['js/data/equipment-catalog.json'].sha256,hash(readFileSync(join(source,'js/data/equipment-catalog.json'))));
  assert.equal(after.sourceFiles['tools/refresh-equipment-catalog.mjs'].sha256,hash(refreshSource));
  assert.deepEqual(after.sourceManifest,[
   {...previous.sourceManifest[0],...catalog.sources['Armes Corps à Corps'],status:'local-v5-mirror',fetchedAt:catalog.fetchedAt},
   previous.sourceManifest[1]
  ]);
  assert.equal(readFileSync(join(root,'js/data/shared/catalogue/talent-source.js'),'utf8'),'export const sentinel = "talents";\n');
  assert.equal(readFileSync(join(root,'js/data/shared/fiche/equipment.js'),'utf8'),equipmentSource);
  assert.match(readFileSync(join(root,'js/data/reference-equipment-builder.js'),'utf8'),/buildEquipmentRows/);

  const firstSnapshot=readFileSync(join(root,'js/data/reference-snapshot.json'));
  const firstBuilder=readFileSync(join(root,'js/data/reference-equipment-builder.js'));
  const refreshPath=join(source,'tools/refresh-equipment-catalog.mjs');
  writeFileSync(refreshPath,refreshSource.replace('const params = [];','// params marker removed'));
  let missingPatternError;
  try { run(); } catch (error) { missingPatternError=error; }
  assert.ok(missingPatternError,'une source sans motif doit faire échouer la génération');
  assert.match(String(missingPatternError.stderr),/Motif générateur absent ou ambigu \(params\)/);
  writeFileSync(refreshPath,refreshSource);
  run();
  assert.deepEqual(readFileSync(join(root,'js/data/reference-snapshot.json')),firstSnapshot,'le snapshot équipement seul est reproductible');
  assert.deepEqual(readFileSync(join(root,'js/data/reference-equipment-builder.js')),firstBuilder,'le générateur équipement est reproductible');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
});

describe('Referentiel equipement et mots cles', () => {
const clone=structuredClone;
const item=(id,ap=1,locations=['body'],layer='leather',keywords=[])=>({id,baseId:'model-'+id,catalogVersion:'synthetic',kind:'armour',name:id,category:'Armure',damage:'',reach:'',range:'',ap,locations,layer,keywords,notes:'',source:'Fixture synthétique',custom:true});
const fetchedCsv={};
const fetchFixture=async url=>{const name=new URL(url).searchParams.get('sheet');fetchedCsv[name]??=await readFile(new URL('../../../js/data/reference-source-csv/'+name+'.csv',import.meta.url),'utf8');return {ok:true,text:async()=>fetchedCsv[name]};};
const actor={id:'a',caracs:{F:39},equipment:[],states:[]};
const action={id:'weapon',type:'attack',base:80,mod:0,damage:9,qualities:[]};

test('Références — CSV accents, virgules, guillemets et cellules sur plusieurs lignes',()=>{
 assert.deepEqual(parseReferenceCSV('\uFEFF"Nom","Effet"\r\n"Épée","Une, deux\nTrois ""quatre"""'),[['Nom','Effet'],['Épée','Une, deux\nTrois "quatre"']]);
 assert.throws(()=>parseReferenceCSV('"incomplet'),/incomplet/);
});
test('Références — identifiant explicite et paramètres conservent colonnes nommées',async()=>{
 const csv=await fetchFixture('https://example.org/?sheet=Mots%20Cl%C3%A9s%20Armes%20et%20Armures').then(r=>r.text());const words=parseKeywordCSV(csv);
 assert.equal(words.length,57);assert.equal(words.find(w=>w.id==='protectrice').edition,'V4');assert.ok(words.find(w=>w.id==='protectrice').parameter);
 assert.throws(()=>parseKeywordCSV('Nom,Effet\nTest,test'),/Colonnes/);
});
test('Références — instantané commun source, compétences principales et talents traduits',()=>{
 const pack=getReferenceCatalogue();assert.equal(pack.items.length,211);assert.equal(pack.talents.length,213);
 assert.equal(pack.magic.spells.length,277);assert.equal(resolveSkill('Corps à corps (Base)').entry.carac,'cc');
 assert.equal(resolveTalent('Hardy').entry.id,resolveTalent('Dur à cuire').entry.id);
 assert.equal(resolveTalent('Magie des Arcanes (Fire)').specialization,'Aqshy');
 assert.equal(resolveSkill('Nom approchant inconnu').status,'unknown');
});
test('Références — talents rangs et spécialités séparés, acquisitions et notes conservées',()=>{
 const result=aggregateTalents([{id:'a',nom:'Sens aiguisé (Vue)',note:'un'},{id:'b',nom:'Acute Sense (Sight)',note:'deux'},{id:'c',nom:'Sens aiguisé (Ouïe)',note:'trois'}]);
 assert.equal(result.coverage,'present');assert.equal(result.items.length,2);assert.equal(result.items.find(i=>i.rank===2).acquisitions[1].note,'deux');
 assert.equal(aggregateTalents(undefined).coverage,'absent');assert.equal(aggregateTalents([]).coverage,'present');assert.equal(aggregateTalents([null]).coverage,'invalid');
});
test('Équipement — collection absente/vide/invalide et IDs dupliqués ne se confondent pas',()=>{
 assert.equal(normalizeEquipment(undefined).coverage,'absent');assert.equal(normalizeEquipment([]).coverage,'present');
 assert.equal(normalizeEquipment({}).coverage,'invalid');assert.equal(normalizeEquipment([item('one'),item('one')]).coverage,'invalid');
 const malformed=item('bad');malformed.ap='1';assert.equal(normalizeEquipment([malformed]).coverage,'invalid');
});
test('Équipement — exemplaire inconnu personnalisé et paramètre textuel conservés sans substitution',()=>{
 const custom=item('custom',null,['leftArm'],'rigid',[{id:'unknown-word',parameter:'spécial'}]);const input=[custom];const out=normalizeEquipment(input);
 assert.equal(out.coverage,'present');assert.deepEqual(out.items,input);assert.ok(out.warnings.some(w=>w.code==='unknown-keyword'));
 out.items[0].name='changed';assert.equal(custom.name,'custom');assert.equal(out.items[0].ap,null);
 assert.equal(qualityLabel({id:'explosion',parameter:'très large'}),'Explosion très large');
});
test('Équipement — parité six zones, couches et deux pièces même couche',()=>{
 const items=[item('cuir',1),item('maille',2,['body','rightArm'],'flexible',[{id:'flexible',parameter:''}]),item('plates',2,['body','leftArm'],'rigid'),item('moins-bien',1,['body'],'rigid')];
 assert.deepEqual(armourProtection(items),sourceArmour(items));assert.deepEqual(calculateArmor(items),{head:0,body:5,rightArm:2,leftArm:2,rightLeg:0,leftLeg:0});
 assert.equal(armourProtection(items).locations.find(l=>l.id==='body').ignored[0].item.id,'moins-bien');
});
test('Équipement — protections héritées symétriques sans objets fictifs',()=>{
 assert.deepEqual(normalizeArmorLocations({head:1,body:3,arms:2,legs:1}),{head:1,body:3,rightArm:2,leftArm:2,rightLeg:1,leftLeg:1});
 const target={armor:{arms:2},armorLocations:{leftArm:5,rightArm:1}};
 assert.equal(locationProtection(target,{location:{key:'ARM',side:'left'}}).ap,5);
 assert.equal(locationProtection(target,{location:{key:'ARM',side:'right'}}).ap,1);
});
test('Équipement V5 — un bouclier conservé dans les défenses fournit ses PA V5 sur la localisation',()=>{
 const shield={...item('v5-shield',2,['head','body','rightArm','leftArm','rightLeg','leftLeg'],'none',[{id:'bouclier',parameter:''}]),kind:'shield',category:'Bouclier'};
 const target={equipment:[shield],armor:{head:0,body:0,arms:0,legs:0}};
 const defense=locationProtection(target,{location:'body',shieldId:shield.id,shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:false});
 assert.equal(defense.ap,2);assert.equal(defense.shieldAp,2);assert.equal(defense.manual.length,0);
 const ranged=locationProtection(target,{location:'body',shieldId:shield.id,shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:true,lineOfSight:false});
 assert.equal(ranged.ap,2,'un bouclier V5 de 2 PA s’oppose aux tirs à distance sans ligne de vue');assert.deepEqual(ranged.manual,[]);
});
test('Équipement — formule sûre en parité, BF39/40 et expression spéciale intacte',()=>{
 for(const formula of ['BF+4','+ BF +4','BF × 2','1d10 spécial','4'])for(const f of [39,40]){const data={carac:{f:{base:f,adv:0}}};assert.deepEqual(equipmentFormula(formula,data),sourceFormula(formula,data));}
 assert.equal(equipmentFormula('BF+4',{carac:{f:{base:39}}}).value,7);assert.equal(equipmentFormula('BF+4',{carac:{f:{base:40}}}).value,8);
 assert.equal(equipmentFormula('process.exit()',{}).value,null);
});
test('Protection — Partielle V5 ignore uniquement pièce en localisation paire',()=>{
 const target={equipment:[item('cuir',1),item('casque',2,['body'],'rigid',[{id:'partielle',parameter:''}])]};
 assert.equal(locationProtection(target,{location:'body',hitLocationRoll:50,critical:false}).ap,1);
 assert.equal(locationProtection(target,{location:'body',hitLocationRoll:51,critical:false}).ap,3);
 assert.equal(locationProtection(target,{location:'body'}).ap,null);
});
test('Protection — Points faibles uniquement critique Empaleuse ; Impénétrable critique impair',()=>{
 const target={equipment:[item('cuir',1),item('plates',2,['body'],'rigid',[{id:'points-faibles',parameter:''},{id:'impenetrable',parameter:''}])]};
 const base={location:'body',attackRoll:33,critical:true,qualities:[{id:'empaleuse'}]};
 const value=locationProtection(target,base);assert.equal(value.ap,1);assert.equal(value.criticalIgnored,true);
 assert.equal(locationProtection(target,{...base,critical:false}).ap,3);
 assert.equal(locationProtection(target,{...base,attackRoll:22}).criticalIgnored,false);
});
test('Protection — bouclier séparé, un seul et défense/projectiles explicites',()=>{
 const shield={...item('shield',2,[],'none',[{id:'protectrice',parameter:'2'}]),kind:'shield'};const big={...shield,id:'big',ap:4,keywords:[{id:'protectrice',parameter:'4'}]};const target={equipment:[item('cuir',1),shield,big]};
 assert.equal(calculateArmor(target.equipment).body,1);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:true,defenseProvided:true,ranged:false}).ap,3);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:false}).ap,1);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield'}).ap,null);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true}).manual[0],'disponibilite-bouclier-requise');
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:true,defenseProvided:true,ranged:true}).ap,null);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:true,defenseProvided:true,ranged:true,lineOfSight:true}).ap,3);
});
test('Protection — PA inconnus et mot clé retiré demandent arbitrage ; valeur manuelle traçable',()=>{
 const target={equipment:[item('unknown',null)]};assert.equal(locationProtection(target,{location:'body'}).ap,null);
 const override=locationProtection(target,{location:'body',manualAp:4});assert.equal(override.ap,4);assert.equal(override.arbitrated,true);
});
test('Qualités — munition et arme dédoublonnées avec sources et paramètres exacts',()=>{
 const weapon={id:'w',kind:'weapon',keywords:[{id:'empaleuse',parameter:''},{id:'recharge',parameter:'2'}]};const ammo={id:'m',kind:'ammunition',keywords:[{id:'empaleuse',parameter:''},{id:'explosion',parameter:'large'}]};
 const merged=mergeEquipmentQualities(weapon,ammo);assert.equal(merged.qualities.length,3);assert.equal(merged.sources.length,4);assert.equal(equipmentQualities(weapon)[1].rating,2);assert.equal(merged.qualities[2].parameter,'large');
});
test('Moteurs — Inoffensive annule les deux bonus comme source corrigée',()=>{
 const computed=computeDamage({weaponDamage:3,roll:38,sl:1,targetArmour:2,qualities:['inoffensive','percutante','devastatrice']});assert.equal(computed.sl,1);assert.equal(computed.bonusPercutante,0);assert.equal(computed.finalDamage,0);
});
test('Résolution — bonne protection à gauche/droite et aucun changement de santé avant appliquer',()=>{
 const target={id:'t',hp:20,caracs:{E:0},armorLocations:{leftArm:5,rightArm:1}};
 const left=previewResolution({actor,action,target,roll:51,baseRevision:0});const right=previewResolution({actor,action,target,roll:52,baseRevision:0});
 assert.equal(left.damage.targetArmour,5);assert.equal(right.damage.targetArmour,1);assert.equal(target.hp,20);
});
test('Résolution — action sans compétence résolue bloquée explicitement',()=>{
 assert.throws(()=>previewResolution({actor,action:{...action,base:'',extensions:{fiche:{requiresLink:true}}},roll:40}),error=>error.code==='SKILL_LINK_REQUIRED');
});
test('Résolution — contexte Partielle absent interdit application ; arbitré ensuite',()=>{
 const target={id:'t',hp:20,caracs:{E:0},equipment:[item('armor',null,['body'])]};const preview=previewResolution({actor,action,target,roll:35,baseRevision:0});
 assert.equal(preview.damage,null);assert.equal(applyResolution(preview,{revision:0,participants:[target]}).status,'manual');
 const valid=previewResolution({actor,action,target,roll:35,baseRevision:0,protectionContext:{manualAp:2}});assert.equal(valid.damage.targetArmour,2);
});
test('Références — contenu fonctionnel stable si dates changent',async()=>{
 const previous=getReferenceSnapshot();const changed=clone(previous);changed.fetchedAt='2099-12-31';changed.talents.fetchedAt='2099-12-31';changed.published.publishedAt='2099-12-31';
 assert.equal(await sha256(referenceContentPayload(changed)),await sha256(referenceContentPayload(previous)));
});
test('Références — refresh atomique réussit avec source publique et version identique',async()=>{
 const before=getReferenceSnapshot().contentVersion;const result=await refreshReferences({fetchImpl:fetchFixture,storage:null});assert.equal(result.ok,true,result.status.error);assert.equal(getReferenceSnapshot().contentVersion,before);
 assert.equal(getReferenceStatus().error,null);assert.equal(getReferenceCatalogue().items.length,211);
});
test('Références — un échec HTTP ou source incomplète conserve le dernier ensemble et date succès',async()=>{
 const before=getReferenceSnapshot(),status=getReferenceStatus();let failure=await refreshReferences({storage:null,fetchImpl:async url=>new URL(url).searchParams.get('sheet')==='Armures'?{ok:false,status:503}:fetchFixture(url)});assert.equal(failure.ok,false);assert.strictEqual(getReferenceSnapshot(),before);assert.equal(getReferenceStatus().updatedAt,status.updatedAt);assert.match(getReferenceStatus().error,/503/);
 failure=await refreshReferences({storage:null,fetchImpl:async url=>new URL(url).searchParams.get('sheet')==='Talents'?{ok:true,text:async()=>'Nom,Effet\nVide,'}:fetchFixture(url)});assert.equal(failure.ok,false);assert.strictEqual(getReferenceSnapshot(),before);
});
test('Références — effet changé reste consultable mais moteur ancien refuse et historique intact',async()=>{
 const prior=getReferenceSnapshot();const result=await refreshReferences({storage:null,fetchImpl:async url=>{const response=await fetchFixture(url);if(new URL(url).searchParams.get('sheet')!=='Mots Clés Armes et Armures')return response;const csv=await response.text();return {ok:true,text:async()=>csv.replace('Sur une touche, ajoute le dé des unités du jet d\'attaque aux Dégâts. Inoffensive l\'annule.','Effet nouvelle édition non couvert')};}});assert.equal(result.ok,true,result.status.error);assert.equal(keywordMechanicalStatus('percutante').status,'manual');assert.equal(computeDamage({weaponDamage:4,sl:2,qualities:['percutante']}),null);
 const target={id:'t',hp:20,caracs:{E:0}};const preview=previewResolution({actor,action:{...action,qualities:['percutante']},target,roll:35,baseRevision:0});assert.equal(preview.damage,null);assert.equal(applyResolution(preview,{revision:0,participants:[target]}).status,'manual');
 await refreshReferences({fetchImpl:fetchFixture,storage:null});assert.equal(keywordMechanicalStatus('percutante').status,'covered');assert.equal(getReferenceSnapshot().contentVersion,prior.contentVersion);
});
test('Références — cache contenant objet invalide rejeté avant activation',()=>{
 const invalid=clone(getReferenceSnapshot());invalid.equipment.items[0].ap=-1;assert.throws(()=>createReferenceResolvers(invalid),/PA/);
});

test('Résolution — Inoffensive exige deux gravités, minimum retenu et dés conservés',()=>{
 const target={id:'t',hp:20,caracs:{E:0}};const input={actor,action:{...action,qualities:['inoffensive']},target,roll:33,baseRevision:0,criticalRolls:{location:50,effect:71}};
 const missing=previewResolution(input);assert.equal(missing.critical.details.needsAlternative,true);assert.equal(applyResolution(missing,{revision:0,participants:[target]}).status,'manual');
 const ready=previewResolution({...input,criticalRolls:{...input.criticalRolls,effectAlternative:25}});assert.equal(ready.critical.details.effectRollBase,25);assert.deepEqual(ready.critical.details.effectRollCandidates,[71,25]);assert.equal(ready.critical.details.needsAlternative,false);
});

test('Résolution — munition uniquement arme distance et catégorie compatible',()=>{
 const bow={...item('bow',null,[],'none',[{id:'empaleuse',parameter:''}]),kind:'weapon',category:'Arc',range:'50',damage:'BF+3'};const ammo={...bow,id:'arrow',kind:'ammunition',damage:'+0'};const melee={...bow,id:'sword',category:'Base',range:''};
 assert.equal(ammunitionCompatibility(bow,ammo).status,'compatible');assert.equal(ammunitionCompatibility(melee,ammo).status,'incompatible');
 const sourceActor={...actor,equipment:[bow,ammo,melee]};const link=id=>({...action,extensions:{fiche:{equipmentId:id}}});
 assert.throws(()=>previewResolution({actor:sourceActor,action:link('sword'),roll:35,ammunitionId:'arrow'}),error=>error.code==='AMMUNITION_INCOMPATIBLE');
 const valid=previewResolution({actor:sourceActor,action:link('bow'),roll:35,ammunitionId:'arrow'});assert.equal(valid.input.ammunitionSources.length,2);assert.equal(valid.input.action.qualities.length,1);
});

test('Références — provenance des fonctions partagées vérifiée par empreinte source',async()=>{
 const pack=getReferenceSnapshot();for(const path of ['js/fiche/equipment.js','js/fiche/skill-names.js','js/fiche/basic-skills.js','js/catalogue/skill-resolver.js','js/catalogue/talent-resolver.js','js/catalogue/talent-source.js']){const bytes=await readFile(new URL('../../../js/data/shared/'+path.slice(3),import.meta.url),'utf8');assert.equal(createHash('sha256').update(bytes).digest('hex'),pack.sourceFiles[path].sha256,path);}
});

test('Résolution — source arc impose tir malgré contexte absent ou faux, petit bouclier refusé',()=>{
 const bow={...item('bow',null,[],'none'),kind:'weapon',category:'Arc',range:'50'};
 const shield={...item('shield',1,[],'none',[{id:'protectrice',parameter:'1'}]),kind:'shield'};
 const sourceActor={...actor,equipment:[bow]},target={id:'t',hp:20,caracs:{E:0},equipment:[shield]};
 const input={actor:sourceActor,action:{...action,extensions:{fiche:{equipmentId:'bow'}}},target,roll:35,baseRevision:0,defense:{roll:85,base:20},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true,lineOfSight:true}};
 for(const ranged of [undefined,false]){const preview=previewResolution({...input,protectionContext:{...input.protectionContext,ranged}});assert.equal(preview.input.attackContext.ranged,true);assert.equal(preview.protection.ap,null);assert.equal(preview.protection.shieldAp,0);assert.ok(preview.protection.manual.includes('bouclier-projectile-contexte-requis'));assert.equal(applyResolution(preview,{revision:0,participants:[target]}).status,'manual');}
});
test('Résolution — bouclier exige vraie opposition et type legacy confirmé',()=>{
 const sword={...item('sword',null,[],'none'),kind:'weapon',category:'Base',range:''};
 const shield={...item('shield',2,[],'none',[{id:'protectrice',parameter:'2'}]),kind:'shield'};
 const target={id:'t',hp:20,caracs:{E:0},equipment:[shield]},context={shieldId:'shield',shieldAvailable:true,opposedWithShield:true};
 const input={actor:{...actor,equipment:[sword]},action:{...action,extensions:{fiche:{equipmentId:'sword'}}},target,roll:35,baseRevision:0,protectionContext:{...context,defenseProvided:true}};
 const absent=previewResolution(input);assert.equal(absent.protection.ap,null);assert.ok(absent.protection.manual.includes('jet-opposition-requis:bouclier'));assert.equal(absent.protection.shieldAp,0);
 const valid=previewResolution({...input,defense:{roll:85,base:20}});assert.equal(valid.protection.ap,2);assert.equal(valid.input.attackContext.ranged,false);
 const legacy=previewResolution({actor,action,target,roll:35,baseRevision:0,defense:{roll:85,base:20},protectionContext:context});assert.equal(legacy.protection.ap,null);assert.ok(legacy.protection.manual.includes('type-attaque-requis:bouclier'));
 const confirmed=previewResolution({actor,action,target,roll:35,baseRevision:0,defense:{roll:85,base:20},protectionContext:{...context,ranged:false}});assert.equal(confirmed.protection.ap,2);
});
});

describe('Couverture des especes et verification', () => {
test('générateur de couverture : --check détecte un écart sans écrire', () => {
  const temp = mkdtempSync(join(tmpdir(), 'coverage-check-'));
  try {
    mkdirSync(join(temp, 'js'), { recursive: true });
    mkdirSync(join(temp, 'docs'), { recursive: true });
    cpSync('js/data', join(temp, 'js/data'), { recursive: true });
    cpSync('docs/lot2', join(temp, 'docs/lot2'), { recursive: true });
    const target = join(temp, 'js/data/v5-talent-coverage.json');
    const script = resolve('tools/build-v5-talent-coverage.mjs');
    const run = () => spawnSync(process.execPath, [script, '--check'], { cwd: temp, encoding: 'utf8' });
    const before = readFileSync(target, 'utf8');
    assert.equal(run().status, 0);
    assert.equal(readFileSync(target, 'utf8'), before);
    const changed = before + ' ';
    writeFileSync(target, changed);
    assert.equal(run().status, 1);
    assert.equal(readFileSync(target, 'utf8'), changed);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('Maître à bord : la couverture expose le calcul assisté déjà raccordé', () => {
  const clause = v5TalentCoverage('talent-master-and-commander').clauses.find(row => row.id === 'tri:0');
  assert.equal(clause.mode, 'assisted');
});
test('couverture divine : Haine sacrée automatique et accès divin documenté', () => {
  const hatred = v5TalentCoverage('talent-holy-hatred');
  assert.equal(hatred.clauses.find(row => row.id === 'magic:0').mode, 'automatic');
  for (const id of ['talent-bless', 'talent-invoke']) {
    const clause = v5TalentCoverage(id).clauses.find(row => row.id === 'magic:1');
    assert.match(clause.text, /moteur divin/);
    assert.notEqual(clause.mode, 'deferred');
  }
  const changedCatalogue = { talents: [{ id: 'talent-master-and-commander', description: 'source modifiée' }] };
  assert.equal(v5TalentCoverage('talent-master-and-commander', changedCatalogue).clauses[0].mode, 'reminder');
});
});

describe('Synchronisation des especes', () => {
const fiche = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url)));
const snap = (race, talentsAcq = []) => ficheSnapshot('caelel', { ...fiche, race, talentsAcq });
test('espèces : mouvement et blessures sur fiche réelle', () => {
  for (const [race, movement, wounds] of [['halfelin',3,14],['halfling',3,14],['ogre',6,28],['gnome',3,11],['elfe noir',5,14],['elfe-des-mers',5,14],['skink',6,11],['humain',4,14],['nain',3,14],['haut-elfe',5,14],['elfe-sylvain',5,14]]) {
    const s = snap(race); assert.equal(s.movement, movement, race); assert.equal(s.wounds, wounds, race);
  }
  assert.equal(snap('ogre', [{nom:'Dur à cuire'}]).wounds, 36);
});
test('espèce inconnue : avertissement et synchronisation partielle', () => {
  assert.ok(snap('constructor').warnings.some(w => w.code === 'unknown-species'));
  const s = snap('inconnue');
  const profile = {id:'pj',name:'Caelel',kind:'PJ',hp:10,movement:7,caracs:{},diceLines:[]};
  const plan = planProfileSync(s, profile);
  assert.equal(s.movement, null); assert.ok(plan.warnings.some(w => w.code === 'unknown-species'));
  const next = applyFicheSync({reserve:[profile]}, [{profileId:'pj',charId:'caelel',snapshot:s}]);
  assert.equal(next.reserve[0].movement, 7); assert.equal(next.reserve[0].hp, 14);
  assert.ok(next.reserve[0].skills.length > 0);
});

test('espèce inconnue : mouvement des participants conservé avec et sans couche magique', () => {
  const snapshot = snap('inconnue');
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 10, movement: 7, caracs: {}, diceLines: [] };
  const participants = [
    { id: 'simple', profileId: 'pj', movement: 9, M: 9, caracs: { M: 9 } },
    { id: 'magie', profileId: 'pj', movement: 8, M: 8, caracs: { M: 8 }, extensions: { v5: { baseCaracs: { M: 8 }, spellEffects: [] } } }
  ];
  const result = applyFicheSync({ reserve: [profile], combat: { participants } }, [{ profileId: 'pj', charId: 'caelel', snapshot }]);
  assert.equal(result.combat.participants[0].movement, 9);
  assert.equal(result.combat.participants[1].movement, 8);
  assert.equal(result.combat.participants[1].extensions.v5.baseCaracs.M, 8);
});
});

describe('Fiches V3 modele et synchronisation', () => {
const raw = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
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
  const input = { actorId: actor.id, targetId: target.id, action: actor.actions[0], roll: 42, defense: { base: 30, roll: 65 } };
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
});

describe('Controle des fiches PJ et rencontres', () => {
// Contrôle indépendant : résultats du cahier des charges, sans réutiliser les
// fonctions de calcul d'équipement pour construire les valeurs attendues.
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const snapshotWithMax = max => ({ ...ficheSnapshot('caelel', fixture), wounds: max, woundsMax: max });
const profile = extra => ({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, ...extra });
const actor = (id, hp = 8, maxHp = 14) => ({ id, profileId: 'pj', persistentCharacterId: 'pc', name: 'Caelel', hp, maxHp, states: [{ id: 'etat', key: 'sonne', name: 'Sonné', level: 2, duration: 3 }], actions: [], zone: 'bench', camp: 'pj', extensions: { shieldUnavailable: { id: 'shield', round: 4 } } });
const sync = (draft, snapshot) => applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {} }]);
const healthDraft = (hp = 8, maxHp = 14) => ({
  reserve: [profile()],
  persistentCharacters: [{ id: 'pc', name: 'Caelel', hp, maxHp, states: ['Sonné|3'] }],
  encounters: [{ id: 'encounter', entries: [{ profileId: 'pj', persistentCharacterId: 'pc' }] }],
  combat: { participants: [actor('active', hp, maxHp)], round: 4, currentActorId: 'active', order: ['active'] },
  activeScene: { id: 'scene', participants: [actor('active', hp, maxHp)], round: 4, currentActorId: 'active', order: ['active'] },
  suspendedScenes: [{ id: 'suspended', participants: [actor('suspended', hp, maxHp)], round: 2, currentActorId: 'suspended', order: ['suspended'] }],
  archives: [{ id: 'finished', participants: [actor('archived', hp, maxHp)] }], log: []
});

for (const [label, oldHp, oldMax, newMax, expected] of [
  ['R23 augmentation', 8, 14, 16, 10], ['R24 réduction', 8, 14, 10, 4],
  ['R24 négatif autorisé', 8, 14, 4, -2], ['R38 écart signé', 16, 14, 16, 18],
  ['R40 passage à zéro', -2, 14, 16, 0]
]) test(`Contrôle santé ${label} — même delta appliqué une fois par état`, () => {
  const draft = healthDraft(oldHp, oldMax); const before = structuredClone(draft);
  const next = sync(draft, snapshotWithMax(newMax));
  assert.deepEqual(draft, before, 'entrée immuable');
  for (const state of [next.persistentCharacters[0], next.combat.participants[0], next.activeScene.participants[0], next.suspendedScenes[0].participants[0]]) {
    assert.equal(state.hp, expected); assert.equal(state.maxHp, newMax);
    assert.equal(state.maxHp - state.hp, oldMax - oldHp, 'écart signé conservé');
  }
  assert.deepEqual(next.combat.participants[0].states, before.combat.participants[0].states);
  assert.deepEqual(next.combat.participants[0].extensions.shieldUnavailable, before.combat.participants[0].extensions.shieldUnavailable);
  assert.equal(next.combat.round, 4); assert.equal(next.combat.currentActorId, 'active');
  assert.deepEqual(next.combat.order, ['active']); assert.deepEqual(next.archives, before.archives);
  assert.equal(next.reserve[0].maxHp, newMax); assert.equal(next.reserve[0].hp, newMax, 'réserve : compatibilité maximum');
  assert.equal(sync(next, snapshotWithMax(newMax)), next, 'aucun second delta ni nouvel événement');
});

test('Contrôle R37 — maximum nouveau non calculable : les deux nombres et les états restent intacts', () => {
  const draft = healthDraft(); const next = sync(draft, snapshotWithMax(null));
  for (const state of [next.persistentCharacters[0], next.combat.participants[0], next.activeScene.participants[0], next.suspendedScenes[0].participants[0]]) {
    assert.equal(state.hp, 8); assert.equal(state.maxHp, 14);
  }
});

const payload = {
  skills: [{ id: 'skill-id', name: 'Corps à corps (Base)', total: 51 }],
  talents: [{ id: 'talent-id', name: 'Talent retiré', rank: 2, speciality: 'Mêlée', acquisitions: [{ id: 'one', note: 'ancienne note' }, { id: 'two', note: 'seconde note' }] }],
  equipment: [{ id: 'instance', baseId: 'same-model', catalogVersion: 'v1', kind: 'weapon', name: 'Arme personnalisée', damage: 'BF+4', keywords: [{ id: 'entangle', parameter: 'corde renforcée' }], notes: '<img src=x onerror=alert(1)>', custom: true }],
  spells: [{ nom: 'Sort', note: 'consultation' }], prayers: [{ nom: 'Prière', note: 'consultation' }],
  armorLocations: { head: 0, body: 5, rightArm: 4, leftArm: 1, rightLeg: 2, leftLeg: 0 },
  ficheSnapshot: { format: 1, charId: 'caelel', source: { fingerprint: 'fixture', revision: 'r2' }, coverage: { equipment: 'present' } },
  movement: 5, race: 'humain'
};

test('Contrôle R27 — constructeurs, sanitize, JSON, migration et scène conservent les collections et paramètres textuels', () => {
  const input = profile(payload); const before = structuredClone(input);
  const p = new Profile(input); const participant = new Participant({ ...input, id: 'participant', profileId: 'pj', hp: -2 });
  const scene = launchEncounter({ id: 'enc', title: 'Recette', entries: [{ id: 'entry', profileId: 'pj', quantity: 1, zone: 'active', persistentCharacterId: 'pc' }] }, { profiles: [p], persistentCharacters: [{ id: 'pc', hp: 8, maxHp: 14, states: ['Sonné|3'] }], idFactory: () => 'scene-actor' });
  const envelope = { schemaVersion: 3, reserve: [sanitizeProfile(p)], combat: { participants: [sanitizeParticipant(participant)], round: 1, order: ['participant'], currentActorId: 'participant' }, activeScene: scene, suspendedScenes: [], diceLines: [], log: [] };
  const migrated = migrateSnapshot(JSON.parse(JSON.stringify(envelope))).data;
  for (const item of [p, participant, sanitizeProfile(p), sanitizeParticipant(participant), migrated.reserve[0], migrated.combat.participants[0], migrated.activeScene.participants[0]]) {
    for (const [key, expected] of Object.entries(payload)) assert.deepEqual(item[key], expected, `${key} perdu ou modifié`);
  }
  assert.equal(migrated.combat.participants[0].hp, -2);
  assert.equal(migrated.activeScene.participants[0].hp, 8);
  assert.deepEqual(input, before);
  p.equipment[0].keywords[0].parameter = 'mutation locale';
  assert.equal(input.equipment[0].keywords[0].parameter, 'corde renforcée', 'copies indépendantes');
});

test('Contrôle R16 — migration v2 des quatre familles vers six zones sans créer d’équipement', () => {
  const legacy = { schemaVersion: 2, reserve: [profile({ armor: { head: 0, body: 3, arms: 2, legs: 1 } })], combat: { participants: [actor('legacy')], round: 0 }, log: [], diceLines: [] };
  const before = structuredClone(legacy); const result = migrateSnapshot(legacy).data;
  assert.equal(result.schemaVersion, 3);
  assert.deepEqual(result.reserve[0].armorLocations, { head: 0, body: 3, rightArm: 2, leftArm: 2, rightLeg: 1, leftLeg: 1 });
  assert.ok(!result.reserve[0].equipment || result.reserve[0].equipment.length === 0);
  assert.deepEqual(legacy, before);
});

const object = (id, extra = {}) => ({ id, baseId: 'custom-model', catalogVersion: 'fixture-v1', kind: 'weapon', name: 'Épée personnelle', category: 'Base', damage: 'BF+4', reach: 'Moyenne', range: '', ap: null, locations: [], layer: 'none', keywords: [{ id: 'unknown-word', parameter: 'corde renforcée' }], notes: 'note personnalisée', source: 'Campagne', custom: true, ...extra });
const equipmentSnapshot = equipment => ficheSnapshot('caelel', { ...fixture, equipment });

test('Contrôle R02/R03/R04/R21/R22 — identité des instances, retrait ciblé, couvertures absente et invalide', () => {
  const local = { id: 'local', type: 'attack', base: 35, mod: -10, targetId: 'enemy', note: 'Épée personnelle', damage: 6, qualities: [], valuesX: null, capacity: null, extensions: {} };
  const original = { reserve: [profile({ diceLines: [local] })], persistentCharacters: [], encounters: [] };
  const first = sync(original, equipmentSnapshot([object('one'), object('two')]));
  assert.equal(first.reserve[0].equipment.length, 2, 'deux instances même modèle/nom');
  assert.equal(first.reserve[0].diceLines.filter(row => row.extensions?.fiche?.role === 'attack').length, 2);
  assert.deepEqual(first.reserve[0].diceLines.find(row => row.id === 'local'), local, 'action locale sans confirmation inchangée');
  const linkedId = first.reserve[0].diceLines.find(row => row.extensions?.fiche?.equipmentId === 'one' && row.type === 'attack').id;
  const renamed = sync(first, equipmentSnapshot([object('one', { name: 'Nouvelle épée', damage: 'BF*2+4' }), object('two')]));
  const linked = renamed.reserve[0].diceLines.filter(row => row.extensions?.fiche?.equipmentId === 'one' && row.type === 'attack');
  assert.equal(linked.length, 1); assert.equal(linked[0].id, linkedId); assert.equal(linked[0].note, 'Nouvelle épée');
  assert.equal(renamed.reserve[0].equipment[0].damage, 'BF*2+4');
  assert.deepEqual(renamed.reserve[0].equipment[0].keywords, [{ id: 'unknown-word', parameter: 'corde renforcée' }]);
  const absent = sync(renamed, ficheSnapshot('caelel', fixture));
  assert.deepEqual(absent.reserve[0].equipment, renamed.reserve[0].equipment, 'absence ne retire rien');
  const invalid = sync(renamed, equipmentSnapshot([object('duplicate'), object('duplicate')]));
  assert.equal(invalid.reserve[0].ficheSnapshot.coverage.equipment, 'invalid');
  assert.deepEqual(invalid.reserve[0].equipment, renamed.reserve[0].equipment, 'ID dupliqué bloque la collection entière');
  assert.deepEqual(invalid.reserve[0].diceLines, renamed.reserve[0].diceLines);
  const cleared = sync(renamed, equipmentSnapshot([]));
  assert.deepEqual(cleared.reserve[0].equipment, []);
  assert.deepEqual(cleared.reserve[0].diceLines, [local], 'seules actions liées retirées');
});

test('Contrôle R25 — précondition périmée refuse tout lot sans mutation', () => {
  const draft = { reserve: [profile()], persistentCharacters: [] }; const before = structuredClone(draft);
  assert.throws(() => applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot: equipmentSnapshot([object('one')]), expectedProfileFingerprint: 'old-invalid-fingerprint' }]), error => error.code === 'fiche-plan-stale');
  assert.deepEqual(draft, before);
});

test('Contrôle reprise confirmée — adoption de l’ancienne action ne crée aucun doublon dans ses copies de scène', () => {
  const local = { id: 'legacy', type: 'attack', base: 35, mod: -10, targetId: 'enemy', note: 'Vieille épée', damage: 6, qualities: [] };
  const draft = { reserve: [profile({ diceLines: [local] })], combat: { participants: [{ ...actor('participant'), actions: [local] }] }, activeScene: { id: 'scene', participants: [{ ...actor('participant'), actions: [local] }] } };
  const snapshot = equipmentSnapshot([object('one')]);
  const entry = { charId: 'caelel', profileId: 'pj', snapshot, adoptActions: { 'caelel:one:attack': 'legacy' }, equipmentLinks: { 'caelel:one:attack': 'Corps à corps (Base)' } };
  const next = applyFicheSync(draft, [entry]);
  for (const rows of [next.reserve[0].diceLines, next.combat.participants[0].actions, next.activeScene.participants[0].actions]) {
    assert.equal(rows.filter(row => row.extensions?.fiche?.equipmentId === 'one' && row.type === 'attack').length, 1, 'une seule attaque liée');
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'IDs uniques');
    const adopted = rows.find(row => row.id === 'legacy'); assert.equal(adopted.mod, -10); assert.equal(adopted.targetId, 'enemy');
  }
});

test('Contrôle R17 — bouclier sans profil offensif consultable sans attaque inventée', () => {
  const draft = { reserve: [profile()] };
  const next = sync(draft, equipmentSnapshot([object('shield', { kind: 'shield', category: 'Bouclier', damage: '', reach: '', ap: 2 })]));
  assert.equal(next.reserve[0].equipment.length, 1);
  assert.equal(next.reserve[0].diceLines.filter(row => row.extensions?.fiche?.equipmentId === 'shield' && row.type === 'attack').length, 0);
});

test('Contrôle R10 — tir sans compétence : visible, score absent, liaison requise et calcul bloqué', () => {
  const snapshot = ficheSnapshot('caelel', { ...fixture, skillsAdvanced: [], equipment: [object('ranged', { name: 'Arc personnalisé', category: 'Arc', range: '50', damage: 'BF+3' })] });
  const plan = planProfileSync(snapshot, profile()); const action = plan.updated.diceLines.find(row => row.type === 'attack');
  assert.equal(action.base, ''); assert.equal(action.extensions.fiche.requiresLink, true);
  assert.equal(plan.equipmentActions[0].proposed, '', 'aucun repli vers une compétence de mêlée');
  assert.throws(() => previewResolution({ actor: { id: 'actor', equipment: snapshot.equipment }, action, roll: 42, baseRevision: 0 }), error => error.code === 'SKILL_LINK_REQUIRED');
});

test('Contrôle R37 — ancien maximum inconnu : PV conservés et avertissement explicite', () => {
  const health = planHealthSync({ hp: -2 }, 16);
  assert.equal(health.oldMax, null); assert.equal(health.new, -2); assert.equal(health.newMax, 16);
  assert.equal(health.warning, 'old-maximum-unknown'); assert.equal(health.suffered, null);
});

test('Contrôle source — révision disponible retenue et empreinte stable sur lectures identiques', () => {
  const first = ficheSnapshot('caelel', { ...fixture, equipment: [object('one')] }, { schemaVersion: 4, revision: 'r1', fetchedAt: '2026-10-08T00:00:00Z' });
  const second = ficheSnapshot('caelel', { equipment: [object('one')], ...fixture }, { schemaVersion: 4, revision: 'r1', fetchedAt: '2026-10-08T01:00:00Z' });
  assert.equal(first.source.revision, 'r1'); assert.equal(first.source.schemaVersion, 4);
  assert.equal(first.source.fingerprint, second.source.fingerprint, 'date de lecture sans effet sur identité');
  assert.notEqual(first.source.fingerprint, ficheSnapshot('caelel', { ...fixture, equipment: [object('one')] }, { schemaVersion: 4, revision: 'r2' }).source.fingerprint);
});

const memoryPersistence = () => {
  let state = null;
  return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } };
};
test('Contrôle R26/R39 — commande annulable puis export/reprise second appareil sans second delta santé', async () => {
  const first = createStore({ persistence: memoryPersistence() }); await first.ready;
  await first.loadFromJSON({ schemaVersion: 3, ...healthDraft(), diceLines: [] });
  const before = JSON.parse(first.getFullJSON());
  const entry = { charId: 'caelel', profileId: 'pj', snapshot: snapshotWithMax(16) };
  await first.applyFicheSync([entry]);
  assert.equal(first.listParticipants()[0].hp, 10); assert.equal(first.listParticipants()[0].maxHp, 16);
  const exported = first.getFullJSON();
  await first.undo();
  assert.equal(first.listParticipants()[0].hp, 8); assert.equal(first.listParticipants()[0].maxHp, 14);
  assert.deepEqual(first.listParticipants()[0].states, before.combat.participants[0].states);
  const second = createStore({ persistence: memoryPersistence() }); await second.ready; await second.loadFromJSON(exported);
  const revision = second.getLocalRevision();
  assert.equal(second.listParticipants()[0].hp, 10); assert.equal(second.listParticipants()[0].maxHp, 16);
  assert.deepEqual(await second.applyFicheSync([entry]), { ok: true, changed: false });
  assert.equal(second.getLocalRevision(), revision); assert.equal(second.listParticipants()[0].hp, 10);
  assert.equal(second.getActiveScene().participants[0].hp, 10);
});

test('Contrôle R25 — une commande locale en file invalide aussi la précondition durable de synchronisation', async () => {
  let persisted = null; let holdNext = false; let release; let entered;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  const persistence = { async load() { return persisted && structuredClone(persisted); }, async saveAtomic({ state }) {
    if (holdNext) { holdNext = false; entered(); await new Promise(resolve => { release = resolve; }); }
    persisted = structuredClone(state); return { ok: true };
  } };
  const store = createStore({ persistence }); await store.ready; await store.loadFromJSON({ schemaVersion: 3, ...healthDraft(), diceLines: [] });
  const revision = store.getLocalRevision(); holdNext = true;
  const edit = store.updateParticipant('active', { notes: 'édition en attente IndexedDB' });
  await enteredPromise;
  const apply = Promise.resolve(store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot: snapshotWithMax(16) }], { expectedLocalRevision: revision }));
  const rejection = assert.rejects(apply, error => error.code === 'fiche-plan-stale');
  release(); await edit; await rejection;
  assert.equal(store.listParticipants()[0].hp, 8); assert.equal(store.listParticipants()[0].maxHp, 14);
  assert.equal(store.listParticipants()[0].notes, 'édition en attente IndexedDB');
  assert.equal(store.getLocalRevision(), revision + 1, 'seule la vraie édition ajoute une révision');
});

for (const target of ['participant', 'profile']) test('Contrôle R25 — édition ' + target + ' refuse dans la file durable des valeurs source antérieures', async () => {
  let state = null, holdNext = false, release, entered;
  const enteredPromise = new Promise(resolve => entered = resolve);
  const persistence = { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) {
    if (holdNext) { holdNext = false; entered(); await new Promise(resolve => release = resolve); }
    state = structuredClone(next); return { ok: true };
  } };
  const store = createStore({ persistence }); await store.ready;
  const first = sync({ ...healthDraft(), diceLines: [] }, equipmentSnapshot([object('queue-source', { damage: 'BF+4' })]));
  await store.loadFromJSON({ schemaVersion: 3, ...first });
  const previousRevision = store.getLocalRevision();
  holdNext = true;
  const sourceUpdate = store.applyFicheSync([{ profileId: 'pj', snapshot: equipmentSnapshot([object('queue-source', { damage: 'BF+7' })]) }]);
  await enteredPromise;
  // Reproduce submit-time rebase while the previous source command is not yet visible.
  const prior = target === 'participant' ? store.listParticipants().find(row => row.id === 'active') : store.getProfile('pj');
  const collection = target === 'participant' ? 'actions' : 'diceLines';
  const patch = { [collection]: prior[collection].map(action => ({ ...action, mod: -10 })) };
  const edit = target === 'participant'
    ? store.updateParticipant('active', patch, { expectedLocalRevision: previousRevision })
    : store.updateProfile('pj', patch, { expectedLocalRevision: previousRevision });
  const rejection = assert.rejects(edit, error => /stale/i.test(error.code));
  release(); await sourceUpdate; await rejection;
  const current = target === 'participant' ? store.listParticipants().find(row => row.id === 'active') : store.getProfile('pj');
  const attack = current[collection].find(action => action.type === 'attack');
  assert.equal(attack.damageFormula, 'BF+7', 'source récente conservée');
  assert.notEqual(attack.mod, -10, 'édition périmée non appliquée partiellement');
  assert.equal(store.getLocalRevision(), previousRevision + 1, 'seule la synchronisation valide avance la révision');
});
});

describe('Controle final lot 1 et fiches', () => {
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const profile = extra => ({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], extensions: {}, ...extra });
const object = (id, extra = {}) => ({ id, baseId: 'custom-model', catalogVersion: 'fixture-v1', kind: 'weapon', name: 'Épée personnelle', category: 'Base', damage: 'BF+4', reach: 'Moyenne', range: '', ap: null, locations: [], layer: 'none', keywords: [], notes: 'note personnalisée', source: 'Campagne', custom: true, ...extra });
const snapshot = (equipment, charId = 'caelel') => ficheSnapshot(charId, { ...fixture, equipment });
const actor = (actions = [], extra = {}) => ({ id: 'actor', profileId: 'pj', name: 'Caelel', kind: 'PJ', hp: 8, maxHp: 14, states: [], actions, zone: 'active', camp: 'pj', extensions: {}, ...extra });
const memory = () => { let saved = null; return { async load() { return structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };

// Ces scénarios partent des invariants métier, sans reproduire l'algorithme testé.
test('Contrôle final R04 — une action de scène locale homonyme ne reçoit pas la liaison d’une action de réserve', () => {
  const template = { id: 'template', type: 'attack', note: 'Épée personnelle', base: 35, damage: 6, qualities: [], extensions: { ficheSkill: 'Corps à corps (Base)' } };
  const independent = { id: 'improvised', type: 'attack', note: 'Épée personnelle', base: 21, damage: 2, qualities: [], extensions: { origin: 'scene-local' } };
  const original = { reserve: [profile({ diceLines: [template] })], combat: { participants: [actor([independent])] } };
  const next = applyFicheSync(original, [{ profileId: 'pj', snapshot: snapshot([]) }]);
  assert.deepEqual(next.combat.participants[0].actions.find(row => row.id === 'improvised'), independent, 'pas de reprise implicite par ressemblance');
});

test('Contrôle final R04/R05 — une action source retirée de la réserve ne reste pas fantôme dans une copie de scène historique', () => {
  const weapon = object('removed-instance'); const first = snapshot([weapon]);
  const initial = applyFicheSync({ reserve: [profile()] }, [{ profileId: 'pj', snapshot: first }]);
  const actions = structuredClone(initial.reserve[0].diceLines);
  const alreadyUpdated = applyFicheSync(initial, [{ profileId: 'pj', snapshot: snapshot([]) }]);
  // Ancienne scène suspendue réintroduite après la mise à jour de la réserve.
  const local = { id: 'local', type: 'attack', note: 'Épée personnelle', base: 21, damage: 2, qualities: [], extensions: {} };
  const draft = { ...alreadyUpdated, suspendedScenes: [{ id: 'old-scene', participants: [actor([...actions, local])] }] };
  const next = applyFicheSync(draft, [{ profileId: 'pj', snapshot: snapshot([]) }]);
  assert.deepEqual(next.suspendedScenes[0].participants[0].actions, [local], 'retrait par liaison charId/instance/role, même si le profil est déjà actualisé');
});

test('Contrôle final association — le remplacement explicite retire les actions de l’ancien lien et conserve les actions locales', () => {
  const local = { id: 'local', type: 'skill', note: 'Rappel local', base: 25, damage: 0, qualities: [], extensions: {} };
  const first = applyFicheSync({ reserve: [profile({ diceLines: [local] })] }, [{ profileId: 'pj', snapshot: snapshot([object('one')]) }]);
  const next = applyFicheSync(first, [{ profileId: 'pj', snapshot: snapshot([object('two')], 'elysia'), replaceAssociation: true }]);
  assert.equal(next.reserve[0].extensions.ficheId, 'elysia');
  assert.deepEqual(next.reserve[0].equipment.map(row => row.id), ['two']);
  assert.equal(next.reserve[0].diceLines.filter(row => row.extensions?.fiche?.charId === 'caelel').length, 0, 'l’ancien lien est remplacé');
  assert.deepEqual(next.reserve[0].diceLines.find(row => row.id === 'local'), local);
});

test('Contrôle final R09/R10 — un emplacement ouvert choisi explicitement ne devient pas un score d’arme utilisable', () => {
  const source = ficheSnapshot('caelel', { ...fixture, skillsAdvanced: [{ id: 'placeholder', nom: 'Projectiles (au choix)', carac: 'ct', adv: 7 }], equipment: [object('bow', { category: 'Arc', range: '50' })] });
  const placeholder = source.skills.find(row => row.storageKey === 'placeholder');
  assert.equal(placeholder.total, null);
  const plan = planProfileSync(source, profile(), { equipmentLinks: { [equipmentActionKey('caelel', 'bow', 'attack')]: 'placeholder' } });
  const action = plan.updated.diceLines.find(row => row.type === 'attack');
  assert.equal(action.base, '');
  assert.equal(action.extensions.fiche.requiresLink, true, 'une liaison vers un emplacement ouvert reste non calculable');
});

test('Contrôle final R20/R27/R29 — le journal exporté conserve la version d’effet et la provenance arme/munition/protection appliquées', async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const weapon = object('bow', { name: 'Arc historique', category: 'Arc', range: '50', keywords: [{ id: 'pointue', parameter: '' }] });
  const ammo = object('arrow', { kind: 'ammunition', name: 'Flèche historique', category: 'Arc', range: '', damage: '+0', keywords: [{ id: 'pointue', parameter: '' }] });
  const armor = object('mail', { kind: 'armour', name: 'Maille historique', category: 'Maille', damage: '', ap: 2, layer: 'flexible', locations: ['body', 'rightArm', 'leftArm'], keywords: [] });
  const attacker = actor([], { equipment: [weapon, ammo], caracs: { F: 30, E: 40 }, extensions: { ficheId: 'caelel' } });
  const target = actor([], { id: 'target', profileId: 'enemy', name: 'Cible', hp: 30, maxHp: 30, equipment: [armor], armorLocations: { head: 0, body: 2, rightArm: 2, leftArm: 2, rightLeg: 0, leftLeg: 0 }, caracs: { E: 30 } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { participants: [attacker, target], order: ['actor', 'target'], currentActorId: 'actor', round: 1 }, diceLines: [], log: [] });
  const preview = store.previewResolution({ actorId: 'actor', targetId: 'target', roll: 12, ammunitionId: 'arrow', action: { id: 'shot', type: 'attack', base: 65, damage: 'BF+4', qualities: [{ id: 'pointue', parameter: '' }], extensions: { fiche: { charId: 'caelel', equipmentId: 'bow', role: 'attack', requiresLink: false } } } });
  assert.ok(preview.referenceVersion); assert.equal(preview.input.ammunitionSources.length, 2);
  const applied = await store.applyResolution(preview); assert.equal(applied.status, 'applied');
  const exported = JSON.parse(store.getFullJSON());
  const entry = exported.log.find(row => row.kind === 'resolution');
  const detail = JSON.stringify(entry.detail);
  assert.ok(detail.includes(preview.referenceVersion), 'version de référence historisée');
  for (const id of ['bow', 'arrow', 'mail']) assert.ok(detail.includes(id), `provenance ${id} historisée`);
});

test('Contrôle final R35/R37 — un maximum persistant explicitement inconnu ne devient pas le maximum du profil lors du lancement', () => {
  const scene = launchEncounter({ id: 'encounter', entries: [{ id: 'entry', profileId: 'pj', persistentCharacterId: 'pc', quantity: 1, zone: 'active' }] }, { profiles: [profile()], persistentCharacters: [{ id: 'pc', hp: 5, maxHp: null, states: [] }], idFactory: () => 'launched' });
  assert.equal(scene.participants[0].hp, 5);
  assert.equal(scene.participants[0].maxHp, null, 'aucun historique vérifié ne permet de reconstituer les blessures subies');
});

test('Contrôle final R37 — réhydratation Store conserve le maximum explicitement inconnu d’un participant lié', async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [profile()], combat: { participants: [actor([], { maxHp: null })], order: ['actor'], round: 1 }, diceLines: [], log: [] });
  assert.equal(store.listParticipants()[0].maxHp, null);
  const exported = store.getFullJSON();
  const second = createStore({ persistence: memory() }); await second.ready; await second.loadFromJSON(exported);
  assert.equal(second.listParticipants()[0].maxHp, null);
});

test('Contrôle final §5.4 — réserve historique blessée reprend le maximum, états courants gardent leurs Blessures subies', () => {
  const source = { ...snapshot([]), wounds: 16, woundsMax: 16 };
  const old = profile({ hp: 8, maxHp: 14 });
  const plan = planProfileSync(source, old);
  assert.equal(plan.updated.hp, 16); assert.equal(plan.updated.maxHp, 16);
  assert.ok(plan.warnings.some(row => row.code === 'reserve-health-normalized' && row.message));
  const next = applyFicheSync({ reserve: [old], combat: { participants: [actor()] } }, [{ profileId: 'pj', snapshot: source }]);
  assert.equal(next.reserve[0].hp, 16, 'réserve : maximum de compatibilité, §5.4');
  assert.equal(next.combat.participants[0].hp, 10, 'état courant : six Blessures subies conservées');
});

for (const linked of [true, false]) test(`Contrôle final §5.4 — export santé PJ ${linked ? 'avec' : 'sans'} personnage persistant lié`, async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const pc = { id: 'pc', profileId: 'pj', name: 'Caelel', hp: 14, maxHp: 14, states: [] };
  const p = profile({ extensions: { ficheId: 'caelel' } });
  const participant = actor([], { hp: -2, states: ['Sonné|3'], ...(linked ? { persistentCharacterId: 'pc' } : {}) });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [p], persistentCharacters: linked ? [pc] : [], combat: { participants: [participant], order: ['actor'], round: 1 }, diceLines: [], log: [] });
  const result = await store.exportToReserve();
  assert.equal(store.getProfile('pj').hp, 14); assert.equal(store.getProfile('pj').maxHp, 14);
  if (linked) {
    const current = store.listPersistentCharacters()[0];
    assert.equal(current.hp, -2); assert.equal(current.maxHp, 14);
    assert.deepEqual(current.states, store.listParticipants()[0].states);
    assert.equal(result.warnings.length, 0);
  } else {
    assert.deepEqual(store.listPersistentCharacters(), [], 'aucun personnage créé implicitement');
    assert.equal(result.warnings.length, 1); assert.match(result.warnings[0], /aucun personnage persistant lié/);
  }
  await store.undo(); assert.equal(store.getProfile('pj').hp, 14);
  if (linked) assert.equal(store.listPersistentCharacters()[0].hp, 14);
});

for (const conflict of [true, false]) test(`Contrôle final §5.4 — deux copies vers le même persistant avec états ${conflict ? 'différents' : 'identiques'}`, async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const pc = { id: 'pc', name: 'Caelel', hp: 14, maxHp: 14, states: [] };
  const p = profile({ extensions: { ficheId: 'caelel' } });
  const first = actor([], { persistentCharacterId: 'pc', hp: 8, states: [] });
  const second = { ...first, id: 'second-copy', hp: conflict ? 3 : 8 };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [p], persistentCharacters: [pc], combat: { participants: [first, second], order: ['actor', 'second-copy'], round: 1 }, diceLines: [], log: [] });
  const result = await store.exportToReserve();
  assert.equal(store.getProfile('pj').hp, 14);
  assert.equal(store.listPersistentCharacters()[0].hp, conflict ? 14 : 8, 'aucun arbitrage par dernière copie');
  assert.equal(result.warnings.length, conflict ? 1 : 0);
  if (conflict) assert.match(result.warnings[0], /plusieurs états/);
});

// Recette réelle complémentaire, déclenchée explicitement avec LOT1_BROWSER_FINAL=1.
// Le test unitaire standard n'exige pas une installation de navigateur.
if (process.env.LOT1_BROWSER_FINAL === '1') test('Contrôle final navigateur — consultation source et adoption/actualisation pendant édition', { timeout: 30000 }, async () => {
  const { createServer } = await import('node:http');
  const { statSync } = await import('node:fs');
  const { join, extname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { chromium } = await import('playwright');
  const { expect } = await import('playwright/test');
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
  const server = createServer((req, res) => {
    try {
      const route = (req.url || '/').split('?')[0];
      if (route === '/association-harness.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><main id="mount"></main></html>'); return; }
      const path = join(root, decodeURIComponent(route === '/' ? '/index.html' : route));
      assert.ok(path.startsWith(root)); assert.ok(statSync(path).isFile());
      res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(readFileSync(path));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin); await expect(page.locator('#app-content')).toBeVisible();
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); await Store.ready;
      const source = { id: 'source', type: 'attack', note: 'Épée source', base: 54, mod: 0, damage: 4, damageFormula: 'BF+4', qualities: [], extensions: { fiche: { charId: 'caelel', equipmentId: 'one', role: 'attack', requiresLink: false } } };
      const local = { id: 'local', type: 'attack', note: 'Ancienne action locale', base: 21, mod: 0, damage: 2, qualities: [], extensions: {} };
      const independent = { ...local, id: 'independent', type: 'skill', note: 'Rappel local' };
      const removed = { ...source, id: 'removed-source', note: 'Arme retirée', extensions: { fiche: { ...source.extensions.fiche, equipmentId: 'removed' } } };
      await Store.loadFromJSON({ schemaVersion: 3, reserve: [{ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, diceLines: [source], extensions: { ficheId: 'caelel' } }], combat: { participants: [{ id: 'actor', profileId: 'pj', name: 'Caelel', kind: 'PJ', hp: 8, maxHp: 14, initiative: 30, caracs: { F: 30 }, actions: [source, local, independent, removed], states: [], extensions: { ficheId: 'caelel' }, zone: 'active' }], round: 1, order: ['actor'], currentActorId: 'actor' }, diceLines: [], log: [] });
    });
    await page.locator('#tab-combat').click(); await expect(page.locator('#workspace-play')).toBeVisible();
    await page.locator('#workspace-play [data-workspace-action="edit-participant"]').click();
    const form = page.locator('[data-participant-editor="actor"]'); await expect(form).toBeVisible();
    const row = name => form.locator('.participant-action-list>.card').filter({ has: page.locator('strong', { hasText: name }) });
    const sourceRow = row('Épée source');
    for (const selector of ['.action-type', '.action-base', '.action-note', '.action-damage', '.btn-inoffensive']) await expect(sourceRow.locator(selector)).toBeDisabled();
    await expect(sourceRow.getByRole('button', { name: 'Retirer cette action' })).toBeDisabled();
    await expect(sourceRow.locator('.action-mod')).toBeEnabled(); await expect(form.locator('[name=initiative]')).toHaveJSProperty('readOnly', true);
    await expect(row('Rappel local').locator('.action-base')).toBeEnabled();
    await expect(row('Rappel local').getByRole('button', { name: 'Retirer cette action' })).toBeEnabled();
    await sourceRow.locator('.action-mod').fill('-10');
    await row('Ancienne action locale').locator('.action-base').fill('1');
    await row('Ancienne action locale').locator('.action-mod').fill('5');
    await row('Rappel local').locator('.action-note').fill('Rappel local édité'); await form.locator('[name=hp]').click();
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); const actor = Store.listParticipants().find(row => row.id === 'actor');
      const source = actor.actions.find(row => row.id === 'source');
      await Store.updateParticipant(actor.id, { actions: actor.actions.filter(row => row.id !== 'removed-source').map(action => action.id === 'source'
        ? { ...action, note: 'Épée source actualisée', damage: 7, damageFormula: 'BF+7' }
        : action.id === 'local' ? { ...action, note: 'Arme source adoptée', base: 69, damage: 9, damageFormula: 'BF+9', qualities: [{ id: 'precise', parameter: '' }], extensions: { fiche: { ...source.extensions.fiche, equipmentId: 'adopted' } } } : action)
        .concat({ ...source, id: 'new-source', note: 'Nouvelle arme', extensions: { fiche: { ...source.extensions.fiche, equipmentId: 'two' } } }) });
    });
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); const original = Store.updateParticipant;
      window.restoreParticipantSave = () => { Store.updateParticipant = original; };
      Store.updateParticipant = (id, patch, options) => {
        if (options?.expectedLocalRevision !== undefined) throw Object.assign(new Error('La séance a changé. Votre saisie est conservée : vérifiez puis réessayez.'), { code: 'LOCAL_EDIT_STALE', userFacing: true });
        return original.call(Store, id, patch, options);
      };
    });
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click(); await expect(form).toBeVisible();
    await expect(form.getByRole('alert')).toContainText('Votre saisie est conservée');
    await expect(sourceRow.locator('.btn-inoffensive')).toBeDisabled(); await expect(sourceRow.getByRole('button', { name: 'Retirer cette action' })).toBeDisabled();
    await expect(sourceRow.locator('.action-mod')).toHaveValue('-10'); await expect(row('Rappel local édité').locator('.action-note')).toHaveValue('Rappel local édité');
    await page.evaluate(() => window.restoreParticipantSave());
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click(); await expect(form).toBeHidden();
    const actions = await page.evaluate(async () => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(row => row.id === 'actor').actions; });
    assert.equal(actions.find(row => row.id === 'source').damageFormula, 'BF+7'); assert.equal(actions.find(row => row.id === 'source').mod, -10);
    const adopted = actions.find(row => row.id === 'local'); assert.equal(adopted.damageFormula, 'BF+9'); assert.equal(adopted.base, 69); assert.equal(adopted.mod, 5); assert.equal(adopted.qualities[0].id, 'precise'); assert.equal(adopted.extensions.fiche.equipmentId, 'adopted');
    assert.equal(actions.find(row => row.id === 'independent').note, 'Rappel local édité'); assert.ok(actions.some(row => row.id === 'new-source')); assert.ok(!actions.some(row => row.id === 'removed-source')); assert.deepEqual(errors, []);
    const association = await context.newPage(); await association.goto(origin + '/association-harness.html');
    await association.evaluate(async ({ fixture, weapon }) => {
      const { createStore } = await import('/js/core/store.js'); const { initFicheSyncView } = await import('/js/ui/fiche-sync-view.js'); const { ficheSnapshot, applyFicheSync } = await import('/js/core/fiche-sync.js');
      let saved = null; const store = createStore({ persistence: { async load() { return saved; }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } } }); await store.ready;
      const initial = applyFicheSync({ reserve: [{ id: 'linked', name: 'PJ lié', kind: 'PJ', hp: 14, maxHp: 14, diceLines: [{ id: 'local', type: 'skill', note: 'Action locale', base: 25, damage: 0, qualities: [], extensions: {} }], extensions: {} }] }, [{ profileId: 'linked', snapshot: ficheSnapshot('caelel', { ...fixture, equipment: [{ ...weapon, id: 'old-instance' }] }) }]);
      await store.loadFromJSON({ schemaVersion: 3, ...initial, combat: { participants: [], order: [], round: 0 }, diceLines: [] });
      const records = ['caelel', 'elysia'].map(charId => ({ charId, data: { ...fixture, nom: charId === 'elysia' ? 'Nouvelle fiche' : 'Ancienne fiche', equipment: [{ ...weapon, id: charId === 'elysia' ? 'new-instance' : 'old-instance' }] }, metadata: { revision: 1 }, status: 'ok' }));
      const harness = window.associationHarness = { store, entries: [] };
      const view = initFicheSyncView({ mount: document.querySelector('#mount'), source: { async getUser() { return { name: 'MJ' }; }, async fetchAll() { return structuredClone(records); } }, getContext: () => ({ profiles: store.listProfiles(), participants: [], revision: store.getLocalRevision() }), callbacks: { async onApply(entries, options) { await store.applyFicheSync(entries, options); harness.entries = entries; } } });
      await view.start();
    }, { fixture, weapon: object('fixture') });
    const applyButton = association.getByRole('button', { name: /^Appliquer/ });
    await association.locator('[data-key="profil:elysia"]').selectOption('linked');
    const confirmReplacement = association.locator('[data-key="replace:elysia"]'); await expect(confirmReplacement).toBeVisible(); await expect(confirmReplacement).not.toBeChecked();
    await expect(applyButton).toBeDisabled(); await expect(association.getByRole('alert')).toContainText('Deux fiches visent le même profil');
    await association.locator('[data-key="profil:caelel"]').selectOption(''); await expect(applyButton).toBeDisabled();
    await confirmReplacement.check(); await expect(applyButton).toBeEnabled(); await expect(association.locator('#mount')).toContainText('Actions source retirées');
    await association.locator('[data-key="profil:elysia"]').selectOption(''); await association.locator('[data-key="profil:elysia"]').selectOption('linked');
    await expect(confirmReplacement).not.toBeChecked(); await expect(applyButton).toBeDisabled();
    await confirmReplacement.check(); await applyButton.click();
    await expect.poll(() => association.evaluate(() => window.associationHarness.entries.length)).toBe(1);
    const result = await association.evaluate(() => ({ entry: window.associationHarness.entries[0], profile: window.associationHarness.store.getProfile('linked') }));
    assert.equal(result.entry.replaceAssociation, true); assert.equal(result.profile.extensions.ficheId, 'elysia'); assert.deepEqual(result.profile.equipment.map(row => row.id), ['new-instance']);
    assert.ok(!result.profile.diceLines.some(row => row.extensions?.fiche?.charId === 'caelel')); assert.ok(result.profile.diceLines.some(row => row.id === 'local'));
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});
});

describe('Provenance journal de resolution', () => {
test('Journal historique — règle, munition et protection viennent du reçu conservé', () => {
  const detail = { referenceVersion: 'references:ancienne-version', action: { note: 'Arc historique', extensions: { fiche: { equipmentId: 'arc-1' } } }, ammunitionId: 'fleche-1', ammunitionSources: [{ kind: 'ammunition', equipmentId: 'fleche-1', keywordId: 'pointue', parameter: 'texte libre' }], protection: { ap: 2, arbitrated: true, counted: [{ name: 'Maille historique' }], ignored: [{ name: 'Pièce partielle' }], shield: { name: 'Bouclier historique' }, shieldAp: 0 }, mechanics: [{ id: 'precise', name: 'Nom historique de règle', status: 'covered', edition: 'Édition historique', source: 'Ancienne aide p.4', effectVersion: 'version-historique', effect: 'Texte conservé à la date du jet' }] };
  const lines = describeResolutionDetail(detail).join(' | ');
  for (const value of ['ancienne-version', 'Arc historique', 'fleche-1', 'pointue (texte libre)', '2 PA (arbitrage MJ)', 'Maille historique', 'Pièce partielle', 'Bouclier historique', 'Nom historique de règle', 'Édition historique', 'Ancienne aide p.4', 'version-historique', 'Texte conservé à la date du jet']) assert.ok(lines.includes(value), value);
  assert.ok(!lines.includes('[object Object]'));
  assert.deepEqual(describeResolutionDetail({ sl: -2, critical: null }), ['DR : −2']);
});
});

describe('Fiches V5 synchronisation', () => {
const snapshot=ficheSnapshot('caelel',JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json',import.meta.url),'utf8')));

for (const legacy of [false,true]) test(`Lot2 fiche — ajustement de scène ${legacy?'legacy en attente de conversion':'V5'} préservé dans toutes les projections`,()=>{
  const sourceAction={id:'epee',type:'attack',note:'Épée',base:50,mod:0,damage:4,qualities:[],extensions:{v5:{slModifier:1},ficheSkill:'Corps à corps (Base)'}};
  const raw={...sourceAction,id:'scene-action',mod:legacy?-20:0,extensions:{profileActionId:'epee',ficheSkill:'Corps à corps (Base)',v5:legacy?{futureLocal:true}:{slModifier:-2,futureLocal:true}}};
  const participant={id:'p',profileId:'profile',name:'Recette',hp:12,maxHp:12,states:[{name:'Hémorragique',level:1,duration:2}],actions:[raw],extensions:{v5:{hasMomentum:true}}};
  const state={reserve:[{id:'profile',name:'Recette',hp:12,caracs:{},diceLines:[sourceAction],extensions:{ficheId:'caelel'}}],combat:{participants:[participant]},
    activeScene:{participants:[participant]},suspendedScenes:[{participants:[participant]}],persistentCharacters:[{...participant,id:'persistent',extensions:{ficheId:'caelel',v5:{hasMomentum:true}}}],diceLines:[{...raw,id:'dice-copy',participantId:'p'}]};
  const before=structuredClone(state);
  const next=applyFicheSync(state,[{profileId:'profile',snapshot,links:{epee:'Corps à corps (Base)'},convert:{epee:false}}]);
  const copies=[next.combat.participants[0].actions[0],next.activeScene.participants[0].actions[0],next.suspendedScenes[0].participants[0].actions[0],next.persistentCharacters[0].actions[0],next.diceLines[0]];
  for(const action of copies){
    assert.equal(action.base,69);
    assert.equal(action.extensions.v5.slModifier,legacy?undefined:-2);
    assert.equal(action.mod,legacy?-20:0);
    assert.equal(action.extensions.v5.futureLocal,true);
  }
  assert.deepEqual(next.combat.participants[0].states,participant.states);
  assert.equal(next.combat.participants[0].extensions.v5.hasMomentum,true);
  assert.deepEqual(state,before);
});
});

describe('Actualisation et cache du referentiel', () => {
for (const [date, expected] of [['2026-10-07T10:00:00.000Z', 'instantané local (dépôt)'], ['2099-10-07T10:00:00.000Z', 'localStorage']]) {
  test(`Lot2 références — cache ${date} comparé au référentiel livré`, async () => {
    const original = globalThis.localStorage;
    const data = structuredClone(snapshot); data.fetchedAt = date;
    data.contentVersion = 'references:fixture-cache'; data.talents.entries[0].description = 'Description fictive du cache de recette.';
    globalThis.localStorage = { getItem: () => JSON.stringify({ data, updatedAt: date }) };
    try {
      const refs = await import(`../../../js/core/reference-catalog.js?cache-receipt=${date}`);
      assert.equal(refs.getReferenceStatus().source, expected);
      assert.equal(refs.getReferenceSnapshot().talents.entries[0].description, expected === 'localStorage' ? data.talents.entries[0].description : snapshot.talents.entries[0].description);
    } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
  });
}

test('Lot2 références — 213 identités et empreintes de descriptions actualisées dans l’inventaire portable', async () => {
  const inventory = JSON.parse(await readFile(new URL('../../../docs/lot2/LOT2_INVENTAIRE_TALENTS.json', import.meta.url), 'utf8'));
  assert.equal(snapshot.talents.entries.length, 213);
  assert.equal(inventory.items.length, 213);
  const byId = new Map(snapshot.talents.entries.map(item => [item.id, item]));
  for (const item of inventory.items) {
    assert.ok(byId.has(item.talentId));
    assert.equal(item.sourceEffectSha256, createHash('sha256').update(byId.get(item.talentId).description).digest('hex'), item.talentId);
  }
  const csv = await readFile(new URL('../../../js/data/reference-source-csv/Talents.csv', import.meta.url));
  assert.equal(createHash('sha256').update(csv).digest('hex'), inventory.sourceNormalization.publicCsvSha256);
  assert.equal(inventory.sourceCatalogueVersion, snapshot.talents.catalogVersion);
  const pending = inventory.items.filter(item => item.family === 'supplement_v4_non_verifie');
  assert.equal(pending.length, 6);
  assert.ok(pending.every(item => item.status === 'non_verifie_source_v4'));
});
});

describe('Regles V5 et donnees critiques', () => {
// Independent transcription of the numerical columns in the personal V5 core,
// pp.173–176. Fixtures certify consultation and resolver share all 80 intervals.
const criticalColumns = {
  HEAD: [[3,0],[9,1],[12,1],[17,1],[20,1],[25,2],[30,2],[35,2],[40,2],[45,3],[50,3],[55,3],[60,3],[65,4],[75,4],[80,4],[85,5],[94,5],[99,5],[null,0]],
  ARM: [[10,0],[20,0],[25,1],[30,1],[45,1],[50,1],[55,2],[60,2],[65,2],[80,2],[85,3],[90,3],[95,3],[109,4],[115,4],[120,4],[125,5],[130,5],[135,5],[null,0]],
  BODY: [[10,0],[15,1],[25,1],[30,1],[35,1],[50,2],[55,2],[60,2],[65,2],[70,3],[75,3],[80,3],[85,3],[90,4],[95,4],[100,4],[105,5],[110,5],[115,5],[null,0]],
  LEG: [[10,0],[20,0],[25,1],[40,1],[45,1],[50,1],[55,2],[60,2],[65,2],[70,2],[75,3],[80,3],[85,3],[95,4],[100,4],[105,4],[115,4],[120,5],[125,5],[null,0]]
};
for (const [key, columns] of Object.entries(criticalColumns)) {
  test(`V5 rule data: all ${key} critical intervals and wounds match the core`, () => {
    assert.equal(V5_CRIT_DATA[key].length, 20);
    let lower = 1;
    for (const [index, [maximum, wounds]] of columns.entries()) {
      const entry = V5_CRIT_DATA[key][index];
      assert.equal(entry.max, maximum ?? Number.MAX_SAFE_INTEGER);
      assert.equal(entry.parsed.extraWounds, wounds);
      assert.equal(entry.parsed.death, index === 19);
      assert.equal(getV5CriticalEffect(key, lower), entry);
      if (maximum !== null) { assert.equal(getV5CriticalEffect(key, maximum), entry); lower = maximum + 1; }
      else assert.equal(getV5CriticalEffect(key, 1000), entry);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(V5_CRIT_DATA[key])), V5_CRIT_DATA[key]);
  });
}
const corruptionCases = [
  ['minor',false,0,1],['minor',true,0,0],['minor',true,4,0],
  ['moderate',false,0,2],['moderate',false,-1,2],['moderate',true,0,1],['moderate',true,1,0],
  ['major',false,0,3],['major',true,0,2],['major',true,1,1],['major',true,3,1],['major',true,4,0]
];
for (const [kind, success, sl, points] of corruptionCases) {
  test(`V5 rule data: ${kind} corruption ${success ? 'success' : 'failure'} ${sl} SL gives ${points}`, () => {
    const bands = V5_CORRUPTION_BANDS[kind];
    const actual = success ? bands.success.find(band => band.maxSL === null || sl <= band.maxSL).points : bands.failurePoints;
    assert.equal(actual, points);
  });
}
test('V5 rule data: displayed corruption uses the corrected marginal and +1/+4 thresholds', () => {
  const block = V5_RULES.find(rule => rule.id === 'corruption');
  const moderate = block.sections.find(section => section.h4 === 'Influence modérée');
  const major = block.sections.find(section => section.h4 === 'Influence majeure');
  assert.deepEqual(moderate.ul, ['Échec, même marginal : 2 points de Corruption.', 'Réussite à 0 DR : 1 point de Corruption.', 'Réussite à +1 DR et plus : 0 point de Corruption.']);
  assert.deepEqual(major.ul, ['Échec, même marginal : 3 points de Corruption.', 'Réussite à 0 DR : 2 points de Corruption.', 'Réussite à +1 à +3 DR : 1 point de Corruption.', 'Réussite à +4 DR et plus : 0 point de Corruption.']);
  assert.match(block.source, /187–189/);
});
test('V5 rule data: psychology explains Momentum prohibition, source Advantage and terror beyond first negative SL', () => {
  const block = V5_RULES.find(rule => rule.id === 'psychologie');
  const fear = block.sections.find(section => section.h4 === 'Peur (indice)');
  const terror = block.sections.find(section => section.h4 === 'Terreur (indice)');
  assert.match(fear.ul.join(' '), /aucun gain d’Élan/);
  assert.match(fear.ul.join(' '), /par sa source bénéficient d’Avantage/);
  assert.match(terror.ul.join(' '), /DR négatif après le premier/);
  assert.match(terror.ul.join(' '), /Terreur 2 et échec à −3 DR donnent Brisé 4/);
  assert.match(block.source, /183–184/);
});
});
