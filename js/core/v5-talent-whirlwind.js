import{situationPlan}from'./v5-talent-situations.js';
export function previewWhirlwind(n){
 const c=n.v5.context||{},plans=[],unresolved=[];if(c.specialAttack!=='whirlwind-of-death')return{plans,unresolved,active:false};
 const plan=situationPlan(n.actor,'whirlwind-of-death');plans.push(plan);
 if(!plan.proposals.length||n.v5.kind!=='melee'||!['attack','attaque'].includes(n.action.type)||!n.defense||!n.target||n.target.camp===n.actor.camp||!Array.isArray(c.engagedIds)||!c.engagedIds.includes(n.target.id)||c.engagedIds.includes(n.actor.id)||new Set(c.engagedIds).size!==c.engagedIds.length||c.allEngagedIncluded!==true||c.engagedIds.some(id=>!n.v5State.participants.some(p=>p.id===id))||n.v5.charging||n.v5.extraAttack||c.calledShot||n.v5.talentChoices?.['talent-beat-blade:replace-damage'])unresolved.push('Tourbillon de mort : Action de mêlée, ennemi opposant choisi par le MJ, toutes les créatures engagées et aucun autre choix d’attaque spéciale requis.');
 return{plans,unresolved,active:!unresolved.length};
}
