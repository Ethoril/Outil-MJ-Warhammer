import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { initialV5ReloadState } from '../js/core/v5-reloading.js';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';

const catalogue = getReferenceCatalogue();

test('T2 bis — caractérisation : Ratling À répétition Variable bloque le cycle de chargeur sans arbitrage', () => {
  const weapon = catalogue.items.find(row => row.name === 'Mitrailleuse Ratling Skaven');
  assert.ok(weapon);
  const initial = initialV5ReloadState(weapon);
  assert.equal(initial.ready, false);
  assert.match(initial.unresolved[0], /indices et révision/);
});

test('T2 bis — caractérisation : le catalogue importé perd l’astérisque de la Poivrière', () => {
  const weapon = catalogue.items.find(row => row.name === 'Poivrière');
  assert.ok(weapon);
  const repeater = weapon.keywords.find(row => row.id === 'a-repetition');
  assert.equal(repeater?.parameter, '4');
  assert.equal(repeater?.asterisk, undefined, 'la ligne source porte 4*, l’objet importé l’a perdu');
});

test('T2 bis — caractérisation : aperçu de décharge Hache-fusil ignore les dégâts du profil de tir +9', () => {
  const weapon = { id:'gun-axe', kind:'weapon', name:'Hache-fusil', damage:'+9', keywords:['a-poudre-noire'] };
  const preview = previewCombatFailure({
    normalized: { actor:{id:'shooter',equipment:[weapon]}, action:{type:'attack',damage:5,note:'Hache-fusil'}, resolutionId:'axe-shot-profile' },
    roll:99, fumble:{expanded:false}, context:{weaponName:'Hache-fusil',weaponGroup:'Poudre noire',meleeUse:true,weaponLoaded:true,fumbleRoll:2,powderIncidentRoll:1}
  });
  const discharge = preview.effects.find(effect => effect.reason === 'hache-fusil-chargee');
  assert.ok(discharge);
  assert.equal(discharge.damage, undefined, 'l’effet de décharge ne porte pas le profil de tir +9');
});

test('T2 bis — caractérisation : un effet de maladresse reste en attente après une Action ordinaire', () => {
  const actor={id:'shooter',name:'Tireur',hp:12,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{combatEffects:[{id:'old-fumble',kind:'lose-next-action',createdTurnIndex:1}]}}};
  const preview=previewResolution({actor,action:{type:'attack',base:40,damage:3},roll:20,v5:{kind:'ranged'},baseRevision:0});
  const state={participants:[actor],log:[],revision:0};
  const applied=applyResolution(preview,state);
  assert.deepEqual(applied.state.participants[0].extensions.v5.combatEffects,[{id:'old-fumble',kind:'lose-next-action',createdTurnIndex:1}]);
});
