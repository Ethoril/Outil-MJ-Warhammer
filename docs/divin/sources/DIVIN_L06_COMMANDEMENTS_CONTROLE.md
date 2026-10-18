# Contrôle indépendant — commandements et accès non humains L06

Date du contrôle : 2026-10-18  
Rôle : contrôleur indépendant de l’intégration E1/E2 documentaire  
Source : *Livre de base V5 EN v2*, L06, SHA-256 `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`.

## Résultat

Les pages imprimées 203 et 205–216 ont été confrontées au texte extrait et aux rendus visuels. Les pages 205–214 contiennent bien cinq puces `Strictures` par culte, soit 50 commandements, avec une identité distincte par puce. La page 215 contient les trois notices d’accès nain, elfe et halfling. Les folios, sections et références L06 du module source sont cohérents.

Les trois corrections demandées sont présentes dans `L06-strictures.mjs` : Rhya n°3 autorise explicitement le tort uniquement pour protéger une autre vie déjà en danger; Taal n°1 porte sur chaque animal pris ou prélevé, sans réduire la prise à la capture; Sigmar n°5 ne parle pas de dénonciation. Le résumé français « sorciers malfaisants visés par la source » reste une paraphrase éditoriale prudente; `foul witches` est conservé comme repère de source dans les sous-clauses et son équivalent de jeu reste à arbitrer.

Les accès p.215 restent circonscrits à leur texte. La limitation de carrière naine concerne la dévotion aux dieux ancêtres. Les elfes disposent de prêtrises sans Blessings ni Miracles; la source propose Wizard et un Lore approprié pour représenter cette magie. Pour les halflings, le texte décrit l’absence habituelle de prêtres et de temples, puis le rôle possible d’un ancien après consultation; il n’en découle aucune interdiction générale des effets divins. Les trois identités renvoient à Little Prayers p.203 sans dupliquer cette identité ni créer un seuil propre à Pray.

La page 216 est un tableau comparatif des dieux, domaines, fidèles, offrandes et remarques. Elle ne fixe ni prix obligatoire, ni débit automatique, ni coût universel de prière. La mention particulière de Manann p.205 reste un commandement propre à ce culte.

## Intégration et vérifications

Le module fournit 50 identités `stricture` et trois `common-rule`. L’export destiné à l’audit est projeté sur les champs déjà acceptés par `validateIdentity`; les résumés, sous-clauses et notes éditoriales restent dans le relevé source et n’élargissent pas le schéma du validateur. Les champs inconnus `frenchName`, `aliases` et `actorKinds` sont explicitement déclarés dans `unresolvedFields` pour les commandements; pour les notices d’accès, les noms et alias restent inconnus tandis que `tradition` et `actorKinds` sont renseignés.

Le registre d’audit compte désormais 133 identités partielles E1 : 19 `blessing`, 60 `miracle`, 4 `common-rule` et 50 `stricture`. Le total de lecture demeure 73 pages effectivement classées par rôle premier et 73 par rôle indépendant. Les associations restent à 60; les clauses détaillées et clauses prouvées mécaniquement intégrées restent à zéro.

Le test indépendant était rouge avant raccordement : le module L06 et les 53 lignes intégrées manquaient encore. La suite indépendante des commandements et les deux suites d’audit ont ensuite passé : **39 tests réussis, 0 échec** avec `node --test tests/divin-v5-strictures-independent.test.js tests/divin-v5-audit-independent.test.js tests/divin-v5-audit.test.js`. Les assertions d’audit héritées ont été ajustées de 80 à 133 identités et de 1 à 4 règles communes, conformément au registre ajouté. Les premières passes de contrôle ont aussi révélé une exigence trop stricte qui imposait le terme anglais `foul witches`, et le résumé Rhya à préciser; ces points sont corrigés avant la passe verte.

## Limites et suites

Ce contrôle porte sur les identités et leur traçabilité documentaire. Il ne certifie ni une décomposition complète en clauses, ni le développement E2, ni une intégration ou un comportement runtime. Aucun test de règle de jeu ou effet mécanique n’est revendiqué. Toutes les identités demeurent `source-read` et `partial-e1`; aucun livre n’est clos par ces comptes.

Deux documents d’état adjacents doivent être réalignés par le principal : `DIVIN_ETAT_PLAN.json` conserve encore l’instantané précédent à 80 identités (1 `common-rule`, 0 `stricture`), alors que la synthèse régénérée affiche 133 (4 `common-rule`, 50 `stricture`). Le relevé `DIVIN_L06_COMMANDEMENTS_LECTEUR.md` porte encore le libellé antérieur indiquant que la validation principale est attendue. Ces écarts éditoriaux ne changent pas le résultat des tests exécutés, mais laissent la passation contradictoire tant qu’ils ne sont pas résolus.

## Erratum de passation — 18 octobre 2026

Les deux écarts éditoriaux signalés ci-dessus sont résolus dans les documents courants : DIVIN_ETAT_PLAN.json reprend 133 identités partielles (4 common-rule et 50 stricture), et le relevé lecteur indique la confrontation et l’intégration principales réalisées. Le paragraphe antérieur reste conservé comme constat de la passe de contrôle avant ces mises à jour. Ces corrections ne changent ni les 73 pages comptées, ni les limites source/runtime. Un reçu horodaté réel de la nouvelle vérification du PDF L06 est conservé dans tmp/divin/campaign-l06-hash-receipt.json.
