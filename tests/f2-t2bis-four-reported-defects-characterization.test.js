import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { initialV5ReloadState } from '../js/core/v5-reloading.js';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';

const catalogue = getReferenceCatalogue();

test('T2 bis — caractérisation corrigée : la Ratling devient chargeable après arbitrage de capacité', () => {
  const weapon = catalogue.items.find(row => row.name === 'Mitrailleuse Ratling Skaven');
  assert.ok(weapon);
  assert.equal(initialV5ReloadState(weapon).ready,false);
  const initial = initialV5ReloadState({...weapon,extensions:{v5:{repeaterRating:6}}});
  assert.equal(initial.ready,true);
  assert.equal(initial.state.repeaterRating,6);
});

test('T2 bis — caractérisation corrigée : l’import conserve l’astérisque de la Poivrière', () => {
  const weapon = catalogue.items.find(row => row.name === 'Poivrière');
  assert.ok(weapon);
  const repeater = weapon.keywords.find(row => row.id === 'a-repetition');
  assert.equal(repeater?.parameter, '4');
  assert.equal(repeater?.asterisk, true);
});

test('T2 bis — Poivrière p.103 : main occupée conserve les autres canons et exige une rotation avant le tir suivant',()=>{
  const model=catalogue.items.find(row=>row.name==='Poivrière'),weapon={...structuredClone(model),id:'pepperbox-1'};
  const actor={id:'shooter',name:'Tireur',camp:'pj',hp:12,caracs:{CT:60,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
  const target={id:'foe',name:'Cible',camp:'foe',hp:12,caracs:{E:30},states:[],armor:{},equipment:[]};
  const input={actor,target,action:{type:'attack',attr:'CT',base:60,damage:8,extensions:{fiche:{equipmentId:weapon.id}}},roll:20,attackContext:{ranged:true},v5:{kind:'ranged'}};
  const unspecified=previewResolution(input);assert.ok(unspecified.unresolved.some(row=>/seconde main/.test(row)),'il faut saisir oui ou non');
  const yes=previewResolution({...input,v5:{kind:'ranged',context:{freeHandAvailable:true}}});assert.equal(yes.unresolved.length,0);assert.equal(yes.weaponReload.after.shotsRemaining,3);
  const no=previewResolution({...input,v5:{kind:'ranged',context:{freeHandAvailable:false}}});assert.equal(no.unresolved.length,0,'la main occupée n’interdit pas le tir actuel');assert.equal(no.weaponReload.after.shotsRemaining,3,'les trois autres canons préchargés restent conservés');assert.equal(no.weaponReload.after.requiresReload,false);assert.equal(no.weaponReload.after.requiresManualRotation,true);
  const stateAfterNoHand={...weapon,extensions:{v5:{reloadState:no.weaponReload.after}}},blocked=previewResolution({...input,actor:{...actor,equipment:[stateAfterNoHand]},v5:{kind:'ranged',context:{freeHandAvailable:false}}});assert.ok(blocked.unresolved.some(row=>/préparé manuellement/.test(row)),'un second tir sans rotation manuelle est bloqué');
  const yesAfterNoHand=previewResolution({...input,actor:{...actor,equipment:[stateAfterNoHand]},v5:{kind:'ranged',context:{freeHandAvailable:true}}});assert.equal(yesAfterNoHand.unresolved.length,0);assert.equal(yesAfterNoHand.weaponReload.after.shotsRemaining,2);assert.equal(yesAfterNoHand.weaponReload.after.requiresManualRotation,false);
});

test('T2 bis — caractérisation corrigée : la décharge Hache-fusil porte les dégâts du profil de tir +9', () => {
  const weapon = { id:'gun-axe', kind:'weapon', name:'Hache-fusil', damage:'+9', keywords:['a-poudre-noire'] };
  const preview = previewCombatFailure({
    normalized: { actor:{id:'shooter',equipment:[weapon]}, action:{type:'attack',damage:5,note:'Hache-fusil'}, resolutionId:'axe-shot-profile' },
    roll:99, fumble:{expanded:false}, context:{weaponName:'Hache-fusil',weaponGroup:'Poudre noire',meleeUse:true,weaponLoaded:true,fumbleRoll:2,powderIncidentRoll:1}
  });
  const discharge = preview.effects.find(effect => effect.reason === 'hache-fusil-chargee');
  assert.ok(discharge);
  assert.equal(discharge.damage, 9);
});

test('T2 bis — caractérisation corrigée : un effet transitoire de maladresse est purgé après une Action', () => {
  const actor={id:'shooter',name:'Tireur',hp:12,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{combatEffects:[{id:'old-fumble',kind:'next-action-sl',createdTurnIndex:1}]}}};
  const target={id:'foe',name:'Cible',hp:12,caracs:{E:30},states:[],armor:{}};
  const preview=previewResolution({actor,target,action:{type:'attack',attr:'CT',base:40,damage:3},roll:20,v5:{kind:'ranged'},baseRevision:0});
  assert.equal(preview.status,'preview');
  const state={participants:[actor,target],log:[],revision:0};
  const applied=applyResolution(preview,state);
  assert.deepEqual(applied.state.participants[0].extensions.v5.combatEffects,[]);
});
