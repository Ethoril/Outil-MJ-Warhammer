# Brief — reporter la v3 du livre de base dans la feuille « Aides de Jeu » (29/10/2026)

Feuille Google du MJ : id `1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs` (titre « Aides de Jeu - Warhammer »). Le MJ autorise l'écriture dans cette feuille. Outils : connecteur Google Sheets (`get_values`, `update_values`). C'est la source unique des catalogues : écris avec soin.

## Règles d'écriture (impératives)

- **Ne modifie que des cellules existantes** de la liste ci-dessous : aucune insertion ni suppression de ligne, de colonne ou d'onglet, aucun « import », aucun tri.
- Avant chaque écriture, lis la cellule ; après, relis-la. Consigne chaque cellule dans `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/JOURNAL_FEUILLE.md` : onglet, cellule, nom de la ligne, ancienne valeur exacte, nouvelle valeur.
- Une valeur qui commence par `=` (ex. `=+BF +4`) doit être écrite précédée d'une apostrophe (`'=+BF +4`), sinon la feuille en fait une formule. Relis pour vérifier que le texte affiché commence bien par `=`.
- Garde le style des cellules voisines (français, termes de l'onglet : DR, BF, BFM, Avantage, Élan, Peur, mètres). Les yards du livre s'écrivent avec la même valeur en mètres.
- Change le moins de texte possible : remplace la phrase concernée, garde le reste de la cellule.
- Si une ligne est introuvable ou si le changement ne s'applique pas proprement, n'écris rien pour elle et signale-la.

## Sources

Le texte exact v2 → v3 et l'emplacement dans l'outil : `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/ANALYSE_P001-200.md` et `ANALYSE_P201-380.md` (numéros entre parenthèses ci-dessous). Texte complet : `v2.txt` / `v3.txt` du même dossier (pages séparées par `\f`).

## Changements à reporter (décidés par le MJ)

Onglet **Talents** :
1. Présence imposante (Commanding Presence, p.117) et Inspirant (Inspiring, p.121) échangent leurs effets (P001 n°12 et 15) : Présence imposante = présence indomptable ; sur un Test de Commandement réussi en combat, choisir les DR obtenus ou le chiffre des unités du dé. Inspirant = autorité naturelle : en l'absence d'autorité reconnue, on suit vos ordres en situation de crise ; Avantage à tous les Tests de Commandement.
2. Sprinter (p.126, n°19) : Avantage en Athlétisme pour courir (plus « et sauter ») ; ajout : à pied, aucune pénalité pour se frayer un chemin dans une foule dense.
3. Flair pour les ennuis (Nose for Trouble, p.123, n°17) : Avantage aux Tests d'Intuition liés à un danger potentiel.
4. Diction instinctive (p.121, n°16) : la réduction de 20 ne s'applique que si le Test d'incantation ou de Focalisation a réussi.
5. Harmonie aethyrique (Aethyric Attunement, p.114, n°11) : le double jet sur la table des incidents mineurs n'est permis que si le Test d'incantation ou de Focalisation a réussi ; « accumuler » l'énergie devient « manipuler ».
6. Mains agiles (Fast Hands, p.119, n°14) : retirer la phrase sur le divertissement par Escamotage.
7. Frappe assommante (Strike to Stun, p.127, n°20) : remplacer « ignorer la pénalité de coup ciblé pour une mise hors de combat silencieuse » par « Avantage aux mises hors de combat silencieuses ».
8. Riposte (p.124, n°18) : « Une fois par Round, si vous remportez un Test opposé en défendant au corps à corps… ».
9. Combat à deux armes / Ambidextre (Dual Wielder, p.119, n°13) : pas besoin de dépenser d'Élan pour l'attaque de la seconde arme, mais il faut en avoir.
**Ne pas toucher** : Jambes solides (Strong Legs) — le MJ garde la version actuelle.

Onglet **Magie** :
10. Souffle (Breath, p.243, n°15-16) : zone des voisins en Bonus de Force Mentale mètres (au lieu de Bonus d'Initiative) ; ajouter « Le lanceur est immunisé à son propre Souffle. » (vaut aussi pour Fumée si une ligne Smoke existe).
11. Attaque en chaîne (Chain Attack, p.243, n°17) : −1 Dégât sur la 2e cible, encore −1 sur la 3e ; rebonds : BFM plus un par +2 DR ; le rebond suivant seulement si les Blessures infligées dépassent le BE de la 2e cible, vers une cible à BFM mètres de la 2e.
12. Effroi (Fearsome, p.244, n°18) : NI 2, « gagnez Peur (1) ».
13. Couronne de flammes (Crown of Flame, p.248, n°21) : Meneur de guerre et Peur (2) ; +2 DR : augmenter la Peur de 1 (retirer « ou reprendre Meneur de guerre »).
14. Épée flamboyante de Rhuin (p.248, n°22) : cible « une épée » (pas seulement arme de base).
15. Rafale (Gust, p.241, n°14) : « …ou faire tomber quelques pages » devient « …ou donner à une silhouette en cape une allure impressionnante ».
16. Faux de Shyish (Scythe of Shyish, p.247, n°20) : les morts-vivants engagés ne gagnent pas d'Élan (retirer la mention « arbitrage V5 du MJ : pas d'Avantage… leur Élan reste disponible »).
17. Attribut du domaine des Bêtes (p.245, n°19), si l'onglet le porte : au lieu de causer la Peur pendant BFM Rounds, vous gagnez de l'Élan et tous les ennemis vivants à NI mètres perdent le leur.
**Ne pas toucher** : Fantasmagorie, Trahison de Tzeentch.

Onglet **Miracles** :
18. Masque mortuaire (Death Mask, p.223, n°2) : Peur (2).
19. Givre d'Ulric (Hoarfrost's Chill, p.228, n°6) : Peur (2) ; les ennemis perdent leur Élan (au lieu de leur Avantage) au début de chaque Round.
20. Grâce de Ranald (p.225, n°3) : durée Bonus de Sociabilité minutes (au lieu de Rounds).
21. Dent et griffe (Tooth and Claw, Taal, p.228, n°5) : Traits Morsure et Magique ; vos attaques à mains nues ne sont plus Inoffensives ; plus de Trait Arme (BF+4).
22. Jugement du Roi des neiges (Snow King's Judgement, p.228, n°7) : « … ignorant BE et PA » devient « … et inflige l'état Sonné ».

Onglet **Mots Clés Armes et Armures** :
23. À répétition (Repeater, p.305, n°32) : ajouter « Permet de tirer deux fois sur la même cible avec −1 DR, en une seule Action. »

Onglet **Armes Corps à Corps** :
24. Arme improvisée (p.301, n°25) : si l'onglet a une colonne de description ou de note, ajouter que chaises, tabourets, pommeaux d'épée et crosses d'armes à feu sont des armes improvisées ; profil inchangé. S'il n'y a pas de colonne adaptée, ne rien écrire et le signaler.

L'onglet Armes à Distance est déjà fait par Claude (arcs, arbalètes, explosions, munitions) : n'y touche pas.

## Rapport

En français, court : cellules modifiées (nombre par onglet), lignes non trouvées ou non modifiées et pourquoi. Le détail est dans `JOURNAL_FEUILLE.md`.
