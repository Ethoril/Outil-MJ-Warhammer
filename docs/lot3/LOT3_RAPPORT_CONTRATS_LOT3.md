# Lot 3 — Haute Magie et magie elfique, livraison locale

12 octobre 2026 — `codex/lot2-talents-v5`, worktree `lot2-combat-v5`. Aucun commit, push ni déploiement.

Les **30 identités** HEPG pp. 80–89 sont revues : **21 conformes dans les scénarios sourcés, 6 nécessitant une donnée MJ et 3 rappels**. Aucune des 30 ne reste « anomalie » ou « non vérifié » ; les clauses assistées restent explicitement indiquées. Les **131 autres identités**, dont Winds of Magic, gardent leurs constats de vérification. Le classement de matrice ne les certifie pas.

Les [fiches](LOT3_FICHES_CORRECTION_CONTRATS.md), le [suivi exhaustif](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) et ses données JSON sont actualisés ; l’audit initial est conservé. Les [reçus reproductibles](LOT3_PREUVES_CONTRATS_LOT3.json) décrivent des situations synthétiques explicites.

## Ce qui change

Les paramètres des 30 sorts sont transcrits indépendamment depuis les pages. Les corrections comprennent : plafonnement PA et élévation de Coruscation, relance d’Attraction, suppression ciblée d’Impasse (couche ou sort connu), frappes périodiques et escalade de Convocation, Fortune limitée aux actions pertinentes, Navigation/contrôle de Glamour, dégâts du Bannissement selon Taille/Instable, Œil lié à sa couche, doubles portée/zone d’Extinction et déplacement/dégâts/Tests de Tempête. Glamour se prolonge après trois échecs déclarés sans Test de Commandement pour la durée ; une Protection conditionnelle inconnue demande son contexte au prochain Round, sans omettre silencieusement la frappe. Main de Gloire, Saphery et les deux Apothéoses gardent leurs décisions distinctes.

Les Arcanes/mineurs perdent les bonus inventés : Bannissement mineur est un opposé sans dégâts ; Purification produit un reçu d’affection unique ; Voix utilise Sociabilité minutes et +1 DR ; Parler utilise Intelligence minutes. Masque applique −3 aux contextes pertinents, Confort réduit le feu/froid et bloque les petites Nuées déclarées ; Calme conserve Haine/Terreur/Brisé, Révéler ne détecte pas un mage ordinaire sans couche. Les tests individuels détaillent chaque résultat, les options et la restauration.

Épuisement au-delà du BFM, une rune Cadai par jet, un seul attribut de Haute Magie, Protections de Lileath et mineurs sans surpuissance sont conservés et couverts par les tests existants. **Correctif du 13 octobre (Lot 4, HEPG p. 81) : premier Vent par défaut pour les huit Arcanes elfiques, choix de l’autre Vent autorisé.** La livraison initiale l’avait rendu obligatoire à tort ; contrat, moteur, contrôle et tests sont corrigés. Les deux Vents d’apprentissage sont conservés.

## Clauses assistées et limites

Les trois rappels sont **Alarme Magique, Doigt Vert et Identifier une Maladie** : entrées spatiales, croissance et maladies de fiche ne sont pas enregistrées par le combat. Les six données MJ sont **Impasse, Enchantement Végétal, Bannissement Mineur, Purification du Corps, Flèche Bénie et Révéler la Magie** : identité réelle, propriété, admissibilité, affection ou nature magique doivent être saisies.

Les autres sorts ont aussi des clauses assistées, sans les masquer derrière leur statut calculable :

- Coruscation : Foyer 1–5 DR, d10/2 arrondi supérieur à chaque Round, destinataires à BFM mètres, faille +5/portail +8 et Yenlui restent des reçus MJ. Il n’existe ni terrain, ni registre de nexus/couleurs de portail ; aucun bonus ambiant automatique n’est ajouté.
- Attraction : relance = reçu de Test utilisé pour rejouer l’attaque opposée ; les dégâts ne sont pas appliqués deux fois. PA/Défensif du bouclier et localisation choisie restent des adaptations de cette attaque par le MJ, sans lien fiable entre bouclier et localisation.
- Impasse sur objet, bonus géomantiques et Flux ; Drain +7 bénédictions/miracles et +10 objets/Protection de créature/interdiction 24 h ; dissipation gratuite de familles maléfiques et réinvocation du Bannissement majeur : catégories de provenance, inventaire et pouvoirs permanents absents. Tests et valeurs à reporter sont indiqués, sans écraser la fiche. Pour Drain +10, le MJ teste Focalisation +0 et applique 24 h seulement sur échec.
- Enchantement végétal permanent, une flèche exemplaire Magique +1, affection purgée/transférée, communication animale et compréhension Anoqeyån : reçus de fiche. Flèche ne confère pas un bonus global à tous les tirs du porteur.
- Exposition, portée vocale, déplacement/errance, chute/impact, solides de l’Œil, corps/âmes, destinations et Yenlui : MJ. Calme de Tempête et Perception de Voix sont calculés ; conséquences spatiales/interaction propres à cet auditeur sont dans leur reçu.

Décision catalogue déjà confirmée le 12 octobre : remplacement des descriptions contredites par la V5 à la fin des lots, en conservant les identités ; liste à reporter sur la feuille Google. Le catalogue reste inchangé pendant ce lot.

## Contradictions du catalogue conservé

| Entrée | Catalogue actuel → contrat/source |
| --- | --- |
| Bannissement Mineur, HEPG p. 81 | Portée BFM → FM mètres ; Calme comme compétence opposée |
| Parler avec un Animal, p. 82 | BI minutes → Intelligence minutes |
| Voix de Fer, p. 82 | BSoc minutes → Sociabilité minutes ; +10/−10 → +1/−1 DR V5 |
| Purification du Corps, p. 82 | Endurance → Résistance, une affection nommée, reçu de transfert |
| Extinction de l’Âme, p. 89 | Projectile +6 → +9 |
| Bannissement Majeur, p. 88 | Bonus de dissipation +10 par DR → +1 DR ; Sociabilité +20 → +2 DR |
| Tempête, p. 89 | Nom public « empête » conservé ; CT −30 → −3 DR ; Athlétisme +20 → +2 DR (+1 en vol) |
| Attraction des Flèches, p. 86 | Le bouclier peut encore bloquer les tirs ; perte PA/Défensif lors de l’opposition, pas une exclusion limitée au corps à corps |
| Coruscation, p. 86 | Foyer d10/2 : arrondi supérieur explicite, donc 1–5 ; destinataires et couleur déclarés |

Les autres formulations numériques anciennes du HEPG (+20/−10/−20/−30) sont converties en DR V5 dans les contrôles/contrats. Les autres descriptions du lot ont été relues ; elles ne justifient pas de changement de catalogue ici. Les trois omissions Conservation/Pas léger/Protection contre la pluie sont ajoutées au rapport Lot 2.

## Retours Lot 2 et validation

**D1–D7 traités** : chaîne brute des Protections au clavier, y compris Sang corrosif ; arme aethyrique unique au score de fiche ou saisie si absent, profil/avertissement visibles ; sonde de catégorie sans faits ; fin d’invisibilité sur actions offensives ; Poussée sans surpuissance de zone, défaut/collisions corrigés ; froid en dernier au prochain Round automatique, +1 DR adverse ; miroirs de couches cohérents après Undo/reload et comparaison de synchronisation gardant les vrais conflits. Ordre manuel du froid et séquence d’attaques hors Tours restent MJ. Les assertions Chaîne/Source/Souffle sont chiffrées, avec motifs de refus des rebonds.

Matrice des **277 identités : 109 calculables / 144 données MJ / 24 rappels / 0 restant → 208 / 44 / 25 / 0**. Le gros reclassement vient du retour D3, appliqué aux 277 sondes ; les confirmations inutiles Poussée/Perturbant sont retirées. **25 options spécifiques calculées, 16 assistées** ; la matrice ne marque une option calculée qu’après son exécution par la sonde.

Validation finale : **86 tests Haute Magie/elfiques et 10 tests de retours Lot 2** ; suite complète **1 647/1 647** ; six recettes navigateur vertes (les trois requises, Domaines, Arcanes/mineurs et Elfiques). Nouvelle recette : faits et options conditionnelles sans calcul préalable, couches/sorts réels, premier Vent, sept clauses actives et prolongation indépendante de Glamour, mouvement et lecture déclarée ; captures ordinateur/mobile contrôlées. Clavier `1 5` vérifié dans Mur de Feu et Sang corrosif ; profil et action aethyrique contrôlés dans l’interface.

Deux générations des contrats/matrice et des preuves/suivi identiques. Reproduction : `node tools/build-v5-spell-contracts.mjs`, `node tools/build-lot3-contract-evidence.mjs`, `node --test`, puis les six scripts navigateur versionnés. Catalogue, couvertures talents et générateur talents inchangés ; aucun ingrédient, aucune mutation d’inventaire, aucun PDF ajouté.

Rouges observés : les 30 paramètres source initiaux, mécanismes périodiques/suppression/Œil, plusieurs variantes et l’absence du profil dans l’aperçu navigateur. **Rouge avant chaque correction individuelle non observé** : des clauses étaient déjà corrigées quand leurs assertions dédiées ont été ajoutées. Les échecs de fixture (traits écrits au mauvais emplacement, identifiant temporaire absent, armure canonique résiduelle, propriété de reçu incorrecte) ne sont pas des preuves de défaut moteur. Logs et sauvegarde de livraison : `%TEMP%/lot3-haute-magie-20261012/`.
