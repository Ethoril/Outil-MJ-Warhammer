// Passe G, lot G3 (retours R15 et R17 du MJ, 22/11) : magie réduite au nécessaire, miracles tout précochés à « oui ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput, FACT_FIELDS, confirmFactsByDefault } from '../../../js/ui/v5-divine-form-model.js';
import { requestedMagicDice } from '../../../js/ui/resolution-panel/magic.js';

const BLAZING_SUN = 'divine:miracle:soleil-flamboyant';
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 20, maxHp: 20,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, equipment: [], traits: [], states: [], talents: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priestFor = contract => fighter('priest', { kind: 'PJ', camp: 'allie', initiative: 60,
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: contract.requiredTalent.id, status: 'resolved', rank: 1, specialization: contract.requiredTalent.specialization }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 } } } });

function sunForm() {
  const contract = getDivineContract(BLAZING_SUN);
  const actor = priestFor(contract);
  const targets = [fighter('foe'), fighter('friend', { kind: 'PJ', camp: 'allie' })];
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor, targets, form });
  return { contract, actor, targets, form, model };
}

test('G3-b (R17) : « Soleil flamboyant » → tous les faits de chaque cible vrais par défaut (portée, faits de scène, allié)', () => {
  const { contract, actor, form, model } = sunForm();
  confirmFactsByDefault(form, model.factFields);
  const facts = toEngineInput(form, { targetIds: ['foe', 'friend'], contract, actor }).facts.targets;
  for (const id of ['foe', 'friend']) {
    assert.deepEqual(Object.keys(facts[id]).sort(), ['ally', 'lookingAtPriest', 'nonMyrmidian', 'withinRange'], id);
    assert.ok(Object.values(facts[id]).every(value => value === true), `${id} : tout est à oui`);
  }
});

test('G3-b : un fait décoché est lu comme « non » et la précoche ne le remet pas à oui', () => {
  const { contract, actor, form, model } = sunForm();
  confirmFactsByDefault(form, model.factFields);
  const looking = model.factFields.foe.find(row => row.field === 'lookingAtPriest');
  setFieldValue(form, looking, 'false');
  confirmFactsByDefault(form, model.factFields);
  const facts = toEngineInput(form, { targetIds: ['foe', 'friend'], contract, actor }).facts.targets;
  assert.equal(facts.foe.lookingAtPriest, false);
  assert.equal(facts.friend.lookingAtPriest, true);
});

test('G3-b : une réponse « À préciser » laissée par l’ancien formulaire est précochée à oui', () => {
  const { form, model } = sunForm();
  form.facts = { foe: { nonMyrmidian: '' } };
  confirmFactsByDefault(form, model.factFields);
  assert.equal(form.facts.foe.nonMyrmidian, 'true');
});

test('G3-b : « Allié admissible » devient « Allié du prêtre », avec une aide d’une ligne', () => {
  assert.equal(FACT_FIELDS.ally.label, 'Allié du prêtre');
  assert.ok(FACT_FIELDS.ally.help && !/\n/.test(FACT_FIELDS.ally.help) && FACT_FIELDS.ally.help.length <= 90, FACT_FIELDS.ally.help);
});

test('G3-c : même réponse, même effet — tout à oui, la prière est prête ; un « non » sur un fait exigé est renvoyé au MJ, comme avant G3', async () => {
  const contract = getDivineContract(BLAZING_SUN);
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe', 'other'],
    participants: [priestFor(contract), fighter('foe'), fighter('other')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const people = store.listParticipants();
  const actor = people.find(row => row.id === 'priest'), targets = ['foe', 'other'].map(id => people.find(row => row.id === id));
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor, targets, form });
  confirmFactsByDefault(form, model.factFields);
  const request = () => ({ actorId: 'priest', targetIds: ['foe', 'other'], roll: 20, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    ...toEngineInput(form, { targetIds: ['foe', 'other'], contract, actor }) });
  const allYes = store.previewDivineExecution(BLAZING_SUN, request());
  assert.equal(allYes.ready, true, JSON.stringify(allYes.needsInput || allYes.error));
  assert.deepEqual(allYes.preview.targetIds, ['foe', 'other'], 'tout à oui : les deux cibles sont retenues sans autre question');
  setFieldValue(form, model.factFields.other.find(row => row.field === 'lookingAtPriest'), 'false');
  const oneNo = store.previewDivineExecution(BLAZING_SUN, request());
  assert.equal(oneNo.ready, false);
  assert.deepEqual(oneNo.needsInput.map(row => row.field), ['facts.targets.other.lookingAtPriest'], 'le « non » est lu tel quel par le moteur');
});

test('G3-a (R15) : seuls les dés réclamés sortent du repli « Options »', () => {
  assert.deepEqual(requestedMagicDice({ attackRoll: 25 }), [], 'jet ordinaire : aucun dé de plus');
  assert.deepEqual(requestedMagicDice({ attackRoll: 33 }), ['magicMiscastRoll'], 'double : jet d’incident');
  assert.deepEqual(requestedMagicDice({ attackRoll: 100 }), ['magicMiscastRoll'], 'maladresse : jet d’incident');
  const incident = { attackRoll: 44, magicMiscastRoll: 97, preview: { missing: ['majorRoll'], castPreview: { miscast: { missingSecondaryDice: ['damage', 'distance'] } } } };
  assert.deepEqual(requestedMagicDice(incident).sort(), ['magicMajorRoll', 'magicMiscastRoll', 'magicSecondaryDamageRoll', 'magicSecondaryDistanceRoll']);
  assert.deepEqual(requestedMagicDice({ attackRoll: 25, magicSecondaryDurationRoll: 4 }), ['magicSecondaryDurationRoll'], 'un dé déjà saisi reste en vue');
});
