import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary, buildReserveProfileFromBestiary, armourDetailNamesZones, unvaluedSkillNames } from '../../../js/core/bestiary-profiles.js';
import { deriveReminders, resolveReminder, buildParticipantReminders } from '../../../js/core/reminders.js';
import { encounter, subject, cast, endTurn } from '../../helpers/lot3-domain-fixture.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { planNaturalAttack, naturalAttackNeedsSize, inferNaturalAttackKey, parseNaturalTrait, naturalCombatTraits, planV4NaturalWeapon, naturalCombatReminders } from '../../../js/core/creature-combat.js';
import { planCreatureMagic, parseCreatureMagicTrait, creatureMagicTraits, magicResistanceReduction, creatureMagicReminders } from '../../../js/core/creature-magic.js';
import { planSwarm, parseStateTrait, stateTraits, planStateOnWound, planVampiricHeal, planUnstableEndOfRound, planDieHard, planSplit, planDeathTriggers, stateReminders } from '../../../js/core/creature-states.js';
import { planPsychology, parsePsychologyTrait, psychologyTraits, psychologyReminders, fearImmunity } from '../../../js/core/creature-psychology.js';
import { attacksAreMagical, natureReminders, parseNatureTrait, natureProtection, willpowerBase } from '../../../js/core/creature-natures.js';
import { weaponAttackNature, previewMagicProtection, attackNature, targetNatureTags } from '../../../js/core/v5-magic-combat.js';
import { fearAction } from '../../../js/core/v5-talent-psychology.js';
import { parseSizeTrait, creatureSizeOf, planCreatureSize, sizeReminders, SIZE_RANKS } from '../../../js/core/creature-size.js';
import { applyBestiaryTemplates, buildParticipantFromTemplatedBestiary } from '../../../js/core/bestiary-templates.js';
import { CREATURE_ABILITIES } from '../../../js/data/creature-abilities.js';
import { abilityDisposition, planCreatureAbility, creatureAbilityReminders, uncoveredAbilityRefs } from '../../../js/core/creature-abilities.js';
import { parseMovementTrait, movementTraits, planMovement, movementReminders } from '../../../js/core/creature-movement.js';
import { parseSenseTrait, senseTraits, planSense, distractingPenalty, senseReminders } from '../../../js/core/creature-senses.js';
import { parseRegenerationTrait, hasRegeneration, planRegeneration, regenerationReminders } from '../../../js/core/creature-regeneration.js';
import { parseManyHeadsTrait, hasManyHeads, createHeadRegistry, planManyHeads, applyHeadCritical, restoreHead, manyHeadsReminders } from '../../../js/core/creature-heads.js';

describe('attaques multiples', () => {
const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const L14 = book('L14');
const L22 = book('L22');

// Livre de base V5 (L06) p. 362 : « 8 Tentacles : la créature peut faire 8 attaques gratuites » ; p. 168 : une seule attaque
// supplémentaire par Tour en dépensant de l'Élan, mais les attaques gratuites de la créature sont celles que son profil imprime.

test('Q16 : Carrion (E0-P-757) a le Bec et deux attaques de Griffes sur le participant', () => {
  const participant = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  const claws = participant.actions.filter(action => /^Claws/i.test(action.name));
  assert.equal(claws.length, 2, participant.actions.map(action => action.name).join(', '));
  assert.deepEqual(claws.map(action => action.name), ['Claws 1', 'Claws 2']);
  assert.ok(claws.every(action => action.damage === 7 && action.extensions.v5.multiAttack.of === 2));
  assert.deepEqual(claws.map(action => action.extensions.v5.multiAttack.index), [1, 2]);
  assert.equal(participant.actions.filter(action => /^Beak$/i.test(action.name)).length, 1);
});

test('Q16 : le Kraken (E0-P-488) a 8 attaques de Tentacles', () => {
  const participant = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const tentacles = participant.actions.filter(action => /^Tentacles/i.test(action.name));
  assert.equal(tentacles.length, 8);
  assert.equal(new Set(tentacles.map(action => action.name)).size, 8);
});

test('Q16 : une attaque seule garde son nom et n’a pas de marque multiple', () => {
  const participant = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  const beak = participant.actions.find(action => action.name === 'Beak');
  assert.ok(beak);
  assert.equal(beak.extensions.v5.multiAttack, undefined);
});

test('Q16 : la copie dans la Réserve garde les attaques multiples', () => {
  const profile = buildReserveProfileFromBestiary('E0-P-488', { library: L14 });
  assert.equal(profile.diceLines.filter(action => /^Tentacles/i.test(action.name)).length, 8);
});
});

describe('rappels visibles', () => {
const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const library = ['L18', 'L19', 'L20', 'L21', 'L23'].flatMap(book);
const transition = (round = 1) => ({ id: `round-${round}`, type: 'endTurn', actorId: null, round });
// Hors rappels dérivés des Traits (`:trait-`, lots B1 à B3) : ces tests regardent les rappels posés dans `extensions.v5.reminders`.
const participantTexts = reminders => reminders.filter(item => item.kind === 'participant-reminder' && !item.effectId.includes(':trait-')).map(item => item.text);

test('Q17 : armure inconnue → rappel de la carte de combat par deriveReminders', () => {
  const participant = buildParticipantFromBestiary('E0-P-593', { library, zone: 'active' });
  const reminders = deriveReminders({ sceneId: 's', participants: [participant] }, transition());
  assert.equal(participantTexts(reminders).length, 1);
  assert.match(participantTexts(reminders)[0], /Armure imprimée/);
  assert.match(participantTexts(reminders)[0], new RegExp(participant.name));
});

// Q31 : le banc n'est plus exclu (« Ajouter au combat » depuis la bibliothèque pose au banc).
test('Q17 : pas de rappel pour une armure déterminée ; le participant au banc garde le sien (Q31)', () => {
  const known = buildParticipantFromBestiary('E0-P-556', { library, zone: 'active' });
  assert.deepEqual(participantTexts(deriveReminders({ sceneId: 's', participants: [known] }, transition())), []);
  const bench = buildParticipantFromBestiary('E0-P-593', { library, zone: 'bench' });
  assert.equal(participantTexts(deriveReminders({ sceneId: 's', participants: [bench] }, transition())).length, 1);
});

test('Q17 : la copie dans la Réserve garde le rappel', () => {
  const profile = buildReserveProfileFromBestiary('E0-P-593', { library });
  assert.equal(profile.extensions.v5.reminders[0].id, 'armour-unresolved');
  const back = { id: 'p1', name: profile.name, zone: 'active', extensions: profile.extensions };
  assert.equal(participantTexts(deriveReminders({ sceneId: 's', participants: [back] }, transition())).length, 1);
});

test('Q17 : un rappel résolu ne revient pas au Round suivant', () => {
  const participant = buildParticipantFromBestiary('E0-P-593', { library, zone: 'active' });
  const snapshot = { sceneId: 's', participants: [participant] };
  const item = deriveReminders(snapshot, transition(1)).find(entry => entry.kind === 'participant-reminder' && !entry.effectId.includes(':trait-'));
  const [choice] = resolveReminder([item], item.id, 'resolve').map(entry => entry.choice);
  assert.deepEqual(participantTexts(deriveReminders(snapshot, transition(2), [choice])), []);
});

test('Q17 : libellé « zones » seulement quand des zones sont nommées', () => {
  assert.equal(armourDetailNamesZones('Arms, Body'), true);
  assert.equal(armourDetailNamesZones('Mail Coat 2'), false);
  assert.match(readFileSync('js/ui/bestiary-library.js', 'utf8'), /armourDetailNamesZones\(armour\.detail\)/);
});

const demonSpell = getSpellContract('Manifestation de Démon Mineur');
async function expired(outcome) {
  const { store, engine } = await encounter({});
  await cast(store, demonSpell, { domainFactsExtra: { daemonKind: 'bloodletter', commandOutcome: outcome } });
  const layer = subject(store, 'mage').extensions.v5.spellEffects.find(e => e.spellId === demonSpell.id);
  const state = JSON.parse(store.getFullJSON());
  state.combat.round = layer.expiresAtRound; state.combat.currentActorId = 'mage';
  await store.loadFromJSON(state); await endTurn(engine);
  return store.listParticipants().find(p => p.extensions?.v5?.summonedBySpellId === demonSpell.id);
}

test('Q17 : démon expiré (le lanceur l’emporte) → rappel « ordre accompli » sur la carte', async () => {
  const demon = await expired('obeys');
  const texts = participantTexts(deriveReminders({ sceneId: 's', participants: [demon] }, transition()));
  assert.equal(texts.length, 1);
  assert.match(texts[0], /Ordre accompli/);
});

test('Q17 : démon expiré (le démon l’emporte) → rappel sans « ordre accompli »', async () => {
  const demon = await expired('attacks');
  const texts = participantTexts(deriveReminders({ sceneId: 's', participants: [demon] }, transition()));
  assert.equal(texts.length, 1);
  assert.doesNotMatch(texts[0], /ordre accompli/i);
  assert.match(texts[0], /hostile au lanceur/);
});
});

describe('attaques naturelles', () => {
// Q18 : l'attaque naturelle choisie (v5.context.naturalAttack, posée par la liste « Attaque naturelle » du panneau de Résolution)
// est appliquée par la résolution : dégâts calculés du Trait, états de la touche, rappels. Livre de base V5 pp.357 (Souffle), 362 (Langue).
const clone = value => structuredClone(value);
const base = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: id === 'beast' ? 'ennemi' : 'pj', zone: 'active', initiative: id === 'beast' ? 60 : 30, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function fixture(traits) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'],
    participants: [base('beast', { traits }), base('hero')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q18' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const hero = store => store.listParticipants().find(p => p.id === 'hero');
const attack = (naturalAttack, extra = {}) => ({ resolutionId: 'q18-' + naturalAttack, actorId: 'beast', targetId: 'hero', roll: 10,
  action: { type: 'attack', base: 60, attr: 'CT', damage: 0 }, defense: { base: 10, roll: 99, v5: { kind: 'ranged' } },
  v5: { kind: 'ranged', context: { naturalAttack }, ...extra } });

test('Q18 Langue qui touche : cible Enchevêtrée, quelle que soit la Taille', async () => {
  const store = await fixture(['Tongue']);
  const preview = store.previewResolution(attack('tongue', { actorSize: 2, targetSize: 4 }));
  assert.equal(preview.hit ?? preview.success, true);
  assert.ok(preview.targetConditionApplication.some(s => s.key === 'enchevetre'), 'Enchevêtré proposé même si la cible est plus grande');
  assert.ok(preview.reminders.some(r => /n'est pas plus petite|pas attirée/.test(r)), 'la Taille ne décide que de l’attirance');
});

test('Q18 Langue : cible plus petite, rappel d’attirance', async () => {
  const store = await fixture(['Tongue']);
  const preview = store.previewResolution(attack('tongue', { actorSize: 4, targetSize: 2 }));
  assert.ok(preview.targetConditionApplication.some(s => s.key === 'enchevetre'));
  assert.ok(preview.reminders.some(r => /attirée au contact/.test(r)));
});

test('Q18 Souffle de feu : dégâts BF+3 et Enflammé appliqués à la cible', async () => {
  const store = await fixture(['Breath (Fire)']);
  const preview = store.previewResolution({ ...attack('breath'), defense: undefined });
  const plain = store.previewResolution({ ...attack('none'), defense: undefined, resolutionId: 'q18-plain', action: { type: 'attack', base: 60, attr: 'CT', damage: 8 }, v5: { kind: 'ranged' } });
  assert.equal(preview.damage.finalDamage, plain.damage.finalDamage, 'mêmes dégâts qu’une arme fixe de BF 5 + 3 = 8');
  assert.ok(preview.targetConditionApplication.some(s => s.key === 'enflamme'));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.ok(hero(store).states.some(s => s.key === 'enflamme'), 'la cible est Enflammée');
  assert.equal(hero(store).hp, 40 - preview.damage.finalDamage);
});

test('Q18 Souffle de type absent du livre de base : non résolu, jamais disponible sans effet', () => {
  for (const type of ['Corrosion', 'Warpfire', 'Slime', 'Soporific', 'Nightmares']) {
    const plan = planNaturalAttack({ traits: [`Breath (${type})`], caracs: { F: 50, E: 30 } }, 'breath');
    assert.equal(plan.available, false, type);
    assert.match(plan.unresolved.join(' '), new RegExp(type));
  }
  assert.equal(planNaturalAttack({ traits: ['Breath (Cold)'], caracs: { F: 50, E: 30 } }, 'breath').available, true);
});

test('Q18 Souffle : le préavis bloque l’application tant que le type est inconnu', async () => {
  const store = await fixture(['Breath (Slime)']);
  const preview = store.previewResolution(attack('breath'));
  assert.ok(preview.unresolved.some(text => /Slime/.test(text)));
});

test('Q18 Dressé à plusieurs compétences : un effet par compétence', () => {
  const plan = planCreatureMagic({ traits: ['Trained (Drive, Fetch)'] }, 'trained');
  assert.deepEqual(plan.effects.filter(e => e.trainedSkill).map(e => e.trainedSkill), ['Conduite', 'Rapporter']);
  assert.deepEqual(plan.effects.filter(e => e.trainedEffect).map(e => e.trainedEffect.skill), ['Conduite', 'Rapporter']);
  const one = planCreatureMagic({ traits: ['Trained (Drive, Fetch)'] }, 'trained', { skill: 'Fetch' });
  assert.deepEqual(one.effects.filter(e => e.trainedSkill).map(e => e.trainedSkill), ['Rapporter']);
});

test('Q18 interface : la liste « Attaque naturelle » du panneau pose v5.context.naturalAttack', () => {
  const source = readFileSync(new URL('../../../js/ui/resolution-panel.js', import.meta.url), 'utf8');
  assert.match(source, /naturalCombatTraits\(actor\)/);
  assert.match(source, /naturalAttack: select\.value \|\| undefined/);
});
});

describe('attaques gratuites', () => {
// Q20, décisions du MJ du 23/10 : les attaques au-delà de la première d'un multiplicateur (hors Tentacules, toutes gratuites) sont des
// attaques gratuites avec quota par Tour ; le quota des Tentacules est le nombre imprimé ; Souffle de Fumée sans dégâts ; dégâts du Trait V5.
const clone = value => structuredClone(value);
const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const L14 = book('L14'), L22 = book('L22'), L11 = book('L11');

async function fixture(beast) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q20' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (action, n, extra = {}) => ({ resolutionId: `q20-${action.name}-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee', ...extra } });
async function attacksUntilRefused(store, actions) {
  let done = 0;
  for (const [n, action] of actions.entries()) {
    let preview;
    try { preview = store.previewResolution(input(action, n)); } catch { break; }
    if (preview.unresolved?.length) break;
    const result = await store.applyResolution(preview);
    if (result.status !== 'applied') break;
    done += 1;
  }
  return done;
}

test('Q20 Kraken : 8 attaques gratuites de tentacule par Tour, la 9e est refusée', async () => {
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const tentacles = kraken.actions.filter(action => /^Tentacles/.test(action.name));
  assert.equal(tentacles.length, 8);
  const store = await fixture(kraken);
  const done = await attacksUntilRefused(store, [...tentacles, tentacles[0]]);
  assert.equal(done, 8);
});

test('Q20 quota des Tentacules : le nombre imprimé, pas la valeur d’attaque', () => {
  for (const [library, id, count] of [[L14, 'E0-P-488', 8], [L11, 'E0-P-027', 2], [L11, 'E0-P-028', 2]]) {
    const participant = buildParticipantFromBestiary(id, { library });
    const plan = planNaturalAttack(participant, 'tentacles');
    assert.equal(plan.quota.maximum, count, id);
  }
});

test('Q20 Carrion : Bec et première Griffe ordinaires, la seconde Griffe est gratuite (une par Tour)', async () => {
  const carrion = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  const [first, second] = carrion.actions.filter(action => /^Claws/.test(action.name));
  assert.equal(first.extensions.v5.freeAttack, undefined);
  assert.equal(second.extensions.v5.freeAttack, 'all');
  const store = await fixture(carrion);
  const preview = store.previewResolution(input(second, 1));
  assert.ok(!preview.costs?.some(cost => cost.resource === 'momentum'), 'attaque gratuite : pas d’Élan');
  assert.equal(await attacksUntilRefused(store, [second, { ...second, name: 'Claws 2' }]), 1, 'une seule attaque gratuite de Griffes par Tour');
});

test('Q20 Souffle de Fumée : aucun dégât, même quand l’action imprimée en porte', () => {
  const plan = planNaturalAttack({ traits: ['Breath (Smoke)'], caracs: { F: 50, E: 30 } }, 'breath');
  assert.equal(plan.noDamage, true);
});

test('Q20 Souffle de Fumée par la résolution : 0 dégât', async () => {
  const store = await fixture({ name: 'beast', kind: 'PNJ', caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, M: 4 }, traits: ['Breath (Smoke)'], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
  const preview = store.previewResolution({ resolutionId: 'q20-smoke', actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CT', damage: 9 }, v5: { kind: 'ranged', context: { naturalAttack: 'breath' } } });
  assert.equal(preview.damage?.finalDamage ?? 0, 0);
});

test('Q20 profil V4 : les dégâts suivent la formule V5 du Trait, pas le chiffre imprimé', async () => {
  const store = await fixture({ name: 'beast', kind: 'PNJ', caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, M: 4 }, traits: ['Tail'], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
  const withTrait = store.previewResolution({ resolutionId: 'q20-tail', actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', damage: 3 }, v5: { kind: 'melee', context: { naturalAttack: 'tail', actorSize: 4, targetSize: 3 } } });
  const fixed = store.previewResolution({ resolutionId: 'q20-fixed', actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', damage: 7 }, v5: { kind: 'melee' } });
  assert.equal(withTrait.damage.finalDamage, fixed.damage.finalDamage, 'BF 5 + 2 = 7, et non le 3 imprimé');
});
});

describe('tailles des attaques naturelles', () => {
// Q21 : le panneau de Résolution affiche les listes de Taille pour toute attaque naturelle dont un effet dépend de la Taille
// (Attaque caudale « À terre » si la cible est plus petite p.362, Piétinement, Langue), pas seulement pour le Battement.
const clone = value => structuredClone(value);
const base = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: id === 'beast' ? 'ennemi' : 'pj', zone: 'active', initiative: id === 'beast' ? 60 : 30, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function fixture(traits) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'],
    participants: [base('beast', { traits }), base('hero')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q21' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const tail = (extra = {}) => ({ resolutionId: 'q21-tail-' + JSON.stringify(extra), actorId: 'beast', targetId: 'hero', roll: 10,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 6 }, defense: { base: 10, roll: 99, v5: { kind: 'melee' } },
  v5: { kind: 'melee', context: { naturalAttack: 'tail' }, ...extra } });

test('Q21 les attaques naturelles dépendantes de la Taille sont désignées', () => {
  for (const key of ['tail', 'stomp', 'tongue']) assert.equal(naturalAttackNeedsSize(key), true, key);
  for (const key of ['bite', 'horns', 'breath', 'tentacles', 'constrictor', undefined, '']) assert.equal(naturalAttackNeedsSize(key), false, String(key));
});

test('Q21 Attaque caudale : Tailles saisies à l’écran, « À terre » appliqué à la cible plus petite', async () => {
  const store = await fixture(['Tail']);
  const big = store.previewResolution(tail({ actorSize: 4, targetSize: 2 }));
  assert.ok(big.targetConditionApplication.some(s => s.key === 'a terre'), 'cible plus petite : À terre');
  const equal = store.previewResolution(tail({ actorSize: 3, targetSize: 3 }));
  assert.ok(!equal.targetConditionApplication.some(s => s.key === 'a terre'), 'cible de même Taille : pas de À terre');
});

test('Q21 interface : les listes de Taille sont montrées pour toute attaque naturelle qui en dépend', () => {
  const source = readFileSync(new URL('../../../js/ui/resolution-panel.js', import.meta.url), 'utf8');
  assert.match(source, /naturalAttackNeedsSize\(draft\.v5Context\?\.naturalAttack\)/);
  assert.match(source, /sizeSelects\(/);
});
});

describe('rappels sur la carte', () => {
const library = ['L18', 'L19', 'L20', 'L21', 'L23'].flatMap(id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles);

function memoryPersistence() {
  let state = null;
  return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }, peek() { return state && structuredClone(state); } };
}
function fakeElement(tag) {
  const children = [];
  return { tag, children, dataset: {}, className: '', textContent: '', appendChild(child) { children.push(child); return child; } };
}

// Skree porte aussi le Trait Régénération (rappel de Trait, lot B3) : ces tests ne regardent que le rappel d'armure.
const armourReminders = (store, id) => store.getParticipantReminders(id).filter(item => /armour-unresolved/.test(item.id));

async function combatFromLibrary() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const participant = buildParticipantFromBestiary('E0-P-593', { library, zone: 'active' });
  await store.addParticipant(participant);
  return { store, id: participant.id };
}

test('Q22 : sans scène active, la carte reçoit le rappel d’armure alors que getReminders reste vide', async () => {
  const { store, id } = await combatFromLibrary();
  assert.equal(store.getActiveScene?.() ?? null, null);
  assert.deepEqual(store.getReminders({ id: 'round-0', type: 'endTurn' }), []);
  const reminders = armourReminders(store, id);
  assert.equal(reminders.length, 1);
  assert.match(reminders[0].text, /Armure imprimée/);
});

test('Q22 : résoudre le rappel depuis la carte le retire, aussi après changement de Round', async () => {
  const { store, id } = await combatFromLibrary();
  const [item] = armourReminders(store, id);
  await store.resolveParticipantReminder(id, item.id, 'resolve');
  assert.deepEqual(armourReminders(store, id), []);
  store.getCombat().round = 2;
  assert.deepEqual(armourReminders(store, id), []);
});

test('Q22 : le rappel d’un autre participant ne se retrouve pas sur la carte', async () => {
  const { store } = await combatFromLibrary();
  assert.deepEqual(store.getParticipantReminders('inconnu'), []);
});

test('Q22 : le bloc de carte affiche le texte et deux boutons par rappel, rien sans rappel', async () => {
  const { store, id } = await combatFromLibrary();
  assert.equal(buildParticipantReminders(fakeElement, []), null);
  const block = buildParticipantReminders(fakeElement, armourReminders(store, id));
  const [row] = block.children;
  assert.equal(row.dataset.reminderId, armourReminders(store, id)[0].id);
  assert.match(row.children[0].textContent, /Armure imprimée/);
  assert.deepEqual(row.children.slice(1).map(button => button.dataset.decision), ['resolve', 'ignore']);
});

test('Q22 : branchement — la carte appelle le Store et le clic résout', () => {
  const card = readFileSync('js/ui/card.js', 'utf8');
  assert.match(card, /Store\.getParticipantReminders\?\.\(p\.id\)/);
  assert.match(card, /Store\.resolveParticipantReminder\(id, reminderId/);
  assert.match(readFileSync('js/main.js', 'utf8'), /'participant-reminder': 'Rappel du participant'/);
});
});

describe('formule V5 par défaut', () => {
// Q30, décision (1) du MJ du 23/10 : l'attaque ordinaire d'un profil qui porte le nom d'un Trait d'attaque naturelle prend la formule V5
// du Trait par défaut (sans passer par la liste « Attaque naturelle ») ; les armes gardent leurs dégâts (Livre de base V5 p.356, Bite).
const clone = value => structuredClone(value);
const L14 = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;

async function fixture(beast) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], ...beast, id: 'beast', extensions: { v5: { ...beast.extensions?.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q30' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const beast = traits => ({ name: 'beast', kind: 'PNJ', caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, M: 4 }, traits, armor: { head: 0, body: 0, arms: 0, legs: 0 } });
const hit = (store, id, action, extra = {}) => store.previewResolution({ resolutionId: `q30-${id}`, actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', ...action }, v5: { kind: 'melee', ...extra } }).damage.finalDamage;

test('Q30 Morsure V5 : « Bite (7) » donne 7 dégâts, quel que soit le chiffre imprimé de l’action', async () => {
  const store = await fixture(beast(['Bite (7)']));
  assert.equal(hit(store, 'bite', { name: 'Bite', damage: 3 }), hit(store, 'fixed7', { name: 'Fixed', damage: 7 }));
  assert.notEqual(hit(store, 'bite2', { name: 'Bite', damage: 3 }), hit(store, 'fixed3', { name: 'Fixed', damage: 3 }));
});

test('Q30 Morsure « Strength Bonus + 1 » : BF + 1 ; sans valeur au Trait, BF+3 (V5 v3 p.356)', async () => {
  assert.equal(planNaturalAttack(beast(['Bite (Strength Bonus + 1)']), 'bite').damageFormula, '6');
  assert.equal(planNaturalAttack(beast(['Bite']), 'bite').damageFormula, '8');
  const store = await fixture(beast(['Bite']));
  assert.equal(hit(store, 'bare', { name: 'Bite' }), hit(store, 'bare-fixed', { name: 'Fixed', damage: 8 }), 'BF 5 + 3 sans chiffre imprimé');
  assert.equal(hit(store, 'bare-printed', { name: 'Bite', damage: 6 }), hit(store, 'bare-printed-fixed', { name: 'Fixed', damage: 6 }), 'chiffre imprimé gardé, même avec le Trait sans valeur');
});

test('Q30 Queue : l’attaque ordinaire prend BF+2 sans choisir l’Attaque naturelle ; une arme garde ses dégâts', async () => {
  const store = await fixture(beast(['Tail', 'Weapon (9)']));
  assert.equal(hit(store, 'tail', { name: 'Tail', damage: 3 }), hit(store, 'tail-fixed', { name: 'Fixed', damage: 7 }), 'BF 5 + 2');
  assert.equal(hit(store, 'sword', { name: 'Sword', damage: 3 }), hit(store, 'sword-fixed', { name: 'Fixed', damage: 3 }));
  assert.equal(inferNaturalAttackKey(beast(['Tail']), { name: 'Sword' }), null);
  // Décision (4) du MJ du 24/10 (Q35) : une attaque naturelle sans le Trait suit aussi la formule, par le nom de l'attaque.
  assert.equal(inferNaturalAttackKey(beast([]), { name: 'Tail' }), 'tail', 'Trait absent : reconnue par son nom');
});

test('Q30 Kraken : une attaque ordinaire de tentacule fait BF (formule V5), pas le chiffre imprimé', async () => {
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const tentacle = kraken.actions.find(action => /^Tentacles 1/.test(action.name));
  const store = await fixture(kraken);
  const bf = Math.floor(kraken.caracs.F / 10);
  assert.equal(hit(store, 'kraken', { ...tentacle, base: 60 }), hit(store, 'kraken-fixed', { name: 'Fixed', damage: bf }));
});

test('Q30 ancien participant « Tentacles (+9) » sans nombre : autant d’attaques que d’actions de tentacule', () => {
  const old = { ...beast(['Tentacles (+9)']), actions: [1, 2, 3].map(n => ({ name: `Tentacles ${n}`, type: 'attack' })) };
  const plan = planNaturalAttack(old, 'tentacles');
  assert.equal(plan.quota.maximum, 3);
  assert.equal(plan.available, true);
  assert.equal(planNaturalAttack(beast(['Tentacles (+9)']), 'tentacles').available, false, 'aucune action : toujours illisible');
});
});

describe('attaques gratuites au Round 0', () => {
// Q31 : avant le premier Round (pas de Tour courant), les attaques gratuites d'une créature sont acceptées, avec le quota rappelé,
// et le quota (8 tentacules du Kraken) est tenu.
const clone = value => structuredClone(value);
const L14 = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;

async function round0Store() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const actor = { ...kraken, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...kraken.extensions.v5, hasMomentum: true } } };
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 0, order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { combatId: 'q31' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, tentacles: actor.actions.filter(action => /^Tentacles/.test(action.name)) };
}
const input = (action, n) => ({ resolutionId: `q31-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 2 } } }, v5: { kind: 'melee' } });

test('Q31 Kraken au Round 0 : l’attaque gratuite de tentacule est acceptée et le quota est rappelé', async () => {
  const { store, tentacles } = await round0Store();
  const preview = store.previewResolution(input(tentacles[0], 0));
  assert.ok(!preview.unresolved?.length, JSON.stringify(preview.unresolved));
  assert.ok(preview.reminders.some(text => /Avant le premier Round.*8/.test(text)), JSON.stringify(preview.reminders));
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied');
});

test('Q31 Kraken au Round 0 : la 9e attaque gratuite est refusée', async () => {
  const { store, tentacles } = await round0Store();
  let done = 0;
  for (const [n, action] of [...tentacles, tentacles[0]].entries()) {
    const preview = store.previewResolution(input(action, n));
    if (preview.unresolved?.length) break;
    if ((await store.applyResolution(preview)).status !== 'applied') break;
    done += 1;
  }
  assert.equal(done, 8);
});
});

describe('formule de taille', () => {
// Q35, décisions (3) et (4) du MJ du 24/10 : livres V4 = formule V5 du Trait + bonus de Taille V5 (Livre de base V5 v3 p.360 : Grande +BF, Énorme +2 BF,
// Monstrueuse +3 BF, mêlée seulement : ni tir, ni attaque gratuite, ni attaque bonus) ; livre V5 : chiffre imprimé gardé (Taille incluse).
const clone = value => structuredClone(value);
// Comme le chargeur de l'outil : l'édition du livre est recopiée sur chaque profil.
const lib = book => { const file = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')); return file.profiles.map(profile => ({ ...profile, edition: file.edition })); };
const L06 = lib('L06'), L07 = lib('L07'), L11 = lib('L11');

async function fixture(beast) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { camp: 'ennemi', zone: 'active', states: [], equipment: [], ...beast, id: 'beast', extensions: { v5: { ...beast.extensions?.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q35' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
let seq = 0;
const hit = (store, action, v5 = {}) => store.previewResolution({ resolutionId: `q35-${++seq}`, actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', ...action }, v5: { kind: 'melee', ...v5 } });
const fixed = (store, damage) => hit(store, { name: 'Fixed', damage }).damage.finalDamage;
const attack = (participant, name) => ({ ...participant.actions.find(action => action.name === name), base: 60 });

test('Q35 Stégadon L07 : Queue 17 (BF 5 + 2 + Énorme +10), Morsure 9 + 10', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  assert.equal(hit(store, attack(stegadon, 'Tail')).damage.finalDamage, fixed(store, 17));
  assert.equal(hit(store, attack(stegadon, 'Bite')).damage.finalDamage, fixed(store, 19), 'Bite +9 = Valeur 9 (livre V4), Taille +10 (v3)');
  assert.equal(hit(store, attack(stegadon, 'Trampling Feet')).damage.finalDamage, fixed(store, 10), 'arme : dégâts imprimés');
});

test('Q35 Wyverne L11 : Queue 20 ; Ripperdactyl L07 : Queue 8', async () => {
  const wyvern = buildParticipantFromBestiary('E0-P-019', { library: L11 });
  const wyvernStore = await fixture(wyvern);
  assert.equal(hit(wyvernStore, attack(wyvern, 'Tail')).damage.finalDamage, fixed(wyvernStore, 20), 'BF 6 + 2 + 12 (Énorme, v3)');
  const ripper = buildParticipantFromBestiary('E0-P-299', { library: L07 });
  const ripperStore = await fixture(ripper);
  assert.equal(hit(ripperStore, attack(ripper, 'Tail')).damage.finalDamage, fixed(ripperStore, 8), 'BF 3 + 2 + Grande +3');
});

test('Q35 Chien L06 (livre V5) : le chiffre imprimé est gardé, Taille comprise', async () => {
  const dog = buildParticipantFromBestiary('E0-P-074', { library: L06 });
  assert.equal(inferNaturalAttackKey(dog, { name: 'Bite' }), null);
  const store = await fixture(dog);
  assert.equal(hit(store, attack(dog, 'Bite')).damage.finalDamage, fixed(store, 5));
});

test('Q35 le bonus de Taille ne vaut ni pour le tir, ni pour l’attaque bonus, ni pour la tentacule gratuite', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  const tail = attack(stegadon, 'Tail');
  const ranged=hit(store, tail, { kind: 'ranged' });
  assert.equal(ranged.test.details.modifiers.find(row=>row.id==='size:ranged-target')?.amount,-1,'la cible sans Trait est Moyenne face au Stégadon');
  assert.equal(ranged.damage.finalDamage, fixed(store, 7)-1, 'tir : BF+2 sans bonus de dégâts de Taille, avec −1 DR contre la cible plus petite');
  assert.equal(hit(store, tail, { extraAttack: true }).damage.finalDamage, fixed(store, 7), 'attaque bonus : sans Taille');
  assert.equal(planNaturalAttack(stegadon, 'tail').sizeBonus, 0, 'attaque naturelle choisie (bonus d’Élan) : sans Taille');
  assert.equal(planNaturalAttack(stegadon, 'tail', { ordinary: true }).sizeBonus, 10);
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: lib('L14') });
  assert.equal(planNaturalAttack(kraken, 'tentacles', { ordinary: true }).sizeBonus, 0, 'Tentacules : attaque gratuite');
});

test('Q35 Morsure sans Trait (livre V4) : le chiffre imprimé est la Valeur, la Taille s’y ajoute ; Taille Moyenne : inchangé', async () => {
  const large = { name: 'beast', kind: 'PNJ', caracs: { CC: 60, F: 40, E: 30, I: 40, M: 4 }, traits: ['Size (Large)'], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
  const store = await fixture(large);
  assert.equal(hit(store, { name: 'Bite', damage: 6 }).damage.finalDamage, fixed(store, 10), '6 imprimé + BF 4');
  assert.equal(hit(store, { name: 'Tail', damage: 1 }).damage.finalDamage, fixed(store, 10), 'sans Trait : BF 4 + 2 + Taille 4');
  const average = await fixture({ ...large, traits: [] });
  assert.equal(hit(average, { name: 'Bite', damage: 6 }).damage.finalDamage, fixed(average, 6));
});

test('Q35 L09 et L10 sont des livres V5 (« 5th Edition », Games Workshop 2026) : chiffre imprimé gardé, écarts listés pour le MJ', async () => {
  const index = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8')).books;
  for (const book of ['L06', 'L09', 'L10']) assert.equal(index.find(item => item.book === book).edition, 'V5');
  const crypt = buildParticipantFromBestiary('E0-P-374', { library: lib('L10') });
  assert.equal(inferNaturalAttackKey(crypt, { name: 'Bite' }), null);
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['tools/list-v5-natural-gaps.mjs', 'tmp/divin/ecarts-q35-test.json']);
  const { gaps } = JSON.parse(readFileSync('tmp/divin/ecarts-q35-test.json', 'utf8'));
  assert.ok(gaps.some(gap => gap.id === 'E0-P-322' && gap.attack === 'Tail' && gap.printed === 8 && gap.formulaPlusSize === 26));
});

test('Q35 Cornes en attaque ordinaire : la Charge du Trait est demandée', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  const horns = attack(stegadon, 'Horns');
  assert.ok(hit(store, horns).unresolved.some(text => /Charge/.test(text)));
  assert.ok(!hit(store, horns, { charging: true }).unresolved.some(text => /Charge est requise/.test(text)));
});
});

describe('compétences sans valeur', () => {
const load = id => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const library = ['L03', 'L14'].flatMap(load);

// Faux DOM minimal : assez pour lire le texte rendu.
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; }
  set textContent(value) { this.text = String(value); }
  get textContent() { return (this.text ?? '') + this.children.map(child => child.textContent).join(' '); }
  append(...nodes) { this.children.push(...nodes); }
}

test('Q37 lecture : seules les chaînes non vides sont gardées', () => {
  assert.deepEqual(unvaluedSkillNames(['Leadership', '', null, 'Lore (Geology)']), ['Leadership', 'Lore (Geology)']);
  assert.deepEqual(unvaluedSkillNames(undefined), []);
});

test('Q37 participant et Réserve : Gurniksson porte ses compétences sans valeur, hors de skills', () => {
  const participant = buildParticipantFromBestiary('E0-P-161', { library });
  assert.deepEqual(participant.extensions.v5.bestiary.unvaluedSkills, ['Leadership', 'Lore (Geology)', 'Stealth (Underground)']);
  assert.ok(!participant.skills.some(skill => /Leadership/.test(skill.name)));
  const reserve = buildReserveProfileFromBestiary('E0-P-161', { library });
  assert.equal(reserve.extensions.v5.bestiary.unvaluedSkills.length, 3);
});

test('Q37 rendu : fiche de la bibliothèque et fiche du participant affichent les compétences sans valeur', async () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const { renderBestiarySheet } = await import('../../../js/ui/bestiary-library.js');
    const record = library.find(profile => profile.id === 'E0-P-161');
    const sheet = renderBestiarySheet(record, { terms: new Map() });
    assert.match(sheet.textContent, /Compétences sans valeur imprimée : Leadership, Lore \(Geology\), Stealth \(Underground\)/);
    const { renderFicheDetails } = await import('../../../js/ui/fiche-details.js');
    const details = renderFicheDetails(buildParticipantFromBestiary('E0-P-161', { library }));
    assert.match(details.textContent, /Compétences sans valeur imprimée \(bestiaire\) \(3\)/);
    assert.match(details.textContent, /Lore \(Geology\)/);
    const other = library.find(profile => profile.kind !== 'template' && !profile.unvaluedSkills && profile.stats);
    const plain = renderFicheDetails(buildParticipantFromBestiary(other.id, { library }));
    assert.doesNotMatch(plain.textContent, /Compétences sans valeur imprimée/, 'Q42 : section masquée quand elle est vide');
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});

test('Q37 livre L14 : un profil à Language (Elthárin) sans valeur le montre aussi', () => {
  const withUnvalued = load('L14').find(profile => (profile.unvaluedSkills || []).some(name => /Elth/.test(name)));
  assert.ok(withUnvalued);
  const participant = buildParticipantFromBestiary(withUnvalued.id, { library });
  assert.ok(participant.extensions.v5.bestiary.unvaluedSkills.some(name => /Elth/.test(name)));
});
});

describe('contrôle de code des créatures', () => {
// Q38, deux cas de code : (1) attaque gratuite de tentacule au Round 0 dans un store neuf, sans rencontre (aucune scène, pas de combatId) ;
// (2) ancien participant de Réserve à une seule action « Tentacles » et au Trait « Tentacles (+9) » : le nombre est demandé, pas un quota silencieux de 1.
const clone = value => structuredClone(value);
const L14 = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;

async function freshStore() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const actor = { ...kraken, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...kraken.extensions.v5, hasMomentum: true } } };
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: {} } });
  return { store, tentacles: actor.actions.filter(action => /^Tentacles/.test(action.name)) };
}
const input = (action, n) => ({ resolutionId: `q38-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' } });

test('Q38 store neuf sans rencontre : l’attaque gratuite de tentacule au Round 0 est acceptée et le quota rappelé', async () => {
  const { store, tentacles } = await freshStore();
  const preview = store.previewResolution(input(tentacles[0], 0));
  assert.ok(!preview.unresolved?.length, JSON.stringify(preview.unresolved));
  assert.ok(preview.reminders.some(text => /Avant le premier Round.*8/.test(text)), JSON.stringify(preview.reminders));
  assert.equal((await store.applyResolution(preview)).status, 'applied');
});

test('Q38 store neuf sans rencontre : le quota de 8 est tenu', async () => {
  const { store, tentacles } = await freshStore();
  let done = 0;
  for (const [n, action] of [...tentacles, tentacles[0]].entries()) {
    const preview = store.previewResolution(input(action, n));
    if (preview.unresolved?.length) break;
    if ((await store.applyResolution(preview)).status !== 'applied') break;
    done += 1;
  }
  assert.equal(done, 8);
});

const old = actions => ({ name: 'old', kind: 'PNJ', caracs: { F: 50 }, traits: ['Tentacles (+9)'], actions, armor: { head: 0, body: 0, arms: 0, legs: 0 } });

test('Q38 ancien participant à une seule action « Tentacles » : le nombre est demandé', () => {
  const plan = planNaturalAttack(old([{ name: 'Tentacles', type: 'attack' }]), 'tentacles');
  assert.equal(plan.available, false);
  assert.ok(plan.unresolved.some(text => /nombre de tentacules/.test(text)), JSON.stringify(plan.unresolved));
  assert.equal(plan.quota, null, 'pas de quota silencieux de 1');
});

test('Q38 le nombre donné par le MJ lève la question', () => {
  const plan = planNaturalAttack(old([{ name: 'Tentacles', type: 'attack' }]), 'tentacles', { count: 4 });
  assert.equal(plan.available, true);
  assert.equal(plan.quota.maximum, 4);
});
});

describe('traits d’attaques', () => {
const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const L17 = book('L17');
const L20 = book('L20');
const L21 = book('L21');
const L22 = book('L22');
const L26 = book('L26');
const find = (list, id) => list.find(profile => profile.id === id);

test('Q4 : Carrion (L22) a des actions, dont 2 Griffes', () => {
  const participant = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  assert.ok(participant.actions.length >= 2);
  const record = find(L22, 'E0-P-757');
  assert.ok(record.attacks.some(attack => attack.count === 2 && /claws/i.test(attack.name)), JSON.stringify(record.attacks));
});

test('Q4 : Hattie Adler (L20) et les carcasses (L21) ont une attaque', () => {
  assert.ok(find(L20, 'E0-P-641').attacks.length >= 1);
  const carcasses = L21.filter(profile => /CARCASS/i.test(profile.name));
  assert.ok(carcasses.length >= 2);
  for (const record of carcasses) assert.ok(record.attacks?.length >= 1, record.name);
});

test('Q4 : les trois Élémentaires incarnés ont une Immunité', () => {
  const elementals = L17.filter(profile => /Incarnate Elemental/.test(profile.name));
  assert.equal(elementals.length, 3);
  for (const record of elementals) assert.ok(record.traits.some(trait => trait.name === 'Immunity' && trait.param), record.name);
});

test('Q4 : la précision « see below » est nettoyée (Reik Eels, L26)', () => {
  for (const record of L26) for (const trait of record.traits || []) assert.ok(!/^see\b/i.test(trait.param || ''), `${record.name} ${trait.name}`);
});
});

describe('défauts mineurs', () => {
// Q42 : défauts mineurs. Les points d'interface (rappel du personnage actif, section vide masquée) sont dans pro-q42-interface-browser.mjs.
const clone = value => structuredClone(value);
const lib = book => { const file = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')); return file.profiles.map(profile => ({ ...profile, edition: file.edition })); };
const L07 = lib('L07'), L14 = lib('L14');

async function fixture(beast, round = 1) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], ...beast, id: 'beast', extensions: { v5: { ...beast.extensions?.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round, order: ['beast', 'hero'], participants: [actor, hero], ...(round ? { currentActorId: 'beast' } : {}) }, log: [], diceLines: [], extensions: { v5: { combatId: 'q42', ...(round ? { turnIndex: 1 } : {}) } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
let seq = 0;
const hit = (store, action, v5 = {}) => store.previewResolution({ resolutionId: `q42-${++seq}`, actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', ...action }, v5: { kind: 'melee', ...v5 } });

test('Q42 Recommencer remet à zéro le quota d’attaques gratuites du Round 0 (Kraken : 8 tentacules)', async () => {
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const store = await fixture(kraken, 0);
  const tentacles = store.getCombat().participants.get('beast').actions.filter(action => /^Tentacles/.test(action.name));
  const run = async () => {
    let done = 0;
    for (const [n, action] of [...tentacles, tentacles[0]].entries()) {
      const preview = store.previewResolution({ resolutionId: `q42-r-${++seq}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone({ ...action, base: 60 }), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 2 } } }, v5: { kind: 'melee' } });
      if (preview.unresolved?.length || (await store.applyResolution(preview)).status !== 'applied') break;
      done += 1;
    }
    return done;
  };
  assert.equal(await run(), 8);
  await store.restartCombat();
  assert.equal(await run(), 8, 'après Recommencer, le quota du Round 0 est entier');
});

test('Q42 Taille sans Force lisible : le message est relayé', () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const sansForce = { ...stegadon, caracs: { ...stegadon.caracs, F: null } };
  const plan = planNaturalAttack(sansForce, 'bite', { ordinary: true });
  assert.ok(plan.unresolved.some(text => /^Taille : Force requise/.test(text)), JSON.stringify(plan.unresolved));
  const avec = planNaturalAttack(stegadon, 'bite', { ordinary: true });
  assert.ok(!avec.unresolved.some(text => /^Taille/.test(text)));
});

test('Q42 dégâts d’une action personnalisée remplacés par la formule : rappel visible, pas pour une action du bestiaire', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  const custom = hit(store, { name: 'Tail', damage: 3 });
  assert.equal(custom.damage.finalDamage, hit(store, { name: 'Fixe', damage: 17 }).damage.finalDamage);
  assert.ok(custom.reminders.some(text => /Dégâts de l’action \(3\) remplacés par la formule V5 du Trait \(17\)/.test(text)), JSON.stringify(custom.reminders));
  const tail = { ...stegadon.actions.find(action => action.name === 'Tail'), base: 60 };
  assert.ok(!hit(store, tail).reminders.some(text => /remplacés par la formule/.test(text)));
});
});

describe('armure des créatures', () => {
const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const library = ['L13', 'L18', 'L19', 'L20', 'L21', 'L23', 'L26'].flatMap(book);
const build = id => buildParticipantFromBestiary(id, { library });

test('Q6 : « Body » limite le PA au corps (E0-P-628)', () => {
  assert.deepEqual(build('E0-P-628').armor, { head: 0, body: 1, arms: 0, legs: 0 });
});

test('Q6 : zones nommées multiples, Headband, Chest, Rear Legs', () => {
  assert.deepEqual(build('E0-P-615').armor, { head: 0, body: 1, arms: 1, legs: 0 });
  assert.deepEqual(build('E0-P-550').armor, { head: 1, body: 0, arms: 0, legs: 0 });
  assert.deepEqual(build('E0-P-639').armor, { head: 0, body: 3, arms: 0, legs: 0 });
  assert.deepEqual(build('E0-P-459').armor, { head: 0, body: 0, arms: 0, legs: 1 });
});

test('Q6 : « Mail Coat 2 » prend les zones de la cotte de mailles du catalogue (corps et bras)', () => {
  const participant = build('E0-P-556');
  assert.deepEqual(participant.armor, { head: 0, body: 2, arms: 2, legs: 0 });
  assert.equal(participant.notes, '');
});

test('Q6 : « Helm 2, Plate 3 » : casque à la tête, plastron au corps', () => {
  assert.deepEqual(build('E0-P-575').armor, { head: 2, body: 3, arms: 0, legs: 0 });
});

test('Q6 : « Body 2 » nomme la zone sans catalogue', () => {
  assert.deepEqual(build('E0-P-627').armor, { head: 0, body: 2, arms: 0, legs: 0 });
});

test('Q6 : pièce inconnue ou sans valeur → PA à 0 et rappel visible', () => {
  for (const id of ['E0-P-593', 'E0-P-616', 'E0-P-704']) {
    const participant = build(id);
    assert.deepEqual(participant.armor, { head: 0, body: 0, arms: 0, legs: 0 }, id);
    assert.match(participant.notes, /Armure imprimée/, id);
  }
});

test('Q6 : la fiche de la bibliothèque affiche `detail`', () => {
  assert.match(readFileSync('js/ui/bestiary-library.js', 'utf8'), /armour\.detail/);
});
});

describe('traits de créature', () => {
// Écarts au livre de base V5 (L06, Traits de créature, pp.356-363).
const make = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { F: 50, E: 40, Int: 20, FM: 35 }, hp: 10, maxHp: 10, ...extra });

test('Q8 Langue — une touche donne Enchevêtré', () => {
  const plan = planNaturalAttack(make(['Tongue']), 'tongue', { actorSize: 4, targetSize: 2 });
  assert.deepEqual(plan.effects, [{ state: 'Enchevêtré', trigger: 'touche' }]);
  assert.equal(plan.available, true);
});

test('Q8 Souffle par type — dégâts, état et zone', () => {
  const breath = (type, caracs) => planNaturalAttack(make([`Breath (${type})`], { caracs }), 'breath');
  const fire = breath('Fire', { F: 50, E: 40 });
  assert.equal(fire.damageFormula, '8');
  assert.deepEqual(fire.effects, [{ state: 'Enflammé', trigger: 'cible perdante' }]);
  assert.match(fire.reminders.join(' '), /BF mètres/);
  assert.equal(breath('Acid', { F: 50, E: 40 }).damageFormula, '8');
  assert.equal(breath('Acid', { F: 50, E: 60 }).damageFormula, '10');
  assert.equal(breath('Cold', { F: 50, E: 40 }).damageFormula, '7');
  assert.deepEqual(breath('Cold', { F: 50 }).effects, [{ state: 'Fatigué', trigger: 'cible perdante' }]);
  assert.equal(breath('Electricity', { F: 50 }).damageFormula, '7');
  assert.deepEqual(breath('Electricity', { F: 50 }).effects, [{ state: 'Sonné', trigger: 'cible perdante' }]);
  assert.equal(breath('Poison', { F: 50, E: 40 }).damageFormula, '6');
  assert.deepEqual(breath('Poison', { F: 50, E: 40 }).effects, [{ state: 'Empoisonné', trigger: 'cible perdante' }]);
  const smoke = breath('Smoke', { F: 50, E: 40 });
  assert.equal(smoke.damageFormula, null);
  assert.match(smoke.reminders.join(' '), /fumée/);
  assert.match(breath('Acid', { F: 50 }).unresolved[0], /Endurance/);
  assert.equal(breath('Frost', { F: 50 }).damageFormula, null);
});

test('Q8 Nuée — 1 Blessure par Round à chaque engagé, rien à saisir', () => {
  const plan = planSwarm(make(['Swarm']));
  assert.deepEqual(plan.endOfRound, { damage: 'Blessure directe', amount: 1, targets: 'engagés', amountPrinted: true });
  assert.equal(plan.available, true);
  assert.deepEqual(plan.unresolved, []);
});

test('Q8 Bestial — sous la moitié des Blessures : fuite, ou Frénésie si Territorial', () => {
  const reaction = (traits, options) => planPsychology(make(traits, { hp: 4 }), 'bestial', options).effects.at(-1);
  assert.deepEqual(reaction(['Bestial']), { reaction: 'flee' });
  assert.deepEqual(reaction(['Bestial', 'Territorial']), { reaction: 'frenzy' });
  assert.deepEqual(reaction(['Bestial'], { protecting: true }), { reaction: 'frenzy' });
  assert.equal(planPsychology(make(['Bestial'], { hp: 4 }), 'bestial').available, true);
  assert.equal(planPsychology(make(['Bestial'], { hp: 8 }), 'bestial').effects.some(effect => effect.reaction), false);
});

test('Q8 Dressé — liste V5 avec ses effets, liste V4 conservée', () => {
  const effect = detail => planCreatureMagic(make([`Trained (${detail})`]), 'trained').effects.find(item => item.trainedEffect)?.trainedEffect;
  assert.deepEqual(effect('Broken'), { skill: 'Brisé', ignoresBestial: true, fellowshipBonus: '+2d10' });
  assert.equal(effect('Drive').pullsVehicles, true);
  assert.deepEqual(effect('Entertain'), { skill: 'Divertissement', skills: ['Entertain', 'Perform', 'Play'], bonus: 10 });
  assert.equal(effect('Fetch').fetches, true);
  assert.equal(effect('Guard').grantsTrait, 'Territorial');
  assert.equal(effect('Home').returnsHome, true);
  assert.equal(effect('Magic').ignoresSkittish, 'magie');
  assert.equal(effect('Mount').requiresRideSkill, true);
  assert.deepEqual(effect('War'), { skill: 'Guerre', weaponSkillBonus: 10, ignoresSkittish: 'bruits forts', onlyMountForCombat: true });
  assert.equal(planCreatureMagic(make(['Dressé (Brisé)']), 'trained').effects[0].trainedSkill, 'Brisé');
  assert.deepEqual(planCreatureMagic(make(['Trained (Dig)']), 'trained').effects, [{ trainedSkill: 'Creuser' }]);
});

test('Q8 Artificiel — toutes ses attaques sont Magiques (moteur de nature d\'attaque)', () => {
  const golem = make(['Construct']);
  assert.equal(attacksAreMagical(golem), true);
  assert.equal(attacksAreMagical(make(['Bite'])), false);
  assert.match(natureReminders(golem).join(' '), /attaques sont Magiques/);
  assert.equal(weaponAttackNature({ actor: golem, action: {}, ranged: false }).magical, true);
  assert.notEqual(weaponAttackNature({ actor: make(['Bite']), action: {}, ranged: false }).magical, true);
  assert.equal(weaponAttackNature({ actor: golem, action: {}, ranged: false, declared: { magical: false } }).magical, false);
});

test('Q8 Effrayé (v3 p.356) — Peur (2) de la cible, quel que soit son indice de Peur', () => {
  const afraid = make(['Afraid (Orcs)'], { camp: 'pj' });
  const plan = planPsychology(afraid, 'afraid', { source: make(['Fear (3)'], { id: 'o', camp: 'monstres' }) });
  assert.equal(plan.states[0].rating, 2);
  assert.equal(planPsychology(afraid, 'afraid', { source: make(['Fear'], { id: 'o', camp: 'monstres' }) }).states[0].rating, 2);
  assert.equal(planPsychology(afraid, 'afraid', { source: make([], { id: 'o', camp: 'monstres' }) }).states[0].rating, 2, 'la cible n’a pas besoin d’une Peur imprimée');
  const none = planPsychology(afraid, 'afraid');
  assert.equal(none.available, false);
  assert.deepEqual(none.states, []);
});
});

describe('natures', () => {
const library = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const build = id => buildParticipantFromBestiary(id, { library });
const mundane = attackNature({ ranged: false, magical: false });
const magic = attackNature({ ranged: false, magical: true, spell: true });
const synthetic = traits => ({ id: 'x', name: 'X', traits });

test('T1 lecture des Traits de nature : nom canonique anglais ou français, précision entre parenthèses', () => {
  assert.deepEqual(parseNatureTrait('Daemonic (8+)'), { key: 'daemonic', name: 'Daemonic', detail: '8+' });
  assert.equal(parseNatureTrait('Éthéré').key, 'ethereal');
  assert.equal(parseNatureTrait('Insensible à la douleur').key, 'painless');
  assert.equal(parseNatureTrait('Artificiel').key, 'construct');
  assert.equal(parseNatureTrait('Frenzy'), null);
});

test('T1 Éthéré (Fantôme E0-P-096) — une attaque non magique ne blesse pas, une attaque magique si', () => {
  const ghost = build('E0-P-096');
  assert.equal(previewMagicProtection(ghost, 6, { nature: mundane }).amount, 0);
  assert.equal(previewMagicProtection(ghost, 6, { nature: mundane }).immune, true);
  assert.equal(previewMagicProtection(ghost, 6, { nature: magic }).amount, 6);
  assert.deepEqual(targetNatureTags(ghost, { ranged: false }), ['magical']);
});

test('T1 Démoniaque (Sanguinaire E0-P-107, 8+) — d10 au seuil annule un coup non magique, pas un sort', () => {
  const daemon = build('E0-P-107');
  assert.equal(natureProtection(daemon).wards[0].threshold, 8);
  const missing = previewMagicProtection(daemon, 7, { nature: mundane });
  assert.equal(missing.ready, false);
  assert.match(missing.error, /8\+/);
  assert.equal(previewMagicProtection(daemon, 7, { nature: mundane, wardRoll: 8 }).amount, 0);
  assert.equal(previewMagicProtection(daemon, 7, { nature: mundane, wardRoll: 7 }).amount, 7);
  assert.equal(previewMagicProtection(daemon, 7, { nature: magic }).amount, 7);
});

test('T1 Protection (Ward) — toute attaque, indice du Trait', () => {
  const warded = synthetic(['Ward (9+)']);
  assert.equal(previewMagicProtection(warded, 5, { nature: magic, wardRoll: 9 }).wardSaved, true);
  assert.equal(previewMagicProtection(warded, 5, { nature: magic, wardRoll: 8 }).amount, 5);
  assert.equal(previewMagicProtection(synthetic(['Protection (3)']), 5, { nature: mundane, wardRoll: 3 }).amount, 0);
});

test('T1 Immunité — feu et froid automatisés ; type non géré laissé en rappel', () => {
  const fireproof = synthetic(['Immunity (Fire, Poison)']);
  assert.equal(previewMagicProtection(fireproof, 5, { nature: attackNature({ ranged: false, magical: false, fire: true }) }).amount, 0);
  assert.equal(previewMagicProtection(fireproof, 5, { nature: attackNature({ ranged: false, magical: false, fire: false }) }).amount, 5);
  assert.ok(natureProtection(fireproof).reminders.some(text => /Poison/i.test(text)));
});

test('T1 Artificiel — Endurance remplace Volonté quand Volonté manque ; Volonté imprimée jamais remplacée', () => {
  const skeleton = build('E0-P-093');
  assert.equal(skeleton.caracs.FM == null || skeleton.caracs.FM === 0, true);
  assert.deepEqual(willpowerBase(skeleton), { value: skeleton.caracs.E, replacedBy: 'E' });
  assert.equal(willpowerBase({ traits: ['Construct'], caracs: { FM: 25, E: 40 } }).value, 25);
  assert.equal(willpowerBase({ traits: [], caracs: { E: 40 } }).value, null);
  assert.equal(fearAction({ ...skeleton, states: [] }), null);
});

test('T1 rappels — besoins vitaux, Insensible à la douleur, Bouclier', () => {
  const reminders = natureReminders(synthetic(['Undead', 'Painless', 'Shield (2)']));
  assert.ok(reminders.some(text => /boire, manger/.test(text)));
  assert.ok(reminders.some(text => /douleur/.test(text)));
  assert.ok(reminders.some(text => /Bouclier/.test(text)));
  assert.deepEqual(natureReminders(synthetic(['Frenzy'])), []);
});
});

describe('taille', () => {
const creature = (traits, extra = {}) => ({ id: 'c', name: 'Créature', traits, hp: 20, maxHp: 20, caracs: { F: 50, E: 40, FM: 30 }, camp: 'monstres', ...extra });

test('T10 lecture du Trait : anglais ou français, rang sur l’échelle à sept crans du moteur', () => {
  assert.deepEqual(parseSizeTrait('Size (Large)'), { key: 'large', rank: 4, label: 'Grande' });
  assert.equal(parseSizeTrait('Taille (Énorme)').key, 'enormous');
  assert.equal(parseSizeTrait('Taille (Monstrueuse)').rank, 6);
  assert.equal(parseSizeTrait('Size (Small)').rank, 2);
  assert.equal(parseSizeTrait('Size (Average) Stride').key, 'average');
  assert.equal(parseSizeTrait('Bite'), null);
  assert.equal(parseSizeTrait('Size (Gigantic)'), null);
  assert.equal(SIZE_RANKS.average, 3);
});

test('T10 taille du participant : Trait, sinon champ du profil, sinon Moyenne supposée', () => {
  assert.equal(creatureSizeOf(creature(['Size (Large)'])).key, 'large');
  assert.equal(creatureSizeOf(creature(['Bite'], { size: 'enormous' })).key, 'enormous');
  const none = creatureSizeOf(creature(['Bite']));
  assert.equal(none.key, 'average');
  assert.equal(none.assumed, true);
});

test('T10 barème de la page 360 : bonus de dégâts en mêlée et poids au surnombre', () => {
  const rows = [['Size (Small)', 'none', 1], ['Size (Average)', 'none', 1], ['Size (Large)', 'bf', 2], ['Size (Enormous)', 'twiceBf', 3], ['Size (Monstrous)', 'thriceBf', 4]];
  for (const [trait, kind, weight] of rows) {
    const plan = planCreatureSize(creature([trait]));
    assert.equal(plan.damage.kind, kind, trait);
    assert.equal(plan.outnumberWeight, weight, trait);
  }
});

test('T10 profil imprimé : dégâts déjà inclus, rien n’est ajouté ; sans profil, le bonus est calculé sur la Force', () => {
  const printed = planCreatureSize(creature(['Size (Monstrous)']));
  assert.equal(printed.damage.included, true);
  assert.equal(printed.damage.bonus, 0);
  const built = planCreatureSize(creature(['Size (Monstrous)']), { printedProfile: false });
  assert.equal(built.damage.bonus, 15, 'Monstrueuse +3 BF (v3)');
  assert.equal(planCreatureSize(creature(['Size (Large)']), { printedProfile: false }).damage.bonus, 5);
  const noForce = planCreatureSize(creature(['Size (Large)'], { caracs: {} }), { printedProfile: false });
  assert.equal(noForce.available, false);
  assert.equal(noForce.unresolved.length, 1);
});

test('T10 écart de Taille avec un adversaire : plus grande créature, écart, Peur de taille à confirmer', () => {
  const plan = planCreatureSize(creature(['Size (Enormous)']), { opponent: creature(['Size (Average)']) });
  assert.equal(plan.versus.gap, 2);
  assert.equal(plan.versus.larger, 'self');
  assert.deepEqual(plan.versus.fearInputs, { actorSize: 5, targetSize: 3, needsAggressive: true });
  const same = planCreatureSize(creature(['Size (Large)']), { opponent: creature(['Size (Large)']) });
  assert.equal(same.versus.larger, null);
  assert.equal(same.versus.fearInputs, null);
  const smaller = planCreatureSize(creature(['Size (Small)']), { opponent: creature(['Size (Large)']) });
  assert.equal(smaller.versus.larger, 'opponent');
  assert.equal(smaller.versus.fearInputs, null);
});

test('T10 Blessures recalculées sur demande (p. 361), jamais pour un profil imprimé', () => {
  const plan = planCreatureSize(creature(['Size (Large)']), { recomputeWounds: true });
  assert.equal(plan.wounds.value, (5 + 8 + 3) * 2);
  assert.equal(planCreatureSize(creature(['Size (Large)'])).wounds, null);
  const small = planCreatureSize(creature(['Size (Small)']), { recomputeWounds: true });
  assert.equal(small.wounds.value, 8);
  const missing = planCreatureSize(creature(['Size (Large)'], { caracs: { F: 50 } }), { recomputeWounds: true });
  assert.equal(missing.available, false);
});

test('T10 Petit : lecture V5 du livre, homebrew local rappelé sans migration', () => {
  const plan = planCreatureSize(creature(['Size (Small)']));
  assert.ok(plan.reminders.some(text => /Petit/.test(text) && /homebrew/i.test(text)));
});

test('T10 reçu et rappels', () => {
  const plan = planCreatureSize(creature(['Size (Large)']));
  assert.equal(plan.receipt.ability, 'Taille');
  assert.equal(plan.receipt.size, 'Grande');
  assert.equal(sizeReminders(creature(['Size (Large)'])).length, 1);
  assert.deepEqual(sizeReminders(creature(['Bite'])), []);
});
});

describe('gabarits', () => {
const book = id => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const L12 = book('L12');
const L06 = book('L06');
const byId = (library, id) => library.find(profile => profile.id === id);

test('T11 Massif troll sur le Troll commun de base : modificateurs signés, Taille remplacée, sans recalcul', () => {
  const base = byId(L12, 'E0-P-403');
  const { record, errors } = applyBestiaryTemplates(base, byId(L12, 'E0-P-448'));
  assert.deepEqual(errors, []);
  assert.equal(record.stats.M, base.stats.M - 1);
  assert.equal(record.stats.F, 60);
  assert.equal(record.stats.E, 50);
  assert.equal(record.stats.I, base.stats.I - 3);
  assert.equal(record.stats.Ag, 10);
  assert.equal(record.stats.CC, base.stats.CC);
  assert.equal(record.wounds, base.wounds);
  assert.equal(record.size, 'enormous');
  const sizes = record.traits.filter(trait => trait.name === 'Size');
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].param, 'Enormous');
  assert.deepEqual(record.appliedTemplates, ['E0-P-448']);
  assert.match(record.name, /\(Hulking Troll\)$/);
  assert.equal(base.stats.F, 55, 'le profil de base n’est pas modifié');
});

test('T11 gabarit de Troll de Chaos : Trait ajouté, mot-clé fusionné, deux gabarits cumulés', () => {
  const base = byId(L12, 'E0-P-403');
  const { record } = applyBestiaryTemplates(base, [byId(L12, 'E0-P-444'), byId(L12, 'E0-P-448')]);
  assert.ok(record.traits.some(trait => trait.name === 'Corruption'));
  assert.ok(record.keywords.includes('chaos') || record.keywords.length >= base.keywords.length);
  assert.equal(record.stats.CC, base.stats.CC + 10);
  assert.equal(record.stats.F, base.stats.F + 10);
  assert.deepEqual(record.appliedTemplates, ['E0-P-444', 'E0-P-448']);
});

test('T11 gabarit de compétences : bonus ajouté à une compétence tenue, sinon ajouté et signalé', () => {
  const soldier = byId(L06, 'E0-P-112');
  const base = L06.find(profile => profile.kind === 'profile' && (profile.skills || []).some(skill => (soldier.skills || []).some(s => s.name === skill.name)));
  assert.ok(base, 'un profil du livre de base partage une compétence avec le gabarit Soldat');
  const shared = soldier.skills.find(skill => base.skills.some(s => s.name === skill.name));
  const before = base.skills.find(skill => skill.name === shared.name).value;
  const { record, reminders } = applyBestiaryTemplates(base, soldier);
  assert.equal(record.skills.find(skill => skill.name === shared.name).value, before + shared.value);
  assert.equal(base.skills.find(skill => skill.name === shared.name).value, before);
  assert.ok(Array.isArray(reminders));
});

test('T11 refus : gabarit sur gabarit, profil à la place du gabarit, caractéristique vide, résultat négatif borné', () => {
  const template = byId(L12, 'E0-P-448');
  assert.ok(applyBestiaryTemplates(template, template).errors.length);
  assert.ok(applyBestiaryTemplates(byId(L12, 'E0-P-403'), byId(L12, 'E0-P-403')).errors.length);
  const base = structuredClone(byId(L12, 'E0-P-403'));
  base.stats.Ag = null;
  const refused = applyBestiaryTemplates(base, template);
  assert.equal(refused.record, null);
  assert.match(refused.errors.join(' '), /Ag absente/);
  const weak = structuredClone(byId(L12, 'E0-P-403'));
  weak.stats.I = 2;
  assert.equal(applyBestiaryTemplates(weak, template).record.stats.I, 0);
});

test('T11 modificateur de Blessures (Enfant d’Ulric, L19) et participant final', () => {
  const L19 = book('L19');
  const ulric = byId(L19, 'E0-P-598');
  const base = L19.find(profile => profile.kind === 'profile' && profile.stats.Soc !== null && profile.stats.Soc >= 20 && profile.stats.Dex !== null && profile.stats.Int !== null);
  const { record, errors } = applyBestiaryTemplates(base, ulric);
  assert.deepEqual(errors, []);
  assert.equal(record.wounds, base.wounds + 4);
  assert.equal(record.stats.Soc, base.stats.Soc - 20);
  const participant = buildParticipantFromTemplatedBestiary(base.id, [ulric.id], { library: L19 });
  assert.equal(participant.maxHp, base.wounds + 4);
  assert.equal(participant.caracs.F, base.stats.F + 10);
  assert.deepEqual(participant.extensions.v5.bestiary.appliedTemplates, [ulric.id]);
  assert.throws(() => buildParticipantFromTemplatedBestiary(base.id, ['E0-P-000'], { library: L19 }), /gabarit/);
});
});

describe('capacités propres', () => {
const inventory = JSON.parse(readFileSync(new URL('../../../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8')).traits;
const book = id => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const inScope = n => (n >= 96 && n <= 161) || (n >= 173 && n <= 205) || (n >= 250 && n <= 288);
const number = id => Number(id.slice(5));

test('T12 chaque capacité du périmètre a une disposition : prise en charge par un lot, ou rappel motivé', () => {
  const expected = inventory.filter(trait => inScope(number(trait.id))).map(trait => trait.id);
  assert.equal(expected.length, 66 + 33 + 39);
  assert.deepEqual(CREATURE_ABILITIES.map(entry => entry.id).sort(), expected.slice().sort());
  for (const entry of CREATURE_ABILITIES) {
    assert.ok(['covered', 'reminder'].includes(entry.status), entry.id);
    assert.ok(entry.summaryFr.length > 10, entry.id);
    if (entry.status === 'covered') assert.match(entry.by, /^T\d+/, entry.id);
    else assert.ok(entry.motive.length > 20, `${entry.id} : motif manquant`);
  }
});

test('T12 raccordements par famille aux lots précédents', () => {
  const by = id => abilityDisposition(id).by;
  assert.equal(by('E0-T-105'), 'T4 Fouissage');
  assert.equal(by('E0-T-150'), 'T4 Respiration aquatique');
  assert.equal(by('E0-T-142'), 'T5 Sens vibratoires');
  assert.equal(by('E0-T-138'), 'T6 Frénésie');
  assert.equal(by('E0-T-140'), 'T6 Rage');
  assert.equal(by('E0-T-253'), 'T3 Déclencheurs de mort');
  assert.equal(by('E0-T-135'), 'T3 Venin');
  assert.equal(by('E0-T-108'), 'T2 Souffle');
  assert.equal(by('E0-T-195'), 'T7 Dressé');
  assert.equal(by('E0-T-267'), 'T7 Marques du Chaos');
  assert.equal(by('E0-T-287'), 'T1 Bouclier');
  assert.equal(abilityDisposition('E0-T-104').status, 'reminder');
  assert.equal(abilityDisposition('E0-T-001'), null);
});

test('T12 reçu : une capacité en rappel dit pourquoi elle n\'est pas calculée, sans rien écrire', () => {
  const plan = planCreatureAbility('E0-T-104');
  assert.equal(plan.available, false);
  assert.equal(plan.effects.length, 0);
  assert.match(plan.receipt.reminder, /Avaler|englouti|Force opposée|entrave/i);
  assert.ok(plan.receipt.motive.length > 20);
  const covered = planCreatureAbility('E0-T-105');
  assert.equal(covered.available, true);
  assert.equal(covered.receipt.coveredBy, 'T4 Fouissage');
  assert.equal(planCreatureAbility('E0-T-999').available, false);
});

test('T12 profils réels : Drakwald Mancatcher (Spiteful) et Forest Goblin Shaman (Snare \'Em Good)', () => {
  const library = book('L11');
  const spider = buildParticipantFromBestiary('E0-P-003', { library });
  const lines = creatureAbilityReminders(spider);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /T6 Haine/);
  const shaman = buildParticipantFromBestiary('E0-P-006', { library });
  const [line] = creatureAbilityReminders(shaman);
  assert.match(line, /Rappel/);
  assert.deepEqual(uncoveredAbilityRefs(shaman), ['E0-T-097']);
  assert.deepEqual(uncoveredAbilityRefs(spider), []);
});

test('T12 un participant sans capacité propre, ou une référence hors périmètre, ne produit aucun rappel', () => {
  assert.deepEqual(creatureAbilityReminders({ extensions: { v5: { bestiary: { abilityRefs: ['E0-T-001'] } } } }), []);
  assert.deepEqual(creatureAbilityReminders({}), []);
  assert.deepEqual(creatureAbilityReminders(null), []);
});
});

describe('combat naturel', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const build = (book, id) => buildParticipantFromBestiary(id, { library: load(book) });
const synthetic = (traits, F = 50) => ({ id: 'x', name: 'X', traits, caracs: { F } });

test('T2 lecture des Traits de combat naturel, anglais ou français', () => {
  assert.deepEqual(parseNaturalTrait('Tentacles (4)'), { key: 'tentacles', name: 'Tentacles', detail: '4' });
  assert.equal(parseNaturalTrait('Morsure').key, 'bite');
  assert.equal(parseNaturalTrait('Attaque caudale').key, 'tail');
  assert.equal(parseNaturalTrait('Claws +6').key, 'v4-weapon');
  assert.equal(parseNaturalTrait('Frenzy'), null);
});

test('T2 Cornes (Rhinox E0-P-127) — Charge requise, dégâts BF+4, aucun Élan', () => {
  const rhinox = build('L01', 'E0-P-127');
  const noCharge = planNaturalAttack(rhinox, 'horns');
  assert.equal(noCharge.available, false);
  assert.match(noCharge.unresolved[0], /Charge/);
  const charged = planNaturalAttack(rhinox, 'horns', { charged: true });
  assert.equal(charged.available, true);
  assert.equal(charged.damageFormula, '10');
  assert.deepEqual(charged.costs, []);
});

test('T2 Attaque caudale — 1 Élan, BF+2, À terre proposé pour une cible plus petite blessée', () => {
  const plan = planNaturalAttack(synthetic(['Tail']), 'tail');
  assert.deepEqual(plan.costs, [{ resource: 'momentum', amount: 1 }]);
  assert.equal(plan.damageFormula, '7');
  assert.ok(plan.effects.some(effect => effect.state === 'À terre'));
  assert.equal(plan.receipt.costs[0], '1 Élan');
});

test('T2 Piétinement et Langue — la cible doit être plus petite, Tailles à préciser', () => {
  const stomper = synthetic(['Stomp']);
  assert.match(planNaturalAttack(stomper, 'stomp').unresolved[0], /Tailles/);
  assert.match(planNaturalAttack(stomper, 'stomp', { actorSize: 3, targetSize: 3 }).unresolved[0], /plus petite/);
  const ok = planNaturalAttack(stomper, 'stomp', { actorSize: 4, targetSize: 2 });
  assert.equal(ok.available, true);
  assert.equal(ok.damageFormula, '5');
  // Q18 (livre de base p.362) : la Taille ne décide que de l'attirance de la cible, pas de l'Enchevêtré.
  const tongue = planNaturalAttack(synthetic(['Tongue']), 'tongue', { actorSize: 2, targetSize: 3 });
  assert.equal(tongue.available, true);
  assert.ok(tongue.effects.some(effect => effect.state === 'Enchevêtré'));
});

test('T2 Tentacules (4) — quatre attaques gratuites par Tour, sans Élan', () => {
  const plan = planNaturalAttack(synthetic(['Tentacles (4)']), 'tentacles', { used: 3 });
  assert.equal(plan.available, true);
  assert.deepEqual(plan.quota, { id: 'creature:tentacles', scope: 'turn', maximum: 4 });
  assert.deepEqual(plan.costs, []);
  assert.equal(planNaturalAttack(synthetic(['Tentacles (4)']), 'tentacles', { used: 4 }).available, false);
  assert.equal(planNaturalAttack(synthetic(['Tentacles']), 'tentacles').available, false);
});

test('T2 Toile (Araignée géante E0-P-076) — la touche donne un Enchevêtré de la Force du Trait', () => {
  const spider = build('L06', 'E0-P-076');
  const plan = planNaturalAttack(spider, 'web');
  assert.deepEqual(plan.effects, [{ state: 'Enchevêtré', trigger: 'touche', strength: 40 }]);
  assert.equal(planNaturalAttack(synthetic(['Web']), 'web').available, false);
});

test('T2 Constricteur (Liane E0-P-273) et Étreinte glaciale (Mournguls E0-P-690)', () => {
  assert.equal(planNaturalAttack(build('L07', 'E0-P-273'), 'constrictor').effects[0].state, 'Enchevêtré');
  const chill = planNaturalAttack(build('L21', 'E0-P-690'), 'chill');
  assert.deepEqual(chill.costs, [{ resource: 'momentum', amount: 1 }]);
  assert.ok(chill.effects.some(effect => effect.direct && effect.damage === '1d10+DR'));
  assert.match(chill.reminders.join(' '), /magique/);
});

test('T2 Hurlement : une fois par Tour ; variante Imperial Zoo signalée', () => {
  const ghost = build('L10', 'E0-P-370');
  assert.equal(planNaturalAttack(ghost, 'howl').quota.maximum, 1);
  assert.equal(planNaturalAttack(ghost, 'howl', { used: 1 }).available, false);
  const zooLike = { ...synthetic(['Ghostly Howl']), extensions: { v5: { bestiary: { book: 'L11' } } } };
  assert.match(planNaturalAttack(zooLike, 'howl').reminders.join(' '), /Zoo.*E0-T-090/);
});

test('T2 Regard pétrifiant (Cockatrice E0-P-041), Souffle (Dread Maw E0-P-012) : coût et rappels', () => {
  const gaze = planNaturalAttack(build('L11', 'E0-P-041'), 'gaze');
  assert.equal(gaze.costs.length, 1);
  assert.equal(gaze.opposed, 'Initiative');
  const breath = planNaturalAttack(build('L11', 'E0-P-012'), 'breath');
  assert.deepEqual(breath.costs, []);
  assert.match(breath.reminders.join(' '), /Esquive par cible/);
});

test('T2 plan d\'un Trait absent, Morsure à dégâts imprimés, armes V4, rappels de fiche', () => {
  const absent = planNaturalAttack(synthetic([]), 'bite');
  assert.equal(absent.available, false);
  assert.match(absent.unresolved[0], /Trait absent/);
  const bite = planNaturalAttack(synthetic(['Bite']), 'bite');
  assert.equal(bite.damageFormula, `${Math.floor(Number(synthetic([]).caracs.F) / 10) + 3}`, 'v3 p.356 : Morsure sans valeur = BF+3');
  assert.equal(bite.costs.length, 1);
  assert.equal(planNaturalAttack(synthetic(['Bite']), 'bite', { momentum: false }).available, false);
  assert.equal(planV4NaturalWeapon(synthetic(['Claws +6'])).damageFormula, 'imprimé');
  assert.deepEqual(naturalCombatTraits(synthetic(['Bite', 'Bite', 'Frenzy'])).map(trait => trait.key), ['bite']);
  assert.equal(naturalCombatReminders(synthetic(['Bite', 'Tail'])).length, 2);
});

test('T2 branchement : le contexte naturalAttack exige le Trait et coûte un Élan (calcul des coûts)', async () => {
  const source = readFileSync(new URL('../../../js/core/v5-store-action.js', import.meta.url), 'utf8');
  assert.match(source, /planNaturalAttack/);
  assert.match(source, /context\.naturalAttack/);
});
});

describe('états continus', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const build = (book, id) => buildParticipantFromBestiary(id, { library: load(book) });
const synthetic = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { E: 40 }, hp: 10, ...extra });

test('T3 lecture des Traits d\'état, anglais ou français', () => {
  assert.deepEqual(parseStateTrait('Venom (Difficult)'), { key: 'venom', name: 'Venom', detail: 'Difficult' });
  assert.equal(parseStateTrait('Sang corrosif').key, 'corrosive');
  assert.equal(parseStateTrait('Parasité').key, 'infestation');
  assert.equal(parseStateTrait('Frenzy'), null);
  assert.deepEqual(stateTraits(synthetic(['Venom', 'Venom', 'Bite'])).map(trait => trait.key), ['venom']);
});

test('T3 Venin (Vipère impériale E0-P-836) — Empoisonné proposé à la blessure, difficulté à saisir si absente', () => {
  const viper = build('L24', 'E0-P-836');
  const plan = planStateOnWound(viper, 'venom');
  assert.equal(plan.effects[0].state, 'Empoisonné');
  assert.equal(plan.effects[0].trigger, 'blessure infligée');
  const withDifficulty = planStateOnWound(synthetic(['Venom (Difficult)']), 'venom');
  assert.equal(withDifficulty.available, true);
  assert.equal(withDifficulty.effects[0].recoveryDifficulty, 'Difficult');
  assert.equal(planStateOnWound(synthetic(['Venom']), 'venom').available, false);
});

test('T3 Infecté, Parasité, Maladie (Rat de peste E0-P-735)', () => {
  const rat = build('L22', 'E0-P-735');
  const infected = planStateOnWound(rat, 'infected');
  assert.deepEqual(infected.tests, [{ test: 'Endurance', modifier: '+4 DR', onFail: 'Plaie Purulente' }]);
  assert.equal(planStateOnWound(rat, 'infected', { living: false }).available, false);
  assert.deepEqual(planStateOnWound(synthetic(['Infestation']), 'infestation').targetedModifier, { scope: 'mêlée', dr: -1 });
  assert.equal(planStateOnWound(synthetic(['Disease (Peste noire)']), 'disease').effects[0].disease, 'Peste noire');
  assert.match(planStateOnWound(rat, 'disease').effects[0].disease, /Black Plague/);
  assert.equal(planStateOnWound(synthetic(['Disease']), 'disease').available, false);
});

test('T3 Sang corrosif (Hellbeast E0-P-729) — un seul d10 partagé entre les engagés', () => {
  const plan = planStateOnWound(build('L22', 'E0-P-729'), 'corrosive');
  assert.deepEqual(plan.damage, { formula: '1d10', shared: true, targets: 'tous les engagés', trigger: 'blessure reçue', singleRoll: true });
  assert.equal(plan.receipt.damage, '1d10');
});

test('T3 Vampirique (Vampire noble E0-P-926) — soin égal aux Blessures infligées par Morsure sur proie admissible', () => {
  const vampire = build('L26', 'E0-P-926');
  assert.equal(planVampiricHeal(vampire, { wounds: 6, viaBite: true, preyAdmissible: true }).heal.amount, 6);
  assert.equal(planVampiricHeal(vampire, { wounds: 6, viaBite: false, preyAdmissible: true }).heal, null);
  assert.match(planVampiricHeal(vampire, { wounds: 6, viaBite: true }).unresolved[0], /admissible/);
  assert.match(planVampiricHeal(vampire, {}).unresolved[0], /Blessures infligées/);
});

test('T3 Nuée (Lurkerfish E0-P-905) — Psychologie et Taille ignorées, tir à −4 DR, Blessures de fin de Round à saisir', () => {
  const plan = planSwarm(build('L25', 'E0-P-905'));
  assert.deepEqual(plan.ignores, { psychology: true, size: true, engagementForMovement: true });
  assert.equal(plan.rangedAgainst.dr, -4);
  assert.equal(plan.endOfRound.amount, 1); // corrigé en Q8 : 1 Blessure par Round à chaque engagé
  assert.equal(planSwarm(synthetic([])).available, false);
});

test('T3 Instable — deux Blessures si engagé contre un Élan adverse sans le sien', () => {
  const unstable = synthetic(['Unstable'], { hp: 2 });
  const hit = planUnstableEndOfRound(unstable, { engaged: true, enemyMomentum: 2, ownMomentum: 0 });
  assert.deepEqual(hit.damage, { amount: 2, direct: true, trigger: 'fin de Round' });
  assert.equal(hit.effects[0].state, 'Disparition');
  const safe = planUnstableEndOfRound(unstable, { engaged: true, enemyMomentum: 2, ownMomentum: 1 });
  assert.equal(safe.damage, null);
  assert.equal(planUnstableEndOfRound(unstable, {}).available, false);
  const zoo = synthetic(['Unstable'], { extensions: { v5: { bestiary: { book: 'L11' } } } });
  assert.match(planUnstableEndOfRound(zoo, { engaged: true, enemyMomentum: 1, ownMomentum: 0 }).unresolved[0], /E0-T-092/);
});

test('T3 Increvable (Cockatrice-like E0-P-896 Throgg) — BE Rounds, corps intact exigé', () => {
  const throgg = build('L25', 'E0-P-896');
  const plan = planDieHard(throgg, { bodyIntact: true });
  assert.equal(plan.available, true);
  assert.equal(plan.tests[0].rounds, Math.floor(throgg.caracs.E / 10));
  assert.equal(plan.tests[0].modifier, '6 DR');
  assert.equal(planDieHard(throgg, {}).available, false);
});

test('T3 Scission (Horreur rose E0-P-789) — à la Critique ou à zéro Blessure', () => {
  const horror = build('L23', 'E0-P-789');
  assert.equal(planSplit(horror, { critical: true }).effects[0].spawn.count, 2);
  assert.equal(planSplit(horror, { hp: 0 }).available, true);
  assert.equal(planSplit(horror, {}).available, false);
});

test('T3 déclencheurs de mort et reformation portés par les capacités du profil', () => {
  const squig = planDeathTriggers(build('L21', 'E0-P-692'));
  assert.equal(squig.length, 1);
  assert.equal(squig[0].effects[0].onFail.damage, '2d10');
  const colossus = planDeathTriggers(build('L21', 'E0-P-693'));
  assert.equal(colossus.find(plan => plan.key === 'E0-T-256').effects[0].spawn.count, '3d10');
  const guardian = planDeathTriggers(build('L19', 'E0-P-597'));
  assert.equal(guardian.find(plan => plan.key === 'E0-T-259').effects[0].reform.delay, 'd10 jours');
  const inta = build('L24', 'E0-P-867');
  const noCause = planDeathTriggers(inta)[0];
  assert.equal(noCause.available, false);
  assert.equal(planDeathTriggers(inta, { causeUnstable: true })[0].available, true);
  assert.deepEqual(planDeathTriggers(synthetic([])), []);
});

test('T3 rappels de fiche sans doublon', () => {
  assert.equal(stateReminders(synthetic(['Venom', 'Infected', 'Venom'])).length, 2);
});
});

describe('déplacement', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const withTrait = (book, name) => {
  const library = load(book);
  const record = library.find(profile => (profile.traits || []).some(trait => trait.name === name));
  assert.ok(record, `${name} introuvable dans ${book}`);
  return buildParticipantFromBestiary(record.id, { library });
};
const synthetic = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Ag: 45 }, hp: 10, ...extra });
const zoo = { extensions: { v5: { bestiary: { book: 'L11' } } } };

test('T4 lecture des Traits de déplacement, anglais ou français', () => {
  assert.deepEqual(parseMovementTrait('Fly (100)'), { key: 'fly', name: 'Fly', detail: '100' });
  assert.equal(parseMovementTrait('Vol').key, 'fly');
  assert.equal(parseMovementTrait('Créature marine').key, 'marine');
  assert.equal(parseMovementTrait('Strider (Rocky)').key, 'stridingGait');
  assert.equal(parseMovementTrait('Fear (3)'), null);
  assert.deepEqual(movementTraits(synthetic(['Fly (50)', 'Fly (50)', 'Bite'])).map(trait => trait.key), ['fly']);
});

test('T4 Vol (profil importé) — indice, charge, tirs à −2 DR, doit continuer si commence en vol', () => {
  const flyer = withTrait('L26', 'Fly');
  const plan = planMovement(flyer, 'fly', { startsInMedium: true });
  assert.deepEqual(plan.movement, { mode: 'fly', rating: 100, medium: 'vol' });
  assert.deepEqual(plan.modifiers, [{ scope: 'tir propre', dr: -2 }]);
  assert.ok(plan.effects.some(effect => effect.mustContinue === 'vol'));
  assert.equal(plan.available, true);
  assert.equal(planMovement(synthetic(['Fly']), 'fly').available, false);
  assert.equal(planMovement(synthetic(['Bite']), 'fly').available, false);
});

test('T4 Fouissage (Zoo) — indice souterrain', () => {
  const plan = planMovement(withTrait('L11', 'Burrow'), 'burrow');
  assert.equal(plan.movement.medium, 'sous terre');
  assert.equal(plan.available, true);
});

test('T4 Bond — double Mouvement pour Charge, Saut ou Sprint seulement', () => {
  const jumper = withTrait('L25', 'Bounce');
  assert.deepEqual(planMovement(jumper, 'bounce', { action: 'Charge' }).movement, { factor: 2, actions: ['charge'] });
  assert.equal(planMovement(jumper, 'bounce', { action: 'marche' }).available, false);
  assert.equal(planMovement(jumper, 'bounce').movement.actions.length, 3);
});

test('T4 Foulée — course ×1,5 ; Foulée adaptée — terrain nommé', () => {
  assert.equal(planMovement(synthetic(['Sprinter']), 'sprinter', { baseRun: 8 }).movement.run, 12);
  assert.equal(planMovement(synthetic(['Stride']), 'sprinter').available, false);
  const gait = synthetic(['Striding Gait (Forest)']);
  assert.deepEqual(planMovement(gait, 'stridingGait', { terrain: 'forest' }).modifiers, [{ scope: 'Athlétisme et Discrétion', terrain: 'Forest', dr: 1 }]);
  assert.equal(planMovement(gait, 'stridingGait', { terrain: 'Marsh' }).available, false);
  assert.equal(planMovement(synthetic(['Striding Gait']), 'stridingGait').available, false);
});

test('T4 Grimpant (Vampire noble E0-P-926) — Escalade automatique', () => {
  const vampire = buildParticipantFromBestiary('E0-P-926', { library: load('L26') });
  const plan = planMovement(vampire, 'wallcrawler');
  assert.deepEqual(plan.effects, [{ autoSuccess: 'Escalade' }]);
  assert.equal(plan.available, true);
});

test('T4 Amphibie — +1 DR en V5, Bonus d\'Agilité au Zoo', () => {
  assert.deepEqual(planMovement(synthetic(['Amphibious']), 'amphibious').modifiers, [{ scope: 'Natation', dr: 1 }]);
  assert.deepEqual(planMovement(synthetic(['Amphibious'], zoo), 'amphibious').modifiers, [{ scope: 'Natation', dr: 4, source: 'Bonus d\'Agilité' }]);
  assert.equal(planMovement(synthetic(['Amphibious'], { ...zoo, caracs: {} }), 'amphibious').available, false);
});

test('T4 Arboricole, Limicole, Respiration aquatique', () => {
  assert.deepEqual(planMovement(synthetic(['Arboreal']), 'arboreal').modifiers, [{ scope: 'Escalade et Discrétion', dr: 4, source: 'Bonus d\'Agilité' }]);
  assert.equal(planMovement(synthetic(['Arboreal'], { caracs: {} }), 'arboreal').available, false);
  assert.deepEqual(planMovement(synthetic(['Swamp-strider']), 'swampStrider').effects, [{ ignoresTerrainPenalty: 'marécage' }]);
  assert.equal(planMovement(synthetic(['Crustacean']), 'waterBreathing').movement.value, 8);
});

test('T4 Créature marine — hors de l\'eau M à 1 et −2 DR à tous les Tests', () => {
  const marine = withTrait('L25', 'Marine Creature');
  assert.equal(planMovement(marine, 'marine').available, false);
  assert.equal(planMovement(marine, 'marine', { inWater: true }).movement.fullMovement, true);
  const land = planMovement(marine, 'marine', { inWater: false });
  assert.equal(land.movement.value, 1);
  assert.deepEqual(land.modifiers, [{ scope: 'tous les Tests', dr: -2 }]);
  assert.equal(land.receipt.modifiers[0], 'tous les Tests -2 DR');
});

test('T4 Aquatique (Death on the Reik) — pas de déplacement sur terre', () => {
  const swimmer = withTrait('L26', 'Aquatic');
  assert.equal(planMovement(swimmer, 'aquatic', { inWater: true }).available, true);
  assert.match(planMovement(swimmer, 'aquatic', { inWater: false }).unresolved[0], /terre/);
});

test('T4 rappels de fiche sans doublon', () => {
  assert.equal(movementReminders(synthetic(['Fly (50)', 'Arboreal', 'Fly (50)'])).length, 2);
});
});

describe('sens', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const withTrait = (book, name) => {
  const library = load(book);
  const record = library.find(profile => (profile.traits || []).some(trait => trait.name === name));
  assert.ok(record, `${name} introuvable dans ${book}`);
  return buildParticipantFromBestiary(record.id, { library });
};
const synthetic = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Ag: 45, Int: 32, E: 47, I: 38 }, hp: 10, ...extra });

test('T5 lecture des Traits de sens, anglais ou français', () => {
  assert.deepEqual(parseSenseTrait('Distracting (Smell)'), { key: 'distracting', name: 'Distracting', detail: 'Smell' });
  assert.equal(parseSenseTrait('Infravision').key, 'darkVision');
  assert.equal(parseSenseTrait('Caméléon').key, 'chameleon');
  assert.equal(parseSenseTrait('Fly (50)'), null);
  assert.deepEqual(senseTraits(synthetic(['Night Vision', 'Night Vision', 'Bite'])).map(trait => trait.key), ['nightVision']);
});

test('T5 Pisteur (Chien importé) — Pistage à Intelligence+10', () => {
  const dog = withTrait('L06', 'Tracker');
  const plan = planSense(dog, 'tracker');
  assert.deepEqual(plan.skills, [{ skill: 'Pistage', value: 25, source: 'Int+10', adjustableByGM: true }]);
  assert.equal(plan.available, true);
  assert.equal(planSense(synthetic(['Tracker'], { caracs: {} }), 'tracker').available, false);
  assert.equal(planSense(synthetic(['Bite']), 'tracker').available, false);
});

test('T5 Furtif — Discrétion rurale à Agilité+10', () => {
  const plan = planSense(withTrait('L11', 'Stealthy'), 'stealthy');
  assert.equal(plan.skills[0].source, 'Ag+10');
  assert.equal(plan.skills[0].skill, 'Discrétion (rurale)');
  assert.equal(planSense(synthetic(['Stealthy']), 'stealthy').skills[0].value, 55);
});

test('T5 Infravision (Bête des marais) et Vision nocturne', () => {
  const plan = planSense(withTrait('L06', 'Dark Vision'), 'darkVision');
  assert.deepEqual(plan.effects, [{ seesInDarkness: true }]);
  assert.equal(plan.available, true);
  const night = planSense(synthetic(['Night Vision']), 'nightVision');
  assert.deepEqual(night.ranges, [{ scope: 'vision nocturne', yards: 20 }]);
  assert.match(night.receipt.ranges[0], /20 m/);
});

test('T5 Perturbant — portée BE yards, −2 DR une seule fois', () => {
  const plan = planSense(synthetic(['Distracting (Smell)']), 'distracting');
  assert.deepEqual(plan.ranges, [{ scope: 'ennemis vivants', yards: 4, source: 'Bonus d\'Endurance' }]);
  assert.deepEqual(plan.modifiers, [{ scope: 'tous les Tests des ennemis vivants à portée', dr: -2, onceOnly: true }]);
  const a = synthetic(['Distracting']);
  const b = synthetic(['Distracting']);
  assert.deepEqual(distractingPenalty([a, b], [3, 2]), { dr: -2, sources: 2, unresolved: false });
  assert.equal(distractingPenalty([a, b], [9, 8]).dr, 0);
  assert.equal(distractingPenalty([a, b], [9, 4]).sources, 1);
  assert.equal(planSense(synthetic(['Distracting'], { caracs: {} }), 'distracting').available, false);
});

test('T5 Caméléon — Perception −4 DR, −2 en mouvement, tirs −2 DR', () => {
  const lizard = synthetic(['Chameleon']);
  assert.equal(planSense(lizard, 'chameleon').available, false);
  const still = planSense(lizard, 'chameleon', { moving: false });
  assert.deepEqual(still.modifiers, [{ scope: 'Perception pour le voir', dr: -4 }, { scope: 'tirs contre lui', dr: -2 }]);
  assert.equal(planSense(lizard, 'chameleon', { moving: true }).modifiers[0].dr, -2);
  assert.equal(still.receipt.modifiers[0], 'Perception pour le voir -4 DR');
});

test('T5 Sens vibratoires — quatre BI yards, jamais Surpris', () => {
  const plan = planSense(synthetic(['Vibrational Senses']), 'vibrational');
  assert.deepEqual(plan.ranges, [{ scope: 'corps physiques', yards: 12, source: 'quatre BI' }]);
  assert.deepEqual(plan.effects, [{ immuneToSurprise: true }]);
  assert.equal(planSense(synthetic(['Vibrational Senses'], { caracs: {} }), 'vibrational').available, false);
});

test('T5 rappels de fiche sans doublon', () => {
  assert.equal(senseReminders(synthetic(['Night Vision', 'Tracker', 'Night Vision'])).length, 2);
});
});

describe('psychologie', () => {
const make = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Int: 20, FM: 35, E: 40 }, hp: 10, maxHp: 10, camp: 'monstres', ...extra });
const hero = (extra = {}) => ({ id: 'h', name: 'Héros', traits: [], caracs: { FM: 40 }, camp: 'pj', states: [], ...extra });

test('T6 lecture des Traits, anglais ou français', () => {
  assert.deepEqual(parsePsychologyTrait('Fear (2)'), { key: 'fear', name: 'Fear', detail: '2' });
  assert.equal(parsePsychologyTrait('À Sang-froid').key, 'coldBlooded');
  assert.equal(parsePsychologyTrait('Immunité Psychologique').key, 'immunePsychology');
  assert.equal(parsePsychologyTrait('Bite'), null);
  assert.deepEqual(psychologyTraits(make(['Stupid', 'Stupid', 'Bite'])).map(trait => trait.key), ['stupid']);
});

test('T6 Peur — indice un si omis, état proposé à la cible', () => {
  const plan = planPsychology(make(['Fear (2)']), 'fear', { target: hero() });
  assert.equal(plan.available, true);
  assert.equal(plan.states.length, 1);
  assert.equal(plan.states[0].rating, 2);
  assert.equal(plan.states[0].key, 'fear-of-talent');
  assert.equal(planPsychology(make(['Fear']), 'fear', { target: hero() }).states[0].rating, 1);
  assert.deepEqual(planPsychology(make(['Fear (3)']), 'fear').effects, [{ fearRating: 3 }]);
});

test('T6 Peur — immunité Psychologique et alliés exemptés', () => {
  const immune = hero({ traits: ['Immune to Psychology'] });
  const plan = planPsychology(make(['Fear (2)']), 'fear', { target: immune });
  assert.deepEqual(plan.states, []);
  assert.deepEqual(plan.effects, [{ exempt: 'psychology-immunity' }]);
  assert.deepEqual(planPsychology(make(['Fear (2)']), 'fear', { target: make([]) }).states, []);
});

test('T6 Terreur — indice obligatoire, état proposé', () => {
  assert.equal(planPsychology(make(['Terror']), 'terror', { target: hero() }).available, false);
  const plan = planPsychology(make(['Terror (3)']), 'terror', { target: hero() });
  assert.equal(plan.states[0].key, 'terror-of-talent');
  assert.equal(plan.states[0].rating, 3);
});

test('T6 Effrayé — Peur de la source désignée', () => {
  const plan = planPsychology(hero({ traits: ['Afraid (Orcs)'] }), 'afraid', { source: make(['Fear (2)']) });
  assert.equal(plan.states.length, 1);
  assert.equal(plan.states[0].rating, 2);
  assert.equal(plan.states[0].authorId, 'x');
  assert.equal(planPsychology(hero({ traits: ['Afraid (Orcs)'] }), 'afraid').available, false);
});

test('T6 Haine — cible par mots-clés, test de Calme, +1 DR, immunité à la Peur', () => {
  const hater = make(['Hatred (Orc)']);
  const orc = make([], { id: 'o', keywords: ['Orc'] });
  const plan = planPsychology(hater, 'hatred', { target: orc });
  assert.deepEqual(plan.effects[0], { aimedAtTarget: true });
  assert.deepEqual(plan.modifiers, [{ scope: 'mêlée et tir contre la cible', dr: 1 }]);
  assert.equal(plan.tests[0].base, 35);
  const other = planPsychology(hater, 'hatred', { target: make([], { id: 'e', keywords: ['Elfe'] }) });
  assert.deepEqual(other.effects, [{ aimedAtTarget: false }]);
  assert.deepEqual(other.modifiers, []);
  assert.equal(planPsychology(make(['Hatred']), 'hatred').available, false);
});

test('T6 Animosité et Préjugé', () => {
  const orc = make([], { id: 'o', keywords: ['Orc'] });
  const plan = planPsychology(make(['Animosity (Orc)']), 'animosity', { target: orc });
  assert.deepEqual(plan.modifiers, [{ scope: 'Sociabilité contre la cible', dr: 1 }]);
  const prejudice = planPsychology(make(['Prejudice (Orc)']), 'prejudice', { target: orc });
  assert.deepEqual(prejudice.effects, [{ aimedAtTarget: true }]);
  assert.deepEqual(prejudice.modifiers, []);
});

test('T6 Belliqueux — immunité tant qu\'il a de l\'Élan ; variante Temple of Spite', () => {
  const owner = make(['Belligerent'], { extensions: { v5: { hasMomentum: true } } });
  assert.deepEqual(planPsychology(owner, 'belligerent').effects, [{ immuneToFear: true }]);
  assert.equal(fearImmunity(owner), true);
  const spite = make(['Belligerent'], { extensions: { v5: { hasMomentum: true, bestiary: { book: 'L09' } } } });
  assert.equal(planPsychology(spite, 'belligerent').available, false);
  assert.deepEqual(planPsychology(spite, 'belligerent', { enemyHasMomentum: true }).effects, [{ immuneToFear: false }]);
});

test('T6 Bestial — fuite ou Frénésie sous la moitié des Blessures', () => {
  assert.deepEqual(planPsychology(make(['Bestial']), 'bestial').effects, [{ defenceSkill: 'Esquive', noRationalLanguage: true }]);
  const hurt = make(['Bestial'], { hp: 4 });
  assert.deepEqual(planPsychology(hurt, 'bestial').effects.at(-1), { reaction: 'flee' }); // Q8 : fuite par défaut
  assert.deepEqual(planPsychology(hurt, 'bestial', { protecting: true }).effects.at(-1), { reaction: 'frenzy' });
  assert.deepEqual(planPsychology(hurt, 'bestial', { protecting: false }).effects.at(-1), { reaction: 'flee' });
});

test('T6 À Sang-froid — Avantage à Calme', () => {
  const plan = planPsychology(make(['Cold-blooded']), 'coldBlooded');
  assert.deepEqual(plan.modifiers, [{ scope: 'Calme', advantage: true }]);
  assert.deepEqual(plan.effects, [{ ignoreFirstSurpriseEnd: true }]);
  assert.equal(planPsychology(make(['Cold-blooded'], { extensions: { v5: { bestiary: { book: 'L09' } } } }), 'coldBlooded').available, false);
});

test('T6 Féroce — gagne de l\'Élan ; variante à indice', () => {
  const grim = make(['Grim']);
  assert.equal(planPsychology(grim, 'grim').available, false);
  assert.deepEqual(planPsychology(grim, 'grim', { momentum: 0 }).effects, [{ gainMomentum: 1, timing: 'fin de Tour' }]);
  assert.deepEqual(planPsychology(grim, 'grim', { momentum: 2 }).effects, [{ gainMomentum: 0, timing: 'fin de Tour' }]);
  assert.deepEqual(planPsychology(make(['Grim (3)']), 'grim', { momentum: 1 }).effects, [{ setMomentum: 3, timing: 'début de Tour' }]);
  assert.deepEqual(planPsychology(make(['Grim (3)']), 'grim', { blocked: true }).effects, [{ gainMomentum: 0 }]);
});

test('T6 Frénésie — test de Volonté, immunité, attaque gratuite', () => {
  const plan = planPsychology(make(['Frenzy']), 'frenzy');
  assert.equal(plan.tests[0].base, 35);
  assert.equal(plan.tests[0].via, 'talent-frenzy');
  assert.deepEqual(plan.effects, [{ immuneToPsychology: true, freeAttackPerRound: 1, damageBonus: 1 }]);
  assert.equal(planPsychology(make(['Frenzy'], { caracs: {} }), 'frenzy').available, false);
});

test('T6 Affamé et Stupide — tests sur déclencheur', () => {
  assert.equal(planPsychology(make(['Hungry']), 'hungry').available, false);
  assert.deepEqual(planPsychology(make(['Hungry']), 'hungry', { trigger: false }).tests, []);
  assert.equal(planPsychology(make(['Hungry']), 'hungry', { trigger: true }).tests[0].dr, 2);
  assert.deepEqual(planPsychology(make(['Stupid']), 'stupid', { guidedByAlly: true }).tests, []);
  const test4 = planPsychology(make(['Stupid']), 'stupid', { guidedByAlly: false }).tests[0];
  assert.deepEqual([test4.skill, test4.base, test4.dr], ['Intelligence', 20, 4]);
});

test('T6 Craintif, Territorial, Immunité Psychologique, Rage', () => {
  assert.deepEqual(planPsychology(make(['Skittish']), 'skittish').effects[0].conditions, [{ name: 'Brisé', level: 1 }]);
  assert.equal(planPsychology(make(['Territorial']), 'territorial').effects[0].defendsTerritory, true);
  assert.deepEqual(planPsychology(make(['Immune to Psychology']), 'immunePsychology').effects, [{ immuneToPsychology: true }]);
  assert.equal(planPsychology(make(['Fury']), 'fury').effects[0].advantageThresholds.length, 2);
});

test('T6 Trait absent et rappels sans doublon', () => {
  assert.equal(planPsychology(make(['Bite']), 'fear').available, false);
  assert.equal(psychologyReminders(make(['Stupid', 'Hungry', 'Stupid'])).length, 2);
});
});

describe('magie des créatures', () => {
const make = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Int: 30, FM: 35, Soc: 25 }, camp: 'monstres', ...extra });

test('T7 lecture des Traits, anglais ou français', () => {
  assert.deepEqual(parseCreatureMagicTrait('Spellcaster (Fire)'), { key: 'spellcaster', name: 'Spellcaster', detail: 'Fire' });
  assert.equal(parseCreatureMagicTrait('Résistance à la Magie').key, 'magicResistance');
  assert.equal(parseCreatureMagicTrait('Dressé (Creuser)').key, 'trained');
  assert.equal(parseCreatureMagicTrait('Bite'), null);
  assert.deepEqual(parseCreatureMagicTrait('Mark of Chaos (Nurgle)'), { key: 'mark', name: 'Mark of Chaos', detail: 'Nurgle', god: 'nurgle' });
  assert.equal(parseCreatureMagicTrait('Marque de Khorne').god, 'khorne');
  assert.equal(creatureMagicTraits(make(['Mutation', 'Mutation', 'Mark of Khorne', 'Mark of Tzeentch'])).length, 3);
});

test('T7 Résistance à la Magie — −3 DR en V5, indice imprimé pour le Zoo', () => {
  assert.equal(magicResistanceReduction(make([])), 0);
  assert.equal(magicResistanceReduction(make(['Magic Resistance'])), 3);
  assert.equal(magicResistanceReduction(make(['Magic Resistance (2)'])), 3);
  const zoo = make(['Magic Resistance (2)'], { extensions: { v5: { bestiary: { book: 'L11' } } } });
  assert.equal(magicResistanceReduction(zoo), 2);
  const plan = planCreatureMagic(make(['Magic Resistance']), 'magicResistance');
  assert.deepEqual(plan.modifiers, [{ scope: 'sorts qui affectent la créature', dr: -3 }]);
  assert.deepEqual(plan.effects, [{ spellReduction: 3 }]);
});

test('T7 Lanceur de sorts — domaine, Focalisation et Langue magique de départ', () => {
  const plan = planCreatureMagic(make(['Spellcaster (Fire)']), 'spellcaster');
  assert.equal(plan.available, true);
  assert.deepEqual(plan.effects, [{ lore: 'Fire' }]);
  assert.deepEqual(plan.tests.map(t => [t.skill, t.base]), [['Focalisation', 45], ['Langue magique', 40]]);
  assert.equal(planCreatureMagic(make(['Spellcaster']), 'spellcaster').available, false);
  const fixed = planCreatureMagic(make(['Spellcaster (Fire)']), 'spellcaster', { focusBase: 60, tongueBase: 55 });
  assert.deepEqual(fixed.tests.map(t => t.base), [60, 55]);
  assert.equal(planCreatureMagic(make(['Spellcaster (Fire)'], { caracs: {} }), 'spellcaster').available, false);
});

test('T7 Béni et Miracles — Prière à Sociabilité+10 ou valeur du MJ', () => {
  const blessed = planCreatureMagic(make(['Blessed (Sigmar)']), 'blessed');
  assert.deepEqual(blessed.effects, [{ deity: 'Sigmar', access: 'Bénédictions' }]);
  assert.equal(blessed.tests[0].base, 35);
  assert.equal(planCreatureMagic(make(['Miracles (Ulric)']), 'miracles', { prayerBase: 50 }).tests[0].base, 50);
  assert.equal(planCreatureMagic(make(['Miracles']), 'miracles').available, false);
});

test('T7 Champion — dégâts comme l\'attaquant', () => {
  assert.deepEqual(planCreatureMagic(make(['Champion']), 'champion').effects, [{ defensiveMeleeWinDamage: 'comme l\'attaquant' }]);
});

test('T7 Marques du Chaos — variantes sans fusion, rival visible', () => {
  const khorne = planCreatureMagic(make(['Mark of Khorne']), 'mark');
  assert.deepEqual(khorne.effects, [{ god: 'khorne', rival: 'Slaanesh', reciprocalAnimosityWhileVisible: true }]);
  assert.match(khorne.reminders[0], /Frénésie/);
  const tz = planCreatureMagic(make(['Mark of Tzeentch']), 'mark');
  assert.match(tz.reminders[0], /Mutations/);
  assert.equal(planCreatureMagic(make(['Mark of Chaos']), 'mark').available, false);
  const two = make(['Mark of Khorne', 'Mark of Tzeentch']);
  assert.equal(planCreatureMagic(two, 'mark', { god: 'Tzeentch' }).effects[0].god, 'tzeentch');
  assert.equal(planCreatureMagic(make(['Mark of Chaos (Nurgle)']), 'mark').effects[0].god, 'nurgle');
});

test('T7 Corruption, Corruption mentale, Mutation — tirage du MJ', () => {
  assert.deepEqual(planCreatureMagic(make(['Corruption (Strength)']), 'corruption').effects, [{ corruptingInfluence: 'Strength' }]);
  assert.equal(planCreatureMagic(make(['Corruption']), 'corruption').available, false);
  assert.deepEqual(planCreatureMagic(make(['Mental Corruption']), 'mentalCorruption').effects, [{ table: 'corruption mentale', drawnBy: 'MJ' }]);
  assert.deepEqual(planCreatureMagic(make(['Mutation']), 'mutation').effects, [{ table: 'corruption physique', drawnBy: 'MJ' }]);
});

test('T7 Dressé — compétence par précision, Dressage du maître', () => {
  const dig = planCreatureMagic(make(['Trained (Dig)']), 'trained');
  assert.deepEqual(dig.effects, [{ trainedSkill: 'Creuser' }]);
  assert.equal(dig.tests[0].bonus, 20);
  const round = planCreatureMagic(make(['Trained (Round)']), 'trained');
  assert.equal(round.tests[0].bonus, 0);
  assert.deepEqual(planCreatureMagic(make(['Trained (Point)']), 'trained').tests, []);
  assert.equal(planCreatureMagic(make(['Trained']), 'trained').available, false);
  assert.deepEqual(planCreatureMagic(make(['Trained (Dig)', 'Trained (Heel)']), 'trained', { skill: 'heel' }).effects, [{ trainedSkill: 'Au pied' }]);
});

test('T7 Trait absent et rappels sans doublon', () => {
  assert.equal(planCreatureMagic(make(['Bite']), 'mutation').available, false);
  assert.equal(creatureMagicReminders(make(['Mutation', 'Mutation', 'Champion'])).length, 2);
});
});

describe('régénération', () => {
const crit = (id, name = 'Bras brisé') => ({ id, name });
const make = (traits, extra = {}) => ({ id: 'x', name: 'Troll', traits, hp: 12, maxHp: 20, caracs: {}, camp: 'monstres', ...extra });
const withCrits = (list, extra = {}) => make(['Regeneration'], { extensions: { v5: { criticalWounds: list } }, ...extra });

test('T8 lecture du Trait, anglais ou français, Regenerate inclus', () => {
  assert.equal(parseRegenerationTrait('Regeneration').key, 'regeneration');
  assert.equal(parseRegenerationTrait('Regenerate').key, 'regeneration');
  assert.equal(parseRegenerationTrait('Régénération').key, 'regeneration');
  assert.equal(parseRegenerationTrait('Bite'), null);
  assert.equal(hasRegeneration(make(['Infected', 'Regeneration'])), true);
  assert.equal(hasRegeneration(make(['Infected'])), false);
});

test('T8 début de Round, Blessures positives : soin du d10 saisi, plafonné aux Blessures manquantes', () => {
  const plan = planRegeneration(make(['Regeneration']), { roll: 6 });
  assert.equal(plan.available, true);
  assert.deepEqual(plan.heal, { amount: 6, roll: 6, cause: 'Régénération' });
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 9 }).heal.amount, 8);
  assert.equal(planRegeneration(make(['Regeneration'], { hp: 20 }), { roll: 4 }).heal.amount, 0);
});

test('T8 un 10 soigne une Blessure Critique : la proposée, ou celle qui est choisie', () => {
  const target = withCrits([crit('a'), crit('b')]);
  const first = planRegeneration(target, { roll: 10 });
  assert.equal(first.heal.amount, 8);
  assert.deepEqual(first.criticalHeal, { id: 'a', name: 'Bras brisé', proposed: true });
  assert.equal(planRegeneration(target, { roll: 10, criticalId: 'b' }).criticalHeal.id, 'b');
  assert.equal(planRegeneration(target, { roll: 9 }).criticalHeal, null);
  const none = planRegeneration(make(['Regeneration']), { roll: 10 });
  assert.equal(none.criticalHeal, null);
  assert.match(none.reminders.join(' '), /aucune Blessure Critique/);
});

test('T8 à zéro Blessure : 8 ou plus rend une Blessure, sinon rien', () => {
  const down = make(['Regeneration'], { hp: 0 });
  assert.equal(planRegeneration(down, { roll: 7 }).heal.amount, 0);
  assert.deepEqual(planRegeneration(down, { roll: 8 }).heal, { amount: 1, roll: 8, cause: 'Régénération (à zéro Blessure)' });
  const ten = planRegeneration({ ...withCrits([crit('a')]), hp: 0 }, { roll: 10 });
  assert.equal(ten.heal.amount, 1);
  assert.equal(ten.criticalHeal.id, 'a');
});

test('T8 le feu est exclu : Blessures de feu non régénérées, critique de feu jamais proposé', () => {
  const hurt = make(['Regeneration'], { hp: 10, maxHp: 20 });
  assert.equal(planRegeneration(hurt, { roll: 9, fireWounds: 6 }).heal.amount, 4);
  assert.equal(planRegeneration(hurt, { roll: 9, fireWounds: 10 }).heal.amount, 0);
  const target = withCrits([crit('a', 'Brûlure'), crit('b')]);
  assert.equal(planRegeneration(target, { roll: 10, fireCriticalIds: ['a'] }).criticalHeal.id, 'b');
  const only = planRegeneration(withCrits([crit('a')]), { roll: 10, fireCriticalIds: ['a'] });
  assert.equal(only.criticalHeal, null);
  assert.match(only.reminders.join(' '), /feu/);
  const refused = planRegeneration(target, { roll: 10, criticalId: 'a', fireCriticalIds: ['a'] });
  assert.equal(refused.criticalHeal, null);
  assert.equal(refused.available, false);
});

test('T8 points non résolus : d10 absent ou invalide, critique inconnu, Trait absent, Blessures inconnues', () => {
  assert.equal(planRegeneration(make(['Regeneration']), {}).available, false);
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 11 }).available, false);
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 0 }).available, false);
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 2.5 }).available, false);
  assert.equal(planRegeneration(withCrits([crit('a')]), { roll: 10, criticalId: 'zz' }).available, false);
  const absent = planRegeneration(make(['Bite']), { roll: 5 });
  assert.equal(absent.available, false);
  assert.equal(absent.heal, null);
  assert.equal(planRegeneration(make(['Regeneration'], { hp: undefined, maxHp: undefined }), { roll: 5 }).available, false);
  assert.equal(planRegeneration({ id: 'y', traits: ['Regeneration'], hp: 'x', maxHp: 20 }, { roll: 5 }).available, false);
});

test('T8 Regenerate (sort) : même plan, reçu lisible, rappels sans doublon', () => {
  const plan = planRegeneration(make(['Regenerate']), { roll: 3 });
  assert.equal(plan.heal.amount, 3);
  assert.match(plan.receipt.ability, /Régénération/);
  assert.deepEqual(plan.receipt.blocked, []);
  assert.equal(regenerationReminders(make(['Regeneration', 'Regenerate'])).length, 1);
  assert.deepEqual(regenerationReminders(make(['Bite'])), []);
});
});

describe('plusieurs têtes', () => {
const hydra = (traits = ['Many Heads 5', 'Bite']) => ({ id: 'h', name: 'Hydre', traits, hp: 40, maxHp: 40, caracs: {}, camp: 'monstres' });

test('T9 lecture du Trait : nombre en indice ou entre parenthèses, anglais ou français', () => {
  assert.deepEqual(parseManyHeadsTrait('Many Heads 5'), { key: 'manyHeads', name: 'Many Heads', count: 5 });
  assert.equal(parseManyHeadsTrait('Many Heads (3)').count, 3);
  assert.equal(parseManyHeadsTrait('Plusieurs têtes (2)').count, 2);
  assert.equal(parseManyHeadsTrait('Many Heads').count, null);
  assert.equal(parseManyHeadsTrait('Many Heads 1').count, null);
  assert.equal(parseManyHeadsTrait('Bite'), null);
  assert.equal(hasManyHeads(hydra()), true);
  assert.equal(hasManyHeads(hydra(['Bite'])), false);
});

test('T9 registre initial : une tête valide par tête, attaques gratuites par tête valide, Perception +2 DR', () => {
  const registry = createHeadRegistry(hydra());
  assert.equal(registry.length, 5);
  const plan = planManyHeads(hydra(['Many Heads 5', 'Bite', 'Horns']), registry);
  assert.equal(plan.available, true);
  assert.equal(plan.healthy, 5);
  assert.deepEqual(plan.freeAttacks.map(a => [a.key, a.count]), [['bite', 5], ['horns', 5]]);
  assert.deepEqual(plan.perception, { modifier: 2, unit: 'DR', cause: 'Plusieurs têtes (au moins deux têtes valides)' });
  assert.equal(plan.globalEffect, null);
  assert.deepEqual(planManyHeads(hydra(['Many Heads 5', 'Claw']), registry).freeAttacks, []);
});

test('T9 une Blessure Critique à la tête ne touche qu’une tête : pas d’effet global tant qu’il en reste une valide', () => {
  let state = createHeadRegistry(hydra());
  for (let i = 0; i < 4; i += 1) state = applyHeadCritical(hydra(), state, 'dead').registry;
  const plan = planManyHeads(hydra(), state);
  assert.equal(plan.healthy, 1);
  assert.equal(plan.globalEffect, null);
  assert.equal(plan.freeAttacks[0].count, 1);
  assert.equal(plan.perception, null);
});

test('T9 effet global : toutes les têtes neutralisées, le degré le moins grave s’applique', () => {
  const two = hydra(['Many Heads 2', 'Tongue']);
  const first = applyHeadCritical(two, undefined, 'stunned', 'head-1');
  assert.equal(first.plan.globalEffect, null);
  assert.equal(first.plan.healthy, 1);
  const second = applyHeadCritical(two, first.registry, 'dead', 'head-2');
  assert.equal(second.plan.globalEffect, 'stunned');
  assert.equal(second.plan.healthy, 0);
  assert.equal(second.plan.freeAttacks[0].count, 0);
  const same = applyHeadCritical(two, second.registry, 'dead', 'head-1');
  assert.equal(same.plan.globalEffect, 'dead');
  assert.equal(second.registry[0].state, 'stunned');
});

test('T9 l’ancien registre n’est pas modifié, une tête se remet en état valide', () => {
  const start = createHeadRegistry(hydra());
  const after = applyHeadCritical(hydra(), start, 'unconscious').registry;
  assert.equal(start[0].state, 'healthy');
  assert.equal(after[0].state, 'unconscious');
  assert.equal(restoreHead(after, 'head-1')[0].state, 'healthy');
});

test('T9 points non résolus : Trait absent, nombre inconnu, registre incohérent, effet ou tête inconnus', () => {
  assert.equal(planManyHeads(hydra(['Bite']), []).available, false);
  assert.equal(planManyHeads(hydra(['Many Heads', 'Bite']), []).available, false);
  assert.equal(planManyHeads(hydra(), [{ id: 'a', state: 'healthy' }]).available, false);
  assert.equal(applyHeadCritical(hydra(), undefined, 'burned').unresolved.length, 1);
  assert.equal(applyHeadCritical(hydra(), undefined, 'dead', 'zz').unresolved.length, 1);
  const full = Array.from({ length: 5 }, (_, i) => ({ id: `head-${i + 1}`, state: 'dead' }));
  assert.equal(applyHeadCritical(hydra(), full, 'dead').unresolved.length, 1);
  assert.equal(applyHeadCritical(hydra(['Bite']), undefined, 'dead').unresolved.length, 1);
});

test('T9 reçu et rappels', () => {
  const plan = planManyHeads(hydra(), undefined);
  assert.equal(plan.receipt.ability, 'Plusieurs têtes');
  assert.deepEqual(plan.receipt.freeAttacks, ['Morsure ×5']);
  // B2 : le rappel dit l'état des têtes, les attaques gratuites, la Perception, puis la règle des Blessures critiques.
  assert.match(manyHeadsReminders(hydra())[0], /5 tête\(s\) valide\(s\) sur 5/);
  assert.equal(manyHeadsReminders(hydra()).length, 4);
  assert.deepEqual(manyHeadsReminders(hydra(['Bite'])), []);
});
});
