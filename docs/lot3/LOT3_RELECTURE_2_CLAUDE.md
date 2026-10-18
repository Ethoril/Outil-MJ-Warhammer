# Lot 3 — seconde relecture indépendante (3.15.0)

14 octobre 2026. Six relectures Sonnet en parallèle, chacune sur sa propre copie figée de l'arbre de clôture, avec sondes Node sur le Store réel, vraie fin de tour, et parcours Playwright sur la vraie application (ordinateur et 390 px). `node --test` 2 175/2 175 sur chaque copie ; recettes navigateur et paquet de livraison verts. Rien n'a été modifié dans le dépôt.

**Verdict** : aucune erreur chiffrée de contrat sur les 277 sorts (NI 277/277 justes ; paramètres et valeurs sondés conformes aux pages). Les défauts du 10 octobre sont corrigés, sauf quelques reliquats listés. Restent : 3 bugs moteur de priorité haute, des défauts moyens de moteur et d'interface, une dizaine de descriptions du catalogue encore fausses, des classements calculable/rappel à reprendre, et des points de règle à trancher par le MJ.

## Priorité haute

1. **Rune du dissipateur consommée à tort** : sur une incantation de Haute Magie relancée par rune, une réaction de dissipation fait aussi payer une rune au dissipateur ; s'il n'en a pas, `applySpellExecution` échoue et le sort du lanceur ne s'applique plus. `js/core/v5-magic-dispel.js:118-129` renvoie le `castingPreview` du lanceur (avec ses `cadaiReceipts`), puis `v5-spell-contracts.js:3355` appelle `applyMagicAttempt(dispeller, dispelReaction)` (`v5-magic-talents.js:84`). Ne payer que les reçus propres au dissipateur.
2. **Réduction de dégâts appliquée après le plafonnement aux Blessures restantes** : `v5-spell-contracts.js:2996` passe `woundsLost - direct` (déjà plafonné) à `previewMagicProtection`. Cible à 5 B avec réduction 3, Arc de T'Essla net 10 → attendu 0 B, observé 3 B. Réduire sur les dégâts non plafonnés, puis plafonner.
3. **Traits de la bête ou du monstre perdus** (Forme bestiale, Jade, Kadon) : `applyBeastForm` écrit `v5.baseTraits` et `next.traits`, mais le constructeur `Participant` (`models.js:194-203`) reconstruit `traits` depuis `extensions.traits` (traits du lanceur seuls) ; `v5.temporaryTraits` n'est pas posé. Araignée sans Grimpeur ni Toile, Griffon sans Vol, aussi après rechargement. Poser `v5.temporaryTraits` et le retirer au retour.

## Priorité moyenne — moteur

4. **Mage de guerre bloque la dissipation en réaction** pendant le tour d'un autre : aucun `turnKey` transmis (`v5-magic-dispel.js:56-105`, `store.js:2348`, `v5-spell-contracts.js:1514`) ; transmettre `round:turnIndex` comme `previewCasting`. Le dissipateur reçoit aussi `magicAttemptTurn` après une simple réaction (à vérifier avec le même correctif).
5. **Pénalité d'armure appliquée au Test de dissipation** (`v5-magic-dispel.js:60-67`) : V5 p. 237 la limite à l'Incantation et à la Focalisation. La retirer.
6. **Pause et Interruption impossibles si Surpris, Inconscient ou muet** : `prepareMagicOptions` (`v5-magic-talents.js:154, 167-168`) applique ses gardes aux modes `pause` et `interruption`, qui ne sont pas des Tests magiques (cas réel : incident Mineur 11-15). Ne garder ces gardes que pour `casting` et `channelling`.
7. **Rune débitée sans incident en Focalisation de Haute Magie** : `v5-magic-channelling.js:351` (`cadaiReceipt` non filtré, alors que `cadaiReceipts` l'est l.353). Même filtrage que l'incantation.
8. **Couronne de Flamme sans +1 DR en Focalisation depuis l'interface** : `v5-magic-talents.js:175-176` lit `lore` dans `spell.wind || spell.type || options.lore`, l'UI envoie `wind` (`workspace-view.js:1107`).
9. **La Fortune est Capricieuse appliquée à la Pause** (`v5-magic-channelling.js:458`, `magical:true` sur un Test de Résistance) ; l'Interruption ne l'applique pas. D-22 : Tests magiques et dissipation seulement.
10. **Drapeaux écrits jamais lus, sorts classés calculables** : `cannotBeSurprised` (Ennemi Anticipé : Surpris est quand même appliqué), `understandLanguages`, `shadowSensor`, `actionBeforeDeath`, `fearImmune`/`terrorAsFear` (Acceptation du Destin, mode alliés), et côté livre V5 : `metalIsGold`, `itemQualityChanges`, `malleableMetal`, `lifebloom`, `undeadBoundary`, `palmFlame`, `illumination`, `marshLights`, `distantHearing`, `objectToHand`, `organicGroundUnharmed`, `memoryOfCasterHidden`, `teleport`, `sounds`, `waterSpring`, `controlledByCaster`, `underground`. Faire lire ceux qui ont un sens moteur (Surpris refusé, immunité Peur, Terreur traitée comme Peur…) et classer les autres en rappel ; ajouter les marqueurs à `MARKER_ONLY_SPECIAL_STATES`. Le test « tout drapeau est lu » doit échouer sur un drapeau écrit sans lecteur hors liste.
11. **Classements à corriger** (règle du lot 5a) : vers calculable — Mort rapide (cible à 0 B : `dead`, `cannotRaiseUndead` ; la sonde n'essaie jamais une cible à 0 B), Troisième Signe d'Amul (Destin temporaire, comme les 1er et 2e Signes), Illuminer l'édifice (dégâts DR finaux calculés sur déclenchement) ; Forêt d'Épines et Doppelgänger (fait de précondition non lu). La sonde doit aussi essayer une cible à 0 B et les déclenchements (`previewSpellInteraction`).
12. **Démon ou non-vivant reconnu par le nom** (`v5-magic-attributes.js:112-122`, regex sur `participant.name`) : un « Démonologue » est banni par le Fléau ; même cause pour l'attribut de la Vie. Ne tester que traits/étiquettes/`isDaemon`. Démon sans E : exiger E au lieu de 0.
13. **Attribut des Ombres reconnu par le nom du sort** (`v5-magic-attributes.js:322`) : le Dôme n'a pas le +2 Discrétion ; détecter `effects.ward`, `apModifiers`, `damageReduction`, `apFloor`.
14. **Cadavre décapité jamais détecté** (Apothéose Verdoyante, `v5-magic-arbitrations.js:367`) : lire un fait par cible (`targetTests[id].decapitated`) avec contrôle dans l'interface.
15. **Précédence des jets de Test secondaire** (`v5-spell-contracts.js:1778`) : `targetTests[id].roll` générique masque le champ propre au contrat (`dodgeRoll`, `resistanceRoll`) ; lire d'abord le champ spécifique.
16. **Focalisation de Ghur et armure de cuir reconnue au nom** (`v5-magic-channelling.js:101`) : utiliser le matériau (`layer === 'leather'` / `v5-armor-material.js`).
17. Lumière aveuglante : option de surpuissance `aoe` à retirer (cible Vous, sans zone, p. 236).

## Priorité moyenne — interface et intégration

18. **Bouton Annuler grisé après rechargement** alors que `Store.canUndo()` est vrai (`js/main.js:128-135`, `:1390-1392`) : appeler `refreshHistoryButtons()` après `Store.ready`. `main.js:134` (`if (Store.undo())` teste une Promise) et `keyboard.js:23-25` (toast « Action annulée » même en cas d'échec) : attendre le résultat.
19. **Un sort `null` dans une fiche plante la vue Jouer** (`js/ui/fiche-details.js:17`) : la RTDB restitue les trous de tableau en `null` ; filtrer les lignes non-objets dans la sanitisation (sorts, talents, compétences) et protéger le rendu.
20. **Interface trop générique** : les six champs de surpuissance, le Test secondaire, les dés d'incident et « Membre gelé » sont visibles pour tous les sorts (mineurs, instantanés, « Vous »…) ; le bloc des runes des Cadai pour tout mage ; « Temps écoulé » aussi dans le panneau d'une attaque d'arme ; le d10 de Protection est demandé pour une hache contre l'Égide d'Aqshy (filtre magique + feu) alors que l'aperçu l'ignore (`resolution-panel.js:1167`). N'afficher que ce qui s'applique au sort, à l'action et aux couches actives. Messages d'erreur avec clés internes (« Dépense de damage (1.5 DR) », « … : duration ») à traduire ; dégâts négatifs ignorés sans message.
21. Focalisation et Incantation encore proposées dans la liste d'actions sous forme animale (le moteur refuse) : les masquer.
22. Journal « — undefined » après un incident mineur (`v5-spell-contracts.js:3708`) ; doublon « fin de Round » dans le journal ; boîte de fin de Round qui réclame encore des jets pour une cible à 0 B (Blizzard).
23. Sanitisation : réserve à 10 000 DR sans `type` acceptée ; `beastForm` avec durée négative ou caractéristique non numérique conservé : borner/rejeter.

## Catalogue et contrats : textes

24. **Descriptions encore fausses (livre V5)** : Égide d'Aqshy « Protection 9+ » → 7+ (p. 248) ; Bouclier céruléen (p. 249 : +3 PA contre armes en métal, 6 dégâts au bras) ; Mur de Feu (projectile +4 ; la surpuissance de zone allonge le mur) ; Second Signe d'Amul (3 Chance, +1 par +2 DR) ; Incarnation de Wyssan (texte V4 → profil V5 p. 246) ; Vision dans l'obscurité (Bonus d'Initiative Rounds) ; Souffle (voisins à Bonus d'Initiative) ; Source (pintes, p. 242) ; Linceul d'Invisibilité (Perception opposée au Test d'incantation) ; Choc (Sonné jusqu'à la fin de votre prochain Tour) ; Filet d'Amyntok (Sonné non perdu pendant le sort) ; Langue des Bêtes (sans « Langage (Bataille) ») ; Carreau (« Dégit ») ; Ombres Étrangleuses (respiration, renvoi p. 181). Les `reminders` des contrats ont parfois la même erreur (Égide, Bouclier céruléen, Souffle).
25. **Hors livre** : difficultés HEPG « Difficile (+0) » → « Intermédiaire (+0) » et « Moyen (+2 DR) » → « Accessible (+2 DR) » (Apothéose, Destruction des Arcanes, Glamour de Teclis, Convocation Ardente) ; libellés d'options « Exigeant +0 » ; trait d'Esprit du Foyer (détruit par une pinte d'eau) ; Toucher doré (durée FM × 1d10 minutes, et surpuissance de durée possible) ; Colérique et Flamme Inextinguible (paliers heures/jours/semaines/mois) ; Toile 40 « Entravé » → Enchevêtré (bestiaire).
26. **Nom « empête »** (HEPG p. 89, Tempest) : voir décision MJ.

## Points de règle

- Protection réussie et Critique (D-13 vs trait Ward p. 363) : décision MJ.
- Focalisation générique et spécialisée présentes ensemble : décision MJ.
- Fléau des Démons lancé deux fois sur le même Démon : décision MJ.
- Attribut de la Mort : Artificiels et Éthérés reçoivent Exténué ; une cible à 0 B est traitée comme non vivante : aligner sur la règle « vivants » de l'attribut de la Vie.
- Lames Azurées : la liste des engagés est figée au lancement ; permettre d'ajouter un adversaire qui s'engage plus tard.
- Auteur retiré du combat : ses effets de Round (Blizzard, Sang Bouillonnant) sont ignorés sans avertissement ; afficher un rappel.
- Synchronisation de fiche pendant une transformation : peut réarmer le profil de la bête ou écraser `maxHp` (lu, non sondé) ; bloquer ou différer la synchronisation des champs remplacés.
- Main de Gloire `chosenStats:['F','M']` : M ignoré silencieusement → refuser.
- Apothéose Verdoyante à 0 DR final (Puissance totale) : `max(1, …)` donne 1 B → 0 B.
- Épuisement : FM absente traitée comme 30 et plancher de BFM à 1 dans `explicitSl` ; exiger la FM.
