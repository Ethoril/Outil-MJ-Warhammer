# Corrections après la seconde relecture — Lot 3, 3.15.0

> Rapport historique du 15 octobre. Les cinq reliquats du vérificateur final et les reçus actuels sont dans [le rapport du 17 octobre](LOT3_RAPPORT_RELIQUATS_2026_10_17.md). Le nouveau texte d’Apothéose et les libellés supplémentaires remplacent ces descriptions historiques.

15 octobre 2026. **Les 26 points et les dix points de règle sont traités localement.** La recette complète comporte **21 commandes vertes**, dont **2222/2222 tests Node**, les émulateurs Firebase locaux et le paquet exporté hors ligne. Le sous-cas « doublon fin de Round » n’a pas été reproduit : le scénario réel ajouté est vert, sans prétendre avoir observé puis corrigé ce doublon.

Travail dans `codex/lot2-talents-v5`, HEAD `fb0f280150cdbdab1af220163abfaa491e2156ee`. Version maintenue à **3.15.0**. Aucun commit, push, fusion ni déploiement. Les modifications locales préexistantes sont conservées. Aucune sauvegarde de tests n’a été copiée dans tmp/.

## Preuves et lecture des résultats

Les points ci-dessous renvoient au [cahier des charges](LOT3_RELECTURE_2_CLAUDE.md) et au [brief de correction](LOT3_BRIEF_CHATGPT_CORRECTIONS_RELECTURE_2.md).

- **M** : [tests/lot3-v5-relecture2-magic.test.js](../../tests/lot3-v5-relecture2-magic.test.js)
- **S** : [tests/lot3-v5-relecture2-spells.test.js](../../tests/lot3-v5-relecture2-spells.test.js)
- **E** : [tests/lot3-v5-relecture2-state.test.js](../../tests/lot3-v5-relecture2-state.test.js)
- **C** : [tests/lot3-v5-relecture2-coverage.test.js](../../tests/lot3-v5-relecture2-coverage.test.js)
- **T** : [tests/lot3-v5-relecture2-catalogue.test.js](../../tests/lot3-v5-relecture2-catalogue.test.js)
- **U** : [contrôles UI réels](../../tests/lot3-v5-relecture2-ui-browser.mjs), quatre configurations (1440/390 px, sombre/parchemin), plus [smoke par gestes](../../tests/browser-magic-v5-smoke.mjs).
- **H** : [historique réel après rechargement](../../tests/lot3-v5-relecture2-history-browser.mjs), IndexedDB, 1440/390 px.

Rouges conservés : `tmp/lot3/relecture2-{magic,spells,state,coverage,catalogue,ui}-red.log`, `relecture2-ui-channel-red.log`, `relecture2-ui-double-red.log` et `relecture2-fiche-partial-red.log`. Les tests groupés s’arrêtent à la première assertion en échec : un « rouge de groupe » n’est pas présenté comme un rouge isolé de chacune des assertions suivantes. Les exceptions explicites figurent dans le tableau (historique, doublon non reproduit, descriptions déjà conformes). Les erreurs de mise au point de fixtures ne sont pas utilisées comme preuve métier.

Les PDF locaux ont été consultés en lecture seule, notamment Livre de base V5 EN v2 p.169, 236–237, 242–243, 245–246, 248–249, 251, 254 et 363 ; Winds of Magic p.135–136, 146 et 149 ; HEPG p.86–89. Le renvoi de suffocation du catalogue a été corrigé à **169**, conformément au livre V5 consulté, au lieu de reprendre l’ancien renvoi 181.

## Les 26 points

| Point | Statut | Résultat concret | Test / preuve | Rouge avant correction |
| --- | --- | --- | --- | --- |
| 1 | Fait | La réaction ne paie que ses propres reçus Cadai ; aucune rune du lanceur n’est débitée au dissipateur. Application Store et Undo vérifiés. | M / R2-01 | M |
| 2 | Fait | Réduction appliquée aux dégâts non plafonnés, puis plafond aux B restants : 5 B, dégâts nets 10, réduction 3 → 0 B. Undo restaure 5 B. | S / R2-02 | S |
| 3 | Fait | Traits temporaires conservés par Participant, sauvegarde et rechargement ; retirés au retour. Araignée : Grimpeur, Toile et Vision dans le noir. Bestial reste exclu conformément à la règle de transformation. | S / R2-03 | S |
| 4 | Fait | La dissipation en réaction reçoit round:turnIndex ; Mage de guerre du tour précédent ne la bloque plus. Une réaction ne marque pas magicAttemptTurn. | M / R2-04 et 01 | M |
| 5 | Fait | Suppression de la pénalité d’armure dans le Test de dissipation. | M / R2-05 | M |
| 6 | Fait | Pause et Interruption restent disponibles si muet, Surpris ou Inconscient ; gardes réservées aux Tests magiques concernés. | M / R2-06 | M |
| 7 | Fait | Reçu Cadai d’incident filtré en Focalisation comme en Incantation : aucun débit si le jet ne sert pas. | M / R2-07 | M |
| 8 | Fait | La lecture de wind envoyé par l’interface active le +1 DR de Couronne de Flamme en Focalisation. | M / R2-08 | M |
| 9 | Fait | La Pause utilise Résistance sans la restriction de Fortune Capricieuse réservée aux Tests magiques. | M / R2-09 | M |
| 10 | Fait | cannotBeSurprised refuse l’acquisition de Surpris ; fearImmune et terrorAsFear sont lus par la résolution de psychologie. Les autres états sans lecteur mécanique deviennent des rappels explicites. Le scanner échoue sur un drapeau inventé sans lecteur et hors liste. | S / R2-10 ; C / R2-10 | S, C |
| 11 | Fait | Sonde sur cible à 0 B, ressources temporaires Destin/Chance et déclenchements réels. Mort rapide, Troisième Signe et Illuminer l’édifice deviennent calculables ; Forêt d’Épines et Doppelgänger restent bloqués sans leur fait de précondition. | C / R2-11 ; génération de la matrice | C |
| 12 | Fait | Démon/non-vivant déterminés par traits, étiquettes et isDaemon, sans lecture du nom. Démonologue reste vivant ; E manquante bloque le Fléau. Pas de cumul sur le Démon déjà affaibli. | S / R2-12 | S, rouge de groupe |
| 13 | Fait | Attribut des Ombres détecté par ward, apModifiers, damageReduction ou apFloor, sans dépendance au nom du sort. | S / R2-13 | S |
| 14 | Fait | Fait targetTests[id].decapitated lu ; contrôle par cible visible pour Apothéose Verdoyante. | S / R2-14 ; U | S, U |
| 15 | Fait | Le rollField spécifique au contrat (resistanceRoll, dodgeRoll…) prime sur le roll générique de la cible. | S / R2-15 | S |
| 16 | Fait | Exception de cuir en Ghur fondée sur le matériau explicite, sans se laisser tromper par le nom d’une armure métallique. | M / R2-16 | M |
| 17 | Fait | Option aoe retirée de Lumière aveuglante dans le générateur ; contrat régénéré. | S / R2-17 | S |
| 18 | Fait | Boutons d’historique rafraîchis après Store.ready ; Undo/Redo et raccourcis attendent le résultat. Vrai rechargement IndexedDB puis clic Annuler ; échec asynchrone sans toast mensonger. | H, 1440 et 390 px | Non : test navigateur ajouté après le correctif |
| 19 | Fait | Lignes null/non-objet filtrées à l’import des sorts, talents et compétences ; rendu défensif de la fiche. | E / R2-19 ; recettes navigateur | E |
| 20 | Fait | Surpuissance limitée aux options du contrat ; Tests et dés secondaires conditionnels ; Cadai réservé aux mages concernés ; Temps écoulé dans les panneaux magiques ; Protection filtrée selon l’attaque. Erreurs traduites et budget négatif transmis au validateur. Un double fait apparaître le dé d’incident. | U ; smoke magique ; tests verification-9 | U, channel et double ; tous les sous-cas n’ont pas un rouge isolé |
| 21 | Fait | Incantation et Focalisation masquées sous forme animale ; gestion magique restante accessible pour faire expirer la forme. | U ; smoke magique (transformation → temps → retour) | U |
| 22 | Fait, avec réserve de reproduction | Incident mineur sans undefined ; cible à 0 B exclue des dés de Blizzard ; auteur absent signalé. Le vrai moteur de fin de Tour produit une seule entrée de fin de Round pour l’acteur sondé : doublon initial non reproduit, aucun correctif artificiel sur ce sous-cas. | E / trois R2-22 ; vraie createCombatEngine.nextTurn | E pour incident/Blizzard ; pas de rouge constaté pour le doublon |
| 23 | Fait | Réserve sans type valide remise à zéro ; forme avec durée négative ou caractéristique non numérique rejetée. | E / R2-23 ; tests de sanitisation hostile | E |
| 24 | Fait | Descriptions V5 et reminders corrigés : Égide 7+, Bouclier +3 PA/6 Dégâts au bras, Mur +4/longueur, Second Signe 3 Chance, Wyssan V5, Initiative pour Vision/Souffle, Source en pintes, Perception opposée, Choc et Filet, Langue des Bêtes, Carreau, respiration et suffocation p.169. | T / 16 tests de catalogue ; parité des 277 contrats | T |
| 25 | Fait | Difficultés HEPG en libellés V5 ; Esprit du Foyer détruit par l’eau dans son profil/rappel ; Toucher doré FM × d10 minutes et surpuissance de durée ; Toile 40 Enchevêtré. Colérique et Flamme Inextinguible étaient déjà conformes : aucune cellule changée pour eux. | T ; recettes catalogue et domaines | T pour le groupe ; pas de rouge revendiqué pour les deux descriptions déjà conformes |
| 26 | Fait | Tempête dans snapshot, CSV, contrats, canonicalName, options et cas spéciaux. Migration des noms de sorts des fiches, couches et reçus ; identifiant historique conservé ; nom des personnages intact. Alias ancien accepté en lecture. | T / R2-26 ; génération stable ; catalogue UI | T |

## Les dix points de règle

| Point | Résultat | Validation / reproduction |
| --- | --- | --- |
| Protection et Critique — D-13 | Comportement conservé : Protection réussie annule dégâts et Critique, les autres effets du sort s’appliquent. Règles visibles mises à jour (Ward, V5 p.363). | Tests existants de Protection/critique et recette complète ; pas de rouge attendu pour la décision de conservation. |
| Focalisation unique — D-10 | Une compétence pour les huit Vents ; Qhaysh reste distinct. Alias colorés importés communs aux huit Vents. Scores discordants signalés au MJ : générique prioritaire, sinon première valeur commune, jamais un score propre au Vent. | M / R2-D10 ; smoke : générique 50 contre import coloré 60 → 3 DR au Test + BFM5 = 8 DR, au lieu de 9. Avertissement visible vérifié. |
| Fléau des Démons | Pas de nouvel affaiblissement sur un Démon déjà affaibli ; E obligatoire. | S / R2-12 (groupe rouge avant correction). |
| Attribut de la Mort | Même définition de cible vivante que pour la Vie : ni Artificiel, ni Éthéré, ni cible à 0 B. | S / R2-13 et Mort (groupe rouge). |
| Lames Azurées | Interaction engage pour ajouter l’adversaire qui s’engage après le lancement ; contrôle dans la gestion des effets. | E / R2-Lames Azurées, ajout puis Undo ; groupe rouge. |
| Auteur retiré du combat | Un effet périodique dont le lanceur manque produit un rappel explicite, sans inventer de dégâts. | E / R2-22 auteur absent ; groupe rouge. |
| Fiche synchronisée sous transformation | Champs remplacés différés dans le profil original ; profil animal conservé jusqu’au retour. Fiche partielle : Bmax et compétences absents ne sont pas remplacés par ceux de la bête. | C / deux R2-synchronisation. Rouge initial puis rouge spécifique fiche partielle (16 au lieu de 30 Bmax), corrigés et verts. |
| Main de Gloire | M refusé dans chosenStats ; le mode Mouvement reste un choix distinct. | S / R2-Main de Gloire ; rouge puis vert. |
| Apothéose Verdoyante, 0 DR | 0 DR finaux rend 0 B, sans plancher à 1. | S / R2-Apothéose ; rouge puis vert. |
| Épuisement | FM obligatoire quand le personnage sert au calcul ; aucun défaut à 30 ni BFM minimum de 1. | S / R2-Épuisement ; rouge puis vert. |

## Matrice et limites

La [matrice régénérée](LOT3_MATRICE_CONTRATS_V5.md) compte **277 contrats** : **147 à effet calculable**, **49 nécessitant des données MJ**, **81 rappels**, **0 contrat restant à créer**. Le total ne certifie pas chaque clause de chaque sort. Un contrat calculable peut conserver des clauses narratives ou des décisions MJ.

La sonde compare l’état réellement modifié à un témoin, compte les ressources temporaires, essaie 0 B et les interactions/déclenchements. Les marqueurs sans lecteur mécanique ne suffisent plus à déclarer le sort calculable. Les faits manquants restent bloquants ; les ingrédients, la validation complète du bestiaire et les autres limites de campagne restent hors de cette correction. Le [suivi](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), le [plan C-06](LOT3_PLAN_CORRECTION_CLAUDE.md), le [journal](LOT3_JOURNAL_3_15_0.md), la clôture et les Règles visibles ont été actualisés.

## Catalogue et classeur Excel

Snapshot, miroir CSV et contrats concordent. Les reminders reprennent les descriptions corrigées ; les tests contrôlent indépendamment les valeurs clés puis les chiffres de Protection/dégâts/durée des 277 contrats.

| Champ | Valeur |
| --- | --- |
| contentVersion | `references:91baffb889130b513c59df546f8c81ff9bf003fbc1ec47e1e23877959d4f7573` |
| catalogVersion | `sha256:2ebb39e1fd936c250a8f3a90b99bf5c3afdad337d987b4bc7a7d54256eb2638f` |
| localRevision | `2026-10-14-catalogue-v5-relecture-2` |
| publicCsvSha256 | `485e842dc14244c8cec6e48460042f490823f99c8c654d6df311924e9f936611` |

Classeur remplacé **au même emplacement** : [Magie_V5.xlsx](C:/Users/arnot/.codex/visualizations/2026/10/13/01a13662-2a3d-7f30-b363-a6104eddf4a2/excel-magic/outputs/01a13662-2a3d-7f30-b363-a6104eddf4a2/Magie_V5.xlsx). **21 cellules changées sur 20 sorts**, parité **1946/1946 cellules** avec le CSV ; styles des 1946 cellules, colonnes, table CatalogueMagieV5 et gel B2 conservés ; 277 NI numériques. Les lignes modifiées ont été ajustées à leur contenu et rendues pour contrôle visuel. [Vérification du fichier sauvegardé](../../tmp/lot3/relecture2-workbook-verification.json).

La feuille Google n’a pas été modifiée : le MJ doit reporter **seulement ces 21 cellules** avant toute livraison. Les valeurs intégrales se trouvent dans [le delta prêt à reporter](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELECTURE_2.md) ; les anciennes modifications déjà reportées n’y sont pas répétées.

| Cellule | Sort |
| --- | --- |
| G3 | Égide d’Aqshy |
| G11 | Mur de Feu |
| G27 | Bouclier céruléen |
| G29 | Le Second Signe d’Amul |
| G66 | Toucher doré |
| G75 | Apothéose |
| G76 | Destruction des Arcanes |
| G81 | Convocation Ardente |
| G83 | Glamour de Teclis |
| A89 | Tempête |
| G89 | Tempête |
| G92 | Incarnation de Wyssan |
| G98 | Langue des Bêtes |
| G161 | Filet d’Amyntok |
| G218 | Souffle |
| G224 | Vision dans l’obscurité |
| G226 | Carreau |
| G232 | Choc |
| G249 | Source |
| G259 | Ombres Étrangleuses |
| G275 | Linceul d’Invisibilité |

## Chaque commande de la recette

[Reçu final complet](../../tmp/lot3/cloture-final-recipe-receipt.json). Le contrôle de génération a exécuté deux fois les huit générateurs, comparé **13 fichiers octet à octet** et confirmé 277 contrats. Le cloud utilise uniquement le projet demo des émulateurs locaux, sans compte distant. Le test du paquet exporté vérifie le vrai Service Worker et IndexedDB, au bureau et à 390 px, puis hors ligne.

| Commande | Résultat | Durée | Log |
| --- | --- | --- | --- |
| `node tools/check-lot3-generation.mjs` | Vert (0) | 21.95 s | [tmp/lot3/cloture-generation.log](../../tmp/lot3/cloture-generation.log) |
| `node --test` | Vert (0) | 40.88 s | [tmp/lot3/cloture-node.log](../../tmp/lot3/cloture-node.log) |
| `node tests/browser-smoke.mjs` | Vert (0) | 4.99 s | [tmp/lot3/cloture-browser-smoke.log](../../tmp/lot3/cloture-browser-smoke.log) |
| `node tests/browser-startup.mjs` | Vert (0) | 6.58 s | [tmp/lot3/cloture-browser-startup.log](../../tmp/lot3/cloture-browser-startup.log) |
| `node tests/browser-references-smoke.mjs` | Vert (0) | 1.3 s | [tmp/lot3/cloture-browser-references-smoke.log](../../tmp/lot3/cloture-browser-references-smoke.log) |
| `node tests/browser-magic-v5-smoke.mjs` | Vert (0) | 7.9 s | [tmp/lot3/cloture-browser-magic-v5-smoke.log](../../tmp/lot3/cloture-browser-magic-v5-smoke.log) |
| `node tests/lot2-combat-v5-browser.mjs` | Vert (0) | 15.65 s | [tmp/lot3/cloture-lot2-combat-v5-browser.log](../../tmp/lot3/cloture-lot2-combat-v5-browser.log) |
| `node tests/lot3-v5-arcanes-mineurs-ui-browser.mjs` | Vert (0) | 9.32 s | [tmp/lot3/cloture-lot3-v5-arcanes-mineurs-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-arcanes-mineurs-ui-browser.log) |
| `node tests/lot3-v5-catalogue-5b-ui-browser.mjs` | Vert (0) | 25.17 s | [tmp/lot3/cloture-lot3-v5-catalogue-5b-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-catalogue-5b-ui-browser.log) |
| `node tests/lot3-v5-catalogue-ui-browser.mjs` | Vert (0) | 22.15 s | [tmp/lot3/cloture-lot3-v5-catalogue-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-catalogue-ui-browser.log) |
| `node tests/lot3-v5-cloture-ui-browser.mjs` | Vert (0) | 5.16 s | [tmp/lot3/cloture-ui.log](../../tmp/lot3/cloture-ui.log) |
| `node tests/lot3-v5-domaines-ui-browser.mjs` | Vert (0) | 6.14 s | [tmp/lot3/cloture-lot3-v5-domaines-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-domaines-ui-browser.log) |
| `node tests/lot3-v5-elfiques-ui-browser.mjs` | Vert (0) | 11.04 s | [tmp/lot3/cloture-lot3-v5-elfiques-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-elfiques-ui-browser.log) |
| `node tests/lot3-v5-magic-2b-ui-browser.mjs` | Vert (0) | 124.29 s | [tmp/lot3/cloture-lot3-v5-magic-2b-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-magic-2b-ui-browser.log) |
| `node tests/lot3-v5-relecture2-history-browser.mjs` | Vert (0) | 2.56 s | [tmp/lot3/cloture-lot3-v5-relecture2-history-browser.log](../../tmp/lot3/cloture-lot3-v5-relecture2-history-browser.log) |
| `node tests/lot3-v5-relecture2-ui-browser.mjs` | Vert (0) | 2.51 s | [tmp/lot3/cloture-lot3-v5-relecture2-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-relecture2-ui-browser.log) |
| `node tests/lot3-v5-wom-ui-browser.mjs` | Vert (0) | 13.51 s | [tmp/lot3/cloture-lot3-v5-wom-ui-browser.log](../../tmp/lot3/cloture-lot3-v5-wom-ui-browser.log) |
| `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs` | Vert (0) | 41.6 s | [tmp/lot3/cloture-cloud.log](../../tmp/lot3/cloture-cloud.log) |
| `node tools/build-lot3-local-release.mjs` | Vert (0) | 0.23 s | [tmp/lot3/cloture-build-release.log](../../tmp/lot3/cloture-build-release.log) |
| `node tests/lot3-v5-35-release-browser.mjs` | Vert (0) | 3.85 s | [tmp/lot3/cloture-release-browser.log](../../tmp/lot3/cloture-release-browser.log) |
| `git diff --check` | Vert (0) | 0.24 s | [tmp/lot3/cloture-diff-check.log](../../tmp/lot3/cloture-diff-check.log) |

Les corrections d’interface ont aussi nécessité d’actualiser les gestes de recette : dé d’incident après saisie du double ; absence de surpuissance Cibles sur un sort Vous ; gestion du temps ouverte par Dissipation sous forme animale ; acquisition de Haute Magie dans le profil synthétique qui teste les Cadai. Ces adaptations gardent le parcours utilisateur exécutable avec les champs conditionnels demandés.

**Reste avant une publication future** : report du nouveau delta dans la feuille Google, puis autorisation explicite de livraison et vérification des CSV publics. Aucun de ces actes externes ne fait partie de la clôture locale ici validée.
