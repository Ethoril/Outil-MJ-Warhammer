# Spec · Monture d'un PJ déclarée dans sa fiche en ligne, lue par l'outil

Cadrage du 16/11/2026, sur `80571dc` (prod 3.48.1). Statut : **questions tranchées le 16/11/2026** (section « Décisions du MJ » en fin de document, qui fait foi sur tout le reste). Côté outil : la clé d'espèce écrite sur la fiche est l'identifiant du profil dans le bestiaire (par exemple `E0-P-077`), liste `js/data/montures-fiches.js` ; la fiche porte `monture: { espece, nom }`.

Source de la matière : rapport de recherche `tmp/reprise-pro/cadrage-monture-rapport.md` (existant des deux dépôts). **Le dépôt des fiches n'était pas accessible pour ce cadrage** : tout ce qui le concerne (fichiers, lignes, schéma, validations) vient du rapport et n'a pas pu être revérifié ici. Les références du côté de l'outil sont celles du rapport, également non relues pour la rédaction ; à revérifier au moment du plan.

**Pourquoi.** Aujourd'hui la monture d'un PJ se déclare dans le profil de l'outil (`extensions.v5.declaredMount`, livré en 3.40.0). Le MJ a décidé le 15/11/2026 qu'elle soit déclarée dans la **fiche en ligne** du PJ et lue par l'outil à « Mettre à jour les PJ », comme l'est déjà le familier. Cette décision renverse, pour la lecture, la ligne « Monture lue depuis la fiche (option C, non retenue) » de `docs/specs/chantier-h-ecriture-fiches/spec.md` (l. 71 et 73) ; `docs/SUIVI_EVOLUTION.md` (l. 24) la listait déjà « à traiter ».

## État des lieux

- **Côté fiches : rien n'existe.** Aucun champ monture dans la fiche (rapport).
- **Côté outil : tout l'aval existe.** Une monture déclarée (par `setProfileMount`) crée un profil de bibliothèque `monture-<idProfilCavalier>` depuis le modèle du bestiaire, entre en combat avec son cavalier, se lie (`linkDeclaredMounts`), s'affiche (cartouche « À pied / Monté », pion fusionné sur la carte) et peut recevoir une image choisie. Il manque seulement la source « fiche » : `fiche-sync.js` ne connaît pas la monture.
- **Modèle à imiter : le familier.** Lecture tolérante (champ absent = rien ne change, liste invalide = avertissement et valeurs précédentes conservées), table figée espèce → `{livre, id}` (`FICHE_FAMILIAR_TEMPLATES`), profil de bibliothèque créé à la mise à jour, déclaration écrasée par la fiche « dès qu'elle porte le champ », non renvoyé à la fiche par l'écriture en retour (chantier H).

## Périmètre

### Outil MJ

- Lire un champ `monture` dans la fiche, dans `js/core/fiche-sync.js` (snapshot, empreinte, `importFicheDurables`, `applyFicheSync`), avec la même tolérance que `familiers`.
- Traduire la clé d'espèce de la fiche en `{livre, id}` du bestiaire (table de rapprochement) et construire le profil `monture-<idProfilCavalier>` avec la même identité que `setProfileMount`, donc compatible avec les profils déjà équipés et avec `linkDeclaredMounts`.
- Factoriser la construction du profil monture (aujourd'hui dans `setProfileMount`, `store.js` l. 3855-3881) dans une fonction pure de `js/core/mounts.js`, appelée par le store et par `applyFicheSync`.
- Aperçu de « Mettre à jour les PJ » : ligne monture (création, renommage, remplacement, retrait selon les décisions), signalement d'un désaccord fiche / outil, avertissement pour une clé inconnue.
- Règle de désaccord et de retrait (voir Questions ouvertes 3 et 6).
- Liste commune des montures dans `js/data/donnees-communes.js`, recopiée par `node tools/recopier-donnees-communes.mjs`.
- Tests, documentation (cahier des charges §4.6, guide, spec H : retirer la mention « non retenue »), version par `tools/bump-version.mjs`.

### Site des fiches (autre dépôt)

- Champ `monture` dans le schéma de la fiche et sa validation (`js/fiche/v5.js`, copie générée `functions/src/domain/fiche/v5.js` par `tools/sync-fiche-domain.mjs`).
- Listes blanches du chemin d'écriture à étendre : `PATCH_FIELDS` (`functions/src/fiche/service.mjs`), `SIMPLE_PATHS` (`js/fiche-controller.js`), `EXPORT_KEYS` (`js/fiche/export-import.js`, `js/fiche/commands.js` et sa copie), import et libellé d'historique de `commands.js`.
- Écran bureau : carte « Monture » (liste déroulante et nom), éditable par les mêmes rôles que le familier (`js/fiche-bureau/app.js`).
- Mobile : résumé en lecture seule, selon la question 7.
- Redéploiement de la fonction `executeFicheCommand`. `firestore.rules` : rien à changer (aucune écriture directe). Un champ absent se lisant comme vide, l'ordre de déploiement entre fiches et outil n'est pas bloquant.
- Tests (`tools/fiche-v5.test.mjs`, `functions/test/fiche-service.test.mjs`), `CHANGELOG.md`, `docs/FICHE-BUREAU.md`.

## Hors périmètre

- **Écriture en retour** : la monture n'entre pas dans « Envoyer aux fiches » (`WRITEBACK_FIELDS` inchangé). Recommandation du rapport, à confirmer implicitement par la validation de cette spec ; sinon la détection de conflit du chantier H serait rouverte pour un champ qui n'évolue pas en séance.
- Image du pion de la monture sur la fiche (voir question 8).
- PV, état et persistance de la monture d'une séance à l'autre (voir question 5).
- Saisie sur mobile (voir question 7).
- Combat monté et affichage sur la carte : inchangés, déjà livrés.
- Modification de `firestore.rules`.
- Liste de montures au-delà de celle retenue à la question 2.

## Contrat de données proposé

**Sur la fiche** (calqué sur le familier ; un cavalier = une monture) :

```
monture: null | { espece: '<clé de la liste fermée>', nom: '<chaîne ≤ 200, facultatif>' }
```

- Champ absent, `null` : « pas de monture déclarée » ; lu comme vide au point de lecture, **sans réécrire les données** (fiche ni profil).
- Pas de livre, pas d'identifiant de bestiaire, pas d'image, pas de PV sur la fiche : la clé est stable, l'outil la traduit.
- Champ inconnu dans l'objet : rejeté à l'écriture sur la fiche.
- Les noms de clés du schéma (`monture`, `espece`, `nom`) suivent la langue de la fiche (le familier traduit côté outil `systeme` → `system`).

**Liste fermée des montures**, partagée par `js/data/donnees-communes.js` (canal déjà contrôlé par `--check`) : entrées `{ clé, libellé français, livre, id }`. Départ proposé : Cheval (L06 `E0-P-077`) et les six montures de L27 (`E0-P-985` à `E0-P-990`), soit 7 entrées. Les clés exactes restent à fixer au plan (le rapport cite `warhorse` en exemple, sans l'avoir vérifié). Alternative : tables recopiées à la main des deux côtés comme pour le familier, avec risque de dérive (voir question 2).

**Côté outil**, après lecture :
- snapshot : `monture` normalisée ou `null` (absent) ;
- profil du cavalier : `extensions.v5.declaredMount = { profileId: 'monture-<idProfilCavalier>', name, bestiaryId }` (forme existante, inchangée) ;
- profil de bibliothèque `monture-<id>` : `extensions.mountFor = { profileId, bestiaryId }`, `extensions.v5.bestiary.id` conservé (image automatique du pion) ;
- l'image choisie (`tokenLibraryImage`) vit sur le profil `monture-<id>` et n'est pas dans la déclaration.

**Règle proposée** (à valider, questions 3 et 6) :
- fiche sans champ ou sans monture : l'outil ne touche à rien ;
- fiche avec monture, profil sans monture : on déclare ;
- monture différente des deux côtés : si la fiche a changé depuis la dernière lecture (comparaison au `ficheSnapshot` précédent, comme `importFicheDurables`), la fiche l'emporte ; sinon l'outil est gardé et le désaccord signalé dans l'aperçu ;
- même espèce : le profil `monture-<id>` n'est pas reconstruit (image choisie, PV et modifications du MJ conservés) ; seul le nom suit la fiche.

## Critères d'acceptation

Les critères marqués **(Qn)** dépendent d'une question ouverte et seront ajustés à la réponse du MJ. Les autres tiennent quelle que soit la réponse.

**Lecture tolérante**
- **CA1.** Une fiche sans `monture` laisse le profil inchangé : `declaredMount`, profil `monture-<id>`, image et liens en combat identiques ; aucun avertissement ; aucune réécriture de la fiche.
- **CA2.** Un profil déjà équipé d'une monture, lié à une fiche sans `monture`, la garde après « Mettre à jour les PJ ».
- **CA3.** Une clé d'espèce inconnue de l'outil (fiche plus récente que l'outil) produit un avertissement (type `mount-invalid`, sur le modèle de `familiar-invalid`) et laisse le profil intact.

**Création et mise à jour dans l'outil**
- **CA4.** Une fiche portant `monture: { espece: <clé du Destrier>, nom: 'Tonnerre' }` crée `monture-<idProfil>` depuis le profil du bestiaire correspondant, nom « Tonnerre », pose `declaredMount` avec `bestiaryId` ; la monture entre en combat avec son cavalier, liée, avec la pastille « À pied / Monté ». **(Q2, Q4)**
- **CA5.** Un changement de nom seul sur la fiche renomme la monture sans la reconstruire : image choisie et PV conservés. **(Q4)**
- **CA6.** Un changement d'espèce sur la fiche remplace le profil `monture-<id>` ; l'aperçu l'annonce avant application.
- **CA7.** Quand fiche et outil portent des montures différentes, l'aperçu montre les deux valeurs et la règle de priorité retenue ; rien n'est appliqué en silence. **(Q3)**
- **CA8.** Une monture retirée sur la fiche suit la règle retenue, annoncée dans l'aperçu avant application. **(Q6)**
- **CA9.** « Annuler » (`Store.undo`) après la mise à jour restaure la monture précédente.
- **CA10.** La monture n'apparaît pas dans « Envoyer aux fiches » : `WRITEBACK_FIELDS` est inchangé et un test le verrouille.
- **CA11.** Le profil `monture-<id>` construit par la fiche est identique, à données égales, à celui de `setProfileMount` (fonction de construction partagée, test d'égalité).

**Site des fiches**
- **CA12.** Le joueur ou le MJ (selon la réponse) choisit la monture dans la liste fermée sur le bureau ; la commande `patch` l'accepte. **(Q1)**
- **CA13.** La fonction rejette une espèce hors liste, un nom de plus de 200 caractères, un champ inconnu dans `monture` ; les tests existants (`fiche-v5.test.mjs`) restent verts.
- **CA14.** Un rôle sans droit d'édition voit les champs désactivés, comme pour le familier. **(Q1)**
- **CA15.** Un export puis import de fiche conserve `monture`.
- **CA16.** Mobile : une ligne de résumé en lecture seule, sans saisie. **(Q7)**

**Cohérence et livraison**
- **CA17.** L'image du pion de la monture reste choisie dans l'outil (Réserve) ; la fiche n'en porte pas. **(Q8)**
- **CA18.** `node tools/recopier-donnees-communes.mjs --check` et `node tools/sync-fiche-domain.mjs --check` passent ; les deux suites unitaires de l'outil passent (`.test.js` puis `.test.mjs`) et celles du dépôt des fiches aussi.
- **CA19.** Les tests de l'outil couvrent les CA1 à CA11 dans un nouveau fichier de `tests/unit/` (ex. `tests/unit/combat/montures-fiche.test.js`) ; la liste commune est contrôlée dans `tests/unit/donnees/` si elle l'est déjà pour les autres.

## Estimation (rapport, non revérifiée)

Outil : 150 à 250 lignes de code, ~120 de tests, une demi-journée. Fiches : 120 à 180 lignes, ~80 de tests, une demi-journée. Deux dépôts, donc deux publications ; la fonction `executeFicheCommand` se redéploie séparément.

## Décisions du MJ (16/11/2026)

Les huit questions du cadrage sont tranchées.

1. **Qui choisit la monture sur la fiche :** le joueur, depuis son bureau, comme son familier ; le MJ peut corriger par le même écran.
2. **Animaux proposés :** tous les animaux « dressés comme monture » du bestiaire (68 profils au 15/11/2026), et non la liste courte de sept. La liste est partagée par `donnees-communes.js` et contrôlée par `--check`, pas recopiée à la main des deux côtés (choix technique de Claude, pour éviter la dérive).
3. **Fiche et outil en désaccord :** la fiche gagne quand elle a changé depuis la dernière mise à jour ; sinon l'outil garde la sienne, avec un avertissement dans l'aperçu.
4. **Nom propre :** oui, facultatif ; sans nom, l'outil affiche le nom du bestiaire.
5. **PV et état d'une séance à l'autre :** non, comme aujourd'hui ; la fiche ne dit que l'espèce et le nom.
6. **Retrait sur la fiche :** l'outil retire la monture du profil à la prochaine mise à jour, après confirmation dans l'aperçu. Convention retenue pour lever le conflit signalé par le cadrage (choix technique de Claude) : champ **absent** = l'outil ne touche à rien (fiche jamais renseignée) ; champ présent et **`null`** = retrait explicite. Les critères CA1 et CA2 se lisent avec cette convention.
7. **Application mobile :** affichage seul en résumé (une ligne) ; la saisie se fait au bureau.
8. **Image du pion :** elle reste choisie dans l'outil (Réserve).

Les critères d'acceptation marqués comme dépendant d'une question se lisent désormais avec ces réponses. Rien n'a été revérifié dans le dépôt des fiches depuis le rapport du 15/11/2026 : à faire au moment du plan.
### Précisions techniques du 16/11/2026

- Fiche `null` inchangée alors que l'outil a une monture : traitée comme un désaccord (rien n'est modifié), avec une ligne d'aperçu « la fiche n'en déclare aucune, l'outil garde … ».
- Même espèce des deux côtés : le nom ne suit la fiche que si le champ `monture` de la fiche a changé depuis la dernière lecture ; sinon le nom de l'outil est gardé, sans avertissement.
- Déclaration alors que le profil `monture-<id>` existe déjà : s'il est de la même espèce, il est réutilisé tel quel (image, PV, retouches), seule la déclaration est reposée et le nom suit la fiche ; d'une autre espèce, il est remplacé. Un renommage dont le profil a disparu le recrée depuis le bestiaire.
- Valeur illisible ou clé inconnue (`mount-invalid`) : le snapshot du profil conserve la monture précédente, pour qu'une fiche inchangée ne l'emporte pas à la lecture valide suivante.
