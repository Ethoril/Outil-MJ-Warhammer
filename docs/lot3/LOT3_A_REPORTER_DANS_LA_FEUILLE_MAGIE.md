# Cellules à reporter dans l’onglet Magie

14 octobre 2026. 157 sorts modifiés localement, retours de vérification intégrés. Le nom est la clé de ligne ; Nom et Type sont conservés. Seules les cellules listées ci-dessous doivent être remplacées. Aucun envoi dans Google Sheets effectué.

**Collage dans Google Sheets :** si une cellule commence par `=` ou `+`, ajouter une apostrophe devant pour conserver un texte littéral. L’apostrophe sert à la saisie, elle ne fait pas partie du texte attendu. Les blocs contiennent les valeurs exactes, sans Markdown interne.

Colonnes : Nom · Type · NI · Portée · Cible · Durée · Description.

## Arcanes

### Arme aethyrique

Nom (clé) : Arme aethyrique

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 242

**NI**

```text
3
```

**Durée**

```text
Bonus de Force Mentale Rounds
```

**Description**

```text
Vous invoquez une arme de mêlée Magique choisie dans le tableau V5 p. 301. Elle utilise son profil d’arme, ses Dégâts et la compétence appropriée, pendant Bonus de Force Mentale Rounds.
```

### Armure aethyrique

Nom (clé) : Armure aethyrique

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 242

**Durée**

```text
Bonus de Force Mentale Rounds
```

### Attaques en chaine

Nom (clé) : Attaques en chaine

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 243

**Description**

```text
Un projectile magique +4 frappe la première cible. S’il inflige plus de Blessures réelles que son BE, il passe à la cible la plus proche à Bonus de Force Mentale mètres de la précédente, en perdant 1 Dégât par rebond. Jusqu’à Bonus de Force Mentale rebonds sont permis, plus un par +2 DR. Si les Blessures infligées sont égales ou inférieures au BE, la chaîne s’arrête.
```

### Bouclier anti-flèches

Nom (clé) : Bouclier anti-flèches

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 243

**Cible**

```text
ZdE (Bonus de Force Mentale) mètres
```

**Durée**

```text
Bonus de Force Mentale Rounds
```

### Chute

Nom (clé) : Chute

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 244

**Portée**

```text
(Force Mentale) mètres
```

**Description**

```text
Vous faites lâcher un objet tenu à une cible qui échoue à Dextérité (+0 DR). Chaque +2 DR de surpuissance impose −1 DR supplémentaire à ce Test.
```

### Déplacement d’objet

Nom (clé) : Déplacement d’objet

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 244

**Description**

```text
Vous déplacez un objet non conscient dont aucune dimension ne dépasse 1 + DR final mètres. Votre Force pour le manipuler est votre Force Mentale ; il se déplace de Bonus de Force Mentale mètres, puis Bonus de Force Mentale mètres supplémentaires par +2 DR. Un obstacle vivant peut opposer Force à votre Force Mentale.
```

### Enchevêtrement

Nom (clé) : Enchevêtrement

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 244

**Portée**

```text
Bonus de Force Mentale mètres
```

**Durée**

```text
Bonus de Force Mentale Rounds
```

**Description**

```text
À Bonus de Force Mentale mètres, la cible gagne 1 Enchevêtré de Force égale à votre Force Mentale. L’état peut être retiré normalement et disparaît au plus tard après Bonus de Force Mentale Rounds ; la surpuissance n’ajoute pas d’états supplémentaires.
```

### Envol

Nom (clé) : Envol

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 244

**Durée**

```text
Bonus de Force Mentale Rounds
```

**Description**

```text
Vous gagnez Vol (Athlétisme), V5 p. 358, pendant Bonus de Force Mentale Rounds.
```

### Pont

Nom (clé) : Pont

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 243

**Portée**

```text
Force Mentale mètres
```

**Cible**

```text
Spécial
```

**Durée**

```text
Bonus de Force Mentale Rounds
```

**Description**

```text
Vous créez un pont de magie dont la longueur et la largeur maximales sont chacune Bonus de Force Mentale mètres. Chaque +2 DR permet d’augmenter une de ces dimensions de Bonus de Force Mentale mètres.
```

### Poussée

Nom (clé) : Poussée

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 245

**Cible**

```text
ZdE (Bonus de Force Mentale) mètres maximum
```

**Description**

```text
Les occupants dans Bonus de Force Mentale mètres sont repoussés de Bonus de Force Mentale mètres, subissent 1d10 Dégâts ignorant les PA mais conservant le BE, puis gagnent À Terre. Une créature de taille égale ou inférieure heurtée par une victime tombe À Terre sans subir de Dégâts. Chaque +2 DR augmente le recul de Bonus de Force Mentale mètres.
```

### Protection

Nom (clé) : Protection

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 245

**NI**

```text
6
```

**Description**

```text
Vous gagnez Protection (7+) pendant Bonus de Force Mentale Rounds.
```

### Sang corrosif

Nom (clé) : Sang corrosif

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 243

**NI**

```text
2
```

**Durée**

```text
Bonus d’Endurance Rounds ou heures
```

**Description**

```text
Vous gagnez Sang corrosif pendant BE Rounds. Autre formulation : pendant BE heures, les petits parasites qui vous mordent meurent sans transmettre de maladie ; Pourriture du sang et maladies similaires sont purgées.
```

### Souffle

Nom (clé) : Souffle

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 243

**Portée**

```text
Spécial
```

**Description**

```text
Choisissez une cible à 20 + Bonus de Force Mentale mètres et effectuez CT (+0 DR), opposé à l’Esquive de la cible et des voisins dans Bonus d’Intelligence mètres. Ceux qui ne battent pas votre résultat sont touchés. Base Bonus de Force Mentale Dégâts : Métal +4 et dommages aux objets ; Bêtes/Lumière +2 et Exténué ; Cieux +2, ignore les PA métalliques et Sonné ; Feu +5 et Enflammé ; Mort/Vie +2 et Empoisonné ; Ombres, pas de Dégâts mais fumée et suffocation pendant Bonus de Force Mentale Rounds.
```

### Téléportation

Nom (clé) : Téléportation

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 245

**NI**

```text
3
```

**Description**

```text
Vous vous téléportez jusqu’à Bonus de Force Mentale + DR final mètres, en franchissant les obstacles, espaces et dangers.
```

### Terrifiant

Nom (clé) : Terrifiant

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 245

**NI**

```text
6
```

**Description**

```text
Vous gagnez Terreur (1) pendant Bonus de Force Mentale Rounds. Chaque +3 DR permet d’augmenter la Terreur de 1.
```

### Vision dans l’obscurité

Nom (clé) : Vision dans l’obscurité

Type (conservé) : Sort d'Arcane

Source relue : V5 p. 243

**Durée**

```text
(Bonus d’Initiative) Rounds
```

**Description**

```text
Vous gagnez Vision dans le noir pendant Bonus d’Intelligence Rounds.
```

## Arcanes elfiques

### Alarme Magique (Azyr & Ulgu)

Nom (clé) : Alarme Magique (Azyr & Ulgu)

Type (conservé) : Magie Elfique Arcanique

Source relue : HEPG p. 82

**Portée**

```text
Bonus de Force Mentale mètres
```

**Cible**

```text
ZdE Bonus d’Initiative mètres
```

### Bannissement Mineur (Hysh & Shyish)

Nom (clé) : Bannissement Mineur (Hysh & Shyish)

Type (conservé) : Magie Elfique Arcanique

Source relue : HEPG p. 81

**Portée**

```text
Force Mentale mètres
```

### Masque de l'Esprit (Shyish & Ulgu)

Nom (clé) : Masque de l'Esprit (Shyish & Ulgu)

Type (conservé) : Magie Elfique Arcanique

Source relue : HEPG p. 82

**Description**

```text
Vous masquez vos pensées et émotions. Les Tests d’Intuition contre vous et les Tests de lancement des sorts visant à lire votre esprit ou à vous scruter à distance subissent −3 DR. Vous pouvez être contraint de parler, mais pas de dire la vérité.
```

### Parler avec un Animal (Azyr & Ghur)

Nom (clé) : Parler avec un Animal (Azyr & Ghur)

Type (conservé) : Magie Elfique Arcanique

Source relue : HEPG p. 82

**Portée**

```text
Bonus de Force Mentale mètres
```

**Durée**

```text
Intelligence minutes
```

**Description**

```text
Vous dialoguez avec un animal pendant Intelligence minutes, sans le rendre amical. La complexité dépend de son Intelligence. Charme peut remplacer Charme animal pour communiquer. Un observateur connaissant Anoqeyån peut comprendre par Langue (Magick) à +2 DR.
```

### Purification du Corps (Ghyran & Hysh)

Nom (clé) : Purification du Corps (Ghyran & Hysh)

Type (conservé) : Magie Elfique Arcanique

Source relue : HEPG p. 82

**Description**

```text
Vous effectuez Résistance (+0 DR) pour soigner une maladie nommée ou retirer un poison de la cible. En cas de Maladresse, vous contractez vous-même cette maladie ou ce poison.
```

### Voix de Fer (Aqshy & Chamon)

Nom (clé) : Voix de Fer (Aqshy & Chamon)

Type (conservé) : Magie Elfique Arcanique

Source relue : HEPG p. 82

**Durée**

```text
Sociabilité minutes
```

**Description**

```text
Votre parole normale ou criée porte trois fois plus loin, malgré obstacles et bruit. Intimidation et Commandement reçoivent +1 DR. Un auditeur hostile qui réussit Perception à −1 DR peut ignorer ce bonus. Les chuchotements sont exclus.
```

## Bêtes

### Bête Indomptée

Nom (clé) : Bête Indomptée

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 147

**Cible**

```text
1
```

**Description**

```text
Vous provoquez chez un animal domestique un retour à l’état sauvage et agressif. 
 - Le MJ décide s’il fuit vers la nature ou attaque son ancien maître. 
 - Le Test de Charmer Animal ne peut pas l’apprivoiser, mais seulement l’apaiser. 
 - Un cavalier doit réussir un Test de Monter Difficile (−2 DR) ou être désarçonné. 
 Avec +4 DR, vous pouvez affecter un humain, qui peut résister avec un Test de Volonté Difficile (−1 DR). S’il échoue, il se transforme partiellement en bête : 
 - Il pousse des cris sauvages et perd la parole. 
 - Chaque round, il agit selon un jet de 1d10 : 
 • 1-3 : Distrait (grattage, défécation, etc.) 
 • 4-6 : Paniqué (court dans une direction aléatoire, percute des obstacles, attaque au hasard) 
 • 7-9 : Amical (rit, danse, rampe vers le plus proche) 
 • 10 : Enragé (provoque Peur (1) à ceux qui l’entendent, sauf aux Mages des Bêtes). 
 - L’effet dure jusqu’à être dissipé par magie
```

### Capuche Vengeresse

Nom (clé) : Capuche Vengeresse

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 149

**Description**

```text
Une auréole d’ambre affaiblit et dévie les attaques non magiques : 
 - Test de Calme (+0) à chaque attaque subie. 
 - Réduit les Dégâts de votre Bonus de Volonté + DR. 
 - Si les Dégâts sont réduits à 0 : 
 → Attaques à distance : touchent une cible aléatoire à 2 mètres de vous. 
 → Attaques au corps à corps : sont renvoyées sur l’attaquant (il ne peut pas s’opposer).
```

### Éveil du Bois

Nom (clé) : Éveil du Bois

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 146

**Portée**

```text
Force Mentale mètres
```

**Cible**

```text
ZdE Force Mentale mètres
```

**Description**

```text
Vous réveillez une zone forestière, provoquant des assauts de branches et d’épines. 
 - Toutes les cibles subissent une attaque magique missile (Dégâts +4). 
 - Un Test d’Esquive Facile (+2 DR) est requis pour éviter : 
 • 1 État Hémorragique 
 • 1 État Enchevêtré (Force 30).
```

### Forme bestiale

Nom (clé) : Forme bestiale

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 245

**Durée**

```text
Endurance minutes
```

**Description**

```text
Vous prenez une forme des Bêtes du Reikland V5, pp. 325–327. Remplacez M, F, E, Ag et Dex, recalculez les Blessures et prenez les Traits standard sauf Bestial et Craintif. Chaque +2 DR permet un Trait optionnel, sauf Taille (Énorme) et Nuée. Vous ne pouvez ni parler, ni lancer de sorts, ni dissiper ; l’équipement est lâché selon l’arbitrage du MJ. Les Blessures perdues et Critiques suivent la transformation et le retour, sans passage sous 0 Blessures.
```

### Forme Sauvage de Wyssan

Nom (clé) : Forme Sauvage de Wyssan

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 246

**Description**

```text
Vous gagnez +1 Mouvement, +30 Force et Endurance, Belliqueux, Morsure (BF + 1), Peur (1), Frénésie, Magique et Foulée (Bois). Vous ne pouvez utiliser les compétences de Langue ou de Savoir pendant le sort.
```

### Lance d'Ambre

Nom (clé) : Lance d'Ambre

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 246

**NI**

```text
10
```

**Portée**

```text
(Force) mètres
```

**Cible**

```text
1 (maximum)
```

**Description**

```text
Vous lancez un projectile magique +8 sur une seule cible, à Force mètres. Choisissez la localisation touchée. Le projectile ignore les PA de cuir, fourrure, écailles et matières similaires et inflige 1 Hémorragique.
```

### Langue des Bêtes

Nom (clé) : Langue des Bêtes

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 246

**Durée**

```text
Force Mentale minutes
```

**Description**

```text
Vous comprenez et pouvez communiquer avec toutes les créatures possédant le Trait Bestial. 
 - Vous parlez par grognements, sifflements et rugissements adaptés aux bêtes concernées. 
 - Les créatures ne sont pas obligées de répondre ou d’obéir, mais elles écoutent généralement. 
 - Vous obtenez +2 DR aux Tests de Charmer Animal et Entraînement Animal. 
 - Tant que le sort est actif, vous ne pouvez parler aucune langue civilisée et devez communiquer par gestes ou Langage (Bataille). 
 - Vous ne pouvez pas lancer de sorts ni dissiper tant que le sort est actif.
```

### Le Bœuf Reste Debout

Nom (clé) : Le Bœuf Reste Debout

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 149

**Cible**

```text
ZdE Force Mentale mètres
```

**Description**

```text
Vous rendez courage à vos alliés : 
 - Retirez DR+1 Conditions Brisé à tous les alliés de la zone. 
 - Empêche les alliés affectés de faire d’autres Tests de Peur ou Terreur tant que le sort dure.
```

### Lunes du Chasseur

Nom (clé) : Lunes du Chasseur

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 148

**Cible**

```text
ZdE Force Mentale mètres
```

### Malédiction d’Anraheir

Nom (clé) : Malédiction d’Anraheir

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 147

**Description**

```text
Vous invoquez des petits esprits de la terre pour harceler et distraire vos ennemis. 
 - Les cibles ennemies dans la zone subissent : 
 • -2 en Mouvement 
 • -20 en CC, CT et Agilité 
 - Les cibles qui quittent la zone sont suivies par les esprits mais subissent seulement -1/-10 à ces Caractéristiques. 
 - Les montures doivent réussir un Test de Calme (+0) ou fuir jusqu’à être calmées avec un Test de Monter (+0). 
 - Les esprits sont invisibles pour tous sauf leurs cibles et ne peuvent pas être blessés.
```

### Nuée Funeste

Nom (clé) : Nuée Funeste

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 246

**Description**

```text
Vous invoquez une nuée d’oiseaux pendant Bonus de Force Mentale Rounds. À chaque fin de Round, les occupants sans Magie des Arcanes (Bêtes) subissent une touche à la tête de 7 Dégâts et restent Aveuglés dans la zone. Une Action et un Test de Charme animal (+2 DR) permettent de déplacer la nuée à portée.
```

### Passage Rapide

Nom (clé) : Passage Rapide

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 148

**Description**

```text
Vous gagnez +1 Mouvement, Escalade des surfaces abruptes et Foulée (un terrain). Si vous possédez déjà ces Talents, ajoutez un niveau temporaire, puis un autre par +2 DR. Vos Tests pour éviter Enchevêtré reçoivent +1 DR.
```

### Peau du Chasseur

Nom (clé) : Peau du Chasseur

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 246

**Description**

```text
Vous gagnez +20 Endurance, Sens aiguisé (Odorat), Vision dans le noir et Peur (1) pendant Bonus de Force Mentale Rounds.
```

### Pulvérisation Musquée

Nom (clé) : Pulvérisation Musquée

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 148

**Description**

```text
Vous projetez un musc à l’odeur répugnante. Choisissez une option : 
 - Marquer une cible : Les Tests pour retrouver la cible bénéficient de +2 DR. 
 - Marquer un territoire : Les animaux sauvages n’entrent pas sauf s'ils sont affamés ou menacés (Test de Calme Moyen (+2 DR)). 
 - Le musc persiste 1 jour +1 jour/ +2 DR et ne peut pas être lavé.
```

### Serres d’Ambre

Nom (clé) : Serres d’Ambre

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 245

**NI**

```text
3
```

**Description**

```text
Vos attaques à mains nues perdent Inoffensive, gagnent Magique et infligent BF + 4 Dégâts. Lorsqu’elles causent des Blessures, elles infligent 1 Hémorragique. Vous gagnez aussi Escalade des surfaces abruptes.
```

### Suivi de l'Odeur

Nom (clé) : Suivi de l'Odeur

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 148

**Durée**

```text
Initiative minutes
```

**Description**

```text
Votre odorat s'aiguise et s’adapte à l’environnement naturel. 
 - +2 DR aux Tests de Pistage et de Perception basés sur l'odorat. 
 - Vous pouvez sentir la magie avec Seconde Vue. 
 - Vous pouvez détecter la Corruption et les mutations dans les plantes, les animaux et même leurs excréments.
```

### Transe d’Ambre

Nom (clé) : Transe d’Ambre

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 146

**Portée**

```text
Initiative mètres
```

**Description**

```text
Vous transformez votre cible en statue d’ambre translucide. 
 - Test de Calme Difficile (−2 DR) pour résister. 
 - La cible est intouchable (ne peut être blessée, empoisonnée ou malade). 
 - La cible peut guérir naturellement ou magiquement. 
 - La transe se termine si la statue est attaquée (le premier coup ne cause pas de dégâts). 
 - Si la cible est consentante, elle peut rester en hibernation jusqu’au prochain équinoxe ou solstice.
```

### Transformation de Kadon

Nom (clé) : Transformation de Kadon

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 149

**Description**

```text
Vous vous métamorphosez en bête monstrueuse : 
 - La créature est Grande ou Énorme (choisie par le MJ) : 
 → Mage d'Ambre ou Elfe : Demi-gryph, Dragon, Hippogryph, Aigle Géant, Griffon. 
 → Chamane Homme-Bête, Sorcier du Chaos, Sorcière : Manticore, Hydre, Jabberslythe, Vouivre. 
 - Vous conservez votre Intelligence et Volonté, mais remplacez toutes vos autres Caractéristiques, Compétences et Talents par ceux du monstre. 
 - Vous ne pouvez pas lancer de sorts sous cette forme. 
 - Pour chaque +4 DR : 
 → Ajoutez un Trait de Créature optionnel, ou 
 → Transformez quelqu'un d'autre (contact, Test Opposé de Volonté pour les cibles réticentes).
```

### Ver Grouillant

Nom (clé) : Ver Grouillant

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 149

**Portée**

```text
Force Mentale mètres
```

**Description**

```text
Un ver massif enserre la cible, qui gagne 1 Enchevêtré de Force 50. Lors d’un Test opposé de Force gagné, le ver peut ajouter 1 Enchevêtré ou dissoudre 1 PA de cuir réellement porté, y compris les accessoires en cuir concernés. Le ver ne peut être blessé, ne cause aucune Blessure de lutte et disparaît lorsque la cible se libère.
```

### Vol du Destin

Nom (clé) : Vol du Destin

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : V5 p. 246

**Cible**

```text
ZdE (Bonus de Force Mentale) mètres
```

**Description**

```text
Vous invoquez une nuée d’oiseaux pendant Bonus de Force Mentale Rounds. À chaque fin de Round, les occupants sans Magie des Arcanes (Bêtes) subissent une touche à la tête de 7 Dégâts et restent Aveuglés dans la zone. Une Action et un Test de Charme animal (+2 DR) permettent de déplacer la nuée à portée.
```

### Yeux de la Meute

Nom (clé) : Yeux de la Meute

Type (conservé) : Ghur - Ambre - Domaine de la Bête

Source relue : Winds of Magic p. 147

**Durée**

```text
Force Mentale minutes
```

## Cieux

### Comète de Cassandora

Nom (clé) : Comète de Cassandora

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : V5 p. 249

**NI**

```text
18
```

**Cible**

```text
ZdE (2 × Bonus de Force Mentale) mètres
```

**Description**

```text
Vous désignez une zone d’impact. À la fin du prochain Round, effectuez un Test de CT (−3 DR) ou de Savoir (Astronomie) (+2 DR). Chaque DR positif permet de déplacer la zone de Bonus de Force Mentale mètres ; chaque DR négatif permet au MJ de la déplacer de 1d10 mètres dans une direction aléatoire. Tous les occupants subissent un projectile magique +18, 1 Enflammé et À Terre.
```

### Destin Illuminé

Nom (clé) : Destin Illuminé

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : Winds of Magic p. 99

**Portée**

```text
Moitié de l’Intelligence mètres ou Contact
```

**Description**

```text
Vous posez au MJ une question oui/non sur les intentions de la cible dans l’heure à venir, puis une question supplémentaire par +2 DR. Au Contact, vous pouvez choisir à la place de découvrir sa Fatalité personnelle ainsi que ses malédictions, présages et symboles actifs ou inversés.
```

### Le Troisième Signe d’Amul

Nom (clé) : Le Troisième Signe d’Amul

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : V5 p. 250

**Durée**

```text
Initiative Rounds
```

### Lentille du Ciel

Nom (clé) : Lentille du Ciel

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : Winds of Magic p. 100

**Description**

```text
Vous invoquez un disque cristallin qui flotte à côté de votre tête et vous accompagne dans vos déplacements. 
 • En regardant à travers le disque, vous pouvez voir clairement des objets et des créatures situés jusqu’à 3 miles (4,8 km) de distance. 
 • +2 DR aux Tests de Perception impliquant de longues distances. 
 • La lentille annule les pénalités dues aux nuages et au brouillard, mais pas celles liées à l’obscurité. 
 • Observer les étoiles à travers la lentille confère +2 DR à votre prochain Test de Navigation.
```

### Malédiction du Destin

Nom (clé) : Malédiction du Destin

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : Winds of Magic p. 99

**Portée**

```text
Moitié de la Force Mentale mètres
```

**Description**

```text
La cible subit −1 DR à tous ses Tests pendant un jour. Une seule malédiction est permise et la ligne de vue est requise. Avec +6 DR, Destin Funeste porte la portée à un mile et retire définitivement 1 Destin ; sans Destin, le prochain Critique reçu dans la durée est traité comme 00.
```

### Maudit

Nom (clé) : Maudit

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : V5 p. 249

**Portée**

```text
Initiative mètres
```

### Mistral de la Stratosphère

Nom (clé) : Mistral de la Stratosphère

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : Winds of Magic p. 100

**Description**

```text
Vous projetez un souffle glacial d’Azyr depuis votre main tendue. 
 • Choisissez une direction : toutes les cibles dans cette direction et à portée subissent 12 Dégâts (ignorant les PA mais pas le Bonus d’Endurance). 
 • Elles doivent réussir un Test de Résistance Difficile (−2 DR), ou subir le premier stade de l’Exposition au Froid (WFRP, page 181). 
 • L’eau liquide dans la Zone d’Effet gèle à raison d’1 pouce (2,5 cm) d’épaisseur par Round. 
 • À chaque Round suivant, vous pouvez soit rediriger le mistral, soit continuer à geler les mêmes cibles. 
 – Les cibles ne subissent des Dégâts qu’au premier Round, mais doivent tester contre l’Exposition au Froid à chaque Round. 
 – Les cibles récupèrent toute Caractéristique perdue à raison de 10 points par heure. 
 • Vous pouvez vous déplacer tout en lançant ce sort.
```

### Polir et Exalter

Nom (clé) : Polir et Exalter

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : Winds of Magic p. 100

**Description**

```text
Vous nettoyez un objet en verre. S’il s’agit d’une lentille ou d’une fenêtre, +2 DR confèrent +2 DR aux Tests de Savoir (Astronomie) ; +4 DR confèrent +2 DR à la Perception utilisant Seconde Vue. La lentille n’est nécessaire que pour ces options.
```

### Prémonition Fantastique

Nom (clé) : Prémonition Fantastique

Type (conservé) : Azyr - Bleu - Domaine des Cieux

Source relue : Winds of Magic p. 99

**Portée**

```text
ZdE Force Mentale mètres
```

## Feu

### Blizzard enflammé de Ygethmor

Nom (clé) : Blizzard enflammé de Ygethmor

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 137

**Portée**

```text
Force Mentale mètres
```

**Cible**

```text
ZdE Force Mentale mètres
```

**Description**

```text
Vous invoquez un puissant tourbillon de braises et de flammes. 
 - Chaque cible dans la zone subit 8 + DR Dégâts chaque round. 
 - Test d’Athlétisme Difficile (+0) requis pour éviter la Condition À Terre. 
 - Objets et terrains inflammables ont 25% de chance de s’enflammer chaque round. 
 - Seul un couvert solide protège de ses effets.
```

### Cautérisation

Nom (clé) : Cautérisation

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : V5 p. 248

**NI**

```text
2
```

**Description**

```text
Vous soignez 1 Blessure et retirez tous les États Hémorragique. Une cible ayant Magie des Arcanes (Feu) récupère 1 + DR final Blessures. Les blessures traitées ne s’infectent pas. Sans ce Talent, la cible effectue un Test de Résistance (+0 DR) ; à −5 DR ou moins, elle gagne 1 Sonné et une cicatrice permanente.
```

### Chaleur Desséchante

Nom (clé) : Chaleur Desséchante

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 137

**Portée**

```text
ZdE Force Mentale mètres
```

**Description**

```text
Les ennemis dans la zone gagnent 1 Exténué chaque Round où ils courent, chargent ou fuient. Retirer vêtements ou armure supprime un Exténué gagné ainsi. Tout contact avec le feu leur inflige 1 Enflammé ; les Dégâts de feu augmentent du DR final du lancement, Test et réserve de Focalisation compris.
```

### Cœurs Enflammés

Nom (clé) : Cœurs Enflammés

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : V5 p. 248

**NI**

```text
5
```

**Portée**

```text
Vous
```

**Cible**

```text
ZdE (Bonus de Sociabilité) mètres
```

**Durée**

```text
Instantané
```

**Description**

```text
Votre voix résonne d’Aqshy. Les alliés dans la zone perdent tous leurs États Brisé et Exténué et peuvent tenter un Test de Frénésie.
```

### Colérique

Nom (clé) : Colérique

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 135

**Durée**

```text
Bonus de Force Mentale heures
```

**Description**

```text
Vous infligez Préjugé envers une personne nommée ou désignée pendant votre Bonus de Force Mentale heures. Si les deux sont amis, Calme (+2 DR) permet de résister. Avec +4 DR, la cible gagne Animosité pendant votre Bonus de Force Mentale jours ; avec +8 DR, Haine pendant votre Bonus de Force Mentale semaines. Les règles normales de résistance à ces psychologies s’appliquent jusqu’à expiration ou dissipation.
```

### Corps de Feu

Nom (clé) : Corps de Feu

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 134

**Description**

```text
Votre corps est enveloppé de flammes et votre sang devient hautement inflammable. 

 • Les adversaires qui tentent de vous agripper ou de vous saisir subissent 8 + DR Dégâts et doivent réussir un Test de Calme Difficile (−2 DR) chaque round ou lâcher prise. 

 • Chaque round où vous êtes en prise avec un adversaire, celui-ci reçoit +1 État Enflammé et subit 8 + DR Dégâts supplémentaires. 

 • Si vous êtes blessé au corps à corps, votre sang enflammé jaillit sur votre attaquant, qui doit réussir un Test d’Esquive Intermédiaire (+0) ou subir une frappe de Projectile magique avec Dégâts +3 (ignorant l’Armure). 

 • Vos vêtements et équipements sont immunisés au feu, mais vous pouvez toujours être affecté par les attaques de feu.
```

### Couronne de Flamme

Nom (clé) : Couronne de Flamme

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : V5 p. 248

**Description**

```text
- Vous canalisez Aqshy pour invoquer une couronne de flammes inspirante autour de votre tête.
- Vous gagnez le Trait Peur (1).
- Vous obtenez aussi le Talent Meneur de Guerre.
- Avec +2 DR, vous pouvez soit augmenter votre Peur de +1, soit reprendre Meneur de Guerre.
- Tant que le sort est actif, vous bénéficiez d’un +1 DR aux Tests de Focalisation et d’Incantation avec Aqshy.
```

### Épée Enflammée de Rhuin

Nom (clé) : Épée Enflammée de Rhuin

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : V5 p. 248

**Cible**

```text
1 épée (arme de base)
```

**Description**

```text
Vous enveloppez une épée de type arme de base dans les flammes. Elle inflige BF + 6 Dégâts et gagne Dévastatrice et Magique. Chaque touche inflige 1 Enflammé. Un porteur sans Magie des Arcanes (Feu) gagne lui-même 1 Enflammé s’il commet une Maladresse avec l’épée.
```

### Epées Sanguines

Nom (clé) : Epées Sanguines

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 137

**Description**

```text
Invoque une épée rouge magique flottante. Chaque +2 DR permet d'invoquer une épée supplémentaire (max 6). Chaque épée a Vol (20), Compétence d'arme de 60 et inflige 8 Dégâts. Une cible ne peut être attaquée que par une épée à la fois. Peut être dissipé, mais indestructible autrement.
```

### Esprit du Foyer

Nom (clé) : Esprit du Foyer

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 136

**Description**

```text
Vous tirez un petit élémental d’un feu, en subissant 6 Dégâts moins votre BE. Il a M 3, CC égale à votre Force Mentale, Dégâts +6 et Peur (1). Il reste à moins de 12 mètres du feu, obéit à vos instructions verbales et s’immobilise lorsque vous lancez un autre sort ou parlez à quelqu’un d’autre. S’il inflige des Dégâts, sa victime gagne 1 Enflammé. Il est détruit par au moins une pinte d’eau ; les autres attaques ne le blessent pas.
```

### Flamme Attisée

Nom (clé) : Flamme Attisée

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 136

**Description**

```text
- Rend tout matériau inflammable, y compris l’eau et la pierre.
- Les objets et créatures déjà inflammables subissent +DR Dégâts de feu et gagnent un État Enflammé supplémentaire chaque fois qu’ils en reçoivent un.
```

### Flamme Captivante

Nom (clé) : Flamme Captivante

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 134

**Description**

```text
Vous animez un feu pour captiver un observateur choisi aléatoirement. Un échec à Calme (+0 DR) lui inflige 3 Sonné. Une attaque retire immédiatement les Sonné acquis par ce sort, sans retirer les Sonné antérieurs. +2 DR permettent un feu de camp et deux observateurs ; +4 DR, un grand brasier et tous les observateurs. Le feu et les observateurs sont désignés par le MJ.
```

### Flamme Inextinguible

Nom (clé) : Flamme Inextinguible

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 136

**Portée**

```text
Moitié de l’Initiative mètres
```

**Durée**

```text
Bonus de Force Mentale heures
```

**Description**

```text
Vous rendez inextinguible un feu jusqu’à la taille d’un feu de camp pendant votre Bonus de Force Mentale heures. +2 DR étendent la durée à votre Bonus de Force Mentale jours ; +4 DR, semaines ; +6 DR, mois. Le feu ne consomme pas de combustible et les morceaux séparés restent inextinguibles. La formulation inverse éteint un feu de même taille. Aucun autre sort ne peut éteindre ces flammes et leur effet ne peut être dissipé.
```

### Forge de Tarnus

Nom (clé) : Forge de Tarnus

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 136

**Description**

```text
- Imprègne une forge d’Aqshy, allumant ses braises avec une intensité surnaturelle.
- Tous les Tests de Métier (Forgeron) réalisés pendant la durée du sort bénéficient de +1 DR.
- S’applique aussi aux Tests de fabrication d’Objets Magiques (Archives of the Empire Vol. II).
```

### Goût de Feu

Nom (clé) : Goût de Feu

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 137

**Cible**

```text
1 pot, cruche ou flacon
```

**Description**

```text
Vous transformez un plat en nourriture très épicée, un quart de gallon de liquide en alcool fort, ou une pinte de liquide en huile inflammable. Le plat demande un Test de Résistance (+4 DR) pour éviter les séquelles digestives.
```

### Grands Feux d’U’Zhul

Nom (clé) : Grands Feux d’U’Zhul

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : V5 p. 248

**NI**

```text
12
```

**Cible**

```text
1 (maximum) + ZdE (Bonus de Force Mentale) mètres
```

**Description**

```text
La cible centrale subit un projectile magique +10 ignorant les PA, 2 Enflammé et À Terre. Les autres cibles dans la zone subissent un projectile +5 ignorant les PA. Le brasier persiste pendant Bonus de Force Mentale Rounds : à chaque fin de Round, les occupants subissent Bonus de Force Mentale + 5 Dégâts ignorant les PA et gagnent 1 Enflammé.
```

### Purification

Nom (clé) : Purification

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : V5 p. 249

**Description**

```text
Les matières inflammables s’embrasent et les occupants gagnent un nombre d’Enflammé égal au DR final. Le sort consume progressivement les influences corruptrices, à la durée fixée par le MJ. Pour le maintenir, consacrez votre Action à Focalisation (Aqshy) (+0 DR). Toutes les 30 minutes, effectuez Résistance (−1 DR) : un échec vous inflige Exténué et un résultat de −1 DR ou moins termine le sort.
```

### Sang Bouillonnant

Nom (clé) : Sang Bouillonnant

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 134

**Description**

```text
- La cible subit un Test de Résistance Difficile (−1 DR).
- Si elle échoue, elle reçoit immédiatement +2 États Aveuglé.
- Au début de chaque round, elle subit 10 + DR Dégâts (ignore l’Armure, pas l’Endurance).
- Si la cible meurt, elle explose en une gerbe de sang bouillant, infligeant un Projectile magique avec Dégâts +1 à toutes les créatures dans un rayon de 2 mètres.
```

### Tempête de Flammes

Nom (clé) : Tempête de Flammes

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 135

**Durée**

```text
Spécial
```

**Description**

```text
Vous invoquez une colonne de flammes de 2 mètres de diamètre et de hauteur. Chaque +2 DR augmente le diamètre de 1 mètre et la hauteur de 2 mètres. Les cibles dans la zone subissent un projectile magique +8, gagnent 3 Enflammé et À Terre, et sont projetées hors de la zone. Seules les créatures immunisées au feu magique peuvent y entrer. La zone dure jusqu’à dissipation ou jusqu’à l’aube.
```

### Tempête Magmatique

Nom (clé) : Tempête Magmatique

Type (conservé) : Aqshy - Rouge - Domaine du Feu

Source relue : Winds of Magic p. 136

**Description**

```text
- Déchaîne un vortex de lave en fusion, brûlant tout sur son passage.
- Toutes les cibles dans la Zone d’Effet reçoivent 2 États Enflammé et subissent un Projectile Magique avec +12 aux Dégâts.
- Si le vortex se déplace de 8 mètres ou moins, il génère +1 mini-vortex par +2 DR (max 3).
- Chaque mini-vortex (ZdE = Bonus de Force Mentale) :
 ↳ Se déplace immédiatement de façon aléatoire.
 ↳ Inflige +1 État Enflammé.
 ↳ Frappe toutes les cibles sur son passage avec un Projectile Magique +4 Dégâts.
- Les mini-vortex disparaissent après un déplacement.
```

## Haute Magie

### Apothéose

Nom (clé) : Apothéose

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 86

**Description**

```text
Vous infusez la cible d'une magie pure, lui permettant de récupérer un nombre de Blessures égal à votre Bonus de Force Mentale et lui octroyant temporairement le Trait de Créature Peur 1.
Surpuissance :
• Tous les +3 DR : La cible récupère à nouveau votre Bonus de Force Mentale en Blessures.
• +6 DR : Vous soignez une Blessure Critique si vous réussissez un Test de Sociabilité Difficile (+0).
• +10 DR : Vous ramenez la cible à la vie à son maximum de Blessures. Sa tête est entourée d’un halo magique. Elle meurt définitivement après un nombre de minutes égal à votre Bonus de Force Mentale ou si Apothéose est dissipé.
```

### Bannissement Majeur

Nom (clé) : Bannissement Majeur

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 88

**Description**

```text
Vous irradiez des flots du plus pur Qhaysh pour bannir le mal et les ténèbres. Chaque round, les créatures Démoniaques et Mort-vivantes dans la Zone d’Effet subissent un projectile magique infligeant +8 Dégâts (ou +15 Dégâts si elles sont de Taille Grande ou supérieure). Les créatures Instables subissent le double des Dégâts. Les Démons détruits par ce sort ne peuvent être réinvoqués pendant 1001 jours. Les Morts-vivants détruits ne peuvent jamais être réanimés. De plus, vous pouvez gratuitement tenter de dissiper chaque sort de Sorcellerie, Démonologie, Nécromancie, Magie Noire ou Chaos dans la Zone d’Effet.
Surpuissance :
• Pour chaque +1 DR, vous bénéficiez d’un bonus de +1 DR aux Tests de Dissipation.
• +4 DR : Les objets magiques possédant des enchantements maléfiques ou chaotiques cessent de fonctionner pendant la durée du sort si vous réussissez un Test de Sociabilité Moyen (+2 DR).
• +7 DR : Les Dégâts augmentent à +15 (ou +30 si la cible est de Taille Grande ou supérieure). Vous gagnez du Yenlui (Lumineux).
```

### Chemin entre les Mondes

Nom (clé) : Chemin entre les Mondes

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 89

**Description**

```text
Vous ouvrez les chemins entre les mondes à vos alliés. Les cibles amies gagnent le Trait de Créature Éthérée, et leur Mouvement est doublé.
Surpuissance :
• +5 DR : La durée du sort passe à un nombre de minutes égal à votre Bonus d’Intelligence si vous réussissez un Test de Volonté Difficile (−2 DR).
• +8 DR : Les cibles présentes sur un nexus géomantique approprié peuvent emprunter les Chemins des Anciens pour rejoindre instantanément un autre nexus. Vous décidez du nexus de destination, sans limitation de distance.
```

### Coruscation de Finreir

Nom (clé) : Coruscation de Finreir

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 86

**Description**

```text
Vous gagnez Vol (Agilité) et un plancher de 5 PA à chaque localisation, sans addition à l’armure portée. En surpuissance, le foyer arcanique donne 1d10 / 2, arrondi supérieur, soit 1 à 5 DR aux Tests de lancement dans Bonus de Force Mentale mètres, relancés au début de chaque Round. +5 DR ouvrent une faille instable dans Bonus de Force Mentale mètres et font perdre 3 Yenlui ; +8 DR ouvrent un portail plus stable dans un terrain solide, pour une couleur choisie et la Haute Magie. Les lieux et le foyer sont déclarés par le MJ.
```

### Destruction des Arcanes

Nom (clé) : Destruction des Arcanes

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 86

**Description**

```text
Vous invoquez les pouvoirs d'annihilation pour blesser un ennemi en armure et détruire ses objets magiques. La cible subit 1 Blessure au corps par tranche complète de 2 points d’armure portés (par exemple, 18 PA infligent 9 Blessures). Le Bonus d'Endurance s'applique, mais les Points d'Armure sont ignorés. De plus, un de ses objets magiques (déterminé aléatoirement) est détruit si vous réussissez un Test de Focalisation Difficile (+0).
Surpuissance :
• Chaque +1 DR : Détruit 1 point d'armure porté (aléatoire) après les dégâts.
• +3 DR : Si vous réussissez un Test de Dextérité Moyen (+2 DR), vous choisissez l'objet magique détruit.
• +8 DR : Augmente les dégâts du sort à 1 Blessure par point d'armure porté.
```

### Drain de Magie

Nom (clé) : Drain de Magie

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 87

**Portée**

```text
Moitié de la Force Mentale mètres
```

**Description**

```text
Vous expulsez la magie du monde en invoquant un vortex éthérique. Les sorts persistants dans la zone d'effet sont immédiatement dissipés sans Test Étendu, et la magie accumulée par les lanceurs en Focalisation est perdue. Les objets magiques et Traits de Créature Protection ne sont pas affectés.
Surpuissance :
• +5 DR : Vous augmentez la Zone d’Effet à Force Mentale mètres. Un Test d'Intelligence Difficile (−1 DR) permet d'exempter des cibles alliées (y compris vous-même) des effets du sort.
• +7 DR : Les Bénédictions et Miracles persistants sont également dissipés. Vous gagnez du Yenlui (Lumière).
• +10 DR : Les objets magiques perdent temporairement leurs pouvoirs et les Traits de Créature Protection sont annulés. Les lanceurs de sorts doivent réussir un Test de Focalisation Difficile (+0) ou perdre toute capacité à lancer des sorts pendant 24 heures.
```

### empête

Nom (clé) : empête

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 89

**Description**

```text
Vous invoquez depuis les cieux une tempête polychromatique d'énergie crépitante. Cette tempête se déplace comme un sort de vortex aléatoire, sauf qu'elle saute les étapes #1–2 et avance directement de 2d10 mètres selon l’étape #3 (voir Vents de Magie, page 21). Chaque round, les créatures dans la zone subissent un missile magique infligeant +4 Dégâts et doivent réussir un Test d'Athlétisme Moyen (+2 DR), sous peine de subir un malus de –20 en Capacité de Combat et Capacité de Tir pour la durée de la tempête. Les cibles volantes subissent à la place +5 Dégâts et leur Test d'Athlétisme souffre de –1 DR.
Surpuissance :
• +4 DR : De plus, les créatures doivent réussir un Test de Calme Difficile (+0) pour se déplacer. Les cibles volantes échouant à ce test chutent immédiatement de 50 mètres par round, et tous les Tests de Capacité de Tir subissent un malus de −3 DR.
• +5 DR : Chaque round, la tempête inflige un missile magique infligeant +15 Dégâts aux bâtiments et machines de guerre dans la zone.
• +8 DR : Un Test d'Initiative Difficile (+0) vous permet d’exempter les cibles amies des effets du sort.
```

### Extinction de l'Âme

Nom (clé) : Extinction de l'Âme

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 89

**Portée**

```text
Moitié de la Force Mentale mètres
```

**Description**

```text
Vous infligez un projectile magique +9. Les victimes tuées ne peuvent devenir Fantômes ni avoir leur âme liée dans un réceptacle. +3 DR réduisent leurs corps en poussière. +7 DR doublent portée et zone et portent les Dégâts à +11 ; vous gagnez Yenlui (Sombre).
```

### Glamour de Teclis

Nom (clé) : Glamour de Teclis

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 88

**Cible**

```text
ZdE Bonus d’Intelligence mètres
```

**Durée**

```text
Bonus d’Intelligence Rounds
```

**Description**

```text
Vous invoquez un labyrinthe illusoire de brume et d'ombres. Chaque round, les cibles doivent réussir un Test de Navigation Très Difficile (−3 DR) ou n’effectuer aucune action sauf errer dans une direction aléatoire à leur rythme de marche normal. Le sort est invisible aux autres, faisant apparaître les cibles comme hébétées. Si une cible échoue à 3 tests, vous pouvez contrôler sa direction pendant le reste de la durée du sort en réussissant un Test de Commandement Moyen (+2 DR). Chaque changement de direction nécessite un nouveau Test de Commandement.
Surpuissance :
• +3 DR : Les effets du sort durent Bonus d’Intelligence heures pour les cibles qui échouent à trois Tests de Navigation. Vous gagnez du Yenlui (Sombre).
• +6 DR : Un Test d'Agilité Difficile (+0) permet d'exempter les cibles alliées des effets du sort.
```

### Impasse

Nom (clé) : Impasse

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 87

**Portée**

```text
Moitié de l’Endurance mètres
```

### La Fortune est Capricieuse

Nom (clé) : La Fortune est Capricieuse

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 87

**Durée**

```text
Bonus de Sociabilité Rounds
```

### Malédiction d'Attraction des Flèches

Nom (clé) : Malédiction d'Attraction des Flèches

Type (conservé) : Domaine de Haute Magie

Source relue : HEPG p. 86

**Description**

```text
Les tireurs peuvent relancer les attaques à distance ratées contre les cibles maudites, y compris munitions magiques et machines de guerre, mais pas les projectiles de sorts. +4 DR retirent les PA et Défensive des boucliers lorsqu’ils opposent un tir ; ils peuvent toujours bloquer l’attaque. Avec +6 DR et un Test de CT (+0 DR), vous choisissez les localisations touchées.
```

## Lumière

### Bibliothécaire instantané de Meissner

Nom (clé) : Bibliothécaire instantané de Meissner

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : Winds of Magic p. 64

**Portée**

```text
ZdE Intelligence mètres
```

### Clarté d’esprit

Nom (clé) : Clarté d’esprit

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : V5 p. 251

**Durée**

```text
(Intelligence) minutes
```

### Dérèglement temporel

Nom (clé) : Dérèglement temporel

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : Winds of Magic p. 65

**Cible**

```text
ZdE Force Mentale mètres
```

### Filet d’Amyntok

Nom (clé) : Filet d’Amyntok

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : V5 p. 252

**Durée**

```text
Bonus d’Intelligence Rounds
```

**Description**

```text
La cible perd son Mouvement et gagne 1 Sonné. Pour récupérer de cet état, elle utilise son Intelligence au lieu de Résistance. Les créatures Bestiales sont immunisées.
```

### Fléau des Démons

Nom (clé) : Fléau des Démons

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : V5 p. 252

**Cible**

```text
1 Démon
```

**Description**

```text
Vous ciblez un Démon. Selon l’arbitrage du MJ, E ≤ votre Intelligence le bannit ; Intelligence < E < 2 × Intelligence divise ses Bmax par deux pour la rencontre ; E ≥ 2 × Intelligence n’applique aucun effet principal. Ceux qui regardent un Démon banni dans Force Mentale mètres gagnent 3 Aveuglé, sauf les mages de Lumière.
```

### Lumière aveuglante

Nom (clé) : Lumière aveuglante

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : V5 p. 251

**Portée**

```text
Vous
```

**Description**

```text
Tous ceux qui vous regardent dans Bonus de Force Mentale mètres gagnent 3 Aveuglé, sauf ceux ayant Magie des Arcanes (Lumière). Les observateurs doivent être désignés.
```

### Lumière guérisseuse

Nom (clé) : Lumière guérisseuse

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : V5 p. 252

**NI**

```text
8
```

**Description**

```text
La cible récupère votre Bonus d’Intelligence en Blessures et perd poisons et intoxicants. Si vous réussissez un Test de Focalisation (Hysh) à −3 DR, elle perd aussi 1 Point de Corruption gagné dans l’heure précédente.
```

### Piège d'Abulla

Nom (clé) : Piège d'Abulla

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : Winds of Magic p. 62

**Description**

```text
Vous lancez un piège magique qui donne à la cible 2 États Enchevêtré, avec une Force égale à votre Force Mentale. Le piège soulève la cible de 2 mètres au-dessus du sol. Au Round suivant, la cible est attirée vers vous et reste suspendue environ 5 mètres au-dessus de vous, à 2 mètres devant votre tête, jusqu'à la fin du Sort, se déplaçant avec vous. 
 Pour chaque +1 DR, ajoutez un État Enchevêtré, ou faites léviter la cible 2 mètres plus haut (maximum 10 mètres). La cible subit des Dégâts de Chute lorsqu’elle est relâchée (WFRP, page 166).
```

### Protection de Phâ

Nom (clé) : Protection de Phâ

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : V5 p. 252

**Description**

```text
Une aura de Hysh empêche Démons, Morts-vivants et créatures mutantes d’entrer dans la zone. Ceux déjà présents gagnent Brisé jusqu’à leur sortie. Les occupants ne gagnent aucun Point de Corruption pendant le sort.
```

### Yeux de Volans

Nom (clé) : Yeux de Volans

Type (conservé) : Hysh - Blanc - Domaine de la Lumière

Source relue : Winds of Magic p. 63

**Description**

```text
Vos yeux deviennent blancs et vous percevez les Vents plus clairement que la réalité physique. Les Tests de Perception visuelle reçoivent −2 DR, ou +2 DR lorsque Seconde Vue sert à lire les Vents. Vous voyez la Corruption et reconnaissez les mutations des humains et autres espèces civilisées, mais pas des plantes ou des animaux. Une mutation cachée par des vêtements peut encore échapper à votre regard. Vous connaissez le nombre de Points de Corruption d’une cible ou voyez si elle possède le Trait Corrompu.
```

## Métal

### Arme enchantée

Nom (clé) : Arme enchantée

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**Portée**

```text
1 mètre
```

### Blindage d’oracier

Nom (clé) : Blindage d’oracier

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 76

**Durée**

```text
Force Mentale minutes
```

### Boussole d’Argent de Puchta

Nom (clé) : Boussole d’Argent de Puchta

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 77

**Portée**

```text
ZdE Force Mentale mètres
```

**Durée**

```text
Force Mentale minutes
```

### Cage dorée

Nom (clé) : Cage dorée

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 75

**Description**

```text
Vous enfermez les occupants dans une cage aux barreaux d’un demi-pouce, espacés de six pouces. Force (−2 DR) ou des outils adaptés permettent de les écarter ou couper. Les tailles Minuscule ou Très petite passent entre les barreaux. Armes et projectiles peuvent traverser ; en intérieur, la cage perce les obstacles. Position, outils et sortie sont résolus par le MJ.
```

### Creuset de Chamon

Nom (clé) : Creuset de Chamon

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**Description**

```text
Un objet métallique non magique fond et reste utilisable comme matière première. S’il est tenu, il est lâché. S’il est porté sur le corps, son porteur subit un projectile magique +6 ignorant les PA, mais conservant le BE.
```

### Essais et Erreurs

Nom (clé) : Essais et Erreurs

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 77

**Description**

```text
Vous désignez une compétence pour vous-même ou un allié. Son prochain Test de cette compétence reçoit +2 DR. Avec +2 DR de surpuissance, il bénéficie aussi d’une unique relance de ce Test, sans Test supplémentaire.
```

### Forge de Chamon

Nom (clé) : Forge de Chamon

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**Durée**

```text
Force Mentale minutes
```

### Métal changeant

Nom (clé) : Métal changeant

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**Description**

```text
Vous assouplissez un objet métallique non magique et pouvez le plier à mains nues. Une transformation complexe exige l’accord du MJ et un Test d’Art ou de Métier adapté (+2 DR).
```

### Or des fous

Nom (clé) : Or des fous

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**Durée**

```text
Force Mentale minutes
```

### Réfraction prismatique de Habermas

Nom (clé) : Réfraction prismatique de Habermas

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 77

**Portée**

```text
ZdE Force Mentale mètres
```

### Réplique de Levorg

Nom (clé) : Réplique de Levorg

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 77

**Description**

```text
Vous conjurez un objet inanimé non magique d’Encombrement maximal 4, augmenté de 1 par +2 DR. Il fonctionne normalement, mais un artisan compétent peut reconnaître la copie. Il dure 1d10 heures, déterminées secrètement par le MJ, puis disparaît. À la place, vous pouvez conjurer 1d10 pièces d’or, plus 1d10 par +2 DR ; cette formulation est interdite au Collège de l’Or. L’objet doit être chimiquement simple : ni nourriture, explosif, ingrédient magique ni catalyseur alchimique.
```

### Robe scintillante

Nom (clé) : Robe scintillante

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**NI**

```text
6
```

**Durée**

```text
(Bonus de Force Mentale) Rounds
```

**Description**

```text
Une robe lumineuse de Chamon vous donne +2 PA à toutes les localisations et éclaire comme un chandelier. Les ennemis engagés avec vous effectuent un Test de Résistance (+0 DR) ou gagnent 1 Aveuglé. Ce profil V5 reste distinct d’Écaille d’acier.
```

### Toucher doré

Nom (clé) : Toucher doré

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : Winds of Magic p. 75

**Durée**

```text
Spécial
```

### Transmutation de Chamon

Nom (clé) : Transmutation de Chamon

Type (conservé) : Chamon - Jaune - Domaine du Métal

Source relue : V5 p. 253

**Description**

```text
Tous les occupants subissent un projectile magique +9 ignorant BE et PA. Ils gagnent 1 Aveuglé, 1 Assourdi, 1 Sonné et +1 PA, et suffoquent pendant le sort. Les états sont maintenus pour la durée. Une victime morte reste enfermée dans une coque métallique.
```

## Mineurs

### Alerte

Nom (clé) : Alerte

Type (conservé) : Sort Mineur

Source relue : V5 p. 242

**Cible**

```text
1 Objet
```

### Bruits

Nom (clé) : Bruits

Type (conservé) : Sort Mineur

Source relue : V5 p. 242

**Description**

```text
Vous produisez des bruits discrets à un point à portée, même hors de vue, sans message intelligible. Force Mentale (+2 DR) permet de déplacer leur origine ou de modifier leur volume.
```

### Conservation

Nom (clé) : Conservation

Type (conservé) : Sort Mineur

Source relue : V5 p. 240

**Cible**

```text
Spécial
```

**Description**

```text
Vous préservez jusqu’à une journée de rations pendant Bonus de Force Mentale jours. Elles ne pourrissent pas, mais restent vulnérables à l’eau, au feu et au poison.
```

### En catimini

Nom (clé) : En catimini

Type (conservé) : Sort Mineur

Source relue : V5 p. 242

**Durée**

```text
Instantané
```

### Feux follets

Nom (clé) : Feux follets

Type (conservé) : Sort Mineur

Source relue : V5 p. 241

**Description**

```text
Vous créez jusqu’à Bonus d’Intelligence lumières, semblables à des torches ou lanternes. Pour votre Action, Force Mentale (+2 DR) permet de les diriger à allure de marche en ligne droite, tant qu’elles sont visibles. Elles traversent les obstacles ; changer de direction exige un nouveau Test.
```

### Lumière

Nom (clé) : Lumière

Type (conservé) : Sort Mineur

Source relue : V5 p. 241

**Description**

```text
Vous créez une lumière de torche sur votre personne. Force Mentale (+2 DR) permet de modifier son intensité à celle d’une lanterne ou d’une bougie.
```

### Pas léger

Nom (clé) : Pas léger

Type (conservé) : Sort Mineur

Source relue : V5 p. 240

**Durée**

```text
(Agilité) minutes
```

**Description**

```text
Pendant Agilité minutes, votre passage n’endommage aucune matière organique. Les Tests de Pistage pour vous suivre en terrain rural subissent −3 DR.
```

### Protection contre la pluie

Nom (clé) : Protection contre la pluie

Type (conservé) : Sort Mineur

Source relue : V5 p. 241

**Durée**

```text
(Bonus de Force Mentale) heures
```

### Repères

Nom (clé) : Repères

Type (conservé) : Sort Mineur

Source relue : V5 p. 240

**Portée**

```text
Vous
```

**Cible**

```text
Vous
```

### Secousse

Nom (clé) : Secousse

Type (conservé) : Sort Mineur

Source relue : V5 p. 242

**Portée**

```text
Moitié de la Force Mentale mètres
```

**Cible**

```text
1
```

### Serrure ouverte

Nom (clé) : Serrure ouverte

Type (conservé) : Sort Mineur

Source relue : V5 p. 241

**Cible**

```text
1
```

### Tendre l'oreille

Nom (clé) : Tendre l'oreille

Type (conservé) : Sort Mineur

Source relue : V5 p. 241

**Portée**

```text
(Initiative) mètres
```

**Durée**

```text
(Bonus de Force Mentale) minutes
```

## Mort

### Acceptation du Destin

Nom (clé) : Acceptation du Destin

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 122

**Description**

```text
Vous encouragez vos alliés par vos paroles. 
 • Les cibles amicales deviennent immunisées à la Peur pour la durée du Sort, et la Terreur est traitée comme de la Peur. 
 • Tous les effets psychologiques causés par le chagrin sont définitivement supprimés. 
 • Alternativement, vous pouvez lancer ce Sort sur des ennemis proches pour les rendre insensibles au danger. 
 • Les cibles qui échouent à un Test de Calme Intermédiaire (+0) ne peuvent pas fuir le combat tant que le Sort est actif.
```

### Caresse de Laniph

Nom (clé) : Caresse de Laniph

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**NI**

```text
6
```

**Cible**

```text
1 (maximum)
```

**Description**

```text
Votre main inflige un projectile magique +6 ignorant BE et PA. Par tranche complète de 2 Blessures réellement infligées, le maximum de Blessures de la cible baisse définitivement de 1 et vous pouvez ajouter 1 DR à votre réserve de Focalisation. Utilisez votre main pour le Contact, pas un bâton enchanté.
```

### Cendres et Poussière

Nom (clé) : Cendres et Poussière

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 122

**Description**

```text
Vous invoquez un nuage tourbillonnant de poussière étouffante. 
 • Les cibles dans la Zone d’Effet subissent 8 Dégâts ignorant l’Armure et commencent à suffoquer (WFRP, page 181) jusqu’à ce qu’elles quittent le nuage. 
 • Ce Sort utilise les règles de Vortex Aléatoire (WFRP, page 20). 
 • Si vous obtenez +4 DR, vous pouvez invoquer un Soleil Pourpre de Xereus au centre du nuage. 
 • Ce globe de ténèbres bordées de violet, d’un diamètre de 1 mètre, provoque Peur (2) et désintègre tout ce qu’il touche. 
 • Les cibles frappées par le globe doivent réussir un Test de Calme Intermédiaire (+0) ou mourir instantanément. 
 • Les obstacles comme les murs et les portes sont brûlés à travers automatiquement.
```

### Délivrance de la Mort

Nom (clé) : Délivrance de la Mort

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 123

**Portée**

```text
Moitié de l’Initiative mètres
```

**Description**

```text
Vous entourez un esprit de Shyish pour le détacher du monde des vivants. 
 • Les créatures possédant les Traits de créature Mort-vivant et Éthéré doivent réussir un Test de Calme Intermédiaire (+0) à chaque Round ou gagner un État Sonné, étant forcées de confronter leur propre existence. 
 • Les esprits accumulant 3 États Sonné sont libérés du monde mortel.
```

### Derniers Mots

Nom (clé) : Derniers Mots

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**NI**

```text
2
```

### Destin de Bjuna

Nom (clé) : Destin de Bjuna

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 123

**Portée**

```text
Moitié de la Force Mentale mètres
```

**Description**

```text
Les cibles succombent à un rire hystérique pouvant les étouffer à mort. 
 • Chaque Round, elles doivent réussir un Test de Calme Intermédiaire (+0) ou : 
 - Gagner un État Sonné. 
 - Subir des Dégâts égaux à leur Bonus de Force + 6, ignorant les PA. 
 - Les Dégâts ont 50% de chances d’être appliqués à la Tête et 50% de chances d’être appliqués au Corps. 
 • Pour chaque +2 DR, vous pouvez entourer une cible d’une énergie violette. 
 - Si la cible échoue un Test de Force Mentale Intermédiaire (+0), l’énergie de Shyish pénètre dans sa bouche. 
 - La cible subit immédiatement des Dégâts de Suffocation (WFRP, page 181) et continue de suffoquer tant que le Sort est actif.
```

### Goût de la Mort

Nom (clé) : Goût de la Mort

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 125

**Description**

```text
Vous plongez vos ennemis dans une prise de conscience aiguë de leur propre mortalité. 
 • La cible principale doit effectuer un Test d’Exposition mineure à la Corruption, puis réussir un Test de Calme Intermédiaire (+0) ou gagner l’État Inconscient. 
 • Les ennemis situés dans une Zone d’Effet égale à votre Bonus d’Initiative mètres autour de la cible doivent réussir un Test de Calme Accessible (+2 DR) ou gagner un État Sonné. 
 • Tous ceux qui échouent au Test de Calme doivent réussir un Test de Calme Facile (+4 DR) ou recevoir un État Exténué ainsi que la Psychologie (Désespoir). 
 • Pendant une semaine, les victimes du Désespoir gagnent un État Exténué chaque matin à leur réveil.
```

### La Faux de Shyish

Nom (clé) : La Faux de Shyish

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**Description**

```text
Vous invoquez une hallebarde Magique infligeant BF + Bonus de Force Mentale + 4 Dégâts. Selon l’arbitrage V5 du MJ, les Morts-vivants engagés avec vous ne bénéficient pas d’Avantage aux Tests contre vous ; leur Élan reste disponible.
```

### Les Enfants Sauvages de Zandox

Nom (clé) : Les Enfants Sauvages de Zandox

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 125

**Description**

```text
Vous invoquez deux molosses gardiens faits d’ombre violette. 
 • Les chiens ne peuvent pas être observés directement, sauf si un personnage réussit un Test de Perception Difficile (−2 DR). 
 • S’il réussit, il aperçoit brièvement des bêtes baveuses aux crocs acérés. 
 • À votre tour, les chiens peuvent attaquer un ennemi situé à moins de 4 mètres. 
 • Chaque chien possède une Capacité de Combat de 50 et le Trait Arme (Morsure) +8. 
 • Les chiens ne peuvent pas être attaqués et ne génèrent pas d’Avantage.
```

### Marée des Âges

Nom (clé) : Marée des Âges

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : Winds of Magic p. 125

**Description**

```text
Vous faites vieillir instantanément un objet non magique jusqu’à ce qu’il tombe en poussière. 
 • L’objet affecté peut avoir un Encombrement maximum de 2, augmenté de +1 par tranche de +2 DR. 
 • Les objets avec la Qualité Durable ne se désintègrent pas, mais perdent toutes leurs Qualités. 
 • Si vous obtenez +4 DR ou plus, vous pouvez cibler une créature vivante : elle doit réussir un Test de Calme Accessible (+2 DR) ou vieillir de plusieurs décennies en quelques secondes. 
 • Elle subit alors une réduction permanente de 1d10 en Force et en Endurance. 
 • Les Démons, Morts-vivants et créatures végétales sont immunisés.
```

### Mort rapide

Nom (clé) : Mort rapide

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**NI**

```text
2
```

**Description**

```text
Votre Contact fait mourir une créature qui a 0 Blessures. Elle ne peut ensuite être relevée comme Mort-vivant.
```

### Sanctifier

Nom (clé) : Sanctifier

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**Durée**

```text
(Force Mentale) minutes
```

### Vol de Vie

Nom (clé) : Vol de Vie

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**NI**

```text
8
```

**Description**

```text
La cible subit un projectile magique +6 ignorant les PA. Vous perdez tous vos États Exténué et récupérez 1 Blessure par tranche complète de 2 Blessures réellement infligées à la cible, arrondi inférieur.
```

### Vortex d’Âmes

Nom (clé) : Vortex d’Âmes

Type (conservé) : Shyish - Pourpre - Domaine de la Mort

Source relue : V5 p. 247

**NI**

```text
10
```

**Description**

```text
Tous les occupants gagnent 1 Brisé. Les Morts-vivants subissent en outre un projectile magique +8 ignorant BE et PA.
```

## Ombres

### Ailes Grises

Nom (clé) : Ailes Grises

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : Winds of Magic p. 111

**Description**

```text
Vous invoquez un vol d’oiseaux gris qui vous téléportent ou téléportent une cible unique jusqu’à 100 mètres de sa position initiale.
• La cible peut traverser des objets solides, même si vous n’avez pas de ligne de vue sur la destination.
• Pour chaque +2 DR, vous pouvez augmenter la distance de téléportation de 100 mètres.
• Les cibles non consentantes peuvent éviter l’effet avec un Test d’Esquive Facile (+4 DR).
```

### Bosquet d’ombres

Nom (clé) : Bosquet d’ombres

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : Winds of Magic p. 112

**Description**

```text
Les ombres révèlent invisibles et manifestations aethyriques. Une source de lumière est nécessaire ; l’obscurité totale empêche l’effet. Les attaques contre les cibles ainsi révélées subissent −1 DR. Une créature possédée projette une ombre par occupant.
```

### Cor du Andar

Nom (clé) : Cor du Andar

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : Winds of Magic p. 111

**Description**

```text
Vous invoquez un puissant son de cor qui affecte tous ceux à portée. 
 • Les alliés reçoivent un bonus de +2 DR à leurs Tests de Calme et Commandement en raison du regain de moral. 
 • Les ennemis subissent un malus de -2 DR à leurs Tests de Calme et Commandement à cause de leur désespoir. 
 • Les ennemis doivent immédiatement réussir un Test de Peur (1). 
 • Les cibles neutres ne sont pas affectées.
```

### Danse du Désespoir

Nom (clé) : Danse du Désespoir

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : Winds of Magic p. 110

**Description**

```text
Vous invoquez un violon sans cordes qui force vos ennemis à danser de manière incontrôlable, perdant toute notion d’urgence. 
 • Les cibles peuvent tenter un Test de Force Mentale pour résister. 
 • Les ennemis affectés ne peuvent ni se déplacer ni agir, sauf s’ils réussissent un Test d’Athlétisme Difficile (−2 DR) ou un Test de Représentation (Danse) Intermédiaire (+0). 
 • À l’expiration du sort, les cibles affectées gagnent +1 État Exténué. 
 • Les alliés et personnages neutres ne sont pas affectés par le sort.
```

### Destrier d’Ombre

Nom (clé) : Destrier d’Ombre

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : V5 p. 255

**Portée**

```text
(Bonus de Force Mentale) mètres
```

**Cible**

```text
1 (maximum)
```

**Description**

```text
Vous invoquez un cheval de monte jusqu’à la prochaine aube. Hors du soleil, il possède Vision dans le noir, Éthéré, Peur (1), Magique, Insensible à la douleur et Protection (9+). Il est infatigable et ne demande ni repos ni nourriture. Chevaucher reçoit +2 DR avec Magie des Arcanes (Ombres), −2 DR sans ce Talent. Le cavalier tombe si le destrier disparaît.
```

### Doppelgänger

Nom (clé) : Doppelgänger

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : V5 p. 254

**Description**

```text
Vous prenez l’apparence d’un humanoïde familier. Sans Seconde Vue, le déguisement trompe automatiquement, sous réserve de vos manières. Avec Seconde Vue, un Test opposé d’Intuition (−1 DR) contre le Test de lancement permet de reconnaître la supercherie.
```

### Effacement d’esprit

Nom (clé) : Effacement d’esprit

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : V5 p. 254

**Durée**

```text
(Intelligence) minutes
```

**Description**

```text
Vous effacez le souvenir de vous chez une cible pendant Intelligence minutes. À l’expiration, vous pouvez lui demander Intelligence (+2 DR) opposée au lancement ; un échec rend la perte de mémoire permanente jusqu’à dissipation.
```

### Grande Illusion

Nom (clé) : Grande Illusion

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : Winds of Magic p. 111

**Durée**

```text
Force Mentale minutes
```

### Illusion

Nom (clé) : Illusion

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : V5 p. 254

**Cible**

```text
ZdE (Bonus d’Intelligence) mètres
```

**Durée**

```text
(Intelligence) minutes
```

**Description**

```text
Vous créez une image illusoire dans une zone de Bonus d’Intelligence mètres pendant Intelligence minutes. Sans Seconde Vue, les observateurs sont dupés. Avec ce Talent, Intuition (−1 DR) opposée au lancement révèle la supercherie, sans voir à travers ni dissiper. Une Action de Focalisation (Ulgu) à −2 DR permet d’animer l’image pendant un Round.
```

### Miasme mystifiant

Nom (clé) : Miasme mystifiant

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : V5 p. 254

**Description**

```text
Les occupants sans Magie des Arcanes (Ombres) gagnent 1 Aveuglé, 1 Assourdi et 1 Exténué pour la durée. Utiliser leur Mouvement exige Perception (+0 DR) ; un échec inflige À Terre.
```

### Traître de Tarn

Nom (clé) : Traître de Tarn

Type (conservé) : Uglu - Gris - Domaine de l'Ombre

Source relue : Winds of Magic p. 113

**Description**

```text
Vous contraignez un ennemi à changer d’allégeance. 
 • Si la cible échoue à un Test opposé de Force Mentale, elle vous considère comme un allié et traite ses anciens alliés comme des ennemis. 
 • À chaque fois qu’elle est incitée à attaquer un ancien allié, elle peut tenter un Test de Calme Intermédiaire (+0) pour briser l’enchantement. 
 • La cible ne suivra pas d’instructions suicidaires. 
 • Si ce Sort est lancé sur une cible neutre, vous gagnez +2 DR à tous les Tests basés sur le Charisme effectués avec cette cible. 
 • Ce Sort n’a aucun effet sur les cibles amicales.
```

## Vie

### Chair de Pierre

Nom (clé) : Chair de Pierre

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : Winds of Magic p. 87

**Durée**

```text
Force Mentale minutes
```

### Don de Vie

Nom (clé) : Don de Vie

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : V5 p. 251

**Durée**

```text
Instantané
```

### Eau de la terre

Nom (clé) : Eau de la terre

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : V5 p. 250

**NI**

```text
7
```

**Portée**

```text
Force Mentale mètres
```

**Description**

```text
Vous disparaissez dans le sol et réapparaissez au début du prochain Round à un point situé à Force Mentale mètres. Une créature sous votre point d’émergence est repoussée d’un mètre dans une direction aléatoire et mise À Terre. Vous pouvez traverser l’eau, mais pas la roche solide.
```

### Escalier en Spirale

Nom (clé) : Escalier en Spirale

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : Winds of Magic p. 89

**Description**

```text
Vous montez sur un escalier de brume jusqu’à Force Mentale mètres de hauteur. Chaque +2 DR ajoute Force Mentale mètres, jusqu’à 200 mètres. Vous gagnez +3 PA à toutes les localisations ; la hauteur s’ajoute à la distance parcourue par les tirs adverses. Les autres mages de Jade connaissant le sort peuvent monter avec Savoir (Magie) (+0 DR) ; les autres traversent l’escalier immatériel.
```

### Floraison de vie

Nom (clé) : Floraison de vie

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : V5 p. 251

**Durée**

```text
Instantané
```

### Forêt d’Épines

Nom (clé) : Forêt d’Épines

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : V5 p. 251

**Description**

```text
Des ronces couvrent une parcelle de terre. Sans Magie des Arcanes (Vie), traverser la zone à pied exige Athlétisme (−2 DR) ; un échec inflige 1 Hémorragique et 1 Enchevêtré de Force égale à votre Force Mentale. La végétation subsiste après expiration, sans propriétés magiques.
```

### Forme bestiale - Jade

Nom (clé) : Forme bestiale - Jade

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : V5 p. 245

**Durée**

```text
Endurance minutes
```

**Description**

```text
Vous appliquez intégralement Forme bestiale V5, pp. 245 et 325–327 : M, F, E, Ag et Dex du profil, Blessures recalculées et Traits standard sauf Bestial et Craintif. Chaque +2 DR permet un Trait optionnel, sauf Taille (Énorme) et Nuée. Vous ne pouvez ni parler, ni lancer de sorts, ni dissiper ; pertes de Blessures et Critiques suivent le retour. Cette identité conserve Ghyran et l’attribut du Domaine de la Vie conformément à l’arbitrage du MJ.
```

### Forme de Bois

Nom (clé) : Forme de Bois

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : Winds of Magic p. 89

**Description**

```text
Vous transformez vous même ou une cible volontaire en un chêne. 
 • La cible voit et entend normalement, mais peut être endommagée par des haches, le feu et les attaques contre les arbres. 
 • Une cible involontaire peut tenter un Test de Force Mentale Accessible (+2 DR) pour résister au sort.
```

### Relief du terrain

Nom (clé) : Relief du terrain

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : V5 p. 251

**Description**

```text
En touchant la terre, vos sens s’écoulent à travers Ghyran, retraçant la zone environnante. 
 Après 1 minute de communion, vous obtenez une carte mentale détaillée des caractéristiques naturelles (reliefs, forêts, rivières). 
 Les zones habitées ne sont pas visibles directement, mais peuvent être devinées (zones défrichées, tranchées creusées, etc.). 
 Si vous augmentez la portée avec du DR, ajoutez +1 minute au temps de communion pour chaque DR.
```

### Sentier de Paranoth

Nom (clé) : Sentier de Paranoth

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : Winds of Magic p. 88

**Durée**

```text
Force Mentale minutes
```

### Transmogrification Exaltée de Colchis

Nom (clé) : Transmogrification Exaltée de Colchis

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : Winds of Magic p. 89

**Cible**

```text
ZdE Force Mentale mètres
```

### Traque des lignes telluriques

Nom (clé) : Traque des lignes telluriques

Type (conservé) : Ghyran - Jade - Domaine de la Vie

Source relue : Winds of Magic p. 88

**Description**

```text
En tapant dans les flux de magie tellurique, vous recevez une carte mentale détaillée de toutes les lignes telluriques et cercles de pierres situés à portée. 
 Vous bénéficiez de +2 DR aux Tests de Navigation pour trouver des lignes telluriques naturelles ou artificielles. 
 Vous ne pouvez pas distinguer à distance les couleurs de magie, mais vous pouvez sentir leur force globale (mineure ou majeure) ainsi que le nombre de pierres levées dans chaque cercle de pierres. 
 Voir Chapitre 14 pour plus de détails sur les lignes telluriques et les pierres levées.
```
