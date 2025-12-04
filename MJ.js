(() => {
  // ---------- Utils ----------
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toLocaleTimeString();
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clampInt = (v, def=0)=> Number.isFinite(Number(v)) ? Number(v) : def;

  // Dice utils
  const d100 = () => Math.floor(Math.random()*100) + 1;
  const isDouble = (n) => n<=99 && n%11===0;
  // Calcul SL standard : Dizaines de la compétence - Dizaines du dé
  const SL = (target, roll) => Math.floor((target||0)/10) - Math.floor(roll/10);

  // Advantage rule (WFRP-like): ±10 per AV step
  const ADV_STEP = 10;
  const autoModForParticipant = (pid) => {
    if(!pid) return 0;
    const p = Store.getState().combat.participants.get(pid);
    const av = Number(p?.advantage || 0);
    if(!Number.isFinite(av)) return 0;
    return av * ADV_STEP;
  };

  // ---------- EventBus ----------
  const Bus = { _h:new Map(), on(e,f){ (this._h.get(e)||this._h.set(e,new Set()).get(e)).add(f); }, off(e,f){ this._h.get(e)?.delete(f); }, emit(e,p){ this._h.get(e)?.forEach(fn=>fn(p)); } };

  // ---------- Models ----------
  class Profile {
    constructor({ id=uid(), name, kind='PJ', initiative=30, hp=10, caracs={} } = {}) {
      this.id=id; this.name=(name||'Sans-nom').trim(); this.kind=kind;
      this.initiative=Number(initiative)||0; this.hp=Number(hp)||0; this.caracs={...caracs};
    }
  }
  class Participant {
    constructor({ id=uid(), profileId, name, kind, initiative=0, hp=10, advantage=0, states=[], subId='global' } = {}) {
      this.id=id; this.profileId=profileId||null; this.name=name||'—'; this.kind=kind||'Créature';
      this.initiative=Number(initiative)||0; this.hp=Number(hp)||0; this.advantage=Number(advantage)||0;
      this.states=[...states]; this.subId=subId;
    }
  }
  class SubFight { constructor({ id=uid(), name } = {}) { this.id=id; this.name=name||'Sous-combat'; } }
  
  // DiceLine améliorée
  class DiceLine {
    constructor({ id=uid(), participantId='', attr='Custom', base='', mod=0, note='', targetType='none', targetValue='', targetAttr='CC', opponentRoll='' }={}) {
      Object.assign(this, { id, participantId, attr, base, mod:Number(mod)||0, note, targetType, targetValue, targetAttr, opponentRoll });
    }
  }

  // ---------- Store + Persistence ----------
  const KEY = { RESERVE:'wfrp.reserve.v1', COMBAT:'wfrp.combat.v1', LOG:'wfrp.log.v1', DICE:'wfrp.dice.v1' };
  const Store = (() => {
    let reserve = new Map();
    let combat  = { round:0, turnIndex:-1, order:[], participants:new Map(), subs:[ new SubFight({id:'global', name:'Global'}) ] };
    let log = [];
    let diceLines = [];

    function save() {
      localStorage.setItem(KEY.RESERVE, JSON.stringify(Array.from(reserve.values())));
      const cObj = { round:combat.round, turnIndex:combat.turnIndex, order:combat.order, subs:combat.subs, participants:Array.from(combat.participants.values()) };
      localStorage.setItem(KEY.COMBAT, JSON.stringify(cObj));
      localStorage.setItem(KEY.LOG, JSON.stringify(log));
      localStorage.setItem(KEY.DICE, JSON.stringify(diceLines));
    }

    function load() {
      try {
        const r = JSON.parse(localStorage.getItem(KEY.RESERVE) || '[]');
        reserve = new Map(r.map(o => [o.id, new Profile(o)]));
        const c = JSON.parse(localStorage.getItem(KEY.COMBAT) || 'null');
        if (c) {
          combat.round = c.round || 0;
          combat.turnIndex = (c.turnIndex ?? -1);
          combat.order = Array.isArray(c.order) ? c.order : [];
          combat.subs = (c.subs || []).map(s => new SubFight(s));
          if (!combat.subs.find(s => s.id === 'global')) combat.subs.unshift(new SubFight({id:'global', name:'Global'}));
          combat.participants = new Map((c.participants || []).map(p => [p.id, new Participant(p)]));
        }
        log = JSON.parse(localStorage.getItem(KEY.LOG) || '[]');
        const d = JSON.parse(localStorage.getItem(KEY.DICE) || '[]');
        diceLines = (Array.isArray(d)?d:[]).map(x=>new DiceLine(x));
      } catch (e) { console.warn('Load error', e); }
    }

    function setOrderByInitiative() {
      const arr = Array.from(combat.participants.values());
      arr.sort((a,b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
      combat.order = arr.map(p => p.id);
    }

    const api = {
      addProfile(p){ reserve.set(p.id,p); save(); Bus.emit('reserve'); },
      removeProfile(id){ reserve.delete(id); save(); Bus.emit('reserve'); },
      listProfiles(){ return Array.from(reserve.values()); },
      getProfile(id){ return reserve.get(id) || null; },

      addParticipant(p){ combat.participants.set(p.id,p); this.rebuildOrder(); save(); Bus.emit('combat'); },
      removeParticipant(id){ combat.participants.delete(id); combat.order = combat.order.filter(x=>x!==id); save(); Bus.emit('
