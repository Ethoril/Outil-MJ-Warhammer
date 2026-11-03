// Plateau des mêlées (maquette B, spec engagements S1-S3) : zones (une par mêlée, Libres) et barre d'actions du combattant
// actif, dont chaque bouton annonce sa conséquence avant le clic. Les jetons eux-mêmes sont construits par workspace-view
// (mêmes sélecteurs que l'ancienne piste) ; ce module ne fait que le découpage et les commandes.
import { meleeGroups, engagedWith, deriveEngagementContext } from '../../core/engagements.js';
import { outnumberSide, planOutnumbering } from '../../core/outnumbering.js';
import { inferV5Kind } from '../../core/v5-combat-rules.js';

const el = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const enemiesOf = (person, people) => people.filter(other => other.id !== person.id && outnumberSide(other) !== outnumberSide(person));
const ATTACKS = ['attack', 'attaque'];

/** Zones du plateau dans l'ordre du Round : mêlées (ordre de leur premier membre), puis Libres. */
export function plateauZones(active) {
  const combat = { participants: active }, groups = meleeGroups(combat, active), engaged = new Set(groups.flatMap(group => group.ids));
  const zones = groups.map((group, index) => {
    const members = active.filter(person => group.ids.includes(person.id));
    const sides = new Map();
    for (const person of members) sides.set(outnumberSide(person), (sides.get(outnumberSide(person)) || 0) + 1);
    const counts = [...sides.values()].sort((a, b) => b - a);
    return { kind: 'melee', id: group.id, title: `Mêlée ${index + 1}`, ratio: counts.length > 1 ? counts.join(' contre ') : '', members };
  });
  zones.push({ kind: 'free', id: 'free', title: 'Libres', members: active.filter(person => !engaged.has(person.id)) });
  return zones;
}

/** Première action d'attaque du combattant d'un genre donné ('melee' | 'ranged'), au sens de l'inférence du moteur. */
const attackOfKind = (actions, kind) => actions.findIndex(action => ATTACKS.includes(action.type) && inferV5Kind(action, {}) === kind);

/**
 * Modèle de la barre d'actions : `{ id, label, consequence, disabled?, run }` où `run` reçoit les commandes
 * (`select`, `disengage`, `flee`, `brokenFlee`). `actions` : actions préparées de l'acteur (avec leur clé).
 */
export function actionBarModel({ actor, active, actions = [], actionKeys = [], previewDisengage }) {
  if (!actor || actor.zone !== 'active') return [];
  const engagedIds = engagedWith({ participants: active }, active, actor.id), engagedFoes = enemiesOf(actor, active).filter(foe => engagedIds.includes(foe.id));
  const freeFoes = enemiesOf(actor, active);
  const meleeIndex = attackOfKind(actions, 'melee'), rangedIndex = attackOfKind(actions, 'ranged');
  const meleeKey = meleeIndex >= 0 ? actionKeys[meleeIndex] : null, rangedKey = rangedIndex >= 0 ? actionKeys[rangedIndex] : null;
  const rows = [];
  for (const foe of engagedFoes) {
    const derived = deriveEngagementContext({ combat: { participants: active }, participants: active, actorId: actor.id, targetId: foe.id, kind: 'melee' });
    const plan = planOutnumbering({ actor, target: foe, participants: active, context: derived });
    rows.push({ id: `attack-${foe.id}`, label: `Attaquer · ${foe.name}`, consequence: [plan.outnumbered || plan.surrounded ? plan.summary : 'engagés', ...(meleeKey ? [] : ['aucune arme de mêlée préparée'])].join(' · '),
      run: commands => commands.select({ targetId: foe.id, ...(meleeKey ? { actionKey: meleeKey } : {}) }) });
  }
  if (engagedFoes.length) {
    const plan = previewDisengage(actor.id);
    const consequence = plan.mode === 'surrounded' ? 'impossible : encerclé (Fuir reste possible)' : plan.mode === 'momentum' ? 'perd l’Élan, sans Test'
      : plan.mode === 'orderly' ? 'En Bon Ordre : sans Élan ni Test' : `Test opposé contre ${active.find(row => row.id === plan.bestOpponentId)?.name || 'l’adversaire'}${plan.outnumbered ? ', Désavantage (infériorité)' : ''}`;
    rows.push({ id: 'disengage', label: 'Se désengager', consequence, run: commands => commands.disengage() });
    const orderly = actor.extensions?.v5?.specialStates?.orderlyDisengage === true;
    rows.push({ id: 'flee', label: 'Fuir', consequence: orderly ? `En Bon Ordre : pas d’Élan pour ${engagedFoes.map(foe => foe.name).join(', ')} ; Brisé dû`
      : `Élan et attaque gratuite pour ${engagedFoes.map(foe => foe.name).join(', ')} ; +${engagedFoes.length} Brisé`, run: commands => commands.flee() });
  }
  // Charge (p. 163) : seulement si non engagé ; engagé, la raison est annoncée et le clic vaut forçage par le MJ.
  for (const foe of freeFoes.filter(foe => !engagedIds.includes(foe.id)).slice(0, 4)) rows.push({ id: `charge-${foe.id}`, label: `Charger · ${foe.name}`,
    consequence: engagedFoes.length ? 'interdit : déjà engagé (p. 163) · clic = forcer (MJ)' : 'Élan si la distance de charge est atteinte',
    run: commands => commands.select({ targetId: foe.id, charging: true, ...(meleeKey ? { actionKey: meleeKey } : {}) }) });
  if (engagedFoes.length && !freeFoes.some(foe => !engagedIds.includes(foe.id))) rows.push({ id: 'charge-blocked', label: 'Charger', consequence: 'interdit : déjà engagé (p. 163) · clic = forcer (MJ)',
    run: commands => commands.select({ targetId: engagedFoes[0].id, charging: true, ...(meleeKey ? { actionKey: meleeKey } : {}) }) });
  if (rangedKey) {
    const target = enemiesOf(actor, active).find(foe => !engagedIds.includes(foe.id)) || enemiesOf(actor, active)[0];
    if (target) {
      const derived = deriveEngagementContext({ combat: { participants: active }, participants: active, actorId: actor.id, targetId: target.id, kind: 'ranged' });
      const consequence = derived.shooterEngagedElsewhere ? 'engagé : Pistolet seulement' : derived.targetEngaged ? 'cible engagée : Désavantage, déviation possible' : 'tir libre';
      rows.push({ id: `shoot-${target.id}`, label: `Tirer · ${target.name}`, consequence, run: commands => commands.select({ targetId: target.id, actionKey: rangedKey }) });
    }
  }
  const aimTarget = engagedFoes[0] || enemiesOf(actor, active)[0];
  if (aimTarget) rows.push({ id: `aim-${aimTarget.id}`, label: `Viser · ${aimTarget.name}`, consequence: 'la prochaine attaque en profite',
    run: commands => { commands.select({ targetId: aimTarget.id }); commands.focus('declare-aim'); } });
  rows.push({ id: 'other', label: 'Autres actions', consequence: 'magie, prière ou Test : panneau complet', run: commands => commands.focus('action') });
  return rows;
}

/** Barre d'actions : un bouton par entrée, sa conséquence sous le libellé. */
export function renderActionBar(container, { actor, rows, commands }) {
  const bar = el('section', 'workspace-action-bar');
  bar.setAttribute('aria-label', `Actions de ${actor.name}`);
  bar.appendChild(el('p', 'workspace-action-bar-title', `${actor.name} · ce qu’il peut faire d’ici`));
  const list = el('div', 'workspace-action-bar-list');
  for (const row of rows) {
    const action = el('button', 'workspace-action-bar-item');
    action.type = 'button';
    action.dataset.focusKey = `plateau-${row.id}`;
    action.append(el('strong', '', row.label), el('span', '', row.consequence));
    action.setAttribute('aria-label', `${row.label} : ${row.consequence}`);
    action.addEventListener('click', () => row.run(commands));
    list.appendChild(action);
  }
  bar.appendChild(list);
  container.appendChild(bar);
  return bar;
}

/**
 * Formulaire de Désengagement (p. 163) : compétence, deux d100, aperçu recalculé à chaque saisie, puis Appliquer.
 * `state` : { skill, actorRoll, opponentRoll, force } gardé par l'appelant ; `onChange(patch)`, `onApply()`, `onClose()`.
 */
export function renderDisengageForm(container, { actor, plan, state, active, onChange, onApply, onClose }) {
  const form = el('section', 'workspace-disengage');
  form.setAttribute('aria-label', `Désengagement de ${actor.name}`);
  form.appendChild(el('p', 'workspace-action-bar-title', `${actor.name} se désengage`));
  const name = id => active.find(row => row.id === id)?.name || id;
  if (plan.mode === 'surrounded') {
    form.appendChild(el('p', 'workspace-muted', plan.reason));
    const force = el('button', 'workspace-secondary', 'Passer outre (décision du MJ)');
    force.type = 'button';
    force.addEventListener('click', () => onChange({ force: true }));
    form.appendChild(force);
  } else if (plan.mode === 'test') {
    const skillLabel = el('label', 'workspace-type', 'Compétence'), skill = el('select');
    skill.setAttribute('aria-label', 'Compétence du Désengagement');
    skill.append(new Option(`Esquive (${plan.skill === 'esquive' ? plan.actorScore : '—'})`, 'esquive'), new Option('Acrobaties', 'acrobaties'));
    skill.value = plan.skill;
    skill.addEventListener('change', () => onChange({ skill: skill.value }));
    skillLabel.appendChild(skill);
    const roll = (label, key) => {
      const field = el('label', 'workspace-type', label), input = el('input');
      input.type = 'number';
      input.min = '1';
      input.max = '100';
      input.value = state[key] ?? '';
      input.setAttribute('aria-label', label);
      input.addEventListener('change', () => onChange({ [key]: input.value === '' ? undefined : Number(input.value) }));
      field.appendChild(input);
      return field;
    };
    form.append(skillLabel, roll(`d100 de ${actor.name} (score ${plan.actorScore}${plan.outnumbered ? ', Désavantage' : ''})`, 'actorRoll'),
      roll(`d100 de ${name(plan.bestOpponentId)} (meilleure Mêlée ${plan.opponentScore})`, 'opponentRoll'));
  }
  if (plan.summary || (plan.status !== 'ready' && plan.reason && plan.mode !== 'surrounded')) form.appendChild(el('p', plan.status === 'ready' ? '' : 'workspace-muted', plan.summary || plan.reason));
  const row = el('div', 'workspace-inline-actions'), apply = el('button', 'workspace-primary', 'Appliquer le désengagement'), close = el('button', 'workspace-secondary', 'Fermer');
  apply.type = 'button';
  close.type = 'button';
  apply.disabled = plan.status !== 'ready';
  apply.addEventListener('click', onApply);
  close.addEventListener('click', onClose);
  row.append(apply, close);
  form.appendChild(row);
  container.appendChild(form);
  return form;
}
