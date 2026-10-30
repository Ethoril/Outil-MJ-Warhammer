# Matrice de couverture des 277 contrats de sorts V5

Date : 14 octobre 2026. Référence : `docs/lot3/LOT3_AUDIT_SORTS.json`, `docs/lot3/LOT3_CADRAGE_MAGIE.md`.

> Classement par état réellement appliqué, comparé à un lancement témoin sans effets. Le lancement fournit dés et choix mais aucun fait de scène obligatoire ; une précondition absente garde le classement données MJ. Les effets périodiques sont ensuite mesurés sur deux Rounds de vraies fins de Tour, avec dés et présences explicitement déclarés dans la sonde. Les couches, coûts et reçus seuls ne sont pas des effets calculables. Ces nombres ne certifient pas toutes les clauses. Ingrédients exclus.

## Synthèse de couverture

- **Contrat à effet calculable** : 196
- **Contrat nécessitant des données MJ** : 64
- **Rappel** : 140
- **Contrat restant à réaliser** : 0

| # | Nom FR | Nom Canonique V5 | Domaine / Famille | NI V5 | Portée | Cible | Durée | Statut Couverture | Typage Effet | Empreinte Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | Purification | Purge | fire (Aqshy) | 10 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | condition | `sha256:338ebcf9...` |
| 3 | Égide d’Aqshy | Aqshy’s Aegis | fire (Aqshy) | 5 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | ward | `sha256:0f16ee55...` |
| 4 | Corps de Feu | Corps de Feu | fire (Aqshy) | 5 | Vous | Vous | Bonus d’Endurance minutes | Contrat à effet calculable + Rappel | special | `sha256:6bc31b04...` |
| 5 | Sang Bouillonnant | Sang Bouillonnant | fire (Aqshy) | 5 | Contact | 1 | 1 Round | Contrat à effet calculable + Rappel | special | `sha256:15580a8c...` |
| 6 | Tête Brûlante | Tête Brûlante | fire (Aqshy) | 6 | Force Mentale mètres | Spécial | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:d8491709...` |
| 7 | Flamme Captivante | Flamme Captivante | fire (Aqshy) | 3 | Moitié de la Force Mentale mètres | 1 feu | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:e5093f01...` |
| 8 | Cautérisation | Cauterise | fire (Aqshy) | 2 | Contact | 1 | Instantané | Contrat à effet calculable + Rappel | healing | `sha256:830122e3...` |
| 9 | Colérique | Colérique | fire (Aqshy) | 2 | Moitié de l’Initiative mètres | 1 | Bonus de Force Mentale heures | Contrat nécessitant des données MJ | special | `sha256:9ea552a2...` |
| 10 | Couronne de Flamme | Crown of Flame | fire (Aqshy) | 8 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | traits | `sha256:a5f7d146...` |
| 11 | Mur de Feu | Firewall | fire (Aqshy) | 6 | (Force Mentale) mètres | ZdE (Spécial) | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | special | `sha256:0a572a92...` |
| 12 | Tempête de Flammes | Tempête de Flammes | fire (Aqshy) | 8 | Force Mentale mètres | Spécial | Spécial | Contrat à effet calculable + Rappel | magic-missile | `sha256:bf6df7a6...` |
| 13 | Cœurs Enflammés | Flaming Hearts | fire (Aqshy) | 5 | Vous | ZdE (Bonus de Sociabilité) mètres | Instantané | Rappel | special | `sha256:aa7cbce1...` |
| 14 | Épée Enflammée de Rhuin | Flaming Sword of Rhuin | fire (Aqshy) | 8 | (Force Mentale) mètres | 1 épée | (Bonus de Force Mentale) Rounds | Contrat nécessitant des données MJ | special | `sha256:99bb3625...` |
| 15 | Forge de Tarnus | Forge de Tarnus | fire (Aqshy) | 6 | Contact | 1 forge | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | special | `sha256:eb9d04af...` |
| 16 | Grands Feux d’U’Zhul | Great Fires of U’Zhul | fire (Aqshy) | 12 | (Force Mentale) mètres | 1 (maximum) + ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | magic-missile | `sha256:d9f4641b...` |
| 17 | Ignition | Ignition | fire (Aqshy) | 3 | Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel | condition | `sha256:3b8e9337...` |
| 18 | Flamme Inextinguible | Flamme Inextinguible | fire (Aqshy) | 3 | Moitié de l’Initiative mètres | 1 feu | Bonus de Force Mentale heures | Rappel | special | `sha256:f82e85f3...` |
| 19 | Flamme Attisée | Flamme Attisée | fire (Aqshy) | 2 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | 1 Round | Rappel | special | `sha256:faa4bf9d...` |
| 20 | Esprit du Foyer | Esprit du Foyer | fire (Aqshy) | 4 | Contact | Spécial | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | summon | `sha256:9533c7c3...` |
| 21 | Tempête Magmatique | Tempête Magmatique | fire (Aqshy) | 13 | Vortex aléatoire | ZdE 2 × Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:04a18799...` |
| 22 | Epées Sanguines | Epées Sanguines | fire (Aqshy) | 6 | Force Mentale mètres | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | summon | `sha256:5af31bda...` |
| 23 | Goût de Feu | Goût de Feu | fire (Aqshy) | 2 | Bonus de Force Mentale mètres | 1 pot, cruche ou flacon | Instantané | Rappel | special | `sha256:9901c9f9...` |
| 24 | Chaleur Desséchante | Chaleur Desséchante | fire (Aqshy) | 6 | ZdE Force Mentale mètres | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:49a6af71...` |
| 25 | Blizzard enflammé de Ygethmor | Blizzard enflammé de Ygethmor | fire (Aqshy) | 12 | Force Mentale mètres | ZdE Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:7df770df...` |
| 26 | Arc de T’Essla | Arc de T’Essla | heavens (Azyr) | 7 | Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:bfc13214...` |
| 27 | Bouclier céruléen | Cerulean Shield | heavens (Azyr) | 7 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | armor | `sha256:92926077...` |
| 28 | Ironie du Destin | Fate’s Fickle Fingers | heavens (Azyr) | 6 | Vous | ZdE (Bonus d’Initiative) mètres | (Bonus de Force Mentale) Rounds | Rappel | narrative | `sha256:1da939f6...` |
| 29 | Le Second Signe d’Amul | The Second Portent of Amul | heavens (Azyr) | 6 | Vous | Vous | (Bonus d’Initiative) Rounds | Contrat à effet calculable | special | `sha256:15970cfc...` |
| 30 | Le Troisième Signe d’Amul | The Third Portent of Amul | heavens (Azyr) | 12 | Vous | Vous | Initiative Rounds | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:e76fc46e...` |
| 31 | Maudit | Starcrossed | heavens (Azyr) | 7 | Initiative mètres | 1 | (Bonus d’Initiative) Rounds | Rappel | narrative | `sha256:ac90b014...` |
| 32 | Orage de Thorsen | Orage de Thorsen | heavens (Azyr) | 11 | Vortex aléatoire | ZdE 2 × Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:26f4efcf...` |
| 33 | Polir et Exalter | Polir et Exalter | heavens (Azyr) | 1 | Contact | 1 objet | Bonus d’Initiative minutes | Rappel | special | `sha256:9d8bea9b...` |
| 34 | Projection Spirituelle | Projection Spirituelle | heavens (Azyr) | 7 | Vous | Vous | Bonus d’Endurance heures | Contrat à effet calculable + Rappel | special | `sha256:189057dc...` |
| 35 | Arche de Saphir | Arche de Saphir | heavens (Azyr) | 6 | Moitié de la Force Mentale mètres | Spécial | 1 Round | Rappel | special | `sha256:6afc9a75...` |
| 36 | Comète de Cassandora | Comet of Casandora | heavens (Azyr) | 18 | (Initiative) mètres | ZdE (2 × Bonus de Force Mentale) mètres | Spécial | Contrat à effet calculable + Rappel | special | `sha256:9975cdd4...` |
| 37 | Le Premier Signe d’Amul | The First Portent of Amul | heavens (Azyr) | 3 | Vous | Vous | (Bonus d’Initiative) Rounds | Contrat à effet calculable | special | `sha256:fcaa3df9...` |
| 38 | Lames Azurées | Lames Azurées | heavens (Azyr) | 6 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:c7e98888...` |
| 39 | Malédiction du Destin | Malédiction du Destin | heavens (Azyr) | 8 | Moitié de la Force Mentale mètres | 1 | 1 jour | Contrat à effet calculable + Rappel (Suivi fiche) | test-modifiers | `sha256:803bbf92...` |
| 40 | Divination | Divination | heavens (Azyr) | 3 | Vous | Vous | Instantané | Rappel | special | `sha256:6a4dfe60...` |
| 41 | Ennemi Anticipé | Ennemi Anticipé | heavens (Azyr) | 4 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:b4cecc14...` |
| 42 | Prémonition Fantastique | Prémonition Fantastique | heavens (Azyr) | 7 | ZdE Force Mentale mètres | Vous | 1 Round | Rappel | special | `sha256:352a6692...` |
| 43 | Destin Illuminé | Destin Illuminé | heavens (Azyr) | 5 | Moitié de l’Intelligence mètres ou Contact | 1 | Instantané | Rappel | narrative | `sha256:eeb59c89...` |
| 44 | Lentille du Ciel | Lentille du Ciel | heavens (Azyr) | 3 | Vous | Vous | Bonus d’Initiative minutes | Contrat à effet calculable + Rappel | test-modifiers | `sha256:437ff769...` |
| 45 | Que les Quatre Vents Soufflent ! | Que les Quatre Vents Soufflent ! | heavens (Azyr) | 9 | Force Mentale mètres | 4 × ZdE Bonus de Force Mentale mètres | Instantané | Contrat nécessitant des données MJ | condition | `sha256:d1843312...` |
| 46 | Mistral de la Stratosphère | Mistral de la Stratosphère | heavens (Azyr) | 7 | Bonus de Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | damage | `sha256:235d9a68...` |
| 47 | Miroir Mystique | Miroir Mystique | heavens (Azyr) | 7 | Force Mentale miles | 1 (maximum) | Bonus de Sociabilité Rounds | Rappel | narrative | `sha256:446ee262...` |
| 48 | Éclat Stellaire | Éclat Stellaire | heavens (Azyr) | 8 | ZdE Force Mentale mètres | Vous | Bonus de Force Mentale minutes | Rappel | special | `sha256:ef46e5f0...` |
| 49 | Tempête de Shemtek | Tempête de Shemtek | heavens (Azyr) | 11 | Moitié de la Force Mentale mètres | 2 × Bonus d’Initiative ou Bonus d’Initiative | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:c35d37c8...` |
| 50 | Écaille d’acier | Écaille d’acier | metal (Chamon) | 5 | Vous | Vous | Bonus d’Endurance Rounds | Contrat à effet calculable + Rappel | ward | `sha256:cf073016...` |
| 51 | Plume de plomb | Feather of Lead | metal (Chamon) | 5 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat nécessitant des données MJ | special | `sha256:099a2e02...` |
| 52 | Inscription | Inscription | metal (Chamon) | 2 | 1 mètre | Spécial | Spécial | Contrat à effet calculable + Rappel | special | `sha256:ff7e1f4c...` |
| 53 | Métal restauré | Métal restauré | metal (Chamon) | 4 | Contact | 1 objet | Instantané | Rappel (Suivi fiche) | special | `sha256:6efcebae...` |
| 54 | Transmutation de Chamon | Transmutation of Chamon | metal (Chamon) | 12 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | magic-missile | `sha256:9872a58c...` |
| 55 | Armure d’étain | Armure d’étain | metal (Chamon) | 4 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | armor | `sha256:86afadd3...` |
| 56 | Franchir l’inconnu | Franchir l’inconnu | metal (Chamon) | 4 | Initiative mètres | 1 | Instantané | Rappel | special | `sha256:c6861c31...` |
| 57 | Creuset de Chamon | Crucible of Chamon | metal (Chamon) | 7 | (Bonus de Force Mentale) mètres | 1 objet | Instantané | Contrat nécessitant des données MJ | magic-missile | `sha256:b4a16c5a...` |
| 58 | Malédiction de rouille | Malédiction de rouille | metal (Chamon) | 4 | Force Mentale mètres | 1 objet d’Encombrement 1 | Instantané | Rappel (Suivi fiche) | special | `sha256:e18097cc...` |
| 59 | Arme enchantée | Enchant Weapon | metal (Chamon) | 6 | 1 mètre | Spécial | (Bonus de Force Mentale) Rounds | Contrat nécessitant des données MJ | special | `sha256:eaa564bd...` |
| 60 | Défaut de Forme | Défaut de Forme | metal (Chamon) | 2 | Force Mentale mètres | 1 arme | Bonus d’Initiative Rounds | Contrat nécessitant des données MJ | special | `sha256:dfc53b88...` |
| 61 | Or des fous | Fool’s Gold | metal (Chamon) | 4 | Contact | 1 objet | Force Mentale minutes | Rappel | special | `sha256:0daee809...` |
| 62 | Forge de Chamon | Forge of Chamon | metal (Chamon) | 9 | (Bonus de Force Mentale) mètres | Spécial | Force Mentale minutes | Rappel (Suivi fiche) | special | `sha256:b833e68f...` |
| 63 | Globe doré de Gehenna | Globe doré de Gehenna | metal (Chamon) | 13 | Vortex aléatoire | ZdE 2 × Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:1fa340a6...` |
| 64 | Cage dorée | Cage dorée | metal (Chamon) | 9 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale heures | Rappel | special | `sha256:29543855...` |
| 65 | Robe scintillante | Glittering Robe | metal (Chamon) | 6 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | armor | `sha256:f106a750...` |
| 66 | Toucher doré | Toucher doré | metal (Chamon) | 7 | Contact | Spécial | Spécial | Contrat nécessitant des données MJ | special | `sha256:53a089d7...` |
| 67 | Blindage d’oracier | Blindage d’oracier | metal (Chamon) | 10 | Bonus de Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Force Mentale minutes | Rappel | special | `sha256:4485819d...` |
| 68 | Nœud défait | Nœud défait | metal (Chamon) | 5 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | test-modifiers | `sha256:5297b6c2...` |
| 69 | Blindage de météorite | Blindage de météorite | metal (Chamon) | 7 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | 1 Round | Contrat à effet calculable + Rappel | ward | `sha256:107ccb46...` |
| 70 | Métal changeant | Mutable Metal | metal (Chamon) | 5 | Contact | 1 objet | (Bonus de Force Mentale) Rounds | Rappel | special | `sha256:d218e8ed...` |
| 71 | Réfraction prismatique de Habermas | Réfraction prismatique de Habermas | metal (Chamon) | 5 | ZdE Force Mentale mètres | Vous | 1 Round | Contrat à effet calculable + Rappel | test-modifiers | `sha256:0f55ae6f...` |
| 72 | Boussole d’Argent de Puchta | Boussole d’Argent de Puchta | metal (Chamon) | 2 | ZdE Force Mentale mètres | 1 boussole | Force Mentale minutes | Rappel | special | `sha256:a9e82789...` |
| 73 | Réplique de Levorg | Réplique de Levorg | metal (Chamon) | 6 | Vous | Spécial | 1d10 heures | Contrat nécessitant des données MJ | special | `sha256:a7dc0498...` |
| 74 | Essais et Erreurs | Essais et Erreurs | metal (Chamon) | 3 | Intelligence mètres | 1 | Bonus de Force Mentale minutes | Rappel | special | `sha256:97474953...` |
| 75 | Apothéose | Apothéose | high (Qhaysh) | 4 | Moitié de la Force Mentale mètres | 1 | 1 Round | Contrat à effet calculable + Rappel (Suivi fiche) | healing | `sha256:8ef59cde...` |
| 76 | Destruction des Arcanes | Destruction des Arcanes | high (Qhaysh) | 9 | Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:038442e8...` |
| 77 | Coruscation de Finreir | Coruscation de Finreir | high (Qhaysh) | 11 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | armor | `sha256:0daa5cfa...` |
| 78 | Malédiction d'Attraction des Flèches | Malédiction d'Attraction des Flèches | high (Qhaysh) | 5 | Force Mentale mètres | ZdE Bonus de CT mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:7b2a82e7...` |
| 79 | Impasse | Impasse | high (Qhaysh) | 5 | Moitié de l’Endurance mètres | 1 lanceur, sort ou objet | Bonus de Force Mentale minutes | Contrat nécessitant des données MJ | special | `sha256:34a0386c...` |
| 80 | Drain de Magie | Drain de Magie | high (Qhaysh) | 6 | Moitié de la Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:314b83aa...` |
| 81 | Convocation Ardente | Convocation Ardente | high (Qhaysh) | 10 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | magic-missile | `sha256:7e292e0d...` |
| 82 | La Fortune est Capricieuse | La Fortune est Capricieuse | high (Qhaysh) | 6 | Sociabilité mètres | 1 | Bonus de Sociabilité Rounds | Contrat à effet calculable | special | `sha256:83b797cf...` |
| 83 | Glamour de Teclis | Glamour de Teclis | high (Qhaysh) | 7 | Force Mentale mètres | ZdE Bonus d’Intelligence mètres | Bonus d’Intelligence Rounds | Contrat à effet calculable + Rappel | special | `sha256:da09e8f2...` |
| 84 | Bannissement Majeur | Bannissement Majeur | high (Qhaysh) | 14 | Vous | ZdE Moitié de la Force Mentale mètres | 1 Round | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:07df2f6d...` |
| 85 | Main de Gloire | Main de Gloire | high (Qhaysh) | 4 | Vous | ZdE Bonus de Sociabilité mètres | 1 Round | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:54c1c67c...` |
| 86 | Œil Invisible | Œil Invisible | high (Qhaysh) | 4 | Bonus d’Intelligence mètres | Spécial | Bonus d’Intelligence heures | Contrat à effet calculable + Rappel | summon | `sha256:6b161b9b...` |
| 87 | Bouclier de Saphery | Bouclier de Saphery | high (Qhaysh) | 4 | Vous | ZdE Bonus de Force Mentale mètres | 1 Round | Contrat à effet calculable | ward | `sha256:93120516...` |
| 88 | Extinction de l'Âme | Extinction de l'Âme | high (Qhaysh) | 7 | Moitié de la Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | magic-missile | `sha256:3dd3eb21...` |
| 89 | Tempête | Tempête | high (Qhaysh) | 8 | Force Mentale mètres | ZdE 2 × Bonus de Force Mentale mètres | 1 Round | Contrat à effet calculable + Rappel | special | `sha256:d26a4c88...` |
| 90 | Chemin entre les Mondes | Chemin entre les Mondes | high (Qhaysh) | 7 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | 1 Round | Contrat à effet calculable + Rappel | special | `sha256:a8574de8...` |
| 91 | Forme bestiale | Beast Form | beasts (Ghur) | 5 | Vous | Vous | Endurance minutes | Contrat à effet calculable | transformation | `sha256:e2995c83...` |
| 92 | Incarnation de Wyssan | Wyssan’s Wildform | beasts (Ghur) | 8 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | stat-modifiers | `sha256:2794acdf...` |
| 93 | Vol du Destin | Flock of Doom | beasts (Ghur) | 8 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | special | `sha256:f880c927...` |
| 94 | Serres d’Ambre | Amber Talons | beasts (Ghur) | 3 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable | special | `sha256:8cd9a55f...` |
| 95 | Transe d’Ambre | Transe d’Ambre | beasts (Ghur) | 4 | Initiative mètres | 1 | Bonus de Force Mentale minutes | Contrat nécessitant des données MJ | special | `sha256:82a10dee...` |
| 96 | Éveil du Bois | Éveil du Bois | beasts (Ghur) | 8 | Force Mentale mètres | ZdE Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:87601d2b...` |
| 97 | Maître des Bêtes | Beast Master | beasts (Ghur) | 10 | Bonus de Volonté mètres | 1 créature Bestiale (taille P, M ou G) | Bonus de Force Mentale jours | Rappel | special | `sha256:7aa4b9ab...` |
| 98 | Langue des Bêtes | Beast Tongue | beasts (Ghur) | 3 | Vous | Vous | Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:124621ba...` |
| 99 | Bête Indomptée | Bête Indomptée | beasts (Ghur) | 4 | Contact | 1 | Instantané | Rappel | special | `sha256:417807fd...` |
| 100 | Malédiction d’Anraheir | Malédiction d’Anraheir | beasts (Ghur) | 5 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:0ee792e5...` |
| 101 | Yeux de la Meute | Yeux de la Meute | beasts (Ghur) | 3 | Contact | 1 | Force Mentale minutes | Rappel | narrative | `sha256:523e5e8e...` |
| 102 | Nuée Funeste | Flock of Doom | beasts (Ghur) | 8 | Volonté en mètres | ZdE (Bonus de Force Mentale) mètres | Bonus de Volonté rounds | Contrat à effet calculable + Rappel | special | `sha256:4b2e7087...` |
| 103 | Suivi de l'Odeur | Suivi de l'Odeur | beasts (Ghur) | 4 | Vous | Vous | Initiative minutes | Contrat à effet calculable | test-modifiers | `sha256:c9ece7c7...` |
| 104 | Peau du Chasseur | Hunter’s Hide | beasts (Ghur) | 6 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable | stat-modifiers | `sha256:1bd69f6f...` |
| 105 | Lunes du Chasseur | Lunes du Chasseur | beasts (Ghur) | 8 | Vous | ZdE Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable | stat-modifiers | `sha256:7af3f7b4...` |
| 106 | Régiment Monstrueux de Merciw | Régiment Monstrueux de Merciw | beasts (Ghur) | 13 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Rounds | Contrat à effet calculable + Rappel | stat-modifiers | `sha256:56ae2f36...` |
| 107 | Pulvérisation Musquée | Pulvérisation Musquée | beasts (Ghur) | 2 | Bonus de Force Mentale mètres | 1 | Instantané | Rappel | special | `sha256:dc9aa8c9...` |
| 108 | Passage Rapide | Passage Rapide | beasts (Ghur) | 4 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | stat-modifiers | `sha256:9f5081cc...` |
| 109 | Invocation de Monture | Invocation de Monture | beasts (Ghur) | 6 | Vous | Vous | Bonus de Force Mentale heures | Contrat nécessitant des données MJ | special | `sha256:3b21f8c9...` |
| 110 | Lance d'Ambre | The Amber Spear | beasts (Ghur) | 10 | (Force) mètres | 1 (maximum) | Instantané | Contrat nécessitant des données MJ | magic-missile | `sha256:a1a38bf7...` |
| 111 | Le Bœuf Reste Debout | Le Bœuf Reste Debout | beasts (Ghur) | 5 | Vous | ZdE Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable | special | `sha256:066b28e9...` |
| 112 | Transformation de Kadon | Transformation de Kadon | beasts (Ghur) | 14 | Vous ou Contact | Vous ou 1 (maximum) | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | transformation | `sha256:4586080c...` |
| 113 | Capuche Vengeresse | Capuche Vengeresse | beasts (Ghur) | 7 | Vous | Vous | 2 × Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:e1a88afd...` |
| 114 | Manteau d’Hiver | Manteau d’Hiver | beasts (Ghur) | 2 | Vous | Vous | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | stat-modifiers | `sha256:4f903cbb...` |
| 115 | Ver Grouillant | Ver Grouillant | beasts (Ghur) | 4 | Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:fd3c74bf...` |
| 116 | Forme Sauvage de Wyssan | Wyssan’s Wildform | beasts (Ghur) | 8 | Vous | Vous | Bonus de Volonté rounds | Contrat à effet calculable | stat-modifiers | `sha256:4c8a122b...` |
| 117 | Habitants d’en bas | Habitants d’en bas | life (Ghyran) | 13 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat nécessitant des données MJ | special | `sha256:b76c5446...` |
| 118 | Graisse de la Terre | Fare of the Land | life (Ghyran) | 4 | Contact | 1 | (Bonus de Force Mentale) jours | Rappel | narrative | `sha256:c3f9cc41...` |
| 119 | Cri de Guerre du Jardinier | Cri de Guerre du Jardinier | life (Ghyran) | 9 | Force Mentale mètres | ZdE Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | damage | `sha256:9cba944d...` |
| 120 | Don de Vie | Lifebloom | life (Ghyran) | 8 | (Bonus de Force Mentale) mètres | Spécial | Instantané | Rappel | special | `sha256:ea1d1b16...` |
| 121 | Almanach | Almanach | life (Ghyran) | 4 | Vous | Vous | 1 jour | Rappel | narrative | `sha256:b6091ab1...` |
| 122 | Écorce | Barkskin | life (Ghyran) | 3 | Contact | 1 | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | stat-modifiers | `sha256:e69ad4ad...` |
| 123 | Sang de la Terre | Earthblood | life (Ghyran) | 6 | Vous | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat nécessitant des données MJ | special | `sha256:98a1f7c8...` |
| 124 | Eau de la terre | Earthpool | life (Ghyran) | 7 | Force Mentale mètres | Vous | Instantané | Rappel | special | `sha256:647add57...` |
| 125 | Chair de Pierre | Chair de Pierre | life (Ghyran) | 9 | Bonus de Force Mentale mètres | 1 | Force Mentale minutes | Contrat nécessitant des données MJ | special | `sha256:f807c121...` |
| 126 | Forêt d’Épines | Forest of Thorns | life (Ghyran) | 6 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat nécessitant des données MJ | special | `sha256:6eb95876...` |
| 127 | Forme bestiale - Jade | Forme bestiale - Jade | life (Ghyran) | 5 | Vous | Vous | Endurance minutes | Contrat à effet calculable + Rappel (Suivi fiche) | transformation | `sha256:505a6fa5...` |
| 128 | Geyser | Geyser | life (Ghyran) | 8 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:3fce51e5...` |
| 129 | Chant vivifiant | Chant vivifiant | life (Ghyran) | 6 | 2 × Bonus de Sociabilité mètres | ZdE Bonus de Sociabilité mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | healing | `sha256:3edf0100...` |
| 130 | Cercueil de Jade | Cercueil de Jade | life (Ghyran) | 6 | Force Mentale mètres | 1 | Bonus de Force Mentale heures | Contrat nécessitant des données MJ | special | `sha256:37f27e93...` |
| 131 | Chute des feuilles | Chute des feuilles | life (Ghyran) | 6 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:ad78b45a...` |
| 132 | Traque des lignes telluriques | Traque des lignes telluriques | life (Ghyran) | 5 | Bonus d’Initiative miles | Vous | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | test-modifiers | `sha256:8e2e1e87...` |
| 133 | Relief du terrain | Lie of the Land | life (Ghyran) | 5 | (Bonus d’Initiative) milles | Vous | Spécial | Rappel | narrative | `sha256:e3b7236a...` |
| 134 | Floraison de vie | Lifebloom | life (Ghyran) | 8 | (Bonus de Force Mentale) mètres | Spécial | Instantané | Rappel | special | `sha256:98516d4c...` |
| 135 | Murmure de la Nature | Murmure de la Nature | life (Ghyran) | 8 | Vous | Vous | Bonus de Sociabilité minutes | Rappel | narrative | `sha256:20883f18...` |
| 136 | Sentier de Paranoth | Sentier de Paranoth | life (Ghyran) | 4 | ZdE Bonus de Force Mentale mètres | Vous | Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:810680b3...` |
| 137 | Régénération | Regenerate | life (Ghyran) | 6 | Contact | 1 | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel (Suivi fiche) | traits | `sha256:8e4730c8...` |
| 138 | Escalier en Spirale | Escalier en Spirale | life (Ghyran) | 6 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:661747e4...` |
| 139 | Transmogrification Exaltée de Colchis | Transmogrification Exaltée de Colchis | life (Ghyran) | 6 | Force Mentale mètres | ZdE Force Mentale mètres | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:5cd2902b...` |
| 140 | Apothéose Verdoyante | Apothéose Verdoyante | life (Ghyran) | 16 | Ligne de vue | ZdE Bonus de Force Mentale mètres | Instantané | Contrat nécessitant des données MJ | resurrection | `sha256:6834628e...` |
| 141 | Croissance Vitale | Croissance Vitale | life (Ghyran) | 7 | Bonus de Force Mentale mètres | 1 | Instantané | Rappel | narrative | `sha256:97587506...` |
| 142 | Forme de Bois | Forme de Bois | life (Ghyran) | 8 | Contact | 1 | Bonus de Force Mentale heures | Contrat nécessitant des données MJ | special | `sha256:2b00aded...` |
| 143 | Mains de Karkora | Mains de Karkora | light (Hysh) | 8 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:4ff45748...` |
| 144 | Protection de Phâ | Phâ’s Protection | light (Hysh) | 10 | Vous | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | special | `sha256:caee6d60...` |
| 145 | Crevasse | Crevasse | light (Hysh) | 8 | Force Mentale mètres | Spécial | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:0ba539fa...` |
| 146 | Pensée rapide | Speed of Thought | light (Hysh) | 8 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | stat-modifiers | `sha256:5a241117...` |
| 147 | Piège d'Abulla | Piège d'Abulla | light (Hysh) | 5 | Initiative mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:9f7225f7...` |
| 148 | Assaut de pierre | Assaut de pierre | light (Hysh) | 12 | Force Mentale mètres | Spécial | Instantané | Contrat à effet calculable + Rappel | damage | `sha256:e666a84a...` |
| 149 | Bannissement | Banishment | light (Hysh) | 12 | Vous | ZdE (Bonus de Force Mentale) mètres | Instantané | Contrat à effet calculable + Rappel | special | `sha256:351a9d44...` |
| 150 | Lumière aveuglante | Blinding Light | light (Hysh) | 5 | Vous | Vous | Instantané | Contrat à effet calculable | condition | `sha256:158fb36c...` |
| 151 | Clarté d’esprit | Clarity of Thought | light (Hysh) | 6 | Contact | 1 | (Intelligence) minutes | Contrat à effet calculable | special | `sha256:4564f4b5...` |
| 152 | Fléau des Démons | Daemonbane | light (Hysh) | 10 | (Bonus de Force Mentale) mètres | 1 Démon | Instantané | Contrat à effet calculable + Rappel | special | `sha256:5d72503e...` |
| 153 | Éclat éblouissant | Éclat éblouissant | light (Hysh) | 5 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | condition | `sha256:81330721...` |
| 154 | Volonté inébranlable | Volonté inébranlable | light (Hysh) | 4 | Contact | 1 | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | test-modifiers | `sha256:92626c83...` |
| 155 | Lumière guérisseuse | Healing Light | light (Hysh) | 8 | (Bonus de Force Mentale) mètres | 1 | Instantané | Contrat à effet calculable + Rappel | healing | `sha256:948405c8...` |
| 156 | Ériger l’édifice | Ériger l’édifice | light (Hysh) | 9 | Bonus de Force Mentale mètres | Spécial | Spécial | Rappel (Suivi fiche) | narrative | `sha256:69d196ed...` |
| 157 | Yeux de Volans | Yeux de Volans | light (Hysh) | 6 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | test-modifiers | `sha256:ca78b67b...` |
| 158 | Illuminer l’édifice | Illuminer l’édifice | light (Hysh) | 4 | Contact | 1 (maximum) | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | special | `sha256:fb68a140...` |
| 159 | Lumière de pureté | Lumière de pureté | light (Hysh) | 6 | Spécial | 1 (maximum) | Spécial | Contrat nécessitant des données MJ | special | `sha256:2919cf3b...` |
| 160 | Bibliothécaire instantané de Meissner | Bibliothécaire instantané de Meissner | light (Hysh) | 2 | ZdE Intelligence mètres | Vous | Instantané | Rappel | narrative | `sha256:39572eb8...` |
| 161 | Filet d’Amyntok | Net of Amyntok | light (Hysh) | 8 | (Bonus d’Intelligence) mètres | 1 | Bonus d’Intelligence Rounds | Contrat à effet calculable | special | `sha256:e9aaab7c...` |
| 162 | Orbe de Hysh | Orbe de Hysh | light (Hysh) | 5 | Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Rappel | narrative | `sha256:9d0a9f2f...` |
| 163 | Compréhension parfaite | Compréhension parfaite | light (Hysh) | 5 | Vous | Vous | Bonus de Force Mentale minutes | Rappel | narrative | `sha256:ca656829...` |
| 164 | Percer le Voile | Percer le Voile | light (Hysh) | 4 | Vous | Vous | Bonus de Force Mentale minutes | Rappel | special | `sha256:7b7a9ad9...` |
| 165 | Cape chatoyante | Cape chatoyante | light (Hysh) | 9 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:d72521e4...` |
| 166 | Vitesse de pensée | Speed of Thought | light (Hysh) | 8 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | stat-modifiers | `sha256:62ef12d1...` |
| 167 | Dérèglement temporel | Dérèglement temporel | light (Hysh) | 11 | Vous | ZdE Force Mentale mètres | Instantané | Rappel | special | `sha256:765d91a6...` |
| 168 | Enchantement Végétal (Ghyran & Chamon) | Enchantement Végétal (Ghyran & Chamon) | elven-arcane (Ghyran,Chamon) | 4 | Contact | 1 plante | Instantané | Rappel (Suivi fiche) | narrative | `sha256:f13cb96a...` |
| 169 | Bannissement Mineur (Hysh & Shyish) | Bannissement Mineur (Hysh & Shyish) | elven-arcane (Hysh,Shyish) | 4 | Force Mentale mètres | 1 | Instantané | Contrat nécessitant des données MJ | special | `sha256:1c677015...` |
| 170 | Alarme Magique (Azyr & Ulgu) | Alarme Magique (Azyr & Ulgu) | elven-arcane (Azyr,Ulgu) | 5 | Bonus de Force Mentale mètres | ZdE Bonus d’Initiative mètres | Bonus de Force Mentale heures | Rappel | narrative | `sha256:5ae309ce...` |
| 171 | Masque de l'Esprit (Shyish & Ulgu) | Masque de l'Esprit (Shyish & Ulgu) | elven-arcane (Shyish,Ulgu) | 4 | Vous | Vous | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | special | `sha256:502ac2ba...` |
| 172 | Purification du Corps (Ghyran & Hysh) | Purification du Corps (Ghyran & Hysh) | elven-arcane (Ghyran,Hysh) | 6 | Contact | 1 | Instantané | Contrat nécessitant des données MJ | special | `sha256:55f64ca3...` |
| 173 | Parler avec un Animal (Azyr & Ghur) | Parler avec un Animal (Azyr & Ghur) | elven-arcane (Azyr,Ghur) | 3 | Bonus de Force Mentale mètres | 1 animal | Intelligence minutes | Rappel | special | `sha256:c9ae83c1...` |
| 174 | Voix de Fer (Aqshy & Chamon) | Voix de Fer (Aqshy & Chamon) | elven-arcane (Aqshy,Chamon) | 4 | Vous | Vous | Sociabilité minutes | Contrat à effet calculable + Rappel | special | `sha256:ecd3212d...` |
| 175 | Zone de Confort (Aqshy & Ghur) | Zone de Confort (Aqshy & Ghur) | elven-arcane (Aqshy,Ghur) | 2 | Vous | Vous | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | special | `sha256:47a5bafe...` |
| 176 | Flèche Bénie | Flèche Bénie | elven-petty | 0 | Contact | 1 flèche | Bonus de Force Mentale Rounds | Rappel | narrative | `sha256:99c078c0...` |
| 177 | Calme | Calme | elven-petty | 0 | Contact | 1 | Instantané | Rappel | special | `sha256:8e08b378...` |
| 178 | Doigt Vert | Doigt Vert | elven-petty | 0 | Contact | ZdE Bonus de Force Mentale mètres | Instantané | Rappel | narrative | `sha256:9feeb371...` |
| 179 | Identifier une Maladie | Identifier une Maladie | elven-petty | 0 | Contact | 1 | Instantané | Rappel | narrative | `sha256:792b784a...` |
| 180 | Enlever la Saleté | Enlever la Saleté | elven-petty | 0 | Contact | 1 ou ZdE Bonus de Force Mentale mètres | Instantané | Rappel | special | `sha256:867406af...` |
| 181 | Révéler la Magie | Révéler la Magie | elven-petty | 0 | Vous | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Rappel | special | `sha256:8815c2d6...` |
| 182 | La Faux de Shyish | Scythe of Shyish | death (Shyish) | 6 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | special | `sha256:aa49733c...` |
| 183 | Acceptation du Destin | Acceptation du Destin | death (Shyish) | 6 | ZdE 2 × Bonus de Force Mentale mètres | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:f91b9ded...` |
| 184 | Amarante | Amarante | death (Shyish) | 7 | Vous | Vous | Bonus de Force Mentale minutes | Rappel | special | `sha256:9eb3a98f...` |
| 185 | Âme Emprisonnée | Âme Emprisonnée | death (Shyish) | 12 | Contact | 1 | Spécial | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:9956005a...` |
| 186 | Cendres et Poussière | Cendres et Poussière | death (Shyish) | 9 | Vortex aléatoire | ZdE 2 × Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:fa29457b...` |
| 187 | Caresse de Laniph | Caress of Laniph | death (Shyish) | 6 | Contact | 1 (maximum) | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | damage | `sha256:d98dcaed...` |
| 188 | Contrainte des Esprits | Contrainte des Esprits | death (Shyish) | 6 | Bonus de Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Jusqu’au lever du soleil | Contrat nécessitant des données MJ | special | `sha256:9b8c3e66...` |
| 189 | Labyrinthe de Cristal | Labyrinthe de Cristal | death (Shyish) | 13 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | special | `sha256:4308845e...` |
| 190 | Délivrance de la Mort | Délivrance de la Mort | death (Shyish) | 5 | Moitié de l’Initiative mètres | 1 | 3 Rounds | Contrat à effet calculable + Rappel | special | `sha256:2253d87c...` |
| 191 | Derniers Mots | Dying Words | death (Shyish) | 2 | Contact | 1 | (Bonus de Force Mentale) Rounds | Rappel | narrative | `sha256:74a8f9d2...` |
| 192 | Destin de Bjuna | Destin de Bjuna | death (Shyish) | 8 | Moitié de la Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Sociabilité Rounds | Contrat à effet calculable + Rappel | special | `sha256:c57c8e52...` |
| 193 | L’Étreinte d’Iyrtu | L’Étreinte d’Iyrtu | death (Shyish) | 4 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable | special | `sha256:eb51dab9...` |
| 194 | Flétrissement des Membres | Flétrissement des Membres | death (Shyish) | 5 | Force Mentale mètres | 1 | Bonus de Force Mentale minutes ou jours | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:6c276b42...` |
| 195 | Voile Pourpre de Shyish | Purple Pall of Shyish | death (Shyish) | 9 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | armor | `sha256:1edb8a99...` |
| 196 | Sanctifier | Sanctify | death (Shyish) | 10 | Contact | ZdE (Bonus de Force Mentale) mètres | (Force Mentale) minutes | Rappel | special | `sha256:f47eb876...` |
| 197 | Révélation de Shyish | Révélation de Shyish | death (Shyish) | 4 | ZdE Bonus de Force Mentale mètres | Vous | Bonus d’Initiative minutes | Rappel | narrative | `sha256:501c38fc...` |
| 198 | Vortex d’Âmes | Soul Vortex | death (Shyish) | 10 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | Instantané | Contrat à effet calculable | damage | `sha256:533234e3...` |
| 199 | Vitesse de Lykos | Vitesse de Lykos | death (Shyish) | 3 | Moitié de l’Initiative mètres | 1 | 1 Round | Rappel | special | `sha256:bb478870...` |
| 200 | Vol de Vie | Steal Life | death (Shyish) | 8 | (Force Mentale) mètres | 1 | Instantané | Contrat à effet calculable | damage | `sha256:016b0af2...` |
| 201 | Mort rapide | Swift Passing | death (Shyish) | 2 | Contact | Spécial | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:770e78a2...` |
| 202 | Goût de la Mort | Goût de la Mort | death (Shyish) | 7 | Moitié de la Force Mentale mètres | 1 + ZdE Spécial | Instantané | Contrat à effet calculable + Rappel | special | `sha256:306d17e0...` |
| 203 | Télépathie | Télépathie | death (Shyish) | 1 | 100 mètres | 1 | Instantané | Rappel | special | `sha256:0ff9bb3b...` |
| 204 | Marée des Âges | Marée des Âges | death (Shyish) | 3 | Bonus de Force Mentale mètres | 1 | Instantané | Contrat nécessitant des données MJ | special | `sha256:6f692476...` |
| 205 | Les Enfants Sauvages de Zandox | Les Enfants Sauvages de Zandox | death (Shyish) | 5 | Spécial | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable | summon | `sha256:a67ac2d1...` |
| 206 | Arme aethyrique | Aethyric Arms | arcane | 3 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:e4443d07...` |
| 207 | Armure aethyrique | Aethyric Armour | arcane | 2 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable | armor | `sha256:fa5d333c...` |
| 208 | Attaques en chaine | Chain Attack | arcane | 6 | (Force Mentale) métres | Spécial | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:75449864...` |
| 209 | Aura ordinaire | Mundane Aura | arcane | 4 | Vous | Vous | (Force Mentale) minutes | Contrat à effet calculable + Rappel | special | `sha256:b04df7c4...` |
| 210 | Bouclier anti-flèches | Arrow Shield | arcane | 3 | Vous | ZdE (Bonus de Force Mentale) mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:b5d42f97...` |
| 211 | Chute | Drop | arcane | 1 | (Force Mentale) mètres | 1 | Instantané | Contrat nécessitant des données MJ | special | `sha256:0e2de89e...` |
| 212 | Dôme | Dome | arcane | 7 | Vous | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | ward | `sha256:0be64639...` |
| 213 | Effrayant | Fearsome | arcane | 2 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | traits | `sha256:99a7c3c6...` |
| 214 | Envol | Flight | arcane | 8 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:04283ef3...` |
| 215 | Pont | Bridge | arcane | 4 | Force Mentale mètres | Spécial | Bonus de Force Mentale Rounds | Rappel | narrative | `sha256:47fd6a2d...` |
| 216 | Poussée | Push | arcane | 6 | Vous | ZdE (Bonus de Force Mentale) mètres maximum | Instantané | Contrat à effet calculable + Rappel | special | `sha256:a5403479...` |
| 217 | Protection | Ward | arcane | 6 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | ward | `sha256:b0b975bc...` |
| 218 | Souffle | Breath | arcane | 6 | Spécial | Spécial | Instantané | Contrat nécessitant des données MJ | special | `sha256:57c60763...` |
| 219 | Téléportation | Teleport | arcane | 3 | Vous | Vous | Instantané | Rappel | special | `sha256:9bf8cb72...` |
| 220 | Terrifiant | Terrifying | arcane | 6 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | traits | `sha256:80b03066...` |
| 221 | Enchevêtrement | Entangle | arcane | 3 | Bonus de Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable | condition | `sha256:544bc1a5...` |
| 222 | Perturbant | Distracting | arcane | 4 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | traits | `sha256:de07696b...` |
| 223 | Sang corrosif | Corrosive Blood | arcane | 2 | Vous | Vous | Bonus d’Endurance Rounds ou heures | Contrat à effet calculable + Rappel | special | `sha256:18911abb...` |
| 224 | Vision dans l’obscurité | Dark Vision | arcane | 1 | Vous | Vous | (Bonus d’Initiative) Rounds | Contrat à effet calculable | traits | `sha256:0421ce1a...` |
| 225 | Bouclier magique | Magic Shield | arcane | 4 | Vous | Vous | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | special | `sha256:1c20b31f...` |
| 226 | Carreau | Bolt | arcane | 4 | (Force Mentale) mètres | 1 | Instantané | Contrat à effet calculable | magic-missile | `sha256:060aa979...` |
| 227 | Explosion | Blast | arcane | 4 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | Instantané | Contrat à effet calculable | magic-missile | `sha256:58a4b6f1...` |
| 228 | Déplacement d’objet | Move Object | arcane | 4 | (Force Mentale) mètres | 1 | 1 Round | Contrat nécessitant des données MJ | special | `sha256:ccd984a4...` |
| 229 | Alerte | Warning | petty | 0 | 1 mètre | 1 Objet | Instantané | Rappel | narrative | `sha256:6a73d81c...` |
| 230 | Amitié animale | Animal Friend | petty | 0 | 1 mètre | 1 | 1 heure | Contrat nécessitant des données MJ | special | `sha256:8e6a42bb...` |
| 231 | Bruits | Sounds | petty | 0 | (Force Mentale) mètres | Spécial | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | special | `sha256:905e2258...` |
| 232 | Choc | Shock | petty | 0 | Contact | 1 | Instantané | Contrat à effet calculable | condition | `sha256:8bf0505b...` |
| 233 | Conservation | Conserve | petty | 0 | 1 mètre | Spécial | (Bonus de Force Mentale) jours | Rappel | narrative | `sha256:f13f0caa...` |
| 234 | Coup de vent | Gust | petty | 0 | (Force Mentale) mètres | Spécial | Instantané | Rappel | narrative | `sha256:fa0e6235...` |
| 235 | Créer un petit animal | Produce Small Animal | petty | 0 | Contact | Spécial | Instantané | Rappel (Suivi fiche) | narrative | `sha256:0e2e1e61...` |
| 236 | Drain | Drain | petty | 0 | Contact | 1 | Instantané | Contrat à effet calculable | magic-missile | `sha256:7997fb3c...` |
| 237 | Éblouissant | Dazzle | petty | 0 | Contact | 1 | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | condition | `sha256:33d6ba4d...` |
| 238 | En catimini | Sly Hands | petty | 0 | Vous | Vous | Instantané | Rappel | special | `sha256:d2053b0a...` |
| 239 | Feux follets | Marsh Lights | petty | 0 | (Force Mentale) mètres | Spécial | (Force Mentale) minutes | Contrat à effet calculable + Rappel | special | `sha256:1377cf82...` |
| 240 | Flamme magique | Magic Flame | petty | 0 | Vous | Vous | (Bonus de Force Mentale) Rounds | Rappel | special | `sha256:cef4a596...` |
| 241 | Fléchette | Dart | petty | 0 | (Force Mentale) mètres | 1 | Instantané | Contrat à effet calculable | magic-missile | `sha256:ef014747...` |
| 242 | Lumière | Light | petty | 0 | Vous | Vous | (Force Mentale) minutes | Contrat à effet calculable | special | `sha256:af4ce67e...` |
| 243 | Pas léger | Careful Step | petty | 0 | Vous | Vous | (Agilité) minutes | Rappel | special | `sha256:fc3c5923...` |
| 244 | Protection contre la pluie | Protection from Rain | petty | 0 | Vous | Vous | (Bonus de Force Mentale) heures | Rappel | narrative | `sha256:a3613f42...` |
| 245 | Purification de l'eau | Purify Water | petty | 0 | 1 mètre | Spécial | Instantané | Rappel | narrative | `sha256:51310414...` |
| 246 | Repères | Bearings | petty | 0 | Vous | Vous | Instantané | Rappel | narrative | `sha256:858e2dee...` |
| 247 | Secousse | Twitch | petty | 0 | Moitié de la Force Mentale mètres | 1 | Instantané | Contrat nécessitant des données MJ | special | `sha256:c927f283...` |
| 248 | Serrure ouverte | Open Lock | petty | 0 | Contact | 1 | Instantané | Rappel | narrative | `sha256:86d91f62...` |
| 249 | Source | Spring | petty | 0 | Contact | Spécial | (Bonus de Force Mentale) Rounds | Rappel | special | `sha256:7ed35356...` |
| 250 | Sommeil | Sleep | petty | 0 | Contact | 1 | (Bonus de Force Mentale) Rounds | Contrat nécessitant des données MJ | condition | `sha256:92adc345...` |
| 251 | Murmures | Murmured Whisper | petty | 0 | (Force Mentale) mètres | Spécial | (Bonus de Force Mentale) Rounds | Rappel | narrative | `sha256:91e6aa53...` |
| 252 | Tendre l'oreille | Eavesdrop | petty | 0 | (Initiative) mètres | 1 | (Bonus de Force Mentale) minutes | Rappel | special | `sha256:1eaa2e3f...` |
| 253 | Putréfaction | Rot | petty | 0 | 1 mètre | Spécial | Instantané | Contrat nécessitant des données MJ | special | `sha256:72f8e2fe...` |
| 254 | Danse du Désespoir | Danse du Désespoir | shadow (Ulgu) | 13 | ZdE Force Mentale mètres | Vous | Bonus de Force Mentale Rounds | Rappel | special | `sha256:f6454963...` |
| 255 | Portail d’Ombre | Shadowstep | shadow (Ulgu) | 8 | (Force Mentale) mètres | Vous | Instantané | Contrat à effet calculable | special | `sha256:5ae54cfc...` |
| 256 | Égarer | Égarer | shadow (Ulgu) | 5 | Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:5020e563...` |
| 257 | Horreurs Noires | Horreurs Noires | shadow (Ulgu) | 6 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale heures | Rappel | narrative | `sha256:7766610a...` |
| 258 | Pont d’Ombres | Pont d’Ombres | shadow (Ulgu) | 6 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | 1 Round | Rappel | special | `sha256:f0be0bba...` |
| 259 | Ombres Étrangleuses | Choking Shadows | shadow (Ulgu) | 6 | (Bonus de Force Mentale) mètres | 1 | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | condition | `sha256:feb98536...` |
| 260 | Poches Profondes | Poches Profondes | shadow (Ulgu) | 5 | Contact | Spécial | Bonus de Force Mentale heures | Rappel (Suivi fiche) | narrative | `sha256:92265b8e...` |
| 261 | Doppelgänger | Doppelganger | shadow (Ulgu) | 10 | Vous | Vous | (Bonus d’Intelligence) minutes | Contrat nécessitant des données MJ | special | `sha256:03ba5a95...` |
| 262 | Grande Illusion | Grande Illusion | shadow (Ulgu) | 14 | Force Mentale mètres | ZdE Bonus d’Initiative mètres | Force Mentale minutes | Rappel | narrative | `sha256:8fd847fb...` |
| 263 | Ailes Grises | Ailes Grises | shadow (Ulgu) | 6 | Force Mentale mètres | 1 (maximum) | Instantané | Contrat nécessitant des données MJ | special | `sha256:20722cbb...` |
| 264 | Cor du Andar | Cor du Andar | shadow (Ulgu) | 5 | ZdE Sociabilité mètres | Vous | Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:93568fa7...` |
| 265 | Silence | Silence | shadow (Ulgu) | 3 | Force Mentale mètres | 1 avec ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale minutes | Rappel | special | `sha256:f4b18214...` |
| 266 | Illusion | Illusion | shadow (Ulgu) | 8 | (Force Mentale) mètres | ZdE (Bonus d’Intelligence) mètres | (Intelligence) minutes | Contrat à effet calculable + Rappel | special | `sha256:2b4cfb5e...` |
| 267 | Effacement d’esprit | Mindslip | shadow (Ulgu) | 6 | 1 mètre | 1 | (Intelligence) minutes | Rappel (Suivi fiche) | special | `sha256:bff66367...` |
| 268 | Visage mutable | Visage mutable | shadow (Ulgu) | 4 | Contact | 1 | Bonus de Force Mentale heures | Contrat nécessitant des données MJ | special | `sha256:c94a0dac...` |
| 269 | Miasme mystifiant | Mystifying Miasma | shadow (Ulgu) | 6 | (Force Mentale) mètres | ZdE (Bonus de Force Mentale) mètres | (Bonus de Force Mentale) Rounds | Contrat à effet calculable | condition | `sha256:1a95b24c...` |
| 270 | Gouffre de Tarnus | Gouffre de Tarnus | shadow (Ulgu) | 8 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Rappel | special | `sha256:5b7b796c...` |
| 271 | Illusion rétroactive de Ribauld | Illusion rétroactive de Ribauld | shadow (Ulgu) | 11 | Force Mentale mètres | Spécial | Instantané | Rappel | narrative | `sha256:4a2b8e70...` |
| 272 | Bosquet d’ombres | Bosquet d’ombres | shadow (Ulgu) | 5 | Force Mentale mètres | ZdE Initiative mètres | Bonus de Force Mentale heures | Rappel | narrative | `sha256:fcd929cb...` |
| 273 | Destrier d’Ombre | Shadowsteed | shadow (Ulgu) | 6 | (Bonus de Force Mentale) mètres | 1 (maximum) | Jusqu’au prochain lever du soleil | Contrat nécessitant des données MJ | summon | `sha256:a37aad7d...` |
| 274 | Pas d’Ombre | Shadowstep | shadow (Ulgu) | 8 | (Force Mentale) mètres | Vous | Instantané | Contrat à effet calculable | special | `sha256:e0cc7ec4...` |
| 275 | Linceul d’Invisibilité | Shroud of Invisibility | shadow (Ulgu) | 8 | Contact | 1 | (Bonus de Force Mentale) Rounds | Contrat à effet calculable + Rappel | special | `sha256:82bf4336...` |
| 276 | Substance d’Ombre | Substance d’Ombre | shadow (Ulgu) | 9 | Contact | 1 | Spécial | Contrat à effet calculable + Rappel | special | `sha256:f6efe6fb...` |
| 277 | Traître de Tarn | Traître de Tarn | shadow (Ulgu) | 12 | Force Mentale mètres | 1 | Force Mentale minutes | Contrat nécessitant des données MJ | special | `sha256:387f49c6...` |
| 278 | Ombre Vagabonde | Ombre Vagabonde | shadow (Ulgu) | 4 | Vous | Vous | Bonus de Force Mentale minutes | Rappel | narrative | `sha256:8b0146ea...` |
| T | Bonne Volonté | Goodwill | hedgecraft | 0 | Vous | ZdE Bonus de Sociabilité mètres | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | test-modifiers | `sha256:0798270b...` |
| T | Joie de Halãtha | Halãtha’s Joy | hedgecraft | 0 | Toucher | 1 | Bonus de Sociabilité heures | Rappel | narrative | `sha256:7101515c...` |
| T | Chevaucher l’Obscurité | Mirkride | hedgecraft | 0 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | traits | `sha256:a65cf45b...` |
| T | Nepenthés | Nepenthe | hedgecraft | 0 | Toucher | Spécial | Bonus de Force Mentale heures | Rappel | narrative | `sha256:e6ddc5e3...` |
| T | Panacée | Nostrum | hedgecraft | 0 | Toucher | Spécial | Bonus de Dextérité heures | Contrat à effet calculable + Rappel | healing | `sha256:a84c2a41...` |
| T | Séparer les branches | Part the Branches | hedgecraft | 0 | Vous | Vous | Initiative minutes | Rappel | narrative | `sha256:acb9506c...` |
| T | Charme protecteur | Protective Charm | hedgecraft | 0 | Toucher | Spécial | Bonus de Force Mentale jours | Rappel | special | `sha256:e0e55eac...` |
| T | Œil du berger | Shepherd’s Eye | hedgecraft | 0 | Spécial | Spécial | Instantané | Rappel | narrative | `sha256:81f21997...` |
| T | Dague de l’Art | Dagger of the Art | hedgecraft | 4 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:c1385261...` |
| T | Borne sinistre | Fellstave | hedgecraft | 9 | Spécial | Spécial | 1 mois | Rappel | narrative | `sha256:196bffd5...` |
| T | Revigorer | Invigorate | hedgecraft | 2 | Toucher | 1 | Bonus de Force Mentale Rounds | Rappel | special | `sha256:94eb07d3...` |
| T | Philtre d’amour | Lovelock | hedgecraft | 10 | Toucher | Spécial | Jusqu’à minuit | Contrat nécessitant des données MJ | narrative | `sha256:4a5262e6...` |
| T | Sachet de protection | Protection Pouch | hedgecraft | 5 | Toucher | Spécial | 1 semaine + 1 semaine par DR | Contrat nécessitant des données MJ | special | `sha256:614bb50e...` |
| T | Pas imperceptible | Sightstep | hedgecraft | 7 | Vous | Vous | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | special | `sha256:eb2ec1b9...` |
| T | Marée d’argent | Silvertide | hedgecraft | 4 | Vous | Vous | 1d10 heures | Rappel | narrative | `sha256:fb84035f...` |
| T | L’Expulsion | The Ousting | hedgecraft | 8 | Bonus de Force Mentale mètres | 1 | 1d10 ans | Contrat nécessitant des données MJ | damage | `sha256:5fac26e7...` |
| T | Protection contre le wyrd | Wyrd Ward | hedgecraft | 4 | Toucher | 1 | Bonus de Force Mentale heures | Contrat nécessitant des données MJ | special | `sha256:cd71c55a...` |
| T | Dégradation | Blight | witchcraft | 14 | Bonus de Force Mentale mètres | Spécial | Instantané | Rappel | narrative | `sha256:40461767...` |
| T | Menace rampante | Creeping Menace | witchcraft | 6 | Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Rappel | special | `sha256:4c14ba14...` |
| T | Malédiction de douleur paralysante | Curse of Crippling Pain | witchcraft | 10 | Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:a2bc664d...` |
| T | Malédiction de malchance | Curse of Ill Fortune | witchcraft | 8 | Force Mentale mètres | 1 | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | test-modifiers | `sha256:e8f1ba36...` |
| T | Glamour | Glamour | witchcraft | 4 | Toucher | 1 adulte | Bonus de Force Mentale heures | Rappel | narrative | `sha256:f02bc6f2...` |
| T | Horreur hantante | Haunting Horror | witchcraft | 8 | Toucher | Spécial | Force Mentale jours | Contrat à effet calculable + Rappel | special | `sha256:330e72de...` |
| T | Bonne santé | Make Hale | witchcraft | 4 | Toucher | 1 | Instantané | Contrat à effet calculable + Rappel | healing | `sha256:e6d41bb9...` |
| T | Mauvais œil | The Evil Eye | witchcraft | 6 | 10 mètres maximum | 1 maximum | Instantané | Contrat à effet calculable + Rappel | special | `sha256:145a8cb4...` |
| T | Destruction de Démon Mineur | Destroy Lesser Daemon | daemonology | 6 | Bonus de Force Mentale mètres | 1 Démon de taille Moyenne ou inférieure | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | special | `sha256:9f9b926d...` |
| T | Détection de démon | Detect Daemon | daemonology | 4 | Force Mentale mètres | Spécial | Instantané | Rappel | narrative | `sha256:b9e5d9c0...` |
| T | Manifestation de Démon Mineur | Manifest Lesser Daemon | daemonology | 8 | Bonus de Force Mentale mètres | Spécial | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | summon | `sha256:1b58a01b...` |
| T | Octogramme | Octagram | daemonology | 10 | Toucher | ZdE Bonus d’Intelligence mètres | Force Mentale minutes | Rappel | special | `sha256:a4507a4b...` |
| T | Relever les morts | Raise Dead | necromancy | 7 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Jusqu’au lever du soleil | Contrat nécessitant des données MJ | summon | `sha256:70bd718f...` |
| T | Réanimation | Reanimate | necromancy | 8 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Jusqu’au lever du soleil | Contrat nécessitant des données MJ | summon | `sha256:884123be...` |
| T | Crâne hurlant | Screaming Skull | necromancy | 8 | Force Mentale mètres | Spécial | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:5adcf48d...` |
| T | L’appel de Vanhel | Vanhel’s Call | necromancy | 6 | Force Mentale mètres | Spécial | Instantané | Rappel | special | `sha256:ca36f533...` |
| T | Inflammation suppurée | Festering Inflammation | nurgle | 5 | Bonus de Force Mentale mètres | 1 | Instantané | Rappel | narrative | `sha256:0d6213ee...` |
| T | Miasme de pestilence | Miasma of Pestilence | nurgle | 6 | Vous | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Rappel | special | `sha256:1f5d14ad...` |
| T | Flot de Corruption | Stream of Corruption | nurgle | 9 | Spécial | Spécial | Instantané | Contrat à effet calculable + Rappel | damage | `sha256:bd29f15a...` |
| T | Consentement | Acquiescence | slaanesh | 5 | Toucher | 1 | Bonus de Force Mentale Rounds | Rappel | special | `sha256:01cdb8f0...` |
| T | De la douleur le plaisir | From Pain, Pleasure | slaanesh | 6 | Toucher | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | traits | `sha256:ff49c977...` |
| T | Fantasmagorie | Phantasmagoria | slaanesh | 8 | Vous | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | traits | `sha256:40b25672...` |
| T | Don de Tzeentch | Boon of Tzeentch | tzeentch | 9 | Vous | Vous | Bonus d’Intelligence jours | Contrat nécessitant des données MJ | special | `sha256:94125571...` |
| T | Transformation de Tzeentch | Transformation of Tzeentch | tzeentch | 12 | Bonus de Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:8255fb0a...` |
| T | Trahison de Tzeentch | Treason of Tzeentch | tzeentch | 6 | Force Mentale mètres | ZdE Bonus d’Initiative mètres | Bonus d’Intelligence Rounds | Contrat à effet calculable + Rappel | traits | `sha256:e9afe583...` |
| T | Brise-os | Bonecrusher | maw | 5 | Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:f658248c...` |
| T | Gloutonneur | Bullgorger | maw | 5 | Bonus de Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:0fd58c7d...` |
| T | Dévore-cervelle | Braingobbler | maw | 5 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | traits | `sha256:d0590d72...` |
| T | Saveur de la mort | Taste Death | maw | 2 | Vous | Vous | Instantané | Rappel | narrative | `sha256:81962368...` |
| T | Tripes de troll | Trollguts | maw | 6 | Bonus d’Endurance mètres | 1 | Bonus d’Endurance Rounds | Contrat à effet calculable + Rappel | traits | `sha256:041124e1...` |
| T | La Gueule | The Maw | maw | 11 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | damage | `sha256:576b842d...` |
| T | Festin des tombés | Feast of the Fallen | maw | 9 | Vous | Spécial | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | traits | `sha256:95e4abb5...` |
| T | Brasse-bile | Bilebrew | maw | 6 | Vous | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat nécessitant des données MJ | traits | `sha256:c543715a...` |
| T | Bouillie de sang | Bloodgruel | maw | 5 | Vous | Vous | Instantané | Contrat nécessitant des données MJ | healing | `sha256:1c43cd8d...` |
| T | Du cœur au ventre | Get Some Guts | maw | 6 | Vous | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Rappel | special | `sha256:e2aca3a2...` |
| T | Brise-dents | Toothcracker | maw | 8 | Vous | ZdE Force Mentale mètres | Bonus de Force Mentale Rounds | Rappel | test-modifiers | `sha256:9966f967...` |
| T | Du calme ! | Behave! | little-waaagh | 2 | Force Mentale mètres | 1 (maximum) | Bonus de Force Mentale minutes | Rappel | narrative | `sha256:6b50d0ec...` |
| T | Mots malins | Cunnin’ Words | little-waaagh | 0 | Force Mentale mètres | 1 | Bonus de Force Mentale minutes | Rappel | narrative | `sha256:54f7a597...` |
| T | Malédiction de la Mauvaise Lune | Curse of Da Bad Moon | little-waaagh | 9 | Bonus de Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:7ad7b6a3...` |
| T | Don du Dieu-Araignée | Gift of the Spider-God | little-waaagh | 3 | Vous | ZdE Bonus de Force Mentale mètres (Gobelins des forêts) | Bonus de Force Mentale Rounds | Rappel | traits | `sha256:b6505bf4...` |
| T | Gork va arranger ça | Gork’ll Fix It | little-waaagh | 5 | Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:85522b1d...` |
| T | La Grande Rancune verte | The Great Green Spite | little-waaagh | 20 | Bonus de Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Rappel | special | `sha256:0bd5d99b...` |
| T | Démangeaison | Itchy Nuisance | little-waaagh | 4 | Bonus de Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | test-modifiers | `sha256:f55a74b9...` |
| T | Mork te veut ! | Mork Wants Ya! | little-waaagh | 9 | Bonus de Force Mentale mètres | 1 | Instantané | Contrat nécessitant des données MJ | damage | `sha256:e04bc269...` |
| T | Voile de la nuit | Night Shroud | little-waaagh | 5 | Bonus de Force mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | condition | `sha256:0dd838ee...` |
| T | Chapardeur | Nikkit! | little-waaagh | 3 | Force Mentale mètres | 1 | Instantané | Rappel | narrative | `sha256:15717f16...` |
| T | Coups en traître | Sneaky Stabbin’ | little-waaagh | 8 | Vous | ZdE Bonus de Force Mentale mètres (Orques et Gobelins) | Bonus de Force Mentale Rounds | Rappel | special | `sha256:6b41c389...` |
| T | Regard vengeur | Vindictive Glare | little-waaagh | 7 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:1b13cac0...` |
| T | Dur comme le roc | ‘Ard as Nails | big-waaagh | 3 | Bonus de Force Mentale mètres | 1 | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:e53aaab7...` |
| T | Frappez-les, les gars ! | Bash ‘Em Lads! | big-waaagh | 6 | Bonus de Force Mentale mètres | Spécial | Instantané | Rappel | special | `sha256:231deefc...` |
| T | Éclate-cervelle | Brainbursta | big-waaagh | 5 | Bonus de Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel | condition | `sha256:71e28f58...` |
| T | Coup de boule | ‘Eadbutt | big-waaagh | 6 | Bonus de Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:ca5dfde1...` |
| T | Allons-y ! | ‘Ere We Go! | big-waaagh | 7 | Vous | ZdE Bonus de Force Mentale mètres (Orques) | Bonus de Force Mentale Rounds | Rappel | special | `sha256:8383a3c1...` |
| T | Le Soleil mauvais | The Evil Sun | big-waaagh | 12 | Bonus de Force Mentale mètres | ZdE Force Mentale mètres | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:33db67a3...` |
| T | Poings de Gork | Fists of Gork | big-waaagh | 2 | Vous | Vous | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | special | `sha256:42718981...` |
| T | Pied de Gork | Foot of Gork | big-waaagh | 10 | Bonus de Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | damage | `sha256:547a99ed...` |
| T | Regard de Mork | Gaze of Mork | big-waaagh | 5 | Force Mentale mètres | Spécial | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:51b0e783...` |
| T | La Main de Gork | The Hand of Gork | big-waaagh | 9 | Force Mentale mètres | Spécial | Bonus de Force Mentale Rounds | Rappel | narrative | `sha256:bd49d729...` |
| T | Mork nous protège ! | Mork Save Us! | big-waaagh | 8 | Bonus de Force Mentale mètres | Spécial | Bonus de Force Mentale Rounds | Rappel | special | `sha256:3ee73e2b...` |
| T | WAAAGH ! | WAAAGH! | big-waaagh | 12 | Vous | ZdE Force Mentale mètres (tous les Orques, Gobelins et assimilés, alliés ou non) | Bonus de Force Mentale Rounds | Rappel | special | `sha256:215590f5...` |
| T | Déracinement des montagnes | Uproot the Mountains | high | 8 | Ligne de vue | 1 | 1 Round | Contrat à effet calculable + Rappel | special | `sha256:4be723cb...` |
| T | Ligne de terre | Earth Line | high | 10 | Ligne de vue | Spécial | Instantané | Contrat nécessitant des données MJ | damage | `sha256:10cc906a...` |
| T | Ruine des cités | Ruination of Cities | high | 12 | Ligne de vue | 1 bâtiment | Instantané | Contrat à effet calculable + Rappel | damage | `sha256:52fab9ed...` |
| T | Déflagration mentale | Mental Blast | high | 7 | Ligne de vue | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel | damage | `sha256:08746f6e...` |
| T | Apothéose (Slann) | Apotheosis (Slann) | high (Qhaysh) | 4 | Moitié de la Force Mentale mètres | 1 | 1 Round | Contrat à effet calculable + Rappel (Suivi fiche) | healing | `sha256:35524476...` |
| T | Destruction des Arcanes (Slann) | Arcane Unforging (Slann) | high (Qhaysh) | 9 | Force Mentale mètres | 1 | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:f6acf215...` |
| T | Drain de Magie (Slann) | Drain Magic (Slann) | high (Qhaysh) | 6 | Moitié de la Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Instantané | Contrat à effet calculable + Rappel (Suivi fiche) | special | `sha256:28f461d6...` |
| T | Chemin entre les Mondes (Slann) | Walk Between Worlds (Slann) | high (Qhaysh) | 7 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | 1 Round | Contrat à effet calculable + Rappel | special | `sha256:7bf0095e...` |
| T | Toucher de l’artiste | Artist’s Touch | vaul | 0 | Toucher | 1 objet | Instantané | Rappel | narrative | `sha256:3d77f5c4...` |
| T | Patience de Vaul | Patience of Vaul | vaul | 0 | Toucher | 1 objet | Instantané | Rappel | narrative | `sha256:9e3963c6...` |
| T | Grâce de Vaul | Vaul’s Grace | vaul | 7 | Toucher | 1 objet | Instantané | Rappel | narrative | `sha256:e7ef9da0...` |
| T | Rage de Vaul | Vaul’s Rage | vaul | 5 | Bonus de Force Mentale mètres | 1 forge ou feu de camp (maximum) | Instantané | Contrat à effet calculable + Rappel | magic-missile | `sha256:bf7d468a...` |
| T | Divination des flammes | Divination of Flames | vaul | 4 | Bonus d’Initiative mètres (maximum) | 1 forge ou feu de camp (maximum) | Bonus d’Intelligence heures | Rappel | narrative | `sha256:17d21d49...` |
| T | Divination des pierres | Divination of Stones | vaul | 6 | Bonus d’Intelligence miles | Spécial | Bonus d’Intelligence heures | Rappel | narrative | `sha256:43c675b1...` |
| T | Feux de la perfection | Fires of Perfection | vaul | 9 | Toucher | 1 objet | Instantané | Rappel | narrative | `sha256:8a12360d...` |
| T | Sagesse de l’acier du ciel | Wisdom of the Skysteel | vaul | 11 | Toucher | 1 objet | 1 Entreprise | Rappel | narrative | `sha256:aa960078...` |
| T | Forteresse de Hotek | Fortress of Hotek | vaul | 14 | Bonus de Force Mentale mètres | 1 salle de forge ou bâtiment (maximum) | Bonus de Force Mentale heures | Rappel | narrative | `sha256:d4605898...` |
| T | Lien aux poissons | Fishbonding | mathlann | 0 | Force Mentale mètres | 1 | Force Mentale minutes | Rappel | narrative | `sha256:59ced06b...` |
| T | Sens de la tempête | Stormsense | mathlann | 0 | Initiative miles | Spécial | Instantané | Rappel | narrative | `sha256:9957cc2b...` |
| T | Furie de l’océan | Ocean’s Fury | mathlann | 8 | Vous | ZdE Bonus de Force Mentale miles | 3 × Bonus de Force Mentale minutes | Rappel | narrative | `sha256:3a48e8fc...` |
| T | Esprits des vagues | Spirits of the Waves | mathlann | 5 | 2 × Sociabilité mètres | ZdE 2 × Bonus de Sociabilité mètres | Bonus de Sociabilité minutes | Rappel | narrative | `sha256:4805c9ef...` |
| T | Armure de Mathlann | Armour of Mathlann | mathlann | 10 | Force Mentale mètres | 1 bateau ou navire | Force Mentale minutes | Contrat à effet calculable + Rappel | narrative | `sha256:4df4bf91...` |
| T | Appel des mers | Call of the Seas | mathlann | 14 | Force Mentale mètres | Spécial | Bonus de Force Mentale Rounds | Contrat à effet calculable + Rappel | narrative | `sha256:aed9dbf4...` |
| T | Manteau de Mathlann | Cloak of Mathlann | mathlann | 11 | Force Mentale mètres | 1 bateau ou navire | Force Mentale minutes | Contrat à effet calculable + Rappel | narrative | `sha256:76783bf7...` |
| T | Maîtresse des profondeurs | Mistress of the Deep | mathlann | 9 | Sociabilité mètres | Spécial | Bonus de Sociabilité Rounds | Contrat à effet calculable + Rappel | narrative | `sha256:eb9cecf4...` |
| T | Poumons d’eau | Waterlungs | mathlann | 7 | Force Mentale mètres | 1 | Bonus de Force Mentale heures | Contrat à effet calculable + Rappel | special | `sha256:5171a35d...` |
| T | Brumes grouillantes | Writhing Mists | mathlann | 6 | Force Mentale mètres | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | test-modifiers | `sha256:34b3c8f6...` |
| T | Calame divin | Divine Stylus | hoeth | 0 | Vous | Vous | Bonus de Force Mentale minutes | Rappel | narrative | `sha256:2e9216cf...` |
| T | Illumination | Enlightenment | hoeth | 0 | Bonus de Force Mentale mètres | 1 animal | Bonus d’Intelligence minutes | Contrat à effet calculable + Rappel | special | `sha256:0ceee05d...` |
| T | Aperçu arcanique | Arcane Insight | hoeth | 8 | Toucher | 1 objet | Instantané | Rappel | narrative | `sha256:42bea8c4...` |
| T | Grand lien spirituel | Greater Spirit Bond | hoeth | 4 | Vous | Spécial | Bonus de Force Mentale minutes | Rappel | narrative | `sha256:eb518465...` |
| T | Creuset de lumière | Crucible of Light | hoeth | 6 | Toucher | 1 épée | Bonus d’Intelligence minutes | Rappel | narrative | `sha256:f2f0262e...` |
| T | Maîtrise mnémonique | Mnemonic Control | hoeth | 6 | Bonus de Force Mentale mètres | 1 | Instantané | Rappel | narrative | `sha256:13bf9cab...` |
| T | Envoi psychique | Psychic Sending | hoeth | 7 | Force Mentale miles | 1 | Instantané | Rappel | narrative | `sha256:8ea13f02...` |
| T | Façonnage d’âme | Soulcraft | hoeth | 10 | Bonus de Force Mentale mètres | 1 Fantôme | Instantané | Rappel | narrative | `sha256:bd8b5521...` |
| T | Sceaux sacrés | Sacred Wards | hoeth | 11 | Toucher | ZdE Bonus d’Intelligence mètres | Bonus d’Intelligence heures | Rappel | special | `sha256:14a6b52e...` |
| T | Les Mots premiers | The Primary Words | hoeth | 15 | Vous | Vous | Bonus d’Intelligence heures | Rappel | narrative | `sha256:f5c37787...` |
| T | Belligérance du Marais de sang | Belligerence of the Bloodmarsh | arcane | 2 | Bonus de Force Mentale mètres | 1 Bête des fens (n’importe laquelle) | Instantané | Rappel | traits | `sha256:83e131bb...` |
| T | Effondrement d’un construit | Collapse Construct | arcane | 6 | Bonus de Force Mentale mètres | 1 Construit (n’importe lequel) | Instantané | Contrat nécessitant des données MJ | special | `sha256:d9f715a8...` |
| T | Déchiffrer la malédiction | Decipher Curse | arcane | 4 | Force Mentale mètres | Tout objet | Instantané | Rappel | narrative | `sha256:630a222e...` |
| T | Perturber la magie | Disrupt Magic | arcane | 8 | Force Mentale mètres | 1 | Instantané | Contrat nécessitant des données MJ | special | `sha256:6edc90f9...` |
| T | Pourriture grouillante de mouches | Fly-Infested Rotweed | arcane | 4 | Bonus de Force Mentale mètres | 1 Bête des fens (n’importe laquelle) | Bonus de Force Mentale minutes | Rappel | traits | `sha256:8c2cd732...` |
| T | Limon de vie | Lifebloom Silt | arcane | 4 | Bonus de Force Mentale mètres | 1 Bête des fens (n’importe laquelle) | Bonus de Force Mentale minutes | Rappel | special | `sha256:e67227db...` |
| T | Silence (Arcane) | Silence (Arcane) | arcane | 4 | Vous | ZdE Bonus de Force Mentale mètres | Bonus de Force Mentale minutes | Contrat à effet calculable + Rappel | test-modifiers | `sha256:29a6c490...` |
| T | Secours au serviteur magique | Succour Magical Servant | arcane | 2 | Bonus de Force Mentale mètres | Un de vos Constructs ou Familiers | Instantané | Contrat à effet calculable + Rappel | healing | `sha256:335c6a18...` |
| T | Voile de brouillard | Shroud of Fog | arcane | 8 | Vous | ZdE Bonus de Force Mentale miles | Force Mentale minutes | Rappel | narrative | `sha256:982d0796...` |

## Options de surpuissance propres aux sorts

Options « +N DR » et « pour chaque +N DR » des descriptions (V5 p. 236 : « Spells may have additional options in their descriptions »). 46 calculées, 99 rappelées au MJ avec leur valeur chiffrée ; aucune n'est « calculée » sans exécution.

| Sort | Option | Coût | Statut |
|---|---|---|---|
| Flamme Captivante | Feu moyen, deux observateurs aléatoires | 2 DR | Rappel chiffré (non calculée) |
| Flamme Captivante | Grand feu, tous les observateurs | 4 DR | Rappel chiffré (non calculée) |
| Colérique | Animosité, BFM jours | 4 DR | Calculée (exécutée par la sonde) |
| Colérique | Haine, BFM semaines | 8 DR | Calculée (exécutée par la sonde) |
| Couronne de Flamme | Peur +1 pour chaque +2 DR | 2 DR par palier | Calculée (exécutée par la sonde) |
| Tempête de Flammes | Diamètre +1 mètre et hauteur +2 mètres | 2 DR par palier | Rappel chiffré (non calculée) |
| Flamme Inextinguible | Durée BFM jours | 2 DR | Calculée (exécutée par la sonde) |
| Flamme Inextinguible | Durée BFM semaines | 4 DR | Calculée (exécutée par la sonde) |
| Flamme Inextinguible | Durée BFM mois | 6 DR | Calculée (exécutée par la sonde) |
| Tempête Magmatique | +2 DR : un mini-vortex si mouvement ≤8 m (maximum trois) | 2 DR par palier | Calculée (exécutée par la sonde) |
| Epées Sanguines | +2 DR : une épée supplémentaire (maximum six) | 2 DR par palier | Calculée (exécutée par la sonde) |
| Polir et Exalter | Astronomie +2 DR | 2 DR | Calculée (exécutée par la sonde) |
| Polir et Exalter | Perception visuelle Seconde vue +2 DR | 4 DR | Calculée (exécutée par la sonde) |
| Malédiction du Destin | Destin perdu ou prochain Critique 100, portée 1 mile | 6 DR | Rappel chiffré (non calculée) |
| Destin Illuminé | Une question de plus | 2 DR par palier | Rappel chiffré (non calculée) |
| Que les Quatre Vents Soufflent ! | Projection +BFM mètres | 2 DR par palier | Rappel chiffré (non calculée) |
| Inscription | Inscription en rune secrète | 2 DR | Rappel chiffré (non calculée) |
| Franchir l’inconnu | Un détail caché supplémentaire | 2 DR par palier | Rappel chiffré (non calculée) |
| Malédiction de rouille | Encombrement +1 | 2 DR par palier | Rappel chiffré (non calculée) |
| Malédiction de rouille | Non-métal fragile BFM minutes | 4 DR | Rappel chiffré (non calculée) |
| Arme enchantée | 1 Qualité d’arme ajoutée ou 1 Défaut retiré pour chaque +3 DR | 3 DR par palier | Rappel chiffré (non calculée) |
| Défaut de Forme | Neutralise enchantements de l’arme magique | 4 DR | Rappel chiffré (non calculée) |
| Forge de Chamon | 1 Qualité ajoutée ou 1 Défaut retiré de plus pour chaque +2 DR | 2 DR par palier | Rappel chiffré (non calculée) |
| Nœud défait | Un indice supplémentaire | 2 DR par palier | Rappel chiffré (non calculée) |
| Réplique de Levorg | Encombrement +1 | 2 DR par palier | Rappel chiffré (non calculée) |
| Réplique de Levorg | 1d10 pièces d’or supplémentaires | 2 DR par palier | Rappel chiffré (non calculée) |
| Essais et Erreurs | Relance unique du prochain Test choisi | 2 DR | Rappel chiffré (non calculée) |
| Coruscation de Finreir | +5 DR : faille instable dans BFM mètres, Yenlui −3 | 5 DR | Rappel chiffré (non calculée) |
| Coruscation de Finreir | +8 DR : portail dans un terrain solide, un Domaine et Haute Magie | 8 DR | Rappel chiffré (non calculée) |
| Malédiction d'Attraction des Flèches | +4 DR : les boucliers perdent leurs PA et Défensif contre les tirs | 4 DR | Calculée (exécutée par la sonde) |
| Malédiction d'Attraction des Flèches | +6 DR : localisation choisie par le tireur (Test de CT Intermédiaire +0 DR) | 6 DR | Calculée (exécutée par la sonde) |
| Impasse | +6 DR : bonus de Pierre-Vent, cercle ou jonction annulé, Yenlui lumineux | 6 DR | Rappel chiffré (non calculée) |
| Impasse | +9 DR : contrôle du Flux magique d’un Foyer arcanique annulé, Yenlui lumineux | 9 DR | Rappel chiffré (non calculée) |
| Drain de Magie | +5 DR : zone portée à la Volonté en mètres, alliés exemptés (Test d’Intelligence Difficile −1 DR) | 5 DR | Calculée (exécutée par la sonde) |
| Drain de Magie | +7 DR : Bénédictions et Miracles persistants dissipés, Yenlui lumineux | 7 DR | Rappel chiffré (non calculée) |
| Drain de Magie | +10 DR : objets magiques et Protections inertes, lanceurs privés de magie 24 h | 10 DR | Rappel chiffré (non calculée) |
| Convocation Ardente | +5 DR : dégâts +6 au 2 e Round, puis +1 par Round, Yenlui sombre | 5 DR | Calculée (exécutée par la sonde) |
| Convocation Ardente | +8 DR : alliés exemptés (Test de Corps à corps Intermédiaire +0 DR) | 8 DR | Calculée (exécutée par la sonde) |
| La Fortune est Capricieuse | +4 DR : doubles des actions non magiques = échec automatique | 4 DR | Calculée (exécutée par la sonde) |
| La Fortune est Capricieuse | +6 DR : doubles magiques sur la table des incidents Majeurs, Yenlui sombre | 6 DR | Calculée (exécutée par la sonde) |
| Glamour de Teclis | +3 DR : effet durant BI heures pour qui rate 3 Tests, Yenlui sombre | 3 DR | Calculée (exécutée par la sonde) |
| Glamour de Teclis | +6 DR : alliés exemptés (Test d’Agilité Intermédiaire +0 DR) | 6 DR | Calculée (exécutée par la sonde) |
| Bannissement Majeur | +1 DR aux Tests de dissipation gratuits pour chaque +1 DR | 1 DR par palier | Rappel chiffré (non calculée) |
| Bannissement Majeur | +4 DR : objets magiques maléfiques inactifs (Test de Sociabilité Accessible +2 DR) | 4 DR | Rappel chiffré (non calculée) |
| Bannissement Majeur | +7 DR : dégâts +15 (ou +30 si Taille Grande ou plus), Yenlui lumineux | 7 DR | Calculée (exécutée par la sonde) |
| Œil Invisible | +4 DR : l’œil gagne Sens de la magie, Seconde vue et Vision dans le noir | 4 DR | Calculée (exécutée par la sonde) |
| Œil Invisible | +8 DR : portée portée à l’Intelligence en miles | 8 DR | Calculée (exécutée par la sonde) |
| Bouclier de Saphery | Protection améliorée de 1 pour chaque +3 DR | 3 DR par palier | Calculée (exécutée par la sonde) |
| Bouclier de Saphery | +4 DR : portée réduite à la moitié de la Volonté en mètres | 4 DR | Calculée (exécutée par la sonde) |
| Extinction de l'Âme | +3 DR : les corps tués tombent en poussière | 3 DR | Rappel chiffré (non calculée) |
| Extinction de l'Âme | +7 DR : fureur de Khaine (portée et zone doublées, dégâts +11, Yenlui sombre) | 7 DR | Calculée (exécutée par la sonde) |
| Tempête | +4 DR : Test de Calme pour bouger, chute des volants, CT −3 DR | 4 DR | Calculée (exécutée par la sonde) |
| Tempête | +5 DR : projectile +15 par Round contre bâtiments et machines de guerre | 5 DR | Calculée (exécutée par la sonde) |
| Tempête | +8 DR : alliés exemptés (Test d’Initiative Intermédiaire +0 DR) | 8 DR | Calculée (exécutée par la sonde) |
| Chemin entre les Mondes | +5 DR : durée portée à BI minutes (Test de Force Mentale Difficile −2 DR) | 5 DR | Calculée (exécutée par la sonde) |
| Chemin entre les Mondes | +8 DR : traversée des Voies des Anciens d’un nexus à un autre | 8 DR | Rappel chiffré (non calculée) |
| Bête Indomptée | Variante humain, FM −1 ou table d10 chaque Round | 4 DR | Rappel chiffré (non calculée) |
| Pulvérisation Musquée | Durée +1 jour | 2 DR par palier | Rappel chiffré (non calculée) |
| Passage Rapide | Niveau Escalade/Foulée supplémentaire si déjà possédé | 2 DR par palier | Rappel chiffré (non calculée) |
| Almanach | Prévision à une semaine | 2 DR | Rappel chiffré (non calculée) |
| Almanach | Prévision au jour | 4 DR | Rappel chiffré (non calculée) |
| Geyser | Un Sonné sur une cible choisie par palier | 2 DR par palier | Calculée (exécutée par la sonde) |
| Sentier de Paranoth | Un niveau de Foulée si déjà connu | 2 DR par palier | Rappel chiffré (non calculée) |
| Sentier de Paranoth | Voyager sans trace | 4 DR | Calculée (exécutée par la sonde) |
| Escalier en Spirale | +2 DR : hauteur +FM mètres (plafond 200) | 2 DR par palier | Calculée (exécutée par la sonde) |
| Croissance Vitale | Hauteur naturelle × 2, un Round supplémentaire | 2 DR | Calculée (exécutée par la sonde) |
| Croissance Vitale | Hauteur naturelle × 3, deux Rounds supplémentaires | 4 DR | Calculée (exécutée par la sonde) |
| Croissance Vitale | Hauteur naturelle × 4, trois Rounds supplémentaires | 6 DR | Calculée (exécutée par la sonde) |
| Crevasse | Longueur/profondeur +1 m, profondeur maximum 10 m | 2 DR par palier | Rappel chiffré (non calculée) |
| Piège d'Abulla | Un Enchevêtré supplémentaire | 1 DR par palier | Calculée (exécutée par la sonde) |
| Piège d'Abulla | Hauteur +2 m, maximum 10 m | 1 DR par palier | Rappel chiffré (non calculée) |
| Ériger l’édifice | Longueur +5 m, un Round de plus par palier | 2 DR par palier | Rappel chiffré (non calculée) |
| Ériger l’édifice | Hauteur +1 m/épaisseur +6 pouces, un Round par palier | 2 DR par palier | Rappel chiffré (non calculée) |
| Ériger l’édifice | Courbe ou angle | 2 DR | Rappel chiffré (non calculée) |
| Illuminer l’édifice | Tour ou grand manoir | 2 DR | Rappel chiffré (non calculée) |
| Illuminer l’édifice | Château | 4 DR | Rappel chiffré (non calculée) |
| Amarante | Niveau des Résistances déjà connues +1 | 2 DR par palier | Rappel chiffré (non calculée) |
| Cendres et Poussière | +4 DR : Soleil Violet de Xereus, Peur (2), Calme ou mort au contact | 4 DR | Calculée (exécutée par la sonde) |
| Destin de Bjuna | Une cible par palier : FM ou suffocation | 2 DR par palier | Calculée (exécutée par la sonde) |
| Voile Pourpre de Shyish | Peur +1 pour chaque +2 DR | 2 DR par palier | Calculée (exécutée par la sonde) |
| Révélation de Shyish | Une question au mort nommé | 2 DR par palier | Rappel chiffré (non calculée) |
| Marée des Âges | Encombrement +1 | 2 DR par palier | Rappel chiffré (non calculée) |
| Marée des Âges | Vivant : Calme +2 ou F/E−d10 permanents | 4 DR | Calculée (exécutée par la sonde) |
| Attaques en chaine | 1 cible de plus dans la chaîne pour chaque +2 DR | 2 DR par palier | Calculée (exécutée par la sonde) |
| Chute | −1 DR au Test de Dextérité de la cible pour chaque +2 DR | 2 DR par palier | Calculée (exécutée par la sonde) |
| Effrayant | Peur +1 pour chaque +3 DR | 3 DR par palier | Calculée (exécutée par la sonde) |
| Pont | Longueur ou largeur +BFM mètres pour chaque +2 DR | 2 DR par palier | Rappel chiffré (non calculée) |
| Poussée | Repoussé de BFM mètres de plus pour chaque +2 DR | 2 DR par palier | Rappel chiffré (non calculée) |
| Terrifiant | Terreur +1 pour chaque +3 DR | 3 DR par palier | Calculée (exécutée par la sonde) |
| Déplacement d’objet | Distance +BFM mètres pour chaque +2 DR | 2 DR par palier | Rappel chiffré (non calculée) |
| Horreurs Noires | Peur de l’ombre +1, maximum 4 | 2 DR par palier | Rappel chiffré (non calculée) |
| Poches Profondes | Encombrement +1 | 2 DR par palier | Rappel chiffré (non calculée) |
| Ailes Grises | Téléportation +100 m | 2 DR par palier | Rappel chiffré (non calculée) |
| Panacée | Une maladie guérie de plus | 2 DR par palier | Rappel chiffré (non calculée) |
| Bonne santé | Portée Bonus de Force Mentale mètres | 3 DR | Rappel chiffré (non calculée) |
| Relever les morts | +2 DR : un Squelette supplémentaire | 2 DR par palier | Rappel chiffré (non calculée) |
| Réanimation | +2 DR : un mort-vivant supplémentaire | 2 DR par palier | Rappel chiffré (non calculée) |
| L’appel de Vanhel | +2 DR : Bonus d’Intelligence cibles de plus | 2 DR par palier | Rappel chiffré (non calculée) |
| Déracinement des montagnes | +5 DR : avalanche | 5 DR | Rappel chiffré (non calculée) |
| Ligne de terre | +4 DR : pont sur l’eau | 4 DR | Rappel chiffré (non calculée) |
| Ligne de terre | +6 DR : chemin dans la jungle | 6 DR | Rappel chiffré (non calculée) |
| Ruine des cités | +6 DR : structure fortifiée | 6 DR | Rappel chiffré (non calculée) |
| Déflagration mentale | +6 DR : « La Délivrance d’Itza » | 6 DR | Rappel chiffré (non calculée) |
| Déflagration mentale | +9 DR : « Le Grand Niveleur » | 9 DR | Rappel chiffré (non calculée) |
| Apothéose (Slann) | Slann, +2 DR : Peur +1 | 2 DR par palier | Rappel chiffré (non calculée) |
| Destruction des Arcanes (Slann) | Slann, +5 DR : une destruction de plus | 5 DR par palier | Rappel chiffré (non calculée) |
| Drain de Magie (Slann) | +5 DR : zone portée à la Volonté en mètres, alliés exemptés (Test d’Intelligence Difficile −1 DR) | 5 DR | Calculée (exécutée par la sonde) |
| Drain de Magie (Slann) | +7 DR : Bénédictions et Miracles persistants dissipés, Yenlui lumineux | 7 DR | Rappel chiffré (non calculée) |
| Drain de Magie (Slann) | +10 DR : objets magiques et Protections inertes, lanceurs privés de magie 24 h | 10 DR | Rappel chiffré (non calculée) |
| Drain de Magie (Slann) | Slann, +4 DR : drainer la magie environnementale | 4 DR par palier | Rappel chiffré (non calculée) |
| Chemin entre les Mondes (Slann) | +5 DR : durée portée à BI minutes (Test de Force Mentale Difficile −2 DR) | 5 DR | Calculée (exécutée par la sonde) |
| Chemin entre les Mondes (Slann) | +8 DR : traversée des Voies des Anciens d’un nexus à un autre | 8 DR | Rappel chiffré (non calculée) |
| Chemin entre les Mondes (Slann) | Slann, +4 DR : Voies des Anciens | 4 DR | Rappel chiffré (non calculée) |
| Divination des flammes | +2 DR : créatures invisibles détectées | 2 DR | Rappel chiffré (non calculée) |
| Divination des flammes | +3 DR : cibler les créatures détectées | 3 DR | Rappel chiffré (non calculée) |
| Divination des pierres | +3 DR : détecter l’ithilmar | 3 DR | Rappel chiffré (non calculée) |
| Feux de la perfection | +5 DR : un autre sort de Vaul sur l’objet | 5 DR | Rappel chiffré (non calculée) |
| Sagesse de l’acier du ciel | +4 DR : fragiliser un objet d’ithilmar | 4 DR | Rappel chiffré (non calculée) |
| Sagesse de l’acier du ciel | +6 DR : objet magique d’ithilmar | 6 DR | Rappel chiffré (non calculée) |
| Forteresse de Hotek | +2 DR : une défense supplémentaire | 2 DR par palier | Rappel chiffré (non calculée) |
| Esprits des vagues | +3 DR : un élémentaire de plus | 3 DR par palier | Rappel chiffré (non calculée) |
| Armure de Mathlann | +2 DR : un navire plus grand | 2 DR par palier | Rappel chiffré (non calculée) |
| Armure de Mathlann | +4 DR : Armure 3 | 4 DR | Rappel chiffré (non calculée) |
| Armure de Mathlann | +6 DR : gréement et équipage protégés | 6 DR | Rappel chiffré (non calculée) |
| Appel des mers | +5 DR : Merwyrm amical | 5 DR | Rappel chiffré (non calculée) |
| Appel des mers | +8 DR : le Merwyrm reste | 8 DR | Rappel chiffré (non calculée) |
| Manteau de Mathlann | +2 DR : un navire plus grand | 2 DR par palier | Rappel chiffré (non calculée) |
| Manteau de Mathlann | +8 DR : arches noires et monstres marins | 8 DR | Rappel chiffré (non calculée) |
| Maîtresse des profondeurs | +5 DR : insensible à l’appel | 5 DR | Rappel chiffré (non calculée) |
| Maîtresse des profondeurs | +3 DR : Océanide mobile | 3 DR | Rappel chiffré (non calculée) |
| Poumons d’eau | +4 DR : sens sous l’eau | 4 DR | Rappel chiffré (non calculée) |
| Poumons d’eau | +4 DR : cible attirée par l’eau | 4 DR | Rappel chiffré (non calculée) |
| Brumes grouillantes | +3 DR : brume mobile | 3 DR | Rappel chiffré (non calculée) |
| Brumes grouillantes | +3 DR : Peur 1 pour les alliés | 3 DR | Rappel chiffré (non calculée) |
| Creuset de lumière | +3 DR : Défensive ou Précise | 3 DR | Rappel chiffré (non calculée) |
| Creuset de lumière | +5 DR : épée pensante | 5 DR | Rappel chiffré (non calculée) |
| Creuset de lumière | +7 DR : Qualités permanentes | 7 DR | Rappel chiffré (non calculée) |
| Maîtrise mnémonique | +2 DR : réussite automatique à l’incantation | 2 DR | Rappel chiffré (non calculée) |
| Maîtrise mnémonique | +3 DR : effacer un souvenir | 3 DR | Rappel chiffré (non calculée) |
| Envoi psychique | +3 DR : image mentale | 3 DR | Rappel chiffré (non calculée) |
| Envoi psychique | +4 DR : un inconnu | 4 DR | Rappel chiffré (non calculée) |
| Sceaux sacrés | +6 DR : durée en semaines | 6 DR | Rappel chiffré (non calculée) |
| Les Mots premiers | +2 DR : espèces antérieures aux Anciens | 2 DR | Rappel chiffré (non calculée) |
| Les Mots premiers | +4 DR : esprits, élémentaires, démons | 4 DR | Rappel chiffré (non calculée) |
| Secours au serviteur magique | +3 DR : soin doublé | 3 DR | Rappel chiffré (non calculée) |

## Clauses rappelées à l'exécution

Drapeaux d'effet que le moteur ne calcule pas : le rappel est joint à l'aperçu du sort (9 drapeaux, 30 contrats). Un drapeau qui n'est ni lu ni listé ici fait échouer le test « tout drapeau écrit est lu ».

| Sort | Rappel |
|---|---|
| Couronne de Flamme | Talents accordés pour la durée (non évalués par le moteur) : Chef de guerre. |
| Esprit du Foyer | Au plus 1 par cible. |
| Epées Sanguines | Au plus 1 par cible. |
| Serres d’Ambre | Talents accordés pour la durée (non évalués par le moteur) : Escalade des surfaces abruptes. |
| Éveil du Bois | Enchevêtré de Force 30 : l’état n’a pas de Force propre dans l’outil ; s’en défaire demande un Test de Force opposé à cette Force 30. |
| Peau du Chasseur | Talents accordés pour la durée (non évalués par le moteur) : Sens aiguisé (Odorat). |
| Passage Rapide | Talents accordés pour la durée (non évalués par le moteur) : Escalade, Foulée (terrain choisi). |
| Le Bœuf Reste Debout | Retire DR + 1 états Brisé. |
| Transformation de Kadon | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Ver Grouillant | Enchevêtré de Force 50 : l’état n’a pas de Force propre dans l’outil ; s’en défaire demande un Test de Force opposé à cette Force 50. |
| Chair de Pierre | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Chute des feuilles | Talents accordés pour la durée (non évalués par le moteur) : Contorsionniste. |
| Sentier de Paranoth | Talents accordés pour la durée (non évalués par le moteur) : Foulée (Forêts). |
| Lumière aveuglante | Zone plafonnée par la portée : aucune extension générique de zone. |
| Lumière de pureté | Talents accordés pour la durée (non évalués par le moteur) : Résistance (Maladies). |
| Bannissement Mineur (Hysh & Shyish) | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Amarante | Talents accordés pour la durée (non évalués par le moteur) : Résistance (Poison), Résistance (Maladies), Résistance (Chaos). |
| Contrainte des Esprits | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| L’Étreinte d’Iyrtu | Les empoignades du lanceur réussissent automatiquement : un échec compte pour +0 DR (WoM p. 124). |
| Les Enfants Sauvages de Zandox | Au plus 2 par cible. |
| Attaques en chaine | Rebonds conditionnels : ordre, cible la plus proche et distances explicitement déclarés par le MJ. |
| Poussée | Zone plafonnée par la portée : aucune extension générique de zone. |
| Bouclier magique | +6 DR aux seuls Tests de dissipation du lanceur (Bonus de Force Mentale), jamais à l’incantation. |
| Visage mutable | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Traître de Tarn | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Protection contre le wyrd | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Destruction de Démon Mineur | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Mork te veut ! | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Effondrement d’un construit | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
| Perturber la magie | Test opposé de Force Mentale : deux dés explicites, égalité au lanceur. |
