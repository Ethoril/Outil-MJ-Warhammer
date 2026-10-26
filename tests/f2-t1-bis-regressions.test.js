import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { applyWeaponSkillRules, weaponHandsForParticipant } from '../js/core/equipment.js';

const clone = value => structuredClone(value);
function persistence() {
  let state = null;
  return { async load() { return state && clone(state); }, async saveAtomic({ state: next }) { state = clone(next); return { ok: true }; }, read() { return state && clone(state); } };
}
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40,
  hp: 10, maxHp: 10, caracs: { I: 40, CC: 50, CT: 50 }, skills: [], equipment: [], actions: [], states: [], extensions: { v5: {} }, ...extra });
const base = participants => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [], activeScene: null, encounters: [],
  suspendedScenes: [], persistentCharacters: [], combat: { round: 0, currentActorId: null, order: participants.map(row => row.id), orderMode: 'automatic', participants: clone(participants) }, extensions: { v5: { turnIndex: 1 } } });
async function setup(participants) {
  const saved = persistence(), store = createStore({ persistence: saved, storage: null });
  await store.ready; await store.loadFromJSON(base(participants)); return { store, saved };
}

test('T1 BIS 1 — Visée déclarée par nom est reconnue après normalisation de l’action', async () => {
  const saved=persistence(),store=createStore({persistence:saved,storage:null});await store.ready;
  const initial=base([person('archer', { kind: 'PJ', camp: 'pj' }), person('target')]);
  initial.combat.round=1;initial.combat.currentActorId='archer';initial.extensions.v5.combatScopeId='aim-scope';
  await store.loadFromJSON(initial);
  await store.applyV5CombatAction(store.previewV5CombatAction({ actorId: 'archer', kind: 'aim', targetId: 'target', weaponName: 'Arc', rangedWeaponConfirmed: true, rangedWeaponHeldConfirmed: true }));
  const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();
  const shot = store.previewResolution({ resolutionId: 'aim-by-name', actorId: 'archer', targetId: 'target', action: { type: 'attack', name: 'Arc', note: 'Arc', attr: 'CT', base: 50, damage: 4 }, roll: 20, v5: { kind: 'ranged', choice: 'keep' } });
  assert.equal(shot.ready, true, JSON.stringify(shot.unresolved||shot));
  assert.equal(shot.test.details.modifiers.find(row => row.id === 'aim:target')?.amount, 1);
});

test('T1 BIS 2/5 — préparation de rencontre tout au banc permise, démarrage refusé et Store revérifie', async () => {
  const { store } = await setup([person('bench', { zone: 'bench' })]);
  const prepare = store.previewCombatInitialization();
  assert.equal(prepare.ready, true, JSON.stringify(prepare.needsInput));
  const start = store.previewCombatInitialization({ startCombat: true });
  assert.equal(start.ready, false);
  assert.ok(start.needsInput.some(row => row.field === 'activeCombatants'));
  const forged = { ...prepare, startCombat: true };
  const result = await store.applyCombatInitialization(forged);
  assert.equal(result.status, 'requires-input');
});

test('T1 BIS 3/4 — hastes des suppléments et armes de jet usuelles ont une prise à une main sauf (2M)', () => {
  const items = getReferenceCatalogue().items;
  for (const name of ['Hallebarde Haut Elfe', 'Lance longue Haut Elfe']) {
    const weapon = items.find(row => row.name === name);
    assert.ok(weapon, `arme catalogue: ${name}`);
    assert.equal(weaponHandsForParticipant(weapon), 2, name);
  }
  for (const name of ['Couteau de lancer', 'Fronde', 'Fouet', 'Lasso']) {
    const weapon = items.find(row => row.name === name);
    assert.ok(weapon, `arme catalogue: ${name}`);
    assert.equal(weaponHandsForParticipant(weapon), 1, name);
  }
  const bomb = items.find(row => /bombe/i.test(row.name) && row.kind === 'weapon');
  if (bomb) assert.equal(weaponHandsForParticipant(bomb), 1, bomb.name);
});

test('T1 BIS 7 — l’initialisation défensive Store refuse un combat tout au banc', async () => {
  const { store } = await setup([person('bench', { zone: 'bench' })]);
  const plan = store.previewCombatInitialization();
  const result = await store.applyCombatInitialization({ ...plan, startCombat: true });
  assert.equal(result.status, 'requires-input');
  assert.equal(store.getCombat().round, 0);
});

test('T1 BIS 6 — arme aethyrique matérialisée sans clé demande son groupe, attaque naturelle reste hors contrôle', () => {
  const actor=person('mage');
  const ethereal={id:'ethereal',type:'attack',note:'Arme aethyrique',attr:'CC',base:50,qualities:[],extensions:{v5:{materialized:true}}};
  const unresolved=applyWeaponSkillRules(actor,ethereal);
  assert.ok(unresolved.unresolved.some(text=>/groupe d’arme manquant/i.test(text)));
  assert.equal(unresolved.receipt.missing,'group');
  const natural=applyWeaponSkillRules(actor,{...ethereal,id:'natural',note:'Dent et griffe'});
  assert.deepEqual(natural.unresolved,[]);
});

test('T1 BIS A — ajout direct actif refusé sans jet; activation avant Round 1 reçoit son jet et rejoint l’ordre', async () => {
  const { store } = await setup([person('first')]);
  const initial=store.previewCombatInitialization({diceById:{first:4}});
  assert.equal(initial.ready,true,JSON.stringify(initial.needsInput));
  await store.applyCombatInitialization(initial);
  assert.throws(()=>store.addParticipant(person('direct',{initiative:35,caracs:{I:35}})),error=>error.code==='COMBAT_INIT_REQUIRED');
  assert.equal(store.listParticipants().some(row=>row.id==='direct'),false,'un ajout actif direct ne se glisse pas sans jet');
  await store.addParticipant(person('reinforcement',{initiative:35,caracs:{I:35},zone:'bench'}));
  const staging=store.previewCombatParticipantActivation('reinforcement');
  assert.ok(staging,'l’entrée en jeu avant le Round 1 ouvre la saisie d’initiative');
  const plan=store.previewCombatInitialization({staging,diceById:{first:4,reinforcement:8}});
  assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
  const applied=await store.applyCombatInitialization(plan);
  assert.equal(applied.status,'applied');
  const added=store.listParticipants().find(row=>row.id==='reinforcement');
  assert.equal(added.extensions.v5.combatInitiative.die,8);
  assert.equal(added.extensions.v5.combatInitiative.score,11);
  assert.ok(store.getCombat().order.includes('reinforcement'));
});

test('T1 BIS A — addProfilesToCombat ne place pas un profil actif sans jet après initialisation', async () => {
  const { store } = await setup([person('first')]);
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{first:4}}));
  await store.addProfile({id:'profile',name:'Nouvel ennemi',kind:'PNJ',initiative:30,caracs:{I:30},hp:10});
  assert.throws(()=>store.addProfilesToCombat(['profile'],{zone:'active'}),error=>error.code==='COMBAT_INIT_REQUIRED');
  assert.equal(store.listParticipants().some(row=>row.profileId==='profile'),false);
  const staging=store.previewCombatParticipantAddition('profile');
  assert.ok(staging);
  const plan=store.previewCombatInitialization({staging,diceById:{[staging.participant.id]:7}});
  assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
  assert.equal(store.listParticipants().some(row=>row.profileId==='profile'),false,'l’aperçu ne crée pas le participant avant confirmation');
  assert.equal((await store.applyCombatInitialization(plan)).status,'applied');
  const added=store.listParticipants().find(row=>row.profileId==='profile');
  assert.equal(added.zone,'active');assert.equal(added.extensions.v5.combatInitiative.die,7);
});

test('T1 BIS A — PJ ajouté actif avant le Round 1 doit saisir son d10 dans l’aperçu', async () => {
  const { store }=await setup([person('first')]);
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{first:4}}));
  const staging=store.previewCombatParticipantAddition(person('new-pj',{kind:'PJ',camp:'pj',initiative:35,caracs:{I:35}}));
  const missing=store.previewCombatInitialization({staging});
  assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(row=>row.participantId==='new-pj'&&row.field==='die'));
  const ready=store.previewCombatInitialization({staging,diceById:{'new-pj':6}});
  assert.equal(ready.ready,true,JSON.stringify(ready.needsInput));
  assert.equal(ready.participants.find(row=>row.id==='first').extensions.v5.combatInitiative.die,4);
  assert.equal(ready.participants.find(row=>row.id==='new-pj').extensions.v5.combatInitiative.die,6);
});
