(() => {
  // ---------- Utils ----------
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toLocaleTimeString();
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clampInt = (v, def=0)=> Number.isFinite(Number(v)) ? Number(v) : def;
  const on = (el, evt, fn) => { if(el){ el.addEventListener(evt, fn); } };

  // Dice utils
  const d100 = () => Math.floor(Math.random()*100) + 1;
  const isDouble = (n) => n<=99 && n%11===0;
  const SL = (target, roll) => Math.floor((target||0)/10) - Math.floor(roll/10);

  const ADV_STEP = 10;
  const autoModForParticipant = (pid) => {
    if(!pid) return 0;
    const p = Store.getState().combat.participants.get(pid);
    const av = Number(p?.advantage || 0);
    return Number.isFinite(av) ? av * ADV_STEP : 0;
  };

  // ---------- EventBus ----------
  const Bus = { _h:new Map(), on(e,f){ (this._h.get(e)||this._h.set(e,new Set()).get(e)).add(f); }, off(e,f){ this._h.get(e)?.delete(f); }, emit(e,p){ this._h.get(e)?.forEach(fn=>fn(p)); } };

  // ---------- Models ----------
  class Profile {
    constructor({ id=uid(), name, kind='PJ', initiative=30, hp=10, caracs={}, armor={head:0, body:0, arms:0, legs:0} } = {}) {
      this.id=id; this.name=(name||'Sans-nom').trim(); this.kind=kind;
      this.initiative=Number(initiative)||0; this.hp=Number(hp)||0; 
      this.caracs={...caracs};
      this.armor={...armor}; // Nouvelle propriété Armure
    }
  }
  class Participant {
    constructor({ id=uid(), profileId, name, kind, initiative=0, hp=10, advantage=0, states=[], subId='global', armor={head:0, body:0, arms:0, legs:0} } = {}) {
      this.id=id; this.profileId=profileId||null; this.name=name||'—'; this.kind=kind||'Créature';
      this.initiative=Number(initiative)||0; this.hp=Number(hp)||0; this.advantage=Number(advantage)||0;
      this.states=[...states]; this.subId=subId;
      this.armor={...armor};
    }
  }
  class SubFight { constructor({ id=uid(), name } = {}) { this.id=id; this.name=name||'Sous-combat'; } }
  
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
      
      // MISE A JOUR + SYNCHRO COMBAT
      updateProfile(id, patch){
        const p = reserve.get(id);
        if(!p) return;
        Object.assign(p, patch);
        
        // Propagation aux combattants liés
        for(const part of combat.participants.values()){
            if(part.profileId === id){
                part.name = p.name;
                part.kind = p.kind;
                // On ne touche pas aux HP actuels ni à l'Initiative roulée, mais on met à jour le reste
                part.caracs = {...p.caracs};
                part.armor = {...p.armor};
            }
        }
        
        save();
        Bus.emit('reserve');
        Bus.emit('combat'); // Force le rafraichissement du combat
      },

      removeProfile(id){ reserve.delete(id); save(); Bus.emit('reserve'); },
      
      duplicateProfile(id){
        const p = reserve.get(id);
        if(!p) return;
        let baseName = p.name;
        const match = p.name.match(/^(.*?)(\s\d+)?$/);
        if (match && match[2]) { baseName = match[1]; }
        let maxNum = 0;
        for (const other of reserve.values()) {
            if (other.name === baseName) maxNum = Math.max(maxNum, 1);
            else if (other.name.startsWith(baseName + " ")) {
                const suffix = other.name.substring(baseName.length + 1);
                if (!isNaN(suffix)) maxNum = Math.max(maxNum, parseInt(suffix));
            }
        }
        const newName = `${baseName} ${maxNum + 1}`;
        // Clone avec nouvelle armure et ID
        const newProfile = new Profile({ ...p, id: uid(), name: newName, armor: {...p.armor}, caracs: {...p.caracs} });
        this.addProfile(newProfile);
        this.log(`Réserve: Dupliqué ${p.name} → ${newName}`);
      },

      listProfiles(){ return Array.from(reserve.values()); },
      getProfile(id){ return reserve.get(id) || null; },

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

      addDiceLine(dl){ diceLines.push(new DiceLine(dl)); save(); Bus.emit('dice'); },
      updateDiceLine(id, patch, noRender=false){ const i=diceLines.findIndex(x=>x.id===id); if(i<0) return; Object.assign(diceLines[i], patch); save(); if(!noRender) Bus.emit('dice'); },
      removeDiceLine(id){ diceLines = diceLines.filter(x=>x.id!==id); save(); Bus.emit('dice'); },
      duplicateDiceLine(id){ const src=diceLines.find(x=>x.id===id); if(!src) return; diceLines.push(new DiceLine({...src, id:uid()})); save(); Bus.emit('dice'); },

      importFromReserve(ids, subId){
        ids.forEach(id => {
          const prof = reserve.get(id); if(!prof) return;
          const p = new Participant({ 
              profileId: prof.id, name: prof.name, kind: prof.kind, 
              initiative: prof.initiative, hp: prof.hp, subId, 
              armor: {...prof.armor} // Copie de l'armure
          });
          this.addParticipant(p);
        });
        this.log(`Import: ${ids.length} participant(s) → ${subId}`);
      },
      exportToReserve(){
        let n=0; combat.participants.forEach(p => { if(!p.profileId) return; const prof = reserve.get(p.profileId); if(!prof) return; prof.hp = p.hp; n++; });
        save(); this.log(`Export → Réserve: ${n} profil(s) mis à jour`); Bus.emit('reserve');
      },

      log(line){ log.unshift(`[${now()}] ${line}`); save(); Bus.emit('log'); },
      clearLog(){ log=[]; save(); Bus.emit('log'); },
      resetCombat(){ combat = { round:0, turnIndex:-1, order:[], participants:new Map(), subs:[ new SubFight({id:'global', name:'Global'}) ] }; save(); Bus.emit('combat'); },

      getFullJSON(){
        const data = {
          timestamp: new Date().toISOString(),
          reserve: Array.from(reserve.values()),
          combat: { round: combat.round, turnIndex: combat.turnIndex, order: combat.order, subs: combat.subs, participants: Array.from(combat.participants.values()) },
          log: log, diceLines: diceLines
        };
        return JSON.stringify(data, null, 2);
      },
      loadFromJSON(jsonStr){
        try {
          const data = JSON.parse(jsonStr);
          if(!data.reserve || !data.combat) throw new Error('Format invalide');
          reserve = new Map((data.reserve||[]).map(o => [o.id, new Profile(o)]));
          const c = data.combat;
          combat.round = c.round || 0;
          combat.turnIndex = c.turnIndex ?? -1;
          combat.order = c.order || [];
          combat.subs = (c.subs || []).map(s => new SubFight(s));
          combat.participants = new Map((c.participants || []).map(p => [p.id, new Participant(p)]));
          log = data.log || [];
          diceLines = (data.diceLines || []).map(x => new DiceLine(x));
          save(); 
          Bus.emit('reserve'); Bus.emit('combat'); Bus.emit('dice'); Bus.emit('log');
          this.log('📂 Données chargées.');
          alert('Données récupérées avec succès !');
        } catch(e){ alert('Erreur : ' + e.message); }
      }
    };

    load();
    api.rebuildOrder();
    return api;
  })();

  // ---------- Combat engine ----------
  const Combat = (() => {
    function actorAtTurn(){ const st = Store.getState().combat; const id = st.order[st.turnIndex]; return id ? st.participants.get(id) : null; }
    function start(){ const st = Store.getState().combat; if(st.order.length===0) return; if(st.round===0) st.round=1; if(st.turnIndex===-1) st.turnIndex=0; Store.log(`Combat démarré. Round ${st.round}. Tour: ${actorAtTurn()?.name ?? '—'}`); Store.setRoundTurn(st.round, st.turnIndex); }
    return { actorAtTurn, start };
  })();

  // ---------- DOM refs ----------
  const DOM = {
    tabs: qsa('.tab'),
    panels: { reserve: qs('#panel-reserve'), combat: qs('#panel-combat') },
    reserve: { list: qs('#reserve-list'), search: qs('#search-reserve'), form: qs('#form-add'), seed: qs('#seed-reserve'), clear: qs('#clear-reserve') },
    combat: {
      list: qs('#combat-list'), search: qs('#search-combat'),
      pillRound: qs('#pill-round'), pillTurn: qs('#pill-turn'), pillSub: qs('#pill-sub'),
      btnImport: qs('#btn-import'), btnExport: qs('#btn-export'),
      btnStart: qs('#btn-start'), btnReset: qs('#btn-reset'), btnD100: qs('#btn-d100'),
      btnNewSub: qs('#btn-new-sub'),
      log: qs('#log'), btnClearLog: qs('#btn-clear-log'),
      btnSaveFile: qs('#btn-save-file'), btnLoadFile: qs('#btn-load-file'), fileInput: qs('#file-input')
    },
    importModal: { dialog: qs('#dlg-import'), list: qs('#import-list'), subSelect: qs('#sel-sub'), confirm: qs('#confirm-import') },
    dice: { lines: qs('#dice-lines'), add: qs('#dice-add'), rollAll: qs('#dice-roll-all'), results: qs('#dice-prep-results') },
    tplActor: qs('#tpl-actor'),
  };

  // ---------- Tabs ----------
  DOM.tabs.forEach(t => t.addEventListener('click', () => {
    DOM.tabs.forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
    const k = t.dataset.tab;
    Object.values(DOM.panels).forEach(p => p.classList.remove('is-active'));
    (k==='reserve' ? DOM.panels.reserve : DOM.panels.combat).classList.add('is-active');
  }));

  // ---------- Rendering ----------
  function renderFilteredList(inputEl, listEl, sourceFn, renderItemFn) {
    const term = (inputEl.value || '').toLowerCase();
    const items = sourceFn().filter(item => item.name.toLowerCase().includes(term));
    listEl.replaceChildren(...items.map(renderItemFn));
  }

  function renderReserve(){ renderFilteredList(DOM.reserve.search, DOM.reserve.list, Store.listProfiles, renderReserveItem); renderDiceLines(); }
  function renderReserveItem(p){
    const div = document.createElement('div'); div.className='item';
    const left = document.createElement('div');
    const right = document.createElement('div'); right.className='row';
    left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> <span class="meta">(${p.kind})</span></div><div class="meta">Init ${p.initiative} • PV ${p.hp}</div>`;
    
    // Actions Réserve
    const btnEdit = document.createElement('button'); btnEdit.textContent='Éditer';
    btnEdit.classList.add('ghost');
    btnEdit.addEventListener('click', () => loadProfileIntoForm(p));

    const btnDup = document.createElement('button'); btnDup.textContent='Dupliq.';
    btnDup.classList.add('ghost');
    btnDup.addEventListener('click', () => Store.duplicateProfile(p.id));

    const btnDel = document.createElement('button'); btnDel.textContent='Suppr'; 
    btnDel.classList.add('danger','ghost');
    btnDel.addEventListener('click', ()=>{ Store.removeProfile(p.id); Store.log(`Réserve: supprimé ${p.name}`); });
    
    right.append(btnEdit, btnDup, btnDel); 
    div.append(left,right); return div;
  }

  // --- Gestion du Formulaire (Ajout / Édition) ---
  const formTitle = qs('#form-title');
  const btnSubmit = qs('#btn-submit-form');
  const btnCancel = qs('#btn-cancel-edit');

  function loadProfileIntoForm(p){
    const f = DOM.reserve.form;
    f.querySelector('[name=id]').value = p.id;
    f.querySelector('[name=name]').value = p.name;
    f.querySelector('[name=kind]').value = p.kind;
    f.querySelector('[name=initiative]').value = p.initiative;
    f.querySelector('[name=hp]').value = p.hp;
    // Armor
    f.querySelector('[name=armor_head]').value = p.armor?.head || 0;
    f.querySelector('[name=armor_body]').value = p.armor?.body || 0;
    f.querySelector('[name=armor_arms]').value = p.armor?.arms || 0;
    f.querySelector('[name=armor_legs]').value = p.armor?.legs || 0;
    // Caracs
    ['CC','CT','F','E','I','Ag','Dex','Int','FM','Soc'].forEach(k => {
        f.querySelector(`[name=${k}]`).value = p.caracs[k] || '';
    });

    formTitle.textContent = "Modifier le profil";
    btnSubmit.textContent = "Modifier";
    btnCancel.style.display = 'inline-block';
    f.scrollIntoView({behavior: "smooth"});
  }

  function resetForm(){
    DOM.reserve.form.reset();
    DOM.reserve.form.querySelector('[name=id]').value = '';
    formTitle.textContent = "Nouveau profil";
    btnSubmit.textContent = "Ajouter";
    btnCancel.style.display = 'none';
  }

  on(btnCancel, 'click', resetForm);

  on(DOM.reserve.form, 'submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(DOM.reserve.form);
    const caracs = {}; ['CC','CT','F','E','I','Ag','Dex','Int','FM','Soc'].forEach(k => {
      const raw = fd.get(k); if(raw!==null && raw!==''){ const v = Number(raw); if(Number.isFinite(v)) caracs[k]=v; }
    });
    const armor = {
        head: Number(fd.get('armor_head')||0),
        body: Number(fd.get('armor_body')||0),
        arms: Number(fd.get('armor_arms')||0),
        legs: Number(fd.get('armor_legs')||0)
    };

    const id = fd.get('id');
    const data = { 
        name: fd.get('name'), 
        kind: fd.get('kind'), 
        initiative: Number(fd.get('initiative')||0), 
        hp: Number(fd.get('hp')||0), 
        caracs, armor 
    };

    if(id){
        Store.updateProfile(id, data);
        Store.log(`Réserve: modifié ${data.name}`);
    } else {
        Store.addProfile(new Profile(data));
        Store.log(`Réserve: ajouté ${data.name}`);
    }
    resetForm();
  });

  on(DOM.reserve.seed, 'click', ()=>{
    [ new Profile({name:'Renaut de Volargent', kind:'PJ', initiative:41, hp:14, caracs:{CC:52, Ag:41}, armor:{head:2, body:2, arms:0, legs:0}}),
      new Profile({name:'Saskia la Noire', kind:'PJ', initiative:52, hp:12, caracs:{CC:45, Ag:52}}),
      new Profile({name:'Gobelins (2)', kind:'Créature', initiative:28, hp:9, caracs:{CC:35}}),
      new Profile({name:'Chien de guerre', kind:'Créature', initiative:36, hp:10, caracs:{CC:40}})
    ].forEach(Store.addProfile); Store.log('Seed Réserve: 4 profils');
  });
  on(DOM.reserve.clear, 'click', ()=>{ if(confirm('Vider toute la Réserve ?')){ localStorage.removeItem(KEY.RESERVE); location.reload(); } });
  on(DOM.reserve.search, 'input', renderReserve);

  // Import/Export
  on(DOM.combat.btnImport, 'click', ()=>{
    const subs = Store.listSubs(); DOM.importModal.subSelect.replaceChildren(...subs.map(s => opt(s.id, s.name)));
    const profs = Store.listProfiles(); DOM.importModal.list.replaceChildren(...profs.map(p => importRow(p)));
    DOM.importModal.dialog.showModal();
  });
  on(DOM.importModal.confirm, 'click', (e)=>{
    e.preventDefault();
    const ids = Array.from(DOM.importModal.list.querySelectorAll('input[type=checkbox]:checked')).map(ch => ch.value);
    const subId = DOM.importModal.subSelect.value || 'global';
    Store.importFromReserve(ids, subId);
    DOM.importModal.dialog.close();
  });
  on(DOM.combat.btnExport, 'click', ()=>{ if(confirm('Appliquer PV aux profils correspondants ?')) Store.exportToReserve(); });

  // Files
  on(DOM.combat.btnSaveFile, 'click', ()=>{
    const json = Store.getFullJSON();
    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `wfrp-save-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });
  on(DOM.combat.btnLoadFile, 'click', ()=> { if(DOM.combat.fileInput) DOM.combat.fileInput.click(); });
  on(DOM.combat.fileInput, 'change', (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = (ev) => Store.loadFromJSON(ev.target.result);
    reader.readAsText(file); e.target.value = '';
  });

  function importRow(p){
    const row = document.createElement('div'); row.className='item';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(p.name)}</strong> <span class="meta">(${p.kind})</span> <span class="meta">Init ${p.initiative} • PV ${p.hp}</span>`;
    const right = document.createElement('div'); right.className='row';
    const chk = document.createElement('input'); chk.type='checkbox'; chk.value=p.id; right.append(chk);
    row.append(left,right); return row;
  }
  function opt(v, t){ const o=document.createElement('option'); o.value=v; o.textContent=t; return o; }

  // Combat Rendering
  function renderCombat(){
    const { combat } = Store.getState();
    if(DOM.combat.pillRound) DOM.combat.pillRound.textContent = `Round: ${combat.round}`;
    if(DOM.combat.pillTurn) DOM.combat.pillTurn.textContent  = `Tour: ${Combat.actorAtTurn()?.name ?? '–'}`;
    if(DOM.combat.pillSub) DOM.combat.pillSub.textContent   = `Sous-combat: ${combat.subs.find(s=>s.id===currentSub())?.name||'global'}`;
    renderFilteredList(DOM.combat.search, DOM.combat.list, Store.listParticipants, renderParticipant);
    renderDiceLines();
  }
  function renderParticipant(p){
    const li = DOM.tplActor.content.firstElementChild.cloneNode(true);
    if(Combat.actorAtTurn()?.id===p.id) li.classList.add('turn');
    li.dataset.id = p.id;
    li.querySelector('.name').textContent = p.name + (p.subId!=='global'? ` [${getSubName(p.subId)}]` : '');
    
    // Affichage Armure
    const armDiv = li.querySelector('.armor-display');
    if(p.armor && (p.armor.head || p.armor.body || p.armor.arms || p.armor.legs)){
        armDiv.textContent = `🛡️ T${p.armor.head} C${p.armor.body} B${p.armor.arms} J${p.armor.legs}`;
    } else {
        armDiv.textContent = '';
    }

    const chips = li.querySelector('.chips');
    const initBadge = badge(`Init ${p.initiative}`, 'clickable');
    initBadge.title = 'Cliquer pour modifier l’Initiative';
    initBadge.addEventListener('click', ()=>{
      const v = prompt('Nouvelle valeur d’Initiative ?', p.initiative); if(v===null) return;
      const nv = Number(v); if(!Number.isFinite(nv)) return alert('Valeur invalide');
      Store.updateParticipant(p.id, { initiative: nv });
    });
    chips.append(initBadge, badge(`PV ${p.hp}`), badge(`AV ${p.advantage}`));
    const states = li.querySelector('.states'); p.states.forEach(s => states.append(badge(s,'warn')));
    li.querySelector('.btn-adv-plus').addEventListener('click',()=> setAdv(p.id, p.advantage+1));
    li.querySelector('.btn-adv-minus').addEventListener('click',()=> setAdv(p.id, p.advantage-1));
    li.querySelector('.btn-hp-minus').addEventListener('click',()=> setHP(p.id, p.hp-1));
    li.querySelector('.btn-hp-plus').addEventListener('click',()=> setHP(p.id, p.hp+1));
    li.querySelector('.btn-state').addEventListener('click',()=> toggleState(p.id,'Blessé'));
    li.querySelector('.btn-remove').addEventListener('click',()=>{ Store.removeParticipant(p.id); Store.log(`Combat: retiré ${p.name}`); });
    return li;
  }

  function setAdv(id, val){ const p=getP(id); if(!p) return; Store.updateParticipant(id,{advantage:val}); renderDiceLines(); } 
  function setHP(id, val){ const p=getP(id); if(!p) return; Store.updateParticipant(id,{hp:val}); }
  function toggleState(id, label){ const p=getP(id); if(!p) return; const has=p.states.includes(label); const ns=has? p.states.filter(x=>x!==label) : [...p.states,label]; Store.updateParticipant(id,{states:ns}); }
  function getP(id){ return Store.getState().combat.participants.get(id); }
  function currentSub(){ return 'global'; }
  function getSubName(id){ return Store.listSubs().find(s=>s.id===id)?.name || 'global'; }
  
  // Safe bindings
  on(DOM.combat.btnNewSub, 'click', ()=>{ const name = prompt('Nom du sous-combat ?'); if(!name) return; Store.addSub(name); });
  on(DOM.combat.btnClearLog, 'click', ()=> Store.clearLog());
  on(DOM.combat.btnStart, 'click', () => Combat.start());
  on(DOM.combat.btnReset, 'click', () => { if(confirm('Réinitialiser tout le combat ?')) Store.resetCombat(); });
  
  on(DOM.combat.btnD100, 'click', ()=>{ 
    const roll = d100(); 
    Store.log(`🎲 Jet de d100 → ${roll}`);
    const res = document.createElement('div'); res.className='dice-result';
    res.innerHTML = `<span class="dice-rollvalue">1d100 = ${roll}</span><span class="badge">Jet simple</span>`;
    DOM.dice.results.prepend(res);
  });
  
  Bus.on('log', ()=>{ const arr = Store.getState().log; const frag = document.createDocumentFragment(); arr.forEach(line=>{ const div=document.createElement('div'); div.className='entry'; div.textContent=line; frag.append(div); }); DOM.combat.log.replaceChildren(frag); });

  // ---------- Lignes préparées Avancées ----------
  on(DOM.dice.add, 'click', ()=> Store.addDiceLine(new DiceLine()));
  on(DOM.dice.rollAll, 'click', ()=>{ const { diceLines } = Store.getState(); diceLines.forEach(dl => runDiceLine(dl.id)); });
  function renderDiceLines(){ const { diceLines } = Store.getState(); const frag = document.createDocumentFragment(); diceLines.forEach(dl => frag.append(renderDiceLine(dl))); DOM.dice.lines.replaceChildren(frag); }

  function renderDiceLine(dl){
    const wrap = document.createElement('div'); wrap.className='dice-line'; wrap.dataset.id = dl.id;
    const selP = document.createElement('select');
    selP.append(opt('','— Libre —'), ...Store.listParticipantsRaw().map(p=>opt(p.id, p.name + (p.profileId?'':' (ad hoc)'))));
    selP.value = dl.participantId || '';
    const selA = document.createElement('select');
    ['Custom','CC','CT','F','E','I','Ag','Dex','Int','FM','Soc','initiative'].forEach(a=> selA.append(opt(a, a==='initiative'?'Init':a)));
    selA.value = dl.attr || 'Custom';
    const inBase = document.createElement('input'); inBase.type='number'; inBase.value = dl.base ?? ''; inBase.placeholder="Base";
    const inMod = document.createElement('input'); inMod.type='number'; inMod.value = dl.mod ?? 0;
    const spanAuto = document.createElement('span'); spanAuto.className = 'readonly';
    const selTarget = document.createElement('select');
    selTarget.append(opt('none', '— Sans Cible —'), opt('fixed', 'Cible Fixe'));
    Store.listParticipantsRaw().forEach(p => selTarget.append(opt(p.id, 'Vs ' + p.name)));
    selTarget.value = dl.targetType || 'none';
    const targetContainer = document.createElement('div'); targetContainer.className = 'target-details';
    if(selTarget.value === 'fixed'){
        const inVal = document.createElement('input'); inVal.type='number'; inVal.placeholder="Seuil"; inVal.value = dl.targetValue;
        inVal.addEventListener('input', ()=> Store.updateDiceLine(dl.id, {targetValue: inVal.value}, true));
        targetContainer.append(inVal);
    } 
    else if(selTarget.value !== 'none'){
        const selTAttr = document.createElement('select');
        ['CC','CT','F','E','I','Ag','Dex','Int','FM','Soc','initiative'].forEach(a=> selTAttr.append(opt(a, a)));
        selTAttr.value = dl.targetAttr || 'CC';
        selTAttr.addEventListener('change', ()=> Store.updateDiceLine(dl.id, {targetAttr: selTAttr.value})); 
        const inOpp = document.createElement('input'); inOpp.type='number'; inOpp.placeholder="Score Opp"; inOpp.title="Score du dé du défenseur"; inOpp.value = dl.opponentRoll;
        inOpp.addEventListener('input', ()=> Store.updateDiceLine(dl.id, {opponentRoll: inOpp.value}, true));
        targetContainer.append(selTAttr, inOpp);
    }
    const inNote = document.createElement('input'); inNote.placeholder="Note"; inNote.value = dl.note||'';
    const act = document.createElement('div'); act.className='actions';
    const btnRoll = document.createElement('button'); btnRoll.textContent='Lancer'; btnRoll.addEventListener('click', ()=>runDiceLine(dl.id));
    const btnDup = document.createElement('button'); btnDup.textContent='Dupliq.'; btnDup.addEventListener('click', ()=>Store.duplicateDiceLine(dl.id));
    const btnDel = document.createElement('button'); btnDel.textContent='X'; btnDel.addEventListener('click', ()=>Store.removeDiceLine(dl.id));
    act.append(btnRoll, btnDup, btnDel);

    wrap.append(
        labelWrap('Qui ?', selP), labelWrap('Quoi ?', selA), 
        selA.value==='Custom' ? labelWrap('Base', inBase) : labelWrap('Mod', inMod),
        labelWrap('Av.', spanAuto), labelWrap('Cible', selTarget), labelWrap('Détails Cible', targetContainer),
        labelWrap('Note', inNote), act
    );
    function updateAutoMod(){ const mod = autoModForParticipant(selP.value); spanAuto.textContent = `${mod>=0?'+':''}${mod}`; }
    function save(noRender=false){ Store.updateDiceLine(dl.id, { participantId: selP.value, attr: selA.value, base: selA.value==='Custom' ? clampInt(inBase.value, 0) : '', mod: clampInt(inMod.value, 0), note: inNote.value, targetType: selTarget.value }, noRender); }
    selP.addEventListener('change', ()=>{ save(); updateAutoMod(); });
    selA.addEventListener('change', ()=>{ save(); renderDiceLines(); }); 
    inBase.addEventListener('input', ()=> save(true)); inMod.addEventListener('input', ()=> save(true)); inNote.addEventListener('input', ()=> save(true));
    selTarget.addEventListener('change', save); 
    updateAutoMod();
    return wrap;
  }

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

    let targetInfo = "";
    let slDiff = null;
    if(dl.targetType === 'fixed' && dl.targetValue){ targetInfo = ` | vs Seuil ${dl.targetValue}`; }
    else if(dl.targetType !== 'none' && dl.targetType !== 'fixed'){
        const defender = st.combat.participants.get(dl.targetType);
        if(defender && dl.targetAttr && dl.opponentRoll){
             let defBase = 0;
             if(dl.targetAttr === 'initiative') defBase = Number(defender.initiative||0);
             else if(defender.profileId) { const dProf = Store.getProfile(defender.profileId); defBase = Number(dProf?.caracs?.[dl.targetAttr] ?? 0); }
             const defRoll = Number(dl.opponentRoll);
             if(Number.isFinite(defBase) && Number.isFinite(defRoll)){
                 const slDef = SL(defBase, defRoll);
                 if(sl !== null) { slDiff = sl - slDef; targetInfo = ` | vs ${defender.name} (${dl.targetAttr} ${defBase}, Roll ${defRoll} → SL ${slDef}) | ⚔️ SL Diff: ${slDiff>=0?'+':''}${slDiff}`; }
             }
        } else if(defender) { targetInfo = ` | vs ${defender.name} (En attente score...)`; }
    }
    const res = document.createElement('div'); res.className='dice-result';
    let resHTML = `<span class="dice-rollvalue">1d100 = ${roll}</span>`;
    if(Number.isFinite(target)){ resHTML += `<span class="${success?'result-good':'result-bad'}">${success?'Réussite':'Échec'}</span><span class="${sl>=0?'result-good':'result-bad'}">SL ${sl>=0?'+':''}${sl}</span>`; } 
    else { resHTML += `<span class="result-warn">Sans cible (attaquant)</span>`; }
    if(slDiff !== null) { resHTML += `<span class="badge ${slDiff>=0?'good':'bad'}" style="margin-left:8px; font-size:1.1em;">MARGE: ${slDiff>=0?'+':''}${slDiff}</span>`; }
    const who = dl.participantId ? st.combat.participants.get(dl.participantId)?.name||'?' : '?';
    resHTML += `<span class="badge">${escapeHtml(who)}</span>`;
    if(dl.attr!=='Custom') resHTML += `<span class="badge">${dl.attr}</span>`;
    if(modManual) resHTML += `<span class="badge">Mod ${modManual}</span>`;
    if(modAuto) resHTML += `<span class="badge good">Auto ${modAuto}</span>`;
    if(crit) resHTML += `<span class="badge ${success?'good':'bad'}">${crit}</span>`;
    if(dl.note) resHTML += `<span class="badge warn">${escapeHtml(dl.note)}</span>`;
    res.innerHTML = resHTML; DOM.dice.results.prepend(res);
    Store.log(`🎲 ${who} (Roll ${roll})${targetInfo}`);
  }

  function labelWrap(text, el){ const w=document.createElement('label'); w.textContent=text; w.appendChild(el); return w; }
  function badge(text, kind){ const s=document.createElement('span'); s.className='badge'+(kind?` ${kind}`:''); s.textContent=text; return s; }
  function btn(text, on){ const b=document.createElement('button'); b.textContent=text; b.addEventListener('click', on); return b; }

  Bus.on('reserve', renderReserve); Bus.on('combat', renderCombat); Bus.on('dice', renderDiceLines);
  renderReserve(); renderCombat();
})();
