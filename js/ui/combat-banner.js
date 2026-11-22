/**
 * Bandeau de combat, fondu dans la barre du haut (refonte de l'interface, lot E0) : round, au tour de, compteur des
 * décisions en attente, Tour suivant ; hors de Jouer, l'ordre du tour et « Revenir au combat ». Il ne mute rien
 * lui-même : l'avancement du tour et le retour dans Jouer passent par les callbacks fournis par main.js.
 * « X agit hors de son tour » : écrit quand l'espace Jouer annonce (message `workspace-actor-change`, lot E1) qu'un clic sur la
 * frise a fait agir un autre combattant que celui dont c'est le tour ; la mention ne vaut que pour ce tour.
 * Lot E4c (CA24-CA25) : à côté de la mention, « Jouer son tour maintenant » donne le tour à ce combattant par la commande
 * annulable du store (`Store.playTurnNow`) ; grisé avec la raison quand le store la refuse (déjà joué ce round…).
 * Le compteur lit `getDecisionCount()` (par défaut le nombre de la case « À décider », lot E2) et reste vide à 0.
 */
import { showToast } from './toast.js';
import { pendingDecisionCount } from './combat-decisions.js';
const TRACK_LIMIT = 8;
// PV sous zéro affichés avec le signe moins U+2212.
const hpText = participant => {
  const hp = Number(participant.hp) || 0;
  return `${hp < 0 ? `−${Math.abs(hp)}` : hp}/${participant.maxHp ?? participant.hp}`;
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function initCombatBanner({ Store, mount, onAdvance, onGoToPlay, getDecisionCount = pendingDecisionCount } = {}) {
  if (!mount) return { render() {}, isVisible: () => false };

  const inner = node('div', 'combat-banner-inner');
  const status = node('span', 'combat-banner-status');
  // Hors de `status` (tronqué quand le nom est long) : la mention reste lisible.
  const away = node('span', 'combat-banner-offturn');
  away.hidden = true;
  const playNow = node('button', 'ghost small combat-banner-play-now', 'Jouer son tour maintenant');
  playNow.type = 'button';
  playNow.dataset.playTurnNow = '';
  playNow.hidden = true;
  const decisions = node('span', 'combat-banner-decisions num');
  decisions.dataset.decisionsCount = '0';
  decisions.setAttribute('role', 'status');
  decisions.hidden = true;
  const track = node('ol', 'combat-banner-track');
  track.setAttribute('aria-label', 'Ordre du tour');
  const spacer = node('div', 'spacer');
  const back = node('button', 'ghost small combat-banner-back', 'Revenir au combat');
  back.type = 'button';
  const primary = node('button', 'combat-banner-primary');
  primary.type = 'button';
  inner.append(status, away, playNow, decisions, track, spacer, back, primary);
  // D-15 : rappel tant que des Bmax sont divisées par le Fléau des Démons ; la restauration est une action MJ annulable.
  const daemon = node('div', 'combat-banner-reminder');
  daemon.dataset.daemonbaneReminder = '';
  daemon.setAttribute('role', 'status');
  const daemonText = node('span', 'combat-banner-reminder-text');
  const daemonRestore = node('button', 'ghost small combat-banner-restore', 'Restaurer les Bmax');
  daemonRestore.type = 'button';
  daemonRestore.dataset.action = 'restore-daemonbane';
  daemon.append(daemonText, daemonRestore);
  daemon.hidden = true;
  mount.replaceChildren(inner, daemon);
  daemonRestore.addEventListener('click', () => {
    daemonRestore.disabled = true;
    Promise.resolve(Store.restoreDaemonbaneMaxHp?.())
      .then(result => { if (result === false || result?.ok === false) throw result?.error || new Error('Restauration impossible.'); })
      .catch(error => showToast(`Restauration impossible : ${error?.message || 'réessayez.'}`, 'error'))
      .finally(() => { daemonRestore.disabled = false; render(); });
  });

  back.addEventListener('click', () => onGoToPlay?.());
  playNow.addEventListener('click', () => {
    const id = playNow.dataset.playTurnNow;
    if (!id) return;
    // Lot E7a : `main.js` intercepte la demande pour saisir les jets du début de tour de l'avancé ; sinon, appel direct.
    const View = playNow.ownerDocument?.defaultView;
    const request = View?.CustomEvent ? new View.CustomEvent('combat-play-turn-now', { bubbles: true, cancelable: true, detail: { id } }) : null;
    if (request && !playNow.dispatchEvent(request)) return;
    playNow.disabled = true;
    Promise.resolve().then(() => Store.playTurnNow?.(id))
      .then(result => { if (result === false || result?.ok === false) throw new Error(result?.message || 'commande refusée.'); })
      .catch(error => showToast(`Tour non avancé : ${error?.message || 'réessayez.'}`, 'error'))
      .finally(() => render());
  });
  primary.addEventListener('click', () => onAdvance?.());
  window.addEventListener('resize', () => { if (!mount.hidden) render(); });

  let space = 'prepare';
  // Dernière annonce de l'espace Jouer : { actorId, name, turnActorId, round } ou null.
  let offTurn = null;
  mount.ownerDocument.addEventListener('workspace-actor-change', event => {
    offTurn = event.detail || null;
    if (!mount.hidden) render();
  });

  // Retire les puces qui ne tiennent pas sur la ligne (jamais celle du tour en
  // cours) et les compte dans « +n ».
  function fitTrack(total) {
    const more = node('li', 'combat-banner-chip combat-banner-more num');
    const update = () => {
      const hidden = total - track.querySelectorAll('.combat-banner-chip:not(.combat-banner-more)').length;
      more.textContent = `+${hidden}`;
      more.title = `${hidden} autre(s) participant(s)`;
      if (hidden > 0 && !more.isConnected) track.appendChild(more);
    };
    update();
    while (track.scrollWidth > track.clientWidth) {
      const chips = [...track.querySelectorAll('.combat-banner-chip:not(.combat-banner-more):not(.is-current)')];
      if (!chips.length) break;
      chips[chips.length - 1].remove();
      update();
    }
  }

  function render(nextSpace = space) {
    space = nextSpace;
    const combat = Store.getCombat();
    const scene = Store.getActiveScene?.();
    const participants = combat.participants instanceof Map ? combat.participants : new Map();
    const visible = scene?.status === 'active' || participants.size > 0;
    mount.hidden = !visible;
    if (!visible) return;

    // Le titre de la scène n'occupe plus de place dans la barre : il reste lisible au survol.
    status.title = scene?.status === 'active' && scene.title ? scene.title : 'Combat en cours';

    const current = combat.currentActorId ? participants.get(combat.currentActorId) : null;
    const started = Number(combat.round) > 0 && Boolean(current);
    status.replaceChildren();
    if (started) {
      const name = node('strong', 'combatant-name', current.name);
      status.append(node('span', 'num', `Round ${combat.round}`), ' · au tour de ', name);
    } else {
      status.textContent = 'Pas encore commencé';
    }

    const awayNow = started && offTurn && offTurn.turnActorId === current.id && offTurn.round === Number(combat.round) && offTurn.actorId !== current.id && participants.has(offTurn.actorId);
    away.hidden = !awayNow;
    away.textContent = awayNow ? `${offTurn.name} agit hors de son tour` : '';
    away.title = awayNow ? 'Un clic sur « Tour suivant » reprend l’ordre ; le tour en cours n’a pas changé.' : '';
    const check = awayNow && typeof Store.playTurnNow === 'function' ? (Store.playTurnNowCheck?.(offTurn.actorId) || { ok: true }) : null;
    playNow.hidden = !check;
    playNow.dataset.playTurnNow = check ? offTurn.actorId : '';
    playNow.disabled = !check?.ok;
    playNow.title = !check ? '' : check.ok ? `${offTurn.name} joue son tour tout de suite ; « Tour suivant » reviendra ensuite à ${current.name}.`
      : `${offTurn.name} ne peut pas jouer son tour maintenant : ${check.reason}`;
    if (check && !check.ok) away.textContent += ` · ${check.reason}`;

    const outsidePlay = space !== 'play';
    track.hidden = !outsidePlay;
    back.hidden = !outsidePlay;
    spacer.hidden = outsidePlay;
    if (outsidePlay) {
      const order = (Store.getEffectiveOrder?.() || combat.order || [])
        .map(id => participants.get(id))
        .filter(Boolean);
      track.replaceChildren();
      order.slice(0, TRACK_LIMIT).forEach(participant => {
        const chip = node('li', 'combat-banner-chip');
        if (participant.id === combat.currentActorId) {
          chip.classList.add('is-current');
          chip.setAttribute('aria-current', 'true');
        }
        chip.title = participant.name;
        chip.append(
          node('span', 'combat-banner-chip-name combatant-name', participant.name),
          node('span', 'combat-banner-chip-hp num', `PV ${hpText(participant)}`)
        );
        track.appendChild(chip);
      });
      fitTrack(order.length);
    }

    if (started) {
      primary.textContent = 'Tour suivant';
      primary.title = 'Tour suivant (N)';
    } else {
      primary.textContent = 'Commencer le combat';
      primary.title = 'Commencer le combat (N)';
    }
    primary.disabled = participants.size === 0;

    let count = 0;
    try { count = Math.max(0, Number(getDecisionCount()) || 0); } catch { count = 0; }
    decisions.dataset.decisionsCount = String(count);
    decisions.hidden = count === 0;
    decisions.textContent = count ? `${count} à décider` : '';
    decisions.title = count ? `${count} décision${count > 1 ? 's' : ''} en attente : case « À décider », à droite` : '';

    const reductions = Store.listDaemonbaneReductions?.() || [];
    daemon.hidden = reductions.length === 0;
    daemonText.textContent = reductions.length
      ? `Fléau des Démons : Bmax divisées (${reductions.map(row => `${row.name} ${row.maxHp}/${row.originalMaxHp}`).join(', ')}). À restaurer en fin de rencontre.`
      : '';
  }

  return {
    render,
    isVisible: () => !mount.hidden
  };
}
