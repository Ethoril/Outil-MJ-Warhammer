import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';

const catalogue = getReferenceCatalogue();
const actor = { id:'shooter', name:'Tireur', camp:'pj', hp:20, caracs:{CT:60,E:30}, states:[], skills:[], equipment:[], extensions:{v5:{}} };

test('T2 bis reprise — Mortier de main (2M): accident au rechargement = profil à +0 DR au bras principal', () => {
  const weapon = catalogue.items.find(row => row.name === 'Mortier de main (2M)');
  assert.ok(weapon);
  const preview = previewCombatFailure({
    normalized:{actor:{...actor,equipment:[weapon]},action:{type:'test',note:weapon.name,damage:weapon.damage,extensions:{fiche:{equipmentId:weapon.id}}}},
    fumble:{expanded:false},roll:99,
    context:{weaponName:weapon.name,weaponGroup:weapon.category,reloading:true,fumbleRoll:1,powderIncidentRoll:1,weaponExplosionArmSide:'right'}
  });
  assert.deepEqual(preview.unresolved,[]);
  const explosion=preview.effects.find(effect=>effect.reason==='maladresse-au-rechargement-du-mortier-a-main');
  assert.ok(explosion);
  assert.equal(explosion.damageMode,'profile-at-zero-sl');
  assert.equal(explosion.damage,7);
  assert.equal(explosion.location,'bras-principal');
  assert.equal(explosion.sl,0);
});

test('T2 bis reprise — Salve lignes 8–9 avec zéro coup restant se résout et détruit la pièce', () => {
  for (const roll of [8,9]) {
    const weapon={id:'salvo',name:'Salve sans nom canonique',kind:'weapon',category:'Ingénierie',damage:4,keywords:[{id:'salve',parameter:'4'},{id:'a-poudre-noire'}]};
    const preview=previewCombatFailure({normalized:{actor:{...actor,equipment:[weapon]},action:{type:'attack',note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}}},v5State:{participants:[{id:'shooter',zone:'active'}]}},roll:99,
      context:{weaponName:weapon.name,weaponGroup:'Ingénierie',powderIncidentRoll:1,salvoIncidentRoll:roll,remainingSalvo:0}});
    assert.deepEqual(preview.unresolved,[],`d10 Salve ${roll}`);
    assert.ok(preview.effects.some(effect=>effect.type==='salvo-artillery-destroyed'),`d10 Salve ${roll}`);
  }
});

test('T2 bis reprise — Salve ligne 10 avec zéro coup restant se résout sans trajectoire', () => {
  const weapon={id:'salvo',name:'Salve sans nom canonique',kind:'weapon',category:'Ingénierie',damage:4,keywords:[{id:'salve',parameter:'4'},{id:'a-poudre-noire'}]};
  const preview=previewCombatFailure({normalized:{actor:{...actor,equipment:[weapon]},action:{type:'attack',note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}}},v5State:{participants:[{id:'shooter',zone:'active'}]}},roll:99,
    context:{weaponName:weapon.name,weaponGroup:'Ingénierie',powderIncidentRoll:1,salvoIncidentRoll:10,remainingSalvo:0}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.effects.filter(effect=>effect.type==='salvo-hit').length,0);
});

test('T2 bis reprise — catastrophe générique détruit aussi l’arme qui explose', () => {
  const weapon={id:'gun-1',name:'Pistolet de test',kind:'weapon',category:'Poudre noire',damage:4,keywords:[{id:'a-poudre-noire'}]};
  const shooter={...actor,equipment:[weapon]};
  const target={id:'foe',camp:'enemy',hp:20,caracs:{E:30},states:[],equipment:[]};
  const preview=previewResolution({actor:shooter,target,action:{type:'attack',attr:'CT',base:40,damage:4,note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}},qualities:['a-poudre-noire']},roll:99,v5:{kind:'ranged',context:{powderIncidentRoll:9,weaponExplosionArmSide:'right'}},baseRevision:0});
  const applied=applyResolution(preview,{revision:0,participants:[shooter,target]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants[0].equipment[0].extensions.v5.destroyed,true);
});

test('T2 bis reprise — esquive V5 de la ligne 10 réussit automatiquement sur 01–05', () => {
  const weapon={id:'salvo',name:'Salve sans nom canonique',kind:'weapon',category:'Ingénierie',damage:4,keywords:[{id:'salve',parameter:'4'},{id:'a-poudre-noire'}]};
  const victim={id:'victim',name:'Cible',zone:'active',hp:20,caracs:{E:30},states:[]};
  const makePreview=roll=>previewCombatFailure({normalized:{actor:{...actor,equipment:[weapon]},action:{type:'attack',note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}}},v5State:{participants:[{id:'shooter',zone:'active'},victim]}},roll:99,
    context:{weaponName:weapon.name,weaponGroup:'Ingénierie',powderIncidentRoll:1,salvoIncidentRoll:10,remainingSalvo:1,
      salvoTrajectories:[{direction:'nord',distanceRoll:20,personsConfirmed:true,targets:[{participantId:'victim',location:'body',dodge:{base:10,roll}}]}]}});
  const autoSuccess=makePreview(5),ordinaryFailure=makePreview(6);
  assert.deepEqual(autoSuccess.unresolved,[]);
  assert.equal(autoSuccess.effects.some(effect=>effect.type==='salvo-hit'),false);
  assert.equal(ordinaryFailure.effects.some(effect=>effect.type==='salvo-hit'),true);
});

test('T2 bis reprise — Poivrière main occupée tire puis requiert une recharge complète', () => {
  const weapon={...structuredClone(catalogue.items.find(row=>row.name==='Poivrière')),id:'pepperbox-1'};
  const shooter={...actor,equipment:[weapon]};
  const target={id:'foe',name:'Cible',camp:'enemy',hp:20,caracs:{E:30},states:[],armor:{},equipment:[]};
  const preview=previewResolution({actor:shooter,target,action:{type:'attack',attr:'CT',base:60,damage:8,extensions:{fiche:{equipmentId:weapon.id}}},roll:20,attackContext:{ranged:true},v5:{kind:'ranged',context:{freeHandAvailable:false}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.weaponReload.after.requiresReload,true);
  assert.equal(preview.weaponReload.after.requiresManualRotation,false);
  assert.equal(preview.weaponReload.after.shotsRemaining,0);
});

test('T2 bis reprise — un critical-follow-up est consommé par l’Action suivante', () => {
  const shooter={...actor,extensions:{v5:{combatEffects:[{id:'critical-follow-up-1',kind:'critical-follow-up',location:'ARM',reminders:['finir le suivi']}]}}};
  const target={id:'foe',name:'Cible',camp:'enemy',hp:20,caracs:{E:30},states:[],armor:{},equipment:[]};
  const preview=previewResolution({actor:shooter,target,action:{type:'attack',attr:'CC',base:60,damage:4},roll:20,defense:{type:'skill',attr:'CC',base:40,roll:50,label:'Corps à corps',v5:{kind:'melee',context:{}}},v5:{kind:'melee'},baseRevision:0});
  assert.deepEqual(preview.consumedCombatEffects,['critical-follow-up-1']);
  const applied=applyResolution(preview,{revision:0,participants:[shooter,target]});
  assert.deepEqual(applied.state.participants[0].extensions.v5.combatEffects,[]);
});

test('T2 bis reprise — le Test opposé du filet conserve une Force publiée de 8', () => {
  const victim={...actor,id:'victim',states:[{id:'net-condition',key:'enchevetre',level:1,strength:3,source:{authorId:'holder',entanglementKind:'wielder'}}]};
  const holder={id:'holder',caracs:{F:8},states:[],extensions:{v5:{}}};
  const preview=previewResolution({actor:victim,action:{type:'test',attr:'F',base:40},roll:20,v5:{kind:'test',context:{netEscapeConditionId:'net-condition',netEscapeOpponentRoll:20}},v5State:{participants:[victim,holder]},baseRevision:0});
  assert.equal(preview.netEscape.opposition.sourceScore,8);
});

test('T2 bis reprise — un choix d’empoignade orphelin bloque la résolution ordinaire', () => {
  const shooter={...actor};
  const target={id:'foe',name:'Cible',camp:'enemy',hp:20,caracs:{E:30},states:[],armor:{},equipment:[]};
  const preview=previewResolution({actor:shooter,target,action:{type:'attack',attr:'CC',base:60,damage:4},roll:20,
    defense:{type:'skill',attr:'CC',base:40,roll:50,label:'Corps à corps',v5:{kind:'melee',context:{}}},
    v5:{kind:'melee',context:{grappleAction:'break-free'}},baseRevision:0});
  assert.ok(preview.unresolved.some(row=>/lien actif requis/.test(row)));
});
