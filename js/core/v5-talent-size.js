import{smallSource}from'./v5-talent-small.js';
import{situationPlan}from'./v5-talent-situations.js';
import{hasV5Talent}from'./v5-talents.js';
import{getReferenceCatalogue}from'./reference-catalog.js';
export function previewLarge(n){
 const plans=[],unresolved=[],c=n.v5.context||{},attack=['attack','attaque'].includes(n.action.type),melee=attack&&n.v5.kind==='melee',sizes=[n.v5.actorSize,n.v5.targetSize],known=sizes.every(Number.isSafeInteger);
 const ownerA=hasV5Talent(n.actor,'talent-large'),ownerB=hasV5Talent(n.target,'talent-large');
 const a=ownerA?situationPlan(n.actor,'large'):null,b=ownerB?situationPlan(n.target,'large'):null;if(a)plans.push(a);if(b)plans.push(b);
 const onA=Boolean(a?.proposals.length),onB=Boolean(b?.proposals.length),strength=Boolean(n.defense&&n.action.attr==='F'&&n.defense.attr==='F');
 if((onA||onB)&&(melee||strength)&&!known)unresolved.push('Grande taille : catégories de Taille explicites requises.');
 const normal=melee&&!n.v5.extraAttack&&(c.freeAttackTalent==null||c.freeAttackTalent==='none')&&c.talentAction!=='stomp';
 const bf=Number.isSafeInteger(n.actor?.caracs?.F)?Math.floor(n.actor.caracs.F/10):null;
 if(normal&&onA&&bf==null)unresolved.push('Grande taille : Bonus de Force requis pour les dégâts normaux.');
 return{plans,unresolved,damageBonus:normal&&onA&&bf!=null?bf:0,defensePenalty:melee&&onA&&known&&sizes[0]>sizes[1]?2:0,forceWinner:strength&&known&&(onA||onB)&&sizes[0]!==sizes[1]?{larger:sizes[0]>sizes[1]?'attacker':'defender',gap:Math.abs(sizes[0]-sizes[1])}:null};
}
export function resolveSizeOpposition(opposed,large,actorTest,defenderTest){
 if(!opposed||!large?.forceWinner)return opposed;const{larger,gap}=large.forceWinner,small=larger==='attacker'?defenderTest:actorTest;
 return gap>=2||!small.critical?{...opposed,winner:larger,sizeAutomatic:true,sizeGap:gap}:opposed;
}
export function prepareStomp(n){
 if(n.v5.context?.talentAction!=='stomp')return{plans:[],unresolved:[]};const plan=smallSource(n.actor,n.target)||situationPlan(n.actor,'stomp'),unresolved=[];
 if(!plan.proposals.length||!Number.isSafeInteger(n.v5.actorSize)||!Number.isSafeInteger(n.v5.targetSize)||n.v5.actorSize<=n.v5.targetSize)unresolved.push('Piétinement : cible plus petite et source Grande taille requises.');
 const skill=getReferenceCatalogue().skills.find(s=>s.nom==='Corps à corps (Bagarre)'),base=n.actor.skills?.find(s=>s.id===skill.id&&s.status==='resolved')?.total??n.actor.caracs?.CC;
 if(!Number.isSafeInteger(base)||!Number.isSafeInteger(n.actor.caracs?.F))unresolved.push('Piétinement : Corps à corps (Bagarre) et Force requis.');
 n.action={...n.action,type:'attack',attr:'CC',base:base??n.action.base,damage:0,damageFormula:'BF',qualities:[],extensions:{fiche:{skillId:skill.id}}};n.v5.kind='melee';
 return{plans:[plan],unresolved};
}
