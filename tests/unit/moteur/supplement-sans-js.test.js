// U8 lot L7 · contenu de supplément sans JS (docs/specs/moteur-effets-unifie/spec.md, CA8 à CA10).
// Un talent, une prière et un sort fictifs, déclarés seulement en JSON (tests/fixtures/supplements/supplement-fictif.json), se
// comportent comme leurs équivalents du livre :
//  - le talent est une copie déclarative de Nageur émérite (talent-strong-swimmer) : mêmes propositions, même évaluateur ;
//  - le sort (+3 « carac:e ») se cumule avec Dur comme le roc (+2 « carac:e ») par meilleur bonus (R3 V5 p. 235) ;
//  - la prière (+2 Résistance) se somme avec un sort (MJ 05/11 Q2) et entre en meilleur bonus avec Rage de Rhya (MJ 06/11 Q10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSupplements, supplementLayer, mergeTalentRegistry, BOOK_RESERVED_IDS, SUPPLEMENTS, SUPPLEMENT_ERRORS } from '../../../js/core/supplement-loader.js';
import { V5_TALENT_CONTRACTS, evaluateV5TalentsIn, talentSourceHashes, currentV5TalentHashes } from '../../../js/core/v5-talents.js';
import { validateTalentContractV2 } from '../../../js/core/talent-contract-v2.js';
import { magicTestModifiers } from '../../../js/core/v5-magic-talents.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { NUMERIC_OPS, UNIQUE_OPS, OP_PHASES, STACK_POLICIES, CLAUSE_EVENTS } from '../../../js/core/effect-engine.js';
import { renderBricks, BRICKS_PATH } from '../../../tools/build-effect-bricks.mjs';
import bookTalents from '../../../js/data/v5-test-talent-contracts.json' with { type: 'json' };

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const FIXTURE = read('../../fixtures/supplements/supplement-fictif.json');
const sha = text => 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
const load = data => loadSupplements(data, { reservedIds: BOOK_RESERVED_IDS });
const loaded = load(FIXTURE);
const TALENT = 'talent-supplement-fictif-nageur', BOOK_TALENT = 'talent-strong-swimmer';
const SPELL = 'spell-supplement-fictif-peau-de-corail', PRAYER = 'divine:supplement-fictif:benediction-des-flots';
const RAGE = 'divine:miracle:rhya:rhya-s-rage';

// Registre de l'application + supplément fictif, assemblé comme dans v5-talents.js.
const bookRegistry = { contracts: [...V5_TALENT_CONTRACTS], sourceDescriptions: { ...bookTalents.sourceDescriptions } };
const registry = mergeTalentRegistry(bookRegistry, loaded);
const hashes = { ...currentV5TalentHashes(), ...talentSourceHashes(registry, loaded.talentHashes) };
const swimmer = talentId => ({ id: 'nageur', talents: [{ id: talentId, status: 'resolved', rank: 1 }] });
const swimContext = { skillId: 'skill-4e_61_74_61_74_69_6f_6e-base', skillGroupId: 'skill-group-4e_61_74_61_74_69_6f_6e', pursuit: true };
const strip = plan => plan.proposals.map(({ origins, stackGroup, ...rest }) => rest);

const actor = (spellEffects = [], divineEffects = []) => ({ id: 'cible', extensions: { v5: { spellEffects, divineEffects } } });
const bookSpellLayer = (name, id) => { const contract = getSpellContract(name); return { id, spellId: contract.id, spellName: contract.name, testModifiers: { ...contract.effects.testModifiers } }; };
const rageLayer = id => { const contract = getAllDivineContracts().find(row => row.id === RAGE); return { id, prayerId: RAGE, testModifiers: { ...contract.effects.find(row => row.type === 'test-modifier').modifiers } }; };
const resistance = target => magicTestModifiers(target, 'Résistance', { carac: 'E' }).magic.reduce((sum, row) => sum + row.amount, 0);

test('CA8 · le supplément fictif se charge sans erreur : un talent, une prière, un sort', () => {
  assert.deepEqual(loaded.errors, []);
  assert.deepEqual(loaded.talents.map(row => row.talentId), [TALENT]);
  assert.deepEqual(loaded.prayers.map(row => row.id), [PRAYER]);
  assert.deepEqual(loaded.spells.map(row => row.id), [SPELL]);
  // Le contrat compilé a exactement la forme des contrats v2 du livre.
  assert.equal(validateTalentContractV2(structuredClone(loaded.talents[0])), true);
});

test('CA8 · talent fictif : mêmes propositions que le talent du livre qu’il recopie, par le même évaluateur', () => {
  for (const [role, context] of [['actor', swimContext], ['actor', { ...swimContext, pursuit: false }], ['defender', swimContext]]) {
    const options = { event: 'test.beforeRoll', role, context };
    const fromJson = evaluateV5TalentsIn(registry, hashes, swimmer(TALENT), options);
    const fromBook = evaluateV5TalentsIn(registry, hashes, swimmer(BOOK_TALENT), options);
    assert.equal(fromJson.ready, fromBook.ready);
    assert.deepEqual(strip(fromJson), strip(fromBook));
    assert.ok(fromJson.trace.length && fromJson.trace.every(row => row.talentId === TALENT && row.status !== 'sourceUnavailable'));
  }
  const plan = evaluateV5TalentsIn(registry, hashes, swimmer(TALENT), { event: 'test.beforeRoll', role: 'actor', context: swimContext });
  assert.deepEqual(plan.proposals.map(row => [row.op, row.amount ?? null]).sort(), [['grantAdvantage', null], ['modifySL', 2]]);
});

test('CA8 · talent dont l’empreinte ne correspond pas au texte : forme acceptée au chargement, écart détecté par le contrôle d’empreinte du fichier réel', () => {
  const data = structuredClone(FIXTURE);
  data.supplements[0].talents[0].source.effectHash = sha('autre texte');
  const other = load(data);
  assert.deepEqual(other.errors, []); // la forme est valide ; c'est le test des empreintes (ci-dessous) qui garde le fichier réel
  assert.notEqual(other.talents[0].source.effectHash, sha(other.talentDescriptions[TALENT]));
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
  supplement.talents.push({ ...structuredClone(supplement.talents[0]), id: 'talent-supplement-cout', clauses: [{ ...structuredClone(supplement.talents[0].clauses[0]), costs: [] }] });
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
  expect('talent-supplement-cout', 'clauses.advantage-actor.costs', /non couvert/);
  expect(BOOK_TALENT, 'id', /déjà pris/);
  expect('spell-supplement-montant', 'clauses.z.effects.0.amount', /entier/);
  expect('spell-supplement-degats', 'clauses.d.event', /non couvert/);
  expect('divine:supplement:condition', 'clauses.c.when', /condition/);
  expect('divine:supplement:inconnu', 'couleur', /non couvert/);
  assert.equal(result.errors.length, 8);
  // Les éléments valides restent chargés.
  assert.deepEqual([result.talents.length, result.spells.length, result.prayers.length], [1, 1, 1]);
});

test('CA9 · registre illisible ou supplément mal formé : signalé, jamais d’exception', () => {
  assert.match(load(null).errors[0].message, /registre illisible/);
  const result = load({ schemaVersion: 1, supplements: [{ id: 'x', title: 'X', version: '1', edition: 'V4' }] });
  assert.equal(result.errors[0].field, 'edition');
  assert.match(result.errors[0].message, /^Supplément « x » \(champ « edition »\) : édition « V5 » requise$/);
});

test('fichier réel des suppléments : chargé sans erreur, talents au registre, empreintes conformes à leur texte', () => {
  assert.deepEqual(SUPPLEMENT_ERRORS, []);
  const ids = new Set(V5_TALENT_CONTRACTS.map(row => row.talentId));
  for (const contract of SUPPLEMENTS.talents) {
    assert.ok(ids.has(contract.talentId));
    assert.equal(contract.source.effectHash, sha(SUPPLEMENTS.talentDescriptions[contract.talentId]), `empreinte de ${contract.talentId}`);
    assert.equal(validateTalentContractV2(structuredClone(contract)), true);
  }
});

test('CA10 · briques.md est à jour et liste toutes les opérations, événements et politiques du validateur', () => {
  const content = readFileSync(BRICKS_PATH, 'utf8');
  assert.equal(content, renderBricks(), 'régénérer : node tools/build-effect-bricks.mjs');
  for (const op of [...NUMERIC_OPS, ...UNIQUE_OPS, ...Object.keys(OP_PHASES.fixed)]) assert.ok(content.includes('`' + op + '`'), op);
  for (const event of CLAUSE_EVENTS) assert.ok(content.includes('`' + event + '`'), event);
  for (const policy of Object.keys(STACK_POLICIES)) assert.ok(content.includes('`' + policy + '`'), policy);
});
