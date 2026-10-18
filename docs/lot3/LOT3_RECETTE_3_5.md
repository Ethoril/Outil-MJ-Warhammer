# Recette locale 3.5 — Magie V5

**Historique du 10 octobre 2026.** La recette courante est [LOT3_RECETTE_3_15.md](LOT3_RECETTE_3_15.md), application 3.15.0. Les résultats 3.14.0 ci-dessous ne sont pas les résultats de clôture. Le générateur de couverture a été recalé le 14 octobre.

10 octobre 2026, application **3.14.0**. Travail dans le worktree lot2-combat-v5, branche codex/lot2-talents-v5. [État complet et limites](LOT3_FINALISATION_MAGIE.md).

## Vérifications

| Vérification | Résultat et preuve locale |
| --- | --- |
| Suite Node complète | **1 058 / 1 058**, aucun échec, ignoré ou annulé ; tmp/lot3/finalization-full-final.log. |
| Nouveaux scénarios de finalisation | 25 tests de conséquences sur le store et le combat dans tests/lot3-v5-finalization.test.js. |
| Magie, vrais gestes Edge | Ordinateur / téléphone 390 px, sombre / parchemin, surpuissance, Main de Gloire, Destruction des Arcanes, runes, dissipation persistante, sélection mixte allié/adversaire et Undo ; tmp/lot3/finalization-browser-final.log. |
| Combat V5 | Tests, critiques défensifs, États, Élan, expiration, Fortune, rechargement et annulation ; tmp/lot3/finalization-core-combat-browser.log. |
| Application générale | Démarrage, profil, rencontre, résolution, Undo/Redo, reload et suppression ; tmp/lot3/finalization-combat.log. |
| Références | Sources, alias, catalogue magie, échec honnête, recherche, mobile et hors ligne ; tmp/lot3/finalization-references.log. |
| Mise à jour PWA | Ancien cache 3.12.0 → 3.14.0, profils et état local conservés ; tmp/lot3/finalization-startup.log. |
| Cloud local | Deux contextes Edge, IndexedDB native et Auth/RTDB locaux ; 10 scénarios de réserve, rune, quota, dissipation, Défiance, rechargement/Undo, divergence hors ligne et accusé perdu ; tmp/lot3/cloud-receipt.json et finalization-cloud-final.log. |
| Paquet exporté | **147 assets** ; empreintes SHA-256, bureau 1440 px et téléphone 390 px, vrai Service Worker, cache hors ligne et IndexedDB native ; tmp/lot3/release-browser-receipt.json. |
| Cohérence | Versions package / lock / application / cache alignées, syntaxe JS, précache et git diff --check. |

Le paquet hors ligne conserve une réserve de 9, une rune déployée, 2 Chance permanentes, un bonus de FM de 20 et Protection 7+. Une Focalisation suivante utilise les nouvelles valeurs ; l’expiration rend les valeurs originales, puis Undo restitue l’effet. Le parcours cloud emploie le Store et le protocole de production ; un pont REST ETag local remplace l’adaptateur SDK. Il ne prouve pas une authentification Google ni une séance distante en production.

Les captures de tmp/lot3/magic-v5-*.png ont été inspectées. Les tests emploient des profils de recette synthétiques ; aucun compte joueur distant n’est interrogé.

## Reproduction

Utiliser Node 24 et Edge Windows ; la variable PLAYWRIGHT_EXECUTABLE_PATH peut préciser le navigateur.

~~~powershell
node --test
node tests/browser-magic-v5-smoke.mjs
node tests/lot2-combat-v5-browser.mjs
node tests/browser-smoke.mjs
node tests/browser-references-smoke.mjs
node tests/browser-startup.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs
node tools/build-v5-talent-coverage.mjs
node tools/build-lot3-local-release.mjs
node tests/lot3-v5-35-release-browser.mjs
git diff --check
~~~

Le runner cloud exige Java et Firebase CLI installés, quatre ports locaux libres et un projet demo jetable. Aucun service Firebase distant n’est utilisé. Le générateur de couverture relit les empreintes des descriptions ; le tri du lot 2 reste un document historique.

## Livraison

Le chemin exact du paquet courant est dans **tmp/lot3/release-path.json**, son contenu et ses SHA-256 dans **release-manifest.json**. Le builder copie exclusivement le précache explicite et le Service Worker : pas de séance, profil privé, test, livre, PDF ou export personnel. Le répertoire et son ZIP restent ignorés par Git.

La recette confirme les cas décrits et la couverture des identités. Les effets nécessitant terrain, profil, résistance ou interprétation conservent leurs choix et rappels ; aucune certification exhaustive de chaque clause n’est revendiquée. Les miracles ne font pas partie de cette recette. Aucun commit, push ou déploiement.
