import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDivineExecution} from '../js/core/v5-divine-engine.js';
import registry from '../js/data/v5-divine-contracts.json' with {type:'json'};

// Photographie avant Q12, isolée et commitée avant tout changement du moteur.
const contract=registry.contracts.find(row=>row.id==='divine:blessing:myrmidia:battle');
const priest=sin=>({id:'priest',caracs:{Soc:60},skills:[{name:'Prière',status:'resolved',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin}}}});
for(const [sin,roll,reason] of [[0,20,'sin-threshold'],[0,99,'fumble'],[1,21,'sin-threshold'],[1,99,'fumble']]){
 test(`B01 caractérisation initiale — Péché ${sin}, jet ${roll}`,()=>{
  const actor=priest(sin);
  const result=previewDivineExecution(actor,contract,[actor],{canSpeak:true,roll,
   sourceFingerprint:registry.sourceFingerprint,facts:{targets:{priest:{withinRange:true,ally:true}}}});
  assert.equal(result.status,'needs-wrath-resolution');
  assert.equal(result.preview.wrath.triggered,true);
  assert.equal(result.preview.wrath.reason,reason);
  assert.equal(result.preview.wrath.sinAtTest,sin);
 });
}
