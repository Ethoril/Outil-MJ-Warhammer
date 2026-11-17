import { stateTraits } from '../core/creature-states.js';
import { engagedWith } from '../core/engagements.js';
import { psychologyTraits } from '../core/creature-psychology.js';
import { bondCellsOf } from '../core/map-link-state.js';

const hasKey = (participant, key) => stateTraits(participant).some(trait => trait.key === key);
const adversaries = (participant, participants) => participants.filter(item => item.zone === 'active' && item.id !== participant.id && item.camp !== participant.camp);

/**
 * Bloc des Traits d'état actifs de la carte : Nuée (engagés cochés, bouton de fin de Round) et Venin (cible, bouton).
 * `null` sans l'un de ces Traits.
 */
export function buildCreatureStatesBlock(createElement, participant, participants = []) {
  const swarm = hasKey(participant, 'swarm');
  const venom = hasKey(participant, 'venom');
  if (!swarm && !venom) return null;
  const block = createElement('div');
  block.className = 'actor-creature-states';
  const others = adversaries(participant, participants);
  const engaged = engagedWith({ participants }, participants, participant.id);
  if (swarm) {
    const label = createElement('span');
    label.textContent = 'Nuée, engagés :';
    block.appendChild(label);
    for (const item of others) {
      const wrap = createElement('label');
      const box = createElement('input');
      box.type = 'checkbox';
      box.className = 'swarm-engaged';
      box.value = item.id;
      // Engagements durables (spec engagements CA17) : les engagés du plateau sont cochés d'office, le MJ peut décocher.
      box.checked = engaged.includes(item.id);
      wrap.appendChild(box);
      const name = createElement('span');
      name.textContent = item.name || item.id;
      wrap.appendChild(name);
      block.appendChild(wrap);
    }
    const button = createElement('button');
    button.type = 'button';
    button.className = 'tiny btn-swarm-end-round';
    button.textContent = 'Fin de Round : 1 Blessure aux engagés';
    button.title = 'Chaque engagé coché perd 1 Blessure (annulable)';
    block.appendChild(button);
  }
  if (venom) {
    const label = createElement('span');
    label.textContent = 'Venin, cible blessée :';
    block.appendChild(label);
    const select = createElement('select');
    select.className = 'tiny venom-target';
    for (const item of others) {
      const option = createElement('option');
      option.value = item.id;
      option.textContent = item.name || item.id;
      select.appendChild(option);
    }
    block.appendChild(select);
    const button = createElement('button');
    button.type = 'button';
    button.className = 'tiny btn-creature-venom';
    button.textContent = 'Empoisonner';
    button.title = 'Une Blessure infligée : la cible devient Empoisonnée (annulable)';
    block.appendChild(button);
  }
  return block;
}

/** Engagés cochés (Nuée) et cible du Venin lus dans le bloc. */
export function readCreatureStatesInputs(block) {
  const boxes = block?.querySelectorAll ? [...block.querySelectorAll('.swarm-engaged')] : [];
  return { engagedIds: boxes.filter(box => box.checked).map(box => box.value), venomTargetId: block?.querySelector('.venom-target')?.value || null };
}

// ─────────── Traits calculés (chantier traits-calculs, L6) : Rencontre, boutons, marqueurs, pastilles ───────────
// Aucune règle ici : le bloc lit la fiche, le Store calcule. Une demande de dé passe par `ask` (dialogue des effets, D13) puis la commande est rejouée.

const hasPsy = (participant, key) => psychologyTraits(participant).some(trait => trait.key === key);
const traitNamed = (participant, pattern) => [...(participant.traits || []), ...(participant.extensions?.traits || [])]
  .some(trait => pattern.test(String(typeof trait === 'string' ? trait : trait?.name || trait?.key || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
const peers = (participant, participants) => participants.filter(item => item.zone === 'active' && item.id !== participant.id);
const nameOf = item => item.name || item.id;
const LOST_TURN_CAUSES = { stupid: 'Stupide', hungry: 'Affamé', 'divine-defensive-only': 'Engourdissement' };

function targetSelect(make, className, label, people) {
  const select = make('select');
  select.className = `tiny ${className}`;
  select.setAttribute('aria-label', label);
  for (const item of people) { const option = make('option'); option.value = item.id; option.textContent = nameOf(item); select.appendChild(option); }
  return select;
}
function action(make, className, text, name, title) {
  const button = make('button');
  button.type = 'button';
  button.className = `tiny ${className}`;
  button.dataset.traitAction = name;
  button.textContent = text;
  if (title) button.title = title;
  return button;
}
function checkbox(make, className, text, checked = false) {
  const wrap = make('label'), box = make('input'), span = make('span');
  box.type = 'checkbox'; box.className = className; box.checked = checked; span.textContent = text;
  wrap.append(box, span);
  return wrap;
}

/**
 * Bloc « Rencontre » et boutons de Traits de la fiche : Effrayé et Animosité (choix de la cible), Frénésie, Vampirique (Blessures
 * pré-remplies par `lastWounds`, Morsure et proie à cocher), Se cabrer (monture), Affamé (cadavre frais), cases de Bestial (D9).
 * `null` sans l'un de ces Traits.
 */
export function buildEncounterBlock(make, participant, participants = [], { lastWounds = null } = {}) {
  const afraid = hasPsy(participant, 'afraid'), animosity = hasPsy(participant, 'animosity'), frenzy = hasPsy(participant, 'frenzy');
  const hungry = hasPsy(participant, 'hungry'), bestial = hasPsy(participant, 'bestial'), vampiric = hasKey(participant, 'vampiric');
  const rear = Boolean(participant.extensions?.v5?.mountOf) || traitNamed(participant, /^(dresse|trained)/);
  if (!(afraid || animosity || frenzy || hungry || bestial || vampiric || rear)) return null;
  const block = make('div');
  block.className = 'actor-creature-traits';
  const others = peers(participant, participants);
  const row = text => { const span = make('span'); span.textContent = text; block.appendChild(span); };
  if (afraid || animosity) {
    row('Rencontre :');
    block.appendChild(targetSelect(make, 'encounter-target', 'Créature rencontrée', others));
    if (afraid) block.appendChild(action(make, 'btn-creature-encounter', 'Effrayé', 'afraid', 'Pose la Peur (2) venant de la créature rencontrée (annulable)'));
    if (animosity) block.appendChild(action(make, 'btn-creature-encounter', 'Animosité', 'animosity', 'Demande le Test de Calme devant la créature rencontrée (annulable)'));
  }
  if (frenzy) block.appendChild(action(make, 'btn-trait-frenzy', 'Entrer en Frénésie', 'frenzy', 'Demande le Test de Volonté ; réussi, pose la Frénésie (annulable)'));
  if (hungry) block.appendChild(action(make, 'btn-fresh-corpse', 'Cadavre frais', 'corpse', 'Demande le Test de Calme (+2 DR) devant un cadavre frais (annulable)'));
  if (vampiric) {
    row('Vampirique :');
    const wounds = make('input');
    wounds.type = 'number'; wounds.min = '0'; wounds.step = '1'; wounds.className = 'tiny vampiric-wounds';
    wounds.setAttribute('aria-label', 'Blessures infligées par la Morsure');
    wounds.value = Number.isInteger(lastWounds) && lastWounds > 0 ? String(lastWounds) : '';
    block.appendChild(wounds);
    block.appendChild(checkbox(make, 'vampiric-bite', 'Morsure'));
    block.appendChild(checkbox(make, 'vampiric-prey', 'proie admissible'));
    block.appendChild(action(make, 'btn-vampiric-heal', 'Soigner', 'vampiric', 'Regagne les Blessures saisies, sans dépasser le maximum (annulable)'));
  }
  if (rear) {
    block.appendChild(targetSelect(make, 'rear-target', 'Cible piétinée en se cabrant', others));
    block.appendChild(action(make, 'btn-rear-up', 'Se cabrer', 'rear', 'Piétinement à la place du déplacement, contre une créature plus petite (annulable)'));
  }
  if (bestial) {
    const flags = participant.extensions?.v5?.flags || {};
    for (const [flag, text] of [['protectsYoung', 'protège ses petits'], ['cornered', 'acculé']]) {
      const wrap = checkbox(make, `bestial-flag bestial-${flag}`, text, flags[flag] === true);
      wrap.children[0].dataset.flag = flag;
      block.appendChild(wrap);
    }
  }
  return block;
}

const walk = (root, found = []) => { for (const child of root?.children || []) { found.push(child); walk(child, found); } return found; };
const part = (block, className) => walk(block).find(item => String(item.className || '').split(' ').includes(className));

/**
 * Branche les boutons du bloc au Store, sans jamais supposer ses méthodes (`Store.methode?.()`). `ask(result, retry)` ouvre le dialogue des
 * demandes de dé et rejoue la commande avec la réponse ; `notify(message)` prévient le MJ ; `refresh()` redessine.
 */
export function bindEncounterBlock(block, { Store, participant, ask, notify = () => {}, refresh = () => {} } = {}) {
  if (!block) return;
  const id = participant.id;
  const read = className => part(block, className);
  const target = () => read('encounter-target')?.value || null;
  const calls = {
    afraid: inputs => Store?.applyCreatureEncounter?.(id, 'afraid', { targetId: target(), inputs }),
    animosity: inputs => Store?.applyCreatureEncounter?.(id, 'animosity', { targetId: target(), inputs }),
    frenzy: inputs => Store?.enterTraitFrenzy?.(id, { inputs }),
    corpse: inputs => Store?.markFreshCorpse?.(id, { inputs }),
    vampiric: () => Store?.applyVampiricHeal?.(id, { wounds: Number(read('vampiric-wounds')?.value), viaBite: read('vampiric-bite')?.checked === true, preyAdmissible: read('vampiric-prey')?.checked === true }),
    rear: () => Store?.rearUp?.(id, read('rear-target')?.value || null)
  };
  const run = async call => {
    try {
      let result = await call();
      if (result === undefined) { notify('Cette commande n’est pas disponible dans cette version.'); return; }
      if (result?.status === 'requires-input') result = await ask?.(result, answers => call(answers));
      if (result?.status === 'cancelled' || result == null) return;
      if (result.ok === false) { notify(result.message || 'Commande refusée.'); return; }
      refresh();
    } catch (error) { notify(error?.message || 'Commande non enregistrée.'); }
  };
  for (const button of walk(block).filter(item => item.dataset?.traitAction)) {
    const name = button.dataset.traitAction;
    button.addEventListener('click', event => { event?.preventDefault?.(); return run(inputs => calls[name](inputs)); });
  }
  for (const box of walk(block).filter(item => item.dataset?.flag)) {
    box.addEventListener('change', () => run(() => Store?.setCreatureFlag?.(id, box.dataset.flag, box.checked === true)));
  }
}

/**
 * Marqueurs et pastilles de la fiche : « tour perdu » (D8, avertissement : le MJ peut passer outre), total cumulé d'Increvable (D15)
 * et pastille de Bond (D16). `null` sans l'un d'eux.
 */
export function buildTraitStatusBlock(make, participant) {
  const v5 = participant.extensions?.v5 || {};
  const lines = [];
  if (v5.lostTurn) {
    const cause = LOST_TURN_CAUSES[v5.lostTurn.cause];
    // Engourdissement : seules les actions défensives restent permises (Dodge, Parade, défense opposée), pas un tour entièrement perdu.
    if (v5.lostTurn.cause === 'divine-defensive-only') lines.push(['trait-lost-turn', `Actions défensives seulement (${cause}) : pas d’attaque ni de Mouvement offensif ; esquive et parade restent permises.`]);
    else lines.push(['trait-lost-turn', `Tour perdu${cause ? ` (${cause})` : ''} : perd son Mouvement et son Action ; à jouer, ou à passer outre si le MJ en décide autrement.`]);
  }
  const dieHard = v5.dieHard;
  if (dieHard) {
    const state = dieHard.ended ? ' — suivi terminé' : Number.isFinite(dieHard.roundsLeft) ? ` — ${dieHard.roundsLeft} Round(s) restant(s)` : '';
    lines.push(['trait-die-hard', `Increvable : ${Number(dieHard.total) || 0} / 6 DR cumulés${state}`]);
  }
  const bond = bondCellsOf(participant);
  if (bond !== null) lines.push(['trait-bond', `Bond : Charge, Saut, Sprint à 2 × Course (${bond} cases)`]);
  if (!lines.length) return null;
  const block = make('div');
  block.className = 'actor-trait-status';
  for (const [className, text] of lines) { const chip = make('span'); chip.className = `trait-chip ${className}`; chip.textContent = text; block.appendChild(chip); }
  return block;
}

/** Case « corps intact » de la décision de mort (Increvable) ; `null` sans le Trait. */
export function buildBodyIntactControl(make, participant) {
  if (!hasKey(participant, 'diehard')) return null;
  const wrap = checkbox(make, 'body-intact', 'Corps intact (Increvable)');
  wrap.className = 'body-intact-control';
  return wrap;
}

/** Valeur de la case « corps intact » (faux sans case). */
export const readBodyIntact = control => part(control, 'body-intact')?.checked === true;
