import { parseState } from './sanitize.js';

export function computeEndOfTurn(p, d10Roll = 1) {
  if (!p || !p.states || !p.states.length) return { hpDelta: 0, newHp: p ? p.hp : 0, nextStates: p ? [...p.states] : [], logs: [] };

  const logs = [];
  let hpDelta = 0;

  // Hémorragique : -1 PV par niveau
  const hemorLevels = p.states.filter(s => parseState(s).name === 'Hémorragique').length;
  if (hemorLevels > 0) {
    hpDelta -= hemorLevels;
    logs.push(`🩸 ${p.name} : -${hemorLevels} PV (Hémorragie)`);
  }

  // Enflammé : 1d10 − BE − armure la plus faible + niveaux (plancher à 0)
  const flameLevels = p.states.filter(s => parseState(s).name === 'Enflammé').length;
  if (flameLevels > 0) {
    const be = Math.floor((p.caracs?.E || 0) / 10);
    const lowestArmor = Math.min(p.armor?.head || 0, p.armor?.body || 0, p.armor?.arms || 0, p.armor?.legs || 0);
    const fireDmg = Math.max(0, d10Roll - be - lowestArmor + flameLevels);
    hpDelta -= fireDmg;
    logs.push(`🔥 ${p.name} Enflammé ×${flameLevels} : 1d10(${d10Roll}) − BE(${be}) − armure(${lowestArmor}) + niveaux(${flameLevels}) = ${fireDmg} dégât(s)`);
  }

  // Durée des états + Surpris auto-dissipation
  const nextStates = [];
  p.states.forEach(s => {
    const { name, turns } = parseState(s);
    if (name === 'Surpris') { logs.push(`✓ ${p.name} : "Surpris" dissipé.`); return; }
    if (turns === null) { nextStates.push(s); return; }
    if (turns <= 1) { logs.push(`⏱ ${p.name} : "${name}" expiré.`); return; }
    nextStates.push(`${name}|${turns - 1}`);
  });

  // Inconscient si PV tombent à 0 suite à Hémorragie ou Enflammé
  const newHp = p.hp + hpDelta;
  if (hpDelta < 0 && newHp <= 0 && !nextStates.some(s => parseState(s).name === 'Inconscient')) {
    nextStates.push('Inconscient');
    logs.push(`💀 ${p.name} → Inconscient (PV à 0)`);
  }

  return { hpDelta, newHp, nextStates, logs };
}

export function createCombatEngine(Store) {
  function actorAtTurn() {
    const st = Store.getCombat();
    return st.currentActorId ? (st.participants.get(st.currentActorId) ?? null) : null;
  }

  function start() {
    const st = Store.getCombat();
    const activeParticipants = Array.from(st.participants.values())
      .filter(p => p.zone === 'active')
      .sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));

    if (activeParticipants.length === 0) {
      Store.log('Aucun combattant en zone active');
      return;
    }

    const round = st.round === 0 ? 1 : st.round;
    const firstActor = activeParticipants[0];
    Store.setRoundTurn(round, firstActor.id);
    Store.log(`Combat démarré. Round ${round}. Tour: ${firstActor.name}`);
  }

  function decrementStates(id) {
    const p = Store.getCombat().participants.get(id);
    if (!p) return;
    const d10Roll = (Math.floor(Math.random() * 100) + 1) % 10 + 1;
    const res = computeEndOfTurn(p, d10Roll);
    res.logs.forEach(l => Store.log(l));

    const patch = {};
    if (JSON.stringify(res.nextStates) !== JSON.stringify(p.states)) patch.states = res.nextStates;
    if (res.hpDelta !== 0) {
      patch.hp = res.newHp;
      Store.log(`${p.name} : PV ${p.hp} → ${res.newHp}`);
    }
    if (Object.keys(patch).length) Store.updateParticipant(id, patch);
  }

  function nextTurn() {
    const st = Store.getCombat();
    if (st.round === 0) return;
    const activeParticipants = Array.from(st.participants.values())
      .filter(p => p.zone === 'active')
      .sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
    if (activeParticipants.length === 0) return;

    const currentActor = actorAtTurn();
    if (currentActor) decrementStates(currentActor.id);

    const curIdx = activeParticipants.findIndex(p => p.id === st.currentActorId);
    let nextIdx;
    let newRound = st.round;
    if (curIdx < 0) {
      nextIdx = 0;
    } else {
      nextIdx = curIdx + 1;
      if (nextIdx >= activeParticipants.length) {
        nextIdx = 0;
        newRound++;
      }
    }
    const nextActor = activeParticipants[nextIdx];
    Store.setRoundTurn(newRound, nextActor.id);
    Store.log(`▶ ${nextIdx === 0 && curIdx >= 0 ? `Round ${newRound} — ` : ''}Tour de ${nextActor.name}`);
  }

  return { actorAtTurn, start, nextTurn, decrementStates };
}
