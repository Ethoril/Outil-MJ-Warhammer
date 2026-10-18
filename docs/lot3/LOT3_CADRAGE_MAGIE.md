# Cadrage de la magie — Lot 3

État courant au 10 octobre 2026 : moteur et interface magiques raccordés, 277 contrats présents, ingrédients exclus et recette locale 3.5 terminée en 3.14.0. Voir [le bilan exact](LOT3_FINALISATION_MAGIE.md) et [les preuves](LOT3_RECETTE_3_5.md). Le corps de ce document conserve le cadrage et les arbitrages ; la dernière section décrit la livraison initiale du 9 octobre.

Le catalogue public actuel contient **277 sorts actifs**, répartis dans 13 familles. Les trois anciens intitulés encore conservés à tort dans le catalogue embarqué sont retirés : ils ont disparu de la source publique et l’utilisateur confirme qu’aucune fiche ne les utilise. L’audit couvre donc uniquement ces **277 sorts**. Chaque sort actif a une ligne de tri, une empreinte de sa source et un traitement proposé dans [l’audit détaillé](LOT3_AUDIT_SORTS.md), avec [les notes de correction et données structurées](LOT3_AUDIT_SORTS.json).

Le tri porte sur les effets des sorts : **123** ont principalement des effets calculables, **132** demandent des choix ou informations du MJ en plus des calculs, **22** produisent principalement des rappels narratifs. Même un sort narratif reste soumis au lancement, au contact éventuel, aux incidents et à sa durée. Les 31 entrées signalées pour suivi dans les fiches constituent une catégorie transversale, pas 31 sorts supplémentaires.

## Sources et portée de la relecture

- Livre local **Livre de base V5 EN v2**, règles et sorts pp. 235–255 ; Régénération p. 360. Les pages 236, 238 et 239 ont aussi été vérifiées visuellement pour éviter les erreurs d’extraction des tableaux.
- **High Elf Player’s Guide v2**, pp. 80–89 : les 16 sorts de Haute Magie, 8 sorts elfiques arcaniques et 6 sorts mineurs elfiques, ainsi que leurs règles de lancement, ont été confrontés au supplément.
- **Winds of Magic**, règles pp. 20–23, et contrôles ciblés des profils pp. 74–76, 89, 111–112, 124–125, 134, 137 et 146–149. Ce supplément ne remplace pas les règles générales du livre V5.
- [Aides de jeu, onglet Magie](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Magie), capturé le 9 octobre 2026 à 17:08:50 UTC : 277 descriptions intégralement relues. Empreinte CSV : `62ef4366c087054ab8d639cf3bfb7a15cda936ef408ef634803b87db6463c013`.

**116 entrées du catalogue correspondent directement à des sorts du livre V5** ; ce nombre comprend cinq paires de doublons. Il ne signifie pas que les 277 sorts figurent dans ce livre. Pour les autres sorts, la proposition transpose les règles communes V5 et conserve les exceptions du texte. Les notes distinguent une valeur contrôlée dans le supplément d’une valeur restant à contrôler avant création du contrat.

L’onglet Miracles contient 15 entrées et a été inventorié ; ses effets n’ont pas encore reçu cette relecture exhaustive. Les sorts de sorcellerie, magie sombre et Chaos absents du catalogue ne sont pas ajoutés par cet audit. Les 28 talents réservés au lot 3 incluent aussi prières, runes et effets elfiques : ils ne sont pas tous des talents de lancer de sorts.

## Arbitrages confirmés

| Sujet | Règle retenue |
|---|---|
| Compétences | Une seule Focalisation pour les huit Vents ; une autre pour la Haute Magie. Langue (Magick) sert au lancer. |
| Réserve des huit Vents | Commune à tous les huit Vents, utilisable pour les sorts autorisés du personnage. |
| Réserves simultanées | Une seule peut être remplie. Commencer l’autre type de Focalisation efface la réserve précédente, même avant une nouvelle réussite. |
| Gain normal | Chaque réussite ajoute **DR + BFM** ; cumul possible sur plusieurs Tours. |
| Gain critique | Double réussi : **DR + 2 × BFM**. Pas d’incantation imparfaite du seul fait de ce critique. |
| Lancer | Le Test doit réussir, puis la réserve s’ajoute aux DR obtenus. Le total doit atteindre le NI. Toute tentative effective vide la réserve. |
| Excédent | Disponible pour la surpuissance ; suppression de l’ancien bonus de +10 au Test. |
| Incidents | Déclencheurs et deux tables du livre V5. |
| Ingrédients | Exclus sur décision du 10 octobre : aucune consommation ni atténuation d’incident, y compris depuis un ancien champ importé. |
| Effets temporaires | Appliqués au participant dans l’outil, avec expiration/restauration ; aucune réécriture de la fiche source. |
| Haute Magie | Épuisement magique, runes des Cadai et choix d’un seul attribut de Domaine conservés du supplément, adaptés V5. |
| Main de Gloire, +6 DR | Quatre caractéristiques choisies parmi CC, CT, F, E, Initiative, Agilité ; même 3d10 pour tous les alliés, Mouvement +2, Bmax inchangé malgré le bonus d’Endurance. |
| Faux de Shyish | Les Morts-vivants engagés avec le porteur ne peuvent pas bénéficier d’Avantage V5 aux Tests contre lui. Leur Élan n’est pas neutralisé par cette clause. |
| Bouclier de Saphery | Aucun plancher supplémentaire à la Protection qui s’améliore : un seuil calculé ≤1 rend sa réussite automatique sur 1d10. |
| Forme bestiale — Jade | Doublon homebrew intégral de Forme bestiale V5 ; Vent Ghyran et attribut du Domaine de la Vie. |
| Fléau des Démons | E ≤ Intelligence : bannissement ; Intelligence < E < 2 × Intelligence : Bmax divisées par deux pour le reste de la rencontre ; E ≥ 2 × Intelligence : aucun effet principal. |
| Apothéose Verdoyante | Chaque mort admissible revient avec **1 Blessure par DR final du sort**, dans la limite de ses Bmax. Le DR final est le total du Test réussi et de la réserve consommée, avant dépense de surpuissance. Les Critiques et membres perdus ne sont pas guéris. |

La compétence commune ne supprime ni les Domaines connus ni le Vent déclaré. Ceux-ci déterminent toujours les attributs de Domaine, avantages du lieu, talents et exceptions d’armure. Les sorts elfiques arcaniques doivent conserver leurs deux Vents requis et le choix d’un seul attribut. Leurs conditions d’apprentissage appartiennent aux fiches ; aucune redistribution des avances ou PX entre les anciennes spécialisations de Focalisation ne sera faite par le moteur de combat.

## Arbitrages du 10 octobre (relecture)

Décisions du MJ prises après la relecture du 10 octobre ; elles s'appliquent au plan de correction (LOT3_PLAN_CORRECTION_CLAUDE.md).

| Sujet | Règle retenue |
|---|---|
| Dissipation : DR opposés | Le dissipateur s'oppose au DR du seul Test d'incantation. Si le lanceur gagne, la réserve s'ajoute au DR net, qui doit atteindre le NI. Égalité : le lanceur gagne. |
| Dissipation : faits requis | Distance et visibilité doivent être saisies, sinon la dissipation est bloquée. Les méditations de talents ne sont pas dissipables. |
| Haute Magie | Un sort dissipé ne provoque pas d'épuisement. Le talent Haute Magie ne relève pas le plafond BI + BFM. Une rune des Cadai par jet (Test, épuisement, Corruption). |
| Bénédiction de Lileath | Le cumul se lit sur le talent du lanceur. |
| Résistance à la Magie | Contre Puissance totale, le NI reste ignoré ; la Résistance retire 3 DR aux effets seulement. |
| Contre-réaction (96+) | Le lanceur n'est jamais sa propre cible ; sans cible à portée, sa tête explose. |
| Focalisation critique | Le plancher de +5 DR sur critique (lot 2) ne s'applique pas au gain : DR réels + 2 × BFM. |
| Focalisation spécialisée | Une compétence « Focalisation (Vent) » importée vaut Focalisation pour ce Vent. |
| Temps | 1 Round = 10 secondes. Un effet en Rounds expire à la fin du tour de son auteur. |
| Protection | Une Protection réussie n'annule que les dégâts. Les Blessures directes d'attribut (Vie, Lumière) ignorent PA, BE et Protection. |
| Fléau des Démons | Les Bmax divisées sont restaurées en fin de rencontre, par action du MJ. |
| Forme bestiale (révisé le 11 octobre) | Animaux des « Bêtes du Reikland » (V5 pp. 325-327) : Sanglier, Chien, Rat géant, Araignée géante, Cheval, Loup. M, F, E, Ag et Dex remplacés ; une Dex « – » devient « – » (Tests de Dex impossibles). Blessures recalculées par la formule V5 avec les nouvelles F et E, la FM du lanceur et la Taille de l'animal (remplace D-16). Traits standard de l'animal sauf Bestial et Craintif ; un trait optionnel par +2 DR sauf Taille (Énorme) et Nuée. Attaques de l'animal, Test avec la CC du lanceur. Équipement lâché pendant la transformation (Winds of Magic) : seule la peau de l'animal protège. Interdits : parler, lancer, dissiper et Focalisation. |
| Seconde vue | Le Désavantage en zone saturée reste un rappel MJ. |
| Armure | L'armure non portée n'entre pas dans la pénalité magique. |
| Catalogue (révisé le 11 octobre) | D-21 annulée : Silence existe déjà dans le catalogue (version d'Ulgu) et Coruscating Arc est la version V5 de l'Arc de T'Essla. Aucun ajout ; Silence suit la version du catalogue, l'Arc de T'Essla garde sa version Winds of Magic (NI 7, 1 cible). |
| La Fortune est Capricieuse | « Double = maladresse » ne vaut que pour les Tests magiques et la dissipation. |
| Dissipateur raté (11 octobre) | Un DR négatif du dissipateur compte pour 0 : la dissipation peut réduire le DR du lanceur, jamais l'augmenter. |
| Attaques sous forme animale (11 octobre) | Test avec la compétence Corps à corps (Bagarre) du lanceur, à défaut sa CC. |
| Trait optionnel Taille (11 octobre) | Ne change que le multiplicateur de Blessures (Forme bestiale) ; pas d'ajustement F/E/Ag de la p. 361. Kadon garde les Blessures du monstre. |
| Lileath et Protection (11 octobre) | Chaque Protection admise en jeu grâce à la Bénédiction de Lileath fait son propre d10 ; une seule réussite annule les dégâts. |
| Armures « Dragon Haut Elfe » (11 octobre) | Comptent comme métal pour les attributs du Métal et des Cieux et pour la pénalité de Focalisation. |
| Catalogue public : Lileath (11 octobre) | Le texte de la Bénédiction de Lileath est corrigé dans le catalogue : +1 DR par niveau à tout Test de Focalisation (Qhaysh), réussi ou non (HEPG p. 83). Exception au gel du catalogue, comme D-21. |
| DR des effets de sort (12 octobre) | Tout effet « +DR » ou « par DR » d'un sort lit le DR final : Test d'incantation + réserve consommée, avant dépense de surpuissance (comme l'Apothéose). |
| Descriptions du catalogue (12 octobre) | Les descriptions contredites par les contrats corrigés seront remplacées par la version V5 à la fin des lots de contrats, avec la liste à reporter dans la feuille Google. |
| Clauses assistées (12 octobre) | Réserve de Chance commune, entretien, inventaire, mémoire, etc. restent des reçus/rappels chiffrés résolus par le MJ ; pas de compteurs dédiés prévus. |
| Écaille d'acier et Robe scintillante (13 octobre) | Deux sorts distincts conservés : Écaille d'acier suit Winds of Magic p. 75, Robe scintillante suit le livre V5 p. 253. Pas de fusion. |
| Talent Petit (Small) (14 octobre) | Suppression voulue de la clause « les coups réussis d'un adversaire plus grand déclenchent les Frappes Mortelles même si vous survivez » ; la feuille fait foi. |
| Focalisation (14 octobre, révise D-10) | La Focalisation des huit Vents est une seule compétence ; seule la Focalisation de Haute Magie (Qhaysh) est distincte. Une compétence importée « Focalisation (Vent coloré) » est lue comme cette compétence unique ; si une fiche en porte plusieurs valeurs différentes, c'est une anomalie de fiche à signaler au MJ (pas de score propre à un Vent). |
| Protection et Critique (14 octobre, précise D-13) | Une Protection réussie annule les dégâts et le Critique du coup (trait Ward, V5 p. 363) ; les autres effets du sort s'appliquent toujours. |
| Fléau des Démons (14 octobre) | Pas de cumul : un Démon dont les Bmax sont déjà divisées par le Fléau ne l'est pas une seconde fois. |
| Nom « empête » (14 octobre) | Renommé « Tempête » (HEPG p. 89) dans l'outil, les contrats et la feuille ; anciens enregistrements migrés. |

## Adaptations communes nécessaires

**Lancement et réserves.** Séparer le résultat du Test, les DR de réserve, le total disponible, le NI et les DR dépensés en surpuissance. Une réserve ne doit pas sauver une maladresse ou un Test raté. Seul un véritable Test d’incantation consomme la réserve ; consulter, préparer ou annuler un aperçu ne la consomme pas. Les Tests de contrôle d’un effet actif — déplacer une illusion, entretenir Purification, etc. — ne sont pas des Actions de Focalisation produisant une réserve.

**Surpuissance.** La V5 autorise au maximum BI + BFM DR dépensés. Les améliorations génériques suivent les coûts 1, 2, 3, 5, 8, 13, 18 ; ce sont des dépenses réparties entre colonnes, pas un même excédent appliqué gratuitement à toutes. Les options propres au sort sont distinctes. Sorts mineurs et sorts non mémorisés depuis un grimoire ne peuvent être surpuissants. Portée Vous/Contact, durée Instantanée/Spéciale et absence de zone imposent leurs restrictions.

**Dégâts.** Un projectile magique inflige BFM + dégâts indiqués, sans ajout automatique des DR. Les dégâts fixes explicitement écrits `8 + DR`, par exemple, gardent leur propre formule : aucun second ajout de BFM. Les Blessures directes ignorent l’absorption uniquement quand le texte le dit. Soin, rebond et effet « après Blessures infligées » utilisent la perte réelle après réductions et protections. Les attributs de Domaine constituent une étape séparée et ne doivent pas être appliqués deux fois.

**Critiques et incidents.** Le critique de lancer demande un choix entre Blessure Critique, Puissance totale et Force irrésistible ; exception des sorts mineurs. Les maladresses et interruptions de Focalisation font perdre 1d10 DR, avec incident Mineur majoré de +10 par DR réellement perdu. Conserver les influences corruptrices, Diction instinctive, Harmonisation aethyrique et les priorités des effets qui interdisent l’atténuation. L’excédent d’un jet Mineur modifié au-delà de 100 se reporte sur un nouveau jet Majeur.

**Modificateurs.** Un bonus de +20 à un Test devient normalement +2 DR ; une augmentation de +20 d’Intelligence, ou une perte de −20 de CC, reste une modification de caractéristique. Les deux cas ne se convertissent pas de la même façon. Conserver les vrais changements de Mouvement, BE, PA, dégâts, traits et compétences substituées. Pour les bonus de plusieurs sorts, garder le meilleur bonus et le pire malus par effet, avec les exceptions explicites de Bénédiction de Lileath.

**Durées et restauration.** Conserver l’origine du sort et distinguer début de Tour, fin de Tour, début de Round, fin de Round et temps hors combat. L’expiration retire les couches temporaires qu’il a créées ; elle ne restaure pas un ancien snapshot entier et ne guérit pas des Blessures subies depuis. Les états ordinaires reçus continuent leur récupération normale, sauf durée imposée ou suppression explicite du sort. Transformations, Blessures de forme et critiques portés au retour demandent un suivi propre.

**Dissipation.** Une réaction par Round pour un sort en train d’être lancé ; Action et Test étendu de NI pour un sort persistant. Le Test opposé de dissipation ne doit pas être confondu avec le total de réserve ou une nouvelle Focalisation. Plusieurs dispellateurs gardent leurs progressions séparées, sauf Assistance autorisée. Respecter les exceptions de Force irrésistible, Drain de Magie, Grand Bannissement et suppression temporaire d’Impasse.

**Cibles et terrain.** L’outil de combat ne possède pas les positions nécessaires pour trouver seul tous les occupants d’une zone, traversées, lignes et collisions. Le MJ doit les renseigner ; une fois renseignés, dégâts, états, immunités et durées restent calculables. Le vortex propose direction et distance, puis demande les cibles réellement traversées. Aucun bonus de combat ne doit être inventé à partir de la présentation narrative d’une illusion ou d’une lumière.

## Écarts concrets déjà relevés

| Sort | Proposition issue de la source |
|---|---|
| Égide d’Aqshy / Protection | Protection 7+ en V5 ; Protection passe à NI6. Cela ne remplace pas indistinctement toutes les protections 9+ des suppléments. |
| Cautérisation | NI2, soigne 1 B ou 1+DR si Magie Feu ; Résistance au lieu de Calme ; Sonné sur échec stupéfiant. |
| Cœurs Enflammés | NI5, effet instantané de zone Sociabilité ; retire Brisé/Exténué et permet Frénésie. Les trois talents temporaires V4 disparaissent. |
| Comète de Cassandora | NI18, projectile +18, zone 2×BFM ; guidage CT −3 DR ou Savoir (Astronomie) +2 DR, au lieu de Perception. |
| Serres d’Ambre | NI3, mains nues BF+4, Magique, retrait Inoffensive, Hémorragique après Blessures et Escalade. |
| Forme bestiale | Durée Endurance minutes ; remplace aussi Mouvement ; restrictions de traits et report des critiques au retour. |
| Incarnation / Forme sauvage de Wyssan | Un profil V5 : Mouvement +1, Force/Endurance +30 et liste de traits réécrite ; suppression de l’ancienne armure/taille automatique. |
| Lance d’Ambre | NI10, portée Force, une cible maximum, projectile +8 et localisation choisie ; fin des rebonds V4. |
| Robe scintillante | NI6, +2 PA et aveuglement des ennemis engagés après Résistance ; l’ancienne Protection croissante appartient au profil du supplément. |
| Transmutation de Chamon | Projectile +9 ignorant BE et PA, états maintenus et suffocation ; pas des dégâts égaux seulement au BFM. |
| Creuset de Chamon | Projectile +6 sur objet porté, ignore PA mais conserve BE ; l’ancienne absorption est inversée. |
| Lumière guérisseuse | NI8, soin BI, purification ; Focalisation Hysh −3 DR du lanceur pour retirer la Corruption récente. |
| Caresse de Laniph | NI6 ; pertes permanentes de Bmax et gain de réserve selon Blessures, au lieu d’un soin du lanceur. |
| Vol de Vie | NI8 et soin de 1 B par tranche complète de 2 B infligées ; abandon de l’arrondi supérieur. |
| Chute / Sang corrosif | Descriptions copiées d’autres sorts : remettre l’objet lâché / le trait Sang corrosif, sans ajouter Alerte ou Protection. |
| Souffle | Procédure V5 réécrite : CT, Esquive, zone et variantes ; l’ancien coût de deux Avantages ne s’importe pas. |
| Extinction de l’Âme — Soul Quench | Le supplément elfe donne projectile +9 ; le catalogue donne +6. La variante à +7 DR reste +11. |

Les portées et durées comportent aussi des confusions entre une caractéristique et son Bonus : Initiative/BI, Force Mentale/BFM, Intelligence/BI. L’audit conserve la valeur source et sa correction proposée. Les yards restent explicites dans les rappels tirés du livre ; pour les sorts exprimés en mètres par les aides, conserver la convention de mètres de jeu et distinguer les grandes distances en miles/km.

T’Essla’s Arc (NI7, cible unique) du supplément ne doit pas être remplacé automatiquement par Coruscating Arc V5 (NI12, rebonds). Silence Ulgu du supplément correspond à Hush et reste distinct du Silence Arcane V5 NI4, absent de la famille Arcane du catalogue. Les noms français seuls ne suffisent donc pas à prouver l’identité d’un sort.

## Doublons et fiches

Cinq paires actives ont un même sort sous deux noms : Incarnation/Forme sauvage de Wyssan ; Vol du Destin/Nuée Funeste ; Don de Vie/Floraison de vie ; Pensée rapide/Vitesse de pensée ; Portail d’Ombre/Pas d’Ombre. Proposer un contrat canonique et des aliases en conservant les références des personnages. Écaille d’acier (Winds of Magic p. 75) et Robe scintillante (V5 p. 253) restent deux sorts distincts, sans fusion, conformément à la décision du MJ du 13 octobre. Forme bestiale — Jade est un doublon homebrew confirmé : reprendre intégralement le profil V5 de Forme bestiale du Domaine des Bêtes, y compris NI, portée, cible, durée, transformation et retour ; le rattacher au Vent de Jade et à l’attribut du Domaine de la Vie. Conserver son identité de sort et ses références dans les fiches.

Couronne de Flammes, L’Or des fous et Fauche-démon étaient les trois dernières entrées du tableau `magic.spells` de `js/data/reference-snapshot.json`, marquées `retired`. Elles sont maintenant retirées de la version de travail, sans contrat historique ni alias. L’actualisation ne réajoute plus les sorts absents de la source ; un ancien cache contenant des entrées `retired` est ignoré au profit du catalogue embarqué corrigé. Aucun catalogue public ni fiche n’a été modifié. Les arbitrages de règles soumis dans cette phase sont tous résolus ; les contrôles de valeurs de supplément et validations d’alias encore signalés restent des étapes de création de contrat.

Apprentissages, PX, conditions de carrière, acquisitions permanentes, équipement détruit, Corruption, Yenlui et pertes permanentes de caractéristiques/Bmax relèvent de la fiche. L’outil peut préparer la conséquence et conserver un rappel explicite, mais ne doit pas modifier ces données par simple lecture d’une description ou expiration d’un sort. Une conséquence durable et un effet temporaire n’utilisent pas la même restauration.

## Apothéose Verdoyante — texte source et règle retenue

Ce sort est issu de **Winds of Magic, p. 89**, et ne figure pas dans le Domaine de la Vie du livre V5. Texte anglais vérifié sur la page du PDF :

> **Verdant Apotheosis**  
> **CN:** 16  
> **Range:** Line of sight  
> **Target:** AoE (Willpower Bonus yards)  
> **Duration:** Instant
>
> You summon vast reserves of Ghyran to restore life to recently slain characters by pulling their souls back through the mortal veil.
>
> Targets who were slain within the last minute reawaken as from a deep sleep and must Test for exposure to Moderate Exposure to Corruption (WFRP, page 182) after witnessing the realm of death. The spell cannot heal Critical Wounds or restore lost limbs, and a decapitated corpse is beyond saving.

Le texte ne fixe pas les Blessures au réveil. La règle homebrew confirmée est **1 B par DR final du sort** : DR du Test d’incantation réussi + réserve de Focalisation utilisée, avant dépense de surpuissance, limité aux Bmax. Par exemple, 3 DR au Test et une réserve de 15 donnent 18 DR finaux : chaque cible admissible revient avec 18 B, ou ses Bmax si elles sont inférieures. La mort doit dater de moins d’une minute ; l’exposition modérée à la Corruption et les exclusions de Critiques, membres perdus et décapitation demeurent.

## Développement proposé

1. **3.0 — Lancement et Focalisation.** Deux compétences résolues depuis les fiches, une réserve active typée, Actions, cumul, critique, changement de type, pause, interruption et consommation ; total NI et surpuissance. Validation par exemples chiffrés avant les sorts spécialisés.
2. **3.1 — Incidents et dissipation.** Branches de critique, tables V5, jets secondaires, atténuations et runes des Cadai, quota par Round et Tests étendus. Raccorder les talents magiques correspondants, sans achats de progression.
3. **3.2 — Effets communs.** Projectiles/contact, états, protections, PA, vrais changements de caractéristiques/traits, modificateurs de Tests, timers, restauration et transformations. Ajouter les attributs des huit Domaines V5 comme sources distinctes.
4. **3.3 — Sorts du livre V5.** Créer les contrats des 116 entrées contrôlées, partager les cinq doublons, traiter les erreurs de texte et tenir les profils distincts à part. Aucun parsing automatique de prose en effets actifs.
5. **3.4 — Suppléments et magie elfique.** Valider les dernières particularités de source avant contrat, intégrer les 30 sorts elfiques et les règles Haute Magie, puis les invocations, vortex et effets de terrain avec saisie MJ.
6. **3.5 — Recette de la magie.** Gestes réels, cumul et perte de réserve, morts/transformations, durée et non-cumul, reprise après rechargement, synchronisation et hors ligne ; états/réserves/choix dans une transaction annulable.

Les prières, les 15 miracles, les runes et les effets sacrés réservés au lot 3 demandent ensuite leur propre cadrage. Ils ne sont pas déclarés couverts par les 277 sorts de cette étude.

## Modifications locales déjà effectuées

- `js/data/magic.js` : remplacement des 20 résultats Mineurs et 20 résultats Majeurs par des résumés français des tables V5, dans le bon ordre ; dernière entrée Majeure affichée « 96 et plus ».
- `js/data/rules.js` : règles de la table, procédure V5, surpuissance, interruption, protections contre incidents, effets temporaires et Haute Magie ; retrait du bonus de +10 excédentaire et des anciens déclencheurs de Focalisation.
- `js/ui/rules-view.js` : recherche dans les tables magiques, sources affichées et intitulés adaptés à la table de surpuissance ; les tables de critiques conservent leur présentation.
- `js/core/reference-catalog.js` et `js/data/reference-snapshot.json` : suppression des trois intitulés obsolètes, respect des suppressions lors du rafraîchissement et rejet des anciens caches contenant des sorts retirés. Les versions de contenu sont recalculées ; les autres références restent identiques.
- `sw.js` : nouvelle clé de cache pour servir les aides et le catalogue corrigés hors ligne.

Au cadrage du 9 octobre, les tables étaient des rappels et leurs conséquences n’étaient pas appliquées automatiquement. La livraison actuelle applique les conséquences typées ; les autres restent des reçus MJ. Les descriptions des 277 sorts consultables dans l’outil restent celles du catalogue public ; leurs corrections figurent dans l’audit et attendent les contrats correspondants.

Contrôles réalisés : syntaxe des trois modules JS, vérification des différences, recette existante des références et recette ciblée de la magie sous Edge. Cette dernière vérifie les 40 lignes, les sources, la recherche de trois nouveaux incidents, la conservation de la recherche d’un ancien talent, les en-têtes de surpuissance et les trois modules modifiés accessibles depuis le Service Worker natif hors ligne. Affichage inspecté en thème sombre sur ordinateur et parchemin à 390 px. Preuves locales : `tmp/lot3/rules-receipt.json`, `tmp/lot3/rules-desktop.png`, `tmp/lot3/rules-mobile.png`.

Le bundle 2.5 précédemment préparé reste une livraison figée antérieure à ces corrections. Aucun commit, push ou déploiement n’a été effectué ; les nouveaux rappels sont présents dans le worktree de travail, à intégrer à une prochaine livraison.
