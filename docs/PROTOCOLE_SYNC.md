# Contrat du protocole de synchronisation E05

Ce contrat décrit le protocole pur préparé pour E05. Il ne réalise aucun appel Firebase et
ne déclare pas la synchronisation intégrée au Store. La racine partagée est un document v2 :

```js
{
  revision: 0,                 // entier monotone, sans horloge locale
  state: { /* état de jeu */ },
  receipts: { deviceId: 0 }    // dernière séquence appliquée par appareil
}
```

La forme canonique contient toujours `receipts`. À la lecture, l’adaptateur accepte toutefois
son absence lorsque Firebase a supprimé une map vide, puis la rétablit à `{}` avant calcul.

Une opération envoyée contient exactement `deviceId`, `sequence` (positive), `baseRevision`
et `state`. `createOperation()` clone l’état et retire les champs locaux (`log`, `journal`,
`history`, archives et état UI). Les valeurs de réserve, combat et autres données de jeu
restent dans l’état partagé ; journal, annulation et présentation ne traversent pas ce contrat.

## API pure

| Fonction | Contrat |
|---|---|
| `createSyncDocument(state, options)` | Produit une racine v2 canonique, avec `revision` et `receipts` optionnels. |
| `validateSyncDocument(document)` | Vérifie la racine, la révision, les reçus et le schéma de l’état ; retourne un clone canonique. |
| `createOperation(input)` | Vérifie l’identité, la séquence et la base ; clone et filtre l’état. |
| `applyOperation(document, operation)` | Retourne `applied`, `duplicate`, `conflict` ou `sequence-gap`, sans muter l’entrée. |
| `transactionUpdate(current, operation)` | Retourne le document à écrire ou `undefined` pour abandonner le CAS. `current === null` signifie racine vide. |
| `transactionCallback(operation)` | Fabrique un callback rejouable par une transaction Firebase. |

Le serveur applique une opération uniquement si `baseRevision === revision` et que la séquence
est exactement le reçu précédent + 1. L’application incrémente la révision et le reçu dans la
même racine : état et accusé forment donc un instantané cohérent. Une séquence déjà reçue est
un accusé idempotent, même si sa base est ancienne ; elle ne rejoue aucun dégât. Un trou de
séquence et une base divergente refusent l’opération sans modification. Dans le callback Firebase,
`undefined` signifie abandonner ; `null` serait une suppression de racine et n’est jamais retourné
pour un conflit. Un conflit doit garder
la version locale et la version distante pour arbitrage explicite par la couche supérieure.

Les erreurs de structure ou de schéma sont levées par `SyncProtocolError` (`code` documenté
dans le module) ; un conflit attendu est un résultat contrôlable, pas une exception. Le callback
ne journalise rien et n’émet aucun effet de bord, afin de supporter les relances de Firebase.
La référence Firebase confirme que `undefined` annule une transaction sans modification,
alors que `null` supprime la valeur : [runTransaction — Firebase JavaScript API](https://firebase.google.com/docs/reference/js/database#runtransaction).

L’intégration devra exécuter `transactionUpdate` dans une transaction sur la racine du document,
sans mélange avec des `update()` aveugles. La lecture initiale, la file durable, les retries,
les sauvegardes de conflit et l’authentification restent à brancher dans E05 avec `sync.js`,
Store et la persistance déjà existante.
