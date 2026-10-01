import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import {
  FICHE_CHAR_IDS, ficheSnapshot, woundsMax, matchFiches, suggestSkill, planProfileSync, applyFicheSync, ficheErrorMessage
} from '../js/core/fiche-sync.js';

const caelel = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const snapshot = ficheSnapshot('caelel', caelel);
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

test('blessures — Caelel : 3 + 2×4 + 3 + 4 (Dur à cuire) = 18', () => {
  assert.equal(snapshot.wounds, 18);
});

test('blessures — Dur à cuire par rang, halfelin sans BF', () => {
  const totals = { F: 35, E: 42, FM: 28 };
  assert.equal(woundsMax({ totals, race: 'humain' }), 3 + 8 + 2);
  assert.equal(woundsMax({ totals, race: 'humain', talents: [{ nom: 'Dur à cuire' }, { nom: 'dur a cuire' }, { nom: 'Vision nocturne' }] }), 13 + 8);
  assert.equal(woundsMax({ totals, race: 'halfelin' }), 8 + 2);
  assert.equal(woundsMax({ totals, race: 'halfling' }), 10);
});

test('fiche — données incomplètes sans plantage', () => {
  const vide = ficheSnapshot('wren', {});
  assert.deepEqual(vide.caracs, {});
  assert.equal(vide.initiative, null);
  assert.equal(vide.wounds, null, 'F, E ou FM absente : blessures non calculables');
  assert.deepEqual(vide.skills, [], 'sans caractéristique, aucune compétence utilisable');
  const sansForce = ficheSnapshot('wren', { ...caelel, carac: { ...caelel.carac, f: undefined } });
  assert.equal(sansForce.wounds, null);
  assert.equal(ficheSnapshot('wren', { ...caelel, race: 'halfelin', carac: { ...caelel.carac, f: undefined } }).wounds, 4 * 2 + 3 + 4, 'un halfelin n’a pas besoin de F');
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
  assert.equal(suggestSkill({ note: 'Arbalète', type: 'attack' }, skills), 'Corps à corps (Base)', 'deux compétences de tir (Arc, Entraves) : aucune ne s’impose');
  assert.equal(suggestSkill({ note: 'Arbalète', type: 'attack' }, skills.filter(item => item.name !== 'Projectiles (Entraves)')), 'Projectiles (Arc)', 'une seule compétence de tir : proposée');
  assert.equal(suggestSkill({ note: 'Esquive', type: 'defense' }, skills), 'Esquive');
  assert.equal(suggestSkill({ note: 'Parade', type: 'defense' }, skills), 'Corps à corps (Base)');
  assert.equal(suggestSkill({ note: 'Perception', type: 'skill' }, skills), 'Perception');
  assert.equal(suggestSkill({ note: 'Prière', type: 'skill' }, skills), '');
  assert.equal(suggestSkill({ note: 'Arc', type: 'attack' }, skills.filter(item => !item.name.startsWith('Projectiles'))), 'Corps à corps (Base)');
});

test('plan — écarts, jets liés et conversion des dégâts fixes', () => {
  const plan = planProfileSync(snapshot, profile());
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
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot, links: { rien: '' }, convert: {} }]);
  assert.deepEqual(draft, copy, 'le brouillon d’entrée n’est pas modifié');
  const pj = next.reserve[0];
  assert.deepEqual(pj.caracs, { CC: 54, F: 30, E: 43, M: 5, CT: 59, I: 55, Ag: 51, Dex: 47, Int: 51, FM: 36, Soc: 40 });
  assert.equal(pj.initiative, 55);
  assert.equal(pj.hp, 18);
  assert.deepEqual(pj.extensions, { autre: 1, ficheId: 'caelel' });
  const [epee, arc, esq, perc, rien] = pj.diceLines;
  assert.equal(epee.base, 69); assert.equal(epee.mod, 5); assert.equal(epee.note, 'Épée');
  assert.equal(epee.damage, 5); assert.equal(epee.damageFormula, 'BF+5');
  assert.deepEqual(epee.extensions, { garde: true, ficheSkill: 'Corps à corps (Base)' });
  assert.equal(arc.base, 59); assert.equal(arc.damageFormula, 'BF+3');
  assert.equal(esq.base, 55); assert.equal(perc.base, 65);
  assert.equal(rien.base, 33); assert.equal(rien.extensions?.ficheSkill, undefined);
  for (const key of ['name', 'kind', 'group', 'tags', 'notes', 'favorite', 'armor']) assert.deepEqual(pj[key], draft.reserve[0][key], key);
  assert.deepEqual(next.reserve[1], draft.reserve[1]);
  assert.equal(next.persistentCharacters[0].hp, 18);
  assert.deepEqual(next.persistentCharacters[0].states, ['Sonné|1']);
  assert.equal(next.persistentCharacters[1].hp, 5);
  assert.deepEqual(next.combat, draft.combat);
});

test('application — le lien choisi est enregistré, « aucune » aussi, et le lien enregistré prime', () => {
  const draft = { reserve: [profile()], persistentCharacters: [], encounters: [] };
  const first = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'caelel-pj', snapshot: avecEscrime, links: { epee: 'Corps à corps (Escrime)', esq: '' }, convert: { epee: false } }]);
  const [epee, , esq] = first.reserve[0].diceLines;
  assert.equal(epee.base, 59); assert.equal(epee.extensions.ficheSkill, 'Corps à corps (Escrime)');
  assert.equal(epee.damage, 7); assert.equal(epee.damageFormula, undefined);
  assert.equal(esq.base, 45); assert.equal(esq.extensions?.ficheSkill, undefined, 'jamais lié, laissé tel quel');
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
  assert.deepEqual(next.persistentCharacters.map(item => item.hp), [18, 2]);
});

test('Store.applyFicheSync — une commande annulable, combat intact', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile(profile());
  await store.savePersistentCharacter({ id: 'pc', name: 'Caelel', hp: 4 });
  await store.saveEncounter({ id: 'r', title: 'Rencontre', entries: [{ id: 'e1', profileId: 'caelel-pj', quantity: 1, zone: 'active', persistentCharacterId: 'pc' }] });
  await store.launchEncounter('r');
  const combatBefore = JSON.stringify(store.listParticipants());
  const reserveBefore = JSON.stringify(store.listProfiles());
  const revision = store.getLocalRevision();

  await store.applyFicheSync([{ charId: 'caelel', profileId: 'caelel-pj', snapshot, links: {}, convert: {} }]);
  assert.equal(store.getLocalRevision(), revision + 1);
  const updated = store.listProfiles().find(item => item.id === 'caelel-pj');
  assert.equal(updated.hp, 18); assert.equal(updated.caracs.F, 30);
  assert.equal(updated.diceLines[0].base, 69);
  assert.equal(store.listPersistentCharacters()[0].hp, 18);
  assert.equal(JSON.stringify(store.listParticipants()), combatBefore, 'les participants en jeu ne bougent pas');

  await store.undo();
  assert.equal(JSON.stringify(store.listProfiles()), reserveBefore);
  assert.equal(store.listPersistentCharacters()[0].hp, 4);
  assert.equal(JSON.stringify(store.listParticipants()), combatBefore);
});

test('erreurs de lecture — messages lisibles', () => {
  assert.match(ficheErrorMessage({ code: 'permission-denied' }), /Accès refusé/);
  assert.match(ficheErrorMessage({ code: 'appCheck/fetch-status-error' }), /App Check/);
  assert.match(ficheErrorMessage({ code: 'unavailable' }), /injoignables/);
  assert.match(ficheErrorMessage(new Error('x'), { online: false }), /injoignables/);
  assert.match(ficheErrorMessage({ code: 'auth/popup-closed-by-user' }), /annulée/);
});
