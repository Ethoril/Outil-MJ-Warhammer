# Conception — Familiers (lot D10, aucun code)

Sources : Winds of Magic (L17) pp. 180-188 (V4), lues pour ce document ; arbitrages `docs/ARBITRAGES_MJ_21_10.md` (« Familiers » : règles de Winds of Magic importées et converties en V5, **ouvertes à tous** — Magie naturelle, Sorcellerie, Collèges ; **lien automatisé** maître-familier, effets partagés, portée en saisie MJ ; **deux systèmes distincts**, animal et homoncule). Le rituel « Créer un familier » (p. 31) relève du système de rituels, à part : non relu ici, signalé en questions ouvertes. Résumés en français, aucune valeur de profil recopiée au-delà de ce qui est nécessaire à la conversion.

## 1. Inventaire des règles (L17 pp. 180-188)

| # | Règle | Page |
|---|---|---|
| F1 | Trois types : Guerrier (Combat), Puissance (Power), Sort (Spell) ; créés par le rituel de création | 180 |
| F2 | Qui peut créer quoi, selon le Domaine (tableau « Lores and Familiars ») : Collèges : trois types ; Sorcellerie : Puissance seulement ; Magie naturelle : Combat ou Puissance ; Nécromancie : trois types (petit construit mort-vivant) ; Démonologie/Chaos : trois types (entité démoniaque minuscule). Les noms de colonnes du livre ne sont pas tous lisibles à l'extraction (à vérifier visuellement) | 180 |
| F3 | Taille : petits animaux, au plus un chat bien nourri ; Combat : jusqu'à la taille d'un Halfling | 180 |
| F4 | Parle la langue principale du maître, comprend Langue (Magick) ; sans mâchoire peut parler ; personnalité propre | 181 |
| F5 | Tableau de personnalité par Vent (d10 × 8 Vents) | 181 |
| F6 | Profils types Combat / Puissance / Sort (caractéristiques, Traits, compétences, Talents, Sorts : un Familier de Sort connaît jusqu'à quatre sorts selon le niveau de Carrière du maître, un de plus à chaque niveau) | 182 |
| F7 | Formes par Vent et par type (Hysh, Chamon, Ghyran, Shyish, Azyr, Ulgu, Aqshy, Ghur) : descriptif | 182-183 |
| F8 | Un maître qui travaille plusieurs Vents choisit le Vent de création | 184 |
| F9 | Familier joueur : le maître doit rester vivant et dans le groupe, sinon le familier suit ou s'efface | 184 |
| F10 | Coût de création : le maître cède 1 Destin ou 1 Résilience ; chaque point de plus donne un point à répartir au familier | 185 |
| F11 | Compétences et Talents de création, listes par type | 185-186 |
| F12 | Talent « Imprégné de (Vent) » : +1 DR aux sorts du Domaine du Vent lancés à moins de 8 mètres (une seule fois, quel que soit le nombre de sources) ; effet propre par Vent (substitution d'une compétence de Canalisation) | 186 |
| F13 | Talent « Assistant magique » (Puissance) : +20 au lieu de +10 pour l'aide aux Tests de Canalisation, Savoir (Magie), Langue (Magick), Recherche magique | 186 |
| F14 | Équipement : Combat : armure de plates complète + armes ; Sort : grimoire et dague ; encombrement doublé hors équipement magique | 186 |
| F15 | États : le familier ignore Hémorragique, Exténué, Empoisonné et les maladies, sauf origine magique ; Enflammé ignoré avec Aqshy | 187 |
| F16 | Corruption et mutation comme un humain ; Trait Créature magique | 187 |
| F17 | Progression : une seule Carrière par type, pas de Trappings, pas d'Entreprises propres (sauf « Améliorer le familier ») ; partage des événements du maître | 187 |
| F18 | Dégâts et soins : comme tout personnage, soins non magiques sans effet, sort « Secours au serviteur magique » (L17 p. 27, lot D19) | 187 |
| F19 | Nourriture : aucune pour un familier créé, spirituel ou démoniaque ; animal : normale | 187 |
| F20 | Statut : aucun ; tests sociaux difficiles avec les étrangers | 187 |

## 2. Conversion V5

- Caractéristiques V4 déjà alignées sur les caractéristiques V5 du moteur (CC, CT, F, E, I, Ag, Dex, Int, FM, Soc) ; profil de création : à imprimer **tel quel**, aucun recalcul (règle de la phase E : « valeurs imprimées telles quelles »). Le profil est donc une donnée de bestiaire (phase E), pas un calcul de la phase D.
- Malus et bonus : ±10 → ±1 DR, ±20 → ±2 DR ; Facile (+40) du test d'identification d'un sort → Accessible +4 DR ; « Hard (−20) » social → Difficile −2 DR.
- « Imprégné de (Vent) » : +1 DR aux sorts du Domaine dans un rayon de 8 mètres, une seule source comptée ; l'effet par Vent est une substitution de compétence : sert d'**option du Test** du maître, jamais une règle automatique à la place du MJ.
- Assistant magique : +20 → **+2 DR** au lieu de +1 DR pour l'aide ; le moteur sait déjà aider (`familiarSkillSupport`, `magicAssistantId`) : à étendre à Savoir (Magie) et Recherche magique sur la valeur de l'aide.
- États : Hémorragique, Exténué et Empoisonné ignorés sauf source magique : service de Natures de la phase E (« Fabriqué / Artificiel »), à raccorder, pas à dupliquer.

## 3. Modèle de données

1. `participant.extensions.v5.familiar = { masterId, kind: 'animal' | 'homunculus', type: 'combat' | 'power' | 'spell', wind, createdAt }` ; côté maître : `extensions.v5.familiars = [familiarId…]` (liste, pas d'invention de plafond : la source n'en fixe pas).
2. Deux systèmes distincts demandés par le MJ :
   - **animal** : créature réelle (chat, chauve-souris, crapaud, rat, corbeau), nourriture et soins normaux, profil de bestiaire de la créature + enchantement (Intelligence relevée) — système de Magie naturelle et de Sorcellerie ;
   - **homoncule** : entité créée (homoncule de métal, boule de lumière, entité démoniaque), sans nourriture ni soins non magiques, profil Combat / Puissance / Sort — système des Collèges, de la Nécromancie et de la Démonologie.
3. Lien automatisé : un **lien** (`masterId` ↔ `familiars`) lu par les services existants : effets partagés (Imprégné de (Vent) rayon 8 m en saisie MJ), aide magique (`magicAssistantId`), fin de lien à la mort du maître (reçu MJ : le familier suit ou s'efface, F9). **Portée du lien en saisie MJ**, jamais suivie.
4. Création : événement unique « création de familier » (rituel, hors contrat de sort), qui débite 1 Destin ou 1 Résilience du maître (+1 par point de plus offert), ouvre le profil, crée le participant lié ; Annuler/Rétablir complets, reçu CAS.
5. Sorts du familier de Sort : liste de contrats (jusqu'à quatre, selon le niveau de Carrière du maître, +1 par niveau) ; le familier lance via le moteur de contrats avec ses propres caractéristiques ; le sort doit être connu du maître (F6).

## 4. Coordination avec la phase E

- Dépendances **de la phase E** : (a) modèle de profils de bestiaire (le profil des trois types de familier et des animaux) ; (b) service de Natures (états ignorés F15) et Trait « Créature magique » ; (c) bibliothèque de profils (ajout d'un familier au combat).
- Ce que la phase D peut faire seule : rien de lançable sans profil. Le lot **D11 (code) est BLOQUÉ** : le familier est un participant dont le profil est une donnée de bestiaire de la phase E, et le lien automatisé se branche sur ce modèle (la brique « Assistant magique » existe déjà).
- À livrer à la phase E (cases à cocher dans son plan) : participant lié (§3.1-3.2), création (§3.4), partage d'effets (§3.3), profils F6/F7, tableau F2 des types autorisés par Domaine.

## 5. Cas de test (pour le futur lot de code)

1. Création : maître Sorcellerie → seul un familier de Puissance accepté ; maître Collège → les trois ; maître Magie naturelle → Combat ou Puissance (F2, après vérification visuelle du tableau).
2. Coût : sans point cédé → refusé ; 1 Destin cédé → participant créé, Destin du maître −1 ; Annuler/Rétablir/rechargement.
3. Lien : la mort du maître déclenche le reçu MJ « le familier suit ou s'efface » ; aucune mutation automatique du familier.
4. Imprégné de (Vent) : deux familiers du même Vent à moins de 8 m comptent une seule fois (+1 DR) ; portée saisie.
5. Assistant magique : aide de +2 DR pour un familier de Puissance, +1 DR pour tout autre assistant ; jamais pour Combat (F13).
6. États : Hémorragique/Exténué/Empoisonné/Enflammé ignorés selon F15 et source magique ; animal : nourriture et soins normaux, homoncule : ni nourriture ni soins non magiques.
7. Sorts du familier de Sort : quatre au plus au niveau 1, +1 par niveau ; lancement via les contrats ; Familier de Puissance sans sorts.

## 6. Questions ouvertes (à arbitrer par le MJ)

- Rituel de création (L17 p. 31) : coût en temps et en matériel, jets, échecs ; rituels = système à part, non relu ici.
- Combien de familiers par maître (la source ne le dit pas dans les pages lues).
- Familier joueur (F9) : hors périmètre de l'outil du MJ ?
- Équivalent V5 de « Créature magique » et du talent Imprégné, noms français officiels (livre FR V5 non consulté).

## 7. Décisions du MJ du 22/10 et propositions (avant tout code)

### 7.1 Décisions

- **Création = un événement unique** « création de familier », qui débite **1 Destin ou 1 Résilience** du maître (au choix du MJ à la saisie) ; chaque point supplémentaire cédé donne 1 point à répartir (F10). Pas de rituel simulé (temps, matériel, jets de L17 p. 31 : reçu de rappel seulement). Annuler/Rétablir complets (le point est rendu), reçu CAS. Le §3.4 est confirmé.
- **Familier de joueur = PNJ allié.** Pas de fiche de joueur propre : le familier est un participant PNJ du camp des alliés, lié au maître. F9 (maître vivant et dans le groupe) reste un reçu MJ à la mort du maître : aucune mutation automatique. Cela répond à la question « familier joueur » du §6 : il est dans le périmètre, sous forme de PNJ allié.
- **Code D11 toujours bloqué** : il attend les profils de la phase E (profils types Combat / Puissance / Sort, animaux, Natures pour F15).

### 7.2 Noms français proposés (à valider)

Le livre français V5 n'a pas été consulté : propositions à valider ou corriger par le MJ.

| Terme anglais | Proposition |
|---|---|
| Familiar | Familier |
| Combat / Power / Spell familiar | Familier de Combat / de Puissance / de Sort |
| Imbued with (Wind) | Imprégné de (Vent) |
| Magical Assistant | Assistant magique |
| Magical Creature (Trait) | Créature magique |
| Improve the Familiar (Endeavour) | Améliorer le familier |
| Animal familiar / Homunculus | Familier animal / Homoncule |
| Familiar creation | Création de familier |

### 7.3 Questions restantes

- Nombre de familiers par maître (la source ne le dit pas) : proposition = aucun plafond, comme au §3.1.
- Rituel (p. 31) : à lire si le MJ veut un jour un rappel plus précis.
- Validation des noms du 7.2.
