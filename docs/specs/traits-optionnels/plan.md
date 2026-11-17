# Plan · Traits optionnels des créatures et des montures

Sur `9907ed6` (branche `traits-optionnels`). Spec : [spec.md](spec.md) (D1 à D19, CA1 à CA25). Valeurs : [valeurs-traits.md](valeurs-traits.md) (section 4 pour D19). Inventaire : [inventaire.md](inventaire.md). Tâches : [tasks.md](tasks.md).

## Approche

1. **Le profil garde l'imprimé, les coches vivent à côté (D2, D14).** `extensions.v5.optionalChoices` sur le profil de Réserve. Absence = aucune coche, lue comme vide au point de lecture, rien réécrit (CA6). Le profil de Réserve n'est jamais modifié par un effet : décocher rend l'imprimé exact (CA9).
2. **Un moteur pur, deux étages** (`js/core/optional-traits.js`) : les règles de choix (cases proposées, exclusions, ajout libre) puis l'application (`applyOptionalChoices` rend un profil effectif et la liste valeur imprimée / valeur modifiée). Aucun calcul de combat nouveau : les valeurs modifiées sont posées dans le profil, les modules `creature-*` les lisent comme aujourd'hui.
3. **Un seul point d'entrée côté Store.** `participantFromProfile` et `diceLinesFromProfile` (`store.js` l. 1320 et 1334) appellent `applyOptionalChoices` : tout participant créé depuis un profil, monture d'un PJ comprise, porte les Traits cochés ; un participant déjà en rencontre n'est pas modifié (CA3, D2).
4. **Une commande annulable.** `setProfileOptionalChoices` (nouveau `js/core/store/api-optional-traits.js`, modèle `api-engagements.js`) passe par `executeCommand` : ↶/↷, journal, sauvegarde, synchronisation par le chemin ordinaire (CA4, CA5). Pas de propagation aux participants.
5. **Un Trait coché se comporte comme le même Trait imprimé (D9, CA7)** : son texte « Nom (param) » entre dans `traits`, même format que le bestiaire. Un Trait de D10 déjà imprimé est grisé « déjà compté » (D18) et n'a aucun effet.
6. **Tout Trait a au moins un rappel (D7, CA8).** Un test passe les 124 noms dans `deriveReminders` ; les noms sans affichage reçoivent un rappel du catalogue des Traits (texte français de l'inventaire). Disruption et Creature Weapons, déclarés couverts sans code qui les lise, tombent dans ce filet (rappel, noté dans l'inventaire).
7. **Un seul panneau d'interface** (`js/ui/optional-traits-panel.js`), inséré dans le formulaire de profil de `reserve.js` comme `ensureMountSection` ; le profil `monture-<PJ>` est un profil de Réserve ordinaire : même panneau (CA22).

## Décisions et où elles vivent

D1, D2 : points 1 et 3, panneau pour les profils non PJ. D3, D12, CA17-18 : catalogue des Traits (donnée générée) et ajout libre. D4, CA20-21 : coches d'attaques et d'armures, avec instantané de l'action et des pièces à la coche (le moteur reste synchrone). D5, D6, D11, D16, D19 : table et moteur d'effets. D7 : point 6. D8, CA23 : `planMountSync` garde le profil existant, l'aperçu prévient en cas de remplacement. D9 : point 5. D10, D18 : cases grisées. D13 : test de la table contre `valeurs-traits.md`. D14 : point 1. D15 : données. D17 : règle de choix. D19 : table lue dans `E0-P-114` et `E0-P-115` (L06), vérifiée par test.

## Fichiers

**Créés** : `js/data/optional-trait-modifiers.js` (table D5, D6, D19 ; figée, importée de façon synchrone) ; `js/data/creature-trait-catalogue.js` (généré) ; `tools/build-creature-trait-catalogue.mjs` (`--check`) ; `js/core/optional-traits.js` ; `js/core/store/api-optional-traits.js` ; `js/ui/optional-traits-panel.js` ; `tests/traits-optionnels-browser.mjs` ; les tests listés plus bas. Chacun des cinq modules de `js/` va au précache de `sw.js`.

**Touchés** : `tools/lib/bestiary-overrides.mjs` (D15), `js/data/bestiary/L13.json`, `L23.json`, `index.json` (régénérés) ; `js/core/reminders.js` (une ligne de `TRAIT_REMINDERS`) ; `js/core/store.js` (câblage, deux fonctions) ; `js/core/mounts.js` (`isMountCandidate` lit les coches, CA14) ; `js/core/json-profile-export.js`, `json-profile-import.js` (clé `traitsOptionnels`) ; `js/ui/fiche-sync-view.js` (phrase de l'aperçu) ; `js/ui/reserve.js` (section, recherche de monture) ; `MJ.css` ; `sw.js` ; `tests/parcours.json` ; `docs/specs/traits-optionnels/inventaire.md` (CA25).

## Modèle de données

```
profile.extensions.v5.optionalChoices = {              // absent = vide
  version: 1,
  traits:   [{ key, name, param?, origin: 'sheet'|'added' }],  // Traits cochés ; name = nom du livre (anglais), param = indice ou dressage
  attacks:  [{ key, name, action }],                  // action = instantané normalisé de l'attaque optionnelle
  armour:   [{ key, name, ap, zones[] }]              // instantané de la pièce optionnelle
}
```
Une Taille cochée est une entrée de `traits` (une seule à la fois, D11). Un dressage coché est une entrée `Trained` + `param` d'un seul mot (« War »), fusionné dans le texte `Trained (…)` du participant. `key` = nom et paramètre repliés (accents, casse).

## Table des modificateurs (`js/data/optional-trait-modifiers.js`)

| Clé | Effet (carac. = profil) | Source |
|---|---|---|
| Big | F +10, E +10, Ag −5 | `valeurs-traits.md` §1 |
| Brute | M −1, Ag −10, F +10, E +10 | idem |
| Clever | Int +20, I +10 | idem |
| Cunning | Soc +10, Int +10, I +10 | idem |
| Fast | M +1, Ag +10 | idem |
| Tough | E +10, FM +10 | idem |
| Hardy | aucune carac. ; Blessures : formule avec Hardy moins formule sans (D16) | idem |
| Trained (War) | CC +10 (D6) | idem |
| Elite (modèle V5) | CC, F, E, I, FM +15 ; six compétences ; trois Talents | §4, `E0-P-114` |
| Leader (modèle V5) | selon point 1 ci-dessous ; six compétences ; six Talents | §4, `E0-P-115` |

Elite et Leader **remplacent** les valeurs V4 (D19) : jamais les deux. Blessures effectives = imprimées + (formule(carac. effectives, Taille effective, Hardy) − formule(imprimées, Taille imprimée, sans Hardy)) avec `creatureWounds` ; un profil sans F, E ou FM garde ses Blessures et reçoit un rappel. Les dérivés (initiative, compétences liées, base et dégâts des attaques) suivent selon les points 2 et 3.

## Contrats (signatures)

```js
// js/core/optional-traits.js (pur : aucune écriture, entrées jamais mutées)
export function readOptionalChoices(profile)                              // absence = { version:1, traits:[], attacks:[], armour:[] }
export function optionalCandidates(profile, record?)                      // cases : { traits[], attacks[], armour[] } avec { key, label, checked, disabled, reason }
export function toggleOptionalTrait(profile, key, on)                     // { choices } | { error }   D11, D17, D18, CA19
export function addFreeTrait(profile, { name, param })                    // { choices } | { error }   D12, CA18, CA19
export function toggleOptionalAttack(profile, key, on, record)            // { choices } | { error }   CA20
export function toggleOptionalArmour(profile, key, on, record)            // { choices } | { error }   CA20
export function applyOptionalChoices(profile)                             // { profile, changes[{field,printed,effective,source}], notes[] }
export function catalogueReminders(participant)                           // CA8 : textes pour les Traits sans autre affichage
// js/core/store/api-optional-traits.js : createOptionalTraitsApi({ api, currentEnvelope })
setProfileOptionalChoices(profileId, choices, { expectedLocalRevision })  // refuse un profil inconnu ou un PJ
```

## Vérification des critères

| CA | Vérification |
|---|---|
| CA24 | `node tools/build-bestiary-profiles.mjs --check L13 L23` ; `tests/unit/donnees/traits-optionnels-donnees.test.mjs` |
| CA1, CA2, CA13, CA14, CA16, CA17, CA18, CA19, CA20 | `tests/unit/creatures/traits-optionnels-choix.test.js` ; CA1, CA2, CA13, CA17 aussi : `tests/unit/ui/traits-optionnels-panneau.test.js` |
| CA7, CA9, CA10, CA11, CA12, CA15 (bonus), CA21 | `tests/unit/creatures/traits-optionnels-effets.test.js` (CA7 : mêmes résultats que le Trait imprimé, sur Cornes, Furtif, Pisteur, Venin, Infravision) |
| CA8, CA15 et CA16 (rappels), CA25 | `tests/unit/creatures/traits-optionnels-rappels.test.js` (les 124 noms) ; contrôle de l'inventaire par `grep` |
| CA3, CA4, CA5, CA6 | `tests/unit/stockage/traits-optionnels-store.test.js` (↶/↷, `loadFromJSON`, export puis import, relecture) ; golden master inchangé |
| CA22, CA23 | `tests/unit/combat/traits-optionnels-monture.test.js` ; parcours |
| Tous, de bout en bout | `timeout 120 node tests/traits-optionnels-browser.mjs` (CA1, CA3, CA4, CA5, CA9, CA12, CA17, CA20, CA22) ; socle |

## Lots touchant un moteur partagé (modèle plus fort)

**L5** (Store : `executeCommand`, historique, création des participants, JSON, synchronisation des fiches) : Opus. **L6** touche `reserve.js` (écran partagé) : Sonnet, avec le socle navigateur. Les autres vont à Sonnet.

## Complexité justifiée

- **`api-optional-traits.js` séparé** : `store.js` dépasse 6 000 lignes ; précédent `api-engagements.js`.
- **Instantané des attaques et armures à la coche** : le moteur est synchrone, le bestiaire se charge en asynchrone ; l'instantané rend aussi l'export JSON autonome.
- **Table en module JS** : import synchrone et précache, sans `fetch`.
- **Catalogue généré** : l'inventaire (`docs/`) n'est pas chargé à l'exécution ; le générateur garde un contrôle `--check` comme les autres.

## Points à trancher par le MJ

**Tranchés le 17/11/2026 : recommandations retenues pour les sept points, reportées dans la spec en D20 à D26, qui font foi.**

1. **Leader : version du livre.** La v2 du Livre de base V5 (p. 353) donne « Leader » (+15 ; Soc +5) ; la v3, qui est celle des données de l'outil, le nomme « Lieutenant » (+20 ; Soc +10). Appliquer le Lieutenant v3 ? Recommandation : oui (`E0-P-115`, déjà dans l'outil), affiché « Meneur (Lieutenant V5) ».
2. **Compétences d'un modèle.** Le bonus s'ajoute aux avances : total = ancien total (ou caractéristique modifiée si la compétence manque) + écart de la caractéristique liée + bonus ; « Corps à corps (deux) » = les deux compétences de Corps à corps les plus hautes du profil, à défaut Corps à corps (Base). Valider ? Recommandation : oui.
3. **Attaques et compétences suivent les caractéristiques.** Un Trait de D5 qui change CC, CT ou F change aussi la base de l'attaque (CC ou CT) et, en mêlée, ses dégâts (écart du BF) ; les compétences liées suivent. Sans cela Elite, Big et Brute n'ont aucun effet sur les attaques. Recommandation : oui, tirs inchangés pour les dégâts.
4. **Taille et Blessures (D11 contre D16).** D11 dit « recalcule les Blessures comme la Forme bestiale », D16 dit de ne jamais recalculer le total en entier. Appliquer la règle de la différence de formules aussi à la Taille ? Recommandation : oui.
5. **Monture proposable (CA14).** Cocher « Monture » doit rendre le profil de Réserve proposable : la recherche de monture d'un PJ listera aussi les profils de Réserve dressés comme monture par une coche, et copiera le profil avec ses coches. Valider ? Recommandation : oui.
6. **Quels profils ont le panneau.** Tout profil qui n'est pas un PJ (bestiaire, monture, PNJ saisi à la main) ; sans fiche de bestiaire, seul « Ajouter un Trait » apparaît. Recommandation : oui.
7. **Leader bloqué sur une créature Bestial (D17).** Le modèle V5 ne porte pas cette restriction (elle vient du Livre de base français, V4). Maintenir le blocage décidé ? Recommandation : oui, comme décidé.
