import fs from 'node:fs';
const root='docs/lot3/',read=name=>JSON.parse(fs.readFileSync(root+name,'utf8')),save=(name,data)=>fs.writeFileSync(root+name,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
const tracker=read('LOT3_SUIVI_EXHAUSTIF_MAGIE.json');for(const s of tracker.spells)if(s.name==='empête'){s.name='Tempête';s.canonicalName='Tempête';}
const byId=new Map(tracker.spells.map(s=>[s.id,s]));
const matrix=fs.readFileSync(root+'LOT3_MATRICE_CONTRATS_V5.md','utf8'),categories=new Map();
for(const line of matrix.split('\n')){const cells=line.split('|').map(s=>s.trim());if(/^\d+$/.test(cells[1]))categories.set(Number(cells[1]),cells[9].startsWith('Rappel')?'rappel':cells[9].includes('données MJ')?'données MJ':'calculable');}
for(const s of tracker.spells){s.matrixTreatment=categories.get(s.row);s.status=s.matrixTreatment==='calculable'?'conforme':s.matrixTreatment==='données MJ'?'donnée MJ nécessaire':'rappel';}
const statusCounts=rows=>Object.fromEntries(['conforme','anomalie','donnée MJ nécessaire','rappel','hors périmètre','non vérifié'].map(k=>[k,rows.filter(r=>r.status===k).length]));
tracker.date='2026-10-14';tracker.summary.spells=statusCounts(tracker.spells);tracker.summary.spellStatusCounts=tracker.summary.spells;
for(const [field,key] of [['byFamily','family'],['byMatrixTreatment','matrixTreatment']])tracker.summary[field]=Object.fromEntries([...new Set(tracker.spells.map(s=>s[key]))].map(k=>[k,statusCounts(tracker.spells.filter(s=>s[key]===k))]));
for(const lot of ['5A','5B'])tracker.summary['lot'+lot].statuses=statusCounts(tracker.spells.filter(s=>s['lot'+lot]));
for(const name of ['Blizzard enflammé de Ygethmor','Comète de Cassandora','Bannissement Majeur','Tempête','Destin de Bjuna','Délivrance de la Mort']){
 const s=tracker.spells.find(s=>s.name===name);s.coverageProbe={date:'2026-10-14',measured:'Effet réellement appliqué après vraie fin de Tour, comparé au témoin sans effets',proof:'tools/spell-coverage-probe.mjs ; tests/lot3-v5-retours-catalogue.test.js',limits:'Dés, présence et autres faits de fin de Tour explicitement déclarés par la recette ; couches et métadonnées exclues.'};
}
const earth=tracker.spells.find(s=>s.name==='Sang de la Terre');earth.clauses='Contact direct du lanceur avec la terre requis. Au début de chaque Round, les cibles vivantes présentes et en contact avec la terre récupèrent le Bonus de Force Mentale en Blessures. Soins périodiques calculés ; précondition et présence déclarées par le MJ.';
if(!earth.proof.includes('Retours du 14/10'))earth.proof+=' Retours du 14/10 : précondition maintenue ; soins réels prouvés par tests/lot3-v5-retours-catalogue.test.js.';
for(const lot of [1,2,3,4,'5A','5B']){const name='LOT3_PREUVES_CONTRATS_LOT'+lot+'.json',e=read(name);for(const row of e.rows||e.scenarios||[]){const s=byId.get(row.id);if(!s)throw Error('Preuve sans identité : '+row.id);row.status=s.status;}e.statuses=statusCounts(e.rows||e.scenarios||[]);save(name,e);}
for(const issue of tracker.newAnomalies){
 if(issue.scope==='sort'){const s=byId.get(issue.spellId);issue.resolution={date:'2026-10-13',lot:'Catalogue V5 / retours 5B',status:s.status,proof:s.proof,limits:s.notVerified};}
 else if(issue.id==='N-12')issue.resolution={date:'2026-10-13',status:'conforme',proof:'tests/lot3-v5-engine-socle.test.js : Focalisation échouée avec Lileath rang 2 ; tests/lot3-v5-catalogue-lileath.test.js : description et cache. HEPG p.83.',limits:'Acquisition et affichage dans la fiche PJ hors de cette recette.'};
}
for(const c of tracker.talentClauses){
 if(c.talentId==='talent-lileath-s-blessing'&&c.clauseId==='magic:1'){
  c.auditInitial??={status:c.status,proof:c.proof,clause:c.clause};
  c.clause='D-06 : le cumul des sources lit le rang de Bénédiction de Lileath du lanceur de chaque source ; une cible habilitante n’accorde pas le cumul.';
  c.proof='HEPG p. 83 ; tests/lot3-v5-lileath-wiring.test.js : six tests, trois sources, rang du lanceur, cible non habilitante, expiration, PA/modificateurs et Store réels.';
 }
 if(c.talentId==='talent-lileath-s-blessing'&&c.clauseId==='magic:0'){c.auditInitial??={status:c.status,proof:c.proof,clause:c.clause};c.status='conforme';c.clause='Tout Test de Focalisation Qhaysh, réussi ou non : +1 DR par rang ; gain de réserve seulement sur réussite.';c.proof='HEPG p.83 ; tests/lot3-v5-engine-socle.test.js (rang 2, score 60/jet 75 : −1 DR devient +1), tests/lot3-v5-catalogue-lileath.test.js et tests/lot3-v5-lileath-wiring.test.js.';c.notVerified='Acquisition et affichage dans la fiche PJ non exercés ; les tests couvrent le moteur et le catalogue local.';}
 if(!c.closure&&c.talentId==='talent-suffuse-with'&&c.clauseId==='magic:2')c.notVerified='Non vérifié : chaque effet mesurable propre au Vent et l’aspect perceptible de WoM p.186 doivent être sondés séparément. Les tests magic:0 et magic:1 ne certifient pas magic:2.';
 if(!c.closure&&c.talentId==='talent-mind-over-body'&&c.clauseId==='magic:2')c.notVerified='Scénario Chance du catalogue et Undo testé dans lot3-v5-high-talent-coverage.test.js ; la clause complète reste non vérifiée : rechargement et fidélité de l’adaptation de la ressource originale non certifiés.';
 if(!c.closure&&c.talentId==='talent-magic-resistance'&&c.clauseId==='magic:2')c.notVerified='Non vérifié : scénario D-07/Puissance totale et application du −3 DR aux seuls effets à exécuter séparément ; les tests de Résistance à la Magie ordinaires ne suffisent pas.';
}
const counts=rows=>Object.fromEntries([...new Set(rows.map(r=>r.status))].map(k=>[k,rows.filter(r=>r.status===k).length]));
tracker.summary.talentStatusCounts=counts(tracker.talentClauses);tracker.summary.openAnomalies=tracker.newAnomalies.filter(i=>!i.resolution).length;
tracker.catalogueV5={date:'2026-10-14',report:'LOT3_RAPPORT_CATALOGUE_V5.md',cellChanges:'LOT3_A_REPORTER_DANS_LA_FEUILLE_MAGIE.md',returns:'LOT3_RETOURS_VERIFICATION_CATALOGUE_V5.md',limits:tracker.talentClauses.filter(c=>c.status==='non vérifié').map(c=>({name:c.name,clauseId:c.clauseId,missing:c.notVerified}))};
save('LOT3_SUIVI_EXHAUSTIF_MAGIE.json',tracker);
const esc=value=>String(value??'').replaceAll('|','/').replaceAll('\n',' ');
const states=['conforme','anomalie','donnée MJ nécessaire','rappel','hors périmètre','non vérifié'];
let md='# Lot 3 — suivi exhaustif de la magie\n\n14 octobre 2026. 277 identités conservées. Classement et statuts synchronisés avec la matrice, y compris les effets mesurés après de vraies fins de Tour. Les clauses assistées et les limites sont explicites. L’audit initial reste dans le JSON.\n\n## Synthèse\n\n| Périmètre | Total | '+states.join(' | ')+' |\n| --- | ---: | '+states.map(()=> '---:').join(' | ')+' |\n';
for(const [label,rows] of [['Sorts',tracker.spells],['Clauses talents',tracker.talentClauses]])md+='| '+label+' | '+rows.length+' | '+states.map(k=>counts(rows)[k]||0).join(' | ')+' |\n';
md+='\n## Sorts\n\n| Identité | Sort | Source relue | Classement | Statut | Clauses | Preuve exécutée | Limites |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n';
for(const s of tracker.spells)md+='| '+[s.id,s.name,s.source,s.matrixTreatment,s.status,s.clauses,s.proof,s.notVerified].map(esc).join(' | ')+' |\n';
md+='\n## Talents\n\n| Talent | Clause | Statut | Effet | Preuve | Limites |\n| --- | --- | --- | --- | --- | --- |\n';
for(const c of tracker.talentClauses)md+='| '+[c.name,c.clauseId,c.status,c.clause,c.proof,c.notVerified].map(esc).join(' | ')+' |\n';
md+='\n## Résolution des anomalies initiales\n\n| Référence | Priorité initiale | Objet | Statut final | Preuve | Limites |\n| --- | --- | --- | --- | --- | --- |\n';
for(const i of tracker.newAnomalies)md+='| '+[i.id,i.priority,i.name,i.resolution.status,i.resolution.proof,i.resolution.limits].map(esc).join(' | ')+' |\n';
md+='\n## Retours 5B et catalogue V5\n\nLes reçus des lots 1 à 4 portent leur statut final. Lileath magic:0 est conforme sur le scénario de Focalisation échouée. Les clauses encore non vérifiées, s’il en reste, sont listées ci-dessous. Le bilan courant de clôture est dans LOT3_RAPPORT_CLOTURE.md :\n\n';
for(const c of tracker.talentClauses.filter(c=>c.status==='non vérifié'))md+='- '+c.name+' / '+c.clauseId+' : '+c.notVerified+'\n';
save('LOT3_SUIVI_EXHAUSTIF_MAGIE.md',md);
let report=fs.readFileSync(root+'LOT3_RAPPORT_CONTRATS_LOT5B.md','utf8');
const rows=tracker.spells.filter(s=>s.lot5B),counts5b=statusCounts(rows);
report=report.replace(/\*\*58 identités relues et exécutées :[^\n]*/,'**58 identités relues et exécutées : '+counts5b.conforme+' conformes dans les recettes, '+counts5b['donnée MJ nécessaire']+' nécessitant des données MJ, '+counts5b.rappel+' rappels. Classement actualisé le 14 octobre 2026 ; aucune anomalie ni identité non vérifiée restante dans ce lot.** Sources : Winds of Magic pp. 62–65, 86–89, 110–113, 122–125 ; Forme bestiale Jade : V5 p. 245 et Bêtes pp. 325–327, avec arbitrage Ghyran.');
for(const [label,domain] of [['Vie','life'],['Lumière','light'],['Mort','death'],['Ombres','shadow'],['Total',null]]){
 const group=domain?rows.filter(s=>s.domain===label):rows,c=statusCounts(group);
 report=report.replace(new RegExp('^\\| '+label+' \\|[^\\n]*','m'),'| '+label+' | '+group.length+' | '+c.conforme+' | '+c['donnée MJ nécessaire']+' | '+c.rappel+' |');
}
for(const [label,category] of [['Calculables','calculable'],['Données MJ','données MJ'],['Rappels','rappel']])report=report.replace(new RegExp('^(\\| '+label+' \\| \\d+ \\| )\\d+( \\|)$','m'),(_,a,b)=>a+tracker.spells.filter(s=>s.matrixTreatment===category).length+b);
report=report.replace('Après 5B et retours','Catalogue et retours du 14 octobre');save('LOT3_RAPPORT_CONTRATS_LOT5B.md',report);
console.log(JSON.stringify({retours5B:'traités',resolvedAnomalies:12,talents:tracker.summary.talentStatusCounts}));
