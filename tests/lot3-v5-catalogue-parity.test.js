import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import snapshot from '../js/data/reference-snapshot.json' with {type:'json'};
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeCatalogueParameter as norm} from './helpers/catalogue-v5-comparison.js';
import {parseReferenceCSV,buildMagicReferences,referenceContentPayload,sha256,refreshReferences,getReferenceSnapshot} from '../js/core/reference-catalog.js';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Catalogue V5 — 277 identités : NI, portée, cible et durée correspondent aux contrats exécutés',()=>{
 assert.equal(snapshot.magic.spells.length,277);
 for(const s of snapshot.magic.spells){const c=getSpellContract(s.nom);assert.ok(c,s.nom);assert.equal(s.cn,c.cn,s.nom+' NI');for(const [field,key] of [['portee','range'],['cible','target'],['duree','duration']])assert.equal(norm(s[field]),norm(c[key]),s.nom+' '+field);}
});
test('Catalogue V5 — les tolérances ne masquent ni Bonus/caractéristique, ni unités, ni maximum',()=>{
 assert.equal(norm('(Moitié de Force Mentale) mètres'),norm('½ FM mètres'));
 assert.equal(norm('Zone d’effet (Bonus de Volonté mètres)'),norm('ZdE Bonus de Force Mentale mètres'));
 for(const [a,b] of [['Force Mentale mètres','Bonus de Force Mentale mètres'],['Bonus d’Initiative minutes','Initiative minutes'],['Force Mentale mètres','Force Mentale yards'],['1','1 maximum'],['2 × Bonus de Force Mentale mètres','Bonus de Force Mentale mètres']])assert.notEqual(norm(a),norm(b));
});
test('Catalogue V5 — CSV, empreinte et versions fonctionnelles concordent',async()=>{
 const csv=await read('js/data/reference-source-csv/Magie.csv'),miracles=await read('js/data/reference-source-csv/Miracles.csv');
 const rebuilt=buildMagicReferences({Magie:parseReferenceCSV(csv),Miracles:parseReferenceCSV(miracles)},snapshot.magic);
 assert.deepEqual(rebuilt.spells,snapshot.magic.spells);assert.deepEqual(rebuilt.miracles,snapshot.magic.miracles);
 assert.equal(snapshot.magic.catalogVersion,'sha256:'+await sha256(rebuilt));
 assert.equal(snapshot.contentVersion,'references:'+await sha256(referenceContentPayload(snapshot)));
 assert.equal(snapshot.magic.sourceNormalization.publicCsvSha256,createHash('sha256').update(csv).digest('hex'));
});
test('Catalogue V5 — refresh de toutes les feuilles du miroir garde la même version',async()=>{
 const before=getReferenceSnapshot().contentVersion;
 const fetchImpl=async url=>({ok:true,text:()=>read('js/data/reference-source-csv/'+new URL(url).searchParams.get('sheet')+'.csv')});
 const result=await refreshReferences({fetchImpl,storage:null});assert.equal(result.ok,true,result.status.error);assert.equal(getReferenceSnapshot().contentVersion,before);
});
test('Catalogue V5 — ancien cache, même daté de 2099, remplacé par la nouvelle révision locale',async()=>{
 const stale=structuredClone(snapshot);stale.localRevision='2026-10-11';stale.fetchedAt='2099-10-13';stale.magic.spells.find(s=>s.nom==='Cautérisation').cn=4;
 const previous=globalThis.localStorage;globalThis.localStorage={getItem:()=>JSON.stringify({data:stale,updatedAt:stale.fetchedAt})};
 try{const refs=await import('../js/core/reference-catalog.js?catalogue-v5-stale');assert.equal(refs.getReferenceSnapshot().localRevision,snapshot.localRevision);assert.equal(refs.getReferenceCatalogue().magic.spells.find(s=>s.nom==='Cautérisation').cn,2);}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});
test('Catalogue V5 — sources V5 pp.248–254 et HEPG p.86 : descriptions des corrections majeures',()=>{
 const text=n=>snapshot.magic.spells.find(s=>s.nom===n).desc;
 assert.doesNotMatch(text('Cautérisation'),/1d10|Inconscient/);assert.match(text('Cautérisation'),/Résistance/);
 assert.match(text('Lumière aveuglante'),/3 Aveuglé/);assert.match(text('Robe scintillante'),/\+2 PA/);assert.doesNotMatch(text('Robe scintillante'),/9\+/);
 assert.match(text('Transmutation de Chamon'),/\+9.*BE.*PA/);assert.match(text('Creuset de Chamon'),/\+6.*PA.*BE/);
 assert.match(text('Coruscation de Finreir'),/arrondi supérieur/);assert.match(text('Miasme mystifiant'),/Perception/);assert.doesNotMatch(text('Miasme mystifiant'),/Initiative|dissip/);
 assert.match(text('Cœurs Enflammés'),/Frénésie/);assert.doesNotMatch(text('Cœurs Enflammés'),/Entraîné|Sans Peur|Cœur Vaillant/);
});
test('Catalogue V5 — preuves finales, 12 anomalies résolues et trois clauses de talents clôturées avec limites explicites',async()=>{
 const t=JSON.parse(await read('docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json'));assert.equal(t.newAnomalies.length,12);for(const i of t.newAnomalies)assert.ok(i.resolution?.proof,i.id);
 assert.equal(t.talentClauses.find(c=>c.talentId==='talent-lileath-s-blessing'&&c.clauseId==='magic:0').status,'conforme');
 assert.equal(t.talentClauses.filter(c=>c.status==='non vérifié').length,0);const closed=t.talentClauses.filter(c=>c.closure);assert.equal(closed.length,3);for(const c of closed){assert.equal(c.auditBeforeClosure.status,'non vérifié');assert.ok(c.closure.executed&&c.closure.tested);assert.ok(c.notVerified.length>40,c.name);}assert.equal(closed.filter(c=>c.status==='donnée MJ nécessaire').length,2);assert.equal(closed.filter(c=>c.status==='conforme').length,1);
 for(const lot of [1,2,3,4]){const e=JSON.parse(await read('docs/lot3/LOT3_PREUVES_CONTRATS_LOT'+lot+'.json'));for(const row of e.rows||e.scenarios||[])assert.ok(['conforme','donnée MJ nécessaire','rappel'].includes(row.status),row.id);}
});
