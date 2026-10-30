# F2-D — contre-vérification du cycle de recharge

Tests ajoutés dans `tests/f2-d-reloading-integration.test.js` pour la reprise :

- Profil catalogue réel : `Arbalète à Répétition Druchii`, À répétition 3 / Recharge 9.
- `Recharge X` sans `À répétition` : un tir crée un état de recharge à chargeur 0 et interdit le tir suivant.
- Aperçu périmé : mutation de l’arme entre `previewV5WeaponReload` et `applyV5WeaponReload` doit refuser l’application.
- Undo/Redo et rechargement depuis la persistance déjà testés sur le cycle étendu.
- Arme répétitrice sans ligne d’inventaire et arme dans `action.extensions.equipment` sans lien persistant doivent donner un besoin d’arbitrage explicite, jamais lever une exception.

État courant des tests : 7/9 passent. Les deux cas d’arme non liée reproduisent le défaut demandé : `TypeError: Cannot read properties of null (reading 'extensions')` dans `resolvedV5Action` (`js/core/resolution.js:782`). Ils sont intentionnellement laissés en échec jusqu’à la correction de production. Pas de fichier de production touché dans cette passe.

Correction proposée (à faire après libération des fichiers partagés) : dériver le compteur uniquement depuis une arme d’inventaire liée, ou depuis une `action.extensions.equipment` validée avec un identifiant/référence durable. Si aucune arme durable n’est disponible, ajouter un `unresolved` « équipement lié requis » et éviter tout accès `selectedWeapon.extensions`. Ne pas consommer un état de munition éphémère qui ne peut pas être sauvegardé/annulé.
