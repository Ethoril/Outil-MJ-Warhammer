import fs from'node:fs';import{createHash}from'node:crypto';
import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
const sources=read('js/data/reference-snapshot.json').talents.entries,inventory=read('docs/lot2/LOT2_INVENTAIRE_TALENTS.json').items;
const registries=['v5-talent-contracts','v5-test-talent-contracts','v5-quality-talent-contracts','v5-additional-talent-contracts'].map(n=>read('js/data/'+n+'.json'));
const contracts=new Map(registries.flatMap(r=>r.contracts).map(c=>[c.talentId,c]));
const completedMechanics={
 'dirty-fighting':'Choix de remplacer les dégâts d’un Coup ciblé au Corps à mains nues par Coup bas (1 Blessure et Sonné).',
 'in-fighter':'Suppression de l’allonge adverse ; opposition pour entrer au contact, arme improvisée et sortie payée en Élan.',
 drilled:'Permission de Désengagement gratuit quand l’auteur est aussi Engagé avec cet adversaire ; don d’Élan raccordé.',
 disarm:'Remplacement des dégâts après +4 DR, tailles/arme liée, d10 de distance et direction explicites, Élan pour attraper.',
 resolute:'Test de Calme après acquisition d’un État pour conserver l’Élan.',
 frightening:'Peur 1/2, réussites de Psychologie par cible et Tour, blocage du gain d’Élan et Avantage de mêlée.',
 forgefire:'Aura à portée du BFM, Pénétrante temporaire et PA métallique supplémentaire ignoré.',
 'glorious-demise':'Réaction avant Inconscient ; 1 Fortune si Sonné ; attaque immédiate sans consommer le prochain Tour.',
 flagellant:'Entrée en Frénésie sans Test sur Blessure si accès préalable ; suppression des pénalités critiques raccordée.',
 'reaction-strike':'Charge identifiée, Test d’Initiative puis attaque de main directrice avant le chargeur, quota une par Round.',
 large:'Bonus BF aux attaques normales de mêlée, −2 DR à la défense de plus petit, Force opposée selon l’écart, poids défensif 2, Peur/Désengagement et Piétinement payé en Élan.',
 harpooner:'Projectiles Empaleuse fichés : Mouvement réduit de 1 par projectile, minimum 1 ; suivi et retrait explicites.',
 small:'Règle homebrew de Taille validée : seuil +10, −2 DR par écart en défense de mêlée, Dévastatrice/Percutante temporaire et multiplication avant BE/PA, Force opposée, Peur/Terreur et Piétinement à 1 Élan ; Frappes Mortelles supprimées, aucune migration de Taille/Blessures.',
 shieldsman:'Protection d’allié adjacent ou remplacement des dégâts pour repousser après opposition gagnée ; Élan et quota par Round.',
 'war-leader':'Substitution du Calme allié contre la Peur par le Commandement, jusqu’à fin de bataille ou invalidation de l’auteur.',
 'fast-shot':'Tir de Pistol chargé avant le premier Tour, sans engagement, ordre d’Initiative et Action du Round consommée.',
 'whirlwind-of-death':'1 Fortune, opposition unique, dégâts/localisation communs à tous les engagés, alliés compris ; pas de critique du jet, critiques d’excédent par cible.',
 cardsharp:'Double de Pari opposé : relance explicite du jet adverse et suppression de son bénéfice d’Escamotage.',
 'combat-aware':'Lier le résultat de Perception à l’acquisition de Surpris identifiée ; réussite automatique conditionnelle raccordée.',
 'public-speaker':'Commandement après Charme collectif : Action, cibles et retrait Brisé liés au résultat.',
 hatred:'Psychologie de contrôle à la rencontre et tentatives en fin de Round après le premier ; bonus et immunités de groupe raccordés.',
 vice:'−2 DR de Sociabilité envers témoins ; −2 DR par jour d’abstinence en Psychologie ; compulsion et Exténué, fin explicitement testée.',
 relentless:'Test après Désengagement adverse pour poursuivre avec Mouvement supplémentaire ; permission de Désengagement.',
 'liquid-fortification':null,
};
const pending={};delete completedMechanics['liquid-fortification'];

const narrativeIds=['stone-soup','animal-affinity','kingpin','shadow','detect-artefact','river-guide','secret-identity','beneath-notice','lip-reading','read-write','hunter-s-eye','step-aside','fisherman','etiquette','second-sight','acute-sense','sixth-sense','night-vision','holy-visions'];
const sheetIds=['pure-soul','luck','concoct','sturdy','criminal','doomed','embezzle','magnum-opus','wealthy','noble-blood','pharmacist','well-prepared','ancestral-grudge','blood-of-aenarion','uncouth-uranai','fleet-footed','seasoned-traveller','hardy'];
const mixedSheet={
 artistic:'Achats d’Art hors carrière et nouvelles formes d’art.',craftsman:'Achats de Métier hors carrière et spécialités.',savant:'Spécialité de Savoir possédée, une acquisition par spécialité.',linguistics:'Langues de communication et coût des Augmentations dans la fiche.',
 'master-tradesman':'Acquisitions par spécialité de Métier.',
 'liquid-fortification':'Bonus temporaires de caractéristiques +10 F/E exclus du moteur conformément au périmètre demandé ; durée d’une heure après la dernière boisson à suivre sur la fiche.',
 'strong-back':'Encombrement transportable +1 au niveau 1, +3 au niveau 2 : valeur dérivée à gérer par la fiche.',
 youngblood:'Statut inférieur entre Eonir et éventuelle perte du talent lors de l’admission : statut et progression dans la fiche.',
 large:'Taille et maximum de Blessures importés, sans recalcul.',small:'Taille et maximum de Blessures importés, sans recalcul.'
};
const mixedNarrative={
 'alley-cat':'Trajet le plus rapide ou le plus discret dans une ville connue.',rover:'Trajets, gibier, eau et abri.',
 'fast-hands':'Autoriser Escamotage pour divertir ou pour un Test de contact ; sorts de contact au lot 3.',
 'master-of-disguise':'Vêtements, posture et expressions crédibles.',
 'super-numerate':'Calcul sans outil et estimation du temps tant que conscient.',
 'nose-for-trouble':'Trouver combats, paris ou boissons.',menacing:'Les voleurs raisonnables évitent normalement ce personnage.',dealmaker:'Reconnaître une offre définitive.',
 'field-dressing':'Créer attelles et bandages avec les matériaux disponibles.',gregarious:'Trouver les lieux où circulent les rumeurs.',orientation:'Trouver le nord avec des signes familiers.',briber:'Reconnaître l’acceptation et le montant d’un pot-de-vin.',trapper:'Construire un petit piège après préparation.',
 'commanding-presence':'Autorité raisonnable en situation de crise.',catfall:'Chute volontaire : autoriser le Test d’Athlétisme qui réduit les dégâts de chute selon la règle de chute.',
 'tunnel-fighter':'Estimation de profondeur et distances sous terre.',panhandle:'Trouver un abri urbain inconfortable.',carouser:'Aucun effet négatif en consommation modérée ; le MJ qualifie l’excès.',contortionist:'Autoriser le passage par une ouverture difficile.',
 mimic:'Accent après une journée, qualité d’une imitation et bénéfice social contextualisé.',
 'master-orator':'Qualifier le plaidoyer devant l’assemblée et le Savoir adéquat.',
 'sea-legs':'Le MJ exige un Test de mal de mer uniquement si les conditions le justifient.',
 'perfect-pitch':'Apprendre un morceau après une écoute.',surgery:'Soigner les critiques exigeant Chirurgie selon leurs clauses de soins.',
 'long-memory':'Mémoire parfaite des événements vécus dans la campagne ; le MJ qualifie les souvenirs plus anciens et la difficulté.',
 'tower-of-memories':'Mémoire parfaite de nombreux faits.',
 'roughrider':'Action/Mouvement de la monture sans Test ; mouvement décidé par le MJ.',
 'crack-the-whip':'Action/Mouvement des animaux sans Test ; mouvement décidé par le MJ.',
 'trick-rider':'Autoriser Représentation à cheval ; l’Esquive montée utilise sa pénalité propre.',
 'enclosed-fighter':'Autoriser Esquive même dans un espace normalement trop exigu.',
 'public-speaker':'Rassembler et lire la foule ; l’Action résultante et les cibles restent désignées par le MJ.',
 hatred:'Le MJ qualifie l’action concrète qui détruit le groupe haï au plus vite.',
 'crew-commander':'Le MJ désigne le tireur et confirme la portée de voix de son arme à équipage.'
};
const items=sources.map(s=>{
 const id=s.id.slice(7),old=inventory.find(t=>t.talentId===s.id),c=contracts.get(s.id),clauses=[];
 if(old.family==='hors_perimetre_bonus_caracteristique_fiche')clauses.push({scope:'sheet',status:'excluded',text:'Bonus de caractéristique déjà compris dans la fiche.'});
 else if(old.family==='lot3_magie_et_prieres'||['sword-dancing','gifts-of-khaine','cadai-meditation'].includes(id))clauses.push({scope:'lot3',status:'deferred',text:s.description});
 else {
   if(c)for(const clause of c.clauses)clauses.push({scope:'engine',status:'implemented',contractClauseId:clause.id,text:clause.event+' · '+clause.role+' · '+clause.effects.map(e=>e.op+(e.key?' '+e.key:'')).join(', ')});
   if(id==='strike-to-stun')clauses.push({scope:'engine',status:'manual-approved',text:'Neutralisation silencieuse hors combat (livre p. 135, décision MJ) : Test opposé assisté ; BF Blessures et Inconscient à la victoire, Sonné et alarme à la défaite à arbitrer manuellement.'});
   if(id==='master-and-commander')clauses.push({scope:'engine',status:'manual-approved',text:'+1 DR par rang aux Tests de Commandement à bord (leadershipRallySlModifiers) ; le fait « à bord » est confirmé par le MJ.'});
   if(pending[id])clauses.push({scope:'engine',status:'pending',text:pending[id]});
   if(mixedSheet[id])clauses.push({scope:'sheet',status:'owned',text:mixedSheet[id]});
   if(mixedNarrative[id])clauses.push({scope:'narrative',status:'reminder',text:mixedNarrative[id]});
   if(!c&&!pending[id]&&!mixedSheet[id]&&!mixedNarrative[id]&&id!=='master-and-commander'){
     if(sheetIds.includes(id))clauses.push({scope:'sheet',status:'owned',text:s.description});
     else if(narrativeIds.includes(id))clauses.push({scope:'narrative',status:'reminder',text:s.description});
     else throw Error('Tri manquant : '+s.id+' '+s.nom);
   }
 }
 return {talentId:s.id,name:s.nom,...(completedMechanics[id]?{implementationNotes:completedMechanics[id]}:{}),source:{reference:s.source,effectHash:'sha256:'+createHash('sha256').update(s.description).digest('hex')},clauses};
});
const result={schemaVersion:1,reviewedAt:'2026-10-09',policy:'Tri par clause : fiction en rappel, valeurs/progression dans les fiches, mécanique mesurable dans le moteur. Pending signifie mécanique identifiée mais non raccordée ; ce statut ne signifie jamais narratif ni automatisé.',items};
fs.writeFileSync(root+'docs/lot2/LOT2_TRI_TALENTS.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({identities:items.length,scopes:items.flatMap(i=>i.clauses).reduce((r,c)=>(r[c.scope+':'+c.status]=(r[c.scope+':'+c.status]||0)+1,r),{})}));

// Same reviewed clauses drive both the JSON and the human-readable inventory.
const counts={engine:0,narrative:0,sheet:0,excluded:0,lot3:0};
for(const item of items){const cs=item.clauses;counts[cs.some(c=>c.scope==='engine')?'engine':cs.some(c=>c.scope==='lot3')?'lot3':cs.some(c=>c.status==='excluded')?'excluded':cs.some(c=>c.scope==='sheet')?'sheet':'narrative']++;}
const engineClauseCount=items.flatMap(i=>i.clauses).filter(c=>c.status==='implemented').length;
const cell=value=>String(value).replaceAll('|',' / ').replace(/\s+/g,' ').trim();
const label=c=>c.scope==='engine'?'Moteur raccordé':c.scope==='narrative'?'Rappel narratif':c.scope==='lot3'?'Lot 3':c.status==='excluded'?'Bonus de caractéristique exclu':'Fiche';
const lines=[
'# Tri et raccordement des 207 talents — 9 octobre 2026','',
'Le tri est effectué par clause. Les effets mesurables utilisent le moteur, avec choix ou faits fournis par le MJ si nécessaire. La fiction reste un rappel. La progression et les valeurs déjà importées appartiennent aux fiches. Aucun bonus de caractéristique ni second calcul de Dur à cuire.','',
'## Bilan sans double comptage','',
'| Traitement principal | Talents |','| --- | ---: |',
'| Clauses raccordées au moteur | '+counts.engine+' |','| Entièrement narratifs | '+counts.narrative+' |','| Entièrement gérés par les fiches, hors bonus ci-dessous | '+counts.sheet+' |','| Bonus de caractéristiques exclus | '+counts.excluded+' |','| Magie, prières et effets magiques réservés au lot 3 | '+counts.lot3+' |','| Total | '+items.length+' |','',
'Ces catégories sont exclusives. Les talents mixtes conservent aussi leurs rappels et valeurs de fiche : 52 talents ont des clauses narratives et 38 des clauses de fiche, dont dix exclusions. Les bonus temporaires F/E de Fortification liquide sont également exclus. Les '+engineClauseCount+' clauses de contrat comprennent 277 automatiques et 105 assistées. Aucun talent mécanique du périmètre 2.4 ne reste en attente.','',
'## Arbitrages appliqués','',
'Matraqueur ajoute les Sonné supplémentaires après le seuil V5 d’Assommante sur les Blessures effectivement perdues à la tête, puis les réductions d’États du destinataire s’appliquent. L’ancien bonus au Test de Force est supprimé. Commandant d’Équipage exige une Action de Commandement réussie ; sa substitution vaut pour la prochaine attaque à équipage seulement, même échouée.','',
'Petit est raccordé dans les deux sens : +10 au toucher du plus petit ; −2 DR par catégorie en défense de mêlée ; qualités temporaires Dévastatrice/Percutante et multiplicateur de dégâts avant BE/PA ; Force opposée, Peur/Terreur, départ libre et Piétinement à 1 Élan. Les Frappes Mortelles sont supprimées. Le moteur utilise les catégories de Taille déclarées et les Blessures importées, sans migration de fiche. Le texte public épinglé garde sa provenance et l’arbitrage local demeure explicite ; une future correction d’Aides de jeu impose revalidation.','',
'## Résultat du raccordement','',
'Les familles restantes incluent Riposte, Frénésie/Contrôle de Frénésie, Arts martiaux, Coude-à-coude, Désarmer, Combat déloyal, Porte-bouclier, Grande taille, Petit, Combattant au contact, Frappe réactive, Fin glorieuse, Tir rapide, Tourbillon de mort, Feu de forge, Harponneur, Orateur, Seigneur de guerre, Vigilance, Impitoyable, Tricheur, Haine et Vice. Les quotas de séance de Résistance/Obstiné, pénalités typées, critiques, soins, mesures de situation et effets sociaux sont raccordés.','',
'Les coûts ordinaires sont payés avant calcul. Attraper une arme désarmée et repousser avec Porte-bouclier sont décidés et payés après le résultat, sans altérer le Test. Les quotas, ressources, destinataires et conséquences sont enregistrés dans la même commande durable, rechargée et annulable.','',
'Frappe réactive et Fin glorieuse gardent leur occasion immédiate et leur déclencheur réel. Tourbillon emploie un Test pour tous les engagés, alliés compris, et calcule BE/PA, rapports de Taille, critiques d’excédent et réductions d’États par victime. Aucun critique du jet de Tourbillon, même si un double réussi perd l’opposition. Les dés de Frappe blessante/Inoffensive restent ceux saisis.','',
'## Livraison 2.5 et suite','',
'Le raccordement 2.4 et la recette/livraison 2.5 sont terminés localement dans le périmètre convenu. La version 3.13.0 est prête à publier sur autorisation. La reprise entre clients a été éprouvée contre Auth/RTDB locaux, sans compte ni séance de production. [Recette et livraison 2.5](LOT2_RECETTE_2_5.md). Les 28 talents de magie/prières restent au lot 3.','',
'La neutralisation silencieuse p. 135 conserve volontairement ses conséquences manuelles approuvées : opposition assistée puis BF Blessures/Inconscient à la victoire, Sonné/alarme à la défaite arbitrés par le MJ. Il s’agit d’une limite mécanique approuvée. L’engagement, la géométrie, les armes chargées et les circonstances fictionnelles sont déclarés par le MJ ; leurs conséquences chiffrées sont calculées. Les mesures de poursuite, équipage, réparation et terrain ne simulent ni déplacement ni inventaire de munitions.','',
'Les 166 talents du livre V5 ont l’audit de source existant ; les 39 références de suppléments ne sont pas toutes vérifiées dans leur ouvrage. Petit est un homebrew validé par le MJ. Les contrats épinglent les textes publics et les arbitrages autorisés ; une source modifiée suspend sa contribution. [Audit des sources](ECARTS_LIVRE_V5_AIDES_DE_JEU.md).','',
'## Détail des 207 identités','',
'Les traitements mixtes sont visibles dans les colonnes. Les clauses, identités et empreintes exactes figurent dans [le tri JSON](LOT2_TRI_TALENTS.json). Cette page et la couverture affichée par l’interface sont générées depuis ce même tri.','',
'| Talent | Traitements | Détail |','| --- | --- | --- |',
...items.map(i=>{const engine=i.clauses.filter(c=>c.status==='implemented');const rest=i.clauses.filter(c=>c.status!=='implemented');const details=[...(engine.length?[i.implementationNotes||engine.length+' clause(s) de Tests, combat ou calcul de situation épinglées et raccordées.']:[]),...rest.map(c=>label(c)+' : '+c.text)];return '| '+cell(i.name)+' | '+[...new Set(i.clauses.map(label))].join(' + ')+' | '+cell(details.join(' '))+' |';}),''
];
fs.writeFileSync(root+'docs/lot2/LOT2_TRI_TALENTS.md',lines.join('\n'));
