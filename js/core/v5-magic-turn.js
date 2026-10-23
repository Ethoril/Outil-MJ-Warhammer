/** Effets magiques au changement de Tour : fonction pure partagée par Store et la commande end-turn-v5. */
import { advanceMagicConsequences } from './v5-magic-time.js';
import { expireSpellEffects, endBeastForm, resolveSpellDamage,spellFormulaValue,applySpellEffects,unsuppressedSpellEffects,rebaseMagicLayers } from './v5-magic-effects.js';
import { normalizeCamp } from './encounters.js';
import { reverseV5Roll } from './v5-roll.js';
import { attackNature, previewMagicProtection, wardDiceCount,natureTagLabel } from './v5-magic-combat.js';
import { acquireV5Conditions } from './v5-effects.js';
import { previewV5Test, selectV5Test } from './v5-roll.js';
import { hasArcaneMagicLore, hasLivingMagicNature, hasTargetNatureOrTrait } from './v5-magic-attributes.js';
import { magicTalentRank,effectiveSkillScore } from './v5-magic-talents.js';
/** Retrait atomique des couches dont le contrat annonce une fin sur événement. */
export function endSpellEffectsOnEvent(participants,actorId,event){
 return participants.map(p=>{
  if(p.id!==actorId)return p;
  let next=p;
  const ids=(p.extensions?.v5?.spellEffects || []).filter(e=>(e.specialState?.endsOnEvents || []).includes(event) || event==='attack' && e.specialState?.endsOnAttackOrNoise || event==='incoming-attack' && e.specialState?.endsOnIncomingAttack).map(e=>e.id);
  for(const effectId of ids)next=expireSpellEffects(next,{effectId}).participant;
  return next;
 });
}

/**
 * Une invocation liée disparaît avec sa couche : expiration, fin déclarée ou dissipation, dans la même transaction.
 * Une invocation orpheline qui est l'acteur courant, sans être le premier de l'ordre, n'est pas retirée mais gardée jusqu'à la commande
 * suivante, une fois la main passée (comme sweepDivineSummons côté divin) : lui substituer order[0] ferait rejouer le Tour du lanceur et
 * sauter celui de l'acteur suivant. Premier de l'ordre, elle cède la main au premier survivant, qui est bien son successeur (personne
 * n'a encore joué dans ce Round). `deferCurrent:false` : retrait immédiat (clause de fin déclarée depuis le Tour de l'invocation).
 */
export function removeExpiredSummons(envelope,{deferCurrent=true}={}) {
  const combat=envelope.combat;if(!combat?.participants)return envelope;
  let turned=false;
  const alive=(p,data)=>{
    const owner=combat.participants.find(x=>x.id===data.summonOwnerId);
    return owner?.extensions?.v5?.spellEffects?.some(e=>e.castExecutionId===data.summonCastExecutionId && e.spellId===data.summonedBySpellId);
  };
  // D-C32 : un démon manifesté n'est pas retiré à la fin de la durée ; il passe dans le camp opposé à celui du lanceur.
  const candidates=combat.participants.map(p=>{
    const data=p.extensions?.v5;
    if(!data?.summonCastExecutionId || !data.hostileOnExpiry || alive(p,data))return p;
    turned=true;
    const {summonCastExecutionId,summonOwnerId,hostileOnExpiry,...rest}=data;
    const owner=combat.participants.find(x=>x.id===summonOwnerId);
    const casterCamp=data.summonCasterCamp || owner?.camp;
    const reminder='Ordre accompli : retirez le démon (hostile au lanceur, il reste en jeu tant que le MJ ne le retire pas).';
    return {...p,camp:oppositeCamp(casterCamp),notes:p.notes?`${p.notes} ${reminder}`:reminder,extensions:{...p.extensions,v5:{...rest,hostileAfterExpiry:true}}};
  });
  const participants=candidates.filter(p=>{
    const data=p.extensions?.v5;
    if(!data?.summonCastExecutionId)return true;
    if(deferCurrent && p.id===combat.currentActorId && (combat.order || [])[0]!==p.id)return true;
    return alive(p,data);
  });
  if(participants.length===combat.participants.length)return turned?{...envelope,combat:{...combat,participants}}:envelope;
  const ids=new Set(participants.map(p=>p.id)),order=(combat.order || []).filter(id=>ids.has(id));
  return {...envelope,combat:{...combat,participants,order,currentActorId:ids.has(combat.currentActorId)?combat.currentActorId:order[0] || null}};
}

/** Camp hostile à `camp` : un lanceur ennemi a le démon pour allié des PJ, tous les autres l'ont pour ennemi. */
export function oppositeCamp(camp){return normalizeCamp(camp)==='ennemi'?'allie':'ennemi';}

/** Traversée, déplacement, détection ou bruit déclaré : résolution sans relancer le sort ni consommer une réserve. */
export function previewSpellInteraction(state, { effectId, targetId, kind, roll, wardRoll, locationRoll, controlValue,lineOfSight,opponentRoll,damageRoll,targetIds,targetsDeclared,targetTests={},declaredFailures,missileDeclared,missConfirmed,originalRoll,actionId,distance,actionConfirmed,strengthBonus,meleeWoundConfirmed,deathConfirmed } = {}) {
  const next=structuredClone(state), participants=next.combat?.participants || [];
  const owner=participants.find(p=>(p.extensions?.v5?.spellEffects || []).some(e=>e.id===effectId));
  const effect=owner?.extensions.v5.spellEffects.find(e=>e.id===effectId), target=participants.find(p=>p.id===targetId);
  const caster=participants.find(p=>p.id===effect?.casterId);
  const block=error=>({ready:false,error,baseRevision:state.localRevision});
  if (!effect || !target || !caster) return block('Effet actif, lanceur et destinataire requis.');
  if (!['engage','event','end','noise','jostle','immersion','eye-refocus','missile-reroll','iron-listener','tempest-move','detect','move','trigger','control','opposed-move','blood','flight','zone','worm','summon-attack','leave-zone','grapple','body-fire','death-burst','calm-mount'].includes(kind)) return block('Choisir une clause disponible.');
  let conditions=[], damage=0, summary='',test=null;
  if(kind==='engage'){
    if(!effect.recurringHits || target.id===caster.id || target.camp===caster.camp)return block('Lames Azurées : adversaire engagé distinct du lanceur requis.');
    effect.recurringHits.targetIds=[...new Set([...(effect.recurringHits.targetIds || []),target.id])];
    return {ready:true,state:next,baseRevision:state.localRevision,summary:'Lames Azurées : '+target.name+' ajouté aux adversaires engagés.'};
  }
  const d100=value=>Number.isInteger(value)&&value>=1&&value<=100;
  const secondary=(person,skill,stat,die,modifierSl=0)=>{
    const match=(person.skills || []).find(s=>String(s.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()===skill.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
    return selectV5Test(previewV5Test({score:effectiveSkillScore(person,match?.total ?? match?.value ?? person.caracs[stat],stat),roll:die,slModifiers:[{id:'spell-secondary',amount:modifierSl}]}),'keep');
  };
  const replaceLayer=patch=>{
    const expires=effect.expiresAtRound,keptStates=structuredClone(owner.states || []);
    const restored=expireSpellEffects(owner,{effectId}).participant;
    const applied=applySpellEffects(restored,{...effect,...patch,conditions:undefined,duration:Math.max(1,expires-next.combat.round)+' Rounds'},{round:next.combat.round,caster}).participant;
    const updated=applied.extensions.v5.spellEffects.find(e=>e.id===effect.id);Object.assign(updated,{expiresAtRound:expires,appliedAtRound:effect.appliedAtRound});
    applied.states=keptStates;Object.assign(owner,applied);
  };
  if(kind==='event' && effect.specialState?.endsOnEvents?.includes(controlValue)){if(effect.specialState.endsWholeCastOnEvents){for(const person of participants){const ids=(person.extensions?.v5?.spellEffects || []).filter(e=>e.castExecutionId===effect.castExecutionId).map(e=>e.id);for(const id of ids)Object.assign(person,expireSpellEffects(person,{effectId:id}).participant);}}else Object.assign(owner,expireSpellEffects(owner,{effectId}).participant);summary='Événement de fin déclaré : '+controlValue+'.';
  } else if(kind==='calm-mount' && effect.specialState?.mountFleeing){
    if(!d100(roll))return block('Chevaucher +0 : d100 du cavalier requis.');test=secondary(target,'Chevaucher','Ag',roll);if(test.success)replaceLayer({specialState:{...effect.specialState,mountFleeing:false}});summary='Chevaucher '+test.sl+' DR : '+(test.success?'monture calmée':'fuite maintenue')+'.';
  } else if(kind==='body-fire' && effect.specialState?.bodyFire){
    if(target.id===owner.id || !['grab','grapple','blood'].includes(controlValue))return block('Corps de Feu : adversaire réel et clause choisis requis.');
    const spec=effect.specialState.bodyFire;let formula=String(8+spec.castingSl),ignoreAp=false;
    if(controlValue!=='grapple'){
      if(!d100(roll))return block('Corps de Feu : d100 de Calme ou Esquive requis.');
      if(controlValue==='blood' && meleeWoundConfirmed!==true)return block('Confirmer les Blessures reçues en mêlée.');
      test=secondary(target,controlValue==='grab'?'Calme':'Esquive',controlValue==='grab'?'FM':'Ag',roll,controlValue==='grab'?-2:0);
      if(controlValue==='blood'){formula=String(Math.floor(caster.caracs.FM/10)+spec.bloodMissile);ignoreAp=true;}
    }
    if(controlValue!=='blood' || !test.success){if(!ignoreAp&&!d100(locationRoll))return block('Corps de Feu : localisation d100 requise.');const raw=resolveSpellDamage({caster,target,formula,roll:locationRoll?reverseV5Roll(locationRoll):undefined,ignoreAp,spell:{name:effect.spellName}}),protectedHit=previewMagicProtection(target,raw.finalDamage,{wardRoll,nature:attackNature({magical:true,spell:true,ranged:controlValue==='blood',fire:true})});if(!protectedHit.ready)return block(protectedHit.error);damage=Math.min(target.hp,protectedHit.amount);target.hp-=damage;}
    if(controlValue==='grapple'){conditions=['Enflammé'];Object.assign(target,acquireV5Conditions(target,conditions,{round:next.combat.round}).participant);}
    summary='Corps de Feu : −'+damage+' B'+(controlValue==='grab' && !test.success?' ; Calme −2 raté, doit lâcher':'')+(conditions.length?', +1 Enflammé':'')+'.';
  } else if(kind==='death-burst' && effect.specialState?.deathBurst){
    if(owner.hp!==0 || !effect.spellDamageAtZero || effect.deathBurstDone || deathConfirmed!==true || targetsDeclared!==true || !Array.isArray(targetIds))return block('Mort due au sort confirmée, tous les destinataires dans 2 mètres déclarés et explosion non utilisée requis.');
    for(const id of new Set(targetIds)){const victim=participants.find(p=>p.id===id),answer=targetTests[id];if(!victim || victim.id===owner.id || !Number.isFinite(answer?.distance)||answer.distance<0||answer.distance>effect.specialState.deathBurst.radius || !d100(answer.locationRoll))return block('Explosion : participant réel, distance ≤2 mètres et localisation d100 requis.');const raw=resolveSpellDamage({caster,target:victim,formula:String(Math.floor(caster.caracs.FM/10)+effect.specialState.deathBurst.missile),roll:reverseV5Roll(answer.locationRoll),spell:{name:'Explosion de Sang Bouillonnant'}}),protectedHit=previewMagicProtection(victim,raw.finalDamage,{wardRoll:answer.wardRoll,nature:attackNature({magical:true,spell:true,ranged:true,fire:true})});if(!protectedHit.ready)return block(protectedHit.error);const lost=Math.min(victim.hp,protectedHit.amount);victim.hp-=lost;damage+=lost;}
    effect.deathBurstDone=true;owner.extensions.v5.dead=true;summary='Explosion +1 : −'+damage+' B sur les destinataires déclarés, mort enregistrée.';
  } else if(kind==='zone'  && effect.specialState?.zoneModifiers){
    if(target.id!==owner.id || !['inside','outside'].includes(controlValue))return block('Choisir la présence dans la zone du destinataire de cette couche.');
    replaceLayer({statModifiers:effect.specialState.zoneModifiers[controlValue]});summary='Présence '+controlValue+' : modificateurs de couche recalculés.';
  } else if(kind==='leave-zone' && effect.specialState?.endsOnEvents?.includes('leave-zone')){
    if(target.id!==owner.id)return block('La sortie doit concerner le destinataire protégé.');Object.assign(owner,expireSpellEffects(owner,{effectId}).participant);summary='Sortie de zone : immunité de la couche retirée.';
  } else if(kind==='worm' && effect.specialState?.wormGrapple){
    if(target.id!==owner.id || !d100(roll)||!d100(opponentRoll)||!['entangle','leather'].includes(controlValue))return block('Ver : cible de la couche, deux d100 et action choisie requis.');
    test=selectV5Test(previewV5Test({score:effect.specialState.wormGrapple.strength,roll}),'keep');const opposed=secondary(target,'Force','F',opponentRoll);
    if(opposed.sl>test.sl){Object.assign(owner,expireSpellEffects(owner,{effectId}).participant);summary='Cible libérée : sort terminé.';}
    else if(controlValue==='entangle'){const ids=new Set((target.states || []).map(s=>s.id));Object.assign(target,acquireV5Conditions(target,[{name:'Enchevêtré',source:{strength:effect.specialState.entangledStrength}}],{round:next.combat.round}).participant);target.states=target.states.map(s=>ids.has(s.id)?s:{...s,spellEffectId:effect.id,removeOnSpellExpiry:true});summary='Ver gagne : +1 Enchevêtré F50.';}
    else{const locations=targetTests[target.id]?.leatherLocations;if(!Array.isArray(locations)||locations.some(l=>!['head','body','arms','legs'].includes(l)))return block('Déclarer les localisations réellement protégées par du cuir (y compris aucune).');const armor=structuredClone(target.extensions.v5.baseArmor || target.baseArmor || target.armor);const aliases={arms:['rightArm','leftArm'],legs:['rightLeg','leftLeg']};for(const loc of new Set(locations))for(const key of aliases[loc] || [loc])armor[key]=Math.max(0,Number(armor[key] ?? armor[loc])-1);Object.assign(target,rebaseMagicLayers(target,{armor}));summary='Ver gagne : cuir −1 PA aux localisations déclarées ; sacs/objets à reporter sur la fiche.';}
  } else if(kind==='grapple' && effect.specialState?.grappleFloor){
    if(!d100(roll))return block('Iyrtu : d100 de l’empoignade requis.');test=secondary(caster,'Corps à corps (Bagarre)','CC',roll);if(!test.success)test={...test,success:true,sl:0};summary='Empoignade : '+test.sl+' DR, minimum +0 sur échec ; utiliser ce reçu pour l’opposition réelle.';
  } else if(kind==='summon-attack' && effect.specialState?.summonAttack){
    const spec=effect.specialState.summonAttack,round=next.combat.round,used=effect.summonAttacksRound===round?effect.summonAttacks || []:[];
    if(next.combat.currentActorId!==caster.id || spec.requiresAction && (round<=effect.appliedAtRound || actionConfirmed!==true))return block('Invocation : Tour du lanceur et Action déclarée à partir du Round suivant requis.');
    if(!Number.isFinite(distance)||distance<0||distance>spec.range || lineOfSight!==true)return block('Distance dans la portée et ligne de vue doivent être déclarées.');
    if(used.length>=spec.count || used.filter(id=>id===target.id).length>=spec.maxPerTarget)return block('Limite d’attaques de l’invocation ou de la cible atteinte ce Round.');
    if(!d100(roll)||!d100(opponentRoll)||!d100(locationRoll))return block('Invocation : d100 d’attaque, de défense et de localisation requis.');
    test=selectV5Test(previewV5Test({score:spec.ws,roll}),'keep');const defence=secondary(target,controlValue==='dodge'?'Esquive':'Corps à corps (Bagarre)',controlValue==='dodge'?'Ag':'CC',opponentRoll);
    if(test.success && test.sl>=defence.sl){
      if(spec.requiresStrengthBonus && (!Number.isInteger(strengthBonus)||strengthBonus<0))return block('Chiens : Bonus de Force du profil MJ requis pour Arme (Morsure) +8.');
      const raw=spec.damage+(spec.requiresStrengthBonus?strengthBonus:0),receipt=resolveSpellDamage({caster,target,formula:String(raw),roll:reverseV5Roll(locationRoll),spell:{name:effect.spellName}}),protectedHit=previewMagicProtection(target,receipt.finalDamage,{wardRoll,nature:attackNature({magical:true,ranged:false,spell:true})});
      if(!protectedHit.ready)return block(protectedHit.error);damage=Math.min(target.hp,protectedHit.amount);target.hp-=damage;if(damage>0 && spec.hitConditions?.length){conditions=[...spec.hitConditions];Object.assign(target,acquireV5Conditions(target,conditions,{round:next.combat.round}).participant);}
    }
    effect.summonAttacksRound=round;effect.summonAttacks=[...used,target.id];summary='Attaque CC '+test.sl+' contre défense '+defence.sl+' : −'+damage+' B, sans Élan.';
  } else if (kind === 'end'  || ['noise','jostle','immersion'].includes(kind) && (effect.specialState?.endsOnEvents?.includes(kind) || kind==='noise' && effect.specialState?.endsOnAttackOrNoise) || kind==='eye-refocus' && effect.specialState?.invisibleEyeActive) {
    const ended=expireSpellEffects(owner,{effectId}).participant;
    Object.assign(owner,ended); summary='Effet terminé par le MJ.';
    if(kind==='eye-refocus'){Object.assign(owner,acquireV5Conditions(owner,['Surpris'],{round:next.combat.round}).participant);summary='Retour au corps : œil détruit, Surpris.';}
  } else if(kind==='missile-reroll' && effect.specialState?.missileMissReroll){
    const action=(target.actions || []).find(a=>a.id===actionId);
    if(missileDeclared!==true || missConfirmed!==true || !action || action.attr!=='CT' || action.type!=='attack')return block('Relance : tir physique/munition magique raté confirmé et action de tir réelle requis (pas un projectile magique).');
    if(!Number.isInteger(roll)||roll<1||roll>100 || !Number.isInteger(originalRoll)||originalRoll<1||originalRoll>100)return block('Fournir le d100 initial et celui de la relance.');
    const original=selectV5Test(previewV5Test({score:Number(action.base ?? target.caracs.CT),roll:originalRoll}),'keep');
    test=selectV5Test(previewV5Test({score:Number(action.base ?? target.caracs.CT),roll}),'keep');
    summary='Relance du tir '+action.note+' : initial '+original.sl+' DR, relance '+test.sl+' DR ; utiliser ce jet pour l’attaque opposée et ses dégâts, sans les appliquer deux fois.';
  } else if(kind==='iron-listener' && effect.specialState?.ironVoice){
    if(!Number.isInteger(roll)||roll<1||roll>100)return block('Auditeur hostile : Perception d100 requise.');
    const skill=(target.skills || []).find(s=>/perception/i.test(s.name || ''));
    test=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs.I,'I'),roll,slModifiers:[{id:'iron-listener',amount:-1}]}),'keep');
    summary='Auditeur hostile : '+test.sl+' DR, '+(test.success?'bonus +1 du locuteur neutralisé contre cet auditeur':'bonus +1 maintenu')+'. Voix normale/cri ×3 ; murmures exclus.';
  } else if(kind==='tempest-move' && effect.specialState?.tempestMovement){
    if(!Number.isInteger(roll)||roll<1||roll>100 || !['air','ground'].includes(controlValue))return block('Tempête : Calme d100 et position en vol/au sol requis.');
    const skill=(target.skills || []).find(s=>/calme/i.test(s.name || ''));
    test=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs.FM,'FM'),roll}),'keep');
    summary='Calme '+test.sl+' DR : '+(test.success?'déplacement permis':'déplacement interdit')+(!test.success&&controlValue==='air'?' ; chute de 50 mètres ce Round (hauteur, impact et atterrissage : MJ)':'')+'. CT −3 DR pour la durée.';
  } else if(kind==='flight' && effect.specialState?.flightAvailable){
    if(!['air','ground'].includes(controlValue))return block('Choisir en vol ou au sol.');
    effect.specialState.flying=controlValue==='air';owner.extensions.v5.specialStates.flying=effect.specialState.flying;summary=effect.specialState.flying?'En vol : −2 DR aux tirs, cible à une bande de portée de plus.':'Au sol ; chute éventuelle à jouer selon la hauteur.';
  } else if(kind==='control' && effect.specialState?.controlTest){
    const spec=effect.specialState.controlTest;
    if(spec.minimumDeclaredFailures && (!Number.isInteger(declaredFailures)||declaredFailures<spec.minimumDeclaredFailures))return block('Glamour : déclarer au moins trois échecs de Navigation, sans compteur dédié.');
    if(controlValue==='duration' && effect.specialState.extendedAfterFailures){
      effect.expiresAtRound=next.combat.round+spellFormulaValue(effect.specialState.extendedAfterFailures,caster)*360;
      summary='Glamour prolongé BI heures après trois échecs déclarés, sans Test de Commandement pour la durée.';
    }else{
    if(spec.lineOfSight && lineOfSight!==true)return block('Contrôle : ligne de vue confirmée requise.');
    if(!spec.options.some(([value])=>value===controlValue))return block('Choisir la modification du sort.');
    if(!Number.isInteger(roll)||roll<1||roll>100)return block('Saisir le d100 de '+spec.skill+'.');
    const skill=(caster.skills || []).find(s=>(s.name || '').toLowerCase()===spec.skill.toLowerCase());
    test=selectV5Test(previewV5Test({score:effectiveSkillScore(caster,skill?.total ?? skill?.value ?? caster.caracs[spec.stat],spec.stat),roll,slModifiers:[{id:'spell-control',amount:spec.modifierSl}]}),'keep');
    if(effect.specialState.extendedAfterFailures && declaredFailures>=3){effect.expiresAtRound=next.combat.round+spellFormulaValue(effect.specialState.extendedAfterFailures,caster)*360;summary='Glamour prolongé BI heures après trois échecs déclarés. ';}
    if(test.success){effect.specialState[spec.field]=controlValue;owner.extensions.v5.specialStates[spec.field]=controlValue;}
    summary+= 'Contrôle '+spec.skill+' +'+spec.modifierSl+' : '+test.sl+' DR, '+(test.success?'modification acceptée':'aucune modification')+(spec.action?' ; une Action utilisée (sans Focalisation).':'');
    }
  } else if(kind==='opposed-move' && effect.specialState?.objectMovement){
    if(!Number.isInteger(roll)||roll<1||roll>100||!Number.isInteger(opponentRoll)||opponentRoll<1||opponentRoll>100)return block('Déplacement entravé : fournir les deux d100, FM et Force.');
    test=selectV5Test(previewV5Test({score:Number(caster.caracs.FM),roll}),'keep');
    const opponent=selectV5Test(previewV5Test({score:Number(target.caracs.F),roll:opponentRoll}),'keep');
    summary='FM '+test.sl+' contre Force '+opponent.sl+' DR : '+(test.sl>opponent.sl?'objet déplacé dans la distance du reçu':'objet retenu (égalité incluse)')+'. Destination : MJ.';
  } else if(kind==='blood' && effect.specialState?.damageTrigger){
    if(targetsDeclared!==true || !Array.isArray(targetIds))return block('Sang corrosif : déclarer tous les engagés, y compris aucun.');
    if(!Number.isInteger(damageRoll)||damageRoll<1||damageRoll>10)return block('Saisir le d10 commun de Sang corrosif.');
    for(const id of [...new Set(targetIds)]){
      const victim=participants.find(p=>p.id===id),answer=targetTests[id] || {};
      if(!victim || victim.id===owner.id)return block('Engagé absent ou identique au porteur du sang.');
      if(!Number.isInteger(answer.locationRoll)||answer.locationRoll<1||answer.locationRoll>100)return block('Localisation d100 pour chaque engagé requise.');
      const raw=resolveSpellDamage({caster:owner,target:victim,formula:String(damageRoll),roll:reverseV5Roll(answer.locationRoll),spell:{name:effect.spellName}});
      const protection=previewMagicProtection(victim,raw.finalDamage,{wardRoll:answer.wardRoll,nature:attackNature({magical:true,spell:true,ranged:false})});
      if(!protection.ready)return block(protection.error);
      const lost=Math.min(victim.hp,protection.amount);victim.hp-=lost;damage+=lost;
    }
    summary='Sang corrosif après Blessures déclarées : même d10 ('+damageRoll+') pour '+targetIds.length+' engagé(s), '+damage+' B perdues après BE, PA et Protection.';
  } else if (kind === 'detect' && effect.specialState?.detection) {
    const spec=effect.specialState.detection;
    const sight=magicTalentRank(target,'second-sight')>0 || (target.talents || []).some(t=>/seconde vue|second sight/i.test(typeof t==='string'?t:t.name || ''));
    if (!sight) summary='Sans Seconde vue : illusion indécelable par ce Test.';
    else {
      if (!Number.isInteger(roll)||roll<1||roll>100) return block('Saisir le d100 du Test de détection.');
      const skill=(target.skills || []).find(s=>(s.name || '').toLowerCase()===spec.skill.toLowerCase());
      const test=selectV5Test(previewV5Test({score:Number(skill?.total ?? target.caracs?.[spec.stat]),roll,slModifiers:[{id:'spell-detection',amount:spec.modifierSl}]}),'keep');
      summary=test.success && test.sl>spec.castingSl ? 'Test opposé gagné : présence ou illusion détectée, sans dissiper le sort.' : 'Test opposé perdu : illusion non détectée.';
    }
  } else {
    const spec=kind==='move' ? effect.specialState?.moveTest : effect.triggered;
    if (!spec || kind==='trigger' && !effect.triggered) return block('Cette clause ne figure pas dans l’effet choisi.');
    if (spec.exceptLore && hasArcaneMagicLore(target,spec.exceptLore) || spec.requiredAnyTrait && !spec.requiredAnyTrait.some(t=>hasTargetNatureOrTrait(target,t))) summary='Destinataire exempté.';
    else {
      let failed=true;
      const testSpec=controlValue==='alternative' && spec.alternativeTest?spec.alternativeTest:spec.test || (kind==='move'?spec:null);
      if (testSpec) {
        if (!Number.isInteger(roll)||roll<1||roll>100) return block('Saisir le d100 du Test secondaire.');
        const tester=spec.testActor==='caster'?caster:target,skill=(tester.skills || []).find(s=>(s.name || '').toLowerCase()===testSpec.skill.toLowerCase());
        test=selectV5Test(previewV5Test({score:effectiveSkillScore(tester,skill?.total ?? tester.caracs?.[testSpec.stat],testSpec.stat),roll,slModifiers:[{id:'spell-trigger',amount:testSpec.modifierSl}]}),'keep');
        failed=!test.success;
        if(spec.opposedTest){if(!d100(opponentRoll))return block('Auteur de l’effet magique : d100 adverse de FM requis.');const other=secondary(target,spec.opposedTest.skill,spec.opposedTest.stat,opponentRoll);test={...test,opponentSl:other.sl,won:test.sl>other.sl};failed=!test.won;}
      }
      // `alwaysConditions` : états acquis dans tous les cas à la clause (ex. Horreur hantante : +1 Exténué à l'entrée), avant ceux de l'échec.
      conditions=[...(spec.alwaysConditions || []),...(failed ? (spec.conditions || spec.failConditions || []) : [])];
      if(!failed && spec.endsOnSuccess)Object.assign(owner,expireSpellEffects(owner,{effectId}).participant);
      if(!failed && spec.damageOnTestSuccess){
        const damageSpec=spec.damageOnTestSuccess,raw=resolveSpellDamage({caster,target,formula:damageSpec.formula,sl:spec.castingSl,ignoreAp:damageSpec.ignoreAp,ignoreBe:damageSpec.ignoreBe,spell:{name:effect.spellName}}),protection=previewMagicProtection(target,raw.finalDamage,{wardRoll,nature:attackNature({magical:true,spell:true,ranged:false})});
        if(!protection.ready)return block(protection.error);damage=Math.min(Number(target.hp),protection.amount);target.hp-=damage;
      }
      if (spec.missile) {
        if (!Number.isInteger(locationRoll)||locationRoll<1||locationRoll>100) return block('Localisation du projectile déclenché : saisir le d100.');
        const raw=resolveSpellDamage({caster,target,formula:`BFM + ${spec.missile}`,roll:reverseV5Roll(locationRoll),spell:{magicMissile:true},ignoreAp:spec.ignoreAp});
        const protectedDamage=previewMagicProtection(target,raw.finalDamage,{wardRoll,nature:attackNature({magical:true,spell:true,ranged:true,fire:effect.domain==='fire'})});
        if (!protectedDamage.ready) return block(protectedDamage.error);
        damage=Math.min(Number(target.hp),protectedDamage.amount);
        target.hp=Math.max(0,target.hp-damage);
      }
      if (conditions.length) {
        const enriched=conditions.map(name=>name==='Enchevêtré'?{name,source:{strength:Number(caster.caracs.FM)}}:name);
        Object.assign(target,acquireV5Conditions(target,enriched,{round:next.combat.round}).participant);
      }
      summary=`Clause résolue : ${failed?'échec/effet appliqué':'Test réussi'}, −${damage} B${conditions.length?', '+conditions.join(', '):''}.`;
    }
  }
  next.log=[{kind:'effect',actorId:caster.id,text:`${effect.spellName} — ${target.name} : ${summary}`},...(next.log || [])].slice(0,300);
  return {ready:true,baseRevision:state.localRevision,state:removeExpiredSummons(next),summary,damage,conditions,test};
}

/** WoM pp. 20–21 : trajectoire proposée, occupants réels déclarés, chaque frappe absorbée/protégée une seule fois. */
export function randomVortexStep(participants,caster,effect,{inputs={},initial=null,round=1,prefix=''}={}){
 const result=structuredClone(participants),requests=[],logs=[],mini=[];
 const spec=effect.roundEffect.vortex,answers=inputs[caster.id] || {},key=name=>prefix+name;
 const ask=(id,name,kind,label,options)=>requests.push({participantId:id,participantName:result.find(p=>p.id===id)?.name,field:key(name),kind,label:effect.spellName+' : '+label,...(options?{options}: {})});
 const directions=['disappears','N','NE','E','stays','SE','S','SW','W','NW'];
 const stages=[];
 const trajectory=stage=>{const stageLabel=stage?'mini-vortex '+stage.slice(4):'vortex principal';
  const die=answers[key(stage+'Direction')];if(!Number.isInteger(die)||die<1||die>10){ask(caster.id,stage+'Direction','d10',stageLabel+' direction aléatoire');return null;}
  const direction=directions[die-1];if(direction==='disappears')return {direction,distance:0,targets:[]};
  const distance=direction==='stays'?0:answers[key(stage+'Distance')];
  if(direction!=='stays'&&(!Number.isInteger(distance)||distance<2||distance>20)){ask(caster.id,stage+'Distance','2d10',stageLabel+' déplacement 2d10');return null;}
  const ids=answers[key(stage+'Targets')];if(!Array.isArray(ids)||ids.some(id=>!result.some(p=>p.id===id))){ask(caster.id,stage+'Targets','targets',stageLabel+' toutes les cibles traversées, y compris aucune',result.map(p=>[p.id,p.name]));return null;}
  return {direction,distance,targets:[...new Set(ids)]};
 };
 let movement=initial || trajectory('');
 if(!movement)return {ready:false,participants:result,requests,logs,mini};
 if(movement.direction==='disappears'){
  for(const p of result){const ids=(p.extensions?.v5?.spellEffects || []).filter(e=>e.castExecutionId===effect.castExecutionId && (e.roundEffect?.vortex || e.specialState?.vortexSuffocation)).map(e=>e.id);for(const effectId of ids)Object.assign(p,expireSpellEffects(p,{effectId}).participant);}
  return {ready:true,participants:result,requests,logs:[{kind:'effect',actorId:caster.id,text:effect.spellName+' : vortex disparu (d10 = 1).'}],movement,mini};
 }
 stages.push({movement,profile:spec,tag:''});
 if(spec.miniCount && movement.distance<=8){
  for(let i=1;i<=spec.miniCount;i++){const moved=trajectory('mini'+i);if(moved){mini.push(moved);if(moved.direction!=='disappears')stages.push({movement:moved,profile:{missile:4,conditions:['Enflammé'],fire:true,damageBonus:0},tag:'mini'+i});}}
 }
 if(requests.length)return {ready:false,participants:result,requests,logs,mini,movement};
 for(const stage of stages){
  for(const id of stage.movement.targets){
   const target=result.find(p=>p.id===id),data=inputs[id] || {},field=name=>key(stage.tag+name);
   if(!Number.isFinite(target.hp)||target.caracs?.E==null || !Number.isFinite(Number(target.caracs?.E))){ask(id,stage.tag+'Profile','manual',target.name+' : Blessures et Endurance réelles requises');continue;}
   const request=(name,kind,label)=>ask(id,stage.tag+name,kind,target.name+' — '+(stage.tag?'mini-vortex '+stage.tag.slice(4):'vortex principal')+' : '+label);
   const location=data[field('Location')] ?? data.locationRoll;
   if(!stage.profile.ignoreAp && (!Number.isInteger(location)||location<1||location>100)){request('Location','d100','localisation (d100)');continue;}
   const rawFormula=stage.profile.missile!==undefined?String(Math.floor(caster.caracs.FM/10)+stage.profile.missile+(stage.profile.damageBonus || 0)):String(stage.profile.damage);
   const raw=resolveSpellDamage({caster,target,formula:rawFormula,roll:location?reverseV5Roll(location):undefined,spell:{name:effect.spellName},ignoreAp:stage.profile.ignoreAp});
   const wards=data[field('Ward')] ?? data.wardRoll;
   const declared={...data.attackNature,...Object.fromEntries(Object.entries(data).filter(([name,value])=>name.startsWith(field('Nature:'))&&typeof value==='boolean').map(([name,value])=>[name.slice(field('Nature:').length),value]))};
   const nature=attackNature({magical:true,spell:true,ranged:true,fire:stage.profile.fire===true,declared});
   const calmDie=data[field('ProtectionCalm')] ?? data.protectionCalmRoll,calmSkill=(target.skills || []).find(s=>/calme|cool/i.test(s.name || '')),calm=Number.isInteger(calmDie)&&calmDie>=1&&calmDie<=100?selectV5Test(previewV5Test({score:effectiveSkillScore(target,calmSkill?.total ?? target.caracs.FM,'FM'),roll:calmDie}),'keep'):null;
   const protectedHit=previewMagicProtection(target,raw.finalDamage,{wardRoll:wards,nature,calm});
   if(!protectedHit.ready){if(protectedHit.unknown?.length)for(const tag of protectedHit.unknown)request('Nature:'+tag,'boolean','nature de la frappe : '+natureTagLabel(tag));else if(/Calme/.test(protectedHit.error || ''))request('ProtectionCalm','d100','Calme pour la réduction de dégâts');else request('Ward','wards','d10 de chaque Protection, séparés par des espaces');continue;}
   let thrown=null,sun=null;
   if(stage.profile.throw){
    const die=data[field('ThrowDirection')] ?? data.throwDirection,collision=data[field('Collision')] ?? data.collision;
    if(!Number.isInteger(die)||die<1||die>8){request('ThrowDirection','d8','direction aléatoire de projection (d8)');continue;}
    if(typeof collision!=='boolean'){request('Collision','boolean','collision avec obstacle solide/créature ?');continue;}
    thrown={direction:['N','NE','E','SE','S','SW','W','NW'][die-1],distance:Math.floor(caster.caracs.FM/10),collision};
   }
   if(stage.profile.sun){
    const touched=data[field('SunTouched')] ?? data.sunTouched;
    if(typeof touched!=='boolean'){request('SunTouched','boolean','touché par le Soleil Violet ?');continue;}
    if(touched){const die=data[field('Calm')] ?? data.calmRoll;if(!Number.isInteger(die)||die<1||die>100){request('Calm','d100','Calme +0 contre la mort');continue;}const skill=(target.skills || []).find(s=>/calme|cool/i.test(s.name));sun=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? target.caracs.FM,'FM'),roll:die}),'keep');}
   }
   if(stage.profile.suffocation && typeof (data[field('Inside')] ?? data.inside)!=='boolean'){request('Inside','boolean','encore dans le nuage après déplacement ?');continue;}
   let collisionDamage=0;
   if(thrown?.collision){const collided=resolveSpellDamage({caster,target,formula:'7',roll:reverseV5Roll(location),spell:{name:'Collision du vortex'}}),p=previewMagicProtection(target,collided.finalDamage,{wardRoll:data[field('CollisionWard')] ?? data.collisionWardRoll,nature:attackNature({magical:false,ranged:false,declared:{crush:true}})});if(!p.ready){request('CollisionWard','wards','Protection contre collision (d10 séparés)');continue;}collisionDamage=p.amount;}
   const amount=protectedHit.amount+collisionDamage;target.hp=Math.max(0,target.hp-amount);
   if(sun && !sun.success){target.hp=0;target.extensions.v5.dead=true;}
   const conditions=[...(stage.profile.conditions || []),...(thrown?['À Terre']:[])];
   if(conditions.length)Object.assign(target,acquireV5Conditions(target,conditions,{round}).participant);
   if(stage.profile.suffocation && (data[field('Inside')] ?? data.inside)){
    if(!(target.extensions?.v5?.spellEffects || []).some(e=>e.castExecutionId===effect.castExecutionId && e.specialState?.vortexSuffocation))Object.assign(target,applySpellEffects(target,{id:effect.id+':suffocation:'+target.id,spellId:effect.spellId,spellName:effect.spellName,casterId:caster.id,castExecutionId:effect.castExecutionId,duration:Math.max(1,effect.expiresAtRound-round)+' Rounds',roundEffect:{phase:'endOfRound',suffocation:true,presence:true,presenceEnds:true},specialState:{suffocating:true,vortexSuffocation:true}},{round,caster}).participant);
   }
   logs.push({kind:'effect',actorId:caster.id,detail:{spellId:effect.spellId,targetId:id,raw:raw.rawDamage,location:raw.location,woundsLost:amount,conditions,thrown,sun,stage:stage.tag || 'main'},text:effect.spellName+' — '+target.name+' : −'+amount+' B'+(conditions.length?', '+conditions.join(', '):'')+(sun && !sun.success?' ; mort par Soleil Violet':'')+'.'});
  }
 }
 // La position finale du nuage est un fait indépendant de la liste des cibles traversées.
 if(spec.suffocation)for(const target of result){for(const layer of target.extensions?.v5?.spellEffects || []){
  if(layer.castExecutionId!==effect.castExecutionId || !layer.specialState?.vortexSuffocation)continue;
  const data=inputs[target.id] || {},inside=data[key('Inside')] ?? data.inside;
  if(typeof inside!=='boolean')ask(target.id,'Inside','boolean',target.name+' encore dans le nuage ?');else if(!inside)Object.assign(target,expireSpellEffects(target,{effectId:layer.id}).participant);
 }}
 return {ready:!requests.length,participants:result,requests,logs,movement,mini};
}

/** Clauses de Round déclarées par les contrats : présence et dés fournis par le MJ, même commande que la fin de Tour. */
// Lu sur les couches divines elles-mêmes : `specialStates` n'est recalculé qu'après coup.
const doesNotBreathe = participant => (participant.extensions?.v5?.divineEffects || []).some(layer => layer.specialState?.doesNotBreathe === true);
export function roundSpellEffects(participants, phase, round, inputs = {}, actorId = null) {
  const result = structuredClone(participants), requests = [], logs = [], guided=new Set();
  for (const target of result) for (const effect of unsuppressedSpellEffects(target.extensions?.v5?.spellEffects || [])) {
    const spec = phase==='expiry'?effect.expiryEffect:effect.roundEffect;
    if (!spec || ['startOfTurn','endOfTurn'].includes(phase) && target.id!==actorId || phase!=='expiry' && spec.phase !== phase || effect.roundEffectDone || round < effect.appliedAtRound + (spec.after || 0) || phase === 'startOfRound' && round <= effect.appliedAtRound) continue;
    if(phase==='expiry' && !(Number.isFinite(effect.expiresAtRound) && (round>effect.expiresAtRound || round>=effect.expiresAtRound && actorId===effect.casterId)))continue;
    const caster = result.find(p => p.id === effect.casterId);
    if (!caster) {logs.push({kind:'effect',text:effect.spellName+' : auteur retiré du combat, effet périodique à résoudre par le MJ.'});continue;}
    if(Number(target.hp)<=0 && (spec.damage || spec.missile || spec.projectile))continue;
    if(spec.vortex){if(phase!=='endOfCasterTurn'||actorId!==caster.id||round<=effect.appliedAtRound)continue;const step=randomVortexStep(result,caster,effect,{inputs,round,prefix:'spell:'+effect.id+':vortex:'});requests.push(...step.requests);logs.push(...step.logs);for(const p of step.participants)Object.assign(result.find(x=>x.id===p.id),p);continue;}
    if(spec.quantityPerRound){
      const quantity=Math.min(spellFormulaValue(spec.quantityMaxFormula,caster),Math.max(0,round-effect.appliedAtRound+1)*spec.quantityPerRound);
      logs.push({kind:'effect',actorId:caster.id,detail:{quantity,unit:spec.unit,round},text:effect.spellName+' : '+quantity+' '+spec.unit+'(s) produite(s) au total, plafond '+spellFormulaValue(spec.quantityMaxFormula,caster)+'. Reçu sans stock dédié.'});continue;
    }
    const data = inputs[target.id] || {}, key = name => `spell:${effect.id}:${name}`;
    const ask = (name,kind,label) => requests.push({ participantId: target.id, participantName: target.name, field: key(name), kind, label: `${effect.spellName} — ${target.name} : ${label}` });
    // Question booléenne libre de la clause (ex. repas pris, blessé en mêlée) : la clause est ignorée si la réponse vaut `skipWhen`.
    if(spec.askFact){const answer=data[key(spec.askFact.key)];if(typeof answer!=='boolean'){ask(spec.askFact.key,'boolean',spec.askFact.label);continue;}if(answer===spec.askFact.skipWhen)continue;}
    if(spec.inside){if(typeof data[key('inside')]!=='boolean'){ask('inside','boolean','encore dans la fosse à la fermeture ?');continue;}if(!data[key('inside')])continue;}
    if(spec.table){
      const die=data[key('table')],table=spec.table;if(!Number.isInteger(die)||die<1||die>table.sides){ask('table','d'+table.sides,'table de résultat (d'+table.sides+')');continue;}
      const outcome=table.outcomes.find(o=>die>=o.min&&die<=o.max);let hours;
      if(outcome.hoursDie){hours=data[key('lostHours')];if(!Number.isInteger(hours)||hours<1||hours>10){ask('lostHours','d10','heures avant retour (d10)');continue;}}
      logs.push({kind:'effect',actorId:caster.id,detail:{spellId:effect.spellId,targetId:target.id,die,hours},text:effect.spellName+' — '+target.name+' : '+outcome.label+(hours?' ('+hours+' heures)':'')+'.'});
      if(outcome.hoursDie){effect.expiresAtRound=round+hours*360;effect.roundEffect=null;effect.specialState={...effect.specialState,returnAfterHours:hours};}
      else if(outcome.permanent){effect.roundEffect=null;effect.specialState={...effect.specialState,lostForever:true};}
      else if(outcome.end)Object.assign(target,expireSpellEffects(target,{effectId:effect.id}).participant);
      continue;
    }
    if(spec.movement){
      const moveKey=name=>`spell:${effect.castExecutionId}:vortex:${name}`,answers=inputs[caster.id] || {},direction=answers[moveKey('direction')],distance=answers[moveKey('distance')];
      if(!Number.isInteger(direction)||direction<1||direction>10)requests.push({participantId:caster.id,field:moveKey('direction'),kind:'d10',label:'Tempête : direction aléatoire d10'});
      if(!Number.isInteger(distance)||distance<2||distance>20)requests.push({participantId:caster.id,field:moveKey('distance'),kind:'2d10',label:'Tempête : distance 2d10 mètres'});
      if(!Number.isInteger(direction)||direction<1||direction>10 || !Number.isInteger(distance)||distance<2||distance>20)continue;
      const movement=spec.movement.table[direction-1],metres=['stays','disappears'].includes(movement)?0:distance;
      if(!guided.has(effect.castExecutionId))logs.push({kind:'effect',actorId:caster.id,detail:{direction:movement,metres,round},text:'Tempête : '+movement+', '+metres+' mètres ; nouvelle zone et occupants déclarés par le MJ.'});guided.add(effect.castExecutionId);
      if(movement==='disappears'){effect.expiresAtRound=round;continue;}
    }
    if (spec.directEarth && typeof data[key('earth')] !== 'boolean') { ask('earth','boolean','en contact direct avec la terre ?'); continue; }
    // Un vivant à 0 B reste soignable ; un décès explicitement enregistré ne l’est pas.
    if (spec.directEarth && !data[key('earth')] || spec.livingOnly && (!hasLivingMagicNature(target) || target.dead === true || target.isDead === true || target.extensions?.v5?.dead === true)) continue;
    if (spec.guidance) {
      const guideKey=name=>`spell:${effect.castExecutionId}:guide:${name}`;
      const guide = inputs[caster.id] || {}, kindKey=guideKey('astronomy'), rollKey=guideKey('guidance');
      if (typeof guide[kindKey] !== 'boolean') { requests.push({participantId:caster.id,field:kindKey,kind:'boolean',label:'Comète : utiliser Savoir (Astronomie) plutôt que CT ?'}); continue; }
      if (!Number.isInteger(guide[rollKey]) || guide[rollKey]<1 || guide[rollKey]>100) { requests.push({participantId:caster.id,field:rollKey,kind:'d100',label:'Comète : jet du Test de guidage (d100)'}); continue; }
      const astronomy = (caster.skills || []).find(s => /astronom/i.test(s.name || ''));
      if (guide[kindKey] && !astronomy) { requests.push({participantId:caster.id,field:guideKey('skill'),kind:'manual',label:'Savoir (Astronomie) absent : choisir CT ou renseigner la compétence sur le profil.'}); continue; }
      const test = selectV5Test(previewV5Test({score:guide[kindKey]?Number(astronomy.total):Number(caster.caracs.CT),roll:guide[rollKey],slModifiers:[{id:'comet',amount:guide[kindKey]?2:-3}]}),'keep');
      if (!test.success) {
        const scatterKey=guideKey('scatter');
        if (!Number.isInteger(guide[scatterKey]) || guide[scatterKey]<1 || guide[scatterKey]>10) { requests.push({participantId:caster.id,field:scatterKey,kind:'d10',label:'Comète : distance par DR négatif (d10), direction et zone finale à fixer par le MJ'}); continue; }
      }
      if(!guided.has(effect.castExecutionId))logs.push({kind:'effect',actorId:caster.id,text:`${effect.spellName} : guidage ${test.sl} DR ; déplacement ${test.success ? Math.max(0,test.sl)*Math.floor(caster.caracs.FM/10) : Math.abs(test.sl)*guide[guideKey('scatter')]} mètres, zone finale confirmée par le MJ.`});
      guided.add(effect.castExecutionId);
    }
    if (spec.presence && typeof data[key('present')] !== 'boolean') { ask('present','boolean','présent dans la zone ?'); continue; }
    if (spec.presence && !data[key('present')]) { if(spec.presenceEnds)Object.assign(target,expireSpellEffects(target,{effectId:effect.id}).participant); if(spec.once)effect.roundEffectDone=true; continue; }
    if(spec.cover){if(typeof data[key('cover')]!=='boolean'){ask('cover','boolean','abrité par une couverture solide ?');continue;}if(data[key('cover')])continue;}
    let secondaryFailed=false;
    if(spec.test){
      const die=data[key('roundTest')],testSpec=spec.test;
      if(!Number.isInteger(die)||die<1||die>100){ask('roundTest','d100',testSpec.skill+' ('+testSpec.modifierSl+' DR)');continue;}
      const skill=(target.skills || []).find(s=>(s.name || '').toLowerCase()===testSpec.skill.toLowerCase());
      const test=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs[testSpec.stat],testSpec.stat),roll:die,slModifiers:[{id:'spell-round',amount:testSpec.modifierSl}]}),'keep');
      secondaryFailed=!test.success;
      logs.push({kind:'effect',actorId:caster.id,text:effect.spellName+' — '+target.name+' : '+testSpec.skill+' '+test.sl+' DR, '+(test.success?'réussi':'raté')+'. '+(spec.testReminder || '')});
    }
    let damageSpec=spec.damage;
    let tempestFailed=false;
    if(spec.sizeDamage || spec.tempest){
      const die=data[key('location')];if(!Number.isInteger(die)||die<1||die>100){ask('location','d100','localisation (d100)');continue;}
      let base;
      if(spec.sizeDamage){const size=data[key('size')];if(!Number.isInteger(size)||size<1||size>7){ask('size','integer','Taille (1 à 7)');continue;}base=size>=spec.sizeDamage.largeMin?spec.sizeDamage.large:spec.sizeDamage.normal;}
      if(spec.tempest){
        let machine=false;
        if(spec.machines){machine=data[key('machine')];if(typeof machine!=='boolean'){ask('machine','boolean','bâtiment ou machine de guerre ?');continue;}}
        if(machine){base=15;logs.push({kind:'effect',actorId:caster.id,text:effect.spellName+' — '+target.name+' : bâtiment/machine, projectile +15 ; aucun Test d’Athlétisme.'});}
        else{
          const flying=data[key('flying')],athletics=data[key('athletics')];
          if(typeof flying!=='boolean'){ask('flying','boolean','actuellement en vol ?');continue;}
          if(!Number.isInteger(athletics)||athletics<1||athletics>100){ask('athletics','d100','Athlétisme '+(flying?'+1':'+2')+' DR');continue;}
          const skill=(target.skills || []).find(s=>/athlet/i.test((s.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
          const test=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs.Ag,'Ag'),roll:athletics,slModifiers:[{id:'tempest-athletics',amount:flying?spec.athleticsFlyingSl:spec.athleticsGroundSl}]}),'keep');tempestFailed=!test.success;base=flying?spec.missileFlying:spec.missileGround;
          logs.push({kind:'effect',actorId:caster.id,text:effect.spellName+' — '+target.name+' : Athlétisme '+test.sl+' DR ; '+(tempestFailed?'−20 CC/CT jusqu’à la fin du sort':'caractéristiques préservées')+(spec.moveTest?' ; déplacement soumis à Calme +0, chute 50 m/Round si volant raté et CT −3 DR.':'')});
        }
      }

      const bfm=Math.floor(Number(caster.caracs.FM)/10),multiplier=spec.doubleOnTrait && hasTargetNatureOrTrait(target,spec.doubleOnTrait)?2:1;
      damageSpec={formula:String((bfm+base)*multiplier),magicMissile:true};
    }
    let lost = 0, healed = 0;
    // Bénédiction de Souffle (`doesNotBreathe`) : la cible ignore l'Étouffement, la couche reste posée et reprend à l'expiration de la bénédiction.
    if (spec.suffocation && phase!=='expiry' && !doesNotBreathe(target)) {
      lost = Math.min(1,Number(target.hp));
      if (target.hp === 0) {
        effect.suffocationZeroRounds=(effect.suffocationZeroRounds || 0)+1;
        if (effect.suffocationZeroRounds >= Math.floor(Number(target.caracs.E)/10)) target.extensions.v5.dead=true;
      }
    }
    if(spec.damageOnlyOnTestFailure && !secondaryFailed)damageSpec=null;
    if (damageSpec) {
      let formula=damageSpec.targetFormula?spellFormulaValue(damageSpec.formula,target,spec.castingSl):damageSpec.formula;
      if(spec.headOrBody){const die=data[key('headOrBody')];if(!Number.isInteger(die)||die<1||die>100){ask('headOrBody','d100','tête1–50 ou corps51–100');continue;}damageSpec={...damageSpec,location:die<=50?'Tête':'Corps'};}
      const needsLocation = !damageSpec.location && !damageSpec.ignoreAp;
      const roll = data[key('location')];
      if (needsLocation && (!Number.isInteger(roll) || roll<1 || roll>100)) { ask('location','d100','localisation (d100)'); continue; }
      const damage = resolveSpellDamage({caster,target,formula:String(formula),spell:{...damageSpec,location:damageSpec.location},roll:needsLocation?reverseV5Roll(roll):undefined,extraDamage:(damageSpec.magicMissile?Number(spec.damageBonus)||0:0)+(spec.damageEscalation?Math.max(0,round-effect.appliedAtRound)*spec.damageEscalation:0),ignoreAp:damageSpec.ignoreAp,ignoreMetalAp:effect.domain==='heavens',sl:spec.castingSl});
      const wardCount=wardDiceCount(target.extensions?.v5 || {}), wardRolls=Array.from({length:wardCount},(_,i)=>data[key('ward'+i)]);
      const declared={...spec.attackNature,...damageSpec.attackNature,...Object.fromEntries(Object.entries(data).filter(([name,value])=>name.startsWith(key('nature:'))&&typeof value==='boolean').map(([name,value])=>[name.slice(key('nature:').length),value]))};
      const calmDie=data[key('protectionCalm')],calmSkill=(target.skills || []).find(s=>/calme|cool/i.test(s.name || ''));
      const calm=Number.isInteger(calmDie)&&calmDie>=1&&calmDie<=100?selectV5Test(previewV5Test({score:effectiveSkillScore(target,calmSkill?.total ?? calmSkill?.value ?? target.caracs.FM,'FM'),roll:calmDie}),'keep'):null;
      const protection=previewMagicProtection(target,damage.finalDamage,{wardRoll:wardCount>1?wardRolls:wardRolls[0],nature:attackNature({magical:true,spell:true,ranged:true,fire:effect.domain==='fire',declared}),calm});
      if (!protection.ready) {
        if(protection.unknown?.length)for(const tag of protection.unknown)ask('nature:'+tag,'boolean','nature de la frappe : '+natureTagLabel(tag)+' ?');
        else if(/Calme/.test(protection.error || ''))ask('protectionCalm','d100','Calme pour la réduction de dégâts (d100)');
        else for(let i=0;i<Math.max(1,wardCount);i++)if(!Number.isInteger(wardRolls[i]))ask('ward'+i,'d10','Protection '+(i+1)+' (d10)');
        continue;
      }
      lost=Math.min(Number(target.hp),lost+protection.amount);
    }
    if(tempestFailed){
      const remaining=Math.max(1,effect.expiresAtRound-round);
      Object.assign(target,applySpellEffects(target,{id:effect.id+':tempest-penalty:'+round,parentEffectId:effect.id,spellId:effect.spellId,spellName:effect.spellName,casterId:effect.casterId,castExecutionId:effect.castExecutionId,duration:remaining+' Rounds',statModifiers:{CC:-20,CT:-20}},{round,caster}).participant);
    }
    if (spec.healing === 'BFM') healed=Math.min(Number(target.maxHp)-Number(target.hp),Math.floor(Number(caster.caracs.FM)/10));
    if (spec.regeneration) {
      const die=data[key('regeneration')], maximum=data[key('regenerable')];
      if (!Number.isInteger(die) || die<1 || die>10) { ask('regeneration','d10','Régénération (d10)'); continue; }
      if (!Number.isInteger(maximum) || maximum<0 || maximum>Number(target.maxHp)-Number(target.hp)) { ask('regenerable','integer','Blessures récupérables, hors feu'); continue; }
      healed=Math.min(maximum,target.hp>0?die:die>=8?1:0);
      if (die===10 && target.extensions.v5.criticalWounds?.length) {
        const id=data[key('critical')];
        if (!target.extensions.v5.criticalWounds.some(c=>c.id===id)) { ask('critical','manual','Identifiant du Critique hors feu à régénérer'); continue; }
        target.extensions.v5.criticalWounds=target.extensions.v5.criticalWounds.filter(c=>c.id!==id);
      }
    }
    if(effect.specialState?.deathBurst && target.hp>0 && lost>=target.hp)effect.spellDamageAtZero=true;
    target.hp=Math.max(0,Math.min(Number(target.maxHp),Number(target.hp)-lost+healed));
    if (spec.suffocation && target.hp === 0) Object.assign(target,acquireV5Conditions(target,['Inconscient'],{round}).participant);
    if (secondaryFailed && spec.failConditions) Object.assign(target,acquireV5Conditions(target,spec.failConditions,{round}).participant);
    // Points de Corruption sur Test raté de la clause (ex. Transformation de Tzeentch).
    if (secondaryFailed && spec.failCorruption) target.extensions.v5.corruptionPoints=(Number(target.extensions.v5.corruptionPoints) || 0)+Number(spec.failCorruption);
    if(spec.releaseAtStunned && (target.states || []).filter(s=>/sonne|stunned/.test(String(s.key || s.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).reduce((n,s)=>n+Number(s.level || 1),0)>=spec.releaseAtStunned){Object.assign(target,expireSpellEffects(target,{effectId:effect.id}).participant);target.extensions.v5.banished=true;logs.push({kind:'effect',actorId:caster.id,text:effect.spellName+' : esprit libéré après '+spec.releaseAtStunned+' Sonné.'});}
    if(phase==='expiry' && spec.suffocation)Object.assign(target,applySpellEffects(target,{spellId:effect.spellId,spellName:effect.spellName+' : enseveli',casterId:caster.id,duration:'Spécial',roundEffect:{phase:'endOfRound',suffocation:true},specialState:{suffocating:true}},{round,caster}).participant);
    if (spec.conditions) Object.assign(target,acquireV5Conditions(target,spec.conditions,{round}).participant);
    if (spec.emerge) {
      effect.specialState={...(effect.specialState || {}),underground:false};
      if (target.extensions.v5.specialStates) target.extensions.v5.specialStates.underground=false;
    }
    if (spec.once) (target.extensions.v5.spellEffects.find(e=>e.id===effect.id) || effect).roundEffectDone=true;
    logs.push({kind:'effect',actorId:caster.id,detail:{spellId:effect.spellId,phase,round,woundsLost:lost,healed},text:`${effect.spellName} — ${target.name} : −${lost} B, +${healed} B${spec.emerge?', émergence (destination et créature repoussée : MJ)':''}.`});
  }
  return {participants:result,requests:[...new Map(requests.map(r=>[r.participantId+':'+r.field,r])).values()],logs};
}

/** Le bouclier utilisé redevient disponible au début du Tour de son porteur. */
export function shieldAtTurnStart(participants, actorId) {
  return participants.map(actor => {
    if (actor.id !== actorId || !actor.extensions?.shieldUnavailable) return actor;
    const extensions = { ...actor.extensions }; delete extensions.shieldUnavailable; delete extensions.shieldUnavailableCause;
    return { ...actor, extensions };
  });
}

/**
 * Coups récurrents d'un sort (Lames Azurées, WoM p. 98) : au début du Tour d'un adversaire désigné, chaque effet actif du lanceur
 * porte ses coups à des Localisations aléatoires. Les jets de localisation (1d100) sont des demandes explicites ; sans eux rien
 * n'est appliqué. Chaque coup rejoue les Protections magiques de la cible (immunité, réduction, Protection au d10 saisi) comme
 * tout dégât de sort ; un d10 manquant est demandé.
 */
export function recurringSpellHits(participants, currentActorId, inputs = {}) {
  const requests = [], logs = [];
  let result = participants;
  const target = participants.find(p => p.id === currentActorId);
  if (!target) return { participants, requests, logs };
  for (const caster of participants) {
    for (const effect of unsuppressedSpellEffects(caster.extensions?.v5?.spellEffects || [])) {
      const hits = effect.recurringHits;
      if (!hits || caster.id === target.id || !(hits.targetIds || []).includes(target.id)) continue;
      const data = inputs[target.id] || {};
      const fields = Array.from({ length: hits.hits }, (_, i) => ({ field: `recurringHit:${effect.id}:${i + 1}`, label: `${effect.spellName} : Localisation du coup ${i + 1} sur ${target.name} (1d100)` }));
      const rolls = fields.map(({ field }) => data[field]);
      if (rolls.some(roll => !Number.isInteger(roll) || roll < 1 || roll > 100)) {
        for (const { field, label } of fields) if (!Number.isInteger(data[field]) || data[field] < 1 || data[field] > 100) requests.push({ participantId: target.id, participantName: target.name, field, kind: 'd100', label });
        continue;
      }
      const current = result.find(p => p.id === target.id);
      const nature = attackNature({ ranged: false, magical: true, spell: true });
      const wardRequests = [], protectedHits = [];
      let total = 0, unresolvedNature = false;
      rolls.forEach((roll, i) => {
        const damage = resolveSpellDamage({ caster, target: current, formula: hits.formula, spell: { name: effect.spellName }, roll: reverseV5Roll(roll) }).finalDamage;
        const field = `recurringWard:${effect.id}:${i + 1}`;
        // Bénédiction de Lileath : un d10 par Protection admise (champs `…:2`, `…:3`), une seule réussite annule le coup.
        const wardFields = Array.from({ length: Math.max(1, wardDiceCount(current)) }, (_, k) => k ? `${field}:${k + 1}` : field);
        const wardDice = wardFields.map(name => Number.isInteger(data[name]) ? data[name] : null);
        const naturePrefix='recurringNature:'+effect.id+':'+(i+1)+':',declared=Object.fromEntries(Object.entries(data).filter(([name,value])=>name.startsWith(naturePrefix)&&typeof value==='boolean').map(([name,value])=>[name.slice(naturePrefix.length),value]));
        const calmField='recurringCalm:'+effect.id+':'+(i+1),calmDie=data[calmField],skill=(current.skills || []).find(s=>/calme|cool/i.test(s.name || ''));
        const calm=Number.isInteger(calmDie)&&calmDie>=1&&calmDie<=100?selectV5Test(previewV5Test({score:effectiveSkillScore(current,skill?.total ?? current.caracs.FM,'FM'),roll:calmDie}),'keep'):null;
        const protection = previewMagicProtection(current, damage, { wardRoll: wardFields.length > 1 ? wardDice : wardDice[0], nature:attackNature({ranged:false,magical:true,spell:true,declared}),calm });
        if(protection.unknown?.length){for(const tag of protection.unknown)wardRequests.push({participantId:target.id,participantName:target.name,field:naturePrefix+tag,kind:'boolean',label:effect.spellName+' : nature du coup '+(i+1)+' — '+natureTagLabel(tag)+' ?'});return;}
        if(!protection.ready && /Calme/.test(protection.error || '')){wardRequests.push({participantId:target.id,field:calmField,kind:'d100',label:effect.spellName+' : Calme contre coup '+(i+1)+' (d100)'});return;}
        if (!protection.ready && protection.ward) {
          wardFields.forEach((name, k) => { if (wardDice[k] === null) wardRequests.push({ participantId: target.id, participantName: target.name, field: name, kind: 'd10', label: `${effect.spellName} : Protection ${protection.wards?.[k] ?? protection.ward}+ de ${target.name} contre le coup ${i + 1} (1d10)` }); });
          return;
        }
        if (!protection.ready) { unresolvedNature = true; total += damage; return; }
        total += protection.amount;
        if (protection.wardSaved || protection.immune) protectedHits.push(i + 1);
      });
      if (wardRequests.length) { requests.push(...wardRequests); continue; }
      const hpBefore = Number(current.hp) || 0, hpAfter = Math.max(0, hpBefore - total);
      const text = `${effect.spellName} · ${hits.hits} coups de ${hits.formula} sur ${target.name} : ${hpBefore - hpAfter} Blessures perdues.${protectedHits.length ? ` Protection magique : coup(s) ${protectedHits.join(', ')} annulé(s).` : ''}${unresolvedNature ? ` Protections de ${target.name} dont la nature de l'attaque reste à préciser : non appliquées.` : ''} Armes Très Longues ou Massives : hors des lames ; armes Longues : en même temps.`;
      result = result.map(p => p.id === target.id ? { ...p, hp: hpAfter } : p);
      logs.push({ id: `recurring-hits:${effect.id}:${target.id}:${currentActorId}`, kind: 'effect', actorId: caster.id, actorName: caster.name, text, detail: { spellName: effect.spellName, rolls, total, hpBefore, hpAfter } });
    }
  }
  return { participants: result, requests, logs };
}

/**
 * `endedTurn` = {actorId, round} du Tour qui vient de se terminer (absent pour un saut manuel de Round : échéance de Round seule).
 * D-12 : un effet en Rounds (sort, Forme bestiale) expire à la fin du Tour de son auteur, une fois le Round d'échéance atteint ;
 * `expiresAtNextTurnOf` (Cieux) reste au début du Tour du porteur. `tempFortuneExpiresTurn` n'est écrit nulle part : inchangé.
 */
export function processCombatTurnSpells(participants, round, currentActorId, endedTurn = null) {
  const presentIds = (participants || []).map(participant => participant.id);
  const ended = endedTurn?.actorId ? { actorId: endedTurn.actorId, round: endedTurn.round, presentIds } : null;
  return (participants || []).map(participant => {
    let p = advanceMagicConsequences(participant,{currentRound:round});
    if (p.extensions?.v5?.spellEffects?.length > 0) {
      if(p.id===currentActorId){
        const ids=(p.extensions.v5.spellEffects || []).filter(e=>e.expiresAtNextTurnOf===p.id).map(e=>e.id);
        for(const id of ids)p=expireSpellEffects(p,{effectId:id}).participant;
      }
      const res = expireSpellEffects(p, { currentRound: round, endedTurn: ended });
      p = res.participant;
    }
    if (p.extensions?.v5?.tempFortuneExpiresTurn !== undefined && round > p.extensions.v5.tempFortuneExpiresTurn) {
      const nextExt = { ...p.extensions, v5: { ...p.extensions.v5 } };
      delete nextExt.v5.tempFortune;
      delete nextExt.v5.tempFortuneExpiresTurn;
      p = { ...p, extensions: nextExt };
    }
    const beastEnd = p.extensions?.v5?.beastForm?.expiresAtRound;
    // Même échéance que l'effet marqueur : fin du Tour de l'auteur (D-12), à défaut celui du porteur.
    const author = p.extensions?.v5?.beastForm?.casterId;
    const owner = author && presentIds.includes(author) ? author : p.id;
    if (beastEnd !== undefined && beastEnd !== null
      && (ended ? (ended.actorId === owner && ended.round >= beastEnd) || round > beastEnd : round >= beastEnd)) {
      p = endBeastForm(p).participant;
    }
    return p;
  }).filter(p => p.extensions?.v5?.summonCastExecutionId || p.extensions?.v5?.summonedUntilRound === undefined || round < p.extensions.v5.summonedUntilRound);
}
