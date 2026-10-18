# Reprise du chantier local V5

> État courant du 10 octobre : application locale **3.14.0**, magie finalisée et [recette 3.5](../lot3/LOT3_RECETTE_3_5.md). Lire d’abord [le bilan complet](../lot3/LOT3_FINALISATION_MAGIE.md). Le tri exclusif ci-dessous et ses 28 talents « lot 3 » décrivent le lot 2 historique. La couverture actuelle compte 285 clauses automatiques, 122 assistées, 63 rappels, 41 fiches, 10 exclusions et 9 clauses différées à un autre périmètre. Ingrédients exclus ; miracles inventoriés seulement. Worktree / branche / HEAD inchangés, aucune publication.

État du 9 octobre 2026 après le tri complet et le raccordement des familles restantes. Lire [le bilan détaillé](LOT2_TRI_TALENTS.md), [l’avancement](LOT2_AVANCEMENT.md), [les décisions](CHOIX_POUR_LA_REPRISE.md) et [la passation](PASSATION_PROCHAINE_FENETRE.md).

Continuer dans le worktree local `lot2-combat-v5`, branche `codex/lot2-talents-v5`. L’incrément courant est **non commité** sur HEAD `fb0f280`. Le main de E:\Outil MJ Warhammer reste inchangé sur `08ce45d`. Conserver toutes les modifications et nouveaux fichiers ; le distant et l’ancien ZIP de préparation ne les contiennent pas. Le paquet statique 3.13.0 est séparé dans tmp/lot2-25/. Aucun push, merge ou déploiement autorisé.

## État exact

206 talents triés par clause, 131 contrats validés et 382 clauses raccordées. Bilan exclusif : 131 avec moteur, 19 purement narratifs, 18 entièrement dans les fiches, 10 bonus de caractéristiques exclus, 28 lot 3. Les talents mixtes gardent leurs rappels et valeurs de fiche. Version applicative 3.13.0 ; version mécanique `v5-combat-2026-10-09.24.6`.

Petit est raccordé et éprouvé selon les réponses explicites du MJ : multiplication des Dégâts avant BE/PA et suppression intégrale des Frappes Mortelles. Piétinement à 1 Élan, rapports de Taille dans les deux sens, Force opposée et Peur/Terreur V5. Aucune migration de Taille/Blessures. 2.4 et 2.5 sont terminés localement dans le périmètre convenu. La version 3.13.0 est prête à publier sur autorisation ; voir [la recette et livraison](LOT2_RECETTE_2_5.md).

## Décisions à conserver

- Fiction en rappels ; progression/valeurs dérivées dans les fiches ; aucun bonus de caractéristique, aucun doublon de Dur à cuire.
- Matraqueur : supplément Sonné au seuil Assommante V5, sans ancien bonus de Force. Commandant d’Équipage : Action réussie, prochain tir seulement.
- Élan binaire, annulation Avantage/Désavantage 1 pour 1, inversion choisie sans nouveau dé. Unités littérales 0=0 ; réussite marginale conservée.
- Coûts ordinaires avant jet ; dépenses réactives pour attraper/repousser après résultat. Tout résultat, coût et quota est atomique, persistant et annulable.
- Critiques réussis indépendants du gagnant, localisation normale/critique distincte, +10 par Blessure d’excédent sans plafond global. Battement remplace tout le critique attaquant, conserve le critique défensif indépendant.
- Pénalités mixtes d’États au choix MJ. Fortune stable par personnage, initialisation explicite, pas d’écriture dans la fiche. Horloges auteur/cible, Tour/Round/séance distinctes.
- Neutralisation silencieuse p. 135 : Test hors combat assisté, conséquences particulières manuelles approuvées. Ne pas les rebaptiser narratives ni redemander ce choix.
- Sources publiques exactes et acquisitions résolues requises ; revalidation à confirmation. Le texte seul n’accorde pas de mécanique. Les faits spatiaux et fictionnels restent explicites.

Modules : contrats/tests/qualités, actions et combat, situations, psychologie, remplacements, taille/contact, attaques immédiates, protection alliée, Tourbillon, mesures et UI correspondantes. Conserver les modules dans le précache SW. Les imports croisés ne doivent pas lire un export importé au niveau supérieur avant son initialisation.

Les recettes synthétiques n’utilisent aucun compte distant. Aucun PDF/export privé dans Git/ZIP. Audit : 166 talents du livre, 39 suppléments non tous vérifiés, Petit homebrew séparé. Les vieux snapshots PJ ne prouvent pas un état en ligne.

Les rapports 2.3/2.4 et mots-clés conservent leurs preuves historiques ; leurs nombres 41/801 et version .24.4 ne décrivent plus l’incrément courant. Voir l’avancement pour les contrôles finaux.

Recette 2.5 : 921/921 tests Node, dix recettes Edge, huit scénarios avec RTDB/Auth locaux, règles d’accès et migration réelle locale, paquet exporté de 130 assets démarré hors ligne sur bureau/téléphone. Le rechargement d’un état cloud identique conserve désormais l’annulation ; un changement externe la ferme. Commandes et limites dans LOT2_RECETTE_2_5.md. Les preuves locales et le paquet sont dans tmp/lot2-25/ ignoré.
