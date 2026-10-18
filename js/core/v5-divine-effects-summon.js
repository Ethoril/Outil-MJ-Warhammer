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

const handler = {
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
  createParticipants(effect, { contract, executionId, index, actorId, actor, layer, round }) {
    if (!enabled || !layer) return [];
    const link = { executionId, contractId: contract.id, ownerId: actorId, layerId: layer.id, kind: effect.kind,
      ...(effect.kind === 'creature' ? { profileKey: effect.profile.key } : {}), createdRound: Number.isSafeInteger(round) && round >= 1 ? round : 1, onEnd: 'remove' };
    const base = { id: `divine-summon:${safe(executionId)}:${safe(contract.id)}:${index}`, camp: actor?.camp || 'neutre', ownerId: actorId, link };
    return [effect.kind === 'sensor' ? summonSensorParticipant({ ...base, name: effect.name, traits: effect.traits })
      : summonCreatureParticipant(effect.profile, { ...base, position: effect.position })];
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

export default { 'summon-creature': handler };
