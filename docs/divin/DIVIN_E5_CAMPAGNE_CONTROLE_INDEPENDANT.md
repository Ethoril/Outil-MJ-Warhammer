# E5 — Contrôle indépendant de l’avance de campagne

18 octobre 2026, Europe/Paris. **Tranche acceptée pour la recette globale; E5 et le programme exhaustif restent ouverts.** Contrôle réalisé dans le seul worktree `codex/divin-v5`, sans modification du runtime par le contrôleur ni publication.

Le [reçu détaillé](../../tmp/divin/campaign-independent-receipt.json) conserve les empreintes contrôlées, les logs rouges et verts, ainsi que les limites. Ce rapport ne remplace pas le verdict final du principal : la recette globale de **18 commandes est encore en cours** au moment de sa rédaction.

## Sources et nature du contrôle

La conception E5 et les décisions DIV-06, D-11, D-12 et S-02 ont été relues. Les pages V5 **161–163, 186 et 266** ont été lues intégralement dans l’extraction textuelle. Il n’y a pas eu de nouvelle vérification visuelle du PDF pendant ce contrôle ni de promotion des compteurs E1. La convention de table de dix secondes par Round est distinguée du texte général de la p.161; aucune règle D-12 n’est étendue aux prières.

## Preuves obtenues

| Contrôle | Résultat | Portée réelle |
| --- | --- | --- |
| Node indépendant et régressions héritées | **110/110** : 59 campagne et 51 hérités inchangés | API, état effectif, CAS, échecs de persistance, reload simulé, Undo/Redo, familles et contextes ciblés. |
| Formulaire indépendant | **6/6** | Composant réel et gestes navigateur avec Store contrôlé : messages précis, stale, besoin localisé, échec de sauvegarde, annulation/focus et double soumission. |
| Cloud dédié | **20/20** | Deux contextes IndexedDB natifs; Auth/RTDB localhost; Store, session et protocole de production, avec pont REST ETag. A↔B, expiration réelle, reload/Undo/Redo et conflit hors ligne 30/60. |

Logs : [Node final](../../tmp/divin/campaign-independent-final-node.log), [UI finale](../../tmp/divin/campaign-ui-independent-final.log), [cloud dédié](../../tmp/divin/campaign-cloud-independent-green.log). Le cloud dédié a précédé les ultimes correctifs de cadence mixte et du setter; la recette globale doit le rejouer sur l’arbre final figé, avec l’application réelle et le paquet hors ligne.

Les rouges conservés ont notamment reproduit les fins de minute retardées, les champs calendaires ambigus, le mauvais reçu retourné entre deux commandes, les copies durables divergentes, les champs vides supprimés par RTDB et les erreurs de contexte temporel. Les corrections vérifiées maintiennent ensemble horloge, effets et reçu. Aucun refus ne doit laisser un état partiel. Un changement manuel de Round reste neutre, un reçu actif ne prouve pas le passage d’une autre scène, et une avance répétée ne recompte pas le même Round. Le setter mémoire conserve aussi une projection et une réponse cohérentes.

## Limites maintenues ouvertes

- Les échéances divines calendaires non raccordées et les ancres ambiguës bloquent avec un besoin localisé; elles ne sont pas déclarées synchronisées. Les échéances de phase restent en attente d’une phase réelle.
- Après des Tours, certains talents et Formes bestiales ne possèdent pas d’ancre exploitable. Leur blocage ne clôt pas leur migration. Un historique d’incident insuffisamment attesté peut également nécessiter une entrée.
- La réserve normalisée en `Profile` conserve les couches de sorts contrôlées et leurs valeurs effectives, mais ne représente pas tous les champs d’identité et d’États d’un participant. Aucun rapprochement par nom ou profil n’est inventé.
- Le backend legacy `localStorage` à plusieurs clefs est refusé avant écriture. Le chemin applicatif natif utilise IndexedDB; `storage: null` conserve un mode mémoire pour le moteur et les tests.
- Ces preuves ciblées ne certifient pas toutes les durées ou clauses du corpus. Aucune fiche externe n’a été écrite; aucun commit, push, merge ou déploiement n’a été réalisé.

## Traçabilité de la procédure

Aucune attente mécanique héritée n’a été modifiée. Les seuls ajustements de fixtures ont neutralisé `exportedAt` recalculé par le getter, corrigé le Round réel de pose du sort suspendu, séparé la clock attendue de son alias mutable, attendu l’événement natif `close` et précisé que le reload Node était simulé.

Deux réserves de chronologie restent explicites : les trois bornes numériques talent/incident/Forme ont été corrigées par le développeur avant le premier run indépendant des trois cas ajoutés; aucun rouge live préalable n’est revendiqué pour elles. La discordance de projection mémoire a été observée directement avant correction, puis verrouillée par une régression verte; son [observation conservée](../../tmp/divin/campaign-memory-projection-pre-fix-observation.json) est explicitement distincte d’un rouge live.
