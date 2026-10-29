<!-- Décisions MJ recopiées le 28/10 ; elles priment sur les formulations historiques. -->

## Contre-vérification T2 bis (28/10) — décisions du MJ

- Mort subite des figurants : **les créatures (profils du bestiaire) sont éligibles** comme les PNJ secondaires (toujours jamais PJ ni Chanceux, réglage désactivé par défaut, choix du MJ).
- Poivrière sans seconde main libre : **tire un coup puis exige une recharge complète**, comme une arme sans À répétition (L13 p.103).
- Mortier de main qui explose au rechargement : **comme l'incident catastrophique**, Dégâts du profil à +0 DR au bras principal (plus de maximum saisi).
- Échec d'un Test de sortie de filet : **rien ne change** (V5, L06 p.186) ; plus de +1 Empêtré.

## Passe de cohérence feuille ↔ fiches ↔ outil (28/10) — décisions du MJ

- La feuille « Aides de jeu » est la seule source : tout ajout ou correction passe par elle (CSV par onglet préparés pour le MJ, jamais « Importer »). Les fiches n'ont pas encore d'objets : pas d'alias d'anciens objets à prévoir.
- **Ajouter les 8 munitions du livre de base** à l'onglet Armes à Distance (`tmp/gemini-verifs/coherence/corrections/Armes à Distance.csv`). **Flèches elfiques en lot de 12** (3 CO 12/-).
- **Ajouter à l'onglet Talents les 6 talents de suppléments V4, convertis en V5** (Corruption contrôlée, Corruption volontaire, Disciple du Changement, Double vie, Imprégné de magie, Sort supplémentaire) ; **retirer « Bon sens » et « Vivant »** du référentiel des fiches (aucune source).
- **Petit lot fiches** à préparer : 3 alias de talents, 5 traits de créature rangés parmi les talents, 6 compétences où `skills.json` contredit le référentiel publié.
- **Corps à corps** : seule la spécialité Base est une compétence de base ; toutes les autres (Arme d'hast, Escrime, Cavalerie, Deux mains…) **restent avancées**, écart assumé à L06 p.112 (les fiches n'ont qu'une ligne de base). Le passage de tout le Corps à corps en base ne sera pas fait (MJ, 28/10).

## Contre-vérification T3 (28/10) — décisions du MJ

- Esquive montée : Désavantage **sauf Acrobaties équestres** (Trick Rider), comme le livre p.168 (la question F1 « sauf Cavalier émérite » était fausse).
- Cavalier retenu (prise, ancré) : **un échec au Test de Chevaucher le fait tomber** (comportement actuel conservé).
- Araignée : **pattes = jambes** (table de critiques et PA des jambes).
- Langue pendante et Esprit solitaire : **−10 partout, comme imprimé** dans L06 V5 (y compris pour les entrées L23).
- **Toute source de Corruption** (exposition, échecs de sort, Courroux, sorts) déclenche le Test de seuil.
- Destin : seuls les **PJ et PNJ nommés (persistants)** répercutent leur dépense sur le profil ; les copies de profil la gardent pour elles.
- **Conception du module de séquelles (F2-J) validée.**
- Les 10 règles de canalisation de Winds of Magic (pages paires des Vents) restent hors F2 (magie non retenue).

## Décisions du MJ — reprise T2 bis et tranche T3 (28/10/2026)

Sources : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T2_BIS.md` et `tmp/gpt-phase-f2/BRIEF_T3.md`. Ces décisions priment sur les formulations historiques ci-dessous.

- Mort subite : les créatures sont éligibles comme les PNJ secondaires, sur confirmation du MJ ; jamais les PJ ni les Chanceux.
- Poivrière sans seconde main libre : un coup puis recharge complète comme une arme sans À répétition.
- Mortier de main explosant au rechargement : dégâts du profil à +0 DR au bras principal, sans maximum saisi.
- Échec de sortie de filet : rien ne change.
- V5 partout ; règles V4 retenues converties (±10 → ±1 DR, Avantage → Élan, Résilience → Destin, Détermination → Chance). L06, L09 et L10 sont V5 ; les autres suppléments, notamment L13, L17 et L23, sont V4.
- « Ne pas implanter » ne retire aucun comportement existant ; distances jamais suivies, choix au MJ ; mort jamais appliquée sans confirmation.
- F2-M réutilise l'état durable monté / démonté du lot C ; le Désavantage à l'Esquive remplace l'ancien champ chiffré, sans cumul.
- Corruption : seuil BE + BFM, doublé par Âme pure, recalculé lorsque ces bonus changent ; points et mutations préparés pour l'écriture future vers la fiche. Aucune mutation sans confirmation du MJ.
- Mutations : 39 lignes L06, 134 lignes L17 converties en V5 et table étendue L23 selon la conception K2 validée ; compter L23 sur les pages, résumer chaque ligne dans nos mots (douze mots cités au plus), indiquer pages imprimée et PDF et faire vérifier indépendamment chaque ligne. Conversion incertaine assistée, question au MJ, sans valeur par défaut.
- Malus durables des séquelles : F2-J en T4, pas en T3.

## Choix d'exécutant — T3 (28/10/2026)

- **K-SEANCE-01** : la séance de Corruption utilise l'identité de séance explicitement ouverte par le MJ avec `startTalentSession`, et non l'identité d'un combat. Le MJ déclare les sources et choisit l'exposition la plus forte ; l'outil empêche un deuxième Test de Corruption pour le personnage dans cette séance. Le classement des sources reste manuel.
- **K-COMPTAGE-01** : L06 p.189 contient deux tables de 20 plages, soit 40 entrées et non les 39 annoncées dans le brief ; toutes les plages imprimées sont conservées. Les huit tables L17 contiennent 80 marques ; le repérage familial inclut aussi L23. La table étendue L23 et ses renvois comprennent 125 entrées (62 physiques, 10 têtes bestiales, 34 mentales, 19 Fixations).
- **K-DOMAINE-01** : les marques L17 n'ont pas de domaine physique ou mental unique dans le catalogue. Leur association à une mutation en attente exige une compatibilité explicitement choisie par le MJ, enregistrée avec la sélection ; aucune valeur n'est présélectionnée.
- **G-PA-01** : si une patte d'araignée ne correspond pas à une pièce d'armure identifiée, le MJ peut saisir les PA pour cette résolution ; aucune pièce n'est supposée. Le choix de table de critique d'un appendice ne remplace pas la localisation utilisée pour la protection.
- **M-TALENT-01** : l'exception à l'Esquive montée suit la décision explicite du brief T3, Cavalier émérite, bien que L06 p.168 cite Trick Rider. Cette divergence est laissée visible pour contre-vérification.

## Contre-vérification T2 (27/10 soir) — décisions du MJ (première série)

- Sortie d'un filet : **Test opposé de Force contre la Force du filet** (L06 p.186, chaque DR après le premier retire un état Empêtré supplémentaire), au lieu du cumul de DR jusqu'à la valeur de Force.
- Recharge (précisé par le MJ) : chaque Test réussi fait avancer la recharge de **1 + DR positifs** (réussite à +0 DR = 1, réussite à +2 DR = 3) ; un échec n'apporte rien. Remplace D-RECHARGE-01 (1 par Test réussi).
- Salve sans astérisque : **capacité complète** rendue par la Recharge (E-SALVE-01 retenu).
- Incident de poudre catastrophique : **Dégâts de l'arme à +0 DR, tirés du profil** (L06 p.165), pas de maximum saisi.
- Maladresse : **table Oops seule**, d10 obligatoire (inchangé).
- Empoignade : Blesser plafonné à 0 PV **sans critique d'excédent** ; dégâts **BF + DR − BE, sans PA** ; un double à l'initiation **garde son critique** ; quand l'initiateur se dégage, **le lien libère les deux** participants.

## Contre-vérification T2 (27/10 soir) — décisions du MJ (seconde série)

- Double raté 99-100 d'une hache-fusil (ou hallebarde-fusil) en mêlée, ou d'un mortier de main en rechargement : **l'accident propre de L13 prime** sur la table d'incident générique.
- **Ajouter la table d'incident de Salve** (L13 p.126) pour l'arquebuse à salve.
- Bolas : Empêtré et À terre **seulement sur un coup aux jambes** (L06 p.303) ; le blocage « Empêtré 35, À terre » est un bug.
- Javelot Blackbriar : **retirer l'Inflige vide**, l'arme redevient utilisable.
- Empaleuse au tir sans munition suivie : **projectile générique déduit de l'arme** (flèche, carreau, balle) au lieu du blocage.
- Discrétion −1 : **seulement les pièces marquées dans le catalogue** (le catalogue fait foi, exception au livre).
- Tromblon : **grenaille ou projectiles improvisés seulement**, pas de balles.
- Bouclier attaché : **texte du livre**, sans les restrictions targe ajoutées par GPT.
- Immobilisante (V4) : **garder l'automatisation** tirée du texte du catalogue.
- Griffonsfoot neuf : **déchargé** (inchangé).
- Malus durables d'amputation : **dans F2-J**, comme prévu.
- Main fendue : la perte de tous les doigts déclenche **un second choc d'amputation pour la main**.
- À faire en T2 bis : **mort subite des figurants** (réglage de table, désactivé par défaut) et **Assommer** (coup retenu à la tête avec arme Assommante).
- **Conception K2 validée.**

# Choix d'exécutant - Phase F2

## Choix d’exécutant — recharge T2

| ID | Source | Question | Choix | Raison | Alternative |
|---|---|---|---|---|---|
| D-RECHARGE-01 | F-L06-1064 ; L06 p.305 ; brief T2 | Comment compter les succès demandés, la source imprimée parlant d’Actions sans préciser le rôle des DR ? | Un Test réussi ajoute un succès, quels que soient ses DR ; un échec n’en ajoute aucun. | Raccord explicite au nombre de succès demandé par le MJ sans conserver l’unité Action du texte imprimé. | Cumuler les DR positifs de chaque Test. |

Ce choix est une proposition d’exécutant, pas une décision supplémentaire du MJ.

## Décisions du MJ — tranche T2 (27/10/2026)

Source : `tmp/gpt-phase-f2/BRIEF_T2.md` ; ces décisions priment sur les formulations historiques ci-dessous.
- **V5 partout** ; règles V4 retenues converties (±10 → ±1 DR, Avantage → Élan, 2 Avantages → 1 Élan comme B-TRIP-01).
- **Catalogue V5** (F2-R) : groupe Parade supprimé, Parade = atout d'arme ; boucliers = armures avec la qualité **Bouclier** (L06 p.306 : +1 DR en opposition avec Esquive ou Corps à corps, sans cumul avec Défensive ; PA du bouclier appliqués si le coup touche ; à 2 PA ou plus, opposition aux tirs avec Esquive ; un seul bouclier ; arme improvisée en attaque) ; **Inflige X** ; mots-clés V4 (Perturbante, Lente, Épuisante, Précise, Percutante, Immobilisante, Protectrice) gardés seulement pour les exemplaires anciens : ne pas les supprimer, ne pas leur inventer de nouvelle mécanique.
- **Recharge comptée en succès, pas en Actions** (note du MJ, F-L06-1064) ; À répétition : un chargeur entamé réduit la recharge.
- **Pénalités d'armure V5** : −1 DR en Discrétion pour toute maille ou plate portée (une fois par catégorie) ; Heaume −2 DR en Perception ; le reste selon le catalogue.
- **Distances jamais suivies** : Explosion, Dispersion et déviation passent par des cibles ou bandes désignées par le MJ.
- **La mort reste au MJ** : jamais appliquée sans confirmation. **Option de mort subite des figurants** = réglage de table désactivé par défaut, PNJ secondaires seulement (jamais PJ ni PNJ « Chanceux »).
- **Critiques : rester en V5** (second critique sur dégâts excédentaires, coagulation au d10) ; les blessures V4 de L13 sont écartées.
- **Séquelles des critiques** (F2-I) : enregistrées comme valeurs durables du personnage, une seule fois, pour le futur module de suivi hors combat (F2-J, module neuf, indépendant de l'horloge de magie) et l'écriture future vers la fiche (`docs/VARIABLES_PERSISTANTES_PJ.md`).
- **Malus de tir sans entraînement cumulés** avec les autres modificateurs ; état **monté / démonté** durable sur le participant (lot C) à réutiliser tel quel.


## Décisions du MJ — réponses à la contre-vérification T1 BIS (26/10/2026)

Source : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T1_BIS.md`, section « Réponses du MJ (26/10 après-midi) », recopiée sur instruction directe du 27/10/2026. Ces décisions priment sur les formulations historiques ci-dessous.

- **Spécialité exacte prioritaire, confirmée.** Une spécialité qui figure sur la fiche a forcément au moins une augmentation (à 0, elle n'apparaît pas sur la fiche) : quand elle est présente, elle est prise par défaut. Le comportement actuel convient.
- **Tout personnage doit avoir son initiative avant le Round 1** : un participant ajouté directement actif après le tirage (sans passer par le banc) tire aussi son jet (PNJ d10 automatique, PJ saisi, + Bonus d'Initiative) et prend sa place. À partir du Round 1, renfort inchangé.
- **Maniement de deux armes : on garde** l'exigence d'une première attaque enregistrée dans l'outil. Corriger seulement la phrase du rapport « voies de Talents conservées ».

Le MJ passe les armes et armures du livre de base en V5 : feuille et site seront mis à jour d'abord, puis l'outil relira le catalogue. **Ne pas commencer T2 (lot D) avant la mise à jour du catalogue ; ne pas modifier `reference-snapshot.json` à la main.**

Note d'exécution (consigne de reprise, pas une décision du MJ) : la présente reprise se limite aux points 1 à 7 et à l'ajout direct avant le Round 1 ; revue ciblée, suite complète puis arrêt sans T2.

## Décisions du MJ — contre-vérification T1 du 26/10/2026

Source : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T1.md`, instruction directe du MJ du 26/10/2026. Ces décisions priment sur les choix historiques ci-dessous.

- **Égalité d'initiative à 3 ex aequo ou plus : le MJ fixe directement l'ordre** des ex aequo (remplace le tournoi A-EGALITES-01). À deux, la règle du livre reste : Initiative, puis Test opposé, le gagnant choisit.
- **Compétence par défaut : la spécialité exacte de l'arme** quand elle est présente (rapière avec Escrime 60 et Base 69 → Escrime 60 avec ses Qualités), même si une autre voie licite a un total plus haut ; le MJ peut choisir Base dans le sélecteur.
- **Participant activé après le tirage mais avant le Round 1 : il tire son jet** (PNJ d10 automatique, PJ saisi, + Bonus d'Initiative) et prend sa place. À partir du Round 1, comportement de renfort inchangé.

La reprise porte sur les points 1 à 20 de la contre-vérification T1, suivis d'une revue indépendante et de la suite complète. Arrêt avant T2 ; nouvelle contre-vérification Claude ciblée à obtenir avant son ouverture.

Note d'exécutant (pas une décision du MJ ; cas théorique, puisque selon le MJ une spécialité à 0 n'apparaît pas sur la fiche) : une spécialité présente à zéro augmentation reste prioritaire par défaut sur Base entraînée. Elle produit alors le repli CC sans Qualités prévu par le livre ; le MJ peut sélectionner explicitement Base. Ce raccord remplace l'ancien défaut automatique « voie entraînée la plus haute » dans ce cas aussi, sans accorder une maîtrise à zéro augmentation.

Date : 25/10/2026. Les décisions du MJ dans le brief et les arbitrages ne sont pas des choix de l'exécutant.

## Décisions du MJ - contre-vérification F2-C du 25/10 au soir

Source : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2-C.md`, SHA-256 `193cd8fe7973298ff45653be539dcb8dbea26fdf888f19b4ca68c6ea441fbad6`. Recopie des décisions, qui priment sur les choix d'exécutant ci-dessous :

- **Base à 0 augmentation : lettre du livre.** Même en Corps à corps (Base), 0 augmentation = CC sans les Qualités de l'arme (comportement actuel de F2-C, à garder).
- **Malus de tir sans entraînement : cumul, pas plancher.** Arbalète / jet sans spécialité −1 DR et Poudre noire sur arme d'Ingénierie −2 DR **s'ajoutent** aux autres modificateurs (bout portant +2 et −1 → +1). Remplacer le `Math.min` de `resolution.js:502`.
- **État « monté / démonté » persistant** sur le participant : démonté par défaut, une coche pour passer monté, conservé d'une action à l'autre et modifiable à tout moment. Plus de question « monté ? » à chaque attaque. Cet état fera partie des échanges futurs avec RPG Map Display : le stocker comme donnée durable du participant (et l'inscrire dans `docs/VARIABLES_PERSISTANTES_PJ.md`). Le lot F2-M s'appuiera dessus.
- **Épée bâtarde : nombre de mains lu dans le nom du catalogue « (2M) »**, modifiable d'une coche par le MJ ; plus de question à chaque attaque.
- **C-MATERIALISEES-01 non validé** : le contrôle de maîtrise s'applique aussi aux armes conjurées par un sort, sauf quand le sort impose lui-même le score (règle du sort prioritaire).
- **B-SOURCE-01 validé** : mêlée contre Surpris = +2 DR (description de l'État), pas de +1 en plus ; +1 DR au tir selon le tableau.
- **B-SOURCE-02 non validé : cumul.** Attaquant À Terre en mêlée = Désavantage (État) **et** −1 DR (tableau).

Le rapport indiquait également : « Après correction : nouvelle vérification Luna, puis nouvelle contre-vérification Claude avant de passer à F2-A. » La demande directe suivante du MJ, reçue dans ce chat, fixe la suite à exécuter : « corrige F2-C selon ce rapport et les décisions du MJ qu'il contient [...], fais revérifier par Luna, puis enchaîne A et B et arrête-toi à la fin de T1. » Cette dernière instruction autorise l'enchaînement demandé après la nouvelle vérification Luna ; elle ne vaut ni publication ni autorisation de T2. La contre-vérification Claude de T1 reste à obtenir en fin de tranche.

C-MATERIALISEES-01 et B-SOURCE-02 ci-dessous sont conservés uniquement comme historique de choix **refusés par le MJ**, sans autorité pour l'implémentation suivante.

## Précisions d'exécution de C après contre-vérification

Ces précisions sont des choix de raccord, pas des décisions ajoutées au nom du MJ.

| ID | Source | Question | Choix | Raison | Alternative |
|---|---|---|---|---|---|
| C-CAVALERIE-02 | L06 p.166/301; règle catalogue `(2M)` | Un lien historique Cavalerie annule-t-il le profil improvisé à pied ? | Non. Une arme identifiée à une main reste improvisée à pied, compétence Base ou repli CC. Cavalerie confirmée reste possible pour les voies licites, notamment deux mains; les exceptions Sabre/Marteau gardent leur règle. Cette précision remplace la portée trop générale de C-CAVALERIE-01 historique. | Une compétence liée ne change pas la nature du profil imposé par la règle. | Garder la Lance à une main comme lance normale à pied du seul fait du lien Cavalerie. |
| C-SIEGE-01 | Catalogue du MJ, L06 p.166, rapport Claude | Quelle spécialité pour une catégorie générique Siège/Embarquée ? | Lire les voies Poudre noire/Ingénierie pour le profil à poudre; pour les autres profils sans association établie, choix explicite du MJ dans les vraies spécialités Projectiles, tracé comme donnée MJ. Aucun lien automatique inventé Catapulte→Jet/Ingénierie ou Baliste→Arbalète. | La catégorie d'aide ne prouve pas une spécialité absente du catalogue. Le choix MJ ne devient pas une règle publiée. | Inventer une spécialité Siège ou sélectionner le meilleur Tir sans déclaration. |
| C-SCORE-01 | Contrat historique `action.base`, `baseCaracs`/`caracs`, rapport Claude | Le score manuel conservé est-il déjà modifié par les effets ? | Conserver le score lié pré-effet, puis appliquer le delta de caractéristique une fois; 75 et effet +10 donnent 85. Seul un marqueur préexistant explicite de score courant évite ce delta. | Préserver la saisie ne supprime pas les effets applicables et n'autorise pas leur double compte. | Marquer toute saisie comme score courant et perdre l'effet. |
| C-CONJUREES-02 | Décision MJ, L06 p.242/247/301, L13 p.95–96 | Comment raccorder les armes de sorts et leurs anciennes instances ? | Groupes canoniques communs au générateur et au combat; Faux de Shyish incluse; reconstruction ancienne par `spellEffectId`, couche et ID de contrat, jamais par supposition sur le nom. Le score imposé par le contrat, notamment Poings de Gork 55, prime. Métadonnées irrécupérables : saisie MJ de groupe/données sans maîtrise inventée. | Applique la décision universelle du MJ en conservant les exceptions sourcées et l'expiration des sorts. | Exclure les conjurées ou inventer leurs augmentations. |

Limites vérifiées : le filtrage C concerne les attaques, les défenses/parades restent une limite explicitement consignée conformément au rapport Claude. Une Ingénierie personnalisée sans portée/provenance réclame sa nature au MJ. Le choix de groupe de la Baliste/Catapulte est résolu; l'application peut rester bloquée par `precise`/`percutante`, qualités V4 déjà non validées dans la base et hors de C. Ne pas annoncer que les onze profils ont été appliqués mécaniquement.

## Historique des choix d'exécutant et état de validation

Choix d'exécutant préparés pour A/B (pas des décisions du MJ) :

| ID | Source | Question | Choix | Raison | Alternative |
|---|---|---|---|---|---|
| A-RENFORT-01 | Brief A, insertion historique | Comment intégrer un renfort sans jet après initialisation ? | Préserver son insertion explicite existante et l'ordre résolu; aucune comparaison de son I brute au score de combat des anciens. | Empêche un mélange de grandeurs et conserve tours/quotas. | Imposer un nouveau jet aux renforts sans décision source. |
| A-EGALITES-01 | L06 p.161, brief A, opposition V5 existante | Comment régler trois ex aequo ou plus sans cycle ? | Tournoi éliminatoire de n−1 oppositions I, ordre et initiateurs déclarés avant jets; gagnant final choisit la permutation complète du groupe. Jets et DR réels, manque de données bloque. | Une séquence sans cycle explicite la collecte des oppositions requises; aucun tri caché par nom/id ni gagnant saisi librement. | Round-robin cyclique ou permutation libre sans Test opposé. |
| A-COMBATREFLEXES-01 | L06 p.117, mécanisme legacy `v5-talent-actions.js` | Comment conserver deux d10/choix avec le nouveau champ ? | Deux tirages capturés et choix explicite à l'ouverture pour détenteur validé, jamais maximum imposé. Préparation legacy identifiable reprise une fois; ensuite garde claire contre double détermination qui écraserait I. Hors A, legacy inchangé. | Raccord d'un mécanisme déjà présent, sans traiter son ancien score de combat comme caractéristique I ni relancer le choix validé. | Ignorer le Talent, choisir le maximum à la place du joueur ou laisser l'ancienne activation écraser I après initialisation. |
| B-TRIP-01 | L13 p.89, conversion V4→V5 du brief | Coût de 2 Avantages dans un Élan binaire ? | 1 Élan, consommé une fois avant l'opposition Force/Athlétisme après touche; défaite sans À Terre. | Conversion prudente selon délégation du brief; aucune réserve de deux Élans n'existe. | Garder 2 Avantages V4 ou rendre l'action gratuite. |
| B-MOUVEMENT-01 | L06 p.167, parcours workspace | Comment annuler Visée sur un mouvement spatial non observable ? | Commande explicite de mouvement déclaré et invalidation sur les actions de mouvement connues; aucune déduction depuis le rangement initiative/zone. | `moveParticipant` ne déplace pas le personnage dans l'espace. | Annuler à chaque rangement d'ordre ou prétendre suivre une position absente. |
| B-CHUTE-01 | L06 p.169, chute de 2 yards L13 p.89 | Que fait 6 − BE si BE atteint ou dépasse 6 ? | Perte de Blessures planchée à zéro, jamais une guérison; Armure non déduite. | Une chute ne peut pas restaurer les Blessures; aucun plancher d'une touche d'arme importé. | Traiter la soustraction négative comme un soin ou imposer 1 Blessure. |
| B-SIZE-01 | L06 p.166, tableau relu visuellement | Monstrueuse donne-t-elle +2 au tir si l'attaquant est également Monstrueux ? | Oui, lecture littérale de la branche « ou Monstrueuse » : cible Monstrueuse +2, sans ajouter +1; pour les autres tailles, comparer à l'attaquant. | Le texte ne subordonne pas explicitement Monstrueuse à la comparaison relative. Ce cas ambigu est un choix d'exécutant, pas une décision MJ. | Réserver +2 aux cibles Monstrueuses plus grandes que l'attaquant. |
| B-VISIBILITE-01 | L06 p.166, ligne météo/lumière relue visuellement par le principal et Luna | Pluie/vent et faible lumière donnent-ils deux pénalités ? | Une seule pénalité pour cette ligne graduée : la plus sévère parmi les conditions déclarées, −1/−2/−3. Les autres lignes du tableau restent cumulables. | La ligne présente des alternatives et trois niveaux; la source ne tranche pas expressément plusieurs descriptions simultanées. Choix prudent d'exécutant à relire par le MJ, pas une décision du MJ. | Sommer automatiquement météo et lumière comme deux lignes distinctes. |

| ID | Source | Question | Choix | Raison | Alternative |
|---|---|---|---|---|---|
| C-SOURCE-01 | L06 p.166 et p.300, deux rendus PDF consultés ; F2_LOTS F-L06-0103 / 1030 | p.300 imprime « Improved Weapons » mais p.166 imprime « Improvised Weapons ». | Arme improvisée à pied à une main, sans modifier la transcription p.300. | p.166 confirme explicitement la règle retenue dans le plan et les questions F2 ; ce n'est pas une correction arbitraire d'extraction. | Lire isolément p.300 malgré la règle explicite p.166. |
| C-CADRE-01 | Arbitrage 25/10, F-L06-0847 | Les bornes de carrière sont mentionnées par le repérage brut, mais le MJ demande de garder les aménagements existants. | Conserver `suggestSkill` et le choix des spécialités existants ; ajouter les conséquences de maîtrise d'arme du lot C, sans créer de contrôle des carrières. | Application de l'arbitrage « garder l'existant, compléter seulement », prioritaire sur le repérage. Le contrôle des carrières n'est pas une mécanique déjà prouvée dans le code. | Ajouter un système de carrières non demandé par le plan. |
| C-MANUEL-01 | Brief F2-C : garder l'existant ; contrats de fiches et scores manuels historiques | Comment traiter les actions anciennes dont le MJ a fixé le score, sans snapshot de fiche ni données d'entraînement ? | Préserver le score manuel sous autorité du MJ, en mode assisté ; ne pas prétendre avoir validé une maîtrise ni inventer un nombre d'augmentations. Les actions issues du contrat de fiche et les déclarations explicites de maîtrise appliquent les nouveaux contrôles. Une augmentation explicitement nulle reste un fait à contrôler, même hors fiche. | Une absence de métadonnées sur une action manuelle ancienne n'est pas la preuve de zéro augmentation. La reprise des données de fiche absentes reste bloquée avec reçu, elle ne doit pas être confondue avec cette voie manuelle. | Invalider toutes les actions manuelles historiques en leur inventant zéro augmentation, ou prétendre qu'elles sont automatiquement maîtrisées. |
| C-CAVALERIE-01 | L06 p.166 et p.300 ; L13 p.93 ; F-L06-0102 / 1030 et F-L13-0088 | À pied avec une arme de cavalerie à deux mains, faut-il remplacer la compétence choisie ? | Conserver Cavalerie si elle est confirmée ; proposer Deux mains comme autre voie, également pour le Marteau de cavalerie. | Les sources présentent Deux mains comme option supplémentaire ; le choix de compétence confirmé ne doit pas être remplacé automatiquement. | Forcer Deux mains puis replier à CC si cette spécialité manque, malgré une Cavalerie entraînée. |
| C-MATERIALISEES-01, REFUSÉ par le MJ | Brief F2 fermé sur le JSON ; brief d'exécution C ; `v5-spell-contracts.js:2262-2269`, L06 p.242 | Le contrôle nouveau de maîtrise doit-il également reprendre les attaques matérialisées des sorts ? | Le code livré conserve leur contrat existant ; il ne contrôle pas leurs augmentations. La portée nouvelle est celle des équipements de fiche et faits MJ. **Limite ouverte**, pas règle déjà automatisée ni arbitrage explicite du MJ. | Ces actions n'ont pas le même contrat de groupe/liaison et certains sorts imposent leur score ; le brief d'exécution a préservé ce chemin. Une lecture globale de F-L06-0846 peut nécessiter son extension. | Étendre explicitement C aux attaques conjurées avec métadonnées de groupe, règles du sort, nouveaux tests et relecture, sans affirmer qu'elles exigent déjà une augmentation. |
| B-SOURCE-01, VALIDÉ par le MJ | L06 p.166 tableau rendu et lu ; p.187 Surpris ; `v5-combat-rules.js` | Tableau mêlée : cible Surprise +1 DR ; description détaillée de Surpris : +2 DR en mêlée. | Conserver +2 DR existant en mêlée selon la règle détaillée de l'État ; ajouter +1 DR au tir conformément au tableau ; aucun cumul entre les deux sources pour la même situation. | La règle détaillée et le fonctionnement existant concordent ; ne pas ajouter +1 par-dessus le +2. Divergence source conservée pour relecture MJ. | Remplacer le bonus mêlée par +1 selon le seul tableau. |
| B-SOURCE-02, REFUSÉ par le MJ | L06 p.166 tableau rendu et lu ; p.186 À Terre ; `v5-combat-rules.js` | Tableau : attaquant À Terre -1 DR ; description détaillée : Désavantage sur Tests impliquant mouvement. | Préserver le Désavantage d'État existant sur la mêlée ; ne pas doubler la pénalité avec -1 DR de la même situation. | Même principe de priorité à la description détaillée, sans affaiblir la règle existante ni cumuler deux traductions d'une même cause. | Remplacer le Désavantage par le seul -1 DR du tableau. |

Chaque choix à venir indiquera : identifiant, source, question, choix, raison et alternative, pour relecture par le MJ.

## Choix d’exécutant — Salve T2

| ID | Source | Question | Choix | Raison | Alternative |
|---|---|---|---|---|---|
| E-SALVE-01 | L13 p.123 et 126 ; catalogue V5, mot-clé Salve | Combien de points restaurer après Recharge d’un profil sans astérisque ? | Restaurer la capacité complète ; les profils imprimés avec astérisque regagnent un point par cycle. | La note imprimée réserve explicitement la recharge par point aux profils astérisqués ; conversion soumise à relecture. | Appliquer à tous les profils la description générique du catalogue, qui indique un point par Recharge. |

Conflit documentaire ouvert : la description générique du catalogue V5 ne distingue pas les profils. Ce choix n’est pas une décision du MJ.
