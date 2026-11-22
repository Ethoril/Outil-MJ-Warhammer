import { ResolutionError } from '../../core/resolution.js';
import { removedArmourIds } from '../../core/armour-worn.js';
import { locationProtection } from '../../core/equipment.js';
import { creatureSizeOf } from '../../core/creature-size.js';
import { userMessage } from '../messages.js';
import { minusSigned } from '../resolution-panel/dom.js';
import { shownTokenImageOf } from '../../core/token-image.js';
import { tokenThumbnail, tokenImageShortCaption } from '../token-image-picker.js';

export const WORKSPACE_SPACES = Object.freeze(['prepare', 'play', 'campaign', 'library']);

export const SPACE_LABELS = Object.freeze({
  prepare: 'Préparer',
  play: 'Jouer',
  campaign: 'Campagne',
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
// G5-e : une valeur conditionnelle (pièce Partielle, p. 306) est suivie d'un astérisque, la note en fin de résumé (infobulle).
export function armorSummary(armor = {}, precise = null) {
  if (precise) {
    const conditional = precise.conditional || {};
    const text = Object.entries(precise).filter(([,ap])=>ap===null||Number(ap)>0).map(([key,ap])=>`${({head:"T",body:"C",rightArm:"BD",leftArm:"BG",rightLeg:"JD",leftLeg:"JG"})[key] || key}${ap??'?'}${ap!==null&&conditional[key]?'*':''}`).join(" ") || "—";
    return Object.keys(conditional).length ? `${text} (* ${PARTIAL_ARMOUR_NOTE})` : text;
  }
  const parts = [['T', 'head'], ['C', 'body'], ['B', 'arms'], ['J', 'legs']]
    .filter(([, key]) => Number(armor?.[key]) > 0)
    .map(([letter, key]) => `${letter}${Number(armor[key])}`);
  return parts.length ? parts.join(' ') : '—';
}

// L’armure de fiche reste physique. Montrer la protection réellement utilisée
// par le combat quand une prière apporte des PA ou qu’une pièce est ôtée, sans réécrire cette armure.
// G5-e (p. 306) : sans jet de localisation, une pièce Partielle compte pour sa valeur nominale, marquée conditionnelle dans
// `conditional` (propriété non énumérable : { localisation: note }) au lieu de rendre « ? ».
export const PARTIAL_ARMOUR_NOTE = 'Partielle : ignorée sur une localisation paire';
const ARMOUR_LOCATIONS = ['head','body','rightArm','leftArm','rightLeg','leftLeg'];
const PARTIAL_PENDING = 'jet-localisation-requis:partielle';
export function displayedArmorLocations(participant) {
  const prayerAp = (participant.extensions?.v5?.divineEffects || []).some(layer => Object.keys(layer.apModifiers || {}).length);
  const recompute = prayerAp || removedArmourIds(participant).length > 0;
  const hasArmour = Array.isArray(participant.equipment) && participant.equipment.some(item => item?.kind === 'armour');
  if (!recompute && (!hasArmour || !participant.armorLocations)) return participant.armorLocations;
  const conditional = {}, values = {};
  for (const location of ARMOUR_LOCATIONS) {
    const plain = locationProtection(participant, { location });
    const partial = (plain.manual || []).includes(PARTIAL_PENDING);
    if (partial) conditional[location] = PARTIAL_ARMOUR_NOTE;
    // Jet impair : la pièce Partielle est comptée (valeur nominale).
    values[location] = !recompute ? null : (partial ? locationProtection(participant, { location, hitLocationRoll: 1 }).ap : plain.ap) ?? null;
  }
  if (!recompute && !Object.keys(conditional).length) return participant.armorLocations;
  const shown = recompute ? values : { ...participant.armorLocations };
  if (Object.keys(conditional).length) Object.defineProperty(shown, 'conditional', { value: conditional, enumerable: false });
  return shown;
}

// G5-d (R13) : rang de Taille connu (Trait, champ `size`, espèce du PJ) envoyé au moteur quand le MJ n'a rien choisi ;
// une Taille seulement supposée n'est pas envoyée (le moteur la suppose et le rappelle).
export function knownSizeRank(participant) {
  if (!participant) return undefined;
  const size = creatureSizeOf(participant);
  return size.assumed ? undefined : size.rank;
}

// G5-c : où mène le bouton d'ouverture d'une décision de la case « À décider ». Toujours un contrôle visible : le champ
// (lien de la raison), sinon le panneau, sinon la raison ou la carte de décision mise en évidence (`fallback`).
const DECISION_PANELS = Object.freeze({ corruption: '[data-secondary-panel="corruption"]', jugement: '[data-divine-panel]', brise: '.workspace-broken-escape, [data-broken-escape]', familier: '.actor-familiar', peur: '.workspace-action-bar' });
const DECISION_CENTER = Object.freeze({ corruption: 'corruption', jugement: 'prayer' });
const RESOLUTION_DECISIONS = new Set(['maladresse', 'deviation', 'incident-magie', 'questions-etats', 'equipement']);
export function decisionRevealTarget(entry) {
  const card = `[data-decision-id="${String(entry?.id ?? '').replace(/["\\]/g, '\\$&')}"]`;
  if (entry?.kind === 'initiative') return { via: 'initiative', selector: '[data-initiative="board"]', fallback: card };
  if (RESOLUTION_DECISIONS.has(entry?.kind)) return { via: 'resolution', selector: '.workspace-blocking-reason', fallback: '.workspace-resolution', text: entry.detail || entry.titre || '' };
  if (DECISION_PANELS[entry?.kind]) return { via: 'panel', selector: DECISION_PANELS[entry.kind], center: DECISION_CENTER[entry.kind] || null, fallback: card };
  return { via: 'card', selector: card, fallback: card };
}
/** Index de la raison « À saisir avant d'appliquer » qui correspond au détail de la décision ; -1 si aucune. */
export function matchingReasonIndex(texts, detail) {
  const wanted = String(detail || '').trim();
  if (!wanted) return -1;
  const exact = texts.findIndex(text => String(text || '').trim() === wanted);
  if (exact >= 0) return exact;
  const head = wanted.slice(0, 24);
  return texts.findIndex(text => String(text || '').includes(head) || wanted.includes(String(text || '').trim() || '\u0000'));
}

export const hpText = participant => `${minusSigned(participant.hp)}/${participant.maxHp ?? participant.hp}`;

export function hpTone(hp, maxHp) {
  const ratio = maxHp > 0 ? hp / maxHp : (hp > 0 ? 1 : 0);
  return ratio <= 0.25 ? 'crit' : ratio <= 0.5 ? 'warn' : 'ok';
}

/**
 * Barre de PV. `previewLoss` (U5) : PV que l'aperçu de résolution retirerait (previewHpLoss) ; le segment
 * « workspace-hp-loss » couvre la part qui disparaîtrait, à droite des PV restants. Aucun effet sans aperçu.
 */
export function hpBar(participant, previewLoss = 0) {
  const hp = Number(participant.hp) || 0;
  const max = Number(participant.maxHp ?? participant.hp) || 0;
  const pct = value => Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const bar = node('span', `workspace-hp-bar is-${hpTone(hp, max)}`);
  bar.setAttribute('aria-hidden', 'true');
  const fill = node('span', 'workspace-hp-fill');
  const loss = Math.max(0, Math.min(Math.max(hp, 0), Number(previewLoss) || 0));
  fill.style.width = `${pct(hp - loss)}%`;
  bar.appendChild(fill);
  if (loss > 0) {
    const segment = node('span', 'workspace-hp-loss');
    segment.style.left = `${pct(hp - loss)}%`;
    segment.style.width = `${pct(loss)}%`;
    bar.appendChild(segment);
  }
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
  prepare.setAttribute('aria-labelledby', showNavigation ? 'workspace-tab-prepare' : 'tab-prepare');
  root.appendChild(prepare);

  const play = node('section', 'workspace-space workspace-space-play');
  play.id = 'workspace-play';
  play.setAttribute('role', 'tabpanel');
  play.setAttribute('aria-labelledby', showNavigation ? 'workspace-tab-play' : 'tab-combat');
  root.appendChild(play);

  const campaign = node('section', 'workspace-space workspace-space-campaign');
  campaign.id = 'workspace-campaign';
  campaign.setAttribute('role', 'tabpanel');
  campaign.setAttribute('aria-labelledby', showNavigation ? 'workspace-tab-campaign' : 'tab-campaign');
  root.appendChild(campaign);

  const library = node('section', 'workspace-space workspace-space-library');
  library.id = 'workspace-library';
  library.setAttribute('role', 'tabpanel');
  library.setAttribute('aria-labelledby', showNavigation ? 'workspace-tab-library' : 'tab-library');
  root.appendChild(library);

  mount.replaceChildren(root);
  return { root, nav, prepare, play, campaign, library };
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
  // Vignette de l'image qui partira vers la carte, quelle que soit sa provenance (images-pions, CA12) ; absente si elle ne charge pas,
  // et pour un PJ sans image choisie, qui n'envoie rien (la carte garde la sienne).
  const image = shownTokenImageOf(profile);
  const thumb = tokenThumbnail(image, { size: 48, alt: '' });
  const imageNote = tokenImageShortCaption(image);
  const meta = node('p', 'workspace-muted', `${profile.kind || 'Créature'} · Init ${profile.initiative ?? 0} · PV ${profile.hp ?? 0}${profile.favorite ? ' · ★ Favori' : ''}${imageNote ? ` · ${imageNote}` : ''}`);
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
  if (thumb) { const head = node('div', 'workspace-profile-head'); head.append(thumb, title); card.append(head, meta); } else card.append(title, meta);
  if (group) card.appendChild(group);
  if (profile.tags?.length) card.appendChild(node('p', 'workspace-muted', profile.tags.join(' · ')));
  card.appendChild(actions);
  return card;
}
