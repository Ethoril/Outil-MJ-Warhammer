import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';
for (const c of contracts.filter(c => c.domain === 'shadow')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Ombres — V5 pp. 169/254 : suffocation perd 1 B par Round, Inconscient à 0 B', async () => {
  const {store,engine}=await encounter({foe:{hp:1}}); await cast(store,contracts.find(c=>c.canonicalName==='Choking Shadows'));
  await endTurn(engine); await endTurn(engine); assert.equal(subject(store,'foe').hp,0); assert.equal(level(subject(store,'foe'),'Inconscient'),1);
});
test('Ombres — V5 p. 254 : Miasme, Perception +0 pour bouger ; réussite et échec', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Mystifying Miasma'));
  const effectId=subject(store,'foe').extensions.v5.spellEffects[0].id;
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'move',roll:12}); assert.equal(level(subject(store,'foe'),'À Terre'),0);
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'move',roll:98}); assert.equal(level(subject(store,'foe'),'À Terre'),1);
});
test('Ombres — V5 p. 255 : bruit déclaré termine l’Invisibilité sans toucher une autre couche', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Shroud of Invisibility'));
  await store.applySpellEffects('foe',{id:'other',statModifiers:{F:10},durationRounds:4});
  const effectId=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellName==='Linceul d’Invisibilité').id;
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'noise'}); assert.equal(subject(store,'foe').caracs.F,50); assert.equal(subject(store,'foe').extensions.v5.specialStates?.invisible,undefined);
});
test('Ombres — V5 pp. 255/327 : Destrier invoque le cheval, conserve le cavalier et expire à l’aube saisie', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Shadowsteed'),{domainFacts:{minutesToDawn:1,sunlight:false,riding:false}});
  const horse=store.listParticipants().find(p=>p.extensions?.isAuxiliary);
  assert.ok(horse); assert.equal(horse.caracs.M,8); assert.equal(horse.maxHp,22); assert.equal(horse.caracs.F,45);
  assert.ok(horse.traits.includes('Éthéré')); assert.equal(subject(store,'foe').caracs.M,4);
  const state=JSON.parse(store.getFullJSON());state.combat.round=7;state.combat.currentActorId='mage';await store.loadFromJSON(state); await endTurn(engine);
  assert.ok(!store.listParticipants().some(p=>p.id===horse.id));
});
test('Ombres — V5 p. 255 : fin anticipée du sort retire sa monture, Undo la restaure', async () => {
  const {store}=await encounter();await cast(store,contracts.find(c=>c.canonicalName==='Shadowsteed'));
  const id=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.specialState?.shadowsteed).id;
  await store.applySpellInteraction({effectId:id,targetId:'foe',kind:'end'});
  assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,0);
  await store.undo();assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,1);
});
