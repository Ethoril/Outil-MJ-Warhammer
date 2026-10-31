# Arbitrages du MJ sur le repérage F1 — 25/10/2026

Quatre réponses « Ne pas implanter » portaient sur des règles que l'outil fait déjà en partie. Le MJ confirme : on ne retire rien, on n'ajoute rien.

| Question | Décision |
|---|---|
| F-L06-0057 Marche et course | Garder le calcul ×2 / ×4 de la Fuite d'un Brisé (`js/core/v5-broken-escape.js`) ; pas de calcul général de déplacement. |
| F-L06-0060 Sprint | Garder le Sprint de la Fuite d'un Brisé ; pas de Sprint général. |
| F-L06-0108 Modificateurs de situation | Garder les champs de pénalités saisis à la main (`V5_TYPED_PENALTIES`, `js/core/v5-talent-combat.js`) ; pas de tableau automatique. |
| F-L06-0129 Se rendre sans défense | Garder la case « Cible sans défense » (`js/ui/resolution-panel.js`) ; pas de règle dédiée au refus d'opposition. |

Règle de lecture pour la suite : « Ne pas implanter » sur une règle déjà présente veut dire « ne rien ajouter », jamais « retirer ».

## Blocs fermés en une fois (25/10)

Le MJ ferme par « Ne pas implanter » (« Rien » pour les familles) les sous-systèmes : navires et navigation, voyage/météo/environnement, maladies/poisons/remèdes, alchimie/potions, objets magiques, artisanat, économie/commerce, entre-aventures/société, compétences hors combat, tables d100 et lieux de scénario, équipement ordinaire, animaux/dressage.

Restent ouverts : véhicules et montures (poursuites comprises), bataille de masse/sièges/artillerie, mutations.

Classement par mots-clés relu par trois agents : 1 345 questions candidates, 375 retirées car elles touchent au combat, à la magie, aux prières, à la Corruption, au bestiaire ou à un bloc gardé ouvert (`blocs-exclusions-25-10.json`). **970 questions fermées**, dans `F1-import-blocs-25-10.json` (journal importable, fusionné avec les 124 réponses de l'export de 12 h 02 ; note « Bloc fermé le 25/10 : <thème> »).

## Seuil de Corruption (F-L06-0759 Âme pure), 25/10 après-midi

Réponse maintenue : « Implanter, version complète ». L'outil calculera lui-même le seuil de Corruption (BE + BFM, doublé par Âme pure), car le faire porter par la fiche risque un décalage. Exception assumée à la règle « valeurs dérivées dans les fiches » (`docs/lot2/CHOIX_POUR_LA_REPRISE.md`). Les points de Corruption viennent aujourd'hui de la fiche ; l'envoi de mises à jour vers la fiche, déjà prévu, transmettra les points de Corruption et les mutations éventuelles.

## Point d'étape de l'export de 16 h 49

1 324 réponses (970 blocs importés + 354 du MJ, dont 230 nouvelles depuis 12 h 02). Aucune ancienne réponse modifiée. Croisement avec le repérage : un seul écart (Âme pure, tranché ci-dessus). 16 réponses « Implanter, version complète » portent sur des règles partielles et 5 sur des règles absentes : ce sont les premiers vrais lots F2.

## Export (2), 25/10 soir : 1 743 réponses (970 blocs + 773 du MJ), 1 606 ouvertes

Trois accroches tranchées par le MJ :

- **Blessures L13 : rester en V5.** F-L13-0011, 0013, 0015, 0016 et 0019 passent en « Ne pas implanter » (cohérent avec le refus de l'option alternative F-L13-0010). Le moteur garde le second critique V5 sur dégâts excédentaires et le d10 de coagulation. F-L13-0012 et 0018 restent « Implanter » (déjà faits ou doublons de L06).
- **Mitrailleuse Ratling et Lance-feu (F-L11-0013, 0016) : la feuille du MJ fait foi.** Le catalogue garde ses valeurs (Ratling +9 / 60 yards ; Lance-feu +10 / 30 yards / Explosion 3). Seule la partie non couverte (contamination, effets particuliers) entre en F2.
- **Allonges Très longue / Massive et bandes de portée (F-L06-1033, 1034, 1040) : aide affichée.** L'outil affiche l'allonge en yards et propose les bandes de portée de l'arme ; le MJ choisit la bande, l'outil applique le modificateur. Aucun suivi de distance (PLAN_EVOLUTION inchangé).

À noter aussi : F-L06-1064 Rechargement adapté par le MJ, « pas un nombre d'Actions mais un nombre de succès ».

## F1 terminée — export final (3), 25/10

3 349 / 3 349 questions renseignées (970 blocs + 2 379 réponses du MJ), aucune réponse antérieure modifiée. Journal archivé : `F1-journal-final-25-10.json`.

Les cinq réponses L13 (0011, 0013, 0015, 0016, 0019) sont restées « Implanter » dans le journal ; l'arbitrage « rester en V5 » ci-dessus prime.

**Candidats F2 : `F2-candidats.json`**, 220 règles retenues, dont 22 déjà faites, soit **198 à traiter** : Combat 89, Équipement 32, Blessures 31, Psychologie/Corruption 14, Bestiaire 10, Destin 7, Véhicules 4, Compétences 3, Talents 3, Hors périmètre 3, Maladies 1, Création 1. Aucune règle de magie retenue. 7 portent une note ou un choix ligne par ligne.

## Points tranchés avant F2 (25/10, fin de journée)

1. Taille V4 de l'Ogre (F-L01-0054, 0057, 0058) et bouclier variante (F-L13-0082) : **rester en V5**, retirés de F2.
2. Spécialités (F-L06-0847) : **garder l'existant** (`suggestSkill`), compléter seulement ce qui manque.
3. Mutations : **tout dans F2-K**, table L17 (Winds of Magic) **convertie en V5**, saisie déléguée et contre-vérifiée.
4. Suivi des séquelles hors combat : **module neuf**, indépendant de l'horloge de magie.

Plan à jour : `PLAN_F2_LOTS.md`, `F2-lots.json` (194 règles, 14 lots).

## Contre-vérification F2-C (25/10 soir) — décisions du MJ

Base à 0 augmentation : lettre du livre (CC sans Qualités). Malus de tir sans entraînement : cumul avec les autres modificateurs. État « monté / démonté » persistant sur le participant (démonté par défaut, une coche), futur échange avec RPG Map Display. Épée bâtarde : mains lues dans « (2M) », modifiable. Armes conjurées : contrôle de maîtrise appliqué, sauf score imposé par le sort. Surpris en mêlée : +2 DR (État). Attaquant À Terre : Désavantage et −1 DR cumulés.

## Contre-vérification T1 (26/10) — décisions du MJ

Égalité d'initiative à 3+ : le MJ fixe l'ordre des ex aequo. Compétence par défaut : la spécialité exacte de l'arme (avec ses Qualités) plutôt que le total le plus haut. Participant activé avant le Round 1 : il tire son jet. B-VISIBILITE-01 validé par la contre-vérification (ligne graduée unique du tableau p.166).

## Espèces (26/10, rapport Gemini) — décisions du MJ

Halfling : Mouvement 3 et Blessures V5 (avec BF). Ogre : Blessures ×2 (Taille Grande V5). Espèces ajoutées : Gnome (Petit, M 3, 2×BE + BFM), Elfe noir M 5, Elfe des mers M 5, Skink M 6 ; espèce inconnue signalée au lieu de M 4 silencieux. Brief : `tmp/gemini-verifs/BRIEF_CORRECTIONS_ESPECES_ET_COUVERTURE.md`, à lancer après T1.

## Armes et armures en V5 (26/10) — décisions du MJ

Passage des armes et armures du livre de base en V5 ; groupe Parade supprimé (augmentations Parade existantes : au cas par cas) ; armes à une main détaillées et armes des suppléments conservées, adaptées en V5 ; objets V4 seuls (Fléchette, Arc elfique, Plastron de cuir bouilli, Cape) conservés ; boucliers en armure (qualité Bouclier V5). Brief : `E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4/docs/briefs/BRIEF_ARMES_ARMURES_V5_ET_ESPECES.md` (feuille et fiches d'abord ; l'outil relit ensuite ; F2-D attend). Spécialité exacte prioritaire confirmée (absente de la fiche à 0) ; tout personnage tire son initiative avant le Round 1 ; Maniement de deux armes : exigence gardée.
Invocations au Round 0 après le tirage : jet d'Initiative comme les autres (MJ, 27/10).
Bouton « + Actif » (ajout direct en jeu depuis la liste des profils) : gardé (MJ, 27/10).

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

## Décisions du MJ du 28/10 (F2-H, après la contre-vérification T4-H)
1. Suffocation de l'Immersion (élémentaire de mer) : **coder le décompte** de noyade (PV par Round, Inconscient à 0, mort proposée au MJ, jamais appliquée seule).
2. Lasso de l'araignée de falaise : l'Enchevêtré a la **Force de l'araignée** (45, lue sur le profil).
3. Élémentaire de mer lanceur de sorts : **le BF remplace BI et BFM partout** (score, surcharge, canalisation).
4. Tueur de champions (Wulfrik) : **un seul gain d'Élan par duel**, marqué consommé, réarmé par le MJ.
5. Coup mortel du grand félin : **le coder** (attaque gratuite après une mise hors de combat, sans restriction de Taille). Vérifier d'abord le texte exact de Deathblow dans la source avant d'implanter.

## Décisions du MJ du 29/10 (F2-J1, séquelles et soins)

- Talent Chirurgie (p.127) : sur un Test de Guérison réussi hors combat, le chirurgien choisit les DR ou le chiffre des unités du d100 ; **un 0 vaut 0** (lecture littérale).
- Maladresse d'un Test de Chirurgie : **comme un soin**, 1d10 Blessures sans descendre sous 1 (p.170).
- Infection (p.171) : **un Test de Résistance par blessure non traitée**, chaque soir.
- Test de Guérison raté : la blessure **n'est pas bandée** et peut s'infecter.
- Convention rappelée : toute mesure en yards devient la même valeur en mètres, sans conversion.

## Décisions du MJ du 29/10 : livre de base V5 v3 (27/10/2026)

Page de décision : https://claude.ai/artifact/3g61EkX3SAhorWeqXjSGZn (copie des choix : `tmp/v5-diff-v2-v3/decisions/decisions/*.json`, analyse : `tmp/v5-diff-v2-v3/ANALYSE_P001-200.md` et `ANALYSE_P201-380.md`).
- **51 changements reportés** (la v3 devient la référence de l'outil), y compris ceux qui contredisaient d'anciens arbitrages : Masque mortuaire et Givre d'Ulric en Peur (2), Faux de Shyish sans gain d'Élan pour les morts-vivants.
- **5 conservés** tels que l'outil les a : dotations de carrière et Navigation (projet des fiches), Fantasmagorie, Jambes solides (version v2, choix DR ou unités gardé), Trahison de Tzeentch (version v2), Trait Imprégné d'Ulgu (non ajouté).
- Report après la clôture de F2 ; les valeurs de la feuille du MJ (armes, talents, sorts) passent d'abord par la feuille.
- Arcs elfiques harmonisés par le MJ dans la feuille (29/10) : Arc elfique =+9, Arc d'Anirain =+9 (dégâts fixes, sans BF, comme les arcs v3).

## Décisions du MJ du 29/10 (F2-J2, séquelles)

- Obstiné (« sans modificateur négatif ») **n'efface pas** les malus de séquelles (infirmité, pas une circonstance), comme les Blessures critiques.
- Fracture du corps, « Major Disadvantage » = **deux sources de Désavantage**.
- Mouvement divisé par deux : **arrondi au-dessus partout** (pied, déchirure, fracture).
- Immobiliser une fracture est un **Test à part** : il ne consomme pas le soin unique de Blessures de l'incident.
- Appliqués sans question (lecture du livre) : dents perdues, seuil « plus de la moitié » par espèce, strictement supérieur ; maladresse de Guérison (1d10, pas sous 1 Blessure) sur tout Test de Guérison J2 ; déchirure mineure guérie au terme de 30−BE jours, signalé au MJ.

## Décisions du MJ du 31/10 (questions du rapport de phase R)

1. **Peur sans indice chiffré** : Peur (1) par défaut, comme le livre v3 p.358 (remplace l'arbitrage C0 du 21/10 pour ce cas) ; la valeur reste corrigeable à la main.
2. **Œil de la tempête** : s'applique aussi à la pause de Focalisation (Test de Focalisation, p.236), comme aux autres Focalisations.
3. **Grim** : plus de limite d'une attaque gratuite par Tour ; autant que la règle en déclenche.
4. **Attribut des Bêtes** : gardé tel quel (tous les ennemis vivants actifs, sans liste décochable ; distances non suivies).
5. **Morsure** : règle gardée (valeur imprimée prioritaire, BF+3 seulement sans aucun chiffre).
6. **Perturbant** : les participants « neutres » sont touchés ; un Perturbant touche tout le monde sauf son propre camp.
7. **« yards » des citations du bestiaire** (`sourceText`) : convertis en mètres, même valeur (50 yards → 50 m).
8. **Documents lot3** : régénérés depuis les données v3, assertion de `tools/check-lot3-generation.mjs` remise à jour.
9. **Suite de R3** (lots à accesseurs, découpes à fermeture forte) : arrêtée.
