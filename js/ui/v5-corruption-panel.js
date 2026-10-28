/** MJ-only Corruption panel. All durable changes go through Store commands. */
const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};
const SKILL_OPTIONS = Object.freeze([
  ['skill-52_e9_73_69_73_74_61_6e_63_65-base', 'Résistance'],
  ['skill-43_61_6c_6d_65-base', 'Calme']
]);
const errorText = error => error?.message || 'Action de Corruption non enregistrée.';

export function createV5CorruptionPanel({ Store, refresh = () => {} } = {}) {
  if (!Store) throw new TypeError('createV5CorruptionPanel nécessite Store');
  const state = {
    actorId: null, pointInput: '', pointReason: '', influence: 'minor', exposure: 'exposure', skillId: SKILL_OPTIONS[0][0], declaredSources: '',
    exposureRoll: '', manualScore: '', manualScoreReason: '', exposurePreview: null,
    thresholdRoll: '', thresholdScore: '', thresholdScoreReason: '', mutationDomainRoll: '', gmChosenDomain: '',
    delayDice: ['', '', ''], thresholdPreview: null, mutationDescription: '', absolutionAmount: '', absolutionReason: '',
    catalogTableId: '', catalogEntryId: '', catalogResult: '', catalogColumn: '', catalogParentEntryId: '', catalogCompatibilityDomain: '',
    lossReason: '', receipt: '', error: '', busy: false
  };
  let dynamicButtons = [];
  const refreshDynamicButtons = () => {
    for (const { control, isDisabled } of dynamicButtons) control.disabled = state.busy || isDisabled();
  };
  const clearPreview = () => { state.exposurePreview = null; state.thresholdPreview = null; state.error = ''; };
  const act = async fn => {
    if (state.busy) return;
    state.busy = true; state.error = ''; refresh();
    try { await fn(); }
    catch (error) { state.error = errorText(error); }
    finally { state.busy = false; refresh(); }
  };
  function field(parent, labelText, key, { type = 'number', min, max, step = '1' } = {}) {
    const label = node('label', 'workspace-corruption-field');
    label.append(node('span', '', labelText));
    const input = document.createElement('input');
    input.type = type;
    input.setAttribute('aria-label', labelText);
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    if (type === 'number') input.step = String(step);
    input.value = String(state[key] ?? '');
    input.disabled = state.busy;
    input.addEventListener('input', () => { state[key] = input.value; clearPreview(); refreshDynamicButtons(); });
    label.append(input); parent.append(label); return input;
  }
  function select(parent, labelText, key, values) {
    const label = node('label', 'workspace-corruption-field');
    label.append(node('span', '', labelText));
    const select = document.createElement('select');
    select.setAttribute('aria-label', labelText);
    select.disabled = state.busy;
    for (const [value, text] of values) select.append(new Option(text, value));
    select.value = state[key];
    select.addEventListener('change', () => { state[key] = select.value; clearPreview(); refreshDynamicButtons(); });
    label.append(select); parent.append(label); return select;
  }
  function optionSelect(parent, labelText, key, values) {
    const label = node('label', 'workspace-corruption-field');
    label.append(node('span', '', labelText));
    const control = document.createElement('select');
    control.setAttribute('aria-label', labelText); control.disabled = state.busy;
    for (const [value, text] of values) { const option = document.createElement('option'); option.value = value; option.textContent = text; control.append(option); }
    control.value = state[key];
    control.addEventListener('change', () => {
      state[key] = control.value;
      if (key === 'catalogTableId') { state.catalogEntryId = ''; state.catalogColumn = ''; state.catalogParentEntryId = ''; state.catalogCompatibilityDomain = ''; }
      if (key === 'catalogTableId' || key === 'catalogEntryId') state.catalogResult = '';
      clearPreview(); refreshDynamicButtons();
      // These selections change which dependent controls exist (entry, parent,
      // column or explicit L17 compatibility). Re-render from the same panel
      // state so the MJ can make the next decision without losing earlier input.
      if (['catalogTableId', 'catalogEntryId', 'catalogParentEntryId', 'catalogCompatibilityDomain'].includes(key)) refresh();
    });
    label.append(control); parent.append(label); return control;
  }
  function button(parent, labelText, action, disabled = false) {
    const control = node('button', 'button', labelText); control.type = 'button';
    const isDisabled = typeof disabled === 'function' ? disabled : () => Boolean(disabled);
    control.disabled = isDisabled() || state.busy;
    dynamicButtons.push({ control, isDisabled });
    control.addEventListener('click', action); parent.append(control); return control;
  }
  function currentStatus(actor) {
    try { return Store.getCorruptionStatus(actor.id); }
    catch (error) { state.error = errorText(error); return null; }
  }
  function render(actor) {
    dynamicButtons = [];
    if (!actor?.id) return null;
    if (state.actorId !== actor.id) {
      Object.assign(state, {
        actorId: actor.id, pointInput: '', pointReason: '', influence: 'minor', exposure: 'exposure', skillId: SKILL_OPTIONS[0][0], declaredSources: '',
        exposureRoll: '', manualScore: '', manualScoreReason: '', exposurePreview: null,
        thresholdRoll: '', thresholdScore: '', thresholdScoreReason: '', mutationDomainRoll: '', gmChosenDomain: '',
        delayDice: ['', '', ''], thresholdPreview: null, mutationDescription: '', absolutionAmount: '', absolutionReason: '',
        lossReason: '', receipt: '', error: '', busy: false
        , catalogTableId: '', catalogEntryId: '', catalogResult: '', catalogColumn: '', catalogParentEntryId: '', catalogCompatibilityDomain: ''
      });
    }
    const status = currentStatus(actor);
    if (!status) return null;
    const panel = node('section', 'card workspace-corruption-panel');
    panel.dataset.v5CorruptionPanel = actor.id;
    panel.append(node('h3', '', `Corruption · ${actor.name || 'participant'}`));
    panel.append(node('p', 'workspace-muted', 'Décisions et saisies de Corruption réservées au MJ. Aucun score ou mutation n’est inventé.'));

    if (!status.pointsKnown) {
      panel.append(node('p', 'workspace-field-error', 'Solde de Corruption inconnu : saisissez la valeur de la fiche avant toute exposition.'));
      field(panel, 'Points de Corruption connus', 'pointInput', { min: 0 });
      field(panel, 'Motif de cette valeur connue', 'pointReason', { type: 'text' });
      button(panel, 'Enregistrer le solde connu', () => act(async () => {
        const amount = Number(state.pointInput);
        const result = await Store.setCorruptionPoints(actor.id, amount, { reason: state.pointReason, baseRevision: status.baseRevision });
        if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; relisez le solde.');
        state.pointInput = ''; state.pointReason = ''; state.receipt = 'Solde connu enregistré.'; clearPreview();
      }), state.pointInput === '' || !state.pointReason.trim());
      return panel;
    }

    panel.append(node('p', '', `Points actuels : ${status.corruptionPoints} · seuil actuel : ${status.threshold ?? 'indisponible'}${status.pureSoul ? ' (Âme pure)' : ''}`));
    if (status.thresholdError) panel.append(node('p', 'workspace-field-error', status.thresholdError));
    panel.append(node('p', 'workspace-muted', status.corruptionSessionId
      ? `Séance active · ${status.corruptionSessionId}`
      : 'Aucune séance ouverte : la Corruption se résout une fois par personnage et par séance.'));
    if (!status.corruptionSessionId || status.sessionExposure) {
      button(panel, status.corruptionSessionId ? 'Ouvrir la séance suivante' : 'Démarrer une séance', () => act(async () => {
        const result = await Store.startTalentSession({ baseRevision: status.baseRevision });
        if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; ouvrez la séance à nouveau.');
        state.exposurePreview = null; state.exposureRoll = ''; state.declaredSources = '';
        state.receipt = 'Nouvelle séance ouverte explicitement par le MJ.';
      }));
    }

    if (status.pendingThresholdTest) {
      if (Number.isSafeInteger(status.threshold) && status.corruptionPoints <= status.threshold) {
        panel.append(node('h4', '', 'Test de seuil devenu inutile'));
        panel.append(node('p', 'workspace-muted', `Le seuil recalculé (${status.threshold}) est supérieur ou égal au solde actuel (${status.corruptionPoints}). Le Test en attente peut être clôturé sans jet.`));
        button(panel, 'Clore le Test de seuil devenu inutile', () => act(async () => {
          const result = await Store.resolveObsoleteCorruptionThresholdTest(actor.id, { baseRevision: status.baseRevision });
          if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; relisez le seuil.');
          state.thresholdPreview = null; state.thresholdRoll = ''; state.receipt = 'Test en attente clôturé après recalcul du seuil.';
        }));
      } else {
      panel.append(node('h4', '', 'Test immédiat contre la mutation requis'));
      panel.append(node('p', 'workspace-muted', `Solde ${status.corruptionPoints} · seuil recalculé ${status.threshold ?? 'indisponible'} · Test de Résistance à +0 DR.`));
      field(panel, 'Jet de Résistance (d100)', 'thresholdRoll', { min: 1, max: 100 });
      field(panel, 'Score MJ si Résistance non liée', 'thresholdScore', { min: 0, max: 100 });
      field(panel, 'Motif du score manuel', 'thresholdScoreReason', { type: 'text' });
      field(panel, 'Jet d100 de mutation physique / mentale', 'mutationDomainRoll', { min: 1, max: 100 });
      select(panel, 'Choix MJ si espèce hors table', 'gmChosenDomain', [['', 'À choisir si requis'], ['physical', 'Physique'], ['mental', 'Mentale']]);
      panel.append(node('p', 'workspace-muted', 'Si le Test échoue, saisissez les trois d10 du délai secret réservé au MJ.'));
      state.delayDice.forEach((value, index) => {
        const labelText = `Délai secret · d10 ${index + 1}`;
        const label = node('label', 'workspace-corruption-field'); label.append(node('span', '', labelText));
        const input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = '10'; input.step = '1'; input.value = value;
        input.setAttribute('aria-label', labelText); input.disabled = state.busy;
        input.addEventListener('input', () => { state.delayDice[index] = input.value; state.thresholdPreview = null; refreshDynamicButtons(); });
        label.append(input); panel.append(label);
      });
      button(panel, 'Calculer le Test de seuil', () => act(async () => {
        const preview = Store.previewCorruptionThresholdTest(actor.id, {
          baseRevision: status.baseRevision, roll: Number(state.thresholdRoll), manualScore: state.thresholdScore === '' ? undefined : Number(state.thresholdScore),
          manualScoreReason: state.thresholdScoreReason, mutationDomainRoll: state.mutationDomainRoll === '' ? undefined : Number(state.mutationDomainRoll),
          gmChosenDomain: state.gmChosenDomain || undefined,
          manifestationDice: state.delayDice.some(value => value === '') ? undefined : state.delayDice.map(Number)
        });
        state.thresholdPreview = preview;
        if (preview.status === 'stale') throw new Error('La partie a changé; relisez le seuil et recalculez.');
        if (preview.status === 'needs-input') throw new Error('Le choix MJ ou le délai secret requis n’est pas complet.');
      }), state.thresholdRoll === '');
      if (state.thresholdPreview?.status === 'ready') {
        const preview = state.thresholdPreview;
        panel.append(node('p', 'workspace-corruption-preview', preview.outcome?.status === 'deferred'
          ? `Résistance réussie · ${preview.test.sl} DR : mutation reportée au prochain gain.`
          : `Résistance échouée · mutation ${preview.outcome?.mutation?.domain === 'physical' ? 'physique' : 'mentale'} proposée · délai secret ${preview.manifestation?.days} jours (MJ).`));
        button(panel, 'Appliquer le résultat du Test', () => act(async () => {
          const result = await Store.applyCorruptionThresholdTest(actor.id, preview);
          if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; recalculez.');
          state.thresholdPreview = null; state.thresholdRoll = ''; state.mutationDomainRoll = ''; state.delayDice = ['', '', ''];
          state.receipt = 'Test de seuil enregistré.';
        }));
      }
      }
    } else if (status.pendingMutation) {
      panel.append(node('h4', '', 'Mutation à confirmer par le MJ'));
      panel.append(node('p', 'workspace-muted', `Mutation ${status.pendingMutation.domain === 'physical' ? 'physique' : 'mentale'} · délai secret : ${status.pendingMutation.manifestation?.days ?? 'à préciser'} jours.`));
      field(panel, 'Description ou référence choisie par le MJ', 'mutationDescription', { type: 'text' });
      button(panel, 'Confirmer cette mutation', () => act(async () => {
        const result = await Store.confirmCorruptionMutation(actor.id, { mutationId: state.mutationDescription, baseRevision: status.baseRevision });
        if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; relisez la mutation.');
        state.mutationDescription = ''; state.receipt = 'Mutation durable enregistrée; aucun effet de table K2 n’est appliqué ici.';
      }), !state.mutationDescription.trim());
    } else if (status.pendingCharacterLoss) {
      panel.append(node('h4', '', 'Perte de personnage à arbitrer'));
      panel.append(node('p', 'workspace-field-error', 'Les limites de mutations sont dépassées. Le personnage n’est pas retiré sans décision explicite du MJ.'));
      field(panel, 'Motif de la décision MJ', 'lossReason', { type: 'text' });
      for (const [confirmed, labelText] of [[true, 'Confirmer le personnage perdu au Chaos'], [false, 'Refuser la perte']]) {
        button(panel, labelText, () => act(async () => {
          const result = await Store.decideCorruptionCharacterLoss(actor.id, { confirmed, reason: state.lossReason, baseRevision: status.baseRevision });
          if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; relisez la décision.');
          state.lossReason = ''; state.receipt = `Décision de perte ${confirmed ? 'confirmée' : 'refusée'}.`;
        }), !state.lossReason.trim());
      }
    } else if (!status.corruptionSessionId) {
      panel.append(node('p', 'workspace-muted', 'Ouvrez une séance avant de saisir et résoudre les expositions de fin de séance.'));
    } else if (status.sessionExposure) {
      panel.append(node('h4', '', 'Test de Corruption déjà résolu pour cette séance'));
      panel.append(node('p', 'workspace-muted', `${status.sessionExposure.influence} · ${status.sessionExposure.kind === 'prolonged' ? 'exposition prolongée' : 'exposition'} · ${status.sessionExposure.gainedPoints} point(s) gagné(s). Les autres expositions déclarées : ${status.sessionExposure.declaredSources || 'non précisées'}.`));
    } else {
      panel.append(node('h4', '', 'Exposition de fin de séance'));
      panel.append(node('p', 'workspace-muted', 'Déclarez toutes les sources rencontrées dans cette séance, une par ligne, puis choisissez ci-dessous la plus forte pour le Test unique.'));
      const sourcesLabel = node('label', 'workspace-corruption-field');
      sourcesLabel.append(node('span', '', 'Sources d’exposition déclarées (une par ligne)'));
      const sourcesInput = document.createElement('textarea');
      sourcesInput.setAttribute('aria-label', 'Sources d’exposition déclarées (une par ligne)');
      sourcesInput.value = state.declaredSources; sourcesInput.disabled = state.busy;
      sourcesInput.addEventListener('input', () => { state.declaredSources = sourcesInput.value; clearPreview(); refreshDynamicButtons(); });
      sourcesLabel.append(sourcesInput); panel.append(sourcesLabel);
      select(panel, 'Influence corruptrice', 'influence', [['minor', 'Mineure'], ['moderate', 'Modérée'], ['major', 'Majeure']]);
      select(panel, 'Durée d’exposition', 'exposure', [['exposure', 'Exposition'], ['prolonged', 'Exposition prolongée']]);
      select(panel, 'Compétence choisie par le MJ', 'skillId', SKILL_OPTIONS);
      field(panel, 'Jet du Test de Corruption (d100)', 'exposureRoll', { min: 1, max: 100 });
      field(panel, 'Score MJ si compétence non liée', 'manualScore', { min: 0, max: 100 });
      field(panel, 'Motif du score manuel', 'manualScoreReason', { type: 'text' });
      button(panel, 'Calculer l’exposition', () => act(async () => {
        const preview = Store.previewCorruptionExposure(actor.id, {
          baseRevision: status.baseRevision, influence: state.influence, exposure: state.exposure, skillId: state.skillId,
          roll: Number(state.exposureRoll), manualScore: state.manualScore === '' ? undefined : Number(state.manualScore), manualScoreReason: state.manualScoreReason,
          declaredSources: state.declaredSources
        });
        state.exposurePreview = preview;
        if (preview.status === 'stale') throw new Error('La partie a changé; recalculez l’exposition.');
      }), () => state.exposureRoll === '' || !state.declaredSources.trim());
      if (state.exposurePreview?.status === 'ready') {
        const preview = state.exposurePreview;
        panel.append(node('p', 'workspace-corruption-preview', `${preview.test.skill} ${preview.test.success ? 'réussite' : 'échec'} · ${preview.test.sl} DR · gain ${preview.gainedPoints} · total ${preview.corruptionPoints} / seuil ${preview.threshold}${preview.thresholdTestRequired ? ' · Test immédiat ensuite' : ''}`));
        button(panel, 'Enregistrer l’exposition', () => act(async () => {
          const result = await Store.applyCorruptionExposure(actor.id, preview);
          if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; recalculez l’exposition.');
          state.exposurePreview = null; state.exposureRoll = ''; state.receipt = `Exposition enregistrée : +${preview.gainedPoints} point(s).`;
        }));
      }
    }

    panel.append(node('h4', '', 'Absolution fixée par le MJ'));
    field(panel, 'Points retirés', 'absolutionAmount', { min: 0 });
    field(panel, 'Motif de l’absolution', 'absolutionReason', { type: 'text' });
    button(panel, 'Appliquer l’absolution', () => act(async () => {
      const result = await Store.applyCorruptionAbsolution(actor.id, { amount: Number(state.absolutionAmount), reason: state.absolutionReason, baseRevision: status.baseRevision });
      if (result?.status === 'stale' || result?.ok === false) throw new Error(result.error || 'La partie a changé; relisez le solde.');
      state.absolutionAmount = ''; state.absolutionReason = ''; state.receipt = 'Absolution enregistrée.'; clearPreview();
    }), state.absolutionAmount === '' || !state.absolutionReason.trim());

    panel.append(node('h4', '', 'Choisir un résultat de table de mutation'));
    panel.append(node('p', 'workspace-muted', status.pendingMutation
      ? 'Choisissez la ligne et le résultat à rattacher à la mutation K1 en attente. Les résumés et effets catalogués ne sont jamais appliqués automatiquement.'
      : 'Les tables servent à confirmer une mutation K1 en attente. Saisie manuelle conservée; les choix de table ne créent pas de mutation ni de dépense seuls.'));
    const catalog = Store.getCorruptionMutationCatalog();
    const table = catalog.find(item => item.id === state.catalogTableId) || null;
    if (!table && catalog.length) state.catalogTableId = catalog[0].id;
    const selectedTable = catalog.find(item => item.id === state.catalogTableId) || null;
    optionSelect(panel, 'Table source', 'catalogTableId', catalog.map(item => [item.id, `${item.family} · ${item.source?.book || ''} p.${item.source?.printedPage ?? item.source?.pageImprimee ?? '?'}`]));
    let selectedTableResolvedDomain = selectedTable?.domain || null;
    if (selectedTable?.selection?.renvoiDepuis) panel.append(node('p', 'workspace-muted', `Renvoi imprimé depuis : ${Array.isArray(selectedTable.selection.renvoiDepuis) ? selectedTable.selection.renvoiDepuis.join(', ') : selectedTable.selection.renvoiDepuis}.`));
    if (Array.isArray(selectedTable?.selection?.renvoiDepuis)) {
      const parentRows = catalog.flatMap(parent => parent.entries.filter(entry => selectedTable.selection.renvoiDepuis.includes(entry.label)).map(entry => [entry.id, `${parent.family} · ${entry.label}`]));
      if (!parentRows.some(([id]) => id === state.catalogParentEntryId)) state.catalogParentEntryId = parentRows[0]?.[0] || '';
      optionSelect(panel, 'Ligne parente du renvoi', 'catalogParentEntryId', parentRows);
      const parentTable = catalog.find(parent => parent.entries.some(entry => entry.id === state.catalogParentEntryId));
      selectedTableResolvedDomain = selectedTableResolvedDomain || parentTable?.domain || null;
    }
    if (selectedTable && !selectedTableResolvedDomain) {
      panel.append(node('p', 'workspace-muted', 'Cette table ne porte pas de domaine physique/mental. Le MJ doit déclarer explicitement sa compatibilité avec le domaine de la mutation K1; aucun domaine n’est présélectionné.'));
      optionSelect(panel, 'Compatibilité décidée par le MJ', 'catalogCompatibilityDomain', [['', 'Choisir explicitement'], ['physical', 'Compatible avec physique'], ['mental', 'Compatible avec mental']]);
    }
    const entries = selectedTable?.entries || [];
    if (selectedTable) {
      if (!entries.some(item => item.id === state.catalogEntryId)) state.catalogEntryId = entries[0]?.id || '';
      optionSelect(panel, 'Ligne de mutation', 'catalogEntryId', entries.map(item => [item.id, `${item.label} · ${item.selection?.printed || (item.selection?.min != null ? `${item.selection.min}–${item.selection.max}` : '')}`]));
      const selectedEntry = entries.find(item => item.id === state.catalogEntryId) || null;
      const selectionType = selectedTable.selection?.type || '';
      const needsColumn = Boolean(selectedEntry?.selection?.ranges);
      if (needsColumn) {
        const columns = Object.keys(selectedEntry.selection.ranges).filter(key => selectedEntry.selection.ranges[key] != null);
        if (!columns.includes(state.catalogColumn)) state.catalogColumn = columns[0] || '';
        optionSelect(panel, 'Colonne / sous-table', 'catalogColumn', columns.map(key => [key, `${key} · ${selectedEntry.selection.ranges[key]}`]));
      }
      const dieMin = selectionType === 'd100-columns' ? 0 : selectionType === '2d10' ? 2 : 1;
      const dieMax = selectionType === 'd10' ? 10 : selectionType === '2d10' ? 20 : selectionType === 'd100-columns' ? 99 : 100;
      const dieLabel = selectionType === 'd10' ? 'd10: 1–10' : selectionType === '2d10' ? '2d10: 2–20' : selectionType === 'd100-columns' ? 'd100: 00–99' : `d100: 01–00 (saisi 1–100)`;
      field(panel, `Résultat imprimé (${dieLabel})`, 'catalogResult', { min: dieMin, max: dieMax });
      if (selectedEntry) {
        panel.append(node('p', 'workspace-muted', `${selectedEntry.label} · ${selectedEntry.summary}`));
        const conversionText = selectedEntry.conversion?.propositionV5 || selectedEntry.conversion?.justification || selectedEntry.conversion?.note;
        if (conversionText) panel.append(node('p', 'workspace-muted', `Conversion / statut : ${conversionText}`));
        if (selectedEntry.effects?.length) panel.append(node('p', 'workspace-muted', `Effets structurés enregistrés, non exécutés : ${JSON.stringify(selectedEntry.effects)}`));
        const refs = selectedEntry.references?.length ? selectedEntry.references.join(', ') : selectedEntry.referenceF2 || selectedEntry.source?.referenceF2 || 'référence de famille / provenance PDF';
        panel.append(node('p', 'workspace-muted', `Provenance : ${selectedEntry.source?.book || selectedTable.source?.livre || ''} · p.${selectedEntry.source?.printedPage ?? selectedEntry.source?.pageImprimee ?? selectedTable.source?.pageImprimee ?? '?'} / PDF ${selectedEntry.source?.pdfPage ?? selectedEntry.source?.pagePdf ?? selectedTable.source?.pagePdf ?? '?'} · ${refs}`));
        if (selectedTable.source?.notes?.length) for (const note of selectedTable.source.notes) panel.append(node('p', 'workspace-muted', `Note / renvoi ${note.referenceF2 || ''} : ${note.texte}`));
        if (selectedEntry.mechanicStatus === 'assiste' || selectedEntry.statutMecanique === 'assiste' || selectedEntry.conversion?.status === 'assiste' || selectedEntry.conversion?.statut === 'assiste') {
          panel.append(node('p', 'workspace-muted', `À confirmer par le MJ : ${selectedEntry.questionsMJ?.join(' ') || selectedEntry.questionsMJ?.[0] || 'conversion / application assistée'}`));
        }
      }
      if (status.pendingMutation) {
        panel.append(node('p', 'workspace-muted', `Domaine en attente : ${status.pendingMutation.domain === 'physical' ? 'physique' : 'mental'}. Le résultat sera enregistré dans la même confirmation K1; aucune dépense ou mutation doublée.`));
        button(panel, 'Confirmer la mutation en attente avec cette entrée', () => act(async () => {
          if (!state.catalogEntryId || state.catalogResult === '' || !Number.isSafeInteger(Number(state.catalogResult))) throw new Error('Saisissez un résultat valide pour la ligne choisie.');
          const result = await Store.confirmCorruptionMutation(actor.id, {
            catalogSelection: { tableId: state.catalogTableId, entryId: state.catalogEntryId, result: Number(state.catalogResult), column: state.catalogColumn || null, renvoiParentEntryId: state.catalogParentEntryId || null },
            compatibilityDomain: selectedTableResolvedDomain ? null : (state.catalogCompatibilityDomain || null),
            baseRevision: status.baseRevision
          });
          if (result?.status !== 'confirmed') throw new Error(result.error || 'La partie a changé; relisez la sélection.');
          state.catalogResult = ''; state.mutationDescription = ''; state.receipt = 'Mutation K1 confirmée avec sa ligne de catalogue; effets non appliqués.';
        }), () => !state.catalogEntryId || state.catalogResult === '' || (selectedTable && !selectedTableResolvedDomain && !state.catalogCompatibilityDomain));
      }
    }
    if (status.mutations.length) {
      const list = node('ul', 'workspace-corruption-mutations');
      for (const mutation of status.mutations) {
        const catalogDetails = mutation.tableId
          ? ` · ${mutation.tableId} / ${mutation.entryId} · résultat ${mutation.result ?? '?'}${mutation.column ? ` · ${mutation.column}` : ''} · ${mutation.source?.referenceF2 || mutation.referenceF2 || 'renvoi'} · ${mutation.source?.printedPage ?? mutation.source?.pageImprimee ?? '?'} / PDF ${mutation.source?.pdfPage ?? mutation.source?.pagePdf ?? '?'} · ${mutation.dataVersion} · effets non appliqués`
          : '';
        const renvoi = mutation.renvoiParent ? ` · renvoi parent ${mutation.renvoiParent.label}` : '';
        list.append(node('li', '', `${mutation.domain === 'physical' ? 'Physique' : 'Mentale'} · ${mutation.description || mutation.tableRowId} · ${mutation.manifestation?.days ?? '?'} jours (MJ)${catalogDetails}${renvoi}`));
      }
      panel.append(list);
    }
    if (status.characterLoss) panel.append(node('p', status.characterLoss.status === 'confirmed' ? 'workspace-field-error' : 'workspace-muted', `Perte de personnage : ${status.characterLoss.status === 'confirmed' ? 'confirmée, contrôle MJ' : 'refusée'}.`));
    if (state.receipt) panel.append(node('p', 'workspace-muted', state.receipt));
    if (state.error) { const error = node('p', 'workspace-field-error', state.error); error.setAttribute('role', 'alert'); panel.append(error); }
    return panel;
  }
  return { render };
}
