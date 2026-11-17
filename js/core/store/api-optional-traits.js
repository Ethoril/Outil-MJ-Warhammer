// Traits optionnels du profil de Réserve (chantier docs/specs/traits-optionnels, lot L5) : une commande annulable, journalisée,
// qui n'écrit que le profil. Les participants déjà en rencontre ne changent pas (D2) ; ceux ajoutés ensuite passent par
// `applyOptionalChoices` à leur création (store.js, `participantFromProfile`).
import { uid } from '../models.js';
import { readOptionalChoices } from '../optional-traits.js';
import { catalogueTraitOf } from '../../data/creature-trait-catalogue.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const refuse = (reason, message) => ({ ok: false, reason, message });
const isEmpty = choices => !choices.traits.length && !choices.attacks.length && !choices.armour.length;

/** Libellé court d'une coche de Trait pour le journal : « Pisteur », « Dressé (War) ». */
const traitLabel = item => {
  const name = catalogueTraitOf(item.name)?.nameFr || item.name;
  const param = String(item.param ?? '').trim();
  return param ? `${name} (${param})` : name;
};

export function createOptionalTraitsApi({ api, currentEnvelope }) {
  return {
    /**
     * Remplace les coches d'un profil de Réserve (`{ traits, attacks, armour }`, forme de optional-traits.js). Tout vide retire la clé :
     * le profil redevient celui d'avant les coches. Refus d'un profil inconnu, d'un PJ ou d'une forme invalide ; une révision périmée lève
     * la même erreur que `updateProfile`.
     */
    setProfileOptionalChoices(profileId, choices, { expectedLocalRevision } = {}) {
      const assertRevision = actual => {
        if (expectedLocalRevision !== undefined && expectedLocalRevision !== actual) throw Object.assign(new Error('La séance a changé pendant l’enregistrement. Votre saisie est conservée : vérifiez les données actualisées, puis réessayez.'), { code: 'LOCAL_EDIT_STALE', userFacing: true });
      };
      const envelope = currentEnvelope();
      assertRevision(envelope.localRevision);
      const profile = (envelope.reserve || []).find(row => row.id === profileId);
      if (!profile) return refuse('unknown-profile', 'Profil introuvable.');
      if (profile.kind === 'PJ') return refuse('pj', 'Les Traits optionnels ne s’appliquent pas à un PJ.');
      if (!isRecord(choices)) return refuse('invalid-choices', 'Traits optionnels illisibles : un objet { traits, attacks, armour } est attendu.');
      const captured = readOptionalChoices({ extensions: { v5: { optionalChoices: choices } } });
      const labels = captured.traits.map(traitLabel).concat(captured.attacks.map(row => row.name), captured.armour.map(row => row.name)).filter(Boolean);
      const result = api.executeCommand('set-optional-choices', draft => {
        assertRevision(draft.localRevision);
        const reserve = (draft.reserve || []).map(row => {
          if (row.id !== profileId) return row;
          const { optionalChoices, ...v5 } = row.extensions?.v5 || {};
          return { ...row, extensions: { ...(row.extensions || {}), v5: isEmpty(captured) ? v5 : { ...v5, optionalChoices: captured } } };
        });
        const text = `Réserve : Traits optionnels de ${profile.name} : ${labels.length ? labels.join(', ') : 'aucun'} (rencontres suivantes seulement).`;
        return { ...draft, reserve, log: [{ id: uid(), ts: Date.now(), kind: 'management', actorId: null, targetId: null, text, detail: null }, ...(draft.log || [])].slice(0, 300) };
      });
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true })) : { ...result, ok: true };
    }
  };
}
