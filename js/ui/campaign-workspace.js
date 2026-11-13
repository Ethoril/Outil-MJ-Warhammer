import { aftermathDate } from '../core/v5-aftermath.js';
import { createV5AftermathPanel } from './v5-aftermath-panel.js';

// Helpers DOM sobres
const node = (tag, className = '', text = '') => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  return el;
};
const btn = (text, className, action) => {
  const el = node('button', className, text);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
};
const label = text => node('div', 'campaign-kicker', text);
const countText = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
const activeIncident = row => row.status === 'open';
const activeDisease = row => row.status === 'active';
const visibleSequela = row => ['open', 'needs-facts', 'permanent'].includes(row.status);

const phaseText = {
  'needs-facts': 'Faits à préciser', healing: 'En guérison', 'awaiting-test': 'Test à effectuer',
  healed: 'Guérie', permanent: 'Permanente', severe: 'Phase sévère', recovering: 'Récupération',
  open: 'En cours', failed: 'Test raté', resolved: 'Décidée', waived: 'Écartée', 'not-applicable': 'Sans objet'
};
const pendingText = {
  'needs-facts': 'Faits à préciser', 'fracture-final-test': 'Test de fin de guérison',
  'surgery-deadline-missed': 'Échéance de chirurgie dépassée : décision du MJ',
  'post-encounter-test': 'Test après la rencontre'
};

function formatElapsed(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return 'Horloge non initialisée';
  let left = seconds;
  const parts = [];
  for (const [unit, short] of [[86400, 'j'], [3600, 'h'], [60, 'min'], [1, 's']]) {
    const amount = Math.floor(left / unit);
    if (amount) parts.push(`${amount} ${short}`);
    left %= unit;
  }
  return parts.join(' ') || '0 s';
}

function humanSummary(incidents, diseases, sequelae) {
  const pieces = [];
  if (incidents.length) pieces.push(countText(incidents.length, 'blessure suivie', 'blessures suivies'));
  if (diseases.length) pieces.push(countText(diseases.length, 'maladie suivie', 'maladies suivies'));
  if (sequelae.length) pieces.push(countText(sequelae.length, 'séquelle suivie', 'séquelles suivies'));
  return pieces.join(' · ') || 'Aucun suivi actif';
}

function addLine(list, title, detail) {
  const item = node('li', 'campaign-followup');
  item.append(node('strong', '', title));
  if (detail) item.append(node('span', '', detail));
  list.append(item);
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PLACE_TEXT = { suspendue: 'Scène suspendue', aucun: 'Ancien suivi' };
const PLACE_NOTICE = {
  suspendue: 'Ce suivi appartient à un participant d’une scène suspendue : consultation seule. Reprenez la scène pour soigner.',
  aucun: 'Ancien suivi sans personnage : consultation seule. Il peut être archivé.'
};

function getPersonStatus(entry, ownIncidents, ownDiseases, ownSequelae, ownProposals) {
  if (entry.absent) return { text: PLACE_TEXT[entry.place] || PLACE_TEXT.aucun, color: 'blue' };
  if (ownProposals.length || ownIncidents.some(i => !i.bandaged || i.infection || (i.requiresSurgery && !i.surgeryCompleted))) {
    return { text: 'À traiter', color: 'red' };
  }
  if (ownIncidents.length || ownDiseases.length || ownSequelae.length) {
    return { text: 'À surveiller', color: 'amber' };
  }
  return { text: 'Rien à traiter', color: 'green' };
}

/**
 * Espace Campagne complet (Lot 3) :
 * - Synthèse sobre inspirée de la maquette (fond parchemin, titres Georgia, sans-serif système, rouge profond).
 * - Commandes existantes de convalescence accessibles dans le détail et dans la section d'ensemble.
 * - Avance de temps par Store (commande existante).
 * - Participants de la rencontre, puis personnages suivis hors rencontre (mêmes opérations) ; les suivis sans sujet
 *   (scène suspendue, ancien suivi) restent en consultation sous un nom stable, sans rapprochement automatique.
 */
export function mountCampaignWorkspace({ root, Store, onAdvanceTime = () => {}, aftermathPanel = null } = {}) {
  if (!root || !Store) throw new TypeError('Conteneur et Store requis pour Campagne.');
  let selected = null;
  let filter = 'all';
  let globalDetailsOpen = false;
  let disposed = false;

  const aftermath = aftermathPanel || createV5AftermathPanel({ Store, refresh: () => render() });

  function render() {
    if (disposed) return;
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.dataset?.campaignFocus || null;
    const focusFilter = focused?.dataset?.campaignFilter || null;
    const focusPerson = focused?.dataset?.campaignPerson || null;
    const focusTask = focused?.dataset?.campaignTask;
    const focusName = focused?.name || null;
    const focusScope = focused?.closest('.campaign-detail') ? 'detail'
      : (focused?.closest('.campaign-global-section') ? 'global'
      : (focused?.closest('.campaign-clock') ? 'clock' : null));


    const page = node('section', 'campaign-workspace');
    page.setAttribute('aria-label', 'Campagne');

    const header = node('header', 'campaign-heading');
    const titleBox = node('div');
    titleBox.append(
      label('ESPACE DE SÉANCE'),
      node('h2', '', 'Campagne'),
      node('p', 'campaign-intro', 'Temps de jeu, blessures et séquelles suivis dans la partie.')
    );
    header.append(titleBox);
    page.append(header);

    try {
      const campaignSeconds = Store.getCampaignSeconds();
      const state = Store.getAftermathState();
      const overview = Store.listAftermathSequelae();
      const proposals = Store.listAftermathProposals();
      // CA14 : participants de la rencontre en cours, puis personnages suivis hors rencontre (`offEncounter`).
      const participants = Store.listAftermathSubjects();
      const conflicts = Store.listFollowedCharacterConflicts();
      const byId = new Map(participants.map(person => [person.id, person]));
      const incidents = state.incidents || [];
      const diseases = state.diseases || [];
      const sequelae = overview.sequelae || [];
      const activeIds = new Set([
        ...incidents.filter(activeIncident),
        ...diseases.filter(activeDisease),
        ...sequelae.filter(visibleSequela),
        ...(overview.pending || []),
        ...proposals
      ].map(row => row.participantId));

      const absentIds = [...activeIds].filter(id => !byId.has(id));
      const people = participants.map(person => ({ id: person.id, person, name: person.name || 'Personnage sans nom', absent: false, off: person.offEncounter === true }));
      // CA2 à CA4 : un suivi sans sujet garde le nom enregistré à son ouverture, jamais un rang d'affichage.
      const rowsOf = id => [...incidents, ...diseases, ...sequelae, ...(overview.pending || [])].filter(row => row.participantId === id);
      for (const id of absentIds) {
        const row = rowsOf(id)[0];
        people.push({ id, person: null, absent: true, off: false,
          name: (row ? Store.getAftermathRowLabel(row) : '') || 'Ancien suivi',
          place: Store.getAftermathSubjectPlace(id) });
      }
      const visible = filter === 'active' ? people.filter(person => activeIds.has(person.id)) : people;
      if (!visible.some(person => person.id === selected)) selected = visible[0]?.id ?? null;
      const day = aftermathDate(state);

      // Barre de temps
      const clockBox = node('section', 'campaign-clock');
      clockBox.setAttribute('aria-label', 'Temps de campagne');
      const clockInfo = node('div', 'campaign-clock-info');
      const clockIcon = node('span', 'campaign-clock-icon', '◷');
      clockIcon.setAttribute('aria-hidden', 'true');
      const clockText = node('div');
      clockText.append(
        label('TEMPS DE JEU SUIVI'),
        node('strong', 'campaign-clock-value', formatElapsed(campaignSeconds)),
        node('p', '', `Convalescence : jour ${day.day} · jour ${day.dayInImperialWeek}/8 de la semaine impériale`)
      );
      clockInfo.append(clockIcon, clockText);

      const timeAction = node('div', 'campaign-clock-action');
      const advance = btn('Avancer le temps…', 'campaign-primary', () => onAdvanceTime());
      advance.dataset.campaignFocus = 'advance';
      timeAction.append(node('p', '', 'Le dialogue demande les saisies nécessaires avant d’avancer le temps.'), advance);
      clockBox.append(clockInfo, timeAction);
      page.append(clockBox);

      // Tâches à traiter
      const tasks = node('section', 'campaign-tasks');
      tasks.append(label('À TRAITER'), node('h3', '', 'Décisions et critiques à suivre'));
      const taskList = node('ul', 'campaign-task-list');
      const taskRows = [
        ...(overview.pending || []).map(item => ({ id: item.participantId, title: item.label || 'Séquelle', text: pendingText[item.kind] || 'Décision à examiner' })),
        ...proposals.map(item => ({ id: item.participantId, title: item.effectName || 'Blessure critique', text: 'Suivi à ouvrir' }))
      ];
      if (!taskRows.length) tasks.append(node('p', 'campaign-muted', 'Aucune décision de séquelle ni critique à ouvrir.'));
      for (const [taskIndex, task] of taskRows.entries()) {
        const owner = people.find(person => person.id === task.id);
        const item = node('li', 'campaign-task');
        const selectTaskBtn = btn('', 'campaign-task-button', () => {
          selected = task.id; filter = 'all'; render();
          const target = [...root.querySelectorAll('[data-campaign-person]')].find(el => el.dataset.campaignPerson === task.id);
          target?.focus();
        });
        selectTaskBtn.dataset.campaignTask = String(taskIndex);
        selectTaskBtn.append(node('strong', '', owner?.name || 'Suivi'), node('span', '', `${task.title} · ${task.text}`));
        item.append(selectTaskBtn);
        taskList.append(item);
      }
      if (taskRows.length) tasks.append(taskList);
      page.append(tasks);

      // CA38 : deux personnages suivis pour une même fiche. L'outil ne choisit pas : le MJ dit lequel garder.
      for (const conflict of conflicts) {
        const box = node('section', 'campaign-conflict');
        box.setAttribute('role', 'alert');
        box.append(node('h3', '', 'Deux personnages suivis pour la même fiche'),
          node('p', '', 'Tant que le doublon existe, aucun des deux n’entre d’office en rencontre. Gardez-en un : l’autre est supprimé et ses suivis sont archivés (annulable par ↶).'));
        const choices = node('div', 'campaign-conflict-choices');
        for (const character of conflict.characters) {
          const keep = btn(`Garder « ${character.name} »${character.hp != null ? ` (${character.hp} PV)` : ''}`, 'campaign-secondary', async () => {
            keep.disabled = true;
            try { await Store.resolveFollowedCharacterConflict({ keepId: character.id }); } finally { render(); }
          });
          keep.dataset.campaignFocus = `conflict-${character.id}`;
          choices.append(keep);
        }
        box.append(choices);
        page.append(box);
      }

      // Disposition principale en 2 colonnes
      const layout = node('div', 'campaign-layout');

      // Colonne gauche : liste des personnages
      const group = node('section', 'campaign-group');
      group.append(label('VUE D’ENSEMBLE'));
      const groupTitle = node('div', 'campaign-section-heading');
      groupTitle.append(node('h3', '', 'Personnages'), node('span', 'campaign-muted', countText(people.length, 'personnage ou suivi', 'personnages ou suivis')));
      group.append(groupTitle, node('p', 'campaign-muted', 'Participants de la rencontre en cours, puis personnages suivis hors rencontre.'));

      const filters = node('div', 'campaign-filters');
      filters.setAttribute('role', 'group');
      filters.setAttribute('aria-label', 'Filtrer les personnages');
      for (const [id, text] of [['all', 'Tous'], ['active', 'Avec suivi']]) {
        const filterButton = btn(text, `campaign-filter${filter === id ? ' is-active' : ''}`, () => {
          filter = id; render(); root.querySelector(`[data-campaign-filter="${id}"]`)?.focus();
        });
        filterButton.dataset.campaignFilter = id;
        filterButton.setAttribute('aria-pressed', String(filter === id));
        filters.append(filterButton);
      }
      group.append(filters);

      const list = node('div', 'campaign-person-list');
      list.setAttribute('aria-label', 'Personnages et suivis');
      if (!visible.length) {
        list.append(node('p', 'campaign-empty', filter === 'active' ? 'Aucun suivi actif.' : 'Aucun participant ni personnage suivi.'));
      }
      for (const entry of visible) {
        const ownIncidents = incidents.filter(row => row.participantId === entry.id && activeIncident(row));
        const ownDiseases = diseases.filter(row => row.participantId === entry.id && activeDisease(row));
        const ownSequelae = sequelae.filter(row => row.participantId === entry.id && visibleSequela(row));
        const ownProposals = proposals.filter(row => row.participantId === entry.id);
        const statusMeta = getPersonStatus(entry, ownIncidents, ownDiseases, ownSequelae, ownProposals);

        const selectPerson = btn('', `campaign-person${entry.id === selected ? ' is-selected' : ''}`, () => {
          selected = entry.id; render();
          root.querySelectorAll('[data-campaign-person]').forEach(el => {
            if (el.dataset.campaignPerson === entry.id) el.focus();
          });
        });
        selectPerson.dataset.campaignPerson = entry.id;
        selectPerson.setAttribute('aria-pressed', String(entry.id === selected));

        const avatar = node('span', `campaign-avatar ${statusMeta.color}`, getInitials(entry.name));
        avatar.setAttribute('aria-hidden', 'true');

        const main = node('span', 'campaign-person-main');
        const subtitle = ownProposals.length
          ? `${countText(ownProposals.length, 'critique à suivre', 'critiques à suivre')} · ${humanSummary(ownIncidents, ownDiseases, ownSequelae)}`
          : humanSummary(ownIncidents, ownDiseases, ownSequelae);
        main.append(node('strong', 'campaign-person-name', entry.name), node('small', '', subtitle));

        const hp = entry.person && Number.isFinite(Number(entry.person.hp)) && Number.isFinite(Number(entry.person.maxHp))
          ? `${entry.person.hp} / ${entry.person.maxHp} PV`
          : (entry.absent ? 'Consultation' : 'PV indisponibles');
        const hpBox = node('span', 'campaign-person-hp');
        hpBox.append(node('small', '', 'BLESSURES'), node('strong', '', hp));

        const badgeBox = node('span', 'campaign-person-badge');
        const badge = node('span', `campaign-badge ${statusMeta.color}`);
        badge.append(node('i'), document.createTextNode(statusMeta.text));
        badgeBox.append(badge);
        if (entry.off) {
          // La pastille situe le personnage ; elle ne retire aucune opération.
          const place = node('span', 'campaign-badge blue');
          place.append(node('i'), document.createTextNode('Hors rencontre'));
          badgeBox.append(place);
        }

        const chevron = node('span', 'campaign-chevron', '›');
        chevron.setAttribute('aria-hidden', 'true');

        selectPerson.append(avatar, main, hpBox, badgeBox, chevron);
        list.append(selectPerson);
      }
      group.append(list);

      // Légende sobre
      const legend = node('div', 'campaign-legend');
      legend.append(
        node('span', '', '• Rouge : à traiter'),
        node('span', '', '• Ambre : à surveiller'),
        node('span', '', '• Vert : rien à traiter'),
        node('span', '', '• Bleu : hors rencontre')
      );
      group.append(legend);
      layout.append(group);

      // Colonne droite : détail et opérations du personnage sélectionné
      const detail = node('aside', 'campaign-detail');
      detail.setAttribute('aria-label', 'Détail du suivi');
      const chosen = visible.find(person => person.id === selected);
      if (!chosen) {
        detail.append(
          label('SUIVI'),
          node('h3', '', 'Aucun personnage sélectionné'),
          node('p', 'campaign-muted', 'Les suivis disponibles apparaîtront ici.')
        );
      } else {
        const ownIncidents = incidents.filter(row => row.participantId === chosen.id && activeIncident(row));
        const ownDiseases = diseases.filter(row => row.participantId === chosen.id && activeDisease(row));
        const ownSequelae = sequelae.filter(row => row.participantId === chosen.id && visibleSequela(row));
        const ownProposals = proposals.filter(row => row.participantId === chosen.id);
        const pending = (overview.pending || []).filter(row => row.participantId === chosen.id);

        const top = node('div', 'campaign-detail-top');
        top.append(label(chosen.absent ? 'SUIVI EN CONSULTATION' : (chosen.off ? 'PERSONNAGE SUIVI HORS RENCONTRE' : 'PERSONNAGE SÉLECTIONNÉ')));

        const profile = node('div', 'campaign-profile');
        const statusMeta = getPersonStatus(chosen, ownIncidents, ownDiseases, ownSequelae, ownProposals);
        const largeAvatar = node('span', `campaign-avatar large ${statusMeta.color}`, getInitials(chosen.name));
        largeAvatar.setAttribute('aria-hidden', 'true');
        const profileInfo = node('div');
        profileInfo.append(node('h3', 'campaign-detail-title', chosen.name));
        const hp = chosen.person && Number.isFinite(Number(chosen.person.hp)) && Number.isFinite(Number(chosen.person.maxHp))
          ? `${chosen.person.hp} / ${chosen.person.maxHp} PV`
          : (chosen.absent ? (PLACE_TEXT[chosen.place] || PLACE_TEXT.aucun) : 'PV indisponibles');
        profileInfo.append(node('p', 'campaign-muted', hp));
        profile.append(largeAvatar, profileInfo);
        top.append(profile);
        detail.append(top);

        // Reçu d'opération en direct (statut accessible)
        if (typeof aftermath.renderReceiptStatus === 'function') {
          detail.append(aftermath.renderReceiptStatus());
        }

        if (chosen.absent) {
          detail.append(node('p', 'campaign-notice', PLACE_NOTICE[chosen.place] || PLACE_NOTICE.aucun));
        }

        if (pending.length) {
          const decisions = node('section', 'campaign-decisions');
          decisions.append(node('h4', '', 'Décisions en attente'));
          const entries = node('ul', 'campaign-followups');
          for (const item of pending) addLine(entries, item.label || 'Séquelle', pendingText[item.kind] || 'Décision à examiner');
          decisions.append(entries);
          detail.append(decisions);
        }

        const followups = node('section', 'campaign-detail-followups');
        followups.append(node('h4', '', 'Suivis actifs'));
        const entries = node('ul', 'campaign-followups');
        for (const proposal of ownProposals) addLine(entries, proposal.effectName || 'Blessure critique', 'Suivi à ouvrir');
        for (const incident of ownIncidents) {
          const cause = incident.source?.kind === 'critical' ? 'Blessure critique' : (incident.source?.cause || 'Blessure');
          const status = [incident.bandaged ? 'Bandée ou traitée' : 'Non bandée', incident.infection ? 'Infection active' : 'Sans infection', incident.requiresSurgery ? (incident.surgeryCompleted ? 'Chirurgie terminée' : 'Chirurgie requise') : ''].filter(Boolean).join(' · ');
          addLine(entries, cause, `Jour ${incident.injuryDay} · ${status}`);
        }
        for (const disease of ownDiseases) addLine(entries, disease.label || 'Maladie', `${countText(disease.remainingDays, 'jour restant', 'jours restants')}`);
        for (const sequela of ownSequelae) {
          const stateLabel = phaseText[sequela.phase] || phaseText[sequela.status] || 'Suivi en cours';
          const end = Number.isInteger(sequela.endDay) ? ` · échéance jour ${sequela.endDay}` : '';
          addLine(entries, sequela.label || 'Séquelle', stateLabel + end);
        }
        if (!entries.childElementCount) followups.append(node('p', 'campaign-muted', 'Aucun suivi actif pour ce personnage.'));
        else followups.append(entries);
        detail.append(followups);

        // Actions interactives de convalescence pour ce personnage
        if (!chosen.absent && typeof aftermath.renderParticipantConvalescence === 'function') {
          const actionsBox = node('section', 'campaign-detail-actions-box');
          actionsBox.append(node('h4', '', 'Soins et décisions disponibles'));
          actionsBox.append(aftermath.renderParticipantConvalescence(chosen.id, participants));
          detail.append(actionsBox);
        } else if (chosen.absent && typeof aftermath.renderParticipantConvalescence === 'function') {
          // Suivi sans sujet : seul l'archivage d'un ancien suivi est proposé
          const hasArchivable = incidents.some(row => row.participantId === chosen.id && row.status === 'open');
          if (hasArchivable) {
            const actionsBox = node('section', 'campaign-detail-actions-box');
            actionsBox.append(node('h4', '', 'Archivage du suivi'));
            actionsBox.append(aftermath.renderParticipantConvalescence(chosen.id, participants));
            detail.append(actionsBox);
          }
        }

        detail.append(node('p', 'campaign-help', chosen.absent
          ? 'Un suivi en consultation ne reçoit ni soin ni Test.'
          : (chosen.off ? 'Les soins et décisions appliqués ici mettent à jour le registre et les PV du personnage suivi, hors rencontre.'
            : 'Les soins et décisions appliqués ici mettent à jour le registre et les PV de la partie.')));
      }
      layout.append(detail);
      page.append(layout);

      // Section d'ensemble des opérations de convalescence
      if (typeof aftermath.renderGlobalConvalescence === 'function') {
        const globalSection = node('section', 'campaign-global-section');
        const globalDetails = node('details');
        globalDetails.className = 'campaign-global-details';
        globalDetails.open = globalDetailsOpen;
        globalDetails.addEventListener('toggle', () => {
          globalDetailsOpen = globalDetails.open;
        });
        globalDetails.append(
          node('summary', '', 'Toutes les opérations de convalescence (groupe, calendrier, pertes)'),
          aftermath.renderGlobalConvalescence(participants)
        );
        globalSection.append(globalDetails);
        page.append(globalSection);
      }

      // Contexte et rappels de règles
      const note = node('section', 'campaign-context');
      note.append(
        label('TEMPS ET SUIVIS'),
        node('h3', '', 'Un temps de campagne partagé'),
        node('p', '', 'L’avance du temps de campagne peut entraîner des échéances de convalescence. Les échéances liées à un Tour réel restent distinctes.')
      );
      if (absentIds.length) {
        note.append(node('p', 'campaign-notice', `${countText(absentIds.length, 'suivi est', 'suivis sont')} en consultation seule (scène suspendue ou ancien suivi). Aucun rapprochement automatique avec un autre personnage n’est effectué.`));
      }
      page.append(note);
    } catch (error) {
      const message = node('div', 'campaign-error');
      message.setAttribute('role', 'alert');
      message.append(
        node('h3', '', 'Campagne indisponible'),
        node('p', '', 'Les données de campagne ne peuvent pas être lues pour le moment. Réessayez après avoir vérifié la partie.')
      );
      page.append(message);
    }

    root.replaceChildren(page);

    // Restauration soignée du focus
    let nextFocus = focusKey ? root.querySelector(`[data-campaign-focus="${focusKey}"]`) : null;
    if (focusFilter) nextFocus = [...root.querySelectorAll('[data-campaign-filter]')].find(el => el.dataset.campaignFilter === focusFilter) || nextFocus;
    if (focusPerson) nextFocus = [...root.querySelectorAll('[data-campaign-person]')].find(el => el.dataset.campaignPerson === focusPerson) || nextFocus;
    if (focusTask !== undefined) nextFocus = [...root.querySelectorAll('[data-campaign-task]')].find(el => el.dataset.campaignTask === focusTask) || nextFocus;
    if (focusName) {
      let scopeRoot = root;
      if (focusScope === 'detail') scopeRoot = root.querySelector('.campaign-detail') || root;
      else if (focusScope === 'global') scopeRoot = root.querySelector('.campaign-global-section') || root;
      else if (focusScope === 'clock') scopeRoot = root.querySelector('.campaign-clock') || root;
      const inScope = scopeRoot.querySelector(`[name="${focusName}"]`);
      const inRoot = root.querySelector(`[name="${focusName}"]`);
      nextFocus = inScope || inRoot || nextFocus;
    }
    nextFocus?.focus({ preventScroll: true });
  }

  function destroy() {
    disposed = true;
    root.replaceChildren();
  }

  render();
  return { render, destroy };
}
