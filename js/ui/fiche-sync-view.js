import { ficheSnapshot, matchFiches, planProfileSync, ficheErrorMessage } from '../core/fiche-sync.js';
import { userMessage } from './messages.js';

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
      snapshots = fetched.filter(item => item.data).map(item => ficheSnapshot(item.charId, item.data));
      missing = fetched.filter(item => !item.data).map(item => item.charId);
      const matches = matchFiches(snapshots, getContext().profiles || []);
      selections = new Map(snapshots.map(snapshot => [snapshot.charId, { profileId: matches[snapshot.charId], links: {}, convert: {} }]));
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
    choose.addEventListener('change', () => { selection.profileId = choose.value || null; selection.links = {}; selection.convert = {}; render(); });
    card.appendChild(labelled('Profil à mettre à jour', choose));

    const profile = pjs().find(item => item.id === selection.profileId);
    if (!profile) {
      const none = document.createElement('p'); none.className = 'muted';
      none.textContent = pjs().length ? 'Aucun profil PJ ne correspond : fiche ignorée tant qu’aucun profil n’est choisi.' : 'Aucun profil : la réserve ne contient pas de PJ.';
      card.appendChild(none);
      return card;
    }
    const plan = planProfileSync(snapshot, profile, selection);
    const changes = document.createElement('ul'); changes.className = 'fiche-sync-diff';
    plan.caracs.filter(item => item.changed).forEach(item => changes.appendChild(diffLine(item.key, item.old, item.new)));
    if (String(plan.initiative.old) !== String(plan.initiative.new)) changes.appendChild(diffLine('Initiative', plan.initiative.old, plan.initiative.new));
    if (!plan.hp.computable) changes.appendChild(diffLine('PV max', plan.hp.old, 'non calculable (F, E ou FM absente de la fiche) : inchangé'));
    else if (String(plan.hp.old) !== String(plan.hp.new)) changes.appendChild(diffLine('PV max', plan.hp.old, plan.hp.new));
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
        snapshot.skills.forEach(entry => skill.append(new Option(`${entry.name} (${entry.total})`, entry.name)));
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
      scope.textContent = 'La bibliothèque et les PJ déjà en combat seront mis à jour. En combat, les PV actuels, les états et le tour en cours sont conservés ; les PV maximum suivent la fiche.';
      root.appendChild(scope);
      snapshots.forEach(snapshot => root.appendChild(entryCard(snapshot)));
      if (missing.length) { const absent = document.createElement('p'); absent.className = 'muted'; absent.textContent = `Fiche absente : ${missing.join(', ')}.`; root.appendChild(absent); }
      const chosen = [...selections.entries()].filter(([, selection]) => selection.profileId);
      const duplicate = chosen.length !== new Set(chosen.map(([, selection]) => selection.profileId)).size;
      if (duplicate) { const warn = document.createElement('p'); warn.className = 'error'; warn.setAttribute('role', 'alert'); warn.textContent = 'Deux fiches visent le même profil : changez l’une des deux.'; root.appendChild(warn); }
      const apply = button(chosen.length ? `Appliquer (${plural(chosen.length, 'fiche')})` : 'Appliquer', async () => {
        apply.disabled = true;
        try {
          await callbacks.onApply?.(chosen.map(([charId, selection]) => ({ charId, profileId: selection.profileId, snapshot: snapshots.find(item => item.charId === charId), links: selection.links, convert: selection.convert })));
        } catch (cause) { error = userMessage(cause, 'Mise à jour non appliquée : réessayez.'); render(); }
      });
      apply.disabled = !chosen.length || duplicate;
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
