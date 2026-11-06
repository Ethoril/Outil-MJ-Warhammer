// U8 lot L7 · contenu de supplément sans JS (docs/specs/moteur-effets-unifie/spec.md, CA8 à CA10).
// Un talent, une prière et un sort fictifs, déclarés seulement en JSON (tests/fixtures/supplements/supplement-fictif.json), se
// comportent comme leurs équivalents du livre :
//  - le talent est une copie déclarative de Nageur émérite (talent-strong-swimmer) : mêmes propositions, même évaluateur ;
//  - le sort (+3 « carac:e ») se cumule avec Dur comme le roc (+2 « carac:e ») par meilleur bonus (R3 V5 p. 235) ;
//  - la prière (+2 Résistance) se somme avec un sort (MJ 05/11 Q2) et entre en meilleur bonus avec Rage de Rhya (MJ 06/11 Q10).
// Le fichier des suppléments est remplacé par la fixture (hook de résolution, tests/helpers/supplement-fixture-hooks.mjs) : les
// modules de l'application sont chargés APRÈS le hook, par import dynamique, et lisent le supplément fictif comme un vrai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../../helpers/supplement-fixture-hooks.mjs';
const { loadSupplements, supplementLayer, BOOK_RESERVED_IDS, SUPPLEMENTS, SUPPLEMENT_ERRORS } = await import('../../../js/core/supplement-loader.js');
const { V5_TALENT_CONTRACTS, evaluateV5Talents, currentV5TalentHashes } = await import('../../../js/core/v5-talents.js');
const { validateTalentContractV2 } = await import('../../../js/core/talent-contract-v2.js');
const { magicTestModifiers } = await import('../../../js/core/v5-magic-talents.js');
const { getSpellContract, getAllSpellContracts } = await import('../../../js/core/v5-spell-contracts.js');
const { getAllDivineContracts, getDivineContract } = await import('../../../js/core/v5-divine-store.js');
const { NUMERIC_OPS, UNIQUE_OPS, OP_PHASES, STACK_POLICIES, CLAUSE_EVENTS } = await import('../../../js/core/effect-engine.js');
const { renderBricks, BRICKS_PATH } = await import('../../../tools/build-effect-bricks.mjs');

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const FIXTURE = read('../../fixtures/supplements/supplement-fictif.json');
const REAL = read('../../../js/data/v5-supplements.json');
const sha = text => 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
const load = data => loadSupplements(data, { reservedIds: BOOK_RESERVED_IDS });
const loaded = SUPPLEMENTS; // chargé au démarrage depuis la fixture
const TALENT = 'talent-supplement-fictif-nageur', BOOK_TALENT = 'talent-strong-swimmer';
const JAW = 'talent-supplement-fictif-machoire', BOOK_JAW = 'talent-iron-jaw';
const SPELL = 'spell-supplement-fictif-peau-de-corail', PRAYER = 'divine:supplement-fictif:benediction-des-flots';
const RAGE = 'divine:miracle:rhya:rhya-s-rage';

// Chemin de l'application : registre de v5-talents.js (livre + supplément), empreintes de currentV5TalentHashes.
const evaluate = (participant, options) => evaluateV5Talents(participant, options);
const swimmer = talentId => ({ id: 'nageur', talents: [{ id: talentId, status: 'resolved', rank: 1 }] });
const swimContext = { skillId: 'skill-4e_61_74_61_74_69_6f_6e-base', skillGroupId: 'skill-group-4e_61_74_61_74_69_6f_6e', pursuit: true };
const strip = plan => plan.proposals.map(({ origins, stackGroup, ...rest }) => rest);

const actor = (spellEffects = [], divineEffects = []) => ({ id: 'cible', extensions: { v5: { spellEffects, divineEffects } } });
const bookSpellLayer = (name, id) => { const contract = getSpellContract(name); return { id, spellId: contract.id, spellName: contract.name, testModifiers: { ...contract.effects.testModifiers } }; };
const rageLayer = id => { const contract = getAllDivineContracts().find(row => row.id === RAGE); return { id, prayerId: RAGE, testModifiers: { ...contract.effects.find(row => row.type === 'test-modifier').modifiers } }; };
const resistance = target => magicTestModifiers(target, 'Résistance', { carac: 'E' }).magic.reduce((sum, row) => sum + row.amount, 0);

test('CA8 · le supplément fictif se charge sans erreur : un talent, une prière, un sort', () => {
  assert.deepEqual(loaded.errors, []);
  assert.deepEqual(loaded.talents.map(row => row.talentId), [TALENT, JAW]);
  assert.deepEqual(loaded.prayers.map(row => row.id), [PRAYER]);
  assert.deepEqual(loaded.spells.map(row => row.id), [SPELL]);
  // Le contrat compilé a exactement la forme des contrats v2 du livre.
  for (const contract of loaded.talents) assert.equal(validateTalentContractV2(structuredClone(contract)), true);
  assert.deepEqual(SUPPLEMENT_ERRORS, []);
  for (const contract of loaded.talents) {
    assert.ok(V5_TALENT_CONTRACTS.some(row => row.talentId === contract.talentId), 'talent au registre de l’application');
    assert.equal(currentV5TalentHashes()[contract.talentId], contract.source.effectHash, 'empreinte du supplément retenue');
    assert.equal(contract.source.effectHash, sha(loaded.talentDescriptions[contract.talentId]), `empreinte de ${contract.talentId}`);
  }
});

test('CA8 · talent fictif : mêmes propositions que le talent du livre qu’il recopie, par le même évaluateur', () => {
  for (const [role, context] of [['actor', swimContext], ['actor', { ...swimContext, pursuit: false }], ['defender', swimContext]]) {
    const options = { event: 'test.beforeRoll', role, context };
    const fromJson = evaluate(swimmer(TALENT), options);
    const fromBook = evaluate(swimmer(BOOK_TALENT), options);
    assert.equal(fromJson.ready, fromBook.ready);
    assert.deepEqual(strip(fromJson), strip(fromBook));
    assert.ok(fromJson.trace.length && fromJson.trace.every(row => row.talentId === TALENT && row.status !== 'sourceUnavailable'));
  }
  const plan = evaluate(swimmer(TALENT), { event: 'test.beforeRoll', role: 'actor', context: swimContext });
  assert.deepEqual(plan.proposals.map(row => [row.op, row.amount ?? null]).sort(), [['grantAdvantage', null], ['modifySL', 2]]);
});

test('CA8 · talent dont l’empreinte ne correspond pas au texte : forme acceptée au chargement, écart détecté par le contrôle d’empreinte du fichier réel', () => {
  const data = structuredClone(FIXTURE);
  data.supplements[0].talents[0].source.effectHash = sha('autre texte');
  const other = load(data);
  assert.deepEqual(other.errors, []); // la forme est valide ; c'est le test des empreintes (ci-dessous) qui garde le fichier réel
  assert.notEqual(other.talents[0].source.effectHash, sha(other.talentDescriptions[TALENT]));
});

test('Q2 (MJ 06/11) · talent fictif à quota « une fois par rencontre » : même comportement que Mâchoire de fer, quota compris', () => {
  const plan = (talentId, used) => {
    const participant = { id: 'nageur', talents: [{ id: talentId, status: 'resolved', rank: 1 }] };
    const quotaId = `${talentId}:first-stunned`;
    const state = { revision: 0, participants: [participant], v5ActionLedger: { appliedActions: [], quotaUsage: used ? [{ actorId: 'nageur', quotaId, scope: 'encounter', scopeKey: JSON.stringify(['e1']), used }] : [] } };
    return evaluate(participant, { event: 'condition.beforeAcquire', role: 'defender', context: { condition: { id: 'sonne', instances: 2 } }, state, clock: { encounterId: 'e1' }, actionId: 'a1' });
  };
  for (const used of [0, 1]) {
    const fromJson = plan(JAW, used), fromBook = plan(BOOK_JAW, used);
    assert.deepEqual(strip(fromJson), strip(fromBook));
    assert.deepEqual(fromJson.trace.map(row => row.status), fromBook.trace.map(row => row.status));
    assert.deepEqual(fromJson.quotas.map(row => ({ ...row, id: null })), fromBook.quotas.map(row => ({ ...row, id: null })));
  }
  assert.deepEqual(plan(JAW, 0).proposals.map(row => [row.op, row.amount]), [['reduceConditionAcquisition', 1]]);
  assert.deepEqual(plan(JAW, 1).trace.map(row => row.status), ['quotaExhausted']);
});

test('CA8 · sort fictif : couche au format stocké, meilleur bonus avec Dur comme le roc (R3 p. 235)', () => {
  const spell = loaded.spells[0];
  assert.deepEqual(spell.testModifiers, { 'carac:e': 3 });
  const layer = supplementLayer(spell, { id: 'corail', casterId: 'mage' });
  assert.deepEqual(layer, { id: 'corail', spellId: SPELL, spellName: spell.name, supplementId: 'supplement-fictif', testModifiers: { 'carac:e': 3 }, casterId: 'mage' });
  const roc = bookSpellLayer('Dur comme le roc', 'roc');
  assert.equal(resistance(actor([roc])), 2);
  assert.equal(resistance(actor([roc, layer])), 3, 'meilleur bonus seul, pas 5');
  // Comme s'il était codé : le même modificateur porté par une couche de sort du livre donne le même résultat.
  assert.equal(resistance(actor([roc, { id: 'codé', spellId: 'spell-code', testModifiers: { 'carac:e': 3 } }])), resistance(actor([roc, layer])));
});

test('CA8 · prière fictive : somme avec un sort (Q2), meilleur bonus avec une autre prière (Q10)', () => {
  const prayer = supplementLayer(loaded.prayers[0], { id: 'flots' });
  assert.deepEqual(prayer.testModifiers, { 'Résistance': 2 });
  assert.equal(prayer.prayerId, PRAYER);
  assert.equal(resistance(actor([], [prayer])), 2);
  assert.equal(resistance(actor([bookSpellLayer('Dur comme le roc', 'roc')], [prayer])), 4, 'prière + sort : somme');
  assert.equal(resistance(actor([], [rageLayer('rage'), prayer])), 2, 'deux prières : meilleur bonus');
  assert.equal(resistance(actor([], [rageLayer('rage'), prayer])), resistance(actor([], [rageLayer('rage'), rageLayer('rage-2')])));
});

test('CA9 · brique inconnue ou champ mal formé : refusé avec l’élément et le champ, le reste du supplément reste chargé', () => {
  const data = structuredClone(FIXTURE);
  const supplement = data.supplements[0];
  supplement.talents.push({ ...structuredClone(supplement.talents[0]), id: 'talent-supplement-op-inconnue', clauses: [{ id: 'x', event: 'test.beforeRoll', role: 'actor', when: [], effects: [{ op: 'teleport', stackGroup: 'g', stack: 'unique' }] }] });
  supplement.talents.push({ ...structuredClone(supplement.talents[0]), id: 'talent-supplement-champ', clauses: [{ id: 'y', event: 'test.beforeRoll', role: 'actor', when: [{ field: 'phaseLunaire', op: 'eq', value: 1 }], effects: [{ op: 'modifySL', amount: 1, stackGroup: 'g', stack: 'max' }] }] });
  supplement.talents.push({ ...structuredClone(supplement.talents[0]), id: 'talent-supplement-cout', clauses: [{ ...structuredClone(supplement.talents[0].clauses[0]), quotas: [{ id: 'q', scope: 'semaine', maximum: 1 }] }] });
  supplement.talents.push({ ...structuredClone(supplement.talents[0]), id: BOOK_TALENT });
  supplement.spells.push({ id: 'spell-supplement-montant', name: 'Montant', clauses: [{ id: 'z', event: 'test.beforeRoll', role: 'actor', when: [], effects: [{ op: 'modifySL', amount: 'deux', key: 'Endurance' }] }] });
  supplement.spells.push({ id: 'spell-supplement-degats', name: 'Dégâts', clauses: [{ id: 'd', event: 'damage.beforeProtection', role: 'actor', when: [], effects: [{ op: 'modifyDamage', amount: 2, key: 'all' }] }] });
  supplement.prayers.push({ id: 'divine:supplement:condition', name: 'Condition', clauses: [{ id: 'c', event: 'test.beforeRoll', role: 'actor', when: [{ field: 'onOcean', op: 'eq', value: true }], effects: [{ op: 'modifySL', amount: 1, key: 'all' }] }] });
  supplement.prayers.push({ id: 'divine:supplement:inconnu', name: 'Champ', couleur: 'bleu', clauses: [] });
  const result = load(data);
  const errors = Object.fromEntries(result.errors.map(row => [row.elementId, row]));
  const expect = (elementId, field, pattern) => {
    assert.ok(errors[elementId], `erreur attendue pour ${elementId}`);
    assert.equal(errors[elementId].field, field);
    assert.ok(errors[elementId].message.startsWith('Supplément « supplement-fictif », '), errors[elementId].message);
    assert.ok(errors[elementId].message.includes(`« ${elementId} » (champ « ${field} ») : `), errors[elementId].message);
    if (pattern) assert.match(errors[elementId].message, pattern);
  };
  expect('talent-supplement-op-inconnue', 'clauses.x.op', /Opération v2 non couverte/);
  expect('talent-supplement-champ', 'clauses.y.when', /Prédicat v2 non couvert/);
  expect('talent-supplement-cout', 'clauses.advantage-actor.quotas', /portée invalide/);
  expect(BOOK_TALENT, 'id', /déjà pris/);
  expect('spell-supplement-montant', 'clauses.z.effects.0.amount', /entier/);
  expect('spell-supplement-degats', 'clauses.d.event', /non couvert/);
  expect('divine:supplement:condition', 'clauses.c.when', /condition/);
  expect('divine:supplement:inconnu', 'couleur', /non couvert/);
  assert.equal(result.errors.length, 8);
  // Les éléments valides restent chargés.
  assert.deepEqual([result.talents.length, result.spells.length, result.prayers.length], [2, 1, 1]);
});

test('CA9 · registre illisible ou supplément mal formé : signalé, jamais d’exception', () => {
  assert.match(load(null).errors[0].message, /registre illisible/);
  const result = load({ schemaVersion: 1, supplements: [{ id: 'x', title: 'X', version: '1', edition: 'V4' }] });
  assert.equal(result.errors[0].field, 'edition');
  assert.match(result.errors[0].message, /^Supplément « x » \(champ « edition »\) : édition « V5 » requise$/);
});

test('fichier réel des suppléments (js/data/v5-supplements.json) : chargé sans erreur, empreintes conformes à leur texte', () => {
  const real = load(REAL);
  assert.deepEqual(real.errors, []);
  for (const contract of real.talents) {
    assert.equal(contract.source.effectHash, sha(real.talentDescriptions[contract.talentId]), `empreinte de ${contract.talentId}`);
    assert.equal(validateTalentContractV2(structuredClone(contract)), true);
  }
});

// ---------------------------------------------------------------------------------------------------------------------------
// Q4 (MJ 06/11) : le sort et la prière de supplément se lancent par les chemins existants (store.previewSpellExecution,
// store.previewDivineExecution), avec la NI, la portée et la durée déclarées dans le JSON.
// ---------------------------------------------------------------------------------------------------------------------------
const { encounter, cast, subject } = await import('../../helpers/lot3-domain-fixture.js');
const { createStore } = await import('../../../js/core/store.js');
const { createGameClock } = await import('../../../js/core/v5-game-time.js');

test('Q4 · sort fictif : contrat au registre des sorts (NI, portée, durée du JSON), lancé par le store comme un sort du livre', async () => {
  const contract = getSpellContract(SPELL);
  assert.ok(contract && getAllSpellContracts().some(row => row.id === SPELL));
  assert.equal(getSpellContract('Peau de corail (fictif)')?.id, SPELL, 'trouvé par son nom, comme sur une fiche');
  assert.deepEqual([contract.cn, contract.range, contract.target, contract.duration, contract.type], [3, 'Bonus de Force Mentale mètres', '1', 'Bonus de Force Mentale Rounds', 'Domaine fictif']);
  assert.deepEqual(contract.effects, { type: 'test-modifiers', testModifiers: { 'carac:e': 3 } });
  const { store } = await encounter();
  const preview = await cast(store, contract);
  assert.equal(preview.castingPreview?.cn ?? contract.cn, 3);
  const foe = subject(store, 'foe');
  assert.equal(foe.extensions.v5.testModifiers['carac:e'], 3);
  assert.ok(foe.extensions.v5.spellEffects.some(layer => layer.spellId === SPELL));
  // Comme s'il était codé : avec Dur comme le roc (+2) lancé sur la même cible, le meilleur bonus seul (R3 p. 235).
  const roc = getSpellContract('Dur comme le roc');
  await store.applySpellEffects('foe', { id: 'roc', spellId: roc.id, spellName: roc.name, casterId: 'autre', testModifiers: structuredClone(roc.effects.testModifiers), duration: '10 Rounds' });
  assert.equal(resistance(subject(store, 'foe')), 3);
});

const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const priest = () => ({ id: 'hero', name: 'hero', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 30, maxHp: 30, fortune: 2,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Rhya' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Rhya' }],
  prayers: [{ name: 'Bénédiction des flots (fictive)', status: 'resolved' }, { name: 'Rage de Rhya', status: 'resolved' }],
  equipment: [], states: [], actions: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: true } } });
async function chapel() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero'], participants: [priest()] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const invoke = async (store, id) => {
  const preview = store.previewDivineExecution(id, { actorId: 'hero', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'hero' }, defending: true, 'force-test': 0 });
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
};

test('Q4 · prière fictive : contrat au registre divin (portée, cibles, durée du JSON), invoquée par le store comme une prière du livre', async () => {
  const contract = getDivineContract(PRAYER);
  assert.equal(contract?.type, 'miracle');
  assert.deepEqual(contract.params, { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } });
  assert.equal(contract.requiredTalent.id, 'talent-invoke');
  assert.deepEqual(contract.effects.map(row => [row.type, row.modifiers]), [['test-modifier', { 'Résistance': 2 }]]);
  const store = await chapel();
  await invoke(store, PRAYER);
  const hero = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(hero.extensions.v5.testModifiers['Résistance'], 2);
  assert.equal(resistance(hero), 2);
});

test('Q4 · sans le talent du dieu, la prière fictive est refusée comme une prière du livre', async () => {
  const store = await chapel();
  const preview = id => store.previewDivineExecution(id, { actorId: 'hero', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'hero' } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero'], participants: [{ ...priest(), talents: [] }] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  assert.equal(preview(PRAYER).ready, false);
  assert.equal(preview(RAGE).ready, false);
});

test('Q4 · champs de lancement mal formés : refusés avec l’élément et le champ', () => {
  const data = structuredClone(FIXTURE);
  const supplement = data.supplements[0];
  const spell = supplement.spells[0], prayer = supplement.prayers[0];
  supplement.spells = [{ ...structuredClone(spell), id: 'spell-sans-ni', cn: undefined }, { ...structuredClone(spell), id: 'spell-surincantation', overcast: { allowed: true, options: ['vol'] } }];
  supplement.prayers = [{ ...structuredClone(prayer), id: 'divine:sans-dieu', deity: 'Dieu inconnu' }, { ...structuredClone(prayer), id: 'divine:duree', duration: { kind: 'instant' } }];
  supplement.talents = [];
  const errors = Object.fromEntries(load(data).errors.map(row => [row.elementId, row.field]));
  assert.deepEqual(errors, { 'spell-sans-ni': 'cn', 'spell-surincantation': 'overcast', 'divine:sans-dieu': 'deity', 'divine:duree': 'duration.kind' });
});

test('CA10 · briques.md est à jour et liste toutes les opérations, événements et politiques du validateur', () => {
  const content = readFileSync(BRICKS_PATH, 'utf8');
  assert.equal(content, renderBricks(), 'régénérer : node tools/build-effect-bricks.mjs');
  for (const op of [...NUMERIC_OPS, ...UNIQUE_OPS, ...Object.keys(OP_PHASES.fixed)]) assert.ok(content.includes('`' + op + '`'), op);
  for (const event of CLAUSE_EVENTS) assert.ok(content.includes('`' + event + '`'), event);
  for (const policy of Object.keys(STACK_POLICIES)) assert.ok(content.includes('`' + policy + '`'), policy);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Q5 (MJ 06/11) : les erreurs de chargement s'affichent dans un bandeau qui reste affiché (pas de fermeture, repliable).
// ---------------------------------------------------------------------------------------------------------------------------
const { supplementErrorsHtml, mountSupplementErrors } = await import('../../../js/ui/supplement-errors-banner.js');

test('Q5 · bandeau des erreurs : un message par élément écarté, échappé, sans bouton de fermeture ; rien sans erreur', () => {
  const data = structuredClone(FIXTURE);
  data.supplements[0].spells.push({ id: 'spell-<b>', name: 'Montant', clauses: [{ id: 'z', event: 'test.beforeRoll', role: 'actor', when: [], effects: [{ op: 'modifySL', amount: 'deux', key: 'Endurance' }] }] });
  data.supplements[0].prayers.push({ id: 'divine:x', name: 'X', couleur: 'bleu' });
  const errors = load(data).errors;
  assert.equal(errors.length, 2);
  const html = supplementErrorsHtml(errors);
  assert.match(html, /^<details class="supplement-errors" open><summary>2 éléments de supplément écartés au chargement/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.ok(html.includes('sort « spell-&lt;b&gt; » (champ « clauses.z.effects.0.amount »)'));
  assert.ok(!/<button|close|fermer/i.test(html));
  assert.equal(supplementErrorsHtml([]), '');
  assert.equal(supplementErrorsHtml(SUPPLEMENT_ERRORS), '', 'fixture valide : aucun bandeau');
  // Montage : en tête de l'hôte, rôle alert ; aucun élément sans erreur.
  const made = [];
  const host = { ownerDocument: { createElement: tag => { const node = { tag, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } }; made.push(node); return node; } }, prepend(node) { this.first = node; } };
  assert.equal(mountSupplementErrors(host, []), null);
  const banner = mountSupplementErrors(host, errors);
  assert.equal(host.first, banner);
  assert.deepEqual([banner.id, banner.attributes.role, banner.innerHTML], ['supplement-errors', 'alert', html]);
});
