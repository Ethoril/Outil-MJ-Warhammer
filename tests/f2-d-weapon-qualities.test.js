import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution, normalizeResolutionInput } from '../js/core/resolution.js';
import { buildCombatTest } from '../js/core/v5-combat-rules.js';
import { ammunitionCompatibility, applyWeaponSkillRules } from '../js/core/equipment.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { healV5Wounds } from '../js/core/v5-effects.js';
import { createStore } from '../js/core/store.js';
import {
  advanceV5NetEscape, applyV5SportSwordQuality, calculateV5ArmorPenalty, conditionalV5KnifeQualities, entanglementStrength,
  canUseV5PowderAmmunition, naturalWeaponDefaults, parseV5Inflict, previewV5Blast, previewV5Fast, previewV5Hack,
  previewV5HookedNet, previewV5ImpaleProjectile, previewV5ProjectileExtraction, previewV5Inflict, previewV5Parry, previewV5WoundRecovery,
  previewV5PistolContact, previewV5Shield, previewV5Slash, previewV5Spread, previewV5TrapBlade,
  previewV5Wrap, validateV5ShieldHands
} from '../js/core/v5-weapon-qualities.js';
import { advanceV5Reload, beginV5Reload, consumeV5WeaponShot, createV5ReloadState } from '../js/core/v5-reloading.js';

const q = (id, parameter = '') => ({ id, parameter });

test('F2-D pure proposal — Explosion uses only GM targets, omits SL damage, keeps Conditions', () => {
  const preview = previewV5Blast({ qualities: [q('explosion', '3'), q('devastatrice')], targetIds: ['a', 'b', 'a'],
    weaponDamage: 7, unitsDie: 4, conditions: [{ key: 'enflamme' }] });
  assert.equal(preview.ready, true);
  assert.deepEqual(preview.targets.map(row => row.participantId), ['a', 'b']);
  assert.deepEqual(preview.targets[0], { participantId: 'a', damage: 11, slDamage: 0, opposed: false, conditions: [{ key: 'enflamme' }] });
  assert.equal(previewV5Blast({ qualities: [q('explosion', '3')], targetIds: ['a'], weaponDamage: 7 }).targets[0].damage, 7);
  assert.match(previewV5Blast({ qualities: [q('explosion', '3')], weaponDamage: 7 }).unresolved[0], /cibles désignées/u);
});

test('F2-D pure proposal — Rapide applies only to attacks with one weapon', () => {
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: true }).initiativeBonus, 2);
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: true, secondWeaponAttack: true }).initiativeBonus, 0);
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: true, dualWielding: true }).initiativeBonus, 0);
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: false }).initiativeBonus, 0);
});

test('F2-D Rapide — affiche +2 Initiative sur cette attaque pour arbitrage MJ, sans DR ni fiche',()=>{
  const actor={id:'fast',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const target={id:'foe',camp:'foes',hp:20,maxHp:20,caracs:{E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:30,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('rapide')]},attackContext:{ranged:false},v5:{kind:'melee',context:{}}});
  assert.equal(preview.fast.initiativeBonus,2);assert.ok(preview.reminders.some(text=>/Rapide : \+2 Initiative pour cette attaque uniquement/u.test(text)));
  assert.equal(preview.test.details.totalModifier,0,'Rapide ne modifie pas les DR');
  const dual=previewResolution({actor,target,round:1,baseRevision:0,roll:30,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('rapide')]},attackContext:{ranged:false},v5:{kind:'melee',context:{dualWielding:true}}});
  assert.equal(dual.fast.initiativeBonus,0);
  const second=previewResolution({actor,target,round:1,baseRevision:0,roll:30,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('rapide')]},attackContext:{ranged:false},v5:{kind:'melee',context:{secondWeaponAttack:true}}});
  assert.equal(second.fast.initiativeBonus,0);
});

test('F2-D pure proposal — Taille damages only the named struck armour piece', () => {
  assert.deepEqual(previewV5Hack({ qualities: ['taille'], hit: true, struckItemId: 'mail-coat', currentAp: 2 }).damage,
    { itemId: 'mail-coat', before: 2, after: 1, amount: 1 });
  assert.equal(previewV5Hack({ qualities: ['taille'], hit: true, struckItemId: 'buckler', currentAp: 0 }).damage.after, 0);
  assert.equal(previewV5Hack({ qualities: ['taille'], hit: false, struckItemId: 'mail-coat', currentAp: 2 }).damage, null);
  assert.equal(previewV5Hack({ qualities: ['taille'], hit: true, currentAp: 2 }).ready, false);
});

test('F2-D résolution — Taille retire 1 PA de la seule pièce choisie avant les dégâts',()=>{
  const actor={id:'hacker',camp:'allies',zone:'active',hp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const armour={id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]};
  const target={id:'armoured',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[armour],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:21,action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('taille')]},
    attackContext:{ranged:true},v5:{kind:'ranged',context:{struckItemId:'mail'}}});
  assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
  assert.equal(preview.hack.damage.after,1);
  assert.equal(preview.protection.ap,1);
  assert.equal(preview.damage.targetArmour,1);
});

test('F2-D Store — Taille persiste la pièce frappée, affecte le coup suivant, survit au reload et Undo',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const actor={id:'hacker',name:'Hacker',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const armour={id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]};
  const target={id:'armoured',name:'Armoured',kind:'PNJ',camp:'foes',zone:'active',hp:40,maxHp:40,caracs:{E:30},states:[],skills:[],equipment:[armour],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const makePlan=(id)=>store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:id,roll:21,round:1,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('taille')]},attackContext:{ranged:true},v5:{kind:'ranged',context:{struckItemId:'mail'}}});
  let first=makePlan('taille-one');assert.equal(first.protection.ap,1);assert.equal((await store.applyResolution(first)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.mail,1);
  const restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(store.getFullJSON());
  assert.equal(restored.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.mail,1);
  const second=restored.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'taille-two',roll:21,round:1,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('taille')]},attackContext:{ranged:true},v5:{kind:'ranged',context:{struckItemId:'mail'}}});
  assert.equal(second.protection.ap,0,'la pièce reste dégradée au coup suivant');
  assert.equal(second.hack.damage.after,0);
  assert.equal((await restored.applyResolution(second)).status,'applied');
  assert.equal(restored.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.mail,2);
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem?.mail,undefined,'Undo annule aussi la dégradation');
});

test('F2-D Store — Taille peut frapper le bouclier choisi et persiste sa dégradation',async()=>{
  const store=createStore({storage:null});await store.ready;
  const actor={id:'hacker',name:'Hacker',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const shield={id:'buckler',kind:'shield',name:'Bouclier',ap:2,locations:[],keywords:[q('bouclier')]};
  const target={id:'guard',name:'Guard',kind:'PNJ',camp:'foes',zone:'active',hp:30,maxHp:30,caracs:{E:30},states:[],skills:[],equipment:[shield],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'taille-shield',roll:21,round:1,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('taille')]},attackContext:{ranged:false},
    protectionContext:{shieldId:'buckler',shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:false},
    defense:{type:'skill',label:'Esquive',attr:'Ag',base:40,roll:40,v5:{kind:'test',context:{}}},
    v5:{kind:'melee',context:{struckItemId:'buckler'}}});
  assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));assert.equal(preview.protection.ap,1);assert.equal(preview.hack.damage.itemId,'buckler');
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.buckler,1);
});

test('F2-D Store — Entaille applique Hémorragique au critique, dépense 1 Élan pour +1 et s’annule',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const actor={id:'slasher',name:'Slasher',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{hasMomentum:true}}};
  const target={id:'victim',name:'Victim',kind:'PNJ',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const plan=store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'entaille-hit',roll:11,round:1,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('entaille','2 A')]},attackContext:{ranged:false},
    defense:{type:'skill',label:'Corps à corps',attr:'CC',base:30,roll:45,v5:{kind:'melee',context:{}}},
    criticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{entailleMomentumSpend:1}}});
  assert.equal(plan.slash.bleedingConditions,2);assert.equal(plan.slash.momentumSpent,1);
  assert.ok(plan.targetConditionApplication.some(row=>row.key==='hemorragique'&&row.level===2));
  assert.equal(plan.momentum.find(row=>row.participantId===actor.id).after,false);
  const applied=await store.applyResolution(plan);assert.equal(applied.status,'applied',applied.reason||plan.unresolved.join('; '));
  const updated=store.listParticipants().find(row=>row.id===target.id);assert.equal(updated.states.filter(row=>row.key==='hemorragique').reduce((sum,row)=>sum+row.level,0),2);
  assert.equal(store.listParticipants().find(row=>row.id===actor.id).extensions.v5.hasMomentum,false);
  const reloaded=createStore({storage:null,persistence:io});await reloaded.ready;await reloaded.loadFromJSON(store.getFullJSON());
  assert.equal(reloaded.listParticipants().find(row=>row.id===target.id).states.filter(row=>row.key==='hemorragique').reduce((sum,row)=>sum+row.level,0),2);
  assert.equal(reloaded.listParticipants().find(row=>row.id===actor.id).extensions.v5.hasMomentum,false);
  assert.equal(await store.undo(),true);assert.equal(store.listParticipants().find(row=>row.id===target.id).states.some(row=>row.key==='hemorragique'),false);
  assert.equal(store.listParticipants().find(row=>row.id===actor.id).extensions.v5.hasMomentum,true);
  const oneAdvantage=previewResolution({actor,target,round:1,baseRevision:0,roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('entaille','1 A')]},attackContext:{ranged:false},
    defense:{type:'skill',label:'Corps à corps',attr:'CC',base:30,roll:45,v5:{kind:'melee',context:{}}},criticalRolls:{location:45,effect:80},
    v5:{kind:'melee',context:{entailleMomentumSpend:1}}});
  assert.equal(oneAdvantage.slash.bleedingConditions,2,'le paramètre V4 1A ne multiplie pas l’effet V5');
});

test('F2-D Piège-lame Store — critique remplace, lâche, bloque puis permet un ramassage confirmé et annulable',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const sword={id:'enemy-sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:[]};
  const actor={id:'attacker',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[sword],extensions:{v5:{}}};
  const target={id:'defender',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:30,E:30},skills:[],states:[],talents:[],equipment:[],extensions:{v5:{}}};
  const input={actor,target,round:1,baseRevision:0,roll:35,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
    defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],
      v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2}}},
    defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const {actor:_actor,target:_target,baseRevision:_baseRevision,...request}=input;
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,...request});
  assert.equal(preview.weaponTrap?.disposition,'dropped');assert.equal(preview.defenderCritical.kind,'Piège-lame');
  assert.equal(preview.defenderCritical.application.extraWounds,0);
  const trapApply=await store.applyResolution(preview);assert.equal(trapApply.status,'applied',JSON.stringify({status:trapApply.status,reason:trapApply.reason,previewRevision:preview.baseRevision,storeRevision:store.revision}));
  const dropped=store.listParticipants().find(row=>row.id===actor.id).equipment[0];assert.equal(dropped.extensions.v5.weaponDisposition,'dropped');
  const retry=store.previewResolution({actorId:actor.id,targetId:target.id,round:1,resolutionId:'reuse-dropped',roll:35,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},defense:input.defense,
    defenderCriticalRolls:input.defenderCriticalRolls,v5:input.v5});
  assert.match(retry.unresolved.join('; '),/lâchée ou saisie/u);
  const restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(store.getFullJSON());
  const collisionState={schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id,'other-owner'],participants:restored.listParticipants().map(row=>structuredClone(row))},log:[],diceLines:[]};
  collisionState.combat.participants.push({id:'other-owner',camp:'foes',zone:'active',hp:10,maxHp:10,caracs:{CC:20},skills:[],states:[],equipment:[{id:sword.id,kind:'weapon',name:'Autre épée',extensions:{v5:{weaponDisposition:'dropped'}}}],extensions:{v5:{}}});
  const collisionStore=createStore({storage:null,persistence:io});await collisionStore.ready;await collisionStore.loadFromJSON(collisionState);
  const collision=collisionStore.previewResolution({actorId:target.id,round:1,resolutionId:'pick-up-collision',action:{type:'test',attr:'CC',base:0},v5:{kind:'test',context:{recoverDroppedWeaponId:sword.id}}});
  assert.match(collision.unresolved.join('; '),/conflit d’identifiant/u);assert.equal(collision.weaponTrapRecovery,null);
  const explicit=collisionStore.previewResolution({actorId:target.id,round:1,resolutionId:'pick-up-specific-owner',action:{type:'test',attr:'CC',base:0},v5:{kind:'test',context:{recoverDroppedWeaponId:sword.id,recoverDroppedWeaponOwnerId:'other-owner'}}});
  assert.equal(explicit.weaponTrapRecovery.fromParticipantId,'other-owner');assert.equal(explicit.unresolved.length,0,explicit.unresolved.join('; '));
  assert.equal((await collisionStore.applyResolution(explicit)).status,'applied');
  assert.equal(collisionStore.listParticipants().find(row=>row.id==='other-owner').equipment.length,0);
  assert.equal(collisionStore.listParticipants().find(row=>row.id===target.id).equipment.some(row=>row.id===sword.id),true);
  const recovery=restored.previewResolution({actorId:actor.id,round:1,resolutionId:'pick-up-sword',action:{type:'test',attr:'CC',base:0},v5:{kind:'test',context:{recoverDroppedWeaponId:sword.id,recoverDroppedWeaponOwnerId:actor.id}}});
  assert.ok(recovery.weaponTrapRecovery);assert.equal(recovery.unresolved.length,0,recovery.unresolved.join('; '));
  assert.equal((await restored.applyResolution(recovery)).status,'applied');
  assert.equal(restored.listParticipants().find(row=>row.id===actor.id).equipment[0].extensions?.v5?.weaponDisposition,undefined);
  assert.equal(await restored.undo(),true);assert.equal(restored.listParticipants().find(row=>row.id===actor.id).equipment[0].extensions.v5.weaponDisposition,'dropped');
});

test('F2-D Incassable — bloque le bris du Piège-lame, mais pas le désarmement',()=>{
  const make=(unbreakable)=>{
    const sword={id:unbreakable?'unbreakable-sword':'breakable-sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:unbreakable?[q('incassable')]:[]};
    const actor={id:'attacker-'+unbreakable,camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[sword],extensions:{v5:{}}};
    const target={id:'defender-'+unbreakable,camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30},skills:[],states:[],talents:[],equipment:[],extensions:{v5:{}}};
    const input={actor,target,round:1,baseRevision:0,roll:35,resolutionId:'trap-break-'+unbreakable,
      action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
      defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],
        v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2,trapBladeChooseBreak:true,trapBladeStrengthTest:{base:60,roll:20}}}},
      defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}};
    return {actor,target,sword,input,preview:previewResolution(input)};
  };
  const breakable=make(false),unbreakable=make(true);
  assert.equal(breakable.preview.weaponTrap.disposition,'broken');
  assert.equal(unbreakable.preview.weaponTrap.disposition,'dropped');
  assert.equal(unbreakable.preview.weaponTrap.receipt.breakBlockedByUnbreakable,true);
  const brokenState={revision:0,round:1,participants:[breakable.actor,breakable.target],appliedResolutionIds:[]};
  const brokenApply=applyResolution(breakable.preview,brokenState);assert.equal(brokenApply.status,'applied');
  assert.equal(brokenApply.state.participants.find(row=>row.id===breakable.actor.id).equipment[0].extensions.v5.weaponDisposition,'broken');
  const state={revision:0,round:1,participants:[unbreakable.actor,unbreakable.target],appliedResolutionIds:[]};
  const applied=applyResolution(unbreakable.preview,state);assert.equal(applied.status,'applied');
  const sword=applied.state.participants.find(row=>row.id===unbreakable.actor.id).equipment[0];
  assert.equal(sword.extensions.v5.weaponDisposition,'dropped','Incassable n’empêche pas le désarmement');
});

test('F2-D Piège-lame — Talent Désarmement transfère l’arme saisie pour 1 Élan, Undo et reload',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const sword={id:'caught-sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:[]};
  const actor={id:'attacker-catch',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[sword],extensions:{v5:{}}};
  const target={id:'defender-catch',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:30,E:30},skills:[],talents:[{id:'talent-disarm'}],states:[],equipment:[],extensions:{v5:{hasMomentum:false}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,round:1,roll:35,resolutionId:'trap-catch',
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
    defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],
      v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2,trapBladeCatch:true,trapBladeSpendMomentum:true}}},
    defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}});
  assert.equal(preview.weaponTrap.disposition,'caught');assert.equal(preview.momentum.find(row=>row.participantId===target.id).after,false);
  assert.ok(preview.momentum.find(row=>row.participantId===target.id).details.some(row=>row.eventId==='trap-catch:trap-blade-catch'));
  const contradictory=previewResolution({actor,target,round:1,roll:35,resolutionId:'trap-catch-and-break',
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
    defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2,trapBladeCatch:true,trapBladeSpendMomentum:true,trapBladeChooseBreak:true,trapBladeStrengthTest:{base:60,roll:20}}}},
    defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}});
  assert.equal(contradictory.weaponTrap.disposition,'broken');assert.ok(contradictory.weaponTrap.catch);
  assert.equal(contradictory.unresolved.length,0,contradictory.unresolved.join('; '));
  const sequenceState={revision:0,round:1,participants:[actor,target],appliedResolutionIds:[]};
  const sequenceApplied=applyResolution(contradictory,sequenceState);assert.equal(sequenceApplied.status,'applied');
  const transferred=sequenceApplied.state.participants.find(row=>row.id===target.id).equipment.find(row=>row.id===sword.id);
  assert.equal(transferred.extensions.v5.weaponDisposition,'broken');assert.equal(transferred.extensions.v5.weaponTrap.caughtBy,target.id);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===actor.id).equipment.some(row=>row.id===sword.id),false);
  const recipient=store.listParticipants().find(row=>row.id===target.id);assert.equal(recipient.equipment.find(row=>row.id===sword.id).extensions.v5.weaponTrap.caughtBy,target.id);
  assert.equal(recipient.extensions.v5.hasMomentum,false);
  const reloaded=createStore({storage:null,persistence:io});await reloaded.ready;await reloaded.loadFromJSON(store.getFullJSON());
  assert.ok(reloaded.listParticipants().find(row=>row.id===target.id).equipment.some(row=>row.id===sword.id));
  assert.equal(await store.undo(),true);assert.equal(store.listParticipants().find(row=>row.id===actor.id).equipment.some(row=>row.id===sword.id),true);
  assert.equal(store.listParticipants().find(row=>row.id===target.id).equipment.some(row=>row.id===sword.id),false);
});

test('F2-D pure proposal — ranged Empaleuse critical blocks one wound until extraction', () => {
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, ammunitionId: 'opaque-19', participantId: 't' }).ready, false);
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, ammunitionId: 'opaque-19', ammunitionType: 'Balle', participantId: 't' }).lodgedProjectile.removal, 'surgery');
  assert.deepEqual(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, ammunitionId: 'arrow-1', ammunitionType: 'Flèche', participantId: 't' }),
    { ready: true, unresolved: [], lodgedProjectile: { participantId: 't', ammunitionId: 'arrow-1', ammunitionType: 'fleche', removal: 'heal-test', healTestModifier: 0 }, healingBlocked: 1 });
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: false, critical: true, ammunitionId: 'a', participantId: 't' }).healingBlocked, 0);
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true }).ready, false);
  assert.deepEqual(previewV5WoundRecovery({ lodgedProjectiles: [{ id: 'arrow' }, { id: 'bullet', removed: true }], requestedWounds: 2 }),
    { ready: true, unresolved: [], requestedWounds: 2, blockedWounds: 1, recoverableWounds: 1 });
});

test('F2-D pure proposal — Inflige parses fixed and carrier Strength, locks an entangling weapon', () => {
  assert.deepEqual(parseV5Inflict('Empêtré 50'), { ready: true, unresolved: [], condition: { key: 'enchevetre', name: 'Empêtré', level: 1, strength: 50 } });
  assert.deepEqual(parseV5Inflict('Empêtré (votre Force)', 37).condition, { key: 'enchevetre', name: 'Empêtré', level: 1, strength: 37 });
  assert.equal(parseV5Inflict('Empêtré (votre Force)').ready, false);
  assert.deepEqual(previewV5Inflict({ qualities: [q('inflige', 'Empêtré 50')], hit: true, entangling: true, itemId: 'net-1' }), {
    ready: true, unresolved: [], condition: { key: 'enchevetre', name: 'Empêtré', level: 1, strength: 50 },
    weaponLocked: true, lockedItemId: 'net-1', release: { voluntary: true, weaponId: 'net-1' }
  });
  assert.equal(previewV5Inflict({ qualities: [q('inflige', 'Empêtré votre Force')], hit: true }).ready, false);
  assert.equal(previewV5Inflict({ qualities: [q('inflige', 'Empêtré 50')], hit: false }).condition, null);
});

test('F2-D pure proposal — Parade handles off-hand defense and second attack separately', () => {
  assert.equal(previewV5Parry({ qualities: ['parade'], defending: true, offHand: true }).defensePenalty, 0);
  assert.equal(previewV5Parry({ qualities: [], defending: true, offHand: true }).defensePenalty, null);
  assert.equal(previewV5Parry({ qualities: ['parade'], dualWielding: true, isSecondAttack: true, firstAttackHit: true }).secondAttackUnopposed, true);
  assert.equal(previewV5Parry({ qualities: ['parade'], dualWielding: true, isSecondAttack: true, firstAttackHit: false }).secondAttackUnopposed, false);
});

test('F2-D Parade — arme secondaire annule le −2 DR en défense et peut rendre la seconde attaque non opposable',()=>{
  const actor={id:'parrier',camp:'allies',zone:'active',hp:20,caracs:{CC:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const enemy={id:'enemy',camp:'foes',zone:'active',hp:20,caracs:{CC:50},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const defensePlan=buildCombatTest(normalizeResolutionInput({actor,target:enemy,roll:30,action:{type:'test',attr:'CC',base:50},
    defense:{type:'skill',attr:'CC',base:50,roll:30,qualities:[q('parade')],v5:{kind:'melee',context:{offHandWeapon:true}}},v5:{kind:'melee'}}),'defender');
  assert.equal(defensePlan.test.options[0].result.details.modifiers.some(row=>row.id==='quality:offhand-defense'),false);
  const ordinaryDefense=buildCombatTest(normalizeResolutionInput({actor,target:enemy,roll:30,action:{type:'test',attr:'CC',base:50},
    defense:{type:'skill',attr:'CC',base:50,roll:30,qualities:[],v5:{kind:'melee',context:{offHandWeapon:true}}},v5:{kind:'melee'}}),'defender');
  assert.equal(ordinaryDefense.test.options[0].result.details.modifiers.find(row=>row.id==='quality:offhand-defense')?.amount,-2);
  const target={id:'target',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:60,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:21,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('parade')]},
    defense:{type:'skill',attr:'CC',base:100,roll:10,label:'Corps à corps'},v5:{kind:'melee',context:{dualWielding:true,secondWeaponAttack:true,firstWeaponAttackHit:true}}});
  assert.equal(preview.hit,true,'la réussite adverse ne s’oppose pas à cette seconde attaque Parade');
});

test('F2-D Parade — une maîtrise C avec Base retire Parade avant l’attaque et ne neutralise pas l’opposition',()=>{
  const actor={id:'fencer',camp:'allies',zone:'active',hp:20,caracs:{CC:60,F:30,E:30},states:[],skills:[{id:'base',name:'Corps à corps (Base)',group:'Corps à corps',specialty:'Base',basic:true,total:60,advances:1}],equipment:[],extensions:{v5:{}}};
  const weapon={id:'sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:[q('parade')]};actor.equipment=[weapon];
  const target={id:'target',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const trained=applyWeaponSkillRules(actor,{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'sword'}}},{weapon,context:{weaponSkillId:'base'},sourceQualities:weapon.keywords});
  assert.equal(trained.receipt.trained,true);assert.ok(trained.action.qualities.every(row=>row.id!=='parade'));
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:21,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:trained.action.qualities,extensions:{fiche:{equipmentId:'sword'}}},
    defense:{type:'skill',attr:'CC',base:80,roll:25,label:'Corps à corps'},
    v5:{kind:'melee',context:{dualWielding:true,secondWeaponAttack:true,firstWeaponAttackHit:true,weaponSkillId:'base'}}});
  assert.ok(preview.opposition,'l’opposition reste présente même avec les faits de seconde attaque');
  assert.equal(preview.hit,false,'la Parade retirée par maîtrise C ne donne pas de seconde attaque gratuite');
});

test('F2-D pure proposal — Pistolet can attack engaged targets without range penalty', () => {
  assert.deepEqual(previewV5PistolContact({ qualities: ['pistolet'], attack: true, engaged: true, ranged: true }),
    { ready: true, unresolved: [], allowed: true, rangeModifier: 0, oppositionKind: 'melee' });
  assert.equal(previewV5PistolContact({ qualities: ['pistolet'], attack: true, engaged: false, ranged: true }).allowed, false);
});

test('F2-D integration — Pistolet quality removes the engaged-target ranged penalty while other weapons retain it', () => {
  const actor={id:'pistol-user',caracs:{CT:50},skills:[],states:[],extensions:{v5:{}}};
  const target={id:'engaged-target',caracs:{CC:40},skills:[],states:[],extensions:{v5:{}}};
  const makePlan=qualities=>buildCombatTest(normalizeResolutionInput({actor,target,roll:35,
    action:{type:'attack',attr:'CT',base:50,qualities},v5:{kind:'ranged',context:{targetEngaged:true}}}));
  assert.equal(makePlan([q('pistolet')]).test.advantage.disadvantage.some(row=>row.id==='target-engaged'),false);
  assert.equal(makePlan([]).test.advantage.disadvantage.some(row=>row.id==='target-engaged'),true);
});

test('F2-D resolution — an engaged Pistolet may be opposed with Melee, while a non-Pistolet still needs authorization', () => {
  const actor={id:'pistol-user',camp:'a',hp:12,caracs:{CT:50,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const target={id:'engaged-target',camp:'b',hp:12,caracs:{CC:50,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const resolve=qualities=>previewResolution({actor,target,roll:35,baseRevision:0,
    action:{type:'attack',attr:'CT',base:50,damage:3,qualities},
    defense:{type:'defense',label:'Corps à corps',attr:'CC',base:50,roll:40,v5:{kind:'melee'}},
    attackContext:{ranged:true},v5:{kind:'ranged',context:{targetEngaged:true}}});
  const pistol=resolve([q('pistolet')]);
  const other=resolve([]);
  assert.equal(pistol.unresolved.some(row=>row.includes('Confirmer la règle autorisant cette défense')),false);
  assert.equal(other.unresolved.some(row=>row.includes('Confirmer la règle autorisant cette défense')),true);
});

test('F2-D pure proposal — Piège-lame can trap only on a qualifying defensive critical', () => {
  const trapped = previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade',
    defenderSize: 4, opponentSize: 4, chooseTrap: true, hasDisarmTalent: true, spendMomentum: true, catchInFreeHand: true,
    chooseBreak: true, strengthTestSuccess: true, meleeSl: 2 });
  assert.deepEqual(trapped, { ready: true, unresolved: [], available: true, trapped: true, criticalReplaced: true, opponentDropsWeapon: true,
    catch: { inFreeHand: true, momentumSpent: true }, break: { test: 'strength', difficultySl: -3, addedMeleeSl: 2, weaponBroken: true }, breakBlockedByUnbreakable: false });
  assert.equal(previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade', defenderSize: 3, opponentSize: 4, chooseTrap: true }).available, false);
  assert.equal(previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade', defenderSize: 4, opponentSize: 4, chooseTrap: true, chooseBreak: true, strengthTestSuccess: true, unbreakable: true }).break, null);
  assert.equal(previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: false, opponentWeaponType: 'blade' }).available, false);
});

test('F2-D pure proposal — Incassable cancels only the break option; Enroulement penalizes melee opposition', () => {
  const row = previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade', defenderSize: 4,
    opponentSize: 4, chooseTrap: true, chooseBreak: true, strengthTestSuccess: true, unbreakable: true });
  assert.equal(row.breakBlockedByUnbreakable, true);
  assert.equal(previewV5Wrap({ qualities: ['a-enroulement'], opposingMelee: true }).defenderSlPenalty, -1);
  assert.equal(previewV5Wrap({ qualities: ['a-enroulement'], opposingMelee: false }).defenderSlPenalty, 0);
});

test('F2-D pure proposal — V5 Entaille adds exactly one Bleeding per Momentum spent, independent of V4 rating', () => {
  assert.deepEqual(previewV5Slash({ qualities: [q('entaille', '2')], criticalDamage: true, spendAdvantage: 1 }),
    { ready: true, unresolved: [], bleedingConditions: 2, momentumSpent: 1, unusedMomentum: 0 });
  assert.equal(previewV5Slash({ qualities: [q('entaille', '1')], criticalDamage: true, spendAdvantage: 1 }).bleedingConditions,2);
  assert.equal(previewV5Slash({ qualities: [q('entaille', '2')], criticalDamage: false, spendAdvantage: 2 }).bleedingConditions, 0);
  assert.equal(previewV5Slash({ qualities: [q('entaille')], criticalDamage: true, spendAdvantage: 0 }).bleedingConditions, 1);
});

test('F2-D pure proposal — Dispersion respects band behavior and requires GM-selected targets', () => {
  assert.deepEqual(previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'point-blank', targetIds: ['a'], weaponDamage: 6 }).targets,
    [{ participantId: 'a', damage: 8 }]);
  const extreme = previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'extreme', targetIds: ['a', 'b', 'c'], weaponDamage: 6 });
  assert.deepEqual(extreme.targets.map(row => row.damage), [4, 4, 4]);
  assert.equal(previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'point-blank', targetIds: ['a', 'b'], weaponDamage: 6 }).ready, false);
  assert.equal(previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'long', weaponDamage: 6 }).ready, false);
  assert.equal(extreme.requiresGMTargetValidation, true);
});

test('F2-D résolution — Dispersion applies only to MJ-designated targets and the chosen band', () => {
  const actor={id:'sprayer',camp:'allies',zone:'active',hp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const primary={id:'primary',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const extra={id:'extra',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const outside={id:'outside',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:20,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('dispersion','2')]},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{spreadRangeBand:'short',spreadTargetIds:['primary','extra'],spreadLocationRollsById:{extra:35}}},v5State:{participants:[actor,primary,extra,outside]}});
  assert.equal(preview.spreadPlan.targets.length,2);
  assert.equal(preview.secondaryTargets.length,1);
  assert.equal(preview.secondaryTargets[0].participantId,'extra');
  const applied=applyResolution(preview,{revision:0,round:1,participants:[actor,primary,extra,outside],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.ok(applied.state.participants.find(row=>row.id==='primary').hp<20);
  assert.ok(applied.state.participants.find(row=>row.id==='extra').hp<20);
  assert.equal(applied.state.participants.find(row=>row.id==='outside').hp,20);
});

test('F2-D résolution — Explosion ignores opposition and DR, and applies to every MJ-designated active target',()=>{
  const actor={id:'bomber',camp:'allies',zone:'active',hp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const primary={id:'blast-primary',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const secondary={id:'blast-secondary',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const outside={id:'blast-outside',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const participants=[actor,primary,secondary,outside];
  const preview=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:'BF+2',qualities:[q('explosion','3'),q('devastatrice')]},
    defense:{type:'skill',base:50,roll:99,label:'Esquive'},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionTargetIds:[primary.id,secondary.id],explosionLocationRollsById:{[secondary.id]:35}}},v5State:{participants}});
  assert.equal(preview.hit,true);
  assert.equal(preview.blastPlan.targets.length,2);
  assert.equal(preview.damage.sl,0);
  assert.equal(preview.damage.weaponDamage,6,'l’arme BF+2 vaut 5, puis Dévastatrice ajoute le dé des unités');
  assert.equal(preview.secondaryTargets.length,1);
  assert.equal(preview.secondaryTargets[0].participantId,secondary.id);
  assert.equal(preview.secondaryTargets[0].damage.sl,0);
  const applied=applyResolution(preview,{revision:0,round:1,participants,appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.ok(applied.state.participants.find(row=>row.id===primary.id).hp<20);
  assert.ok(applied.state.participants.find(row=>row.id===secondary.id).hp<20);
  assert.equal(applied.state.participants.find(row=>row.id===outside.id).hp,20);
  const exceptional=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('explosion','3'),q('devastatrice')]},
    defense:{type:'skill',base:100,roll:20,label:'Esquive'},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionOpposed:true,explosionTargetIds:[primary.id]}}});
  assert.equal(exceptional.hit,false);
  const unknownHp={id:'unknown-hp',camp:'foes',zone:'active',caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const blocked=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('explosion','3')]},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionTargetIds:[primary.id,unknownHp.id],explosionLocationRollsById:{[unknownHp.id]:35}}},
    v5State:{participants:[actor,primary,unknownHp]}});
  assert.ok(blocked.unresolved.some(row=>row.includes('PV actuels et maximum requis')));
  const refused=applyResolution(blocked,{revision:0,round:1,participants:[actor,primary,unknownHp],appliedResolutionIds:[]});
  assert.equal(refused.status,'manual');
  assert.equal(refused.state.participants.find(row=>row.id===unknownHp.id).hp,undefined,'aucune cible sans PV n’est écrasée à 0');
});

test('F2-D pure proposal — conditional knife keeps Penetrating and gates only Impale/Pointue', () => {
  assert.deepEqual(conditionalV5KnifeQualities({ qualities: ['empaleuse', 'pointue', 'perforante'], targetSurprised: false, targetProne: false }).qualities, ['perforante']);
  assert.deepEqual(conditionalV5KnifeQualities({ qualities: ['empaleuse', 'pointue', 'perforante'], targetProne: true }).qualities,
    ['empaleuse', 'pointue', 'perforante']);
});

test('F2-D pure proposal — V5 shield defense, attached coverage, ranged boundary and attack suspension', () => {
  const shield = { id: 'buckler', kind: 'shield', ap: 2, keywords: ['bouclier'] };
  const defended = previewV5Shield({ shield, selected: true, available: true, defenseSkill: 'dodge', ranged: true, shieldAttached: true });
  assert.equal(defended.defenseBonus, 1);
  assert.equal(defended.rangedDodgeAllowed, true);
  assert.deepEqual(defended.locations, ['head', 'body', 'offArm']);
  assert.equal(previewV5Shield({ shield: { ...shield, ap: 1 }, selected: true, available: true, defenseSkill: 'dodge', ranged: true }).confirmed, false);
  assert.equal(previewV5Shield({ shield, selected: true, available: true, defenseSkill: 'melee', ranged: false }).defenseBonus, 1);
  assert.equal(previewV5Shield({ shield, attackWithShield: true }).confirmed, false);
  assert.deepEqual(previewV5Shield({ shield, selected: true, available: true, attackWithShield: true }), { ready: true, unresolved: [], confirmed: true,
    defenseBonus: 0, armorPoints: 0, reach: 'personal', improvisedWeapon: true, protectionSuspended: true, resumesAt: 'start-next-turn' });
  assert.equal(previewV5Shield({ shield, selected: false, available: true, defenseSkill: 'melee' }).confirmed, false);
  assert.equal(previewV5Shield({ shield, selected: true, available: false, attackWithShield: true }).confirmed, false);
});

test('F2-D pure proposal — an attached shield permits polearms; a buckler frees the off-hand for a zero-Enc weapon', () => {
  const shield = { id: 'shield', kind: 'shield', ap: 2, keywords: ['bouclier'] };
  assert.equal(validateV5ShieldHands({ shield, weaponHands: 2, weaponEncumbrance: 2, polearm: true, attached: true }).allowed, true);
  assert.equal(validateV5ShieldHands({ shield, weaponHands: 2, weaponEncumbrance: 2, polearm: false, attached: true }).allowed, false);
  assert.equal(validateV5ShieldHands({ shield: { ...shield, ap: 1 }, weaponHands: 2, weaponEncumbrance: 2, attached: true }).allowed, false);
  assert.equal(validateV5ShieldHands({ shield: { ...shield, ap: 1 }, weaponHands: 2, weaponEncumbrance: 2, polearm: true, attached: true }).allowed, true);
  const buckler = { ...shield, ap: 1 };
  assert.equal(validateV5ShieldHands({ shield: buckler, weaponHands: 1, weaponEncumbrance: 1, attached: true, offHandWeaponEncumbrance: 0 }).reason, 'buckler-free-hand');
  assert.equal(validateV5ShieldHands({ shield, weaponHands: 1, weaponEncumbrance: 1, attached: true, offHandWeaponEncumbrance: 0 }).reason, null);
});

test('F2-D bouclier attaquant — mains à deux mains bloquées, hast attachée et rondache + arme 0 Enc passent',()=>{
  const actor={id:'shield-attacker',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],ficheSkillsComplete:true,states:[],equipment:[
    {id:'polearm',kind:'weapon',name:'Hallebarde (2M)',category:'Armes d’Hast',damage:5,encumbrance:3},
    {id:'buckler',kind:'shield',name:'Targe',category:'Bouclier',ap:1,keywords:[q('bouclier')]},
    {id:'shield',kind:'shield',name:'Bouclier',category:'Bouclier',ap:2,keywords:[q('bouclier')]},
    {id:'sword',kind:'weapon',name:'Épée',category:'Base',damage:4,encumbrance:1},
    {id:'free-weapon',kind:'weapon',name:'Dague',category:'Base',damage:2,encumbrance:0}],extensions:{v5:{}}};
  const target={id:'guard',camp:'foes',hp:20,maxHp:20,caracs:{CC:40,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const plan=context=>previewResolution({actor,target,round:1,baseRevision:0,roll:35,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'polearm'}}},
    attackContext:{ranged:false},v5:{kind:'melee',context:{...context,actorShieldId:'shield',weaponHands:2,weaponEncumbrance:3}}});
  assert.ok(plan({shieldAttached:false}).unresolved.some(text=>/combinaison des mains incompatible/u.test(text)));
  const polearmPlan=plan({shieldAttached:true});assert.ok(!polearmPlan.unresolved.some(text=>/combinaison des mains incompatible/u.test(text)),JSON.stringify(polearmPlan.unresolved));
  const bucklerAttack=previewResolution({actor,target,round:1,baseRevision:0,roll:35,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'sword'}}},
    attackContext:{ranged:false},v5:{kind:'melee',context:{actorShieldId:'buckler',shieldAttached:true,weaponHands:1,weaponEncumbrance:1,offHandWeaponId:'free-weapon'}}});
  assert.ok(!bucklerAttack.unresolved.some(text=>/combinaison des mains incompatible/u.test(text)),'rondache attachée laisse libre une arme d’Encombrement 0 en main secondaire');
});

test('F2-D pure proposal — powder ammunition: only the blunderbuss accepts small/improvised shot', () => {
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre noire', ammunitionType: 'grenaille', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre noire', ammunitionType: 'projectile improvisé', isBlunderbuss: false }).allowed, false);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Ingénierie', ammunitionType: 'bullet' }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre noire', ammunitionType: 'unknown' }).allowed, false);
});

test('F2-D munitions poudre — catalogue profil Tromblon accepte grenaille/improvisé, arquebuse les bloque',()=>{
  const items=getReferenceCatalogue().items,weapon=(name)=>items.find(row=>row.kind==='weapon'&&row.name===name),ammo=(pattern)=>items.find(row=>row.kind==='ammunition'&&pattern.test(row.name));
  const blunderbuss=weapon('Tromblon (2M)'),arquebuse=weapon('Arquebuse (2M)'),bullets=ammo(/Balles et poudre/u),shot=ammo(/Grenaille et poudre/u),improvised=ammo(/Munitions improvisées/u);
  assert.equal(ammunitionCompatibility(blunderbuss,shot).status,'compatible');
  assert.equal(ammunitionCompatibility(blunderbuss,improvised).status,'compatible');
  assert.equal(ammunitionCompatibility(arquebuse,shot).status,'incompatible');
  assert.equal(ammunitionCompatibility(arquebuse,improvised).status,'incompatible');
  assert.equal(ammunitionCompatibility(arquebuse,bullets).status,'compatible');
  const actor={id:'ammo-user',caracs:{CT:50},skills:[],equipment:[arquebuse,bullets],states:[],extensions:{v5:{}}};
  assert.doesNotThrow(()=>normalizeResolutionInput({actor,roll:40,ammunitionId:bullets.id,action:{type:'attack',attr:'CT',base:50,extensions:{fiche:{equipmentId:arquebuse.id}}}}));
  assert.throws(()=>normalizeResolutionInput({actor:{...actor,equipment:[arquebuse,shot]},roll:40,ammunitionId:shot.id,action:{type:'attack',attr:'CT',base:50,extensions:{fiche:{equipmentId:arquebuse.id}}}}),error=>error.code==='AMMUNITION_INCOMPATIBLE');
});

test('F2-D pure proposal — worn mail/plate and closed helm penalties apply by category only once', () => {
  const marked = { notes: '-1 DR en Discrétion si une ou plusieurs pièces de mailles sont portées' };
  assert.deepEqual(calculateV5ArmorPenalty({ worn: [{ category: 'mail', ...marked }, { category: 'mail', ...marked }, { category: 'plate' }, { category: 'closed-helm' }] }),
    { ready: true, unresolved: [], stealthDr: -1, perceptionDr: -2 });
  assert.deepEqual(calculateV5ArmorPenalty({ worn: [{ category: 'plate', worn: false }, { category: 'closed-helm', worn: false }] }),
    { ready: true, unresolved: [], stealthDr: 0, perceptionDr: 0 });
});

test('F2-D armures — pénalités catalogue appliquées seulement aux pièces explicitement portées',()=>{
  const mail={id:'mail',kind:'armour',category:'Mailles',locations:['body'],keywords:[],notes:'-1 DR en Discrétion si une ou plusieurs pièces de mailles sont portées'};
  const plate={id:'plate',kind:'armour',category:'Plates',locations:['body'],keywords:[]};
  const helm={id:'helm',kind:'armour',category:'Plates',locations:['head'],keywords:[q('impenetrable')]};
  const openHelm={id:'open-helm',kind:'armour',category:'Plates',locations:['head'],keywords:[q('partielle')]};
  const actor={id:'armoured-test',caracs:{Ag:40,Int:40},skills:[],states:[],equipment:[mail,plate,helm,openHelm],extensions:{v5:{}}};
  const stealth=buildCombatTest(normalizeResolutionInput({actor,roll:30,action:{type:'test',attr:'Ag',base:50,label:'Discrétion'},
    v5:{kind:'test',context:{wornArmorItemIds:['mail','plate']}}}));
  assert.equal(stealth.test.options[0].result.details.modifiers.find(row=>row.id==='armor:stealth')?.amount,-1);
  const perception=buildCombatTest(normalizeResolutionInput({actor,roll:30,action:{type:'test',attr:'Int',base:50,label:'Perception'},
    v5:{kind:'test',context:{wornArmorItemIds:['helm']}}}));
  assert.equal(perception.test.options[0].result.details.modifiers.find(row=>row.id==='armor:perception')?.amount,-2);
  const open=buildCombatTest(normalizeResolutionInput({actor,roll:30,action:{type:'test',attr:'Int',base:50,label:'Perception'},
    v5:{kind:'test',context:{wornArmorItemIds:['open-helm']}}}));
  assert.equal(open.test.options[0].result.details.modifiers.some(row=>row.id==='armor:perception'),false);
});

test('F2-D armures catalogue — Mailles/Plates naines et notes Gromril/Ithilmar déclenchent les catégories correctes',()=>{
  const items=getReferenceCatalogue().items.filter(item=>item.kind==='armour');
  const at=(category,name)=>items.find(item=>item.category===category&&item.name===name);
  const dwarfMail=at('Mailles Naines','Jupe de mailles'),dwarfPlate=at('Plates Naines','Casque de mineur (ouvert)');
  const gromrilOpen=at('Gromril (nain)','Heaume ouvert'),gromrilClosed=at('Gromril (nain)','Heaume');
  const ithilmarClosed=at('Ithilmar Haut Elfe','Heaume Ithiltaen');
  assert.ok(dwarfMail&&dwarfPlate&&gromrilOpen&&gromrilClosed&&ithilmarClosed);
  assert.deepEqual(calculateV5ArmorPenalty({worn:[dwarfMail]}).stealthDr,0);
  assert.deepEqual(calculateV5ArmorPenalty({worn:[dwarfPlate]}).stealthDr,-1);
  assert.deepEqual(calculateV5ArmorPenalty({worn:[gromrilOpen]}),{ready:true,unresolved:[],stealthDr:-1,perceptionDr:0});
  assert.deepEqual(calculateV5ArmorPenalty({worn:[gromrilClosed]}),{ready:true,unresolved:[],stealthDr:-1,perceptionDr:-2});
  assert.deepEqual(calculateV5ArmorPenalty({worn:[ithilmarClosed]}),{ready:true,unresolved:[],stealthDr:0,perceptionDr:-2});
});

test('F2-D pure proposal — natural weapons default to personal reach with no qualities', () => {
  assert.deepEqual(naturalWeaponDefaults({ natural: true }), { ready: true, unresolved: [], reach: 'personal', qualities: [], defaultsApplied: true });
  assert.deepEqual(naturalWeaponDefaults({ natural: false, reach: 'long', qualities: ['empaleuse'] }).qualities, ['empaleuse']);
});

test('F2-D pure proposal — entanglement Strength values are typed, and hook-net damage is not invented', () => {
  assert.deepEqual(entanglementStrength({ kind: 'cloak' }).strength, 25);
  assert.deepEqual(entanglementStrength({ kind: 'weighted-net' }).strength, 55);
  assert.deepEqual(entanglementStrength({ kind: 'mancatcher', actorStrength: 42, springLoaded: true }),
    { ready: true, unresolved: [], strength: 42, testBonus: 20 });
  assert.deepEqual(entanglementStrength({ kind: 'garrote', actorStrength: 38 }).strength, 38);
  assert.deepEqual(entanglementStrength({ kind: 'garrote', actorStrength: 38, explicitStrength: 44 }).strength, 44);
  assert.equal(entanglementStrength({ kind: 'druchii-net' }).ready, false);
  assert.equal(previewV5HookedNet({ hookedNet: true, struggle: true }).ready, false);
  assert.deepEqual(previewV5HookedNet({ hookedNet: true, struggle: true, damageAmount: 3 }),
    { ready: true, unresolved: [], damage: 3, armourIgnored: true });
});

test('F2-D catalogue exception — Épée de sport carries Inoffensive', () => {
  assert.deepEqual(applyV5SportSwordQuality({ weaponName: 'Épée de sport', qualities: ['defensive'] }).qualities, ['defensive', 'inoffensive']);
  assert.deepEqual(applyV5SportSwordQuality({ weaponName: 'Épée courte', qualities: ['defensive'] }).qualities, ['defensive']);
  const weapon={id:'sport',kind:'weapon',name:'Épée de sport',category:'Base',keywords:[]};
  const resolved=applyWeaponSkillRules({id:'a',caracs:{CC:50},skills:[],equipment:[weapon]},
    {type:'attack',base:50,qualities:[],extensions:{fiche:{equipmentId:'sport'}}},{weapon,context:{}});
  assert.ok(resolved.action.qualities.some(row=>row.id==='inoffensive'));
});

test('F2-D integration — Inflige is previewed, shown as applied and committed through resolution', () => {
  const actor = { id: 'a', name: 'A', camp: 'allies', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 60, CT: 60, F: 40, E: 30 }, states: [], equipment: [], talents: [], extensions: { v5: { hasMomentum: false } } };
  const target = { ...actor, id: 't', name: 'T', camp: 'foes' };
  const preview = previewResolution({ resolutionId: 'f2-d-inflict', actor, target, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'weapon', type: 'attack', base: 60, damage: 4, qualities: [q('inflige', 'Sonné')] },
    v5: { kind: 'ranged' }, attackContext: { ranged: true } });
  assert.equal(preview.hit, true);
  assert.equal(preview.weaponConditions.applied[0].key, 'sonne');
  const applied = applyResolution(preview, { revision: 0, round: 1, participants: [actor, target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 't').states[0].key, 'sonne');
});

test('F2-D resolution — Immobilisante locks its linked weapon until opposed Force Tests remove every Empêtré', () => {
  const weapon={id:'net-1',kind:'weapon',name:'Filet lesté',keywords:[q('immobilisante','2')],extensions:{}};
  const holder={id:'holder',name:'Porteur',camp:'allies',zone:'active',hp:20,caracs:{CC:50,CT:50,F:3,E:30},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const victim={id:'victim',name:'Cible',camp:'foes',zone:'active',hp:20,caracs:{CC:40,CT:40,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const attack=previewResolution({resolutionId:'d-net-hit',actor:holder,target:victim,baseRevision:0,round:1,roll:20,
    action:{id:'throw-net',type:'attack',attr:'CT',base:50,damage:0,qualities:[q('immobilisante','2')],extensions:{fiche:{equipmentId:'net-1'}}},
    attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.equal(attack.entanglement.weaponLocked,true);
  let applied=applyResolution(attack,{revision:0,round:1,participants:[holder,victim],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  let captor=applied.state.participants.find(row=>row.id==='holder'),entangled=applied.state.participants.find(row=>row.id==='victim');
  const lockId=entangled.states.find(row=>row.key==='enchevetre').source.linkId;
  assert.equal(entangled.states.find(row=>row.key==='enchevetre').strength,3,'le seuil Immobilisante est la Force du porteur, pas son paramètre non publié');
  assert.deepEqual(captor.equipment[0].extensions.v5.entanglementLocks,[lockId]);
  const blockedAttack=previewResolution({resolutionId:'d-net-blocked-weapon',actor:captor,target:victim,baseRevision:applied.state.revision,round:1,roll:20,
    action:{type:'attack',attr:'CT',base:50,damage:1,qualities:[],extensions:{fiche:{equipmentId:'net-1'}}},attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.ok(blockedAttack.unresolved.some(row=>row.includes('retenue par un état Empêtré')));
  for(const [index,[id,roll]] of [['d-net-escape-1',12],['d-net-escape-2',12],['d-net-escape-3',12]].entries()){
    const escape=previewResolution({resolutionId:id,actor:entangled,baseRevision:applied.state.revision,round:1,roll,
      action:{type:'test',attr:'F',base:30,label:'Force'},v5:{kind:'test',context:{netEscapeConditionId:entangled.states[0].id,
        netEscapeOpponentRoll:index===0?1:30,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
    assert.equal(escape.unresolved.length,0,escape.unresolved.join('; '));
    applied=applyResolution(escape,{revision:applied.state.revision,round:1,participants:applied.state.participants,appliedResolutionIds:applied.state.appliedResolutionIds||[]});
    assert.equal(applied.status,'applied');
    entangled=applied.state.participants.find(row=>row.id==='victim');
  }
  assert.equal(entangled.states.some(row=>row.id===lockId),false);
  captor=applied.state.participants.find(row=>row.id==='holder');
  assert.deepEqual(captor.equipment[0].extensions.v5.entanglementLocks,[]);
});

test('F2-D resolution — typed net Strength values supply the entanglement source Strength, not keyword digits', () => {
  const make=kind=>{
    const weapon={id:'typed-'+kind,kind:'weapon',name:'Typed entangler',keywords:[q('immobilisante','2')],extensions:{v5:{entanglementKind:kind}}};
    const actor={id:'holder-'+kind,camp:'allies',hp:20,caracs:{CT:50,F:38,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
    const target={id:'target-'+kind,camp:'foes',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
    return previewResolution({actor,target,roll:20,baseRevision:0,action:{type:'attack',attr:'CT',base:50,damage:0,
      qualities:[q('immobilisante','2')],extensions:{fiche:{equipmentId:weapon.id}}},attackContext:{ranged:true},v5:{kind:'ranged'}});
  };
  assert.equal(make('cloak').targetConditionApplication[0].strength,25);
  assert.equal(make('weighted-net').targetConditionApplication[0].strength,55);
  assert.equal(make('mancatcher').targetConditionApplication[0].strength,38);
  assert.equal(make('garrote').targetConditionApplication[0].strength,38);
  assert.equal(make('druchii-net').targetConditionApplication[0].strength,38);
});

test('F2-D Test de Force — un Mancatcher à ressort ajoute +20/+2 DR uniquement au Test explicitement déclaré', () => {
  const weapon={id:'mancatcher',kind:'weapon',extensions:{v5:{entanglementKind:'mancatcher',springLoaded:true}}};
  const actor={id:'holder',caracs:{F:40},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const makePlan=entanglementTest=>buildCombatTest(normalizeResolutionInput({actor,roll:25,
    action:{type:'test',attr:'F',base:40,extensions:{fiche:{equipmentId:'mancatcher'}}},
    v5:{kind:'test',context:{entanglementTest,entanglementWeaponId:'mancatcher'}}}));
  const applied=makePlan(true),ordinary=makePlan(false);
  assert.equal(applied.test.options[0].result.details.modifiers.find(row=>row.id==='quality:mancatcher-spring-loaded')?.amount,2);
  assert.equal(ordinary.test.options[0].result.details.modifiers.some(row=>row.id==='quality:mancatcher-spring-loaded'),false);
});

test('F2-D résolution — Test de Force réussi avec Mancatcher à ressort applique Empêtré et verrouille l’arme', () => {
  const weapon={id:'mancatcher-test',kind:'weapon',name:'Mancatcher',extensions:{v5:{entanglementKind:'mancatcher',springLoaded:true}}};
  const actor={id:'holder',name:'Porteur',camp:'allies',hp:20,caracs:{F:38,CC:40,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
  const target={id:'target',name:'Cible',camp:'foes',hp:20,caracs:{F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,baseRevision:0,round:1,roll:10,
    action:{type:'test',attr:'F',base:40,label:'Force',extensions:{fiche:{equipmentId:weapon.id}}},
    v5:{kind:'test',context:{entanglementTest:true,entanglementWeaponId:weapon.id,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(preview.test.details.modifiers.find(row=>row.id==='quality:mancatcher-spring-loaded')?.amount,2);
  assert.equal(preview.targetConditionApplication[0].strength,38);
  const applied=applyResolution(preview,{revision:0,round:1,participants:[actor,target],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='target').states[0].key,'enchevetre');
  assert.deepEqual(applied.state.participants.find(row=>row.id==='holder').equipment[0].extensions.v5.entanglementLocks,[preview.entanglement.linkId]);
});

test('F2-D catalogue — Cape/Filet infligent leur Force publiée et verrouillent l’arme; Mancatcher à ressort est rattaché au vrai profil', () => {
  const catalogue=getReferenceCatalogue().items;
  const item=name=>catalogue.find(row=>row.name===name);
  const cloak=item('Cape'),net=item('Filet'),mancatcher=item('Mancatcher (2M)');
  assert.ok(cloak&&net&&mancatcher);
  assert.equal(previewV5Inflict({qualities:cloak.keywords,hit:true,actorStrength:38}).condition.strength,25);
  assert.equal(previewV5Inflict({qualities:net.keywords,hit:true,actorStrength:38}).condition.strength,50);
  assert.equal(previewV5Inflict({qualities:mancatcher.keywords,hit:true,actorStrength:38}).condition.strength,38);

  for(const weapon of [cloak,net]){
    const actor={id:'catalog-holder-'+weapon.id,camp:'allies',zone:'active',hp:20,caracs:{CC:50,CT:50,F:38,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
    const target={id:'catalog-target-'+weapon.id,camp:'foes',zone:'active',hp:20,caracs:{CC:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
    const preview=previewResolution({actor,target,round:1,roll:20,baseRevision:0,action:{type:'attack',attr:'CT',base:50,damage:0,
      qualities:weapon.keywords,extensions:{fiche:{equipmentId:weapon.id}}},defense:{type:'skill',base:30,roll:20,label:'Corps à corps'},attackContext:{ranged:false},v5:{kind:'melee'}});
    assert.equal(preview.targetConditionApplication[0].strength,weapon===cloak?25:50);
    assert.equal(preview.entanglement?.weaponLocked,true);
    assert.equal(preview.weaponConditions.proposed[0].source.weaponLocked,true);
    const applied=applyResolution(preview,{revision:0,round:1,participants:[actor,target],appliedResolutionIds:[]});
    assert.equal(applied.status,'applied');
    assert.deepEqual(applied.state.participants.find(row=>row.id===actor.id).equipment[0].extensions.v5.entanglementLocks,[preview.entanglement.linkId]);
    assert.equal(applied.state.participants.find(row=>row.id===target.id).states[0].source.weaponLocked,true);
  }

  const actor={id:'catalog-mancatcher-holder',camp:'allies',zone:'active',hp:20,caracs:{F:38,E:30},states:[],skills:[],
    equipment:[{...mancatcher,extensions:{v5:{springLoaded:true}}}],extensions:{v5:{}}};
  const target={id:'catalog-mancatcher-target',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const weapon=actor.equipment[0];
  const preview=previewResolution({actor,target,round:1,roll:10,baseRevision:0,action:{type:'test',attr:'F',base:40,
    extensions:{fiche:{equipmentId:weapon.id}}},v5:{kind:'test',context:{entanglementTest:true,entanglementWeaponId:weapon.id,
      involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(preview.test.details.modifiers.find(row=>row.id==='quality:mancatcher-spring-loaded')?.amount,2);
  assert.equal(preview.targetConditionApplication[0].strength,38);
  assert.equal(preview.targetConditionApplication[0].source.weaponLocked,true);
});

test('F2-D integration — Enroulement penalizes a melee opposition, but not a ranged defense', () => {
  const actor = { id: 'a', name: 'A', camp: 'allies', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 60, CT: 60, F: 40, E: 30 }, states: [], equipment: [], talents: [], extensions: { v5: { hasMomentum: false } } };
  const target = { ...actor, id: 't', name: 'T', camp: 'foes' };
  const make = kind => previewResolution({ resolutionId: `f2-d-wrap-${kind}`, actor, target, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'weapon', type: 'attack', base: 60, damage: 4, qualities: [q('a-enroulement')] },
    defense: { type: 'skill', base: 50, roll: 47, label: 'Corps à corps', v5: { kind } }, v5: { kind: 'melee' } });
  const melee = make('melee'), ranged = make('ranged');
  assert.equal(melee.defenderTest.details.modifiers.find(row => row.id === 'quality:a-enroulement')?.amount, -1);
  assert.equal(ranged.defenderTest.details.modifiers.some(row => row.id === 'quality:a-enroulement'), false);
});

test('F2-D Empaleuse — lodged projectiles block one Wound each and require source-matched extraction', () => {
  const participant={id:'p',hp:5,maxHp:10,states:[],extensions:{v5:{lodgedProjectiles:[
    {id:'arrow',removal:'heal-test',removed:false},{id:'bullet',removal:'surgery',removed:false},{id:'removed',removed:true}
  ]}}};
  const healing=healV5Wounds(participant,3);
  assert.equal(healing.participant.hp,6);
  assert.equal(healing.healingBlockedByLodgedProjectiles,2);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[0],method:'heal-test',success:false,testSl:-1}).ready,false);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[0],method:'heal-test',success:true,testSl:0}).removed,true);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[1],method:'heal-test',success:true,testSl:0}).ready,false);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[1],method:'surgery',surgeryConfirmed:true}).removed,true);
});

test('F2-D pure proposal — net escape opposes each Test independently; SL do not accumulate', () => {
  const lost = advanceV5NetEscape({ testSl: 0, opponentSl: 1, entangled: 2 });
  assert.equal(lost.won, false);
  assert.equal(lost.addEntangledOnFailure, true);
  const won = advanceV5NetEscape({ testSl: 2, opponentSl: 0, entangled: 3 });
  assert.equal(won.freed, true);
  assert.equal(won.remainingEntangled, 1);
});

test('F2-D Reload/Reapter — shots use the magazine without Action counters', () => {
  const initial = createV5ReloadState({ repeaterRating: 3, reloadSuccesses: 5 }).state;
  const first = consumeV5WeaponShot(initial).state;
  const second = consumeV5WeaponShot(first).state;
  const third = consumeV5WeaponShot(second).state;
  assert.equal(first.shotsRemaining, 2);
  assert.equal(second.requiresReload, false);
  assert.equal(third.requiresReload, true);
  assert.equal(consumeV5WeaponShot(third).reason, 'reload-required');
});

test('F2-D Reload — a partially filled repeater reduces the success target by one', () => {
  const state = consumeV5WeaponShot(createV5ReloadState({ repeaterRating: 4, reloadSuccesses: 3 }).state).state;
  const begun = beginV5Reload(state);
  assert.equal(begun.state.requiredSuccesses, 2);
  assert.equal(begun.state.partialRepeater, true);
  const progress = advanceV5Reload(begun.state, { success: true, testSl: 0 });
  assert.equal(progress.status, 'progress', 'un Test réussi à +0 DR ajoute le succès de base');
  assert.equal(progress.state.accumulatedSuccesses, 1);
  const done = advanceV5Reload(progress.state, { success: true, testSl: 0 });
  assert.equal(done.status, 'reloaded');
  assert.equal(done.state.shotsRemaining, 4);
  assert.equal(done.state.requiresReload, false);
});

test('F2-D Reload — each success adds one plus positive DR; a failed Test adds zero', () => {
  const empty = createV5ReloadState({ repeaterRating: 1, reloadSuccesses: 4 }).state;
  const used = consumeV5WeaponShot(empty).state;
  const loading = beginV5Reload(used).state;
  const failure = advanceV5Reload(loading, { success: false, testSl: 2 });
  assert.equal(failure.state.accumulatedSuccesses, 0);
  const progress = advanceV5Reload(failure.state, { success: true, testSl: 1 });
  assert.equal(progress.state.accumulatedSuccesses, 2);
  assert.equal(progress.status, 'progress');
});

test('F2-D Reload — revisions reject stale actions and malformed contract data blocks', () => {
  const initial = createV5ReloadState({ repeaterRating: 2, reloadSuccesses: 3 }).state;
  assert.equal(consumeV5WeaponShot(initial, { expectedRevision: 99 }).status, 'stale');
  assert.equal(createV5ReloadState({ repeaterRating: -1, reloadSuccesses: 0 }).ready, false);
  assert.equal(advanceV5Reload(initial, { success: true, testSl: 2 }).ready, false);
});
