// Domaine de la Démonologie (Daemonology), livre de base V5 p. 258. Lot D5.
// Aucun attribut de Domaine ; règle d'ingrédients neutralisée ; Octogramme : version V5 (sans clause d'évasion V4).
import {tradition,fact} from './helpers.mjs';
const DOMAINE='daemonology',TYPE='Domaine de la Démonologie',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const DEMONS=['demoniaque','daemonic','demon','daemon'];

export const DEMONOLOGIE=[
 L06('destruction-de-demon-mineur','Destruction de Démon Mineur','Destroy Lesser Daemon',258,6,'Bonus de Force Mentale mètres','1 Démon de taille Moyenne ou inférieure','Bonus de Force Mentale Rounds',
  'Votre sort défait le Dhar qui tient un démon ensemble : si vous remportez l’opposition d’Endurance, il est détruit et vous gagnez +10 à une caractéristique de votre choix pour la durée.',
  {type:'special',targetRule:{requiredAnyTrait:DEMONS,allowedSizes:['small','average']},opposedTest:{casterStat:'FM',targetStat:'E',targetSkill:'Endurance',targetSlModifier:4,resistOnLoss:true,casterWinsTies:true},destroyOnOpposedWin:true,casterBoostOnDestroy:{fact:'boostedStat',amount:10},facts:[fact('boostedStat','Destruction : caractéristique du lanceur qui gagne +10 en cas de victoire','select',{options:[['CC','Capacité de Combat'],['CT','Capacité de Tir'],['F','Force'],['E','Endurance'],['I','Initiative'],['Ag','Agilité'],['Dex','Dextérité'],['Int','Intelligence'],['FM','Force Mentale'],['Soc','Sociabilité']]})]},
  'Cible : un Démon de taille Moyenne ou moins (Petite ou Moyenne ; taille lue sur les Traits, à vérifier par le MJ). Opposition : Test d’incantation contre Endurance Accessible (+4 DR) de la cible, deux dés explicites ; égalité au lanceur. Victoire : démon détruit, et +10 à la caractéristique choisie du lanceur pendant Bonus de Force Mentale Rounds (appliqué au lanceur par le moteur, décision du MJ du 22/10).'),
 L06('detection-de-demon','Détection de démon','Detect Daemon',258,4,'Force Mentale mètres','Spécial','Instantané',
  'Vous savez automatiquement s’il y a un démon manifesté à portée : invoqué, lié à un artefact, possédant un autre être, ou équivalent.',
  {type:'narrative'},
  'Réponse du MJ : oui ou non, sans localisation précise. Aucun jet.'),
 L06('manifestation-de-demon-mineur','Manifestation de Démon Mineur','Manifest Lesser Daemon',258,8,'Bonus de Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds',
  'Vous déchirez le voile : un Démon mineur (Sanguinaire ou Démonette) surgit ; une opposition Focalisation (Dhar) contre Calme décide s’il obéit à un ordre, après quoi il disparaît, sinon il attaque.',
  {type:'special',assistedSummon:true,facts:[fact('daemonKind','Manifestation : démon mineur invoqué','select',{options:[['bloodletter','Sanguinaire'],['daemonette','Démonette']]}),fact('commandOutcome','Manifestation : issue de l’opposition Focalisation (Dhar) / Calme','select',{options:[['obeys','Le lanceur l’emporte : un ordre, puis le démon disparaît'],['attacks','Le démon l’emporte : il attaque aussitôt']]})]},
  'Profil du démon (L06 p. 349) : participant à créer par le MJ (profils de bestiaire : phase E). Opposition Focalisation (Dhar) du lanceur contre Calme du démon, jouée par le MJ. Victoire : le démon exécute un seul ordre, pris au pied de la lettre, puis disparaît ; si l’ordre n’est pas accompli à la fin de la durée, le démon reste et devient hostile (décision du MJ du 22/10) ; un ordre accompli le fait disparaître. Échec : il attaque immédiatement.'),
 L06('octogramme','Octogramme','Octagram',258,10,'Toucher','ZdE Bonus d’Intelligence mètres','Force Mentale minutes',
  'Un octogramme tracé au sol et marqué de symboles impies protège contre toute influence démoniaque : une créature Démoniaque ne peut ni y entrer ni en sortir.',
  {type:'special',aoe:true,specialState:{assistedReminder:'Les créatures au Trait Démoniaque ne peuvent ni entrer dans l’octogramme ni en sortir pendant la durée ; aucune position n’est suivie.'}},
  'Version V5 : aucune clause d’évasion. Diamètre maximum : Bonus d’Intelligence mètres. Les démons déjà dans la zone y restent prisonniers ; le MJ applique la barrière. Craie ou symboles : rappel narratif, jamais une exigence.')
];
