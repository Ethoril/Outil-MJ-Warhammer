// Domaine de la Magie naturelle (Hedgecraft). Lot D2 : livre de base V5 pp. 255-256 ; lot D3 : sorts d'AOTE3 convertis (L02 pp. 62-64).
import {tradition} from './helpers.mjs';
const DOMAINE='hedgecraft',TYPE='Domaine de la Magie naturelle',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});

export const MAGIE_NATURELLE_L06=[
 L06('bonne-volonte','Bonne Volonté','Goodwill',255,0,'Vous','ZdE Bonus de Sociabilité mètres','Bonus de Force Mentale minutes',
  'Une atmosphère de bienveillance s’installe : tous les Tests de Sociabilité dans la zone gagnent +1 DR.',
  {type:'test-modifiers',aoe:true,testModifiers:{'carac:soc':1}},
  'Animosité et Haine sont sans effet dans la zone pendant la durée (aucun suivi automatique des Psychologies). Aucun ingrédient exigé : les matériaux du Domaine sont un rappel narratif.'),
 L06('joie-de-halatha','Joie de Halãtha','Halãtha’s Joy',255,0,'Toucher','1','Bonus de Sociabilité heures',
  'Bénédiction d’une divinité de fertilité : tant que le sort dure, la cible conçoit un enfant si c’est biologiquement possible.',
  {type:'narrative'},
  'Fin « quand utilisé » lue simplement : le sort s’achève à la première occasion de conception, constatée par le MJ.'),
 L06('chevaucher-l-obscurite','Chevaucher l’Obscurité','Mirkride',256,0,'Vous','Vous','Bonus de Force Mentale minutes',
  'Votre esprit quitte le corps et marche dans la Haie : invisible, silencieux, sans prise sur le monde matériel, avec le Trait Éthéré. Le corps reste immobile et insensible.',
  {type:'traits',traits:['Éthéré'],specialState:{cannotCast:true,cannotSpeak:true}},
  'Tout dégât magique subi met immédiatement fin au sort. Vous voyez et touchez esprits, Éthérés et démons, même invisibles, et eux vous. Au terme, l’esprit est rappelé dans le corps ; si le corps est tué pendant ce temps, l’esprit erre pour l’éternité. Version V5 : le sort n’agit sur le monde matériel d’aucune façon.'),
 L06('nepenthes','Nepenthés','Nepenthe',256,0,'Toucher','Spécial','Bonus de Force Mentale heures',
  'Philtre d’argent versé dans une coupe : qui le boit pendant la durée peut oublier définitivement un individu de son choix.',
  {type:'narrative'},
  'Le buveur choisit l’individu oublié ; l’oubli est permanent. Un récipient est un détail narratif, jamais une exigence.'),
 L06('panacee','Panacée','Nostrum',256,0,'Toucher','Spécial','Bonus de Dextérité heures',
  'Potion préparée à l’avance : qui la boit pendant la durée récupère un nombre de Blessures égal au Bonus de Dextérité du lanceur et guérit une maladie.',
  {type:'healing',healing:{amountFormula:'BDex'}},
  'Une maladie de plus par +2 DR au Test d’incantation ; maladie guérie choisie par le lanceur, suivi par le MJ. La potion n’agit que si elle est bue pendant la durée.',{overcastSpecific:[{id:'disease',cost:2,repeat:true,kind:'reminder',label:'Une maladie guérie de plus',reminder:'{pas} maladie(s) supplémentaire(s) guérie(s) (choix du lanceur).'}]}),
 L06('separer-les-branches','Séparer les branches','Part the Branches',256,0,'Vous','Vous','Initiative minutes',
  'Vos pupilles se dilatent : vous voyez dans le monde des esprits, donc toutes les créatures invisibles.',
  {type:'narrative'},
  'Voit toutes les créatures invisibles pendant la durée.'),
 L06('charme-protecteur','Charme protecteur','Protective Charm',256,0,'Toucher','Spécial','Bonus de Force Mentale jours',
  'Un bijou ou une babiole imprégné de protection : son porteur gagne +2 DR pour résister aux effets magiques et à la Corruption.',
  {type:'special',receiptFormulas:{resistanceMagieEtCorruptionDR:2}},
  '+2 DR aux Tests pour résister aux effets magiques et à la Corruption tant que le charme est porté ; version V5 de L06 p. 256 (pas de talent Résistance à la Magie comme en V4).'),
 L06('oeil-du-berger','Œil du berger','Shepherd’s Eye',256,0,'Spécial','Spécial','Instantané',
  'Un peu de matière organique d’une créature, plongée dans un bol d’eau : après avoir scruté un temps, vous apprenez où elle se trouve (le MJ décrit le lieu).',
  {type:'narrative',receiptFormulas:{minutesDeScrutation:'10 - BInitiative'}},
  'Scrutation de 10 moins le Bonus d’Initiative minutes ; le MJ décrit le lieu. Créature protégée ou hors du monde : le MJ décide de la réponse.')
];
