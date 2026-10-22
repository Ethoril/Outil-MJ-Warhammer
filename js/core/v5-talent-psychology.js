import{evaluateV5Talents,hasV5Talent,acquiredV5Talents,currentV5TalentHashes,previewV5TalentConditions}from'./v5-talents.js';
import{getReferenceCatalogue}from'./reference-catalog.js';
import{situationPlan,activeSource}from'./v5-talent-situations.js';
import{acquireV5Conditions,recoverV5Condition,previewDeliciousExcruciation}from'./v5-effects.js';
import{withMomentum}from'./v5-combat-rules.js';
import{resolveV5Opposition}from'./v5-roll.js';
import{participantKeywords,specializationMatches,traitTargetMatches}from'./creature-keywords.js';
const calmId=()=>getReferenceCatalogue().skills.find(s=>s.nom==='Calme')?.id;
export function genericPsychologyOrigin(sourceKind='trait',meta={}){
 const hash=currentV5TalentHashes()['talent-large'];
 return{talentId:'talent-large',source:{effectHash:hash,reference:meta.reference||'Livre de base V5, p. 183-184'},psychologySourceKind:sourceKind,...meta};
}
const hasTrait=(subject,pattern)=>[...(subject?.traits||[]),...(subject?.states||[]).map(s=>s?.name||s?.key||'')].some(t=>pattern.test(String(t?.name||t?.label||t||'')));
/** Cible d'une spécialisation : saisie explicite du MJ (`enemyGroup`) ou mots-clés de l'ennemi (`enemy`, participant). */
const enemyTarget=(enemyGroup,enemy)=>{const keywords=enemy?participantKeywords(enemy).ids:[];return{enemyGroup:enemyGroup||undefined,enemyKeywords:keywords.length?keywords:undefined};};
export function isPsychologyImmune(subject,{kind='fear',enemyGroup=null,enemy=null,ignoreUndeadImmunity=false,ignorePsychologyImmunity=false}={}){
 if(!subject||ignorePsychologyImmunity===true)return false;
 if((subject.states||[]).some(s=>s.key==='frenzy'&&activeSource(s)))return true;
 const undead=hasTrait(subject,/mort[- ]vivant|undead/i);
 const psychImmune=hasTrait(subject,/immunit[eé].*psychologie|immune to psychology|nu[eé]e|swarm/i)||subject.extensions?.v5?.specialStates?.immuneToPsychology===true;
 if(psychImmune&&!(ignoreUndeadImmunity===true&&undead))return true;
 if((subject.states||[]).some(s=>['heart-of-the-wolf','ox-stands','beacon-of-virtue'].includes(s.key)))return true;
 if(kind==='fear'||kind==='intimidate'){
  if(hasTrait(subject,/marque de slaanesh|mark of slaanesh|sans peur.*tout/i))return true;
  if(hasTrait(subject,/belliqueux|belligerent/i)&&subject.extensions?.v5?.hasMomentum===true)return true;
  const target=enemyTarget(enemyGroup,enemy);
  if(target.enemyGroup||target.enemyKeywords){
   const fearless=acquiredV5Talents(subject).some(t=>t.talentId==='talent-fearless'&&(!t.specialization||specializationMatches(t.specialization,target)));
   const hatred=acquiredV5Talents(subject).some(t=>t.talentId==='talent-hatred'&&specializationMatches(t.specialization,target))||(subject.states||[]).some(s=>s.key==='hatred'&&specializationMatches(s.specialization,target));
   const hatredTrait=enemy&&traitTargetMatches(subject,['hatred','haine'],enemy);
   if(fearless||hatred||hatredTrait)return true;
  }
 }
 return false;
}
export function previewGenericFearEncounter({author,target,rating,sourceKind='trait',sourceId=null,sourceLabel=null,knownAlly=false,enemyGroup=null,actorSize=null,targetSize=null,aggressive=null,ignoreUndeadImmunity=false,encounterId='default-encounter',resolutionId='generic-fear'}={}){
 if(!target||!author)return{ready:false,needsInput:[{field:'participants',label:'Auteur et cible de la Peur requis.'}],unresolved:['Auteur et cible de la Peur requis.'],addedStates:[]};
 if(knownAlly===true||author.id===target.id||author.camp&&target.camp&&author.camp===target.camp&&knownAlly!==false)return{ready:true,exempt:true,reason:'known-ally',addedStates:[],unresolved:[],needsInput:[]};
 let effectiveRating=rating;
 if(sourceKind==='v5-size'){
  if(aggressive!==true)return{ready:false,needsInput:[{field:'aggressive',label:'Grande taille V5 : attitude agressive confirmée requise.'}],unresolved:['Grande taille V5 : attitude agressive confirmée requise.'],addedStates:[]};
  if(!Number.isSafeInteger(actorSize)||!Number.isSafeInteger(targetSize)||actorSize<=targetSize)return{ready:false,needsInput:[{field:'sizes',label:'Catégories de Taille explicites avec créature plus grande requises.'}],unresolved:['Catégories de Taille explicites avec créature plus grande requises.'],addedStates:[]};
  effectiveRating=1;
 }else if(sourceKind==='afraid'&&effectiveRating===undefined){
  effectiveRating=0;
 }
 if(!Number.isSafeInteger(effectiveRating)||effectiveRating<0)return{ready:false,needsInput:[{field:'rating',label:'Indice de Peur non chiffré : saisie MJ explicite requise (Q13/Q19).'}],unresolved:['Indice de Peur non chiffré : saisie MJ explicite requise (Q13/Q19).'],addedStates:[]};
 if(isPsychologyImmune(target,{kind:'fear',enemyGroup,enemy:author,ignoreUndeadImmunity}))return{ready:true,exempt:true,reason:'psychology-immunity',addedStates:[],unresolved:[],needsInput:[]};
 const already=(target.states||[]).some(s=>['fear-of-talent','fear-overcome'].includes(s.key)&&s.authorId===author.id&&s.encounterId===encounterId&&activeSource(s));
 if(already)return{ready:true,exempt:true,reason:'already-encountered',addedStates:[],unresolved:[],needsInput:[]};
 const origin=genericPsychologyOrigin(sourceKind,{sourceId,sourceLabel});
 const label=sourceLabel||(sourceKind==='afraid'?`Peureux (${effectiveRating})`:sourceKind==='v5-size'?`Peur de taille V5 (${effectiveRating})`:`Peur (${effectiveRating})`);
 const state={id:`${resolutionId}:fear:${author.id}:${target.id}`,key:'fear-of-talent',name:label,kind:'talent-pending',level:1,source:origin,authorId:author.id,targetId:target.id,rating:effectiveRating,mode:'sl',successes:0,lastAttemptRound:null,restriction:'cannotGainMomentum',encounterId,enemyGroup,enemyKeywords:participantKeywords(author).ids};
 return{ready:true,exempt:false,rating:effectiveRating,addedStates:[state],unresolved:[],needsInput:[]};
}
export function previewGenericTerrorEncounter({author,target,rating,sourceKind='trait',sourceId=null,sourceLabel=null,knownAlly=false,enemyGroup=null,ignoreUndeadImmunity=false,ignorePsychologyImmunity=false,encounterId='default-encounter',resolutionId='generic-terror'}={}){
 if(!target||!author)return{ready:false,needsInput:[{field:'participants',label:'Auteur et cible de la Terreur requis.'}],unresolved:['Auteur et cible de la Terreur requis.'],addedStates:[]};
 if(knownAlly===true||author.id===target.id||author.camp&&target.camp&&author.camp===target.camp&&knownAlly!==false)return{ready:true,exempt:true,reason:'known-ally',addedStates:[],unresolved:[],needsInput:[]};
 if(!Number.isSafeInteger(rating)||rating<1)return{ready:false,needsInput:[{field:'rating',label:'Indice de Terreur non chiffré : saisie MJ explicite requise (Q13/Q19).'}],unresolved:['Indice de Terreur non chiffré : saisie MJ explicite requise (Q13/Q19).'],addedStates:[]};
 if(isPsychologyImmune(target,{kind:'terror',enemyGroup,enemy:author,ignoreUndeadImmunity,ignorePsychologyImmunity}))return{ready:true,exempt:true,reason:'psychology-immunity',addedStates:[],unresolved:[],needsInput:[]};
 const already=(target.states||[]).some(s=>['terror-of-talent','terror-resolved'].includes(s.key)&&s.authorId===author.id&&s.encounterId===encounterId&&activeSource(s));
 if(already)return{ready:true,exempt:true,reason:'already-encountered',addedStates:[],unresolved:[],needsInput:[]};
 const terrorImmune=(target.states||[]).some(s=>s.key==='terror-immunity'&&s.encounterId===encounterId&&activeSource(s));
 if(terrorImmune){
  const fear=previewGenericFearEncounter({author,target,rating,sourceKind,sourceId,sourceLabel:sourceLabel||`Peur après Terreur (${rating})`,knownAlly:false,enemyGroup,ignoreUndeadImmunity,encounterId,resolutionId});
  return{...fear,downgradedToFear:true};
 }
 const origin=genericPsychologyOrigin(sourceKind,{sourceId,sourceLabel});
 const label=sourceLabel||`Terreur (${rating})`;
 const state={id:`${resolutionId}:terror:${author.id}:${target.id}`,key:'terror-of-talent',name:label,kind:'talent-pending',level:1,source:origin,authorId:author.id,targetId:target.id,rating,mode:'sl',successes:0,restriction:null,encounterId,enemyGroup};
 return{ready:true,exempt:false,downgradedToFear:false,rating,addedStates:[state],unresolved:[],needsInput:[]};
}
export function resolveGenericFearTest({actor,fearEffectId,test,round=1,enemyGroup=null}={}){
 const fears=(actor?.states||[]).filter(s=>s.key==='fear-of-talent'&&activeSource(s));
 const existing=fears.find(s=>s.id===fearEffectId);
 if(!existing)return{ready:false,error:'Effet de Peur actif introuvable.'};
 if(fears.some(s=>s.rating>existing.rating))return{ready:false,error:'Peur : commencer par la source au degré le plus élevé.'};
 if(existing.mode==='sl'&&Number.isSafeInteger(existing.lastAttemptRound)&&existing.lastAttemptRound===round)return{ready:false,error:'Peur : une seule tentative de Test étendu par Round.'};
 if(!test||typeof test.success!=='boolean'||!Number.isInteger(test.sl))return{ready:false,error:'Résultat du Test de Calme requis.'};
 const group=enemyGroup??existing.enemyGroup;
 const immune=isPsychologyImmune(actor,{kind:'fear',enemyGroup:group,enemy:existing.enemyKeywords?.length?{keywords:existing.enemyKeywords}:null});
 const delta=test.success?(existing.mode==='sl'?Math.max(0,test.sl):1):0;
 const nextSuccesses=existing.successes+delta;
 const overcome=immune||test.success&&nextSuccesses>=existing.rating;
 const affectedIds=new Set((overcome?fears.filter(s=>s.rating<=existing.rating):[existing]).map(s=>s.id));
 const nextStates=(actor.states||[]).map(s=>{
  if(!affectedIds.has(s.id))return s;
  if(overcome)return{...s,key:'fear-overcome',name:'Peur surmontée',successes:s.id===existing.id?nextSuccesses:s.successes,lastAttemptRound:round,restriction:null};
  return{...s,successes:nextSuccesses,lastAttemptRound:round};
 });
 return{ready:true,overcome,successes:nextSuccesses,rating:existing.rating,participant:{...actor,states:nextStates}};
}
export function resolveGenericTerrorTest({actor,terrorEffectId,test,encounterId='default-encounter',round=1,state=null,clock={}}={}){
 const terrors=(actor?.states||[]).filter(s=>s.key==='terror-of-talent'&&activeSource(s));
 const effect=terrors.find(s=>s.id===terrorEffectId);
 if(!effect)return{ready:false,error:'Effet de Terreur actif introuvable.'};
 if(terrors.some(s=>s.rating>effect.rating))return{ready:false,error:'Terreur : commencer par le degré le plus élevé.'};
 if(!test||typeof test.success!=='boolean'||!Number.isInteger(test.sl))return{ready:false,error:'Résultat du Test de Calme contre la Terreur requis.'};
 const affected=terrors.filter(s=>s.rating<=effect.rating);
 const affectedIds=new Set(affected.map(s=>s.id));
 const followUpStates=affected.flatMap(s=>[
  {...s,key:'terror-resolved',name:'Terreur résolue'},
  {...s,id:s.id+':fear',key:'fear-of-talent',name:`Peur (${s.rating})`,mode:'sl',successes:0,lastAttemptRound:null,restriction:'cannotGainMomentum'}
 ]);
 if(test.success){
  followUpStates.push({id:`${effect.id}:terror-immunity`,key:'terror-immunity',name:'Terreur surmontée pour cette rencontre',kind:'talent-pending',level:1,source:effect.source,encounterId:effect.encounterId||encounterId});
 }
 let nextParticipant={...actor,states:[...(actor.states||[]).filter(s=>!affectedIds.has(s.id)),...followUpStates]};
 let brokenAdded=0;
 if(!test.success){
  const rawBroken=effect.rating+Math.max(0,-test.sl-1);
  const proposed=[{key:'brise',name:'Brisé',level:rawBroken,source:{kind:'talent',talentId:effect.source.talentId,talentOrigins:[effect.source]}}];
  const reduced=previewV5TalentConditions(nextParticipant,proposed,{state,clock,actionId:`${effect.id}:terror-broken`});
  const receipt=acquireV5Conditions(nextParticipant,reduced.states,{resolutionId:`${effect.id}:terror-broken`,authorId:effect.authorId,targetId:actor.id,round,source:{}});
  nextParticipant=receipt.participant;
  brokenAdded=reduced.states.reduce((sum,s)=>sum+(s.level||1),0);
 }
 return{ready:true,passed:test.success,brokenAdded,followUpFearRating:effect.rating,participant:nextParticipant};
}
export const PSYCHOLOGY_ACTIONS=[{id:'large-fear',owner:'large',name:'Grande taille : Peur',noTest:true},{id:'frightening',owner:'frightening',name:'Effrayant : rencontrer les adversaires',noTest:true},{id:'hatred',owner:'hatred',name:'Haine : se retenir',skill:'Calme',attr:'FM'},{id:'vice',owner:'vice',name:'Vice : résister ou mettre fin à l’excès',skill:'Calme',attr:'FM'},{id:'vice-exhausted',owner:'vice',name:'Vice : excès jusqu’à l’insensibilité',noTest:true},{id:'satisfy-vice',owner:'vice',name:'Vice : satisfaction confirmée',noTest:true}];
export function fearAction(subject){return(subject.states||[]).some(s=>s.key==='fear-of-talent'&&activeSource(s))?{id:'activate:overcome-fear',note:'Effrayant : surmonter la Peur',type:'skill',attr:'FM',base:subject.skills?.find(s=>s.id===calmId()&&s.status==='resolved')?.total??subject.caracs?.FM,mod:0,qualities:[],extensions:{fiche:{skillId:calmId()},v5:{kind:'test',initialContext:{talentAction:'overcome-fear',psychologyKind:'fear'}}}}:null;}
export function previewPsychologyActivation(n,test){
 const c=n.v5.context||{},id=c.talentAction,row=PSYCHOLOGY_ACTIONS.find(r=>r.id===id);if(!row&&id!=='overcome-fear')return null;
 const existing=(n.actor.states||[]).find(s=>s.key==='fear-of-talent'&&s.id===c.fearEffectId&&activeSource(s));
 const plan=id==='overcome-fear'?{proposals:existing?[{op:'activateTalent',origins:[existing.source]}]:[],ready:true,unresolved:[]}:situationPlan(n.actor,id);
 const origin=plan.proposals[0]?.origins[0],changes=[],conditions=[],unresolved=[],reminders=[];
 if(!origin)unresolved.push('Psychologie de talent indisponible ou source à revalider.');
 if(row?.noTest&&!n.noTestAction)unresolved.push('Cette Psychologie exige son action propre sans jet.');
 if(!row?.noTest&&(n.action.extensions?.fiche?.skillId??c.skillId)!==calmId())unresolved.push('Test de Psychologie : compétence Calme requise.');
 const state=(key,name,subject,extra={})=>({id:n.resolutionId+':'+key+':'+subject.id,key,name,kind:'talent-pending',level:1,source:origin,authorId:n.actor.id,targetId:subject.id,...extra});
 if(id==='frightening'||id==='large-fear'){
  if(!Number.isSafeInteger(n.v5.actorSize)||!Array.isArray(c.frightenedIds)||!c.frightenedIds.length)unresolved.push('Effrayant : Taille et ennemis rencontrés explicites requis.');
  if(id==='large-fear'&&c.aggressive!==true)unresolved.push('Grande taille : attitude agressive confirmée requise.');
  for(const pid of c.frightenedIds||[]){const p=n.v5State?.participants?.find(p=>p.id===pid);if(!p||p.camp===n.actor.camp||p.id===n.actor.id)unresolved.push('Effrayant : adversaire introuvable.');else if(id==='large-fear'&&(!Number.isSafeInteger(c.frightenedSizes?.[pid])||c.frightenedSizes[pid]>=n.v5.actorSize))unresolved.push('Grande taille : catégorie plus petite de chaque créature requise.');else if(!(p.states||[]).some(s=>['fear-of-talent','fear-overcome'].includes(s.key)&&s.authorId===n.actor.id&&s.encounterId===n.v5Clock.encounterId))changes.push({participantId:pid,add:[state('fear-of-talent',id==='large-fear'?'Peur de Grande taille (1)':'Peur d’Effrayant : '+(n.v5.actorSize===4?2:1)+' réussite(s)',p,{rating:id==='frightening'&&n.v5.actorSize===4?2:1,mode:id==='large-fear'?'sl':'successes',successes:0,restriction:'cannotGainMomentum',encounterId:n.v5Clock.encounterId})]});}
 }
 if(id==='overcome-fear'){
  if(!existing||existing.mode!=='sl'&&!n.v5Clock.turnId?.endsWith(':'+n.actor.id))unresolved.push('Effrayant : effet identifié et Test pendant votre Tour requis.');
  const fears=(n.actor.states||[]).filter(s=>s.key==='fear-of-talent'&&activeSource(s));
  if(existing&&fears.some(s=>s.rating>existing.rating))unresolved.push('Peur : commencer par la source au degré le plus élevé.');
  if(existing&&test.success&&!unresolved.length){const immunity=evaluateV5Talents(n.actor,{event:'test.beforeRoll',role:'actor',context:{skillId:calmId(),psychologyKind:'fear',enemyGroup:c.enemyGroup},includeTalents:['talent-fearless','talent-hatred']});plan.proposals.push(...immunity.proposals);const successes=existing.successes+(existing.mode==='sl'?Math.max(0,test.sl):1),overcome=immunity.proposals.some(p=>p.op==='forceTestSuccess')||successes>=existing.rating;const affected=overcome?fears.filter(s=>s.rating<=existing.rating):[existing];plan.proposals.push(...affected.map(s=>({origins:[s.source]})));changes.push({participantId:n.actor.id,removeIds:affected.map(s=>s.id),add:affected.map(s=>({...s,key:overcome?'fear-overcome':s.key,name:overcome?'Peur surmontée':s.name,successes:s.id===existing.id?successes:s.successes,restriction:overcome?null:s.restriction}))});}
 }
 if(['hatred','vice','satisfy-vice','vice-exhausted'].includes(id)){
  const owner=row.owner,acquired=acquiredV5Talents(n.actor).find(t=>t.talentId==='talent-'+owner&&t.specialization===c.psychologySpecialty);
  if(!acquired)unresolved.push('Choisir une spécialité de Psychologie acquise.');
  const active=(n.actor.states||[]).find(s=>s.key===owner&&s.specialization===c.psychologySpecialty&&activeSource(s));
  if(id==='hatred'){
   if(c.hatredRetry===true&&(c.endOfRound!==true||n.v5Clock.round<2))unresolved.push('Haine : nouvelle tentative en fin de Round après le premier.');
   if(!unresolved.length)changes.push({participantId:n.actor.id,removeIds:(n.actor.states||[]).filter(s=>s.key==='hatred'&&s.specialization===c.psychologySpecialty).map(s=>s.id),add:[state('hatred',test.success?'Haine contrôlée':'Haine : détruire le groupe au plus vite',n.actor,{controlled:test.success,specialization:c.psychologySpecialty,encounterId:n.v5Clock.encounterId})]});
  }
  if(id==='vice'){
   if(c.viceRetry===true&&(c.endOfRound!==true||!active||n.v5Clock.round<=active.startedRound))unresolved.push('Vice : reprise en fin d’un Round suivant requise.');
   if(!unresolved.length){if(test.success&&c.viceRetry)changes.push({participantId:n.actor.id,removeIds:[active.id]});else if(!test.success)changes.push({participantId:n.actor.id,removeIds:(n.actor.states||[]).filter(s=>s.key==='vice'&&s.specialization===c.psychologySpecialty).map(s=>s.id),add:[state('vice','Vice : abandon des autres actions',n.actor,{specialization:c.psychologySpecialty,startedRound:n.v5Clock.round,compelled:true})]});}
  }
  if(id==='satisfy-vice'){
   if(c.viceSatisfied!==true)unresolved.push('Confirmer la satisfaction du vice.');
   else changes.push({participantId:n.actor.id,removeIds:(n.actor.states||[]).filter(s=>['vice','vice-abstinence'].includes(s.key)&&s.specialization===c.psychologySpecialty).map(s=>s.id)});
  }
  if(id==='vice-exhausted'){
   if(!active||c.insensible!==true)unresolved.push('Vice : compulsion en cours et insensibilité atteinte requises.');
   else{conditions.push({key:'extenue',name:'Exténué',level:1,source:{kind:'talent',talentId:origin.talentId,talentOrigins:[origin]}});changes.push({participantId:n.actor.id,removeIds:[active.id]});}
  }
 }
 return{plan,changes,conditions,unresolved,reminders};
}
export function psychologyTestRules(n,subject,action,settings,{kind,defending}){
 const c=settings.context||{},plans=[],modifiers=[],advantages=[],restrictions=[],unresolved=[];
 if((action.extensions?.fiche?.skillId??c.skillId)===calmId()&&hasTrait(subject,/[àa] sang[- ]froid|cold[- ]blooded/i))advantages.push({id:'trait:cold-blooded',label:'À Sang-froid : Avantage aux Tests de Calme'});
 const terror=(subject.states||[]).find(s=>s.key==='terror-of-talent'&&activeSource(s));if(terror&&!(subject.states||[]).some(s=>s.key==='frenzy'&&activeSource(s))&&c.talentAction!=='overcome-terror'&&c.mandatoryTest!==true)restrictions.push('Terreur : résoudre le Test de Calme initial avant cette Action.');
 const fear=(subject.states||[]).find(s=>s.key==='fear-of-talent'&&activeSource(s)),target=defending?n.actor:n.target;
 if(!defending&&kind==='melee'&&!(target?.states||[]).some(s=>s.key==='frenzy'&&activeSource(s))&&(target?.states||[]).some(s=>s.key==='fear-of-talent'&&s.authorId===subject.id&&activeSource(s)))advantages.push({id:'talent:frightening',label:'Effrayant : Peur non surmontée'});
 if(fear)plans.push({proposals:[{origins:[fear.source]}]});
 const frenzy=(subject.states||[]).some(s=>s.key==='frenzy'&&activeSource(s));
 if(frenzy&&c.psychologyKind&&c.psychologyKind!=='none')restrictions.push('Frénésie : immunité aux autres Psychologies ; aucun Test de ce type à effectuer.');
 const hatred=(subject.states||[]).find(s=>s.key==='hatred'&&activeSource(s));if(hatred){plans.push({proposals:[{origins:[hatred.source]}]});if(c.enemyGroup===hatred.specialization&&(action.attr==='Soc'||c.socialTest===true)&&c.mandatoryTest!==true)restrictions.push('Haine : aucune interaction sociale normale avec ce groupe.');if(!hatred.controlled&&!['hatred'].includes(c.talentAction)&&c.mandatoryTest!==true&&c.destroyingHatedGroup!==true)restrictions.push('Haine : action consacrée à détruire le groupe au plus vite requise.');}
 const vice=(subject.states||[]).find(s=>s.key==='vice'&&s.compelled&&activeSource(s));
 if(vice&&!['vice','vice-exhausted','satisfy-vice'].includes(c.talentAction)&&c.mandatoryTest!==true)restrictions.push('Vice : aucune autre Action pendant la compulsion.');
 if(hasV5Talent(subject,'talent-vice')){
  const plan=situationPlan(subject,'vice');plans.push(plan);
  if(plan.proposals.length&&action.attr==='Soc'&&c.viceWitness===true)modifiers.push({id:'talent:vice-witness',label:'Témoin d’un excès du vice',amount:-2});
  if(plan.proposals.length&&(c.talentAction==='vice'||c.psychologyKind&&c.psychologyKind!=='none')){if(!Number.isSafeInteger(c.abstinentDays)||c.abstinentDays<0)unresolved.push('Vice : nombre de jours entiers d’abstinence requis.');else if(c.abstinentDays)modifiers.push({id:'talent:vice-abstinence',label:'Abstinence du vice',amount:-2*c.abstinentDays});}
 }
 return{plans,modifiers,advantages,restrictions,unresolved};
}
const intFail=(error,field)=>({ready:false,error,needsInput:field?[{field,label:error}]:[],unresolved:[error],addedStates:[],participants:[]});
/** Intimidation en combat (L06 p.169) : un groupe visé impose −2 DR à l'intimidateur. */
export function combatIntimidationModifiers({targetGroup=false}={}){return targetGroup===true?[{id:'intimidation-group',label:'Intimidation d’un groupe (−2 DR)',amount:-2}]:[];}
/** Défense d'un groupe : Calme du chef s'il est organisé, sinon le plus faible Calme. */
export function groupIntimidationDefenceSl({organizedGroup,chiefSl,calmSls=[]}={}){
 if(organizedGroup===true)return Number.isSafeInteger(chiefSl)?chiefSl:null;
 const list=calmSls.filter(Number.isSafeInteger);return list.length?Math.min(...list):null;
}
/** Intimidation opposée à Calme : Peur 1 + (DR net − 1) envers l'intimidateur ; l'égalité revient à l'initiateur (V5). */
export function previewCombatIntimidation({author,target,authorTest,defenceTest,encounterId='default-encounter',theft=false,resolutionId='combat-intimidation'}={}){
 if(!author||!target)return intFail('Intimidateur et cible requis.','participants');
 if(!Number.isSafeInteger(authorTest?.sl)||!Number.isSafeInteger(defenceTest?.sl))return intFail('DR d’Intimidation et de Calme requis.','tests');
 const reminders=[];
 if(theft)reminders.push('Vol : un PJ intimidé subit la Peur ; ses biens ne sont pas remis automatiquement.');
 const out={reminders,forcedHandover:false,netSl:authorTest.sl-defenceTest.sl};
 if(resolveV5Opposition(authorTest,defenceTest).winner!=='initiator')return{...out,ready:true,exempt:false,addedStates:[],needsInput:[],unresolved:[]};
 if(isPsychologyImmune(target,{kind:'intimidate'}))return{...out,ready:true,exempt:true,reason:'psychology-immunity',addedStates:[],needsInput:[],unresolved:[]};
 const rating=1+Math.max(0,out.netSl-1);
 const fear=previewGenericFearEncounter({author,target,rating,sourceKind:'intimidation',sourceLabel:`Intimidation (${rating})`,knownAlly:false,encounterId,resolutionId});
 return{...fear,...out,reminders};
}
/** Hurlement spectral V5 (L06 p.358) : 1 Élan, dégâts directs, Assourdi, puis Calme +2 DR sinon Brisé. */
export function previewGhostlyHowl({author,targets,damageRoll,calmTests,round}={}){
 if(!author||!Array.isArray(targets)||!targets.length)return intFail('Auteur et cibles requis.','participants');
 if(author.extensions?.v5?.hasMomentum!==true)return intFail('Hurlement spectral : un Élan à dépenser est requis.','momentum');
 if(!Number.isSafeInteger(damageRoll)||damageRoll<1||damageRoll>10)return intFail('Jet de 1d10 de dégâts requis.','damageRoll');
 const participants=[];
 for(const t of targets){
  const immune=isPsychologyImmune(t,{kind:'fear'});
  const test=calmTests?.[t.id];
  if(!immune&&(typeof test?.success!=='boolean'||!Number.isSafeInteger(test.sl)))return intFail('Test de Calme (+2 DR) requis pour '+t.id+'.','calmTests');
  const conditions=[{name:'Assourdi',level:1,source:{kind:'ghostly-howl'}}];
  if(!immune&&!test.success)conditions.push({name:'Brisé',level:1,source:{kind:'ghostly-howl'}});
  const hit={...t,hp:Math.max(0,Number(t.hp)-damageRoll)};
  participants.push(acquireV5Conditions(hit,conditions,{round,authorId:author.id}).participant);
 }
 return{ready:true,calmModifier:2,author:withMomentum(author,false),participants,needsInput:[],unresolved:[],addedStates:[]};
}
/** Craintif / Skittish : 3 Brisé devant un effet magique visible ou un bruit violent, sauf dressage adapté. */
export function previewSkittishReaction({subject,trigger,visible=true,training=null,isolatedVoice=false,round}={}){
 if(!subject)return intFail('Créature requise.','subject');
 if(!['magic','noise'].includes(trigger))return intFail('Déclencheur explicite requis : effet magique ou bruit violent.','trigger');
 const skittish=hasTrait(subject,/craintif|skittish/i);
 const spared=!skittish||trigger==='magic'&&(visible===false||training==='Magie')||trigger==='noise'&&(training==='Guerre'||isolatedVoice===true);
 if(spared)return{ready:true,reacted:false,participant:subject,needsInput:[],unresolved:[]};
 const receipt=acquireV5Conditions(subject,[{name:'Brisé',level:3,source:{kind:'skittish'}}],{round});
 return{ready:true,reacted:true,participant:receipt.participant,needsInput:[],unresolved:[]};
}
/** Animosité : supplantée dès qu'une Peur ou une Terreur est active. */
export function isAnimosityOverridden(subject){return(subject?.states||[]).some(s=>['fear-of-talent','terror-of-talent'].includes(s.key));}
export function untrainedMountDisadvantage({training}={}){return training==='Guerre'?null:{id:'mount:untrained-war',label:'Monture non dressée à la guerre : Désavantage'};}
/** Cavalier accompli : taille de la monture si la Peur ou la Terreur ne vient que de la Taille adverse. */
export function effectiveSizeAgainstFear({riderSize,mountSize,accomplishedRider=false,sizeOnlyCause=false}={}){return accomplishedRider===true&&sizeOnlyCause===true&&Number.isSafeInteger(mountSize)?mountSize:riderSize;}
/* Sources de Peur, Terreur et Brisé des suppléments ramenées à V5 (C05). Conversions V4→V5 (Q17) : ±10 % = ±1 DR, ±20 % = ±2 DR, +40 % = +4 DR, Avantage = Élan. */
const F=(rating,x={})=>({k:'fear',rating,...x}),FMJ=(x={})=>({k:'fear',ratingFact:'rating',...x}),FOC=(base,every,x={})=>({k:'fear',ratingBase:base,every,...x});
const TE=(rating,x={})=>({k:'terror',rating,...x}),TOC=(base,every,x={})=>({k:'terror',ratingBase:base,every,...x}),TMJ=(x={})=>({k:'terror',ratingFact:'rating',...x});
const R=text=>({k:'reminder',text}),M=(label,amount,scope='')=>({k:'modifier',label,amount,scope}),G=(trait,duration='',x={})=>({k:'grant',trait,duration,...x});
const C=(name,level=1,x={})=>({k:'condition',name,level,...x}),B=(modifier,broken,x={})=>({k:'calmBroken',modifier,broken,...x}),P=(x={})=>({k:'purge',...x}),SP=(x={})=>({k:'spendMomentum',...x});
export const PSYCHOLOGY_SOURCES=Object.freeze([
 {ids:['C0-L06-048'],name:'Symptôme Fièvre',steps:[M('Fièvre : Psychologie, Agilité et Dextérité',-2,'psychology,Ag,Dex')]},
 {ids:['C0-L06-049'],name:'Corruption : moral vacillant',steps:[R('Un échec contre une Peur donne Brisé ; d’autres mutations mentales peuvent imposer Animosité ou Frénésie (MJ).')]},
 {ids:['C0-L06-052'],name:'Fureur de Myrmidia',steps:[G('Frénésie','durée du miracle')]},
 {ids:['C0-L06-053'],name:'Apaisement de Shallya',steps:[G('Psychologie suspendue','durée du miracle'),R('Puis sommeil ; un dormeur réticent résiste par Calme.')]},
 {ids:['C0-L06-054'],name:'Flambeau de vertu',steps:[P(),G('Sans peur (tout)','tant que le prêtre est vu'),FMJ({scope:'enemies',label:'Peur des orques et gobelins'})]},
 {ids:['C0-L06-056'],name:'Fureur d’Ulric',steps:[R('Test de Frénésie gratuit aux Tours alliés ; dégâts explosifs sur la première touche de mêlée à la place de l’attaque gratuite.')]},
 {ids:['C0-L06-057'],name:'Incident mineur : visions',steps:[B(-2,1)]},
 {ids:['C0-L06-060'],name:'Effrayant : sort',steps:[FOC(1,3)]},
 {ids:['C0-L06-061'],name:'Terrifiant : sort',steps:[TOC(1,3)]},
 {ids:['C0-L06-062'],name:'Attribut des Bêtes V5',steps:[F(1,{duration:'BFM Rounds'})]},
 {ids:['C0-L06-063'],name:'Peau du chasseur et Wyssan',variants:{hunter:[F(1)],wyssan:[F(1),G('Frénésie'),G('Belliqueux')]}},
 {ids:['C0-L06-064','C0-L17-022'],name:'Voile pourpre',steps:[FOC(1,3),R('Le Vortex d’âmes inflige son Brisé directement (voir Vortex d’âmes).')]},
 {ids:['C0-L06-065','C0-L17-019'],name:'Destrier d’ombre et ombre vagabonde',steps:[F(1,{scope:'witnesses'}),R('Peur 1 tant que le destrier n’est pas au soleil ; les Tests des témoins restent à lancer.')]},
 {ids:['C0-L06-066'],name:'Horreur obsédante',steps:[C('Exténué',1),R('Psychologie ratée : encore Exténué et Brisé, verrouillés jusqu’à la sortie de la zone.')]},
 {ids:['C0-L06-067'],name:'Mauvais œil',steps:[R('Intimidation opposée à Calme avec les DR de lancement : victoire = Peur 1 et Exténué ; 6 DR d’écart = aussi Brisé.')],opposition:true},
 {ids:['C0-L06-068'],name:'Crâne hurlant',steps:[B(0,1)]},
 {ids:['C0-L06-069'],name:'Attribut de Slaanesh',steps:[M('Peur/Terreur',2,'fear,terror'),M('Animosité/Haine/Corruption',-2,'animosity,hatred,corruption')]},
 {ids:['C0-L06-070'],name:'Vortex d’âmes',steps:[C('Brisé',1)]},
 {ids:['C0-L06-071','C0-L17-025'],name:'Cœurs enflammés et Le Bœuf reste debout',steps:[P({scope:'allies',withExhausted:true}),R('Test de Frénésie facultatif (Cœurs enflammés) ; dispense de Peur/Terreur pendant la durée (Bœuf).')]},
 {ids:['C0-L06-072'],name:'Couronne de flamme',steps:[F(1),R('Chef de guerre ; la surincantation augmente la Peur ou le Chef de guerre.')]},
 {ids:['C0-L06-073'],name:'Protection de Phâ',steps:[C('Brisé',1,{scope:'forbidden-in-zone'}),R('Brisé jusqu’à la sortie de la zone ; pas une guérison.')]},
 {ids:['C0-L01-002'],name:'Braingobbler',steps:[F(2,{duration:'BFM Rounds'}),M('Tête d’un proche : Tests contre cette Peur',-2,'this-fear')]},
 {ids:['C0-L01-003'],name:'Dolorous et Bold Brass',variants:{dolorous:[F(1)],boldBrass:[G('Immunité à la Peur'),M('Terreur',2,'terror')]}},
 {ids:['C0-L01-004'],name:'Amulet of Righteous Silver',steps:[G('Immunité à la Peur'),M('Terreur',2,'terror')]},
 {ids:['C0-L02-001'],name:'Fellstave',steps:[B(0,1,{scope:'type-in-100-yards'}),R('À la récupération de Brisé : Intuition (+0) ; un échec révèle la panique d’origine magique (formulation imprimée conservée, Q14).')]},
 {ids:['C0-L02-002'],name:'Protection Pouch',steps:[M('Calme contre le surnaturel (Peur/Terreur démoniaque ou morte-vivante)',1,'fear,terror'),R('Une semaine, prolongeable par DR.')]},
 {ids:['C0-L02-003'],name:'Face of the Wild',steps:[F(1,{duration:'jusqu’au prochain Tour'}),R('Coûte un DR canalisé.')]},
 {ids:['C0-L02-004'],name:'Fervent Bellow',steps:[P({amount:1,scope:'ally'}),R('Coûte trois DR canalisés ; l’allié doit entendre.')]},
 {ids:['C0-L02-005','C0-L04-001'],name:'Rhya’s Rage et Moment of Clarity',steps:[G('Immunité à la Psychologie','BSoc Rounds')]},
 {ids:['C0-L04-002'],name:'Rally Round',steps:[R('Bonus de Calme et d’Endurance aux alliés de statut Bronze, selon l’effectif ; aucun effet sur Argent/Or.')]},
 {ids:['C0-L04-003'],name:'Pax of Taal',steps:[R('Animaux Bestiaux non corrompus apaisés ; ne retire pas Brisé automatiquement.')]},
 {ids:['C0-L07-001','C0-L08-007'],name:'Apothéose',steps:[F(1,{duration:'1 Round'}),R('Variante Slann : l’indice augmente par 2 DR supplémentaires.')]},
 {ids:['C0-L07-002'],name:'Nœud géomantique terrifiant',steps:[TE(3,{scope:'chaos-category'})]},
 {ids:['C0-L07-003'],name:'Bénédictions de ponte',steps:[R('Sans peur contre des groupes précis ou Haine des skavens selon le tableau (à confirmer).')]},
 {ids:['C0-L07-004'],name:'Stationary Attacker',steps:[G('Immunité à la Psychologie'),R('Aucun déplacement ni Fuite.')]},
 {ids:['C0-L07-005','C0-L11-007'],name:'Carnosaur : Blood Frenzy',steps:[G('Frénésie','jusqu’à la mort des ennemis détectés',{trigger:'première Blessure infligée'})]},
 {ids:['C0-L07-006'],name:'Dread Saurian : Fearsome Roar',variants:{huge:[B(-1,0,{onFailFear:true})],other:[B(-2,0,{onFailFlee:true})]}},
 {ids:['C0-L07-007','C0-L12-005'],name:'Attribut Waaagh!',steps:[P({scope:'greenskins-in-range'})]},
 {ids:['C0-L07-008'],name:'Malédiction magique d’exploration',steps:[R('Calme raté : fuite des visions ; la récupération est suivie d’Exténué.')]},
 {ids:['C0-L07-009'],name:'Nuage de spores',steps:[R('Échec d’Endurance : dégâts directs et Frénésie automatique aux combats de l’aventure.')]},
 {ids:['C0-L08-002'],name:'Obsession elfique',steps:[R('Une fois par séance, avec accord du MJ : choisir l’issue d’un Test de Psychologie contraire à l’obsession.')]},
 {ids:['C0-L08-003'],name:'Writhing Mists',steps:[F(1,{scope:'allies',overcastExtra:3})]},
 {ids:['C0-L08-004'],name:'Aeskhaine Madness',steps:[G('Frénésie permanente'),R('Pénalités d’Intelligence, de Volonté et de Sociabilité.')]},
 {ids:['C0-L08-005'],name:'Prières privées à Khaine',steps:[R('Résolution temporaire contre les Tests de Prière ; Animosité, Haine ou Frénésie selon le rite et les Tests de Calme.')]},
 {ids:['C0-L08-006'],name:'Calme (sort)',steps:[R('Après le Test de Sociabilité du lanceur : retire les Psychologies désignées et Frénésie ; ni Terreur ni Brisé.')]},
 {ids:['C0-L08-008'],name:'Main de gloire',variants:{plus3:[P()],plus8:[P(),C('Exténué',0,{remove:true}),G('Immunité à la Psychologie','durée')]}},
 {ids:['C0-L09-004'],name:'Complications du Dhar',steps:[R('Certains résultats imposent Peur ou Haine du lanceur après Calme raté (intervalles à confirmer visuellement, Q11).')]},
 {ids:['C0-L09-005'],name:'Poisoned Whispers',steps:[G('Psychologie imposée','BFM Rounds'),R('Opposition de résistance au lanceur ; Test quotidien au lever du soleil (rappel, Q12).')]},
 {ids:['C0-L09-006'],name:'Shroud of Despair',steps:[C('Exténué',1),B(0,1,{duration:'BFM Rounds'})]},
 {ids:['C0-L09-007'],name:'Stolen Aspect',steps:[B(-3,0,{onFailShare:true})]},
 {ids:['C0-L11-001'],name:'Bonebreaker détruit',variants:{rider:[C('Brisé',5)],skaven:[C('Brisé',1)],mounted:[G('Immunité à la Psychologie','tant que monté')]}},
 {ids:['C0-L11-002'],name:'Unique Experiment',steps:[M('Calme contre sa Peur ou Terreur (Difficile −10)',-1,'fear,terror')]},
 {ids:['C0-L11-003'],name:'Amibe et feu',steps:[G('Immunité à la Psychologie'),C('Brisé',1,{trigger:'feu approché'})]},
 {ids:['C0-L11-008'],name:'Shard Dragon : Rabid Frenzy',steps:[G('Frénésie','irrépressible',{trigger:'première Blessure reçue'}),R('Deux Tests de mêlée gratuits par Round.')]},
 {ids:['C0-L11-009'],name:'Breath of Nightmares',steps:[TE(2,{testKey:'endurance',ignorePsychologyImmunity:true})]},
 {ids:['C0-L11-011'],name:'Bouclier de poudre de revenant',steps:[R('Les morts-vivants sont perçus vivants : leur Peur disparaît sauf si cette forme la causait déjà.')]},
 {ids:['C0-L11-012'],name:'Wulfshowl',steps:[F(2,{scope:'wolves-lions-goats-chimeras'})]},
 {ids:['C0-L11-014'],name:'Fury',variants:{hatred:[R('Dépenser 1 Élan : Haine des adversaires proches.')],frenzy:[R('Dépenser 3 Élan : Frénésie, puis perte de tout l’Élan.')]}},
 {ids:['C0-L11-018'],name:'Borrowed Courage',steps:[R('Le gobelin monté sur une araignée géante ne subit pas Effrayé envers les elfes.')]},
 {ids:['C0-L11-019'],name:'Endless Malice : témoins',steps:[F(2,{scope:'witnesses'})]},
 {ids:['C0-L12-001'],name:'Gastromancie : Brisé ignoré',steps:[G('Brisé ignoré (non retiré)','BFM Rounds')]},
 {ids:['C0-L12-002'],name:'Incident de gastromancie 61–65',steps:[G('Frénésie','le boucher')]},
 {ids:['C0-L12-003'],name:'Hungry Troll',steps:[G('Frénésie','jusqu’à un repas de taille moyenne ou plus')]},
 {ids:['C0-L12-004'],name:'Incident chamanique 51–55',steps:[R('Dégâts au chamane ; orques/gobelins proches : Endurance ou Blessure directe et Frénésie.')]},
 {ids:['C0-L12-006'],name:'WAAAGH!',steps:[P({scope:'greenskins-in-zone'}),R('Bonus de Calme, d’Endurance et d’Élan pendant la durée.')]},
 {ids:['C0-L13-003'],name:'Tenez bon',steps:[G('Aucun nouveau Brisé allié','durée',{lock:'brise'})]},
 {ids:['C0-L13-004'],name:'Dévotion de la Vierge guerrière',steps:[G('Sans peur d’un ennemi choisi (Peur seulement)')]},
 {ids:['C0-L15-003'],name:'Pierre des serments',steps:[M('Tests contre les déplacements forcés, dont ceux qui empêchent Brisé',2,'forced-movement')]},
 {ids:['C0-L15-004'],name:'Rune of Daunting',steps:[FMJ({ratingFact:'runeCount',scope:'self'}),R('Arme dégainée : indice de Peur égal au nombre de runes, ou majoration d’un indice déjà possédé.')]},
 {ids:['C0-L15-005'],name:'Rune of Courage',steps:[M('Tests de Psychologie par rune',1,'psychology')]},
 {ids:['C0-L15-006'],name:'Rune of the Valiant',steps:[M('Volonté par rune',1,'FM')]},
 {ids:['C0-L15-007'],name:'Rune of Hearth and Home',steps:[R('À 25 yards de l’Enclume : le résultat de Calme est considéré comme 01 jusqu’à la fin du prochain Round.')]},
 {ids:['C0-L16-001'],name:'Master Rune of Dismay',steps:[M('Tous les Tests des ennemis non immunisés, 1 Round',-1,'enemies')]},
 {ids:['C0-L17-001'],name:'Incident : The Horror',steps:[B(-2,1)]},
 {ids:['C0-L17-002'],name:'Stoicism de Hysh',steps:[M('Tests de Calme de Psychologie (obligatoires quand possible)',2,'psychology')]},
 {ids:['C0-L17-003'],name:'Red Mist d’Aqshy',steps:[R('Surpris : Calme +2 DR ; échec = Frénésie en combat, Animosité envers tous hors combat.')]},
 {ids:['C0-L17-004'],name:'Savage Gaze de Ghur',steps:[R('Défense par Volonté contre certains animaux ; un Critique donne des Brisé selon les Blessures de la table de tête.')]},
 {ids:['C0-L17-005'],name:'Claustrophobia de Ghur',steps:[B(4,1,{note:'Calme +4 DR (V4 +40)'})]},
 {ids:['C0-L17-007'],name:'Beast Unbroken',steps:[R('Réaction selon le dé : fuite, mouvement aléatoire ou Peur 1 des auditeurs (MJ).')]},
 {ids:['C0-L17-008'],name:'Axe of Unrelenting Fury',steps:[R('Après Blessures infligées : Volonté à malus cumulatif ; échec = Frénésie qui frappe aussi les proches, fin par désarmement, Sonné ou Inconscient.')]},
 {ids:['C0-L17-009'],name:'Mail of Stolen Valour',steps:[R('Échec de Calme : fuite jusqu’à un Test de Volonté réussi ; l’armure ne protège plus pendant la fuite.')]},
 {ids:['C0-L17-010','C0-L19-002'],name:'Howl of the Great Beast',steps:[SP({amount:1}),C('Assourdi',3),B(-1,3,{scope:'living-within-initiative-yards',encounterImmunity:true})]},
 {ids:['C0-L17-011'],name:'Familier d’Aqshy',steps:[R('Frénésie permise en remplaçant Volonté par Focalisation Aqshy.')]},
 {ids:['C0-L17-012'],name:'États des familiers',steps:[R('Brisé s’applique normalement aux familiers.')]},
 {ids:['C0-L17-013'],name:'Weezer’s Drizzle',steps:[M('Tests pour entrer en Frénésie',-2,'frenzy')]},
 {ids:['C0-L17-014'],name:'Clarté mentale',steps:[G('Pénalités mentales ignorées','durée')]},
 {ids:['C0-L17-016'],name:'Tempête de Shemtek',variants:{normal:[F(1,{scope:'witnesses-without-heavens'})],safe:[R('Version sûre : aucune Peur.')]}},
 {ids:['C0-L17-017'],name:'Horreurs noires',steps:[FOC(1,1,{max:4})]},
 {ids:['C0-L17-018'],name:'Cor du Andar',steps:[M('Calme/Commandement alliés',2,'allies'),M('Calme/Commandement ennemis',-2,'enemies'),F(1,{scope:'enemies'})]},
 {ids:['C0-L17-020'],name:'Acceptation du destin',variants:{allies:[G('Immunité à la Peur'),R('La Terreur est traitée comme une Peur.')],enemies:[R('Calme ou fuite interdite.')]}},
 {ids:['C0-L17-021'],name:'Soleil pourpre surincanté',steps:[F(2),R('Le toucher appelle un autre Test de mort.')]},
 {ids:['C0-L17-023'],name:'Tête brûlante',steps:[F(1,{scope:'targets-who-lost-wounds'})]},
 {ids:['C0-L17-026'],name:'Désespoir après sort',steps:[R('Calme supplémentaire raté : Exténué et Désespoir ; une semaine, Exténué revient chaque matin.')]},
 {ids:['C0-L02-006'],name:'Mort du compagnon lié',steps:[R('Mort non naturelle : Calme −2 DR (0 pour un elfe), sinon 2d10 Blessures directes ; traumatisme à arbitrer. Règle réciproque pour le familier.')]},
 {ids:['C0-L18-001'],name:'Acquiescence',steps:[R('Test de Calme (+0) requis avant toute Action.')]},
 {ids:['C0-L18-002'],name:'Delicious Excruciation',steps:[P({immunity:true})]},
 {ids:['C0-L18-003'],name:'Fleshy Curse',steps:[B(-1,0,{note:'à l’application et au début de chaque Round'})]},
 {ids:['C0-L18-004'],name:'Gift of Slaanesh',variants:{aspect:[F(2,{duration:'temporaire'})],siren:[R('Choix ennemi : avancer ou subir 1 Brisé.')]}},
 {ids:['C0-L18-005'],name:'Luxurious Torment et Pavane',variants:{torment:[G('Frénésie','zone')],pavane:[R('Calme (+0) contre la danse forcée.')]}},
 {ids:['C0-L18-006'],name:'Cœur du loup',steps:[P({scope:'allies',immunity:true}),G('Immunité Peur, Terreur, Intimidation, Effrayant','BFM Rounds')]},
 {ids:['C0-L19-001'],name:'Sword of Fear',steps:[F(2,{duration:'2d10 Rounds'})]},
 {ids:['C0-L19-004'],name:'Spotted Green Brain Pox',steps:[G('Haine et Frénésie'),R('Calme périodique tous les 5 Rounds pour permettre la fuite.')]},
 {ids:['C0-L20-001'],name:'The Laurels of Victory',steps:[F(2,{fromRound:2})]},
 {ids:['C0-L21-001'],name:'The Aura of Sanctity',steps:[R('Talents de courage du socle accordés temporairement (service de Talents).')]},
 {ids:['C0-L21-002'],name:'Wild Magic : Winds Recede et Tzeentch’s Caprice',steps:[R('Test de Commandement (+0 ou −1 DR) selon l’incident de magie sauvage.')]},
 {ids:['C0-L21-003'],name:'Marsie Wagnershoff',variants:{frenzy:[R('Volonté (−2 DR) sinon Frénésie jusqu’à 1 PV ou moins.')],witness:[FMJ({scope:'witnesses'})]}},
 {ids:['C0-L22-002'],name:'Mark of the Horned Rat',steps:[B(0,0,{onFailSocPenalty:{amount:-1,duration:'1d10 heures'}})]},
 {ids:['C0-L22-003'],name:'Death Frenzy, Musk of Terror et Skitterleap',variants:{frenzy:[B(0,0,{onFailFrenzy:true})],musk1:[TE(1,{scope:'skaven'})],musk2:[TE(2,{scope:'skaven'})],skitterleap:[B(-1,0)]}},
 {ids:['C0-L23-002'],name:'Mutations physiques : Peur et Warp Frenzy',variants:{fear1:[F(1)],fear2:[F(2)],frenzy:[G('Frénésie')]}},
 {ids:['C0-L23-003'],name:'Mutations mentales',steps:[R('Shaky Morale : Brisé sur échec de Volonté ; Blasted Mind : 1d10 Brisé après 1d10 Rounds ; Hurried Masochism : Traits de Psychologie V5.')]},
 {ids:['C0-L23-004'],name:'Mark of Tzeentch, Mindfire et Chaos Fury',steps:[R('Animosité mutuelle ; Calme (+0) contre la Corruption (Mindfire) ; Traits Peur (2), Craintif, Peureux.')]},
 {ids:['C0-L25-004'],name:'Sacred Salt et Repel Sea Beast',steps:[B(-1,1,{scope:'aquatic-int-15-or-less'})]},
 {ids:['C0-L25-006'],name:'Monstres marins : Grim, Lures et Syreen',steps:[R('Tests de Calme défensifs contre leurres et chants, en DR V5.')]},
 {ids:['C0-L26-003'],name:'Naiad War-Form et Attach and Feed',steps:[F(2,{duration:'temporaire'}),G('Immunité à la Psychologie','temporaire')]}
]);
export const PSYCHOLOGY_SOURCE_IDS=Object.freeze([...new Set(PSYCHOLOGY_SOURCES.flatMap(e=>e.ids))]);
const brokenLevels=p=>(p.states||[]).filter(s=>s.key==='brise').reduce((n,s)=>n+(s.level||1),0);
/** Résout une source du catalogue : les Tests, indices non chiffrés et faits de scène restent des saisies explicites. */
export function previewPsychologySource(sourceId,{author,targets=[],overcast=0,variant,facts={},tests={},bfm,round,encounterId='default-encounter'}={}){
 const entry=PSYCHOLOGY_SOURCES.find(e=>e.ids.includes(sourceId));
 if(!entry)return{...intFail('Source de Psychologie inconnue : '+sourceId,'sourceId'),modifiers:[],grants:[],reminders:[]};
 const out={ready:true,entry:entry.name,participants:targets.map(t=>structuredClone(t)),addedStates:[],modifiers:[],grants:[],reminders:[],needsInput:[],unresolved:[],author};
 const stop=(field,label)=>{out.needsInput.push({field,label});out.unresolved.push(label);out.ready=false;};
 let steps=entry.steps;
 if(entry.variants){steps=entry.variants[variant];if(!steps){stop('variant','Variante requise : '+Object.keys(entry.variants).join(', '));return out;}}
 const swap=(p,next)=>{const i=out.participants.findIndex(x=>x.id===p.id);out.participants[i]=next;};
 for(const s of steps){
  if(s.k==='reminder'){out.reminders.push(s.text);continue;}
  if(s.k==='modifier'){out.modifiers.push({id:`${sourceId}:${out.modifiers.length}`,label:s.label,amount:s.amount,scope:s.scope});continue;}
  if(s.k==='grant'){for(const p of out.participants)out.grants.push({targetId:p.id,trait:s.trait,duration:s.duration||null,...(s.trigger?{trigger:s.trigger}:{})});if(!out.participants.length)out.grants.push({targetId:null,trait:s.trait,duration:s.duration||null});continue;}
  if(s.k==='spendMomentum'){
   if(author?.extensions?.v5?.hasMomentum!==true){stop('momentum','Un Élan à dépenser est requis.');continue;}
   out.author=withMomentum(author,false);continue;
  }
  if(s.k==='fear'||s.k==='terror'){
   let rating=s.rating;
   if(rating===undefined&&s.ratingBase!==undefined){if(!Number.isSafeInteger(overcast)||overcast<0){stop('overcast','Surincantation (DR) requise.');continue;}rating=Math.min(s.max??Infinity,s.ratingBase+Math.floor(overcast/s.every));}
   if(rating===undefined)rating=facts[s.ratingFact];
   if(!Number.isSafeInteger(rating)||rating<1){stop(s.ratingFact||'rating','Indice non chiffré : saisie MJ explicite requise (Q13/Q19).');continue;}
   if(s.fromRound&&!(Number.isSafeInteger(round)&&round>=s.fromRound)){out.reminders.push(`${entry.name} : actif dès le Round ${s.fromRound}.`);continue;}
   if(!author||!out.participants.length){stop('participants','Auteur et cibles requis.');continue;}
   for(const p of [...out.participants]){
    const preview=(s.k==='fear'?previewGenericFearEncounter:previewGenericTerrorEncounter)({author,target:p,rating,sourceKind:'spell',sourceId,sourceLabel:`${entry.name} (${rating})`,encounterId,resolutionId:`${sourceId}:${s.k}`,ignorePsychologyImmunity:s.ignorePsychologyImmunity});
    if(!preview.ready){for(const n of preview.needsInput)stop(n.field,n.label);continue;}
    if(preview.addedStates.length){swap(p,{...p,states:[...(p.states||[]),...preview.addedStates]});out.addedStates.push(...preview.addedStates);}
   }
   continue;
  }
  if(s.k==='purge'){
   for(const p of [...out.participants]){
    if(s.immunity){if(!Number.isSafeInteger(bfm)||bfm<1||!Number.isSafeInteger(round)){stop('bfm','BFM et Round courant requis pour l’immunité.');break;}swap(p,previewDeliciousExcruciation({caster:author||p,target:p,bfm,round}).participant);continue;}
    const amount=s.amount??brokenLevels(p);
    if(amount>0)swap(p,recoverV5Condition(p,'brise',{method:'divine-removal',amount}).participant);
    if(s.withExhausted)swap(p,recoverV5Condition(out.participants.find(x=>x.id===p.id),'extenue',{method:'divine-removal',amount:Number.MAX_SAFE_INTEGER}).participant);
   }
   continue;
  }
  if(s.k==='condition'){
   if(s.remove||!(s.level>0))continue;
   for(const p of [...out.participants])swap(p,acquireV5Conditions(p,[{name:s.name,level:s.level,source:{kind:'psychology-source',sourceId}}],{round}).participant);
   continue;
  }
  if(s.k==='calmBroken'){
   const key=s.testKey||'calm';
   if(s.modifier!==0)out.modifiers.push({id:`${sourceId}:test:${key}`,label:`Test de ${key==='calm'?'Calme':key} de ${entry.name}`,amount:s.modifier,scope:'test'});
   for(const p of [...out.participants]){
    const t=tests[key]?.[p.id];
    if(typeof t?.success!=='boolean'||!Number.isSafeInteger(t.sl)){stop('tests.'+key,'Test ('+key+') requis pour '+p.id+'.');continue;}
    if(t.success){if(s.encounterImmunity)out.reminders.push(`${p.id} : protégé pour la rencontre.`);continue;}
    if(s.broken>0)swap(p,acquireV5Conditions(out.participants.find(x=>x.id===p.id),[{name:'Brisé',level:s.broken,source:{kind:'psychology-source',sourceId}}],{round}).participant);
    if(s.onFailFrenzy)out.grants.push({targetId:p.id,trait:'Frénésie',duration:null});
    if(s.onFailSocPenalty)out.modifiers.push({id:`${sourceId}:soc:${p.id}`,label:'Sociabilité',amount:s.onFailSocPenalty.amount,scope:'Soc',targetId:p.id});
   }
  }
 }
 return out;
}
