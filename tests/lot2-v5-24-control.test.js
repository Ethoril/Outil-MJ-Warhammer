import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import registry from '../js/data/v5-test-talent-contracts.json' with { type: 'json' };
import { currentV5TalentHashes } from '../js/core/v5-talents.js';
import { evaluateTalentContractsV2 } from '../js/core/talent-contract-v2.js';
import coverage from '../js/data/v5-talent-coverage.json' with { type: 'json' };
import { v5TalentCoverage, importedPjTalentPriorities } from '../js/core/v5-talent-coverage.js';

const owned=(id,extra={})=>({id,name:id,rank:1,status:'resolved',...extra});
const skill=name=>{const found=getReferenceCatalogue().skills.find(row=>row.nom===name);assert.ok(found,`Compétence publique inconnue : ${name}`);return found.id;};
const envelope=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
function memory(){let saved=null,reject=false;return {load:async()=>structuredClone(saved),saveAtomic:async({state})=>{if(reject)throw new Error('Disque de recette 2.4 indisponible');saved=structuredClone(state);return {ok:true};},snapshot:()=>structuredClone(saved),reject:value=>{reject=value;}};}
async function setup({actorTalents=[],targetTalents=[],actor={},target={}}={}){
 const persistence=memory(),store=createStore({persistence});await store.ready;
 const person=(id,talents,extra)=>({id,name:'Personnage synthétique '+id,kind:'PJ',camp:id==='control24-a'?'pj':'ennemi',zone:'active',hp:40,maxHp:40,initiative:50,caracs:{CC:60,CT:50,F:30,E:30,Ag:40,Soc:50},states:[],talents,armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:false}},...extra});
 await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'control24-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'control24-a',order:['control24-a','control24-t'],participants:[person('control24-a',actorTalents,actor),person('control24-t',targetTalents,target)]},diceLines:[],log:[]});
 return {store,persistence,actorId:'control24-a',targetId:'control24-t'};
}
const person=(ctx,id)=>ctx.store.listParticipants().find(row=>row.id===id);
const testInput=(ctx,id,name,extra={})=>({resolutionId:id,actorId:ctx.actorId,action:{id:'context-test',type:'skill',attr:'Soc',base:50,extensions:{fiche:{skillId:skill(name)}}},roll:61,v5:{kind:'test'},...extra});
const hitInput=(ctx,id,extra={})=>({resolutionId:id,actorId:ctx.actorId,targetId:ctx.targetId,action:{id:'synthetic-club',type:'attack',attr:'CC',base:60,damage:3,qualities:['assommante']},roll:10,defense:{base:60,roll:40,v5:{kind:'melee'}},v5:{kind:'melee'},...extra});
const stun=subject=>(subject.states||[]).filter(row=>row.key==='sonne').reduce((sum,row)=>sum+row.level,0);
const proposals=p=>(p.talentPlans||[]).flatMap(row=>row.proposals||[]);

// Expectations come from the published V5 clauses, using Store commands rather than evaluator stubs.
test('Contrôle 2.4 — Discrétion urbaine donne Avantage, conserve seuil et ne modifie rien en aperçu',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-alley-cat')]});const before=envelope(ctx.store);
 const raw=testInput(ctx,'control24-urban','Discrétion (Urbaine)');const waiting=ctx.store.previewResolution(raw);
 assert.equal(waiting.test.score,50);assert.equal(waiting.test.advantage.net,1);assert.equal(waiting.choiceRequired,true);
 const reverse=ctx.store.previewResolution({...raw,v5:{kind:'test',choice:'reverse'}});assert.equal(reverse.roll,16);assert.equal(reverse.sl,4);assert.equal(reverse.success,true);
 assert.deepEqual(envelope(ctx.store),before);assert.equal((await ctx.store.applyResolution(waiting)).status,'manual');
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-rural-other','Discrétion (Rurale)')).test.advantage.net,0);
});

test('Contrôle 2.4 — compétence liée à la fiche bat un contexte contrefait et un nom seul reste manuel',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-alley-cat')]});
 const canonical=testInput(ctx,'control24-authority','Charme',{v5:{kind:'test',context:{skillId:skill('Discrétion (Urbaine)')}}});
 assert.equal(ctx.store.previewResolution(canonical).test.advantage.net,0);
 const nameOnly={...testInput(ctx,'control24-name-only','Charme'),action:{type:'skill',base:50,note:'Discrétion (Urbaine)'}};
 assert.equal(ctx.store.previewResolution(nameOnly).test.advantage.net,0);
});

test('Contrôle 2.4 — Menteur et Orateur exigent leurs circonstances explicites',async()=>{
 for(const [id,field] of [['talent-cat-tongued','lying'],['talent-public-speaker','influencingGroup']]){
  const ctx=await setup({actorTalents:[owned(id)]}),raw=testInput(ctx,'control24-'+field,'Charme');
  const missing=ctx.store.previewResolution(raw);assert.ok(missing.unresolved.length>0);assert.equal((await ctx.store.applyResolution(missing)).status,'manual');
  const no=ctx.store.previewResolution({...raw,v5:{kind:'test',context:{[field]:false}}});assert.equal(no.test.advantage.net,0);
  const yes=ctx.store.previewResolution({...raw,v5:{kind:'test',choice:'reverse',context:{[field]:true}}});assert.equal(yes.roll,16);assert.equal(yes.test.advantage.net,1);
 }
});

test('Contrôle 2.4 — avantages linguistiques excluent Magick et respectent les IDs spécialisés',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-linguistics')]});
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-language','Langue (Reikspiel)')).test.advantage.net,1);
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-magick','Langue (Magick)')).test.advantage.net,0);
});

test('Contrôle 2.4 — Résistance compare la menace choisie, ne réussit jamais automatiquement',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-resistant',{specialization:'poison'})]});const raw=testInput(ctx,'control24-threat','Résistance');
 const matching=ctx.store.previewResolution({...raw,roll:98,v5:{kind:'test',context:{resistingThreat:true,threatId:'poison'}}});
 assert.equal(matching.test.advantage.net,1);assert.equal(matching.success,false);
 assert.equal(ctx.store.previewResolution({...raw,v5:{kind:'test',context:{resistingThreat:true,threatId:'maladie'}}}).test.advantage.net,0);
 const missing=ctx.store.previewResolution({...raw,v5:{kind:'test',context:{resistingThreat:true}}});assert.ok(missing.unresolved.length>0);
});

test('Contrôle 2.4 — DR ou unités exige choix explicite, conserve réussite et peut choisir le moindre résultat',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-sl-choice','Divertissement (Interprétation)',{roll:28});
 const missing=ctx.store.previewResolution(raw);assert.ok(missing.unresolved.length>0);assert.equal((await ctx.store.applyResolution(missing)).status,'manual');
 const dr=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':false}}});assert.equal(dr.sl,3);assert.equal(dr.success,true);
 const units=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(units.sl,8);assert.equal(units.test.score,50);assert.equal(units.success,true);
 const zero=ctx.store.previewResolution({...raw,roll:20,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(zero.sl,0);assert.equal(zero.success,true);assert.equal(zero.test.zeroOutcome,'marginalSuccess');
 const failed=ctx.store.previewResolution({...raw,roll:98});assert.equal(failed.success,false);assert.equal(failed.unresolved.length,0);
 const hundred=ctx.store.previewResolution({...raw,roll:100,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(hundred.success,false);assert.ok(!hundred.test.details.talentSLReplacement);assert.equal(hundred.unresolved.length,0);
});

test('Contrôle 2.4 — choix unités utilise jet final inversé et choix de l’option non retenue ne bloque pas',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-final-units','Divertissement (Interprétation)',{v5:{kind:'test',choice:'reverse',advantageSources:[{id:'control24-assisted',label:'Circonstance décidée par le MJ'}],talentChoices:{'talent-master-of-disguise:sl:reverse':true}}});
 const reverse=ctx.store.previewResolution(raw);assert.equal(reverse.roll,16);assert.equal(reverse.sl,6);assert.equal(reverse.success,true);assert.equal(reverse.unresolved.length,0);
 const zero=ctx.store.previewResolution({...raw,roll:6,action:{...raw.action,base:90},v5:{kind:'test',choice:'reverse',disadvantageSources:[{id:'control24-forced',label:'Désavantage déclaré'}],talentChoices:{'talent-master-of-disguise:sl:reverse':true}}});assert.equal(zero.roll,60);assert.equal(zero.sl,0);assert.equal(zero.success,true);assert.equal(zero.test.zeroOutcome,'marginalSuccess');assert.equal(zero.unresolved.length,0);
 const keep=ctx.store.previewResolution({...raw,v5:{...raw.v5,choice:'keep',talentChoices:{}}});assert.equal(keep.success,false);assert.equal(keep.unresolved.length,0);
});

test('Contrôle 2.4 — défenseur applique son propre choix DR/unités dans une opposition',async()=>{
 const ctx=await setup({targetTalents:[owned('talent-master-of-disguise')]});
 const raw={...testInput(ctx,'control24-defender-sl','Charme',{roll:24}),targetId:ctx.targetId,action:{type:'opposition',base:50},defense:{base:50,roll:28,label:'Interprétation',extensions:{fiche:{skillId:skill('Divertissement (Interprétation)')}},v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}}};
 const p=ctx.store.previewResolution(raw);assert.equal(p.opposition.defender.sl,8);assert.equal(p.opposition.winner,'defender');assert.equal(p.unresolved.length,0);
 const zero=ctx.store.previewResolution({...raw,defense:{...raw.defense,roll:20}});assert.equal(zero.opposition.defender.sl,0);assert.equal(zero.opposition.defender.success,true);assert.equal(zero.opposition.defender.zeroOutcome,'marginalSuccess');assert.equal(zero.opposition.winner,'attacker');assert.equal(zero.unresolved.length,0);
});

test('Contrôle 2.4 — source publique modifiée ou absente bloque bonus même avec acquisition résolue',()=>{
 const canonical=getReferenceCatalogue();const contracts=registry.contracts.filter(row=>row.talentId==='talent-alley-cat');
 for(const catalogue of [{talents:canonical.talents.filter(row=>row.id!=='talent-alley-cat')},{talents:canonical.talents.map(row=>row.id==='talent-alley-cat'?{...row,description:row.description+' contrôle divergence'}:row)}]){
  const plan=evaluateTalentContractsV2({contracts,acquisitions:[{talentId:'talent-alley-cat',rank:1}],sourceHashes:currentV5TalentHashes(catalogue),event:'test.beforeRoll',role:'actor',context:{skillId:skill('Discrétion (Urbaine)')}});
  assert.equal(plan.proposals.length,0);assert.ok(plan.trace.some(row=>['sourceChanged','sourceUnavailable'].includes(row.status)));
 }
});
test('Contrôle 2.4 — acquisition non résolue ne donne aucun avantage ni qualité',async()=>{
 const ctx=await setup({actorTalents:[{name:'Chat de gouttière',rank:1},owned('talent-strike-to-stun',{status:'unresolved'})]});
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-unresolved','Discrétion (Urbaine)')).test.advantage.net,0);
 const p=ctx.store.previewResolution(hitInput(ctx,'control24-unresolved-quality',{action:{type:'attack',base:60,damage:3,qualities:[]},v5:{kind:'melee',context:{weaponImprovised:true,silentTakedown:false}}}));
 assert.ok(!p.input.action.qualities.some(row=>row.id==='assommante'));assert.equal(stun(person(ctx,ctx.targetId)),0);
});

test('Contrôle 2.4 — décision contextuelle et son origine sont durables, annulables et rechargeables',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-durable-choice','Divertissement (Interprétation)',{roll:28,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});
 const before=envelope(ctx.store),p=ctx.store.previewResolution(raw);assert.equal((await ctx.store.applyResolution(p)).status,'applied');
 const detail=ctx.store.getLog()[0].detail;assert.equal(detail.sl,8);assert.ok(proposals(detail).some(row=>row.origins?.some(origin=>origin.talentId==='talent-master-of-disguise')));
 const reloaded=createStore({persistence:ctx.persistence});await reloaded.ready;assert.deepEqual(reloaded.getLog()[0].detail,detail);
 const exported=JSON.parse(reloaded.getFullJSON());assert.equal(exported.log[0].detail.sl,8);await reloaded.undo();assert.deepEqual(JSON.parse(JSON.stringify(reloaded.listParticipants())),before.combat.participants);
 await reloaded.redo();assert.equal(reloaded.getLog()[0].detail.sl,8);
});

test('Contrôle 2.4 — disque et révision périmée conservent décision/partie/historique',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const p=ctx.store.previewResolution(testInput(ctx,'control24-disk','Divertissement (Interprétation)',{roll:28,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}}));
 const before={state:envelope(ctx.store),saved:ctx.persistence.snapshot(),history:ctx.store.getHistory()};ctx.persistence.reject(true);
 assert.equal((await ctx.store.applyResolution(p)).status,'error');assert.deepEqual(envelope(ctx.store),before.state);assert.deepEqual(ctx.persistence.snapshot(),before.saved);assert.deepEqual(ctx.store.getHistory(),before.history);
 ctx.persistence.reject(false);await ctx.store.updateParticipant(ctx.actorId,{notes:'Révision suivante synthétique'});assert.equal((await ctx.store.applyResolution(p)).status,'stale');
});

test('Contrôle 2.4 — Assommante exige tête et seuil de Blessures perdues réel, seuil inclus',async()=>{
 const ctx=await setup();const p=ctx.store.previewResolution(hitInput(ctx,'control24-stun-threshold'));assert.equal(p.location.name,'Tête');assert.equal(p.damage.finalDamage,3);
 assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(person(ctx,ctx.targetId).hp,37);assert.equal(stun(person(ctx,ctx.targetId)),1);
 const after=await setup({target:{armor:{head:1,body:0,arms:0,legs:0}}});const low=after.store.previewResolution(hitInput(after,'control24-below-threshold'));assert.equal(low.damage.finalDamage,2);assert.equal((await after.store.applyResolution(low)).status,'applied');assert.equal(stun(person(after,after.targetId)),0);
 const body=await setup();const offHead=body.store.previewResolution(hitInput(body,'control24-off-head',{roll:23,defense:{base:20,roll:81,v5:{kind:'melee'}}}));assert.notEqual(offHead.location.name,'Tête');assert.equal((await body.store.applyResolution(offHead)).status,'applied');assert.equal(stun(person(body,body.targetId)),0);
});

test('Contrôle 2.4 — protection et PV restants ne peuvent provoquer un Sonné avec dégâts théoriques',async()=>{
 const ctx=await setup({target:{hp:2}});const p=ctx.store.previewResolution(hitInput(ctx,'control24-real-hp',{criticalRolls:{secondEffect:1}}));assert.equal(p.damage.finalDamage,3);assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(person(ctx,ctx.targetId).hp,0);assert.equal(stun(person(ctx,ctx.targetId)),0);
 const armored=await setup({target:{armor:{head:20,body:0,arms:0,legs:0}}});const zero=armored.store.previewResolution(hitInput(armored,'control24-absorbed',{action:{type:'attack',base:60,damage:3,qualities:['assommante','inoffensive']}}));assert.equal(zero.damage.finalDamage,0);assert.equal((await armored.store.applyResolution(zero)).status,'applied');assert.equal(stun(person(armored,armored.targetId)),0);
});

test('Contrôle 2.4 — qualité temporaire Frappe assommante ne multiplie pas rang et ne change pas arme source',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun',{rank:4})]});const action={type:'attack',base:60,damage:3,qualities:[]};const before=structuredClone(action);
 const p=ctx.store.previewResolution(hitInput(ctx,'control24-improvised',{action,v5:{kind:'melee',context:{weaponImprovised:true,silentTakedown:false}}}));assert.deepEqual(action,before);assert.equal(p.input.action.qualities.filter(row=>row.id==='assommante').length,1);
 assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(stun(person(ctx,ctx.targetId)),1);assert.deepEqual(action,before);
 const ordinary=ctx.store.previewResolution(hitInput(ctx,'control24-ordinary',{action,v5:{kind:'melee',context:{weaponImprovised:false}}}));assert.ok(!ordinary.input.action.qualities.some(row=>row.id==='assommante'));
});

test('Contrôle 2.4 — Mâchoires réduit Sonné Assommante une fois puis provenance/reload/undo persistent',async()=>{
 const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]});const first=ctx.store.previewResolution(hitInput(ctx,'control24-iron-first'));assert.equal((await ctx.store.applyResolution(first)).status,'applied');assert.equal(stun(person(ctx,ctx.targetId)),0);
 const saved=ctx.persistence.snapshot();assert.equal(saved.extensions.v5.actionLedger.quotaUsage.find(row=>row.quotaId==='talent-iron-jaw:first-stunned').used,1);
 const reloaded=createStore({persistence:ctx.persistence});await reloaded.ready;const second=reloaded.previewResolution(hitInput({...ctx,store:reloaded},'control24-iron-second',{v5:{kind:'melee',choice:'keep'}}));assert.equal((await reloaded.applyResolution(second)).status,'applied');assert.equal(stun(reloaded.listParticipants().find(row=>row.id===ctx.targetId)),1);
 const state=reloaded.listParticipants().find(row=>row.id===ctx.targetId).states.find(row=>row.key==='sonne');assert.equal(state.source.kind,'quality');assert.equal(state.source.keywordId,'assommante');
 await reloaded.undo();assert.equal(stun(reloaded.listParticipants().find(row=>row.id===ctx.targetId)),0);await reloaded.redo();assert.equal(stun(reloaded.listParticipants().find(row=>row.id===ctx.targetId)),1);
});

test('Contrôle 2.4 — Battement annule aussi l’effet Assommante de la touche remplacée',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});const p=ctx.store.previewResolution(hitInput(ctx,'control24-beat-stun',{v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}}));assert.equal(p.damage,null);assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(stun(person(ctx,ctx.targetId)),0);assert.equal(person(ctx,ctx.targetId).hp,40);
});

test('Contrôle 2.4 — coup ciblé conserve seuil et neutralisation p135 ne supprime pas cette pénalité',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')]});
 const targeted=ctx.store.previewResolution(hitInput(ctx,'control24-called-shot',{v5:{kind:'melee',context:{weaponImprovised:true,calledShot:true,calledShotLocation:'head',silentTakedown:false}}}));assert.equal(targeted.test.score,60);assert.equal(targeted.sl,3);
 const invalid=ctx.store.previewResolution(hitInput(ctx,'control24-silent-invalid',{v5:{kind:'melee',context:{weaponImprovised:true,calledShot:true,silentTakedown:true}}}));assert.ok(invalid.unresolved.some(row=>/Neutralisation silencieuse/.test(row)));assert.equal((await ctx.store.applyResolution(invalid)).status,'manual');
 const raw={resolutionId:'control24-silent-test',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}},roll:61,defense:{base:30,roll:81,label:'Résistance',v5:{kind:'test'}},v5:{kind:'melee',choice:'reverse',context:{silentTakedown:true,outsideCombat:true,targetUnaware:true,calledShot:false}}};
 const p=ctx.store.previewResolution(raw);assert.equal(p.test.advantage.net,1);assert.equal(p.roll,16);assert.equal(p.damage,null);assert.equal(p.critical,null);assert.ok(p.reminders.some(row=>/Inconscient/.test(row)));
 const before=person(ctx,ctx.targetId);assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(person(ctx,ctx.targetId).hp,before.hp);assert.equal(stun(person(ctx,ctx.targetId)),0);assert.ok(!person(ctx,ctx.targetId).states.some(row=>row.key==='inconscient'));assert.equal(person(ctx,ctx.actorId).extensions.v5.hasMomentum,false);
});
test('Contrôle 2.4 — Dur à cuire et dix bonus de caractéristiques ne sont jamais ajoutés dans action',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-hardy'),owned('talent-very-strong'),owned('talent-very-resilient')]});const before=person(ctx,ctx.actorId);
 const p=ctx.store.previewResolution(hitInput(ctx,'control24-no-double'));assert.equal((await ctx.store.applyResolution(p)).status,'applied');const after=person(ctx,ctx.actorId);assert.equal(after.maxHp,before.maxHp);assert.deepEqual(after.caracs,before.caracs);
});





test('Contrôle 2.4 — les 206 identités ont des clauses lisibles, mixtes et source suspendue distinctes',()=>{
 const catalogue=getReferenceCatalogue();assert.equal(coverage.items.length,206);assert.equal(new Set(coverage.items.map(row=>row.talentId)).size,206);
 for(const row of catalogue.talents){const item=v5TalentCoverage(row.id);assert.equal(item.status,'verified');assert.ok(item.clauses.length>0);for(const clause of item.clauses){assert.ok(['automatic','assisted','reminder','excluded','deferred','owned','pending'].includes(clause.mode));assert.ok(clause.text?.trim());}}
 const publicSpeaker=v5TalentCoverage('talent-public-speaker');assert.ok(publicSpeaker.clauses.some(row=>row.mode==='automatic'));assert.ok(publicSpeaker.clauses.some(row=>row.mode==='assisted'));assert.ok(publicSpeaker.clauses.some(row=>row.mode==='reminder'));assert.ok(!publicSpeaker.clauses.some(row=>row.mode==='pending'));
 const resistant=v5TalentCoverage('talent-resistant');assert.ok(resistant.clauses.some(row=>row.mode==='automatic'));assert.ok(resistant.clauses.some(row=>row.mode==='assisted'));
 assert.ok(v5TalentCoverage('talent-strong-minded').clauses.some(row=>row.mode==='assisted'));
 const changed=v5TalentCoverage('talent-public-speaker',{talents:catalogue.talents.map(row=>row.id==='talent-public-speaker'?{...row,description:row.description+' divergence synthétique'}:row)});assert.equal(changed.status,'sourceChanged');assert.ok(changed.clauses.every(row=>!['automatic','assisted'].includes(row.mode)));
 const absent=v5TalentCoverage('talent-public-speaker',{talents:[]});assert.equal(absent.status,'sourceUnavailable');assert.ok(absent.clauses.every(row=>!['automatic','assisted'].includes(row.mode)));
});

test('Contrôle 2.4 — dix caractéristiques déjà intégrées et magie/prière restent séparées des automatiques',()=>{
 assert.equal(coverage.items.filter(row=>row.clauses.some(clause=>clause.mode==='excluded')).length,10);
 for(const id of ['talent-bless','talent-invoke','talent-chaos-magic'])assert.ok(v5TalentCoverage(id).clauses.some(row=>row.mode==='deferred'));
 assert.ok(v5TalentCoverage('talent-arcane-magic').clauses.some(row=>row.mode==='automatic'));assert.ok(v5TalentCoverage('talent-petty-magic').clauses.every(row=>row.mode==='owned'));
 assert.ok(v5TalentCoverage('talent-hardy').clauses.every(row=>row.mode==='owned'));
 assert.ok(v5TalentCoverage('talent-small').clauses.some(row=>row.mode==='assisted'));
 assert.ok(v5TalentCoverage('talent-riposte').clauses.some(row=>row.mode==='automatic'));
 assert.ok(v5TalentCoverage('talent-reaction-strike').clauses.some(row=>row.mode==='assisted'));assert.ok(!v5TalentCoverage('talent-reaction-strike').clauses.some(row=>row.mode==='pending'));assert.deepEqual(coverage.items.filter(row=>row.clauses.some(c=>c.mode==='pending')).map(row=>row.talentId),[]);
});

const imported=(charId,fingerprint,talents,extra={})=>({kind:'PJ',ficheSnapshot:{charId,source:{fingerprint},coverage:{talents:'present'},talents},...extra});
test('Contrôle 2.4 — priorité vient seulement de snapshots réellement importés et déduplique copies/scènes',()=>{
 const first=imported('synthetic-priority-a','snapshot-a',[owned('talent-public-speaker',{rank:2}),owned('talent-resistant',{specialization:'poison'}),owned('talent-resistant',{specialization:'maladie'})]);
 const second=imported('synthetic-priority-b','snapshot-b',[owned('talent-alley-cat')]);
 const e={reserve:[first,{kind:'PJ',talents:[owned('talent-strike-to-stun')]}],persistentCharacters:[structuredClone(first)],combat:{participants:[second,structuredClone(first)]},suspendedScenes:[{combat:{participants:[structuredClone(second)]}}]};
 const result=importedPjTalentPriorities(e);assert.equal(result.characters,2);assert.equal(result.acquisitions,5);assert.equal(result.ambiguousCharacters,0);assert.equal(result.items.find(row=>row.talentId==='talent-resistant').characters,1);assert.equal(result.items.find(row=>row.talentId==='talent-resistant').acquisitions,2);assert.ok(!result.items.some(row=>row.talentId==='talent-strike-to-stun'));
 const replacement=importedPjTalentPriorities({reserve:[imported('synthetic-new','snapshot-new',[owned('talent-trapper')])]});assert.deepEqual(replacement.items.map(row=>row.talentId),['talent-trapper']);assert.deepEqual(importedPjTalentPriorities({}).items,[]);
});

test('Contrôle 2.4 — snapshots divergents signalent ambiguïté, pas d’union de talents inventée',()=>{
 const result=importedPjTalentPriorities({reserve:[imported('synthetic-ambiguous','old',[owned('talent-public-speaker')])],combat:{participants:[imported('synthetic-ambiguous','new',[owned('talent-alley-cat')])]}});
 assert.equal(result.characters,1);assert.equal(result.ambiguousCharacters,1);assert.equal(result.acquisitions,0);assert.deepEqual(result.items,[]);
});

test('Contrôle 2.4 — Mains agiles Bagarre exige toucher en attaque, ne bonifie pas la défense Bagarre',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-fast-hands')],targetTalents:[owned('talent-fast-hands')]});
 const action={type:'attack',base:60,damage:3,extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}};
 const missing=ctx.store.previewResolution(hitInput(ctx,'control24-touch-missing',{action}));assert.ok(missing.unresolved.some(row=>/touchingOpponent/.test(row)));
 const punch=ctx.store.previewResolution(hitInput(ctx,'control24-normal-punch',{action,v5:{kind:'melee',context:{touchingOpponent:false}}}));assert.equal(punch.test.advantage.net,0);
 const touch=ctx.store.previewResolution(hitInput(ctx,'control24-touch',{action,v5:{kind:'melee',choice:'keep',context:{touchingOpponent:true}},defense:{base:60,roll:40,label:'Bagarre',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}},v5:{kind:'melee',context:{touchingOpponent:true}}}}));assert.equal(touch.test.advantage.net,1);assert.equal(touch.opposition.defender.advantage.net,0);
 const skillPreview=ctx.store.previewResolution({...testInput(ctx,'control24-fast-defender','Charme',{roll:28}),targetId:ctx.targetId,action:{type:'opposition',base:50},defense:{base:50,roll:61,label:'Escamotage',extensions:{fiche:{skillId:skill('Escamotage')}},v5:{kind:'test',choice:'reverse'}}});assert.equal(skillPreview.opposition.defender.roll,16);assert.equal(skillPreview.opposition.defender.advantage.net,1);
});

test('Contrôle 2.4 — Orateur et Menteur cumulent sources distinctes puis Désavantage annule une pour une',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-public-speaker'),owned('talent-cat-tongued')]});const raw=testInput(ctx,'control24-two-advantages','Charme',{v5:{kind:'test',choice:'reverse',context:{lying:true,influencingGroup:true}}});
 const two=ctx.store.previewResolution(raw);assert.equal(two.roll,16);assert.equal(two.test.advantage.net,2);assert.equal(two.sl,5);assert.equal(two.test.score,50);
 const cancelled=ctx.store.previewResolution({...raw,v5:{...raw.v5,disadvantageSources:[{id:'control24-counter',label:'Désavantage déclaré'}]}});assert.equal(cancelled.test.advantage.net,1);assert.equal(cancelled.sl,4);assert.equal(cancelled.roll,16);
});

test('Contrôle 2.4 — arme publiée non improvisée bat déclaration MJ incompatible et un nom seul ne suffit pas',async()=>{
 const item=getReferenceCatalogue().items.find(row=>row.name==='Épée'||row.name==='Sword'||(/epee/.test(row.id)&&row.kind==='weapon'));assert.ok(item,'Arme ordinaire publiée requise pour la recette');
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')],actor:{equipment:[{id:'synthetic-sword',baseId:item.id,kind:'weapon',name:'Arme improvisée (nom trompeur)',keywords:[]}]} });
 const linked=ctx.store.previewResolution(hitInput(ctx,'control24-equipment-authority',{action:{type:'attack',base:60,damage:3,qualities:[],extensions:{fiche:{equipmentId:'synthetic-sword'}}},v5:{kind:'melee',context:{weaponImprovised:true,silentTakedown:false}}}));assert.ok(!linked.input.action.qualities.some(row=>row.id==='assommante'));
});


test('Contrôle 2.4 — source actualisée après aperçu refuse confirmation sans toucher partie/révision/historique',()=>{
 for(const talentId of ['talent-public-speaker','talent-master-of-disguise','talent-strike-mighty-blow']){
  const source=`
   import assert from 'node:assert/strict';
   import {readFile} from 'node:fs/promises';
   import {createStore} from './js/core/store.js';
   import {getReferenceCatalogue,refreshReferences} from './js/core/reference-catalog.js';
   const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
   const actor={id:'race-a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{CC:60,E:30,F:30},states:[],talents:[{id:'${talentId}',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
   const target={id:'race-t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{CC:30,E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
   await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'race-a',order:['race-a','race-t'],participants:[actor,target]},log:[]});
   const name='${talentId}'==='talent-master-of-disguise'?'Divertissement (Interprétation)':'Charme';
   const skill=getReferenceCatalogue().skills.find(row=>row.nom===name).id;
   const raw='${talentId}'==='talent-strike-mighty-blow'?{actorId:'race-a',targetId:'race-t',resolutionId:'race-result',action:{type:'attack',base:60,damage:4},roll:23,defense:{base:30,roll:81,v5:{kind:'melee'}},v5:{kind:'melee'}}:
    {actorId:'race-a',resolutionId:'race-result',action:{type:'skill',base:50,extensions:{fiche:{skillId:skill}}},roll:28,v5:{kind:'test',context:{influencingGroup:true},talentChoices:{'talent-master-of-disguise:sl:keep':true}}};
   const p=store.previewResolution(raw);assert.equal(p.unresolved.length,0);assert.ok(p.talentPlans.some(plan=>plan.proposals.length));
   const before=JSON.parse(store.getFullJSON());delete before.exportedAt;const revision=store.getLocalRevision();const history=store.getHistory();
   const oldText=getReferenceCatalogue().talents.find(row=>row.id==='${talentId}').description;
   const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');if(sheet==='Talents'){assert.ok(csv.includes(oldText));csv=csv.replace(oldText,'Description synthétique volontairement changée.');}return {ok:true,text:async()=>csv};}});
   assert.equal(refreshed.ok,true,refreshed.status?.error);assert.equal(store.getLocalRevision(),revision);assert.equal((await store.applyResolution(p)).status,'manual');
   const after=JSON.parse(store.getFullJSON());delete after.exportedAt;assert.deepEqual(after,before);assert.deepEqual(store.getHistory(),history);
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:new URL('..',import.meta.url),encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
 }
});

test('Contrôle 2.4 — priorité PJ exclut les snapshots importés de PNJ/créatures et types indéfinis',()=>{
 for(const kind of ['Créature','PNJ',undefined]){
  const participant=imported('synthetic-not-pj','snapshot-not-pj',[owned('talent-public-speaker')],{kind});
  const result=importedPjTalentPriorities({combat:{participants:[participant]}});
  assert.equal(result.characters,0);assert.equal(result.acquisitions,0);assert.deepEqual(result.items,[]);
 }
});

test('Contrôle 2.4 — opposition silencieuse garde les doubles réussis et victoire/défaite hors critiques de combat',async()=>{
 for(const [roll,choice] of [[61,'reverse'],[44,'keep'],[81,'keep']]){
  const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')],actor:{extensions:{v5:{hasMomentum:true}}},target:{extensions:{v5:{hasMomentum:true}}}});
  const physics=id=>{const row=person(ctx,id);return {hp:row.hp,maxHp:row.maxHp,states:structuredClone(row.states),momentum:row.extensions.v5.hasMomentum};};
  const before=[physics(ctx.actorId),physics(ctx.targetId)];
  const p=ctx.store.previewResolution({resolutionId:'control24-silent-double-'+roll,actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}},roll,defense:{base:30,roll:22,label:'Résistance',v5:{kind:'test'}},v5:{kind:'melee',choice,context:{silentTakedown:true,outsideCombat:true,targetUnaware:true,calledShot:false}}});
  assert.deepEqual(p.unresolved,[]);assert.equal(p.choiceRequired,false);assert.equal(p.damage,null);assert.equal(p.critical,null);assert.equal(p.defenderCritical,null);assert.ok(p.reminders.some(row=>/Sonné et alarme/.test(row)));
  assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.deepEqual([physics(ctx.actorId),physics(ctx.targetId)],before);
 }
});

test('Contrôle 2.4 — défense Corps à corps déguisée en Résistance ne valide pas neutralisation p135',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')]});const before=envelope(ctx.store);
 const p=ctx.store.previewResolution({resolutionId:'control24-silent-wrong-defense-kind',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}},roll:44,defense:{base:30,roll:22,label:'Résistance',v5:{kind:'melee'}},v5:{kind:'melee',choice:'keep',context:{silentTakedown:true,outsideCombat:true,targetUnaware:true,calledShot:false}}});
 assert.ok(p.unresolved.some(row=>/Neutralisation silencieuse/.test(row)));assert.equal(p.critical,null);assert.equal(p.defenderCritical,null);assert.equal((await ctx.store.applyResolution(p)).status,'manual');assert.deepEqual(envelope(ctx.store),before);
});


test('Contrôle 2.4 — arbitrage MJ unités0 conserve réussite et choix DR, puis reçu durable annulable',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-zero-mj','Divertissement (Interprétation)',{roll:20});const before=envelope(ctx.store);
 const dr=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':false}}});assert.equal(dr.sl,3);assert.equal(dr.success,true);
 const zero=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(zero.sl,0);assert.equal(zero.success,true);assert.equal(zero.test.zeroOutcome,'marginalSuccess');assert.deepEqual(envelope(ctx.store),before);
 assert.equal((await ctx.store.applyResolution(zero)).status,'applied');const detail=ctx.store.getLog()[0].detail;assert.equal(detail.sl,0);assert.equal(detail.test.success,true);assert.equal(detail.test.zeroOutcome,'marginalSuccess');assert.ok(envelope(ctx.store).appliedResolutionIds.includes(raw.resolutionId));
 const reloaded=createStore({persistence:ctx.persistence});await reloaded.ready;assert.deepEqual(reloaded.getLog()[0].detail,detail);assert.equal(JSON.parse(reloaded.getFullJSON()).log[0].detail.sl,0);
 await reloaded.undo();assert.ok(!envelope(reloaded).appliedResolutionIds?.includes(raw.resolutionId));assert.deepEqual(JSON.parse(JSON.stringify(reloaded.listParticipants())),before.combat.participants);
 await reloaded.redo();assert.ok(envelope(reloaded).appliedResolutionIds.includes(raw.resolutionId));assert.equal(reloaded.getLog()[0].detail.test.success,true);assert.equal(reloaded.getLog()[0].detail.test.zeroOutcome,'marginalSuccess');
});

test('Contrôle 2.4 — Petit homebrew raccordé sans recalcul PV/taille, avec rappel des décisions MJ',async()=>{
 const small=v5TalentCoverage('talent-small');assert.equal(small.status,'verified');assert.ok(small.clauses.some(row=>row.mode==='assisted'));assert.ok(!small.clauses.some(row=>row.mode==='pending'));assert.match(small.description,/coût 1 Momentum/);assert.doesNotMatch(small.description,/coût 1 Avantage V4/);
 const ctx=await setup({actorTalents:[owned('talent-small')],actor:{extensions:{v5:{hasMomentum:false},fiche:{size:'Petite'}}}});const before=structuredClone(person(ctx,ctx.actorId));
 const p=ctx.store.previewResolution(testInput(ctx,'control24-small-manual','Charme',{roll:20,v5:{kind:'test',actorSize:'small',targetSize:'average'}}));assert.equal(p.test.score,50);assert.equal(p.sl,3);assert.equal(p.input.v5.actorSize,'small');assert.ok(!proposals(p).some(row=>row.origins?.some(origin=>origin.talentId==='talent-small')));assert.equal((await ctx.store.applyResolution(p)).status,'applied');
 const after=person(ctx,ctx.actorId);assert.equal(after.hp,before.hp);assert.equal(after.maxHp,before.maxHp);assert.deepEqual(after.caracs,before.caracs);assert.deepEqual(after.states,before.states);assert.equal(after.extensions.fiche.size,before.extensions.fiche.size);assert.equal(after.extensions.v5.hasMomentum,false);
 const baseline=await setup();const mechanics={v5:{kind:'melee',actorSize:2,targetSize:3}};const withSmall=ctx.store.previewResolution(hitInput(ctx,'control24-small-hit',mechanics)),withoutSmall=baseline.store.previewResolution(hitInput(baseline,'control24-baseline-hit',mechanics));assert.equal(withSmall.score.base,withoutSmall.score.base+10);assert.ok(proposals(withSmall).some(row=>row.origins?.some(origin=>origin.talentId==='talent-small')));assert.equal(person(ctx,ctx.actorId).maxHp,before.maxHp);assert.deepEqual(person(ctx,ctx.actorId).caracs,before.caracs);
});
