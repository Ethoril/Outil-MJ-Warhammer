# Reprise du chantier local V5

Mise à jour du 9 octobre 2026 après la première vague du catalogue utile 2.4. Lire [la passation](PASSATION_PROCHAINE_FENETRE.md), [le raccordement 2.4](LOT2_RACCORDEMENT_2_4.md), [le contrôle indépendant](LOT2_CONTROLE_2_4.md) et [les écarts entre sources](ECARTS_LIVRE_V5_AIDES_DE_JEU.md).

Continuer sur la branche LOCALE `codex/lot2-talents-v5`, dans le worktree `lot2-combat-v5`. Elle inclut `a1af528`, `09df6c2` (raccordement 2.3) et le commit contenant cette reprise 2.4. Conserver les modifications existantes ; le distant et le ZIP documentaire seuls ne contiennent pas cet incrément. Ne pas pousser, fusionner dans main ni déployer sans instruction du MJ.

## Décisions maintenues

- Un seul moteur V5 ; aucun compteur d’Avantage V4 ni conversion silencieuse seuil/DR.
- Annulation Avantage/Désavantage 1 pour 1, inversion choisie sans nouveau dé, puis DR supplémentaires. Élan binaire, coûts avant calcul, quotas et exemptions distincts.
- Critiques de succès doubles de combat indépendants du gagnant. Localisation normale et critique distinctes ; +10 de gravité par Blessure excédentaire sans plafond global.
- Horloges par scène, auteur distinct de cible, Tour distinct de Round. Jets nécessaires explicités avant commande atomique. Purger une rencontre purge ses traces et copies d’annulation ; Fortune reste au personnage.
- [Les décisions validées](CHOIX_POUR_LA_REPRISE.md) incluent : pénalités mixtes au choix du MJ, Battement remplace toutes les conséquences du critique attaquant, Fortune outil stable et **Frappe assommante silencieuse alignée p. 135**. Ne pas les redemander.
- Texte public épinglé, acquisition normalisée et contrat validé nécessaires pour automatiser. Description seule et couverture `verified` ne certifient pas toute la mécanique.
- Priorités depuis les PJ réellement importés ; copies divergentes à vérifier, aucune prétention à leur état en ligne. Dix bonus déjà inclus exclus, Dur à cuire non ajouté deux fois. Magie/prières au lot 3.

## État et suite

41 contrats sont actifs : cinq 2.3, 35 de Tests et Frappe assommante. Certains ne couvrent qu’une clause ; les 206 talents affichent leur traitement et les rappels restants. Assommante propose Sonné selon Blessures réellement perdues à la tête ; neutralisation p. 135 aide au Test seulement, conséquences spéciales manuelles. Choix DR/unités explicites pour Maître en déguisement, Loup de mer et Numismate ; 0 vaut 10. Les sources sont revérifiées entre aperçu et application.

[Avancement](LOT2_AVANCEMENT.md) donne validation finale et commandes. Poursuivre les mécaniques encore manuelles par vagues 2.4 (notamment Riposte/Frappe réactive) en ajoutant moteur, contrat et recette pour chaque famille. 2.5 et publication restent ultérieures. Développement et contrôle par sous-agents ont été explicitement autorisés par le MJ.

L’utilisateur demande aussi un document pour corriger Aides de jeu : [audit](ECARTS_LIVRE_V5_AIDES_DE_JEU.md), 166 talents du livre contrôlés, 39 références de suppléments non vérifiées avec leur ouvrage et Petit de source V4 traité séparément. Ne pas présenter une contradiction interne du livre comme une erreur de traduction. Aucun PDF ni export privé dans Git ou le ZIP.
