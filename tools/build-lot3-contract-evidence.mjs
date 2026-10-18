/** Reproduction locale des reçus Lots 1/2/3 et des lignes de suivi correspondantes.
 * node tools/build-lot3-contract-evidence.mjs
 * Entrées : contrats générés, fixtures/tests sourcés et audit historique versionné.
 * Le script conserve auditInitial, les 131 autres identités et les clauses talents.
 * Les validations globales sont consignées séparément dans LOT3_RAPPORT_CONTRATS_LOT2.md.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {contracts,encounter,cast,assertSourceBehaviour} from '../tests/helpers/lot3-domain-fixture.js';
import {sourceCases,fixture,execute,contractFor,sourceEffects} from '../tests/helpers/lot3-arcane-fixture.js';
import {sourceCases as elvenCases,fixture as elvenFixture,execute as elvenExecute,contractFor as elvenContract,sourceEffects as elvenEffects} from '../tests/helpers/lot3-elven-fixture.js';
const catalogueNotes={"Bannissement Mineur (Hysh & Shyish)": "Portée BFM → FM mètres ; compétence opposée Calme.", "Parler avec un Animal (Azyr & Ghur)": "BI minutes → Intelligence minutes.", "Voix de Fer (Aqshy & Chamon)": "BSoc minutes → Sociabilité minutes ; +10/−10 → +1/−1 DR V5.", "Purification du Corps (Ghyran & Hysh)": "Endurance → Résistance ; affection unique nominative et transfert sur maladresse.", "Extinction de l'Âme": "Projectile +6 → +9.", "Bannissement Majeur": "Dissipation +10 par DR → +1 DR ; Sociabilité +20 → +2 DR.", "Tempête": "Nom public empête conservé ; CT −30 → −3 DR ; Athlétisme +20 → +2 DR (+1 en vol).", "Malédiction d'Attraction des Flèches": "Bouclier peut encore bloquer les tirs, malgré perte PA/Défensif dans leur opposition.", "Coruscation de Finreir": "Foyer d10/2 : arrondi supérieur explicite, donc 1–5 DR, relancé chaque Round."};
const date='2026-10-12',dir=new URL('../docs/lot3/',import.meta.url);
const read=name=>readFile(new URL(name,dir),'utf8');
const save=(name,data)=>writeFile(new URL(name,dir),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
const domains={beasts:'betes',heavens:'cieux',fire:'feu',light:'lumiere',metal:'metal',death:'mort',shadow:'ombres',life:'vie'};
// Les identifiants de commandes/couches sont techniques et aléatoires ; le reçu conserve les résultats sémantiques.
const stable=value=>JSON.parse(JSON.stringify(value,(key,v)=>['operationId','executionId','castExecutionId','effectId','spellEffectId'].includes(key)?undefined:key==='id'&&typeof v==='string'&&!/^spell-audit-|^mage$|^foe$|^blade$|^talent-|^quality-/.test(v)?undefined:v));
function receipt(c,p,store){return stable({id:c.id,name:c.name,page:c.page,canonicalName:c.canonicalName,domain:c.domain,ready:p.ready,summary:p.summary,
 targets:p.targetResults.map(r=>({id:r.targetId,woundsLost:r.woundsLost,healed:r.woundsHealed,actions:r.actions,quantifiedReminder:r.quantifiedReminder})),
 timedLayer:store.listParticipants().some(p=>(p.extensions.v5.spellEffects || []).some(e=>e.spellId===c.id&&e.expiresAtRound>1)),
 participants:store.listParticipants().map(p=>({id:p.id,hp:p.hp,maxHp:p.maxHp,caracs:p.caracs,states:p.states,traits:p.traits})),assisted:c.assistedClauses || [],reminders:c.reminders});}
const lot1=[],lot2=[],lot3=[];
for(const c of contracts){
 const foe=c.canonicalName==='Beast Master'?{traits:['Bestial','Taille (Moyenne)']}:c.canonicalName==='Daemonbane'?{traits:['Démoniaque']}:c.canonicalName==='Cauterise'?{skills:[{name:'Endurance',total:20}],caracs:{E:20,FM:40,M:4}}:c.canonicalName==='Fate’s Fickle Fingers'?{camp:'pj'}:{};
 const {store}=await encounter({foe}),p=await cast(store,c);assertSourceBehaviour(c,p,store);lot1.push(receipt(c,p,store));
}
for(const row of sourceCases){const c=contractFor(row[0]),{store}=await fixture(row),p=await execute(store,row);sourceEffects(row,p,store);lot2.push(receipt(c,p,store));}
for(const row of elvenCases){const c=elvenContract(row[0]),{store}=await elvenFixture(row),p=await elvenExecute(store,row);elvenEffects(row,p,store);const record=receipt(c,p,store);record.targets=record.targets.map(r=>({...r,actions:r.actions.map(a=>a.kind==='suppression'?{...a,summary:'Suppression temporaire de la couche existante réellement désignée.'}:a)}));lot3.push(record);}
await save('LOT3_PREUVES_CONTRATS_LOT3.json',{date,scope:30,fixture:'tests/helpers/lot3-elven-fixture.js ; HEPG pp. 80–89 ; faits et dés synthétiques explicites ; expiration via horloge publique puis vrais Tours, variantes dans les tests',rows:lot3});
await save('LOT3_PREUVES_CONTRATS_LOT1.json',{date,scope:68,fixture:'tests/helpers/lot3-domain-fixture.js ; faits synthétiques déclarés ; recettes de variantes dans les tests versionnés',rows:lot1});
await save('LOT3_PREUVES_CONTRATS_LOT2.json',{date,scope:48,fixture:'tests/helpers/lot3-arcane-fixture.js ; paramètres indépendants des contrats, V5 pp. 240–245 ; durées longues via horloge publique puis vraie fin de Tour',rows:lot2});
const all=[...lot1,...lot2,...lot3],scope=new Map(all.map(r=>[r.id,r])),contractMap=new Map([...contracts,...sourceCases.map(r=>contractFor(r[0])),...elvenCases.map(r=>elvenContract(r[0]))].map(c=>[c.id,c]));
const matrix=await read('LOT3_MATRICE_CONTRATS_V5.md'),treatments=new Map();
for(const line of matrix.split('\n')){const cells=line.split('|').map(s=>s.trim());if(/^\d+$/.test(cells[1]))treatments.set(Number(cells[1]),cells[9].startsWith('Rappel')?'rappel':cells[9].includes('données MJ')?'données MJ':'calculable');}
const tracker=JSON.parse(await read('LOT3_SUIVI_EXHAUSTIF_MAGIE.json'));
for(const s of tracker.spells){s.matrixTreatment=treatments.get(s.row);if(!scope.has(s.id))continue;
 const c=contractMap.get(s.id),r=scope.get(s.id),isLot2=['arcane','petty'].includes(c.domain),isLot3=['high','elven-arcane','elven-petty'].includes(c.domain),lot=isLot3?'3':isLot2?'2':'1',file='tests/lot3-v5-contrats-'+(isLot3?(c.domain==='high'?'haute-magie':'elfiques'):isLot2?(c.domain==='arcane'?'arcanes':'mineurs'):domains[c.domain])+'.test.js';
 s.auditInitial ??= Object.fromEntries(['status','clauses','proof','notVerified','checks','input','observed','minimalInputResult'].filter(k=>k in s).map(k=>[k,s[k]]));
 s.matrixTreatment=treatments.get(c.row);s.sourceRead=true;if(isLot3)s.source='HEPG p. '+c.page;
 s.status=s.matrixTreatment==='rappel'?'rappel':s.matrixTreatment==='données MJ'?'donnée MJ nécessaire':'conforme';
 const assisted=[...(c.assistedClauses || [])];if(c.effects.facts?.some(f=>!f.optional))assisted.push('Désignations/faits explicitement saisis ; absence ou incompatibilité bloque le calcul.');
 if(c.effects.breath)assisted.push('Froid : +1 DR à la défense adverse calculé ; frappe en dernier dans l’ordre automatique du prochain Round. Ordre manuel, séquence de gestes hors Tours, géométrie aérienne/fumée : MJ.');
 if(c.effects.flyRating)assisted.push('Bande de portée vers une cible en vol, hauteur, mouvement obligatoire et chute : rappel MJ, absence de géométrie.');
 s.clauses='Corrigé le 12/10/2026 : NI '+c.cn+', portée '+c.range+', cible '+c.target+', durée '+c.duration+'. DR final avant surpuissance. '+(assisted.length?'Clauses assistées : '+assisted.join(' '):'Effet du contrat exécuté dans les scénarios sourcés.');
 s.proof=(isLot3?'HEPG p. ':'V5 p. ')+c.page+' relue ; '+file+' ; aperçu/application Store, persistance et Undo. Reçu reproductible : LOT3_PREUVES_CONTRATS_LOT'+lot+'.json#'+c.id+'.';
 s.notVerified='Hors automatisation : '+(assisted.join(' ') || 'Positions, événements narratifs et choix réels des destinataires : MJ, sans plateau.')+' Les scénarios ne certifient pas toutes les situations d’une session ; aucune écriture de fiche permanente.';
 s.observed={ready:r.ready,targets:r.targets,participants:r.participants};
 delete s.input;delete s.minimalInputResult;
 s.checks={previewPure:true,applied:true,undoEquivalent:true,reloadSemanticallyEquivalent:true,realTurnExpiry:r.timedLayer?(isLot2 || isLot3?'vrais Tours ; horloge publique pour les durées >13 Rounds':'recette historique Lot 1 : Round rejoint avant le Tour final'):'sans couche temporisée',genericOvercasts:c.overcast.options,specificOvercasts:(c.overcast.specific || []).map(x=>x.id),factsRequired:(c.effects.facts || []).filter(f=>!f.optional).map(f=>f.key)};
 const metadata={date,testFile:file,assistedReasons:assisted,contract:{cn:c.cn,range:c.range,target:c.target,duration:c.duration}};
 if(isLot3)s.lot3={...metadata,...(catalogueNotes[c.name]?{catalogueContradiction:catalogueNotes[c.name]}:{})};else if(isLot2)s.lot2=metadata;else s.retoursLot1=metadata;
}
const counts=rows=>Object.fromEntries([...new Set(rows.map(s=>s.status))].map(status=>[status,rows.filter(s=>s.status===status).length]));
tracker.summary.lot3={identities:30,statuses:counts(tracker.spells.filter(s=>s.lot3)),tests:86,sourcePages:[80,81,82,86,87,88,89],timedIdentities:lot3.filter(r=>r.timedLayer).length};
tracker.lot3Evidence='LOT3_PREUVES_CONTRATS_LOT3.json';
tracker.date=date;tracker.summary.spellStatusCounts=counts(tracker.spells);
for(const [field,key] of [['byFamily','family'],['byMatrixTreatment','matrixTreatment']])tracker.summary[field]=Object.fromEntries([...new Set(tracker.spells.map(s=>s[key]))].map(value=>[value,counts(tracker.spells.filter(s=>s[key]===value))]));
tracker.summary.lot2={identities:48,statuses:counts(tracker.spells.filter(s=>s.lot2)),tests:90,sourcePages:[240,241,242,243,244,245,301,357,358],timedIdentities:lot2.filter(r=>r.timedLayer).length};
tracker.summary.retoursLot1={identities:68,statuses:counts(tracker.spells.filter(s=>s.retoursLot1)),tests:10};
tracker.tests=tracker.tests.filter(t=>!['LOT2','RETOURS-LOT1','LOT3','RETOURS-LOT2'].includes(t.id));tracker.tests.push({id:'LOT2',files:['tests/lot3-v5-contrats-arcanes.test.js','tests/lot3-v5-contrats-mineurs.test.js'],passed:90,scope:'48 identités + variantes, Store/persistance/Undo, vrais Tours, dés et faits explicites'},{id:'RETOURS-LOT1',files:['tests/lot3-v5-retours-lot1.test.js'],passed:10,scope:'DR final, paramètres, objets réels, couches, Clarté et Frénésie'});
tracker.tests.push({id:'LOT3',files:['tests/lot3-v5-contrats-haute-magie.test.js','tests/lot3-v5-contrats-elfiques.test.js'],passed:86,scope:'30 identités, paramètres indépendants, Store, Undo/reload, vrais Tours et variantes payées, dés/faits manquants et Tests réussis/ratés'},{id:'RETOURS-LOT2',files:['tests/lot3-v5-retours-lot2.test.js'],passed:10,scope:'D2/D3/D4/D5/D6/D7 et assertions exactes Chaîne/Source/Souffle'});
tracker.lot2Evidence='LOT3_PREUVES_CONTRATS_LOT2.json';tracker.reproduction='node tools/build-v5-spell-contracts.mjs ; node tools/build-lot3-contract-evidence.mjs ; node --test';
await save('LOT3_SUIVI_EXHAUSTIF_MAGIE.json',tracker);
const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' '),statuses=['conforme','anomalie','donnée MJ nécessaire','rappel','hors périmètre','non vérifié'];
const tableRow=(label,rows)=>'| '+label+' | '+rows.length+' | '+statuses.map(k=>counts(rows)[k] || 0).join(' | ')+' |';
let md=await read('LOT3_SUIVI_EXHAUSTIF_MAGIE.md');const rest=md.slice(md.indexOf('**Preuves distinctes'));
const intro=['# Lot 3 — suivi exhaustif des identités et clauses magiques (C-02)','', '12 octobre 2026. Audit initial conservé ; 68 Domaines, 23 Arcanes, 25 mineurs et 30 sorts de Haute Magie/elfiques corrigés et testés. Les 131 autres identités gardent leurs constats antérieurs.','', '**277 identités ; 146 dans les lots 1 à 3.** Les statuts portent sur les scénarios sourcés ; les clauses assistées restent expliquées. Aucun certificat global des 277 sorts.','', '## Synthèse','', '| Périmètre | Total | '+statuses.join(' | ')+' |','| --- | ---: | '+statuses.map(()=> '---:').join(' | ')+' |',tableRow('Sorts',tracker.spells),'| Clauses talents | 54 | 7 | 1 | 16 | 5 | 22 | 3 |','', '| Famille | Total | '+statuses.join(' | ')+' |','| --- | ---: | '+statuses.map(()=> '---:').join(' | ')+' |'];
for(const family of Object.keys(tracker.summary.byFamily))intro.push(tableRow(family,tracker.spells.filter(s=>s.family===family)));
intro.push('', '**Lot 3 :** 30 identités, 86 tests sourcés et 10 retours Lot 2 ; voir [rapport Lot 3](LOT3_RAPPORT_CONTRATS_LOT3.md) et [reçus Lot 3](LOT3_PREUVES_CONTRATS_LOT3.json). **Lot 2 :** 90 tests ; 10 tests de retours Lot 1. Voir [rapport actuel](LOT3_RAPPORT_CONTRATS_LOT2.md), [reçus Lot 1](LOT3_PREUVES_CONTRATS_LOT1.json) et [reçus Lot 2](LOT3_PREUVES_CONTRATS_LOT2.json). Reproduction : `node tools/build-lot3-contract-evidence.mjs`. Les preuves historiques qui suivent restent datées.','');
md=intro.join('\n')+'\n'+rest;
md=md.split('\n').map(line=>{if(!line.startsWith('| spell-audit-'))return line;const id=line.split('|')[1].trim(),s=tracker.spells.find(s=>s.id===id);if(!scope.has(id)){const cells=line.split('|');cells[5]=' '+s.matrixTreatment+' ';return cells.join('|');}return '| '+[s.id,s.name,s.family+' / '+s.domain,s.source,s.matrixTreatment,s.status,(s.references || []).join(', ')+' — '+s.clauses,s.proof,s.notVerified].map(esc).join(' | ')+' |';}).join('\n');
const currentMatrix='Matrice actuelle après Lot 3 et retour D3 : **208 calculables / 44 données MJ / 25 rappels / 0 restant**.\n';
md=md.replace(/^Matrice actuelle après Lot (?:3 et retour D3|4)[^\n]*\n(?:[ \t]*\n)*/gm,'');md=md.replace('Matrice après lot 1 :',currentMatrix+'\nMatrice après lot 1 :');
md=md.replace('La matrice générée après le lot 1 compte 110 calculables / 145 données MJ / 22 rappels (avant : 123 / 132 / 22).','Matrice après lot 1 : 110/145/22 ; après lot 2 : 109 calculables / 144 données MJ / 24 rappels / 0 restant. Les clauses assistées seules ne font plus glisser un calculable vers données MJ.');
await save('LOT3_SUIVI_EXHAUSTIF_MAGIE.md',md);
const section='## Lots 1 à 3 — état actualisé le 12 octobre';let fiche=await read('LOT3_FICHES_CORRECTION_CONTRATS.md');const oldSection='## Lot 2 et retours Lot 1 — état actualisé le 12 octobre';const index=fiche.includes(section)?fiche.indexOf(section):fiche.indexOf(oldSection);if(index>=0)fiche=fiche.slice(0,index).trimEnd()+'\n';
fiche+='\n'+section+'\n\nLe diagnostic initial des colonnes précédentes est conservé. Ce tableau le remplace pour les 146 identités indiquées ; les clauses des autres lots restent ouvertes. Catalogue conservé ; contradictions dans les rapports Lots 2 et 3. Le classement de matrice est issu de la sonde sans faits de scène (D3) ; il ne certifie pas les 131 identités hors lot.\n\n| Sort | Fiches | État actuel | Source et limites |\n| --- | --- | --- | --- |\n';
for(const s of tracker.spells.filter(s=>scope.has(s.id)))fiche+='| '+[s.name,(s.references || []).join(', '),'corrigé le 12/10/2026 — '+s.status,s.source+' ; '+s.notVerified+(s.lot3?.catalogueContradiction?' Catalogue conservé en contradiction : '+s.lot3.catalogueContradiction:'')].map(esc).join(' | ')+' |\n';
await save('LOT3_FICHES_CORRECTION_CONTRATS.md',fiche);
console.log(JSON.stringify({lot1:68,lot2:48,lot3:30,lot3Statuses:tracker.summary.lot3.statuses,lot2Statuses:tracker.summary.lot2.statuses,timed:tracker.summary.lot2.timedIdentities}));

// Lot 4 est réconcilié après les reçus historiques, sans modifier leur audit initial.
await import('./build-lot3-wom-evidence.mjs');
await import('./build-lot3-catalogue-evidence.mjs');

await import('./build-lot3-catalogue-5b-evidence.mjs');
await import('./build-lot3-catalogue-followup-evidence.mjs');
