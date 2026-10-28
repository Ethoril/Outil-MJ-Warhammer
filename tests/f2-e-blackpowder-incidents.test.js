import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { previewCombatFailure, isBlackpowderIncidentEligible, previewV5BlackpowderResources, previewV5BombFuse, canUseV5Move } from '../js/core/v5-combat-fumbles.js';
import { V5_BLACKPOWDER_INCIDENT_TABLE, V5_COMBAT_FUMBLE_TABLE } from '../js/data/v5-combat-fumbles.js';
import { createStore } from '../js/core/store.js';
import { initialV5ReloadState, beginV5Reload, advanceV5Reload } from '../js/core/v5-reloading.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

const actor = { id: 'shooter', name: 'Tireur', hp: 12, caracs: { E: 30 }, armor: { arms: 0, body: 0 }, states: [], equipment: [] };
const target = { id: 'target', name: 'Cible', hp: 12, caracs: { E: 30 }, states: [] };

test('F2-E — les tables V5 couvrent exactement leurs intervalles et les bornes', () => {
  assert.deepEqual(V5_COMBAT_FUMBLE_TABLE.map(({ min, max }) => [min, max]), [[1,2],[3,4],[5,6],[7,7],[8,8],[9,9],[10,10]]);
  assert.deepEqual(V5_BLACKPOWDER_INCIDENT_TABLE.map(({ min, max }) => [min, max]), [[1,8],[9,10]]);
  for (let roll=1; roll<=10; roll++) {
    const fumble=previewCombatFailure({ normalized:{actor,action:{type:'attack',damage:4},resolutionId:'f'}, fumble:{expanded:false}, context:{fumbleRoll:roll, ...(roll===9?{fumbleDurationRoll:1,fumbleLocationRoll:1}:{}), ...(roll===10?{}:{})} });
    assert.equal(fumble.fumble?.roll,roll);
    assert.equal(fumble.fumble?.outcome.id,V5_COMBAT_FUMBLE_TABLE.find(row=>roll>=row.min&&roll<=row.max).id);
  }
});

test('F2-E — 99/100 ne tirent la table poudre qu’avec Poudre noire, Ingénierie ou Explosif', () => {
  assert.equal(isBlackpowderIncidentEligible({action:{qualities:['a-poudre-noire']}}),true);
  assert.equal(isBlackpowderIncidentEligible({action:{type:'attack'},context:{weaponGroup:'Ingénierie'}}),true);
  assert.equal(isBlackpowderIncidentEligible({action:{type:'attack'},context:{weaponGroup:'Explosifs'}}),true);
  assert.equal(isBlackpowderIncidentEligible({action:{type:'attack'},context:{weaponGroup:'Arbalète'}}),false);
  const plain=previewResolution({actor,target,action:{type:'attack',base:45,damage:4,qualities:[]},v5:{kind:'ranged'},roll:99,baseRevision:0});
  assert.equal(plain.combatFailure.misfire,null);
  assert.equal(plain.combatFailure.fumble?.roll,undefined);
  const powder=previewResolution({actor,target,action:{type:'attack',base:45,damage:4,qualities:['a-poudre-noire']},v5:{kind:'ranged',context:{powderIncidentRoll:1}},roll:99,baseRevision:0});
  assert.equal(powder.combatFailure.misfire.roll,1);
  assert.equal(powder.combatFailure.misfire.outcome.id,'misfire');
});

test('F2-E — compétence sociale ne devient pas combat par kind, firing ou reloading contradictoires', () => {
  const gun=getReferenceCatalogue().items.find(row=>row.id==='weapon-armes-a-distance-poudre-noire-arquebuse-2m');
  assert.ok(gun,'le cas contradictoire conserve une vraie arme liée');
  for(const v5 of [
    {kind:'melee',context:{fumbleRoll:3}},
    {kind:'test',context:{firing:true,fumbleRoll:3}},
    {kind:'test',context:{reloading:true,fumbleRoll:3}}
  ]){
    const social=previewResolution({actor:{...actor,equipment:[structuredClone(gun)]},action:{type:'skill',attr:'Soc',base:40,
      extensions:{fiche:{equipmentId:gun.id}}},roll:100,v5,baseRevision:0});
    assert.equal(social.success,false);
    assert.equal(social.combatFailure.fumble,null);
    assert.ok(!social.unresolved.some(row=>/maladresse de combat/i.test(row)),social.unresolved.join(' | '));
  }
  const socialAttack=previewResolution({actor:{...actor,equipment:[structuredClone(gun)]},action:{type:'attack',attr:'Soc',base:40,
    extensions:{fiche:{equipmentId:gun.id}}},roll:100,v5:{kind:'ranged',context:{fumbleRoll:3}},baseRevision:0});
  assert.equal(socialAttack.success,false);
  assert.equal(socialAttack.combatFailure.fumble,null,'le type attack ne doit pas couvrir un Test social contradictoire');
  const meleeAttack=previewResolution({actor,action:{type:'attack',attr:'CC',base:40},roll:66,v5:{kind:'melee'},baseRevision:0});
  assert.ok(meleeAttack.unresolved.some(row=>/maladresse de combat/i.test(row)),meleeAttack.unresolved.join(' | '));
  const rangedAttack=previewResolution({actor,action:{type:'attack',attr:'CT',base:40},roll:66,v5:{kind:'ranged',context:{fumbleRoll:1}},baseRevision:0});
  assert.equal(rangedAttack.combatFailure.fumble.outcome.id,'minor-injury');
});

test('F2-E — les Tests de Mêlée, de Tir et de rechargement gardent Oops hors Action attaque', () => {
  const melee = previewResolution({ actor, action: { type: 'test', attr: 'CC', base: 40 }, roll: 66,
    v5: { kind: 'melee' }, baseRevision: 0 });
  assert.ok(melee.unresolved.some(row => /maladresse de combat/i.test(row)), melee.unresolved.join(' | '));
  const ranged = previewResolution({ actor, action: { type: 'test', attr: 'CT', base: 40 }, roll: 66,
    v5: { kind: 'ranged', context: { fumbleRoll: 1 } }, baseRevision: 0 });
  assert.equal(ranged.combatFailure.fumble.outcome.id, 'minor-injury');
  const gun=structuredClone(getReferenceCatalogue().items.find(row=>row.id==='weapon-armes-a-distance-poudre-noire-arquebuse-2m'));
  const powderSkill=getReferenceCatalogue().skills.find(row=>row.group==='Projectiles'&&row.specialization==='Poudre noire');
  const shooter={...actor,equipment:[gun],skills:[{id:powderSkill.id,name:powderSkill.nom,group:powderSkill.group,specialization:powderSkill.specialization,
    carac:powderSkill.carac,total:60,advances:1}]};
  const reload = previewResolution({ actor:shooter, action: { type: 'test', attr: 'CT', base: 60,
    extensions:{fiche:{equipmentId:gun.id,skillId:powderSkill.id}} }, roll: 66,
    v5: { kind: 'test', context: { reloading: true, fumbleRoll: 1 } }, baseRevision: 0 });
  assert.equal(reload.combatFailure.fumble.outcome.id, 'minor-injury');
});

test('F2-E — une maladresse exige un résultat, puis applique la perte directe de Blessure', () => {
  const pending=previewResolution({actor,action:{type:'attack',base:40},v5:{kind:'ranged'},roll:66,baseRevision:0});
  assert.ok(pending.unresolved.some(row=>row.includes('résultat du d10')));
  const preview=previewResolution({actor,action:{type:'attack',base:40},v5:{kind:'ranged',context:{fumbleRoll:1}},roll:66,baseRevision:0});
  assert.equal(preview.combatFailure.fumble.outcome.id,'minor-injury');
  const applied=applyResolution(preview,{revision:0,participants:[actor]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='shooter').hp,11);
});

test('F2-E — catastrophe de poudre applique les dégâts du profil au bras du tireur à +0 DR sans maximum saisi', () => {
  const missing=previewResolution({actor,target,action:{type:'attack',base:40,damage:4,qualities:['a-poudre-noire']},v5:{kind:'ranged',context:{powderIncidentRoll:9}},roll:99,baseRevision:0});
  assert.ok(missing.unresolved.some(row=>row.includes('bras directeur')));
  const noSide=previewResolution({actor,target,action:{type:'attack',base:40,damage:4,qualities:['a-poudre-noire']},v5:{kind:'ranged',context:{powderIncidentRoll:9}},roll:99,baseRevision:0});
  assert.ok(noSide.unresolved.some(row=>row.includes('bras directeur')));
  const preview=previewResolution({actor,target,action:{type:'attack',base:40,damage:4,qualities:['a-poudre-noire']},v5:{kind:'ranged',context:{powderIncidentRoll:9,weaponExplosionArmSide:'right'}},roll:99,baseRevision:0});
  assert.equal(preview.combatFailure.misfire.outcome.id,'catastrophe');
  const applied=applyResolution(preview,{revision:0,participants:[actor,target]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='shooter').hp,11, '4 dégâts du profil à +0 DR moins 3 d’Endurance');
});

test('F2-E — les particularités V4 restent nommées, converties en DR et bloquent les données MJ manquantes', () => {
  const gunAxe=previewCombatFailure({normalized:{actor,action:{type:'attack',note:'Hache-fusil',damage:5},resolutionId:'axe'},fumble:{expanded:false},context:{fumbleRoll:2,meleeUse:true,weaponLoaded:true}});
  assert.ok(gunAxe.effects.some(row=>row.reason==='hache-fusil-chargee'&&row.location==='torse'));
  const gunHalberd=previewCombatFailure({normalized:{actor,action:{type:'attack',note:'Hallebarde-fusil'},resolutionId:'halberd'},fumble:{expanded:false},context:{fumbleRoll:2,meleeUse:true,weaponLoaded:true}});
  assert.ok(gunHalberd.unresolved.some(row=>row.includes('désignez les cibles derrière')));
  const volley=previewCombatFailure({normalized:{actor,action:{type:'attack',note:'Arquebuse à salve'},resolutionId:'volley'},context:{firing:true}});
  assert.ok(volley.reminders.some(row=>row.includes('à +2 DR')));
  assert.ok(volley.reminders.some(row=>row.includes('Servant unique'))===false);
});

test('F2-E — l’accident propre d’une hache-fusil en mêlée prime sur la table de poudre au double 99/100', () => {
  const weapon={id:'gun-axe',name:'Hache-fusil',category:'Engineering',keywords:['a-poudre-noire']};
  const result=previewCombatFailure({normalized:{actor:{...actor,equipment:[weapon]},action:{type:'attack',note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}}},resolutionId:'gun-axe-accident'},
    roll:100,fumble:{expanded:false},context:{weaponGroup:'Engineering',meleeUse:true,weaponLoaded:true,fumbleRoll:3}});
  assert.equal(result.misfire,null);
  assert.equal(result.fumble.outcome.id,'weapon-damaged');
  assert.ok(result.effects.some(row=>row.reason==='hache-fusil-chargee'));
});

test('F2-E — maladresse 10 tire au sort parmi les alliés désignés à portée', () => {
  const ally={id:'ally',name:'Allié',camp:'hero',zone:'active',hp:12,caracs:{E:30},armor:{body:1},states:[]};
  const ally2={...ally,id:'ally2'};
  const shooter={...actor,camp:'hero'};
  const normalized={actor:shooter,target,resolutionId:'ally-fumble',action:{type:'attack',damage:4},v5State:{participants:[shooter,ally,ally2]}};
  const pending=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:10,allyCandidates:['ally','ally2']}});
  assert.ok(pending.unresolved.some(row=>row.includes('d100 de sélection')));
  const complete=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:10,allyCandidates:['ally','ally2'],fumbleAllySelectionRoll:51,fumbleAllyUnitsRoll:3}});
  assert.equal(complete.effects.find(row=>row.type==='hit-ally')?.unitsRoll,3);
  assert.equal(complete.effects.find(row=>row.type==='hit-ally')?.targetId,'ally2');
  assert.equal(complete.unresolved.length,0);
  const noTargets=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:10,allyCandidates:[],allyRangeConfirmed:true}});
  assert.ok(noTargets.effects.some(row=>row.type==='condition'&&row.targetId==='shooter'&&row.condition.key==='sonne'));
});

test('F2-E — les règles de poudre demandent les choix MJ au lieu d’inventer des cibles ou des dés', () => {
  const base={actor,action:{type:'attack',note:'Pistolet',damage:5},resolutionId:'special'};
  const muzzle=previewCombatFailure({normalized:base,context:{weaponGroup:'Poudre noire',firing:true,largeBullet:true},hit:true});
  assert.ok(muzzle.unresolved.some(row=>row.includes('désigner le tireur et les cibles')));
  const matchlock=previewCombatFailure({normalized:{...base,action:{...base.action,note:'Arquebuse à mèche'}},context:{firing:true}});
  assert.ok(matchlock.unresolved.some(row=>row.includes('allumer la mèche')));
  const matchlockWithoutFiringFlag=previewCombatFailure({normalized:{...base,action:{...base.action,type:'attack',note:'Arquebuse à mèche'}},context:{}});
  assert.ok(matchlockWithoutFiringFlag.unresolved.some(row=>row.includes('allumer la mèche')),'un tir normal ne contourne pas la mèche');
  const lightAndAttack=previewCombatFailure({normalized:{...base,action:{...base.action,type:'attack',note:'Arquebuse à mèche',extensions:{equipment:{id:'matchlock',name:'Arquebuse à mèche'}}}},context:{lightFuseAction:true}});
  assert.ok(lightAndAttack.unresolved.some(row=>row.includes('Action distincte')),'allumer la mèche et attaquer sont deux Actions');
  const reload=previewCombatFailure({normalized:{...base,action:{...base.action,note:'Arquebuse à salve',extensions:{equipment:{id:'volley',name:'Arquebuse à salve'}}}},context:{reloading:true,crewCount:1,weaponReload:4,projectileCount:6,powderCharges:6},success:true});
  assert.equal(reload.effects.find(row=>row.type==='reload-progress')?.requiredSuccesses,8);
});

test('F2-E — gros projectile demande de vrais Tests de Résistance à +0 DR', () => {
  const normalized={actor,action:{type:'attack',note:'Mortier à main'},resolutionId:'large-bullet'};
  const pending=previewCombatFailure({normalized,context:{firing:true,largeBullet:true,designatedTargetIds:['target']}});
  assert.ok(pending.unresolved.some(row=>row.includes('seuil de Résistance et d100')));
  const tested=previewCombatFailure({normalized,context:{firing:true,largeBullet:true,designatedTargetIds:['target'],deafenedTests:{target:{base:40,roll:60}}}});
  assert.ok(tested.effects.some(row=>row.type==='condition'&&row.targetId==='target'&&row.condition.key==='assourdi'&&row.resistanceTest.sl===-2));
  const passed=previewCombatFailure({normalized,context:{firing:true,largeBullet:true,designatedTargetIds:['target'],deafenedTests:{target:{base:40,roll:30}}}});
  assert.equal(passed.effects.some(row=>row.type==='condition'&&row.condition.key==='assourdi'),false);
});

test('F2-E — échec stupéfiant de l’arquebuse à salve applique le critique V5 du bras', () => {
  const normalized={actor,action:{type:'attack',note:'Arquebuse à salve'},resolutionId:'volley-shoulder'};
  const stock={confirmed:true,projectiles:1,powderCharges:1};
  const pending=previewCombatFailure({normalized,context:{firing:true,crewCount:2,recoilTestBase:20,recoilTestRoll:90,blackpowderStockInitial:stock}});
  assert.ok(pending.unresolved.some(row=>row.includes('d100 sur la table critique du bras')));
  const resolved=previewCombatFailure({normalized,context:{firing:true,crewCount:2,recoilTestBase:20,recoilTestRoll:90,recoilCriticalRolls:20,blackpowderStockInitial:stock}});
  const effect=resolved.effects.find(row=>row.type==='volley-recoil');
  assert.equal(effect.sl,-5);
  assert.equal(effect.armCritical.effect.name,'Choc au bras');
  assert.equal(resolved.unresolved.length,0);
  const bonusSuccess=previewCombatFailure({normalized,context:{firing:true,crewCount:2,recoilTestBase:80,recoilTestRoll:95,blackpowderStockInitial:stock}});
  assert.equal(bonusSuccess.effects.find(row=>row.type==='volley-recoil')?.success,true,'le seuil inclut le +20 avant de déterminer la réussite');
  assert.equal(bonusSuccess.effects.find(row=>row.type==='volley-recoil')?.sl,1);
});

test('F2-E — critique d’épaule du servant est appliqué et inscrit dans les Blessures Critiques', () => {
  const shooter={...actor,hp:20};
  const preview=previewResolution({actor:shooter,action:{type:'test',note:'Arquebuse à salve',base:20},roll:90,round:1,
    v5:{kind:'test',context:{firing:true,crewCount:2,recoilTestBase:20,recoilTestRoll:90,recoilCriticalRolls:20,fumbleRoll:2,blackpowderStockInitial:{confirmed:true,projectiles:1,powderCharges:1}}},baseRevision:0});
  assert.equal(preview.combatFailure.effects.find(row=>row.type==='volley-recoil')?.armCritical.effect.name,'Choc au bras');
  assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
  const applied=applyResolution(preview,{revision:0,participants:[shooter]});
  assert.equal(applied.status,'applied');
  const updated=applied.state.participants.find(row=>row.id==='shooter');
  assert.ok(updated.extensions.v5.criticalWounds.some(row=>row.source==='volley-recoil'&&row.name==='Choc au bras'));
});

test('F2-E — la pénalité de la maladresse 5–6 s’applique une fois à la prochaine Action', () => {
  const actorWithPenalty={...actor,extensions:{v5:{combatEffects:[{id:'fumble-next',kind:'next-action-sl',amount:-1}]}}};
  const preview=previewResolution({actor:actorWithPenalty,action:{type:'test',base:50},roll:40,v5:{kind:'test',context:{isAction:true}},baseRevision:0});
  assert.ok(preview.test.details.modifiers.some(row=>row.id==='fumble:next-action-sl'&&row.amount===-1));
  assert.deepEqual(preview.consumedCombatEffects,['fumble-next']);
  const applied=applyResolution(preview,{revision:0,participants:[actorWithPenalty]});
  assert.equal(applied.status,'applied');
  assert.deepEqual(applied.state.participants[0].extensions.v5.combatEffects,[]);
});

test('F2-E revue — next-action-sl ne doit pas modifier ni consommer une déclaration hors Action', () => {
  const actorWithPenalty={...actor,extensions:{v5:{combatEffects:[{id:'fumble-next',kind:'next-action-sl',amount:-1}]}}};
  const preview=previewResolution({actor:actorWithPenalty,action:{type:'test',base:50},roll:40,v5:{kind:'test',context:{isAction:false}},baseRevision:0});
  assert.equal(preview.test.details.modifiers.some(row=>row.id==='fumble:next-action-sl'),false);
  assert.deepEqual(preview.consumedCombatEffects,[]);
});

test('F2-E revue — next-action-sl ne se consomme qu’au commit de la prochaine Action', () => {
  const actorWithPenalty={...actor,extensions:{v5:{combatEffects:[{id:'fumble-next',kind:'next-action-sl',amount:-1}]}}};
  const nonAction=previewResolution({actor:actorWithPenalty,action:{type:'test',base:50},roll:40,v5:{kind:'test',context:{isAction:false}},baseRevision:0});
  assert.deepEqual(nonAction.consumedCombatEffects,[]);
  const action=previewResolution({actor:actorWithPenalty,action:{type:'test',base:50},roll:40,v5:{kind:'test',context:{isAction:true}},baseRevision:0});
  assert.ok(action.test.details.modifiers.some(row=>row.id==='fumble:next-action-sl'&&row.amount===-1));
  assert.deepEqual(action.consumedCombatEffects,['fumble-next']);
  const applied=applyResolution(action,{revision:0,participants:[actorWithPenalty]});
  assert.deepEqual(applied.state.participants[0].extensions.v5.combatEffects,[]);
});

test('F2-E revue — Oops 7–8 survit au Tour qui l’a créé et expire à la fin du prochain Tour du tireur', () => {
  const store=createStore();
  store.addParticipant({...actor,zone:'active',initiative:20,extensions:{v5:{combatEffects:[]}}});
  store.addParticipant({...target,id:'other',zone:'active',initiative:10});
  store.executeCommand('seed-turn-index',draft=>({...draft,extensions:{...(draft.extensions||{}),v5:{...(draft.extensions?.v5||{}),turnIndex:5}}}));
  store.setRoundTurn(1,'shooter');
  const before=store.getCombat().participants.get('shooter');
  const preview=previewResolution({actor:before,action:{type:'test',attr:'CC',base:40},roll:66,round:1,v5:{kind:'melee',context:{isAction:true,fumbleRoll:8}},v5Clock:{turnIndex:5},baseRevision:0});
  const applied=applyResolution(preview,{revision:0,round:1,participants:[before,{...target,id:'other'}]});
  const pending=applied.state.participants.find(row=>row.id==='shooter').extensions.v5.combatEffects[0];
  assert.equal(pending.kind,'lose-next-action');
  assert.equal(pending.createdTurnIndex,5);
  store.updateParticipant('shooter',{extensions:applied.state.participants[0].extensions});
  store.nextTurn();
  assert.ok(store.getCombat().participants.get('shooter').extensions.v5.combatEffects.some(row=>row.id===pending.id),'transition fin Tour créateur ne consomme pas l’effet');
  store.nextTurn();
  assert.ok(store.getCombat().participants.get('shooter').extensions.v5.combatEffects.some(row=>row.id===pending.id),'la fin du Tour d’un autre participant ne consomme pas l’effet');
  store.nextTurn();
  assert.equal(store.getCombat().participants.get('shooter').extensions.v5.combatEffects.some(row=>row.id===pending.id),false,'fin du prochain Tour du tireur expire l’effet');
});

test('F2-E — cheville tordue pénalise seulement les Tests déclarés avec la jambe atteinte et expire', () => {
  const subject={...actor,extensions:{v5:{combatEffects:[{id:'ankle',kind:'twisted-ankle',location:'jambe-gauche',rounds:2,createdRound:1}]}}};
  const affected=previewResolution({actor:subject,action:{type:'test',base:50},v5:{kind:'test',context:{legUsed:'jambe-gauche'}},roll:40,round:2,baseRevision:0});
  assert.ok(affected.test.details.modifiers.some(row=>row.id==='fumble:twisted-ankle:ankle'&&row.amount===-1));
  const otherLeg=previewResolution({actor:subject,action:{type:'test',base:50},v5:{kind:'test',context:{legUsed:'jambe-droite'}},roll:40,round:2,baseRevision:0});
  assert.equal(otherLeg.test.details.modifiers.some(row=>row.id.startsWith('fumble:twisted-ankle')),false);
  const boundary=previewResolution({actor:subject,action:{type:'test',base:50},v5:{kind:'test',context:{legUsed:'jambe-gauche'}},roll:40,round:3,baseRevision:0});
  assert.equal(boundary.test.details.modifiers.some(row=>row.id.startsWith('fumble:twisted-ankle')),false,'duration 2 started in Round 1 expires at Round 3');
  const expired=previewResolution({actor:subject,action:{type:'test',base:50},v5:{kind:'test',context:{legUsed:'jambe-gauche'}},roll:40,round:4,baseRevision:0});
  assert.equal(expired.test.details.modifiers.some(row=>row.id.startsWith('fumble:twisted-ankle')),false);
});

test('F2-E — les stocks sont débités depuis une déclaration MJ confirmée et le Griffonsfoot consomme six unités au rechargement', () => {
  assert.deepEqual(previewV5BlackpowderResources({projectileCount:6,powderCharges:6,projectilesRequired:6,powderRequired:6}),
    {ready:true,unresolved:[],debits:[{resource:'projectile',amount:6},{resource:'powder-charge',amount:6}]});
  assert.equal(previewV5BlackpowderResources({projectileCount:5,powderCharges:6,projectilesRequired:6,powderRequired:6}).ready,false);
  const shooter={...actor,equipment:[{id:'griffon',name:'Pistolet Griffonsfoot',extensions:{v5:{loadedCharges:0}}}]};
  const normalized={actor:shooter,action:{type:'test',note:'Pistolet Griffonsfoot',extensions:{fiche:{equipmentId:'griffon'}}},resolutionId:'griffon'};
  const missing=previewCombatFailure({normalized,context:{reloading:true,weaponReload:6,blackpowderStockInitial:{confirmed:true,projectiles:6,powderCharges:5}},success:true});
  assert.equal(missing.effects.some(row=>row.type==='griffonsfoot-reload'),false,'only the 6th successful reload Test completes the reload');
  const partial=previewCombatFailure({normalized:{...normalized,actor:{...shooter,equipment:[{...shooter.equipment[0],extensions:{v5:{loadedCharges:0,griffonsfootReloadProgress:5}}}]}},context:{reloading:true,weaponReload:6,blackpowderStockInitial:{confirmed:true,projectiles:6,powderCharges:6}},success:true});
  assert.deepEqual(partial.effects.find(row=>row.type==='blackpowder-stock-change')?.after,{projectiles:0,powderCharges:0});
  assert.equal(partial.effects.find(row=>row.type==='griffonsfoot-reload')?.loadedCharges,6);
  for (const loadedCharges of [undefined,0,1,5]) {
    const partial={...shooter,equipment:[{...shooter.equipment[0],extensions:{v5:{loadedCharges}}}]};
    const result=previewCombatFailure({normalized:{...normalized,actor:partial},context:{firing:true}});
    assert.equal(result.effects.some(row=>row.type==='griffonsfoot-discharge'),false,`loadedCharges=${loadedCharges}`);
    assert.ok(result.unresolved.some(row=>row.includes('six canons doivent être chargés')));
  }
});

test('F2-E revue — le Griffonsfoot requiert six succès de recharge avant le débit atomique des six munitions', () => {
  const weapon={id:'griffon-cycle',name:'Pistolet Griffonsfoot',kind:'weapon',keywords:[{id:'recharge',parameter:'6'}],extensions:{v5:{loadedCharges:0}}};
  let shooter={...actor,equipment:[weapon]},state={revision:0,round:1,participants:[shooter]};
  for(let step=1;step<=6;step++){
    const context={reloading:true,weaponReload:6,...(step===6?{blackpowderStockInitial:{confirmed:true,projectiles:6,powderCharges:6}}:{})};
    const preview=previewResolution({actor:shooter,action:{type:'test',base:50,note:'Pistolet Griffonsfoot',extensions:{fiche:{equipmentId:weapon.id}}},roll:50,round:1,resolutionId:`griffon-reload-${step}`,
      v5:{kind:'test',context},baseRevision:state.revision});
    assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
    if(step<6){assert.equal(preview.combatFailure.effects.some(row=>row.type==='blackpowder-stock-change'),false);assert.equal(preview.combatFailure.effects.some(row=>row.type==='griffonsfoot-reload'),false);}
    const applied=applyResolution(preview,state);assert.equal(applied.status,'applied');state=applied.state;shooter=state.participants[0];
    assert.equal(shooter.equipment[0].extensions.v5.loadedCharges,step===6?6:0);
    assert.equal(shooter.equipment[0].extensions.v5.griffonsfootReloadProgress,step);
  }
  assert.deepEqual({projectiles:shooter.extensions.v5.blackpowderStock.projectiles,powderCharges:shooter.extensions.v5.blackpowderStock.powderCharges},{projectiles:0,powderCharges:0});
  assert.equal(shooter.extensions.v5.blackpowderStock.history.length,1);
});

test('F2-E revue — un second cycle Griffonsfoot repart à zéro après la décharge', () => {
  const weapon={id:'griffon-second-cycle',name:'Pistolet Griffonsfoot',kind:'weapon',extensions:{v5:{loadedCharges:6,griffonsfootReloadProgress:6,griffonsfootReloadRequiredSuccesses:6,griffonsfootReloading:false}}};
  const shooter={...actor,equipment:[weapon],extensions:{v5:{blackpowderStock:{version:1,projectiles:6,powderCharges:6,history:[]}}}},victim={...target,hp:1000};
  const fired=previewResolution({actor:shooter,target:victim,action:{type:'attack',base:50,damage:1,note:'Pistolet Griffonsfoot',extensions:{fiche:{equipmentId:weapon.id}}},roll:30,round:1,
    attackContext:{ranged:true},v5:{kind:'ranged',context:{firing:true}},baseRevision:0});
  const afterFire=applyResolution(fired,{revision:0,round:1,participants:[shooter,victim]});assert.equal(afterFire.status,'applied');
  const reloader=afterFire.state.participants.find(row=>row.id==='shooter');
  const firstSuccess=previewResolution({actor:reloader,action:{type:'test',base:50,note:'Pistolet Griffonsfoot',extensions:{fiche:{equipmentId:weapon.id}}},roll:30,round:1,
    v5:{kind:'test',context:{reloading:true,weaponReload:6}},baseRevision:afterFire.state.revision});
  const afterFirstSuccess=applyResolution(firstSuccess,afterFire.state);assert.equal(afterFirstSuccess.status,'applied');
  const secondCycle=afterFirstSuccess.state.participants.find(row=>row.id==='shooter').equipment[0].extensions.v5;
  assert.deepEqual({afterDischarge:reloader.equipment[0].extensions.v5.griffonsfootReloadProgress,
    afterOneSuccessLoaded:secondCycle.loadedCharges,afterOneSuccessProgress:secondCycle.griffonsfootReloadProgress},{afterDischarge:0,afterOneSuccessLoaded:0,afterOneSuccessProgress:3});
});

test('F2-E revue — Salve convertit chaque tir antérieur du Tour canonique en −1 DR', () => {
  const weapon={id:'salvo-penalty',name:'Arme Salve',kind:'weapon',keywords:[{id:'salve',parameter:'7'}],extensions:{v5:{}}};
  const shooter={...actor,equipment:[weapon]},previous=[1,2].map(n=>({actorId:'shooter',weaponId:weapon.id,kind:'action',actionType:'attack',turnId:'encounter:turn-5:shooter',encounterId:'encounter'}));
  previous.push({actorId:'shooter',weaponId:weapon.id,kind:'action',actionType:'attack',turnId:'encounter:turn-4:shooter',encounterId:'encounter'});
  const preview=previewResolution({actor:shooter,target,action:{type:'attack',base:50,damage:2,note:'Arme Salve',extensions:{fiche:{equipmentId:weapon.id}}},roll:40,round:1,
    attackContext:{ranged:true},v5:{kind:'ranged'},v5Clock:{turnId:'encounter:turn-5:shooter',encounterId:'encounter'},v5State:{participants:[shooter,target],extensions:{v5:{standardTurnActions:previous}}},baseRevision:0});
  assert.equal(preview.test.details.modifiers.find(row=>row.id==='f2-e:salvo')?.amount,-2,'two same-Tour prior shots impose −2 DR; the earlier Tour must not count (L13 p.126; conversion MJ ±10 → ±1 DR)');
});

test('F2-E revue — le profil Salve 7 / Recharge 4 non astérisqué revient à Salve 7 après ses quatre succès', () => {
  const initialized=initialV5ReloadState({keywords:[{id:'salve',parameter:'7'},{id:'recharge',parameter:'4'}]});
  assert.equal(initialized.ready,true,JSON.stringify(initialized));
  let state={...initialized.state,shotsRemaining:0,requiresReload:true};
  const begun=beginV5Reload(state);assert.equal(begun.status,'reloading');state=begun.state;
  for(let index=0;index<4;index++){
    const advanced=advanceV5Reload(state,{success:true,testSl:0});assert.equal(advanced.ready,true);state=advanced.state;
  }
  assert.equal(state.shotsRemaining,7,'non-astérisque Recharge 4 doit remplir le Salvo 7; les Recharges incrémentales sont marquées * (Up in Arms p.123)');
});

test('F2-E revue — le marqueur Recharge* garde le rechargement incrémental par cycle', () => {
  const initialized=initialV5ReloadState({keywords:[{id:'salve',parameter:'9'},{id:'recharge',parameter:'4*'}]});
  assert.equal(initialized.ready,true,JSON.stringify(initialized));
  assert.equal(initialized.state.salvoReloadMode,'incremental');
  let state={...initialized.state,shotsRemaining:0,requiresReload:true};
  for(let cycle=1;cycle<=2;cycle++){
    state=beginV5Reload(state).state;
    for(let index=0;index<4;index++)state=advanceV5Reload(state,{success:true,testSl:0}).state;
    assert.equal(state.shotsRemaining,cycle,'Recharge* restores one Salvo point per completed cycle (L13 p.123)');
  }
});

test('F2-E — délai de bombe calculé depuis le Round d’allumage et mouvement ordinaire interroge une garde dédiée', () => {
  assert.deepEqual(previewV5BombFuse({currentRound:4,currentTurnIndex:11,currentActorId:'shooter',fuseTurns:1,fuseLit:true}),{ready:true,unresolved:[],dueRound:4,dueTurnIndex:11,dueActorId:'shooter',fuseTurnsRemaining:1});
  assert.equal(previewV5BombFuse({currentRound:4,currentTurnIndex:11,fuseTurns:2,fuseLit:false}).ready,false);
  assert.deepEqual(canUseV5Move([]),{ready:true,reason:null});
  assert.equal(canUseV5Move([{kind:'lose-next-move'}]).ready,false);
});

test('F2-E — stock initial confirmé puis débité atomiquement lors du tir', () => {
  const gun={id:'volley-stock',name:'Arquebuse à salve',kind:'weapon',extensions:{v5:{}}};
  const shooter={...actor,equipment:[gun]};
  const preview=previewResolution({actor:shooter,target,action:{type:'attack',note:'Arquebuse à salve',base:45,damage:3,extensions:{fiche:{equipmentId:gun.id}}},roll:30,round:1,
    v5:{kind:'ranged',context:{firing:true,crewCount:2,recoilTestBase:50,recoilTestRoll:50,blackpowderStockInitial:{confirmed:true,projectiles:4,powderCharges:3}}},baseRevision:0});
  assert.deepEqual(preview.combatFailure.effects.find(row=>row.type==='blackpowder-stock-change')?.after,{projectiles:3,powderCharges:2});
  const applied=applyResolution(preview,{revision:0,round:1,participants:[shooter,target]});
  assert.equal(applied.status,'applied');
  const updated=applied.state.participants.find(row=>row.id==='shooter');
  assert.deepEqual({projectiles:updated.extensions.v5.blackpowderStock.projectiles,powderCharges:updated.extensions.v5.blackpowderStock.powderCharges},{projectiles:3,powderCharges:2});
  assert.equal(updated.extensions.v5.blackpowderStock.history.length,1);
});

test('F2-E — une mèche de bombe conserve son Round d’échéance et le mortier applique les dégâts maximums au bras', () => {
  const mortar={id:'mortar',name:'Mortier à main',kind:'weapon',damageMaximum:12,extensions:{v5:{}}},shooter={...actor,equipment:[mortar]};
  const lit=previewResolution({actor:shooter,action:{type:'skill',base:10,note:'Mortier à main',extensions:{fiche:{equipmentId:'mortar'}}},roll:1,round:4,
    v5:{kind:'test',context:{bombPayload:true,reloading:true,bombFuseLit:true,fuseTurns:1,currentRound:4,currentTurnIndex:11}},baseRevision:0});
  assert.equal(lit.combatFailure.effects.find(row=>row.type==='bomb-fuse')?.dueRound,4);
  assert.equal(lit.combatFailure.effects.find(row=>row.type==='bomb-fuse')?.dueTurnIndex,11);
  assert.equal(lit.combatFailure.effects.find(row=>row.type==='bomb-fuse')?.dueActorId,'shooter');
  const appliedFuse=applyResolution(lit,{revision:0,round:4,participants:[shooter]});
  assert.equal(appliedFuse.state.participants[0].equipment[0].extensions.v5.fuseDueRound,4);
  assert.equal(appliedFuse.state.participants[0].equipment[0].extensions.v5.bombFuseOwnerId,'shooter');
  const fumble=previewResolution({actor:shooter,action:{type:'skill',base:20,note:'Mortier à main',extensions:{fiche:{equipmentId:'mortar'}}},roll:66,round:4,
    v5:{kind:'test',context:{fumbleRoll:1,reloading:true,weaponExplosionArmSide:'right'}},baseRevision:0});
  const exploded=applyResolution(fumble,{revision:0,round:4,participants:[shooter]});
  assert.equal(exploded.status,'applied');
  assert.equal(exploded.state.participants[0].hp,2,'12 dégâts maximum moins 3 d’Endurance et 1 Blessure de la table de maladresse');
});

test('F2-E revue — bombe interdite hors mortier et sans rechargement réussi', () => {
  const normalized={actor,action:{type:'skill',note:'Bombe incendiaire'},resolutionId:'bomb-invalid'};
  const common={bombPayload:true,reloading:true,bombFuseLit:true,fuseTurns:1,currentRound:1,currentTurnIndex:1};
  const wrongWeapon=previewCombatFailure({normalized,context:common,success:true});
  assert.equal(wrongWeapon.effects.some(row=>row.type==='bomb-fuse'),false);
  assert.ok(wrongWeapon.unresolved.some(row=>row.includes('mortier à main')));
  const failedReload=previewCombatFailure({normalized:{...normalized,action:{...normalized.action,note:'Mortier à main'}},context:common,success:false});
  assert.equal(failedReload.effects.some(row=>row.type==='bomb-fuse'),false);
  assert.ok(failedReload.unresolved.some(row=>row.includes('rechargement du mortier doit réussir')));
});

test('F2-E — l’Action autonome allume la mèche sans jet ni attaque', () => {
  const weapon={id:'matchlock',name:'Arquebuse à mèche',kind:'weapon',extensions:{v5:{fuseLit:false}}},shooter={...actor,equipment:[weapon]};
  const preview=previewResolution({actor:shooter,action:{type:'skill',base:0,note:'Arquebuse à mèche',extensions:{fiche:{equipmentId:'matchlock'}}},round:1,
    v5:{kind:'test',context:{lightFuseAction:true,isAction:true}},baseRevision:0});
  assert.equal(preview.input.noTestAction,true);
  assert.equal(preview.attack,false);
  assert.ok(preview.combatFailure.effects.some(row=>row.type==='light-fuse'));
  const applied=applyResolution(preview,{revision:0,round:1,participants:[shooter]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants[0].equipment[0].extensions.v5.fuseLit,true);
});

test('F2-E — la détonation échue exige des cibles et dégâts MJ, applique les dégâts atomiquement et clôt l’effet', () => {
  const bomb={id:'mortar',name:'Mortier à main',kind:'weapon',extensions:{v5:{bombFuse:false}}};
  const pending={id:'due-bomb',kind:'bomb-detonation',equipmentId:'mortar',requiresTargetResolution:true};
  const shooter={...actor,equipment:[bomb],extensions:{v5:{combatEffects:[pending]}}};
  const victim={...target,zone:'active',hp:12};
  const v5State={participants:[shooter,victim]};
  const missing=previewResolution({actor:shooter,action:{type:'skill',base:10},v5State,round:2,v5:{kind:'test',context:{bombDetonation:true}},baseRevision:0});
  assert.ok(missing.unresolved.some(row=>row.includes('désigner au moins une cible')));
  const preview=previewResolution({actor:shooter,action:{type:'skill',base:10},v5State,round:2,v5:{kind:'test',context:{bombDetonation:true,bombDamage:8,designatedTargetIds:['target']}},baseRevision:0});
  const applied=applyResolution(preview,{revision:0,round:2,participants:[shooter,victim]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='target').hp,7,'8 dégâts moins 3 d’Endurance');
  assert.equal(applied.state.participants.find(row=>row.id==='shooter').extensions.v5.combatEffects.some(row=>row.id==='due-bomb'),false);
});

test('F2-E revue — une détonation qui touche le porteur ne perd ni dégâts ni clôture du fuse', () => {
  const bomb={id:'mortar',name:'Mortier à main',kind:'weapon',extensions:{v5:{bombFuse:false}}};
  const pending={id:'due-bomb-self',kind:'bomb-detonation',equipmentId:'mortar',requiresTargetResolution:true};
  const bearer={...actor,zone:'active',equipment:[bomb],extensions:{v5:{combatEffects:[pending]}}};
  const v5State={participants:[bearer]};
  const preview=previewResolution({actor:bearer,action:{type:'skill',base:10},v5State,round:2,
    v5:{kind:'test',context:{bombDetonation:true,bombDamage:8,designatedTargetIds:['shooter']}},baseRevision:0});
  const applied=applyResolution(preview,{revision:0,round:2,participants:[bearer]});
  assert.equal(applied.status,'applied');
  const updated=applied.state.participants[0];
  assert.equal(updated.hp,7,'8 MJ-confirmed damage less Toughness Bonus 3');
  assert.equal(updated.extensions.v5.combatEffects.some(row=>row.id==='due-bomb-self'),false,'fuse event closes even when bearer is a target');
});

test('F2-E — la transition du Tour déclenche une bombe échue et le Store bloque le Move perdu', () => {
  const store=createStore();
  store.addParticipant({...actor,zone:'active',initiative:20,extensions:{v5:{combatEffects:[{id:'lost-move',kind:'lose-next-move'}]}},equipment:[{id:'due-bomb',name:'Bombe',kind:'weapon',extensions:{v5:{bombFuse:true,fuseDueTurnIndex:1,fuseDueRound:1}}}]});
  store.setRoundTurn(1,'shooter');
  assert.equal(store.declareV5CombatMovement({actorId:'shooter'}).status,'blocked');
  store.nextTurn();
  const updated=store.getCombat().participants.get('shooter');
  assert.ok(updated.extensions.v5.combatEffects.some(row=>row.kind==='bomb-detonation'&&row.equipmentId==='due-bomb'));
  assert.equal(updated.equipment[0].extensions.v5.bombFuse,false);
});

test('F2-E revue — fuse de deux Tours suit le porteur, persiste, s’annule et se recharge', () => {
  const store=createStore();
  const bomb={id:'owner-bomb',name:'Mortier à main',kind:'weapon',extensions:{v5:{bombFuse:true,bombFuseOwnerId:'shooter',fuseTurnsRemaining:2}}};
  store.addParticipant({...actor,zone:'active',initiative:20,equipment:[bomb]});
  store.addParticipant({...target,id:'other',zone:'active',initiative:10});
  store.setRoundTurn(1,'shooter');
  store.nextTurn();
  assert.equal(store.getCombat().participants.get('shooter').equipment[0].extensions.v5.fuseTurnsRemaining,1,'fin du Tour courant: il reste le prochain Tour du porteur');
  store.nextTurn();
  assert.equal(store.getCombat().participants.get('shooter').extensions.v5.combatEffects?.some(row=>row.kind==='bomb-detonation'),false,'fin du Tour de l’autre participant ne déclenche pas la bombe');
  store.nextTurn();
  const due=store.getCombat().participants.get('shooter');
  assert.ok(due.extensions.v5.combatEffects.some(row=>row.kind==='bomb-detonation'&&row.equipmentId==='owner-bomb'));
  assert.equal(due.equipment[0].extensions.v5.bombFuse,false);
  const saved=store.getFullJSON();
  const restored=createStore();
  restored.loadFromJSON(saved);
  assert.ok(restored.getCombat().participants.get('shooter').extensions.v5.combatEffects.some(row=>row.kind==='bomb-detonation'));
  assert.equal(store.undo(),true);
  assert.equal(store.getCombat().participants.get('shooter').equipment[0].extensions.v5.bombFuse,true,'Undo restaure la mèche et le compte avant la détonation');
});

test('F2-E revue — servant seul recueille le fait de déplacement et bloque le tir', () => {
  const weapon={id:'volley',name:'Arquebuse à salve',extensions:{v5:{}}},shooter={...actor,equipment:[weapon]};
  const normalized={actor:shooter,action:{type:'attack',note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'volley'}}},resolutionId:'moved-servant'};
  const missing=previewCombatFailure({normalized,context:{firing:true,crewCount:1}});
  assert.ok(missing.unresolved.some(row=>row.includes('doit préciser si l’arme a été déplacée')));
  const result=previewCombatFailure({normalized,context:{firing:true,reloading:true,crewCount:1,moved:true,weaponReload:4},success:true});
  assert.ok(result.unresolved.some(row=>row.includes('ne peut pas être déplacée')));
});

test('F2-E revue — l’arquebuse à salve exige un effectif positif explicite', () => {
  const weapon={id:'volley',name:'Arquebuse à salve',extensions:{v5:{reloaded:true}}},shooter={...actor,equipment:[weapon]};
  const normalized={actor:shooter,action:{type:'attack',note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'volley'}}},resolutionId:'crew-count'};
  for(const crewCount of [undefined,0]){
    const result=previewCombatFailure({normalized,context:{firing:true,crewCount,moved:false,blackpowderStockInitial:{confirmed:true,projectiles:2,powderCharges:2},recoilTestBase:50,recoilTestRoll:40}});
    assert.ok(result.unresolved.some(row=>row.includes('nombre de servants positif')));
  }
  for(const crewCount of [1,2,3]){
    const result=previewCombatFailure({normalized,context:{firing:true,crewCount,moved:false,blackpowderStockInitial:{confirmed:true,projectiles:2,powderCharges:2},recoilTestBase:50,recoilTestRoll:40}});
    assert.equal(result.unresolved.some(row=>row.includes('nombre de servants positif')),false,`crewCount=${crewCount} remains supported`);
  }
});

test('F2-E revue — Salve 7 autorise sept tirs et bloque le huitième avant Recharge', () => {
  const weapon={id:'volley',name:'Arquebuse à salve',kind:'weapon',reload:4,keywords:[{id:'salve',parameter:'7'},{id:'recharge',parameter:'4'}],extensions:{v5:{}}};
  let shooter={...actor,equipment:[weapon],extensions:{v5:{blackpowderStock:{version:1,projectiles:7,powderCharges:7,history:[]}}}},victim={...target,hp:1000};
  for(let shot=1;shot<=7;shot++){
    const preview=previewResolution({actor:shooter,target:victim,action:{type:'attack',base:50,damage:3,note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'volley'}}},roll:20,round:1,resolutionId:`salvo-${shot}`,
      v5:{kind:'ranged',context:{firing:true,crewCount:2,moved:false,recoilTestBase:50,recoilTestRoll:40}},attackContext:{ranged:true},baseRevision:shot-1});
    assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
    const applied=applyResolution(preview,{revision:shot-1,round:1,participants:[shooter,victim]});assert.equal(applied.status,'applied',`shot ${shot}: ${JSON.stringify(applied)}`);shooter=applied.state.participants.find(row=>row.id==='shooter');victim=applied.state.participants.find(row=>row.id==='target');
  }
  const blocked=previewResolution({actor:shooter,target:victim,action:{type:'attack',base:50,damage:3,note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'volley'}}},roll:20,resolutionId:'salvo-8',
    v5:{kind:'ranged',context:{firing:true,crewCount:2,moved:false,recoilTestBase:50,recoilTestRoll:40}},attackContext:{ranged:true},baseRevision:7});
  assert.ok(blocked.unresolved.some(row=>row.includes('rechargée')),'the 8th shot is blocked after seven Salvo points');
});

test('F2-E revue — Volley Gun Salvo 7, Recharge 4 sans astérisque remplit le profil après épuisement', () => {
  const weapon={id:'volley',name:'Arquebuse à salve',kind:'weapon',reload:4,keywords:[{id:'salve',parameter:'7'},{id:'recharge',parameter:'4'}],extensions:{v5:{}}};
  let shooter={...actor,equipment:[weapon],extensions:{v5:{blackpowderStock:{version:1,projectiles:8,powderCharges:8,history:[]}}}},victim={...target,hp:1000};
  const revisions=[];
  const run=(preview,state)=>{const applied=applyResolution(preview,state);assert.equal(applied.status,'applied');return applied;};
  const fire=(who,whoTarget,id,revision)=>previewResolution({actor:who,target:whoTarget,action:{type:'attack',base:50,damage:3,note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'volley'}}},roll:20,round:1,resolutionId:id,
    v5:{kind:'ranged',context:{firing:true,crewCount:2,moved:false,recoilTestBase:50,recoilTestRoll:30}},attackContext:{ranged:true},baseRevision:revision});
  let applied;
  for(let shot=1;shot<=7;shot++){
    applied=run(fire(shooter,victim,`volley-shot-${shot}`,shot-1),{revision:shot-1,round:1,participants:[shooter,victim]});shooter=applied.state.participants.find(row=>row.id==='shooter');victim=applied.state.participants.find(row=>row.id==='target');
  }
  revisions.push(shooter.equipment[0].extensions.v5.reloadState.shotsRemaining);
  assert.equal(revisions[0],0,'Salvo 7 reaches empty before this full Recharge');
  for(let i=1;i<=4;i++){
    const preview=previewResolution({actor:shooter,action:{type:'test',base:50,note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'volley'}}},roll:20,round:1,resolutionId:`volley-reload-${i}`,
      v5:{kind:'test',context:{reloading:true,crewCount:2,moved:false,weaponReload:4}},baseRevision:applied.state.revision});
    assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
    applied=run(preview,{revision:applied.state.revision,round:1,participants:applied.state.participants});shooter=applied.state.participants.find(row=>row.id==='shooter');
    if(i<4)assert.equal(shooter.equipment[0].extensions.v5.reloadState.shotsRemaining,0);
  }
  revisions.push(shooter.equipment[0].extensions.v5.reloadState.shotsRemaining);
  const next=fire(shooter,victim,'volley-shot-2',applied.state.revision);assert.equal(next.unresolved.length,0,next.unresolved.join('; '));
  applied=run(next,{revision:applied.state.revision,round:1,participants:applied.state.participants});shooter=applied.state.participants.find(row=>row.id==='shooter');victim=applied.state.participants.find(row=>row.id==='target');
  revisions.push(shooter.equipment[0].extensions.v5.reloadState.shotsRemaining);
  assert.deepEqual(revisions,[0,7,6]);
  assert.deepEqual({projectiles:shooter.extensions.v5.blackpowderStock.projectiles,powderCharges:shooter.extensions.v5.blackpowderStock.powderCharges},{projectiles:0,powderCharges:0});
});

test('F2-E — le mortier à main en maladresse de rechargement exige les dégâts maximums, jamais les dégâts du coup', () => {
  const normalized={actor,action:{type:'test',note:'Mortier à main',damage:4},resolutionId:'mortar-reload'};
  const missing=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:1,reloading:true,weaponDamage:4}});
  assert.ok(missing.unresolved.some(row=>row.includes('dégâts maximums')));
  const noSide=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:1,reloading:true,weaponDamageMaximum:12}});
  assert.ok(noSide.unresolved.some(row=>row.includes('bras directeur')));
  const complete=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:1,reloading:true,weaponDamageMaximum:12,weaponExplosionArmSide:'right'}});
  const explosion=complete.effects.find(row=>row.type==='weapon-explosion');
  assert.equal(explosion.damage,12);
  assert.equal(explosion.damageMode,'maximum');
  assert.equal(explosion.sl,0);
});

test('F2-E — le défenseur qui fait une maladresse reçoit aussi l’effet de table', () => {
  const attacker={id:'attacker',hp:12,caracs:{E:30},states:[]},defender={id:'defender',hp:12,caracs:{E:30},states:[]};
  const preview=previewResolution({actor:attacker,target:defender,action:{type:'attack',base:80,damage:4},roll:30,
    defense:{type:'defense',label:'Esquive',base:40,roll:66,v5:{kind:'test',context:{defenderFumbleRoll:1}}},baseRevision:0});
  assert.equal(preview.combatFailure.defender.outcome.id,'minor-injury');
  assert.equal(preview.combatFailure.effects.find(row=>row.type==='wound-loss')?.targetId,'defender');
});


test('F2-E — l’explosion touche le bras directeur choisi et applique son armure d’inventaire', () => {
  const armour=[
    {id:'left',kind:'armour',name:'Brassard gauche',ap:2,layer:'mail',locations:['leftArm'],keywords:[]},
    {id:'right',kind:'armour',name:'Brassard droit',ap:4,layer:'mail',locations:['rightArm'],keywords:[]}
  ];
  const resolve=side=>{
    const mortar={id:'mortar',name:'Mortier à main',kind:'weapon',category:'Explosif',damageMaximum:12};
    const shooter={...actor,hp:20,equipment:[...armour,mortar]};
    const enemy={id:'enemy',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[]};
    const participants=[shooter,enemy];
    const preview=previewResolution({actor:shooter,target:enemy,action:{type:'attack',attr:'CT',base:20,damage:4,note:'Mortier à main',extensions:{fiche:{equipmentId:'mortar'}}},roll:66,round:1,baseRevision:0,
      v5:{kind:'ranged',context:{fumbleRoll:1,reloading:true,weaponDamageMaximum:12,weaponExplosionArmSide:side}}});
    assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
    return applyResolution(preview,{revision:0,round:1,participants}).state.participants[0].hp;
  };
  assert.equal(resolve('left'),12,'12 dégâts − 3 BE − 2 PA − 1 blessure Oops');
  assert.equal(resolve('right'),14,'12 dégâts − 3 BE − 4 PA − 1 blessure Oops');
});
