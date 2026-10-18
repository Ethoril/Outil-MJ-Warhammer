# Recette et livraison locale 2.5 — 9 octobre 2026

Le lot 2 est prêt localement en **3.13.0**, mécanique **v5-combat-2026-10-09.24.6**. Les étapes 2.1 à 2.5 sont terminées dans le périmètre convenu. La publication reste une action séparée à autoriser. Main, le distant et le site public sont inchangés.

## Périmètre livré

Les 206 talents sont classés sans double comptage : **131 contrats moteur**, **19 entièrement narratifs**, **18 entièrement traités par les fiches**, **10 bonus de caractéristiques exclus**, **28 talents de magie/prières au lot 3**. Les contrats contiennent 382 clauses moteur, dont 277 automatiques et 105 assistées. Aucun talent mécanique du périmètre 2.4 n’est en attente. [Tri complet](LOT2_TRI_TALENTS.md).

Les effets narratifs restent des rappels et les valeurs de progression restent importées des fiches, Dur à cuire compris. Matraqueur intervient au seuil V5 d’Assommante ; Commandant d’Équipage exige une Action réussie et sert au prochain tir seulement. Petit applique le multiplicateur avant BE/PA et supprime les Frappes Mortelles selon les arbitrages du MJ.

## Critères et preuves

| Critère | Scénarios vérifiés | Preuve reproductible |
| --- | --- | --- |
| Jets, opposition et choix | Sans talent, rangs/spécialités, plusieurs sources, attaques/défenses, critiques et échecs particuliers, conservation/inversion sans relance, choix manquant refusé | Batterie Node complète ; recettes noyau V5, 2.3 développement/contrôle, 2.4 contrôle et talents restants |
| Interactions et dépenses | Tourbillon avec Petit, BE/PA propres à chaque victime, Assommante/Matraqueur/Mâchoires, Fortune payée une fois, premiers usages et quota de séance de Résistance | `lot2-v5-25-cloud-browser.mjs`, deux contextes Edge avec IndexedDB native et RTDB réel local |
| Cycle d’une rencontre | Suspendre/recharger/reprendre, annuler/rétablir la suspension, recommencer, supprimer et purger les journaux liés tout en conservant le journal extérieur | Sept scénarios métier de `lot2-v5-25-acceptance.test.js` |
| Durable, fichiers et erreurs | Coûts/usages/États conservés, valeurs de fiche inchangées, export/import/point de restauration, aperçu périmé refusé, échec disque sans mutation ni dépense | Même recette métier, persistance et commandes réelles avec IndexedDB simulée pour injecter la panne |
| Reprise cloud | Rechargement de l’auteur avec annulation conservée, changement externe fermant l’historique, journal privé à chaque client, conflit hors ligne explicite, export des deux versions, choix distant et sauvegarde de la version locale | Huit scénarios de la recette cloud ; transport vers Auth/RTDB locaux par pont REST ETag, Store/session/protocole de production |
| Accusé perdu | Une écriture effectivement acceptée par RTDB, réponse perdue, reprise par reçu sans révision ou effet supplémentaire | Dernier scénario de la recette cloud |
| Accès et migration | Propriétaire seulement, schéma/révision/reçus contrôlés, anciens clients refusés ; RTDB omettant les tableaux vides, migration v2 vers v3 sans écraser un v3 existant ou concurrent | `firebase-rules-v3-emulator.mjs` et `cloud-sparse-v2-emulator.mjs`, règles de production chargées dans les émulateurs |
| Interface et PWA | Vrais gestes, fiches importées, bureau/téléphone, sombre/parchemin, absence de débordement, historique lisible, hors ligne et remplacement réel du cache 3.12.0 → 3.13.0 | Dix recettes Edge de `lot2-v5-25-browser-runner.mjs` |
| Livraison | Versions application/package/lock/cache cohérentes, tous les modules précachés, export des seuls assets déclarés, empreintes SHA-256 | `build-lot2-local-release.mjs`, manifeste et archive locale ; contrôle navigateur du paquet exporté |

## Correction issue de la recette

Recharger une séance dont l’auteur avait déjà synchronisé sa commande effaçait son annulation : le premier message cloud était systématiquement considéré comme une modification externe. RTDB omet les branches nulles/vides et peut convertir les tableaux en maps numériques ; une ancienne migration dupliquait aussi `orderMode` dans `combat.extensions`.

La comparaison porte désormais sur la signification partagée réellement stockée. Un accusé de l’état identique conserve l’historique et la révision locale, tout en enregistrant le curseur de synchronisation atomiquement. Un changement réel de Blessures, Élan, Fortune, usage ou autre donnée partagée conserve la frontière externe. Les valeurs `false`, `0` et chaînes vides sont distinctes d’une absence. Seule la copie redondante identique du mode d’ordre est neutralisée ; les autres extensions restent significatives. La migration cesse de produire cette copie. Quatre contre-tests de protocole et la recette cloud couvrent ces cas.

La recette générale ancienne a été actualisée : choix du Test et jet défensifs pour la mêlée V5, blessure manuelle annulée/rétablie, libellé « touché », modificateur local en DR dans `extensions.v5.slModifier`. Elle passe sur l’application complète avec les valeurs de fiche et identités d’actions conservées.

## Résultat et commandes

**921/921 tests Node passent**, sans test ignoré, annulé ou en échec, dont onze nouveaux tests 2.5. Les dix recettes Edge passent ; les huit scénarios cloud, les règles d’accès et la migration locale passent également. Le contrôle du paquet exporté vérifie ses fichiers et son démarrage/hors ligne. Les générateurs du tri et de la couverture sont reproductibles et `git diff --check` passe.

```text
npm test
npm run test:lot2-25
npm run test:lot2-25-browser
npm run test:lot2-25-cloud
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/firebase-rules-v3-emulator.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/cloud-sparse-v2-emulator.mjs
node tools/build-v5-talent-classification.mjs
node tools/build-v5-talent-coverage.mjs
node tools/build-lot2-local-release.mjs
node tests/lot2-v5-25-release-browser.mjs
git diff --check
```

Recettes réalisées avec Node 24.13.0, Edge Windows/Playwright 1.63, Firebase CLI 15.27.0, Java 21 et émulateurs Auth/RTDB locaux. Les scripts cloud refusent une adresse non locale ; le lanceur utilise le projet jetable `demo-lot2-v5-25`, vérifie les ports et arrête ses émulateurs. Aucun compte ni état de production n’est utilisé. Les preuves sont dans `tmp/lot2-25/` ignoré : `node.log`, `browser-receipt.json`, journaux navigateur, `cloud-receipt.json`, `cloud.log`, `rules.log`, `migration.log`, empreintes des règles et du paquet.

## Livraison et limites

Le travail est conservé dans le worktree `lot2-combat-v5`, branche `codex/lot2-talents-v5`, HEAD `fb0f280`, avec l’incrément courant non commité. Main reste propre sur `08ce45d`. Le paquet statique et son manifeste sont générés sous `tmp/lot2-25/release/` ; l’archive locale sous `tmp/lot2-25/` contient ces seuls fichiers. Le vieux `docs/lot2/lot2-preparation.zip` garde sa portée documentaire historique et ne représente pas cette livraison.

La recette cloud certifie la sérialisation, CAS, règles et reprise des modules réels contre les émulateurs locaux, avec un pont REST remplaçant l’adaptateur SDK Firebase. Elle ne certifie ni une connexion OAuth Google réelle, ni une séance multi-appareils sur le serveur de production. La vérification après publication restera à faire lorsqu’elle sera autorisée.

Les 39 sources de suppléments ne sont pas toutes vérifiées dans leur ouvrage ; les 166 talents du livre ont l’audit existant. Petit reste le homebrew validé. Les circonstances spatiales/fictionnelles sont déclarées par le MJ ; la neutralisation silencieuse p. 135 garde ses conséquences manuelles explicitement approuvées. Ces limites ne constituent pas des talents laissés à coder dans ce lot. Les 28 talents de magie/prières restent au lot 3. Aucun PDF personnel, export privé, journal de compte réel ou snapshot PJ privé n’entre dans le paquet ou Git.
