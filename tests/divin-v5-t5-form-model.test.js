import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { targetRuleFactFields } from '../js/core/v5-divine-grammar.js';
import {
  FACT_FIELDS, emptyDivineForm, describeDivineForm, buildDivineForm, toEngineInput, classifyNeeds, extensionFields, targetFactFields,
  fieldValue, setFieldValue, formWarnings, describeEffectResult, summarizeExecution, deadlineLines, prayerDurationRounds, buildExpiry, formatCampaignTime, sourceText
} from '../js/ui/v5-divine-form-model.js';

// T5 : formulaire de prière généré depuis le contrat (module pur) ; le moteur accepte ce que le formulaire produit.
const clone = value => structuredClone(value);
const id = name => `divine:miracle:${name}`;
const SOULFIRE = id('sigmar:soulfire'), SUCCOUR = id('rhya:rhya-s-succour'), HAMMER = id('sigmar:sigmar-s-fiery-hammer'), TOUCH = id('rhya:rhya-s-touch');
const JUDGEMENT = id('ulric:the-snow-king-s-judgement'), MORR_HAND = id('morr:stay-morr-s-hand'), BEACON = id('sigmar:beacon-of-righteous-virtue'), ANNIHILATE = id('morr:destroy-undead');

const fighter = (name, extra = {}) => ({ id: name, name, kind: 'PNJ', camp: 'pnj', zone: 'active', initiative: 20, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priestFor = contract => ({ ...fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60,
  equipment: [{ id: 'axe-1', name: 'Hache de bataille', kind: 'weapon', category: 'Hache' }, { id: 'ham-1', name: 'Marteau de guerre', kind: 'weapon', category: 'Marteau' }] }),
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: contract.requiredTalent.id, status: 'resolved', rank: 1, specialization: contract.requiredTalent.specialization }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })), extensions: { v5: { divine: { sin: 0 } } } });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(contract) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const states = [{ id: 'st-deaf', key: 'assourdi', name: 'Assourdi', level: 1 }, { id: 'st-broken', key: 'brise', name: 'Brisé', level: 1 }];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe', 'friend'],
    participants: [priestFor(contract), fighter('foe', { traits: ['Mort-vivant'], states }), fighter('friend', { kind: 'PJ', camp: 'pj', states: clone(states) })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const people = store => store.listParticipants();

/** Remplit un formulaire généré comme le ferait un MJ : une valeur valable partout, jamais de donnée inventée hors liste. */
function autofill(contract, store, { targetIds }) {
  const participants = people(store), actor = participants.find(row => row.id === 'priest');
  const targets = targetIds.map(targetId => participants.find(row => row.id === targetId));
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor, targets, form, choices: { effect: 0 } });
  for (const field of model.effectFields) {
    if (field.scope === 'target' && field.kind === 'number') continue;
    if (field.kind === 'number') setFieldValue(form, field, field.min ?? 1);
    if (field.kind === 'select') setFieldValue(form, field, field.options.find(([value]) => value && value !== '__none')?.[0] ?? '');
    if (field.kind === 'check') setFieldValue(form, field, true);
  }
  for (const fields of Object.values(model.factFields)) for (const field of fields) setFieldValue(form, field, field.field === 'ally' && !field.required ? 'false' : 'true');
  const expiry = model.descr.expiryField ? buildExpiry({ contract, actor, choices: {}, round: 1, phase: 'endOfRound', manualRounds: form.expiryRounds }) : undefined;
  return { model, form, request: { actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, ...(expiry ? { expiry } : {}), ...toEngineInput(form, { targetIds }) } };
}

test('chaque fait de la liste blanche des règles de cible a un libellé français et une aide', () => {
  for (const field of Object.values(targetRuleFactFields)) {
    assert.ok(FACT_FIELDS[field]?.label && FACT_FIELDS[field]?.help, field);
  }
});

test('faits de cible : tirés du contrat (règles, portée, effets), sans nom de prière', () => {
  const fields = name => targetFactFields(getDivineContract(name)).map(row => `${row.field}${row.required ? '!' : ''}`);
  assert.deepEqual(fields(SOULFIRE), ['withinRange!', 'undead', 'ruinServant', 'ally']);
  assert.deepEqual(fields(ANNIHILATE), ['withinRange!', 'undead!', 'ally']);
  assert.deepEqual(fields(MORR_HAND), ['withinTouch!', 'zeroWounds!', 'consenting!', 'ally']);
  assert.deepEqual(fields(BEACON), ['withinRange', 'ally!', 'seesPriest!']);
  assert.deepEqual(fields(id('soleil-flamboyant')), ['withinRange', 'nonMyrmidian!', 'lookingAtPriest!', 'ally']);
  const verdict = targetFactFields(getDivineContract(JUDGEMENT)).find(row => row.field === 'judgement');
  assert.equal(verdict.custom, true);
  assert.equal(verdict.required, true);
  assert.match(verdict.help, /Livre de base V5 EN, p\. \d+/);
  assert.match(targetFactFields(getDivineContract(SOULFIRE))[0].help, /Source : Livre de base V5 EN, p\. 227/);
});

test('descripteur : dés, retrait, soin, arme, durée et extensions viennent des effets', () => {
  const soulfire = describeDivineForm(getDivineContract(SOULFIRE), { actor: priestFor(getDivineContract(SOULFIRE)) });
  assert.deepEqual(soulfire.damage.dice, { count: 1, sides: 10 });
  assert.equal(soulfire.areaTargets, true);
  assert.equal(soulfire.expiryField, false);
  assert.equal(describeDivineForm(getDivineContract(SUCCOUR)).removal.chosen, true);
  assert.equal(describeDivineForm(getDivineContract(TOUCH)).heal.extendable, true);
  assert.equal(describeDivineForm(getDivineContract(MORR_HAND)).calendarDuration, true);
  assert.equal(describeDivineForm(getDivineContract(MORR_HAND)).expiryField, false);
  const hammer = describeDivineForm(getDivineContract(HAMMER), { actor: priestFor(getDivineContract(HAMMER)) });
  assert.equal(hammer.weapon.weaponClass, 'marteau de guerre');
  assert.deepEqual(hammer.weapon.options.map(row => row.id), ['axe-1', 'ham-1']);
  assert.equal(describeDivineForm(getDivineContract('divine:blessing:myrmidia:battle')).expiryField, true);
  assert.equal(describeDivineForm(getDivineContract(SUCCOUR), { actor: priestFor(getDivineContract(SUCCOUR)) }).targetLimit, 6);
});

test('extensions : seules celles que le contrat et ses restrictions autorisent', () => {
  const keys = name => extensionFields(getDivineContract(name)).map(row => row.key);
  assert.deepEqual(keys('divine:blessing:myrmidia:battle'), ['range', 'targets', 'duration']);
  assert.deepEqual(keys(TOUCH), ['targets', 'effect'], 'Contact : pas de portée ; instantané : pas de durée ; effet de soin déclaré');
  assert.deepEqual(keys(HAMMER), ['duration'], 'Vous / Vous : ni portée ni cible');
  assert.deepEqual(keys(SOULFIRE), ['targets'], 'zone autour de soi : portée Vous, durée instantanée');
  assert.match(extensionFields(getDivineContract('divine:blessing:myrmidia:battle'))[0].help, /\+6 mètres de jeu/);
  assert.match(extensionFields(getDivineContract(SOULFIRE))[0].help, /valeur de base/);
});

test('formulaire généré : dégâts communs et par cible, États à retirer, arme, soin', () => {
  const foe = fighter('foe', { states: [{ id: 's1', key: 'assourdi', name: 'Assourdi', level: 2 }] }), plain = fighter('plain');
  const soulfire = getDivineContract(SOULFIRE);
  const model = buildDivineForm(soulfire, { actor: fighter('priest'), targets: [foe, plain] });
  assert.deepEqual(model.effectFields.map(row => row.id), ['damageRoll', 'damageRolls:foe', 'damageRolls:plain']);
  assert.equal(model.effectFields[0].min, 1);
  assert.equal(model.effectFields[0].max, 10);
  assert.ok(model.effectFields.every(row => row.label && row.help));
  assert.equal(Object.keys(model.factFields).length, 2);
  const removal = buildDivineForm(getDivineContract(SUCCOUR), { actor: fighter('priest'), targets: [foe, plain] });
  const select = removal.effectFields.find(row => row.id === 'removal:foe');
  assert.deepEqual(select.options.map(([value]) => value), ['', 's1', '__none']);
  assert.match(select.options[1][1], /Assourdi \(niveau 2\)/);
  assert.equal(removal.effectFields.find(row => row.id === 'removal:plain').empty, true);
  const heal = buildDivineForm(getDivineContract(TOUCH), { actor: fighter('priest'), targets: [foe], choices: { effect: 2 } });
  assert.equal(heal.effectFields[0].max, 3);
  const none = buildDivineForm(getDivineContract(HAMMER), { actor: fighter('priest'), targets: [] });
  assert.equal(none.effectFields.find(row => row.id === 'weapon').empty, true);
  const fixed = buildDivineForm(getDivineContract(BEACON), { actor: fighter('priest'), targets: [foe] });
  assert.match(fixed.info[0], /Broken/);
});

test('brouillon -> entrées moteur : jets, retraits, faits et arme, pour les cibles retenues seulement', () => {
  const form = emptyDivineForm();
  form.damageRoll = '7'; form.healCount = '1'; form.weaponId = 'ham-1'; form.weaponClassConfirmed = true;
  form.damageRolls = { a: '3', b: '', gone: '9' };
  form.removals = { a: 's1', b: '__none', gone: 's9' };
  form.facts = { a: { withinRange: 'true', ally: 'false', undead: '' }, gone: { withinRange: 'true' } };
  assert.deepEqual(toEngineInput(form, { targetIds: ['a', 'b'] }), {
    damageRoll: 7, damageRolls: { a: 3 }, removals: { a: { stateId: 's1' }, b: { none: true } }, healCount: 1,
    facts: { targets: { a: { withinRange: true, ally: false } }, weapon: { equipmentId: 'ham-1', classConfirmed: true } }
  });
  assert.deepEqual(toEngineInput(emptyDivineForm(), { targetIds: ['a'] }), { facts: { targets: {} } });
  const field = { path: ['facts', 'x', 'undead'], kind: 'tri' };
  setFieldValue(form, field, 'true');
  assert.equal(fieldValue(form, field), 'true');
  assert.equal(fieldValue(form, { path: ['nope', 'x'], kind: 'number' }), '');
});

test('needsInput de l’aperçu : rattachés aux champs du formulaire', () => {
  const targets = [fighter('foe', { name: 'Goule' })];
  const rows = classifyNeeds([{ field: 'damageRoll', label: 'Jet' }, { field: 'damageRolls.foe', label: 'Jet' }, { field: 'removals.foe.stateId', label: 'État' },
    { field: 'facts.targets.foe.undead', label: 'x' }, { field: 'facts.targets.foe.within-range', label: 'within-range' }, { field: 'facts.weapon.equipmentId', label: 'Arme' },
    { field: 'clockAnchor', label: 'Horloge' }, { field: 'expiry', label: 'Échéance' }, { field: 'choices', label: 'Extensions' }, { field: 'targetIds', label: 'Cibles' }, 'texte libre'], { targets });
  assert.deepEqual(rows.map(row => row.anchor), ['damageRoll', 'damageRolls:foe', 'removal:foe', 'fact:foe:undead', null, 'weapon', null, 'expiry', 'extensions', 'targets', null]);
  assert.equal(rows[3].label, `Goule : ${FACT_FIELDS.undead.label}`);
  assert.match(rows[6].label, /Temps de campagne/);
});

test('avertissement de zone : un allié coché est signalé', () => {
  const actor = fighter('priest', { camp: 'pj' });
  const ally = fighter('friend', { camp: 'pj', name: 'Ami' }), foe = fighter('foe');
  const descr = describeDivineForm(getDivineContract(SOULFIRE), { actor });
  assert.deepEqual(formWarnings(descr, actor, [ally, foe]), ['Ami est un allié du prêtre : l’effet de zone l’atteindra aussi.']);
  assert.equal(formWarnings(descr, actor, [foe]).length, 0);
  assert.equal(formWarnings(descr, actor, [foe], { facts: { foe: { ally: 'true' } } }).length, 1);
  assert.equal(formWarnings(describeDivineForm(getDivineContract(SUCCOUR), { actor }), actor, [ally]).length, 0);
});

test('durée et échéance : arithmétique du moteur, jamais devinée', () => {
  const actor = fighter('priest');
  const battle = getDivineContract('divine:blessing:myrmidia:battle');
  assert.equal(prayerDurationRounds(battle, actor, {}), 6);
  assert.equal(prayerDurationRounds(battle, actor, { duration: 2 }), 18);
  const hammer = getDivineContract(HAMMER);
  assert.equal(prayerDurationRounds(hammer, actor, {}), 6, 'bonus de Sociabilité');
  assert.equal(prayerDurationRounds(hammer, actor, { duration: 1 }), 12, 'palier = valeur de base');
  assert.equal(prayerDurationRounds(getDivineContract(MORR_HAND), actor, {}), null, 'heures : échéance calendaire');
  assert.equal(prayerDurationRounds(getDivineContract(SOULFIRE), actor, {}), null);
  assert.deepEqual(buildExpiry({ contract: battle, actor, choices: {}, round: 3, phase: 'endOfTurn' }), { phase: 'endOfTurn', round: 8, actorId: 'priest', moment: 'afterEffects' });
  assert.equal(buildExpiry({ contract: battle, actor, choices: {}, round: 3, phase: '' }), undefined);
  assert.equal(formatCampaignTime(90061), '1 j 1 h 1 min 1 s');
  const result = { preview: { success: true, resolvedParams: { duration: { value: 3, unit: 'hours' } } }, input: { clockAnchor: { campaignSeconds: 600 } } };
  assert.match(deadlineLines(result)[0], /3 h 10 min.*horloge actuelle 10 min \+ 3 h/);
  assert.deepEqual(deadlineLines({ ...result, input: {} }), []);
  assert.match(deadlineLines({ preview: { success: true, resolvedParams: { duration: { value: 6, unit: 'rounds' } } }, input: { expiry: { phase: 'endOfTurn', round: 6 } } }, { actorName: 'Elise' })[0], /fin du Tour de Elise au Round 6/);
  assert.match(sourceText(getDivineContract(SOULFIRE)), /^Livre de base V5 EN, p\. 227$/);
});

test('reçus : dés, DR, Blessures perdues, États retirés, soin et arme en clair', () => {
  const contract = getDivineContract(SOULFIRE);
  const participants = [fighter('foe', { name: 'Goule', states: [{ id: 'st1', key: 'assourdi', name: 'Assourdi' }] })];
  const damage = { targetId: 'foe', type: 'direct-damage', result: { die: 6, DR: 2, bonuses: { conditional: 2, holyHatred: 0 }, woundsLost: 10, hpBefore: 20, hpAfter: 10, conditions: ['Enflammé'] } };
  assert.equal(describeEffectResult(damage, { contract, participants }), 'Goule : 10 Blessure(s) perdue(s) (1d10 = 6, 2 DR, bonus ciblé +2) · 20 → 10 · État acquis : Enflammé');
  assert.equal(describeEffectResult({ targetId: 'foe', type: 'remove-condition', result: { removed: [{ id: 'st1', key: 'assourdi', level: 1 }], remaining: 0 } }, { participants }),
    'Goule : État(s) retiré(s) : Assourdi · 0 État(s) restant(s)');
  assert.match(describeEffectResult({ targetId: 'foe', type: 'remove-condition', result: { removed: [], remaining: 1 } }, { participants }), /aucun État retiré/);
  assert.match(describeEffectResult({ targetId: 'foe', type: 'wound-heal', result: { hpDelta: 6, amount: 6, chosen: 1, slots: 2 } }, { participants }), /6 Blessure\(s\) récupérée\(s\) \(6 × 1\/2/);
  assert.match(describeEffectResult({ targetId: 'foe', type: 'weapon-bonus', result: { damage: 6, equipmentId: 'ham-1', classConfirmed: false } }, { participants }), /ham-1, dégâts \+6 · classe d’arme non confirmée/);
  assert.equal(describeEffectResult({ targetId: 'foe', type: 'characteristic-modifier' }, {}), null);
  const summary = summarizeExecution({ prayer: { success: true, sl: 2 }, effectReceipts: [damage], reminders: ['Rappel'] }, { contract, participants });
  assert.equal(summary.title, 'Feu de l’âme · prière réussie (2 DR)');
  assert.deepEqual([summary.lines.length, summary.reminders], [1, ['Rappel']]);
  assert.equal(summarizeExecution(null), null);
});

test('le moteur accepte ce que le formulaire produit : tous les miracles et bénédictions utilisables', async () => {
  const unusable = [];
  for (const contract of getAllDivineContracts().filter(row => row.status !== 'blocked' && ['blessing', 'miracle'].includes(row.type))) {
    const store = await fixture(contract);
    const descr = describeDivineForm(contract, { actor: people(store).find(row => row.id === 'priest') });
    const targetIds = descr.selfTargeted ? ['priest'] : ['foe'];
    const { request } = autofill(contract, store, { targetIds });
    const preview = store.previewDivineExecution(contract.id, request);
    if (!preview.ready) unusable.push(`${contract.id} : ${preview.error} ${JSON.stringify(preview.needsInput)}`);
  }
  assert.deepEqual(unusable, []);
});

test('de bout en bout : Feu de l’âme, Secours de Rhya et Marteau enflammé depuis le formulaire', async () => {
  const run = async (contractId, targetIds, tweak) => {
    const contract = getDivineContract(contractId), store = await fixture(contract);
    const filled = autofill(contract, store, { targetIds });
    tweak?.(filled);
    const request = { ...filled.request, ...toEngineInput(filled.form, { targetIds }) };
    const preview = store.previewDivineExecution(contractId, request);
    assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
    assert.ok(Array.isArray(preview.projectedEffects), 'l’aperçu projette les effets par cible sans rien appliquer');
    const result = await store.applyDivineExecution(contractId, { preview });
    assert.equal(result.ready, true, result.error);
    return { store, result };
  };
  const fire = await run(SOULFIRE, ['foe', 'friend'], ({ form }) => { form.damageRoll = '5'; form.damageRolls.friend = '2'; Object.assign(form.facts.friend, { undead: 'false', ruinServant: 'false' }); });
  const hp = Object.fromEntries(people(fire.store).map(row => [row.id, row.hp]));
  assert.equal(hp.foe, 20 - (5 + 2), 'jet commun 5 + 1 par DR (2 DR) contre un mort-vivant');
  assert.equal(hp.friend, 20 - 2, 'jet propre à la cible, aucun bonus');
  assert.ok(fire.result.receipt.effectReceipts.every(row => describeEffectResult(row, { contract: getDivineContract(SOULFIRE), participants: people(fire.store) })));
  const succour = await run(SUCCOUR, ['foe'], ({ form }) => { form.removals.foe = 'st-broken'; });
  assert.deepEqual(people(succour.store).find(row => row.id === 'foe').states.map(row => row.id), ['st-deaf']);
  assert.ok(JSON.parse(succour.store.getFullJSON()).log.some(row => /foe : État\(s\) retiré\(s\) : Brisé/.test(row.text)), 'le journal nomme l’État retiré');
  assert.equal(succour.result.receipt.effectReceipts[0].result.removedNames[0], 'Brisé');
  const hammer = await run(HAMMER, ['priest'], ({ form }) => { form.weaponId = 'ham-1'; });
  const bonus = people(hammer.store).find(row => row.id === 'priest').extensions.v5.weaponBonuses.find(row => row.equipmentId);
  assert.equal(bonus.equipmentId, 'ham-1');
});
