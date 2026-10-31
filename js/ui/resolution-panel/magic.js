import { node, rubric, outcomePill, signed } from './dom.js';
import { getSpellContract, getAllSpellContracts, getContractChoiceOptions } from '../../core/v5-spell-contracts.js';
import { getChannellingReserve } from '../../core/v5-magic-channelling.js';
import { renderMagicControls, renderSpellRecipientControls } from '../v5-magic-controls.js';
import { renderSpellOptions } from '../v5-spell-options.js';
import { ARCANE_ARMOR_LOCATIONS } from '../../core/v5-magic-arcane-unforgiving.js';
import { DURATION_UNIT_LABELS, parseSpellDuration } from '../../core/v5-magic-effects.js';
export function missingMagicDice(preview) {
  if (!preview) return false;
  return [preview.missing, preview.spellPreview?.missing, preview.castPreview?.missing, preview.castPreview?.miscast?.missingSecondaryDice, preview.miscast?.missingSecondaryDice]
    .some(list => Array.isArray(list) && list.length > 0);
}

/** Sort proposé par défaut : le premier du lanceur, sinon Carreau. */
export function defaultMagicSpellId(draft, actor) {
  if (draft.magicSpellId) return draft.magicSpellId;
  const first = (actor.spells || [])[0];
  const contract = first && (getSpellContract(first.id) || getSpellContract(first.name || first.nom || first));
  const allContracts = getAllSpellContracts();
  return (first && (contract?.id || first.id || first.name || first.nom)) || allContracts.find(c => c.name === 'Carreau')?.id || allContracts[0]?.id || '';
}

/** Cibles du sort : celles cochées, sinon la cible par défaut du contrat (un brouillon vide vaut « par défaut »). */
export function magicTargetIdsOf(draft, contract, actor, target, participants) {
  if (Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length) return draft.magicTargetIds;
  const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
  const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
  if(contract?.effects?.excludeCaster)return [(target&&target.id!==actor.id?target:participants.find(p=>p.id!==actor.id&&p.zone==='active'))?.id].filter(Boolean);
  if (isSelfSpell) return [actor.id];
  if (contract?.effects?.special === 'monstrous-regiment') {
    const firstAlly = participants.find(p => p.id !== actor.id && p.camp === actor.camp);
    return firstAlly ? [firstAlly.id] : [];
  }
  if (isAllyOnlySpell) return target && (target.id === actor.id || target.camp === actor.camp) ? [target.id] : [actor.id];
  return target ? [target.id] : [actor.id];
}

export function renderV5MagicContext({ actor, participants = [], target, type, draft, handlers }) {
  const v5 = node('div', 'workspace-v5-context workspace-v5-magic');
  const reserve = getChannellingReserve(actor);
  const reserveLabel = reserve.type === 'high' ? 'Haute Magie (Qhaysh)' : reserve.type === 'winds' ? '8 Vents' : 'aucune';
  const reserveLine = node('p', 'workspace-result-line workspace-magic-reserve', `Réserve de Focalisation : ${reserve.sl} DR (${reserveLabel})`);
  reserveLine.dataset.magicReserve = String(reserve.sl);
  reserveLine.dataset.magicReserveType = reserve.type || 'none';
  v5.appendChild(reserveLine);

  const selectField = (key, labelText, options, currentVal) => {
    const label = node('label', 'workspace-type', labelText);
    const select = document.createElement('select');
    select.setAttribute('aria-label', labelText);
    select.dataset.focusKey = key;
    for (const [val, txt] of options) select.appendChild(new Option(txt, val));
    select.value = currentVal;
    select.addEventListener('change', () => handlers.select({ [key]: select.value }));
    label.appendChild(select);
    v5.appendChild(label);
    return select;
  };

  const numberField = (key, labelText, value, min = null, max = null) => {
    const label = node('label', 'workspace-type', labelText);
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    if (min !== null) input.min = String(min);
    if (max !== null) input.max = String(max);
    input.value = value ?? '';
    input.setAttribute('aria-label', labelText);
    input.dataset.focusKey = key;
    input.addEventListener('input', () => handlers.input(key, input.value === '' ? null : Number(input.value)));
    label.appendChild(input);
    v5.appendChild(label);
    return input;
  };

  const magicTargetIds = type === 'cast' ? magicTargetIdsOf(draft, getSpellContract(defaultMagicSpellId(draft, actor)), actor, target, participants) : [];
  v5.appendChild(renderMagicControls({actor,participants,type,draft,handlers,targetIds:magicTargetIds}));
  if (type === 'dispel') return v5;
  if (type === 'channelling') {
    v5.prepend(rubric('Focalisation V5'));
    selectField('magicChannelMode', 'Mode de Focalisation', [
      ['channel', 'Accumuler (Focalisation +0 DR)'],
      ['pause', 'Pause de focalisation (Focalisation Accessible +2 DR)'],
      ['interruption', 'Test d’interruption (Calme Difficile −2 DR)']
    ], draft.magicChannelMode || 'channel');
    selectField('magicChannelType', 'Type de Focalisation', [
      ['winds', 'Les 8 Vents (Focalisation)'],
      ['high', 'Haute Magie (Qhaysh)']
    ], draft.magicChannelType || 'winds');
    selectField('magicLore', 'Vent ou Domaine déclaré', [
      ['fire', 'Aqshy (Feu)'],
      ['heavens', 'Azyr (Cieux)'],
      ['metal', 'Chamon (Métal)'],
      ['beasts', 'Ghur (Bêtes)'],
      ['life', 'Ghyran (Vie)'],
      ['light', 'Hysh (Lumière)'],
      ['death', 'Shyish (Mort)'],
      ['shadow', 'Ulgu (Ombres)'],
      ['high', 'Qhaysh (Haute Magie)'],
      ['arcane', 'Magie Arcanique']
    ], draft.magicLore || 'fire');
    numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? 0);
    if(draft.preview?.fumble || draft.preview?.miscast || draft.magicMiscastRoll!=null || draft.magicFumbleLossRoll!=null){
    numberField('magicFumbleLossRoll', 'Perte de réserve si maladresse (1d10)', draft.magicFumbleLossRoll ?? '', 1, 10);
    numberField('magicMiscastRoll', 'Jet d’incident si maladresse (1d100)', draft.magicMiscastRoll ?? '', 1, 100);
    numberField('magicMajorRoll', 'Jet Majeur d’incident si cascade (1d100)', draft.magicMajorRoll ?? '', 1, 100);
    numberField('magicSecondaryDurationRoll', 'Dé secondaire : Durée / États (1d10 ou 2d10)', draft.magicSecondaryDurationRoll ?? '', 1, 20);
    numberField('magicSecondaryDamageRoll', 'Dé secondaire : Dégâts (1d10)', draft.magicSecondaryDamageRoll ?? '', 1, 10);
    numberField('magicSecondaryDistanceRoll', 'Dé secondaire : Distance (1d10 ou 1d100)', draft.magicSecondaryDistanceRoll ?? '', 1, 100);
    selectField('magicSecondaryLocation', 'Membre gelé (incident)', [['', '— Membre gelé (si incident) —'], ['Bras principal', 'Bras principal'], ['Bras secondaire', 'Bras secondaire'], ['Jambe gauche', 'Jambe gauche'], ['Jambe droite', 'Jambe droite']], draft.magicSecondaryLocation || '');
    }
  } else if (type === 'cast') {
    v5.prepend(rubric('Incantation & Contrat de sort V5'));
    const allContracts = getAllSpellContracts();
    const actorSpells = (actor.spells || []).map(s => {
      const c = getSpellContract(s.id) || getSpellContract(s.name || s.nom || s);
      return { id: c?.id || s.id || s.name || s.nom, label: `${c?.name || s.name || s.nom} (NI ${c?.cn ?? s.cn ?? 0})` };
    });
    const defaultSpellId = defaultMagicSpellId(draft, actor);
    const spellLabel = node('label', 'workspace-type', 'Sort à lancer');
    const spellSelect = document.createElement('select');
    spellSelect.setAttribute('aria-label', 'Sort à lancer');
    spellSelect.dataset.focusKey = 'magic-spell';
    if (actorSpells.length) {
      const grpActor = document.createElement('optgroup');
      grpActor.label = `Sorts de ${actor.name}`;
      actorSpells.forEach(s => grpActor.appendChild(new Option(s.label, s.id)));
      spellSelect.appendChild(grpActor);
    }
    const grpAll = document.createElement('optgroup');
    grpAll.label = 'Contrats de sorts V5';
    allContracts.forEach(c => grpAll.appendChild(new Option(`${c.name} · NI ${c.cn} (${c.domain})`, c.id)));
    spellSelect.appendChild(grpAll);
    spellSelect.value = defaultSpellId;
    spellSelect.addEventListener('change', () => handlers.select({ magicSpellId: spellSelect.value }));
    spellLabel.appendChild(spellSelect);
    v5.appendChild(spellLabel);

    const contract = getSpellContract(defaultSpellId);
    const recipientControls = contract && renderSpellRecipientControls({ actor, participants, contract, draft, handlers, targetIds: magicTargetIds, target });
    if (recipientControls) v5.appendChild(recipientControls);
    if (contract) {
      const summary = node('p', 'workspace-muted workspace-magic-contract-summary',
        `${contract.name} (${contract.canonicalName || contract.domain}) · NI ${contract.cn} · Portée : ${contract.range} · Cible : ${contract.target} · Durée : ${contract.duration}`);
      summary.dataset.magicContractSummary = contract.id;
      v5.appendChild(summary);
    }

    const choiceOptions = contract ? getContractChoiceOptions(contract) : [];
    if (choiceOptions.length > 0) {
      const mjChoiceSelect = selectField(
        'magicMjChoice',
        'Choix d’effet du sort',
        [['', '— Choisir une option —'], ...choiceOptions.map(opt => [opt, opt])],
        draft.magicMjChoice || ''
      );
      mjChoiceSelect.dataset.focusKey = 'magic-mj-choice';
      mjChoiceSelect.dataset.action = 'set-magic-mj-choice';
    }

    numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? 0);
    selectField('magicCriticalChoice', 'Effet critique d’incantation', [
      ['', 'Aucun / Non applicable'],
      ['critical-wound', 'Blessure Critique'],
      ['total-power', 'Puissance totale (+dizaines DR)'],
      ['unstoppable-force', 'Force irrésistible (non dissipable)']
    ], draft.magicCriticalChoice || '');
    if(Number(draft.attackRoll)%11===0 && Number(draft.attackRoll)>0 || Number(draft.attackRoll)===100 || draft.preview?.castPreview?.miscast || draft.magicMiscastRoll!=null)numberField('magicMiscastRoll', 'Jet d’incident si double / maladresse (1d100)', draft.magicMiscastRoll ?? '', 1, 100);

    // Options propres au sort (une seule rubrique, uniquement pour le sort concerné) ; la surpuissance générique reste dans le bloc suivant.
    const specificBox = node('div', 'workspace-v5-context');
    specificBox.append(...renderSpellOptions({ actor, participants, contract, draft, handlers, targetIds: magicTargetIds }));
    const isVortexSpell = contract?.isVortex || contract?.effects?.type === 'vortex';
    const movementOnly=contract?.effects?.vortexMovementOnly === true;
    const isArcane = contract?.effects?.special === 'arcane-unforgiving';
    const addCheck = (box, key, lbl, checked = Boolean(draft[key]), onChange = value => handlers.select({ [key]: value })) => {
      const wrap = node('label', 'workspace-type workspace-recipient-check');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = checked;
      chk.setAttribute('aria-label', lbl);
      chk.dataset.focusKey = key;
      chk.addEventListener('change', () => onChange(chk.checked));
      wrap.append(chk, ` ${lbl}`);
      box.appendChild(wrap);
    };
    const addNum = (box, key, lbl, min = 0, max = 100) => {
      const wrap = node('label', 'workspace-type', lbl);
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = String(min);
      inp.max = String(max);
      inp.step = '1';
      inp.value = draft[key] ?? '';
      inp.setAttribute('aria-label', lbl);
      inp.dataset.focusKey = key;
      inp.addEventListener('input', () => handlers.input(key, inp.value === '' ? null : Number(inp.value)));
      wrap.appendChild(inp);
      box.appendChild(wrap);
      return inp;
    };
    if(movementOnly){
      addNum(specificBox,'magicVortexDirectionRoll','Tempête : direction aléatoire d10 (sans Test de FM)',1,10);
      addNum(specificBox,'magicVortexDistance','Tempête : déplacement 2d10 mètres',2,20);
    }
    if (isVortexSpell && !movementOnly) {
      // Vortex aléatoire (Winds of Magic p. 20) : direction choisie + Test de Force Mentale Accessible (+2 DR) ; en cas d'échec, d10 de direction.
      const compassLabel = node('label', 'workspace-type', 'Vortex : direction choisie par le lanceur');
      const compassSelect = document.createElement('select');
      compassSelect.setAttribute('aria-label', 'Direction du Vortex choisie par le lanceur');
      compassSelect.dataset.focusKey = 'magicVortexDirection';
      for (const [val, txt] of [['', '— Direction —'], ['N', 'Nord'], ['NE', 'Nord-Est'], ['E', 'Est'], ['SE', 'Sud-Est'], ['S', 'Sud'], ['SW', 'Sud-Ouest'], ['W', 'Ouest'], ['NW', 'Nord-Ouest']]) compassSelect.appendChild(new Option(txt, val));
      compassSelect.value = draft.magicVortexDirection || '';
      compassSelect.addEventListener('change', () => handlers.select({ magicVortexDirection: compassSelect.value || null }));
      compassLabel.appendChild(compassSelect);
      specificBox.appendChild(compassLabel);
      const willLabel = node('label', 'workspace-type', 'Vortex : Test de Force Mentale Accessible (+2 DR)');
      const willSelect = document.createElement('select');
      willSelect.setAttribute('aria-label', 'Résultat du Test de Force Mentale du Vortex');
      willSelect.dataset.focusKey = 'magicVortexWillpower';
      for (const [val, txt] of [['', '— Résultat —'], ['success', 'Réussi : direction choisie'], ['failure', 'Raté : direction aléatoire (d10)']]) willSelect.appendChild(new Option(txt, val));
      willSelect.value = draft.magicVortexWillpower || '';
      willSelect.addEventListener('change', () => handlers.select({ magicVortexWillpower: willSelect.value || null }));
      willLabel.appendChild(willSelect);
      specificBox.appendChild(willLabel);
      addNum(specificBox, 'magicVortexDirectionRoll', 'Vortex : d10 de direction si Test raté (1 disparaît, 2 N, 3 NE, 4 E, 5 en place, 6 SE, 7 S, 8 SO, 9 O, 10 NO)', 1, 10);
      addNum(specificBox, 'magicVortexDistance', 'Distance du Vortex (2d10 m)', 2, 20);
    }
    if (isArcane) specificBox.appendChild(renderArcaneFields(draft, actor, target, participants, handlers));
    if (specificBox.childElementCount) {
      const specificDetails = node('details', 'workspace-v5-context-details');
      specificDetails.open = draft.magicOptionsOpen ?? true;
      const specificSummary = node('summary', '', `Options du sort : ${contract?.name || 'sort choisi'}`);
      specificSummary.addEventListener('click', () => handlers.input('magicOptionsOpen', !specificDetails.open));
      specificDetails.append(specificSummary, specificBox);
      v5.appendChild(specificDetails);
    }

    const overcastDetails = node('details', 'workspace-v5-context-details');
    if (
      draft.magicOvercastDamage != null ||
      draft.magicOvercastTargets != null ||
      draft.magicOvercastRange != null ||
      draft.magicOvercastDuration != null ||
      draft.magicOvercastAoe != null ||
      draft.magicDurationAmount != null ||
      draft.magicResistanceRoll != null ||
      draft.magicMajorRoll != null ||
      draft.magicSecondaryDurationRoll != null ||
      draft.magicSecondaryDamageRoll != null ||
      draft.magicSecondaryDistanceRoll != null ||
      draft.magicNoOtherTargets ||
      missingMagicDice(draft.preview)
    ) {
      overcastDetails.open = true;
    }
    overcastDetails.appendChild(node('summary', '', 'Surpuissance & Paramètres du sort'));
    const overcastBox = node('div', 'workspace-v5-context');
    const addOvercastNum = (key, lbl, min = 0, max = 100) => addNum(overcastBox, key, lbl, min, max);
    const overcastAllowed=contract?.overcast?.allowed!==false && !contract?.isPetty;
    const genericOptions=overcastAllowed ? contract?.overcast?.options || [] : [];
    if (!isArcane && genericOptions.includes('damage')) addOvercastNum('magicOvercastDamage', 'Surpuissance : Dégâts', 0, 18);
    if(genericOptions.includes('targets')) addOvercastNum('magicOvercastTargets', 'Surpuissance : Cibles', 0, 18);
    if(genericOptions.includes('range')) addOvercastNum('magicOvercastRange', 'Surpuissance : Portée', 0, 18);
    if (!isArcane && genericOptions.includes('duration')) addOvercastNum('magicOvercastDuration', 'Surpuissance : Durée', 0, 18);
    if (!isArcane && genericOptions.includes('aoe')) addOvercastNum('magicOvercastAoe', 'Surpuissance : Zone', 0, 18);
    if (!isArcane && genericOptions.includes('special')) addOvercastNum('magicOvercastSpecial', 'Surpuissance : Spécial (DR)', 0, 20);

    // Paramètres génériques : durée illisible (Spécial, dés, unités à choisir) = donnée MJ, transmise à l'application du sort.
    if (!isArcane) {
      if (!contract || parseSpellDuration(contract.duration, { caster: actor }).kind === 'unknown' || draft.magicDurationAmount != null) {
        addOvercastNum('magicDurationAmount', 'Durée de base, avant surpuissance (si le sort l’exige) : nombre', 1, 9999);
        const durationUnitLabel = node('label', 'workspace-type', 'Durée de base, avant surpuissance : unité');
        const durationUnit = document.createElement('select');
        durationUnit.setAttribute('aria-label', 'Unité de la durée saisie par le MJ');
        durationUnit.dataset.focusKey = 'magic-duration-unit';
        for (const [unit, label] of Object.entries(DURATION_UNIT_LABELS)) durationUnit.appendChild(new Option(label, unit));
        durationUnit.value = draft.magicDurationUnit || 'rounds';
        durationUnit.addEventListener('change', () => handlers.input('magicDurationUnit', durationUnit.value));
        durationUnitLabel.appendChild(durationUnit);
        overcastBox.appendChild(durationUnitLabel);
      }
      if(contract?.effects?.secondaryTest || contract?.effects?.mjInput?.resistanceTest){
      const resInp = addOvercastNum('magicResistanceRoll', 'Jet de résistance / test secondaire (Soc / End / Résistance, 1d100)', 1, 100);
      resInp.dataset.action = 'set-magic-resistance-roll';
      }
    }
    addCheck(overcastBox, 'magicUnmemorized', 'Sort lancé depuis un grimoire sans être mémorisé (surpuissance interdite)');
    if(missingMagicDice(draft.preview) || draft.preview?.castPreview?.miscast || draft.preview?.miscast){
    addOvercastNum('magicMajorRoll', 'Jet Majeur d’incident si cascade (1d100)', 1, 100);
    addOvercastNum('magicSecondaryDurationRoll', 'Dé secondaire : Durée / États (1d10 ou 2d10)', 1, 20);
    addOvercastNum('magicSecondaryDamageRoll', 'Dé secondaire : Dégâts / Perte (1d10)', 1, 10);
    addOvercastNum('magicSecondaryDistanceRoll', 'Dé secondaire : Distance (1d10 ou 1d100)', 1, 100);
    const limbLabel = node('label', 'workspace-type', 'Membre gelé (incident)');
    const limbSelect = document.createElement('select');
    limbSelect.setAttribute('aria-label', 'Membre gelé (incident)');
    limbSelect.dataset.focusKey = 'magicSecondaryLocation';
    for (const [val, txt] of [['', '— Membre gelé (si incident) —'], ['Bras principal', 'Bras principal'], ['Bras secondaire', 'Bras secondaire'], ['Jambe gauche', 'Jambe gauche'], ['Jambe droite', 'Jambe droite']]) limbSelect.appendChild(new Option(txt, val));
    limbSelect.value = draft.magicSecondaryLocation || '';
    limbSelect.addEventListener('change', () => handlers.select({ magicSecondaryLocation: limbSelect.value }));
    limbLabel.appendChild(limbSelect);
    overcastBox.appendChild(limbLabel);
    // Contre-réaction aéthyrique (Majeur 96+, Livre de base p. 239) : le lanceur n'est jamais sa propre cible.
    addCheck(overcastBox, 'magicNoOtherTargets', 'Aucune autre cible à portée (Contre-réaction 96+ : la tête du lanceur explose)');
    }
    overcastDetails.appendChild(overcastBox);
    v5.appendChild(overcastDetails);

    if (participants.length >= 1) {
      const multiBox = node('details', 'workspace-v5-context-details');
      multiBox.open = draft.magicTargetsOpen ?? Boolean(draft.magicTargetIds?.length > 1);
      const targetSummary=node('summary', '', `Cibles multiples (Contrat : ${contract?.target || '1'})`);
      targetSummary.addEventListener('click',()=>handlers.input('magicTargetsOpen',!multiBox.open));
      multiBox.appendChild(targetSummary);
      const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
      const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
      const isAllyExcludingCaster = contract?.effects?.special === 'monstrous-regiment';
      let defaultTargets;
      if(contract?.effects?.excludeCaster){defaultTargets=[(target&&target.id!==actor.id?target:participants.find(p=>p.id!==actor.id&&p.zone==='active'))?.id].filter(Boolean);}
      else if (isSelfSpell) {
        defaultTargets = [actor.id];
      } else if (isAllyExcludingCaster) {
        const firstAlly = participants.find(p => p.id !== actor.id && p.camp === actor.camp);
        defaultTargets = firstAlly ? [firstAlly.id] : [];
      } else if (isAllyOnlySpell) {
        const targetIsAlly = target && (target.id === actor.id || target.camp === actor.camp);
        defaultTargets = targetIsAlly ? [target.id] : [actor.id];
      } else {
        defaultTargets = target ? [target.id] : [actor.id];
      }
      const currentTargets = Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length
        ? draft.magicTargetIds
        : defaultTargets;
      for (const p of participants) {
        const lbl = node('label', 'workspace-type workspace-recipient-check');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = currentTargets.includes(p.id);
        chk.setAttribute('aria-label', `Cible du sort : ${p.name}`);
        chk.dataset.focusKey = `magic-target-${p.id}`;
        chk.addEventListener('change', () => {
          const next = chk.checked
            ? [...new Set([...currentTargets, p.id])]
            : currentTargets.filter(id => id !== p.id);
          handlers.select({ magicTargetIds: next });
        });
        lbl.append(chk, ` ${p.name}`);
        multiBox.appendChild(lbl);
      }
      v5.appendChild(multiBox);
    }
  }

  return v5;
}

export function renderArcaneFields(draft, actor, target, participants, handlers) {
  const box = node('fieldset', 'workspace-v5-choice-group workspace-arcane-options');
  box.appendChild(node('legend', '', 'Destruction des Arcanes'));
  const armorPoints = Number(draft.magicArcaneArmorPoints) || 0;
  const amountLabel = node('label', 'workspace-type', 'PA à détruire (1 DR chacun)');
  const amount = document.createElement('input');
  amount.type = 'number';
  amount.min = '0';
  amount.max = '20';
  amount.step = '1';
  amount.value = armorPoints;
  amount.dataset.focusKey = 'magic-arcane-armor-points';
  amount.addEventListener('input', () => {
    const points = amount.value === '' ? 0 : Number(amount.value);
    const targets = Object.fromEntries(Object.entries(draft.magicArcaneTargets || {}).map(([id, facts]) =>
      [id, { ...facts, armorDamageLocations: (facts.armorDamageLocations || []).slice(0, Math.max(0, points)) }]));
    handlers.select({ magicArcaneArmorPoints: points, magicArcaneTargets: targets });
  });
  amountLabel.appendChild(amount);
  box.appendChild(amountLabel);
  for (const [key, label] of [['magicArcaneEnhancedDamage', 'Dégâts : 1 par PA porté (+8 DR)'], ['magicArcaneChooseItem', 'Choisir l’objet magique (+3 DR, Test de Dextérité +2 DR)']]) {
    const wrap = node('label', 'workspace-type workspace-arcane-toggle');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(draft[key]);
    input.dataset.focusKey = key;
    input.addEventListener('change', () => handlers.select({ [key]: input.checked }));
    wrap.append(input, ` ${label}`);
    box.appendChild(wrap);
  }
  const cost = armorPoints + (draft.magicArcaneEnhancedDamage ? 8 : 0) + (draft.magicArcaneChooseItem ? 3 : 0);
  box.appendChild(node('p', 'workspace-muted', `Surpuissance à dépenser : ${cost} DR. Les tirages aléatoires sont renseignés par le MJ.`));
  const ids = draft.magicTargetIds?.length ? draft.magicTargetIds : [target?.id || actor.id];
  for (const person of participants.filter(p => ids.includes(p.id))) {
    const facts = draft.magicArcaneTargets?.[person.id] || {};
    const update = patch => handlers.select({ magicArcaneTargets: { ...draft.magicArcaneTargets, [person.id]: { ...facts, ...patch } } });
    box.appendChild(node('p', 'workspace-result-line', person.name));
    for (let index = 0; index < Math.min(20, armorPoints); index++) {
      const label = node('label', 'workspace-type', `PA ${index + 1} : localisation tirée au sort`);
      const select = document.createElement('select');
      select.dataset.focusKey = `magic-arcane-armor-${person.id}-${index}`;
      select.appendChild(new Option('Sélectionner le résultat', ''));
      for (const [id, name] of ARCANE_ARMOR_LOCATIONS) select.appendChild(new Option(name, id));
      select.value = facts.armorDamageLocations?.[index] || '';
      select.addEventListener('change', () => {
        const values = Array.from({ length: armorPoints }, (_, i) => facts.armorDamageLocations?.[i] || '');
        values[index] = select.value;
        update({ armorDamageLocations: values });
      });
      label.appendChild(select);
      box.appendChild(label);
    }
    const presentLabel = node('label', 'workspace-type', 'Objet magique porté');
    const present = document.createElement('select');
    present.dataset.focusKey = `magic-arcane-item-present-${person.id}`;
    [['', 'À préciser'], ['none', 'Aucun'], ['present', 'Présent']].forEach(([value, text]) => present.appendChild(new Option(text, value)));
    present.value = facts.magicItemPresent === true ? 'present' : facts.magicItemPresent === false ? 'none' : '';
    present.addEventListener('change', () => update({ magicItemPresent: present.value === 'present' ? true : present.value === 'none' ? false : null }));
    presentLabel.appendChild(present);
    box.appendChild(presentLabel);
    if (facts.magicItemPresent) {
      for (const [key, text, numeric] of [
        ['focalisationRoll', 'Test de Focalisation (Haute Magie), 1d100', true],
        ['randomMagicItem', 'Objet magique tiré au sort', false],
        ...(draft.magicArcaneChooseItem ? [['dexterityRoll', 'Test de Dextérité (+2 DR), 1d100', true], ['chosenMagicItem', 'Objet magique choisi', false]] : [])
      ]) {
        const label = node('label', 'workspace-type', text);
        const input = document.createElement('input');
        input.type = numeric ? 'number' : 'text';
        if (numeric) {
          input.min = '1';
          input.max = '100';
          input.step = '1';
        }
        input.value = facts[key] ?? '';
        input.dataset.focusKey = `magic-arcane-${key}-${person.id}`;
        input.addEventListener('input', () => update({ [key]: numeric ? (input.value === '' ? null : Number(input.value)) : input.value }));
        label.appendChild(input);
        box.appendChild(label);
      }
    }
  }
  return box;
}


/** Précision après un nombre de Blessures : réduction, Protection réussie ou immunité. */
/** Durée résolue de l'effet appliqué (après surpuissance), à défaut le texte du contrat. */
export function appliedDurationText(target, fallback) {
  const applied = target?.appliedSim?.appliedEffect;
  const plural = (amount, unit) => `${amount} ${unit}${amount > 1 ? 's' : ''}`;
  if (applied?.durationType === 'rounds' && Number.isFinite(applied.durationRounds)) return plural(applied.durationRounds, 'Round');
  if (applied?.durationType === 'minutes' && Number.isFinite(applied.durationMinutes)) return plural(applied.durationMinutes, 'minute');
  if (applied?.durationType === 'hours' && Number.isFinite(applied.durationHours)) return plural(applied.durationHours, 'heure');
  if (applied?.durationType === 'days' && Number.isFinite(applied.durationDays)) return plural(applied.durationDays, 'jour');
  return fallback;
}

export function protectionNote(protection) {
  if (!protection) return '';
  if (protection.immune) return ` (immunité${protection.immunity ? ' : ' + protection.immunity : ''})`;
  if (protection.wardSaved) return ` (Protection ${protection.ward}+ réussie${protection.wardRoll ? ', d10 ' + protection.wardRoll : ''} : dégâts annulés)`;
  if (protection.reduction) return ` (réduction de ${protection.reduction})`;
  return '';
}

export function renderV5MagicResult(preview, target, draft, handlers) {
  const result = node('div', 'workspace-result workspace-magic-result');
  const pills = node('div', 'workspace-result-pills');

  if(preview.error&&preview.v5MagicKind!=='dispel')result.appendChild(node('p','workspace-result-line',preview.error));
  if (preview.v5MagicKind === 'dispel') {
    const dispelReason=preview.reason||preview.error;
    result.appendChild(node('p', preview.allowed === false ? 'workspace-result-line workspace-field-error' : 'workspace-result-line', preview.allowed===false?`Dissipation impossible : ${dispelReason||'Conditions de dissipation non remplies.'}`:dispelReason?`Dissipation impossible : ${dispelReason}`:preview.summary||'Dissipation prête.'));
    if (preview.attemptFailed) result.appendChild(node('p', 'workspace-result-line workspace-field-error', 'Total négatif : la tentative est échouée ; cocher « Recommencer la tentative » pour repartir de zéro DR.'));
    return result;
  }
  if (preview.v5MagicKind === 'channelling') {
    pills.appendChild(outcomePill('Focalisation', preview.success, preview.sl));
    if (preview.critical) pills.appendChild(node('span', 'workspace-outcome is-success', 'Critique (+2 × BFM)'));
    if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse de Focalisation'));
    result.appendChild(pills);

    const rType = (preview.type || preview.reserveType) === 'high' ? 'Haute Magie' : '8 Vents';
    const prevSl = preview.currentReserve?.sl ?? preview.previousReserve?.sl ?? 0;
    const nextSl = preview.newReserve?.sl ?? 0;
    const gained = preview.gain ?? preview.gainedSl ?? 0;
    result.appendChild(node('p', 'workspace-result-line',
      `${preview.success ? 'Focalisation réussie' : 'Focalisation échouée'} · Réserve (${rType}) : ${prevSl} DR → ${nextSl} DR (gain ${signed(gained)})`));
    if (preview.typeChanged || preview.wipedPreviousReserve) {
      result.appendChild(node('p', 'workspace-result-line workspace-muted', 'Changement de type : la réserve précédente d’un autre type a été effacée avant le jet.'));
    }
    if (preview.skillWarning) result.appendChild(node('p','workspace-field-error',preview.skillWarning));
    if (preview.armorPenalty) {
      result.appendChild(node('p', 'workspace-result-line', `Pénalité d’armure portée : ${signed(preview.armorPenalty)} DR`));
    }
    if ((preview.actualLoss ?? preview.lostSl ?? 0) > 0) {
      const lost = preview.actualLoss ?? preview.lostSl ?? 0;
      result.appendChild(node('p', 'workspace-result-line workspace-field-error', `Perte de réserve : −${lost} DR (modificateur d’incident +${lost * 10})`));
    }
    if (preview.miscast) {
      result.appendChild(node('p', 'workspace-result-line workspace-critical-effect',
        `Incident magique (${preview.miscast.severity || preview.miscast.table || 'MINOR'}) : ${preview.miscast.name || preview.miscast.entry?.title || 'Incident'} — ${preview.miscast.effect || preview.miscast.entry?.effect || ''}`));
    }
    return result;
  }

  // Cast / Spell Execution
  const cast = preview.castPreview || {};
  const sp = preview.spellPreview || {};
  const contract = preview.contract || sp?.contract || {};
  const totalSl = cast.totalCastingSl ?? cast.totalSl ?? 0;
  const reserveUsed = cast.matchingReserve ?? cast.reserveConsumed ?? cast.reserveUsed ?? 0;
  // X-01 : une réaction de dissipation remplace le DR et le total du lanceur par ceux d'après l'opposition.
  const reaction = sp?.dispelReaction;
  // Réaction refusée ou incomplète : seul le motif s'affiche (une fois), sans total ni opposition calculés.
  if (reaction && !(reaction.ready && reaction.allowed)) {
    const reason = reaction.reason || reaction.summary || sp.error;
    if (reason && reason !== preview.error) result.appendChild(node('p', 'workspace-result-line workspace-field-error', reason));
    return result;
  }
  const castOk = reaction ? sp.spellSuccess === true : cast.spellSuccess;
  const finalTotal = reaction ? sp.castingPreview?.totalCastingSl ?? reaction.casterSlAfterDispel : totalSl;
  pills.appendChild(outcomePill('Test Langue (Magick)', cast.testSuccess, cast.testSl ?? 0));
  pills.appendChild(node('span', `workspace-outcome ${castOk ? 'is-success' : 'is-failure'}`,
    `${contract.name || 'Sort'} (NI ${contract.cn ?? 0}) : ${reaction?.dispelled ? 'Sort DISSIPÉ' : `${castOk ? 'Sort lancé ! Incantation réussie' : 'Échec d’incantation'} · Total ${finalTotal} DR`}`));
  if (cast.critical) pills.appendChild(node('span', 'workspace-outcome is-critical', `Critique d’incantation${cast.criticalChoice ? ` (${cast.criticalChoice})` : ''}`));
  if (cast.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse d’incantation'));
  result.appendChild(pills);

  result.appendChild(node('p', 'workspace-result-line',
    `Calcul d’incantation : ${signed(cast.testSl ?? 0)} DR (test) + ${reserveUsed} DR (réserve consommée) = ${totalSl} DR vs NI ${contract.cn ?? 0}`));

  if (reaction) {
    result.appendChild(node('p', 'workspace-result-line', `Opposition de dissipation : Test du lanceur ${signed(reaction.casterSl)} DR − dissipateur ${signed(reaction.dispellerSl)} DR = ${signed(reaction.netSl)} DR nets.`));
    result.appendChild(node('p', 'workspace-result-line', reaction.dispelled
      ? `Sort dissipé : DR net négatif ; la réserve (${reaction.reserveSl} DR) ne sauve pas le sort, aucun effet ni épuisement.`
      : `Le lanceur gagne l’opposition : ${signed(reaction.netSl)} DR nets + réserve ${reaction.reserveSl} DR = ${signed(reaction.casterSlAfterDispel)} DR restants contre NI ${contract.cn ?? 0}${castOk ? '.' : ' : NI non atteint, sort raté (réserve consommée).'}`));
  }
  if(sp?.burnout) result.appendChild(node('p','workspace-result-line',sp.burnout.summary));
  const miscast = cast.miscast || sp?.miscast;
  if (miscast) {
    result.appendChild(node('p', 'workspace-result-line workspace-critical-effect',
      `Incident magique (${miscast.severity || miscast.table || 'MINOR'}) : ${miscast.name || miscast.entry?.title || 'Incident'} — ${miscast.effect || miscast.entry?.effect || ''}`));
  }

  if ((sp?.fingerprintCheck && !sp.fingerprintCheck.valid) || sp?.valid === false || (cast.spellSuccess && sp?.ready === false)) {
    const errText = (sp?.fingerprintCheck && !sp.fingerprintCheck.valid)
      ? `Contrat obsolète ou modifié (${sp.fingerprintCheck?.reason || sp.reason || 'empreinte invalide'}) : l’automatisation est désactivée.`
      : (sp?.error || sp?.reason || 'Paramètres d’exécution du sort invalides ou incomplets.');
    const err = node('p', 'workspace-field-error', errText);
    err.setAttribute('role', 'alert');
    result.appendChild(err);
    for (const need of sp.needsInput || []) if (need.field?.startsWith('mountedRide')) {
      const [, riderId] = need.field.split(':');
      const field = need.field.startsWith('mountedRideScore') ? 'score' : 'roll';
      const answers = draft.magicMountedRideTests || {}, current = answers[riderId] || {};
      const label = node('label', 'workspace-type', need.label || `${riderId} · ${field === 'roll' ? 'd100' : 'score de Chevaucher'}`);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(need.min ?? (field === 'roll' ? 1 : 0));
      input.max = String(need.max ?? 100);
      input.value = current[field] == null ? '' : String(current[field]);
      input.addEventListener('change', () => {
        handlers.select({ magicMountedRideTests: { ...answers, [riderId]: { ...current, [field]: input.value === '' ? null : Number(input.value) } } });
        handlers.calculate();
      });
      label.append(input);
      result.appendChild(label);
    }
    return result;
  }

  if (cast.spellSuccess && sp) {
    for (const t of sp.targetResults || sp.targets || []) {
      const tName = t.targetName || t.name || 'Cible';
      for(const action of t.actions || [])if(['mj-input','chain-ended','conjured-weapon','option-tests','affliction-receipt','suppression','banishment-receipt','calm'].includes(action.kind) && action.summary)result.appendChild(node('p','workspace-result-line',tName+' : '+action.summary));
      if(t.quantifiedReminder)result.appendChild(node('p','workspace-result-line',tName+' : '+Object.entries(t.quantifiedReminder).map(([key,value])=>key+' = '+value).join(' ; ')+' (reçu à appliquer sur la fiche ou le terrain).'));
      if (t.missile) {
        const rawDmg = t.missile.rawDamage ?? t.missile.baseDamage ?? 0;
        // Blessures nettes après armure, Protection et réduction : `t.woundsLost` quand une Protection a joué.
        const netWounds = t.magicProtection ? t.woundsLost : t.missile.woundsLost ?? t.missile.finalDamage ?? t.missile.netWounds ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Projectile magique · ${rawDmg} Dégâts bruts → ${netWounds} Blessures${protectionNote(t.magicProtection)} (${t.missile.location || 'Corps'}) · PV ${t.finalHp ?? ''}`));
      }
      if (t.damage) {
        const rawDmg = t.damage.rawDamage ?? 0;
        const netWounds = t.magicProtection ? t.woundsLost : t.damage.woundsLost ?? t.damage.finalDamage ?? t.damage.netWounds ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Dégâts magiques · ${rawDmg} Dégâts bruts → ${netWounds} Blessures${protectionNote(t.magicProtection)}`));
      }
      if (t.arcaneUnforgiving) {
        const arcane = t.arcaneUnforgiving;
        result.appendChild(node('p', 'workspace-result-line', 'Surpuissance dépensée : ' + arcane.overcastCost + ' DR'));
        for (const action of t.actions || []) {
          if (action.kind?.startsWith('arcane-')) result.appendChild(node('p', 'workspace-result-line', tName + ' : ' + action.summary));
        }
        const names = Object.fromEntries(ARCANE_ARMOR_LOCATIONS);
        for (const loc of Object.keys(arcane.damageByLocation)) {
          result.appendChild(node('p', 'workspace-result-line', names[loc] + ' : ' + arcane.armorBefore[loc] + ' → ' + arcane.armorAfter[loc] + ' PA'));
        }
      }
      if (t.healing) {
        const healed = t.healing.healedAmount ?? t.healing.healedWounds ?? t.woundsHealed ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Soin magique · +${healed} Blessures`));
      }
      if (t.temporaryEffect) {
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Effets temporaires (${appliedDurationText(t, contract.duration || 'durée active')}) — ${t.temporaryEffect.spellName || contract.name}`));
      }
      if (t.beastForm) {
        const bf = t.beastForm;
        result.appendChild(node('p', 'workspace-result-line',
          `Transformation (${contract.name}) : ${bf.summary}`));
      }
      if (t.verdantApotheosis) {
        const va = t.verdantApotheosis;
        result.appendChild(node('p', 'workspace-result-line',
          va.admissible
            ? `Apothéose Verdoyante : ${tName} revient à la vie avec ${va.healedHp} PV · ${va.corruptionTest}`
            : `Apothéose Verdoyante : ${tName} non admissible (${va.reason})`));
      }
      if (t.handOfGlory) {
        result.appendChild(node('p', 'workspace-result-line', t.handOfGlory.summary || `Main de Gloire appliquée sur ${tName}`));
      }
      if (t.daemonbane) {
        result.appendChild(node('p', 'workspace-result-line', t.daemonbane.summary || `Fléau des Démons sur ${tName}`));
      }
      if (t.sapheryWard) {
        result.appendChild(node('p', 'workspace-result-line', t.sapheryWard.summary || `Bouclier de Saphery : Protection ${t.sapheryWard.threshold}+`));
      }
      if (t.scythe) {
        result.appendChild(node('p', 'workspace-result-line', t.scythe.summary));
      }
      if (t.specialEffect) {
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : ${t.specialEffect.summary || contract.name}`));
      }
    }
    // Destinataires secondaires désignés par le MJ (ennemis engagés, attaquant) : États et Blessures après Protection.
    for (const r of sp.secondaryResults || []) {
      const effects = r.recurring ? ['sera frappé à chacun de ses Tours']
        : r.immune ? [`immunisé (${r.immune})`]
        : r.test?.passed ? [`${r.test.skill} réussi (${r.test.roll} ≤ ${r.test.score}), aucun effet`]
        : [...r.conditions, ...(r.woundsLost ? [`${r.woundsLost} Blessures${protectionNote(r.magicProtection)}`] : r.magicProtection?.wardSaved ? [`0 Blessure${protectionNote(r.magicProtection)}`] : [])];
      result.appendChild(node('p', 'workspace-result-line', `${r.targetName} : ${effects.join(', ') || 'aucun effet'}`));
    }
    for (const ar of sp.attributeReceipts || []) {
      result.appendChild(node('p', 'workspace-result-line workspace-muted',
        `Attribut de Domaine (${ar.lore}) : ${ar.effect}`));
    }
    for (const item of sp.ficheFollowUpReceipt?.inventoryChanges || []) {
      result.appendChild(node('p', 'workspace-muted', item.summary));
    }
    if (sp.ficheFollowUpReceipt?.reminderText) {
      result.appendChild(node('p', 'workspace-muted', `Rappel : ${sp.ficheFollowUpReceipt.reminderText}`));
    }
    for (const rem of sp.reminders || []) {
      result.appendChild(node('p', 'workspace-muted', `Rappel : ${rem}`));
    }
    for (const fall of sp.mountedFall || []) {
      if (fall.test) result.appendChild(node('p', 'workspace-result-line', `${fall.participantId} : Chevaucher ${fall.test.roll}, ${fall.test.sl} DR · ${fall.dismount ? 'désarçonné' : 'reste en selle'}.`));
    }
    for (const need of sp.needsInput || []) if (need.field?.startsWith('mountedRide')) {
      const [, riderId] = need.field.split(':');
      const field = need.field.startsWith('mountedRideScore') ? 'score' : 'roll';
      const rider = (sp.targets || []).find(row => row.id === riderId);
      const answers = draft.magicMountedRideTests || {}, current = answers[riderId] || {};
      const label = node('label', 'workspace-type', need.label || `${rider?.name || riderId} · ${field === 'roll' ? 'd100' : 'score de Chevaucher'}`);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(need.min ?? (field === 'roll' ? 1 : 0));
      input.max = String(need.max ?? 100);
      input.value = current[field] == null ? '' : String(current[field]);
      input.addEventListener('change', () => {
        handlers.select({ magicMountedRideTests: { ...answers, [riderId]: { ...current, [field]: input.value === '' ? null : Number(input.value) } } });
        handlers.calculate();
      });
      label.append(input);
      result.appendChild(label);
    }
  }
  return result;
}
