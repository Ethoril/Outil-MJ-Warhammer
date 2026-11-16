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

## Décisions du MJ (16/11/2026)

- **D9. Test opposé en combat (ex-Q2).** Chacun à son Tour : le poursuivant fait son Test à son Tour, le fuyard répond à son propre Tour ; l'outil compare la paire une fois les deux Tests faits. Une Action par Test, rien de gratuit.
- **D10. Plusieurs poursuivants ou fuyards (ex-Q3).** Le MJ saisit tous les participants ; l'outil choisit la paire (le plus rapide contre le plus lent).
- **D11. Avantage d'une Réussite stupéfiante (ex-Q5).** Le MJ choisit le bénéficiaire dans la liste des alliés de la poursuite.

## Décisions du MJ (16/11/2026, après relecture du livre)

- **D12. Qui franchit les Obstacles.** Le camp des PJ seulement, comme dans le livre ; l'autre camp ne fait que le Test de poursuite. Sans aucun PJ dans la poursuite, le MJ désigne le camp qui franchit les Obstacles.
- **D13. Facteurs favorables.** L'outil coche les deux facteurs déductibles (Test de poursuite gagné ; son membre le plus lent plus rapide que le plus rapide d'en face), le MJ coche le terrain ; chaque case reste modifiable. Remplace la saisie libre de CA4.
- **D14. Mouvement compté.** Le Mouvement courant calculé par l'outil (États et modificateurs compris, celui de la monture pour un cavalier monté), corrigeable par le MJ dans l'écran. Vaut pour le choix de la paire, le facteur de Mouvement et la règle du Mouvement double.
- **D15. Issue partielle.** Quand le groupe perd, le journal nomme ceux qui ont franchi leur Obstacle. Un fuyard qui s'échappe quand même reçoit le bouton « Retirer de la rencontre » ; un poursuivant qui continue seul reçoit un simple rappel de son unique occasion d'attaquer ou de retenir le fuyard le plus lent, sans automatisme.

## Décisions du MJ (16/11/2026, points à trancher du plan)

- **D16. Égalité au Test de poursuite.** Le poursuivant l'emporte, comme l'initiateur des autres Tests opposés de l'outil ; il reçoit le facteur « Test de poursuite gagné ».
- **D17. Participants hors combat.** Seulement les participants de la rencontre en cours, même non lancée ; sans participant, l'entrée de l'écran Jouer est grisée avec son motif.
- **D18. Rencontre terminée ou recommencée.** Une poursuite en cours est abandonnée sans issue, avec une ligne au journal.
- **D19. Vocabulaire.** À l'écran, le mot de l'outil : « Réussite éclatante » (+5 DR), pas « Réussite stupéfiante » (choix de cadrage, pas une décision du MJ).
- **D20. Fuyard Brisé en poursuite (16/11, après le lot L3).** Tant qu'un Brisé est le fuyard d'une poursuite en cours, son Test de poursuite ou d'Obstacle du Tour vaut pour son obligation de fuite et de Sprint : le Tour peut se terminer. Une Action par Test, comme D5.
- **D21. Fuyard Brisé aux Rounds suivants (16/11, après la contre-vérification).** Tant qu'un Brisé est le fuyard d'une poursuite en cours, il n'a plus à fuir ni à sprinter : son Tour se termine librement, qu'il ait un Test à jouer ou non. L'obligation revient si la poursuite est abandonnée. Élargit D20.
- **D22. Mouvement inconnu ou nul.** Tant qu'un Mouvement de la poursuite est inconnu ou nul (Surpris, Enchevêtré), l'outil ne rend aucun verdict de Mouvement double ni de paire automatique : il le signale et laisse le MJ saisir ou corriger. Précise D14, qui compare par ailleurs des Mouvements non arrondis (moitié exacte pour À terre et Sonné).
- **D23. Compétence absente.** Une compétence de base absente de la fiche se teste sur sa Caractéristique ; une compétence avancée absente est refusée, il faut choisir l'autre compétence proposée. Même règle au Test de poursuite et au Test d'Obstacle.
- **D24. Scène mise en pause.** La poursuite suit sa scène : rangée avec elle à la mise en pause, rendue à la reprise, sans gêner une autre rencontre. Si cela exige une modification intrusive du rangement des scènes, le dire au MJ avant de le faire.
- **Rang des talents (levé par relecture, 16/11).** Le livre (p. 120 et 124) donne à Fuite ! et à Impitoyable « +1 DR » aux Tests de poursuite, sans notion de rang. Le contrat (+1 DR en tout) est donc juste ; l'ancien code (+1 par rang) ne l'était pas. Mesuré au lot L2 : rangs 1, 2 et 3 donnent le même +1.
- **Table d10.** Le MJ la relira après le lot L1 ; ses corrections s'appliqueront en retouche de la donnée.

## Règle relue le 16/11/2026 (R1 à R3 levés)

Source : Livre de base V5 (v3, identique à la v2 sur ce passage), « Pursuits », p. 158-159. Résumé en mots à nous ; en cas d'écart avec les critères ci-dessus, cette section fait foi.

- **Test de poursuite.** Au début, le poursuivant au Mouvement le plus élevé fait un Test opposé contre le fuyard au Mouvement le plus bas. D'ordinaire Athlétisme, sinon Conduite, Chevaucher ou Natation selon la situation. Avec montures ou véhicules, on prend leur Mouvement.
- **Fin immédiate (R3).** Un camp gagne le Test opposé de **6 DR ou plus** : la poursuite finit en sa faveur. De même si **le membre le plus lent d'un camp a au moins le double du Mouvement du membre le plus rapide de l'autre** (CA3 se lit ainsi). Le livre ne précise pas « Mouvement de base ou modifié ».
- **Point de vue.** La règle est écrite pour le groupe des joueurs, fuyard ou poursuivant : c'est lui qui compte ses facteurs favorables et franchit des Obstacles. Si des joueurs se poursuivent entre eux, un simple Test opposé tranche.
- **Facteurs favorables, de 0 à 3** (CA4 se lit ainsi). Pour des fuyards : avoir gagné le Test de poursuite ; terrain dense ou bondé, avec des cachettes ; son membre le plus lent a un Mouvement supérieur au poursuivant le plus rapide. Pour des poursuivants : avoir gagné le Test de poursuite ; terrain dégagé, sans cachettes ; son membre le plus lent a un Mouvement supérieur au fuyard le plus rapide. Deux des trois se déduisent des données, seul le terrain est un jugement du MJ.
- **Obstacles.** Chaque personnage rencontre un Obstacle (un par personnage, tiré au d10 ou choisi par le MJ, qui peut l'adapter). Aucun facteur : tout le groupe doit franchir le sien. Un ou deux : la moitié du groupe, arrondie au supérieur. Trois : un seul membre.
- **Aides.** Une Réussite stupéfiante (+5 DR) permet de donner l'Avantage au Test d'un autre personnage. Un objet adapté (une corde pour grimper) peut donner l'Avantage, au jugement du MJ.
- **Échec à un Obstacle (R2).** Aucune conséquence individuelle ni nouvel essai dans le texte : le personnage ne compte simplement pas parmi les réussites. Le livre ne dit rien d'un personnage sans Action (les Tours sont notre décision D5).
- **Issue.** Le groupe gagne s'il atteint le nombre de réussites exigé, sinon il perd.
  - Fuyards gagnants : ils s'échappent.
  - Poursuivants gagnants : ils rattrapent et acculent le fuyard, qui ne peut pas fuir aussitôt.
  - Fuyards perdants : rattrapés et acculés ; ceux qui ont franchi leur Obstacle peuvent encore s'échapper en abandonnant les autres.
  - Poursuivants perdants : le fuyard s'échappe ; ceux qui ont franchi leur Obstacle peuvent continuer seuls et gagnent chacun une seule occasion d'attaquer ou de retenir le fuyard le plus lent.

### Table des Obstacles (d10), à relire par le MJ

| d10 | Obstacle (résumé) | Compétences d'exemple |
|---|---|---|
| 1 | Chariot renversé, marchandises en travers du chemin | Athlétisme (sauter), Esquive (contourner) |
| 2 | Garde trop curieux qui veut vous arrêter | Charme, Intimidation |
| 3 | Eau jusqu'à la poitrine : bassin, canal, ruisseau | Natation (plonger), Athlétisme (sauter) |
| 4 | Passant agressif ou animal affolé en travers | Esquive, Corps à corps (repousser) |
| 5 | Sol boueux ou foule compacte | Athlétisme, Résistance (forcer), Intimidation (ouvrir un passage) |
| 6 | Terrain découvert : pure vitesse | Athlétisme, Conduite, Chevaucher |
| 7 | Ruelle sombre ou végétation dense | Discrétion (se cacher), Pistage (garder la trace) |
| 8 | Nid-de-poule ou racine : vous ou votre monture trébuchez | Résistance (serrer les dents), Emprise sur les animaux (calmer la monture) |
| 9 | Changement de niveau : toits ou cimes des arbres | Athlétisme (sauter), Escalade |
| 10 | Dédale de ruelles ou de canyons : l'autre camp est perdu de vue | Perception (le retrouver), Orientation (ne pas se perdre) |

Les noms de compétences se raccordent aux clés de l'outil au moment du plan.