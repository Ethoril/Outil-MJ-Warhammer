// Domaine de Nurgle, livre de base V5 p. 259. Lot D7.
// Attribut du Domaine (Blessure Suppurée) : v5-magic-attributes.js, couche `festeringWoundTest` sur chaque cible tant que le sort dure.
import {tradition} from './helpers.mjs';
const DOMAINE='nurgle',TYPE='Domaine de Nurgle',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
// Natures non vivantes : le Miasme ne touche que les créatures vivantes.
const NON_VIVANTS=['mort-vivant','undead','demoniaque','daemonic','artificiel','construct','ethere','ethereal'];
// Exemptés par le texte : dévoués de Nurgle et moines de la peste skavens (traits à poser par le MJ sur la fiche).
const EXEMPTES=['devoue de nurgle','moine de la peste'];

export const NURGLE=[
 L06('inflammation-suppuree','Inflammation suppurée','Festering Inflammation',259,5,'Bonus de Force Mentale mètres','1','Instantané',
  'Vous faites naître des fluides septiques dans les plaies de l’adversaire : l’une de ses Blessures devient une Blessure Suppurée.',
  {type:'narrative'},
  'Le moteur ne suit pas les Blessures individuelles ni leur état : le MJ désigne la Blessure et applique les règles de Blessure Suppurée (V5 p. 180).'),
 L06('miasme-de-pestilence','Miasme de pestilence','Miasma of Pestilence',259,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds',
  'Une brume fine se rassemble autour de vous : toute créature vivante de la zone réussit un Test d’Endurance Difficile (−2 DR) ou subit le Symptôme de Nausée ; les dévoués de Nurgle et les moines de la peste skavens sont épargnés.',
  {type:'special',aoe:true,targetRule:{exceptAnyTrait:[...NON_VIVANTS,...EXEMPTES]},
   secondaryTest:{actor:'target',mandatory:true,skill:'Endurance',stat:'E',modifierSl:-2,rollField:'resistanceRoll'},
   specialState:{assistedReminder:'Nausée (V5 p. 182) : Symptôme à jouer par le MJ pendant la durée du sort ; le moteur ne suit pas les Symptômes de maladie.'}},
  'Exemptés : les créatures portant le trait « Dévoué de Nurgle » ou « Moine de la peste » (à poser par le MJ sur la fiche), et toute créature non vivante (Mort-vivant, Démoniaque, Artificiel, Éthéré). Le Test d’Endurance de chaque cible est saisi.'),
 L06('flot-de-corruption','Flot de Corruption','Stream of Corruption',259,9,'Spécial','Spécial','Instantané',
  'Votre mâchoire se distend avant de vomir un flot de fange malade : Souffle de type Acide et Poison, sans opposition, projectile magique dont les Dégâts valent votre Bonus d’Endurance, qui ignore les Points d’Armure. Qui perd plus que son Bonus d’Endurance en Blessures teste Endurance Intermédiaire (+0 DR) ou contracte la Pourriture du sang.',
  {type:'damage',damage:{formula:'BE+DR',magicMissile:true,ignoreAp:true}},
  'Souffle non opposé (V5 p. 357) : aucune ligne de vue à calculer, cibles désignées par le MJ. Dégâts = Bonus d’Endurance du lanceur + DR du Test d’incantation, Points d’Armure ignorés, Bonus d’Endurance de la cible compté. Une cible qui perd plus de Blessures que son Bonus d’Endurance fait un Test d’Endurance Intermédiaire (+0 DR) ; en cas d’échec : Pourriture du sang (V5 p. 179), maladie suivie par le MJ. Surpuissance V5 seule : pas de « +2 par +2 DR » de V4.')
];
