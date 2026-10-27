/** Pure V5 Reload/Repeater state transitions for F2-D. Reload advances per successful Test, not Actions or SL. */

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, min = 0) => Number.isSafeInteger(Number(value)) && Number(value) >= min;
const clone = value => structuredClone(value);
const ready = fields => ({ ready: true, unresolved: [], ...fields });
const blocked = message => ({ ready: false, unresolved: [message] });

/** Build the persistent cycle from the catalogue's À répétition X / Recharge X values. */
export function initialV5ReloadState(weapon) {
  const qualities = Array.isArray(weapon?.keywords) ? weapon.keywords : [];
  const repeater = qualities.find(row => (typeof row === 'string' ? row : row?.id) === 'a-repetition');
  const salvo = qualities.find(row => ['salve','salvo'].includes(typeof row === 'string' ? row : row?.id));
  const reload = qualities.find(row => (typeof row === 'string' ? row : row?.id) === 'recharge');
  if (!repeater && !salvo && !reload && weapon?.reload == null) return blocked('Cette arme ne porte ni À répétition, Salve ni Recharge.');
  const repeaterRating = repeater ? Number(typeof repeater === 'string' ? NaN : repeater.parameter) : 0;
  const salvoRating = salvo ? Number(typeof salvo === 'string' ? NaN : salvo.parameter) : 0;
  const extension=weapon?.extensions?.v5||{};
  const rawReload = reload ? (typeof reload === 'string' ? NaN : reload.parameter) : (extension.reloadRequiredSuccesses??weapon.reload);
  const markedIncremental=reload?.asterisk===true||reload?.incrementalPerSalvo===true||extension.salvoReloadMode==='incremental'||typeof rawReload==='string'&&/\*$/.test(rawReload.trim());
  const reloadSuccesses = Number(typeof rawReload==='string'?rawReload.replace(/\*\s*$/,'').trim():rawReload);
  const salvoReloadMode=salvoRating>0?(markedIncremental?'incremental':'full'):'none';
  const initialized=createV5ReloadState({ repeaterRating, salvoRating, reloadSuccesses, salvoReloadMode });
  if(!initialized.ready)return initialized;
  const state=initialized.state;
  if(Number.isSafeInteger(Number(extension.reloadProgress)))state.accumulatedSuccesses=Math.max(0,Number(extension.reloadProgress));
  if(Number.isSafeInteger(Number(extension.reloadRequiredSuccesses)))state.requiredSuccesses=Math.max(1,Number(extension.reloadRequiredSuccesses));
  if(extension.reloaded===true){state.accumulatedSuccesses=state.requiredSuccesses??state.reloadSuccesses;state.reloading=false;state.requiresReload=false;}
  else if(extension.reloaded===false){state.reloading=state.accumulatedSuccesses>0;state.requiresReload=true;}
  return initialized;
}

export function createV5ReloadState({ repeaterRating = 0, salvoRating = 0, reloadSuccesses, revision = 0, salvoReloadMode = 'full' } = {}) {
  if (!integer(repeaterRating) || !integer(salvoRating) || !integer(reloadSuccesses, 1) || !integer(revision) || !['full','incremental','none'].includes(salvoReloadMode))
    return blocked('Rechargement : indices et révision entiers valides requis.');
  return ready({ state: { revision: Number(revision), repeaterRating: Number(repeaterRating), salvoRating:Number(salvoRating), salvoReloadMode:salvoRating>0?salvoReloadMode:'none', shotsRemaining: Math.max(Number(repeaterRating),Number(salvoRating)),
    reloadSuccesses: Number(reloadSuccesses), accumulatedSuccesses: 0, reloading: false, requiresReload: false } });
}

function validState(state) {
  const capacity=Math.max(Number(state?.repeaterRating)||0,Number(state?.salvoRating)||0,Number(state?.magazineCapacity)||0);
  return record(state) && integer(state.revision) && integer(state.repeaterRating) && integer(state.salvoRating??0) && integer(state.shotsRemaining)
    && state.shotsRemaining <= capacity && integer(state.reloadSuccesses, 1)
    && integer(state.accumulatedSuccesses) && ['full','incremental','none'].includes(state.salvoReloadMode??(state.salvoRating>0?'incremental':'none'))
    && typeof state.reloading === 'boolean' && typeof state.requiresReload === 'boolean';
}

function restoredShots(state) {
  if(state.salvoRating>0)return (state.salvoReloadMode??'incremental')==='incremental'
    ?Math.min(state.salvoRating,state.shotsRemaining+1):state.salvoRating;
  return state.magazineCapacity>0?state.magazineCapacity:state.repeaterRating;
}

export function consumeV5WeaponShot(state, { expectedRevision = state?.revision } = {}) {
  if (!validState(state)) return blocked('Rechargement : état de chargeur invalide.');
  if (expectedRevision !== state.revision) return ready({ status: 'stale', state: clone(state) });
  if (state.reloading || state.requiresReload) return ready({ status: 'unavailable', reason: 'reload-required', state: clone(state) });
  const next = clone(state);
  if (next.repeaterRating > 0 || next.salvoRating > 0 || next.magazineCapacity > 0) {
    const cost=Number(next.shotCost)||1;
    if (next.shotsRemaining < cost) return ready({ status: 'unavailable', reason: 'magazine-empty', state: next });
    next.shotsRemaining -= cost;
    next.requiresReload = next.shotsRemaining < cost;
    if(next.requiresReload){next.accumulatedSuccesses=0;next.reloading=false;next.requiredSuccesses=next.reloadSuccesses;}
  } else {
    next.requiresReload = true;
    next.reloading=false;next.accumulatedSuccesses=0;next.requiredSuccesses=next.reloadSuccesses;
  }
  next.revision += 1;
  return ready({ status: 'shot', state: next });
}

/** Begin a reload; an unfired repeater shot reduces the success requirement by one. */
export function beginV5Reload(state, { expectedRevision = state?.revision, reloadMultiplier = 1, crewCount } = {}) {
  if (!validState(state)) return blocked('Rechargement : état de chargeur invalide.');
  if (expectedRevision !== state.revision) return ready({ status: 'stale', state: clone(state) });
  if (state.reloading) return ready({ status: 'already-reloading', state: clone(state) });
  if (!integer(reloadMultiplier,1)) return blocked('Rechargement : multiplicateur positif entier requis.');
  const capacity=Math.max(Number(state.repeaterRating)||0,Number(state.salvoRating)||0,Number(state.magazineCapacity)||0);
  if (!state.requiresReload && ((state.repeaterRating === 0 && state.salvoRating === 0 && state.magazineCapacity === 0) || state.shotsRemaining >= capacity))
    return ready({ status: 'unavailable', reason: 'weapon-not-fired', state: clone(state) });
  const partialRepeater = state.repeaterRating > 0 && state.shotsRemaining > 0;
  const requiredSuccesses = Math.max(0, state.reloadSuccesses - Number(partialRepeater))*Number(reloadMultiplier);
  const next = { ...clone(state), reloading: true, requiresReload: true, accumulatedSuccesses: 0,
    requiredSuccesses, partialRepeater, reloadMultiplier:Number(reloadMultiplier), ...(Number.isSafeInteger(crewCount)?{reloadCrewCount:crewCount}:{}) };
  if (requiredSuccesses === 0) {
    next.reloading = false;
    next.requiresReload = false;
    next.shotsRemaining = restoredShots(next);
  }
  next.revision += 1;
  return ready({ status: requiredSuccesses === 0 ? 'reloaded' : 'reloading', state: next });
}

/** Each successful extended Test adds one success; Actions and its SL do not change the count. */
export function advanceV5Reload(state, { success, testSl, expectedRevision = state?.revision } = {}) {
  if (!validState(state) || !integer(state.requiredSuccesses)) return blocked('Rechargement : Test de progression commencé requis.');
  if (expectedRevision !== state.revision) return ready({ status: 'stale', state: clone(state) });
  if (!state.reloading) return ready({ status: 'unavailable', reason: 'not-reloading', state: clone(state) });
  if (typeof success !== 'boolean' || !Number.isSafeInteger(Number(testSl))) return blocked('Rechargement : réussite et DR entiers requis.');
  const next = clone(state);
  if (success) next.accumulatedSuccesses += 1;
  const done = next.accumulatedSuccesses >= next.requiredSuccesses;
  if (done) {
    next.reloading = false;
    next.requiresReload = false;
    next.shotsRemaining = restoredShots(next);
    next.accumulatedSuccesses = next.requiredSuccesses;
  }
  next.revision += 1;
  return ready({ status: done ? 'reloaded' : 'progress', state: next,
    progress: { successes: next.accumulatedSuccesses, required: next.requiredSuccesses } });
}
