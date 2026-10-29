import test from 'node:test';
import assert from 'node:assert/strict';
import L22 from '../js/data/bestiary/L22.json' with { type: 'json' };
import { previewResolution } from '../js/core/resolution.js';
import { previewSupplementalEquipment } from '../js/core/v5-supplemental-equipment.js';

// Dernière contre-revue F (29/10) : critique d'excédent, Warp Blade en mêlée seulement, score de Résistance au-delà de 100.
const shardAttack=()=>{const shard=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker').attacks.find(row=>row.name==='Warpstone Shard*');return {type:'attack',name:shard.name,base:80,damage:10,qualities:[]};};
const bonebreaker={id:'bonebreaker',caracs:{CC:80,F:60},skills:[{name:'Melee (Basic)',total:80}],equipment:[],states:[]};

test('F final review: an excess-wounds Critical from the Warpstone Shard causes Minor Exposure (L22 p.32)', () => {
  const target={id:'victim',hp:3,maxHp:12,caracs:{E:30},equipment:[],states:[]};
  const preview=previewResolution({actor:bonebreaker,target,action:shardAttack(),v5:{kind:'melee'},roll:31,baseRevision:1});
  assert.ok(preview.critical?.second,'the hit goes below 0 Wounds');
  assert.equal(preview.critical?.details ?? null,null,'no doubles Critical on 31');
  assert.equal(preview.supplementalEquipment?.exposure?.status,'needs-corruption-test');
});

test('F final review: the same hit on a healthy target causes no exposure', () => {
  const target={id:'victim',hp:100,maxHp:100,caracs:{E:30},equipment:[],states:[]};
  const preview=previewResolution({actor:bonebreaker,target,action:shardAttack(),v5:{kind:'melee'},roll:31,baseRevision:1});
  assert.equal(preview.supplementalEquipment?.exposure ?? null,null);
});

test('F final review: a ranged Warp Blade discharge asks for no Endurance test (L11 p.94, melee strikes only)', () => {
  const result=previewSupplementalEquipment({item:{name:'Warp Blade'},actor:{id:'warlock'},target:{id:'victim'},hit:true,damage:{finalDamage:5},context:{},melee:false});
  assert.deepEqual(result.unresolved,[]);
  assert.equal(result.effects.some(row=>row.state==='Sonné'),false);
  const melee=previewSupplementalEquipment({item:{name:'Warp Blade'},actor:{id:'warlock'},target:{id:'victim'},hit:true,damage:{finalDamage:5},context:{},melee:true});
  assert.equal(melee.unresolved.length,1,'the melee strike still asks for the test');
});

test('F final review: an Endurance score above 100 is a legal V5 score', () => {
  const result=previewSupplementalEquipment({item:{name:'Warp Blade'},actor:{id:'warlock'},target:{id:'victim'},hit:true,damage:{finalDamage:5},context:{warpBladeEnduranceTest:{score:110,roll:95}}});
  assert.deepEqual(result.unresolved,[]);
  assert.ok(result.reminders.some(row=>/Test de Résistance V5 réussi/.test(row)));
});
