# Import de profils au format JSON

Un profil (personnage) peut être créé en collant du JSON, sans passer par les cases du formulaire « Nouveau profil ». Le format (version 1) couvre toutes les cases du formulaire et leurs jets. Rien n’est envoyé sur le réseau : le texte est analysé localement, affiché pour relecture, puis les profils sont ajoutés à la réserve.

## Où coller le JSON

* **Préparer → Nouveau profil → « Créer depuis un JSON »** : coller le JSON (ou « Insérer un exemple »), « Vérifier le JSON », relire l’aperçu, puis « Créer N profils ». Le formulaire manuel reste disponible dessous.
* **Menu ⋯ → « Importer du texte »** : accepte aussi le JSON. Un texte qui commence par `{` ou `[` est lu comme du JSON, tout autre texte comme le [format texte](IMPORT_PROFILS_TEXTE.md).

## Forme du document

La racine est un profil `{ … }`, une liste de profils `[ … ]`, ou `{ "profils": [ … ] }` (alias `profiles`). Les clés `"format": "outil-mj-profil"` et `"version": 1` sont facultatives ; une version supérieure à 1 est refusée (« Version de format inconnue »).

Les clés ignorent la casse, les accents, les espaces, les tirets et les soulignés : `"Caractéristiques"` = `"caracteristiques"`, `"pv_max"` = `"pvmax"`. Les clés anglaises d’un fichier de sauvegarde sont des alias acceptés. `id`, `extensions`, `participantId`, `targetId` et `attr` sont ignorés sans avertissement : chaque import crée un profil neuf.

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
| `jets` | `actions`, `diceLines` | liste de jets | `[]` | Jets pré-configurés |

## Jet

| Clé | Alias | Valeur | Défaut | Case du formulaire |
|---|---|---|---|---|
| `nom` | `note`, `name`, `label` | texte non vide, **requis** | — (à vérifier) | Nom |
| `type` | | voir ci-dessous | `""` (le moteur déduit : attaque si dégâts, sinon compétence) | Type |
| `score` | `base`, `valeur` | entier, **requis** | — (à vérifier) | Score |
| `mod` | `modificateur` | entier | 0 | Mod. |
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
      "mod": 0,
      "degats": "BF+4",
      "qualites": [
        "Percutante"
      ]
    },
    {
      "nom": "Arbalète",
      "type": "attaque",
      "score": 35,
      "mod": -10,
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
      "mod": 10
    }
  ]
}
```

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
