// Magie des prêtres elfes (Vaul, Mathlann, Hoeth), High Elf Player's Guide (L08) pp. 102-111. Lots D16, D17, D18.
// Yenlui, sacrifices de vue, de Recherche et objets : reçus et rappels du MJ (précédent des contrats elfiques existants), jamais des compteurs dédiés.
// Les « sacrifices » de la mer (Exténué, Blessures) sont payés à l'incantation : états et Blessures du lanceur automatisés.
// Conversions V4 → V5 : SL → DR, ±10 → ±1 DR, ±20 → ±2 DR, yards → mètres. Aucun ingrédient exigé. Noms français proposés (aucun officiel).
import {tradition,fact} from './helpers.mjs';
const ED='Supplément Elfe (High Elf Player’s Guide), conversion V5';
const make=(domain,type)=>(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L08',page,domain,type,ED,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const vaul=make('vaul','Magie de Vaul'),sea=make('mathlann','Magie de la mer'),hoeth=make('hoeth','Magie de Hoeth');
const FM='Force Mentale mètres',BFM='Bonus de Force Mentale',BI='Bonus d’Intelligence';
const YEN='Yenlui lumineux requis. ';
/** Option de surpuissance propre en rappel chiffré (le DR du texte anglais = SL). */
const ov=(id,cost,label,text,{yenlui=true,repeat=false}={})=>({id,label:`+${cost} DR : ${label}`,cost,repeat,kind:'reminder',reminder:(yenlui?YEN:'')+text});
const narrative=(extra={})=>({type:'narrative',...extra});
const selfFatigue=n=>({casterConditions:Array(n).fill('Exténué')});
const selfWounds=n=>({selfHarm:{clause:'Sacrifice payé à l’incantation (L08 p. 105) : '+n+' Blessure(s) perdue(s), Bonus d’Endurance non déduit.'},casterSelfDamage:n});

export const ELFIQUE_VAUL=[
 vaul('toucher-de-l-artiste','Toucher de l’artiste','Artist’s Touch',102,0,'Toucher','1 objet','Instantané',
  'Vous rendez un objet fabriqué agréable à l’œil : un objet non magique en cours de fabrication gagne la Qualité Fine ; d’autres Qualités ou Défauts peuvent encore s’y ajouter.',
  narrative(),'Artisanat : l’objet fabriqué est un rappel narratif (les Entreprises d’artisanat ne sont pas suivies). Un seul sort de Vaul d’amélioration par objet.'),
 vaul('patience-de-vaul','Patience de Vaul','Patience of Vaul',102,0,'Toucher','1 objet','Instantané',
  'Vous comprimez des heures de patience d’artisan en quelques secondes : les DR requis des Tests prolongés de fabrication sont réduits au quart, sans effet sur la qualité du produit fini.',
  narrative(),'Réduction au quart des DR requis (Entreprise d’artisanat) : appliquée par le MJ. Un seul sort de Vaul d’amélioration par objet.'),
 vaul('grace-de-vaul','Grâce de Vaul','Vaul’s Grace',102,7,'Toucher','1 objet','Instantané',
  'Vous rendez armes et armures plus élégantes et moins encombrantes : une arme ou pièce d’armure non magique en cours de fabrication gagne la Qualité Légère.',
  narrative(),'Un Test de Métier (Forge) reste nécessaire pour les autres Qualités ou Défauts d’un objet magique. Un seul sort de Vaul d’amélioration par objet.'),
 vaul('rage-de-vaul','Rage de Vaul','Vaul’s Rage',102,5,'Bonus de Force Mentale mètres','1 forge ou feu de camp (maximum)','Instantané',
  'Votre forge explose sans vous blesser : tous les autres dans le rayon reçoivent un projectile magique à Dégâts +6 qui ignore l’armure et deux états Enflammé, et tombent À Terre et Sonnés sauf Test d’Esquive réussi ; plus loin, un coup de +3 et un Enflammé.',
  {type:'magic-missile',aoe:true,missile:{damage:6,ignoreAp:true},conditions:['Enflammé','Enflammé'],failConditions:['À Terre','Sonné'],
   secondaryTest:{actor:'target',mandatory:true,skill:'Esquive',stat:'Ag',modifierSl:0,rollField:'dodgeRoll',conditionsOnly:true}},
  'Rayon de Bonus de Force Mentale mètres autour du feu : cible désignée par le MJ (le lanceur et ses outils sont intacts). Dans un rayon de 2 × Bonus de Force Mentale mètres : un coup à Dégâts +3 à une localisation au hasard et un Enflammé (anneau extérieur non suivi : rappel). Terrain inflammable : embrasé par le MJ.'),
 vaul('divination-des-flammes','Divination des flammes','Divination of Flames',102,4,'Bonus d’Initiative mètres (maximum)','1 forge ou feu de camp (maximum)','Bonus d’Intelligence heures',
  'Vous sentez l’approche d’ennemis de votre forge : vous détectez et percevez toute créature à moins de Bonus d’Intelligence mètres du feu, même cachée, sans ligne de vue ni limite de distance au feu.',
  narrative(),'Sacrifice de 1 objet fabriqué (inflammable, au moins 2 CO, détruit avant la Canalisation) : rappel, requis pour les options de surpuissance.',
  {overcastSpecific:[ov('invisible',2,'créatures invisibles détectées','Vous détectez aussi les créatures invisibles dans la zone.'),ov('remote-target',3,'cibler les créatures détectées','Vous pouvez cibler de vos sorts les créatures détectées sans ligne de vue, tant qu’elles restent à portée.')]}),
 vaul('divination-des-pierres','Divination des pierres','Divination of Stones',103,6,'Bonus d’Intelligence miles','Spécial','Bonus d’Intelligence heures',
  'Vous détectez la présence de minéraux rares pour la fabrication d’objets magiques ; le MJ décide s’il y en a à portée, et vous indiquez où creuser.',
  narrative(),'Quantité de minerai décidée par le MJ (de quoi fabriquer 1d10 Encombrement d’objets magiques) ; le minerai rare améliore la difficulté du Test de Savoir (Magie) de Très difficile (−3 DR) à Difficile (−1 DR). Sacrifice de 1 objet : rappel.',
  {overcastSpecific:[ov('ithilmar',3,'détecter l’ithilmar','En plus des autres minéraux, vous détectez l’ithilmar (gisements seulement sur l’Enclume de Vaul, en Caledor).')]}),
 vaul('feux-de-la-perfection','Feux de la perfection','Fires of Perfection',103,9,'Toucher','1 objet','Instantané',
  'Vous invoquez le perfectionnisme de Vaul pour créer un objet magique sans défaut : si l’objet magique en cours de fabrication reçoit des Défauts, Bizarreries ou Malédictions au jet, ils peuvent être ignorés.',
  narrative(),'Sacrifice : cécité (sacrifice permanent, rappel ; un lanceur déjà aveugle accède aux options). Règles de fabrication magique : Archives of the Empire 2, p. 54.',
  {overcastSpecific:[ov('another-spell',5,'un autre sort de Vaul sur l’objet','Un autre sort de fabrication de Vaul peut être lancé sur le même objet, sans les restrictions aux objets non magiques.')]}),
 vaul('sagesse-de-l-acier-du-ciel','Sagesse de l’acier du ciel','Wisdom of the Skysteel',103,11,'Toucher','1 objet','1 Entreprise',
  'Vous débloquez la technique divine de forge d’objets non magiques en ithilmar : vous pouvez en fabriquer lors d’une Entreprise d’artisanat, avec le minerai requis ; l’Encombrement des Trappings d’ithilmar est réduit de 2 (minimum 0).',
  narrative(),'Sacrifice : cécité (rappel). Durée : une Entreprise d’artisanat (non suivie).',
  {overcastSpecific:[ov('brittle',4,'fragiliser un objet d’ithilmar','Vous rendez instantanément un objet d’ithilmar cassant comme du bois sec ; votre état de Yenlui bascule vers Sombre (reçu du MJ).'),ov('magic-ithilmar',6,'objet magique d’ithilmar','Vous fabriquez un objet magique d’ithilmar (Archives of the Empire 2, p. 54), sans autre sort de Vaul ; progrès possible seulement pendant la durée du sort.')]}),
 vaul('forteresse-de-hotek','Forteresse de Hotek','Fortress of Hotek',103,14,'Bonus de Force Mentale mètres','1 salle de forge ou bâtiment (maximum)','Bonus de Force Mentale heures',
  'Vous entourez votre forge de défenses magiques : la salle ou le bâtiment reçoit une défense au choix : barrière de flammes, armure magique, protection contre le métal, ou portes renforcées.',
  narrative({facts:[fact('defence','Forteresse de Hotek : défense choisie','select',{options:[['flame','Barrière de flammes (sort Mur de feu)'],['armour','Armure magique à l’intérieur (Robe scintillante)'],['metal','Protection contre le métal (Creuset de Chamon)'],['doors','Portes renforcées (Endurance 5 / 15 Blessures ; portes renforcées équivalentes à des portails 10 / 30)']]})]}),
  'Sacrifice : cécité (rappel). Les sorts cités (Firewall, Glittering Robe, Crucible of Chamon) sont ceux du livre de base V4 : leurs effets sont joués par le MJ avec les contrats V5 correspondants. Les portails ne sont endommagés que par des machines de siège. Défense choisie : fait de scène, aucun suivi.',
  {overcastSpecific:[ov('extra-defence',2,'une défense supplémentaire','Une défense de plus de la liste, par palier.',{repeat:true})]})
];

export const ELFIQUE_MER=[
 sea('lien-aux-poissons','Lien aux poissons','Fishbonding',106,0,FM,'1','Force Mentale minutes',
  'Vous vous liez d’amitié avec un poisson non magique et non prédateur de toute Taille : les créatures hostiles deviennent neutres, les neutres amicales et vous protègent ; une créature amicale peut être montée.',
  narrative(),'Tout poisson qui n’attaquerait normalement pas un Elfe est non prédateur. Le sort ne permet pas de communiquer. Les attitudes sont jouées par le MJ.'),
 sea('sens-de-la-tempete','Sens de la tempête','Stormsense',106,0,'Initiative miles','Spécial','Instantané',
  'Vous connaissez toutes les tempêtes proches : direction et vitesse, intensité, formation ou dissipation, durée, et leur nature magique éventuelle.',
  narrative(),'Information donnée par le MJ.'),
 sea('furie-de-l-ocean','Furie de l’océan','Ocean’s Fury',106,8,'Vous','ZdE Bonus de Force Mentale miles','3 × Bonus de Force Mentale minutes',
  'Vous faites naître une tempête dans la région : vent de Coup de vent pendant Bonus de Force Mentale minutes, puis Fort coup de vent, puis Tempête violente pour le reste de la durée ; elle n’est pas magique et ne peut être dissipée.',
  narrative(),'Intensités de vent : Sea of Claws p. 107, jouées par le MJ (aucun suivi de météo).'),
 sea('esprits-des-vagues','Esprits des vagues','Spirits of the Waves',106,5,'2 × Sociabilité mètres','ZdE 2 × Bonus de Sociabilité mètres','Bonus de Sociabilité minutes',
  'Vous invoquez un puissant élémentaire de vent né des courants océaniques : un cyclone tourbillonnant d’esprits des vagues, que vous déplacez de 2d10 mètres par Round en vous concentrant, sinon il se déplace comme un vortex aléatoire.',
  narrative(),'Un navire frappé par l’élémentaire subit un Critique au gréement (Sea of Claws p. 118) ; à moins de 50 mètres, Visibilité améliorée d’un niveau et vent diminué d’un niveau. Un élémentaire de plus par +3 DR. Vortex aléatoire : Winds of Magic p. 21, jeté par le MJ.',
  {overcastSpecific:[ov('extra-elemental',3,'un élémentaire de plus','Un élémentaire supplémentaire.',{yenlui:false,repeat:true})]}),
 sea('armure-de-mathlann','Armure de Mathlann','Armour of Mathlann',106,10,FM,'1 bateau ou navire','Force Mentale minutes',
  'Vous enveloppez la coque d’un navire à un mât d’un voile de magie protectrice : le navire gagne le Trait Armure 2 sans pénalité de poids ; gréement et équipage ne sont pas protégés.',
  narrative(selfFatigue(2)),'Sacrifice payé à l’incantation : 2 états Exténué pour le lanceur. Règles de navire : Sea of Claws p. 97 (joué par le MJ).',
  {overcastSpecific:[ov('larger',2,'un navire plus grand','Un mât de plus en taille de navire, par palier.',{repeat:true}),ov('armour-3',4,'Armure 3','Le navire gagne le Trait Armure 3 au lieu de 2.'),ov('missile-cover',6,'gréement et équipage protégés','Contre les tirs, le gréement et l’équipage sont aussi protégés.')]}),
 sea('appel-des-mers','Appel des mers','Call of the Seas',106,14,FM,'Spécial','Bonus de Force Mentale Rounds',
  'Vous invoquez un Merwyrm (Sea of Claws p. 145) : il met un Round entier à émerger, vous ne le contrôlez ni ne lui parlez ; il compte comme un poisson non prédateur neutre pour Lien aux poissons, puis replonge à la fin du sort.',
  narrative({...selfFatigue(2),...selfWounds(2)}),'Sacrifices payés à l’incantation : 2 états Exténué et 2 Blessures pour le lanceur. Profil du Merwyrm : participant à créer par le MJ (bestiaire : phase E).',
  {overcastSpecific:[ov('friendly',5,'Merwyrm amical','Le Merwyrm compte comme amical, comme avec Lien aux poissons.'),ov('stays',8,'le Merwyrm reste','Le Merwyrm ne retourne pas aux profondeurs à la fin du sort ; votre état de Yenlui bascule vers Sombre (reçu du MJ).')]}),
 sea('manteau-de-mathlann','Manteau de Mathlann','Cloak of Mathlann',107,11,FM,'1 bateau ou navire','Force Mentale minutes',
  'Vous drapez un navire à un mât et son équipage dans un épais manteau de brume marine : les Tests pour le percevoir ou le viser à distance subissent −3 DR.',
  narrative({...selfFatigue(2),...selfWounds(1)}),'Sacrifices payés à l’incantation : 2 états Exténué et 1 Blessure. Le sillage et les remous dans la brume restent visibles (Perception Intermédiaire +0 DR). Arches noires et monstres marins ne peuvent être cachés.',
  {overcastSpecific:[ov('larger',2,'un navire plus grand','Un mât de plus en taille de navire, par palier.',{repeat:true}),ov('black-arks',8,'arches noires et monstres marins','Les arches noires et les monstres marins peuvent être cachés ; votre état de Yenlui bascule vers Sombre (reçu du MJ).')]}),
 sea('maitresse-des-profondeurs','Maîtresse des profondeurs','Mistress of the Deep',107,9,'Sociabilité mètres','Spécial','Bonus de Sociabilité Rounds',
  'Vous invoquez l’une des jeunes filles des eaux de Mathlann pour distraire vos ennemis : chaque Round, les personnages à moins de 20 mètres de l’Océanide chantant réussissent un Test de Calme Difficile (−1 DR) ou sont envoûtés, ne pouvant que s’approcher d’elle, sans défense.',
  narrative({...selfFatigue(1),...selfWounds(1)}),'Sacrifices payés à l’incantation : 1 état Exténué et 1 Blessure pour le lanceur. Profil de l’Océanide : Naïade (Death on the Reik Companion p. 88, recommandée), Syrène (Sea of Claws p. 145) ou Sirène (Imperial Zoo p. 86) : participant à créer par le MJ (phase E). L’Océanide ne bouge ni n’attaque, et s’éloigne à la fin.',
  {overcastSpecific:[ov('immune',5,'insensible à l’appel','Vous n’êtes pas affecté par l’appel de l’Océanide.'),ov('move',3,'Océanide mobile','Vous pouvez lui ordonner de se déplacer (Mouvement 6) sans attaquer.')]}),
 sea('poumons-d-eau','Poumons d’eau','Waterlungs',107,7,FM,'1','Bonus de Force Mentale heures',
  'Vous permettez à la cible de respirer sous l’eau comme à l’air libre.',
  {type:'special',...selfFatigue(1),specialState:{assistedReminder:'La cible respire sous l’eau comme à l’air libre pendant la durée (Noyade et Suffocation suspendues dans l’eau).'}},
  'Sacrifice payé à l’incantation : 1 état Exténué. Noyade et Suffocation : V5 p. 181, jouées par le MJ.',
  {overcastSpecific:[ov('senses',4,'sens sous l’eau','Vue, ouïe et odorat de la cible fonctionnent sous l’eau comme dans l’air.'),ov('drawn',4,'cible attirée par l’eau','Dans l’air, la cible subit Noyade et Suffocation ; elle se sent attirée par l’eau et n’a besoin que d’un seau pour respirer ; votre état de Yenlui bascule vers Sombre (reçu du MJ).')]}),
 sea('brumes-grouillantes','Brumes grouillantes','Writhing Mists',107,6,FM,'ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes',
  'Vous appelez une brume salée pour dissimuler vos alliés : les tirs contre les alliés de la zone subissent −2 DR pour toucher ; leurs Tests de Discrétion gagnent +2 DR ; qui sort de la zone perd sa protection. La brume ne bouge pas et se dissipe si vous cessez de vous concentrer.',
  {type:'test-modifiers',aoe:true,targetRule:{alliesOnly:true},testModifiers:{'Discrétion':2},...selfFatigue(1)},
  'Sacrifice payé à l’incantation : 1 état Exténué. Les tirs contre les alliés de la zone subissent −2 DR (malus de tir à appliquer par le MJ, le moteur ne le pose pas sur la cible). Fin du sort : si le lanceur cesse de se concentrer.',
  {overcastSpecific:[ov('moving',3,'brume mobile','Vous pouvez déplacer la zone de Bonus de Force Mentale mètres à chaque Round.'),ov('fear',3,'Peur 1 pour les alliés','La brume confère le Trait Peur (1) aux alliés de la zone.')]})
];

const RECH='Sacrifice : Test de Recherche prolongé (rappel, voir ci-dessous).';
export const ELFIQUE_HOETH=[
 hoeth('calame-divin','Calame divin','Divine Stylus',110,0,'Vous','Vous','Bonus de Force Mentale minutes',
  'Votre doigt trace des caractères de lumière dans toute langue que vous connaissez, sans images ; sur une surface solide ou en l’air, éclairant comme une chandelle, pendant Bonus de Force Mentale heures.',
  narrative(),'Les caractères durent Bonus de Force Mentale heures : rappel narratif.'),
 hoeth('illumination','Illumination','Enlightenment',110,0,'Bonus de Force Mentale mètres','1 animal','Bonus d’Intelligence minutes',
  'Vous emplissez un animal de la sagesse de Hoeth : il gagne +20 Intelligence et Force Mentale et perd les Traits Bestial et Craintif ; il comprend et communique des concepts plus complexes, sans toujours se souvenir de tout après le sort.',
  {type:'special',statModifiers:{Int:20,FM:20},specialState:{assistedReminder:'L’animal perd les Traits Bestial et Craintif pendant la durée (à retirer et rétablir par le MJ).'}},
  'Les Traits perdus sont rendus à la fin du sort par le MJ ; le moteur applique seulement +20 Intelligence et Force Mentale.'),
 hoeth('apercu-arcanique','Aperçu arcanique','Arcane Insight',110,8,'Toucher','1 objet','Instantané',
  'Vous apprenez les propriétés magiques d’un objet ou artefact : capacités, malédictions et entités liées (élémentaires, démons, esprits) ; sur un Test d’Intelligence Intermédiaire (+0 DR) réussi, vous apprenez comment il a été fabriqué.',
  narrative(),'Les DR du Test révèlent des informations sur le créateur (MJ). Réparer ou dupliquer un artefact puissant peut exiger un Test d’Intelligence prolongé sur plusieurs incantations.'),
 hoeth('grand-lien-spirituel','Grand lien spirituel','Greater Spirit Bond',110,4,'Vous','Spécial','Bonus de Force Mentale minutes',
  'Vous établissez un contact à longue distance avec un Familier animal (si vous en avez un) : la portée de 4 mètres de ses Traits Télépathie animale et Compagnon passe à Force Mentale miles ; le familier ne peut pas aider vos incantations par ce lien.',
  narrative(),'Familiers : règles de Archives of the Empire 3 pp. 81-82 (voir `CONCEPTION_FAMILIERS.md`) ; le lien familier/maître n’est pas encore modélisé (D11 bloqué sur la phase E), le sort est un rappel.'),
 hoeth('creuset-de-lumiere','Creuset de lumière','Crucible of Light',110,6,'Toucher','1 épée','Bonus d’Intelligence minutes',
  'Vous imprégnez une épée de l’essence de Hoeth : elle compte comme magique et gagne la Qualité Rapide.',
  narrative(),RECH+' Sacrifice : Test de Recherche prolongé Difficile (−1 DR) jusqu’à 10 DR de total, à passer dans la semaine précédente (sinon Très difficile −3 DR sur place) pour accéder aux options. Épée : objet désigné par le MJ.',
  {overcastSpecific:[ov('quality',3,'Défensive ou Précise','L’épée peut recevoir la Qualité Défensive ou Précise.'),ov('mind',5,'épée pensante','Le porteur gagne 1 rang de Conscience du combat, Frappe de réaction et Riposte.'),ov('permanent',7,'Qualités permanentes','Si le sort est lancé pendant la forge, les Qualités deviennent permanentes ; une seule tentative par épée.')]}),
 hoeth('maitrise-mnemonique','Maîtrise mnémonique','Mnemonic Control',110,6,'Bonus de Force Mentale mètres','1','Instantané',
  'Vous puisez dans l’inconscient pour faire ressurgir des souvenirs enfouis : le prochain Test de Savoir ou de Langue non magique de la cible réussit automatiquement avec un DR égal à votre Test d’incantation.',
  narrative(),RECH+' Sacrifice : Test de Recherche prolongé Difficile (−1 DR) jusqu’à 10 DR. Il doit exister une explication en jeu à l’exposition au savoir visé.',
  {overcastSpecific:[ov('casting',2,'réussite automatique à l’incantation','La cible peut utiliser la réussite automatique pour son prochain Test d’incantation.'),ov('erase',3,'effacer un souvenir','Le sort peut effacer un souvenir précis de la cible (jamais compétences ni sorts).')]}),
 hoeth('envoi-psychique','Envoi psychique','Psychic Sending',111,7,'Force Mentale miles','1','Instantané',
  'Vous transmettez mentalement un message verbal à longue distance : le destinataire doit être quelqu’un que vous avez déjà rencontré ou avec qui vous avez correspondu ; message d’une minute au plus, entendu dans votre voix.',
  narrative(),RECH+' Sacrifice : Test de Recherche prolongé Difficile (−1 DR) jusqu’à 10 DR.',
  {overcastSpecific:[ov('image',3,'image mentale','Vous pouvez transmettre une image mentale avec le message.'),ov('stranger',4,'un inconnu','Vous pouvez communiquer avec un inconnu dont vous connaissez le nom complet.')]}),
 hoeth('faconnage-d-ame','Façonnage d’âme','Soulcraft',111,10,'Bonus de Force Mentale mètres','1 Fantôme','Instantané',
  'Vous liez un Fantôme à une pierre-vent ou à une ligne de force, tous deux à portée ; un mortel mort depuis moins d’une heure peut voir son fantôme lié avant qu’il ne parte vers le royaume des esprits. Un fantôme réticent oppose son Calme à votre Test d’incantation.',
  narrative(),'Opposition : le NI du sort augmente de 1 par DR obtenu par le fantôme (jeu par le MJ). Pierre-vent et ligne de force : objets de scène.'),
 hoeth('sceaux-sacres','Sceaux sacrés','Sacred Wards',111,11,'Toucher','ZdE Bonus d’Intelligence mètres','Bonus d’Intelligence heures',
  'Vous jetez des enchantements protecteurs sur une zone, un mot de passe pouvant exempter des cibles : oubli des 24 dernières heures, pureté (dégâts égaux à mutations × 6, démons interdits), surveillance, ou vérité (aucun mensonge).',
  {type:'special',aoe:true,facts:[fact('ward','Sceaux sacrés : effet choisi','select',{options:[['forgetfulness','Oubli : souvenirs des dernières 24 heures perdus'],['purity','Pureté : (mutations × 6) dégâts ignorant Endurance et armure ; démons interdits'],['surveillance','Surveillance : le lanceur voit la zone en y consacrant un Round'],['truthfulness','Vérité : aucun mensonge ne peut être prononcé']]})],
   factModes:{fact:'ward',values:{forgetfulness:{specialState:{assistedReminder:'Oubli : quiconque entre dans la zone perd ses souvenirs des dernières 24 heures (joué par le MJ).'}},purity:{specialState:{assistedReminder:'Pureté : quiconque entre subit (nombre de mutations × 6) dégâts ignorant Bonus d’Endurance et Points d’Armure ; les démons ne peuvent pas entrer.'}},surveillance:{specialState:{assistedReminder:'Surveillance : vous voyez l’intérieur de la zone en consacrant un Round à vous concentrer.'}},truthfulness:{specialState:{assistedReminder:'Vérité : aucun mensonge ne peut être prononcé dans la zone.'}}}}},
  RECH+' Sacrifice : Test de Recherche prolongé Difficile (−1 DR) jusqu’à 20 DR. Ne peut être lancé qu’une fois sur une zone donnée ; renouvelable avant l’expiration par un Test d’incantation de NI 0 (même zone, durée et effets). Un mot de passe désigné exempte des cibles.',
  {overcastSpecific:[ov('weeks',6,'durée en semaines','La durée peut passer à Bonus d’Intelligence semaines.')]}),
 hoeth('les-mots-premiers','Les Mots premiers','The Primary Words',111,15,'Vous','Vous','Bonus d’Intelligence heures',
  'Vous invoquez un langage mystique antérieur à l’arrivée des Anciens : vous communiquez à un niveau élémentaire avec toute créature mortelle ou animal ; les concepts avancés peuvent exiger un Test d’Intelligence de l’un ou des deux interlocuteurs.',
  narrative(),RECH+' Sacrifice : Test de Recherche prolongé Très difficile (−2 DR) jusqu’à 20 DR. Pour les témoins, l’échange sonne comme du charabia sauf s’ils connaissent l’Anoqeyån (Langue (Magick) Accessible +2 DR pour en saisir l’essentiel).',
  {overcastSpecific:[ov('elders',2,'espèces antérieures aux Anciens','Communication avancée avec les espèces antérieures aux Anciens (Dragons, Grands Aigles, Fimirs, la plupart des animaux).'),ov('spirits',4,'esprits, élémentaires, démons','Communication élémentaire avec tout esprit, élémentaire ou démon.')]})
];
