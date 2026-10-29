import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createAftermathState } from '../js/core/v5-aftermath.js';
import { sequelaEffectRows, effectiveSequelaMovement, sequelaCharacteristicTotals } from '../js/core/v5-sequela-effects.js';

// F2-J2 : les malus permanents et temporaires des séquelles (V5 p.177-179) se lisent dans la résolution, une seule source (le registre).
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const person = (id, extra = {}) => ({ id, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 30, I: 40, Ag: 40, Dex: 35, Int: 40, FM: 35, Soc: 30, M: 4 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: {} }, ...extra });
const sequela = (id, participantId, extra) => ({ id, participantId, incidentId: 'inc', key: id, label: id, status: 'permanent', startDay: 0, history: [], ...extra });
const loss = (id, part, side, extra = {}) => sequela(id, 'hero', { kind: 'loss', part, side, count: 1, relearned: 0, ...extra });
async function table(sequelae, { day = 0, heroExtra = {}, incidents = [] } = {}) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  const register = { ...createAftermathState(), sequelae, incidents };
  register.calendar.currentDay = day;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { aftermathRegister: register } }, combat: { round: 0, currentActorId: null, order: [], participants: [person('hero', heroExtra), person('foe')] } });
  return store;
}
const sword = { id: 'sword', kind: 'weapon', name: 'Épée', category: 'Base', damage: 'BF+4', qualities: [] };
const greatsword = { id: 'great', kind: 'weapon', name: 'Épée à deux mains', category: 'Deux mains', hands: 2, damage: 'BF+5', qualities: [] };
const attack = (weapon, context = {}) => ({ resolutionId: `r-${weapon?.id || 'none'}-${Math.random()}`, actorId: 'hero', targetId: 'foe', action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], label: 'Attaque', extensions: weapon ? { fiche: { equipmentId: weapon.id } } : {} }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee', context } });
const skillTest = (label, attr, context = {}, base = 50) => ({ resolutionId: `t-${label}-${Math.random()}`, actorId: 'hero', action: { type: 'skill', attr, base, label, note: label }, roll: 24, v5: { kind: 'test', context: { isAction: false, involvesMovement: false, runningOrHiding: false, ...context } } });
const mods = preview => (preview.test?.details?.modifiers || []).filter(row => row.id.startsWith('sequela:'));

test('J2 effets : une main perdue interdit l’arme à deux mains et donne le Désavantage aux Tests à deux mains, une seule source', async () => {
  const store = await table([loss('hand-l', 'hand', 'left', { primary: false })], { heroExtra: { equipment: [sword, greatsword] } });
  const mirror = store.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects;
  assert.deepEqual(mirror.rows.map(row => row.type), ['two-hands']);
  const two = store.previewResolution(attack(greatsword));
  assert.ok(two.unresolved.some(text => /arme à deux mains est interdite/.test(text)), two.unresolved.join('|'));
  assert.equal(two.ready, false);
  const one = store.previewResolution(attack(sword));
  assert.ok(!one.unresolved.some(text => /deux mains/.test(text)));
  // Test hors attaque : la circonstance est demandée au MJ puis appliquée (Désavantage), sans double comptage.
  const asked = store.previewResolution(skillTest('Escalade', 'F'));
  assert.ok(asked.unresolved.some(text => /deux mains/.test(text)));
  const yes = store.previewResolution(skillTest('Escalade', 'F', { sequelaTwoHands: true }));
  assert.equal(yes.unresolved.filter(text => /deux mains/.test(text)).length, 0);
  assert.deepEqual(yes.test.advantage.disadvantage.map(row => row.label), ['Main ou bras perdu (Test à deux mains)']);
  const no = store.previewResolution(skillTest('Escalade', 'F', { sequelaTwoHands: false }));
  assert.equal(no.test.advantage.disadvantage.length, 0);
});

test('J2 effets : main directrice perdue, −2 DR avec l’arme de l’autre main, réduit de 1 DR par 100 PX', async () => {
  const store = await table([loss('hand-r', 'hand', 'right', { primary: true })], { heroExtra: { equipment: [sword] } });
  assert.deepEqual(mods(store.previewResolution(attack(sword, { sequelaOffHand: true, sequelaTwoHands: false }))).map(row => row.amount), [-2]);
  assert.deepEqual(mods(store.previewResolution(attack(sword, { sequelaOffHand: false }))).map(row => row.amount), []);
  const relearned = await table([loss('hand-r', 'hand', 'right', { primary: true, relearned: 1 })], { heroExtra: { equipment: [sword] } });
  assert.deepEqual(mods(relearned.previewResolution(attack(sword, { sequelaOffHand: true }))).map(row => row.amount), [-1]);
});

test('J2 effets : bras perdu, bouclier impossible ; doigts : −1 DR par doigt, quatre doigts valent une main', async () => {
  const arm = await table([loss('arm', 'arm', 'left')], { heroExtra: { equipment: [sword] } });
  const shield = arm.previewResolution(attack(sword, { attackWithShield: true, sequelaShieldOnLostArm: true }));
  assert.ok(shield.unresolved.some(text => /ne peut pas y fixer de bouclier|bouclier/.test(text)));
  const fingers = await table([loss('f', 'finger', 'right', { count: 2 })]);
  assert.deepEqual(mods(fingers.previewResolution(skillTest('Crochetage', 'Dex', { 'sequelaUses:arm:right': true }))).map(row => row.amount), [-2]);
  assert.ok(fingers.previewResolution(skillTest('Crochetage', 'Dex')).unresolved.some(text => /utilise cette zone/.test(text)));
  const four = await table([loss('f', 'finger', 'right', { count: 4 })]);
  assert.deepEqual(four.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.rows.map(row => row.type), ['two-hands']);
});

test('J2 effets : pied perdu, Mouvement arrondi au-dessus, −10 CC et Agilité, Esquive et Athlétisme en Désavantage ; jambe : Esquive interdite', async () => {
  const foot = await table([loss('foot', 'foot', 'left')]);
  const row = foot.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects;
  assert.deepEqual(row.movement, { base: 4, effective: 2 });
  assert.deepEqual(Object.fromEntries(Object.entries(sequelaCharacteristicTotals(row.rows)).map(([key, value]) => [key, value.amount])), { CC: -10, Ag: -10 });
  const dodge = foot.previewResolution(skillTest('Esquive', 'Ag'));
  assert.equal(dodge.test.advantage.disadvantage.length, 1);
  assert.equal(dodge.test.score, 40, 'Agilité −10 sur le score du Test (50 → 40)');
  const athletics = foot.previewResolution(skillTest('Athlétisme', 'Ag'));
  assert.equal(athletics.test.advantage.disadvantage.length, 1);
  const leg = await table([loss('leg', 'leg', 'right')]);
  assert.ok(leg.previewResolution(skillTest('Esquive', 'Ag')).unresolved.some(text => /Esquive est impossible/.test(text)));
  assert.ok(!foot.previewResolution(skillTest('Esquive', 'Ag')).unresolved.some(text => /Esquive est impossible/.test(text)));
});

test('J2 effets : deux pieds, Mouvement 1 et −15 ; les orteils déjà perdus réduisent la pénalité du pied sans la compter deux fois', async () => {
  const two = await table([loss('foot-l', 'foot', 'left'), loss('foot-r', 'foot', 'right')]);
  const rows = two.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects;
  assert.equal(rows.movement.effective, 1);
  assert.equal(sequelaCharacteristicTotals(rows.rows).CC.amount, -15);
  const toes = await table([loss('toes', 'toe', 'left', { count: 3 })]);
  assert.equal(sequelaCharacteristicTotals(toes.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects.rows).Ag.amount, -3);
  const both = await table([loss('toes', 'toe', 'left', { count: 3 }), loss('foot-l', 'foot', 'left')]);
  assert.equal(sequelaCharacteristicTotals(both.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects.rows).Ag.amount, -10, '10 pour le pied dont 3 déjà comptés avec les orteils');
});

test('J2 effets : deux yeux perdus (vue + Avantage de mêlée adverse), deux oreilles, nez, langue', async () => {
  const eyes = await table([loss('e1', 'eye', 'left'), loss('e2', 'eye', 'right')]);
  assert.ok(eyes.previewResolution(skillTest('Perception', 'I')).unresolved.some(text => /influencé par la vue/.test(text)));
  assert.equal(eyes.previewResolution(skillTest('Perception', 'I', { reliesOnSight: true })).test.advantage.disadvantage.length, 1);
  assert.equal(eyes.previewResolution(skillTest('Perception', 'I', { reliesOnSight: false, requiresSight: false })).test.advantage.disadvantage.length, 0);
  const oneEye = await table([loss('e1', 'eye', 'left')]);
  assert.equal(oneEye.previewResolution(skillTest('Perception', 'I')).unresolved.filter(text => /vue/.test(text)).length, 0, 'un seul œil perdu : aucun malus chiffré');
  // L'adversaire gagne l'Avantage pour toucher en mêlée un combattant privé de ses deux yeux.
  const blind = await table([loss('e1', 'eye', 'left'), loss('e2', 'eye', 'right')]);
  await blind.updateParticipant('hero', { camp: 'ennemi' }); await blind.updateParticipant('foe', { camp: 'pj' });
  const hit = blind.previewResolution({ ...attack(null), actorId: 'foe', targetId: 'hero', action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], label: 'Attaque' } });
  assert.ok(hit.test.advantage.advantage.some(row => /deux yeux|privée de ses deux yeux/i.test(row.label)), JSON.stringify(hit.test.advantage));
  const ears = await table([loss('a1', 'ear', 'left'), loss('a2', 'ear', 'right')]);
  assert.equal(ears.previewResolution(skillTest('Perception', 'I', { sequelaHearing: true })).test.advantage.disadvantage.length, 1);
  assert.equal(ears.previewResolution(skillTest('Perception', 'I', { sequelaHearing: false })).test.advantage.disadvantage.length, 0);
  const nose = await table([loss('nose', 'nose', null)]);
  assert.deepEqual(mods(nose.previewResolution(skillTest('Intimidation', 'Soc'))).map(row => row.amount), [2]);
  assert.deepEqual(mods(nose.previewResolution(skillTest('Charme', 'Soc'))).map(row => row.amount), [-2]);
  assert.equal(nose.previewResolution(skillTest('Perception', 'I', { sequelaSmell: true })).test.advantage.disadvantage.length, 1);
  const tongue = await table([loss('tongue', 'tongue', null)]);
  assert.ok(tongue.previewResolution(skillTest('Langue (Reikspiel)', 'Int', { sequelaSpeech: true })).unresolved.some(text => /échec automatique/.test(text)));
  assert.ok(!tongue.previewResolution(skillTest('Langue (Reikspiel)', 'Int', { sequelaSpeech: false })).unresolved.some(text => /échec automatique/.test(text)));
});

test('J2 effets : dents (1 Sociabilité par paire), perte de caractéristique (base d’abord, puis Avancements)', async () => {
  const teeth = await table([loss('teeth', 'teeth', null, { count: 5 })]);
  assert.equal(teeth.previewResolution(skillTest('Charme', 'Soc', {}, 50)).test.score, 48, '5 dents : −2 Sociabilité');
  const characteristic = await table([sequela('lost', 'hero', { kind: 'characteristic-loss', carac: 'Ag', requested: 5, applied: 5, split: { appliedToBase: 5, appliedToAdvances: 0, base: 0, advances: 3 }, reason: 'Poison' })]);
  assert.equal(characteristic.previewResolution(skillTest('Équitation', 'Ag')).test.score, 45);
  assert.equal(characteristic.previewResolution(skillTest('Équitation', 'F')).test.score, 50);
});

test('J2 effets : cicatrices impressionnantes selon l’accord du MJ, le nez remplace le bonus ordinaire, la cicatrice de duel guérie vaut une fois', async () => {
  const agreed = await table([sequela('scars', 'hero', { kind: 'scar-decision', agreed: true })]);
  assert.deepEqual(mods(agreed.previewResolution(skillTest('Intimidation', 'Soc'))).map(row => row.amount), [1]);
  assert.deepEqual(mods(agreed.previewResolution(skillTest('Charme', 'Soc'))).map(row => row.amount), [-1]);
  const declined = await table([sequela('scars', 'hero', { kind: 'scar-decision', agreed: false })]);
  assert.deepEqual(mods(declined.previewResolution(skillTest('Intimidation', 'Soc'))), []);
  const nose = await table([sequela('scars', 'hero', { kind: 'scar-decision', agreed: true }), loss('nose', 'nose', null)]);
  assert.deepEqual(mods(nose.previewResolution(skillTest('Intimidation', 'Soc'))).map(row => row.amount), [2], 'le nez remplace +1/−1 par +2/−2, sans cumul');
  const incident = { id: 'inc', participantId: 'hero', source: { kind: 'critical', criticalId: 'c' }, injuryDay: 0, status: 'closed', bandaged: true, requiresSurgery: false, surgeryCompleted: true, subjectKind: 'person', infection: false, dailyChecks: [], treatments: [] };
  const duel = await table([sequela('scar', 'hero', { kind: 'scar', status: 'permanent' })], { incidents: [incident] });
  assert.ok(duel.previewResolution(skillTest('Charme', 'Soc')).unresolved.some(text => /cicatrice de duel/.test(text)));
  assert.deepEqual(mods(duel.previewResolution(skillTest('Charme', 'Soc', { sequelaScarAppropriate: true }))).map(row => row.amount), [1]);
  const open = await table([sequela('scar', 'hero', { kind: 'scar', status: 'permanent' })], { incidents: [{ ...incident, status: 'open' }] });
  assert.ok(!open.previewResolution(skillTest('Charme', 'Soc')).unresolved.some(text => /cicatrice de duel/.test(text)), 'la cicatrice ne compte qu’une fois le critique guéri');
});

test('J2 effets : fracture et déchirure temporaires s’appliquent pendant leur durée et disparaissent au bon jour', async () => {
  const bone = (extra) => sequela('bone', 'hero', { kind: 'broken-bone', status: 'open', severity: 'minor', startDay: 0, d10: 4, durationDays: 34, endDay: 34, immobilization: { state: 'none', waiver: false, attempts: [] }, ...extra });
  const head = await table([bone({ part: 'head' })], { day: 33 });
  assert.deepEqual(mods(head.previewResolution(skillTest('Langue (Reikspiel)', 'Int'))).map(row => row.amount), [-3]);
  assert.deepEqual(mods(head.previewResolution(skillTest('Charme', 'Soc'))), [], 'seulement les Tests de Langue');
  const later = await table([bone({ part: 'head' })], { day: 34 });
  assert.deepEqual(mods(later.previewResolution(skillTest('Langue (Reikspiel)', 'Int'))), [], 'le jour de fin, la fracture est guérie');
  const body = await table([bone({ part: 'body' })], { day: 10 });
  const strength = body.previewResolution(skillTest('Escalade', 'F'));
  assert.equal(strength.test.advantage.disadvantage.length, 2, 'Désavantage majeur : deux Désavantages');
  assert.equal(body.previewResolution(skillTest('Savoir', 'Int')).test.advantage.disadvantage.length, 0);
  assert.equal(body.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.movement.effective, 2);
  const tear = (extra) => sequela('tear', 'hero', { kind: 'torn-muscle', status: 'open', part: 'arm', side: 'left', startDay: 0, toughnessBonus: 3, reducedDays: 0, ...extra });
  const minor = await table([tear({ severity: 'minor', endDay: 27 })], { day: 26 });
  assert.deepEqual(mods(minor.previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-1]);
  assert.deepEqual(mods((await table([tear({ severity: 'minor', endDay: 27 })], { day: 27 })).previewResolution(skillTest('Escalade', 'F'))), []);
  const major = (day) => table([tear({ severity: 'major', partialDay: 27, endDay: 54 })], { day });
  assert.deepEqual(mods((await major(26)).previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-2]);
  assert.deepEqual(mods((await major(27)).previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-1]);
  assert.deepEqual(mods((await major(54)).previewResolution(skillTest('Escalade', 'F'))), []);
  const leg = await table([tear({ part: 'leg', severity: 'minor', endDay: 27 })], { day: 5 });
  assert.equal(leg.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.movement.effective, 2, 'jambe : Mouvement divisé par deux');
});

test('J2 effets : fracture mal soignée, séquelle permanente (Mouvement, Agilité, Langue parlée) ; majeure : doublée', async () => {
  const bad = (part, severity, extra = {}) => sequela('bad', 'hero', { kind: 'broken-bone', status: 'permanent', severity, part, side: 'left', endDay: 30, ...extra });
  const leg = await table([bad('leg', 'minor')], { day: 90 });
  const mirror = leg.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects;
  assert.equal(mirror.movement.effective, 3);
  assert.equal(sequelaCharacteristicTotals(mirror.rows).Ag.amount, -10);
  const major = await table([bad('body', 'major')], { day: 90 });
  const mirror2 = major.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects;
  assert.equal(mirror2.movement.effective, 2);
  assert.equal(sequelaCharacteristicTotals(mirror2.rows).Ag.amount, -20);
  const head = await table([bad('head', 'major')], { day: 90 });
  assert.ok(head.previewResolution(skillTest('Langue (Reikspiel)', 'Int')).unresolved.some(text => /implique la parole/.test(text)));
  assert.deepEqual(mods(head.previewResolution(skillTest('Langue (Reikspiel)', 'Int', { sequelaSpeech: true }))).map(row => row.amount), [-2]);
  const arm = await table([bad('arm', 'minor')], { day: 90 });
  assert.deepEqual(mods(arm.previewResolution(skillTest('Équitation', 'Ag', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-1]);
  assert.deepEqual(mods(arm.previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))), [], 'seulement les Tests d’Agilité');
});

test('J2 effets : aucune séquelle, aucun changement ; la projection suit le registre (plus de registre, plus de projection)', async () => {
  const none = await table([]);
  assert.equal(none.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects, undefined);
  const plain = none.previewResolution(skillTest('Escalade', 'F'));
  assert.deepEqual(plain.unresolved, []);
  assert.equal(effectiveSequelaMovement([], 4), 4);
  assert.deepEqual(sequelaEffectRows({ calendar: { currentDay: 0 }, sequelae: [], incidents: [] }, 'hero'), []);
});
