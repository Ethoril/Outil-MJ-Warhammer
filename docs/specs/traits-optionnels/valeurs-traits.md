# Valeurs chiffrées des Traits à modificateurs (lot D13)

Relevé du 17/11/2026, relu dans les PDF, sans code ni donnée touchés. Rien n'est recopié des livres : nom, page, valeurs chiffrées, paraphrase courte. À valider par le MJ avant le plan du chantier (D13).

Les cinq livres lus et leurs pages (la page est le numéro imprimé) :
- **L11** = The Imperial Zoo (V4), tableau récapitulatif des Traits, pp. 135-137.
- **LB-FR** = Livre de base français (V4), « Traits de créature », pp. 338-341. Il porte les noms français et dit la même chose que L11 pour les valeurs.
- **LB-V5** = Livre de base V5 EN v2 (L06). Il ne contient aucun de ces dix Traits sous leur nom, sauf Dressé et Hardy sous forme de Talent (voir plus bas).
- **L13** = Up in Arms, **L23** = Enemy in Shadows Companion : ils ne définissent aucune valeur ; ils citent Clever, Elite, Hardy, Tough en options de fiche (L13 p.29, L23 p.24) et définissent les dressages (L13 pp.106-107).

## 1. Table des valeurs

Convention : « Ag » Agilité, « Dex » Dextérité, « Int » Intelligence, « FM » Force Mentale (Volonté dans l'outil), « Soc » Sociabilité, « M » Mouvement, « I » Initiative. Le signe moins est le « − » du livre (le texte extrait le rend par un caractère illisible ; le sens est confirmé par le Livre de base V5 p.361, qui retire 5 d'Agilité par cran de Taille).

| Trait | Nom FR (LB-FR) | Effet chiffré | Source (livre, page) | Écart entre livres | Comportement actuel de l'outil |
|---|---|---|---|---|---|
| Big | Grand | +10 F, +10 E, −5 Ag | L11 p.135 ; LB-FR p.339 | Aucun entre L11 et LB-FR. LB-V5 n'a pas ce Trait ; son p.361 donne la même variation (+10 F/E, −5 Ag) mais par cran de Taille, ce qui est autre chose (le Trait Big ne change pas la catégorie de Taille). | Rien : nom connu, aucun calcul. |
| Brute | Brutal | −1 M, −10 Ag, +10 F, +10 E | L11 p.135 ; LB-FR p.338 | Aucun. Absent de LB-V5. | Rien. |
| Clever | Intelligent | +20 Int, +10 I | L11 p.135 ; LB-FR p.340 | Aucun. Absent de LB-V5. | Rien. |
| Cunning | Rusé | +10 Soc, +10 Int, +10 I | L11 p.135 ; LB-FR p.341 | Aucun. Absent de LB-V5. | Rien. |
| Elite | Élite | +20 CC, +20 CT, +20 FM | L11 p.135 ; LB-FR p.339 | Valeurs identiques entre L11 et LB-FR. **Homonyme trompeur** : LB-V5 p.353 a un *modèle* « Elite » (+15 sur CC, F, E, I, FM, plus compétences et Talents) qui n'est pas ce Trait. | Rien. |
| Fast | Rapide | +1 M, +10 Ag | L11 p.135 ; LB-FR p.341 | Aucun. Absent de LB-V5 (qui a Sprinter, Course ×1,5, autre Trait). | Rien. |
| Leader | Meneur | +10 Soc, +10 FM | L11 p.136 ; LB-FR p.340 | Valeurs identiques. LB-FR ajoute une restriction (ne se prend pas sur une créature Bestial) que L11 ne reprend pas. **Homonyme** : LB-V5 p.353 a un modèle « Leader » (+15 sur presque tout), distinct. | Rien. |
| Tough | Coriace | +10 E, +10 FM | L11 p.137 ; LB-FR p.338 | Aucun. Absent de LB-V5. | Rien. |
| Hardy | Endurant | Blessures + BE (une fois), appliqué avant le multiplicateur de Taille. Pas de caractéristique modifiée. | L11 p.136 ; LB-FR p.339 | LB-V5 : pas de Trait, seulement le **Talent** Hardy (« Dur à cuire », p.120), même effet (BE ajouté une fois de plus au total). Cumulable avec le Talent. | Partiel : `creatureWounds({hardy})` (`js/core/v5-magic-arbitrations.js`) ajoute `hardy × BE` mais `hardyRank` ne lit que le Talent du lanceur ; aucun Trait Hardy n'y est branché. Les Blessures imprimées d'un profil du bestiaire sont lues telles quelles. |
| Trained (War) | Dressé (Guerre) | +10 CC (uniquement CC) ; ignore Craintif (Nerveux) pour les bruits forts, pas pour la magie (Magic est un autre dressage). | L11 p.137 ; LB-FR p.339 ; LB-V5 p.363 ; L13 p.106 | Aucun sur le chiffre (+10 CC / WS dans les quatre livres). LB-V5 ajoute : seule une monture Guerre combat sans Désavantage ; L13 p.106 : Guerre est requis pour mettre en commun l'Avantage cavalier-monture et pour Shock Cavalry. | Partiel : `planCreatureMagic` (`js/core/creature-magic-traits.js`, `TRAINED_EFFECTS.Guerre`) décrit +10 CC et l'exception Craintif sans l'appliquer au profil ; `untrainedMountDisadvantage` gère le Désavantage de monture. |

Effets dérivés à recalculer quand un Trait est coché (le livre ne les imprime pas, ce sont les règles générales) : bonus de F, E, FM, I, Ag, Int, Soc, Blessures (BF + 2 × BE + BFM, ×2 Grande, ×4 Énorme, ×8 Monstrueuse ; Petite 2 × BE, d'après `creatureWounds` et LB-V5 p.361). Tough change BE et BFM, donc les Blessures ; Big et Brute changent BF et BE ; Elite change BFM.

## 2. D10 : un Trait de base est-il déjà compté dans le profil imprimé ?

**Verdict : non tranché par le texte.** Aucun des livres lus ne dit « les caractéristiques imprimées incluent déjà vos Traits de base ». L'épreuve empirique donne une réponse dominante « oui » pour trois Traits, mais avec des contre-exemples : D10 reste un choix de prudence raisonnable, pas un fait établi.

**Ce que disent les livres.**
- LB-V5 p.318, « Customising Creatures » : les profils sont des valeurs moyennes pour l'exemple de base de chaque espèce ; on peut les adapter en changeant caractéristiques et Traits. Rien sur l'inclusion des Traits de base.
- LB-V5 p.360, encadré « Size Combat Modifiers » : les profils de PNJ incluent déjà les modificateurs de dégâts de Taille. LB-V5 p.361, « Adjusting a Creature's Size » : l'exemple de l'araignée géante (Petite, F15, E25, Ag35) devient Grande en F35, E45, Ag25, donc le profil imprimé d'une créature Grande est lu comme un profil *après* Taille. C'est l'indice le plus proche, mais il concerne Size, pas les Traits de D5.
- LB-FR p.310 : les Traits de base et les Traits optionnels sont des ajouts au profil ; rien sur le double compte.
- L11 pp.134-137 : présente les Traits, ne dit rien du profil imprimé.

**Contrôle empirique** (données du bestiaire de l'outil, `js/data/bestiary/*.json`, relues contre les PDF quand c'était utile).

1. **Humains construits « avec juste des Traits et des caractéristiques aléatoires » (LB-FR p.313).** Les deux exemples du livre montrent des profils qui incluent les Traits :
   - Pol Dankels (Coriace, Intelligent, Rusé) : E46, FM47, I49, Int65, Soc44 contre 24 à 34 sur les autres caractéristiques ; Blessures 14 = BF 2 + 2 × BE 4 + BFM 4, calculées sur les valeurs déjà relevées.
   - Bella la Noire (Brutal, Endurant) : M3, F41, E45, Ag25 ; Blessures 19 = 4 + 2 × 4 + 3 + BE 4 : Endurant est inclus dans les Blessures imprimées.
   - Oui, les Traits y sont comptés, mais ce sont des PNJ fabriqués pour l'exemple, pas des créatures du bestiaire.
2. **Zurn (E0-P-705, L21 p.84) et Ulfhednar (E0-P-706) contre le Guerrier du Chaos de base (LB-V5, L06 p.348).** Zurn (Clever, Tough) : E55 contre 45, FM65 contre 55, I55 contre 45, Int55 contre 30. Les +10 E, +10 FM, +10 I de Tough et Clever sont visibles ; Int +25 pour +20. Ulfhednar, identique à Zurn mais Fast : M5 contre M4, le +1 M de Fast est visible. Blessures 20 = 4 + 2 × 5 + 6 sur les valeurs relevées. **Oui, inclus.**
3. **Endurant (Hardy) sur les Blessures imprimées : 20 profils sur 27** (profils du bestiaire avec Hardy en Trait de base, Taille Moyenne à Monstrueuse, F, E, FM renseignées) ont des Blessures égales au total *avec* Hardy ; 3 égales au total *sans* ; 4 ne collent à aucun des deux. Exemples d'inclusion : Palace Guards (E0-P-847, L24 p.49), Rhinox (L01), Cockatrice (L11). Exceptions : Watch Sergeant (E0-P-862, L24 p.53, 17 au lieu de 21), Rickard Aschaffenberg (L24), Erich Frohlich (L10). **Oui dans près des trois quarts des cas.**
4. **Contre-exemples.**
   - Troll (LB-FR p.324, Traits de base dont Coriace) : E45, FM20 ; le Troll du Livre de base V5 (L06 p.335), qui n'a plus Tough, a les mêmes E45 et FM20. River Trolls (E0-P-963, L26 p.89), Tough listé : E45, FM20 aussi. Le profil du troll ne semble pas contenir le +10 de Coriace. **Non.** (Ici Tough est aussi listé en option sur L26, ce qui peut être une erreur de saisie du livre ou de la donnée.)
   - Great Cats (L23 p.87, Fast) : M4 ; aucun +1 M visible. Heavy Warhorse (L13 p.29, Big) contre Light Warhorse (L23 p.24) : F50/E50/Ag20/M4 contre F45/E35/Ag30/M7, soit +5 F, +15 E, −10 Ag, −3 M ; ni Big (+10/+10/−5) ni autre combinaison simple. Heavy Draught Horse (Brute) contre Draught Horse (L23 p.23) : M −1 (exact), F +5, E +5, Ag −5 ; sens bon, ampleur de moitié. **Partiel ou non concluant.**

**Conclusion.** Les profils des PNJ humains et des quelques personnages nommés incluent presque toujours leurs Traits, Hardy dans les Blessures en tête ; les créatures génériques (troll, chat, cheval de guerre) sont incohérentes. D10 (ne pas modifier un Trait de base, réputé compté) est donc un bon choix par défaut : l'inverse (compter deux fois) fausserait nettement les PNJ nommés, le risque restant est un Trait de base d'une créature générique pas inclus (le MJ pourra le cocher ou le saisir à la main). Un bouton « recompter » par fiche reste possible plus tard sans toucher à D10.

## 3. Questions pour le MJ

1. **Quelle édition fait foi ?** LB-V5 n'a aucun de ces Traits (sauf Hardy en Talent et Trained). Les dix valeurs viennent de L11 et du Livre de base français (V4), qui disent la même chose. *Recommandation : prendre ces valeurs ; elles sont sans écart entre livres, et les profils du bestiaire qui portent ces Traits sont tous des suppléments V4.*
2. **Elite et Leader : ne pas confondre avec les modèles V5 (LB-V5 p.353).** Ce sont des modèles de profil (+15 sur plusieurs caractéristiques, compétences, Talents), pas les Traits. *Recommandation : appliquer seulement les valeurs de Trait (Elite +20 CC/CT/FM, Leader +10 Soc/FM) ; les modèles V5 restent hors du chantier.*
3. **Leader sur une créature Bestial.** LB-FR p.340 l'interdit, L11 p.136 ne le dit pas. *Recommandation : rappel affiché au cochage, jamais de blocage.*
4. **Hardy et Blessures imprimées.** Les Blessures du bestiaire sont lues telles quelles (profils avec Hardy en base déjà inclus à 74 %). Pour un Hardy coché : ajouter BE × facteur de Taille (le livre dit « avant la Taille ») ; sur Taille Petite, ajouter BE. *Recommandation : calculer la différence de formule (profil modifié moins profil imprimé), ajoutée aux Blessures imprimées, pour ne pas écraser un total propre au livre.*
5. **Cumul de deux Traits cochés.** Les livres ne disent rien (Clever + Cunning donnerait Int +30, I +20). *Recommandation : cumul simple, comme CA10 le prévoit, avec la somme affichée.*
6. **Noms français.** Le tableau de `docs/BESTIAIRE_INVENTAIRE.md` (E0-T-079 et E0-T-086) inverse Hardy et Tough : le Livre de base français nomme Tough « Coriace » (p.338) et Hardy « Endurant » (p.339). Dans `creature-trait-names.js`, seuls Brutal, Élite (écrit Elite) et Dressé existent ; Grand, Intelligent, Rusé, Rapide, Meneur, Coriace, Endurant y manquent. *Recommandation : adopter les noms du Livre de base français (Grand, Brutal, Intelligent, Rusé, Élite, Rapide, Meneur, Coriace, Endurant, Dressé) et corriger l'inventaire.*
7. **Cohérence avec le profil ci-dessus (D10).** Si le MJ coche un Trait déjà présent en base, l'effet est nul (D10). *Recommandation : afficher « déjà compté » plutôt que de masquer la case.*

Point de méthode : les extractions PDF et les scripts de comparaison sont dans `tmp/reprise-team/traits-d13/` (non versionné).

## 4. Modèles V5 Elite et Leader (D19)

Relevé du 17/11/2026 dans le Livre de base V5 (L06), p. 353, plus p. 318 et p. 352 pour les règles d'application. Les chiffres viennent des deux versions du PDF du catalogue (« EN v2 » et « EN v3 »). Rien n'est recopié : noms, chiffres, page.

**Écart de version, à trancher (voir plan, point 1).** *Elite* est identique en v2 et en v3. Le modèle que la v2 nomme *Leader* s'appelle *Lieutenant* en v3, avec des chiffres plus forts. Les données de l'outil (`js/data/bestiary/L06.json`, depuis la 3.28.0) sont en v3 : *Elite* = `E0-P-114`, *Lieutenant* = `E0-P-115`, *Commander* = `E0-P-116`. Le MJ parle de « Leader » (nom de la v2 et du Trait V4).

### Elite (L06 p. 353, v2 = v3 ; `E0-P-114`, « Élite »)

- Caractéristiques : +15 à CC, F, E, I, FM. Rien aux autres (M, CT, Ag, Dex, Int, Soc inchangées).
- Blessures : le livre dit de les augmenter à cause de F, E et FM, sans chiffre. Contrôle sur le Stormvermin (p. 352, 15) et sur Skrakk (p. 354, 19) : le total égale BF + 2 × BE + BFM calculé sur leurs valeurs finales.
- Compétences (valeurs ajoutées aux avances) : Calme +15, Esquive +15, Intimidation +10, Commandement +5, Corps à corps « n'importe lesquels deux » +15, Perception +15.
- Talents ajoutés : Vigilance, Combat instinctif, Déterminé (Combat Aware, Combat Reflexes, Resolute).
- Condition ou restriction : aucune de Bestial ou d'Intelligence ; le livre (p. 318 et p. 353) destine les modèles aux espèces « plus organisées », sous forme de suggestions.

### Leader, v2 (L06 p. 353, PDF « EN v2 »)

- Caractéristiques : +15 à CC, CT, F, E, I, Ag, FM ; +5 à Soc. Rien d'autre.
- Compétences : Calme +15, Esquive +15, Intimidation +15, Commandement +15, Savoir (Guerre) +10, Corps à corps « deux » +15, Perception +15.
- Talents : Vigilance, Combat instinctif, Assaut féroce, Exaltant, Déterminé, Seigneur de guerre.

### Lieutenant, v3 (L06 p. 353, PDF « EN v3 », données de l'outil ; `E0-P-115`)

- Caractéristiques : +20 à CC, CT, F, E, I, Ag, FM ; +10 à Soc. Rien d'autre.
- Compétences : mêmes six noms et mêmes valeurs que Leader v2, soit Calme +15, Esquive +15, Intimidation +15, Commandement +15, Savoir (Guerre) +10, Corps à corps « deux » +15, Perception +15 (le relevé de `E0-P-115` les confirme).
- Talents : les six de Leader v2.
- Même absence de restriction écrite que pour Elite. La restriction de D17 (Bestial) vient du Livre de base français V4 (p. 340), pas de ce modèle.

### Rapprochement avec les clés de l'outil

Mesuré par `tmp/reprise-team/traits-plan/resolve.mjs` (`resolveSkill`, `resolveTalent` de `js/core/reference-catalog.js`).

| Élément du modèle | Clé de l'outil | État |
|---|---|---|
| Cool | Calme (`skill-…-base`, FM) | existe |
| Dodge | Esquive (Ag) | existe |
| Intimidate | Intimidation (F) | existe |
| Leadership | Commandement (Soc) | existe |
| Lore (Warfare) | Savoir (Guerre) (Int) | existe |
| Perception | Perception (I) | existe |
| Melee (Any Two) | Corps à corps (Base, Armes d'hast, Deux mains, Escrime…) existent un par un ; « Any Two » n'a pas de clé (`frUnverified` dans la donnée) | **manque** : à résoudre en prenant les compétences de Corps à corps du profil |
| Combat Aware | `talent-combat-aware` (Vigilance) | existe |
| Combat Reflexes | `talent-combat-reflexes` (Combat instinctif) | existe |
| Resolute | `talent-resolute` (Déterminé) | existe |
| Furious Assault | `talent-furious-assault` (Assaut féroce) | existe |
| Inspiring | `talent-inspiring` (Exaltant) | existe |
| War Leader | `talent-war-leader` (Seigneur de guerre) | existe |

Aucun Talent ne manque pour Elite ni pour Leader/Lieutenant (Chance et Inébranlable ne servent qu'à Commander, hors périmètre).

### Mécanique de calcul constatée (sur les exemples du livre)

- Une compétence imprimée est un total (caractéristique + avances) ; le bonus du modèle s'ajoute aux avances. Stormvermin (Elite sur Clanrat) : Calme 50 = FM 35 + 15, cohérent. Les autres compétences du Stormvermin ne se recomptent pas exactement depuis le Clanrat (Perception 65 au lieu de 75, Ag +10 que le modèle ne donne pas) : le livre arrondit ses exemples. Règle retenue pour l'outil : total = ancien total (ou caractéristique modifiée si absente) + écart de la caractéristique liée + bonus ; à confirmer par le MJ (plan, point 2).
- `applyBestiaryTemplates` (`js/core/bestiary-templates.js`) applique déjà les modificateurs et les Talents. Deux défauts pour D19 : il ajoute une compétence absente avec le seul bonus comme total (au lieu de la caractéristique modifiée + bonus), et il refuse le profil dont une caractéristique modifiée est vide (CT ou Soc absente d'une bête).
