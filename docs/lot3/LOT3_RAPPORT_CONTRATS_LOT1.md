# Contrats Domaines V5 — rapport du lot 1

11 octobre 2026. Travail local sur `codex/lot2-talents-v5`, sans commit ni publication. Périmètre : **68 identités**, dont les cinq paires d’alias conservées. D-21 annulée selon le brief révisé : Silence Arcane et Arc coruscant ne sont pas ajoutés ; Silence d’Ulgu et l’Arc de T’Essla Winds of Magic (NI 7, une cible) restent conservés. Les autres familles ne sont pas certifiées par ce lot.

## Résultat

**22 conformes dans les scénarios calculatoires sourcés, 43 données MJ nécessaires, 3 rappels ; aucune identité du lot encore classée anomalie ou non vérifiée.** Ces statuts distinguent ce que les tests exécutent de ce que le MJ doit encore fournir ou jouer. Ils ne constituent pas une certification de toutes les situations d’une session réelle.

Les 22 conformes : Égide d’Aqshy, Bouclier céruléen, Second et Premier Signes d’Amul, Robe scintillante, Incarnation de Wyssan, Serres d’Ambre, Peau du Chasseur, Forme Sauvage de Wyssan, Écorce, Pensée rapide, Clarté d’esprit, Filet d’Amyntok, Vitesse de pensée, Faux de Shyish, Voile Pourpre de Shyish, Vortex d’Âmes, Vol de Vie, Portail d’Ombre, Ombres Étrangleuses, Miasme mystifiant, Pas d’Ombre.

Les preuves et raisons individuelles sont dans le [suivi exhaustif](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), ses données JSON et les [fiches corrigées](LOT3_FICHES_CORRECTION_CONTRATS.md). Les [68 reçus Store](LOT3_PREUVES_CONTRATS_LOT1.json) conservent les résultats observés avec leurs faits synthétiques déclarés.

Les corrections concernent notamment les profils d’armes, les effets récurrents aux vraies échéances, les conditions maintenues par un sort, les cibles exemptées, les objets désignés, les paliers d’encombrement par cible et les pertes réelles après Protection. Le Destrier est un participant séparé ; aube, fin déclarée et dissipation retirent sa monture liée. Expiration et Undo conservent les autres couches et les Blessures subies.

Pages relues : V5 245–255 pour les sorts, 131 pour le seuil stupéfiant −5, 169 pour la suffocation/chute, 299 pour l’encombrement, 325–327 pour les animaux, 360 pour la Régénération ; cadrage du 11 octobre prioritaire. Aucun ingrédient ajouté.

## Clauses restant explicitement au MJ

- Zones, obstacles, orientations, regards, trajectoires et destinations : le combat ne stocke pas la géométrie. Présence et traversées sont déclarées ; les conséquences chiffrées se calculent ensuite.
- Purification : matière corruptrice, durée nécessaire et entretien ; le temps de nettoyage et la nature de la corruption ne sont pas des données du combat.
- Chance commune d’Ironie du Destin, relance imposée de Malédiction, options de Chef de guerre/qualités d’armes : reçus ou rappels chiffrés ; pool partagé, commandement et édition permanente d’inventaire restent assistés.
- Lumière guérisseuse : Corruption récente et Test Hysh facultatif ; Cautérisation : cicatrice ; Caresse : perte permanente de Bmax ; Creuset/Forge/Or : inventaire et valeur. Le combat conserve le reçu ; les fiches permanentes restent à mettre à jour séparément.
- Illusions et Effacement d’esprit : apparence, animation, souvenirs et choix d’oubli permanent ; aucun bonus de combat inventé. Détection, mouvement sous Miasme et fin déclarée d’Invisibilité ont leurs contrôles.
- Destrier : exposition initiale et aube saisies ; changement d’éclairage, Test d’Équitation et hauteur réelle de chute restent à déclarer/jouer. Régénération : quantité récupérable hors feu et Critique éligible sont saisis ; le combat ne connaît pas cette provenance des blessures.
- Derniers Mots, Graisse de la Terre et Relief du terrain : communication, subsistance et carte mentale restent des rappels avec admissibilité et délais expliqués.

**Arbitrage de règles bloquant : aucun.** Deux choix de produit restent au MJ pour une livraison suivante :

1. Catalogue : **A**, remplacer les descriptions par les profils V5 corrigés ; **B**, conserver les textes historiques avec édition et avertissement visibles.
2. Clauses assistées : **A**, développer ensuite les compteurs/procédures dédiés (pool de Chance, entretien, mémoire, inventaire) ; **B**, garder les reçus et leur résolution manuelle explicitement annoncée.

## Catalogue public en contradiction

Le fichier public est conservé à l’empreinte du worktree après la révision D-21. Contradictions directement constatées dans ses descriptions/paramètres :

| Sort | Texte public conservé | Contrat V5 retenu |
| --- | --- | --- |
| Cautérisation | NI4, 1d10, Calme, Inconscient à −6 | NI2, 1 ou 1+DR si Feu, Résistance, Sonné à ≤−5 |
| Cœurs enflammés | NI8, portée FM, durée BFM, trois talents | NI5, Vous, zone Bonus Soc, instantané, alliés, Frénésie facultative |
| Serres d’Ambre | NI6, DR+BF+BFM | NI3, BF+4, Magique, retrait Inoffensive, Hémorragique après Blessures |
| Forme bestiale | BFM minutes, ancien bestiaire, Craintif conservé | Endurance minutes, pp.325–327, M remplacé, Craintif/Bestial exclus, équipement lâché |
| Lance d’Ambre | NI8, projectile +12 et ligne de rebonds | NI10, portée F, une cible maximum, +8, localisation choisie |
| Transmutation de Chamon | Dégâts BFM seulement | Projectile +9, ignore BE/PA, états maintenus et suffocation |
| Creuset de Chamon | Dégâts BFM, ignore BE | Projectile +6 si objet porté, ignore PA, BE conservé ; objet tenu lâché |
| Lumière guérisseuse | NI9, BI+BFM, Résistance de la cible | NI8, BI, Focalisation Hysh −3 du lanceur pour Corruption récente |
| Caresse de Laniph | NI4, soin du lanceur | NI6, perte de Bmax et gain de réserve par tranche de 2 B réelles |
| Vol de Vie | NI7, Exténué cible, soin arrondi supérieur | NI8, moitié arrondie inférieure des B réelles, retrait fatigue du lanceur |
| Destrier d’Ombre | Vision nocturne, Furtif et Foulée ajoutés | Vision dans le noir ; ni Furtif ni Foulée supplémentaires |

Les autres écarts historiques et les lignes regroupant des sorts hors lot sont conservés dans les fiches. Le tableau ci-dessus ne prétend pas être une réécriture complète du catalogue.

## Comptages et vérifications

Matrice avant : **277 / 123 calculables / 132 MJ / 22 rappels / 0 restant**. Après génération : **277 / 110 calculables / 145 MJ / 22 rappels / 0 restant**. Le déplacement vers MJ traduit les faits bloquants et clauses assistées explicités ; « calculable » ne certifie pas toutes les phrases du livre. Les ajouts D-21 étaient présents dans la première copie de travail ; la révision du brief a été intégrée avant la validation finale.

- **97/97 tests Domaines** : 68 identités et 29 variantes. Aperçu puis application Store, rechargement, Undo ; expiration par `createCombatEngine(store).nextTurn()` pour les 48 scénarios créant une couche temporisée. Les fixtures rejoignent la dernière échéance avant cette vraie fin de tour.
- **`node --test` : 1 448/1 448**, zéro échec.
- **Quatre recettes navigateur vertes** : `browser-magic-v5-smoke.mjs`, `lot3-v5-magic-2b-ui-browser.mjs`, `lot2-combat-v5-browser.mjs`, `lot3-v5-domaines-ui-browser.mjs`. La nouvelle recette effectue 17 saisies de faits, le choix des observateurs du bannissement et cinq clauses actives, dont plusieurs d10 de Protection et refus sans dés.
- **Deux générations successives identiques**, JSON et matrice comparés par SHA-256. Le générateur de couverture des talents n’a pas été lancé ; catalogue public et couverture talents gardent leurs empreintes.

Rouges observés avant correction : premier passage, 41 échecs sur les 69 identités de la copie initiale (dont des fixtures d’admissibilité ensuite corrigées), puis sondes dédiées armes, pertes réelles, Bannissement, Régénération, Clarté, Filet, Destrier, Creuset, seuil de Cautérisation, armure mixte, encombrement par cible, Cœurs, éclair du Fléau, Protection récurrente et fin anticipée d’invocation. Les options déjà correctes et les nouvelles vérifications de surpuissance n’ont pas toutes été vues rouges ; aucun rouge fictif n’est revendiqué. Les attentes anciennes corrigées sont reliées aux pages dans les tests.
