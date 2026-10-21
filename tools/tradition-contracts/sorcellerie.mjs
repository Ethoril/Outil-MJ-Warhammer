// Domaine de la Sorcellerie (Witchcraft), livre de base V5 pp. 256-257. Lot D4.
// Attribut du Domaine : aucun en V5 ; règle d'ingrédients neutralisée (principe transversal) ; aucune Corruption par incantation de Dhar.
import {tradition,fact} from './helpers.mjs';
const DOMAINE='witchcraft',TYPE='Domaine de la Sorcellerie',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const select=(key,label,options)=>fact(key,label,'select',{options});

export const SORCELLERIE=[
 L06('degradation','Dégradation','Blight',256,14,'Bonus de Force Mentale mètres','Spécial','Instantané',
  'Vous frappez de désolation une taverne, un puits, un champ ou un animal domestique : vivres gâtés, eau saumâtre, cultures pourries, ou bête qui ne produit plus rien.',
  {type:'narrative',facts:[select('blightTarget','Dégradation : cible frappée',[['tavern','Taverne : toute la nourriture et la boisson se gâtent'],['well','Puits : eau saumâtre et stagnante'],['field','Champ : cultures pourries pendant la nuit'],['animal','Animal : ne produit plus, meurt en 24 − DR jours']])],receiptFormulas:{joursAvantMortAnimal:'24 - DR'}},
  'Effets de fiction constatés par le MJ. Animal : mort en 24 moins les DR du Test d’incantation (jours). Aucun ingrédient : la préparation est un rappel narratif.'),
 L06('menace-rampante','Menace rampante','Creeping Menace',257,6,'Force Mentale mètres','1','Bonus de Force Mentale Rounds',
  'Un essaim de créatures rampantes (rats géants, araignées géantes ou semblables) engage chaque cible ; à la fin du sort les survivants disparaissent dans l’ombre.',
  {type:'special',assistedSummon:true,facts:[select('swarmType','Menace rampante : essaim invoqué',[['rats','Rats géants'],['spiders','Araignées géantes'],['other','Autre créature rampante semblable']])]},
  'Profil standard de la créature choisie avec le Trait Nuée (profils de bestiaire : phase E ; participant à créer par le MJ). Chaque cible touchée est Engagée par un essaim ; une Action avec Charme animal Intermédiaire (+0 DR) en redirige un ou plusieurs vers une autre cible. Si le lanceur meurt avant la fin, le MJ décide du sort des essaims (la source se tait).'),
 L06('malediction-de-douleur-paralysante','Malédiction de douleur paralysante','Curse of Crippling Pain',257,10,'Force Mentale mètres','1','Bonus de Force Mentale Rounds',
  'Vous poignardez une poupée représentant la cible : au Corps, Exténué et chute ; à la Tête, Sonné et étourdissement ; à un Membre, membre inutilisable.',
  {type:'condition',expireConditions:true,facts:[select('stabLocation','Malédiction de douleur : localisation poignardée',[['body','Corps'],['head','Tête'],['limb','Membre']])],
   factModes:{fact:'stabLocation',values:{
    body:{conditions:['Exténué'],secondaryTest:{actor:'target',mandatory:true,skill:'Endurance',stat:'E',modifierSl:-2,rollField:'resistanceRoll',failCondition:'À Terre'}},
    head:{conditions:['Sonné']},
    limb:{conditions:[]}}}},
  'Corps : +1 Exténué, puis Endurance Difficile (−2 DR) ou À Terre. Tête : +1 Sonné, puis Endurance Accessible (+2 DR) ou un Sonné de plus par DR négatif (jet saisi par le MJ). Membre : inutilisable comme s’il était amputé (V5 p. 177), effet à suivre par le MJ. Exténué et Sonné durent le temps du sort. Nouvelle localisation : une Action de Focalisation Accessible (+2 DR) pour une localisation encore intacte. Aucune poupée exigée.'),
 L06('malediction-de-malchance','Malédiction de malchance','Curse of Ill Fortune',257,8,'Force Mentale mètres','1','Bonus de Force Mentale minutes',
  'La cible subit la malchance : −1 DR à tous ses Tests et aucune dépense de Chance ; sans Chance, elle relance les jets 01-05.',
  {type:'test-modifiers',testModifiers:{'Tous les Tests':-1},specialState:{cannotUseFortune:true},facts:[select('curseMode','Malédiction de malchance : portée du sort',[['normal','Ligne de vue, Bonus de Force Mentale minutes'],['possession','Possession de la cible : sans ligne de vue, Bonus de Force Mentale jours']])],
   factModes:{fact:'curseMode',values:{normal:{},possession:{durationOverride:'Bonus de Force Mentale jours'}}}},
  'Sans Chance, la cible relance tous ses jets 01-05 (rappel). Avec un objet ou une mèche de la cible (rappel narratif, jamais exigé) : portée Bonus de Force Mentale miles sans ligne de vue et durée Bonus de Force Mentale jours.'),
 L06('glamour','Glamour','Glamour',257,4,'Toucher','1 adulte','Bonus de Force Mentale heures',
  'Vous modifiez l’apparence de la cible pour qu’elle paraisse de l’âge que vous voulez, dans les limites de l’âge adulte.',
  {type:'narrative'},
  'Âge apparent au choix du lanceur, dans la fourchette de l’âge adulte de l’espèce ; rien d’autre ne change.'),
 L06('horreur-hantante','Horreur hantante','Haunting Horror',257,8,'Toucher','Spécial','Force Mentale jours',
  'Un lieu (maison, clairière) est hanté de rêves et de cauchemars éveillés : qui y entre, sauf sorcières et familiers, gagne un Exténué, puis un Exténué et un Brisé de plus s’il échoue au Test de Calme.',
  {type:'special',triggered:{event:'entering',alwaysConditions:['Exténué'],test:{skill:'Calme',stat:'FM',modifierSl:0},failConditions:['Exténué','Brisé']}},
  'À déclencher pour chaque créature qui entre (clause « entrée » de la couche, jet du Test de Calme Intermédiaire +0 DR saisi) ; les sorcières et leurs familiers sont exemptés (ne pas déclencher). Les états de ce sort ne sont retirés qu’en quittant le lieu ; le MJ les retire à la sortie. Lieu : rappel narratif, aucune position suivie.'),
 L06('bonne-sante','Bonne santé','Make Hale',257,4,'Toucher','1','Instantané',
  'Vos mains luisent d’une lumière jaune apaisante : la cible récupère un nombre de Blessures égal à votre Bonus de Force Mentale et perd 1 Exténué et 1 Sonné.',
  {type:'healing',healing:{amountFormula:'BFM'},removeConditionLevels:{'Exténué':1,'Sonné':1}},
  'Avec +3 DR, la portée devient Bonus de Force Mentale mètres (options ci-dessous). Un seul niveau de chaque état est retiré.',
  {overcastSpecific:[{id:'range',cost:3,kind:'reminder',label:'Portée Bonus de Force Mentale mètres',reminder:'Portée portée à (Bonus de Force Mentale) mètres : jets de lumière à distance.'}]}),
 L06('mauvais-oeil','Mauvais œil','The Evil Eye',257,6,'10 mètres maximum','1 maximum','Instantané',
  'Vous plongez votre regard dans celui de la cible : Intimidation ou Calme opposés, avec les DR de l’incantation ajoutés à votre résultat ; si vous gagnez, la cible subit Peur (1) de votre part et un Exténué (un de plus par +3 DR d’écart), et un Brisé à +6 DR.',
  {type:'special',facts:[select('evilEyeOutcome','Mauvais œil : issue de l’opposition',[['lost','Opposition perdue : aucun effet'],['won','Gagnée de moins de 3 DR : 1 Exténué'],['won3','Gagnée de 3 à 5 DR : 2 Exténué'],['won6','Gagnée de 6 à 8 DR : 3 Exténué et Brisé'],['won9','Gagnée de 9 DR ou plus : 4 Exténué et Brisé']])],
   factModes:{fact:'evilEyeOutcome',values:{lost:{},won:{conditions:['Exténué']},won3:{conditions:['Exténué','Exténué']},won6:{conditions:['Exténué','Exténué','Exténué','Brisé']},won9:{conditions:['Exténué','Exténué','Exténué','Exténué','Brisé']}}}},
  'Opposition Intimidation ou Calme jouée par le MJ (jets explicites), les DR du Test d’incantation s’ajoutent à votre résultat ; l’issue est saisie. Victoire : la cible subit Peur (1) du lanceur, Test à jouer ; la Peur est lue comme durant la rencontre (le MJ tranche, la source ne dit rien). Un Exténué de plus par +3 DR d’écart, Brisé à +6 DR.')
];
