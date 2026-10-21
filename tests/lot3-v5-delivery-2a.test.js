/**
 * Livraison 2a du lot 3 : S-02 (écoulement du temps), S-04 (durées), S-05 (couches et base), S-11 (ressources canoniques).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getAllSpellContracts } from '../js/core/v5-spell-contracts.js';
import { effectiveSkillScore } from '../js/core/v5-magic-talents.js';
import { applyMiscastToParticipant } from '../js/core/v5-magic-miscasts.js';
import { processCombatTurnSpells } from '../js/core/v5-magic-turn.js';
import { previewBurnoutRecovery } from '../js/core/v5-magic-high.js';
import { applySpellEffects, expireSpellEffects, parseSpellDuration, rebaseMagicLayers, resolveTypedDuration } from '../js/core/v5-magic-effects.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
const snapshotOf = store => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: store.listParticipants()[0].id, order: store.listParticipants().map(p => p.id), participants: JSON.parse(JSON.stringify(store.listParticipants())) }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const caster = { caracs: { FM: 45, Int: 52, Soc: 31, E: 38, I: 41, Ag: 33, F: 36, Dex: 27 } };
const read = (raw, extra = {}) => parseSpellDuration(raw, { caster, ...extra });

test('S-04 — interpréteur : bonus, valeurs pleines, multiplicateurs, unités, abréviations (FM 45, Int 52, Soc 31)', () => {
  const timed = (raw, unit, amount) => assert.deepEqual(read(raw), { kind: 'timed', unit, amount }, raw);
  timed('(Bonus de Sociabilité) Rounds', 'rounds', 3);             // Miroir Mystique, Destin de Bjuna
  timed('(Bonus de Sociabilité) minutes', 'minutes', 3);           // Murmure de la Nature
  timed('Bonus de Sociabilité en minutes', 'minutes', 3);          // Voix de Fer
  timed('Bonus de Soc. rounds', 'rounds', 3);
  timed("Bonus d'Int. rounds", 'rounds', 5);                       // Glamour de Teclis
  timed('Bonus d’Intelligence heures', 'hours', 5);
  timed('2 × Bonus de Volonté rounds', 'rounds', 8);               // Capuche Vengeresse
  timed('FM minutes', 'minutes', 45);                              // valeur pleine, pas le bonus
  timed('(Force Mentale) minutes', 'minutes', 45);
  timed('Bonus de FM minutes', 'minutes', 4);
  timed('(Bonus de Force Mentale) Rounds +', 'rounds', 4);
  timed('BFM heures', 'hours', 4);
  timed('(Bonus d’Initiative) Rounds', 'rounds', 4);
  timed('Bonus de Force rounds', 'rounds', 3);
  timed('(Agilité) minutes', 'minutes', 33);
  timed('Endurance minutes', 'minutes', 38);
  timed('Bonus de Volonté jours', 'days', 4);
  timed('3 Rounds', 'rounds', 3);
  assert.deepEqual(read('Instantané'), { kind: 'instant' });
  assert.equal(parseSpellDuration('(Bonus d’Intelligence de la cible) Rounds', { caster, target: { caracs: { Int: 68 } } }).amount, 6, 'cible nommée : caractéristique de la cible');
  assert.equal(read('(Bonus d’Intelligence de la cible) Rounds').kind, 'unknown', 'cible absente : donnée MJ');
  for (const raw of ['Spécial', '1d10 heures', 'Bonus d’Endurance Rounds ou heures', /* V5 p. 243 : choix déclaré */ '(Force Mentale × 1d10) minutes', '(Bonus de Force Mentale) minutes ou jours', 'Jusqu’au lever du soleil', 'Bonus de Chance rounds']) {
    assert.equal(read(raw).kind, 'unknown', raw);
  }
  assert.equal(parseSpellDuration('(Bonus de Force Mentale) Rounds', { caster: { caracs: {} } }).kind, 'unknown', 'caractéristique absente : jamais de repli sur 3');
});

test('S-04 — les 277 contrats : seules les durées réellement narratives ou à choisir restent « donnée MJ »', () => {
  const probe = { caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 } };
  const contracts = getAllSpellContracts().filter(c => !c.isTradition);
  assert.equal(contracts.length, 277);
  const unreadable = contracts.filter(c => parseSpellDuration(c.duration, { caster: probe, target: probe }).kind === 'unknown');
  const durations = [...new Set(unreadable.map(c => c.duration))].sort();
  assert.deepEqual(durations, [
    '1d10 heures', // WoM p.77 : dé secret fourni explicitement par le MJ
    'Bonus de Force Mentale minutes ou jours', // WoM p.124, paramètre canonique                // idem
    'Bonus d’Endurance Rounds ou heures', /* V5 p. 243 : choix déclaré */                                              // dé de durée (Réplique de Levorg)
    'Jusqu’au lever du soleil',                                 // échéance narrative
    'Jusqu’au prochain lever du soleil',                        // échéance narrative
    'Spécial'                                                   // durée propre au sort
  ].sort());
});

test('S-04 — Protection : palier de durée ×2 donne 8 Rounds au lieu de 4 ; durée MJ transmise jusqu’à l’application', async () => {
  const base = resolveTypedDuration({ duration: '(Bonus de Force Mentale) Rounds' }, caster, { caster, round: 1 });
  const doubled = resolveTypedDuration({ duration: '(Bonus de Force Mentale) Rounds' }, caster, { caster, round: 1, overcastDurationMultiplier: 2 });
  assert.equal(base.durationRounds, 4);
  assert.equal(doubled.durationRounds, 8);

  const store = await combat(wizard(), wizard('ally'));
  const input = { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastChoices: { duration: 2 } };
  const preview = store.previewSpellExecution('Protection', input);
  assert.equal(preview.ready, true, preview.error);
  assert.ok(preview.overcast.durationMultiplier >= 2);
  await store.applySpellExecution('Protection', input);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects[0].durationRounds, 4 * preview.overcast.durationMultiplier);

  const fresh = await combat(wizard());
  const special = { actorId: 'mage', targetIds: ['mage'], roll: 25 };
  const blocked = fresh.previewSpellExecution('Substance d’Ombre', special);
  assert.equal(blocked.ready, true); // Retours5A : préconditions spatiales assistées, sans calcul, facultatives.
  assert.equal(blocked.targetResults[0].temporaryEffect.duration, 'Spécial'); // WoM p.113 : fin en quittant l’ombre, pas durée MJ inventée.
  const given = fresh.previewSpellExecution('Substance d’Ombre', { ...special, domainFacts:{sourceShadow:true,visibleLight:true,totalDarkness:false} });
  assert.equal(given.ready, true, given.error);
  await fresh.applySpellExecution('Substance d’Ombre', { ...special, domainFacts:{sourceShadow:true,visibleLight:true,totalDarkness:false} });
  const effect = person(fresh, 'mage').extensions.v5.spellEffects[0];
  assert.equal(effect.durationType, 'special');
  assert.equal(effect.expiresAtRound, undefined);
});

test('S-02 — temps écoulé : les Rounds expirent (6 par minute), les minutes diminuent ; Undo atomique', async () => {
  const store = await combat(wizard());
  await store.applySpellEffects('mage', { id: 'short', spellId: 'short', casterId: 'mage', statModifiers: { CC: 10 }, duration: '(Bonus de Force Mentale) Rounds' });
  await store.applySpellEffects('mage', { id: 'long', spellId: 'long', casterId: 'mage', statModifiers: { F: 10 }, duration: 'FM minutes' });
  const [short, long] = person(store, 'mage').extensions.v5.spellEffects;
  assert.equal(short.durationRounds, 4);
  assert.equal(long.remainingMinutes, 45);
  assert.equal(long.expiresAtRound - long.appliedAtRound, 270);
  await store.advanceTalentMinutes(10);
  const after = person(store, 'mage');
  assert.deepEqual(after.extensions.v5.spellEffects.map(e => e.id), ['long']);
  assert.equal(after.extensions.v5.spellEffects[0].remainingMinutes, 35);
  assert.equal(after.caracs.CC, 40, 'le buff en Rounds est retiré');
  assert.equal(after.caracs.F, 40);
  await store.undo();
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 2);
  assert.equal(person(store, 'mage').caracs.CC, 50);
  await store.advanceTalentMinutes(45);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0);
  assert.equal(person(store, 'mage').caracs.F, 30);
});

test('S-02 — Rounds de combat : le temps restant en minutes suit l’horloge de Rounds', () => {
  let p = applySpellEffects(wizard(), { id: 'long', spellId: 'long', casterId: 'mage', statModifiers: { F: 10 }, duration: '10 minutes' }, { round: 1 }).participant;
  p = processCombatTurnSpells([p], 31, 'mage', { actorId: 'mage', round: 31 })[0];
  assert.equal(p.extensions.v5.spellEffects[0].remainingMinutes, 5, '10 min − 30 Rounds = 5 min');
  p = processCombatTurnSpells([p], 61, 'mage', { actorId: 'mage', round: 61 })[0];
  assert.equal(p.extensions.v5.spellEffects.length, 0);
});

test('S-05 — buff, synchronisation de fiche (nouvelle base), expiration : la valeur finale est la nouvelle base', () => {
  const buffed = applySpellEffects(wizard(), { id: 'b', spellId: 'b', casterId: 'mage', statModifiers: { CC: 10 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(buffed.caracs.CC, 50);
  const synced = rebaseMagicLayers(buffed, { caracs: { CC: 45 } });
  assert.equal(synced.caracs.CC, 55, 'couche recalculée sur la nouvelle base');
  assert.equal(synced.extensions.v5.baseCaracs.CC, 45);
  const expired = expireSpellEffects(synced, { currentRound: 9 }).participant;
  assert.equal(expired.caracs.CC, 45);
  const idle = rebaseMagicLayers(expired, { caracs: { CC: 47 } });
  assert.equal(idle.caracs.CC, 47);
  assert.equal(applySpellEffects(idle, { id: 'c', spellId: 'c', statModifiers: { CC: 5 }, duration: 3 }, { round: 1 }).participant.caracs.CC, 52, 'base périmée jamais réutilisée');
});

test('S-05 — deux sorts sur la même cible : l’expiration de l’un laisse l’autre ; Mouvement et Protection recalculés', () => {
  let p = applySpellEffects(wizard(), { id: 'a', spellId: 'a', casterId: 'mage', statModifiers: { M: 2, F: 10 }, ward: 7, duration: 2 }, { round: 1 }).participant;
  p = applySpellEffects(p, { id: 'b', spellId: 'b', casterId: 'mage', statModifiers: { Int: 10 }, ward: 9, duration: 8 }, { round: 1 }).participant;
  assert.equal(p.M, 6); assert.equal(p.movement, 6); assert.equal(p.extensions.v5.ward, 7);
  p = expireSpellEffects(p, { effectId: 'a' }).participant;
  assert.equal(p.caracs.Int, 62); assert.equal(p.caracs.F, 30); assert.equal(p.M, 4); assert.equal(p.movement, 4); assert.equal(p.extensions.v5.ward, 9);
});

test('S-05 — Saphery et autre sort : le seuil reste dans la couche (3, pas 9)', () => {
  let p = applySpellEffects(wizard(), { id: 's', spellId: 'saphery', ward: 3, duration: 5 }, { round: 1 }).participant;
  p = applySpellEffects(p, { id: 'p', spellId: 'protection', ward: 9, duration: 5 }, { round: 1 }).participant;
  assert.equal(p.extensions.v5.ward, 3);
});

test('S-05 — Bouclier de Saphery : reçu « réussite automatique » et seuil porté par la couche', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } }), wizard('ally'));
  const input = { actorId: 'mage', targetIds: ['ally'], roll: 25, otherHighSpellsCount: 8 };
  const preview = store.previewSpellExecution('Bouclier de Saphery', input);
  assert.equal(preview.ready, true, preview.error);
  const action = preview.targetResults[0].actions.find(a => a.kind === 'shield-of-saphery');
  assert.equal(action.automaticSuccess, true);
  await store.applySpellExecution('Bouclier de Saphery', input);
  const ally = person(store, 'ally');
  assert.equal(ally.extensions.v5.ward, 1);
  assert.equal(ally.extensions.v5.spellEffects[0].ward, 1);
});

test('S-05 — compétence importée comptée une seule fois, avant et après synchronisation', () => {
  const imported = wizard('mage', { skills: [{ name: 'Corps à corps (Base)', total: 60 }] });
  const buffed = applySpellEffects(imported, { id: 'cc', spellId: 'cc', statModifiers: { CC: 10 }, duration: 4 }, { round: 1 }).participant;
  assert.equal(effectiveSkillScore(buffed, 60, 'CC'), 70);
  const synced = rebaseMagicLayers({ ...buffed, skills: [{ name: 'Corps à corps (Base)', total: 65 }] }, { caracs: { CC: 45 } });
  assert.equal(effectiveSkillScore(synced, 65, 'CC'), 75);
  assert.equal(effectiveSkillScore(expireSpellEffects(synced, { currentRound: 9 }).participant, 65, 'CC'), 65);
});

test('S-05 — Undo et rechargement : couches cohérentes (store sérialisé puis rechargé)', async () => {
  const store = await combat(wizard());
  await store.applySpellEffects('mage', { id: 'b', spellId: 'b', casterId: 'mage', statModifiers: { CC: 10 }, duration: '(Bonus de Force Mentale) Rounds' });
  const reloaded = createStore(); await reloaded.ready; await reloaded.loadFromJSON(snapshotOf(store));
  assert.equal(person(reloaded, 'mage').caracs.CC, 50);
  await reloaded.expireSpellEffects('mage', { effectId: 'b' });
  assert.equal(person(reloaded, 'mage').caracs.CC, 40);
  await store.undo();
  assert.equal(person(store, 'mage').caracs.CC, 40);
  assert.equal((person(store, 'mage').extensions.v5.spellEffects || []).length, 0);
});

test('S-05 — identifiants d’effets d’incident uniques dans un même Round', () => {
  const miscast = { table: 'MINOR', name: 'Langue maladroite', finalRoll: 3, details: { type: 'penalty', duration: { value: 2, unit: 'rounds' }, slModifier: -1, targetSkillCategory: 'Langue', summary: 'x' } };
  let p = applyMiscastToParticipant(wizard(), miscast, { round: 2 }).participant;
  p = applyMiscastToParticipant(p, miscast, { round: 2 }).participant;
  const ids = p.extensions.v5.miscastEffects.map(e => e.id);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2);
});

const withV5 = (extra = {}) => wizard('mage', { extensions: { v5: { hasMomentum: true, ...extra } } });

test('S-11 — épuisement temporaire : Chance seulement, compteur initialisé exigé, Undo rembourse', async () => {
  const store = await combat(withV5({ burnout: { active: true, permanent: false, days: 3 }, fate: 2 }));
  assert.equal(store.previewBurnoutRecovery({ actorId: 'mage' }).possible, false, 'compteur non initialisé : bloqué');
  assert.match(store.previewBurnoutRecovery({ actorId: 'mage' }).reason, /initialisé/);
  await store.setFortune('mage', 2);
  assert.equal(store.previewBurnoutRecovery({ actorId: 'mage', resource: 'fate' }).possible, false, 'le Destin ne lève pas un épuisement temporaire');
  const preview = store.previewBurnoutRecovery({ actorId: 'mage' });
  assert.equal(preview.possible, true);
  await store.applyBurnoutRecovery(preview, { actorId: 'mage' });
  assert.equal(person(store, 'mage').extensions.v5.burnout, null);
  assert.equal(store.getFortune('mage').balance, 1);
  assert.equal(person(store, 'mage').extensions.v5.fate, 2, 'Destin intact');
  await store.undo();
  assert.equal(store.getFortune('mage').balance, 2);
  assert.equal(person(store, 'mage').extensions.v5.burnout.active, true);
});

test('S-11 — épuisement permanent : Destin canonique (extensions.v5.fate), conservé au rechargement', async () => {
  const store = await combat(withV5({ burnout: { active: true, permanent: true, days: 1e9 }, fate: 2 }));
  await store.setFortune('mage', 2);
  assert.equal(store.previewBurnoutRecovery({ actorId: 'mage', resource: 'fortune' }).possible, false);
  await store.applyBurnoutRecovery(store.previewBurnoutRecovery({ actorId: 'mage' }), { actorId: 'mage' });
  assert.equal(person(store, 'mage').extensions.v5.fate, 1);
  assert.equal(person(store, 'mage').fate, 1);
  assert.equal(store.getFortune('mage').balance, 2, 'la Chance n’est pas touchée');
  const reloaded = createStore(); await reloaded.ready; await reloaded.loadFromJSON(snapshotOf(store));
  assert.equal(person(reloaded, 'mage').fate, 1);
  await store.undo();
  assert.equal(person(store, 'mage').extensions.v5.fate, 2);
  assert.equal(previewBurnoutRecovery({ extensions: { v5: { burnout: { active: true, permanent: true }, resources: { fortune: 1 } } } }).possible, false, 'Destin absent : bloqué');
});

test('S-11 — Défiance magique : compteur de Chance non initialisé bloque, jamais de levée gratuite', async () => {
  const defiance = wizard('ally', { talents: [{ id: 'talent-magic-defiance', status: 'resolved', rank: 1 }] });
  const store = await combat(wizard(), defiance);
  await store.startMagicAdventure();
  const input = { actorId: 'mage', targetIds: ['ally'], roll: 25, magicDefianceTargets: ['ally'] };
  const blocked = store.previewSpellExecution('Carreau', input);
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /Chance/);
  await store.setFortune('ally', 1);
  assert.equal(store.previewSpellExecution('Carreau', input).ready, true);
  await store.applySpellExecution('Carreau', input);
  assert.equal(store.getFortune('ally').balance, 0);
  await store.undo();
  assert.equal(store.getFortune('ally').balance, 1);
});

test('S-11 — Clairvoyance chaotique : Chance créditée par le registre, Corruption par Chance en reçu MJ, Undo', async () => {
  const preview = { ready: true, cancelled: false, table: 'MINOR', name: 'Clairvoyance chaotique', finalRoll: 50, details: { type: 'fortune-corruption', fortuneGained: 1, corruptionPerFortuneSpent: 1, summary: 'Chance gagnée' } };
  const store = await combat(wizard());
  await store.applyMiscast(preview, { actorId: 'mage' });
  assert.equal(store.getFortune('mage').balance ?? null, null, 'compteur non initialisé : rien d’écrit dans le registre');
  await store.setFortune('mage', 1);
  await store.applyMiscast(preview, { actorId: 'mage' });
  assert.equal(store.getFortune('mage').balance, 2);
  assert.equal(person(store, 'mage').extensions.v5.corruptionPerFortuneSpent, 1);
  await store.undo();
  assert.equal(store.getFortune('mage').balance, 1);
  const pure = applyMiscastToParticipant(wizard(), preview, { round: 1 });
  assert.ok(pure.reminders.some(r => /Corruption par Point de Chance/.test(r)));
  assert.ok(pure.reminders.some(r => /à créditer à la main/.test(r)));
});
