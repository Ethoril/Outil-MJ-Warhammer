# Import local de profils (E17)

Le parseur local accepte un ou plusieurs blocs texte séparés par une ligne `---`. Chaque ligne utilise `Champ: valeur` (ou `Champ = valeur`). Les champs `Nom` et `PV` sont requis ; `Type PNJ`, `Groupe`, `Initiative`, `Notes` et `Tags` sont facultatifs. Les caractéristiques et armures utilisent une ligne par valeur (`E: 35`, `Armure tête: 2`).

Les actions utilisent une ligne `Action: nom | base=40 | mod=0 | dégâts=BF+4 | qualités=Impact, Précise`. `dégâts` accepte un nombre (`4`, `+9`) ou une formule en Bonus de Force (`BF+4`, `+BF+4`, `BF`, `BF−1`, ou `SB+4` en anglais), évaluée à la résolution avec la F de l’attaquant (BF = ⌊F/10⌋) ; l’aperçu affiche l’expression et sa valeur (`BF+4 = 7` avec F 35). Toute autre expression (`1d10`…) est conservée telle quelle, marquée « à arbitrer » et ne produit jamais de dégâts automatiques. Les alias de qualité sont canonisés par le registre local ; une qualité inconnue reste visible et demande une validation. Les entiers attendus refusent les décimales. Un champ absent, répété avec des valeurs différentes ou invalide apparaît dans l’aperçu comme à vérifier.

Exemple reproductible :

```text
Nom: Garde du pont
Type PNJ: PNJ
PV: 12
Initiative: 30
F: 35
E: 35
Armure tête: 2
Action: Attaque | base=40 | dégâts=BF+4 | qualités=Impact, Précise
---
Nom: Éclaireur
PV: 8
Notes: profil improvisé à confirmer
```

Le texte source est affiché avec `textContent` dans l’interface et ne devient jamais du HTML ou du code. Le parseur ne fait aucune requête externe et ne remplace pas silencieusement une valeur absente par une statistique calculée.
