# Passation du 17/11/2026

À lire en entier avant d'agir : c'est court exprès. La fenêtre précédente était pleine ; celle-ci repart de ce document, de `CLAUDE.md` et de la mémoire du projet, et de rien d'autre. La méthode de travail est celle de la section 3 de [PASSATION_16_11_2026.md](PASSATION_16_11_2026.md), à relire (cette section seulement) et à appliquer telle quelle.

## 1. État

| Dépôt | En production | Branches locales | À savoir |
|---|---|---|---|
| Outil MJ (`E:/Outil MJ Warhammer`) | 3.50.0, `main` `1e835a4` | `main`, plus `poursuite-v5` et `image-pion-pj` (déjà fusionnées, gardées) | `main` local a deux commits d'avance, non poussés : `c4bb98e` (passation du 16/11 mise à jour) et `c3f615f` (spec des Traits optionnels), plus ce document. Ils partiront avec la prochaine publication. |
| Carte (`E:/rpg-map-display`) | `main` `e73afdc` | `main`, plus `image-pion-pj` (fusionnée) | rien en attente |
| Fiches (`E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4`) | `master` `aa50765` (v2.42.0, publiée par une autre session) | `master`, `pro/suivi-de-cour`, `claude/donnees-communes` | aucun commit local d'avance ; les deux autres branches appartiennent à d'autres sessions |

Publié le 17/11 en 3.50.0 : poursuite selon le Livre de base V5 (p. 158-159) et image du pion des PJ envoyée à la carte. Détail et restes connus dans `docs/SUIVI_EVOLUTION.md`, entrée 3.50.0.

**Table d10 des Obstacles de la poursuite : validée par le MJ le 17/11, sans correction.** **Attend le MJ, sans action de notre part :** éprouver à la table les images des pions et la carte « Monture » du bureau des fiches.

## 2. Chantier des Traits optionnels : publié en 3.51.0 le 17/11/2026 (`main` 7d71ac5)

Détail, restes connus et preuves : `docs/SUIVI_EVOLUTION.md`, entrée 3.51.0. Décisions D1 à D26 dans la spec. Branche locale `traits-optionnels` fusionnée, gardée. Compte Team autorisé par le MJ jusqu'à nouvel ordre pour les lots (mémoire `delegation-compte-team`). Suite prévue : le tri de l'inventaire par Claude (section 3). Ce qui suit est l'historique du cadrage.

**Où on en est.** Cadré (étape 1 du skill `cadrer-feature`), rien de codé. À lire, dans cet ordre :
- [docs/specs/traits-optionnels/spec.md](specs/traits-optionnels/spec.md) : décisions D1 à D8 du MJ (17/11), choix D9 à D15 de Claude, CA1 à CA25, hors périmètre.
- [docs/specs/traits-optionnels/inventaire.md](specs/traits-optionnels/inventaire.md) : les 124 noms de Traits du bestiaire (calculé, rappel ou rien ; calculable ou non, avec preuve par fonction), ce que disent L13 et L23, et quatre faits de cadrage (`includeOptional`, `buildMountProfile`, champ `monture` des fiches, précédent `previewBeastForm`). Ne pas refaire cet inventaire. Scripts qui l'ont produit : `tmp/reprise-team/traits-inventaire/` (non versionné).

**En une phrase.** Sur tout profil du bestiaire en Réserve, un panneau « Traits optionnels » coche les Traits optionnels de la fiche, ajoute librement un Trait du catalogue, coche les attaques et armures optionnelles ; les Traits cochés sont lus par les modules existants comme des Traits de base ; neuf Traits modifient le profil (Big, Brute, Clever, Cunning, Elite, Fast, Leader, Tough, Hardy) ; Dressé se coche dressage par dressage ; tout Trait coché s'affiche au moins en rappel.

**Prochaine étape, dans l'ordre.**
1. Le MJ n'a pas encore répondu à « la spec vous convient-elle pour passer au plan ? ». Commencer par lui poser cette question, en lui rappelant les deux choix de Claude qui pèsent le plus : **D10** (un Trait à modificateurs imprimé parmi les Traits de base est réputé déjà compté dans le profil imprimé, non vérifié dans les livres) et **D11** (une Taille cochée remplace celle du profil et recalcule les Blessures). Intégrer ses retouches dans la spec avant tout plan.
2. **D13 avant le plan** : relire dans les livres les valeurs des neuf Traits à modificateurs et de Dressé (Guerre), puis faire relire la table au MJ. Indication : la section « Creature Traits » du Livre de base commence p. 356 ; l'inventaire cite L11 pp. 135-137 pour Clever, Elite, Hardy, Rear, Tough (source : `docs/BESTIAIRE_INVENTAIRE.md`, pas le PDF). Vérifier au passage D10 (le Livre de base dit, dans « Customising Creatures », que les Traits optionnels sont des variantes et que tout Trait peut aller à toute créature ; il ne dit pas en clair si les Traits de base sont déjà comptés dans le profil). Le texte extrait du Livre de base se refait par `pdftotext -layout` ; ne jamais recopier le texte d'un livre dans le dépôt.
3. Plan (`plan.md`) puis tâches (`tasks.md`) par un agent sur brief, comme pour la poursuite (`tmp/reprise-team/poursuite-plan/prompt.md` sert de modèle).
4. Lots un par un, contre-vérification unique à la fin, lot de corrections, puis publication sur feu vert.

**Points techniques déjà repérés, utiles au plan.**
- `buildParticipantFromBestiary` (`js/core/bestiary-profiles.js`) ne met que `traits` sur le participant ; les optionnels restent en texte dans `extensions.v5.bestiary.optionalTraits`. `includeOptional` (attaques, armures) existe mais n'a ni écran ni stockage.
- Les modules `js/core/creature-*.js` lisent `traits` du participant : un Trait coché y entre sans autre branchement s'il est déjà couvert.
- `creatureWounds` accepte déjà un paramètre `hardy` ; `isMountCandidate` (`js/core/mounts.js`) lit `optionalTraits` pour proposer une monture ; `buildMountProfile` recopie le profil sans lire les optionnels.
- Profils sauvegardés avant le chantier : aucune coche, comportement inchangé (CA6). Tout nouveau module de `js/` va au précache de `sw.js` ; tout nouveau parcours navigateur dans `tests/parcours.json`. Le golden master du Store (`tests/fixtures/store-golden.json`) bouge si l'API du Store gagne des clés.
- Incohérences signalées par l'inventaire, à traiter ou à noter : Disruption et Creature Weapons sont déclarés « couverts » dans `js/data/creature-abilities.js` sans qu'aucun code ne les lise.

## 3. Ce qui reste ensuite

- **Miracles narratifs** : `docs/specs/miracles-narratifs/spec.md` (69 prières en rappel, lots L0 à L9). Avant le plan : inventorier et classer les 88 clauses résiduelles des 60 miracles « assistés ».
- **Second chantier des Traits** : nouveaux calculs. Tri fait le 17/11, quatre doutes tranchés par le MJ : [specs/traits-calculs/tri.md](specs/traits-calculs/tri.md). Suite : relecture des règles dans les livres (section 5 du tri), puis spec, plan, tâches.
- **Restes de la 3.50.0** (dans `docs/SUIVI_EVOLUTION.md`) : `docs/AUDIT_REGLES.md` non régénéré ; synchronisation en ligne d'une poursuite non éprouvée ; Vol dans le Mouvement de poursuite sans test. Ne les traiter que si le MJ le demande.
- Ne rien reproposer de ce qui est « classé » dans la mémoire `classement-restes-15-11`.

## 4. Leçons de la fenêtre du 16-17/11

- Le socle navigateur (`node tools/run-browser-journeys.mjs --socle`) a trouvé à la publication un défaut qu'aucun test ciblé n'avait vu : un nouvel appel au Store dans un écran partagé casse les parcours dont le Store est simplifié. Dans le brief de chaque lot qui touche `js/ui/workspace-view.js`, exiger un appel tolérant (`Store.methode?.()`) et le lancement du socle dans le « fini quand ».
- Un agent ne doit pas modifier un fichier hors de sa liste autorisée ; quand un parcours existant casse à cause d'une décision nouvelle, c'est à l'orchestrateur de faire la petite retouche (cas de `tests/accessibilite-browser.mjs`).
- Deux agents coupés par la limite d'usage ont été repris par `SendMessage` sans perte : leur travail non commité restait dans l'arbre.
- Certains agents ont mis une autre attribution que celle demandée dans leurs commits : rappeler la ligne `Co-Authored-By` exacte dans chaque brief et la vérifier avant la fusion.

## 5. Pour reprendre

Message à donner à la nouvelle fenêtre : « Lis `docs/PASSATION_17_11_2026.md` et applique sa méthode. Reprends le chantier des Traits optionnels : demande-moi d'abord si la spec me convient. »
