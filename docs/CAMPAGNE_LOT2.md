# Campagne — socle et contrat de suivi

Le lot 2 ajoute un espace de synthèse utilisant les données de la partie. La commande d'avancement reste celle du temps de campagne existant ; les soins et décisions continuent d'utiliser les parcours de « Suites de combat ». Ce lot ne modifie pas les règles de convalescence ni la structure des sauvegardes.

## Identité

Les incidents, maladies et séquelles existants se réfèrent à des identifiants de participants. Des commandes de soins et de tests cherchent encore ces participants dans la rencontre courante. `persistentCharacterId` est facultatif : plusieurs participants peuvent provenir du même profil et un nom ou un `profileId` ne permet pas d'établir une identité unique. Les associations de report vers les fiches facilitent le writeback mais ne sont pas une preuve générale d'identité.

La synthèse affiche séparément les suivis rattachés à un participant absent et ne les associe pas automatiquement à un homonyme ou à un autre exemplaire du même profil. Elle ne prétend pas rendre les soins hors rencontre opérationnels. Aucun identifiant historique n'est réécrit.

Avant une éventuelle continuité opérationnelle entre rencontres, définir le contrat d'identité pour PJ, PNJ, occurrences multiples et participants improvisés ; prévoir les collisions, la reprise des données historiques ambiguës et la migration. Une décision de règles explicite sera nécessaire si le comportement des tests quotidiens des patients absents doit changer.

## Temps

Le registre de convalescence et l'horloge de campagne progressent ensemble selon les chemins existants : la conversion en jours entiers conserve une ancre pour les fractions de jour. Une avance peut nécessiter des jets ou confirmations et reste soumise aux contrôles de révision. Les échéances de Tour réel restent distinctes du passage de secondes de campagne.

La vue ne présente pas une simulation exhaustive des effets futurs. Le dialogue existant demande les entrées et confirmations qu'il sait gérer ; les aperçus et décisions plus riches relèvent du lot suivant.

## Validation à conserver pour la suite

Tester en particulier les suivis présents et absents, les doublons de profil, les identités ambiguës, les fractions de jour, les refus sans mutation partielle, l'annulation, la persistance et la reprise, ainsi que la synchronisation et l'import/export si le modèle est modifié. Les tests ciblés ne certifient que les chemins qu'ils couvrent.
