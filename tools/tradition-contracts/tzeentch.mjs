// Domaine de Tzeentch, livre de base V5 p. 260. Lot D9.
// Attribut du Domaine (Test de Corruption par cible : échec +1 Point de Corruption, réussite +1 Point de Chance) : v5-magic-attributes.js.
import {tradition,fact} from './helpers.mjs';
const DOMAINE='tzeentch',TYPE='Domaine de Tzeentch',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});

export const TZEENTCH=[
 L06('don-de-tzeentch','Don de Tzeentch','Boon of Tzeentch',260,9,'Vous','Vous','Bonus d’Intelligence jours',
  'Le Changeur des Voies tord votre esprit et vous ouvre un savoir arcanique : choisissez un sort de n’importe quel Domaine, que vous pouvez lancer comme si vous l’aviez mémorisé, sans pouvoir le consigner dans un grimoire.',
  {type:'special',facts:[fact('boonSpell','Don de Tzeentch : sort choisi (n’importe quel Domaine)','contractSpell')],
   specialState:{assistedReminder:'Le sort choisi se lance comme s’il était mémorisé, sans pouvoir être transcrit dans un grimoire. S’il faut canaliser, Canalisation (Dhar) ou la Canalisation du sort si vous la possédez. Une Incantation Imparfaite sur ce sort chasse le Don de votre esprit (fin du sort), et l’efface de votre grimoire s’il avait pu s’y inscrire.'}},
  'Le sort choisi est vérifié parmi les contrats existants, mais le moteur ne le rend pas lançable en dehors de vos sorts mémorisés : lancez-le comme un sort connu et dites au MJ qu’il vient du Don. Fin du Don sur Incantation Imparfaite : à déclarer par le MJ.'),
 L06('transformation-de-tzeentch','Transformation de Tzeentch','Transformation of Tzeentch',260,12,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds',
  'Des liens de feu éthérique jaillissent de la terre et enveloppent la cible dans un cocon d’énergie magique : elle est À Terre et sans défense pendant la durée, et à la fin de chaque Round, Test d’Endurance Intermédiaire (+0 DR) ou +1 Point de Corruption.',
  {type:'condition',conditions:['À Terre'],roundEffect:{phase:'endOfRound',test:{skill:'Endurance',stat:'E',modifierSl:0},failCorruption:1,testReminder:'Échec : +1 Point de Corruption.'}},
  'La cible est considérée sans défense pour les attaques contre elle (aucun état Impuissante dans le moteur : lu comme « cible sans défense », vérifié par le MJ) ; elle reste À Terre. Le Test d’Endurance de chaque fin de Round est saisi ; échec : Point de Corruption ajouté au compteur de la cible.'),
 L06('trahison-de-tzeentch','Trahison de Tzeentch','Treason of Tzeentch',260,6,'Force Mentale mètres','ZdE Bonus d’Initiative mètres','Bonus d’Intelligence Rounds',
  'Vous glissez de fins filaments de pensées traîtresses dans l’esprit des cibles : Animosité (Alliés) ; sauf immunité, elles ne transfèrent plus d’Avantage à leurs alliés et, sur un Critique en attaque, Calme Difficile (−2 DR) ou elles visent l’allié le plus proche.',
  {type:'traits',aoe:true,traits:['Animosité (Alliés)'],triggered:{event:'critical-attack',test:{skill:'Calme',stat:'FM',modifierSl:-2},testOnly:true}},
  'Aucun transfert d’Avantage vers leurs alliés pendant la durée (sauf cible immunisée à Animosité), à appliquer par le MJ. Critique obtenu en attaquant : Test de Calme Difficile (−2 DR) saisi ; échec : la cible attaque l’allié le plus proche.')
];
