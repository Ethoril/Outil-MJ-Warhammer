# U8 · Questions pour le MJ

Aucune réponse n'est présumée ici. Les références de page sont celles déjà citées dans le code (Livre de base V5 EN v3, pagination imprimée) ; elles restent à relire dans le livre.

## Règles de cumul

**Q1 · Deux sorts différents sur le même Test par des clés différentes.** « Dur comme le roc » (+2 aux Tests d'Endurance) et « Brise-dents » (+2 en Endurance) donnent aujourd'hui +4 au même Test de Résistance. La règle p. 235 (« seuls le meilleur bonus et la pire pénalité des Sorts s'appliquent ») vaut-elle par **Test** (donc +2), comme le prévoit le lot L1 ?

**Q2 · Prière et sort sur la même cible de Test (DIV-05, ouvert depuis le chantier divin).** Aujourd'hui l'outil refuse de poser une prière quand un sort porte déjà la même clé, mais additionne les deux quand les clés diffèrent (+2 et +2 = +4 dans le test de cumul). Que faut-il appliquer : somme (sources différentes, p. 130), meilleur bonus seul (comme deux sorts), ou arbitrage au cas par cas ?

**Q3 · États et effets.** La pénalité d'États retient la plus forte seulement (Sonné, Exténué, Empoisonné…). Un sort ou une prière qui donne un malus au même Test (ex. « Démangeaison », −1 à tous les Tests) s'ajoute-t-il à cette pénalité, ou entre-t-il en concurrence avec elle ?

**Q4 · Qualités, montures, surnombre.** Ces bonus se somment aujourd'hui avec tout le reste, sauf les exclusions déjà écrites (Bouclier sans Défensive, Maîtrise du combat à deux sans la Taille). Faut-il d'autres exclusions ? En particulier : l'Avantage de cavalerie et un talent qui donne un Avantage sur la même attaque sont-ils deux sources distinctes (+1 DR pour la seconde, p. 130) ?

**Q5 · Plafonds de prière.** Un plafond de DR de prière (Courroux, `prayer-sl-cap`) s'applique-t-il au résultat final, bonus de sorts et de talents compris (comme aujourd'hui), ou avant ces bonus ?

## Arbitrages de périmètre

**Q6 · Chemins de Test hors du pivot.** Une trentaine de Tests (Test de prière, lancement, canalisation, Dissipation, fuite, chute de monture, séquelles…) ne lisent aujourd'hui ni les modificateurs de sorts et prières, ni la pénalité d'États. Le Test de prière ne lit que les clés « tous » et « prière ». Est-ce voulu (règles propres à ces Tests) ou faut-il les faire passer par le même agrégateur ? Si c'est à trier, lesquels d'abord ?

**Q7 · Ordre avec *Sea of Claws*.** Le lot L7 (contenu sans JS) avant le premier élément de *Sea of Claws*, quitte à décaler le supplément ; ou intégration du supplément d'abord dans les formats actuels, puis migration ?

**Q8 · Lancement.** L0 et L1 (correction du cumul par Test) sont indépendants des fichiers chauds et pourraient partir en vague 4. Le reste (L2 à L9) attend-il une vague dédiée, ou se fait-il au rythme des suppléments, comme le proposait la note du 02/11 ?

**Q9 · Affichage « non cumulé ».** Un modificateur écarté par une règle de cumul doit-il rester visible (barré, avec la règle) dans le détail du Test, ou disparaître ?

## Réponses du MJ sur L7 (06/11)

- **Un seul fichier** pour tous les suppléments : `js/data/v5-supplements.json`.
- **Dégâts, États, Traits, PA** : formats actuels (Q7) ; briques avec L8 et L9.
- **À faire tout de suite, dans L7** :
  - coûts et quotas d'action des talents de supplément ;
  - prières et sorts de supplément lançables depuis l'interface (NI, portée, durée) ;
  - bandeau d'erreur de chargement qui reste affiché.
