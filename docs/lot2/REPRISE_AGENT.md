# Reprise du chantier local V5

Mise à jour du 9 octobre 2026 après le raccordement représentatif 2.3. Lire aussi [la passation](PASSATION_PROCHAINE_FENETRE.md), [le rapport de raccordement](LOT2_RACCORDEMENT_2_3.md) et [le contrôle indépendant](LOT2_CONTROLE_2_3.md).

> Continuer sur la branche LOCALE `codex/lot2-talents-v5`, dans le worktree `lot2-combat-v5`. Elle inclut `a1af528` et le commit contenant ce dossier. Les étapes 2.1/2.2 et cinq contrats représentatifs 2.3 sont raccordés et validés localement. Ne pas repartir du socle distant antérieur. Prochaine étape : catalogue utile 2.4, avec un incrément moteur pour toute nouvelle mécanique. Ne pas pousser, fusionner dans main ni déployer sans instruction du MJ.

## Décisions maintenues

- Un moteur V5 ; aucun compteur d’Avantage V4 ni conversion silencieuse d’un modificateur de seuil en DR. Le MJ précise les DR ; les seuils source restent inchangés.
- Avantage/Désavantage s’annulent 1 pour 1 ; inversion puis DR supplémentaires. Choix explicites des deux participants sans nouveau tirage ; recommandation défensive selon les Blessures subies.
- Élan binaire. Les coûts précèdent calculs et comparaison. Une seule dépense d’Élan pour attaque supplémentaire par acteur/Tour, même après regain ; exemption et quota du talent restent distincts.
- Critiques de succès doubles indépendants du gagnant, y compris défenseur. Localisation normale et localisation critique restent distinctes ; +10 de gravité par Blessure excédentaire sans plafond global.
- États et effets : occurrences et causes conservées, horloge par scène, auteur distinct de cible, fin de Round distincte de fin de Tour. Les jets nécessaires sont explicites avant commande atomique.
- Historique sans valeur patrimoniale pour le MJ : supprimer une rencontre purge journal, archives, usages et offres liés, y compris leurs copies d’annulation. Restaurer la rencontre ne ressuscite pas ces traces. Fortune reste propre au personnage.
- Les 206 descriptions d’Aides de jeu sont actualisées V5 ; leur texte seul n’active aucun automatisme. Source vérifiée, acquisition normalisée et contrat validé sont nécessaires.
- Priorité PJ depuis leurs snapshots réellement importés. Dix bonus de caractéristiques déjà inclus sont exclus ; ne pas ajouter Dur à cuire deux fois. Les snapshots privés relus sont datés, sans preuve d’état en ligne du 9 octobre.
- Règles consultables V5 reprises : Tests, combat, Élan, santé, critiques, États, Psychologie et Corruption. Magie/prières restent au lot 3.

## Trois arbitrages validés et implémentés

[CHOIX_POUR_LA_REPRISE.md](CHOIX_POUR_LA_REPRISE.md) fait autorité ; ne pas redemander ces choix.

1. Le MJ choisit par action entre pénalité de DR et Désavantage.
2. Battement supprime toutes les Blessures et conséquences du critique remplacé ; ses effets seuls remplacent la touche. Le critique défensif indépendant est conservé. Expiration au prochain Tour de l’auteur, choix et tailles explicites.
3. Fortune appartient à un personnage stable dans l’outil entre rencontres. Initialisation explicite depuis Chance courant connu ou saisie MJ ; dépenses et première association univoque annulables, aucune écriture automatique dans la fiche.

## État et suite

Tir précis, Coup puissant, Mâchoires d’acier, Battement et Assaut féroce sont actifs dans la branche locale. Coûts, usages, résultat et révision passent par la même commande durable ; les aperçus et simulations ne consomment rien. Assaut prépare une nouvelle action explicite liée à sa source ; il ne tire ni ne joue automatiquement la réaction.

672 tests Node et cinq recettes Edge réussissent ; voir [avancement](LOT2_AVANCEMENT.md). Les contrôles de cloud sont locaux (enveloppes, outbox et sérialisation), sans compte distant réel. Aucun catalogue complet ni livraison 2.5 n’est certifié.

Poursuivre 2.4 depuis les familles déjà raccordées et la couverture visible. Priorités réelles documentées : Frappe assommante, Orateur et tests contextuels ; Riposte/Frappe réactive demandent encore des contrats. Préparer les autres choix fonctionnels si nécessaire et travailler avec développement et contrôle indépendants quand le MJ le demande.

Le livre personnel est `Livre de base V5 EN v2.pdf`, dans le dossier de règles fourni par le MJ. Aucun PDF ni export privé n’est dans Git ou le ZIP. Les recettes sont synthétiques. Lire le cadrage, les contrats et les rapports historiques pour leurs règles, sans prendre leur statut d’activation ancien pour l’état courant.
