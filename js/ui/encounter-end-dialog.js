// Fenêtre « Garder ou archiver » (CAMP-10, CA8 à CA10) : à la fin du combat ou au retrait d'un participant, le MJ
// choisit les participants à suivi ouvert qui deviennent des personnages suivis ; les autres suivis sont archivés.
// Fenêtre de l'outil, jamais une boîte native du navigateur.
const el = (tag, text = null, className = '') => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};

/**
 * `candidates` : résultat de `Store.previewEncounterEnd()`. Rend `{ keepIds }`, ou `null` si le MJ annule.
 * `removal` : libellés du retrait d'un seul participant.
 */
export function openEncounterEndDialog({ candidates = [], removal = false } = {}) {
  return new Promise(resolve => {
    const opener = document.activeElement;
    const dialog = el('dialog', null, 'tool-sheet encounter-end-dialog');
    Object.assign(dialog.style, { inset: '0', margin: 'auto', transform: 'none', width: 'min(560px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 32px)', overflow: 'auto', display: 'block' });
    const form = el('form');
    form.append(el('h2', removal ? 'Retirer ce combattant : garder son suivi ?' : 'Terminer le combat : garder ou archiver'),
      el('p', 'Ces participants ont un suivi ouvert (blessure, maladie ou séquelle). Cochez ceux à garder : chacun devient un personnage suivi, soignable depuis Campagne. Les suivis des autres sont archivés.', 'workspace-muted'));
    const list = el('div', null, 'encounter-end-list');
    const boxes = candidates.map(candidate => {
      const label = el('label', null, 'encounter-end-choice');
      const box = el('input'); box.type = 'checkbox'; box.name = 'keep'; box.value = candidate.participantId;
      const suffix = `${candidate.count} suivi${candidate.count > 1 ? 's' : ''} ouvert${candidate.count > 1 ? 's' : ''}${candidate.dead ? ' · mort' : ''}${candidate.conflict ? ' · fiche déjà portée par deux personnages suivis' : ''}`;
      label.append(box, document.createTextNode(` Garder « ${candidate.label || candidate.name} » (${suffix})`));
      list.append(label);
      return box;
    });
    const controls = el('div', null, 'row');
    const confirm = el('button', removal ? 'Retirer du combat' : 'Terminer le combat'); confirm.type = 'submit';
    const cancel = el('button', 'Annuler', 'ghost'); cancel.type = 'button';
    controls.append(confirm, cancel);
    form.append(list, controls);
    dialog.append(form);
    document.body.append(dialog);
    let outcome = null;
    form.addEventListener('submit', event => { event.preventDefault(); outcome = { keepIds: boxes.filter(box => box.checked).map(box => box.value) }; dialog.close(); });
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); resolve(outcome); }, { once: true });
    dialog.showModal();
    (boxes[0] || confirm).focus();
  });
}

/** Retrait d'un participant avec la même règle que la fin du combat (CA10). Rend `false` si le MJ annule. */
export async function removeParticipantWithChoice(Store, id) {
  const candidates = typeof Store.previewEncounterEnd === 'function' ? Store.previewEncounterEnd({ participantIds: [id] }) : [];
  let keep = false;
  if (candidates.length) {
    const choice = await openEncounterEndDialog({ candidates, removal: true });
    if (!choice) return false;
    keep = choice.keepIds.includes(id);
  }
  await Store.removeParticipant(id, { keep });
  return true;
}

/** Confirmation de l'outil (CA39) : rend `true` si le MJ confirme. */
export function confirmInTool({ title, text, confirmLabel = 'Confirmer' } = {}) {
  return new Promise(resolve => {
    const opener = document.activeElement;
    const dialog = el('dialog', null, 'tool-sheet encounter-end-dialog');
    Object.assign(dialog.style, { inset: '0', margin: 'auto', transform: 'none', width: 'min(480px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)', display: 'block' });
    const controls = el('div', null, 'row');
    const confirm = el('button', confirmLabel, 'danger'); confirm.type = 'button';
    const cancel = el('button', 'Annuler', 'ghost'); cancel.type = 'button';
    controls.append(confirm, cancel);
    dialog.append(el('h2', title), el('p', text), controls);
    document.body.append(dialog);
    let outcome = false;
    confirm.addEventListener('click', () => { outcome = true; dialog.close(); });
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); resolve(outcome); }, { once: true });
    dialog.showModal();
    cancel.focus();
  });
}
