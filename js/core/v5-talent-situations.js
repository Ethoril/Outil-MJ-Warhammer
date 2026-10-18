import{previewSmallActivation,previewSmallTerror}from'./v5-talent-small.js';
/** Source-bound situational actions. Geometry and fictional triggers are explicit MJ inputs. */
import {previewShieldAlly} from './v5-talent-shield.js';
import {previewReactionStrike} from './v5-talent-attacks.js';
import {previewContactActivation} from './v5-talent-contact.js';
import {previewPsychologyActivation} from './v5-talent-psychology.js';
import {evaluateV5Talents,hasV5Talent,currentV5TalentHashes} from './v5-talents.js';
import {getReferenceCatalogue} from './reference-catalog.js';
export const activeSource=s=>currentV5TalentHashes()[s?.source?.talentId]===s?.source?.source?.effectHash&&Boolean(s?.source?.source?.effectHash);
const skillId=n=>getReferenceCatalogue().skills.find(s=>s.nom===n)?.id;
const value=(p,n,attr)=>p?.skills?.find(s=>s.id===skillId(n)&&s.status==='resolved')?.total??p?.caracs?.[attr];
export const SITUATION_ACTIONS=Object.freeze([
 {id:'large-fear',owner:'large',name:'Grande taille : Peur des créatures plus petites',noTest:true},
 {id:'frightening',owner:'frightening',name:'Effrayant : rencontrer les adversaires',noTest:true},
 {id:'hatred',owner:'hatred',name:'Haine : se retenir',skill:'Calme',attr:'FM'},
 {id:'vice',owner:'vice',name:'Vice : résister ou mettre fin à l’excès',skill:'Calme',attr:'FM'},
 {id:'vice-exhausted',owner:'vice',name:'Vice : excès jusqu’à l’insensibilité',noTest:true},
 {id:'satisfy-vice',owner:'vice',name:'Vice : satisfaction confirmée',noTest:true},
 {id:'shield-ally',owner:'shieldsman',name:'Porte-bouclier : protéger un allié (1 Élan)',noTest:true},
 {id:'drilled-help',owner:'drilled',name:'Coude-à-coude : couvrir le Désengagement d’un allié',noTest:true},
 {id:'reaction-strike',owner:'reaction-strike',name:'Frappe réactive : Initiative avant le chargeur',attr:'I'},
 {id:'in-fighter',owner:'in-fighter',name:'Imposer le combat au contact',skill:'Corps à corps (Base)',attr:'CC',type:'opposition',kind:'melee'},
 {id:'stomp',owner:'large',name:'Piétinement (1 Élan)',skill:'Corps à corps (Bagarre)',attr:'CC',type:'attack',kind:'melee',damageFormula:'BF'},
 {id:'large-disengage',owner:'large',name:'Grande taille : quitter un adversaire plus petit',noTest:true},
 {id:'combat-aware',owner:'combat-aware',name:'Vigilance : éviter une Surprise identifiée',skill:'Perception',attr:'I'},
 {id:'relentless',owner:'relentless',name:'Impitoyable : poursuivre après Désengagement',skill:'Athlétisme',attr:'Ag'},
 {id:'public-speaker',owner:'public-speaker',name:'Orateur : commander la foule charmée',skill:'Commandement',attr:'Soc'},
 {id:'war-leader',owner:'war-leader',name:'Seigneur de guerre : commander en bataille',skill:'Commandement',attr:'Soc'},
 {id:'end-battle',owner:'war-leader',name:'Terminer l’influence de bataille',noTest:true},
 {id:'remove-bolt',owner:'harpooner',name:'Retirer un carreau fiché confirmé',noTest:true},
 {id:'drilled-disengage',owner:'drilled',name:'Coude-à-coude : Désengagement gratuit',noTest:true},
 {id:'flagellant',owner:'flagellant',name:'Flagellant : Frénésie après une Blessure',noTest:true}
]);
export function situationOwner(subject,id){const row=SITUATION_ACTIONS.find(r=>r.id===id);return row&&(hasV5Talent(subject,'talent-'+row.owner)||id==='drilled-disengage'&&(subject.states||[]).some(s=>s.key==='drilled-permission'&&activeSource(s)))&&currentV5TalentHashes()['talent-'+row.owner]?.startsWith('sha256:')?row:null;}
export function situationActions(subject){return SITUATION_ACTIONS.filter(r=>situationOwner(subject,r.id)).flatMap(r=>{const base=r.noTest?0:value(subject,r.skill,r.attr);return Number.isSafeInteger(base)?[{id:'activate:'+r.id,note:r.name,type:r.type||'skill',base,...(r.damageFormula?{damage:0,damageFormula:r.damageFormula}:{}),attr:r.attr,mod:0,qualities:[],extensions:{v5:{kind:r.kind||'test',initialContext:{talentAction:r.id}},...(r.skill?{fiche:{skillId:skillId(r.skill)}}:{})}}]:[];});}
export function situationPlan(subject,id){const row=SITUATION_ACTIONS.find(r=>r.id===id),owner=id==='stomp'&&hasV5Talent(subject,'talent-small')&&!hasV5Talent(subject,'talent-large')?'small':row?.owner||(id==='dual-whirlwind'?'dual-wielder':id);return structuredClone(evaluateV5Talents(subject,{event:'talent.activate',role:'actor',context:{talentAction:id},includeTalents:['talent-'+owner]}));}
export function previewSituationActivation(n,test,opposed){
 const small=previewSmallActivation(n);if(small)return small;const terror=previewSmallTerror(n,test);if(terror)return terror;
 const shield=previewShieldAlly(n);if(shield)return shield;
 const strike=previewReactionStrike(n,test);if(strike)return strike;
 const contact=previewContactActivation(n,test,opposed);if(contact)return contact;
 const psychology=previewPsychologyActivation(n,test);if(psychology)return psychology;
 const c=n.v5.context||{},id=c.talentAction,row=SITUATION_ACTIONS.find(r=>r.id===id);if(!row)return null;
 let plan=situationPlan(n.actor,id);if(id==='drilled-disengage'&&!plan.proposals.length){const permission=(n.actor.states||[]).find(s=>s.key==='drilled-permission'&&s.authorId===c.drilledAuthorId&&s.opponentId===n.target?.id&&activeSource(s));if(permission)plan={proposals:[{op:'activateTalent',origins:[permission.source]}],unresolved:[]};}const proposal=plan.proposals.find(p=>p.op==='activateTalent'),changes=[],unresolved=[],reminders=[];
 if(!proposal)unresolved.push('Talent de situation indisponible ou source à revalider.');
 if(row.noTest&&!n.noTestAction)unresolved.push('Ce choix exige son action propre sans Test.');
 const actual=n.action.extensions?.fiche?.skillId??c.skillId;
 const accepted=id==='relentless'?['Athlétisme',"Conduite d'attelage",'Conduite d’attelage','Chevaucher'].map(skillId).filter(Boolean):[skillId(row.skill)];
 if(!row.noTest&&!accepted.includes(actual))unresolved.push('Compétence canonique requise pour '+row.name+'.');
 const source=proposal?.origins?.[0],all=n.v5State?.participants||[],state=(key,name,p,extra={})=>({id:n.resolutionId+':'+key+':'+p.id,key,name,kind:'talent-pending',level:1,duration:null,authorId:n.actor.id,targetId:p.id,source,...extra});
 const requireIds=(ids,allies=false)=>{if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length){unresolved.push('Désigner les bénéficiaires de cet effet.');return[];}return ids.flatMap(id=>{const p=all.find(p=>p.id===id);if(!p||allies&&p.camp!==n.actor.camp){unresolved.push('Bénéficiaire absent ou du mauvais camp.');return[];}return[p];});};
 if(id==='stomp'&&n.v5.kind!=='melee')unresolved.push('Piétinement : attaque de Corps à corps requise.');
 if(id==='large-disengage'){if(!n.target||!Number.isSafeInteger(n.v5.actorSize)||!Number.isSafeInteger(n.v5.targetSize)||n.v5.actorSize<=n.v5.targetSize||c.bothEngaged!==true)unresolved.push('Grande taille : adversaire plus petit effectivement engagé requis.');else changes.push({participantId:n.actor.id,add:[state('disengaged','Adversaire plus petit quitté librement',n.actor,{opponentId:n.target.id})]});}
 if(id==='combat-aware'){
  if(typeof c.surpriseEventId!=='string'||!c.surpriseEventId.trim()||c.avoidingSurprise!==true)unresolved.push('Vigilance : identifiant de la Surprise à éviter requis.');
  if(test.success&&!unresolved.length)changes.push({participantId:n.actor.id,add:[state('avoid-surprise','Vigilance : Surprise évitée',n.actor,{eventId:c.surpriseEventId})]});
 }
 if(id==='relentless'){
  if(!n.target||n.target.id===n.actor.id||c.enemyDisengaged!==true||c.afterEnemyTurn!==true)unresolved.push('Impitoyable : confirmer le Désengagement et la fin du Tour de cet adversaire.');
  if(test.success&&!unresolved.length)changes.push({participantId:n.actor.id,add:[state('pursuit-move','Mouvement supplémentaire pour poursuivre ; Désengagement gratuit',n.actor,{pursuedId:n.target.id})]});
 }
 if(id==='public-speaker'){
  const charmed=(n.actor.states||[]).find(s=>s.key==='charmed-group'&&activeSource(s));
  if(!charmed)unresolved.push('Orateur : groupe préalablement charmé par un Test réussi requis.');
  const targets=requireIds(charmed?.participantIds);
  if(test.success&&!unresolved.length)for(const p of targets)changes.push({participantId:p.id,removeKeys:['brise']});
  reminders.push('Le MJ décrit l’Action demandée à la foule ; les États Brisé sont retirés après réussite de Commandement.');
 }
 if(id==='war-leader'){
  const targets=requireIds(c.influencedIds,true);if(c.inBattle!==true)unresolved.push('Seigneur de guerre : Commandement en bataille requis.');
  if(test.success&&!unresolved.length)for(const p of targets)changes.push({participantId:p.id,removeKeys:['war-leader'],add:[state('war-leader','Commandement contre la Peur',p,{commandBase:n.action.base})]});
 }
 if(id==='end-battle')for(const p of all)changes.push({participantId:p.id,removeIds:(p.states||[]).filter(s=>s.key==='war-leader'&&s.authorId===n.actor.id).map(s=>s.id)});
 if(id==='remove-bolt'){
  const bolts=(n.target?.states||[]).filter(s=>s.key==='lodged-bolt'&&activeSource(s));const chosen=bolts.find(s=>s.id===c.boltId);
  if(!chosen||c.projectileRemoved!==true)unresolved.push('Harponneur : carreau fiché identifié et retrait confirmé requis.');
  else changes.push({participantId:n.target.id,removeIds:[chosen.id]});
 }
 if(id==='drilled-help'){const enemy=all.find(p=>p.id===c.commonEnemyId);if(!n.target||n.target.camp!==n.actor.camp||n.target.id===n.actor.id||!enemy||enemy.camp===n.actor.camp||c.bothEngaged!==true)unresolved.push('Coude-à-coude : allié et adversaire commun effectivement engagés requis.');else changes.push({participantId:n.target.id,add:[state('drilled-permission','Désengagement couvert au coude-à-coude',n.target,{opponentId:enemy.id})]});}
 if(id==='drilled-disengage'){
  const ally=all.find(p=>p.id===c.drilledAuthorId);
  if(!ally||ally.id===n.actor.id||ally.camp!==n.actor.camp||!hasV5Talent(ally,'talent-drilled')||c.bothEngaged!==true||!n.target||n.target.id===ally.id||n.target.id===n.actor.id)unresolved.push('Coude-à-coude : allié possédant le talent et tous deux engagés avec l’adversaire requis.');
  else{const allyPlan=situationPlan(ally,'drilled-disengage');plan.proposals.push(...allyPlan.proposals);changes.push({participantId:n.actor.id,add:[state('disengaged','Désengagé gratuitement',n.actor,{opponentId:n.target.id})]});}
 }
 if(id==='flagellant'){
  if(c.woundSuffered!==true||!hasV5Talent(n.actor,'talent-frenzy')||!currentV5TalentHashes()['talent-frenzy']?.startsWith('sha256:')||(n.actor.states||[]).some(s=>['sonne','inconscient'].includes(s.key)))unresolved.push('Flagellant : Blessure subie, accès acquis à Frénésie et absence de Sonné/Inconscient requis.');
  if(!unresolved.length){const frenzy=situationPlan(n.actor,'frenzy');plan.proposals.push(...frenzy.proposals);changes.push({participantId:n.actor.id,removeKeys:['frenzy'],add:[state('frenzy','Frénésie',n.actor,{source:frenzy.proposals[0]?.origins[0]})]});}
 }
 return{plan,changes,unresolved,reminders};
}
export function previewSituationAfter(n,test){
 const changes=[],plans=[],c=n.v5.context||{};
 if(hasV5Talent(n.actor,'talent-public-speaker')&&test.success&&n.action.extensions?.fiche?.skillId===skillId('Charme')&&c.influencingGroup===true&&Array.isArray(c.influencedIds)&&c.influencedIds.length){
  const plan=situationPlan(n.actor,'public-speaker');plans.push(plan);if(plan.proposals.length&&c.influencedIds.every(id=>n.v5State.participants.some(p=>p.id===id)))changes.push({participantId:n.actor.id,removeKeys:['charmed-group'],add:[{id:n.resolutionId+':charmed-group',key:'charmed-group',name:'Groupe charmé : Commandement possible',kind:'talent-pending',level:1,source:plan.proposals[0].origins[0],participantIds:[...new Set(c.influencedIds)]}]});
 }
 return{changes,plans};
}
export function warLeaderSubstitution(n,subject,action,settings){
 if((action.extensions?.fiche?.skillId??settings.context?.skillId)!==skillId('Calme')||settings.context?.psychologyKind!=='fear')return null;
 const state=(subject.states||[]).find(s=>s.key==='war-leader'&&activeSource(s));if(!state)return null;
 const author=n.v5State?.participants?.find(p=>p.id===state.authorId);
 return author&&Number(author.hp)>0&&!(author.states||[]).some(s=>['brise','inconscient','peur','fear'].includes(s.key))?state:null;
}
export function preventIdentifiedSurprise(participant,states,eventId){
 const guard=(participant.states||[]).find(s=>s.key==='avoid-surprise'&&s.eventId===eventId&&activeSource(s));
 return{states:guard?states.filter(s=>s.key!=='surpris'):states,participant:guard?{...participant,states:participant.states.filter(s=>s.id!==guard.id)}:participant};
}
export function harpoonMovement(subject,base){const count=(subject.states||[]).filter(s=>s.key==='lodged-bolt'&&activeSource(s)).length;return Math.max(1,base-count);}
