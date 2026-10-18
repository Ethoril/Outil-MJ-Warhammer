# Cadrage resserré — prières, bénédictions et miracles du livre de base V5

18 octobre 2026. Remplace, pour la livraison, le périmètre exhaustif de [DIVIN_PLAN_EXHAUSTIF.md](DIVIN_PLAN_EXHAUSTIF.md), qui reste en réserve. Base : production `origin/main` e2a7708 (3.15.0, talents et magie). Aucune publication sans feu vert.

## Objectif

Le même résultat que pour la magie : chaque miracle et chaque bénédiction du livre de base V5 est sélectionnable dans l'outil, avec un contrat sourcé, un aperçu, une application annulable, des effets à durée, un reçu et un statut (conforme / donnée MJ nécessaire / rappel).

## État réel (vérifié dans le code du worktree divin-v5)

| | Attendu (livre V5) | Avec contrat | Sans contrat |
| --- | ---: | ---: | ---: |
| Cultes | 10 | 1 (Myrmidia) | 9 |
| Miracles de base | 60 (6 par culte, p.222–229) | 6 | 54 |
| Effets de bénédiction | 19 | 6 | 13 |
| Associations culte/bénédiction | 60 | 6 | 54 |

- Les 6 miracles Myrmidia : 2 calculables (Bouclier, Soleil flamboyant), 4 assistés. Bénédictions : 2 calculables (Bataille, Courage), 4 assistées.
- 9 miracles V4 d'Up in Arms (Myrmidia) bloqués : hors livre de base, à reporter.
- Les 54 miracles des 9 autres cultes n'existent sous aucune forme de données exploitable : l'extraction depuis le PDF est le premier travail.
- Cultes sans contrat : Manann, Morr, Ranald, Rhya, Shallya, Sigmar, Taal, Ulric, Verena.

## Dans le périmètre

1. Extraction et audit des 60 miracles et des 19 bénédictions (p.222–229 et sections de cultes), avec empreinte source par entrée, comme pour les 277 sorts.
2. Contrats générés (`tools/build-v5-divine-contracts.mjs`, à étendre) pour les 60 miracles, les 19 effets et les 60 associations.
3. Sélecteur de prière filtré par culte dans `js/ui/v5-divine-panel.js`.
4. Réutilisation du moteur magie : aperçu/application/Undo, effets communs, durées en couches, journal, reçus.
5. Haine sacrée raccordée aux dégâts (seul cas source autorisé).
6. Tests Store par miracle (un test par entrée citant la page), recette Edge et cloud local, paquet hors ligne.
7. Delta de catalogue à reporter dans la feuille (onglet Miracles) par le MJ.

## En réserve (pas dans cette livraison)

- Courroux complet (table de 31 lignes) et état Brisé : fuite engagée, Sprinter, arbitrage mid-Tour. À extraire du flux « Appliquer », qui passe aujourd'hui par le Courroux.
- Horloge de campagne et semaines impériales, dérogations d'accès durables.
- Les 9 miracles V4 Up in Arms et les 16 autres livres, créatures/PNJ, autres traditions (elfes, nains, Chaos, vampires).
- Maladies, mort et conséquences hors combat.
- Audit exhaustif des 2694 pages.

## Étapes proposées (calquées sur la magie)

| Étape | Contenu | Poids relatif |
| --- | --- | --- |
| P0 | Rebaser `codex/divin-v5` sur e2a7708 ; commiter l'existant ; isoler le chemin « Appliquer » du Courroux | Léger |
| P1 | Extraction PDF des 54 miracles + audit (fiche de tri, empreintes) ; arbitrages MJ présentés en sélecteurs | Moyen, dépend de la lecture du PDF |
| P2 | Contrats des 19 bénédictions et 60 associations | Moyen |
| P3 | Contrats des 60 miracles, par lots de cultes (2 à 3 cultes par lot) avec contrôle indépendant | Le plus lourd |
| P4 | UI : filtre par culte, rappels, Haine sacrée | Léger |
| P5 | Recette, générateur déterministe, version 3.16.0, paquet | Moyen |

## Décisions du MJ (18 octobre)

1. **Références :** livre de base V5/FR (10 cultes, 19 bénédictions, 60 miracles, Prière, Péché, Colère des Dieux) ; Archives of the Empire 3 (Solkan, Handrich, Rhya étendu, Foi Antique) ; Deft Steps, Light Fingers (4 aspects de Ranald) ; Up in Arms (Myrmidia, les 9 miracles V4) ; Power Behind the Throne Companion (Ulric : Morsure du Loup, Hurlement de Bataille, Écraser les Faibles, Engourdissement, Cœur du Loup) ; Lustria (Mathlann, sanctuaires). À vérifier : ces listes viennent d'un assistant externe avec renvois non contrôlés ; le Power Behind the Throne Companion n'est pas dans le manifeste des 17 livres.
2. **Prière ratée :** un simple échec n'a aucune conséquence. La Colère des Dieux se déclenche sur une Maladresse (double raté) ou si l'unité du d100 est ≤ aux Points de Péché, même en cas de réussite. d100 + 10 par Péché, puis Péché −1. Conséquence pour le périmètre : la table de Colère (31 lignes, déjà codée) **entre dans le lot** ; seuls Brisé détaillé (fuite engagée, Sprinter, mid-Tour) et le suivi calendaire restent en réserve, avec un rappel MJ pour les effets non automatisés.
3. **PDF :** tous les livres sont disponibles localement.

## Effet sur le plan

- Le lot se découpe en deux vagues : **vague A = livre de base (10 cultes, 60 miracles, 19 bénédictions, Colère)** ; **vague B = suppléments ci-dessus** (Archives 3, Deft Steps, Up in Arms, PBTT, Lustria), chacun avec ses cultes/miracles supplémentaires, après la vague A.
- P0 inclut de **ne pas** isoler le Courroux du flux « Appliquer » : au contraire, le garder, et ne mettre en réserve que ses branches Brisé avancées.
- P1 commence par l'inventaire exact des miracles de chaque supplément (le nombre n'est pas connu).

## Points à trancher par le MJ avant P1 (réglés ci-dessus)

1. Les 6 miracles par culte du PDF V5 sont-ils bien la référence, ou le catalogue public Google Sheet (15 entrées Myrmidia seulement) doit-il d'abord être complété ?
2. Faut-il un équivalent des incidents de magie pour une prière ratée, ou un simple rappel MJ (Courroux en réserve) ?
3. Le PDF « Livre de base V5 EN v2 » est-il toujours à `E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\` ?

## Incohérence à connaître

Les bilans magie divergent : 165 conformes / 49 données MJ / 63 rappels (finalisation, clôture) contre 147 / 49 / 81 (suivi, matrice). À trancher avant de s'en servir comme référence de qualité.
