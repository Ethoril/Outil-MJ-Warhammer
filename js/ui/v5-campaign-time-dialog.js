/** Explicit elapsed game time, captured against the current saved state. */
import {getWrathMorningAdvanceSummary,authorizeWrathMorningAdvance} from '../core/v5-divine-store.js';
import { campaignDurationSeconds } from '../core/v5-game-time.js';
import { userMessage, userError } from './messages.js';

const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const clockOf = Store => JSON.parse(Store.getFullJSON()).extensions.v5.gameClock;

function timeText(seconds) {
  const parts = [];
  for (const [factor, label] of [[86400, 'j'], [3600, 'h'], [60, 'min'], [1, 's']]) {
    const count = Math.floor(seconds / factor);
    if (count) parts.push(`${count} ${label}`);
    seconds %= factor;
  }
  return parts.join(' ') || '0 s';
}

export function openCampaignTimeDialog({ Store, returnFocus } = {}) {
  if (!Store?.advanceCampaignTime) throw new TypeError('Avance de campagne indisponible.');
  const baseRevision = Store.getLocalRevision();
  const clock = clockOf(Store),savedState=JSON.parse(Store.getFullJSON());
  return new Promise(resolve => {
    const opener = returnFocus || document.activeElement;
    const dialog = node('dialog', null, 'tool-sheet v5-effect-dialog campaign-time-dialog');
    const form = node('form'); form.noValidate = true;
    const heading = node('h2', 'Temps de campagne'); heading.id = 'campaign-time-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    const current = node('p', `Temps de jeu suivi : ${timeText(clock.campaignSeconds)}.`);
    const amountLabel = node('label', 'Durée écoulée', 'campaign-time-field');
    const amount = node('input'); amount.type = 'number'; amount.min = '0'; amount.step = 'any'; amount.required = true;
    amount.inputMode = 'decimal'; amount.setAttribute('aria-label', 'Durée écoulée'); amountLabel.append(amount);
    const unitLabel = node('label', 'Unité de durée', 'campaign-time-field');
    const unit = node('select'); unit.setAttribute('aria-label', 'Unité de durée');
    for (const [value, text] of [['seconds', 'secondes'], ['minutes', 'minutes'], ['hours', 'heures'], ['days', 'jours']]) {
      const option = node('option', text); option.value = value; unit.append(option);
    }
    unit.value = 'minutes'; unitLabel.append(unit);
    const durationRow = node('div', null, 'campaign-time-duration'); durationRow.append(amountLabel, unitLabel);
    const reasonLabel = node('label', 'Motif MJ', 'campaign-time-field');
    const reason = node('textarea'); reason.required = true; reason.rows = 2; reason.maxLength = 500;
    reason.setAttribute('aria-label', 'Motif MJ'); reasonLabel.append(reason);
    const preview = node('p', 'Précisez la durée à avancer.', 'workspace-muted'); preview.setAttribute('aria-live', 'polite');
    const scope = node('p', 'Les durées de sorts, d’incidents, de talents et de Forme bestiale suivent le temps écoulé. Pour les sorts en Rounds, la convention de table est de 10 secondes par Round. Les échéances de Tour des prières attendent un Tour réel.', 'workspace-muted');
    const error = node('p', '', 'v5-effect-error'); error.setAttribute('role', 'alert'); error.hidden = true;
    const mornings=node('div',null,'campaign-time-mornings'),morningText=node('p','', 'workspace-muted'),morningLabel=node('label','Traiter tous les matins franchis'),morningConfirm=node('input');morningConfirm.type='checkbox';morningConfirm.setAttribute('aria-label','Traiter tous les matins franchis');morningLabel.prepend(morningConfirm);mornings.append(morningText,morningLabel);mornings.hidden=true;
    const controls = node('div', null, 'row');
    const confirm = node('button', 'Avancer le temps'); confirm.type = 'submit';
    const cancel = node('button', 'Annuler', 'ghost'); cancel.type = 'button'; controls.append(confirm, cancel);
    form.append(heading, current, durationRow, reasonLabel, preview, scope, mornings, error, controls);
    dialog.append(form); document.body.append(dialog);
    let busy = false, outcome = null;
    const elapsedSeconds = () => {
      if (!amount.value.trim()) throw userError('Saisissez une durée positive, exprimable en secondes entières.');
      try { return campaignDurationSeconds(Number(amount.value), unit.value); }
      catch { throw userError('Saisissez une durée positive, exprimable en secondes entières.'); }
    };
    const updatePreview = () => {
      try {
        const seconds = elapsedSeconds();
        if (!Number.isSafeInteger(clock.campaignSeconds + seconds)) throw new TypeError('Durée trop grande.');
        preview.textContent = `Après confirmation : ${timeText(clock.campaignSeconds + seconds)} (ajout de ${timeText(seconds)}).`;const summary=getWrathMorningAdvanceSummary(savedState,{seconds});mornings.hidden=!summary.subjects.length;morningLabel.hidden=!summary.requiresConfirmation;morningText.textContent=summary.subjects.map(row=>row.name+' : '+row.count+' matin(s), '+row.quantity+' Hémorragique par matin.').join(' ');
      } catch { preview.textContent = 'Précisez une durée positive, exprimable en secondes entières.'; }
    };
    amount.addEventListener('input',()=>{morningConfirm.checked=false;updatePreview();});unit.addEventListener('change',()=>{morningConfirm.checked=false;updatePreview();});
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      try {
        const seconds = elapsedSeconds();
        if (!reason.value.trim()) throw userError('Précisez le motif de cette avance de temps.');
        if (Store.getLocalRevision() !== baseRevision || clockOf(Store).revision !== clock.revision) {
          throw userError('La partie a changé. Fermez cette fenêtre puis rouvrez-la pour vérifier le temps à avancer.');
        }
        busy = true; confirm.disabled = true; cancel.disabled = true; error.hidden = true;
        const command={seconds,reason:reason.value.trim(),clockBaseRevision:clock.revision},summary=getWrathMorningAdvanceSummary(savedState,{seconds});if(summary.requiresConfirmation){if(!morningConfirm.checked)throw userError('Confirmez explicitement le traitement de tous les matins franchis.');command.eventId='clock-v1:'+clock.revision+':morning:'+crypto.randomUUID();authorizeWrathMorningAdvance(savedState,{...command,confirmedAll:true});}
        const result = await Store.advanceCampaignTime(command, { baseRevision });
        if (result === false || result?.ok === false) {
          const details = (result?.needsInput || []).map(item => [item.path, item.label || item.reason || item.message || item.field].filter(Boolean).join(' : ')).filter(Boolean);
          const fallback = ['stale', 'conflict'].includes(result?.status)
            ? 'La partie a changé. Fermez cette fenêtre puis rouvrez-la.'
            : 'Le temps n’a pas été avancé. Vérifiez les durées à préciser.';
          throw userError(details.length ? details.join('\n') : userMessage(result?.error, fallback));
        }
        outcome = result; dialog.close();
      } catch (cause) {
        busy = false; confirm.disabled = false; cancel.disabled = false;
        error.textContent = userMessage(cause, 'Le temps n’a pas été avancé : vérifiez la durée et le motif.'); error.hidden = false;
      }
    });
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (opener?.isConnected && opener.checkVisibility()) opener.focus();
      resolve(outcome);
    }, { once: true });
    dialog.showModal(); amount.focus();
  });
}
