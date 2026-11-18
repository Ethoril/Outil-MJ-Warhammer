# Passation du 18/11/2026 : outil multi-jeux, lots Cthulhu

À lire en entier avant d'agir. La fenêtre précédente (compte perso) s'arrête faute d'usage hebdomadaire (96 %) ; la suite se fait sur le compte Team. Repartir de ce document, de `CLAUDE.md`, de la mémoire du projet (entrée `chantier-multi-jeux`) et du cadrage, rien d'autre. Méthode : section 3 de [PASSATION_16_11_2026.md](PASSATION_16_11_2026.md), appliquée telle quelle (fenêtre principale = orchestration, un lot = une session neuve sur brief, contrôle par sorties filtrées, une contre-vérification par chantier).

## 1. État

| Dépôt | En production | À savoir |
|---|---|---|
| Outil MJ (`E:/Outil MJ Warhammer`) | 3.53.3, `main` `68817a1` | Lots L1 (3.53.2, liaison carte neutre) et L2 (3.53.3, chapeau : registre `js/core/jeux.js`, menu « Jeu » masqué, application « Outil MJ ») publiés. `main` local a ce document en plus, non poussé : il partira avec la prochaine publication. |
| Carte (`E:/rpg-map-display`) | `main` `4a8be8f` | Publié le 18/11 : pions hexagonaux Grand, Énorme, Monstrueux sur 2, 3, 4 hexagones ; plus d'icône « monté » sur un pion fusionné ; démontage corrigé (un `move` périmé dessinait le cavalier sur sa monture). Badges en grille carrée : reportés par le MJ, ne pas proposer. |
| Fiches | inchangées | rien en attente |

Worktrees déjà fusionnés dans `main`, à nettoyer quand on veut (chercher d'abord les jonctions `node_modules`, `dir /AL`) : `.claude/worktrees/cadrage-multi-jeux-fe03b8`, `multi-jeux-l1-97e0ed`, `multi-jeux-l2-494a00` côté outil ; `E:/rpg-map-display/.claude/worktrees/taille-pions-hex-0abd70` côté carte.

Fausse alerte écartée à la recette du 18/11 : un PJ qui ne révèle pas le brouillard était, dans la rencontre de test, un profil ordinaire rangé dans le camp PJ (`kind` ≠ `PJ`, donc `visionSource: false`), pas le PJ persistant. Règle inchangée depuis la 3.53.1.

## 2. Chantier multi-jeux : où on en est

- **Décision du MJ** : un chapeau d'infrastructure commune et un module par jeu, chacun avec ses règles et son écran. Jeux : Warhammer, L'Appel de Cthulhu 7e, plus tard Imperium Maledictum et L'Ombre du Seigneur Démon.
- **Cadrage** : [docs/specs/multi-jeux/](specs/multi-jeux/spec.md) (`spec.md`, `plan.md`, `tasks.md`). Validé le 18/11 avec toutes les réponses par défaut de Q1 à Q9, avec une exception pour Q8 (voir ci-dessous).
- **Maquette d'exploration** : tag local `archive/maquette-cthulhu-18-11`. Elle contient le code dans `maquette-cthulhu/`, 51 tests dans `tests/unit/cthulhu/` et le rapport `docs/EXPLORATION_CTHULHU.md`. On lit un fichier avec `git show archive/maquette-cthulhu-18-11:<chemin>`.
- **Livres de Cthulhu 7e** (fournis par le MJ) : `Y:\Chtulhu\Ouvrages\`.
  - `USB_V7-GARDIEN.pdf` : il fait foi pour les règles.
  - `USB_V7-AV-EFFROYABLES.pdf` : les créatures.
  - `USB_V7-INVESTIGATEUR.pdf`, `USB_V7-CODEX.pdf`, `USB_V7-MALLEUS.pdf`.
  - Extraction par `pdftotext -layout`, version 4.00 de Git (mémoire `pdftotext-version-bestiaire`). Ne jamais recopier le texte d'un livre dans le dépôt.

## 3. Prochaine étape : lots C1 à C4

Les briefs sont dans `tasks.md`, avec un bloc « Règles communes » à coller en tête de chaque brief. Ordre : C1, puis C2, C3 et C4. M1 n'a pas lieu (Q5 = non, Mourant part comme Inconscient). Le jeu passe à `publie: true` au lot C3. Les quatre lots partent ensemble en une seule publication (P2), après la recette du MJ et son feu vert.

**Écart avec `tasks.md`, à mettre dans les briefs :**
- **C1 (Q8).** Les 12 règles ouvertes ne prennent plus le choix par défaut de la maquette. Le lot les tranche d'après le Manuel du Gardien, en citant la page dans le test `arbitrages.test.js`. Le défaut de la maquette ne vaut que là où le livre ne dit rien. Ces points restants sont groupés en une seule question au MJ avant de coder ces cas-là. La liste des 12 règles est dans `spec.md` §4 et dans le rapport de la maquette.
- **C2 (Q9).** La goule et le cultiste prennent leur profil réel dans `USB_V7-AV-EFFROYABLES.pdf` et le Manuel du Gardien, au lieu des valeurs de travail de la maquette. Ajouter quelques créatures classiques reste au choix du lot ; on les liste au MJ, sans les inventer.

**Points d'attention :**
- La page `cthulhu/` n'importe de `js/` que les modules communs, liste du plan §2 gardée par `tests/unit/chapeau/modules-communs.test.mjs`. La maquette chargeait 4,7 Mo de Warhammer par la liaison ; C4 passe par `js/core/map-link-protocol.js` avec sa propre projection.
- Base de sauvegarde `outil-mj-cthulhu-v1`, préfixe `cthulhu.` (registre `js/core/jeux.js`). Ne rien lire ni écrire sous `wfrp*` (CA15 à CA18).
- Garde données à chaque lot : la commande est dans les « Règles communes » de `tasks.md`.
- Recette de la carte : `node "E:/Outil MJ Warhammer/tools/serve-liaison.mjs" 8771 E:/rpg-map-display`. Le terminal du MJ est un PowerShell 5.1 : pas de `&&`, donner une seule ligne.

## 4. Consignes du MJ en vigueur pour ce chantier

- Une session neuve par lot, jamais une longue session réalimentée.
- Sonnet pour C1 à C4, comme le prévoit `tasks.md`.
- Seuil d'arrêt propre : sur le compte perso, 98 % de l'usage hebdomadaire (mémoire `arret-98-pourcent-hebdo`). Sur Team, la limite de 5 heures propre au compte (mémoire `delegation-compte-team`). La consigne d'arrêt va **dans le brief** : un message envoyé à une session en plein tour n'est lu qu'à la fin de ce tour.
- Avant de dire « publié », vérifier soi-même le résultat d'un lot : diff, tests relancés, garde données.
