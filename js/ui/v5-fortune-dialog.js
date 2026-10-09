/** Explicit MJ initialization/correction of the durable character Fortune balance. */
import { userMessage, userError } from './messages.js';
const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };

export function openV5FortuneDialog({ participantName, fortune, submit, getCurrentRevision } = {}) {
  if (!fortune || typeof submit !== 'function') throw new TypeError('Compteur de Fortune requis');
  return new Promise(resolve => {
    const opener = document.activeElement, dialog = el('dialog', null, 'tool-sheet v5-effect-dialog'), form = el('form');
    const heading = el('h2', 'Fortune — ' + participantName); heading.id = 'v5-fortune-title'; dialog.setAttribute('aria-labelledby', heading.id);
    const summary = el('p', fortune.balance === null ? 'Le solde courant doit être initialisé.' : 'Solde courant : ' + fortune.balance + '.');
    const hint = el('p', 'Ce solde est conservé entre les rencontres. Une annulation restaure aussi la Fortune.', 'workspace-muted');
    const sourceLabel = el('label', 'Initialiser depuis'), source = el('select'); source.setAttribute('aria-label', 'Initialiser Fortune depuis');
    source.append(new Option('Saisie MJ', 'mj'));
    if (fortune.balance === null && fortune.sourceBalance !== null) source.append(new Option('Solde courant connu de la fiche (' + fortune.sourceBalance + ')', 'fiche'));
    sourceLabel.append(source); sourceLabel.hidden = fortune.balance !== null || fortune.sourceBalance === null;
    const amountLabel = el('label', 'Points de Fortune disponibles'), amount = el('input'); amount.type = 'number'; amount.step = '1'; amount.min = '0'; amount.required = true; amount.inputMode = 'numeric'; amount.setAttribute('aria-label', 'Points de Fortune disponibles'); amount.value = fortune.balance ?? ''; amountLabel.append(amount);
    const error = el('p', '', 'v5-effect-error'); error.setAttribute('role', 'alert'); error.hidden = true;
    const controls = el('div', null, 'row'), confirm = el('button', fortune.balance === null ? 'Initialiser Fortune' : 'Enregistrer Fortune'), cancel = el('button', 'Annuler', 'ghost'); confirm.type = 'submit'; cancel.type = 'button'; controls.append(confirm, cancel);
    form.append(heading, summary, sourceLabel, amountLabel, hint, error, controls); dialog.append(form); document.body.append(dialog);
    let outcome = null, busy = false;
    source.addEventListener('change', () => { amount.readOnly = source.value === 'fiche'; amount.value = source.value === 'fiche' ? fortune.sourceBalance : ''; });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      try {
        const value = Number(amount.value);
        if (amount.value.trim() === '' || !Number.isSafeInteger(value) || value < 0) throw userError('Saisissez un solde entier positif ou nul.');
        if (typeof getCurrentRevision === 'function' && getCurrentRevision() !== fortune.baseRevision) throw userError('La partie a changé. Fermez cette fenêtre et relisez la Fortune.');
        busy = true; confirm.disabled = true; cancel.disabled = true;
        const result = await submit(value, { source: source.value, baseRevision: fortune.baseRevision });
        if (result === false || result?.ok === false) throw result?.error || userError('La Fortune n’a pas été enregistrée.');
        outcome = result; dialog.close();
      } catch (cause) { busy = false; confirm.disabled = false; cancel.disabled = false; error.textContent = userMessage(cause, 'La Fortune n’a pas été enregistrée : vérifiez le solde.'); error.hidden = false; }
    });
    cancel.addEventListener('click', () => dialog.close()); dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); resolve(outcome); }, { once: true });
    dialog.showModal(); amount.focus();
  });
}
