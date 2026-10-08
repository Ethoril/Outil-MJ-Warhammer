# Cahier des charges de développement pour les fiches PJ et les aides de jeu

Version 1.3 du 8 octobre 2026. Statut : lot 1 livré et réceptionné en production (3.12.3), avec la limitation Brave acceptée ; lots 2 et 3 non lancés. Application cible : Outil MJ Warhammer, version initialement observée 3.11.1. Les preuves et limites de réception sont consignées dans [le rapport de recette](RECETTE_FICHES_PJ.md) et [le suivi](SUIVI_FICHES_PJ.md).

L’outil MJ doit reprendre les données de jeu des PJ depuis leurs fiches de campagne, notamment leurs talents, armes, boucliers et armures personnalisés. Les définitions affichées et les effets calculés doivent suivre les mêmes références que les fiches, avec **Aides de jeu comme source de vérité commune**. Une modification d’équipement dans la fiche doit devenir visible et utilisable dans l’outil après synchronisation, sans ressaisie et sans modifier l’état courant de la partie.

Ce cahier des charges fixe le résultat attendu, les contrats de données, les règles de reprise des sauvegardes et les critères de réception. Les décisions du chapitre 13 ont été validées le 8 octobre 2026. Le développement du lot 1 est autorisé, avec sous-agents de développement et de contrôle coordonnés par un agent chef d’orchestre. La publication reste une étape distincte.

## 1 Objectif et périmètre

### 1.1 Résultat attendu

Pour un PJ lié à une fiche, le MJ peut consulter ses aptitudes, choisir une arme réellement déclarée dans sa fiche, retrouver ses dégâts et mots clés, et calculer sa protection à la localisation exacte. Les infobulles, fiches de règles, recherches et rappels en combat présentent la même définition d’un talent ou d’un mot clé.

Deux flux distincts alimentent l’application :

| Flux | Données faisant autorité | Destination |
|---|---|---|
| Fiche de campagne du PJ | Caractéristiques, compétences et avances, acquisitions de talents, objets possédés et personnalisations | Profil PJ et copies utilisées dans les scènes |
| Aides de jeu et référentiels associés publiés | Identités, descriptions, paramètres, alias, sources et édition retenue | Catalogue de consultation et contrat des moteurs |

Le catalogue décrit un type d’objet ; la fiche décrit l’exemplaire du PJ. Un changement du catalogue ne remplace jamais automatiquement les dégâts, mots clés, PA ou notes d’un exemplaire personnalisé dans la fiche.

### 1.2 Fonctions incluses

- Lecture des fiches existantes, association durable aux profils PJ et aperçu des différences.
- Caractéristiques, race, mouvement, initiative, Blessures maximum et compétences utilisables.
- Talents acquis, rangs, spécialités, notes et descriptions de référence.
- Armes, boucliers, armures et munitions déclarés dans `data.equipment`.
- Création et mise à jour des actions d’armes, liaisons aux compétences et reprise des anciennes actions.
- Protection sur six localisations, couches d’armure, protections conditionnelles et contexte du bouclier.
- Harmonisation des textes consultables et audit des automatismes concernés.
- Propagation aux scènes actives et suspendues, sauvegarde, export, annulation et synchronisation multiappareils.
- Consultation hors ligne des données déjà récupérées et des références embarquées.

Les sorts et prières possédés seront conservés dans l’instantané du PJ et consultables avec leur référence disponible. Leur conversion en nouvelles actions de magie et l’automatisation de leurs effets ne font pas partie de cette livraison. L’expression « tout récupérer » désigne les données de jeu utiles à l’outil ; elle n’inclut pas la copie du journal XP, des brouillons, des historiques de commande ou de contenus privés sans usage dans l’outil MJ.

### 1.3 Limites de la livraison

La livraison conserve une synchronisation déclenchée par le MJ avec aperçu avant application. Elle ne crée pas d’écriture de l’outil MJ vers les fiches, de surveillance continue des fiches ni d’interface destinée aux joueurs. Elle ne reconstruit pas les achats XP et ne corrige pas les acquisitions historiques du PJ.

Le lot 1 reprend les talents pour consultation et rappel, sans ajouter l’application mécanique de leurs effets. Les automatismes déjà présents, dont le calcul des Blessures maximum avec Dur à cuire, restent conservés et vérifiés. Le lot 2 doit permettre d’appliquer les effets de certains talents ; la liste retenue et les règles d’activation seront définies dans son cahier détaillé. L’automatisation de tous les talents et de tous les mots clés n’est pas un objectif implicite.

La magie est confirmée hors périmètre du lot 1, en dehors de la consultation des sorts, prières et références. Son développement fera l’objet d’un chantier ultérieur ; il n’est pas automatiquement ajouté au lot 2 des talents.

## 2 État de départ vérifié

### 2.1 Application MJ

| Composant | Fonction actuelle | Écart à traiter |
|---|---|---|
| `js/core/fiche-source.js` | Lit `fiches/{charId}` dans Firestore `campagne-wrpg` et retourne `document.data` | Conserver aussi les métadonnées de version et de révision disponibles |
| `js/core/fiche-sync.js` | Reprend caractéristiques, initiative, maximum de Blessures et scores des actions existantes | Ajouter aptitudes, équipement et actions issues des objets |
| `FICHE_BASIC_SKILLS` | Liste locale des compétences de base | Tenir compte du référentiel publié, des formes principales et spécialités |
| `js/core/models.js` | Profils, participants, actions et qualités ; armure `head/body/arms/legs` | Étendre le modèle et conserver les six localisations |
| `applyFicheSync` | Préserve les PV actuels du combat, mais remet les PV des personnages persistants au maximum | Conserver les Blessures subies et ajuster les PV actuels au delta de maximum |
| `js/core/keywords.js` | Lit le Google Sheets, puis cache local et copie embarquée | Le parseur ne retient que nom et effet ; exploiter les colonnes explicites et les alias |
| `js/ui/rules-view.js` | Affiche mots clés et aides locales issues de `rules.js`, `crits.js`, `magic.js` | Inventorier et rattacher chaque aide à une référence identifiée |
| Stockage et protocole partagé | Version de schéma 2 et espace RTDB `wfrp-sessions-v2` | Prévoir l’évolution et protéger les données des anciens clients |

Les fiches actuellement ciblées sont `bhelgi`, `caelel`, `elysia`, `hellaya` et `wren`. La livraison conserve ce périmètre. La liste doit être centralisée et extensible ; aucune découverte globale de fiches supplémentaires n’est nécessaire.

### 2.2 Projet source des fiches

Projet source : `F:\Outil WRPGv4\ennemi-interieur-wfrp4`.

- `js/fiche/equipment.js` définit le format d’un exemplaire, le calcul des couches et six localisations : `head`, `body`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`.
- Les types d’objet sont `weapon`, `armour`, `shield`, `ammunition`.
- Les mots clés d’un exemplaire ont la forme `{ id, parameter }` ; leur définition vient du catalogue.
- Les objets sont des copies personnalisables, avec ID d’instance, `baseId` et `catalogVersion`. Ils ne sont pas des liens vivants vers un modèle.
- La fiche prend en compte toutes les armures déclarées. Le modèle observé ne contient pas d’état équipé ou déséquipé.
- Le calcul d’armure choisit la meilleure pièce de chaque couche compatible, conserve les pièces ignorées et laisse le bouclier séparé.
- `talentsAcq` contient les acquisitions. Les acquisitions répétées constituent les rangs ; la résolution publiée conserve les spécialités et les alias historiques.
- Les fiches utilisent aussi `referentiels/public` et des instantanés de catalogue pour les formes de compétences et les talents.

La nouvelle intégration doit comparer ses résultats aux fonctions pures des fiches. Un total de référence identique est exigé pour les mêmes données et la même version de référentiel.

### 2.3 Source commune Aides de jeu

Document : [Aides de jeu sur Google Sheets](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/edit).

La lecture publique de l’onglet des mots clés a répondu HTTP 200 le 8 octobre 2026. L’inventaire public du classeur expose notamment :

| Onglet | gid | Usage dans cette livraison |
|---|---|---|
| Talents | `1096647859` | Identités, spécialités, descriptions, limites et sources |
| Mots Clés Armes et Armures | `1604774011` | Identifiants, effets, paramètres, éditions et alias |
| Armes Corps à Corps | `1691295409` | Références des modèles d’armes |
| Armes à Distance | `1220903991` | Références des modèles d’armes à distance |
| Armures | `2107942259` | Références des modèles d’armure |
| Magie | `0` | Références de magie, selon correspondance des contenus |
| Miracles | `1678905785` | Références des prières et miracles |
| Carrières | `1185423550` | Contexte des compétences, si requis par le résolveur partagé |

Les autres onglets observés sont Coûts XP, date prochaine session et Sorts Emma. Ils ne doivent pas être aspirés par défaut. L’inventaire public ne montre pas d’onglet de règles générales, d’états ou de critiques. La présence d’un onglet Magie ne prouve pas qu’il contient les tables d’incidents magiques locales.

Les aides sans entrée dans ce classeur doivent avoir une référence complémentaire exacte ou un arbitrage de campagne explicite. Si la source se trouve dans un PDF ou un autre document du dossier Drive Aides de jeu, sa référence sera ajoutée au manifeste des sources. Aucune aide locale ne pourra être présentée comme issue du Sheets sans correspondance vérifiée.

## 3 Référentiels et règle de priorité

### 3.1 Catalogue commun

Créer un paquet de références versionné, généré à partir des sources communes. Les deux applications doivent aboutir aux mêmes identités, descriptions et paramètres pour une même version. Les transformations nécessaires aux fiches, notamment alias historiques et traductions de spécialités, doivent être reprises explicitement plutôt que réinventées à partir d’une ressemblance de noms.

L’outil MJ embarque un instantané complet pour le démarrage hors ligne. Un script de génération reproductible permet de le reconstruire ; toute correction éditoriale durable se fait dans la source ou dans un arbitrage partagé identifié. Les fichiers générés ne sont pas corrigés manuellement.

Le paquet contient au minimum :

| Collection | Champs requis |
|---|---|
| Métadonnées | Version de format, version de contenu calculée, date de récupération, liste des sources et empreintes |
| Talents | ID, nom FR, nom EN si disponible, spécialisation, description, limite d’achat textuelle, source, alias |
| Mots clés | ID explicite, nom, effet, type, paramètre attendu, alias, édition retenue, source, remarque |
| Modèles d’équipement | ID de modèle, type, catégorie, dégâts, allonge, portée, PA, localisations, couche, mots clés |
| Aides complémentaires | ID stable, titre, sections ou table, source exacte, édition, version, statut de couverture |
| Correspondances | Formes principales de compétences, alias, migrations d’identités documentées |

La version de contenu est calculée à partir des données normalisées utiles ; une récupération identique à une autre date ne crée pas une nouvelle version fonctionnelle.

### 3.2 Priorités et divergences

1. Les propriétés de l’exemplaire dans la fiche font autorité pour ce PJ, y compris ses personnalisations.
2. Aides de jeu fait autorité pour la définition de référence et l’édition retenue de chaque entrée.
3. Un arbitrage de campagne publié peut compléter cette définition ; il porte une provenance et un statut visibles.
4. Un texte local sans référence est une aide à rapprocher des sources ; il ne remplace pas silencieusement la définition commune.

Les descriptions locales publiées par les fiches existent techniquement. En cas d’écart avec Aides de jeu, produire une ligne dans la matrice de divergences. Pour une entrée commune, l’affichage du MJ doit converger avec celui des fiches : corriger ou formaliser la surcharge, pas créer une nouvelle variante dans le MJ. Une modification du projet des fiches qui serait nécessaire à cette convergence sera décrite et isolée dans un lot distinct avant exécution.

### 3.3 Actualisation et cache

Le rafraîchissement du référentiel est indépendant de la synchronisation des PJ. Il est déclenché depuis les aides et charge les collections requises comme un ensemble validé. Un échec ne remplace pas le dernier ensemble valide par un résultat vide ou partiel.

Le parseur CSV doit gérer les virgules, guillemets échappés, accents et cellules sur plusieurs lignes. Il repère les colonnes par leur en-tête. Les identifiants explicites sont conservés ; le nom traduit ne sert pas à fabriquer un nouvel ID quand la source en fournit déjà un.

L’écran indique la source utilisée, la version, la date du dernier succès et une éventuelle erreur de rafraîchissement. Il ne doit pas afficher « mis à jour » lorsque la récupération a échoué et que seul le cache a été rendu. Le cache de référentiel reste distinct des fiches authentifiées et du cache PWA.

Une nouvelle édition ou un effet modifié peut être consulté immédiatement comme référence, mais ne change pas un calcul en cours. Un moteur ne s’applique automatiquement qu’aux versions d’effet qu’il couvre ; un effet modifié non couvert devient « à arbitrer » jusqu’à mise à jour du moteur. Les anciennes versions utilisées dans les historiques restent identifiables.

## 4 Contrat des données PJ

### 4.1 Lecture de la fiche

`fiche-source.js` reste l’adaptateur Firestore en lecture seule. Il conserve la séparation Firebase déjà prévue entre fiches de campagne et synchronisation de l’outil MJ.

La lecture retourne pour chaque fiche un résultat comprenant `charId`, `data`, les métadonnées du document disponibles (`schemaVersion`, `revision`) et le statut de lecture. Une propriété indisponible reste absente ou `null` ; elle n’est jamais inventée. La forme réelle de ces métadonnées sera contrôlée dans les documents source et leurs migrations.

Un échec individuel est distingué d’un document absent. Les fiches valides peuvent être proposées, tandis que les fiches en erreur sont exclues de l’application avec leur motif. Une erreur d’autorisation générale n’entraîne aucune modification.

### 4.2 Instantané canonique proposé

L’adaptateur pur produit un instantané de format `1` contenant les collections suivantes :

| Champ | Contenu et contraintes |
|---|---|
| `charId`, `name`, `race` | Identité de fiche et informations du PJ |
| `source` | Révision source, version de format, empreinte des données utiles, version du résolveur |
| `caracs`, `initiative`, `movement`, `woundsMax` | Valeurs dérivées connues ; `null` si non calculables |
| `skills` | ID canonique si résolu, clé de stockage source, nom affiché, caractéristique, avances, total, spécialité, statut |
| `talents` | ID canonique si résolu, spécialité, acquisitions d’origine avec ID/nom/note, rang agrégé, statut |
| `equipment` | Instances source conservées avec leurs IDs et champs de la fiche |
| `spells`, `prayers` | Entrées acquises pour consultation ; données brutes utiles conservées |
| `coverage` | Pour chaque collection : `present`, `absent` ou `invalid` |
| `warnings` | Anomalies structurées avec champ, entrée concernée, gravité et conséquence |

Les descriptions sont résolues par le référentiel, pas dupliquées comme une nouvelle vérité dans chaque action. Les acquisitions brutes et objets personnalisés restent disponibles pour la traçabilité.

Une collection absente n’est pas équivalente à une collection vide. `equipment: []` sur une fiche compatible signifie qu’elle ne contient plus d’équipement. Une ancienne fiche sans ce champ ne justifie pas la suppression des armes de l’outil. Une collection invalide est exclue de la synchronisation, avec un avertissement ; ses valeurs antérieures sont conservées.

Les entrées dont le format structurel est invalide, comme des IDs d’instance dupliqués, bloquent la collection correspondante. Une entrée structurellement valide dont la référence est inconnue est conservée et signalée ; elle peut être consultée mais ne déclenche aucun moteur inconnu.

### 4.3 Équipement

Conserver les champs de la fiche : `id`, `baseId`, `catalogVersion`, `kind`, `name`, `category`, `damage`, `reach`, `range`, `ap`, `locations`, `layer`, `keywords`, `notes`, `source`, `custom`.

Les champs sont validés selon le contrat partagé des fiches. Les notes restent du texte inerte. `ap: null` signifie « PA à préciser » et ne vaut pas zéro confirmé. Les paramètres non numériques sont conservés comme texte. Les références inconnues ou retirées du catalogue ne font pas disparaître l’objet.

L’identité fonctionnelle d’un objet est le couple `(charId, equipment.id)`. `baseId` désigne un modèle, pas un exemplaire. Deux épées portant le même nom ou le même `baseId` demeurent deux objets distincts.

### 4.4 Talents et compétences

Les rangs de talent sont le nombre d’acquisitions résolues vers la même identité et la même spécialité. Deux spécialités différentes restent deux lignes. Conserver les notes de chaque acquisition. Les limites d’achat sont consultables, mais un dépassement historique n’est pas corrigé par l’outil MJ.

Les compétences doivent reprendre les formes principales, `basicSpecs`, compétences avancées et alias publiés. Une compétence de base est utilisable selon la convention des fiches ; une compétence avancée non acquise n’est pas proposée comme maîtrisée. Un emplacement « au choix » non résolu ne fournit pas un score d’arme.

La caractéristique d’une compétence provient de son contrat de référence ; elle n’est pas déduite de son nom. Toute résolution ambiguë reste visible et nécessite un choix de liaison.

Les caractéristiques importées ne sont pas majorées une seconde fois par les talents. Les blessures maximum et le mouvement suivent les fonctions dérivées des fiches, avec des tests de parité, plutôt qu’un deuxième calcul indépendant.

## 5 Synchronisation et propriété des données

### 5.1 Parcours utilisateur

1. Ouvrir la mise à jour des PJ et se connecter à la source des fiches si nécessaire.
2. Charger les fiches et le résolveur compatible ; présenter séparément les erreurs et avertissements.
3. Associer chaque fiche à un PJ. Une association enregistrée prime sur les suggestions de nom ; une ambiguïté ne choisit aucun profil automatiquement.
4. Afficher les différences par PJ : caractéristiques, aptitudes, objets ajoutés/modifiés/retirés, actions et protections par localisation.
5. Résoudre les liaisons d’actions et conflits historiques, puis appliquer les changements sélectionnés en une seule commande annulable.

Le lien de fiche d’un profil déjà associé ne peut pas être changé implicitement par une simple correspondance de nom. Le remplacement volontaire d’une association doit annoncer les collections qui seront remplacées.

### 5.2 Données faisant autorité

Pour un PJ lié, les caractéristiques de base, aptitudes et objets synchronisés sont édités dans la fiche source. Leur détail dans l’outil propose de consulter ou ouvrir la fiche. Le MJ garde ses notes de profil, tags, groupe, favoris et actions locales.

Une action locale peut être liée à une arme de fiche pour reprendre son score, ses dégâts et mots clés. Ce lien ne doit pas faire perdre ses réglages locaux de combat, notamment modificateur, cible ou position dans l’interface. Une action indépendante reste indépendante.

Lors de la première synchronisation, une ancienne action portant un nom proche d’une arme est proposée comme candidate à relier. Aucune fusion ni suppression n’est décidée sur le seul nom. Le MJ peut relier l’action, la conserver comme action locale ou la retirer explicitement dans l’aperçu.

### 5.3 Mise à jour des objets et actions

Les ajouts, modifications et suppressions d’objets suivent leurs IDs. Un renommage de l’exemplaire met à jour son libellé sans créer une seconde arme. La disparition d’un objet retire seulement les actions déclarées comme issues de cet objet ; les actions locales restent conservées.

Un catalogue actualisé ne réécrit pas les objets de fiche. Seule une nouvelle lecture de la fiche remplace l’exemplaire synchronisé. La prévisualisation expose un changement de dégâts, de paramètres ou de PA, même si le nom est inchangé.

Une synchronisation répétée avec les mêmes valeurs, liaisons et versions ne crée ni objet, ni action, ni événement de modification supplémentaire. Les dates de consultation ne doivent pas à elles seules rendre la commande différente. Les anciens profils sans lien restent utilisables.

### 5.4 Application aux scènes et PV

La commande met à jour la réserve, les participants de la scène active et des scènes suspendues liés au profil, ainsi que les anciennes lignes de dés encore utilisées. Les rencontres préparées continuent à référencer les profils actualisés au lancement. Les archives et historiques terminés ne sont jamais recalculés.

Les identifiants locaux des participants et actions sont conservés. Les correspondances explicites sont utilisées avant toute reprise par nom ; un repli par nom/type n’est admis que s’il est unique et confirmé lors de la reprise historique.

Les états, niveaux d’états, tour, acteur courant, ordre d’initiative effectif, camp, zone, cibles et ressources de partie restent inchangés. Les PV actuels sont ajustés uniquement pour conserver les Blessures subies lors d’un changement de maximum. La valeur d’initiative de fiche peut être actualisée, mais l’ordre du combat ne se réorganise pas pendant la synchronisation.

Le profil de réserve conserve un maximum explicite `maxHp`. Pour les PJ liés, `hp` reste sa valeur de compatibilité pour les consommateurs historiques, mais l’état de santé courant appartient aux personnages persistants et participants. Les personnages persistants doivent aussi conserver leur maximum connu. Adapter les chemins de fin de rencontre qui écrivent actuellement les PV dans le profil.

Pour chaque état de santé, calculer l’écart `Blessures subies = ancien maximum − anciens PV actuels`, puis `nouveaux PV actuels = nouveau maximum − Blessures subies`, soit `anciens PV actuels + nouveau maximum − ancien maximum`. Exemple : 8/14 devient 10/16 ; si le maximum baisse à 10, 8/14 devient 4/10. La règle s’applique aux personnages persistants et aux copies actives et suspendues avec leurs propres valeurs antérieures.

L’ancien maximum doit être connu : utiliser d’abord le maximum explicite de l’état concerné, puis une valeur historique liée et vérifiée. Ne jamais supposer que le PJ était indemne faute de maximum. Si l’ancien maximum est inconnu, conserver exceptionnellement les PV actuels, actualiser le maximum calculable et signaler que l’ajustement n’a pas pu être déterminé. Si le nouveau maximum est non calculable, ne modifier aucun des deux nombres.

Conserver un écart signé pour les états historiques anormaux : 16/14 devient 18/16 et reste signalé comme anomalie. Les PV négatifs restent admis : −2/14 devient 0/16. Un passage de seuil dû à cette correction ne déclenche pas de nouveau dégât, soin, critique, mort ni retrait d’état ; les états et l’historique existants restent conservés. L’aperçu montre les anciens et nouveaux PV/maximum et l’écart conservé.

L’ajustement utilise une seule fois les valeurs d’avant commande. Les miroirs scène/combat et la propagation d’un personnage persistant ne doivent pas ajouter deux fois le delta. Une seconde synchronisation identique ne réajuste pas la santé.

### 5.5 Cohérence entre aperçu et application

Le plan mémorise la révision locale, la révision source lorsqu’elle existe et l’empreinte des données utiles. Avant application, vérifier que le profil et la fiche n’ont pas changé. Si la révision source n’est pas disponible, relire les données utiles et comparer leur empreinte.

Un plan périmé est invalidé et les nouvelles différences sont affichées. Un autre appareil ne doit pas recevoir un remplacement aveugle d’une partie modifiée entre-temps. Utiliser les commandes, révisions et mécanismes de conflit déjà prévus par le Store et le protocole.

Les transformations pures reçoivent leurs identifiants et données avant la transaction. Une relance de transaction Firebase ne génère ni nouveaux IDs ni nouveaux effets. L’annulation restaure l’ensemble des données modifiées par la commande, selon le mécanisme existant de l’application.

## 6 Actions utilisables en combat

### 6.1 Armes et défenses

Pour chaque arme possédée, créer une action d’attaque stable si son profil offensif existe. Un bouclier doté de dégâts et d’une allonge peut aussi fournir une action offensive. Un bouclier sans profil offensif n’obtient pas de dégâts inventés.

Une arme de mêlée ou un bouclier utilisable en opposition peut fournir une action de défense distincte, liée au même objet. Ses effets défensifs sont appliqués dans ce contexte seulement. Le choix de défense reste visible ; importer un bouclier ne le sélectionne pas silencieusement pour chaque opposition.

Les munitions sont consultables, sans devenir une attaque autonome. Pour utiliser leurs effets, le MJ peut sélectionner une munition compatible dans le contexte de l’arme à distance. Ses qualités s’ajoutent selon les règles de cumul documentées, sans double comptage ; aucune consommation automatique de quantité n’est demandée, le modèle source n’exposant pas de quantité d’usage dédiée.

### 6.2 Contrat d’une action liée

| Élément | Règle |
|---|---|
| Identité | ID local conservé et lien explicite vers `charId`, ID d’objet et rôle `attack` ou `defense` |
| Nom | Libellé de l’exemplaire, distingué dans l’interface si homonyme |
| Score | Total de la compétence résolue ou liée explicitement |
| Catégorie | Conservée ; correspondance documentée avec le groupe de compétence |
| Dégâts | Formule source conservée, calculée avec le BF actuel si reconnue |
| Allonge et portée | Valeur source visible ; formule évaluée seulement si prise en charge |
| Qualités | IDs communs avec paramètres source conservés et provenance arme/munition |
| Statut | Utilisable, liaison requise, formule à arbitrer ou règle partiellement automatisée |

La liaison à une compétence utilise d’abord l’association enregistrée, puis une table explicite de catégories. Une suggestion par nom ne doit jamais attribuer discrètement Corps à corps à une arme de tir. Une compétence absente ou ambiguë laisse l’action visible avec « compétence à choisir » ; le lancement calculé est bloqué tant qu’un score valide n’est pas fourni.

La conversion des paramètres `{ id, parameter }` vers `qualities`, `rating`, `valuesX` et `capacity` est centralisée dans un adaptateur. Une valeur numérique peut alimenter le moteur correspondant ; une valeur textuelle ou absente reste consultable et ne devient pas zéro par défaut. Un même paramètre possède une seule valeur canonique ; les champs historiques éventuels sont dérivés de cette valeur.

Prévoir les syntaxes réellement utilisées dans les objets de fiche, notamment espaces, signe initial, BF, multiplication et astérisque de renvoi. Les expressions spéciales ou inconnues restent textuelles et à arbitrer. Le moteur n’exécute jamais une expression source comme du code.

### 6.3 Talents au moment de l’action

Les talents acquis sont consultables depuis le PJ et le panneau de résolution. Les effets clairement rattachés à une compétence ou à un contexte peuvent apparaître comme rappels. Leur activation automatique exige une règle documentée dans la matrice des moteurs.

Le MJ doit voir si un effet est déjà calculé, s’il demande un choix, ou s’il constitue seulement un rappel. Une même qualité ne s’applique pas deux fois à cause d’un alias, d’une munition ou d’un doublon historique.

## 7 Armures et localisations

### 7.1 Modèle de protection

Ajouter un champ canonique `armorLocations` avec `head`, `body`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`. Chaque localisation conserve son total de référence et le détail des pièces comptées, ignorées et conditionnelles, calculé à partir de l’équipement.

Le champ historique `armor` reste un repli pour les profils qui n’ont pas de détail. Les nouveaux calculs utilisent d’abord `armorLocations`. Aucun total unique des bras ou jambes ne peut remplacer des protections différentes à droite et à gauche.

Pour les anciens profils, migrer `arms` vers chaque bras et `legs` vers chaque jambe, sans ajouter de pièces d’équipement fictives. Le formulaire de profil, la silhouette, les résumés, import/export et calculs doivent permettre d’afficher les valeurs distinctes. Un résumé peut regrouper les deux côtés seulement si leurs valeurs sont égales.

### 7.2 Cumul des couches

Le calcul de référence suit `armourProtection` des fiches : meilleure pièce par couche et par zone, cuir plus couche flexible plus couche rigide, bonus explicitement additionnel avec unicité selon `baseId`. Deux pièces d’une même couche ne se cumulent pas. Les pièces non chiffrées ou couvertures inconnues apparaissent dans les avertissements et ne produisent pas de PA inventés.

La fiche ne gérant pas un état équipé, toutes ses armures déclarées participent au calcul de référence. Une éventuelle sélection temporaire de pièces dans une scène serait une extension distincte ; elle ne doit pas modifier l’inventaire source.

### 7.3 Localisation de l’impact

Le résultat de localisation conserve la famille de table critique `HEAD`, `ARM`, `BODY`, `LEG` et ajoute la clé précise de protection. La table actuelle distingue déjà les côtés dans ses libellés, mais les calculs utilisent encore une famille commune : supprimer cette perte d’information.

| Résultat de localisation actuel | Protection cible |
|---|---|
| 01 à 09 | `head` |
| 10 à 24 | `leftArm` |
| 25 à 44 | `rightArm` |
| 45 à 79 | `body` |
| 80 à 89 | `leftLeg` |
| 90 à 100 | `rightLeg` |

Cette table décrit le fonctionnement actuel à conserver tant qu’une référence commune ne demande pas de correction. Une localisation de critique utilise la protection de son propre jet ; un second critique garde son contexte distinct.

### 7.4 Protection conditionnelle et bouclier

Les PA de référence restent distincts des PA applicables au coup. L’aperçu détaille les pièces exclues et la raison. La condition de Partielle, Points faibles et Impénétrable doit reprendre le texte de l’édition retenue et son contexte exact ; les exemples du mémo des fiches servent de point de comparaison, pas d’autorisation pour changer silencieusement de règle.

Les règles de couche, Partielle, Points faibles et Impénétrable font partie des effets à prendre en charge dans cette livraison lorsque les données de contexte sont disponibles. Si elles manquent, l’outil demande la donnée ou présente une décision explicite ; il n’applique pas par défaut la protection maximale comme si la condition était connue.

La protection du bouclier reste séparée de l’armure permanente. Le contexte de résolution indique le bouclier choisi, son utilisation en défense ou son port passif, le côté non directeur si nécessaire, et son éventuelle indisponibilité après attaque. Ne pas inventer la main directrice lorsque la fiche ne la fournit pas.

Prendre en compte un seul bouclier et les règles de cumul avec Défensive selon la référence retenue. Toute indisponibilité temporaire liée au tour est stockée dans la scène, conservée à la suspension et remise à jour au bon début de tour. Un simple rafraîchissement de fiche ne réactive pas le bouclier.

Si une règle nécessite un contexte que l’application ne suit pas encore, proposer un choix manuel mémorisé pour la résolution avec le motif. La liste des cas manuels doit être livrée explicitement ; l’import complet d’un objet ne signifie pas que tous ses effets sont automatisés.

## 8 Aides affichées et cohérence du moteur

### 8.1 Surfaces à harmoniser

Un même service de référence alimente le panneau Aides de jeu, les sélecteurs de qualités, les détails des objets, les talents du PJ, les infobulles, les rappels de résolution et la recherche de profils par mot clé.

La recherche couvre nom FR, nom EN, alias, effet et notes utiles. Les détails montrent les paramètres de l’exemplaire, l’édition et la source. Les inconnus sont affichés avec leur texte d’origine et leur statut, sans disparaître ni activer un moteur approximatif.

### 8.2 Matrice obligatoire des règles

Livrer une matrice avec une ligne pour chaque aide affichée et chaque effet automatisé :

| Colonne | Contenu attendu |
|---|---|
| Identité | ID de règle ou d’effet stable |
| Source | Onglet, entrée, lien ou PDF/page exacts, édition et version |
| Fiches | Texte et traitement existants dans la fiche |
| Outil MJ | Texte affiché et comportement exécuté actuellement |
| Décision cible | Texte retenu, différence à corriger, cumul et priorité |
| Statut de moteur | Automatique, assisté avec choix, rappel manuel ou référence manquante |
| Conditions | Entrées nécessaires et comportement si elles manquent |
| Vérification | Exemple chiffré et test de réception associé |

Les moteurs existants à comparer comprennent Inoffensive, Percutante/Impact, Dévastatrice, Pointue, Imprécise, Précise, Empaleuse et Dangereuse. La matrice couvre aussi les états, jets opposés, dégâts, localisation, critiques, Acharnement, boucliers et couches d’armure lorsqu’ils sont affichés ou calculés.

Les blocs locaux à rapprocher des sources sont : Localisation et tables critiques ; Santé, critiques et survie ; Magie et incidents ; Peur et Terreur ; Corruption et mutations. Une table affichée et la table appelée par le moteur doivent provenir du même ensemble de références.

### 8.3 Périmètre des corrections

Corriger les automatismes déjà présents qui contredisent une source commune établie, et ajouter les règles de protection prévues au chapitre 7. Les autres mots clés et talents disposent de rappels fidèles, éventuellement assistés, avec leur statut visible. Leur automatisation complète n’est pas un critère de livraison.

Une divergence d’édition se résout par la colonne « Version retenue » d’Aides de jeu. Une divergence sans source définie doit être enregistrée comme arbitrage à résoudre ; aucune décision de règle ne sera inventée par simple traduction ou intuition.

La réception complète exige une matrice sans divergence de source cachée. Les références complémentaires absentes sont les seuls points susceptibles de demander une entrée métier supplémentaire ; la conception du stockage, l’import et les tests indépendants peuvent avancer entre-temps.

## 9 Architecture technique proposée

### 9.1 Modules

| Module ou famille | Responsabilité |
|---|---|
| `fiche-source.js` | Authentification et lecture Firestore, métadonnées, erreurs individuelles |
| `fiche-sync.js` | Instantané, association, plan pur et application de la commande |
| Adaptateurs d’aptitudes et d’équipement | Identités, spécialités, paramètres, liaisons et validation |
| Service de référentiels | Chargement, résolution d’alias, versions, cache et provenance |
| Calcul de protection | Couches, localisations et protection effective selon contexte |
| `models.js`, migrations et sérialisation | Conservation des nouvelles collections et compatibilité |
| `store.js`, scènes et rencontres | Propagation, état courant, révisions et annulation |
| `resolution.js`, `damage.js`, moteurs de qualités | Utilisation des objets et protections exactes |
| Vues de synchronisation, réserve, combat et règles | Aperçu, consultation, choix et rappel des limites |
| Script de génération et fixtures | Reconstruction du catalogue et tests de parité |

Les noms des nouveaux fichiers peuvent être adaptés aux conventions du dépôt. Les responsabilités et frontières de test sont obligatoires : E/S isolées, calculs purs, une seule commande d’application, un seul contrat d’identité des mots clés.

Les calculs et résolveurs des fiches sont réutilisés par un mécanisme reproductible ou portés sous contrôle de tests de parité. La production ne doit pas importer des modules à partir d’un chemin disque de l’autre projet. Les fichiers partagés ou copiés gardent leur version et une procédure de régénération.

### 9.2 Extension des modèles

Ajouter au profil et aux participants les collections d’aptitudes, d’équipement et les protections précises. Ajouter aux actions un lien de provenance explicite dans `extensions.fiche`, comprenant `charId`, `equipmentId` si concerné, rôle, identité de compétence et version de liaison. Les profils conservent `extensions.ficheId` pour la compatibilité existante.

Les mêmes champs doivent survivre aux constructeurs, normalisations, migrations, clones de rencontre, miroirs scène/combat, copies de réserve, export/import JSON, IndexedDB, repli localStorage et synchronisation RTDB. Adapter toutes les listes de champs autorisés ; conserver un champ seulement dans un objet brut ne suffit pas.

### 9.3 Versions et anciens clients

La proposition utilise un schéma de sauvegarde et de partage version 3 pour rendre explicite l’évolution du modèle. Les sauvegardes v1/v2 sont migrées sans mutation de l’entrée ; une version future inconnue est refusée proprement.

Pour la synchronisation cloud, prévoir un espace `wfrp-sessions-v3` isolé des écritures v2. Les règles doivent permettre la lecture de v2 pour la reprise autorisée et réserver les écritures v3 au propriétaire, avec le contrat de révisions adapté. La copie v2 vers v3 est idempotente et ne remplace pas une session v3 déjà initialisée.

Les anciens clients ne doivent pas pouvoir écraser les six localisations ou supprimer l’équipement d’une session migrée. Décrire la bascule des règles, des versions et du cache dans le plan de publication. Une simple hausse de constante côté client ne constitue pas une migration multiappareils complète.

La publication des règles Firebase et de l’application constitue une étape de déploiement séparée de la rédaction et du développement local.

## 10 Interface et comportement hors ligne

Le détail du PJ comporte des sections Aptitudes, Armes et boucliers, Armures et protection. Le détail d’un objet montre ses caractéristiques, notes, paramètres de mots clés et provenance. Les six zones sont lisibles sur la silhouette et au clavier, avec un détail des couches au clic ou à la sélection.

L’aperçu de synchronisation distingue additions, modifications et retraits ; il montre les anciennes et nouvelles valeurs utiles et les scènes touchées. L’application peut être limitée à certains PJ. Pour un PJ sélectionné, les données structurellement valides sont appliquées ensemble ; les collections exclues sont annoncées avant validation.

Les anciens objets/actions historiques encore indépendants sont présentés comme locaux. Les données issues d’une fiche sont identifiables, avec la date du dernier changement appliqué et l’état de liaison, sans exposer des détails techniques inutiles dans le parcours courant.

En mode hors ligne, les PJ et références déjà enregistrés restent consultables. La synchronisation distante est indisponible avec un message clair. Le lancement d’un calcul reposant sur un effet non couvert reste à arbitrer. Une perte de réseau ne supprime ni catalogue, ni fiche, ni armure.

Le Service Worker inclut les nouveaux modules et instantanés ; ses caches sont versionnés. Après mise à jour, une PWA installée doit utiliser ensemble les modèles, moteurs et références compatibles. Vérifier les thèmes clair et sombre, les fenêtres étroites, le clavier, les longs noms et les descriptions longues.

## 11 Recette et critères de réception

Les cas suivants sont obligatoires. Les exemples synthétiques de calcul de couches suivent la convention actuelle des fiches ; les exemples de règles d’édition doivent être fixés avec leur source dans la matrice.

| ID | Scénario | Résultat attendu |
|---|---|---|
| R01 | Lire une fiche avec équipement et talents | Champs utiles et métadonnées repris ; zéro écriture vers Firestore source |
| R02 | Deux instances de la même épée | Deux objets et actions distincts, IDs stables |
| R03 | Renommer une arme sans changer son ID | Même action actualisée, aucun doublon |
| R04 | Ajouter puis supprimer une arme | Ajout puis retrait des seules actions liées ; actions locales conservées |
| R05 | Réappliquer une synchronisation identique | Aucun changement, doublon, journal de modification, révision inutile ou deuxième ajustement des PV |
| R06 | Arme personnalisée différente du modèle | Dégâts, mots clés et notes de l’exemplaire conservés après rafraîchissement du catalogue |
| R07 | Mot clé numérique et paramètre textuel | Valeurs exactes conservées, affichage fidèle, absence de conversion silencieuse en zéro |
| R08 | Talent acquis deux fois et deux spécialités distinctes | Rang 2 pour la même spécialité ; spécialités séparées et notes conservées |
| R09 | Alias de talent ou compétence renommée | Résolution commune et total conforme à la fiche ; ambiguïté signalée |
| R10 | Arme de tir sans compétence correspondante | Action visible, liaison requise ; aucun repli implicite vers mêlée |
| R11 | Dégâts BF+4 avec F=39 puis F=40 | Dégâts de base 7 puis 8 ; formule conservée |
| R12 | Expression spéciale non reconnue | Texte intact et arbitrage demandé ; aucune formule exécutée comme code |
| R13 | Cuir 1, maille 2 et plates 2 au corps | 5 PA au corps, seulement les couches couvrant chaque autre zone |
| R14 | Deux pièces de même couche et même zone | Meilleure pièce seule comptée ; autre pièce listée comme ignorée |
| R15 | Protection différente à gauche et droite | Impact sur le bon côté, affichage et export des six valeurs |
| R16 | Ancien profil `arms:2`, `legs:1` | Migration vers 2 sur chaque bras et 1 sur chaque jambe, sans objet fictif |
| R17 | Bouclier déclaré | Protection séparée ; un seul bouclier, choix de contexte et aucun ajout permanent aux six PA |
| R18 | Bouclier rendu indisponible puis fiche synchronisée | Indisponibilité de scène conservée jusqu’à l’événement de tour prévu |
| R19 | Partielle, Points faibles ou Impénétrable | Effet conforme à l’édition retenue, pièce/critique concerné expliqué, contexte manquant demandé |
| R20 | Munition sélectionnée avec qualité commune à l’arme | Provenance visible et moteur dédoublonné selon le contrat de cumul |
| R21 | Nouvelle fiche sans champ équipement et fiche avec `[]` | Absence : conservation ; vide confirmé : retrait des objets liés |
| R22 | Collection invalide ou ID d’objet dupliqué | Collection exclue avec motif ; pas de perte des anciennes données |
| R23 | PJ à 8/14, état présent, scène active et suspendue ; maximum devient 16 | 10/16 dans chaque état initialement à 8/14 ; 6 Blessures subies conservées, états/tour inchangés ; aucun double delta dans les miroirs |
| R24 | PJ à 8/14 ; maximum baisse à 10, puis à 4 | 4/10, puis −2/4 ; 6 Blessures subies conservées, aucun écrêtage des PV ni nouvel effet de seuil |
| R25 | Profil modifié après l’aperçu ou révision source changée | Plan invalidé et aperçu actualisé avant toute application |
| R26 | Annuler la commande | Réserve, copies et données dérivées restaurées selon le mécanisme d’annulation |
| R27 | Exporter, recharger et synchroniser sur un second appareil | IDs, paramètres, collections, liens et état de scène conservés |
| R28 | Rafraîchissement Sheets incomplet ou HTTP en échec | Ancien ensemble conservé, erreur affichée, aucune fausse confirmation de succès |
| R29 | Changement d’effet source non couvert par le moteur | Texte actualisé avec provenance ; calcul concerné à arbitrer, sans recalcul d’historique |
| R30 | Consultation hors ligne après un premier chargement | Objets, talents et références accessibles ; aucune suppression |
| R31 | Clients v2 et v3 sur le même compte | Reprise v2 idempotente ; aucune écriture v2 ne dégrade les données v3 |
| R32 | Recherche d’un alias ou clic sur un mot clé en combat | Même définition/version que dans les aides et détail de fiche compatible |
| R33 | PNJ sans fiche et anciens imports texte/JSON | Fonctionnement conservé et protections historiques correctement reprises |
| R34 | Actualisation des caractéristiques d’un PJ avec talents | Parité avec les valeurs des fiches, aucun bonus appliqué deux fois |
| R35 | Nouvelle scène depuis une rencontre préparée | Équipement et protections du profil actualisé, PV/états persistants repris |
| R36 | Sort ou prière acquis | Consultation possible avec référence disponible ; aucun effet de combat inventé |
| R37 | Ancien maximum inconnu ou nouveau maximum non calculable | Ancien inconnu : PV conservés exceptionnellement avec avertissement ; nouveau non calculable : santé inchangée |
| R38 | État historique à 16/14 ; maximum devient 16 | 18/16 ; écart signé −2 conservé et anomalie visible |
| R39 | Ajustement 8/14 vers 10/16, export, reprise et synchronisation identique | 10/16 conservé sur le second appareil et après reprise ; aucun deuxième ajustement |
| R40 | PJ à −2/14 ; maximum devient 16 | 0/16 avec 16 Blessures subies conservées ; états, critiques passés et tour inchangés |

### 11.1 Vérifications techniques

- Tests unitaires significatifs des parseurs, résolveurs, plans de synchronisation, migrations et calculs de protection.
- Tests de parité sur fixtures synthétiques et sur la fixture de fiche existante, complétée par des exemplaires personnalisés.
- Tests du Store, des scènes actives/suspendues, du protocole v3, des exports et reprises historiques.
- Tests navigateur du parcours complet : connexion simulée, aperçu, liaison, application, combat, annulation et hors ligne.
- Recette réelle de lecture Firebase avec le compte MJ, autorisations et App Check sur le site publié ; distinguer cette preuve des tests simulés.
- Vérification des règles RTDB de migration et isolement v3 dans l’émulateur avant publication.
- `npm test`, `npm run test:browser` et `git diff --check`, avec résultats consignés et limites explicites.

### 11.2 Conditions de réception complète

Tous les cas obligatoires passent. Chaque aide affichée a une source ou un statut d’arbitrage explicite. Chaque moteur actif a un contrat conforme à la version retenue et un exemple vérifié. Aucune donnée source inconnue n’est perdue ; les Blessures subies sont conservées lors d’un changement de maximum connu, les états et le tour restent inchangés, et aucun effet de seuil n’est déclenché par cet ajustement. Les tests des fonctions pures et la recette réelle de l’accès aux fiches sont rapportés séparément.

## 12 Lots de développement et livrables

### 12.1 Lot 1 Reprise des fiches et harmonisation

Le lot 1 comprend la livraison fonctionnelle décrite aux chapitres 1 à 11. Les étapes techniques initialement numérotées 0 à 6 sont des sous-lots de ce lot 1, et non des livraisons métier distinctes. La magie y reste limitée à la consultation ; les nouveaux effets mécaniques des talents appartiennent au lot 2.

| Sous-lot du lot 1 | Travaux | Livrable et condition de sortie |
|---|---|---|
| 1.0 Sources et contrats | Inventorier aides, effets et champs réels ; fixer les correspondances d’édition, compétences et surcharges | Matrice complète, manifeste des sources, fixtures, liste des seuls arbitrages manquants |
| 1.1 Référentiels | Génération du paquet commun, parseurs, identités, alias, service de résolution et cache | Instantané reproductible et tests de parité avec les fiches |
| 1.2 Modèles et migration | Aptitudes, équipement, six localisations, santé persistante, liens, export et protocole v3 | Reprise v1/v2, round-trip sans perte, protection contre anciens clients |
| 1.3 Synchronisation PJ | Source enrichie, aperçu, association, reprise d’actions, idempotence et application atomique | Parcours complet sur fiches simulées ; Blessures subies conservées, ajustement de PV appliqué une fois et absence de doublons |
| 1.4 Combat et protections | Actions d’armes, paramètres, munitions, localisations, couches, contexte du bouclier et règles conditionnelles | Résolutions vérifiées, détails explicables et propagation aux scènes |
| 1.5 Aides et harmonisation | Consultation des talents/objets, définitions communes, recherche, audit/correction des moteurs existants | Surfaces cohérentes et matrice des règles renseignée |
| 1.6 Recette et publication | Tests complets, émulateur, recette MJ, PWA et multiappareils ; préparation de la bascule | Rapport de recette, sauvegarde de reprise et procédure de déploiement/retour |

Les sous-lots peuvent être développés successivement dans un travail isolé, mais la livraison du lot 1 doit couvrir l’ensemble : importer les objets sans les rendre consultables et utilisables ne suffit pas. Le sous-lot 1.0 précise les références métier manquantes ; il ne remet pas en question les contrats déjà fixés dans ce document.

Livrer également une procédure d’actualisation du catalogue, la matrice des moteurs et des cas manuels, un guide de synchronisation PJ, une notice de reprise des anciennes actions et une procédure de retour. Après création de données v3, un retour applicatif exige une version capable de lire v3 ou une restauration explicite ; un ancien client v2 ne constitue pas un retour sûr.

### 12.2 Lot 2 Effets de certains talents et durée des états

Ce lot doit appliquer les effets d’une sélection explicite de talents acquis par le PJ. Leur liste est établie à partir d’Aides de jeu et des talents réellement présents dans les fiches. La sélection n’est pas encore arrêtée ; le lot 1 prépare les IDs, rangs, spécialités, versions et contextes nécessaires.

Pour chaque talent retenu, définir les caractéristiques ou compétences affectées, le rang et la spécialité applicables, le déclencheur, la durée, les conditions, le cumul, la cible et les éventuels choix du MJ. Distinguer un effet permanent déjà intégré aux valeurs de la fiche d’un effet conditionnel appliqué à une résolution. Un effet ne peut jamais être ajouté une seconde fois.

Le moteur doit expliquer chaque modification dans l’aperçu de résolution, conserver sa provenance dans l’historique et permettre l’annulation des effets de partie. Un talent inconnu, incomplet ou non couvert reste consultable et manuel. Livrer une matrice par talent avec source, exemples chiffrés, tests de rang/spécialité/cumul et non-régression des PJ sans ce talent.

Le lot 2 inclut également la gestion de la durée des états, indépendamment des talents : durée restante visible, décompte et expiration selon la règle de chaque état. Le cahier détaillé précisera les moments de décompte, les cumuls et prolongations, les états sans durée fixe, les interventions du MJ et la conservation des durées lors des sauvegardes, reprises et synchronisations. Le niveau d’un état et sa durée doivent rester distincts.

Les spécifications détaillées et les cas de recette propres au lot 2 seront rédigés avant son développement. Le lot 2 ne comprend pas implicitement un moteur de magie.

### 12.3 Lot 3 Création d’une application mobile pour les séances

Créer une application mobile adaptée à l’usage du MJ à la table : consultation rapide des PJ, talents, armes, armures et règles ; suivi du combat, des PV, des états et des tours ; résolution des actions avec des commandes tactiles lisibles et accessibles.

**Ce lot est planifié mais différé. Son développement ne commencera qu’une fois les lots précédents terminés, validés en situation réelle et stabilisés.** La fiabilité des règles, des données, des migrations et de la synchronisation doit être acquise avant d’ouvrir ce chantier. Il ne constitue pas une priorité du développement actuel.

L’application mobile doit réutiliser les mêmes données, référentiels et moteurs métier que l’outil MJ, afin de conserver une seule interprétation des règles et une séance cohérente entre appareils. Son cahier détaillé précisera les parcours prioritaires en séance, les usages hors ligne, la reprise de synchronisation et la protection contre les doubles applications d’actions.

Le choix des plateformes cibles, de la technologie (PWA installable, application hybride ou native) et du mode de distribution sera arrêté lors du cadrage de ce lot. La présence actuelle d’une interface web responsive ou d’une PWA ne vaut pas livraison de l’application mobile demandée.

Livrer un cahier des charges mobile, un prototype des parcours de séance puis l’application, avec recette sur appareils réels et vérification de la continuité d’une séance entre ordinateur et mobile. Les critères détaillés seront définis avant le développement du lot 3.

## 13 Décisions de fonctionnement validées

| Sujet | Décision validée |
|---|---|
| Déclenchement | Synchronisation manuelle avec aperçu, une commande annulable |
| Édition d’un PJ lié | Fiche source pour les données de jeu ; outil MJ pour le contexte de partie et les actions locales |
| Anciennes actions | Liaison confirmée dans l’aperçu ; jamais supprimées sur simple ressemblance |
| Santé | Blessures subies conservées ; PV actuels ajustés au delta de maximum ; états inchangés |
| Protection | Six localisations, couches calculées et conditions assistées ou automatisées selon le contexte ; bouclier séparé |
| Aptitudes | Confirmé : consultation et rappels au lot 1 ; application des effets de certains talents au lot 2 |
| Durée des états | Ajout au périmètre du lot 2 : suivi, décompte et expiration ; fonctionnement détaillé à spécifier avant développement |
| Application mobile | Lot 3 planifié pour l’usage en séance ; développement différé jusqu’à la stabilisation et la validation des lots précédents |
| Magie possédée | Confirmé : consultation seulement au lot 1 ; moteur de magie dans un chantier ultérieur |
| Référentiels | Aides de jeu prioritaire, surcharges et références complémentaires explicites |
| Compatibilité | Migration des sauvegardes et synchronisation multiappareils incluses au lot 1 ; schéma v3 et reprise idempotente de v2 |

Ces décisions sont validées et structurent le chantier. Leur intégration au document ne vaut pas autorisation de publication. Le développement du lot 1 a été explicitement demandé après cette validation ; il doit être confié à des sous-agents de développement et de contrôle sous coordination du chef d’orchestre. Les seuls arbitrages métier supplémentaires concernent une divergence de règle sans référence retenue ou une source complémentaire effectivement manquante.

## 14 Repères de code et preuves

Les chemins ci-dessous servent à l’implémentation et à la vérification de l’état de départ. Ils ne constituent pas des références de règles de jeu.

| Projet MJ | Projet fiches |
|---|---|
| `js/core/fiche-source.js` | `js/fiche-repository.js` |
| `js/core/fiche-sync.js` et `tests/e26-fiche-sync.test.js` | `js/fiche/derived.js` et `js/mobile/fiche-aptitudes-model.js` |
| `js/core/models.js` et `js/core/migrations.js` | `js/fiche/equipment.js` et `tools/fiche-equipment.test.mjs` |
| `js/core/keywords.js` et `js/core/quality-normalization.js` | `js/data/equipment-catalog.json` et `tools/refresh-equipment-catalog.mjs` |
| `js/data/keyword-engines.js`, `js/core/roll-qualities.js` | `js/catalogue/talents-sheet-snapshot.json`, `talent-source.js`, `talent-resolver.js` |
| `js/core/resolution.js`, `damage.js`, `dice.js` | `js/fiche/published-catalogue-engine.js`, `js/catalogue/skill-resolver.js` |
| `js/ui/rules-view.js`, `js/data/rules.js`, `crits.js`, `magic.js` | `js/equipment/memo.js` et `js/equipment/view.js` |
| `js/core/store.js`, `encounters.js`, `sync-protocol.js` | `js/fiche/export-import.js` |
| `firebase.database.rules.json`, `sw.js`, `tests/browser-smoke.mjs` | `js/fiche-bureau/session.js` et `js/mobile/fiche-catalogue.js` |

Le contrôle préparatoire a porté sur le code local et l’accès public aux références. Les documents Firestore réels des cinq PJ n’ont pas été chargés pour rédiger ce cahier des charges : leur équipement exact, leur révision et leur conformité seront contrôlés lors de la recette autorisée avec le compte MJ.
