import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

const BATTLE = 'divine:blessing:myrmidia:battle';
const contract = getAllDivineContracts().find(row => row.id === BATTLE);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  persistentCharacterId: 'persistent-' + id,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }], prayers: [],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const prayer = (extra = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 23, canSpeak: true,
  choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { ally: { withinRange: true, ally: true } } },
  expiry: { phase: 'endOfRound', round: 6, moment: 'afterEffects' }, ...extra });
async function makeStore(states = [], specialStates = {}) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'],
    participants: [actor('priest', { states, extensions: { v5: { divine: { sin: 0 }, specialStates } } }), actor('ally')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const snapshot = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };

test('E4 runtime indépendant — états Sonné/Exténué/Empoisonné réduisent le Test par le pire modificateur', async () => {
  const store = await makeStore([
    { key: 'sonne', name: 'Sonné', level: 2 },
    { key: 'extenue', name: 'Exténué', level: 1 },
    { key: 'empoisonne', name: 'Empoisonné', level: 3 }
  ]);
  const before = snapshot(store);
  const preview = store.previewDivineExecution(BATTLE, prayer({ conditionContext: {
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Le MJ retient le malus d’État maximal.'
  } }));
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.preview.prayer.sl, 1, 'base +4 SL moins le pire malus distinct de 3');
  assert.deepEqual(preview.preview.conditionTestContext.slModifiers.map(row => row.amount), [-3]);
  assert.deepEqual(preview.preview.conditionTestContext.levels, { sonne: 2, extenue: 1, empoisonne: 3 });
  assert.deepEqual(snapshot(store), before, 'l’aperçu ne modifie ni États ni ressources');
});

test('E4 runtime indépendant — Souillé utilise le sélecteur légal du moteur de Test partagé', async () => {
  const store = await makeStore([{ key: 'souille', name: 'Souillé', level: 1 }]);
  const preview = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.preview.prayer.optionId, 'reverse');
  assert.equal(preview.preview.prayer.roll, 32, 'le Désavantage impose l’inversion défavorable du jet 23');
  assert.deepEqual(preview.preview.conditionTestContext.disadvantageSources.map(row => row.label), ['Souillé']);
});

test('E4 runtime indépendant — combinaison Souillé + malus SL exige DIV-05 motivé et n’applique qu’un choix', async () => {
  const store = await makeStore([{ key: 'souille', name: 'Souillé', level: 1 }, { key: 'sonne', name: 'Sonné', level: 2 }]);
  const missingDecision = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(missingDecision.ready, false);
  assert.ok(missingDecision.needsInput.some(row => row.field === 'conditionContext.conditionPenaltyMode'));
  assert.ok(missingDecision.needsInput.some(row => row.field === 'conditionContext.conditionPenaltyReason'));

  const chosen = store.previewDivineExecution(BATTLE, prayer({ conditionContext: {
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Je retiens le malus maximal en DR.'
  } }));
  assert.equal(chosen.ready, true, chosen.error);
  assert.equal(chosen.preview.conditionTestContext.arbitration.decisionId, 'DIV-05');
  assert.equal(chosen.preview.conditionTestContext.arbitration.mode, 'sl');
  assert.deepEqual(chosen.preview.conditionTestContext.slModifiers.map(row => row.amount), [-2]);
  assert.deepEqual(chosen.preview.conditionTestContext.disadvantageSources, []);
});

test('E4 runtime indépendant — les paramètres du formulaire ne peuvent pas forger une exemption ou un bonus d’État', async () => {
  const store = await makeStore([{ key: 'sonne', name: 'Sonné', level: 2 }]);
  const ordinary = store.previewDivineExecution(BATTLE, prayer());
  const forged = store.previewDivineExecution(BATTLE, prayer({ conditionContext: {
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Motif quelconque', isAction: false,
    runningOrHiding: true, slModifiers: [{ id: 'forged', amount: 99 }], advantageSources: ['free advantage']
  } }));
  assert.equal(ordinary.ready, true, ordinary.error);
  assert.equal(forged.ready, true, forged.error);
  assert.deepEqual(forged.preview.conditionTestContext.slModifiers, ordinary.preview.conditionTestContext.slModifiers,
    'le moteur dérive les Conditions de l’acteur et ignore les exceptions/modificateurs arbitraires');
  assert.deepEqual(forged.preview.conditionTestContext.advantageSources, ordinary.preview.conditionTestContext.advantageSources);
  assert.equal(forged.preview.conditionTestContext.levels.sonne, 2);
});

test('E4 runtime indépendant — Clarté d’esprit canonique neutralise Sonné mental ou bloque explicitement sa dépendance', async () => {
  const store = await makeStore([{ key: 'sonne', name: 'Sonné', level: 2 }], {
    clarityOfThought: true
  });
  const result = store.previewDivineExecution(BATTLE, prayer());
  if (result.ready) {
    assert.equal(result.preview.conditionTestContext.levels.sonne, 2,
      'la Condition demeure enregistrée, seule son exception source s’applique');
    assert.deepEqual(result.preview.conditionTestContext.slModifiers, [],
      'Clarté d’esprit neutralise le malus Sonné du Test mental/Prière');
    assert.equal(result.preview.prayer.sl, 4, 'le +4 SL de base n’est pas réduit par Sonné');
  } else {
    const details = [result.error, ...(result.needsInput || []).map(row => row.label || row.field)].join(' ');
    assert.match(details, /Clarté|clarity|mental|exception|projection/i,
      'si l’exception n’est pas raccordée, la dépendance doit bloquer explicitement le preview');
  }
});

test('E4 runtime indépendant — Clarté d’esprit canonique écarte seulement Sonné d’une Prière mentale avec preuve p. 251', async () => {
  const store = await makeStore([{ key: 'sonne', name: 'Sonné', level: 2 }], {
    clarityOfThought: true
  });
  const result = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(result.ready, true, result.error || JSON.stringify(result.needsInput));
  const context = result.preview.conditionTestContext;
  assert.equal(context.levels.sonne, 2, 'la Condition et son niveau restent présents');
  assert.deepEqual(context.slModifiers, [], 'Clarté ignore uniquement le malus de Sonné pour ce Test mental');
  assert.deepEqual(context.disadvantageSources, [], 'aucune pénalité non sourcée n’est introduite');
  assert.equal(result.preview.prayer.sl, 4, 'le +4 SL de base reste intact');
  const exceptionEvidence = JSON.stringify(context);
  assert.match(exceptionEvidence, /Clarté|clarityOfThought/i,
    'le contexte du Test doit exposer la dérogation canonique réellement appliquée');
  assert.match(exceptionEvidence, /p\.?\s*251|V5[^\"]{0,12}251/i,
    'la dérogation appliquée doit conserver sa référence de source p. 251');
});

test('E4 runtime indépendant — Clarté d’esprit ne laisse pas passer le malus mental Exténué sans examen explicite', async () => {
  const store = await makeStore([{ key: 'extenue', name: 'Exténué', level: 2 }], {
    clarityOfThought: true
  });
  const result = store.previewDivineExecution(BATTLE, prayer());
  if (result.ready) {
    assert.equal(result.preview.conditionTestContext.levels.extenue, 2,
      'la Condition Exténué et son niveau restent présents même si une règle l’exempte');
    assert.deepEqual(result.preview.conditionTestContext.slModifiers, [],
      'Clarté ne laisse pas appliquer son malus à ce Test mental');
    assert.equal(result.preview.prayer.sl, 4, 'le +4 SL de base n’est pas réduit par Exténué');
    const evidence = JSON.stringify(result.preview.conditionTestContext);
    assert.match(evidence, /Clarté|clarityOfThought/i);
    assert.match(evidence, /p\.?\s*251|V5[^\"]{0,12}251/i,
      'l’exemption doit porter une provenance explicite p. 251');
  } else {
    const details = [result.error, ...(result.needsInput || []).map(row => row.label || row.field)].join(' ');
    assert.match(details, /Clarté|clarity|Exténué|fatigue|mental/i,
      'un cas connu mais non raccordé doit bloquer explicitement plutôt que produire un malus erroné');
  }
});

test('E4 runtime indépendant — aperçu avec Courroux et Péché ne mutile pas le Store avant Apply', async () => {
  const store = await makeStore();
  const edit = await store.setDivineSin('priest', 1, { reason: 'Sin initial explicite pour la sonde', baseRevision: store.getLocalRevision() });
  assert.equal(edit.ok, true, edit.error);
  const before = snapshot(store);
  const preview = store.previewDivineExecution(BATTLE, prayer({ roll: 21, wrathRoll: 78,
    wrathConsequences: 'Le MJ a résolu le rappel de la ligne 88.' }));
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.wrathTableResult?.id, 'wrath:88-88');
  assert.deepEqual(snapshot(store), before, 'Calculer ne consomme pas le Péché et ne modifie pas le sujet ou les cibles');
});

test('E4 runtime indépendant — capture de Condition devient stale avant Apply sans effet partiel', async () => {
  const store = await makeStore([{ key: 'souille', name: 'Souillé', level: 1 }]);
  const preview = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(preview.ready, true, preview.error);
  await store.updateParticipant('priest', { states: [] });
  const beforeApply = snapshot(store);
  await assert.rejects(async () => store.applyDivineExecution(BATTLE, { preview }), /changé depuis le calcul|recalculez/i);
  assert.deepEqual(snapshot(store), beforeApply, 'le refus stale n’applique pas la prière ou la décision de Test');
  assert.equal(beforeApply.combat.participants.find(row => row.id === 'ally').extensions?.v5?.divineEffects?.length || 0, 0);
});
