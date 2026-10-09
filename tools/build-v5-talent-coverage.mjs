/** Offline documentation build from pinned PUBLIC texts, never a runtime rule parser. */
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const snapshot=read('js/data/reference-snapshot.json');
const inventory=read('docs/lot2/LOT2_INVENTAIRE_TALENTS.json');
const registries=['v5-talent-contracts','v5-test-talent-contracts','v5-quality-talent-contracts'].map(name=>read('js/data/'+name+'.json'));
const contracts=new Map(registries.flatMap(row=>row.contracts).map(contract=>[contract.talentId,contract]));
const residuals={
 'talent-alley-cat':'Dans une ville connue, déterminer sans Test le trajet le plus rapide ou le moins visible : décision MJ.',
 'talent-rover':'Trajet facile, gibier, eau et abri : appréciation MJ.',
 'talent-scale-sheer-surface':'Escalade impossible autorisée, difficulté plafonnée à −3 DR : le MJ renseigne la difficulté.',
 'talent-cat-tongued':null,
 'talent-fast-hands':'Divertir avec Escamotage et qualifier le Test de contact : décision MJ. Les Sorts de contact restent au lot 3.',
 'talent-linguistics':'Langues de communication uniquement. Achat à 50 PX par Augmentation : progression dans la fiche, sans écriture depuis cet outil.',
 'talent-master-of-disguise':'Vêtements, posture et expressions adaptés au déguisement : appréciation MJ.',
 'talent-public-speaker':'Rassembler et lire la foule ; après Charme réussi, Commandement pour agir, retirer Brisé ou influencer : cibler la foule et arbitrer les résultats manuellement.',
 'talent-resistant':'Une réussite automatique par séance, AVANT jet, distincte pour chaque menace acquise : suivre manuellement le quota de séance ; cette clause n’est pas activée par le moteur.',
 'talent-super-numerate':'Calcul sans outil et temps précis tant que conscient : rappel MJ.',
 'talent-nose-for-trouble':'Trouver paris, combats ou boissons dans une agglomération : rappel MJ.',
 'talent-menacing':'Les voleurs raisonnables choisissent généralement une autre cible : décision MJ.',
 'talent-dealmaker':'Reconnaître une offre définitive : appréciation MJ.',
 'talent-field-dressing':'Créer des attelles ou bandages simples avec matériaux ordinaires : décision MJ.',
 'talent-gregarious':'Trouver les lieux d’échange de rumeurs : rappel MJ.',
 'talent-orientation':'Connaître le nord avec signes familiers visibles : décision MJ.',
 'talent-bookish':null,
 'talent-briber':'Détecter acceptation et montant exact du pot-de-vin : appréciation MJ.',
 'talent-dicer':null,
 'talent-pilot':null,
 'talent-sprinter':null,
 'talent-trapper':'Après une heure de préparation, construire petit piège ou fosse dissimulée : décision MJ.',
 'talent-craftsman':'Achats de Métier hors carrière et nouvelles spécialités : progression dans la fiche.',
 'talent-artistic':'Achats d’Art hors carrière et nouvelles formes d’art : progression dans la fiche.',
 'talent-savant':'La spécialité de Savoir doit être possédée, une acquisition par spécialité : vérifier la fiche.',
 'talent-mimic':'Accent connu après une journée, détection d’une imitation et éventuelle aide auprès des habitants : appréciation MJ.',
 'talent-commanding-presence':'Autorité raisonnable en crise sans autorité reconnue : appréciation MJ.',
 'talent-catfall':'Chute volontaire ; Test pour réduire les Dégâts de chute : résultat et Dégâts à arbitrer séparément.',
 'talent-tunnel-fighter':'Distance et profondeur sous terre estimées : appréciation MJ.',
 'talent-inspiring':null,
 'talent-iron-will':null,
 'talent-panhandle':'Trouver un abri urbain inconfortable : rappel MJ.',
 'talent-strong-swimmer':'Poursuite à la nage : +2 DR à renseigner distinctement si la clause n’est pas raccordée.',
 'talent-carouser':'Pas d’effet négatif en consommation modérée ; Test seulement en cas d’excès : appréciation MJ.',
 'talent-contortionist':'Passage dans une ouverture difficile ou impossible : appréciation MJ.',
 'talent-supportive':'Ignorer la pénalité de statut supérieur : le MJ identifie cette pénalité, sans ajout forfaitaire de DR.',
 'talent-roughrider':'Action et Mouvement de la monture sans Test ; en poursuite montée +1 Mouvement animal : suivi MJ.',
 'talent-crack-the-whip':'Action et Mouvement des animaux sans Test ; poursuite avec véhicule +1 Mouvement animal : suivi MJ.',
 'talent-tinker':'Métier de Base pour réparer ; au moins 1 Augmentation requis pour Avantage et réparation deux fois plus rapide : vérifier fiche et temps.',
 'talent-break-and-enter':'Repérer entrée rapide/silencieuse : appréciation MJ.',
 'talent-master-orator':'Vérifier que le plaidoyer ou l’argument devant l’assemblée relève du Savoir approprié.',
 'talent-sea-legs':'Pas de Test de mal de mer en conditions normales ; le MJ décide s’il en exige un.',
 'talent-perfect-pitch':'Apprentissage d’un morceau après une écoute : rappel MJ.',
 'talent-surgery':'Guérison hors combat et traitement des Blessures critiques nécessitant Chirurgie : arbitrer les conséquences du soin.',
 'talent-tower-of-memories':'Mémorisation parfaite de nombreux faits : rappel MJ.',
 'talent-master-tradesman':'Une acquisition par spécialité de Métier ; vérifier la fiche.',
 'talent-numismatics':'Identifier origine monnaie/médaille/bannière avec Savoir Héraldique ; estimer un objet avec Évaluation : contextes à vérifier.',
 'talent-schemer':null,
 'talent-old-salt':'Compte comme deux bateliers pour navire océanique : suivi de l’équipage par le MJ.',
 'talent-waterman':'Compte comme deux membres d’équipage d’un bateau fluvial : suivi MJ.',
 'talent-strong-legs':null
};
const reasons={
 jets_et_contextes:'Contexte, choix ou mécanique non raccordés : le MJ applique la description après vérification du Test et de la spécialité.',
 actions_reactions_et_effets_actifs:'Déclencheur, auteur, cible, coût, quota et échéance à suivre manuellement ; aucun effet ni réaction automatique.',
 degats_et_qualites:'Qualité, Dégâts ou protection à arbitrer avant application ; ce rappel ne modifie aucune valeur.',
 etats_et_recuperation:'Acquisition, pénalité ou récupération à arbitrer ; ce rappel ne retire ni n’ajoute d’État.',
 valeurs_permanentes:'Valeur dérivée à vérifier sur la fiche importée ; ne pas recalculer ni ajouter automatiquement.',
 progression_ou_hors_resolution:'Progression, revenus et effets hors résolution : appliquer dans la fiche ou la fiction.',
 aides_contextuelles:'Effet de perception ou de fiction à vérifier par le MJ dans le contexte.'
};
const items=snapshot.talents.entries.map(source=>{
 const old=inventory.items.find(row=>row.talentId===source.id);if(!old)throw Error('Identité sans inventaire '+source.id);
 const effectHash='sha256:'+createHash('sha256').update(source.description,'utf8').digest('hex');
 const contract=contracts.get(source.id);if(contract&&contract.source.effectHash!==effectHash)throw Error('Contrat sans source exacte '+source.id);
 const clauses=[];
 const override=registries.map(row=>row.approvedOverrides?.[source.id]).find(Boolean);
 if(override)clauses.push({id:'approved-source-ruling',mode:'reminder',text:override.decision+' '+override.correctedDescription,reason:override.reference});
 if(contract) for(const clause of contract.clauses){
 const labels={grantAdvantage:'Accorde un Avantage au Test pertinent.',chooseSLUnits:'Choisir entre DR réussis et chiffre des unités du jet retenu (0 reste 0).',modifyDamage:'Bonus de Dégâts avant protections.',reduceConditionAcquisition:'Réduit les États proposés avant acquisition.',replaceDamage:'Remplace les Blessures et le critique après choix.',createActiveEffect:'Effet jusqu’à la fin du prochain Tour de l’auteur.',grantExtraAttack:'Propose une attaque supplémentaire explicite, avec coût et quota.',addQuality:'Ajoute Assommante à l’arme improvisée pour cette action.'};
 const role={actor:'Test',attacker:'Attaque',defender:'Défense'}[clause.role];
 clauses.push({id:clause.id,contractClauseId:clause.id,mode:clause.choice||clause.effects.some(e=>e.op==='chooseSLUnits')?'assisted':'automatic',text:role+' : '+clause.effects.map(effect=>labels[effect.op]||'Effet soumis aux conditions du talent.').join(' ')});
 }
 const special=old.family==='hors_perimetre_bonus_caracteristique_fiche'?'excluded':old.family==='lot3_magie_et_prieres'?'deferred':null;
 const residual=!contract?source.description:Object.hasOwn(residuals,source.id)?residuals[source.id]:null;
 if(special)clauses.push({id:'scope',mode:special,text:special==='excluded'?'Bonus de caractéristique déjà compris dans la fiche ; aucun ajout.':'Effets de magie ou prière réservés au lot 3.',ruleText:source.description});
 else if(residual)clauses.push({id:'manual',mode:'reminder',text:source.id==='talent-hardy'?'Dur à cuire : le maximum importé intègre déjà ce Bonus d’Endurance. Vérifier le maximum de la fiche ; ne jamais l’ajouter une deuxième fois.':residual,reason:reasons[old.family]||'Décision MJ.'});
 if(source.id==='talent-small')for(const clause of clauses)if(clause.mode==='reminder'){clause.text='Homebrew MJ conservé : toutes les clauses de Petit restent applicables à la table ; le Piétinement coûte un Élan (Momentum) au lieu d’un Avantage V4. Application manuelle, sans migration de Taille ou de Blessures. '+clause.text;clause.reason='Décision MJ du 9 octobre 2026 ; effets non automatisés.';}
 if(source.id!=='talent-small'&&!/Livre de base V5/.test(source.source))for(const clause of clauses)if(clause.mode==='reminder')clause.text='Source d’une autre édition ou d’un supplément : adaptation V5 à vérifier. '+clause.text;
 if(!clauses.length)throw Error('Talent sans traitement '+source.id);
 return {talentId:source.id,name:source.nom,family:old.family,description:source.description,source:{effectHash,reference:source.source},clauses};
});
const result={schemaVersion:1,ruleVersion:'catalogue-utile-v5-2026-10-09.2',sourceCatalogueVersion:snapshot.contentVersion,policy:'Traitement explicite par clause. Les rappels ne sont pas des automatismes et les contrats actifs sont vérifiés séparément.',items};
writeFileSync('js/data/v5-talent-coverage.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({identities:items.length,contracts:contracts.size,modes:items.flatMap(row=>row.clauses).reduce((counts,clause)=>(counts[clause.mode]=(counts[clause.mode]||0)+1,counts),{})}));
