import { ResolutionError } from '../../core/resolution.js';
import { locationProtection } from '../../core/equipment.js';
import { userMessage } from '../messages.js';
import { minusSigned } from '../resolution-panel/dom.js';

export const WORKSPACE_SPACES = Object.freeze(['prepare', 'play', 'library']);

export const SPACE_LABELS = Object.freeze({
  prepare: 'Préparer',
  play: 'Jouer',
  library: 'Bibliothèque'
});

export const noop = () => {};

/**
 * Sort transmis à l'aperçu d'incantation : le caractère mineur se lit sur le domaine du contrat
 * (« petty » / « elven-petty »), comme dans le moteur de contrats.
 */
export function magicCastingSpell(contract, { spellId = null, lore = null, channelType = 'winds' } = {}) {
  const isPetty = contract?.domain === 'petty' || contract?.domain === 'elven-petty';
  return {
    ...(contract || { id: spellId, name: spellId, cn: 0 }),
    wind: contract?.domain || lore || 'fire',
    type: channelType === 'high' ? 'high' : (isPetty ? 'petty' : 'lore'),
    isPetty
  };
}

export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(label, className = '', attrs = {}) {
  const element = node('button', className, label);
  element.type = 'button';
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export function readProfiles(Store) {
  return typeof Store?.listProfiles === 'function' ? Store.listProfiles() : [];
}

export function readEncounters(Store) {
  return typeof Store?.listEncounters === 'function' ? Store.listEncounters() : [];
}

export function readScenes(Store) {
  return {
    activeScene: typeof Store?.getActiveScene === 'function' ? Store.getActiveScene() : null,
    suspendedScenes: typeof Store?.listSuspendedScenes === 'function' ? Store.listSuspendedScenes() : []
  };
}

export function readParticipants(Store) {
  return typeof Store?.listParticipants === 'function' ? Store.listParticipants() : [];
}

export function readCombat(Store) {
  return typeof Store?.getCombat === 'function'
    ? Store.getCombat()
    : { round: 0, currentActorId: null, participants: new Map() };
}

// Clé du tour en cours : change au tour suivant, au début du combat ou s'il est recommencé.
export const turnKey = combat => `${Number(combat.round) || 0}:${combat.currentActorId || ''}`;

export const STATE_NAMES = Object.freeze(['À Terre', 'Sonné', 'Inconscient', 'Aveuglé', 'Assourdi', 'Exténué', 'Hémorragique', 'Surpris', 'Enchevêtré', 'Enflammé', 'Brisé', 'Empoisonné', 'Souillé']);
// Level matters for these every turn, so it stays visible even at 1.
export const LEVELLED_STATES = new Set(['hemorragique', 'enflamme']);

export function stateLabel(state) {
  const level = state.level > 1 || LEVELLED_STATES.has(state.key) ? ` ${state.level}` : '';
  const expiry = state.v5Timing?.expiry;
  return `${state.name || 'État'}${level}${expiry ? ` · ${expiry.phase === 'startOfTurn' ? 'début Tour' : expiry.phase === 'endOfTurn' ? 'fin Tour' : 'fin Round'} R${expiry.round}` : state.duration ? ` · ${state.duration} t` : ''}`;
}

export const toughnessBonus = participant => Math.floor((Number(participant?.caracs?.E) || 0) / 10);

// PA non nuls : Tête, Corps, Bras, Jambes.
export function armorSummary(armor = {}, precise = null) {
  if (precise) return Object.entries(precise).filter(([,ap])=>ap===null||Number(ap)>0).map(([key,ap])=>`${({head:"T",body:"C",rightArm:"BD",leftArm:"BG",rightLeg:"JD",leftLeg:"JG"})[key] || key}${ap??'?'}`).join(" ") || "—";
  const parts = [['T', 'head'], ['C', 'body'], ['B', 'arms'], ['J', 'legs']]
    .filter(([, key]) => Number(armor?.[key]) > 0)
    .map(([letter, key]) => `${letter}${Number(armor[key])}`);
  return parts.length ? parts.join(' ') : '—';
}

// L’armure de fiche reste physique. Montrer la protection réellement utilisée
// par le combat quand une prière apporte des PA, sans réécrire cette armure.
export function displayedArmorLocations(participant) {
  if (!(participant.extensions?.v5?.divineEffects || []).some(layer => Object.keys(layer.apModifiers || {}).length)) return participant.armorLocations;
  return Object.fromEntries(['head','body','rightArm','leftArm','rightLeg','leftLeg'].map(location => [location, locationProtection(participant,{location}).ap ?? null]));
}

export const hpText = participant => `${minusSigned(participant.hp)}/${participant.maxHp ?? participant.hp}`;

export function hpTone(hp, maxHp) {
  const ratio = maxHp > 0 ? hp / maxHp : (hp > 0 ? 1 : 0);
  return ratio <= 0.25 ? 'crit' : ratio <= 0.5 ? 'warn' : 'ok';
}

export function hpBar(participant) {
  const hp = Number(participant.hp) || 0;
  const max = Number(participant.maxHp ?? participant.hp) || 0;
  const bar = node('span', `workspace-hp-bar is-${hpTone(hp, max)}`);
  bar.setAttribute('aria-hidden', 'true');
  const fill = node('span', 'workspace-hp-fill');
  fill.style.width = `${Math.max(0, Math.min(100, max > 0 ? (hp / max) * 100 : 0))}%`;
  bar.appendChild(fill);
  return bar;
}

// Clé du brouillon → nom du jet attendu par le moteur (criticalRolls).
export const CRITICAL_ERROR_FIELDS = Object.freeze({ criticalInjureRoll:'injureEffect',criticalInjureSecondRoll:'injureSecondEffect',criticalInjureAlternativeRoll:'injureEffectAlternative',criticalInjureSecondAlternativeRoll:'injureSecondEffectAlternative',criticalLocationRoll: 'location', criticalEffectRoll: 'effect', criticalSecondRoll: 'secondEffect', criticalEffectAlternativeRoll: 'effectAlternative', criticalSecondAlternativeRoll: 'secondEffectAlternative' });
export const DEFENDER_CRITICAL_FIELDS = Object.freeze({ defenderCriticalSecondRoll:'secondEffect',defenderCriticalSecondAlternativeRoll:'secondEffectAlternative',defenderCriticalInjureSecondRoll:'injureSecondEffect',defenderCriticalInjureSecondAlternativeRoll:'injureSecondEffectAlternative',defenderCriticalInjureRoll:'injureEffect',defenderCriticalInjureAlternativeRoll:'injureEffectAlternative',defenderCriticalLocationRoll: 'location', defenderCriticalEffectRoll: 'effect', defenderCriticalEffectAlternativeRoll: 'effectAlternative' });
export const criticalRollError = () => userMessage(new ResolutionError('Jet invalide', 'INVALID_ROLL'), 'Jet invalide.');

// D-18 : distance et visibilité de dissipation viennent de la saisie ; absentes, elles restent absentes (aucun repli à 0 ni « non »).
export const dispelDistance = value => Number.isFinite(value) ? value : undefined;
export const dispelVisible = value => value === true || value === 'true' ? true : value === false || value === 'false' ? false : undefined;

export function validRoll(value) {
  const text = String(value ?? '').trim();
  const roll = Number(text);
  return text === '00' || (Number.isInteger(roll) && roll >= 1 && roll <= 100);
}

// Jet de critique tapé mais absent de l'aperçu affiché (ou invalide) : il faut recalculer avant d'appliquer.
export function criticalRollsChanged(draft) {
  return [[CRITICAL_ERROR_FIELDS, draft.preview?.input?.criticalRolls], [DEFENDER_CRITICAL_FIELDS, draft.preview?.input?.defenderCriticalRolls]].some(([fields, shown = {}]) =>
    Object.entries(fields).some(([key, name]) => {
      const raw = String(draft[key] ?? '').trim();
      if (raw && !validRoll(raw)) return true;
      const typed = raw ? (raw === '00' ? 100 : Number(raw)) : null;
      return typed !== (shown?.[name] ?? null);
    }));
}

export function profileSearchText(profile = {}) {
  const actions = (profile.diceLines || profile.actions || []).flatMap(action => [
    action?.name, action?.note, action?.attr, action?.base,
    ...(action?.qualities || []).flatMap(quality => [quality?.name, quality?.id, quality])
  ]);
  return [profile.name, profile.group, profile.kind, profile.notes, ...(profile.tags || []), ...actions, ...(profile.skills || []).map(row=>row.name), ...(profile.talents || []).map(row=>row.name || row.nom), ...(profile.equipment || []).flatMap(row=>[row.name,...(row.keywords || []).map(word=>word.id)])]
    .filter(value => value !== undefined && value !== null)
    .join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function createShell(mount, { showNavigation = true } = {}) {
  const root = node('section', 'workspace-view');
  root.setAttribute('aria-label', 'Espace de séance');

  const nav = showNavigation ? node('nav', 'workspace-nav') : null;
  if (nav) {
    nav.setAttribute('aria-label', 'Espaces de séance');
    nav.setAttribute('role', 'tablist');
    WORKSPACE_SPACES.forEach(space => {
      const tab = button(SPACE_LABELS[space], 'workspace-tab', {
        'data-workspace-space': space,
        'role': 'tab',
        'aria-controls': `workspace-${space}`
      });
      nav.appendChild(tab);
    });
    root.appendChild(nav);
  }

  const prepare = node('section', 'workspace-space workspace-space-prepare');
  prepare.id = 'workspace-prepare';
  prepare.setAttribute('role', 'tabpanel');
  prepare.setAttribute('aria-labelledby', 'workspace-tab-prepare');
  root.appendChild(prepare);

  const play = node('section', 'workspace-space workspace-space-play');
  play.id = 'workspace-play';
  play.setAttribute('role', 'tabpanel');
  play.setAttribute('aria-labelledby', 'workspace-tab-play');
  root.appendChild(play);

  const library = node('section', 'workspace-space workspace-space-library');
  library.id = 'workspace-library';
  library.setAttribute('role', 'tabpanel');
  library.setAttribute('aria-labelledby', 'workspace-tab-library');
  root.appendChild(library);

  mount.replaceChildren(root);
  return { root, nav, prepare, play, library };
}

export function profileSummary(profile, {
  canEdit = true,
  canDuplicate = false,
  canRemove = false,
  onEdit = null,
  onDuplicate = null,
  onRemove = null
} = {}) {
  const card = node('article', 'workspace-profile-card');
  card.dataset.profileId = profile.id;
  const title = node('h3', '', profile.name || 'Sans-nom');
  const meta = node('p', 'workspace-muted', `${profile.kind || 'Créature'} · Init ${profile.initiative ?? 0} · PV ${profile.hp ?? 0}${profile.favorite ? ' · ★ Favori' : ''}`);
  const group = profile.group ? node('p', 'workspace-tag', profile.group) : null;
  const actions = node('div', 'workspace-inline-actions');
  const profileName = profile.name || 'Sans-nom';
  const edit = button('Modifier', 'workspace-secondary', { 'aria-label': `Modifier ${profileName}`, 'data-focus-key': `edit-profile-${profile.id}` });
  edit.dataset.workspaceAction = 'edit-profile';
  edit.dataset.profileId = profile.id;
  edit.disabled = !canEdit;
  if (!canEdit) edit.title = 'Action indisponible';
  if (onEdit) edit.addEventListener('click', event => {
    event.stopPropagation();
    onEdit(profile.id);
  });
  // The controller may omit editing when the current Store is read-only.
  actions.appendChild(edit);
  if (canDuplicate) {
    const duplicate = button('Dupliquer', 'workspace-secondary', { 'aria-label': `Dupliquer ${profileName}`, 'data-focus-key': `duplicate-profile-${profile.id}` });
    duplicate.dataset.workspaceAction = 'duplicate-profile';
    duplicate.dataset.profileId = profile.id;
    if (onDuplicate) duplicate.addEventListener('click', event => {
      event.stopPropagation();
      onDuplicate(profile.id);
    });
    actions.appendChild(duplicate);
  }
  if (canRemove) {
    const remove = button('Supprimer', 'workspace-secondary', { 'aria-label': `Supprimer ${profileName}`, 'data-focus-key': `remove-profile-${profile.id}` });
    remove.dataset.workspaceAction = 'remove-profile';
    remove.dataset.profileId = profile.id;
    if (onRemove) remove.addEventListener('click', event => {
      event.stopPropagation();
      onRemove(profile.id);
    });
    actions.appendChild(remove);
  }
  card.append(title, meta);
  if (group) card.appendChild(group);
  if (profile.tags?.length) card.appendChild(node('p', 'workspace-muted', profile.tags.join(' · ')));
  card.appendChild(actions);
  return card;
}
