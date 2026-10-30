# Lot v3-B — règles de combat

Lis d'abord `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/BRIEF_V3_COMMUN.md`. Worktree `E:/Outil MJ Warhammer/tmp/v3-b-worktree`, branche `claude/v3-b` (depuis main 877be65). Un autre sous-lot (v3-A : référentiel, données `js/data/**`, bestiaire, contrats de prières) tourne en parallèle : **ne touche pas `js/data/**`** (sauf contrats de talents de combat si indispensable : signale-le).

## Changements (ids de la page de décision, détails dans `choix-v3.html` et les analyses)

- `surpris-tir` (p.166) : +2 DR contre une cible Surprise aussi au tir (mêlée déjà +2).
- `tir-engage` (p.165, effort fort) : tirer sur un adversaire **engagé avec le tireur** se résout comme une attaque de mêlée : compétence de tir du tireur opposée à la compétence de mêlée de la cible ; ne compte pas comme un tir dans la mêlée (pas de Désavantage « tir sur cible engagée » dans ce cas). Aujourd'hui : Désavantage sauf Pistolet, défense de mêlée réservée au Pistolet (`js/core/v5-combat-rules.js` ~304, `js/core/resolution.js` ~1147-1159). Conserve la règle Pistolet si elle reste compatible avec la v3 (vérifie la p.165 et la qualité Pistolet).
- `esquive-tir` (p.165) : Esquive contre un tir permise si le tireur est à moins de Bonus d'Initiative mètres, ou à toute portée avec un bouclier de 2 PA ou plus. L'outil demande déjà la confirmation du MJ : mets à jour l'aide affichée et la logique de confirmation.
- `bout-portant` (p.302) : une arme dont la portée courte vaut 4 m ou moins n'a pas de bout portant (`js/core/v5-talent-combat.js` ~41, aide « Point Blank = 4 »). Portée courte = portée imprimée / 2 (vérifie la p.302) ; armes de jet à BF × 2 avec BF faible incluses.
- `repetition` (p.305, effort moyen) : une arme À répétition permet de tirer deux fois sur la même cible avec −1 DR, en une seule Action (deux tirs consommés). Branche-le dans la résolution du tir et `js/core/v5-reloading.js`.
- `peur-elan` (p.183) : sous la Peur, on **perd** son Élan et on ne peut pas en regagner (aujourd'hui `cannotGainMomentum` ne joue que sans Élan, `v5-combat-rules.js` ~30 ; `v5-momentum.js` LOSS_REASONS).
- `psycho-debut` (p.183) : vérifie que les Tests de psychologie se font au début du Tour, avant Mouvement et Action ; corrige ou ajoute le rappel si non.
- `riposte` (p.124) : une fois par Round.
- `ambidextre` (p.119) : l'attaque de la seconde arme ne demande pas de dépenser d'Élan mais exige d'en avoir (`previewMomentumCost`, `js/core/v5-momentum.js` ~48).
- `esquive-melee` (p.164) : vérifie qu'une Esquive en mêlée ne donne pas d'Élan ni ne compte comme victoire de mêlée (déjà conforme d'après l'analyse) ; maladresse = −5 DR, critique = +5 DR pour l'Esquive en mêlée : vérifie et corrige.
- `maladresse-oppose` (p.165) : l'encadré « une maladresse peut gagner un Test opposé » est supprimé en v3. Vérifie le comportement actuel ; la règle générale V5 (p.130-131, maladresse et Test opposé) s'applique : lis-la et aligne-toi dessus, sans inventer.
- `souille` (p.185) : Désavantage aux Tests d'Endurance contre les Plaies purulentes ; il n'y a pas de Test de Plaies purulentes dans l'outil : ajoute le Désavantage si un Test d'Endurance est explicitement marqué « Plaies purulentes », sinon un rappel sur l'état Souillé.
- `perturbant` (p.358) : le Trait Perturbant touche les **ennemis** vivants (pas les alliés) (`js/core/creature-senses.js` ~14).
- `taille` (p.360) : bonus de dégâts de Taille : Énorme +2×BF, Monstrueuse +3×BF (`js/core/creature-size.js` ~24-27, ~75). Les profils imprimés incluent déjà ce bonus : vérifie qu'aucun double comptage n'apparaît.
- `ombrageux` (p.361) : Ombrageux pose +1 Brisé au lieu de +3 (`js/core/creature-psychology.js` ~26, ~167).
- `allonge` (p.318) : armes naturelles, allonge Personnelle de Petite à Grande, Courte pour Énorme, Moyenne pour Monstrueuse (aide affichée seulement).

Ajoute à un parcours navigateur existant (ou crée `tests/v3-b-combat-browser.mjs`) au moins : tir sur un adversaire engagé avec le tireur, tir double À répétition, Peur qui retire l'Élan.
