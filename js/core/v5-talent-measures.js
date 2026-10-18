/** Numerical situations use explicit inputs, without rewriting values imported from sheets. */
import {harpoonMovement,activeSource} from './v5-talent-situations.js';
import {evaluateV5Talents,hasV5Talent} from './v5-talents.js';
export const V5_TALENT_MEASURES=Object.freeze([
 {id:'defensiveSizeWeight',talentId:'talent-large',name:'Grande taille : poids contre le surnombre',key:'combatWeight',unit:'combattants',base:1},
 {id:'crewRiver',talentId:'talent-waterman',name:'Marinier : équipage fluvial',key:'crew',unit:'membres d’équipage',base:1},
 {id:'crewOcean',talentId:'talent-old-salt',name:'Loup de mer : équipage océanique',key:'crew',unit:'membres d’équipage',base:1},
 {id:'pursuitMounted',talentId:'talent-roughrider',name:'Cavalier : poursuite montée',key:'movement',unit:'Mouvement'},
 {id:'pursuitVehicle',talentId:'talent-crack-the-whip',name:'Claquer le fouet : poursuite en véhicule',key:'movement',unit:'Mouvement'},
 {id:'repair',talentId:'talent-tinker',name:'Bricoleur : durée de réparation',key:'duration',unit:'unités de temps'},
 {id:'hack',talentId:'talent-demolisher',name:'Démolisseur : dégâts au matériel avec Hack',key:'materialDamage',unit:'Dégâts au matériel'},
 {id:'outnumber',talentId:'talent-combat-master',name:'Maîtrise du combat : contribution au surnombre',key:'combatWeight',unit:'combattants',base:1},
 {id:'movement',talentId:'talent-striding-gait',name:'Bon marcheur : mouvement dans le terrain choisi',key:'movement',unit:'Mouvement'}
]);
export function availableV5TalentMeasures(subject){return [...V5_TALENT_MEASURES.filter(row=>hasV5Talent(subject,row.talentId)),...((subject.states||[]).some(s=>s.key==='lodged-bolt'&&activeSource(s))?[{id:'harpoonMovement',talentId:'talent-harpooner',name:'Carreaux fichés : Mouvement restant',key:'movement',unit:'Mouvement'}]:[])];}
export function previewV5TalentMeasure(subject,request={}){
 const spec=availableV5TalentMeasures(subject).find(row=>row.id===request.situation);if(!spec)throw new TypeError('Calcul de talent indisponible');
 const base=spec.base??request.base,penalty=request.terrainPenalty??0;
 if(!Number.isFinite(base)||base<0||!Number.isFinite(penalty)||penalty<0)throw new TypeError('Valeur de départ et pénalité positives requises');
 if(spec.id==='harpoonMovement'){const origins=(subject.states||[]).filter(s=>s.key==='lodged-bolt'&&activeSource(s)).map(s=>s.source);return{spec,plan:{proposals:[{origins}]},ready:true,base,value:harpoonMovement(subject,base),unresolved:[]};}
 const plan=evaluateV5Talents(subject,{event:'situation.calculate',role:'actor',context:request,includeTalents:[spec.talentId]});
 const sourceUnavailable=plan.trace.some(row=>['sourceChanged','sourceUnavailable','draft'].includes(row.status));
 let value=base;for(const p of plan.proposals){if(p.op==='modifyQuantity')value+=p.amount;if(p.op==='divideQuantity')value/=p.amount;}
 if(spec.id==='movement'&&!plan.proposals.some(p=>p.op==='ignoreQuantityPenalty'))value=Math.max(0,value-penalty);
 const unresolved=plan.unresolved.flatMap(row=>row.fields.map(field=>'Préciser '+field+'.'));if(sourceUnavailable)unresolved.push('Source du talent à revalider.');
 return{spec,plan,ready:!unresolved.length,base,value,unresolved};
}
