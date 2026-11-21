/**
 * Case « À décider » (refonte de l'interface, lot E2 ; spec S3, CA7 à CA10).
 * Toute décision attendue du MJ (les 26 du relevé §A de docs/specs/refonte-interface/fonctions-jouer.md) apparaît dès
 * qu'elle naît dans une case fixe, en haut de la zone de droite ; le nombre de décisions en attente s'affiche dans la
 * barre du haut (`pendingDecisionCount`, lu par combat-banner.js) et une marque sur le portrait concerné de la frise
 * (`context.decisions`, lu par combat-frise.js). Aucune décision ne bloque « Tour suivant » : une décision non tranchée
 * reste dans la case, « Plus tard » la réduit seulement.
 *
 * `collectDecisions(context, store)` est pure (testée sous Node) : elle lit le `context` de `playContext()` (participants,
 * combat, acteur, brouillon de résolution, saisie d'initiative ouverte, questions publiées) et les aperçus que le moteur
 * expose déjà (mort subite, choc d'amputation, corruption, rappels, événements de scène). Elle ne décide rien et
 * n'écrit rien. Chaque entrée : `{ id, kind, participantId, titre, detail?, options: [{ key, label }] }`.
 *
 * Deux sources :
 * - l'état de la partie, pour les décisions qui y laissent une trace (mort subite, morts critiques, chocs d'amputation,
 *   corruption, Brisé, jugement dernier, familier mort, Peur, rappels, événements de scène) et pour celles que la
 *   résolution en cours attend (maladresse, déviation, issue létale, incident de magie, questions d'États, équipement) ;
 * - les questions publiées (`publishDecision`) par les fenêtres et formulaires qui posent une question le temps de leur
 *   ouverture (effets V5, méthode de récupération, et le canal reste ouvert aux autres : fuite, Courroux, retrait,
 *   fin de combat, suggestions de la carte).
 *
 * `renderDecisions(zone, entries, handlers)` pose la case : une carte par entrée, ses options en boutons (un clic), ou
 * le formulaire existant déplacé tel quel (`handlers.forms`) quand la décision demande une saisie (corps intact, Test de
 * Résistance, rappels et événements de scène).
 */
import { familiarLinksOf, linkedFamiliars } from '../core/familiars.js';
import { CONDITION_QUESTIONS } from '../core/condition-effects.js';

/** Les 26 décisions du relevé §A, dans son ordre. */
export const DECISION_KINDS = Object.freeze([
  { kind: 'mort-subite', label: 'Mort subite d’un figurant' },
  { kind: 'mort-critique', label: 'Mort par critique' },
  { kind: 'choc-amputation', label: 'Choc d’amputation' },
  { kind: 'corruption', label: 'Corruption' },
  { kind: 'brise', label: 'Brisé' },
  { kind: 'fuite', label: 'Fuite ou désengagement' },
  { kind: 'maladresse', label: 'Maladresse' },
  { kind: 'deviation', label: 'Déviation de tir ou dispersion' },
  { kind: 'issue-letale', label: 'Issue létale' },
  { kind: 'incident-magie', label: 'Incident de magie' },
  { kind: 'jugement', label: 'Jugement dernier' },
  { kind: 'courroux', label: 'Péché et Courroux' },
  { kind: 'effets-v5', label: 'Effets V5 à saisir' },
  { kind: 'recuperation', label: 'Récupération d’un État' },
  { kind: 'initiative', label: 'Initiative' },
  { kind: 'retrait', label: 'Retrait d’un participant' },
  { kind: 'fin-combat', label: 'Fin de combat' },
  { kind: 'evenement-scene', label: 'Événement de scène' },
  { kind: 'rappel', label: 'Rappel de tour' },
  { kind: 'engagement-carte', label: 'Engagement suggéré par la carte' },
  { kind: 'course-carte', label: 'Course sur la carte' },
  { kind: 'familier', label: 'Mort d’un familier' },
  { kind: 'questions-etats', label: 'Questions d’États' },
  { kind: 'equipement', label: 'Arbitrage d’équipement' },
  { kind: 'peur', label: 'Surmonter la Peur' },
  { kind: 'reglage-mort-subite', label: 'Réglage de la mort subite' }
]);
const KNOWN = new Set(DECISION_KINDS.map(row => row.kind));

const OPEN = label => [{ key: 'open', label }];
const v5Of = participant => participant?.extensions?.v5 || {};
const statesOf = participant => (Array.isArray(participant?.states) ? participant.states : []);
const nameOf = participant => participant?.name || participant?.id || 'Combattant';
const keyOf = value => String(value?.key || value?.name || value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isActive = participant => !participant?.zone || participant.zone === 'active';
const isDead = participant => v5Of(participant).dead === true || statesOf(participant).some(row => /^(dead|mort)$/.test(keyOf(row)));
const isUnconscious = participant => statesOf(participant).some(row => keyOf(row) === 'inconscient' || keyOf(row) === 'unconscious');
const isExtra = participant => ['PNJ', 'Créature'].includes(participant?.kind);
// Un aperçu du moteur qui échoue n'empêche jamais les autres entrées.
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

const STATE_DEATH_CAUSES = { bleeding: 'hémorragie', poison: 'poison', 'fire-critical': 'flammes', suffocation: 'asphyxie' };
const TURN_REMINDER_KINDS = ['endTurn', 'startTurn'];
const CONDITION_TEXTS = new Set([...Object.values(CONDITION_QUESTIONS || {}), 'États de pénalités différentes : choisir les DR ou le Désavantage retenu par le MJ.']);
// Textes de la résolution (applicationBlockingReasons, resolution-panel.js) qui attendent une décision du MJ.
const RESOLUTION_PATTERNS = [
  ['maladresse', /^Maladresse/i, 'Saisir le jet'],
  ['deviation', /^(Dispersion|Explosion)|Tir engagé|déviation/i, 'Saisir la déviation'],
  ['equipement', /^(Recharge|Taille|Appendice)|chargeur|Groupe d’arme|Groupe d'arme|PA retenus|Encombrement|pavois/i, 'Arbitrer']
];

/** Questions publiées par les fenêtres et formulaires ouverts : `{ id, kind, participantId?, titre, options, onChoose? }`. */
const published = new Map();
const listeners = new Set();
export function publishDecision(entry) {
  if (!entry?.id || !KNOWN.has(entry.kind)) return;
  published.set(entry.id, entry);
  listeners.forEach(listener => safe(() => listener()));
}
export function withdrawDecision(id) {
  if (!published.delete(id)) return;
  listeners.forEach(listener => safe(() => listener()));
}
export const publishedDecisions = () => [...published.values()];
/** Abonnement de l'espace Jouer : une question publiée ou retirée redessine la case. Renvoie la fonction de désabonnement. */
export function onPublishedDecisions(listener) { listeners.add(listener); return () => listeners.delete(listener); }

// Compteur de la barre du haut (combat-banner.js) : le nombre de la dernière case rendue.
let lastCount = 0;
export function rememberDecisionCount(count) { lastCount = Math.max(0, Number(count) || 0); }
export const pendingDecisionCount = () => lastCount;

/** Les décisions en attente, dans l'ordre du relevé puis de l'ordre du round. */
export function collectDecisions(context = {}, store = {}) {
  const people = (Array.isArray(context.participants) ? context.participants : []).filter(isActive);
  const entries = [];
  const push = entry => { if (entry && KNOWN.has(entry.kind) && !entries.some(row => row.id === entry.id) && !context.dismissed?.has?.(entry.id)) entries.push({ participantId: null, ...entry }); };
  const suddenDeathEnabled = safe(() => store.isSuddenDeathEnabled?.() === true, false);

  for (const participant of people) {
    const v5 = v5Of(participant), name = nameOf(participant), pid = participant.id;
    // 1 et 26 · figurant à 0 Blessure, ni mort ni inconscient, que le MJ n'a pas déclaré « pas un figurant ».
    if (isExtra(participant) && Number(participant.hp) === 0 && !isDead(participant) && !isUnconscious(participant) && v5.suddenDeathDeclined !== true) {
      if (suddenDeathEnabled) push({ id: `mort-subite:${pid}`, kind: 'mort-subite', participantId: pid, titre: `${name} · 0 Blessure : mort subite`, options: [{ key: 'dead', label: 'Mort' }, { key: 'unconscious', label: 'Inconscient' }, { key: 'later', label: 'Plus tard' }, { key: 'declined', label: 'Pas un figurant' }] });
      else push({ id: `reglage-mort-subite:${pid}`, kind: 'reglage-mort-subite', participantId: pid, titre: `${name} · 0 Blessure`, detail: 'Mort subite des figurants désactivée.', options: [{ key: 'enable', label: 'Activer la mort subite' }, { key: 'dismiss', label: 'Non' }] });
    }
    // 2 · morts critiques : table, décompte, État.
    for (const record of Array.isArray(v5.criticalAftermath) ? v5.criticalAftermath : []) {
      if (record?.sequela?.criticalDeath !== true || record.deathDecision) continue;
      push({ id: `mort-critique:${pid}:${record.id}`, kind: 'mort-critique', participantId: pid, titre: `${name} · ${record.effectName || 'critique mortel'}${record.source?.printedName || record.table ? ` (${record.source?.printedName || record.table})` : ''}`,
        options: [{ key: 'confirm', label: 'Confirmer la mort' }, ...(record.table === 'HEAD' ? [{ key: 'decapitated', label: 'Confirmer : décapité' }] : []), { key: 'decline', label: 'Refuser la mort' }] });
    }
    if (['countdown', 'awaiting-mj'].includes(v5.criticalDeath?.status)) push({ id: `mort-critique:${pid}:decompte`, kind: 'mort-critique', participantId: pid, titre: `${name} · décompte ${v5.criticalDeath.status === 'countdown' ? `jusqu’au Round ${v5.criticalDeath.dueRound}` : `arrivé à l’échéance du Round ${v5.criticalDeath.dueRound}`}`, options: [{ key: 'confirm', label: 'Confirmer la mort' }, { key: 'decline', label: 'Refuser la mort' }] });
    if (v5.pendingStateDeath && v5.dead !== true) push({ id: `mort-critique:${pid}:etat:${v5.pendingStateDeath.id}`, kind: 'mort-critique', participantId: pid, titre: `${name} · décès proposé par ${STATE_DEATH_CAUSES[v5.pendingStateDeath.source] || 'état'} (Round ${v5.pendingStateDeath.round})`, options: [{ key: 'confirm', label: 'Confirmer la mort' }, { key: 'decline', label: 'Refuser la mort' }] });
    // 3 · chocs d'amputation (mêmes conditions que l'ancien bloc « Chocs d'amputation »).
    for (const record of Array.isArray(v5.criticalAftermath) ? v5.criticalAftermath : []) {
      if (record?.amputationShockStatus === 'not-occurred') continue;
      const preview = safe(() => store.previewAmputationShock?.({ participantId: pid, criticalId: record.id }));
      if (!preview || preview.status === 'deferred' || preview.status === 'duplicate' || !preview.requirements?.length) continue;
      const canReject = preview.requirements.every(row => row.conditional === true);
      push({ id: `choc-amputation:${pid}:${record.id}`, kind: 'choc-amputation', participantId: pid, titre: `${name} · ${record.effectName || 'amputation'} · Résistance ${preview.requirements[0].difficultyDR} DR`,
        options: [{ key: 'occurred', label: 'Amputation survenue' }, ...(canReject ? [{ key: 'not-occurred', label: 'Pas d’amputation' }] : []), { key: 'test', label: 'Test de Résistance' }] });
    }
    // 4 · corruption : test de seuil, mutation, perte au Chaos, exposition.
    const corruption = safe(() => store.getCorruptionStatus?.(pid));
    if (corruption) {
      const titre = corruption.pendingThresholdTest ? 'Test de Corruption (seuil atteint)' : corruption.pendingMutation ? 'mutation à confirmer ou refuser'
        : corruption.pendingCharacterLoss ? 'personnage perdu au Chaos ?' : corruption.pendingExposureSources?.length ? 'exposition à la Corruption' : null;
      if (titre) push({ id: `corruption:${pid}`, kind: 'corruption', participantId: pid, titre: `${name} · ${titre}`, options: OPEN('Ouvrir la Corruption') });
    }
    // 5 · Brisé : la séquence de fuite attend le MJ.
    if (!isDead(participant) && statesOf(participant).some(row => ['brise', 'broken'].includes(keyOf(row)) && Number(row?.level ?? 1) > 0)) push({ id: `brise:${pid}`, kind: 'brise', participantId: pid, titre: `${name} · Brisé : fuite à résoudre`, options: OPEN('Résoudre la fuite') });
    // 11 · jugement dernier parti, sans retour ni rejet.
    if ((Array.isArray(v5.divineJudgments) ? v5.divineJudgments : []).some(row => row?.status === 'departed')) push({ id: `jugement:${pid}`, kind: 'jugement', participantId: pid, titre: `${name} · jugement dernier en cours`, options: OPEN('Ouvrir les prières') });
    // 22 · familier animal mort : Test de Calme du maître.
    for (const { link, familiar } of familiarLinksOf(participant).length ? linkedFamiliars(participant, context.participants || []) : []) {
      if (link?.system === 'animal' && familiar && (Number(familiar.hp) <= 0 || isDead(familiar))) push({ id: `familier:${pid}:${link.id}`, kind: 'familier', participantId: pid, titre: `${name} · ${nameOf(familiar)} est mort : Test de Calme`, options: OPEN('Mort du familier') });
    }
    // 25 · Peur en cours, pas encore surmontée.
    const fears = statesOf(participant).filter(row => row?.key === 'fear-of-talent' && row.overcome !== true);
    if (fears.length && !isDead(participant)) push({ id: `peur:${pid}`, kind: 'peur', participantId: pid, titre: `${name} · Peur : ${fears.map(row => `${Number(row.successes) || 0}/${row.rating} DR`).join(', ')}`, options: OPEN('Surmonter la Peur') });
  }

  // 7 à 10, 23, 24 · ce que la résolution en cours attend du MJ.
  const resolution = context.resolution || null, preview = resolution?.preview || null;
  const actorId = resolution?.actorId ?? context.actor?.id ?? null, actorName = nameOf(people.find(row => row.id === actorId) || context.actor);
  if (preview && typeof preview === 'object') {
    const texts = [...(Array.isArray(preview.unresolved) ? preview.unresolved : []), ...(Array.isArray(preview.needsInput) ? preview.needsInput.map(row => row?.label || row?.message) : [])].filter(text => typeof text === 'string');
    for (const [kind, pattern, label] of RESOLUTION_PATTERNS) {
      const text = texts.find(item => pattern.test(item));
      if (text) push({ id: `${kind}:${actorId}`, kind, participantId: actorId, titre: `${actorName} · ${text}`, detail: text, options: OPEN(label) });
    }
    if (!entries.some(row => row.kind === 'equipement') && [preview.protection, preview.critical?.details?.protection].some(row => row && (row.ap === null || row.manual?.length))) push({ id: `equipement:${actorId}`, kind: 'equipement', participantId: actorId, titre: `${actorName} · protection à compléter (PA retenus)`, detail: 'Complétez la protection', options: OPEN('Arbitrer') });
    const incident = preview.castPreview?.miscast || preview.miscast;
    if (incident && !incident.cancelled && (incident.initialRoll == null || incident.missingSecondaryDice?.length)) push({ id: `incident-magie:${actorId}`, kind: 'incident-magie', participantId: actorId, titre: `${actorName} · incident magique : dés à saisir`, detail: incident.initialRoll == null ? 'Jet d’incident magique à saisir' : 'dés', options: OPEN('Saisir les dés') });
    const conditionNeeds = [...(Array.isArray(preview.conditionNeeds) ? preview.conditionNeeds : []), ...texts.filter(text => CONDITION_TEXTS.has(text))];
    if (conditionNeeds.length) push({ id: `questions-etats:${actorId}`, kind: 'questions-etats', participantId: actorId, titre: `${actorName} · ${conditionNeeds[0]}`, detail: conditionNeeds[0], options: OPEN('Répondre') });
  }
  const lethal = resolution?.v5Context || {};
  if (lethal.lethalTableEnabled === true && lethal.lethalIntent === true && lethal.confirmLethalDeath !== true) push({ id: `issue-letale:${actorId}`, kind: 'issue-letale', participantId: actorId, titre: `${actorName} · intention létale : confirmer la mort ?`, options: [{ key: 'confirm', label: 'Confirmer la mort' }, { key: 'renounce', label: 'Renoncer' }] });

  // 15 · saisie de l'initiative ouverte (zone centrale, lot E5).
  if (context.initiativePending) push({ id: 'initiative', kind: 'initiative', titre: 'Initiative à saisir avant le round 1', options: OPEN('Saisir l’initiative') });

  // 18 et 19 · rappels et événements de scène (mêmes conditions que le bloc « À traiter » de main.js).
  const scene = safe(() => store.getActiveScene?.());
  if (scene) {
    const combat = context.combat || {};
    const transition = { id: `round-${combat.round || 0}`, type: 'endTurn', actorId: combat.currentActorId || null, round: combat.round || 0 };
    const reminders = safe(() => store.getReminders?.(transition), []) || [];
    for (const item of reminders) {
      if (item?.status !== 'pending' || (!combat.currentActorId && TURN_REMINDER_KINDS.includes(item.kind))) continue;
      push({ id: `rappel:${item.id}`, kind: 'rappel', participantId: item.participantId || item.actorId || null, titre: item.text || 'Rappel', formKey: 'overview', options: [{ key: 'resolve', label: 'Résoudre' }, { key: 'ignore', label: 'Ignorer' }, { key: 'snooze', label: 'Reporter' }] });
    }
    for (const event of Array.isArray(scene.events) ? scene.events : []) {
      if (safe(() => store.previewSceneEvent?.(event, { manual: true }))?.status !== 'proposed') continue;
      push({ id: `evenement-scene:${event.id}`, kind: 'evenement-scene', titre: event.label || event.title || 'Événement de scène : condition remplie', formKey: 'overview', options: [{ key: 'apply', label: 'Appliquer' }, { key: 'later', label: 'Plus tard' }] });
    }
  }

  // Questions publiées (fenêtres et formulaires ouverts), plus celles que le contexte apporte.
  for (const request of [...(Array.isArray(context.requests) ? context.requests : []), ...(context.requests ? [] : publishedDecisions())]) {
    if (!request?.id || !request.titre || !Array.isArray(request.options) || !request.options.length) continue;
    push({ ...request, options: request.options.filter(option => option?.key && option?.label) });
  }
  const order = new Map(DECISION_KINDS.map((row, index) => [row.kind, index]));
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => order.get(a.entry.kind) - order.get(b.entry.kind) || a.index - b.index).map(row => row.entry);
}

const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };

/**
 * Pose la case dans `zone` (en tête). `handlers.choose(entry, key)` reçoit chaque clic ; `handlers.forms` (Map) associe à
 * un identifiant d'entrée, ou à sa `formKey`, le formulaire existant déplacé dans la carte ; `handlers.later` (Set) les
 * entrées réduites par « Plus tard ».
 */
export function renderDecisions(zone, entries, handlers = {}) {
  const later = handlers.later || new Set(), forms = handlers.forms || new Map(), placed = new Set();
  const box = el('section', 'workspace-decisions');
  box.dataset.decisions = '';
  box.setAttribute('aria-label', 'À décider');
  const head = el('div', 'workspace-decisions-head');
  head.append(el('span', 'workspace-decisions-title', 'À décider'));
  const count = el('span', 'workspace-decisions-count num', String(entries.length));
  count.dataset.decisionsCount = String(entries.length);
  head.append(count);
  box.append(head);
  if (!entries.length) {
    box.classList.add('is-empty');
    head.append(el('span', 'workspace-decisions-empty', 'rien en attente'));
    zone.prepend(box);
    return box;
  }
  const list = el('ol', 'workspace-decisions-list');
  for (const entry of entries) {
    const formKey = forms.has(entry.id) ? entry.id : entry.formKey && forms.has(entry.formKey) ? entry.formKey : null;
    if (formKey && placed.has(formKey)) continue; // plusieurs entrées partagent le même formulaire (rappels, événements)
    const card = el('li', 'workspace-decision');
    card.dataset.decisionId = entry.id;
    card.dataset.decisionKind = entry.kind;
    if (entry.participantId) card.dataset.participantId = entry.participantId;
    const reduced = later.has(entry.id);
    card.classList.toggle('is-later', reduced);
    // Le formulaire partagé des rappels et événements porte ses propres libellés : pas de titre en double.
    if (!(formKey && entry.formKey === formKey && !reduced)) {
      const title = el('p', 'workspace-decision-title', entry.titre);
      title.title = entry.detail || entry.titre;
      card.append(title);
    } else card.setAttribute('aria-label', entry.titre);
    if (reduced) {
      const resume = el('button', 'workspace-ghost workspace-decision-resume', 'Décider');
      resume.type = 'button';
      resume.addEventListener('click', () => handlers.choose?.(entry, 'resume'));
      card.append(resume);
    } else if (formKey) {
      placed.add(formKey);
      card.classList.add('has-form');
      card.append(forms.get(formKey));
      if (entry.options.some(option => option.key === 'later') && entry.kind !== 'evenement-scene') card.append(optionButton(entry, { key: 'later', label: 'Plus tard' }, handlers));
    } else {
      const row = el('div', 'workspace-decision-options');
      for (const option of entry.options) row.append(optionButton(entry, option, handlers));
      card.append(row);
    }
    if (handlers.errors?.has?.(entry.id)) { const error = el('p', 'workspace-error', handlers.errors.get(entry.id)); error.setAttribute('role', 'alert'); card.append(error); }
    list.append(card);
  }
  box.append(list);
  zone.prepend(box);
  return box;
}

function optionButton(entry, option, handlers) {
  const primary = ['dead', 'confirm', 'enable', 'apply', 'resolve'].includes(option.key);
  const action = el('button', primary ? 'workspace-primary' : 'workspace-secondary', option.label);
  action.type = 'button';
  action.dataset.decisionOption = option.key;
  action.addEventListener('click', async () => {
    action.disabled = true;
    try { await handlers.choose?.(entry, option.key); } finally { if (action.isConnected) action.disabled = false; }
  });
  return action;
}
