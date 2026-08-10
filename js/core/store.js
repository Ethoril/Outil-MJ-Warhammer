import { Profile, Participant, DiceLine, uid } from './models.js';
import { sanitizeArray, sanitizeProfile, sanitizeParticipant } from './sanitize.js';

export const KEY = { RESERVE: 'wfrp.reserve.v1', COMBAT: 'wfrp.combat.v1', LOG: 'wfrp.log.v1', DICE: 'wfrp.dice.v1', TS: 'wfrp.sync.ts.v1' };

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function createStore({ storage = typeof localStorage !== 'undefined' ? localStorage : null, sync = null, bus = null, now = () => new Date().toLocaleTimeString() } = {}) {
  const CLIENT_ID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : uid();

  let reserve = new Map();
  let combat = { round: 0, currentActorId: null, order: [], participants: new Map() };
  let log = [];
  let diceLines = [];
  let lastAppliedTimestamp = 0;

  let batchDepth = 0;
  let savePending = false;
  const pendingEvents = new Set();

  function parseTimestamp(ts) {
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function emitBus(event, payload) {
    if (batchDepth > 0) {
      if (event === 'combat:update') {
        pendingEvents.add('combat');
      } else {
        pendingEvents.add(event);
      }
    } else {
      if (bus && bus.emit) bus.emit(event, payload);
    }
  }

  function repairMaxHp(list) {
    list.forEach(p => {
      if (p.maxHp === undefined || p.maxHp === null) {
        const prof = p.profileId ? reserve.get(p.profileId) : null;
        p.maxHp = prof ? Number(prof.hp) : Number(p.hp);
      }
    });
    return list;
  }

  function applyDataToState(data) {
    const rawReserve = sanitizeArray(data.reserve);
    const validProfiles = rawReserve.map(sanitizeProfile).filter(Boolean);
    if (rawReserve.length !== validProfiles.length)
      console.warn(`[Sync] ${rawReserve.length - validProfiles.length} profil(s) rejeté(s) (schéma invalide)`);
    reserve = new Map(validProfiles.map(o => [o.id, new Profile(o)]));

    const c = data.combat || {};
    combat.round = Number(c.round) || 0;

    const rawParts = sanitizeArray(c.participants);
    const validParts = repairMaxHp(rawParts.map(sanitizeParticipant).filter(Boolean));
    combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

    const validIds = new Set(combat.participants.keys());
    const rawOrder = sanitizeArray(c.order).filter(id => typeof id === 'string' && validIds.has(id));
    combat.order = rawOrder;

    if (c.currentActorId !== undefined) {
      combat.currentActorId = (typeof c.currentActorId === 'string' && validIds.has(c.currentActorId)) ? c.currentActorId : null;
    } else if (c.turnIndex !== undefined && Number(c.turnIndex) >= 0 && Number(c.turnIndex) < rawOrder.length) {
      combat.currentActorId = rawOrder[Number(c.turnIndex)] || null;
    } else {
      combat.currentActorId = null;
    }

    log = sanitizeArray(data.log).filter(s => typeof s === 'string');
    if (log.length > 300) log.length = 300;
    diceLines = sanitizeArray(data.diceLines).map(x => new DiceLine(x));
  }

  const syncFirebaseDebounced = debounce((payload) => {
    if (sync && sync.set && sync.dbRef) {
      sync.set(sync.dbRef, payload).catch(e => console.error('❌ Erreur sync → Firebase:', e));
    }
  }, 300);

  function persistLocal() {
    const rObj = Array.from(reserve.values());
    const cObj = {
      round: combat.round,
      currentActorId: combat.currentActorId,
      order: combat.order,
      participants: Array.from(combat.participants.values())
    };

    if (storage) {
      try {
        storage.setItem(KEY.RESERVE, JSON.stringify(rObj));
        storage.setItem(KEY.COMBAT, JSON.stringify(cObj));
        storage.setItem(KEY.LOG, JSON.stringify(log));
        storage.setItem(KEY.DICE, JSON.stringify(diceLines));
        if (lastAppliedTimestamp) {
          storage.setItem(KEY.TS, String(lastAppliedTimestamp));
        }
      } catch (e) {
        console.error('❌ Erreur de sauvegarde localStorage:', e);
        log.unshift(`[${now()}] ⚠️ Erreur de sauvegarde locale (quota dépassé ?)`);
        if (log.length > 300) log.length = 300;
      }
    }

    return { rObj, cObj };
  }

  function save() {
    if (batchDepth > 0) {
      savePending = true;
      return;
    }

    const ts = Date.now();
    lastAppliedTimestamp = ts;
    const { rObj, cObj } = persistLocal();

    const payload = {
      writer: CLIENT_ID,
      timestamp: ts,
      reserve: rObj,
      combat: cObj,
      log,
      diceLines
    };
    syncFirebaseDebounced(payload);
  }

  function load() {
    if (!storage) return;
    try {
      const r = JSON.parse(storage.getItem(KEY.RESERVE) || '[]');
      reserve = new Map(r.map(o => [o.id, new Profile(o)]));
      const c = JSON.parse(storage.getItem(KEY.COMBAT) || 'null');
      if (c) {
        combat.round = c.round || 0;
        combat.order = Array.isArray(c.order) ? c.order : [];
        const validParts = repairMaxHp((c.participants || []).map(sanitizeParticipant).filter(Boolean));
        combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

        const validIds = new Set(combat.participants.keys());
        if (c.currentActorId !== undefined) {
          combat.currentActorId = (typeof c.currentActorId === 'string' && validIds.has(c.currentActorId)) ? c.currentActorId : null;
        } else if (c.turnIndex !== undefined && Number(c.turnIndex) >= 0 && Number(c.turnIndex) < combat.order.length) {
          const migrated = combat.order[Number(c.turnIndex)];
          combat.currentActorId = validIds.has(migrated) ? migrated : null;
        } else {
          combat.currentActorId = null;
        }

        let repairedCount = 0;
        combat.participants.forEach(p => {
          if ((!p.caracs || Object.keys(p.caracs).length === 0) && p.profileId) {
            const prof = reserve.get(p.profileId);
            if (prof && prof.caracs) {
              p.caracs = { ...prof.caracs };
              repairedCount++;
            }
          }
        });
        if (repairedCount > 0) {
          console.log(`[Auto-Repair] ${repairedCount} combattants réparés.`);
          save();
        }
      }
      log = JSON.parse(storage.getItem(KEY.LOG) || '[]');
      if (!Array.isArray(log)) log = [];
      if (log.length > 300) log.length = 300;
      const d = JSON.parse(storage.getItem(KEY.DICE) || '[]');
      diceLines = (Array.isArray(d) ? d : []).map(x => new DiceLine(x));
      lastAppliedTimestamp = Number(storage.getItem(KEY.TS) || '0') || 0;
    } catch (e) { console.warn('Load error', e); }
  }

  function setOrderByInitiative() {
    const arr = Array.from(combat.participants.values());
    arr.sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
    combat.order = arr.map(p => p.id);
  }

  const api = {
    batch(fn) {
      batchDepth++;
      try {
        fn();
      } finally {
        batchDepth--;
        if (batchDepth === 0) {
          if (savePending) {
            savePending = false;
            save();
          }
          const events = Array.from(pendingEvents);
          pendingEvents.clear();
          if (bus && bus.emit) events.forEach(e => bus.emit(e));
        }
      }
    },

    addProfile(p) { reserve.set(p.id, p); save(); emitBus('reserve'); },
    updateProfile(id, patch) {
      const p = reserve.get(id); if (!p) return;
      Object.assign(p, patch);
      for (const part of combat.participants.values()) {
        if (part.profileId === id) {
          part.name = p.name;
          part.kind = p.kind;
          part.initiative = p.initiative;
          part.maxHp = p.hp;
          part.caracs = { ...p.caracs };
          part.armor = { ...p.armor };
        }
      }
      save(); emitBus('reserve'); emitBus('combat');
    },
    removeProfile(id) { reserve.delete(id); save(); emitBus('reserve'); },
    clearReserve() {
      const count = reserve.size;
      reserve.clear();
      save();
      emitBus('reserve');
      this.log(`Réserve: supprimé ${count} profil(s)`);
    },
    duplicateProfile(id) {
      const p = reserve.get(id); if (!p) return;
      let baseName = p.name; const match = p.name.match(/^(.*?)(\s\d+)?$/); if (match && match[2]) baseName = match[1];
      let maxNum = 0;
      for (const other of reserve.values()) {
        if (other.name === baseName) maxNum = Math.max(maxNum, 1);
        else if (other.name.startsWith(baseName + " ")) { const s = other.name.substring(baseName.length + 1); if (!isNaN(s)) maxNum = Math.max(maxNum, parseInt(s)); }
      }
      const newProfile = new Profile({ ...p, id: uid(), name: `${baseName} ${maxNum + 1}`, armor: { ...p.armor }, caracs: { ...p.caracs }, diceLines: p.diceLines });
      this.addProfile(newProfile);
    },
    listProfiles() { return Array.from(reserve.values()); },
    getProfile(id) { return reserve.get(id) || null; },

    addParticipant(p) { combat.participants.set(p.id, p); this.rebuildOrder(); save(); emitBus('combat'); },
    removeParticipant(id) {
      combat.participants.delete(id);
      combat.order = combat.order.filter(x => x !== id);
      if (combat.currentActorId === id) combat.currentActorId = null;
      save();
      emitBus('combat');
    },
    updateParticipant(id, patch) {
      const p = combat.participants.get(id);
      if (!p) return;
      Object.assign(p, patch);
      save();
      if ('zone' in patch) {
        emitBus('combat');
      } else {
        emitBus('combat:update', { id, patch });
      }
    },

    moveParticipant(id, zone, beforeId = null) {
      const p = combat.participants.get(id);
      if (!p) return;
      p.zone = zone;

      const remainingOrder = combat.order.filter(xId => xId !== id);
      const activeOrder = remainingOrder.filter(xId => combat.participants.get(xId)?.zone === 'active');
      const benchOrder = remainingOrder.filter(xId => combat.participants.get(xId)?.zone === 'bench');

      const targetArr = zone === 'active' ? activeOrder : benchOrder;
      if (beforeId && targetArr.includes(beforeId)) {
        const idx = targetArr.indexOf(beforeId);
        targetArr.splice(idx, 0, id);
      } else {
        targetArr.push(id);
      }

      combat.order = [...activeOrder, ...benchOrder];
      save();
      emitBus('combat');
    },

    listParticipants() { return combat.order.map(id => combat.participants.get(id)).filter(Boolean); },

    setRoundTurn(round, currentActorId) { combat.round = round; combat.currentActorId = currentActorId; save(); emitBus('combat'); },
    rebuildOrder() { setOrderByInitiative(); },

    getCombat() { return combat; },
    getReserve() { return reserve; },
    getDiceLines() { return diceLines; },
    getLog() { return log; },

    addDiceLine(dl) { diceLines.push(new DiceLine(dl)); save(); emitBus('combat'); },
    updateDiceLine(id, patch, noRender = false) {
      const i = diceLines.findIndex(x => x.id === id); if (i < 0) return;
      Object.assign(diceLines[i], patch); save();
      if (!noRender) emitBus('combat');
    },
    removeDiceLine(id) { diceLines = diceLines.filter(x => x.id !== id); save(); emitBus('combat'); },
    duplicateDiceLine(id) { const src = diceLines.find(x => x.id === id); if (!src) return; diceLines.push(new DiceLine({ ...src, id: uid() })); save(); emitBus('combat'); },

    importFromReserve(ids) {
      this.batch(() => {
        ids.forEach(id => {
          const prof = reserve.get(id); if (!prof) return;
          const p = new Participant({
            profileId: prof.id, name: prof.name, kind: prof.kind,
            initiative: prof.initiative, hp: prof.hp, maxHp: prof.hp,
            armor: { ...prof.armor }, caracs: { ...prof.caracs }, zone: 'bench'
          });
          this.addParticipant(p);

          if (prof.diceLines && Array.isArray(prof.diceLines)) {
            prof.diceLines.forEach(tpl => {
              this.addDiceLine(new DiceLine({
                participantId: p.id,
                base: tpl.base,
                note: tpl.note
              }));
            });
          }
        });
        this.log(`Import: ${ids.length} participant(s)`);
      });
    },
    exportToReserve() {
      let n = 0; combat.participants.forEach(p => { if (!p.profileId) return; const prof = reserve.get(p.profileId); if (!prof) return; prof.hp = p.hp; n++; });
      save(); this.log(`Export → Réserve: ${n} profil(s) mis à jour`); emitBus('reserve');
    },

    log(line) {
      log.unshift(`[${now()}] ${line}`);
      if (log.length > 300) log.length = 300;
      save();
      emitBus('log');
    },
    clearLog() { log = []; save(); emitBus('log'); },
    resetCombat() { combat = { round: 0, currentActorId: null, order: [], participants: new Map() }; save(); this.log('Combat terminé.'); emitBus('combat'); },

    getFullJSON() {
      const data = { timestamp: new Date().toISOString(), reserve: Array.from(reserve.values()), combat: { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, participants: Array.from(combat.participants.values()) }, log, diceLines };
      return JSON.stringify(data, null, 2);
    },
    loadFromJSON(jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (!data || !data.reserve || !data.combat) throw new Error('Format invalide');
        applyDataToState(data);
        save(); emitBus('reserve'); emitBus('combat'); emitBus('log'); this.log('📂 Données chargées.'); alert('Chargement réussi !');
      } catch (e) { alert('Erreur : ' + e.message); }
    }
  };

  load();
  if (combat.order.length === 0 && combat.participants.size > 0) { setOrderByInitiative(); }

  let syncListenerStarted = false;

  function startSyncListener() {
    if (syncListenerStarted) return;
    if (!(sync && sync.onValue && sync.dbRef)) return;
    syncListenerStarted = true;

    sync.onValue(sync.dbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      if (data.writer === CLIENT_ID) return;

      const incomingTs = parseTimestamp(data.timestamp);
      if (incomingTs && lastAppliedTimestamp && incomingTs < lastAppliedTimestamp) {
        console.warn('⚠️ Données serveur plus anciennes que l\'état local — ignorées');
        api.log('⚠️ Données serveur plus anciennes que l\'état local — réalignement serveur');
        save();
        return;
      }

      try {
        applyDataToState(data);
        if (incomingTs) {
          lastAppliedTimestamp = incomingTs;
        }
        persistLocal();
        if (bus && bus.emit) {
          bus.emit('reserve');
          bus.emit('combat');
          bus.emit('log');
        }
        console.log('🔄 Sync Firebase → Local');
      } catch (e) {
        console.error('❌ Erreur sync Firebase → Local:', e);
      }
    });
  }

  // L'authentification Firebase est asynchrone : le handle de synchro n'existe pas
  // encore quand main.js construit le Store. Sans ce point d'attache, sync resterait
  // null pour toujours et l'application tournerait en localStorage seul, sans erreur
  // ni symptôme visible.
  api.attachSync = (handle) => {
    if (!handle || syncListenerStarted) return;
    sync = handle;
    startSyncListener();
    save(); // pousse l'état local dès la connexion, l'arbitrage d'horodatage tranchera
  };

  startSyncListener();

  return api;
}
