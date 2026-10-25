import {magicTalentRank} from './v5-magic-talents.js';
import{smallNoTest,terrorAction}from'./v5-talent-small.js';
/** Explicit activations from the Test being resolved. No hidden dice or fictional predicates. */
import {contactActions,contactNoTest} from './v5-talent-contact.js';
import {fearAction} from './v5-talent-psychology.js';
import {SITUATION_ACTIONS,situationOwner,situationActions,previewSituationActivation} from './v5-talent-situations.js';
import {evaluateV5Talents,hasV5Talent,currentV5TalentHashes,previewV5TalentConditions} from './v5-talents.js';
import {getReferenceCatalogue} from './reference-catalog.js';
import {createV5TimedEffect,acquireV5Conditions} from './v5-effects.js';
const skillName=id=>getReferenceCatalogue().skills.find(s=>s.id===id)?.nom;
const skillGroup=id=>getReferenceCatalogue().skills.find(s=>s.id===id)?.groupId;
const idOf=n=>getReferenceCatalogue().skills.find(s=>s.nom===n)?.id;
const groupOf=n=>getReferenceCatalogue().skills.find(s=>s.nom===n||s.nom.startsWith(n+' ('))?.groupId;
export const V5_ACTIVATED_TALENTS=Object.freeze({'talent-crew-commander':'Commandant d’Équipage','talent-distract':'Distraire','talent-frenzy':'Frénésie','talent-martial-arts':'Arts martiaux','talent-drilled':'Coude-à-coude','talent-combat-reflexes':'Combat instinctif','talent-blather':'Baratiner','talent-argumentative':'Ergoteur'});
const suffusedFrenzy=actor=>magicTalentRank(actor,'suffuse-with','Aqshy')>0;
export const sourceActive=effect=>effect?.source?.source?.effectHash&&currentV5TalentHashes()[effect.source.talentId]===effect.source.source.effectHash && (!effect.source.grantedBy || suffusedFrenzy({talents:[effect.source.grantedBy]}));
export const MARTIAL_QUALITIES=Object.freeze(['devastatrice','defensive','perturbante','rapide','perforante','precise','assommante']);
export function knownV5MartialQualities(subject){
 const row=(subject?.talents||[]).find(t=>t.id==='talent-martial-arts'&&t.status==='resolved');if(!row)return[];
 const ids=[...(row.knownQualityIds||[]),...(row.acquisitions||[]).flatMap(a=>[...(a.knownQualityIds||[]),...(typeof a.qualityId==='string'?[a.qualityId]:[])])];
 const unique=[...new Set(ids)];return unique.length<=row.rank-1&&unique.every(id=>MARTIAL_QUALITIES.includes(id))?unique:[];
}
export function noTestV5TalentAction(subject,selected,target){
 if(smallNoTest(subject,target,selected))return true;
 if(contactNoTest(subject,selected))return true;
 const situation=situationOwner(subject,selected);if(situation?.noTest)return true;
 if(selected==='end-frenzy' && suffusedFrenzy(subject) && currentV5TalentHashes()['talent-frenzy']?.startsWith('sha256:'))return true;
 const owner={'martial-arts':'martial-arts',drilled:'drilled','combat-reflexes':'combat-reflexes',argumentative:'argumentative','end-frenzy':'frenzy'}[selected];
 return Boolean(owner&&hasV5Talent(subject,'talent-'+owner)&&currentV5TalentHashes()['talent-'+owner]?.startsWith('sha256:'));
}
export function availableV5TalentActions(subject){
  const rows=[];const action=(id,name,attr,skill,type='skill')=>({id:'activate:'+id,note:name,type,attr,base:(subject.skills||[]).find(s=>s.id===skill&&s.status==='resolved')?.total??subject.caracs?.[attr],mod:0,qualities:[],extensions:{v5:{kind:'test',initialContext:{talentAction:id}},...(skill?{fiche:{skillId:skill}}:{})}});
  if(hasV5Talent(subject,'talent-frenzy') || suffusedFrenzy(subject)){const row=action('frenzy','Entrer en Frénésie','FM');if(suffusedFrenzy(subject))row.extensions.v5.initialContext.magicSuffusedWind='Aqshy';rows.push(row);}
  if(hasV5Talent(subject,'talent-crew-commander'))rows.push(action('crew-commander','Commander l’équipage','Soc',idOf('Commandement')));
  if(hasV5Talent(subject,'talent-blather'))rows.push(action('blather','Baratiner une cible','Soc',idOf('Charme'),'opposition'));
  if((subject.states||[]).some(s=>s.key==='debate'&&sourceActive(s)))rows.push(action('leave-debate','Quitter le débat','FM',idOf('Calme'),'opposition'));
  if(hasV5Talent(subject,'talent-distract'))rows.push(action('distract','Distraire (Athlétisme)','Ag',idOf('Athlétisme'),'opposition'));
  for(const [id,name]of[['martial-arts','Choisir un Atout d’Arts martiaux'],['drilled','Donner l’Élan au coude-à-coude'],['combat-reflexes','Choisir l’Initiative de combat'],['argumentative','Engager le débat']])if(noTestV5TalentAction(subject,id))rows.push({...action(id,name,null),base:0});
  if((subject.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s)))rows.push({...action('end-frenzy','Terminer la Frénésie',null),base:0});
  rows.push(...situationActions(subject),...contactActions(subject));const fear=fearAction(subject);if(fear)rows.push(fear);const terror=terrorAction(subject);if(terror)rows.push(terror);
  if(hasV5Talent(subject,'talent-small')){for(const[id,note]of[['small-psychology','Petit : Peur ou Terreur de taille'],['small-disengage','Petit : quitter un adversaire plus petit']])rows.push({...action(id,note,null),base:0});if(!rows.some(r=>r.id==='activate:stomp'))rows.push({...action('stomp','Piétinement (1 Élan)','CC',idOf('Corps à corps (Bagarre)'),'attack'),damageFormula:'BF',extensions:{fiche:{skillId:idOf('Corps à corps (Bagarre)')},v5:{kind:'melee',initialContext:{talentAction:'stomp'}}}});}
  return rows.filter(row=>Number.isSafeInteger(row.base)&&row.base>=0);
}
export function pendingCrewSkill(actor,action,context={}){
  const crewed=(action.qualities||[]).some(q=>q.id==='equipage');
  if(!crewed)return null;
  return (actor.states||[]).find(s=>s.key==='crew-next-shot'&&s.targetId===actor.id&&sourceActive(s)&&(!s.equipmentId||s.equipmentId===action.extensions?.fiche?.equipmentId))||null;
}
export function previewV5TalentActivation(normalized,actorTest,opposed){
  const situation=previewSituationActivation(normalized,actorTest,opposed);if(situation)return situation;
  const actor=normalized.actor,target=normalized.target,context=normalized.v5.context||{},selected=context.talentAction;
  let plan=evaluateV5Talents(actor,{event:'talent.activate',role:'actor',context:{talentAction:selected||'none'}}),changes=[],unresolved=[],reminders=[];
  if(!selected||selected==='none')return{plan,changes,unresolved,reminders};
  if(selected==='end-frenzy' && suffusedFrenzy(actor)){const active=(actor.states||[]).find(s=>s.key==='frenzy'&&sourceActive(s));if(active)plan={event:'talent.activate',role:'actor',ready:true,proposals:[{op:'activateTalent',key:'talent-end-frenzy',origins:[active.source]}],unresolved:[],trace:[]};}
  if(selected==='leave-debate'){
    const active=(actor.states||[]).find(s=>s.key==='debate'&&sourceActive(s));
    if(active)plan={event:'talent.activate',role:'actor',ready:true,proposals:[{op:'activateTalent',key:'talent-leave-debate',origins:[active.source]}],unresolved:[],trace:[]};
  }
  if(selected==='frenzy' && !plan.proposals.some(p=>p.op==='activateTalent'&&p.key==='talent-frenzy') && suffusedFrenzy(actor)){
    const borrowed=evaluateV5Talents({...actor,talents:[...(actor.talents||[]),{id:'talent-frenzy',status:'resolved',rank:1}]},{event:'talent.activate',role:'actor',context:{talentAction:'frenzy'}});
    plan={...borrowed,proposals:borrowed.proposals.map(p=>({...p,origins:p.origins.map(o=>({...o,grantedBy:{id:'talent-suffuse-with',status:'resolved',rank:1,specialization:'Aqshy'}}))}))};
  }
  const proposal=plan.proposals.find(p=>p.op==='activateTalent'&&p.key==='talent-'+selected);
  if(!proposal){unresolved.push('Activation de talent non disponible ou source à revalider.');return{plan,changes,unresolved,reminders};}
  if(noTestV5TalentAction(actor,selected)&&(!normalized.noTestAction||normalized.action.type!=='skill'))unresolved.push('Ce choix de talent nécessite son action propre, sans Test ni attaque.');
  const origin=proposal.origins[0],source={...origin,activationResolutionId:normalized.resolutionId};
  const skill=normalized.action.extensions?.fiche?.skillId??context.skillId;
  const state=(key,name,owner,extra={})=>({id:normalized.resolutionId+':'+key,key,name,kind:'talent-pending',level:1,duration:null,authorId:actor.id,targetId:owner.id,source,...extra});
  const effect=(key,name,owner,extra={})=>{if(!normalized.authorNextTurnEnd){unresolved.push('Échéance du prochain Tour de l’auteur requise.');return null;}return createV5TimedEffect(state(key,name,owner,{kind:'talent-active',...extra}),{authorId:actor.id,targetId:owner.id,expiry:normalized.authorNextTurnEnd});};
  if(selected==='crew-commander'){
    if(skill!==idOf('Commandement'))unresolved.push('Commandant d’Équipage : Test de Commandement requis.');
    if(!target||target.id===actor.id||context.crewWithinVoice!==true||context.crewWithinVoice===false)unresolved.push('Commandant d’Équipage : désigner le tireur d’une arme à équipage à portée de voix.');
    const owned=(actor.skills||[]).find(s=>s.id===context.crewRangedSkillId&&s.status==='resolved');
    const base=owned?Number(owned.total):context.crewRangedBase;
    if(!Number.isSafeInteger(base)||base<0||base>200)unresolved.push('Commandant d’Équipage : valeur de la compétence de tir du commandant requise.');
    if(owned&&skillGroup(owned.id)!==groupOf('Projectiles'))unresolved.push('Commandant d’Équipage : choisir une compétence de Projectiles.');
    if(!unresolved.length&&actorTest.success)changes.push({participantId:target.id,removeKeys:['crew-next-shot'],add:[state('crew-next-shot','Commandant d’Équipage : prochain tir',target,{base,skillId:owned?.id||null})]});
    reminders.push('Une Action de Commandement ; le remplacement expire dès la prochaine attaque avec une arme à équipage, même si elle échoue.');
  }
  if(selected==='distract'){
    if(![groupOf('Athlétisme'),groupOf('Représentation'),groupOf('Escamotage')].includes(skillGroup(skill)))unresolved.push('Distraire : Athlétisme, Représentation ou Escamotage requis.');
    const defenseSkill=normalized.defense?.extensions?.fiche?.skillId??normalized.defense?.v5?.context?.skillId;
    if(!target||target.id===actor.id||context.withinTwoYards!==true||defenseSkill!==idOf('Perception')||!opposed)unresolved.push('Distraire : cible distincte à deux yards maximum et opposition de Perception requises.');
    if(!unresolved.length&&opposed.winner==='attacker'){
      const active=effect('distracted','Distrait',target,{restriction:'noMomentumOrAdvantage'});if(active)changes.push({participantId:target.id,removeKeys:['distracted'],add:[active],momentum:false});
    }
    reminders.push('Distraire emploie le Mouvement ; la perte d’Élan et l’interdiction d’Avantage expirent à la fin du prochain Tour de l’auteur.');
  }
  if(selected==='frenzy'){
    if(normalized.v5Clock?.turnId&&!normalized.v5Clock.turnId.endsWith(':'+actor.id))unresolved.push('Frénésie : activation à votre Tour seulement.');
    if(normalized.action.attr!=='FM'||normalized.defense)unresolved.push('Frénésie : Test de Force Mentale requis.');
    if((actor.states||[]).some(s=>['sonne','inconscient'].includes(s.key)))unresolved.push('Sonné ou Inconscient : Frénésie impossible.');
    if(!unresolved.length&&actorTest.success)changes.push({participantId:actor.id,removeKeys:['frenzy'],add:[state('frenzy','Frénésie',actor)]});
    reminders.push('Frénésie : avancer vers l’ennemi le plus proche et l’attaquer ; aucun autre emploi de l’Action ou du Mouvement. Immunité aux autres Psychologies.');
  }
  if(selected==='blather'){
    const defenseSkill=normalized.defense?.extensions?.fiche?.skillId??normalized.defense?.v5?.context?.skillId;
    if(skill!==idOf('Charme')||defenseSkill!==idOf('Calme')||!opposed||!target||target.id===actor.id||context.caughtInAct!==true)unresolved.push('Baratiner : pris en faute, opposition Charme/Calme et cible distincte requises.');
    const willpower=target?.caracs?.FM,bonus=Number.isSafeInteger(willpower)?Math.floor(willpower/10):context.targetWillpowerBonus;
    if(!Number.isSafeInteger(bonus)||bonus<0)unresolved.push('Baratiner : Bonus de Force Mentale de la cible requis.');
    if(!['turn','minute'].includes(context.convictionUnit))unresolved.push('Baratiner : préciser Tours ou minutes selon la situation.');
    if(!unresolved.length&&opposed.winner==='attacker'){
      if(actorTest.sl>bonus)changes.push({participantId:target.id,removeKeys:['conviction'],add:[state('conviction','Convaincu : jusqu’à démonstration d’une incohérence',target)]});
      else if(actorTest.sl>0){let active;if(context.convictionUnit==='minute')active=state('conviction','Convaincu : '+actorTest.sl+' minute(s)',target,{remainingMinutes:actorTest.sl});else{active=effect('conviction','Convaincu : '+actorTest.sl+' Tour(s)',target);if(active){active.v5Timing.expiry.round+=actorTest.sl-1;active.v5Timing.expiry.turn+=(actorTest.sl-1)*(normalized.v5State.participants.filter(p=>p.zone==='active').length);}}if(active)changes.push({participantId:target.id,removeKeys:['conviction'],add:[active]});}
      else reminders.push('Baratiner : 0 DR, aucune durée de conviction donnée par la description.');
    }
  }
  if(selected==='argumentative'){
    if(!target||target.id===actor.id||context.debateBegun!==true)unresolved.push('Ergoteur : désigner l’interlocuteur et confirmer le débat engagé.');
    if(!unresolved.length)changes.push({participantId:target.id,removeKeys:['debate'],add:[state('debate','Dispute : −3 DR aux Tests sans rapport',target,{testPenalty:3})]});
  }
  if(selected==='leave-debate'){
    const active=(actor.states||[]).find(s=>s.key==='debate'&&sourceActive(s)),defenseSkill=normalized.defense?.extensions?.fiche?.skillId??normalized.defense?.v5?.context?.skillId;
    if(!active||target?.id!==active.authorId||skill!==idOf('Calme')||defenseSkill!==idOf('Charme')||!opposed)unresolved.push('Ergoteur : Calme opposé au Charme de l’auteur du débat requis.');
    if(!unresolved.length&&opposed.winner==='attacker')changes.push({participantId:actor.id,removeIds:[active.id]});
  }
  if(selected==='martial-arts'){
    const known=knownV5MartialQualities(actor);
    if(!known.includes(context.martialQuality))unresolved.push('Arts martiaux : choisir un Atout connu importé depuis la fiche.');
    if(context.beginningOfTurn!==true||!normalized.v5Clock?.turnId?.endsWith(':'+actor.id))unresolved.push('Arts martiaux : choix au début du combat ou de votre Tour seulement.');
    if(!unresolved.length){const active=effect('martial-arts-quality','Arts martiaux : '+context.martialQuality,actor,{qualityId:context.martialQuality});if(active){active.v5Timing.expiry.phase='startOfTurn';changes.push({participantId:actor.id,removeKeys:['martial-arts-quality'],add:[active]});}}
  }
  if(selected==='drilled'){
    if(!normalized.v5Clock?.turnId?.endsWith(':'+actor.id))unresolved.push('Coude-à-coude : pendant votre Tour seulement.');
    const allies=context.shoulderAllyIds,participants=normalized.v5State?.participants||[];
    if(!Array.isArray(allies)||!allies.length||new Set(allies).size!==allies.length)unresolved.push('Coude-à-coude : désigner les alliés effectivement au coude-à-coude.');
    else for(const id of allies){const ally=participants.find(p=>p.id===id);if(!ally||id===actor.id||ally.camp!==actor.camp||!hasV5Talent(ally,'talent-drilled')||!currentV5TalentHashes()['talent-drilled']?.startsWith('sha256:'))unresolved.push('Coude-à-coude : allié ou talent indisponible.');else changes.push({participantId:id,momentum:true});}
    reminders.push('Les alliés peuvent se désengager d’un adversaire également engagé avec cet auteur.');
  }
  if(selected==='combat-reflexes'){
    if(context.beginningOfCombat!==true)unresolved.push('Combat instinctif : déterminer l’Initiative au début du combat.');
    const dice=[context.initiativeFirst,context.initiativeSecond],choice=context.initiativeChoice;
    if(!dice.every(n=>Number.isSafeInteger(n)&&n>=1&&n<=10)||!['first','second'].includes(choice))unresolved.push('Combat instinctif : deux d10 explicites et choix du joueur requis.');
    const initiative=actor.caracs?.I;if(!Number.isSafeInteger(initiative))unresolved.push('Combat instinctif : caractéristique Initiative requise.');
    if(!unresolved.length){
      const selectedDie=dice[choice==='first'?0:1],existing=actor.extensions?.v5?.combatReflexesPreparation;
      const originalInitiative=existing?.version===1&&existing.participantId===actor.id&&Number.isSafeInteger(existing.originalInitiative)?existing.originalInitiative:actor.initiative;
      const preparation={version:1,participantId:actor.id,originalInitiative,characteristic:initiative,dice:[...dice],choice,selectedDie,provenance:{kind:'legacy-talent-activation',resolutionId:normalized.resolutionId}};
      changes.push({participantId:actor.id,patch:{initiative:Math.floor(initiative/10)+selectedDie,extensions:{...(actor.extensions||{}),v5:{...(actor.extensions?.v5||{}),combatReflexesPreparation:preparation}}}});
    }
  }
  if(selected==='end-frenzy'){
    if(context.nearbyEnemiesDefeated!==true)unresolved.push('Frénésie : confirmer que tous les ennemis proches sont vaincus.');
    if(!(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s)))unresolved.push('Frénésie active requise.');
    // The shared lifecycle plans the Fatigued acquisition and its reductions.
  }
  return{plan,changes,unresolved,reminders};
}
export function previewV5FrenzyExit(participant,{round,resolutionId='talent-lifecycle',nearbyEnemiesDefeated=false,state,clock={}}={}){
 const next=structuredClone(participant),frenzy=(next.states||[]).find(s=>s.key==='frenzy'&&sourceActive(s)),plans=[],usageRequests=[],unresolved=[];
 if(!frenzy||!((next.states||[]).some(s=>['sonne','inconscient'].includes(s.key))||nearbyEnemiesDefeated))return{participant:next,plans,usageRequests,unresolved,ended:false};
 next.states=next.states.filter(s=>s.key!=='frenzy');
 const controlled=hasV5Talent(next,'talent-battle-rage')&&currentV5TalentHashes()['talent-battle-rage']?.startsWith('sha256:');
 if(!controlled){const reduced=previewV5TalentConditions(next,[{name:'Exténué',key:'extenue',level:1,source:{kind:'frenzy-ended'}}],{state,clock,actionId:resolutionId+':frenzy-end:'+next.id});plans.push(reduced.plan);usageRequests.push(...reduced.usageRequests);unresolved.push(...reduced.plan.unresolved.flatMap(r=>r.fields.map(f=>'Fin de Frénésie : préciser '+f+'.')));Object.assign(next,acquireV5Conditions(next,reduced.states,{round,resolutionId,targetId:next.id}).participant);}
 return{participant:next,plans,usageRequests,unresolved,ended:true};
}
export function refreshV5TalentEffects(participant,options={}){return previewV5FrenzyExit(participant,options).participant;}
