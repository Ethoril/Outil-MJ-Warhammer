import { formatDamageFormula, formatWeaponDamage } from '../damage.js';

export const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export const signedValue = value => { const number = Number(value) || 0; return number < 0 ? `−${Math.abs(number)}` : `+${number}`; };
export const knownHp = actor => actor?.hp !== null && actor?.hp !== undefined && actor?.hp !== '' && Number.isFinite(Number(actor.hp));
export const DETAIL_TYPE_LABELS = { attack: 'Attaque', skill: 'Compétence', defense: 'Défense', opposition: 'Opposition' };

/** « gravité 43 + 10 = 53 → Côtes fracturées » ; « gravité non tirée » tant que le d100 manque. */
export function describeSeverity(part) {
  const base = part.effectRollBase ?? part.effectRoll;
  if (base === null || base === undefined) return 'gravité non tirée';
  const roll = part.bonus ? `${base} + ${part.bonus} = ${part.effectRoll}` : `${part.effectRoll}`;
  return `gravité ${roll}${part.effect?.name ? ` → ${part.effect.name}` : ''}`;
}

/** Phrases du journal pour un critique ; les anciennes entrées (sans localisation) restent « Coup critique ». */
export function describeCritical(detail) {
  const critical = detail.critical;
  if (!critical) return [];
  const first = critical.details;
  if (!isRecord(first) && critical.second) {
    const second = critical.second;
    return [`Critique d’excédent : ${second.location.name} · ${describeSeverity(second)}`, ...(second.parsed?.reminders || []).map(text => `À arbitrer : ${text}`)];
  }
  if (!isRecord(first) || !isRecord(first.location) || first.locationRoll === null || first.locationRoll === undefined) {
    return [detail.actionType && detail.actionType !== 'attack' ? 'Réussite critique' : 'Coup critique'];
  }
  const parts = [`Critique : localisation ${first.locationRoll} → ${first.location.name} · ${describeSeverity(first)}`];
  const second = critical.second;
  if (isRecord(second) && isRecord(second.location)) {
    parts.push(`Critique d’excédent : ${second.location.name} · ${describeSeverity(second)}`);
  }
  const application = critical.application;
  if (isRecord(application)) {
    const applied = [
      ...(application.extraWounds ? [`+${application.extraWounds} Blessure${application.extraWounds > 1 ? 's' : ''}`] : []),
      ...(Array.isArray(application.states) ? application.states.map(state => state.key === 'a-terre' ? state.name : `${state.name} ${state.level}`) : [])
    ];
    if (applied.length) parts.push(`Effets appliqués : ${applied.join(', ')}`);
  }
  const parsed = [first, second].map(part => part?.parsed).filter(isRecord);
  const reminders = parsed.flatMap(item => Array.isArray(item.reminders) ? item.reminders : []);
  if (reminders.length) parts.push(`À arbitrer : ${reminders.join(' ; ')}`);
  if (parsed.some(item => item.death)) parts.push('Mort instantanée');
  if (isRecord(critical.secondHint) && isRecord(critical.secondHint.location)) {
    parts.push(`Second critique possible au ${critical.secondHint.location.name} (jet inversé ${critical.secondHint.locationRoll})`);
  }
  return parts;
}

/**
 * Détail d'une entrée de journal de résolution en phrases courtes, sans clé
 * technique : les valeurs vides et les objets non reconnus sont omis.
 */
export function describeResolutionDetail(detail) {
  if (!isRecord(detail)) return [];
  const parts = [];
  const present = value => value !== null && value !== undefined;
  if (present(detail.actionType)) parts.push(`Type : ${DETAIL_TYPE_LABELS[detail.actionType] || detail.actionType}`);
  if (detail.ruleVersion) parts.push(`Règle : ${detail.ruleVersion}`);
  if (detail.test?.initialRoll != null && detail.test.initialRoll !== detail.roll) parts.push(`Jet initial : ${detail.test.initialRoll} · choix : ${detail.test.optionId}`);
  if(detail.test?.automatic)parts.push('Réussite automatique, sans jet.');else if (present(detail.roll)) parts.push(`Jet : ${detail.roll}`);
  if (present(detail.targetScore)) parts.push(`Seuil : ${detail.targetScore}`);
  if (present(detail.sl)) parts.push(`DR : ${signedValue(detail.sl)}${detail.slBonus ? ` (${detail.slBonus > 0 ? 'Pointue' : 'Imprécise'} ${signedValue(detail.slBonus)})` : ''}`);
  if(detail.resultTier?.label)parts.push(`Palier : ${detail.resultTier.label}`);
  if(detail.defenderResultTier?.label)parts.push(`Palier du défenseur : ${detail.defenderResultTier.label}`);
  if(detail.extraordinaryShot)parts.push(`Tir extraordinaire (${detail.extraordinaryShot.talentId}) : ${detail.extraordinaryShot.description} · difficulté MJ ${signedValue(detail.extraordinaryShot.difficulty)} DR.`);
  if(detail.lethalDeath?.confirmedBy==='explicit-gm')parts.push('Mort directe : option de table activée et confirmation explicite du MJ ; cible marquée morte (0 PV).');
  const opposition = isRecord(detail.opposition) && isRecord(detail.opposition.defender) ? detail.opposition : null;
  if (opposition) {
    const { label, score, roll } = opposition.defender;
    const hit = present(detail.hit) ? ` · ${detail.hit ? 'touché' : 'pas de touche'}` : '';
    parts.push(`Opposition : défense ${label} ${score} (d100 ${roll}) · DR net ${signedValue(opposition.netSl)}${hit}`);
  } else if (present(detail.hit)) parts.push(detail.hit ? 'Touché' : 'Pas de touche');
  // Ordinary damage and the Critical Wound have independent V5 locations.
  if (detail.location?.calledShot) parts.push('Coup ciblé : ' + detail.location.name);
  if (isRecord(detail.location) && present(detail.location.roll) && detail.location.name) parts.push(`Localisation : ${detail.location.roll} → ${detail.location.name}`);
  const damage = isRecord(detail.damage) ? formatDamageFormula(detail.damage) : '';
  if (damage) parts.push(`Dégâts : ${damage}`);
  const weapon = isRecord(detail.weapon) && detail.weapon.status === 'manual' ? formatWeaponDamage(detail.weapon) : '';
  if (weapon) parts.push(`Arme : ${weapon}`);
  parts.push(...describeCritical(detail));
  if(detail.defenderDamage)parts.push('Riposte : '+formatDamageFormula(detail.defenderDamage)+' Blessures sur l’attaquant.');
  if (detail.defenderCritical) parts.push(...describeCritical({ actionType: 'attack', critical: detail.defenderCritical }).map(text => `Défenseur → attaquant : ${text}`));
  for (const change of detail.momentum || []) parts.push(`Élan (${change.participantId}) : ${change.before ? 'oui' : 'non'} → ${change.after ? 'oui' : 'non'}`);
  if (detail.damageReplacedByTalent) parts.push('Battement : toutes les Blessures et conséquences du critique remplacées ; la cible peut encore Esquiver.');
  for (const plan of detail.talentPlans || []) for (const proposal of plan.proposals || []) {
    if (proposal.op === 'modifyDamage') parts.push('Talent : +' + proposal.amount + ' Dégât (' + proposal.origins.map(origin => origin.talentId).join(', ') + ')');
    if (proposal.op === 'reduceConditionAcquisition') parts.push('Talent : ' + proposal.amount + ' acquisition(s) de ' + proposal.key + ' évitée(s).');
  }
  for (const condition of [...(detail.weaponConditions?.applied||[]),...(detail.defenderWeaponConditions?.applied||[])]) parts.push('Assommante : ' + condition.level + ' état Sonné appliqué.');
  for(const state of detail.actorConditionApplication||[])if(state.source?.keywordId==='a-poudre-noire')parts.push('À Poudre noire : '+state.level+' état(s) Brisé acquis.');
  for (const reminder of detail.reminders || []) parts.push(reminder);
  if (detail.fumble) parts.push('Maladresse');
  if (detail.spreadPlan?.targets?.length) parts.push(`Dispersion : ${detail.spreadPlan.targets.length} cible(s) choisie(s) par le MJ · bande ${detail.spreadPlan.rangeBand}.`);
  if (detail.projectileLodging) {
    const lodged=detail.projectileLodging;
    const projectileLabel=lodged.genericProjectile?({fleche:'flèche',carreau:'carreau',balle:'balle'}[lodged.ammunitionType]||'générique'):lodged.ammunitionId;
    parts.push(`Empaleuse : projectile ${projectileLabel} fiché; récupération bloquée jusqu’à ${lodged.removal==='surgery'?'chirurgie':'Test de Guérison'}.`);
  }
  if (detail.combatFailure?.fumble?.outcome) parts.push(`Table des maladresses (${detail.combatFailure.fumble.roll}) : ${detail.combatFailure.fumble.outcome.label}`);
  if (detail.combatFailure?.defender?.outcome) parts.push(`Table des maladresses du défenseur (${detail.combatFailure.defender.roll}) : ${detail.combatFailure.defender.outcome.label}`);
  if (detail.combatFailure?.misfire?.outcome) parts.push(`Incident de poudre (${detail.combatFailure.misfire.roll}) : ${detail.combatFailure.misfire.outcome.label}`);
  if (detail.combatFailure?.misfire?.salvo?.outcome) parts.push(`Incident de Salve (${detail.combatFailure.misfire.salvo.roll}) : ${detail.combatFailure.misfire.salvo.outcome.label}`);
  for (const reminder of detail.combatFailure?.reminders || []) parts.push(reminder);
  // Read only the stored receipt: refreshing today's catalogue must never rewrite history.
  const shortVersion = value => String(value).split(':').map(part => /^[a-f0-9]{32,}$/i.test(part) ? part.slice(0, 12) : part).join(':');
  if (detail.referenceVersion) parts.push(`Référentiel utilisé : ${shortVersion(detail.referenceVersion)}`);
  const sourceAction = detail.action?.extensions?.fiche;
  if (sourceAction?.equipmentId) parts.push(`Arme de la fiche : ${detail.action.note || sourceAction.equipmentId} (exemplaire ${sourceAction.equipmentId})`);
  if (detail.ammunitionId) parts.push(`Munition : exemplaire ${detail.ammunitionId}`);
  for (const source of Array.isArray(detail.ammunitionSources) ? detail.ammunitionSources.filter(isRecord) : []) {
    parts.push(`${source.kind === 'ammunition' ? 'Munition' : 'Arme'} ${source.equipmentId} : ${source.keywordId}${source.parameter ? ` (${source.parameter})` : ''}`);
  }
  const protection = isRecord(detail.protection) ? detail.protection : null;
  const pieceName = item => item.name || item.item?.name || item.id || item.equipmentId || 'pièce';
  if (protection) {
    if (present(protection.ap)) parts.push(`Protection retenue : ${protection.ap} PA${protection.arbitrated ? ' (arbitrage MJ)' : ''}`);
    if (protection.counted?.length) parts.push(`Armures comptées : ${protection.counted.map(pieceName).join(', ')}`);
    if (protection.ignored?.length) parts.push(`Armures écartées : ${protection.ignored.map(pieceName).join(', ')}`);
    if (protection.shield?.name) parts.push(`Bouclier : ${protection.shield.name} · ${protection.shieldAp || 0} PA`);
  }
  for (const rule of Array.isArray(detail.mechanics) ? detail.mechanics.filter(isRecord) : []) {
    const origin = [rule.edition, rule.source].filter(Boolean).join(' · ');
    parts.push(`Règle ${rule.name || rule.id} : ${rule.status === 'homebrew-covered' ? 'automatisée (homebrew Petit validé par le MJ)' : rule.status === 'covered' ? 'automatisée' : 'à arbitrer'}${origin ? ` · ${origin}` : ''}${rule.effectVersion ? ` · version ${shortVersion(rule.effectVersion)}` : ''}${rule.effect ? ` · ${rule.effect}` : ''}`);
  }
  return parts;
}
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
