import { d10 } from '../core/dice.js';
import { PURSUIT_TEST_SKILLS, pursuitMovementOf, pursuitMovementIssues, pickPursuitPair, pursuitObstacleSide, drawObstacle, freeObstacle, previewPursuitTest, previewObstacleTest } from '../core/v5-pursuit.js';
import { userMessage } from './messages.js';
import { node, button } from './resolution-panel/dom.js';
import { nameIn, appendMovementIssue, selectField, renderTestInputs, renderTestResult, renderTestPrompts, renderFactorsBox, renderObstacleSummary, renderObstacleControls, renderOutcomeBox } from './v5-pursuit-panel.js';
/** Modale de poursuite de scène, écran Jouer (Livre de base V5, p. 158-159 ; docs/specs/poursuite-v5, lot L6). Résolue d'un bloc (D8) : aucune
 * Action, aucun Round, rien de conservé hors de la modale ; seul « Valider » écrit (une entrée d'historique, une ligne de journal). Aucune
 * règle ici : le moteur (v5-pursuit.js) et le Store décident, la modale recueille les saisies du MJ et montre l'issue. Un aperçu n'écrit rien.
 */
const FOCUS_KEY = 'scene-pursuit';
const ROLE_OPTIONS = [['', 'Hors de la poursuite'], ['prey', 'Fuyard'], ['pursuer', 'Poursuivant']];
const isNumber = value => String(value ?? '').trim() !== '' && Number.isFinite(Number(value));
const skillLabel = skill => skill.label + (skill.use ? ' (' + skill.use + ')' : '');

/** Entrée de l'écran Jouer (D17) : grisée, avec son motif lu par le bouton, quand la rencontre en cours n'a pas deux participants. */
export function renderScenePursuitEntry({ Store, onOpen = () => {} } = {}) {
  const { available, reason } = Store.scenePursuitAvailability(), box = node('div', 'workspace-pursuit-entry');
  const open = button('Poursuite de scène', 'workspace-secondary'); open.dataset.pursuitSceneOpen = ''; open.dataset.focusKey = FOCUS_KEY;
  open.disabled = !available;
  if (available) open.addEventListener('click', () => onOpen());
  box.append(open);
  if (!available) {
    const why = node('p', 'workspace-muted', reason); why.dataset.pursuitSceneReason = ''; why.setAttribute('id', 'pursuit-scene-reason');
    open.setAttribute('aria-describedby', 'pursuit-scene-reason'); box.append(why);
  }
  return box;
}

/** Contenu de la modale : `render()` rend l'arbre à jour du brouillon ; `refresh()` le réaffiche ; `close()` ferme la fenêtre sans écrire. */
export function createScenePursuitForm({ Store, refresh = () => {}, close = () => {} } = {}) {
  const d = { roles: {}, movement: {}, side: '', pair: { pursuerId: '', preyId: '' }, tests: {}, factors: {}, obstacles: {}, frees: {}, applied: null, error: '', busy: false };
  const change = patch => { Object.assign(d, patch, { error: '' }); refresh(); };
  const testOf = id => (d.tests[id] ??= { skill: PURSUIT_TEST_SKILLS[0].label, roll: '', context: {}, beneficiaryId: null });
  const obstacleOf = entry => { try { return entry.free ? freeObstacle(entry.free) : drawObstacle(entry.d10); } catch { return null; } };

  function render() {
    const people = Store.listParticipants().filter(row => row.zone === 'active'), locked = d.applied !== null;
    const idsOf = role => people.filter(row => d.roles[row.id] === role).map(row => row.id), preyIds = idsOf('prey'), pursuerIds = idsOf('pursuer');
    const counted = id => (isNumber(d.movement[id]) ? Number(d.movement[id]) : pursuitMovementOf(people.find(row => row.id === id), people));
    const side = pursuitObstacleSide({ preyIds, pursuerIds, isPlayer: id => people.find(row => row.id === id)?.kind === 'PJ' }) ?? (['prey', 'pursuers'].includes(d.side) ? d.side : null);
    const group = side === 'prey' ? preyIds : side === 'pursuers' ? pursuerIds : [];
    const override = preyIds.includes(d.pair.preyId) && pursuerIds.includes(d.pair.pursuerId) ? d.pair : null;
    const movement = Object.fromEntries([...preyIds, ...pursuerIds].map(id => [id, counted(id)]));
    const pair = preyIds.length && pursuerIds.length ? pickPursuitPair({ preyIds, pursuerIds, movement, override }) : null;
    const movementIssues = pursuitMovementIssues({ preyIds, pursuerIds, movement });
    const personOf = id => people.find(row => row.id === id);

    // Aperçu du bloc : une saisie de jet vide n'est pas envoyée (le Test attend), les autres le sont avec leur compétence et leur contexte.
    const input = () => {
      const tests = {};
      for (const [role, id] of [['pursuer', pair?.pursuerId], ['prey', pair?.preyId]]) if (id && isNumber(testOf(id).roll)) tests[role] = { skill: testOf(id).skill, roll: Number(testOf(id).roll), context: testOf(id).context };
      const specs = group.filter(id => d.obstacles[id]).map(id => {
        const entry = d.obstacles[id], obstacle = obstacleOf(entry), skill = entry.skill || obstacle?.skills[0]?.label;
        return { participantId: id, ...(entry.free ? entry.free : { d10: entry.d10 }), ...(isNumber(entry.roll) && skill ? { skill, roll: Number(entry.roll), context: entry.context, beneficiaryId: entry.beneficiaryId } : {}) };
      });
      const corrected = Object.fromEntries([...preyIds, ...pursuerIds].filter(id => isNumber(d.movement[id])).map(id => [id, Number(d.movement[id])]));
      return { preyIds, pursuerIds, movement: corrected, ...(d.side ? { obstacleSide: d.side } : {}), ...(override ? { pair: override } : {}), tests,
        ...(Object.keys(d.factors).length ? { factors: d.factors } : {}), obstacles: specs };
    };
    const plan = d.applied ? d.applied.plan : preyIds.length && pursuerIds.length ? Store.previewScenePursuit(input()) : null;
    const ev = plan?.evaluation || null, rows = plan?.obstacles || [];

    const root = node('div', 'workspace-pursuit-scene'); root.dataset.pursuitScene = '';
    root.append(node('p', 'workspace-muted', 'Poursuite hors combat du Livre de base V5 (p. 158-159), résolue d’un bloc : aucune Action ni Round. Rien n’est enregistré avant « Valider » ; fermer la fenêtre abandonne la saisie.'));

    // Participants et Mouvements
    const camps = node('fieldset', 'workspace-broken-facts'); camps.append(node('legend', '', 'Participants et Mouvements'));
    if (!people.length) camps.append(node('p', 'workspace-muted', 'Aucun participant actif dans la rencontre en cours.'));
    for (const person of people) {
      const row = node('div', 'workspace-pursuit-row');
      selectField(row, 'Rôle de ' + person.name, ['pursuitRole', person.id], d.roles[person.id], ROLE_OPTIONS, value => change({ roles: { ...d.roles, [person.id]: value } }));
      if (d.roles[person.id]) {
        const label = node('label', 'workspace-type', 'Mouvement de ' + person.name), field = document.createElement('input');
        field.type = 'number'; field.min = '0'; field.step = '1'; field.inputMode = 'numeric'; field.value = d.movement[person.id] ?? ''; field.placeholder = String(pursuitMovementOf(person, people) ?? '?');
        field.setAttribute('aria-label', 'Mouvement de ' + person.name + ' (vide : celui calculé par l’outil)');
        field.dataset.pursuitSceneMovement = person.id; field.dataset.focusKey = 'pursuit-scene-movement-' + person.id;
        field.addEventListener('input', () => change({ movement: { ...d.movement, [person.id]: field.value } })); label.append(field); row.append(label);
        appendMovementIssue(row, movementIssues, person.id);
      }
      camps.append(row);
    }
    root.append(camps);
    if (preyIds.length && pursuerIds.length && pursuitObstacleSide({ preyIds, pursuerIds, isPlayer: id => personOf(id)?.kind === 'PJ' }) === null) {
      selectField(root, 'Camp qui franchit les Obstacles', ['pursuitSceneSide', ''], d.side, [['', 'À préciser'], ['prey', 'Les fuyards'], ['pursuers', 'Les poursuivants']], value => change({ side: value }));
      root.append(node('p', 'workspace-muted', 'Aucun PJ dans la poursuite : le MJ désigne le camp qui franchit les Obstacles.'));
    }
    if (preyIds.length > 1 || pursuerIds.length > 1) {
      const auto = pickPursuitPair({ preyIds, pursuerIds, movement }), names = ids => ids.map(id => [id, nameIn(people, id)]);
      selectField(root, 'Poursuivant du Test opposé', ['pursuitScenePairPursuer', ''], d.pair.pursuerId, [['', 'Automatique : ' + (auto ? nameIn(people, auto.pursuerId) : '—')], ...names(pursuerIds)], value => change({ pair: { ...d.pair, pursuerId: value } }));
      selectField(root, 'Fuyard du Test opposé', ['pursuitScenePairPrey', ''], d.pair.preyId, [['', 'Automatique : ' + (auto ? nameIn(people, auto.preyId) : '—')], ...names(preyIds)], value => change({ pair: { ...d.pair, preyId: value } }));
      root.append(node('p', 'workspace-muted', 'Le plus rapide des poursuivants affronte le plus lent des fuyards ; pour corriger, choisissez les deux.'));
    }

    // Un Test : compétence, jet, questions d'État, aperçu (calculé par le moteur, rien n'est écrit)
    const testBlock = (kind, person, state, { title, skills, role, obstacle = null, allies = [], update }) => {
      const id = person.id, box = node('div', 'workspace-broken-attestation'); box.dataset.pursuitTest = id; box.dataset.pursuitTestKind = kind;
      box.append(node('strong', '', title));
      renderTestInputs(box, { person, d: state, skills, update, focusKey: `pursuit-scene-roll-${kind}-${id}` });
      const out = isNumber(state.roll) ? (kind === 'pursuit' ? previewPursuitTest(person, { skill: state.skill, roll: Number(state.roll), role, context: state.context })
        : previewObstacleTest(person, { obstacle, skill: state.skill, roll: Number(state.roll), role, context: state.context, allies })) : null;
      if (out) {
        const shown = node('div', 'workspace-broken-preview'); shown.setAttribute('role', 'status'); shown.dataset.pursuitTestPreview = id;
        if (out.ready) {
          shown.append(node('p', 'workspace-broken-status', 'Aperçu : rien n’est enregistré avant « Valider ».'));
          renderTestResult(shown, { skill: out.skill, score: out.score, roll: out.test.roll, sl: out.test.sl, success: out.test.success, detail: out.detail });
          if (kind === 'obstacle' && out.astonishing) {
            shown.append(node('p', 'workspace-broken-status', 'Réussite éclatante (+5 DR) : l’Avantage peut aller au Test d’un autre membre du groupe.'));
            if (out.beneficiaryOptions.length) selectField(shown, 'Réussite éclatante : Avantage à', ['pursuitBeneficiary', id], state.beneficiaryId, [['', 'Personne'], ...out.beneficiaryOptions.map(option => [option.id, option.name])], value => update({ beneficiaryId: value || null }));
          }
        } else shown.append(node('p', 'workspace-field-error', out.error || 'Informations requises pour calculer.'));
        box.append(shown);
      }
      renderTestPrompts(box, { person, context: state.context, onContext: next => update({ context: next }), needsInput: out && !out.ready ? out.needsInput || [] : [], choices: out?.choices || [], obstinateStatus: Store.getObstinateStatus?.(id) });
      return box;
    };
    if (pair) {
      root.append(node('p', '', `Test opposé : ${nameIn(people, pair.pursuerId)} (poursuivant) contre ${nameIn(people, pair.preyId)} (fuyard).`));
      for (const [role, id] of [['pursuer', pair.pursuerId], ['prey', pair.preyId]]) {
        const person = personOf(id), state = testOf(id);
        root.append(testBlock('pursuit', person, state, { title: `Test de poursuite de ${person.name} (${role === 'pursuer' ? 'poursuivant' : 'fuyard'})`,
          skills: PURSUIT_TEST_SKILLS.map(skill => [skill.label, skill.label]), role, update: patch => { Object.assign(state, patch); refresh(); } }));
      }
      if (plan?.opposed?.netSl !== null && plan?.opposed?.netSl !== undefined) root.append(node('p', 'workspace-broken-status', `Test opposé : ${plan.opposed.winner === 'pursuer' ? 'les poursuivants l’emportent' : 'les fuyards l’emportent'} (${plan.opposed.netSl > 0 ? '+' : ''}${plan.opposed.netSl} DR).`));
    }

    // Facteurs et Obstacles : seulement quand la règle y mène (Test opposé joué, écart inférieur à 6, camp désigné)
    if (plan?.factors && group.length && (ev.pending === 'obstacles' || ev.outcome?.reason === 'obstacles')) {
      root.append(renderFactorsBox({ id: 'scene', obstacleSide: side, factors: plan.factors, groupSize: group.length, editable: !locked,
        onToggle: (key, checked) => change({ factors: { ...d.factors, [key]: checked } }) }));
      const obstacles = node('div', 'workspace-pursuit-obstacles'); obstacles.append(node('h4', 'workspace-rubric', 'Obstacles'));
      for (const id of group) {
        const person = personOf(id), entry = d.obstacles[id], row = rows.find(item => item.participantId === id), name = nameIn(people, id);
        const box = node('div', 'workspace-broken-proof'); box.dataset.pursuitObstacle = id;
        renderObstacleSummary(box, row, name, people);
        if (!locked) {
          if (!d.frees[id]) d.frees[id] = { label: '', skills: '' };
          const place = obstacle => change({ obstacles: { ...d.obstacles, [id]: { ...obstacle, skill: '', roll: '', context: {}, beneficiaryId: null } } });
          renderObstacleControls(box, { id, name, entry: row, free: d.frees[id], onDraw: () => place({ d10: d10() }), onFree: spec => { d.frees[id] = { label: '', skills: '' }; place({ free: spec }); } });
        }
        if (entry && row && person) {
          const obstacle = row.obstacle, skills = obstacle.skills.map(skill => [skill.label, skillLabel(skill)]);
          if (!skills.some(([value]) => value === entry.skill)) entry.skill = skills[0][0];
          box.append(testBlock('obstacle', person, entry, { title: `Test d’Obstacle de ${person.name} : ${obstacle.label}`, skills, role: side === 'prey' ? 'prey' : 'pursuer', obstacle,
            allies: group.map(who => ({ id: who, name: nameIn(people, who) })), update: patch => { Object.assign(entry, patch); refresh(); } }));
        }
        obstacles.append(box);
      }
      if (ev.required !== null) obstacles.append(node('p', 'workspace-muted', `${ev.crossedIds.length} franchi(s) sur ${ev.required} exigé(s).`));
      root.append(obstacles);
    }

    // Issue et boutons de fin (après validation seulement : ils s'appuient sur l'aperçu validé, D6)
    const status = node('p', 'workspace-muted', ''); status.dataset.pursuitSceneStatus = ''; status.setAttribute('role', 'status');
    if (plan?.ready) {
      const outcome = { ...ev.outcome, crossedIds: ev.crossedIds, partial: ev.partial };
      const end = async (kind, participantId) => {
        try {
          const result = await Store.applyPursuitEnd(kind, { ...(participantId ? { participantId } : {}), scenePlan: d.applied.plan });
          if (result?.status === 'error') throw Error(result.reason);
          if (kind === 'engage') d.applied.endApplied.push('engage');
          change({});
        } catch (error) { change({ error: userMessage(error, 'Action non enregistrée.') }); }
      };
      root.append(renderOutcomeBox({ id: 'scene', outcome, preyIds, participants: people, endApplied: d.applied?.endApplied || [], onEnd: locked ? end : null }));
    } else if (plan) { status.textContent = plan.error || 'Saisissez les jets pour trancher la poursuite.'; root.append(status); }
    if (locked) root.append(node('p', 'workspace-muted', 'Poursuite validée : une entrée au journal, annulable par ↶. Les boutons ci-dessus agissent sur le plateau.'));
    if (d.error) { const error = node('p', 'workspace-field-error', d.error); error.dataset.pursuitSceneError = ''; error.setAttribute('role', 'alert'); root.append(error); }

    const controls = node('div', 'workspace-pursuit-row');
    if (!locked) {
      const validate = button('Valider', 'workspace-primary'); validate.dataset.pursuitSceneValidate = ''; validate.disabled = d.busy || !plan?.ready;
      validate.addEventListener('click', async () => {
        if (validate.disabled) return;
        d.busy = true; d.error = ''; refresh();
        try {
          const result = await Store.applyScenePursuit(plan);
          if (result?.status !== 'applied') throw Error(result?.reason || 'Poursuite non enregistrée.');
          d.applied = { plan, endApplied: [] };
        } catch (error) { d.error = userMessage(error, 'Poursuite non enregistrée : recalculez, puis réessayez.'); }
        finally { d.busy = false; refresh(); }
      });
      controls.append(validate);
    }
    const dismiss = button(locked ? 'Fermer' : 'Fermer sans valider', 'workspace-secondary'); dismiss.dataset.pursuitSceneClose = ''; dismiss.disabled = d.busy;
    dismiss.addEventListener('click', () => close());
    controls.append(dismiss); root.append(controls);
    if (locked) lock(root);
    return root;
  }
  // Une fois validée, la saisie ne se modifie plus : seuls restent actifs les boutons de fin et de fermeture.
  function lock(element) {
    const tag = String(element.tagName || '').toLowerCase();
    if (['select', 'input', 'textarea'].includes(tag)) element.disabled = true;
    for (const child of Array.from(element.children || [])) lock(child);
  }
  return { render };
}

/** Signature stable d'un contrôle (balise et attributs data-*) : rend le focus au même contrôle après un nouvel affichage. */
const signature = element => `${element.tagName}|${JSON.stringify(Object.entries(element.dataset || {}).sort())}`;

export function openV5PursuitDialog({ Store } = {}) {
  if (!Store?.previewScenePursuit) throw new TypeError('Store requis');
  return new Promise(resolve => {
    const opener = document.activeElement, dialog = document.createElement('dialog'), heading = node('h2', '', 'Poursuite de scène'), body = node('div', 'workspace-pursuit-dialog-body');
    dialog.className = 'tool-sheet v5-effect-dialog workspace-pursuit-dialog'; dialog.dataset.pursuitDialog = '';
    heading.setAttribute('id', 'pursuit-scene-title'); dialog.setAttribute('aria-labelledby', 'pursuit-scene-title');
    const form = createScenePursuitForm({ Store, refresh: () => draw(), close: () => dialog.close() });
    const draw = () => {
      const active = document.activeElement, saved = active && body.contains(active) ? { key: signature(active), start: active.selectionStart ?? null, end: active.selectionEnd ?? null } : null;
      body.replaceChildren(form.render());
      if (!saved) return;
      const again = Array.from(body.querySelectorAll('select, input, button, summary')).find(item => signature(item) === saved.key);
      if (!again || again.disabled) return;
      again.focus({ preventScroll: true });
      if (saved.start !== null && typeof again.setSelectionRange === 'function') { try { again.setSelectionRange(saved.start, saved.end); } catch { /* type sans sélection */ } }
    };
    dialog.append(heading, body); document.body.append(dialog);
    // Échap ferme sans écrire, sauf pendant la validation.
    dialog.addEventListener('cancel', event => { if (body.querySelector('[data-pursuit-scene-close]')?.disabled) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      const back = opener?.isConnected ? opener : document.querySelector(`[data-focus-key="${FOCUS_KEY}"]`);
      back?.focus(); resolve();
    }, { once: true });
    draw(); dialog.showModal();
    body.querySelector('select, input, button')?.focus();
  });
}
