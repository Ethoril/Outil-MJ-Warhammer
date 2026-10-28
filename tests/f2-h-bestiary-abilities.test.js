import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decorateBestiaryProfileAction, planBestiaryProfileAbilities, planBestiaryProfileAbility } from '../js/core/creature-abilities.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { normalizeResolutionInput } from '../js/core/resolution.js';
import { previewResolution } from '../js/core/resolution.js';
import { createStore } from '../js/core/store.js';
import { bestiaryProfileStateImmunity } from '../js/core/creature-abilities.js';
import { deriveHitMorphology, resolveCreatureHitLocation } from '../js/core/v5-hit-morphology.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = ['L11', 'L18', 'L22', 'L23', 'L24', 'L25'].flatMap(book =>
  JSON.parse(fs.readFileSync(path.join(root, 'js/data/bestiary', `${book}.json`), 'utf8')).profiles
);
const p = profileId => buildParticipantFromBestiary(profileId, { library, idFactory: () => `test-${profileId}` });

test('F2-H weapon qualities only belong to the two named stag profiles', () => {
  const taal = planBestiaryProfileAbility(p('E0-P-001'), 'taal-woods');
  const kurnous = planBestiaryProfileAbility(p('E0-P-002'), 'kurnous-woods');
  assert.deepEqual(taal.effects[0].addQualities, ['Empaleuse', 'Perforante']);
  assert.deepEqual(kurnous.effects[0].addQualities, ['Rapide', 'Empaleuse', 'Perforante']);
  assert.equal(planBestiaryProfileAbility(p('E0-P-002'), 'taal-woods').available, false);
  assert.equal(planBestiaryProfileAbility(p('E0-P-001'), 'kurnous-woods').available, false);
  const actor = p('E0-P-002');
  const decorated = decorateBestiaryProfileAction(actor, { name: 'Antlers', qualities: [] });
  assert.deepEqual(decorated.qualities, ['Rapide', 'Empaleuse', 'Perforante']);
  const resolvedAction = normalizeResolutionInput({ actor, action: actor.actions.find(action => action.name === 'Antlers'), roll: 25 }).action;
  assert.deepEqual(resolvedAction.qualities.map(row => row.id), ['rapide', 'empaleuse', 'perforante']);
  assert.deepEqual(decorateBestiaryProfileAction(p('E0-P-001'), { name: 'Bite', qualities: [] }).qualities, []);
});

test('Arachnarok web poison requires a web hit and the Entangled state', () => {
  const actor = p('E0-P-004');
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true }).effects, []);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true }).unresolved.length, 1);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true, entangled: true }).effects, [
    { state: 'Empoisonné', trigger: 'toile de l’Arachnarok ayant Enchevêtré la cible' }
  ]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-744'), 'arachnarok-venom-webs', { webHit: true, entangled: true }).available, false);
});

test('Flying Death Skull only proposes reversion at zero Wounds; ordinary profiles are excluded', () => {
  const skull = p('E0-P-565');
  assert.deepEqual(planBestiaryProfileAbility(skull, 'flying-death-skull-zero-wounds', { wounds: 1 }).effects, []);
  assert.equal(planBestiaryProfileAbility(skull, 'flying-death-skull-zero-wounds', { wounds: 0 }).effects[0].requiresGmConfirmation, true);
  assert.equal(planBestiaryProfileAbility(p('E0-P-566'), 'flying-death-skull-zero-wounds', { wounds: 0 }).available, false);
});

test('F2-H attacks and states are tied to their exact creature profile', () => {
  const spiderProfile = p('E0-P-744');
  const spider = planBestiaryProfileAbility(spiderProfile, 'cliff-spider-lasso');
  assert.ok(spiderProfile.actions.some(action => action.extensions.v5.specialProfileAbility === 'cliff-spider-lasso'));
  assert.match(spider.reminders.join(' '), /40 yards/);
  assert.ok(spiderProfile.traits.some(trait => /Venom \(Challenging\)/i.test(trait)));
  assert.deepEqual(spider.effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-004'), 'cliff-spider-lasso').available, false);

  const cat = planBestiaryProfileAbility(p('E0-P-792'), 'great-cat-deathblow');
  assert.deepEqual(cat.effects, [{ addTrait: 'Coup mortel', ignoresSize: true }]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-807'), 'great-cat-deathblow').available, false);
  assert.equal(decorateBestiaryProfileAction(p('E0-P-792'), { name: 'Claw', qualities: [] }).extensions.v5.deathblow, true);

  const spit = planBestiaryProfileAbility(p('E0-P-807'), 'farmyard-beast-spit');
  assert.ok(p('E0-P-807').actions.some(action => action.extensions.v5.specialProfileAbility === 'farmyard-beast-spit'));
  assert.deepEqual(spit.effects, [{ attack: 'Crachat', rangeYards: 3, test: 'CT', onHitTest: 'Résistance +0', onFailure: 'Empoisonné' }]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-792'), 'farmyard-beast-spit').available, false);
});

test('Gargantuan ship rules stay a reminder and the living target needs to be grappled for discharge', () => {
  const actor = p('E0-P-910');
  const plan = planBestiaryProfileAbility(actor, 'gargantuan-electric-discharge', { targetGrappled: true });
  assert.equal(plan.effects[0].damage, 10);
  assert.equal(plan.effects[0].ignoresArmour, 'métal non magique');
  assert.match(planBestiaryProfileAbilities(actor).flatMap(item => item.reminders).join(' '), /navire/);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'gargantuan-electric-discharge').effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-916'), 'gargantuan-electric-discharge', { targetGrappled: true }).available, false);
});

test('Sea Elemental immersion, fire immunity, and casting use only its profile', () => {
  const actor = p('E0-P-909');
  assert.ok(actor.actions.some(action => action.extensions.v5.specialProfileAbility === 'sea-elemental-immersion'));
  assert.deepEqual(planBestiaryProfileAbility(actor, 'sea-elemental-immersion', { entangled: false }).effects, []);
  const immersed = planBestiaryProfileAbility(actor, 'sea-elemental-immersion', { entangled: true });
  assert.equal(immersed.effects[0].effect, 'suffocation');
  assert.equal(immersed.effects[0].grappleMustBeMaintained, false);
  assert.equal(planBestiaryProfileAbility(actor, 'sea-elemental-immersion', { entangled: true, escapeTestSL: 1 }).effects[1].escaped, true);
  assert.equal(planBestiaryProfileAbility(actor, 'sea-elemental-fire-immunity').effects[0].immuneToState, 'Enflammé');
  assert.equal(bestiaryProfileStateImmunity(actor, 'enflamme'), true);
  assert.equal(planBestiaryProfileAbility(actor, 'sea-elemental-strength-casting').effects[0].castingCharacteristic, 'F');
  assert.equal(bestiaryProfileStateImmunity(p('E0-P-910'), 'enflamme'), false);
});

test('Gargantuan and Black Leviathan resolve non-ship clauses while ship clauses remain reminders', () => {
  const gargantuan = p('E0-P-910');
  const shock = planBestiaryProfileAbility(gargantuan, 'gargantuan-electric-discharge', {
    targetGrappled: true, targetTookWounds: true, targetEnduranceSuccess: false, selfEnduranceSuccess: false
  });
  assert.equal(shock.effects.find(effect => effect.damage)?.damage, 10);
  assert.ok(shock.effects.some(effect => effect.state === 'sonne'));
  assert.ok(shock.effects.some(effect => effect.state === 'extenue'));
  const fatigued = planBestiaryProfileAbility(gargantuan, 'gargantuan-electric-discharge', { targetGrappled: true, fatigued: true, selfEnduranceSuccess: true });
  assert.equal(fatigued.effects.find(effect => effect.damage)?.damage, 6);
  assert.match(planBestiaryProfileAbility(gargantuan, 'gargantuan-ship-reminder').reminders[0], /non modélisée/);

  const leviathan = p('E0-P-916');
  assert.equal(planBestiaryProfileAbility(leviathan, 'black-leviathan-fire', { fireSize: 'torch' }).effects[0].mayBeScared, false);
  assert.equal(planBestiaryProfileAbility(leviathan, 'black-leviathan-fire', { fireSize: 'bonfire' }).effects[0].mayBeScared, true);
  assert.match(planBestiaryProfileAbility(leviathan, 'black-leviathan-ship-reminder').reminders[0], /non modélisée/);
  assert.equal(planBestiaryProfileAbility(gargantuan, 'black-leviathan-fire', { fireSize: 'bonfire' }).available, false);
});

test('Cliff Spider profile resolves appendage hits to legs', () => {
  const spider = p('E0-P-744');
  assert.equal(deriveHitMorphology(spider), 'spider');
  assert.deepEqual(resolveCreatureHitLocation({ roll: 40, morphology: deriveHitMorphology(spider), baseLocation: { key: 'ARM', name: 'Bras gauche' } }), {
    key: 'LEG', name: 'Patte gauche', side: 'left'
  });
});

test('F2-H resolution proposes the Farmyard Beast poison only after a failed resistance test', () => {
  const actor = { ...p('E0-P-807'), id: 'farmyard', zone: 'active', hp: 12, maxHp: 12 };
  const target = { id: 'target', name: 'Cible', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'farmyard-beast-spit');
  const preview = previewResolution({ resolutionId: 'f2h-farmyard', baseRevision: 0, actor, target, action, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: { f2h: { farmyardResistance: 'fail' } } } });
  assert.equal(preview.hit, true);
  assert.ok(preview.targetConditionApplication.some(row => row.key === 'empoisonne' && row.source?.ability === 'farmyard-beast-spit'));
  assert.deepEqual(preview.unresolved, []);
});

test('Tiger Claws links the actual Taggees Brawling source skill and rejects a missing link', () => {
  const actor = { ...p('E0-P-872'), id: 'taggees' };
  const action = actor.actions.find(row => row.name === 'Tiger Claws');
  const normalized = normalizeResolutionInput({ actor, action, roll: 20 });
  assert.equal(normalized.action.base, 61);
  assert.equal(normalized.action.attr, 'CC');
  assert.equal(normalized.action.extensions.fiche.skillId, actor.skills.find(row => row.sourceName === 'Melee (Brawling)').id);
  assert.throws(() => normalizeResolutionInput({ actor: { ...actor, skills: actor.skills.filter(row => row.sourceName !== 'Melee (Brawling)') }, action, roll: 20 }), { code: 'SKILL_LINK_REQUIRED' });
});

test('Store application persists Farmyard Beast poison on a failed resistance test', async () => {
  const actor = { ...p('E0-P-807'), id: 'farmyard-store', camp: 'ennemi', zone: 'active', hp: 12, maxHp: 12 };
  const target = { id: 'target-store', name: 'Cible', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(actor); await store.addParticipant(target);
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'farmyard-beast-spit');
  const preview = store.previewResolution({ resolutionId: 'f2h-farmyard-store', actorId: actor.id, targetId: target.id, action, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: { f2h: { farmyardResistance: 'fail' } } } });
  assert.equal(preview.hit, true, JSON.stringify(preview.unresolved));
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason || JSON.stringify({ choiceRequired: preview.choiceRequired, choices: preview.choices, unresolved: preview.unresolved }));
  assert.ok(store.listParticipants().find(row => row.id === target.id).states.some(row => row.key === 'empoisonne'));
});

test('Gargantuan discharge applies wound and Endurance outcomes and spends its Momentum', async () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-store', camp: 'ennemi', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const target = { id: 'target-garg', name: 'Agrippé', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(actor); await store.addParticipant(target);
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const preview = store.previewResolution({ resolutionId: 'f2h-gargantuan-discharge', actorId: actor.id, targetId: target.id, action, roll: 23,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: false, selfEnduranceSuccess: false } } } });
  assert.ok(preview.damage?.finalDamage > 0, JSON.stringify(preview.unresolved));
  assert.equal(preview.momentum.find(row => row.participantId === actor.id)?.after, false);
  assert.deepEqual(preview.unresolved, []);
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', JSON.stringify({ reason: applied.reason, choiceRequired: preview.choiceRequired, unresolved: preview.unresolved, critical: preview.critical, protection: preview.protection, mechanicalWarnings: preview.mechanicalWarnings }));
  const afterTarget = store.listParticipants().find(row => row.id === target.id);
  const afterActor = store.listParticipants().find(row => row.id === actor.id);
  assert.equal(afterTarget.hp, target.hp - preview.damage.finalDamage);
  assert.ok(afterTarget.states.some(row => row.key === 'sonne'));
  assert.ok(afterActor.states.some(row => row.key === 'extenue'));
  assert.equal(afterActor.extensions.v5.hasMomentum, false);
});

test('Merwyrm bite, Black Leviathan, Wulfrik and Gravelord remain profile-scoped', () => {
  assert.deepEqual(planBestiaryProfileAbility(p('E0-P-913'), 'merwyrm-fanged-maw-venom').effects, [
    { attack: 'Fanged Maw', addTrait: 'Venin (Difficile)' }
  ]);
  assert.deepEqual(decorateBestiaryProfileAction(p('E0-P-913'), { name: 'Fanged Maw', qualities: [] }).qualities[0], { id: 'venin', name: 'Venin', parameter: 'Difficile' });
  assert.equal(planBestiaryProfileAbility(p('E0-P-057'), 'merwyrm-fanged-maw-venom').available, false);
  assert.ok(planBestiaryProfileAbility(p('E0-P-916'), 'black-leviathan-ship-reminder').reminders[0].includes('non modélisée'));
  assert.deepEqual(planBestiaryProfileAbility({ name: 'Hans Grüber' }, 'gravelord-variants').effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-921'), 'wulfrik-head-taker', { critical: true }).effects[0].chooseCriticalTable, 'Head Critical Wounds');
  assert.equal(planBestiaryProfileAbility(p('E0-P-921'), 'wulfrik-champion-slayer', { singleCombatLeader: true }).effects[0].momentum, 1);
  assert.equal(planBestiaryProfileAbility(p('E0-P-916'), 'wulfrik-head-taker', { critical: true }).available, false);
});

test('Gargantuan discharge ignores non-magical metal armour only (L25 p.143)', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-armour', camp: 'ennemi', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const discharge = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const teeth = actor.actions.find(row => row.name === 'Razor-sharp Teeth');
  const piece = (id, category) => ({ id, name: id, kind: 'armour', category, ap: 3, layer: 'rigid', locations: ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'], keywords: [] });
  const run = (equipment, action) => previewResolution({ resolutionId: `garg-armour-${equipment[0].id}-${action.name}`, baseRevision: 0, actor,
    target: { id: 'grappled', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 0 }, equipment, states: [] },
    action, roll: 23, defense: { base: 20, roll: 95, v5: { kind: 'test' } },
    v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: true, selfEnduranceSuccess: true } } } });
  const mail = run([piece('mail', 'Mailles')], discharge);
  assert.ok(mail.protection.ignored.some(row => row.item.id === 'mail'), 'mail is ignored by the discharge');
  const magic = run([piece('magic', 'Magique et Unique')], discharge);
  assert.ok(!magic.protection.ignored.some(row => row.item.id === 'magic'), 'magical armour still protects');
  assert.equal(magic.damage.finalDamage, mail.damage.finalDamage - 3);
  const bite = run([piece('mail', 'Mailles')], teeth);
  assert.ok(!bite.protection.ignored.some(row => row.item.id === 'mail'), 'ordinary bites keep the armour');
});

test('Sea Elemental immersion and Cliff Spider lasso entangle with the creature Strength (L25 p.142, MJ 28/10)', () => {
  const target = { id: 'victim', name: 'Victime', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] };
  const sea = { ...p('E0-P-909'), id: 'sea', zone: 'active' };
  const immersion = sea.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'sea-elemental-immersion');
  const immersed = previewResolution({ resolutionId: 'sea-strength', baseRevision: 0, actor: sea, target, action: immersion, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  assert.equal(immersed.targetConditionApplication.find(row => row.key === 'enchevetre')?.strength, 59);
  const spider = { ...p('E0-P-744'), id: 'spider', zone: 'active' };
  const lasso = spider.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'cliff-spider-lasso');
  const caught = previewResolution({ resolutionId: 'spider-strength', baseRevision: 0, actor: spider, target, action: lasso, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: { f2h: { cliffSpiderFailureSL: 2 } } } });
  const entangled = caught.targetConditionApplication.find(row => row.key === 'enchevetre');
  assert.equal(entangled?.strength, 45);
  assert.equal(entangled?.level, 7, 'one Entangled per SL of the failed Dodge (20 vs 95)');
});

test('Immersion, silk lasso and spit inflict no Wounds nor Critical, the Gargantuan bite still does', () => {
  const target = { id: 'victim', name: 'Victime', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] };
  const run = (profileId, key, kind, f2h = {}) => {
    const actor = { ...p(profileId), id: `actor-${profileId}`, zone: 'active' };
    const action = key ? actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === key) : actor.actions.find(row => row.name === 'Razor-sharp Teeth');
    return previewResolution({ resolutionId: `nodmg-${profileId}-${key}`, baseRevision: 0, actor, target, action, roll: 10,
      defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind, context: { f2h } } });
  };
  for (const [profileId, key, kind, f2h] of [['E0-P-909', 'sea-elemental-immersion', 'melee'], ['E0-P-744', 'cliff-spider-lasso', 'ranged', { cliffSpiderFailureSL: 1 }], ['E0-P-807', 'farmyard-beast-spit', 'ranged', { farmyardResistance: 'fail' }]]) {
    const preview = run(profileId, key, kind, f2h);
    assert.equal(preview.hit, true, key);
    assert.equal(preview.damage, null, `${key} inflicts no Wounds`);
    assert.ok(!preview.critical, `${key} triggers no Critical`);
    assert.ok(preview.targetConditionApplication.length > 0, `${key} still applies its state`);
  }
  assert.ok(run('E0-P-910', null, 'melee').damage?.finalDamage > 0, 'ordinary bite keeps its damage');
});

test('Gargantuan discharge keeps its Momentum cost even when the Gargantuan would win the opposition', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-cost', camp: 'ennemi', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const preview = previewResolution({ resolutionId: 'garg-cost', baseRevision: 0, actor,
    target: { id: 'held', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    action, roll: 23, defense: { base: 20, roll: 95, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: true, selfEnduranceSuccess: true } } } });
  const trace = preview.momentum.find(row => row.participantId === actor.id);
  assert.equal(trace.after, false, JSON.stringify(trace.details));
  assert.ok(!trace.details.some(row => row.effect === 'gain'));
});

test('An Exhausted Gargantuan discharges for 6 Damage (L25 p.143)', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-tired', zone: 'active', hp: 80, maxHp: 80, states: [{ id: 'tired', key: 'extenue', name: 'Exténué', level: 1 }], extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  assert.equal(normalizeResolutionInput({ actor, action, roll: 23 }).action.damage, 6);
});

test('Sea Elemental casts and channels with Strength, its BF standing for BI and BFM (MJ 28/10)', async () => {
  const { resolveCastingSkill } = await import('../js/core/v5-magic-casting.js');
  const { resolveChannellingSkill } = await import('../js/core/v5-magic-channelling.js');
  const sea = p('E0-P-909');
  const bf = Math.floor(sea.caracs.F / 10);
  const cast = resolveCastingSkill(sea);
  assert.equal(cast.carac, 'F');
  assert.equal(cast.bi, bf);
  assert.equal(cast.bfm, bf);
  const channel = resolveChannellingSkill(sea);
  assert.equal(channel.carac, 'F');
  assert.equal(channel.bfm, bf);
  const other = p('E0-P-910');
  assert.equal(resolveCastingSkill(other).bi, Math.floor((other.caracs.Int || 0) / 10));
});

test('Wulfrik Champion Slayer gains Momentum once per duel, re-armed by the GM (MJ 28/10)', async () => {
  const built = p('E0-P-921');
  const actor = { ...built, talents: [], id: 'wulfrik', camp: 'ennemi', zone: 'active', extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: false } } };
  const target = { id: 'champion', name: 'Champion', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(actor); await store.addParticipant(target);
  const attack = actor.actions.find(row => row.type === 'attack');
  const gains = id => (store.previewResolution({ resolutionId: id, actorId: actor.id, targetId: target.id, action: attack, roll: 15,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { singleCombatLeader: true, ...(id === 'rearm' ? { championSlayerRearm: true } : {}) } } } }));
  const first = gains('first');
  assert.ok(first.momentum.find(row => row.participantId === actor.id).details.some(row => row.eventId.endsWith(':profileMomentumGain')));
  const firstApplied = await store.applyResolution(first);
  assert.equal(firstApplied.status, 'applied', JSON.stringify({ reason: firstApplied.reason, unresolved: first.unresolved, choice: first.choiceRequired, hit: first.hit }));
  assert.deepEqual(store.listParticipants().find(row => row.id === actor.id).extensions.v5.championSlayerDuels, [target.id]);
  const second = gains('second');
  assert.ok(!second.momentum.find(row => row.participantId === actor.id).details.some(row => row.eventId.endsWith(':profileMomentumGain')));
  assert.ok(second.reminders.some(text => /déjà gagné/.test(text)));
  assert.ok(gains('rearm').momentum.find(row => row.participantId === actor.id).details.some(row => row.eventId.endsWith(':profileMomentumGain')));
});

test('Great cat Deathblow triggers on every successful melee hit, whatever the Size (L23 p.87)', () => {
  const cat = { ...p('E0-P-792'), id: 'great-cat', zone: 'active' };
  const claw = cat.actions.find(row => row.type === 'attack' && row.attr === 'CC');
  const run = (actor, action, roll) => previewResolution({ resolutionId: `deathblow-${actor.id}-${roll}`, baseRevision: 0, actor, action, roll,
    target: { id: 'prey', name: 'Proie', zone: 'active', hp: 60, maxHp: 60, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  const hit = run(cat, claw, 10);
  assert.equal(hit.hit, true);
  assert.equal(hit.deathblow?.maxChain, Math.floor(cat.caracs.CC / 10));
  assert.ok(hit.reminders.some(text => /Frappe mortelle/.test(text)));
  assert.equal(run(cat, claw, 99).deathblow, null, 'a miss never triggers it');
  const other = { ...p('E0-P-807'), id: 'farm', zone: 'active' };
  assert.equal(run(other, other.actions.find(row => row.type === 'attack' && row.attr === 'CC'), 10).deathblow, null, 'other profiles do not have it');
});

test('Suffocation costs 1 Wound per Round, then Unconscious, then a death proposal after TB Rounds (V5 p.169, MJ 28/10)', async () => {
  const { advanceV5Effects } = await import('../js/core/v5-effects.js');
  const victim = { id: 'drowning', name: 'Noyé', hp: 2, maxHp: 10, caracs: { E: 30 }, states: [{ id: 'suff', key: 'suffocation', name: 'Suffocation', level: 1 }], extensions: { v5: {} } };
  const r1 = advanceV5Effects(victim, { phase: 'endOfRound', round: 1 });
  assert.equal(r1.participant.hp, 1);
  const r2 = advanceV5Effects(r1.participant, { phase: 'endOfRound', round: 2 });
  assert.equal(r2.participant.hp, 0);
  assert.ok(r2.participant.states.some(row => row.key === 'inconscient'));
  assert.equal(r2.participant.extensions.v5.suffocationDeathDueRound, 5);
  assert.ok(!r2.death);
  const r4 = advanceV5Effects(r2.participant, { phase: 'endOfRound', round: 4 });
  assert.ok(!r4.death, 'not before TB Rounds');
  const r5 = advanceV5Effects(r4.participant, { phase: 'endOfRound', round: 5 });
  assert.equal(r5.death, true, 'death is proposed, the GM confirms');
  const breathing = advanceV5Effects({ ...victim, states: [] }, { phase: 'endOfRound', round: 1 });
  assert.equal(breathing.participant.hp, 2);
});

test('Store application of the Immersion keeps Suffocation and the Strength 59 Entangled on the victim', async () => {
  const sea = { ...p('E0-P-909'), id: 'sea-store', camp: 'ennemi', zone: 'active' };
  const target = { id: 'swimmer', name: 'Nageur', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(sea); await store.addParticipant(target);
  const action = sea.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'sea-elemental-immersion');
  const preview = store.previewResolution({ resolutionId: 'immersion-store', actorId: sea.id, targetId: target.id, action, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', JSON.stringify({ reason: applied.reason, unresolved: preview.unresolved }));
  const after = store.listParticipants().find(row => row.id === target.id);
  assert.equal(after.hp, 20);
  assert.ok(after.states.some(row => row.key === 'suffocation'));
  assert.equal(after.states.find(row => row.key === 'enchevetre')?.strength, 59);
});

test('Gravelord options follow Hans Grüber whatever the Unicode form of his name (L18 p.113)', () => {
  const nfd = planBestiaryProfileAbility({ name: 'Hans Gru\u0308ber' }, 'gravelord-variants');
  assert.notEqual(nfd.available, false);
  assert.match(nfd.reminders.join(' '), /Fantôme.*Banshee.*Instable.*Volonté/);
  assert.equal(planBestiaryProfileAbilities({ name: 'Hans Gru\u0308ber' }).length, 1);
  assert.equal(planBestiaryProfileAbility({ name: 'Wizard' }, 'gravelord-variants').available, false);
});

test('The discharge plan follows only the discharge action, never the Gargantuan bite', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-bite', zone: 'active', extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const teeth = actor.actions.find(row => row.name === 'Razor-sharp Teeth');
  const preview = previewResolution({ resolutionId: 'garg-bite-plan', baseRevision: 0, actor, action: teeth, roll: 10,
    target: { id: 'held', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { targetGrappled: true } } } });
  assert.ok(!preview.unresolved.some(text => /Décharge/.test(text)), JSON.stringify(preview.unresolved));
  assert.ok(!preview.profileAbilityPlans.some(plan => plan.effects.some(effect => effect.damage)));
  const discharge = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const shock = previewResolution({ resolutionId: 'garg-discharge-plan', baseRevision: 0, actor, action: discharge, roll: 10,
    target: { id: 'held', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { targetGrappled: true } } } });
  const prompts = shock.unresolved.filter(text => /Endurance Moyenne/.test(text));
  assert.equal(prompts.length, 1, JSON.stringify(shock.unresolved));
});

test('Sea Elemental Ablaze immunity is a central condition immunity, whatever the source', async () => {
  const { acquireV5Conditions } = await import('../js/core/v5-effects.js');
  const sea = p('E0-P-909');
  assert.deepEqual(sea.extensions.v5.immunities.conditions, ['enflamme']);
  const receipt = acquireV5Conditions(sea, [{ name: 'Enflammé', level: 2, source: { kind: 'spell' } }], { resolutionId: 'fireball', round: 1 });
  assert.ok(receipt.reminders.some(text => /Immunité/.test(text)), JSON.stringify(receipt).slice(0, 300));
  assert.equal(receipt.acquiredInstances, 0);
  assert.equal(p('E0-P-910').extensions.v5.immunities, undefined);
});

test('Silk lasso needs no attack roll: only the target Dodge decides (L22 p.73)', () => {
  const spider = { ...p('E0-P-744'), id: 'spider-dodge', zone: 'active' };
  const lasso = spider.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'cliff-spider-lasso');
  const target = { id: 'dodger', name: 'Esquiveur', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] };
  const run = (roll, dodgeRoll) => previewResolution({ resolutionId: `lasso-${roll}-${dodgeRoll}`, baseRevision: 0, actor: spider, target, action: lasso, roll,
    defense: { base: 40, roll: dodgeRoll, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: {} } });
  const missedShot = run(99, 41);
  assert.equal(missedShot.targetConditionApplication.find(row => row.key === 'enchevetre')?.level, 1, 'failed Dodge by 0 SL still gives one Entangled, even if the CT roll failed');
  const dodged = run(10, 20);
  assert.ok(!dodged.targetConditionApplication.some(row => row.key === 'enchevetre'));
  assert.ok(dodged.reminders.some(text => /Esquive réussie/.test(text)));
});

test('A Flying Death Skull brought to 0 Wounds proposes its reversion to an ordinary skull (L18 p.107)', () => {
  const skull = { ...p('E0-P-565'), id: 'skull', zone: 'active', hp: 3, maxHp: 3 };
  const actor = { id: 'hero', name: 'Héros', zone: 'active', caracs: { CC: 60, F: 40 }, skills: [], equipment: [], states: [] };
  const run = damage => previewResolution({ resolutionId: 'skull-' + damage, baseRevision: 0, actor, target: skull,
    action: { type: 'attack', name: 'Épée', base: 60, damage, qualities: [] }, roll: 10,
    defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  const killed = run(20).profileAbilityPlans.find(plan => plan.key === 'flying-death-skull-zero-wounds');
  assert.equal(killed.effects[0]?.transformation, 'crâne ordinaire');
  const scratched = run(-20).profileAbilityPlans.find(plan => plan.key === 'flying-death-skull-zero-wounds');
  assert.deepEqual(scratched.effects, []);
});

test('Cutting the silk ends only the lasso Entangled, after a confirmed slashing blow over 5 Damage (L22 p.73)', async () => {
  const { recoverV5Condition } = await import('../js/core/v5-effects.js');
  const { recoveryMethodsFor } = await import('../js/ui/v5-effect-dialog.js');
  const lasso = { id: 'silk', key: 'enchevetre', name: 'Enchevêtré', level: 3, strength: 45, source: { kind: 'bestiary-profile', ability: 'cliff-spider-lasso' } };
  const net = { id: 'net', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'weapon' } };
  const victim = { id: 'caught', name: 'Pris', hp: 10, maxHp: 10, caracs: { E: 30, F: 30 }, states: [lasso, net], extensions: { v5: {} } };
  assert.ok(recoveryMethodsFor(lasso).some(([id]) => id === 'cut-silk'));
  assert.ok(!recoveryMethodsFor(net).some(([id]) => id === 'cut-silk'));
  const asked = recoverV5Condition(victim, 'silk', { method: 'cut-silk' });
  assert.ok(asked.needsInput.some(row => row.field === 'silkCut'));
  const cut = recoverV5Condition(victim, 'silk', { method: 'cut-silk', silkCut: true });
  assert.deepEqual(cut.participant.states.map(row => row.id), ['net']);
});
