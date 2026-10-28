import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';
import { previewResolution } from '../js/core/resolution.js';

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
  assert.equal(explosion.damage,4);
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
