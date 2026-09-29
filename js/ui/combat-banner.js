/**
 * Bandeau de combat persistant, affiché sous la barre du haut dans les trois
 * espaces. Il ne mute rien lui-même : l'avancement du tour et le retour dans
 * Jouer passent par les callbacks fournis par main.js.
 */
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

export function initCombatBanner({ Store, mount, onAdvance, onGoToPlay } = {}) {
  if (!mount) return { render() {}, isVisible: () => false };

  const inner = node('div', 'wrap combat-banner-inner');
  const title = node('span', 'combat-banner-title');
  const status = node('span', 'combat-banner-status');
  const track = node('ol', 'combat-banner-track');
  track.setAttribute('aria-label', 'Ordre du tour');
  const spacer = node('div', 'spacer');
  const back = node('button', 'ghost small combat-banner-back', 'Revenir au combat');
  back.type = 'button';
  const primary = node('button', 'combat-banner-primary');
  primary.type = 'button';
  inner.append(title, status, track, spacer, back, primary);
  mount.replaceChildren(inner);

  back.addEventListener('click', () => onGoToPlay?.());
  primary.addEventListener('click', () => onAdvance?.());
  window.addEventListener('resize', () => { if (!mount.hidden) render(); });

  let space = 'prepare';

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

    title.textContent = scene?.status === 'active' && scene.title ? scene.title : 'Combat en cours';

    const current = combat.currentActorId ? participants.get(combat.currentActorId) : null;
    const started = Number(combat.round) > 0 && Boolean(current);
    status.replaceChildren();
    if (started) {
      const name = node('strong', 'combatant-name', current.name);
      status.append(node('span', 'num', `Round ${combat.round}`), ' · tour de ', name);
    } else {
      status.textContent = 'Pas encore commencé';
    }

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
  }

  return {
    render,
    isVisible: () => !mount.hidden
  };
}
