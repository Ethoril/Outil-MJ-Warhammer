# Contrôle indépendant — Courroux et acquisition d’États V5

Date : 18 octobre 2026. Contrôle indépendant de l’intégration Courroux 61–65 et 89–95; tests et recette UI écrits séparément de l’implémentation.

## Règles et périmètre source

L06 p.218 donne 61–65 « Blessures divines » : 1 + Péchés États Hémorragique; et 89–95 « Craignez ma colère » : 1 + Péchés États Brisé. Le Péché est celui du déclenchement, le résultat s’applique avant la baisse de 1 (minimum 0). La génération ne donne aucune échéance de Bénédiction aux nouveaux États. Lecture visuelle indépendante des pages rendues p.218 et 185–186; la règle de cumul p.184 est référencée dans la synthèse source, sans prétendre à une inspection visuelle de cette page : [relecture source finale](C:/Users/arnot/.codex/visualizations/2026/10/18/01a14e4f-ac4b-73e2-904a-3a4e89591017/wrath-source/integration-source-review-final-2026-10-18.md). Empreinte PDF source : `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`.

Ce contrôle couvre ces deux lignes seulement. Il ne certifie ni toute la table de Courroux, ni l’ensemble E1, ni l’automatisation complète de Brisé.

## Résultats automatisés

Le test indépendant [divin-v5-wrath-conditions-independent.test.js](../../tests/divin-v5-wrath-conditions-independent.test.js) passe **15/15**. SHA-256 : `BE05656DAEB54B88E3460FD6529EE4F7B224787495DA34459F98AB84C0ECAF59`. Il vérifie notamment les bornes après +10 par Péché, le calcul avec Péché pré-décrément, succès et échec, ciblage du prêtre, rejet du texte libre comme mécanisme, absence de mutation à l’aperçu, cumul et conservation des autres effets, immunité canonique, projection/consommation du Momentum, refus de persistance et reprise, état obsolète, retry/double application/falsification, reload/Undo/Redo et garde de réemploi d’un `executionId` après éviction du journal.

La recette réelle Playwright/Edge [divin-v5-wrath-conditions-browser-independent.mjs](../../tests/divin-v5-wrath-conditions-browser-independent.mjs) passe après correction de la formulation de l’aperçu. SHA-256 : `2F065B3559C883A98AA7F54C8EA5CA54A0895C93DD35407DEB7FA5A1A72FE2E6`. Reçu : [receipt.json](C:/Users/arnot/.codex/visualizations/2026/10/18/01a14e4f-ac4b-73e2-904a-3a4e89591017/wrath-control/browser-final/receipt.json). Les gestes testés montrent que l’aperçu annonce les acquisitions au futur et la perte d’Élan sans mutation; Appliquer pose l’État sur la prêtresse, consomme l’Élan projeté et le reçu/État survivent au rechargement IndexedDB. Les captures 1440 px et 390 px, thèmes sombre et clair, sont jointes dans le même dossier; aucune erreur JS ni barre de défilement horizontale n’a été relevée.

## Rouges conservés et ajustements de fixture

Les rouges avant correction sont archivés dans `C:/Users/arnot/.codex/visualizations/2026/10/18/01a14e4f-ac4b-73e2-904a-3a4e89591017/wrath-control/independent-red-corrected.log`, `independent-browser-red.log` et `independent-conditions-red-id-reuse.log`. Le premier a permis de corriger les attentes de recette mal formées avant implémentation; le second a révélé le libellé au passé de l’aperçu; le troisième a reproduit la réutilisation effective d’un identifiant d’exécution après éviction du journal. Le garde contre ce dernier défaut passe désormais dans le test indépendant.

Les fixtures ont été rectifiées pour placer l’immunité sous `extensions.v5.immunities`, exécuter la phase Hémorragique avec createCombatEngine(store).nextTurn et son commitStore (le Store.nextTurn legacy seul ne déclenche pas les dégâts d'État) et mesurer la quantité d’États par niveaux canoniques (une occurrence de niveau 2 est deux niveaux, pas nécessairement deux lignes). Ces corrections de représentation/calendrier ne sont pas présentées comme défauts produit. La reprise brisée vérifie les préconditions et l’usage du service canonique; la fuite/Sprint ne sont pas simulés comme résolus automatiquement.

## Limite Brisé

La formulation UI corrigée est conforme à L06 p.185–186 : Move (Flee), puis Action (Sprint) jusqu’à être hors de vue; une Action et un Test de Compétence pour mieux se cacher sont facultatifs une fois en sécurité. Le déplacement et le Sprint restent manuels. Le malus de Brisé et sa récupération selon les faits requis sont contrôlés dans le périmètre des tests, mais ce rapport ne certifie pas chaque transition ou effet de Brisé.

Aucun commit ni push n’a été effectué. Le worktree demeure sur `codex/divin-v5`, HEAD `fb0f280150cdbdab1af220163abfaa491e2156ee`.

