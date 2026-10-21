/** Explicit MJ initialization/correction of the durable character Fortune balance. */
import { userMessage, userError } from './messages.js';
const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };

/** La boîte édite le solde permanent : le temporaire (couches d'effets) s'annonce mais ne s'enregistre jamais. */
export function fortuneDialogState(fortune) {
  const temporary = fortune.temporary > 0 ? ' (dont ' + fortune.temporary + ' temporaire' + (fortune.temporary > 1 ? 's' : '') + ')' : '';
  return { amount: fortune.permanent ?? '', summary: fortune.balance === null ? 'Le solde courant doit être initialisé.' : 'Solde courant : ' + fortune.balance + temporary + '.' };
}

export function openV5FortuneDialog({ participantName, fortune, submit, getCurrentRevision } = {}) {
  if (!fortune || typeof submit !== 'function') throw new TypeError('Compteur de Fortune requis');
  return new Promise(resolve => {
    const opener = document.activeElement, dialog = el('dialog', null, 'tool-sheet v5-effect-dialog'), form = el('form');
    // La feuille commune est dockée ; ce formulaire modal doit rester entièrement dans le viewport.
    Object.assign(dialog.style,{inset:'0',margin:'auto',transform:'none',width:'min(640px, calc(100vw - 32px))',maxWidth:'calc(100vw - 32px)',maxHeight:'calc(100dvh - 32px)',overflow:'auto',display:'block'});
    const heading = el('h2', 'Fortune — ' + participantName); heading.id = 'v5-fortune-title'; dialog.setAttribute('aria-labelledby', heading.id);
    const state = fortuneDialogState(fortune), summary = el('p', state.summary);
    const operationLabel=el('label','Opération'),operation=el('select');operation.setAttribute('aria-label','Opération de Chance');operation.append(new Option('Corriger le solde','correction'));if(fortune.permanent!==null)operation.append(new Option('Renouvellement normal','refresh'));operationLabel.append(operation);const reasonLabel=el('label','Motif du renouvellement'),reason=el('input');reason.setAttribute('aria-label','Motif du renouvellement');reasonLabel.append(reason);reasonLabel.hidden=true;
    if(fortune.refreshLimit===1)summary.append(' Courroux : le prochain renouvellement normal donnera 1 point permanent (L06 p.219).');
    operation.addEventListener('change',()=>{reasonLabel.hidden=operation.value!=='refresh';amountLabel.firstChild.textContent=operation.value==='refresh'?'Pool normal de Chance à renouveler':'Points de Fortune disponibles';amount.value='';});
    const hint = el('p', 'Ce solde est conservé entre les rencontres. Une annulation restaure aussi la Fortune.', 'workspace-muted');
    const sourceLabel = el('label', 'Initialiser depuis'), source = el('select'); source.setAttribute('aria-label', 'Initialiser Fortune depuis');
    source.append(new Option('Saisie MJ', 'mj'));
    if (fortune.balance === null && fortune.sourceBalance !== null) source.append(new Option('Solde courant connu de la fiche (' + fortune.sourceBalance + ')', 'fiche'));
    sourceLabel.append(source); sourceLabel.hidden = fortune.balance !== null || fortune.sourceBalance === null;
    const amountLabel = el('label', fortune.temporary > 0 ? 'Points de Fortune disponibles (permanents)' : 'Points de Fortune disponibles'), amount = el('input'); amount.type = 'number'; amount.step = '1'; amount.min = '0'; amount.required = true; amount.inputMode = 'numeric'; amount.setAttribute('aria-label', 'Points de Fortune disponibles'); amount.value = state.amount; amountLabel.append(amount);
    const error = el('p', '', 'v5-effect-error'); error.setAttribute('role', 'alert'); error.hidden = true;
    const controls = el('div', null, 'row'), confirm = el('button', fortune.balance === null ? 'Initialiser Fortune' : 'Enregistrer Fortune'), cancel = el('button', 'Annuler', 'ghost'); confirm.type = 'submit'; cancel.type = 'button'; controls.append(confirm, cancel);
    form.append(heading, summary, operationLabel, sourceLabel, amountLabel, reasonLabel, hint, error, controls); dialog.append(form); document.body.append(dialog);
    let outcome = null, busy = false;
    source.addEventListener('change', () => { amount.readOnly = source.value === 'fiche'; amount.value = source.value === 'fiche' ? fortune.sourceBalance : ''; });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      try {
        const value = Number(amount.value);
        if (amount.value.trim() === '' || !Number.isSafeInteger(value) || value < 0) throw userError('Saisissez un solde entier positif ou nul.');
        if (typeof getCurrentRevision === 'function' && getCurrentRevision() !== fortune.baseRevision) throw userError('La partie a changé. Fermez cette fenêtre et relisez la Fortune.');
        busy = true; confirm.disabled = true; cancel.disabled = true;
        const result = await submit(value, { source: source.value, baseRevision: fortune.baseRevision, operation:operation.value, reason:reason.value });
        if (result === false || result?.ok === false) throw result?.error || userError('La Fortune n’a pas été enregistrée.');
        outcome = result; dialog.close();
      } catch (cause) { busy = false; confirm.disabled = false; cancel.disabled = false; error.textContent = userMessage(cause, 'La Fortune n’a pas été enregistrée : vérifiez le solde.'); error.hidden = false; }
    });
    cancel.addEventListener('click', () => dialog.close()); dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); resolve(outcome); }, { once: true });
    dialog.showModal(); amount.focus();
  });
}
