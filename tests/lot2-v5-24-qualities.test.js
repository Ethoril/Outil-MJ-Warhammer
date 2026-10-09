import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { defenseOptions } from '../js/ui/resolution-panel.js';
import registry from '../js/data/v5-quality-talent-contracts.json' with { type: 'json' };
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { getReferenceCatalogue, aggregateTalents } from '../js/core/reference-catalog.js';
import { currentV5TalentHashes } from '../js/core/v5-talents.js';
import { previewV5WeaponConditions, v5QualityMechanicalStatus } from '../js/core/v5-talent-qualities.js';
import { buildV5StoreActionInput, annotateV5StoreActionPreview, applyV5StoreAction, v5StoreActionResult } from '../js/core/v5-store-action.js';
const talents = (...names) => aggregateTalents(names.map(nom => ({ nom }))).items;
const actor = extra => ({ id: 'a', name: 'Auteur synthétique', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30, F: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], talents: [], ...extra });
const target = extra => actor({ id: 't', name: 'Cible synthétique', ...extra });
const raw = extra => ({ actor: actor(), target: target(), baseRevision: 2, round: 1, roll: 10,
  action: { id: 'club', type: 'attack', base: 40, damage: 4, qualities: ['assommante'] },
  defense: { base: 40, roll: 32, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const state = p => ({ revision: p.baseRevision, round: p.input.round, participants: [p.input.actor, p.input.target], appliedResolutionIds: [], v5ActionLedger: { appliedActions: [], quotaUsage: [] } });
const envelope = (a = actor(), t = target()) => ({ localRevision: 2, combat: { round: 1, currentActorId: 'a', order: ['a', 't'], participants: [a, t] }, extensions: { v5: { combatId: 'synthetic-combat', turnIndex: 1 } }, appliedResolutionIds: [] });
const storePreview = (e, r) => { const prepared = buildV5StoreActionInput(e, r); return annotateV5StoreActionPreview(previewResolution(prepared), prepared); };
const command = (e, r) => ({ actorId: 'a', targetId: 't', ...raw(), actor: undefined, target: undefined, ...r });

test('2.4 Assommante pins effect text, V5 edition and source; source change cannot silently retain an engine', () => {
  const c = getReferenceCatalogue(), row = registry.qualityContracts[0];
  assert.equal(row.effectHash, 'sha256:' + createHash('sha256').update(row.effect).digest('hex'));
  assert.equal(v5QualityMechanicalStatus('assommante').status, 'covered');
  for (const changed of [{ effect: row.effect + ' change' }, { edition: 'V4' }, { source: 'another book' }]) {
    const catalogue = { ...c, keywords: c.keywords.map(word => word.id === row.id ? { ...word, ...changed } : word) };
    const p = previewV5WeaponConditions({ qualities: [{ id: row.id }], hit: true, location: { key: 'HEAD' }, target: target(), damage: { finalDamage: 3 }, resolutionId: 'p', catalogue });
    assert.equal(p.proposed.length, 0); assert.equal(p.warnings.length, 1);
  }
});
test('2.4 Frappe pin detects changed public source and retains the explicit approved local override', () => {
  const c = getReferenceCatalogue();
  const changed = { ...c, talents: c.talents.map(row => row.id === 'talent-strike-to-stun' ? { ...row, description: row.description + ' changed' } : row) };
  assert.equal(currentV5TalentHashes(changed)['talent-strike-to-stun'], 'source-text-changed');
  assert.ok(registry.approvedOverrides['talent-strike-to-stun'].reference.includes('p.135'));
  assert.equal(registry.contracts[0].clauses.some(row => row.effects.some(effect => effect.op === 'suppressQuality')), false);
});
test('2.4 a real head hit at the BE threshold acquires one sourced Sonné only when applied', () => {
  const p = previewResolution(raw());
  assert.equal(p.damage.finalDamage, 3); assert.equal(p.weaponConditions.proposed.length, 1);
  assert.equal(p.input.target.states.length, 0); assert.equal(p.mechanics.find(row => row.id === 'assommante').status, 'covered');
  const result = applyResolution(p, state(p));
  assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].hp, 17);
  assert.equal(result.state.participants[1].states.filter(row => row.key === 'sonne').length, 1);
  const condition = result.state.participants[1].states.find(row => row.key === 'sonne');
  assert.equal(condition.source.kind, 'quality'); assert.equal(condition.source.keywordId, 'assommante');
  assert.equal(condition.authorId, 'a'); assert.equal(condition.targetId, 't'); assert.equal(condition.v5Timing.acquiredRound, 1);
  assert.equal(applyResolution(p, result.state).status, 'duplicate');
});
test('2.4 body hits, lost opposition, protected hits, capped real wounds and zero damage never add Pummel Sonné', () => {
  const cases = [
    raw({ roll: 15 }),
    raw({ defense: { base: 80, roll: 23, v5: { kind: 'melee' } } }),
    raw({ target: target({ armor: { head: 1, body: 0, arms: 0, legs: 0 } }) }),
    raw({ target: target({ hp: 2 }) }),
    raw({ target: target({ armor: { head: 6, body: 0, arms: 0, legs: 0 } }), action: { type: 'attack', base: 40, damage: 4, qualities: ['assommante', 'inoffensive'] } })
  ];
  for (const r of cases) assert.equal(previewResolution(r).weaponConditions.proposed.length, 0);
});
test('2.4 unknown toughness or current wounds blocks the applicable head-hit acquisition', () => {
  for (const t of [target({ caracs: { F: 30 } }), target({ hp: null })]) {
    const p = previewResolution(raw({ target: t }));
    assert.ok(p.unresolved.some(text => text.includes('Assommante')));
    assert.equal(applyResolution(p, state(p)).status, 'manual');
  }
});
test('2.4 an explicit improvised declaration adds Assommante temporarily, never equipment or source action', () => {
  const a = actor({ talents: talents('Frappe assommante') }), action = { type: 'attack', base: 40, damage: 4, qualities: [] };
  const p = previewResolution(raw({ actor: a, action, v5: { kind: 'melee', context: { weaponImprovised: true } } }));
  assert.equal(p.input.action.qualities.filter(row => row.id === 'assommante').length, 1);
  assert.deepEqual(action.qualities, []); assert.equal(a.equipment, undefined);
  assert.equal(p.weaponConditions.proposed.length, 1);
  assert.equal(previewResolution(p.input).weaponConditions.proposed.length, 1, 'replay remains idempotent');
});
test('2.4 only normalized acquisition activates; duplicate ranks and Pummel aliases never duplicate conditions', () => {
  const action = { type: 'attack', base: 40, damage: 4, qualities: [] }, v5 = { kind: 'melee', context: { weaponImprovised: true } };
  const unacquired = previewResolution(raw({ actor: actor({ talents: [{ name: 'Frappe assommante', rank: 1 }] }), action, v5 }));
  assert.equal(unacquired.input.action.qualities.length, 0);
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante', 'Frappe assommante') }), action: { ...action, qualities: ['assommante', 'Pummel'] }, v5 }));
  assert.equal(p.input.action.qualities.length, 1); assert.equal(p.targetConditionApplication.filter(row => row.key === 'sonne').length, 1);
});
test('2.4 linked published improvised equipment is authoritative; custom names require the MJ declaration', () => {
  const item = getReferenceCatalogue().items.find(row => row.id === 'weapon-armes-corps-a-corps-base-arme-improvisee');
  const weapon = { ...structuredClone(item), id: 'real-item' }, a = actor({ talents: talents('Frappe assommante'), equipment: [weapon] });
  const action = { type: 'attack', base: 40, damage: 4, extensions: { fiche: { equipmentId: weapon.id } } };
  const p = previewResolution(raw({ actor: a, action }));
  assert.ok(p.input.action.qualities.some(row => row.id === 'assommante'));
  assert.equal(a.equipment[0].keywords.some(row => row.id === 'assommante'), false);
  const custom = actor({ talents: talents('Frappe assommante'), equipment: [{ id: 'real-item', kind: 'weapon', name: 'Arme improvisée', category: 'Base', custom: true, keywords: [] }] });
  assert.ok(previewResolution(raw({ actor: custom, action })).unresolved.some(text => text.includes('weapon.improvised')));
});
test('2.4 unknown improvised status is requested only when its addition could affect this attack', () => {
  const a = actor({ talents: talents('Frappe assommante') });
  const knownPummel = previewResolution(raw({ actor: a }));
  assert.equal(knownPummel.unresolved.some(text => text.includes('weapon.improvised')), false);
  const normal = previewResolution(raw({ actor: a, action: { type: 'attack', base: 40, damage: 4, qualities: [] }, v5: { kind: 'melee', context: { weaponImprovised: false } } }));
  assert.equal(normal.unresolved.some(text => text.includes('weapon.improvised')), false);
  const skill = previewResolution(raw({ actor: a, action: { type: 'skill', base: 40 }, defense: undefined, v5: { kind: 'test' } }));
  assert.equal(skill.unresolved.some(text => text.includes('weapon.improvised')), false);
});
test('2.4 called shots use a separate -2 DR penalty and the declared location, including excess critical location', () => {
  const p = previewResolution(raw({ roll: 15, action: { type: 'attack', base: 80, damage: 4, qualities: ['assommante'] }, v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'head' } } }));
  assert.equal(p.test.details.modifiers.find(row => row.id === 'called-shot').amount, -2);
  assert.equal(p.location.key, 'HEAD'); assert.equal(p.location.calledShot, true); assert.equal(p.weaponConditions.proposed.length, 1);
  const missing = previewResolution(raw({ v5: { kind: 'melee', context: { calledShot: true } } }));
  assert.equal(applyResolution(missing, state(missing)).status, 'manual');
  const excess = previewResolution(raw({ target: target({ hp: 5 }), roll: 15, action: { type: 'attack', base: 80, damage: 40, qualities: ['assommante'] }, criticalRolls: { secondEffect: 20 }, v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'head' } } }));
  assert.equal(excess.critical.second.location.key, 'HEAD');
});
test('2.4 quality and critical Sonné are reduced together once before Momentum and durable actor quota', () => {
  const t = target({ talents: talents('Mâchoires d’acier'), extensions: { v5: { hasMomentum: true } } }), e = envelope(actor(), t);
  const r = command(e, { roll: 11, defense: { base: 40, roll: 32, v5: { kind: 'melee', choice: 'keep' } }, action: { type: 'attack', base: 90, damage: 4, qualities: ['assommante'] }, criticalRolls: { location: 2, effect: 20 }, v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'head' } } });
  const p = storePreview(e, r);
  assert.equal(p.weaponConditions.proposed.length, 1); assert.equal(p.talentUsageRequests.length, 1);
  assert.equal(p.targetConditionApplication.filter(row => row.key === 'sonne').reduce((sum, row) => sum + row.level, 0), 1);
  const result = applyV5StoreAction(p, e, current => applyResolution(p, current));
  assert.equal(result.status, 'applied'); assert.equal(result.state.v5ActionLedger.quotaUsage.length, 1);
  assert.equal(result.state.participants[1].states.filter(row => row.key === 'sonne').reduce((sum, row) => sum + row.level, 0), 1);
  assert.equal(result.state.participants[1].extensions.v5.hasMomentum, false);
  const next = v5StoreActionResult(e, result); next.localRevision++;
  const again = storePreview(next, { ...r, roll: 10, resolutionId: 'again', criticalRolls: undefined });
  assert.equal(again.talentUsageRequests.length, 0); assert.equal(again.weaponConditions.applied.length, 1);
});
test('2.4 declining the preview consumes no Mâchoires quota; a sole Pummel acquisition can be fully suppressed', () => {
  const e = envelope(actor(), target({ talents: talents('Mâchoires d’acier') })), r = command(e);
  const p = storePreview(e, r), same = storePreview(e, r);
  assert.equal(p.weaponConditions.applied.length, 0); assert.equal(same.talentUsageRequests.length, 1);
  assert.equal(e.extensions.v5.actionLedger, undefined);
  const result = applyV5StoreAction(p, e, current => applyResolution(p, current));
  assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].states.length, 0); assert.equal(result.state.v5ActionLedger.quotaUsage[0].used, 1);
});
test('2.4 Battement suppresses Pummel and attacker critical conditions while retaining the independent defensive critical', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Battement') }), roll: 22, action: { type: 'attack', base: 90, damage: 40, qualities: ['assommante'] },
    defense: { base: 30, roll: 22, v5: { kind: 'melee' } }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', actorSize: 3, targetSize: 3, talentChoices: { 'talent-beat-blade:replace-damage': true }, context: { calledShot: true, calledShotLocation: 'head' } },
    authorNextTurnEnd: { phase: 'endOfTurn', actorId: 'a', round: 2, turn: 3 } }));
  assert.equal(p.damage, null); assert.equal(p.critical, null); assert.equal(p.weaponConditions.proposed.length, 0); assert.ok(p.defenderCritical);
  const result = applyResolution(p, state(p)); assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].hp, 20); assert.ok(result.state.participants[0].states.length > 0);
});
test('2.4 a silent flag cannot simulate an ordinary combat attack or erase a called-shot penalty', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), v5: { kind: 'melee', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true, calledShot: true, calledShotLocation: 'head' } } }));
  assert.equal(p.damage, null); assert.equal(p.critical, null); assert.equal(p.test.details.modifiers.find(row => row.id === 'called-shot').amount, -2);
  assert.equal(p.test.advantage.net, 0); assert.equal(applyResolution(p, state(p)).status, 'manual');
});
test('2.4 approved silent neutralisation grants Advantage to the explicit Melee/Endurance Test and keeps outcomes manual', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: 30, roll: 78, label: 'Résistance', v5: { kind: 'test' } },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.equal(p.test.advantage.net, 1); assert.equal(p.attack, false); assert.equal(p.damage, null); assert.equal(p.unresolved.length, 0); assert.ok(p.reminders[0].includes('Inconscient'));
  const result = applyResolution(p, state(p)); assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].hp, 20); assert.equal(result.state.participants[1].states.length, 0); assert.equal(result.state.participants[0].extensions?.v5?.hasMomentum, undefined);
});

test('2.4 a changed cached public reference disables the actual preview and application, not only a hash helper', () => {
  for (const kind of ['talent', 'quality']) {
    const childSource = `
      import assert from 'node:assert/strict';
      import snapshot from './js/data/reference-snapshot.json' with { type: 'json' };
      const pack = structuredClone(snapshot);
      if ('${kind}' === 'talent') pack.talents.entries.find(row => row.id === 'talent-strike-to-stun').description += ' changed';
      else pack.equipment.keywords.find(row => row.id === 'assommante').edition = 'V4';
      globalThis.localStorage = { getItem: () => JSON.stringify({ data: pack, updatedAt: '2030-01-01T00:00:00Z' }) };
      const { previewResolution, applyResolution } = await import('./js/core/resolution.js');
      const a = { id:'a', hp:20, caracs:{E:30,F:30}, states:[], talents:[{id:'talent-strike-to-stun',rank:1,status:'resolved'}] };
      const t = { id:'t', hp:20, caracs:{E:30}, armor:{head:0,body:0,arms:0,legs:0}, states:[] };
      const preview = previewResolution({ actor:a,target:t,baseRevision:2,round:1,roll:10, action:{type:'attack',base:40,damage:4,qualities:'${kind}'==='quality'?['assommante']:[]},defense:{base:40,roll:32,v5:{kind:'melee'}},v5:{kind:'melee',context:{weaponImprovised:true}} });
      assert.equal(preview.weaponConditions.proposed.length,0);
      if ('${kind}' === 'talent') { assert.equal(preview.input.action.qualities.length,0); assert.ok(preview.talentPlans.some(plan => plan.trace.some(row => row.status === 'sourceChanged'))); }
      else { assert.equal(preview.mechanics.find(row=>row.id==='assommante').status,'manual'); assert.equal(applyResolution(preview,{revision:2,round:1,participants:[a,t]}).status,'manual'); }
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', childSource], { cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  }
});
test('2.4 an imported defensive skill identity cannot be disguised as Endurance by its editable label', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: 30, roll: 78, label: 'Résistance', extensions: { fiche: { skillId: 'skill-43_68_61_72_6d_65-base' } }, v5: { kind: 'test' } },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.ok(p.unresolved.some(row => row.includes('Neutralisation silencieuse'))); assert.equal(applyResolution(p,state(p)).status, 'manual');
});

test('2.4 opposition Endurance UI option is a Test, and successful doubles on both sides remain manual p135 outcomes', () => {
  const endurance = defenseOptions(target(), [], { includeEndurance: true }).find(row => row.value === 'E');
  assert.equal(endurance.v5.kind, 'test');
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), roll: 11,
    action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: endurance.base, roll: 22, label: endurance.statLabel, v5: endurance.v5 },
    criticalRolls: { location: 2, effect: 100 }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.equal(p.test.critical, true); assert.equal(p.defenderTest.critical, true); assert.equal(p.unresolved.length, 0);
  assert.equal(p.critical?.application, undefined); assert.equal(p.defenderCritical, null); assert.equal(p.damage, null);
  const result = applyResolution(p, state(p)); assert.equal(result.status, 'applied');
  for (const participant of result.state.participants) { assert.equal(participant.hp,20); assert.equal(participant.states.length,0); assert.equal(participant.extensions?.v5?.hasMomentum,undefined); }
});
test('2.4 a melee-misclassified p135 Endurance defense is refused and never previews an ordinary defensive critical', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), roll: 11,
    action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: 30, roll: 22, label: 'E', v5: { kind: 'melee' } }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.ok(p.unresolved.some(row=>row.includes('Neutralisation silencieuse'))); assert.equal(p.defenderCritical,null);
  const result=applyResolution(p,state(p));assert.equal(result.status,'manual');
  for (const participant of result.state.participants) { assert.equal(participant.hp,20);assert.equal(participant.states.length,0); }
});
