# Plan · Soins hors rencontre

À lire après `spec.md`. Ce plan est une proposition : il se relit et se corrige avant le premier lot.

## 1. Approche

Le patient d'un suivi n'est plus « le participant du combat qui porte cet identifiant » mais « le sujet actuel du suivi », résolu en un seul endroit :

1. le suivi a un propriétaire (personnage persistant) : le sujet est l'exemplaire de ce personnage dans le combat en cours s'il y est, sinon le personnage persistant lui-même, complété par son profil (caractéristiques, compétences, talents) ;
2. sinon : le participant du combat qui porte `participantId`, comme aujourd'hui ;
3. sinon : aucun sujet (scène suspendue ou ancien suivi), consultation seule.

**Précision du 12/11 (voir § 9).** Le registre, les effets de séquelle en combat et « Envoyer aux fiches » regroupent tout par `participantId`. Pour ne pas réécrire ces lectures, un suivi rattaché porte toujours l'identifiant de son sujet **actuel** : celui de l'exemplaire en rencontre, sinon `suivi:<id du personnage>`. `ownerId` reste le rattachement enregistré ; `participantId` est réaligné à la fin du combat, au retrait et au lancement (`reconcileAftermathOwners`).

Les commandes de soin lisent et écrivent ce sujet au lieu de fouiller `combat.participants`. Les règles de soin (`js/core/v5-aftermath.js`, `js/core/v5-sequelae.js`) ne changent pas : elles reçoivent déjà des faits (score, PV, jet), pas un participant.

## 2. Modèle de données

Tous les champs sont facultatifs ; absents, ils se lisent comme vides (règle du projet). Aucune ligne existante n'est réécrite hors S8.

| Où | Champ | Rôle |
|---|---|---|
| ligne du registre (blessure, maladie, séquelle) | `ownerId` | identifiant du personnage persistant propriétaire ; absent = suivi lié au seul participant |
| ligne du registre | `ownerLabel` | nom enregistré à l'ouverture (CA1) |
| maladie, séquelle | statut `archived` | déjà présent pour les blessures ; étendu (CA8, CA35) |
| personnage persistant | `extensions.v5.criticalAftermath`, `criticalWounds` | Blessures Critiques reportées à la fin du combat (CA6, CA17) |
| reçu et traitement | `healerId` de forme `external:<opération>` + `healerName` | soigneur extérieur (CA22) ; `validHealer` exige déjà un identifiant |

`participantId` reste sur chaque ligne : il sert en rencontre et à la trace `ficheWriteback.owners`, toujours lue.

Le propriétaire est l'**identifiant du personnage persistant**, pas la clé de `v5ResourceIdentity` : cette clé change à la première liaison à une fiche (CA40). Un test garde-fou vérifie que participant et personnage rendent la même identité de ressource (CA41).

## 3. Signatures (aucun autre code ici)

```js
// js/core/aftermath-subjects.js (nouveau, pur)
aftermathSubjectOf(envelope, row)        // → { where: 'combat' | 'suivi' | 'aucun', subject, write(next, patch) }
followedCharacters(envelope)             // → personnages suivis projetés avec leur profil, marqués présents ou non
aftermathRowLabel(envelope, row)         // → nom affiché (CA2 à CA4)
planEncounterEnd(envelope, { keepIds })  // → { reports, created, archived, needsChoice }
```

```js
// js/core/store.js
endEncounter({ keepIds })                // remplace l'appel direct à resetCombat depuis « Terminer le combat » ; une commande, un ↶
previewEncounterEnd()                    // → participants à garder ou non (CA8, CA9)
```

`offScenePjParticipants` (`js/core/map-link-state.js`) fait déjà la projection « personnage persistant + profil » pour Map Display, limitée aux PJ : `followedCharacters` la généralise et Map Display garde son filtre.

## 4. Fichiers

- Créé : `js/core/aftermath-subjects.js`, ses tests, une fenêtre « Garder ou archiver » dans `js/ui/`.
- Touchés : `js/core/v5-aftermath.js` et `js/core/v5-sequelae.js` (champs à l'ouverture, statut archivé), `js/core/store/api-aftermath.js`, `js/core/store.js` (aides du registre, avance du temps, fin de combat, retrait), `js/core/encounters.js` (lancement), `js/core/fiche-writeback.js` (attribution), `js/core/map-link-state.js` (projection partagée), `js/ui/campaign-workspace.js`, `js/ui/v5-aftermath-panel.js`, `js/ui/prepare-view.js` (suppression d'un personnage), `js/main.js` (bouton de fin de combat).
- Jamais : `js/data/bestiary/` (autre session), le dépôt des fiches.

## 5. Vérification par critère

| Critères | Preuve |
|---|---|
| CA1 à CA5 | test unitaire du libellé (ordre des suivis permuté, suivi résolu entre deux rendus) ; `grep` du texte retiré |
| CA6 à CA13 | tests unitaires de `planEncounterEnd` et de la commande (trois copies, PJ à fiche, PJ sans fiche, scène suspendue, ↶) |
| CA14, CA15, CA19, CA31 | test navigateur de Campagne (`timeout 120`) |
| CA16, CA42 | test de parité : la même opération sur un participant et sur un personnage suivi rend le même reçu ; reçus de 3.45.1 figés |
| CA17, CA18 | test unitaire du parcours critique → fin de combat → chirurgie → clôture → ↶ → export/import |
| CA20 à CA23 | tests unitaires des commandes avec les trois sortes de soigneur |
| CA24 à CA27 | tests unitaires de `launchEncounter` et d'un cycle rencontre → hors rencontre → rencontre |
| CA28 à CA30 | tests unitaires de l'aperçu et de l'avance du temps |
| CA32, CA33 | tests unitaires des commandes d'ouverture |
| CA34 à CA37 | étape 3 → 4 de `SCHEMA_MIGRATIONS` jouée sur `tests/fixtures/suivis-orphelins-v3.json` : rattachement, archivage, ligne de journal, rejeu identique, sauvegarde en version 4 non retransformée |
| CA36 | aperçu de « Envoyer aux fiches » comparé avant et après sur la même sauvegarde |
| CA38 à CA41 | tests unitaires ciblés |

## 6. Confrontation aux principes du projet

- Interface et messages en français ; pas de boîte native (décision du 06/11) : la fenêtre de CA8 est une fenêtre de l'outil.
- « Une absence ne bloque rien » : `ownerId` et `ownerLabel` absents se lisent comme vides, sans réécriture.
- Tests ciblés par lot, suite complète à la fusion ; tout test navigateur sous `timeout 120` ; tout nouveau test unitaire dans `tests/unit/`.
- Rien n'est poussé sans le feu vert du MJ ; version par `node tools/bump-version.mjs`.
- Contre-vérification indépendante (code, puis règles V5 p. 170 à 178) avant publication.

## 7. Complexité justifiée

- **Un module nouveau** (`aftermath-subjects.js`) : la résolution du sujet est appelée par plus de vingt commandes et par deux écrans ; la laisser dans `store.js` (plus de 5 500 lignes) la rendrait impossible à tester seule.
- **Une commande de fin de combat** au lieu d'un simple vidage : sans elle, PV et Blessures Critiques se perdent à la fin du combat et CA11 (un seul ↶) est impossible.
- Rien d'autre : pas de nouveau registre, pas de nouvelle clé d'identité, pas de mécanisme de version propre (ARCH-10 le fournit).

## 8. Risques

- **Reports en double** : un PJ présent en rencontre et modifié depuis Campagne au même moment. Le sujet résolu est alors l'exemplaire du combat ; le personnage persistant n'est écrit qu'à la fin. À tester (CA27).
- **`store.js` partagé** avec d'autres chantiers du 11/11 (ARCH-08, ARCH-03) : lots courts, rebasés souvent.
- **Chantier H** : `participantIdsOf` doit compter les lignes par propriétaire sans rien perdre de la trace actuelle (CA36).

## 9. Mise à jour du 12/11/2026 (après ARCH-10, relecture avant le premier lot)

- **S8 passe par la chaîne d'ARCH-10.** La reprise est l'étape `{ from: 3, to: 4 }` de `SCHEMA_MIGRATIONS` (`js/core/migrations.js`), pure et rejouable : mêmes entrées, même résultat, aucun identifiant tiré au sort ni horodatage. `CURRENT_SCHEMA_VERSION` et `SYNC_PROTOCOL_VERSION` passent à 4 ensemble. Une sauvegarde réécrite porte 4 et ne repasse plus par l'étape (CA37).
- **Ce que fait l'étape.** Pour chaque suivi vivant dont le participant n'est dans aucune scène (combat, scène active, scènes suspendues) : si la trace `ficheWriteback.owners` le donne à une fiche et qu'un seul personnage suivi (ou, à défaut, un seul profil de réserve) porte cette fiche, le suivi lui est rattaché (`ownerId`, `participantId = suivi:<id>`), le personnage étant créé depuis le profil au besoin (identifiant déterministe `fiche:<charId>`) ; si la trace existe mais que la fiche ne désigne personne sans ambiguïté, le suivi est laissé tel quel et signalé dans le rapport ; sinon il est archivé. Une ligne de journal donne les nombres (CA35).
- **Synchronisation cloud.** La règle Firebase versionnée exige `schemaVersion === 3` et le protocole refuse un document distant d'une autre version. `firebase.database.rules.json` accepte désormais 3 et 4, et un document distant en version 3 est relu par la chaîne de migrations. **Les règles doivent être déployées avant la publication** (action du MJ).
- **Clé des suivis** : voir la précision du § 1. `ficheWriteback` compte en plus les lignes portées par `suivi:<id>` des personnages liés à la fiche.
- **Map Display** : `offScenePjParticipants` ne projette pas un personnage gardé qui n'est pas un PJ (champ `kind` posé à la garde) ; les personnages existants gardent leur comportement.
- **Recommencer le combat** recrée les participants : les suivis rattachés suivent leur personnage, les autres suivis ouverts des anciens participants sont archivés (invariant « plus de suivi orphelin »).
- **Deux personnages pour une même fiche (CA38)** : le lancement n'en adopte aucun ; Campagne le signale et propose « Garder celui-ci », qui supprime l'autre et archive ses suivis.
