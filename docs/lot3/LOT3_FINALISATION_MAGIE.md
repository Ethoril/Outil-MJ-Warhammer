# État du chantier V5 — finalisation de la magie

## Bilan courant — clôture locale du 14 octobre 2026

Application **3.15.0**, branche **codex/lot2-talents-v5**, HEAD **fb0f280150cdbdab1af220163abfaa491e2156ee**. Travail non commité ; main E:/Outil MJ Warhammer sur 08ce45d. [Rapport courant](LOT3_RAPPORT_CLOTURE.md), [recette 3.15](LOT3_RECETTE_3_15.md), [journal pour le MJ](LOT3_JOURNAL_3_15_0.md).

Les lots de contrats 1 à 5B et le catalogue V5 ont reçu leurs corrections et retours. Le suivi courant porte **277 sorts : 165 conformes aux scénarios, 49 avec données MJ nécessaires, 63 rappels**. Ces statuts décrivent le traitement et les preuves nommées, pas une certification de toutes les situations de campagne.

Les **54 clauses de suivi des talents** sont réparties en **9 conformes, 18 avec données MJ nécessaires, 5 rappels, 22 hors périmètre, 0 anomalie, 0 non vérifié**. Imprégné magic:2 et L’esprit sur le corps magic:2 sont maintenant « donnée MJ nécessaire » ; Résistance à la Magie magic:2 est conforme aux scénarios D-07. [Preuves de clôture](LOT3_PREUVES_CLOTURE.json). Chance reste l’adaptation V5 locale du Resolve de HEPG p.101, explicitement distincte de la source V4.

Le catalogue public téléchargé le 14 octobre est aligné : Magie identique octet pour octet ; Talents corrigé pour Lileath et Petit. Lileath reste actif après actualisation. Les quatre autres descriptions avec « = » sont identiques à la feuille. Petit ne déclenche pas de Frappes Mortelles contre un survivant ; ce comportement était déjà supprimé dans le moteur et le nouveau scénario le confirme.

La couverture générale régénérée conserve **206 identités / 131 contrats du lot 2** et **531 clauses** : 286 automatiques, 123 assistées, 62 rappels, 41 fiches, 10 exclusions, 9 différées. Le registre magique, les textes corrigés de Lileath et le générateur concordent ; deux générations sont identiques.

Le paquet courant comprend **153 assets applicatifs**, sans tests, PDF ou export privé. Résultats définitifs de chaque commande dans le rapport et tmp/lot3/cloture-*. La seconde relecture indépendante sur une copie reste à Claude. Les ingrédients, miracles, rune de maître, Chaos, techniques différées, fiches/PX et faits spatiaux gardent les limites détaillées ci-dessous.

## Bilan historique — 10 octobre 2026

Les nombres et preuves qui suivent décrivent la finalisation initiale 3.14.0. Ils restent conservés comme historique ; le bilan ci-dessus prime pour la reprise.


10 octobre 2026. Version locale **3.14.0**, branche **codex/lot2-talents-v5**, worktree **lot2-combat-v5**, HEAD **fb0f280**. Modifications non commitées. Le checkout principal reste sur **08ce45d**. Aucun push, fusion, déploiement, changement du catalogue public ou écriture dans les fiches.

## État des lots

| Partie | État local |
| --- | --- |
| Lot 2, combat et talents, étapes 2.0 à 2.5 | Terminé dans le périmètre convenu ; recette historique conservée. |
| 3.0, Focalisation et incantation | Raccordé au store, à l’interface et aux commandes persistantes annulables. |
| 3.1, incidents et dissipation | Tables V5, dés secondaires, talents de mitigation, réactions et dissipation persistante raccordés. |
| 3.2, effets communs | Blessures, soins, États, PA, Protection, caractéristiques, modificateurs de Tests, durées, attributs et retour de transformation raccordés. |
| 3.3 / 3.4, sorts du livre et autres familles du catalogue | 277 contrats présents et épinglés à leur description source ; choix et rappels déclarés par contrat. |
| 3.5, recette de l’intégration | Terminé : 1 058 tests Node, parcours Edge, deux clients avec services cloud locaux, paquet PWA hors ligne. [Preuves et commandes](LOT3_RECETTE_3_5.md). |
| Miracles, bénédictions et prières divines | 15 miracles inventoriés seulement ; relecture et adaptation mécanique à faire dans un chantier distinct. |

La recette valide le moteur commun, les raccordements et les cas représentatifs documentés. Elle ne constitue pas une certification individuelle de toutes les clauses des 277 sorts ou des 206 talents. Les 116 correspondances directes au livre V5 comprennent des doublons ; les autres descriptions restent des adaptations des suppléments ou du catalogue.

## Travail final réalisé par Codex

- Ingrédients entièrement exclus : aucun stock, coût, consommation ou atténuation. Même un ancien champ « ingredient » ne réduit plus un incident. La section Règles explique cet arbitrage.
- Réserve commune aux huit Vents et réserve de Haute Magie, une seule remplie ; gains cumulés DR + BFM, critique DR + 2 × BFM. Une tentative réelle consomme la réserve, y compris après échec ou dissipation.
- Diction instinctive, Harmonisation aethyrique, assistants, Bénédiction de Lileath, Mage de guerre, Résistance et Défiance magiques, Imprégné, Perception de la Magie et méditations raccordés avec acquisitions canoniques et sources exactes. Leur description seule n’active aucun bonus.
- Haute Magie : choix d’un attribut, dé d’épuisement requis, blocage des nouveaux Tests pendant l’épuisement, récupération payée, déploiement et consommation des runes des Cadai. Chaque relance utilise un nouveau dé saisi. Incantation, Focalisation, incident, épuisement et Test de Corruption disposent de leurs chemins ; une relance ratée consomme aussi sa rune.
- Dissipation en réaction : visibilité, portée et quota par Round ; dissipation persistante : Action, progrès du Test étendu, bonus sur son propre sort, retrait groupé de toutes les couches du même lancer.
- Les caractéristiques temporaires affectent les compétences importées et les Tests suivants. Une caractéristique déjà actualisée ne reçoit pas deux fois le bonus. PA, réductions de dégâts, bonus de dégâts d’arme et Protection interviennent dans le combat ordinaire.
- Les effets de Main de Gloire et les attributs appartiennent au même groupe de lancer ; expiration et dissipation restaurent leurs valeurs. Forme bestiale et sa variante Jade partagent le même traitement ; Mouvement, retour de forme et dégâts subis sont conservés correctement.
- Les pénalités temporaires d’incident agissent puis expirent. La Fortune est Capricieuse impose ses doubles et interdit la mitigation. Les Blessures directes des attributs sont visibles dans l’aperçu et soumises à la Protection.
- Cibles multiples : plafonds du contrat et surpuissance payée contrôlés ; une zone peut inclure alliés et adversaires. Les jets et décisions propres à chaque cible restent séparés. La sélection reste ouverte après une case cochée, y compris sur téléphone.
- Application atomique, revalidation de la révision et des sources, refus d’un rejeu déjà appliqué, Undo et rechargement. Le cloud ne diffuse pas les journaux privés. Un état rechargé identique conserve Undo ; un changement externe réel ferme cet historique.

La correction antérieure de [Destruction des Arcanes](LOT3_CORRECTION_DESTRUCTION_ARCANES.md) est conservée : coûts indépendants, localisations saisies, Tests secondaires et dégradation physique durable.

## Couverture exacte

Les **277 contrats** reprennent le tri de l’audit : **123** effets principalement calculables, **132** demandant des données ou choix du MJ, **22** principalement narratifs. **31** identités ont un suivi fiche transversal. Ces nombres décrivent le traitement principal, pas un nombre d’effets entièrement automatiques certifiés.

Les **206 talents** ont maintenant **530 clauses de traitement** : **285 automatiques**, **122 assistées**, **63 rappels**, **41 gérées par les fiches**, **10 exclusions de bonus de caractéristiques**, **9 différées à un autre périmètre**. Les 131 contrats du lot 2 restent présents ; les 28 talents précédemment réservés au lot 3 disposent en plus d’un registre de traitement magique. Sur ces 28 identités, 19 ont désormais leurs clauses classées moteur, fiche ou rappel ; 9 conservent une clause différée, détaillée ci-dessous.

Les statuts actifs dépendent des descriptions publiques épinglées. Un texte modifié nécessite une nouvelle validation ; les effets magiques de talent non validés reviennent aux rappels. Le générateur de couverture est reproductible depuis ces sources publiques.

## Ce qui reste hors du périmètre livré

| Chantier distinct | Talents avec une clause différée |
| --- | --- |
| Miracles / bénédictions | Béni, Invocation, Haine sacrée. |
| Artisanat et magie runiques | Magie des runes, Magie des Runes de Maître. Les runes des Cadai sont déjà prises en charge par la Haute Magie. |
| Techniques de combat elfiques | Danse des épées, Dons de Khaine. |
| Magie sombre / Chaos absente du catalogue audité | Magie du Chaos, Pacte de l’âme. |

La progression, les achats et PX, les permissions d’apprentissage, les pertes permanentes et la Corruption restent dans les fiches. L’outil conserve des reçus de suivi et ne réécrit pas ces données.

Le MJ fournit les faits spatiaux, participants d’une aire, résistances, profils et dés secondaires ; le moteur ne déduit aucune géométrie de carte. Les profils animaux proposés doivent être choisis et vérifiés par le MJ : cette recette éprouve le remplacement et le retour du profil, pas l’ensemble du bestiaire. Les clauses de traits et propriétés qualitatives qui ne disposent pas d’un automatisme de combat restent visibles dans les effets et reçus ; par exemple le bonus de dégâts d’une arme est calculé, tandis que ses propriétés Magique / Enflammée demandent le contexte de la cible et le traitement de la règle concernée. Les déplacements, objets, météo, repos et conséquences de fiction restent assistés ou rappelés selon leur contrat.

La publication de la version locale reste à décider séparément. Le paquet 3.13.0 du lot 2 est conservé comme historique ; le paquet courant et sa recette sont dans **tmp/lot3/**.

Pour la relecture indépendante : [document de suivi destiné à Claude](LOT3_PASSATION_RELECTURE_CLAUDE.md).
