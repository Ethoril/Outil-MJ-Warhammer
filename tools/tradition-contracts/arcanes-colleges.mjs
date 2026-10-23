// Compléments des Collèges : huit sorts d'Arcane de Winds of Magic (L17 pp. 26-27) et Voile de brouillard (Lustria L07 p. 81). Lot D19.
// Conversions V4 → V5 : SL → DR, −3 SL de Silence → −3 DR ; « Silence » du livre est nommé « Silence (Arcane) » (le Silence d'Ombres existe déjà). Noms français proposés (aucun officiel).
import {tradition} from './helpers.mjs';
const TYPE='Sort d’Arcane',ED='Supplément V4 (Winds of Magic), conversion V5';
const arc=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L17',page,'arcane',TYPE,ED,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const FENBEAST=['bete des fens','fenbeast'];
const BFMM='Bonus de Force Mentale mètres',FM='Force Mentale mètres';

export const ARCANES_COLLEGES=[
 arc('belligerance-du-marais-de-sang','Belligérance du Marais de sang','Belligerence of the Bloodmarsh',26,2,BFMM,'1 Bête des fens (n’importe laquelle)','Instantané',
  'Vous emplissez une Bête des fens d’un sens urgent du but et d’un mauvais caractère : si elle ne l’a pas déjà, elle gagne le Trait Frénésie.',
  {type:'traits',traits:['Frénésie'],targetRule:{requiredAnyTrait:FENBEAST}},
  'Cible : une Bête des fens (construit de marais ; profils : phase E), reconnue au Trait « Bête des fens » posé par le MJ. Le Trait reste tant que le MJ ne le retire pas (durée instantanée dans la source).'),
 arc('effondrement-d-un-construit','Effondrement d’un construit','Collapse Construct',26,6,BFMM,'1 Construit (n’importe lequel)','Instantané',
  'Vous défaites les énergies magiques qui tiennent un construit : Test opposé de Force Mentale contre Endurance ; si vous gagnez, le construit devient inerte et sans vie.',
  {type:'special',targetRule:{requiredAnyTrait:['artificiel','construct']},opposedTest:{casterStat:'FM',targetStat:'E',targetSkill:'Endurance',resistOnLoss:true,casterWinsTies:true},specialState:{assistedReminder:'Le construit est inerte et sans vie (hors combat) tant que le MJ ne le relève pas.'}},
  'Opposition : Test d’incantation (Force Mentale) contre Endurance du construit, deux dés explicites, égalité au lanceur. Construit : cible portant le Trait Artificiel ou Construit.'),
 arc('dechiffrer-la-malediction','Déchiffrer la malédiction','Decipher Curse',26,4,FM,'Tout objet','Instantané',
  'Vous enquêtez magiquement pour savoir si un objet est maudit : déchiffrer une malédiction en révèle les secrets (nature maudite, bienfaits et méfaits, déclencheur) ; ensuite Test d’Intelligence Intermédiaire (+0 DR), échec : Exposition modérée à la Corruption.',
  {type:'narrative'},
  'La malédiction reste active une fois déchiffrée : le rituel Lever la malédiction (L17 p. 33) est nécessaire pour la lever (rituels : système à part). Test d’Intelligence du lanceur et Exposition modérée (V5 p. 187) joués par le MJ.'),
 arc('perturber-la-magie','Perturber la magie','Disrupt Magic',26,8,FM,'1','Instantané',
  'Vous connaissez une forme agressive de dissipation qui vise un lanceur en train de canaliser : lancé avant qu’il ait fini son sort, vous pouvez opposer un Test de Force Mentale ; si vous gagnez, son sort échoue et il subit un Fiasco mineur.',
  {type:'special',opposedTest:{casterStat:'FM',targetStat:'FM',targetSkill:'Force Mentale',resistOnLoss:true,casterWinsTies:true},specialState:{assistedReminder:'Victoire : le sort de la cible échoue et elle subit un Fiasco mineur (tirage joué par le MJ).'}},
  'À lancer avant que l’autre lanceur ait fini son sort ou rituel (moment constaté par le MJ). Opposition : deux dés explicites, égalité au lanceur.'),
 arc('pourriture-grouillante-de-mouches','Pourriture grouillante de mouches','Fly-Infested Rotweed',26,4,BFMM,'1 Bête des fens (n’importe laquelle)','Bonus de Force Mentale minutes',
  'Vous faites sortir les mouches et autres insectes de la matière de la Bête des fens et voler autour d’elle : elle gagne le Trait Distrayant.',
  {type:'traits',traits:['Distrayant'],targetRule:{requiredAnyTrait:FENBEAST}},
  'Cible : une Bête des fens (Trait posé par le MJ). Le Trait Distrayant dure Bonus de Force Mentale minutes.'),
 arc('limon-de-vie','Limon de vie','Lifebloom Silt',26,4,BFMM,'1 Bête des fens (n’importe laquelle)','Bonus de Force Mentale minutes',
  'Vous dotez une Bête des fens d’un plus grand pouvoir de régénération : pendant la durée, elle régénère le double de Blessures.',
  {type:'special',targetRule:{requiredAnyTrait:FENBEAST},specialState:{assistedReminder:'La Bête des fens régénère le double de Blessures qu’elle récupérerait normalement (son Trait Régénération est à jouer par le MJ).'}},
  'Cible : une Bête des fens (Trait posé par le MJ). Le doublement s’applique à la Régénération du profil (phase E).'),
 arc('silence-arcane','Silence (Arcane)','Silence (Arcane)',27,4,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes',
  'Vous créez autour de vous une zone où aucun bruit ne passe : on n’y entend rien et on n’entend rien de l’extérieur ; l’incantation y subit −3 DR.',
  {type:'test-modifiers',aoe:true,testModifiers:{'Langue (Magick)':-3}},
  'Variante d’Arcane du Silence d’Ombres (contrat distinct, jamais confondu avec lui) : −3 DR à l’incantation (Langue (Magick)) dans la zone, pour tous les occupants ; aucun suivi du bruit ni des positions.'),
 arc('secours-au-serviteur-magique','Secours au serviteur magique','Succour Magical Servant',27,2,BFMM,'Un de vos Constructs ou Familiers','Instantané',
  'Vous donnez de la puissance magique à votre Familier ou construit : la créature magique récupère aussitôt un nombre de Blessures égal à son Bonus d’Endurance ; avec +3 DR ou plus, le double.',
  {type:'healing',healing:{amountFormula:'BE',onTarget:true},targetRule:{alliesOnly:true}},
  'Le soin est calculé sur le Bonus d’Endurance du serviteur (décision du MJ du 22/10) ; son Endurance doit figurer sur sa fiche. Le doublement à +3 DR est le seul effet de l’option de surpuissance. Cible : votre Familier ou construit (désigné par le MJ).',
  {overcastSpecific:[{id:'double',label:'+3 DR : soin doublé',cost:3,repeat:false,kind:'reminder',reminder:'La créature récupère le double de son Bonus d’Endurance en Blessures.'}]}),
 tradition('voile-de-brouillard','Voile de brouillard','Shroud of Fog','L07',81,'arcane','Sort d’Arcane (Ombres)','Supplément V4 (Lustria), conversion V5',8,'Vous','ZdE Bonus de Force Mentale miles','Force Mentale minutes',
  'Vous faites naître un épais brouillard qui couvre la région : la visibilité est réduite à 10 mètres ; le brouillard n’est pas magique et ne peut être dissipé.',
  {type:'narrative'},
  {assisted:['Sort d’Arcane du Domaine des Ombres, pratiqué par les Tisseurs de tempête et certains Ombromanciens de l’Ordre Gris. Visibilité : jouée par le MJ (aucune météo suivie). Le brouillard est non magique : aucune dissipation possible.']})
];
