# Audit des règles — Phase F0

**Audit partiel.** Les nombres décrivent les seules règles effectivement recensées. Un livre sans entrée reste à lire. Les pages citées ne certifient pas la lecture du reste du chapitre ni du livre. Voir `plans-gpt/RAPPORT_GPT_PHASE_F.md`.

L’audit de couverture est statique : une référence moteur ne vaut pas recette à la table. Les domaines déjà inventoriés utilisent `coveredBy` sans recopier leur contenu. Chaque lacune jouable recensée possède un sélecteur ; aucune implantation n’est autorisée.

## Par livre

| Livre | Entrées | automatise | assiste | rappel | absent | hors-granularite |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| L01 — Archives of the Empire 2.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L02 — Archives of the Empire 3.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L03 — Archives of the Empire Volume 1.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L04 — Deft Steps Light Fingers.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L05 — Livre de base FR.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L06 — Livre de base V5 EN v2.pdf | 46 | 16 | 5 | 0 | 25 | 0 |
| L07 — Lustria EN.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L08 — Supplément Elfe - High elf Players Guide v2.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L09 — Supplément Elfe Noir - Temple of Spite v2.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L10 — Supplément Vampire - Sylvania The Cursed County v2.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L11 — The Imperial Zoo.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L12 — Tribes and Tribulations EN.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L13 — Up in arms.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L14 — Warhammer_Fantasy_Roleplay_Sea_Wardens_of_Cothique.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L15 — WFRP_Dwarf_Players_Guide_Book_250714.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L16 — WFRP_Lords_of_Stone_and_Steel_250714.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L17 — Winds Of Magic.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L18 — WFRP_Power_Behind_the_Throne_Companion.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L19 — WFRP-Middenheim-City-of-the-White-Wolf_18.01.2021.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L20 — WFRP_Altdorf_Crown_of_the_Empire.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L21 — WFRP_Empire_in_Ruins_Companion.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L22 — WFRP_The_Horned_Rat_Enemy_Within_Campaign_Director_s_Cut_Volume_4_Companion1.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L23 — Warhammer_Fantasy_Roleplay_Enemy_in_Shadows_Companion.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L24 — Warhammer_Fantasy_Roleplay_Rough_Nights__Hard_Days_PDF.pdf.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L25 — WFRP_Sea_Of_Claws_221021.pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| L26 — WFRP_Death_on_the_Reik_Companion.pdf | 0 | 0 | 0 | 0 | 0 | 0 |

## Par domaine

| Domaine | Entrées | automatise | assiste | rappel | absent | hors-granularite |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Destin et Chance | 12 | 0 | 3 | 0 | 9 | 0 |
| Tests | 34 | 16 | 2 | 0 | 16 | 0 |

## Lacunes jouables, par domaine

### Destin et Chance

- **F-L06-0025 — Dépenser une Chance pour obtenir Avantage** (L06 p.133, absent) : Avant le jet, dépenser un Point de Chance donne Avantage à ce Test. La relance avec débit existe ; aucun choix générique repéré liant débit d’une Chance et Avantage avant jet. Les saisies indépendantes ne suffisent pas.
- **F-L06-0027 — Payer plusieurs relances successives** (L06 p.133, absent) : Après une relance, une autre Chance peut être dépensée pour relancer encore en conservant le dernier résultat. La préparation montre un jet initial et une seule relance ; aucune chaîne historique de plusieurs relances payantes avant application repérée.
- **F-L06-0030 — Dépenser un Destin pour annuler une attaque** (L06 p.133, absent) : Après les dés d’attaque mais avant dégâts, opposition et critiques, dépenser un Destin annule les effets de l’attaque contre soi. Aucun flux générique d’annulation d’attaque avec débit permanent de Destin repéré ; getV5Fate et la dépense temporaire ne suffisent pas.
- **F-L06-0031 — Dépenser un Destin pour survivre** (L06 p.133, absent) : Au lieu de mourir, dépenser un Destin permet de survivre, mais retire le personnage de la rencontre en cours. Le retour après Jugement dernier est spécifique à Courroux ; aucune survie générique à la mort avec débit et sortie de rencontre repérée.
- **F-L06-0032 — Dépenser un Destin pour réussir sans jet** (L06 p.133, absent) : Un Destin permet de choisir le résultat du Test plutôt que lancer les dés et garantit une réussite. Aucune commande générale de réussite choisie avec débit permanent de Destin ; une saisie favorable du d100 ne remplace pas cette règle.
- **F-L06-0033 — Destin : gagner une opposition d’au moins un DR** (L06 p.133, absent) : Lors d’une réussite obtenue par Destin, une opposition est gagnée avec au moins +1 DR. Pas de préparation générique forçant l’issue opposée après débit d’un Destin.
- **F-L06-0034 — Destin : choisir la localisation du critique** (L06 p.133, absent) : En choisissant un critique grâce à un Destin, le joueur peut choisir la localisation au lieu d’un tirage aléatoire. La saisie d’un jet de localisation n’établit aucun lien avec un Point de Destin ; procédure dédiée non repérée.
- **F-L06-0035 — Accorder du Destin pour un acte exceptionnel** (L06 p.133, absent) : Le Destin ne se renouvelle pas automatiquement ; le MJ peut accorder un point pour un acte exceptionnel, généralement en fin d’aventure importante. Lecture du registre getV5Fate et des débits temporaires ; aucun flux générique d’octroi durable de Destin repéré.
- **F-L06-0036 — Adapter le renouvellement de Chance à la durée de séance** (L06 p.265, absent) : Pour les longues séances, renouveler la Chance à un moment approprié environ toutes les quatre heures ; pour les courtes, une séance sur deux. Renouvellement ponctuel possible par le MJ, mais aucune proposition de cadence liée aux séances repérée ; ne jamais utiliser l’heure PC implicitement.

### Tests

- **F-L06-0001 — Décider quand un Test est nécessaire** (L06 p.129, absent) : Une action routinière ou à issue certaine réussit sans jet ; le MJ demande un Test quand l’issue est incertaine ou opposée. Aucun flux général de réussite sans jet repéré dans la résolution ; les actions de talent sans Test sont spécifiques.
- **F-L06-0015 — Recommencer après un Test raté** (L06 p.130, absent) : Un Test raté ne peut être repris qu’après traitement de ses conséquences ou changement important des circonstances. Recherche dans js/core, js/ui et actions : pas de suivi général des conséquences autorisant une nouvelle tentative.
- **F-L06-0016 — Tests dans l’obscurité** (L06 p.130, absent) : L’obscurité impose Désavantage aux Tests de mêlée, de tir et de Perception visuelle ; lumière, talents et Traits peuvent l’atténuer. Aucun contexte général d’obscurité repéré dans js/core ou js/ui ; la saisie libre d’un Désavantage ne vérifie pas ces déclencheurs.
- **F-L06-0018 — Barème des difficultés** (L06 p.131, absent) : Le barème fixe les DR à +6, +4, +2, 0, -1, -2 et -3, du plus facile au plus difficile ; sans précision, utiliser zéro. Table vérifiée visuellement p.131. Le panneau accepte un nombre de DR mais ne propose pas ce barème nommé ni une validation de ses valeurs.
- **F-L06-0019 — Interpréter les degrés de résultat** (L06 p.131, absent) : Les issues se répartissent en huit paliers : au moins +5, +3/+4, +1/+2, +0, -0, -1/-2, -3/-4 et au plus -5. Table visuellement vérifiée p.131 ; zéro signé calculé, mais ni classement complet ni issues correspondantes repérés dans l’affichage.
- **F-L06-0023 — Aide collective et chef du Test** (L06 p.132, absent) : Avec accord du MJ, le personnage ayant le meilleur score effectue le Test avec Avantage lorsque d’autres l’aident utilement. Pas de flux général de sélection des assistants, de comparaison des scores et d’Avantage d’aide ; familiers magiques spécifiques seulement.
- **F-L06-0024 — Conditions pour aider un allié** (L06 p.132, absent) : L’aide doit être pertinente et assez proche ; pas d’aide habituelle contre maladie, poison, peur ou danger ; une compétence avancée exige un progrès. Aucun contrôle général des assistants ni de leurs progrès repéré. Les aides de familiers ne couvrent pas cette procédure.
- **F-L06-0037 — Fixer les paramètres d’un Test étendu** (L06 p.266, absent) : Le MJ fixe le total de DR, la fréquence des jets, l’échéance et les conséquences d’un dépassement. Progressions spécialisées en Peur, Canalisation et Dissipation seulement ; aucun registre générique de tâche étendue repéré.
- **F-L06-0038 — Modifier le Test pendant une tâche étendue** (L06 p.266, absent) : Le MJ choisit compétence et difficulté pour chaque tentative ; elles peuvent changer pendant la tâche. Les Tests isolés sont possibles, mais ne sont pas reliés à une même tâche étendue générique.
- **F-L06-0039 — Cumuler les DR d’une tâche étendue** (L06 p.266, absent) : Après chaque tentative, ajouter les DR réussis ou retrancher les DR d’échec au total de progression partagé. Le calcul de progression spécialisé de Dissipation ne constitue pas un service de tâche étendue pour les autres usages.
- **F-L06-0040 — Progression minimale d’un résultat marginal** (L06 p.266, absent) : Dans un Test étendu, une réussite ajoute au moins +1 DR et un échec retranche au moins un DR. Zéro signé correctement calculé par le Test isolé ; absence de conversion générale en progression minimale.
- **F-L06-0041 — Progression d’un critique ou d’une maladresse** (L06 p.266, absent) : Dans un Test étendu, un critique ajoute au moins cinq DR et une maladresse en retranche au moins cinq. Le Test général calcule ces planchers, mais aucune tâche étendue générique ne les enregistre ni ne les cumule.
- **F-L06-0042 — Terminer une tâche étendue au seuil** (L06 p.266, absent) : La tâche est réussie lorsque le total de progression atteint le seuil fixé. Seuils des systèmes spécialisés seulement ; pas de tâche étendue générique.
- **F-L06-0043 — Échouer à une tâche dont la progression devient négative** (L06 p.266, absent) : Une tâche étendue échoue dès que sa progression descend sous zéro ; le MJ en détermine les conséquences. La Dissipation persistante implante ce cas pour ses propres progrès, sans procédure générale de tâche.
- **F-L06-0044 — Échouer à une tâche par manque de temps ou de tentatives** (L06 p.266, absent) : Une tâche étendue échoue lorsque le délai ou le nombre d’essais autorisé est épuisé. Pas de compteur d’essais et d’échéance pour une tâche étendue générique repéré.
- **F-L06-0045 — Partager une progression de tâche étendue** (L06 p.266, absent) : Plusieurs personnages peuvent chacun tester et ajouter leurs DR à un total commun de tâche étendue. Ni tâche commune ni rattachement de tentatives de plusieurs acteurs repéré.
