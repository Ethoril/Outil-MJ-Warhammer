# À reporter dans la feuille Google du catalogue

11 octobre 2026. Ce changement existe dans l'outil (snapshot épinglé et miroir `js/data/reference-source-csv/`) mais pas dans la feuille publique. Tant qu'ils n'y sont pas, une actualisation du catalogue rétablirait l'ancien texte de Lileath et désactiverait l'automatisme du talent.

## 1. Onglet Talents — Bénédiction de Lileath (remplacer la cellule)

Ligne : `Bénédiction de Lileath (Lileath's Blessing)`, colonne « Résumé précis de l'effet ».

La cellule actuelle commence par `=+1 DR` (le `=` fait partie du texte exporté). Pour que l'empreinte calculée par l'outil reste identique, garde ce `=` au début : dans Google Sheets, tape une apostrophe devant (`'=+1 DR…`) pour qu'il ne soit pas pris pour une formule. Texte exact :

```
=+1 DR par acquisition à tout Test de Focalisation (Qhaysh), réussi ou non. Chaque acquisition permet en outre d’ignorer une fois la limite qui réserve normalement le bénéfice au meilleur de plusieurs sorts donnant le même bonus : vous pouvez cumuler une source supplémentaire de ce bonus. S’applique aux sorts de Haute Magie et de magie de couleur.
```

Les autres colonnes de la ligne ne changent pas.

Après la mise à jour de la feuille, une actualisation du catalogue dans l'outil doit garder la même version de contenu ; je ferai vérifier que le miroir local et la feuille coïncident.
