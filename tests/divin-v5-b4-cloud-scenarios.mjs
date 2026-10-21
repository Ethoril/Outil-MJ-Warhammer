import assert from 'node:assert/strict';
/** Même transport REST ETag et Store de production que la recette historique. */
export async function runB4WrathCloudScenarios({A,B,fixture,settled,pull,envelope,boot,check}){
 const actor=state=>state.combat.participants.find(row=>row.id==='hero');
 const projection=state=>({hp:actor(state).hp,sin:actor(state).extensions.v5.divine.sin,states:actor(state).states.map(row=>({id:row.id,key:row.key,level:row.level,locks:row.divineWrathLocks||[]})),recoveries:(state.extensions.v5.divineWrathRecoveries||[]).map(row=>({executionId:row.executionId,ruleId:row.ruleId,removedCount:row.removedCount,success:row.test.success}))});
 const initial=structuredClone(fixture);initial.combat.participants.find(row=>row.id==='hero').extensions.v5.divine.sin=1;
 await A.evaluate(async state=>window.qa35.store.loadFromJSON(state),initial);await settled(A);await pull(B);await settled(B);await pull(A);
 const impose=async(page,wrathRoll)=>page.evaluate(async wrathRoll=>{
  const store=window.qa35.store,contract='divine:blessing:myrmidia:battle';
  const preview=store.previewDivineExecution(contract,{actorId:'hero',targetIds:['ally'],roll:99,wrathRoll,canSpeak:true,facts:{targets:{ally:{withinRange:true,ally:true}}}});
  if(!preview.ready)throw Error(preview.error);const result=await store.applyDivineExecution(contract,{preview});if(!result.ok)throw Error(result.error);
 },wrathRoll);
 await impose(A,56);await settled(A);await pull(B);
 let a=await envelope(A),b=await envelope(B);assert.deepEqual(projection(b),projection(a));assert.equal(actor(b).states.find(row=>row.key==='aveugle').level,3);assert.equal(actor(b).states.find(row=>row.key==='aveugle').divineWrathLocks.length,1);
 check('B04 cloud 66–70 A vers B : trois Aveuglé verrouillés, À Terre, origine et Péchés reçus');
 const stateId=actor(b).states.find(row=>row.key==='aveugle').id;
 await B.evaluate(async stateId=>{
  const store=window.qa35.store,preview=store.previewDivineWrathRecovery({actorId:'hero',stateId,roll:54,canSpeak:true});
  if(!preview.ready)throw Error(preview.error);if(preview.removedCount!==2)throw Error('Le Test +0 doit retirer deux Aveuglé');
  const result=await store.applyDivineWrathRecovery({preview});if(!result.ok)throw Error(result.error);
 },stateId);await settled(B);await pull(A);a=await envelope(A);b=await envelope(B);assert.deepEqual(projection(a),projection(b));assert.equal(actor(a).states.find(row=>row.id===stateId).level,1);
 await A.reload();await boot(A,'A');await settled(A);await pull(B);assert.deepEqual(projection(await envelope(A)),projection(b));
 check('B04 cloud récupération sur B après sérialisation : vrai +0, deux niveaux retirés, reçu reçu par A et reload');
 await B.evaluate(()=>window.qa35.store.undo());await settled(B);await pull(A);assert.equal(actor(await envelope(A)).states.find(row=>row.id===stateId).level,3);
 await B.evaluate(()=>window.qa35.store.redo());await settled(B);await pull(A);assert.equal(actor(await envelope(A)).states.find(row=>row.id===stateId).level,1);
 check('B04 cloud Undo/Redo de récupération B : niveaux et verrou reçus sans recréer une occurrence');
 await A.evaluate(()=>window.qa35.store.setDivineSin('hero',1,{reason:'Fixture cloud 101–105 B04'}));await settled(A);await pull(B);
 await impose(A,91);await settled(A);await pull(B);assert.equal(actor(await envelope(B)).hp,0);assert.ok(actor(await envelope(B)).states.some(row=>row.key==='inconscient'));
 const blocked=await B.evaluate(async()=>{try{await window.qa35.store.updateParticipant('hero',{states:[]});return false;}catch(error){return error.code==='DIVINE_WRATH_LOCKED';}});assert.equal(blocked,true);
 await B.evaluate(()=>window.qa35.store.healWounds('hero',1));await settled(B);await pull(A);a=await envelope(A);b=await envelope(B);assert.deepEqual(projection(a),projection(b));assert.equal(actor(a).hp,1);assert.equal(actor(a).states.some(row=>row.key==='inconscient'),false);
 check('B04 cloud 101–105 : suppression brute refusée sur B, soin effectif libérant le KO transmis à A');
}
