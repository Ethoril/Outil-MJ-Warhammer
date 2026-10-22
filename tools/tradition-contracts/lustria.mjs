// Haute Magie de Lustria (L07 pp. 128-129) : quatre sorts nouveaux (dont trois réservés aux Slann) et quatre extensions Slann de contrats elfiques existants. Lot D15.
// Les contrats elfiques ne sont jamais remplacés : chaque variante est un contrat distinct « (Slann) » qui ajoute des options de surpuissance propres aux Slann.
// Conversions V4 → V5 : SL → DR, Hard (−20) → −2 DR, Very Hard (−30) → −3 DR, Average (+20) → +2 DR, Challenging (+0) → Intermédiaire +0 DR, yards → mètres. Méditations (p. 129) : ni sorts ni rituels, exclues.
import {tradition,fact} from './helpers.mjs';
const DOMAINE='high',TYPE='Haute Magie',ED='Supplément V4 (Lustria), conversion V5';
const L07=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L07',page,DOMAINE,TYPE,ED,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const variant=(slug,name,canonical,variantOf,page,description,assisted,addOvercastSpecific)=>({slug,name,canonical,canonicalName:canonical,book:'L07',page,edition:ED,variantOf,description,assisted:[assisted],addOvercastSpecific});
const reminder=(id,label,cost,text,repeat=false)=>({id,label,cost,repeat,kind:'reminder',reminder:text});

export const LUSTRIA=[
 L07('deracinement-des-montagnes','Déracinement des montagnes','Uproot the Mountains',128,8,'Ligne de vue','1','1 Round',
  'Vous faites trembler une colline ou une montagne : ceux qui s’y trouvent réussissent un Test d’Athlétisme Très difficile (−3 DR) au début de leur Round, sinon ils ne peuvent ni agir ni se déplacer et tombent À Terre.',
  {type:'special',aoe:true,secondaryTest:{actor:'target',mandatory:true,skill:'Athlétisme',stat:'Ag',modifierSl:-3,rollField:'resistanceRoll',failCondition:'À Terre'}},
  'Créatures sur le relief désignées par le MJ ; échec : ni action ni déplacement ce Round (rappel) et À Terre. Chaque Round de durée ajouté par surpuissance : la colline peut être déplacée de Bonus de Force Mentale mètres, les créatures sur sa trajectoire réussissent un Test d’Athlétisme Accessible (+2 DR) ou subissent 10 dégâts à une localisation de corps au hasard (jets joués par le MJ).',
  {overcastSpecific:[reminder('avalanche','+5 DR : avalanche',5,'Avalanche : les créatures sur la trajectoire des rochers réussissent un Test d’Esquive Intermédiaire (+0 DR) ou subissent 15 dégâts à une localisation de corps au hasard.')]}),
 L07('ligne-de-terre','Ligne de terre','Earth Line',129,10,'Ligne de vue','Spécial','Instantané',
  'Le Slann fait déferler les énergies de la terre le long d’une ligne de force géomantique : quiconque s’y trouve réussit un Test d’Endurance Difficile (−2 DR) ou subit 15 dégâts au corps (Bonus d’Endurance déduit, Points d’Armure ignorés).',
  {type:'damage',aoe:true,damage:{formula:'15',ignoreAp:true},secondaryTest:{actor:'target',mandatory:true,skill:'Endurance',stat:'E',modifierSl:-2,rollField:'resistanceRoll'},facts:[fact('nexusNear','Ligne de terre : nexus ou ligne de force géomantique à moins de Bonus de Force Mentale miles','boolean',{expected:true})]},
  'Slann seulement. La vague peut être envoyée dans la direction choisie jusqu’au nexus suivant ; les créatures sur la ligne sont désignées par le MJ.',
  {overcastSpecific:[reminder('bridge','+4 DR : pont sur l’eau',4,'Pont sur une eau de toute profondeur (eaux écartées ou chaussée de terre) : 8 mètres de large, longueur libre le long de la ligne, Bonus de Force Mentale heures, indissipable.'),reminder('path','+6 DR : chemin dans la jungle',6,'Chemin de 8 mètres de large le long de la ligne : les arbres sont rejetés de côté.')]}),
 L07('ruine-des-cites','Ruine des cités','Ruination of Cities',129,12,'Ligne de vue','1 bâtiment','Instantané',
  'Le Slann fait s’effondrer un bâtiment, un mur ou un pont non fortifié, réduit en gravats (terrain Difficile) ; ceux qui s’y trouvent réussissent un Test d’Esquive Difficile (−2 DR) ou subissent 20 dégâts au corps et sont ensevelis.',
  {type:'damage',aoe:true,damage:{formula:'20',location:'Corps'},secondaryTest:{actor:'target',mandatory:true,skill:'Esquive',stat:'Ag',modifierSl:-2,rollField:'dodgeRoll'},
   facts:[fact('structure','Ruine des cités : structure visée','select',{options:[['unfortified','Bâtiment, mur ou pont non fortifié'],['fortified','Structure fortifiée (château, tour) : exige +6 DR de surpuissance']]})],
   factModes:{fact:'structure',values:{unfortified:{},fortified:{requiresSpecificOption:'fortified'}}}},
  'Slann seulement. Ensevelis : Suffocation (V5 p. 181, jouée par le MJ). Cibles supplémentaires (surpuissance) : les plus proches de la première ; le sol entre elles s’ouvre en crevasse de 2 mètres sur 4 de profondeur, dégâts de chute après un Test d’Esquive Intermédiaire (+0 DR) (échec marginal : accroché au bord).',
  {overcastSpecific:[reminder('fortified','+6 DR : structure fortifiée',6,'La cible peut être une structure fortifiée (mur de château, tour).')]}),
 L07('deflagration-mentale','Déflagration mentale','Mental Blast',129,7,'Ligne de vue','ZdE Bonus de Force Mentale mètres','Instantané',
  'Le Slann dirige une explosion d’énergie mentale contre ses ennemis : Dégâts égaux à son Bonus d’Intelligence + 6 (+6 contre Démoniaques et Morts-vivants), Bonus d’Endurance déduit mais pas l’armure ; Test d’Intelligence Accessible (+2 DR) ou Sonné.',
  {type:'damage',aoe:true,damage:{formula:'BIntelligence+6',ignoreAp:true,daemonBonus:6,undeadBonus:6},targetRule:{enemiesOnly:true},failConditions:['Sonné'],
   secondaryTest:{actor:'target',mandatory:true,skill:'Intelligence',stat:'Int',modifierSl:2,rollField:'resistanceRoll',conditionsOnly:true}},
  'Slann seulement. Ennemis de la zone seulement.',
  {overcastSpecific:[reminder('itza','+6 DR : « La Délivrance d’Itza »',6,'Diamètre de la cible porté à ZdE moitié de la Force Mentale en mètres, centrée sur le lanceur ; la zone peut encore s’agrandir par surpuissance.'),reminder('leveller','+9 DR : « Le Grand Niveleur »',9,'Le Slann sacrifie sa vie : tous les ennemis en surnombre en ligne de vue meurent, jusqu’à égaler le nombre des alliés du Slann (on retire d’abord les Intelligences les plus basses). Seul un Point de Destin évite la mort instantanée d’un personnage.')]}),
 variant('apotheose-slann','Apothéose (Slann)','Apotheosis (Slann)','Apothéose',128,
  'Extension de l’Apothéose (version de Lustria) : pour un Slann, chaque +2 DR de surpuissance ajoute 1 au rang de Peur de la cible.',
  'Option réservée aux Slann (L07 p. 128). Le contrat elfique « Apothéose » reste inchangé. Soins : un palier de +3 DR ajoute Bonus de Force Mentale Blessures, +6 DR permet de soigner une Blessure Critique (déjà dans le contrat de base).',
  [reminder('slann-fear','Slann, +2 DR : Peur +1',2,'Slann seulement : le rang du Trait Peur de la cible augmente de 1.',true)]),
 variant('destruction-des-arcanes-slann','Destruction des Arcanes (Slann)','Arcane Unforging (Slann)','Destruction des Arcanes',128,
  'Extension de Désassemblage arcanique (version de Lustria) : pour un Slann, chaque +5 DR permet une tentative de destruction supplémentaire contre un objet magique tiré au hasard.',
  'Option réservée aux Slann (L07 p. 128). Le contrat elfique reste inchangé.',
  [reminder('slann-unforge','Slann, +5 DR : une destruction de plus',5,'Slann seulement : un autre jet de destruction contre un objet magique tiré au hasard.',true)]),
 variant('drain-de-magie-slann','Drain de Magie (Slann)','Drain Magic (Slann)','Drain de Magie',128,
  'Extension du Drain de Magie (version de Lustria) : pour un Slann, chaque +4 DR draine de la magie environnementale dans la zone.',
  'Option réservée aux Slann (L07 p. 128 ; Winds of Magic p. 189) : chaque palier désature un nexus de ligne de force ou réduit la saturation environnementale d’un niveau. Le contrat elfique reste inchangé.',
  [reminder('slann-drain','Slann, +4 DR : drainer la magie environnementale',4,'Slann seulement : chaque palier désature un nexus de ligne de force ou réduit la saturation de 1 niveau.',true)]),
 variant('chemin-entre-les-mondes-slann','Chemin entre les Mondes (Slann)','Walk Between Worlds (Slann)','Chemin entre les Mondes',128,
  'Extension du Chemin entre les Mondes (version de Lustria) : pour un Slann, +4 DR permet aux cibles, sur un nexus géomantique, de suivre les Voies des Anciens vers un autre nexus.',
  'Option réservée aux Slann (L07 p. 128) : le Slann choisit le nexus d’arrivée, sans limite de distance. Le contrat elfique reste inchangé (+8 DR pour les Elfes).',
  [reminder('slann-nexus','Slann, +4 DR : Voies des Anciens',4,'Slann seulement : les cibles sur un nexus géomantique arrivent à un autre nexus choisi par le lanceur.')])
];
