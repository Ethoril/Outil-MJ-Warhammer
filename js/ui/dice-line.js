import { DOM, escapeHtml } from './dom.js';
import { d100, isDouble, SL, getReverseRoll, getLocationName, getCritEffect } from '../core/dice.js';
import { parseState } from '../core/sanitize.js';
import { computeDamage } from '../core/damage.js';
import { applyTargetBonus, isCriticalRoll, isFumbleRoll } from '../core/roll-qualities.js';
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
  inDamage.type = 'number';
  inDamage.value = dl.damage !== undefined && dl.damage !== null ? dl.damage : '';
  inDamage.placeholder = "Dég.";
  inDamage.title = "Dégâts de base de l'arme";
  inDamage.style.width = '50px';
  inDamage.addEventListener('input', (e) => Store.updateDiceLine(dl.id, { damage: Number(e.target.value) || 0 }, true));
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

  row.append(inValue, inNote, inDamage, inValuesX, inCapacity, selTarget, kwContainer, btnRoll, btnDel);
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
  // Précise : bonus au score cible, appliqué après les malus d'états (§13.4, palier 1)
  const { target, bonus: qualityBonus } = applyTargetBonus(
    Math.max(0, base - statePenalty),
    dl.qualities
  );

  const roll = d100();
  const success = roll <= target;
  const sl = SL(target, roll);
  const dbl = isDouble(roll);

  const targetParticipant = dl.targetId ? combat.participants.get(dl.targetId) : null;
  const isAcharnement = success && targetParticipant && targetParticipant.hp <= 0;

  // Empaleuse élargit le critique aux multiples de 10 ; Dangereuse élargit la
  // maladresse à tout jet raté comportant un 9.
  const critRes = isCriticalRoll(roll, dbl, dl.qualities);
  const fumbleRes = isFumbleRoll(roll, dbl, dl.qualities);

  let crit = null;
  let critÉlargi = false;
  if (success && critRes.critique) { crit = 'Critique'; critÉlargi = critRes.élargi; }
  else if (!success && fumbleRes.maladresse) { crit = 'Maladresse'; critÉlargi = fumbleRes.élargi; }
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
      const critEffectRoll = isAcharnement ? Math.min(100, critEffectRollBase + 10) : critEffectRollBase;
      const effectData = getCritEffect(critLoc.key, critEffectRoll);
      critInfo = `<div style="width:100%; margin-top:4px; font-size:0.9em; border-top:1px dashed var(--border); padding-top:4px;"><strong>⚠️ CRITIQUE !</strong> (Loc: ${critLocRoll} ${critLoc.name} / Effet: ${critEffectRoll}${isAcharnement ? ' [+10 Acharnement]' : ''})<br><span style="color:var(--accent);">${effectData ? effectData.name : 'Inconnu'}</span> : ${effectData ? effectData.eff : ''}</div>`;
    }

    // Calcul des Dégâts avec Mots-clés (§13.4, §13.7)
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
        roll,
        targetToughnessBonus: targetBE,
        targetArmour: targetPA,
        qualities: dl.qualities
      });

      const dmgNode = document.createElement('div');
      dmgNode.style.cssText = 'width:100%; margin-top:6px; font-size:0.9em; background:rgba(0,0,0,0.04); padding:4px 8px; border-radius:4px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;';

      const paStr = dmgRes.isInoffensive ? `PA ${dmgRes.targetArmour}×2` : `PA ${dmgRes.targetArmour}`;
      const slStr = dmgRes.sl >= 0 ? `+ DR ${dmgRes.sl}` : `− DR ${Math.abs(dmgRes.sl)}`;
      const percutStr = dmgRes.bonusPercutante ? ` + Percutante(${dmgRes.bonusPercutante})` : '';

      let calcStr = `Dégâts ${dmgRes.weaponDamage}${percutStr} ${slStr} − (BE ${dmgRes.be} + ${paStr}) = ${dmgRes.net}`;
      if (dmgRes.isPlancher) {
        calcStr += ` → ${1} minimum`;
      } else if (dmgRes.isInoffensive) {
        calcStr += ` (Inoffensive)`;
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

        const knockedDown = newHp <= 0 && !currentTarget.states.some(s => parseState(s).name === 'À Terre');
        const damageText = `⚔️ ${currentTarget.name} : ${oldHp} → ${newHp} PV (−${dmgRes.finalDamage})`;
        const run = Store.executeCommand ? Store.executeCommand('apply-damage', draft => {
          const states = [...(currentTarget.states || [])];
          if (knockedDown) states.push({ name: 'À Terre', level: 1, duration: null, source: { kind: 'combat' } });
          return {
            ...draft,
            combat: {
              ...draft.combat,
              participants: (draft.combat?.participants || []).map(participant => participant.id === currentTarget.id
                ? { ...participant, hp: newHp, states }
                : participant)
            },
            log: [
              ...(knockedDown ? [{ kind: 'state', actorId: currentTarget.id, actorName: currentTarget.name, text: `💀 ${currentTarget.name} → À Terre (PV à 0)` }] : []),
              { kind: 'damage', actorId: p?.id || null, actorName: p?.name || null, targetId: currentTarget.id, targetName: currentTarget.name, text: damageText },
              ...(draft.log || [])
            ].slice(0, 300)
          };
        }) : (() => {
          Store.updateParticipant(currentTarget.id, { hp: newHp });
          Store.log({ kind: 'damage', actorId: p?.id, targetId: currentTarget.id, text: damageText });
          if (knockedDown) {
            Store.updateParticipant(currentTarget.id, { states: [...currentTarget.states, { name: 'À Terre', level: 1, duration: null, source: { kind: 'combat' } }] });
            Store.log({ kind: 'state', actorId: currentTarget.id, text: `💀 ${currentTarget.name} → À Terre (PV à 0)` });
          }
          return true;
        })();

        Promise.resolve(run).then(result => {
          if (result?.ok === false) throw result.error || new Error('Dégâts non sauvegardés');
          btnApply.disabled = true;
          btnApply.style.opacity = '0.5';
          btnApply.textContent = 'Appliqué';
        }).catch(error => {
          console.error('Application des dégâts refusée:', error);
          btnApply.disabled = false;
          btnApply.textContent = 'Réessayer';
        });
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
  
  // Affichage des mots-clés actifs sur le jet (§13.7)
  if (Array.isArray(dl.qualities) && dl.qualities.length > 0) {
    const kwBadges = dl.qualities.map(q => {
      const name = typeof q === 'string' ? q : (q.name || q.id);
      const r = q.rating ? ` ${q.rating}` : '';
      return `<span class="badge" style="background:var(--chip); color:var(--text);">${escapeHtml(name + r)}</span>`;
    }).join(' ');
    resHTML += kwBadges;
  }

  resHTML += `<span class="badge" title="Base ${base}">Score ${target}</span>`;
  if (qualityBonus) resHTML += `<span class="badge" style="background:var(--card-bg-green);">+${qualityBonus} (mots-clés)</span>`;
  if (statePenalty) resHTML += `<span class="badge" style="background:#fdd;color:#8a0707;">−${statePenalty} (${penaltyLabels.join(', ')})</span>`;
  if (crit) resHTML += `<span class="badge ${success ? 'good' : 'bad'}">${crit}${critÉlargi ? ' (mot-clé)' : ''}</span>`;
  if (extraInfo) resHTML += `<span class="badge" style="background:var(--card-bg-blue); color:var(--text);">${extraInfo}</span>`;
  if (critInfo) resHTML += critInfo;

  res.innerHTML = resHTML;
  if (damageInfoNode) {
    res.appendChild(damageInfoNode);
  }

  DOM.combat.results.prepend(res);
  Store.log({
    kind: 'roll',
    actorId: p?.id,
    targetId: dl.targetId,
    text: `🎲 ${p?.name} (Roll ${roll} vs ${target}${statePenalty ? ` base ${base}-${statePenalty}` : ''}) SL${sl} ${dl.note ? '[' + dl.note + ']' : ''}`,
    detail: { Jet: roll, Cible: target, SL: sl, MotsClés: (dl.qualities || []).map(q => typeof q === 'string' ? q : q.id).join(', ') }
  });
}
