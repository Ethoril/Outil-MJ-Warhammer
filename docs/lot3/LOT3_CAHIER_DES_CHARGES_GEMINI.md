# Cahier des charges — magie V5 dans l’Outil MJ Warhammer

> Mise à jour du 10 octobre 2026 : [finalisation Codex en 3.14.0](LOT3_FINALISATION_MAGIE.md), [recette 3.5](LOT3_RECETTE_3_5.md). Les ingrédients sont exclus. Les nombres 123 / 132 / 22 décrivent le traitement principal des 277 contrats ; ils ne certifient pas chaque clause comme entièrement automatique. Les constats de départ et revues antérieures restent historiques.

Document destiné à Gemini, établi le 9 octobre 2026. L’utilisateur confie l’implémentation à Gemini ; Codex vérifiera ensuite les changements, les règles et les preuves de validation. À ce stade, Codex s’arrête à ce document et aux corrections locales déjà décrites.

## Livraison attendue et environnement

Développer le moteur magique de l’outil existant, progressivement, en conservant les comportements de combat V5 du lot 2. Le résultat doit permettre de Focaliser, lancer et dissiper un sort, gérer les incidents, puis appliquer ses effets calculables aux participants. Les choix de cibles, terrain, formes et résultats narratifs restent explicitement soumis au MJ quand les données manquent.

Travailler dans **`C:\Users\arnot\.codex\worktrees\lot2-combat-v5\Outil MJ Warhammer`**, branche **`codex/lot2-talents-v5`**. Cette copie comporte déjà des modifications locales du lot 2 et de ce cadrage : les préserver. Ne pas repartir du dossier principal `E:\Outil MJ Warhammer`, qui ne contient pas les mêmes modifications. Ne pas réinitialiser Git, écraser les changements existants ou recréer le catalogue sans examiner les différences.

La livraison reste locale : aucun push, fusion, déploiement, changement de la feuille publique ou écriture dans les fiches des personnages n’est autorisé par ce cahier des charges. L’application est à la version locale 3.13.0 ; le bundle 2.5 déjà préparé est figé et antérieur aux corrections de magie. Ne pas le présenter comme une recette du nouveau moteur.

## Documents qui font foi

- [Cadrage et arbitrages](LOT3_CADRAGE_MAGIE.md) : règles retenues, écarts V4/V5, texte exact d’Apothéose Verdoyante, sources et étapes.
- [Audit des 277 sorts](LOT3_AUDIT_SORTS.md) et [données structurées](LOT3_AUDIT_SORTS.json) : chaque entrée a un identifiant, une empreinte, ses paramètres actuels, un traitement proposé et ses notes de correction. Répartition : 123 effets principalement calculables, 132 avec saisie MJ, 22 principalement narratifs. Ces nombres ne décrivent pas des contrats déjà implémentés.
- `docs/lot2/LOT2_TRI_TALENTS.json` et `.md` : clauses des 28 talents reportés au lot 3 ; raccorder uniquement celles pertinentes pour la magie. Prières et runes ne deviennent pas des sorts par assimilation.
- Sources locales sous `E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\` : `Livre de base V5 EN v2.pdf`, `Winds Of Magic.pdf`, `Supplément Elfe - High elf Players Guide v2.pdf`. Pages contrôlées et limites de la relecture dans le cadrage. Les fichiers texte/JSON correspondants sont disponibles dans le dossier voisin `text`.

Ordre de priorité : arbitrages explicites de l’utilisateur, livre V5 pour les sorts et procédures qui y figurent, puis exceptions des suppléments. Ne pas supposer qu’un sort du supplément a été réécrit en V5. Contrôler la page source avant de figer une valeur particulière encore signalée comme à vérifier ; documenter toute incertitude de règle sans inventer un effet.

## Règles obligatoires

### Focalisation et lancement

1. Une seule compétence de Focalisation pour les huit Vents et une réserve commune. La Haute Magie utilise une autre compétence et un autre type de réserve. Les Domaines connus, le Vent déclaré et leurs prérequis restent distincts.
2. Une seule réserve peut être remplie. Commencer une Action de Focalisation de l’autre type efface la réserve précédente, avant même de connaître le résultat. Une consultation ou un aperçu ne constitue pas cette Action.
3. Chaque réussite ajoute **DR + BFM**, cumulable sur plusieurs Tours. Un double réussi ajoute **DR + 2 × BFM**, sans incident du seul fait de ce critique.
4. Le lancer utilise Langue (Magick). Le Test doit réussir ; la réserve ne sauve ni un échec ni une maladresse. Ajouter ensuite la réserve aux DR et comparer ce total au NI. Toute tentative effective consomme la réserve, réussie ou ratée. Une annulation avant le Test ne la consomme pas.
5. L’excédent sert à la surpuissance, sans ancien bonus de +10. Maximum dépensé : BI + BFM. Coûts génériques V5 : 1, 2, 3, 5, 8, 13, 18 ; répartir la dépense entre améliorations, sans payer plusieurs améliorations avec les mêmes DR. Respecter les interdictions des sorts mineurs, grimoires non mémorisés et paramètres non extensibles.
6. Appliquer pause, interruption, armure, avantages du lieu, ingrédients, talents, critique et maladresse selon les rappels V5 déjà corrigés dans `js/data/rules.js`. Distinguer DR du Test, réserve, total d’incantation, NI, excédent, surpuissance disponible et dépense réelle dans les données comme dans l’interface.

### Incidents, Haute Magie et dissipation

- Utiliser les **20 résultats Mineurs et 20 Majeurs V5** de `js/data/magic.js`, jamais les anciennes tables. Le dernier résultat Majeur couvre 96 et plus. Conserver les jets secondaires et les choix ; les incidents narratifs restent des rappels.
- Gérer les trois branches du critique d’incantation, l’exception des sorts mineurs, les influences corruptrices, ingrédients et talents d’atténuation. Une perte de réserve n’excède pas la réserve réelle ; le modificateur d’incident dépend des DR effectivement perdus. Une transaction doit conserver tous les dés utilisés.
- Haute Magie : conserver épuisement magique, runes des Cadai et choix d’un seul attribut de Domaine, adaptés aux Tests V5. Respecter le risque fondé sur les DR réellement dépensés au-delà du BFM, la durée/permanence, Chance/Destin et l’exception de Marque de la magie. Les règles détaillées sont dans le cadrage et les rappels locaux.
- Dissipation d’un lancement : opposition et une tentative par Round. Dissipation d’un effet persistant : Action, Test étendu et objectif égal au NI ; progression suivie par dissipateur. Respecter les exceptions propres aux sorts, la portée et la visibilité déclarées.

### Effets et arbitrages de sorts

- Appliquer les modifications **temporaires** de caractéristiques, traits, talents, compétences, PA, protections et formes dans l’outil, sans modifier la fiche source. Une expiration retire uniquement les effets qu’elle a créés : elle ne restaure pas un ancien participant entier et ne guérit pas les dégâts subis entre-temps.
- Distinguer les bonus de Test convertis en DR des vraies modifications de caractéristiques. Distinguer projectile + BFM, dégâts fixes, Blessures directes et pertes réellement infligées. Les DR ne s’ajoutent pas automatiquement aux projectiles. Respecter BE, PA, Protection, contact, localisation et attributs de Domaine.
- Identifier origine, cibles, début et fin d’effet, moment du Round/Tour, conditions de terminaison et règle de non-cumul. Garder le meilleur bonus et le pire malus par effet, sauf exception explicite. États reçus et états maintenus par un sort n’ont pas forcément la même durée.
- **Forme bestiale — Jade** : vrai doublon homebrew du profil V5 de Forme bestiale du Domaine des Bêtes, avec tous ses paramètres et procédures ; Vent Ghyran et attribut du Domaine de la Vie. Partager l’implémentation, conserver les deux identités.
- **Apothéose Verdoyante** : chaque mort admissible revient avec **1 B par DR final du sort**, limité aux Bmax. Le total comprend DR du Test réussi et réserve utilisée, avant dépense de surpuissance. Exemple : 3 + 15 = 18 B, limitées aux Bmax. Conserver moins d’une minute depuis la mort, exposition modérée à la Corruption, Critiques non guéris, membres non restaurés et exclusion des corps décapités.
- **Fléau des Démons** : E ≤ Intelligence du lanceur, bannissement ; Intelligence < E < 2 × Intelligence, Bmax divisées par deux pour le reste de la rencontre ; E ≥ 2 × Intelligence, aucun effet principal. Conserver les effets secondaires V5.
- **Main de Gloire à +6 DR** : quatre caractéristiques choisies parmi CC, CT, F, E, Initiative, Agilité ; même jet 3d10 pour tous les alliés ; Mouvement +2 ; Bmax inchangé malgré le bonus d’Endurance.
- **Bouclier de Saphery** : pas de plancher ajouté à sa Protection qui s’améliore. Un seuil calculé ≤1 réussit automatiquement sur 1d10.
- **Faux de Shyish** : interdire l’Avantage V5 aux Tests des Morts-vivants engagés contre le porteur. Cette clause ne supprime pas leur Élan.

## Catalogue et contrats

Le catalogue embarqué contient désormais **277 sorts**, sans Couronne de Flammes, L’Or des fous ni Fauche-démon. Les titres actuels Couronne de Flamme, Or des fous et Fléau des Démons sont conservés. Respecter la suppression des trois anciens intitulés ; ne pas créer d’alias historique pour eux. L’actualisation ne réajoute plus les sorts absents de la source et ignore les anciens caches contenant des entrées `retired`.

Créer des contrats explicites à partir de l’audit, sans parsing automatique des descriptions en effets actifs. Chaque contrat doit déclarer identité et empreinte source validée, paramètres V5 retenus, options de surpuissance, choix nécessaires, effets, durée/terminaison et conséquences durables à rappeler. Un changement de description doit empêcher l’application d’un ancien contrat sans nouvelle validation, tout en conservant la consultation du texte courant.

Partager les cinq paires de doublons identifiées dans l’audit et l’implémentation de la variante Jade. Ne pas fusionner Écaille d’acier/Robe scintillante sans résolution de l’identité. Ne pas confondre T’Essla’s Arc du supplément avec Coruscating Arc V5, ni Silence Ulgu/Hush avec Silence Arcane V5. Corriger les paramètres copiés et noms fautifs dans une proposition traçable, sans écrire dans la source publique.

Les 31 sorts signalés « suivi fiche » peuvent produire un récapitulatif de conséquence durable. Ils ne déclenchent pas une écriture automatique de PX, apprentissage, caractéristiques permanentes, équipement détruit ou Corruption dans les fiches. Les 15 miracles, prières, runes et sorts sombres/Chaos absents du catalogue demandent un cadrage distinct et ne sont pas couverts par cette livraison.

## Exigences d’intégration

Réutiliser le modèle de participants, la résolution, les commandes annulables et l’historique du lot 2. Inspecter notamment `js/core/resolution.js`, les modules de gestion d’état et leurs tests avant de choisir les points d’intégration. Ne pas ajouter un moteur parallèle qui contourne ces transactions.

La préparation doit produire un aperçu sans mutation. L’application doit être atomique, éviter le double lancement, vérifier la révision et enregistrer dés, décisions, consommation de réserve et effets. L’annulation doit restituer l’état exact. Rechargement, reprise, synchronisation et fonctionnement hors ligne doivent conserver les effets et réserves. Les modifications temporaires ne doivent pas être perdues ou appliquées deux fois lors d’une mise à jour de fiche.

Demander les données manquantes au MJ dans le flux : cibles d’une zone, trajectoire, traversées, profil de transformation/invocation, résistance, option ou jet secondaire. Aucun calcul de position ne peut être déduit sans données de carte. Un effet narratif validé devient un rappel avec portée et durée ; ne pas lui inventer un modificateur de combat.

Afficher des libellés français compréhensibles, valeurs avant/après, erreurs honnêtes et distinction entre rappel et application. Tester ordinateur/mobile, thèmes sombre/parchemin. Ajouter tout nouveau module aux assets du Service Worker ; adapter sa clé de cache. Garder la section Règles cohérente avec le comportement livré.

## Phases et conditions de validation

Livrer dans l’ordre **3.0 lancement/Focalisation**, **3.1 incidents/dissipation**, **3.2 effets communs et attributs**, **3.3 sorts du livre V5**, **3.4 suppléments et magie elfique**, **3.5 recette complète**. Pour chaque phase, fournir changements, tests, cas restant assistés et limites. Les 116 correspondances contrôlées au livre V5 incluent des doublons ; elles ne représentent pas 116 implémentations indépendantes.

La vérification de Codex portera au minimum sur :

| Domaine | Cas attendus |
|---|---|
| Réserve | BFM5 : réussite2DR →7 ; critique5DR →15 ; cumul →22 ; changement de type efface avant réussite ; pause/interruption ; réserve0 et perte supérieure au stock. |
| Lancer | Réussite juste au NI ; échec malgré grande réserve ; maladresse ; consommation une fois ; aperçu/annulation sans consommation ; réserve ajoutée au total ; excédent et plafond de surpuissance. |
| Incidents | Tous les intervalles des 40 résultats, bornes modifiées, Mineur>100, atténuations, Corruption, critiques et exceptions ; dés secondaires conservés. |
| Effets | Projectile/contact, vrais changements de caractéristiques, PA/Protection, soins, états maintenus, non-cumul, expiration de plusieurs sorts, transformation avec dégâts et Critiques au retour. |
| Arbitrages | Jade identique à l’original sauf Vent/attribut ; Apothéose avec Bmax faible ; Fléau exactement à E=Int et E=2Int ; Saphery à2+,1+,0 ; Main de Gloire quatre choix ; Faux contre Mort-vivant. |
| Dissipation | Quota par Round, opposition, progression étendue, reprise, propre sort, impossibilités et exceptions. |
| Fiabilité | Révision périmée, double clic, annulation, rechargement, synchronisation, source modifiée et ancien cache ; aucune écriture dans la fiche ; gestes réels sur mobile. |

Exécuter les tests adaptés à chaque phase, puis `npm test` pour la recette finale, `npm run test:references-browser` et les recettes de combat pertinentes. Ajouter des scénarios navigateur reproductibles pour le nouveau flux magique et le hors ligne natif. Les tests qui reproduisent seulement une formule du code ne suffisent pas : vérifier les conséquences sur l’état et les gestes réels. Les contrôles cloud nécessaires doivent rester dans l’émulateur local, sans toucher la production.

Fournir à Codex : liste des fichiers modifiés, explication des choix d’intégration, commandes exactes et résultats, scénarios navigateur, couverture des 277 identités avec statut explicite, incertitudes restantes et exemples chiffrés. Aucun effet ne doit être déclaré automatisé tant que son chemin d’application n’est pas relié et vérifié.

## État de départ vérifié par Codex

Les rappels de magie, les 40 résultats d’incantations imparfaites V5 et la recherche sont déjà corrigés localement. L’affichage et le cache hors ligne ont une recette ciblée sur Edge en ordinateur/sombre et mobile/parchemin. Les trois intitulés retirés sont supprimés du catalogue de travail ; des tests couvrent le contenu livré, l’actualisation et un ancien cache. **Aucun nouveau contrat de sort ni moteur de lancement V5 n’a été développé pendant ce cadrage.**

Les preuves temporaires sont dans `tmp/lot3/`, notamment `rules-receipt.json`. Le cadrage et cet audit constituent la base de travail ; ils ne remplacent pas la recette de l’implémentation produite par Gemini.
