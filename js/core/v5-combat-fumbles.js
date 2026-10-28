import {
  V5_BLACKPOWDER_INCIDENT_TABLE,
  V5_COMBAT_FUMBLE_TABLE,
  V5_SALVO_ARTILLERY_MISFIRE_TABLE,
  V5_FUMBLE_TABLE_VERSION,
  V5_MISFIRE_TABLE_VERSION
} from '../data/v5-combat-fumbles.js';
import { getV5CriticalEffect } from '../data/v5-crits.js';
import { evaluateWeaponDamage, strengthBonusOf } from './damage.js';
import { previewV5Test } from './v5-roll.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
const keyOf = row => typeof row === 'string' ? row : row?.id;
const readRoll = (value, name) => {
  if (value === undefined || value === null || value === '') return { missing: true };
  const roll = Number(value);
  return Number.isInteger(roll) && roll >= 1 && roll <= 10 ? { roll } : { error: `${name} doit être un résultat entier de 1 à 10.` };
};
const tableRow = (table, roll) => table.find(row => roll >= row.min && roll <= row.max) || null;

/** Pure resource check used by the black-powder flows. It only proposes debits;
 * resolution must apply them atomically to the equipment instances. */
export function previewV5BlackpowderResources({ projectileCount = 0, powderCharges = 0, projectileItemIds = [], powderItemIds = [], projectilesRequired = 1, powderRequired = 1 } = {}) {
  const projectiles = Number(projectileCount), powder = Number(powderCharges);
  const requiredProjectiles = Number(projectilesRequired), requiredPowder = Number(powderRequired);
  const unresolved = [];
  if (![projectiles, powder, requiredProjectiles, requiredPowder].every(Number.isSafeInteger) ||
      projectiles < 0 || powder < 0 || requiredProjectiles < 0 || requiredPowder < 0) {
    unresolved.push('Munitions et charges de poudre : quantités entières non négatives requises.');
  } else {
    if (projectiles < requiredProjectiles) unresolved.push(`Projectiles insuffisants : ${requiredProjectiles} requis, ${projectiles} disponibles.`);
    if (powder < requiredPowder) unresolved.push(`Charges de poudre insuffisantes : ${requiredPowder} requises, ${powder} disponibles.`);
  }
  return unresolved.length ? { ready: false, unresolved, debits: [] } : {
    ready: true, unresolved: [], debits: [
      ...(requiredProjectiles ? [{ resource: 'projectile', amount: requiredProjectiles }] : []),
      ...(requiredPowder ? [{ resource: 'powder-charge', amount: requiredPowder }] : [])
    ]
  };
}

/** Round deadline for a lit bomb. The caller must invoke this at the Round
 * boundary; a normal attack preview cannot itself guarantee detonation. */
export function previewV5BombFuse({ currentRound, currentTurnIndex, currentActorId, fuseTurns, fuseLit } = {}) {
  const round = Number(currentRound), turnIndex = Number(currentTurnIndex), turns = Number(fuseTurns);
  if (fuseLit !== true) return { ready: false, unresolved: ['La bombe doit avoir sa mèche allumée avant le chargement (L13-0117).'] };
  if (!Number.isInteger(round) || round < 1 || !Number.isInteger(turnIndex) || turnIndex < 1 || !Number.isInteger(turns) || turns < 1 || turns > 10 || typeof currentActorId!=='string' || !currentActorId)
    return { ready: false, unresolved: ['Round, index de Tour, porteur et délai de mèche entier de 1 à 10 requis (L13-0117).'] };
  return { ready: true, unresolved: [], dueRound: round, dueTurnIndex: turnIndex + turns - 1, dueActorId:currentActorId, fuseTurnsRemaining:turns };
}

/** Shared movement guard for ordinary movement and Flee; consumers must call
 * this before committing any Move action. */
export function canUseV5Move(combatEffects = []) {
  const lost = Array.isArray(combatEffects) && combatEffects.some(effect => effect?.kind === 'lose-next-move');
  return lost ? { ready: false, reason: 'Maladresse précédente : ce Mouvement est perdu pour ce Tour.' } : { ready: true, reason: null };
}

function stockChange(actor, context, projectileCost, powderCost, source, unresolved) {
  const beforeErrors=unresolved.length;
  const saved=actor?.extensions?.v5?.blackpowderStock;
  const initial=context.blackpowderStockInitial;
  const stock=saved?.version===1?saved:(initial?.confirmed===true?{version:1,projectiles:Number(initial.projectiles),powderCharges:Number(initial.powderCharges),history:[]}:null);
  if(!stock||![stock.projectiles,stock.powderCharges].every(value=>Number.isSafeInteger(value)&&value>=0)){
    unresolved.push('Stock de poudre noire : le MJ doit initialiser et confirmer les nombres de projectiles et charges avant toute consommation.');return null;
  }
  if(stock.projectiles<projectileCost)unresolved.push(`Stock de poudre noire : ${projectileCost} projectile(s) requis, ${stock.projectiles} disponible(s).`);
  if(stock.powderCharges<powderCost)unresolved.push(`Stock de poudre noire : ${powderCost} charge(s) requise(s), ${stock.powderCharges} disponible(s).`);
  if(unresolved.length>beforeErrors)return null;
  return {type:'blackpowder-stock-change',targetId:actor.id,source,initialized:!saved,before:{projectiles:stock.projectiles,powderCharges:stock.powderCharges},after:{projectiles:stock.projectiles-projectileCost,powderCharges:stock.powderCharges-powderCost},debits:{projectiles:projectileCost,powderCharges:powderCost}};
}

export function isBlackpowderIncidentEligible({ actor, action, context = {}, weapon } = {}) {
  const item = weapon || actor?.equipment?.find(row => row.id === action?.extensions?.fiche?.equipmentId) || action?.extensions?.equipment;
  const words = [...(action?.qualities || []), ...(item?.keywords || [])].map(keyOf).map(fold);
  const group = fold(context.weaponGroup || context.weaponTrainingGroup || item?.category || action?.extensions?.v5?.weaponGroup);
  return words.includes('a-poudre-noire') || /poudre noire|blackpowder|engineering|ingenierie|explosif|explosive/.test(group);
}

function participantEffects(normalized, context, resolution = {}) {
  const actorId = normalized.actor?.id;
  const targetIds = context.designatedTargetIds;
  const item=normalized.actor?.equipment?.find(row=>row.id===normalized.action?.extensions?.fiche?.equipmentId)||normalized.action?.extensions?.equipment||normalized.actor?.equipment?.find(row=>fold(row.name)===fold(context.weaponName));
  const weaponName = fold(context.weaponName || item?.name || normalized.action?.note || normalized.action?.name);
  const isGunAxe = /hache.fusil|gun axe/.test(weaponName);
  const isGunHalberd = /hallebarde.fusil|gun halberd/.test(weaponName);
  const isHandMortar = /mortier (?:a|de) main|hand mortar/.test(weaponName);
  const isGriffonsfoot = /griffonsfoot/.test(weaponName);
  const isVolleyGun = /arquebuse a salve|volley gun/.test(weaponName);
  const isMatchlock = /matchlock|meche/.test(weaponName);
  const isAttack = ['attack','attaque'].includes(fold(normalized.action?.type));
  // Matchlocks must pass the fuse gate even if the caller omitted the optional
  // `firing` flag. That flag is only a hint for specialised weapon flows.
  const firing=context.firing===true||(isAttack&&context.reloading!==true&&context.lightFuseAction!==true&&(isHandMortar||isGriffonsfoot||isVolleyGun||isMatchlock));
  const effects = [];
  const reminders = [];
  const unresolved = [];

  if(context.bombDetonation===true){
    const pending=(normalized.actor?.extensions?.v5?.combatEffects||[]).find(row=>row.kind==='bomb-detonation');
    const targets=Array.isArray(context.designatedTargetIds)?[...new Set(context.designatedTargetIds)]:[];
    const damage=Number(context.bombDamage);
    if(!pending)unresolved.push('Aucune bombe échue à résoudre pour ce personnage.');
    if(!targets.length)unresolved.push('Détonation : le MJ doit désigner au moins une cible touchée.');
    if(!Number.isSafeInteger(damage)||damage<0)unresolved.push('Détonation : dégâts entiers non négatifs à confirmer par le MJ; L13 p. 104 ne fournit pas de profil de dégâts.');
    const participants=normalized.v5State?.participants||[];
    for(const id of targets)if(!participants.some(row=>row.id===id&&row.zone==='active'))unresolved.push(`Détonation : cible active introuvable (${id}).`);
    if(pending&&targets.length&&Number.isSafeInteger(damage)&&damage>=0&&targets.every(id=>participants.some(row=>row.id===id&&row.zone==='active'))){
      for(const id of targets){const target=participants.find(row=>row.id===id);effects.push({type:'bomb-explosion-target',targetId:id,targetSnapshot:target,sourceActorId:actorId,bombEffectId:pending.id,damage,convertedFrom:'L13-0117'});}
    }
  }

  if (context.reloading === true && isHandMortar && resolution.fumble===true) {
    const profileDamage=item?.damage??item?.damageFormula??normalized.action?.damageFormula??normalized.action?.damage;
    const evaluated=evaluateWeaponDamage(profileDamage,strengthBonusOf(normalized.actor?.caracs));
    const damage=evaluated.status==='resolved'&&evaluated.value>=0?evaluated.value:null;
    if(damage===null)unresolved.push('Mortier de main : les dégâts du profil d’arme à +0 DR sont requis pour résoudre l’explosion du rechargement (L13-0112).');
    else if(!['left','right'].includes(context.weaponExplosionArmSide)) unresolved.push('Mortier à main : le MJ doit indiquer le bras directeur touché (gauche ou droit).');
    else effects.push({ type: 'weapon-explosion', targetId: actorId, equipmentId:item?.id||normalized.action?.extensions?.fiche?.equipmentId, location:'bras-principal',armSide:context.weaponExplosionArmSide,damage,damageMode:'profile-at-zero-sl',sl:0,reason: 'maladresse-au-rechargement-du-mortier-a-main', convertedFrom: 'L13-0112' });
  }
  if(isVolleyGun&&context.crewCount===1){
    if(typeof context.moved!=='boolean')unresolved.push('Servant unique : le MJ doit préciser si l’arme a été déplacée pendant ce Tour (L15-0163).');
    else if(context.moved)unresolved.push('Servant unique : l’arme ne peut pas être déplacée pendant l’utilisation ou le rechargement (L15-0163).');
  }
  if(isVolleyGun&&(!Number.isSafeInteger(Number(context.crewCount))||Number(context.crewCount)<1))
    unresolved.push('Arquebuse à salve : indiquez un nombre de servants positif (entier; L15-0163).');
  if(context.reloading===true&&isVolleyGun){
    const reload=Number(context.weaponReload??item?.reload??item?.extensions?.v5?.reload);
    if(!Number.isInteger(reload)||reload<1)unresolved.push('Arquebuse à salve : valeur Recharge requise pour calculer les succès restants.');
    else if(!item?.id)unresolved.push('Arquebuse à salve : liez l’exemplaire d’arme pour enregistrer la progression de Recharge.');
    else if(resolution.success===true)effects.push({type:'reload-progress',targetId:actorId,equipmentId:item?.id,successes:1+Math.max(0,Number(resolution.sl)||0),requiredSuccesses:reload*(context.crewCount===1?2:1),crewCount:context.crewCount||2});
    else reminders.push('Rechargement raté : aucun succès de Recharge ajouté.');
  }
  if (firing && isGriffonsfoot) {
    const loadedCharges=Number(item?.extensions?.v5?.loadedCharges);
    if (!Number.isInteger(loadedCharges) || loadedCharges < 6) {
      unresolved.push('Griffonsfoot : les six canons doivent être chargés avant le tir; rechargez six projectiles et six charges de poudre (L13-0108).');
    } else effects.push({ type:'griffonsfoot-discharge',targetId:actorId,equipmentId:item?.id||normalized.action?.extensions?.fiche?.equipmentId||null,charges:6,convertedFrom:'L13-0108' });
  }
  if (firing && isVolleyGun) {
    reminders.push('Arquebuse à salve (conversion V5 de L13-0179) : test de Résistance à +2 DR ; retirez 1 Blessure par DR négatif, et sur un échec stupéfiant, critique à l’épaule via la table du bras. Une munition et une charge par coup.');
    const change=stockChange(normalized.actor,context,1,1,'L13-0179',unresolved);if(change)effects.push(change);
    const base=Number(context.recoilTestBase), testRoll=Number(context.recoilTestRoll);
    if(!Number.isInteger(base)||base<1||base>100||!Number.isInteger(testRoll)||testRoll<1||testRoll>100)unresolved.push('Arquebuse à salve : saisissez le Test de Résistance à +2 DR et son d100 (L13-0179).');
    else {
      const test=previewV5Test({score:base,roll:testRoll,kind:'test',slModifiers:[{id:'salvo-recoil',label:'Résistance (+2 DR)',amount:2}]}).options[0].result;
      const sl=test.sl,success=test.success,astoundingFailure=!success&&sl<=-5;
      let armCritical=null;
      if(astoundingFailure){const severity=Number(context.recoilCriticalRolls);if(!Number.isInteger(severity)||severity<1||severity>100)unresolved.push('Arquebuse à salve : le critique à l’épaule requiert un d100 sur la table critique du bras (L13-0179).');else {const tableEffect=getV5CriticalEffect('ARM',severity);armCritical={location:{key:'ARM',name:'Bras'},locationRoll:null,effectRoll:severity,effect:tableEffect,parsed:tableEffect?.parsed||null,pending:!tableEffect};if(!tableEffect)unresolved.push('Arquebuse à salve : ligne de critique du bras introuvable.');else if(tableEffect.parsed?.death)unresolved.push('Arquebuse à salve : effet mortel de la table du bras ; décision MJ explicite requise avant application.');}}
      effects.push({type:'volley-recoil',targetId:actorId,sl,success,fumble:test.fumble,automatic:test.details.automatic,astoundingFailure,armCritical,convertedModifier:2});
    }
  }
  if ((isGunAxe || isGunHalberd) && context.meleeUse === true && context.weaponLoaded === true && resolution.fumble===true) {
    if (isGunAxe) effects.push({ type: 'weapon-discharge', targetId: actorId, location: 'torse', damage:Number(String(item?.damage??normalized.action?.damage??0).replace(/^\+/u,'')), reason: 'hache-fusil-chargee', convertedFrom: 'L13-0109' });
    else if (!Array.isArray(targetIds) || targetIds.length === 0) unresolved.push('Hallebarde-fusil chargée : désignez les cibles derrière le porteur pour le tir de la maladresse (L13-0110).');
    else effects.push(...targetIds.map(id=>({type:'weapon-discharge',targetId:id,location:'torse',damage:normalized.action?.damage,reason:'hallebarde-fusil-chargee',convertedFrom:'L13-0110'})));
  }
  const lit=context.weaponLit===true||item?.extensions?.v5?.fuseLit===true;
  if (lit && context.weatherExtinguishesFuse === true) effects.push({ type: 'extinguish-fuse', targetId: actorId,equipmentId:item?.id, reason: 'pluie-ou-vent', convertedFrom: 'L13-0107' });
  if (context.lightFuseAction === true) {if(!item?.id)unresolved.push('Arme à mèche : liez l’exemplaire pour enregistrer durablement la mèche.');else effects.push({type:'light-fuse',targetId:actorId,equipmentId:item.id,convertedFrom:'L13-0107'});}
  if (context.bombPayload===true) {
    const mortarName=fold(item?.name||context.weaponName||normalized.action?.note);
    const isMortar=/mortier (?:a|de) main|hand mortar/.test(mortarName);
    if(!isMortar||context.reloading!==true) unresolved.push('Bombe incendiaire : elle doit être chargée dans un mortier à main pendant son rechargement réussi (L13-0117).');
    else if(resolution.success!==true) unresolved.push('Bombe incendiaire : le rechargement du mortier doit réussir avant de fixer la mèche (L13-0117).');
    else {
      const bomb=previewV5BombFuse({currentRound:context.currentRound,currentTurnIndex:context.currentTurnIndex,currentActorId:actorId,fuseTurns:context.fuseTurns,fuseLit:context.bombFuseLit===true});
      if(!bomb.ready)unresolved.push(...bomb.unresolved);
      else effects.push({type:'bomb-fuse',targetId:actorId,equipmentId:item?.id,dueRound:bomb.dueRound,dueTurnIndex:bomb.dueTurnIndex,dueActorId:bomb.dueActorId,fuseTurnsRemaining:bomb.fuseTurnsRemaining,dueInRounds:context.fuseTurns,convertedFrom:'L13-0117'});
    }
  }
  if (firing && isMatchlock && !lit) unresolved.push('Arme à mèche : consacrez d’abord une Action à allumer la mèche (L13-0107).');
  if (context.lightFuseAction===true && isAttack) unresolved.push('Mèche : allumer la mèche consomme une Action distincte ; cette Action ne peut pas aussi déclarer une attaque.');
  if (context.largeBullet === true && firing) {
    if (!Array.isArray(targetIds) || !targetIds.length) unresolved.push('Gros projectile : le MJ doit désigner le tireur et les cibles dans un rayon de deux yards (L13-0116).');
    else reminders.push('Gros projectile (conversion V5 de L13-0116) : chaque cible désignée effectue un Test de Résistance à +0 DR ; un échec applique Assourdi. Les distances restent sous désignation du MJ.');
  }
  if (context.crewCount === 1 && isVolleyGun) reminders.push('Servant unique (conversion V5 de L15-0163) : aucun malus au tir, recharge doublée en succès, déplacement interdit.');
  if (firing && isHandMortar && context.grappleLoaded === true && resolution.hit===true) {
    if(context.grappleAnchorChosen===true)reminders.push('Grappin du mortier (conversion V5 de L13-0118) : la corde est fixée au point désigné par le MJ.');
    else effects.push({type:'condition',targetId:normalized.target?.id,condition:{id:`${normalized.resolutionId}:grapple`,key:'enchevetre',name:'Enchevêtré',level:1},convertedFrom:'L13-0118'});
  }
  if (firing && context.largeBullet === true && Array.isArray(targetIds) && targetIds.length) {
    const tests=context.deafenedTests||{};
    for(const id of targetIds){
      const test=tests[id],base=Number(test?.base),testRoll=Number(test?.roll);
      if(!Number.isInteger(base)||base<1||base>100||!Number.isInteger(testRoll)||testRoll<1||testRoll>100)unresolved.push(`Gros projectile : seuil de Résistance et d100 à +0 DR requis pour la cible ${id} (L13-0116).`);
      else if(testRoll>base)effects.push({type:'condition',targetId:id,condition:{id:`${normalized.resolutionId}:deafened:${id}`,key:'assourdi',name:'Assourdi',level:1},convertedFrom:'L13-0116',resistanceTest:{base,roll:testRoll,success:false,sl:Math.floor(base/10)-Math.floor(testRoll/10)}});
    }
  }
  if (context.reloading===true&&isGriffonsfoot) {
    if(!item?.id)unresolved.push('Griffonsfoot : liez l’exemplaire d’arme pour enregistrer les six canons chargés.');
    else {
      const reload=Number(context.weaponReload??item?.reload??item?.extensions?.v5?.reload??6);
      if(!Number.isSafeInteger(reload)||reload<1)unresolved.push('Griffonsfoot : Recharge en succès requise (L13-0108).');
      else if(resolution.success===true){
        const successes=1+Math.max(0,Number(resolution.sl)||0);
        const before=Number(item.extensions?.v5?.griffonsfootReloadProgress)||0,done=before+successes>=reload;
        effects.push({type:'griffonsfoot-reload-progress',targetId:actorId,equipmentId:item.id,successes,requiredSuccesses:reload});
        if(done){const change=stockChange(normalized.actor,context,6,6,'L13-0108',unresolved);if(change)effects.push(change);
          if(change)effects.push({type:'griffonsfoot-reload',targetId:actorId,equipmentId:item.id,loadedCharges:6});}
      }
      else reminders.push('Rechargement raté : aucun succès ajouté au Griffonsfoot.');
    }
  }
  return { effects, reminders, unresolved };
}

/** Pure preview of the selected combat failure tables. It never rolls or mutates participants. */
export function previewCombatFailure({ normalized, roll, fumble, context = {}, hit = false, success = false, sl = 0 } = {}) {
  const result = { fumble: null, misfire: null, effects: [], reminders: [], unresolved: [] };
  const firearmEligible = isBlackpowderIncidentEligible({ actor: normalized?.actor, action: normalized?.action, context });
  const weapon=normalized?.actor?.equipment?.find(row=>row.id===normalized?.action?.extensions?.fiche?.equipmentId)||normalized?.action?.extensions?.equipment;
  const weaponName=fold(context.weaponName||weapon?.name||normalized?.action?.note||normalized?.action?.name);
  const ownAccident=((/hache.fusil|gun axe|hallebarde.fusil|gun halberd/.test(weaponName)&&context.meleeUse===true)
    ||(/mortier (?:a|de) main|hand mortar/.test(weaponName)&&context.reloading===true));
  const isIncidentRoll = firearmEligible && !ownAccident && (Number(roll) === 99 || Number(roll) === 100);
  const isCombatFumble = Boolean(fumble);
  const salvoQuality=weapon?.keywords?.find(row=>['salve','salvo'].includes(typeof row==='string'?row:row?.id))
    ||normalized?.action?.qualities?.find(row=>['salve','salvo'].includes(typeof row==='string'?row:row?.id));
  const salvoWeapon=Boolean(salvoQuality)&&isBlackpowderIncidentEligible({actor:normalized?.actor,action:normalized?.action,context,weapon});

  if (isIncidentRoll) {
    const selected = readRoll(context.powderIncidentRoll, 'Jet d’incident de poudre');
    result.misfire = { trigger: Number(roll), tableVersion: V5_MISFIRE_TABLE_VERSION, eligible: true };
    if (selected.error) result.unresolved.push(selected.error);
    else if (selected.missing) result.unresolved.push('Incident de poudre : saisissez le résultat du d10 (1–10).');
    else {
      result.misfire.roll = selected.roll;
      result.misfire.outcome=tableRow(V5_BLACKPOWDER_INCIDENT_TABLE,selected.roll);
      const profileDamage=weapon?.damage??weapon?.damageFormula??normalized?.action?.damageFormula??normalized?.action?.damage;
      const evaluated=evaluateWeaponDamage(profileDamage,strengthBonusOf(normalized?.actor?.caracs));
      if(result.misfire.outcome.id==='catastrophe'){
        if(evaluated.status!=='resolved'||evaluated.value<0)result.unresolved.push('Incident de poudre catastrophique : dégâts du profil d’arme à +0 DR requis (V5 p. 165).');
        else if(!['left','right'].includes(context.weaponExplosionArmSide))result.unresolved.push('Incident de poudre catastrophique : le MJ doit indiquer le bras directeur touché (gauche ou droit).');
        else result.effects.push({type:'weapon-explosion',targetId:normalized?.actor?.id,equipmentId:weapon?.id||normalized?.action?.extensions?.fiche?.equipmentId,location:'bras-principal',armSide:context.weaponExplosionArmSide,damage:evaluated.value,damageMode:'profile-at-zero-sl',sl:0});
      } else result.effects.push({type:'weapon-misfire',targetId:normalized?.actor?.id,equipmentId:weapon?.id||normalized?.action?.extensions?.fiche?.equipmentId,
        reloadRequired:!/explos|bomb|incendiaire/.test(fold(context.weaponGroup||context.weaponName||normalized?.action?.note)),explosiveDud:/explos|bomb|incendiaire/.test(fold(context.weaponGroup||context.weaponName||normalized?.action?.note))});
      if(salvoWeapon){
        const salvoRoll=readRoll(context.salvoIncidentRoll,'Jet de la table d’incident de Salve');
        if(salvoRoll.error)result.unresolved.push(salvoRoll.error);
        else if(salvoRoll.missing)result.unresolved.push('Incident de Salve : après avoir résolu l’incident de poudre, saisissez le résultat du second d10 (1–10).');
        else {
        const salvo={table:'salvo-artillery',tableVersion:'l13-salvo-artillery-126-v1',roll:salvoRoll.roll,outcome:tableRow(V5_SALVO_ARTILLERY_MISFIRE_TABLE,salvoRoll.roll)};
        result.misfire.salvo=salvo;
        const crewIds=Array.isArray(context.salvoCrewIds)?[...new Set(context.salvoCrewIds.filter(id=>typeof id==='string'&&id))]:[];
        const participants=normalized?.v5State?.participants||[];
        const crew=crewIds.map(id=>participants.find(row=>row.id===id));
        const validCrew=crewIds.length>0&&crew.every(person=>person&&person.zone==='active');
        const remaining=Number(context.remainingSalvo);
        const salvoOutcome=salvo.outcome;
        const zeroRemainingShots=['remaining-salvo-random-locations','remaining-salvo-random-direction'].includes(salvoOutcome.id)&&Number.isInteger(remaining)&&remaining===0;
        if(!zeroRemainingShots&&salvoOutcome.id!=='remaining-salvo-random-direction'&&!validCrew)result.unresolved.push('Incident de Salve : le MJ désigne les servants actifs touchés.');
        if(!zeroRemainingShots&&(evaluated.status!=='resolved'||evaluated.value<0))result.unresolved.push('Incident de Salve : dégâts du profil de l’arme requis.');
        if(!zeroRemainingShots&&['primary-arm','random-location','remaining-salvo-random-locations'].includes(salvoOutcome.id)&&(!Number.isInteger(Number(context.salvoUnitsRoll))||Number(context.salvoUnitsRoll)<0||Number(context.salvoUnitsRoll)>9))result.unresolved.push('Incident de Salve : saisissez le dé des unités (0–9), utilisé comme DR effectifs.');
        if(!zeroRemainingShots&&['primary-arm','random-location','remaining-salvo-random-locations'].includes(salvoOutcome.id)&&validCrew&&evaluated.status==='resolved'){
          const hits=salvoOutcome.id==='remaining-salvo-random-locations'?remaining:1;
          if(salvoOutcome.id==='remaining-salvo-random-locations'&&(!Number.isInteger(remaining)||remaining<1||remaining>100))result.unresolved.push('Incident de Salve : saisissez les points de Salve restants.');
          for(const person of crew){
            const personId=person.id;
            for(let i=0;i<Math.max(1,hits);i++){
              const location=salvoOutcome.id==='primary-arm'?context.salvoPrimaryArms?.[personId]:context.salvoLocations?.[personId]?.[i];
              if(!['left','right','head','body','left-arm','right-arm','left-leg','right-leg'].includes(location))result.unresolved.push(`Incident de Salve : le MJ indique la localisation ${i+1} de ${person.name||personId}.`);
              else if(Number.isInteger(Number(context.salvoUnitsRoll)))result.effects.push({type:'salvo-hit',targetId:personId,location,effectiveSL:Number(context.salvoUnitsRoll),damage:evaluated.value,sourceActorId:normalized?.actor?.id});
            }
          }
        } else if(salvoOutcome.id==='remaining-salvo-random-direction'&&!zeroRemainingShots){
          if(!Number.isInteger(remaining)||remaining<1||remaining>100)result.unresolved.push('Incident de Salve : saisissez les points de Salve restants.');
          const shots=Array.isArray(context.salvoTrajectories)?context.salvoTrajectories:[];
          for(let i=0;i<Math.max(1,remaining);i++){
            const shot=shots[i],number=shot?.distanceRoll;
            if(typeof shot?.direction!=='string'||!shot.direction.trim())result.unresolved.push(`Incident de Salve : indiquez la direction aléatoire du tir ${i+1}.`);
            if(!Number.isInteger(Number(number))||Number(number)<1||Number(number)>100)result.unresolved.push(`Incident de Salve : saisissez la distance d100 en yards du tir ${i+1}.`);
            if(shot?.personsConfirmed!==true)result.unresolved.push(`Incident de Salve : confirmez les personnes présentes (ou l’absence de personne) sur la trajectoire ${i+1}.`);
            const targets=Array.isArray(shot?.targets)?shot.targets:[];
            for(const targetRow of targets){
              if(!participants.some(row=>row.id===targetRow?.participantId&&row.zone==='active')){result.unresolved.push(`Incident de Salve : le MJ désigne une personne active sur la trajectoire ${i+1}.`);continue;}
              const dodge=targetRow.dodge||{};
              if(!Number.isInteger(Number(dodge.base))||!Number.isInteger(Number(dodge.roll))||Number(dodge.base)<1||Number(dodge.base)>100||Number(dodge.roll)<1||Number(dodge.roll)>100){result.unresolved.push(`Incident de Salve : saisissez le seuil d’Esquive et le d100 de ${targetRow.participantId} (Très Difficile, −30) sur le tir ${i+1}.`);continue;}
              const dodgeRoll=Number(dodge.roll),sl=Math.floor(Number(dodge.base)/10)-Math.floor(dodgeRoll/10)-3;
              if(!['head','body','left','right','left-arm','right-arm','left-leg','right-leg'].includes(targetRow.location))result.unresolved.push(`Incident de Salve : le MJ indique la localisation touchée de ${targetRow.participantId}.`);
              else if(dodgeRoll>=96||dodgeRoll>5&&sl<0)result.effects.push({type:'salvo-hit',targetId:targetRow.participantId,location:targetRow.location,effectiveSL:0,damage:evaluated.value,sourceActorId:normalized?.actor?.id,trajectory:{direction:shot.direction,distanceYards:Number(number),dodge:{...dodge,sl}}});
            }
          }
        }
        if(!result.unresolved.length){
          if(salvoOutcome.id!=='remaining-salvo-random-direction')result.effects.push({type:'salvo-artillery-destroyed',targetId:normalized?.actor?.id,equipmentId:weapon?.id||normalized?.action?.extensions?.fiche?.equipmentId});
        }
        }
      }
    }
  } else if (isCombatFumble) {
    const selected = readRoll(context.fumbleRoll, 'Jet de maladresse');
    result.fumble = { tableVersion: V5_FUMBLE_TABLE_VERSION, expanded: fumble.expanded === true };
    if (selected.error) result.unresolved.push(selected.error);
    else if (selected.missing) result.unresolved.push('Maladresse de combat : saisissez le résultat du d10 (1–10).');
    else {
      const outcome = tableRow(V5_COMBAT_FUMBLE_TABLE, selected.roll);
      result.fumble.roll = selected.roll;
      result.fumble.outcome = outcome;
      if (outcome.id === 'minor-injury') result.effects.push({ type: 'wound-loss', targetId: normalized?.actor?.id, amount: 1, ignoresToughnessAndArmour: true });
      else if (outcome.id === 'weapon-damaged') result.effects.push({ type: 'weapon-damage', targetId: normalized?.actor?.id, equipmentId: normalized?.action?.extensions?.fiche?.equipmentId || null, amount: 1, actsLastNextRound: true });
      else if (outcome.id === 'next-action-minus-one-dr') result.effects.push({ type: 'next-action-sl', targetId: normalized?.actor?.id, amount: -1 });
      else if (outcome.id === 'lose-next-move') result.effects.push({ type: 'lose-next-move', targetId: normalized?.actor?.id });
      else if (outcome.id === 'lose-next-action') result.effects.push({ type: 'lose-next-action', targetId: normalized?.actor?.id });
      else if (outcome.id === 'twisted-ankle') {
        const duration = readRoll(context.fumbleDurationRoll, 'Durée de la cheville tordue');
        const location = readRoll(context.fumbleLocationRoll, 'Localisation de la cheville tordue');
        if (duration.error) result.unresolved.push(duration.error); else if (duration.missing) result.unresolved.push('Cheville tordue : saisissez le d10 de durée (1–10 Rounds).');
        if (location.error) result.unresolved.push(location.error); else if (location.missing) result.unresolved.push('Cheville tordue : saisissez le d10 de localisation de jambe.');
        if (!duration.missing && !duration.error && !location.missing && !location.error) result.effects.push({ type: 'twisted-ankle', targetId: normalized?.actor?.id, rounds: duration.roll, location: location.roll <= 5 ? 'jambe-gauche' : 'jambe-droite', critical: true });
      } else if (outcome.id === 'hit-ally-or-stunned') {
        // Range and eligibility are supplied by the GM. Never infer “in range”
        // from camp/zone alone, and never let the player choose the victim.
        const candidates=Array.isArray(context.allyCandidates)?[...new Set(context.allyCandidates.filter(id=>typeof id==='string'&&id&&id!==normalized?.actor?.id))]:null;
        const participants=normalized?.v5State?.participants||[];
        const candidateRows=candidates?.map(id=>participants.find(row=>row.id===id));
        const invalidCandidates=candidates?.some((id,index)=>!candidateRows[index]||candidateRows[index].zone!=='active'||candidateRows[index].camp!==normalized?.actor?.camp);
        if(candidates===null||invalidCandidates)result.unresolved.push('Maladresse 10 : fournir uniquement les alliés actifs et à portée désignés par le MJ.');
        else if(!candidates.length&&context.allyRangeConfirmed===true) result.effects.push({ type: 'condition', targetId: normalized?.actor?.id, condition: { id: `fumble:${normalized?.resolutionId}:stunned`, key: 'sonne', name: 'Sonné', level: 1 } });
        else if (!candidates.length)result.unresolved.push('Maladresse 10 : le MJ doit confirmer qu’aucun allié n’est à portée, ou désigner les alliés présents.');
        else {
          const selection=Number(context.fumbleAllySelectionRoll);
          if(!Number.isInteger(selection)||selection<1||selection>100) result.unresolved.push('Maladresse 10 : le MJ doit désigner les alliés à portée, puis saisir le d100 de sélection aléatoire (1–100).');
          else if(!Number.isInteger(Number(context.fumbleAllyUnitsRoll))||Number(context.fumbleAllyUnitsRoll)<0||Number(context.fumbleAllyUnitsRoll)>9) result.unresolved.push('Maladresse 10 : indiquez le dé des unités du jet (0–9) pour les DR de la cible tirée au sort.');
          else {
            const index=Math.floor((selection-1)*candidates.length/100);
              const evaluatedDamage=evaluateWeaponDamage(normalized?.action?.damage,strengthBonusOf(normalized?.actor?.caracs));
              if(evaluatedDamage.status!=='resolved') result.unresolved.push('Maladresse 10 : dégâts de l’attaque à confirmer (formule ou Force inconnue).');
              else result.effects.push({ type: 'hit-ally', targetId: candidates[index], selectionRoll:selection, candidateIds:candidates, unitsRoll: Number(context.fumbleAllyUnitsRoll), damage:evaluatedDamage.value, sourceActorId: normalized?.actor?.id });
          }
        }
      }
    }
  }

  const special = participantEffects(normalized || {}, context, { hit, success, sl, fumble:isCombatFumble && Boolean(result.fumble?.outcome) });
  result.effects.push(...special.effects);
  result.reminders.push(...special.reminders);
  result.unresolved.push(...special.unresolved);
  return result;
}
