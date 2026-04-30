# Outil-MJ-Warhammer

Application web pour Maître de Jeu — Warhammer Fantasy Roleplay 4e édition.

https://ethoril.github.io/Outil-MJ-Warhammer/

## Sécurité Firebase

La configuration Firebase (`firebaseConfig`) dans `index.html` est **intentionnellement publique**.
Ces clés sont des identifiants de projet, non des secrets — le SDK Firebase côté client en a besoin pour fonctionner.

La vraie sécurité repose sur les **Firebase Security Rules** configurées dans la console Firebase.

Règle minimale à vérifier dans la console (Realtime Database > Règles) :

```json
{
  "rules": {
    "wfrp-sessions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

Sans ces règles, tout utilisateur Google authentifié pourrait lire les données des autres utilisateurs.
