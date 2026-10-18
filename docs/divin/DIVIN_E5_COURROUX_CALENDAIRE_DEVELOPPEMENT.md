# E5 — Courroux calendaire : rapport de développement

18 octobre 2026. Cette note couvre une seule règle source-backed et son raccordement technique : Courroux divin 6–10, « Think Over Your Deeds » (Livre de base V5 EN, p. 218). Elle ne clôt pas E5, le programme divin, ni la recette principale. Le runtime reste gelé pendant cette recette.

## Chaîne source → application

`docs/divin/sources/L06-calendar-readings.mjs` porte la règle lue et contrôlée : après résolution du résultat de Courroux 6–10, les Tests de Prière réussis sont plafonnés à +0 DR pour la semaine suivante. Les p. 177 et 289 établissent qu’une semaine impériale dure huit jours. Le choix de 86 400 secondes par jour est une convention distincte de l’horloge du jeu, identifiée par `campaign-day-86400s`; il ne se déduit pas des pages citées. Le générateur `tools/build-v5-divine-contracts.mjs` est l’unique auteur du contrat `prayerSLRules` produit dans `js/data/v5-divine-contracts.json` et de son inventaire. `node tools/build-v5-divine-contracts.mjs --check` confirme que les sorties générées sont à jour.

`js/core/v5-divine-prayer-caps.js` exporte `validatePrayerSLCaps(actor, {clock?})` et `applyPrayerSLCaps(actor, test)`. La validation exige la règle, l’origine, l’ancre et la preuve autonomes et versionnées; elle refuse les champs mécaniques étrangers, les durées contradictoires, les identifiants non liés et les preuves impossibles. L’application ne modifie que `sl` et `zeroOutcome` d’un résultat réussi dont les DR sont positifs. Elle conserve le jet sélectionné, le jet initial, l’inversion, le succès, l’échec critique, la maladresse et les détails bruts.

Le helper intervient dans les trois voies de Test concernées : `previewDivineExecution` dans `js/core/v5-divine-engine.js`, le Test générique dans `js/core/resolution.js` — initiateur et défenseur d’une opposition —, et `previewMagicMeditation` dans `js/core/v5-magic-talents.js`. La préparation plafonne chaque option légale, puis la trace annonce les DR de l’option effectivement choisie. La méditation détermine le nombre de d10 de durée à partir des DR effectifs. Une sanction produite par une Prière n’affecte pas le Test qui l’a déclenchée; une résolution de Courroux ne réécrit pas l’issue ni le jet source.

## Pose, échéance et persistance

`previewStoreDivine` et `applyStoreDivine` dans `js/core/v5-divine-store.js` lient l’aperçu à la révision locale, au fingerprint exact de l’horloge, au sujet, au jet choisi et à la preuve du Courroux. La pose crée une couche autonome `prayer-sl-cap` avec `originExecutionId`, `wrathProof`, durée source, ancre de clock et échéance absolue. Elle n’utilise pas `prayerId` ni `executionId` de la prière active : terminer cette bénédiction ne retire donc pas la sanction. Les occurrences distinctes gardent leurs échéances indépendantes; leurs caps identiques ne s’additionnent pas.

Avant la pose ou le retrait, les copies du même sujet sont contrôlées ensemble dans le snapshot : combat, fiche persistante, réserve, scène active et scènes suspendues. Une copie absente ou divergente bloque la transaction. Les sujets ne sont pas regroupés par nom ou `profileId`. Le test de Prière et son reçu conservent une trace des DR bruts et effectifs.

`expireDivineAtClock(candidate, {fromClock, toClock, receipt})` rejoue le reçu avec `advanceGameClock`, vérifie la position finale et ne traite que cette couche sourcée. L’expiration a lieu au passage exact de `deadline.atSeconds`; un reçu de campagne accepté et les transitions réelles de Tour sont les seules voies raccordées. `js/core/v5-campaign-time.js`, `js/core/store.js` et `js/core/v5-turn.js` raccordent respectivement l’avance de campagne et les Tours legacy/V5. Les échéances de phase restent traitées par leur mécanisme propre; `expireDivineEffects` ne supprime pas une échéance `campaign-time`. Toute autre deadline divine calendaire reste refusée, elle n’est pas rendue jouable par cette tranche.

La migration dans `js/core/migrations.js` refuse une sanction existante sans horloge. `js/core/sync-session.js` répare uniquement le `lastEventId:null` omis par RTDB lorsque l’ancre elle-même est à révision 0 et seconde 0, après validation complète de la couche contre la clock distante actuelle. Les imports locaux restent stricts; les ancres positives ou les sources altérées ne sont pas réparées. L’état, l’horloge, les couches et leurs reçus passent par la même sauvegarde transactionnelle et l’historique Undo/Redo. Le Service Worker inclut le nouveau module dans `sw.js`.

L’UI de `js/ui/v5-divine-panel.js` résout automatiquement la ligne 6–10 sans champ de texte MJ libre et expose la source, la durée de huit jours et la trace DR bruts → DR appliqués. L’état ouvert du panneau est capturé avant les gestionnaires qui rerendent le formulaire. Le contrôle navigateur utilise l’application réelle, IndexedDB native et les gestes de formulaire.

## Contrat vérifié et preuves

| Surface | Résultat | Preuve conservée |
| --- | --- | --- |
| Node indépendant et régressions | **181/181** : 71 cas Courroux et 110 régressions antérieures inchangées | `tmp/divin/wrath-independent-final-node.log` |
| Synchronisation cloud | **25/25**, dont pose à clock 0, synchronisation, sept/huit jours, reload, Undo/Redo et branches hors ligne | `tmp/divin/wrath-cloud-independent-green.log` |
| Navigateur réel | Parcours complet vert : pose, affichage du cap, fin de prière sans retrait, sept jours + reload, expiration au huitième jour, Undo/Redo; quatre captures mobile/desktop et thèmes clair/sombre | `tmp/divin/wrath-browser/receipt.json`, `tmp/divin/wrath-browser/` |
| Génération et syntaxe | `build-v5-divine-contracts.mjs --check` vert; modules modifiés validés par Node | Sorties générées du registre et de l’inventaire |

Les rouges conservés ont reproduit les défauts d’ordre de clés après RTDB, d’ancre historique nulle, d’attestation de sujet/horloge, de champs mécaniques étrangers, de miroir durable manquant, de deadline arbitraire retirée par phase, de voie de méditation par nom, de plafonnement du défenseur et de trace prise sur une option non choisie. Les six derniers cas ajoutés ont verrouillé le certificat temporel (ancre initiale exactement à 0 seconde avec `lastEventId:null`; ancre positive avec identifiant non vide) et le refus d’un Test de Prière défenseur dont le cap est échu ou dont l’ancre est future. Le contrôleur a aussi remplacé une seule attente de nommage (`initiator` → `attacker`) pour respecter l’API publique historique de l’opposition. L’attente numérique et mécanique du net n’a pas été modifiée; le rejeu final est vert à 181/181.

## Limites et risque de migration

Cette intégration ne généralise pas un consommateur de deadlines calendaires divines. Elle autorise le seul contrat `wrath:6-10:pray-sl-cap`; une deadline de bataille, une couche divine arbitraire, une phase mêlée à une deadline ou une ancre/provenance insuffisante doivent encore être résolues explicitement. Les résultats 1–5 et 11–100 gardent leur traitement existant. Les caps n’ajoutent aucun modificateur de DR avant le Test : ils plafonnent uniquement un succès positif après détermination de l’issue.

Risque historique à traiter séparément : `js/core/v5-magic-effects.js` définit `UNIT_MINUTES.weeks = 10080` (sept jours). La convention de cette nouvelle sanction est huit jours impériaux, mais je n’ai ni modifié cette table ni migré silencieusement les couches historiques qui l’utilisent. Une future migration doit inventorier ces couches et établir leur provenance avant conversion; ne pas déduire qu’elles doivent toutes changer.

Cette preuve est ciblée sur une règle et ses chemins raccordés. Elle ne certifie pas toutes les prières, toutes les deadlines ni la clôture d’E5; la recette principale et la revue de clôture restent sous la responsabilité du principal.
