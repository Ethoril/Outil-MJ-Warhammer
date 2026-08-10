import { DOM, escapeHtml } from './dom.js';
import { d100, isDouble, SL, getReverseRoll, getLocationName, getCritEffect } from '../core/dice.js';
import { parseState } from '../core/sanitize.js';

export function renderMiniDiceLine(dl, p, Store) {
  const row = document.createElement('div');
  row.className = 'mini-dice-line';
  row.dataset.diceId = dl.id;

  const inValue = document.createElement('input');
  inValue.type = 'number';
  inValue.value = dl.base || '';
  inValue.placeholder = "Score";
  inValue.title = "Compétence Totale";
  inValue.style.width = '60px';
  inValue.addEventListener('input', (e) => Store.updateDiceLine(dl.id, { base: e.target.value }, true));
  inValue.addEventListener('click', (e) => e.stopPropagation());

  const inNote = document.createElement('input');
  inNote.type = 'text';
  inNote.value = dl.note || '';
  inNote.placeholder = "Note (ex: Épée)";
  inNote.className = 'note-input';
  inNote.title = dl.note || "Note";
  inNote.addEventListener('input', (e) => { Store.updateDiceLine(dl.id, { note: e.target.value }, true); e.target.title = e.target.value; });
  inNote.addEventListener('click', (e) => e.stopPropagation());

  const btnRoll = document.createElement('button');
  btnRoll.textContent = '🎲';
  btnRoll.className = 'action-btn btn-roll';
  btnRoll.title = "Lancer";

  const btnDel = document.createElement('button');
  btnDel.textContent = '×';
  btnDel.className = 'action-btn danger btn-del-dice';
  btnDel.title = "Supprimer ligne";

  row.append(inValue, inNote, btnRoll, btnDel);
  return row;
}

export function runDiceLine(id, Store) {
  const st = Store.getState ? Store.getState() : { diceLines: Store.getDiceLines(), combat: Store.getCombat() };
  const diceLines = Store.getDiceLines ? Store.getDiceLines() : st.diceLines;
  const combat = Store.getCombat ? Store.getCombat() : st.combat;

  const dl = diceLines.find(x => x.id === id);
  if (!dl) return;
  const p = combat.participants.get(dl.participantId);

  const base = parseInt(dl.base) || 0;
  const stateNames = p ? new Set(p.states.map(s => parseState(s).name)) : new Set();
  const penaltyLabels = [];
  if (stateNames.has('Sonné'))   penaltyLabels.push('Sonné');
  if (stateNames.has('Aveuglé')) penaltyLabels.push('Aveuglé');
  if (stateNames.has('Exténué')) penaltyLabels.push('Exténué');
  if (stateNames.has('Brisé'))   penaltyLabels.push('Brisé');
  const statePenalty = penaltyLabels.length * 10;
  const target = Math.max(0, base - statePenalty);

  const roll = d100();
  const success = roll <= target;
  const sl = SL(target, roll);
  const dbl = isDouble(roll);
  const crit = dbl ? (success ? 'Critique' : 'Maladresse') : null;

  let extraInfo = "";
  let critInfo = "";

  if (success) {
    const revRoll = getReverseRoll(roll);
    const loc = getLocationName(revRoll);
    extraInfo += ` | Touche : ${loc.name} (${revRoll})`;

    if (crit === 'Critique') {
      const critLocRoll = d100();
      const critLoc = getLocationName(critLocRoll);
      const critEffectRoll = d100();
      const effectData = getCritEffect(critLoc.key, critEffectRoll);
      critInfo = `<div style="width:100%; margin-top:4px; font-size:0.9em; border-top:1px dashed #5a1d1d; padding-top:4px;"><strong>⚠️ CRITIQUE !</strong> (Loc: ${critLocRoll} ${critLoc.name} / Effet: ${critEffectRoll})<br><span style="color:#b33a3a;">${effectData ? effectData.name : 'Inconnu'}</span> : ${effectData ? effectData.eff : ''}</div>`;
    }
  }

  const res = document.createElement('div');
  res.className = 'dice-result';

  let resHTML = `<span class="dice-rollvalue">1d100 = ${roll}</span>`;
  resHTML += `<span class="${success ? 'result-good' : 'result-bad'}">${success ? 'Réussite' : 'Échec'}</span>`;
  resHTML += `<span class="${sl >= 0 ? 'result-good' : 'result-bad'}">SL ${sl >= 0 ? '+' : ''}${sl}</span>`;
  resHTML += `<span class="badge">${escapeHtml(p?.name || '?')}</span>`;

  if (dl.note) resHTML += `<span class="badge warn">${escapeHtml(dl.note)}</span>`;
  resHTML += `<span class="badge" title="Base ${base}">Score ${target}</span>`;
  if (statePenalty) resHTML += `<span class="badge" style="background:#fdd;color:#8a0707;">−${statePenalty} (${penaltyLabels.join(', ')})</span>`;
  if (crit) resHTML += `<span class="badge ${success ? 'good' : 'bad'}">${crit}</span>`;
  if (extraInfo) resHTML += `<span class="badge" style="background:#e3f6fd; color:#333;">${extraInfo}</span>`;
  if (critInfo) resHTML += critInfo;

  res.innerHTML = resHTML;
  DOM.combat.results.prepend(res);
  Store.log(`🎲 ${p?.name} (Roll ${roll} vs ${target}${statePenalty ? ` base ${base}-${statePenalty}` : ''}) SL${sl} ${dl.note ? '[' + dl.note + ']' : ''}`);
}
