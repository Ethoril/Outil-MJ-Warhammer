import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(process.argv.find(a=>a.startsWith('--source-dir='))?.slice(13)||'../ennemi-interieur-wfrp4');
if(process.argv.includes('--equipment-only')){
 const readSource=async path=>readFile(resolve(source,path),'utf8');
 const prior=JSON.parse(await readFile(resolve(root,'js/data/reference-snapshot.json'),'utf8'));
 const equipment=JSON.parse(await readSource('js/data/equipment-catalog.json'));
 const equipmentSource=await readSource('js/fiche/equipment.js');
 const refreshSource=await readSource('tools/refresh-equipment-catalog.mjs');
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const next={...prior,equipment};
 next.sourceFiles={...(prior.sourceFiles||{}),
  'js/fiche/equipment.js':{sha256:hash(equipmentSource)},
  'js/data/equipment-catalog.json':{sha256:hash(await readSource('js/data/equipment-catalog.json'))},
  'tools/refresh-equipment-catalog.mjs':{sha256:hash(refreshSource)}
 };
 const sourceRows=equipment.sources||{};
 next.sourceManifest=(prior.sourceManifest||[]).map(row=>sourceRows[row.worksheet]
  ?{...row,...sourceRows[row.worksheet],status:'local-v5-mirror',fetchedAt:equipment.fetchedAt}
  :row);
 const canonical=(key,value)=>['catalogVersion','contentVersion','version','descriptionSnapshotVersion','fetchedAt','publishedAt'].includes(key)?undefined:value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
 const useful={skills:next.published.skills,talentContract:next.published.talents,
  talents:{entries:next.talents.entries,legacyAliases:next.talents.legacyAliases,specializationTranslations:next.talents.specializationTranslations},
  equipment:{items:next.equipment.items,keywords:next.equipment.keywords},additionalSkills:next.additionalSkills,
  magic:{spells:next.magic.spells,miracles:next.magic.miracles}};
 next.contentVersion='references:'+hash(JSON.stringify(useful,canonical));
 await writeFile(resolve(root,'js/data/shared/fiche/equipment.js'),equipmentSource);
 const helpers=refreshSource.slice(refreshSource.indexOf('const fold ='),refreshSource.indexOf('const sources ='));
 const body=refreshSource.slice(refreshSource.indexOf('const keywordRows ='),refreshSource.indexOf('const catalogVersion =')).replaceAll('await sheet(', 'sheet(');
 const sheet=` const sheet=name=>{const table=tables[name];if(!table)throw new Error('Source absente : '+name);const [headers,...rows]=table;return rows.filter(row=>row[headers.indexOf('Nom')]?.trim()).map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]?.trim()||'']).filter(([key])=>key))) };`;
 const builder='// Generated from fiches/tools/refresh-equipment-catalog.mjs. Regenerate; do not edit.\n'+helpers+'\nexport function buildEquipmentRows(tables) {\n'+sheet+'\n'+body+'\nreturn {items,keywords};\n}\n';
 await writeFile(resolve(root,'js/data/reference-equipment-builder.js'),builder);
 await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(next,null,2)+'\n');
 console.log(JSON.stringify({mode:'equipment-only',contentVersion:next.contentVersion,items:equipment.items.length,keywords:equipment.keywords.length,
  preserved:{magic:next.magic.spells.length,talents:next.talents.entries.length}}));
}else{
const files=['js/fiche/equipment.js','js/fiche/skill-names.js','js/fiche/basic-skills.js','js/catalogue/skill-resolver.js','js/catalogue/talent-resolver.js','js/catalogue/talent-source.js'];
const sourceFiles={};
for(const path of files){const body=await readFile(resolve(source,path),'utf8');const dest=resolve(root,'js/data/shared',path.slice(3));await mkdir(dirname(dest),{recursive:true});await writeFile(dest,body);sourceFiles[path]={sha256:createHash('sha256').update(body).digest('hex')};}
const read=async path=>{const body=await readFile(resolve(source,path),'utf8');sourceFiles[path]={sha256:createHash('sha256').update(body).digest('hex')};return JSON.parse(body)};
const published=await read('js/catalogue/referentiel-public.json');
const talents=await read('js/catalogue/talents-sheet-snapshot.json');
const equipment=await read('js/data/equipment-catalog.json');
const skills=await read('js/data/skills.json');
const magic=await read('js/data/fiche-catalog.json');
const payload={published,talents,equipment,additionalSkills:skills.filter(s=>s.source==='Drive Carrières — Lustria'),magic};
const canonical=(key,value)=>['catalogVersion','contentVersion','version','descriptionSnapshotVersion','fetchedAt','publishedAt'].includes(key)?undefined:value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
const useful={skills:published.skills,talentContract:published.talents,talents:{entries:talents.entries,legacyAliases:talents.legacyAliases,specializationTranslations:talents.specializationTranslations},equipment:{items:equipment.items,keywords:equipment.keywords},additionalSkills:payload.additionalSkills,magic:{spells:magic.spells,miracles:magic.miracles}};
const contentVersion='references:'+createHash('sha256').update(JSON.stringify(useful,canonical)).digest('hex');
const snapshot={schemaVersion:1,contentVersion,fetchedAt:equipment.fetchedAt,sourceFiles,...payload};
await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
const original=await readFile(resolve(source,'tools/refresh-equipment-catalog.mjs'),'utf8');
sourceFiles['tools/refresh-equipment-catalog.mjs']={sha256:createHash('sha256').update(original).digest('hex')};
const helpers=original.slice(original.indexOf('const fold ='),original.indexOf('const sources ='));
const body=original.slice(original.indexOf('const keywordRows ='),original.indexOf('const catalogVersion =')).replaceAll('await sheet(', 'sheet(');
const sheet=` const sheet=name=>{const table=tables[name];if(!table)throw new Error('Source absente : '+name);const [headers,...rows]=table;return rows.filter(row=>row[headers.indexOf('Nom')]?.trim()).map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]?.trim()||'']).filter(([key])=>key))) };`;
await writeFile(resolve(root,'js/data/reference-equipment-builder.js'), '// Generated from fiches/tools/refresh-equipment-catalog.mjs. Regenerate; do not edit.\n'+helpers+'\nexport function buildEquipmentRows(tables) {\n'+sheet+'\n'+body+'\nreturn {items,keywords};\n}\n');
await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({contentVersion,items:equipment.items.length,keywords:equipment.keywords.length,talents:talents.entries.length,skills:published.skills.entries.length}));
}
