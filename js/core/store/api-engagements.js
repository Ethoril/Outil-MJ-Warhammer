// Commandes d'engagement du Store (spec docs/specs/engagements) : engager ou désengager à la main (MJ), Désengagement
// réglé (p. 163), positions durables d'un combattant. Chaque commande passe par l'historique (Annuler) et le journal.
import { uid } from '../models.js';
import { withEngagement, withoutEngagements, engagedWith, canBeEngaged, expireEngagements, previewDisengage as previewDisengagePlan } from '../engagements.js';
import { outnumberSide } from '../outnumbering.js';
import { hasFleeTalent } from '../v5-broken-escape.js';

const POSITION_KEYS = ['surrounded', 'higherGround', 'cover'];
// Scène (planche D) : posée une fois pour la rencontre, elle pré-remplit chaque action (une valeur saisie sur l'action l'emporte).
export const SCENE_KEYS = Object.freeze({ weather: ['normal', 'fog', 'rain-wind', 'extreme'], lighting: ['normal', 'fog', 'dim', 'dark'], difficultTerrain: [true, false], narrowSpace: [true, false] });

export const engagementLogEntry = (text, actorId = null) => ({ id: uid(), ts: Date.now(), kind: 'management', actorId, targetId: null, text, detail: null });
const withLog = (draft, text, actorId) => ({ ...draft, log: [engagementLogEntry(text, actorId), ...(draft.log || [])].slice(0, 300) });
const nameOf = (draft, id) => draft.combat?.participants?.find(row => row.id === id)?.name || id;
const patchV5 = (draft, id, patch) => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(row => (row.id !== id ? row
  : { ...row, extensions: { ...(row.extensions || {}), v5: { ...(row.extensions?.v5 || {}), ...patch } } })) } });

/** Passage du Round `endedRound` : paires expirées retirées, une ligne de journal par paire sans attaque (p. 163). */
export function withExpiredEngagements(state, endedRound) {
  if (!state?.combat) return state;
  const { combat, expired } = expireEngagements(state.combat, state.combat.participants || [], endedRound);
  if (!expired.length) return state;
  const lines = expired.filter(row => row.reason === 'no-attack')
    .map(row => engagementLogEntry(`Fin d’engagement : ${nameOf(state, row.a)} et ${nameOf(state, row.b)} ne se sont pas attaqués pendant le Round ${endedRound}.`, row.a));
  return { ...state, combat, log: [...lines, ...(state.log || [])].slice(0, 300) };
}

/** Après une attaque de mêlée appliquée : la paire attaquant/cible est engagée, ou rafraîchie au Round courant (p. 163). */
export function engageAfterMeleeAttack(state, preview) {
  const input = preview?.input || {}, actorId = input.actor?.id || input.actorId, targetId = preview?.targetId || input.target?.id || input.targetId;
  const kind = input.v5?.kind || preview?.kind, forced = input.v5?.context?.engagementForced;
  // CA18 : un forçage des engagements par le MJ reste visible au journal de l'action.
  if (state && (forced === 'mj' || forced === 'recit')) state.log = [engagementLogEntry(forced === 'recit' ? 'Engagements laissés au récit pour cette action (MJ).' : 'Engagements forcés par le MJ pour cette action.', actorId || null), ...(state.log || [])].slice(0, 300);
  if (kind !== 'melee' || !['attack', 'attaque'].includes(input.action?.type) || !actorId || !targetId || actorId === targetId || !state?.combat) return state;
  state.combat = withEngagement(state.combat, actorId, targetId, state.combat.round || 0);
  return state;
}

export function createEngagementsApi({ api, currentEnvelope }) {
  const participants = () => currentEnvelope().combat?.participants || [];
  const previewDisengage = (actorId, input = {}) => {
    const envelope = currentEnvelope();
    return previewDisengagePlan({ combat: envelope.combat, participants: envelope.combat?.participants || [], actorId, input });
  };
  return {
    listEngagedWith(id) { const envelope = currentEnvelope(); return engagedWith(envelope.combat, envelope.combat?.participants || [], id); },
    /** Le MJ engage deux combattants sans règle (déplacement sur le plateau). */
    engageParticipants(aId, bId) {
      const ids = new Set(participants().map(row => row.id));
      if (!ids.has(aId) || !ids.has(bId) || aId === bId) throw Object.assign(new Error('Deux combattants distincts du combat sont requis.'), { userFacing: true });
      return api.executeCommand('engage-participants', draft => withLog({ ...draft, combat: withEngagement(draft.combat, aId, bId, draft.combat?.round || 0) },
        `${nameOf(draft, aId)} et ${nameOf(draft, bId)} sont engagés (MJ).`, aId));
    },
    /** Le MJ sort un combattant de ses engagements (tous, ou avec `otherIds`), sans règle de Désengagement. */
    disengageParticipant(id, { otherIds = null } = {}) {
      if (!participants().some(row => row.id === id)) throw Object.assign(new Error('Combattant introuvable.'), { userFacing: true });
      return api.executeCommand('disengage-participant', draft => withLog({ ...draft, combat: withoutEngagements(draft.combat, id, otherIds) },
        `${nameOf(draft, id)} n’est plus engagé${otherIds ? ' avec ' + otherIds.map(other => nameOf(draft, other)).join(', ') : ''} (MJ).`, id));
    },
    previewDisengage: (actorId, input = {}) => previewDisengage(actorId, input),
    /** Désengagement réglé : recalculé au moment d'appliquer (même entrée), réussite = Libre, échec = Élan aux adversaires. */
    applyDisengage(actorId, input = {}) {
      const check = previewDisengage(actorId, input);
      if (check.status !== 'ready') throw Object.assign(new Error(check.reason || 'Désengagement incomplet.'), { userFacing: true });
      return api.executeCommand('disengage-v5', draft => {
        const plan = previewDisengagePlan({ combat: draft.combat, participants: draft.combat?.participants || [], actorId, input });
        if (plan.status !== 'ready') throw Object.assign(new Error(plan.reason || 'La situation a changé : recalculez.'), { userFacing: true });
        let next = draft;
        if (plan.success) {
          next = { ...next, combat: withoutEngagements(next.combat, actorId, plan.opponentIds) };
          if (plan.spendsMomentum) next = patchV5(next, actorId, { hasMomentum: false });
        } else for (const id of plan.opponentIds) next = patchV5(next, id, { hasMomentum: true });
        return withLog(next, `Désengagement · ${plan.summary}${input.force === true ? ' (encerclement ignoré par le MJ)' : ''}`, actorId);
      });
    },
    /**
     * Fuite d'un combattant non Brisé (Move, p. 120, 163) : chaque adversaire engagé gagne l'Élan (qu'il peut perdre pour une
     * attaque gratuite, jouée ensuite par le MJ) ; le fuyard gagne 1 Brisé par adversaire engagé (sauf talent Fuite !) et devient
     * Libre. En Bon Ordre : pas d'Élan pour les engagés, le Brisé reste dû. Un combattant Brisé passe par la fuite de Brisé.
     */
    applyFlee(actorId) {
      return api.executeCommand('flee-v5', draft => {
        const people = draft.combat?.participants || [], actor = people.find(row => row.id === actorId);
        if (!actor) throw Object.assign(new Error('Combattant introuvable.'), { userFacing: true });
        const foes = engagedWith(draft.combat, people, actorId).map(id => people.find(row => row.id === id)).filter(person => canBeEngaged(person) && outnumberSide(person) !== outnumberSide(actor));
        if (!foes.length) throw Object.assign(new Error(`${actor.name} n’est engagé avec aucun adversaire : un simple déplacement suffit.`), { userFacing: true });
        const orderly = actor.extensions?.v5?.specialStates?.orderlyDisengage === true, broken = hasFleeTalent(actor) ? 0 : foes.length;
        let next = { ...draft, combat: withoutEngagements(draft.combat, actorId) };
        if (!orderly) for (const foe of foes) next = patchV5(next, foe.id, { hasMomentum: true });
        if (broken) next = { ...next, combat: { ...next.combat, participants: next.combat.participants.map(row => (row.id !== actorId ? row
          : { ...row, states: [...(row.states || []), { id: `flee:${uid()}`, key: 'brise', name: 'Brisé', level: broken, source: { kind: 'rule', page: 163, label: 'Fuite engagée' } }] })) } };
        const names = foes.map(foe => foe.name).join(', ');
        return withLog(next, `Fuite · ${actor.name} fuit ${names}${orderly ? ' (En Bon Ordre : pas d’Élan ni d’attaque gratuite)' : ' : ils gagnent l’Élan et peuvent le perdre pour une attaque gratuite'}${broken ? ` ; ${actor.name} gagne ${broken} Brisé` : ''}.`, actorId);
      });
    },
    getSceneCircumstances() { return { ...(currentEnvelope().extensions?.v5?.sceneCircumstances || {}) }; },
    /** Règle la scène : une clé à `null`/absente de SCENE_KEYS est retirée. */
    setSceneCircumstances(patch = {}) {
      for (const [key, value] of Object.entries(patch)) if (!Object.hasOwn(SCENE_KEYS, key) || (value !== null && value !== undefined && !SCENE_KEYS[key].includes(value)))
        throw Object.assign(new Error(`Circonstance de scène invalide : ${key}.`), { userFacing: true });
      if (!Object.keys(patch).length) return { ok: true, unchanged: true };
      return api.executeCommand('set-scene-circumstances', draft => {
        const scene = { ...(draft.extensions?.v5?.sceneCircumstances || {}) };
        for (const [key, value] of Object.entries(patch)) if (value === null || value === undefined) delete scene[key]; else scene[key] = value;
        return { ...draft, extensions: { ...(draft.extensions || {}), v5: { ...(draft.extensions?.v5 || {}), sceneCircumstances: scene } } };
      });
    },
    /** Positions durables d'un combattant (encerclé, position haute, couvert) : `true` pose, `false`/absent retire. */
    setParticipantPosition(id, patch = {}) {
      if (!participants().some(row => row.id === id)) throw Object.assign(new Error('Combattant introuvable.'), { userFacing: true });
      return api.executeCommand('set-participant-position', draft => {
        const person = draft.combat.participants.find(row => row.id === id), position = { ...(person.extensions?.v5?.position || {}) };
        for (const key of POSITION_KEYS) if (Object.hasOwn(patch, key)) { if (patch[key] === true) position[key] = true; else delete position[key]; }
        return patchV5(draft, id, { position });
      });
    }
  };
}
