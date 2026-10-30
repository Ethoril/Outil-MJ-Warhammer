
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createStore } from '../js/core/store.js';
import registry from '../js/data/v5-test-talent-contracts.json' with { type: 'json' };
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { evaluateTalentContractsV2, validateTalentContractV2 } from '../js/core/talent-contract-v2.js';
import { buildCombatTest } from '../js/core/v5-combat-rules.js';
import { applicableV5TalentTestFields, buildV5TalentTestContext } from '../js/core/v5-talent-tests.js';
const skill = name => getReferenceCatalogue().skills.find(row => row.nom === name).id;
const row = (id, extra = {}) => ({ id: 'talent-' + id, name: id, status: 'resolved', rank: 1, ...extra });
const actor = (ids, extra = {}) => ({ id: 'a', hp: 12, states: [], talents: ids.map(id => typeof id === 'string' ? row(id) : id), ...extra });
const action = (skillName, extra = {}) => ({ type: 'test', label: 'Nom sans signification mécanique', base: 60,
  ...(skillName ? { extensions: { fiche: { skillId: skill(skillName) } } } : {}), ...extra });
const build = (ids, skillName, settings = {}, extra = {}) => buildCombatTest({ actor: actor(ids),
  target: actor([], { id: 'b' }), action: action(skillName), roll: 47, v5: { kind: 'test', ...settings }, ...extra });
const hashes = Object.fromEntries(Object.entries(registry.sourceDescriptions).map(([id, text]) => [id, 'sha256:' + createHash('sha256').update(text).digest('hex')]));
const evaluate = (ids, context, extra = {}) => evaluateTalentContractsV2({ contracts: registry.contracts,
  acquisitions: ids.map(id => typeof id === 'string' ? { talentId: 'talent-' + id, rank: 1 } : id),
  sourceHashes: hashes, event: 'test.beforeRoll', role: 'actor', context, ...extra });
const known = name => buildV5TalentTestContext(action(name), {});

test('2.4 35 contracts pin current public texts, all validate and retain scoped descriptions', () => {
  assert.equal(registry.contracts.length, 35);
  for (const contract of registry.contracts) {
    assert.equal(validateTalentContractV2(contract), true);
    assert.equal(contract.source.effectHash, hashes[contract.talentId]);
    assert.equal(registry.sourceDescriptions[contract.talentId], getReferenceCatalogue().talents.find(row => row.id === contract.talentId).description);
  }
  assert.equal(registry.contracts.some(row => row.talentId === 'talent-strong-minded'), false, 'once per session remains manual');
});

test('2.4 imported canonical skill wins contextual spoof and labels never supply identity', () => {
  const imported = action('Discrétion (Rurale)');
  assert.equal(buildV5TalentTestContext(imported, { context: { skillId: skill('Discrétion (Urbaine)') } }).skillId, skill('Discrétion (Rurale)'));
  assert.equal(build(['alley-cat'], 'Discrétion (Rurale)', { context: { skillId: skill('Discrétion (Urbaine)') } }).test.advantage.net, 0);
  const manual = build(['alley-cat'], null, { context: { skillId: skill('Discrétion (Urbaine)') } });
  assert.equal(manual.test.advantage.net, 1);
  const named = build(['alley-cat'], null, {}, { action: action(null, { label: 'Discrétion (Urbaine)' }) });
  assert.equal(named.test.advantage.net, 0);
  assert.ok(named.unresolved.some(text => text.includes('skillId')));
  const none = build(['alley-cat','linguistics'], null, { context: { skillId: 'none' } });
  assert.equal(none.unresolved.length, 0); assert.equal(none.test.advantage.net, 0);
  const unknown = build(['alley-cat'], null, { context: { skillId: 'unregistered' } });
  assert.ok(unknown.unresolved.length);
});

test('2.4 Alley Cat and Rover select exact urban/rural specialization, never unspecialized', () => {
  for (const [talent, yes, no] of [['alley-cat', 'Discrétion (Urbaine)', 'Discrétion (Rurale)'], ['rover', 'Discrétion (Rurale)', 'Discrétion (Urbaine)']]) {
    assert.equal(build([talent], yes).test.advantage.net, 1);
    assert.equal(build([talent], no).test.advantage.net, 0);
    assert.equal(build([talent], 'Discrétion').test.advantage.net, 0);
  }
});

test('2.4 Cat-tongued/Public Speaker require their applicable Charm purpose; other skills ignore unknown purpose', () => {
  for (const [talent, field] of [['cat-tongued', 'lying'], ['public-speaker', 'influencingGroup']]) {
    assert.equal(build([talent], 'Charme', { context: { [field]: true } }).test.advantage.net, 1);
    assert.equal(build([talent], 'Charme', { context: { [field]: false } }).unresolved.length, 0);
    assert.ok(build([talent], 'Charme').unresolved.some(text => text.includes(field)));
    assert.equal(build([talent], 'Pari').unresolved.length, 0);
  }
  assert.equal(build(['public-speaker'], 'Commandement').test.advantage.net, 0, 'narrative subsequent Commandement is no automatic advantage');
});

test('2.4 Fast Hands touches with Brawling attack, cannot boost Brawling defense, and boosts Sleight of Hand', () => {
  const p = build(['fast-hands'], 'Corps à corps (Bagarre)', { kind: 'melee', context: { touchingOpponent: true } }, {action:action('Corps à corps (Bagarre)',{type:'attack'})});
  assert.equal(p.test.advantage.net, 1);
  assert.equal(build(['fast-hands'], 'Corps à corps (Bagarre)', { kind: 'melee', context: { touchingOpponent: false } }, {action:action('Corps à corps (Bagarre)',{type:'attack'})}).test.advantage.net, 0);
  assert.ok(build(['fast-hands'], 'Corps à corps (Bagarre)', { kind: 'melee' }, {action:action('Corps à corps (Bagarre)',{type:'attack'})}).unresolved.some(text => text.includes('touchingOpponent')));
  const defending = buildCombatTest({ actor: actor([]), target: actor(['fast-hands']), action: action(null),
    defense: { ...action('Corps à corps (Bagarre)'), roll: 47, v5: { kind: 'melee', context: { touchingOpponent: true } } }, roll: 40, v5: { kind: 'melee' } }, 'defender');
  assert.equal(defending.test.advantage.net, 0);
  assert.equal(build(['fast-hands'], 'Escamotage').test.advantage.net, 1);
});

test('2.4 Linguistics communication languages benefit; Magick and unknown skills never do', () => {
  assert.equal(build(['linguistics'], 'Langue (Reikspiel)').test.advantage.net, 1);
  assert.equal(build(['linguistics'], 'Langue (Magick)').test.advantage.net, 0);
  assert.equal(build(['linguistics'], 'Langue (Magick)').unresolved.length, 0);
  assert.equal(build(['linguistics'], 'Recherche').test.advantage.net, 0);
});

test('2.4 talent names, nonresolved rows, absent/changed sources never activate', () => {
  const p = build([], 'Escalade', {}, { actor: actor([], { talents: [{ name: 'Grimpeur', rank: 1 }] }) });
  assert.equal(p.test.advantage.net, 0);
  const context = known('Escalade');
  const absent = evaluate(['scale-sheer-surface'], context, { sourceHashes: {} });
  assert.equal(absent.proposals.length, 0); assert.equal(absent.trace[0].status, 'sourceUnavailable');
  const changed = evaluate(['scale-sheer-surface'], context, { sourceHashes: { ...hashes, 'talent-scale-sheer-surface': 'changed' } });
  assert.equal(changed.proposals.length, 0); assert.equal(changed.trace[0].status, 'sourceChanged');
});

test('2.4 consolidated ranks remain one advantage; distinct applicable talents stack then cancel', () => {
  assert.equal(build([row('scale-sheer-surface', { rank: 9 })], 'Escalade').test.advantage.net, 1);
  const p = build(['cat-tongued', 'public-speaker'], 'Charme', { context: { lying: true, influencingGroup: true } });
  assert.equal(p.test.advantage.net, 2); assert.equal(p.test.advantage.slModifier, 1);
  const cancelled = build(['cat-tongued', 'public-speaker'], 'Charme', { context: { lying: true, influencingGroup: true },
    disadvantageSources: [{ id: 'one' }, { id: 'two' }] });
  assert.equal(cancelled.test.advantage.net, 0);
});

for (const [talent, name] of [
  ['dicer','Pari'],['menacing','Intimidation'],['strong-swimmer','Natation'],['dealmaker','Marchandage'],
  ['field-dressing','Guérison'],['inspiring','Commandement'],['orientation','Orientation'],
  ['gregarious','Ragot'],['bookish','Recherche'],['briber','Subornation'],['trapper','Piégeage'],
  ['super-numerate','Évaluation'],['roughrider','Chevaucher'],['crack-the-whip',"Conduite d'attelage"],
  ['pilot','Voile (Barge)'],['tunnel-fighter','Discrétion (Souterrains)']
]) test('2.4 simple acquired ' + talent + ' covers its canonical skill and excludes another', () => {
  assert.equal(build([talent], name).test.advantage.net, 1);
  assert.equal(build([talent], name === 'Pari' ? 'Escalade' : 'Pari').test.advantage.net, 0);
});

for (const [talent, name, field] of [
  ['sprinter','Athlétisme','running'],['nose-for-trouble','Intuition','potentialDanger'],['catfall','Athlétisme','falling'],['panhandle','Charme','begging'],
  ['iron-will','Calme','resistingInfluence'],['contortionist','Athlétisme','escapingBonds'],
  ['carouser','Résistance','resistingPoisonOrAlcohol']
]) test('2.4 conditional ' + talent + ' requires its declared purpose only for relevant skill', () => {
  assert.equal(build([talent], name, { context: { [field]: true } }).test.advantage.net, 1);
  assert.equal(build([talent], name, { context: { [field]: false } }).test.advantage.net, 0);
  assert.ok(build([talent], name).unresolved.some(text => text.includes(field)));
  assert.equal(build([talent], 'Pari').unresolved.length, 0);
});

test('2.4 v3 Commanding Presence offers DR or units only on a successful combat Command Test', () => {
  const ok = build(['commanding-presence'], 'Commandement', { context: { inCombat: true } }, { roll: 41 });
  assert.equal(ok.test.advantage.net, 0, 'plus d’Avantage : l’effet a été échangé avec Exaltant');
  assert.equal(ok.talentSLChoices.length, 1);
  assert.equal(build(['commanding-presence'], 'Commandement', { context: { inCombat: false } }, { roll: 41 }).talentSLChoices.length, 0);
  assert.equal(build(['commanding-presence'], 'Commandement', { context: { inCombat: true } }, { roll: 98 }).talentSLChoices.length, 0);
  assert.equal(build(['commanding-presence'], 'Pari', { context: { inCombat: true } }, { roll: 41 }).talentSLChoices.length, 0);
});

test('2.4 Resistant compares selected acquired threat; automatic session success stays manual', () => {
  const ids = [row('resistant', { specialization: 'Poison' }), row('resistant', { specialization: 'Maladie' })];
  const p = build(ids, 'Résistance', { context: { resistingThreat: true, threatId: 'Poison' } });
  assert.equal(p.test.advantage.net, 1);
  assert.equal(build(ids, 'Résistance', { context: { resistingThreat: false } }).unresolved.length, 0);
  assert.ok(build(ids, 'Résistance', { context: { resistingThreat: true } }).unresolved.some(text => text.includes('threatId')));
  assert.equal(build(ids, 'Résistance', { context: { resistingThreat: true, threatId: 'Magie' } }).test.advantage.net, 0);
  const failed = build(ids, 'Résistance', { context: { resistingThreat: true, threatId: 'Poison' }, choice: 'keep' }, { roll: 98 });
  assert.equal(failed.test.options[0].result.success, false);
});

test('2.4 Master of Disguise requires explicit SL/unit choice on success and may choose a LOWER units value', () => {
  const missing = build(['master-of-disguise'], 'Divertissement (Interprétation)', {}, { roll: 41 });
  assert.ok(missing.unresolved.some(text => text.includes('choices.')));
  assert.deepEqual(missing.talentSLChoices.map(({ key, sl, units }) => ({ key, sl, units })), [{ key: 'talent-master-of-disguise:sl:keep', sl: 2, units: 1 }]);
  assert.equal(build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': false } }, { roll: 41 }).test.options[0].result.sl, 2);
  const units = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll: 41 });
  assert.equal(units.test.options[0].result.sl, 1); assert.equal(units.unresolved.length, 0);
  assert.equal(units.test.initialRoll, 41);
});

test('2.4 failed SL replacement never asks a choice and other specialization never qualifies', () => {
  const failed = build(['master-of-disguise'], 'Divertissement (Interprétation)', {}, { roll: 98 });
  assert.equal(failed.talentSLChoices.length, 0); assert.equal(failed.unresolved.length, 0);
  assert.equal(build(['master-of-disguise'], 'Divertissement (Comédie)').talentSLChoices.length, 0);
  assert.throws(() => build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': 'auto' } }), /Choix explicite/);
});

test('2.4 inversion options own independent units from final roll; unchosen successful option never blocks chosen failure', () => {
  const settings = { advantageSources: [{ id: 'synthetic' }], choice: 'keep' };
  const kept = build(['master-of-disguise'], 'Divertissement (Interprétation)', settings, { roll: 74 });
  assert.equal(kept.unresolved.length, 0);
  assert.equal(kept.test.options[0].result.success, false);
  assert.equal(kept.talentSLChoices[0].optionId, 'reverse');
  assert.equal(kept.talentSLChoices[0].units, 7);
  const reversed = build(['master-of-disguise'], 'Divertissement (Interprétation)', { ...settings, choice: 'reverse', talentChoices: { 'talent-master-of-disguise:sl:reverse': true } }, { roll: 74 });
  assert.equal(reversed.test.options[1].result.sl, 7);
  assert.equal(reversed.test.options[1].result.roll, 47);
  assert.equal(reversed.test.initialRoll, 74);
});

test('2.4 both successful keep/reverse options require independent choices on selected branch', () => {
  const settings = { advantageSources: [{ id: 'synthetic' }], talentChoices: { 'talent-master-of-disguise:sl:keep': false }, choice: 'reverse' };
  const p = build(['master-of-disguise'], 'Divertissement (Interprétation)', settings, { roll: 53 });
  assert.equal(p.talentSLChoices.length, 2);
  assert.ok(p.unresolved.some(text => text.includes('choices.')));
  const resolved = build(['master-of-disguise'], 'Divertissement (Interprétation)', { ...settings, talentChoices: { ...settings.talentChoices, 'talent-master-of-disguise:sl:reverse': true } }, { roll: 53 });
  assert.equal(resolved.unresolved.length, 0); assert.equal(resolved.test.options[1].result.sl, 5);
});

test('2.4 literal units zero keeps marginal success, explicit DR choice and independent critical', () => {
  const zero = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll: 20 });
  assert.equal(zero.test.options[0].result.sl, 0); assert.equal(zero.test.options[0].result.success, true);
  assert.equal(zero.test.options[0].result.zeroOutcome, 'marginalSuccess');
  assert.equal(zero.talentSLChoices[0].units, 0); assert.equal(zero.talentSLChoices[0].sl, 4);
  const dr = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': false } }, { roll: 20 });
  assert.equal(dr.test.options[0].result.sl, 4); assert.equal(dr.test.options[0].result.success, true);
  assert.equal(zero.test.options[0].result.details.talentSLReplacement.from, 4);
  const critical = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll: 11 });
  assert.equal(critical.test.options[0].result.critical, true); assert.equal(critical.test.options[0].result.sl, 1);
});

test('2.4 Old Salt and Numismatics share explicit units operation with their distinct conditions', () => {
  const old = build(['old-salt'], 'Voile (Barge)', { context: { onOcean: true }, talentChoices: { 'talent-old-salt:sl:keep': true } });
  assert.equal(old.test.options[0].result.sl, 7);
  assert.equal(build(['old-salt'], 'Voile (Barge)', { context: { onOcean: false } }).talentSLChoices.length, 0);
  assert.ok(build(['old-salt'], 'Voile (Barge)').unresolved.some(text => text.includes('onOcean')));
  const coins = build(['numismatics','super-numerate'], 'Évaluation', { choice: 'keep', context: { estimatingObject: true }, talentChoices: { 'talent-numismatics:sl:keep': true } });
  assert.equal(coins.test.advantage.net, 1); assert.equal(coins.test.options[0].result.sl, 7);
  assert.equal(build(['numismatics'], 'Évaluation', { context: { estimatingObject: false } }).talentSLChoices.length, 0);
});

test('2.4 defender owns independent canonical skill and successful unit choice', () => {
  const make = settings => buildCombatTest({ actor: actor(['master-of-disguise']), target: actor(['master-of-disguise']),
    action: action('Pari'), defense: { ...action('Divertissement (Interprétation)'), roll: 47, v5: { kind: 'test', ...settings } }, roll: 42, v5: { kind: 'test' } }, 'defender');
  assert.ok(make({}).unresolved.some(text => text.includes('choices.')));
  const p = make({ talentChoices: { 'talent-master-of-disguise:sl:keep': true } });
  assert.equal(p.test.options[0].result.sl, 7); assert.equal(p.unresolved.length, 0);
});

test('2.4 UI descriptors require only applicable acquired contexts and canonical threat options', () => {
  assert.deepEqual(applicableV5TalentTestFields(actor(['public-speaker']), skill('Pari')), []);
  assert.equal(applicableV5TalentTestFields(actor(['public-speaker']), skill('Charme'))[0].field, 'influencingGroup');
  const fields = applicableV5TalentTestFields(actor([row('resistant', { specialization: 'Poison' })]), skill('Résistance'));
  assert.deepEqual(fields.find(row => row.field === 'threatId').options, [{ value: 'Poison', label: 'Poison' }]);
});

test('2.4 declarative action-before qualities require unique operation keys and called-shot modifier applies once', () => {
  const prototype = { ...structuredClone(registry.contracts[0]), clauses: [{ id: 'quality', event: 'action.before', role: 'attacker',
    when: [{ field: 'weapon.improvised', op: 'eq', value: true }], effects: [{ op: 'addQuality', key: 'assommante', stackGroup: 'synthetic-quality', stack: 'unique' }] }] };
  assert.equal(validateTalentContractV2(prototype), true);
  assert.equal(evaluateTalentContractsV2({ contracts: [prototype], acquisitions: [{ talentId: prototype.talentId }], sourceHashes: hashes,
    event: 'action.before', role: 'attacker', context: { weapon: { improvised: true } } }).proposals[0].key, 'assommante');
  delete prototype.clauses[0].effects[0].key;
  assert.throws(() => validateTalentContractV2(prototype), /Cible/);
  const normal = build([], 'Corps à corps (Base)', { kind: 'melee', context: { calledShot: true } });
  assert.equal(normal.test.options[0].result.sl, 0);
  const ignored = build([], 'Corps à corps (Base)', { kind: 'melee', context: { calledShot: true }, calledShotPenaltyIgnored: true });
  assert.equal(ignored.test.options[0].result.sl, 2);
});

test('2.4 literal units never turn failed or automatically failed tests into success', () => {
  for (const roll of [80, 97, 100]) {
    const p = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll });
    assert.equal(p.test.options[0].result.success, false);
    assert.equal(p.talentSLChoices.length, 0);
    assert.equal(p.test.options[0].result.details.talentSLReplacement, undefined);
    assert.equal(p.unresolved.length, 0);
    if (roll === 100) {
      assert.equal(p.test.options[0].result.fumble, true);
      assert.equal(p.test.options[0].result.sl, -5);
    }
  }
});

test('2.4 literal units use final forced inverse and preserve each option success', () => {
  const forced = build(['master-of-disguise'], 'Divertissement (Interprétation)', {
    disadvantageSources: [{ id: 'synthetic-unfavourable' }], choice: 'reverse',
    talentChoices: { 'talent-master-of-disguise:sl:reverse': true } }, { roll: 2 });
  assert.equal(forced.test.initialRoll, 2);
  assert.equal(forced.test.forcedInversion, true);
  assert.equal(forced.test.options[0].id, 'reverse');
  assert.equal(forced.test.options[0].result.roll, 20);
  assert.equal(forced.test.options[0].result.sl, 0);
  assert.equal(forced.test.options[0].result.success, true);
  assert.equal(forced.test.options[0].result.zeroOutcome, 'marginalSuccess');
  const failKeep = build(['master-of-disguise'], 'Divertissement (Interprétation)', {
    advantageSources: [{ id: 'synthetic-favourable' }], choice: 'keep',
    talentChoices: { 'talent-master-of-disguise:sl:keep': true, 'talent-master-of-disguise:sl:reverse': true } }, { roll: 70 });
  assert.equal(failKeep.test.options[0].result.success, false);
  assert.equal(failKeep.test.options[0].result.sl, -1);
  assert.equal(failKeep.test.options[1].result.success, true);
  assert.equal(failKeep.test.options[1].result.sl, 7);
  assert.equal(failKeep.unresolved.length, 0);
});

test('2.4 defender zero choice preserves its own success and source independent from initiator', () => {
  const p = buildCombatTest({ actor: actor(['master-of-disguise']), target: actor(['master-of-disguise']),
    action: action('Divertissement (Interprétation)'), roll: 47,
    defense: { ...action('Divertissement (Interprétation)'), roll: 20,
      v5: { kind: 'test', talentChoices: { 'talent-master-of-disguise:sl:keep': true } } },
    v5: { kind: 'test', talentChoices: { 'talent-master-of-disguise:sl:keep': false } } }, 'defender');
  assert.equal(p.test.options[0].result.sl, 0);
  assert.equal(p.test.options[0].result.success, true);
  assert.equal(p.test.options[0].result.zeroOutcome, 'marginalSuccess');
  assert.equal(p.unresolved.length, 0);
});

test('2.4 literal zero choice remains successful in durable result, reload, undo and redo', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence });
  await store.ready;
  const source = actor(['master-of-disguise'], { name: 'Acteur synthétique', kind: 'PJ', camp: 'pj',
    zone: 'active', maxHp: 12, initiative: 60, caracs: { Soc: 60 }, extensions: { v5: { hasMomentum: false } } });
  await store.loadFromJSON({ schemaVersion: 3, extensions: { v5: { combatId: 'literal-units-combat', turnIndex: 1 } },
    reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [source] }, diceLines: [], log: [] });
  const participantsBefore = JSON.parse(JSON.stringify(store.listParticipants()));
  const p = store.previewResolution({ resolutionId: 'literal-zero-result', actorId: 'a',
    action: action('Divertissement (Interprétation)'), roll: 20,
    v5: { kind: 'test', talentChoices: { 'talent-master-of-disguise:sl:keep': true } } });
  assert.equal(p.sl, 0); assert.equal(p.success, true); assert.equal(p.test.zeroOutcome, 'marginalSuccess');
  assert.equal(p.unresolved.length, 0);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  assert.ok(JSON.parse(store.getFullJSON()).appliedResolutionIds.includes('literal-zero-result'));
  const detail = store.getLog()[0].detail;
  assert.equal(detail.sl, 0); assert.equal(detail.test.success, true); assert.equal(detail.test.zeroOutcome, 'marginalSuccess');
  assert.equal(detail.input.v5.talentChoices['talent-master-of-disguise:sl:keep'], true);
  const reloaded = createStore({ persistence });
  await reloaded.ready;
  assert.deepEqual(reloaded.getLog()[0].detail, detail);
  await reloaded.undo();
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.listParticipants())), participantsBefore);
  assert.equal((JSON.parse(reloaded.getFullJSON()).appliedResolutionIds || []).includes('literal-zero-result'), false);
  assert.deepEqual(reloaded.getLog()[0].detail, detail, 'journal is intentionally independent from command undo');
  await reloaded.redo();
  assert.ok(JSON.parse(reloaded.getFullJSON()).appliedResolutionIds.includes('literal-zero-result'));
  assert.equal(reloaded.getLog()[0].detail.sl, 0);
  assert.equal(reloaded.getLog()[0].detail.test.success, true);
  assert.equal(reloaded.getLog()[0].detail.test.zeroOutcome, 'marginalSuccess');
});

test('v3 : les cases de contexte affichées suivent les contrats (Sprinter, Flair, Présence imposante, Exaltant)', () => {
  const fields = (id, name) => applicableV5TalentTestFields(actor([id]), skill(name)).map(item => [item.field, item.label]);
  assert.deepEqual(fields('sprinter', 'Athlétisme'), [['running', 'Le Test sert à courir']]);
  assert.deepEqual(fields('nose-for-trouble', 'Intuition'), [['potentialDanger', 'Le Test d’Intuition est lié à un danger potentiel']]);
  assert.deepEqual(fields('commanding-presence', 'Commandement'), [['inCombat', 'Le Test de Commandement est effectué en combat']]);
  assert.deepEqual(fields('inspiring', 'Commandement'), []);
  assert.deepEqual(fields('sprinter', 'Pari'), []);
});
