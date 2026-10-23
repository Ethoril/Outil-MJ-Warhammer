# Rapport Pro — lot qualité de la phase E (23/10/2026)

Plan : `PLAN_PRO_QUALITE_E.md`. Branche `pro/qualite-e`, départ `9c12613`. Choix et questions : `CHOIX_EXECUTANT_QUALITE_E.md`.

| Lot | État | Commit |
| --- | --- | --- |
| Q0 | FAIT | (voir `git log`, « Q0 ») |
| Q1 | FAIT | (voir `git log`, « Q1 ») |
| Q2 | FAIT | (voir `git log`, « Q2 ») |
| Q3 | FAIT | (voir `git log`, « Q3 ») |
| Q4 | FAIT | (voir `git log`, « Q4 ») |
| Q5 | FAIT | (voir `git log`, « Q5 ») |
| Q6 | FAIT | (voir `git log`, « Q6 ») |
| Q7 | FAIT | (voir `git log`, « Q7 ») |
| Q8 | FAIT | (voir `git log`, « Q8 ») |
| Q9 | FAIT | (voir `git log`, « Q9 ») |
| Q10 | BLOCKED (question au MJ, `QE-Q10-1`) | aucun (rien modifié) |
| Q10b | FAIT | (voir `git log`, « Q10b ») |
| Q11 | FAIT | (voir `git log`, « Q11 ») |
| Q12a | FAIT (L01-L04 ; Q12b et Q12c à faire) | (voir `git log`, « Q12a »)  |
| Q12b | FAIT (L07-L12 ; Q12c à faire) | (voir `git log`, « Q12b »)  |
| Q12c | FAIT en partie (L13-L26 : causes d'outil réparées, manques restants non justifiés un par un, `QE-Q12c-4`) | (voir `git log`, « Q12c ») |
| R | FAIT (avec réserve : manques de complétude non justifiés un par un) | (voir `git log`, « R ») |

## Q0 — contrôle de complétude

- `tools/verify-bestiary-stats.mjs` : un zéro initial imprimé (« 09 », « 04 ») est lu comme « 9 », « 4 » ; un profil sans colonne de Blessures (Construct, L17) n'attend plus de dernier chiffre. Les 3 faux écarts (E0-P-515, E0-P-564, E0-P-640) disparaissent : **0 écart sur les 23 livres**. Le cas « tiret rendu en U+FFFD » était déjà couvert par la normalisation existante ; aucun écart ne lui était dû.
- Nouveau `tools/lib/bestiary-completeness.mjs` (fonctions pures, testées par `tests/pro-q0-completude.test.js`) : pour chaque profil retrouvé dans le texte brut, les talents du catalogue (`englishName` de `reference-snapshot.json`) de la rubrique « Talents » et les compétences de la rubrique « Skills » (une ou plusieurs spécialisations, césures recollées) doivent figurer dans le JSON. Écrit `tmp/divin/bestiary-completude-<livre>.json` et un résumé par livre.
- Limite connue : le bloc s'arrête à la fin de la page ou à l'en-tête de caractéristiques suivant ; un bloc qui déborde sur la page suivante n'est vérifié que sur sa première page.

### État de départ (profils incomplets / talents manquants / compétences manquantes)

| Livre | Profils | Talents | Compét. | Livre | Profils | Talents | Compét. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L01 | 7 | 37 | 53 | L16 | 9 | 14 | 20 |
| L02 | 6 | 15 | 52 | L17 | 6 | 7 | 0 |
| L03 | 2 | 6 | 12 | L18 | 9 | 11 | 1 |
| L04 | 6 | 64 | 55 | L19 | 11 | 21 | 0 |
| L06 | 0 | 0 | 0 | L20 | 16 | 19 | 5 |
| L07 | 12 | 60 | 6 | L21 | 7 | 10 | 15 |
| L09 | 0 | 0 | 0 | L22 | 6 | 7 | 2 |
| L10 | 0 | 0 | 0 | L23 | 9 | 15 | 0 |
| L11 | 9 | 9 | 7 | L24 | 12 | 22 | 34 |
| L12 | 7 | 41 | 39 | L25 | 7 | 5 | 8 |
| L13 | 2 | 1 | 2 | L26 | 4 | 4 | 0 |
| L14 | 16 | 241 | 348 | | | | |

Total : 23 livres contrôlés. L14 domine (bloc coupé, lot Q5). Les manques de L01-L04 et L07 sont à examiner après Q1-Q2 (une partie peut venir de la mise en page de ces livres, à justifier un par un).

Aucune fonction de jeu n'est ajoutée : outil de contrôle seulement (pas de « branché » à déclarer).

## Q1 — talents à plusieurs mots (FAIT)

- `tools/lib/bestiary-record.mjs` : `isCatalogueTalent` ; un nom présent au catalogue (`reference-snapshot.json`) n'est plus jamais écarté par `isNoise`. Livres régénérés par `tools/build-bestiary-profiles.mjs` (23 livres) : **ajouts seulement** (19 fichiers, aucune ligne retirée hors `"talents": []` remplacés), 12 caractéristiques et Blessures intactes (aucun champ de valeurs touché).
- Test : `tests/pro-q1-talents.test.js` (Nastassia : Master of Disguise + Tower of Memories ; Count Jäger : Break and Enter, Master of Disguise, Nose for Trouble ; Combat Familiar : Suffuse With).
- Aucune fonction de jeu : données et outil de génération (pas de « branché » à déclarer).

### Contrôle Q0 après Q1 (profils / talents / compétences manquants)

L01 6/36/53 · L02 6/15/52 · L03 1/5/12 · L04 4/62/55 · L06 0 · L07 7/54/6 · L09 0 · L10 0 · L11 8/8/7 · L12 7/41/39 · L13 1/0/2 · L14 16/241/348 · L16 8/10/20 · L17 1/1/0 · L18 2/1/1 · L19 3/12/0 · L20 6/3/5 · L21 4/3/15 · L22 3/1/2 · L23 2/7/0 · L24 5/14/34 · L25 6/0/8 · L26 2/2/0.

Talents manqués passés de ~600 à ~520 : les talents à plusieurs mots sont récupérés. Le reste n'a **plus la même cause** : le profil sort sans talents ni compétences quand la colonne de droite est imbriquée dans la prose de gauche (voir `QE-Q1-2` dans les choix). Non justifié un par un ; lot **Q11** proposé (extraction en colonnes, avec Q5). Les compétences (Q2) restent à faire : Count Jäger garde Language (Thief) et Melee (Basic).

### Suite complète

Un seul échec, étranger au lot : `divin-v5-e0-independent` attend `tmp/divin/recipe-receipt.json` (reçu produit par `node tools/run-divine-recipe.mjs`, lancé au lot R, absent de ce worktree).

## Q2 — compétences (FAIT)

- `tools/lib/bestiary-profile.mjs` (`readSkills`) : la parenthèse « Melee (Basic 76) » à une seule spécialisation est lue comme les groupes à virgules ; césures « Two- handed », « Pole- arm » recollées (accents compris), « Pole-arm » / « Pole Arm » ramenés à « Polearm » (noms français : même normalisation, la spécialisation « Armes d’hast » est reconnue).
- Livres régénérés (23) : 8 fichiers modifiés (L07, L09, L12, L16, L17, L20, L21, L25) ; seules des compétences sont ajoutées ou renommées (« Melee (Two- handed) » → « Melee (Two-handed) », traduction « Deux mains » désormais vérifiée) ; aucune caractéristique ni Blessure touchée.
- Test : `tests/pro-q2-competences.test.js` (Count Jäger : Language (Thief) 96 et Melee (Basic) 76 ; Combat Familiar : Melee (Two-handed) 50).
- `tools/verify-bestiary-stats.mjs` : l'avertissement « compétence absente du texte brut » compare hors ponctuation et espaces (césures) : 39 avertissements → 8 (reste : textes à colonnes imbriquées, voir Q11).
- Aucune fonction de jeu : données et outil de génération (pas de « branché » à déclarer).

### Contrôle Q0 après Q2 (profils / talents / compétences manquants)

L01 6/36/53 · L02 6/15/52 · L03 1/5/12 · L04 4/62/55 · L06 0 · L07 6/54/5 · L09 0 · L10 0 · L11 8/8/7 · L12 6/41/38 · L13 1/0/2 · L14 16/241/348 · L16 7/10/19 · L17 1/1/0 · L18 2/1/1 · L19 3/12/0 · L20 5/3/2 · L21 4/3/15 · L22 3/1/2 · L23 2/7/0 · L24 5/14/34 · L25 5/0/7 · L26 2/2/0.

Les compétences manquantes restantes ne viennent plus de `readSkills` : ce sont les mêmes profils sans rubrique « Skills » extraite (colonne imbriquée, `QE-Q1-2`), non justifiés un par un ; traités par Q5 (L14) et Q11 proposé.

### Suite complète (après Q2)

4262 réussis, 1 échec étranger au lot : `divin-v5-e0-independent` (« la recette refuse un cwd externe ») attend `tmp/divin/recipe-receipt.json`, produit au lot R.

## Q3 — équipement et notes (FAIT)

- `tools/lib/bestiary-record.mjs` : la coupe `item.length <= 60` est remplacée par `isTrappingName` (un nom long est gardé s'il se termine par sa parenthèse, sans phrase collée ni début en « as/or/and… ») ; `joinTrappings` recolle les noms à virgules internes déclarés dans `TRAPPING_JOINS` (`tools/lib/bestiary-overrides.mjs`, Helena E0-P-625). `tools/lib/bestiary-profile.mjs` : `readTrappings` sépare la note à astérisque de la liste (champ `notes` du profil) ; `readTraitItem` marque `conditional: true` un Trait suivi d'un astérisque.
- Livres régénérés (23) : comparaison profil par profil avec le commit précédent, **aucun autre champ modifié** (12 caractéristiques, Blessures, attaques, compétences intacts) ; 25 profils changent d'équipement (Herveaux : dague empoisonnée, Tyrkel : prothèse, Wuder : Piece of Warpstone), 2 gagnent une note (Wuder, Klaus Jager E0-P-933), Helena est recollée. Seules des entrées sont ajoutées, hors les fragments de Helena recollés.
- Test : `tests/pro-q3-equipement.test.js` (4 profils et fonctions).
- `trappings`, `notes` et `conditional` sont des données de livre sans appelant dans `js/` : code testé, non appelé.
- Suite complète : 4266 réussis, 1 échec étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q4 — Traits et attaques (FAIT)

- `tools/lib/bestiary-complement-data.mjs` : alias « Immune » → Immunity (les 3 Élémentaires incarnés de L17 gardent leur Immunité avec sa précision). `tools/lib/bestiary-record.mjs` : `Creature Weapons` produit des attaques ; l'arme V4 d'origine (Claws, Beak, Slam, Claw…) devient la précision du Trait et le multiplicateur (« 2 Claws ») est conservé ; une précision « see below » / « see above » est retirée.
- Livres régénérés (23) : 9 fichiers modifiés (L07, L11, L17, L20, L21, L22, L23, L24, L26) ; seules des entrées sont ajoutées (attaques, précisions), 2 précisions « see … » retirées ; caractéristiques et Blessures intactes. Carrion (E0-P-757) : Bec +9 et 2 Griffes +7 en actions ; Hattie Adler (E0-P-641), carcasses L21 : une attaque.
- Test : `tests/pro-q4-traits-attaques.test.js`.
- Branché : `buildParticipantFromBestiary` (js/core/bestiary-profiles.js) transforme déjà `attacks` en actions ; les données sont donc utilisées. L'Immunité reste un Trait affiché, sans lecture générique par le moteur (code testé, non appelé).
- Suite complète : un seul échec, étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q5 — Sea Wardens of Cothique, L14 (FAIT)

- Cause : le corps du profil était coupé à sa première ligne (un blanc entre la ligne de valeurs et « Gold 3 »). `tools/lib/bestiary-blocks.mjs` : ligne de richesse après blanc ouvre le corps ; « Yenlui State: », « Obsession: », « Lore of X: », « Magic of X: », « High Magic: » sont des étiquettes de section ; la liste qui suit « … items to hand: » prolonge le bloc ; un mot de la colonne de gauche coupé par la gouttière est gardé entier. `tools/lib/bestiary-profile.mjs` : la phrase d'introduction de l'équipement n'est plus un objet ; `readSpells` lit les listes par Lore et ne prend plus le texte avant le premier intitulé pour un intitulé.
- Les 12 profils du plan (E0-P-472 à 477, 479, 480, 482, 484, 485, 486) ont attaques, compétences et talents. Dalroth (p.45) vérifié contre la page : Elf Bow +8, Blade of Darting Steel +8, 30 compétences, 12 talents, équipement complet.
- Livres régénérés (23) : 8 fichiers modifiés (L04, L07, L09, L14, L16, L17, L20, L25) ; caractéristiques et Blessures de tous les profils identiques à `HEAD` (script de comparaison : 0 écart). Hors L14, ajouts ou corrections de lecture : équipement et Lores de L07/L17, Traits Size/Stride/Mutation (L04, L07, L17), Language (Battle) et Melee (Basic) de L07, « Strong Back » / « Strong-minded » séparés (L16), Pistol/Rapier/Hook séparés avec les bons dégâts (L25), listes de sorts de L09, L17, L20 rattachées au bon Lore (elles l'étaient au précédent).
- Test : `tests/pro-q5-sea-wardens.test.js` (7 tests).
- Restent incomplets dans L14 (hors des 12 du plan, voir `QE-Q5-4`) : E0-P-481, E0-P-483, E0-P-488, E0-P-490. Contrôle Q0 L14 : 16 profils incomplets au départ → 4.
- Aucune fonction de jeu : données et outil de génération. Les sorts (`spells`) et l'équipement (`trappings`) n'ont aucun appelant dans `js/` : code testé, non appelé. Les attaques sont déjà transformées en actions par `buildParticipantFromBestiary` (js/core/bestiary-profiles.js).
- Suite complète : 4277 réussis, 1 échec étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q6 — armure par zones (FAIT)

- `js/core/bestiary-profiles.js` (`printedArmour`, `detailArmour`) : un `ap` d'ensemble est limité aux zones que `detail` nomme (Body, Chest → corps ; Headband → tête ; Arms ; Rear Legs → jambes) ; une armure décrite seulement par `detail` prend les zones du catalogue d'armures (`reference-snapshot.json`, via `getReferenceCatalogue`) pour Mail Coat, Mail Shirt, Leather Jack, Helm, Plate, ou la zone nommée (« Body 2 »), avec le PA imprimé. Pièce inconnue (Hide, Leather) ou sans valeur (« Body », « Body Only ») : PA à 0 et rappel dans `notes` du participant. Aucune donnée de livre modifiée.
- `js/ui/bestiary-library.js` : la fiche affiche `zones : <detail>`.
- Test : `tests/pro-q6-armure.test.js` (7 tests) : E0-P-628 PA 1 au corps seul ; E0-P-556 « Mail Coat 2 » corps et bras ; E0-P-575 casque et plastron ; rappel pour E0-P-593, 616, 704.
- Branché : `buildParticipantFromBestiary` a des appelants dans `js/ui/bestiary-library.js`, `js/core/bestiary-templates.js` et `js/core/v5-spell-contracts.js` ; l'armure par zones et le rappel passent par l'outil. L'affichage du champ `notes` du participant dans l'interface n'a pas été vérifié.
- Suite complète : 4284 réussis, 1 échec étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q7 — démon de Manifestation, D-C32 dans le moteur (FAIT)

- `js/core/v5-magic-turn.js` : `removeExpiredSummons` ne retire plus un démon dont le contrat porte `hostileOnExpiry` ; à l'expiration de la couche du lanceur, il passe dans le camp opposé à celui du lanceur (`oppositeCamp` : ennemi → allié des PJ, tout autre camp → ennemi), perd son lien d'invocation et reçoit dans `notes` le rappel « Ordre accompli : retirez le démon ». Le retrait passe par la commande du Store (instantané complet) : Annuler rétablit le camp et le lien. `js/core/v5-spell-contracts.js` : le démon qui l'emporte (« attaque ») prend aussi le camp opposé au lanceur (avant : toujours `ennemi`) ; les champs `hostileOnExpiry` et `summonCasterCamp` sont posés à l'incantation.
- Contrat : `hostileOnExpiry: true` et texte « camp opposé à celui du lanceur » dans `tools/tradition-contracts/demonologie.mjs` et `js/data/v5-spell-contracts.json` (modifiés à l'identique, sans régénérer la chaîne lot3).
- Test : `tests/pro-q7-demon-expiration.test.js` (4 tests de comportement : expiration → démon présent, hostile ; Annuler ; lanceur ennemi → allié ; camp du démon qui l'emporte).
- Branché dans l'outil : `removeExpiredSummons` est appelé par `js/core/store.js` (chaque commande) ; `oppositeCamp` par `v5-spell-contracts.js`. L'affichage du champ `notes` d'un participant en combat n'a pas été vérifié (le rappel est dans les données du participant).
- Suite complète : 4288 réussis, 1 échec étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q8 — Traits de créature, écarts au livre de base (FAIT)

Source : `Livre de base V5 EN v2.pdf` (L06) pp.356-363. Test : `tests/pro-q8-traits-creature.test.js` (7 tests, un par écart). Choix : `QE-Q8-1` à `QE-Q8-6`.

- Langue (`creature-combat.js`) : la touche donne Enchevêtré (avant : Entravé « aux dégâts »).
- Souffle (`creature-combat.js`) : par type, Feu BF+3 + Enflammé, Acide BE+4, Froid BF+2 + Fatigué, Électricité BF+2 + Sonné, Poison BE+2 + Empoisonné, Fumée sans dégâts ; rappel de zone (cible à 20+BE yards, BF yards autour).
- Nuée (`creature-states.js`) : 1 Blessure par Round à chaque engagé, plus de saisie à faire.
- Bestial (`creature-psychology.js`) : sous la moitié des Blessures, Frénésie si Territorial (ou `protecting`), sinon fuite ; plus de question bloquante.
- Dressé (`creature-magic.js`) : liste V5 (Brisé, Conduite, Divertissement, Rapporter, Garde, Retour, Magie, Monture, Guerre) avec effets ; liste V4 inchangée.
- Artificiel (`creature-natures.js`) : `attacksAreMagical` (Artificiel, Démoniaque, Magique) ; rappel complété.
- Effrayé (`creature-psychology.js`) : l'indice est celui de la Peur de la créature redoutée (avant : 0, aussitôt surmonté).
- Tests T3 (Nuée) et T6 (Effrayé, Bestial) mis à jour : ils figeaient l'ancien comportement.

Branché / non appelé (grep dans `js/`) :
- **Branché** : `attacksAreMagical` → `weaponAttackNature` (`js/core/v5-magic-combat.js`), appelé par `js/core/resolution.js:603` (une attaque d'Artificiel, Démoniaque ou Magique est magique pour les Protections de la cible, sauf déclaration contraire du MJ). `planNaturalAttack` (Langue, Souffle) est appelé par `js/core/v5-store-action.js:69`.
- **Code testé, non appelé** : `planSwarm`, `planPsychology` (Bestial, Effrayé), `planCreatureMagic` (Dressé) n'ont aucun appelant dans `js/` hors de leurs modules (chantier suivant du plan).
- Suite complète : 4295 réussis, 1 échec étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q9 — liens maître-familier (FAIT)

- `js/core/familiars.js` (`validateFamiliarLink`) : nouveau refus `familiar-is-master` (le participant visé a déjà un familier) ; `master-is-familiar` existait déjà. `js/core/store.js` (`removeParticipant`, avec et sans persistance) : retirer le maître efface `familiarOf` de ses familiers dans la même commande ; Annuler remet maître, lien et familier.
- Test : `tests/pro-q9-liens-familiers.test.js` (4 tests). Choix : `QE-Q9-1`.
- Branché : `validateFamiliarLink` est appelé par `linkFamiliar` (js/core/store.js) ; la libération est dans `removeParticipant` (store.js). Aucun appelant de `linkFamiliar` dans l’interface (hors du store) : code testé, non appelé depuis l’UI (chantier suivant du plan).
- Suite complète : seul échec, étranger au lot (`divin-v5-e0-independent`, reçu de recette produit au lot R).

## Q10 — Master and Commander (BLOCKED)

- Essai : Talent ajouté au résolveur sans toucher au snapshot (id `talent-master-and-commander`, L25 p.63). Il était reconnu par son id et sa limite suivait le Bonus de Sociabilité, mais 4 tests figeant la feuille source échouaient (206 identités ×2, contrat « verified » par identité, liste de cache de sw.js). Les satisfaire reviendrait à assouplir ces contrôles : retour en arrière complet, aucun code ni test conservé.
- Question au MJ consignée dans `QE-Q10-1` : ajouter le Talent à la feuille Drive, ou autoriser un supplément local (comptes à 207 et contrat local).
- Aucune fonction ajoutée. `v5-effects.js` reste inchangé (rang saisi, id `talent-master-and-commander`).

## R — clôture (FAIT, avec réserve)

- **Contrôle Q0, 23 livres** : 0 écart de valeurs, 0 ligne non retrouvée ; 8 avertissements de compétence (textes à colonnes imbriquées). Complétude restante (profils / talents / compétences manquants) : L01 6/36/53 · L02 6/15/52 · L03 1/5/12 · L04 4/62/55 · L07 5/54/3 · L11 8/8/7 · L12 6/41/38 · L13 1/0/2 · L14 4/22/25 · L16 6/8/19 · L17 1/1/0 · L18 2/1/1 · L19 3/12/0 · L20 5/3/2 · L21 4/3/15 · L22 3/1/2 · L23 2/7/0 · L24 5/14/34 · L25 4/0/5 · L26 2/2/0 ; L06, L09, L10 à 0. **Non justifiés un par un** : même cause (colonne de droite imbriquée dans la prose de gauche, blocs à cheval sur deux pages, formats V5), voir `QE-Q1-2`, `QE-Q2-2`, `QE-Q5-4` ; lot Q11 proposé, à arbitrer.
- **12 valeurs inchangées** : comparaison des 23 livres avec `9c12613` (caractéristiques et Blessures de chaque profil) : 0 écart, 0 profil ajouté ou retiré.
- **Recette** : `node tools/run-divine-recipe.mjs` : « RECETTE DIVINE VERTE — 26 commandes » (dont la suite complète `node`, sans échec ; le reçu `recipe-receipt.json` existe désormais). `tmp/divin/base-manifest.json` recréé depuis les 4 sources protégées de `9c12613`.
- **Tableau branché / non appelé** : Q0-Q3, Q5 : outils et données de livre (aucune fonction de jeu ; `trappings`, `notes`, `conditional`, `spells` : code testé, non appelé). Q4 : attaques branchées via `buildParticipantFromBestiary` ; Immunité : code testé, non appelé. Q6 : branché (`buildParticipantFromBestiary`, appelants dans `bestiary-library.js`, `bestiary-templates.js`, `v5-spell-contracts.js`) ; affichage du champ `notes` non vérifié. Q7 : branché (`removeExpiredSummons` ← `store.js`). Q8 : `attacksAreMagical` et `planNaturalAttack` branchés ; `planSwarm`, `planPsychology`, `planCreatureMagic` : code testé, non appelé. Q9 : `validateFamiliarLink` et la libération branchés via le store ; `linkFamiliar` sans appelant dans l'interface. Q10 : BLOCKED (`QE-Q10-1`).

## Q10b — Master and Commander au catalogue (FAIT)

- Réimport par `tools/generate-reference-catalog.mjs --source-dir=…` (207 talents) ; **seuls les blocs talents du snapshot sont retenus** (la sortie brute écrasait équipement, magie et `sourceManifest`, voir `QE-Q10b-1`). `talent-master-and-commander` (« Maître à bord », Sea of Claws p. 63, limite Bonus de Sociabilité) est reconnu par son id sous « Master and Commander » et « Maître à bord ».
- Chaîne de données mise à jour par les outils existants : `build-v5-talent-classification.mjs` (tri, clause moteur « manual-approved »), `build-v5-talent-coverage.mjs` (contrat « verified »), `build-v5-divine-contracts.mjs` (empreinte du snapshot) ; inventaire (entrée et empreintes), miroir `Talents.csv` (ligne ajoutée) ; `sw.js` inchangé (aucun fichier nouveau).
- Effet de bord légitime : le `talent-source.js` importé retire le « = » de saisie de 4 descriptions (Affable, Chance, Coup puissant, Doigts de fée) ; empreintes mises à jour (`QE-Q10b-2`).
- Moteur : `js/core/v5-effects.js`, repli par nom retiré (le rang vient des lignes résolues par id), nom français corrigé en « Maître à bord ».
- Comptes 206 → 207 mis à jour dans 4 tests ; nouveau test `tests/pro-q10b-master-and-commander.test.js` (4 tests : catalogue et id, contrat verified, +1 DR par niveau à bord, repli par nom retiré).
- Branché / non appelé : `leadershipRallySlModifiers` n'a aucun appelant dans `js/` hors de `v5-effects.js` : **code testé, non appelé** (le bonus de Commandement n'est pas appliqué depuis l'interface). Le talent lui-même est dans le catalogue (`getReferenceCatalogue`, `resolveTalent`) donc sélectionnable sur une fiche.
- Suite complète : verte, aucun échec. **Réserve pour R2** : la recette divine compare snapshot et `Talents.csv` à `tmp/divin/base-manifest.json` ; ce manifeste est à régénérer (`QE-Q10b-4`).

## Q12a — profils vides et colonnes imbriquées, L01-L04 (FAIT)

- **Causes trouvées dans l'outil** (`tools/lib/bestiary-blocks.mjs`, `bestiary-profile.mjs`) : (1) les lignes vides laissées par le titre du profil voisin avant le premier mot du corps le fermaient (Ugrik, L01 p. 14) ; (2) étiquettes Base / Adv. / Total à gauche de l'en-tête : hors fenêtre, donc ligne Total non cherchée et corps coupé (L01 p. 26) ; (3) étiquette de section décalée à gauche de l'en-tête (« Skills: » → « kills: », L03 p. 23, L04 p. 34) ; (4) « Traits*: » et sa note à astérisque (Isabella) ; (5) « Fate Points », « Armour by Location », « Miracles », « Special Rules » non reconnus comme rubriques (Brunner, Slann) ; (6) un « Doomed: « … » » faisait lire la liste de talents comme liste décrite V5 (Albrecht, Gunna) ; (7) Erzbet : prose à la place des rubriques, correction ciblée dans `BODY_OVERRIDES`.
- **État après** (contrôle Q11, L01-L04) : profils incomplets L01 7 → 4, L02 3 → 2, L03 1 → 0, L04 6 → 2 ; talents manquants L01 36 → 9, L04 62 → 1 ; compétences L01 53 → 20, L03 12 → 0, L04 55 → 0. Profils sans aucune donnée hors caractéristiques : L01-L04 7 → 0. Les manques restants sont justifiés un par un dans `QE-Q12a-3`.
- **Valeurs imprimées** : les 23 livres hors ces 2 profils : 0 écart avec `9c12613`. **Deux profils changent** (Nazzaalta E0-P-125, Artur Hammerfoot E0-P-126, tableau Base/Adv./Total : la ligne Total est maintenant lue) : question au MJ `QE-Q12a-1`.
- Les autres livres, régénérés par le même outil, n'ont gagné que des lignes (aucun profil retiré) : `QE-Q12a-4`. État de départ de Q12b/Q12c (mesuré, manques restants par livre) dans le contrôle : `node tools/verify-bestiary-stats.mjs L01 … L26`.
- Tests : `tests/pro-q12a-colonnes-imbriquees.test.js` (7 tests).
- **Branché / non appelé** : outil et données de livre seulement (aucune fonction de jeu ajoutée).

## Q12b — profils vides et colonnes, L07-L12 (FAIT)

- **Causes trouvées dans l'outil** (`tools/lib/bestiary-blocks.mjs`, `bestiary-profile.mjs`, alias dans `bestiary-complement-data.mjs`) : voir `QE-Q12b-1`. La principale : le Trait « Armour 3 (9) » en début de ligne faisait lire tout le bloc V4 (Boggrub Legbiter, Gutbug, Ratlicker, Skarsnik, profils de L07, L09, L11) comme un bloc V5, donc vide. Pour L10 (V5) : rubrique « Traits and Talents », armure « Armour +3 AP All », attaques sans deux-points, en-tête à cheval sur la gouttière, libellé centré.
- **État après** (contrôle Q11) : profils sans aucune donnée hors caractéristiques, L07-L12 : 19 → 0 (L09 : Dark Steed, War Hydra, Sea Dragon, Dockside Thug ; L10 : 7 ; L11 : 2 ; L12 : 4, dont Boggrub Legbiter p. 36, complet). Manques L07-L12 (total par catégorie) : talents 46 → 6, compétences 47 → 1, attaques 10 → 5, Traits 65 → 30, équipement 27 → 9 ; sorts (141) laissés à Q14. Détail et justification un par un : `QE-Q12b-4`.
- **Valeurs imprimées** : 23 livres comparés à `9c12613` : seuls E0-P-125 et E0-P-126 diffèrent (déjà signalés, `QE-Q12a-1`). Comparés à `HEAD` : 0 entrée perdue, 0 profil retiré (script `tmp/divin/q12b-removed.mjs`).
- Relectures ciblées (`BODY_OVERRIDES`) : Graug, Gretchen Beirne, Ranolf Quickfingers (`QE-Q12b-2`).
- Test : `tests/pro-q12b-profils-vides-l07-l12.test.js` (13 tests).
- **Branché / non appelé** : outil et données de livre seulement (aucune fonction de jeu ajoutée). Les attaques des profils gagnés deviennent des actions via `buildParticipantFromBestiary` (appelants : `js/ui/bestiary-library.js`, `js/core/bestiary-templates.js`) ; `spells`, `trappings` : code testé, non appelé.

## Q12c — profils vides et incomplets, L13-L26 (FAIT en partie)

- **Causes trouvées dans l'outil** (`tools/lib/bestiary-blocks.mjs`, `bestiary-profile.mjs`, `bestiary-record.mjs`, `bestiary-glossary.mjs`, `bestiary-overrides.mjs`) : voir `QE-Q12c-1`. Principales : un « : » dans une parenthèse vidait la liste des Traits (Great Eagle) ; la rubrique « Options: » coupait le bloc (Ogre Gorger : 11 compétences et 9 talents retrouvés) ; « 2 × » rendu en U+FFFD ; compétences collées par le livre ; Runesmithing.
- **État après** (contrôle Q11, L13-L26) : profils sans aucune donnée hors caractéristiques : 5 → 2 (les deux gabarits Infirm et Diamond in the Rough, sans Traits imprimés). Manques par catégorie : talents 44 → 37, compétences 80 → 66, attaques 34 → 30, Traits 70 → 54. **Le zéro du plan n'est pas atteint** : les manques restants (~187 lignes, dont ~74 sont du texte de profil voisin) ne sont justifiés que par groupes de causes (`QE-Q12c-4`), pas profil par profil.
- **Valeurs imprimées** : 23 livres comparés à `9c12613` : seuls E0-P-125 et E0-P-126 diffèrent (`QE-Q12a-1`) ; aucun profil retiré ; aucune entrée perdue par rapport à `HEAD`.
- Test : `tests/pro-q12c-profils-l13-l26.test.js` (7 tests).
- **Branché / non appelé** : outil et données de livre seulement (aucune fonction de jeu ajoutée). Les attaques gagnées (Great Eagle, Josef Aufwiegler) deviennent des actions via `buildParticipantFromBestiary` (appelants : `js/ui/bestiary-library.js`, `js/core/bestiary-templates.js`) ; `talents`, `spells`, `trappings` : code testé, non appelé.
