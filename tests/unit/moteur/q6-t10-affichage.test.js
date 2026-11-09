// Q6 · T10 (docs/specs/tests-secondaires-agregateur/tasks.md) : ce que le moteur rend pour que chaque écran pose ses questions
// (chemin de réponse, réponse par patient, zone lisible), décisions CA32 et CA34, Obstiné hors combat, et les aides pures du module
// d'affichage commun (js/ui/test-questions.js).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { previewV5BrokenEscape } from '../../../js/core/v5-broken-escape.js';
import { sequelaQuestionLabel } from '../../../js/core/v5-sequela-effects.js';
import { previewCadaiCorruptionReroll } from '../../../js/core/v5-magic-high.js';
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';
import { collectTestQuestions, answerTestQuestion, getAt, isQuestionField } from '../../../js/ui/test-questions.js';
import { encounter, inputFor } from '../../helpers/lot3-domain-fixture.js';
import { input } from '../../helpers/lot3-wom-fixture.js';

const PRONE = { id: 'p1', key: 'aterre', name: 'À terre', level: 1 };

describe('Libellés et chemins de réponse', () => {
  test('zone de séquelle lisible sans participant (pas « arm:left »)', () => {
    assert.equal(sequelaQuestionLabel('sequelaUses:arm:left'), 'Séquelle : le Test utilise-t-il cette zone (bras gauche) ?');
    assert.match(sequelaQuestionLabel('sequelaUses:leg:right'), /jambe droit/);
  });
  test('collectTestQuestions trouve les questions rangées sous un chemin, dans tout l’aperçu, et défait le préfixe de Chevaucher', () => {
    const preview = { tripFall: { needsInput: [{ field: 'involvesMovement', label: 'Q1', answerAt: 'tripFallConditionContext' }] },
      plans: [{ needsInput: [{ field: 'rideCondition:r1:reliesOnSight', label: 'Q2', answerAt: 'mountedRideTests.r1.conditionContext' }, { field: 'mountedRideRoll:r1', label: 'd100', answerAt: 'x' }] }],
      needsInput: [{ field: 'involvesMovement', label: 'sans chemin' }] };
    const rows = collectTestQuestions(preview);
    assert.deepEqual(rows.map(row => [row.answerAt, row.field]), [['tripFallConditionContext', 'involvesMovement'], ['mountedRideTests.r1.conditionContext', 'reliesOnSight']]);
  });
  test('answerTestQuestion range la réponse au chemin, sans toucher au reste', () => {
    const root = { keep: 1, mountedRideTests: { r1: { roll: 40 } } };
    const next = answerTestQuestion(root, 'mountedRideTests.r1.conditionContext', 'sequelaUses:arm:left', false);
    assert.deepEqual(next, { keep: 1, mountedRideTests: { r1: { roll: 40, conditionContext: { 'sequelaUses:arm:left': false } } } });
    assert.deepEqual(root.mountedRideTests.r1, { roll: 40 }, 'copie, pas de modification sur place');
    assert.equal(getAt(answerTestQuestion(next, 'mountedRideTests.r1.conditionContext', 'sequelaUses:arm:left', undefined), 'mountedRideTests.r1.conditionContext')['sequelaUses:arm:left'], undefined);
    assert.equal(isQuestionField('sequelaNoCircumstanceInput'), false);
    assert.equal(isQuestionField('conditionPenaltyMode'), true);
  });
});

describe('Décisions du MJ appliquées au moteur', () => {
  test('CA34 : la cible Inconsciente du Souffle est traitée comme Surprise, sans Esquive', async () => {
    const { store } = await encounter({ foe: { states: ['Inconscient'] } });
    const contract = getAllSpellContracts().find(row => row.name === 'Souffle');
    const preview = store.previewSpellExecution(contract.id, { ...input('Souffle'), chosenLore: 'metal', ctRoll: 25, targetTests: { foe: { distance: 5 } } });
    assert.equal(preview.ready, true, preview.error);
    const breath = preview.targetResults.find(row => row.targetId === 'foe').breath;
    assert.equal(breath.defended, null);
    assert.equal(breath.noDodge, 'Inconsciente');
  });
});

describe('Questions rendues avec leur chemin de réponse', () => {
  test('Corruption de Tzeentch : la question d’État, pas un nouveau d100, rangée dans targetTests.<id>.corruptionContext', async () => {
    const { store } = await encounter({ foe: { states: ['À terre'] } });
    const contract = getAllSpellContracts().find(row => row.name === 'Transformation de Tzeentch');
    const base = inputFor(contract);
    const ask = extra => store.previewSpellExecution(contract.id, { ...base, attributeActive: true, targetTests: { ...base.targetTests, foe: { ...base.targetTests.foe, corruptionRoll: 40, ...extra } } });
    const pending = ask();
    assert.equal(pending.status, 'condition-input-required');
    assert.equal(pending.attributeDice, undefined, 'le d100 déjà saisi n’est pas redemandé');
    assert.deepEqual(pending.needsInput.map(row => [row.field, row.answerAt]), [['involvesMovement', 'targetTests.foe.corruptionContext']]);
    const answered = ask({ corruptionContext: { involvesMovement: false } });
    assert.notEqual(answered.status, 'condition-input-required', answered.error);
  });
  test('Sprint de Brisé : la question de zone se répond dans facts.conditionContext', () => {
    const row = { type: 'loc-dr', loc: 'leg:left', amount: -1, label: 'Déchirure musculaire mineure (jambe gauche) : −1 DR aux Tests impliquant la zone', lifetime: 'temporary', sourceId: 'tm' };
    const hero = { id: 'hero', name: 'Héros', caracs: { M: 4, Ag: 40 }, states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }],
      skills: [{ id: 'ath', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 55 }], talents: [],
      extensions: { v5: { sequelaEffects: { schemaVersion: 1, rows: [row], movement: { base: 4, effective: 4 }, reminders: [] } } } };
    const sprint = conditionContext => previewV5BrokenEscape({ actor: hero, action: 'sprint', turn: { encounterId: 'e', turnId: 't', round: 1 }, roll: 10,
      facts: { visibleToAnyEnemyAfter: false, ...(conditionContext ? { conditionContext } : {}) }, sequence: { fleeCommitted: true, visibleToAnyEnemy: true, moveMode: 'run' } });
    const pending = sprint();
    assert.equal(pending.ready, false);
    assert.deepEqual(pending.needsInput.map(need => need.field), ['sequelaUses:leg:left']);
    const uses = sprint({ 'sequelaUses:leg:left': true }), spared = sprint({ 'sequelaUses:leg:left': false });
    assert.equal(uses.ready && spared.ready, true);
    assert.equal(uses.test.sl, spared.test.sl - 1, 'la jambe blessée pèse quand elle sert');
  });
  test('relance Cadai de la Corruption : les réponses du MJ passent, la question revient avec son champ', () => {
    const actor = { id: 'm', name: 'Mage', caracs: { FM: 40 }, skills: [{ name: 'Calme', total: 50 }], talents: [], states: [PRONE],
      extensions: { v5: { cadaiRunes: { deployed: 1, max: 4 } } } };
    const options = { spell: { id: 's', domain: 'high' }, castExecutionId: 'x', accessible: true, firstRoll: 90, reroll: 30 };
    const pending = previewCadaiCorruptionReroll(actor, options);
    assert.equal(pending.ready, false);
    assert.deepEqual(pending.needsInput.map(row => row.field), ['involvesMovement']);
    assert.equal(previewCadaiCorruptionReroll(actor, { ...options, conditionContext: { involvesMovement: false } }).ready, true);
  });
});

describe('Convalescence : une réponse par patient', () => {
  const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
  const patient = id => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30 }, skills: [], talents: [], states: [PRONE], extensions: { v5: {} } });
  test('deux patients À terre : chaque question porte son patient, chaque réponse ne vaut que pour lui', async () => {
    const store = createStore({ storage: null, persistence: memoryPersistence() });
    await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [patient('a'), patient('b')] }, log: [], diceLines: [], extensions: { v5: {} } });
    for (const id of ['a', 'b']) assert.equal((await store.registerAftermathIncident({ operationId: 'r' + id, participantId: id, cause: 'combat' })).receipt.status, 'applied');
    const incidents = store.getAftermathState().incidents;
    const dailyTests = incidents.map(row => ({ incidentId: row.id, day: 0, roll: 30 }));
    const first = await store.advanceAftermathCalendar({ operationId: 'adv1', days: 1, dailyTests });
    assert.equal(first.receipt.reason, 'condition-input-required');
    assert.deepEqual(first.receipt.needsInput.map(row => [row.participantId, row.field]), [['a', 'involvesMovement']]);
    // `a` ne bouge pas, `b` bouge : réponses distinctes ; la réponse de `a` ne répond pas à la place de `b`.
    const second = await store.advanceAftermathCalendar({ operationId: 'adv2', days: 1, dailyTests, conditionContexts: { a: { involvesMovement: false } } });
    assert.deepEqual(second.receipt.needsInput.map(row => [row.participantId, row.field]), [['b', 'involvesMovement']]);
    const done = await store.advanceAftermathCalendar({ operationId: 'adv3', days: 1, dailyTests, conditionContexts: { a: { involvesMovement: false }, b: { involvesMovement: true } } });
    assert.equal(done.receipt.status, 'applied');
    const byPatient = Object.fromEntries(done.receipt.processedDailyChecks.map(row => [row.participantId, row]));
    assert.equal(byPatient.a.sl, 2, 'sans mouvement : À terre ne pèse pas');
    assert.ok((byPatient.b.detail || []).some(line => /Désavantage : À terre/.test(line)), (byPatient.b.detail || []).join(' | '));
  });
  test('Obstiné choisi pour un testeur (obstinateTesterIds) : annule les malus de ce seul testeur', async () => {
    const store = createStore({ storage: null, persistence: memoryPersistence() });
    await store.ready;
    const stunned = id => ({ ...patient(id), states: [{ id: 's', key: 'sonne', name: 'Sonné', level: 2 }], talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] });
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [stunned('a')] }, log: [], diceLines: [], extensions: { v5: {} } });
    await store.registerAftermathIncident({ operationId: 'r', participantId: 'a', cause: 'combat' });
    const dailyTests = [{ incidentId: store.getAftermathState().incidents[0].id, day: 0, roll: 30 }];
    const out = await store.advanceAftermathCalendar({ operationId: 'adv', days: 1, dailyTests, conditionContext: { obstinateTesterIds: ['a'] } });
    assert.equal(out.receipt.status, 'applied');
    assert.equal(out.receipt.processedDailyChecks[0].sl, 2, 'Sonné 2 annulé par Obstiné : +2 DR de difficulté seulement');
  });
});

describe('Sprint de Brisé : talents et plafonds', () => {
  test('Obstiné choisi avant le jet annule le malus d’Exténué du Test d’Athlétisme', () => {
    const hero = talents => ({ id: 'hero', name: 'Héros', caracs: { M: 4, Ag: 40 }, states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }, { id: 'f', key: 'extenue', name: 'Exténué', level: 2 }],
      skills: [{ id: 'ath', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 55 }], talents, extensions: { v5: {} } });
    const sprint = (actor, conditionContext) => previewV5BrokenEscape({ actor, action: 'sprint', turn: { encounterId: 'e', turnId: 't', round: 1 }, roll: 10,
      facts: { visibleToAnyEnemyAfter: false, ...(conditionContext ? { conditionContext } : {}) }, sequence: { fleeCommitted: true, visibleToAnyEnemy: true, moveMode: 'run' } });
    const strongMinded = [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }];
    const plain = sprint(hero(strongMinded)), chosen = sprint(hero(strongMinded), { preRollTalent: 'strong-minded' });
    assert.equal(plain.ready && chosen.ready, true, JSON.stringify(plain.needsInput || chosen.needsInput));
    assert.equal(chosen.test.sl, plain.test.sl + 2, 'Exténué 2 ramené à 0');
  });
});
