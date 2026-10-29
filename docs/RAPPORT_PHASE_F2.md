# Rapport de phase F2 — clôture (29/10/2026)

Branche `gpt/phase-f2`, worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`. Commits locaux uniquement : ni push, ni version, ni `sw.js`. Les rapports de tranche détaillés restent dans `docs/plans-gpt/RAPPORT_GPT_PHASE_F2.md` ; ce document est la synthèse par lot. Source des règles : `PLAN_F2_LOTS.md` et `ARBITRAGES_F1_25_10.md` (copies dans `docs/plans-gpt/f2/`).

Principes appliqués partout : V5 (±10 devient ±1 DR, Avantage devient Élan), « Ne pas implanter » ne retire rien d'existant, distances jamais suivies (aides affichées, le MJ choisit), la feuille du MJ fait foi sur les profils d'armes, aucune mort ni mutation appliquée sans confirmation du MJ.

## Par lot

- **F2-C Compétences d'arme** : lien arme / groupe / spécialité de la fiche ; sans spécialité, mêlée en CC avec perte des Qualités (Défauts gardés), exceptions de tir, armes conjurées, épée bâtarde à une ou deux mains, état monté durable. L'existant (`suggestSkill`) est conservé. *Rappel* : le contrôle filtre les attaques, pas les parades.
- **F2-A Initiative et surprise** : initiative PNJ (d10 + Bonus) et PJ (jet saisi + Bonus) à l'ouverture, égalité résolue par Test opposé, côté surpris coché à l'ouverture. L'ordre manuel existant est inchangé.
- **F2-B Modificateurs et actions de combat** : tableaux de situation (Tir et Mêlée), Défensive, Viser, tir dans une mêlée, deux armes, déviation d'arme de jet, tir extraordinaire, cible sans défense, option létale (réglage de table désactivé par défaut), paliers de DR sur les reçus, Croche-pied V5. *Rappels* : allonges Très longue / Massive et bandes de portée (aides affichées) ; infériorité, hauteur, espace exigu et météo sont des cases du MJ.
- **F2-D Qualités et défauts d'armes** : mots-clés passés d'« affiché » à « calculé » (Explosion, Rapide, Taille, Empaleuse fichée, Parade, Piège-lame, filets, recharge, etc.). Empaleuse reste « couvert » avec la qualification du chirurgien confirmée par le MJ ; Inflige et les clauses sans preuve intégrale restent manuelles. *Rappels* : bois de cerf tombé naturellement, pavois porté Lente / Épuisante.
- **F2-E Maladresses et incidents de poudre** : table de maladresses de combat, incident de poudre sur 99-100, mèche, Griffonsfoot, mortier et hache-fusil, incident de Salve. Jamais de table de poudre sans arme à poudre.
- **F2-N Empoignade** : déclaration avant le jet, prise + Enchevêtré, Test de Force opposé à chaque Tour (blesser, immobiliser, se dégager), libération des deux participants, liens purgés au redémarrage.
- **F2-I Critiques et mort en combat** : Assommer, décompte de mort par critiques multiples (décision finale au MJ), mort subite des figurants (réglage de table), choc d'amputation, séquelle persistante enregistrée pour chaque ligne de critique (`criticalAftermath`). Second critique sur excédent et coagulation au d10 restent en V5.
- **F2-L Destin et Chance** : Avantage de Chance avant le jet, relances successives, Destin (annuler une attaque, survivre, réussite sans jet avec choix de la localisation du critique), attribution manuelle, conversions V4 à l'import, aide monétaire. Payeurs et reçus, temporaires dépensés avant les permanents.
- **F2-G Localisations des créatures** : schéma par morphologie (quadrupède, oiseau, serpent, araignée), override MJ par cible, table de critique d'appendice ; PA à saisir si la patte d'araignée ne désigne pas une pièce identifiable. L'humanoïde garde son chemin existant.
- **F2-M Combat monté** : lien cavalier-monture, charge, Esquive en Désavantage (sauf Cavalier émérite) à la place de l'ancien champ chiffré, chutes (mort / KO / À Terre, Surpris / Sonné), Tests de Chevaucher, prise, monture craintive. Un participant non monté garde ses résultats.
- **F2-K Corruption et mutations** : K1 moteur (Test Résistance ou Calme, expositions, influences, seuil BE + BFM doublé par Âme pure, délai 3d10 secret, perte de personnage, absolution) ; K2 catalogue de mutations (L06 : 40 entrées imprimées pour 39 annoncées ; L17 : 80 marques converties en V5 ; L23 : 125 entrées avec sous-tables). Classement des sources d'une séance déclaré par le MJ, non automatisé ; règles incertaines assistées.
- **F2-F Armes et objets de suppléments** : contamination des armes skavens, Lame de malepierre (Test +2 DR), Dague funeste (secret d10), poignée de bois de Grand Cerf, plate de Léviathan, pointes de dragon, pavois porté / planté, brise-os, Griffes du tigre, bâton enchanté et robes, dégâts imprimés déjà calculés. *Clôture* : le maquillage de la blessure en griffure de grand félin est désormais un choix explicite du porteur (case décochée par défaut dans le panneau de résolution), enregistré seulement s'il est coché (L24 p.67).
- **F2-H Créatures du bestiaire** : règles propres aux profils lues par le code (bois de Taal et de Kurnous, toiles venimeuses, crâne volant, Seigneur des tombes, araignée de falaise, grand félin, crachat, élémentaire de mer, Gargantuan, Merwyrm, Léviathan noir, Wulfrik), chacune liée à son profil exact. *Clôture* : le rappel du Coup mortel des grands félins précise que chaque bond vise une autre créature, jamais deux fois la même (V4 p.160 / L23 p.87) ; la Suffocation de l'Immersion tombe avec l'Enchevêtré de l'Immersion même si un autre Enchevêtré (filet) subsiste. Parties « navire » (Gargantuan, Léviathan) en rappel.
- **F2-J Séquelles et soins hors combat** : J1 module neuf de suivi (calendrier de convalescence propre, soins par Guérison, chirurgie, infection, maladies, sauts de plusieurs jours) lié aux occurrences F2-I ; J2 séquelles V5 p.177-179 (fractures avec immobilisation, déchirures, pertes de membres et d'organes, perte de caractéristique, cicatrices) et malus permanents / temporaires lus par la résolution via une projection unique. `v5-game-time.js` et `v5-campaign-time.js` sont intacts.
- **F2-R Référentiel d'armes et d'armures V5** : catalogue de la feuille, builder et empreintes cohérents (Blackbriar, astérisque Poivrière).

## Décisions du MJ appliquées

Distances (29/10) : toute mesure en yards s'écrit avec la même valeur en mètres, sans conversion (libellés de `js/ui` et `js/core` ; clés de données comme `rangeYards` et données importées inchangées ; les parenthèses redondantes « (source V5 : N yards) » ont été retirées). Décisions du 28/10 : Force de la créature pour l'Immersion (59) et le lasso (45), Suffocation avec décompte de mort à la fin du Round, Coup mortel à chaque frappe de mêlée réussie avec plafond au Bonus de CC, Champion Slayer une fois par duel et réarmé par le MJ, Force de l'élémentaire de mer pour BI et BFM, réversion du crâne volant sur confirmation du MJ. Décisions du 29/10 pour J : Talent Chirurgie (DR ou chiffre des unités), maladresse de chirurgie, Têtu qui garde les malus de séquelle, immobilisation qui laisse la seule guérison de Blessures, Désavantage majeur = deux.

## Limites acceptées

- Bois de cerf tombé naturellement : rappel (pas de mécanisme général de bris).
- Pavois porté Lente / Épuisante : rappel.
- Agrégat de charge du Léviathan : l'encombrement est calculé par pièce et affiché, sans total de charge.
- Distances et directions saisies par le MJ, jamais suivies.
- Chaînes du Coup mortel non comptées : seul le plafond (Bonus de CC) est affiché ; le rappel exige une créature différente à chaque bond.
- Prothèses : en rappel.
- Remise en place d'un membre : confirmée par le MJ, non déduite.
- Autres : parties navales de H en rappel (navires fermés en bloc), qualification du chirurgien confirmée par le MJ, classement des sources de Corruption d'une séance déclaré par le MJ.

## Nouveaux modules de F2 (précache de `sw.js`, réservé à Claude)

`git diff --name-status --diff-filter=A main...HEAD -- js` donne 24 fichiers, identiques à la liste signalée par `tests/sw.test.js` :

- `js/core/currency.js`
- `js/core/v5-aftermath.js`
- `js/core/v5-combat-fumbles.js`
- `js/core/v5-corruption-mutation-catalog.js`
- `js/core/v5-corruption-mutations-l06.js`
- `js/core/v5-corruption.js`
- `js/core/v5-critical-aftermath.js`
- `js/core/v5-grappling.js`
- `js/core/v5-hit-morphology.js`
- `js/core/v5-legacy-conversion.js`
- `js/core/v5-mounted-combat.js`
- `js/core/v5-reloading.js`
- `js/core/v5-sequela-effects.js`
- `js/core/v5-sequelae.js`
- `js/core/v5-supplemental-equipment.js`
- `js/core/v5-weapon-qualities.js`
- `js/data/f2-h-profile-abilities.js`
- `js/data/v5-combat-fumbles.js`
- `js/data/v5-corruption-mutations-l17.js`
- `js/data/v5-corruption-mutations-l23-audit.js`
- `js/data/v5-corruption-mutations-l23.js`
- `js/ui/v5-aftermath-panel.js`
- `js/ui/v5-corruption-panel.js`
- `js/ui/v5-fate-dialog.js`

## Données durables

`docs/VARIABLES_PERSISTANTES_PJ.md` : sections F2-J2 (séquelles) et « Complément F2 » (monture, morphologie, dégâts d'armure, disposition et recharge des armes, réserve de poudre, projectiles fichés, filets, pavois, maquillage félin, poignées et robes, expositions malepierre, Suffocation, Champion Slayer, mort subite) ; K1 et L y figuraient déjà.
