# Q6 · Spec : les Tests secondaires passent par l'agrégateur

Cadrage du 08/11/2026, sans code. Point de départ : constat REGLES-01 de `docs/RAPPORT_ANALYSE_08_11_2026.md` (§5 point 1) et décisions du MJ Q6 et Q19 (`docs/PLAN_CHANTIERS_PARALLELES_05_11.md`, lignes 100 et 112). Inventaire appel par appel : `inventaire.md`.

## Pourquoi

Le MJ a décidé les 05 et 06/11 que tous les Tests, et pas seulement le Test principal d'une action, passent par l'agrégateur (Q6), et que les États comptent de la même façon pour tous les Tests, en un seul calcul : celui du combat (Q19). Ce n'est pas encore le cas. Le Test principal (attaque, défense, Test de compétence du panneau) applique les États, les talents et les sorts ou prières actifs, mais une partie des Tests déclenchés à côté (désengagement, Test secondaire de sort, Dissipation, séquelles, incidents…) les ignore. Un personnage À terre, Sonné ou sous « Dur comme le roc » fait alors ces Tests comme s'il était en pleine forme, et le MJ doit corriger à la main sans que l'outil le lui signale.

## Ce que le MJ doit constater

### S1 · Un Test secondaire voit les mêmes modificateurs qu'un Test principal
- **CA1** Étant donné un personnage avec des États, un talent et un sort ou une prière actifs qui touchent une compétence, quand il fait un Test secondaire de cette compétence (une famille de `inventaire.md` à la fois), alors les modificateurs appliqués sont exactement ceux qu'appliquerait le Test principal pour le même personnage, la même compétence et la même situation : même pénalité d'États, mêmes Avantages et Désavantages, même talent, même cumul de sorts et de prières (Q1 à Q19). Un test par famille compare les deux calculs.
- **CA2** Les exceptions d'États (Endurance de l'anachorète, Revigorer, Clarté d'esprit, talents qui ôtent une pénalité) jouent aussi pour les Tests secondaires (Q19).
- **CA3** Un Test secondaire opposé applique l'agrégateur des deux côtés.
- **CA4** Les modificateurs que le MJ saisit déjà pour ces Tests (situation, saisie libre, surnombre, Élan) continuent de s'appliquer et se somment au reste (Q12).

### S2 · Le MJ voit d'où vient chaque modificateur
- **CA5** Le détail d'un Test secondaire affiche chaque modificateur avec sa source et son montant, comme celui d'un Test principal. Un modificateur écarté par une règle de cumul reste visible et barré (Q9).

### S3 · Les dispenses viennent du livre, pas du code
- **CA6** Un Test que le livre dispense expressément d'un modificateur (par exemple un jet de table qui n'est pas un Test) le reste, et la dispense cite sa page dans le code et dans `inventaire.md`. Aucune dispense sans page ni arbitrage du MJ.
- **CA7** Chaque lot relit les pages du livre des Tests qu'il branche. Une dispense trouvée en chemin est posée au MJ avant d'être codée (Q6 : « sauf règle contraire du livre repérée lot par lot »), jamais décidée par l'exécutant.

### S4 · Quand l'agrégateur a besoin d'une précision
- **CA8** Un Test secondaire pour lequel un État exige une précision (par exemple « le Test implique-t-il un mouvement ? » pour À terre) attend la réponse du MJ avant d'être résolu, comme le Test principal aujourd'hui, y compris quand l'outil lance ce Test de lui-même (séquelle, incident) (MJ, 08/11).

### S4 bis · Tests dont le MJ saisit le score
- **CA12** Pour le recul de l'arquebuse à salve, la Warp Blade et les séquelles de convalescence, le MJ saisit le score de fiche nu, et l'outil y ajoute États, talents, sorts et prières, visibles dans le détail. Le libellé du champ dit « score de fiche, sans modificateurs » (MJ, 08/11).

### S5 · Rien ne régresse
- **CA9** Un Test secondaire fait par un personnage sans État, sans talent ni effet actif donne le même résultat qu'avant le chantier.
- **CA10** Les tests unitaires existants des familles touchées restent verts. Seules changent les valeurs attendues des cas où un État, un talent ou un effet était ignoré à tort, et chaque changement est justifié dans le commit.
- **CA11** Une partie sauvegardée avant le chantier se recharge sans erreur ni migration.

### S6 · Décisions du MJ du 09/11 (questions remontées par T0, T1, T2, T6)
- **CA13** Les séquelles durables pèsent sur tout Test, principal ou secondaire, dont elles visent la caractéristique ou la compétence.
- **CA14** Un acteur Inconscient ne fait aucun Test secondaire. Un acteur Surpris ne peut pas faire, pendant ce Round, un Test qui demande d'agir (désengagement, pause ou interruption de Focalisation…). L'outil bloque le Test et dit pourquoi.
- **CA15** Le désengagement compte toujours comme un mouvement : À terre et Enchevêtré s'appliquent sans question.
- **CA16** Les effets « … adverse » posés sur le désengagé ne jouent pas contre l'adversaire qui résiste, comme pour un défenseur au combat.
- **CA17** La pause de Focalisation est un Test mental pour Clarté d'esprit (p. 251).
- **CA18** Obstiné annule aussi les malus propres à un Test (Courroux sur la Prière, Relique négative, difficulté de la Résistance au Courroux, −1 DR de l'infection…), en lecture littérale, comme au combat.
- **CA19** Déterminé applique les exceptions d'États (Endurance de l'anachorète, Clarté d'esprit…).
- **CA20** L'État que Déterminé cherche à éviter ne compte pas dans son propre Test de Calme.
- **CA21** (MJ 09/11, précise CA14) CA14 vise les Tests où l'on agit. Les Tests subis (résister à la Warp Blade, Résistance de convalescence, Résistance au Courroux, toute résistance passive du même genre) restent faits normalement par un Inconscient, avec les malus d'États. L'appelant distingue les deux par un drapeau (`passive`).
- **CA22** (MJ 09/11, précise CA13) Les séquelles à circonstance (zone utilisée, parole, deux mains, ouïe, odorat, cicatrice appropriée…) ne sont pas ignorées sur un Test secondaire : comme pour les États, le Test pose la question au MJ (`needsInput`) et reste non résolu tant qu'elle n'a pas de réponse ; la réponse décide si la séquelle s'applique.
- **CA23** (MJ 09/11) En fin de Tour d'un sort, un Test actif d'un lanceur Inconscient (guidage de la Comète…) est raté d'office, avec le motif « Inconscient », sans bloquer le reste de la fin de Tour. Les résistances des cibles restent des Tests subis (CA21).
- **CA24** (MJ 09/11) Une cible Surprise ne peut pas esquiver le Souffle, comme un défenseur Surpris au combat : le Souffle la touche sans opposition.
- **CA25** (MJ 09/11) Un lanceur Aveuglé ne peut pas faire le Test de CT du Souffle (même règle qu'un tir au combat).
- **CA26** (MJ 09/11 soir) Le Sonné qui déclenche un Test de Chevaucher compte dans ce Test (−1 DR, V5 p. 186), au combat comme hors combat (États acquis, sort).
- **CA27** (MJ 09/11 soir) Un « Test d'Endurance » est un Test de la compétence Résistance (avances comprises), pas de la caractéristique E brute : chute après Croche-pied monté, Corruption de Tzeentch. Sans la compétence, la caractéristique E.
- **CA28** (MJ 09/11 soir) Une source de Filet Inconsciente lâche prise : l'échappée est réussie d'office, sans Test opposé de la source.
- **CA29** (MJ 09/11 soir) Au lancer, à la Focalisation (pause et interruption comprises) et à la Dissipation, une question de séquelle sans réponse empêche le jet, comme partout (CA22). Les questions d'États gardent leur règle propre à la magie (sans réponse, l'État ne pèse pas).
- Alignement (MJ 09/11) : dans les oppositions des sorts au fil des tours, la cible qui résiste prend le rôle de défenseur, comme dans les contrats de sorts et le désengagement (CA16) : les effets « … adverse » ne jouent que dans un sens.
- **CA30** (MJ 09/11 soir) Le Test de Corruption est un Test subi (V5 p. 187-188) : un Inconscient le fait.
- **CA31** Extraire un projectile reste permis à un acteur Surpris : Surpris ne vaut que pendant le Round de combat.
- **CA32** Un poursuivant Brisé ne fuit pas : les malus de Brisé s'appliquent à son Test de poursuite, sans question.
- **CA33** Une source de Filet Inconsciente lâche prise : tous les niveaux d'Empêtré tombent, et le Filet à crochets ne fait pas de dégâts.
- **CA34** Une cible Inconsciente du Souffle est traitée comme une cible Surprise : elle n'esquive pas.

## Hors périmètre

- Le Test principal et l'agrégateur lui-même : on les réutilise tels quels, sans changer leurs règles de cumul.
- Les jets qui ne sont pas des Tests (tables d'incidents, de séquelles, de localisation), sauf le Test qui les déclenche.
- Les neuf questions de la phase R restées sans réponse (close le 07/11), dont « Exténué à la pause de Focalisation ».
- Le découpage des monolithes et le cycle d'imports (ARCH-01 à 03), sauf ce qu'exige un branchement.
- Les suppléments à venir.

Les Tests de sorts au fil des tours et des contrats (~30 appels, dont Calme contre la mort) sont **dans** le périmètre, en dernier lot (MJ, 08/11).
