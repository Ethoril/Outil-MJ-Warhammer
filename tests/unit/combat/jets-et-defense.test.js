import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SL, isDouble, getReverseRoll, getLocationName, getCritEffect } from '../../../js/core/dice.js';
import { Participant, DiceLine, CARAC_KEYS, Profile, normalizeCaracs } from '../../../js/core/models.js';
import { sanitizeParticipant, parseState, sanitizeProfile } from '../../../js/core/sanitize.js';
import { computeEndOfTurn, createCombatEngine } from '../../../js/core/combat.js';
import { computeDamage, damageBreakdown, formatDamageFormula } from '../../../js/core/damage.js';
import { activeEngines, applyAttackSl, applyTargetBonus, isCriticalRoll, isFumbleRoll } from '../../../js/core/roll-qualities.js';
import { EFFECT_MODES, advanceEndOfTurn, getEffectCapability, normalizeEffects } from '../../../js/core/effects.js';
import { canonicalQualityId, normalizeQualities } from '../../../js/core/quality-normalization.js';
import { MAX_APPLIED_RESOLUTION_IDS, ResolutionError, applyResolution, normalizeResolutionInput, previewResolution, replayResolution, inferActionType } from '../../../js/core/resolution.js';
import { createStore } from '../../../js/core/store.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { parseProfileText } from '../../../js/core/text-profile-import.js';
import { deriveReminders } from '../../../js/core/reminders.js';
import { defenseOptions, defaultDefenseValue } from '../../../js/ui/resolution-panel.js';
import { aggregateTalents, getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { buildExpiry } from '../../../js/ui/v5-divine-form-model.js';
import { v5StoreActionClock } from '../../../js/core/v5-store-action.js';
import { weaponHandsForParticipant } from '../../../js/core/equipment.js';
import { conditionLevels, momentumAfterChange, withMomentum, hasMomentum, loseMomentumUnderFear } from '../../../js/core/v5-combat-rules.js';
import { slugify, parseCSV, getKeywordList, fetchKeywords } from '../../../js/core/keywords.js';
import { previewV5Test, selectV5Test, summarizeV5Advantage, reverseV5Roll, resolveV5Opposition } from '../../../js/core/v5-roll.js';
import { previewMomentumEvents, previewMomentumCost } from '../../../js/core/v5-momentum.js';
import { buildV5RollDecision, selectV5Decision } from '../../../js/core/v5-decision.js';
import { computeV5WeaponRangeBands } from '../../../js/core/v5-talent-combat.js';
import { previewSkittishReaction, previewGenericFearEncounter } from '../../../js/core/v5-talent-psychology.js';
import { planPsychology } from '../../../js/core/creature-psychology.js';
import { planCreatureSize } from '../../../js/core/creature-size.js';
import { senseTestRules, planSense } from '../../../js/core/creature-senses.js';
import { naturalWeaponDefaults } from '../../../js/core/v5-weapon-qualities.js';

describe('Des', () => {
test('SL (Degrés de succès)', () => {
  assert.equal(SL(50, 23), 3); // 5 - 2 = 3
  assert.equal(SL(50, 50), 0); // 5 - 5 = 0
  assert.equal(SL(50, 51), 0); // 5 - 5 = 0
  assert.equal(SL(50, 60), -1); // 5 - 6 = -1
  assert.equal(SL(50, 100), -5); // 5 - 10 = -5
});

test('isDouble', () => {
  assert.equal(isDouble(11), true);
  assert.equal(isDouble(55), true);
  assert.equal(isDouble(99), true);
  assert.equal(isDouble(100), true); // 00 compte comme double (A-13 / Fix 6.6)
  assert.equal(isDouble(10), false);
  assert.equal(isDouble(42), false);
});

test('getReverseRoll', () => {
  assert.equal(getReverseRoll(23), 32);
  assert.equal(getReverseRoll(4), 40); // '04' -> '40'
  assert.equal(getReverseRoll(10), 1); // '10' -> '01' -> 1
  assert.equal(getReverseRoll(100), 100); // 100 traité comme '00' -> 100 (A-13 / Fix 6.6)
});

test('getLocationName', () => {
  assert.equal(getLocationName(9).name, 'Tête');
  assert.equal(getLocationName(10).name, 'Bras Gauche');
  assert.equal(getLocationName(24).name, 'Bras Gauche');
  assert.equal(getLocationName(25).name, 'Bras Droit');
  assert.equal(getLocationName(44).name, 'Bras Droit');
  assert.equal(getLocationName(45).name, 'Corps');
  assert.equal(getLocationName(79).name, 'Corps');
  assert.equal(getLocationName(80).name, 'Jambe Gauche');
  assert.equal(getLocationName(89).name, 'Jambe Gauche');
  assert.equal(getLocationName(90).name, 'Jambe Droite');
  assert.equal(getLocationName(100).name, 'Jambe Droite');
});

test('getCritEffect', () => {
  const head1 = getCritEffect('HEAD', 5);
  assert.equal(head1.name, 'Blessure spectaculaire');

  const head100 = getCritEffect('HEAD', 100);
  assert.equal(head100.name, 'Décapitation');

  const invalid = getCritEffect('INVALID_KEY', 50);
  assert.equal(invalid, null);
});
});

describe('Integration du combat E06', () => {
test('E06 intégration — Participant et sanitation exposent des états structurés', () => {
  const source = { kind: 'sort', id: 's1' };
  const participant = new Participant({
    id: 'p1', name: 'Cible', hp: 8,
    states: [{ id: 'state-source', name: 'Brisé', level: 2, duration: 3, source }]
  });
  assert.deepEqual(participant.states[0].source, source);
  assert.equal(parseState(participant.states[0]).turns, 3);

  const sanitized = sanitizeParticipant({ id: 'p2', name: 'Legacy', states: ['Sonné|2', { id: 'unknown', name: 'Maison', duration: 4, source }] });
  assert.equal(sanitized.states.length, 2);
  assert.equal(sanitized.states[0].duration, 2);
  assert.equal(sanitized.states[1].source.id, 's1');
});

test('E06 intégration — combat conserve niveaux, durées et sources en fin de tour', () => {
  const participant = new Participant({
    name: 'Renaut', hp: 10, caracs: { E: 35 },
    armor: { head: 2, body: 1, arms: 3, legs: 2 },
    states: [
      { id: 'h1', name: 'Hémorragique', level: 2, duration: 3, source: 'critique' },
      { id: 's1', name: 'Sonné', level: 2, duration: 2, source: { kind: 'talent' } }
    ]
  });
  const result = computeEndOfTurn(participant, 5);
  assert.equal(result.hpDelta, -2);
  assert.deepEqual(result.nextStates.map(state => ({ id: state.id, level: state.level, duration: state.duration, source: state.source })), [
    { id: 'h1', level: 2, duration: 2, source: 'critique' },
    { id: 's1', level: 2, duration: 1, source: { kind: 'talent' } }
  ]);
  assert.equal(participant.states[0].duration, 3, 'le calcul est pur');
});

test('E06 intégration — alias Impact/Percutante n’appliquent qu’un moteur', () => {
  const qualities = [{ id: 'impact', rating: 2 }, { id: 'percutante', rating: 5 }];
  assert.equal(activeEngines(qualities).filter(engine => engine.engine === 'add-units-die').length, 1);
  const damage = computeDamage({ weaponDamage: 4, sl: 2, roll: 35, qualities });
  assert.equal(damage.bonusPercutante, 5);
  assert.deepEqual(damage.activeQualities.map(quality => quality.id), ['percutante']);
  const line = new DiceLine({ qualities });
  assert.deepEqual(line.qualities.map(quality => quality.id), ['percutante']);
});
});

describe('Effets et qualite E06', () => {
test('E06 états — chaînes historiques deviennent des objets distincts', () => {
  const legacy = ['Hémorragique|3', 'Hémorragique', 'Sonné|1'];
  const normalized = normalizeEffects(legacy);
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].name, 'Hémorragique');
  assert.equal(normalized[0].level, 1);
  assert.equal(normalized[0].duration, 3);
  assert.equal(normalized[1].duration, null);
  assert.notEqual(normalized[0].id, normalized[1].id);
  assert.equal(normalized[2].duration, 1);
  assert.deepEqual(normalizeEffects(legacy).map(state => state.id), normalized.map(state => state.id));
});

test('E06 états — objets modernes conservent niveaux, durée, source et paramètres', () => {
  const source = [{
    id: 'effect-1', key: 'enflamme', name: 'Enflammé', level: 2, duration: 4,
    source: { kind: 'spell', id: 'spell-7' }, parameters: { color: 'blue' }
  }, { id: 'effect-2', name: 'Enflammé', level: 1, duration: 2, source: 'torch' }];
  const normalized = normalizeEffects(source);
  assert.equal(normalized[0].key, 'enflamme');
  assert.equal(normalized[0].level, 2);
  assert.equal(normalized[0].duration, 4);
  assert.deepEqual(normalized[0].source, source[0].source);
  assert.deepEqual(normalized[0].parameters, source[0].parameters);
  assert.equal(normalized[1].name, source[1].name);
  assert.equal(normalized[1].duration, source[1].duration);
  assert.notEqual(normalized[0].id, normalized[1].id);
  normalized[0].source.kind = 'changed';
  assert.equal(source[0].source.kind, 'spell', 'normalisation profonde et sans mutation');
});

test('E06 états — fin de tour conserve la convention hémorragie/flammes/Surpris', () => {
  const participant = {
    name: 'Renaut', hp: 10,
    caracs: { E: 35 }, armor: { head: 2, body: 1, arms: 3, legs: 2 },
    states: ['Hémorragique', 'Hémorragique|3', 'Enflammé', 'Enflammé|2', 'Surpris', 'Sonné|2', 'Aveuglé|1']
  };
  const before = structuredClone(participant);
  const result = advanceEndOfTurn(participant, { d10Roll: 5 });
  assert.equal(result.hpDelta, -5, 'hémorragie -2, flammes 5-3-1+2 = 3');
  assert.equal(result.newHp, 5);
  assert.deepEqual(result.nextStates.map(state => [state.name, state.duration]), [
    ['Hémorragique', null], ['Hémorragique', 2],
    ['Enflammé', null], ['Enflammé', 1], ['Sonné', 1]
  ]);
  assert.equal(participant.states[0], before.states[0]);
  assert.match(result.logs.join('\n'), /Surpris.*dissipé/);
});

test('E06 états — échéance et source restent présentes pendant décrémentation', () => {
  const result = advanceEndOfTurn({
    hp: 8, states: [{ id: 's', name: 'Brisé', level: 2, duration: 3, expiresAt: 'round:4', source: 'critique' }]
  });
  assert.equal(result.nextStates[0].level, 2);
  assert.equal(result.nextStates[0].duration, 2);
  assert.equal(result.nextStates[0].expiresAt, 'round:4');
  assert.equal(result.nextStates[0].source, 'critique');
});

test('E06 états — niveaux et jet injecté restent dans des bornes déterministes', () => {
  const normalized = normalizeEffects([{ name: 'Enflammé', level: 0.5, duration: 2 }]);
  assert.equal(normalized[0].level, 1);
  const high = advanceEndOfTurn({ hp: 10, caracs: { E: 0 }, armor: {}, states: ['Enflammé'] }, { d10Roll: 99 });
  const nonFinite = advanceEndOfTurn({ hp: 10, caracs: { E: 0 }, armor: {}, states: ['Enflammé'] }, { d10Roll: Infinity });
  assert.equal(high.hpDelta, -11, '99 est borné à 10, puis le niveau est ajouté');
  assert.equal(nonFinite.hpDelta, -2, 'Infinity est replié au minimum 1, puis le niveau est ajouté');
});

test('E06 capacités — automatique, rappel et manuel restent distincts', () => {
  assert.equal(getEffectCapability('Hémorragique').mode, EFFECT_MODES.AUTOMATIC);
  assert.equal(getEffectCapability('Enflammé').trigger, 'endOfTurn');
  assert.equal(getEffectCapability('Sonné').mode, EFFECT_MODES.REMINDER);
  const unknown = getEffectCapability({ name: 'Effet inconnu', source: 'table' });
  assert.equal(unknown.mode, EFFECT_MODES.MANUAL);
  assert.equal(unknown.known, false);
});

test('E06 qualités — aliases canonisés et doublons supprimés avant moteur', () => {
  assert.equal(canonicalQualityId('Impact'), 'percutante');
  const normalized = normalizeQualities([
    { id: 'impact', rating: 2 }, { id: 'Percutante', rating: 5 },
    'Pointue', 'pointue', 'Qualité éditoriale', 'qualite-editoriale'
  ]);
  assert.deepEqual(normalized.map(quality => quality.id), [
    'percutante', 'pointue', 'qualite-editoriale'
  ]);
  assert.equal(normalized[0].rating, 2, 'la première occurrence porte les métadonnées');
});
});

describe('Resolution E12', () => {
const actor = { id: 'a', name: 'Attaquant', states: ['Sonné', 'Brisé|2'] };
const target = {
  id: 't', name: 'Cible', hp: 10, caracs: { E: 35 },
  armor: { head: 2, body: 1, arms: 2, legs: 2 }, states: []
};

test('E12 résolution — dé saisi et dé virtuel équivalents, 00 devient 100', () => {
  const base = { actor, action: { type: 'test', base: 50, mod: 5 }, v5: { slModifier: 1, context: { runningOrHiding: false } }, baseRevision: 3 };
  const entered = previewResolution({ ...base, roll: '00' });
  const virtual = previewResolution({ ...base, roll: 100 });
  assert.equal(entered.roll, 100);
  assert.deepEqual(entered, virtual);
  assert.equal(previewResolution({ ...base, roll: 1 }).success, true);
  assert.throws(() => normalizeResolutionInput({ ...base, roll: 0 }), ResolutionError);
});

test('E12 résolution — pénalité V5 des États et difficulté en DR, seuil inchangé', () => {
  const result = previewResolution({
    actor, target, v5: { kind: 'ranged', slModifier: 1 },
    action: { type: 'attack', base: 50, mod: 5, damage: 4, qualities: ['Empaleuse'] },
    baseRevision: 7, roll: 30, criticalRolls: { location: 20, effect: 40 }
  });
  assert.deepEqual(result.score, {
    base: 50, mod: 0, statePenalty: 1, penaltyStates: ['sonne', 'brise'], target: 50
  });
  assert.equal(result.success, true);
  assert.equal(result.sl, 2);
  assert.equal(result.critical.kind, 'Critique');
  assert.equal(result.critical.details.effectRoll, 40);
  const legacy = previewResolution({ actor: { id: 'a', states: [] }, target, action: { type: 'attack', base: 50, mod: 5, damage: 4 }, roll: 30 });
  assert.equal(applyResolution(legacy, { revision: 0, participants: [target] }).status, 'manual');
  assert.match(legacy.unresolved[0], /Ancien modificateur/);
});

test('E12 résolution — critique injecté, localisation et dégâts seulement pour attaque', () => {
  const attack = previewResolution({
    actor: { id: 'a', states: [] }, target,
    action: { type: 'attack', base: 60, damage: 4, qualities: [] },
    roll: 54, baseRevision: 1, criticalRolls: { location: 33, effect: 40 }
  });
  assert.equal(attack.location.name, 'Corps');
  assert.equal(attack.damage.finalDamage, 1, '4 + SL(60,54)=5 - (BE3 + PA1) = 1');
  const perception = previewResolution({
    actor, target, action: { type: 'perception', base: 60, damage: 99 }, roll: 42, baseRevision: 1
  });
  assert.equal(perception.attack, false);
  assert.equal(perception.damage, null, 'une perception ne devient jamais une attaque');
});

test('E12 résolution — opposition non couverte reste un arbitrage manuel', () => {
  const result = previewResolution({ actor, target, action: { type: 'opposition', base: 50 }, roll: 40 });
  assert.deepEqual(result.opposition, { mode: 'manual', reason: 'aucune-convention-locale-vérifiée' });
  assert.equal(result.damage, null);
});

test('E12 résolution — application unique et révision cible invalidante', () => {
  const preview = previewResolution({
    actor: { id: 'a', states: [] }, target,
    action: { type: 'attack', base: 60, damage: 4 }, v5: { kind: 'ranged' }, roll: 42, baseRevision: 1
  });
  const current = { revision: 1, participants: [target], appliedResolutionIds: [] };
  const applied = applyResolution(preview, current);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants[0].hp, 9);
  assert.equal(applied.resolution.application.applied, true);
  const replay = applyResolution(preview, applied.state);
  assert.equal(replay.status, 'duplicate');
  const stale = applyResolution(preview, { revision: 2, participants: [target] });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.requiresPreview, true);
  const targetChanged = applyResolution(preview, { revision: 1, participants: [{ ...target, hp: 9 }] });
  assert.equal(targetChanged.status, 'stale');
  const missing = applyResolution(previewResolution({ actor, action: { type: 'attack', base: 50, damage: 4 }, roll: 40 }), {
    revision: 0, participants: []
  });
  assert.equal(missing.status, 'manual');
});

test('E12 résolution — rejeu conserve exactement les mêmes jets et entrées', () => {
  const input = { actor, target, action: { type: 'attack', base: 60, damage: 4 }, v5: { kind: 'ranged' }, roll: '01', baseRevision: 2 };
  const first = previewResolution(input);
  const replay = replayResolution(first.input);
  assert.deepEqual(replay, first);
  assert.equal(replay.roll, 1);
});

test('E12 résolution — identifiants dérivés incluent action, cible et révision', () => {
  const first = previewResolution({ actor, target, action: { id: 'attaque-1', type: 'attack', base: 60, damage: 4 }, roll: 40, baseRevision: 2 });
  const second = previewResolution({ actor, target, action: { id: 'attaque-2', type: 'attack', base: 60, damage: 4 }, roll: 40, baseRevision: 2 });
  assert.notEqual(first.resolutionId, second.resolutionId);
  const later = previewResolution({ actor, target, action: { id: 'attaque-1', type: 'attack', base: 60, damage: 4 }, roll: 40, baseRevision: 3 });
  assert.notEqual(first.resolutionId, later.resolutionId);
});

test('E12 résolution — double application même ID reste unique et le journal borné', () => {
  const preview = previewResolution({ resolutionId: 'same-action', actor: { id: 'a', states: [] }, target, action: { type: 'attack', base: 60, damage: 4 }, v5: { kind: 'ranged' }, roll: 42, baseRevision: 1 });
  const current = { revision: 1, participants: [target], appliedResolutionIds: [] };
  const applied = applyResolution(preview, current);
  assert.equal(applyResolution(preview, applied.state).status, 'duplicate');
  let state = { revision: 0, participants: [], appliedResolutionIds: [] };
  for (let i = 0; i < MAX_APPLIED_RESOLUTION_IDS + 5; i++) {
    state = applyResolution(previewResolution({ resolutionId: `r-${i}`, actor: { id: 'a', states: [] }, action: { type: 'test', base: 60 }, roll: 42, baseRevision: i }), state).state;
  }
  assert.equal(state.appliedResolutionIds.length, MAX_APPLIED_RESOLUTION_IDS);
});
});

describe('Moteur de combat E18', () => {
function memoryPersistence(initial = null) {
  let state = initial && structuredClone(initial);
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; },
    peek() { return state && structuredClone(state); }
  };
}

// --- 1. Caractéristiques canoniques -------------------------------------------------

test('E18 caracs — alias convertis, canonique prioritaire, nombres finis, idempotent', () => {
  assert.deepEqual(CARAC_KEYS, ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
  const raw = { cc: 45, ct: '30', f: 35, e: 38, i: 40, agi: 33, dex: 25, int: 20, fm: 28, soc: 15, m: 4, a: 1, b: 12, bf: 3 };
  assert.deepEqual(normalizeCaracs(raw), { CC: 45, CT: 30, F: 35, E: 38, I: 40, Ag: 33, Dex: 25, Int: 20, FM: 28, Soc: 15, M: 4, A: 1, B: 12, BF: 3 });
  assert.deepEqual(normalizeCaracs({ ag: 31 }), { Ag: 31 });
  assert.deepEqual(normalizeCaracs({ e: 20, E: 38 }), { E: 38 }, 'la clé canonique gagne quel que soit l’ordre');
  assert.deepEqual(normalizeCaracs({ E: 38, e: 20 }), { E: 38 });
  assert.deepEqual(normalizeCaracs({ E: NaN, CC: 'x', F: null, CT: '', Ag: Infinity, I: 30 }), { I: 30 });
  const once = normalizeCaracs(raw);
  assert.deepEqual(normalizeCaracs(once), once);
  assert.deepEqual(normalizeCaracs(null), {});
});

test('E18 caracs — import texte en clés canoniques, I et Ag reconnus, messages en caracs.E', () => {
  const result = parseProfileText('Nom: Orc\nPV: 12\nE: 38\nCC: 45\nI: 30\nAg: 25\nAgi: 25');
  assert.deepEqual(result.profiles[0].caracs, { E: 38, CC: 45, I: 30, Ag: 25 });
  assert.equal(result.errors.length, 0);
  const ambiguous = parseProfileText('Nom: Orc\nPV: 12\ne: 38\nE: 40\nCC: x');
  assert.equal(ambiguous.ambiguities[0].field, 'caracs.E');
  assert.equal(ambiguous.errors[0].field, 'caracs.CC');
});

test('E18 caracs — sanitize, constructeurs et migration normalisent', () => {
  assert.deepEqual(sanitizeProfile({ id: 'p', caracs: { e: 38, cc: 45 } }).caracs, { E: 38, CC: 45 });
  assert.deepEqual(sanitizeParticipant({ id: 'c', caracs: { e: 38 } }).caracs, { E: 38 });
  assert.deepEqual(new Profile({ caracs: { agi: 30 } }).caracs, { Ag: 30 });
  assert.deepEqual(new Participant({ caracs: { fm: 30 } }).caracs, { FM: 30 });
  const migrated = migrateSnapshot({ reserve: [{ id: 'p', caracs: { e: 38, cc: 45 } }], combat: { participants: [{ id: 'c', caracs: { e: 38, cc: 45 } }] } }).data;
  assert.deepEqual(migrated.reserve[0].caracs, { E: 38, CC: 45 });
  assert.deepEqual(migrated.combat.participants[0].caracs, { E: 38, CC: 45 });
});

test('E18 caracs — instantané minuscule rechargé en canonique partout, puis sauvegardé ainsi', async () => {
  const lower = () => ({ e: 38, cc: 45 });
  const participant = { id: 'c', name: 'Orc', hp: 10, zone: 'active', caracs: lower() };
  const persistence = memoryPersistence({
    schemaVersion: 2,
    reserve: [{ id: 'p', name: 'Orc', hp: 10, caracs: lower() }],
    combat: { round: 1, currentActorId: 'c', order: ['c'], participants: [participant] },
    log: [], diceLines: [],
    activeScene: { id: 's', status: 'active', round: 1, currentActorId: 'c', order: ['c'], participants: [structuredClone(participant)] },
    suspendedScenes: [{ id: 's2', status: 'suspended', participants: [{ ...structuredClone(participant), id: 'c2' }] }],
    persistentCharacters: [{ id: 'pc', name: 'Orc', hp: 10, caracs: lower() }]
  });
  const store = createStore({ persistence });
  await store.ready;
  const canonical = { E: 38, CC: 45 };
  assert.deepEqual(store.getProfile('p').caracs, canonical);
  assert.deepEqual(store.getCombat().participants.get('c').caracs, canonical);
  assert.deepEqual(store.getActiveScene().participants[0].caracs, canonical);
  assert.deepEqual(store.listSuspendedScenes()[0].participants[0].caracs, canonical);
  assert.deepEqual(store.listPersistentCharacters()[0].caracs, canonical);
  await store.addProfile({ id: 'other', name: 'Autre', hp: 5 });
  const saved = persistence.peek();
  assert.deepEqual(saved.reserve.find(item => item.id === 'p').caracs, canonical);
  assert.deepEqual(saved.combat.participants[0].caracs, canonical);
  assert.deepEqual(saved.activeScene.participants[0].caracs, canonical);
  assert.deepEqual(saved.suspendedScenes[0].participants[0].caracs, canonical);
  // Conséquence visible : la BE de la cible n’est plus nulle.
  const preview = store.previewResolution({ actor: { id: 'x', states: [] }, targetId: 'c', action: { type: 'attack', base: 60, damage: 8 }, roll: 42 });
  assert.equal(preview.damage.be, 3);
});

test('E18 caracs — importParsedProfiles enregistre des clés canoniques', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.importParsedProfiles([{ name: 'Orc', hp: 10, caracs: { e: 35 } }]);
  assert.deepEqual(store.listProfiles()[0].caracs, { E: 35 });
});

// --- 2. Banc visible et ajout depuis la bibliothèque -------------------------------

async function launchedStore() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'guard', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfile({ id: 'wolf', name: 'Loup', hp: 8, initiative: 45 });
  await store.addProfile({ id: 'rat', name: 'Rat', hp: 3, initiative: 50 });
  await store.saveEncounter({ id: 'enc', title: 'Cour', entries: [
    { id: 'e1', profileId: 'guard', zone: 'active' },
    { id: 'e2', profileId: 'wolf', zone: 'bench', quantity: 2 },
    { id: 'e3', profileId: 'rat', zone: 'bench' }
  ] });
  await store.launchEncounter('enc');
  return store;
}

test('E18 banc — les participants hors ordre sont listés après l’ordre, par initiative puis nom', async () => {
  const store = await launchedStore();
  const names = store.listParticipants().map(item => item.name);
  assert.deepEqual(names, ['Garde', 'Rat', 'Loup 1', 'Loup 2']);
  assert.deepEqual(store.getEffectiveOrder().map(id => store.getCombat().participants.get(id).name), ['Garde'], 'le banc ne joue pas');
});

test('E18 banc — moveParticipant(active) insère par initiative et garde la scène cohérente', async () => {
  const store = await launchedStore();
  const wolf = store.listParticipants().find(item => item.name === 'Loup 1');
  await store.moveParticipant(wolf.id, 'active');
  const combat = store.getCombat();
  assert.equal(combat.participants.get(wolf.id).zone, 'active');
  const activeInOrder = combat.order.filter(id => combat.participants.get(id).zone === 'active');
  assert.deepEqual(activeInOrder.map(id => combat.participants.get(id).name), ['Loup 1', 'Garde']);
  assert.deepEqual(store.getEffectiveOrder().map(id => combat.participants.get(id).name), ['Loup 1', 'Garde']);
  const scene = store.getActiveScene();
  assert.deepEqual(scene.order, combat.order);
  assert.equal(scene.participants.find(item => item.id === wolf.id).zone, 'active');
  assert.equal(store.listParticipants().length, 4);
});

test('E18 bibliothèque — addProfilesToCombat avec scène active, noms suffixés, annulable et journalisé', async () => {
  const store = await launchedStore();
  const before = store.listParticipants().length;
  const result = await store.addProfilesToCombat(['guard', 'guard']);
  assert.equal(result.ok, true);
  const added = store.listParticipants().slice(before);
  assert.deepEqual(added.map(item => item.name).sort(), ['Garde 2', 'Garde 3']);
  assert.ok(added.every(item => item.zone === 'bench' && item.profileId === 'guard'));
  assert.ok(added.every(item => !store.getCombat().order.includes(item.id)), 'le banc reste hors de l’ordre');
  const scene = store.getActiveScene();
  assert.ok(added.every(item => scene.participants.some(part => part.id === item.id)), 'ajout visible dans la scène');
  assert.match(store.getLog()[0].text, /Garde 2, Garde 3/);
  await store.undo();
  assert.equal(store.listParticipants().length, before);
  assert.equal(store.getActiveScene().participants.length, before);
});

test('E18 bibliothèque — addProfilesToCombat en zone active entre dans l’ordre par initiative', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'slow', name: 'Lent', hp: 5, initiative: 10, diceLines: [{ base: 40, note: 'Hache', damage: 7 }] });
  await store.addProfile({ id: 'fast', name: 'Vif', hp: 5, initiative: 60 });
  await store.addProfilesToCombat(['slow'], { zone: 'active' });
  await store.addProfilesToCombat(['fast'], { zone: 'active' });
  assert.deepEqual(store.listParticipants().map(item => item.name), ['Vif', 'Lent']);
  const slow = store.listParticipants()[1];
  assert.equal(store.getDiceLines().filter(line => line.participantId === slow.id).length, 1);
  assert.throws(() => store.addProfilesToCombat(['missing']), /Aucun profil/);
});

test('E18 bibliothèque — addProfilesToCombat ignore un profil supprimé avant l’exécution de la commande', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'gone', name: 'Disparu', hp: 5, initiative: 10 });
  await store.addProfile({ id: 'kept', name: 'Restant', hp: 5, initiative: 20 });
  // La suppression est en file avant l'ajout : le contrôle préalable passe encore.
  const removal = store.removeProfile('gone');
  const adding = store.addProfilesToCombat(['gone', 'kept']);
  await removal;
  await adding;
  assert.deepEqual(store.listParticipants().map(item => item.name), ['Restant']);
  const lonely = store.removeProfile('kept');
  const rejected = store.addProfilesToCombat(['kept']);
  await lonely;
  await assert.rejects(rejected, /Aucun profil/);
  assert.deepEqual(store.listParticipants().map(item => item.name), ['Restant']);
});

// --- 3. Test opposé -----------------------------------------------------------------

const attacker = { id: 'a', name: 'Attaquant', states: [] };
const defender = { id: 't', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 1, arms: 0, legs: 2 }, states: [] };

test('E18 opposé — tir sans défense, hit === success', () => {
  const input = { actor: attacker, target: defender, v5: { kind: 'ranged' }, action: { type: 'attack', base: 50, damage: 4 }, roll: 34 };
  const result = previewResolution(input);
  assert.equal(result.hit, result.success);
  assert.equal(result.opposition, null);
  assert.equal('defense' in result.input, false);
  assert.equal(result.location.name, 'Bras Droit', '34 inversé = 43');
  assert.equal(result.location.side, 'right');
  assert.equal(previewResolution({ ...input, action: { ...input.action, base: 60 }, roll: 57 }).location.side, null, '75 = Corps');
});

test('E18 opposé — DR net, dégâts avec DR net, localisation latéralisée', () => {
  // Attaquant 50, jet 21 → DR 3. Défenseur 40, jet 35 → DR 1. Net 2.
  const result = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 21, defense: { roll: 35, base: 40 } });
  assert.equal(result.hit, true);
  assert.equal(result.opposition.mode, 'opposed');
  assert.deepEqual([result.opposition.attacker.score, result.opposition.attacker.roll, result.opposition.attacker.sl], [50, 21, 3]);
  assert.deepEqual([result.opposition.defender.label, result.opposition.defender.score, result.opposition.defender.sl], ['CC', 40, 1]);
  assert.deepEqual([result.opposition.netSl, result.opposition.winner], [2, 'attacker']);
  assert.equal(result.location.roll, 12);
  assert.equal(result.location.name, 'Bras Gauche');
  assert.equal(result.location.side, 'left');
  assert.equal(result.damage.sl, 2);
  assert.equal(result.damage.finalDamage, 4 + 2 - 3 - 0);
});

test('E18 opposé — double réussi perdant : critique sans dégâts ordinaires', () => {
  const result = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 44,
    defense: { roll: 11, base: 60, label: 'Esquive', v5: { kind: 'test' } }, criticalRolls: { location: 57, effect: 20 } });
  assert.equal(result.success, true);
  assert.ok(result.critical, 'double réussi critique même si opposition perdue');
  assert.equal(result.hit, false);
  assert.equal(result.opposition.winner, 'defender');
  assert.equal(result.opposition.defender.label, 'Esquive');
  assert.equal(result.location, null);
  assert.equal(result.damage, null);
  assert.equal(result.defenderCritical, null, 'Esquive ne cause pas de Blessure critique de mêlée');
  const applied = applyResolution(result, { revision: 0, participants: [defender], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants[0].hp, 9);
});

test('E18 opposé — l’attaquant peut toucher en ratant si la défense rate davantage', () => {
  // Attaquant 30, jet 45 → DR −1 (échec). Défenseur 30, −1 DR (Sonné), jet 80 → DR −6.
  const result = previewResolution({ actor: attacker, target: { ...defender, states: ['Sonné'] }, action: { type: 'attack', base: 30, damage: 4 }, roll: 45, defense: { roll: '80', base: 30 } });
  assert.equal(result.success, false);
  assert.equal(result.hit, true);
  assert.equal(result.opposition.defender.statePenalty, 1);
  assert.equal(result.opposition.defender.score, 30);
  assert.equal(result.opposition.netSl, 5);
  assert.equal(result.location.roll, 54);
  assert.equal(result.damage.sl, 5);
  assert.equal(result.critical, null);
});

test('E18 opposé — égalité de DR : l’initiateur gagne quelle que soit la différence de score', () => {
  const higher = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 55, damage: 4 }, roll: 30, defense: { roll: 20, base: 45 } });
  assert.equal(higher.opposition.netSl, 0);
  assert.equal(higher.opposition.winner, 'attacker');
  assert.equal(higher.hit, true);
  assert.equal(higher.damage.sl, 0);
  const lower = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 45, damage: 4 }, roll: 20, defense: { roll: 30, base: 55 } });
  assert.equal(lower.opposition.winner, 'attacker');
  const tie = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 30, defense: { roll: 30, base: 50 } });
  assert.equal(tie.opposition.winner, 'attacker');
  assert.equal(tie.hit, true);
  assert.equal(tie.damage.sl, 0);
});

test('E18 opposé — jet de défense validé comme le jet d’attaque, 00 = 100', () => {
  assert.throws(() => previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50 }, roll: 30, defense: { roll: 0, base: 40 } }), ResolutionError);
  const result = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50 }, roll: 30, defense: { roll: '00', base: 40 } });
  assert.equal(result.opposition.defender.roll, 100);
});

test('E18 opposé — le Store transmet la défense et journalise le DR net', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target', name: 'Cible', hp: 10, armor: { arms: 0 }, caracs: { E: 30 }, zone: 'active' });
  const preview = store.previewResolution({ actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 50, damage: 4 }, roll: 21, defense: { roll: 35, base: 40, label: 'Esquive' } });
  assert.equal(preview.opposition.netSl, 2);
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target').hp, 7);
  const entry = store.getLog()[0];
  assert.match(entry.text, /DR 2/);
  assert.equal(entry.detail.opposition.defender.label, 'Esquive');
  assert.equal(entry.detail.opposition.netSl, 2);
  assert.equal(entry.detail.hit, true);
});

test('E18 inferActionType — type explicite, sinon dégâts, sinon compétence', () => {
  assert.equal(inferActionType({ type: 'defense', damage: 5 }), 'defense');
  assert.equal(inferActionType({ type: 'attaque' }), 'attack');
  assert.equal(inferActionType({ type: 'opposed' }), 'opposition');
  assert.equal(inferActionType({ type: 'skill', damage: 4 }), 'skill');
  assert.equal(inferActionType({ damage: 4 }), 'attack');
  assert.equal(inferActionType({ damage: '1d10' }), 'attack');
  assert.equal(inferActionType({ damage: '' }), 'skill');
  assert.equal(inferActionType({ damage: 0 }), 'skill', 'normalizeAction stocke 0 pour une action sans dégâts');
  assert.equal(inferActionType({ type: 'test' }), 'skill');
  assert.equal(inferActionType(null), 'skill');
});

test('E18 damageBreakdown — termes lisibles et formule', () => {
  const damage = computeDamage({ weaponDamage: 8, sl: 4, roll: 43, targetToughnessBonus: 3, targetArmour: 0, qualities: ['Percutante'] });
  assert.deepEqual(damageBreakdown(damage), {
    terms: [
      { sign: '+', value: 8, label: 'arme' },
      { sign: '+', value: 4, label: 'DR' },
      { sign: '+', value: 3, label: 'Percutante' },
      { sign: '−', value: 3, label: 'BE' },
      { sign: '−', value: 0, label: 'PA' }
    ],
    total: 12,
    notes: []
  });
  assert.equal(formatDamageFormula(damage), '8 arme + 4 DR + 3 Percutante − 3 BE − 0 PA = 12');
});

test('E18 damageBreakdown — Pointue, Dévastatrice, Inoffensive et plancher', () => {
  const pointue = damageBreakdown(computeDamage({ weaponDamage: 4, sl: 0, roll: 41, targetToughnessBonus: 3, targetArmour: 2, qualities: ['Pointue', 'Dévastatrice'] }));
  assert.equal(pointue.terms[0].value, 4, 'Pointue ne touche pas l’arme');
  assert.equal(pointue.terms[1].label, 'DR (Dévastatrice)');
  assert.equal(pointue.total, 1);
  assert.ok(pointue.notes.some(note => /Dévastatrice/.test(note)));
  const floored = computeDamage({ weaponDamage: 2, sl: 0, targetToughnessBonus: 3, targetArmour: 2 });
  assert.ok(damageBreakdown(floored).notes.includes('minimum 1'));
  assert.equal(formatDamageFormula(floored), '2 arme + 0 DR − 3 BE − 2 PA = 1 (minimum 1)');
  const harmless = computeDamage({ weaponDamage: 2, sl: 0, targetToughnessBonus: 3, targetArmour: 2, qualities: ['Inoffensive'] });
  const breakdown = damageBreakdown(harmless);
  assert.equal(breakdown.total, 0);
  assert.deepEqual(breakdown.terms.at(-1), { sign: '−', value: 4, label: 'PA (×2)' });
  assert.ok(!breakdown.notes.includes('minimum 1'));
  assert.equal(formatDamageFormula(harmless), '2 arme + 0 DR − 3 BE − 4 PA (×2) = 0 (pas de minimum)');
});

// --- 4. Rappels lisibles ------------------------------------------------------------

test('E18 rappels — libellé de tour lisible, identifiant inchangé', () => {
  const snapshot = { sceneId: 's', participants: [{ id: 'p1', name: 'Saskia' }] };
  const end = deriveReminders(snapshot, { id: 't1', type: 'endTurn', actorId: 'p1' })[0];
  assert.equal(end.text, 'Fin du tour de Saskia');
  assert.equal(end.id, 's:t1:endTurn:p1');
  assert.equal(deriveReminders({ sceneId: 's' }, { id: 't2', type: 'startTurn', actorId: 'p1', actorName: 'Renaut' })[0].text, 'Début du tour de Renaut');
  assert.equal(deriveReminders({ sceneId: 's' }, { id: 't3', type: 'startTurn' })[0].text, 'Début du tour');
  assert.equal(deriveReminders({ sceneId: 's' }, { id: 't4', type: 'endTurn', text: 'Explicite' })[0].text, 'Explicite');
});

test('E18 rappels — Store.getReminders nomme le participant', async () => {
  const store = await launchedStore();
  const guard = store.listParticipants()[0];
  const reminders = store.getReminders({ id: 'turn-1', type: 'endTurn', actorId: guard.id });
  const turn = reminders.find(item => item.kind === 'endTurn');
  assert.equal(turn.text, 'Fin du tour de Garde');
  assert.equal(turn.id, `${store.getActiveScene().id}:turn-1:endTurn:${guard.id}`);
});
});

describe('Options de defense E23', () => {
const target = { caracs: { CC: 41, Ag: 33 } };

test('défense : CC, Ag, jets à base numérique puis « Autre », dans cet ordre', () => {
  const options = defenseOptions(target, [
    { note: 'Épée', base: 45, mod: 5, type: 'attack' },
    { id: 'esq', name: 'Esquive', base: '38', type: 'defense' }
  ]);
  assert.deepEqual(options.map(option => option.value), ['CC', 'Ag', 'jet:index-0', 'jet:esq', 'Autre']);
  assert.deepEqual(options.map(option => option.label), ['CC · 41', 'Ag · 33', 'Épée · 45', 'Esquive · 38', 'Autre (valeur libre)']);
  assert.deepEqual(options.map(option => option.group), ['caracs', 'caracs', 'jets', 'jets', 'autre']);
  assert.equal(options[2].base, 45);
  assert.equal(options[2].mod, 5, 'ancien modificateur transporté, sans conversion implicite');
  assert.equal(options[2].statLabel, 'Épée');
  assert.equal(options[2].type, 'attack');
  assert.equal(options[3].type, 'defense');
  assert.equal(options[4].base, null);
});

test('défense : bases non numériques ignorées, l’index reste celui de la liste complète', () => {
  const options = defenseOptions({ caracs: { CC: null } }, [
    { note: 'Vide', base: '' },
    { note: 'Nul', base: null },
    { note: 'Caractéristique', base: 'Ag' },
    { base: 30 }
  ]);
  assert.deepEqual(options.map(option => option.value), ['CC', 'Ag', 'jet:index-3', 'Autre']);
  assert.equal(options[0].label, 'CC · —');
  assert.equal(options[0].base, null);
  assert.equal(options[2].statLabel, 'Jet');
});

test('défense : jet proposé d’office = premier jet défensif, sinon CC', () => {
  const plain = defenseOptions(target, [{ note: 'Épée', base: 45, type: 'attack' }]);
  assert.equal(defaultDefenseValue(plain), 'CC');
  assert.equal(defaultDefenseValue(defenseOptions(target)), 'CC');
  const withDefense = defenseOptions(target, [
    { note: 'Épée', base: 45, type: 'attack' },
    { note: 'Esquive', base: 38, type: 'defense' },
    { note: 'Parade', base: 50, type: 'defense' }
  ]);
  assert.equal(defaultDefenseValue(withDefense), 'jet:index-1');
});
});

describe('Actions de combat caracterisation', () => {
const clone = value => structuredClone(value);
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf';
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', initiative: 60,
  hp: 40, maxHp: 40, caracs: { CC: 60, CT: 60, F: 40, E: 30, I: 50, Ag: 40, Dex: 40, Int: 60, FM: 60, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', carac: 'Soc', total: 60, status: 'resolved' },
    { name: 'Langue (Magick)', carac: 'Int', total: 70, status: 'resolved' }],
  talents: [], prayers: [], spells: [{ name: 'Carreau', status: 'resolved' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false, divine: { sin: 0 }, magic: { reserve: { type: 'winds', sl: 0 } } } },
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
async function fixture({ actor = person('a'), target = person('b'), order = ['a', 'b'], persistence = memoryPersistence() } = {}) {
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
    extensions: { v5: { combatId: 'f2-b-characterization', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order, participants: [actor, target] } });
  return { store, persistence };
}
const strike = (id, extra = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25,
  action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, defense: { base: 35, roll: 80, v5: { kind: 'melee' } },
  v5: { kind: 'melee' }, ...extra });
const modifier = (test, id) => test.details.modifiers.find(row => row.id === id)?.amount;

// Characterizes the current actor/defender path before shared combat-test changes.
test('F2-B caractérisation — pénalité main secondaire attaque, Talents et défense monté sont séparés par rôle', () => {
  const actor = person('a'), target = person('b');
  const raw = { actor, target, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 25,
    defense: { base: 35, roll: 80, label: 'Esquive', v5: { kind: 'test', context: { penalties: { mounted: -2 } } } },
    v5: { kind: 'melee', context: { penalties: { offHand: -2 } } } };
  const ordinary = previewResolution(raw);
  assert.equal(modifier(ordinary.test, 'penalty:offHand'), -2);
  assert.equal(modifier(ordinary.defenderTest, 'penalty:offHand'), undefined);
  assert.equal(modifier(ordinary.defenderTest, 'penalty:mounted'), -2, 'une pénalité de défense reste attachée à son Test défensif');

  const ambidextrous = previewResolution({ ...raw, actor: { ...actor, talents: [{ id: 'talent-ambidextrous', status: 'resolved', rank: 1 }] } });
  assert.equal(modifier(ambidextrous.test, 'penalty:offHand'), 0, 'Ambidextre supprime la pénalité de la main secondaire');
  assert.equal(modifier(ambidextrous.defenderTest, 'penalty:mounted'), -2, 'le Talent d’attaque ne supprime pas la pénalité défensive');
});

test('F2-B caractérisation — aimed existant ne modifie que le Talent Tir précis', () => {
  const actor = person('a', { talents: aggregateTalents([{ nom: 'Tir précis' }]).items });
  const raw = { actor, target: person('b'), action: { type: 'attack', attr: 'CT', base: 60, damage: 5 }, roll: 25,
    v5: { kind: 'ranged', aimed: false } };
  const ordinary = previewResolution(raw), aimed = previewResolution({ ...raw, v5: { kind: 'ranged', aimed: true } });
  assert.equal(ordinary.test.sl, aimed.test.sl, 'aimed ne donne pas encore le +1 DR général de Visée');
  assert.equal(ordinary.damage.talentDamage, 1);
  assert.equal(aimed.damage.talentDamage, 2, 'aimed est actuellement l’entrée du bonus de dégât du Talent');
  const noTalent = previewResolution({ ...raw, actor: person('a') });
  assert.equal(noTalent.damage.finalDamage, previewResolution({ ...raw, actor: person('a'), v5: { kind: 'ranged', aimed: true } }).damage.finalDamage,
    'le drapeau seul ne donne pas de bonus général de Visée');
});

test('F2-B caractérisation — cible sans défense choisit un jet critique et sa localisation', () => {
  const preview = previewResolution({ actor: person('a'), target: person('b'), action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
    roll: 11, criticalRolls: { location: 34, effect: 20 }, v5: { kind: 'melee', context: { targetHelpless: true } } });
  assert.deepEqual(preview.unresolved, [], 'l’attaque critique décrite est complète, pas un aperçu bloqué');
  assert.equal(preview.hit, true);
  assert.equal(preview.success, true);
  assert.equal(preview.critical.kind, 'Critique');
  assert.equal(preview.critical.details.locationRoll, 34);
  assert.ok(preview.critical.details.location.name);
  const withoutHelpless = previewResolution({ actor: person('a'), target: person('b'), action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
    roll: 11, v5: { kind: 'melee' } });
  assert.ok(withoutHelpless.unresolved.some(row => /défense/i.test(row)), 'une attaque mêlée ordinaire attend son opposition');
});

test('F2-B caractérisation — Store paie le coût et quota d’attaque supplémentaire dans le même Tour, Undo/reload les conservent', async () => {
  const persistence = memoryPersistence();
  const { store } = await fixture({ actor: person('a', { extensions: { v5: { hasMomentum: true, divine: { sin: 0 }, magic: { reserve: { type: 'winds', sl: 0 } } } } }), persistence });
  const input = strike('paid-extra', { v5: { kind: 'melee', extraAttack: true } });
  const preview = store.previewResolution(input);
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.actionCosts.ready, true);
  assert.deepEqual(preview.actionCosts.paid.map(row => [row.resource, row.amount]), [['momentum', 1]]);
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.actionCostReceipt.paid[0].resource, 'momentum');
  const next = store.previewResolution({ ...input, resolutionId: 'paid-extra-second' });
  assert.equal(next.actionCosts.ready, false, 'récupérer l’Élan ne rouvre pas le quota du même Tour');
  assert.ok(next.unresolved.some(row => /Quota/i.test(row)));

  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  assert.equal(reloaded.previewResolution({ ...input, resolutionId: 'paid-extra-after-reload' }).actionCosts.ready, false);
  assert.equal(await reloaded.undo(), true);
  assert.equal(reloaded.previewResolution({ ...input, resolutionId: 'paid-extra-after-undo' }).actionCosts.ready, true);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'a').extensions.v5.hasMomentum, true);

  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'b');
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'a');
  const renewed = store.previewResolution({ ...input, resolutionId: 'paid-extra-next-turn' });
  assert.equal(renewed.actionCosts.ready, true, 'le quota se renouvelle au prochain Tour réel');
});

test('F2-B caractérisation — échéance début du Tour propre après le Tour d’un autre acteur', async () => {
  const actor = person('a', { talents: [{ id: 'talent-martial-arts', status: 'resolved', rank: 2,
    acquisitions: [{}, { qualityId: 'assommante' }] }] });
  const { store } = await fixture({ actor });
  const activation = store.previewResolution({ resolutionId: 'martial-start', actorId: 'a', action: { type: 'skill', base: 0 }, roll: '',
    authorNextTurnEnd: { phase: 'endOfTurn', actorId: 'a', round: 2, turn: 3 },
    v5: { kind: 'test', context: { talentAction: 'martial-arts', beginningOfTurn: true, martialQuality: 'assommante' } } });
  assert.deepEqual(activation.unresolved, []);
  assert.equal((await store.applyResolution(activation)).status, 'applied');
  const active = () => store.listParticipants().find(row => row.id === 'a').states.some(row => row.key === 'martial-arts-quality');
  assert.equal(active(), true);
  const engine = createCombatEngine(store);
  const toB = await engine.nextTurn();
  assert.equal(toB.status, 'applied', JSON.stringify(toB));
  assert.equal(store.getCombat().currentActorId, 'b');
  assert.equal(active(), true, 'le Tour de b ne déclenche pas l’échéance de a');
  const toA = await engine.nextTurn();
  assert.equal(toA.status, 'applied', JSON.stringify(toA));
  assert.equal(store.getCombat().currentActorId, 'a');
  assert.equal(active(), false, 'l’effet expire au début du prochain Tour de son auteur');
});

test('F2-B caractérisation — application Store inscrit les Actions mais ne plafonne pas encore le Tour ordinaire', async () => {
  const contract = getDivineContract(HOWL);
  const prayerActor = person('a', { talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
    prayers: [{ name: contract.catalogueName, status: 'resolved' }],
    skills: [{ name: 'Prière', status: 'resolved', total: 60 }, { name: 'Langue (Magick)', status: 'resolved', total: 200 }] });
  const { store } = await fixture({ actor: prayerActor });
  const first = store.previewResolution(strike('ordinary-attack'));
  assert.deepEqual(first.unresolved, []);
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const envelope = () => JSON.parse(store.getFullJSON());
  const usageAfterAttack = envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a');
  assert.equal(usageAfterAttack.length, 1);
  assert.equal(usageAfterAttack[0].turnId, 'f2-b-characterization:1:a');

  const second = store.previewResolution({ resolutionId: 'ordinary-skill', actorId: 'a', action: { type: 'skill', attr: 'Int', base: 60 }, roll: 25,
    v5: { kind: 'test', context: { isAction: true, involvesMovement: false, requiresSight: false, reliesOnSight: false } } });
  assert.deepEqual(second.unresolved, []);
  assert.equal((await store.applyResolution(second)).status, 'applied', 'une seconde Action ordinaire reste applicable à ce stade');
  assert.equal(envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a').length, 2);

  const spellInput = { actorId: 'a', targetIds: ['b'], roll: 23, miscastRoll: 15, attributeActive: false, locationRoll: 34 };
  const spell = store.previewSpellExecution('Carreau', spellInput);
  assert.equal(spell.valid, true, spell.error);
  await store.applySpellExecution('Carreau', spellInput);
  assert.equal(envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a').length, 3,
    'l’incantation enregistre son créneau à la même horloge du Tour');

  const actor = store.listParticipants().find(row => row.id === 'a');
  const prayerInput = { actorId: 'a', targetIds: [], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    expiry: buildExpiry({ contract, actor, choices: {}, round: 1, phase: 'endOfTurn' }) };
  const prayer = store.previewDivineExecution(HOWL, prayerInput);
  assert.equal(prayer.ready, true, JSON.stringify(prayer));
  await store.applyDivineExecution(HOWL, { preview: prayer });
  assert.equal(envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a').length, 4,
    'la Prière enregistre aussi son usage, sans plafond universel courant');
  assert.ok(contract, 'contrat de Prière chargé');
  assert.ok(actor, 'acteur toujours présent après les trois voies d’action');
});
});

describe('Actions de combat', () => {
const HOWL='divine:miracle:ulric:howl-of-the-wolf';
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='a'?'pj':'ennemi',zone:'active',initiative:60,hp:40,maxHp:40,
  caracs:{CC:60,CT:60,F:40,E:30,I:50,Ag:40,Dex:40,Int:60,FM:60,Soc:60,M:4},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:40},{name:'Prière',status:'resolved',total:60},{name:'Langue (Magick)',status:'resolved',total:200}],
  talents:[],prayers:[],spells:[{name:'Carreau',status:'resolved'}],
  states:[],equipment:[],traits:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:id==='a',divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}},...extra});
function persistence(){let data=null;return {async load(){return data&&structuredClone(data)},async saveAtomic({state}){data=structuredClone(state);return {ok:true}},read(){return data&&structuredClone(data)}}}
async function setup({actor=person('a'),target=person('b')}={}){const p=persistence(),store=createStore({persistence:p,storage:null});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],extensions:{v5:{combatId:'f2-b-actions',turnIndex:1}},combat:{round:1,currentActorId:'a',order:['a','b'],participants:[actor,target]}});return {store,persistence:p}}
const hit=(id,extra={})=>({resolutionId:id,actorId:'a',targetId:'b',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,
  defense:{base:35,roll:80,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',...extra}});
const ordinary=id=>({resolutionId:id,actorId:'a',action:{type:'skill',attr:'Int',base:60},roll:25,v5:{kind:'test',context:{isAction:true,involvesMovement:false,requiresSight:false,reliesOnSight:false}}});

test('F2-B Claude 20 — l’horloge garde le préfixe de scène historique et isole un scope renouvelé',()=>{
 const common={combat:{round:2,currentActorId:'a'},extensions:{v5:{turnIndex:7,combatId:'combat-1'}}};
 assert.deepEqual(v5StoreActionClock({...common,activeScene:{id:'scene-1',encounterId:'enc-1'}}),{encounterId:'enc-1',round:2,turnId:'scene-1:7:a'});
 assert.equal(v5StoreActionClock({...common,activeScene:{id:'scene-1',encounterId:'enc-1',extensions:{v5:{combatScopeId:'scope-scene',turnIndex:7}}}}).turnId,'scope-scene:7:a');
 assert.equal(v5StoreActionClock({...common,extensions:{v5:{turnIndex:7,combatScopeId:'scope-root'}}}).turnId,'scope-root:7:a');
 const resumed=v5StoreActionClock({...common,extensions:{v5:{turnIndex:7,combatScopeId:'scope-other-combat'}},activeScene:{id:'scene-1',encounterId:'enc-1',extensions:{v5:{combatScopeId:'scope-resumed',turnIndex:7}}}});
 assert.equal(resumed.encounterId,'scope-resumed');assert.equal(resumed.turnId,'scope-resumed:7:a','une scène reprise garde son scope malgré le scope racine du combat suivant');
});

test('F2-B Claude 20 — reactionId racine est validé comme une réaction, pas perdu au premier niveau',async()=>{
 const {store}=await setup();
 const p=store.previewResolution({...hit('root-reaction-id'),reactionId:'reaction-invented'});
 assert.equal(p.ready,false);assert.match(p.error||p.unresolved.join(' '),/réaction|reaction/i);
 assert.equal(p.input.v5.reactionId,'reaction-invented');
});

test('F2-B Claude 17/20 — Défensive refuse compétence absente et bloque les quatre API magie',async()=>{
 const {store}=await setup();assert.equal(store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'missing'}).ready,false);
 await store.applyV5CombatAction(store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge'}));
 for(const p of [store.previewChannelling({actorId:'a',roll:25}),store.previewCasting({}, {actorId:'a',roll:25}),store.previewDispelCasting({}, {actorId:'a'}),store.previewDispelPersistent({}, {actorId:'a'}),store.previewDivineWrathRecovery({actorId:'a'})]){assert.equal(p.ready,false);assert.equal(p.code,'F2_COMBAT_ACTION_SPENT');}
});

test('F2-B Claude 17 — Focalisation annule Visée dans sa transaction, Undo la restaure',async()=>{
 const bow={id:'bow',kind:'weapon',name:'Arc',category:'Arc',range:60,damage:'BF+4'};
 const {store,persistence}=await setup({actor:person('a',{equipment:[bow]})});
 const beforeDefense=store.previewChannelling({actorId:'a',type:'winds',roll:25});assert.equal(beforeDefense.ready,true);
 await store.applyV5CombatAction(store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge'}));
 await assert.rejects(async()=>store.applyChannelling(beforeDefense),/déjà été dépensée/);
 await store.undo();
 await store.applyV5CombatAction(store.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',rangedWeaponHeldConfirmed:true}));
 const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();
 const channel=store.previewChannelling({actorId:'a',type:'winds',roll:25});assert.equal(channel.ready,true);
 await store.applyChannelling(channel);assert.equal(persistence.read().extensions.v5.combatActions.byActorId.a,undefined);
 assert.ok(persistence.read().extensions.v5.standardTurnActions.some(row=>row.actionId.startsWith('v5-channelling:')));
 await store.undo();assert.equal(persistence.read().extensions.v5.combatActions.byActorId.a.kind,'aim');
});

test('F2-B Claude 14 — armes catalogue : épée puis pistolet, armes à deux mains refusées',async()=>{
 const items=getReferenceCatalogue().items,sword=items.find(item=>item.kind==='weapon'&&item.name==='Épée'),pistol=items.find(item=>item.kind==='weapon'&&item.name==='Pistolet'),greatsword=items.find(item=>item.kind==='weapon'&&item.name==='Espadon de Hoeth Haut Elfe'),bow=items.find(item=>item.kind==='weapon'&&item.category==='Arc'),bastard=items.find(item=>item.kind==='weapon'&&item.name==='Épée bâtarde (2M)');
 const mail={id:'greatsword-target-mail',kind:'armour',name:'Cotte de mailles',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]};
 assert.equal(weaponHandsForParticipant(sword),1);assert.equal(weaponHandsForParticipant(pistol),1);assert.equal(weaponHandsForParticipant(greatsword),2);assert.equal(weaponHandsForParticipant(bow),2,'un arc ne peut pas être déclaré une arme utilisable à une main par défaut');
 assert.equal(weaponHandsForParticipant({...bastard,hands:2},{extensions:{v5:{weaponHandsByEquipmentId:{[bastard.id]:1}}}}),1,'le choix durable de l’Épée bâtarde prévaut sur la main générique de l’instance');
 const {store}=await setup({actor:person('a',{equipment:[sword,pistol],skills:[{id:'gun',name:'Projectiles (Poudre noire)',group:'Projectiles',specialty:'Poudre noire',total:60,advances:10,status:'resolved'}]}),target:person('b',{equipment:[mail]})});
 await store.applyResolution(store.previewResolution({...hit('primary-sword'),action:{...hit('').action,extensions:{fiche:{equipmentId:sword.id}}}}));
 await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true}}});
 const request={resolutionId:'secondary-pistol',actorId:'a',targetId:'b',action:{type:'attack',attr:'CT',base:60,damage:8,extensions:{fiche:{equipmentId:pistol.id}}},roll:25,v5:{kind:'ranged',extraAttack:true,choice:'keep',context:{secondWeaponAttack:true,primaryResolutionId:'primary-sword'}}};
 const p=store.previewResolution(request);assert.equal(p.ready,true,JSON.stringify(p.unresolved));assert.equal(p.test.details.modifiers.find(row=>row.id==='penalty:offHand').amount,-2);
 await store.updateParticipant('a',{equipment:[greatsword,pistol]});
 const primaryGreatsword={...hit('primary-greatsword'),action:{...hit('').action,extensions:{fiche:{equipmentId:greatsword.id}}},v5:{kind:'melee',choice:'keep',context:{struckItemId:mail.id}}};
 const greatswordApplied=await store.applyResolution(store.previewResolution(primaryGreatsword));assert.equal(greatswordApplied.status,'applied',greatswordApplied.reason);
 await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true}}});
 assert.equal(store.previewResolution({...request,resolutionId:'secondary-after-greatsword',v5:{...request.v5,context:{...request.v5.context,primaryResolutionId:'primary-greatsword'}}}).ready,false);
});

test('F2-B Claude 15 — Croche-pied une fois par touche, même cible déjà À Terre',async()=>{
 const weapon={id:'trip',kind:'weapon',name:'Gaffe',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
 const {store,persistence}=await setup({actor:person('a',{equipment:[weapon]}),target:person('b',{states:[{key:'a-terre',name:'À Terre',level:1}],skills:[{id:'athletics',name:'Athlétisme',total:30,status:'resolved'}]})});
 await store.applyResolution(store.previewResolution({...hit('trip-primary-once'),action:{...hit('').action,extensions:{fiche:{equipmentId:'trip'}}}}));
 await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true}}});
 const request={resolutionId:'trip-once',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{involvesMovement:false}}},v5:{kind:'test',choice:'keep',context:{trip:true,tripPrimaryResolutionId:'trip-primary-once',athleticsSkillId:'athletics'}}};
 const p=store.previewResolution(request);assert.equal(p.ready,true,JSON.stringify(p.unresolved));assert.equal((await store.applyResolution(p)).status,'applied');
 assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').states.filter(row=>['aterre','a-terre'].includes(row.key)).length,1);
 await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true}}});assert.equal(store.previewResolution({...request,resolutionId:'trip-twice'}).ready,false);
});

test('F2-B Claude 20 — la Visée ne bénéficie qu’à la même arme et journal garde les deux paliers',async()=>{
 const bow=id=>({id,kind:'weapon',name:id,category:'Arc',range:60,damage:'BF+4'});
 const {store,persistence}=await setup({actor:person('a',{equipment:[bow('bow'),bow('other')],skills:[{id:'bow-skill',name:'Projectiles (Arc)',group:'Projectiles',specialty:'Arc',total:60,advances:10,status:'resolved'}]})});
 await store.applyV5CombatAction(store.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',rangedWeaponHeldConfirmed:true}));
 const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();
 const request=id=>({resolutionId:'shot-'+id,actorId:'a',targetId:'b',action:{type:'attack',attr:'CT',base:60,damage:4,extensions:{fiche:{equipmentId:id}}},roll:25,v5:{kind:'ranged',choice:'keep'}});
 assert.equal(store.previewResolution(request('other')).test.details.modifiers.some(row=>row.id==='aim:target'),false);
 const shot=store.previewResolution(request('bow'));assert.equal(shot.test.details.modifiers.find(row=>row.id==='aim:target').amount,1);
 assert.equal((await store.applyResolution(shot)).status,'applied');assert.deepEqual(persistence.read().log[0].detail.resultTier,shot.test.resultTier);
});

test('F2-B — les Actions manuelles historiques restent applicables; une Action spéciale ultérieure est refusée',async()=>{
  const {store}=await setup();const first=store.previewResolution(hit('first-action'));
  assert.equal(first.ready,true);assert.deepEqual(first.unresolved,[]);assert.equal((await store.applyResolution(first)).status,'applied',JSON.stringify(first));
  const second=store.previewResolution(ordinary('second-action'));
  assert.deepEqual(second.unresolved,[],'les Actions héritées ne sont pas re-plafonnées');
  assert.equal((await store.applyResolution(second)).status,'applied');
  assert.equal(store.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',actionId:'late-aim'}).ready,false,
    'Visée ne peut pas s’ajouter après une Action ordinaire déjà consommée');
});

test('F2-B — Action Défensive/Vise sont persistées, distinctes et libèrent le créneau au début du prochain Tour',async()=>{
  const {store,persistence}=await setup();
  const declared=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defensive-a'});
  assert.equal(declared.ready,true);assert.equal((await store.applyV5CombatAction(declared)).status,'applied');
  const defense=store.previewResolution({resolutionId:'dodge-test',actorId:'b',targetId:'a',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,
    defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep',context:{skillId:'dodge'}}},v5:{kind:'melee',choice:'keep'}});
  assert.equal(defense.defenderTest.details.modifiers.find(row=>row.id==='combat:defensive-action')?.amount,2,
    'bonus +2 DR seulement à la défense de la compétence choisie');
  assert.equal(defense.test.details.modifiers.some(row=>row.id==='combat:defensive-action'),false,'aucun bonus à l’attaque');
  assert.equal(store.previewResolution(ordinary('action-after-defense')).ready,false);
  const reload=createStore({persistence,storage:null});await reload.ready;
  assert.equal(persistence.read().extensions.v5.combatActions.byActorId.a.skillId,'dodge');
  const undo=await reload.undo();assert.equal(undo,true);
  assert.equal(reload.listParticipants().find(p=>p.id==='a').extensions.v5.combatActions,undefined);
  const engine=createCombatEngine(store);assert.equal((await engine.nextTurn()).status,'applied');assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(store.listParticipants().find(p=>p.id==='a').states.some(row=>row.key==='defensive-action'),false,
    'la Défensive expire au début du prochain Tour propre');
  const {store:aimStore}=await setup();
  const bow={id:'bow',kind:'weapon',name:'Arc',category:'Armes à distance',range:'60/120',damage:'BF+4'};await aimStore.updateParticipant('a',{equipment:[bow]});
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',actionId:'aim-missing-confirmation'}).ready,false);
  const unknownRange={id:'custom-ranged',kind:'weapon',name:'Objet inconnu',category:'Arme exotique',range:'',damage:'BF+4'};await aimStore.updateParticipant('a',{equipment:[bow,unknownRange]});
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'custom-ranged',rangedWeaponHeldConfirmed:true,actionId:'aim-unknown-kind'}).ready,false);
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'custom-ranged',rangedWeaponConfirmed:true,rangedWeaponHeldConfirmed:true,actionId:'aim-unknown-range'}).ready,true);
  const {store:manualAimStore}=await setup();
  assert.equal(manualAimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponName:'Arme du PNJ',rangedWeaponConfirmed:true,rangedWeaponHeldConfirmed:true,actionId:'manual-aim'}).ready,true,
    'une arme absente du tableau équipement exige une déclaration MJ explicite plutôt qu’un blocage de la fiche');
  const aimed=aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',rangedWeaponHeldConfirmed:true,actionId:'aim-a'});
  assert.equal(aimed.ready,true);assert.equal((await aimStore.applyV5CombatAction(aimed)).status,'applied');
  const aimEngine=createCombatEngine(aimStore);await aimEngine.nextTurn();await aimEngine.nextTurn();
  const shot=aimStore.previewResolution({ ...hit('aimed-shot'), action:{type:'attack',attr:'CT',base:60,damage:5,extensions:{fiche:{equipmentId:'bow'}}},defense:undefined,v5:{kind:'ranged',context:{}} });
  assert.equal(shot.test.sl,5,'Visée ajoute +1 aux DR de base 4 du jet 25 contre score 60');
  assert.equal((await aimStore.applyResolution(shot)).status,'applied');
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',rangedWeaponHeldConfirmed:true,actionId:'aim-again'}).ready,false,
    'Visée est une Action et ne se répète pas dans le même Tour');
});

test('F2-B — une défense effectivement appliquée annule la Visée du défenseur, pas une défense seulement proposée absente',async()=>{
  async function aimedDefender(){
    const {store,persistence}=await setup();
    const bow={id:'bow-a',kind:'weapon',name:'Arc',category:'Armes à distance',range:'60/120',damage:'BF+4'};
    await store.updateParticipant('a',{equipment:[bow]});
    const aim=store.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow-a',rangedWeaponHeldConfirmed:true,actionId:'aim-before-incoming'});
    assert.equal(aim.ready,true);assert.equal((await store.applyV5CombatAction(aim)).status,'applied');
    return {store,persistence};
  }
  const {store:noDefense,persistence:noDefensePersistence}=await aimedDefender();
  const unopposed=noDefense.previewResolution({resolutionId:'incoming-unopposed',actorId:'b',targetId:'a',action:{type:'attack',attr:'CT',base:60,damage:5},roll:25,v5:{kind:'ranged'}});
  assert.equal(unopposed.ready,true);assert.equal((await noDefense.applyResolution(unopposed)).status,'applied');
  assert.equal(noDefensePersistence.read().extensions.v5.combatActions.byActorId.a?.kind,'aim','absence de jet défensif appliqué ne dépense pas l’Action Visée');

  const {store:defended,persistence:defendedPersistence}=await aimedDefender();
  const incoming=defended.previewResolution({resolutionId:'incoming-defended',actorId:'b',targetId:'a',action:{type:'attack',attr:'CT',base:60,damage:5},roll:25,
    defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep',context:{skillId:'dodge'}}},v5:{kind:'ranged',choice:'keep',context:{rangedOppositionAllowed:true}}});
  assert.equal(incoming.ready,true);assert.ok(incoming.defenderTest,'le test défensif est réellement calculé');
  assert.equal((await defended.applyResolution(incoming)).status,'applied');
  assert.equal(defendedPersistence.read().extensions.v5.combatActions.byActorId.a,undefined,'le défenseur perd sa Visée dans la même transaction');
});

test('F2-B — Défensive reste active pendant le Tour adverse et expire au début du Tour propre suivant',async()=>{
  const {store,persistence}=await setup();
  const declaration=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defensive-cross-turn'});
  assert.equal(declaration.ready,true);assert.equal((await store.applyV5CombatAction(declaration)).status,'applied');
  const engine=createCombatEngine(store);assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(persistence.read().combat.currentActorId,'b');
  const incoming=store.previewResolution({resolutionId:'incoming-during-b',actorId:'b',targetId:'a',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,
    defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep',context:{skillId:'dodge'}}},v5:{kind:'melee',choice:'keep'}});
  assert.equal(incoming.defenderTest.details.modifiers.find(row=>row.id==='combat:defensive-action')?.amount,2,
    'le +2 s’applique au défenseur pendant le Tour de B');
  assert.equal((await store.applyResolution(incoming)).status,'applied');
  assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(persistence.read().combat.currentActorId,'a');
  assert.equal(persistence.read().extensions.v5.combatActions.byActorId.a,undefined,
    'la Défensive est expirée et retirée au début du prochain Tour de A');
});

test('F2-B — Défensive ne bloque pas la vraie Attaque Rapide gratuite Myrmidia, mais bloque une attaque ordinaire',async()=>{
  const quick='divine:miracle:attaque-rapide',actor=person('a',{talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
    prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),
    skills:[{id:'dodge',name:'Esquive',status:'resolved',carac:'Ag',total:40},{id:'prayer',name:'Prière',status:'resolved',carac:'Soc',total:60}],
    equipment:[{id:'sword',kind:'weapon',name:'Épée',category:'Base',damage:'BF+4',reach:'Moyenne',grip:'one-hand',layer:'none'}],extensions:{v5:{hasMomentum:false,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const {store}=await setup({actor});
  const prayer=store.previewDivineExecution(quick,{actorId:'a',targetIds:[],roll:45,canSpeak:true,expiry:{phase:'endOfTurn',round:3,actorId:'a'},choices:{range:0,targets:0,duration:0,effect:0}});
  assert.equal(prayer.ready,true);assert.equal((await store.applyDivineExecution(quick,{preview:prayer})).ready,true);
  const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();
  const defensive=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defense-before-free'});
  assert.equal(defensive.ready,true);assert.equal((await store.applyV5CombatAction(defensive)).status,'applied');
  const free=store.previewResolution({resolutionId:'myrmidia-free-after-defense',actorId:'a',targetId:'b',roll:24,action:{type:'attack',base:60,attr:'CC',damage:5},defense:{base:30,roll:82,v5:{kind:'melee'}},
    v5:{kind:'melee',extraAttack:true,context:{freeAttackTalent:'divine-free-attack',freeAttackTest:{success:true},mainHand:true}}});
  assert.equal(free.actionCosts.ready,true,JSON.stringify(free.actionCosts.unresolved));assert.equal(free.actionCosts.paid.length,0);
  assert.equal((await store.applyResolution(free)).status,'applied');
  assert.equal(store.previewResolution(hit('ordinary-after-defensive')).ready,false,'l’attaque ordinaire reste refusée après Défensive');
  assert.equal(store.previewResolution(hit('paid-extra-after-defensive',{extraAttack:true})).ready,false,'extraAttack seul sans exemption légitime ne contourne pas Défensive');
});

test('F2-B — la garde du créneau couvre attaque, magie et Prière, sans s’appliquer à réaction/attaque supplémentaire',async()=>{
  const prayerActor=person('a',{talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:'Ulric'}],prayers:[{name:getDivineContract(HOWL).catalogueName,status:'resolved'}]});
  const {store}=await setup({actor:prayerActor});
  const declaration=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defensive-action'});
  assert.equal(declaration.ready,true);assert.equal((await store.applyV5CombatAction(declaration)).status,'applied');
  assert.equal(store.previewResolution(ordinary('after-defense')).ready,false);
  assert.equal(store.previewSpellExecution('Carreau',{actorId:'a',targetIds:['b'],roll:23,miscastRoll:15,attributeActive:false}).ready,false);
  const contract=getDivineContract(HOWL),actor=store.listParticipants().find(p=>p.id==='a');
  const prayer=store.previewDivineExecution(HOWL,{actorId:'a',targetIds:[],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},expiry:buildExpiry({contract,actor,choices:{},round:1,phase:'endOfTurn'})});
  assert.equal(prayer.ready,false);
  const {store:second}=await setup();
  assert.equal(second.previewResolution(hit('legacy-extra',{extraAttack:true})).actionCosts.ready,true,
    'le quota ne supprime pas les attaques supplémentaires legacy hors règle seconde arme');
});

test('F2-B — après une attaque même ratée, seconde arme différente consomme 1 Élan et quota atomiques',async()=>{
  const item=(id,name)=>({id,baseId:'custom-model',catalogVersion:'fixture-v1',kind:'weapon',name,category:'Base',damage:'BF+4',reach:'Moyenne',range:'',ap:null,locations:[],layer:'none',keywords:[],notes:'',source:'Campagne',custom:true,grip:'one-hand'});
  const actor=person('a',{equipment:[item('sword','Épée'),item('axe','Hache')]});
  const {store,persistence}=await setup();await store.updateParticipant('a',{equipment:actor.equipment});
  const miss=store.previewResolution({...hit('first-missed'),roll:99,defense:{base:35,roll:20,v5:{kind:'melee'}},action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'sword'}}},v5:{kind:'melee',choice:'keep',context:{fumbleRoll:1}}});
  assert.equal(miss.ready,true);assert.equal(miss.hit,false);assert.equal((await store.applyResolution(miss)).status,'applied');
  await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const extra=store.previewResolution({...hit('second-axe',{extraAttack:true,context:{secondWeaponAttack:true,weaponId:'axe',primaryResolutionId:'first-missed'}}),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'axe'}}}});
  assert.equal(extra.actionCosts.ready,true);assert.deepEqual(extra.actionCosts.paid.map(row=>[row.resource,row.amount]),[['momentum',1]]);
  assert.equal(extra.test.details.modifiers.find(row=>row.id==='penalty:offHand')?.amount,-2);
  const applied=await store.applyResolution(extra);assert.equal(applied.status,'applied');
  assert.deepEqual(applied.actionCostReceipt.paid.map(row=>[row.resource,row.amount]),[['momentum',1]]);
  const retry=store.previewResolution({...extra.input,resolutionId:'second-axe-again'});assert.equal(retry.actionCosts.ready,false);
  const ledger=(await persistence.read())?.extensions?.v5?.actionLedger;
  assert.equal(ledger.quotaUsage.find(row=>row.quotaId==='combat:base-second-weapon')?.used,1);
  assert.equal(store.previewResolution({...hit('same-weapon',{extraAttack:true,context:{secondWeaponAttack:true,weaponId:'sword',primaryResolutionId:'first-missed'}}),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'sword'}}}}).ready,false);
  const dualActor=person('a',{equipment:[item('sword','Épée'),item('axe','Hache')],talents:[{id:'talent-dual-wielder',name:'Maniement de deux armes',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const {store:dualStore}=await setup({actor:dualActor});
  const dualPrimary=dualStore.previewResolution({...hit('dual-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'sword'}}}});
  assert.equal((await dualStore.applyResolution(dualPrimary)).status,'applied');
  const dualSecond=dualStore.previewResolution({...hit('dual-second',{extraAttack:true,context:{freeAttackTalent:'dual-wielder',dualWielding:true,secondWeaponAttack:true,weaponId:'axe',primaryResolutionId:'dual-primary'}}),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'axe'}}}});
  assert.equal(dualSecond.actionCosts.ready,true);
  assert.equal(dualSecond.actionCosts.paid.length,0,'Maniement de deux armes exonère le coût d’Élan');
});

test('F2-B — Croche-pied exige une touche appliquée de la même cible et l’atout réellement porté par cette attaque',async()=>{
  const {store,persistence}=await setup();
  const tripWeapon={id:'trip-weapon',kind:'weapon',name:'Gaffe de marin',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
  await store.updateParticipant('a',{equipment:[tripWeapon]});
  await store.updateParticipant('b',{skills:[{id:'athletics',name:'Athlétisme',status:'resolved',total:30}]});
  const primary=store.previewResolution({...hit('trip-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'trip-weapon'}}}});
  assert.equal(primary.ready,true);assert.equal(primary.hit,true);assert.equal((await store.applyResolution(primary)).status,'applied');
  assert.ok(persistence.read().extensions.v5.standardTurnActions.find(row=>row.actionId==='trip-primary').qualityIds.includes('croche-pied'),
    'le reçu de l’attaque appliquée conserve la qualité issue de son arme');
  await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const trip=store.previewResolution({resolutionId:'trip-follow-up',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-primary',athleticsSkillId:'athletics'}}});
  assert.equal(trip.ready,true,JSON.stringify(trip.unresolved));assert.equal(trip.trip.winner,'attacker');
  assert.deepEqual(trip.actionCosts.paid.map(row=>[row.resource,row.amount]),[['momentum',1]]);
  assert.equal((await store.applyResolution(trip)).status,'applied');
  assert.ok(persistence.read().combat.participants.find(row=>row.id==='b').states.some(row=>row.key==='aterre'),
    'la victoire de l’attaquant applique À Terre à la cible');
  await store.undo();
  const defenderWin=store.previewResolution({resolutionId:'trip-defender-win',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:90,
    defense:{base:30,roll:10,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-primary',athleticsSkillId:'athletics'}}});
  assert.equal(defenderWin.ready,true);assert.equal(defenderWin.trip.winner,'defender');assert.equal(defenderWin.trip.conditionApplied,false);
  const appliedDefenderWin=await store.applyResolution(defenderWin);assert.equal(appliedDefenderWin.status,'applied');
  assert.deepEqual(appliedDefenderWin.actionCostReceipt.paid.map(row=>[row.resource,row.amount]),[['momentum',1]],'1 Élan reste dépensé même si le défenseur gagne');
  assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').states.some(row=>row.key==='aterre'),false,'aucun À Terre sur victoire défensive');
  const {store:untrainedStore}=await setup({actor:person('a',{skills:[{id:'cc-flail',name:'Corps à corps (Fléau)',group:'Corps à corps',specialty:'Fléau',total:60,advances:0,status:'resolved'}],equipment:[{id:'untrained-flail',kind:'weapon',name:'Fléau',category:'Fléau',damage:'BF+4',keywords:[{id:'croche-pied'}]}]}),target:person('b',{skills:[{id:'athletics',name:'Athlétisme',status:'resolved',total:30}]})});
  const untrainedHit=untrainedStore.previewResolution({...hit('untrained-trip-hit'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'untrained-flail'}}}});
  assert.equal(untrainedHit.ready,true);assert.equal((await untrainedStore.applyResolution(untrainedHit)).status,'applied');
  const blockedByC=untrainedStore.previewResolution({resolutionId:'trip-after-c-strip',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'untrained-trip-hit',athleticsSkillId:'athletics'}}});
  assert.equal(blockedByC.ready,false);assert.ok(blockedByC.unresolved.some(row=>/atout Croche-pied/.test(row)),'le filtrage C retire Croche-pied sans maîtrise du groupe');
});

test('F2-B — Croche-pied refuse une arme sans Atout et accepte les scores absents seulement après confirmation MJ',async()=>{
  const {store}=await setup();
  const sword={id:'plain-sword',kind:'weapon',name:'Épée',category:'Base',damage:'BF+4',keywords:[]};
  await store.updateParticipant('a',{equipment:[sword]});
  const primary=store.previewResolution({...hit('plain-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'plain-sword'}}}});
  assert.equal(primary.ready,true);assert.equal((await store.applyResolution(primary)).status,'applied');
  const actor=store.listParticipants().find(row=>row.id==='a'),{F,...withoutForce}=actor.caracs;
  await store.updateParticipant('a',{caracs:withoutForce});
  const target=store.listParticipants().find(row=>row.id==='b');
  await store.updateParticipant('b',{skills:(target.skills||[]).filter(row=>row.id!=='athletics')});
  const request={resolutionId:'ineligible-trip',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep'}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'plain-primary',athleticsSkillId:'athletics'}}};
  const blocked=store.previewResolution(request);
  assert.equal(blocked.ready,false);assert.ok(blocked.unresolved.some(row=>/arme portant l’atout Croche-pied/.test(row)));
  const tripWeapon={id:'trip-weapon',kind:'weapon',name:'Gaffe de marin',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
  await store.updateParticipant('a',{equipment:[sword,tripWeapon],extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const validPrimary=store.previewResolution({...hit('trip-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'trip-weapon'}}}});
  assert.equal(validPrimary.ready,true);assert.equal((await store.applyResolution(validPrimary)).status,'applied');
  const eligibleBase={...request,v5:{...request.v5,context:{...request.v5.context,tripPrimaryResolutionId:'trip-primary'}}};
  const missingScores=store.previewResolution(eligibleBase);
  assert.equal(missingScores.ready,false);assert.ok(missingScores.unresolved.some(row=>/Force absente/.test(row)));assert.ok(missingScores.unresolved.some(row=>/Athlétisme absent/.test(row)));
  const confirmed=store.previewResolution({...eligibleBase,v5:{...eligibleBase.v5,context:{...eligibleBase.v5.context,forceScoreConfirmed:true,forceScore:40,athleticsScoreConfirmed:true,athleticsScore:30}}});
  assert.equal(confirmed.ready,true,JSON.stringify(confirmed.unresolved));
});

test('F2-B — chute montée applique E30, bloque E20 sans test atomique, BE≥6 ne soigne jamais, et traite critiques Jambe/supplémentaires',async()=>{
  async function mountedCase(id,E){
    const target=person('b',{caracs:{...person('b').caracs,E},extensions:{v5:{mounted:true}}}),{store,persistence}=await setup({target});
    const tripWeapon={id:'trip-weapon',kind:'weapon',name:'Gaffe de marin',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
    await store.updateParticipant('a',{equipment:[tripWeapon]});
    await store.updateParticipant('b',{skills:[{id:'athletics',name:'Athlétisme',status:'resolved',total:30}]});
    const primary=store.previewResolution({...hit(id+'-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'trip-weapon'}}}});
    assert.equal(primary.ready,true);assert.equal((await store.applyResolution(primary)).status,'applied');const hpAfterPrimary=persistence.read().combat.participants.find(row=>row.id==='b').hp;
    await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
    return{store,persistence,id,hpAfterPrimary};
  }
  const e30=await mountedCase('trip-e30',30);
  const fall30=e30.store.previewResolution({resolutionId:'trip-e30-fall',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e30-primary',athleticsSkillId:'athletics'}}});
  assert.equal(fall30.ready,true,JSON.stringify(fall30.unresolved));assert.equal(fall30.tripFall.rawDamage,3);assert.equal(fall30.tripFall.damageLoss,3);assert.equal(fall30.tripFall.enduranceTest,null);
  assert.equal((await e30.store.applyResolution(fall30)).status,'applied');
  let fallen=e30.persistence.read().combat.participants.find(row=>row.id==='b');assert.equal(fallen.hp,e30.hpAfterPrimary-3);assert.equal(fallen.extensions.v5.mounted,false);assert.ok(fallen.states.some(row=>row.key==='aterre'));

  const e20=await mountedCase('trip-e20',20);
  const missing=e20.store.previewResolution({resolutionId:'trip-e20-missing-test',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-primary',athleticsSkillId:'athletics'}}});
  assert.equal(missing.ready,false);assert.ok(missing.unresolved.some(row=>/Test d’Endurance \+0/.test(row)));
  assert.equal((await e20.store.applyResolution(missing)).status,'manual');assert.equal(e20.persistence.read().combat.participants.find(row=>row.id==='b').hp,e20.hpAfterPrimary);
  const fall20=e20.store.previewResolution({...missing.input,resolutionId:'trip-e20-successful-endurance',v5:{...missing.input.v5,context:{...missing.input.v5.context,tripFallEnduranceRoll:10}}});
  assert.equal(fall20.ready,true,JSON.stringify(fall20.unresolved));assert.equal(fall20.tripFall.damageLoss,4);assert.equal(fall20.tripFall.enduranceTest.success,true);
  assert.equal((await e20.store.applyResolution(fall20)).status,'applied');fallen=e20.persistence.read().combat.participants.find(row=>row.id==='b');assert.equal(fallen.hp,e20.hpAfterPrimary-4);assert.equal(fallen.extensions.v5.mounted,false);

  const e60=await mountedCase('trip-e60',60);
  const noHealing=e60.store.previewResolution({resolutionId:'trip-e60-fall',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e60-primary',athleticsSkillId:'athletics'}}});
  assert.equal(noHealing.ready,true,JSON.stringify(noHealing.unresolved));assert.equal(noHealing.tripFall.damageLoss,0);
  assert.equal((await e60.store.applyResolution(noHealing)).status,'applied');assert.equal(e60.persistence.read().combat.participants.find(row=>row.id==='b').hp,e60.hpAfterPrimary);

  const e20Fail=await mountedCase('trip-e20-fail',20);
  await e20Fail.store.updateParticipant('b',{armor:{head:4,body:4,arms:4,legs:4}});
  const wrongLoc=e20Fail.store.previewResolution({resolutionId:'trip-e20-wrong-loc',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-fail-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:65,tripLegLocationRoll:10,tripLegCriticalEffectRoll:20}}});
  assert.equal(wrongLoc.ready,false);assert.ok(wrongLoc.unresolved.some(row=>/localisation d100 de Jambe/.test(row)));
  const legCrit=e20Fail.store.previewResolution({resolutionId:'trip-e20-leg-crit',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-fail-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:65,tripLegLocationRoll:85,tripLegCriticalEffectRoll:20}}});
  assert.equal(legCrit.ready,true,JSON.stringify(legCrit.unresolved));
  assert.equal(legCrit.tripFall.armourApplied,false);assert.equal(legCrit.tripFall.damageLoss,4);assert.equal(legCrit.tripFall.criticals.length,1);
  assert.equal((await e20Fail.store.applyResolution(legCrit)).status,'applied');
  let critTarget=e20Fail.persistence.read().combat.participants.find(row=>row.id==='b');
  assert.equal(critTarget.extensions.v5.criticalWounds.length,1);assert.equal(critTarget.extensions.v5.criticalWounds[0].source,'fall');
  assert.equal(await e20Fail.store.undo(),true);
  assert.equal(e20Fail.persistence.read().combat.participants.find(row=>row.id==='b').extensions.v5.mounted,true);

  const e20Astounding=await mountedCase('trip-e20-astounding',20);
  const missingExtra=e20Astounding.store.previewResolution({resolutionId:'trip-e20-missing-extra',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-astounding-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:95,tripLegLocationRoll:85,tripLegCriticalEffectRoll:20}}});
  assert.equal(missingExtra.ready,false);assert.ok(missingExtra.unresolved.some(row=>/Échec éclatant/.test(row)));
  const twoCrits=e20Astounding.store.previewResolution({resolutionId:'trip-e20-two-crits',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-astounding-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:95,tripLegLocationRoll:85,tripLegCriticalEffectRoll:20,tripExtraLocationRoll:15,tripExtraCriticalEffectRoll:25}}});
  assert.equal(twoCrits.ready,true,JSON.stringify(twoCrits.unresolved));assert.equal(twoCrits.tripFall.criticals.length,2);
  assert.equal((await e20Astounding.store.applyResolution(twoCrits)).status,'applied');
  critTarget=e20Astounding.persistence.read().combat.participants.find(row=>row.id==='b');
  assert.equal(critTarget.extensions.v5.criticalWounds.length,2);
});

test('F2-B — Tir engagé ne redirige que la touche annulée par Désavantage, puis blesse la vraie cible dans le Store',async()=>{
  const actor=person('a'),initial=person('b',{hp:30,maxHp:30}),ally=person('c',{camp:'pj',hp:30,maxHp:30,armor:{head:2,body:2,arms:2,legs:2}});
  const p=persistence(),store=createStore({persistence:p,storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],extensions:{v5:{combatId:'f2-b-engaged',turnIndex:1}},combat:{round:1,currentActorId:'a',order:['a','b','c'],participants:[actor,initial,ally]}});
  const preview=store.previewResolution({resolutionId:'engaged-redirect',actorId:'a',targetId:'b',action:{type:'attack',attr:'CT',base:60,damage:4},roll:18,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['b','c'],engagedTargetRoll:80}}});
  assert.deepEqual(preview.unresolved,[]);assert.equal(preview.engagedShot.selectedTargetId,'c');assert.equal(preview.targetId,'c');assert.equal(preview.hit,true);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.equal(p.read().combat.participants.find(row=>row.id==='b').hp,30,'la cible initiale n’est pas blessée');
  assert.ok(p.read().combat.participants.find(row=>row.id==='c').hp<30,'le combattant tiré au sort subit réellement les dégâts');
  assert.equal(await store.undo(),true);assert.equal(p.read().combat.participants.find(row=>row.id==='c').hp,30);
  const ordinaryMiss=previewResolution({actor,target:initial,action:{type:'attack',attr:'CT',base:60,damage:4},roll:79,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['b','c'],engagedTargetRoll:80}},v5State:{participants:[actor,initial,ally]}});
  assert.equal(ordinaryMiss.engagedShot,null,'un échec même sans le Désavantage ne change pas de cible');
  const missingRoll=previewResolution({actor,target:initial,action:{type:'attack',attr:'CT',base:60,damage:4},roll:18,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['b','c']}},v5State:{participants:[actor,initial,ally]}});
  assert.ok(missingRoll.unresolved.some(row=>/d100/i.test(row)),'pas de cible remplacée sans aléa MJ capturé');
  const missingInitial=previewResolution({actor,target:initial,action:{type:'attack',attr:'CT',base:60,damage:4},roll:18,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['c'],engagedTargetRoll:80}},v5State:{participants:[actor,initial,ally]}});
  assert.ok(missingInitial.unresolved.some(row=>/cible initiale comprise/i.test(row)));
});

test('F2-B — mouvement déclaré efface Visée, ne consomme pas Action et pénalise le tir dans le Tour',async()=>{
  const {store}=await setup();const movement=await store.declareV5CombatMovement({actorId:'a'});assert.equal(movement.status,'applied');
  const shot=store.previewResolution({...hit('moved-shot'),action:{type:'attack',attr:'CT',base:60,damage:4},defense:undefined,v5:{kind:'ranged',context:{}}});
  assert.equal(shot.test.details.modifiers.find(row=>row.id==='movement:ranged')?.amount,-1);
  assert.equal(shot.ready,true,'déplacement ne consomme pas l’Action standard');
  assert.equal((await store.applyResolution(shot)).status,'applied');
});

test('F2-B — cible sans défense choisit librement le jet; touche auto seulement en mêlée/point blank',()=>{
  const actor=person('a'),target=person('b');
  const melee=previewResolution({actor,target,action:{type:'attack',attr:'CC',base:60,damage:4},roll:11,criticalRolls:{location:34,effect:20},v5:{kind:'melee',choice:'keep',context:{targetHelpless:true}}});
  assert.deepEqual(melee.unresolved,[]);assert.equal(melee.hit,true);assert.equal(melee.critical?.kind,'Critique','le jet choisi peut produire un critique');
  const pointBlank=previewResolution({actor,target,action:{type:'attack',attr:'CT',base:60,damage:4},roll:99,v5:{kind:'ranged',choice:'keep',context:{targetHelpless:true,shotRange:'point-blank'}}});
  assert.equal(pointBlank.hit,true);
  const long=previewResolution({actor,target,action:{type:'attack',attr:'CT',base:60,damage:4},roll:99,v5:{kind:'ranged',choice:'keep',context:{targetHelpless:true,shotRange:'long'}}});
  assert.equal(long.hit,false,'tir hors bout portant ne touche pas automatiquement');
});

test('F2-B — mort directe désactivée par défaut, éligibilité bornée, option et confirmation MJ requises puis Undo/reload',async()=>{
  const {store,persistence}=await setup();
  const base={...hit('lethal-default'),defense:undefined,v5:{kind:'melee',context:{targetHelpless:true}}};
  const ordinary=store.previewResolution(base);assert.equal(ordinary.ready,true);assert.equal(ordinary.lethalDeath,null);
  const intent=store.previewResolution({...base,resolutionId:'lethal-intent',v5:{kind:'melee',context:{targetHelpless:true,lethalIntent:true}}});
  assert.equal(intent.ready,false);assert.ok(intent.unresolved.some(row=>/option létale/i.test(row)));
  const noConfirmation=store.previewResolution({...base,resolutionId:'lethal-no-confirm',v5:{kind:'melee',context:{targetHelpless:true,lethalIntent:true,lethalTableEnabled:true}}});
  assert.equal(noConfirmation.ready,false);assert.ok(noConfirmation.unresolved.some(row=>/confirmation explicite/i.test(row)));
  const rangedIneligible=store.previewResolution({...base,resolutionId:'lethal-long-shot',action:{type:'attack',attr:'CT',base:60,damage:5},v5:{kind:'ranged',context:{targetHelpless:true,shotRange:'long',lethalIntent:true,lethalTableEnabled:true,confirmLethalDeath:true}}});
  assert.equal(rangedIneligible.ready,false);assert.ok(rangedIneligible.unresolved.some(row=>/bout portant/i.test(row)));
  const approved=store.previewResolution({...base,resolutionId:'lethal-confirmed',v5:{kind:'melee',context:{targetHelpless:true,lethalIntent:true,lethalTableEnabled:true,confirmLethalDeath:true}}});
  assert.equal(approved.ready,true);assert.deepEqual(approved.lethalDeath,{targetId:'b',confirmedBy:'explicit-gm',tableOptionEnabled:true});
  const applied=await store.applyResolution(approved);assert.equal(applied.status,'applied');assert.deepEqual(applied.resolution.lethalDeath.application,{hp:0,dead:true});
  assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').extensions.v5.dead,true);
  assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').hp,0);
  assert.equal(await store.undo(),true);assert.notEqual(persistence.read().combat.participants.find(row=>row.id==='b').extensions?.v5?.dead,true);
  const reload=createStore({persistence,storage:null});await reload.ready;assert.notEqual(reload.listParticipants().find(row=>row.id==='b').extensions?.v5?.dead,true);
});
});

describe('Modificateurs de combat', () => {
const subject = (id, extra = {}) => ({ id, name: id, camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const attack = ({ kind = 'ranged', actor = subject('a'), target = subject('b'), context = {}, actorSize, targetSize, defense, choice = 'keep',
  action = { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 60, damage: 4 }, ...extra } = {}) => previewResolution({
  actor, target, action, roll: 25, ...(defense ? { defense } : {}),
  v5: { kind, choice, actorSize, targetSize, context }, ...extra
});
const mods = preview => Object.fromEntries(preview.test.details.modifiers.map(row => [row.id, row.amount]));
const delta = (preview, base = attack()) => preview.test.sl - base.test.sl;

test('F2-B Claude 11-13 — facteurs anciens/nouveaux dédoublonnés, Sapeur et cible Moyenne implicite',()=>{
 const context={height:'defender',difficultTerrain:true,penalties:{belowTarget:-1,terrainMovement:-1}};
 const p=attack({kind:'melee',context});assert.equal(p.test.sl,attack({kind:'melee'}).test.sl-2);assert.equal(p.test.details.modifiers.filter(row=>row.amount<0).length,2);
 const sapper=subject('a',{talents:[{id:'talent-underminer',status:'resolved',rank:1}]});
 const sp=attack({kind:'melee',actor:sapper,context});assert.equal(mods(sp)['height:melee'],0);assert.equal(mods(sp)['terrain:melee'],-1,'Sapeur supprime la hauteur, pas le terrain (contrat existant)');
 const size=attack({actorSize:4});assert.equal(mods(size)['size:ranged-target'],-1);
});

test('F2-B Claude 16 — Pointue recalcule le palier attaquant et défenseur',()=>{
 const action={type:'attack',attr:'CC',base:60,damage:4,qualities:[{id:'pointue'}]};
 const p=attack({kind:'melee',action,roll:40,defense:{base:60,roll:40,qualities:[{id:'pointue'}],v5:{kind:'melee',choice:'keep'}}});
 assert.equal(p.sl,3);assert.equal(p.resultTier.id,'success-3-4');assert.equal(p.test.resultTier.id,'success-3-4');
 assert.equal(p.defenderResultTier.id,'success-1-2');assert.equal(p.defenderTest.resultTier.id,'success-1-2');
});

test('F2-B Claude 19 — États niveau zéro et sources inactives sont ignorés dans les deux lectures',()=>{
 for(const state of [{key:'surpris',level:0},{key:'surpris',level:1,source:{talentId:'talent-underminer',source:{effectHash:'obsolete'}}}]){
  const p=attack({kind:'melee',target:subject('b',{states:[state]}),defense:{base:40,roll:80,v5:{kind:'melee'}}});
  assert.equal(p.test.details.modifiers.some(row=>row.id==='target:surprised'),false);
  assert.ok(p.defenderTest,'aucune interdiction de défense via conditionLevels');
 }
});

test('F2-B Claude 19 — caractérisation conditionLevels hors modificateurs de combat',()=>{
 const before=subject('a',{extensions:{v5:{hasMomentum:true}}});
 const after={...before,states:[{key:'surpris',level:0},{key:'a-terre',level:1,source:{talentId:'talent-underminer',source:{effectHash:'obsolete'}}}]};
 assert.deepEqual([...conditionLevels(after)],[]);
 assert.equal(momentumAfterChange(before,after).extensions.v5.hasMomentum,true,'un état nul ou une source de talent périmée ne compte pas comme nouvelle condition globale');
});

test('F2-B Claude 20 — difficulté positive refusée et dispersion déduite du groupe Lancer',()=>{
 const actor=subject('a',{talents:[{id:'talent-sharpshooter',status:'resolved',rank:1}]});
 assert.ok(attack({actor,context:{extraordinaryShot:true,extraordinaryShotDescription:'ricochet',extraordinaryShotDifficulty:1}}).unresolved.some(row=>row.includes('inférieure ou égale à zéro')));
 const thrown=attack({roll:95,action:{type:'attack',attr:'CT',base:60,damage:4,category:'Lancer'},context:{scatterDirectionRoll:1,scatterDistanceRolls:[10,9],shooterTargetDistanceYards:7}});
 assert.equal(thrown.scatter.maximumYards,3.5);assert.equal(thrown.scatter.distanceYards,3.5);
});

test('F2-B — six circonstances de Tir sont additives et portent uniquement sur le Test d’attaque', () => {
  const preview = attack({ target: subject('b',{states:[{key:'surpris',level:1}]}), context: { penalties: { cover: -1 },
    shotRange: 'point-blank', weather:'rain-wind', lighting:'dim', movedBeforeRangedAttack:true, aimedTargetId: 'b' } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal(delta(preview), 1, 'bout portant +2, couvert -1, météo/lumière au niveau −2, mouvement −1, Surpris +2 (v3), Visée +1');
  assert.deepEqual(mods(preview), { 'penalty:cover': -1, 'range:point-blank': 2, 'weather-light:ranged': -2,
    'movement:ranged': -1, 'target:surprised-ranged': 2, 'aim:target': 1 });
  assert.equal(preview.defenderTest, null);
  const severe=attack({context:{weather:'rain-wind',lighting:'dark'}});
  assert.equal(mods(severe)['weather-light:ranged'],-3,'une seule pénalité environnementale au niveau le plus sévère');
  const proneTarget=attack({target:subject('b',{states:[{name:'À Terre',level:1}]}),context:{cover:true}});
  assert.equal(mods(proneTarget)['penalty:targetProne'],-1,'couvert et cible À Terre ne se cumulent pas');
  const inactive = attack({ context: { penalties: {} } });
  assert.equal(inactive.test.sl, attack().test.sl, 'aucune circonstance MJ ne s’invente');
});

test('F2-B — Tireur d’élite supprime le malus synthétique de couvert ou cible À Terre, sans fausse acquisition',()=>{
  const shooter=subject('a',{talents:[{id:'talent-sharpshooter',name:'Tireur d’élite',status:'resolved',rank:1}]});
  const prone=subject('b',{states:[{key:'prone',level:1}]});
  const actual=attack({actor:shooter,target:prone,context:{cover:true,shotRange:'medium'}});
  assert.equal(mods(actual)['penalty:targetProne'],0,'le vrai talent annule la pénalité de cible À Terre/couvert');
  const absent=attack({target:prone,context:{cover:true,shotRange:'medium'}});
  assert.equal(mods(absent)['penalty:targetProne'],-1,'sans acquisition, le malus p.166 reste appliqué une fois');
});

test('F2-B — Tir extraordinaire exige le vrai Tireur d’élite, une difficulté et une description MJ reçues',()=>{
  const base={extraordinaryShot:true,extraordinaryShotDescription:'ligne de tir presque impossible',extraordinaryShotDifficulty:-4};
  const shooter=subject('a',{talents:[{id:'talent-sharpshooter',name:'Tireur d’élite',status:'resolved',rank:1}]});
  const valid=attack({actor:shooter,context:base});
  assert.deepEqual(valid.unresolved,[]);assert.equal(mods(valid)['talent:sharpshooter-extraordinary'],-4);
  assert.deepEqual(valid.extraordinaryShot,{talentId:'talent-sharpshooter',description:base.extraordinaryShotDescription,difficulty:-4});
  const noTalent=attack({context:base});assert.ok(noTalent.unresolved.some(row=>/acquis et actif/.test(row)));
  const missingFact=attack({actor:shooter,context:{extraordinaryShot:true}});
  assert.ok(missingFact.unresolved.some(row=>/description MJ/.test(row)));assert.ok(missingFact.unresolved.some(row=>/difficulté en DR/.test(row)));
});

test('F2-B — Taille du tir applique Monstrueuse +2 seule et les autres rangs relatifs', () => {
  assert.equal(delta(attack({ actorSize: 3, targetSize: 4 })), 1);
  assert.equal(delta(attack({ actorSize: 3, targetSize: 5 })), 1);
  assert.equal(delta(attack({ actorSize: 6, targetSize: 6 })), 2, 'B-SIZE-01: cible Monstrueuse +2 même si le tireur l’est aussi');
  assert.equal(delta(attack({ actorSize: 3, targetSize: 6 })), 2, 'pas de cumul +1 taille supérieure et +2 Monstrueuse');
  assert.equal(delta(attack({ actorSize: 4, targetSize: 3 })), -1);
  assert.equal(delta(attack({ actorSize: 3, targetSize: 3 })), 0);
});

test('F2-B — Portées courte, moyenne, longue, extrême et bout portant suivent la portée MJ et exposent les aides d’allonge/portée', () => {
  const range = band => delta(attack({ context: { shotRange: band, weaponRangeYards: 20 } }));
  assert.deepEqual(['point-blank', 'short', 'medium', 'long', 'extreme'].map(range), [2, 1, 0, -1, -2]);
  const withBands = attack({ context: { shotRange: 'long', weaponRangeYards: 20 } });
  assert.equal(withBands.unresolved.length, 0, 'bande déclarée par le MJ suffit au DR');
  assert.deepEqual(withBands.rangeBands, { printedYards: 20, pointBlankYards: 4, shortYards: 10, mediumYards: 20, longYards: 40, extremeYards: 60 });
  const sbBands = attack({ actor: subject('a', { caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40 } }), action: { type: 'attack', attr: 'CT', base: 60, damage: 4, range: 'BF × 3' }, context: { shotRange: 'short' } });
  assert.equal(sbBands.rangeBands?.printedYards, 12);
  assert.equal(sbBands.rangeBands?.shortYards, 6);
  const veryLong = attack({ kind: 'melee', context: { weaponReach: 'Très longue' } });
  assert.equal(veryLong.reachGuide?.engagementYards, 4);
  const massive = attack({ kind: 'melee', context: { weaponReach: 'Massive' } });
  assert.equal(massive.reachGuide?.engagementYards, 6);
  const sniper = subject('a', { talents: [{ id: 'talent-sniper', name: 'Franc-tireur', status: 'resolved', rank: 1 }] });
  const sniperLong = attack({ actor: sniper, context: { shotRange: 'long', penalties: { longRange: -1 } } });
  assert.equal(mods(sniperLong)['range:long'], 0, 'Franc-tireur supprime longue portée sans double pénalité');
  assert.equal(mods(sniperLong)['penalty:longRange'], undefined);
});

test('F2-B — Mêlée cumule Surprise, hauteur, infériorité, Enchevêtré, terrain et espace exigu sans doubler B12', () => {
  const actor=subject('a'), target=subject('b', { states: [{ key: 'surpris', level: 1 }, { key: 'enchevetre', level: 1 }] });
  const ally=subject('ally',{camp:'pj'});
  const preview = attack({ kind: 'melee', actor, target,
    context: { difficultTerrain: true, narrowSpace: true, weaponReachBand:'superior', height: 'attacker', outnumberAttackerIds:['ally'] },
    v5State: { participants:[actor,target,ally] } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.test.sl, 6, 'surnombre B12 conservé une fois; les autres facteurs applicables s’ajoutent');
  assert.equal(mods(preview)['target-surprised'], 2);
  assert.equal(preview.test.advantage.net >= 0, true);
  const noNarrowChoice = attack({ kind: 'melee', context: { confinedSpace: true, narrowSpace: true } });
  assert.ok(noNarrowChoice.unresolved.some(row => /allonge/i.test(row)));
  const shortReach=attack({kind:'melee',defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep'}},context:{narrowSpace:true,weaponReachBand:'short'}});
  assert.deepEqual(shortReach.unresolved,[]);assert.equal(shortReach.test.details.modifiers.some(row=>row.id==='confined:melee'),false);
  const enclosed=subject('a',{talents:[{id:'talent-enclosed-fighter',name:'Combattant en espace clos',status:'resolved',rank:1}]});
  const enclosedSuperior=attack({kind:'melee',actor:enclosed,context:{narrowSpace:true,weaponReachBand:'superior',penalties:{confined:-2}}});
  assert.equal(mods(enclosedSuperior)['confined:melee'],0,'Combattant en espace clos supprime le malus d’espace exigu sans doublon');
  const ambidextrous=subject('a',{talents:[{id:'talent-ambidextrous',name:'Ambidextre',status:'resolved',rank:1}]});
  assert.equal(mods(attack({kind:'melee',actor:ambidextrous,context:{secondWeaponAttack:true}}))['penalty:offHand'],0);
});

test('F2-B — attaques de Traits de créature reçoivent les modificateurs F2-B et les états inactifs/niveau 0 sont ignorés', () => {
  const creature = subject('a', { traits: [{ key: 'arme', name: 'Arme +7' }, { key: 'taille', name: 'Taille (Grande)' }] });
  const target = subject('b', { states: [{ key: 'surpris', level: 0 }, { key: 'enchevetre', level: 1 }, { key: 'aterre', level: 1, source: { talentId: 'talent-frenzy', source: { effectHash: 'sha256:expired' } } }] });
  const natural = attack({ kind: 'melee', actor: creature, target, context: { height: 'attacker', difficultTerrain: true } });
  assert.equal(mods(natural)['target:entangled'], 1);
  assert.equal(mods(natural)['height:melee'], 1);
  assert.equal(mods(natural)['terrain:melee'], -1);
  assert.equal(mods(natural)['target-surprised'], undefined, 'état de niveau 0 ignoré');
});

test('F2-B — attaquant À Terre garde son Désavantage et reçoit le −1 DR du tableau; défense hors rôle', () => {
  const prone = subject('a', { states: [{ key: 'aterre', level: 1 }] });
  const preview = attack({ kind: 'melee', actor: prone, choice:'reverse', defense: { base: 40, roll: 80, label: 'Esquive', v5: { kind: 'test' } } });
  assert.equal(preview.test.advantage.net, -1);
  assert.equal(mods(preview)['penalty:proneAttack'], -1);
  assert.equal(preview.defenderTest.details.modifiers.some(row=>row.id==='penalty:proneAttack'), false,
    'aucun modificateur d’attaque n’est copié sur la défense');
});

test('F2-B — les huit paliers distinguent succès +0 de l’échec −0', () => {
  const cases = [[60, 10, 'success-5-plus'], [60, 20, 'success-3-4'], [60, 40, 'success-1-2'],
    [60, 60, 'success-zero'], [60, 61, 'failure-zero'], [60, 70, 'failure-1-2'], [60, 90, 'failure-3-4'], [40, 90, 'failure-5-minus']];
  for (const [score, roll, tier] of cases) {
    const preview = attack({ action: { type: 'attack', attr: 'CT', base: score, damage: 1 }, roll });
    assert.equal(preview.test.resultTier?.id, tier, `${score}/${roll}`);
  }
});

test('F2-B — dispersion uniquement pour le Tir d’arme de jet raté, avec d10 relatif et demi-distance plafonnée',()=>{
  const failed=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:1,scatterDistanceRolls:[10,9],shooterTargetDistanceYards:7}});
  assert.deepEqual(failed.unresolved,[]);assert.deepEqual(failed.scatter,{directionRoll:1,direction:'haut-gauche',distanceRolls:[10,9],distanceYards:3.5,rolledDistanceYards:19,maximumYards:3.5});
  const shooter=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:9}});assert.equal(shooter.scatter.direction,'aux pieds du tireur');
  const target=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:10}});assert.equal(target.scatter.direction,'aux pieds de la cible');
  const missing=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:1,scatterDistanceRolls:[3,4]}});assert.ok(missing.unresolved.some(row=>/distance tireur-cible/i.test(row)));
  const nonThrow=attack({roll:99,context:{scatterDirectionRoll:1,scatterDistanceRolls:[3,4],shooterTargetDistanceYards:12}});assert.equal(nonThrow.scatter,null);
});
});

describe('Incident de salve', () => {
const weapon={id:'salvo-gun',name:'Arquebuse à salve',kind:'weapon',category:'Engineering',damage:4,keywords:[{id:'a-poudre-noire'},{id:'salve',parameter:'4'},{id:'recharge',parameter:'4'}]};
const person=(id,camp='hero')=>({id,name:id,kind:'PNJ',camp,zone:'active',hp:20,maxHp:20,initiative:id==='gunner'?20:10,caracs:{CC:50,CT:50,F:40,E:30,Ag:40,I:30},skills:[],states:[],armor:{head:0,body:0,arms:0,legs:0},equipment:[],extensions:{v5:{}}});
async function setup(context,trigger=99){
  const store=createStore();await store.ready;
  const gunner={...person('gunner'),equipment:[structuredClone(weapon)]},crew=person('crew'),victim=person('victim','enemy');
  await store.addParticipant(gunner);await store.addParticipant(crew);await store.addParticipant(victim);store.setRoundTurn(1,'gunner');
  const preview=store.previewResolution({resolutionId:'salvo-incident',actorId:'gunner',targetId:'victim',action:{type:'attack',base:50,attr:'CT',damage:4,note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}}},roll:trigger,v5:{kind:'ranged',context:{crewCount:2,blackpowderStockInitial:{confirmed:true,projectiles:8,powderCharges:8},recoilTestBase:60,recoilTestRoll:30,...context}}});
  return{store,preview};
}
const crewContext=(roll,extra={})=>({powderIncidentRoll:1,salvoIncidentRoll:roll,salvoCrewIds:['crew'],salvoUnitsRoll:2,...extra});

test('T2 bis Salve p.126 : les résultats 1–4 appliquent le bras principal et leur dé-unité, puis Undo restaure l’état',async()=>{
  const {store,preview}=await setup(crewContext(4,{salvoPrimaryArms:{crew:'left'}}));assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  assert.equal(preview.combatFailure.misfire.outcome.id,'misfire');assert.equal(preview.combatFailure.misfire.salvo.table,'salvo-artillery');assert.equal(preview.combatFailure.effects.find(row=>row.type==='salvo-hit')?.location,'left');
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied',JSON.stringify(applied));assert.equal(store.getCombat().participants.get('crew').hp,17);assert.equal(store.getCombat().participants.get('gunner').equipment[0].extensions.v5.destroyed,true);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('crew').hp,20);assert.equal(store.getCombat().participants.get('gunner').equipment[0].extensions?.v5?.destroyed,undefined);
});

test('T2 bis Salve p.126 : les résultats 5–7 appliquent une localisation choisie par le MJ à chaque servant',async()=>{
  const {store,preview}=await setup(crewContext(6,{salvoLocations:{crew:['right-leg']}}));assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  assert.equal(preview.combatFailure.effects.find(row=>row.type==='salvo-hit')?.location,'right-leg');
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('crew').hp,17);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('crew').hp,20);
});

test('T2 bis Salve p.126 : les résultats 8–9 appliquent chaque point restant à tous les servants',async()=>{
  const {store,preview}=await setup(crewContext(8,{remainingSalvo:2,salvoLocations:{crew:['head','left-leg']}}));assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  assert.equal(preview.combatFailure.effects.filter(row=>row.type==='salvo-hit').length,2);
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('crew').hp,14);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('crew').hp,20);
});

test('T2 bis Salve p.126 : résultat 10 demande les trajectoires et applique seulement les Esquives ratées',async()=>{
  const base={powderIncidentRoll:1,salvoIncidentRoll:10,remainingSalvo:2,salvoTrajectories:[
    {direction:'nord-est',distanceRoll:30,personsConfirmed:true,targets:[{participantId:'victim',location:'body',dodge:{base:60,roll:50}}]},
    {direction:'sud',distanceRoll:80,personsConfirmed:true,targets:[{participantId:'crew',location:'left',dodge:{base:60,roll:30}}]}
  ]};
  const {store,preview}=await setup(base,100);assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  const hits=preview.combatFailure.effects.filter(row=>row.type==='salvo-hit');assert.deepEqual(hits.map(row=>row.targetId),['victim']);assert.equal(hits[0].trajectory.distanceYards,30);assert.equal(preview.combatFailure.effects.some(row=>row.type==='salvo-artillery-destroyed'),false);
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('victim').hp,19);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('victim').hp,20);
});

test('T2 bis Salve p.126 : pas de dégâts avant la saisie des servants, localisations, trajectoires et esquives',async()=>{
  const cases=[{powderIncidentRoll:1},crewContext(1),crewContext(5),crewContext(8,{remainingSalvo:2}),{powderIncidentRoll:1,salvoIncidentRoll:10,remainingSalvo:1}];
  for(const context of cases){const {preview}=await setup(context);assert.equal(preview.ready,false);assert.ok(preview.unresolved.some(line=>line.includes('Incident de Salve')),preview.unresolved?.join('\n'));assert.equal(preview.combatFailure.effects.some(row=>row.type==='salvo-hit'),false);}
});

test('T2 bis Salve p.126 : l’incident catastrophe est appliqué avant le second d10 Salve, avec Undo des deux effets',async()=>{
  const trajectory={direction:'ouest',distanceRoll:25,personsConfirmed:true,targets:[{participantId:'victim',location:'body',dodge:{base:60,roll:50}}]};
  const {store,preview}=await setup({powderIncidentRoll:9,weaponExplosionArmSide:'right',salvoIncidentRoll:10,remainingSalvo:1,salvoTrajectories:[trajectory]},100);
  assert.equal(preview.ready,true,preview.unresolved?.join('\n'));assert.equal(preview.combatFailure.misfire.outcome.id,'catastrophe');assert.equal(preview.combatFailure.misfire.salvo.outcome.id,'remaining-salvo-random-direction');
  assert.ok(preview.combatFailure.effects.some(row=>row.type==='weapon-explosion'&&row.targetId==='gunner'));assert.ok(preview.combatFailure.effects.some(row=>row.type==='salvo-hit'&&row.targetId==='victim'));
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('gunner').hp,19);assert.equal(store.getCombat().participants.get('victim').hp,19);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('gunner').hp,20);assert.equal(store.getCombat().participants.get('victim').hp,20);
});
});

describe('Mots-cles', () => {
test('Keywords — Normalisation des slugs', () => {
  assert.equal(slugify('Poudre Noire'), 'poudre-noire');
  assert.equal(slugify('Explosion X'), 'explosion');
  assert.equal(slugify('Percutante (Impact)'), 'percutante-impact');
  assert.equal(slugify('Épuisante'), 'epuisante');
});

test('Keywords — Parsing CSV Google Sheets', () => {
  const sampleCSV = `"Mot Clé","Effet"\n"Poudre Noire","Oblige à tester le Sang-Froid."\n"Taille X","Réduit l'armure de X."`;
  const parsed = parseCSV(sampleCSV);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].slug, 'poudre-noire');
  assert.equal(parsed[1].hasRating, true);
});

test('Keywords — Instantané local de repli (Fallback)', () => {
  const list = getKeywordList();
  assert.ok(list.length >= 25);
  assert.ok(list.some(k => k.slug === 'percutante'));
});

test('Keywords — Calcul des dégâts Palier 1 (Percutante & Dévastatrice)', () => {
  // 1. Jet de 35 (unité = 5), SL = 2, arme 4, cible PA = 2, BE = 3
  // Sans percutante: 4 + 2 - (3 + 2) = 1
  const res1 = computeDamage({ weaponDamage: 4, sl: 2, roll: 35, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  assert.equal(res1.finalDamage, 1);

  // Avec percutante: 4 + 5 (dé d'unités) + 2 - (3 + 2) = 6
  const res2 = computeDamage({ weaponDamage: 4, sl: 2, roll: 35, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'percutante' }] });
  assert.equal(res2.bonusPercutante, 5);
  assert.equal(res2.finalDamage, 6);

  // Avec dévastatrice et SL = 1, jet 38 (unité = 8) -> utilise SL effectif = 8
  const res3 = computeDamage({ weaponDamage: 4, sl: 1, roll: 38, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'devastatrice' }] });
  assert.equal(res3.sl, 8);
});

test('Keywords — Calcul des dégâts Palier 1 (Pointue, Imprécise & Inoffensive)', () => {
  // Pointue et Imprécise agissent sur le DR du test, pas sur les dégâts de l'arme
  assert.equal(computeDamage({ weaponDamage: 5, sl: 2, qualities: [{ id: 'pointue' }] }).weaponDamage, 5);
  assert.equal(computeDamage({ weaponDamage: 5, sl: 2, qualities: [{ id: 'imprecise' }] }).weaponDamage, 5);

  // Inoffensive (PA x 2, plancher 0)
  const resInof = computeDamage({ weaponDamage: 2, sl: 0, targetArmour: 2, qualities: [{ id: 'inoffensive' }] });
  assert.equal(resInof.paEffectif, 4);
  assert.equal(resInof.finalDamage, 0);
});
});

describe('Fondations V5', () => {
const origins = n => Array.from({ length: n }, (_, i) => ({ id: `origin-${i}` }));
const selected = input => selectV5Test(previewV5Test(input), 'keep');

test('V5: optional inversion keeps both choices and never chooses for the player', () => {
  const p = previewV5Test({ score: 70, roll: 42, kind: 'ranged', advantageSources: origins(1) });
  assert.equal(p.choiceRequired, true);
  assert.deepEqual(p.options.map(x => [x.id, x.result.roll, x.result.sl]), [['keep', 42, 3], ['reverse', 24, 5]]);
  assert.equal(selectV5Test(p, 'keep').initialRoll, 42);
  assert.equal(selectV5Test(p, 'reverse').reversed, true);
  assert.throws(() => selectV5Test(p, 'unavailable'));
});
test('V5: disadvantage reverses only when worse', () => {
  const p = previewV5Test({ score: 50, roll: 19, disadvantageSources: origins(1) });
  assert.equal(p.choiceRequired, false); assert.equal(p.forcedInversion, true);
  assert.equal(p.options[0].result.roll, 91); assert.equal(p.options[0].result.success, false);
  assert.throws(() => selectV5Test(p, 'keep'));
  assert.equal(previewV5Test({ score: 50, roll: 91, disadvantageSources: origins(1) }).options[0].result.roll, 91);
});
for (const [a, d, expected] of [[3, 1, 1], [1, 3, -1], [2, 2, 0], [3, 0, 2], [0, 3, -2]]) {
  test(`V5: ${a} advantage and ${d} disadvantage cancel one for one`, () => {
    assert.equal(summarizeV5Advantage({ advantageSources: origins(a), disadvantageSources: origins(d) }).slModifier, expected);
  });
}
test('V5: a double stays unchanged while extra sources still modify DR', () => {
  const p = previewV5Test({ score: 70, roll: 44, kind: 'ranged', advantageSources: origins(3) });
  assert.equal(p.options.length, 1); assert.equal(p.options[0].result.roll, 44);
  assert.equal(p.options[0].result.sl, 5); assert.equal(p.options[0].result.critical, true);
});
test('V5: same advantage source counted only once', () => {
  assert.equal(summarizeV5Advantage({ advantageSources: [{ id: 'talent-x' }, { id: 'talent-x' }] }).net, 1);
});
test('V5: DR difficulty can turn failure into success without changing skill', () => {
  const r = selected({ score: 48, roll: 70, slModifiers: [{ id: 'difficulty', amount: 4 }] });
  assert.equal(r.score, 48); assert.equal(r.sl, 1); assert.equal(r.success, true);
});
test('V5: signed zero survives JSON and distinguishes the original comparison', () => {
  const a = selected({ score: 48, roll: 49 });
  const b = selected({ score: 48, roll: 47 });
  assert.equal(a.sl, 0); assert.equal(a.success, false); assert.equal(a.zeroOutcome, 'marginalFailure');
  assert.equal(b.sl, 0); assert.equal(b.success, true); assert.equal(b.zeroOutcome, 'marginalSuccess');
  assert.equal(JSON.parse(JSON.stringify(a)).zeroOutcome, 'marginalFailure');
});
for (const roll of [1, 5]) test(`V5: ${roll} remains success despite severe penalties`, () => {
  const r = selected({ score: 0, roll, slModifiers: [{ id: 'difficulty', amount: -20 }] });
  assert.equal(r.success, true); assert.equal(r.sl, 0);
});
for (const roll of [96, 99, 100]) test(`V5: ${roll} remains failure despite very high score and bonus`, () => {
  const r = selected({ score: 150, roll, kind: 'ranged', slModifiers: [{ id: 'difficulty', amount: 20 }] });
  assert.equal(r.success, false); assert.equal(r.sl, 0); assert.equal(r.zeroOutcome, 'marginalFailure');
});
test('V5: 00 is 100 and cannot be reversed to zero', () => {
  assert.equal(reverseV5Roll('00'), 100); assert.equal(reverseV5Roll(10), 1);
  assert.equal(previewV5Test({ score: 40, roll: '00', advantageSources: origins(1) }).options.length, 1);
});
test('V5: skill criticals adjust SL, attack criticals preserve their SL', () => {
  assert.equal(selected({ score: 48, roll: 33 }).sl, 5);
  assert.equal(selected({ score: 48, roll: 33, kind: 'melee' }).sl, 1);
  assert.equal(selected({ score: 48, roll: 55 }).sl, -5);
  assert.equal(selected({ score: 48, roll: 55, kind: 'ranged' }).sl, -1);
});
test('V5: opposition is won on negative DR and tie belongs to the initiator', () => {
  assert.equal(resolveV5Opposition({ sl: -1 }, { sl: -4 }).netSl, 3);
  assert.equal(resolveV5Opposition({ sl: -2 }, { sl: -2 }).winner, 'initiator');
});
test('V5: strict invalid inputs and owned frozen outputs', () => {
  for (const roll of [0, 101, 1.5, NaN, 'bad']) assert.throws(() => previewV5Test({ score: 40, roll }));
  assert.throws(() => previewV5Test({ score: NaN, roll: 20 }));
  assert.throws(() => previewV5Test({ score: 40, roll: 20, slModifiers: [{ id: 'x', amount: Infinity }] }));
  const input = { score: 70, roll: 42, advantageSources: [{ id: 'x', label: 'Talent' }] };
  const before = structuredClone(input); const p = previewV5Test(input);
  assert.deepEqual(input, before); assert.throws(() => { p.options[0].result.roll = 1; });
  input.advantageSources[0].label = 'changed'; assert.equal(p.advantage.advantage[0].label, 'Talent');
});
test('Momentum: win in attack/defense or charge grants one binary state', () => {
  for (const type of ['opposedMeleeWon', 'chargeEnemy']) {
    assert.equal(previewMomentumEvents({ hasMomentum: false, events: [{ id: '1', type }] }).after, true);
    assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type }] }).after, true);
  }
});
for (const type of ['opposedMeleeLost', 'meleeTestFailed', 'combatPause', 'combatEnd']) test(`Momentum: ${type} removes it`, () => {
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type }] }).after, false);
});
test('Momentum: zero actual wounds or prevented state do not cause loss', () => {
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'woundsLost', amount: 0 }] }).after, true);
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'conditionAcquired', instances: 0 }] }).after, true);
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'woundsLost', amount: 1 }] }).after, false);
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'conditionAcquired', instances: 1 }] }).after, false);
});
test('Momentum: conservation covers only its declared reason; later wounds still remove it', () => {
  const input = { hasMomentum: true, events: [{ id: '1', type: 'opposedMeleeLost' }, { id: '2', type: 'woundsLost', amount: 1 }],
    exceptions: [{ talentId: 'talent-reversal', reason: 'oppositionLost', applies: true }] };
  const before = structuredClone(input); const p = previewMomentumEvents(input);
  assert.equal(p.details[0].after, true); assert.equal(p.after, false); assert.deepEqual(input, before);
});
test('Momentum: an extra paid attack consumes both state and its payment quota', () => {
  const p = previewMomentumCost({ hasMomentum: true, paidExtraAttackUsedThisTurn: false, extraAttack: true });
  assert.equal(p.allowed, true); assert.equal(p.nextMomentum, false); assert.equal(p.nextPaidExtraAttackUsedThisTurn, true);
  assert.equal(previewMomentumCost({ hasMomentum: true, paidExtraAttackUsedThisTurn: true, extraAttack: true }).reason, 'paidExtraAttackLimit');
});
test('Momentum: waived cost does not require Momentum or consume the payment quota', () => {
  const p = previewMomentumCost({ hasMomentum: false, paidExtraAttackUsedThisTurn: true, extraAttack: true, waived: true });
  assert.equal(p.allowed, true); assert.equal(p.cost, null); assert.equal(p.nextMomentum, false);
  assert.equal(p.otherAbilityQuotasMustBeChecked, true);
});
test('Momentum: invalid or duplicated events rejected', () => {
  assert.throws(() => previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'unknown' }] }));
  assert.throws(() => previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'woundsLost', amount: -1 }] }));
  assert.throws(() => previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'combatEnd' }, { id: '1', type: 'combatEnd' }] }));
});
const shotPreview = () => previewV5Test({ score: 70, roll: 42, kind: 'ranged', advantageSources: origins(1) });
const shot = r => ({ certainty: 'complete', hit: r.success, location: r.roll === 42 ? 'Bras gauche' : 'Bras droit',
  woundsLost: Math.max(1, 6 + r.sl - 3 - (r.roll === 42 ? 1 : 5)), costs: [], importantEffects: [] });
test('Decision: best DR hits better armour; recommend more actual wounds, not lower roll', () => {
  const p = buildV5RollDecision(shotPreview(), { evaluateOutcome: shot, baseRevision: 3 });
  assert.deepEqual(p.options.map(x => [x.summary.roll, x.summary.sl, x.summary.woundsLost]), [[42, 3, 5], [24, 5, 3]]);
  assert.equal(p.recommendation.optionId, 'keep'); assert.equal(p.recommendation.label, 'Plus de Blessures');
  assert.equal(p.presentation.detailsInitiallyCollapsed, true);
  const chosen = selectV5Decision(p, 'reverse', { currentRevision: 3 });
  assert.equal(chosen.result.test.roll, 24); assert.equal(chosen.summary.woundsLost, 3);
});
test('Decision: incomplete or tied outcomes do not invent a recommendation', () => {
  const unknown = buildV5RollDecision(shotPreview(), { evaluateOutcome: r => ({ ...shot(r), certainty: 'partial' }), baseRevision: 3 });
  assert.equal(unknown.recommendation, null);
  const same = buildV5RollDecision(shotPreview(), { evaluateOutcome: r => ({ ...shot(r), woundsLost: 4 }), baseRevision: 3 });
  assert.equal(same.recommendation, null); assert.equal(same.equivalentKnownWounds, true);
});
test('Decision: evaluate both with the shared callback, keep details out of the summary, reject stale selection', () => {
  const seen = []; const p = buildV5RollDecision(shotPreview(), { evaluateOutcome: r => { seen.push(r.roll); return shot(r); }, baseRevision: 3 });
  assert.deepEqual(seen, [42, 24]); assert.equal(Object.hasOwn(p.options[0].summary, 'details'), false);
  assert.throws(() => selectV5Decision(p, 'keep', { currentRevision: 4 }));
  assert.throws(() => selectV5Decision(p, 'invalid', { currentRevision: 3 }));
});
test('Decision: no implicit randomness and invalid result information rejected', () => {
  const initialRandom = Math.random; Math.random = () => { throw new Error('unexpected draw'); };
  try { assert.equal(buildV5RollDecision(shotPreview(), { evaluateOutcome: shot, baseRevision: 0 }).options.length, 2); }
  finally { Math.random = initialRandom; }
  assert.throws(() => buildV5RollDecision(shotPreview(), { evaluateOutcome: () => ({ hit: true, woundsLost: 4 }), baseRevision: 0 }));
  assert.throws(() => buildV5RollDecision(shotPreview(), { evaluateOutcome: r => ({ ...shot(r), woundsLost: NaN }), baseRevision: 0 }));
});

test('V5: a DR origin cannot be silently counted twice', () => {
  assert.throws(() => previewV5Test({ score: 50, roll: 30, slModifiers: [{ id: 'same', amount: 1 }, { id: 'same', amount: 1 }] }), /dupliquée/);
});
test('Decision: the comparison is immutable and retains a copy of resolver output', () => {
  const output = { certainty: 'complete', hit: true, location: 'Arm', woundsLost: 3, costs: [], importantEffects: [] };
  const p = buildV5RollDecision(shotPreview(), { evaluateOutcome: () => output, baseRevision: 0 });
  output.woundsLost = 100; output.costs.push('changed');
  assert.equal(p.options[0].details.action.woundsLost, 3);
  assert.deepEqual(p.options[0].summary.costs, []);
  assert.throws(() => { p.options[0].summary.woundsLost = 100; });
});
});

describe('Qualites de jet', () => {
// Moteurs de mots-clés agissant sur le jet (palier 1 du §13.4).
// Ces trois-là étaient déclarés dans ENGINES mais consommés nulle part : le jet
// n'en tenait aucun compte, ils se réduisaient à des pastilles informatives.

test('Précise — +10 au score cible', () => {
  assert.equal(applyTargetBonus(45, [{ id: 'precise' }]).target, 55);
  assert.equal(applyTargetBonus(45, [{ id: 'precise' }]).bonus, 10);
  assert.equal(applyTargetBonus(45, []).target, 45, 'sans la qualité, score inchangé');
  assert.equal(applyTargetBonus(45, []).bonus, 0);
});

test('Précise — jamais de score négatif, et libellé accentué toléré', () => {
  assert.equal(applyTargetBonus(0, [{ id: 'Précise' }]).target, 10, 'slug dérivé du libellé');
  assert.equal(applyTargetBonus(-5, []).target, 0, 'borné à zéro');
});

test('Précise — ne s\'applique pas deux fois si le mot-clé est répété', () => {
  const r = applyTargetBonus(45, [{ id: 'precise' }, { id: 'precise' }]);
  assert.equal(r.target, 55, 'dédoublonné par slug');
});

test('Empaleuse — critique élargi aux multiples de 10, sur réussite', () => {
  // sans la qualité : seul le double est critique
  assert.equal(isCriticalRoll(30, isDouble(30), []).critique, false);
  assert.equal(isCriticalRoll(33, isDouble(33), []).critique, true, '33 est un double');

  // avec la qualité : 30 devient critique
  const r = isCriticalRoll(30, isDouble(30), [{ id: 'empaleuse' }]);
  assert.equal(r.critique, true);
  assert.equal(r.élargi, true, 'signalé comme dû au mot-clé');

  // un double reste un critique normal, pas « élargi »
  assert.equal(isCriticalRoll(33, isDouble(33), [{ id: 'empaleuse' }]).élargi, false);

  // un jet quelconque reste non critique
  assert.equal(isCriticalRoll(37, isDouble(37), [{ id: 'empaleuse' }]).critique, false);
});

test('Empaleuse — 100 reste un double (décision §6.6) et 10 est un multiple de 10', () => {
  assert.equal(isCriticalRoll(100, isDouble(100), []).critique, true, '00 compte comme double');
  assert.equal(isCriticalRoll(10, isDouble(10), [{ id: 'empaleuse' }]).critique, true);
});

test('Dangereuse — maladresse sur tout jet raté comportant un 9', () => {
  // sans la qualité : seul le double
  assert.equal(isFumbleRoll(91, isDouble(91), []).maladresse, false);
  assert.equal(isFumbleRoll(99, isDouble(99), []).maladresse, true, '99 est un double');

  // avec la qualité : le 9 en dizaine suffit
  const dizaine = isFumbleRoll(91, isDouble(91), [{ id: 'dangereuse' }]);
  assert.equal(dizaine.maladresse, true);
  assert.equal(dizaine.élargi, true);

  // le 9 en unité aussi
  assert.equal(isFumbleRoll(49, isDouble(49), [{ id: 'dangereuse' }]).maladresse, true);

  // aucun 9 : pas de maladresse
  assert.equal(isFumbleRoll(42, isDouble(42), [{ id: 'dangereuse' }]).maladresse, false);
});

test('Dangereuse — 100 ne contient pas de 9', () => {
  assert.equal(isFumbleRoll(100, false, [{ id: 'dangereuse' }]).maladresse, false);
});

test('activeEngines — dédoublonne les alias et ignore l\'inconnu', () => {
  // impact est un alias de percutante : un seul moteur doit ressortir
  const e = activeEngines([{ id: 'percutante' }, { id: 'impact' }]);
  const moteurs = new Set(e.map(x => x.engine));
  assert.equal(moteurs.size, 1, 'percutante et impact portent le même moteur');

  assert.deepEqual(activeEngines([{ id: 'nawak' }]), [], 'mot-clé inconnu ignoré');
  assert.deepEqual(activeEngines(null), [], 'entrée invalide tolérée');
  assert.deepEqual(activeEngines(['precise']).map(x => x.id), ['precise'], 'chaîne acceptée');
});

test('Pointue — +1 DR sur une réussite seulement', () => {
  assert.deepEqual(applyAttackSl(3, true, [{ id: 'pointue' }]), { sl: 4, bonus: 1 });
  assert.deepEqual(applyAttackSl(-2, false, [{ id: 'pointue' }]), { sl: -2, bonus: 0 });
  assert.deepEqual(applyAttackSl(3, true, []), { sl: 3, bonus: 0 });
});

test('Imprécise — −1 DR sur réussite comme sur échec', () => {
  assert.deepEqual(applyAttackSl(3, true, [{ id: 'imprecise' }]), { sl: 2, bonus: -1 });
  assert.deepEqual(applyAttackSl(-2, false, [{ id: 'imprecise' }]), { sl: -3, bonus: -1 });
});

test('Pointue + Imprécise — Imprécise l’emporte', () => {
  assert.deepEqual(applyAttackSl(3, true, [{ id: 'pointue' }, { id: 'imprecise' }]), { sl: 2, bonus: -1 });
});

test('Pointue / Imprécise — effet sur un test opposé et sur les Dégâts (previewResolution)', () => {
  const actor = { id: 'a', name: 'A', caracs: { F: 30 }, states: [] };
  const target = { id: 't', name: 'T', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const run = (qualities, roll = 43, defense = { roll: 35, base: 40 }) => previewResolution({
    actor, target, roll, defense, action: { type: 'attack', base: 50, damage: 4, qualities }
  });
  const plain = run([]);
  const pointue = run(['Pointue']);
  const imprecise = run(['Imprécise']);
  assert.equal(pointue.slBonus, 1);
  assert.equal(pointue.sl, plain.sl + 1);
  assert.equal(pointue.opposition.netSl, plain.opposition.netSl + 1);
  assert.equal(pointue.damage.sl, plain.damage.sl + 1);
  assert.equal(pointue.damage.finalDamage, plain.damage.finalDamage + 1);
  assert.equal(imprecise.opposition.netSl, plain.opposition.netSl - 1);
  assert.equal(imprecise.success, plain.success, 'la réussite ne change pas');
  // Échec propre : Pointue sans effet, Imprécise −1
  assert.equal(run(['Pointue'], 90).sl, run([], 90).sl);
  assert.equal(run(['Imprécise'], 90).sl, run([], 90).sl - 1);
  // Non-attaque : aucun effet
  const skill = previewResolution({ actor, roll: 30, action: { type: 'skill', base: 60, qualities: ['Pointue'] } });
  assert.equal(skill.slBonus, 0);
});
});

describe('Etats', () => {
test('parseState', () => {
  assert.deepEqual(parseState('Sonné'), { name: 'Sonné', turns: null });
  assert.deepEqual(parseState('Hémorragique|3'), { name: 'Hémorragique', turns: 3 });
  assert.deepEqual(parseState('Aveuglé|abc'), { name: 'Aveuglé', turns: null });
});

test('computeEndOfTurn — Hémorragique', () => {
  const p = { name: 'Test', hp: 10, states: ['Hémorragique|2', 'Hémorragique'] };
  const res = computeEndOfTurn(p, 5);
  assert.equal(res.hpDelta, -2);
  assert.equal(res.newHp, 8);
  assert.equal(res.logs.length, 1);
});

test('computeEndOfTurn — Enflammé', () => {
  // BE = 3 (caracs.E = 35), armor.lowest = 1, flameLevels = 2
  // d10Roll = 5 -> fireDmg = max(0, 5 - 3 - 1 + 2) = 3
  const p = {
    name: 'Pyromane', hp: 10,
    caracs: { E: 35 },
    armor: { head: 2, body: 1, arms: 3, legs: 2 },
    states: ['Enflammé', 'Enflammé|3']
  };
  const res = computeEndOfTurn(p, 5);
  assert.equal(res.hpDelta, -3);
  assert.equal(res.newHp, 7);
});

test('computeEndOfTurn — Dissipation de Surpris et décrémentation des durées', () => {
  const p = {
    name: 'Guetteur', hp: 10,
    states: ['Surpris', 'Sonné|2', 'Aveuglé|1', 'Inconscient']
  };
  const res = computeEndOfTurn(p, 1);
  assert.deepEqual(res.nextStates.map(s => [s.name, s.duration]), [['Sonné', 1], ['Inconscient', null]]);
});

test('computeEndOfTurn — Passage à Inconscient si PV tombent à 0', () => {
  const p = {
    name: 'Victime', hp: 1,
    states: ['Hémorragique']
  };
  const res = computeEndOfTurn(p, 1);
  assert.equal(res.newHp, 0);
  assert.ok(res.nextStates.some(s => s.name === 'Inconscient'));
});
});

describe('Combat V3 B', () => {
// Lot v3-B : règles de combat du livre de base V5 v3 (27/10/2026).
const subject = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40, FM: 40, Soc: 40, Int: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const q = (id, parameter) => ({ id, ...(parameter === undefined ? {} : { parameter }) });
const ranged = ({ actor = subject('a'), target = subject('b'), context = {}, qualities = [], defense, action = {}, ...extra } = {}) => previewResolution({
  actor, target, roll: 35, baseRevision: 0, action: { type: 'attack', attr: 'CT', base: 50, damage: 3, qualities, ...action },
  ...(defense ? { defense } : {}), attackContext: { ranged: true }, v5: { kind: 'ranged', context }, ...extra });
const meleeDefense = { type: 'defense', label: 'Corps à corps', attr: 'CC', base: 50, roll: 40, v5: { kind: 'melee' } };
const dodgeDefense = { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 30 };
const mods = preview => Object.fromEntries(preview.test.details.modifiers.map(row => [row.id, row.amount]));
const refusal = /Confirmer la règle autorisant cette défense/;

test('v3-B surpris-tir — cible Surprise : +2 DR au tir (p.166)', () => {
  const p = ranged({ target: subject('b', { states: [{ key: 'surpris', level: 1 }] }) });
  assert.equal(mods(p)['target:surprised-ranged'], 2);
});

test('v3-B tir-engage — un tir contre un adversaire engagé avec le tireur se résout comme une mêlée (p.165)', () => {
  const engaged = ranged({ defense: meleeDefense, qualities: [q('pistolet')], context: { targetEngaged: true, engagedWithShooter: true } });
  assert.equal(engaged.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), false, 'ne compte pas comme un tir dans la mêlée');
  assert.equal(engaged.unresolved.some(row => refusal.test(row)), false, 'Corps à corps opposé sans confirmation MJ');
  assert.equal(engaged.opposition?.mode, 'opposed');
  const alone = ranged({ defense: meleeDefense, qualities: [q('pistolet')], context: { engagedWithShooter: true } });
  assert.equal(alone.unresolved.some(row => refusal.test(row)), false);
  assert.equal(ranged({ defense: meleeDefense, context: { engagedWithShooter: true } }).unresolved.some(row => /Pistolet/.test(row)), true, 'sans Pistolet : refusé');
  const noRange = ranged({ defense: meleeDefense, qualities: [q('pistolet')], context: { engagedWithShooter: true, shotRange: 'point-blank', weaponRangeYards: 20 } });
  assert.equal(mods(noRange)['range:point-blank'], undefined, 'résolu comme une mêlée : aucun modificateur de portée');
  // Tir dans une mêlée dont le tireur ne fait pas partie : Désavantage, défense de mêlée toujours refusée.
  const intoMelee = ranged({ defense: meleeDefense, context: { targetEngaged: true } });
  assert.equal(intoMelee.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), true);
  assert.equal(intoMelee.unresolved.some(row => refusal.test(row)), true);
  // Pistolet : règle conservée.
  const pistol = ranged({ defense: meleeDefense, qualities: [q('pistolet')], context: { targetEngaged: true } });
  assert.equal(pistol.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), false);
  assert.equal(pistol.unresolved.some(row => refusal.test(row)), false);
});

test('v3-B esquive-tir — Esquive contre un tir : Bonus d’Initiative mètres ou bouclier de 2 PA (p.165)', () => {
  const p = ranged({ defense: dodgeDefense });
  const line = p.unresolved.find(row => refusal.test(row));
  assert.ok(line, 'la confirmation MJ reste demandée');
  assert.match(line, /Bonus d’Initiative/);
  assert.match(line, /4 m/, 'Initiative 40 : Bonus d’Initiative 4');
  assert.match(line, /bouclier de 2 PA/);
  assert.equal(ranged({ defense: dodgeDefense, context: { rangedOppositionAllowed: true } }).unresolved.some(row => refusal.test(row)), false);
});

test('v3-B bout-portant — pas de bout portant si la portée courte vaut 4 m ou moins (p.302)', () => {
  assert.equal(computeV5WeaponRangeBands(20).pointBlankYards, 4);
  assert.equal(computeV5WeaponRangeBands(10).pointBlankYards, 4, 'courte 5 m : bout portant conservé');
  assert.equal(computeV5WeaponRangeBands(8).pointBlankYards, null, 'courte exactement 4 m');
  assert.equal(computeV5WeaponRangeBands(6).pointBlankYards, null);
  assert.equal(computeV5WeaponRangeBands('BF × 2', { caracs: { F: 30 } }).pointBlankYards, null, 'arme de jet BF × 2, BF 3 : portée 6');
  assert.equal(computeV5WeaponRangeBands('BF × 2', { caracs: { F: 50 } }).pointBlankYards, 4, 'BF 5 × 2 = 10 : courte 5 m');
  const none = ranged({ context: { shotRange: 'point-blank', weaponRangeYards: 8 } });
  assert.equal(mods(none)['range:point-blank'], undefined, 'pas de +2 DR');
  assert.ok(none.unresolved.some(row => /bout portant/i.test(row)));
  const some = ranged({ context: { shotRange: 'point-blank', weaponRangeYards: 20 } });
  assert.equal(mods(some)['range:point-blank'], 2);
  assert.deepEqual(some.unresolved, []);
});

const repeaterWeapon = (shots = 3) => ({ id: 'rep', kind: 'weapon', name: 'Arquebuse à répétition', category: 'Poudre noire', damage: '+4', range: '50',
  keywords: [{ id: 'a-repetition', parameter: '3' }], extensions: { v5: { reloadState: { revision: 1, repeaterRating: 3, shotsRemaining: shots,
    reloadSuccesses: 3, accumulatedSuccesses: 0, reloading: false, requiresReload: false } } } });
const repeaterShot = (context, shots) => ranged({ actor: subject('a', { equipment: [repeaterWeapon(shots)] }), qualities: [q('a-repetition', '3')],
  action: { extensions: { fiche: { equipmentId: 'rep' } } }, context });

test('v3-B repetition — tir double : deux tirs sur la même cible à −1 DR en une Action (p.305)', () => {
  const plain = repeaterShot({}, 3);
  const doubled = repeaterShot({ repeaterDoubleShot: true }, 3);
  assert.equal(mods(plain)['quality:repeater-double'], undefined);
  assert.equal(mods(doubled)['quality:repeater-double'], -1);
  assert.equal(doubled.test.sl, plain.test.sl - 1);
  assert.equal(doubled.weaponReload.after.shotsRemaining, 2, 'chaque tir du couple consomme une munition');
  // Le premier tir réserve les deux munitions ; le second (gratuit) en demande une seule.
  assert.ok(repeaterShot({ repeaterDoubleShot: true }, 1).unresolved.some(row => /deux tirs/i.test(row)));
  const second = repeaterShot({ repeaterDoubleShot: true, repeaterSecondShot: true }, 1);
  assert.equal(second.unresolved.some(row => /deux tirs/i.test(row)), false);
  assert.equal(mods(second)['quality:repeater-double'], -1);
  assert.equal(second.weaponReload.after.shotsRemaining, 0);
  // Arme sans À répétition : refusé.
  const bare = ranged({ context: { repeaterDoubleShot: true } });
  assert.ok(bare.unresolved.some(row => /À répétition/.test(row)));
});

test('v3-B repetition — le second tir est une attaque gratuite sans Élan, une fois par Tour (store)', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  const shooter = subject('a', { equipment: [repeaterWeapon(3)], extensions: { v5: { hasMomentum: false } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [shooter, subject('b')] } });
  const base = id => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, action: { type: 'attack', attr: 'CT', base: 60, damage: 4,
    extensions: { fiche: { equipmentId: 'rep' } } }, attackContext: { ranged: true } });
  const first = store.previewResolution({ ...base('rep-1'), v5: { kind: 'ranged', context: { repeaterDoubleShot: true } } });
  assert.equal(first.ready, true, JSON.stringify(first.unresolved));
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = store.previewResolution({ ...base('rep-2'), v5: { kind: 'ranged', extraAttack: true,
    context: { repeaterDoubleShot: true, repeaterSecondShot: true, freeAttackTalent: 'repeater-double', primaryResolutionId: 'rep-1' } } });
  assert.equal(second.actionCosts.ready, true, JSON.stringify(second.actionCosts));
  assert.equal(second.actionCosts.paid.length, 0, 'aucun Élan dépensé pour le second tir');
  assert.equal((await store.applyResolution(second)).status, 'applied');
  const third = store.previewResolution({ ...base('rep-3'), v5: { kind: 'ranged', extraAttack: true,
    context: { repeaterDoubleShot: true, repeaterSecondShot: true, freeAttackTalent: 'repeater-double', primaryResolutionId: 'rep-1' } } });
  assert.equal(third.actionCosts.ready, false, 'un seul second tir par Tour');
  // Sans premier tir correspondant, ou sur une autre cible : refusé.
  const orphan = { ...base('rep-4'), v5: { kind: 'ranged', extraAttack: true, context: { repeaterDoubleShot: true, repeaterSecondShot: true, freeAttackTalent: 'repeater-double', primaryResolutionId: 'absent' } } };
  assert.throws(() => store.previewResolution(orphan), /premier tir/);
  assert.throws(() => store.previewResolution({ ...orphan, targetId: 'a', v5: { ...orphan.v5, context: { ...orphan.v5.context, primaryResolutionId: 'rep-1' } } }), /premier tir|cible/);
});

test('v3-B peur-elan — sous la Peur, l’Élan est perdu et ne se regagne pas (p.183)', async () => {
  const fear = previewGenericFearEncounter({ author: subject('m'), target: subject('b'), rating: 2 }).addedStates[0];
  const afraid = subject('b', { states: [fear], extensions: { v5: { hasMomentum: true } } });
  assert.equal(hasMomentum(withMomentum(afraid, true)), false, 'pas de regain');
  assert.equal(hasMomentum(loseMomentumUnderFear(afraid)), false, 'l’Élan possédé est perdu');
  assert.equal(hasMomentum(loseMomentumUnderFear(subject('b', { extensions: { v5: { hasMomentum: true } } }))), true, 'sans Peur, rien ne change');
  assert.equal(previewMomentumEvents({ hasMomentum: false, frightened: true, events: [{ id: 'e', type: 'opposedMeleeWon' }] }).after, false);
  assert.equal(previewMomentumEvents({ hasMomentum: false, events: [{ id: 'e', type: 'opposedMeleeWon' }] }).after, true);
  // Store : la Peur d’une créature retire l’Élan déjà possédé.
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  const monster = subject('m', { camp: 'ennemi', traits: ['Fear (1)'], extensions: { v5: {} } });
  const hero = subject('h', { camp: 'pj', extensions: { v5: { hasMomentum: true } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b-fear', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'h', order: ['h', 'm'], participants: [hero, monster] } });
  const done = await store.applyCreaturePsychology('m', 'fear', { targetId: 'h' });
  assert.equal(done.ok, true, done.message);
  const after = store.listParticipants().find(row => row.id === 'h');
  assert.ok(after.states.some(row => row.key === 'fear-of-talent'));
  assert.equal(after.extensions.v5.hasMomentum, false);
});

test('v3-B psycho-debut — rappel : Tests de psychologie au début du Tour, avant Mouvement et Action (p.183)', () => {
  const p = previewResolution({ actor: subject('a', { skills: [] }), roll: 30, action: { type: 'skill', attr: 'FM', base: 40, label: 'Calme' },
    v5: { kind: 'test', context: { psychologyKind: 'fear' } } });
  assert.ok((p.reminders || []).some(row => /début du Tour/i.test(row) && /Mouvement/.test(row)), JSON.stringify(p.reminders));
  const plain = previewResolution({ actor: subject('a'), roll: 30, action: { type: 'skill', attr: 'FM', base: 40, label: 'Calme' }, v5: { kind: 'test', context: {} } });
  assert.equal((plain.reminders || []).some(row => /début du Tour/i.test(row)), false);
});

const riposter = () => subject('b', { talents: [{ id: 'talent-riposte', status: 'resolved', rank: 1 }] });
test('v3-B riposte — une seule fois par Round (p.124)', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b-riposte', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [subject('a'), riposter()] } });
  const raw = id => ({ resolutionId: id, actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 41,
    defense: { base: 60, roll: 24, damage: 5, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
  const first = store.previewResolution(raw('rip-1'));
  assert.equal(first.hit, false);
  assert.ok(first.defenderDamage, 'première Riposte du Round');
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = store.previewResolution(raw('rip-2'));
  assert.equal(second.defenderDamage, null, 'pas de seconde Riposte au même Round');
  assert.ok((second.reminders || []).some(row => /Riposte/.test(row) && /Round/.test(row)));
  await store.nextTurn?.();
});

test('v3-B ambidextre — l’attaque de seconde arme ne coûte pas d’Élan mais en exige un (p.119)', async () => {
  const weapon = (id, name) => ({ id, baseId: 'custom-model', catalogVersion: 'fixture-v1', kind: 'weapon', name, category: 'Base', damage: 'BF+4', reach: 'Moyenne',
    range: '', ap: null, locations: [], layer: 'none', keywords: [], notes: '', source: 'Campagne', custom: true, grip: 'one-hand' });
  const run = async momentum => {
    let saved = null;
    const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
    const store = createStore({ persistence, storage: null }); await store.ready;
    const actor = subject('a', { equipment: [weapon('sword', 'Épée'), weapon('axe', 'Hache')], talents: [{ id: 'talent-dual-wielder', name: 'Maniement de deux armes', status: 'resolved', rank: 1 }],
      extensions: { v5: { hasMomentum: false } } });
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b-dual', turnIndex: 1 } },
      combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [actor, subject('b')] } });
    const hit = (id, extra = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, defense: { base: 35, roll: 80, v5: { kind: 'melee', choice: 'keep' } },
      v5: { kind: 'melee', choice: 'keep', ...extra } });
    const primary = store.previewResolution({ ...hit('dual-primary'), action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: 'sword' } } } });
    assert.equal((await store.applyResolution(primary)).status, 'applied');
    await store.updateParticipant('a', { extensions: { v5: { hasMomentum: momentum } } });
    return store.previewResolution({ ...hit('dual-second', { extraAttack: true, context: { freeAttackTalent: 'dual-wielder', dualWielding: true, secondWeaponAttack: true, weaponId: 'axe', primaryResolutionId: 'dual-primary' } }),
      action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: 'axe' } } } });
  };
  const withMomentumPreview = await run(true);
  assert.equal(withMomentumPreview.actionCosts.ready, true);
  assert.equal(withMomentumPreview.actionCosts.paid.length, 0, 'aucun Élan dépensé');
  const without = await run(false);
  assert.equal(without.actionCosts.ready, false, 'sans Élan, pas d’attaque de seconde arme');
  // Fonction pure.
  assert.equal(previewMomentumCost({ hasMomentum: false, paidExtraAttackUsedThisTurn: false, extraAttack: true, waived: true, requiresMomentum: true }).allowed, false);
  assert.equal(previewMomentumCost({ hasMomentum: true, paidExtraAttackUsedThisTurn: false, extraAttack: true, waived: true, requiresMomentum: true }).nextMomentum, true);
});

test('v3-B esquive-melee — l’Esquive en mêlée : ±5 DR sur maladresse et critique, ni Élan ni victoire de mêlée (p.164)', () => {
  const run = (roll, defenseRoll) => previewResolution({ actor: subject('a'), target: subject('b', { extensions: { v5: { hasMomentum: true } } }),
    action: { type: 'attack', attr: 'CC', base: 60, damage: 4 }, roll, defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: defenseRoll }, v5: { kind: 'melee', choice: 'keep' } });
  const fumble = run(25, 77);
  assert.equal(fumble.defenderTest.sl, -5);
  assert.equal(fumble.defenderTest.fumble, true);
  const critical = run(25, 22);
  assert.equal(critical.defenderTest.sl, 5);
  assert.equal(critical.defenderTest.critical, true);
  const dodgeWins = run(99, 95);
  assert.equal(dodgeWins.opposition.winner, 'attacker', 'maladresse de l’attaquant à −3 DR contre −5 DR : l’attaquant gagne');
  const won = run(70, 22);
  assert.equal(won.hit, false);
  const bare = previewResolution({ actor: subject('a'), target: subject('b', { extensions: { v5: { hasMomentum: false } } }), action: { type: 'attack', attr: 'CC', base: 60, damage: 4 }, roll: 70,
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 22 }, v5: { kind: 'melee', choice: 'keep' } });
  assert.equal(bare.hit, false, 'l’Esquive remporte l’opposition');
  const dodger = bare.momentum.find(row => row.participantId === 'b');
  assert.ok(dodger, 'le défenseur a une trace d’Élan');
  assert.equal(dodger.before, false);
  assert.equal(dodger.after, false, 'gagner par Esquive ne donne pas d’Élan');
  assert.equal(dodger.details.some(row => row.effect === 'gain'), false);
});

test('v3-B maladresse-oppose — la maladresse de mêlée ne change pas les DR : le Test opposé se résout normalement (p.130)', () => {
  const p = previewResolution({ actor: subject('a'), target: subject('b'), action: { type: 'attack', attr: 'CC', base: 60, damage: 4 }, roll: 99,
    defense: { type: 'defense', label: 'Corps à corps', attr: 'CC', base: 30, roll: 95, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep' } });
  assert.equal(p.test.fumble, true);
  assert.equal(p.test.sl, -3, 'pas de plancher −5 pour un Test de mêlée');
  assert.equal(p.hit, true, 'maladresse mais adversaire plus bas : l’attaquant remporte l’opposition');
});

test('v3-B souille — Désavantage aux Tests d’Endurance contre les Plaies purulentes (p.185)', () => {
  const soiled = subject('a', { states: [{ key: 'souille', level: 1 }] });
  const endurance = context => previewResolution({ actor: soiled, roll: 30, action: { type: 'skill', attr: 'E', base: 40, label: 'Endurance' }, v5: { kind: 'test', context } });
  const festering = endurance({ festeringWounds: true });
  assert.equal(festering.test.advantage.disadvantage.some(row => row.id === 'besmirched'), true);
  const notEndurance = previewResolution({ actor: soiled, roll: 30, action: { type: 'skill', attr: 'Int', base: 40, label: 'Intuition' }, v5: { kind: 'test', context: { festeringWounds: true, usesFellowship: false } } });
  assert.equal(notEndurance.test.advantage.disadvantage.some(row => row.id === 'besmirched'), false, 'seulement un Test d’Endurance');
  const other = endurance({ usesFellowship: false });
  assert.equal(other.test.advantage.disadvantage.some(row => row.id === 'besmirched'), false);
  const clean = previewResolution({ actor: subject('a'), roll: 30, action: { type: 'skill', attr: 'E', base: 40, label: 'Endurance' }, v5: { kind: 'test', context: { festeringWounds: true } } });
  assert.equal(clean.test.advantage.disadvantage.length, 0, 'sans Souillé, rien');
});

test('v3-B perturbant — seuls les ennemis vivants subissent −2 DR (p.358)', () => {
  const owner = subject('m', { camp: 'ennemi', traits: ['Distracting'] });
  const hero = subject('h', { camp: 'pj' });
  const ally = subject('x', { camp: 'ennemi' });
  const rules = actor => senseTestRules({ actor, opponent: owner, participants: [owner, hero, ally], context: { distractingInRange: true } }).modifiers;
  assert.equal(rules(hero).some(row => row.id === 'sense:distracting' && row.amount === -2), true);
  assert.equal(rules(ally).length, 0, 'un allié du Perturbant n’est pas touché');
  assert.match(planSense(owner, 'distracting').reminders.join(' '), /ennemis vivants/);
  const neutral = subject('n', { camp: 'neutre' });
  assert.equal(rules(neutral).length, 0, 'un camp neutre n’est pas un ennemi');
  const campless = subject('c', { camp: undefined });
  assert.match(rules(campless).find(row => row.id === 'sense:distracting')?.label || '', /camp inconnu/, 'camp absent : ennemi supposé, avec rappel');
});

test('v3-B allonge — armes naturelles : Personnelle jusqu’à Grande, Courte pour Énorme, Moyenne pour Monstrueuse (p.318)', () => {
  const reach = size => planCreatureSize(subject('m', { traits: [`Size (${size})`] })).naturalReach.key;
  assert.deepEqual(['Small', 'Average', 'Large', 'Enormous', 'Monstrous'].map(reach), ['personal', 'personal', 'personal', 'short', 'average']);
  assert.equal(naturalWeaponDefaults({ size: 'enormous' }).reach, 'short');
  assert.equal(naturalWeaponDefaults({ size: 'monstrous' }).reach, 'average');
  assert.equal(naturalWeaponDefaults({ size: 'monstrous', reach: 'Longue' }).reach, 'Longue', 'allonge imprimée respectée');
  assert.equal(naturalWeaponDefaults({}).reach, 'personal');
});

test('v3-B taille — Grande +BF, Énorme +2×BF, Monstrueuse +3×BF ; pas de double comptage avec un profil imprimé (p.360)', () => {
  const bonus = (size, printedProfile) => planCreatureSize(subject('m', { traits: [`Size (${size})`], caracs: { F: 50, E: 30, Ag: 30, I: 30 } }), { printedProfile }).damage.bonus;
  assert.deepEqual(['Large', 'Enormous', 'Monstrous'].map(size => bonus(size, false)), [5, 10, 15]);
  assert.deepEqual(['Large', 'Enormous', 'Monstrous'].map(size => bonus(size, true)), [0, 0, 0], 'profil imprimé : aucun ajout');
});

test('v3-B ombrageux — +1 Brisé au lieu de 3 (p.361)', () => {
  const horse = subject('m', { traits: ['Skittish'] });
  assert.deepEqual(planPsychology(horse, 'skittish').effects[0].conditions, [{ name: 'Brisé', level: 1 }]);
  const brisé = previewSkittishReaction({ subject: horse, trigger: 'noise', round: 1 }).participant.states.filter(row => row.key === 'brise').reduce((sum, row) => sum + row.level, 0);
  assert.equal(brisé, 1);
});
});
