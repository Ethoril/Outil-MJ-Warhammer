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
| Q13 | FAIT (cas nommés L04, L09, L11, L14, L17, L18 ; écarts justifiés `QE-Q13-1`) | (voir `git log`, « Q13 ») |
| Q14 | FAIT (sorts lus, fiche et participant ; manques restants justifiés `QE-Q14-4`) | (voir `git log`, « Q14 ») |
| Q15 | FAIT (zéro U+FFFD dans les 23 livres ; noms de talents rattachés, `QE-Q15-1` à `QE-Q15-4`) | (voir `git log`, « Q15 ») |
| Q16 | FAIT (`QE-Q16-1`, `QE-Q16-2`) | (voir `git log`, « Q16 ») |
| Q17 | FAIT (`QE-Q17-1` à `QE-Q17-4`) | (voir `git log`, « Q17 ») |
| Q18 | FAIT (`QE-Q18-1` à `QE-Q18-5`) | (voir `git log`, « Q18 ») |
| R | FAIT (avec réserve : manques de complétude non justifiés un par un) | (voir `git log`, « R ») |
| R2 | FAIT (avec réserve : `QE-R2-1`) | (voir `git log`, « R2 ») |
| Q20 | FAIT (`QE-D-23-1`, `QE-Q20-1`, `QE-Q20-2`) | (voir `git log`, « Q20 ») |

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

## Q13 — cas résiduels nommés (FAIT)

- **Causes d'outil réparées** (`tools/lib/bestiary-blocks.mjs`, `bestiary-profile.mjs`, `bestiary-record.mjs`, `bestiary-overrides.mjs`, `bestiary-complement-data.mjs`, `bestiary-extract.mjs`) : Traits décrits en paragraphes (Kharibdyss) ; « Tentacles » = attaque (Kraken 8 ×, Amoebae 2 ×) ; « Name: (90/+6) » jamais découpé et qualités nommées (Duriath Helbane, relu en `BODY_OVERRIDES`) ; « Possessions » = équipement (Zombie) ; titre de profil voisin et description d'objet retirés de l'équipement (Combat Familiar, Nastassia) ; listes « Petty Spells », « Witchcraft Spells » (Ceyluii, Fialthra, Litharys) ; liste de spécialisations d'Arcane Magic gardée ; « Language (Magick 74, Reikspiel) 48 » (Grey Seer). Détail et écarts justifiés : `QE-Q13-1`, `QE-Q13-2`.
- **Livres régénérés** : L09, L11, L14, L17, L18 (L04 relu, inchangé). Comparaison à `HEAD` : plus aucune entrée perdue hors parasites.
- **Valeurs imprimées** : 23 livres comparés à `9c12613` : seuls E0-P-125 et E0-P-126 diffèrent (`QE-Q12a-1`) ; 0 profil retiré. Contrôle des valeurs : toutes les lignes retrouvées sur L04, L09, L11, L14, L17, L18.
- Test : `tests/pro-q13-cas-nommes.test.js` (9 tests) ; suite complète lancée une fois, sans échec.
- **Branché / non appelé** : outil et données de livre seulement, aucune fonction de jeu ajoutée ; `attacks` gagnées → actions via `buildParticipantFromBestiary` (appelants : `js/ui/bestiary-library.js`, `js/core/bestiary-templates.js`) ; `spells`, `trappings`, `talents` : code testé, non appelé.

## Q14 — sorts des profils (FAIT)

- **Outil** (`tools/lib/bestiary-blocks.mjs`, `bestiary-profile.mjs`) : `readSpells` rend un objet { liste : [noms] } aux intitulés canoniques (`Petty`, `Arcane`, `Arcane and Lore`, `Lore of X`, `High Magic`…), `spells` pour une liste sans intitulé et `notes` pour la prose ; numéros de page, renvois « (see page 137) » et césures retirés ; une liste collée à la précédente (« … Ward Lore of Metal: … », « Light: », « Witchcraft: ») est séparée. Le corps d'un profil ne s'arrête plus avant « SPELLS » (intitulé centré, Eusapia L26 p. 48), « Petty: », « Arcane: » ou un Domaine seul (Brine Wife L07 p. 75). Choix : `QE-Q14-1` à `QE-Q14-5`.
- **Livres régénérés** (23, 15 fichiers modifiés) : 46 profils ont des sorts (662 noms), dont 10 qui n'en avaient aucun ; comparaison profil par profil avec `HEAD` : seules des entrées de sorts s'ajoutent, des fragments de prose disparaissent de l'équipement. Caractéristiques et Blessures : identiques à `9c12613` sauf E0-P-125 et E0-P-126 (déjà signalés, `QE-Q12a-1`).
- **Régressions de Q13 corrigées au passage** (livres alors non régénérés : L06, L10, L16) : attaques de L06 (Dragon, Manticore, Troll…) et L10 (qualités des Foils), équipement de Brokk / Thurma / Nanna (L16), Traits facultatifs du Dog (L06). `QE-Q14-3`.
- **Contrôle Q11** : sorts manquants 516 → 14 (8 profils, tous des artefacts de lecture du texte brut, `QE-Q14-4`). Le contrôle lit désormais le champ par liste et arrête la liste imprimée à « Trappings » et aux Domaines suivants.
- **Fiche de la bibliothèque et participant** : ligne « Sorts » de `renderBestiarySheet` ; `buildParticipantFromBestiary` copie les sorts dans `extensions.v5.bestiary.spells` (la copie dans la Réserve les garde) ; section « Sorts du profil (bestiaire) » de `renderFicheDetails`. Aucune valeur durable de personnage (`VARIABLES_PERSISTANTES_PJ.md` inchangé : créatures, pas de PJ).
- **Branché / non appelé (grep dans `js/`)** : **branché** — `bestiarySpellLines` (js/core/bestiary-profiles.js) est appelé par `js/ui/bestiary-library.js` (`renderBestiarySheet`, fiche ouverte par le bouton « Fiche » de la bibliothèque) et `js/ui/fiche-details.js` (`renderFicheDetails`, appelé par `js/ui/workspace-view.js` pour la fiche d'un participant et par `js/ui/reserve.js` pour un profil de Réserve) ; `extensions.v5.bestiary.spells` est posé par `buildParticipantFromBestiary` (appelants : `bestiary-library.js`, `bestiary-templates.js`, `v5-spell-contracts.js`). **Non appelé par le moteur de magie** : les sorts du bestiaire sont en consultation seulement, volontairement hors de `participant.spells` (`QE-Q14-2`).
- Tests : `tests/pro-q14-sorts.test.js` (13 tests, dont rendu de la fiche et de la fiche du participant avec un faux DOM) ; `tests/pro-q5-sea-wardens.test.js` et `tests/pro-q13-cas-nommes.test.js` mis à jour pour la forme canonique.

## Q15 — normalisation des noms (FAIT)

- **U+FFFD** : nouveau `tools/lib/bestiary-glyphs.mjs` (`repairGlyphs`), table par mot dont chaque glyphe a été lu sur la page du PDF rendue en image (Elthárin, Drakenhöhenzug, Zweihänder, Phâ's Protection, Mána, Bögen, « 11/– », « (Chaos – Tzeentch) », « d10 × 30 », puces de Lord Skrolk). Appliquée dans l'extraction, la génération des prétirés et le contrôle `verify-bestiary-stats.mjs`. Un glyphe hors table reste visible. **Aucun U+FFFD dans les 23 livres** (avant : 24 occurrences). Choix : `QE-Q15-1`.
- **Talents** (`tools/lib/bestiary-record.mjs`) : `canonicalTalentName` rattache les graphies imprimées au nom du catalogue (Read/ Write, Warleader, Fleet Footed, Public Speaking, Resistance (X) → Resistant (X), etc.) ; `splitGluedTalent` retire le titre de la rubrique voisine collé à un talent (« Warleader Stinging Tail », « War Wizard Slann ») ou sépare deux talents du catalogue. « Strider (Coastal) » et les noms sans équivalent sûr sont laissés (`QE-Q15-2`, `QE-Q15-3`). « Read/Write » est reconnu par le résolveur (`talent-read-write`).
- **Livres** : 23 régénérés par `tools/build-bestiary-profiles.mjs` ; 21 fichiers modifiés, seuls des noms changent (comparaison avec `HEAD` : les « pertes » sont toutes des renommages ou des parasites retirés). Valeurs imprimées : comparaison avec `9c12613`, seuls E0-P-125 et E0-P-126 diffèrent (`QE-Q12a-1`). Contrôle Q11 : 0 écart de valeurs, avertissements de compétence « Elthárin » / « Mána » (6) disparus ; manques globaux L01-L26 après Q15 : talents 41, compétences 85, attaques 33, Traits 68, sorts 14 (non mesurés avant ce lot dans le même format ; Q15 ne vise pas ces manques).
- **Test** : `tests/pro-q15-normalisation-noms.test.js` (5 tests). Assertion mise à jour : `pro-q12b` (Nimble Fingered → Nimble-fingered, `QE-Q15-4`). Suite complète lancée une fois : 4364 réussis, 1 échec (cette assertion), corrigé et relancé en vert.
- **Branché / non appelé** : outil et données de livre seulement. Les noms normalisés sont lus par `buildParticipantFromBestiary` (appelants : `js/ui/bestiary-library.js`, `js/core/bestiary-templates.js`) ; les `talents` du profil eux-mêmes restent consultables sans appelant du moteur (code testé, non appelé).

## Q16 — attaques multiples (FAIT)

- `js/core/bestiary-profiles.js` (`attackActions`) : une attaque à `count` ≥ 2 donne autant d’actions (« Claws 1 », « Claws 2 » ; Kraken : 8 Tentacles), chacune marquée `multiAttack` et attaque gratuite `all` par défaut ; `validateBestiaryRecord` refuse un multiplicateur invalide ; la fiche de la bibliothèque affiche « 2 × Claws ». Source : L06 p. 362 (Bog Octopus). Choix : `QE-Q16-1`.
- Test : `tests/pro-q16-attaques-multiples.test.js` (4 tests, sur le **participant** et la copie de Réserve). Assertion mise à jour : `pro-b1-participant` (`QE-Q16-2`). Suite complète lancée une fois : 4368 réussis, 1 échec (cette assertion), corrigé et relancé en vert.
- **Branché** : `buildParticipantFromBestiary` (appelants : `js/ui/bestiary-library.js`, `js/core/bestiary-templates.js`, `js/core/v5-spell-contracts.js`) produit les actions ; chemin d’interface : bibliothèque du bestiaire → « Ajouter au combat ». `multiAttack` et `freeAttack` ne sont lus par aucun module de `js/` (code testé, non appelé pour ces deux marques : informatives).

## Q17 — rappels réellement visibles (FAIT)

- `js/core/reminders.js` (`deriveReminders`) : chaque entrée de `participant.extensions.v5.reminders` (participants hors banc) devient un rappel `participant-reminder` « Nom : texte » ; une décision Résoudre/Ignorer vaut pour les Rounds suivants. `buildParticipantFromBestiary` pose `armour-unresolved` (armure inconnue, Q6) ; `removeExpiredSummons` pose `demon-expired` (Q7) avec un texte selon l'issue (`summonOutcome`, posé par `v5-spell-contracts.js`) : le démon qui l'emporte n'a plus « ordre accompli ». La copie de Réserve garde le rappel (via `extensions`). Fiche de la bibliothèque : « zones : » seulement si `detail` nomme une zone, sinon « détail : ». Choix : `QE-Q17-1` à `QE-Q17-4`.
- Test : `tests/pro-q17-rappels-visibles.test.js` (7 tests : rappel par `deriveReminders` sur le participant, Réserve, résolution persistante, démon des deux issues via le Store). Suite complète lancée une fois : 4376 réussis, 0 échec.
- **Branché (appelant + chemin d'interface)** : `deriveReminders` ← `Store.getReminders` (js/core/store.js) ← `openRemindersView` et `renderWorkspaceOverview` (js/main.js, « Rappels de séance » et « À traiter » de Jouer) ; `getReminders` lit `activeScene.participants`, recopié des participants du combat (store.js l. 487). Je n'ai pas lancé l'interface dans un navigateur : le rendu est établi par lecture du code et par test de `deriveReminders`, pas par capture. `armourDetailNamesZones` ← `js/ui/bestiary-library.js`.

## Q18 — attaques naturelles réellement appliquées (FAIT)

- `js/core/resolution.js` (`naturalPlanOf`) : l'attaque naturelle déclarée dans `v5.context.naturalAttack` remplace les dégâts de l'action par ceux du plan (Souffle BF+n / BE+n) et pose sur la cible les états du plan à la touche (Langue, Constricteur, Toile : Enchevêtré ; Souffle : Enflammé, Fatigué, Sonné, Empoisonné) ; rappels du plan dans l'aperçu, points non résolus bloquants. `creature-combat.js` : Langue sans condition de Taille pour l'Enchevêtré (rappel d'attirance selon la Taille) ; Souffle d'un type absent des cas du livre de base : `unresolved` (Corrosion, Warpfire, Slime, Soporific, Nightmares, `QE-Q18-4`). `creature-magic.js` : Dressé à plusieurs compétences, un effet par compétence. `v5-store-action.js` : Tailles et Charge lues aussi dans les champs de l'interface.
- Test : `tests/pro-q18-attaques-naturelles.test.js` (7 tests, par `store.previewResolution` puis `applyResolution` : Langue → Enchevêtré quelle que soit la Taille ; Souffle de feu → mêmes dégâts qu'une arme fixe de 8 et cible Enflammée, Blessures retirées). Assertion T2 mise à jour (`QE-Q18-3`). Suite complète lancée une fois : 4383 tests, 1 échec (cette assertion), corrigé et relancé en vert.
- **Branché (appelant + chemin d'interface)** : `naturalPlanOf` ← `normalizeResolutionInput` et `previewResolution` (js/core/resolution.js) ← `Store.previewResolution` ; chemin : panneau de Résolution → liste « Attaque naturelle » (`js/ui/resolution-panel.js`, `naturalCombatTraits`) → `v5.context.naturalAttack` (`v5Input`, workspace-view.js). Je n'ai pas lancé l'interface dans un navigateur : le test du panneau est une vérification du source, pas un rendu. **Code testé, non appelé** : `planCreatureMagic` (Dressé) n'a toujours aucun appelant dans `js/` hors de son module.

## Q19 — familiers : nettoyage des liens (FAIT)

- `js/core/store.js` (`removeParticipant`) : retirer un familier retire sa ligne de `familiarLinks` chez le maître (le garde-fou `familiar-is-master` ne bloque plus le maître) ; un participant lié passe toujours par la commande annulable `remove-participant`, avec ou sans persistance, si bien qu'Annuler restaure aussi les liens sans persistance. `js/core/familiars.js` : deux instructions collées sur une ligne séparées. Choix : `QE-Q19-1`.
- Test : `tests/pro-q19-familiers-nettoyage.test.js` (6 tests, avec et sans persistance : nettoyage du maître, Annuler après retrait du maître, Annuler après retrait du familier). Suite complète lancée une fois : 4389 réussis, 0 échec.
- **Branché (appelant + chemin d'interface)** : `Store.removeParticipant` est déjà appelé par l'interface existante (retrait d'un participant du combat) ; je n'ai pas lancé l'interface dans un navigateur. Aucune valeur durable de personnage (`VARIABLES_PERSISTANTES_PJ.md` inchangé).

## R2 — clôture de la deuxième passe (FAIT, avec réserve)

- **Contrôle Q11, 23 livres** : 0 écart de valeurs, toutes les lignes retrouvées ; 10 avertissements de compétence (texte brut de la page). Manques restants : talents 41, compétences 85, attaques 33, Traits 68, équipement 154 (dont 69 bruits de colonne voisine), sorts 14. Détail par livre : sortie de `node tools/verify-bestiary-stats.mjs` et `tmp/divin/bestiary-completude-<livre>.json`. **Réserve : justifiés par groupes de causes seulement, pas profil par profil** (`QE-R2-1`).
- **Valeurs imprimées** : 23 livres comparés à `9c12613` : seuls E0-P-125 et E0-P-126 diffèrent (`QE-Q12a-1`, en attente du MJ) ; 0 profil ajouté ou retiré.
- **Recette** : `node tools/run-divine-recipe.mjs` : « RECETTE DIVINE VERTE — 26 commandes » (suite complète `node` incluse, sans échec). Manifeste de base régénéré (`QE-R2-2`).
- **Branché (appelant + chemin d'interface) / non appelé** : Q10b : talent au catalogue (`resolveTalent`), `leadershipRallySlModifiers` code testé, non appelé. Q14 : sorts branchés (`bestiarySpellLines` ← `bestiary-library.js`, `fiche-details.js`), hors moteur de magie. Q15 : outil et données. Q16 : branché (`buildParticipantFromBestiary` ← bibliothèque, « Ajouter au combat ») ; `multiAttack` et `freeAttack` informatifs, non lus. Q17 : branché (`deriveReminders` ← `Store.getReminders` ← `main.js`), rendu non vérifié dans un navigateur. Q18 : branché (panneau de Résolution → `naturalAttack` → `naturalPlanOf`) ; `planCreatureMagic` code testé, non appelé. Q19 : branché (`Store.removeParticipant`).

## Q20 — attaques gratuites des attaques multiples (FAIT)

- Décisions du MJ du 23/10 consignées (`QE-D-23-1`). `js/core/bestiary-profiles.js` : Tentacules, toutes les actions sont des attaques gratuites ; autre multiplicateur (Carrion « Claws 2 »), seules les actions au-delà de la première le sont ; le Trait s'écrit « Tentacles (8 × +9) ». `js/core/v5-store-action.js` : quota par Tour réel des attaques gratuites, sans Élan (Kraken 8, Carrion 1 Griffe gratuite). `js/core/creature-combat.js` : quota des Tentacules tiré du nombre imprimé (Kraken 8, Amoebae E0-P-027 = 2, Jetsam E0-P-028 = 2) et non de la valeur +9. Souffle de Fumée : `noDamage`, `js/core/resolution.js` n'applique aucun dégât. Dégâts du Trait V5 déjà prioritaires sur l'imprimé, vérifié par un test sur un profil V4. Choix : `QE-Q20-1`, `QE-Q20-2`.
- Test : `tests/pro-q20-attaques-gratuites.test.js` (6 tests, par `previewResolution` / `applyResolution` du Store). Suite complète lancée une fois : 4395 réussis, 0 échec.
- **Branché (appelant + chemin d'interface)** : le quota est lu dans `v5-store-action.js` à partir de l'action choisie du participant (bibliothèque → « Ajouter au combat » → panneau de Résolution) ; `naturalPlanOf` ← panneau « Attaque naturelle ». Rendu non vérifié dans un navigateur. `multiAttack` est désormais lu (Store), `freeAttack` aussi.
