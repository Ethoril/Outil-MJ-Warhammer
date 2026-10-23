# Conception — familiers (lot F1, phase E)

Document de conception, aucun code. Le code est le lot F2, qui suit ce document. Exécutant : Claude Pro.

Sources lues : **Winds of Magic (L17, V4)** pp. 31 (rituel), 180-188, 189 (parcours de carrière) ; **Archives of the Empire 3 (L02, V4)** pp. 75-82 (familiers animaux). Décision du MJ (21/10/2026, `ARBITRAGES_MJ_21_10.md`) : règles importées et converties en V5, **ouvertes à tous** (Magie naturelle, Sorcellerie, Collèges), lien maître-familier automatisé (effets partagés, portée en saisie MJ), **deux systèmes distincts** : homoncule (L17) et animal (L02) (E0-Q21). L06 et L05 (V5) n'ont aucune règle de familier (`LOT4_TRADITIONS_BASE.md`, point 6) : c'est donc une importation V4 convertie, chaque conversion est consignée ci-dessous.

## 1. Ce qui existe déjà dans le code

- Talents `magical-assistant` (Assistant magique, +2 DR) et `animal-assistant` (Assistant animal, Avantage) : `familiarSkillSupport` dans `js/core/v5-magic-talents.js:192`. Ils ne jouent que si le contexte porte `magicAssistantId` et `magicAssistantLinked === true`, deux champs **saisis à la main** à chaque jet (`js/ui/v5-magic-controls.js:39-40`, `js/ui/resolution-panel.js:1179-1180`). Le lien n'est donc pas mémorisé : c'est ce que F2 remplace.
- Talent Imprégné (Suffuse With) : décrit dans `LOT2_TRI_TALENTS.md` (« Lot 3 »), bonus de +1 DR aux sorts du Vent à 8 yards. À vérifier en F2 par un test (Focalisation de remplacement, Frénésie d'Aqshy).
- Trois profils imprimés Combat / Power / Spell Familiar (L17 p. 182), déjà importés par la phase D (profils sans mot-clé d'espèce, choix E-D23).
- Entrées d'inventaire : E0-T-162 à 172 (animal), pas d'entrée d'inventaire pour l'homoncule (règles de L17 non inventoriées en Traits : voir §3).

## 2. Deux systèmes distincts

| | Homoncule (L17) | Animal (L02) |
|---|---|---|
| Types | Combat, Puissance (Power), Sorts (Spell) | Puissance seulement |
| Création | rituel Création de familier (CN 45, XP 250, p. 31) | rituel Lien d'esprit (CN 30, XP 150, p. 80), après dressage et une semaine d'accordage |
| Sacrifice | 1 Blessure, 1 Destin ou 1 Résilience, définitif | aucun ; traumatisme à la mort du familier |
| Plusieurs | 2ᵉ : sacrifice 2, CN 80 | CN du rituel doublé par familier déjà lié |
| Portée de l'effet | aucune (le familier assiste, il est un personnage) | 4 yards (Traits de compagnon, Assistant animal) |
| Assistance | Assistant magique : +2 DR (conversion V5 déjà posée) | Assistant animal : Avantage (déjà posé) |
| Besoin de nourriture | non (créé ou spirituel) | oui |
| Soins | sorts de soin seulement ; ni Soin ni miracles | normaux |
| Maladie, Saignement, Fatigue, Empoisonné | seulement d'origine magique | normaux |
| Corruption | comme un humain | comme un humain **et réciproque** : toute exposition de l'un fait tester l'autre |

Les deux systèmes n'ont **aucun champ commun de règles** hors le lien lui-même (maître, familier, type, Vent). Un même maître peut avoir des familiers des deux systèmes.

## 3. Inventaire des règles et conversion V5

Conversions générales (règle commune) : ±10 % → ±1 DR, ±20 % → ±2 DR, Avantage V4 → Élan, +1 SL → +1 DR, Difficile (−10) → −1 DR, Très difficile (−30) → −3 DR. Les termes sans équivalent V5 publié restent en texte de rappel, jamais inventés.

### 3.1 Homoncule (L17)

| Règle V4 | V5 / traitement | Automatisation |
|---|---|---|
| Suffuse With (Vent) : sorts du Vent à 8 yards +1 SL ; une seule fois ; Focalisation remplace une compétence selon le Vent ; Aqshy → Frénésie, immunité aux Ablaze | Talent Imprégné existant (+1 DR) ; Aqshy : ne subit pas de dégâts d'Embrasé | Talent déjà décrit ; **F2 : Embrasé sans dégâts pour un familier Imprégné d'Aqshy** ; feu de la Magie du Feu sans effet, autres feux inchangés |
| Magical Assistant (Puissance) : +20 → **+2 DR** aux Tests de Focalisation, Savoir (Magie), Langue (Magick), Recherche magique | déjà posé (talent `magical-assistant`) | **lien mémorisé** au lieu des deux cases du jet |
| Combat Familiar : profil imprimé, armure complète (Brassards, Jambières, Casque, Plastron), armes Base/Deux mains/Fléau/Escrime/Parade | profil importé tel quel ; armure en Trappings | rappel (aucun équipement automatique) |
| Spell Familiar : jusqu'à 4 sorts selon le Niveau de Carrière du maître, appris par le maître, un nouveau par Niveau | sorts : rappel et plafond de 4 | F2 : plafond saisi (4) comme avertissement, pas de blocage |
| Power Familiar : jamais Focalisation ni Langue (Magick), ni Petty Magic ni Arcane Magic | interdits à l'avancement | rappel à l'ajout de talent (pas de blocage) |
| Encombrement doublé pour tout objet non magique hors Trappings de départ | Encombrement ×2 | rappel |
| Créature magique (Magical Creature) | Trait Magique (Magical) : pris en compte par T1/T3 | portée par le profil |
| Conditions : Blinded, Broken, Deafened, Entangled, Prone, Stunned, Surprised, Unconscious normaux ; Saignement, Fatigué, Empoisonné **seulement** de source magique ; pas de maladie ni de plaie infectée sauf source magique | en V5 : États équivalents ; Exténué = Fatigué, Hémorragique = Saignement, Empoisonné | **F2 : prévisualisation d'un État refusé** (« non magique ») avec reçu |
| Dégâts normaux, localisation adaptée par le MJ, Blessures Critiques = perte de fonction magique | normaux ; description libre | rappel |
| Soin : au rythme des autres personnages ; Soin et miracles sans effet, sorts de soin efficaces ; sort « Succour Magical Servant » (p. 27) | soin par sort seulement | F2 : un soin non magique est refusé ; le sort p. 27 : voir §6 (non cherché dans le catalogue V5) |
| Nourriture : ni nourriture ni eau | — | rappel |
| Corruption et Mutation comme un humain | normaux | rien de plus |
| Nombre de familiers : 1 ; 2ᵉ au prix de 2 points et CN 80 | — | saisie MJ : le lien enregistre juste le rang (1ᵉʳ, 2ᵉ) |
| Statut : aucun ; Brass 1 ; Silver 1 avec les porteurs de Savoir (Magie) ; Tests de Sociabilité Difficiles (−20 → **−2 DR**) avec des inconnus | −2 DR avec des inconnus | rappel de contexte social |
| Création de PJ familier : tirages de caractéristiques, Destin ou Résilience selon points du maître, 3+3 compétences | — | **hors périmètre** (création de personnage) : fiche importée |
| Avancement : carrières propres (Combat, Spell), pas de changement de carrière ; Puissance suit le Spell sans sorts ; PX partagés avec le maître | — | rappel ; pas d'avance automatique |
| Événements entre aventures partagés avec le maître ; Entreprise : bonus +10 → Avantage | — | rappel |
| Familier perdu : maître mort ou parti, le familier suit ou s'efface | — | rappel |
| Personnalités par Vent (d10) | — | texte d'ambiance, hors périmètre |

### 3.2 Animal (L02)

| Règle V4 | V5 / traitement | Automatisation |
|---|---|---|
| Distance de 4 yards entre maître et familier : au-delà, plus de Trait de compagnon ni d'Assistant animal ; envoi au loin par Emprise sur les animaux Facile (+20 → **+2 DR**) | portée **saisie par le MJ** (décision du 21/10) | F2 : état `inRange` du lien (booléen que le MJ pose), jamais calculé |
| Assistant animal : Focalisation, Langue (Magick), Survie en extérieur, Perception magique ; bonus normal, même si le familier ne connaît pas la compétence | **Avantage V5** | déjà posé ; devient conditionné par le lien et `inRange` |
| Trait de compagnon (espèce) : deux talents donnés au maître à 4 yards, **+1 SL** (→ +1 DR) si déjà connus ; cumul de plusieurs familiers autorisé ; effets de comportement ; effet secondaire de Corruption | talents donnés comme **effet** temporaire, `+1 DR` si le talent est déjà connu ; comportement et effets de Corruption en rappel | F2 : le lien « actif » (`inRange`) rend les deux talents au calcul des talents effectifs du maître |
| Sept espèces : Renard (Baratiner, Intrigant), Hibou (Visions divines, Sixième sens), Hermine (Œil du chasseur, Filature), Blaireau (Robuste, Tenace), Chat (Chat de gouttière, Vagabond), Corbeau (Flair, Maître du déguisement), Compagnon générique | table `COMPANION_TRAITS` | F2 : table dans le module, générée de l'inventaire E0-T-162 à 168 |
| Télépathie animale : portée 4 yards, limitée par l'Intelligence du familier | — | rappel |
| Messager : jusqu'à Intelligence miles, pas de test d'Intelligence | — | rappel |
| Partage sensoriel : vue, ouïe, odorat ; portée Volonté la plus faible en miles ; pas de lancement depuis son corps | — | rappel avec la portée calculée (min des deux Volontés) |
| Invisibilité (1/jour, Volonté heures, Perception −30 → **−3 DR**, Magical Sense pour repérer) | — | rappel + compteur journalier : **hors périmètre** (quota quotidien jamais automatisé, voir E-T12) |
| Corruption réciproque : exposition de l'un → test de l'autre ; mêmes sources = un seul jet chacun ; mort du familier : Calme Difficile (−20 → **−2 DR**) ou 2d10 Blessures hors Bonus d'Endurance et armure (elfes : Calme +0) + Psychologie de Traumatisme | la mort d'un familier lié **propose** au MJ le test de Calme (−2 DR, +0 pour un elfe), puis les dégâts ; le traumatisme reste au MJ | F2 : plan de mort du familier (reçu), dégâts saisis (d10 ×2 saisis), aucun tirage par l'appli |
| Mort du maître : le familier subit le même sort ; avec Destin dépensé, esprit de la nature | — | rappel |
| Familier de taille (Petit/Minuscule/Moyen) : Blessures (2×BE)+BVol | gabarits de taille : T10 | profil importé |
| Trouver, dresser, acheter (200/100 co), rituel Lien d'esprit | — | hors périmètre (campagne) |

## 4. Modèle de données

Un lien est une entrée durable côté **maître**, jamais déduite d'un nom :

`extensions.v5.familiarLinks[]` (maître) :
```
{ id, system: 'homunculus' | 'animal', familiarId, kind: 'combat' | 'power' | 'spell' (homoncule) | 'power' (animal),
  wind: 'aqshy' | … | null (homoncule), species: 'fox' | … | null (animal),
  rank: 1 | 2 | …, inRange: boolean (animal, saisi par le MJ), createdAt, source }
```
Côté **familier** : `extensions.v5.familiarOf = { masterId, linkId }`. Un familier a au plus un maître ; un maître peut avoir plusieurs familiers (rang). Les deux côtés sont posés et retirés **ensemble** par une seule commande annulable du store (même schéma que K2). Identités par `id` (jamais par nom).

Les familiers sont des participants ordinaires (profil importé ou PJ joué) : aucun nouveau type. Un participant de type PJ joué conserve sa fiche.

## 5. Services du module `js/core/familiars.js` (F2)

Module pur, rien ne s'écrit seul :
- `validateFamiliarLink(master, familiar, link)` : refuse un lien à soi-même, un familier déjà lié ailleurs, un lien d'animal qui n'est pas de Puissance, un type d'homoncule inconnu, un Vent hors liste.
- `linkedFamiliars(master, participants)` : liens résolus par identité.
- `familiarSupport(master, participants, skillName, context)` : remplace les deux cases manuelles de `familiarSkillSupport` — le lien **actif** (animal : `inRange` ; homoncule : toujours actif) alimente le contexte, le calcul existant n'est pas dupliqué.
- `companionTalents(master, participants)` : les deux talents de compagnon par lien animal actif ; talent déjà connu → +1 DR au lieu d'un doublon.
- `previewFamiliarCondition(familiar, etat, source)` : refus « non magique » pour Hémorragique, Exténué, Empoisonné et maladie d'un familier homoncule ; magique accepté.
- `previewFamiliarHealing(familiar, source)` : refus des soins non magiques (Soin, miracles, médecine) d'un familier homoncule.
- `planFamiliarDeath(master, familiar)` : reçu du traumatisme de l'animal (Calme −2 DR, +0 elfe, 2d10 saisis), rien appliqué.
- `familiarReminders(participant)` : les rappels du §3 non automatisés, avec reçu.

## 6. Points à ne pas inventer

- Le sort « Succour Magical Servant » (L17 p. 27) : non vérifié dans le catalogue V5 de l'appli ; le soin d'un familier par un sort de soin ordinaire est autorisé, sans recopier le sort.
- Les durées de dressage, accordage, prix, tables de recherche d'un animal : hors périmètre.
- Aucun seuil de distance en yards n'est calculé (« portée en saisie MJ »).

## 7. Cas de test (à écrire en tête du lot F2)

1. Un lien homoncule Puissance (Vent Aqshy) entre deux participants : `familiarSupport` pour Focalisation donne +2 DR au maître ; sans lien, 0 ; avec un Avantage de l'assistance normale, aucun cumul.
2. Un lien animal Blaireau, `inRange: true` : le maître reçoit Robuste et Tenace comme talents effectifs ; `inRange: false` : rien ; talent déjà connu : +1 DR.
3. Deux animaux Renard et Hibou liés ensemble : les quatre talents s'additionnent.
4. Un animal lié à un autre lanceur que le maître : refus.
5. Un familier déjà lié à un autre maître : refus ; un lien à soi-même : refus ; un type de Combat pour un animal : refus.
6. Création et retrait du lien : annulables, aucune ligne résiduelle (annuler/rétablir), identité par `id`.
7. Un homoncule : Hémorragique de source non magique refusé, de source magique accepté ; un soin de la compétence Soin refusé, un sort de soin accepté.
8. Familier Imprégné d'Aqshy : Embrasé sans dégâts ; feu des Vents de Ghur : inchangé.
9. Mort d'un animal lié : reçu avec Calme −2 DR (+0 pour un elfe), 2d10 hors BE et armure à saisir ; rien appliqué sans confirmation du MJ.
10. Persistance : exportation et réimportation d'un participant conservent les liens des deux côtés ; un export d'un participant sans lien ne les crée pas.
11. Partage sensoriel : portée en miles = min des Volontés (rappel chiffré).
12. Compatibilité : les cases manuelles `magicAssistantId` / `magicAssistantLinked` du jet restent valides pour un familier non lié (aucune régression des tests lot 3).

## 8. Variables persistantes

Au lot F2, ajouter à `docs/VARIABLES_PERSISTANTES_PJ.md` : `extensions.v5.familiarLinks[]` (maître) et `extensions.v5.familiarOf` (familier). Source sur la fiche : absente. Modifiées par : création/retrait de lien (MJ), basculement de portée (animal). Le lot F1 n'introduit aucune valeur : le document est une conception.

## 9. Choix d'interprétation à relire (consignés aussi dans `CHOIX_EXECUTANT_PHASE_E.md`, E-F1)

1. Les rangs 2 et plus de l'homoncule ne coûtent que de l'information ; l'appli ne vérifie ni sacrifice ni CN.
2. La portée de 4 yards est un booléen du MJ ; la télépathie, le messager et le partage sensoriel restent des rappels.
3. L'effet « talent du compagnon » donne les deux talents sans doublon ; un talent déjà connu donne +1 DR (le « +1 SL » imprimé).
4. Les États et soins refusés à un homoncule le sont par **prévisualisation** (reçu), pas par un blocage silencieux : le MJ garde la main.
