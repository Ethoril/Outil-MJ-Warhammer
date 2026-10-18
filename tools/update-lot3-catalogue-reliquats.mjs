import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseReferenceCSV,buildMagicReferences,referenceContentPayload,sha256} from '../js/core/reference-catalog.js';

const read=p=>fs.readFileSync(p,'utf8');
const save=(p,v)=>{fs.mkdirSync(p.substring(0,p.lastIndexOf('/')),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const baseline='tmp/lot3/reliquats-2026-10-17-catalogue-before.json';
if(!fs.existsSync(baseline))save(baseline,JSON.parse(read('js/data/reference-snapshot.json')));
const before=JSON.parse(read(baseline)),current=JSON.parse(read('js/data/reference-snapshot.json')),next=structuredClone(before);
const revision='2026-10-17-catalogue-v5-reliquats';
assert.ok([before.localRevision,revision].includes(current.localRevision),'Un catalogue plus récent ne doit pas être remplacé.');
const names=['Drain de Magie','Blizzard enflammé de Ygethmor','Bannissement Majeur','Pulvérisation Musquée'];
for(const spell of next.magic.spells){
 if(names.includes(spell.nom))spell.desc=spell.desc.replaceAll('Difficile (+0)','Intermédiaire (+0 DR)').replaceAll('Moyen (+2 DR)','Accessible (+2 DR)');
 if(spell.nom==='Apothéose')spell.desc+=' Vous gagnez du Yenlui (Sombre).';
}
const miracle=next.magic.miracles.find(m=>m.nom==='Attaque Rapide');assert.ok(miracle);
miracle.effet=miracle.effet.replaceAll('Difficile (+0)','Intermédiaire (+0 DR)');
const tables={},hashes={},changes=[];
for(const [worksheet,collection,field,column] of [['Magie','spells','desc',6],['Miracles','miracles','effet',4]]){
 const table=parseReferenceCSV(read('js/data/reference-source-csv/'+worksheet+'.csv'));tables[worksheet]=table;
 for(const item of next.magic[collection]){
  const old=before.magic[collection].find(s=>s.nom===item.nom);if(item[field]===old[field])continue;
  const row=table.findIndex((r,i)=>i>0&&r[0]===item.nom);assert.ok(row>0,item.nom);
  assert.ok([old[field],item[field]].includes(table[row][column]),item.nom+' : CSV source ou déjà corrigé');table[row][column]=item[field];
  changes.push({worksheet,row:row+1,column:column+1,cell:String.fromCharCode(65+column)+(row+1),name:item.nom,field,before:old[field],after:item[field]});
 }
 const csv=table.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');
 hashes[worksheet]=createHash('sha256').update(csv).digest('hex');save('js/data/reference-source-csv/'+worksheet+'.csv',csv);
 const source=next.sourceManifest.find(s=>s.worksheet===worksheet);assert.ok(source);source.sha256=hashes[worksheet];source.status='local-v5-mirror';
}
assert.equal(changes.filter(c=>c.worksheet==='Magie').length,5);assert.equal(changes.filter(c=>c.worksheet==='Miracles').length,1);
next.magic.sourceNormalization={...next.magic.sourceNormalization,publicCsvSha256:hashes.Magie,miraclesCsvSha256:hashes.Miracles,status:'local-v5-mirror',date:'2026-10-17'};
next.magic.catalogVersion='sha256:'+await sha256(buildMagicReferences(tables,next.magic));
next.contentVersion='references:'+await sha256(referenceContentPayload(next));next.localRevision=revision;save('js/data/reference-snapshot.json',next);
const versions={before:{contentVersion:before.contentVersion,catalogVersion:before.magic.catalogVersion,localRevision:before.localRevision},after:{contentVersion:next.contentVersion,catalogVersion:next.magic.catalogVersion,localRevision:revision,csvSha256:hashes}};
save('docs/lot3/LOT3_PREUVES_RELIQUATS.json',{date:'2026-10-17',versions,changes,source:'Apothéose : HEPG p.86, Yenlui (Dark) → Sombre. Difficultés V5 : Intermédiaire +0 DR, Accessible +2 DR.'});
const row=c=>'| '+c.worksheet+' | '+c.cell+' | '+c.name+' | '+c.after.replaceAll('|','/').replaceAll('\n','<br>')+' |';
save('docs/lot3/LOT3_A_REPORTER_DANS_LA_FEUILLE_RELIQUATS.md','# Cellules supplémentaires après vérification finale\n\n17 octobre 2026. Delta depuis la correction R2 : **5 cellules de Magie et 1 cellule de Miracles**. Le classeur existant contient seulement Magie et reçoit ses 5 changements. La cellule Apothéose G75 remplace le texte précédent de cette même cellule. Aucun miracle n’est mécanisé.\n\n| Feuille | Cellule | Nom | Nouvelle valeur |\n| --- | --- | --- | --- |\n'+changes.map(row).join('\n')+'\n');
const old=JSON.parse(read('docs/lot3/LOT3_PREUVES_CATALOGUE_RELECTURE_2.json'));
const cumulative=new Map(old.changes.map(c=>['Magie:'+c.cell,{...c,worksheet:'Magie'}]));
for(const c of changes)cumulative.set(c.worksheet+':'+c.cell,{...c,before:cumulative.get(c.worksheet+':'+c.cell)?.before??c.before});
save('docs/lot3/LOT3_A_REPORTER_DANS_LA_FEUILLE_ACTUEL.md','# Report cumulé actuel\n\n17 octobre 2026. À utiliser si les 21 cellules R2 n’ont pas encore été reportées : **25 cellules distinctes de Magie et 1 cellule de Miracles**. Si la R2 a déjà été reportée, utiliser seulement [le delta des reliquats](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELIQUATS.md). Aucun report dans Google Sheets n’est effectué par cet outil.\n\n| Feuille | Cellule | Nom | Nouvelle valeur |\n| --- | --- | --- | --- |\n'+[...cumulative.values()].sort((a,b)=>a.worksheet.localeCompare(b.worksheet)||a.row-b.row||a.column-b.column).map(row).join('\n')+'\n');
console.log(JSON.stringify({changes:changes.map(c=>c.worksheet+'!'+c.cell+' '+c.name),versions,cumulative:cumulative.size}));
