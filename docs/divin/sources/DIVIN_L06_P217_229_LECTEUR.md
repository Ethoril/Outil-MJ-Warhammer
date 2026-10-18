# E1 - relevé de lecture V5, pages imprimées 217-229

Date de lecture : 17 octobre 2026. Lecteur : E1, relevé de source à confronter indépendamment. Cette note ne constitue ni une adaptation, ni une validation de code, ni une clôture du livre.

## Preuve et périmètre lu

Source : `Livre de base V5 EN v2.pdf`, empreinte et pagination présentes dans `DIVIN_CORPUS_LIVRES.json`. Correspondance contrôlée contre `text/Livre de base V5 EN v2.json` (379 chaînes de pages). La page PDF physique 217 porte la page imprimée 217; la première chaîne JSON de cette plage reproduit les pages imprimées 216-217. Les physiques 218 à 229 portent respectivement les pages imprimées 218 à 229. J’ai lu les pages imprimées 217 à 229 intégralement, texte et rendu visuel. Les tableaux visibles de colère divine p.218-219 et des associations bénédictions/cultes p.220 ont été relus sur images, comme les colonnes des bénédictions p.221 et le contenu de miracles p.222-229. Les images de contrôle restent dans le dossier privé `.../e1-pdf/` hors Git.

Compteurs de ce lot : 13 pages imprimées consultées (217-229); 10 cultes dans le tableau; 19 bénédictions distinctes; 60 associations bénédiction-culte (10 x 6); 60 miracles (10 x 6). Ce décompte porte uniquement sur les pages ci-dessus. La table Wrath of the Gods (p.218-219) comporte les résultats 01-100, puis extensions 101-151+; les valeurs au-delà de 100 sont des tranches explicites, pas des entrées ordinaires d100. Les descriptions de cultes, talents d’accès, règles de péché, et profils/renvois du reste du livre ne sont pas exhaustivement recensés par cette note.

## Règles communes et dépendances de p.217-221

- **Accès et résolution (p.217, 220-222).** Bless requiert le talent Bless et donne accès aux six bénédictions du culte; Invoke permet d’appeler un miracle du culte. Chaque prière utilise un Test de Pray Challenging (+0 SL). Une réussite manifeste la prière selon son effet et ses SL; un échec fait prononcer les paroles sans effet; un fumble déclenche la table Wrath of the Gods. Le talent d’accès n’est pas une clause d’effet.
- **Usage concurrent et maintien (p.217).** Il faut pouvoir dire/entonner/chanter la prière requise. Une bénédiction ou un miracle donné ne peut être actif qu’une fois à la fois; attendre sa fin avant de réutiliser cette prière. Des invocations identiques par plusieurs personnes ne cumulent pas leurs bonus. Une prière murmurée ou dite sans conviction peut augmenter la difficulté à l’appréciation du MJ.
- **Sin/Wrath (p.217-219).** À chaque Test de Pray, comparer les unités du jet au total courant de Sin Points : si elles sont égales ou inférieures, lancer Wrath même si le Test de Pray réussit. Le MJ peut aussi lancer/choisir un résultat quand le fidèle insulte sottement son dieu. Au jet de la table, ajouter +10 par Sin Point; après application, diminuer le total de Sin de 1, minimum 0. Résultats détaillés ci-dessous en catégories d’effet, sans réécrire la table entière. Le d100 comporte aussi les plages 101+ montrées p.219.
- **Paliers de SL (p.220 et p.222).** Bénédiction : par +2 SL, choisir +6 yards de portée, +1 cible, ou +6 rounds; option répétable. Durée Instant ne s’étend pas. Exemple source : Healing peut soigner plusieurs cibles touchées ou étendre la portée. Miracle : par 2 SL, augmenter portée, cibles ou durée de la valeur initiale; ne pas accroître un miracle avec Range et Target “You”; Instant reste Instant. Les miracles touch exigent en combat un test opposé de Melee (Brawling), Sleight of Hand/Dodge ou Melee si la cible refuse le contact; inverser le test s’il faut déterminer le Hit Location.
- **Manifestation et abuse (p.220).** Bénédictions imperceptibles sans Holy Visions, souvent confondues avec la chance; miracles visiblement surnaturels, avec signes adaptés au dieu. Le MJ peut infliger généralement 1-3 Sin Points pour abus répétés (même scène, blessure, cible ou situation analogue). Des noms de bénédictions diffèrent selon les cultes mais n’en modifient pas l’effet (encadré p.221).

### 10 associations par culte

Chaque entrée ci-dessous a six bénédictions (60 associations au total); les noms sont les identifiants de la page imprimée p.220.

| Culte | Six bénédictions |
|---|---|
| Manann | Battle, Breath, Courage, Hardiness, Savagery, Tenacity |
| Morr | Breath, Courage, Fortune, Righteousness, Tenacity, Wisdom |
| Myrmidia | Battle, Conscience, Courage, Fortune, Protection, Righteousness |
| Ranald | Charisma, Conscience, Finesse, Fortune, Protection, Wit |
| Rhya | Breath, Conscience, Grace, Healing, Protection, Recuperation |
| Shallya | Breath, Conscience, Healing, Protection, Recuperation, Tenacity |
| Sigmar | Battle, Courage, Hardiness, Might, Protection, Righteousness |
| Taal | Battle, Breath, Conscience, Hardiness, The Hunt, Savagery |
| Ulric | Battle, Courage, Hardiness, Might, Savagery, Tenacity |
| Verena | Conscience, Courage, Fortune, Righteousness, Wisdom, Wit |

### 19 bénédictions et clauses utiles (p.221)

Toutes sauf Healing et Recuperation ont Range 6 yards; les 19 ont Target 1. Les trois bénédictions Instant sont Healing, Recuperation et Tenacity; les seize autres durent 6 rounds. Les paliers communs de SL sont applicables, sans extension de durée pour les prières Instant.

| Bénédiction | Effet / précondition ou limite source |
|---|---|
| Battle | +10 Weapon Skill à la cible. |
| Breath | La cible n’a pas besoin de respirer et ignore les règles de Suffocation. |
| Charisma | +10 Fellowship. |
| Conscience | Avant de violer une stricte règle du dieu, test Cool Average (+2 SL); échec : honte, action abandonnée. |
| Courage | +10 Willpower. |
| Finesse | +10 Dexterity. |
| Fortune | Permet de relancer le prochain Test raté; le second résultat s’impose. |
| Grace | +10 Agility. |
| Hardiness | +10 Toughness. |
| Healing | Touch, 1 cible, instant : soigne +1 Wound. |
| The Hunt | +10 Ballistic Skill. |
| Might | +10 Strength. |
| Protection | Pour attaquer la cible, un ennemi fait Cool Average (+2 SL); sur échec, choisit une autre cible ou une autre Action. |
| Recuperation | Touch, instant : raccourcit d’un jour la durée d’une maladie; une tentative max par maladie et personne. |
| Righteousness | L’arme de la cible compte comme Magical. |
| Savagery | À la prochaine Critical Wound infligée par la cible, lancer deux fois et garder le meilleur résultat. |
| Tenacity | Instant : retire une Condition, sauf Besmirched. |
| Wisdom | +10 Intelligence. |
| Wit | +10 Initiative. |

Dépendances saillantes : définition des scores/caractéristiques et Skills courants; mécanique d’attaque et de Critical Wounds; types et durée de Conditions; maladie et récupération; Suffocation; propriétés Magical; chaîne de Tests et relance. La source ne donne pas dans ces pages un modèle de données d’arme, de maladie, ni une procédure de relance/persistance.

## 60 miracles, groupés par culte (p.222-229)

Chaque entrée garde le contrat source sous forme résumée : portée/cibles/durée, mécanisme, condition ou choix. “Fellowship Bonus” abrégé FelB; toutes les durées/portées d’origine sont à conserver comme telles dans la provenance, puis appliquer les décisions de conversion du chantier seulement au moment d’adapter. Ne pas prendre les expressions narratives comme des faits connus de l’outil.

### Manann (6)

- **Becalm** — portée FelB miles, navire à voile en ligne de vue, 1 heure. Immobilise le vent et crée zone d’eau calme d’étendue Fellowship yards autour du navire; zone mobile même si propulsion autre que voile. Dépend navire, ligne de vue, vent/eau et distance.
- **Drowned Man’s Face** — Fellowship yards, une cible, FelB rounds. Fatigued puis noyade pendant l’effet, même daemons/undead car eau sacrée; à la fin, Stunned 1 round. Renvoi noyade p.169; dépend respiration, Wounds/Conditions et échéance réelle.
- **Fair Winds** — portée Initiative Bonus miles, navire à voile en vue, 1 heure. Navigation à vitesse maximale malgré vent/marée/courant; +1 SL aux Sail Tests de contrôle.
- **Manalt’s Bounty** — portée/cibles Special, Instant. Pêcher à la main de quoi nourrir 1 personne (2 si mer); +1 personne par +2 SL. Dépend type de plan d’eau, accès alimentaire et quantité.
- **Sea Legs** — Fellowship yards, 1 cible, FelB rounds. Blinded, Deafened et Fatigued, puis Athletics Average (+2 SL) pour utiliser Move; échec ajoute Prone.
- **Waterwalk** — soi-même, FelB minutes. Traverser l’eau comme sol solide, seulement grand plan d’eau d’au moins 10 yards de large.

### Morr (6)

- **Death Mask** — soi, FelB rounds. Gagne Fear; undead non immunisés malgré talents, traits (Construct inclus) ou autres effets. Dépend psychologie/Fear et exceptions d’immunité.
- **Destroy Undead** — Range “You”, AoE FelB yards, Instant. Uniquement Undead : 1d10 Wounds ignorant TB et AP; +1 Wound par SL; un undead détruit ne peut normalement pas être relevé par Necromancy.
- **Dooming** — Touch, 1, Instant. Vision du destin presque toujours lié à la mort; une fois par personnage. Après coup, Doomed peut être acheté avec XP comme avance de carrière. Dépend identité du personnage et achat d’avance.
- **Last Rites** — 1 yard, cadavre unique, Instant. Envoie l’âme à Morr et empêche nécromancie de viser le cadavre; si la cible est foe avec traits Construct ET Undead, destruction. Dépend cadavre/état, double critère de traits et éligibilité des sorts.
- **Portal’s Threshold** — Touch, cible spéciale, jusqu’au lever du soleil. Trace au sol une ligne max 8 yards. Undead doit réussir Cool Challenging (+0 SL) pour traverser; Undead+Construct ne peut pas la traverser. Dépend géométrie, heure locale et traits.
- **Stay Morr’s Hand** — Touch, 1, FelB heures. Cible à 0 Wounds et consentante seulement; Unconscious, pas de détérioration, maladie/critical wounds/poisons neutralisés. Fin anticipée par soins appropriés ou Last Rites; si Last Rites lancé, âme protégée et corps protégé de nécromancie à la mort. Dépend mort/détérioration, volontariat, soins et événements de fin.

### Myrmidia (6)

- **Blazing Sun** — Special, Special, Instant. Tous non-Myrmidians regardant vers l’invocateur reçoivent 1 Blinded Condition; +1 Condition par +2 SL. Dépend culte et orientation/regard de chaque cible.
- **Eagle’s Eye** — Fellowship yards, soi, FelB rounds. Serviteur aigle spectral, profil normal, invulnérable, incapable d’effet physique; le prêtre pilote et voit par ses yeux, stats Perception 55, Acute Sense (Sight), Fly 80; vue propre perdue, vulnérabilité accrue. Dépend contrôle d’entité, ligne de vue/vision, profil et vol.
- **Fury’s Call** — soi, AoE FelB yards, FelB rounds. Alliés reçoivent trait créature Frenzy. Renvoi trait p.358; appliquer ses conséquences distinctes de l’entrée PJ p.184.
- **Inspiring** — soi, AoE FelB yards, FelB rounds. Alliés dans zone reçoivent talent Drilled. Dépend talent et rattachement aux sujets.
- **Shield of Myrmidia** — Fellowship yards, nombre de cibles égal FelB, FelB rounds. Alliés gagnent +1 Armour Point sur toutes locations. Dépend localisation/couches AP et dommages.
- **Spear of Myrmidia** — soi, soi, FelB rounds. Une lance tenue gagne Damaging et Magical. Dépend arme équipée, qualité et règles d’attaque.

### Ranald (6)

- **An Invitation** — 1 yard, 1, Instant. Un mode de sécurisation d’une porte/fenêtre/trappe s’annule (serrure, loquet, corde, etc.); un autre par +2 SL. Choix de l’objet et du mécanisme.
- **Cat’s Eyes** — Fellowship yards, soi, FelB rounds. Serviteur chat invulnérable à capacités normales; contrôle et partage perceptions; sens aiguisés comme chat, sans talents de sens du bénéficiaire; vue propre coupée. Dépend profil/contrôle et conflit de sens.
- **Cheat the Odds** — soi, soi, durée spéciale jusqu’à fin de session. +1 Fortune Point, +1 par +2 SL; interdit de réinvoquer avant d’atteindre 0 Fortune Points. Dépend ressource Fortune, session, solde et garde de répétition.
- **Ranald’s Grace** — Touch, 1, FelB rounds. +10 Agility, +10 Stealth, +1 Catfall Talent. Dépend caractéristiques, Skill, talent et durée de contribution.
- **Trickster’s Glamour** — 1 yard, 1, FelB minutes. Par cible, choix parmi apparence de bourse vide/pleine, habits cheap/riches, ou objet de valeur unique invisible à percevoir; +1 choix par +2 SL. Effet d’apparence/perception sans modification déclarée du contenu réel.
- **You Saw Nothing** — Fellowship yards, 1, FelB rounds. Peut passer inaperçu tant qu’il n’attire pas attention (contact, attaque, appel, sort, bruit fort, etc.); lancement seulement si personne ne regarde directement le prêtre. Dépend visibilité et action qui interrompt.

### Rhya (6)

- **Rhya’s Children** — soi, AoE Fellowship yards, FelB rounds. Dehors et hors établissements seulement; sens la présence et le passage de tous les êtres vivants en zone. Dépend faits de scène, détection/identité vivants et zone.
- **Rhya’s Harvest** — Touch, Special, 1 round. Fruit, légumes et champignons comestibles croissent au point touché, nourrissent 1 personne par round; type selon lieu. Dépend localisation, nourriture et accumulation temporelle.
- **Rhya’s Shelter** — soi, soi, spécial. Dehors/hors établissements seulement; découvre abri naturel sûr du vent/pluie pour camper, capacité 1; +1 personne par +2 SL; persiste tant que le camp reste et est introuvable après départ. Dépend lieu, météo, campeurs, fin d’effet et persistance.
- **Rhya’s Succour** — Fellowship yards, nombre de cibles FelB, Instant. Chacun retire une Condition; si cela les retire toutes, repos comme après sommeil réparateur et +1 SL aux Tests du prochain Tour. Dépend Conditions présentes et identification du Tour suivant.
- **Rhya’s Touch** — Touch, 1, Special. Choix: soigner FelB Wounds ou guérir une maladie naturellement apparue; pour chaque +2 SL, un choix supplémentaire, répétition du même permise. Effets lents (au moins 10 minutes), recommencer si interruption. Dépend cible, maladie naturelle, Wounds, horloge et interruption.
- **Rhya’s Union** — Touch, cible Special, FelB heures. Bénit une union de deux âmes; conception pendant effet si biologiquement possible. Dépend deux sujets et fait biologique, clause MJ plutôt que calcul inféré.

### Shallya (6)

- **Anchorite’s Endurance** — Fellowship yards, 1, FelB rounds. Cible sans douleur, trait Painless, aucune pénalité de Conditions. Renvoi Painless p.360; Conditions restent présentes.
- **Balm to a Wounded Mind** — Touch, 1, FelB minutes. Retire tous Psychology Traits pendant l’effet; après, sommeil profond jusqu’au lever du soleil sauf perturbation. Cible réticente peut faire Cool Challenging (+0 SL) pour résister au sommeil. Dépend traits, consentement/test, interruption et sommeil.
- **Bitter Catharsis** — Touch, 1, Instant. Transfère puis retire maladie ou poison de la cible; +1 maladie/poison par +2 SL. Pour chaque supprimé, prêtre subit 1d10 - FelB Wounds. Dépend identités/multiplicité maladie/poison, transfert, dégâts et ordre.
- **Martyr** — Fellowship yards, 1, FelB rounds. Tous dégâts qui atteindraient la cible sont subis par le prêtre; ajouter FelB au TB pour calculer les Wounds issus de ces dégâts. Dépend interposition, calcul de dégâts et composition TB.
- **Shallya’s Tears** — Touch, 1, Special. Prier pendant 10 - FelB rounds, guérit une Critical Wound; +1 par +2 SL; interruption annule le bénéfice; ne réattache pas les amputations. Dépend Critical Wounds, membre amputé, horloge/interruption.
- **Unblemished Innocence** — Touch, 1, Instant. Retire 1 Corruption Point acquis durant la dernière session; +1 par +2 SL. Fumble: prêtre et cible gagnent chacun 1d10 Corruption Points supplémentaires aux autres effets. Dépend historique/session, ressources, fumble et double cible.

### Sigmar (6)

- **Beacon of Righteous Virtue** — soi, soi, FelB rounds. Alliés qui voient le prêtre enlèvent Broken immédiatement, gagnent Fearless (Everything) tant que miracle actif et ligne de vue conservée; le prêtre cause Fear aux orcs et gobelins. Dépend vue/alliés, Conditions, talent et réaction peur.
- **Heed Not the Witch** — soi, “You” avec AoE FelB yards, FelB rounds. Tests de Casting des sorts qui ciblent quelqu’un ou quelque chose dans la zone subissent -2 SL en plus d’autres pénalités. Dépend événement sort, zone et cumul modificateurs.
- **Sigmar’s Fiery Hammer** — soi, soi, FelB rounds. Si marteau de guerre manié: Magical, +FelB Damage, et chaque cible touchée reçoit +1 Ablaze. Dépend arme réellement maniée, attaque, dégâts/conditions.
- **Soulfire** — soi, AoE FelB yards, Instant. Tous dans zone: 1d10 Wounds ignorant TB/AP. Daemon ou Undead gagne Ablaze. Pour chaque SL, +1 Wound contre orcs, gobelins, undead ou serviteurs Ruinous Powers. Dépend zone, camp/traits, catégories cumulables, protections et dégâts.
- **Twin-tailed Comet** — Fellowship yards, AoE FelB yards au plus, Instant. Zone en extérieur, en vue et portée, contenant des ennemis selon Sigmar. Les cibles retenues subissent 1d10 + SL Wounds sans TB/AP et Ablaze. Le texte emploie aussi « invalid creatures » sans définir ici la catégorie visée : ne pas en inventer la liste. Si aucun ennemi n’est présent, le prêtre est frappé. Dépend géométrie/extérieur, admissibilité à clarifier et retombée sur prêtre.
- **Vanquish the Unrighteous** — soi, AoE FelB yards, FelB rounds. Alliés reçoivent Hatred contre orcs, gobelins, undead et associés Chaos; après tuer une telle cible, bonus Hatred +2 SL aux Tests de combat au lieu de +1. Dépend liste de cibles et comportement Hatred.

### Taal (6)

- **Animal Instincts** — Touch, 1, FelB hours. +1 Acute Sense (Any One); au repos s’éveille automatiquement à l’approche d’une menace à portée Perception yards. Dépend choix de sens, repos, portée/perception et définition de menace.
- **King of the Wild** — Fellowship yards, 1, FelB minutes. Invoque animal sauvage approprié au milieu, agit selon volonté du prêtre pendant durée; profils indicatifs dans Bestiary p.325-327. Dépend scène/écologie, profils et contrôle d’acteur.
- **Leaping Stag** — soi, soi, FelB rounds. +1 Movement et +1 Strong Legs; réussit automatiquement tous Tests Athletics de saut. Dépend Movement, talent et catégorisation d’un saut.
- **Lord of the Hunt** — soi, soi, FelB hours. Poursuite d’un animal vu ou individu connu (selon MJ); piste jamais perdue sauf surnaturel; entre en établissement met fin à la piste; +1 SL aux Tests concernant la proie. Dépend identité, historique connu, piste, environnement et tests concernés.
- **Tanglefoot** — Fellowship yards, AoE FelB yards, Instant. Enchevêtre les cibles avec Strength égale Fellowship. Dépend cibles dans zone, Condition Entangled et valeur de caractéristique entière.
- **Tooth and Claw** — soi, soi, FelB rounds. Accorde Traits créature Bite (SB+3) et Weapon (SB+4); attaques Magical. Dépend traits, SB, attaques et révocation temporaire.

### Ulric (6)

- **Hoarfrost’s Chill** — soi, AoE Fellowship yards, FelB rounds. Le prêtre cause Fear; autres dans zone perdent leur Advantage au début de chaque Round. Dépend état Advantage, limites de cibles et tick de Round.
- **Howl of the Wolf** — Fellowship yards, cibles Special, FelB rounds. Serviteur loup blanc mineur combat les ennemis puis disparaît; profil Wolf p.327 avec WS45, WP35, Bite +6, Frenzy, Magical, Size (Large). Dépend profil, équipe d’acteur, combat autonome et durée.
- **Pelt of the Winter Wolf** — Touch, 1, FelB hours. La cible ressent toujours le froid mais n’en subit aucune pénalité mécanique. Effet de protection contextuelle à inverser si fin.
- **The Snow King’s Judgement** — Fellowship yards, 1, Instant. 1d10 Wounds ignorant TB/AP, +1 par SL. Si le MJ juge la cible ni faible, lâche ni fourbe, le lanceur subit l’effet. Dépend jugement MJ, critères moraux, choix de victime, dégâts.
- **Ulric’s Fury** — Fellowship yards, 1, FelB rounds. Un allié peut faire un Test gratuit de Frenzy lors de ses Tours; au lieu de l’attaque gratuite, son premier coup de mêlée fait +1d10 dégâts; chaque 10 relance et ajoute des dégâts jusqu’au premier résultat <10. Renvoi Frenzy p.184; modifier la règle normale de l’attaque gratuite sans double application.
- **Winter’s Bite** — soi, soi, FelB rounds. Si hache maniée: Magical, +SL Damage; cibles frappées gagnent Fatigued et perdent Bleeding; la hache ne cause pas Bleeding. Dépend arme, SL de Test, traits d’attaque, Conditions et nettoyage à la fin.

### Verena (6)

- **As Verena Is My Witness** — soi, soi, FelB rounds. Tant que le prêtre dit la vérité, tous auditeurs croient à la véracité de ses propos, sans devoir accepter ses conclusions. Dépend connaissance de vérité, auditeurs, parole et portée de croyance.
- **Blind Justice** — soi, soi, FelB rounds. Test Perception Challenging (+0) pour percer sorts/miracles d’illusion ou diversion; Test Intuition Average (+2) pour discerner si l’interlocuteur croit dire vrai, sans détecter une erreur dont il n’a pas conscience. Deux Tests conditionnels distincts.
- **Shackles of Truth** — Fellowship Bonus yards, 1, FelB rounds. Criminel qui nie son crime devient Entangled, impossible à retirer pendant durée. Fausse accusation déclenche Wrath immédiatement. Dépend fait de crime/vérité fourni par MJ, contestation, état Entangled et déclencheur secondaire.
- **Sword of Justice** — soi, soi, FelB rounds. Si épée maniée, ignore AP et est Magical; criminels frappés font Endurance Average (+2 SL), échec les rend Unconscious au moins FelB rounds. Tout crime commis sur ces inconscients donne +1 Sin Point/préjudice. Dépend arme, attaque, statut de criminel (MJ), Test, Unconscious, durées et Sin.
- **Truth Will Out** — Fellowship Bonus yards, 1, Instant. Une question reçoit réponse immédiatement honnête et complète; cible peut résister par Opposed Cool Average (+2 SL) contre SL du lanceur. Gagnant refuse; +2 SL cache info mineure, +4 importante, +6 peut mentir ouvertement. Le prêtre sait qu’il y a résistance sans savoir le mensonge ni preuve. Dépend dialogue, question, opposition et niveau de rétention.
- **Wisdom of the Owl** — soi, soi, FelB rounds. +20 Intelligence; une question au MJ sur issue probable d’une décision immédiate, à partir des faits disponibles; +1 Acute Sense (Sight), Menacing et Night Vision. Distinguer effets chiffrés applicables des indices/réponse MJ; talents temporaires et retrait requis.

## Sources de règles transverses effectivement ouvertes

Au-delà des pages du lot, j’ai ouvert le texte JSON des pages imprimées 131-132 (tests, SL, difficulté, oppositions, Advantage/Désavantage et relance du résultat par inversion; pour oppositions le plus grand SL gagne même si négatif), 162-163 (Move/Action/Tour/Round et déplacement), 169 (Drowning and Suffocation), 183-184 (tests Psychology, Fear/Hatred/Frenzy), 327 (profil Wolf et capacités), 358-360 (traits Frenzy/Fear/Magical/Miracles, Painless, et tailles). Le texte de la règle des Tests n’inclut pas la règle générique Chance/relances, qui nécessite son renvoi source séparé avant implémentation. Page 169 soutient la noyade et la suffocation, pas une nouvelle conversion d’unités. Ces consultations ponctuelles ne valent pas une lecture exhaustive de ces pages ou chapitres.

## Dépendances et points à transmettre à E2

1. Faire distinguer bénédictions (invisibles, effet léger) et miracles (signes publics), et conserver l’obligation de parler/chanter/prononcer avec conviction, la limite d’un exemplaire actif et la non-cumulativité inter-prêtres.
2. Le test de prière a des issues spéciales : échec sans manifestation; fumble→Wrath; seuil de Sin déclenche Wrath même en réussite; Wrath modifie lui-même Sin, et diverses lignes retirent accès, avancées, équipements, Wounds, Conditions, Fortune, ou exigent tests/acteurs/penitence. Ne pas réduire toutes ces lignes à une narration. Dans cette plage, 01-05 peut créer Stunned après Cool; 36-40, 71-75 et 81-87 infligent des dommages en ignorant TB/AP, avec leurs Tests d’Endurance et états propres; 51-55 inflige 1d10 + Sin Points Wounds et demande un Test d’Endurance Challenging (+0 SL), avec Stunned en cas d’échec, mais ne précise pas l’ignorance de TB/AP. 66-70 donne Prone et Blinded avec Pray pour le retrait; 88 invoque un Lesser Daemon; 101-151+ ont aussi des conséquences mécaniques importantes. La liste complète est dans les pages sources, à traiter par le lot Courroux.
3. Les 60 miracles comportent bien des données mécaniques et des conditions contextuelles nombreuses; plusieurs demandent entités actives, profils modifiés, événements continus (dégâts, attaques, sorts, progression par round, repos), valeurs de caractéristique entières, états durables et fin anticipée. La fiche de clause doit distinguer demande de fait au MJ et conséquence calculée par l’outil.
4. Les coûts matériels ne sont pas présents dans les clauses de cette plage; aucun coût ou inventaire à inférer.
5. **Périmètre restant** : les indices et dépendances ci-dessus n’ont pas été suivis jusqu’à toute règle de dommage, maladie, Critique, arme, sorts, Traits/Talents, Fate/Fortune, Bestiary complet, ni sources d’errata. Aucune adaptation ou conclusion d’exhaustivité sur le livre n’est proposée. Pages imprimées 230+ et les 366 autres pages/livres restent non lues dans ce lot.


