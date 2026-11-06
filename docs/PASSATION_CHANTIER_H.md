# Passation du chantier H — écriture en retour de l'outil vers les fiches (06/11/2026)

## Objectif

Décision du MJ du 21/10/2026 (`docs/PLAN_FIN_DE_PROJET.md`, phase H) : l'outil réécrit sur la fiche du site des fiches (https://ethoril.github.io/ennemi-interieur-wfrp4/) les valeurs **durables** qu'il modifie en jeu, celles qui doivent survivre d'une séance à l'autre.

Le chantier couvre :
- les champs à ajouter à la fiche ;
- l'import étendu ;
- l'écriture en retour, avec ses règles : moment, conflits, annulation.

Toutes les phases qui le précèdent (A à G) sont livrées.

C'est un gros chantier : deux dépôts, un nouveau contrat et plusieurs sessions. **Il commence par le skill `cadrer-feature`** : spécification, critères d'acceptation, plan, puis lots.

## État de départ

| Dépôt | Où | Tête au 06/11 soir |
|---|---|---|
| Outil MJ | `E:\Outil MJ Warhammer`, prod sur `main` | **3.41.0**, `d574a33`, poussée le 06/11 |
| Site des fiches | `E:\Projet Warhammer Ennemi Intérieur\ennemi-interieur-wfrp4` (le cahier des charges cite encore l'ancien chemin `F:\Outil WRPGv4\…`) | `e6bc651` (catalogue regénéré avec Barrakul) ; dernière version publiée v2.39.2 |
| Map Display | `E:\rpg-map-display-liaison`, branche `feat/liaison-outil-mj` | `817e22f` ; hors périmètre de H |

### Ce que l'outil lit déjà (sens fiche → outil)

- `js/core/fiche-source.js` : adaptateur Firestore en **lecture seule** (projet `campagne-wrpg`, application Firebase nommée `fiches`). App Check n'est actif que sur `ethoril.github.io` : la vraie lecture ne se teste qu'en prod.
- `js/core/fiche-sync.js` (713 lignes), commande « Mettre à jour les PJ » (menu `⋯`). Elle lit `fiches/{bhelgi,caelel,elysia,hellaya,wren}`, puis :
  - met à jour les caractéristiques, l'Initiative, les PV maximum et les actions liées ;
  - lit depuis le 04/11 `fortune` (repli sur `chance`), `destin`, `peche`, `corruption`, `familiers` et `motsCles`.
  
  Le schéma est au §4.6 de `docs/CAHIER_DES_CHARGES_FICHES_PJ_ET_REFERENTIELS.md`.
- Le Péché, la Corruption et le Destin suivent une règle commune : l'outil garde sa valeur de séance tant que la fiche ne change pas.

### Comment le site des fiches écrit

- `firestore.rules` : `fiches/{charId}` interdit toute écriture directe (`allow write: if false`), y compris dans `history` et `operations`.
- Toute écriture passe par la Cloud Function **`executeFicheCommand`** (`functions/src/index.js:44`, `functions/src/fiche/service.mjs`), avec `enforceAppCheck: true`. Une commande a la forme `{ charId, operationId, baseRevision, type, payload }`.
- La fonction détecte les conflits champ par champ (« modifications concurrentes sur le même champ »), exige la révision exacte (`requireExactRevision`) et journalise par `operationId`.
- **L'outil doit donc passer par une nouvelle commande de cette fonction** (un type dédié à l'outil MJ, réservé au MJ), et non écrire directement dans Firestore. Le mécanisme de révision et de conflit existe déjà.

## Inventaire des variables (source : `docs/VARIABLES_PERSISTANTES_PJ.md`)

Le registre a été tenu par chaque lot depuis la phase A. On peut le trier en trois familles.

**1. La fiche porte déjà le champ : l'outil n'a qu'à le réécrire.**
- Destin (`extensions.v5.fate`), débité par la création d'un familier ou le Jugement dernier.
- Fortune permanente (`characterResources[].fortune`).
- Péché (`extensions.v5.divine.sin`).
- Corruption (`extensions.v5.corruptionPoints`).
- Caractéristiques perdues par séquelle (`aftermathRegister.sequelae[]`, `kind: 'characteristic-loss'`). À ne pas appliquer deux fois si le MJ a déjà corrigé la fiche à la main.
- Avances de Prière et talents Béni ou Invocation perdus par excommunication (B13). Un réimport ne doit jamais les rétablir.
- Équipement retiré ou rendu par le Courroux (B11, `divineConfiscations[]`). Ne jamais recréer un objet retenu à partir d'un ancien import.
- Blessures courantes (`hp`). La fiche n'a pas de solde courant : **à décider** (voir les questions).

**2. Valeurs absentes de la fiche, à ajouter ou à garder dans l'outil.**
- Pénitences, effets divins calendaires (plafond de Prière, malus, réprobation, suspension), Hémorragie quotidienne, excommunications et Jugement dernier, reliques, livre sacré perdu.
- Blessures Critiques et séquelles : fractures, pertes de parties du corps, cicatrices, maladies.
- Expositions et mutations de Corruption. Le délai secret de mutation est une donnée réservée au MJ et **ne doit jamais apparaître côté joueurs**.
- Monture et état monté, état des armes (cassée, rechargement), poudre et projectiles, dégâts d'armure par pièce.
- Mots-clés posés ou écartés par le MJ (`keywords[]`, `keywordExclusions[]`).

**3. Exclus par la règle du registre.**
- États de combat ordinaires, données de séance (`combatActions`, `combatScopeId`), réglages de partie (`suddenDeathEnabled`, terres sanctifiées, référentiel de mots-clés de la campagne).
- Reçus d'audit (renouvellement de Fortune, événements de Péché) : ce sont des métadonnées, pas des compteurs.

Règles transversales tirées du registre et du cahier des charges (§5) :
- l'identité de fiche ou de personnage fait foi, jamais un rapprochement par nom ;
- une commande unique et annulable, sans double application ;
- une collection absente n'est pas une collection vide.

## Rappels du MJ à traiter dans H (projet des fiches)

Mémoire « Rappels projet des fiches », état au 06/11 :
1. **Mots-clés** : exploiter dans les fiches le référentiel de mots-clés de la phase E (Haine, Animosité, Préjugé, Sans peur [Ennemi]…), avec la même source de vérité que l'outil. Barrakul est déjà au catalogue des fiches (`e6bc651`, point B2 du 05/11).
2. **PV et Mouvement des espèces**, à reporter du côté des fiches :
   - Halfling : M 3, Blessures V5 avec BF ;
   - Ogre : Blessures ×2 ;
   - Gnome : Petit, M 3, 2×BE + BFM ;
   - Elfe noir et Elfe des mers : M 5 ; Skink : M 6.
   
   Détail dans `tmp/f1-reperage/ARBITRAGES_25_10.md`. **À vérifier : est-ce déjà fait côté fiches ?**
3. **Familier** : livré le 04/11 (déclaré dans la fiche, lu par l'outil).
4. **Monture, option C** (lire aussi la monture depuis la fiche du PJ) : proposée, non retenue pour l'instant.
5. Côté outil : **Taille des PJ selon l'espèce** (Petite pour Halfling et Gnome, Grande pour Ogre).

## Questions à trancher avec le MJ avant de coder

1. **Moment de l'écriture** : un bouton « Envoyer aux fiches » en fin de séance, avec un aperçu des différences, ou une écriture à chaque commande ? *Proposition : bouton de fin de séance, sur le modèle de « Mettre à jour les PJ ».*
2. **Conflit** : que faire si le joueur a modifié la fiche entre deux écritures ? *Proposition : la fonction refuse le champ en conflit, et l'outil montre les deux valeurs pour que le MJ choisisse.*
3. **Champs de la famille 2** : faut-il en ajouter sur la fiche (lesquels sont visibles des joueurs ?), ou les garder dans l'outil seul ? *Proposition : n'ajouter que ce que le joueur doit voir (pénitences, séquelles permanentes, cicatrices) et garder le reste dans l'outil.*
4. **Blessures courantes** : faut-il les écrire sur la fiche ?
5. **Annulation** : comment annuler une écriture déjà partie (commande inverse de la fonction ?), et jusqu'à quand ?
6. **Visibilité des joueurs** : quels champs de la fiche les joueurs peuvent-ils lire ? Les données réservées au MJ, comme le délai de mutation, sont à exclure.
7. **Tests** : l'émulateur Firebase du site des fiches (règles et fonctions) suffit-il, App Check n'étant actif qu'en prod ?

## Méthode proposée

1. **Cadrage** avec `cadrer-feature` dans une fenêtre Opus : spécification du contrat outil ↔ fonction, critères d'acceptation, réponses du MJ aux questions ci-dessus.
2. **Lots en fenêtres secondaires**, un dépôt à la fois :
   - fiches : nouveau type de commande, validation et tests de la fonction ;
   - outil : plan de différences, aperçu, envoi, gestion des conflits ;
   - puis les champs ajoutés à la fiche.
3. Avant toute publication, contre-vérification par des vérificateurs indépendants (code, puis règles). Tests ciblés par lot, suite complète à la fusion.
4. Publication sur feu vert du MJ, dans chacun des deux dépôts.

## Points d'entrée

- Outil : `js/core/fiche-sync.js`, `js/core/fiche-source.js`, `js/ui/fiche-sync-view.js`, `docs/VARIABLES_PERSISTANTES_PJ.md`, `docs/CAHIER_DES_CHARGES_FICHES_PJ_ET_REFERENTIELS.md` (§4 à §5, §9.3 sur les versions).
- Fiches : `functions/src/index.js`, `functions/src/fiche/service.mjs`, `firestore.rules` (bloc `fiches/{charId}`, l. 344), `docs/FICHE-*.md`.
