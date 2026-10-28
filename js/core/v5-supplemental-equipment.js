import { previewV5Test, selectV5Test } from './v5-roll.js';

/** F2-F: additional clauses for equipment described in supplements.
 * The equipment sheet remains authoritative for every printed profile value.
 */
const RULES = Object.freeze({
  'F-L11-0013': { kind: 'corruption', influence: 'minor', skillModifier: 2, label: 'Mitrailleuse Ratling' },
  'F-L11-0014': { kind: 'warp-blade', label: 'Warp Blade' },
  'F-L11-0016': { kind: 'corruption', influence: 'moderate', label: 'Lance-feu à malepierre' },
  'F-L11-0017': { kind: 'corruption', influence: 'minor', label: 'Jezzail à malepierre' },
  'F-L11-0018': { kind: 'corruption', influence: 'minor', label: 'Pistolet à malepierre' },
  'F-L11-0076': { kind: 'poison', resistanceDR: -1, label: 'Dague funeste' },
  'F-L11-0078': { kind: 'antler-hilt', label: 'Lame à poignée de bois tombé' },
  'F-L11-0079': { kind: 'antler-hilt', label: 'Lame à poignée de bois arraché' },
  'F-L11-0081': { kind: 'encumbrance-reduction', amount: 1, label: 'Plate de léviathan' },
  'F-L11-0083': { kind: 'bleeding-on-wound', label: 'Pointes de dragon écharde' },
  'F-L13-0086': { kind: 'pavise-carried', protection: 3, damageFormula: 'BF+2', label: 'Pavois porté' },
  'F-L13-0087': { kind: 'pavise-planted', protection: 5, setupActions: 2, label: 'Pavois planté' },
  'F-L22-0139': { kind: 'warpstone-critical', influence: 'minor', penetrating: true, label: 'Brise-os, éclat de malepierre' },
  'F-L24-0008': { kind: 'felid-wound-disguise', label: 'Griffes du tigre' },
  'F-L06-1104': { kind: 'enchanted-staff', label: 'Bâton enchanté' },
  'F-L06-1105': { kind: 'wizard-robes', label: 'Robes de sorcier' },
  'F-L06-1134': { kind: 'printed-damage', label: 'Dégâts imprimés de créature' }
});
export const F2_F_RULE_IDS = Object.freeze(Object.keys(RULES));

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const itemRuleId = item => {
  if (RULES[item?.supplementalRuleId]) return item.supplementalRuleId;
  const id = String(item?.id || item?.baseId || '');
  const name = fold(item?.name || item?.nom || id);
  if (/mitrailleuse ratling|ratling cannon/.test(name)) return 'F-L11-0013';
  if (/lance feu.*malepierre|warpfire thrower/.test(name)) return 'F-L11-0016';
  if (/jezzail.*malepierre|warplock jezzail/.test(name)) return 'F-L11-0017';
  if (/pistolet.*malepierre|warplock pistol|warp pistol/.test(name)) return 'F-L11-0018';
  if (/lame.*bois tombe|antler hilted blade|antler hilt|fallen antler/.test(name)) return 'F-L11-0078';
  if (/lame.*bois arrache|antler.*violently|violently.*antler/.test(name)) return 'F-L11-0079';
  if (/plate.*leviathan|leviathan.*plate/.test(name)) return 'F-L11-0081';
  if (/pointes.*dragon|shard tips/.test(name)) return 'F-L11-0083';
  if (/pavois|pavise/.test(name)) return item?.v5?.planted === true ? 'F-L13-0087' : 'F-L13-0086';
  if (/brise os|krag breaker|rat ogre bonebreaker|warpstone shard/.test(name)) return 'F-L22-0139';
  if (/griffes.*tigre|tiger claws/.test(name)) return 'F-L24-0008';
  if (/dague funeste|doom dagger|fell dagger/.test(name)) return 'F-L11-0076';
  if (/baton.*enchant|enchanted staff/.test(name)) return 'F-L06-1104';
  if (/robe.*sorcier|wizard s robes|wizard robe/.test(name)) return 'F-L06-1105';
  if (/warp blade|lame de malepierre/.test(name) || id.toLowerCase().includes('warp-blade')) return 'F-L11-0014';
  return null;
};

export function effectiveSupplementalEncumbrance(item, metalEquivalentEncumbrance) {
  const ruleId = itemRuleId(item);
  const value = Number(metalEquivalentEncumbrance);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return Math.max(0, value - (RULES[ruleId]?.kind === 'encumbrance-reduction' ? 1 : 0));
}

/**
 * Resolve the supplement clause for one linked item. This function never edits
 * catalogue data and never invents a secondary roll or a GM decision.
 */
export function previewSupplementalEquipment({ item, actor, target, hit = false, damage = null, critical = null, context = {}, spell = null, used = false } = {}) {
  const ruleId = itemRuleId(item);
  if (!ruleId) return null;
  const rule = RULES[ruleId];
  const hurt = Number(damage?.finalDamage) > 0;
  const exposure = (rule.kind === 'corruption' && hit && hurt || rule.kind === 'warpstone-critical' && hit && hurt && critical) ? {
    sourceRuleId: ruleId, source: rule.label, participantId: target?.id || null,
    influence: rule.influence, skillModifier: rule.skillModifier || 0,
    thresholdTestRequired: true, status: 'needs-corruption-test'
  } : null;
  const effects = [];
  const unresolved = [];
  const reminders = [];
  const casting = { focusSL: 0 };
  let weaponDispositionUpdate = null;
  if (exposure) reminders.push(`${rule.label} : Test de Corruption ${rule.influence === 'moderate' ? 'modérée' : 'mineure'}${rule.skillModifier ? ` (${rule.skillModifier > 0 ? '+' : ''}${rule.skillModifier} DR)` : ''} requis sur ${target?.name || 'la cible'}. Utilisez le suivi K1; le Test de seuil suit tout gain.`);
  if (rule.kind === 'poison' && hit && hurt) {
    const poisonTest = context.supplementalPoisonTest;
    if (context.fellDaggerSecretRoll === 1 || item?.extensions?.v5?.fellDaggerBreakNextUse === true) reminders.push('Dague funeste : poison épuisé; aucun Empoisonné sur cette utilisation. La lame se brisera à la fin de cette utilisation.');
    else if (!poisonTest || typeof poisonTest.success !== 'boolean') unresolved.push('Dague funeste : résultat du Test d’Endurance de la cible à −1 DR requis avant d’appliquer Empoisonné.');
    else if (!poisonTest.success) effects.push({ participantId: target?.id, state: 'Empoisonné', sourceRuleId: ruleId });
  }
  if (rule.kind === 'warp-blade' && hit && Number(damage?.finalDamage) > 1) {
    const test = context.warpBladeEnduranceTest;
    if (!Number.isSafeInteger(test?.score)||test.score<0||test.score>100||!Number.isSafeInteger(test?.roll)||test.roll<1||test.roll>100) unresolved.push('Warp Blade : saisir le score et le jet d100 du Test de Résistance moyen V4 (+20, converti en +2 DR V5) après plus d’une Blessure.');
    else {
      const preview=previewV5Test({score:test.score,roll:test.roll,slModifiers:[{id:'warp-blade-v4-average-test',label:'Test moyen V4 (+20) converti en V5',amount:2}]});
      const enduranceTest=selectV5Test(preview,'keep');
      if(!enduranceTest.success)effects.push({participantId:target?.id,state:'Sonné',sourceRuleId:ruleId});
      reminders.push(`Warp Blade : Test de Résistance V5 ${enduranceTest.success?'réussi':'échoué'} (${enduranceTest.sl>=0?'+':''}${enduranceTest.sl} DR), difficulté +2 DR${enduranceTest.success?'':' ; Sonné appliqué'}.`);
    }
  }
  if(rule.kind==='poison'&&used){
    const stored=item?.extensions?.v5||{};
    if(!item?.id)unresolved.push('Dague funeste : relier un exemplaire durable à l’attaque pour suivre l’épuisement secret et le bris futur.');
    else if(stored.weaponDisposition==='broken')unresolved.push('Dague funeste : cette lame s’est brisée lors de son utilisation précédente.');
    else if(stored.fellDaggerBreakNextUse===true)weaponDispositionUpdate={itemId:item.id,weaponDisposition:'broken',fellDaggerBreakNextUse:false};
    else {
      const roll=Number(context.fellDaggerSecretRoll);
      if(!Number.isInteger(roll)||roll<1||roll>10)unresolved.push('Dague funeste : jet secret MJ de d10 (1–10) requis à chaque utilisation.');
      else if(roll===1)weaponDispositionUpdate={itemId:item.id,weaponDisposition:null,fellDaggerBreakNextUse:true};
    }
  }
  if (rule.kind === 'critical-bleeding-both' && critical) {
    effects.push({ participantId: target?.id, state: 'Hémorragique', sourceRuleId: ruleId });
    effects.push({ participantId: actor?.id, state: 'Hémorragique', sourceRuleId: ruleId });
  }
  if (rule.kind === 'bleeding-on-wound' && hit && hurt) effects.push({ participantId: target?.id, state: 'Hémorragique', sourceRuleId: ruleId });
  if (rule.kind === 'antler-hilt') {
    const origin=context.antlerHandleOrigin||item?.extensions?.v5?.antlerHandleOrigin;
    if(!origin)unresolved.push('Lame à poignée de bois de Grand Cerf : préciser si le bois est tombé naturellement ou acquis par violence.');
    else if(origin==='naturally-fallen')reminders.push('Cette lame ne se brise pas lorsque son porteur l’emploie au combat; rouille, déformation et bris hors combat restent possibles.');
    else if(origin==='violent'&&critical){effects.push({participantId:target?.id,state:'Hémorragique',sourceRuleId:'F-L11-0079'});effects.push({participantId:actor?.id,state:'Hémorragique',sourceRuleId:'F-L11-0079'});}
    else if(origin==='violent')reminders.push('Poignée acquise par violence : l’effet Hémorragique se déclenche uniquement sur un critique infligé.');
    else unresolved.push('Origine de la poignée invalide : choisir bois tombé naturellement ou acquis par violence.');
  }
  if (rule.kind === 'encumbrance-reduction') reminders.push('Encombrement de cette pièce : −1 par rapport à la pièce de plate métallique correspondante; PA et Taille inchangés.');
  if (rule.kind === 'pavise-carried') reminders.push('Pavois porté : appliquer Protectrice 3 selon le flux de bouclier choisi; Défensive, Inoffensive, Lente, Épuisante; Encombrement 4; dégâts BF+2.');
  if (rule.kind === 'pavise-planted') reminders.push('Pavois planté : 2 Actions pour le mettre en place; Protectrice 5 contre les tirs de la direction choisie à 1 yard derrière; en mêlée de face, premier Tour seulement.');
  if (rule.kind === 'felid-wound-disguise' && hit && hurt) {
    effects.push({participantId:target?.id,disguiseAs:'grand félin',sourceRuleId:ruleId});
  }
  if (rule.kind === 'enchanted-staff' || rule.kind === 'wizard-robes') {
    const associatedDomain = fold(item?.associatedDomain || item?.v5?.associatedDomain || context.associatedDomain);
    const spellDomainLabel = String(spell?.wind || spell?.domain || spell?.type || '');
    const spellDomain = fold(spellDomainLabel);
    if (!associatedDomain) unresolved.push(`${rule.label} : domaine associé à saisir par le MJ.`);
    else if (!spellDomain) unresolved.push(`${rule.label} : domaine du sort à déterminer.`);
    else if (associatedDomain !== spellDomain) reminders.push(`${rule.label} : aucun bonus, le domaine du sort ne correspond pas au domaine associé.`);
    else if (rule.kind === 'enchanted-staff') {
      const rank=Number(item?.focusRank??item?.v5?.focusRank??context.focusRank);
      if(![1,2,3].includes(rank))unresolved.push('Bâton du domaine : choisir le rang de Focalisation (+1, +2 ou +3 DR).');
      else {casting.focusSL=rank;reminders.push(`Bâton du domaine : +${rank} DR en Focalisation de ${spellDomainLabel} seulement; il reste un bâton de combat non magique et ne prolonge le corps que pour les sorts de contact.`);}
    }
    else {
      const rank = Number(item?.robeRank ?? item?.v5?.robeRank ?? context.robeRank);
      if (![1, 2, 3].includes(rank)) unresolved.push('Robes de sorcier : choisir le rang pratique (1), normal (2) ou élaboré (3).');
      else { casting.focusSL = rank; reminders.push(`Robes de sorcier : +${rank} DR à la Focalisation de ${spellDomainLabel} seulement.`); }
    }
  }
  if (rule.kind === 'printed-damage') reminders.push('Dégâts imprimés de créature : la valeur comprend déjà le BF approprié; ne pas ajouter de BF une seconde fois.');
  if (rule.kind === 'warpstone-critical') reminders.push('Éclat de malepierre : conserver Pénétrante; une Blessure Critique infligée cause une exposition mineure à la Corruption. Tout objet Skaven contenant de la malepierre porté hors boîte plombée expose aussi son porteur une fois par jour (déclaration MJ dans K1).');
  const enduranceTest = rule.kind==='warp-blade'&&hit&&Number(damage?.finalDamage)>1&&Number.isSafeInteger(context.warpBladeEnduranceTest?.score)&&Number.isSafeInteger(context.warpBladeEnduranceTest?.roll)
    ? selectV5Test(previewV5Test({score:context.warpBladeEnduranceTest.score,roll:context.warpBladeEnduranceTest.roll,slModifiers:[{id:'warp-blade-v4-average-test',label:'Test moyen V4 (+20) converti en V5',amount:2}]}),'keep') : null;
  return Object.freeze({ ruleId, label: rule.label, itemId: item?.id || item?.baseId || null, effects: Object.freeze(effects), exposure, casting: Object.freeze(casting), enduranceTest, weaponDispositionUpdate,
    reminders: Object.freeze(reminders), unresolved: Object.freeze(unresolved) });
}
