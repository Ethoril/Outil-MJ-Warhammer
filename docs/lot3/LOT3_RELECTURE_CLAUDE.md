# Relecture lot 3 (magie) — 10 octobre 2026

Worktree `codex/lot2-talents-v5`, HEAD fb0f280, 3.14.0, non commité. Lecture seule, sondes Node dans le scratchpad. `node --test` : 1058/1058. Parcours Edge et cloud non rejoués.

Verdict : la recette est verte, mais une grande partie des comportements annoncés ne sont pas exécutés, ou pas comme la source. Les comptages (277, 123/132/22, 31, 116) sont exacts ; ils ne certifient rien clause par clause.

## Bloquants transversaux

1. **« Tour suivant » réel n'expire aucun effet magique.** main.js advanceTurn → Combat.nextTurn → previewV5Turn (combat.js:52-72) n'appelle jamais `processCombatTurnSpells` (store.js:199, seulement via Store.nextTurn/setRoundTurn). Buffs en Rounds, Forme bestiale, Chance temporaire de Cieux, verrou Mage de guerre : jamais traités. Les tests utilisent store.nextTurn().
2. **Effets en minutes jamais avancés depuis l'UI** : resolution-panel.js:583 teste `p.activeSpellEffects` (inexistant ; c'est `extensions.v5.spellEffects`). De plus « temps écoulé » n'expire pas les effets en Rounds (v5-magic-effects.js:678-688).
3. **Sorts mineurs inapplicables sur un double réussi** : workspace-view.js:1072 teste `contract.type === 'petty'` (vaut « Sort Mineur »/« Petite Magie Elfique » ; c'est `domain`). 31/31 contrats mineurs `ready:false` sur jet 22.
4. **Tirages implicites malgré requireExplicitDice** :
   - UI : `miscastRoll || 45` (workspace-view.js:1080, 1097), `lossRoll || 3` (:1006), `roll3d10 || 18` (:1121), chosenStats = CC, beastKey = wolf.
   - Moteur : majorRoll = jet mineur (miscasts.js:510-522) ; dés secondaires (dégâts, distances, jours d'épuisement…) = 1 sans blocage (miscasts.js:544) ; lossRoll = 1 et jet d'incident = jet du Test (channelling.js:267, 273, 495, 499) ; interruption ignore requireExplicitDice (:530) ; Main de Gloire `?? 15` (spell-contracts:2195, arbitrations:427) ; DR seul → jet 50 → toujours Tête (spell-contracts:1291).
5. **Dissipation** : le DR net n'est pas reporté sur l'incantation (dispel.js:156-158, spell-contracts:2547-2553) — Carreau 5 DR vs 3 DR passe ; Test opposé comparé au total Test + réserve (dispel.js:152-154) ; dissipation persistante possible contre Force irrésistible (dispel.js:239-336) ; dissipateur sans Langue (Magick) accepté ; restrictions d'États/Fortune Capricieuse non appliquées ; Test étendu sans planchers ±1 ni échec sous 0 (dispel.js:306-309).
6. **Protection (Ward) générale** : v5-magic-combat.js:7-15 appelée pour tout coup d'arme (resolution.js:542). Égide d'Aqshy, Dôme, Bouclier anti-flèches deviennent des Protections contre tout ; `immunities` jamais lu.
7. **Drapeaux stockés jamais lus** : `missile.ignoreAp/ignoreBe` (Drain, Creuset, Transmutation, Grands Feux), `scytheOfShyishActive`, `overcastDurationMultiplier` (surpuissance de durée payée sans effet), `immuneToDamageUntilHit`, `halvedMaxHp`, `bonusActions`, `temporaryTalents`, `shooterTestToFire`, `swarmImmunity`, `freeMultipleDispels`, `athleticsTestSl`, `talentsLost`, `corruptionPerFortuneSpent`, `unremovable`… ; clés de Test mortes (« Tous les Tests », « … adverse », spécialités).
8. **États du contrat appliqués à la cible du sort** (spell-contracts:1580) : Robe scintillante aveugle le lanceur, Pas/Portail d'Ombre le rendent Surpris, Épée enflammée enflamme le porteur. Dégâts infligés au lanceur : Coruscation de Finreir (14 → 2 B), Lames Azurées.

## Arbitrages annoncés comme livrés mais non fonctionnels

- **Main de Gloire** : M +2 faux (PJ importé sans caracs.M → M 2) et jamais restauré à l'expiration (arbitrations.js:513-520, effects.js:66) ; +3/+8 payés sans effet.
- **Faux de Shyish** : drapeau écrit, jamais lu ; `applyScytheOfShyishRules` importée non appelée ; buildCombatTest (v5-combat-rules.js:118-124) donne l'Avantage ; l'arme n'est pas créée.
- **Saphery** : seuil écrit hors couches (spell-contracts:2739), écrasé au sort suivant (3 → 9) ; reçu lit `isAutomatic` au lieu de `automaticSuccess` ; `otherHighSpellsCount` jamais fourni.
- **Apothéose Verdoyante** : `timeSinceDeathSec` = 0 par défaut, mort non vérifiée → un allié vivant 25/30 tombe à 16 B (arbitrations.js:208-236).
- **Forme bestiale/Jade** : remplace toutes les caractéristiques et traits (livre : M, F, E, Ag, Dex seulement) ; lancer/dissiper possibles sous forme animale. Kadon : « Dragon » choisi → profil Loup 40 min.
- **Grimoire non mémorisé** : jamais transmis, l'interdiction de surpuissance est inatteignable.
- **Runes des Cadai** acceptées hors Haute Magie (v5-magic-talents.js:25-35) — un test existant (lot3-v5-finalization.test.js:31-36) valide ce cas à tort.

## Incidents (miscasts)

- Regard maudit 1d10 heures → 1d10 Tours (miscasts.js:616-620) ; n'éteint pas Perception de la Magie.
- Puanteur infernale : trait jamais retiré (:681-689). Clairvoyance chaotique écrit `participant.fortune` (sans effet).
- Drain de puissance non bloquant (talents.js:36). Plateau 91-95 non résolu (miscasts.js:210-214).
- applyMiscast accepte un aperçu `ready:false` (miscasts.js:730). Ids d'effets en double (:693).

## Moteur générique / attributs

- Attribut du Métal = BE de la cible au lieu des PA métal de la localisation (attributes.js:280-299) ; Ombres sans « ignore PA non magiques » ; Vie retire Hémorragique/Exténué aux non-vivants ; attributs d'Arcane jamais appliqués (attributeLore 'arcane') ; Arcanes elfiques sans choix → aucun attribut (source : premier Vent).
- Attributs optionnels (« may ») appliqués d'office aux alliés : Lumière guérisseuse aveugle l'allié soigné, Cautérisation l'enflamme.
- Sorts `damage` non projectiles : DR ajoutés, BFM absent (effects.js:993).
- `weaponBonus` ajouté à toute attaque, tir compris (v5-magic-combat.js:2-6).
- Durées mal lues → repli silencieux BFM (effects.js:239-254) : Sociabilité, Int, « FM minutes », « 2 × BFM ».
- Vortex comptés deux fois (spell-contracts:1436 + resolveVortexTrajectory : 41 B) ; UI envoie `vortexDirectionRoll`, moteur lit `directionRoll` (spell-contracts:512).
- Instantanés baseCaracs/baseArmor figés (effects.js:334-350) + fiche-sync.js:442-444 qui écrase caracs sans base → buffs perdus puis fiche écrasée à l'expiration ; compétence importée comptée deux fois.
- Surpuissance : paliers hors barème/fractionnaires acceptés, cibles sur portée « Vous », « dégâts » proposé aux non-projectiles, options « pour chaque +X DR » absentes ; `reserveSl` injectable (casting.js:246).
- Chemin `explicitSl` contourne épuisement, Mage de guerre, États (spell-contracts:1123-1207).

## Ressources

- Défiance et récupération d'épuisement ne débitent pas la Chance si le compteur Fortune n'est pas initialisé ; épuisement permanent écrit `participant.fate` (perdu à la canonicalisation) → Destin non payé. Épuisement temporaire annulable par Destin (high.js:211).
- Pause : regex /résistance/ peut prendre « Résistance à l'alcool » (channelling.js:393) ; journal « undefined » (:353) ; compte comme magicAttemptTurn.
- Désavantage + choix « keep » imposé par l'UI → exception (casting.js:294, channelling.js:245).

## Contrats : écarts aux sources (sondés)

Livre V5 (116) : NI tous conformes. Faux : Bannissement (dégâts au lieu d'Instable), Vortex d'Âmes, Vol de Vie (soin sur dégâts non plafonnés), Caresse de Laniph (Bmax −1/B au lieu de −1/2 B), Drain (soin à la cible), Choc (dégâts au lieu de Sonné), Ironie du Destin, Maudit, Bouclier céruléen, Filet d'Amyntok, Transmutation, Forêt d'Épines, Armure aethyrique (+2 au lieu de +1), Grands Feux, Comète, Mur de Feu, Poussée, Souffle, Voile Pourpre, Écorce, Plume de plomb, Eau de la terre, Don de Vie, Lumière guérisseuse, Lumière aveuglante, Sommeil, Secousse, Chute, Enchevêtrement, Épée enflammée, Arme enchantée, Arme aethyrique, Serres d'Ambre, Couronne de Flamme, Protection de Phâ, Attaques en chaîne, Effacement d'esprit, Illusion + durées/portées (Vision dans le noir, Sang corrosif, Langue des Bêtes, Or des fous, Forge, Troisième Signe, Cœurs Enflammés). Effets inventés : Maître des Bêtes, Sanctifier, Doppelgänger, Destrier d'Ombre, Putréfaction. Silence (Arcane p.245) et Coruscating Arc (Cieux p.249) absents du catalogue.

Hors livre (161) : Bannissement Majeur/Mineur, Corps de Feu, Sang Bouillonnant, Voix de Fer (+2 DR), Extinction de l'Âme (+20 au lieu de 16), valeurs WoM (Anraheir, Iyrtu, Bjuna, Convocation Ardente, Tempête « empête », Chant vivifiant, Chair de Pierre, Ver/Inscription), invocations au profil générique (Épées Sanguines…), bonus inventés (Masque de l'Esprit, Alarme, Parler avec un Animal, Impasse, Attraction des Flèches, Colérique, Goût de Feu, Silence, Invocation de Monture, Révéler la Magie, Purification du Corps, Calme), États sans Test, Fortune Capricieuse appliquée à tous les tests de combat, corrections de l'audit non reportées, `page: 240` par défaut sur les 161, 43+64 rappels aux mots collés.

## UI / intégration (mineur)

Double-clic des boutons secondaires (runes ×2) ; ouvrir « Cibles multiples »/« Talents » efface l'aperçu ; erreur de récupération d'épuisement non affichée ; applySpellExecution renvoie un succès même si la sauvegarde échoue ; ledger appliedSpellExecutions sans purge ; valeurs cloud non bornées ; rules.js:89 dit encore « prévu au lot 3 » ; champs surpuissance max=10.

Conforme (vérifié) : Focalisation/réserve, DR+BFM / DR+2×BFM, Langue puis réserve, plafond BI+BFM et barème, tables V5, aucun ingrédient, épuisement Haute Magie, un seul attribut, Destruction des Arcanes, Résistance à la Magie, Fléau, précache sw.js et versions, aperçus sans mutation, Undo/révision du bouton principal, XSS, libellés.

Non vérifié : parcours Edge/cloud, Undo de transformation, profils du bestiaire, portées/aires (non contrôlées par le moteur), autres suppléments.
