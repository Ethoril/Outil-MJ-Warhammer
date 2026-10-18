# Plan exhaustif du divin V5

> **État de reprise actualisé :** cette note conserve le contexte initial. La provenance des neuf miracles et le rappel de l’aigle sont désormais corrigés; consulter [le rapport de reprise](DIVIN_RAPPORT_REPRISE.md) et [la passation](DIVIN_PASSATION_FENETRE_SUIVANTE.md) pour le code, les compteurs et la recette actuels. Le périmètre exhaustif reste ouvert.

17 octobre 2026, Europe/Paris. Ce plan remplace le périmètre limité du premier incrément Myrmidia. Il conduit à l’intégration locale de toutes les règles divines et religieuses des 17 livres retenus, de leurs dépendances et des capacités de PJ, PNJ et créatures. Le présent travail prépare la passation; il ne réalise pas encore cette extension.

## 1 Résultat attendu

Chaque clause mécanique doit disposer d’un chemin utilisable dans l’outil, depuis la saisie des choix et faits nécessaires jusqu’au résultat réel, à sa persistance et à sa fin. Un rappel textuel est une livraison acceptable pour un effet purement narratif, les commandements et les contraintes utiles au MJ. Il ne remplace pas une mécanique non développée.

Les faits de scène que le logiciel ne connaît pas peuvent être fournis par le MJ : portée, visibilité, appartenance religieuse pertinente, cible la plus proche, circonstances et choix narratifs. Une fois ces données fournies, le calcul et toutes les conséquences mécaniques couvertes sont exécutés par l’outil. Le coût matériel constitue l’exception explicite : offrande, sacrifice, argent ou objet consommé sont confirmés par le MJ, sans inventaire ni débit automatique.

La clôture exige : 17 livres explorés avec preuve de couverture des pages, toutes les identités et clauses pertinentes recensées, aucune mécanique du périmètre non raccordée, aucune question de règle nécessaire laissée sans réponse, contrôles indépendants et recette finale verte. Le temps disponible ou la taille d’une fenêtre ne réduisent pas ce périmètre. Une fenêtre peut finir par une passation; elle ne peut déclarer le chantier terminé pour cette raison.

## 2 Décisions déjà prises

Les décisions détaillées se trouvent dans [DIVIN_DECISIONS_MJ.md](DIVIN_DECISIONS_MJ.md) et [DIVIN_QUESTIONS_PLAN.md](DIVIN_QUESTIONS_PLAN.md). Ne pas les reposer.

| Sujet | Décision applicable |
| --- | --- |
| Corpus | 17 PDF locaux actuels, plus les livres que le MJ ajoutera explicitement. |
| Traditions | Tout le divin/religieux mécanique : cultes humains, ancêtres, elfes, halflings, Chaos, vampires, autres panthéons, rites, runes, objets/pouvoirs religieux et dépendances. Réutiliser les moteurs existants sans assimiler leurs règles. |
| Public concerné | PJ, tous PNJ et créatures, avec leurs accès et règles propres. |
| Édition cible | Socle V5; adaptations V4 documentées, contrôlées et arbitrées lorsqu’elles ne sont pas déductibles. |
| Ordre | Socle commun, livre de base V5 complet, puis suppléments; préparer leurs inventaires et dépendances dès le départ. |
| Accès | Fiche prioritaire; dérogation MJ motivée pour une utilisation, une scène ou une autorisation locale durable révocable. |
| Unités | Même valeur numérique en mètres de jeu pour les yards source. Conserver unité et valeur originales dans la provenance. Ne pas transformer une caractéristique entière en son Bonus. |
| Courroux | Effets de combat sûrs automatisés; fiction et décisions permanentes au MJ. Les conséquences mécaniques durables décidées par le MJ ont un modèle local effectif, conformément à l’extension de périmètre demandée ensuite. |
| Cumul | Règles établies d’abord; arbitrage MJ tracé pour les cas réellement indécidables. |
| Temps | Une horloge commune sourcée pour magie/divin; choix MJ seulement pour les exceptions. |
| Tests | Chaîne complète : score courant, États, DR, Avantage/Désavantage, oppositions, choix, Chance et relances. |
| Hors combat | Modéliser localement maladies, critiques, mort, ressources durables, effets de plusieurs jours et autres conséquences mécaniques; étapes MJ explicites lorsqu’exigées. |
| Géométrie | Sélection et faits spatiaux confirmés par le MJ suffisent; aucune dépendance obligatoire à rpg-map-display. |
| Matériel | Confirmation MJ des coûts matériels; aucun inventaire ni débit automatique d’argent, d’offrande, de sacrifice ou d’objet consommé. Ne pas rouvrir les ingrédients de sorts ordinaires. Les autres ressources mécaniques suivent leur règle. |
| Narratif | Résumés français sourcés des effets et contraintes utiles; pas de bibliothèque de tout le lore religieux demandée. |
| Catalogue | Corriger le catalogue local et préparer les exports. Aucune écriture dans les feuilles publiques. |
| Arbitrages nouveaux | Présenter les cas concrets, les sources, les conséquences et des sélecteurs au MJ après recherche de la règle/errata. |
| Publication | Chantier local, sans commit, push, fusion, déploiement ou écriture de fiche externe durant ce programme. La livraison locale précède une autorisation distincte. |

Les anciennes exclusions du lot magie ne permettent plus de laisser les traditions religieuses hors périmètre. L’exclusion des ingrédients de sorts ordinaires et l’exception des coûts matériels restent, elles, explicites. Les règles ordinaires sans rapport religieux sont classées hors périmètre, sauf dépendance nécessaire à un effet couvert; elles ne constituent pas un nouveau chantier général de tout le jeu.

## 3 Point de reprise vérifié

- Worktree : `C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer`, branche `codex/divin-v5`, HEAD `fb0f280150cdbdab1af220163abfaa491e2156ee`.
- Le HEAD ne contient pas tout le travail. Le socle magie/talents a été capturé depuis un arbre non commité, puis deux corrections finales ont été reprises. Conserver tous les fichiers non suivis et les reçus ignorés nécessaires; ne pas reconstruire le chantier depuis HEAD ou le seul diff des fichiers suivis.
- Capture initiale : `tmp/divin/base-manifest.json`; copie externe de référence : `C:/Users/arnot/.codex/visualizations/2026/10/17/01a14914-3101-7b82-acfd-286e9fe5a543/divin-baseline`. Delta courant : `tmp/divin/change-manifest.json`.
- Main `E:/Outil MJ Warhammer` est sur `08ce45d24faa1727a8155716ade5f5dcba09efd4`; son statut a été contrôlé propre. Vérifier à nouveau, sans l’utiliser pour écrire ce chantier.
- Version locale de départ : 3.15.0. Dernière recette du code : 2 308 tests Node, dont 54 tests divins, et 11 commandes vertes. Reçu : `tmp/divin/recipe-receipt.json`. Ces résultats prouvent le premier incrément, pas le futur périmètre exhaustif.
- Registre actuel : 22 identités, soit 6 bénédictions, 15 miracles et Haine sacrée. Quatre effets sont appliqués : Bataille, Courage, Bouclier et Soleil. Huit prières et Haine sacrée n’ont pas tous leurs raccordements mécaniques. Les talents d’accès ne s’ajoutent pas comme effets à ce décompte.
- Les neuf miracles supplémentaires ont une source V4 retrouvée dans Up in Arms p.79. Le registre garde encore le statut historique de source non retrouvée : première correction prévue, sans déblocage automatique. Le supplément a une ligne de durée erronée pour Sur un Terrain Mortel.

## 4 Corpus fermé et exploration de toutes les pages

[DIVIN_CORPUS_LIVRES.json](DIVIN_CORPUS_LIVRES.json) contient les chemins absolus, tailles, SHA-256 et nombres de pages vérifiés : **17 livres, 2 694 pages physiques et 26 pages sans texte extrait**. Les empreintes actuelles correspondent à l’inventaire de la bibliothèque. La vérification de métadonnées ne vaut pas lecture des règles; le nouvel audit exhaustif démarre avec des compteurs de pages contrôlées à zéro.

| Livre | Pages physiques | Parcours à prévoir en complément du passage de toutes les pages |
| --- | ---: | --- |
| Livre de base V5 EN v2 | 379 | Autorité du socle : dix cultes impériaux, autres panthéons, dieux nains/elfes/halflings/Chaos, 19 bénédictions, 60 miracles, talents, Tests, combat, États, temps, magie et renvois. |
| Livre de base FR | 355 | Comparaison française V4, variantes et dédoublonnage; aucune promotion silencieuse de V4 en autorité V5. |
| Up in arms | 143 | Culte de Myrmidia et neuf miracles p.79; règles militaires et dépendances. |
| Deft Steps Light Fingers | 144 | Ranald, aspects, Taal et règles/variantes de culte; pages repérées par index à confirmer visuellement. |
| Archives of the Empire Volume 1 | 96 | Religions et cultes régionaux, dieux ancêtres et règles associées. |
| Archives of the Empire 2 | 95 | Croyances/rites ogres et liens entre religion et magie; distinguer les familles. |
| Archives of the Empire 3 | 95 | Dieux mineurs, Old Faith, cultes et miracles supplémentaires. |
| Lustria EN | 224 | Religions locales, Skeggi, Hommes-Lézards/Anciens, rites, pouvoirs, dieu-serpent et effets de scène; pistes de sommaire à vérifier, notamment p.157 et p.219. |
| Supplément Elfe High elf Players Guide v2 | 128 | Cadai/Cytharai, cultes, runes, Vaul/Hoeth/Mathlann et dépendances magiques. |
| Supplément Elfe Noir Temple of Spite v2 | 128 | Khaine, rites, dons, pactes, traditions et interactions de magie noire. |
| Supplément Vampire Sylvania The Cursed County v2 | 96 | Cultes et pratiques régionaux, traditions funéraires, Old Faith et pouvoirs concernés. |
| The Imperial Zoo | 139 | Capacités religieuses des créatures, profils et traits référencés; ouvrir notamment les pistes Kurnous et Spider-god/leurs miracles repérées dans le texte, sans présumer leur traitement. |
| Tribes and Tribulations EN | 112 | Dieux/rites tribaux, Gork/Mork, Grande Gueule et traditions shamaniques. |
| Sea Wardens of Cothique | 96 | Religion/magie maritime, sanctuaires, rites et traditions elfes. |
| Dwarf Players Guide | 144 | Dieux ancêtres, cultes, vénération, runes et propriétés d’objets. |
| Lords of Stone and Steel | 96 | Cultes/temples, ancêtres, inscriptions, runes et règles d’objets/pouvoirs. |
| Winds Of Magic | 224 | Rituels, artefacts, interactions, résistance/dissipation et dépendances des traditions. |

Les pistes de cette table orientent la lecture; elles ne sont ni une preuve exhaustive de présence ni une conclusion d’absence. Vérifier édition, langue, version et éventuels errata à partir du document, pas du nom du fichier.

Pour chacun des 17 livres :

1. Vérifier le SHA-256 et la pagination. Établir la correspondance page physique/page imprimée et les pages de continuation. Tout changement du PDF rouvre les éléments concernés.
2. Parcourir **toutes les pages physiques**, sommaire, index, encadrés, tableaux, profils, notes, objets, appendices et illustrations contenant du texte inclus. Classer chaque page : candidat religieux, dépendance, hors périmètre motivé ou à examiner visuellement. Une extraction ou une recherche ne compte pas comme page lue.
3. Contrôler visuellement les 26 pages sans texte extrait pour distinguer page blanche, illustration et règle non extraite. Aucun échec OCR ne devient une conclusion d’absence.
4. Lire intégralement les règles candidates et leurs renvois; rendre les tableaux/colonnes/encadrés et pages adjacentes quand le sens dépend de la mise en page. Décomposer les clauses et relever les variantes EN/FR, alias et doublons.
5. Faire un second parcours indépendant de classification des pages. Le contrôleur doit pouvoir ajouter des candidats oubliés, y compris parmi les exclusions du premier lecteur. Les divergences sont confrontées avant clôture du livre.
6. Documenter chaque exclusion par son motif et son contexte. Employer « recherche incomplète » tant que le parcours n’est pas fini. « Non retrouvé dans le corpus exploré » exige une couverture fermée et ses preuves; ne jamais conclure sur un titre présumé seul.
7. Suivre les renvois dans les autres livres du corpus, puis les errata accessibles pertinents avec provenance et édition. Une référence à un ouvrage absent est enregistrée et présentée au MJ pour éventuel ajout; aucune règle externe n’est inventée.

Les PDF et textes intégraux privés restent hors du dépôt et du paquet applicatif. Les synthèses françaises, index, clauses, citations de pages et empreintes sont les livrables versionnables.

## 5 Registres et définition des statuts

Créer des registres distincts et reliés : livres/pages, traditions/cultes, identités, clauses, adaptations, raccordements, preuves, anomalies et décisions. Ils doivent se lire sans dépendre de l’historique d’un chat. Inventorier explicitement les catégories découvertes : prières, bénédictions, miracles, rituels/rites, magie de prêtrise, runes/artefacts, talents, dons/pactes et pouvoirs innés de créatures; chaque renvoi aboutit à une clause et un raccordement ou une exclusion motivée.

Une clause enregistre au minimum : identifiant stable; livre/version/hash; page imprimée et physique; identité et alias; culte/espèce/type d’acteur; type mécanique/narratif/mixte; déclencheur; acquisition; coûts; quotas/fenêtres d’usage/recharge; compétence/caractéristique; difficulté/DR/Avantage; jets et choix; cibles/portée/zone; faits MJ; résistance/opposition; effet quantifié; durée/fin; cumul; récupération; échec/maladresse; adaptations et décisions; contrat; point de raccordement; preuve de test et de geste; lecteurs/développeurs/vérificateurs; verdict principal.

Séparer les axes de statut :

- Source : à explorer, lue, contrôlée indépendamment, V5 explicite, V4 à adapter, adaptation décidée, contradiction ouverte.
- Développement : non commencé, développé, raccordé au chemin réel, en correction, intégré.
- Vérification : non exécuté, exécuté, testé par développeur, testé indépendamment, validé par l’agent principal.
- Exécution : automatique, fait/dé/choix MJ requis puis mécanique exécutée, rappel purement narratif, coût matériel confirmé MJ, bloqué.

Une entrée mixte est décomposée. Le statut narratif de son paragraphe ne couvre pas ses nombres, restrictions ou conséquences mécaniques. « Bloqué » reste un état provisoire de travail, jamais une fin acceptable pour une mécanique du corpus retenu. Les faits MJ et coûts matériels confirmés sont des interfaces prévues, pas des mécaniques oubliées.

Suivre séparément : pages explorées et relues; 19 effets génériques; 60 associations de bénédictions aux dix cultes; 60 miracles de base; neuf miracles Up in Arms; talents d’accès/Haine sacrée; identités et clauses supplémentaires découvertes. Ne pas compter 19 × 10 bénédictions ni annoncer un pourcentage unique trompeur. Chaque ajout de livre/identité modifie les dénominateurs avec trace.

## 6 Architecture à obtenir

| Domaine actuel | Évolution attendue et preuve d’utilisation |
| --- | --- |
| `tools/build-v5-divine-contracts.mjs`, JSON générés | Généraliser à toutes les traditions et clauses, sources par livre, adaptations, accès et schémas de formulaire. Le générateur seul produit contrats/inventaires/matrices; deux générations identiques et `--check`. |
| `v5-divine-engine.js`, `v5-divine-store.js`, `store.js` | Résolution canonique pure puis commande atomique. Acteurs de combat et hors combat; PJ/PNJ/créatures; captures d’aperçu inertes, sources/révision/faits/dérogations revalidés, idempotence et reprise. |
| `v5-roll.js`, `v5-combat-rules.js`, talents | Service de Tests commun réutilisant les mathématiques V5, avec score importé courant, États, choix d’inversion, DR, oppositions et relances/ressources à consommation unique. |
| `v5-turn.js`, `v5-effects.js`, `v5-magic-time.js`, durées magiques | Une horloge de jeu commune et des échéances typées : phases de Tour/Round, scène, minutes/heures/jours, maintien et fin conditionnelle. Le temps de campagne avance par commande explicite du MJ, pas par l’horloge réelle du PC. |
| `resolution.js`, équipement, dégâts magiques | Résolveurs communs des attaques, protections, Blessures/critiques, mort et résurrection. Provenance divine/arcane/runique/objet préservée; Haine sacrée uniquement sur le cas source autorisé, au stade sourcé du calcul. |
| Couches magiques/divines, traits et talents | Projections uniques, cumul par règle, suppression temporaire et révocation ciblée. Les événements suivants utilisent réellement les effets; on conserve les sources innées, équipées et acquises. |
| `fiche-sync.js`, profils et participants | Socle importé séparé des conséquences locales. Rechargement, réimport et resynchronisation n’appliquent pas deux fois un bonus et n’effacent pas une conséquence locale durable. Aucune écriture de fiche externe. |
| Scènes, profils et ressources locales | Sujets hors combat, entités/serviteurs/invocations, objets affectés, maladies, critiques, mort et effets durables; données structurées et réversibles. Les coûts matériels restent confirmés MJ sans débit. |
| `v5-divine-panel.js`, workspace, bibliothèque, fiches | Formulaires pilotés par les contrats, sans branche codée en dur pour un seul culte/nom. Tous les choix, dés secondaires, faits, dérogations et rappels sont accessibles en français. Les valeurs affichées égalent celles du combat. |
| Références et catalogue | Présentation française locale cohérente avec les contrats V5 et exports prêts; distinguer capture brute publique et corrections locales pour qu’un rafraîchissement ne restaure pas les erreurs V4. Source réellement modifiée = revalidation ciblée. |
| Sanitize, migration, cloud, SW et paquet | Préserver les données locales, versions et extensions utiles; rejeter les entrées invalides. Précharger les nouveaux modules et éprouver les deux clients, conflits et PWA hors ligne. |

Les noms des nouveaux modules sont à fixer dans le dossier de conception avant leurs modifications; leur responsabilité et leur API sont contrôlées par un autre agent. Il doit exister un seul calcul de Test, un seul service d’horloge et un seul événement de dégâts pour les chemins réutilisés : aucune copie de leurs mathématiques dans le moteur divin. Vérifier les régressions des chemins existants.

Le schéma d’exécution comporte contrat/version/source, acteur/sujets, contexte de scène/horloge, preuve d’accès ou dérogation, faits MJ, jets explicites, choix, effets proposés et identifiant d’exécution. L’aperçu ne modifie pas le jeu. L’application utilise la même capture, revalide les données et commet effets, consommations, journal et historique ensemble. Si une règle impose plusieurs étapes, sa machine d’états doit être durable et affichée; elle interdit répétition, consommation cachée et contournement d’une conséquence en attente.

Événements à couvrir selon les sources : avant/après Test, demande/consommation de relance, choix d’Action/cible, attaque et attaque hors Tour, Charge/désengagement, calcul des protections et Blessures, critique/mort/résurrection, acquisition/récupération d’État, début/fin de Tour/Round, changement de scène/jour, création/retrait d’entité, équipement/arme et acquisition/perte d’un talent. Chaque branche a un identifiant d’événement empêchant un second effet sur la même résolution.

## 7 Lots de réalisation et sorties obligatoires

Chaque lot est livré en incréments verticaux : source, contrat, interface, résolution réelle, persistance et tests indépendants. Un fichier compilé ou un contrat déclaré ne ferme pas un lot.

| Lot | Contenu et dépendances | Sortie contrôlable |
| --- | --- | --- |
| E0 Reprise et vérité documentaire | Vérifier worktree, empreintes, arbre non suivi, corpus, décisions et recette de départ. Réconcilier documents et générateur pour les neuf sources retrouvées, sans ouvrir leurs adaptations. | État de reprise, sauvegarde des références, registre corrigé de provenance et liste des divergences. Aucun fichier main/magie altéré. |
| E1 Audit et inventaire | Double exploration des 17 livres, puis lecture détaillée prioritaire du socle V5. Construire identités/clauses/renvois et backlog des dépendances. Peut continuer en parallèle des lots de développement après validation des premières sources. | 17 dispositions de lecture, couverture page par page, dictionnaire d’alias, clauses et adaptations sourcées. Aucun faux « introuvable ». |
| E2 Contrats et données locales | Après premières sources E1 : schéma des clauses, provenance, accès, faits, coûts MJ, temps, événements et effets; catalogue local français. Concevoir les migrations et compatibilités avant d’élargir le JSON. | Générateur déterministe, matrice par clause, JSON de contrats et modèle des sujets/conséquences locales testables; contrôle indépendant du schéma. |
| E3 Accès et sujets | Dépend E2. Droits de PJ/PNJ/créatures, cultes/traditions/acquisitions et pertes; dérogations 1 usage/scène/durable; lancement hors combat et sujets persistants. | Commandes locales motivées, révoquées/consommées au bon moment, sans booléen libre d’autorisation ni écriture externe. Tests réimport/reload/Undo. |
| E4 Tests et ressources | Dépend E2/E3. Chaîne commune des Tests : Prière, Calme, Commandement, Initiative et autres compétences nécessaires, États, Avantage/Désavantage, oppositions, inversion, Fortune/Chance et relances. Modéliser les quotas par effet/acteur/scène/jour, leurs fenêtres d’usage, réemploi et recharges. | Tests source et bornes, nouveaux dés explicites, consommation/recharge atomiques à l’événement sourcé, retry après refus de sauvegarde et absence de bonus doublé. |
| E5 Horloge et exécution | Dépend E2; s’articule avec E3/E4. Phases/temps de campagne communs, durées, événements, machine multiétapes, captures d’aperçu, commandes atomiques et cumul. | Même résultat en aperçu et au vrai événement, au milieu d’un Round, après reload/Undo et sur le second client. Conflits indécidables présentés au MJ. |
| E6 Primitives des effets étendus | Dépend E3/E4/E5. Développer par familles les raccordements communs nécessaires au livre de base : dégâts de miracle/Haine sacrée, critiques/mort/résurrection, maladies, durée longue, ressources durables, entités, objets/lieux affectés et informations mécaniques. | Chaque primitive nécessaire est verte indépendamment avant les bénédictions/miracles qui la consomment : état local effectif, provenance, temps, réimport, reload et Undo. Le registre nomme les contrats bloqués par chaque primitive manquante. |
| E7 Toutes les bénédictions | Dépend E3/E4/E5 et des primitives E6 utiles. Compléter 19 effets et 60 associations. Prioriser caractéristiques, soin, suppression d’État, relance, Calme, armes Magiques, souffle, maladies/critiques et toutes clauses recensées. | Chaque effet et chaque accès de culte passent leur recette complète. Aucune bénédiction mécanique laissée comme rappel. |
| E8 Tous les miracles de base | Dépend E3/E4/E5/E6 et des primitives utiles livrées par E7. Six miracles pour chacun des dix cultes, par petits lots de familles mécaniques et recettes complètes de culte. Inclure les quatre miracles Myrmidia encore assistés et prouver Haine sacrée sur un vrai miracle de dégâts. | 60 identités avec toutes clauses mécaniques exécutées, clauses narratives visibles, faits/dés propres à chaque cible et tests négatifs. La clôture attend les primitives E6 et tous leurs vrais raccordements; elle ne peut précéder une mécanique encore nécessaire. |
| E9 Traditions et suppléments | Audit E1 déjà disponible; implémentation après fermeture de la base E6/E7/E8. Adapter les neuf miracles Up in Arms, puis toutes identités restantes des 17 livres, y compris runes/rites/dons/pactes religieux et capacités de créatures. Réutiliser les moteurs déjà contrôlés, compléter leurs manques nécessaires. | Correspondance par clause source ancienne/V5/décision, effets réels et contrôle indépendant avant déblocage. Aucun renvoi religieux laissé hors périmètre parce que le vieux lot magie le différait. |
| E10 Cohérence et recettes globales | Intégration UI/catalogue/import/cloud/offline en continu dans chaque lot; fermeture globale après E1 à E9. Réconcilier tous dénominateurs, dérogations, textes, migrations et dépendances croisées. | Matrices complètes, contrôles croisés multi-familles, recettes indépendantes et aucune anomalie mécanique restante. |
| E11 Validation finale principale | Agent principal confronte sources, implémentation et résultats indépendants sur l’arbre final figé, réexécute la recette et sonde des contre-exemples. | Rapport final précis, manifeste de livraison et paquet local vérifié. La fusion/publication reste une étape distincte non exécutée. |

Une durée, un coût en ressource ou une règle de résistance ne peuvent être omis pour faire passer un effet. Le catalogue et les vues de consultation sont livrés au même état que les contrats, sans le décalage V4/V5 actuel.

## 8 Couverture des raccordements sensibles

| Famille | Chemin réel à prouver |
| --- | --- |
| Haine sacrée | Dégâts identifiés comme miracle, talent réellement acquis, utilisation conforme à la source, bon stade du calcul, multi-cibles et protections, aucun bonus sur Soleil/attaque ordinaire/sort arcane; une seule application et Undo exact. |
| Conscience et Protection | Déclenchement lors de la violation/attaque, Test de Calme avec difficulté sourcée, décision d’Action/cible effectivement respectée; rappel des circonstances à décider par le MJ. |
| Chance et relances | Prochain Test admissible raté, second jet explicite, nouveau résultat utilisé, consommation/expiration et interaction avec ressources ou autres relances. |
| Droiture et Lance | Arme réellement affectée/tenue, propriétés Magique/Dévastatrice sourcées, résolution de dégâts/immunités qui les utilise, restitution de la seule contribution temporaire. |
| Frénésie, Drillé, Terreur et Sans peur | Trait/talent temporaire et circonstances de psychologie réellement pris en compte par actions et Tests, y compris version propre aux créatures et sources multiples. |
| Œil et autres serviteurs | Profil sourcé, Tests utilisant les capacités correctes, entité liée au prêtre, durée/contrôle/destruction/retour. Le MJ reste responsable de l’information de scène qui n’existe pas dans les données. |
| Attaques supplémentaires | Bon événement/arme/cible, Test requis, ordre de résolution et consommation unique hors Tour, sans inventer une nouvelle Action ordinaire. |
| Blessures et états durables | Soins/plafonds/PA/résistance, critiques, perte/restauration de capacités, mort datée et résurrection selon source. Ne pas confondre zéro PV et mort; préserver `dead/isDead` et les champs canoniques existants. |
| Informations et effets de scène | Révélation de données connues, choix ou information MJ nécessaire, résultat structuré lorsqu’il est mécanique; aucune invention d’information secrète. Quantités, sujets et échéances des effets mesurables sont conservés. |
| Coûts matériels | Affichage de l’exigence source et confirmation MJ explicite avant application; reçu mentionnant qu’aucun débit local n’a été effectué. Les ressources non matérielles prévues par les règles restent suivies mécaniquement. |

## 9 Développement et contrôles par des agents distincts

Utiliser des sous-agents **Luna**, comme demandé pour ce chantier, et l’agent principal comme orchestrateur et validateur final. Adapter le nombre de lots actifs aux places disponibles; avec quatre places, garder le principal et au plus trois sous-agents simultanés. L’épuisement du contexte d’un agent déclenche une passation de lot, pas un raccourci de couverture.

Pour chaque lot :

1. Un lecteur construit les clauses et pièces source. Un autre lecteur les confronte, avec contrôle visuel des tableaux/conditions et recherche de clauses oubliées. Le développeur ne peut pas être l’unique autorité documentaire de son effet.
2. Un ou plusieurs développeurs reçoivent un périmètre de fichiers, des dépendances, les décisions et des critères observables. Ils écrivent le code et leurs tests de développement.
3. **D’autres sous-agents**, n’ayant pas développé le lot contrôlé, conçoivent et exécutent les tests adversariaux, vérifient le moteur et les sources, puis les gestes UI, import, persistance, temps et synchronisation. Ils rendent preuves et anomalies au principal. Ne pas leur demander seulement de relancer les tests des auteurs.
4. Les développeurs corrigent les anomalies. Ils ne changent pas les attentes des tests indépendants pour rendre leur code vert; toute contestation d’attente est tranchée par le principal avec la source et le contrôleur.
5. Le contrôle indépendant est rejoué sur la correction. Faire au minimum une passe sources/clauses, une passe fonctionnelle/adversariale et une passe d’intégration/régression; répéter jusqu’à résolution des problèmes. Une rotation de rôles est possible entre lots, pas l’auto-validation du même lot.
6. Le principal vérifie les preuves, arbitre les désaccords techniques, sollicite le MJ pour les choix de règles indécidables et rend le verdict final. Son intégration éventuelle de fichiers doit elle aussi être contrôlée par un autre agent.

Chaque anomalie porte : priorité, clause, source/page, préconditions, reproduction, attendu/observé, effet pratique, fichiers/lignes, preuve rouge, correction et preuve verte. Ne pas abaisser une anomalie mécanique au rang narratif ou « acceptable » pour fermer le lot. Les nouvelles mécaniques restent incomplètes tant que leur comportement réel n’a pas de preuve indépendante.

## 10 Recettes requises

Les tests unitaires vérifient les règles; les contrôles Store et navigateur prouvent leurs raccordements. La recette finale doit couvrir :

- Tous types d’acteurs, talents/rangs/spécialisations, cultes, prières connues, restrictions et dérogations consommées/révoquées à leur bonne portée; vraie forme des fiches importées.
- Score courant contre socle, casse/alias, valeurs absentes/invalides/contradictoires, États, modificateurs de DR, inversion, Avantage/Désavantage, oppositions, ressources et relances. Aucun jet inventé et aucun choix omis.
- Quotas d’usage, recharges, restrictions de répétition et fenêtres par acteur/effet/scène/jour : consommation au bon événement, échec/succès selon source, réemploi après fin et distinction de plusieurs auteurs. Aperçu, double clic, changement de scène, reload et Undo ne doivent ni consommer ni recharger une fois de trop.
- Déclenchement du Courroux aux frontières unité/Péché, maladresse et réussite, chaque plage de la table, modificateur, conséquences à plusieurs étapes, absence de double décrément et impossibilité de contourner un état en attente.
- Bornes de DR, extensions, cibles multiples/camps mixtes, limites de portée, restrictions, alliés/adversaires, regard/visibilité et faits MJ inconnus/faux; Instant, Vous, zones et durées particulières.
- Vraies attaques, Tests, dégâts/PA/Protections, traits, talents, États et actions suivants. Contrôler la valeur affichée et la valeur consommée, pas seulement une couche stockée ou `applied=true`.
- Durées en milieu de Tour/Round, transitions réelles, temps hors combat, fin de scène, maintien, interruption, retrait de l’auteur/cible, fin manuelle, suppression partagée et conservation de toutes les autres sources.
- Préparation sans mutation; captures et contrats forgés/altérés, méthodes `toJSON`, aperçu inconnu/évincé, état ou source périmés, double clic, double événement, répétition distante, sauvegarde refusée et reprise avec mêmes dés.
- Sauvegarde, rechargement puis Annuler/Rétablir; réimport de fiche, migration d’ancienne version, états incomplets/corrompus; pas de double bonus ou perte de donnée locale durable. Préserver les extensions inconnues légitimes.
- Deux clients avec IndexedDB natif et émulateurs locaux : application, expiration, dérogation, conséquence durable, conflit hors ligne, accusé perdu, rejouement et Undo/Redo. Aucune recette ne doit toucher une base de production.
- Interface par vrais gestes souris/clavier à 1440 et 390 px, sombre/parchemin : tous formulaires/familles, dés secondaires, confirmations, effets, rappels, fin et récupération. Un appel API dans le navigateur ne vaut pas une recette de formulaire; le scénario Soleil complet doit notamment être ajouté.
- Régressions V4/V5 et magie/talents/équipement/scènes; catalogue local cohérent après rafraîchissement des références. Générations identiques et contrôle de toutes nouvelles ressources SW.
- Paquet final, empreintes des ressources, lancement à froid, migration du cache, véritable coupure réseau, PWA hors ligne et IndexedDB. Le navigateur mobile simulé et le téléphone physique sont rapportés distinctement.

Les familles purement narratives ont une recette d’accessibilité du rappel français, de source, de déclenchement et de non-mutation indue. Les coûts matériels ont une recette de confirmation et d’absence de débit automatique. Ces preuves sont séparées du nombre des mécaniques exécutées.

## 11 Questions de règles à traiter au fil de la lecture

Les dix choix de construction du plan sont reçus et consignés; aucune réponse utilisateur ne manque pour lancer le programme défini. Les points ci-dessous nécessitent d’abord une recherche source, pas une nouvelle question de préférence générale :

- Durée/paramètres de Sur un Terrain Mortel, avec recherche d’errata de la page 79 avant toute proposition de convention.
- Conversion des bonus de Tests V4 sans équivalent V5 explicite, portée caractéristique entière/Bonus et difficulté des Tests secondaires.
- Règle d’expiration exacte et cas de milieu de Round; interactions entre effets divins, magiques, runiques et d’objets.
- Jet qui déclenche les Péchés/Courroux après inversion ou relance, ordre des événements et conséquences simultanées.
- Étendue des pertes/restaurations de talents, immunités ou exceptions de créatures; acquisitions héritées de tradition qui ne passent pas par Béni/Invocation humain.
- Sens mécanique des nouveaux pouvoirs/rites, renvois manquants et contradictions entre versions découvertes dans les 17 livres.

Quand une question reste indécidable : créer une fiche avec sources/pages, lecture des deux contrôleurs, comportement actuel, interprétations possibles et effets sur le jeu; proposer un sélecteur au MJ, garder le point en attente et poursuivre les lots indépendants. Ne pas convertir l’écoulement du temps ou une option précochée en décision. Une réponse reçue met à jour la règle, son identifiant de décision, le générateur et ses tests; la clôture attend la résolution des cas nécessaires.

## 12 Critères de fin du chantier

La fin est autorisée seulement si tous les points suivants sont vrais sur le même arbre final :

1. Les 2 694 pages des 17 livres ont une disposition de lecture et un contrôle indépendant; les pages sans texte et toutes les contradictions de classement sont résolues. Les nouveaux livres éventuellement ajoutés ont le même traitement.
2. Toutes les identités et clauses religieuses du corpus sont recensées, avec provenance et décisions. Aucun candidat, renvoi pertinent, mécanique bloquée/non raccordée ou adaptation nécessaire sans décision ne reste caché dans une catégorie narrative/hors périmètre.
3. Chaque mécanique est utilisable sur les acteurs/sujets concernés, en combat et hors combat lorsque prévu; les faits MJ et confirmations matérielles passent par l’interface décidée. Aucune opération mécanique encore demandée au MJ hors outil ne remplace un raccordement requis.
4. Chaque rappel purement narratif/commandement utile est disponible en français, contextualisé et sourcé, sans prétendre avoir appliqué un effet mécanique.
5. Générateur, catalogue local, bibliothèque de consultation, contrats, UI, import, commandes, résolutions, temps, persistance et projections sont cohérents. Toutes les décisions reçues sont appliquées et vérifiées.
6. Les tests et recettes indépendants passent; les défauts de règle, intégration, données, UI ou persistance découverts sont corrigés et contrôlés de nouveau. Un écran vert ciblé ou un total de tests n’est pas une preuve de couverture des clauses.
7. Le principal a confronté l’ensemble, exécuté la recette finale et validé le manifeste, le paquet et les compteurs bruts par catégorie. Il distingue clairement faits testés, validation sur téléphone physique éventuellement absente et production non exécutée.
8. Le livrable reste local, préserve main et les travaux parallèles, ne contient pas de PDF privé et possède un dossier de reprise complet. Fusion et publication attendent une demande distincte.

## 13 Passage entre fenêtres

À la fin de chaque fenêtre : sauvegarder les fichiers, actualiser le manifeste et les registres, noter les lots/clauses réellement fermés, anomalies et questions restantes, les agents auteurs/contrôleurs et les commandes utiles. Les reçus rouges historiques restent séparés du verdict courant. Ne pas perdre les fichiers non suivis ni les preuves locales ignorées par Git.

La fenêtre suivante commence par [DIVIN_PASSATION_FENETRE_SUIVANTE.md](DIVIN_PASSATION_FENETRE_SUIVANTE.md), ce plan, les décisions et les empreintes. Elle ne recrée pas le worktree ni les choix déjà reçus. Son premier travail est E0, puis E1/E2 et les dépendances; elle continue jusqu’à fermeture du périmètre, en passant le relais aussi souvent que nécessaire sans abaisser les critères de fin.
