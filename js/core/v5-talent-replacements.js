import{hasV5Talent,currentV5TalentHashes}from'./v5-talents.js';
import{getReferenceCatalogue}from'./reference-catalog.js';
import{situationPlan,activeSource}from'./v5-talent-situations.js';
import{previewV5Test,selectV5Test}from'./v5-roll.js';
export function previewTalentReplacement(n,{hit,test,opposed,damage,location,qualityContext}){
 const c=n.v5.context||{},id=c.specialAttack,changes=[],states=[],plans=[],unresolved=[],reminders=[];
 if(!['dirty-fighting','disarm','shieldsman'].includes(id))return{changes,states,plans,unresolved,reminders,replacement:null,damage};
 const plan=situationPlan(n.actor,id);plans.push(plan);const origin=plan.proposals[0]?.origins[0];
 if(!origin)unresolved.push('Choix d’attaque indisponible ou source à revalider.');
 if(n.v5.kind!=='melee'||!['attack','attaque'].includes(n.action.type))unresolved.push('Ce remplacement exige une attaque de Corps à corps.');
 if(!hit)return{changes,states,plans,unresolved,reminders,replacement:null,damage};
 const state=(key,name,extra={})=>({id:n.resolutionId+':'+key,key,name,kind:'talent-pending',level:1,source:origin,authorId:n.actor.id,targetId:n.target.id,...extra});
 if(id==='dirty-fighting'){
  if(c.calledShot!==true||location?.key!=='BODY'||qualityContext.weapon.unarmed!==true||!damage||damage.finalDamage<=0||Number(n.target?.hp)<=0)unresolved.push('Combat déloyal : Coup ciblé au Corps à mains nues infligeant des Blessures requis.');
  if(!unresolved.length){damage={...damage,finalDamage:1,net:1,isPlancher:false,lowBlow:true};states.push({id:n.resolutionId+':low-blow:stunned',key:'sonne',name:'Sonné',level:1,source:{kind:'talent',talentId:origin.talentId,talentOrigins:[origin]}});}
 }
 if(id==='disarm'){
  if(test.sl<4||c.targetUnarmed!==false||c.targetWeaponBound!==false||!Number.isSafeInteger(n.v5.actorSize)||!Number.isSafeInteger(n.v5.targetSize)||n.v5.targetSize>n.v5.actorSize||typeof c.disarmedWeaponId!=='string'||!c.disarmedWeaponId.trim()||!Number.isSafeInteger(c.disarmDistance)||c.disarmDistance<1||c.disarmDistance>10||typeof c.disarmDirection!=='string'||!c.disarmDirection.trim())unresolved.push('Désarmer : +4 DR, tailles, arme tenue non liée, d10 de distance et direction explicites requis.');
  if(!unresolved.length){damage=null;changes.push({participantId:n.target.id,add:[state('disarmed','Désarmé : '+c.disarmDistance+' pieds, '+c.disarmDirection,{equipmentId:c.disarmedWeaponId,heldBy:c.catchWeapon===true?n.actor.id:null,distanceFeet:c.disarmDistance,direction:c.disarmDirection})]});reminders.push('L’arme désarmée ne peut plus être employée avant sa récupération.');}
 }
 if(id==='shieldsman'){
  if(!opposed||opposed.winner!=='attacker'||c.shieldAvailable!==true||!Number.isFinite(c.pushDistance)||c.pushDistance<0||c.pushDistance>2)unresolved.push('Porte-bouclier : bouclier disponible, opposition gagnée et recul entre 0 et 2 yards requis.');
  if(!unresolved.length){damage=null;changes.push({participantId:n.target.id,add:[state('pushed','Repoussé et Désengagé',{distanceYards:c.pushDistance,opponentId:n.actor.id})]});}
 }
 const replacement=unresolved.length?null:{op:'replaceDamage',name:id==='dirty-fighting'?'Combat déloyal : Coup bas':id==='disarm'?'Désarmer':'Porte-bouclier : repousser',origins:origin?[origin]:[]};
 return{replacement,damage,changes,states,plans,unresolved,reminders};
}
/** Calme is rolled only when the optional preservation is requested; other losses remain effective. */
export function resoluteException(n,subject,settings,instances){
 const c=settings?.context||{},plans=[],unresolved=[];if(!instances||c.tryResolute!==true)return{plans,unresolved,exceptions:[]};
 const plan=situationPlan(subject,'resolute');plans.push(plan);const origin=plan.proposals[0]?.origins[0];
 if(!origin)unresolved.push('Déterminé indisponible ou source à revalider.');
 const calm=getReferenceCatalogue().skills.find(s=>s.nom==='Calme'),base=subject.skills?.find(s=>s.id===calm.id&&s.status==='resolved')?.total??subject.caracs?.FM??c.resoluteBase;
 if(!Number.isSafeInteger(base)||!Number.isSafeInteger(c.resoluteRoll)||c.resoluteRoll<1||c.resoluteRoll>100)unresolved.push('Déterminé : compétence de Calme et jet réel requis.');
 if(unresolved.length)return{plans,unresolved,exceptions:[]};
 const penalty=Math.max(0,...(subject.states||[]).filter(s=>['sonne','extenue','empoisonne'].includes(s.key)).map(s=>s.level||1));
 const result=selectV5Test(previewV5Test({score:base,roll:c.resoluteRoll,kind:'test',slModifiers:penalty?[{id:'conditions',label:'États déjà présents',amount:-penalty}]:[]}), 'keep');
 return{plans,unresolved,exceptions:result.success?[{reason:'conditionAcquired',talentId:origin.talentId,applies:true}]:[],test:result};
}
export function previewForgeAura(n){
 const plans=[],unresolved=[],c=n.v5.context||{},ids=c.forgeAuthorIds||[],all=n.v5State?.participants||[];let active=false;
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw new TypeError('Auteurs Feu de forge invalides');
 for(const id of ids){const author=all.find(p=>p.id===id),plan=situationPlan(author,'forgefire');plans.push(plan);const distance=c.forgeDistances?.[id],bonus=Number.isSafeInteger(author?.caracs?.FM)?Math.floor(author.caracs.FM/10):null;
  if(!author||!plan.proposals.length||author.camp!==n.actor.camp||c.forgeEngagedIds?.includes(id)!==true||!Number.isFinite(distance)||distance<0||bonus==null)unresolved.push('Feu de forge : auteur engagé, allié, BFM et distance explicites requis.');
  else if(distance<=bonus)active=true;
 }
 const melee=n.v5.kind==='melee',already=n.action.qualities.some(q=>q.id==='perforante');
 if(active&&melee&&!already)n.action.qualities.push({id:'perforante'});
 return{plans,unresolved,extraMetalAP:active&&melee&&already};
}
export function applyForgeProtection(n,guard){
 if(!n.combatPrelude?.forge?.extraMetalAP)return guard;
 const amount=n.v5.context?.hitMetalAP;if(!Number.isSafeInteger(amount)||amount<0)return{...guard,manual:[...guard.manual,'Feu de forge : PA métalliques à la localisation requis.']};
 return{...guard,ap:guard.ap==null?null:Math.max(0,guard.ap-Math.min(1,amount)),forgeIgnoredAP:Math.min(1,amount)};
}
export function lodgedHarpoon(n,critical,hit){
 if(!critical||!hit||n.v5.kind!=='ranged'||!n.action.qualities.some(q=>q.id==='empaleuse'))return{plans:[],changes:[]};
 const weapon=n.actor?.equipment?.find(e=>e.id===n.action.extensions?.fiche?.equipmentId),group=weapon?.category||n.v5.context?.weaponGroup;
 if(group!=='Arbalète')return{plans:[],changes:[]};
 const plan=situationPlan(n.actor,'remove-bolt'),origin=plan.proposals[0]?.origins[0];return{plans:[plan],changes:origin?[{participantId:n.target.id,add:[{id:n.resolutionId+':lodged-bolt',key:'lodged-bolt',name:'Carreau fiché : Mouvement −1',kind:'talent-pending',level:1,source:origin,authorId:n.actor.id,targetId:n.target.id}]}]:[]};
}
export function unavailableDisarmedWeapon(subject,action){return(subject.states||[]).some(s=>s.key==='disarmed'&&activeSource(s)&&s.equipmentId===action.extensions?.fiche?.equipmentId);}

export function previewCardsharp(n){
 const c=n.v5.context||{},plans=[],unresolved=[];if(c.cardsharpUse!==true)return{plans,unresolved};
 const plan=situationPlan(n.actor,'cardsharp');plans.push(plan);const skill=getReferenceCatalogue().skills.find(s=>s.nom==='Pari')?.id;
 if(!plan.proposals.length||(n.action.extensions?.fiche?.skillId??c.skillId)!==skill||(n.defense?.extensions?.fiche?.skillId??n.defense?.v5?.context?.skillId)!==skill||!(n.roll===100||n.roll%11===0)||!Number.isSafeInteger(c.cardsharpOpponentRoll)||c.cardsharpOpponentRoll<1||c.cardsharpOpponentRoll>100)unresolved.push('Tricheur : double de Pari opposé et nouveau jet réel de l’adversaire requis.');
 if(!unresolved.length){n.defense.roll=c.cardsharpOpponentRoll;for(const key of['slModifiers','advantageSources'])n.defense.v5[key]=(n.defense.v5[key]||[]).filter(s=>s.id!=='escamotage'&&!s.id.startsWith('escamotage:'));n.defense.v5.context={...n.defense.v5.context,escamotageCancelled:true};}
 return{plans,unresolved};
}
