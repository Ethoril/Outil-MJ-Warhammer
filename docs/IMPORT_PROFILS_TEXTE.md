# Import local de profils (E17)

Le parseur local accepte un ou plusieurs blocs texte séparés par une ligne `---`. Chaque ligne utilise `Champ: valeur` (ou `Champ = valeur`). Les champs `Nom` et `PV` sont requis ; `Type PNJ`, `Groupe`, `Initiative`, `Notes` et `Tags` sont facultatifs. Les caractéristiques et armures utilisent une ligne par valeur (`E: 35`, `Armure tête: 2`).

Les actions utilisent une ligne `Action: nom | base=40 | mod=0 | dégâts=1d10 | qualités=Impact, Précise`. Les alias de qualité sont canonisés par le registre local ; une qualité inconnue reste visible et demande une validation. Les entiers attendus refusent les décimales. Un champ absent, répété avec des valeurs différentes ou invalide apparaît dans l’aperçu comme à vérifier.

Exemple reproductible :

```text
Nom: Garde du pont
Type PNJ: PNJ
PV: 12
Initiative: 30
E: 35
Armure tête: 2
Action: Attaque | base=40 | dégâts=1d10 | qualités=Impact, Précise
---
Nom: Éclaireur
PV: 8
Notes: profil improvisé à confirmer
```

Le texte source est affiché avec `textContent` dans l’interface et ne devient jamais du HTML ou du code. Le parseur ne fait aucune requête externe et ne remplace pas silencieusement une valeur absente par une statistique calculée.
