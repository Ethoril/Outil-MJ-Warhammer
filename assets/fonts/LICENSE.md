# Polices embarquées

**Grenze Gotisch**, **Alegreya** et **Alegreya Sans** sont distribuées sous
**SIL Open Font License 1.1**, qui autorise la redistribution avec le logiciel.

- Grenze Gotisch — Copyright 2020 The Grenze Gotisch Project Authors, https://github.com/Omnibus-Type/Grenze-Gotisch
- Alegreya — Copyright 2011 The Alegreya Project Authors, https://github.com/huertatipografica/Alegreya
- Alegreya Sans — Copyright 2013 The Alegreya Sans Project Authors, https://github.com/huertatipografica/Alegreya-Sans
- Texte complet de la licence, avec la mention de copyright de chaque police :
  `OFL-GrenzeGotisch.txt`, `OFL-Alegreya.txt`, `OFL-AlegreyaSans.txt` (dans ce dossier) ;
  voir aussi https://openfontlicense.org/

Fichiers `.woff2` extraits du sous-ensemble **latin** servi par Google Fonts.
Grenze Gotisch et Alegreya étant des polices variables, un seul fichier couvre
les graisses 400 à 800 (un fichier droit et un italique pour Alegreya).
Alegreya Sans n'existe qu'en graisses fixes : 400, 500 et 700.

Rôles : Grenze Gotisch pour les titres et les noms de combattants seulement,
Alegreya pour le texte des règles et du journal, Alegreya Sans pour les
boutons, libellés et chiffres.

Ils sont embarqués pour que l'application démarre et s'affiche **sans réseau**
(cf. `PLAN.md` §12.1). Ne pas les remplacer par un lien vers un CDN : cela
casserait le mode hors ligne.
