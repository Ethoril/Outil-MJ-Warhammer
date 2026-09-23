import { discardSimulation, simulateAction } from '../core/simulation.js';
import { d100 } from '../core/dice.js';

/** E16 presentation: controls only create previews and delegate persistence to callbacks. */
export function initSimulationView({ mount, state, actor, actions = [], targets = [], engine = simulateAction, callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('simulation-view nécessite un mount');
  let currentState = state;
  let simulation = null;
  let comparison = null;
  let error = '';
  let busy = false;
  const draft = { actionId: '', targetId: '', roll: '', type: '' };

  function readablePreview(preview) {
    const score = preview?.score || {};
    const target = preview?.input?.target || null;
    const damage = preview?.damage;
    return [
      `${preview?.success ? 'Réussite' : 'Échec'} · Jet ${preview?.roll ?? '—'} contre ${score.target ?? '—'} · DR ${preview?.sl ?? 0}`,
      `Score : ${score.base ?? '—'} ${Number(score.mod || 0) >= 0 ? '+' : ''}${score.mod || 0} − ${score.statePenalty || 0} = ${score.target ?? '—'}`,
      target ? `Cible : ${target.name || preview.targetId || '—'} · PV ${target.hp ?? '—'}${damage ? ` → ${Number(target.hp || 0) - Number(damage.finalDamage || 0)}` : ''}` : 'Aucune cible',
      preview?.location ? `Localisation : ${preview.location.name || preview.location.key || '—'}` : '',
      damage ? `Dégâts retenus : ${damage.finalDamage ?? 0}` : '',
      preview?.critical ? `${preview.critical.kind}${preview.critical.expanded ? ' élargi' : ''}` : '',
      preview?.fumble ? (preview.fumble.expanded ? 'Maladresse élargie' : 'Maladresse') : ''
    ].filter(Boolean).join('\n');
  }

  function render() {
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'simulation-view';
    root.setAttribute('aria-label', 'Mode et si');
    const title = document.createElement('h2'); title.textContent = 'Et si…'; root.appendChild(title);
    const status = document.createElement('p'); status.textContent = 'Simulation isolée — aucune modification de la partie avant application.'; root.appendChild(status);
    if (error) { const alert = document.createElement('p'); alert.className = 'error'; alert.setAttribute('role', 'alert'); alert.textContent = error; root.appendChild(alert); }
    const action = document.createElement('select'); action.setAttribute('aria-label', 'Action');
    action.append(new Option('Choisir une action…', ''));
    actions.forEach(item => action.append(new Option(item.name || item.note || item.id || 'Action', item.id || '')));
    action.value = draft.actionId;
    const type = document.createElement('select'); type.setAttribute('aria-label', 'Type d’action'); type.append(new Option('Type…', ''), new Option('Attaque', 'attack'), new Option('Compétence', 'skill'), new Option('Défense / esquive', 'defense'), new Option('Opposition', 'opposition')); type.value = draft.type;
    const target = document.createElement('select'); target.setAttribute('aria-label', 'Cible');
    target.append(new Option('Aucune cible', ''));
    targets.forEach(item => target.append(new Option(item.name || item.id || 'Cible', item.id || '')));
    target.value = draft.targetId;
    const roll = document.createElement('input'); roll.type = 'text'; roll.inputMode = 'numeric'; roll.placeholder = 'd100 (01–00)'; roll.setAttribute('aria-label', 'Jet d100');
    roll.value = draft.roll;
    action.addEventListener('change', () => { draft.actionId = action.value; });
    target.addEventListener('change', () => { draft.targetId = target.value; });
    roll.addEventListener('input', () => { draft.roll = roll.value; });
    type.addEventListener('change', () => { draft.type = type.value; });
    const controls = document.createElement('div'); controls.append(action, type, target, roll);
    const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.textContent = 'Simuler'; previewButton.disabled = busy;
    previewButton.addEventListener('click', () => {
      try {
        const selectedAction = actions.find(item => item.id === action.value);
        const selectedTarget = targets.find(item => item.id === target.value) || null;
        if (!selectedAction) throw new Error('Choisissez une action.');
        if (!type.value) throw new Error('Choisissez le type d’action.');
        if (!roll.value.trim()) throw new Error('Saisissez un jet d100.');
        draft.actionId = action.value; draft.targetId = target.value; draft.roll = roll.value; draft.type = type.value;
        simulation = engine(currentState, { actor, action: { ...selectedAction, type: type.value }, target: selectedTarget, targetId: selectedTarget?.id || null, roll: roll.value });
        error = ''; render(); callbacks.onPreview?.(simulation);
      } catch (cause) { error = cause?.message || String(cause); render(); }
    });
    controls.append(previewButton); root.appendChild(controls);
    if (targets.length > 1) {
      const compareButton = document.createElement('button'); compareButton.type = 'button'; compareButton.className = 'ghost'; compareButton.textContent = 'Comparer toutes les cibles'; compareButton.disabled = busy || typeof callbacks.onCompare !== 'function';
      compareButton.addEventListener('click', async () => {
        try {
          const selectedAction = actions.find(item => item.id === action.value);
          if (!selectedAction) throw new Error('Choisissez une action.');
          if (!type.value) throw new Error('Choisissez le type d’action.');
          if (!roll.value.trim()) throw new Error('Saisissez un jet d100.');
          draft.actionId = action.value; draft.roll = roll.value; draft.type = type.value; busy = true; render();
          comparison = await callbacks.onCompare({ actor, action: { ...selectedAction, type: type.value }, targets, roll: roll.value });
          simulation = null; error = ''; busy = false; render();
        } catch (cause) { busy = false; error = cause?.message || String(cause); render(); }
      });
      controls.append(compareButton);
    }
    const virtual = document.createElement('button'); virtual.type = 'button'; virtual.className = 'ghost'; virtual.textContent = 'Lancer d100'; virtual.addEventListener('click', () => { roll.value = String(d100()); draft.roll = roll.value; previewButton.click(); });
    root.appendChild(virtual);
    if (comparison?.simulations?.length) {
      const heading = document.createElement('h3'); heading.textContent = 'Comparaison des cibles — choisissez un seul résultat'; root.appendChild(heading);
      comparison.simulations.forEach(candidate => {
        const preview = candidate.preview || candidate;
        const result = document.createElement('div'); result.className = 'simulation-preview card'; result.setAttribute('role', 'status'); result.textContent = readablePreview(preview);
        const choose = document.createElement('button'); choose.type = 'button'; choose.textContent = 'Choisir ce résultat'; choose.disabled = busy; choose.addEventListener('click', async () => {
          if (busy) return; busy = true; render();
          try { const resultValue = await callbacks.onApply(candidate); if (!resultValue || !['applied', 'duplicate'].includes(resultValue.status)) throw new Error(resultValue?.reason || 'Simulation non appliquée.'); }
          catch (cause) { error = cause?.message || String(cause); busy = false; render(); }
        }); result.appendChild(choose); root.appendChild(result);
      });
    } else if (simulation) {
      const preview = simulation.preview || simulation;
      const result = document.createElement('div'); result.className = 'simulation-preview'; result.setAttribute('role', 'status'); result.textContent = readablePreview(preview);
      const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Détails de la formule';
      const raw = document.createElement('pre'); raw.textContent = JSON.stringify(preview, null, 2); details.append(summary, raw); result.appendChild(details); root.appendChild(result);
      const actionsBox = document.createElement('div'); actionsBox.className = 'actions';
      const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Appliquer le résultat'; apply.disabled = busy || typeof callbacks.onApply !== 'function';
      if (typeof callbacks.onApply !== 'function') apply.title = 'Action indisponible';
      apply.addEventListener('click', async () => {
        if (busy || typeof callbacks.onApply !== 'function') return;
        busy = true; render();
        try {
          const resultValue = await callbacks.onApply(simulation);
          if (!resultValue || resultValue.status !== 'applied') {
            if (resultValue?.status === 'stale') throw new Error('La partie a changé ; relancez la simulation.');
            throw new Error(resultValue?.reason || 'Simulation non appliquée.');
          }
          currentState = resultValue.state || currentState; simulation = { ...simulation, status: 'applied' }; error = '';
        }
        catch (cause) { error = cause?.message || String(cause); }
        busy = false; render();
      });
      const discard = document.createElement('button'); discard.type = 'button'; discard.className = 'ghost'; discard.textContent = 'Abandonner'; discard.disabled = busy;
      discard.addEventListener('click', () => { const discarded = simulation; simulation = null; error = ''; callbacks.onDiscard?.(discardSimulation(discarded)); render(); });
      actionsBox.append(apply, discard); root.appendChild(actionsBox);
    }
    mount.appendChild(root);
  }

  return { render, setState(next) { currentState = next; simulation = null; error = ''; render(); }, getSimulation: () => simulation };
}
