import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import snapshot from '../js/data/reference-snapshot.json' with {type:'json'};
import {buildMagicReferences,parseReferenceCSV} from '../js/core/reference-catalog.js';
const removed=['Couronne de Flammes','L’Or des fous','Fauche-démon'];
test('Sorts retirés — catalogue embarqué limité aux 277 entrées actives',()=>{
 assert.equal(snapshot.magic.spells.length,277);
 assert.equal(snapshot.magic.spells.some(s=>s.retired||removed.includes(s.nom)),false);
 for(const name of ['Couronne de Flamme','Or des fous','Fléau des Démons'])assert.ok(snapshot.magic.spells.some(s=>s.nom===name));
});
test('Sorts retirés — une actualisation respecte les suppressions et conserve les alias des sorts actifs',async()=>{
 const entries=await Promise.all(['Magie','Miracles'].map(async name=>{
  const csv=await readFile(new URL('../js/data/reference-source-csv/'+name+'.csv',import.meta.url),'utf8');
  return [name,parseReferenceCSV(csv)];
 }));
 const tables=Object.fromEntries(entries);
 const previous=structuredClone(snapshot.magic);
 previous.spells.find(s=>s.nom==='Couronne de Flamme').aliases=['Alias actif de recette'];
 previous.spells.push(...removed.map(nom=>({nom,type:'Recette',cn:1,desc:'Sort absent de la source',retired:true})));
 const next=buildMagicReferences(tables,previous);
 assert.equal(next.spells.length,277);
 assert.equal(next.spells.some(s=>removed.includes(s.nom)||s.retired),false);
 assert.ok(next.spells.find(s=>s.nom==='Couronne de Flamme').aliases.includes('Alias actif de recette'));
 assert.equal(previous.spells.length,280);
});
test('Sorts retirés — un ancien cache plus récent ne réintroduit pas les entrées supprimées',async()=>{
 const original=globalThis.localStorage,data=structuredClone(snapshot);
 data.fetchedAt='2099-10-09T00:00:00.000Z';data.contentVersion='references:obsolete-fixture';
 data.magic.spells.push(...removed.map(nom=>({nom,type:'Recette',cn:1,desc:'Ancien cache',retired:true})));
 globalThis.localStorage={getItem:()=>JSON.stringify({data,updatedAt:data.fetchedAt})};
 try{
  const refs=await import('../js/core/reference-catalog.js?lot3-removed-cache');
  assert.equal(refs.getReferenceStatus().source,'instantané local (dépôt)');
  assert.equal(refs.getReferenceCatalogue().magic.spells.length,277);
  assert.equal(refs.getReferenceCatalogue().magic.spells.some(s=>removed.includes(s.nom)),false);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
