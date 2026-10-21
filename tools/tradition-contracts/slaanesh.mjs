// Domaine de Slaanesh, livre de base V5 p. 260. Lot D8.
// Attribut du Domaine (−2 DR contre Animosité, Haine, Corruption ; +2 DR contre Peur, Terreur) : v5-magic-attributes.js.
import {tradition} from './helpers.mjs';
const DOMAINE='slaanesh',TYPE='Domaine de Slaanesh',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});

export const SLAANESH=[
 L06('consentement','Consentement','Acquiescence',260,5,'Toucher','1','Bonus de Force Mentale Rounds',
  'Votre magie transperce la cible et inonde ses sens de sensations étranges et euphoriques : au début de chaque Round, Test d’Endurance Intermédiaire (+0 DR), sinon elle perd son Mouvement et son Action.',
  {type:'special',roundEffect:{phase:'startOfRound',test:{skill:'Endurance',stat:'E',modifierSl:0},testReminder:'Échec : la cible perd son Mouvement et son Action ce Round, submergée de sensations.'}},
  'Test d’Endurance de la cible au début de chaque Round (jet saisi). Échec : aucun Mouvement ni Action pour ce Round ; le MJ l’applique, le moteur ne bloque pas les actions.'),
 L06('de-la-douleur-le-plaisir','De la douleur le plaisir','From Pain, Pleasure',260,6,'Toucher','1','Bonus de Force Mentale Rounds',
  'Vous brouillez les sens de la cible : elle gagne le Trait Indolore pendant la durée ; sur une Blessure Critique, Test d’Endurance Accessible (+2 DR) ou elle lâche ses armes et reste sans défense, perdue dans l’extase.',
  {type:'traits',traits:['Indolore']},
  'Blessure Critique subie pendant la durée : Test d’Endurance Accessible (+2 DR) de la cible, à jouer par le MJ ; échec : armes lâchées et cible Impuissante, lue comme « cible sans défense » pour les attaques contre elle (aucun état Impuissante dans le moteur).'),
 L06('fantasmagorie','Fantasmagorie','Phantasmagoria',260,8,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds',
  'Des visions surnaturelles de créatures envoûtantes et terrifiantes emplissent la zone : vous et tous vos alliés gagnez le Trait Distrayant ; vos cibles ne se distraient pas entre elles.',
  {type:'traits',aoe:true,traits:['Distrayant'],targetRule:{alliesOnly:true}},
  'Alliés de la zone seulement (le lanceur compris) ; les porteurs du Trait ne se distraient pas les uns les autres (rappel, le moteur ne suit pas la distraction). Ennemis et neutres : aucun effet.')
];
