import { baseCharacteristicScore } from './v5-magic-talents.js';
import { natureProtection } from './creature-natures.js';

/**
 * Actions conférées par les sorts actifs (hallebarde Magique de la Faux de Shyish) : lues sur les couches d'effet, donc retirées
 * avec elles. Le score est celui de la caractéristique de base du porteur ; l'écart des couches s'ajoute à la résolution.
 */
export function magicGrantedActions(participant){
 return (participant?.extensions?.v5?.spellEffects || []).filter(effect=>!(participant.extensions.v5.suppressedEffectIds || []).includes(effect.id)).flatMap(effect=>(effect.grantedActions || []).filter(action=>!(participant.actions || []).some(a=>a.id===action.id&&a.extensions?.v5?.spellEffectId===effect.id)).map(action=>({
  ...structuredClone(action),id:`spell-weapon:${effect.id}:${action.id}`,base:action.base ?? baseCharacteristicScore(participant,action.attr),mod:0,spellEffectId:effect.id
 })));
}

/**
 * Attaques de la créature sous Forme bestiale ou Transformation de Kadon, lues sur la forme enregistrée (retirées avec elle).
 * Forme bestiale : Test de Corps à corps (Bagarre) du lanceur, à défaut sa CC, comme les autres attaques sans arme ;
 * Kadon : valeur de la ligne du monstre. Dégâts = BF de la Force remplacée + bonus de la ligne du bestiaire.
 */
export function beastFormActions(participant){
 const form=participant?.extensions?.v5?.beastForm;if(!form)return[];
 const kadon=form.kind==='kadon';
 const brawling=(participant.skills||[]).find(skill=>/bagarre/i.test(String(skill.name||'')) && skill.status==='resolved' && Number.isFinite(skill.total));
 const bonusText=bonus=>bonus>0?`BF+${bonus}`:bonus<0?`BF${bonus}`:'BF';
 const clauses={momentum:' — attaque gratuite en perdant l’Élan',charge:' — attaque gratuite seulement en chargeant',all:''};
 return (form.attacks||[]).map(attack=>({
  id:`beast-form:${attack.id}`,note:`${attack.name} (${form.name})${clauses[attack.free]||''}`,type:'attack',attr:'CC',
  base:kadon?attack.value:brawling?.total ?? baseCharacteristicScore(participant,'CC'),mod:0,
  damageFormula:bonusText(attack.damageBonus),qualities:(attack.qualities||[]).map(id=>({id})),
  extensions:{v5:{kind:'melee',beastAttack:{free:attack.free,count:attack.count,note:attack.note}}}
 }));
}

/** Caractéristique absente de la créature (Dex « – ») : Test impossible ; clauses des attaques gratuites de la créature. */
export function transformationRestrictions(actor,action={},{defending=false,charging=false,momentum=false}={}){
 if((actor.extensions?.v5?.suppressedEffectIds || []).includes(action.extensions?.v5?.spellEffectId || action.spellEffectId))return ['Impasse : cette action conférée est temporairement suspendue.'];
 const form=actor?.extensions?.v5?.beastForm;if(!form)return[];
 const name=form.kind==='kadon'?'Transformation de Kadon':'Forme bestiale',list=[];
 if(form.absentCaracs?.some(key=>String(key).toLowerCase()===String(action.attr).toLowerCase()))list.push(`${name} : ${action.attr} absente, ce Test est impossible.`);
 const free=action.extensions?.v5?.beastAttack?.free;
 if(!defending&&free==='charge'&&!charging)list.push(`${name} : cette attaque gratuite exige de charger.`);
 if(!defending&&free==='momentum'&&!momentum)list.push(`${name} : cette attaque gratuite exige de perdre l’Élan.`);
 return list;
}

/**
 * Bonus d'arme enchantée applicables à une attaque : seulement l'arme désignée (`equipmentId`), et jamais au tir — sauf clause
 * `ranged` du sort (Flèche bénie), qui ne vaut alors que pour un tir. `ranged` inconnu n'exclut rien.
 */
const isUnarmed=action=>action.id==='unarmed' || action.extensions?.v5?.unarmed===true || /sans arme|unarmed|bagarre|serres/i.test(action.note || action.name || '');
const weaponBonusesFor=(actor,action={},ranged)=>(actor?.extensions?.v5?.weaponBonuses || []).filter(b=>(!b.equipmentId || b.equipmentId===(action.extensions?.fiche?.equipmentId || action.id))&&(!b.unarmedOnly || isUnarmed(action))&&(b.ranged===true?ranged!==false:ranged!==true));
export function magicWeaponQualities(actor,action={},ranged){
 const bonuses=weaponBonusesFor(actor,action,ranged),removed=bonuses.flatMap(b=>b.removeQualities || []);
 const ids={damaging:'devastatrice',magical:'magique',unbreakable:'incassable',undamaging:'inoffensive'};
 return [...(action.qualities || []).filter(q=>!removed.some(id=>q.id===(ids[id] || id))),...bonuses.flatMap(b=>(b.qualities || []).map(id=>({id:ids[id] || id})))];
}

/** Couches de protection et bonus d'arme du combat, sans mutation ni tirage. */
export function magicWeaponBonus(actor,action={},ranged,baseBonus=0){
 if(!['attack','attaque'].includes(action.type))return 0;
 const bonuses=weaponBonusesFor(actor,action,ranged);
  const replacements=bonuses.filter(b=>b.replaceDamageBonus!==undefined);
  const replacement=replacements.length ? Math.max(...replacements.map(b=>Number(b.replaceDamageBonus)))-baseBonus : 0;
  return replacement+Math.max(0,...bonuses.filter(b=>b.replaceDamageBonus===undefined).map(b=>Number(b.damage) || 0));
}

/** États que l'arme enchantée inflige à la créature touchée (Épée enflammée de Rhuin : Enflammé), jamais à son porteur. */
export function magicWeaponHitConditions(actor,action={},ranged,wounds=0){
 if(!['attack','attaque'].includes(action.type))return [];
 return weaponBonusesFor(actor,action,ranged).filter(b=>!b.onWoundsOnly || wounds>0).flatMap(b=>(b.hitConditions||[]).map(name=>({name,spellName:b.spellName})));
}

/** Nature d'une arme enchantée (Épée enflammée de Rhuin) : l'attaque est magique, et de feu si l'arme enflamme. */
export function magicWeaponNature(actor,action={},ranged){
 if(!['attack','attaque'].includes(action.type))return {};
 const bonuses=weaponBonusesFor(actor,action,ranged);
 return {...(bonuses.some(b=>b.magical)?{magical:true}:{}),...(bonuses.some(b=>(b.hitConditions||[]).includes('Enflammé'))?{fire:true}:{})};
}

/** États que l'arme enchantée inflige à son porteur sur une maladresse (Épée enflammée de Rhuin), sauf Magie des Arcanes du Domaine exempté. */
export function magicWeaponFumbleConditions(actor,action={},ranged){
 if(!['attack','attaque'].includes(action.type))return [];
 return weaponBonusesFor(actor,action,ranged).filter(b=>b.fumbleCondition).map(b=>({name:b.fumbleCondition.name,exceptLore:b.fumbleCondition.exceptLore,spellName:b.spellName}));
}

const TAG_LABELS={magical:'attaque magique',ranged:'attaque à distance',melee:'attaque de contact',fire:'feu',cold:'froid',metal:'arme en métal',organicProjectile:'projectile organique',blunt:'arme contondante',external:'origine extérieure à la zone',fall:'chute',crush:'écrasement'};
const tagLabel=tag=>TAG_LABELS[tag]||`condition « ${tag} »`;

/**
 * Nature d'une attaque : faits déduits (arme de contact ou à distance, qualité Magique ou Enflammée) et faits déclarés par le MJ.
 * Une arme ou un sort ordinaire n'est ni une chute ni un écrasement ; un projectile organique est forcément un tir non
 * magique ; un sort n'est ni une arme en métal ni une arme contondante (`spell`). Les autres étiquettes (métal,
 * contondante, origine) restent `undefined` tant que le MJ ne les déclare pas : jamais présumées fausses.
 * Le MJ peut déclarer toute étiquette, y compris `magical` et `fire` déduites des qualités.
 */
export function attackNature({ranged,qualities=[],magical,fire,cold,spell=false,declared={}}={}){
 const ids=(qualities||[]).map(q=>typeof q==='string'?q:q?.id);
 const known=(value,fallback)=>typeof value==='boolean'?value:fallback;
 const rangedValue=typeof ranged==='boolean'?ranged:undefined;
 const rangedKnown=known(declared.ranged,rangedValue);
 const magicalKnown=known(declared.magical,known(magical,ids.includes('magique')));
 return {
  magical:magicalKnown,
  ranged:rangedKnown,
  melee:typeof rangedKnown==='boolean'?!rangedKnown:undefined,
  fire:known(declared.fire,known(fire,ids.includes('enflammee'))),
  ...(typeof known(declared.cold,cold)==='boolean'?{cold:known(declared.cold,cold)}:{}),
  metal:known(declared.metal,spell?false:undefined),
  organicProjectile:known(declared.organicProjectile,rangedKnown===false||magicalKnown?false:undefined),
  blunt:known(declared.blunt,spell?false:undefined),
  external:known(declared.external,undefined),
  fall:known(declared.fall,false),
  crush:known(declared.crush,false)
 };
}

/** Nature de l'attaque d'une arme : contact ou tir (déduit de l'arme ou de la nature du Test), qualités et enchantement de l'arme. */
export function weaponAttackNature({actor,action={},ranged,kind,declared}={}){
 const rangedValue=typeof ranged==='boolean'?ranged:kind==='ranged'?true:kind==='melee'?false:undefined;
 const weapon=magicWeaponNature(actor,action,rangedValue);
 return attackNature({ranged:rangedValue,qualities:action.qualities,magical:weapon.magical,fire:weapon.fire,declared});
}

/** Nature d'un sort lancé : attaque magique de contact ou à distance, de feu par le Domaine ou l'attribut choisi. */
export function spellAttackNature(contract,{attributeLore,declared}={}){
 return attackNature({ranged:!/^(vous|contact|toucher)/i.test(String(contract?.range||'').trim()),magical:true,fire:contract?.domain==='fire'||attributeLore==='fire',spell:true,declared:{...contract?.effects?.attackNature,...Object.fromEntries(Object.entries(declared || {}).filter(([,v])=>typeof v==='boolean'))}});
}

/** Étiquettes que le MJ doit renseigner pour trancher les filtres donnés. */
export function filterTags(filter){return [...new Set([...(filter?.all||[]),...(filter?.any||[]),...(filter?.not||[])])];}

/**
 * Filtre `{all,any,not}` contre la nature d'une attaque : 'yes', 'no' ou 'unknown' (avec les étiquettes à demander).
 * Un filtre absent s'applique à toute attaque.
 */
export function matchFilter(filter,nature={}){
 if(!filter)return {match:'yes',unknown:[]};
 const unknown=new Set();let no=false;
 for(const tag of filter.all||[]){if(nature[tag]===false)no=true;else if(nature[tag]===undefined)unknown.add(tag);}
 for(const tag of filter.not||[]){if(nature[tag]===true)no=true;else if(nature[tag]===undefined)unknown.add(tag);}
 const any=filter.any||[];
 if(any.length&&!any.some(tag=>nature[tag]===true)){if(any.every(tag=>nature[tag]===false))no=true;else any.filter(tag=>nature[tag]===undefined).forEach(tag=>unknown.add(tag));}
 return no?{match:'no',unknown:[]}:unknown.size?{match:'unknown',unknown:[...unknown]}:{match:'yes',unknown:[]};
}

/**
 * Protections jouées pour une attaque : la meilleure, plus pour chaque lanceur de Bénédiction de Lileath (HEPG p. 83, rang lu
 * sur la couche au lancement) autant de ses autres Protections que son rang. Seuils triés du meilleur au moins bon ; un d10 chacun.
 */
export function admittedWards(layers){
 const sorted=[...layers].sort((a,b)=>Number(a.threshold)-Number(b.threshold));
 if(!sorted.length)return [];
 const taken=new Set([sorted[0]]),ranks=new Map();
 for(const layer of sorted)if(layer.casterId!=null&&Number(layer.lileathRank)>0)ranks.set(layer.casterId,Math.max(ranks.get(layer.casterId)||0,Number(layer.lileathRank)));
 for(const [casterId,rank] of ranks)for(const layer of sorted.filter(item=>item.casterId===casterId&&!taken.has(item)).slice(0,rank))taken.add(layer);
 return sorted.filter(layer=>taken.has(layer)).map(layer=>Number(layer.threshold));
}

/** Nombre de d10 de Protection à demander avant de connaître la nature de l'attaque (0 si aucune Protection à jet). */
export function wardDiceCount(v5,nature=null){const wards=admittedWards(wardLayers(v5).filter(layer=>!nature || matchFilter(layer.filter,nature).match!=='no'));return wards.length&&wards[0]>1?wards.length:0;}

/** Couches typées d'une cible : liste posée par les effets, sinon valeur plate historique sans filtre. */
export function wardLayers(v5){
 if(Array.isArray(v5?.wards))return v5.wards;
 return v5?.ward==null?[]:[{threshold:Number(v5.ward),filter:null}];
}
/** Couches de la cible : celles posées par les effets, plus celles de ses Traits de nature (Éthéré, Démoniaque, Protection, Immunité). */
const targetWards=target=>[...wardLayers(target?.extensions?.v5||{}),...natureProtection(target).wards];
const targetDamageImmunities=target=>[...(target?.extensions?.v5?.immunities?.damage||[]),...natureProtection(target).immunities];
export function reductionLayers(v5){
 if(Array.isArray(v5?.damageReductions))return v5.damageReductions;
 return Number(v5?.damageReduction)>0?[{amount:Number(v5.damageReduction),filter:null}]:[];
}

/**
 * Étiquettes que le MJ doit ou peut renseigner pour la Protection de la cible face à cette nature d'attaque : celles dont
 * la réponse manque (`unknown`) et les faits déduits (magique, feu, chute, écrasement) qu'une déclaration du MJ ferait
 * changer de résultat. Rien n'est demandé quand le filtre est déjà tranché (pas de question d'origine pour une attaque de
 * contact contre un Dôme) ; une attaque de contact n'est magique que par sa qualité ou son enchantement.
 */
export function targetNatureTags(target,nature={}){
 const v5=target?.extensions?.v5||{};
 const tags=new Set();
 for(const layer of [...targetWards(target),...reductionLayers(v5),...(v5.conditionalAp||[]),...targetDamageImmunities(target),...(v5.reflects||[])]){
  const filter=layer.filter;if(!filter)continue;
  const found=matchFilter(filter,nature);
  if(found.match==='unknown')found.unknown.forEach(tag=>tags.add(tag));
  for(const tag of filterTags(filter).filter(tag=>DEDUCED_TAGS.includes(tag))){
   if(tag==='magical'&&nature.ranged===false)continue;
   if(matchFilter(filter,{...nature,[tag]:!nature[tag]}).match!==found.match)tags.add(tag);
  }
 }
 return [...tags].filter(tag=>!['ranged','melee'].includes(tag));
}
/** Étiquettes déduites par défaut mais que le MJ peut déclarer. */
export const DEDUCED_TAGS=['magical','fire','fall','crush'];
export const natureTagLabel=tagLabel;

const needs=(tags,subject)=>`${subject} : préciser ${tags.map(tagLabel).join(', ')}.`;

/**
 * Dégâts après immunité, réduction de dégâts et Protection. Seules les couches dont le filtre correspond à la nature de
 * l'attaque s'appliquent ; la meilleure de chaque sorte est retenue. Une Protection réussie n'annule que les dégâts.
 * `calm` = Test de Calme exigé par certaines réductions (Capuche Vengeresse) : `{success,sl}`.
 */
export function previewMagicProtection(target,amount,{wardRoll=null,nature={},calm=null}={}){
 const original=Math.max(0,Number(amount)||0),v5=target?.extensions?.v5||{};
 const base={ready:true,amount:original,reduction:0,wardSaved:false};
 if(!original)return base;
 const missing=[];
 for(const immunity of targetDamageImmunities(target)){
  const found=matchFilter(immunity.filter,nature);
  if(found.match==='yes')return {...base,amount:0,immune:true,immunity:immunity.label||null};
  if(found.match==='unknown')missing.push(...found.unknown);
 }
 let reduction=0;
 for(const layer of reductionLayers(v5)){
  const found=matchFilter(layer.filter,nature);
  if(found.match==='unknown'){missing.push(...found.unknown);continue;}
  if(found.match!=='yes')continue;
  let value=Math.max(0,Number(layer.amount)||0);
  if(layer.calmTest){
   if(!calm||typeof calm.success!=='boolean')return {...base,ready:false,reduction,error:`${layer.spellName||'Réduction de dégâts'} : saisir le Test de Calme (+0 DR) contre cette attaque.`};
   value=calm.success?value+Math.max(0,Number(calm.sl)||0):0;
  }
  reduction=Math.max(reduction,value);
 }
 const afterReduction=Math.max(0,original-reduction);
 const applicable=[];
 for(const layer of targetWards(target)){
  const found=matchFilter(layer.filter,nature);
  if(found.match==='unknown')missing.push(...found.unknown);else if(found.match==='yes')applicable.push(layer);
 }
 const wards=admittedWards(applicable);
 if(missing.length)return {...base,ready:false,amount:afterReduction,reduction,unknown:[...new Set(missing)],error:needs([...new Set(missing)],'Protection de '+(target?.name||'la cible'))};
 if(!wards.length||!afterReduction)return {...base,amount:afterReduction,reduction};
 const ward=wards[0];
 if(ward<=1)return {ready:true,amount:0,reduction,wardSaved:true,ward,automatic:true};
 // Une Protection par jet : le scalaire historique ne répond qu'à une seule Protection admise.
 const dice=Array.isArray(wardRoll)?wardRoll.slice(0,wards.length):wards.length===1?[wardRoll]:[];
 if(dice.length!==wards.length||dice.some(die=>!Number.isInteger(die)||die<1||die>10))return {ready:false,amount:afterReduction,reduction,ward,wards,error:wards.length===1?'Protection '+ward+'+ : saisir le résultat du d10.':'Protections '+wards.map(w=>w+'+').join(', ')+' (Bénédiction de Lileath) : saisir '+wards.length+' d10, un par Protection, dans cet ordre.'};
 const saved=wards.some((threshold,index)=>dice[index]>=threshold);return {ready:true,amount:saved?0:afterReduction,reduction,wardSaved:saved,ward,wardRoll:wards.length===1?dice[0]:dice,...(wards.length>1?{wards,wardRolls:dice}:{})};
}

/** PA conditionnels (Bouclier céruléen : métal) : meilleur bonus applicable, ou étiquettes à demander. */
export function conditionalArmour(target,nature={}){
 let bonus=0;const unknown=[];
 for(const layer of target?.extensions?.v5?.conditionalAp||[]){
  const found=matchFilter(layer.filter,nature);
  if(found.match==='yes')bonus=Math.max(bonus,Number(layer.ap)||0);else if(found.match==='unknown')unknown.push(...found.unknown);
 }
 return {bonus,unknown:[...new Set(unknown)]};
}

/** Rappels de réaction (dégâts renvoyés à l'attaquant) des couches de la cible qui correspondent à l'attaque. */
export function reactionReminders(target,nature={}){
 return (target?.extensions?.v5?.reflects||[]).filter(layer=>matchFilter(layer.filter,nature).match==='yes').map(layer=>layer.summary).filter(Boolean);
}
