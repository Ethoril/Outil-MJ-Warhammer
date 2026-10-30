/** Reçus Lot 4 : situations synthétiques explicites, aucune donnée de campagne. */
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sourceCases,fixture,execute,contractFor} from '../tests/helpers/lot3-wom-fixture.js';
const date='2026-10-13',dir=new URL('../docs/lot3/',import.meta.url),read=n=>readFile(new URL(n,dir),'utf8'),save=(n,x)=>writeFile(new URL(n,dir),typeof x==='string'?x:JSON.stringify(x,null,2)+'\n');
const contracts=JSON.parse(await readFile(new URL('../js/data/v5-spell-contracts.json',import.meta.url),'utf8'));
const notes={
 'Sang Bouillonnant':'Mort due au sort et déclenchement d’explosion déclarés ; 0 Blessure ne constitue pas un registre automatique de décès. Résistance, Aveuglé, début du Tour et explosion sont exécutés.',
 'Epées Sanguines':'Une Action déclarée dirige le groupe, une frappe maximum par cible et par Round. Portée/visibilité réelles saisies ; mouvement Vol20 et placement restent des faits de carte.',
 'Blizzard enflammé de Ygethmor':'Objets et terrain inflammables : 25 % d’ignition par Round, jet et conséquence à reporter par le MJ ; absence de terrain dans le combat. Occupation et couverture solide déclarées ; frappe et Athlétisme exécutés.',
 'Transe d’Ambre':'Consentement, durée normale/hibernation et terme réel de saison déclarés. Maladies détaillées de fiche et souvenirs : rappel MJ ; poison/conséquences des états suspendus et soins permis. Aucun compteur de maladie.',
 'Éveil du Bois':'Forêt et destinataires réels déclarés ; aucun plateau. Esquive +2, projectile +4 et états F30 calculés, procédure de libération générique de l’état Enchevêtré reste jouée à table avec la Force 30 enregistrée.',
 'Malédiction d’Anraheir':'Monture réelle et sortie/rentrée déclarées. Calme/Chevaucher exécutés ; parcours de fuite et accalmie sont des événements de carte sans déplacement automatique.',
 'Yeux de la Meute':'Vision, alternance et destinations spatiales : rappel, absence de point de vue/carte ; aucun bonus de combat inventé. Durée FM minutes effectivement portée par la couche.',
 "Suivi de l'Odeur":'Tests réellement fondés sur l’odorat déclarés ; aucun bonus aux autres modalités. Corruption/mutation sensorielle : information narrative, pas de corruption détectée par défaut.',
 'Lunes du Chasseur':'Alliés réellement dans la zone déclarés. F/E/M et restauration calculés ; pas de mesure automatique des distances.',
 'Le Bœuf Reste Debout':'Alliés dans la zone déclarés ; immunité Peur/Terreur lue dans les Tests suivants. Le retrait de Brisé constitue une conséquence acquise, il ne revient pas avec l’expiration du bonus.',
 'Ver Grouillant':'Cuir réellement porté déclaré ; dégâts matériels des sacs/objets à reporter sur la fiche. Corrosion des PA de combat persistante après libération ; aucune mutation de l’inventaire source.',
 'Escalier en Spirale':'Position et distance de tir augmentée de la hauteur : reçus MJ, absence de coordonnées. Admission d’un autre mage de Jade connaissant le sort par Savoir (Magie) +0 : rappel, profils/apprentissage non garantis par le combat.',
 'Transmogrification Exaltée de Colchis':'Occupants/surfaces initialement affectés et sortie de zone déclarés ; extinction de terrain et torches nouvelles : rappel car aucun objet de terrain. Immunité réelle de couche exécutée.',
 'Apothéose Verdoyante':'Délai de mort/tête présente et admissibilité du cadavre : MJ. Test de Corruption modérée fourni comme reçu de fiche ; aucun compteur de Corruption créé. Critiques et membres perdus préservés.',
 'L’Étreinte d’Iyrtu':'Le reçu du Test d’empoignade fournit minimum +0 DR ; opposition et gestes de lutte complète à jouer par le MJ, le combat ne possède pas d’état partagé de prise entre deux corps.',
 'Les Enfants Sauvages de Zandox':'BF des chiens absent du livre : profil fourni par MJ pour Arme (Morsure) +8, jamais BF inventé. Portée 4 m/ligne de vue déclarées. Perception −2 pour aperçu : rappel sans détection spatiale persistante.',
 'Cor du Andar':'Alliance, neutralité et portée réelle déclarées ; Test de Peur (1) immédiat calculé. Aucun retrait inventé de Brisé/Peur anciens.',
 'Visage mutable':'Consentement et mode d’apparence déclarés. Deux FM réelles opposées, bonus/malus de Soc et immobilité/mutisme calculés ; reconnaissance des proches par FM : reçu MJ, relation/personne connue hors combat.',
 'Tempête Magmatique':'Cibles réelles de chaque trajectoire déclarées, carte absente. Mini-vortex ≤8 m, +2 DR chacun (max3), zone BFM et dispersion après un mouvement exécutés ; aucune cible implicite.',
 'Orage de Thorsen':'Projection BFM direction aléatoire d8, obstacles réels et collision déclarés. Dégâts +8, collision7 et À Terre calculés ; positions finales reportées par MJ.',
 'Cendres et Poussière':'Présence finale dans le nuage distincte de traversée, saisie MJ. Soleil Violet : destinataires de Peur (2), visibilité, sphère1 m et destruction du terrain : rappel, carte absente ; Calme au contact ou mort calculés.',
 'Corps de Feu':'Saisie des empoignades ou Blessures réelles de mêlée ; chaque clause applique dégâts/Tests, aucun bonus F/E ni immunité au feu. Habits et sacs : rappel d’inventaire.',
 'Lames Azurées':'Destinataires engagés dans la portée des lames déclarés. Armes Très Longues/Massives hors portée, Longues simultanées : rappel MJ, absence d’ordre fin de mêlée/positions. Trois coups au Tour adverse et toutes les Protections calculés.'
};
const catalogueNotes={
 'Blizzard enflammé de Ygethmor':'Portée et zone BFM → FM (WoM p. 137).',
 'Transe d’Ambre':'Portée BI → Initiative (p. 146).',
 'Éveil du Bois':'Portée/zone BFM → FM (p. 146).',
 'Yeux de la Meute':'Durée BFM minutes → FM minutes (p. 147).',
 "Suivi de l'Odeur":'Durée BI minutes → Initiative minutes (p. 148).',
 'Lunes du Chasseur':'Zone BFM → FM (p. 148).',
 'Le Bœuf Reste Debout':'Zone BFM → FM (p. 149).',
 'Ver Grouillant':'Portée BFM → FM ; entrave initiale puis action après lutte, corrosion permanente de cuir (p. 149).',
 'Escalier en Spirale':'Description : hauteur BFM → FM ; +3 PA et plafond200 (p. 89).',
 'Transmogrification Exaltée de Colchis':'Zone BFM → FM (p. 89).'
};
const matrixText=await read('LOT3_MATRICE_CONTRATS_V5.md'),categories=new Map();
for(const line of matrixText.split('\n')){const cells=line.split('|').map(s=>s.trim());if(/^\d+$/.test(cells[1]))categories.set(Number(cells[1]),cells[9].startsWith('Rappel')?'rappel':cells[9].includes('données MJ')?'donnée MJ nécessaire':'conforme');}

const extras=[['Tempête Magmatique',136],['Orage de Thorsen',101],['Cendres et Poussière',122],['Corps de Feu',134],['Lames Azurées',98]];
const all=[...sourceCases.map(r=>[r[0],r[1]]),...extras],evidence=[],tracker=JSON.parse(await read('LOT3_SUIVI_EXHAUSTIF_MAGIE.json'));
const stable=x=>JSON.parse(JSON.stringify(x,(key,v)=>['operationId','castExecutionId','executionId','effectId','spellEffectId','parentEffectId'].includes(key)?undefined:key==='id'&&typeof v==='string'&&!/^spell-audit-|^mage$|^foe$|^blade$|^talent-/.test(v)?undefined:v));
for(const [name,page] of all){
 const c=contractFor(name),extra=name==='Apothéose Verdoyante'?{foe:{hp:0,extensions:{v5:{dead:true,criticalWounds:[{id:'old',name:'Critique ancien'}]}}}}:{},made=await fixture(extra);
 const patch=name==='Apothéose Verdoyante'?{targetTests:{foe:{deathDelaySec:30}}}:['Lunes du Chasseur','Le Bœuf Reste Debout'].includes(name)?{targetIds:['mage']}:name==='Cor du Andar'?{targetIds:['mage','foe']}:c.effects.vortex?{willpowerSuccess:true,direction:'E',distanceRoll:10,targetTests:{foe:{throwDirection:4,collision:false,inside:true}}}:name==='Lames Azurées'?{targetIds:['mage'],secondaryTargets:{engaged:['foe']}}:{};
 const before=made.store.listParticipants(),p=await execute(made.store,name,patch);assert.equal(p.ready,true);
 const receipt=stable({id:c.id,name,page,scenario:'Base, DR saisis 12 + réserve30, attribut coupé, faits de fixture explicites',ready:p.ready,targets:p.targetResults.map(r=>({id:r.targetId,lost:r.woundsLost,healed:r.woundsHealed,actions:r.actions,quantified:r.quantifiedReminder})),participants:made.store.listParticipants().map(p=>({id:p.id,hp:p.hp,maxHp:p.maxHp,caracs:p.caracs,armor:p.armor,states:p.states,traits:p.traits})),limitations:notes[name]});
 await made.store.undo();assert.deepEqual(made.store.listParticipants(),before);evidence.push(receipt);
 const s=tracker.spells.find(s=>s.id===c.id);s.auditInitial ??=Object.fromEntries(['status','clauses','proof','notVerified','observed'].map(k=>[k,s[k]]));
 s.source='WoM p. '+page;s.sourceRead=true;s.status=categories.get(c.row);
 s.clauses='Corrigé le 13/10/2026 : NI '+c.cn+', portée '+c.range+', cible '+c.target+', durée '+c.duration+'. DR final avant dépense ; '+notes[name];
 s.proof='WoM p. '+page+' relue ; tests/unit/magie/contrats-elfiques-et-vents.test.js — « '+name+' : Store, variante sourcée, persistance, Undo et expiration réelle » et sondes spécifiques ; LOT3_PREUVES_CONTRATS_LOT4.json#'+c.id+'.';
 if(extras.some(([n])=>n===name))s.proof='WoM p. '+page+' ; tests/unit/magie/contrats-elfiques-et-vents.test.js — sondes nommées '+name+' ; Store et vrai Tour ; LOT3_PREUVES_CONTRATS_LOT4.json#'+c.id+'.';
 s.notVerified='Hors automatisation explicitement classé : '+notes[name]+' Les variantes testées ne constituent pas une certification de toutes les situations de session.';
 s.observed={ready:receipt.ready,targets:receipt.targets,participants:receipt.participants};delete s.input;delete s.minimalInputResult;
 s.lot4={correctedAt:date,testFile:'tests/unit/magie/contrats-elfiques-et-vents.test.js',catalogueContradiction:catalogueNotes[name] || null};
}
const statuses=['conforme','anomalie','donnée MJ nécessaire','rappel','hors périmètre','non vérifié'],counts=rows=>Object.fromEntries(statuses.map(k=>[k,rows.filter(s=>s.status===k).length]));
tracker.summary.spells=counts(tracker.spells);for(const f of Object.keys(tracker.summary.byFamily))tracker.summary.byFamily[f]=counts(tracker.spells.filter(s=>s.family===f));tracker.summary.lot4={identities:18,extraIdentities:5,statuses:counts(tracker.spells.filter(s=>s.family==='Winds of Magic')),notVerified:0,testCount:82};tracker.lot4Evidence='docs/lot3/LOT3_PREUVES_CONTRATS_LOT4.json';
await save('LOT3_SUIVI_EXHAUSTIF_MAGIE.json',tracker);await save('LOT3_PREUVES_CONTRATS_LOT4.json',{date,source:'WoM pp. 20–23 et pages individuelles ; HEPG p.81 pour attributs',identities:18,extraIdentities:5,scenarios:evidence,limits:'Scénarios synthétiques + assertions du fichier de test. Clauses de terrain/inventaire/Corruption/mémoire explicitement assistées, aucune donnée de campagne.'});
const scope=new Set(evidence.map(r=>r.id)),esc=s=>String(s ?? '').replaceAll('|','/').replaceAll('\n',' '),row=(label,rows)=>'| '+label+' | '+rows.length+' | '+statuses.map(k=>counts(rows)[k]).join(' | ')+' |';
let md=await read('LOT3_SUIVI_EXHAUSTIF_MAGIE.md');md=md.split('\n').map(line=>{if(!line.startsWith('| spell-audit-'))return line;const id=line.split('|')[1].trim(),s=tracker.spells.find(s=>s.id===id);if(!scope.has(id))return line;return '| '+[s.id,s.name,s.family+' / '+s.domain,s.source,s.matrixTreatment,s.status,(s.references || []).join(', ')+' — '+s.clauses,s.proof,s.notVerified].map(esc).join(' | ')+' |';}).join('\n');
md=md.replace(/^12 octobre 2026\. Audit initial[^\n]*$/m,'13 octobre 2026. Audit initial conservé ; lots 1 à 3 et 18 Winds of Magic + cinq corrections liées du lot 4 testés. Les 108 autres identités conservent leurs constats antérieurs.').replace('**277 identités ; 146 dans les lots 1 à 3.**','**277 identités ; 169 dans les lots 1 à 4 (dont cinq corrections liées).**');
md=md.split('\n').map(line=>{const label=line.split('|')[1]?.trim();if(label==='Sorts')return row(label,tracker.spells);if(label && label in tracker.summary.byFamily)return row(label,tracker.spells.filter(s=>s.family===label));return line;}).join('\n');
md=md.replace(/^Matrice actuelle après Lot 3 et retour D3[^\n]*$/m,'Matrice actuelle après Lot 4 : **205 calculables / 47 données MJ / 25 rappels / 0 restant**.');
const note='**Lot 4 :** 18 Winds of Magic (classements dérivés de la sonde actuelle ; nombres dans le JSON) + cinq corrections liées ; 82 tests. Voir [rapport Lot 4](LOT3_RAPPORT_CONTRATS_LOT4.md) et [reçus Lot 4](LOT3_PREUVES_CONTRATS_LOT4.json).\n\n';md=md.replace(/^\*\*Lot 4 :\*\*[^\n]*\n\n/m,'');md=md.replace('**Lot 3 :**',note+'**Lot 3 :**');await save('LOT3_SUIVI_EXHAUSTIF_MAGIE.md',md);
let fiches=await read('LOT3_FICHES_CORRECTION_CONTRATS.md');const section='## Lot 4 — état actualisé le 13 octobre';if(fiches.includes(section))fiches=fiches.slice(0,fiches.indexOf(section)).trimEnd()+'\n';fiches+='\n'+section+'\n\nCe tableau remplace les constats initiaux W/N pour ces 23 identités. Contrats générés, source relue, tests Store et limites explicites ; catalogue conservé jusqu’au remplacement V5 déjà décidé. Aucun arbitrage de catalogue à redemander.\n\n| Sort | Fiches | État actuel | Source, preuve et limites |\n| --- | --- | --- | --- |\n';for(const s of tracker.spells.filter(s=>scope.has(s.id)))fiches+='| '+[s.name,(s.references || []).join(', '),'corrigé le 13/10/2026 — '+s.status,s.source+' ; tests/unit/magie/contrats-elfiques-et-vents.test.js ; '+notes[s.name]+(catalogueNotes[s.name]?' Catalogue en contradiction : '+catalogueNotes[s.name]:'')].map(esc).join(' | ')+' |\n';await save('LOT3_FICHES_CORRECTION_CONTRATS.md',fiches);
console.log(JSON.stringify({lot4:tracker.summary.lot4,evidence:evidence.length}));
