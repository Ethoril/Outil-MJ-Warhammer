import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,existsSync}from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const inventory=Object.values(read('docs/divin/COURROUX_INVENTAIRE.json')).filter(row=>row&&row.id),realisation=read('docs/divin/COURROUX_REALISATION.json');
test('B19 — les 89 entrées du Courroux ont une réalisation, un lot et une preuve existante, ou une exclusion motivée',()=>{
  assert.equal(inventory.length,89);assert.deepEqual(Object.keys(realisation.entries).sort(),inventory.map(row=>row.id).sort());
  for(const[id,row]of Object.entries(realisation.entries)){
    assert.ok(['automatisé','assisté','rappel','exclu'].includes(row.status),id);
    if(row.status==='exclu'){assert.ok(typeof row.reason==='string'&&row.reason.length>10,id);continue;}
    assert.match(row.lot,/^B(0[1-9]|1[0-8])$/,id);assert.ok(existsSync(new URL('../'+row.proof,import.meta.url)),id+' preuve absente : '+row.proof);assert.match(row.commit,/^[0-9a-f]{7}$/,id);
  }
});
test('B19 — la photographie B0 de l’inventaire est conservée (statuts historiques inchangés)',()=>{
  for(const row of inventory)assert.ok(['absent','assisted','engine','reminder'].includes(row.currentStatus),row.id+' '+row.currentStatus);
});
test('B19 — les arbitrages du MJ restent inchangés par la phase (empreinte de présence des décisions Q1–Q12)',()=>{
  const text=readFileSync(new URL('../docs/ARBITRAGES_MJ_21_10.md',import.meta.url),'utf8');for(const q of['Q1-5','Q6','Q7','Q8','Q9','Q10','Q11','Q12'])assert.ok(text.includes(q),q);
});
