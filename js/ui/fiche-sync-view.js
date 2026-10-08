import { ficheSnapshot, matchFiches, planProfileSync, ficheErrorMessage, profileSyncFingerprint, planHealthSync } from '../core/fiche-sync.js';
import { userMessage, userError } from './messages.js';

const shown = value => (value === null || value === undefined || value === '' ? '—' : String(value));
const MISSING = '__introuvable';
const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

/**
 * Mise à jour des PJ depuis leurs fiches : connexion, lecture, aperçu des écarts, puis application
 * en un seul geste. `source` ({ getUser, signIn, signOut, fetchAll }) est fourni par l'appelant ;
 * `getContext()` renvoie { profiles } à jour. `hosted` : la fenêtre porte déjà le titre.
 */
export function initFicheSyncView({ mount, hosted = false, source, getContext, callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('fiche-sync-view nécessite un mount');
  let phase = 'checking';
  let userName = '';
  let error = '';
  let snapshots = [];
  let missing = [];
  let selections = new Map();
  let previewRevision;

  const fail = cause => { error = ficheErrorMessage(cause, { online: globalThis.navigator?.onLine !== false }); };
  const pjs = () => (getContext().profiles || []).filter(profile => profile.kind === 'PJ');

  async function check() {
    phase = 'checking'; render();
    try {
      const user = await source.getUser();
      if (!user) { phase = 'signin'; render(); return; }
      userName = user.name;
      await load();
    } catch (cause) { fail(cause); phase = 'signin'; render(); }
  }

  async function signIn() {
    error = ''; phase = 'checking'; render();
    try { userName = (await source.signIn()).name; await load(); }
    catch (cause) { fail(cause); phase = 'signin'; render(); }
  }

  async function load() {
    phase = 'loading'; error = ''; render();
    try {
      const fetched = await source.fetchAll();
      snapshots = fetched.filter(item => item.data).map(item => ficheSnapshot(item.charId, item.data, item.metadata));
      missing = fetched.filter(item => !item.data).map(item => `${item.charId} (${item.status === 'error' ? ficheErrorMessage(item.error) : item.status === 'invalid' ? 'document invalide' : 'absente'})`);
      previewRevision = getContext().revision;
      const matches = matchFiches(snapshots, getContext().profiles || []);
      selections = new Map(snapshots.map(snapshot => [snapshot.charId, { profileId: matches[snapshot.charId], links: {}, convert: {}, equipmentLinks: {}, adoptActions: {}, replaceAssociation: false, fingerprint: null }]));
      phase = 'preview';
    } catch (cause) { fail(cause); phase = 'signin'; }
    render();
  }

  function button(text, handler, className = '') {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = text;
    if (className) node.className = className;
    node.dataset.key = text.split(' ')[0];
    node.addEventListener('click', handler);
    return node;
  }

  function labelled(text, control) {
    const label = document.createElement('label'); label.append(`${text} `, control);
    return label;
  }

  function diffLine(label, from, to) {
    const item = document.createElement('li'); item.textContent = `${label} : ${shown(from)} → ${shown(to)}`;
    return item;
  }

  function entryCard(snapshot) {
    const selection = selections.get(snapshot.charId);
    const card = document.createElement('article'); card.className = 'import-text-profile fiche-sync-entry';
    const title = document.createElement('h3'); title.className = 'combatant-name'; title.textContent = `${snapshot.name || snapshot.charId} (${snapshot.charId})`; card.appendChild(title);

    const choose = document.createElement('select');
    choose.append(new Option('Ignorer cette fiche', ''));
    pjs().forEach(profile => choose.append(new Option(profile.name, profile.id)));
    choose.dataset.key = `profil:${snapshot.charId}`;
    choose.value = selection.profileId || '';
    choose.addEventListener('change', () => { selection.profileId = choose.value || null; selection.links = {}; selection.convert = {}; selection.equipmentLinks = {}; selection.adoptActions = {}; selection.replaceAssociation = false; selection.fingerprint = null; render(); });
    card.appendChild(labelled('Profil à mettre à jour', choose));

    const profile = pjs().find(item => item.id === selection.profileId);
    if (!profile) {
      const none = document.createElement('p'); none.className = 'muted';
      none.textContent = pjs().length ? 'Aucun profil PJ ne correspond : fiche ignorée tant qu’aucun profil n’est choisi.' : 'Aucun profil : la réserve ne contient pas de PJ.';
      card.appendChild(none);
      return card;
    }
    const plan = planProfileSync(snapshot, profile, selection);
    selection.fingerprint ??= plan.precondition.profileFingerprint;
    const sourceInfo = document.createElement('p'); sourceInfo.className = 'muted';
    sourceInfo.textContent = `Source : fiche ${snapshot.charId} · révision ${snapshot.source?.revision ?? 'non fournie'}.`;
    card.appendChild(sourceInfo);
    if (profile.extensions?.ficheId && profile.extensions.ficheId !== snapshot.charId) {
      const previousId = profile.extensions.ficheId;
      const notice = document.createElement('p'); notice.className = 'error';
      notice.textContent = `Ce profil est lié à la fiche ${previousId}. Le remplacement par ${snapshot.charId} actualise ses caractéristiques et les collections valides ci-dessous, et retire les actions de l’ancien équipement remplacé. Les données absentes ou invalides et les actions locales sont conservées.`;
      card.appendChild(notice);
      const confirm = document.createElement('input'); confirm.type = 'checkbox'; confirm.dataset.key = `replace:${snapshot.charId}`; confirm.checked = selection.replaceAssociation === true;
      confirm.addEventListener('change', () => { selection.replaceAssociation = confirm.checked; render(); });
      card.appendChild(labelled(`Je confirme le remplacement de la fiche ${previousId} par ${snapshot.charId}`, confirm));
    }
    const labels = { skills: 'Compétences', talents: 'Talents', equipment: 'Équipement', spells: 'Sorts (consultation)', prayers: 'Prières (consultation)' };
    const collections = document.createElement('ul');
    Object.entries(plan.collections || {}).forEach(([key, diff]) => {
      const row = document.createElement('li');
      row.textContent = `${labels[key] || key} : ${diff.coverage === 'present' ? `${diff.added.length} ajout(s), ${diff.changed.length} modification(s), ${diff.removed.length} retrait(s)` : `source ${diff.coverage === 'invalid' ? 'invalide' : 'absente'}, données précédentes conservées`}`;
      collections.appendChild(row);
    });
    card.appendChild(collections);
    const active = (getContext().participants || []).filter(row => row.profileId === profile.id || row.extensions?.ficheId === snapshot.charId);
    active.forEach(row => {
      const health = planHealthSync(row, snapshot.woundsMax);
      const info = document.createElement('p');
      info.textContent = `${row.name} en scène : ${health.old}/${health.oldMax ?? '?'} → ${health.new}/${health.newMax ?? '?'} PV (blessures subies conservées).`;
      card.appendChild(info);
    });
    if (plan.protection?.new) {
      const info = document.createElement('p');
      info.textContent = `PA : ${Object.entries(plan.protection.new).map(([key, ap]) => `${({head:'Tête',body:'Corps',rightArm:'Bras D',leftArm:'Bras G',rightLeg:'Jambe D',leftLeg:'Jambe G'})[key] || key} ${ap}`).join(' · ')}. Boucliers séparés.`;
      card.appendChild(info);
    }
    for (const warning of plan.warnings || []) {
      const info = document.createElement('p'); info.className = 'error';
      info.textContent = `À vérifier : ${labels[warning.field] || warning.field || 'fiche'} — ${warning.message || warning.code || 'donnée non reconnue'}.`;
      card.appendChild(info);
    }
    if (plan.equipmentActions?.length) {
      const heading = document.createElement('h4'); heading.textContent = 'Actions issues des armes et boucliers'; card.appendChild(heading);
      for (const action of plan.equipmentActions) {
        const item = document.createElement('div'); item.className = 'fiche-sync-actions';
        const skill = document.createElement('select'); skill.dataset.key = `equipment:${action.key}`;
        skill.append(new Option('Compétence à choisir — action indisponible', ''));
        snapshot.skills.filter(entry => Number.isFinite(entry.total) && entry.status !== 'open').forEach(entry => skill.append(new Option(`${entry.name} (${entry.total})`, entry.id || entry.name)));
        const selected = snapshot.skills.find(entry => entry.name === action.skill);
        skill.value = selected?.id || action.skill || '';
        skill.addEventListener('change', () => { selection.equipmentLinks[action.key] = skill.value; render(); });
        item.append(labelled(`${action.name} (${action.change})`, skill));
        if (action.requiresLink && action.proposed) item.appendChild(button(`Confirmer ${action.proposed}`, () => { selection.equipmentLinks[action.key] = action.proposed; render(); }));
        if (action.change === 'added' || action.change === 'adopted') {
          const adopt = document.createElement('select'); adopt.dataset.key = `adopt:${action.key}`;
          adopt.append(new Option('Créer une action distincte', ''));
          action.adoptCandidates.forEach(candidate => adopt.append(new Option(`Remplacer l’action locale : ${candidate.name}`, candidate.id)));
          adopt.value = selection.adoptActions[action.key] || '';
          adopt.addEventListener('change', () => { selection.adoptActions[action.key] = adopt.value; render(); });
          item.append(labelled('Rapprochement explicite', adopt));
        }
        card.appendChild(item);
      }
    }
    if (plan.removedActions?.length) { const info = document.createElement('p'); info.textContent = `Actions source retirées : ${plan.removedActions.map(row => row.name).join(', ')}.`; card.appendChild(info); }

    const changes = document.createElement('ul'); changes.className = 'fiche-sync-diff';
    plan.caracs.filter(item => item.changed).forEach(item => changes.appendChild(diffLine(item.key, item.old, item.new)));
    if (String(plan.initiative.old) !== String(plan.initiative.new)) changes.appendChild(diffLine('Initiative', plan.initiative.old, plan.initiative.new));
    if (!plan.hp.computable) changes.appendChild(diffLine('PV max', plan.health.oldMax, 'non calculable (données de santé incomplètes) : inchangé'));
    else if (String(plan.health.oldMax) !== String(plan.health.newMax)) changes.appendChild(diffLine('PV max', plan.health.oldMax, plan.health.newMax));
    if (changes.children.length) card.appendChild(changes);
    const unchanged = plan.caracs.filter(item => !item.changed).length;
    const summary = document.createElement('p'); summary.className = 'muted';
    summary.textContent = [changes.children.length ? '' : 'Caractéristiques, initiative et PV max à jour.', unchanged ? `${plural(unchanged, 'caractéristique')} inchangée${unchanged > 1 ? 's' : ''}.` : ''].filter(Boolean).join(' ');
    if (summary.textContent) card.appendChild(summary);

    if (plan.actions.length) {
      const heading = document.createElement('h4'); heading.textContent = 'Actions'; card.appendChild(heading);
      const list = document.createElement('ul'); list.className = 'fiche-sync-actions';
      plan.actions.forEach(action => {
        const item = document.createElement('li');
        const skill = document.createElement('select');
        if (action.missing) skill.append(new Option(`Compétence « ${action.missing} » introuvable dans la fiche`, MISSING));
        skill.append(new Option('Aucune compétence', ''));
        snapshot.skills.filter(entry => Number.isFinite(entry.total) && entry.status !== 'open').forEach(entry => skill.append(new Option(`${entry.name} (${entry.total})`, entry.name)));
        skill.value = action.missing ? MISSING : action.skill;
        skill.dataset.key = `skill:${snapshot.charId}:${action.id}`;
        skill.addEventListener('change', () => { if (skill.value === MISSING) delete selection.links[action.id]; else selection.links[action.id] = skill.value; render(); });
        item.append(labelled(`${action.name || 'Action sans nom'} — compétence`, skill));
        const result = document.createElement('span'); result.className = 'muted';
        result.textContent = action.missing
          ? ` jet ${shown(action.oldBase)} conservé, lien « ${action.missing} » conservé : choisissez une compétence pour le remplacer`
          : action.skill
          ? ` jet ${shown(action.oldBase)}${action.baseChanged ? ` → ${action.newBase}` : ' (inchangé)'}${action.proposed ? ' · lien proposé' : ''}`
          : ` jet ${shown(action.oldBase)} conservé`;
        item.appendChild(result);
        if (action.proposed && !action.confirmed) item.appendChild(button(`Confirmer ${action.proposed}`, () => { selection.links[action.id] = action.proposed; render(); }));
        if (action.damage) {
          const check = document.createElement('input'); check.type = 'checkbox'; check.dataset.key = `degats:${snapshot.charId}:${action.id}`; check.checked = action.damage.enabled;
          check.addEventListener('change', () => { selection.convert[action.id] = check.checked; render(); });
          const label = document.createElement('label'); label.append(check, ` Dégâts fixes ${action.damage.from} → ${action.damage.formula} (suit la Force)`);
          item.appendChild(label);
        }
        list.appendChild(item);
      });
      card.appendChild(list);
    }
    return card;
  }

  function render() {
    // Le rendu reconstruit tout : le focus revient au contrôle équivalent (repéré par data-key).
    const focusKey = mount.contains(document.activeElement) ? document.activeElement.dataset?.key : null;
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'fiche-sync-view'; root.setAttribute('aria-label', 'Mettre à jour les PJ');
    if (!hosted) { const title = document.createElement('h2'); title.textContent = 'Mettre à jour les PJ'; root.appendChild(title); }
    if (error) { const alert = document.createElement('p'); alert.className = 'error'; alert.setAttribute('role', 'alert'); alert.textContent = error; root.appendChild(alert); }
    const actions = document.createElement('div'); actions.className = 'actions';
    if (phase === 'checking' || phase === 'loading') {
      const status = document.createElement('p'); status.className = 'muted'; status.setAttribute('role', 'status');
      status.textContent = phase === 'checking' ? 'Vérification de la connexion…' : 'Lecture des fiches…';
      root.appendChild(status);
    } else if (phase === 'signin') {
      const help = document.createElement('p'); help.textContent = 'Les fiches sont lues dans l’application des joueurs : connectez-vous avec le compte Google du MJ.';
      root.appendChild(help);
      actions.appendChild(button('Connexion Google (fiches)', signIn));
    } else {
      const who = document.createElement('p'); who.className = 'muted'; who.textContent = `Connecté : ${userName}`; root.appendChild(who);
      const scope = document.createElement('p'); scope.className = 'muted';
      scope.textContent = 'La bibliothèque et les PJ déjà en combat seront mis à jour. Les blessures subies sont conservées : les PV actuels suivent la variation du maximum. Les états et le tour en cours sont conservés. Talents et magie restent consultables sans nouvelle automatisation.';
      root.appendChild(scope);
      snapshots.forEach(snapshot => root.appendChild(entryCard(snapshot)));
      if (missing.length) { const absent = document.createElement('p'); absent.className = 'muted'; absent.textContent = `Fiche absente : ${missing.join(', ')}.`; root.appendChild(absent); }
      const chosen = [...selections.entries()].filter(([, selection]) => selection.profileId);
      const unconfirmedReplacement = chosen.some(([charId, selection]) => { const profile = pjs().find(row => row.id === selection.profileId); return profile?.extensions?.ficheId && profile.extensions.ficheId !== charId && selection.replaceAssociation !== true; });
      const duplicate = chosen.length !== new Set(chosen.map(([, selection]) => selection.profileId)).size;
      const adoptions = chosen.flatMap(([,selection]) => Object.values(selection.adoptActions || {}).filter(Boolean));
      const duplicateAdoption = adoptions.length !== new Set(adoptions).size;
      if (duplicateAdoption) { const warn = document.createElement('p'); warn.className='error';warn.setAttribute('role','alert');warn.textContent='Une action locale ne peut remplacer qu’une seule action source. Changez le rapprochement.';root.appendChild(warn); }
      if (duplicate) { const warn = document.createElement('p'); warn.className = 'error'; warn.setAttribute('role', 'alert'); warn.textContent = 'Deux fiches visent le même profil : changez l’une des deux.'; root.appendChild(warn); }
      const apply = button(chosen.length ? `Appliquer (${plural(chosen.length, 'fiche')})` : 'Appliquer', async () => {
        apply.disabled = true;
        try {
          const context = getContext();
          if (previewRevision !== undefined && context.revision !== previewRevision) throw userError('La séance a changé depuis l’aperçu. Relisez les fiches avant d’appliquer.');
          for (const [charId, selection] of chosen) {
            const profile = (context.profiles || []).find(row => row.id === selection.profileId);
            if (!profile || profileSyncFingerprint(profile) !== selection.fingerprint) throw userError('Un profil a changé depuis l’aperçu. Relisez les fiches.');
            if (profile.extensions?.ficheId && profile.extensions.ficheId !== charId && selection.replaceAssociation !== true) throw userError('Confirmez le remplacement de la fiche avant d’appliquer.');
          }
          const fresh = await source.fetchAll();
          for (const [charId] of chosen) {
            const current = fresh.find(row => row.charId === charId);
            const previous = snapshots.find(row => row.charId === charId);
            if (!current?.data || ficheSnapshot(charId, current.data, current.metadata).source.fingerprint !== previous.source.fingerprint) throw userError('Une fiche a changé ou est injoignable. Relisez les fiches avant d’appliquer.');
          }
          if (previewRevision !== undefined && getContext().revision !== previewRevision) throw userError('La séance a changé pendant la relecture. Relisez les fiches avant d’appliquer.');
          for (const [, selection] of chosen) {
            const profile = (getContext().profiles || []).find(row => row.id === selection.profileId);
            if (!profile || profileSyncFingerprint(profile) !== selection.fingerprint) throw userError('Un profil a changé pendant la relecture. Relisez les fiches.');
          }
          await callbacks.onApply?.(chosen.map(([charId, selection]) => ({ charId, profileId: selection.profileId, snapshot: snapshots.find(item => item.charId === charId), links: selection.links, convert: selection.convert, equipmentLinks: selection.equipmentLinks, adoptActions: selection.adoptActions, replaceAssociation: selection.replaceAssociation === true, expectedProfileFingerprint: selection.fingerprint })), { expectedLocalRevision: previewRevision });
        } catch (cause) { error = userMessage(cause, 'Mise à jour non appliquée : réessayez.'); render(); }
      });
      apply.disabled = !chosen.length || duplicate || duplicateAdoption || unconfirmedReplacement;
      actions.append(apply, button('Relire les fiches', load, 'ghost'), button('Déconnexion', async () => {
        try { await source.signOut(); error = ''; } catch (cause) { fail(cause); }
        userName = ''; phase = 'signin'; render();
      }, 'ghost'));
    }
    actions.appendChild(button('Fermer', () => callbacks.onCancel?.(), 'ghost'));
    root.appendChild(actions); mount.appendChild(root);
    if (focusKey) mount.querySelector(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
  }

  return { render, start: check };
}
