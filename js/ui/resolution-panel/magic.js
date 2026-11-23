import { node, rubric, outcomePill, signed, isMiscastDistanceD100 } from './dom.js';
import { spellChoices } from '../../core/magic-lists.js';
import { renderConditionQuestions, renderConditionDetail } from './condition-questions.js';
import { renderObstinateChoice, renderSourceDetail } from '../test-questions.js';
import { getSpellContract, getAllSpellContracts, getContractChoiceOptions } from '../../core/v5-spell-contracts.js';
import { getChannellingReserve } from '../../core/v5-magic-channelling.js';
import { renderMagicControls, renderSpellRecipientControls } from '../v5-magic-controls.js';
import { renderSpellOptions, clearVortexTestTalents, vortexSelectedTalents } from '../v5-spell-options.js';
import { ARCANE_ARMOR_LOCATIONS } from '../../core/v5-magic-arcane-unforgiving.js';
import { DURATION_UNIT_LABELS, parseSpellDuration } from '../../core/v5-magic-effects.js';
import { d100 } from '../../core/dice.js';
import { spellFormulaValue } from '../../core/v5-magic-effects.js';
import { getOvercastBenefit } from '../../core/v5-magic-casting.js';
import { IMPACT_LABEL_MAX } from '../../core/map-link-protocol.js';
export { IMPACT_LABEL_MAX };

// Passe G, G4 (R16, option B du MJ) : point d'impact d'un sort de zone, choisi d'un clic sur la carte (contrat de liaison
// §10.1, version 3) ou, sans carte, par la liste des combattants actifs à cocher. Le moteur des sorts ne change pas : les
// cochés partent par le chemin existant (`magicTargetIds`).
let mapImpactProvider = null;
/** Branché par `main.js` (bloc de la liaison) : `{ connected(), pending(), query({ label, radiusCells, caster, candidates }), cancel(queryId) }`. */
export function setMapImpactProvider(provider) { mapImpactProvider = provider && typeof provider.query === 'function' ? provider : null; }

/** Sort de zone : même lecture que le moteur (`hasAoeEffect`, v5-spell-contracts.js). */
export function spellHasZone(contract) {
  if (!contract) return false;
  return /zde|zone|aoe/i.test(String(contract.target || '')) || Boolean(contract.effects?.aoe);
}

const foldText = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Grandeurs nommées dans la cible « ZdE … mètres » d'un contrat ; un Bonus est la dizaine de la Caractéristique. */
const ZONE_MEASURES = [
  [/moitie de la force mentale/, actor => spellFormulaValue('FM', actor) / 2],
  [/bonus de force mentale/, actor => spellFormulaValue('BFM', actor)],
  [/force mentale/, actor => spellFormulaValue('FM', actor)],
  [/bonus de sociabilite/, actor => spellFormulaValue('BSoc', actor)],
  [/bonus d.intelligence/, actor => spellFormulaValue('BIntelligence', actor)],
  [/bonus d.initiative/, actor => spellFormulaValue('BInitiative', actor)],
  [/initiative/, actor => spellFormulaValue('I', actor)],
  [/bonus de ct/, actor => Math.floor(spellFormulaValue('CT', actor) / 10)]
];

/**
 * Rayon de la zone en mètres (yards = mètres) : la cible du contrat (« ZdE Bonus de Force Mentale mètres »,
 * « ZdE 2 × Bonus de Force Mentale mètres »…) lue pour le lanceur, multipliée par le palier de surpuissance « Zone » du
 * moteur (`getOvercastBenefit`). Zone non chiffrée en mètres (Spécial, miles, plusieurs zones, aura « Vous ») : `meters: null`,
 * le MJ saisit le rayon.
 */
export function zoneRadius(contract, actor, overcastAoe = 0) {
  const multiplier = getOvercastBenefit('aoe', overcastAoe)?.multiplier || 1;
  const text = foldText(contract?.target);
  const at = text.indexOf('zde');
  const clause = at < 0 || /\d\s*[×x]\s*zde/.test(text) ? null : text.slice(at + 3);
  let base = null;
  if (clause !== null && /metres?/.test(clause)) {
    const measure = ZONE_MEASURES.find(([pattern]) => pattern.test(clause));
    const factor = Number(/(\d+)\s*[×x]/.exec(clause)?.[1] || 1);
    const value = measure ? factor * measure[1](actor || {}) : NaN;
    base = Number.isFinite(value) && value >= 0 ? value : null;
  }
  return { meters: base === null ? null : base * multiplier, base, multiplier };
}

const isActive = participant => participant?.zone === 'active';
const pointImpactMode = (draft, contract) => draft?.magicImpactMode === true && spellHasZone(contract);

/**
 * Modèle des cibles d'un sort de zone. `available` : le sort a une zone (G4-a). `mode` : 'combatant' (cible d'aujourd'hui)
 * ou 'impact'. `radius` : rayon en mètres, saisi par le MJ (`magicImpactRadius`) ou lu au contrat. `candidates` : les
 * combattants actifs, cochés s'ils sont dans `magicTargetIds` (rien de précoché sans réponse de la carte). `canQueryMap` :
 * carte connectée, en point d'impact. `waiting` : la liaison attend encore la demande notée dans le brouillon.
 */
export function zoneTargetModel({ contract, actor, participants = [], draft = {}, mapConnected = false, pendingQueryId = null }) {
  if (!spellHasZone(contract)) return { available: false, mode: 'combatant', radius: null, candidates: [], canQueryMap: false, waiting: false, impact: null };
  const mode = pointImpactMode(draft, contract) ? 'impact' : 'combatant';
  const computed = zoneRadius(contract, actor, draft.magicOvercastAoe);
  const manual = Number(draft.magicImpactRadius);
  const radius = draft.magicImpactRadius != null && draft.magicImpactRadius !== '' && Number.isFinite(manual) && manual >= 0
    ? { ...computed, meters: manual, manual: true } : { ...computed, manual: false };
  const checked = new Set(Array.isArray(draft.magicTargetIds) ? draft.magicTargetIds : []);
  const candidates = participants.filter(isActive).map(row => ({ id: row.id, name: row.name, checked: checked.has(row.id) }));
  const canQueryMap = mode === 'impact' && mapConnected === true;
  const waiting = canQueryMap && draft.magicImpact?.status === 'waiting' && pendingQueryId != null && draft.magicImpact.queryId === pendingQueryId;
  return { available: true, mode, radius, candidates, canQueryMap, waiting, impact: mode === 'impact' && draft.magicImpact?.status === 'placed' ? draft.magicImpact : null };
}

/** Cibles qui partent au moteur : en point d'impact, les seuls cochés (aucun = sort sans cible) ; sinon le défaut d'aujourd'hui. */
export function castTargetIds(draft = {}, defaults = []) {
  if (draft.magicImpactMode === true) return Array.isArray(draft.magicTargetIds) ? [...draft.magicTargetIds] : [];
  return Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length ? draft.magicTargetIds : defaults;
}

/**
 * Réponse de la liaison à la demande notée dans le brouillon : cochés = `ids` (participants actifs des `refs`), point
 * d'impact noté ; abandon (`cancelled`, déconnexion, demande remplacée ou retirée) : retour au choix manuel, cochés gardés.
 * Réponse à une autre demande : `null`.
 */
export function impactAnswerPatch(draft = {}, answer = {}) {
  if (!draft.magicImpact || answer?.queryId == null || draft.magicImpact.queryId !== answer.queryId) return null;
  if (!answer.ok) return { magicImpact: null };
  const ids = Array.isArray(answer.ids) ? [...answer.ids] : [];
  return { magicTargetIds: ids, magicImpact: { status: 'placed', queryId: answer.queryId, levelId: answer.levelId ?? null, cell: answer.cell ?? null, count: ids.length } };
}

/**
 * Demande en attente sur la carte : dernier rendu de son bandeau. Si le bandeau quitte l'écran (panneau fermé, autre
 * action ou autre lanceur, résolution effacée), `mj.impactCancel` part (contrat §10.1, G4-d).
 */
let impactWatch = null;
let impactObserver = null;
function stopImpactWatch() {
  impactObserver?.disconnect();
  impactObserver = null;
  impactWatch = null;
}
function impactBannerGone() {
  const element = impactWatch?.element;
  return !element || !element.isConnected || (typeof element.checkVisibility === 'function' && !element.checkVisibility());
}
function checkImpactWatch() {
  if (!impactWatch) return;
  if (mapImpactProvider?.pending?.() !== impactWatch.queryId) { stopImpactWatch(); return; }
  if (!impactBannerGone()) return;
  const { queryId } = impactWatch;
  stopImpactWatch();
  mapImpactProvider.cancel(queryId);
}
function watchImpactBanner(queryId, element, draft, handlers) {
  if (impactWatch?.queryId !== queryId) stopImpactWatch();
  impactWatch = { queryId, element, draft, handlers };
  if (impactObserver || typeof MutationObserver !== 'function' || typeof document === 'undefined') return;
  impactObserver = new MutationObserver(() => { if (impactBannerGone()) setTimeout(checkImpactWatch, 0); });
  impactObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open', 'class', 'style'] });
}
/** Retire la demande en cours de ce brouillon (Annuler, autre sort, retour à « Combattant »). */
function withdrawImpact(draft) {
  const queryId = draft?.magicImpact?.queryId;
  if (queryId != null && mapImpactProvider?.pending?.() === queryId) mapImpactProvider.cancel(queryId);
  if (impactWatch?.queryId === queryId) stopImpactWatch();
}

/** Cible d'un sort de zone (G4) : « Combattant » ou « Point d'impact (case) », rayon, carte, liste des actifs à cocher. */
function renderZoneTargets({ contract, actor, participants, draft, handlers }) {
  const connected = mapImpactProvider?.connected?.() === true;
  const model = zoneTargetModel({ contract, actor, participants, draft, mapConnected: connected, pendingQueryId: mapImpactProvider?.pending?.() ?? null });
  if (!model.available) return null;
  const box = node('div', 'workspace-magic-zone');
  box.dataset.magicZone = model.mode;
  // Une seule ligne de tête (le panneau Magie est bas) : mode, rayon, carte ou attente ; l'état passe dans la légende.
  const head = node('div', 'workspace-magic-zone-line');
  box.appendChild(head);
  const modes = node('div', 'workspace-magic-zone-modes');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Cible du sort de zone');
  for (const [mode, text, title] of [['combatant', 'Combattant', 'Le sort vise le combattant choisi comme cible'],
    ['impact', 'Point d’impact (case)', 'Le sort vise une case, même vide : cochez les combattants pris dans la zone']]) {
    const choice = node('button', 'workspace-chip', text);
    choice.type = 'button';
    choice.title = title;
    choice.dataset.impactMode = mode;
    choice.setAttribute('aria-pressed', String(model.mode === mode));
    choice.addEventListener('click', () => {
      if (model.mode === mode) return;
      withdrawImpact(draft);
      handlers.select({ magicImpactMode: mode === 'impact', magicTargetIds: [], magicImpact: null });
    });
    modes.appendChild(choice);
  }
  head.appendChild(modes);
  if (model.mode !== 'impact') return box;

  const radiusLine = head;
  const radiusLabel = node('label', 'workspace-type workspace-magic-zone-radius', 'Rayon');
  const radiusInput = document.createElement('input');
  radiusInput.type = 'number';
  radiusInput.min = '0';
  radiusInput.step = 'any';
  radiusInput.value = model.radius.meters ?? '';
  radiusInput.placeholder = 'à saisir';
  radiusInput.setAttribute('aria-label', 'Rayon de la zone (m)');
  radiusInput.dataset.focusKey = 'magic-impact-radius';
  // La saisie ne redessine pas le panneau (focus gardé) : le bouton de la carte relit le champ.
  const typedRadius = () => { const value = radiusInput.value === '' ? null : Number(radiusInput.value); return Number.isFinite(value) && value >= 0 ? value : null; };
  let ask = null;
  radiusInput.addEventListener('input', () => {
    handlers.input('magicImpactRadius', radiusInput.value === '' ? null : Number(radiusInput.value));
    if (ask) ask.disabled = typedRadius() === null || Boolean(draft.busy);
  });
  radiusLabel.append(radiusInput, ' m');
  // Source du rayon en infobulle (le résumé du contrat, sous le bloc, redit la cible « ZdE … »).
  radiusLabel.title = model.radius.manual ? 'Rayon saisi par le MJ'
    : model.radius.meters === null ? `Zone non chiffrée en mètres (contrat : ${contract.target}) : saisir le rayon`
      : `Contrat : ${contract.target}${model.radius.multiplier > 1 ? ` · surpuissance Zone ×${model.radius.multiplier}` : ''}`;
  radiusLine.appendChild(radiusLabel);

  if (model.waiting) {
    const banner = node('span', 'workspace-magic-zone-waiting', 'Clique une case sur la carte…');
    banner.setAttribute('role', 'status');
    banner.dataset.impactWaiting = draft.magicImpact.queryId;
    const cancel = node('button', 'workspace-ghost', 'Annuler');
    cancel.type = 'button';
    cancel.dataset.impactCancel = '';
    cancel.title = 'Ne plus attendre le clic sur la carte';
    cancel.addEventListener('click', () => { withdrawImpact(draft); handlers.select({ magicImpact: null }); });
    banner.appendChild(cancel);
    radiusLine.appendChild(banner);
    watchImpactBanner(draft.magicImpact.queryId, banner, draft, handlers);
  } else if (model.canQueryMap) {
    ask = node('button', 'workspace-secondary', 'Choisir sur la carte');
    ask.type = 'button';
    ask.dataset.impactQuery = '';
    ask.disabled = model.radius.meters === null || Boolean(draft.busy);
    ask.title = 'Cliquer une case sur l’écran MJ de la carte (rayon en cases = mètres) ; sans rayon, le saisir d’abord';
    ask.addEventListener('click', () => {
      const meters = typedRadius();
      if (meters === null) return;
      const query = mapImpactProvider.query({ label: (contract.name || 'Sort').slice(0, IMPACT_LABEL_MAX), radiusCells: meters, caster: actor,
        candidates: participants.filter(isActive) });
      if (query?.queryId == null) { handlers.select({ magicImpact: null }); return; }
      handlers.select({ magicImpact: { status: 'waiting', queryId: query.queryId } });
      Promise.resolve(query.answer).then(answer => {
        // Bandeau encore à l'écran : la réponse est appliquée et le panneau redessiné. Sinon (panneau fermé entre-temps),
        // le brouillon est seulement remis au choix manuel, sans redessiner une autre action.
        const watch = impactWatch?.queryId === query.queryId ? impactWatch : null;
        if (watch) stopImpactWatch();
        const patch = impactAnswerPatch(watch?.draft || draft, answer);
        if (!patch) return;
        if (watch) watch.handlers.select({ ...patch, keepChoice: true });
        else Object.assign(draft, { magicImpact: null });
      });
    });
    radiusLine.appendChild(ask);
  }

  // Combattants dans la zone, sur une ligne (le panneau Magie n'a pas la hauteur d'une liste de 20 cases) : les cochés en
  // puces (un clic retire), les autres actifs dans « + ajouter… ».
  const list = node('div', 'workspace-magic-zone-targets');
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Combattants dans la zone');
  list.dataset.impactTargets = '';
  const legend = node('span', 'workspace-magic-zone-legend', 'Dans la zone :');
  if (model.impact) {
    const placed = node('span', 'workspace-muted workspace-magic-zone-placed', ' (carte)');
    placed.title = `Point d’impact choisi sur la carte : ${model.impact.count} combattant${model.impact.count > 1 ? 's' : ''} dans la zone, tous décochables`;
    placed.dataset.impactPlaced = String(model.impact.count);
    legend.appendChild(placed);
  }
  list.appendChild(legend);
  const current = () => (Array.isArray(draft.magicTargetIds) ? draft.magicTargetIds : []);
  const chosen = model.candidates.filter(row => row.checked), others = model.candidates.filter(row => !row.checked);
  if (!chosen.length) {
    const none = node('span', 'workspace-muted workspace-magic-zone-none', 'personne : sort sans cible');
    none.dataset.impactNone = '';
    list.appendChild(none);
  }
  for (const row of chosen) {
    const chip = node('button', 'workspace-chip workspace-magic-zone-target', row.name);
    chip.type = 'button';
    chip.title = `${row.name} : cliquer pour le retirer de la zone`;
    chip.setAttribute('aria-pressed', 'true');
    chip.setAttribute('aria-label', `Retirer de la zone : ${row.name}`);
    chip.dataset.impactTarget = row.id;
    chip.dataset.focusKey = `magic-impact-target-${row.id}`;
    chip.addEventListener('click', () => handlers.select({ magicTargetIds: current().filter(id => id !== row.id) }));
    list.appendChild(chip);
  }
  if (others.length) {
    const add = document.createElement('select');
    add.className = 'workspace-magic-zone-add';
    add.setAttribute('aria-label', 'Ajouter dans la zone');
    add.dataset.focusKey = 'magic-impact-add';
    add.append(new Option('+ ajouter…', ''), ...others.map(row => new Option(row.name, row.id)));
    add.addEventListener('change', () => { if (add.value) handlers.select({ magicTargetIds: [...new Set([...current(), add.value])] }); });
    list.appendChild(add);
  }
  box.appendChild(list);
  return box;
}
// Dé manquant de l'incident (cœur) → champ du panneau qui le porte.
export const MISCAST_DIE_FIELDS = Object.freeze({ duration: 'magicSecondaryDurationRoll', strength: 'magicSecondaryDurationRoll', damage: 'magicSecondaryDamageRoll', distance: 'magicSecondaryDistanceRoll' });
// Recette G-U1-2 : le dé secondaire réclamé par l'incident est lancé avec les dés des PNJ et désigné par « À saisir ».
function tagMiscastDie(input, key, incident) {
  const die = Object.keys(MISCAST_DIE_FIELDS).find(name => MISCAST_DIE_FIELDS[name] === key && incident?.missingSecondaryDice?.includes(name));
  if (!die) return;
  input.dataset.blockingField = 'magic-secondary';
  input.dataset.npcRollKey = key; input.dataset.npcRollOwner = 'actor';
  input.dataset.npcRollField = incident.missingSecondaryDiceKinds?.[die] || 'd10';
}
// Passe G, G3-a (R15) : dés de l'incantation affichés hors du repli « Options », et seulement quand le moteur les réclame.
const REQUESTED_DICE = Object.freeze({
  magicMiscastRoll: ['Jet d’incident si double / maladresse (1d100)', 100],
  magicMajorRoll: ['Jet Majeur d’incident si cascade (1d100)', 100],
  magicSecondaryDurationRoll: ['Dé secondaire : Durée / États (1d10 ou 2d10)', 20],
  magicSecondaryDamageRoll: ['Dé secondaire : Dégâts / Perte (1d10)', 10],
  magicSecondaryDistanceRoll: ['Dé secondaire : Distance (1d10 ou 1d100)', 100]
});
/**
 * Champs du brouillon que l'incantation réclame maintenant : jet d'incident sur un double ou une maladresse (V5 p. 237),
 * jet Majeur et dés secondaires que l'incident déclare manquants (`missing`, `missingSecondaryDice`), membre gelé demandé ;
 * un dé déjà saisi reste en vue. Le reste des réglages du sort est dans le repli « Options ».
 */
export function requestedMagicDice(draft = {}) {
  const pv = draft.preview, incident = pv?.castPreview?.miscast || pv?.miscast;
  const missing = [pv?.missing, pv?.castPreview?.missing, pv?.spellPreview?.missing].flat().filter(Boolean);
  const roll = Number(draft.attackRoll), keys = new Set();
  if ((roll > 0 && roll % 11 === 0) || roll === 100 || incident || missing.includes('miscastRoll') || draft.magicMiscastRoll != null) keys.add('magicMiscastRoll');
  if (missing.includes('majorRoll') || incident?.missingSecondaryDice?.includes('majorRoll') || draft.magicMajorRoll != null) keys.add('magicMajorRoll');
  for (const die of incident?.missingSecondaryDice || []) if (MISCAST_DIE_FIELDS[die]) keys.add(MISCAST_DIE_FIELDS[die]);
  for (const key of ['magicSecondaryDurationRoll', 'magicSecondaryDamageRoll', 'magicSecondaryDistanceRoll']) if (draft[key] != null) keys.add(key);
  if (incident?.missingSecondaryDice?.includes('location') || draft.magicSecondaryLocation) keys.add('magicSecondaryLocation');
  return [...keys];
}
const FROZEN_LIMBS = [['', '— Membre gelé (si incident) —'], ['Bras principal', 'Bras principal'], ['Bras secondaire', 'Bras secondaire'], ['Jambe gauche', 'Jambe gauche'], ['Jambe droite', 'Jambe droite']];
/** Un ancien repli devient un groupe à plat dans « Options » (un seul repli), titre gardé en tête. */
function flatGroup(title, ...children) {
  const group = node('div', 'workspace-magic-options-group');
  group.append(node('p', 'workspace-res-label workspace-magic-options-title', title), ...children.filter(Boolean));
  return group;
}

export function missingMagicDice(preview) {
  if (!preview) return false;
  return [preview.missing, preview.spellPreview?.missing, preview.castPreview?.missing, preview.castPreview?.miscast?.missingSecondaryDice, preview.miscast?.missingSecondaryDice]
    .some(list => Array.isArray(list) && list.length > 0);
}

/** Sort proposé par défaut : le premier du lanceur, sinon Carreau. */
export function defaultMagicSpellId(draft, actor) {
  if (draft.magicSpellId) return draft.magicSpellId;
  const first = (actor.spells || [])[0];
  const contract = first && (getSpellContract(first.id) || getSpellContract(first.name || first.nom || first));
  const allContracts = getAllSpellContracts();
  return (first && (contract?.id || first.id || first.name || first.nom)) || allContracts.find(c => c.name === 'Carreau')?.id || allContracts[0]?.id || '';
}

/** Cibles du sort : celles cochées, sinon la cible par défaut du contrat (un brouillon vide vaut « par défaut »). */
export function magicTargetIdsOf(draft, contract, actor, target, participants) {
  // G4 : en point d'impact, les seuls cochés, même aucun.
  if (pointImpactMode(draft, contract)) return castTargetIds(draft);
  if (Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length) return draft.magicTargetIds;
  const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
  const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
  if(contract?.effects?.excludeCaster)return [(target&&target.id!==actor.id?target:participants.find(p=>p.id!==actor.id&&p.zone==='active'))?.id].filter(Boolean);
  if (isSelfSpell) return [actor.id];
  if (contract?.effects?.special === 'monstrous-regiment') {
    const firstAlly = participants.find(p => p.id !== actor.id && p.camp === actor.camp);
    return firstAlly ? [firstAlly.id] : [];
  }
  if (isAllyOnlySpell) return target && (target.id === actor.id || target.camp === actor.camp) ? [target.id] : [actor.id];
  return target ? [target.id] : [actor.id];
}

export function renderV5MagicContext({ actor, participants = [], target, type, draft, handlers, getObstinateStatus, getObstinateIdentity }) {
  const v5 = node('div', 'workspace-v5-context workspace-v5-magic');
  const reserve = getChannellingReserve(actor);
  const reserveLabel = reserve.type === 'high' ? 'Haute Magie (Qhaysh)' : reserve.type === 'winds' ? '8 Vents' : 'aucune';
  const reserveLine = node('p', 'workspace-result-line workspace-magic-reserve', `Réserve de Focalisation : ${reserve.sl} DR (${reserveLabel})`);
  reserveLine.dataset.magicReserve = String(reserve.sl);
  reserveLine.dataset.magicReserveType = reserve.type || 'none';
  v5.appendChild(reserveLine);
  // T10 : Obstiné (V5 p. 127), choisi avant le jet de lancer, de Focalisation ou de Dissipation : la réponse part dans le contexte
  // des États du Test magique (`magicConditionContext.preRollTalent`), lu par le calcul commun.
  let castingTalentStatus=getObstinateStatus?.(actor.id);
  const selectedContract=type==='cast'?getSpellContract(defaultMagicSpellId(draft,actor)):null;
  if(type==='cast' && selectedContract?.effects?.vortex && castingTalentStatus?.available!==false){
    const ids=magicTargetIdsOf(draft,selectedContract,actor,target,participants),identity=id=>getObstinateIdentity?.(id) || id;
    if(vortexSelectedTalents(draft,actor,participants,ids).some(row=>row.value==='strong-minded'&&identity(row.participantId)===identity(actor.id)))
      castingTalentStatus={available:false,reason:'Obstiné est déjà choisi pour un autre Test de ce sort.'};
  }
  const obstinate = ['cast', 'channelling', 'dispel'].includes(type) ? renderObstinateChoice(actor, draft.magicConditionContext?.preRollTalent, value => {
    const next = { ...(draft.magicConditionContext || {}) };
    if (value === 'strong-minded') next.preRollTalent = value; else delete next.preRollTalent;
    handlers.select({ magicConditionContext: next });
    handlers.calculate?.();
  }, { focusKey: 'magic-pre-roll-talent', status: castingTalentStatus }) : null;
  // G3-a (R15) : pour un sort, tout ce qui n'est ni le sort, ni sa cible, ni un dé réclamé va dans un seul repli « Options ».
  const optionsBox = type === 'cast' ? node('div', 'workspace-v5-context workspace-magic-options-body') : null;
  const requestedBox = type === 'cast' ? node('div', 'workspace-magic-requested') : null;
  if (obstinate) (optionsBox || v5).appendChild(obstinate);

  const selectField = (key, labelText, options, currentVal, container = v5) => {
    const label = node('label', 'workspace-type', labelText);
    const select = document.createElement('select');
    select.setAttribute('aria-label', labelText);
    select.dataset.focusKey = key;
    for (const [val, txt] of options) select.appendChild(new Option(txt, val));
    select.value = currentVal;
    select.addEventListener('change', () => handlers.select({ [key]: select.value }));
    label.appendChild(select);
    container.appendChild(label);
    return select;
  };

  const numberField = (key, labelText, value, min = null, max = null, container = v5) => {
    const label = node('label', 'workspace-type', labelText);
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    if (min !== null) input.min = String(min);
    if (max !== null) input.max = String(max);
    input.value = value ?? '';
    input.dataset.defaultValue = key === 'v5SlModifier' ? '0' : '';
    input.setAttribute('aria-label', labelText);
    input.dataset.focusKey = key;
    if (key === 'magicFumbleLossRoll') input.dataset.blockingField = 'magic-loss';
    const incident = draft.preview?.castPreview?.miscast || draft.preview?.miscast;
    if (['magicMiscastRoll', 'magicMajorRoll'].includes(key) || key === 'magicSecondaryDistanceRoll' && isMiscastDistanceD100(incident?.table, incident?.entry?.max)) { input.dataset.npcRollKey = key; input.dataset.npcRollOwner = 'actor'; }
    tagMiscastDie(input, key, incident);
    input.addEventListener('input', () => handlers.input(key, input.value === '' ? null : Number(input.value)));
    label.appendChild(input);
    if (['magicMiscastRoll', 'magicMajorRoll'].includes(key)) {
      const roll = node('button', 'workspace-secondary', 'Lancer');
      roll.type = 'button';
      roll.setAttribute('aria-label', `Lancer le d100 : ${input.getAttribute('aria-label') || key}`);
      roll.dataset.focusKey = `${key}-dice`;
      roll.addEventListener('click', () => {
        input.value = String(d100());
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      label.appendChild(roll);
    }
    container.appendChild(label);
    return input;
  };

  const magicTargetIds = type === 'cast' ? magicTargetIdsOf(draft, getSpellContract(defaultMagicSpellId(draft, actor)), actor, target, participants) : [];
  const controls = renderMagicControls({actor,participants,type,draft,handlers,targetIds:magicTargetIds,getObstinateStatus,flat:type==='cast',requestedBox});
  (optionsBox || v5).appendChild(controls);
  if (type === 'dispel') return v5;
  if (type === 'channelling') {
    v5.prepend(rubric('Focalisation V5'));
    selectField('magicChannelMode', 'Mode de Focalisation', [
      ['channel', 'Accumuler (Focalisation +0 DR)'],
      ['pause', 'Pause de focalisation (Focalisation Accessible +2 DR)'],
      ['interruption', 'Test d’interruption (Calme Difficile −2 DR)']
    ], draft.magicChannelMode || 'channel');
    selectField('magicChannelType', 'Type de Focalisation', [
      ['winds', 'Les 8 Vents (Focalisation)'],
      ['high', 'Haute Magie (Qhaysh)']
    ], draft.magicChannelType || 'winds');
    selectField('magicLore', 'Vent ou Domaine déclaré', [
      ['fire', 'Aqshy (Feu)'],
      ['heavens', 'Azyr (Cieux)'],
      ['metal', 'Chamon (Métal)'],
      ['beasts', 'Ghur (Bêtes)'],
      ['life', 'Ghyran (Vie)'],
      ['light', 'Hysh (Lumière)'],
      ['death', 'Shyish (Mort)'],
      ['shadow', 'Ulgu (Ombres)'],
      ['high', 'Qhaysh (Haute Magie)'],
      ['arcane', 'Magie Arcanique']
    ], draft.magicLore || 'fire');
    numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? 0);
    if(draft.preview?.fumble || (draft.preview?.missing || []).some(key => ['lossRoll', 'miscastRoll', 'majorRoll'].includes(key)) || draft.preview?.miscast || draft.magicMiscastRoll!=null || draft.magicFumbleLossRoll!=null){
    numberField('magicFumbleLossRoll', 'Perte de réserve si maladresse (1d10)', draft.magicFumbleLossRoll ?? '', 1, 10);
    numberField('magicMiscastRoll', 'Jet d’incident si maladresse (1d100)', draft.magicMiscastRoll ?? '', 1, 100);
    numberField('magicMajorRoll', 'Jet Majeur d’incident si cascade (1d100)', draft.magicMajorRoll ?? '', 1, 100);
    numberField('magicSecondaryDurationRoll', 'Dé secondaire : Durée / États (1d10 ou 2d10)', draft.magicSecondaryDurationRoll ?? '', 1, 20);
    numberField('magicSecondaryDamageRoll', 'Dé secondaire : Dégâts (1d10)', draft.magicSecondaryDamageRoll ?? '', 1, 10);
    numberField('magicSecondaryDistanceRoll', 'Dé secondaire : Distance (1d10 ou 1d100)', draft.magicSecondaryDistanceRoll ?? '', 1, 100);
    selectField('magicSecondaryLocation', 'Membre gelé (incident)', [['', '— Membre gelé (si incident) —'], ['Bras principal', 'Bras principal'], ['Bras secondaire', 'Bras secondaire'], ['Jambe gauche', 'Jambe gauche'], ['Jambe droite', 'Jambe droite']], draft.magicSecondaryLocation || '');
    }
  } else if (type === 'cast') {
    // G3-a : le tiroir est déjà titré « Magie » ; une réserve vide n'est qu'une information, rangée dans « Options ».
    if (!reserve.sl) optionsBox.prepend(reserveLine);
    // Liste du lanceur seule quand il en a une ; « Tous les sorts » rouvre le catalogue (magic-lists.js).
    const choices = spellChoices(actor, { showAll: draft.magicShowAllSpells === true });
    const actorSpells = choices.own.map(s => ({ id: s.id, label: `${s.name} (NI ${s.cn})` }));
    const defaultSpellId = defaultMagicSpellId(draft, actor);
    const spellLabel = node('label', 'workspace-type', 'Sort à lancer');
    const spellSelect = document.createElement('select');
    spellSelect.setAttribute('aria-label', 'Sort à lancer');
    spellSelect.dataset.focusKey = 'magic-spell';
    spellSelect.dataset.defaultValue = defaultMagicSpellId({}, actor);
    if (actorSpells.length) {
      const grpActor = document.createElement('optgroup');
      grpActor.label = `Sorts de ${actor.name}`;
      actorSpells.forEach(s => grpActor.appendChild(new Option(s.label, s.id)));
      spellSelect.appendChild(grpActor);
    }
    // Un sort choisi hors liste reste affiché même une fois « Tous les sorts » décoché.
    const others = choices.others.length || actorSpells.some(s => s.id === defaultSpellId) ? choices.others
      : getAllSpellContracts().filter(c => c.id === defaultSpellId);
    if (others.length) {
      const grpAll = document.createElement('optgroup');
      grpAll.label = 'Contrats de sorts V5';
      others.forEach(c => grpAll.appendChild(new Option(`${c.name} · NI ${c.cn} (${c.domain})`, c.id)));
      spellSelect.appendChild(grpAll);
    }
    spellSelect.value = defaultSpellId;
    // G4-d : changer de sort retire la demande de point d'impact en cours (`mj.impactCancel`) et revient à « Combattant ».
    spellSelect.addEventListener('change', () => { withdrawImpact(draft); handlers.select({ magicSpellId: spellSelect.value, magicImpactMode: false, magicImpact: null }); });
    spellLabel.appendChild(spellSelect);
    v5.appendChild(spellLabel);
    const zoneTargets = renderZoneTargets({ contract: getSpellContract(defaultSpellId), actor, participants, draft, handlers });
    if (zoneTargets) v5.appendChild(zoneTargets);
    // G3-a (R15) : le sort affiché est celui que le calcul lance. Sans choix du MJ, le calcul prenait son propre défaut
    // (premier contrat du catalogue) alors que la liste en montrait un autre : le défaut affiché est retenu dans le brouillon.
    if (!draft.magicSpellId && defaultSpellId) draft.magicSpellId = defaultSpellId;
    if (choices.hasList) {
      const allLabel = node('label', 'workspace-type workspace-magic-all-spells'), allBox = document.createElement('input');
      allBox.type = 'checkbox';
      allBox.checked = draft.magicShowAllSpells === true;
      allBox.dataset.focusKey = 'magic-all-spells';
      allBox.addEventListener('change', () => handlers.select({ magicShowAllSpells: allBox.checked }));
      allLabel.append(allBox, ' Tous les sorts (hors de la liste de ' + actor.name + ')');
      optionsBox.appendChild(allLabel);
    }

    const contract = getSpellContract(defaultSpellId);
    const recipientControls = contract && renderSpellRecipientControls({ actor, participants, contract, draft, handlers, targetIds: magicTargetIds, target, getObstinateStatus, flat: true });
    if (recipientControls) optionsBox.appendChild(recipientControls);
    if (contract) {
      const summary = node('p', 'workspace-muted workspace-magic-contract-summary',
        `${contract.name} (${contract.canonicalName || contract.domain}) · NI ${contract.cn} · Portée : ${contract.range} · Cible : ${contract.target} · Durée : ${contract.duration}`);
      summary.dataset.magicContractSummary = contract.id;
      summary.title = summary.textContent;
      v5.appendChild(summary);
    }

    const choiceOptions = contract ? getContractChoiceOptions(contract) : [];
    if (choiceOptions.length > 0) {
      const mjChoiceSelect = selectField(
        'magicMjChoice',
        'Choix d’effet du sort',
        [['', '— Choisir une option —'], ...choiceOptions.map(opt => [opt, opt])],
        draft.magicMjChoice || ''
      );
      mjChoiceSelect.dataset.focusKey = 'magic-mj-choice';
      mjChoiceSelect.dataset.action = 'set-magic-mj-choice';
    }

    // Dés réclamés par le moteur (incident sur double ou maladresse, jet Majeur, dés secondaires, membre gelé) : en vue.
    const requested = requestedMagicDice(draft);
    for (const [key, [labelText, max]] of Object.entries(REQUESTED_DICE)) if (requested.includes(key)) numberField(key, labelText, draft[key] ?? '', 1, max, requestedBox);
    if (requested.includes('magicSecondaryLocation')) selectField('magicSecondaryLocation', 'Membre gelé (incident)', FROZEN_LIMBS, draft.magicSecondaryLocation || '', requestedBox);
    if (requestedBox.childElementCount) v5.appendChild(requestedBox);

    numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? 0, null, null, optionsBox);
    selectField('magicCriticalChoice', 'Effet critique d’incantation', [
      ['', 'Aucun / Non applicable'],
      ['critical-wound', 'Blessure Critique'],
      ['total-power', 'Puissance totale (+dizaines DR)'],
      ['unstoppable-force', 'Force irrésistible (non dissipable)']
    ], draft.magicCriticalChoice || '', optionsBox);

    // Options propres au sort (une seule rubrique, uniquement pour le sort concerné) ; la surpuissance générique reste dans le bloc suivant.
    const specificBox = node('div', 'workspace-v5-context');
    specificBox.append(...renderSpellOptions({ actor, participants, contract, draft, handlers, targetIds: magicTargetIds, getObstinateStatus, getObstinateIdentity }));
    const isVortexSpell = contract?.isVortex || contract?.effects?.type === 'vortex';
    const movementOnly=contract?.effects?.vortexMovementOnly === true;
    const isArcane = contract?.effects?.special === 'arcane-unforgiving';
    const addCheck = (box, key, lbl, checked = Boolean(draft[key]), onChange = value => handlers.select({ [key]: value })) => {
      const wrap = node('label', 'workspace-type workspace-recipient-check');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = checked;
      chk.setAttribute('aria-label', lbl);
      chk.dataset.focusKey = key;
      chk.addEventListener('change', () => onChange(chk.checked));
      wrap.append(chk, ` ${lbl}`);
      box.appendChild(wrap);
    };
    const addNum = (box, key, lbl, min = 0, max = 100) => {
      const wrap = node('label', 'workspace-type', lbl);
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = String(min);
      inp.max = String(max);
      inp.step = '1';
      inp.value = draft[key] ?? '';
      inp.setAttribute('aria-label', lbl);
      inp.dataset.focusKey = key;
      const incident = draft.preview?.castPreview?.miscast || draft.preview?.miscast;
      if (['magicMiscastRoll', 'magicMajorRoll'].includes(key) || key === 'magicSecondaryDistanceRoll' && isMiscastDistanceD100(incident?.table, incident?.entry?.max)) { inp.dataset.npcRollKey = key; inp.dataset.npcRollOwner = 'actor'; }
      tagMiscastDie(inp, key, incident);
      inp.addEventListener('input', () => {
        const value=inp.value === '' ? null : Number(inp.value);
        if(key==='magicVortexDistance' && (value===null || value>8)) handlers.select({...clearVortexTestTalents(draft,actor.id,(_id,field)=>/^mini\d+/.test(field)),magicVortexDistance:value});
        else handlers.input(key,value);
      });
      wrap.appendChild(inp);
      if (['magicMiscastRoll', 'magicMajorRoll'].includes(key)) {
        const roll = node('button', 'workspace-secondary', 'Lancer');
        roll.type = 'button';
        roll.setAttribute('aria-label', `Lancer le d100 : ${inp.getAttribute('aria-label') || key}`);
        roll.dataset.focusKey = `${key}-dice`;
        roll.addEventListener('click', () => {
          inp.value = String(d100());
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        });
        wrap.appendChild(roll);
      }
      box.appendChild(wrap);
      return inp;
    };
    if(movementOnly){
      addNum(specificBox,'magicVortexDirectionRoll','Tempête : direction aléatoire d10 (sans Test de FM)',1,10);
      addNum(specificBox,'magicVortexDistance','Tempête : déplacement 2d10 mètres',2,20);
    }
    if (isVortexSpell && !movementOnly) {
      // Vortex aléatoire (Winds of Magic p. 20) : direction choisie + Test de Force Mentale Accessible (+2 DR) ; en cas d'échec, d10 de direction.
      const compassLabel = node('label', 'workspace-type', 'Vortex : direction choisie par le lanceur');
      const compassSelect = document.createElement('select');
      compassSelect.setAttribute('aria-label', 'Direction du Vortex choisie par le lanceur');
      compassSelect.dataset.focusKey = 'magicVortexDirection';
      for (const [val, txt] of [['', '— Direction —'], ['N', 'Nord'], ['NE', 'Nord-Est'], ['E', 'Est'], ['SE', 'Sud-Est'], ['S', 'Sud'], ['SW', 'Sud-Ouest'], ['W', 'Ouest'], ['NW', 'Nord-Ouest']]) compassSelect.appendChild(new Option(txt, val));
      compassSelect.value = draft.magicVortexDirection || '';
      compassSelect.addEventListener('change', () => handlers.select({ magicVortexDirection: compassSelect.value || null }));
      compassLabel.appendChild(compassSelect);
      specificBox.appendChild(compassLabel);
      const willLabel = node('label', 'workspace-type', 'Vortex : Test de Force Mentale Accessible (+2 DR)');
      const willSelect = document.createElement('select');
      willSelect.setAttribute('aria-label', 'Résultat du Test de Force Mentale du Vortex');
      willSelect.dataset.focusKey = 'magicVortexWillpower';
      for (const [val, txt] of [['', '— Résultat —'], ['success', 'Réussi : direction choisie'], ['failure', 'Raté : direction aléatoire (d10)']]) willSelect.appendChild(new Option(txt, val));
      willSelect.value = draft.magicVortexWillpower || '';
      willSelect.addEventListener('change', () => handlers.select({ magicVortexWillpower: willSelect.value || null }));
      willLabel.appendChild(willSelect);
      specificBox.appendChild(willLabel);
      addNum(specificBox, 'magicVortexDirectionRoll', 'Vortex : d10 de direction si Test raté (1 disparaît, 2 N, 3 NE, 4 E, 5 en place, 6 SE, 7 S, 8 SO, 9 O, 10 NO)', 1, 10);
      addNum(specificBox, 'magicVortexDistance', 'Distance du Vortex (2d10 m)', 2, 20);
    }
    if (isArcane) specificBox.appendChild(renderArcaneFields(draft, actor, target, participants, handlers, getObstinateStatus));
    if (specificBox.childElementCount) optionsBox.appendChild(flatGroup(`Options du sort : ${contract?.name || 'sort choisi'}`, specificBox));

    const overcastBox = node('div', 'workspace-v5-context');
    const addOvercastNum = (key, lbl, min = 0, max = 100) => addNum(overcastBox, key, lbl, min, max);
    const overcastAllowed=contract?.overcast?.allowed!==false && !contract?.isPetty;
    const genericOptions=overcastAllowed ? contract?.overcast?.options || [] : [];
    if (!isArcane && genericOptions.includes('damage')) addOvercastNum('magicOvercastDamage', 'Surpuissance : Dégâts', 0, 18);
    if(genericOptions.includes('targets')) addOvercastNum('magicOvercastTargets', 'Surpuissance : Cibles', 0, 18);
    if(genericOptions.includes('range')) addOvercastNum('magicOvercastRange', 'Surpuissance : Portée', 0, 18);
    if (!isArcane && genericOptions.includes('duration')) addOvercastNum('magicOvercastDuration', 'Surpuissance : Durée', 0, 18);
    if (!isArcane && genericOptions.includes('aoe')) addOvercastNum('magicOvercastAoe', 'Surpuissance : Zone', 0, 18);
    if (!isArcane && genericOptions.includes('special')) addOvercastNum('magicOvercastSpecial', 'Surpuissance : Spécial (DR)', 0, 20);

    // Paramètres génériques : durée illisible (Spécial, dés, unités à choisir) = donnée MJ, transmise à l'application du sort.
    if (!isArcane) {
      if (!contract || parseSpellDuration(contract.duration, { caster: actor }).kind === 'unknown' || draft.magicDurationAmount != null) {
        addOvercastNum('magicDurationAmount', 'Durée de base, avant surpuissance (si le sort l’exige) : nombre', 1, 9999);
        const durationUnitLabel = node('label', 'workspace-type', 'Durée de base, avant surpuissance : unité');
        const durationUnit = document.createElement('select');
        durationUnit.setAttribute('aria-label', 'Unité de la durée saisie par le MJ');
        durationUnit.dataset.focusKey = 'magic-duration-unit';
        for (const [unit, label] of Object.entries(DURATION_UNIT_LABELS)) durationUnit.appendChild(new Option(label, unit));
        durationUnit.value = draft.magicDurationUnit || 'rounds';
        durationUnit.addEventListener('change', () => handlers.input('magicDurationUnit', durationUnit.value));
        durationUnitLabel.appendChild(durationUnit);
        overcastBox.appendChild(durationUnitLabel);
      }
      if(contract?.effects?.secondaryTest || contract?.effects?.mjInput?.resistanceTest){
      const resInp = addOvercastNum('magicResistanceRoll', 'Jet de résistance / test secondaire (Soc / End / Résistance, 1d100)', 1, 100);
      resInp.dataset.action = 'set-magic-resistance-roll';
      const testActor = contract?.effects?.secondaryTest?.actor;
      const subjectId = testActor === 'caster' ? actor.id : testActor === 'target' && magicTargetIds.length === 1 ? magicTargetIds[0] : null;
      if (subjectId) { resInp.dataset.npcRollKey = 'magicResistanceRoll'; resInp.dataset.npcRollOwnerId = subjectId; }
      }
    }
    addCheck(overcastBox, 'magicUnmemorized', 'Sort lancé depuis un grimoire sans être mémorisé (surpuissance interdite)');
    if(missingMagicDice(draft.preview) || draft.preview?.castPreview?.miscast || draft.preview?.miscast){
    // Dés d'incident non réclamés : restent saisissables dans « Options » ; les réclamés sont en vue, sans doublon.
    for (const [key, [labelText, max]] of Object.entries(REQUESTED_DICE)) if (key !== 'magicMiscastRoll' && !requested.includes(key)) addOvercastNum(key, labelText, 1, max);
    if (!requested.includes('magicSecondaryLocation')) selectField('magicSecondaryLocation', 'Membre gelé (incident)', FROZEN_LIMBS, draft.magicSecondaryLocation || '', overcastBox);
    // Contre-réaction aéthyrique (Majeur 96+, Livre de base p. 239) : le lanceur n'est jamais sa propre cible.
    addCheck(overcastBox, 'magicNoOtherTargets', 'Aucune autre cible à portée (Contre-réaction 96+ : la tête du lanceur explose)');
    }
    optionsBox.appendChild(flatGroup('Surpuissance & Paramètres du sort', overcastBox));

    // G4 : en point d'impact, la liste « Dans la zone » (en vue) remplace les cibles multiples.
    if (participants.length >= 1 && !pointImpactMode(draft, contract)) {
      const multiBox = flatGroup(`Cibles multiples (Contrat : ${contract?.target || '1'})`);
      const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
      const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
      const isAllyExcludingCaster = contract?.effects?.special === 'monstrous-regiment';
      let defaultTargets;
      if(contract?.effects?.excludeCaster){defaultTargets=[(target&&target.id!==actor.id?target:participants.find(p=>p.id!==actor.id&&p.zone==='active'))?.id].filter(Boolean);}
      else if (isSelfSpell) {
        defaultTargets = [actor.id];
      } else if (isAllyExcludingCaster) {
        const firstAlly = participants.find(p => p.id !== actor.id && p.camp === actor.camp);
        defaultTargets = firstAlly ? [firstAlly.id] : [];
      } else if (isAllyOnlySpell) {
        const targetIsAlly = target && (target.id === actor.id || target.camp === actor.camp);
        defaultTargets = targetIsAlly ? [target.id] : [actor.id];
      } else {
        defaultTargets = target ? [target.id] : [actor.id];
      }
      const currentTargets = Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length
        ? draft.magicTargetIds
        : defaultTargets;
      for (const p of participants) {
        const lbl = node('label', 'workspace-type workspace-recipient-check');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = currentTargets.includes(p.id);
        chk.dataset.defaultChecked = String(defaultTargets.includes(p.id));
        chk.setAttribute('aria-label', `Cible du sort : ${p.name}`);
        chk.dataset.focusKey = `magic-target-${p.id}`;
        chk.addEventListener('change', () => {
          const next = chk.checked
            ? [...new Set([...currentTargets, p.id])]
            : currentTargets.filter(id => id !== p.id);
          const effective=next.length?next:defaultTargets;
          const cleaned=contract?.effects?.vortex && !effective.includes(p.id)
            ? clearVortexTestTalents(draft,actor.id,(id,key)=>id===p.id&&!/^mini\d+/.test(key)) : {};
          handlers.select({ ...cleaned, magicTargetIds: next });
        });
        lbl.append(chk, ` ${p.name}`);
        multiBox.appendChild(lbl);
      }
      optionsBox.appendChild(multiBox);
    }
    // Un seul repli « Options », fermé par défaut ; il s'ouvre de lui-même quand le calcul attend une saisie qui n'est pas
    // en vue (dé d'un sort, attribut, Protection…), le geste du MJ (ouvrir, fermer) l'emportant ensuite.
    const pv = draft.preview;
    const requestedPending = requested.some(key => draft[key] == null || draft[key] === '');
    const blockedInside = Boolean(pv?.v5MagicKind === 'cast' && !requestedPending
      && (pv.ready === false || pv.spellPreview?.valid === false || (pv.castPreview?.spellSuccess && pv.spellPreview?.ready === false)));
    const options = node('details', 'workspace-v5-context-details workspace-magic-options');
    options.dataset.magicOptions = '';
    options.open = draft.magicOptionsMoreOpen ?? blockedInside;
    const optionsSummary = node('summary', '', 'Options');
    optionsSummary.dataset.blockingField = 'magic-options';
    optionsSummary.title = 'Talents, Haute Magie, dissipation, familier, choix du d100, surpuissance, cibles multiples…';
    optionsSummary.addEventListener('click', () => handlers.input('magicOptionsMoreOpen', !options.open));
    options.append(optionsSummary, optionsBox);
    v5.appendChild(options);
  }

  return v5;
}

export function renderArcaneFields(draft, actor, target, participants, handlers, getObstinateStatus) {
  const box = node('fieldset', 'workspace-v5-choice-group workspace-arcane-options');
  box.appendChild(node('legend', '', 'Destruction des Arcanes'));
  const armorPoints = Number(draft.magicArcaneArmorPoints) || 0;
  const amountLabel = node('label', 'workspace-type', 'PA à détruire (1 DR chacun)');
  const amount = document.createElement('input');
  amount.type = 'number';
  amount.min = '0';
  amount.max = '20';
  amount.step = '1';
  amount.value = armorPoints;
  amount.dataset.defaultValue = '0';
  amount.dataset.focusKey = 'magic-arcane-armor-points';
  amount.addEventListener('input', () => {
    const points = amount.value === '' ? 0 : Number(amount.value);
    const targets = Object.fromEntries(Object.entries(draft.magicArcaneTargets || {}).map(([id, facts]) =>
      [id, { ...facts, armorDamageLocations: (facts.armorDamageLocations || []).slice(0, Math.max(0, points)) }]));
    handlers.select({ magicArcaneArmorPoints: points, magicArcaneTargets: targets });
  });
  amountLabel.appendChild(amount);
  box.appendChild(amountLabel);
  for (const [key, label] of [['magicArcaneEnhancedDamage', 'Dégâts : 1 par PA porté (+8 DR)'], ['magicArcaneChooseItem', 'Choisir l’objet magique (+3 DR, Test de Dextérité +2 DR)']]) {
    const wrap = node('label', 'workspace-type workspace-arcane-toggle');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(draft[key]);
    input.dataset.focusKey = key;
    input.addEventListener('change', () => handlers.select({ [key]: input.checked }));
    wrap.append(input, ` ${label}`);
    box.appendChild(wrap);
  }
  const cost = armorPoints + (draft.magicArcaneEnhancedDamage ? 8 : 0) + (draft.magicArcaneChooseItem ? 3 : 0);
  box.appendChild(node('p', 'workspace-muted', `Surpuissance à dépenser : ${cost} DR. Les tirages aléatoires sont renseignés par le MJ.`));
  const ids = draft.magicTargetIds?.length ? draft.magicTargetIds : [target?.id || actor.id];
  for (const person of participants.filter(p => ids.includes(p.id))) {
    const facts = draft.magicArcaneTargets?.[person.id] || {};
    const update = patch => handlers.select({ magicArcaneTargets: { ...draft.magicArcaneTargets, [person.id]: { ...facts, ...patch } } });
    box.appendChild(node('p', 'workspace-result-line', person.name));
    for (let index = 0; index < Math.min(20, armorPoints); index++) {
      const label = node('label', 'workspace-type', `PA ${index + 1} : localisation tirée au sort`);
      const select = document.createElement('select');
      select.dataset.focusKey = `magic-arcane-armor-${person.id}-${index}`;
      select.appendChild(new Option('Sélectionner le résultat', ''));
      for (const [id, name] of ARCANE_ARMOR_LOCATIONS) select.appendChild(new Option(name, id));
      select.value = facts.armorDamageLocations?.[index] || '';
      select.addEventListener('change', () => {
        const values = Array.from({ length: armorPoints }, (_, i) => facts.armorDamageLocations?.[i] || '');
        values[index] = select.value;
        update({ armorDamageLocations: values });
      });
      label.appendChild(select);
      box.appendChild(label);
    }
    const presentLabel = node('label', 'workspace-type', 'Objet magique porté');
    const present = document.createElement('select');
    present.dataset.focusKey = `magic-arcane-item-present-${person.id}`;
    [['', 'À préciser'], ['none', 'Aucun'], ['present', 'Présent']].forEach(([value, text]) => present.appendChild(new Option(text, value)));
    present.value = facts.magicItemPresent === true ? 'present' : facts.magicItemPresent === false ? 'none' : '';
    present.addEventListener('change', () => update({ magicItemPresent: present.value === 'present' ? true : present.value === 'none' ? false : null }));
    presentLabel.appendChild(present);
    box.appendChild(presentLabel);
    if (facts.magicItemPresent) {
      for (const [key, text, numeric] of [
        ['focalisationRoll', 'Test de Focalisation (Haute Magie), 1d100', true],
        ['randomMagicItem', 'Objet magique tiré au sort', false],
        ...(draft.magicArcaneChooseItem ? [['dexterityRoll', 'Test de Dextérité (+2 DR), 1d100', true], ['chosenMagicItem', 'Objet magique choisi', false]] : [])
      ]) {
        if(key==='focalisationRoll'){const choice=renderObstinateChoice(actor,facts.focalisationConditionContext?.preRollTalent,value=>update({focalisationConditionContext:{...(facts.focalisationConditionContext||{}),preRollTalent:value}}),{focusKey:`arcane-focalisation-obstinate-${person.id}`,title:`Obstiné avant le jet — Focalisation pour ${person.name}`,status:getObstinateStatus?.(actor.id)});if(choice)box.append(choice);}
        if(key==='dexterityRoll'){const choice=renderObstinateChoice(actor,facts.dexterityConditionContext?.preRollTalent,value=>update({dexterityConditionContext:{...(facts.dexterityConditionContext||{}),preRollTalent:value}}),{focusKey:`arcane-dexterity-obstinate-${person.id}`,title:`Obstiné avant le jet — Dextérité pour ${person.name}`,status:getObstinateStatus?.(actor.id)});if(choice)box.append(choice);}
        const label = node('label', 'workspace-type', text);
        const input = document.createElement('input');
        input.type = numeric ? 'number' : 'text';
        if (numeric) {
          input.min = '1';
          input.max = '100';
          input.step = '1';
        }
        input.value = facts[key] ?? '';
        input.dataset.focusKey = `magic-arcane-${key}-${person.id}`;
        if (numeric) { input.dataset.npcRollKey = 'magicArcaneTargets'; input.dataset.npcRollField = key; input.dataset.npcRollSubjectId = person.id; }
        input.addEventListener('input', () => update({ [key]: numeric ? (input.value === '' ? null : Number(input.value)) : input.value }));
        label.appendChild(input);
        box.appendChild(label);
      }
    }
  }
  return box;
}


/** Précision après un nombre de Blessures : réduction, Protection réussie ou immunité. */
/** Durée résolue de l'effet appliqué (après surpuissance), à défaut le texte du contrat. */
export function appliedDurationText(target, fallback) {
  const applied = target?.appliedSim?.appliedEffect;
  const plural = (amount, unit) => `${amount} ${unit}${amount > 1 ? 's' : ''}`;
  if (applied?.durationType === 'rounds' && Number.isFinite(applied.durationRounds)) return plural(applied.durationRounds, 'Round');
  if (applied?.durationType === 'minutes' && Number.isFinite(applied.durationMinutes)) return plural(applied.durationMinutes, 'minute');
  if (applied?.durationType === 'hours' && Number.isFinite(applied.durationHours)) return plural(applied.durationHours, 'heure');
  if (applied?.durationType === 'days' && Number.isFinite(applied.durationDays)) return plural(applied.durationDays, 'jour');
  return fallback;
}

export function protectionNote(protection) {
  if (!protection) return '';
  if (protection.immune) return ` (immunité${protection.immunity ? ' : ' + protection.immunity : ''})`;
  if (protection.wardSaved) return ` (Protection ${protection.ward}+ réussie${protection.wardRoll ? ', d10 ' + protection.wardRoll : ''} : dégâts annulés)`;
  if (protection.reduction) return ` (réduction de ${protection.reduction})`;
  return '';
}

export function renderV5MagicResult(preview, target, draft, handlers, participants = [], getObstinateStatus) {
  const result = node('div', 'workspace-result workspace-magic-result');
  const pills = node('div', 'workspace-result-pills');

  const conditionBox = renderConditionQuestions(preview, draft, handlers);
  if (conditionBox) result.appendChild(conditionBox);
  // T10 (CA5) : détail par source du Test magique, comme au combat (talents, sorts, États, séquelles ; écartés barrés).
  // La pénalité d'État du Test magique (`magic-condition-penalty`) est la ligne `conditions` du calcul commun : une seule ligne.
  const testModifiers = (preview.castPreview?.test?.details?.modifiers || preview.test?.details?.modifiers || preview.context?.slModifiers || null)
    ?.map(row => row.id === 'magic-condition-penalty' ? { ...row, id: 'conditions' } : row) || null;
  const sourceDetail = testModifiers || preview.conditionRows?.length
    ? renderSourceDetail({ rows: preview.conditionRows || [], modifiers: testModifiers || preview.conditionModifiers || [], title: 'Détail du Test (par source)' }) : null;
  const conditionDetail = sourceDetail || renderConditionDetail(preview);
  if (conditionDetail) result.appendChild(conditionDetail);
  if(preview.error&&preview.v5MagicKind!=='dispel')result.appendChild(node('p','workspace-result-line',preview.error));
  // T10 (CA29) : jet refusé faute de réponse à une question de séquelle : seules la question et le motif s'affichent.
  if (preview.refusedForQuestions) { if (preview.v5MagicKind === 'dispel' && preview.error) result.appendChild(node('p', 'workspace-result-line workspace-field-error', preview.error)); return result; }
  if (preview.v5MagicKind === 'dispel') {
    const dispelReason=preview.reason||preview.error;
    result.appendChild(node('p', preview.allowed === false ? 'workspace-result-line workspace-field-error' : 'workspace-result-line', preview.allowed===false?`Dissipation impossible : ${dispelReason||'Conditions de dissipation non remplies.'}`:dispelReason?`Dissipation impossible : ${dispelReason}`:preview.summary||'Dissipation prête.'));
    if (preview.attemptFailed) result.appendChild(node('p', 'workspace-result-line workspace-field-error', 'Total négatif : la tentative est échouée ; cocher « Recommencer la tentative » pour repartir de zéro DR.'));
    return result;
  }
  if (preview.v5MagicKind === 'channelling') {
    // La pause ne gagne aucun DR : le pill affiche les DR du Test (Accessible compris), la ligne dit seulement si la réserve est conservée.
    const pause = preview.actionType === 'channelling-pause';
    pills.appendChild(outcomePill('Focalisation', preview.success, pause ? preview.test?.sl : preview.sl));
    if (preview.critical) pills.appendChild(node('span', 'workspace-outcome is-success', 'Critique (+2 × BFM)'));
    if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse de Focalisation'));
    result.appendChild(pills);

    const rType = (preview.type || preview.reserveType) === 'high' ? 'Haute Magie' : '8 Vents';
    const prevSl = preview.currentReserve?.sl ?? preview.previousReserve?.sl ?? 0;
    const nextSl = preview.newReserve?.sl ?? 0;
    const gained = preview.gain ?? preview.gainedSl ?? 0;
    result.appendChild(node('p', 'workspace-result-line',
      `${preview.success ? 'Focalisation réussie' : 'Focalisation échouée'} · Réserve (${rType}) : ${prevSl} DR → ${nextSl} DR${pause ? (preview.success ? ' (réserve conservée)' : ' (réserve perdue)') : ` (gain ${signed(gained)})`}`));
    if (preview.typeChanged || preview.wipedPreviousReserve) {
      result.appendChild(node('p', 'workspace-result-line workspace-muted', 'Changement de type : la réserve précédente d’un autre type a été effacée avant le jet.'));
    }
    if (preview.skillWarning) result.appendChild(node('p','workspace-field-error',preview.skillWarning));
    if (preview.armorPenalty) {
      result.appendChild(node('p', 'workspace-result-line', `Pénalité d’armure portée : ${signed(preview.armorPenalty)} DR`));
    }
    if ((preview.actualLoss ?? preview.lostSl ?? 0) > 0) {
      const lost = preview.actualLoss ?? preview.lostSl ?? 0;
      result.appendChild(node('p', 'workspace-result-line workspace-field-error', `Perte de réserve : −${lost} DR (modificateur d’incident +${lost * 10})`));
    }
    if (preview.miscast) {
      result.appendChild(node('p', 'workspace-result-line workspace-critical-effect',
        `Incident magique (${preview.miscast.severity || preview.miscast.table || 'MINOR'}) : ${preview.miscast.name || preview.miscast.entry?.title || 'Incident'} — ${preview.miscast.effect || preview.miscast.entry?.effect || ''}`));
    }
    return result;
  }

  // Cast / Spell Execution
  const cast = preview.castPreview || {};
  const sp = preview.spellPreview || {};
  const contract = preview.contract || sp?.contract || {};
  const totalSl = cast.totalCastingSl ?? cast.totalSl ?? 0;
  const reserveUsed = cast.matchingReserve ?? cast.reserveConsumed ?? cast.reserveUsed ?? 0;
  // X-01 : une réaction de dissipation remplace le DR et le total du lanceur par ceux d'après l'opposition.
  const reaction = sp?.dispelReaction;
  // Réaction refusée ou incomplète : seul le motif s'affiche (une fois), sans total ni opposition calculés.
  if (reaction && !(reaction.ready && reaction.allowed)) {
    const reason = reaction.reason || reaction.summary || sp.error;
    if (reason && reason !== preview.error) result.appendChild(node('p', 'workspace-result-line workspace-field-error', reason));
    return result;
  }
  const castOk = reaction ? sp.spellSuccess === true : cast.spellSuccess;
  const finalTotal = reaction ? sp.castingPreview?.totalCastingSl ?? reaction.casterSlAfterDispel : totalSl;
  pills.appendChild(outcomePill('Test Langue (Magick)', cast.testSuccess, cast.testSl ?? 0));
  pills.appendChild(node('span', `workspace-outcome ${castOk ? 'is-success' : 'is-failure'}`,
    `${contract.name || 'Sort'} (NI ${contract.cn ?? 0}) : ${reaction?.dispelled ? 'Sort DISSIPÉ' : `${castOk ? 'Sort lancé ! Incantation réussie' : 'Échec d’incantation'} · Total ${finalTotal} DR`}`));
  if (cast.critical) pills.appendChild(node('span', 'workspace-outcome is-critical', `Critique d’incantation${cast.criticalChoice ? ` (${cast.criticalChoice})` : ''}`));
  if (cast.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse d’incantation'));
  result.appendChild(pills);

  result.appendChild(node('p', 'workspace-result-line',
    `Calcul d’incantation : ${signed(cast.testSl ?? 0)} DR (test) + ${reserveUsed} DR (réserve consommée) = ${totalSl} DR vs NI ${contract.cn ?? 0}`));

  const divinePenalty = (cast.test?.details?.modifiers || []).find(row => row.id === 'divine-casting-penalty');
  if (divinePenalty) result.appendChild(node('p', 'workspace-result-line', `${divinePenalty.label} : ${signed(divinePenalty.amount)} DR au Test d’incantation.`));
  if (reaction) {
    result.appendChild(node('p', 'workspace-result-line', `Opposition de dissipation : Test du lanceur ${signed(reaction.casterSl)} DR − dissipateur ${signed(reaction.dispellerSl)} DR = ${signed(reaction.netSl)} DR nets.`));
    result.appendChild(node('p', 'workspace-result-line', reaction.dispelled
      ? `Sort dissipé : DR net négatif ; la réserve (${reaction.reserveSl} DR) ne sauve pas le sort, aucun effet ni épuisement.`
      : `Le lanceur gagne l’opposition : ${signed(reaction.netSl)} DR nets + réserve ${reaction.reserveSl} DR = ${signed(reaction.casterSlAfterDispel)} DR restants contre NI ${contract.cn ?? 0}${castOk ? '.' : ' : NI non atteint, sort raté (réserve consommée).'}`));
  }
  if(sp?.burnout) result.appendChild(node('p','workspace-result-line',sp.burnout.summary));
  const miscast = cast.miscast || sp?.miscast;
  if (miscast) {
    result.appendChild(node('p', 'workspace-result-line workspace-critical-effect',
      `Incident magique (${miscast.severity || miscast.table || 'MINOR'}) : ${miscast.name || miscast.entry?.title || 'Incident'} — ${miscast.effect || miscast.entry?.effect || ''}`));
  }

  if ((sp?.fingerprintCheck && !sp.fingerprintCheck.valid) || sp?.valid === false || (cast.spellSuccess && sp?.ready === false)) {
    const errText = (sp?.fingerprintCheck && !sp.fingerprintCheck.valid)
      ? `Contrat obsolète ou modifié (${sp.fingerprintCheck?.reason || sp.reason || 'empreinte invalide'}) : l’automatisation est désactivée.`
      : (sp?.error || sp?.reason || 'Paramètres d’exécution du sort invalides ou incomplets.');
    const err = node('p', 'workspace-field-error', errText);
    err.setAttribute('role', 'alert');
    result.appendChild(err);
    for (const need of sp.needsInput || []) if (need.field?.startsWith('mountedRide')) {
      const [, riderId, event] = need.field.split(':');
      const field = need.field.startsWith('mountedRideScore') ? 'score' : 'roll';
      const answers = draft.magicMountedRideTests || {}, riderAnswers = answers[riderId] || {}, current = event ? riderAnswers[event] || {} : riderAnswers;
      const update = patch => handlers.select({magicMountedRideTests:{...answers,[riderId]:event?{...riderAnswers,[event]:{...current,...patch}}:{...current,...patch}}});
      const rider=participants.find(row=>row.id===riderId);
      if(field==='roll'){const choice=renderObstinateChoice(rider,current.conditionContext?.preRollTalent,value=>{update({conditionContext:{...(current.conditionContext||{}),preRollTalent:value}});handlers.calculate?.();},{focusKey:`magic-ride-obstinate-${riderId}-${event||'single'}`,title:`Obstiné avant le jet — Chevaucher de ${rider?.name||riderId}`,status:rider&&getObstinateStatus?.(riderId)});if(choice)result.append(choice);}
      const label = node('label', 'workspace-type', need.label || `${riderId} · ${field === 'roll' ? 'd100' : 'score de Chevaucher'}`);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(need.min ?? (field === 'roll' ? 1 : 0));
      input.max = String(need.max ?? 100);
      input.value = current[field] == null ? '' : String(current[field]);
      if (field === 'roll') { input.dataset.npcRollKey = 'magicMountedRideTests'; input.dataset.npcRollOwnerId = riderId; }
      input.addEventListener('change', () => {
        update({ [field]: input.value === '' ? null : Number(input.value) });
        handlers.calculate();
      });
      label.append(input);
      result.appendChild(label);
    }
    return result;
  }

  if (cast.spellSuccess && sp) {
    for (const t of sp.targetResults || sp.targets || []) {
      const tName = t.targetName || t.name || 'Cible';
      for(const action of t.actions || [])if(['mj-input','chain-ended','conjured-weapon','option-tests','affliction-receipt','suppression','banishment-receipt','calm','critical-wound'].includes(action.kind) && action.summary)result.appendChild(node('p','workspace-result-line',tName+' : '+action.summary));
      if(t.quantifiedReminder)result.appendChild(node('p','workspace-result-line',tName+' : '+Object.entries(t.quantifiedReminder).map(([key,value])=>key+' = '+value).join(' ; ')+' (reçu à appliquer sur la fiche ou le terrain).'));
      if (t.missile) {
        const rawDmg = t.missile.rawDamage ?? t.missile.baseDamage ?? 0;
        // Blessures nettes après armure, Protection et réduction : `t.woundsLost` quand une Protection a joué.
        const netWounds = t.magicProtection ? t.woundsLost : t.missile.woundsLost ?? t.missile.finalDamage ?? t.missile.netWounds ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Projectile magique · ${rawDmg} Dégâts bruts → ${netWounds} Blessures${protectionNote(t.magicProtection)} (${t.missile.location || 'Corps'}) · PV ${t.finalHp ?? ''}`));
      }
      if (t.damage) {
        const rawDmg = t.damage.rawDamage ?? 0;
        const netWounds = t.magicProtection ? t.woundsLost : t.damage.woundsLost ?? t.damage.finalDamage ?? t.damage.netWounds ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Dégâts magiques · ${rawDmg} Dégâts bruts → ${netWounds} Blessures${protectionNote(t.magicProtection)}`));
      }
      if (t.arcaneUnforgiving) {
        const arcane = t.arcaneUnforgiving;
        result.appendChild(node('p', 'workspace-result-line', 'Surpuissance dépensée : ' + arcane.overcastCost + ' DR'));
        for (const action of t.actions || []) {
          if (action.kind?.startsWith('arcane-')) result.appendChild(node('p', 'workspace-result-line', tName + ' : ' + action.summary));
        }
        const names = Object.fromEntries(ARCANE_ARMOR_LOCATIONS);
        for (const loc of Object.keys(arcane.damageByLocation)) {
          result.appendChild(node('p', 'workspace-result-line', names[loc] + ' : ' + arcane.armorBefore[loc] + ' → ' + arcane.armorAfter[loc] + ' PA'));
        }
      }
      if (t.healing) {
        const healed = t.healing.healedAmount ?? t.healing.healedWounds ?? t.woundsHealed ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Soin magique · +${healed} Blessures`));
      }
      if (t.temporaryEffect) {
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Effets temporaires (${appliedDurationText(t, contract.duration || 'durée active')}) — ${t.temporaryEffect.spellName || contract.name}`));
      }
      if (t.beastForm) {
        const bf = t.beastForm;
        result.appendChild(node('p', 'workspace-result-line',
          `Transformation (${contract.name}) : ${bf.summary}`));
      }
      if (t.verdantApotheosis) {
        const va = t.verdantApotheosis;
        result.appendChild(node('p', 'workspace-result-line',
          va.admissible
            ? `Apothéose Verdoyante : ${tName} revient à la vie avec ${va.healedHp} PV · ${va.corruptionTest}`
            : `Apothéose Verdoyante : ${tName} non admissible (${va.reason})`));
      }
      if (t.handOfGlory) {
        result.appendChild(node('p', 'workspace-result-line', t.handOfGlory.summary || `Main de Gloire appliquée sur ${tName}`));
      }
      if (t.daemonbane) {
        result.appendChild(node('p', 'workspace-result-line', t.daemonbane.summary || `Fléau des Démons sur ${tName}`));
      }
      if (t.sapheryWard) {
        result.appendChild(node('p', 'workspace-result-line', t.sapheryWard.summary || `Bouclier de Saphery : Protection ${t.sapheryWard.threshold}+`));
      }
      if (t.scythe) {
        result.appendChild(node('p', 'workspace-result-line', t.scythe.summary));
      }
      if (t.specialEffect) {
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : ${t.specialEffect.summary || contract.name}`));
      }
    }
    // Destinataires secondaires désignés par le MJ (ennemis engagés, attaquant) : États et Blessures après Protection.
    for (const r of sp.secondaryResults || []) {
      const effects = r.recurring ? ['sera frappé à chacun de ses Tours']
        : r.immune ? [`immunisé (${r.immune})`]
        : r.test?.passed ? [`${r.test.skill} réussi (${r.test.roll} ≤ ${r.test.score}), aucun effet`]
        : [...r.conditions, ...(r.woundsLost ? [`${r.woundsLost} Blessures${protectionNote(r.magicProtection)}`] : r.magicProtection?.wardSaved ? [`0 Blessure${protectionNote(r.magicProtection)}`] : [])];
      result.appendChild(node('p', 'workspace-result-line', `${r.targetName} : ${effects.join(', ') || 'aucun effet'}`));
    }
    for (const ar of sp.attributeReceipts || []) {
      result.appendChild(node('p', 'workspace-result-line workspace-muted',
        `Attribut de Domaine (${ar.lore}) : ${ar.effect}`));
    }
    for (const item of sp.ficheFollowUpReceipt?.inventoryChanges || []) {
      result.appendChild(node('p', 'workspace-muted', item.summary));
    }
    if (sp.ficheFollowUpReceipt?.reminderText) {
      result.appendChild(node('p', 'workspace-muted', `Rappel : ${sp.ficheFollowUpReceipt.reminderText}`));
    }
    for (const rem of sp.reminders || []) {
      result.appendChild(node('p', 'workspace-muted', `Rappel : ${rem}`));
    }
    for (const fall of sp.mountedFall || []) {
      if (fall.test) result.appendChild(node('p', 'workspace-result-line', `${fall.participantId} : Chevaucher ${fall.test.roll}, ${fall.test.sl} DR · ${fall.dismount ? 'désarçonné' : 'reste en selle'}.`));
    }
    for (const need of sp.needsInput || []) if (need.field?.startsWith('mountedRide')) {
      const [, riderId, event] = need.field.split(':');
      const field = need.field.startsWith('mountedRideScore') ? 'score' : 'roll';
      const rider = participants.find(row => row.id === riderId) || (sp.targets || []).find(row => row.id === riderId);
      const answers = draft.magicMountedRideTests || {}, riderAnswers = answers[riderId] || {}, current = event ? riderAnswers[event] || {} : riderAnswers;
      const update = patch => handlers.select({magicMountedRideTests:{...answers,[riderId]:event?{...riderAnswers,[event]:{...current,...patch}}:{...current,...patch}}});
      if(field==='roll'){const choice=renderObstinateChoice(rider,current.conditionContext?.preRollTalent,value=>{update({conditionContext:{...(current.conditionContext||{}),preRollTalent:value}});handlers.calculate?.();},{focusKey:`magic-ride-obstinate-${riderId}-${event||'single'}`,title:`Obstiné avant le jet — Chevaucher de ${rider?.name||riderId}`,status:rider&&getObstinateStatus?.(riderId)});if(choice)result.append(choice);}
      const label = node('label', 'workspace-type', need.label || `${rider?.name || riderId} · ${field === 'roll' ? 'd100' : 'score de Chevaucher'}`);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(need.min ?? (field === 'roll' ? 1 : 0));
      input.max = String(need.max ?? 100);
      input.value = current[field] == null ? '' : String(current[field]);
      if (field === 'roll') { input.dataset.npcRollKey = 'magicMountedRideTests'; input.dataset.npcRollOwnerId = riderId; }
      input.addEventListener('change', () => {
        update({ [field]: input.value === '' ? null : Number(input.value) });
        handlers.calculate();
      });
      label.append(input);
      result.appendChild(label);
    }
  }
  return result;
}
