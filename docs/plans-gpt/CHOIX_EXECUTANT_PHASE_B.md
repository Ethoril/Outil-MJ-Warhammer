# Choix de l’exécutant — Phase B

21 octobre 2026. Relecture MJ groupée possible ; les arbitrages du 21/10 ne sont pas rouverts. Aucun fichier d’arbitrage modifié.

| ID | Source | Question | Choix | Raison | Alternative |
| --- | --- | --- | --- | --- | --- |
| B-C01 | Q12 ; L06 p.217-218 | Zéro Péché protège-t-il aussi d’une maladresse ? | Oui dans la tentative B01, conformément à « plus aucun déclenchement ». Tentative retirée et lot bloqué à cause des tests existants ; le comportement humain historique reste présent dans la livraison. | Le MJ est prioritaire sur la source imprimée. | Exempter seulement le chiffre des unités, ce qui ne respecterait pas Q12. |
| B-C02 | Q10 ; L08 p.93-99 ; L02 p.51 | Comment distinguer un culte elfe sans tester la race du personnage ? | Liste d’identités Cadai/Cytharai sourcées ; Mathlann, seul culte elfique actuellement invocable dans le registre, est exempt automatiquement. « Khaine » non qualifié reste le culte humain ; le nom elfique complet et les qualifications explicites « elfique/elfe » identifient le culte elfe. | Le même nom a un usage humain ; exempter tout porteur d’un nom homonyme supprimerait une règle humaine. | Exempter selon la race, interdit par Q10 ; ou exempter Khaine humain par simple homonymie. |
| B-C03 | Q10 ; modèle existant extensions.v5.divine.sin | Faut-il effacer un total de Péchés hérité à l’invocation d’un culte elfe ? | Non. Total ignoré pour cette prière ; reçu à zéro et exemption sourcée. Le total stocké reste intact, notamment si la fiche possède aussi un culte humain. Attribution au culte elfe refusée ; sur fiche mixte, sélection explicite du culte humain acquis. | Une exemption ne constitue pas une absolution du culte humain ; aucune migration destructive de fiche demandée. | Mettre le total partagé à zéro, ce qui effacerait des Péchés humains. |
| B-C04 | REGLES_COMMUNES_GPT.md, interdiction sw.js ; test sw.test.js | Un nouveau module de cultes imposerait une modification interdite du précache. | Fonctions pures regroupées dans v5-divine-engine.js déjà mis en cache, importées par Store et panneau. Aucun module runtime supplémentaire, ni modification de sw.js. | Le premier passage complet a détecté le module non précaché : 3318/3319. Correction de structure dans les fichiers autorisés, sans modifier le test. | Modifier le service worker, interdit par le brief ; dupliquer la règle dans l’interface et le Store. |

## Limites conservées

- La liste de cultes n’ouvre ni accès, ni prière nouvelle. Les identités doivent correspondre à celles de la fiche/du contrat ; aucun devinement d’un nom libre ambigu. Les autres cultes elfes ne disposent pas encore de contrats invocables dans ce registre ; ils ne sont pas présentés comme implantés par B02.
- La religion d’un personnage ordinaire sans talent d’accès n’est pas déduite de son espèce. Une demande explicitement liée à un culte elfe est toujours refusée pour l’attribution de Péchés.
- Les sanctions historiques existantes ne sont pas supprimées ou réécrites : la prière elfique ignore le déclenchement de nouveau Courroux, sans modifier les couches déjà enregistrées par ailleurs.
- B01 ne sera repris qu’avec adaptation explicite du plan et des fixtures indépendantes, sans affaiblissement des assertions, ou après création d’un autre chemin source-validé vers les résultats bas. La preuve détaillée est conservée sous tmp/gpt-phase-b/BLOQUE-B01.md et résumée dans le rapport commité.

## Actualisation, session 2 du 21 octobre

B-C01 est désormais confirmé par le complément MJ : aucun Courroux à zéro, ni unités zéro ni maladresse. Les lignes 01–10 restent sourcées au registre et marquées inaccessibles. La migration des fixtures est autorisée ; les réserves ci-dessus décrivent la première session, plus le comportement livré après Q12. Les sanctions historiques 06–10 restent lisibles et conservent leurs contrôles de preuve et de durée : cet arbitrage ne supprime pas une ancienne sauvegarde.

Migration supplémentaire révélée par le ciblage Q12 : le contrôle de seconde occurrence des Leçons réattribue explicitement un Péché après le décrément de la première occurrence et utilise un jet de table de 1 (+10). Les assertions de refus de cumul/remplacement, absence de mutation et conservation de la première couche restent identiques.

### B03 — Blessures et Résistance

| ID | Source | Question | Choix | Raison | Alternative |
| --- | --- | --- | --- | --- | --- |
| B-C05 | L06 V5 EN v2 p.218, lecture visuelle par l’exécutant ; plan B03 | La ligne 51–55 dit « Wounds » sans répéter « ignoring your Toughness Bonus and Armour Points ». | Blessures directes, comme la famille B03 prévue au plan ; service existant de Blessures directes. 36–40 : 1 + Péchés ; 51–55/71–75 : d10 + Péchés ; 81–87 : 2d10 + Péchés. | La ligne chiffre des Blessures subies, sans attaque, localisation ni score de dégâts permettant une mitigation ordinaire. Les autres lignes explicites confirment cette lecture de la famille. | Appliquer une mitigation de dégâts ordinaires, qui exigerait des données non demandées par cette ligne. Choix documenté pour relecture groupée, sans prétendre à une lecture indépendante. |
| B-C06 | L06 p.218 ; services V5 de Tests et d’acquisition des États | Comment résoudre Résistance et Sonné sans créer une seconde règle d’État ? | Test passif sur la compétence Résistance résolue ou son score de base E, difficulté source +2/0/−1/−2, contexte réel des États et effets magiques. Échec : 1 Sonné ; 81–87 ajoute un par DR négatif. Acquisition canonique, immunités et conversion au-delà du BE conservées. | Réutilisation du moteur V5 commun ; aucun coût d’Action inventé, aucun Inconscient V4 ajouté. Quantités depuis les Péchés avant décrément. | Ajouter une Action de Résistance, ignorer le contexte ou imposer l’Inconscient V4. |

01–05 reste inaccessible selon Q12 : aucun nouveau parcours de Calme n’est annoncé. Les 31 lignes et leurs sources restent au registre. L’adaptateur B03 réside dans v5-divine-store.js, déjà précaché, pour la même contrainte que B-C04. Un même identifiant porté par un État encore présent bloque une nouvelle occurrence, même après éviction du reçu du journal.
