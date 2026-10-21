import test from 'node:test';
import assert from 'node:assert/strict';
import {TRADITION_SPELLS} from '../tools/v5-tradition-spell-contracts.mjs';
import contracts from '../js/data/v5-spell-contracts.json' with {type:'json'};
import {getAllSpellContracts} from '../js/core/v5-spell-contracts.js';

test('Phase D — le registre des traditions est cohérent et intégralement généré dans les contrats',()=>{
 const slugs=TRADITION_SPELLS.map(t=>t.slug);
 assert.equal(new Set(slugs).size,slugs.length);
 for(const t of TRADITION_SPELLS){
  for(const key of ['slug','name','canonicalName','book','page','domain','type','edition','range','target','duration','description','effects'])assert.ok(t[key]!==undefined&&t[key]!==null&&t[key]!=='',t.slug+' : '+key);
  assert.ok(Number.isInteger(t.cn)&&t.cn>=0,t.slug+' : NI');
  assert.ok(t.effects.type,t.slug+' : type d’effet');
 }
 const generated=contracts.filter(c=>c.isTradition);
 assert.deepEqual(generated.map(c=>c.id),TRADITION_SPELLS.map(t=>'spell-tradition-'+t.slug));
});
test('Phase D — le catalogue public garde ses 277 identités, les traditions s’y ajoutent',()=>{
 const all=getAllSpellContracts();
 assert.equal(all.filter(c=>!c.isTradition).length,277);
 assert.equal(all.length,277+TRADITION_SPELLS.length);
});
