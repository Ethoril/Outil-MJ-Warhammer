import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { initialV5ReloadState } from '../js/core/v5-reloading.js';

const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); },
  async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const weapon = { id: 'repeat-1', kind: 'weapon', name: 'Arme à répétition de test', category: 'Poudre noire', damage: '+4',
  range: '50', keywords: [{ id: 'a-repetition', parameter: '3' }, { id: 'recharge', parameter: '3' }], extensions: {} };
const actor = { id: 'a', name: 'A', camp: 'pj', kind: 'PJ', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 60, F: 30, E: 30 }, skills: [], states: [], equipment: [structuredClone(weapon)], armor: {},
  extensions: { v5: { hasMomentum: false } } };
const target = { ...structuredClone(actor), id: 't', name: 'T', camp: 'foe', equipment: [] };
async function fixture() {
  const persistence = memory(), store = createStore({ storage: null, persistence }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a', 't'], participants: [structuredClone(actor), structuredClone(target)] }, log: [], diceLines: [] });
  return { store, persistence };
}
const equipped = store => store.listParticipants().find(row => row.id === 'a').equipment[0];

test('F2-D Store reload — start, progress, Undo, Redo, and persistence reload preserve weapon state', async () => {
  const { store, persistence } = await fixture();
  const item = equipped(store); item.extensions.v5 = { reloadState: { revision: 1, repeaterRating: 3, shotsRemaining: 2,
    reloadSuccesses: 3, accumulatedSuccesses: 0, reloading: false, requiresReload: false } };
  await store.updateParticipant('a', { equipment: [item] });
  let plan = store.previewV5WeaponReload({ actorId: 'a', equipmentId: 'repeat-1', operation: 'begin' });
  assert.equal(plan.ready, true, plan.error);
  assert.equal(plan.after.requiredSuccesses, 2, 'un tir conservé réduit la recharge de 3 à 2 succès');
  assert.equal((await store.applyV5WeaponReload(plan)).status, 'applied');
  assert.equal(equipped(store).extensions.v5.reloadState.reloading, true);
  plan = store.previewV5WeaponReload({ actorId: 'a', equipmentId: 'repeat-1', operation: 'progress', success: true, testSl: 2 });
  assert.equal((await store.applyV5WeaponReload(plan)).progress.successes, 1,
    'choix d’exécutant F2-D : un Test réussi ajoute un succès; les DR ne s’accumulent pas');
  assert.equal(await store.undo(), true);
  assert.equal(equipped(store).extensions.v5.reloadState.accumulatedSuccesses, 0);
  assert.equal(await store.redo(), true);
  assert.equal(equipped(store).extensions.v5.reloadState.accumulatedSuccesses, 1);
  const reloaded = createStore({ storage: null, persistence }); await reloaded.ready;
  assert.equal(equipped(reloaded).extensions.v5.reloadState.accumulatedSuccesses, 1);
});

test('F2-D Store reload — partial repeater magazine reduces the success target by one', async () => {
  const { store } = await fixture();
  const item = equipped(store); item.extensions.v5 = { reloadState: { revision: 1, repeaterRating: 3, shotsRemaining: 2,
    reloadSuccesses: 3, accumulatedSuccesses: 0, reloading: false, requiresReload: false } };
  await store.updateParticipant('a', { equipment: [item] });
  const plan = store.previewV5WeaponReload({ actorId: 'a', equipmentId: 'repeat-1', operation: 'begin' });
  assert.equal(plan.after.requiredSuccesses, 2);
});

test('F2-D resolution — a fired repeater consumes one shot once and Undo restores the charge', () => {
  const shooter = structuredClone(actor), victim = structuredClone(target);
  const preview = previewResolution({ resolutionId: 'f2-d-repeater-shot', actor: shooter, target: victim, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'repeater-attack', type: 'attack', attr: 'CT', base: 60, damage: 4, qualities: [{ id: 'a-repetition', parameter: '3' }],
      extensions: { fiche: { equipmentId: 'repeat-1' } } }, v5: { kind: 'ranged' }, attackContext: { ranged: true } });
  assert.equal(preview.weaponReload.after.shotsRemaining, 2);
  const applied = applyResolution(preview, { revision: 0, round: 1, participants: [shooter, victim], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 'a').equipment[0].extensions.v5.reloadState.shotsRemaining, 2);
  assert.equal(applyResolution(preview, applied.state).status, 'duplicate');
});

test('F2-D Store resolution — shot consumption is undoable and survives a later persistence reload', async () => {
  const { store, persistence } = await fixture();
  const input = { actorId: 'a', targetId: 't', resolutionId: 'f2-d-store-repeater-shot', roll: 23,
    action: { id: 'repeater-attack', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'a-repetition', parameter: '3' }], extensions: { fiche: { equipmentId: 'repeat-1' } } },
    attackContext: { ranged: true }, v5: { kind: 'ranged' } };
  const preview = store.previewResolution(input);
  assert.equal(preview.weaponReload.after.shotsRemaining, 2);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(equipped(store).extensions.v5.reloadState.shotsRemaining, 2);
  assert.equal(await store.undo(), true);
  assert.equal(equipped(store).extensions?.v5?.reloadState, undefined);
  assert.equal((await store.applyResolution(store.previewResolution(input))).status, 'applied');
  const reloaded = createStore({ storage: null, persistence }); await reloaded.ready;
  assert.equal(equipped(reloaded).extensions.v5.reloadState.shotsRemaining, 2);
});

test('F2-D reload characterization — an À répétition action without an owned equipment row must request input, not throw', () => {
  const shooter = { ...structuredClone(actor), equipment: [] }, victim = structuredClone(target);
  const input = { resolutionId: 'f2-d-unlinked-repeater', actor: shooter, target: victim, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'virtual-repeat', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'a-repetition', parameter: '3' }], extensions: {} }, v5: { kind: 'ranged' }, attackContext: { ranged: true } };
  let preview;
  assert.doesNotThrow(() => { preview = previewResolution(input); });
  assert.ok(preview.unresolved.some(row => /équipement|arme.*identifi|recharg/i.test(row)), JSON.stringify(preview.unresolved));
});

test('F2-D reload characterization — action.extensions.equipment without a persistent inventory link is handled safely', () => {
  const shooter = { ...structuredClone(actor), equipment: [] }, victim = structuredClone(target);
  const input = { resolutionId: 'f2-d-embedded-repeater', actor: shooter, target: victim, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'embedded-repeat', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'a-repetition', parameter: '3' }], extensions: { equipment: structuredClone(weapon) } },
    v5: { kind: 'ranged' }, attackContext: { ranged: true } };
  let preview;
  assert.doesNotThrow(() => { preview = previewResolution(input); });
  assert.ok(preview.unresolved.some(row => /équipement|arme.*identifi|recharg/i.test(row)), JSON.stringify(preview.unresolved));
});

test('F2-D reload — action.extensions.equipment resolves to the persistent copy by id', () => {
  const shooter = structuredClone(actor), victim = structuredClone(target);
  const preview = previewResolution({ resolutionId: 'f2-d-embedded-linked-repeater', actor: shooter, target: victim, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'embedded-linked-repeat', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'a-repetition', parameter: '3' }], extensions: { equipment: structuredClone(weapon) } },
    v5: { kind: 'ranged' }, attackContext: { ranged: true } });
  assert.equal(preview.weaponReload.equipmentId, 'repeat-1');
  assert.equal(preview.weaponReload.after.shotsRemaining, 2);
});

test('F2-D reload — an official repeated crossbow profile initializes from its catalogue qualities', () => {
  const official = getReferenceCatalogue().items.find(row => row.name === 'Arbalète à Répétition Druchii');
  assert.ok(official);
  const initialized = initialV5ReloadState(official);
  assert.equal(initialized.ready, true, JSON.stringify(initialized));
  assert.equal(initialized.state.repeaterRating, 3);
  assert.equal(initialized.state.reloadSuccesses, 9);
});

test('F2-D reload — a weapon with Recharge but no À répétition still needs a reload after firing', () => {
  const shooter = structuredClone(actor), victim = structuredClone(target);
  shooter.equipment[0].keywords = [{ id: 'recharge', parameter: '2' }];
  const preview = previewResolution({ resolutionId: 'f2-d-single-reload', actor: shooter, target: victim, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'single-shot', type: 'attack', attr: 'CT', base: 60, damage: 4, qualities: [{ id: 'recharge', parameter: '2' }],
      extensions: { fiche: { equipmentId: 'repeat-1' } } }, v5: { kind: 'ranged' }, attackContext: { ranged: true } });
  assert.equal(preview.weaponReload.after.repeaterRating, 0);
  assert.equal(preview.weaponReload.after.requiresReload, true);
});

test('F2-D Store reload — a stale preview is refused after the weapon changes', async () => {
  const { store } = await fixture();
  const item = equipped(store); item.extensions.v5 = { reloadState: { revision: 1, repeaterRating: 3, shotsRemaining: 2,
    reloadSuccesses: 3, accumulatedSuccesses: 0, reloading: false, requiresReload: false } };
  await store.updateParticipant('a', { equipment: [item] });
  const plan = store.previewV5WeaponReload({ actorId: 'a', equipmentId: 'repeat-1', operation: 'begin' });
  await store.updateParticipant('a', { notes: 'mutation concurrente' });
  await assert.rejects(store.applyV5WeaponReload(plan), /partie a changé|arme ou son état/iu);
});

test('F2-D Empaleuse resolution — explicit ammunition type lodges bullet/arrow and Undo keeps it atomic', () => {
  for (const [ammoName, expectedMethod] of [['Balles et poudre', 'surgery'], ['Flèches', 'heal-test']]) {
    const shooter=structuredClone(actor),victim={...structuredClone(target),hp:10,maxHp:10};
    shooter.equipment[0].keywords=[{id:'empaleuse'}];
    shooter.equipment.push({id:'ammo-'+expectedMethod,kind:'ammunition',name:ammoName,category:expectedMethod==='surgery'?'Poudre noire':'Arc',keywords:[]});
    shooter.equipment[0].category=expectedMethod==='surgery'?'Poudre noire':'Arc';
    const preview=previewResolution({resolutionId:'f2-d-impale-'+expectedMethod,actor:shooter,target:victim,baseRevision:0,round:1,roll:11,
      ammunitionId:'ammo-'+expectedMethod,criticalRolls:{location:2,effect:80},
      action:{id:'impale',type:'attack',attr:'CT',base:60,damage:4,qualities:[{id:'empaleuse'}],extensions:{fiche:{equipmentId:'repeat-1'}}},
      v5:{kind:'ranged'},attackContext:{ranged:true}});
    assert.equal(preview.projectileLodging.removal,expectedMethod);
    const applied=applyResolution(preview,{revision:0,round:1,participants:[shooter,victim],appliedResolutionIds:[]});
    assert.equal(applied.status,'applied');
    const targetAfter=applied.state.participants.find(row=>row.id==='t');
    assert.equal(targetAfter.extensions.v5.lodgedProjectiles[0].ammunitionId,'ammo-'+expectedMethod);
  }
});

test('F2-D Empaleuse Store extraction — confirmed removal is persisted, undoable and reloaded', async () => {
  const {store,persistence}=await fixture(),victim=structuredClone(target);
  victim.skills=[{id:'heal',name:'Guérison',total:50}];
  victim.extensions.v5.lodgedProjectiles=[{id:'lodge-arrow',participantId:'t',ammunitionId:'arrow-7',removal:'heal-test',removed:false}];
  await store.updateParticipant('t',{extensions:victim.extensions,skills:victim.skills});
  const plan=store.previewV5ProjectileExtraction({participantId:'t',projectileId:'lodge-arrow',method:'heal-test',skillId:'heal',roll:11});
  assert.equal(plan.ready,true,plan.error);
  await store.applyV5ProjectileExtraction(plan);
  assert.equal(store.listParticipants().find(row=>row.id==='t').extensions.v5.lodgedProjectiles[0].removed,true);
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(row=>row.id==='t').extensions.v5.lodgedProjectiles[0].removed,false);
  const freshPlan=store.previewV5ProjectileExtraction({participantId:'t',projectileId:'lodge-arrow',method:'heal-test',skillId:'heal',roll:11});
  await store.applyV5ProjectileExtraction(freshPlan);
  const reloaded=createStore({storage:null,persistence});await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(row=>row.id==='t').extensions.v5.lodgedProjectiles[0].removed,true);
});
