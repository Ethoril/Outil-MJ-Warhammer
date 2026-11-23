// Passe G · lot G2 (R14, f4-tirer) : droit d'esquiver un tir calculé dans l'interface (p. 165), tir sans droit résolu comme
// un Test non opposé (p. 164), raisons bloquantes courtes (G2-c). `js/core/` n'est pas modifié : la permission passe par le
// champ existant `v5Context.rangedOppositionAllowed`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';
import { applicationBlockingReasons } from '../../../js/ui/resolution-panel.js';
import { rangedDodgeRight, rangedDodgeSync, rangedDodgeAnswer, mapDistanceContext, distanceChoices } from '../../../js/ui/combat-distance.js';

const person = (id, extra = {}) => ({ id, name: id, kind: id === 'a' ? 'PNJ' : 'PJ', camp: id === 'a' ? 'ennemi' : 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 50, CT: 60, F: 40, E: 30, Ag: 40, I: 42, FM: 40, Soc: 40, Int: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const shooter = person('a'), target = person('b');
const shield = ap => ({ id: 'bouclier', kind: 'shield', name: 'Bouclier', ap, locations: ['body'], keywords: [{ id: 'bouclier', parameter: String(ap) }] });
const map = meters => ({ mapDistance: { meters, actorId: 'a', targetId: 'b' } });
const right = (context = {}, extra = {}) => rangedDodgeRight({ actor: shooter, target: extra.target || target, context, plateau: extra.plateau || {} });

test('G2-a · carte ≤ BI m : esquive permise sans question, puce courte', () => {
  const r = right(map(3));
  assert.equal(r.status, 'allowed');
  assert.equal(r.by, 'carte');
  assert.equal(r.initiativeBonus, 4);
  assert.equal(r.label, 'Esquive permise : 3 m ≤ BI 4');
  assert.equal(r.defense, 'dodge');
  assert.equal(r.forced, false);
  assert.ok(r.title.length > r.label.length, 'texte complet en infobulle');
  assert.equal(right(map(4)).status, 'allowed', 'au plus BI mètres (yards = mètres)');
});

test('G2-a · carte > BI m sans bouclier : esquive interdite, raison courte, aucune question', () => {
  const r = right(map(9));
  assert.equal(r.status, 'forbidden');
  assert.equal(r.label, 'Esquive interdite : 9 m > BI 4');
  assert.equal(r.defense, 'none', 'aucun jet de défense');
  assert.ok(r.label.length <= 60);
});

test('G2-a · bouclier de 2 PA ou plus : esquive permise à toute portée ; 1 PA ne suffit pas', () => {
  const armed = person('b', { equipment: [shield(2)] });
  assert.equal(right(map(9), { target: armed }).status, 'allowed');
  assert.equal(right(map(9), { target: armed }).by, 'bouclier');
  assert.equal(right({}, { target: armed }).status, 'allowed', 'sans carte, aucune question');
  assert.match(right({}, { target: armed }).label, /^Esquive permise : bouclier 2 PA$/);
  const small = person('b', { equipment: [shield(1)] });
  assert.equal(right(map(9), { target: small }).status, 'forbidden');
  const damaged = person('b', { equipment: [shield(2)], extensions: { v5: { armorDamageByItem: { bouclier: 1 } } } });
  assert.equal(right(map(9), { target: damaged }).status, 'forbidden', 'PA restants du bouclier (dégâts comptés)');
});

test('G2-a · cible engagée avec le tireur : Corps à corps opposé, pas de question d’esquive', () => {
  assert.equal(right({}, { plateau: { engagedWithShooter: true } }).status, 'contact');
  assert.equal(right({ engagedWithShooter: true }).status, 'contact');
  assert.equal(right({ engagedWithShooter: false }, { plateau: { engagedWithShooter: true } }).status, 'ask', 'le MJ a choisi une bande');
});

test('G2-a (Q1) · sans carte ni bouclier : question en clair, sans précoche ; Oui / Non du MJ', () => {
  const r = right({});
  assert.equal(r.status, 'ask');
  assert.equal(r.answer, null, 'aucune précoche');
  assert.equal(r.label, 'Esquive permise si le tireur est à 4 m ou moins (BI 4)');
  const yes = rangedDodgeAnswer({}, { actorId: 'a', targetId: 'b' }, true);
  assert.equal(yes.rangedOppositionAllowed, true);
  assert.equal(right(yes).status, 'allowed');
  assert.equal(right(yes).answer, true);
  assert.equal(right(yes).deduced, 'ask', 'la question reste affichée, réponse marquée');
  const no = rangedDodgeAnswer(yes, { actorId: 'a', targetId: 'b' }, false);
  assert.equal(right(no).status, 'forbidden');
  assert.equal(right(no).defense, 'none');
  const cleared = rangedDodgeAnswer(no, { actorId: 'a', targetId: 'b' }, null);
  assert.equal('rangedOppositionAllowed' in cleared, false);
  assert.equal(right(cleared).answer, null);
});

test('G2-a · la puce déduite se force d’un clic et se rend d’un second', () => {
  const pair = { actorId: 'a', targetId: 'b' };
  const deduced = rangedDodgeSync(right(map(9)), map(9), pair);
  assert.equal(deduced.rangedOppositionAllowed, false, 'la déduction passe au moteur par le champ existant');
  assert.equal(rangedDodgeSync(right(deduced), deduced, pair), null, 'stable : rien à réécrire');
  const forced = rangedDodgeAnswer(deduced, pair, true);
  const r = right(forced);
  assert.equal(r.status, 'allowed');
  assert.equal(r.forced, true);
  assert.equal(r.deduced, 'forbidden');
  assert.equal(rangedDodgeSync(r, forced, pair), null, 'un choix du MJ n’est jamais réécrit');
  const back = rangedDodgeAnswer(forced, pair, null);
  assert.deepEqual(rangedDodgeSync(right(back), back, pair).rangedOppositionAllowed, false);
  // Carte ≤ BI : le moteur reçoit la permission.
  assert.equal(rangedDodgeSync(right(map(2)), map(2), pair).rangedOppositionAllowed, true);
  // Réponse du MJ pour une autre cible : oubliée.
  const stale = rangedDodgeAnswer({}, { actorId: 'a', targetId: 'z' }, true);
  assert.equal(right(stale).answer, null);
  assert.equal('rangedOppositionAllowed' in rangedDodgeSync(right(stale), stale, pair), false);
});

test('G2-b · la distance de la carte est gardée dans le brouillon et lue pour la bonne paire seulement', () => {
  const ctx = mapDistanceContext({ shotRange: 'short' }, { meters: 12, actorId: 'a', targetId: 'b' });
  assert.deepEqual(ctx.mapDistance, { meters: 12, actorId: 'a', targetId: 'b' });
  assert.equal(ctx.shotRange, 'short');
  assert.equal(mapDistanceContext(ctx, { meters: 12, actorId: 'a', targetId: 'b' }), null, 'même mesure : rien à écrire');
  assert.equal(right({ mapDistance: { meters: 2, actorId: 'a', targetId: 'z' } }).status, 'ask', 'mesure d’une autre cible ignorée');
});

test('G2-f · la ligne Distance dit ce qui est retenu et d’où', () => {
  assert.equal(distanceChoices({ context: { shotRange: 'short' }, mapBand: 'short', mapMeters: 12 }).summary, 'Courte · 12 m · carte');
  assert.equal(distanceChoices({ plateau: { engagedWithShooter: true } }).summary, 'Au contact · plateau');
  assert.match(distanceChoices({ context: { shotRange: 'long' } }).summary, /^Longue · choisi par le MJ$/);
  assert.match(distanceChoices({ context: { shotRange: 'long' }, mapBand: 'short', mapMeters: 12 }).summary, /^Longue · choisi par le MJ \(carte : 12 m\)$/);
  assert.equal(distanceChoices({}).summary, 'Distance à choisir');
});

// G2-g (MJ, 22/11) : sans droit à l'esquive, aucun jet de défense, rien ne bloque ; le seul jet de CT décide (p. 164).
const shot = (roll, context) => previewResolution({ actor: shooter, target, roll, baseRevision: 0, action: { type: 'attack', attr: 'CT', base: 60, damage: 4 },
  attackContext: { ranged: true }, v5: { kind: 'ranged', choice: 'keep', context }, v5State: { participants: [shooter, target] } });

test('G2-g · tir sans droit à l’esquive : aucune défense exigée, Appliquer actif après le seul jet de tir', () => {
  for (const context of [map(9), rangedDodgeAnswer({}, { actorId: 'a', targetId: 'b' }, false)]) {
    const r = right(context);
    assert.equal(r.defense, 'none', 'pas de champ de défense exigé');
    const synced = rangedDodgeSync(r, context, { actorId: 'a', targetId: 'b' }) || context;
    const hit = shot(30, synced);
    assert.equal(hit.opposition?.mode ?? null, null, 'Test non opposé');
    assert.equal(hit.hit, true, 'réussi = touché');
    assert.deepEqual(applicationBlockingReasons(hit, {}, true).filter(row => !row.silent), [], 'aucune raison bloquante');
    const miss = shot(90, synced);
    assert.equal(miss.hit, false, 'raté = manqué');
    assert.deepEqual(applicationBlockingReasons(miss, {}, true).filter(row => !row.silent), []);
  }
});

test('G2-c · chaque raison bloquante a un libellé court (≤ 60) et garde son texte complet', () => {
  const defense = { label: 'Esquive', attr: 'Ag', base: 40, roll: 80, v5: { kind: 'test' } };
  const blocked = previewResolution({ actor: shooter, target, roll: 30, baseRevision: 0, action: { type: 'attack', attr: 'CT', base: 60, damage: 4 }, defense,
    attackContext: { ranged: true }, v5: { kind: 'ranged', choice: 'keep', context: {} }, v5State: { participants: [shooter, target] } });
  const reasons = applicationBlockingReasons(blocked, {}, true);
  const ranged = reasons.find(row => row.focus === 'ranged-opposition');
  assert.ok(ranged, 'raison « défense contre un tir » présente');
  assert.ok(ranged.text.length > 60, 'texte du moteur complet');
  for (const reason of reasons) {
    assert.equal(typeof reason.label, 'string');
    assert.ok(reason.label.length > 0 && reason.label.length <= 60, `libellé court : ${reason.label}`);
  }
  const long = applicationBlockingReasons({ unresolved: ['Bénédiction de Protection : saisir le Test de Calme Accessible (+2 DR) de l’attaquant.'] }, {}, true);
  assert.ok(long[0].label.length <= 60);
  assert.equal(long[0].text, 'Bénédiction de Protection : saisir le Test de Calme Accessible (+2 DR) de l’attaquant.');
});
