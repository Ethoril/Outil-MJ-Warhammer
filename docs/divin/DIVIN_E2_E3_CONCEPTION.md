# Conception E2/E3 — dérogations d’accès aux prières

17 octobre 2026. Conception acceptée pour implémentation E3 après revue principale et contrôle indépendant. Cette tranche porte sur l’autorisation d’utiliser une prière; elle ne développe aucune nouvelle clause mécanique ni adaptation de source.

## Frontière produit

La fiche garde la priorité. Un personnage qui possède déjà l’accès requis dans sa fiche utilise le chemin normal; une dérogation ne modifie ni ses talents ni sa liste de prières et n’est pas consommée si elle n’a pas été nécessaire. Une dérogation du MJ est liée à un acteur, une tradition et un identifiant exact de prière. Elle peut durer une utilisation, la scène active ou jusqu’à révocation locale.

La dérogation ne confère pas de règle générale à la tradition et ne déduit pas de permissions par espèce, type d’acteur, talent apparent ou voisinage de culte. Elle emploie les identifiants `requiredTalent` et la spécialisation présents dans le contrat canonique sélectionné. Ce schéma est donc valable pour toute tradition dès qu’un contrat canonique existe; il n’invente pas de contrat ni de correspondance de culte.

Le refus de source reste supérieur à l’accès. Un contrat `blocked`, un reçu/source périmé, une adaptation V4 non arbitrée, un effet marqué non résolu, une identité inconnue ou un contrat altéré ne peuvent jamais être autorisés par un grant. Les contrats `manual` ne deviennent pas mécaniques: l’accès à leur prière peut être exceptionnel, mais leur effet demeure un rappel MJ tel que le contrat le définit.

Le grant ne remplace que les conditions d’accès positives du contrat: talent d’accès/spécialisation, puis acquisition nominative lorsque le contrat est un miracle. Il ne contourne pas la présence effective de l’acteur, son incapacité à parler, le Test de Prière, les faits de cible, les préconditions du contrat, les limites de portée, les coûts, le Courroux ou les dépendances mécaniques.

## API proposée

Nouveau module pur `js/core/v5-divine-access.js` :

```js
resolveDivineAccess(current, { actor, subjectKey, contract, activeScene, executionId })
// { allowed, mode: 'sheet'|'grant'|'denied', grantId, reason, needsInput, scope? }
createDivineAccessGrant(current, { actorId, subjectKey, contract, scope, sceneId, reason, revision, id, commandId })
revokeDivineAccessGrant(current, { grantId, reason, revision, commandId })
consumeDivineAccessGrant(current, { grantId, executionId, revision, commandId })
// each transition: { ok:true, state, grant } | { ok:false, code, error }
```

Pour ces transitions, `current` est exclusivement `{schemaVersion:1,grants:[grant,...]}`; il ne porte jamais un acteur, un contrat fourni par formulaire ou un Store. Les fonctions pures retournent un nouvel objet ou un refus structuré, sans mutation ni effet de bord. La consommation ne sera appelée que par la commande d’application de prière; son export sert au calcul/test du domaine et ne constitue pas une commande utilisateur autonome.

`resolveDivineAccess` ne lit ni le Store ni le registre global et ne modifie aucune entrée. Il compare les droits de fiche de la façon déjà utilisée par le moteur : talent acquis/rang positif/spécialisation exacte; pour un miracle, acquisition de ce miracle. Une bénédiction n’exige pas une ligne dans `actor.prayers` : son talent Béni ouvre toutes les bénédictions du culte conformément au livre de base V5 p.116. Une invocation exige une acquisition de miracle selon le flux V5 p.121. En l’absence de droits de fiche, seul un grant actif qui correspond aux trois identifiants exacts peut autoriser le chemin.

Le module pur ne valide pas l’authenticité d’une proposition `contract`; les frontières Store/engine vérifient auparavant que le contrat égalise l’entrée du registre généré, son empreinte, sa source et ses reçus. Le Store n’accepte jamais une liste de grants envoyée depuis l’UI : il passe au moteur la liste issue de l’état canonique après résolution serveur locale.

## Enregistrement versionné

Un seul registre local dans `state.extensions.v5.divineAccess` évite de recopier puis synchroniser les mêmes grants dans réserve, participant et scène :

```js
{
  schemaVersion: 1,
  grants: [{
    id, actorId, subjectKey, tradition, prayerId,
    scope: 'once'|'scene'|'durable', sceneId,
    reason, decisionId: 'DIV-02', createdBy: 'MJ', commandId,
    status: 'active'|'revoked'|'consumed',
    createdRevision, revokedRevision, revokedReason,
    consumedBy, consumedRevision
  }]
}
```

`tradition` est copiée du `contract.requiredTalent.specialization`, et `prayerId` du contrat canonique, jamais d’un texte arbitraire entré au formulaire. `reason` est requis, nettoyé, borné à une longueur documentée et conservé dans le journal de commande. `createdBy:'MJ'` atteste la frontière locale d’outil MJ; il n’existe pas encore d’identité authentifiée individuelle dans le Store, donc le schéma ne prétend pas identifier une personne. `commandId` relie la ligne au journal/commande persistant. Aucun horodatage système n’est requis : les révisions du Store sont la chronologie reproductible. `sceneId` vaut l’ID de `activeScene` seulement si `activeScene.status === 'active'` et pour `scope:'scene'`; il vaut `null` pour `once` et `durable`. Une scène suspendue ne confère aucun droit.

Les états sans cette extension migrent à un registre vide. Une extension mal formée n’est jamais réparée en grant plus permissif : son entrée est rejetée de façon visible à l’import/sanitation, les champs inconnus légitimes restent préservés et aucun `actorId`, contrat ou spécialisation n’est réécrit. Un grant dont la prière n’existe plus ou dont la source est bloquée devient inopérant, sans suppression silencieuse. Les entrées consommées/révoquées restent des reçus d’audit jusqu’à une politique de rétention ultérieure; elles ne sont pas proposées comme actives.

`once` autorise une invocation de prière engagée dans une commande Store. Elle est consommée au commit de cette invocation, réussite ou échec du Test compris, car l’autorisation a servi à la tentative; le calcul/aperçu, un refus de précondition, un conflit de sauvegarde et une capture périmée ne la consomment pas. La consommation porte `executionId` unique. Ce garanti « une fois » est atomique pour une commande et un Store local. Le protocole partagé E05 fait du CAS sur révision : il ne peut accepter qu’une branche distante, tandis qu’une branche hors ligne concurrente peut être localement divergente jusqu’à réconciliation. La recette vérifie le refus de la seconde opération au niveau protocole et l’UI signale le conflit; la donnée locale divergente ne vaut pas consommation autoritaire partagée. Il n’y a pas de ledger central synchrone d’autorisations dans cette tranche, donc aucune garantie mondiale pendant une coupure réseau n’est revendiquée. `once` suit le `subjectKey` stable du sujet jusqu’à consommation/révocation; son `actorId` reste la projection de rencontre ayant reçu la décision. `scene` suit ce même sujet, mais demeure valide uniquement dans la scène dont l’ID égale `sceneId` et quand `activeScene.status === 'active'`; la fin/changement de scène l’inactive par calcul sans mutation globale. `durable` demeure valide entre les scènes jusqu’à une révocation explicite et compare le même `subjectKey` stable. Ainsi, remplacer la projection d’un sujet dans la même scène ne perd pas son autorisation, tandis que des copies de PNJ ont des `subjectKey` distinctes. Révoquer est une mutation atomique et auditée; révoquer un grant absent, consommé ou déjà révoqué échoue sans nouvel effet.

## Résolution et mutation Store

Le flux de preview ajoute au contexte capturé l’acteur, la prière, la scène, la décision d’accès et, uniquement si le grant est nécessaire, le `grantId`, son mode et sa révision d’état. Le Store compare la capture émise à la capture conservée en mémoire, à `localRevision` et à l’empreinte qui inclut participants, scène active, grants et exécutions. À l’application, `applyDivineExecution(state,contract,input)` reconstruit acteur, grants et ID de scène à partir du `state` canonique et ignore tout `grants`, `sceneId` ou `accessDecision` provenant de `input`; il re-résout et compare avec la décision de preview. Le Store n’accepte aucun override client pour ces trois valeurs. Aucun appel direct d’engine ne peut persister une dérogation.

Une révocation concurrente, un changement de scène, une acquisition/perte de talent, un changement de prière ou l’usage d’un grant rend le preview périmé et impose un nouveau calcul. Au commit, le résultat de prière, l’éventuel effet, le reçu d’exécution et la consommation du grant unique sont écrits ensemble dans une seule commande existante `executeCommand`. Une répétition du même preview ou `executionId` est rejetée. La même commande est la limite atomique en IDB et en mode local.

Le journal d’exécution garde `grantId`, motif, portée et décision `DIV-02` lorsqu’une dérogation a réellement servi; un usage conforme à la fiche ne présente pas de faux usage de grant. Le journal de gestion conserve créations/révocations. Les objets sont des données de domaine sérialisables; aucune closure ou `Symbol` n’est persistée.

Undo restaure le snapshot complet précédant la commande : une consommation unique redevient disponible si l’invocation est annulée; l’effet et le reçu de prière sont annulés dans la même opération. Rétablir réapplique le snapshot consommé. Révoquer/accorder est également annulable; l’Undo restaure l’état du registre et sa trace. Aucun appel extérieur n’est effectué en dehors du commit.

## Migrations, sanitation, import et synchronisation

Le registre est stocké sous l’extension racine `extensions.v5`, déjà incluse dans export JSON, sauvegarde locale et enveloppes de synchronisation. `migrateSnapshot` accepte l’absence de registre comme v1 vide; `sanitizeMagicEnvelope` valide strictement son schéma sans toucher aux autres extensions ni aux talents/prayers de fiche. L’import signale/rejette les entrées invalides; il ne convertit pas un mauvais scope en `durable`, ne reconstruit pas un sujet depuis le nom, et n’active pas une entrée sans motif. Une réimportation de fiche met à jour le sujet sans recopier de grant dans son profil : `subjectKey` utilise l’identité stable existante (`ficheId`, `persistentCharacterId`, `resourceCharacterId` ou profil PJ). Un PNJ ne se lie jamais à partir d’un `profileId` de modèle; deux copies du même modèle restent distinctes. Si aucune identité existante n’est disponible, la commande motivée attribue `extensions.v5.divineSubjectId` au sujet local, conservé dans cet état exporté/importé; cette identité locale n’est pas propagée au modèle de rencontre. Une réimportation du même état exporté conserve le registre versionné; un remplacement complet par un ancien état qui omet l’extension reste un remplacement d’autorisation et demande un avertissement explicite plutôt qu’une conservation implicite de grants pour un autre monde.

Une commande d’accès suit le mécanisme `executeCommand` existant : validation de révision, clone, migration canonique, vérification de l’enveloppe, commit IDB avant mise à jour du Store vivant, projection cloud/offline habituelle, historique Undo/Redo. Une erreur IndexedDB/cloud ne publie aucun changement vivant partiel. En mode hors ligne le snapshot local demeure autoritaire et `syncPending` réplique la commande à la reconnexion; un état distant plus récent invalide le preview local par révision/empreinte. Les imports JSON emportent les grants locaux uniquement si l’utilisateur importe cet état; aucune permission n’est copiée dans les contrats du registre ou la fiche externe.

Les grants durables survivent au rechargement, à la fin de scène et à l’export/import du monde local. Un grant de scène ne s’applique pas à une autre scène même si son `sceneId` est réutilisé par une capture périmée, car `localRevision` et l’état canonique sont revalidés. Le scope `once` reste consommé après reload; seul Undo explicite de la commande peut le rétablir.

## UI verticale

Le formulaire `v5-divine-panel` affiche l’accès de fiche ou la dérogation réellement sélectionnée. S’il manque l’accès, le panneau propose au MJ : acteur/prière déjà fixés, portée (`une fois`, `scène`, `durable jusqu’à révocation`), motif obligatoire; aucune portée n’est précochée. Il ne montre l’option scène que si `activeScene.status === 'active'` et son ID existe. La validation crée le grant, rafraîchit l’écran et recalcule ensuite la prière; elle n’autorise pas à appliquer l’ancien preview. Les grants actifs visibles pour l’acteur/la prière montrent portée, motif, créateur MJ et action « Révoquer »; le grant consommé garde son reçu et n’offre plus une action d’usage.

Les messages distinguent accès de fiche, exception MJ et prière bloquée par la source. Un contrat `blocked` ne rend pas le formulaire de dérogation disponible. Pour un contrat `manual`, l’UI précise que l’accès n’automatise pas son effet. Les motifs sont affichés avec `textContent`, non injectés en HTML.

## Tests et critères de revue

Les tests de développement prévus dans `tests/divin-v5-access.test.js` prouvent : privilège de fiche prioritaire et non-consommé; talent Bénédiction ouvrant toutes bénédictions du culte sans liste nominative; miracles séparés par acquisition; grant exact acteur/tradition/prière; aucune traversée entre acteurs, traditions ou contrats; blocage des contrats bloqués/altérés; once non consommé par preview/refus et consommé une fois au commit; scène valide seulement dans l’ID actif; durable jusqu’à révocation; motif obligatoire; révocation atomique; stale/replay; Undo/Redo exact; persistance après reload/import; refus strict des entrées mal formées; erreurs de sauvegarde sans mutation partielle.

Le contrôle indépendant doit concevoir ses cas avant correction produit. Au minimum : forge d’un grant dans un input de preview, grant ancien pour même scène après changement de révision, deux appels simultanés du même preview unique, contrat V4 bloqué avec grant, mauvais `tradition` copié dans l’entrée, miracle non appris malgré grant couvrant une autre prière, entrée inconnue conservée sans élargir les droits, et migration/import avec révoqué/consommé/invalide. Le contrôle UI doit créer/révoquer par gestes et recharger; l’essai d’application d’un seul grant ne vaut pas recette globale.

## Frontières restant hors de cette tranche

E3 ne crée aucune habilitation traditionnelle générale, aucun contrat ou source pour les cultes futurs, aucun effet mécanique nouveau, aucune adaptation V4 et aucun choix de règles manquant. La source existante ne couvre que Myrmidia; le mécanisme générique lit les `requiredTalent` des contrats canoniques effectivement présents. Les bénédictions de caractéristiques restantes attendent la tranche E7 après relevé et contrôle de leurs clauses. E1 reste partiel et son générateur n’est pas modifié. Aucun runner, recette globale, bilan/passation, package, service worker ou publication ne fait partie de cette tranche.


