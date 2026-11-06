# Plan · Chantier H — écriture en retour vers les fiches

Spec : `spec.md` (même dossier). Deux dépôts, **un dépôt par lot** :
- **Fiches** : `E:\Projet Warhammer Ennemi Intérieur\ennemi-interieur-wfrp4` (`e6bc651`). Le domaine se code dans `js/fiche/` et se recopie dans `functions/src/domain/fiche/` par `tools/sync-fiche-domain.mjs` (contrôlé par `npm --prefix functions test`).
- **Outil MJ** : ce dépôt (`main` `d574a33`).

La fiche se publie **avant** l'outil : l'outil ne peut appeler la nouvelle commande qu'une fois la fonction déployée.

## 1. Contrat outil ↔ fonction

Appel : callable `executeFicheCommand` (région `europe-west1`, App Check imposé), forme inchangée `{ charId, operationId, baseRevision, type, payload }`.

**Nouveau type `outil-mj`**, ajouté à `FICHE_COMMAND_TYPES` et à `SERVER_ONLY_TYPES` (donc MJ seul, motif obligatoire, CA8).

```text
operationId : "outilmj-<sendId>-<charId>"      // déterministe : un renvoi est rejoué, pas réappliqué (CA6)
baseRevision: révision lue par l'outil           // > révision actuelle → refus ; pas d'égalité exigée
payload = {
  reason : texte lisible par le joueur (3–1000), ex. « Fin de séance du 06/11 (outil MJ) »
  sendId : identifiant de l'envoi ([A-Za-z0-9_-]{1,64})
  undoOf?: operationId annulé (annulation, CA13)
  changes: Change[] (1 à 40)
}
Change (clés fermées, toute autre clé est refusée — CA23) :
  { op:'counter',   field:'fortune'|'destin'|'peche'|'corruption', base:string|null, value:string, label }
  { op:'carac',     carac:'cc'|'ct'|'f'|'e'|'i'|'ag'|'dex'|'int'|'fm'|'soc', base:int, value:int, label }
                    // Base seulement (Q8) : carac.<x>.base ; carac.<x>.adv n'est jamais touché
  { op:'skill-adv', id, base:int, value:int, label }                          // Avances de Prière
  { op:'row',       collection:'talentsAcq'|'equipment', id, base:objet|null, value:objet|null, label }
                    // retrait : value null ; restitution : base null ; ligne entière comparée
  { op:'suivi',     id, base:Entrée|null, value:Entrée|null, label }
Entrée de suivi = { id, categorie:'penitence'|'sequelle'|'cicatrice'|'maladie'|'mutation',
                    libelle (≤200), detail (≤1000), depuis? (≤40) }
label : provenance lisible (≤200), recopiée dans l'historique (CA2, CA9)
```

**Résolution, change par change** (même logique que `resolvePatch`) : valeur actuelle = base → appliquer ; valeur actuelle = valeur voulue → ne rien faire (CA12) ; sinon conflit. **Un seul conflit refuse toute la commande** de cette fiche : `aborted`, `details = { kind:'conflict', fields:[clés], revision }`, clés de la forme `counter:destin`, `carac:ag`, `skill-adv:<id>`, `row:equipment:<id>`, `suivi:<id>` (CA10). Les autres fiches de l'envoi sont des commandes séparées (CA11).

**Stockage** : nouveau champ de fiche `suiviMj: Entrée[]` (≤200). Absent de `PATCH_FIELDS` : ni le joueur ni une modification simple ne peuvent l'écrire (CA21). Ajouté aux clés d'export/import JSON pour ne pas le perdre.

**Historique** : `history/<operationId>` reçoit `type:'outil-mj'`, `reason`, `summary { kind:'outil-mj', label, undoOf? }` et `changes { clé: { before, after } }`, comme un `patch` (CA9). Rien de réservé au MJ n'y entre, puisque le payload n'en accepte pas.

**Annulation** (CA13–CA15) : c'est une commande `outil-mj` ordinaire, `undoOf` renseigné, chaque change inversé (`base` ↔ `value`). Un champ modifié depuis l'envoi tombe dans le conflit normal (CA14). La fonction vérifie que `undoOf` désigne une opération `outil-mj` de la même fiche **qui n'est pas elle-même une annulation** (CA15). L'outil n'envoie d'annulation que pour les fiches écrites par le dernier envoi (CA13).

## 2. Tri des variables (outil → fiche)

| Lot | Variable de l'outil | Change |
|---|---|---|
| A | `extensions.v5.fate` | `counter destin` |
| A | `characterResources[].fortune` (clé `characterId`) | `counter fortune` |
| A | `extensions.v5.divine.sin` | `counter peche` |
| A | `extensions.v5.corruptionPoints` | `counter corruption` |
| A | `aftermathRegister.sequelae[]` `characteristic-loss` et pertes permanentes déduites (`sequelaCharacteristicTotals`, `lifetime` permanent seulement), **total de la perte, sans tenir compte de la répartition `split`** | `carac` (Base seulement, Q8) |
| B | `divineRejections[].prayLoss` (Avances de Prière à zéro) | `skill-adv` |
| B | `divineRejections[].removedTalents` (Béni / Invocation du culte) | `row talentsAcq` (retrait) |
| B | `divineConfiscations[]` retenu / rendu | `row equipment` (retrait / restitution de la copie conservée) |
| C | `divinePenances[]` en cours | `suivi penitence` |
| C | séquelles `loss` permanentes, fracture mal soignée, perte de Mouvement (la fiche n'a pas de champ M) | `suivi sequelle` |
| C | `scar`, `scar-decision` accordée | `suivi cicatrice` |
| C | `diseases[]` actives | `suivi maladie` |
| C | `corruptionMutations[]` confirmées (libellé et effet visible seulement) | `suivi mutation` |

Les identifiants de suivi sont dérivés de l'identifiant de l'outil (`outil:<id source>`), jamais d'un nom. Une entrée close dans l'outil donne `value: null` (CA22). Tout le reste du registre `docs/VARIABLES_PERSISTANTES_PJ.md` est exclu (spec, Hors périmètre ; CA5).

**Valeurs de base.** La base d'un change est la valeur de la fiche **à la dernière lecture par l'outil**, pas celle du moment de l'envoi : c'est elle qui permet de voir que le joueur a modifié la fiche. `ficheSnapshot` (`js/core/fiche-sync.js`) ne garde aujourd'hui que des totaux ; il gagne un bloc `writebackBase` (valeurs brutes : `destin`, `fortune`, `peche`, `corruption`, `carac.*.{base,adv}`, lignes `talentsAcq`/`equipment`/`skillsAdvanced` par `id`, `suiviMj`). Après un envoi réussi, l'outil y recopie les valeurs envoyées et la nouvelle révision (CA7).

**Pertes déjà reportées (arbitrage du 06/11 soir, A1/A2).** La partie garde `extensions.v5.ficheWriteback.caracReported[charId][carac]` : cible = Base lue − (total − déjà reporté) ; un succès, « Garder la fiche » ou « Imposer l'outil » réussi le fixent au total, une annulation réussie le remet à sa valeur d'avant l'envoi. La ligne d'effet `char` de la séquelle n'applique plus que total − déjà reporté (projection `sequelaMirror`), sans toucher à la séquelle : la perte ne compte jamais deux fois.

**Copies divergentes (même arbitrage).** Une valeur se lit dans l'ordre participant du combat, scène active, personnage persistant, profil de réserve ; un désaccord entre copies met un avertissement sur la ligne.

## 3. Côté outil

- `vendor/firebase/firebase-functions.js` : même version que les autres modules embarqués.
- `js/core/fiche-source.js` : `sendCommand(command)` (callable, région `europe-west1`) ; seul module réseau, comme aujourd'hui.
- **Nouveau module pur `js/core/fiche-writeback.js`** : `planFicheWriteback(state)` → lignes par fiche ; `buildFicheCommand(charId, rows, { sendId, revision, reason })` ; `buildUndoCommands(lastSend)` ; `applyWritebackSuccess(state, charId, response, rows)` ; `applyConflictChoice(state, charId, key, 'fiche'|'outil', ficheValue)`.
- **Nouvelle vue `js/ui/fiche-writeback-view.js`** : aperçu avec cases (CA2–CA4), envoi fiche par fiche, conflits (relecture de la fiche, « Garder la fiche » / « Imposer l'outil », CA10–CA11), « Annuler le dernier envoi » (CA13–CA15). Entrée « Envoyer aux fiches » dans le menu `⋯` (CA1).
- Dernier envoi : `extensions.v5.ficheWriteback.lastSend` au niveau de la partie (`sendId`, date, par fiche : `operationId`, révision, changes). Donnée de partie, pas de personnage ; survit au rechargement ; remplacée par l'envoi suivant.

## 4. Vérification des critères

| CA | Vérification |
|---|---|
| 6, 8, 10, 12, 14, 21, 23 ; contrat | `functions/test/fiche-outil-mj.test.mjs` (magasin simulé de `fiche-service.test.mjs`) |
| 9, 13 (côté fiche), 17–19 (côté fiche) | même fichier : historique, `undoOf`, lignes et caractéristiques |
| contrat de bout en bout | `tools/fiche-outil-mj-emulator.mjs` (Firestore + Functions sous émulateur, projet `demo-…`, sur le modèle de `tools/equipment-emulator.mjs`) |
| 20, 22 (affichage fiche) | test de vue du dépôt des fiches + contrôle manuel en local |
| 2–5, 7, 11, 15–19 (côté outil) | `tests/fiche-writeback.test.mjs` (module pur, source simulée) |
| 1–4, 10–15 (écran) | test navigateur sur `localhost:8766` avec source simulée, sous `timeout 120` |
| 24 | recette manuelle du MJ sur `ethoril.github.io` (App Check actif) |

Tests ciblés par lot ; suite complète de chaque dépôt à la fusion seulement.

## 5. Principes et simplicité

- Le mécanisme de révision, de reçu et de conflit de la fonction est **réutilisé** ; aucune écriture Firestore directe ; aucune règle Firestore modifiée (les écritures restent `false`).
- Données réservées au MJ : jamais sur la fiche (Q6) ; la liste fermée des clés du payload le garantit côté serveur.
- Identité de fiche, jamais de nom ; collection absente ≠ collection vide (une base `null` ne vaut pas « vide »).

### Complexité justifiée
- **Un nouveau type plutôt que `patch`** : `patch` n'écrit que des champs simples et laisse le joueur écrire les mêmes champs ; il faut ici des caractéristiques, des lignes de talents et d'équipement et un champ que seul le MJ écrit, dans **une** opération par fiche.
- **Deux nouveaux modules côté outil** (logique pure + vue), sur le modèle de `fiche-sync.js` / `fiche-sync-view.js` : la logique se teste sans réseau.

## 6. Risques à lever dans les lots
- **Talents retirés et journal d'XP** (lot fiches B) : retirer une ligne de `talentsAcq` hors d'une annulation d'achat ne doit ni rembourser l'XP ni permettre ensuite un `cancel` de l'achat ; à vérifier dans `xp.js` et `cancel()` avant de coder.
- **Identifiants de fiche dans l'outil** (lot outil B) : talents, équipement et Prière doivent porter l'`id` de la ligne de fiche ; une ligne sans `id` sûr est montrée « à faire à la main » dans l'aperçu, jamais rapprochée par nom.
- **App Check sous émulateur** : si l'émulateur de Functions l'impose, le test de bout en bout passe par le gestionnaire (`createFicheCommandHandler`) et la recette prod couvre App Check.
- **Caractéristiques et XP** : levé par Q8. La perte ne touche que la Base, donc ni le coût des Avances ni le journal d'XP ne bougent. Pour mémoire, `cancel()` (`js/fiche/commands.js`) refuse déjà d'annuler un achat dont la donnée a changé.
- Résilience (sans objet, Q9) et fiche `test` (recette sur un vrai PJ, Q7) : tranchés le 06/11 soir.
