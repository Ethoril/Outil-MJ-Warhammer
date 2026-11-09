# Renommage d'affichage : « Fortune » redevient « Chance »

Décision du MJ (09/11/2026) : les joueurs trouvent « Fortune » déroutant ; les points s'affichent de nouveau **Chance**, dans l'Outil MJ et dans le site des fiches. Seuls les **libellés** changent : variables, champs Firestore (`fortune`, repli de lecture sur `chance`), clés de contrat (`counter:fortune`), ids de talents, d'effets et d'actions restent tels quels. Aucune donnée n'est réécrite.

Garde-fous : `tests/unit/interface/libelle-chance.test.js` (outil) et `tools/fiche-libelle-chance.test.mjs` (fiches, dans `npm run check`) échouent si un libellé « Fortune » au sens des points réapparaît.

## 1. Libellés renommés

Numéros de ligne : état avant renommage.

| Dépôt | Fichier:ligne | Texte actuel | Texte proposé (appliqué) | Catégorie |
|---|---|---|---|---|
| outil | `js/core/fiche-sync.js:421` | fortune: 'Fortune' | fortune: 'Chance' | libellé visible |
| outil | `js/core/fiche-writeback.js:21` | 'Fortune modifiée en jeu (outil MJ)' | 'Chance modifiée en jeu (outil MJ)' | journal / historique |
| outil | `js/core/store.js:1450` | 'Initialisez le compteur de Fortune du personnage.' | 'Initialisez le compteur de Chance du personnage.' | message d’erreur |
| outil | `js/core/store.js:1451` | 'Aucun point de Fortune disponible.' | 'Aucun point de Chance disponible.' | message d’erreur |
| outil | `js/core/store.js:2235` | 'La partie a changé. Recalculez le compteur de Fortune.' | 'La partie a changé. Recalculez le compteur de Chance.' | message d’erreur |
| outil | `js/core/v5-resources.js:5` | 'Solde de Fortune invalide' | 'Solde de Chance invalide' | message d’erreur |
| outil | `js/core/v5-resources.js:48` | 'Registre de Fortune invalide' | 'Registre de Chance invalide' | message d’erreur |
| outil | `js/core/v5-resources.js:51` | 'Identité de Fortune invalide ou dupliquée' | 'Identité de Chance invalide ou dupliquée' | message d’erreur |
| outil | `js/core/v5-resources.js:189` | 'Source de Fortune invalide' | 'Source de Chance invalide' | message d’erreur |
| outil | `js/core/v5-resources.js:248,253` | 'Soldes de Fortune contradictoires pour un personnage' | 'Soldes de Chance contradictoires pour un personnage' | message d’erreur |
| outil | `js/core/v5-resources.js:315` | saisissez le même solde de Fortune pour ses copies | saisissez le même solde de Chance pour ses copies | message d’erreur |
| outil | `js/core/v5-spell-contracts.js:1448` | /Mage de guerre\|rune\|Cadai\|relance\|Fortune/i | /Mage de guerre\|rune\|Cadai\|relance\|Fortune\|Chance/i | filtre de messages (accepte les deux mots) |
| outil | `js/core/v5-spell-contracts.js:2819` | Point(s) de Chance (Fortune) temporaire(s) | Point(s) de Chance temporaire(s) | journal / historique |
| outil | `js/core/v5-store-action.js:263` | 'Relance de Fortune : chaque résultat doit être un entier de 1 à 100.' | 'Relance de Chance : chaque résultat doit être un entier de 1 à 100.' | message d’erreur |
| outil | `js/core/v5-store-action.js:265` | 'Relance de Fortune : saisir le nouveau jet d100 (1 à 100).' | 'Relance de Chance : saisir le nouveau jet d100 (1 à 100).' | message d’erreur |
| outil | `js/core/v5-store-action.js:279` | fortune: 'Fortune' } | fortune: 'Chance' } | journal / historique |
| outil | `js/ui/fiche-writeback-view.js:7` | fortune: 'Fortune', | fortune: 'Chance', | libellé visible |
| outil | `js/ui/fiche-writeback-view.js:26` | valeur de départ de la Fortune inconnue | valeur de départ de la Chance inconnue | libellé visible |
| outil | `js/ui/import-text-view.js:114` | [['Fortune', profile.ficheSnapshot | [['Chance', profile.ficheSnapshot | libellé visible |
| outil | `js/ui/resolution-panel.js:266` | 'Avantage et Fortune' | 'Avantage et Chance' | libellé visible |
| outil | `js/ui/resolution-panel.js:1112` | 'Relancer ce Test avec 1 Point de Chance (Fortune)' | 'Relancer ce Test avec 1 Point de Chance' | libellé visible |
| outil | `js/ui/v5-effect-dialog.js:18` | 'Dépense d’un point de Fortune' | 'Dépense d’un point de Chance' | libellé visible |
| outil | `js/ui/v5-effect-dialog.js:43` | el('button', 'Initialiser Fortune', 'ghost') | el('button', 'Initialiser la Chance', 'ghost') | libellé visible |
| outil | `js/ui/v5-effect-dialog.js:48` | 'Fortune : solde courant inconnu. Initialisez le compteur avant une dépense.' : 'Fortune disponible : ' | 'Chance : solde courant inconnu. Initialisez le compteur avant une dépense.' : 'Chance disponible : ' | libellé visible |
| outil | `js/ui/v5-effect-dialog.js:50` | 'Initialiser Fortune' : 'Modifier Fortune' | 'Initialiser la Chance' : 'Modifier la Chance' | libellé visible |
| outil | `js/ui/v5-fortune-dialog.js:12` | 'Compteur de Fortune requis' | 'Compteur de Chance requis' | message d’erreur |
| outil | `js/ui/v5-fortune-dialog.js:17` | el('h2', 'Fortune — ' + participantName) | el('h2', 'Chance — ' + participantName) | libellé visible |
| outil | `js/ui/v5-fortune-dialog.js:21` | 'Pool normal de Chance à renouveler':'Points de Fortune disponibles' | 'Pool normal de Chance à renouveler':'Points de Chance disponibles' | libellé visible |
| outil | `js/ui/v5-fortune-dialog.js:24` | ' Une annulation restaure aussi la Fortune.' | ' Une annulation restaure aussi la Chance.' | libellé visible |
| outil | `js/ui/v5-fortune-dialog.js:25` | 'Initialiser Fortune depuis' | 'Initialiser la Chance depuis' | aria-label |
| outil | `js/ui/v5-fortune-dialog.js:29` | 'Points de Fortune disponibles (permanents)' : 'Points de Fortune disponibles' | 'Points de Chance disponibles (permanents)' : 'Points de Chance disponibles' | libellé visible |
| outil | `js/ui/v5-fortune-dialog.js:31` | 'Initialiser Fortune' : 'Enregistrer Fortune' | 'Initialiser la Chance' : 'Enregistrer la Chance' | libellé visible |
| outil | `js/ui/v5-fortune-dialog.js:40` | 'La partie a changé. Fermez cette fenêtre et relisez la Fortune.' | 'La partie a changé. Fermez cette fenêtre et relisez la Chance.' | message d’erreur |
| outil | `js/ui/v5-fortune-dialog.js:43` | 'La Fortune n’a pas été enregistrée.' | 'La Chance n’a pas été enregistrée.' | message d’erreur |
| outil | `js/ui/v5-fortune-dialog.js:45` | 'La Fortune n’a pas été enregistrée : vérifiez le solde.' | 'La Chance n’a pas été enregistrée : vérifiez le solde.' | message d’erreur |
| outil | `js/ui/v5-talent-situations.js:7` | 'Tourbillon de mort (1 Fortune)' | 'Tourbillon de mort (1 point de Chance)' | libellé visible |
| outil | `js/ui/workspace-view.js:1055` | button('Fortune : ' + formatV5Balance(fortune) | button('Chance : ' + formatV5Balance(fortune) | libellé visible |
| outil | `js/ui/workspace-view.js:1056` | 'Modifier la Fortune de ' | 'Modifier la Chance de ' | aria-label |
| outil | `js/data/v5-corruption-mutations-l17.js:16` | En dépensant Fortune pour relancer | En dépensant un point de Chance pour relancer | texte de règle affiché |
| outil | `js/data/v5-corruption-mutations-l23.js:61` | lancer le sort Evil Eye contre Fortune et subit | lancer le sort Evil Eye contre un Point de Chance et subit | texte de règle affiché |
| outil | `js/data/v5-corruption-mutations-l23.js:126` | dépenser un Point de Fortune pour lancer Evil Eye | dépenser un Point de Chance pour lancer Evil Eye | texte de règle affiché |
| outil | `docs/divin/sources/miracles/ranald.mjs:43` | Le prêtre gagne +1 point de Fortune, conservé | Le prêtre gagne +1 point de Chance, conservé | texte de règle affiché (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:49` | 'Le prêtre est-il à 0 point de Fortune (réinvocation) ?' | 'Le prêtre est-il à 0 point de Chance (réinvocation) ?' | question posée au MJ (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:50` | (points de Fortune gagnés : 1 + 1 par +2 DR) | (points de Chance gagnés : 1 + 1 par +2 DR) | question posée au MJ (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:53` | 'Le prêtre gagne +1 point de Fortune, qui dure | 'Le prêtre gagne +1 point de Chance, qui dure | texte de règle affiché (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:54` | +1 point de Fortune supplémentaire. | +1 point de Chance supplémentaire. | texte de règle affiché (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:55` | avant d’atteindre 0 point de Fortune. | avant d’atteindre 0 point de Chance. | texte de règle affiché (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:58` | dépassent le maximum de Fortune du personnage | dépassent le maximum de Chance du personnage | texte de règle affiché (source du registre divin) |
| outil | `docs/divin/sources/miracles/ranald.mjs:43` | tant qu’il n’est pas retombé à 0 point de Fortune | tant qu’il n’est pas retombé à 0 point de Chance | texte de règle affiché (source du registre divin) |
| outil | `docs/divin/sources/miracles/ulric-pbtt.mjs:72` | relance gratuite de Fortune d | relance gratuite de Chance d | texte de règle affiché (source du registre divin) |
| outil | `tools/build-v5-talent-classification.mjs:17` | Réaction avant Inconscient ; 1 Fortune si Sonné | Réaction avant Inconscient ; 1 point de Chance si Sonné | texte de règle affiché (source de la couverture des talents) |
| outil | `tools/build-v5-talent-classification.mjs:26` | '1 Fortune, opposition unique | '1 point de Chance, opposition unique | texte de règle affiché (source de la couverture des talents) |
| outil | `docs/RECETTE_UTILISATEUR.md:85` | Défense de la cible, Avantage et Fortune, Talents | Défense de la cible, Avantage et Chance, Talents | doc de recette (cite l’interface) |
| outil | `docs/RECETTE_UTILISATEUR.md:140,151,405` | `Relancer ce Test avec 1 Point de Chance (Fortune)` | `Relancer ce Test avec 1 Point de Chance` | doc de recette (cite l’interface) |
| outil | `docs/RECETTE_UTILISATEUR.md:399` | G-DES-1 · Fortune d’un personnage | G-DES-1 · Chance d’un personnage | doc de recette (cite l’interface) |
| outil | `docs/RECETTE_UTILISATEUR.md:400` | cliquer le bouton `Fortune : …` | cliquer le bouton `Chance : …` | doc de recette (cite l’interface) |
| outil | `docs/RECETTE_UTILISATEUR.md:400` | `Points de Fortune disponibles` | `Points de Chance disponibles` | doc de recette (cite l’interface) |
| outil | `js/ui/v5-fortune-dialog.js:29` | aria-label 'Points de Fortune disponibles' | 'Points de Chance disponibles' | aria-label |
| fiches | `js/fiche-bureau/app.js:76` | [['destin', 'fortune', 'Destin', 'Fortune']] | [['destin', 'fortune', 'Destin', 'Chance']] | libellé visible (+ aria-label des points) |
| fiches | `js/mobile/views/fiche-principal.js:23` | [['Destin', 'Fortune', 'destin', 'fortune']] | [['Destin', 'Chance', 'destin', 'fortune']] | libellé visible (+ « La Chance sera aussi ramenée… ») |
| fiches | `js/mobile/views/fiche-conflicts.js:6` | fortune: 'Fortune', | fortune: 'Chance', | libellé visible (conflits) |
| fiches | `regles.html:1381` | Sort Mauvais Œil sans test (1 Point de Fortune). | Sort Mauvais Œil sans test (1 Point de Chance). | texte de règle affiché (page Règles des joueurs) |

Fichiers régénérés à partir des sources ci-dessus (même contenu, aucun autre écart) : `js/data/v5-divine-contracts.json` et `docs/divin/DIVIN_INVENTAIRE.json` (`node tools/build-v5-divine-contracts.mjs`), `docs/lot2/LOT2_TRI_TALENTS.json|.md` puis `js/data/v5-talent-coverage.json` (`node tools/build-v5-talent-classification.mjs`, `node tools/build-v5-talent-coverage.mjs`).

Golden master du store (`tests/fixtures/store-golden.json`, `GOLDEN_UPDATE=1`) : seules les empreintes `result` des lectures divines et du catalogue des mutations changent (texte des registres) ; aucune empreinte d'état ne bouge.

Tests mis à jour (libellés cherchés) : `tests/unit/referentiel/fiche-sync-identite-apercu.test.js`, `tests/unit/combat/chance-destin-fortune.test.js`, `tests/unit/magie/effets-et-arbitrages.test.js` (titre), `tests/divin-v5-b9-browser.mjs`, `tests/fiche-writeback-browser.mjs`, `tests/lot2-combat-v5-browser.mjs`, `tests/lot2-v5-23-control-browser.mjs` ; côté fiches `tools/fiche-mobile-principal.test.mjs`.

## 2. Signalé, non modifié (fichier réservé au chantier Q6)

| Dépôt | Fichier:ligne | Texte actuel | Texte proposé | Catégorie |
|---|---|---|---|---|
| outil | `js/core/v5-magic-high.js:209` | 'L’épuisement temporaire nécessite un Point de Chance (Fortune).' | 'L’épuisement temporaire nécessite un Point de Chance.' | message d’erreur |

Le test `libelle-chance.test.js` tolère ce texte précis (liste `EN_ATTENTE`) ; retirer l'exception en même temps que la correction.

## 3. Faux amis (« Fortune » ne désigne pas les points) : laissés tels quels

- **La Fortune est Capricieuse** (sort du Domaine de Haute Magie) : `js/core/v5-magic-high.js:392`, `js/core/v5-magic-talents.js:78,305,306`, `js/core/v5-spell-contracts.js:3066`, `js/data/rules.js:168`, `js/data/v5-spell-contracts.json`, `js/data/reference-snapshot.json`, `js/data/reference-source-csv/Magie.csv:253` ; fiches `js/data/fiche-catalog.json:733`.
- **Fortune généreuse** (*Bountiful Fortune*, miracle de Ranald) : `js/core/v5-store-action.js:318`, `js/ui/resolution-panel.js:1118`, `js/data/v5-divine-contracts.json`, `docs/RECETTE_UTILISATEUR.md:154-155`.
- **Revirement de fortune** (*Twist of Fortune*, miracle de Handrich), **Bénédiction de Fortune** (*Blessing of Fortune*, `docs/divin/sources/L06-*.mjs`), **Curse of Ill-Fortune** (bestiaire), **Entertain (Fortune Telling)** (compétence, bestiaire), **Fate and Fortune** (titre de section du livre).
- Sens courant « de fortune » : *Pansement de fortune* (talent), *Armure de fortune*, *soldat de fortune* (mots-clés de créatures) ; fiches : `careers.json`, `referentiel-public.json`, `talents-sheet-snapshot.json`, « Multiplication d'infortune » (`regles.html:878`).
- Citation anglaise du livre : `js/data/v5-corruption-mutations-l17.js:146` (« A Fortune reroll… »).

## 4. Identifiants internes laissés tels quels

- Champs et clés de données : `fortune` (fiche Firestore, `ficheSnapshot.resources.fortune`, import/export JSON des profils, `json-profile-sheet.js`, `json-profile-import.js`, `sanitize.js`, `sync-protocol.js`), repli `chance` (`js/core/fiche-sync.js:187`, `js/fiche/v5.js` migration `chance` → `fortune`), `temporaryFortune`, `extensions.v5.fortune*`.
- Contrat outil ↔ Cloud Function : `counter:fortune`, `OUTIL_MJ_COUNTERS = ['fortune', …]` (`js/fiche/outil-mj.js`, `functions/src/domain/fiche/outil-mj.js`), `FICHE_WRITEBACK` clé `fortune`, raison `fortune-anchor-unknown`.
- Ids d'actions, d'effets et de sources : `set-fortune-v5`, `declare-fortune-advantage-v5`, `cancel-fortune-advantage-v5`, `system:fortune-reroll`, `system:fortune-for-advantage`, `talent:glorious:fortune`, `talent:whirlwind:fortune`, `temporary-fortune`, `wrath-fortune-refresh`, `fortune-cause-persists`, `fortune-corruption`, `fortune-is-fickle`, `v5-twist-of-fortune`, `v5-bountiful-fortune`, `blessing:fortune`, champ de question `fortune-zero`, code d'erreur `V5_FORTUNE_*`, `fiche-fortune-binding-conflict`.
- Noms de fichiers et de fonctions : `js/ui/v5-fortune-dialog.js` (et son entrée dans `sw.js`), `getV5Fortune`, `setFortuneAnchor`, classes et `data-focus-key="fortune-…"`, `tests/unit/combat/chance-destin-fortune.test.js`.
- Commentaires de code et titres de tests : non visibles, laissés (dont `js/fiche/v5.js:1` « Fortune (ex-Chance) »).

Aucune exception n'a été nécessaire : renommer les identifiants n'aurait rien simplifié et aurait exigé une migration Firestore et un redéploiement.

## 5. Sources maintenues par le MJ (feuille « Aides de jeu », CSV par onglet)

Rien à corriger : les CSV miroirs (`js/data/reference-source-csv/`) et `reference-snapshot.json` ne parlent jamais de « points de Fortune » ; leurs seules occurrences sont des faux amis (§ 3). La compétence/talent « Bénédiction de Chance » y est déjà au bon mot.

## 6. Hors périmètre

- Historique et rapports figés (`docs/SUIVI_EVOLUTION.md`, `docs/lot*/`, `docs/divin/*AUDIT*`, `docs/plans-gpt/`, archives, `CHANGELOG.md` des fiches) : ils racontent l'état passé, non modifiés.
- Entrées d'historique déjà écrites sur les fiches avec le libellé « Fortune modifiée en jeu (outil MJ) » : elles gardent leur texte ; les nouveaux envois portent « Chance modifiée en jeu (outil MJ) ».
- Cloud Function : aucun message ne change (le libellé d'un envoi est une donnée libre) ; **pas de redéploiement nécessaire**.
