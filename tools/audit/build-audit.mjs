/** F0 data/selector checks. No game modules are imported or changed. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const statuses=['automatise','assiste','rappel','absent','hors-granularite'];
const mechanics=['test','modifier','state','damage','resource','duration','table','procedure','option'];
const text=(v)=>typeof v==='string'&&v.trim().length>0;
function localPath(root,path) {
  if(!text(path)||isAbsolute(path)||/^[A-Za-z]:/.test(path))throw Error('Preuve locale relative requise');
  const target=resolve(root,path),rel=relative(root,target);
  if(rel.startsWith('..')||isAbsolute(rel)||!existsSync(target))throw Error('Preuve locale inexistante ou hors checkout : '+path);
  return target;
}
function hasId(value,id) {
  if(!value||typeof value!=='object')return false;
  return value.id===id||Object.values(value).some(v=>hasId(v,id));
}
export function validateAudit(rows,root) {
  if(!Array.isArray(rows))throw Error('Registre attendu : tableau');
  const seen=new Set(),cache=new Map();
  const read=path=>{const target=localPath(root,path);if(!cache.has(target))cache.set(target,readFileSync(target,'utf8'));return cache.get(target);};
  for(const row of rows) {
    if(!/^F-L\d{2}-\d{4}$/.test(row.id)||row.id.slice(2,5)!==row.book)throw Error('Identifiant de règle invalide');
    if(seen.has(row.id))throw Error('Identifiant en doublon : '+row.id);seen.add(row.id);
    if(!/^L(?:0[1-9]|1\d|2[0-6])$/.test(row.book)||!Number.isInteger(row.page)||row.page<1)throw Error('Source invalide : '+row.id);
    for(const key of ['chapter','title','titleFr','summary','domain','notes'])if(!text(row[key]))throw Error(key+' vide : '+row.id);
    if([...row.summary].length>300)throw Error('Résumé au-delà de 300 caractères : '+row.id);
    if(!statuses.includes(row.status))throw Error('Statut inconnu : '+row.id);
    if(!mechanics.includes(row.mechanic))throw Error('Type mécanique inconnu : '+row.id);
    if(row.v5Proposal!==null&&!text(row.v5Proposal))throw Error('Conversion invalide : '+row.id);
    if(row.terminologyFr!==undefined&&!Array.isArray(row.terminologyFr))throw Error('Terminologie française invalide : '+row.id);
    const frenchSources=[...(row.nameFrSource?[row.nameFrSource]:[]),...(row.terminologyFr||[])];
    if(frenchSources.length){
      const book=JSON.parse(read('docs/divin/DIVIN_CORPUS_LIVRES.json')).books.find(item=>item.id==='L05');
      for(const source of frenchSources)if(!source||source.book!=='L05'||!Number.isInteger(source.page)||source.page<1||source.physicalPage!==source.page+2||source.physicalPage>book.physicalPages||source.pdfSha256!==book.sha256||!text(source.label)||!text(source.scope))throw Error('Source du nom français invalide : '+row.id);
    }
    if(row.selectorEligible===false&&(!row.coveredBy||!text(row.selectorExclusionReason)))throw Error('Exclusion de sélecteur sans renvoi et raison : '+row.id);
    if(!Array.isArray(row.toolRef))throw Error('Preuves attendues : tableau');
    if(['automatise','assiste','rappel'].includes(row.status)&&!row.toolRef.length)throw Error('Couverture sans preuve : '+row.id);
    for(const ref of row.toolRef) {
      const [path,symbol,...extra]=String(ref).split('#');
      if(!symbol||extra.length)throw Error('Symbole de preuve requis : '+ref);
      const source=read(path);
      if(!source.includes(symbol))throw Error('Symbole de preuve introuvable : '+ref);
    }
    if(row.coveredBy!==null) {
      const [path,id,...extra]=String(row.coveredBy).split('#');
      if(!id||extra.length||!hasId(JSON.parse(read(path)),id))throw Error('coveredBy introuvable : '+row.coveredBy);
    }
  }
  return true;
}
export function buildSelectors(rows) {
  return rows.filter(row=>['absent','rappel'].includes(row.status)&&row.selectorEligible!==false).map(row=>({id:row.id,phase:row.domain,lot:row.book,source:row.book+' p.'+row.page,question:'Implanter « '+row.titleFr+' » ? '+row.summary,choix:'Implanter, version complète',alternatives:['Implanter, version adaptée (préciser)','Ne pas implanter'],statut:'ouvert'}));
}
export function buildSummary(rows,books) {
  const counts=list=>statuses.map(status=>list.filter(r=>r.status===status).length).join(' | ');
  const lines=['# Audit des règles — Phase F0','', '**Registre documentaire F0.** Les nombres décrivent les seules règles effectivement recensées. Ils ne certifient pas à eux seuls la lecture d’un livre. L05 sert aux noms français seulement et ne crée pas de règle supplémentaire. Voir `plans-gpt/RAPPORT_GPT_PHASE_F.md`.','', 'L’audit de couverture est statique : une référence moteur ne vaut pas recette à la table. Les domaines déjà inventoriés utilisent `coveredBy` sans recopier leur contenu. Chaque lacune jouable recensée possède un sélecteur ; aucune implantation n’est autorisée.','', '## Par livre','', '| Livre | Entrées | automatise | assiste | rappel | absent | hors-granularite |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for(const book of books){const list=rows.filter(r=>r.book===book.id);lines.push('| '+book.id+' — '+book.file+' | '+list.length+' | '+counts(list)+' |');}
  const named=rows.filter(row=>row.nameFrSource),termed=rows.filter(row=>row.terminologyFr?.length);
  if(named.length||termed.length)lines.push('','L05 — noms français seulement : '+named.length+' entrées avec nom sourcé et '+termed.length+' avec termes français rattachés. Les mécaniques restent celles de leur livre source.');
  lines.push('','## Par domaine','','| Domaine | Entrées | automatise | assiste | rappel | absent | hors-granularite |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  const domains=[...new Set(rows.map(r=>r.domain))].sort();
  for(const domain of domains){const list=rows.filter(r=>r.domain===domain);lines.push('| '+domain+' | '+list.length+' | '+counts(list)+' |');}
  lines.push('','## Lacunes jouables, par domaine','');
  for(const domain of domains){const list=rows.filter(r=>r.domain===domain&&['absent','rappel'].includes(r.status));if(!list.length)continue;lines.push('### '+domain,'');for(const row of list){const french=row.nameFrSource?[row.nameFrSource]:(row.terminologyFr||[]);lines.push('- **'+row.id+' — '+row.titleFr+'** ('+row.book+' p.'+row.page+', '+row.status+') : '+row.summary+' '+row.notes+(row.selectorEligible===false?' Déjà porté par l’inventaire référencé : '+row.selectorExclusionReason:'')+(french.length?' Nom/termes FR : '+french.map(source=>source.label+' (L05 p.'+source.page+')').join(', ')+'.':''));}lines.push('');}
  return lines.join('\n').trimEnd()+'\n';
}
const root=resolve(import.meta.dirname,'../..');
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(resolve(process.cwd())!==root)throw Error('Exécuter depuis le checkout de l’audit');
  const rows=JSON.parse(readFileSync(join(root,'docs/AUDIT_REGLES.json'),'utf8'));validateAudit(rows,root);
  const books=['DIVIN_CORPUS_LIVRES.json','DIVIN_CORPUS_LIVRES_COMPLEMENT.json'].flatMap(file=>JSON.parse(readFileSync(join(root,'docs/divin',file),'utf8')).books);
  const outputs=[['docs/plans-gpt/SELECTEURS_PHASE_F.json',JSON.stringify(buildSelectors(rows),null,2)+'\n'],['docs/AUDIT_REGLES.md',buildSummary(rows,books)]];
  for(const [path,value] of outputs){if(process.argv.includes('--check')){if(!existsSync(join(root,path))||readFileSync(join(root,path),'utf8')!==value)throw Error('Sortie périmée : '+path);}else writeFileSync(join(root,path),value,'utf8');}
  console.log(JSON.stringify({rules:rows.length,selectors:buildSelectors(rows).length,mode:process.argv.includes('--check')?'check':'build'}));
}
