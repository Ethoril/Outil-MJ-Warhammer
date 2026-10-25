import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { engagedCandidates, outnumberTestRules, planOutnumbering, withoutOutnumberContext } from '../js/core/outnumbering.js';

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
