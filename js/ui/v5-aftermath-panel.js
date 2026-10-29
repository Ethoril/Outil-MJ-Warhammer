import { aftermathDate, aftermathSkills } from '../core/v5-aftermath.js';
import { requiredSequelaFacts } from '../core/v5-sequelae.js';
import { uid } from '../core/models.js';

const node = (tag, text = '') => { const element = document.createElement(tag); if (text) element.textContent = text; return element; };
const opId = () => `aftermath-${uid()}`;
const REASONS = {
  'incident-source-required': 'Choisissez un critique à suivre ou une cause de Blessures perdues.',
  'critical-occurrence-not-found': 'Cette occurrence critique n’existe plus sur la fiche.',
  'no-wounds-lost': 'Ce personnage n’a perdu aucune Blessure.',
  'incident-for-source-already-exists': 'Cette occurrence a déjà un suivi.',
  'unknown-subject': 'Participant introuvable.',
  'healer-required': 'Choisissez le soigneur.',
  'skill-missing': 'La fiche du soigneur n’a pas la compétence requise.',
  'skill-choice-required': 'Plusieurs compétences conviennent : choisissez-en une.',
  'healer-skill-required': 'Le soigneur doit porter une compétence valable sur sa fiche.',
  'invalid-test-facts': 'Saisissez un d100 entre 1 et 100 (et un d10 en cas de maladresse).',
  'medical-supplies-required': 'Fournitures médicales requises.',
  'treatment-already-used-for-incident': 'Un seul Test de Guérison par incident.',
  'wrong-skill-for-subject': 'Guérison pour une personne, Soins aux animaux pour un animal.',
  'combat-heal-cannot-be-easier-than-challenging': 'En combat, la difficulté ne peut pas être plus facile que +0.',
  'fumble-d10-required': 'Maladresse : saisissez le 1d10 de Blessures.',
  'surgery-talent-required': 'Le soigneur doit posséder le Talent Chirurgie.',
  'surgery-not-required': 'Aucune chirurgie n’est requise.',
  'surgery-not-completed': 'La chirurgie requise n’est pas faite.',
  'infection-still-active': 'Une infection est toujours active.',
  'critical-states-remaining': 'Des États du critique sont encore sur la fiche.',
  'temporary-effects-not-confirmed': 'Confirmez que les malus temporaires sont terminés.',
  'sequelae-follow-up-not-opened': 'Ouvrez d’abord le suivi des séquelles de ce critique (lésions, pertes, effets durables).',
  'sequelae-follow-up-open': 'Une séquelle de ce critique n’est pas terminée : voir « Séquelles des critiques ».',
  'nothing-to-follow': 'Ce critique ne laisse aucune séquelle à suivre.',
  'sequelae-already-open': 'Le suivi des séquelles de ce critique est déjà ouvert.',
  'toughness-bonus-required': 'Le Bonus d’Endurance du patient est introuvable sur sa fiche.',
  'facts-already-set': 'Les faits de cette séquelle sont déjà saisis.',
  'part-already-lost': 'Cette partie du corps est déjà perdue de ce côté.',
  'fracture-not-healing': 'Cette fracture n’est plus en cours de guérison.',
  'immobilization-window-passed': 'La semaine de 8 jours pour immobiliser la fracture est passée.',
  'rebind-window-passed': 'Le délai d’un jour pour rattacher la fracture est passé.',
  'already-bound': 'La fracture est déjà immobilisée.',
  'not-bound': 'La fracture n’est pas immobilisée.',
  'fracture-still-healing': 'La fracture n’a pas encore atteint son jour de guérison.',
  'fracture-already-resolved': 'La guérison de cette fracture est déjà constatée.',
  'heal-does-not-shorten-major-tear': 'Une déchirure majeure ne raccourcit pas avec la Guérison (p.177).',
  'muscle-heal-already-used': 'Le bénéfice de la Guérison ne se gagne qu’une fois.',
  'tear-not-healing': 'Cette déchirure n’est plus en cours de guérison.',
  'deadline-not-reached': 'L’échéance de chirurgie n’est pas dépassée.',
  'decision-required': 'Une décision explicite du MJ est requise.',
  'sequela-already-resolved': 'Cette séquelle est déjà réglée.',
  'unknown-sequela': 'Séquelle introuvable.',
  'invalid-facts': 'Faits invalides : vérifiez le côté, le nombre ou le 1d10.',
  'endurance-score-missing-for-test': 'Le patient n’a ni Résistance ni caractéristique E.',
  'daily-tests-required': 'Il manque un jet de Résistance : saisissez le d100 demandé.',
  'unexpected-daily-test': 'Un jet saisi ne correspond à aucun Test quotidien attendu.',
  'invalid-or-duplicate-daily-test': 'Jet quotidien invalide ou en double.',
  'endurance-score-missing': 'Le patient n’a ni Résistance ni caractéristique E.',
  'heal-advance-required': 'Soigner un malade exige au moins un Avancement en Guérison.',
  'care-already-recorded-today': 'Les soins du jour sont déjà enregistrés.',
  'revision-conflict': 'Le registre a changé : refaites l’aperçu.',
  'surgery-talent-choice-required': 'Talent Chirurgie : choisissez les DR ou le chiffre des unités.',
  'wound-heal-not-used-yet': 'Le soin de Blessures de cet incident n’a pas encore été utilisé.',
  'duplicate-submission': 'Même soigneur et même d100 déjà enregistrés : enregistrement double refusé.',
  'familiar-healing': 'Un homoncule ne guérit que par guérison naturelle ou par magie.',
  'amputation-decision-pending': 'Décidez d’abord du choc d’amputation de ce critique.',
  'critical-follow-up-j2-required': 'Ce critique laisse un effet durable dont le suivi relève de J2.',
  'subject-still-present': 'Le patient est toujours dans le combat : clôturez plutôt le suivi.'
};
const receiptText = receipt => {
  if (!receipt) return '';
  const head = receipt.status === 'applied' ? 'Enregistré' : 'Refus';
  const DONE = { 'sequelae-opened': 'suivi des séquelles ouvert', 'sequela-facts-set': 'faits enregistrés', 'fracture-bound': 'fracture immobilisée', 'immobilization-failed': 'immobilisation ratée',
    'binding-removed': 'bandage retiré', 'fracture-healed': 'fracture guérie', 'fracture-healed-bound': 'fracture guérie sans Test (restée attachée)', 'fracture-badly-healed': 'fracture mal soignée : séquelle permanente',
    'tear-shortened': 'déchirure raccourcie', 'tear-heal-failed': 'soin sans effet', 'limb-reset-confirmed': 'membre remis en place', 'post-encounter-passed': 'Test réussi', 'post-encounter-failed': 'Test raté : la perte suit le choc d’amputation',
    'foot-lost-confirmed': 'perte du pied confirmée', 'foot-loss-waived': 'perte du pied écartée', 'hand-relearned': 'pénalité réduite', 'scars-agreed': 'cicatrices accordées', 'scars-declined': 'cicatrices refusées', 'characteristic-loss-recorded': 'perte de caractéristique enregistrée' };
  const why = REASONS[receipt.reason] || DONE[receipt.reason] || (String(receipt.reason || '').startsWith('facts-missing:') ? `fait manquant (${receipt.reason.split(':')[1]})` : receipt.reason) || 'opération traitée';
  const test = receipt.roll != null ? ` · d100 ${receipt.roll} contre ${receipt.score} : ${receipt.success ? 'réussite' : 'échec'}${receipt.fumble ? ' (maladresse)' : ''}, ${receipt.sl} DR` : '';
  const wounds = (receipt.healed ? ` · ${receipt.healed} Blessure(s) rendue(s)` : '') + (receipt.bleedingRemoved ? ` · ${receipt.bleedingRemoved} Hémorragique(s) retiré(s)` : '') + (receipt.amountChoice ? ` · Chirurgie : ${receipt.amountChoice === 'units' ? 'chiffre des unités' : 'DR'}` : '');
  const hurt = receipt.fumbleDamage ? ` · ${receipt.fumbleDamage} Blessure(s) perdue(s)` : '';
  const span = receipt.fromDay != null ? ` · jour ${receipt.fromDay} → ${receipt.toDay}` : '';
  const missing = receipt.missingDailyChecks?.length ? ` · à saisir : ${receipt.missingDailyChecks.map(row => `jour ${row.day}`).join(', ')}` : '';
  return `${head} · ${why}${test}${wounds}${hurt}${span}${missing}`;
};

export function createV5AftermathPanel({ Store, refresh = () => {} } = {}) {
  if (!Store) throw new TypeError('Store requis pour le suivi des séquelles');
  // État d'interface conservé d'un rendu à l'autre : saisies, sections ouvertes, aperçu du saut, dernier reçu.
  const ui = { values: {}, open: new Set(), preview: null, lastReceipt: null };
  const clearValues = prefix => { for (const key of Object.keys(ui.values)) if (key.startsWith(prefix)) delete ui.values[key]; };
  const run = async (prefix, action) => {
    try { const result = await action(); ui.lastReceipt = result?.receipt || { status: 'refused', reason: result?.reason || 'Commande refusée.' }; if (result?.receipt?.status === 'applied') { clearValues(prefix); ui.preview = null; } }
    catch (cause) { ui.lastReceipt = { status: 'refused', reason: cause?.message || 'Commande impossible.' }; }
    refresh();
  };
  const remember = (input, key) => {
    const stored = ui.values[key];
    if (stored !== undefined) { if (input.type === 'checkbox') input.checked = stored; else input.value = stored; }
    input.addEventListener(input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input', () => { ui.values[key] = input.type === 'checkbox' ? input.checked : input.value; });
    return input;
  };
  const control = (labelText, key, { type = 'number', value = '', min = null, max = null } = {}) => {
    const label = node('label', labelText); const input = document.createElement('input'); input.name = key; input.type = type;
    if (type === 'number') { input.step = '1'; input.inputMode = 'numeric'; if (min !== null) input.min = min; if (max !== null) input.max = max; }
    if (value !== '') input.value = value;
    remember(input, key); label.appendChild(input); return { label, input };
  };
  const checkbox = (labelText, key, checked = false) => {
    const label = node('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.name = key; input.checked = checked;
    remember(input, key); label.append(input, document.createTextNode(` ${labelText}`)); return { label, input };
  };
  const select = (labelText, key, options) => {
    const label = node('label', labelText); const input = document.createElement('select'); input.name = key;
    for (const [value, text] of options) { const option = node('option', text); option.value = value; input.appendChild(option); }
    remember(input, key); label.appendChild(input); return { label, input };
  };
  const details = (key, summary) => {
    const element = node('details'); element.appendChild(node('summary', summary)); element.open = ui.open.has(key);
    element.addEventListener('toggle', () => { if (element.open) ui.open.add(key); else ui.open.delete(key); });
    return element;
  };
  const button = (text, handler) => { const element = node('button', text); element.type = 'button'; element.addEventListener('click', handler); return element; };

  const SIDE_OPTIONS = [['', 'Choisir…'], ['left', 'Gauche'], ['right', 'Droit(e)']];
  const PHASE_TEXT = {
    'needs-facts': 'faits à saisir', healing: 'en guérison', 'awaiting-test': 'fin de guérison : Test à faire', healed: 'guérie', permanent: 'permanente',
    severe: 'phase sévère', recovering: 'phase de récupération', open: 'en cours', failed: 'Test raté', resolved: 'décidée', waived: 'écartée par le MJ'
  };
  const LIFETIME_TEXT = { temporary: 'temporaire', permanent: 'permanent' };

  /** Section « Séquelles » du panneau : tout passe par les commandes du Store, jamais par une valeur de réussite saisie. */
  function renderSequelae(state, participants, nameOf, healerFields) {
    const section = node('section'); section.className = 'workspace-aftermath-sequelae'; section.setAttribute('aria-label', 'Séquelles durables et temporaires');
    section.appendChild(node('h4', 'Séquelles des critiques'));
    const overview = Store.listAftermathSequelae();
    const revision = state.revision;

    // 1. Critiques dont les séquelles restent à ouvrir : les faits que le registre ne peut pas lire sont demandés ici.
    const toOpen = overview.incidents.filter(row => row.needsOpening);
    const opening = details('sequelae-open', `Séquelles à suivre (${toOpen.length})`);
    if (!toOpen.length) opening.appendChild(node('p', 'Aucun critique suivi ne laisse de séquelle sans suivi.'));
    for (const entry of toOpen) {
      const box = node('div'); box.className = 'workspace-aftermath-open';
      box.appendChild(node('p', `${nameOf(entry.participantId)} · incident ${entry.incidentId} · ${entry.planned.map(item => item.label).join(', ')}`));
      const getters = [];
      for (const item of entry.planned) {
        const need = requiredSequelaFacts(item);
        if (need.includes('side')) { const side = select(`Côté · ${item.label}`, `open-${item.id}-side`, SIDE_OPTIONS); box.appendChild(side.label); getters.push(facts => { if (side.input.value) facts[item.key] = { ...facts[item.key], side: side.input.value }; }); }
        if (need.includes('d10')) { const d10 = control(`1d10 de guérison · ${item.label}`, `open-${item.id}-d10`, { min: 1, max: 10 }); box.appendChild(d10.label); getters.push(facts => { if (d10.input.value !== '') facts[item.key] = { ...facts[item.key], d10: Number(d10.input.value) }; }); }
        if (need.includes('count')) { const count = control(`Nombre · ${item.label}`, `open-${item.id}-count`, { min: 1 }); box.appendChild(count.label); getters.push(facts => { if (count.input.value !== '') facts[item.key] = { ...facts[item.key], count: Number(count.input.value) }; }); }
        if (item.kind === 'loss' && ['hand', 'arm'].includes(item.part)) { const primary = checkbox(`Main directrice · ${item.label}`, `open-${item.id}-primary`); box.appendChild(primary.label); getters.push(facts => { facts[item.key] = { ...facts[item.key], primary: primary.input.checked }; }); }
      }
      box.appendChild(button(`Ouvrir le suivi des séquelles de ${nameOf(entry.participantId)}`, () => {
        const facts = {}; for (const apply of getters) apply(facts);
        void run(`open-${entry.incidentId}`, () => Store.openAftermathSequelae({ operationId: opId(), expectedRevision: revision, incidentId: entry.incidentId, facts }));
      }));
      opening.appendChild(box);
    }
    section.appendChild(opening);

    // 2. Décisions en attente au jour courant.
    const pending = overview.pending;
    if (pending.length) {
      const list = node('ul'); list.className = 'workspace-aftermath-pending';
      for (const row of pending) list.appendChild(node('li', `${nameOf(row.participantId)} · ${row.label} : ${{ 'needs-facts': 'faits à saisir', 'fracture-final-test': 'Test de fin de guérison à faire', 'surgery-deadline-missed': 'échéance de chirurgie dépassée, décision du MJ', 'post-encounter-test': 'Test de Résistance après la rencontre' }[row.kind] || row.kind}`));
      section.append(node('p', `Décisions en attente (${pending.length})`), list);
    }

    // 3. Chaque séquelle suivie, avec ses étapes.
    const list = node('div'); list.className = 'workspace-aftermath-sequela-list';
    if (!overview.sequelae.length) list.appendChild(node('p', 'Aucune séquelle suivie.'));
    for (const sequela of overview.sequelae) {
      if (sequela.kind === 'scar-decision' || sequela.kind === 'characteristic-loss') continue;
      const card = node('article'); card.className = 'card workspace-aftermath-sequela';
      const timing = sequela.endDay != null ? ` · fin au jour ${sequela.endDay}${sequela.partialDay != null ? ` (adoucissement au jour ${sequela.partialDay})` : ''}` : (sequela.deadlineDay != null ? ` · chirurgie avant la fin du jour ${sequela.deadlineDay}` : '');
      card.appendChild(node('h5', `${nameOf(sequela.participantId)} · ${sequela.label}${sequela.side ? ` (${sequela.side === 'left' ? 'gauche' : 'droit(e)'})` : ''}`));
      card.appendChild(node('p', `Séquelle ${sequela.id} · ${PHASE_TEXT[sequela.phase] || sequela.phase}${timing}${sequela.count ? ` · ${sequela.count}` : ''}`));
      const id = sequela.id;
      if (sequela.status === 'needs-facts') {
        const facts = details(`facts-${id}`, 'Saisir les faits manquants');
        const getters = [];
        if (sequela.missing.includes('side')) { const side = select('Côté', `facts-${id}-side`, SIDE_OPTIONS); facts.appendChild(side.label); getters.push(f => { if (side.input.value) f.side = side.input.value; }); }
        if (sequela.missing.includes('d10')) { const d10 = control('1d10 de guérison', `facts-${id}-d10`, { min: 1, max: 10 }); facts.appendChild(d10.label); getters.push(f => { if (d10.input.value !== '') f.d10 = Number(d10.input.value); }); }
        if (sequela.missing.includes('count')) { const count = control('Nombre', `facts-${id}-count`, { min: 1 }); facts.appendChild(count.label); getters.push(f => { if (count.input.value !== '') f.count = Number(count.input.value); }); }
        if (sequela.kind === 'loss' && ['hand', 'arm'].includes(sequela.part)) { const primary = checkbox('Main directrice', `facts-${id}-primary`); facts.appendChild(primary.label); getters.push(f => { f.primary = primary.input.checked; }); }
        facts.appendChild(button('Enregistrer les faits', () => { const f = {}; for (const apply of getters) apply(f); void run(`facts-${id}`, () => Store.setAftermathSequelaFacts({ operationId: opId(), expectedRevision: revision, sequelaId: id, facts: f })); }));
        card.appendChild(facts);
      }
      if (sequela.kind === 'broken-bone' && sequela.status === 'open') {
        const imm = sequela.immobilization || {};
        card.appendChild(node('p', `Immobilisation : ${{ none: 'aucune', bound: 'en place', unbound: `retirée au jour ${imm.unboundDay} (nouveau Test avant la fin du jour ${imm.rebindDeadline})` }[imm.state] || imm.state} · Tests : ${imm.attempts?.length || 0}`));
        if (sequela.phase === 'healing') {
          if (imm.state !== 'bound') {
            const bind = details(`bind-${id}`, imm.state === 'unbound' ? 'Rattacher la fracture (nouveau Test)' : 'Immobiliser la fracture');
            const fields = healerFields(`bind-${id}`, 'heal');
            bind.append(...fields.elements, node('p', `Guérison ${sequela.severity === 'major' ? '+0' : '+2'} DR${imm.state === 'unbound' ? ' dans la journée' : ' dans la semaine de 8 jours'} : le Test de fin de guérison est évité tant que la fracture reste attachée.`),
              button('Enregistrer le Test d’immobilisation', () => void run(`bind-${id}`, () => Store.immobilizeAftermathFracture({ operationId: opId(), expectedRevision: revision, sequelaId: id, ...fields.values() }))));
            card.appendChild(bind);
          } else card.appendChild(button('Retirer le bandage', () => void run(`unbind-${id}`, () => Store.unbindAftermathFracture({ operationId: opId(), expectedRevision: revision, sequelaId: id }))));
        }
        if (sequela.phase === 'awaiting-test') {
          const waived = imm.state === 'bound' && imm.waiver;
          const done = details(`resolve-${id}`, waived ? 'Constater la guérison (fracture restée attachée)' : 'Test d’Endurance de fin de guérison');
          const roll = control('d100 de Résistance', `resolve-${id}-roll`, { min: 1, max: 100 });
          if (!waived) done.appendChild(roll.label);
          done.append(node('p', waived ? 'Aucun Test : elle est restée attachée.' : `Résistance ${sequela.severity === 'major' ? '+0' : '+2'} DR : un échec laisse une séquelle permanente.`),
            button('Enregistrer', () => void run(`resolve-${id}`, () => Store.resolveAftermathFracture({ operationId: opId(), expectedRevision: revision, sequelaId: id, roll: roll.input.value === '' ? null : Number(roll.input.value) }))));
          card.appendChild(done);
        }
      }
      if (sequela.kind === 'torn-muscle' && sequela.status === 'open' && sequela.severity === 'minor' && !sequela.healTest && sequela.phase === 'healing') {
        const heal = details(`muscle-${id}`, 'Soigner la déchirure (raccourcit la durée)');
        const fields = healerFields(`muscle-${id}`, 'heal');
        const difficulty = control('Modificateur du MJ (DR)', `muscle-${id}-difficulty`, { value: '0' });
        heal.append(...fields.elements, difficulty.label, button('Enregistrer le Test de soin', () => void run(`muscle-${id}`, () => Store.treatAftermathTornMuscle({ operationId: opId(), expectedRevision: revision, sequelaId: id, difficultyDR: Number(difficulty.input.value) || 0, ...fields.values() }))));
        card.appendChild(heal);
      }
      if (sequela.kind === 'reset-limb' && sequela.status === 'open') card.appendChild(button('Membre remis en place (Test étendu réussi à la table)', () => void run(`reset-${id}`, () => Store.confirmAftermathResetLimb({ operationId: opId(), expectedRevision: revision, sequelaId: id }))));
      if (sequela.kind === 'post-encounter-test' && sequela.status === 'open') {
        const roll = control(`d100 de Résistance (${sequela.difficultyDR >= 0 ? '+' : ''}${sequela.difficultyDR} DR)`, `post-${id}-roll`, { min: 1, max: 100 });
        card.append(roll.label, button('Enregistrer le Test', () => void run(`post-${id}`, () => Store.recordAftermathPostEncounterTest({ operationId: opId(), expectedRevision: revision, sequelaId: id, roll: roll.input.value === '' ? null : Number(roll.input.value) }))));
      }
      if (sequela.kind === 'surgery-deadline' && sequela.status === 'open' && sequela.phase !== 'needs-facts' && overview.day > sequela.deadlineDay) {
        const side = select('Côté du pied', `deadline-${id}-side`, SIDE_OPTIONS);
        card.append(node('p', 'Chirurgie manquée dans les délais : le MJ décide du sort du pied.'), side.label,
          button('Le pied est perdu', () => void run(`deadline-${id}`, () => Store.decideAftermathSurgeryDeadline({ operationId: opId(), expectedRevision: revision, sequelaId: id, footLost: true, side: side.input.value || null }))),
          button('Le pied est sauvé (décision du MJ)', () => void run(`deadline-${id}`, () => Store.decideAftermathSurgeryDeadline({ operationId: opId(), expectedRevision: revision, sequelaId: id, footLost: false }))));
      }
      if (sequela.kind === 'disease' && sequela.status === 'open') {
        const label = control('Maladie à suivre', `disease-${id}-label`, { type: 'text', value: sequela.name || '' });
        const duration = control('Durée (jours, d’après la maladie)', `disease-${id}-duration`, { min: 1 });
        card.append(label.label, duration.label, button('Enregistrer la maladie de ce critique', () => void run(`disease-${id}`, () => Store.registerAftermathDisease({ operationId: opId(), expectedRevision: revision, participantId: sequela.participantId, label: label.input.value, durationDays: Number(duration.input.value), sequelaId: id }))));
      }
      if (sequela.kind === 'loss' && ['hand', 'arm'].includes(sequela.part) && sequela.primary && sequela.status === 'permanent' && sequela.relearned < 2) card.appendChild(button('100 PX dépensés pour réapprendre (−1 DR de pénalité)', () => void run(`relearn-${id}`, () => Store.recordAftermathRelearning({ operationId: opId(), expectedRevision: revision, sequelaId: id, hundredsOfXp: 1 }))));
      list.appendChild(card);
    }
    section.appendChild(list);

    // 4. Effets actifs par personnage (Mouvement effectif compris) et pertes de caractéristique à renvoyer à la fiche.
    const effects = node('div'); effects.className = 'workspace-aftermath-effects';
    for (const person of participants) {
      const mirror = person.extensions?.v5?.sequelaEffects;
      if (!mirror) continue;
      const box = node('div');
      box.appendChild(node('h5', `${person.name || person.id} · effets de séquelles`));
      if (mirror.movement && mirror.movement.effective !== mirror.movement.base) box.appendChild(node('p', `Mouvement effectif ${mirror.movement.effective} (base ${mirror.movement.base})`));
      const ul = node('ul');
      for (const row of mirror.rows) ul.appendChild(node('li', `${row.label} · ${LIFETIME_TEXT[row.lifetime] || row.lifetime}`));
      for (const text of mirror.reminders || []) ul.appendChild(node('li', text));
      box.appendChild(ul);
      const totals = overview.characteristics[person.id];
      if (totals) box.appendChild(node('p', `À renvoyer à la fiche (jamais écrit par l’outil) : ${Object.entries(totals).map(([key, value]) => `${key} ${value.amount}`).join(', ')}`));
      effects.appendChild(box);
    }
    section.appendChild(effects);

    // 5. Décisions du MJ qui ne dépendent d'aucune table : cicatrices impressionnantes et perte de caractéristique.
    const decisions = details('sequelae-decisions', 'Cicatrices impressionnantes et pertes de caractéristique');
    const scarPerson = select('Personnage', 'scar-person', [['', 'Choisir…'], ...participants.map(row => [row.id, row.name || row.id])]);
    const scarAgreed = checkbox('Le MJ accorde les cicatrices impressionnantes (+1 DR Intimidation, −1 DR Charme)', 'scar-agreed');
    decisions.append(scarPerson.label, scarAgreed.label, button('Enregistrer la décision', () => void run('scar-', () => Store.decideAftermathImpressiveScars({ operationId: opId(), expectedRevision: revision, participantId: scarPerson.input.value, agreed: scarAgreed.input.checked }))));
    const lossPerson = select('Personnage', 'closs-person', [['', 'Choisir…'], ...participants.map(row => [row.id, row.name || row.id])]);
    const lossCarac = select('Caractéristique', 'closs-carac', [['', 'Choisir…'], ...['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].map(key => [key, key])]);
    const lossAmount = control('Perte', 'closs-amount', { min: 1 });
    const lossBase = control('Caractéristique de base actuelle (facultatif)', 'closs-base', { min: 0 });
    const lossAdvances = control('Avancements achetés (facultatif)', 'closs-advances', { min: 0 });
    const lossReason = control('Origine', 'closs-reason', { type: 'text' });
    decisions.append(lossPerson.label, lossCarac.label, lossAmount.label, lossBase.label, lossAdvances.label, lossReason.label, button('Enregistrer la perte de caractéristique', () => void run('closs-', () => Store.recordAftermathCharacteristicLoss({ operationId: opId(), expectedRevision: revision, participantId: lossPerson.input.value, carac: lossCarac.input.value, amount: Number(lossAmount.input.value),
      base: lossBase.input.value === '' ? null : Number(lossBase.input.value), advances: lossAdvances.input.value === '' ? null : Number(lossAdvances.input.value), reason: lossReason.input.value }))));
    section.appendChild(decisions);
    return section;
  }

  return {
    render(participants = []) {
      let state;
      try { state = Store.getAftermathState(); } catch (cause) {
        const panel = node('section'); panel.className = 'workspace-card workspace-aftermath'; panel.setAttribute('aria-label', 'Suivi des séquelles');
        panel.append(node('h3', 'Suivi des séquelles'), node('p', `Registre indisponible : ${cause.message}`)); return panel;
      }
      const nameOf = id => participants.find(row => row.id === id)?.name || id;
      const panel = node('section'); panel.className = 'workspace-card workspace-aftermath'; panel.setAttribute('aria-label', 'Suivi des séquelles et convalescence');
      panel.appendChild(node('h3', 'Séquelles et convalescence'));
      const status = node('p', receiptText(ui.lastReceipt)); status.setAttribute('role', 'status'); status.className = 'workspace-aftermath-status';
      panel.appendChild(status);
      const date = aftermathDate(state);
      panel.appendChild(node('p', `Calendrier de convalescence · jour ${date.day} · jour ${date.dayInImperialWeek}/8 de la semaine impériale · origine ${state.calendar.originDay}. Cette horloge est indépendante du temps de magie.`));

      // Soigneur + compétence de la fiche + d100 : le moteur lit le score et calcule réussite et DR.
      const healerFields = (prefix, purpose) => {
        const healer = select('Soigneur', `${prefix}-healer`, [['', 'Choisir…'], ...participants.map(row => [row.id, row.name || row.id])]);
        const skillLabel = node('label', 'Compétence'); const skill = document.createElement('select'); skill.name = `${prefix}-skill`; skillLabel.appendChild(skill);
        const fill = () => {
          skill.replaceChildren();
          const owner = participants.find(row => row.id === healer.input.value);
          const skills = owner ? aftermathSkills(owner, purpose) : [];
          if (!skills.length) skill.appendChild(Object.assign(node('option', owner ? 'Aucune compétence sur la fiche' : '—'), { value: '' }));
          for (const row of skills) skill.appendChild(Object.assign(node('option', `${row.name} (${row.score})`), { value: String(row.id) }));
          if (ui.values[`${prefix}-skill`] !== undefined) skill.value = ui.values[`${prefix}-skill`];
        };
        skill.addEventListener('change', () => { ui.values[`${prefix}-skill`] = skill.value; });
        healer.input.addEventListener('change', () => { delete ui.values[`${prefix}-skill`]; fill(); });
        fill();
        const roll = control('d100', `${prefix}-roll`, { min: 1, max: 100 });
        return { elements: [healer.label, skillLabel, roll.label], values: () => ({ healerId: healer.input.value || null, skillId: skill.value || null, roll: roll.input.value === '' ? null : Number(roll.input.value) }) };
      };

      // Avancement du calendrier : l'aperçu liste chaque Test quotidien, jour par jour.
      const advanceForm = node('form'); advanceForm.className = 'workspace-aftermath-advance';
      advanceForm.addEventListener('submit', event => event.preventDefault());
      const days = control('Jours à avancer', 'advance-days', { min: 1, value: '1' });
      const previewBox = node('div'); previewBox.setAttribute('aria-live', 'polite');
      const confirm = button('Confirmer l’avancement', () => {
        if (!ui.preview || ui.preview.status !== 'ready') { ui.lastReceipt = { status: 'refused', reason: 'Faites un aperçu avant de confirmer.' }; refresh(); return; }
        const dailyTests = ui.preview.requiredDailyChecks.flatMap(check => {
          const raw = ui.values[`daily-${check.incidentId}-${check.day}`];
          return raw === undefined || raw === '' ? [] : [{ incidentId: check.incidentId, day: check.day, roll: Number(raw) }];
        });
        void run('daily-', () => Store.advanceAftermathCalendar({ operationId: opId(), expectedRevision: state.revision, days: ui.preview.days, dailyTests }));
      });
      confirm.disabled = !ui.preview || ui.preview.status !== 'ready';
      const previewButton = button('Aperçu des échéances', () => {
        ui.preview = Store.previewAftermathAdvance({ days: Number(days.input.value), expectedRevision: state.revision });
        if (ui.preview.status !== 'ready') ui.lastReceipt = { status: 'refused', reason: ui.preview.reason };
        refresh();
      });
      days.input.addEventListener('input', () => { ui.preview = null; confirm.disabled = true; previewBox.replaceChildren(); });
      const week = button('Entre-aventure (environ 8 jours)', () => { ui.values['advance-days'] = '8'; ui.preview = null; refresh(); });
      if (ui.preview?.status === 'ready') {
        const checks = ui.preview.requiredDailyChecks;
        previewBox.appendChild(node('p', `Du jour ${ui.preview.fromDay} au jour ${ui.preview.toDay}. ${checks.length} Test(s) de Résistance +2 DR possible(s) à saisir, un d100 par jour et par blessure non traitée.`));
        if (ui.preview.absentIncidents?.length) previewBox.appendChild(node('p', `Patient(s) hors du combat, aucun Test attendu : ${ui.preview.absentIncidents.map(row => `${nameOf(row.participantId)} (incident ${row.incidentId})`).join(', ')}. Archivez ces suivis ci-dessous.`));
        for (const event of ui.preview.sequelaEvents || []) previewBox.appendChild(node('p', `Jour ${event.day} · ${event.participantName || event.participantId} · ${event.label} : ${{ 'fracture-heals': event.testNeeded ? 'fin de guérison, Test d’Endurance à faire' : 'fin de guérison (restée attachée, aucun Test)', 'tear-eases': 'la pénalité diminue', 'tear-heals': 'guérison complète', 'surgery-deadline-passes': 'l’échéance de chirurgie passe', 'rebind-window-passes': 'le délai pour rattacher la fracture passe' }[event.kind] || event.kind}`));
        for (const check of checks) {
          const row = node('div'); row.className = 'workspace-aftermath-check';
          const label = `${check.participantName || check.participantId} · incident ${check.incidentId} · fin du jour ${check.day} · Résistance +2 DR${check.score != null ? ` (score ${check.score})` : ' (score introuvable)'}`;
          row.appendChild(node('span', label));
          if (check.conditional) row.appendChild(node('em', ' — requis seulement si les jours précédents sont réussis'));
          row.appendChild(control(`d100 du jour ${check.day} pour ${check.incidentId}`, `daily-${check.incidentId}-${check.day}`, { min: 1, max: 100 }).label);
          previewBox.appendChild(row);
        }
      }
      advanceForm.append(days.label, week, previewButton, previewBox, confirm);
      panel.appendChild(advanceForm);

      // Ouvrir un suivi : uniquement depuis une occurrence F2-I, ou une cause de Blessures réellement perdues.
      const proposals = Store.listAftermathProposals?.() || [];
      const critical = details('critical-proposals', `Critiques à suivre (${proposals.length})`); critical.className = 'workspace-aftermath-register';
      if (!proposals.length) critical.appendChild(node('p', 'Aucune occurrence critique sans suivi.'));
      for (const proposal of proposals) {
        const row = node('div'); row.className = 'workspace-aftermath-proposal';
        row.appendChild(node('span', `${proposal.participantName || proposal.participantId} · ${proposal.effectName || 'critique'} (${proposal.location || '?'})${proposal.requiresSurgery ? ' · chirurgie requise' : ''}`));
        const kind = select('Sujet', `proposal-kind-${proposal.criticalId}`, [['person', 'Personne'], ['animal', 'Animal']]);
        const bandaged = checkbox('Déjà bandée ou traitée', `proposal-bandaged-${proposal.criticalId}`);
        const open = button(`Ouvrir le suivi de ${proposal.effectName || 'ce critique'}`, () => void run(`proposal-${proposal.criticalId}`, () => Store.registerAftermathIncident({ operationId: opId(), expectedRevision: state.revision, participantId: proposal.participantId, criticalId: proposal.criticalId, subjectKind: kind.input.value, bandaged: bandaged.input.checked })));
        row.append(kind.label, bandaged.label, open); critical.appendChild(row);
      }
      panel.appendChild(critical);

      const lost = details('wounds-lost', 'Blessures perdues hors critique'); lost.className = 'workspace-aftermath-register';
      const hurt = participants.filter(row => Number(row.hp) < Number(row.maxHp));
      const patient = select('Blessé', 'lost-patient', [['', 'Choisir…'], ...hurt.map(row => [row.id, `${row.name || row.id} (${row.hp}/${row.maxHp})`])]);
      const cause = control('Cause', 'lost-cause', { type: 'text' });
      const lostKind = select('Sujet', 'lost-kind', [['person', 'Personne'], ['animal', 'Animal']]);
      const lostBandaged = checkbox('Déjà bandée ou traitée', 'lost-bandaged');
      lost.append(patient.label, cause.label, lostKind.label, lostBandaged.label, button('Créer le suivi', () => void run('lost-', () => Store.registerAftermathIncident({ operationId: opId(), expectedRevision: state.revision, participantId: patient.input.value, cause: cause.input.value, subjectKind: lostKind.input.value, bandaged: lostBandaged.input.checked }))));
      panel.appendChild(lost);

      const list = node('div'); list.className = 'workspace-aftermath-incidents';
      if (!state.incidents.length) list.appendChild(node('p', 'Aucun incident enregistré.'));
      for (const incident of state.incidents) {
        const card = node('article'); card.className = 'card workspace-aftermath-incident';
        const origin = incident.source.kind === 'critical' ? `critique ${incident.source.criticalId}` : `Blessures perdues : ${incident.source.cause}`;
        card.appendChild(node('h4', `${nameOf(incident.participantId)} · blessure du jour ${incident.injuryDay} · ${incident.status === 'open' ? 'en suivi' : (incident.status === 'archived' ? 'archivé' : 'clôturé')}`));
        card.appendChild(node('p', `Incident ${incident.id} · ${origin} · ${incident.subjectKind === 'animal' ? 'animal' : 'personne'} · ${incident.bandaged ? 'bandé' : 'non bandé'} · ${incident.infection ? 'infection active' : 'pas d’infection'} · chirurgie ${incident.requiresSurgery ? (incident.surgeryCompleted ? 'terminée' : 'requise') : 'non requise'}`));
        card.appendChild(node('p', `Soins utilisés : ${incident.treatments.map(item => `${item.kind} (jour ${item.day})`).join(', ') || 'aucun'} · Tests quotidiens : ${incident.dailyChecks.length}`));
        if (incident.status === 'open') {
          const animal = incident.subjectKind === 'animal';
          const treatment = details(`treat-${incident.id}`, animal ? 'Soins aux animaux' : 'Guérison');
          const fields = healerFields(`treat-${incident.id}`, animal ? 'animal-care' : 'heal');
          const difficulty = control('Difficulté du soin (DR)', `treat-${incident.id}-difficulty`, { value: '0' });
          const supplies = checkbox('Fournitures médicales disponibles', `treat-${incident.id}-supplies`);
          const inCombat = checkbox('Pendant un combat', `treat-${incident.id}-combat`);
          const d10 = control('1d10 en cas de maladresse', `treat-${incident.id}-d10`, { min: 1, max: 10 });
          const woundHealUsed = incident.treatments.some(item => ['heal', 'animal-care'].includes(item.kind));
          const choice = select('Talent Chirurgie (hors combat) : valeur retenue', `treat-${incident.id}-choice`, [['', 'Sans Talent'], ['sl', 'DR obtenus'], ['units', 'Chiffre des unités du d100']]);
          if (woundHealUsed) treatment.appendChild(node('p', 'Le soin de Blessures est déjà utilisé : ce Test ne retire que des Hémorragiques (une par Blessure qu’il aurait rendue).'));
          treatment.append(...fields.elements, difficulty.label, supplies.label, inCombat.label, choice.label, d10.label, button('Enregistrer le Test de soin', () => void run(`treat-${incident.id}`, () => Store.treatAftermathWound({ operationId: opId(), expectedRevision: state.revision, incidentId: incident.id, ...fields.values(), difficultyDR: Number(difficulty.input.value) || 0, supplies: supplies.input.checked, inCombat: inCombat.input.checked, d10: d10.input.value === '' ? null : Number(d10.input.value), surgeryChoice: choice.input.value || null, bleedingOnly: woundHealUsed }))));
          card.appendChild(treatment);
          if (incident.infection) {
            const infection = details(`infection-${incident.id}`, 'Traiter l’infection');
            const infectionFields = healerFields(`infection-${incident.id}`, animal ? 'animal-care' : 'heal');
            const remedy = checkbox('Remède adapté obtenu (sans Test)', `infection-${incident.id}-remedy`);
            infection.append(...infectionFields.elements, remedy.label, button('Enregistrer le traitement', () => void run(`infection-${incident.id}`, () => Store.treatAftermathInfection({ operationId: opId(), expectedRevision: state.revision, incidentId: incident.id, ...infectionFields.values(), remedy: remedy.input.checked }))));
            card.appendChild(infection);
          }
          if (incident.source.kind === 'critical' && !incident.treatments.some(item => item.kind === 'surgery' && item.succeeded)) {
            const surgery = details(`surgery-${incident.id}`, 'Opérer la blessure critique');
            const surgeryFields = healerFields(`surgery-${incident.id}`, 'heal');
            const surgeryD10 = control('1d10 en cas de maladresse', `surgery-${incident.id}-d10`, { min: 1, max: 10 });
            surgery.append(...surgeryFields.elements, surgeryD10.label, button('Enregistrer le Test de chirurgie', () => void run(`surgery-${incident.id}`, () => Store.treatAftermathSurgicalIncident({ operationId: opId(), expectedRevision: state.revision, incidentId: incident.id, ...surgeryFields.values(), d10: surgeryD10.input.value === '' ? null : Number(surgeryD10.input.value) }))));
            card.appendChild(surgery);
          }
          const close = details(`close-${incident.id}`, incident.source.kind === 'critical' ? 'Déclarer le critique guéri' : 'Clore le suivi');
          const ended = checkbox('Les malus temporaires sont terminés', `close-${incident.id}-ended`);
          const statesOk = checkbox('Les États du critique sont retirés (confirmation du MJ, si la fiche ne les rattache pas)', `close-${incident.id}-states`);
          close.append(ended.label, statesOk.label, button('Clore', () => void run(`close-${incident.id}`, () => Store.closeAftermathIncident({ operationId: opId(), expectedRevision: state.revision, incidentId: incident.id, temporaryEffectsEnded: ended.input.checked, statesConfirmed: statesOk.input.checked }))));
          card.appendChild(close);
          if (!participants.some(row => row.id === incident.participantId)) {
            card.appendChild(node('p', 'Patient hors du combat : aucun Test attendu.'));
            card.appendChild(button('Archiver ce suivi', () => void run(`archive-${incident.id}`, () => Store.archiveAftermathIncident({ operationId: opId(), expectedRevision: state.revision, incidentId: incident.id }))));
          }
        }
        list.appendChild(card);
      }
      panel.appendChild(list);

      // Maladies : soins quotidiens d'un malade (V5 p. 182).
      const diseases = details('diseases', `Maladies suivies (${(state.diseases || []).length})`); diseases.className = 'workspace-aftermath-diseases';
      const sick = select('Malade', 'disease-patient', [['', 'Choisir…'], ...participants.map(row => [row.id, row.name || row.id])]);
      const label = control('Maladie', 'disease-label', { type: 'text' });
      const duration = control('Durée restante (jours, d’après la maladie)', 'disease-duration', { min: 1 });
      diseases.append(sick.label, label.label, duration.label, button('Enregistrer la maladie', () => void run('disease-', () => Store.registerAftermathDisease({ operationId: opId(), expectedRevision: state.revision, participantId: sick.input.value, label: label.input.value, durationDays: Number(duration.input.value) }))));
      for (const disease of state.diseases || []) {
        const card = node('article'); card.className = 'card workspace-aftermath-disease';
        card.appendChild(node('p', `${disease.label} · ${nameOf(disease.participantId)} · ${disease.status === 'active' ? `${disease.remainingDays} jour(s) restant(s)` : 'terminée'} · soins : ${disease.careLog.map(row => `jour ${row.day} (${nameOf(row.healerId)})`).join(', ') || 'aucun'}`));
        if (disease.status === 'active') {
          const fields = healerFields(`care-${disease.id}`, 'heal');
          const difficulty = control('Modificateur du MJ (DR)', `care-${disease.id}-difficulty`, { value: '0' });
          const rested = checkbox('Journée de repos sous ses soins', `care-${disease.id}-rested`, true);
          card.append(...fields.elements, difficulty.label, rested.label, button('Enregistrer les soins du jour', () => void run(`care-${disease.id}`, () => Store.careForAftermathDisease({ operationId: opId(), expectedRevision: state.revision, diseaseId: disease.id, ...fields.values(), difficultyDR: Number(difficulty.input.value) || 0, rested: rested.input.checked }))));
        }
        diseases.appendChild(card);
      }
      panel.appendChild(diseases);
      // Séquelles durables et temporaires (F2-J2) : étapes de guérison, Tests réels (compétence de la fiche + d100), pertes confirmées.
      panel.appendChild(renderSequelae(state, participants, nameOf, healerFields));
      return panel;
    }
  };
}
