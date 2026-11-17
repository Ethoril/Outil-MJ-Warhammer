# Tâches · Traits optionnels des créatures et des montures

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md) · Valeurs : [valeurs-traits.md](valeurs-traits.md) · Inventaire : [inventaire.md](inventaire.md). Tout est séquentiel : deux lots n'écrivent jamais dans les mêmes fichiers en parallèle. Branche locale `traits-optionnels`, ne pas en changer. Sept lots, L1 à L7.

## Règles communes (chaque brief les reprend ; ce bloc est collé en tête de chaque prompt)

- Lire d'abord `CLAUDE.md` (racine), la spec en entier, le plan, et la section 4 de `valeurs-traits.md` pour tout lot qui touche D19. Les points « à trancher » du plan sont réputés tranchés selon leur recommandation, sauf si le MJ a répondu autrement (le prompt le dit).
- Le test d'un lot est écrit **avant** son code et échoue d'abord. Tests ciblés, **un fichier par commande** : `node --test tests/unit/<dossier>/<fichier>.test.js` (ou `.test.mjs`), jamais `node --test tests/unit/<dossier>` ; tout test navigateur sous `timeout 120`. Jamais la suite complète (lancée une fois à la fusion). Tout nouveau test unitaire va dans `tests/unit/`.
- Un agent ne modifie aucun fichier hors de sa liste « Fichiers autorisés » : s'il en faut un autre, il le signale dans son rapport et s'arrête sur ce point.
- Tout lot qui touche `js/ui/workspace-view.js` ou un écran partagé (Réserve, Jouer, Préparer) appelle le Store de façon tolérante (`Store.methode?.()`) et lance le socle navigateur dans son « fini quand » : `node tools/run-browser-journeys.mjs --socle` (le lanceur borne chaque parcours à 120 s).
- Tout nouveau module de `js/` est ajouté au précache de `sw.js` ; `node --test tests/unit/donnees/audit-meta-production.test.js` doit rester vert. Tout nouveau parcours navigateur est ajouté à `tests/parcours.json`.
- Interdits : modifier la spec ; pousser ; `git stash` ; `git add -A` ou `git add .` (nommer chaque fichier) ; changer une règle métier pour faire passer un test (s'arrêter et expliquer) ; reformater du code sans rapport ; ajouter une dépendance ; recopier du texte d'un livre (noms, chiffres, page, paraphrase de vingt mots au plus). Interface et messages en français. Yards = mètres, même valeur. Une absence de champ facultatif se lit comme vide au point de lecture, sans réécrire les données. N'envoyer rien sur le réseau.
- Commandes simples, une à la fois (les enchaînements `&&`, `|`, `;` peuvent être refusés).
- Commit local, fichiers nommés un par un, message en français suffixé « (Claude) », terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Rapport final, en français et court : fichiers modifiés (une ligne chacun), sortie de chaque commande « fini quand », hash du commit, ce qui n'a pas pu être vérifié.
- Si bloqué : s'arrêter et expliquer, ne pas improviser.

## L1 — Données : corrections D15, catalogue des Traits, table des modificateurs
*Modèle conseillé : Sonnet. Après : rien.*

**But.** Poser les trois données du chantier : les corrections des livres (D15), le catalogue des Traits (noms français et anglais, texte d'effet, nature du paramètre) et la table figée des modificateurs de D5, D6 et D19.

**Contexte.** Lire : `tools/build-bestiary-profiles.mjs` (`applyV3Patch`, option `--check`) et `tools/lib/bestiary-overrides.mjs` (`V3_PATCHES`, `addOptional`) ; `tools/build-creature-abilities.mjs` et `tools/build-fiche-mounts.mjs` (modèles de générateur avec `--check`) ; `docs/BESTIAIRE_INVENTAIRE.json` (`traits` : `nameFr`, `summaryFr`, `book`, `page`) ; `js/data/creature-trait-names.js` ; `valeurs-traits.md` §1 et §4 ; `inventaire.md` partie 2 (Stubborn, Trained (Magic) du Demigryph, Cheval de trait lourd). Les PDF sont dans `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/` (lecture seule, `pdftotext -layout`). Cibles D15 : « Stubborn » (L23 p. 22, rappel : Volonté +20, jets opposés pour mener la bête) au catalogue et en Trait optionnel de l'âne et de la mule `E0-P-759` ; Dressé (Magie) du Demigryph `E0-P-459` (L13 pp. 106-109) ; liste des dressages du Cheval de trait lourd `E0-P-763` (L23 p. 23, la virgule parasite de la donnée actuelle). Chaque nom du catalogue est relié à son entrée d'inventaire par le champ `ref` des Traits des profils ; un nom sans entrée reçoit un texte d'effet court rédigé en français (paraphrase) et `nameFrSource: 'proposition'`.

**Fichiers autorisés.** `tools/lib/bestiary-overrides.mjs`, `tools/build-bestiary-profiles.mjs` (seulement si la table de corrections l'exige), `js/data/bestiary/L13.json`, `js/data/bestiary/L23.json`, `js/data/bestiary/index.json` (régénérés par le générateur, jamais à la main), `tools/build-creature-trait-catalogue.mjs` (nouveau), `js/data/creature-trait-catalogue.js` (nouveau, généré, sans import), `js/data/optional-trait-modifiers.js` (nouveau, figé), `tests/unit/donnees/traits-optionnels-donnees.test.mjs` (nouveau), `sw.js` (précache).

**À livrer.** (a) Les trois corrections D15 par le générateur du bestiaire (le `--check` reste vert). (b) `js/data/creature-trait-catalogue.js` : tableau figé `{ name, nameFr, ref, summaryFr, book, page, param }` couvrant les 124 noms du bestiaire plus Stubborn, `param` ∈ `none | rating | text | size | trained | hatred` (D12) ; fonction `catalogueTraitOf(name)`. (c) `js/data/optional-trait-modifiers.js` : la table du plan (Big, Brute, Clever, Cunning, Fast, Tough, Hardy, Trained (War), modèles Elite et Leader) avec source et page par ligne, noms français du Livre de base français (Grand, Brutal, Intelligent, Rusé, Élite, Rapide, Meneur, Coriace, Endurant, Dressé) ; les valeurs des modèles V5 copiées de `E0-P-114` et `E0-P-115` (L06), soit les valeurs du point 1 du plan.

**Critères couverts.** CA24 ; CA17 et CA18 (données : catalogue, nature du paramètre) ; D3, D12, D13 (table), D15 ; D5, D6, D19 (données).

**Interdits spécifiques.** Ne rien modifier à la main dans `js/data/bestiary/*.json`. Ne pas toucher `js/core/`. Ne pas inventer de valeur absente des livres : écrire `null` et le signaler.

**Fini quand.**
- `node tools/build-bestiary-profiles.mjs --check L13 L23` (code 0).
- `node tools/build-creature-trait-catalogue.mjs --check` (code 0).
- `node --test tests/unit/donnees/traits-optionnels-donnees.test.mjs` (trois corrections D15 présentes ; 124 noms du bestiaire tous au catalogue ; table égale aux chiffres de `valeurs-traits.md` et aux modèles `E0-P-114` et `E0-P-115` de `L06.json` ; aucun import dans le fichier généré).
- `node tools/build-fiche-mounts.mjs --check` (code 0 ; sinon régénérer, puis `node tools/recopier-donnees-communes.mjs --check`).
- `node --test tests/unit/donnees/audit-meta-production.test.js`.

## L2 — Moteur pur : cases, exclusions, ajout libre
*Modèle conseillé : Sonnet. Après : L1.*

**But.** Écrire le modèle des coches et les règles de choix : quelles cases un profil propose, ce qui est grisé ou refusé, comment un Trait libre s'ajoute.

**Contexte.** Lire : `js/core/bestiary-profiles.js` (`buildParticipantFromBestiary`, `traitText`, `printedArmour`, `attackActions` : à exporter si besoin, sans changer leur comportement) ; `js/core/v5-magic-arbitrations.js` (`traitSize`, `transformationTraitsError` : modèle des règles de Taille exclusive) ; `js/core/mounts.js` (`isMountCandidate` : à ne pas modifier ici) ; `js/core/creature-magic-traits.js` (`TRAINED_EFFECTS`, lecture des dressages) ; `js/core/creature-size.js` (`parseSizeTrait`) ; `js/data/creature-trait-catalogue.js` et `js/data/optional-trait-modifiers.js` (L1).

**Fichiers autorisés.** `js/core/optional-traits.js` (nouveau), `js/core/bestiary-profiles.js` (exports seulement), `tests/unit/creatures/traits-optionnels-choix.test.js` (nouveau), `sw.js` (précache).

**À livrer.** `readOptionalChoices` (absence = vide, D14), `optionalCandidates` (une case par Trait optionnel imprimé ; une case par dressage de `Trained` : Guerre, Magie, Monture, Cavalerie de choc, etc. ; une case par attaque et par pièce d'armure optionnelle ; case grisée « déjà compté » pour un Trait déjà imprimé en base, D18 ; Leader absent des cases et refusé à l'ajout si le profil a Bestial, D17 ; une seule Taille, D11), `toggleOptionalTrait`, `addFreeTrait` (catalogue, paramètre exigé pour `rating`, `size`, `trained`, `hatred`, message français sans valeur ; refus du doublon sauf paramètre différent, CA19), `toggleOptionalAttack`, `toggleOptionalArmour` (instantané de l'action et de la pièce construit à partir de l'enregistrement du bestiaire). Fonctions pures, entrées gelées.

**Critères couverts.** CA1, CA2, CA13, CA14 (côté règle : un dressage Monture coché rend le profil candidat, `isMountCandidate` étant branché au lot L5), CA16 (case), CA17, CA18, CA19, CA20 (cases) ; CA6 (absence = vide) ; D1, D2, D3, D4, D12, D14, D17, D18.

**Interdits spécifiques.** Aucun effet sur les caractéristiques ici (lot L3). Ne pas toucher au Store ni à `js/ui/`.

**Fini quand.**
- `node --test tests/unit/creatures/traits-optionnels-choix.test.js` (profil avec 7 optionnels : 7 cases décochées ; profil sans optionnel : aucune case ; Trained (Broken, Mount, War) : trois cases ; deux Tailles refusées ; Leader refusé sur Bestial ; Trait déjà de base grisé ; ajout de Fear sans valeur refusé avec message ; doublon refusé, paramètre différent accepté ; entrées gelées ; chaque catalogue-nom ajoutable ou refusé avec motif).
- `node --test tests/unit/donnees/audit-meta-production.test.js`.

## L3 — Moteur pur : effets des Traits cochés et modèles V5
*Modèle conseillé : Sonnet. Après : L2.*

**But.** Calculer le profil effectif d'un profil à coches : Traits ajoutés, caractéristiques, Blessures, compétences, Talents, attaques et armure, avec la valeur imprimée et la valeur modifiée.

**Contexte.** Lire : `valeurs-traits.md` entier (D10, D13, D16, D19 et la mécanique de calcul §4) ; `js/core/v5-magic-arbitrations.js` (`creatureWounds`, `hardyRank`) ; `js/core/bestiary-templates.js` (`applyBestiaryTemplates` : la règle d'ajout des compétences et des Talents, ses deux défauts notés au §4 ; à ne pas modifier, la reprendre dans le nouveau module) ; `js/core/reference-catalog.js` (`resolveSkill`, `resolveTalent`) ; `js/core/creature-size.js` (`creatureSizeOf`) ; `js/core/creature-magic-traits.js` (Guerre : +10 CC et exception Craintif) ; `js/core/v5-magic-arbitrations.js` (`previewBeastForm` voisin : Taille et Blessures recalculées).

**Fichiers autorisés.** `js/core/optional-traits.js`, `tests/unit/creatures/traits-optionnels-effets.test.js` (nouveau).

**À livrer.** `applyOptionalChoices(profile)` → `{ profile, changes, notes }` : (1) chaque Trait coché ajouté à `traits` au format « Nom (param) », Dressé fusionné en un seul texte, donc identique au Trait imprimé (D9, CA7) ; (2) modificateurs de la table sur `caracs` (M comprise), `initiative` suit I ; cumul simple de deux Traits (CA10) ; (3) un Trait de D5 imprimé en base n'a aucun effet (D10, CA11) ; (4) Elite et Leader appliquent le modèle V5 à la place du Trait V4 (D19) : caractéristiques, compétences (règle de total du point 2 du plan, caractéristique manquante jamais inventée, signalée en `notes`), Talents ajoutés avec leurs clés `talent-…` ; (5) Hardy et Taille : Blessures = imprimées + différence de formules (D16, D11, point 4) ; sans F, E ou FM, Blessures inchangées et une note ; Taille cochée remplace le Trait `Size` ; (6) Trained (War) : CC +10 (D6, CA15) ; (7) compétences liées, base de l'attaque et dégâts de mêlée suivent les écarts (point 3 du plan) ; (8) attaques et pièces d'armure cochées entrent dans `diceLines` et `armor` (maximum par zone, comme `printedArmour`) (CA21) ; (9) `changes` donne pour chaque champ la valeur imprimée, la valeur effective et la source (le Trait). Sans coche, le résultat est le profil d'entrée, strictement égal.

**Critères couverts.** CA7, CA9, CA10, CA11, CA12, CA15 (bonus de Guerre), CA21 ; CA6 (sans coche, identique) ; D5, D6, D9, D10, D11, D13, D16, D19.

**Interdits spécifiques.** Aucun calcul de Trait hors D5, D6 (Guerre), D11, D16, D19 (hors périmètre de la spec). Ne pas modifier `applyBestiaryTemplates`. Ne pas toucher au Store ni à `js/ui/`.

**Fini quand.**
- `node --test tests/unit/creatures/traits-optionnels-effets.test.js` (chaque Trait de D5 pris seul, Fast et Tough pris ensemble, Hardy sur Taille Petite, Moyenne et Grande, Taille Grande cochée recalculant les Blessures par différence, Elite et Leader appliqués à un profil et à une bête sans CT, décocher rend exactement l'imprimé, Trait de base imprimé sans effet, Trait déjà calculé : mêmes résultats que l'imprimé sur Cornes, Furtif, Pisteur, Venin, Infravision, entrées gelées).
- `node --test tests/unit/creatures/traits-optionnels-choix.test.js` (reste vert).

## L4 — Rappels de tous les Traits et mise à jour de l'inventaire
*Modèle conseillé : Sonnet. Après : L3.*

**But.** Garantir qu'aucun des 124 noms de Traits ne reste sans affichage, et que l'inventaire ne classe plus aucun Trait « rien ».

**Contexte.** Lire : `js/core/reminders.js` (`TRAIT_REMINDERS`, `traitReminderTexts`) ; les modules `creature-movement.js`, `creature-states.js`, `creature-psychology.js`, `creature-senses.js`, `creature-magic-traits.js`, `creature-abilities.js` (comment chacun lit `traits`, nom anglais et français) ; `js/data/creature-abilities.js` (Disruption et Creature Weapons déclarés couverts sans code qui les lise) ; `js/data/creature-trait-catalogue.js` ; `inventaire.md` partie 1 (colonne « état »).

**Fichiers autorisés.** `js/core/optional-traits.js`, `js/core/reminders.js` (une ligne de `TRAIT_REMINDERS` et son import), `tests/unit/creatures/traits-optionnels-rappels.test.js` (nouveau), `docs/specs/traits-optionnels/inventaire.md` (colonne « état » et « preuve » seulement), `docs/specs/traits-optionnels/plan.md` (seulement pour corriger une signature devenue fausse).

**À livrer.** `catalogueReminders(participant)` : pour chaque Trait du participant qu'aucun autre module n'affiche, une ligne « Nom français : texte d'effet » tirée du catalogue (D7, CA8) ; rappel des exceptions de Guerre et de Magie à Craintif, et de Cavalerie de choc (CA15, CA16) ; pour un Trait de D5 ou un modèle appliqué, une ligne « modifie le profil : … » ; Disruption et Creature Weapons passent en rappel, mention portée dans l'inventaire. Le texte n'est jamais écrit dans le participant (calculé à l'affichage, comme les autres rappels).

**Critères couverts.** CA8, CA15 et CA16 (rappels), CA25 ; D7, D9.

**Interdits spécifiques.** Aucun nouveau calcul de Trait : rappel seulement. Ne pas dupliquer le rappel d'un Trait déjà affiché par un autre module (le test le vérifie). Ne pas modifier `js/data/creature-abilities.js`.

**Fini quand.**
- `node --test tests/unit/creatures/traits-optionnels-rappels.test.js` (pour chacun des 124 noms, un participant qui le porte donne au moins un rappel par `deriveReminders` ; aucun doublon ; Dressé (War), (Magic) et (Shock Cavalry) donnent leur rappel).
- `node --test tests/unit/creatures/traits-optionnels-effets.test.js` (reste vert).
- Recherche : aucune ligne « rien » dans la colonne « état » de `inventaire.md`.

## L5 — Store, historique, export JSON, mise à jour des PJ
*Modèle conseillé : Opus (touche l'historique, la création des participants, l'export JSON et la synchronisation des fiches). Après : L4.*

**But.** Faire vivre les coches dans le Store : commande annulable, application à la création des participants, sauvegarde, export et import JSON, monture d'un PJ après « Mettre à jour les PJ ».

**Contexte.** Lire : `js/core/store.js` (`participantFromProfile` l. 1320, `diceLinesFromProfile` l. 1334, `updateProfile` l. 1834, `setProfileMount` l. 3875, câblage des api l. 4256) ; `js/core/store/api-engagements.js` (modèle de commande : `api.executeCommand`, journal, refus) ; `js/core/fiche-sync.js` (`planMountSync` l. 288, `ficheMount`) et `js/ui/fiche-sync-view.js` (phrase de l'aperçu de la monture) ; `js/core/json-profile-export.js` et `json-profile-import.js` (clés connues, `PROFILE_IGNORED`, signalement des clés inconnues) ; `js/core/mounts.js` (`isMountCandidate`) ; `tests/unit/combat/engagements-store.test.js` (modèle de test de Store : `loadFromJSON`, ↶/↷) ; `tests/unit/combat/montures-fiche.test.js` ; `tests/unit/stockage/relecture-rtdb-balayage.test.js` ; `tests/unit/refactor/store-golden.test.js`.

**Fichiers autorisés.** `js/core/store/api-optional-traits.js` (nouveau), `js/core/store.js` (câblage et les deux fonctions seulement), `js/core/mounts.js` (`isMountCandidate` lit aussi les coches), `js/core/json-profile-export.js`, `js/core/json-profile-import.js`, `js/ui/fiche-sync-view.js` (une phrase d'aperçu), `tests/unit/stockage/traits-optionnels-store.test.js` (nouveau), `tests/unit/combat/traits-optionnels-monture.test.js` (nouveau), `sw.js` (précache).

**À livrer.** `setProfileOptionalChoices(profileId, choices, { expectedLocalRevision })` : commande `set-optional-choices`, entrée d'historique, ligne de journal en français, refus d'un profil inconnu ou d'un PJ, aucune propagation aux participants (D2) ; `participantFromProfile` et `diceLinesFromProfile` passent par `applyOptionalChoices` (sans coche : sortie strictement identique à aujourd'hui, golden master inchangé) ; `isMountCandidate` accepte un profil dont une coche est Trained avec Monture (CA14) ; export JSON : clé `traitsOptionnels` (les coches), import : relue et validée avec message français, clé inconnue d'une version plus ancienne ignorée sans erreur ; aperçu de « Mettre à jour les PJ » : quand l'espèce de la monture change (`replace`) et que le profil en place a des coches, la ligne dit qu'elles sont retirées ; quand l'espèce est la même, le profil de la monture n'est pas reconstruit et ses coches restent (CA23, D8).

**Critères couverts.** CA3, CA4, CA5, CA6, CA14 (branchement), CA22 (profil `monture-<PJ>` ordinaire), CA23 ; D2, D8, D14.

**Interdits spécifiques.** Aucune modification de `tests/fixtures/store-golden.json`. Ne rien changer au calcul d'un participant sans coche. Ne pas toucher `js/ui/reserve.js` ni `workspace-view.js`. Si le test d'un chemin de sauvegarde ou de synchronisation échoue pour une raison étrangère aux coches, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/stockage/traits-optionnels-store.test.js` (coche puis participant ajouté porte le Trait, participant déjà en combat inchangé, décocher, ↶ et ↷, rechargement par `loadFromJSON`, export puis import JSON identique, profil ancien sans coche identique, révision périmée refusée).
- `node --test tests/unit/combat/traits-optionnels-monture.test.js` (coches de la monture conservées par « Mettre à jour les PJ » à espèce inchangée ; espèce changée : repart sans coche et l'aperçu le dit ; cavalier qui entre en combat avec sa monture cochée).
- `node --test tests/unit/refactor/store-golden.test.js`.
- `node --test tests/unit/combat/montures-fiche.test.js`.
- `node --test tests/unit/combat/montures.test.js`.
- `node --test tests/unit/donnees/audit-meta-production.test.js`.

## L6 — Interface : panneau « Traits optionnels » et ajout d'un Trait
*Modèle conseillé : Sonnet. Après : L5.*

**But.** Montrer le panneau sur le profil de Réserve (cases, valeur imprimée et valeur modifiée, « Ajouter un Trait ») et brancher la recherche de monture sur les coches.

**Contexte.** Lire : `js/ui/reserve.js` (`ensureMountSection`, `ensureKeywordPicker`, `setMountSubject` : comment une section s'insère dans le formulaire et se remplit à l'édition) ; `js/ui/keyword-picker.js` (modèle de sélecteur avec recherche) ; `js/ui/v5-spell-options.js` (précédent des cases à cocher de Traits, `traitChoices`) ; `js/ui/messages.js` ; `tests/unit/ui/poursuite-v5-panneau.test.js` (modèle de test d'interface : faux DOM, Store réel) ; `MJ.css` (classes de formulaire). Le Store s'appelle toujours par `Store.setProfileOptionalChoices?.()`.

**Fichiers autorisés.** `js/ui/optional-traits-panel.js` (nouveau), `js/ui/reserve.js` (section et recherche de monture seulement), `MJ.css` (classes du panneau seulement), `tests/unit/ui/traits-optionnels-panneau.test.js` (nouveau), `sw.js` (précache).

**À livrer.** Panneau pour tout profil non PJ (point 6 du plan) : une case par Trait optionnel (décochée au départ), une case par dressage, une par attaque et par pièce d'armure optionnelle, cases grisées « déjà compté », Tailles exclusives, Leader absent sur une créature Bestial ; un profil sans optionnel montre seulement « Ajouter un Trait » (CA2) ; dialogue d'ajout avec recherche par nom français ou anglais, saisie du paramètre, message français en cas de refus, retrait d'un Trait ajouté ; ligne « imprimé → modifié » pour chaque caractéristique, les Blessures, le Mouvement et l'initiative changés (CA9) ; chaque changement est une commande annulable ; la recherche de monture d'un PJ propose aussi les profils de Réserve cochés Monture (CA14, point 5 du plan) ; le profil `monture-<PJ>` montre le même panneau (CA22). Accessibilité : cases libellées, `aria-live` pour les refus, focus rendu au bouton « Ajouter un Trait » après fermeture.

**Critères couverts.** CA1, CA2, CA13, CA14, CA17, CA18, CA19, CA20 (cases), CA22 (même panneau) ; CA9 (affichage imprimé / modifié) ; D1, D3, D4, D5, D12, D17, D18.

**Interdits spécifiques.** Ne pas toucher `js/ui/workspace-view.js`. Ne pas appeler le Store sans `?.`. Ne pas écrire de style en ligne hors de ce que `reserve.js` fait déjà ; classes dans `MJ.css`.

**Fini quand.**
- `node --test tests/unit/ui/traits-optionnels-panneau.test.js` (cases, grisés, exclusions, ajout avec et sans paramètre, imprimé / modifié, appel du Store tolérant à un Store sans la méthode).
- `node --test tests/unit/ui/aria-labelledby.test.mjs`.
- `node --test tests/unit/donnees/audit-meta-production.test.js`.
- `node tools/run-browser-journeys.mjs --socle` (tous verts).

## L7 — Parcours navigateur de bout en bout
*Modèle conseillé : Sonnet. Après : L6.*

**But.** Prouver dans le navigateur le chemin complet : cocher sur un profil de Réserve, entrer en rencontre, recharger, monture d'un PJ.

**Contexte.** Lire : `tests/monture-fiche-browser.mjs` et `tests/browser-bestiary-library.mjs` (modèles de parcours : serveur local, `tests/helpers/browser.mjs`) ; `tests/parcours.json` ; `tools/run-browser-journeys.mjs` ; `js/ui/optional-traits-panel.js`. Profils d'essai : Heavy Warhorse (`E0-P-766`, Champion, Clever, Elite, Hardy, Rear, Tough optionnels), Heavy Draught Horse (`E0-P-763`), une créature sans optionnel.

**Fichiers autorisés.** `tests/traits-optionnels-browser.mjs` (nouveau), `tests/parcours.json`, `docs/specs/traits-optionnels/plan.md` (seulement pour corriger la table de vérification).

**À livrer.** Un parcours : copier Heavy Warhorse en Réserve, cocher Tough et Hardy (Blessures et E changent à l'écran, valeur imprimée visible), ajouter Fear (2) par « Ajouter un Trait », refuser Fear sans valeur, cocher une attaque ou une armure optionnelle d'une autre créature, ajouter à une rencontre et lire les Traits du participant, décocher (↶ rend l'état), recharger la page et vérifier les coches, exporter puis importer le JSON du profil, ouvrir le profil `monture-<PJ>` d'un PJ de test (même panneau) ; un profil sans optionnel ne montre que « Ajouter un Trait ». Classer le parcours dans `tests/parcours.json` (famille « ticket », chantier « traits-optionnels »).

**Critères couverts.** CA1, CA2, CA3, CA4, CA5, CA9, CA12, CA17, CA18, CA20, CA22 (de bout en bout) ; non-régression du socle.

**Interdits spécifiques.** Aucune modification de `js/`. Si le parcours révèle un défaut du code, le consigner dans le rapport avec la reproduction, sans le corriger.

**Fini quand.**
- `timeout 120 node tests/traits-optionnels-browser.mjs`.
- `timeout 120 node tests/browser-bestiary-library.mjs`.
- `timeout 120 node tests/monture-fiche-browser.mjs`.
- `node tools/run-browser-journeys.mjs --socle` (tous verts).
- `node tools/run-browser-journeys.mjs traits-optionnels` (le parcours est classé et lancé par le lanceur).

## À la fusion (hors lots)

Une seule fois, suite unitaire complète (`node --test "tests/unit/**/*.test.js"`, puis `node --test "tests/unit/**/*.test.mjs"`), `node tools/build-bestiary-profiles.mjs --check`, `node tools/build-creature-trait-catalogue.mjs --check`, `node tools/recopier-donnees-communes.mjs --check`. Le numéro de version et la publication restent au MJ (`node tools/bump-version.mjs`, notes rédigées à la main).
