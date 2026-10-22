# Plan de lots — Phase E (Traits de créature, bestiaires, mots-clés), exécutant : Claude Pro

Contexte : `docs/plans-gpt/BRIEF_GPT_PHASE_E_BESTIAIRES.md`, `docs/plans-gpt/REGLES_COMMUNES_GPT.md`, arbitrages `docs/ARBITRAGES_MJ_21_10.md` (section Bestiaires), **demande du MJ du 22/10 (référentiel de mots-clés)**. Branche `pro/phase-e`. Inventaire : `docs/BESTIAIRE_INVENTAIRE.json` (249 règles, 541 références E0) **+ complément du 21/10 (commit `7c124f6`)** : L18-L26, 443 profils (`E0-P-542` à `E0-P-984`) et 39 Traits ou capacités (`E0-T-250` à `E0-T-288`). Outils d'extraction : `tools/extract-bestiary-profiles.mjs`, `tools/lib/bestiary-*.mjs`.

## Règles de travail (rappel)

Fichiers LF. Pas de `git stash`, pas de push, pas de changement de version (`js/version.js`, `package*.json`, `sw.js`, `index.html`, README). Par lot : tests d'abord (ils échouent pour la bonne raison), code, commande d'acceptation, générateurs (jamais de JSON édité à la main), suite complète `node --test --test-concurrency=4`, commit `<type>(<domaine>): <résumé> (Claude Pro)`. Code partagé à risque (`resolution.js`, `store.js`, moteurs de Tour, `v5-store-action.js`) : caractérisation commitée à part avant le changement. Choix d'interprétation : `CHOIX_EXECUTANT_PHASE_E.md`. Valeur durable de personnage : `docs/VARIABLES_PERSISTANTES_PJ.md`. Les livres restent hors du dépôt : seuls les noms et les chiffres imprimés sont conservés, les clauses sont résumées en français.

## Arbitrages appliqués à toute la phase

V5 partout (termes V4 : Avantage → Élan, ±10 → ±1 DR, ±20 → ±2 DR, chaque conversion consignée) ; Petit = homebrew V4 local, pas de migration ; Peur, Terreur, fuite = décisions C0 ; **profils importés tels qu'imprimés** (dégâts déjà calculés, aucun second ajout de BF, de Taille ni d'armure) ; noms français du livre FR (L05) sinon proposition consignée ; Régénération, Plusieurs têtes, Natures : automatisés ; Démoniaque, Protection, Résistance à la Magie, Champion, Frénésie, Haine, Béni raccordés aux services existants (jamais sur la seule étiquette) ; familiers : lien automatisé, deux systèmes distincts ; Slann : capacités assistées sur leurs seuls profils ; aucun ingrédient exigé pour la magie.

## Circuit existant (constat)

- Participants et profils : `js/core/models.js` (`Profile`, `Participant`, `FICHE_DATA_FIELDS`) ; import JSON `js/core/json-profile-import.js` (dégâts entiers = fixes, déjà totaux) ; bêtes de transformation `js/data/v5-transformation-bestiary.js` (REIKLAND_BEASTS, 6 bêtes) et adaptateur d'invocations `js/data/divine-summon-profiles.js` ; invocations de sorts : `summon.generic` (phase D, Relever les morts) à brancher ici.
- Natures : `js/core/v5-magic-attributes.js` (`isTargetUndead/Daemon/Construct/Ethereal` lisent les Traits du participant, les étiquettes et `isUndead`…). Protection : `js/core/v5-magic-combat.js` (`wardLayers`, `previewMagicProtection`).
- Psychologie : `js/core/v5-talent-psychology.js` : la spécialisation de Haine / Sans peur est un **texte libre** (`specialization === enemyGroup`) ; `hasTrait` lit des motifs de texte sur les Traits.
- `js/core/keywords.js` est le registre des mots-clés **d'armes** (qualités) : sans rapport avec les mots-clés de créature, d'où le nom `creature-keywords` pour le nouveau référentiel.
- Sauvegarde : `extensions` racine conservée par `migrations.js` (`extensions.v5.gameClock` en est l'exemple) : les ajouts du MJ au référentiel y vivent (`extensions.v5.keywordReferential`), sans nouvelle clé de schéma.

## Ordre des lots et justification

Les mots-clés (bloc K, demande du MJ) passent **avant l'import massif** : les profils importés en reçoivent. Les données des profils (bloc D) précèdent les Traits (bloc T) : les tests de Traits s'appuient sur de vrais profils (Squelette, Zombie, Démoniaque…). Le complément d'inventaire est déjà commité.

## Bloc K — Référentiel unique de mots-clés (demande du MJ, 22/10)

Format : objectif — inventaire — comportements attendus (tests) — emplacements — fichiers autorisés — acceptation — risque.

### K1 — Référentiel de base et services purs
- Objectif : liste figée dans le dépôt, hiérarchique (graphe orienté sans cycle : un nœud peut avoir plusieurs parents), avec alias ; services de résolution et de correspondance ; garde-fou anti-doublon.
- Données : `js/data/creature-keywords.js` (`{ id, nameFr, nameEn, parents[], aliases[] }`) : espèces et peuples (Humain, Nain, Elfe > Haut elfe, Elfe sylvain, Elfe noir ; Halfling, Gnome, Ogre), natures (Mort-vivant > Squelette, Zombie, Spectre, Vampire…; Démon > Démon de Khorne/Nurgle/Slaanesh/Tzeentch ; Artificiel, Éthéré, Bête, Monstre, Hybride), allégeances (Chaos > Khorne, Nurgle, Slaanesh, Tzeentch ; Peaux-vertes > Orque, Gobelin, Snotling, Troll ? voir CHOIX), Skaven, Hommes-bêtes, Hommes-lézards/Slann, Norse, etc.
- Comportements : (1) `resolveKeyword('peau verte' | 'Greenskin' | 'Peaux-Vertes')` → une seule entrée ; casse, accents, pluriel, tirets ignorés ; (2) `keywordAncestors('demon-nurgle')` → Démon, Chaos, Nurgle (et lui-même) ; (3) `keywordMatches(keywordIds, 'peaux-vertes')` vrai pour une cible Orque, faux pour Nain ; (4) `proposeNewKeyword(name, aliases)` refuse un doublon exact, un pluriel, un accent/casse différent, un alias existant, une distance d'édition ≤ 2 (≤ 1 sous 6 lettres) et renvoie le terme existant ; accepte un terme réellement nouveau ; (5) pas de cycle, ids uniques, alias uniques (test de cohérence du référentiel) ; (6) le référentiel étendu (base + ajouts du MJ) se construit sans muter la base.
- Emplacements : `js/data/creature-keywords.js`, `js/core/creature-keywords.js`. Tests : `tests/pro-k1-keywords.test.js`. Risque : faible.

### K2 — Ajout par le MJ (formulaire et commande)
- Comportements : commande `add-creature-keyword` (annulable, historisée) appliquée au store, validée par `proposeNewKeyword` ; refus avec proposition du terme existant ; stockage `extensions.v5.keywordReferential.terms` (id, noms, parents, alias, auteur MJ) ; survie à la sauvegarde, à l'export/import et à la synchronisation ; aucun retrait ni renommage d'un terme de base ; formulaire MJ (interface) avec message de refus et bouton « utiliser le terme existant ».
- Emplacements : `js/core/store.js` (commande, caractérisation à part), `js/core/migrations.js` (rien à ajouter, vérifier), UI du formulaire. Parcours navigateur obligatoire. Registre : `VARIABLES_PERSISTANTES_PJ.md` (le référentiel étendu est une donnée de campagne, pas de fiche). Risque : moyen (store).

### K3 — Mots-clés portés par profils, participants et PJ
- Comportements : champ `keywords` (ids canoniques) sur `Profile`, `Participant`, fiches PJ (`FICHE_DATA_FIELDS`) conservé par tous les passages profil → participant → scène ; dérivation d'office (jamais écrasante) : `race`/espèce du PJ, Traits de nature (Mort-vivant, Démoniaque, Artificiel, Éthéré), anciens `tags` résolubles par alias ; édition dans le formulaire de profil (sélecteur, jamais de texte libre) ; import JSON/texte : alias résolus, inconnu signalé « à vérifier » ; participants existants sans `keywords` inchangés (aucune migration destructive).
- Emplacements : `js/core/models.js`, `js/core/json-profile-import.js`, `js/core/text-profile-import.js`, UI du formulaire de profil. Risque : moyen.

### K4 — Spécialisations à cible : Haine, Animosité, Préjugé, Sans peur [Ennemi], Tueur de…
- Comportements : la spécialisation d'un talent ou d'un Trait à cible est un identifiant du référentiel ; l'effet s'applique **automatiquement** quand la cible porte le mot-clé ou un descendant (Haine des Peaux-vertes s'applique à un Orque) ; le MJ peut corriger (forcer / retirer pour une rencontre) ; `isPsychologyImmune`, Haine/Animosité, Préjugé, Sans peur, Tueur de… lisent `keywordMatches` ; texte libre encore présent sur une fiche : résolu par alias, sinon marqué « à migrer » et **comportement inchangé** (égalité de texte) ; table de migration des spécialisations existantes consignée cas par cas dans `CHOIX_EXECUTANT_PHASE_E.md`.
- Tests de caractérisation (commit à part, avant changement) : comportements actuels de `isPsychologyImmune` et de la Haine pour les spécialisations existantes.
- Emplacements : `js/core/v5-talent-psychology.js`, `js/core/v5-talents.js` (spécialisations), catalogue de talents (`specializationTranslations`), `js/core/v5-talent-situations.js`. Risque : moyen à élevé.

### K5 — Effets « contre les X » des sorts, prières, runes et Traits
- Comportements : toute clause « contre/envers les X » des contrats (sorts, miracles, runes) désigne un mot-clé du référentiel (`target.keyword`), appliquée automatiquement à la cible porteuse du mot-clé ou d'un descendant, avec correction MJ ; inventaire des clauses concernées relevé dans le lot (recherche des filtres de nature, de `enemyGroup` et des formulations « contre les ») et migration cas par cas consignée.
- Emplacements : `js/core/v5-spell-contracts.js`, `js/core/v5-divine-effects-*.js`, générateurs de contrats. Régénération par les générateurs seulement. Risque : élevé.

## Bloc D — Profils de bestiaire : données et import livre par livre

### D1 — Modèle de données et générateur
- Objectif : `js/data/v5-bestiary-profiles.json` produit par `tools/build-bestiary-profiles.mjs` (extraction + noms + mots-clés) ; modèle d'un profil : `id` (E0-P), livre, page, nom EN, nom FR (source du nom), genre (profil / gabarit / prétiré), édition, `stats` (M, CC, CT, F, E, I, Ag, Dex, Int, FM, Soc imprimées ; `null` = absente, jamais 0 ; `wounds` imprimées), armure (PA imprimés, total imprimé entre parenthèses conservé), attaques (nom, valeur, dégâts imprimés, gratuite/qualités), compétences, Traits (nom canonique + valeur + précision + lien d'inventaire), talents, sorts, Traits facultatifs, `keywords`, `abilityRefs`.
- Comportements : aucune valeur recalculée (test : BF, Taille et armure jamais ajoutés) ; décomptes par livre égaux à l'inventaire ; chaque profil référence une entrée d'inventaire ; gabarits en modificateurs signés ; refus d'un profil à 12 cases incohérentes. Tests : `tests/pro-d1-bestiary-model.test.js`. Risque : moyen.

### D2 à D24 — Import livre par livre (un lot, un commit par livre, dans cet ordre)
D2 L06 Livre de base V5 (53 profils + 7 gabarits ; prétirés : aucun) ; D3 L11 Imperial Zoo (62 + 6 prétirés) ; D4 L01 (15) ; D5 L02 (12) ; D6 L03 (13) ; D7 L04 (22) ; D8 L07 Lustria (68) ; D9 L09 Temple of Spite (53) ; D10 L10 Sylvania (29) ; D11 L12 Tribes and Tribulations (64 dont 14 gabarits) ; D12 L13 Up in Arms (15 dont 6 gabarits) ; D13 L14 (20) ; D14 L16 (23) ; D15 L17 Winds of Magic (21) ; D16 L18 (30) ; D17 L19 (41) ; D18 L20 (45) ; D19 L21 (58) ; D20 L22 (43) ; D21 L23 (55) ; D22 L24 (81) ; D23 L25 (28) ; D24 L26 (62).
- Pour chaque livre : noms français (L05 si le profil y figure, sinon proposition consignée), mots-clés assignés, comptage et valeurs de contrôle relues sur la page (échantillon vérifié visuellement), intitulés incohérents des prétirés signalés sans corriger les caractéristiques. L05 : source de noms seulement pour les profils déjà présents dans L06 ; profils V4 propres à L05 importés avec `edition: V4` (voir CHOIX). L08 et L15 : aucun bloc de profil (inventaire Q28), rien à importer.
- Tests : `tests/pro-d<n>-<livre>.test.js` (décompte, trois profils de contrôle aux valeurs imprimées, mots-clés, noms FR). Risque : faible (données).

## Bloc B — Bibliothèque et raccordements

### B1 — Constructeur profil → participant
- Comportements : `buildParticipantFromBestiary(id, options)` produit un participant standard (Blessures imprimées, caractéristiques, armure imprimée, actions d'attaque aux dégâts fixes imprimés, Traits normalisés, `keywords`, Taille) ; attaques gratuites (Morsure, Cornes, Queue…) marquées pour les lots T ; remplace `summon.generic` ; aucune valeur recalculée. Emplacements : `js/core/bestiary-profiles.js`. Risque : moyen.

### B2 — Bibliothèque de profils dans l'outil (UI)
- Comportements : liste filtrable (livre, nom, mot-clé avec descendants), fiche lecture seule, « ajouter au combat » (un ou plusieurs exemplaires), « copier dans la réserve » ; chargement paresseux du fichier de données ; parcours navigateur `tests/browser-bestiary-library.mjs`. Note de publication : le fichier de données doit être ajouté au précache de `sw.js` par l'orchestrateur (fichier interdit ici). Risque : moyen.

### B3 — Raccordement des sorts d'invocation
- Comportements : Relever les morts et Réanimation (D6) utilisent les profils Squelette et Zombie importés (nombre = 1 + DR, À Terre, contrôlés) ; Manifestation de Démon Mineur (D5) utilise Sanguinaire de Khorne / Daemonette de Slaanesh ; plus de `summon.generic` pour ces sorts ; tests de non-régression des contrats de D5/D6. Risque : moyen.

## Bloc T — Traits de créature (V5 partout, raccordés aux services)

Chaque lot : cas de test précis sur de vrais profils importés, rappels pour tout ce que le moteur ne calcule pas (avec reçu), `v5-magic-reminder-flags` jamais utilisé comme preuve d'exécution.

- **T1 Natures** : Fabriqué (014), Éthéré (021), Artificiel, Mort-vivant (061), Démoniaque (018), Magique (036), Immunité (031), Insensible à la douleur (042), Bouclier (287) : immunités et remplacement de Volonté automatisés ; besoins vitaux en rappel ; Démoniaque et Protection (066) au service commun de protection (`previewMagicProtection`) ; 088-093 variantes du Zoo en V5.
- **T2 Combat naturel** : Morsure (006), Cornes (028), Attaque caudale (054), Piétinement (046), Tentacules (055), Langue (058), Constricteur (013), Toile (068), Étreinte glaciale (011), Souffle (009, 108, 250), Vomissement (065, 095), Hurlement fantomatique (025, 090), Regard pétrifiant (043), armes naturelles V4 (288) : attaques gratuites contre Élan, coûts et jets, reçus.
- **T3 États et dégâts continus** : Venin (064), Infecté (032), Parasité (033), Maladie (019), Sang corrosif (015), Vampirique (063), Nuée (053), Instable (062, 092, 147), Increvable (075), déclencheurs de mort et reformation (253, 256, 259, 269, 286).
- **T4 Déplacement** : Vol (023), Bond (008), Foulée (049, 051, 084), Grimpant (067), Amphibie (002, 089), Arboricole (069), Limicole (085), Fouissage (105), Respiration aquatique (150, 152), Créature marine / Aquatique (272, 276).
- **T5 Sens et discrétion** : Infravision (017), Vision nocturne (041), Furtif (050), Pisteur (059), Perturbant (020), Caméléon (207), Sens vibratoires (142).
- **T6 Psychologie** : Peur (022), Terreur (057), Effrayé (001), Animosité (003), Préjugé (081), Haine (027), Belliqueux (004, 220), Bestial (005), À Sang-froid (012, 221), Féroce (026, 209), Frénésie (024), Affamé (029), Stupide (052), Craintif (047), Territorial (056), Immunité Psychologique (030), Rage (078) ; décisions C0 ; spécialisations par mots-clés (K4).
- **T7 Magie des créatures** : Résistance à la Magie (037, 093), Lanceur de sorts (048), Béni (007), Miracles (039), Champion (010), Marques du Chaos (035, 267, 268), Corruption (016), Corruption mentale (038), Mutation (040), Dressé (060, 195-205).
- **T8 Régénération** (044) sur le registre des Blessures Critiques (d10 saisi, critique proposé ; feu et amputations exclus) ; **T9 Plusieurs têtes** (034) avec registre par tête ; **T10 Taille** (045, 091) : lecture V5 inchangée, Petit homebrew conservé.
- **T11 Modificateurs de gabarit** (069-087, gabarits des profils) : application d'un gabarit à un profil importé (modificateurs signés).
- **T12 Capacités propres du Zoo et de Lustria** (096-161, 173-193, 194-205, 250-288 non couvertes ailleurs) : raccordées par familles aux lots précédents ; le reste en rappel avec reçu, motif consigné par entrée.

## Bloc F — Familiers et Slann

- **F1 Conception** : `docs/plans-gpt/CONCEPTION_FAMILIERS.md` (Winds of Magic L17 pp.180-184 en V5, ouvert à tous, deux systèmes : animal / homoncule ; entrées 162-172) — la phase D (D10/D11) ne l'a pas fait. **F2 Code** : lien maître-familier automatisé (effets partagés, portée en saisie MJ).
- **S1 Slann** (211-219) : capacités assistées sur leurs seuls profils (Palanquin, Slann au sol, Contemplation, Téléportation de secours…), jamais généralisées.

## Bloc R — Clôture

- **R1** : `node tools/run-divine-recipe.mjs` verte ; `docs/plans-gpt/RAPPORT_PRO_PHASE_E.md` (une ligne par lot : FAIT + hash ou BLOQUÉ + raison ; dernière suite complète ; assertions de tests modifiées ; choix d'interprétation ; note de précache `sw.js`).

## Entrées d'inventaire non couvertes (exclusions motivées)

- E0-T-174 (catégories sang-chaud / sang-froid : classement de rappel, pas un Trait) ; E0-T-189 (artillerie des Hommes-lézards : système à part) ; E0-T-097 (« Snare ’Em Good » : explicitement pas un sort) ; E0-T-101, 107, 110 (bonus déjà reflétés dans le profil imprimé : portés par les données D, aucun code) ; E0-T-178, 180 (objets et consommables de Lustria : hors Traits, rappel).
- Entrées « rappel » d'un lot T non implantables sans fait de scène : restent en rappel avec reçu, justifiées dans le rapport.
- Livres ignorés : Ubersreik Adventures I-III, Salzenmund, Starter Set, Gamemaster's Guide : tout renvoi est laissé de côté, sans invention.
- L08 et L15 : aucun bloc de profil (E0-Q28).
- Si la session s'interrompt : le rapport liste les lots faits et le lot suivant ; les lots D se reprennent livre par livre sans dépendance entre eux.
