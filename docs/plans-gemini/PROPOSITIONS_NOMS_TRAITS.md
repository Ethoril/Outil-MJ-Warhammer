# Propositions de noms français des Traits de créature

21 octobre 2026 — Branche `gemini/lot2`.
Document préparatoire : **toutes les entrées marquées « Proposé » ainsi que les choix d'unification d'alias ci-dessous constituent des propositions soumises à l'arbitrage du MJ**, conformément à [`docs/ARBITRAGES_MJ_21_10.md`](../ARBITRAGES_MJ_21_10.md). Aucun fichier existant n'est modifié.

## Méthode et sources

- **Source de l'inventaire** : [`docs/BESTIAIRE_INVENTAIRE.json`](../BESTIAIRE_INVENTAIRE.json) et [`docs/BESTIAIRE_INVENTAIRE.md`](../BESTIAIRE_INVENTAIRE.md) (249 entrées `E0-T-001` à `E0-T-249`).
- **Socle V5 anglais (`L06`)** : *Livre de base V5 EN v2.pdf*, chapitre XII *Bestiary — Creature Traits*, pages imprimées **356 à 363** (pages physiques 356 à 363).
- **Référence française (`L05`)** : *Livre de base FR.pdf* (V4), chapitre XII *Bestiaire — Traits de créature*, pages imprimées **338 à 343**, correspondant aux **pages physiques 340 à 345** du PDF (décalage constant de **+2 pages physiques**).
- **Convention du tableau** : chaque table respecte les six colonnes demandées (`EN`, `FR retenu`, `Statut attesté/proposé`, `Page L05`, `Alternatives`, `Raison`). La colonne `Page L05` indique la page imprimée suivie de la page physique entre parenthèses, par ex. `p. 339 (phys. 341)`, ou `— (absent L05)` lorsque le Trait n'existe pas dans `L05`.

---

## 1. Traitement explicite des doublons, collisions et Traits sans nom L05 (`E0-Q02`, `E0-Q10`, `E0-Q18`)

### 1.1. `Effrayé (Cible)` / `Craintif` / `Nerveux` (`Afraid (Target)` vs `Skittish`)

Deux Traits distincts du livre de base ont été partiellement confondus sous l'étiquette `Craintif` dans certains fichiers du dépôt :

1. **`Afraid (Target)` (`E0-T-001`, L06 p. 356)** : la créature subit la Peur face à une cible désignée (ex. Gobelin face aux Elfes). Dans `L05` p. 339 (phys. 341), ce Trait est officiellement intitulé **`Effrayé (Cible)`**. Pourtant, dans `docs/BESTIAIRE_INVENTAIRE.md` (profil Gobelin p. 316, capacités `E0-T-098` *Borrowed Courage* et `E0-T-115` *Master of the Lash*), il est parfois appelé `Craintif`.
2. **`Skittish` (`E0-T-047`, L06 p. 361)** : la créature reçoit `+3` États `Brisé` face aux effets magiques spectaculaires ou aux bruits violents. Dans `L05` p. 340 (phys. 342) — ainsi que dans le texte de `Dressé (Guerre)` et `Dressé (Magie)` à la p. 339 —, ce Trait est officiellement intitulé **`Nerveux`**. Or, dans [`js/data/v5-transformation-bestiary.js`](../../js/data/v5-transformation-bestiary.js) (Sanglier, Chien, Rat géant, Cheval, Loup, et note ligne 208) et [`js/data/v5-spell-contracts.json`](../../js/data/v5-spell-contracts.json) (ligne 7896), `Skittish` a été traduit par **`Craintif`**.

- **Proposition retenue** :
  - Retenir **`Effrayé (Cible)`** (attesté `L05` p. 339) pour `Afraid (Target)` (`E0-T-001`).
  - Retenir **`Nerveux`** (attesté `L05` p. 340) pour `Skittish` (`E0-T-047`).
  - Traiter **`Craintif`** uniquement comme un **alias hérité à désambiguïser** selon la présence ou non d'une cible : `Craintif (Cible)` → `Effrayé (Cible)` (`Afraid`), et `Craintif` sans paramètre (bêtes de `v5-transformation-bestiary.js`) → `Nerveux` (`Skittish`).
- **Alternatives pour le MJ** : conserver `Craintif` comme nom d'affichage de `Skittish` (pour ne pas toucher aux libellés de `v5-transformation-bestiary.js`), ou conserver `Craintif (Cible)` pour `Afraid (Target)`.

### 1.2. `Grimpant` / `Grimpeur` (`Wallcrawler` vs Talent `Scale Sheer Surface`)

- **Constat dans les sources et le code** :
  - Dans `L05` p. 339 (phys. 341), le Trait de créature `Wallcrawler` (`E0-T-067`, L06 p. 363) est officiellement traduit par **`Grimpant`**.
  - Dans `L05` p. 140 (phys. 142), le nom **`Grimpeur`** est déjà pris par le **Talent de personnage** `Scale Sheer Surface` (référencé sous `"name": "Grimpeur"` dans [`js/data/v5-talent-coverage.json`](../../js/data/v5-talent-coverage.json)).
  - Dans [`js/data/v5-transformation-bestiary.js`](../../js/data/v5-transformation-bestiary.js) (lignes 54 et 204, Araignée géante), `Wallcrawler` a été saisi sous le nom **`Grimpeur`**.
- **Proposition retenue** :
  - Retenir **`Grimpant`** (attesté `L05` p. 339) pour le Trait de créature `Wallcrawler` (`E0-T-067`), ce qui évite toute collision d'identifiant avec le Talent `Grimpeur` (`Scale Sheer Surface`).
  - Reconnaître **`Grimpeur`** comme alias de lecture sur un profil de créature afin de préserver la compatibilité avec `v5-transformation-bestiary.js`.
- **Alternatives pour le MJ** : unifier l'affichage sur `Grimpeur` si l'homonymie avec le Talent `Scale Sheer Surface` est jugée acceptable, ou proposer `Grimpeur mural`.

### 1.3. `Foulée` / `Sprinter` / `Striding Gait (Terrain)` / `Stride` / `Arboricole` / `Limicole`

Le passage de la V4 (`L05`/`L11`) à la V5 (`L06` p. 361) a réorganisé deux mécaniques distinctes de déplacement :

1. **Course multipliée par 1,5 (`Stride` en V4 → `Sprinter` en V5)** :
   - En V4 (`L05` p. 339 / `L11` p. 137, `E0-T-084`), le Trait s'appelle `Stride` en anglais et **`Foulée`** en français (« *La créature effectue de grandes foulées… Multipliez son Mouvement de charge de 1,5 quand elle Court* »).
   - En V5 (`L06` p. 361, `E0-T-049`), le même texte exact (« *The creature has a long stride… Multiply Run Movement by 1.5 when Running* ») a été renommé en anglais **`Sprinter`** pour éviter la confusion avec `Striding Gait (Terrain)`.
2. **Aisance dans un terrain donné (`Arboreal` + `Swamp-strider` en V4 → `Striding Gait (Terrain)` en V5)** :
   - En V4 (`L05` pp. 338 et 340), l'aisance de terrain était divisée entre **`Arboricole`** (`Arboreal`, `E0-T-069`) et **`Limicole`** (`Swamp-strider`, `E0-T-085`). Parallèlement, le Talent de personnage `Strider (Terrain)` est traduit dans `L05` p. 141 par **`Marcheur (Terrain)`**.
   - En V5 (`L06` p. 361, `E0-T-051`), les Traits de terrain de créature sont unifiés sous **`Striding Gait (Terrain)`** (aucune pénalité de mouvement dans le terrain indiqué et `+1 DR` aux Tests d'Athlétisme et de Discrétion dans ce terrain).
   - Dans le code actuel ([`js/data/v5-transformation-bestiary.js`](../../js/data/v5-transformation-bestiary.js) lignes 56, 96, 120, 192 et [`js/data/v5-spell-contracts.json`](../../js/data/v5-spell-contracts.json) lignes 6835, 7273, 8410), `Striding Gait (Terrain)` et le Talent `Strider` sont souvent appelés **`Foulée (Forêts)`** / **`Foulée (Marais)`**.

- **Proposition retenue** :
  - Pour **`Sprinter` (`E0-T-049`, L06 p. 361)** et son ancêtre V4 **`Stride` (`E0-T-084`)** : retenir **`Foulée`** (attesté `L05` p. 339 pour cette mécanique exacte), avec **`Sprinteur`** en première alternative si le MJ préfère calquer le renommage anglais V5.
  - Pour **`Striding Gait (Terrain)` (`E0-T-051`, L06 p. 361)** : retenir **`Foulée adaptée (Terrain)`** (qui distingue immédiatement le Trait de terrain du multiplicateur de course `Foulée`), tout en reconnaissant **`Foulée (Terrain)`** (déjà présent dans `v5-transformation-bestiary.js`) et **`Marcheur (Terrain)`** (calqué sur le Talent `L05` p. 141) comme alternatives et alias de lecture.
  - Pour **`Arboreal` (`E0-T-069`)** et **`Swamp-strider` (`E0-T-085`)** : conserver leurs noms attestés **`Arboricole`** (`L05` p. 338) et **`Limicole`** (`L05` p. 340) à l'import V4, avec équivalence mécanique V5 vers `Foulée adaptée (Forêts)` et `Foulée adaptée (Marais)`.

### 1.4. Autres alias relevés entre `L05` et le code existant (`E0-Q10`, `E0-Q18`)

- **`Construct` (`E0-T-014`, L06 p. 357)** : attesté **`Fabriqué`** dans `L05` p. 339 (phys. 341), mais appelé **`Artificiel`** dans `v5-transformation-bestiary.js` (Bête des fanges, lignes 133 et 212). Proposition : retenir **`Fabriqué`** (attesté `L05`) et maintenir **`Artificiel`** comme alias reconnu par le moteur.
- **`Dark Vision` (`E0-T-017`, L06 p. 357)** : attesté **`Infravision`** dans `L05` p. 340 (phys. 342), mais appelé **`Vision dans le noir`** dans `v5-transformation-bestiary.js` (ligne 133). Proposition : retenir **`Infravision`** (attesté `L05`) et accepter `Vision dans le noir` en alias.
- **`Infestation` (`E0-T-033`, L06 p. 359)** : attesté **`Parasité`** dans `L05` p. 340 (phys. 342), mais appelé **`Infestation`** dans `v5-transformation-bestiary.js` (lignes 120, 134, 145, 192). Proposition : retenir **`Parasité`** (attesté `L05`) et accepter `Infestation` en alias.
- **`Trained (Broken)` (`E0-T-060`, L06 p. 363)** : attesté **`Dressé (Dompté)`** dans `L05` p. 339 (phys. 341), mais transcrit `Dressé (Brisé, ...)` dans `v5-transformation-bestiary.js`. Proposition : retenir **`Dressé (Dompté)`** pour éviter toute confusion avec l'État `Brisé` (`Broken Condition`).

### 1.5. Traits du livre de base V5 (`L06`) absents de `L05` (et vérifications d'attestation)

Le contrôle direct de `L05` pp. 338–343 (phys. 340–345) montre que :
- **Trois Traits marqués à vérifier dans l'inventaire initial sont en réalité attestés mot pour mot dans `L05`** :
  - `Mental Corruption` (`E0-T-038`, L06 p. 359) → **`Corruption mentale`**, attesté dans `L05` **p. 339 (phys. 341)**.
  - `# Tentacles` (`E0-T-055`, L06 p. 362) → **`# Tentacules (Indice)`**, attesté dans `L05` **p. 343 (phys. 345)**.
  - `Ward (Rating)` (`E0-T-066`, L06 p. 363) → **`Protection (Indice)`**, attesté dans `L05` **p. 341 (phys. 343)**.
- **Quatre Traits du livre de base V5 (`L06`) n'ont aucune entrée dans `L05` pp. 338–343** et reçoivent donc un nom **Proposé** :
  1. **`Grim` (`E0-T-026`, L06 p. 358)** → **`Féroce`** (alternatives : `Acharné`, `Inflexible` ; *note : `Implacable` est écarté en premier choix car déjà pris par le Talent `Implacable` dans `L05` p. 140*).
  2. **`Many Heads (Number)` (`E0-T-034`, L06 p. 359)** → **`Plusieurs têtes (Nombre)`** (alternatives : `Têtes multiples (Nombre)`, `Polyphalie (Nombre)`).
  3. **`Mark of Chaos (God)` (`E0-T-035`, L06 p. 359)** → **`Marque du Chaos (Dieu)`** (alternatives : `Marque chaotique (Dieu)`, `Sceau du Chaos (Dieu)`).
  4. **`Striding Gait (Terrain)` (`E0-T-051`, L06 p. 361)** → **`Foulée adaptée (Terrain)`** (alternatives : `Foulée (Terrain)`, `Marcheur (Terrain)`).

---

## 2. Traits de créature du livre de base V5 (`L06` pp. 356–363, `E0-T-001` à `E0-T-068`)

| EN | FR retenu | Statut attesté/proposé | Page L05 | Alternatives | Raison |
| --- | --- | --- | --- | --- | --- |
| `E0-T-001` — Afraid (Target) (L06 p. 356) | **Effrayé (Cible)** | Attesté | p. 339 (phys. 341) | Craintif (Cible), Peureux (Cible) | Nom officiel L05 p. 339 ; distingue ce Trait ciblé de Nerveux (Skittish), tous deux parfois appelés Craintif. |
| `E0-T-002` — Amphibious (L06 p. 356) | **Amphibie** | Attesté | p. 338 (phys. 340) | Amphibien | Nom officiel L05 p. 338 et déjà utilisé dans v5-transformation-bestiary.js. |
| `E0-T-003` — Animosity (Target) (L06 p. 356) | **Animosité (Cible)** | Attesté | p. 338 (phys. 340) | Hostilité (Cible) | Nom officiel L05 p. 338, aligné sur la règle de Psychologie p. 190. |
| `E0-T-004` — Belligerent (L06 p. 356) | **Belliqueux** | Attesté | p. 338 (phys. 340) | Querelleur, Agressif | Nom officiel L05 p. 338 et déjà utilisé dans v5-transformation-bestiary.js. |
| `E0-T-005` — Bestial (L06 p. 356) | **Bestial** | Attesté | p. 338 (phys. 340) | Animal, Sauvage | Nom officiel L05 p. 338, universellement utilisé dans le moteur. |
| `E0-T-006` — Bite (L06 p. 356) | **Morsure (Indice)** | Attesté | p. 340 (phys. 342) | Morsure | Nom officiel L05 p. 340. |
| `E0-T-007` — Blessed (Deity) (L06 p. 356) | **Béni (Divinité)** | Attesté | p. 338 (phys. 340) | Béni (Divers) | Nom officiel L05 p. 338 (« Béni (Divers) »), aligné sur le Talent Béni. |
| `E0-T-008` — Bounce (L06 p. 357) | **Bond** | Attesté | p. 338 (phys. 340) | Bondissant, Rebond | Nom officiel L05 p. 338. |
| `E0-T-009` — Breath (L06 p. 357) | **Souffle (Indice) (Type)** | Attesté | p. 341 (phys. 343) | Souffle | Nom officiel L05 p. 341. |
| `E0-T-010` — Champion (L06 p. 357) | **Champion** | Attesté | p. 338 (phys. 340) | Duelliste, Élu | Nom officiel L05 p. 338. |
| `E0-T-011` — Chill Grasp (L06 p. 357) | **Étreinte glaciale** | Attesté | p. 339 (phys. 341) | Poigne glaciale, Toucher glacial | Nom officiel L05 p. 339. |
| `E0-T-012` — Cold-blooded (L06 p. 357) | **À sang-froid** | Attesté | p. 338 (phys. 340) | Sang-froid | Nom officiel L05 p. 338. |
| `E0-T-013` — Constrictor (L06 p. 357) | **Constricteur** | Attesté | p. 338 (phys. 340) | Étouffeur, Enserreur | Nom officiel L05 p. 338. |
| `E0-T-014` — Construct (L06 p. 357) | **Fabriqué** | Attesté | p. 339 (phys. 341) | Artificiel (alias code), Créature artificielle | Nom officiel L05 p. 339 ; Artificiel (utilisé dans v5-transformation-bestiary.js) est conservé en alias. |
| `E0-T-015` — Corrosive Blood (L06 p. 357) | **Sang corrosif** | Attesté | p. 341 (phys. 343) | Sang acide | Nom officiel L05 p. 341. |
| `E0-T-016` — Corruption (Strength) (L06 p. 357) | **Corruption (Degré)** | Attesté | p. 338 (phys. 340) | Corruption (Force) | Nom officiel L05 p. 338. |
| `E0-T-017` — Dark Vision (L06 p. 357) | **Infravision** | Attesté | p. 340 (phys. 342) | Vision dans le noir (alias code), Vision obscure | Nom officiel L05 p. 340 ; Vision dans le noir (v5-transformation-bestiary.js) est conservé en alias. |
| `E0-T-018` — Daemonic (Rating) (L06 p. 357) | **Démoniaque (Indice)** | Attesté | p. 339 (phys. 341) | Démoniaque | Nom officiel L05 p. 339. |
| `E0-T-019` — Disease (Type) (L06 p. 358) | **Maladie (Type)** | Attesté | p. 340 (phys. 342) | Porteur de maladie (Type) | Nom officiel L05 p. 340. |
| `E0-T-020` — Distracting (L06 p. 358) | **Perturbant** | Attesté | p. 341 (phys. 343) | Distraction, Déstabilisant | Nom officiel L05 p. 341. |
| `E0-T-021` — Ethereal (L06 p. 358) | **Éthéré** | Attesté | p. 339 (phys. 341) | Immatériel, Spectral | Nom officiel L05 p. 339. |
| `E0-T-022` — Fear (Rating) (L06 p. 358) | **Peur (Indice)** | Attesté | p. 341 (phys. 343) | Peur | Nom officiel L05 p. 341. |
| `E0-T-023` — Fly (Rating) (L06 p. 358) | **Vol (Indice)** | Attesté | p. 343 (phys. 345) | Vol | Nom officiel L05 p. 343. |
| `E0-T-024` — Frenzy (L06 p. 358) | **Frénésie** | Attesté | p. 339 (phys. 341) | Frénétique | Nom officiel L05 p. 339. |
| `E0-T-025` — Ghostly Howl (L06 p. 358) | **Hurlement fantomatique** | Attesté | p. 339 (phys. 341) | Hurlement spectral, Cri funèbre | Nom officiel L05 p. 339. |
| `E0-T-026` — Grim (L06 p. 358) | **Féroce** | Proposé | — (absent L05) | Acharné, Inflexible (ou Implacable) | Trait introduit en supplément V4 (L07/L17) et promu au socle V5 ; Féroce évite la collision avec le Talent Implacable (L05 p. 140). |
| `E0-T-027` — Hatred (Target) (L06 p. 358) | **Haine (Cible)** | Attesté | p. 339 (phys. 341) | Haine | Nom officiel L05 p. 339. |
| `E0-T-028` — Horns (L06 p. 358) | **Cornes (Aspect), (Indice)** | Attesté | p. 338 (phys. 340) | Cornes | Nom officiel L05 p. 338. |
| `E0-T-029` — Hungry (L06 p. 358) | **Affamé** | Attesté | p. 338 (phys. 340) | Vorace, Carnassier | Nom officiel L05 p. 338. |
| `E0-T-030` — Immune to Psychology (L06 p. 358) | **Immunité Psychologique** | Attesté | p. 340 (phys. 342) | Immunisé à la Psychologie | Nom officiel L05 p. 340. |
| `E0-T-031` — Immunity (Type) (L06 p. 358) | **Immunité (Type)** | Attesté | p. 339 (phys. 341) | Immunisé (Type) | Nom officiel L05 p. 339. |
| `E0-T-032` — Infected (L06 p. 359) | **Infecté** | Attesté | p. 340 (phys. 342) | Infectieux, Septicémique | Nom officiel L05 p. 340. |
| `E0-T-033` — Infestation (L06 p. 359) | **Parasité** | Attesté | p. 340 (phys. 342) | Infestation (alias code), Vermineux | Nom officiel L05 p. 340 ; Infestation (utilisé dans v5-transformation-bestiary.js) est conservé en alias. |
| `E0-T-034` — Many Heads (Number) (L06 p. 359) | **Plusieurs têtes (Nombre)** | Proposé | — (absent L05) | Têtes multiples (Nombre), Polycéphale (Nombre) | Trait issu de L09 p. 47 et promu au socle V5 ; Plusieurs têtes est déjà le terme retenu dans ARBITRAGES_MJ_21_10.md. |
| `E0-T-035` — Mark of Chaos (God) (L06 p. 359) | **Marque du Chaos (Dieu)** | Proposé | — (absent L05) | Marque chaotique (Dieu), Sceau du Chaos (Dieu) | Absent des Traits de L05 pp. 338-343 ; traduction canonique de l'univers Warhammer. |
| `E0-T-036` — Magical (L06 p. 359) | **Magique** | Attesté | p. 340 (phys. 342) | Imprégné de magie | Nom officiel L05 p. 340. |
| `E0-T-037` — Magic Resistance (L06 p. 359) | **Résistance à la Magie** | Attesté | p. 341 (phys. 343) | Résistance magique (alias code) | Nom officiel L05 p. 341 (sans indice chiffré en V5 L06 p. 359 où le malus fixe vaut -3 DR). |
| `E0-T-038` — Mental Corruption (L06 p. 359) | **Corruption mentale** | Attesté | p. 339 (phys. 341) | Corruption de l'esprit | Attesté mot pour mot dans L05 p. 339 (phys. 341). |
| `E0-T-039` — Miracles (Deity) (L06 p. 359) | **Miracles (Divinité)** | Attesté | p. 340 (phys. 342) | Miracles (Divers) | Nom officiel L05 p. 340 (« Miracles (Divers) »). |
| `E0-T-040` — Mutation (L06 p. 360) | **Mutation** | Attesté | p. 340 (phys. 342) | Mutant | Nom officiel L05 p. 340. |
| `E0-T-041` — Night Vision (L06 p. 360) | **Vision nocturne** | Attesté | p. 343 (phys. 345) | Nyctalopie | Nom officiel L05 p. 343, aligné sur le Talent homonyme. |
| `E0-T-042` — Painless (L06 p. 360) | **Insensible à la douleur** | Attesté | p. 340 (phys. 342) | Indolore (alias LOT4) | Nom officiel L05 p. 340 ; Indolore (employé dans LOT4_TRADITIONS_BASE) est à mapper dessus. |
| `E0-T-043` — Petrifying Gaze (L06 p. 360) | **Regard pétrifiant** | Attesté | p. 341 (phys. 343) | Œil pétrifiant | Nom officiel L05 p. 341. |
| `E0-T-044` — Regeneration (L06 p. 360) | **Régénération** | Attesté | p. 341 (phys. 343) | Régénérant | Nom officiel L05 p. 341. |
| `E0-T-045` — Size (Various) (L06 p. 360) | **Taille (Divers)** | Attesté | p. 342 (phys. 344) | Taille (Catégorie) | Nom officiel L05 p. 342. |
| `E0-T-046` — Stomp (L06 p. 361) | **Piétinement** | Attesté | p. 343 (phys. 345) | Écrasement | Nom officiel L05 p. 343. |
| `E0-T-047` — Skittish (L06 p. 361) | **Nerveux** | Attesté | p. 340 (phys. 342) | Craintif (alias code), Farouche | Nom officiel L05 p. 340 ; évite la confusion avec Effrayé (Afraid). Craintif reste reconnu en alias. |
| `E0-T-048` — Spellcaster (Various) (L06 p. 361) | **Lanceur de Sorts (Divers)** | Attesté | p. 340 (phys. 342) | Jeteur de sorts (Domaine) | Nom officiel L05 p. 340. |
| `E0-T-049` — Sprinter (L06 p. 361) | **Foulée** | Attesté | p. 339 (phys. 341) | Sprinteur, Course rapide | L06 a renommé Stride en Sprinter en gardant le texte exact de Foulée (L05 p. 339 : course ×1,5). Sprinteur est l'alternative si l'on réserve Foulée à Striding Gait. |
| `E0-T-050` — Stealthy (L06 p. 361) | **Furtif** | Attesté | p. 339 (phys. 341) | Discret | Nom officiel L05 p. 339. |
| `E0-T-051` — Striding Gait (Terrain) (L06 p. 361) | **Foulée adaptée (Terrain)** | Proposé | — (absent L05) | Foulée (Terrain) (alias code), Marcheur (Terrain) | Nouveau Trait V5 fusionnant Arboricole et Limicole ; Foulée adaptée évite la collision avec Foulée (Sprinter/Stride). |
| `E0-T-052` — Stupid (L06 p. 362) | **Stupide** | Attesté | p. 341 (phys. 343) | Borné, Abruti | Nom officiel L05 p. 341. |
| `E0-T-053` — Swarm (L06 p. 362) | **Nuée** | Attesté | p. 340 (phys. 342) | Essaim | Nom officiel L05 p. 340. |
| `E0-T-054` — Tail (L06 p. 362) | **Attaque caudale (Indice)** | Attesté | p. 338 (phys. 340) | Queue (alias code) | Nom officiel L05 p. 338. |
| `E0-T-055` — # Tentacles (L06 p. 362) | **# Tentacules (Indice)** | Attesté | p. 343 (phys. 345) | Tentacules (Nombre) | Attesté mot pour mot dans L05 p. 343 (phys. 345) sous « # Tentacules (Indice) ». |
| `E0-T-056` — Territorial (L06 p. 362) | **Territorial** | Attesté | p. 343 (phys. 345) | Gardien de territoire | Nom officiel L05 p. 343. |
| `E0-T-057` — Terror (Rating) (L06 p. 362) | **Terreur (Indice)** | Attesté | p. 343 (phys. 345) | Terreur | Nom officiel L05 p. 343. |
| `E0-T-058` — Tongue (L06 p. 362) | **Langue préhensile (Indice) (Portée)** | Attesté | p. 340 (phys. 342) | Langue préhensile | Nom officiel L05 p. 340. |
| `E0-T-059` — Tracker (L06 p. 363) | **Pisteur** | Attesté | p. 341 (phys. 343) | Traqueur, Limier | Nom officiel L05 p. 341. |
| `E0-T-060` — Trained (Trained Skills) (L06 p. 363) | **Dressé (Compétences spécifiques)** | Attesté | p. 339 (phys. 341) | Dressé (Disciplines) | Nom officiel L05 p. 339 (sous-disciplines L05 : Divertir, Dompté, Garder, Guerre, Magie, Monture, Rapporter, Revenir à la maison, Trait). |
| `E0-T-061` — Undead (L06 p. 363) | **Mort-vivant** | Attesté | p. 340 (phys. 342) | Non-mort | Nom officiel L05 p. 340. |
| `E0-T-062` — Unstable (L06 p. 363) | **Instable** | Attesté | p. 340 (phys. 342) | Évanescent | Nom officiel L05 p. 340. |
| `E0-T-063` — Vampiric (L06 p. 363) | **Vampirique** | Attesté | p. 343 (phys. 345) | Buveur de sang | Nom officiel L05 p. 343. |
| `E0-T-064` — Venom (Difficulty) (L06 p. 363) | **Venin (Difficulté)** | Attesté | p. 343 (phys. 345) | Venimeux (Difficulté) | Nom officiel L05 p. 343. |
| `E0-T-065` — Vomit (L06 p. 363) | **Vomissement** | Attesté | p. 343 (phys. 345) | Vomi (alias code), Régurgitation | Nom officiel L05 p. 343. |
| `E0-T-066` — Ward (Rating) (L06 p. 363) | **Protection (Indice)** | Attesté | p. 341 (phys. 343) | Sauvegarde invulnérable (Indice), Garde (Indice) | Attesté mot pour mot dans L05 p. 341 (phys. 343) sous « Protection (Indice) ». |
| `E0-T-067` — Wallcrawler (L06 p. 363) | **Grimpant** | Attesté | p. 339 (phys. 341) | Grimpeur (alias code), Escaladeur mural | Nom officiel L05 p. 339 ; évite la collision avec le Talent Grimpeur (Scale Sheer Surface, L05 p. 140). |
| `E0-T-068` — Web (Rating) (L06 p. 363) | **Toile (Indice)** | Attesté | p. 343 (phys. 345) | Toile | Nom officiel L05 p. 343. |

---

## 3. Traits de créature V4 attestés dans `L05` et repris dans `L11` (`E0-T-069` à `E0-T-087`)

| EN | FR retenu | Statut attesté/proposé | Page L05 | Alternatives | Raison |
| --- | --- | --- | --- | --- | --- |
| `E0-T-069` — Arboreal (L11 p. 135) | **Arboricole** | Attesté | p. 338 (phys. 340) | Foulée adaptée (Forêts) (équivalent V5) | Nom officiel L05 p. 338 ; remplacé en V5 par Striding Gait (Woodland). |
| `E0-T-070` — Armour (Rating) (L11 p. 135) | **Armure (Indice)** | Attesté | p. 338 (phys. 340) | Armure | Nom officiel L05 p. 338 ; intégré au bloc Armure du profil en V5. |
| `E0-T-071` — Big (L11 p. 135) | **Grand** | Attesté | p. 339 (phys. 341) | Massif, Corpulent | Nom officiel L05 p. 339 (gabarit de spécimen imposant). |
| `E0-T-072` — Brute (L11 p. 135) | **Brutal** | Attesté | p. 338 (phys. 340) | Brute, Lourd | Nom officiel L05 p. 338. |
| `E0-T-073` — Clever (L11 p. 135) | **Intelligent** | Attesté | p. 340 (phys. 342) | Malin, Vif d'esprit | Nom officiel L05 p. 340. |
| `E0-T-074` — Cunning (L11 p. 135) | **Rusé** | Attesté | p. 341 (phys. 343) | Sournois, Astucieux | Nom officiel L05 p. 341. |
| `E0-T-075` — Die Hard (L11 p. 135) | **Increvable** | Attesté | p. 340 (phys. 342) | Dur à cuire, Insubmersible | Nom officiel L05 p. 340. |
| `E0-T-076` — Elite (L11 p. 135) | **Élite** | Attesté | p. 339 (phys. 341) | Vétéran, Aguerri | Nom officiel L05 p. 339. |
| `E0-T-077` — Fast (L11 p. 135) | **Rapide** | Attesté | p. 341 (phys. 343) | Véloce, Prompt | Nom officiel L05 p. 341. |
| `E0-T-078` — Fury (L11 p. 136) | **Rage** | Attesté | p. 341 (phys. 343) | Fureur, Furie | Nom officiel L05 p. 341. |
| `E0-T-079` — Hardy (L11 p. 136) | **Coriace** | Attesté | p. 338 (phys. 340) | Endurant (attention : inversion L05 Tough/Hardy) | Nom officiel L05 p. 338 (note : L05 a croisé les textes de Coriace [+10 E/FM] et Endurant [+BE Blessures] par rapport à l'anglais Hardy/Tough). |
| `E0-T-080` — Leader (L11 p. 136) | **Meneur** | Attesté | p. 340 (phys. 342) | Chef, Commandant | Nom officiel L05 p. 340. |
| `E0-T-081` — Prejudice (Target) (L11 p. 136) | **Préjugé (Cible)** | Attesté | p. 341 (phys. 343) | Parti pris (Cible) | Nom officiel L05 p. 341. |
| `E0-T-082` — Ranged (Rating) (L11 p. 136) | **À distance (Indice) (Portée)** | Attesté | p. 338 (phys. 340) | Attaque à distance (Indice) | Nom officiel L05 p. 338 ; intégré au bloc Attaques en V5. |
| `E0-T-083` — Rear (L11 p. 136) | **Se cabrer** | Attesté | p. 341 (phys. 343) | Cabrade, Ruade | Nom officiel L05 p. 341. |
| `E0-T-084` — Stride (L11 p. 137) | **Foulée** | Attesté | p. 339 (phys. 341) | Grandes foulées, Sprinteur (renommage V5) | Nom officiel L05 p. 339 ; renommé Sprinter en V5 L06 p. 361 avec le même effet. |
| `E0-T-085` — Swamp-strider (L11 p. 137) | **Limicole** | Attesté | p. 340 (phys. 342) | Marcheur des marais, Foulée adaptée (Marais) | Nom officiel L05 p. 340 ; remplacé en V5 par Striding Gait (Marshland). |
| `E0-T-086` — Tough (L11 p. 137) | **Endurant** | Attesté | p. 339 (phys. 341) | Robuste, Résistant | Nom officiel L05 p. 339 (voir note sur E0-T-079 Coriace/Endurant). |
| `E0-T-087` — Weapon (Rating) (L11 p. 137) | **Arme (Indice)** | Attesté | p. 338 (phys. 340) | Arme naturelle (Indice) | Nom officiel L05 p. 338 ; intégré au bloc Attaques en V5. |

---

## 4. Traits, variantes et capacités de profils des suppléments (`E0-T-088` à `E0-T-249`)

| EN | FR retenu | Statut attesté/proposé | Page L05 | Alternatives | Raison |
| --- | --- | --- | --- | --- | --- |
| `E0-T-088` — Belligerent — Zoo (L11 p. 135) | **Belliqueux (variante Zoo)** | Proposé (base attestée L05) | p. 338 (phys. 340) (base) | Belliqueux V4 | Reprend le nom officiel L05 p. 338 en qualifiant la variante V4 du Zoo (écrasée en jeu par la version V5 selon ARBITRAGES_MJ_21_10.md). |
| `E0-T-089` — Amphibious — Zoo (L11 p. 135) | **Amphibie (variante Zoo)** | Proposé (base attestée L05) | p. 338 (phys. 340) (base) | Amphibie V4 | Reprend le nom officiel L05 p. 338 avec mention de la variante V4. |
| `E0-T-090` — Ghostly Howl — Zoo (L11 p. 136) | **Hurlement fantomatique (variante Zoo)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base) | Hurlement fantomatique V4 | Reprend le nom officiel L05 p. 339 avec mention de la variante V4. |
| `E0-T-091` — Size — Zoo (L11 p. 136) | **Taille (variante Zoo)** | Proposé (base attestée L05) | p. 342 (phys. 344) (base) | Taille V4 | Reprend le nom officiel L05 p. 342 avec mention de la variante V4. |
| `E0-T-092` — Unstable — Zoo (L11 p. 137) | **Instable (variante Zoo)** | Proposé (base attestée L05) | p. 340 (phys. 342) (base) | Instable V4 | Reprend le nom officiel L05 p. 340 avec mention de la variante V4. |
| `E0-T-093` — Magic Resistance — Zoo (L11 p. 136) | **Résistance à la Magie (variante Zoo)** | Proposé (base attestée L05) | p. 341 (phys. 343) (base) | Résistance à la Magie (Indice) V4 | Reprend le nom officiel L05 p. 341 avec mention de la variante à indice V4. |
| `E0-T-094` — Chill Grasp — Zoo (L11 p. 135) | **Étreinte glaciale (variante Zoo)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base) | Étreinte glaciale V4 | Reprend le nom officiel L05 p. 339 avec mention de la variante V4. |
| `E0-T-095` — Vomit — Zoo (L11 p. 137) | **Vomissement (variante Zoo)** | Proposé (base attestée L05) | p. 343 (phys. 345) (base) | Vomissement V4 | Reprend le nom officiel L05 p. 343 avec mention de la variante V4. |
| `E0-T-096` — Spiteful (L11 p. 13) | **Rancunier** | Proposé | — (absent L05) | Malveillant, Vindicatif | Traduit fidèlement la Haine durable envers les anciens adversaires du profil. |
| `E0-T-097` — Snare ‘Em Good (L11 p. 15) | **Bien les piéger** | Proposé | — (absent L05) | Ficeler tout ça, Piégeage arachnéen | Rend le registre familier gobelin du nom anglais tout en évoquant l'effet d'entrave. |
| `E0-T-098` — Borrowed Courage (L11 p. 15) | **Courage emprunté** | Proposé | — (absent L05) | Bravoure d'emprunt, Hardiesse en selle | Traduction directe et transparente de la capacité du chevaucheur d'araignée. |
| `E0-T-099` — Strength of the Pack (L11 p. 17) | **Force de la meute** | Proposé | — (absent L05) | Puissance de la meute, Loi de la meute | Traduction naturelle pour le bonus de surnombre des grands loups. |
| `E0-T-100` — His Own Pack (L11 p. 17) | **Meute à lui seul** | Proposé | — (absent L05) | Sa propre meute, Loup solitaire massif | Exprime clairement la mécanique où Raukos compte double en surnombre. |
| `E0-T-101` — The Bone Hump (L11 p. 19) | **La Bosse d'os** | Proposé | — (absent L05) | Bosse osseuse, Échine cuirassée | Traduction littérale de la particularité anatomique d'Ol' Gribbleback. |
| `E0-T-102` — Piercing Cry (L11 p. 21) | **Cri perçant** | Proposé | — (absent L05) | Hurlement strident, Cri déchirant | Traduction directe du cri assourdissant/étourdissant en charge. |
| `E0-T-103` — Swiftsense (L11 p. 21) | **Sens vifs** | Proposé | — (absent L05) | Réflexes fulgurants, Serres véloces | Rend le composé anglais qualifiant la rapidité des serres du griffon. |
| `E0-T-104` — Swallow Whole (L11 p. 23) | **Avaler tout rond** | Proposé | — (absent L05) | Engloutissement, Gober d'un trait | Expression française idiomatique des bestiaires médiévaux-fantastiques. |
| `E0-T-105` — Burrow (L11 p. 23) | **Fouisseur (Indice)** | Proposé | — (absent L05) | Creusement (Indice), Enfouissement (Indice) | Adjectif/nom zoologique standard en français (parallèle à Grimpant et Limicole dans L05). |
| `E0-T-106` — Too Ornery to Die (L11 p. 25) | **Trop teigneux pour mourir** | Proposé | — (absent L05) | Trop têtu pour crever, Mauvaise tête increvable | Conserve le registre familier et obstiné de l'anglais « ornery ». |
| `E0-T-107` — Harder Than Stone (L11 p. 25) | **Plus dur que la pierre** | Proposé | — (absent L05) | Dur comme le roc, Cuirasse de granit | Traduction directe de l'armure impénétrable de Krag-Breaker. |
| `E0-T-108` — A Fool’s End (L11 p. 30) | **Fin d'un sot** | Proposé | — (absent L05) | Trépas des insensés, Mort de l'imprudent | Rappelle l'effet abrutissant (État Stupide) infligé par ce souffle. |
| `E0-T-109` — The Forest is My Shield (L11 p. 30) | **La Forêt est mon bouclier** | Proposé | — (absent L05) | Rempart sylvestre, Couvert de la futaie | Traduction littérale de la capacité défensive en milieu boisé. |
| `E0-T-110` — Stolen Claws (L11 p. 31) | **Griffes volées** | Proposé | — (absent L05) | Serres dérobées, Griffes usurpées | Traduction exacte de la capacité propre à Caledair. |
| `E0-T-111` — A Wyvern’s Spite (L11 p. 32) | **Rancœur de vouivre** | Proposé | — (absent L05) | Malveillance de la vouivre, Fiel de vouivre | Traduction idiomatique en accord avec le nom officiel « Vouivre » (L05 p. 342). |
| `E0-T-112` — Damn Lucky Fish (L11 p. 36) | **Sacrément chanceux ce poisson** | Proposé | — (absent L05) | Poisson verni, Brochet porte-veine | Respecte le ton populaire des pêcheurs impériaux face au vieux stirpike. |
| `E0-T-113` — Limber Tail (L11 p. 36) | **Queue souple** | Proposé | — (absent L05) | Queue agile, Fouet caudal | Traduction précise de la souplesse caudale permettant une attaque gratuite par Round. |
| `E0-T-114` — Shocked Recognition (L11 p. 37) | **Reconnaissance horrifiée** | Proposé | — (absent L05) | Choc de la reconnaissance, Stupeur d'identification | Rend l'effet psychologique d'étourdissement lorsqu'on reconnaît la victime mutée. |
| `E0-T-115` — Master of the Lash (L11 p. 41) | **Maître du fouet** | Proposé | — (absent L05) | Seigneur de la lanière, Dompteur au fouet | Traduction canonique pour un maître de meute skaven. |
| `E0-T-116` — I AM UNSTOPPABLE! (L11 p. 41) | **JE SUIS INARRÊTABLE !** | Proposé | — (absent L05) | RIEN NE M'ARRÊTE !, INVINCIBLE ! | Conserve la typographie exclamative et l'hubris skaven sur monture Bonebreaker. |
| `E0-T-117` — Mouth Full of Razors (L11 p. 41) | **Gueule pleine de rasoirs** | Proposé | — (absent L05) | Mâchoire de lames, Crocs-rasoirs | Traduction imagée directe de la dentition pénétrante du rat-loup. |
| `E0-T-118` — In Sigmar’s Name, What Is That THING? (L11 p. 41) | **Par Sigmar, qu'est-ce que c'est que cette CHOSE ?** | Proposé | — (absent L05) | Au nom de Sigmar, quelle est cette HORREUR ? | Conserve l'exclamation impériale et la mise en majuscules de « THING ». |
| `E0-T-119` — Engulf (L11 p. 45) | **Engloutir** | Proposé | — (absent L05) | Enveloppement, Absorption | Terme classique pour l'absorption par un organisme amiboïde ou gélatineux. |
| `E0-T-120` — Jelly from Hell (L11 p. 45) | **Gelée infernale** | Proposé | — (absent L05) | Gélatine des enfers, Glaire abyssale | Traduction naturelle et évocatrice de l'amibe monstrueuse. |
| `E0-T-121` — Mostly Mindless (L11 p. 45) | **Quasi décérébré** | Proposé | — (absent L05) | Presque sans esprit, Instinct protoplasmique | Rend la nuance « Mostly » par rapport à Mindless (sans esprit). |
| `E0-T-122` — Four-Fold Knowing Gaze (L11 p. 47) | **Quadruple regard omniscient** | Proposé | — (absent L05) | Regard quadruple clairvoyant, Quatre yeux avertis | Décrit précisément les quatre yeux empêchant toute Surprise. |
| `E0-T-123` — Full o’ Fish & Worse (L11 p. 49) | **Plein de poiscaille et pire encore** | Proposé | — (absent L05) | Gorgé de poisson avarié, Panse de vase et de poisson | Conserve l'élision familière (« Full o' ») du troll d'eau. |
| `E0-T-124` — Rotten Stench (L11 p. 49) | **Puanteur putride** | Proposé | — (absent L05) | Relent fétide, Pestilence charogneuse | Traduction directe de l'aura olfactive nauséabonde. |
| `E0-T-125` — Copious Vomit (L11 p. 49) | **Vomissement copieux** | Proposé | — (absent L05) | Flot de vomi, Régurgitation abondante | S'aligne sur le nom officiel « Vomissement » (L05 p. 343). |
| `E0-T-126` — Overwhelming Stench (L11 p. 49) | **Puanteur suffocante** | Proposé | — (absent L05) | Puanteur accablante, Miasme étourdissant | Marque la gradation au-dessus de Puanteur putride (E0-T-124). |
| `E0-T-127` — Hallucinogenic Cloud (L11 p. 50) | **Nuage hallucinogène** | Proposé | — (absent L05) | Spore hallucinogène, Brume psychotrope | Traduction littérale et précise. |
| `E0-T-128` — Painless Bite (L11 p. 50) | **Morsure indolore** | Proposé | — (absent L05) | Morsure anesthésiante, Succion insensible | Décrit la morsure de sangsue géante qui draine sans alerter. |
| `E0-T-129` — Endless Coils (L11 p. 52) | **Anneaux sans fin** | Proposé | — (absent L05) | Spires interminables, Enroulements multiples | Terme herpétologique exact (« anneaux » d'un serpent constricteur). |
| `E0-T-130` — Seven Shrewd Glares (L11 p. 54) | **Sept regards perçants** | Proposé | — (absent L05) | Sept regards rusés, Vigilance heptacéphale | Traduit la vigilance simultanée des sept têtes de l'hydre. |
| `E0-T-131` — Ruthless Strike (L11 p. 57) | **Frappe impitoyable** | Proposé | — (absent L05) | Assaut sans merci, Charge cruelle | Traduction directe de la charge perforante du pégase noir. |
| `E0-T-132` — Murder on the Wing (L11 p. 59) | **Meurtre ailé** | Proposé | — (absent L05) | Mort en plein vol, Nuée meurtrière | Expression française idiomatique rendant l'attaque aérienne mortelle. |
| `E0-T-133` — Endless Malice (L11 p. 61) | **Malice inextinguible** | Proposé | — (absent L05) | Cruauté sans fin, Acharnement sadique | Traduit l'acharnement de la créature sur les proies neutralisées. |
| `E0-T-134` — Lightning from a Clear Sky (L11 p. 63) | **Foudre dans un ciel serein** | Proposé | — (absent L05) | Éclair par temps clair, Piqué foudroyant | Équivalent proverbial français exact de l'anglais. |
| `E0-T-135` — Wicked Claws (L11 p. 65) | **Serres cruelles** | Proposé | — (absent L05) | Griffes perfides, Serres venimeuses | Adapté à l'anatomie aviaire de la cockatrice (« serres »). |
| `E0-T-136` — We See You (L11 p. 67) | **Nous vous voyons** | Proposé | — (absent L05) | On vous voit, Vigilance tricéphale | Traduction directe de la vigilance partagée de la chimère. |
| `E0-T-137` — Mangling Jaws (L11 p. 67) | **Mâchoires broyeuses** | Proposé | — (absent L05) | Gueule déchiqueteuse, Mâchoires mutilantes | Rend l'effet de broiement d'armure de l'Oblast Beast. |
| `E0-T-138` — Endless Rage (L11 p. 70) | **Rage sans fin** | Proposé | — (absent L05) | Fureur perpétuelle, Rage inextinguible | Rappelle le Trait officiel « Rage » (L05 p. 341) et la Frénésie permanente. |
| `E0-T-139` — Blazing Body (L11 p. 75) | **Corps flamboyant** | Proposé | — (absent L05) | Corps embrasé, Fournaise vivante | Traduction directe de l'aura ignée. |
| `E0-T-140` — Bloodrage (L11 p. 75) | **Rage de sang** | Proposé | — (absent L05) | Fureur sanguinaire, Soif de carnage | Terme consacré dans Warhammer pour la fureur de Khorne/Taurox. |
| `E0-T-141` — Barbed Forelimbs (L11 p. 76) | **Patte-ravisseuses barbelées** | Proposé | — (absent L05) | Membres antérieurs barbelés, Avant-bras épineux | Précise la fonction de capture (« ravisseuses ») des pattes d'insecte géant. |
| `E0-T-142` — Vibrational Senses (L11 p. 76) | **Sens vibratoires** | Proposé | — (absent L05) | Perception des vibrations, Sens sismique | Traduction scientifique et naturelle. |
| `E0-T-143` — Vicious Mandibles (L11 p. 76) | **Mandibules féroces** | Proposé | — (absent L05) | Mandibules vicieuses, Pinces acérées | Traduction directe pour l'attaque d'arthropode. |
| `E0-T-144` — Flight of Razors (L11 p. 77) | **Volée de rasoirs** | Proposé | — (absent L05) | Nuée de lames, Plumes-rasoirs | Traduit le double sens de « Flight » (vol/volée d'oiseaux). |
| `E0-T-145` — Unstoppable Charge (L11 p. 79) | **Charge irrésistible** | Proposé | — (absent L05) | Charge inarrêtable, Élan dévastateur | Terme classique des règles Warhammer pour le stégadon. |
| `E0-T-146` — Blood Frenzy (L11 p. 81) | **Frénésie sanguinaire** | Proposé | — (absent L05) | Frénésie du sang, Ivresse du sang | Rappelle le Trait officiel « Frénésie » (L05 p. 339) déclenché à la première blessure. |
| `E0-T-147` — Disruption (L11 p. 82) | **Dissipation perturbatrice** | Proposé | — (absent L05) | Perturbation aethyrique, Dislocation | Évite la collision avec Perturbant (Distracting, L05 p. 341) tout en décrivant l'effet sur Instable. |
| `E0-T-148` — Rahagra’s Gift (L11 p. 82) | **Don de Rahagra** | Proposé | — (absent L05) | Bénédiction de Rahagra, Grâce du Lion blanc | Traduction directe du nom propre elfique. |
| `E0-T-149` — Cruel Claws / The Cruellest Claws (L11 p. 85) | **Pinces cruelles / Les Pinces les plus cruelles** | Proposé | — (absent L05) | Griffes cruelles / Les Griffes les plus cruelles | Il s'agit d'un crustacé géant (léviathan), d'où « Pinces » pour « Claws ». |
| `E0-T-150` — Crustacean (L11 p. 85) | **Crustacé** | Proposé | — (absent L05) | Carapace marine, Décapode | Traduction zoologique exacte. |
| `E0-T-151` — Siren’s Song (L11 p. 86) | **Chant de sirène** | Proposé | — (absent L05) | Mélopée envoûtante, Appel de la sirène | Expression consacrée en français. |
| `E0-T-152` — Water Born (L11 p. 86) | **Né des eaux** | Proposé | — (absent L05) | Enfant de l'onde, Nature aquatique | Traduction littérale et poétique. |
| `E0-T-153` — Whale Bane (L11 p. 88) | **Fléau des baleines** | Proposé | — (absent L05) | Tueur de cétacés, Mort des léviathans | Calqué sur le modèle des sorts/capacités en « -bane » → « Fléau des… ». |
| `E0-T-154` — Rabid Frenzy (L11 p. 90) | **Frénésie enragée** | Proposé | — (absent L05) | Rage rabique, Furie écumante | Combine le Trait officiel « Frénésie » et la rage furieuse déclenchée sous blessure. |
| `E0-T-155` — Razor Scales (L11 p. 90) | **Écailles-rasoirs** | Proposé | — (absent L05) | Écailles tranchantes, Cuirasse de lames | Traduction concise de la capacité de dégâts réfléchis en mêlée. |
| `E0-T-156` — Rock Melter (L11 p. 90) | **Fond-la-roche** | Proposé | — (absent L05) | Dissolvant de pierre, Gueule vitriolique | Composé expressif décrivant les sucs corrosifs et venimeux. |
| `E0-T-157` — Breath of Nightmares (L11 p. 91) | **Souffle des cauchemars** | Proposé | — (absent L05) | Haleine cauchemardesque, Miasme d'épouvante | Rappelle le Trait « Souffle » (L05 p. 341). |
| `E0-T-158` — Wight Blade (L11 p. 93) | **Lame des tertres** | Proposé | — (absent L05) | Lame de revenant, Épée spectrale | Traduction canonique Warhammer de « Wight Blade » (Roi Revenant / Seigneur des Tertres). |
| `E0-T-159` — Made-Made Myself (L11 p. 95) | **Fait-fait moi-même** | Proposé | — (absent L05) | Bricolé-forgé par moi, Fabriqué-fait maison | Conserve la réduplication lexicale typique du parler Queekish skaven. |
| `E0-T-160` — Shoot-Kill (L11 p. 95) | **Tirer-tuer** | Proposé | — (absent L05) | Feu-mort, Viser-abattre | Conserve le composé verbal skaven. |
| `E0-T-161` — Murder-Crush (L11 p. 95) | **Meurtre-broiement** | Proposé | — (absent L05) | Tuer-écraser, Massacre-fracas | Conserve la réduplication sémantique skaven. |
| `E0-T-162` — Companion Trait (Species) (L02 p. 81) | **Trait de compagnon (Espèce)** | Proposé | — (absent L05) | Compagnon (Espèce), Lien de familier (Espèce) | Reprend la proposition de l'inventaire E0. |
| `E0-T-163` — Companion — Deception (L02 p. 81) | **Compagnon — Tromperie (Renard)** | Proposé | — (absent L05) | Compagnon Renard, Familier de ruse | Précise à la fois la vertu (Deception) et l'espèce associée dans L02 p. 81. |
| `E0-T-164` — Companion — Divination (L02 p. 81) | **Compagnon — Divination (Hibou)** | Proposé | — (absent L05) | Compagnon Hibou, Familier de présage | Précise la vertu et l'espèce associée dans L02 p. 81. |
| `E0-T-165` — Companion — Perception (L02 p. 81) | **Compagnon — Perception (Hermine)** | Proposé | — (absent L05) | Compagnon Hermine, Familier de vigilance | Précise la vertu et l'espèce associée dans L02 p. 81. |
| `E0-T-166` — Companion — Resilience (L02 p. 81) | **Compagnon — Résilience (Blaireau)** | Proposé | — (absent L05) | Compagnon Blaireau, Familier d'endurance | Précise la vertu et l'espèce associée dans L02 p. 81. |
| `E0-T-167` — Companion — Stealth (L02 p. 81) | **Compagnon — Discrétion (Chat)** | Proposé | — (absent L05) | Compagnon Chat, Familier furtif | Précise la vertu et l'espèce associée dans L02 p. 81. |
| `E0-T-168` — Companion — Transformation (L02 p. 82) | **Compagnon — Transformation (Corbeau)** | Proposé | — (absent L05) | Compagnon Corbeau, Familier de métamorphose | Précise la vertu et l'espèce associée dans L02 p. 82. |
| `E0-T-169` — Animal Telepathy (L02 p. 82) | **Télépathie animale** | Proposé | — (absent L05) | Lien télépathique animal, Empathie animale | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-170` — Messenger (L02 p. 82) | **Messager** | Proposé | — (absent L05) | Coursier animal, Porteur de messages | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-171` — Sensory Sharing (L02 p. 82) | **Partage sensoriel** | Proposé | — (absent L05) | Sens partagés, Communion des sens | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-172` — Invisibility — Animal Familiar (L02 p. 82) | **Invisibilité (Familier animal)** | Proposé | — (absent L05) | Invisibilité du familier animal, Camouflage spirituel | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-173` — Stationary Attacker (L07 p. 166) | **Attaquant stationnaire** | Proposé | — (absent L05) | Prédateur immobile, Piège végétal fixe | Traduction exacte du Trait des plantes carnivores de Lustrie. |
| `E0-T-174` — Warm-blooded / Cold-blooded categories (L07 p. 166) | **Catégories Sang-chaud / Sang-froid** | Proposé | — (absent L05) | Métabolisme à sang chaud / à sang froid | Distingue explicitement cette classification biologique du Trait À sang-froid (E0-Q16). |
| `E0-T-175` — Blood Hungry Spore Cloud (L07 p. 167) | **Nuage de spores hématophages** | Proposé | — (absent L05) | Nuage de spores avides de sang, Spores sanguinaires | Précis et évocateur pour la flore carnivore de Lustrie. |
| `E0-T-176` — Entangled Attack — Creeper Vine (L07 p. 167) | **Attaque enchevêtrante (Liane rampante)** | Proposé | — (absent L05) | Attaque d'entrave — Liane grimpante | S'aligne sur le terme d'État « Enchevêtré » / « Empêtré ». |
| `E0-T-177` — Impale Attack — Spikethorn (L07 p. 167) | **Attaque empaleuse (Épine-pique)** | Proposé | — (absent L05) | Tir perforant — Ronce épineuse | S'aligne sur l'Atout d'arme « Empaleuse » (Impale). |
| `E0-T-178` — Magical Snack (L07 p. 168) | **En-cas magique** | Proposé | — (absent L05) | Bouchée magique, Friandise arcanique | Traduit exactement l'ingestion rituelle d'une larve Itxi. |
| `E0-T-179` — Brain Rot (L07 p. 168) | **Pourriture cérébrale** | Proposé | — (absent L05) | Putréfaction du cerveau, Nécrose crânienne | Calqué sur « Pourriture du Sang » (Blood Rot) dans L05. |
| `E0-T-180` — Posterior Flame / Use as Ammunition (L07 p. 168) | **Flamme postérieure / Munition vivante** | Proposé | — (absent L05) | Jet igné abdominal / Emploi comme projectile | Traduit les deux volets de la règle de la sangsue de feu (Fireleech). |
| `E0-T-181` — Excruciating Sting (L07 p. 169) | **Dard atroce** | Proposé | — (absent L05) | Piqûre insoutenable, Aiguillon lancinant | Traduit la douleur persistante du venin de guêpe géante. |
| `E0-T-182` — Odour Attack — Blot Toad (L07 p. 170) | **Attaque olfactive (Crapaud tacheté)** | Proposé | — (absent L05) | Effluve nauséeux — Crapaud bouffi | Traduction claire de l'attaque d'odeur ciblant les sang-froids. |
| `E0-T-183` — Venomous Bite — Scalemane (L07 p. 171) | **Morsure venimeuse (Crinière-d'écailles)** | Proposé | — (absent L05) | Morsure doublement venimeuse — Scalemane | Rappelle Morsure et Venin (L05 pp. 340, 343). |
| `E0-T-184` — Venomous Bite — Blue-ringed Asp (L07 p. 172) | **Morsure venimeuse (Aspic à anneaux bleus)** | Proposé | — (absent L05) | Morsure hémotoxique — Aspic bleu | Distingue cette variante hémorragique de celle du Scalemane. |
| `E0-T-185` — Boring Attack (L07 p. 172) | **Attaque térébrante** | Proposé | — (absent L05) | Attaque foreuse, Morsure perforante | « Boring » signifie ici « qui fore / perce les chairs », d'où « térébrante » ou « foreuse ». |
| `E0-T-186` — Cold One Mounts (L07 p. 174) | **Monture Sang-froid** | Proposé | — (absent L05) | Monture Carnosaure/Sang-froid, Chevaucher un Sang-froid | « Sang-froid » est le nom français canonique des Cold Ones (montures reptiliennes). |
| `E0-T-187` — Shooting Spine Attack (L07 p. 175) | **Tir d'épines** | Proposé | — (absent L05) | Projection de dards, Salve d'épines dorsales | Traduction concise de l'attaque à distance du Razordon. |
| `E0-T-188` — Unstoppable Charge — Stegadon (L07 p. 177) | **Charge irrésistible (Stégadon)** | Proposé | — (absent L05) | Charge inarrêtable — Stégadon | Harmonisé avec E0-T-145. |
| `E0-T-189` — Lizardman Artillery (L07 p. 178) | **Artillerie homme-lézard** | Proposé | — (absent L05) | Engin d'artillerie saurus/skink, Arme de bât | Traduction directe. |
| `E0-T-190` — Ramming Attack — Pliodon (L07 p. 179) | **Éperonnage (Pliodon)** | Proposé | — (absent L05) | Attaque d'éperonnage — Pliodon, Abordage bélier | Terme naval exact pour la collision contre la coque d'un navire. |
| `E0-T-191` — Blood Frenzy — Carnosaur (L07 p. 180) | **Frénésie sanguinaire (Carnosaure)** | Proposé | — (absent L05) | Frénésie du sang — Carnosaure | Harmonisé avec E0-T-146. |
| `E0-T-192` — Toxic Bile — Troglodon (L07 p. 180) | **Bile toxique (Troglodon)** | Proposé | — (absent L05) | Crachat bilieux — Troglodon, Suc caustique | Traduction directe. |
| `E0-T-193` — Fearsome Roar (L07 p. 181) | **Rugissement effroyable** | Proposé | — (absent L05) | Rugissement terrifiant, Brama d'épouvante | Évite la collision directe avec le Talent Effrayant (Fearsome). |
| `E0-T-194` — Easily Confused (L02 p. 91) | **Facilement désorienté** | Proposé | — (absent L05) | Aisément confus, Esprit brumeux | Reprend la proposition de l'inventaire E0. |
| `E0-T-195` — Trained — Hunting Hound (L04 p. 133) | **Dressé — Chien de chasse** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé — Chasse canine | Rattaché au Trait officiel « Dressé » (L05 p. 339). |
| `E0-T-196` — Trained (Dig) (L04 p. 133) | **Dressé (Creuser)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Déterrer) | Discipline canine complémentaire formée sur le modèle des verbes à l'infinitif de L05 p. 339 (Divertir, Garder, Rapporter). |
| `E0-T-197` — Trained (Heel) (L04 p. 133) | **Dressé (Au pied)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Rappel au pied) | Commandement cynophile français standard. |
| `E0-T-198` — Trained (Hunt) — Hound (L04 p. 133) | **Dressé (Chasser — chien)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Courre) | Verbe à l'infinitif cohérent avec L05 p. 339, distingué de la variante faucon. |
| `E0-T-199` — Trained (Point) (L04 p. 133) | **Dressé (Marquer l'arrêt)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Marquer), Dressé (Arrêt) | Terme cynophile exact pour un chien d'arrêt (« pointer »). |
| `E0-T-200` — Trained (Round) (L04 p. 133) | **Dressé (Rabattre)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Rassembler) | Terme de vénerie/bergerie exact. |
| `E0-T-201` — Trained (Track) (L04 p. 133) | **Dressé (Pister)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Suivre la piste) | Verbe à l'infinitif aligné sur Pisteur (L05 p. 341). |
| `E0-T-202` — Trained — Hunting Hawk (L04 p. 134) | **Dressé — Faucon de chasse** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé — Fauconnerie | Rattaché au Trait officiel « Dressé » (L05 p. 339). |
| `E0-T-203` — Trained (Hunt) — Hawk (L04 p. 134) | **Dressé (Chasser — faucon)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Voler le gibier) | Distingue le vol de chasse du rapace de la chasse canine. |
| `E0-T-204` — Trained (Circle) (L04 p. 134) | **Dressé (Cercler)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Tournoyer) | Reprend la proposition de l'inventaire E0. |
| `E0-T-205` — Trained (Return) (L04 p. 134) | **Dressé (Revenir au leurre)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Revenir), Dressé (Rappel au gant) | Précise le rappel de fauconnerie et le distingue de « Revenir à la maison » (Home, L05 p. 339). |
| `E0-T-206` — Telepathy (L07 p. 151) | **Télépathie** | Proposé | — (absent L05) | Communication mentale | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-207` — Chameleon (L07 p. 151) | **Caméléon** | Proposé | — (absent L05) | Peau caméléon, Mimétisme | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-208` — Flammable (L07 p. 165) | **Inflammable** | Proposé | — (absent L05) | Combustible, Vulnérable au feu | Traduction directe déjà retenue dans l'inventaire E0. |
| `E0-T-209` — Grim (Rating) — Lustria (L07 p. 165) | **Féroce (Indice) — variante Lustrie** | Proposé | — (absent L05) | Acharné (Indice) — Lustrie | Harmonisé avec E0-T-026 (Féroce). |
| `E0-T-210` — Aquatic (L07 p. 168) | **Aquatique** | Proposé | — (absent L05) | Organisme aquatique | Conservé distinct d'Amphibie et de Créature marine conformément à E0-Q17. |
| `E0-T-211` — Auger and Scryer (L07 p. 125) | **Augure et scrutateur (Slann)** | Proposé | — (absent L05) | Augure slann, Devin géomantique | Traduit les deux termes anglais tout en conservant le périmètre slann. |
| `E0-T-212` — Contemplation (L07 p. 125) | **Contemplation (Slann)** | Proposé | — (absent L05) | Contemplation slann, Transe méditative | Reprend la proposition de l'inventaire E0. |
| `E0-T-213` — Knack for Total Power (L07 p. 125) | **Don de puissance totale (Slann)** | Proposé | — (absent L05) | Puissance totale slann, Maîtrise du pouvoir absolu | Reprend et précise la proposition de l'inventaire E0. |
| `E0-T-214` — Master of Magical Mishaps (L07 p. 125) | **Maître des incidents magiques (Slann)** | Proposé | — (absent L05) | Maître des incidents, Contrôle des fiascos | Reprend et précise la proposition de l'inventaire E0. |
| `E0-T-215` — Emergency Teleportation (L07 p. 126) | **Téléportation de secours** | Proposé | — (absent L05) | Téléportation d'urgence, Repli astral | Reprend la proposition de l'inventaire E0. |
| `E0-T-216` — Relic Priest (L07 p. 126) | **Prêtre-relique** | Proposé | — (absent L05) | Prêtre relique, Momie slann | Terme canonique des livres d'armée Hommes-Lézards. |
| `E0-T-217` — Telepathy — Slann Network (L07 p. 126) | **Télépathie — Réseau slann** | Proposé | — (absent L05) | Réseau télépathique géomantique | Reprend la proposition de l'inventaire E0. |
| `E0-T-218` — Palanquin (L07 p. 126) | **Palanquin** | Proposé | — (absent L05) | Trône flottant slann | Terme français identique à l'anglais. |
| `E0-T-219` — Slann on the Ground (L07 p. 127) | **Slann au sol** | Proposé | — (absent L05) | Slann désarçonné, Hors du palanquin | Reprend la proposition de l'inventaire E0. |
| `E0-T-220` — Belligerent — Temple of Spite (L09 p. 44) | **Belliqueux (variante Temple of Spite)** | Proposé (base attestée L05) | p. 338 (phys. 340) (base) | Belliqueux L09 | Reprend le nom officiel L05 p. 338 (écrasé en jeu par la règle V5 selon ARBITRAGES_MJ_21_10.md). |
| `E0-T-221` — Cold-blooded — Temple of Spite (L09 p. 46) | **À sang-froid (variante Temple of Spite)** | Proposé (base attestée L05) | p. 338 (phys. 340) (base) | À sang-froid L09 | Reprend le nom officiel L05 p. 338. |
| `E0-T-222` — Many Heads — Temple of Spite (L09 p. 47) | **Plusieurs têtes (variante Temple of Spite)** | Proposé | — (absent L05) | Têtes multiples L09 | Harmonisé avec E0-T-034 (Plusieurs têtes). |
| `E0-T-223` — Marine Creature (L09 p. 49) | **Créature marine** | Proposé | — (absent L05) | Bête pélagique, Organisme marin | Reprend la proposition de l'inventaire E0. |
| `E0-T-224` — Mark of Slaanesh (L09 p. 51) | **Marque de Slaanesh** | Proposé | — (absent L05) | Marque du Chaos (Slaanesh) | Sous-cas direct de Marque du Chaos (E0-T-035). |
| `E0-T-225` — Coven Sorcerer (L09 p. 52) | **Sorcier de couvent** | Proposé | — (absent L05) | Sorcière de cabale, Mage de cercle | Reprend la proposition de l'inventaire E0. |
| `E0-T-226` — Prey of the Dark Prince (L09 p. 52) | **Proie du Prince Noir** | Proposé | — (absent L05) | Tribut de Slaanesh, Âme promise au Prince du Chaos | Reprend la proposition de l'inventaire E0. |
| `E0-T-227` — Fearless — Crypt Ghast (L10 p. 68) | **Sans peur (Crypt Ghast)** | Proposé | — (absent L05) | Intrépide — Goule des cryptes | S'aligne sur le Talent officiel « Sans peur » (L05 p. 145). |
| `E0-T-228` — Trained (Shock Cavalry) (L13 p. 107) | **Dressé (Cavalerie de choc)** | Proposé (base attestée L05) | p. 339 (phys. 341) (base Dressé) | Dressé (Monture de choc) | Rattaché au Trait officiel « Dressé » (L05 p. 339). |
| `E0-T-229` — Attuned to Magic (L14 p. 83) | **Accordé à la magie** | Proposé | — (absent L05) | Harmonisé aux Vents, Résonance aethyrique | Reprend la proposition de l'inventaire E0 (proche du Talent Harmonisation Aethyrique). |
| `E0-T-230` — Vulnerable to Cold (L14 p. 83) | **Vulnérable au froid** | Proposé | — (absent L05) | Sensible au gel, Faiblesse au froid | Reprend la proposition de l'inventaire E0. |
| `E0-T-231` — Wake of Fire (L14 p. 83) | **Sillage de feu** | Proposé | — (absent L05) | Traînée ardente, Sillon de braises | Reprend la proposition de l'inventaire E0. |
| `E0-T-232` — Phoenix Reborn (L14 p. 83) | **Renaissance du phénix** | Proposé | — (absent L05) | Résurrection des cendres, Phénix renaissant | Reprend la proposition de l'inventaire E0. |
| `E0-T-233` — Vulnerable to Heat (L14 p. 84) | **Vulnérable à la chaleur** | Proposé | — (absent L05) | Sensible au feu, Faiblesse à la chaleur | Symétrique exact de Vulnérable au froid (E0-T-230). |
| `E0-T-234` — Freezing Aura (L14 p. 84) | **Aura glaciale** | Proposé | — (absent L05) | Halo de givre, Froid rayonnant | Reprend la proposition de l'inventaire E0. |
| `E0-T-235` — Phoenix Mounts (L14 p. 84) | **Monture phénix** | Proposé | — (absent L05) | Alliance du phénix, Destrier phénix | Reprend la proposition de l'inventaire E0. |
| `E0-T-236` — Breath (Brimstone Fire) (L16 p. 84) | **Souffle (Feu de soufre)** | Proposé (base attestée L05) | p. 341 (phys. 343) (base Souffle) | Souffle de soufre, Souffle sulfureux | S'inscrit dans la syntaxe officielle « Souffle (Indice) (Type) » de L05 p. 341. |
| `E0-T-237` — Ashes to Ashes (L17 p. 174) | **De la cendre à la cendre** | Proposé | — (absent L05) | Cendres de l'élémentaire, Nuée d'escarbilles | Formule liturgique française correspondant à « Ashes to Ashes » (l'inventaire proposait Cendres de l'élémentaire, conservé en alternative). |
| `E0-T-238` — Gift of Fire (L17 p. 174) | **Don du feu** | Proposé | — (absent L05) | Présent des flammes, Embrasement spontané | Reprend la proposition de l'inventaire E0. |
| `E0-T-239` — Mindless Spellcaster (L17 p. 174) | **Lanceur sans esprit** | Proposé | — (absent L05) | Incantateur instinctif, Mage élémentaire | Reprend la proposition de l'inventaire E0. |
| `E0-T-240` — Consume Life (L17 p. 175) | **Consumer la vie** | Proposé | — (absent L05) | Dévorer la vie, Absorption vitale | Reprend la proposition de l'inventaire E0. |
| `E0-T-241` — Amethyst Fog (L17 p. 175) | **Brume d'améthyste** | Proposé | — (absent L05) | Brume améthyste, Brouillard de Shyish | Reprend la proposition de l'inventaire E0. |
| `E0-T-242` — Hourglass of Shyish (L17 p. 175) | **Sablier de Shyish** | Proposé | — (absent L05) | Sablier de la Mort | Reprend la proposition de l'inventaire E0. |
| `E0-T-243` — Soundless (L17 p. 175) | **Silencieux** | Proposé | — (absent L05) | Sans bruit, Inaudible | Reprend la proposition de l'inventaire E0. |
| `E0-T-244` — Howl of the Great Beast (L17 p. 176) | **Hurlement de la Grande Bête** | Proposé | — (absent L05) | Rugissement de Ghur, Cri de l'Incarnation | Reprend la proposition de l'inventaire E0. |
| `E0-T-245` — Grim (Rating) — Winds of Magic (L17 p. 176) | **Féroce (Indice) — variante Winds of Magic** | Proposé | — (absent L05) | Acharné (Indice) — Winds of Magic | Harmonisé avec E0-T-026 (Féroce). |
| `E0-T-246` — Random Caster (L17 p. 214) | **Lanceur aléatoire** | Proposé | — (absent L05) | Incantateur erratique, Magie chaotique réflexe | Reprend la proposition de l'inventaire E0. |
| `E0-T-247` — Spell Syphon (L17 p. 214) | **Siphon de sort** | Proposé | — (absent L05) | Siphon magique, Drain d'incantation | Reprend la proposition de l'inventaire E0. |
| `E0-T-248` — Bale Eye (L17 p. 217) | **Œil funeste** | Proposé | — (absent L05) | Œil de malheur, Regard de ruine | Reprend la proposition de l'inventaire E0. |
| `E0-T-249` — Breath (Slime) (L11 p. 23) | **Souffle (Bave)** | Proposé (base attestée L05) | p. 341 (phys. 343) (base Souffle) | Souffle de bave, Jet de mucus | S'inscrit dans la syntaxe officielle « Souffle (Indice) (Type) » de L05 p. 341. |
