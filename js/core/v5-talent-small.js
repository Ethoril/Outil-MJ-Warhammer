/** MJ-approved Petit homebrew; imported Size/Wounds are never rewritten. */
import {hasV5Talent} from './v5-talents.js';
import {situationPlan,activeSource} from './v5-talent-situations.js';
import {getReferenceCatalogue} from './reference-catalog.js';

export function smallSource(actor,target){
  const owner=[actor,target].find(p=>hasV5Talent(p,'talent-small'));
  return owner?situationPlan(owner,'small'):null;
}
export function smallNoTest(actor,target,id){return ['small-disengage','small-psychology'].includes(id)&&Boolean(smallSource(actor,target)?.proposals.length);}
export function previewSmall(n){
  const plan=smallSource(n.actor,n.target),unresolved=[];
  const sizes=[n.v5.actorSize,n.v5.targetSize],known=sizes.every(Number.isSafeInteger);
  const attack=['attack','attaque'].includes(n.action.type),strength=n.defense&&n.action.attr==='F'&&n.defense.attr==='F';
  const selected=['small-psychology','small-disengage','stomp'].includes(n.v5.context?.talentAction);
  const eligible=attack||strength||selected,active=eligible&&Boolean(plan?.proposals.length),plans=eligible&&plan?[plan]:[];
  if(active&&(attack||strength||selected)&&!known)unresolved.push('Petit : catégories de Taille explicites requises, sans recalcul des fiches.');
  const gap=active&&known?Math.abs(sizes[0]-sizes[1]):0,larger=gap?(sizes[0]>sizes[1]?'attacker':'defender'):null;
  const stomp=n.v5.context?.talentAction==='stomp';
  const quality=gap===1?'devastatrice':gap>=2?'percutante':null;
  if(active&&attack&&gap&&!stomp){
    const weapon=larger==='attacker'?n.action:n.defense;
    if(weapon&&(larger==='attacker'||n.defense?.v5?.kind==='melee')&&quality&&!weapon.qualities.some(q=>q.id===quality))weapon.qualities.push({id:quality,talentOrigins:plan.proposals.flatMap(p=>p.origins)});
  }
  return {active,plans,unresolved,gap,larger,quality,scoreBonus:active&&attack&&larger==='defender'?10:0,
    defensePenalty:active&&larger==='attacker'?2*gap:0,
    multiplier:active&&larger==='attacker'&&!stomp?Math.max(1,gap):1,
    defenderMultiplier:active&&larger==='defender'&&!stomp?Math.max(1,gap):1,
    approvedQualities:active&&larger==='attacker'&&gap>=2&&!stomp?['percutante']:[],
    defenderApprovedQualities:active&&larger==='defender'&&gap>=2&&!stomp?['percutante']:[],
    forceWinner:active&&strength&&gap?{larger,gap}:null};
}
export function previewSmallActivation(n){
  const id=n.v5.context?.talentAction;
  if(!['small-disengage','small-psychology','stomp'].includes(id))return null;
  const plan=smallSource(n.actor,n.target);if(!plan?.proposals.length)return null;
  const changes=[],unresolved=[],reminders=[],c=n.v5.context||{},sizes=[n.v5.actorSize,n.v5.targetSize];
  const known=sizes.every(Number.isSafeInteger),gap=known?Math.abs(sizes[0]-sizes[1]):0;
  if(!n.target||!known||!gap)unresolved.push('Petit : deux créatures de catégories de Taille différentes requises.');
  const origin=plan.proposals[0].origins[0];
  if(id==='stomp'&&(n.v5.kind!=='melee'||!known||sizes[0]<=sizes[1]))unresolved.push('Piétinement : attaquer la créature plus petite avec Bagarre et payer un Élan.');
  if(id==='small-disengage'){
    if(!n.noTestAction||!known||sizes[0]<=sizes[1]||c.bothEngaged!==true)unresolved.push('Petit : seule la créature plus grande peut quitter librement cet adversaire engagé.');
    if(!unresolved.length)changes.push({participantId:n.actor.id,add:[{id:n.resolutionId+':small-leave',key:'disengaged',name:'Adversaire plus petit quitté librement',kind:'talent-pending',level:1,source:origin,opponentId:n.target.id}]});
  }
  if(id==='small-psychology'){
    if(!n.noTestAction||c.aggressive!==true||n.actor.camp===n.target?.camp)unresolved.push('Petit : attitude agressive de la créature plus grande envers un adversaire requise.');
    if(!unresolved.length){
      const bigger=sizes[0]>sizes[1]?n.actor:n.target,smaller=bigger.id===n.actor.id?n.target:n.actor;
      const immune=(smaller.states||[]).some(s=>s.key==='frenzy'&&activeSource(s));
      const encountered=(smaller.states||[]).some(s=>['fear-of-talent','fear-overcome','terror-of-talent','terror-resolved'].includes(s.key)&&s.authorId===bigger.id&&s.encounterId===n.v5Clock.encounterId);
      if(!immune&&!encountered){
        const terrorImmune=(smaller.states||[]).some(s=>s.key==='terror-immunity'&&s.encounterId===n.v5Clock.encounterId&&activeSource(s));
        const terror=gap>=2&&!terrorImmune;
        changes.push({participantId:smaller.id,add:[{id:n.resolutionId+':small-psychology',key:terror?'terror-of-talent':'fear-of-talent',name:(terror?'Terreur':'Peur')+' de taille ('+gap+')',kind:'talent-pending',level:1,source:origin,authorId:bigger.id,targetId:smaller.id,encounterId:n.v5Clock.encounterId,rating:gap,mode:'sl',successes:0,restriction:terror?null:'cannotGainMomentum'}]});
      }
    }
  }
  reminders.push('Petit : Dégâts multipliés avant BE/PA ; Frappes Mortelles supprimées par décision MJ. Taille et maximum de Blessures restent importés.');
  return {plan,changes,conditions:[],unresolved,reminders};
}
export function terrorAction(subject){
  if(!(subject.states||[]).some(s=>s.key==='terror-of-talent'&&activeSource(s)))return null;
  const skill=getReferenceCatalogue().skills.find(s=>s.nom==='Calme');
  return {id:'activate:overcome-terror',note:'Résoudre la Terreur',type:'skill',attr:'FM',base:subject.skills?.find(s=>s.id===skill.id&&s.status==='resolved')?.total??subject.caracs?.FM,mod:0,qualities:[],extensions:{fiche:{skillId:skill.id},v5:{kind:'test',initialContext:{talentAction:'overcome-terror',psychologyKind:'terror'}}}};
}
export function previewSmallTerror(n,test){
  if(n.v5.context?.talentAction!=='overcome-terror')return null;
  const c=n.v5.context,terrors=(n.actor.states||[]).filter(s=>s.key==='terror-of-talent'&&activeSource(s)),effect=terrors.find(s=>s.id===c.terrorEffectId);
  const plan={proposals:effect?[{op:'activateTalent',origins:[effect.source]}]:[]},changes=[],conditions=[],unresolved=[],reminders=[];
  const calm=getReferenceCatalogue().skills.find(s=>s.nom==='Calme')?.id;
  if(!effect||(n.action.extensions?.fiche?.skillId??c.skillId)!==calm||n.defense)unresolved.push('Terreur : source identifiée et Test réel de Calme non opposé requis.');
  if(effect&&terrors.some(s=>s.rating>effect.rating))unresolved.push('Terreur : commencer par le degré le plus élevé.');
  if(!unresolved.length){
    const affected=terrors.filter(s=>s.rating<=effect.rating);plan.proposals.push(...affected.map(s=>({origins:[s.source]})));
    // Terreur d'un Trait de créature (B4) : pas de mention « de taille » dans le nom des effets qui suivent.
    const size=s=>s.source?.psychologySourceKind==='trait'?'':' de taille';
    const states=affected.flatMap(s=>[{...s,key:'terror-resolved',name:'Terreur'+size(s)+' résolue'}, {...s,id:s.id+':fear',key:'fear-of-talent',name:'Peur'+size(s)+' ('+s.rating+')',mode:'sl',successes:0,restriction:'cannotGainMomentum'}]);
    if(test.success)states.push({id:n.resolutionId+':terror-immunity',key:'terror-immunity',name:'Terreur surmontée pour cette rencontre',kind:'talent-pending',level:1,source:effect.source,encounterId:n.v5Clock.encounterId});
    else conditions.push({key:'brise',name:'Brisé',level:effect.rating+Math.max(0,-test.sl-1),source:{kind:'talent',talentId:effect.source.talentId,talentOrigins:[effect.source]}});
    changes.push({participantId:n.actor.id,removeIds:affected.map(s=>s.id),add:states});
    reminders.push('Terreur V5 p. 184 : à l’échec, indice + DR négatifs après le premier ; la source cause ensuite Peur au même indice.');
  }
  return {plan,changes,conditions,unresolved,reminders};
}
