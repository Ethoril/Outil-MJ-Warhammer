# Inventaire Brisé, Peur, Terreur et ralliement

État : FAIT — inventaire de règles repérées, réserves explicites. Consultation ciblée des passages de règles ; aucune implantation et aucune certification globale des 2694 pages.

Socle : L06 V5 ; L05 sert aux noms français. Les suppléments gardent leurs formulations et leurs écarts ; toute adaptation reste à décider. Le manifeste contient 17 ouvrages L01–L17. Les repérages lexicaux servent à choisir les pages, pas à déclarer celles-ci lues. Extraction par pdftotext de Git, puis consultation ciblée avec -layout -f/-l.

Statuts : engine = clause calculée ; assisted = calcul limité à un circuit ou à des faits/actions MJ ; reminder = donnée ou rappel sans circuit générique établi ; absent = clause non raccordée dans le périmètre vérifié. Un Trait affiché ne vaut pas exécution. Les limites sont détaillées dans le JSON.

200 entrées : engine 7, assisted 53, reminder 34, absent 106.

| ID | Livre, page imprimée | Règle | Statut | Preuve actuelle |
| --- | --- | --- | --- | --- |
| C0-L06-001 | L06 p. 183 | Psychologie : Test de Calme | assisted | js/core/v5-talent-psychology.js:7 |
| C0-L06-002 | L06 p. 183 | Peur : sources et Test étendu | assisted | js/core/v5-talent-psychology.js:25 |
| C0-L06-003 | L06 p. 183 | Peur : conséquences | assisted | js/core/v5-talent-psychology.js:55 |
| C0-L06-004 | L06 p. 184 | Terreur : première rencontre | assisted | js/core/v5-talent-small.js:65 |
| C0-L06-005 | L06 p. 184 | Terreur : suite | assisted | js/core/v5-talent-small.js:65 |
| C0-L06-006 | L06 p. 183 | Animosité et Peur | reminder | js/core/v5-talent-psychology.js:7 |
| C0-L06-007 | L06 p. 184 | Haine | assisted | js/core/v5-talent-psychology.js:25 |
| C0-L06-008 | L06 p. 184 | Frénésie | assisted | js/core/v5-talent-psychology.js:57 |
| C0-L06-009 | L06 p. 184 | Acquérir un État | engine | js/core/v5-effects.js:94 |
| C0-L06-010 | L06 p. 184 | Cumul des pénalités | engine | js/core/v5-test-context.js:167 |
| C0-L06-011 | L06 p. 185 | Brisé : fuite obligatoire | assisted | js/core/v5-broken-escape.js:19 |
| C0-L06-012 | L06 p. 185 | Brisé : pénalité | assisted | js/core/v5-test-context.js:137 |
| C0-L06-013 | L06 p. 163 | Fuite : distance et Sprint | assisted | js/core/v5-broken-escape.js:37 |
| C0-L06-014 | L06 p. 163 | Fuite engagée | absent | js/core/v5-broken-escape.js:31 |
| C0-L06-015 | L06 p. 185 | Brisé : se cacher | assisted | js/core/v5-broken-escape.js:74 |
| C0-L06-016 | L06 p. 186 | Ralliement personnel | assisted | js/core/v5-effects.js:176 |
| C0-L06-017 | L06 p. 186 | Round entier caché | assisted | js/core/v5-effects.js:178 |
| C0-L06-018 | L06 p. 169 | Commandement : rallier un allié | absent | js/core/v5-talent-situations.js:28 |
| C0-L06-019 | L06 p. 169 | Intimidation en combat | absent | js/core/v5-talent-psychology.js:5 |
| C0-L06-020 | L06 p. 133 | Fortune et Brisé | engine | js/core/v5-effects.js:159 |
| C0-L06-021 | L06 p. 119 | Sans peur [Ennemi] | assisted | js/data/v5-talent-coverage.json:4514 |
| C0-L06-022 | L06 p. 120 | Effrayant | assisted | js/data/v5-talent-coverage.json:1496 |
| C0-L06-023 | L06 p. 120 | Fuite ! : poursuite | engine | js/data/v5-talent-coverage.json:1982 |
| C0-L06-024 | L06 p. 120 | Fuite ! : Mouvement supplémentaire | absent | js/data/v5-talent-coverage.json:1982 |
| C0-L06-025 | L06 p. 120 | Fuite ! : Brisé | absent | js/core/v5-broken-escape.js:31 |
| C0-L06-026 | L06 p. 124 | Orateur | assisted | tests/lot2-v5-remaining-talents.test.js:70 |
| C0-L06-027 | L06 p. 128 | Inébranlable | assisted | js/data/v5-talent-coverage.json:2498 |
| C0-L06-028 | L06 p. 128 | Seigneur de guerre | assisted | tests/lot2-v5-remaining-talents.test.js:71 |
| C0-L06-029 | L06 p. 356 | Trait Peureux / Afraid | reminder | js/core/v5-talent-psychology.js:6 |
| C0-L06-030 | L06 p. 356 | Trait Belliqueux | reminder | js/core/v5-talent-psychology.js:55 |
| C0-L06-031 | L06 p. 356 | Trait Bestial | reminder | js/core/v5-magic-arbitrations.js:24 |
| C0-L06-032 | L06 p. 358 | Trait Peur | reminder | js/core/v5-talent-psychology.js:25 |
| C0-L06-033 | L06 p. 358 | Hurlement spectral | reminder | js/core/v5-talent-actions.js:40 |
| C0-L06-034 | L06 p. 358 | Immunité à la Psychologie | reminder | js/core/resolution.js:503 |
| C0-L06-035 | L06 p. 359 | Marque de Slaanesh | reminder | js/core/v5-divine-effects-gear.js:14 |
| C0-L06-036 | L06 p. 360 | Taille et Peur V5 | assisted | js/core/v5-talent-psychology.js:17 |
| C0-L06-037 | L06 p. 361 | Trait Craintif / Skittish | reminder | js/core/v5-magic-arbitrations.js:24 |
| C0-L06-038 | L06 p. 362 | Trait Nuée | reminder | js/core/v5-talent-psychology.js:57 |
| C0-L06-039 | L06 p. 362 | Trait Terreur | reminder | js/core/v5-talent-small.js:65 |
| C0-L06-040 | L06 p. 363 | Dressage et Craintif | reminder | js/core/v5-magic-arbitrations.js:24 |
| C0-L06-041 | L06 p. 115 | Rage de bataille | assisted | js/core/v5-talent-actions.js:148 |
| C0-L06-042 | L06 p. 124 | Déterminé | assisted | js/core/v5-talent-replacements.js:29 |
| C0-L06-043 | L06 p. 126 | Cœur vaillant | engine | js/data/v5-talent-coverage.json:740 |
| C0-L06-044 | L06 p. 124 | Acharné : poursuite | assisted | js/core/v5-talent-tests.js:20 |
| C0-L06-045 | L06 p. 145 | Ivresse et courage | absent | js/core/v5-talent-psychology.js:5 |
| C0-L06-046 | L06 p. 155 | Racine étrange | absent | js/core/v5-talent-psychology.js:5 |
| C0-L06-047 | L06 p. 157 | Monture non dressée à la guerre | reminder | js/core/v5-broken-escape.js:19 |
| C0-L06-048 | L06 p. 181 | Symptôme Fièvre | absent | js/core/v5-talent-psychology.js:5 |
| C0-L06-049 | L06 p. 189 | Corruption : moral vacillant | absent | js/core/v5-talent-psychology.js:5 |
| C0-L06-050 | L06 p. 218 | Courroux : Crains ma colère | engine | tests/divin-v5-brise-flee-sprint-independent.test.js:47 |
| C0-L06-051 | L06 p. 223 | Masque mortuaire | reminder | js/data/v5-divine-contracts.json:14726 |
| C0-L06-052 | L06 p. 224 | Fureur de Myrmidia | assisted | js/core/v5-divine-effects-gear.js:14 |
| C0-L06-053 | L06 p. 226 | Apaisement de Shallya | assisted | js/core/v5-divine-effects-gear.js:12 |
| C0-L06-054 | L06 p. 226 | Flambeau de vertu | assisted | js/core/v5-divine-effects-conditions.js:244 ; js/core/v5-divine-effects-gear.js:14 |
| C0-L06-055 | L06 p. 228 | Givre d’Ulric | assisted | js/core/v5-turn.js:31 |
| C0-L06-056 | L06 p. 228 | Fureur d’Ulric | assisted | js/core/v5-divine-grammar.js:17 |
| C0-L06-057 | L06 p. 238 | Incident mineur : visions | assisted | js/core/v5-effects.js:8 |
| C0-L06-058 | L06 p. 304 | Poudre noire | assisted | js/core/v5-combat-rules.js:123 |
| C0-L06-059 | L06 p. 309 | Bière naine | absent | js/core/v5-talent-psychology.js:5 |
| C0-L06-060 | L06 p. 244 | Effrayant : sort | reminder | js/data/v5-spell-contracts.json:13197 ; js/core/v5-spell-contracts.js:3021 |
| C0-L06-061 | L06 p. 245 | Terrifiant : sort | reminder | js/data/v5-spell-contracts.json:13601 ; js/core/v5-spell-contracts.js:3021 |
| C0-L06-062 | L06 p. 245 | Attribut des Bêtes V5 | reminder | js/core/v5-spell-contracts.js:3021 |
| C0-L06-063 | L06 p. 246 | Peau du chasseur et Wyssan | reminder | js/data/v5-spell-contracts.json:6564 ; js/core/v5-spell-contracts.js:3021 |
| C0-L06-064 | L06 p. 247 | Voile pourpre | reminder | js/data/v5-spell-contracts.json:11985 ; js/core/v5-spell-contracts.js:3021 |
| C0-L06-065 | L06 p. 255 | Destrier d’ombre | reminder | js/data/v5-spell-contracts.json:16544 ; js/core/v5-spell-contracts.js:3021 |
| C0-L06-066 | L06 p. 257 | Horreur obsédante | reminder | js/core/v5-spell-contracts.js:3021 |
| C0-L06-067 | L06 p. 257 | Mauvais œil | reminder | js/core/v5-spell-contracts.js:3021 |
| C0-L06-068 | L06 p. 259 | Crâne hurlant | reminder | js/core/v5-spell-contracts.js:3021 |
| C0-L06-069 | L06 p. 260 | Attribut de Slaanesh | reminder | js/core/v5-spell-contracts.js:3021 |
| C0-L06-070 | L06 p. 247 | Vortex d’âmes | assisted | js/core/v5-spell-contracts.js:153 |
| C0-L06-071 | L06 p. 248 | Cœurs enflammés | assisted | js/data/v5-spell-contracts.json:745 |
| C0-L06-072 | L06 p. 248 | Couronne de flamme | assisted | js/data/v5-spell-contracts.json:543 ; js/core/v5-talent-situations.js:99 |
| C0-L06-073 | L06 p. 252 | Protection de Phâ | assisted | js/core/v5-spell-contracts.js:2208 |
| C0-L01-001 | L01 p. 28 | Taille ogre V4 | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-002 | L01 p. 32 | Braingobbler | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-003 | L01 p. 58 | Objets Dolorous et Bold Brass | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-004 | L01 p. 66 | Amulet of Righteous Silver | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-005 | L01 p. 85 | Fin de bataille de masse | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-006 | L01 p. 86 | Bolster | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-007 | L01 p. 86 | Hold This Ground | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-008 | L01 p. 87 | Traumatismes de guerre | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-009 | L01 p. 88 | Intruders : scène de bataille | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-010 | L01 p. 90 | Engin de guerre Peur | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-011 | L01 p. 92 | Psychologie durable : Terreur | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-012 | L01 p. 92 | Psychologie durable : destin et ambition | absent | js/core/v5-talent-psychology.js:5 |
| C0-L01-013 | L01 p. 92 | Récupération psychologique | absent | js/core/v5-talent-psychology.js:5 |
| C0-L02-001 | L02 p. 62 | Fellstave | absent | js/core/v5-talent-psychology.js:5 |
| C0-L02-002 | L02 p. 63 | Protection Pouch | absent | js/core/v5-talent-psychology.js:5 |
| C0-L02-003 | L02 p. 87 | Face of the Wild | absent | js/core/v5-talent-psychology.js:5 |
| C0-L02-004 | L02 p. 87 | Fervent Bellow | absent | js/core/v5-talent-psychology.js:5 |
| C0-L02-005 | L02 p. 74 | Rhya’s Rage | assisted | js/core/v5-divine-effects-gear.js:14 |
| C0-L04-001 | L04 p. 25 | Moment of Clarity | assisted | js/core/v5-divine-effects-gear.js:12 |
| C0-L04-002 | L04 p. 25 | Rally Round | assisted | js/data/v5-divine-contracts.json:17303 |
| C0-L04-003 | L04 p. 88 | Pax of Taal | reminder | js/core/v5-divine-effects-gear.js:12 |
| C0-L04-004 | L04 p. 100 | Intimidation lors d’un vol | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-001 | L07 p. 128 | Apothéose : variante Slann | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-002 | L07 p. 130 | Nœud géomantique terrifiant | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-003 | L07 p. 151 | Bénédictions de ponte | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-004 | L07 p. 166 | Stationary Attacker | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-005 | L07 p. 180 | Carnosaur : Blood Frenzy | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-006 | L07 p. 181 | Dread Saurian : Fearsome Roar | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-007 | L07 p. 183 | Attribut Waaagh! | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-008 | L07 p. 205 | Malédiction magique d’exploration | absent | js/core/v5-talent-psychology.js:5 |
| C0-L07-009 | L07 p. 205 | Nuage de spores | absent | js/core/v5-talent-psychology.js:5 |
| C0-L08-001 | L08 p. 37 | Viridescent Palliative | absent | js/core/v5-talent-psychology.js:5 |
| C0-L08-002 | L08 p. 48 | Obsession elfique | absent | js/core/v5-talent-psychology.js:5 |
| C0-L08-003 | L08 p. 107 | Writhing Mists et Yenlui clair | absent | js/core/v5-talent-psychology.js:5 |
| C0-L08-004 | L08 p. 113 | Aeskhaine Madness | absent | js/core/v5-talent-psychology.js:5 |
| C0-L08-005 | L08 p. 114 | Prières privées à Khaine | absent | js/core/v5-talent-psychology.js:5 |
| C0-L08-006 | L08 p. 80 | Calme | assisted | js/data/v5-spell-contracts.json:10866 ; js/core/v5-spell-contracts.js:2460 |
| C0-L08-007 | L08 p. 86 | Apothéose elfique | reminder | js/data/v5-spell-contracts.json:4461 |
| C0-L08-008 | L08 p. 88 | Main de gloire | assisted | tests/lot3-v5-delivery-2c.test.js:53 |
| C0-L09-001 | L09 p. 33 | Événements d’Arche noire | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-002 | L09 p. 44 | Belliqueux : variante L09 | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-003 | L09 p. 59 | Witchbrew | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-004 | L09 p. 63 | Complications du Dhar | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-005 | L09 p. 66 | Poisoned Whispers | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-006 | L09 p. 66 | Shroud of Despair | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-007 | L09 p. 67 | Stolen Aspect | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-008 | L09 p. 68 | Cry of War | absent | js/core/v5-talent-psychology.js:5 |
| C0-L09-009 | L09 p. 116 | Battle Rage : formulation reprise | assisted | js/core/v5-talent-actions.js:148 |
| C0-L11-001 | L11 p. 41 | Bonebreaker détruit | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-002 | L11 p. 41 | Unique Experiment | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-003 | L11 p. 45 | Amibe et feu | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-004 | L11 p. 70 | Skin Wolf : Endless Rage | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-005 | L11 p. 75 | Great Taurus : Bloodrage | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-006 | L11 p. 77 | Razorbills en nuée | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-007 | L11 p. 81 | Carnosaur : Blood Frenzy | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-008 | L11 p. 90 | Shard Dragon : Rabid Frenzy | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-009 | L11 p. 91 | Breath of Nightmares | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-010 | L11 p. 107 | Potion de fureur de Preyton | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-011 | L11 p. 116 | Bouclier de poudre de revenant | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-012 | L11 p. 116 | Wulfshowl | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-013 | L11 p. 135 | Belliqueux : variante Zoo | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-014 | L11 p. 136 | Fury | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-015 | L11 p. 136 | Ghostly Howl : variante Zoo | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-016 | L11 p. 136 | Taille : variante Zoo | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-017 | L11 p. 137 | Territorial | absent | js/core/v5-talent-psychology.js:5 |
| C0-L12-001 | L12 p. 82 | Gastromancie : Brisé ignoré | absent | js/core/v5-talent-psychology.js:5 |
| C0-L12-002 | L12 p. 83 | Incident de gastromancie 61–65 | absent | js/core/v5-talent-psychology.js:5 |
| C0-L12-003 | L12 p. 89 | Hungry Troll | absent | js/core/v5-talent-psychology.js:5 |
| C0-L12-004 | L12 p. 96 | Incident chamanique 51–55 | absent | js/core/v5-talent-psychology.js:5 |
| C0-L12-005 | L12 p. 100 | Attribut Grande Waaagh! | absent | js/core/v5-talent-psychology.js:5 |
| C0-L12-006 | L12 p. 101 | WAAAGH! | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-001 | L13 p. 79 | En bon ordre V4 | assisted | js/data/v5-divine-contracts.json:1177 |
| C0-L13-002 | L13 p. 79 | Aspect courroucé | assisted | js/data/v5-divine-contracts.json:1177 |
| C0-L13-003 | L13 p. 79 | Tenez bon | assisted | js/data/v5-divine-contracts.json:1177 |
| C0-L13-004 | L13 p. 79 | Dévotion de la Vierge guerrière | assisted | js/data/v5-divine-contracts.json:1177 |
| C0-L13-005 | L13 p. 106 | Calmer la monture | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-006 | L13 p. 107 | Dressage Guerre et bruit | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-007 | L13 p. 117 | Traumatisme du mercenaire | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-008 | L13 p. 127 | Fuite et coup gratuit V4 | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-009 | L13 p. 127 | Poursuite : distance | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-010 | L13 p. 134 | Flee from Harm | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-011 | L13 p. 140 | Fuite ! : variante Up in Arms | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-012 | L13 p. 141 | Acharné : variante Up in Arms | absent | js/core/v5-talent-psychology.js:5 |
| C0-L13-013 | L13 p. 141 | Cavalier accompli | absent | js/core/v5-talent-psychology.js:5 |
| C0-L14-001 | L14 p. 50 | Mirkwine | absent | js/core/v5-talent-psychology.js:5 |
| C0-L15-001 | L15 p. 79 | Cracheur de dragon | engine | js/data/v5-talent-coverage.json:1100 |
| C0-L15-002 | L15 p. 83 | Rancunes | absent | js/core/v5-talent-psychology.js:5 |
| C0-L15-003 | L15 p. 95 | Pierre des serments | absent | js/core/v5-talent-psychology.js:5 |
| C0-L15-004 | L15 p. 125 | Rune of Daunting | absent | js/core/v5-talent-psychology.js:5 |
| C0-L15-005 | L15 p. 128 | Rune of Courage | absent | js/core/v5-talent-psychology.js:5 |
| C0-L15-006 | L15 p. 130 | Rune of the Valiant | absent | js/core/v5-talent-psychology.js:5 |
| C0-L15-007 | L15 p. 130 | Rune of Hearth and Home | absent | js/core/v5-talent-psychology.js:5 |
| C0-L16-001 | L16 p. 11 | Master Rune of Dismay | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-001 | L17 p. 24 | Incident : The Horror | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-002 | L17 p. 58 | Stoicism de Hysh | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-003 | L17 p. 130 | Red Mist d’Aqshy | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-004 | L17 p. 142 | Savage Gaze de Ghur | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-005 | L17 p. 142 | Claustrophobia de Ghur | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-006 | L17 p. 146 | Attribut des Bêtes V4 | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-007 | L17 p. 147 | Beast Unbroken | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-008 | L17 p. 170 | Axe of Unrelenting Fury | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-009 | L17 p. 172 | Mail of Stolen Valour | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-010 | L17 p. 176 | Howl of the Great Beast | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-011 | L17 p. 186 | Familier d’Aqshy | assisted | js/core/v5-talent-actions.js:33 |
| C0-L17-012 | L17 p. 187 | États des familiers | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-013 | L17 p. 217 | Weezer’s Drizzle | absent | js/core/v5-talent-psychology.js:5 |
| C0-L17-014 | L17 p. 62 | Clarté mentale | assisted | js/core/v5-spell-contracts.js:2208 |
| C0-L17-015 | L17 p. 65 | Protection de Phâ : variante V4 | assisted | js/core/v5-spell-contracts.js:2208 |
| C0-L17-016 | L17 p. 101 | Tempête de Shemtek | reminder | js/data/v5-spell-contracts.json:2870 ; js/core/v5-spell-contracts.js:3021 |
| C0-L17-017 | L17 p. 110 | Horreurs noires | reminder | js/data/v5-spell-contracts.json:15513 |
| C0-L17-018 | L17 p. 111 | Cor du Andar | assisted | js/data/v5-spell-contracts.json:15961 |
| C0-L17-019 | L17 p. 113 | Ombre vagabonde et destrier | reminder | js/data/v5-spell-contracts.json:16883 |
| C0-L17-020 | L17 p. 122 | Acceptation du destin | assisted | js/data/v5-spell-contracts.json:11130 ; js/core/v5-divine-effects-gear.js:12 |
| C0-L17-021 | L17 p. 122 | Soleil pourpre surincanté | reminder | js/core/v5-spell-contracts.js:153 |
| C0-L17-022 | L17 p. 124 | Vortex d’âmes et Voile pourpre | assisted | js/core/v5-spell-contracts.js:153 |
| C0-L17-023 | L17 p. 134 | Tête brûlante | reminder | js/data/v5-spell-contracts.json:223 ; js/core/v5-spell-contracts.js:3021 |
| C0-L17-024 | L17 p. 135 | Cœurs enflammés : variante V4 | assisted | js/data/v5-spell-contracts.json:745 |
| C0-L17-025 | L17 p. 149 | Le Bœuf reste debout | assisted | js/data/v5-spell-contracts.json:6990 ; js/core/v5-spell-contracts.js:2326 |
| C0-L06-074 | L06 p. 158 | Poursuite V5 | absent | js/core/v5-broken-escape.js:19 |
| C0-L17-026 | L17 p. 125 | Désespoir après sort | reminder | js/core/v5-spell-contracts.js:153 |
| C0-L06-075 | L06 p. 119 | Coude-à-coude : couvrir la retraite | assisted | js/core/v5-talent-situations.js:79 |
| C0-L06-076 | L06 p. 119 | Flagellant : Frénésie sur blessure | assisted | js/core/v5-talent-situations.js:32 |
| C0-L06-077 | L06 p. 357 | À Sang-froid V5 | reminder | js/core/v5-divine-effects-gear.js:202 |
| C0-L09-010 | L09 p. 46 | À Sang-froid : variante Temple of Spite | reminder | js/core/v5-divine-effects-gear.js:202 |
| C0-L11-018 | L11 p. 15 | Borrowed Courage | absent | js/core/v5-talent-psychology.js:5 |
| C0-L11-019 | L11 p. 61 | Endless Malice : témoins | absent | js/core/v5-talent-psychology.js:5 |
| C0-L02-006 | L02 p. 81 | Mort du compagnon lié | absent | js/core/v5-magic-reminder-flags.js:33 |

## Couverture consultée

- L06 : passages des pages physiques 3, 4, 5, 6, 115, 119, 120, 124, 126, 128, 133, 143, 145, 155, 157, 158, 159, 163, 168, 169, 181, 183, 184, 185, 186, 189, 218, 223, 224, 226, 228, 238, 244, 245, 246, 247, 248, 252, 255, 256, 257, 258, 259, 260, 304, 309, 356, 357, 358, 359, 360, 361, 362, 363 ; repérage lexical puis passages ciblés, divergences conservées.
- L01 : passages des pages physiques 1, 2, 28, 31, 32, 33, 58, 66, 82, 83, 84, 85, 86, 87, 88, 90, 92 ; recherche lexicale et pages ciblées relues.
- L02 : passages des pages physiques 2, 3, 55, 62, 63, 64, 65, 74, 87, 81 ; recherche lexicale et pages ciblées relues.
- L03 : passages des pages physiques 2, 3, 30, 91 ; renvois à des talents et récits ; aucune nouvelle règle C0 isolée.
- L04 : passages des pages physiques 2, 3, 25, 88, 100, 127 ; recherche lexicale et pages ciblées relues.
- L05 : passages des pages physiques 168, 170, 190, 193, 194 ; repères français ; pagination physique = imprimée + 2 sur les pages contrôlées.
- L07 : passages des pages physiques 91, 128, 130, 137, 144, 150, 151, 166, 180, 181, 183, 205 ; recherche lexicale et pages ciblées relues.
- L08 : passages des pages physiques 37, 48, 49, 80, 86, 88, 107, 113, 114 ; recherche lexicale et pages ciblées relues.
- L09 : passages des pages physiques 33, 44, 51, 52, 59, 63, 66, 67, 68, 116, 46 ; recherche lexicale et pages ciblées relues.
- L10 : passages des pages physiques 2, 19, 38, 50, 51, 68, 74, 86 ; profils et récits ; aucune nouvelle clause chiffrée C0 isolée dans les passages consultés.
- L11 : passages des pages physiques 41, 45, 70, 75, 77, 81, 90, 91, 100, 107, 116, 135, 136, 137, 15, 61 ; repérage lexical puis passages ciblés, divergences conservées.
- L12 : passages des pages physiques 6, 9, 82, 83, 89, 96, 100, 101 ; repérage lexical puis passages ciblés, divergences conservées.
- L13 : passages des pages physiques 79, 106, 107, 117, 127, 132, 134, 140, 141 ; repérage lexical puis passages ciblés, divergences conservées.
- L14 : passages des pages physiques 50, 80 ; repérage lexical puis passages ciblés, divergences conservées.
- L15 : passages des pages physiques 79, 83, 84, 95, 125, 128, 130 ; repérage lexical puis passages ciblés, divergences conservées.
- L16 : passages des pages physiques 11 ; repérage lexical puis passages ciblés, divergences conservées.
- L17 : passages des pages physiques 24, 58, 62, 65, 101, 110, 111, 113, 122, 124, 125, 130, 134, 135, 136, 142, 146, 147, 148, 149, 150, 170, 172, 176, 186, 187, 217 ; repérage lexical puis passages ciblés, divergences conservées.

## openQuestions

- **C0-Q01** : Peur générale : L06 p.183 demande d’atteindre l’indice, mais le Trait p.358 de le dépasser. Quel seuil retenir ?
- **C0-Q02** : Terreur : L06 p.184 ajoute les DR négatifs après le premier, p.362 les ajoute tous. Quel nombre de Brisé appliquer ?
- **C0-Q03** : Effrayant p.120 compte des réussites par Tour ; la Peur générale p.183 compte des DR par Round. Conserver deux mécanismes ou les harmoniser ?
- **C0-Q04** : Petit est un homebrew V4 explicitement conservé par le MJ (couverture talent-small). Préserver ses arbitrages du 9 octobre ; aucune migration automatique vers Taille V5 p.360.
- **C0-Q05** : Le corpus manifeste contient L01 à L17, pas L18. Cœur du loup référence un compagnon Power Behind the Throne hors des 17 PDF ; fournir/autoriser sa source avant inventaire de cette règle.
- **C0-Q06** : Ne pas réintroduire les conséquences V4 de fin de Brisé : L05 p.168 (physique 170) ajoute Exténué, L06 p.186 ne l’énonce pas. L05 sert d’abord aux noms français.
- **C0-Q07** : Le catalogue couvre seulement les DR de Fuite ! ; décider du raccordement réel du Mouvement supplémentaire et de son exemption de Brisé, avec la fuite engagée.
- **C0-Q08** : L01 p.28 et L11 p.136 appliquent Terreur à un écart de deux tailles ; L06 p.360 ne le dit plus. Maintenir les arbitrages locaux Petit, puis décider séparément des créatures génériques.
- **C0-Q09** : Belliqueux diffère entre L06 p.356 (Élan propre), L09 p.44 (Élan propre sans Élan adverse), L11 p.135 (plus d’Avantage, immunité Psychologie entière). Quelle référence pour chaque profil importé ?
- **C0-Q10** : Hurlement spectral : L06 p.358 demande Calme ; L11 p.136 demande Endurance et emploie l’Avantage V4. Ne pas fusionner les deux.
- **C0-Q11** : Les tableaux L07 p.151 et L09 p.63 s’extraient avec des colonnes décalées : confirmer visuellement leurs correspondances avant de créer des choix numériques.
- **C0-Q12** : Poisoned Whispers L09 p.66 donne BFM Rounds et évoque ensuite un Test quotidien au lever du soleil : quelle durée retenir ?
- **C0-Q13** : Cry of War L09 p.68 ne chiffre ni indice ni durée de Terreur ; l’événement spectral L09 p.33 ne chiffre pas Peur non plus.
- **C0-Q14** : Fellstave L02 p.62 associe l’échec d’Intuition à l’identification du sort après récupération : formulation à confirmer sans inverser silencieusement la réussite.
- **C0-Q15** : Cœurs enflammés diffère entre L06 p.248 et L17 p.135 ; attribut des Bêtes : BFM Rounds en L06 p.245, 1d10 en L17 p.146. Les contrats V5 doivent garder la priorité choisie.
- **C0-Q16** : Up in Arms L13 p.106 donne récupération de la monture sur son Tour ; L06 p.186 impose la fin du Round. Choisir le moment et la formule Équitation avant adaptation.
- **C0-Q17** : Portées en caractéristiques entières, pourcentages V4 et Avantage : adapter explicitement les nouvelles règles aux conventions V5, en conservant les décisions divines existantes.
- **C0-Q18** : Moral de masse, séquelles psychologiques, rançonnement des PJ, rancunes et drogues sont des sous-systèmes à arbitrer ; un bouton générique d’État n’en démontre aucune automatisation.
- **C0-Q19** : Masque mortuaire et Givre d’Ulric ne précisent pas l’indice de Peur ; les contrats divins possèdent déjà leurs décisions MJ. Ne pas en déduire l’indice de toutes les autres sources.
- **C0-Q20** : À Sang-froid : Avantage de Calme dans L06 p.357, inversion dans L09 p.46. Quelle règle utiliser pour les profils du supplément ?

## Validation et portée

Le code est celui du worktree gpt/phase-a après A12 (f6daf2e). La recette de la phase A passe 26 commandes, dont 3307 tests Node ; elle ne constitue pas une validation des règles encore absentes ni de ces inventaires. Les instances de profils qui ne font que réutiliser les Traits du socle ne sont pas répétées ici. Les récits où le mot peur ne déclenche aucune règle restent hors table. Les repérages lexicaux ne garantissent pas que des synonymes sans ces mots aient été trouvés ; les tableaux ambigus restent ouverts.

Aucune source de jeu, aucun moteur et aucun test ne sont modifiés par C0.
