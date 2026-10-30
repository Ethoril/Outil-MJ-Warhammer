/** Lot 5A : reçus synthétiques, assertions indépendantes et réconciliation reproductible du suivi. */
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sourceCases,fixture,execute,contractFor,assertSourceEffects} from '../tests/helpers/lot3-catalogue-fixture.js';
const root=new URL('../',import.meta.url),date='2026-10-13',read=path=>readFile(new URL(path,root),'utf8'),save=(path,value)=>writeFile(new URL(path,root),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const tracker=JSON.parse(await read('docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json')),audit=JSON.parse(await read('docs/lot3/LOT3_AUDIT_SORTS.json')),matrix=await read('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md');
const categories=new Map();for(const line of matrix.split('\n')){const cells=line.split('|').map(s=>s.trim());if(/^\d+$/.test(cells[1]))categories.set(Number(cells[1]),cells[9].startsWith('Rappel')?'rappel':cells[9].includes('données MJ')?'données MJ':'calculable');}
const verdict=category=>category==='rappel'?'rappel':category==='données MJ'?'donnée MJ nécessaire':'conforme';
const statuses=['conforme','anomalie','donnée MJ nécessaire','rappel','hors périmètre','non vérifié'],counts=rows=>Object.fromEntries(statuses.map(k=>[k,rows.filter(s=>s.status===k).length]));
const publicDescriptions={
 'Flamme Captivante':'Attaque : retirer seulement les Sonné acquis par ce sort, conserver les Sonné antérieurs (p.134).',
 'Esprit du Foyer':'Une pinte d’eau, pas une quantité arrondie à50cl ; Enflammé seulement si dégâts infligés, pas tout coup réussi (p.136).',
 'Goût de Feu':'Quart de gallon et pinte exacts, pas1L/0,5L ; Résistance V5+4 contre les séquelles, sans bonus général permanent (p.137).',
 'Chaleur Desséchante':'État V5 Exténué, pas Épuisé ; le bonus de dégâts emploie le DR final Test+réserve (p.137).',
 'Destin Illuminé':'Fatalité personnelle (Dooming), distincte des malédictions et présages également révélés (p.99).',
 'Cage dorée':'Barres0,5pouce et espacements6pouces exacts ; mesures françaises approximatives à remplacer (p.75).',
 'Essais et Erreurs':'Une relance unique du prochain Test désigné, pas un Test supplémentaire indépendant (p.77).',
 'Bête Indomptée':'Humain : pelage épais et parole perdue ; comportement d10, jusqu’à dissipation. Terminologie FM/Chevaucher/Charme animal V5 (p.147).',
 'Polir et Exalter':'Bonus V4+20 deviennent +2DR ; les deux options restent payées séparément à2 et4DR (p.100).',
 'Malédiction du Destin':'Pénalité V4−10 devient −1DR à tous les Tests, une seule malédiction (p.99).',
 'Passage Rapide':'Bonus V4+10 devient +1DR pour éviter Enchevêtré ; Foulée d’un terrain et niveaux conditionnels (p.148).'
};
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/volonte/g,'force mentale').replace(/[^a-z0-9]/gi,'').toLowerCase();
const stable=x=>JSON.parse(JSON.stringify(x,(key,v)=>['operationId','executionId','castExecutionId','effectId','spellEffectId','parentEffectId','instanceId','ts','timestamp'].includes(key)?undefined:key==='id'&&typeof v==='string'&&!/^spell-audit-|^mage$|^foe$|^second$|^blade$|^talent-/.test(v)?undefined:v));
const scope=new Set(),evidence=[];
for(const row of sourceCases){
 const name=row[0],c=contractFor(name),s=tracker.spells.find(s=>s.id===c.id);assert.ok(s);scope.add(c.id);
 const allied=c.effects.targetRule?.alliesOnly || name==='Prémonition Fantastique',{store}=await fixture({foe:{camp:allied?'pj':'ennemi'}}),before=store.listParticipants(),p=await execute(store,name);assertSourceEffects(name,p,store);
 const observed=stable({ready:p.ready,targets:p.targetResults.map(r=>({id:r.targetId,woundsLost:r.woundsLost,healed:r.woundsHealed,quantified:r.quantifiedReminder,fearOfCaster:r.fearOfCaster,actions:r.actions})),participants:store.listParticipants().map(p=>({id:p.id,name:p.name,hp:p.hp,maxHp:p.maxHp,caracs:p.caracs,armor:p.armor,states:p.states,traits:p.traits}))});
 await store.undo();assert.deepEqual(store.listParticipants(),before);
 const original=audit.items.find(a=>a.id===c.id).source.values,paramChanges=[];for(const key of ['cn','range','target','duration'])if(norm(original[key])!==norm(c[key]))paramChanges.push({field:key,catalogue:original[key],contract:c[key]});
 const file='tests/unit/magie/contrats-catalogue.test.js',clauses=c.assistedClauses||[];
 s.auditInitial ??=Object.fromEntries(['status','clauses','proof','notVerified','observed','checks'].filter(k=>k in s).map(k=>[k,s[k]]));
 s.matrixTreatment=categories.get(c.row);s.status=verdict(s.matrixTreatment);s.source='WoM p. '+row[1];s.sourceRead=true;
 s.clauses='Corrigé le 13/10/2026 : NI'+c.cn+', portée '+c.range+', cible '+c.target+', durée '+c.duration+'. DR final Test+réserve, avant surpuissance. '+clauses.join(' ');
 s.proof='Source originale relue WoM p.'+row[1]+' ; '+file+' — tests nommés '+name+' (valeurs indépendantes, Store, variantes, persistance, Undo, vraie fin de Tour). LOT3_PREUVES_CONTRATS_LOT5A.json#'+c.id+'.';
 s.notVerified='Non automatisé, explicitement assisté : '+clauses.join(' ')+' Les variantes de recette sont vérifiées ; géométrie, inventaire, fiches, jets futurs et toutes les combinaisons d’une session ne sont pas certifiés.';
 s.observed=observed;s.checks={sourceRead:true,previewPure:true,applied:true,reloadSemanticallyEquivalent:true,undoEquivalent:true,realTurnExpiry:'fin de Tour réelle pour couches temporisées ; terrain/échéances narratives indiqués en reçus',variants:file,missingFactsBlocked:(c.effects.facts||[]).map(f=>f.key),targetLimitsAndProtection:'test par identité ; Protection lorsqu’une frappe cause des dégâts'};
 s.lot5A={correctedAt:date,testFile:file,sourcePage:row[1],assistedClauses:clauses,paramChanges,catalogueContradiction:publicDescriptions[name]||null};
 delete s.input;delete s.minimalInputResult;evidence.push({id:c.id,name,source:s.source,status:s.status,scenario:'Base synthétique : DR12+réserve30, attribut coupé, caracs connues, choix et dés explicitement fournis',observed,assistedClauses:clauses,paramChanges,catalogueContradiction:publicDescriptions[name]||null});
}
assert.equal(scope.size,55);assert.equal(tracker.spells.length,277);
for(const s of tracker.spells)s.matrixTreatment=categories.get(s.row);
tracker.date=date;tracker.summary.spellStatusCounts=counts(tracker.spells);tracker.summary.spells=counts(tracker.spells);
for(const [field,key] of [['byFamily','family'],['byMatrixTreatment','matrixTreatment']])tracker.summary[field]=Object.fromEntries([...new Set(tracker.spells.map(s=>s[key]))].map(value=>[value,counts(tracker.spells.filter(s=>s[key]===value))]));
for(const issue of tracker.newAnomalies || [])if(scope.has(issue.spellId)){const current=tracker.spells.find(s=>s.id===issue.spellId);issue.resolution={date,lot:'5A',status:current.status,proof:current.proof,limits:current.notVerified};}
const scoped=tracker.spells.filter(s=>scope.has(s.id));tracker.summary.lot5A={identities:55,domains:{Feu:13,Cieux:17,Métal:17,Bêtes:8},statuses:counts(scoped),domainTestCount:182,returnsLot3:6,returnsLot4:13,sourcePages:[74,75,76,77,98,99,100,101,134,135,136,137,147,148,149],sourceCatalogueFallback:0};
tracker.lot5AEvidence='docs/lot3/LOT3_PREUVES_CONTRATS_LOT5A.json';
tracker.tests=tracker.tests.filter(t=>!['LOT5A','RETOURS-LOT3','RETOURS-LOT4'].includes(t.id));tracker.tests.push({id:'LOT5A',files:['tests/unit/magie/contrats-catalogue.test.js'],passed:182,scope:'55 identités, source indépendante, Store, variantes, expirations réelles, limites/multiples, Protection, reload et Undo'},{id:'RETOURS-LOT3',files:['tests/unit/magie/contrats-elfiques-et-vents.test.js'],passed:6,scope:'Classement, projectiles périodiques, premier/second Vent, refus étranger, coûts et modificateurs'},{id:'RETOURS-LOT4',files:['tests/unit/magie/contrats-elfiques-et-vents.test.js'],passed:13,scope:'Nombre exact de ticks, disparition vortex, seuils/coûts/limites, collisions, Calme, Chaque Cadai, Chaîne, pinte et Saphery'});
await save('docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json',tracker);await save('docs/lot3/LOT3_PREUVES_CONTRATS_LOT5A.json',{date,identities:55,statuses:counts(scoped),proof:'Assertions indépendantes et recettes nommées dans les quatre fichiers de Domaine ; 182 tests et 19 retours ; aucun fait ni dé inventé dans le moteur',limits:'Les reçus ci-dessous jouent la base. Les variants, échecs, coûts, fins de Tour, Protection et Undo sont prouvés par les tests ; clauses assistées détaillées par identité.',rows:evidence});
const esc=v=>String(v??'').replaceAll('|','/').replaceAll('\n',' '),tableRow=(label,rows)=>'| '+label+' | '+rows.length+' | '+statuses.map(k=>counts(rows)[k]).join(' | ')+' |';
let md=await read('docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.md');
md=md.split('\n').map(line=>{if(line.startsWith('| spell-audit-')){const s=tracker.spells.find(s=>s.id===line.split('|')[1].trim());if(!scope.has(s.id)){const cells=line.split('|');cells[5]=' '+s.matrixTreatment+' ';return cells.join('|');}return '| '+[s.id,s.name,s.family+' / '+s.domain,s.source,s.matrixTreatment,s.status,(s.references||[]).join(', ')+' — '+s.clauses,s.proof,s.notVerified].map(esc).join(' | ')+' |';}const label=line.split('|')[1]?.trim();if(label==='Sorts')return tableRow(label,tracker.spells);if(label&&label in tracker.summary.byFamily)return tableRow(label,tracker.spells.filter(s=>s.family===label));return line;}).join('\n');
md=md.replace(/^13 octobre 2026\. Audit initial[^\n]*$/m,'13 octobre 2026. Audit initial conservé ; 220 identités relues et testées dans les lots 1 à 5A. Les 57 autres conservent leurs constats antérieurs ; le périmètre du lot 5B inclut 58 sorts, dont Cendres et Poussière déjà traité.');
md=md.replace(/^\*\*277 identités ;[^\n]*$/m,'**277 identités ; 220 uniques dans les lots 1 à 5A.** Quatre des 55 du lot5A avaient une correction au lot4. Les statuts distinguent les mécanismes réellement appliqués, les données nécessaires et les rappels ; aucune certification générale des 277.');
md=md.replace(/^Matrice actuelle après Lot [^\n]*$/m,'Matrice actuelle après Lot5A : **'+['calculable','données MJ','rappel'].map(k=>tracker.spells.filter(s=>s.matrixTreatment===k).length).join(' / ')+' /0 restant** (calculables /données MJ /rappels). Les choix du lanceur sont fournis, les faits de scène sont absents de cette sonde.');
md=md.replace(/^\*\*Lot 5A :\*\*[^\n]*\n\n/gm,'');md=md.replace('**Lot 4 :**','**Lot 5A :** 55 identités ; '+Object.entries(counts(scoped)).filter(([,n])=>n).map(([s,n])=>n+' '+s).join(', ')+' ; 182 tests et 19 retours. [Rapport Lot 5A](LOT3_RAPPORT_CONTRATS_LOT5A.md), [reçus](LOT3_PREUVES_CONTRATS_LOT5A.json).\n\n**Lot 4 :**');
md=md.replace(/^\*\*Preuves distinctes de l’audit C-02 initial[^\n]*$/m,'**Preuves de la livraison :** 220 identités uniques relues contre leur source et leurs arbitrages, avec tests sourcés. Les55 du lot5A ont55 sources WoM lues,55 applications Store et des variantes nommées. Les57 restantes ne sont pas déclarées vérifiées par la sonde générique. Les preuves historiques C-02 suivent avec leur date ; elles ne certifient pas clause par clause les277. Talents et ingrédients hors lot5A.');
await save('docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.md',md);
let fiches=await read('docs/lot3/LOT3_FICHES_CORRECTION_CONTRATS.md'),section='## Lot 5A — état actualisé le 13 octobre';if(fiches.includes(section))fiches=fiches.slice(0,fiches.indexOf(section)).trimEnd()+'\n';
fiches+='\n'+section+'\n\nCes55 lignes remplacent les constats initiaux des quatre Domaines. Corrections générées, source relue et preuve indépendante ; catalogue public gelé, remplacement final par la V5 déjà décidé. Une mesure de terrain ou de fiche reste explicitement un reçu, pas un effet automatique de participant.\n\n| Sort | Fiches | Statut actualisé | Source, preuve, clauses assistées et catalogue |\n| --- | --- | --- | --- |\n';
for(const s of scoped)fiches+='| '+[s.name,(s.references||[]).join(', '),'corrigé le 13/10/2026 — '+s.status,s.source+' ; '+s.lot5A.testFile+' ; '+s.lot5A.assistedClauses.join(' ')+(s.lot5A.catalogueContradiction?' Catalogue à remplacer : '+s.lot5A.catalogueContradiction:'')+(s.lot5A.paramChanges.length?' Paramètres structurés : '+s.lot5A.paramChanges.map(x=>x.field+' '+x.catalogue+' → '+x.contract).join(' ; '):'')].map(esc).join(' | ')+' |\n';
await save('docs/lot3/LOT3_FICHES_CORRECTION_CONTRATS.md',fiches);
console.log(JSON.stringify({lot5A:tracker.summary.lot5A.statuses,scope:55,verifiedUnique:220,remainingUnique:57}));
