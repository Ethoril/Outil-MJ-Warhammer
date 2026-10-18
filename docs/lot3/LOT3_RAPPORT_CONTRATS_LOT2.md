# Contrats Lot 2 — Arcanes, mineurs et retours Lot 1

12 octobre 2026. Livraison locale dans `codex/lot2-talents-v5`, sans commit, publication ni modification de catalogue. Sources personnelles relues : Livre de base V5 pp. 240–245 (six pages également rendues et contrôlées visuellement), pp. 131, 169, 184, 235–236, 299, 301, 357–358 et 363 ; retours Domaines pp. 246–255. Le cadrage du MJ, notamment les décisions du 12 octobre, prime.

## Résultat et limites

**48 identités sorties des anomalies/non-vérifié du lot : 15 conformes dans les scénarios calculatoires, 24 données MJ nécessaires et 9 rappels.** Les paramètres et reçus de chacune sont dans [les preuves Lot 2](LOT3_PREUVES_CONTRATS_LOT2.json), les deux fichiers de tests et les lignes actualisées du suivi. Ces nombres ne certifient pas toutes les situations d’une session.

Correction des dégâts/PA/états, des paramètres de portée/cible/durée, des DR finaux avant surpuissance, des durées par mode, des choix d’arme et de Domaine. Souffle utilise CT/Esquive, ses huit variantes et les distances déclarées ; Chaîne lit les Blessures réellement perdues, décroît et s’arrête au seuil/à la limite. Poussée conserve BE, ignore PA et traite séparément les collisions sans dégâts. Perturbant pose −2 aux vivants désignés, sans cumul. Armure aethyrique donne +1 PA ; Arme aethyrique crée une action locale choisie dans les 29 lignes du tableau p. 301, avec Magique et expiration. Choc ne cause aucune Blessure. Drain soigne exactement 1 B, même avec Protection réussie. Sommeil distingue debout/couché/consentant et propose le réveil. Feux follets, Lumière et Sons ont leur contrôle FM +2 ; Source produit des reçus bornés au Bonus d’Initiative sans stock dédié.

Restent explicitement assistés, avec leur raison dans chaque fiche :

- Positions, ligne de vue, occupants, plus proche cible, engagements et collisions : absence de plateau ; désignation requise, jamais déduite. Le sang corrosif est résolu après Blessures **déclarées**, avec un seul d10 commun et une localisation/Protection par engagé ; aucun déclenchement spatial automatique.
- Déplacement d’objet, pont, téléportation, objets lâchés et effets organiques : reçus chiffrés et Test opposé quand pertinent ; destination/inventaire joués par le MJ. Pont : le reçu indique les dimensions de base, le rappel de surpuissance indique l’augmentation, et le MJ choisit la dimension concernée.
- Souffle froid : +1 DR à la défense adverse tant que la fatigue de ce Souffle demeure ; la priorité de frappe est rappelée au MJ, car le moteur suit les Tours, sans séquence indépendante des attaques. Acide : dégradation de 1 à reporter sur la fiche.
- Envol : Athlétisme, position sol/air déclarée et −2 DR aux tirs en vol calculés ; bande de portée supplémentaire contre une cible volante, hauteur, mouvement obligatoire et chute restent au MJ (absence de géométrie).
- Armes : profils de base, allonge, mains, qualités et défauts conservés. Lance sans Charge, lance/épée bâtarde à une main demandent une adaptation explicite de profil par le MJ lors de l’attaque ; les recettes ne certifient pas ces modes ni tous les gestes de chaque Qualité d’arme.
- Peur/Terreur, terrain rural et poursuivants, maladies, parasites, nourriture, objets, paroles/bruits et animaux locaux : rappels ou reçus, car ces données ne sont pas enregistrées dans le combat. Aucun profil d’animal inventé, aucun compteur dédié.

**Aucune décision MJ nouvelle nécessaire pour livrer ces contrats.** Les descriptions publiques seront remplacées à la fin des lots, décision déjà confirmée ; les limites ci-dessus suivent la décision sur les clauses assistées. Ingrédients exclus. Les 161 identités hors lots 1/2 et les clauses talents conservent leurs constats antérieurs.

## Retours du Lot 1 traités

Le bloc de clause active passe maintenant par la vraie `initWorkspaceView` et se redessine au choix de l’effet, du destinataire et de la clause, sans clic Calculer préalable. Objets : sélecteur d’exemplaires réels de chaque cible, id absent refusé. Caresse et Destrier sont plafonnés à une cible ; reçu Bmax et échéance de la monture alignés sur la couche (D-12). Portées/cibles/durées corrigées pour Maudit, Eau de la terre, Lumière aveuglante, Arme enchantée et Vol du Destin. Lance d’Ambre préserve les PA magiques ; Bannissement affiche Instable une seule fois. Clarté conserve Exténué et Critiques physiques, neutralise Sonné et les pénalités psychologiques/mutations mentales pertinentes. L’invisibilité finit sur attaque d’arme ou magique appliquée ; Undo la restaure. Cœurs propose le Test de Frénésie facultatif par allié. Ironie/Maudit sont des rappels, sans faux compteurs. Les clauses assistées non bloquantes ne suffisent plus à classer un sort « données MJ ».

DR final utilisé pour tous les effets +DR/par DR ; suppression du double ajout de réserve dans Apothéose verdoyante. Les attentes anciennes corrigées citent p. 242 (+1 PA), p. 251 (Clarté) ou la décision du 12 octobre. Les anciens rapports Lot 1 restent des constats datés ; le suivi et ses preuves actuels les remplacent pour ces identités.

## Catalogue public conservé : contradictions constatées

Le snapshot n’est pas modifié. Les écarts du [rapport Lot 1](LOT3_RAPPORT_CONTRATS_LOT1.md) restent à corriger à la fin des lots ; ci-dessous les écarts du Lot 2.

| Sort | Catalogue affiché conservé | Contrat V5 retenu |
| --- | --- | --- |
| Arme aethyrique | NI 2, arme aux dégâts BFM | NI 3, arme de mêlée du tableau p. 301, Magique |
| Attaques en chaîne | Dégâts identiques à chaque rebond, absence du seuil réel | +4 puis −1 par rebond, seulement si B réelles > BE précédent, cible la plus proche |
| Chute | Texte d’Alerte, pénalités de −10 | Objet tenu lâché sur échec Dex +0, −1 DR par palier propre de +2 DR |
| Envol | Vol (Agilité), renvoi p. 343 | Vol (Athlétisme), p. 358 |
| Pont | Portée FM sans unité, cible zone | FM mètres, Spécial, dimensions BFM×BFM |
| Poussée | Cible Vous, dégâts de collision basés sur distance | Zone BFM maximum, d10 moins BE sans PA, collisions égales/petites À Terre sans dégâts |
| Protection | NI 5, Protection 9+ | NI 6, Protection 7+ |
| Souffle | Portée 1 m, projectile de BE, 2 Avantages | CT/Esquive, 20+BFM / voisins BI, dégâts/états selon Domaine |
| Téléportation | NI 5, BFM et paliers +2 DR | NI 3, BFM + DR final |
| Terrifiant | NI 7 | NI 6, Terreur 1 et +1 par +3 DR |
| Enchevêtrement | Portée FM, Force Int, Spécial et états surpuissants | Portée/durée BFM, 1 Enchevêtré Force FM ; récupération normale puis expiration |
| Sang corrosif | NI 4, BFM Rounds, Protection 9+ | NI 2, BE Rounds ou heures, sans Protection ajoutée |
| Vision dans l’obscurité | BFM Rounds, Infravision | BI Rounds, Vision dans le noir |
| Déplacement d’objet | Objet pas plus grand que le lanceur | Dimension maximale 1 + DR final mètres |
| Repères | Portée FM / Spécial | Vous / Vous |
| Secousse | Portée BFM / Spécial, pas de Dex | Moitié FM / 1 ; objet tenu : Dex +2 ou lâché |
| En catimini | BFM Rounds | Instantané |
| Feux follets | Test de Focalisation +20 | Action de contrôle FM +2, sans réserve de Focalisation |
| Lumière / Sons | Ancien contrôle de Focalisation | Contrôle FM +2 |
| Source | Demi-litre par Round, plafond BI litres | 1 pinte par Round, plafond BI pintes |
| Tendre l’oreille | Portée FM, BI minutes | Portée Initiative, BFM minutes |
| Alerte / Serrure ouverte | Cible Spécial | 1 |

## Vérifications et reproduction

- Avant : 277 contrats, **110 calculables / 145 données MJ / 22 rappels / 0 restant**. Après : **109 / 144 / 24 / 0**. Le traitement de matrice est distinct de la vérification de toutes les clauses.
- **90/90 tests Lot 2** : 48 identités, 42 variantes/recettes. **10/10 retours Lot 1**. Store aperçu/application, rechargement, Undo ; 30 identités du Lot 2 créent une couche temporisée et expirent par de vrais `createCombatEngine(store).nextTurn()`. Pour les durées >13 Rounds, l’horloge publique `advanceTalentMinutes` rejoint l’avant-dernière échéance, puis les Tours réels terminent l’effet ; aucun `combat.round` forcé dans les fixtures Lot 2.
- **`node --test` : 1 551/1 551**, zéro échec.
- **Cinq recettes navigateur vertes** : les trois commandes du brief, `lot3-v5-domaines-ui-browser.mjs` (vraie workspace-view, 17 faits, 5 clauses, Frénésie), `lot3-v5-arcanes-mineurs-ui-browser.mjs` (24 faits, 7 clauses effectivement appliquées, CT/Esquive et refus d’opposition, rebonds et collisions).
- Deux générations successives du JSON/matrice identiques ; deux reproductions des preuves/suivi/fiches identiques. Commandes : `node tools/build-v5-spell-contracts.mjs`, puis `node tools/build-lot3-contract-evidence.mjs`, puis `node --test` et les cinq recettes. Les preuves sont des reçus Store synthétiques ; les variantes détaillées se reproduisent avec les tests, elles ne sont pas toutes dans le JSON de reçus.
- Tests rouges observés : 19 scénarios de base du Lot 2 ; variantes Chaîne/Aura/Envol et contrôles des mineurs, Putréfaction hors cuir, Sommeil ; retours Lot 1 et invisibilité sur attaque magique. **Rouge non observé avant chaque changement** : quelques paramètres/branches déjà modifiés avant leur assertion dédiée, contrôles UI corrigés avant la vraie recette ; Source avait d’abord une erreur de fixture (`getState` absent), et la première attente de cumul d’Éblouissement ignorait sa récupération normale. Ces échecs de fixture ne sont pas présentés comme preuves d’un défaut moteur. Logs conservés dans `%TEMP%/lot3-arcanes-20261012/`.
- Catalogue public, couverture talents et audit historique conservés ; `build-v5-talent-coverage.mjs` jamais lancé. Aucun PDF dans le dépôt.

## Complément après vérification Lot 2 — 12 octobre 2026

Contradictions du catalogue omises dans le tableau initial (catalogue conservé) : Conservation — cible « 1 » → « Spécial » ; Pas léger — durée FM minutes → Agilité minutes ; Protection contre la pluie — durée BE heures → BFM heures.

Les retours D1–D7 et les assertions de limites sont traités dans le [rapport Lot 3](LOT3_RAPPORT_CONTRATS_LOT3.md). Souffle froid : +1 DR à la défense adverse est calculé ; la priorité de Tour est maintenant différée au prochain Round automatique. Les comptages 109/144/24 ci-dessus restent ceux de la livraison Lot 2 ; le retour D3 mène désormais à 208/44/25 après Lot 3.
