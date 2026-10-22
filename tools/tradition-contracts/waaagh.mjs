// Magie orque : Petite Waaagh (Gobelins) et Grande Waaagh (Orques), Tribes and Tribulations (L12) pp. 98-101. Lots D13 et D14.
// Le livre le plus récent fait foi : L12 (copyright et édition de janvier 2024) l'emporte sur Lustria (L07 p. 183, mars 2023) ; écarts consignés dans CHOIX_EXECUTANT_PHASE_D.md.
// Conversions V4 → V5 : SL → DR, ±10 → ±1 DR, ±20 → ±2 DR, Challenging (+0) → Intermédiaire +0 DR, Avantage → Élan (binaire), yards → mètres. Aucun ingrédient exigé.
// Règles de la Waaagh hors sorts (canalisation par le nombre d'Orques, table de Fiasco de la Waaagh, objets, champignons de chaman) : non implantées, à arbitrer.
import {tradition,fact} from './helpers.mjs';
const ED='Supplément V4 (Tribes and Tribulations), conversion V5';
const make=(domain,type)=>(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L12',page,domain,type,ED,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const little=make('little-waaagh','Domaine de la Petite Waaagh'),big=make('big-waaagh','Domaine de la Grande Waaagh');
const optional=(key,label)=>fact(key,label,'boolean',{perTarget:true,optional:true});
const GREENSKIN=optional('greenskin','Cible : Orque, Gobelin ou Hobgobelin');
const ALLIED={alliesOnly:true,requiredFact:'greenskin'};
const NON_VIVANTS=['mort-vivant','undead','demoniaque','daemonic','artificiel','construct','ethere','ethereal'];
const FORTUNE=fact('waaaghFortune','Petite Waaagh : transformer 1 DR en Point de Chance (jusqu’à la fin de la rencontre)','boolean',{optional:true});
const BFM='Bonus de Force Mentale Rounds',FM='Force Mentale mètres',BFMM='Bonus de Force Mentale mètres',ZBFM='ZdE Bonus de Force Mentale mètres',INSTANT='Instantané';
const NOTE_ELAN='L’Avantage V4 devient l’Élan V5 (binaire) : le sort accorde l’Élan, jamais de points d’Avantage cumulés ni de Groupe d’Avantage.';

export const WAAAGH_PETITE=[
 little('du-calme','Du calme !','Behave!',98,2,FM,'1 (maximum)','Bonus de Force Mentale minutes',
  'Le Chaman grogne contre une créature qui l’accompagne : un Squig, Loup géant, Araignée (toute taille) ou Snotling affecté suit ses ordres avec la discipline d’un chien bien dressé.',
  {type:'narrative',facts:[FORTUNE]},
  'Créatures concernées : Squig, Loup géant, Araignée de toute taille, Snotling (désignées par le MJ). Un seul sujet.'),
 little('mots-malins','Mots malins','Cunnin’ Words',98,0,FM,'1','Bonus de Force Mentale minutes',
  'Le Chaman appelle Mork pour que l’auditeur entende un discours civilisé plutôt que son babil : tout se passe comme s’il parlait la langue de l’auditeur.',
  {type:'narrative',facts:[FORTUNE]},
  'Compréhension seulement ; le sort n’accorde ni bonus social ni contrôle.'),
 little('malediction-de-la-mauvaise-lune','Malédiction de la Mauvaise Lune','Curse of Da Bad Moon',98,9,BFMM,ZBFM,BFM,
  'Le Chaman hurle au ciel et fait surgir une lune hideuse au visage gobelinoïde : les ennemis de la zone gagnent un Exténué et une malchance prononcée, sans Points de Chance pendant la durée.',
  {type:'condition',aoe:true,conditions:['Exténué'],specialState:{cannotUseFortune:true},targetRule:{enemiesOnly:true},facts:[FORTUNE]},
  'Ennemis de la zone seulement ; Exténué et interdiction de dépenser de la Chance pendant la durée.'),
 little('don-du-dieu-araignee','Don du Dieu-Araignée','Gift of the Spider-God',98,3,'Vous','ZdE Bonus de Force Mentale mètres (Gobelins des forêts)',BFM,
  'Le Chaman siffle une invocation au Festin d’au-delà : les Gobelins des forêts alliés de la zone gagnent le Trait Venin de puissance Intermédiaire.',
  {type:'traits',aoe:true,traits:['Venin (Intermédiaire)'],targetRule:{alliesOnly:true,requiredFact:'forestGoblin'},facts:[optional('forestGoblin','Cible : Gobelin des forêts allié'),FORTUNE]},
  'Une cible qui a déjà le Trait Venin passe à la puissance Difficile (−1 DR) : à appliquer par le MJ (le moteur ajoute le Trait nommé).'),
 little('gork-va-arranger-ca','Gork va arranger ça','Gork’ll Fix It',98,5,FM,'1',BFM,
  'Le Chaman pointe un doigt osseux sur un ennemi proche et le maudit au nom de Gork : la cible subit un état Exténué pour la durée.',
  {type:'condition',conditions:['Exténué'],facts:[FORTUNE]},
  'L’état Exténué dure le temps du sort.'),
 little('la-grande-rancune-verte','La Grande Rancune verte','The Great Green Spite',98,20,BFMM,ZBFM,BFM,
  'Le Chaman concentre la rancune accumulée des Gobelins proches en une malédiction très laide : pendant la durée, toute attaque réussie d’un Gobelin contre un ennemi de la zone compte comme un Coup Critique.',
  {type:'special',aoe:true,targetRule:ALLIED,specialState:{assistedReminder:'Chaque attaque de corps à corps ou à distance réussie d’un Gobelin allié contre un ennemi de la zone compte comme un Coup Critique pendant la durée. Si le lanceur est un Hobgobelin, l’effet vaut pour les Hobgobelins.'},facts:[GREENSKIN,FORTUNE]},
  'Gobelins alliés de la zone (fait « Orque, Gobelin ou Hobgobelin » à saisir) ; la détermination du Critique est jouée par le MJ.'),
 little('demangeaison','Démangeaison','Itchy Nuisance',99,4,BFMM,'1',BFM,
  'Le Chaman se gratte les aisselles en cacklant des malédictions d’hygiène et de mites fongiques : la cible subit −1 DR à tous ses Tests ; −2 DR si elle porte une armure de métal.',
  {type:'test-modifiers',testModifiers:{'Tous les Tests':-1},metalArmourTestModifiers:{'Tous les Tests':-2},facts:[FORTUNE]},
  'Armure de métal lue sur la fiche de la cible (matière des pièces portées).'),
 little('mork-te-veut','Mork te veut !','Mork Wants Ya!',99,9,BFMM,'1',INSTANT,
  'Le Chaman pince les doigts ; une grande main verte descend du ciel pour pincer la cible, qui doit gagner un Test de Force opposé à Force 80 pour s’en libérer ; sinon elle subit un coup de 10 au corps puis est lâchée de 2d10 mètres.',
  {type:'damage',damage:{formula:'10',location:'Corps'},opposedTest:{casterScore:80,casterStat:'F',targetStat:'F',targetSkill:'Force',resistOnLoss:true,casterWinsTies:true},facts:[FORTUNE]},
  'Opposition : jet d100 de la main (Force 80) et jet d100 de la cible, saisis. Cible prise : dégâts 10 à la localisation Corps puis chute de 2d10 mètres (dégâts de chute à jouer par le MJ). Cible qui gagne l’opposition : aucun effet.'),
 little('voile-de-la-nuit','Voile de la nuit','Night Shroud',99,5,'Bonus de Force mètres',ZBFM,BFM,
  'Le Chaman lance un champignon à chapeau noir qui éclate en un nuage de ténèbres : quiconque y est plongé est Aveuglé ; qui s’y déplace réussit un Test de Perception Intermédiaire (+0 DR) ou tombe À Terre ; Vision nocturne ou Vision dans le noir immunisent.',
  {type:'condition',aoe:true,conditions:['Aveuglé'],targetRule:{exceptAnyTrait:['vision nocturne','vision dans le noir']},facts:[FORTUNE]},
  'Se déplacer dans le nuage : Test de Perception Intermédiaire (+0 DR), échec : À Terre, à jouer par le MJ (aucun suivi du mouvement).'),
 little('chapardeur','Chapardeur','Nikkit!',99,3,FM,'1',INSTANT,
  'Le Chaman fait surgir deux mains vertes qui tentent de faire les poches d’une cible à portée comme s’il avait Escamotage 55 ; la cible peut remarquer les mains et le butin avec un Test de Perception Intermédiaire (+0 DR).',
  {type:'narrative',facts:[FORTUNE]},
  'Escamotage 55 : jet du Chaman saisi par le MJ ; la cible teste Perception Intermédiaire (+0 DR) pour remarquer les mains qui reviennent.'),
 little('coups-en-traitre','Coups en traître','Sneaky Stabbin’',99,8,'Vous','ZdE Bonus de Force Mentale mètres (Orques et Gobelins)',BFM,
  'Le Chaman enchante ses alliés d’un pouvoir malicieux pour trouver les points faibles de l’ennemi : leurs coups gagnent les Qualités Empaleuse et Perforante.',
  {type:'special',aoe:true,targetRule:ALLIED,specialState:{assistedReminder:'Les coups portés par les cibles ont les Qualités Empaleuse et Perforante pendant la durée.'},facts:[GREENSKIN,FORTUNE]},
  'Orques et Gobelins alliés de la zone (fait à saisir) ; les Qualités sont appliquées par le MJ à chaque coup.'),
 little('regard-vengeur','Regard vengeur','Vindictive Glare',99,7,FM,ZBFM,INSTANT,
  'Le Chaman envoie des éclairs verts de rancune pure qui sifflent et explosent parmi l’ennemi : projectile magique à Dégâts +4 sur tous les occupants de la zone ; qui perd des Blessures teste Calme Intermédiaire (+0 DR) ou est Sonné.',
  {type:'magic-missile',aoe:true,missile:{damage:4},secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:0,rollField:'resistanceRoll',failCondition:'Sonné',failOnlyIfWounded:true},facts:[FORTUNE]},
  'Tous les occupants de la zone, alliés compris (le MJ exclut ceux qu’il juge à l’abri) ; Sonné seulement en cas de Blessures.')
];

export const WAAAGH_GRANDE=[
 big('dur-comme-le-roc','Dur comme le roc','‘Ard as Nails',100,3,BFMM,'1',BFM,
  'Le Chaman imprègne une cible de Waaagh : elle devient belliqueuse et résistante, avec la Haine de tous ses ennemis, ignore les effets négatifs de ses états et maladies, et gagne +2 DR aux Tests fondés sur l’Endurance.',
  {type:'special',traits:['Haine (tous les ennemis)'],testModifiers:{'carac:e':2},specialState:{assistedReminder:'La cible ignore les effets négatifs de tous les états et maladies dont elle souffre pendant la durée (les états restent comptés).'}},
  'Les effets ignorés sont appliqués par le MJ : le moteur ne suspend pas les pénalités d’états et de maladies.'),
 big('frappez-les-les-gars','Frappez-les, les gars !','Bash ‘Em Lads!',100,6,BFMM,'Spécial',INSTANT,
  'Les cris d’encouragement du Chaman emplissent ses alliés de ferveur : pour chaque DR du Test d’incantation, il peut accorder un Élan à un Orque, Gobelin ou Hobgobelin allié à portée.',
  {type:'special',grantMomentum:true,targetRule:ALLIED,facts:[GREENSKIN]},
  NOTE_ELAN+' Au plus autant de cibles que de DR du Test d’incantation (limite à vérifier par le MJ) ; les cibles déjà en Élan sont inchangées. Lustria (L07 p. 183) écrit « 1 + DR » et limite aux Orques et Gobelins : le livre le plus récent (L12) fait foi.'),
 big('eclate-cervelle','Éclate-cervelle','Brainbursta',100,5,BFMM,'1',INSTANT,
  'Le Chaman fusille sa cible du regard et la frappe d’une vague mentale de belligérance : elle est À Terre et Sonnée, plus un Sonné par DR du Test ; si elle a plus de Sonnés que son Bonus d’Endurance, Calme Accessible (+2 DR) ou Blessure Critique à la tête.',
  {type:'condition',conditions:['À Terre','Sonné'],conditionPerDr:'Sonné'},
  'Au-delà du Bonus d’Endurance en états Sonné : Test de Calme Accessible (+2 DR) de la cible, échec : Blessure Critique à la tête (jouée par le MJ ; le moteur ne compare pas le nombre de Sonné au Bonus d’Endurance).'),
 big('coup-de-boule','Coup de boule','‘Eadbutt',100,6,BFMM,'1',INSTANT,
  'Le Chaman projette sa tête en avant, jetant une force verte maligne sur ceux qui sentent la magie : projectile magique qui frappe toujours la tête, à Dégâts +1, ou +6 si la cible a Attirance aethyrique ou Seconde vue.',
  {type:'magic-missile',missile:{damage:1,fixedLocation:'HEAD',talentDamage:{talents:['aethyric-attunement','second-sight'],damage:6}}},
  'Localisation : Tête, toujours. Cartouche de L12 contradictoire avec son propre texte (« Vous », durée en Rounds) : cartouche de Lustria (L07 p. 183 : une cible, instantané) retenue, consigné.'),
 big('allons-y','Allons-y !','‘Ere We Go!',100,7,'Vous','ZdE Bonus de Force Mentale mètres (Orques)',BFM,
  'Le Chaman débite un flot de borborygmes à ses alliés et les emplit d’une vigueur agressive : les cibles de la zone gagnent l’Élan pour leurs Tests de corps à corps.',
  {type:'special',aoe:true,grantMomentum:true,targetRule:ALLIED,facts:[GREENSKIN]},
  NOTE_ELAN+' Les cibles sont les Orques alliés de la zone (les Hobgobelins si le lanceur est un Hobgobelin).'),
 big('le-soleil-mauvais','Le Soleil mauvais','The Evil Sun',101,12,BFMM,'ZdE Force Mentale mètres',BFM,
  'Chargé d’une puissance immense, le Chaman fait naître un noyau ardent à défenses et rictus ; ses cibles subissent 8 + DR de dégâts à chaque Round et réussissent un Test d’Endurance Intermédiaire (+0 DR) ou gagnent un état Enflammé.',
  {type:'special',aoe:true,roundEffect:{phase:'endOfRound',damage:{formula:'8 + DR'},test:{skill:'Endurance',stat:'E',modifierSl:0},failConditions:['Enflammé']}},
  'Chaque fin de Round : dégâts 8 + DR du Test d’incantation, localisation et Test d’Endurance saisis ; échec : un état Enflammé de plus. Alliés compris (la source ne distingue pas).'),
 big('poings-de-gork','Poings de Gork','Fists of Gork',101,2,'Vous','Vous',BFM,
  'Les poings noueux du Chaman grossissent et durcissent comme du fer : il doit lâcher ce qu’il tient et ne peut attaquer qu’à mains nues, avec Corps à corps (Bagarre) 55 et Arme (Poings) +9.',
  {type:'special',conjureWeapon:true,conjureWeaponProfile:{id:'gork-fists',name:'Poings de Gork',damage:9,hands:1,reach:'personal',qualities:[]},conjureWeaponScore:55},
  'Attaque créée : Corps à corps (Bagarre) 55, dégâts BF + 9. Les objets tenus sont lâchés par le MJ (rappel). Les poings sont comptés « Magique » comme toute arme conjurée du moteur (précision du moteur, pas du livre).'),
 big('pied-de-gork','Pied de Gork','Foot of Gork',101,10,BFMM,ZBFM,INSTANT,
  'Le Chaman hurle au ciel en agitant les mains ; Gork répond d’un pied qui écrase tout : les cibles de la zone tombent À Terre et reçoivent un coup de 8 qui ignore les Points d’Armure, ou 4 avec un Test d’Esquive Difficile (−1 DR) réussi.',
  {type:'damage',aoe:true,damage:{formula:'8',ignoreAp:true},conditions:['À Terre'],secondaryTest:{actor:'target',mandatory:true,skill:'Esquive',stat:'Ag',modifierSl:-1,rollField:'dodgeRoll',conditionsOnly:true,damageOnSuccess:4},facts:[]},
  'À Terre dans tous les cas ; localisation aléatoire, Points d’Armure ignorés ; Esquive Difficile (−1 DR) saisie.'),
 big('regard-de-mork','Regard de Mork','Gaze of Mork',101,5,FM,'Spécial',INSTANT,
  'Un rayon destructeur d’énergie fulgurante jaillit des yeux du Chaman et frappe tout sur sa ligne : toute créature vivante sur la ligne subit un projectile magique à Dégâts +4 ; les structures de Résistance 65 ou moins sont aussi endommagées.',
  {type:'magic-missile',missile:{damage:4},targetRule:{exceptAnyTrait:NON_VIVANTS}},
  'Ligne droite dans la direction du tir : cibles désignées par le MJ. Structures : dégâts à jouer par le MJ (Endurance 65 ou moins).'),
 big('la-main-de-gork','La Main de Gork','The Hand of Gork',101,9,FM,'Spécial',BFM,
  'Le Chaman conjure une énorme main verte éthérée qui saisit 1d10 cibles et les dépose quelque part à portée, à Bonus de Force Mentale mètres les unes des autres ; à l’atterrissage, elles gagnent l’Élan si elles engagent aussitôt le corps à corps.',
  {type:'narrative'},
  NOTE_ELAN+' Nombre de cibles : 1d10 (dé joué par le MJ) ; positions non suivies ; l’Élan est accordé par le MJ à ceux qui engagent immédiatement.'),
 big('mork-nous-protege','Mork nous protège !','Mork Save Us!',101,8,BFMM,'Spécial',BFM,
  'Le Chaman implore Mork de protéger ses alliés : pour chaque DR du Test d’incantation, un Orque, Gobelin ou Hobgobelin allié à portée reçoit une Protection de 10+ ; une Protection existante s’améliore d’un cran.',
  {type:'special',ward:10,targetRule:ALLIED,facts:[GREENSKIN]},
  'Une Protection déjà possédée est améliorée de 1, sans jamais dépasser 7+ ; au plus autant de cibles que de DR du Test (limite à vérifier par le MJ). L12 inclut les Hobgobelins, Lustria (L07 p. 183) seulement les Orques et Gobelins : L12 fait foi.'),
 big('waaagh','WAAAGH !','WAAAGH!',101,12,'Vous','ZdE Force Mentale mètres (tous les Orques, Gobelins et assimilés, alliés ou non)',BFM,
  'Une vague irrépressible d’énergie magique émane du Chaman, accueillie par les rugissements de tous les Orques, Hobgobelins et Gobelins du voisinage : ils gagnent l’Élan, perdent leurs états Brisé et gagnent +2 DR aux Tests de Calme et d’Endurance.',
  {type:'special',aoe:true,grantMomentum:true,removeConditions:['Brisé'],testModifiers:{Calme:2,Endurance:2},targetRule:{requiredFact:'greenskin'},facts:[GREENSKIN]},
  NOTE_ELAN+' Alliés ou non : seuls les Orques, Gobelins et assimilés de la zone sont touchés (fait à saisir).')
];
