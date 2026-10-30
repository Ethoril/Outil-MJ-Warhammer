# Synthèse — catalogue des armes et armures vs livre de base V5 (L06)

26/10/2026. Source : rapport Gemini `RAPPORT_CATALOGUE_ARMES_L06.md` (L06 p.300-307 contre `js/data/reference-snapshot.json`, issu de la feuille du MJ). Contrôle Claude : 12 profils revérifiés dans le PDF (p.301, 303, 307) et dans le catalogue — **tous exacts** (Fléau, Hallebarde, Marteau de guerre, Grain Flail, Arc long, Arc court, Arbalète, Fronde, Fustibale, Pistolet, Arquebuse, Brise-épée, Main gauche, Heaume, Heaume ouvert). Aucun faux positif trouvé dans l'échantillon.

## Constat principal

**La feuille d'armes suit le livre de base V4 (livre FR, L05), pas la V5 (L06).** Sur 70 objets appariés, 43 diffèrent (77 champs), 27 sont identiques. Les écarts ne sont pas des fautes de saisie : ce sont les valeurs V4. Exemples revérifiés :

| Objet | Feuille (V4) | Livre V5 (L06) |
|---|---|---|
| Fléau | BF +5, Perturbante, À Enroulement | +BF +4, Assommante, À Enroulement, Déséquilibrée (p.301) |
| Hallebarde (2M) | BF +4 | +BF +5 (p.301) |
| Marteau de guerre (2M) | BF +5, allonge Moyenne, Lente | +BF +6, Longue, Déséquilibrée (p.301) |
| Arc long (2M) | portée 100 | 60 (p.303) |
| Arc court (2M) | BF +2, portée 20 | +BF +3, portée 40 (p.303) |
| Arbalète (2M) | portée 60 | 50 (p.303) |
| Pistolet | +8, Recharge 1 | +9, Recharge 2 (p.303) |
| Arquebuse (2M) | portée 50, +9, Dangereuse | 40, +10, sans Dangereuse (p.303) |
| Main gauche / Brise-épée | groupe Parade | groupe Escrime, + Parade (atout) (p.301) |
| Heaume ouvert | −10 % Perception | aucune pénalité (p.307) |

## Conséquences pour l'outil (à arbitrer par le MJ)

1. **Contradiction de deux règles du MJ** : « V5 partout » et « la feuille fait foi » (arbitrage F1 du 25/10, posé pour les armes des suppléments). Sur le livre de base, elles donnent des profils différents pour 43 objets.
2. **Groupes d'armes** : la V5 n'a plus de groupe Parade (Main gauche, Brise-épée, Targe → Escrime) ; le Fouet est une arme de mêlée Fléau (Très longue), pas une arme à distance Entraves ; Bolas en Entraves ; Long fusil d'Hochland en Ingénierie. Impact direct sur F2-C (maîtrise par groupe) déjà livré.
3. **Mots-clés V4 sans équivalent V5** dans la feuille : Perturbante, Percutante, Lente, Épuisante, Précise (+10), Immobilisante, Protectrice sur les boucliers. Impact sur F2-D (calcul des Qualités) à venir.
4. **Boucliers** : en V5 ils passent dans la table des armures (PA 1/2/3 sur toutes les localisations, Qualité Bouclier : +1 DR en défense), la Targe existe aussi comme arme d'Escrime.
5. **Pénalités d'armure** : V5 = −1 DR en Discrétion pour toute maille ou plate, −2 DR en Perception pour le Heaume seulement ; la feuille garde des pourcentages V4 par pièce. Impact sur F2-D (pénalités d'armure).
6. **Munitions** : Balles et poudre sans +1, munitions improvisées −1, Grenaille Explosion +1, Flèches elfiques +10 yards et Empaleuse seule.

## Écarts douteux ou à confirmer

- « Hand Weapon » V5 unique contre Hache / Masse / Pic / Marteau / Gourdin détaillés dans la feuille (style Up in Arms) : choix de détail, pas forcément un écart.
- Appariements de noms à confirmer : Marteau à bec-de-corbin = Cavalry Hammer ; Arquebuse et Mousquet (2M) = Handgun (deux entrées identiques dans la feuille).
- Doublons dans la feuille : Pistolet ×2, Bouclier / Bouclier standard, Pavois / Pavois (Pavise), Arquebuse / Mousquet.

## Objets manquants

- Dans la feuille : Filet à distance (Entraves), Targe comme arme d'Escrime, armures rapides (Légère / Moyenne / Lourde, règle optionnelle).
- Dans le livre V5, mais présents dans la feuille : Fléchette, Arc elfique, Plastron de cuir bouilli, Cape (V4), et les armes des suppléments (normal).

## Décision à prendre

Faut-il passer les profils du livre de base de la feuille en V5 (et dans quel sens : la feuille d'abord, puis l'outil la relit) ? Si oui, c'est à faire **avant F2-D**, puisque D calcule ces Qualités, et il faudra revoir les groupes de F2-C (Parade).
