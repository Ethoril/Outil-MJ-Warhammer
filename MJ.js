(() => {
  // ---------- Utils ----------
  // Fonctions utilitaires génériques
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toLocaleTimeString();
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clampInt = (v, def=0)=> Number.isFinite(Number(v)) ? Number(v) : def;

  // Dice utils
  // Fonctions utilitaires pour les lancers de dés
  const d100 = () => Math.floor(Math.random()*100) + 1; // 1..100
  const isDouble = (n) => n<=99 && n%11===0; // Vérifie si un nombre est un double (ex: 11, 22, 33)
  const SL = (target, roll) => Math.floor((target||0)/10) - Math.floor(roll/10); // Calcule le niveau de succès

  // Advantage rule (WFRP-like): ±10 per AV step
  const ADV_STEP = 10;
  // Calcule le modificateur automatique basé sur l'avantage du participant
  const autoModForParticipant = (pid) => {
    if(!pid) return 0;
    const p = Store.getState().combat.participants.get(pid);
    const av = Number(p?.advantage || 0);
    if(!Number.isFinite(av)) return 0;
    return av * ADV_STEP;
  };

  // ---------- EventBus ----------
  // Système de publication/abonnement simple pour la communication entre les composants
  const Bus = { _h:new Map(), on(e,f){ (this._h.get(e)||this._h.set(e,new Set()).get(e)).add(f); }, off(e,f){ this._h.get(e)?.delete(f); }, emit(e,p){ this._h.get(e)?.forEach(fn=>fn(p)); } };

  // ---------- Models ----------
  // Classes pour structurer les données de l'application
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
  class DiceLine { constructor({ id=uid(), participantId='', attr='Custom', base='', mod=0, note='' }={}) { Object.assign(this, {id,participantId,attr,base,mod:Number(mod)||0,note}); } }

  // ---------- Store + Persistence ----------
  // Gère l'état de l'application et la persistance des données dans le localStorage
  const KEY = { RESERVE:'wfrp.reserve.v1', COMBAT:'wfrp.combat.v1', LOG:'wfrp.log.v1', DICE:'wfrp.dice.v1' };
  const Store = (() => {
    let reserve = new Map();
    let combat  = { round:0, turnIndex:-1, order:[], participants:new Map(), subs:[ new SubFight({id:'global', name:'Global'}) ] };
    let log = [];
    let diceLines = [];

    // Sauvegarde l'état actuel dans le localStorage
    function save() {
      localStorage.setItem(KEY.RESERVE, JSON.stringify(Array.from(reserve.values())));
      const cObj = { round:combat.round, turnIndex:combat.turnIndex, order:combat.order, subs:combat.subs, participants:Array.from(combat.participants.values()) };
      localStorage.setItem(KEY.COMBAT, JSON.stringify(cObj));
      localStorage.setItem(KEY.LOG, JSON.stringify(log));
      localStorage.setItem(KEY.DICE, JSON.stringify(diceLines));
    }

    // Charge l'état depuis le localStorage
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

    // Trie les participants par ordre d'initiative
    function setOrderByInitiative() {
      const arr = Array.from(combat.participants.values());
      arr.sort((a,b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
      combat.order = arr.map(p => p.id);
    }

    const api = {
      // API pour interagir avec le Store
      // Reserve
      addProfile(p){ reserve.set(p.id,p); save(); Bus.emit('reserve'); },
      removeProfile(id){ reserve.delete(id); save(); Bus.emit('reserve'); },
      listProfiles(){ return Array.from(reserve.values()); },
      getProfile(id){ return reserve.get(id) || null; },

      // Combat
      addParticipant(p){ combat.participants.set(p.id,p); this.rebuildOrder(); save(); Bus.emit('combat'); },
      removeParticipant(id){ combat.participants.delete(id); combat.order = combat.order.filter(x=>x!==id); save(); Bus.emit('combat'); },
      updateParticipant(id, patch){ const p = combat.participants.get(id); if(!p) return; Object.assign(p, patch); this.rebuildOrder(); save(); Bus.emit('combat'); },
      listParticipants(){ return combat.order.map(id=>combat.participants.get(id)).filter(Boolean); },
      listParticipantsRaw(){ return Array.from(combat.participants.values()); },
      addSub(name){ const s=new SubFight({name}); combat.subs.push(s); save(); Bus.emit('combat'); return s; },
      listSubs(){ return combat.subs; },
      setRoundTurn(round, turnIndex){ combat.round=round; combat.turnIndex=turnIndex; save(); Bus.emit('combat'); },
      rebuildOrder(){ setOrderByInitiative(); },
      getState(){ return { reserve, combat, log, diceLines }; },

      // Dice lines
      addDiceLine(dl){ diceLines.push(new DiceLine(dl)); save(); Bus.emit('dice'); },
      updateDiceLine(id, patch){ const i=diceLines.findIndex(x=>x.id===id); if(i<0) return; Object.assign(diceLines[i], patch); save(); Bus.emit('dice'); },
      removeDiceLine(id){ diceLines = diceLines.filter(x=>x.id!==id); save(); Bus.emit('dice'); },
      duplicateDiceLine(id){ const src=diceLines.find(x=>x.id===id); if(!src) return; diceLines.push(new DiceLine({...src, id:uid()})); save(); Bus.emit('dice'); },

      // Import/Export
      importFromReserve(ids, subId){
        ids.forEach(id => {
          const prof = reserve.get(id); if(!prof) return;
          const p = new Participant({ profileId: prof.id, name: prof.name, kind: prof.kind, initiative: prof.initiative, hp: prof.hp, subId });
          this.addParticipant(p);
        });
        this.log(`Import: ${ids.length} participant(s) → ${subId}`);
      },
      exportToReserve(){
        let n=0; combat.participants.forEach(p => { if(!p.profileId) return; const prof = reserve.get(p.profileId); if(!prof) return; prof.hp = p.hp; n++; });
        save(); this.log(`Export → Réserve: ${n} profil(s) mis à jour`); Bus.emit('reserve');
      },

      // Log
      log(line){ log.unshift(`[${now()}] ${line}`); save(); Bus.emit('log'); },
      clearLog(){ log=[]; save(); Bus.emit('log'); },

      // Reset
      resetCombat(){ combat = { round:0, turnIndex:-1, order:[], participants:new Map(), subs:[ new SubFight({id:'global', name:'Global'}) ] }; save(); Bus.emit('combat'); }
    };

    load();
    api.rebuildOrder();
    return api;
  })();

  // ---------- Combat engine ----------
  // Gère la logique du déroulement du combat (tours et rounds)
  const Combat = (() => {
    function actorAtTurn(){ const st = Store.getState().combat; const id = st.order[st.turnIndex]; return id ? st.participants.get(id) : null; }
    function start(){ const st = Store.getState().combat; if(st.order.length===0) return; if(st.round===0) st.round=1; if(st.turnIndex===-1) st.turnIndex=0; Store.log(`Combat démarré. Round ${st.round}. Tour: ${actorAtTurn()?.name ?? '—'}`); Store.setRoundTurn(st.round, st.turnIndex); }
    function next(){ const st = Store.getState().combat; if(st.order.length===0) return; if(st.turnIndex===-1){ start(); return; } let ti = st.turnIndex + 1, rd = st.round; if(ti >= st.order.length){ ti = 0; rd++; Store.log(`→ Nouveau round ${rd}`); } Store.setRoundTurn(rd, ti); Store.log(`Tour: ${actorAtTurn()?.name ?? '—'}`); }
    return { actorAtTurn, start, next };
  })();

  // ---------- DOM refs ----------
  const els = {
    panels:{ reserve: qs('#panel-reserve'), combat: qs('#panel-combat') },
    tabs: qsa('.tab'),
    reserveList: qs('#reserve-list'),
    searchReserve: qs('#search-reserve'),
    formAdd: qs('#form-add'),
    seedReserve: qs('#seed-reserve'),
    clearReserve: qs('#clear-reserve'),
    // Combat
    combatList: qs('#combat-list'),
    searchCombat: qs('#search-combat'),
    pillRound: qs('#pill-round'), pillTurn: qs('#pill-turn'), pillSub: qs('#pill-sub'),
    btnImport: qs('#btn-import'), btnExport: qs('#btn-export'),
    btnStart: qs('#btn-start'), btnNext: qs('#btn-next'), btnReset: qs('#btn-reset'),
    btnNewSub: qs('#btn-new-sub'),
    dlgImport: qs('#dlg-import'), importList: qs('#import-list'), selSub: qs('#sel-sub'), confirmImport: qs('#confirm-import'),
    log: qs('#log'), btnClearLog: qs('#btn-clear-log'),

    // Jet instantané
    diPart: qs('#dicei-participant'), diAttr: qs('#dicei-attr'), diBaseWrap: qs('#dicei-base-wrap'),
    diBase: qs('#dicei-base'), diMod: qs('#dicei-mod'), diNote: qs('#dicei-note'),
    diAuto: qs('#dicei-auto'), diTarget: qs('#dicei-target'), diRoll: qs('#dicei-roll'), diResult: qs('#dicei-result'),

    // Lignes préparées
    diceLines: qs('#dice-lines'), diceAdd: qs('#dice-add'), diceRollAll: qs('#dice-roll-all'), dicePrepResults: qs('#dice-prep-results'),

    // Jets rapides
    quickResults: qs('#dice-quick-results'),

    // Templates
    tplActor: qs('#tpl-actor')
  };

  // ---------- Tabs ----------
  els.tabs.forEach(t => t.addEventListener('click', () => {
    els.tabs.forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
    const k = t.dataset.tab;
    Object.values(els.panels).forEach(p => p.classList.remove('is-active'));
    (k==='reserve' ? els.panels.reserve : els.panels.combat).classList.add('is-active');
  }));

  // ---------- Reserve render ----------
  function renderReserve(){
    const term = (els.searchReserve.value || '').toLowerCase();
    const list = Store.listProfiles().filter(p => p.name.toLowerCase().includes(term));
    els.reserveList.replaceChildren(...list.map(p => renderReserveItem(p)));
    renderDiceLines();
    renderInstantParticipants();
  }
  function renderReserveItem(p){
    const div = document.createElement('div'); div.className='item';
    const left = document.createElement('div');
    const right = document.createElement('div'); right.className='row';
    left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> <span class="meta">(${p.kind})</span></div>
                      <div class="meta">Init ${p.initiative} • PV ${p.hp}</div>`;
    const btnDel = btn('Suppr', ()=>{ Store.removeProfile(p.id); Store.log(`Réserve: supprimé ${p.name}`); });
    btnDel.classList.add('danger','ghost');
    right.append(btnDel);
    div.append(left,right);
    return div;
  }

  // Add profile
  els.formAdd.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(els.formAdd);
    const caracs = {}; ['CC','CT','F','E','I','Ag','Dex','Int','FM','Soc'].forEach(k => {
      const raw = fd.get(k); if(raw!==null && raw!==''){ const v = Number(raw); if(Number.isFinite(v)) caracs[k]=v; }
    });
    const prof = new Profile({ name: fd.get('name'), kind: fd.get('kind'), initiative: Number(fd.get('initiative')||0), hp: Number(fd.get('hp')||0), caracs });
    Store.addProfile(prof); els.formAdd.reset(); Store.log(`Réserve: ajouté ${prof.name}`);
  });
  els.seedReserve.addEventListener('click', ()=>{
    [ new Profile({name:'Renaut de Volargent', kind:'PJ', initiative:41, hp:14, caracs:{CC:52, Ag:41}}),
      new Profile({name:'Saskia la Noire', kind:'PJ', initiative:52, hp:12, caracs:{CC:45, Ag:52}}),
      new Profile({name:'Gobelins (2)', kind:'Créature', initiative:28, hp:9, caracs:{CC:35}}),
      new Profile({name:'Chien de guerre', kind:'Créature', initiative:36, hp:10, caracs:{CC:40}})
    ].forEach(Store.addProfile);
    Store.log('Seed Réserve: 4 profils');
  });
  els.clearReserve.addEventListener('click', ()=>{ if(confirm('Vider toute la Réserve ?')){ localStorage.removeItem(KEY.RESERVE); location.reload(); } });
  els.searchReserve.addEventListener('input', renderReserve);

  // ---------- Import modal ----------
  els.btnImport.addEventListener('click', ()=>{
    const subs = Store.listSubs(); els.selSub.replaceChildren(...subs.map(s => opt(s.id, s.name)));
    const profs = Store.listProfiles(); els.importList.replaceChildren(...profs.map(p => importRow(p)));
    els.dlgImport.showModal();
  });
  els.confirmImport.addEventListener('click', (e)=>{
    e.preventDefault();
    const ids = Array.from(els.importList.querySelectorAll('input[type=checkbox]:checked')).map(ch => ch.value);
    const subId = els.selSub.value || 'global';
    Store.importFromReserve(ids, subId);
    els.dlgImport.close();
  });

  // Export back
  els.btnExport.addEventListener('click', ()=>{ if(confirm('Appliquer PV aux profils correspondants ?')) Store.exportToReserve(); });

  function importRow(p){
    const row = document.createElement('div'); row.className='item';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(p.name)}</strong> <span class="meta">(${p.kind})</span> <span class="meta">Init ${p.initiative} • PV ${p.hp}</span>`;
    const right = document.createElement('div'); right.className='row';
    const chk = document.createElement('input'); chk.type='checkbox'; chk.value=p.id; right.append(chk);
    row.append(left,right);
    return row;
  }
  function opt(v, t){ const o=document.createElement('option'); o.value=v; o.textContent=t; return o; }

  // ---------- Combat rendering ----------
  function renderCombat(){
    const { combat } = Store.getState();
    els.pillRound.textContent = `Round: ${combat.round}`;
    els.pillTurn.textContent  = `Tour: ${Combat.actorAtTurn()?.name ?? '–'}`;
    els.pillSub.textContent   = `Sous-combat: ${combat.subs.find(s=>s.id===currentSub())?.name||'global'}`;

    const term = (els.searchCombat.value || '').toLowerCase();
    const frag = document.createDocumentFragment();
    Store.listParticipants().forEach(p=>{
      if(term && !p.name.toLowerCase().includes(term)) return;
      frag.append(renderParticipant(p));
    });
    els.combatList.replaceChildren(frag);

    renderDiceLines();
    renderInstantParticipants();
  }

  function renderParticipant(p){
    const li = els.tplActor.content.firstElementChild.cloneNode(true);
    if(Combat.actorAtTurn()?.id===p.id) li.classList.add('turn');
    li.dataset.id = p.id;
    li.querySelector('.name').textContent = p.name + (p.subId!=='global'? ` [${getSubName(p.subId)}]` : '');

    const chips = li.querySelector('.chips');
    const initBadge = badge(`Init ${p.initiative}`, 'clickable');
    initBadge.title = 'Cliquer pour modifier l’Initiative';
    initBadge.addEventListener('click', ()=>{
      const v = prompt('Nouvelle valeur d’Initiative ?', p.initiative);
      if(v===null) return;
      const nv = Number(v);
      if(!Number.isFinite(nv)) return alert('Valeur invalide');
      const prev = p.initiative;
      Store.updateParticipant(p.id, { initiative: nv });
      Store.log(`${p.name}: Initiative ${prev} → ${nv}`);
    });

    chips.append(initBadge, badge(`PV ${p.hp}`), badge(`AV ${p.advantage}`));

    const states = li.querySelector('.states'); p.states.forEach(s => states.append(badge(s,'warn')));
    li.querySelector('.btn-adv-plus').addEventListener('click',()=> setAdv(p.id, p.advantage+1));
    // plus de clamp à 0 : AV peut être négatif
    li.querySelector('.btn-adv-minus').addEventListener('click',()=> setAdv(p.id, p.advantage-1));
    li.querySelector('.btn-hp-minus').addEventListener('click',()=> setHP(p.id, p.hp-1));
    li.querySelector('.btn-hp-plus').addEventListener('click',()=> setHP(p.id, p.hp+1));
    li.querySelector('.btn-state').addEventListener('click',()=> toggleState(p.id,'Blessé'));

    // 🎲 Jet rapide — popover non bloquant
    li.querySelector('.btn-quick-roll').addEventListener('click', (ev)=> openQuickRollPopover(li, p.id, p.name, ev));

    li.querySelector('.btn-remove').addEventListener('click',()=>{ Store.removeParticipant(p.id); Store.log(`Combat: retiré ${p.name}`); });
    return li;
  }

  // Actions
  function setAdv(id, val){ const p=getP(id); if(!p) return; const prev=p.advantage; Store.updateParticipant(id,{advantage:val}); Store.log(`${p.name}: AV ${prev} → ${val}`); renderInstantParticipants(); }
  function setHP(id, val){ const p=getP(id); if(!p) return; const prev=p.hp; Store.updateParticipant(id,{hp:val}); Store.log(`${p.name}: PV ${prev} → ${val}`); }
  function toggleState(id, label){ const p=getP(id); if(!p) return; const has=p.states.includes(label); const ns=has? p.states.filter(x=>x!==label) : [...p.states,label]; Store.updateParticipant(id,{states:ns}); Store.log(`${p.name}: ${has?'−':'+'}État « ${label} »`); }
  function getP(id){ return Store.getState().combat.participants.get(id); }

  // Sub-combats
  function currentSub(){ return 'global'; }
  function getSubName(id){ return Store.listSubs().find(s=>s.id===id)?.name || 'global'; }
  els.btnNewSub.addEventListener('click',()=>{ const name = prompt('Nom du sous-combat ?'); if(!name) return; const s = Store.addSub(name); Store.log(`Sous-combat créé: ${s.name}`); });

  // Log
  els.btnClearLog.addEventListener('click',()=> Store.clearLog());
  Bus.on('log', ()=>{ const arr = Store.getState().log; const frag = document.createDocumentFragment(); arr.forEach(line=>{ const div=document.createElement('div'); div.className='entry'; div.textContent=line; frag.append(div); }); els.log.replaceChildren(frag); });

  // ---------- Jet instantané ----------
  function renderInstantParticipants(){
    const cur = els.diPart.value;
    const opts = [opt('','— Libre —')];
    Store.listParticipantsRaw().forEach(p => opts.push(opt(p.id, p.name + (p.profileId?'':' (ad hoc)'))));
    els.diPart.replaceChildren(...opts);
    if([...els.diPart.options].some(o=>o.value===cur)) els.diPart.value = cur;
    recomputeInstantTarget();
  }
  // Calcule la cible pour un jet de dés instantané
  function recomputeInstantTarget(){
    const pid = els.diPart.value;
    const attr = els.diAttr.value;
    els.diBaseWrap.style.display = (attr==='Custom' ? '' : 'none');

    let base = null;
    if(attr==='Custom'){
      base = clampInt(els.diBase.value, 0);
    } else {
      const p = pid ? Store.listParticipantsRaw().find(x=>x.id===pid) : null;
      if(attr==='initiative') base = p ? Number(p.initiative||0) : null;
      else if(p?.profileId){
        const prof = Store.getProfile(p.profileId);
        base = Number(prof?.caracs?.[attr] ?? NaN);
        if(!Number.isFinite(base)) base=null;
      }
    }
    const modManual = clampInt(els.diMod.value, 0);
    const modAuto = autoModForParticipant(pid);
    els.diAuto.textContent = `${modAuto>=0?'+':''}${modAuto} (AV)`;
    const tgt = Number.isFinite(base) ? base + (modManual + modAuto) : null;
    els.diTarget.textContent = Number.isFinite(tgt) ? String(tgt) : '—';
    return { base, modManual, modAuto, tgt };
  }
  els.diPart.addEventListener('change', recomputeInstantTarget);
  els.diAttr.addEventListener('change', recomputeInstantTarget);
  els.diBase.addEventListener('input', recomputeInstantTarget);
  els.diMod.addEventListener('input', recomputeInstantTarget);

  els.diRoll.addEventListener('click', ()=>{
    const { tgt, modManual, modAuto } = recomputeInstantTarget();
    const who = els.diPart.value ? (Store.listParticipantsRaw().find(x=>x.id===els.diPart.value)?.name||'—') : '—';
    const attr = els.diAttr.value;
    const note = (els.diNote.value||'').trim();

    const roll = d100();
    const success = Number.isFinite(tgt) && roll <= tgt;
    const sl = Number.isFinite(tgt) ? SL(tgt, roll) : null;
    const dbl = isDouble(roll);
    const crit = dbl ? (success ? 'Critique' : 'Maladresse') : null;

    const res = document.createElement('div');
    res.className='dice-result';
    res.innerHTML = `
      <span class="dice-rollvalue">1d100 = ${roll}</span>
      ${Number.isFinite(tgt)? `<span class="${success?'result-good':'result-bad'}">${success?'Réussite':'Échec'}</span>
                                <span class="${sl>=0?'result-good':'result-bad'}">SL ${sl>=0?'+':''}${sl}</span>` : `<span class="result-warn">Sans cible</span>`}
      ${who!=='—' ? `<span class="badge">${escapeHtml(who)}</span>` : ''}
      ${attr && attr!=='Custom' ? `<span class="badge">${escapeHtml(attr)}</span>` : ''}
      ${modManual ? `<span class="badge ${modManual>=0?'good':'bad'}">Mod ${modManual>=0?'+':''}${modManual}</span>` : ''}
      ${modAuto ? `<span class="badge ${modAuto>=0?'good':'bad'}">Auto ${modAuto>=0?'+':''}${modAuto} (AV)</span>` : ''}
      ${note ? `<span class="badge warn">${escapeHtml(note)}</span>` : ''}
      ${crit ? `<span class="badge ${success?'good':'bad'}">${crit}</span>` : ''}
    `;
    els.diResult.replaceChildren(res);

    const head = note ? note : `Jet ${attr==='Custom'?'personnalisé':attr}`;
    const tgtTxt = Number.isFinite(tgt) ? ` | Cible ${tgt}` : '';
    const extras = []; if(crit) extras.push(crit);
    if(modManual) extras.push(`Mod ${modManual>=0?'+':''}${modManual}`);
    if(modAuto) extras.push(`Auto ${modAuto>=0?'+':''}${modAuto} (AV)`);
    Store.log(`🎲 ${head}${who!=='—'?` (${who})`:''}${tgtTxt} → d100=${roll}${Number.isFinite(tgt)?` • ${success?'Réussite':'Échec'} • SL ${sl>=0?'+':''}${sl}`:''}${extras.length?` • ${extras.join(' • ')}`:''}`);
  });

  // ---------- Lignes préparées ----------
  els.diceAdd.addEventListener('click', ()=> Store.addDiceLine(new DiceLine()));
  els.diceRollAll.addEventListener('click', ()=>{
    const { diceLines } = Store.getState();
    diceLines.forEach(dl => runDiceLine(dl.id));
  });

  function renderDiceLines(){
    const { diceLines } = Store.getState();
    const frag = document.createDocumentFragment();
    diceLines.forEach(dl => frag.append(renderDiceLine(dl)));
    els.diceLines.replaceChildren(frag);
  }

  function renderDiceLine(dl){
    const wrap = document.createElement('div'); wrap.className='dice-line'; wrap.dataset.id = dl.id;

    const selP = document.createElement('select');
    selP.append(opt('','— Libre —'), ...Store.listParticipantsRaw().map(p=>opt(p.id, p.name + (p.profileId?'':' (ad hoc)'))));
    selP.value = dl.participantId || '';
    const labP = labelWrap('Participant', selP);

    const selA = document.createElement('select');
    ['Custom','CC','CT','F','E','I','Ag','Dex','Int','FM','Soc','initiative'].forEach(a=> selA.append(opt(a, a==='initiative'?'Initiative':a)));
    selA.value = dl.attr || 'Custom';
    const labA = labelWrap('Caractéristique', selA);

    const inBase = document.createElement('input'); inBase.type='number'; inBase.value = dl.base ?? '';
    const labB = labelWrap('Base (Custom)', inBase);

    const inMod = document.createElement('input'); inMod.type='number'; inMod.value = dl.mod ?? 0;
    const labM = labelWrap('Modificateur', inMod);

    const inNote = document.createElement('input'); inNote.placeholder="Note"; inNote.value = dl.note||'';
    const labN = labelWrap('Note', inNote);

    const act = document.createElement('div'); act.className='actions';
    const bRoll = btn('Lancer', ()=> runDiceLine(dl.id));
    const bDup  = btn('Dupliquer', ()=> Store.duplicateDiceLine(dl.id));
    const bDel  = btn('Supprimer', ()=> Store.removeDiceLine(dl.id));
    act.append(bRoll, bDup, bDel);

    wrap.append(labP, labA, labM, labN, act);
    if(selA.value==='Custom') wrap.insertBefore(labB, labM);

    function save(){ Store.updateDiceLine(dl.id, {
      participantId: selP.value, attr: selA.value,
      base: selA.value==='Custom' ? clampInt(inBase.value, 0) : '',
      mod: clampInt(inMod.value, 0),
      note: inNote.value
    }); }

    selP.addEventListener('change', save);
    selA.addEventListener('change', ()=>{ if(selA.value==='Custom' && !wrap.contains(labB)) wrap.insertBefore(labB, labM); if(selA.value!=='Custom' && wrap.contains(labB)) wrap.removeChild(labB); save(); });
    inBase.addEventListener('input', save);
    inMod.addEventListener('input', save);
    inNote.addEventListener('input', save);

    return wrap;
  }

  // Exécute un lancer de dés pour une ligne préparée
  function runDiceLine(id){
    const st = Store.getState();
    const dl = st.diceLines.find(x=>x.id===id); if(!dl) return;

    let base=null;
    if(dl.attr==='Custom'){ base = clampInt(dl.base, 0); }
    else{
      const p = dl.participantId ? st.combat.participants.get(dl.participantId) : null;
      if(dl.attr==='initiative') base = p ? Number(p.initiative||0) : null;
      else if(p?.profileId){
        const prof = Store.getProfile(p.profileId);
        base = Number(prof?.caracs?.[dl.attr] ?? NaN);
        if(!Number.isFinite(base)) base=null;
      }
    }
    const modManual = clampInt(dl.mod, 0);
    const modAuto = autoModForParticipant(dl.participantId);
    const target = Number.isFinite(base) ? base + (modManual + modAuto) : null;

    const roll = d100();
    const success = Number.isFinite(target) && roll <= target;
    const sl = Number.isFinite(target) ? SL(target, roll) : null;
    const dbl = isDouble(roll);
    const crit = dbl ? (success ? 'Critique' : 'Maladresse') : null;

    const res = document.createElement('div'); res.className='dice-result';
    res.innerHTML = `
      <span class="dice-rollvalue">1d100 = ${roll}</span>
      ${Number.isFinite(target)? `<span class="${success?'result-good':'result-bad'}">${success?'Réussite':'Échec'}</span>
                                  <span class="${sl>=0?'result-good':'result-bad'}">SL ${sl>=0?'+':''}${sl}</span>` : `<span class="result-warn">Sans cible</span>`}
      ${dl.participantId ? `<span class="badge">${escapeHtml(st.combat.participants.get(dl.participantId)?.name||'?')}</span>` : ''}
      ${(dl.attr && dl.attr!=='Custom') ? `<span class="badge">${escapeHtml(dl.attr==='initiative'?'Initiative':dl.attr)}</span>` : ''}
      ${modManual ? `<span class="badge ${modManual>=0?'good':'bad'}">Mod ${modManual>=0?'+':''}${modManual}</span>` : ''}
      ${modAuto ? `<span class="badge ${modAuto>=0?'good':'bad'}">Auto ${modAuto>=0?'+':''}${modAuto} (AV)</span>` : ''}
      ${dl.note ? `<span class="badge warn">${escapeHtml(dl.note)}</span>` : ''}
      ${crit ? `<span class="badge ${success?'good':'bad'}">${crit}</span>` : ''}
    `;
    els.dicePrepResults.prepend(res);

    const who = dl.participantId ? ` (${st.combat.participants.get(dl.participantId)?.name||'?'})` : '';
    const head = dl.note ? dl.note : `Jet ${dl.attr==='Custom'?'personnalisé':dl.attr}`;
    const tgtTxt = Number.isFinite(target) ? ` | Cible ${target}` : '';
    const extras = [];
    if(crit) extras.push(crit);
    if(modManual) extras.push(`Mod ${modManual>=0?'+':''}${modManual}`);
    if(modAuto) extras.push(`Auto ${modAuto>=0?'+':''}${modAuto} (AV)`);
    Store.log(`🎲 ${head}${who}${tgtTxt} → d100=${roll}${Number.isFinite(target)?` • ${success?'Réussite':'Échec'} • SL ${sl>=0?'+':''}${sl}`:''}${extras.length?` • ${extras.join(' • ')}`:''}`);
  }

  // ---------- Quick Roll popover (non bloquant) ----------
  let openPopover = null;
  function openQuickRollPopover(cardEl, pid, name, event){
    closePopover(); // un seul à la fois
    const pop = document.createElement('div');
    pop.className='popover';
    pop.innerHTML = `
      <button class="close" title="Fermer">✕</button>
      <div class="row"><strong>${escapeHtml(name)}</strong></div>
      <label>Caractéristique
        <select class="qr-attr">
          <option value="Custom">Custom</option>
          <option value="CC">CC</option><option value="CT">CT</option><option value="F">F</option><option value="E">E</option>
          <option value="I">I</option><option value="Ag">Ag</option><option value="Dex">Dex</option><option value="Int">Int</option>
          <option value="FM">FM</option><option value="Soc">Soc</option><option value="initiative">Initiative</option>
        </select>
      </label>
      <label class="qr-base-wrap">Base (Custom)
        <input class="qr-base" type="number" value="0">
      </label>
      <label>Modificateur
        <input class="qr-mod" type="number" value="0">
      </label>
      <div class="row">
        <span class="pill">Auto <span class="qr-auto readonly">+0 (AV)</span></span>
        <span class="pill">Cible <span class="qr-target readonly">—</span></span>
      </div>
      <div class="row">
        <button class="qr-roll">Lancer d100</button>
      </div>
    `;
    cardEl.appendChild(pop);
    openPopover = pop;

    const selA = pop.querySelector('.qr-attr');
    const baseWrap = pop.querySelector('.qr-base-wrap');
    const inBase = pop.querySelector('.qr-base');
    const inMod = pop.querySelector('.qr-mod');
    const lblAuto = pop.querySelector('.qr-auto');
    const lblTarget = pop.querySelector('.qr-target');

    function recompute(){
      const attr = selA.value;
      baseWrap.style.display = (attr==='Custom') ? '' : 'none';

      let base = null;
      const st = Store.getState();
      const p = st.combat.participants.get(pid);
      if(attr==='Custom') base = clampInt(inBase.value, 0);
      else if(attr==='initiative') base = Number(p?.initiative||0);
      else if(p?.profileId){
        const prof = Store.getProfile(p.profileId);
        base = Number(prof?.caracs?.[attr] ?? NaN);
        if(!Number.isFinite(base)) base=null;
      }

      const modManual = clampInt(inMod.value, 0);
      const modAuto = autoModForParticipant(pid);
      lblAuto.textContent = `${modAuto>=0?'+':''}${modAuto} (AV)`;

      const tgt = Number.isFinite(base) ? base + (modManual + modAuto) : null;
      lblTarget.textContent = Number.isFinite(tgt) ? String(tgt) : '—';
      return { attr, base, modManual, modAuto, tgt };
    }

    pop.querySelector('.qr-roll').addEventListener('click', ()=>{
      const { attr, tgt, modManual, modAuto } = recompute();
      const roll = d100();
      const success = Number.isFinite(tgt) && roll <= tgt;
      const sl = Number.isFinite(tgt) ? SL(tgt, roll) : null;
      const dbl = isDouble(roll);
      const crit = dbl ? (success ? 'Critique' : 'Maladresse') : null;

      const res = document.createElement('div'); res.className='dice-result';
      res.innerHTML = `
        <span class="dice-rollvalue">1d100 = ${roll}</span>
        ${Number.isFinite(tgt)? `<span class="${success?'result-good':'result-bad'}">${success?'Réussite':'Échec'}</span>
                                  <span class="${sl>=0?'result-good':'result-bad'}">SL ${sl>=0?'+':''}${sl}</span>` : `<span class="result-warn">Sans cible</span>`}
        <span class="badge">${escapeHtml(name)}</span>
        ${attr && attr!=='Custom' ? `<span class="badge">${escapeHtml(attr)}</span>` : ''}
        ${modManual ? `<span class="badge ${modManual>=0?'good':'bad'}">Mod ${modManual>=0?'+':''}${modManual}</span>` : ''}
        ${modAuto ? `<span class="badge ${modAuto>=0?'good':'bad'}">Auto ${modAuto>=0?'+':''}${modAuto} (AV)</span>` : ''}
        ${crit ? `<span class="badge ${success?'good':'bad'}">${crit}</span>` : ''}
      `;
      els.quickResults.prepend(res);

      const head = `Jet rapide ${attr==='Custom'?'(custom)':attr}`;
      const tgtTxt = Number.isFinite(tgt) ? ` | Cible ${tgt}` : '';
      const extras=[]; if(crit) extras.push(crit);
      if(modManual) extras.push(`Mod ${modManual>=0?'+':''}${modManual}`);
      if(modAuto) extras.push(`Auto ${modAuto>=0?'+':''}${modAuto} (AV)`);
      Store.log(`🎲 ${head} (${name})${tgtTxt} → d100=${roll}${Number.isFinite(tgt)?` • ${success?'Réussite':'Échec'} • SL ${sl>=0?'+':''}${sl}`:''}${extras.length?` • ${extras.join(' • ')}`:''}`);

      closePopover();
    });

    selA.addEventListener('change', recompute);
    inBase.addEventListener('input', recompute);
    inMod.addEventListener('input', recompute);
    pop.querySelector('.close').addEventListener('click', closePopover);

    // close on outside click
    setTimeout(()=> {
      const handler = (e) => {
        if(!pop.contains(e.target)) closePopover();
      };
      document.addEventListener('mousedown', handler, { once:true });
    }, 0);

    recompute();
  }
  function closePopover(){
    if(openPopover && openPopover.parentElement){ openPopover.parentElement.removeChild(openPopover); }
    openPopover = null;
  }

  // ---------- Helpers ----------
  function labelWrap(text, el){ const w=document.createElement('label'); w.textContent=text; w.appendChild(el); return w; }
  function badge(text, kind){ const s=document.createElement('span'); s.className='badge'+(kind?` ${kind}`:''); s.textContent=text; return s; }
  function btn(text, on){ const b=document.createElement('button'); b.textContent=text; b.addEventListener('click', on); return b; }

  // ---------- Reactions ----------
  Bus.on('reserve', renderReserve);
  Bus.on('combat', renderCombat);
  Bus.on('dice', renderDiceLines);

  // ---------- Init ----------
  renderReserve(); renderCombat();
})();
