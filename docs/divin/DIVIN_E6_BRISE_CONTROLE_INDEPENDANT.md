# Contrôle indépendant — Brisé, Flee et Sprint

Contrôle effectué le 18 octobre 2026 sur le worktree V5 local, après capture de reprise du principal. Ce rapport couvre uniquement les obligations de fuite de Brisé contrôlées ici; il ne certifie pas la clôture générale du chantier E6.

## Références et attentes

Les pages L06 consultées visuellement sont les p. 161, 163, 185 et 186 du *Livre de base V5 EN v2*. Les règles pertinentes sont également consignées dans [`L06-wrath-conditions-readings.mjs`](./sources/L06-wrath-conditions-readings.mjs). La p. 163 définit Sprint comme une Action avec Test d’Athlétisme moyen (+2 DR) et une distance supplémentaire de Run + DR en yards, au-delà du Move du Round; la Flee utilise le Move sans Test d’Athlétisme supplémentaire. La p. 185 impose Move (Flee), puis Action (Sprint) à chaque Tour où le personnage reste visible d’au moins un ennemi. Hors de vue, Sprint cesse d’être obligatoire et Hide reste une Action facultative. La p. 186 ne retire pas Brisé automatiquement à la sortie de vue.

Les faits spatiaux, l’engagement et la visibilité sont fournis explicitement par le MJ; le système n’invente ni position, ni distance, ni ligne de vue. Un aperçu incomplet reste pur. L’application du plan dérivé de l’horloge Store débite le quota Move ou Action et écrit son reçu.

## Contrôles automatisés indépendants

Commande: `node --test tests/divin-v5-brise-flee-sprint-independent.test.js tests/divin-v5-broken-escape-simulation-independent.test.js` — **29 tests réussis, 0 échec**, incluant le contrôle de classification ajouté après corrections du développeur. Le reçu exact est [`broken-independent-receipt.json`](../../tmp/divin/broken-independent-receipt.json).

La suite vérifie notamment : faits de visibilité/engagement manquants, pureté des previews, Move Flee et Action Sprint avec quotas canoniques, séquence visible sur plusieurs Tours via `createCombatEngine(store).nextTurn()`, distance source et Test V5 Athlétisme +2, États cumulés, Exténué, jet critique, Sprinter identifié par id ou libellé, et blocage des déplacements dont la distance n’est pas raccordée. Elle vérifie aussi les previews/résolutions attaque, Prière, sort et simulation, les faits MJ revalidés au commit, l’altération/péremption/doublon, le refus de persistance, reload/Undo/Redo et l’arbitrage `DIV-BROKEN-MIDTURN-01` quand une Action est déjà dépensée au moment où Brisé apparaît. La voie Simulation refuse aussi les attaques ordinaires et les Tests marqués actionnels après Sprint, y compris quand le client ajoute `isReaction`, `reactionId` racine ou `v5.reactionId` inventés; un Test explicitement non actionnel demeure disponible. Cette suite ne certifie pas positivement une réaction issue d’une opportunité source valide.

Le contrôle supplémentaire de classification reproduisait une mutation réelle par Résolution et Simulation pour un Test non classé après Sprint (tmp/divin/broken-escape-simulation-classification-red.log). Il vérifie désormais le refus avant toute dépense comme après Sprint, les commits directs et transactionnels, le cas Action=true soumis au quota et le cas Action=false libre. Le navigateur vérifie aussi les trois choix et le retour du sélecteur après Hide.

Les quotas sont contrôlés sur le véritable état canonique et les reçus, pas seulement sur un rappel UI. Une Flee qui atteint hors de vue ne dépense pas l’Action : une première Action peut alors être appliquée, tandis qu’une deuxième est refusée. Un Sprint appliqué consomme l’Action même s’il amène hors de vue; la visibilité ne restitue pas le quota. Les previews refusées ne mutent pas l’état.

Les preuves pré-correctif conservées sont `C:\Users\arnot\.codex\visualizations\2026\10\18\01a14e61-da98-71d0-a37a-664a6af43209\divin-broken-baseline\luna-action-after-sprint-red.log` et `C:\Users\arnot\.codex\visualizations\2026\10\18\01a14e61-da98-71d0-a37a-664a6af43209\divin-broken-baseline\luna-simulation-reaction-flags-red.log`. Elles reproduisent respectivement l’Action ordinaire acceptée après Sprint hors vue, le talent Sprinter encodé par id non détecté, le Test actionnel accepté et les Actions simulation acceptées malgré des marqueurs de réaction client forgés. L’assertion initiale qui supposait à tort que Flee devait être bloquée quand la visibilité avant était déjà fausse a été corrigée selon la source; la suite finale couvre séparément Flee visible avant / hors de vue après.

## Gestes UI et captures

Une première exécution du script Playwright local [`divin-v5-brise-flee-sprint-browser-independent.mjs`](../../tests/divin-v5-brise-flee-sprint-browser-independent.mjs) a réussi avec interception de toutes les requêtes HTTPS; son reçu est [`receipt.json`](../../tmp/divin/brise-flee-sprint-browser-independent/receipt.json). Elle a fait calculer l’aperçu sans mutation, appliqué Flee, calculé et appliqué Sprint (Athlétisme 60, d100 23, +2 DR, 22 yards supplémentaires et 30 au total), puis utilisé Undo/Redo dans l’interface et rechargé la page. Les reçus et quotas ont été vérifiés après chaque étape. Après les derniers changements de libellés UI, la recette de reprise s’est arrêtée sur une assertion texte trop stricte pour « source V5 : 22 yards »; l’assertion du script accepte maintenant les deux formulations en gardant stricts la distance, les unités et le total. Le geste Hide isolé a ensuite été vérifié : le callback transmet `isAction:true`, `runningOrHiding:true` et `involvesMovement:false`; le Store refuse le second Test avec `BROKEN_ESCAPE_ACTION_SPENT` sans mutation. Son reçu est [`gesture-receipt.json`](../../tmp/divin/brise-flee-sprint-hide-green/gesture-receipt.json). La recette Playwright complète avec ces derniers libellés reste à confirmer par le run principal.

Les quatre captures 1440 px et 390 px, thème sombre et parchemin, ont été ouvertes et inspectées :

- 1440 sombre : `C:\Users\arnot\.codex\visualizations\2026\10\18\01a14e61-da98-71d0-a37a-664a6af43209\divin-broken-baseline\luna-browser\broken-escape-1440-dark.png`
- 1440 parchemin : `C:\Users\arnot\.codex\visualizations\2026\10\18\01a14e61-da98-71d0-a37a-664a6af43209\divin-broken-baseline\luna-browser\broken-escape-1440-light.png`
- 390 sombre : `C:\Users\arnot\.codex\visualizations\2026\10\18\01a14e61-da98-71d0-a37a-664a6af43209\divin-broken-baseline\luna-browser\broken-escape-390-dark.png`
- 390 parchemin : `C:\Users\arnot\.codex\visualizations\2026\10\18\01a14e61-da98-71d0-a37a-664a6af43209\divin-broken-baseline\luna-browser\broken-escape-390-light.png`

Aucun débordement horizontal n’a été observé et les contrôles restaient visibles. À 390 px, la page est longue et nécessite le défilement vertical. Ces gestes utilisent une partie de test locale et n’ont envoyé aucune requête HTTPS.

## Limites à conserver visibles

- Une Flee engagée reste bloquée tant que Momentum, les frappes gratuites et les conséquences de Brisé ne sont pas raccordés; aucun effet partiel n’est appliqué.
- Sprint et Flee restent bloqués pour Inconscient, Enchevêtré, Sonné et À terre tant que leurs effets sur déplacement/distance ne sont pas intégrés. Le talent Sprinter est détecté et bloqué tant que son Avantage au Test n’est pas raccordé; il ne doit pas être traité comme absent.
- Hide est facultatif et renvoie vers le Test de Compétence normal; la suite ne certifie pas une résolution complète de Hide avec compétence/jet de campagne.
- `DIV-BROKEN-MIDTURN-01` bloque une séquence acquise après une Action déjà dépensée et requiert une décision MJ explicite à chaque occurrence. Aucun report automatique ni Action supplémentaire n’est accordé.
- La validation de position et de ligne de vue reste un fait MJ; ces tests ne démontrent pas un moteur spatial.

La recette locale est ainsi concluante pour les cas non engagés vérifiés et les garde-fous précités, mais ne permet pas d’annoncer Brisé entièrement raccordé. La validation finale du principal et sa recette cloud/globales restent distinctes.

## Validation principale du 18 octobre 2026

Ajout par /root après gel du produit et des scénarios : la [recette complète](../../tmp/divin/recipe-receipt.json) est verte à **2667/2667 tests Node, 22/22 commandes et 45 contrôles cloud localhost**, fin 2026-10-18T10:59:07.053Z. Les verdicts « en attente » ci-dessus décrivent les étapes antérieures de cette fenêtre. Le [rapport courant](DIVIN_RAPPORT_REPRISE.md) fixe le périmètre livré et les limites toujours ouvertes.

La dernière assertion Hide initialement rouge collectait l’alerte après changement de brouillon; sa collecte a été replacée au moment du geste Hide, sans assouplir l’attente. Le scénario final contrôle aussi Annuler et le parcours Hide → autre action → compétence : Hide garde son coût Action, le Test générique retrouve la classification explicite. Aucun commit ni publication.
