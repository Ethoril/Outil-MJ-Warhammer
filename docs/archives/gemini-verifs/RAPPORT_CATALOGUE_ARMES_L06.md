# Rapport de vérification : Armes, munitions et armures — Livre de base V5 (L06) vs Catalogue (`js/data/reference-snapshot.json`)

> **Rappel du périmètre :** Le catalogue (`js/data/reference-snapshot.json`, alimenté par les feuilles *Armes Corps à Corps*, *Armes à Distance*, *Armures* et le complément *Munitions*) **fait foi**. Ce rapport ne propose aucune modification du code : il recense les écarts avec le **Livre de base V5 EN v2 (`L06`, pp. 300–307)** afin que le MJ puisse vérifier ou arbitrer sa feuille de référence (notamment là où la feuille conserve des profils ou mots-clés de la V4 / *Up in Arms*).  
> Hors périmètre conformément à la consigne : prix, disponibilité, encombrement.

---

## 1. Tableau des écarts (Catalogue vs L06)

### 1.1. Armes de mêlée (*Melee Weapons*, L06 p. 301)

| Objet (Catalogue / Livre L06) | Champ | Valeur catalogue (`reference-snapshot.json`) | Valeur livre L06 (page) | Remarque |
| :--- | :--- | :--- | :--- | :--- |
| **Hache, Masse, Pic de guerre, Marteau de guerre, Gourdin…** / *Hand Weapon* *(appariement douteux)* | Entrée / Qualités et Défauts | Pas d'entrée générique *Arme à une main* ; ventilé en `Hache` (*Taille, Déséquilibrée*), `Masse` (*Assommante, Déséquilibrée*), `Pic de guerre` (*Perforante, Déséquilibrée*), `Marteau de guerre` (*Déséquilibrée, Assommante ou Perforante*), `Gourdin` (*Inoffensive, Déséquilibrée*) | `Hand Weapon` : Groupe `Basic`, Allonge `Average`, Dégâts `+SB + 4`, Défaut `Unbalanced` (p. 300–301) | L06 p. 300 regroupe haches, masses et marteaux sous *« Hand Weapon [...] Unbalanced »* ; la feuille les détaille (façon *Up in Arms*). |
| **Filet lesté (2M)** (`Parade`) / *Net* (`Basic`) *(appariement douteux)* | Groupe (et 2M) | `Parade`, nom `Filet lesté (2M)` | `Basic`, `Net` (1M) (p. 301) | L06 supprime le groupe *Parry* et place le filet de mêlée en `Basic` à 1 main. |
| **Filet lesté (2M)** / *Net* (`Basic`) | Dégâts | `BF +0` | `–` *(aucun dégât)* (p. 301) | L06 p. 300 : *« Weapons with a Damage of – deal no Damage. »* |
| **Filet lesté (2M)** / *Net* (`Basic`) | Qualités et Défauts | `Immobilisante, Défensive, Protectrice 1, Lente, Inoffensive, À Enroulement` | `Defensive, Inflict (Entangled 50)` (p. 301) | Le catalogue garde le profil V4 (*Filet lesté*) ; L06 remplace *Entangle* par `Inflict (Entangled 50)` et retire 4 mots-clés. |
| **Garrot (2M)** / *(2H) Garrote* | Qualités et Défauts | `Immobilisante, Lente, Déséquilibrée, Inoffensive` | `Inflict (Entangled your Strength), Undamaging` (p. 301) | L06 retire `Lente` (*Slow*) et `Déséquilibrée` (*Unbalanced*), et précise `Inflict (Entangled your Strength)`. |
| **Marteau à bec-de-corbin (2M)** / *(2H) Cavalry Hammer* *(appariement de nom à confirmer)* | Qualités et Défauts (note de groupe) | `Assommante` (nom français : *Marteau à bec-de-corbin (2M)*) | `Pummel` + règle de groupe `Cavalry` : *« count as Two-handed weapons »* à pied (p. 300–301) | Stats identiques (`Cavalerie`, `Longue`, `BF +5`, `Assommante`), traduction de *Cavalry Hammer* par *Marteau à bec-de-corbin*. |
| **Lance de cavalerie** / *Lance\** | Qualités et Défauts | `Empaleuse, Percutante, bonus si charge` (`keywords`: `empaleuse`, `percutante` ; dégâts `BF +6*`) | `Damaging, Impale` + note `*` : *« count as Improvised Weapons if used on a Turn where you have not Charged »* (p. 301) | En V5, `Percutante` (*Impact*) est remplacée par `Dévastatrice` (*Damaging*), et la règle de charge devient « compte comme Arme improvisée hors tour de Charge ». |
| **Targe (Buckler)** (`Bouclier`) / *Buckler* (`Fencing`) | Groupe | `Bouclier` (`kind: "shield"`, pas d'entrée dans `Escrime`) | `Fencing` (en mêlée, p. 301) **et** `Armour / Shields` (en armure, p. 307) | Dans L06, la Targe (*Buckler*) figure dans deux tables : `Fencing` (p. 301) et `Shields` (p. 307). |
| **Targe (Buckler)** / *Buckler* (`Fencing`) | Allonge | `Très courte` (déduite du profil bouclier) | `Personal` (p. 301) | Écart d'allonge en usage mêlée (`Très courte` vs `Personal`). |
| **Targe (Buckler)** / *Buckler* (`Fencing`) | Dégâts | `BF + 2` (CSV : `Parade`, moteur : `BF + 2`) | `+SB + 1` (p. 301) | Écart de dégâts en mêlée (`BF + 2` vs `+SB + 1`). |
| **Targe (Buckler)** / *Buckler* (`Fencing`) | Qualités et Défauts (mêlée) | `Protectrice 1, Défensive, Inoffensive.` | `Parry, Undamaging` (p. 301) | En mêlée V5, le *Buckler* a l'atout `Parade` (*Parry*) et `Inoffensive` (*Undamaging*). |
| **Main gauche** / *Main Gauche* | Groupe | `Parade` | `Fencing` (`Escrime`) (p. 301) | Le groupe `Parade` n'existe plus dans L06 : *Main Gauche* passe en `Fencing`. |
| **Main gauche** / *Main Gauche* | Allonge | `Très courte` | `Short` (`Courte`) (p. 301) | Allonge passée de *Très courte* (V4) à `Short` (*Courte*) en V5. |
| **Main gauche** / *Main Gauche* | Qualités et Défauts | `Défensive` | `Defensive, Impale, Parry` (p. 301) | L06 ajoute `Empaleuse` (*Impale*) et `Parade` (*Parry*). |
| **Brise-épée** / *Swordbreaker* | Groupe | `Parade` | `Fencing` (`Escrime`) (p. 301) | Passé du groupe `Parade` (V4) au groupe `Fencing` (`Escrime`) dans L06. |
| **Brise-épée** / *Swordbreaker* | Dégâts | `BF +3` | `+SB + 1` (p. 301) | Dégâts réduits de `BF +3` (V4) à `+SB + 1` dans L06. |
| **Brise-épée** / *Swordbreaker* | Qualités et Défauts | `Défensive, Piège-lame` | `Defensive, Parry, Trap Blade` (p. 301) | L06 ajoute l'atout `Parade` (*Parry*). |
| **Fléau** / *Flail* | Dégâts | `BF +5` | `+SB + 4` (p. 301) | Dégâts réduits de `BF +5` (V4) à `+SB + 4` dans L06. |
| **Fléau** / *Flail* | Qualités et Défauts | `Perturbante, À Enroulement` | `Pummel, Wrap, Unbalanced` (p. 301) | En V5, `Perturbante` (*Distract*) disparaît : remplacée par `Assommante` (*Pummel*) + défaut `Déséquilibrée` (*Unbalanced*). |
| **Fléau à grain** / *(2H) Grain Flail* | Nom (2M) et Allonge | `Fléau à grain` (sans mention `2M`), Allonge `Moyenne` | `(2H) Grain Flail`, Allonge `Long` (`Longue`) (p. 301) | Arme à deux mains d'allonge `Long` dans L06. |
| **Fléau à grain** / *(2H) Grain Flail* | Qualités et Défauts | `Perturbante, Imprécise, À Enroulement` | `Pummel, Imprecise` (p. 301) | L06 remplace `Perturbante` par `Assommante` (*Pummel*) et retire `À Enroulement` (*Wrap*). |
| **Fléau d’armes (2M)** / *(2H) Military Flail* | Dégâts | `BF +6` | `+SB + 5` (p. 301) | Dégâts réduits de `BF +6` (V4) à `+SB + 5` dans L06. |
| **Fléau d’armes (2M)** / *(2H) Military Flail* | Qualités et Défauts | `Perturbante, Percutante, Épuisante, À Enroulement` | `Damaging, Pummel, Wrap, Unbalanced` (p. 301) | L06 remplace `Perturbante, Percutante, Épuisante` par `Dévastatrice, Assommante, Déséquilibrée`. |
| **Fouet** / *Whip* | Groupe | `Entraves` (classé en *Armes à Distance*) | `Flail` (`Fléau`, classé en *Melee Weapons*) (p. 301) | Dans L06, le *Whip* est une arme de mêlée du groupe `Flail` (et non une arme à distance *Entangling*). |
| **Fouet** / *Whip* | Allonge / Portée | Allonge vide, Portée `6` | Allonge `Very Long` (`Très longue`), pas de portée de tir (p. 301) | En V5, allonge de mêlée `Very Long` au lieu d'une portée de `6`. |
| **Fouet** / *Whip* | Qualités et Défauts | `Immobilisante` | `Wrap, Unbalanced, Undamaging` (p. 301) | En V5 : `À Enroulement, Déséquilibrée, Inoffensive` (au lieu de `Immobilisante`). |
| **Hallebarde (2M)** / *(2H) Halberd* | Dégâts | `BF +4` | `+SB + 5` (p. 301) | Dégâts augmentés à `+SB + 5` dans L06 (contre `BF +4` en V4). |
| **Bâton de combat (2M)** / *(2H) Quarterstaff* | Dégâts | `BF +4` | `+SB + 3` (p. 301) | Dégâts réduits à `+SB + 3` dans L06 (contre `BF +4` en V4). |
| **Bâton de combat (2M)** / *(2H) Quarterstaff* | Qualités et Défauts | `Assommante, Défensive` | `Defensive, Pummel, Undamaging` (p. 301) | L06 ajoute le défaut `Inoffensive` (*Undamaging*) au bâton. |
| **Lance (2M)** / *(2H) Spear\*\** | Qualités et Défauts | `Empaleuse` | `Fast, Impale` + note `**` : *« can be used one-handed, but lose –1 Weapon Damage and Fast »* (p. 301) | L06 ajoute l'atout `Rapide` (*Fast*) et la règle d'usage à une main (`-1` Dégât et perte de *Fast*). |
| **Épée bâtarde (2M)** / *(2H) Bastard Sword\*\*\** | Qualités et Défauts (note) | `Dévastatrice, Défensive` | `Damaging, Defensive` + note `***` : *« one-handed with Melee (Basic), but lose Damaging and gain Unbalanced »* (p. 301) | Profil 2M identique, mais L06 ajoute la règle d'usage à 1 main en `Melee (Basic)` (perd *Damaging*, gagne *Unbalanced*). |
| **Grande hache (2M)** / *(2H) Greataxe* | Qualités et Défauts | `Épuisante, Percutante, Taille` | `Damaging, Hack, Unbalanced` (p. 301) | En V5, `Épuisante` (*Tiring*) et `Percutante` (*Impact*) sont remplacées par `Dévastatrice` (*Damaging*) et `Déséquilibrée` (*Unbalanced*). |
| **Pioche (2M)** / *(2H) Pick* | Allonge | `Moyenne` | `Long` (`Longue`) (p. 301) | Allonge passée de `Moyenne` (V4) à `Long` (`Longue`) dans L06. |
| **Pioche (2M)** / *(2H) Pick* | Qualités et Défauts | `Dévastatrice, Empaleuse, Lente` | `Damaging, Penetrating, Unbalanced` (p. 301) | L06 remplace `Empaleuse` et `Lente` par `Perforante` (*Penetrating*) et `Déséquilibrée` (*Unbalanced*). |
| **Marteau de guerre (2M)** / *(2H) Warhammer* | Allonge | `Moyenne` | `Long` (`Longue`) (p. 301) | Allonge passée de `Moyenne` (V4) à `Long` (`Longue`) dans L06. |
| **Marteau de guerre (2M)** / *(2H) Warhammer* | Dégâts | `BF +5` | `+SB + 6` (p. 301) | Dégâts passés de `BF +5` (V4) à `+SB + 6` dans L06. |
| **Marteau de guerre (2M)** / *(2H) Warhammer* | Qualités et Défauts | `Assommante, Dévastatrice, Lente` | `Damaging, Pummel, Unbalanced` (p. 301) | En V5, `Lente` (*Slow*) est remplacée par `Déséquilibrée` (*Unbalanced*). |

*(Note : `Dague` / *Dagger*, `Couteau` / *Knife*, `Arme improvisée` / *Improvised Weapon*, `Épée` / *Sword*, `Coup-de-poing` / *Knuckledusters*, `Mains nues` / *Unarmed*, `Fleuret` / *Foil*, `Rapière` / *Rapier*, `Pique (2M)` / *(2H) Pike* et `Zweihänder (2M)` / *(2H) Zweihänder* sont **100 % conformes** à L06 p. 301).*

---

### 1.2. Munitions (*Ammunition*, L06 p. 302)

| Objet (Catalogue / Livre L06) | Champ | Valeur catalogue (`reference-snapshot.json`) | Valeur livre L06 (page) | Remarque |
| :--- | :--- | :--- | :--- | :--- |
| **Balles et poudre (12)** / *Bullet and Powder (12)* | Groupe | `Poudre Noire` | `Blackpowder and Engineering` (p. 302) | En L06, le groupe couvre *Blackpowder* et *Engineering*. |
| **Balles et poudre (12)** / *Bullet and Powder (12)* | Dégâts | `+1` | `–` *(aucun modificateur)* (p. 302) | Le `+1` de dégâts de la V4 a été supprimé dans L06 (intégré aux dégâts des armes à poudre). |
| **Munitions improvisées et poudre** / *Improvised Shot and Powder* | Groupe | `Poudre Noire` | `Blackpowder and Engineering` (p. 302) | — |
| **Munitions improvisées et poudre** / *Improvised Shot and Powder* | Dégâts | `+0` | `–1` (p. 302) | Dans L06, les munitions improvisées infligent `–1` aux dégâts (et n'ont plus aucun atout). |
| **Grenaille et poudre (12)** / *Small Shot and Powder (12)* | Groupe | `Poudre Noire` | `Blackpowder and Engineering` (p. 302) | — |
| **Grenaille et poudre (12)** / *Small Shot and Powder (12)* | Qualités et Défauts | `[]` (`notes: "Atouts à confirmer par le MJ."`) | `Blast +1` (p. 302) | L06 p. 302 indique `Blast +1` (réservé au Tromblon / *Blunderbuss*). |
| **Flèches elfiques (12)** / *Elf Arrow* | Nom (quantité) | `Flèches elfiques (12)` | `Elf Arrow` *(à l'unité)* (p. 302) | Vendue à l'unité dans L06 (contre par 12 en V4). |
| **Flèches elfiques (12)** / *Elf Arrow* | Portée | `Comme l’arc + 50` | `+10` (p. 302) | Bonus de portée réduit de `+50` (V4) à `+10` yards dans L06. |
| **Flèches elfiques (12)** / *Elf Arrow* | Dégâts | `+1` | `–` *(aucun bonus)* (p. 302) | Le bonus `+1` aux dégâts (V4) est supprimé dans L06. |
| **Flèches elfiques (12)** / *Elf Arrow* | Qualités et Défauts | `Précise, Empaleuse, Perforante` | `Impale` (p. 302) | L06 retire `Précise` (*Accurate*) et `Perforante` (*Penetrating*), ne gardant que `Impale` (*Empaleuse*). |

*(Note : `Flèches (12)` / *Arrow (12)*, `Carreaux (12)` / *Bolt (12)*, `Balles de plomb (12)` / *Lead Bullet (12)* et `Pierres (12)` / *Stone Bullet (12)* sont **100 % conformes** à L06 p. 302).*

---

### 1.3. Armes à distance (*Ranged Weapons*, L06 p. 303)

| Objet (Catalogue / Livre L06) | Champ | Valeur catalogue (`reference-snapshot.json`) | Valeur livre L06 (page) | Remarque |
| :--- | :--- | :--- | :--- | :--- |
| **Tromblon (2M)** / *(2H) Blunderbuss* | Qualités et Défauts | `Explosion 3, Dangereuse, Recharge 2, À Poudre noire, Dévastatrice` | `Blast 3, Dangerous, Reload 3` + `*` (`Blackpowder, Damaging`) (p. 303) | `Recharge` passe de `2` (V4) à `Reload 3` dans L06. |
| **Arquebuse (2M)** (et doublon **Mousquet (2M)**) / *(2H) Handgun* *(appariement à vérifier)* | Portée | `50` | `40` (p. 303) | Le catalogue a deux entrées identiques (`Arquebuse (2M)` et `Mousquet (2M)`) ; dans L06, la portée de *(2H) Handgun* est `40` (contre `50` en V4). |
| **Arquebuse (2M)** (et **Mousquet (2M)**) / *(2H) Handgun* | Dégâts | `+9` | `+10` (p. 303) | Dégâts passés de `+9` (V4) à `+10` dans L06. |
| **Arquebuse (2M)** (et **Mousquet (2M)**) / *(2H) Handgun* | Qualités et Défauts | `Dangereuse, Recharge 3, À Poudre noire, Dévastatrice` | `Reload 3` + `*` (`Blackpowder, Damaging`) — **sans `Dangerous`** (p. 303) | Dans L06, *(2H) Handgun* n'a plus le défaut `Dangereuse` (*Dangerous*). |
| **Pistolet** (présent 2 fois : idx 136 et 139) / *Pistol* | Dégâts | `+8` | `+9` (p. 303) | Dégâts passés de `+8` (V4) à `+9` dans L06. (Noter aussi le doublon `pistolet` / `pistolet-2` dans le catalogue). |
| **Pistolet** / *Pistol* | Qualités et Défauts | `Pistolet, Recharge 1, À Poudre noire, Dévastatrice` | `Pistol, Reload 2` + `*` (`Blackpowder, Damaging`) (p. 303) | `Recharge` passe de `1` (V4) à `Reload 2` dans L06. |
| **Arc (2M)** / *(2H) Bow* | Dégâts | `BF +3` | `+SB + 4` (p. 303) | Dégâts passés de `BF +3` (V4) à `+SB + 4` dans L06. |
| **Arc long (2M)** / *(2H) Longbow* | Portée | `100` | `60` (p. 303) | Portée réduite de `100` (V4) à `60` yards dans L06. |
| **Arc court (2M)** / *(2H) Shortbow* | Portée | `20` | `40` (p. 303) | Portée augmentée de `20` (V4) à `40` yards dans L06. |
| **Arc court (2M)** / *(2H) Shortbow* | Dégâts | `BF +2` | `+SB + 3` (p. 303) | Dégâts passés de `BF +2` (V4) à `+SB + 3` dans L06. |
| **Arbalète (2M)** / *(2H) Crossbow* | Portée | `60` | `50` (p. 303) | Portée réduite de `60` (V4) à `50` yards dans L06. |
| **Arbalète de poing** / *Crossbow Pistol* | Portée | `10` | `20` (p. 303) | Portée passée de `10` (V4) à `20` yards dans L06. |
| **Arbalète de poing** / *Crossbow Pistol* | Qualités et Défauts | `Pistolet` | `Pistol, Reload 1` (p. 303) | L06 ajoute le défaut `Reload 1` (`Recharge 1`). |
| **Arbalète lourde (2M)** / *(2H) Heavy Crossbow* | Portée | `100` | `60` (p. 303) | Portée réduite de `100` (V4) à `60` yards dans L06. |
| **Arbalète lourde (2M)** / *(2H) Heavy Crossbow* | Dégâts | `+9` | `+10` (p. 303) | Dégâts passés de `+9` (V4) à `+10` dans L06. |
| **Arbalète lourde (2M)** / *(2H) Heavy Crossbow* | Qualités et Défauts | `Dévastatrice, Recharge 2` | `Reload 2` *(sans Damaging)* (p. 303) | L06 retire l'atout `Dévastatrice` (*Damaging*) en compensant par `+10` de dégâts. |
| **Arquebuse à répétition (2M)** / *(2H) Repeater Handgun* | Portée | `30` | `40` (p. 303) | Portée passée de `30` (V4) à `40` yards dans L06. |
| **Arquebuse à répétition (2M)** / *(2H) Repeater Handgun* | Dégâts | `+9` | `+10` (p. 303) | Dégâts passés de `+9` (V4) à `+10` dans L06. |
| **Pistolet à répétition** / *Repeater Pistol* | Portée | `10` | `20` (p. 303) | Portée passée de `10` (V4) à `20` yards dans L06. |
| **Pistolet à répétition** / *Repeater Pistol* | Dégâts | `+8` | `+9` (p. 303) | Dégâts passés de `+8` (V4) à `+9` dans L06. |
| **Long fusil d’Hochland (2M)** / *(2H) Hochland Long Rifle* | Groupe | `Poudre Noire` | `Engineering` (`Ingénierie`) (p. 303) | Classé en `Poudre Noire` dans la feuille, mais en `Engineering` dans L06 p. 303. |
| **Long fusil d’Hochland (2M)** / *(2H) Hochland Long Rifle* | Dégâts | `+9` | `+10` (p. 303) | Dégâts passés de `+9` (V4) à `+10` dans L06. |
| **Long fusil d’Hochland (2M)** / *(2H) Hochland Long Rifle* | Qualités et Défauts | `Précise, Pointue, Recharge 4, À Poudre noire, Dévastatrice` | `Precise, Reload 4` + `*` (`Blackpowder, Damaging`) (p. 303) | L'atout V4 `Précise` (*Accurate*, +10) n'existe plus dans L06, qui ne garde que `Precise` (*Pointue*, +1 DR). |
| **Bolas** / *Bolas* | Groupe | `Lancer` | `Entangling` (`Entraves`) (p. 303) | Classé en `Lancer` dans la feuille, mais en `Entangling` (`Entraves`) dans L06 p. 303. |
| **Bolas** / *Bolas* | Qualités et Défauts | `Immobilisante` | `Inflict (Entangled 35), Inflict (Prone), Undamaging***` (si touche aux Jambes) (p. 303) | L06 remplace *Entangle* par `Inflict (Entangled 35), Inflict (Prone), Undamaging` (avec note `***` : sur localisation Jambe uniquement). |
| **Lasso** / *(2H) Lasso\*\** | Nom (2M) et Qualités | `Lasso` (sans `2M`), `Immobilisante` | `(2H) Lasso**`, `Inflict (Entangled 45)` + note `**` (*no range bands*) (p. 303) | Arme à 2 mains dans L06, infligeant `Entangled 45` sans paliers de portée. |
| **Bombe** / *Bomb* | Qualités et Défauts | `Explosion 5, Dangereuse, Percutante` (`keywords`: `dangereuse`, `explosion:5`, `percutante`) | `Blast 5, Inflict (Deafened), Dangerous` + `*` (`Blackpowder, Damaging`) (p. 303) | Dans L06, la Bombe a `À Poudre noire` (*Blackpowder*), `Dévastatrice` (*Damaging* au lieu de *Percutante*), et `Inflict (Deafened)` (*Assourdi*). |
| **Bombe incendiaire** / *Incendiary* | Dégâts | `Spécial***` (`notes`: *donne +DR État Enflammé*) | `8` (p. 303) | En V5, l'*Incendiary* inflige `8` de dégâts fixes (avec *Damaging* via `*`). |
| **Bombe incendiaire** / *Incendiary* | Qualités et Défauts | `Explosion 4, Dangereuse` (+ note `***`) | `Blast 4, Inflict (Ablaze), Dangerous` + `*` (`Blackpowder, Damaging`) (p. 303) | L06 ajoute `Blackpowder` et `Damaging` (via `*`) et formalise `Inflict (Ablaze)`. |
| **Fronde** / *Sling* | Portée | `60` | `40` (p. 303) | Portée réduite de `60` (V4) à `40` yards dans L06. |
| **Fustibale (2M)** / *(2H) Staff Sling* | Portée | `100` | `50` (p. 303) | Portée réduite de `100` (V4) à `50` yards dans L06. |
| **Rocher** / *Rock* | Dégâts | `BF` | `+SB + 1` (p. 303) | Dégâts passés de `BF` (V4) à `+SB + 1` dans L06. |
| **Rocher** / *Rock* | Qualités et Défauts | `-` (`[]`) | `Undamaging` (`Inoffensive`) (p. 303) | L06 ajoute le défaut `Undamaging` (`Inoffensive`). |

*(Note : `Javelot` / *Javelin*, `Hache de lancer` / *Throwing Axe* et `Couteau de lancer` / *Throwing Knife* sont **100 % conformes** à L06 p. 303).*

---

### 1.4. Armures et Boucliers (*Armour*, L06 p. 307)

| Objet (Catalogue / Livre L06) | Champ | Valeur catalogue (`reference-snapshot.json`) | Valeur livre L06 (page) | Remarque |
| :--- | :--- | :--- | :--- | :--- |
| **Targe (Buckler), Bouclier / Bouclier standard, Grand Bouclier** / *Buckler, Shield, Large Shield* | Catégorie et Qualités | Classés en armes de mêlée (`kind: "shield"`, catégorie `Bouclier`), atouts `Protectrice X, Défensive, Inoffensive` (+ doublon `Bouclier` idx 47 et `Bouclier standard` idx 50) | Table `ARMOUR`, section `SHIELDS`, PA = `1` / `2` / `3`, Qualité d'armure `Shield` (p. 306–307) | Dans L06, les boucliers passent dans le tableau des Armures avec la qualité `Shield` (+1 DR en défense, PA sur toutes localisations, arme improvisée en attaque p. 306). |
| **Calotte de cuir, Veste de cuir, Justaucorps de cuir, Jambières de cuir** / *Leather Coif, Leather Jack, Leather Jerkin, Leather Leggings* | Groupe (nom de catégorie) | `Cuir Souple` | `LEATHER (or QUILTED or PADDED)*` (p. 307) | Simple différence d'intitulé de catégorie ; emplacements, PA (`1`) et qualités (`Partielle` sur la calotte, `-` ailleurs) sont **100 % identiques**. |
| **Coiffe de mailles** / *Mail Coif* | Qualités, Défauts et Pénalités | `Flexible, Partielle (-10% en Perception)` + pas de pénalité de Discrétion listée | `Flexible, Partial`, Penalty `–` (pas de malus Perception), mais note `**` : `–1 SL to Stealth Tests` pour toute maille (p. 307) | Dans L06, la *Mail Coif* n'a **aucune** pénalité de Perception, mais toute armure de mailles donne `-1 DR` en Discrétion (`**`). |
| **Chausses de mailles, Cotte de mailles, Chemise de mailles** / *Mail Chausses, Mail Coat, Mail Shirt* | Pénalités (note) | `Flexible` (sans mention de pénalité de Discrétion) | `Flexible` + note `**` : *« Wearing any Chainmail or Plate confers a penalty of –1 SL to Stealth Tests each »* (p. 307) | Emplacements, PA (`2`) et qualité `Flexible` conformes ; seule la note générale `-1 DR Discrétion` (`**`) diffère. |
| **Heaume** / *Helm* | Pénalités (dans `notes`) | `Impénétrable, Points faibles (-20% en Perception)` | `Impenetrable, Weakpoints`, Penalty `–2 SL Perception` (+ note `**` `–1 SL Stealth`) (p. 307) | La feuille exprime la pénalité en échelle V4 (`-20% en Perception`) au lieu de `–2 SL Perception` (V5). |
| **Heaume ouvert** / *Open Helm* | Pénalités (dans `notes`) | `Partielle (-10% en Perception)` | `Partial`, Penalty `–` *(aucune pénalité de Perception)* (+ note `**` `–1 SL Stealth`) (p. 307) | Dans L06 p. 307, l'*Open Helm* n'a **plus** de pénalité de Perception (`Penalty: –`). |
| **Jambières d’acier** / *Plate Leggings* | Pénalités (dans `notes`) | `Impénétrable, Points faibles (-10 en Discrétion supplémentaire)` | `Impenetrable, Weakpoints`, Penalty `–` (seule s'applique la note générale `**` `–1 SL Stealth` pour toute plate) (p. 307) | En V5, la pénalité de Discrétion (`-1 DR`) est globale au port de Plates (`**`), et non spécifique aux jambières en `%`. |
| **Brassards, Plastron** / *Bracers, Breastplate* | Pénalités (note) | `Impénétrable, Points faibles` (sans note Discrétion) | `Impenetrable, Weakpoints` + note `**` (`–1 SL to Stealth Tests` pour toute plate) (p. 307) | Emplacements, PA (`2`) et qualités/défauts **100 % conformes** à L06 p. 307. |

---

## 2. Objets absents d'une source à l'autre

### 2.1. Objets du livre de base V5 (L06) absents du catalogue

1. **Net *(Ranged / Entangling)*** — L06 p. 303 : Groupe `Entangling`, Portée `SB`, Dégâts `–`, Qualité `Inflict (Entangled 50)`. *(Le catalogue possède `Filet lesté (2M)` en mêlée `Parade`, mais aucun Filet dans la catégorie à distance `Entraves`).*
2. **Light Armour, Medium Armour, Heavy Armour *(Quick Armour)*** — L06 p. 307 : Table optionnelle *Quick Armour* (`All` locations, PA `1` / `3` / `5`). *(Règle optionnelle d'armure simplifiée, absente du catalogue).*
3. **Buckler *(en tant qu'arme du groupe Escrime / Fencing)*** — L06 p. 301 : Présent dans le catalogue uniquement sous `Bouclier` (`Targe (Buckler)`), mais absent de la catégorie `Escrime`.

### 2.2. Objets du catalogue (rattachés au livre de base / hors suppléments explicites) introuvables dans L06

Les entrées ci-dessous proviennent du Livre de base V4 FR (L05) ou de suppléments (*Up in Arms*, *Archives of the Empire*), mais sont mêlées aux catégories générales du catalogue sans étiquette d'espèce/supplément dans leur nom :

- **Armes de mêlée :**
  - `Base` : **Hache**, **Masse**, **Gourdin**, **Pic de guerre**, **Marteau de guerre** (remplacés dans L06 p. 300–301 par l'entrée unique *Hand Weapon*), ainsi que **Couteau Bollock**, **Cimeterre**, **Hache barbelée**, **Fendoir de Mamie**, **Poêle en fer** (issus de suppléments).
  - `Bagarre` : **Gantelet à pointes**, **Gaffe de marin**, **Gantelet verrouillé**, **Matraque souple** (issus de *Up in Arms*).
  - `Cavalerie` : **Demi-lance**, **Sabre** (issus de *Up in Arms*).
  - `Armes d'Hast` : **Ahlspiess (2M)**, **Guisarme (2M)**, **Mancatcher (2M)**, **Partizan/Glaive (2M)**, **Hache d'armes (2M)** (issus de *Up in Arms*).
  - `Deux-Mains` : **Zweihänder Flamberge (2M)**, **Hache de Tueur (2M)** (suppléments).
  - `Escrime` : **Petit sabre** (*Small Sword*, supplément).
  - `Parade` : **Cape** (issue du Livre de base V4, supprimée dans L06).
  - `Bouclier` : **Pavois** / **Pavois (Pavise)** (doublon dans le catalogue, issu de *Up in Arms* / V4, absent de L06), et doublon **Bouclier** (idx 47) / **Bouclier standard** (idx 50).
- **Armes à distance :**
  - `Lancer` : **Fléchette** (*Dart*, présente dans le Livre de base V4 FR p. 295 avec correction de portée rattachée au `Livre de base FR, p. 295` dans `reference-equipment-builder.js`, mais **supprimée** dans L06 p. 303).
  - `Arc` : **Arc elfique (2M)** (*Elf Bow*, présent dans le Livre de base V4 FR, mais **absent** de la table des armes de L06 p. 303 alors que l'*Elf Arrow* est restée p. 302).
  - `Poudre Noire` : Doublon **Mousquet (2M)** (identique à `Arquebuse (2M)`), doublon **Pistolet** (idx 136 et 139), plus les armes de suppléments (**Mousquet à mèche (2M)**, **Tromblon à mèche (2M)**, **Mousquet double canon (2M)**, **Pistolet Griffonsfoot**, **Hache-Fusil (2M)**, **Hallebarde-Fusil (2M)**, **Canon naval (petit/moyen)**, **Mortier naval**).
  - `Ingénierie` : **Poivrière**, **Mortier de main (2M)**, **Pistolet-Canne**, **Pistolet Drakefire** (suppléments).
  - `Explosifs` : **Bombe Cinderblast** (supplément).
  - `Siège` : **Baliste navale**, **Catapulte (petite)**, **Catapulte (moyenne)** (suppléments).
- **Armures :**
  - `Cuir Bouilli` : **Plastron de cuir** (*Boiled Leather Breastplate*, présent dans le Livre de base V4 FR p. 300, mais **supprimé** dans L06 p. 307).
  - `Amélioration` : **Gantelet à pointes**, **Gantelet verrouillé** (suppléments).

---

## 3. Synthèse

**74 objets du livre de base V5 (L06) examinés (70 appariés au catalogue + 4 absents du catalogue, hors *Quick Armour* : 1 absent hors *Buckler* Escrime et *Quick Armour*) : 43 objets présentent au moins un écart de profil (soit 77 champs en écart au total, principalement dus au maintien des valeurs et mots-clés V4 dans la feuille du MJ) et 27 objets sont strictement identiques.**
