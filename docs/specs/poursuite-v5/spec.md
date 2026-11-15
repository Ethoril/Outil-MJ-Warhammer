# Spec · Poursuite selon le Livre de base V5

Cadrage du 16/11/2026, sur `07d74b8` (prod 3.48.1). Matière : rapport du premier cadrage (`tmp/reprise-pro/cadrage-poursuite-rapport.md`, non versionné) et décisions du MJ du 15/11/2026.

**Pourquoi.** `resolveV5PursuitStep` (`js/core/v5-broken-escape.js`) n'est appelée par aucun écran et applique une échelle de distance de 1 à 10 qui n'est pas la règle du Livre de base V5 p. 158-159. Le MJ veut une poursuite jouable à la table, conforme au livre, depuis le combat comme depuis une scène hors combat. S'y joint la fuite d'un Brisé engagé, aujourd'hui sans attaque gratuite réelle.

## Décisions du MJ (15/11/2026)

| # | Sujet | Décision |
|---|---|---|
| D1 | Règle | Livre de base V5 p. 158-159. Test opposé du poursuivant le plus rapide contre le fuyard le plus lent. Fin immédiate à **6 DR d'écart** ou **Mouvement double**. Sinon facteurs favorables (0 à 3) et Obstacles (table d10). L'échelle de distance 1 à 10 actuelle est remplacée. |
| D2 | Points d'entrée | Deux : le panneau du Brisé (fuyard encore visible) et l'écran Jouer (poursuite de scène hors combat). |
| D3 | Obstacles | L'outil tire le d10 et propose un obstacle résumé avec ses compétences possibles. Le MJ peut le remplacer par un obstacle de son cru. |
| D4 | Tests d'Obstacle | Pour chaque personnage, le MJ choisit la compétence et saisit le jet. L'outil applique États, talents et modificateurs comme aux autres Tests, compte les réussites, signale une Réussite stupéfiante (+5 DR) qui donne l'Avantage à un autre. |
| D5 | Poursuite en combat | Elle se joue **dans les Tours**. Le Test de poursuite et chaque Test d'Obstacle prennent l'Action du Tour du personnage ; la poursuite s'étale sur les Rounds. (Option « hors des Tours, d'un bloc » écartée.) |
| D6 | Fin de poursuite | Une ligne au journal, plus un bouton selon l'issue, que le MJ clique ou non : fuyard rattrapé → l'engager avec ses poursuivants au plateau ; fuyard échappé → le retirer de la rencontre. |
| D7 | Attaque gratuite à la fuite | Dans le panneau du Brisé, chaque adversaire engagé a un bouton « Jouer l'attaque gratuite » qui ouvre son attaque **sans lui coûter son Action**, et une case « a dépensé son Élan » (`freeAttackSpentMomentumIds`, déjà lu par le moteur). La confirmation « Attaques gratuites résolues » se coche seule quand toutes sont jouées ou passées. |
| D8 | Hors combat | Une simple modale (participants et leur Mouvement, Test opposé, facteurs favorables, Obstacles et leurs Tests, issue), résolue d'un bloc. Pas d'écran dédié, pas de suivi par Rounds, pas d'Action. |

## Écarts avec le rapport du premier cadrage

- Le rapport proposait un bloc minimal avec distance 1-10 (R1 option a, I4, CA8) : **écarté par D1**. Plus de « distance de départ » saisie ni d'issue `ongoing/caught/escaped` fondée sur elle.
- R4 (« le Test coûte-t-il l'Action ? ») est tranchée par D5 pour le combat, D8 pour le hors combat.
- I1 (où lancer) : tranchée par D2, les deux endroits. I3 (rattrapé) : tranchée par D6, le bouton.
- I2 (un ou plusieurs poursuivants) : la règle compare le plus rapide des poursuivants au plus lent des fuyards, donc **plusieurs participants** sont possibles ; voir Q3.
- Le rapport signale un seuil possiblement ramené de 6 à 5 DR dans la v3 du livre (`docs/archives/v5-diff-v2-v3/ANALYSE_P001-200.md:33`). **Le MJ a dit 6 DR : 6 retenu**, valeur à garder en constante nommée et sourcée.
- Le rapport signale un **risque de double comptage** : les contrats de talents Fuite ! et Impitoyable (`js/data/v5-additional-talent-contracts.json`) donnent +1 DR si `pursuitRole` est transmis, alors que le moteur actuel compte ces bonus à la main. Le remplacement doit n'en compter qu'un des deux (CA11).

## Périmètre

**Dans le chantier**
1. Moteur de poursuite V5 (remplace `resolveV5PursuitStep`), pur, avec champ `source` (« Livre de base V5, p. 158-159 »).
2. Table des Obstacles (d10) en donnée, tirage, remplacement par un obstacle libre.
3. Tests d'Obstacle calculés (compétence choisie, jet saisi, réussites, Réussite stupéfiante).
4. Assistant en combat (dans les Tours, sur les Rounds), lancé depuis le panneau du Brisé.
5. Modale hors combat depuis l'écran Jouer.
6. Boutons de fin de poursuite (engager / retirer) et ligne au journal.
7. Attaque gratuite réelle à la fuite d'un Brisé engagé, Élan dépensé par adversaire.
8. Tests unitaires et un parcours navigateur.

**Hors périmètre**
- Distance en cases ou en mètres sur la carte (aucun lien avec `map.distance`) : la règle ne mesure pas la poursuite en distance.
- Poursuite à plusieurs équipes de fuyards hors cas du plus lent / plus rapide de la règle.
- Règles de poursuite de suppléments (Up in Arms, etc.).
- Refonte du reste du panneau Brisé (Flee, Sprint, Hide) hors ce qui est nécessaire à D7.
- Version et publication : après feu vert du MJ, selon `CLAUDE.md`.

## Critères d'acceptation

### A. Règle (moteur)
- **CA1.** Le Test opposé met le poursuivant au Mouvement le plus élevé contre le fuyard au Mouvement le plus faible ; le choix est déterminé par le moteur à partir des Mouvements, le MJ peut le corriger.
- **CA2.** La poursuite prend fin immédiatement quand l'écart de DR atteint 6 en faveur d'un camp (poursuivant : rattrapé ; fuyard : échappé). Test unitaire aux bornes 5 et 6.
- **CA3.** Elle prend fin d'office quand un camp a un Mouvement au moins double de l'autre, avec le motif affiché. Test unitaire aux bornes (double juste, un point de moins).
- **CA4.** Sinon, le MJ renseigne les facteurs favorables (0 à 3) ; une valeur hors 0-3 est refusée.
- **CA5.** Le résultat porte `source` et n'écrit rien (fonction pure) ; l'aperçu n'altère pas la révision locale.
- **CA6.** Les Tests passent par le calcul commun des Tests secondaires : États (Brisé, Aveuglé, À terre, etc.), talents, séquelles, Obstiné consommé seulement à l'application et rendu par ↶.
- **CA7.** Un acteur Inconscient ou Surpris est bloqué avec son motif ; un poursuivant Brisé ne fuit pas et subit le malus de Brisé sans question (CA32 des tests secondaires).

### B. Obstacles
- **CA8.** Le tirage d10 propose l'obstacle de la table avec un résumé et la liste des compétences possibles. Le tirage est reproductible dans les tests (d10 injecté).
- **CA9.** Le MJ peut remplacer l'obstacle par un obstacle libre (intitulé, compétences admises) ; le remplacement est tracé au journal.
- **CA10.** Pour chaque personnage, le MJ choisit la compétence parmi celles proposées et saisit le jet ; l'aperçu montre score, jet, modificateurs, réussites. Une Réussite stupéfiante (+5 DR) est signalée avec « Avantage à un autre » à désigner.
- **CA11.** Un talent qui joue sur la poursuite (Fuite !, Impitoyable, Acharné, Grandes enjambées) est compté **une seule fois** ; test de non double comptage.

### C. Poursuite en combat
- **CA12.** Le lancement depuis le panneau du Brisé n'est proposé que si le fuyard reste visible d'au moins un ennemi ; absent sinon.
- **CA13.** Le Test de poursuite d'un personnage consomme l'Action de son Tour ; chaque Test d'Obstacle aussi. Un personnage qui a déjà utilisé son Action ne peut pas jouer un Test de ce Tour.
- **CA14.** L'état de la poursuite (participants, facteurs, obstacle courant, Tests faits, issue) est conservé entre Rounds et survit au rechargement de la page.
- **CA15.** Chaque application est une seule entrée d'historique ; ↶ rend l'état et l'Action d'avant, ↷ réapplique ; un aperçu périmé est refusé (« recalculez »).
- **CA16.** Chaque étape écrit une ligne au journal.

### D. Fin de poursuite
- **CA17.** À la fin, une ligne au journal donne l'issue et son motif (6 DR, Mouvement double, abandon du MJ).
- **CA18.** Fuyard rattrapé : un bouton « Engager au plateau » engage le fuyard avec ses poursuivants. Fuyard échappé : un bouton « Retirer de la rencontre ». Ne pas cliquer ne change rien aux données.

### E. Hors combat
- **CA19.** Depuis l'écran Jouer, une modale reprend participants et Mouvements, Test opposé, facteurs favorables, Obstacles et leurs Tests, issue, et se résout d'un bloc, sans Action consommée ni Rounds.
- **CA20.** Fermer la modale sans valider n'écrit rien. Valider fait une entrée d'historique et une ligne de journal ; les boutons de fin (CA18) s'appliquent si la rencontre existe.

### F. Fuite d'un Brisé engagé
- **CA21.** Dans le panneau du Brisé, chaque adversaire engagé a un bouton « Jouer l'attaque gratuite » qui ouvre son attaque sans consommer son Action (test : Action de l'adversaire inchangée).
- **CA22.** Une case « a dépensé son Élan » par adversaire alimente `freeAttackSpentMomentumIds` ; le moteur reçoit la liste.
- **CA23.** « Attaques gratuites résolues » se coche seule quand tous les adversaires engagés ont joué ou passé leur attaque ; le MJ peut la décocher. La fuite engagée aboutit alors (reprend le parcours du commit a5ebc57).

### G. Tests et non-régression
- **CA24.** Tests unitaires dans `tests/unit/` : moteur (CA1-CA11), commandes du Store (CA13-CA16), attaque gratuite (CA21-CA23). Les anciens tests de `resolveV5PursuitStep` sont réécrits ou retirés avec justification (échelle 1-10 disparue).
- **CA25.** Un parcours navigateur sous `timeout 120` : combat, Brisé engagé fuit avec attaques gratuites, poursuite sur deux Rounds avec un obstacle, fin et bouton ; plus un parcours de la modale hors combat. Les parcours existants du Brisé et des engagements restent verts.

## Questions ouvertes

Aucune n'est tranchée ici.

**Q1. Texte exact du livre (p. 158-159).** La table d10 des Obstacles, le calcul du « Mouvement double » (Mouvement de base ou après modificateurs ?) et le plafond des facteurs favorables ne sont pas dans la matière fournie ni dans le rapport. *Options :* (a) le MJ fournit le texte ou la table ; (b) Claude relit le PDF du corpus avant le plan. *Recommandé : b*, puis le MJ relit la table saisie.

**Q2. Ordre des Tests quand la poursuite s'étale sur les Rounds (D5).** Chacun joue dans son Tour ; il reste à fixer ce qu'est « un Test opposé » quand les deux camps ne jouent pas au même moment. *Options :* (a) le poursuivant joue son Test à son Tour, le fuyard répond (Test opposé) à son propre Tour suivant, la paire est comparée une fois les deux faits ; (b) le Test du fuyard est joué en réaction, hors de son Action ; (c) la poursuite se compte par manche, les deux jets à la suite dans l'ordre d'Initiative. *Recommandé : a*, la plus proche de D5 (une Action par Test, rien de gratuit).

**Q3. Plusieurs poursuivants ou fuyards.** La règle compare le plus rapide au plus lent. *Options :* (a) tous les participants sont saisis, l'outil choisit la paire (CA1) ; (b) un seul couple par poursuite. *Recommandé : a* (cohérent avec D1 et avec « fuyard rattrapé : l'engager avec ses poursuivants »).

**Q4. Un Test d'Obstacle raté ou un personnage qui n'a plus d'Action.** Que devient-il : il est distancé (mis hors poursuite), ou il subit seulement une pénalité sur le Test opposé suivant ? *Options :* (a) suivre le texte du livre une fois relu (Q1) ; (b) pénalité en DR sur le prochain Test. *Recommandé : a*.

**Q5. Qui désigne l'« autre » qui reçoit l'Avantage d'une Réussite stupéfiante ?** *Options :* (a) le MJ choisit dans une liste des alliés de la poursuite ; (b) l'outil l'attribue au suivant dans l'ordre d'Initiative. *Recommandé : a*.

**Q6. Seuil de 6 ou 5 DR.** Le rapport mentionne une version 3 du livre à 5 DR. Le MJ a dit 6 ; confirmer que le texte relu en Q1 ne dit pas 5. *Recommandé :* garder 6 sauf contradiction du livre relu.
