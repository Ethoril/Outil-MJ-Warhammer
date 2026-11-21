/**
 * Frise d'initiative (refonte de l'interface, lot E1 ; spec S2, CA4 à CA6).
 * Une ligne de portraits dans l'ordre du round : celui dont c'est le tour est cerné d'or, ceux qui ont joué sont
 * atténués, les morts grisés ; chaque portrait porte le rang, les PV, l'Élan, la monture et la marque « décision en
 * attente ». Un clic sur un portrait fait de ce combattant celui qui agit (fiche de gauche, actions), même hors de
 * son tour, sans changer le tour en cours : `handlers.selectActor(id)`. La frise ne choisit jamais la cible (CA6 :
 * les cartouches des mêlées, lot E4a).
 *
 * `friseModel` et `actorOutOfTurn` sont des fonctions pures (testées sous Node) ; `renderFrise` pose le DOM.
 * Le module ne lit pas le store : il ne reçoit que le `context` de `playContext()`. `context.decisions` (liste de
 * `{ participantId }`, alimentée par la case « À décider » du lot E2) est facultative : absente = aucune marque.
 */
import { hasMomentum } from '../core/v5-momentum-state.js';

const v5Of = participant => participant?.extensions?.v5 || {};
const asNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const isDead = participant => asNumber(participant.hp) <= 0
  || (Array.isArray(participant.states) ? participant.states : []).some(state => /^(dead|mort)$/i.test(String(state?.key ?? state?.name ?? state ?? '')));

/** Texte de la monture d'un portrait : « Monté sur X », « Monture de Y » ou rien. */
function mountText(participant, people) {
  const v5 = v5Of(participant);
  if (v5.mounted === true) {
    const mount = people.find(row => row.id === v5.mountId);
    return mount ? `Monté sur ${mount.name}` : 'Monté';
  }
  if (typeof v5.mountOf === 'string' && v5.mountOf) {
    const rider = people.find(row => row.id === v5.mountOf);
    return rider ? `Monture de ${rider.name}` : 'Monture';
  }
  return null;
}

/**
 * Portraits de la frise, dans l'ordre reçu (celui du round) :
 * `{ id, nom, rang, camp, tour, agit, joue, mort, pv, pvMax, elan, monture, decision }`.
 * `joue` : précède celui dont c'est le tour (jamais avant le début du combat) ; `decision` : nombre de décisions en attente.
 */
export function friseModel(context) {
  const people = Array.isArray(context?.active) ? context.active : [];
  const turnId = context?.started ? context.combat?.currentActorId : null;
  const turnIndex = turnId ? people.findIndex(row => row.id === turnId) : -1;
  const decisions = Array.isArray(context?.decisions) ? context.decisions : [];
  return people.map((participant, index) => {
    const pv = asNumber(participant.hp);
    return {
      id: participant.id,
      nom: participant.name,
      rang: index + 1,
      camp: typeof context.camp === 'function' ? context.camp(participant) : 'neutre',
      tour: turnIndex >= 0 && index === turnIndex,
      agit: Boolean(context.actor) && participant.id === context.actor.id,
      joue: turnIndex >= 0 && index < turnIndex,
      mort: isDead(participant),
      pv,
      pvMax: asNumber(participant.maxHp, pv),
      elan: hasMomentum(participant),
      monture: mountText(participant, people),
      decision: decisions.filter(item => item?.participantId === participant.id).length
    };
  });
}

/** Celui qui agit quand ce n'est pas son tour (clic sur la frise) : `{ actorId, name, turnActorId, round }`, sinon null. */
export function actorOutOfTurn(context) {
  const actor = context?.actor;
  const turn = context?.started ? context.turnActor : null;
  if (!actor || !turn || actor.id === turn.id) return null;
  return { actorId: actor.id, name: actor.name, turnActorId: turn.id, round: Number(context.combat?.round) || 0 };
}

/** Nom accessible d'un portrait : tout ce que la couleur ou l'icône disent est écrit en toutes lettres. */
export function friseLabel(row) {
  const parts = [`${row.rang}. ${row.nom}`, `PV ${row.pv}/${row.pvMax}`];
  if (row.tour) parts.push('au tour de jouer');
  else if (row.joue) parts.push('a joué ce round');
  if (row.agit && !row.tour) parts.push('agit hors de son tour');
  if (row.mort) parts.push('hors de combat');
  if (row.elan) parts.push('Élan');
  if (row.monture) parts.push(row.monture);
  if (row.decision) parts.push(`${row.decision} décision${row.decision > 1 ? 's' : ''} en attente`);
  return parts.join(', ');
}

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const pct = (value, max) => Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
const tone = (pv, max) => (pv <= 0 ? 'crit' : pct(pv, max) <= 25 ? 'crit' : pct(pv, max) <= 50 ? 'warn' : 'ok');

/** Pose la frise dans sa zone. `handlers.selectActor(id)` est la fonction existante de workspace-view. */
export function renderFrise(zone, context, handlers = {}) {
  const rows = friseModel(context);
  zone.replaceChildren();
  if (!rows.length) return;
  const list = el('ol', 'frise-list');
  list.setAttribute('aria-label', 'Ordre d’initiative');
  for (const row of rows) {
    const item = el('li', 'frise-item');
    const portrait = el('button', `frise-portrait is-camp-${row.camp}`);
    portrait.type = 'button';
    portrait.dataset.friseId = row.id;
    portrait.dataset.focusKey = `frise-${row.id}`;
    portrait.setAttribute('aria-label', friseLabel(row));
    portrait.setAttribute('aria-pressed', String(row.agit));
    if (row.tour) portrait.setAttribute('aria-current', 'step');
    portrait.title = `${row.nom} : clic pour le faire agir${row.tour ? '' : ' (le tour ne change pas)'}`;
    portrait.classList.toggle('is-turn', row.tour);
    portrait.classList.toggle('is-actor', row.agit);
    portrait.classList.toggle('is-done', row.joue && !row.mort);
    portrait.classList.toggle('is-dead', row.mort);
    portrait.classList.toggle('has-decision', row.decision > 0);
    portrait.append(el('span', 'frise-rank num', String(row.rang)));
    if (row.elan) { const momentum = el('span', 'frise-momentum', 'É'); momentum.title = 'A l’Élan'; portrait.append(momentum); }
    portrait.append(el('span', 'frise-name combatant-name', row.nom));
    const meta = el('span', 'frise-meta num');
    meta.append(el('span', 'frise-hp', `${row.pv}/${row.pvMax}`));
    if (row.monture) { const mount = el('span', 'frise-mount', '♞'); mount.title = row.monture; meta.append(mount); }
    if (row.mort) meta.append(el('span', 'frise-dead', '✝'));
    portrait.append(meta);
    const bar = el('span', `frise-bar is-${tone(row.pv, row.pvMax)}`);
    bar.setAttribute('aria-hidden', 'true');
    const fill = el('span', 'frise-bar-fill');
    fill.style.width = `${pct(row.pv, row.pvMax)}%`;
    bar.append(fill);
    portrait.append(bar);
    if (row.decision) { const mark = el('span', 'frise-decision', '!'); mark.title = 'Décision en attente'; portrait.append(mark); }
    // Lot E4a : les cartouches des mêlées choisissent la cible ; « data-workspace-select » (choisir qui agit) vit désormais ici.
    // Le clic passe par l'écoute commune de workspace-view (mêmes parcours qu'avant : [data-workspace-select="id"]).
    portrait.dataset.workspaceSelect = row.id;
    item.append(portrait);
    list.append(item);
  }
  zone.append(list);
}
