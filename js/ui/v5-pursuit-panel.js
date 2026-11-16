import { participantCamp } from '../core/encounters.js';
import { v5CombatActionClock } from '../core/v5-resources.js';
import { PURSUIT_TEST_SKILLS, pursuitMovementOf, pickPursuitPair, pursuitObstacleSide, evaluatePursuit, obstacleCountRequired } from '../core/v5-pursuit.js';
import { node, button } from './resolution-panel/dom.js';
import { renderTestQuestions, renderObstinateChoice } from './test-questions.js';
/** Interface MJ de la poursuite en combat (Livre de base V5, p. 158-159 ; docs/specs/poursuite-v5, lot L5). Aucune règle ici :
 * le moteur (v5-pursuit.js) et le Store décident, le panneau recueille les saisies du MJ et montre l'état. Un aperçu n'écrit rien.
 */
const FACTOR_KEYS = ['won', 'speed', 'terrain'];
const signed = value => (value > 0 ? `+${value}` : String(value));
const stateOf = Store => { try { return JSON.parse(Store.getFullJSON()); } catch { return {}; } };
const ruleOf = pursuit => ({ preyIds: pursuit.preyIds, pursuerIds: pursuit.pursuerIds, movement: pursuit.movement, obstacleSide: pursuit.obstacleSide,
  opposed: pursuit.opposed, factors: pursuit.factors || {}, obstacles: pursuit.obstacles });
const groupOf = pursuit => (pursuit.obstacleSide === 'prey' ? pursuit.preyIds : pursuit.obstacleSide === 'pursuers' ? pursuit.pursuerIds : []);

/** Rôles proposés au lancement : le Brisé fuit, les combattants actifs de l'autre camp le poursuivent, les autres restent à l'écart. */
export const defaultPursuitRoles = (actor, participants) => Object.fromEntries(participants.filter(row => row.zone === 'active')
  .map(row => [row.id, row.id === actor.id ? 'prey' : participantCamp(row) !== participantCamp(actor) ? 'pursuer' : '']));

/** Entrée de `Store.startPursuit` : un Mouvement laissé vide reste celui que l'outil calcule (D14) ; la paire n'est corrigée que complète. */
export function pursuitStartInput({ roles = {}, movement = {}, side = '', pair = {} } = {}) {
  const idsOf = role => Object.keys(roles).filter(id => roles[id] === role), preyIds = idsOf('prey'), pursuerIds = idsOf('pursuer');
  const corrected = Object.fromEntries([...preyIds, ...pursuerIds].filter(id => String(movement[id] ?? '').trim() !== '' && Number.isFinite(Number(movement[id]))).map(id => [id, Number(movement[id])]));
  return { preyIds, pursuerIds, ...(Object.keys(corrected).length ? { movement: corrected } : {}), ...(side ? { obstacleSide: side } : {}),
    ...(pair.pursuerId && pair.preyId ? { pair: { pursuerId: pair.pursuerId, preyId: pair.preyId } } : {}) };
}

// --- Rendus partagés avec la modale de l'écran Jouer (v5-pursuit-dialog.js) : aucune écriture, tout passe par les rappels reçus. ---
export const nameIn = (participants, id) => participants.find(row => row.id === id)?.name || id;
export function selectField(parent, label, key, value, options, change) {
  const wrap = node('label', 'workspace-type', label), select = document.createElement('select');
  select.setAttribute('aria-label', label); select.dataset[key[0]] = key[1];
  options.forEach(row => select.append(new Option(row[1], row[0])));
  select.value = value ?? ''; select.addEventListener('change', () => change(select.value)); wrap.append(select); parent.append(wrap); return select;
}

/** Compétence (menu) et jet d100 (champ) d'un Test ; `d` : { skill, roll } ; `update(patch)` reçoit le changement. */
export function renderTestInputs(box, { person, d, skills, update, focusKey = 'pursuit-test-roll-' + person.id }) {
  const id = person.id;
  selectField(box, 'Compétence du Test', ['pursuitTestSkill', id], d.skill, skills, value => update({ skill: value, beneficiaryId: null }));
  const label = node('label', 'workspace-type', 'Jet d’' + d.skill + ' (d100)'), input = document.createElement('input');
  input.type = 'number'; input.min = '1'; input.max = '100'; input.step = '1'; input.inputMode = 'numeric'; input.value = d.roll;
  input.setAttribute('aria-label', 'Jet du Test de ' + person.name); input.dataset.pursuitTestRoll = id; input.dataset.focusKey = focusKey;
  input.addEventListener('input', () => update({ roll: input.value, beneficiaryId: null })); label.append(input); box.append(label);
}

/** Lignes d'un Test calculé : compétence, jet, DR, puis détail du calcul. `t` : { skill, score, roll, sl, success, detail }. */
export function renderTestResult(shown, t) {
  shown.append(node('p', '', `${t.skill} ${t.score ?? '—'} · jet ${t.roll} · ${signed(t.sl)} DR · ${t.success ? 'réussite' : 'échec'}.`));
  for (const line of t.detail || []) shown.append(node('p', 'workspace-formula-notes', line));
}

/** Obstiné et questions d'État avant le Test ; `needsInput` : ce que le moteur attend encore ; `onContext(next)` reçoit le contexte modifié. */
export function renderTestPrompts(box, { person, context, onContext, needsInput = [], obstinateStatus }) {
  const id = person.id;
  const obstinate = renderObstinateChoice(person, context?.preRollTalent, value => { const next = { ...(context || {}) }; if (value === 'strong-minded') next.preRollTalent = value; else delete next.preRollTalent; onContext(next); },
    { focusKey: 'pursuit-pre-roll-talent-' + id, status: obstinateStatus });
  if (obstinate) box.append(obstinate);
  const rows = needsInput.filter(item => item && typeof item === 'object').map(item => ({ ...item, answerAt: '' }));
  const questions = renderTestQuestions(rows, { root: context || {}, onChange: onContext, subjectOf: () => person, title: 'À préciser avant le Test', focusPrefix: 'pursuit-' + id, answeredAt: [''] });
  if (questions) box.append(questions);
}

/** Trois cases de facteurs favorables ; `editable` : cases modifiables ; `onToggle(key, checked)`. */
export function renderFactorsBox({ id, obstacleSide, factors = {}, groupSize, editable, onToggle }) {
  const box = node('fieldset', 'workspace-broken-facts'); box.dataset.pursuitFactors = id; box.append(node('legend', '', 'Facteurs favorables'));
  const preyCamp = obstacleSide === 'prey';
  const labels = { won: 'Test de poursuite gagné', speed: 'Son membre le plus lent est plus rapide que le plus rapide d’en face',
    terrain: preyCamp ? 'Terrain dense ou bondé, avec des cachettes (jugement du MJ)' : 'Terrain dégagé, sans cachettes (jugement du MJ)' };
  for (const key of FACTOR_KEYS) {
    const label = node('label', 'workspace-pursuit-check', labels[key]), check = document.createElement('input');
    check.type = 'checkbox'; check.checked = factors[key] === true; check.disabled = !editable;
    check.setAttribute('aria-label', labels[key]); check.dataset.pursuitFactor = key;
    check.addEventListener('change', () => onToggle(key, check.checked));
    label.prepend(check); box.append(label);
  }
  const count = FACTOR_KEYS.filter(key => factors[key] === true).length;
  box.append(node('p', 'workspace-muted', `L’outil coche les deux premiers selon le Test et les Mouvements ; vous cochez le terrain. ${count}/3 facteur(s) : ${obstacleCountRequired(groupSize, count)} Obstacle(s) à franchir sur ${groupSize} personnage(s).`));
  return box;
}

/** Intitulé, compétences possibles et résultat d'un Obstacle dans `box` ; rend true si son Test est déjà joué. */
export function renderObstacleSummary(box, entry, name, participants) {
  box.append(node('strong', '', 'Obstacle de ' + name));
  if (!entry) box.append(node('p', 'workspace-muted', 'Pas encore d’obstacle.'));
  else {
    box.append(node('p', '', entry.obstacle.label + (entry.d10 ? ` (d10 = ${entry.d10})` : ' (obstacle libre du MJ)')));
    box.append(node('p', 'workspace-muted', 'Compétences possibles : ' + entry.obstacle.skills.map(skill => skill.label + (skill.use ? ' (' + skill.use + ')' : '')).join(', ') + '.'));
  }
  if (!entry?.test) return false;
  const t = entry.test, ally = entry.beneficiaryId ? ' Avantage à ' + nameIn(participants, entry.beneficiaryId) + '.' : '';
  box.append(node('p', 'workspace-broken-status', `${t.success ? 'Franchit' : 'Ne franchit pas'} son Obstacle : ${t.skill}, jet ${t.roll} → ${signed(t.sl)} DR.${t.astonishing ? ' Réussite éclatante.' : ''}${ally}`));
  return true;
}

/** Tirage au d10 et obstacle libre du MJ ; `free` : { label, skills } conservé par l'appelant ; `onDraw()`, `onFree({ label, skills[] })`. */
export function renderObstacleControls(box, { id, name, entry, free, onDraw, onFree }) {
  const draw = button(entry ? 'Tirer un autre obstacle' : 'Tirer l’obstacle', 'workspace-secondary'); draw.dataset.pursuitDraw = id;
  draw.setAttribute('aria-label', (entry ? 'Tirer un autre obstacle pour ' : 'Tirer l’obstacle de ') + name);
  draw.addEventListener('click', onDraw);
  box.append(draw);
  const details = node('details', 'workspace-pursuit-free');
  details.append(node('summary', '', 'Obstacle libre du MJ'));
  for (const [prop, text, key] of [['label', 'Intitulé de l’obstacle de ' + name, 'pursuitFreeLabel'], ['skills', 'Compétences admises, séparées par des virgules', 'pursuitFreeSkills']]) {
    const label = node('label', 'workspace-type', text), input = document.createElement('input');
    input.type = 'text'; input.value = free[prop]; input.setAttribute('aria-label', text + (prop === 'skills' ? ' pour ' + name : '')); input.dataset[key] = id;
    input.addEventListener('input', () => { free[prop] = input.value; }); label.append(input); details.append(label);
  }
  const place = button('Poser cet obstacle libre', 'workspace-secondary'); place.dataset.pursuitFreeApply = id;
  place.addEventListener('click', () => onFree({ label: free.label, skills: free.skills.split(/[,;]/).map(skill => skill.trim()).filter(Boolean) }));
  details.append(place); box.append(details);
}

/** Issue de la poursuite et, si `onEnd(kind, participantId?)` est fourni, les boutons de fin (D6, D15). `outcome` : issue du moteur avec `partial`. */
export function renderOutcomeBox({ id, outcome: out, preyIds, participants, endApplied = [], onEnd = null }) {
  const box = node('div', 'workspace-broken-proof'); box.setAttribute('role', 'status'); box.dataset.pursuitOutcome = id;
  box.append(node('strong', '', out.kind === 'caught' ? 'Fuyard rattrapé' : out.kind === 'escaped' ? 'Fuyard échappé' : 'Poursuite abandonnée sans issue'));
  box.append(node('p', 'workspace-muted', 'Motif : ' + out.label + '.'));
  const partial = out.partial;
  if (partial) {
    box.append(node('p', '', 'Ont franchi leur Obstacle : ' + partial.crossedIds.map(who => nameIn(participants, who)).join(', ') + '.'));
    if (partial.canEscapeAnyway) box.append(node('p', 'workspace-muted', 'Chacun peut encore s’échapper en abandonnant les autres : « Retirer de la rencontre ».'));
    if (partial.canContinueAlone) box.append(node('p', 'workspace-muted', 'Rappel : chacun peut continuer seul, avec une seule occasion d’attaquer ou de retenir le fuyard le plus lent. L’outil n’y ajoute aucun automatisme.'));
  }
  if (!onEnd) return box;
  const buttons = node('div', 'workspace-pursuit-row');
  if (out.kind === 'caught') {
    const engage = button('Engager au plateau', 'workspace-primary'); engage.dataset.pursuitEndApply = 'engage';
    const done = endApplied.includes('engage'); engage.disabled = done; if (done) engage.title = 'Déjà engagés';
    engage.addEventListener('click', () => { if (!engage.disabled) onEnd('engage'); });
    buttons.append(engage);
  }
  const leaving = (out.kind === 'escaped' ? preyIds : partial?.canEscapeAnyway ? partial.crossedIds : []).filter(who => participants.some(row => row.id === who));
  for (const who of leaving) {
    const remove = button(leaving.length === 1 ? 'Retirer de la rencontre' : 'Retirer de la rencontre : ' + nameIn(participants, who), 'workspace-secondary');
    remove.dataset.pursuitEndApply = 'remove'; remove.dataset.pursuitEndPrey = who;
    remove.addEventListener('click', () => onEnd('remove', who));
    buttons.append(remove);
  }
  if (buttons.children.length) box.append(buttons);
  return box;
}

export function createV5PursuitPanel({ Store, refresh = () => {} } = {}) {
  const launches = new Map(), tests = new Map(), frees = new Map();
  let testsTurn = null, abandonKind = '', notice = '';
  const run = async work => {
    notice = '';
    try { const result = await work(); if (result?.status === 'error') throw Error(result.reason); } catch (error) { notice = error?.message || 'Action non enregistrée.'; }
    refresh();
  };
  const field = selectField;

  // --- Lancement, depuis le panneau du Brisé ---------------------------------------------------------------------------
  function launchOf(actorId) {
    if (!launches.has(actorId)) launches.set(actorId, { roles: {}, movement: {}, side: '', pair: { pursuerId: '', preyId: '' }, error: '', busy: false });
    return launches.get(actorId);
  }
  function renderLaunch(actor, participants, { visible = false } = {}) {
    if (!visible || Store.getPursuit?.()?.status === 'active') return null;
    const d = launchOf(actor.id), active = participants.filter(row => row.zone === 'active'), roles = { ...defaultPursuitRoles(actor, participants), ...d.roles };
    const change = patch => { Object.assign(d, patch, { error: '' }); refresh(); };
    const box = node('fieldset', 'workspace-broken-facts workspace-pursuit-launch'); box.dataset.pursuitLaunch = actor.id;
    box.append(node('legend', '', 'Poursuite'));
    box.append(node('p', 'workspace-muted', 'Le personnage reste visible d’au moins un ennemi : la poursuite du Livre de base V5 (p. 158-159) peut commencer. Désignez fuyards et poursuivants ; Mouvements et paire du Test opposé se corrigent ici.'));
    const preyIds = active.filter(row => roles[row.id] === 'prey').map(row => row.id), pursuerIds = active.filter(row => roles[row.id] === 'pursuer').map(row => row.id);
    const computed = id => pursuitMovementOf(active.find(row => row.id === id), participants);
    const counted = id => (String(d.movement[id] ?? '').trim() !== '' && Number.isFinite(Number(d.movement[id])) ? Number(d.movement[id]) : computed(id));
    for (const person of active) {
      const row = node('div', 'workspace-pursuit-row');
      field(row, 'Rôle de ' + person.name, ['pursuitRole', person.id], roles[person.id], [['', 'Hors de la poursuite'], ['prey', 'Fuyard'], ['pursuer', 'Poursuivant']],
        value => change({ roles: { ...d.roles, [person.id]: value } }));
      if (roles[person.id]) {
        const label = node('label', 'workspace-type', 'Mouvement de ' + person.name), input = document.createElement('input');
        input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric'; input.value = d.movement[person.id] ?? ''; input.placeholder = String(computed(person.id) ?? '?');
        input.setAttribute('aria-label', 'Mouvement de ' + person.name + ' (vide : celui calculé par l’outil)');
        input.dataset.pursuitLaunchMovement = person.id; input.dataset.focusKey = 'pursuit-launch-movement-' + person.id;
        input.addEventListener('input', () => change({ movement: { ...d.movement, [person.id]: input.value } }));
        label.append(input); row.append(label);
      }
      box.append(row);
    }
    if (preyIds.length && pursuerIds.length && pursuitObstacleSide({ preyIds, pursuerIds, isPlayer: id => active.find(row => row.id === id)?.kind === 'PJ' }) === null) {
      field(box, 'Camp qui franchit les Obstacles', ['pursuitSide', actor.id], d.side, [['', 'À préciser'], ['prey', 'Les fuyards'], ['pursuers', 'Les poursuivants']], value => change({ side: value }));
      box.append(node('p', 'workspace-muted', 'Aucun PJ dans la poursuite : le MJ désigne le camp qui franchit les Obstacles.'));
    }
    if (preyIds.length > 1 || pursuerIds.length > 1) {
      const auto = pickPursuitPair({ preyIds, pursuerIds, movement: Object.fromEntries([...preyIds, ...pursuerIds].map(id => [id, counted(id)])) });
      const names = ids => ids.map(id => [id, nameIn(participants, id)]);
      field(box, 'Poursuivant du Test opposé', ['pursuitPairPursuer', actor.id], d.pair.pursuerId, [['', 'Automatique : ' + (auto ? nameIn(participants, auto.pursuerId) : '—')], ...names(pursuerIds)], value => change({ pair: { ...d.pair, pursuerId: value } }));
      field(box, 'Fuyard du Test opposé', ['pursuitPairPrey', actor.id], d.pair.preyId, [['', 'Automatique : ' + (auto ? nameIn(participants, auto.preyId) : '—')], ...names(preyIds)], value => change({ pair: { ...d.pair, preyId: value } }));
      box.append(node('p', 'workspace-muted', 'Le plus rapide des poursuivants affronte le plus lent des fuyards ; pour corriger, choisissez les deux.'));
    }
    const start = button('Lancer la poursuite', 'workspace-primary'); start.dataset.pursuitStart = actor.id; start.disabled = d.busy || !preyIds.length || !pursuerIds.length;
    start.addEventListener('click', async () => {
      if (start.disabled) return;
      d.busy = true; d.error = ''; refresh();
      try { await Store.startPursuit({ ...pursuitStartInput({ roles, movement: d.movement, side: d.side, pair: d.pair }), visibleToAnyEnemy: true }); launches.delete(actor.id); }
      catch (error) { d.error = error?.message || 'Poursuite non lancée.'; }
      finally { d.busy = false; refresh(); }
    });
    box.append(start);
    if (d.error) box.append(node('p', 'workspace-field-error', d.error));
    return box;
  }

  // --- Test du Tour courant (poursuite ou Obstacle) --------------------------------------------------------------------
  function testForm(kind, person, row) {
    const key = kind + ':' + person.id;
    if (!tests.has(key)) tests.set(key, { skill: kind === 'pursuit' ? PURSUIT_TEST_SKILLS[0].label : row.obstacle.skills[0].label, roll: '', context: {}, beneficiaryId: null, preview: null, error: '', busy: false });
    const d = tests.get(key), id = person.id;
    if (d.preview?.ready && d.preview.baseRevision !== Store.getLocalRevision?.()) { d.preview = null; d.error = 'La partie a changé : recalculez le Test.'; }
    const update = patch => { Object.assign(d, patch, { preview: null, error: '' }); refresh(); };
    const calculate = () => {
      const input = { participantId: id, skill: d.skill, roll: d.roll === '' ? undefined : Number(d.roll), context: { ...d.context } };
      try {
        const out = kind === 'pursuit' ? Store.previewPursuitTest(input) : Store.previewObstacleTest({ ...input, beneficiaryId: d.beneficiaryId });
        d.preview = out; d.error = out.ready ? '' : out.error || 'Informations requises pour calculer.';
      } catch (error) { d.preview = null; d.error = error?.message || 'Aperçu impossible.'; }
      refresh();
    };
    const box = node('div', 'workspace-broken-attestation'); box.dataset.pursuitTest = id; box.dataset.pursuitTestKind = kind;
    box.append(node('strong', '', kind === 'pursuit' ? 'Test de poursuite de ' + person.name : 'Test d’Obstacle de ' + person.name + ' : ' + row.obstacle.label));
    const skills = kind === 'pursuit' ? PURSUIT_TEST_SKILLS.map(skill => [skill.label, skill.label]) : row.obstacle.skills.map(skill => [skill.label, skill.label + (skill.use ? ' (' + skill.use + ')' : '')]);
    renderTestInputs(box, { person, d, skills, update });
    const calc = button('Calculer l’aperçu', 'workspace-secondary'); calc.dataset.pursuitTestCalculate = id; calc.addEventListener('click', calculate);
    const apply = button(kind === 'pursuit' ? 'Appliquer le Test de poursuite' : 'Appliquer le Test d’Obstacle', 'workspace-primary'); apply.dataset.pursuitTestApply = id;
    apply.disabled = d.busy || !d.preview?.ready;
    apply.addEventListener('click', async () => {
      if (apply.disabled) return;
      d.busy = true; d.error = ''; refresh();
      try {
        const result = await (kind === 'pursuit' ? Store.applyPursuitTest(d.preview) : Store.applyObstacleTest(d.preview));
        if (result?.status !== 'applied') throw Error(result?.reason || 'Test non enregistré.');
        tests.delete(key);
      } catch (error) { d.error = error?.message || 'Test non enregistré.'; d.preview = null; } finally { d.busy = false; refresh(); }
    });
    const buttons = node('div', 'workspace-pursuit-row'); buttons.append(calc, apply); box.append(buttons);
    const preview = d.preview, shown = node('div', 'workspace-broken-preview'); shown.setAttribute('role', 'status'); shown.dataset.pursuitTestPreview = id;
    if (preview?.ready) {
      const t = preview.test;
      shown.append(node('p', 'workspace-broken-status', 'Aperçu : aucun effet appliqué.'));
      renderTestResult(shown, t);
      if (kind === 'obstacle' && t.astonishing) {
        shown.append(node('p', 'workspace-broken-status', 'Réussite éclatante (+5 DR) : l’Avantage peut aller au Test d’un autre membre du groupe.'));
        if (preview.beneficiaryOptions.length) field(shown, 'Réussite éclatante : Avantage à', ['pursuitBeneficiary', id], d.beneficiaryId, [['', 'Personne'], ...preview.beneficiaryOptions.map(option => [option.id, option.name])], value => { d.beneficiaryId = value || null; calculate(); });
      }
      shown.append(node('p', 'workspace-muted', 'Appliquer consomme l’Action du Tour de ' + person.name + '.'));
      box.append(shown);
    } else if (d.error) { shown.append(node('p', 'workspace-field-error', d.error)); box.append(shown); }
    const set = next => { d.context = next; d.preview = null; calculate(); };
    renderTestPrompts(box, { person, context: d.context, onContext: set, needsInput: preview && !preview.ready ? preview.needsInput || [] : [], obstinateStatus: Store.getObstinateStatus?.(id) });
    return box;
  }

  // --- Facteurs favorables et Obstacles --------------------------------------------------------------------------------
  function renderFactors(pursuit, ev, live) {
    return renderFactorsBox({ id: pursuit.id, obstacleSide: pursuit.obstacleSide, factors: pursuit.factors, groupSize: groupOf(pursuit).length, editable: live && ev.pending === 'obstacles',
      onToggle: (key, checked) => run(() => Store.setPursuitFactors({ [key]: checked })) });
  }
  function renderObstacle(pursuit, id, participants, live) {
    const entry = pursuit.obstacles.find(row => row.participantId === id), name = nameIn(participants, id);
    const box = node('div', 'workspace-broken-proof'); box.dataset.pursuitObstacle = id;
    if (renderObstacleSummary(box, entry, name, participants) || !live) return box;
    if (!frees.has(id)) frees.set(id, { label: '', skills: '' });
    renderObstacleControls(box, { id, name, entry, free: frees.get(id), onDraw: () => run(() => Store.setPursuitObstacle(id, {})),
      onFree: spec => run(async () => { await Store.setPursuitObstacle(id, spec); frees.delete(id); }) });
    return box;
  }

  // --- Issue ---------------------------------------------------------------------------------------------------------
  function renderOutcome(pursuit, participants) {
    return renderOutcomeBox({ id: pursuit.id, outcome: pursuit.outcome, preyIds: pursuit.preyIds, participants, endApplied: pursuit.endApplied || [],
      onEnd: (kind, participantId) => run(() => Store.applyPursuitEnd(kind, participantId ? { participantId } : {})) });
  }

  // --- Panneau : poursuite en cours ou terminée --------------------------------------------------------------------------
  function render(participants = []) {
    const pursuit = Store.getPursuit?.();
    if (!pursuit) return null;
    const whole = stateOf(Store), clock = v5CombatActionClock(whole), turnActorId = whole.combat?.currentActorId, live = pursuit.status === 'active';
    if (testsTurn !== clock.turnId) { tests.clear(); testsTurn = clock.turnId; }
    const ev = evaluatePursuit(ruleOf(pursuit)), group = groupOf(pursuit), name = id => nameIn(participants, id);
    const card = node('section', 'workspace-card workspace-broken-escape workspace-pursuit'); card.dataset.pursuitPanel = pursuit.id;
    card.append(node('h3', 'workspace-rubric', live ? 'Poursuite en cours' : 'Poursuite terminée'));
    card.append(node('p', 'workspace-muted', `${pursuit.source} · lancée au Round ${pursuit.startedRound || '—'}. Chaque Test se joue au Tour du personnage et prend son Action.`));
    const moves = node('fieldset', 'workspace-broken-facts'); moves.append(node('legend', '', 'Participants et Mouvements'));
    for (const [id, role] of [...pursuit.preyIds.map(id => [id, 'fuyard']), ...pursuit.pursuerIds.map(id => [id, 'poursuivant'])]) {
      const label = node('label', 'workspace-type', `Mouvement de ${name(id)} (${role})`), input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric'; input.value = pursuit.movement?.[id] ?? ''; input.placeholder = '?'; input.disabled = !live;
      input.setAttribute('aria-label', `Mouvement de ${name(id)} (${role})`); input.dataset.pursuitMovement = id; input.dataset.focusKey = 'pursuit-movement-' + id;
      input.addEventListener('change', () => { if (input.value !== '') run(() => Store.setPursuitMovement(id, Number(input.value))); });
      label.append(input); moves.append(label);
    }
    card.append(moves);
    const { pair, opposed } = pursuit;
    card.append(node('p', '', `Test opposé : ${name(pair.pursuerId)} (poursuivant) contre ${name(pair.preyId)} (fuyard).`));
    for (const [role, id, text] of [['pursuer', pair.pursuerId, 'poursuivant'], ['prey', pair.preyId, 'fuyard']]) {
      const t = opposed[role];
      card.append(node('p', t ? '' : 'workspace-muted', t ? `${name(id)} (${text}) : Test de ${t.skill}, jet ${t.roll} → ${signed(t.sl)} DR, ${t.success ? 'réussite' : 'échec'}.` : `${name(id)} (${text}) : Test de poursuite à jouer pendant son Tour.`));
    }
    if (opposed.netSl !== null) card.append(node('p', 'workspace-broken-status', `Test opposé : ${opposed.winner === 'pursuer' ? 'les poursuivants l’emportent' : 'les fuyards l’emportent'} (${signed(opposed.netSl)} DR).`));
    const turnActor = participants.find(row => row.id === turnActorId);
    if (live && turnActor) {
      const role = pair.pursuerId === turnActorId ? 'pursuer' : pair.preyId === turnActorId ? 'prey' : null, row = pursuit.obstacles.find(item => item.participantId === turnActorId);
      if (role && !opposed[role]) card.append(testForm('pursuit', turnActor, null));
      else if (ev.pending === 'obstacles' && row && !row.test) card.append(testForm('obstacle', turnActor, row));
      else if (ev.pending === 'obstacles' && group.includes(turnActorId) && !row) card.append(node('p', 'workspace-muted', `Tirez d’abord l’obstacle de ${turnActor.name} (ci-dessous).`));
      else card.append(node('p', 'workspace-muted', `Aucun Test à jouer pendant le Tour de ${turnActor.name}.`));
    }
    if (group.length && opposed.netSl !== null && pursuit.factors) {
      card.append(renderFactors(pursuit, ev, live));
      const obstacles = node('div', 'workspace-pursuit-obstacles'); obstacles.append(node('h4', 'workspace-rubric', 'Obstacles'));
      for (const id of group) obstacles.append(renderObstacle(pursuit, id, participants, live && ev.pending === 'obstacles'));
      if (ev.required !== null) obstacles.append(node('p', 'workspace-muted', `${ev.crossedIds.length} franchi(s) sur ${ev.required} exigé(s).`));
      card.append(obstacles);
    }
    if (live) {
      const row = node('div', 'workspace-pursuit-row');
      field(row, 'Issue de l’abandon', ['pursuitAbandonKind', pursuit.id], abandonKind, [['', 'Aucune issue'], ['caught', 'Fuyard rattrapé'], ['escaped', 'Fuyard échappé']], value => { abandonKind = value; refresh(); });
      const abandon = button('Abandonner la poursuite', 'workspace-secondary'); abandon.dataset.pursuitAbandon = pursuit.id;
      abandon.addEventListener('click', () => run(async () => { const kind = abandonKind || null; abandonKind = ''; return Store.endPursuit({ reason: 'gm', kind }); }));
      row.append(abandon); card.append(row);
    } else if (pursuit.outcome) card.append(renderOutcome(pursuit, participants));
    if (notice) card.append(node('p', 'workspace-field-error', notice));
    return card;
  }
  return { render, renderLaunch };
}
