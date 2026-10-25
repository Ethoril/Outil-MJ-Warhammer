# Plan F2 — découpage des règles retenues en F1 (198, puis 194 après arbitrages)

25/10/2026. Source : réponses finales du MJ en F1, arbitrages de `ARBITRAGES_F1_25_10.md` appliqués. Le détail règle par règle de chaque lot (question, choix et note du MJ, repérage du code au 25/10 midi) est dans `F2_LOTS.json`. Rien n’est implanté.

Règles communes à tous les lots :
- **V5 partout** (ARBITRAGES 21/10) : une règle V4 retenue se convertit (±10 → ±1 DR, Avantage → Élan), sauf mention contraire ci-dessous.
- **« Ne pas implanter » ne retire jamais rien** ; un lot n'enlève aucun comportement existant.
- **Distances jamais suivies** : allonges et portées sont des aides affichées, le MJ choisit (arbitrage 25/10).
- **Catalogue de la feuille du MJ fait foi** sur les profils d'armes en écart avec les livres.
- Critère commun d'acceptation : tests `node --test` dédiés au lot verts, suite complète verte, aucun test existant modifié pour passer, contre-vérification indépendante (code + règle/PDF) avant publication.

## Ordre conseillé

| Ordre | Lot | Règles | Moteur principal | Dépend de |
|---|---|---|---|---|
| 1 | F2-C Compétences d'arme | 26 | `fiche-sync.js` (compétences), `resolution.js` | — |
| 2 | F2-A Initiative et surprise | 3 | `turn-order.js`, `store.js` | — |
| 3 | F2-B Modificateurs et actions de combat | 16 | `v5-talent-combat.js` (PENALTIES), `resolution.js`, `resolution-panel.js` | — |
| 4 | F2-D Qualités et défauts d'armes | 29 | `js/data/keyword-engines.js`, `roll-qualities.js`, `resolution.js` | C |
| 5 | F2-E Maladresses et incidents de poudre | 13 | `resolution.js` (fumble), nouvelle table de données | D |
| 6 | F2-N Empoignade | 5 | `resolution.js`, `v5-effects.js` (Enchevêtré) | — |
| 7 | F2-I Critiques et mort en combat | 6 | `resolution.js`, `v5-effects.js`, `js/data/v5-crits.js` | — |
| 8 | F2-L Destin et Chance | 11 | `v5-resources.js`, `v5-roll.js` | — |
| 9 | F2-G Localisations des créatures | 5 | `resolution.js` (`attackLocation`), profils de créatures | — |
| 10 | F2-M Combat monté | 8 | participant (nouveau champ « monté » + lien monture), `v5-talent-combat.js` | B |
| 11 | F2-K Corruption et mutations | 15 (dont ~175 lignes de mutations) | nouveau moteur de Corruption, données de mutations | — |
| 12 | F2-F Armes et objets de suppléments | 17 | `reference-snapshot.json`, `keyword-engines.js`, `v5-magic-casting.js` | D, K |
| 13 | F2-H Créatures du bestiaire | 13 | `creature-abilities.js`, `js/data/bestiary/*.json` | D, G |
| 14 | F2-J Séquelles et soins hors combat | 27 | nouveau module de suivi long terme (base possible : `v5-campaign-time.js`) | I |

---

## F2-A — Initiative et surprise (3)
L06-0047, 0049, 0053.
**À coder.** Calcul d'initiative à l'ouverture du combat : PNJ = d10 tiré par l'outil + Bonus d'Initiative ; PJ = jet saisi par le MJ, l'outil ajoute le Bonus d'Initiative (note du MJ). Égalités : comparer l'Initiative, puis Test opposé si encore égal (l'outil demande le jet). Case « côté surpris » à l'ouverture (réponse F-L06-0052) qui pose Surpris sur tout le camp choisi.
**Acceptation.** Un combat à 3 PNJ + 2 PJ donne un ordre reproductible à dés fixés ; égalité à Initiative égale → demande de Test opposé ; cocher « surpris » pose Surpris sur ce camp seulement ; l'ordre manuel existant (`moveInOrder`, renforts) reste inchangé.

## F2-B — Modificateurs et actions de combat (16)
L06-0019, 0056, 0109 (famille Tir, 6 lignes), 0116 (famille Mêlée, 6 lignes), 0120, 0125, 0127, 0128, 0133, 0134, 0151, 0791, 1033, 1034, 1040 ; L13-0081.
**À coder.**
- Tableaux de situation : taille de la cible, bande de portée, Surpris, couvert, À Terre, éclairage/météo au tir ; infériorité/encerclement, hauteur, Enchevêtré, À Terre en mêlée. Ce que l'outil ne connaît pas (infériorité, hauteur, espace exigu, météo) = sélecteurs ou cases du MJ (notes du MJ), appliqués comme DR typés à côté des champs existants.
- Actions : Se mettre sur la défensive (+2 DR aux défenses de cette compétence jusqu'au prochain Tour), Viser (+1 DR, annulé si on bouge ou agit autrement), Tirer dans une mêlée (Désavantage, cible aléatoire si l'inversion fait rater), deux armes, déviation d'arme de jet (affichage direction + distance), tir extraordinaire du Tireur d'élite (difficulté MJ).
- Cible sans défense : choix du jet + touche auto (déjà en partie) ; option létale = réglage de table désactivé par défaut.
- Allonges Très longue/Massive et bandes de portée : aide affichée (arbitrage 25/10).
- Affichage des 8 paliers de DR sur les reçus de Test.
- L13-0081 Croche-pied : converti en V5 (Avantages → Élan).
**Acceptation.** Chaque ligne des deux familles a un test qui pose le modificateur attendu et un test qui ne le pose pas hors condition ; la visée disparaît après un mouvement ; aucun champ de pénalité existant n'est supprimé.
**Tranché le 25/10.** Règles de Taille V4 de l'Ogre (L01-0054, 0057, 0058) et bouclier variante L13-0082 : **rester en V5**, retirées du lot (la Taille V5 de `creature-size.js` et la règle de bouclier V5 suffisent).

## F2-C — Compétences d'arme et groupes (26)
L06-0096 à 0105, 1029 à 1032, 1036 à 1039 (doublons deux à deux des précédents), 0846, 0847 ; L07-0176 ; L13-0088, 0090, 0097, 0100, 0103.
**À coder.** Lier l'arme à son groupe et à la spécialité de la fiche : sans la spécialité, mêlée en CC avec perte des Qualités (Défauts gardés) ; tir interdit sauf exceptions (arbalète et jet en CT −1 DR, Ingénierie ↔ Poudre noire, sarbacane avec Dangereuse) ; Fléau non maîtrisé = Dangereuse ; escrime avec Base = perte des Qualités ; armes de cavalerie à pied ; épée bâtarde à une main (Épuisante, Lente) ; sabre et main gauche selon la spécialité. Compétence avancée non testable sans augmentation. Spécialités : version adaptée, le MJ note que le système a déjà des aménagements → partir de `suggestSkill` (`fiche-sync.js:216`) sans le casser.
**Acceptation.** Matrice de tests arme × compétences présentes (avec / sans spécialité / sans groupe) donnant score, Qualités retirées et Défauts ajoutés attendus ; une fiche existante sans changement d'arme garde exactement ses résultats actuels.
**Tranché le 25/10.** Spécialités : **garder l'existant** (choix actuel de la compétence d'attaque par `suggestSkill`), n'ajouter que ce qui manque (perte des Qualités sans spécialité, Défauts gardés, exceptions de tir…).

## F2-D — Qualités et défauts d'armes (29)
L06-1041, 1042, 1045, 1046, 1048, 1049, 1051 (famille Parade), 1054, 1057, 1058 (famille Piège-lame), 1060, 1061, 1064, 1070, 1071, 1075, 1135 ; L13-0077 à 0080, 0085, 0091, 0098, 0099, 0101, 0102 ; L11-0009, 0010.
**À coder.** Passer de « affiché » à « calculé » dans `keyword-engines.js` : Explosion (toutes les cibles désignées par le MJ, sans DR), Rapide (+2 Initiative à l'attaque), Taille (−1 PA de la pièce touchée), Empaleuse fichée (Blessure bloquée tant que le projectile reste), Infliger un État, Parade (ignore main secondaire, seconde attaque non opposable), Pistolet au contact, À répétition + Rechargement **en nombre de succès** (note du MJ), Piège-lame (désarmer, briser), Incassable, À enroulement (−1 DR aux défenses), Entaille, Dispersion selon la bande choisie, qualités conditionnelles (couteau), boucliers attaché/frappé, pénalités d'armure (Discrétion, Perception), arme naturelle par défaut, filets et immobilisations (Force 25 / 55 / +20, sortie par Test de Force cumulant les DR).
**Acceptation.** Un test par mot-clé (cas positif et négatif) ; le statut renvoyé par `keywordMechanicalStatus()` passe à « couvert » pour chacun ; les mots-clés déjà calculés gardent leurs résultats.

## F2-E — Maladresses et incidents de poudre (13)
L06-0082 (famille, 7 lignes), 0090, 0091 (famille, 2 lignes) ; L13-0107 à 0110, 0112, 0116 à 0118, 0179 ; L15-0163.
**À coder.** Table de maladresses de combat (aujourd'hui simplement signalées) : Blessure directe, arme abîmée + agir en dernier, −1 DR à la prochaine Action, perte du Mouvement ou de l'Action, cheville (critique temporaire), allié touché ou Sonné. Table d'incident de poudre sur 99-100 avec Poudre noire / Ingénierie / Explosif. Particularités : mèche à allumer, Griffonsfoot (6 canons), hache- et hallebarde-fusil chargées, mortier à main (explosion, mèche, grappin), bruit (Assourdi), recul de l'arquebuse à salve, servant seul.
**Acceptation.** À jet fixé, chaque résultat de table produit l'effet attendu sur le bon participant ; un jet de maladresse sans arme à poudre ne tire jamais la table d'incident.

## F2-N — Empoignade (5)
L06-0136 à 0140.
**À coder.** Déclaration avant le jet de Bagarre ; victoire = prise + Enchevêtré au lieu des dégâts ; à chaque Tour, Test de Force opposé pour l'Action : blesser (BF + DR, sans PA), immobiliser (+1 Enchevêtré, +1 par DR au-delà du premier) ou se dégager.
**Acceptation.** Scénario complet sur trois Tours (engager, blesser, se dégager) avec les États et Blessures attendus.

## F2-I — Critiques et mort en combat (6)
L06-0307, 0311, 0312 (+ doublon L13-0018), 0321, 0335 (famille des séquelles des critiques, ~70 lignes).
**À coder.** Assommer (Assommante à la tête, Sonné > BE → Inconscient, coup retenu) ; mort par critiques multiples (plus de critiques que BE et Inconscient → décompte de BE Rounds, **décision finale au MJ**) ; option de mort subite des figurants (réglage de table, PNJ secondaires seulement) ; choc d'amputation (Résistance, À Terre / Sonné / Inconscient). Pour chaque ligne de critique : enregistrer la séquelle durable (fracture, déchirure, amputation, perte d'œil…) dans un état persistant que F2-J exploitera. **Rester en V5** : second critique sur dégâts excédentaires, coagulation au d10 (arbitrage 25/10).
**Acceptation.** Chaque ligne de la table V5 produit sa séquelle persistante ; la mort n'est jamais appliquée sans confirmation du MJ.

## F2-L — Destin et Chance (11)
L06-0025, 0027, 0030, 0031, 0032, 0033 (famille, 2 lignes), 0035, 0899, 0897, 0898, 0990.
**À coder.** Chance : Avantage avant le jet, relances successives. Destin : annuler une attaque (avant dégâts et critiques), survivre (retiré de la rencontre), réussite sans jet (opposition gagnée d'au moins +1 DR, choix de la localisation du critique). Attribution manuelle de Destin par le MJ. Conversions V4 (Résilience → Destin, Détermination → Chance, Avantage → Élan, ±10 → DR) appliquées à l'import de profils V4. Aide de conversion monétaire (couronne / pistole / sou) sur la fiche ou l'équipement.
**Acceptation.** Chaque dépense décrémente le bon compteur une fois, avec reçu ; une annulation d'attaque n'applique ni dégâts ni critique ; les relances de Chance existantes restent identiques.

## F2-G — Localisations des créatures (5)
L06-1127 à 1130, 1132.
**À coder.** Schéma de localisation par morphologie (quadrupède, oiseau, serpent, araignée) dans `attackLocation`, déduit du profil ou choisi par le MJ ; critique d'appendice = table du bras.
**Acceptation.** À jet fixé, un serpent touché sur 15 → tête, 40 → corps ; un humanoïde garde exactement la localisation actuelle.

## F2-M — Combat monté (8)
L06-0146, 0147, 0149, 0150 ; L13-0139 à 0142.
**À coder.** Sélecteur « monté » sur le participant (note du MJ) et lien cavalier ↔ monture ; Avantage de cavalerie contre plus petit que la monture ; viser cavalier ou monture ; BF de la monture en charge ; Désavantage à l'Esquive (sauf Cavalier émérite), en remplacement du champ chiffré actuel ; chutes : mort / KO / À Terre, Surpris / Sonné, prise, monture craintive Enchevêtrée.
**Acceptation.** Un participant non monté a exactement les résultats actuels ; chaque événement de chute produit le Test d'Équitation attendu.

## F2-K — Corruption et mutations (15 questions, ~175 lignes)
L06-0488 à 0492, 0494 à 0499, 0759, 0500 (39 mutations) ; L17-0078 (134 marques des Vents / mutations étendues) ; L23-0136.
**À coder.** Moteur de Corruption : Test Résistance ou Calme au choix du MJ, exposition simple / prolongée, influences mineure / modérée / majeure (barèmes), **seuil calculé par l'outil** = BE + BFM, doublé par Âme pure (arbitrage 25/10), Test au dépassement, réduction de BFM à la mutation, physique ou mentale selon l'espèce, délai 3d10 jours secret, personnage perdu, absolution fixée par le MJ. Tables de mutations en données. Points de Corruption et mutations destinés au futur envoi vers la fiche.
**Acceptation.** Barèmes testés aux bornes de DR ; seuil recalculé quand BE/BFM changent ; aucune mutation sans confirmation du MJ.
**Tranché le 25/10.** **Tout dans le lot, L17 converti en V5** : 39 mutations L06 + 134 marques des Vents et mutations étendues L17 + table étendue L23. Saisie déléguée, contre-vérifiée sur les PDF. Découpage interne : K1 moteur de Corruption, K2 tables de mutations.

## F2-F — Armes et objets de suppléments (17)
L11-0013, 0014, 0016, 0017, 0018, 0076, 0078, 0079, 0081, 0083 ; L13-0086, 0087 ; L22-0139 ; L24-0008 ; L06-1104, 1105, 1134.
**À coder.** Effets propres : contamination des armes skavens (Test de Corruption sur cible blessée → F2-K ; **valeurs du catalogue conservées**), lame de malepierre, dague funeste, lames à poignée de bois, plate de léviathan, pointes de dragon, pavois porté / planté, brise-os, griffes du tigre ; bâton enchanté (−1 niveau d'incantation sur le domaine) et robes (+1/+2/+3 DR en Focalisation) ; règle « dégâts imprimés déjà calculés » (déjà décidée en E0, à vérifier qu'elle est appliquée partout).
**Acceptation.** Chaque objet testé sur un cas positif ; les profils du catalogue inchangés.

## F2-H — Créatures du bestiaire (13)
L11-0001, 0002, 0004 ; L18-0041, 0047 ; L22-0140 ; L23-0256, 0266 ; L25-0418, 0421, 0426, 0428, 0443.
**À coder.** Règles propres aux profils, lues aujourd'hui par aucun code (`specialRules`) : bois de Taal et de Kurnous, toiles venimeuses, crâne inerte, Seigneur des tombes (variantes MJ), araignée de falaise, grand félin, crachat, élémentaire marin, Gargantuan, Merwyrm, Léviathan noir, Wulfrik. Les parties « navire » (Gargantuan, Léviathan) restent des rappels, puisque les navires sont fermés en bloc.
**Acceptation.** Chaque règle s'applique sur le profil concerné et seulement sur lui.

## F2-J — Séquelles et soins hors combat (27)
L06-0301 à 0304, 0308, 0310, 0313 à 0315, 0317 à 0320, 0322 à 0331, 0333, 0334, 0823, 0437.
**À coder.** **Module de suivi des effets longs** demandé par le MJ (note F-L06-0304) : délais en jours, convalescence (semaine de 8 jours), infection d'une blessure non soignée, fractures et déchirures (délais, Tests de guérison, séquelles), amputations et pertes (malus permanents sur les Tests), cicatrices, soins par Guérison (BInt + DR, un soin par incident, maladresse 1d10), chirurgie, soins d'un malade. Perte de caractéristique → information à envoyer à la fiche (écriture vers la fiche prévue plus tard).
**Acceptation.** Une séquelle posée par F2-I avance avec le temps de campagne et se termine au bon jour ; les malus permanents s'appliquent aux Tests concernés.
**Tranché le 25/10.** **Module neuf**, dédié aux séquelles, avec son propre calendrier de convalescence, indépendant de l'horloge de magie (`v5-game-time.js` / `v5-campaign-time.js` restent intacts). Lot à découper : J1 module + soins, J2 séquelles et malus permanents.

---

## Points tranchés par le MJ le 25/10 (avant F2)
1. Taille V4 de l'Ogre et bouclier variante L13 : **rester en V5**, 4 règles retirées (194 règles au total).
2. Spécialités : **garder l'existant**, compléter seulement.
3. Mutations : **tout dans F2-K, L17 converti en V5**, saisie déléguée et contre-vérifiée.
4. Suivi hors combat : **module neuf**, indépendant de l'horloge de magie.
