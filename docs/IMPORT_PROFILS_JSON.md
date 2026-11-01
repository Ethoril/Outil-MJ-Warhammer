# Import de profils au format JSON

Un profil (personnage) peut être créé en collant du JSON, sans passer par les cases du formulaire « Nouveau profil ». Le format (version 1) couvre toutes les cases du formulaire et leurs jets. Rien n’est envoyé sur le réseau : le texte est analysé localement, affiché pour relecture, puis les profils sont ajoutés à la réserve.

## Où coller le JSON

* **Préparer → Nouveau profil → « Créer depuis un JSON »** : coller le JSON (ou « Insérer un exemple »), « Vérifier le JSON », relire l’aperçu, puis « Créer N profils ». Le formulaire manuel reste disponible dessous.
* **Menu ⋯ → « Importer du texte »** : accepte aussi le JSON. Un texte qui commence par `{` ou `[` est lu comme du JSON, tout autre texte comme le [format texte](IMPORT_PROFILS_TEXTE.md).

## Forme du document

La racine est un profil `{ … }`, une liste de profils `[ … ]`, ou `{ "profils": [ … ] }` (alias `profiles`). Les clés `"format": "outil-mj-profil"` et `"version": 1` sont facultatives ; une version supérieure à 1 est refusée (« Version de format inconnue »).

Les clés ignorent la casse, les accents, les espaces, les tirets et les soulignés : `"Caractéristiques"` = `"caracteristiques"`, `"pv_max"` = `"pvmax"`. Les clés anglaises d’un fichier de sauvegarde sont des alias acceptés (`skills`, `talents`, `equipment`, `spells`, `prayers`, `race`, `movement`, `protection`, `ficheSnapshot`, `armorLocations`) : sous leur clé anglaise, seule la **forme interne** des sauvegardes est reprise telle quelle (objets `{ "id": …, … }` pour talents, compétences et équipement, objets `{ "nom": … }` pour sorts et prières). Tout autre élément (texte, objet `{ name, rank }`…) est validé comme sous les clés françaises. Écrire ensemble une clé française et sa clé anglaise (`competences` et `skills`…) est signalé. `id`, `extensions`, `participantId`, `targetId` et `attr` sont ignorés sans avertissement : chaque import crée un profil neuf.

## Profil

| Clé | Alias | Valeur | Défaut | Case du formulaire |
|---|---|---|---|---|
| `nom` | `name` | texte non vide, **requis** | — (à vérifier) | Nom |
| `type` | `kind` | « PJ », « PNJ », « Créature » | « Créature » ; autre valeur : « Créature » + à vérifier | Type |
| `groupe` | `group` | texte | `""` | Groupe |
| `pv` | `hp`, `pvmax`, `blessures` | entier, **requis** | valeur de `caracteristiques.B` si présente, sinon à vérifier | PV (Max) |
| `initiative` | `init` | entier | `caracteristiques.I` si présent, sinon 30 | Initiative (I) |
| `caracteristiques` | `caracs` | objet { CC, CT, F, E, I, Ag, Dex, Int, FM, Soc, M, A, B, BF } d’entiers | `{}` | Endurance (E) et Autres caracs (CC, CT, F, I, Ag, Dex, Int, FM, Soc) ; M, A, B, BF sont conservées sans case |
| `armure` | `armor` | objet { tete, corps, bras, jambes } d’entiers ≥ 0 (alias head, body, arms, legs), ou un entier seul = même valeur sur les 4 zones | 0 partout | Points d’Armure |
| `tags` | `motscles` | liste de textes, ou texte « a, b » | `[]` | Tags |
| `notes` | | texte (une liste de textes est jointe par des sauts de ligne) | `""` | Notes |
| `favori` | `favorite` | booléen | `false` | Profil favori |
| `keywords` | `motsclescreature`, `creaturekeywords` | liste de mots-clés du référentiel (espèce, nature, allégeance), par nom ou alias : « Peau verte », « Orc » et « Peaux-vertes » désignent le même terme ; stockés comme identifiants ; un terme inconnu est signalé « à vérifier » et jamais conservé | absent | Mots-clés de créature (sélecteur) |
| `keywordExclusions` | `motsclesexclus` | mots-clés déduits (race, Trait de nature) que le MJ écarte | absent | bouton « Écarter » |
| `jets` | `actions`, `diceLines` | liste de jets | `[]` | Jets pré-configurés |
| `espece` | `race` | texte (« humain », « nain »…) | absent | — (sert au Mouvement des fiches) |
| `mouvement` | `movement` | entier | absent | — |
| `competences` | `skills` (forme interne, reprise telle quelle) | liste de compétences formées, voir plus bas | absent | — (fiche) |
| `talents` | | liste de talents, voir plus bas | absent | — (fiche) |
| `traits` | | liste de Traits de créature (« Peur (2) », « Grim ») | absent | — |
| `taille` | `size` | « Petite », « Moyenne », « Grande », « Énorme », « Monstrueuse » (ajoute le Trait « Taille (…) ») | absent | — |
| `sorts` | `spells` (forme interne) | liste de noms de sorts du référentiel de Magie | absent | — (fiche) |
| `prieres` | `prayers` (forme interne) | liste de noms de Miracles du référentiel divin | absent | — (fiche) |
| `equipement` | `equipment` (forme interne) | liste d’objets du catalogue d’équipement, par nom | absent | — (fiche) |
| `fortune` | `chance` | entier ≥ 0 | absent | Fortune (Chance) de départ |
| `destin` | `fate` | entier ≥ 0 | absent | Destin |
| `resilience` | | entier ≥ 0 | absent | Résilience |
| `corruption` | | entier ≥ 0, Points de Corruption | absent | Corruption |
| `peches` | `sin` | entier ≥ 0, Péchés du culte | absent | Péchés (cultes) |

## Jet

| Clé | Alias | Valeur | Défaut | Case du formulaire |
|---|---|---|---|---|
| `nom` | `note`, `name`, `label` | texte non vide, **requis** | — (à vérifier) | Nom |
| `type` | | voir ci-dessous | `""` (le moteur déduit : attaque si dégâts, sinon compétence) | Type |
| `score` | `base`, `valeur` | entier, **requis** | — (à vérifier) | Score |
| `dr` | `modificateurdr`, `slmodifier` | entier : modificateur de V5, en DR (par exemple `-1` pour un tir à longue portée) | aucun | Modificateur V5 (DR) |
| `mod` | `modificateur` | entier, **ancien** seuil en pourcentage de la V4 : à éviter, l’éditeur demande alors le modificateur en DR | 0 | — |
| `degats` | `damage` | entier ou formule texte (`"BF+4"`, `"BF"`, `"1d10"`…) | aucun dégât | Dég. |
| `qualites` | `qualities`, `motscles` | liste de textes ou d’objets `{ "nom": "Recharge", "valeur": 2 }`, ou texte « a, b » | `[]` | Mots-clés |

Les anciennes cases X et Cap. ont disparu du formulaire : l’outil ne s’en servait pas, et la valeur X d’un mot-clé s’écrit dans la qualité (« Recharge 2 »). Pour rester compatibles avec les fichiers de sauvegarde, `x` (`valuesX`) et `capacite` (`capacity`, `munitions`) sont encore acceptés et conservés, sans effet.

### Types de jets

| Valeur acceptée | Valeur interne |
|---|---|
| « attaque », `attack` | `attack` |
| « compétence », `skill` | `skill` |
| « défense », `defense` | `defense` |
| « opposition », `opposition` | `opposition` |

La casse et les accents sont sans importance. Un type absent donne `""` ; une autre valeur donne aussi `""` et un point à vérifier.

### Dégâts

`4` ou `"4"` : dégâts fixes. `"BF+4"`, `"BF"`, `"BF-1"` : formule sur le Bonus de Force, évaluée à la résolution. Toute autre expression (`"1d10"`) est conservée telle quelle, à arbitrer, sans dégâts automatiques.

### Qualités et valeur X

Une qualité est un nom du registre des mots-clés (« Percutante », « Précise »…) ; les alias sont canonisés (« Impact » → Percutante). Les qualités dont le nom finit par « X » dans le registre prennent une valeur : **Explosion X**, **Protectrice X**, **Recharge X**, **Répétition X**, **Taille X**. Écrire « Recharge 2 » ou `{ "nom": "Recharge", "valeur": 2 }`. Sans valeur, une qualité à X prend 1. Dans Jouer, la valeur s’affiche à la place du X (« Recharge 2 »). Une qualité inconnue est conservée et signalée à vérifier.

## Exemple complet

Remplit toutes les cases du formulaire (c’est aussi ce qu’insère « Insérer un exemple »).

```json
{
  "format": "outil-mj-profil",
  "version": 1,
  "nom": "Garde du pont",
  "type": "PNJ",
  "groupe": "Milice de Bögenhafen",
  "pv": 12,
  "initiative": 35,
  "caracteristiques": {
    "CC": 45,
    "CT": 35,
    "F": 35,
    "E": 35,
    "I": 35,
    "Ag": 38,
    "Dex": 30,
    "Int": 28,
    "FM": 32,
    "Soc": 25
  },
  "armure": {
    "tete": 1,
    "corps": 2,
    "bras": 1,
    "jambes": 0
  },
  "tags": [
    "humain",
    "milice"
  ],
  "notes": "Patrouille le pont de nuit.\nSonne l’alarme à la première blessure.",
  "favori": true,
  "jets": [
    {
      "nom": "Hallebarde",
      "type": "attaque",
      "score": 45,
      "degats": "BF+4",
      "qualites": [
        "Percutante"
      ]
    },
    {
      "nom": "Arbalète",
      "type": "attaque",
      "score": 35,
      "dr": -1,
      "degats": 9,
      "qualites": [
        "Recharge 1"
      ]
    },
    {
      "nom": "Esquive",
      "type": "défense",
      "score": 38
    },
    {
      "nom": "Intimidation",
      "type": "compétence",
      "score": 25,
      "dr": 1
    }
  ]
}
```

## Fiche du personnage : compétences, talents, sorts, prières, équipement

Ces clés donnent au profil ce que donnerait une fiche de personnage synchronisée, par le même chemin (`ficheSnapshot` puis synchronisation) : le profil reste modifiable (aucun lien de fiche, aucun champ verrouillé), et ses PV, son Initiative, son Mouvement et ses caractéristiques restent ceux du JSON.

* **`competences`** : `"Prière"` (0 avance) ou `{ "nom": "Prière", "avances": 20 }`. Le total (caractéristique + avances) est calculé avec `caracteristiques`. Les 25 compétences de base sont toujours présentes (avances 0) ; seules les compétences formées ou avancées sont à écrire.
* **`talents`** : `"Combat instinctif"`, `"Béni (Ulric)"` ou `{ "nom": "Béni", "specialisation": "Ulric", "rang": 1 }`. Le rang est le nombre d’acquisitions (`"rang": 2` pour « Œil de la tempête »). Un talent qui exige une spécialisation sans la recevoir est signalé.
* **`sorts`** et **`prieres`** : noms exacts du référentiel (`["Brise-os"]`, `["Morsure du loup"]`). Les Bénédictions n’ont pas à être listées : le talent « Béni (culte) » les donne.
* **`equipement`** : noms du catalogue, `"Arbalète (2M)"`, `"Arc elfique (2M)"`, `"Arc d'Anirain Haut Elfe"`. Un nom présent dans plusieurs catégories se précise : `{ "nom": "Plastron", "categorie": "Plates" }`. Deux exemplaires = deux fois le nom. Chaque arme crée son jet (lié à la compétence que la fiche proposerait, par exemple `Projectiles (Arc)` si elle est dans `competences`) ; chaque pièce d’armure donne ses Points d’Armure par zone, sauf si le JSON écrit lui-même `armure` (qui l’emporte). Un objet complet `{ "id": …, "kind": …, … }` (export d’une sauvegarde) est repris tel quel.
* **`traits`** : `"Peur (2)"`, `"Grim"` ou `{ "nom": "Peur", "valeur": 2 }` ; `taille` ajoute `Taille (Grande)`, lue par le moteur de Taille.
* **`fortune`**, **`destin`**, **`resilience`** : valeurs de départ lues comme celles d’une fiche. **`corruption`** et **`peches`** s’inscrivent sur le profil. L’initialisation de la Fortune en séance reste celle de l’outil (G-DES-1), et la monture (relation entre deux combattants) se pose en séance.

### Noms inconnus et clés inconnues

Un nom absent du référentiel (talent, compétence, sort, prière, objet, Trait) n’est jamais ignoré en silence : l’aperçu l’affiche dans « À vérifier » avec le nom le plus proche, et le profil reste « à vérifier » jusqu’à confirmation.

```
Talent inconnu : « Oeil de la tempete » — vouliez-vous « Œil de la tempête » ?
Objet ambigu : « Plastron » existe en Cuir bouilli, Mailles, Plates — ajoutez { "nom": "Plastron", "categorie": "…" }.
```

Si le profil est créé malgré tout, un talent, une compétence, un sort ou une prière inconnus restent sur le profil à l’état « à vérifier » (comme sur une fiche) ; un objet inconnu n’est pas ajouté. Les noms de talents et de compétences suivent les accents du référentiel ; ceux des sorts, prières et objets ignorent la casse et l’apostrophe typographique. Une **clé inconnue** (dans le profil, une compétence, un talent, un Trait…) est signalée « champ inconnu ». Sont aussi signalés : une compétence dont la caractéristique manque dans `caracteristiques` (son total ne se calcule pas), une arme du catalogue sans compétence liée ayant une base, une spécialisation donnée à un talent qui n’en a pas, une `taille` écartée parce que les `traits` en donnent déjà une, un `mouvement` ou une `espece` invalides. L’outil ne peut pas dire si une spécialisation libre (« Magie des Arcanes (Zzz) ») existe : elle est reprise telle quelle.

### Exemple de personnage de fiche

```json
{
  "nom": "Prêtre d’Ulric",
  "type": "PNJ",
  "pv": 14,
  "caracteristiques": { "CC": 40, "CT": 35, "F": 35, "E": 35, "I": 40, "Ag": 35, "Dex": 35, "Int": 40, "FM": 50, "Soc": 70 },
  "competences": [{ "nom": "Prière", "avances": 20 }],
  "talents": [
    { "nom": "Béni", "specialisation": "Ulric" },
    { "nom": "Invocation", "specialisation": "Ulric" }
  ],
  "prieres": ["Morsure du loup", "Fureur d’Ulric"],
  "peches": 0,
  "fortune": 3,
  "destin": 2,
  "resilience": 1,
  "equipement": ["Arbalète (2M)", "Calotte de cuir"]
}
```

## Aller-retour : « Copier en JSON »

Dans l’éditeur d’un profil existant (Modifier le profil), le bouton **Copier en JSON** place dans le presse-papiers le profil enregistré, dans ce format ; le coller dans « Créer depuis un JSON » recrée un profil identique (talents et rangs, compétences, sorts, prières, équipement, Traits, ressources, jets avec leurs qualités et leur DR). Un profil importé n’a pas d’identité de fiche : chaque copie en combat garde sa propre Fortune, sa Corruption et ses effets. Les liens de fiche, les identifiants et les réglages de séance ne sont pas exportés.

## Exemple minimal

```json
{ "nom": "Gobelin", "pv": 9 }
```

Plusieurs profils :

```json
{ "profils": [
  { "nom": "Gobelin", "pv": 9, "jets": [{ "nom": "Lance", "score": 35, "degats": "BF+3" }] },
  { "nom": "Chien de guerre", "pv": 10, "armure": 1 }
] }
```

## Erreurs

* **JSON illisible** : message avec la position quand elle est connue (« JSON illisible, ligne 12, colonne 5 : … »). Rien n’est analysé.
* **Élément de liste qui n’est pas un objet** : « Profil n°3 : un objet { … } est attendu. »
* **Tout le reste** (champ requis absent, entier attendu, champ ou caractéristique inconnu, type inconnu, qualité inconnue…) : points « À vérifier » non bloquants dans l’aperçu, avec le nom du profil et du champ (« jet 3 (Arbalète) · score »). Ils exigent la case de confirmation avant « Créer ». Un champ invalide prend sa valeur par défaut.
