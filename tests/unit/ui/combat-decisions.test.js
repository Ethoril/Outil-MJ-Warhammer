import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { collectDecisions, DECISION_KINDS, publishDecision, withdrawDecision, publishedDecisions, pendingDecisionCount, rememberDecisionCount } from '../../../js/ui/combat-decisions.js';

// Refonte de l'interface, lot E2 (CA7 à CA10) : case « À décider ». Une situation par décision du relevé §A de
// docs/specs/refonte-interface/fonctions-jouer.md (26) → une entrée, avec ses options.
const person = (id, name, extra = {}) => ({ id, name, kind: 'Créature', hp: 10, maxHp: 10, zone: 'active', states: [], extensions: {}, ...extra });
const v5 = data => ({ extensions: { v5: data } });
const ctx = (participants, extra = {}) => ({ participants, combat: { round: 1, currentActorId: participants[0]?.id || null }, actor: participants[0] || null, resolution: null, ...extra });
const quietStore = (extra = {}) => ({ isSuddenDeathEnabled: () => false, ...extra });
const only = (entries, kind) => {
  const found = entries.filter(entry => entry.kind === kind);
  assert.equal(found.length, 1, `une entrée « ${kind} » (reçu : ${entries.map(entry => entry.kind).join(', ') || 'aucune'})`);
  const entry = found[0];
  assert.ok(entry.id && typeof entry.id === 'string', 'identifiant stable');
  assert.ok(entry.titre && typeof entry.titre === 'string', 'titre lisible');
  assert.ok(Array.isArray(entry.options) && entry.options.length > 0, 'au moins une option');
  for (const option of entry.options) assert.ok(option.key && option.label, `option complète : ${JSON.stringify(option)}`);
  return entry;
};
const labels = entry => entry.options.map(option => option.label);

test('les 26 décisions du relevé §A ont chacune un type', () => {
  assert.equal(DECISION_KINDS.length, 26);
  assert.equal(new Set(DECISION_KINDS.map(row => row.kind)).size, 26);
  assert.ok(DECISION_KINDS.every(row => row.label));
});

test('1 · mort subite d’un figurant à 0 PV : Mort, Inconscient, Plus tard, Pas un figurant, sans case préalable', () => {
  const ungor = person('u', 'Ungor 1', { kind: 'PNJ', hp: 0 });
  const entry = only(collectDecisions(ctx([person('a', 'Erich', { kind: 'PJ' }), ungor]), { isSuddenDeathEnabled: () => true }), 'mort-subite');
  assert.equal(entry.participantId, 'u');
  assert.deepEqual(entry.options.map(option => option.key), ['dead', 'unconscious', 'later', 'declined']);
  assert.deepEqual(labels(entry), ['Mort', 'Inconscient', 'Plus tard', 'Pas un figurant']);
});

test('1 · mort subite : rien pour un PJ, un mort, un inconscient, ni après « Pas un figurant »', () => {
  const people = [
    person('pj', 'Erich', { kind: 'PJ', hp: 0 }),
    person('mort', 'Gor 1', { hp: 0, ...v5({ dead: true }) }),
    person('ko', 'Gor 2', { hp: 0, states: [{ key: 'inconscient', name: 'Inconscient' }] }),
    person('non', 'Bestigor', { hp: 0, ...v5({ suddenDeathDeclined: true }) })
  ];
  assert.deepEqual(collectDecisions(ctx(people), { isSuddenDeathEnabled: () => true }).filter(entry => entry.kind === 'mort-subite'), []);
});

test('2 · mort par critique : Confirmer / Refuser, et « décapité » sur une ligne de la tête', () => {
  const record = { id: 'c1', table: 'HEAD', effectName: 'Crâne fracassé', sequela: { criticalDeath: true } };
  const entry = only(collectDecisions(ctx([person('g', 'Gor 1', v5({ criticalAftermath: [record] }))]), quietStore()), 'mort-critique');
  assert.deepEqual(labels(entry), ['Confirmer la mort', 'Confirmer : décapité', 'Refuser la mort']);
  const countdown = only(collectDecisions(ctx([person('g', 'Gor 1', v5({ criticalDeath: { status: 'awaiting-mj', dueRound: 3 } }))]), quietStore()), 'mort-critique');
  assert.deepEqual(labels(countdown), ['Confirmer la mort', 'Refuser la mort']);
  const byState = only(collectDecisions(ctx([person('g', 'Gor 1', v5({ pendingStateDeath: { id: 'p1', source: 'bleeding', round: 2 } }))]), quietStore()), 'mort-critique');
  assert.match(byState.titre, /hémorragie/);
});

test('3 · choc d’amputation : survenue ou non, puis le Test de Résistance', () => {
  const record = { id: 'c2', effectName: 'Main tranchée' };
  const store = quietStore({ previewAmputationShock: () => ({ status: 'pending', requirements: [{ part: 'hand', difficultyDR: 2, conditional: true }] }) });
  const entry = only(collectDecisions(ctx([person('j', 'Jorunn', { kind: 'PJ', ...v5({ criticalAftermath: [record] }) })]), store), 'choc-amputation');
  assert.equal(entry.participantId, 'j');
  assert.deepEqual(entry.options.map(option => option.key), ['occurred', 'not-occurred', 'test']);
});

test('4 · corruption : test de seuil, mutation, perte du personnage, exposition', () => {
  for (const [status, pattern] of [[{ pendingThresholdTest: { points: 6 } }, /Test de Corruption/], [{ pendingMutation: { domain: 'physical' } }, /mutation/i], [{ pendingCharacterLoss: true }, /Chaos/], [{ pendingExposureSources: [{ id: 'e' }] }, /exposition/i]]) {
    const entry = only(collectDecisions(ctx([person('t', 'Theodosius', { kind: 'PJ' })]), quietStore({ getCorruptionStatus: () => status })), 'corruption');
    assert.match(entry.titre, pattern);
  }
});

test('5 · Brisé : la fuite attend le MJ', () => {
  const entry = only(collectDecisions(ctx([person('a', 'Erich', { kind: 'PJ' }), person('g', 'Gor 2', { states: [{ key: 'brise', name: 'Brisé', level: 1 }] })]), quietStore()), 'brise');
  assert.equal(entry.participantId, 'g');
});

test('6 · fuite ou désengagement : question publiée par le formulaire (Passer outre, Obstiné)', () => {
  const requests = [{ id: 'fuite:a', kind: 'fuite', participantId: 'a', titre: 'Erich est encerclé : passer outre ?', options: [{ key: 'override', label: 'Passer outre' }, { key: 'cancel', label: 'Rester' }] }];
  only(collectDecisions(ctx([person('a', 'Erich', { kind: 'PJ' })], { requests }), quietStore()), 'fuite');
});

const resolutionWith = preview => ({ resolution: { actorId: 'a', preview, v5Context: {} } });

test('7 · maladresse : le jet manquant vient de la résolution en cours', () => {
  only(collectDecisions(ctx([person('a', 'Gor 1')], resolutionWith({ unresolved: ['Maladresse de combat : saisissez le d100.'] })), quietStore()), 'maladresse');
});

test('8 · déviation de tir et dispersion', () => {
  only(collectDecisions(ctx([person('a', 'Guzgog')], resolutionWith({ unresolved: ['Dispersion : bande à saisir.'] })), quietStore()), 'deviation');
  only(collectDecisions(ctx([person('a', 'Guzgog')], resolutionWith({ unresolved: ['Tir engagé : d100 de la personne touchée.'] })), quietStore()), 'deviation');
});

test('9 · issue létale : la mort se confirme ou on y renonce', () => {
  const context = ctx([person('a', 'Erich', { kind: 'PJ' })], { resolution: { actorId: 'a', preview: {}, v5Context: { lethalTableEnabled: true, lethalIntent: true } } });
  const entry = only(collectDecisions(context, quietStore()), 'issue-letale');
  assert.deepEqual(entry.options.map(option => option.key), ['confirm', 'renounce']);
  context.resolution.v5Context.confirmLethalDeath = true;
  assert.equal(collectDecisions(context, quietStore()).filter(row => row.kind === 'issue-letale').length, 0);
});

test('10 · incident de magie : dés à saisir', () => {
  only(collectDecisions(ctx([person('a', 'Swilegrakk')], resolutionWith({ v5MagicKind: 'cast', castPreview: { miscast: { initialRoll: null } } })), quietStore()), 'incident-magie');
  only(collectDecisions(ctx([person('a', 'Swilegrakk')], resolutionWith({ v5MagicKind: 'cast', miscast: { initialRoll: 45, missingSecondaryDice: ['d10'] } })), quietStore()), 'incident-magie');
});

test('11 · jugement dernier en cours : retour ou rejet', () => {
  only(collectDecisions(ctx([person('p', 'Père Pedragar', v5({ divineJudgments: [{ id: 'j', status: 'departed' }] }))]), quietStore()), 'jugement');
});

test('12 · Péché et Courroux : question publiée par le panneau des prières', () => {
  const requests = [{ id: 'courroux:p', kind: 'courroux', participantId: 'p', titre: 'Courroux de Taal', options: [{ key: 'open', label: 'Ouvrir les prières' }] }];
  only(collectDecisions(ctx([person('p', 'Père Pedragar')], { requests }), quietStore()), 'courroux');
});

test('13 · effets V5 à saisir (fin de tour, d100, cibles) : question publiée par la fenêtre des effets', () => {
  const requests = [{ id: 'effets', kind: 'effets-v5', titre: 'Effets V5 à saisir', options: [{ key: 'open', label: 'Saisir' }] }];
  only(collectDecisions(ctx([person('a', 'Erich')], { requests }), quietStore()), 'effets-v5');
});

test('14 · méthode de récupération d’un État', () => {
  const requests = [{ id: 'recup', kind: 'recuperation', participantId: 'a', titre: 'Récupérer À terre', options: [{ key: 'stand-up', label: 'Se relever' }] }];
  only(collectDecisions(ctx([person('a', 'Erich')], { requests }), quietStore()), 'recuperation');
});

test('15 · initiative à saisir au démarrage', () => {
  const entry = only(collectDecisions(ctx([person('a', 'Erich')], { initiativePending: true, combat: { round: 0 } }), quietStore()), 'initiative');
  assert.equal(entry.participantId, null);
});

test('16 et 17 · retrait d’un participant et fin de combat : questions publiées par leur confirmation', () => {
  const requests = [
    { id: 'retrait:u', kind: 'retrait', participantId: 'u', titre: 'Retirer Ungor 1 ?', options: [{ key: 'keep', label: 'Garder le suivi' }, { key: 'archive', label: 'Archiver' }] },
    { id: 'fin', kind: 'fin-combat', titre: 'Terminer le combat ?', options: [{ key: 'keep', label: 'Garder les suivis' }] }
  ];
  const entries = collectDecisions(ctx([person('u', 'Ungor 1')], { requests }), quietStore());
  only(entries, 'retrait');
  only(entries, 'fin-combat');
});

test('18 · événement de scène dont la condition est remplie', () => {
  const store = quietStore({ getActiveScene: () => ({ id: 's', status: 'active', events: [{ id: 'ev1', label: 'Les renforts arrivent' }] }), previewSceneEvent: () => ({ status: 'proposed' }) });
  const entry = only(collectDecisions(ctx([person('a', 'Erich')]), store), 'evenement-scene');
  assert.deepEqual(entry.options.map(option => option.key), ['apply', 'later']);
});

test('19 · rappels de tour : Résoudre, Ignorer, Reporter', () => {
  const store = quietStore({ getActiveScene: () => ({ id: 's', status: 'active', events: [] }), getReminders: () => [{ id: 'r1', text: 'Saignement', status: 'pending', kind: 'endTurn' }] });
  const entry = only(collectDecisions(ctx([person('a', 'Erich')]), store), 'rappel');
  assert.deepEqual(labels(entry), ['Résoudre', 'Ignorer', 'Reporter']);
  assert.equal(collectDecisions(ctx([person('a', 'Erich')], { combat: { round: 0, currentActorId: null } }), store).filter(row => row.kind === 'rappel').length, 0, 'pas de rappel de tour avant que quelqu’un ait la main');
});

test('20 et 21 · carte : engagement suggéré, course sur la carte', () => {
  const requests = [
    { id: 'carte:engager', kind: 'engagement-carte', titre: 'Au contact : les engager ?', options: [{ key: 'engage', label: 'Engager' }] },
    { id: 'carte:course', kind: 'course-carte', titre: 'Course : action utilisée ?', options: [{ key: 'used', label: 'Action utilisée' }] }
  ];
  const entries = collectDecisions(ctx([person('a', 'Erich')], { requests }), quietStore());
  only(entries, 'engagement-carte');
  only(entries, 'course-carte');
});

test('22 · familier animal mort : Test de Calme du maître', () => {
  const master = person('m', 'Theodosius', { kind: 'PJ', ...v5({ familiarLinks: [{ id: 'l1', familiarId: 'f', system: 'animal' }] }) });
  const familiar = person('f', 'Corbeau', { hp: 0, ...v5({ familiarOf: { masterId: 'm', linkId: 'l1' } }) });
  const entry = only(collectDecisions(ctx([master, familiar]), quietStore()), 'familier');
  assert.equal(entry.participantId, 'm');
});

test('23 · questions d’États sans réponse', () => {
  only(collectDecisions(ctx([person('a', 'Erich')], resolutionWith({ conditionNeeds: ['Le test implique-t-il un mouvement ?'] })), quietStore()), 'questions-etats');
});

test('24 · arbitrage d’équipement : chargeur, protection', () => {
  only(collectDecisions(ctx([person('a', 'Guzgog')], resolutionWith({ unresolved: ['Recharge : saisir les munitions chargées.'] })), quietStore()), 'equipement');
  only(collectDecisions(ctx([person('a', 'Guzgog')], resolutionWith({ protection: { ap: null } })), quietStore()), 'equipement');
});

test('25 · Peur en cours : la surmonter', () => {
  const entry = only(collectDecisions(ctx([person('a', 'Erich', { kind: 'PJ', states: [{ key: 'fear-of-talent', name: 'Peur', rating: 2, successes: 0 }] })]), quietStore()), 'peur');
  assert.equal(entry.participantId, 'a');
});

test('26 · figurant à 0 PV, mort subite désactivée : l’activer ou non', () => {
  const entries = collectDecisions(ctx([person('u', 'Ungor 1', { kind: 'PNJ', hp: 0 })]), quietStore());
  const entry = only(entries, 'reglage-mort-subite');
  assert.deepEqual(entry.options.map(option => option.key), ['enable', 'dismiss']);
  assert.equal(entries.filter(row => row.kind === 'mort-subite').length, 0);
  assert.equal(collectDecisions(ctx([person('u', 'Ungor 1', { kind: 'PNJ', hp: 0 })], { dismissed: new Set([entry.id]) }), quietStore()).length, 0, '« Non » la fait disparaître');
});

test('aucune décision : liste vide ; une donnée absente ne casse rien', () => {
  assert.deepEqual(collectDecisions({}, {}), []);
  assert.deepEqual(collectDecisions(ctx([person('a', 'Erich', { extensions: undefined, states: undefined })]), {}), []);
});

test('un aperçu du moteur qui échoue n’empêche pas les autres entrées', () => {
  const store = { isSuddenDeathEnabled: () => true, getCorruptionStatus: () => { throw new Error('panne'); } };
  only(collectDecisions(ctx([person('u', 'Ungor 1', { kind: 'PNJ', hp: 0 })]), store), 'mort-subite');
});

test('une question publiée d’un type inconnu est ignorée ; les identifiants restent uniques', () => {
  const requests = [{ id: 'x', kind: 'inconnu', titre: 'X', options: [{ key: 'a', label: 'A' }] }, { id: 'r', kind: 'retrait', titre: 'R', options: [{ key: 'a', label: 'A' }] }, { id: 'r', kind: 'retrait', titre: 'R', options: [{ key: 'a', label: 'A' }] }];
  const entries = collectDecisions(ctx([], { requests }), {});
  assert.deepEqual(entries.map(entry => entry.kind), ['retrait']);
});

test('publication : une fenêtre publie sa question tant qu’elle est ouverte, puis la retire', () => {
  publishDecision({ id: 'effets:t', kind: 'effets-v5', titre: 'Effets', options: [{ key: 'open', label: 'Saisir' }] });
  assert.equal(publishedDecisions().filter(row => row.id === 'effets:t').length, 1);
  withdrawDecision('effets:t');
  assert.equal(publishedDecisions().filter(row => row.id === 'effets:t').length, 0);
});

test('compteur de la barre du haut : le dernier nombre rendu', () => {
  rememberDecisionCount(3);
  assert.equal(pendingDecisionCount(), 3);
  rememberDecisionCount(0);
  assert.equal(pendingDecisionCount(), 0);
});

test('store : « Pas un figurant » écrit extensions.v5.suddenDeathDeclined, persiste, s’annule ; Mort reste en un clic', async () => {
  let saved = null;
  const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ storage: null, persistence }); await store.ready;
  const extra = (id, name) => ({ id, name, kind: 'PNJ', camp: 'foes', zone: 'active', hp: 0, maxHp: 8, states: [], talents: [], extensions: { v5: {} } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [extra('a', 'Ungor 1'), extra('b', 'Ungor 2')] }, log: [], diceLines: [], extensions: { v5: {} } });
  await store.setSuddenDeathEnabled(true);
  const kinds = () => collectDecisions({ participants: store.listParticipants(), combat: store.getCombat() }, store).filter(row => row.kind === 'mort-subite').map(row => row.participantId);
  assert.deepEqual(kinds(), ['a', 'b']);
  await store.setSuddenDeathDeclined('a', true);
  assert.equal(store.listParticipants().find(row => row.id === 'a').extensions.v5.suddenDeathDeclined, true);
  assert.deepEqual(kinds(), ['b'], 'la décision quitte la case');
  assert.equal(saved.combat.participants.find(row => row.id === 'a').extensions.v5.suddenDeathDeclined, true, 'enregistré');
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants().find(row => row.id === 'a').extensions.v5.suddenDeathDeclined, undefined, 'Annuler retire le champ');
  const plan = store.previewSuddenDeath('b', true);
  await store.decideSuddenDeath('b', 'dead', { secondaryNpcConfirmed: true, baseRevision: plan.baseRevision });
  assert.equal(store.listParticipants().find(row => row.id === 'b').extensions.v5.dead, true);
  assert.deepEqual(kinds(), ['a']);
  await assert.rejects(async () => store.setSuddenDeathDeclined('zz', true), /introuvable/);
});
