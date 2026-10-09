# Contrôle indépendant du combat et des effets V5

Contrôle du 9 octobre 2026 sur la branche locale `codex/lot2-talents-v5`.

## Verdict

Les scénarios contrôlés des étapes 2.1 et 2.2 et du socle pur 2.3 passent. Aucun défaut bloquant ne reste dans ces scénarios du moteur et de sa persistance. La suite ciblée de dix fichiers compte **183 tests réussis, zéro échec** lors de cette vérification. La recette navigateur et la suite complète sont suivies séparément par l’agent coordinateur ; ce nombre ne les remplace pas.

La référence consultée est le PDF personnel **Livre de base V5 EN v2**, 379 pages : Tests p. 130–131, combat p. 164–171, critiques p. 173–176, Psychologie et États p. 183–187, Corruption p. 187–189 ; talents p. 114–115, 121 et 127 ; Fortune p. 133 et coût d’Élan p. 168. Le PDF reste hors du dépôt et des archives publiées. Les données de recette sont synthétiques.

## Règles et décisions vérifiées

- Un critique réussi est indépendant du gagnant de l’opposition. Attaque et défense peuvent chacune infliger leur critique ; un Test d’Esquive conserve les règles d’un Test général.
- La touche ordinaire inverse le jet final. Le critique du jet utilise sa propre localisation. Les armures des deux zones restent distinctes dans le calcul et le journal.
- Un excédent de Blessures déclenche un critique à la zone ordinaire, avec +10 de gravité par Blessure excédentaire. Les tables n’ont pas de plafond commun à 100. Les Blessures supplémentaires du critique ne créent aucune boucle de critiques.
- Les 80 intervalles et colonnes de Blessures ont été transcrits dans une fixture indépendante. Les seuils mortels sont 100 à la tête, 136 au bras, 116 au corps et 126 à la jambe.
- Les bornes de localisation de la page 164 sont confirmées : tête 01–09, bras gauche 10–24, bras droit 25–44, corps 45–79, jambe gauche 80–89, jambe droite 90–100.
- Élan est binaire. Les pertes de Blessures et acquisitions d’États doivent être effectives : ajouter À Terre à un personnage déjà À Terre ne fait pas perdre un Élan regagné. Pause et reprise conservent les changements annulables.
- La comparaison utilise le même résolveur pur et les mêmes dés que l’application. Une défense recommande la moindre perte de Blessures subies, avec un critère explicite. Les données inconnues ou le choix de l’autre participant encore absent empêchent une recommandation complète.
- Les pénalités numériques des États différents retiennent la plus forte. Lorsque pénalité de DR et Désavantage diffèrent, l’interface demande le choix explicite du MJ ; cette décision reste dans le contexte du résultat.
- Surpris ne peut pas défendre. Une cible Inconsciente est Sans défense ; les options correspondantes restent explicites dans la résolution.

## États et horloges

`v5-effects.js` est pur : aucun tirage implicite, conservation des métadonnées et occurrences distinctes. Les quatre États non cumulables sont Souillé, À Terre, Surpris et Inconscient. Devenir Inconscient retire Sonné. Le dernier Sonné retiré fait acquérir Exténué si absent ; le dernier Empoisonné retiré fait acquérir Exténué. Les soins reçus retirent aussi un Sonné dont le critique exige une attention médicale : cette branche est testée explicitement.

Hémorragique, Enflammé et Empoisonné agissent en fin de Round. Le feu ajoute un Dégât par occurrence après la première et utilise les protections données ; à 0 Blessure, sa demande de critique au corps reste explicite. Saignement et poison ne produisent pas de critique artificiel ni d’Inconscient sans le Test requis. Les jets de survie sont fournis au plan avant son application.

La récupération d’Assourdi respecte une minute, soit six Rounds. Aveuglé retire normalement une occurrence en fin de Tour du porteur ; les critiques qui exigent des soins, une chirurgie ou la disparition d’Hémorragique gardent leur verrou. Retirer Inconscient avec Fortune sans résoudre sa cause enregistre son retour en fin de Round, même après sauvegarde et rechargement.

Les effets temporaires enregistrent auteur et cible distincts, Round, Tour, acteur de l’échéance et instant avant ou après les effets. Une échéance liée à l’auteur peut retirer un effet de sa cible. Les anciennes durées numériques continuent à compter les Tours de leur propre porteur. Une donnée obligatoire absente produit `needsInput` et bloque la commande entière. Le Store fournit le Round réel de la scène aux acquisitions et récupérations ; une saisie arbitraire du client ne peut pas repousser cette horloge. Les critiques propagent le même Round, et un changement de Round rend leur aperçu périmé. Un nouvel Assourdi ou un Inconscient empoisonné sans horloge connue ne peut pas être appliqué silencieusement. Pour un BE nul, les échéances de survie au poison restent des valeurs explicitement arbitrées, sans intervalle inventé.

## Persistance et contrôle des anomalies

Les tests indépendants supplémentaires sont dans `tests/lot2-v5-control.test.js` :

1. Scène A avancée de cinq Tours, pause, scène B avancée de deux Tours, reprise puis rechargement de A. Son horloge reprend exactement ; l’effet expire au Tour de l’auteur prévu et l’annulation restaure l’effet.
2. Un jet de feu manquant conserve combat, journal et historique. Si une autre modification intervient pendant la saisie, la révision périmée empêche dégâts et avancement. Modifier l’objet de saisie après demande d’application ne change pas le dé capturé.
3. Un critique conserve auteur, cible, version et verrou de récupération. Une mécanique Précise V4 non validée reste visible et bloque son application automatique.
4. Un critique Assourdi acquis au Round 5 ancre sa minute : la récupération prématurée reste bloquée malgré un Round 1000 envoyé par le client ; le premier Test devient possible au Round 11.
5. Un critique Sonné fait devenir Inconscient une cible empoisonnée, retire Sonné et conserve son prochain Test de survie au Round courant + BE, y compris après rechargement.
6. Une attaque supplémentaire compare et résout les dégâts sur l’état Élan déjà payé. Coup puissant donne alors +1 ; regagner Élan après l’attaque ne contourne pas son quota du Tour, même après rechargement. Un autre acteur et le Tour suivant gardent leurs usages propres.
7. Battement reste inactif sous son statut brouillon, même avec choix et échéance fournis. Le schéma 1 continue à accepter ses contrats et à refuser les coûts et champs du schéma 2.

La suppression d’une rencontre purge ses reçus et archives, les marqueurs associés et leurs copies dans les instantanés d’annulation. Un autre combat au même titre est conservé. Annuler peut restaurer la rencontre, mais ne ressuscite pas le journal purgé. Un rejet du disque laisse rencontre, journal et annulation intacts.

Commande de vérification ciblée :

```text
node --test tests/lot2-combat.test.js tests/e22-criticals.test.js tests/lot2-v5-effects.test.js tests/lot2-v5-rule-data.test.js tests/lot2-store-integration.test.js tests/lot2-v5-turn.test.js tests/lot2-v5-control.test.js tests/lot2-v5-action-costs.test.js tests/lot2-talent-contract-v2.test.js tests/lot2-talent-contracts.test.js
```

## Socle 2.3 contrôlé séparément

La préparation des coûts fournit exactement l’état payé au calcul et à la confirmation. Refus et exceptions du résolveur conservent le snapshot d’origine ; ressources, usages et résultat sont enregistrés ensemble. Les révisions périmées, modifications de l’acteur ou du registre et doubles identités d’action sont refusées. Aucun module ne tire de dé ni ne mute ses entrées.

Les quotas restent attachés à leur acteur et à leur Tour, Round ou rencontre explicites. Une exemption de coût ne supprime pas le quota du talent. Les coûts applicables sont vérifiés ensemble ; les ressources inconnues ne sont pas traitées comme un solde nul. Mâchoires d’acier consomme son premier usage même lorsque son Sonné proposé est entièrement évité, et conserve alors l’Élan si aucun autre motif ne le retire.

Les trois contrats validés dans les données sont Tir précis, Coup puissant et Mâchoires d’acier. Leurs descriptions et empreintes correspondent au snapshot actuel du catalogue, et leurs valeurs ont été relues dans le livre V5. Au moment du contrôle, Battement était brouillon dans l’attente de l’arbitrage des critiques. Le MJ a depuis choisi la suppression de toutes les Blessures et conséquences du critique ; le contrat reste brouillon jusqu’à implémentation et recette de ce choix. Le prototype possède une échéance liée à la fin du prochain Tour de l’auteur ; cela ne l’active pas dans le combat.

**Ce socle n’est pas raccordé à l’application.** Les tests ne prouvent pas la consommation réelle des ressources en interface ni la couverture des talents des PJ. Lors du raccordement, ressources et registre devront suivre les commandes Store, sauvegardes, synchronisation, annulation et purge de rencontre.

## Limites de ce verdict

Les jets supplémentaires, soins, blessures permanentes et décès des tables critiques sont signalés au MJ. Le raccordement des choix de talent, coûts, quotas, réactions et échéances de leurs contrats doit être validé avant activation ; le présent contrôle porte sur leur socle pur. La conversion du catalogue de talents ne constitue pas à elle seule une preuve de couverture mécanique.

Le panneau de règles consultables est mis à jour pour Psychologie et Corruption V5, notamment Peur/Élan, Terreur et seuils de réussite marginale de Corruption. La magie et les prières restent dans le périmètre du lot 3. Le raccordement de chaque geste d’édition et récupération d’État doit être couvert par la recette d’interface avant la livraison de l’étape 2.5.

Cette vérification n’autorise aucune publication. Le nouveau moteur reste sur la branche de chantier.
