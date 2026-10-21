import test from 'node:test';
import assert from 'node:assert/strict';
import { previewDivineExecution, applyDivineExecution, expireDivineEffects } from '../js/core/v5-divine-engine.js';
import { getAllDivineContracts, getDivineContract, previewStoreDivine } from '../js/core/v5-divine-store.js';
import { calculateEffectiveMagicAP } from '../js/core/v5-magic-effects.js';
import divineRegistry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

const contract = divineRegistry.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
const source = contract.source;
const makeActor = ({ sin = 0, pray = 50, talents = null } = {}) => ({
  id: 'priest-1', name: 'Priest', zone: 'active', skills: [{ id: 'skill-pray', name: 'Pray', status: 'resolved', total: pray }],
  caracs: { Soc: pray }, talents: talents || [{ id: contract.requiredTalent.catalogueTalentId, status: 'resolved', specialization: 'Myrmidia', rank: 1 }],
  prayers: [{ nom: contract.catalogueName }],
  extensions: { v5: { divine: { sin } } }
});
const stateFor = actor => ({ combat: { currentActorId: actor.id, participants: [structuredClone(actor)] }, extensions: { v5: { divineExecutions: [] } } });
const wrathResult = { resultId: 'wrath:1-5', source: { document: 'Livre de base V5 EN v2.pdf', pdfPage: 218 } };
const targetsFor = actor => [structuredClone(actor)];
const factsFor = actor => ({ targets: { [actor.id]: { withinRange: true, ally: true } } });

// The test is independent of the application code: it supplies only explicit rolls and sourced choices.
test('Contrôle indépendant — le score Pray et Sin proviennent de la fiche, les overrides du client sont ignorés', () => {
  const actor = makeActor({ sin: 0, pray: 50 });
  const normal = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 59, facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint });
  const forged = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 59, facts: factsFor(actor), skillScore: 99, sinPoints: 9, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(normal.preview.skillScore, 50);
  assert.equal(forged.preview.skillScore, 50);
  assert.equal(normal.preview.sinAtTest, 0);
  assert.equal(forged.preview.sinAtTest, 0);
  assert.equal(forged.preview.wrath.triggered, false, 'un champ libre sinPoints ne doit pas déclencher le Courroux');
});

test('Contrôle indépendant — Pray utilise Sociabilité (Soc), avec son ajustement courant, jamais FM', () => {
  const actor = makeActor({ sin: 0, pray: 50 });
  actor.skills[0].carac = 'soc';
  actor.extensions.v5.baseCaracs = { Soc: 50 };
  actor.caracs = { Soc: 65, FM: 99 };
  const result = previewDivineExecution(actor, contract, targetsFor(actor), {
    canSpeak: true, roll: 64, facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint
  });
  assert.equal(result.preview.skillScore, 65, 'Pray 50 + 15 d’ajustement actuel de Sociabilité');
  assert.equal(result.preview.prayer.success, true);
  assert.match(divineRegistry.commonPrayerRules.find(row => row.id === 'prayer-skill').text, /Prière \(Soc\)/);
  assert.doesNotMatch(divineRegistry.commonPrayerRules.find(row => row.id === 'prayer-skill').text, /FM/);
});

test('Contrôle indépendant — une prière brute issue de la fiche-sync est admise, un statut explicitement non résolu est refusé', () => {
  const actor = makeActor({ sin: 0, pray: 60 });
  assert.equal(Object.hasOwn(actor.prayers[0], 'status'), false, 'la fiche-sync fournit les noms bruts sans statut');
  const accepted = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 45, facts: factsFor(actor), expiry: { phase: 'endOfRound', round: 6 }, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.ok(accepted.ready, accepted.error);
  actor.prayers[0].status = 'unresolved';
  const unresolved = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 45, facts: factsFor(actor), expiry: { phase: 'endOfRound', round: 6 }, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(unresolved.ready, false);
  assert.equal(unresolved.status, 'blocked');
});

test('Contrôle indépendant — rang ou spécialisation absents ne créent pas Invocation de Myrmidia', () => {
  const base = makeActor({ sin: 0, pray: 60 });
  const withoutRank = structuredClone(base);withoutRank.talents[0].rank = 0;
  const unranked = previewDivineExecution(withoutRank, contract, targetsFor(withoutRank), { canSpeak: true, roll: 45, facts: factsFor(withoutRank), sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(unranked.status, 'blocked');
  const wrongCult = structuredClone(base);wrongCult.talents[0].specialization = 'Sigmar';
  const crossCult = previewDivineExecution(wrongCult, contract, targetsFor(wrongCult), { canSpeak: true, roll: 45, facts: factsFor(wrongCult), sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(crossCult.status, 'blocked');
});

test('Contrôle indépendant — unités égales au Sin déclenchent le Courroux même avec un Pray réussi', () => {
  const actor = makeActor({ sin: 3, pray: 80 });
  const result = previewDivineExecution(actor, contract, targetsFor(actor), {
    canSpeak: true, roll: 23, wrathRoll: 10, wrathConsequences: 'MJ a traité le résultat', facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint, expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(result.ready, true, result.error);
  assert.equal(result.preview.prayer.success, true);
  assert.equal(result.preview.unit, 3);
  assert.equal(result.preview.wrath.triggered, true);
  assert.equal(result.preview.wrath.reason, 'sin-threshold');
  assert.equal(result.preview.wrath.modifiedRoll, 40, 'le jet de Courroux ajoute 10 par Sin courant');
  assert.equal(result.preview.wrath.outcome.id, 'wrath:36-40');
  assert.equal(result.preview.wrath.sinAfter, 2, 'le Sin baisse d’un seul point après résolution du Courroux');
});

test('Contrôle indépendant — une prière avec Courroux en attente ne se commit pas et ne change aucun champ', () => {
  const actor = makeActor({ sin: 4, pray: 80 });
  const state = stateFor(actor);
  const before = structuredClone(state);
  const result = applyDivineExecution(state, contract, { actorId: actor.id, targetIds: [actor.id], facts: factsFor(actor), actorId: actor.id, canSpeak: true, roll: 23, executionId: 'pending-wrath', sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'needs-wrath-resolution');
  assert.deepEqual(result.state, before);
  assert.equal(result.receipt, null);
});

test('Contrôle indépendant — le résultat du Courroux résolu est journalisé, décrémente Sin une fois et résiste au double-clic', () => {
  const actor = makeActor({ sin: 4, pray: 80 });
  const state = stateFor(actor);
  const input = { actorId: actor.id, targetIds: [actor.id], canSpeak: true, roll: 23, wrathRoll: 10, wrathConsequences: 'MJ a traité le résultat', facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint, expiry: { phase: 'endOfRound', round: 8 }, executionId: 'wrath-commit-1' };
  const applied = applyDivineExecution(state, contract, input);
  assert.equal(applied.ready, true, applied.error);
  assert.equal(applied.state.combat.participants[0].extensions.v5.divine.sin, 3);
  assert.equal(applied.receipt.wrathResolution.result.id, 'wrath:46-50');
  const repeated = applyDivineExecution(applied.state, contract, input);
  assert.equal(repeated.status, 'duplicate');
  assert.equal(repeated.state.combat.participants[0].extensions.v5.divine.sin, 3);
});

test('Contrôle indépendant — le Bouclier V5 augmente vraiment les PA effectives après application', () => {
  const actor = makeActor({ sin: 0, pray: 80 });
  const state = stateFor(actor);
  const applied = applyDivineExecution(state, contract, { actorId: actor.id, canSpeak: true, roll: 23,
    executionId: 'shield-ap-hook', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 } });
  assert.equal(applied.ready, true, applied.error);
  const layers = applied.state.combat.participants[0].extensions.v5.divineEffects;
  const effective = calculateEffectiveMagicAP({ head: 0, body: 0, arms: 0, legs: 0 }, layers);
  assert.equal(effective.head, 1);
  assert.equal(effective.body, 1);
  assert.equal(effective.leftArm, 1);
  assert.equal(effective.rightArm, 1);
  assert.equal(effective.leftLeg, 1);
  assert.equal(effective.rightLeg, 1);
});

test('Contrôle indépendant — reçu de source contradictoire bloque avant toute résolution', () => {
  const stale = structuredClone(contract);
  stale.sourceReceipt.sourceTextHash = 'sha256:other-source';
  const result = previewDivineExecution(makeActor(), stale, [], { canSpeak: true, roll: 23, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(result.ready, false);
  assert.match(result.error, /source|reçu/i);
});

test('Contrôle indépendant — un reçu forgé en tandem ne suffit pas à autoriser une source non V5', () => {
  const forged = structuredClone(contract);
  forged.source = { document: 'Miracles.csv (FR V4)', pdfPage: 0, printedPages: 'V4', section: 'import', sourceTextHash: 'sha256:invented' };
  forged.sourceReceipt = structuredClone(forged.source);
  forged.status = 'implemented';
  forged.sourceFingerprint = 'forged-fingerprint';
  forged.effects = [{ type: 'condition', key: 'aveugle', level: 1 }];
  const result = previewDivineExecution(makeActor(), forged, [], { canSpeak: true, roll: 23, sourceFingerprint: forged.sourceFingerprint });
  assert.equal(result.ready, false, 'un objet contrat auto-signé depuis le CSV V4 ne prouve pas la source EN V5');
  assert.equal(result.status, 'blocked');
});


test('Contrôle indépendant — une prière temporaire bloque le doublon jusqu’à son échéance', () => {
  const actor = makeActor({ sin: 0, pray: 80 });
  const state = stateFor(actor);
  const first = applyDivineExecution(state, contract, {
    actorId: actor.id, canSpeak: true, roll: 23, executionId: 'shield-first', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(first.ready, true, first.error);
  assert.ok(first.state.combat.participants[0].extensions.v5.divineEffects.some(layer => layer.prayerId === contract.id));
  const duplicatePrayer = applyDivineExecution(first.state, contract, {
    actorId: actor.id, canSpeak: true, roll: 24, executionId: 'shield-second', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    targetIds: [actor.id], facts: factsFor(actor), expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(duplicatePrayer.ready, false);
  assert.equal(duplicatePrayer.status, 'blocked');
  assert.deepEqual(duplicatePrayer.state, first.state);
  const expired = expireDivineEffects(first.state.combat.participants[0], {
    phase: 'endOfRound', round: 8
  });
  assert.equal(expired.status, 'expired');
  const afterExpiry = structuredClone(first.state);
  afterExpiry.combat.participants[0] = expired.participant;
  const retried = applyDivineExecution(afterExpiry, contract, {
    actorId: actor.id, canSpeak: true, roll: 24, executionId: 'shield-after-expiry', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(retried.ready, true, retried.error);
});





test('Contrôle indépendant — six miracles Myrmidia utilisent les effets V5 EN, jamais les effets CSV V4', () => {
  const rows = getAllDivineContracts();
  const byEnglish = new Map(rows.filter(row => row.type === 'miracle').map(row => [row.canonicalName, row]));
  const fury = byEnglish.get("Fury's Call");
  const shield = byEnglish.get('Shield of Myrmidia');
  const inspiring = byEnglish.get('Inspiring');
  const spear = byEnglish.get('Spear of Myrmidia');
  const eagle = byEnglish.get("Eagle's Eye");
  const sun = byEnglish.get('Blazing Sun');
  for (const row of [fury, shield, inspiring, spear, eagle, sun]) {
    assert.ok(row, 'les six entrées Myrmidia V5 doivent être présentes');
    assert.equal(row.source.edition, 'V5 EN');
    assert.equal(row.source.printedPage, 224);
    assert.equal(row.labels.sourceStatus, 'V5 base source checked');
  }
  assert.match(fury.labels.effect, /Frénésie/);
  assert.equal(shield.params.range.kind, 'characteristic', 'la portée est la Sociabilité entière, pas le Bonus de Sociabilité');
  assert.equal(shield.params.range.characteristic, 'Soc');
  assert.equal(shield.params.range.unit, 'yards');
  assert.equal(shield.params.targets.characteristic, 'Soc');
  assert.equal(shield.params.targets.kind, 'characteristic-bonus');
  const shieldActor = makeActor({ sin: 0, pray: 80 });
  const shieldPreview = previewDivineExecution(shieldActor, shield, targetsFor(shieldActor), {
    canSpeak: true, roll: 23, facts: factsFor(shieldActor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(shieldPreview.preview.resolvedParams.range.value, 80, 'Soc 80 donne 80 yards de portée');
  assert.equal(shieldPreview.preview.resolvedParams.targets.value, 8, 'Soc 80 donne 8 alliés admissibles');
  assert.match(shield.labels.effect, /\+1 PA à toutes les Localisations/i);
  if (shield.status === 'implemented') assert.ok(shield.effects.some(effect => effect.type === 'armor-bonus' && effect.value === 1 && effect.locations === 'all'));
  assert.match(inspiring.labels.effect, /Drillé/);
  assert.match(spear.labels.effect, /Dévastatrice/i);
  assert.doesNotMatch(spear.labels.effect, /Percutante/);
  assert.match(eagle.labels.effect, /Perception 55.*Sens aiguisé.*Vol 80/i);
  assert.equal(sun.params.range.kind, 'special');
  assert.equal(sun.params.targets.kind, 'special');
  assert.deepEqual(sun.effects[0].targetRules, ['non-Myrmidian', 'looking-at-priest']);
  assert.deepEqual(sun.effects[0].perSuccessLevels, { every: 2, add: 1 });
  if (sun.status === 'implemented') assert.ok(sun.effects.some(effect => effect.type === 'condition' && effect.key === 'Blinded'));
});
test('Contrôle — neuf sources Up in Arms raccordées au module Myrmidia, plus aucun contrat bloqué', () => {
  const rows = getAllDivineContracts();
  const supplemental = rows.filter(row => row.type === 'miracle' && row.source.document === 'Up in arms.pdf');
  assert.equal(supplemental.length, 9);
  assert.equal(rows.some(row => row.status === 'blocked'), false);
  for (const row of supplemental) {
    assert.ok(['assisted', 'manual'].includes(row.status), row.name);
    assert.equal(row.source.edition, 'V4 EN', row.name);
    assert.equal(row.source.printedPage, 79, row.name);
    assert.equal(row.needsInput.some(item => item === 'v5-adaptation'), false, row.name);
    assert.ok(row.catalogueEntry, row.name);
  }
});

test('Contrôle indépendant — la preuve de la compétence Pray cite sa page imprimée exacte', () => {
  const prayerSkill = divineRegistry.commonPrayerRules.find(row => row.id === 'prayer-skill');
  assert.ok(prayerSkill);
  assert.equal(prayerSkill.source.document, 'Livre de base V5 EN v2.pdf');
  assert.equal(prayerSkill.source.printedPage, 113, 'Pray (Fel) est imprimé p.113; p.129 est Darkness and Tests');
});

test('Contrôle indépendant — la table de Courroux respecte les lignes V5 exactes et les bornes', () => {
  const rows = divineRegistry.wrathTable;
  const expected = [
    [1,5,'Visions sacrées',/Calme Accessible \(\+2 DR\)/],
    [11,15,'Leçons divines',/-1 DR à Prière/],
    [26,30,'Vous ne comprenez pas',/-1 DR aux compétences/],
    [56,60,'Je ne vous aiderai pas',/-1 DR à une compétence/],
    [71,75,'Que sacrifierez-vous ?',/Difficile \(-1 DR\)/],
    [81,87,'Purifiez la chair',/Difficile \(-2 DR\)/],
    [88,88,'Interférence démoniaque',/2d10 yards/],
    [151,null,'Rendez des comptes',/Point de Destin/]
  ];
  for (const [min,max,label,reminder] of expected) {
    const row = rows.find(item => item.min === min && item.max === max);
    assert.ok(row, `ligne V5 ${min}-${max} absente`);
    assert.equal(row.label, label);
    assert.match(row.reminder, reminder);
    assert.equal(row.source.document, 'Livre de base V5 EN v2.pdf');
    assert.equal(row.source.printedPage, min <= 100 ? 218 : 219);
  }
  assert.doesNotMatch(rows.find(row => row.min === 1).reminder, /Résistance \+20/);
  assert.doesNotMatch(rows.find(row => row.min === 71).reminder, /-20/);
  assert.doesNotMatch(rows.find(row => row.min === 81).reminder, /-20/);
  assert.deepEqual([100,101,150,151].map(value => rows.find(row => value >= row.min && (row.max === null || value <= row.max))?.id),
    ['wrath:96-100','wrath:101-105','wrath:146-150','wrath:151-plus']);
});

test('Contrôle indépendant — adapter Store choisit la ligne à partir du d100 + 10 par Péché, pas du champ résultat client', () => {
  const shield = getAllDivineContracts().find(row => row.canonicalName === 'Shield of Myrmidia');
  const actor = makeActor({ sin: 1, pray: 80 });
  const state = stateFor(actor);
  const run = (prayRoll, wrathRoll, sin, note='MJ confirme le traitement') => {
    const current = structuredClone(state);
    current.combat.participants[0].extensions.v5.divine.sin = sin;
    return previewStoreDivine(current, shield.id, { actorId: actor.id, targetIds: [actor.id], facts: factsFor(actor), canSpeak: true, roll: prayRoll, wrathRoll,
      wrathConsequences: note, wrathResult: { resultId: 'forged:151-plus' }, expiry: { phase: 'endOfRound', round: 1 } });
  };
  for (const [prayRoll,wrathRoll,sin,expected] of [[99,90,1,'wrath:96-100'],[99,91,1,'wrath:101-105'],[99,100,5,'wrath:146-150'],[99,91,6,'wrath:151-plus'],[99,78,1,'wrath:88-88'],[99,77,1,'wrath:81-87']]) {
    const result = run(prayRoll,wrathRoll,sin);
    assert.ok(result.preview?.wrath?.triggered, `Courroux manquant pour ${wrathRoll}+10x${sin}: ${result.error}`);
    assert.equal(result.wrathTableResult?.id, expected);
    assert.equal(result.input.wrathResult.resultId, expected, 'le résultat imposé par le formulaire est ignoré');
  }
  const noNote = run(99,77,1,'');
  assert.equal(noNote.status, 'needs-wrath-resolution');
  assert.equal(noNote.ready, false);
  assert.equal(noNote.wrathTableResult.id, 'wrath:81-87');
});
