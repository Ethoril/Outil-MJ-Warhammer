import { parseProfileText } from '../core/text-profile-import.js';

/** E17 local text import: review is required before the caller receives profiles. */
export function initTextImportView({ mount, parser = parseProfileText, callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('import-text-view nécessite un mount');
  let parsed = null;
  let confirmed = false;
  let error = '';

  function render() {
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'import-text-view'; root.setAttribute('aria-label', 'Importer des profils depuis du texte');
    const title = document.createElement('h2'); title.textContent = 'Importer depuis du texte'; root.appendChild(title);
    const help = document.createElement('p'); help.textContent = 'Un bloc par profil ; séparez les blocs par une ligne contenant ---.'; root.appendChild(help);
    if (error) { const alert = document.createElement('p'); alert.className = 'error'; alert.setAttribute('role', 'alert'); alert.textContent = error; root.appendChild(alert); }
    const input = document.createElement('textarea'); input.setAttribute('aria-label', 'Texte des profils'); input.rows = 12; input.value = parsed?.sourceText || ''; root.appendChild(input);
    const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.textContent = 'Analyser le texte';
    previewButton.addEventListener('click', () => {
      try { parsed = parser(input.value); confirmed = false; error = ''; render(); callbacks.onPreview?.(parsed); }
      catch (cause) { error = cause?.message || String(cause); render(); }
    });
    root.appendChild(previewButton);
    if (parsed) {
      const summary = document.createElement('p'); summary.textContent = `${parsed.profiles.length} profil(s) · ${parsed.status === 'ready' ? 'prêt' : 'à vérifier'}`; root.appendChild(summary);
      const details = document.createElement('pre'); details.textContent = JSON.stringify({ profiles: parsed.profiles, fields: parsed.blocks.map(block => block.fields), ambiguities: parsed.ambiguities, errors: parsed.errors, unknownQualities: parsed.unknownQualities }, null, 2); root.appendChild(details);
      const confirmation = document.createElement('label');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = confirmed; check.addEventListener('change', () => { confirmed = check.checked; if (importButton) importButton.disabled = parsed.status !== 'ready' && !confirmed; });
      confirmation.append(check, ' Je confirme les champs absents ou ambigus affichés ci-dessus'); root.appendChild(confirmation);
      const importButton = document.createElement('button'); importButton.type = 'button'; importButton.textContent = 'Importer le lot'; importButton.disabled = parsed.status !== 'ready' && !confirmed;
      importButton.addEventListener('click', async () => {
        if (importButton.disabled) return;
        importButton.disabled = true;
        try { await callbacks.onImport?.(parsed, { confirmed }); }
        catch (cause) { error = cause?.message || String(cause); render(); }
        finally { if (mount.querySelector('.import-text-view')) importButton.disabled = false; }
      });
      root.appendChild(importButton);
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'ghost'; cancel.textContent = 'Annuler'; cancel.addEventListener('click', () => callbacks.onCancel?.()); root.appendChild(cancel);
    }
    mount.appendChild(root);
  }

  return { render, getPreview: () => parsed, clear() { parsed = null; confirmed = false; error = ''; render(); } };
}
