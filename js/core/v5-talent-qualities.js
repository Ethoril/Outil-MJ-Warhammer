/** Temporary action Qualities and source-pinned V5 weapon condition proposals. */
import {sourceActive,knownV5MartialQualities} from './v5-talent-actions.js';
import registry from '../data/v5-quality-talent-contracts.json' with { type: 'json' };
import additionalRegistry from '../data/v5-additional-talent-contracts.json' with { type: 'json' };
import { getReferenceCatalogue } from './reference-catalog.js';
import { keywordMechanicalStatus } from './keywords.js';
import { normalizeQualities } from './quality-normalization.js';
import { evaluateV5Talents, V5_TALENT_CONTRACTS } from './v5-talents.js';

const IMPROVISED_WEAPON_ID = 'weapon-armes-corps-a-corps-base-arme-improvisee';
const qualityIds = [...registry.contracts,...additionalRegistry.contracts].filter(row=>row.clauses.some(clause=>clause.event==='action.before' && clause.effects.some(effect=>['addQuality','suppressQuality','modifyQuality','forceDefenseSkill'].includes(effect.op)))).map(row=>row.talentId);
const clone = structuredClone;
const knownWounds = target => target?.hp !== null && target?.hp !== undefined && target?.hp !== '' && Number.isFinite(Number(target.hp));
/** Exact published item identity or an explicit MJ declaration; weapon names are never interpreted. */
export function v5ActionQualityContext(normalized, qualities = normalized.action.qualities, catalogue = getReferenceCatalogue()) {
  const weapon = normalized.actor?.equipment?.find(row => row.id === normalized.action.extensions?.fiche?.equipmentId);
  const declared = normalized.v5.context || {};
  for (const key of ['weaponImprovised', 'silentTakedown', 'calledShot']) if (declared[key] != null && typeof declared[key] !== 'boolean') throw new TypeError('Contexte oui/non requis : ' + key);
  const sourceId = weapon?.baseId || weapon?.id;
  const published = weapon && catalogue.items?.some(row => row.id === sourceId);
  const improvised = normalized.action.contactImprovised===true?true:published ? sourceId === IMPROVISED_WEAPON_ID : declared.weaponImprovised;
  const kind = ['attack', 'attaque'].includes(normalized.action.type) ? normalized.v5.kind || (normalized.attackContext?.ranged === true || normalized.action.attr === 'CT' ? 'ranged' : 'melee') : 'test';
  return { kind, actor:{hasMomentum:normalized.actor?.extensions?.v5?.hasMomentum===true},target:{hasMomentum:normalized.target?.extensions?.v5?.hasMomentum===true||normalized.combatPrelude?.targetIncomingMomentum===true}, weapon: { improvised, group:published?weapon.category:declared.weaponGroup, dagger:published?/^(weapon-armes-corps-a-corps-base-dague|weapon-armes-corps-a-corps-base-couteau)$/.test(sourceId):declared.weaponDagger,unarmed:published?sourceId==='weapon-armes-corps-a-corps-bagarre-mains-nues':declared.weaponUnarmed, pummel: qualities.some(row => row.id === 'assommante') },
    dualWielding:declared.dualWielding===true,silentTakedown: declared.silentTakedown, calledShot: declared.calledShot };
}
/** Adds and suppresses Qualities on the cloned action only, before every Test plan. */
export function previewV5ActionQualities(input) {
  const normalized = clone(input);
  const equipment = normalized.actor?.equipment?.find(row => row.id === normalized.action.extensions?.fiche?.equipmentId);
  const sourceQualities = normalizeQualities([...(!normalized.action.contactImprovised?equipment?.keywords || []:[]), ...(normalized.action.sourceQualities || normalized.action.qualities)]);
  const evaluate = qualities => evaluateV5Talents(normalized.actor, { event: 'action.before', role: 'attacker',
    context: v5ActionQualityContext(normalized, qualities), choices: normalized.v5.talentChoices || {}, includeTalents: qualityIds });
  const plan = clone(evaluate(sourceQualities));
  const suppressed = new Set(plan.proposals.filter(row => row.op === 'suppressQuality').map(row => row.key));
  const qualities = normalizeQualities([...sourceQualities, ...plan.proposals.filter(row => row.op === 'addQuality').map(row => ({ id: row.key, talentOrigins: clone(row.origins) }))]).filter(row => !suppressed.has(row.id));
  for(const effect of plan.proposals.filter(row=>row.op==='modifyQuality')){
    const quality=qualities.find(row=>row.id===effect.key);if(!quality)continue;
    const rating=Number(quality.parameter);
    if(!Number.isSafeInteger(rating)||rating<0||String(quality.parameter??'').trim()==='') {plan.unresolved.push({fields:['quality.'+effect.key+'.rating']});plan.ready=false;continue;}
    quality.parameter=String(Math.max(0,rating+effect.amount));quality.talentOrigins=clone(effect.origins);
  }
  normalized.action = { ...normalized.action, sourceQualities, qualities };
  if(normalized.defense&&plan.proposals.some(p=>p.op==='forceDefenseSkill')){
    const skill=getReferenceCatalogue().skills.find(s=>s.nom==='Intuition'),owned=(normalized.target.skills||[]).find(s=>s.id===skill.id&&s.status==='resolved');
    const base=owned?Number(owned.total):Number(normalized.target.caracs?.I);
    if(!Number.isFinite(base)){plan.unresolved.push({fields:['target.intuitionBase']});plan.ready=false;}
    else{normalized.defense={...normalized.defense,type:'skill',attr:'I',base,label:'Intuition (Feinte)',qualities:[],extensions:{fiche:{skillId:skill.id}},v5:{...normalized.defense.v5,kind:'test'}};normalized.protectionContext={...normalized.protectionContext,opposedWithShield:false};}
  }
  function martialQuality(subject,action,unarmed){
    if(!action||!unarmed)return action;const active=(subject.states||[]).find(s=>s.key==='martial-arts-quality'&&sourceActive(s)&&knownV5MartialQualities(subject).includes(s.qualityId));
    if(!active)return action;
    plan.proposals.push({op:'addQuality',key:active.qualityId,origins:[clone(active.source)]});
    return{...action,qualities:normalizeQualities([...action.qualities.filter(q=>q.id!=='inoffensive'),{id:active.qualityId,talentOrigins:[clone(active.source)]}])};
  }
  normalized.action=martialQuality(normalized.actor,normalized.action,v5ActionQualityContext(normalized).weapon.unarmed===true);
  const defenderWeapon=normalized.target?.equipment?.find(row=>row.id===normalized.defense?.extensions?.fiche?.equipmentId);
  if(normalized.defense)normalized.defense=martialQuality(normalized.target,normalized.defense,defenderWeapon?(defenderWeapon.baseId||defenderWeapon.id)==='weapon-armes-corps-a-corps-bagarre-mains-nues':normalized.defense?.v5?.context?.weaponUnarmed===true);
  normalized.v5.calledShotPenaltyIgnored = false;
  return { normalized, plan };
}
/** Only this new family is handled here; the existing V5 Qualities retain their contracts. */
export function v5QualityMechanicalStatus(value, catalogue = getReferenceCatalogue()) {
  const id = typeof value === 'string' ? value : value?.id;
  const baseline = registry.qualityContracts.find(row => row.id === id);
  if (!baseline) return keywordMechanicalStatus(id);
  const word = catalogue?.keywords?.find(row => row.id === id);
  if (!word || word.effect !== baseline.effect || word.edition !== baseline.edition || word.source !== baseline.source)
    return { id, status: 'manual', reason: 'version-effet-non-couverte', word };
  return { id, status: 'covered', word, engine: { engine: baseline.engine, scope: 'condition' },
    effectVersion: baseline.ruleVersion + ':' + baseline.effectHash, limitations: [] };
}
/** Pummel uses Wounds actually lost from the ordinary head hit, after protection. */
export function previewV5WeaponConditions({ qualities = [], hit, location, target, damage, resolutionId, actor, replaced = false, catalogue } = {}) {
  const proposed = [], unresolved = [], warnings = [], talentPlans=[];
  if (replaced || !qualities.some(row => row.id === 'assommante')) return { proposed, unresolved, warnings };
  const status = v5QualityMechanicalStatus('assommante', catalogue);
  if (status.status !== 'covered') warnings.push({ keywordId: 'assommante', reason: status.reason });
  if (status.status !== 'covered' || !hit || location?.key !== 'HEAD' || !damage || damage.finalDamage <= 0) return { proposed, unresolved, warnings };
  if (!knownWounds(target)) unresolved.push('Assommante : Blessures courantes de la cible requises.');
  const toughness = target?.caracs?.E;
  if (toughness === null || toughness === undefined || toughness === '' || !Number.isFinite(Number(toughness)) || Number(toughness) < 0) unresolved.push('Assommante : Bonus d’Endurance de la cible requis.');
  if (unresolved.length) return { proposed, unresolved, warnings };
  const woundsLost = Math.min(Math.max(0, Number(target.hp)), damage.finalDamage), toughnessBonus = Math.floor(Number(toughness) / 10);
  if (woundsLost >= toughnessBonus) proposed.push({ id: resolutionId + ':quality:assommante:sonne', key: 'sonne', name: 'Sonné', level: 1,
    source: { kind: 'quality', keywordId: 'assommante', ruleVersion: registry.qualityContracts[0].ruleVersion,
      effectVersion: status.effectVersion, effectHash: registry.qualityContracts[0].effectHash, reference: status.word.source, woundsLost, toughnessBonus } });
  if(proposed.length&&actor){
    const plan=evaluateV5Talents(actor,{event:'condition.beforeAcquire',role:'attacker',context:{condition:{id:'sonne',instances:1},weapon:{pummel:true}},includeTalents:['talent-bludgeoner']});
    talentPlans.push(plan);proposed[0].level+=plan.proposals.filter(row=>row.op==='increaseConditionAcquisition').reduce((sum,row)=>sum+row.amount,0);
    proposed[0].source.talentOrigins=plan.proposals.flatMap(row=>row.origins);
    unresolved.push(...plan.unresolved.flatMap(row=>row.fields));
  }
  return { proposed, unresolved, warnings,talentPlans };
}
