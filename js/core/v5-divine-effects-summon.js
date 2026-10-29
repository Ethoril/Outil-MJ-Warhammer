/**
 * Gestionnaires d'effet divins : invocations (P4c). `summon-creature` pose sur le prêtre une couche inerte (appliesTo 'caster') qui
 * porte l'échéance, et fait créer par le moteur (crochet `createParticipants`) un participant ordinaire dans la même commande atomique.
 * Le lien créature -> couche est `extensions.v5.divineSummon` ; sweepDivineSummons (v5-divine-store.js) retire la créature quand la
 * couche disparaît (expiration, fin manuelle, mort du prêtre). Jamais de `summonCastExecutionId` ni de `summonedUntilRound` : ces champs
 * déclenchent les filtres des invocations magiques, qui retireraient aussitôt la créature.
 * Effet : {type:'summon-creature', appliesTo:'caster', kind:'creature'|'sensor', duration,
 *   creature : profile:<clé du bestiaire> | choice:'beast' (bête au choix du MJ, input.summon.beastKey), overrides?, requiresPosition?
 *   sensor   : name, traits?}
 */
import { SUMMON_BEAST_KEYS, buildBeastSummonProfile, summonOverridesError, summonCreatureParticipant, summonSensorParticipant } from '../data/divine-summon-profiles.js';
import { REIKLAND_BEASTS } from '../data/v5-transformation-bestiary.js';

// Interrupteur de repli : désactivé, rien n'est créé et le miracle se joue à la main ; le balayage des créatures existantes reste actif.
export const DIVINE_SUMMON_ENABLED = true;
let enabled = DIVINE_SUMMON_ENABLED;
/** Réservé aux tests : simule l'interrupteur (la constante exportée reste la valeur livrée). */
export function setDivineSummonEnabled(value) { enabled = Boolean(value); }

const need = (field, label) => ({ field, label });
const isText = value => typeof value === 'string' && value.trim() !== '';
const DISABLED = 'Invocation désactivée : jouer le miracle à la main.';
const BEAST_LABEL = SUMMON_BEAST_KEYS.map(key => `${key} (${REIKLAND_BEASTS[key].name})`).join(', ');
const kinds = new Set(['creature', 'sensor']);
const beastKeyOf = (effect, input) => effect.profile?.key ?? effect.profile ?? input?.summon?.beastKey;
// Identifiant déterministe : seuls [A-Za-z0-9:_-] (les identifiants de contrat et d'exécution peuvent en porter d'autres).
const safe = value => String(value).replace(/[^A-Za-z0-9:_-]/g, '_');

const POSITION_MAX = 200;
// Même numérotation que les invocations magiques et les rencontres : « Loup », « Loup 2 », « Loup 3 »… parmi les créatures divines présentes.
function numberedName(name, participants = []) {
  const used = participants.filter(row => row?.extensions?.v5?.divineSummon).map(row => row.name);
  if (!used.includes(name)) return name;
  let max = 1;
  for (const other of used) if (other.startsWith(name + ' ') && /^\d+$/.test(other.slice(name.length + 1))) max = Math.max(max, Number(other.slice(name.length + 1)));
  return `${name} ${max + 1}`;
}

const handler = {
  // Invocation portée par le prêtre : aucune cible désignée requise (hasImplicitCasterTarget).
  implicitTarget: true,
  validate(effect) {
    if (effect.appliesTo !== 'caster' && effect.casterOnly !== true) return 'summon-creature exige appliesTo "caster".';
    if (!kinds.has(effect.kind)) return 'summon-creature exige kind creature ou sensor.';
    if (effect.kind === 'sensor') {
      if (!isText(effect.name)) return 'summon-creature (sensor) exige name.';
      if (effect.traits !== undefined && (!Array.isArray(effect.traits) || !effect.traits.every(isText))) return 'summon-creature : traits doit être une liste de textes.';
      return null;
    }
    if (effect.choice !== undefined && effect.choice !== 'beast') return 'summon-creature : choice ne peut valoir que beast.';
    if ((effect.profile === undefined) === (effect.choice === undefined)) return 'summon-creature (creature) exige profile ou choice "beast", pas les deux.';
    if (effect.profile !== undefined && !SUMMON_BEAST_KEYS.includes(effect.profile)) return `summon-creature : profile doit être l’un de ${SUMMON_BEAST_KEYS.join(', ')}.`;
    return summonOverridesError(effect.overrides);
  },
  needs(effect, { input } = {}) {
    if (!enabled) return [need('contract.effects.summon', DISABLED)];
    const needs = [];
    if (effect.kind === 'creature' && !SUMMON_BEAST_KEYS.includes(beastKeyOf(effect, input)))
      needs.push(need(effect.choice === 'beast' ? 'summon.beastKey' : 'contract.effects.profile', `Bête invoquée (liste fermée : ${BEAST_LABEL})`));
    if (effect.requiresPosition === true && !isText(input?.summon?.position)) needs.push(need('summon.position', 'Position d’apparition de la créature'));
    else if (effect.requiresPosition === true && input.summon.position.trim().length > POSITION_MAX) needs.push(need('summon.position', `Position d’apparition trop longue (${POSITION_MAX} caractères au plus)`));
    return needs;
  },
  // Le profil complet est figé à l'aperçu : l'application ne recalcule rien.
  resolve(effect, { input } = {}) {
    const missing = handler.needs(effect, { input });
    if (missing.length) return { error: missing.map(row => row.label).join(' ; '), needs: missing };
    const resolved = { ...effect };
    if (effect.requiresPosition === true && isText(input?.summon?.position)) resolved.position = input.summon.position.trim();
    if (effect.kind === 'creature') {
      resolved.profile = buildBeastSummonProfile(beastKeyOf(effect, input), effect.overrides);
      delete resolved.overrides; delete resolved.choice;
    }
    return resolved;
  },
  buildLayer: effect => ({ summon: { kind: effect.kind, ...(effect.kind === 'creature' ? { profileKey: effect.profile?.key ?? effect.profile } : {}) } }),
  // Participant ordinaire, créé par le moteur juste après les couches : ctx = {contract, executionId, index, actorId, actor, layer, round}.
  createParticipants(effect, { contract, executionId, index, actorId, actor, layer, round, participants }) {
    if (!enabled || !layer) return [];
    const link = { executionId, contractId: contract.id, ownerId: actorId, layerId: layer.id, kind: effect.kind,
      ...(effect.kind === 'creature' ? { profileKey: effect.profile.key } : {}), createdRound: Number.isSafeInteger(round) && round >= 1 ? round : 1, onEnd: 'remove' };
    const base = { id: `divine-summon:${safe(executionId)}:${safe(contract.id)}:${index}`, camp: actor?.camp || 'neutre', ownerId: actorId, link };
    return [effect.kind === 'sensor' ? summonSensorParticipant({ ...base, name: effect.name, traits: effect.traits })
      : summonCreatureParticipant(effect.profile, { ...base, name: numberedName(effect.profile.name, participants), position: effect.position })];
  },
  inputFields: effect => [
    ...(effect.choice === 'beast' ? [{ path: 'summon.beastKey', label: 'Bête invoquée', kind: 'select', scope: 'effect',
      options: SUMMON_BEAST_KEYS.map(key => [key, REIKLAND_BEASTS[key].name]) }] : []),
    ...(effect.requiresPosition === true ? [{ path: 'summon.position', label: 'Position d’apparition', kind: 'text', scope: 'effect' }] : [])
  ],
  receipt: (effect, { targetId }, created = []) => ({ targetId, type: effect.type, result: {
    ids: created.map(row => row.id), kind: effect.kind, ...(effect.kind === 'creature' ? { profileKey: effect.profile.key, name: effect.profile.name,
      wounds: effect.profile.wounds, ...(effect.profile.woundsFormula ? { woundsFormula: effect.profile.woundsFormula } : {}) } : { name: effect.name }) } })
};

// B14 : démon inférieur (Courroux 88) et Serviteur divin (141–145). Le livre renvoie au Bestiaire sans profil ni valeur : le MJ confirme
// le profil, la position et la cible ; rien n'est inventé, aucune Action n'est créée. Le participant n'a pas de lien `divineSummon` (aucune
// couche d'invocation) : il reste en jeu jusqu'au retrait par le MJ.
export const WRATH_SUMMON_RULES = Object.freeze({
  'wrath:88-88': Object.freeze({ kind: 'demon', min: 2, max: 20, dice: '2d10', label: 'Démon inférieur' }),
  'wrath:141-145': Object.freeze({ kind: 'servant', min: 1, max: 100, dice: 'd100', label: 'Serviteur divin' })
});
const WRATH_SUMMON_CARACS = Object.freeze(['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc', 'M']);
const WRATH_SUMMON_CAMPS = Object.freeze(['allie', 'ennemi', 'neutre']);
const TEXT_MAX = 200;
const plain = value => value && typeof value === 'object' && !Array.isArray(value);

function normalizedWrathProfile(profile) {
  if (!plain(profile)) return { need: need('wrathSummonProfile', 'Profil confirmé par le MJ (nom, Blessures, Initiative)') };
  const bad = message => ({ need: need('wrathSummonProfile', message) });
  if (Object.keys(profile).some(key => !['name', 'wounds', 'initiative', 'caracs', 'traits'].includes(key))) return bad('Profil : seuls nom, Blessures, Initiative, caractéristiques et traits sont admis');
  if (!isText(profile.name) || profile.name.trim().length > 80) return bad('Profil : nom requis (80 caractères au plus)');
  if (!Number.isSafeInteger(profile.wounds) || profile.wounds < 1 || profile.wounds > 999) return bad('Profil : Blessures entières entre 1 et 999');
  if (!Number.isSafeInteger(profile.initiative) || profile.initiative < 0 || profile.initiative > 999) return bad('Profil : Initiative entière entre 0 et 999');
  const out = { name: profile.name.trim(), wounds: profile.wounds, initiative: profile.initiative };
  if (profile.caracs !== undefined) {
    if (!plain(profile.caracs) || Object.entries(profile.caracs).some(([key, value]) => !WRATH_SUMMON_CARACS.includes(key) || !Number.isSafeInteger(value) || value < 0 || value > 999)) return bad('Profil : caractéristiques connues, entières et positives');
    out.caracs = Object.fromEntries(WRATH_SUMMON_CARACS.filter(key => Object.hasOwn(profile.caracs, key)).map(key => [key, profile.caracs[key]]));
  }
  if (profile.traits !== undefined) {
    if (!Array.isArray(profile.traits) || profile.traits.length > 20 || !profile.traits.every(trait => isText(trait) && trait.trim().length <= 80)) return bad('Profil : traits en liste de textes courts');
    out.traits = profile.traits.map(trait => trait.trim());
  }
  return { profile: out };
}

/** Plan figé d'une apparition du Courroux : {ready:true, plan} ou {ready:false, needs:[{field,label}]}. Pur : ne lit que ses arguments. */
export function planWrathSummon(row, input = {}, { participants = [], actorId, executionId, wrath = {} } = {}) {
  const rule = WRATH_SUMMON_RULES[row?.id];
  if (!rule) return { ready: false, needs: [need('wrathTableResult', 'Ligne de Courroux sans apparition')] };
  const needs = [];
  const { profile, need: profileNeed } = normalizedWrathProfile(input.wrathSummonProfile);
  if (profileNeed) needs.push(profileNeed);
  const roll = input.wrathSummonDistanceRoll;
  if (!Number.isSafeInteger(roll) || roll < rule.min || roll > rule.max) needs.push(need('wrathSummonDistanceRoll', `Distance en mètres (${rule.dice}) : entier de ${rule.min} à ${rule.max}`));
  const position = isText(input.wrathSummonPosition) ? input.wrathSummonPosition.trim() : null;
  if (!position || position.length > TEXT_MAX) needs.push(need('wrathSummonPosition', `Position d’apparition confirmée (${TEXT_MAX} caractères au plus)`));
  const id = `divine-wrath-summon:${safe(executionId)}`;
  if (participants.some(other => other.id === id)) needs.push(need('executionId', 'Identifiant d’apparition déjà utilisé : nouvel identifiant requis'));
  let targetId, camp, behavior;
  if (rule.kind === 'demon') {
    camp = 'ennemi';
    targetId = input.wrathSummonTargetId;
    if (!isText(targetId) || targetId === id || !participants.some(other => other.id === targetId)) needs.push(need('wrathSummonTargetId', 'Cible la plus proche désignée par le MJ (participant présent)'));
  } else {
    camp = input.wrathSummonCamp;
    if (!WRATH_SUMMON_CAMPS.includes(camp)) needs.push(need('wrathSummonCamp', `Camp du serviteur choisi par le MJ (${WRATH_SUMMON_CAMPS.join(', ')})`));
    behavior = isText(input.wrathSummonBehavior) ? input.wrathSummonBehavior.trim() : null;
    if (!behavior || behavior.length > TEXT_MAX) needs.push(need('wrathSummonBehavior', `Conduite du serviteur selon le dieu (${TEXT_MAX} caractères au plus)`));
  }
  if (needs.length) return { ready: false, needs };
  return { ready: true, plan: { id, ruleVersion: 1, originExecutionId: executionId, resultId: row.id, kind: rule.kind, ownerId: actorId, distanceRoll: roll, distanceYards: roll,
    position, camp, profile, ...(targetId ? { targetId } : {}), ...(behavior ? { behavior } : {}), source: structuredClone(row.source),
    wrathProof: { roll: wrath.roll, modifiedRoll: wrath.modifiedRoll, sinAtTest: wrath.sinAtTest, resultId: row.id } } };
}

/** Participant ordinaire du plan : valeurs du MJ seulement, ni armure ni Action inventées. */
export function wrathSummonParticipant(plan, targetName) {
  const notes = [`${WRATH_SUMMON_RULES[plan.resultId].label} du Courroux, apparu à ${plan.distanceYards} m du prêtre.`, `Position : ${plan.position}.`,
    ...(plan.kind === 'demon' ? [`Attaque la cible la plus proche désignée : ${targetName || plan.targetId}.`] : [`Conduite : ${plan.behavior}.`])].join(' ');
  return { id: plan.id, name: plan.profile.name, kind: 'Créature', camp: plan.camp, zone: 'active', initiative: plan.profile.initiative,
    hp: plan.profile.wounds, maxHp: plan.profile.wounds, caracs: structuredClone(plan.profile.caracs || {}), armor: { head: 0, body: 0, arms: 0, legs: 0 },
    skills: [], actions: [], traits: [...(plan.profile.traits || [])], notes,
    extensions: { v5: { divineWrathSummon: { executionId: plan.originExecutionId, resultId: plan.resultId, kind: plan.kind, ownerId: plan.ownerId,
      distanceYards: plan.distanceYards, position: plan.position, ...(plan.targetId ? { targetId: plan.targetId } : {}), ...(plan.behavior ? { behavior: plan.behavior } : {}) } } } };
}

export default { 'summon-creature': handler };
