# Rapport de cohérence feuille ↔ fiches ↔ outil — 28 octobre 2026

## Résultat et limites

Comparaison en lecture seule sur les copies détachées : outil `gpt/phase-f2` à `738b5531cab317fc6a63a1071a2f58901f71d1a4`, fiches `gemini/armes-v5` à `d9d62a57dbc51e889a4c829669f3abfad788756b`. La feuille « Aides de jeu » est l'autorité demandée. Aucun import, modification de dépôt, commit ou publication. Les résultats ci-dessous distinguent une divergence établie d'une candidature à vérifier par le MJ.

**Contrôle complémentaire :** chaque cellule a été comparée directement aux objets, indépendamment du constructeur partagé. Le registre détaillé des 1 421 cellules est dans `coherence/verification-independante.json`. La liste des qualités et paramètres a été confrontée séparément aux mentions de la feuille ; les huit munitions ont été vérifiées dans le livre. Les deux derniers libellés de talents Bon sens et Vivant ont une source et une nature non établies ; ils restent explicitement à vérifier, sans source inventée.

| Catégorie | Feuille | Fiches | Outil | Résultat |
|---|---:|---:|---:|---|
| Armes corps à corps | 83 lignes | 83 correspondances | 83 correspondances | Aucun rapprochement absent ni ambigu. |
| Armes à distance | 74 lignes | 74 correspondances | 74 correspondances | Plus huit munitions hors feuille dans chaque catalogue, listées plus bas. |
| Armures | 46 lignes | 46 correspondances | 46 correspondances | Aucun rapprochement absent ni ambigu. |
| Équipement, total | 203 lignes | 211 objets | 211 objets | 155 armes, 10 munitions, 41 armures et 5 boucliers ; huit ajouts déclarés du livre de base. |
| Talents feuille | 207 lignes | 207 entrées de snapshot | 207 entrées de snapshot | Noms, limites, descriptions, source et spécialisation identiques après parsing ; les tests concernés font partie de la description comparée, ils ne forment pas un champ structuré séparé. |
| Talents du référentiel publié | — | 470 entrées | 470 entrées | 16 libellés non résolus initialement : 3 alias de talents existants, 5 traits de créature, 6 talents sourcés et 2 libellés dont la nature reste à établir. |
| Compétences | aucun onglet | 294 lignes `skills.json` ; 299 entrées publiées ; 25 de base | 299 publiées, 2 supplémentaires ; 25 de base | Référentiels publiés identiques ; écarts internes aux sources de fiches listés ci-dessous. Les deux supplémentaires de l'outil correspondent à des lignes Lustria des fiches. |
| Carrières | 558 lignes de rang | 136 carrières, 558 rangs | — | Chaque rang se rapproche par carrière, rang et titre ; aucun rang supplémentaire détecté. Aucune référence de talent ou compétence non résolue dans les deux référentiels après normalisation et alias. |

## Méthode et éléments non représentés

Les 203 lignes ont été rapprochées par identité construite depuis onglet, catégorie et nom, avec le comportement de génération et les correspondances historiques du catalogue ; le fichier `audit-details.json` conserve les lignes et leurs identifiants. Les noms et catégories identiques ne sont pas fusionnés entre onglets : notamment les deux Gantelets à pointes sont deux objets. Les objets sans ligne figurent dans le tableau ci-dessous. Les champs JSON confrontés sont nom, catégorie, dégâts, allonge, portée, PA, localisations, mots-clés avec paramètres, et notes ; les notes contiennent aussi les mentions Discrétion et Perception. Une deuxième lecture directement depuis les cellules brutes vérifie ces valeurs sans appeler le constructeur, les deux objets étant rapprochés par onglet, nom exact et catégorie.

Les trois exports n'ont pas de colonnes Encombrement ni Mains. Ils possèdent Prix et Disponibilité : les 203 lignes les renseignent, mais ces valeurs ne sont pas conservées dans les deux objets JSON. Elles sont toutes listées individuellement plus bas. Le prix d'une ligne n'est pas une valeur manquante de la feuille : l'action est de décider si les catalogues doivent l'exposer, non de corriger la feuille.

Pour les compétences, `skills.json`, `referentiel-public.json`, `skill-names.js`, `basic-skills.js`, `published.skills`, `additionalSkills` et `FICHE_BASIC_SKILLS` ont servi au rapprochement. Les six divergences figurant ci-dessous concernent des alias qui convergent vers une autre entrée publiée : elles demandent un arbitrage sur les correspondances plutôt qu'une correction automatique. Les tables de base sont identiques. La feuille n'ayant pas d'onglet compétences, il n'existe pas de CSV de correction de cet onglet.

Pour les carrières, les listes de compétences et talents ont été segmentées en respectant les parenthèses, puis rapprochées des rangs du catalogue. Les références ont été évaluées dans les deux résolveurs, avec normalisation des apostrophes et alias de `skill-names.js` ; les choix ouverts sont traités comme tels. Les libellés absents du snapshot de talents mais présents dans le référentiel publié ne sont donc pas considérés comme absents des deux référentiels. La comparaison des listes dans les deux sens ne trouve aucun élément supplémentaire non rapproché dans les 558 rangs des fiches, après résolution des choix et alias.

## Espèces et écarts voulus du brief

| Objet | Champ | Décision MJ / feuille | Fiches | Outil | Classe | Action |
|---|---|---|---|---|---|---|
| Halfelin | Mouvement ; blessures | 3 ; BF + 2 BE + BFM | conforme | 4 ; BF omis | défaut outil | Vérifier intégration du lot espèces. |
| Ogre | Blessures | total ×2 | total ×2 | total simple | défaut outil | Vérifier intégration du lot espèces. |
| Gnome | Mouvement ; blessures | 3 ; 2 BE + BFM | conforme | repli 4 ; BF inclus | défaut outil | Vérifier intégration du lot espèces. |
| Elfe noir, Elfe des mers | Mouvement | 5 | 5 | repli 4 | défaut outil | Vérifier intégration du lot espèces. |
| Skink | Mouvement ; blessures | 6 ; formule de la fiche 2 BE + BFM | conforme | repli 4 ; BF inclus | défaut outil | Vérifier le lot espèces et la formule retenue par le MJ. |
| Espèce inconnue | Signalement | signalée | signalée, mouvement indéterminé | repli silencieux à 4 | défaut outil | Vérifier intégration du lot espèces. |
| Poivrière | Astérisque répétition | 4* | 4 sans astérisque | 4* | voulu | Conserver la décision. |
| Javelot Blackbriar | Inflige dans `Spécial` | texte conditionnel | note présente | pas de mot-clé Inflige | voulu | Conserver la décision MJ. |
| Fléchette, Arc elfique, Plastron de cuir bouilli, Cape ; anciens mots-clés V4 | conservation historique | conservation voulue | selon catalogue | selon catalogue | voulu | Ne pas proposer de suppression ; Cape et autres suppléments restent soumis aux arbitrages ouverts. |

Le commit `gpt/especes` est `9744ff810053a529e472f23857ea706d15204d93` et ne porte pas les changements dans `fiche-sync.js`. Le worktree de cette branche contient des modifications non commitées ; le brief interdit de lire ce worktree en cours. La couverture réelle de ces défauts par le lot en cours reste donc non vérifiée.

Les 24 lignes « à arbitrer » de `VERIFICATION_ARMES_V5.md`, notamment Filet Druchii, Cape, armes de siège et navales, Recharge et Gantelet à Vapeur, ne sont pas tranchées. Les cinq notes de boucliers et les divergences des armes de suppléments ci-dessous doivent être rapprochées de `CHANGEMENTS_FEUILLE_ARMES_V5.md` avant décision. La magie des sorts reste hors périmètre ; les talents de magie, eux, restent dans la comparaison des talents.

## Écarts détaillés générés

| Objet | Champ | Feuille / référence attendue | Fiches | Outil | Classe provisoire | Action |
|---|---|---|---|---|---|---|
| Poivrière [weapon-armes-a-distance-ingenierie-poivriere] | keywords | [{"id":"a-poudre-noire","parameter":""},{"id":"a-repetition","parameter":"4","asterisk":true},{"id":"dangereuse","parameter":""},{"id":"devastatrice","parameter":""},{"id":"pistolet","parameter":""},{"id":"recharge","parameter":"4"}] | [{"id":"a-poudre-noire","parameter":""},{"id":"a-repetition","parameter":"4"},{"id":"dangereuse","parameter":""},{"id":"devastatrice","parameter":""},{"id":"pistolet","parameter":""},{"id":"recharge","parameter":"4"}] | [{"id":"a-poudre-noire","parameter":""},{"id":"a-repetition","parameter":"4","asterisk":true},{"id":"dangereuse","parameter":""},{"id":"devastatrice","parameter":""},{"id":"pistolet","parameter":""},{"id":"recharge","parameter":"4"}] | voulu | Vérifier la transformation de la ligne et la portée mécanique |
| Bolas [weapon-armes-a-distance-entraves-bolas] | keywords | [{"id":"inoffensive","parameter":""},{"id":"inflige","parameter":"Empêtré 35, À terre"}] | [{"id":"inoffensive","parameter":""},{"id":"inflige","parameter":"Empêtré 35 ; À terre"}] | [{"id":"inoffensive","parameter":""},{"id":"inflige","parameter":"Empêtré 35, À terre"}] | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Gantelet à pointes [armour-armures-amelioration-gantelet-a-pointes] | keywords | [{"id":"empaleuse","parameter":""}] | [] | [{"id":"empaleuse","parameter":""}] | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Targe (Buckler) [shield-armures-bouclier-targe-buckler] | notes | Bouclier | Bouclier ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Bouclier [shield-armures-bouclier-bouclier] | notes | Bouclier | Bouclier ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Grand Bouclier [shield-armures-bouclier-grand-bouclier] | notes | Bouclier | Bouclier ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Pavois (Pavise) [shield-armures-bouclier-pavois-pavise] | notes | Bouclier (Posé au sol en 2 Actions : confère 5 PA face à la direction choisie ; manié au bras : Grand Bouclier encombrant, à arbitrer) | Bouclier (Posé au sol en 2 Actions : confère 5 PA face à la direction choisie ; manié au bras : Grand Bouclier encombrant, à arbitrer) ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier (Posé au sol en 2 Actions : confère 5 PA face à la direction choisie ; manié au bras : Grand Bouclier encombrant, à arbitrer) | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Bouclier Haut Elfe [shield-armures-bouclier-bouclier-haut-elfe] | notes | Bouclier, Solide 1, Raffiné 1 | Bouclier, Solide 1, Raffiné 1 ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier, Solide 1, Raffiné 1 | feuille à vérifier par le MJ | Vérifier la transformation de la ligne et la portée mécanique |
| Corps à corps (Arme d'hast) | compétence basic | — | true / publié false | false | feuille à vérifier par le MJ | Examiner la divergence entre skills.json et référentiel publié |
| Métier (Calligraphe) | compétence basic | — | false / publié true | true | feuille à vérifier par le MJ | Examiner la divergence entre skills.json et référentiel publié |
| Métier (Cartographe) | compétence basic | — | false / publié true | true | feuille à vérifier par le MJ | Examiner la divergence entre skills.json et référentiel publié |
| Métier (Graveur) | compétence basic | — | false / publié true | true | feuille à vérifier par le MJ | Examiner la divergence entre skills.json et référentiel publié |
| Représentation (Acteur) | compétence carac | — | ag / publié soc | soc | feuille à vérifier par le MJ | Examiner la divergence entre skills.json et référentiel publié |
| Représentation (Acteur) | compétence basic | — | false / publié true | true | feuille à vérifier par le MJ | Examiner la divergence entre skills.json et référentiel publié |

## Références de carrières non résolues dans les deux référentiels

Les statuts `unknown`, `ambiguous` et `incomplete` signifient non résolu, et ne démontrent pas tous une absence : les choix et alias sont à examiner.

| Origine | Type | Référence | Fiches | Outil | Classe | Action |
|---|---|---|---|---|---|---|


## Objets supplémentaires par rapport à la feuille

| Objet | Champ | Feuille | Fiches | Outil | Classe | Action |
|---|---|---|---|---|---|---|
| Flèches (12) | ligne absente | absent | ammunition-livre-de-base-arc-fleches-12 | ammunition-livre-de-base-arc-fleches-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Flèches elfiques (12) | ligne absente | absent | ammunition-livre-de-base-arc-fleches-elfiques-12 | ammunition-livre-de-base-arc-fleches-elfiques-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Carreaux (12) | ligne absente | absent | ammunition-livre-de-base-arbalete-carreaux-12 | ammunition-livre-de-base-arbalete-carreaux-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Balles de plomb (12) | ligne absente | absent | ammunition-livre-de-base-fronde-balles-de-plomb-12 | ammunition-livre-de-base-fronde-balles-de-plomb-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Pierres (12) | ligne absente | absent | ammunition-livre-de-base-fronde-pierres-12 | ammunition-livre-de-base-fronde-pierres-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Balles et poudre (12) | ligne absente | absent | ammunition-livre-de-base-poudre-noire-balles-et-poudre-12 | ammunition-livre-de-base-poudre-noire-balles-et-poudre-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Grenaille et poudre (12) | ligne absente | absent | ammunition-livre-de-base-poudre-noire-grenaille-et-poudre-12 | ammunition-livre-de-base-poudre-noire-grenaille-et-poudre-12 | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |
| Munitions improvisées et poudre | ligne absente | absent | ammunition-livre-de-base-poudre-noire-munitions-improvisees-et-poudre | ammunition-livre-de-base-poudre-noire-munitions-improvisees-et-poudre | feuille à vérifier par le MJ | Vérifier livre p. 302 et compléter prix/disponibilité avant décision |

## Prix et disponibilité non conservés dans les deux JSON

| Onglet | Ligne | Objet | Prix feuille | Disponibilité feuille | Fiches | Outil | Classe |
|---|---|---|---|---|---|---|---|
| Armes Corps à Corps | 2 | Hallebarde Haut Elfe | 8 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 3 | Lance longue Haut Elfe | 3 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 4 | Bâton de combat (2M) | 3/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 5 | Hallebarde (2M) | 2CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 6 | Lance (2M) | 15/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 7 | Pique (2M) | 18/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 8 | Ahlspiess (2M) | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 9 | Guisarme (2M) | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 10 | Mancatcher (2M) | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 11 | Partizan/Glaive (2M) | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 12 | Hache d'armes (2M) | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 13 | Lance Eonir (2M) | 2 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 14 | Mains nues | ND | - | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 15 | Coup-de-poing | 2/6 | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 16 | Gantelet à pointes | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 17 | Gaffe de marin | 6/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 18 | Garrot (2M) | 1/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 19 | Gantelet verrouillé | 1 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 20 | Matraque souple | 1/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 21 | Lames de poignet Druchii | 212 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 22 | Couteau | 8/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 23 | Dague | 16/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 24 | Hache | 10/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 25 | Couteau Bollock | 16/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 26 | Gourdin | 4/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 27 | Arme improvisée | ND | Variable | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 28 | Masse | 15/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 29 | Pic de guerre | 15/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 30 | Cimeterre | 1 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 31 | Épée | 1 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 32 | Marteau de guerre | 1 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 33 | Lame de guerre Eonir | 3 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 34 | Hache barbelée | 1 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 35 | Marteau nain | 3 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 36 | Fendoir de Mamie | 1 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 37 | Poêle en fer | 1 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 38 | Épée Haut Elfe | 4 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 39 | Dague Haut Elfe | 3 CO 4s | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 40 | Lame-épine (Spineblade) Druchii | 42 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 41 | Hache Naine | 1 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 42 | Marteau de Guerre Nain | 1 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 43 | Massue en Obsinite Homme Lézard | 1 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 44 | Maul à pointes en Obsinite Homme Lézard | 2 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 45 | Dague de poing (Punch Dagger) Skaven | 0 | Clan Eshin uniq. | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 46 | Griffes de rat (Rat Claws) Skaven | 0 | Clan Eshin uniq. | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 47 | Arme de queue (Tail Weapon) Skaven | 0 | Skavens uniq. | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 48 | Lance de cavalerie | 1CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 49 | Marteau à bec-de-corbin (2M) | 3CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 50 | Demi-lance | 1 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 51 | Sabre | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 52 | Lance de cavalerie Haut Elfe | 4 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 53 | Grande Hache Haut Elfe | 16 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 54 | Espadon de Hoeth Haut Elfe | 2000 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 55 | Voleuse d'âme (Soultaker) Druchii | 126 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 56 | Grande Hache Naine | 4 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 57 | Grand Marteau Nain | 4 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 58 | Pioche Naine | 1 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 59 | Épée bâtarde (2M) | 8CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 60 | Grande hache (2M) | 4CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 61 | Marteau de guerre (2M) | 3CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 62 | Pioche (2M) | 9/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 63 | Zweihänder (2M) | 10CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 64 | Zweihänder Flamberge (2M) | 30 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 65 | Épée du Bois Sauvage (2M) | 10 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 66 | Hache de Tueur (2M) | 12 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 67 | Fleuret | 5CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 68 | Rapière | 5CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 69 | Petit sabre | 4 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 70 | Targe (Buckler) | 18 s 2 d | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 71 | Fléau | 2CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 72 | Fléau à grain (2M) | 10/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 73 | Fléau d’armes (2M) | 3CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 74 | Lames tournoyantes de la mort Naines | 5 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 75 | Encensoir à Peste Skaven | 3 | Clan Pestilens uniq. | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 76 | Fouet | 5/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 77 | Foret à Vapeur Nain | 12 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 78 | Hache Dentée (Cog Axe) Naine | 15 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 79 | Gantelet à Vapeur Nain | 40 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 80 | Brise-épée | 1CO 2/6 | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 81 | Main gauche | 1CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 82 | Cape | 10/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 83 | Filet | 1 CO 10/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes Corps à Corps | 84 | Filet Druchii | 12 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 2 | Arbalète (2M) | 5CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 3 | Arbalète de poing | 6CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 4 | Arbalète lourde (2M) | 7CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 5 | Arbalète naine (2M) | 9 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 6 | Arbalète à Répétition Druchii | 12 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 7 | Arbalète de poing à Répétition Druchii | 14 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 8 | Baliste Faucheuse (Reaper Bolt Thrower) Druchii | 120 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 9 | Faucheuse des cieux (Sky Reaper) Druchii | 160 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 10 | Harpon Ravageur Druchii | 96 CO | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 11 | Arbalète Naine (2M) | 8 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 12 | Arc (2M) | 4CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 13 | Arc court (2M) | 1CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 14 | Arc elfique (2M) | 10CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 15 | Arc long (2M) | 5CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 16 | Arc d'Anirain Haut Elfe | - | Unique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 17 | Mitrailleuse (Clattergun) Nain | 15 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 18 | Canon Fracasseur (Breaker) Nain | 60 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 19 | Canon Tempête (Tempest) Nain | 150 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 20 | Canon Tonnerre (Thunder) Nain | 500 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 21 | Lasso (2M) | 6/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 22 | Filet | 1 CO 10/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 23 | Globe de Vent Empoisonné Skaven | - | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 24 | Bombe | 3CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 25 | Bombe incendiaire | 1CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 26 | Bombe Cinderblast | 3 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 27 | Fronde | 1/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 28 | Fustibale (2M) | 4/- | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 29 | Arquebuse à répétition (2M) | 10CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 30 | Pistolet à répétition | 15CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 31 | Poivrière | 12 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 32 | Mortier de main (2M) | 50 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 33 | Pistolet-Canne | 15 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 34 | Pistolet Drakefire | 25 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 35 | Fusil Drac de Fer (Drakegun) Nain | 20 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 36 | Torpille à Fléau de Troll (1 munition) Nain | 5 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 37 | Pistolet Drac de Fer Nain | 25 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 38 | Arquebuse Naine à Répétition | 10 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 39 | Mitrailleuse Ratling Skaven | - | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 40 | Lance-Feu à Malepierre Skaven | - | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 41 | Javelot Blackbriar elfe sylvain | 2 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 42 | Bolas | 10/- | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 43 | Couteau de lancer | 18/- | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 44 | Fléchette | 1/- | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 45 | Hache de lancer | 1CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 46 | Javelot | 10/6 | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 47 | Rocher | - | Commune | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 48 | Arquebuse (2M) | 4CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 49 | Long fusil d’Hochland (2M) | 10CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 50 | Pistolet | 8CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 51 | Tromblon (2M) | 2CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 52 | Mousquet à mèche (2M) | 2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 53 | Tromblon à mèche (2M) | 1 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 54 | Mousquet double canon (2M) | 7 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 55 | Pistolet Griffonsfoot | 10 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 56 | Hache-Fusil (2M) | 8 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 57 | Hallebarde-Fusil (2M) | 10 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 58 | Mousquet nain (2M) | 9 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 59 | Pistolet nain | 18 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 60 | Arquebuse Naine (2M) | 6 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 61 | Pistolet Nain | 12 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 62 | Canon naval (petit) | 40 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 63 | Canon naval (moyen) | 100 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 64 | Mortier naval | 50 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 65 | Pistolet à Malepierre Skaven | - | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 66 | Jezzail à Malepierre Skaven | - | Spéciale | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 67 | Fléchettes (lot de 12) Homme Lézard | 10 s | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 68 | Sarbacane Homme Lézard | 3 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 69 | Canon Pivotant (avec balles) Nain | 20 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 70 | Bombarde (petit canon) Nain | 40 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 71 | Mortier Nain | 45 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 72 | Canon Nain | 100 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 73 | Baliste navale | 30 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 74 | Catapulte (petite) | 20 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armes à Distance | 75 | Catapulte (moyenne) | 40 CO | Peu Courante | absents | absents | feuille à vérifier par le MJ |
| Armures | 2 | Calotte de cuir | 8 s | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 3 | Jambières de cuir | 14 s | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 4 | Justaucorps de cuir | 10 s | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 5 | Veste de cuir | 12 s | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 6 | Plastron de cuir | 18 s | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armures | 7 | Chausses de mailles | 2 CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armures | 8 | Chemise de mailles | 2 CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armures | 9 | Coiffe de mailles | 1 CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armures | 10 | Cotte de mailles | 3 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 11 | Brassards | 8 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armures | 12 | Heaume | 3 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armures | 13 | Heaume ouvert | 2 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 14 | Jambières d’acier | 10 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armures | 15 | Plastron | 10 CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armures | 16 | Cape de Dragon des Mers | N/A | Unique (Elfes Noirs) | absents | absents | feuille à vérifier par le MJ |
| Armures | 17 | Heaume du Kraken | N/A | Unique (Lustrie) | absents | absents | feuille à vérifier par le MJ |
| Armures | 18 | Cape de Plumes (Coatl) | N/A | Unique (Skinks) | absents | absents | feuille à vérifier par le MJ |
| Armures | 19 | Gantelets de l'Étrangleur | N/A | Unique (Objet) | absents | absents | feuille à vérifier par le MJ |
| Armures | 20 | Châle de Loup (Wulfshawl) | N/A | Unique (Objet) | absents | absents | feuille à vérifier par le MJ |
| Armures | 21 | Vision des Revenants | N/A | Unique (Bouclier) | absents | absents | feuille à vérifier par le MJ |
| Armures | 22 | Gantelet à pointes | =+2 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armures | 23 | Gantelet verrouillé | =+1 CO | Rare | absents | absents | feuille à vérifier par le MJ |
| Armures | 24 | Plastron | 1280 CO | N/A* | absents | absents | feuille à vérifier par le MJ |
| Armures | 25 | Heaume ouvert | 256 CO | N/A* | absents | absents | feuille à vérifier par le MJ |
| Armures | 26 | Brassards | 1024 CO | N/A* | absents | absents | feuille à vérifier par le MJ |
| Armures | 27 | Jambières de plates | 1280 CO | N/A* | absents | absents | feuille à vérifier par le MJ |
| Armures | 28 | Heaume | 384 CO | N/A* | absents | absents | feuille à vérifier par le MJ |
| Armures | 29 | Jupe de mailles | 1 CO | Limitée | absents | absents | feuille à vérifier par le MJ |
| Armures | 30 | Casque de mineur (ouvert) | 2 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armures | 31 | Plastron | 1280 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 32 | Heaume ouvert | 256 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 33 | Brassards | 1024 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 34 | Jambières de plates | 1280 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 35 | Heaume | 384 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 36 | Heaume Ithiltaen | 1536 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 37 | Plastron | 10240 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 38 | Heaume ouvert | 2048 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 39 | Brassards | 8192 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 40 | Jambières de plates | 10240 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 41 | Heaume | 3072 CO | Unique | absents | absents | feuille à vérifier par le MJ |
| Armures | 42 | Cape de Lion Blanc | 20 CO | Exotique | absents | absents | feuille à vérifier par le MJ |
| Armures | 43 | Targe (Buckler) | 18 s 2 d | Courante | absents | absents | feuille à vérifier par le MJ |
| Armures | 44 | Bouclier | 2 CO | Commune | absents | absents | feuille à vérifier par le MJ |
| Armures | 45 | Grand Bouclier | 3 CO | Courante | absents | absents | feuille à vérifier par le MJ |
| Armures | 46 | Pavois (Pavise) | 3 CO 15 s | Rare | absents | absents | feuille à vérifier par le MJ |
| Armures | 47 | Bouclier Haut Elfe | 8 CO | Courante | absents | absents | feuille à vérifier par le MJ |

## Analyse des 16 libellés publiés non résolus

Les valeurs fiches et outil sont présentes dans leurs contrats de talents publiés ; le snapshot de 207 talents de la feuille ne les résout pas sous ces libellés. Les traits ne sont pas proposés comme talents.

| Libellé | Feuille | Résultat | Classe | Action |
|---|---|---|---|---|
| Béni d’Isha | Béni par Isha | alias non résolu | feuille à vérifier par le MJ | Raccorder l’alias |
| Maniement de 2 armes | Maniement de deux armes | alias non résolu | feuille à vérifier par le MJ | Raccorder l’alias |
| Imprégné par le (Vent) | Imprégné [Vent] | alias probable à confirmer | feuille à vérifier par le MJ | Vérifier la correspondance |
| Compagnon | absent de l’onglet talents | trait de créature : Archives of the Empire 3 p. 81–82 | défaut fiches | Vérifier la classification dans les deux référentiels ; ne pas ajouter aux talents |
| Invisibilité | absent de l’onglet talents | trait de créature : Archives of the Empire 3 p. 81–82 | défaut fiches | Vérifier la classification dans les deux référentiels ; ne pas ajouter aux talents |
| Messager | absent de l’onglet talents | trait de créature : Archives of the Empire 3 p. 81–82 | défaut fiches | Vérifier la classification dans les deux référentiels ; ne pas ajouter aux talents |
| Partage sensoriel | absent de l’onglet talents | trait de créature : Archives of the Empire 3 p. 81–82 | défaut fiches | Vérifier la classification dans les deux référentiels ; ne pas ajouter aux talents |
| Télépathie animale | absent de l’onglet talents | trait de créature : Archives of the Empire 3 p. 81–82 | défaut fiches | Vérifier la classification dans les deux référentiels ; ne pas ajouter aux talents |
| Corruption Contrôlée | absent | talent identifié dans un supplément V4 | feuille à vérifier par le MJ | Voir le CSV Talents et décider de l’adaptation |
| Corruption Volontaire | absent | talent identifié dans un supplément V4 | feuille à vérifier par le MJ | Voir le CSV Talents et décider de l’adaptation |
| Disciple du Changement | absent | talent identifié dans un supplément V4 | feuille à vérifier par le MJ | Voir le CSV Talents et décider de l’adaptation |
| Double Vie | absent | talent identifié dans un supplément V4 | feuille à vérifier par le MJ | Voir le CSV Talents et décider de l’adaptation |
| Imprégné de Magie | absent | talent identifié dans un supplément V4 | feuille à vérifier par le MJ | Voir le CSV Talents et décider de l’adaptation |
| Sort Supplémentaire | absent | talent identifié dans un supplément V4 | feuille à vérifier par le MJ | Voir le CSV Talents et décider de l’adaptation |
| Bon sens | absent | source et nature non établies | feuille à vérifier par le MJ | Identifier la source avant tout ajout |
| Vivant | absent | source et nature non établies | feuille à vérifier par le MJ | Identifier la source avant tout ajout |

## CSV candidats produits

| Fichier | Lignes de données | État |
|---|---:|---|
| `coherence/corrections/Armes à Distance.csv` | 8 | Munitions absentes ; prix, disponibilité et conditionnement vérifiés sur le Livre de base V5 EN p. 302. Flèche elfique à l’unité dans le livre, contre lot de 12 dans les catalogues : à arbitrer. |
| `coherence/corrections/Talents.csv` | 8 | Six talents sourcés dans les suppléments V4, deux libellés à identifier ; les cinq traits et trois alias déjà présents ne sont pas proposés. Corruption volontaire : maximum non indiqué dans le passage. |

Les colonnes initiales et leur ordre sont ceux des exports, avec `Motif Claude/GPT` ajouté à la fin. **Ne pas importer en bloc** : les deux lignes Bon sens et Vivant n’ont ni source ni page établies, et les adaptations V4 et le maximum non indiqué doivent être arbitrés par le MJ. Aucune proposition n'a été préparée pour un écart explicitement voulu. Il n'y a pas de CSV de compétences puisque cet onglet n'existe pas.

## Reproduction et empreintes

Exports CSV en lecture seule, dossier `tmp/gemini-verifs/coherence/`, par exemple : `Invoke-WebRequest -Uri ('https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&headers=1&sheet='+[uri]::EscapeDataString($name)) -OutFile (Join-Path $dir ($name+'.csv'))`. Pour Carrières, l'URL utilisée est celle de `tools/import-careers.mjs`, sans `headers=1`. Vérifier avec `Get-FileHash -Algorithm SHA256`. Exécuter `node tmp/gemini-verifs/coherence/compare.mjs` puis `node tmp/gemini-verifs/coherence/complements.mjs` depuis le dépôt : ces scripts lisent les copies et écrivent uniquement leurs résultats dans le dossier de contrôle. `corrections-verifiees.mjs` produit les deux CSV après les recherches documentaires. Aucun générateur de catalogue n'a été lancé.

| Onglet | SHA-256 |
|---|---|
| Mots Clés Armes et Armures | `2c514b2a8d991dd160fa3ecda559488909beb684826d6602a16187cf4fe5da13` |
| Armes Corps à Corps | `ee022b8079d42990f7cdfda1ca4d9f5e39a83a3394409a680ae7e128dfc9aad4` |
| Armes à Distance | `4c74147e420be76065dcf9fde332ed51c44c0ca0a25bfcc9c39e43f59c59d9c8` |
| Armures | `d540299714bc6b7aeb54cf3dbc8436de72ad21136e20f5f70024207aae168d7c` |
| Talents | `6c5b2722067eb1af0a620ea15d916133ef4834eab276797213b4765925cc57fd` |
| Carrières | `ab25370a9de04903dc975943f9216c9dcf04d5b90b05c0d5eb8e768ed3580ab5` |

Les empreintes des quatre onglets d'équipement et de Talents correspondent aux manifestes enregistrés dans le snapshot de l'outil. L'ancien fichier `Compétences.csv` téléchargé par erreur est un onglet de coûts par défaut ; il n'a pas été utilisé comme référentiel.

## Comparaison indépendante des cellules

Couverture : 1421 cellules nommées pour 203 lignes ; résultat détaillé dans verification-independante.json.

| Onglet / ligne | Objet | Champ | Feuille brute | Fiches | Outil | Classe | Action |
|---|---|---|---|---|---|---|---|
| Armures 21 | Vision des Revenants | Zones Couvertes | Parade | [] | [] | feuille à vérifier par le MJ | Vérifier la perte éventuelle |
| Armures 43 | Targe (Buckler) | Atouts et Défauts (et Pénalités) | Bouclier | Bouclier ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier | feuille à vérifier par le MJ | Note brute non conservée à l’identique |
| Armures 44 | Bouclier | Atouts et Défauts (et Pénalités) | Bouclier | Bouclier ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier | feuille à vérifier par le MJ | Note brute non conservée à l’identique |
| Armures 45 | Grand Bouclier | Atouts et Défauts (et Pénalités) | Bouclier | Bouclier ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier | feuille à vérifier par le MJ | Note brute non conservée à l’identique |
| Armures 46 | Pavois (Pavise) | Atouts et Défauts (et Pénalités) | Bouclier (Posé au sol en 2 Actions : confère 5 PA face à la direction choisie ; manié au bras : Grand Bouclier encombrant, à arbitrer) | Bouclier (Posé au sol en 2 Actions : confère 5 PA face à la direction choisie ; manié au bras : Grand Bouclier encombrant, à arbitrer) ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier (Posé au sol en 2 Actions : confère 5 PA face à la direction choisie ; manié au bras : Grand Bouclier encombrant, à arbitrer) | feuille à vérifier par le MJ | Note brute non conservée à l’identique |
| Armures 47 | Bouclier Haut Elfe | Atouts et Défauts (et Pénalités) | Bouclier, Solide 1, Raffiné 1 | Bouclier, Solide 1, Raffiné 1 ; en attaque : arme improvisée (Inoffensive, Déséquilibrée). | Bouclier, Solide 1, Raffiné 1 | feuille à vérifier par le MJ | Note brute non conservée à l’identique |

## Éléments de rang présents dans les fiches et non rapprochés de la feuille

| Feuille / ligne | Carrière et rang | Champ | Valeur feuille | Élément fiches | Classe | Action |
|---|---|---|---|---|---|---|


### Compléments issus de la lecture directe

- 1 421 cellules nommées sur 203 lignes ont été inspectées ; 406 cellules de prix et disponibilité ne sont projetées dans aucun des deux JSON. Les quatre homonymes par casse ont été distingués par leur nom exact. Le détail individuel est dans `verification-independante.json`.
- 554 mentions de mots-clés ont été rapprochées indépendamment de leurs identifiants et paramètres. Le seul écart détecté est l’astérisque de Poivrière, classé voulu. Les pénalités entre parenthèses des armures sont conservées dans les notes ; elles ne sont pas des paramètres des qualités sans paramètre. Voir `mots-cles-independants.json`.
- Les 828 cellules des 207 talents (libellé bilingue, description, maximum, source) ont été rapprochées directement des deux snapshots : zéro écart ; voir `talents-independants.json`.
- **Vision des Revenants** : la feuille indique « Parade » dans Zones couvertes, tandis que les deux catalogues ont une liste de localisations vide. Classe : feuille à vérifier par le MJ. Préciser si cette protection variable doit être représentée autrement ; conserver la valeur brute.
- **Flèche elfique** : le Livre de base V5 EN p. 302 indique une flèche à 6/−, alors que les deux catalogues portent « Flèches elfiques (12) ». La ligne est absente de la feuille. Classe : feuille à vérifier par le MJ ; vérifier la quantité avant de synchroniser les catalogues.
- Les libellés Compagnon, Invisibilité, Messager, Partage sensoriel et Télépathie animale sont des traits de familier, Archives of the Empire 3 p. 81–82 ; ils ne doivent pas être ajoutés automatiquement comme talents. Six autres ajouts proposés sont documentés par Power Behind the Throne Companion p. 34, Death on the Reik Companion p. 100 et Enemy in Shadows Companion p. 75 et 79.
