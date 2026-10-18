# Relevé lecteur L06 — commandements et accès non humains

État de ce relevé : source E1 confrontée et intégrée le 18 octobre 2026; contrôle distinct dans DIVIN_L06_COMMANDEMENTS_CONTROLE.md. Aucun comportement runtime n’est validé par ce relevé. Les 50 commandements ci-dessous sont les 50 puces imprimées des dix cultes humains, un identifiant par puce (5 × 10). Les formulations françaises sont des paraphrases éditoriales locales; elles ne remplacent pas le texte source et ne décrivent aucune règle runtime.

## Périmètre et preuves

- Source : *Livre de base V5 EN v2*, identifiant corpus `L06`, SHA-256 `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`.
- Lecture du texte extrait des pages imprimées 203 et 205–216, confrontée aux rendus visuels individuels disponibles. J’ai contrôlé les folios visibles et les sections ciblées; les pages 205–214 présentent chacune cinq puces sous `Strictures`, la page 215 porte les sections de prêtres nains, elfiques et halflings, et la page 216 est un tableau comparatif.
- Les pages 203 et 205–216 étaient déjà incluses dans le total du plan (73 lectures). Ce travail de reprise et de décomposition ne crée aucune nouvelle lecture comptable et ne ferme aucun livre.
- La lecture principale antérieure et une relecture indépendante des pages ciblées sont conservées dans les notes voisines. Le principal a effectué sa propre confrontation indépendante des mêmes pages; son contrôle des données est effectué; il ne certifie aucune conséquence mécanique.
- Aucun PDF, texte anglais long ou rendu n’est ajouté au dépôt. Les références de données gardent le hash L06, le folio et le nom de section.

## Les 50 identités de commandement

Chaque ligne correspond à une seule puce source et à un identifiant stable dans `L06-strictures.mjs`. Les sous-clauses ne créent pas de nouvelles identités; elles rendent visibles les obligations ou exceptions liées qui figurent dans une même puce.

| Folio | Culte | Repères français éditoriaux des cinq puces |
|---:|---|---|
| 205 | Manann | 1. Sifflement et jurons proscrits en mer/sur sol sacré; 2. protection des albatros; 3. première prise consacrée; 4. pièce d’argent et poisson au sanctuaire de Manann rencontré; 5. traque des serviteurs de Stromfels. |
| 206 | Morr | 1. Respect et protection des morts; 2. traque des nécromanciens et morts-vivants; 3. attention aux rêves; 4. service funéraire non refusé; 5. pas de participation au relèvement des morts sans autorisation de Morr. |
| 207 | Myrmidia | 1. Honneur et dignité; 2. respect des prisonniers de guerre et épargne de ceux qui se rendent; 3. aucune clémence envers l’ennemi de l’Humanité non repenti; 4. obéissance aux ordres honorables; 5. protection des faibles contre les horreurs de guerre. |
| 208 | Ranald | 1. Un dixième des pièces pour Ranald; 2. pas de dénonciation aux autorités; 3. violence sauf autodéfense interdite; 4. préférence pour la liberté face à l’oppression; 5. distinction entre absence d’honneur des voleurs et honneur des Ranaldans. |
| 209 | Rhya | 1. Défense des familles, enfants et cultures; 2. absence de honte du corps; 3. vie sacrée avec exception pour protéger une autre vie; 4. ne pas juger les amours d’autrui; 5. interruption de l’œuvre du Prince de l’Excès. |
| 210 | Shallya | 1. Assistance sans jugement selon le besoin; 2. ne pas tuer sauf autodéfense; 3. lutte contre la pestilence et sa propagation; 4. service continu sans indulgence personnelle; 5. pas de prise d’armes, la canne et le courage suffisent. |
| 211 | Sigmar | 1. Obéissance aux ordres; 2. aide aux nains et absence de nuisance; 3. unité impériale; 4. allégeance au trône; 5. lutte sans clémence contre les groupes désignés par la source. |
| 212 | Taal | 1. Remerciement pour chaque animal pris; 2. une semaine annuelle de solitude dans la nature; 3. écart de l’armure métallique et port des peaux de Taal; 4. confiance dans ses compétences plutôt que dans poudre/technologie froide; 5. animaux épargnés sauf autodéfense, nourriture ou sacrifice. |
| 213 | Ulric | 1. Obéissance aux supérieurs; 2. défense de l’honneur et acceptation des défis; 3. honnêteté, sauf embuscade, sans ruse/tromperie; 4. peaux de loups tués avec une arme fabriquée par le fidèle; 5. armes à poudre noire jugées impropres aux fidèles. |
| 214 | Verena | 1. Arbitrage accepté si demandé; 2. vérité sans crainte ni faveur; 3. protection du savoir; 4. combat seulement comme dernier recours; 5. ne pas servir l’injustice ou l’hérésie. |

## Règles d’accès de prêtres non humains (p. 215)

Trois identités `common-rule` distinctes sont préparées, avec les formulations limitées à leur passage source :

- **Nains, dieux ancêtres** (`L06:common-rule:access:dwarf-ancestor-gods`) : pour cette dévotion, la source écarte Nun, Priest et Warrior Priest et propose une carrière appropriée imitant le dieu; elle donne Grimnir comme exemple avec Slayer/Cult of the Slayer ou Soldier. Cela ne devient pas une interdiction générale de toute carrière de prêtre pour tous les nains et tous les cultes.
- **Prêtres elfes** (`L06:common-rule:access:elven-priests`) : hauts elfes et elfes sylvains ont des prêtrises mais pas de Blessings ni Miracles; Wizard et un Lore approprié représentent la magie associée au dieu. Le relevé ne leur ouvre pas une voie runtime non décrite.
- **Halflings** (`L06:common-rule:access:halfling-priests`) : ils n’ont pas vraiment de prêtres ni de temples et n’exercent pas une carrière dédiée exclusivement à un dieu; un ancien local peut faire ce qui est requis pour apaiser une divinité au nom de la communauté après consultation. Ce paragraphe n’est pas transformé en interdiction mécanique de tout effet divin.

Les trois notices pointent vers l’identité existante `L06:common-rule:little-prayers` p.203 pour contexte. Elles ne la dupliquent pas, ne fixent aucun seuil propre à Pray et n’élargissent pas la procédure décrite. La présence de Pray peut justifier une hausse de chance à l’appréciation du MJ; aucune formule n’est créée ici.

## Exclusions et limites

- P.204 et p.216 : les tableaux d’offrandes et informations cultuelles restent des dépendances contextuelles. Ils ne définissent ni tarif obligatoire, ni débit automatique, ni coût universel d’une prière. Le cas p.205 Manann conserve seulement la formulation de la puce source.
- Les pénitences, rêves, services funéraires, calendriers, fréquences, autorisations, conséquences d’une violation et exceptions de créatures ne sont pas transformés en procédures de jeu supplémentaires.
- Des verbes pouvant avoir une incidence mécanique (traquer, protéger, guérir, combattre) restent paraphrasés comme obligations de culte. Cette tranche ne fournit pas de déclencheur, test, durée, sanction ou effet chiffré commun; aucun n’est inventé.
- « Foul witches » sur p.211 est rendu comme un groupe désigné par la source et reste un point de traduction éditoriale à revoir; le libellé français ne tranche pas son équivalent de jeu.
- Les identités restent `source-read` et `partial-e1`. La présence de données dans ce relevé n’équivaut ni à `sourceComplete`, ni à un développement, un test, une intégration ou une certification runtime.

## Fichiers préparés et rattachement proposé

`L06-strictures.mjs` exporte 50 identités `stricture`, trois règles `common-rule`, et `auditIdentities` pour un futur raccordement direct au pipeline E1. Chaque commande conserve son ID et un `sourceRef` unique `{bookId,fileSha256,physicalPage,printedPage,section}`; les éléments mélangés restent des `subClauses`. Tous les statuts de développement/exécution restent ouverts. Aucun générateur, sortie générée, catalogue ou code runtime n’a été modifié.

Comptage local de la source préparée : **50 commandements + 3 règles d’accès = 53 identités**. Cela décrit le contenu du module préparé, pas les compteurs du registre intégré, et ne change pas le total de lectures déjà établi.

## Raccordement du 18 octobre 2026

Les 53 identités sont maintenant raccordées par tools/divine-audit-data.mjs au générateur E1, via une projection stricte qui garde les détails français et sous-clauses dans le module source. Le registre généré compte 133 identités partielles, 73 lectures et 60 associations. Les corrections Rhya/Taal/Sigmar et champs unresolved ont été contrôlés par un autre lecteur. Les paragraphes de préparation ci-dessus décrivent l’état auteur avant ce raccordement.
