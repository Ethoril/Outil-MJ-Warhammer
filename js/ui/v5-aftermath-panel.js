import { aftermathDate } from '../core/v5-aftermath.js';
import { uid } from '../core/models.js';

const node = (tag, text = '') => { const element = document.createElement(tag); if (text) element.textContent = text; return element; };
const control = (labelText, name, type = 'number', value = '') => {
  const label = node('label', labelText); const input = document.createElement('input');
  input.name = name; input.type = type; if (value !== '') input.value = value;
  if (type === 'number') { input.step = '1'; input.inputMode = 'numeric'; }
  label.appendChild(input); return { label, input };
};
const checkbox = (labelText, name) => {
  const label = node('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.name = name;
  label.append(input, document.createTextNode(` ${labelText}`)); return { label, input };
};
const selectControl = (labelText, name, options) => {
  const label = node('label', labelText); const select = document.createElement('select'); select.name = name;
  for (const [value, text] of options) { const option = node('option', text); option.value = value; select.appendChild(option); }
  label.appendChild(select); return { label, input: select };
};
const opId = () => `aftermath-${uid()}`;
const receiptText = receipt => receipt ? `${receipt.status === 'applied' ? 'Enregistré' : 'Refus'} · ${receipt.reason || 'opération traitée'}${receipt.fromDay != null ? ` · jour ${receipt.fromDay} → ${receipt.toDay}` : ''}` : '';

export function createV5AftermathPanel({ Store, refresh = () => {} } = {}) {
  if (!Store) throw new TypeError('Store requis pour le suivi des séquelles');
  let lastReceipt = null;
  const run = async (button, error, action) => {
    button.disabled = true; error.textContent = '';
    try { const result = await action(); lastReceipt = result?.receipt || null; if (result?.receipt?.status !== 'applied') error.textContent = receiptText(result?.receipt) || result?.reason || 'Commande refusée.'; refresh(); }
    catch (cause) { error.textContent = cause?.message || 'Commande impossible.'; button.disabled = false; }
  };
  return {
    render(participants = []) {
      let state;
      try { state = Store.getAftermathState(); } catch (cause) {
        const panel = node('section'); panel.className = 'workspace-card workspace-aftermath'; panel.setAttribute('aria-label', 'Suivi des séquelles');
        panel.append(node('h3', 'Suivi des séquelles'), node('p', `Registre indisponible : ${cause.message}`)); return panel;
      }
      const panel = node('section'); panel.className = 'workspace-card workspace-aftermath'; panel.setAttribute('aria-label', 'Suivi des séquelles et convalescence');
      panel.appendChild(node('h3', 'Séquelles et convalescence'));
      const date = aftermathDate(state);
      panel.appendChild(node('p', `Calendrier de convalescence · jour ${date.day} · jour ${date.dayInImperialWeek}/8 de la semaine impériale · origine ${state.calendar.originDay}. Cette horloge est indépendante du temps de magie.`));

      const advanceForm = node('form'); advanceForm.className = 'workspace-aftermath-advance';
      const days = control('Jours à avancer', 'days', 'number', '1'); days.input.min = '1';
      const preview = node('div'); preview.setAttribute('aria-live', 'polite');
      const advanceError = node('p'); advanceError.className = 'workspace-error';
      const previewButton = node('button', 'Aperçu des échéances'); previewButton.type = 'button';
      const confirm = node('button', 'Confirmer l’avancement'); confirm.type = 'button'; confirm.disabled = true;
      let pendingPreview = null; let checkInputs = [];
      previewButton.addEventListener('click', () => {
        preview.replaceChildren(); checkInputs = [];
        pendingPreview = Store.previewAftermathAdvance({ days: Number(days.input.value), expectedRevision: state.revision });
        confirm.disabled = pendingPreview.status !== 'ready';
        if (pendingPreview.status !== 'ready') { preview.appendChild(node('p', `Impossible : ${pendingPreview.reason}`)); return; }
        preview.appendChild(node('p', `Du jour ${pendingPreview.fromDay} au jour ${pendingPreview.toDay}. ${pendingPreview.requiredDailyChecks.length} Test(s) quotidien(s) de Résistance +2 à saisir.`));
        for (const requirement of pendingPreview.requiredDailyChecks) {
          const row = node('div'); row.className = 'workspace-aftermath-check';
          row.appendChild(node('span', `${requirement.participantId} · incident ${requirement.incidentId} · fin du jour ${requirement.day} · Résistance +2`));
          const passed = checkbox('Réussite', `success-${requirement.incidentId}-${requirement.day}`);
          const sl = control('DR', `sl-${requirement.incidentId}-${requirement.day}`, 'number', '0');
          row.append(passed.label, sl.label); preview.appendChild(row);
          checkInputs.push({ incidentId: requirement.incidentId, day: requirement.day, passed: passed.input, sl: sl.input });
        }
      });
      days.input.addEventListener('input', () => { pendingPreview = null; confirm.disabled = true; preview.replaceChildren(); });
      confirm.addEventListener('click', () => {
        advanceError.textContent = '';
        if (!pendingPreview || pendingPreview.status !== 'ready') { advanceError.textContent = 'Faites un aperçu avant de confirmer.'; return; }
        const dailyChecks = checkInputs.map(item => ({ incidentId: item.incidentId, day: item.day, success: item.passed.checked, sl: Number(item.sl.value) }));
        if (dailyChecks.some(check => check.success !== (check.sl >= 0))) { advanceError.textContent = 'Le résultat et les DR saisis ne concordent pas : réussite à 0 DR ou plus, échec sous 0 DR.'; return; }
        void run(confirm, advanceError, () => Store.advanceAftermathCalendar({ operationId: opId(), expectedRevision: state.revision, days: pendingPreview.days, dailyChecks }));
      });
      advanceForm.append(days.label, previewButton, preview, confirm, advanceError);
      panel.appendChild(advanceForm);

      const add = node('details'); add.className = 'workspace-aftermath-register';
      const addSummary = node('summary', 'Enregistrer un incident de blessure'); add.appendChild(addSummary);
      const patient = selectControl('Personnage ou animal', 'participantId', [['', 'Choisir…'], ...participants.map(row => [row.id, `${row.name || row.id} (${row.id})`])]);
      const kind = selectControl('Type de sujet', 'subjectKind', [['person', 'Personnage'], ['animal', 'Animal']]);
      const bandaged = checkbox('Blessure déjà bandée ou traitée', 'bandaged');
      const surgery = checkbox('Le critique exige une chirurgie', 'requiresSurgery');
      const addError = node('p'); addError.className = 'workspace-error';
      const addButton = node('button', 'Créer l’incident'); addButton.type = 'button';
      addButton.addEventListener('click', () => {
        if (!patient.input.value) { addError.textContent = 'Choisissez un sujet.'; return; }
        void run(addButton, addError, () => Store.registerAftermathIncident({ id: opId(), operationId: opId(), participantId: patient.input.value, subjectKind: kind.input.value, bandaged: bandaged.input.checked, requiresSurgery: surgery.input.checked }));
      });
      add.append(patient.label, kind.label, bandaged.label, surgery.label, addButton, addError); panel.appendChild(add);

      const list = node('div'); list.className = 'workspace-aftermath-incidents';
      if (!state.incidents.length) list.appendChild(node('p', 'Aucun incident enregistré.'));
      for (const incident of state.incidents) {
        const card = node('article'); card.className = 'card workspace-aftermath-incident';
        const subject = participants.find(row => row.id === incident.participantId);
        card.appendChild(node('h4', `${subject?.name || incident.participantId} · blessure du jour ${incident.injuryDay} · ${incident.status === 'open' ? 'en suivi' : 'clôturé'}`));
        card.appendChild(node('p', `Incident ${incident.id} · ${incident.subjectKind === 'animal' ? 'animal' : 'personne'} · ${incident.bandaged ? 'bandé' : 'non bandé'} · ${incident.infection ? 'infection active' : 'pas d’infection'} · chirurgie ${incident.requiresSurgery ? (incident.surgeryCompleted ? 'terminée' : 'requise') : 'non requise'}`));
        card.appendChild(node('p', `Soins utilisés : ${incident.treatments.map(item => `${item.kind} (jour ${item.day})`).join(', ') || 'aucun'} · Tests quotidiens : ${incident.dailyChecks.length}`));
        if (incident.status === 'open') {
          const treatment = node('details'); treatment.appendChild(node('summary', incident.subjectKind === 'animal' ? 'Soins aux animaux' : 'Guérison'));
          const bi = control('Bonus d’Intelligence du soignant', 'intelligenceBonus', 'number', '0'); bi.input.min = '0';
          const sl = control('DR du Test de soin', 'testSL', 'number', '0');
          const diff = control('Difficulté (DR)', 'difficultySL', 'number', '0');
          const supplies = checkbox('Fournitures médicales disponibles', 'supplies'); supplies.input.checked = true;
          const fumble = checkbox('Maladresse', 'fumble'); const d10 = control('Résultat de 1d10', 'd10', 'number', '1'); d10.input.min='1'; d10.input.max='10';
          const treatError = node('p'); treatError.className = 'workspace-error'; const treat = node('button', 'Enregistrer le Test de soin'); treat.type = 'button';
          treat.addEventListener('click', () => void run(treat, treatError, () => Store.treatAftermathWound({ operationId: opId(), incidentId: incident.id, participantId: incident.participantId, skill: incident.subjectKind === 'animal' ? 'animal-care' : 'heal', intelligenceBonus: Number(bi.input.value), supplies: supplies.input.checked, testSL: Number(sl.input.value), difficultySL: Number(diff.input.value), fumble: fumble.input.checked, d10: fumble.input.checked ? Number(d10.input.value) : null, inCombat: false })));
          treatment.append(bi.label, sl.label, diff.label, supplies.label, fumble.label, d10.label, treat, treatError); card.appendChild(treatment);
          if (incident.infection) {
            const infection = node('details'); infection.appendChild(node('summary', 'Traiter l’infection'));
            const infectionSL = control('DR du Test de Guérison -1', 'infectionSL', 'number', '0');
            const remedy = checkbox('Remède adapté disponible', 'remedy');
            const infectionError = node('p'); infectionError.className = 'workspace-error'; const heal = node('button', 'Enregistrer le traitement'); heal.type = 'button';
            heal.addEventListener('click', () => void run(heal, infectionError, () => Store.treatAftermathInfection({ operationId: opId(), incidentId: incident.id, testSL: Number(infectionSL.input.value), difficultySL: -1, remedy: remedy.input.checked })));
            infection.append(infectionSL.label, remedy.label, heal, infectionError); card.appendChild(infection);
          }
          if (incident.requiresSurgery && !incident.surgeryCompleted) {
            const surgeryDetails = node('details'); surgeryDetails.appendChild(node('summary', 'Opérer la blessure critique'));
            const talent = checkbox('Le soignant possède Chirurgie', 'talent'); const surgerySL = control('DR du Test de Guérison +0', 'surgerySL', 'number', '0');
            const surgeryError = node('p'); surgeryError.className = 'workspace-error'; const operate = node('button', 'Enregistrer le Test de chirurgie'); operate.type = 'button';
            operate.addEventListener('click', () => void run(operate, surgeryError, () => Store.treatAftermathSurgicalIncident({ operationId: opId(), incidentId: incident.id, hasSurgeryTalent: talent.input.checked, difficultySL: 0, testSL: Number(surgerySL.input.value) })));
            surgeryDetails.append(talent.label, surgerySL.label, operate, surgeryError); card.appendChild(surgeryDetails);
          }
        }
        list.appendChild(card);
      }
      panel.appendChild(list);
      if (lastReceipt) panel.appendChild(node('p', receiptText(lastReceipt)));
      return panel;
    }
  };
}
