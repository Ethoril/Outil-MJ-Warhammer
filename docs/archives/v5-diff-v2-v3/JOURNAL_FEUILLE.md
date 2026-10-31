# Journal des écritures dans la feuille « Aides de Jeu » (29/10/2026, Claude)

Anciennes valeurs exactes : `CHANGEMENTS_FEUILLE.json` (champ `ancienne`) et, pour Armes à distance, ci-dessous. Toutes les cellules ont été relues après écriture.

## Armes à Distance
- E2 Arbalète (2M) : 50 → 40 ; E4 Arbalète lourde (2M) : 60 → 50
- F12 Arc (2M) : =+BF +4 → =+7 ; F13 Arc court (2M) : =+BF +3 → =+6 ; F15 Arc long (2M) : =+BF +4 → =+8
- G24 Bombe : Explosion 5 → Explosion 10 ; G25 Bombe incendiaire : Explosion 4 → Explosion 6 ; G51 Tromblon (2M) : Explosion 3 → Explosion 2
- G82 Grenaille et poudre (12) : Explosion +1 → - ; G83 Munitions improvisées et poudre : (vide) → Explosion -1

## Talents (10)
B154 Présence imposante, B64 Exaltant (Inspiring), B71 Flairer les ennuis, B52 Diction instinctive, B87 Harmonisation aethyrique, B118 Mains agiles, B73 Frappe assommante, B164 Riposte, B123 Maniement de deux armes.
B181 Sprinter, écrit au second essai : « Avantage V5 aux Tests d'Athlétisme pour courir. À pied, vous ne subissez aucune pénalité pour vous frayer un chemin dans une foule dense. »

## Magie (8)
G218 Souffle, C213 et G213 Effrayant, G10 Couronne de Flamme, E14 et G14 Épée Enflammée de Rhuin, G234 Coup de vent, G182 La Faux de Shyish.
Non modifié : G208 Attaques en chaîne (le texte actuel dit déjà ce que dit la v3).

## Mots Clés Armes et Armures (1)
B4 À répétition X : ajout du tir double à −1 DR.

## Non applicables dans la feuille
Prières (Masque mortuaire, Givre d'Ulric, Grâce de Ranald, Dent et griffe, Jugement du Roi des neiges) : absentes de l'onglet Miracles (Myrmidia seulement), à reporter dans les contrats de prières de l'outil. Attribut du domaine des Bêtes : pas de ligne, report dans le code. Arme improvisée : pas de colonne de note.

## Modifié par le MJ (29/10), pour harmoniser avec la v3
- F14 Arc elfique (2M) : =+BF +4 → =+9
- F16 Arc d'Anirain Haut Elfe : BF + 5 → =+9

## Yards → mètres (30/10, Claude)
Talents B45, B54, B68, B79, B94, B142, B144, B146, B153, B204 ; Mots Clés B7, B8, B13, E13, B19, E19. Anciennes valeurs : `YARDS_FEUILLE.json` (champ `old`). Relecture : aucune cellule ne contient plus « yard » dans ces deux onglets.

## 31/10/2026 — passe de cohérence outil ↔ feuille (décisions du MJ)

- **Vocabulaire V5** (78 cellules, Magie et Miracles) : Volonté → Force Mentale, Charisme → Sociabilité (accord « la Sociabilité ») partout hors noms propres (Volonté de fer, Volonté inébranlable, « à volonté » inchangés) ; dans Portée/Cible/Durée de Magie : FM → Force Mentale, Toucher → Contact, Zone → ZdE, ½ / ÷ 2 → Moitié de, Instant/Instantanée → Instantané, Spéciale → Spécial. Liste exacte : `tmp/coherence/ecriture/corrections-appliquees.json`.
- **123 sorts des suppléments ajoutés** en fin d'onglet Magie (lignes 279 à 401) : domaines peaux-vertes, Magie naturelle, Hoeth, Haute Magie, Magie de la mer, Vaul, Sorcellerie, Arcane, Nécromancie, Démonologie, dieux du Chaos, plus 4 variantes Slann en lignes séparées. Descriptions réécrites pour les joueurs (Gemini), relues et contrôlées (aucun nombre perdu hors références de livres). Source : `tmp/coherence/ecriture/sorts-feuille.json`.
- Vérifié par ré-export : seules les cellules prévues ont changé ; les 278 lignes d'origine sont intactes.
- Boucliers : rien écrit (la règle d'attaque est déjà dans le mot-clé Bouclier ; l'outil ajoute la précision à l'import).
