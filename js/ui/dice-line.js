import { DOM, escapeHtml } from './dom.js';
import { d100, isDouble, SL, getReverseRoll, getLocationName, getCritEffect } from '../core/dice.js';
import { parseState } from '../core/sanitize.js';
import { computeDamage } from '../core/damage.js';

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
  inDamage.type = 'number';
  inDamage.value = dl.damage !== undefined && dl.damage !== null ? dl.damage : '';
  inDamage.placeholder = "Dég.";
  inDamage.title = "Dégâts de base de l'arme";
  inDamage.style.width = '50px';
  inDamage.addEventListener('input', (e) => Store.updateDiceLine(dl.id, { damage: Number(e.target.value) || 0 }, true));
  inDamage.addEventListener('click', (e) => e.stopPropagation());

  // 4. Cible (Select des participants actifs hors soi-même)
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

  // 5. Bascule Inoffensive (Inof.)
  const isInoffensive = Array.isArray(dl.qualities) && dl.qualities.some(q => q && q.id === 'inoffensive');
  const btnInof = document.createElement('button');
  btnInof.type = 'button';
  btnInof.className = `btn-inoffensive ${isInoffensive ? 'active' : ''}`;
  btnInof.textContent = "Inof.";
  btnInof.title = "Arme inoffensive (PA cibles ×2, plancher de dégâts = 0)";
  btnInof.addEventListener('click', (e) => {
    e.stopPropagation();
    const hasInof = Array.isArray(dl.qualities) && dl.qualities.some(q => q && q.id === 'inoffensive');
    const newQualities = hasInof
      ? dl.qualities.filter(q => q && q.id !== 'inoffensive')
      : [...(dl.qualities || []), { id: 'inoffensive' }];
    Store.updateDiceLine(dl.id, { qualities: newQualities });
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

  row.append(inValue, inNote, inDamage, selTarget, btnInof, btnRoll, btnDel);
  return row;
}

export function runDiceLine(id, Store) {
  const diceLines = Store.getDiceLines();
  const combat = Store.getCombat();

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

  const targetParticipant = dl.targetId ? combat.participants.get(dl.targetId) : null;
  const isAcharnement = success && targetParticipant && targetParticipant.hp <= 0;

  let crit = dbl ? (success ? 'Critique' : 'Maladresse') : null;
  if (isAcharnement && !crit) {
    crit = 'Critique';
  }

  let extraInfo = "";
  let critInfo = "";
  let damageInfoNode = null;

  if (success) {
    const revRoll = getReverseRoll(roll);
    const loc = getLocationName(revRoll);
    extraInfo += ` | Touche : ${loc.name} (${revRoll})`;

    if (isAcharnement) {
      extraInfo += ` | Acharnement (cible à 0 PV)`;
    }

    if (crit === 'Critique') {
      const critLocRoll = d100();
      const critLoc = getLocationName(critLocRoll);
      const critEffectRollBase = d100();
      // Gravité majorée de +10 si cible à 0 PV ou moins (§7.5)
      const critEffectRoll = isAcharnement ? Math.min(100, critEffectRollBase + 10) : critEffectRollBase;
      const effectData = getCritEffect(critLoc.key, critEffectRoll);
      critInfo = `<div style="width:100%; margin-top:4px; font-size:0.9em; border-top:1px dashed #5a1d1d; padding-top:4px;"><strong>⚠️ CRITIQUE !</strong> (Loc: ${critLocRoll} ${critLoc.name} / Effet: ${critEffectRoll}${isAcharnement ? ' [+10 Acharnement]' : ''})<br><span style="color:#b33a3a;">${effectData ? effectData.name : 'Inconnu'}</span> : ${effectData ? effectData.eff : ''}</div>`;
    }

    // Calcul des Dégâts (§7.3, §7.4)
    if (targetParticipant && (dl.damage || dl.damage === 0)) {
      const targetBE = Math.floor((targetParticipant.caracs?.E || 0) / 10);
      const armObj = targetParticipant.armor || {};
      let targetPA = 0;
      if (loc.key === 'HEAD') targetPA = armObj.head || 0;
      else if (loc.key === 'ARM') targetPA = armObj.arms || 0;
      else if (loc.key === 'BODY') targetPA = armObj.body || 0;
      else if (loc.key === 'LEG') targetPA = armObj.legs || 0;

      const dmgRes = computeDamage({
        weaponDamage: dl.damage,
        sl,
        targetToughnessBonus: targetBE,
        targetArmour: targetPA,
        qualities: dl.qualities
      });

      const dmgNode = document.createElement('div');
      dmgNode.style.width = '100%';
      dmgNode.style.marginTop = '6px';
      dmgNode.style.fontSize = '0.9em';
      dmgNode.style.background = 'rgba(0,0,0,0.04)';
      dmgNode.style.padding = '4px 8px';
      dmgNode.style.borderRadius = '4px';
      dmgNode.style.display = 'flex';
      dmgNode.style.alignItems = 'center';
      dmgNode.style.justifyContent = 'space-between';
      dmgNode.style.flexWrap = 'wrap';
      dmgNode.style.gap = '6px';

      const paStr = dmgRes.isInoffensive ? `PA ${dmgRes.targetArmour}×2` : `PA ${dmgRes.targetArmour}`;
      const slStr = dmgRes.sl >= 0 ? `+ DR ${dmgRes.sl}` : `− DR ${Math.abs(dmgRes.sl)}`;
      let calcStr = `Dégâts ${dmgRes.weaponDamage} ${slStr} − (BE ${dmgRes.be} + ${paStr}) = ${dmgRes.net}`;
      if (dmgRes.isPlancher) {
        calcStr += ` → ${PLANCHER_TOUCHE} minimum`;
      } else if (dmgRes.isInoffensive) {
        calcStr += ` Inoffensive`;
      }

      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<strong>💥 ${calcStr}</strong>`;

      const btnApply = document.createElement('button');
      btnApply.type = 'button';
      btnApply.className = 'danger small';
      btnApply.style.padding = '2px 8px';
      btnApply.textContent = `Appliquer −${dmgRes.finalDamage} PV à ${targetParticipant.name}`;

      btnApply.addEventListener('click', () => {
        if (btnApply.disabled) return;
        const currentTarget = Store.getCombat().participants.get(targetParticipant.id);
        if (!currentTarget) return;

        const oldHp = currentTarget.hp;
        const newHp = oldHp - dmgRes.finalDamage;

        Store.updateParticipant(currentTarget.id, { hp: newHp });
        Store.log(`⚔️ ${currentTarget.name} : ${oldHp} → ${newHp} PV (−${dmgRes.finalDamage})`);

        // Passage à Terre (§7.5)
        if (newHp <= 0 && !currentTarget.states.some(s => parseState(s).name === 'À Terre')) {
          Store.updateParticipant(currentTarget.id, { states: [...currentTarget.states, 'À Terre'] });
          Store.log(`💀 ${currentTarget.name} → À Terre (PV à 0)`);
        }

        btnApply.disabled = true;
        btnApply.style.opacity = '0.5';
        btnApply.textContent = 'Appliqué';
      });

      dmgNode.append(textSpan, btnApply);
      damageInfoNode = dmgNode;
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
  if (damageInfoNode) {
    res.appendChild(damageInfoNode);
  }

  DOM.combat.results.prepend(res);
  Store.log(`🎲 ${p?.name} (Roll ${roll} vs ${target}${statePenalty ? ` base ${base}-${statePenalty}` : ''}) SL${sl} ${dl.note ? '[' + dl.note + ']' : ''}`);
}
