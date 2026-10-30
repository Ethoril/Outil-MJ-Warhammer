import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import contracts from '../js/data/v5-spell-contracts.json' with {type:'json'};
import {getAllSpellContracts,getSpellContract} from '../js/core/v5-spell-contracts.js';

// Caractérisation de la phase D : les 277 contrats issus de l'audit ne changent jamais, quels que soient les sorts de traditions ajoutés.
const base=contracts.filter(c=>!c.isTradition);
test('Phase D — les 277 contrats d’audit sont inchangés (empreinte)',()=>{
 assert.equal(base.length,277);
 assert.equal(createHash('sha256').update(JSON.stringify(base)).digest('hex'),'108074f1dce39883c348114295116d77d440ba4ce130b6d3f90854f6f57e2006');
});
test('Phase D — ids et noms uniques sur tout le catalogue de contrats',()=>{
 const all=getAllSpellContracts();
 assert.equal(new Set(all.map(c=>c.id)).size,all.length);
 const names=all.map(c=>c.name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase());
 assert.equal(new Set(names).size,names.length);
});
test('Phase D — chaque contrat de tradition est marqué, sans ligne d’audit, avec empreinte recalculable',()=>{
 for(const c of contracts.filter(c=>c.isTradition)){
  assert.match(c.id,/^spell-tradition-/);
  assert.equal(c.row,null);
  const payload=JSON.stringify({canonicalName:c.canonicalName,page:c.page,cn:c.cn,range:c.range,target:c.target,duration:c.duration});
  assert.equal(c.sourceFingerprint,'sha256:'+createHash('sha256').update(payload).digest('hex'),c.name);
  assert.equal(getSpellContract(c.name)?.id,c.id);
  assert.equal(getSpellContract(c.canonicalName)?.id,c.id);
 }
});
