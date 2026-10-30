import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../../../js/core/store.js';
import { buildParticipantFromBestiary, createBestiaryLoader, buildReserveProfileFromBestiary, filterBestiary } from '../../../js/core/bestiary-profiles.js';
import { engagedCandidates, outnumberTestRules, planOutnumbering, withoutOutnumberContext } from '../../../js/core/outnumbering.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { planFamiliarCreation, familiarCostBalance, companionTalents, withCompanionTalents, previewFamiliarHealing, validateFamiliarLink, linkedFamiliars, familiarSupport, previewFamiliarCondition, planFamiliarDeath, familiarDeathDamage, senseSharingRange, familiarIgnoresAblaze, familiarReminders, COMPANION_TRAITS } from '../../../js/core/familiars.js';
import { buildFamiliarBlock, readFamiliarInputs, readFamiliarDeathInputs } from '../../../js/ui/familiar-block.js';
import { ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { magicActionsFor, creatureCastingBases } from '../../../js/core/creature-magic.js';
import { resolveCastingSkill, previewCasting } from '../../../js/core/v5-magic-casting.js';
import { resolveChannellingSkill, previewChannelling } from '../../../js/core/v5-magic-channelling.js';
import { contemplationOutcome, SLANN_ABILITIES, isSlann, slannAbilities, palanquinTraits, groundCastModifier, mishapSeverity, totalPowerCritical, planEmergencyTeleportation, slannReminders } from '../../../js/core/slann.js';
import { buildSlannBlock, readSlannInputs } from '../../../js/ui/slann-block.js';
import { keywordMatches } from '../../../js/core/creature-keywords.js';
import { Profile } from '../../../js/core/models.js';
import { buildHeadsBlock, nextHeadState } from '../../../js/ui/heads-block.js';
import { buildRegenerationBlock, readRegenerationInputs } from '../../../js/ui/regeneration-block.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { availableV5TalentActions } from '../../../js/core/v5-talent-actions.js';
import { buildPsychologyBlock, psychologyCauses, readPsychologyInputs } from '../../../js/ui/psychology-block.js';
import { deriveReminders } from '../../../js/core/reminders.js';
import { sizeReminders } from '../../../js/core/creature-size.js';
import { buildCreatureStatesBlock, readCreatureStatesInputs } from '../../../js/ui/creature-states-block.js';
import { applyHeadCriticals } from '../../../js/core/creature-heads.js';
import { senseTestRules } from '../../../js/core/creature-senses.js';
import { refusalError, userMessage } from '../../../js/ui/messages.js';
import { resolveMiscast } from '../../../js/core/v5-magic-miscasts.js';
import { advanceV5Effects } from '../../../js/core/v5-effects.js';
import { familiarSkillSupport } from '../../../js/core/v5-magic-talents.js';

describe('surnombre (B12)', () => {
const library = ['L06', 'L07'].flatMap(book => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles);
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = (id, camp, talents = []) => ({ id, name: id, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 50, F: 40, E: 30, Ag: 40, I: 40 }, talents, states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } });
const talent = id => ({ id: `talent-${id}`, status: 'resolved', rank: 1 });
const named = (name, id, camp) => ({ ...buildParticipantFromBestiary(library.find(profile => profile.nameFr === name).id, { library, zone: 'active' }), id, camp });

async function table(...people) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  for (const person of people) await store.addParticipant(person);
  return store;
}
const attack = (actorId, targetId, context, extra = {}) => ({ resolutionId: `b12-${actorId}-${targetId}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CC', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee', context }, ...extra });
const bonus = preview => preview.test.details.modifiers.filter(m => m.id.startsWith('outnumber')).reduce((sum, m) => sum + m.amount, 0);
const pjs = n => Array.from({ length: n }, (_, i) => human(`pj${i + 1}`, 'pj'));
const allies = n => Array.from({ length: n }, (_, i) => `pj${i + 1}`).slice(1);

test('B12 : trois humains contre un Troll (Grande, poids 2) : pas de surnombre ; quatre humains : +1 DR', async () => {
  const store = await table(...pjs(4), named('Troll', 'troll', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 'troll', { outnumberAttackerIds: allies(3) }))), 0);
  const four = store.previewResolution(attack('pj1', 'troll', { outnumberAttackerIds: allies(4) }));
  assert.equal(bonus(four), 1);
  assert.match(four.test.details.modifiers.find(m => m.id === 'outnumber').label, /4 contre 2/);
});

test('B12 : un Stégadon (Énorme) attaquant deux humains ne se multiplie pas : pas de bonus ; deux Ogres contre un humain : +1 DR', async () => {
  const store = await table(named('Stégadon', 'steg', 'ennemi'), human('a', 'pj'), human('b', 'pj'), named('Ogre', 'ogre1', 'ennemi'), named('Ogre', 'ogre2', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('steg', 'a', { outnumberDefenderIds: ['b'] }))), 0);
  assert.equal(bonus(store.previewResolution(attack('ogre1', 'a', { outnumberAttackerIds: ['ogre2'] }))), 1);
});

test('B12 : Encerclé donne +2 DR sans cumul avec le surnombre ; sans saisie, rien', async () => {
  const store = await table(...pjs(4), named('Troll', 'troll', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 'troll', { outnumberAttackerIds: allies(4), surrounded: true }))), 2);
  // Un seul attaquant compté : « encerclé » périmé, ignoré.
  assert.equal(bonus(store.previewResolution(attack('pj1', 'troll', { surrounded: true }))), 0);
  assert.equal(bonus(store.previewResolution(attack('pj1', 'troll', { outnumberAttackerIds: ['pj2'], surrounded: true }))), 2);
  assert.equal(bonus(store.previewResolution(attack('pj1', 'troll', {}))), 0);
  assert.equal(bonus(store.previewResolution(attack('pj1', 'troll', { surrounded: false }))), 0);
});

test('B12 : Grande taille compte pour deux côté cible seulement ; Maîtrise du combat dans les deux sens', async () => {
  // Cible humaine avec Grande taille : quatre attaquants contre 2 surpassent, trois non.
  let store = await table(...pjs(4), human('big', 'ennemi', [talent('large')]));
  assert.equal(bonus(store.previewResolution(attack('pj1', 'big', { outnumberAttackerIds: allies(3) }))), 0);
  assert.equal(bonus(store.previewResolution(attack('pj1', 'big', { outnumberAttackerIds: allies(4) }))), 1);
  // Grande taille de l'attaquant : aucun poids en attaque (un seul allié coché : 2 contre 1 grâce au nombre seulement).
  store = await table(human('bigatk', 'pj', [talent('large')]), human('a', 'ennemi'), human('b', 'ennemi'), human('c', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('bigatk', 'a', { outnumberDefenderIds: ['b'] }))), 0);
  assert.equal(bonus(store.previewResolution(attack('bigatk', 'a', { outnumberDefenderIds: ['b', 'c'] }))), 0);
  // Maîtrise du combat côté attaquant : l'attaquant et deux alliés pèsent 4 contre 2 ; sans le talent, 3 contre 2.
  store = await table(human('m', 'pj', [talent('combat-master')]), human('p2', 'pj'), human('p3', 'pj'), human('t', 'ennemi'), human('t2', 'ennemi'));
  const context = { outnumberAttackerIds: ['p2', 'p3'], outnumberDefenderIds: ['t2'] };
  assert.equal(bonus(store.previewResolution(attack('m', 't', context))), 1);
  assert.equal(bonus(store.previewResolution(attack('p2', 't', { outnumberAttackerIds: ['m', 'p3'], outnumberDefenderIds: ['t2'] }))), 1);
  store = await table(human('p1', 'pj'), human('p2', 'pj'), human('p3', 'pj'), human('t', 'ennemi'), human('t2', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('p1', 't', context))), 0);
  // Côté cible : la Maîtrise du combat de la cible l'empêche d'être surpassée (4 contre 3).
  store = await table(...pjs(4), human('tm', 'ennemi', [talent('combat-master')]), human('t2', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 'tm', { outnumberAttackerIds: allies(4), outnumberDefenderIds: ['t2'] }))), 0);
  store = await table(...pjs(4), human('tn', 'ennemi'), human('t2', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 'tn', { outnumberAttackerIds: allies(4), outnumberDefenderIds: ['t2'] }))), 1);
});

test('B12 : le Test de défense n’est jamais modifié, ni un tir ni un autre Test', async () => {
  const store = await table(...pjs(4), named('Troll', 'troll', 'ennemi'));
  const context = { outnumberAttackerIds: allies(4), surrounded: true };
  const preview = store.previewResolution(attack('pj1', 'troll', context, { defense: { base: 30, roll: 82, v5: { kind: 'melee' }, context } }));
  assert.equal(bonus(preview), 2);
  assert.equal(JSON.stringify(preview.defense ?? preview.defenseTest ?? null).includes('outnumber'), false);
  const shot = attack('pj1', 'troll', context, { action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, v5: { kind: 'ranged', context } });
  assert.equal(bonus(store.previewResolution(shot)), 0);
  const skill = { resolutionId: 'b12-skill', actorId: 'pj1', targetId: 'troll', action: { type: 'skill', label: 'Athlétisme', base: 40, attr: 'Ag' }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', context } };
  assert.equal(bonus(store.previewResolution(skill)), 0);
});

test('B12 : le plan résume le rapport et ignore les identifiants inconnus, la cible et les doublons', () => {
  const [a, b, c, d] = pjs(4), troll = human('t', 'ennemi');
  const plan = planOutnumbering({ actor: a, target: troll, participants: [a, b, c, d, troll], context: { outnumberAttackerIds: ['pj2', 'pj3', 'pj4', 'inconnu', 't', 'pj1', 'pj2'] } });
  assert.equal(plan.summary, '4 contre 1 : surnombre, +1 DR');
  assert.equal(planOutnumbering({ actor: a, target: troll, participants: [a, troll], context: {} }).summary, '1 contre 1 : pas de surnombre');
});

test('B12 : le Test de défense ne reçoit jamais le modificateur (règle du moteur)', () => {
  const [a, b, c, d] = pjs(4), troll = human('t', 'ennemi'), second = human('t2', 'ennemi');
  const base = { actor: troll, target: a, participants: [a, b, c, d, troll, second], kind: 'melee', action: { type: 'attack' }, context: { outnumberAttackerIds: ['t2'], surrounded: true } };
  assert.equal(outnumberTestRules({ ...base, defending: true }).length, 0);
  assert.equal(outnumberTestRules({ ...base, defending: false }).length, 1);
});

test('B12 : Maîtrise du combat seule vaut deux automatiquement ; une mêlée ordinaire sans saisie reste à 0', async () => {
  const store = await table(human('m', 'pj', [talent('combat-master')]), human('p', 'pj'), human('t', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('m', 't', {}))), 1);
  assert.equal(bonus(store.previewResolution(attack('p', 't', {}))), 0);
  // Cible Maîtrise du combat : elle pèse 2, un attaquant ordinaire seul ne la surpasse pas.
  assert.equal(bonus(store.previewResolution(attack('t', 'm', {}))), 0);
});

test('B12 : Maîtrise du combat ne se cumule pas avec la Taille ni avec Grande taille (poids = le plus fort)', async () => {
  // Cible Grande taille + Maîtrise du combat : poids 2 (et non 3) ; trois attaquants (3) contre 2 : non, quatre : oui.
  const store = await table(...pjs(4), human('big', 'ennemi', [talent('large'), talent('combat-master')]), named('Troll', 'troll', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 'big', { outnumberAttackerIds: allies(3) }))), 0);
  assert.equal(bonus(store.previewResolution(attack('pj1', 'big', { outnumberAttackerIds: allies(4) }))), 1);
  // Troll (Grande) : poids 2 avec ou sans Maîtrise du combat ajoutée.
  const trollMaster = { ...named('Troll', 'tm', 'ennemi'), talents: [talent('combat-master')] };
  const other = await table(...pjs(4), trollMaster);
  assert.equal(bonus(other.previewResolution(attack('pj1', 'tm', { outnumberAttackerIds: allies(4) }))), 1);
  assert.equal(bonus(other.previewResolution(attack('pj1', 'tm', { outnumberAttackerIds: allies(3) }))), 0);
});

test('B12 : « Cible encerclée » décochée ou périmée (moins de deux attaquants) ne s’applique plus', async () => {
  const store = await table(...pjs(3), human('t', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 't', { outnumberAttackerIds: [], surrounded: true }))), 0);
  assert.equal(bonus(store.previewResolution(attack('pj1', 't', { outnumberAttackerIds: ['pj2'], surrounded: true }))), 2);
  assert.equal(bonus(store.previewResolution(attack('pj1', 't', { outnumberAttackerIds: ['pj2'], surrounded: false }))), 1);
});

test('B12 : identifiants périmés, absents, hors zone, à 0 PV ou inconscients ignorés ; un id compté une seule fois', async () => {
  const down = { ...human('down', 'pj'), hp: 0 }, away = { ...human('away', 'pj'), zone: 'reserve' }, asleep = { ...human('asleep', 'pj'), states: [{ key: 'inconscient', name: 'Inconscient', level: 1 }] };
  const store = await table(human('pj1', 'pj'), human('ok', 'pj'), down, away, asleep, human('t', 'ennemi'));
  const context = { outnumberAttackerIds: ['down', 'away', 'asleep', 'absent', 'pj1', 't'] };
  assert.equal(bonus(store.previewResolution(attack('pj1', 't', context))), 0);
  assert.equal(bonus(store.previewResolution(attack('pj1', 't', { outnumberAttackerIds: ['ok', 'ok'] }))), 1);
  const [a, b] = pjs(2), foe = human('t', 'ennemi');
  // Un id présent des deux côtés ne compte que du côté naturel (celui de l'attaquant ici).
  const plan = planOutnumbering({ actor: a, target: foe, participants: [a, b, foe], context: { outnumberAttackerIds: ['pj2'], outnumberDefenderIds: ['pj2'] } });
  assert.equal(plan.attackers.count, 2);
  assert.equal(plan.defenders.count, 1);
});

test('B12 : un PNJ allié se coche aux côtés d’un PJ, et inversement ; les candidats écartent les inconscients', () => {
  const pj = human('pj', 'pj'), friend = { ...human('friend', 'allie'), kind: 'PNJ' }, foe = human('t', 'ennemi'), foe2 = human('t2', 'ennemi');
  const sleeper = { ...human('sleeper', 'ennemi'), states: [{ key: 'inconscient', name: 'Inconscient', level: 1 }] };
  const participants = [pj, friend, foe, foe2, sleeper];
  const fromPj = engagedCandidates({ actor: pj, target: foe, participants });
  assert.deepEqual(fromPj.attackers.map(p => p.id), ['friend']);
  assert.deepEqual(fromPj.defenders.map(p => p.id), ['t2']);
  assert.deepEqual(engagedCandidates({ actor: friend, target: foe, participants }).attackers.map(p => p.id), ['pj']);
  const plan = planOutnumbering({ actor: pj, target: foe, participants, context: { outnumberAttackerIds: ['friend'] } });
  assert.equal(plan.summary, '2 contre 1 : surnombre, +1 DR');
});

test('B12 : la saisie de surnombre ne vaut que pour la cible sélectionnée (comparaison multi-cibles) et se vide au changement de cible', () => {
  const context = { outnumberAttackerIds: ['p2'], outnumberDefenderIds: ['x'], surrounded: true, calledShot: true };
  assert.deepEqual(withoutOutnumberContext(context), { calledShot: true });
  assert.deepEqual(context.outnumberAttackerIds, ['p2']);
});

test('B12 : les neutres sont isolés, ni alliés ni engagés de la cible des autres neutres', () => {
  const pj = human('pj', 'pj'), foe = human('t', 'ennemi'), n1 = human('n1', 'neutre'), n2 = human('n2', 'neutre');
  const ids = list => list.map(p => p.id);
  const around = engagedCandidates({ actor: pj, target: foe, participants: [pj, foe, n1, n2] });
  assert.deepEqual([ids(around.attackers), ids(around.defenders)], [[], []]);
  const neutral = engagedCandidates({ actor: n1, target: n2, participants: [pj, foe, n1, n2] });
  assert.deepEqual([ids(neutral.attackers), ids(neutral.defenders)], [[], []]);
});

test('B12 : même côté (PJ contre PJ) : les autres membres sont proposés des deux côtés, sans doublon une fois cochés', () => {
  const [a, b, c, d] = pjs(4);
  const ids = list => list.map(p => p.id);
  const all = [a, b, c, d];
  const open = engagedCandidates({ actor: a, target: b, participants: all });
  assert.deepEqual([ids(open.attackers), ids(open.defenders)], [['pj3', 'pj4'], ['pj3', 'pj4']]);
  const checked = engagedCandidates({ actor: a, target: b, participants: all, context: { outnumberAttackerIds: ['pj3'] } });
  assert.deepEqual([ids(checked.attackers), ids(checked.defenders)], [['pj3', 'pj4'], ['pj4']]);
  const other = engagedCandidates({ actor: a, target: b, participants: all, context: { outnumberDefenderIds: ['pj4'] } });
  assert.deepEqual([ids(other.attackers), ids(other.defenders)], [['pj3'], ['pj3', 'pj4']]);
  const both = planOutnumbering({ actor: a, target: b, participants: all, context: { outnumberAttackerIds: ['pj3'], outnumberDefenderIds: ['pj3'] } });
  assert.equal(both.attackers.count, 2);
  assert.equal(both.defenders.count, 1);
  // Cible = acteur : rien à calculer.
  assert.equal(planOutnumbering({ actor: a, target: a, participants: all, context: { outnumberAttackerIds: ['pj2'] } }).applicable, false);
});

test('B12 : « encerclé » ignoré quand aucun allié valide ne reste coché (id périmé ou inconscient)', async () => {
  const asleep = { ...human('asleep', 'pj'), states: [{ key: 'inconscient', name: 'Inconscient', level: 1 }] };
  const store = await table(human('pj1', 'pj'), asleep, human('t', 'ennemi'));
  assert.equal(bonus(store.previewResolution(attack('pj1', 't', { outnumberAttackerIds: ['asleep', 'absent'], surrounded: true }))), 0);
});
});

describe('taille branchée', () => {
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = { id: 'h', name: 'Humain', kind: 'PJ', camp: 'pj', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, F: 40, E: 30, Ag: 40 }, talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };

async function table() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library, zone: 'active' });
  await store.addParticipant(stegadon);
  await store.addParticipant({ ...human });
  return { store, stegadon };
}
const attack = (actorId, targetId, extra = {}) => ({ resolutionId: `b1-${actorId}`, actorId, targetId, action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });

test('B1 : le Stegadon (Trait Taille) impose −2 DR à la défense de l’humain, sans talent ni rang saisi', async () => {
  const { store, stegadon } = await table();
  const preview = store.previewResolution(attack(stegadon.id, 'h'));
  assert.equal(preview.defenderTest.details.modifiers.find(m => m.id === 'talent:large-defense')?.amount, -2);
});

test('B1 : aucune pénalité quand le Stegadon défend contre l’humain', async () => {
  const { store, stegadon } = await table();
  const reverse = store.previewResolution(attack('h', stegadon.id));
  assert.ok(!reverse.defenderTest.details.modifiers.some(m => m.id === 'talent:large-defense'));
});

test('B1 : Force opposée gagnée automatiquement par la plus grande créature à deux crans d’écart', async () => {
  const { store, stegadon } = await table();
  const raw = { resolutionId: 'b1-force', actorId: 'h', targetId: stegadon.id, action: { type: 'opposition', attr: 'F', base: 90 }, roll: 5, defense: { attr: 'F', base: 10, roll: 99, v5: { kind: 'test', context: { opposedTest: true } } }, v5: { kind: 'test', context: { opposedTest: true } } };
  const result = store.previewResolution(raw);
  assert.equal(result.opposition.winner, 'defender');
});

test('B1 : le rappel de Taille (poids au surnombre) est sur la carte du Stegadon, pas du PJ', async () => {
  const { store, stegadon } = await table();
  const texts = store.getParticipantReminders(stegadon.id).map(item => item.text);
  assert.ok(texts.some(text => /Taille/.test(text) && /surnombre/.test(text)));
  assert.deepEqual(store.getParticipantReminders('h'), []);
});
});

describe('création de familier', () => {
// B10 : création de familier (décisions du MJ du 22/10) : un événement unique qui débite 1 Destin ou 1 Résilience du maître,
// chaque point supplémentaire cédé donne 1 point à répartir, le familier devient un PNJ allié lié au maître, Annuler rend le point.
const clone = value => structuredClone(value);

async function table({ fate = 3 } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'Magda', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 12, maxHp: 12, caracs: { Int: 40, FM: 45 }, traits: [], talents: [], states: [], extensions: { v5: fate === null ? {} : { fate } } };
  const imp = { id: 'imp', name: 'Homoncule', kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 6, maxHp: 6, caracs: { Int: 30, FM: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const cat = { id: 'cat', name: 'Chat', kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 40, hp: 4, maxHp: 4, caracs: { Int: 15, FM: 20 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'imp', 'cat'], participants: [hero, imp, cat] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b10' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const get = (store, id) => store.getCombat().participants.get(id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' };

test('B10 : plan de création, coût et points à répartir ; refus motivés', () => {
  const master = { id: 'm', camp: 'pj', extensions: { v5: { fate: 2 } } }, familiar = { id: 'f', extensions: { v5: {} } };
  const plan = planFamiliarCreation(master, familiar, { ...homunculus, extraPoints: 1 });
  assert.equal(plan.ok, true);
  assert.deepEqual([plan.before, plan.spent, plan.after, plan.pointsToDistribute, plan.camp], [2, 2, 0, 1, 'allie']);
  assert.equal(planFamiliarCreation(master, familiar, { ...homunculus, extraPoints: 2 }).ok, false);
  assert.match(planFamiliarCreation(master, familiar, { ...homunculus, resource: 'gold' }).message, /Destin ou Résilience/);
  const unknown = planFamiliarCreation({ id: 'm', extensions: { v5: {} } }, familiar, homunculus);
  assert.equal(unknown.ok, false);
  assert.match(unknown.message, /Destin du maître inconnu/);
  assert.equal(planFamiliarCreation({ id: 'm', extensions: { v5: {} } }, familiar, { ...homunculus, balance: 1 }).before, 1);
  assert.equal(familiarCostBalance({ fate: 4 }, 'fate'), 4);
  assert.equal(familiarCostBalance({ extensions: { v5: { resilience: 2 } } }, 'resilience'), 2);
  assert.equal(planFamiliarCreation(master, master, homunculus).ok, false);
});

test('B10 : créer un familier depuis le bloc de la carte, Destin débité, PNJ allié lié ; Annuler rend le point', async () => {
  const store = await table();
  const made = [];
  const values = { '.familiar-target': 'imp', '.familiar-system': 'homunculus', '.familiar-kind': 'power', '.familiar-wind': 'aqshy', '.familiar-species': '', '.familiar-resource': 'fate', '.familiar-extra': '1', '.familiar-balance': '' };
  const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); }, querySelector(selector) { return { value: values[selector] ?? '' }; } }; made.push(el); return el; };
  const block = buildFamiliarBlock(createElement, get(store, 'hero'), store.listParticipants());
  assert.ok(block);
  assert.ok(made.some(el => el.className === 'tiny btn-create-familiar' && el.textContent === 'Création de familier'));
  const options = made.filter(el => el.tag === 'option').map(el => el.textContent);
  for (const name of ['Homoncule', 'Familier animal', 'Familier de combat', 'Familier de puissance', 'Familier de sort', 'Destin', 'Résilience']) assert.ok(options.includes(name), name);
  assert.ok(options.includes('Chat') && options.includes('Homoncule'));
  const inputs = readFamiliarInputs(block);
  assert.deepEqual(inputs, { familiarId: 'imp', system: 'homunculus', kind: 'power', wind: 'aqshy', species: null, resource: 'fate', extraPoints: 1, balance: null });
  const done = await store.createFamiliar('hero', inputs.familiarId, inputs);
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').extensions.v5.fate, 1);
  assert.equal(get(store, 'hero').fate, 1);
  const link = get(store, 'hero').extensions.v5.familiarLinks[0];
  assert.deepEqual(link.creation, { resource: 'fate', before: 3, spent: 2, after: 1, pointsToDistribute: 1, balanceEntered: false, campBefore: 'neutre' }); // B11c : camp d'avant la création, rendu au retrait du lien
  assert.equal(get(store, 'imp').extensions.v5.familiarOf.masterId, 'hero');
  assert.equal(get(store, 'imp').camp, 'allie');
  assert.match(store.getLog()[0].text, /Création de familier/);
  // Le bloc du maître liste alors son familier ; le familier n'a pas de bloc de création.
  made.length = 0;
  buildFamiliarBlock(createElement, get(store, 'hero'), store.listParticipants());
  assert.ok(made.some(el => /Homoncule : Familier de puissance, Imprégné d’Aqshy, 1 point à répartir/.test(el.textContent || '')));
  assert.equal(buildFamiliarBlock(createElement, get(store, 'imp'), store.listParticipants()), null);
  await store.undo();
  assert.equal(get(store, 'hero').extensions.v5.fate, 3);
  assert.equal(get(store, 'hero').extensions.v5.familiarLinks?.length || 0, 0);
  assert.equal(get(store, 'imp').extensions.v5.familiarOf, undefined);
  assert.equal(get(store, 'imp').camp, 'neutre');
});

test('B10 : Résilience inconnue saisie par le MJ, familier animal ; refus sans révision', async () => {
  const store = await table({ fate: null });
  const before = store.getHistory().past.length;
  const refused = await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'resilience' });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Résilience du maître inconnue/);
  assert.equal(store.getHistory().past.length, before);
  const done = await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'resilience', balance: 2 });
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').extensions.v5.resilience, 1);
  assert.equal(get(store, 'hero').extensions.v5.familiarLinks[0].creation.balanceEntered, true);
  await store.undo();
  assert.equal(get(store, 'hero').extensions.v5.resilience, undefined);
});
});

describe('Destin et Résilience des fiches', () => {
// B10b : le Destin et la Résilience de la fiche (champs `destin` et `resilience`) sont importés par la synchronisation des
// fiches vers les valeurs durables lues par la création de familier (`extensions.v5.fate`, `extensions.v5.resilience`).
const clone = value => structuredClone(value);
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const fiche = extra => ficheSnapshot('caelel', { ...fixture, ...extra });
const get = (store, id) => store.getCombat().participants.get(id);

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
  const hero = { id: 'hero', profileId: 'pj', name: 'Caelel', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 14, maxHp: 14, caracs: { Int: 40, FM: 45 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const imp = { id: 'imp', name: 'Homoncule', kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 6, maxHp: 6, caracs: { Int: 30, FM: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const snapshot = { schemaVersion: 3, reserve: [profile], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'imp'], participants: [hero, imp] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b10b' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const sync = (store, snapshot) => store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {} }]);

test('B10b : l’instantané lit Destin et Résilience de la fiche, ignore les valeurs invalides', () => {
  assert.deepEqual(fiche({ destin: '3', resilience: '2' }).durables, { fate: 3, resilience: 2 });
  assert.equal(fiche({ destin: '', resilience: 'x' }).durables, undefined);
  assert.deepEqual(fiche({ destin: '1', chance: '2' }).resources, { fortune: 2 });
});

test('B10b : fiche Destin 3, Résilience 2 → créer un familier en Résilience débite 1, Annuler le rend', async () => {
  const store = await table();
  await sync(store, fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 3);
  assert.equal(get(store, 'hero').extensions.v5.resilience, 2);
  const done = await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'resilience' });
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').extensions.v5.resilience, 1);
  assert.equal(get(store, 'hero').extensions.v5.familiarLinks[0].creation.balanceEntered, false);
  await store.undo();
  assert.equal(get(store, 'hero').extensions.v5.resilience, 2);
});

test('B10b : une resynchronisation sans changement de fiche ne rend pas le point débité ; une fiche modifiée le remplace', async () => {
  const store = await table();
  await sync(store, fiche({ destin: '3', resilience: '2' }));
  await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' });
  assert.equal(get(store, 'hero').extensions.v5.fate, 2);
  assert.equal(get(store, 'hero').fate, 2);
  await sync(store, fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 2, 'fiche inchangée : le débit est conservé');
  await sync(store, fiche({ destin: '4', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 4, 'fiche modifiée : nouvelle valeur de la fiche');
  assert.equal(get(store, 'hero').extensions.v5.resilience, 2);
});

test('B10b : fiche sans Résilience → la saisie à la main reste demandée', async () => {
  const store = await table();
  const { resilience, ...rest } = fixture;
  await sync(store, ficheSnapshot('caelel', { ...rest, destin: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 2);
  assert.equal(get(store, 'hero').extensions.v5.resilience, undefined);
  const refused = await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'resilience' });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Résilience du maître inconnue/);
});
});

describe('services des familiers', () => {
// B11 : services restants des familiers branchés sur les commandes existantes : talents de compagnon dans les Tests du maître,
// refus d'États et de soins à l'homoncule, mort de l'animal (Calme + dégâts saisis), rappels, portée de l'animal.
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const person = (id, extra = {}) => ({ id, name: id, kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 10, maxHp: 10, caracs: { Ag: 40, Soc: 40, FM: 40, Int: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const get = (store, id) => store.getCombat().participants.get(id);
const ALLEY_CAT_SKILL = 'skill-44_69_73_63_72_e9_74_69_6f_6e-55_72_62_61_69_6e_65';

async function table() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant(person('hero', { name: 'Magda', kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, extensions: { v5: { fate: 3 } } }));
  await store.addParticipant(person('imp', { name: 'Homoncule' }));
  await store.addParticipant(person('cat', { name: 'Minou', hp: 4, maxHp: 4 }));
  await store.addParticipant(person('foe', { name: 'Brigand', camp: 'ennemi' }));
  return store;
}
const stealth = (store, exp = {}) => store.previewResolution({ resolutionId: 'b11-stealth', actorId: 'hero', targetId: 'foe', action: { type: 'test', attr: 'Ag', base: 50, label: 'Discrétion (Urbaine)', ...exp }, roll: 30, v5: { kind: 'test', context: { skillId: ALLEY_CAT_SKILL } } });

test('B11 : talent de compagnon (Chat de gouttière) effectif dans le Test du maître seulement quand l’animal est à portée', async () => {
  const store = await table();
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  // Le lien d'un animal n'agit qu'à portée : hors de portée, rien n'est donné.
  const away = stealth(store);
  assert.ok(!(away.test?.details?.advantages || away.actorTest?.details?.advantages || []).some(row => /Chat de gouttière|alley/i.test(row.label || row.id || '')));
  const link = get(store, 'hero').extensions.v5.familiarLinks[0];
  assert.equal(link.inRange, false);
  assert.equal(companionTalents(get(store, 'hero'), store.listParticipants()).granted.length, 0);
  await store.setFamiliarRange('hero', link.id, true);
  const granted = companionTalents(get(store, 'hero'), store.listParticipants()).granted.map(row => row.talentId);
  assert.deepEqual(granted, ['talent-alley-cat', null]);
  assert.ok(withCompanionTalents(get(store, 'hero'), store.listParticipants()).talents.some(row => row.id === 'talent-alley-cat' && row.source === 'companion'));
  assert.equal(get(store, 'hero').talents.length, 0, 'le participant stocké n’est jamais modifié');
  const near = stealth(store);
  const json = JSON.stringify(near);
  assert.match(json, /talent-alley-cat|Chat de gouttière/);
  assert.doesNotMatch(JSON.stringify(away), /talent-alley-cat/);
  const reminders = store.getParticipantReminders('hero').map(item => item.text).join('\n');
  assert.match(reminders, /Talent de compagnon : Chat de gouttière/);
  assert.match(reminders, /Vagabond \(Chat\) : talent à appliquer à la main/);
});

test('B11 : un talent déjà connu donne un rappel +1 DR au lieu d’un doublon', async () => {
  const store = await table();
  await store.updateParticipant('hero', { talents: [{ id: 'talent-alley-cat', status: 'resolved', rank: 1 }] });
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  await store.setFamiliarRange('hero', get(store, 'hero').extensions.v5.familiarLinks[0].id, true);
  const reminders = store.getParticipantReminders('hero').map(item => item.text).join('\n');
  assert.match(reminders, /Chat de gouttière déjà connu : \+1 DR/);
});

test('B11 : soin et États refusés à un homoncule sauf source magique ; l’animal et les autres ne sont pas touchés', async () => {
  const store = await table();
  await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' });
  await store.updateParticipant('imp', { hp: 3 });
  const history = store.getHistory().past.length;
  const refused = await store.healWounds('imp', 2);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /ne guérit que par guérison naturelle ou par la magie/);
  assert.equal(get(store, 'imp').hp, 3);
  const healed = await store.healWounds('imp', 2, { source: { kind: 'spell' } });
  assert.equal(healed.ok, true);
  assert.equal(get(store, 'imp').hp, 5);
  const poison = await store.acquireConditions('imp', ['Empoisonné']);
  assert.equal(poison.ok, false);
  assert.match(poison.message, /Empoisonné refusé : un homoncule ne le subit que d’une source magique/);
  assert.equal(get(store, 'imp').states.length, 0);
  const magical = await store.acquireConditions('imp', ['Empoisonné'], { magical: true });
  assert.equal(magical.status, 'applied');
  assert.equal(get(store, 'imp').states.length, 1);
  // Un État non restreint passe, et un participant sans lien est soigné normalement.
  assert.equal((await store.acquireConditions('imp', ['Aveugle'])).status, 'applied');
  await store.updateParticipant('foe', { hp: 4 });
  assert.equal((await store.healWounds('foe', 3)).status, 'applied');
  assert.ok(store.getHistory().past.length > history);
  assert.match(store.getParticipantReminders('imp').map(item => item.text).join('\n'), /Encombrement doublé/);
});

test('B11 : mort de l’animal depuis le bloc de la carte, Calme réussi ou raté, deux d10 saisis ; Annuler rend les Blessures', async () => {
  const store = await table();
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  const made = [];
  const values = { '.familiar-death-d1': '4', '.familiar-death-d2': '7' };
  const createElement = tag => { const el = { tag, children: [], dataset: {}, checked: true, appendChild(child) { this.children.push(child); }, querySelector(selector) { return selector in values ? { value: values[selector] } : selector === '.familiar-calm-failed' ? { checked: true } : { value: '' }; } }; made.push(el); return el; };
  const block = buildFamiliarBlock(createElement, get(store, 'hero'), store.listParticipants());
  const death = made.find(el => el.className === 'tiny btn-familiar-death');
  assert.ok(death && made.some(el => el.className === 'tiny btn-familiar-range'));
  assert.equal(death.dataset.familiarId, 'cat');
  const inputs = readFamiliarDeathInputs(block);
  assert.deepEqual(inputs, { calmFailed: true, rolls: [4, 7] });
  const missing = await store.resolveFamiliarDeath('hero', 'cat', { calmFailed: true, rolls: [4, null] });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /deux résultats de d10/);
  assert.equal(get(store, 'hero').hp, 20);
  const done = await store.resolveFamiliarDeath('hero', death.dataset.familiarId, inputs);
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').hp, 9);
  assert.match(store.getLog()[0].text, /Mort du familier.*11 Blessure/);
  await store.undo();
  assert.equal(get(store, 'hero').hp, 20);
  const success = await store.resolveFamiliarDeath('hero', 'cat', { calmFailed: false });
  assert.equal(success.damage, 0);
  assert.equal(get(store, 'hero').hp, 20);
  assert.equal((await store.resolveFamiliarDeath('hero', 'foe', { calmFailed: false })).ok, false);
});
});

describe('familiers — corrections', () => {
// B11c : corrections de la contre-vérification de B7-B11 (Lanceur de sorts de bestiaire, durables des fiches, soins et États de
// l'homoncule, Puissance totale, Contemplation, Élan, Vol de retour au livre de base, camp du familier délié).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 60, CT: 50, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const bestiary = (profile, id, extra = {}) => ({ ...buildParticipantFromBestiary(profile, { library, zone: 'active' }), id, camp: 'ennemi', states: [], ...extra });
const get = (store, id) => store.getCombat().participants.get(id);

async function table(participants, reserve = []) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve, combat: { round: 1, currentActorId: participants[0].id, order: participants.map(item => item.id), participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b11c' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' };

test('B11c 1 : sans compétence imprimée, le Lanceur de sorts teste à la base de son Trait ; une compétence imprimée prime', async () => {
  const printed = bestiary('E0-P-256', 'printed');
  const bare = bestiary('E0-P-256', 'bare', { skills: [] });
  // Slann 5ᵉ génération (L07) : Focalisation et Langue (Magick) imprimées à 105, Trait à 95.
  assert.equal(resolveChannellingSkill(printed).score, 105);
  assert.equal(resolveCastingSkill(printed).score, 105);
  assert.equal(resolveChannellingSkill(bare).score, 95);
  assert.equal(resolveCastingSkill(bare).score, 95);
  // L'action affichée porte la valeur réellement employée.
  const shown = participant => Object.fromEntries(magicActionsFor(participant).map(action => [action.type, action.base]));
  assert.deepEqual(shown(printed), { channelling: 105, dispel: 105, cast: 105 });
  assert.deepEqual(shown(bare), { channelling: 95, dispel: 95, cast: 95 });
  // Sans le Trait, rien ne change : la caractéristique brute.
  const plain = person('plain', { skills: [], caracs: { Int: 40, FM: 50 } });
  assert.equal(resolveCastingSkill(plain).score, 40);
  assert.equal(resolveChannellingSkill(plain).score, 50);
  // Le Test d'incantation y emploie bien ce score.
  const store = await table([bare, person('hero', { camp: 'pj' })]);
  assert.equal(previewCasting(get(store, 'bare'), { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' }, { roll: 40 }).score, 95);
});

test('B11c 2 : la première synchro après B10b n’écrase pas un Destin dépensé ; une fiche modifiée le remplace', async () => {
  const fiche = extra => ficheSnapshot('caelel', { ...fixture, ...extra });
  const old = fiche({ destin: '3', resilience: '2' });
  delete old.durables; // snapshot antérieur à B10b
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, ficheSnapshot: old };
  const hero = person('hero', { profileId: 'pj', name: 'Caelel', kind: 'PJ', camp: 'pj', hp: 14, maxHp: 14, ficheSnapshot: old, extensions: { v5: { fate: 1, resilience: 0 } } });
  const store = await table([hero], [profile]);
  const sync = snapshot => store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {} }]);
  await sync(fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 1, 'Destin dépensé conservé');
  assert.equal(get(store, 'hero').extensions.v5.resilience, 0);
  assert.deepEqual(store.getFullJSON && JSON.parse(store.getFullJSON()).reserve[0].ficheSnapshot.durables, { fate: 3, resilience: 2 }, 'le snapshot garde la valeur de la fiche');
  await sync(fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 1, 'fiche inchangée');
  await sync(fiche({ destin: '4', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 4, 'fiche modifiée : valeur de la fiche');
  assert.equal(get(store, 'hero').extensions.v5.resilience, 0, 'Résilience inchangée dans la fiche');
});

test('B11c 3 : l’homoncule guérit par guérison naturelle ou par sort, rien d’autre', async () => {
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre', hp: 3, maxHp: 10 })]);
  await store.createFamiliar('hero', 'imp', homunculus);
  const refused = await store.healWounds('imp', 2);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /guérison naturelle ou par la magie/);
  assert.equal((await store.healWounds('imp', 2, { source: { kind: 'skill', name: 'Soin' } })).ok, false);
  assert.equal(get(store, 'imp').hp, 3);
  assert.equal((await store.healWounds('imp', 2, { source: { kind: 'natural' } })).ok, true);
  assert.equal(get(store, 'imp').hp, 5);
  assert.equal((await store.healWounds('imp', 2, { source: { kind: 'spell' } })).ok, true);
  assert.equal(get(store, 'imp').hp, 7);
  assert.equal(previewFamiliarHealing(get(store, 'imp'), { kind: 'miracle' }).ok, false);
  assert.equal(previewFamiliarHealing(get(store, 'hero'), {}).ok, true);
});

test('B11c 3 : Venin et États de critique ne touchent un homoncule que d’une source magique', async () => {
  const swarm = bestiary('E0-P-245', 'swarm');
  const magicalSwarm = { ...bestiary('E0-P-245', 'magic-swarm'), traits: [...swarm.traits, { name: 'Magical' }] };
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), swarm, magicalSwarm]);
  await store.createFamiliar('hero', 'imp', homunculus);
  const refused = await store.applyCreatureVenom('swarm', 'imp');
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'familiar-condition');
  assert.ok(!get(store, 'imp').states.some(state => state.key === 'empoisonne'));
  assert.equal((await store.applyCreatureVenom('magic-swarm', 'imp')).ok, true);
  assert.ok(get(store, 'imp').states.some(state => state.key === 'empoisonne'));
  // États issus d'un critique (Coupure mineure : Hémorragique) : écartés d'un attaquant non magique, posés par un attaquant magique.
  const strike = attackerId => ({ resolutionId: `b11c-crit-${attackerId}`, actorId: attackerId, targetId: 'imp', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 17 } });
  const plainStore = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), person('foe'), person('demon', { traits: [{ name: 'Daemonic' }] })]);
  await plainStore.createFamiliar('hero', 'imp', homunculus);
  const bleedingOf = s => get(s, 'imp').states.filter(state => state.key === 'hemorragique').length;
  const first = plainStore.previewResolution(strike('foe'));
  // L'aperçu lui-même montre l'État refusé, avec la raison, et ne le promet plus.
  assert.ok(!first.targetConditionApplication.some(state => state.key === 'hemorragique'));
  assert.ok(!first.critical.application.states.some(state => state.key === 'hemorragique'));
  assert.equal(first.familiarConditionRefusals[0].state, 'Hémorragique');
  assert.match(first.familiarConditionRefusals[0].message, /source magique/);
  assert.ok(first.reminders.some(text => /Hémorragique refusé/.test(text)));
  const applied = await plainStore.applyResolution(first);
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(bleedingOf(plainStore), 0);
  assert.equal(applied.resolution.familiarConditionRefusals[0].state, 'Hémorragique');
  assert.ok(get(plainStore, 'imp').hp < 40, 'les Blessures restent infligées');
  const entry = plainStore.getLog ? plainStore.getLog()[0] : JSON.parse(plainStore.getFullJSON()).log[0];
  assert.match(entry.text, /États refusés : imp \(Hémorragique\)/);
  assert.equal(entry.detail.familiarConditionRefusals[0].state, 'Hémorragique');
  // Attaquant au Trait Magique, Démoniaque ou Éthéré (décision du MJ du 25/10), arme enchantée ou nature déclarée par le MJ : l'État passe.
  for (const [id, declared] of [['demon', undefined], ['ghost', undefined], ['foe', { magical: true }]]) {
    const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), person('foe'), person('demon', { traits: [{ name: 'Daemonic' }] }), person('ghost', { traits: [{ name: 'Ethereal' }] })]);
    await store.createFamiliar('hero', 'imp', homunculus);
    const input = strike(id);
    if (declared) input.v5 = { ...input.v5, context: { attackNature: declared } };
    const preview = store.previewResolution(input);
    assert.ok(preview.targetConditionApplication.some(state => state.key === 'hemorragique'), id);
    assert.equal(preview.familiarConditionRefusals.length, 0);
    assert.equal((await store.applyResolution(preview)).status, 'applied');
    assert.equal(bleedingOf(store), 1, id);
  }
});

test('B11c 3 : un Hémorragique sur un participant ordinaire n’est jamais refusé', async () => {
  const store = await table([person('hero', { camp: 'pj' }), person('foe')]);
  const preview = store.previewResolution({ resolutionId: 'b11c-plain', actorId: 'hero', targetId: 'foe', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 17 } });
  assert.ok(preview.targetConditionApplication.some(state => state.key === 'hemorragique'));
  assert.equal(preview.familiarConditionRefusals.length, 0);
});

test('B11c 4 bis : l’écart caractéristiques courantes / de base ne compte qu’une fois', () => {
  const bare = bestiary('E0-P-256', 'bare', { skills: [] });
  const boosted = { ...bare, caracs: { ...bare.caracs, Int: 50, FM: 50 }, extensions: { ...bare.extensions, v5: { ...bare.extensions.v5, baseCaracs: { ...bare.caracs, Int: 40, FM: 40 } } } };
  assert.equal(resolveCastingSkill(boosted).score, 60);
  assert.equal(resolveChannellingSkill(boosted).score, 60);
  assert.deepEqual(Object.fromEntries(magicActionsFor(boosted).map(action => [action.type, action.base])), { channelling: 60, dispel: 60, cast: 60 });
  // Sans baseCaracs : Trait sur les caractéristiques courantes (inchangé).
  assert.equal(resolveCastingSkill({ ...boosted, extensions: { ...boosted.extensions, v5: { ...boosted.extensions.v5, baseCaracs: undefined } } }).score, 60);
});

test('B11c 4 : Puissance totale lue sur le jet retenu, pas sur le jet initial', async () => {
  const store = await table([bestiary('E0-P-258', 'power'), person('hero', { camp: 'pj' })]);
  const power = get(store, 'power');
  const spell = { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' };
  // 07 inversé de force en 70 (Désavantage) : unité 0 sur le jet retenu, lancement réussi → critique.
  const forced = previewCasting(power, spell, { roll: 7, disadvantageSources: [{ id: 'd', label: 'Désavantage' }] });
  assert.equal(forced.testSuccess, true);
  assert.equal(forced.critical, true);
  // 30 inversé en 03 (Avantage) : le jet retenu n'a plus d'unité 0, pas de critique.
  const kept = previewCasting(power, spell, { roll: 30, advantageSources: [{ id: 'a', label: 'Avantage' }], choice: 'reverse' });
  assert.equal(kept.testSuccess, true);
  assert.equal(kept.critical, false);
  assert.equal(previewCasting(power, spell, { roll: 30, advantageSources: [{ id: 'a', label: 'Avantage' }], choice: 'keep' }).critical, true);
});

test('B11c 5 : Contemplation, +0 réussi (Détaché) et −0 échec marginal (Brume de pensée) distingués', async () => {
  const master = bestiary('E0-P-257', 'master');
  const at = (sl, options) => contemplationOutcome(master, sl, options);
  assert.equal(at(1).outcome, 'detached');
  assert.equal(at(0, { success: true }).outcome, 'detached');
  assert.equal(at('+0').outcome, 'detached');
  assert.equal(at(0, { success: false }).outcome, 'fog');
  assert.equal(at('-0').outcome, 'fog');
  assert.equal(at('−0').outcome, 'fog');
  assert.equal(at(-0).outcome, 'fog');
  assert.equal(at(0).available, false);
  assert.match(at(0).unresolved[0], /\+0.*−0/);
  assert.equal(at(-3).outcome, 'fog');
  assert.equal(at(-4).outcome, 'lost');
  assert.equal(at(2).outcome, 'alive');
  assert.match(master.extensions.v5.bestiary && JSON.stringify(contemplationOutcome(master, 2).reminders), /Alerte/);
  // Par le Store : « −0 » pose les deux Exténué, « +0 » non.
  const store = await table([master, person('hero', { camp: 'pj' })]);
  const fatigue = () => get(store, 'master').states.filter(state => /extenu/i.test(state.key || state.name)).reduce((sum, state) => sum + (state.level || 1), 0);
  assert.equal((await store.applySlannContemplation('master', 0, { success: true })).outcome, 'detached');
  assert.equal(fatigue(), 0);
  assert.equal((await store.applySlannContemplation('master', 0)).ok, false);
  assert.equal((await store.applySlannContemplation('master', 0, { success: false })).outcome, 'fog');
  assert.equal(fatigue(), 2);
  // Saisie de la carte : « -0 » respecté, sinon la liste +0 / −0.
  const read = (sl, zero) => readSlannInputs({ querySelector: selector => ({ value: selector.includes('zero') ? zero : sl }) });
  assert.deepEqual(read('-0', ''), { sl: 0, success: false });
  assert.deepEqual(read('0', 'success'), { sl: 0, success: true });
  assert.deepEqual(read('0', 'failure'), { sl: 0, success: false });
  assert.deepEqual(read('0', ''), { sl: 0 });
  assert.deepEqual(read('2', 'success'), { sl: 2 });
  const made = [];
  const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); } }; made.push(el); return el; };
  buildSlannBlock(createElement, master);
  assert.ok(made.some(el => el.className === 'tiny slann-contemplation-zero'));
  assert.ok(made.some(el => /Difficile −1 DR/.test(el.title || '')));
});

test('B11c 6 : fin de Round de la Nuée et mort du familier retirent l’Élan comme les autres dégâts', async () => {
  const swarm = bestiary('E0-P-245', 'swarm');
  const hero = person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3, hasMomentum: true } } });
  const store = await table([swarm, hero, person('cat', { camp: 'neutre', hp: 4, maxHp: 4 })]);
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, true);
  await store.applySwarmEndOfRound('swarm', ['hero']);
  assert.equal(get(store, 'hero').hp, 39);
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, false);
  await store.updateParticipant('hero', { extensions: { ...get(store, 'hero').extensions, v5: { ...get(store, 'hero').extensions.v5, hasMomentum: true } } });
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, true);
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  await store.updateParticipant('hero', { extensions: { ...get(store, 'hero').extensions, v5: { ...get(store, 'hero').extensions.v5, hasMomentum: true } } });
  const done = await store.resolveFamiliarDeath('hero', 'cat', { calmFailed: true, rolls: [3, 4] });
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').hp, 32);
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, false);
});

test('B11c 7 : Vol, −2 DR au tir du porteur en vol ; rien de chiffré contre lui', async () => {
  const roc = bestiary(library.find(profile => profile.nameFr === 'Roc plume-vive').id, 'roc');
  const store = await table([roc, person('h', { camp: 'pj' })]);
  const shot = (actorId, targetId, context) => ({ resolutionId: `b11c-shot-${actorId}-${JSON.stringify(context)}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged', context } });
  const amount = preview => preview.test.details.modifiers.find(m => m.id === 'move:fly-ranged')?.amount;
  assert.equal(amount(store.previewResolution(shot('roc', 'h', { airborne: true }))), -2);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', {}))), undefined);
  assert.equal(amount(store.previewResolution(shot('h', 'roc', { airborne: true, targetAirborne: true }))), undefined);
  assert.match(roc.traits.join(' ') + JSON.stringify(store.getParticipantReminders('roc')), /pour le viser, la portée est décalée d.un cran/);
});

test('B11c 8 : retirer le lien rend au familier le camp d’avant la création', async () => {
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' })]);
  assert.equal((await store.createFamiliar('hero', 'imp', homunculus)).ok, true);
  assert.equal(get(store, 'imp').camp, 'allie');
  const link = get(store, 'hero').extensions.v5.familiarLinks[0];
  assert.equal((await store.unlinkFamiliar('hero', link.id)).ok, true);
  assert.equal(get(store, 'imp').camp, 'neutre');
  assert.equal(get(store, 'imp').extensions.v5.familiarOf, undefined);
  await store.undo();
  assert.equal(get(store, 'imp').camp, 'allie');
});

test('B11c 3 ter : qualité Magique d’un attaquant ordinaire (l’État passe) ; sans elle, refus', async () => {
  const build = async () => {
    const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), person('foe')]);
    await store.createFamiliar('hero', 'imp', homunculus);
    return store;
  };
  const strike = (extra = {}) => ({ resolutionId: 'b11c-quality', actorId: 'foe', targetId: 'imp', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5, ...extra }, defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 17 } });
  const plain = (await build()).previewResolution(strike());
  assert.equal(plain.familiarConditionRefusals.length, 1);
  const magical = (await build()).previewResolution(strike({ qualities: [{ id: 'magique' }] }));
  assert.equal(magical.familiarConditionRefusals.length, 0);
  assert.ok(magical.targetConditionApplication.some(state => state.key === 'hemorragique'));
  const store = await build();
  assert.equal((await store.applyResolution(store.previewResolution(strike({ qualities: [{ id: 'magique' }] })))).status, 'applied');
  assert.equal(get(store, 'imp').states.filter(state => state.key === 'hemorragique').length, 1);
});

test('B11c 2 bis : Tourbillon, l’État refusé disparaît aussi de la cible secondaire homoncule, pas d’un participant ordinaire', async () => {
  const whirl = { id: 'talent-whirlwind-of-death', status: 'resolved', rank: 1 };
  const store = await table([
    person('a', { camp: 'pj', kind: 'PJ', talents: [whirl], extensions: { v5: { resourceCharacterId: 'test-a', hasMomentum: false } } }),
    person('b'), person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }),
    person('imp', { camp: 'neutre', hp: 1, maxHp: 1 }), person('ord', { hp: 1, maxHp: 1 })]);
  await store.createFamiliar('hero', 'imp', homunculus);
  await store.setFortune('a', 2);
  const raw = { resolutionId: 'b11c-whirl', actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { specialAttack: 'whirlwind-of-death', engagedIds: ['b', 'imp', 'ord'], allEngagedIncluded: true, whirlwindRolls: { imp: { secondEffect: 1 }, ord: { secondEffect: 1 } } } } };
  const preview = store.previewResolution(raw);
  const row = id => preview.secondaryTargets.find(item => item.participantId === id);
  const bleeds = id => (row(id).critical?.application.states || []).some(state => state.key === 'hemorragique');
  assert.ok(row('imp').critical && row('ord').critical, JSON.stringify(preview.unresolved));
  assert.ok(bleeds('ord'), 'le participant ordinaire garde l’État');
  assert.ok(!bleeds('imp'), 'l’homoncule ne le garde pas');
  assert.ok(!row('imp').participant.states.some(state => state.key === 'hemorragique'));
  assert.ok(row('ord').participant.states.some(state => state.key === 'hemorragique'));
  assert.ok(preview.familiarConditionRefusals.some(refusal => refusal.participantId === 'imp'));
});

test('B11c 1 bis : un refus { ok:false, message } du Store montre sa raison (awaitStore, refusalError)', async () => {
  const main = readFileSync('js/main.js', 'utf8');
  assert.match(main, /result\.message\.trim\(\) \? refusalError\(\{ message: result\.message \}, label\)/);
  const { refusalError, userMessage } = await import('../../../js/ui/messages.js');
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre', hp: 3 })]);
  await store.createFamiliar('hero', 'imp', homunculus);
  const heal = await store.healWounds('imp', 2);
  const poison = await store.acquireConditions('imp', ['Hémorragique']);
  for (const refused of [heal, poison]) {
    assert.equal(refused.ok, false);
    const shown = refusalError({ message: refused.message });
    assert.equal(userMessage(shown, 'repli'), refused.message);
    assert.notEqual(userMessage(shown, 'repli'), 'repli');
  }
  assert.match(poison.message, /Hémorragique refusé/);
  const view = readFileSync('js/ui/workspace-view.js', 'utf8');
  assert.match(view, /adjustHp\?\.\(.*\.catch\(error => import\('\.\/toast\.js'\)\.then\(\(\{ showToast \}\) => showToast\(userMessage\(error/s);
  assert.match(view, /state\.stateForm\.error = userMessage\(error/);
});
});

describe('bibliothèque du bestiaire', () => {
const dataUrl = path => new URL(`../../../js/data/bestiary/${path}`, import.meta.url);
const makeFetch = () => {
  const calls = [];
  const fetchJson = async path => { calls.push(path); return JSON.parse(readFileSync(dataUrl(path.split('/').pop()), 'utf8')); };
  return { calls, fetchJson };
};

test('B2 chargeur — l’index seul au départ, un livre à la demande, jamais deux fois', async () => {
  const { calls, fetchJson } = makeFetch();
  const loader = createBestiaryLoader(fetchJson);
  const books = await loader.index();
  assert.ok(books.length >= 20);
  assert.deepEqual(calls, ['./js/data/bestiary/index.json']);
  const [a, b] = await Promise.all([loader.book('L06'), loader.book('L06')]);
  assert.equal(a, b);
  assert.equal(calls.filter(path => path.endsWith('L06.json')).length, 1);
  assert.equal(calls.filter(path => path.endsWith('index.json')).length, 1);
  assert.deepEqual(loader.loadedBooks(), ['L06']);
  assert.equal(a.length, books.find(book => book.book === 'L06').counts.profiles + books.find(book => book.book === 'L06').counts.templates + books.find(book => book.book === 'L06').counts.pregenerated);
});

test('B2 chargeur — livre inconnu refusé, échec non mémorisé', async () => {
  const loader = createBestiaryLoader(async () => { throw new Error('réseau'); });
  await assert.rejects(loader.index(), /réseau/);
  let ok = false;
  const retry = createBestiaryLoader(async path => { if (!ok) { ok = true; throw new Error('réseau'); } return JSON.parse(readFileSync(dataUrl(path.split('/').pop()), 'utf8')); });
  await assert.rejects(retry.index(), /réseau/);
  assert.ok((await retry.index()).length > 0);
  await assert.rejects(retry.book('L99'), /inconnu/);
});

test('B2 filtre par mot-clé avec descendants (Mort-vivant retrouve le Zombie)', async () => {
  const library = await createBestiaryLoader(makeFetch().fetchJson).load(['L06']);
  const matches = (profile, keyword) => keywordMatches(profile.keywords || [], keyword);
  const names = filterBestiary(library, { keyword: 'mort-vivant', kinds: ['profile'] }, { matches }).map(profile => profile.name);
  assert.ok(names.includes('Zombie'));
  assert.ok(!names.includes('Human'));
  assert.deepEqual(filterBestiary(library, { text: 'zombi' }, { matches }).map(p => p.name).includes('Zombie'), true);
});

test('B2 copie dans la réserve — valeurs imprimées, profil valide', async () => {
  const library = await createBestiaryLoader(makeFetch().fetchJson).load(['L06']);
  const zombie = library.find(profile => profile.name === 'Zombie' && profile.kind === 'profile');
  const fields = buildReserveProfileFromBestiary(zombie.id, { library, group: 'Bestiaire' });
  const profile = new Profile(fields);
  assert.equal(profile.name, 'Zombie');
  assert.equal(profile.kind, 'Créature');
  assert.equal(profile.hp, 12);
  assert.equal(profile.maxHp, 12);
  assert.equal(profile.group, 'Bestiaire');
  assert.deepEqual(profile.keywords, ['zombie']);
  assert.deepEqual(profile.diceLines.map(line => [line.note, line.base, line.damage]), [['Hand Weapon', 25, 7], ['Bite', 30, 6]]);
  assert.equal(profile.extensions.v5.bestiary.id, zombie.id);
  assert.ok(profile.traits.includes('Undead'));
  const template = library.find(profile => profile.kind === 'template');
  assert.throws(() => buildReserveProfileFromBestiary(template.id, { library }), /gabarit/);
});
});

describe('plusieurs têtes branchées', () => {
// B2 : Plusieurs têtes sur la Hydre de guerre (L09, E0-P-319, « Many Heads 5 », Bite gratuite).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L09.json', 'utf8')).profiles;

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const beast = buildParticipantFromBestiary('E0-P-319', { library, zone: 'active' });
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b2' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const bite = store => store.getCombat().participants.get('beast').actions.find(action => action.name === 'Bite');
const input = (action, n) => ({ resolutionId: `b2-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' } });
async function bitesUntilRefused(store) {
  let done = 0;
  for (let n = 0; n < 9; n += 1) {
    let preview;
    try { preview = store.previewResolution(input(bite(store), n)); } catch { break; }
    if (preview.unresolved?.length) break;
    const result = await store.applyResolution(preview);
    if (result.status !== 'applied') break;
    done += 1;
  }
  return done;
}

test('B2 : le rappel de la Hydre dit 5 têtes valides, les attaques gratuites et la Perception +2 DR', async () => {
  const store = await table();
  const text = store.getParticipantReminders('beast').map(item => item.text).join('\n');
  assert.match(text, /5 tête\(s\) valide\(s\) sur 5/);
  assert.match(text, /Morsure ×5/);
  assert.match(text, /Perception : \+2 DR/);
});

test('B2 : une Morsure gratuite par tête valide et par Tour, la suivante est refusée', async () => {
  const store = await table();
  assert.equal(await bitesUntilRefused(store), 5);
});

test('B2 : deux têtes neutralisées par Blessure critique réduisent le quota à trois et le rappel suit', async () => {
  const store = await table();
  await store.setHeadState('beast', 'head-1', 'dead');
  await store.setHeadState('beast', 'head-2', 'stunned');
  assert.equal(await bitesUntilRefused(store), 3);
  const text = store.getParticipantReminders('beast').map(item => item.text).join('\n');
  assert.match(text, /3 tête\(s\) valide\(s\) sur 5/);
});

test('B2 : la Blessure critique ne vaut pour la créature qu’une fois toutes les têtes neutralisées (degré le moins grave)', async () => {
  const store = await table();
  for (const [head, state] of [['head-1', 'dead'], ['head-2', 'dead'], ['head-3', 'unconscious'], ['head-4', 'dead']]) await store.setHeadState('beast', head, state);
  assert.ok(!store.getParticipantReminders('beast').some(item => /Toutes les têtes sont neutralisées/.test(item.text)));
  await store.setHeadState('beast', 'head-5', 'stunned');
  assert.match(store.getParticipantReminders('beast').map(item => item.text).join('\n'), /Toutes les têtes sont neutralisées : la créature est étourdie/);
  assert.equal(await bitesUntilRefused(store), 0, 'aucune tête valide : aucune Morsure');
});

test('B2 : l’état d’une tête est annulable et un participant sans le Trait est refusé', async () => {
  const store = await table();
  await store.setHeadState('beast', 'head-1', 'dead');
  await store.undo();
  assert.match(store.getParticipantReminders('beast').map(item => item.text).join('\n'), /5 tête\(s\) valide\(s\) sur 5/);
  assert.equal((await store.setHeadState('hero', 'head-1', 'dead')).ok, false);
});

test('B2 : la carte de la Hydre affiche un bouton par tête, le clic passe à l’état suivant', async () => {
  const store = await table();
  const make = tag => { const node = { tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } }; return node; };
  const block = buildHeadsBlock(make, store.getCombat().participants.get('beast'));
  assert.equal(block.children.length, 5);
  assert.equal(block.children[0].textContent, 'Tête 1 : valide');
  assert.equal(nextHeadState('healthy'), 'stunned');
  assert.equal(nextHeadState('dead'), 'healthy');
  assert.equal(buildHeadsBlock(make, store.getCombat().participants.get('hero')), null);
});
});

describe('régénération branchée', () => {
// B3 : Régénération de la Hydre de guerre (L09, E0-P-319, Trait Regeneration).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L09.json', 'utf8')).profiles;

async function table({ hp = 60, criticals = [] } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const beast = buildParticipantFromBestiary('E0-P-319', { library, zone: 'active' });
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, criticalWounds: criticals } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b3' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const beastOf = store => store.getCombat().participants.get('beast');

test('B3 : le rappel de Régénération figure sur la Hydre, pas sur un participant sans le Trait', async () => {
  const store = await table();
  assert.match(store.getParticipantReminders('beast').map(item => item.text).join('\n'), /Régénération : Début de Round : 1d10/);
  assert.ok(!store.getParticipantReminders('hero').some(item => /Régénération/.test(item.text)));
});

test('B3 : le d10 saisi rend ce nombre de Blessures, plafonné au maximum, et le soin est annulable', async () => {
  const store = await table({ hp: 60 });
  const result = await store.applyRegeneration('beast', 6);
  assert.equal(result.ok, true);
  assert.equal(beastOf(store).hp, 66);
  await store.undo();
  assert.equal(beastOf(store).hp, 60);
  const near = await table({ hp: 97 });
  await near.applyRegeneration('beast', 9);
  assert.equal(beastOf(near).hp, 100);
});

test('B3 : les Blessures de feu manquantes ne se régénèrent pas', async () => {
  const store = await table({ hp: 60 });
  await store.applyRegeneration('beast', 10, { fireWounds: 38 });
  assert.equal(beastOf(store).hp, 62);
});

test('B3 : à zéro Blessure, 8 ou plus rend 1 Blessure, moins ne rend rien', async () => {
  const low = await table({ hp: 0 });
  await low.applyRegeneration('beast', 7);
  assert.equal(beastOf(low).hp, 0);
  const high = await table({ hp: 0 });
  await high.applyRegeneration('beast', 8);
  assert.equal(beastOf(high).hp, 1);
});

test('B3 : un 10 guérit une Blessure Critique, annulable ; un autre résultat n’en guérit aucune', async () => {
  const criticals = [{ id: 'c1', name: 'Bras brisé' }];
  const store = await table({ hp: 50, criticals });
  await store.applyRegeneration('beast', 5);
  assert.equal(beastOf(store).extensions.v5.criticalWounds.length, 1);
  const result = await store.applyRegeneration('beast', 10);
  assert.equal(result.criticalHeal.id, 'c1');
  assert.equal(beastOf(store).extensions.v5.criticalWounds.length, 0);
  await store.undo();
  assert.equal(beastOf(store).extensions.v5.criticalWounds.length, 1);
});

test('B3 : d10 invalide ou participant sans le Trait refusés', async () => {
  const store = await table();
  assert.equal((await store.applyRegeneration('beast', 11)).ok, false);
  assert.equal((await store.applyRegeneration('hero', 5)).ok, false);
  assert.equal(beastOf(store).hp, 60);
});

test('B3 : la carte affiche le bloc de Régénération (d10, feu, bouton) et lit la saisie', async () => {
  const store = await table();
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const block = buildRegenerationBlock(make, beastOf(store));
  assert.equal(block.children.filter(child => child.tag === 'input').length, 2);
  assert.equal(block.children.at(-1).className, 'tiny btn-regeneration');
  assert.equal(buildRegenerationBlock(make, store.getCombat().participants.get('hero')), null);
  const fields = { '.regen-roll': { value: '8' }, '.regen-fire': { value: '' } };
  assert.deepEqual(readRegenerationInputs({ querySelector: selector => fields[selector] }), { roll: 8, fireWounds: 0, fireCriticalIds: [] });
  assert.ok(Number.isNaN(readRegenerationInputs({ querySelector: () => ({ value: '' }) }).roll));
});
});

describe('psychologie branchée', () => {
// B4 : Terreur (3) du Spectre des cairns (L06, E0-P-097). Le Dragon de L06 n'a pas de Trait Terreur imprimé (BR-06).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L06.json', 'utf8')).profiles;
const calm = () => getReferenceCatalogue().skills.find(skill => skill.nom === 'Calme').id;
const person = (id, camp, extra = {}) => ({ id, name: id, kind: 'PNJ', camp, zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function table(extra = []) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const wraith = buildParticipantFromBestiary('E0-P-097', { library, zone: 'active' });
  const actor = { ...wraith, id: 'wraith', camp: 'ennemi', zone: 'active', states: [] };
  const participants = [actor, person('hero', 'pj'), person('ally', 'ennemi'), ...extra];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: participants.map(item => item.id), participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b4' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const who = (store, id) => store.getCombat().participants.get(id);

test('B4 : le rappel de Terreur figure sur le Spectre, pas sur un participant sans le Trait', async () => {
  const store = await table();
  assert.match(store.getParticipantReminders('wraith').map(item => item.text).join('\n'), /Terreur : Premier contact/);
  assert.ok(!store.getParticipantReminders('hero').some(item => /Terreur/.test(item.text)));
});

test('B4 : la Terreur posée par le MJ demande le Test de Calme à la cible ennemie seulement, annulable', async () => {
  const store = await table();
  const result = await store.applyCreaturePsychology('wraith', 'terror');
  assert.equal(result.ok, true);
  const terror = who(store, 'hero').states.find(state => state.key === 'terror-of-talent');
  assert.equal(terror.rating, 3);
  assert.ok(!who(store, 'ally').states.some(state => state.key === 'terror-of-talent'));
  assert.ok(availableV5TalentActions(who(store, 'hero')).some(row => row.id === 'activate:overcome-terror' && row.note === 'Résoudre la Terreur'));
  await store.undo();
  assert.ok(!who(store, 'hero').states.some(state => state.key === 'terror-of-talent'));
});

test('B4 : Calme raté contre la Terreur (3) → Brisé selon le livre (indice + DR négatifs après le premier), puis Peur (3)', async () => {
  const store = await table();
  await store.applyCreaturePsychology('wraith', 'terror', { targetId: 'hero' });
  const terror = who(store, 'hero').states.find(state => state.key === 'terror-of-talent');
  const input = { resolutionId: 'b4-terror-fail', actorId: 'hero', action: { type: 'skill', attr: 'FM', base: 40, extensions: { fiche: { skillId: calm() } } }, roll: 75, v5: { kind: 'test', context: { talentAction: 'overcome-terror', terrorEffectId: terror.id, psychologyKind: 'terror' } } };
  const preview = store.previewResolution(input);
  assert.equal(preview.test.sl, -3);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  const states = who(store, 'hero').states;
  assert.equal(states.find(state => state.key === 'brise').level, 5);
  const fear = states.find(state => state.key === 'fear-of-talent');
  assert.equal(fear.rating, 3);
  assert.equal(fear.name, 'Peur (3)');
  assert.ok(!states.some(state => state.key === 'terror-of-talent'));
});

test('B4 : Immunité Psychologique exemptée, Trait absent refusé, rencontre déjà subie non répétée', async () => {
  const store = await table([person('stoic', 'pj', { traits: ['Immunité Psychologique'] })]);
  await store.applyCreaturePsychology('wraith', 'terror');
  assert.ok(!who(store, 'stoic').states.some(state => state.key === 'terror-of-talent'));
  assert.equal((await store.applyCreaturePsychology('hero', 'terror')).ok, false);
  assert.equal((await store.applyCreaturePsychology('wraith', 'fear')).ok, false);
  const again = await store.applyCreaturePsychology('wraith', 'terror', { targetId: 'hero' });
  assert.equal(again.ok, false);
  assert.equal(who(store, 'hero').states.filter(state => state.key === 'terror-of-talent').length, 1);
});

test('B4 : la carte du Spectre affiche le bloc Terreur (cible, bouton) et lit la saisie', async () => {
  const store = await table();
  const participants = [...store.getCombat().participants.values()];
  assert.deepEqual(psychologyCauses(who(store, 'wraith')).map(cause => cause.key), ['terror']);
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const block = buildPsychologyBlock(make, who(store, 'wraith'), participants);
  const select = block.children.find(child => child.tag === 'select');
  assert.deepEqual(select.children.map(option => option.value), ['', 'hero']);
  const button = block.children.find(child => child.tag === 'button');
  assert.equal(button.className, 'tiny btn-creature-psychology');
  assert.equal(button.dataset.psychology, 'terror');
  assert.equal(buildPsychologyBlock(make, who(store, 'hero'), participants), null);
  assert.deepEqual(readPsychologyInputs({ querySelector: () => ({ value: 'hero' }) }), { targetId: 'hero' });
  assert.deepEqual(readPsychologyInputs({ querySelector: () => ({ value: '' }) }), { targetId: null });
});
});

describe('psychologie — corrections', () => {
// B4c : corrections de la contre-vérification de B0-B2 (rappels permanents hors « À traiter », clé stable des têtes, critique à une tête).
const clone = value => structuredClone(value);
const profiles = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const l07 = profiles('L07'), l09 = profiles('L09');
const human = (id, name) => ({ id, name, kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 70, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });

async function table(extra = []) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const beast = buildParticipantFromBestiary('E0-P-319', { library: l09, zone: 'active' });
  const hydra = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, hasMomentum: true } } };
  const hero = { ...human('hero', 'Héros'), extensions: { v5: { hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'beast'], participants: [hydra, hero, ...extra] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b4c' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const texts = (store, id) => store.getParticipantReminders(id).map(item => item.text).join('\n');

test('B4c : « À traiter » d’une scène active ne porte aucune ligne permanente de Trait', () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: l07, zone: 'active' });
  const hydra = buildParticipantFromBestiary('E0-P-319', { library: l09, zone: 'active' });
  const participants = [stegadon, hydra, human('h1', 'Un'), human('h2', 'Deux')];
  const scene = deriveReminders({ sceneId: 's', participants }, { id: 'round-1', type: 'endTurn', actorId: 'h1', round: 1 }, []);
  assert.deepEqual(scene.filter(item => item.kind === 'participant-reminder' && /Taille|Plusieurs têtes|tête/.test(item.text)), []);
  const card = deriveReminders({ sceneId: 's', participants: [stegadon, hydra] }, { id: 'round-1', type: 'participant', round: 1 }, []);
  assert.ok(card.some(item => /Taille/.test(item.text)), 'la carte garde le rappel de Taille');
  assert.ok(card.some(item => /tête\(s\) valide/.test(item.text)), 'la carte garde le rappel des têtes');
});

test('B4c : pas de rappel de Taille pour une créature de Taille Moyenne ou Petite', () => {
  assert.deepEqual(sizeReminders({ traits: ['Size (Average)'] }), []);
  assert.deepEqual(sizeReminders({ traits: ['Taille (Petite)'] }), []);
  assert.equal(sizeReminders({ traits: ['Size (Large)'] }).length, 1);
});

test('B4c : « Fait » sur la ligne d’état des têtes ne masque que cette ligne, qui revient quand une tête tombe', async () => {
  const store = await table();
  const count = () => store.getParticipantReminders('beast').find(item => /tête\(s\) valide/.test(item.text));
  const perception = () => store.getParticipantReminders('beast').find(item => /Perception : \+2 DR/.test(item.text));
  assert.match(count().text, /5 tête\(s\) valide\(s\) sur 5/);
  await store.resolveParticipantReminder('beast', count().id, 'resolve');
  assert.equal(count(), undefined, 'ligne d’état masquée');
  assert.ok(perception(), 'la ligne de Perception reste affichée');
  await store.setHeadState('beast', 'head-1', 'dead');
  assert.match(count().text, /4 tête\(s\) valide\(s\) sur 5/, 'la ligne revient avec le nouveau nombre');
});

const hit = (n, extra = {}) => ({ resolutionId: `b4c-${n}`, actorId: 'hero', targetId: 'beast', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 20 }, ...extra });
const heads = store => store.getCombat().participants.get('beast').extensions.v5.heads;

test('B4c : un critique à la tête (Sonné) étourdit une seule tête de l’Hydre, sans Sonné pour la créature, annulable', async () => {
  const store = await table();
  const preview = store.previewResolution(hit(1));
  assert.equal(preview.critical?.details?.location?.key, 'HEAD');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.deepEqual(heads(store).map(head => head.state), ['stunned', 'healthy', 'healthy', 'healthy', 'healthy']);
  assert.ok(!store.getCombat().participants.get('beast').states.some(state => state.key === 'sonne'), 'la créature n’est pas Sonnée');
  assert.match(texts(store, 'beast'), /4 tête\(s\) valide\(s\) sur 5/);
  await store.undo();
  const after = store.getCombat().participants.get('beast').extensions?.v5?.heads;
  assert.ok(!after || after.every(head => head.state === 'healthy'));
});

test('B4c : la tête désignée prend le critique, et quand toutes sont neutralisées le Sonné s’applique à la créature', async () => {
  const store = await table();
  for (const head of ['head-1', 'head-2', 'head-3', 'head-4']) await store.setHeadState('beast', head, 'stunned');
  const preview = store.previewResolution(hit(2, { v5: { kind: 'melee', context: { headId: 'head-5' } } }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.ok(heads(store).every(head => head.state === 'stunned'));
  assert.ok(store.getCombat().participants.get('beast').states.some(state => state.key === 'sonne'), 'toutes les têtes neutralisées : Sonné');
});

test('B4c : une créature sans Plusieurs têtes garde le Sonné du critique à la tête', async () => {
  const store = await table();
  const preview = store.previewResolution(hit(3, { actorId: 'beast', targetId: 'hero', action: { type: 'attack', base: 70, attr: 'CC', damage: 5 } }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.ok(store.getCombat().participants.get('hero').states.some(state => state.key === 'sonne'));
});

test('B4c : un Trait Plusieurs têtes sans nombre fait refuser l’attaque gratuite avec un message', async () => {
  const store = await table();
  const beast = store.getCombat().participants.get('beast');
  beast.traits = beast.traits.map(trait => (/Many Heads/i.test(trait) ? 'Many Heads' : trait));
  await assert.rejects(async () => {
    const bite = beast.actions.find(action => action.name === 'Bite');
    await store.applyResolution(store.previewResolution({ resolutionId: 'b4c-x', actorId: 'beast', targetId: 'hero', roll: 5, action: clone(bite), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' } }));
  }, /têtes/);
});
});

describe('sens branchés', () => {
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = { id: 'h', name: 'Humain', kind: 'PJ', camp: 'pj', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 50, F: 40, E: 30, Ag: 40, I: 40 }, talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };

async function table(...ids) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const made = [];
  for (const id of ids) { const participant = buildParticipantFromBestiary(id, { library, zone: 'active' }); await store.addParticipant(participant); made.push(participant); }
  await store.addParticipant({ ...human });
  return { store, made };
}
const skink = () => library.find(profile => profile.nameFr === 'Skink caméléon').id;
const skill = (actorId, targetId, label, v5 = {}, extra = {}) => ({ resolutionId: `b5-${actorId}-${label}`, actorId, targetId, action: { type: 'skill', label, base: 40, attr: 'I', ...extra }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', ...v5 } });
const amount = (preview, id) => preview.test.details.modifiers.find(m => m.id === id)?.amount;

test('B5 : tir contre un Caméléon, −2 DR sans rien saisir', async () => {
  const { store, made: [lizard] } = await table(skink());
  const preview = store.previewResolution({ resolutionId: 'b5-shot', actorId: 'h', targetId: lizard.id, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged' } });
  assert.equal(amount(preview, 'sense:chameleon-ranged'), -2);
});

test('B5 : Perception pour voir un Caméléon, −4 immobile, −2 qui bouge, rien tant que non précisé', async () => {
  const { store, made: [lizard] } = await table(skink());
  const mod = context => amount(store.previewResolution(skill('h', lizard.id, 'Perception', { context })), 'sense:chameleon-sight');
  assert.equal(mod({ targetMoving: false }), -4);
  assert.equal(mod({ targetMoving: true }), -2);
  assert.equal(mod({}), undefined);
});

test('B5 : Perturbant à portée, −2 DR une seule fois même avec deux sources', async () => {
  const [first, second] = library.filter(profile => JSON.stringify(profile.traits || []).includes('Distracting'));
  const { store, made } = await table(first.id, second.id);
  const yes = store.previewResolution(skill('h', made[0].id, 'Athlétisme', { context: { distractingInRange: true } }));
  assert.equal(yes.test.details.modifiers.filter(m => m.id === 'sense:distracting').length, 1);
  assert.equal(amount(yes, 'sense:distracting'), -2);
  const no = store.previewResolution(skill('h', made[0].id, 'Athlétisme', { context: { distractingInRange: false } }));
  assert.equal(amount(no, 'sense:distracting'), undefined);
});

test('B5 : Furtif, Discrétion à Agilité+10 pour le Skink caméléon', async () => {
  const { store, made: [lizard] } = await table(skink());
  const result = store.previewResolution(skill(lizard.id, 'h', 'Discrétion (rurale)', {}, { base: 5, attr: 'Ag' }));
  assert.equal(result.score.target, Number(lizard.caracs.Ag) + 10);
});

test('B5 : les rappels de sens sont sur la carte du Skink', async () => {
  const { store, made: [lizard] } = await table(skink());
  const texts = store.getParticipantReminders(lizard.id).map(item => item.text);
  assert.ok(texts.some(text => /Caméléon/.test(text)));
  assert.ok(texts.some(text => /Furtif/.test(text)));
});

test('B5 : sans contexte précisé, aucun modificateur de sens n’est appliqué', async () => {
  const { store, made: [lizard] } = await table(skink());
  const preview = store.previewResolution(skill('h', lizard.id, 'Perception'));
  assert.ok(!preview.test.details.modifiers.some(m => m.id.startsWith('sense:')));
});
});

describe('déplacement branché', () => {
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = { id: 'h', name: 'Humain', kind: 'PJ', camp: 'pj', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 50, F: 40, E: 30, Ag: 40, I: 40 }, talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };

async function table(...names) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const made = [];
  for (const name of names) { const participant = buildParticipantFromBestiary(library.find(profile => profile.nameFr === name).id, { library, zone: 'active' }); await store.addParticipant(participant); made.push(participant); }
  await store.addParticipant({ ...human });
  return { store, made };
}
const amount = (preview, id) => preview.test.details.modifiers.find(m => m.id === id)?.amount;
const shot = (actorId, targetId, context) => ({ resolutionId: `b6-shot-${actorId}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged', context } });
const skill = (actorId, targetId, label, context, extra = {}) => ({ resolutionId: `b6-${actorId}-${label}`, actorId, targetId, action: { type: 'skill', label, base: 40, attr: 'Ag', ...extra }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', context } });

// BR-12, retour au livre de base (décision du MJ du 25/10, B11c) : le −2 DR vise le tir du Roc en vol, pas les tirs contre lui.
test('B6 : le tir d’un Roc en vol est à −2 DR quand le MJ le précise, rien sinon ni pour un tir contre lui', async () => {
  const { store, made: [roc] } = await table('Roc plume-vive');
  assert.equal(amount(store.previewResolution(shot(roc.id, 'h', { airborne: true })), 'move:fly-ranged'), -2);
  assert.equal(amount(store.previewResolution(shot(roc.id, 'h', {})), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('h', roc.id, { airborne: true, targetAirborne: true })), 'move:fly-ranged'), undefined);
});

test('B6 : Amphibie et Arboricole modifient Natation, Escalade et Discrétion', async () => {
  const { store, made: [skink] } = await table('Skink caméléon');
  assert.equal(amount(store.previewResolution(skill(skink.id, 'h', 'Natation', {})), 'move:amphibious-swim'), 1);
  const bonus = Math.floor(Number(skink.caracs.Ag) / 10);
  const climb = store.previewResolution(skill(skink.id, 'h', 'Escalade', {}));
  assert.equal(amount(climb, 'move:arboreal'), bonus);
  assert.equal(amount(store.previewResolution(skill(skink.id, 'h', 'Athlétisme', {})), 'move:arboreal'), undefined);
});

test('B6 : les rappels de déplacement sont sur la carte du Roc et du Skink', async () => {
  const { store, made: [roc, skink] } = await table('Roc plume-vive', 'Skink caméléon');
  assert.ok(store.getParticipantReminders(roc.id).some(item => / : Vol : /.test(item.text)));
  assert.ok(store.getParticipantReminders(skink.id).some(item => / : Amphibie : /.test(item.text)));
});
});

describe('états branchés', () => {
// B7 : Nuée et Venin (Hard) des Serpents de Sotek (L07, E0-P-245).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const person = (id, camp, extra = {}) => ({ id, name: id, kind: 'PNJ', camp, zone: 'active', initiative: 30, hp: 10, maxHp: 10, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const swarm = { ...buildParticipantFromBestiary('E0-P-245', { library, zone: 'active' }), id: 'swarm', camp: 'ennemi', zone: 'active', states: [] };
  const participants = [swarm, person('hero', 'pj'), person('mage', 'pj'), person('far', 'pj'), person('ally', 'ennemi')];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: participants.map(item => item.id), participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b7' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const who = (store, id) => store.getCombat().participants.get(id);

test('B7 : la carte de la Nuée affiche engagés et Venin, rappels de Traits sur la carte', async () => {
  const store = await table();
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const block = buildCreatureStatesBlock(make, who(store, 'swarm'), [...store.getCombat().participants.values()]);
  assert.equal(block.children.filter(child => child.tag === 'label').length, 3);
  assert.ok(block.children.some(child => child.className === 'tiny btn-swarm-end-round'));
  assert.ok(block.children.some(child => child.className === 'tiny btn-creature-venom'));
  assert.equal(buildCreatureStatesBlock(make, who(store, 'hero'), []), null);
  const boxes = [{ checked: true, value: 'hero' }, { checked: false, value: 'mage' }];
  assert.deepEqual(readCreatureStatesInputs({ querySelectorAll: () => boxes, querySelector: () => ({ value: 'mage' }) }), { engagedIds: ['hero'], venomTargetId: 'mage' });
  const texts = store.getParticipantReminders('swarm').map(item => item.text).join('\n');
  assert.match(texts, /Nuée :/);
  assert.match(texts, /Venin :/);
  assert.ok(!store.getParticipantReminders('hero').some(item => /Nuée|Venin/.test(item.text)));
});

test('B7 : fin de Round de la Nuée, 1 Blessure à chaque engagé coché seulement, annulable', async () => {
  const store = await table();
  const result = await store.applySwarmEndOfRound('swarm', ['hero', 'mage', 'swarm']);
  assert.equal(result.ok, true);
  assert.deepEqual(result.targetIds, ['hero', 'mage']);
  assert.equal(who(store, 'hero').hp, 9);
  assert.equal(who(store, 'mage').hp, 9);
  assert.equal(who(store, 'far').hp, 10);
  await store.undo();
  assert.equal(who(store, 'hero').hp, 10);
  assert.equal((await store.applySwarmEndOfRound('swarm', [])).ok, false);
  assert.equal((await store.applySwarmEndOfRound('hero', ['mage'])).ok, false);
});

test('B7 : Venin (Hard) empoisonne la cible blessée, annulable ; sans Trait refusé', async () => {
  const store = await table();
  const result = await store.applyCreatureVenom('swarm', 'hero');
  assert.equal(result.ok, true);
  const poisoned = who(store, 'hero').states.find(state => state.key === 'empoisonne');
  assert.ok(poisoned);
  assert.equal((await store.applyCreatureVenom('hero', 'mage')).ok, false);
  assert.equal((await store.applyCreatureVenom('swarm', 'swarm')).ok, false);
  await store.undo();
  assert.ok(!who(store, 'hero').states.some(state => state.key === 'empoisonne'));
});
});

describe('magie et capacités branchées', () => {
// B8 : Lanceur de sorts et capacités propres du Slann de la cinquième génération (L07, E0-P-256).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const libraryL23 = JSON.parse(readFileSync('js/data/bestiary/L23.json', 'utf8')).profiles;

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const slann = { ...buildParticipantFromBestiary('E0-P-256', { library, zone: 'active' }), id: 'slann', camp: 'ennemi', states: [] };
  const hero = { id: 'hero', name: 'hero', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 10, maxHp: 10, caracs: { Int: 40, FM: 40 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const horror = { ...buildParticipantFromBestiary('E0-P-789', { library: libraryL23, zone: 'active' }), id: 'horror', camp: 'ennemi', states: [] };
  const participants = [slann, hero, horror];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['slann', 'hero', 'horror'], participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b8' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}

test('B8 : un Lanceur de sorts de bestiaire ouvre Focalisation, Dissipation et Incantation avec les bases du Trait', async () => {
  const store = await table();
  const slann = store.getCombat().participants.get('slann');
  assert.deepEqual(creatureCastingBases(slann), { focusBase: 95, tongueBase: 95 });
  const actions = magicActionsFor(slann);
  assert.deepEqual(actions.map(action => action.type), ['channelling', 'dispel', 'cast']);
  // B11c : la compétence imprimée du Slann (105) prime sur la base du Trait (95) et c'est elle que le Test emploie.
  assert.equal(actions[0].base, 105);
  assert.equal(actions[2].base, 105);
  assert.deepEqual(magicActionsFor(slann, { channel: false, cast: false }).map(action => action.type), ['dispel']);
  assert.deepEqual(magicActionsFor(store.getCombat().participants.get('hero')), []);
  assert.equal(creatureCastingBases(store.getCombat().participants.get('hero')), null);
});

test('B8 : rappels de magie (Slann) et de capacités propres (Horreur rose, L23) sur la carte, pas sur celle du PJ', async () => {
  const store = await table();
  const texts = store.getParticipantReminders('slann').map(item => item.text).join('\n');
  assert.match(texts, /Lanceur de sorts :/);
  assert.match(texts, /Focalisation Volonté\+10/);
  const horror = store.getParticipantReminders('horror').map(item => item.text).join('\n');
  assert.match(horror, /Split \(T3 Déclencheurs de mort\) : Sur Blessure Critique/);
  assert.match(horror, /Rappel — Tzeentch’s Fire : Les Horreurs du même type/);
  assert.ok(store.getParticipantReminders('hero').length === 0);
});
});

describe('magie et capacités — corrections', () => {
// B8c : corrections de la contre-vérification de B3-B6 et réponses du MJ du 24/10 (BR-12 Vol, BR-11 Sens aiguisé, BR-10 tête touchée).
const clone = value => structuredClone(value);
const profiles = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const l07 = profiles('L07'), l09 = profiles('L09');
const human = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 60, CT: 50, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function table(participants, order) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: order[0], order, participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b8c' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const fromProfile = (library, name, id) => ({ ...buildParticipantFromBestiary(library.find(profile => profile.nameFr === name).id, { library, zone: 'active' }), id, camp: 'ennemi', zone: 'active', states: [] });
const amount = (preview, id) => preview.test.details.modifiers.find(m => m.id === id)?.amount;
const shot = (actorId, targetId, context) => ({ resolutionId: `b8c-shot-${actorId}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged', context } });
const skill = (actorId, targetId, label, v5 = {}, extra = {}) => ({ resolutionId: `b8c-${actorId}-${label}`, actorId, targetId, action: { type: 'skill', label, base: 40, attr: 'Ag', ...extra }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', ...v5 } });
const hydra = () => ({ ...buildParticipantFromBestiary('E0-P-319', { library: l09, zone: 'active' }), id: 'beast', camp: 'ennemi', zone: 'active', states: [] });
const distractingProfile = () => l07.find(profile => JSON.stringify(profile.traits || []).includes('Distracting'));

// Annulé en B11c (décision du MJ du 25/10, retour au livre de base p.358) : le −2 DR vise de nouveau le tir du porteur de Vol en vol.
test('B8c : le −2 DR du Vol vise le tir du volant en vol (retour au livre de base en B11c), pas le tir contre lui', async () => {
  const roc = fromProfile(l07, 'Roc plume-vive', 'roc');
  const store = await table([roc, human('h')], ['h', 'roc']);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', { airborne: true })), 'move:fly-ranged'), -2);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', {})), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', { airborne: false })), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('h', 'roc', { targetAirborne: true })), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('h', 'roc', { airborne: true })), 'move:fly-ranged'), undefined);
});

test('B8c : Furtif ne vaut que pour Discrétion (Rurale)', async () => {
  const skink = fromProfile(l07, 'Skink caméléon', 'skink');
  const store = await table([skink, human('h')], ['h', 'skink']);
  const target = label => store.previewResolution(skill('skink', 'h', label, {}, { base: 5, attr: 'Ag' })).score.target;
  assert.equal(target('Discrétion (Rurale)'), Number(skink.caracs.Ag) + 10);
  assert.notEqual(target('Discrétion (Urbaine)'), Number(skink.caracs.Ag) + 10);
  assert.notEqual(target('Discrétion (Souterrains)'), Number(skink.caracs.Ag) + 10);
});

test('B8c : un refus { ok:false, message } montre sa raison, sans formule de repli', () => {
  const error = refusalError({ ok: false, reason: 'refused', message: 'Régénération : d10 de début de Round à saisir (1 à 10).' }, 'Régénération');
  assert.equal(userMessage(error), 'Régénération : d10 de début de Round à saisir (1 à 10).');
  assert.equal(refusalError(false, 'État').message, 'État impossible.');
  assert.match(readFileSync('js/ui/card.js', 'utf8'), /throw refusalError\(value, label\)/);
});

test('B8c : un 10 régénère le critique et ses États, annulable ; un critique de feu coché reste', async () => {
  const beast = hydra();
  const base = { ...beast, hp: 60, maxHp: 100, states: [{ id: 'st-sonne', key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'critical' } }, { id: 'st-fire', key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'critical' } }],
    extensions: { v5: { ...beast.extensions.v5, criticalWounds: [{ id: 'crit-1', name: 'Tête', stateIds: ['st-sonne'] }, { id: 'crit-fire', name: 'Brûlure', stateIds: ['st-fire'] }] } } };
  const store = await table([base, human('h')], ['h', 'beast']);
  const of = () => store.getCombat().participants.get('beast');
  const fire = await store.applyRegeneration('beast', 10, { fireCriticalIds: ['crit-1'] });
  assert.equal(fire.criticalHeal.id, 'crit-fire');
  assert.deepEqual(of().states.map(state => state.id), ['st-sonne']);
  await store.undo();
  assert.equal(of().states.length, 2);
  const result = await store.applyRegeneration('beast', 10);
  assert.equal(result.criticalHeal.id, 'crit-1');
  assert.deepEqual(of().extensions.v5.criticalWounds.map(row => row.id), ['crit-fire']);
  assert.deepEqual(of().states.map(state => state.id), ['st-fire']);
  await store.undo();
  assert.equal(of().states.length, 2);
  assert.equal(of().extensions.v5.criticalWounds.length, 2);
});

test('B8c : le bloc de Régénération propose de cocher les critiques de feu et les lit', () => {
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const beast = hydra();
  const withCrit = { ...beast, extensions: { v5: { ...beast.extensions.v5, criticalWounds: [{ id: 'crit-1', name: 'Tête' }] } } };
  const block = buildRegenerationBlock(make, withCrit);
  const boxes = block.children.filter(child => child.tag === 'label').map(label => label.children[0]);
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0].value, 'crit-1');
  const read = readRegenerationInputs({ querySelector: selector => (selector === '.regen-roll' ? { value: '10' } : { value: '' }), querySelectorAll: () => [{ checked: true, value: 'crit-1' }, { checked: false, value: 'crit-2' }] });
  assert.deepEqual(read.fireCriticalIds, ['crit-1']);
});

test('B8c : Perturbant frappe aussi la défense d’un vivant, jamais un mort-vivant ni un Éthéré', () => {
  const source = { ...buildParticipantFromBestiary(distractingProfile().id, { library: l07, zone: 'active' }), id: 'source' };
  const rule = (actor, defending) => senseTestRules({ actor, opponent: source, participants: [source, actor], kind: 'melee', defending, context: { distractingInRange: true } }).modifiers.find(m => m.id === 'sense:distracting')?.amount;
  assert.equal(rule(human('h'), true), -2);
  assert.equal(rule(human('h'), false), -2);
  assert.equal(rule(human('skeleton', { traits: [{ name: 'Undead' }] }), true), undefined);
  assert.equal(rule(human('ghost', { traits: [{ name: 'Ethereal' }] }), false), undefined);
});

test('B8c : défense du Store près d’un Perturbant, −2 DR pour un PJ, rien pour un Squelette', async () => {
  const source = { ...buildParticipantFromBestiary(distractingProfile().id, { library: l07, zone: 'active' }), id: 'source', camp: 'ennemi' };
  const store = await table([source, human('h'), human('skeleton', { traits: [{ name: 'Undead' }] }), human('foe', { camp: 'ennemi' })], ['foe', 'h']);
  const attack = (targetId, context) => ({ resolutionId: `b8c-def-${targetId}`, actorId: 'foe', targetId, action: { type: 'attack', base: 50, attr: 'CC', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee', context } }, v5: { kind: 'melee' } });
  const seen = preview => JSON.stringify(preview).includes('sense:distracting');
  assert.ok(seen(store.previewResolution(attack('h', { distractingInRange: true }))));
  assert.ok(!seen(store.previewResolution(attack('h', { distractingInRange: false }))));
  assert.ok(!seen(store.previewResolution(attack('skeleton', { distractingInRange: true }))));
});

test('B8c : une tête désignée inconnue retombe sur la première tête valide', () => {
  const beast = hydra();
  const detail = { location: { key: 'HEAD' }, parsed: { states: [{ key: 'sonne' }] } };
  const result = applyHeadCriticals(beast, [detail], 'head-inconnue');
  assert.ok(result);
  assert.equal(result.touched[0].headId, 'head-1');
  assert.equal(result.stunnedCount, 1);
});

test('B8c : le Sonné d’un second critique hors tête reste sur l’Hydre', async () => {
  const beast = hydra();
  const store = await table([{ ...beast, hp: 100, maxHp: 100 }, human('h')], ['h', 'beast']);
  const preview = store.previewResolution({ resolutionId: 'b8c-crit', actorId: 'h', targetId: 'beast', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 20 } });
  assert.equal(preview.critical?.details?.location?.key, 'HEAD');
  preview.targetConditionApplication.push({ key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'critical' } });
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const states = store.getCombat().participants.get('beast').states;
  assert.equal(states.filter(state => state.key === 'sonne').length, 1);
});
});

describe('Slann branché', () => {
// B9 : capacités des Slann (L07) branchées sur les profils E0-P-257 (4ᵉ génération : Maître des incidents) et E0-P-258 (2ᵉ : Puissance totale).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const spell = { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' };
const dice = { duration: 3, strength: 3, distance: 3, damage: 3, location: 3 };

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const make = (profile, id) => ({ ...buildParticipantFromBestiary(profile, { library, zone: 'active' }), id, camp: 'ennemi', states: [] });
  const hero = { id: 'hero', name: 'hero', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 10, maxHp: 10, caracs: { Int: 40, FM: 40 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const participants = [make('E0-P-257', 'master'), make('E0-P-258', 'power'), hero];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['master', 'power', 'hero'], participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b9' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const get = (store, id) => store.getCombat().participants.get(id);
const texts = (store, id) => store.getParticipantReminders(id).map(item => item.text).join('\n');

test('B9 : rappels de capacités slann sur la carte du Slann, pas sur celle du PJ ; Téléportation de secours', async () => {
  const store = await table();
  assert.match(texts(store, 'master'), /Palanquin \(palanquinTraits\)/);
  assert.match(texts(store, 'master'), /Maître des incidents \(mishapSeverity\)/);
  assert.doesNotMatch(texts(store, 'master'), /Au sol/);
  assert.doesNotMatch(texts(store, 'master'), /Action gratuite : lancer Téléportation/);
  assert.equal(store.getParticipantReminders('hero').length, 0);
  await store.updateParticipant('master', { hp: 8 });
  assert.match(texts(store, 'master'), /Action gratuite : lancer Téléportation/);
});

test('B9 : Slann au sol, −3 aux lancements et à la Focalisation, annulable', async () => {
  const store = await table();
  const modifiers = id => previewCasting(get(store, id), spell, { roll: 50 }).test.details.modifiers.filter(item => item.id === 'slann-ground');
  assert.equal(modifiers('master').length, 0);
  assert.equal((await store.setSlannAboard('master', false)).ok, true);
  assert.deepEqual(modifiers('master').map(item => item.amount), [-3]);
  assert.match(texts(store, 'master'), /Au sol : -3/);
  const channelling = previewChannelling(get(store, 'master'), { type: 'winds', roll: 50 });
  assert.ok(JSON.stringify(channelling).includes('slann-ground'));
  await store.undo();
  assert.equal(modifiers('master').length, 0);
  assert.equal((await store.setSlannAboard('hero', false)).ok, false);
});

test('B9 : Maître des incidents, un incident Majeur devient Mineur sauf à travers un autre mage', async () => {
  const store = await table();
  const master = get(store, 'master');
  const lowered = resolveMiscast({ participant: master, severity: 'MAJOR', roll: 50, secondaryRolls: dice });
  assert.equal(lowered.table, 'MINOR');
  assert.equal(lowered.slannLowered, true);
  const via = resolveMiscast({ participant: master, severity: 'MAJOR', roll: 50, viaTelepathy: true, secondaryRolls: dice });
  assert.equal(via.table, 'MAJOR');
  const plain = resolveMiscast({ participant: get(store, 'hero'), severity: 'MAJOR', roll: 50, secondaryRolls: dice });
  assert.equal(plain.table, 'MAJOR');
});

test('B9 : Puissance totale, une unité 0 réussie est critique pour le Slann concerné seulement', async () => {
  const store = await table();
  const power = previewCasting(get(store, 'power'), spell, { roll: 30 });
  assert.equal(power.testSuccess, true);
  assert.equal(power.critical, true);
  assert.ok(power.testSl >= 5);
  assert.equal(previewCasting(get(store, 'master'), spell, { roll: 30 }).critical, false);
  assert.equal(previewCasting(get(store, 'power'), spell, { roll: 98 }).critical, false);
});

test('B9 : Contemplation, la table donne Brume de pensée (deux Exténué), annulable ; le bloc de carte est rendu', async () => {
  const store = await table();
  const refused = await store.applySlannContemplation('master', null);
  assert.equal(refused.ok, false);
  const done = await store.applySlannContemplation('master', -2);
  assert.equal(done.ok, true);
  assert.equal(done.outcome, 'fog');
  const fatigue = () => get(store, 'master').states.filter(state => /extenu/i.test(state.key || state.name)).reduce((sum, state) => sum + (state.level || 1), 0);
  assert.equal(fatigue(), 2);
  await store.undo();
  assert.equal(fatigue(), 0);
  assert.equal((await store.applySlannContemplation('hero', 3)).ok, false);
  const made = [];
  const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); }, querySelector() { return { value: '-2' }; } }; made.push(el); return el; };
  const block = buildSlannBlock(createElement, get(store, 'master'));
  assert.ok(made.some(el => el.className === 'tiny btn-slann-aboard'));
  assert.ok(made.some(el => el.className === 'tiny btn-slann-contemplation'));
  assert.equal(buildSlannBlock(createElement, get(store, 'hero')), null);
  assert.deepEqual(readSlannInputs(block), { sl: -2 });
});
});

describe('familiers (F2)', () => {
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 2, zone: 'active', init: 40, caracs: { E: 30, FM: 40 }, skills: [{ name: 'Focalisation', total: 50 }], talents: [], states: [], equipment: [], ...extra });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
async function combat(...people) {
  const store = createStore({ storage: storage() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const get = (store, id) => store.listParticipants().find(p => p.id === id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy' };

test('F2 : homoncule de Puissance lié, +2 DR à Focalisation, sans lien 0, aucun cumul avec une autre assistance', async () => {
  const store = await combat(person('mage'), person('famil', { talents: [talent('magical-assistant'), talent('animal-assistant')] }));
  assert.equal((await store.linkFamiliar('mage', 'famil', homunculus)).ok, true);
  const people = store.listParticipants();
  const support = familiarSupport(get(store, 'mage'), people, 'Focalisation');
  assert.deepEqual(support.modifiers.map(m => m.amount), [2]);
  assert.equal(support.advantages.length, 0);
  assert.deepEqual(familiarSupport(person('seul'), people, 'Focalisation'), { modifiers: [], advantages: [] });
});

test('F2 : lien d’animal, talents de compagnon seulement à portée, +1 DR si déjà connu, cumul de plusieurs animaux', async () => {
  const store = await combat(person('mage'), person('blaireau'), person('renard'), person('hibou'));
  const badger = (await store.linkFamiliar('mage', 'blaireau', { system: 'animal', kind: 'power', species: 'badger' })).link;
  assert.equal(badger.inRange, false);
  assert.deepEqual(companionTalents(get(store, 'mage'), store.listParticipants()).granted, []);
  await store.setFamiliarRange('mage', badger.id, true);
  let result = companionTalents(get(store, 'mage'), store.listParticipants());
  assert.deepEqual(result.granted.map(t => t.name), ['Robuste', 'Tenace']);
  assert.equal(withCompanionTalents(get(store, 'mage'), store.listParticipants()).talents.some(t => t.id === 'talent-robust'), true);
  assert.equal(get(store, 'mage').talents.length, 0);
  const known = { ...get(store, 'mage'), talents: [talent('robust')] };
  result = companionTalents(known, store.listParticipants());
  assert.deepEqual(result.bonuses.map(b => [b.name, b.amount]), [['Robuste', 1]]);
  assert.deepEqual(result.granted.map(t => t.name), ['Tenace']);
  for (const [id, species] of [['renard', 'fox'], ['hibou', 'owl']]) {
    const link = (await store.linkFamiliar('mage', id, { system: 'animal', kind: 'power', species, inRange: true })).link;
    assert.equal(link.inRange, true);
  }
  const all = companionTalents(get(store, 'mage'), store.listParticipants());
  assert.equal(all.granted.length, 6);
  assert.ok(all.granted.some(t => t.name === 'Baratiner') && all.granted.some(t => t.name === 'Visions divines') && all.granted.some(t => t.name === 'Intrigant'));
  assert.ok(all.reminders.some(text => /Visions divines/.test(text)));
});

test('F2 : l’assistance d’un animal ne joue qu’à portée', async () => {
  const store = await combat(person('mage'), person('chat', { talents: [talent('animal-assistant')] }));
  const link = (await store.linkFamiliar('mage', 'chat', { system: 'animal', kind: 'power', species: 'cat' })).link;
  assert.equal(familiarSupport(get(store, 'mage'), store.listParticipants(), 'Focalisation').advantages.length, 0);
  await store.setFamiliarRange('mage', link.id, true);
  assert.equal(familiarSupport(get(store, 'mage'), store.listParticipants(), 'Focalisation').advantages.length, 1);
});

test('F2 : refus (autre maître, soi-même, Combat pour un animal, Vent, espèce, doublon) sans révision ni historique', async () => {
  const store = await combat(person('mage'), person('autre'), person('bete'));
  await store.linkFamiliar('autre', 'bete', { system: 'animal', kind: 'power', species: 'cat' });
  const rev = () => JSON.parse(store.getFullJSON()).localRevision;
  const before = rev();
  const refusals = [
    [['mage', 'bete', { system: 'animal', kind: 'power', species: 'fox' }], 'already-linked'],
    [['mage', 'mage', homunculus], 'self-link'],
    [['mage', 'autre', { system: 'animal', kind: 'combat', species: 'fox' }], 'animal-kind'],
    [['mage', 'autre', { system: 'homunculus', kind: 'combat', wind: 'noir' }], 'unknown-wind'],
    [['mage', 'autre', { system: 'homunculus', kind: 'tank', wind: 'ghur' }], 'unknown-kind'],
    [['mage', 'autre', { system: 'animal', kind: 'power', species: 'dragon' }], 'unknown-species'],
    [['mage', 'inconnu', homunculus], 'unknown-participant']
  ];
  for (const [args, reason] of refusals) {
    const result = store.linkFamiliar(...args);
    assert.equal(result.ok, false, reason);
    assert.equal(result.reason, reason);
  }
  assert.equal(rev(), before);
  assert.equal(validateFamiliarLink(person('a'), person('b'), { system: 'nope' }).reason, 'unknown-system');
});

test('F2 : création et retrait annulables des deux côtés, identité par id, aucune ligne résiduelle', async () => {
  const store = await combat(person('mage'), person('famil'));
  const { link } = await store.linkFamiliar('mage', 'famil', homunculus);
  assert.equal(get(store, 'mage').extensions.v5.familiarLinks.length, 1);
  assert.deepEqual(get(store, 'famil').extensions.v5.familiarOf, { masterId: 'mage', linkId: link.id, system: 'homunculus', kind: 'power', wind: 'aqshy', species: null });
  assert.equal(linkedFamiliars(get(store, 'mage'), store.listParticipants())[0].familiar.id, 'famil');
  assert.equal(store.undo(), true);
  assert.equal(get(store, 'mage').extensions?.v5?.familiarLinks, undefined);
  assert.equal(get(store, 'famil').extensions?.v5?.familiarOf, undefined);
  assert.equal(store.redo(), true);
  assert.equal((await store.unlinkFamiliar('mage', link.id)).ok, true);
  assert.deepEqual(get(store, 'mage').extensions.v5.familiarLinks, []);
  assert.equal(get(store, 'famil').extensions.v5.familiarOf, undefined);
  assert.equal(store.unlinkFamiliar('mage', 'x').ok, false);
  assert.equal(store.undo(), true);
  assert.equal(get(store, 'famil').extensions.v5.familiarOf.linkId, link.id);
});

test('F2 : États et soins non magiques refusés à un homoncule, avec reçu ; magiques acceptés', () => {
  const famil = person('famil', { extensions: { v5: { familiarOf: { masterId: 'm', linkId: 'l', system: 'homunculus', wind: 'ghur' } } } });
  const refused = previewFamiliarCondition(famil, 'Hémorragique', { magical: false });
  assert.equal(refused.ok, false);
  assert.match(refused.receipt.message, /source magique/);
  assert.equal(previewFamiliarCondition(famil, 'Hémorragique', { magical: true }).ok, true);
  assert.equal(previewFamiliarCondition(famil, 'À Terre', {}).ok, true);
  assert.equal(previewFamiliarHealing(famil, { kind: 'skill', name: 'Soin' }).ok, false);
  assert.equal(previewFamiliarHealing(famil, { kind: 'spell' }).ok, true);
  assert.equal(previewFamiliarCondition(person('libre'), 'Hémorragique', {}).ok, true);
});

test('F2 : homoncule d’Aqshy sans dégâts d’Embrasé ; autres Vents inchangés', () => {
  const burning = wind => person('f', { caracs: { E: 30 }, armor: {}, states: [{ name: 'Enflammé', level: 1 }], extensions: { v5: { familiarOf: { masterId: 'm', linkId: 'l', system: 'homunculus', wind } } } });
  const endRound = { phase: 'endOfRound', round: 1, actorId: 'other', turn: 8 };
  assert.equal(familiarIgnoresAblaze(burning('aqshy')), true);
  const aqshy = advanceV5Effects(burning('aqshy'), endRound, { fireRoll: 9 });
  assert.equal(aqshy.participant.hp, 20);
  assert.ok(aqshy.reminders.some(text => /Aqshy/.test(text)));
  const ghur = advanceV5Effects(burning('ghur'), endRound, { fireRoll: 9, fireArmour: 0 });
  assert.equal(ghur.participant.hp, 14);
});

test('F2 : mort d’un animal lié, reçu avec Calme −2 DR (0 pour un elfe), rien appliqué', async () => {
  const store = await combat(person('mage'), person('elfe', { keywords: ['elfe'] }), person('chat'), person('corbeau'));
  await store.linkFamiliar('mage', 'chat', { system: 'animal', kind: 'power', species: 'cat' });
  await store.linkFamiliar('elfe', 'corbeau', { system: 'animal', kind: 'power', species: 'raven' });
  const plan = planFamiliarDeath(get(store, 'mage'), get(store, 'chat'));
  assert.equal(plan.calmTest.modifier, -2);
  assert.equal(plan.applied, false);
  assert.equal(plan.onFailure.ignoresToughnessBonus && plan.onFailure.ignoresArmour, true);
  assert.equal(planFamiliarDeath(get(store, 'elfe'), get(store, 'corbeau')).calmTest.modifier, 0);
  assert.equal(get(store, 'chat').hp, 20);
  assert.equal(familiarDeathDamage([3]).ok, false);
  assert.equal(familiarDeathDamage([3, 7]).damage, 10);
  assert.equal(planFamiliarDeath(get(store, 'mage'), get(store, 'corbeau')).applicable, false);
});

test('F2 : persistance des liens des deux côtés à l’export ; aucun lien créé pour un participant sans lien', async () => {
  const store = await combat(person('mage'), person('famil'), person('seul'));
  await store.linkFamiliar('mage', 'famil', homunculus);
  const copy = createStore({ storage: storage() }); await copy.ready;
  await copy.loadFromJSON(store.getFullJSON());
  assert.equal(get(copy, 'mage').extensions.v5.familiarLinks[0].familiarId, 'famil');
  assert.equal(get(copy, 'famil').extensions.v5.familiarOf.masterId, 'mage');
  assert.equal(get(copy, 'seul').extensions?.v5?.familiarLinks, undefined);
  assert.equal(get(copy, 'seul').extensions?.v5?.familiarOf, undefined);
});

test('F2 : partage sensoriel (plus faible Volonté en miles), rappels, table des compagnons', () => {
  assert.deepEqual(senseSharingRange(person('a', { caracs: { FM: 45 } }), person('b', { caracs: { FM: 30 } })), { ok: true, miles: 30 });
  assert.equal(senseSharingRange(person('a'), person('b', { caracs: {} })).ok, false);
  const spell = person('s', { extensions: { v5: { familiarOf: { system: 'homunculus', kind: 'spell' } } } });
  assert.ok(familiarReminders(spell).some(text => /4 sorts/.test(text)));
  assert.deepEqual(familiarReminders(person('x')), []);
  assert.equal(Object.keys(COMPANION_TRAITS).length, 7);
});

test('F2 : les cases manuelles du jet restent valides pour un familier non lié', () => {
  const support = familiarSkillSupport(person('mage'), person('f', { talents: [talent('magical-assistant')] }), 'Focalisation', { magicAssistantLinked: true });
  assert.deepEqual(support.modifiers.map(m => m.amount), [2]);
});
});

describe('familiers — nettoyage', () => {
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 2, zone: 'active', init: 40, caracs: { E: 30, FM: 40 }, skills: [], talents: [], states: [], equipment: [], ...extra });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const state = people => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
const get = (store, id) => store.listParticipants().find(p => p.id === id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy' };

async function plain(...people) {
  const store = createStore({ storage: storage() }); await store.ready;
  await store.loadFromJSON(state(people));
  return store;
}
async function persisted(...people) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && JSON.parse(JSON.stringify(saved)); }, async saveAtomic({ state: s }) { saved = JSON.parse(JSON.stringify(s)); return { ok: true }; } }, storage: null });
  await store.ready;
  await store.loadFromJSON(state(people));
  return store;
}

for (const [label, make] of [['sans persistance', plain], ['avec persistance', persisted]]) {
  test(`Q19 : retirer un familier nettoie familiarLinks du maître (${label})`, async () => {
    const store = await make(person('a'), person('b'), person('c'));
    await store.linkFamiliar('a', 'b', homunculus);
    await store.removeParticipant('b');
    assert.equal((get(store, 'a').extensions?.v5?.familiarLinks || []).length, 0);
    assert.equal((await store.linkFamiliar('c', 'a', homunculus)).ok, true);
  });

  test(`Q19 : Annuler après retrait du maître restaure le lien (${label})`, async () => {
    const store = await make(person('a'), person('b'));
    const { link } = await store.linkFamiliar('a', 'b', homunculus);
    await store.removeParticipant('a');
    assert.equal(get(store, 'b').extensions?.v5?.familiarOf, undefined);
    assert.equal(await store.undo(), true);
    assert.equal(get(store, 'b').extensions.v5.familiarOf.linkId, link.id);
    assert.equal(get(store, 'a').extensions.v5.familiarLinks.length, 1);
  });

  test(`Q19 : Annuler après retrait du familier restaure le lien du maître (${label})`, async () => {
    const store = await make(person('a'), person('b'));
    await store.linkFamiliar('a', 'b', homunculus);
    await store.removeParticipant('b');
    assert.equal(await store.undo(), true);
    assert.equal(get(store, 'a').extensions.v5.familiarLinks.length, 1);
    assert.ok(get(store, 'b').extensions.v5.familiarOf);
  });
}
});

describe('liens des familiers', () => {
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 2, zone: 'active', init: 40, caracs: { E: 30, FM: 40 }, skills: [], talents: [], states: [], equipment: [], ...extra });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
async function combat(...people) {
  const store = createStore({ storage: storage() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const get = (store, id) => store.listParticipants().find(p => p.id === id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy' };

test('Q9 : un maître ne peut pas devenir le familier d’un autre', async () => {
  const store = await combat(person('a'), person('b'), person('c'));
  assert.equal((await store.linkFamiliar('b', 'c', homunculus)).ok, true);
  const refused = await store.linkFamiliar('a', 'b', homunculus);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'familiar-is-master');
  assert.equal(get(store, 'b').extensions.v5.familiarOf, undefined);
});

test('Q9 : un familier ne peut pas avoir de familier', async () => {
  const store = await combat(person('a'), person('b'), person('c'));
  await store.linkFamiliar('a', 'b', homunculus);
  const refused = await store.linkFamiliar('b', 'c', homunculus);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'master-is-familiar');
});

test('Q9 : retirer le maître sans persistance libère aussi son familier', async () => {
  const store = await combat(person('a'), person('b'));
  await store.linkFamiliar('a', 'b', homunculus);
  store.removeParticipant('a');
  assert.equal(get(store, 'b').extensions?.v5?.familiarOf, undefined);
});

test('Q9 : retirer le maître du combat libère son familier, Annuler le remet', async () => {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && JSON.parse(JSON.stringify(saved)); }, async saveAtomic({ state }) { saved = JSON.parse(JSON.stringify(state)); return { ok: true }; } }, storage: null });
  await store.ready;
  const people = [person('a'), person('b')];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  const { link } = await store.linkFamiliar('a', 'b', homunculus);
  await store.removeParticipant('a');
  assert.equal(get(store, 'a'), undefined);
  assert.equal(get(store, 'b').extensions?.v5?.familiarOf, undefined);
  assert.equal(await store.undo(), true);
  assert.equal(get(store, 'b').extensions.v5.familiarOf.linkId, link.id);
  assert.equal(get(store, 'a').extensions.v5.familiarLinks.length, 1);
});
});

describe('Slann', () => {
const library = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L07.json', import.meta.url), 'utf8')).profiles;
const slann = (id, hp) => ({ ...buildParticipantFromBestiary(id, { library }), ...(hp === undefined ? {} : { hp }) });
const second = () => slann('E0-P-258');
const fifth = () => slann('E0-P-256');
const inventory = JSON.parse(readFileSync(new URL('../../../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8')).traits;

test('S1 les neuf capacités 211 à 219 ont une disposition, assistée ou rappel motivé', () => {
  assert.deepEqual(SLANN_ABILITIES.map(entry => entry.id), inventory.filter(trait => { const n = Number(trait.id.slice(5)); return n >= 211 && n <= 219; }).map(trait => trait.id));
  for (const entry of SLANN_ABILITIES) {
    if (entry.status === 'reminder') assert.ok(entry.motive.length > 20, entry.id);
    else assert.ok(entry.by, entry.id);
  }
});

test('S1 réservé aux Slann : un autre mage et un participant sans capacité sont refusés', () => {
  const other = { extensions: { v5: { bestiary: { abilityRefs: ['E0-T-001'] } } } };
  assert.equal(isSlann(second()), true);
  assert.equal(isSlann(other), false);
  assert.deepEqual(slannAbilities(other), []);
  for (const result of [palanquinTraits(other), groundCastModifier(other), planEmergencyTeleportation(other, { wounds: 3 }), contemplationOutcome(other, 3), totalPowerCritical(other, 11)]) {
    assert.equal(result.available, false);
    assert.match(result.receipt.blocked[0], /réservé aux profils de Slann/);
  }
});

test('S1 Palanquin : Vol 16, Protection 8+, couvert dur par derrière et sur les côtés, souple de face', () => {
  const on = palanquinTraits(second(), { shotFrom: 'front' });
  assert.deepEqual(on.traits, [{ name: 'Fly', value: 16 }, { name: 'Ward', value: 8 }]);
  assert.equal(on.cover, 'soft');
  assert.equal(palanquinTraits(second(), { shotFrom: 'back' }).cover, 'hard');
  assert.equal(palanquinTraits(second(), { shotFrom: 'side' }).cover, 'hard');
  assert.equal(palanquinTraits(second(), { shotFrom: 'dessus' }).unresolved.length, 1);
  assert.equal(palanquinTraits(second(), { aboard: false }).available, false);
});

test('S1 Slann au sol : −3 hors palanquin, rien à bord', () => {
  assert.equal(groundCastModifier(second(), { aboard: false }).modifier, -3);
  assert.equal(groundCastModifier(second()).modifier, 0);
  assert.deepEqual(groundCastModifier(second(), { aboard: false }).applies, ['Casting', 'Channelling']);
});

test('S1 Maître des incidents : majeur devient mineur, sauf à travers un autre mage ; absent chez la 5e génération', () => {
  assert.equal(mishapSeverity(second(), 'major').severity, 'minor');
  assert.equal(mishapSeverity(second(), 'major', { viaTelepathy: true }).severity, 'major');
  assert.equal(mishapSeverity(second(), 'minor').severity, 'minor');
  const none = mishapSeverity(fifth(), 'major');
  assert.equal(none.available, false);
  assert.equal(none.severity, 'major');
});

test('S1 Puissance totale : critique sur un double ou une unité 0 si le lancement réussit', () => {
  assert.equal(totalPowerCritical(second(), 44).critical, true);
  assert.equal(totalPowerCritical(second(), 30).critical, true);
  assert.equal(totalPowerCritical(second(), 100).critical, true);
  assert.equal(totalPowerCritical(second(), 37).critical, false);
  assert.equal(totalPowerCritical(second(), 44, { succeeded: false }).critical, false);
  assert.equal(totalPowerCritical(second(), 'x').available, false);
  assert.equal(totalPowerCritical(fifth(), 44).available, false);
});

test('S1 Téléportation de secours : 10 Blessures ou moins, ou Critique grave', () => {
  assert.equal(planEmergencyTeleportation(second(), { wounds: 10 }).triggered, true);
  assert.equal(planEmergencyTeleportation(second(), { wounds: 11 }).triggered, false);
  assert.equal(planEmergencyTeleportation(second(), { wounds: 25, graveCritical: true }).triggered, true);
  assert.equal(planEmergencyTeleportation(slann('E0-P-258', 8)).triggered, true);
  assert.equal(planEmergencyTeleportation(second()).unresolved.length, 0);
  assert.equal(planEmergencyTeleportation({ ...second(), hp: null }).unresolved.length, 1);
});

test('S1 Contemplation : table de DR, états posés en reçu seulement', () => {
  const at = sl => contemplationOutcome(second(), sl);
  assert.equal(at(2).outcome, 'alive');
  assert.equal(at(1).outcome, 'detached');
  // B11c : le zéro se lit selon le Test (L07 p.125 : « 0 à +1 » Détaché, « −0 à −3 » Brume de pensée) ; un 0 sans précision est refusé.
  assert.equal(contemplationOutcome(second(), 0, { success: true }).outcome, 'detached');
  assert.deepEqual(contemplationOutcome(second(), 0, { success: true }).conditions, [{ name: 'Stupid', scope: 'rencontre' }]);
  assert.equal(at(0).available, false);
  assert.equal(at(-1).outcome, 'fog');
  assert.deepEqual(at(-3).conditions, [{ name: 'Fatigued', count: 2 }]);
  assert.equal(at(-4).outcome, 'lost');
  assert.equal(at(-4).effects.length, 0);
  assert.equal(at(null).available, false);
  assert.equal(at(1.5).available, false);
});

test('S1 rappels de fiche : 8e profil complet, Prêtre relique et Télépathie en rappel', () => {
  const first = slannReminders(slann('E0-P-259'));
  assert.equal(first.length, 8);
  assert.ok(first.some(line => /^Rappel — Prêtre relique/.test(line)));
  assert.ok(first.some(line => /^Palanquin \(palanquinTraits\)/.test(line)));
  assert.equal(slannReminders(fifth()).length, 5);
  assert.deepEqual(slannReminders({}), []);
});
});
