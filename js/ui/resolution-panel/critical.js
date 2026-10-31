import { node, button, signed, rubric } from './dom.js';

// Champs de jet du critique : clé du brouillon de workspace-view. Saisir ou cocher ne vide jamais l'aperçu.
export const CRITICAL_ROLL_KEYS = Object.freeze({ location: 'criticalLocationRoll', effect: 'criticalEffectRoll', second: 'criticalSecondRoll', effectAlternative: 'criticalEffectAlternativeRoll', secondEffectAlternative: 'criticalSecondAlternativeRoll', injure: 'criticalInjureRoll', injureSecond: 'criticalInjureSecondRoll', injureAlternative: 'criticalInjureAlternativeRoll', injureSecondAlternative: 'criticalInjureSecondAlternativeRoll', defenderSecond:'defenderCriticalSecondRoll',defenderSecondAlternative:'defenderCriticalSecondAlternativeRoll',defenderInjureSecond:'defenderCriticalInjureSecondRoll',defenderInjureSecondAlternative:'defenderCriticalInjureSecondAlternativeRoll',defenderInjure: 'defenderCriticalInjureRoll', defenderInjureAlternative: 'defenderCriticalInjureAlternativeRoll', defenderLocation: 'defenderCriticalLocationRoll', defenderEffect: 'defenderCriticalEffectRoll', defenderEffectAlternative: 'defenderCriticalEffectAlternativeRoll' });

export function rollField({ field, label, value, error, handlers, disabled, critical = null }) {
  const wrapper = node('div', 'workspace-roll');
  const id = `workspace-roll-${field}`;
  const caption = node('label', 'workspace-roll-label', label);
  caption.htmlFor = id;
  const row = node('div', 'workspace-roll-row');
  const input = document.createElement('input');
  input.id = id;
  input.className = 'workspace-roll-input num';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = 'Saisir';
  input.title = 'Tapez le d100 lancé à la table (01 à 00), puis Entrée';
  input.maxLength = 3;
  input.value = value;
  input.dataset.rollInput = field;
  input.dataset.focusKey = `roll-${field}`;
  input.disabled = disabled;
  input.setAttribute('aria-describedby', error ? `workspace-roll-hint ${id}-error` : 'workspace-roll-hint');
  if (error) input.setAttribute('aria-invalid', 'true');
  input.addEventListener('input', () => (critical
    ? handlers.criticalInput(CRITICAL_ROLL_KEYS[critical], input.value)
    : handlers.input(field === 'attack' ? 'attackRoll' : 'defenseRoll', input.value)));
  if (critical) input.addEventListener('change', () => handlers.criticalChange());
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handlers.calculate();
  });
  const roll = button('Lancer', 'workspace-secondary', { 'aria-label': `Lancer le d100 : ${label}`, 'data-focus-key': `roll-${field}-dice` });
  roll.disabled = disabled;
  roll.addEventListener('click', () => (critical ? handlers.criticalRoll(CRITICAL_ROLL_KEYS[critical]) : handlers.roll(field)));
  row.append(input, roll);
  wrapper.append(caption, row);
  if (error) {
    const alert = node('p', 'workspace-field-error', error);
    alert.id = `${id}-error`;
    alert.setAttribute('role', 'alert');
    wrapper.appendChild(alert);
  }
  return wrapper;
}

export const zoneName = location => String(location.name).toLocaleLowerCase();

export function criticalEffectLine(part) {
  const base = part.effectRollBase;
  const choice = part.effectRollCandidates?.length === 2 ? `min(${part.effectRollCandidates.join(', ')}) = ` : '';
  const roll = choice + (part.bonus ? `${base} + ${part.bonus} = ${part.effectRoll}` : String(part.effectRoll));
  const line = node('p', 'workspace-result-line workspace-critical-effect');
  line.append(node('span', 'num', `${roll} → `), node('strong', '', `« ${part.effect.name} »`), ` : ${part.effect.eff}`);
  return line;
}

export function criticalItemBox(item, handlers, busy) {
  const label = node('label', 'workspace-critical-item');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = item.applied;
  box.disabled = busy;
  box.dataset.focusKey = `critical-item-${item.id}`;
  box.addEventListener('change', () => handlers.criticalToggle(item.id, box.checked));
  label.append(box, node('span', '', item.label));
  return label;
}

// Gravité (d100), effet lu, cases à cocher, rappels : commun au critique et au second critique.
export function criticalSeverity(part, crit, { field, label, value, error }, preview, draft, handlers) {
  const nodes = [rollField({ field, label, value, error, handlers, disabled: draft.busy, critical: crit === 'first' ? 'effect' : 'second' })];
  if (part.effect) nodes.push(criticalEffectLine(part));
  const items = preview.critical.items.filter(item => item.crit === crit);
  if (items.length) {
    const list = node('div', 'workspace-critical-items');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', crit === 'first' ? 'Effets du critique' : 'Effets du second critique');
    items.forEach(item => list.appendChild(criticalItemBox(item, handlers, draft.busy)));
    nodes.push(list);
  }
  if (part.parsed?.reminders.length) nodes.push(node('p', 'workspace-formula-notes workspace-muted', `À arbitrer : ${part.parsed.reminders.join(' ; ')}`));
  if (part.parsed?.death) nodes.push(node('p', 'workspace-critical-death', 'Mort instantanée'));
  return nodes;
}

export function renderCritical(preview, draft, handlers, defending = false) {
  const critical = defending ? preview.defenderCritical : preview.critical;
  const { details, second } = critical;
  const errors = draft.criticalErrors || {};
  const block = node('div', 'workspace-critical');
  const title = defending ? 'Critique défensif sur l’attaquant' : 'Blessures critiques sur la cible';
  block.setAttribute('role', 'group'); block.setAttribute('aria-label', title);
  block.appendChild(rubric(title));
  const appendPart = (part, kind, label) => {
    if (!part) return;
    block.appendChild(rubric(label));
    if (kind === 'first') block.appendChild(rollField({ field: defending ? 'defender-critical-location' : 'critical-location',
      label: 'Localisation du critique (nouveau d100)', value: defending ? draft.defenderCriticalLocationRoll : draft.criticalLocationRoll,
      error: errors[defending ? 'defenderLocation' : 'location'] || '', handlers, disabled: draft.busy,
      critical: defending ? 'defenderLocation' : 'location' }));
    if (!part.location) return;
    block.appendChild(node('p', 'workspace-result-line', `${part.locationRoll} → ${part.location.name}`));
    block.appendChild(rollField({ field: defending ? 'defender-critical-effect' : kind === 'first' ? 'critical-effect' : 'critical-second',
      label: part.bonus ? `Gravité (d100 + ${part.bonus})` : 'Gravité (d100)',
      value: defending ? kind==='first'?draft.defenderCriticalEffectRoll:draft.defenderCriticalSecondRoll : kind === 'first' ? draft.criticalEffectRoll : draft.criticalSecondRoll,
      error: errors[defending ? 'defenderEffect' : kind === 'first' ? 'effect' : 'secondEffect'] || '', handlers, disabled: draft.busy,
      critical: defending ? kind==='first'?'defenderEffect':'defenderSecond' : kind === 'first' ? 'effect' : 'second' }));
    if (part.needsAlternative || part.effectAlternativeRoll != null) block.appendChild(rollField({
      field: defending ? 'defender-critical-effect-alternative' : kind === 'first' ? 'critical-effect-alternative' : 'critical-second-alternative',
      label: 'Inoffensive : deuxième gravité (retenir le minimum)',
      value: defending ? kind==='first'?draft.defenderCriticalEffectAlternativeRoll:draft.defenderCriticalSecondAlternativeRoll : kind === 'first' ? draft.criticalEffectAlternativeRoll : draft.criticalSecondAlternativeRoll,
      error: errors[defending ? 'defenderEffectAlternative' : kind === 'first' ? 'effectAlternative' : 'secondEffectAlternative'] || '', handlers, disabled: draft.busy,
      critical: defending ? kind==='first'?'defenderEffectAlternative':'defenderSecondAlternative' : kind === 'first' ? 'effectAlternative' : 'secondEffectAlternative' }));
    const subject=defending?preview.input.target:preview.input.actor;
    const pinned=(preview.talentPlans||[]).filter(p=>p.event==='critical.beforeTable'&&p.role===(defending?'defender':'attacker')).flatMap(p=>p.proposals||[]);
    if(pinned.some(p=>p.op==='chooseCriticalRoll')){
      const field=defending?kind==='first'?'defenderInjure':'defenderInjureSecond':kind==='first'?'injure':'injureSecond';
      const draftKey=CRITICAL_ROLL_KEYS[field];
      block.appendChild(rollField({field:'injure-'+(defending?'defender-':'')+kind,label:'Frappe blessante : deuxième gravité au choix',value:draft[draftKey]||'',error:'',handlers,disabled:draft.busy,critical:field}));
      if((defending?preview.input.defense?.qualities:preview.input.action.qualities)?.some(q=>q.id==='inoffensive')){
        const alt=field+'Alternative';block.appendChild(rollField({field:'injure-alt-'+(defending?'defender-':'')+kind,label:'Inoffensive : autre dé de la deuxième paire',value:draft[CRITICAL_ROLL_KEYS[alt]]||'',error:'',handlers,disabled:draft.busy,critical:alt}));
      }
      const label=node('label','workspace-type','Frappe blessante : gravité retenue');const choice=document.createElement('select');choice.setAttribute('aria-label','Frappe blessante : gravité retenue ('+(defending?'défense, '+kind:kind)+')');choice.append(new Option('Choisir',''),new Option('Premier résultat','false'),new Option('Deuxième résultat','true'));
      const current=draft[defending?'defenseTalentChoices':'talentChoices']?.['injure:'+kind];choice.value=typeof current==='boolean'?String(current):'';
      choice.addEventListener('change',()=>handlers.criticalChoose(defending?'defender':'actor','injure:'+kind,choice.value===''?undefined:choice.value==='true'));label.append(choice);block.append(label);
    }
    if(pinned.some(p=>p.op==='modifyCriticalRoll')){
      const label=node('label','workspace-type');const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Harponneur : augmenter la gravité');check.checked=draft.talentChoices?.harpooner===true;check.addEventListener('change',()=>handlers.criticalChoose('actor','harpooner',check.checked));label.append(check,'Harponneur : +10 par acquisition (d100 plafonné à 100)');block.append(label);
    }
    if (part.effect) block.appendChild(criticalEffectLine(part));
    for (const item of critical.items.filter(item => item.crit === kind)) block.appendChild(criticalItemBox(
      { ...item, id: defending ? `defender:${item.id}` : item.id }, handlers, draft.busy));
    if (part.parsed?.reminders.length) block.appendChild(node('p', 'workspace-muted', `À traiter : ${part.parsed.reminders.join(' ; ')}`));
    if (part.parsed?.death) block.appendChild(node('p', 'workspace-critical-death', 'Mort instantanée — décision du MJ à enregistrer.'));
  };
  appendPart(details, 'first', defending ? 'Critique de la défense' : 'Critique du jet');
  appendPart(second, 'second', `Critique d’excédent : ${critical.excessWounds} Blessures au-delà de 0`);
  return block;
}

export function renderV5Decisions(preview, draft, handlers) {
  const block = node('div', 'workspace-v5-decisions');
  for (const [role, decision] of Object.entries(preview.decisions || {})) {
    if (!decision.choiceRequired && !decision.forcedInversion) continue;
    const name = role === 'actor' ? preview.input.actor?.name || 'Acteur' : preview.input.target?.name || 'Défenseur';
    const group = node('fieldset', 'workspace-v5-choice-group');
    group.appendChild(node('legend', '', `${name} — ${decision.forcedInversion ? 'inversion obligatoire' : 'choix du joueur'}`));
    const cards = node('div', 'workspace-v5-choice-cards');
    const selected = role === 'actor' ? preview.input.v5.choice : preview.input.defense?.v5.choice;
    for (const option of decision.options) {
      const card = node('label', 'workspace-v5-choice');
      if (option.id === selected) card.classList.add('is-selected');
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = `v5-choice-${role}`;
      radio.value = option.id; radio.checked = option.id === selected || !decision.choiceRequired;
      radio.disabled = draft.busy || !decision.choiceRequired; radio.dataset.focusKey = `v5-choice-${role}-${option.id}`;
      radio.addEventListener('change', () => handlers.chooseV5(role, option.id));
      const summary = option.summary;
      const text = node('div', 'workspace-v5-choice-text');
      text.append(node('strong', '', option.label), node('span', '', `${role === 'defender' ? (summary.hit ? 'Touche reçue' : 'Attaque évitée') : (summary.hit ? 'Touché' : 'Pas de touche')} · ${signed(summary.sl)} DR`));
      if (summary.location) text.appendChild(node('span', '', summary.location));
      text.appendChild(node('span', '', summary.woundsLost == null ? 'Blessures à préciser' : `${summary.woundsLost} Blessures ${role === 'defender' ? 'subies par le défenseur' : 'perdues par la cible'}`));
      if (summary.certainty === 'partial') text.appendChild(node('span', 'workspace-muted', 'Conséquences incomplètes : données à préciser.'));
      if (summary.importantEffects.length) text.appendChild(node('span', '', summary.importantEffects.join(' · ')));
      text.appendChild(node('span', 'workspace-muted', 'Coût : aucun'));
      if (decision.recommendation?.optionId === option.id) text.appendChild(node('span', 'workspace-v5-recommendation', `Conseil : ${decision.recommendation.label}`));
      card.append(radio, text); cards.appendChild(card);
    }
    group.appendChild(cards);
    if (decision.equivalentKnownWounds) group.appendChild(node('p', 'workspace-muted', 'Même nombre de Blessures connu : comparez les autres conséquences.'));
    block.appendChild(group);
  }
  return block;
}

/** Temps écoulé : un seul contrôle pour les durées de sorts, d'incidents, de méditations (états de talent) et de Forme bestiale. */
export function renderElapsedTime(participants, handlers) {
  const timed = p => (p.states || []).some(s => Number.isFinite(s.remainingMinutes))
    || (p.extensions?.v5?.spellEffects || []).some(e => Number.isFinite(e.remainingMinutes) || Number.isFinite(e.expiresAtRound))
    || (p.extensions?.v5?.miscastEffects || []).some(e => Number.isFinite(e.remainingMinutes))
    || Boolean(p.extensions?.v5?.beastForm);
  if (!participants.some(timed)) return null;
  const block = node('div', 'workspace-v5-context');
  const advance = button('Temps de campagne', 'workspace-secondary', { 'data-focus-key': 'advance-minutes-btn' });
  advance.addEventListener('click', () => handlers.openCampaignTime());
  block.appendChild(advance);
  return block;
}
