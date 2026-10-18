import { inferActionType, describeResolutionDetail } from '../core/resolution.js';
import { showToast } from './toast.js';
import { DOM } from './dom.js';
import { d100 } from '../core/dice.js';
import { normalizeDamageFields } from '../core/damage.js';
import { createQualityPicker } from './action-editor.js';

export function renderMiniDiceLine(dl, p, Store) {
  const row = document.createElement('div');
  row.className = 'mini-dice-line';
  row.dataset.diceId = dl.id;

  // 1. Score
  const inValue = document.createElement('input');
  inValue.type = 'number';
  inValue.value = dl.base || '';
  inValue.placeholder = "Score";
  inValue.title = "Compétence Totale";
  inValue.style.width = '60px';
  inValue.addEventListener('input', (e) => Store.updateDiceLine(dl.id, { base: e.target.value }, true));
  inValue.addEventListener('click', (e) => e.stopPropagation());

  // 2. Note
  const inNote = document.createElement('input');
  inNote.type = 'text';
  inNote.value = dl.note || '';
  inNote.placeholder = "Note (ex: Épée)";
  inNote.className = 'note-input';
  inNote.title = dl.note || "Note";
  inNote.addEventListener('input', (e) => { Store.updateDiceLine(dl.id, { note: e.target.value }, true); e.target.title = e.target.value; });
  inNote.addEventListener('click', (e) => e.stopPropagation());

  // 3. Dégâts (Dég.)
  const inDamage = document.createElement('input');
  inDamage.type = 'text';
  inDamage.value = dl.damageFormula || (dl.damage !== undefined && dl.damage !== null ? dl.damage : '');
  inDamage.placeholder = "Dég.";
  inDamage.title = 'Dégâts : nombre (4) ou formule (BF+4)';
  inDamage.style.width = '50px';
  inDamage.addEventListener('input', (e) => {
    const { damage, damageFormula } = normalizeDamageFields({ damage: e.target.value });
    // `damageFormula: null` only to clear a stored formula: numeric lines keep their shape.
    const stored = Store.getDiceLines().find(line => line.id === dl.id);
    Store.updateDiceLine(dl.id, damageFormula || stored?.damageFormula ? { damage, damageFormula } : { damage }, true);
  });
  inDamage.addEventListener('click', (e) => e.stopPropagation());

  const inValuesX = document.createElement('input');
  inValuesX.type = 'number'; inValuesX.className = 'values-x-input'; inValuesX.value = dl.valuesX ?? '';
  inValuesX.placeholder = 'X'; inValuesX.title = 'Valeur X'; inValuesX.style.width = '42px';
  inValuesX.addEventListener('change', (e) => Store.updateDiceLine(dl.id, { valuesX: e.target.value || null }, true));
  inValuesX.addEventListener('click', (e) => e.stopPropagation());

  const inCapacity = document.createElement('input');
  inCapacity.type = 'number'; inCapacity.className = 'capacity-input'; inCapacity.value = dl.capacity ?? '';
  inCapacity.placeholder = 'Cap.'; inCapacity.title = 'Capacité / munitions'; inCapacity.style.width = '48px';
  inCapacity.addEventListener('change', (e) => Store.updateDiceLine(dl.id, { capacity: e.target.value || null }, true));
  inCapacity.addEventListener('click', (e) => e.stopPropagation());

  // 4. Cible
  const selTarget = document.createElement('select');
  selTarget.className = 'target-select';
  selTarget.title = "Cible visée";
  
  const optDefault = document.createElement('option');
  optDefault.value = "";
  optDefault.textContent = "Cible...";
  selTarget.appendChild(optDefault);

  const activeOthers = Store.listParticipants().filter(x => x.zone === 'active' && x.id !== (p ? p.id : ''));
  activeOthers.forEach(targetPart => {
    const opt = document.createElement('option');
    opt.value = targetPart.id;
    opt.textContent = targetPart.name;
    if (dl.targetId === targetPart.id) opt.selected = true;
    selTarget.appendChild(opt);
  });

  selTarget.addEventListener('change', (e) => {
    Store.updateDiceLine(dl.id, { targetId: e.target.value || null });
  });
  selTarget.addEventListener('click', (e) => e.stopPropagation());

  // 5. Sélecteur partagé de mots-clés (§13.7)
  const kwContainer = document.createElement('div');
  createQualityPicker({
    container: kwContainer,
    qualities: dl.qualities,
    onChange: qualities => Store.updateDiceLine(dl.id, { qualities })
  });

  // 6. Bouton Lancer
  const btnRoll = document.createElement('button');
  btnRoll.textContent = '🎲';
  btnRoll.className = 'action-btn btn-roll';
  btnRoll.title = "Lancer";

  // 7. Bouton Supprimer
  const btnDel = document.createElement('button');
  btnDel.textContent = '×';
  btnDel.className = 'action-btn danger btn-del-dice';
  btnDel.title = "Supprimer ligne";

  if (dl.extensions?.fiche?.equipmentId) {
    for (const input of [inValue, inNote, inDamage, inValuesX, inCapacity, btnDel, ...kwContainer.querySelectorAll('input,select,button')]) input.disabled = true;
  } else if (dl.extensions?.ficheSkill) inValue.readOnly = true;
  row.append(inValue, inNote, inDamage, inValuesX, inCapacity, selTarget, kwContainer, btnRoll, btnDel);
  return row;
}

/** Quick generic rolls share the V5 resolver used by the Jouer workspace. */
export function runDiceLine(id, Store) {
  const dl = Store.getDiceLines().find(line => line.id === id);
  if (!dl) return;
  if (inferActionType(dl) === 'attack') {
    showToast('Résolvez cette attaque dans Jouer pour choisir son contexte de protection.', 'info');
    return { status: 'requires-resolution' };
  }
  const actor = Store.getCombat().participants.get(dl.participantId);
  const target = dl.targetId ? Store.getCombat().participants.get(dl.targetId) : null;
  const initialRoll = d100();
  const preview = Store.previewResolution({ actor, target, action: dl, roll: initialRoll, v5: { kind: 'test' } });
  if (preview.choiceRequired || preview.unresolved?.length) {
    showToast('Ce test demande un choix ou un contexte : poursuivez dans Jouer.', 'info');
    return { status: 'requires-resolution', preview, initialRoll };
  }
  const result = document.createElement('div'); result.className = 'dice-result';
  const text = document.createElement('span');
  text.textContent = `${actor?.name || '—'} · d100 ${preview.roll} · ${preview.success ? 'Réussite' : 'Échec'} · DR ${preview.sl} · ${dl.note || 'Test'}`;
  const details = document.createElement('details');
  const summary = document.createElement('summary'); summary.textContent = 'Voir le calcul V5';
  const receipt = document.createElement('pre'); receipt.textContent = describeResolutionDetail(preview);
  details.append(summary, receipt); result.append(text, details);
  DOM.combat.results?.prepend(result);
  Store.log({ kind: 'roll', actorId: actor?.id, targetId: target?.id,
    text: text.textContent,
    detail: { ruleVersion: preview.ruleVersion, roll: preview.roll, targetScore: preview.score.target, sl: preview.sl, test: preview.test, action: dl }
  });
  return { status: 'rolled', preview };
}
