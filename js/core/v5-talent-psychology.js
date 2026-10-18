import{evaluateV5Talents,hasV5Talent,acquiredV5Talents}from'./v5-talents.js';
import{getReferenceCatalogue}from'./reference-catalog.js';
import{situationPlan,activeSource}from'./v5-talent-situations.js';
const calmId=()=>getReferenceCatalogue().skills.find(s=>s.nom==='Calme')?.id;
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
