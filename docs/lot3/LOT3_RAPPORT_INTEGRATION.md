# Rapport d’intégration — phase 9

11 octobre 2026. Worktree `lot2-combat-v5`, branche `codex/lot2-talents-v5`, HEAD `fb0f280`, application **3.14.0 inchangée**. Travail local, sans commit, push, fusion, déploiement ni manipulation des modifications préexistantes.

| Item | Résultat | Vérification |
| --- | --- | --- |
| U-01 | Toutes les actions secondaires passent par une garde commune `busy`, capturent la révision et la vérifient dans la commande sérialisée : runes/départ, Corruption, méditation, L’esprit sur le corps, récupération, aventure, temps et séance. Boutons magiques désactivés pendant la commande. | Déploiement concurrent rouge puis vert ; double-clic réel sur déploiement et méditation ; refus de révision périmée des autres commandes. |
| U-03 | Les appels synchrones sont dans le `try` de la garde commune. Une récupération impossible affiche la raison du Store ; les autres actions affichent aussi leur échec et libèrent `busy`. | Geste Edge sans compteur de Chance : message visible, aucune erreur de page. Pas de rouge préalable dédié à U-03. |
| U-04 | `applySpellExecution` propage `{ok:false}` ; la file de persistance conserve aussi un refus explicite de `saveAtomic`. L’UI affiche l’erreur et garde le jet et l’aperçu pour réessayer. | Refus durable rouge puis vert ; aucun effet/historique ajouté ; reprise après refus vérifiée sous Edge. |
| U-05 | Révision ajoutée aux cinq aperçus et contrôlée dans les cinq applications, à l’exécution de la commande. Pour `applyBeastForm`, transmettre `options.baseRevision` de l’aperçu. Une application directe capture la révision à son appel. | Cinq refus périmés ; contrôle sans mutation ; un attribut courant reste applicable, y compris sa Map de destinataires. |
| U-06 | Registre canonique borné à **100** identifiants ; exécutions de Haute Magie à **50**. Bornes appliquées au rechargement, à chaque commande et au partage cloud. | Rouge puis vert : recharge de 200 reçus, application, doublon refusé, Undo, nouvelle application. |
| U-07 | Sanitisation des réserves et aliases historiques, couches/bonus, PA, Protection et défenses, ressources temporaires/registre, caractéristiques de base, forme et profil/attaques/restauration, Bmax du Fléau et épuisement. Réserve, combat, scènes et personnages persistants passent par le même traitement ; les extensions inconnues sont conservées. | Deux états hostiles rouges puis verts ; données valides et seuil de Protection négatif conservés ; publication sans mutation de son entrée. |
| U-09 | Règles MJ mises à jour avec tous les arbitrages confirmés et ceux des 10–11 octobre ; procédure d’aperçu/application, données et dés requis. Recherche étendue aux sources et introduction des tables. | Rouge de contenu puis vert ; recherche Edge de Dex, chaque Protection, Coruscating Arc, Seconde vue et 11 octobre 2026. |
| U-10 | HTML initial aligné sur `js/version.js` : 3.14.0. | Rouge puis vert ; aucun changement de numéro applicatif. |
| V-A | `Store.getHighMagicExecutions(actorId)` retourne des copies des reçus de l’acteur depuis l’enveloppe ; le sélecteur l’utilise via les handlers. | Rouge puis vert ; geste complet Apothéose → Corruption par rune → Undo ; rune et marqueur restaurés. |
| V-B | Une baisse du niveau d’un État verrouillé est refusée en se fondant sur le participant **avant** modification, même si le patch efface sa source/extensions. | Rouges puis verts pour 0, −1 et 0,5 ; participant intact après refus. |
| V-C | Nouvelle séance : Clairvoyance chaotique retirée de réserve, combat, scène active, scènes suspendues et personnages persistants. Le cumul de Corruption déjà reçu reste présent. | Rouge puis vert ; Undo restaure, puis une scène suspendue reprise ne réactive pas l’effet. |

## Bornes retenues

- **100 reçus anti-doublon** : deux fenêtres maximales d’Undo de 50 commandes. Chaque snapshot d’Undo conserve son propre registre ; les anciens aperçus sont aussi refusés par leur révision. La borne porte sur les derniers reçus, pas sur un historique éternel des identifiants d’exécution.
- **50 reçus Haute Magie** : borne déjà utilisée par le moteur, désormais imposée aussi aux états importés et partagés. Une relance de Corruption reste liée à un reçu présent et au marqueur du jet ; Undo restitue reçus et marqueurs.
- Réserve : 0–10 000 DR ; caractéristiques/PA/runes/ressources : plafonds de 1 000 ; modificateurs : −1 000 à +1 000 ; B/Bmax et durées : plafond de 1 000 000. Ces plafonds techniques dépassent largement les profils et effets usuels. Les chaînes numériques finies sont converties ; les types invalides sont retirés. Dex « – », les durées fractionnaires et les seuils de Protection ≤1 sont conservés.

## Tests et limites du passage complet

- **25/25** nouveaux tests verts : `tests/lot3-v5-integration-{commands,sanitize,rules}.test.js`.
- `node --test` complet lancé **une fois** : **1 316/1 317**, aucun ignoré. Échec unique dans `lot3-v5-magic-33.test.js:579` : assertion du libellé historique « État modifié depuis l’aperçu », remplacé par ma garde commune. Libellé rétabli dans **store.js**, sans changer le test. Recontrôle des nouveaux tests et du fichier concerné : **50/50 verts**. La suite entière n’a pas été relancée après cette correction de texte.
- `node tests/lot3-v5-magic-2b-ui-browser.mjs` **vert en entier**, recettes précédentes et quatre nouveaux scénarios. Un premier essai a échoué dans ma fixture de méditation : un d10 fourni alors que la réussite à 4 DR en demandait cinq ; fixture corrigée à cinq résultats explicites. Le mode facultatif `LOT3_INTEGRATION_ONLY=1` ne joue que les quatre ajouts.
- Syntaxe des modules et `git diff --check` verts. Aucun échec restant observé dans les fichiers de Claude.

## Fichiers et raccordements restants

Modifiés : `js/core/store.js`, `sanitize.js`, `migrations.js`, `sync-protocol.js`, `js/data/rules.js`, `js/ui/rules-view.js`, `workspace-view.js`, `v5-magic-controls.js`, `index.html` et le test navigateur autorisé. Ajoutés : trois fichiers `lot3-v5-integration-*.test.js` et ce rapport.

**Aucun changement nécessaire dans un fichier interdit pour les items de ce brief.** Aucun fichier réservé à Claude, générateur, contrat JSON, matrice, catalogue public ou Service Worker modifié par ce chantier. Les corrections moteur parallèles restent du ressort de Claude.
