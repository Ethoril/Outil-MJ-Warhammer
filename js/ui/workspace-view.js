import {createDivinePanel} from './v5-divine-panel.js';
import {createV5CorruptionPanel} from './v5-corruption-panel.js';
import {createV5BrokenEscapePanel,isBrokenActor} from './v5-broken-escape-panel.js';
import {beastFormRestriction} from '../core/v5-magic-arbitrations.js';
import { magicActionsFor } from '../core/creature-magic.js';
import { familiarOfOf, FAMILIAR_HEALING_SOURCES } from '../core/familiars.js';
/**
 * Vue de séance E09.
 *
 * Le composant ne persiste aucun état d'interface et ne modifie jamais le Store
 * directement. `actions` sert de frontière avec main.js : le composant affiche
 * les données du Store, puis délègue les commandes au contrôleur applicatif (ou à une commande publique du Store).
 * Seul l'aperçu de résolution (lecture seule) est demandé directement au Store.
 */
import { availableV5TalentActions } from '../core/v5-talent-actions.js';
import { createV5TimedEffect } from '../core/v5-effects.js';
import { openCampaignTimeDialog } from './v5-campaign-time-dialog.js';
import { isMiscastConditionLocked } from '../core/v5-magic-miscasts.js';
import { recoveryMethodsFor } from './v5-effect-dialog.js';
import { hasMomentum, inferV5Kind } from '../core/v5-combat-rules.js';
import { withoutOutnumberContext } from '../core/outnumbering.js';
import { equipmentAttackContext, weaponSkillGroupInfo } from '../core/equipment.js';
import { v5StoreActionClock } from '../core/v5-store-action.js';
import { d100 } from '../core/dice.js';
import { inferActionType, previewHpLoss, ResolutionError } from '../core/resolution.js';
import { userMessage, userError } from './messages.js';
import { formatV5Balance } from '../core/v5-resources.js';
import { normalizeEffects } from '../core/effects.js';
import { CAMP_LABELS, normalizeCamp, encounterDisplayStatus, encounterSummary, sortEncountersForDisplay } from '../core/encounters.js';
import { uid } from '../core/models.js';
import { renderFicheDetails } from './fiche-details.js';
import { renderSilhouette } from './silhouette.js';
import { buildParticipantReminders } from '../core/reminders.js';
import { renderResolutionPanel, actionKey, minusSigned, defenseOptions, defaultDefenseValue } from './resolution-panel.js';
import { initSidePanel } from './side-panel.js';
import { getSpellContract, getAllSpellContracts } from '../core/v5-spell-contracts.js';
import { magicGrantedActions, beastFormActions } from '../core/v5-magic-combat.js';
import { transformationOvercastCost } from '../core/v5-magic-arbitrations.js';
import { effectiveSupplementalEncumbrance } from '../core/v5-supplemental-equipment.js';
import { createV5AftermathPanel } from './v5-aftermath-panel.js';
import { WORKSPACE_SPACES, noop, node, button, readProfiles, readEncounters, readScenes, readParticipants, readCombat, turnKey, STATE_NAMES, stateLabel, toughnessBonus, armorSummary, displayedArmorLocations, hpText, hpBar, CRITICAL_ERROR_FIELDS, DEFENDER_CRITICAL_FIELDS, criticalRollError, dispelDistance, dispelVisible, validRoll, criticalRollsChanged, profileSearchText, createShell, profileSummary, magicCastingSpell } from './workspace/helpers.js';
export { WORKSPACE_SPACES, STATE_NAMES, magicCastingSpell } from './workspace/helpers.js';

/**
 * @param {{Store: object, Combat?: object, Bus?: object, mount?: Element, actions?: object}} options
 */
export function initWorkspaceView({ Store, Combat = {}, Bus = null, mount, actions = {}, showNavigation = true } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') {
    throw new TypeError('workspace-view nécessite un élément mount');
  }
  if (!Store) throw new TypeError('workspace-view nécessite Store');

  const refs = createShell(mount, { showNavigation });
  const state = {
    space: 'prepare',
    // Explicit target for the current actor: null = default, 'none' or an id.
    targetChoice: null,
    // Personnage actif choisi dans la piste : null = celui du tour, sinon { id, turn } (valable pour ce tour seulement).
    actorChoice: null,
    libraryQuery: '',
    librarySection: 'profiles',
    sideQuery: '',
    lastFocus: null,
    lastFocusSpace: null,
    lastFocusAction: null,
    actionBusy: false,
    hpAmounts: {},
    healSources: {},
    stateForm: null,
    // Résolution draft: survives every Bus re-render (no keystroke lost).
    resolution: emptyResolution(null)
  };
  function emptyResolution(actorId) {
    return {
      actorId, actionKey: null, externalActionId: null, type: null, attackRoll: '', defenseStat: null, defenseBase: null, defenseSource: null, defenseRoll: '', protectionContext: {}, ammunitionId: '', ammunitionArbitrated: false,
      // Critique : jets saisis, effets décochés et erreurs de saisie par champ (l'aperçu reste affiché).
      criticalInjureRoll: '', criticalInjureSecondRoll: '', criticalInjureAlternativeRoll: '', criticalInjureSecondAlternativeRoll: '', defenderCriticalSecondRoll:'',defenderCriticalSecondAlternativeRoll:'',defenderCriticalInjureSecondRoll:'',defenderCriticalInjureSecondAlternativeRoll:'',defenderCriticalInjureRoll: '', defenderCriticalInjureAlternativeRoll: '', criticalLocationRoll: '', criticalEffectRoll: '', criticalSecondRoll: '', criticalEffectAlternativeRoll: '', criticalSecondAlternativeRoll: '', criticalDeclined: [], criticalErrors: {}, defenderCriticalLocationRoll: '', defenderCriticalEffectRoll: '', defenderCriticalEffectAlternativeRoll: '', defenderCriticalDeclined: [],
      v5Kind: null, v5SlModifier: null, v5Advantages: 0, v5Disadvantages: 0, v5Choice: null, defenseChoice: null, charging: false, extraAttack: false, reactionId: null, reactionAction: null, aimed: false, beatBlade: false, actorSize: null, targetSize: null, defenseKind: null, defenseSlModifier: null, defenseAdvantages: 0, defenseDisadvantages: 0, v5Context: {}, defenseContext: {}, combatDefensiveSkillId: '', combatAimWeaponId: '', combatAimWeaponName: '', combatAimWeaponHeldConfirmed: false, combatAimWeaponKindConfirmed: false,
      preview: null, comparison: null, error: null, busy: false, brokenEscapeVisibility:null, hideSkillId:null
    };
  }
  // Un nouvel aperçu (autre action, type, cible ou jet) repart de zéro côté critique.
  function resetCritical(draft) {
    Object.assign(draft, { criticalInjureRoll: '', criticalInjureSecondRoll: '', criticalInjureAlternativeRoll: '', criticalInjureSecondAlternativeRoll: '', defenderCriticalSecondRoll:'',defenderCriticalSecondAlternativeRoll:'',defenderCriticalInjureSecondRoll:'',defenderCriticalInjureSecondAlternativeRoll:'',defenderCriticalInjureRoll: '', defenderCriticalInjureAlternativeRoll: '', criticalLocationRoll: '', criticalEffectRoll: '', criticalSecondRoll: '', criticalEffectAlternativeRoll: '', criticalSecondAlternativeRoll: '', criticalDeclined: [], criticalErrors: {}, defenderCriticalLocationRoll: '', defenderCriticalEffectRoll: '', defenderCriticalEffectAlternativeRoll: '', defenderCriticalDeclined: [] });
  }
  // Dés saisis pour UN lancer (incidents, perte de Focalisation, dés secondaires, vortex, 3d10, épuisement, test secondaire) :
  // jamais réutilisés pour le lancer suivant, sinon la persistance du brouillon fait office de dé implicite.
  const MAGIC_DICE_KEYS = ['magicFumbleLossRoll', 'magicMiscastRoll', 'magicMiscastRoll2', 'magicMajorRoll', 'magicSecondaryDurationRoll', 'magicSecondaryDamageRoll', 'magicSecondaryDistanceRoll', 'magicSecondaryLocation', 'magicResistanceRoll', 'magicVortexDirection', 'magicVortexWillpower', 'magicVortexDirectionRoll', 'magicVortexDistance', 'magicNoOtherTargets', 'magicRoll3d10', 'magicDurationAmount', 'magicDurationUnit', 'magicBurnoutRoll', 'magicCadaiTestRoll', 'magicCadaiMiscastRoll', 'magicCadaiBurnoutRoll', 'magicCadaiCorruptionRoll', 'magicCorruptionInitialRoll', 'magicExtraRoll1', 'magicExtraRoll2', 'magicExtraDuration1', 'magicExtraDuration2', 'magicExtraDamage1', 'magicExtraDamage2', 'magicExtraDistance1', 'magicExtraDistance2', 'magicExtraLocation1', 'magicExtraLocation2', 'magicDispelRoll', 'magicPersistentRestart', 'magicWardRoll'];
  // Réponses propres à une attaque (nature, d10 de Protection, Test de Calme) : jamais reportées sur la suivante.
  function forgetAttackAnswers(draft) {
    const { attackNature, magicWardRoll, reductionCalm, trip, tripPrimaryResolutionId, athleticsSkillId, tripFallEnduranceRoll, tripLegLocationRoll, tripLegCriticalEffectRoll, tripExtraLocationRoll, tripExtraCriticalEffectRoll, tripFallWardRoll, tripFallCalmTest, secondWeaponAttack, primaryResolutionId, extraordinaryShot, extraordinaryShotDescription, extraordinaryShotDifficulty, throwingWeapon, scatterDirectionRoll, scatterDistanceRolls, shooterTargetDistanceYards, targetEngaged, engagedWithShooter, repeaterDoubleShot, repeaterSecondShot, engagedTargetIds, engagedTargetRoll, engagedDefensesById, confirmLethalDeath, lethalIntent, warpBladeEnduranceTest, f2h, ...context } = draft.v5Context || {};
    draft.v5Context = context;
    const { attackNature: defenseNature, ...defenseContext } = draft.defenseContext || {};
    draft.defenseContext = defenseContext;
  }
  function resetMagicDice(draft) {
    draft.magicCtRoll=null;
    for (const key of MAGIC_DICE_KEYS) draft[key] = key === 'magicNoOtherTargets' ? false : null;
    draft.magicTargetTests = {};
    draft.magicMountedRideTests = {};
    draft.magicSecondaryRolls = {};
  }
  // Autre jet de critique : ses effets repartent cochés (les cases décochées visaient l'ancien tirage).
  // La localisation change aussi les dégâts, donc l'existence du second critique.
  function forgetDeclined(draft, field) {
    if (field.startsWith('defender')) { draft.defenderCriticalDeclined = []; return; }
    const prefixes = field === 'criticalLocationRoll' ? ['first-', 'second-'] : ['criticalEffectRoll', 'criticalEffectAlternativeRoll'].includes(field) ? ['first-'] : ['second-'];
    draft.criticalDeclined = draft.criticalDeclined.filter(id => !prefixes.some(prefix => id.startsWith(prefix)));
  }
  function previewIsStale(preview) { return Boolean(preview && typeof Store.getLocalRevision === 'function' && preview.baseRevision !== Store.getLocalRevision()); }
  function rejectStalePreview() {
    const draft=state.resolution;draft.preview=null;draft.comparison=null;draft.v5Choice=null;draft.defenseChoice=null;
    draft.error={field:'general',message:'La partie a changé depuis la comparaison : recalculez les conséquences avant de choisir.'};render('calculate');
  }
  function recalculateCritical() {
    const draft = state.resolution;
    if(previewIsStale(draft.preview)){rejectStalePreview();return;}
    if (draft.preview && !draft.busy) resolutionHandlers.calculate();
  }
  // Appui en cours (souris ou doigt) : le recalcul qui suit la sortie d'un champ de critique attend
  // le relâchement, pour que le clic atteigne le bouton visé avant qu'il soit reconstruit.
  const press = { active: false, waiting: false };
  const pressDocument = mount.ownerDocument || document;
  const release = () => {
    press.active = false;
    if (!press.waiting) return;
    press.waiting = false;
    setTimeout(recalculateCritical);
  };
  pressDocument.addEventListener('pointerdown', () => { press.active = true; }, true);
  pressDocument.addEventListener('pointerup', release, true);
  pressDocument.addEventListener('pointercancel', release, true);
  const callbacks = {
    beginEncounter: typeof actions.beginEncounter === 'function' ? actions.beginEncounter : null,
    editEncounter: typeof actions.editEncounter === 'function' ? actions.editEncounter : null,
    launchEncounter: typeof actions.launchEncounter === 'function' ? actions.launchEncounter : null,
    deleteEncounter: typeof actions.deleteEncounter === 'function' ? actions.deleteEncounter : null,
    resumeScene: typeof actions.resumeScene === 'function' ? actions.resumeScene : null,
    suspendScene: typeof actions.suspendScene === 'function' ? actions.suspendScene : null,
    restartCombat: typeof actions.restartCombat === 'function' ? actions.restartCombat : null,
    showPlay: typeof actions.showPlay === 'function' ? actions.showPlay : null,
    spaceShown: typeof actions.spaceShown === 'function' ? actions.spaceShown : null,
    createProfile: typeof actions.createProfile === 'function' ? actions.createProfile : null,
    duplicateProfile: typeof actions.duplicateProfile === 'function' ? actions.duplicateProfile : null,
    removeProfile: typeof actions.removeProfile === 'function' ? actions.removeProfile : null,
    editProfile: typeof actions.editProfile === 'function' ? actions.editProfile : null,
    editParticipant: typeof actions.editParticipant === 'function' ? actions.editParticipant : null,
    removeParticipant: typeof actions.removeParticipant === 'function' ? actions.removeParticipant : null,
    renderRules: actions.renderRules || null,
    renderOverview: typeof actions.renderOverview === 'function' ? actions.renderOverview : null,
    renderLog: actions.renderLog || null,
    selectLibrarySection: actions.selectLibrarySection || noop,
    adjustHp: typeof actions.adjustHp === 'function' ? actions.adjustHp : null,
    enterParticipant: typeof actions.enterParticipant === 'function' ? actions.enterParticipant : null,
    setMomentum: typeof actions.setMomentum === 'function' ? actions.setMomentum : null,
    getFortune: typeof actions.getFortune === 'function' ? actions.getFortune : null,
    editFortune: typeof actions.editFortune === 'function' ? actions.editFortune : null,
    getFate: typeof actions.getFate === 'function' ? actions.getFate : null,
    editFate: typeof actions.editFate === 'function' ? actions.editFate : null,
    setStates: typeof actions.setStates === 'function' ? actions.setStates : null,
    acquireStates: typeof actions.acquireStates === 'function' ? actions.acquireStates : null,
    recoverState: typeof actions.recoverState === 'function' ? actions.recoverState : null,
    healCriticalWound: typeof actions.healCriticalWound === 'function' ? actions.healCriticalWound : Store.healCriticalWound?.bind(Store),
    applyResolution: typeof actions.applyResolution === 'function' ? actions.applyResolution : null,
    declareCombatAction: typeof actions.declareCombatAction === 'function' ? actions.declareCombatAction : null,
    declareCombatMovement: typeof actions.declareCombatMovement === 'function' ? actions.declareCombatMovement : null,
    addProfileToCombat: typeof actions.addProfileToCombat === 'function' ? actions.addProfileToCombat : null,
    addProfileToActiveCombat: typeof actions.addProfileToActiveCombat === 'function' ? actions.addProfileToActiveCombat : null
  };

  const divinePanel=createDivinePanel({Store,refresh:()=>render()});
  const corruptionPanel=createV5CorruptionPanel({Store,refresh:()=>render()});
  const aftermathPanel=createV5AftermathPanel({Store,refresh:()=>render()});
  const brokenEscapePanel=createV5BrokenEscapePanel({Store,refresh:()=>render(),onPrepareHide(actorId,skillId){
    const actor=readParticipants(Store).find(row=>row.id===actorId&&row.zone==='active');if(!actor)return;
    state.space='play';state.actorChoice={id:actorId,turn:turnKey(readCombat(Store))};state.resolution=emptyResolution(actorId);state.resolution.hideSkillId=skillId;state.resolution.type='skill';state.resolution.v5Context={isAction:true,runningOrHiding:true,involvesMovement:false};
    const actions=actorActions(actor),index=actions.findIndex(row=>row.id==='broken-hide:'+skillId);if(index>=0)state.resolution.actionKey=actionKey(actions[index],index);
    state.targetChoice='none';render();
  }});

  function actorActions(participant) {
    if (!participant) return [];
    const lines = typeof Store.getDiceLines === 'function' ? Store.getDiceLines().filter(line => line.participantId === participant.id) : [];
    const magicActions = magicActionsFor(participant, { channel: !beastFormRestriction(participant, 'channel'), cast: !beastFormRestriction(participant, 'cast') });
    // Équipement lâché sous forme animale : ni armes ni attaques du lanceur, seulement celles de la créature.
    const transformed = Boolean(participant.extensions?.v5?.beastForm);
    const ownActions = ((participant.actions || []).length ? participant.actions : lines).filter(action => !transformed || (!['attack', 'attaque'].includes(action.type) && !action.extensions?.fiche?.equipmentId));
    let available = [...ownActions, ...availableV5TalentActions(participant), ...(transformed ? beastFormActions(participant) : magicGrantedActions(participant)), ...magicActions];
    if(state.resolution.actorId===participant.id&&state.resolution.hideSkillId){
      const skill=(participant.skills||[]).find(row=>(row.id||row.name||row.nom)===state.resolution.hideSkillId&&row.status==='resolved');
      if(skill){const id='broken-hide:'+state.resolution.hideSkillId;available=[...available.filter(row=>row.id!==id),{id,name:(skill.name||skill.nom||skill.sourceName||'Discrétion')+' · Test facultatif Hide',type:'skill',base:Number(skill.total??skill.value),attr:skill.carac||skill.characteristic||'Ag',mod:0,qualities:[],extensions:{fiche:{skillId:state.resolution.hideSkillId},v5:{kind:'test'}}}];}
    }
    if (state.resolution.actorId === participant.id && state.resolution.reactionAction) {
      const bound = state.resolution.reactionAction;
      available = available.some(row => row.id === bound.id) ? available.map(row => row.id === bound.id ? bound : row) : [...available, bound];
    }
    const resumed = state.resolution.actorId === participant.id && lines.find(line => line.id === state.resolution.externalActionId);
    return resumed && !available.some(action => action.id === resumed.id) ? [...available, resumed] : available;
  }

  // Everything Jouer derives from the Store for one render: actor, target,
  // selected action and type. The draft is reset when the acting turn changes.
  function playContext() {
    const participants = readParticipants(Store);
    const combat = readCombat(Store);
    const byId = new Map(participants.map(participant => [participant.id, participant]));
    const orderIds = typeof Store.getEffectiveOrder === 'function' ? Store.getEffectiveOrder() : participants.map(participant => participant.id);
    const active = orderIds.map(id => byId.get(id)).filter(participant => participant?.zone === 'active');
    participants.forEach(participant => { if (participant.zone === 'active' && !active.includes(participant)) active.push(participant); });
    const bench = participants.filter(participant => participant.zone !== 'active');
    // Le choix de la piste ne vaut que pour le tour où il a été fait.
    const turn = turnKey(combat);
    if (state.actorChoice && state.actorChoice.turn !== turn) state.actorChoice = null;
    const turnActor = active.find(participant => participant.id === combat.currentActorId) || null;
    const chosen = state.actorChoice ? active.find(participant => participant.id === state.actorChoice.id) : null;
    if (state.actorChoice && !chosen) state.actorChoice = null;
    const actor = chosen || turnActor || active[0] || null;
    const started = Number(combat.round) > 0 && Boolean(turnActor);

    if (state.resolution.actorId !== (actor?.id || null)) {
      state.resolution = emptyResolution(actor?.id || null);
      state.targetChoice = null;
    }
    const draft = state.resolution;
    const actions = actorActions(actor);
    const keys = actions.map(actionKey);
    if (!keys.includes(draft.actionKey)) {
      draft.actionKey = keys[0] || null;
      draft.v5Kind = null; draft.v5SlModifier = null; draft.charging = false; draft.extraAttack = false; draft.reactionId = null; draft.reactionAction = null; draft.aimed = false; draft.beatBlade = false; draft.fortuneReroll = false; draft.reverseDice = false; draft.fortuneRerollRoll = null; draft.actorSize = null; draft.targetSize = null; draft.v5Advantages = 0; draft.v5Disadvantages = 0; draft.v5Context = {}; draft.talentChoices = {}; draft.type = null; draft.ammunitionId = ''; draft.ammunitionArbitrated = false; draft.protectionContext = {};
    }
    const action = actions[keys.indexOf(draft.actionKey)] || null;
    const type = draft.type || (action && ['channelling', 'cast', 'dispel'].includes(action.type) ? action.type : (action ? inferActionType(action) : null));

    const camp = participant => normalizeCamp(participant?.camp, participant?.kind);
    const others = active.filter(participant => participant.id !== actor?.id);
    const groups = {
      adversaries: others.filter(participant => camp(participant) !== camp(actor)),
      allies: others.filter(participant => camp(participant) === camp(actor))
    };
    let target = null;
    if (state.targetChoice && state.targetChoice !== 'none') {
      target = (state.targetChoice === actor?.id ? actor : others.find(participant => participant.id === state.targetChoice)) || null;
    }
    if (!target && state.targetChoice !== 'none' && !['skill', 'channelling'].includes(type)) {
      target = groups.adversaries[0] || others[0] || (type === 'cast' ? actor : null);
    }
    if (draft.preview && !draft.preview.v5MagicKind && (draft.preview.engagedShot?.intendedTargetId ?? draft.preview.targetId ?? draft.preview.input?.targetId ?? null) !== (target?.id ?? null)) { draft.preview = null; resetCritical(draft); }
    // Les engagés cochés valent pour la cible où ils ont été saisis : une cible qui change sans passer par un choix les périme.
    if (draft.outnumberTargetId && draft.outnumberTargetId !== (target?.id ?? null) && draft.v5Context) draft.v5Context = withoutOutnumberContext(draft.v5Context);
    draft.outnumberTargetId = target?.id ?? null;
    const defense = ['attack','opposition'].includes(type) && target ? defenseChoice(target, type) : null;
    if (defense) {
      // Valeur pré-remplie pour une cible, une option et sa valeur : une autre combinaison (jet disparu,
      // autre cible, CC modifiée) repart de sa propre valeur, une saisie à la main sur la même reste. « Autre » garde la saisie.
      const source = defense.option.value === 'Autre' ? 'Autre' : `${target.id}|${defense.option.value}|${defense.option.base}`;
      if (draft.defenseSource !== source) {
        draft.defenseSource = source;
        draft.defenseKind = null; draft.defenseSlModifier = null; draft.defenseContext = {}; draft.defenseTalentChoices = {};
        draft.defenseAdvantages = 0; draft.defenseDisadvantages = 0; draft.defenseChoice = null;
        if (source !== 'Autre') draft.defenseBase = null;
        draft.protectionContext = {};
      }
      if (draft.defenseBase === null && source !== 'Autre') draft.defenseBase = defense.option.base === null ? null : String(defense.option.base);
    }
    return { participants, combat, active, bench, actor, turnActor, started, actions, action, type, target, groups, defense, camp };
  }

  // Options de défense d'une cible et choix effectif : celui du brouillon s'il existe chez elle, sinon son défaut.
  function defenseChoice(target, type) {
    const options = defenseOptions(target, actorActions(target), { includeEndurance: type === 'opposition' });
    const wanted = state.resolution.defenseStat;
    const option = options.find(item => item.value === wanted) || options.find(item => item.value === defaultDefenseValue(options));
    return { options, value: option.value, option };
  }

  function renderTabs() {
    if (!refs.nav) return;
    refs.nav.querySelectorAll('[data-workspace-space]').forEach(tab => {
      const active = tab.dataset.workspaceSpace === state.space;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      tab.id = `workspace-tab-${tab.dataset.workspaceSpace}`;
    });
  }

  function renderPrepare() {
    refs.prepare.replaceChildren();
    const header = node('div', 'workspace-section-heading');
    const title = node('div');
    title.appendChild(node('h2', '', 'Préparer'));
    header.appendChild(title);
    const create = button('Nouveau profil', 'workspace-secondary');
    create.dataset.workspaceAction = 'create-profile';
    create.disabled = state.actionBusy || !callbacks.createProfile;
    if (!callbacks.createProfile) create.title = 'Action indisponible';
    header.appendChild(create);
    const launch = button('Nouvelle rencontre', 'workspace-primary', { 'data-focus-key': 'new-encounter' });
    launch.dataset.workspaceAction = 'begin-encounter';
    launch.disabled = state.actionBusy || !callbacks.beginEncounter;
    if (!callbacks.beginEncounter) launch.title = 'Action indisponible';
    header.appendChild(launch);
    refs.prepare.appendChild(header);

    refs.prepare.appendChild(rubric('Rencontres'));
    const encounters = encounterList({ compact: false });
    if (encounters.note) refs.prepare.appendChild(encounters.note);
    if (encounters.list) refs.prepare.appendChild(encounters.list);
    else refs.prepare.appendChild(node('p', 'workspace-muted', 'Aucune rencontre préparée : « Nouvelle rencontre » pour en composer une à l’avance.'));

    refs.prepare.appendChild(rubric('Profils'));
    const profiles = readProfiles(Store);
    if (!profiles.length) {
      const empty = node('div', 'workspace-empty workspace-card');
      empty.append(node('h3', '', 'Aucun profil préparé'), node('p', '', 'Créez un profil ou chargez une sauvegarde pour préparer la séance.'));
      const library = button('Ouvrir la bibliothèque', 'workspace-secondary');
      library.dataset.workspaceSpace = 'library';
      empty.appendChild(library);
      refs.prepare.appendChild(empty);
      return;
    }
    const list = node('div', 'workspace-profile-grid');
    profiles.forEach(profile => { const card=profileSummary(profile, {
      canEdit: Boolean(callbacks.editProfile),
      canDuplicate: Boolean(callbacks.duplicateProfile),
      canRemove: Boolean(callbacks.removeProfile),
      onEdit: callbacks.editProfile,
      onDuplicate: callbacks.duplicateProfile,
      onRemove: callbacks.removeProfile
    }); card.appendChild(renderFicheDetails(profile)); list.appendChild(card); });
    refs.prepare.appendChild(list);
  }

  // Cartes des rencontres enregistrées. `compact` (Jouer, sans combat) : titre,
  // statut, composition et le seul bouton principal, sans les rencontres en cours.
  function encounterList({ compact }) {
    const scenes = readScenes(Store);
    const profiles = readProfiles(Store);
    const running = scenes.activeScene?.status === 'active';
    let encounters = sortEncountersForDisplay(readEncounters(Store), scenes);
    if (compact) encounters = encounters.filter(encounter => encounterDisplayStatus(encounter, scenes).key !== 'active');
    // Aussi sans carte : le combat en cours peut venir d'une rencontre supprimée depuis.
    const note = !compact && running
      ? node('p', 'workspace-muted workspace-encounter-note', `Combat en cours : « ${scenes.activeScene.title || 'Séance'} ». Suspendez-le ou supprimez la rencontre pour en lancer une autre.`)
      : null;
    if (!encounters.length) return { list: null, note };
    const list = node('div', 'workspace-encounter-list');
    encounters.forEach(encounter => list.appendChild(encounterCard(encounter, {
      status: encounterDisplayStatus(encounter, scenes), summary: encounterSummary(encounter, profiles), running, compact
    })));
    return { list, note };
  }

  function encounterCard(encounter, { status, summary, running, compact }) {
    const name = encounter.title || 'Rencontre sans titre';
    const card = node('article', `workspace-encounter-card${compact ? ' is-compact' : ''}`);
    card.dataset.encounterId = encounter.id;
    const head = node('div', 'workspace-encounter-head');
    head.append(node(compact ? 'h4' : 'h3', '', name), node('span', `workspace-encounter-status is-${status.key}`, status.label));
    card.appendChild(head);
    card.appendChild(node('p', 'workspace-encounter-meta', `${summary.count} combattant${summary.count > 1 ? 's' : ''}${summary.text ? ` · ${summary.text}` : ''}`));
    const firstNote = (encounter.notes || '').split('\n').map(line => line.trim()).find(Boolean);
    if (firstNote && !compact) card.appendChild(node('p', 'workspace-encounter-notes', firstNote));
    const command = (label, className, action, callback, { disabled = false, title = '', scene = false } = {}) => {
      const element = button(label, className, { 'aria-label': `${label} « ${name} »`, 'data-focus-key': `${action}-${encounter.id}` });
      element.dataset.workspaceAction = action;
      element.dataset.encounterId = encounter.id;
      if (scene) element.dataset.sceneId = status.sceneId;
      element.disabled = state.actionBusy || !callback || disabled;
      if (!callback) element.title = 'Action indisponible';
      else if (disabled) element.title = title;
      return element;
    };
    const busyTitle = 'Un combat est en cours : suspendez-le ou supprimez sa rencontre d’abord';
    const actions = node('div', 'workspace-inline-actions');
    if (status.key === 'active') {
      actions.appendChild(command('Revenir au combat', 'workspace-primary', 'show-play', callbacks.showPlay));
      if (!compact) actions.appendChild(command('Suspendre', 'workspace-secondary', 'suspend-scene', callbacks.suspendScene));
      if (!compact) actions.appendChild(command('Recommencer', 'workspace-secondary', 'restart-combat', callbacks.restartCombat));
    } else if (status.key === 'suspended') {
      actions.appendChild(command('Reprendre', 'workspace-primary', 'resume-scene', callbacks.resumeScene, { disabled: running, title: busyTitle, scene: true }));
    } else {
      actions.appendChild(command('Lancer', 'workspace-primary', 'launch-encounter', callbacks.launchEncounter, { disabled: running || summary.count === 0, title: running ? busyTitle : 'Ajoutez au moins un combattant' }));
    }
    if (!compact) {
      actions.appendChild(command('Modifier', 'workspace-secondary', 'edit-encounter', callbacks.editEncounter));
      actions.appendChild(command('Supprimer', 'workspace-secondary', 'delete-encounter', callbacks.deleteEncounter));
    }
    card.appendChild(actions);
    return card;
  }

  function rubric(text, tag = 'h3') {
    return node(tag, 'workspace-rubric', text);
  }

  function campChip(participant, camp) {
    const value = camp(participant);
    return node('span', `workspace-camp is-${value}`, CAMP_LABELS[value]);
  }

  function renderTrack(context) {
    const column = play.track;
    column.replaceChildren(rubric('Piste des tours'));
    const track = node('div', 'workspace-track');
    track.setAttribute('aria-label', 'Piste des tours');
    if (!context.active.length) track.appendChild(node('p', 'workspace-muted', 'Aucun combattant en jeu.'));
    context.active.forEach(participant => {
      const isActor = participant.id === context.actor?.id;
      const isCurrent = participant.id === context.combat.currentActorId;
      const isTurn = context.started && isCurrent;
      const isTarget = participant.id === context.target?.id;
      // Pas d'aria-label : le contenu (nom, PV, BE, PA, états) forme le nom accessible.
      const item = button('', `workspace-track-item is-camp-${context.camp(participant)}`, {
        'aria-pressed': String(isActor),
        'data-focus-key': `select-${participant.id}`
      });
      item.dataset.workspaceSelect = participant.id;
      item.classList.toggle('is-actor', isActor);
      item.classList.toggle('is-turn', isTurn);
      item.classList.toggle('is-target', isTarget);
      // Comme le ▶ : pas de « tour » annoncé tant que le combat n'a pas commencé.
      if (isTurn) item.setAttribute('aria-current', 'step');
      const top = node('span', 'workspace-track-top');
      top.append(node('span', 'workspace-track-marker', isTurn ? '▶' : ''), node('strong', 'workspace-track-name combatant-name', participant.name));
      if (isTarget) top.appendChild(node('span', 'workspace-track-role', 'cible'));
      const hp = node('span', 'workspace-track-hp num', hpText(participant));
      hp.prepend(node('span', 'workspace-sr', 'PV '));
      top.appendChild(hp);
      item.append(top, hpBar(participant),
        node('span', 'workspace-track-meta num', `BE ${toughnessBonus(participant)} · PA ${armorSummary(participant.armor,displayedArmorLocations(participant))}`));
      const states = normalizeEffects(participant.states);
      if (states.length) {
        const list = node('span', 'workspace-track-states');
        states.forEach(item => list.appendChild(node('span', 'workspace-state-chip', stateLabel(item))));
        item.appendChild(list);
      }
      const remove = defeatedParticipantButton(participant, `track-remove-${participant.id}`);
      if (remove) {
        const entry = node('div', `workspace-track-entry is-camp-${context.camp(participant)}`);
        entry.append(item, remove);
        track.appendChild(entry);
      } else track.appendChild(item);
    });
    column.appendChild(track);

    if (context.bench.length) {
      const bench = node('section', 'workspace-bench');
      bench.setAttribute('aria-label', 'En attente');
      bench.appendChild(rubric(`En attente (${context.bench.length})`));
      context.bench.forEach(participant => {
        const row = node('div', 'workspace-bench-item');
        const label = node('span', 'workspace-bench-label');
        label.append(node('span', 'combatant-name', participant.name), ' ', node('span', 'num workspace-muted', `PV ${hpText(participant)}`));
        const enter = button('Faire entrer', 'workspace-secondary', { 'aria-label': `Faire entrer ${participant.name}`, 'data-focus-key': `enter-${participant.id}` });
        enter.dataset.workspaceAction = 'enter-participant';
        enter.dataset.actorId = participant.id;
        enter.disabled = !callbacks.enterParticipant;
        if (!callbacks.enterParticipant) enter.title = 'Action indisponible';
        row.append(label, enter);
        const remove = defeatedParticipantButton(participant, `bench-remove-${participant.id}`);
        if (remove) row.appendChild(remove);
        bench.appendChild(row);
        // Rappels du participant au banc (armure inconnue du bestiaire…) : visibles avant son entrée en combat.
        const reminders = participantReminderBlock(participant);
        if (reminders) bench.appendChild(reminders);
      });
      column.appendChild(bench);
    }
  }

  // Bloc des rappels portés par un participant (Fait / Ignorer) ; null sans rappel. Partagé par le banc et la fiche du personnage actif.
  function participantReminderBlock(participant) {
    const reminders = buildParticipantReminders(tag => node(tag, ''), Store.getParticipantReminders?.(participant.id));
    if (!reminders) return null;
    reminders.addEventListener('click', event => {
      const decision = event.target?.dataset?.decision, reminderId = event.target?.closest?.('.actor-reminder')?.dataset?.reminderId;
      if (!decision || !reminderId) return;
      event.preventDefault();
      Promise.resolve(Store.resolveParticipantReminder(participant.id, reminderId, decision)).finally(() => render());
    });
    return reminders;
  }

  const isHomunculusParticipant = participant => familiarOfOf(participant)?.system === 'homunculus';

  function renderStateForm(participant) {
    const form = node('div', 'workspace-state-form');
    form.setAttribute('role', 'group');
    form.setAttribute('aria-label', `Ajouter un état à ${participant.name}`);
    const draft = state.stateForm;
    const name = document.createElement('select');
    name.setAttribute('aria-label', 'État');
    name.dataset.focusKey = 'state-form-name';
    STATE_NAMES.forEach(value => name.appendChild(new Option(value, value)));
    name.value = draft.name;
    name.addEventListener('change', () => { draft.name = name.value; });
    const level = document.createElement('input');
    level.type = 'number'; level.min = '1'; level.value = draft.level;
    level.setAttribute('aria-label', 'Niveau');
    level.dataset.focusKey = 'state-form-level';
    level.addEventListener('input', () => { draft.level = level.value; });
    const expiry = node('label', 'workspace-type', 'Échéance'); const phase = document.createElement('select');
    phase.setAttribute('aria-label', 'Phase d’expiration'); phase.dataset.focusKey='state-form-expiry-phase';
    phase.append(new Option('Permanent', ''),new Option('Début du Tour', 'startOfTurn'),new Option('Fin du Tour', 'endOfTurn'),new Option('Fin du Round', 'endOfRound'));phase.value=draft.expiryPhase||'';
    phase.addEventListener('change',()=>{draft.expiryPhase=phase.value;render('state-form-expiry-phase');});expiry.append(phase);
    const expirationFields = node('div','workspace-state-expiration');
    if(draft.expiryPhase) {
      const roundLabel=node('label','workspace-type','À partir du Round');const round=document.createElement('input');round.type='number';round.min='1';round.step='1';round.value=draft.expiryRound;round.setAttribute('aria-label','Round d’expiration');round.dataset.focusKey='state-form-expiry-round';round.addEventListener('input',()=>{draft.expiryRound=round.value;});roundLabel.append(round);expirationFields.append(roundLabel);
      if(draft.expiryPhase!=='endOfRound') {
        const actorLabel=node('label','workspace-type','Tour de');const actor=document.createElement('select');actor.setAttribute('aria-label','Acteur du Tour d’expiration');actor.dataset.focusKey='state-form-expiry-actor';readParticipants(Store).forEach(item=>actor.append(new Option(item.name,item.id)));actor.value=draft.expiryActorId||participant.id;actor.addEventListener('change',()=>{draft.expiryActorId=actor.value;});actorLabel.append(actor);expirationFields.append(actorLabel);
      }
      expirationFields.append(node('p','workspace-muted','L’effet expire lors du prochain passage à cette phase, à partir du Round indiqué.'));
    }
    const author=readParticipants(Store).find(item=>item.id===readCombat(Store).currentActorId)||participant;
    expirationFields.append(node('p','workspace-muted',`Auteur : ${author.name} · Cible : ${participant.name}`));
    // Un homoncule ne subit Hémorragique, Exténué, Empoisonné ou une maladie que d'une source magique.
    const magical = document.createElement('input');
    magical.type = 'checkbox'; magical.checked = draft.magical === true;
    magical.dataset.focusKey = 'state-form-magical';
    magical.addEventListener('change', () => { draft.magical = magical.checked; });
    const magicalLabel = node('label', 'workspace-type', 'Source magique ');
    magicalLabel.appendChild(magical);
    const add = button('Ajouter', 'workspace-secondary', { 'data-focus-key': 'state-form-add' });
    add.dataset.workspaceAction = 'add-state';
    add.dataset.actorId = participant.id;
    const cancel = button('Annuler', 'workspace-ghost', { 'aria-label': 'Annuler l’ajout d’état', 'data-focus-key': 'state-form-cancel' });
    cancel.dataset.workspaceAction = 'cancel-state';
    if (draft.error) {
      const alert = node('p', 'workspace-field-error', draft.error);
      alert.setAttribute('role', 'alert');
      form.appendChild(alert);
    }
    form.append(name, level, expiry, expirationFields, ...(isHomunculusParticipant(participant) ? [magicalLabel] : []), add, cancel);
    return form;
  }

  function canRemoveDefeated(participant) {
    return participant && Number(participant.hp) <= 0 && participant.kind !== 'PJ' && normalizeCamp(participant.camp, participant.kind) !== 'pj';
  }

  function defeatedParticipantButton(participant, focusKey) {
    if (!canRemoveDefeated(participant)) return null;
    const remove = button('Retirer du combat', 'workspace-secondary danger', { 'aria-label': `Retirer ${participant.name} du combat`, 'data-focus-key': focusKey });
    remove.dataset.workspaceAction = 'remove-participant';
    remove.dataset.actorId = participant.id;
    remove.disabled = !callbacks.removeParticipant;
    return remove;
  }

  function renderSheet(participant, role, context) {
    const isTarget = role === 'target';
    const sheet = node('article', `workspace-actor-sheet workspace-card workspace-sheet-${role}`);
    sheet.dataset.sheetRole = role;
    const heading = node('div', 'workspace-sheet-heading');
    const actorLabel = !context.started ? 'Personnage actif' : participant?.id === context.turnActor?.id ? 'Au tour de' : 'Agit hors tour';
    const roleLabel = rubric(isTarget ? 'Cible' : actorLabel, 'p');
    if (!participant) {
      sheet.classList.add('is-empty');
      sheet.append(roleLabel, node('p', 'workspace-muted', isTarget
        ? 'Aucune cible : choisissez-la sous « Cible » dans Résolution.'
        : 'Aucun combattant en jeu.'));
      return sheet;
    }
    sheet.dataset.actorId = participant.id;
    const preview = state.resolution.preview;
    const hit = isTarget && preview && !preview.choiceRequired && preview.targetId === participant.id ? preview : null;

    const identity = node('div', 'workspace-sheet-identity');
    identity.append(roleLabel);
    const nameRow = node('div', 'workspace-sheet-name-row');
    nameRow.append(node('h2', 'workspace-sheet-name combatant-name', participant.name), campChip(participant, context.camp));
    identity.appendChild(nameRow);
    const hp = node('p', 'workspace-sheet-hp num');
    hp.append(node('span', 'workspace-sheet-hp-label', 'PV'), ' ', hpText(participant));
    if (hit?.damage || hit?.critical?.application?.extraWounds) hp.appendChild(node('span', 'workspace-sheet-hp-after', ` → ${minusSigned(Math.max(0, (Number(participant.hp) || 0) - previewHpLoss(hit)))}`));
    heading.append(identity, hp);
    sheet.append(heading, hpBar(participant));
    const ownReminders = !isTarget ? participantReminderBlock(participant) : null;
    if (ownReminders) sheet.appendChild(ownReminders);

    const amount = state.hpAmounts[participant.id] ?? '1';
    const hpControls = node('div', 'workspace-hp-controls');
    const minus = button('−', 'workspace-secondary', { 'data-focus-key': `hp-minus-${participant.id}` });
    const plus = button('+', 'workspace-secondary', { 'data-focus-key': `hp-plus-${participant.id}` });
    const quantity = document.createElement('input');
    quantity.type = 'number'; quantity.min = '1'; quantity.value = amount;
    quantity.className = 'workspace-hp-amount';
    quantity.setAttribute('aria-label', `Quantité de PV pour ${participant.name}`);
    quantity.dataset.focusKey = `hp-amount-${participant.id}`;
    const labelControls = () => {
      const value = Math.max(1, Math.floor(Number(state.hpAmounts[participant.id] ?? '1')) || 1);
      minus.setAttribute('aria-label', `−${value} PV pour ${participant.name}`);
      plus.setAttribute('aria-label', `+${value} PV pour ${participant.name}`);
      minus.dataset.hpDelta = String(-value);
      plus.dataset.hpDelta = String(value);
    };
    quantity.addEventListener('input', () => { state.hpAmounts[participant.id] = quantity.value; labelControls(); });
    [minus, plus].forEach(control => {
      control.dataset.workspaceAction = 'adjust-hp';
      control.dataset.actorId = participant.id;
      control.disabled = state.actionBusy || !callbacks.adjustHp;
      if (!callbacks.adjustHp) control.title = 'Contrôle indisponible sans callback applicatif';
    });
    labelControls();
    hpControls.append(minus, quantity, plus);
    // Un homoncule ne guérit que par guérison naturelle ou par la magie : la source du soin se choisit avant « + ».
    if (isHomunculusParticipant(participant)) {
      const source = document.createElement('select');
      source.setAttribute('aria-label', `Source du soin pour ${participant.name}`);
      source.dataset.focusKey = `hp-source-${participant.id}`;
      source.append(new Option('Source du soin…', ''));
      FAMILIAR_HEALING_SOURCES.forEach(row => source.append(new Option(row.label, row.kind)));
      source.value = state.healSources[participant.id] || '';
      source.addEventListener('change', () => { state.healSources[participant.id] = source.value; });
      hpControls.insertBefore(source, plus);
    }
    sheet.appendChild(hpControls);

    const caracs = participant.caracs || {};
    const value = key => (Number.isFinite(Number(caracs[key])) && caracs[key] !== null && caracs[key] !== '' ? Number(caracs[key]) : null);
    const bonus = (key, bonusKey) => value(bonusKey) ?? (value(key) === null ? null : Math.floor(value(key) / 10));
    const pair = (key, bonusKey) => (value(key) === null ? '—' : `${value(key)} · ${bonus(key, bonusKey)}`);
    // Sans caractéristique I, l'initiative du combattant en tient lieu.
    const initiative = participant.initiative !== null && participant.initiative !== '' && Number.isFinite(Number(participant.initiative)) ? Number(participant.initiative) : '—';
    const grid = node('dl', 'workspace-caracs');
    [['CC', value('CC') ?? '—'], ['CT', value('CT') ?? '—'], ['F · BF', pair('F', 'BF')], ['E · BE', pair('E', 'BE')], ['I', value('I') ?? initiative], ['Ag', value('Ag') ?? '—']]
      .forEach(([label, content]) => {
        const cell = node('div', `workspace-carac${label === 'E · BE' ? ' is-key' : ''}`);
        cell.append(node('dt', '', label), node('dd', 'num', String(content)));
        grid.appendChild(cell);
      });
    sheet.appendChild(grid);

    const body = node('div', 'workspace-sheet-body');
    body.appendChild(renderSilhouette({ armor: participant.armor, armorLocations: displayedArmorLocations(participant), location: hit?.location || null, name: participant.name }));
    const states = node('div', 'workspace-sheet-states');
    states.appendChild(rubric('États', 'p'));
    const list = node('div', 'workspace-state-list');
    normalizeEffects(participant.states).forEach((item, index) => {
      const entry = node('span', 'workspace-state-chip');
      entry.appendChild(node('span', '', stateLabel(item)));
      const remove = button('×', 'workspace-state-remove', {
        'aria-label': `Retirer ${item.name} de ${participant.name}`,
        'data-focus-key': `state-remove-${participant.id}-${index}`
      });
      remove.dataset.workspaceAction = 'remove-state';
      remove.dataset.actorId = participant.id;
      remove.dataset.stateIndex = String(index);
      const lockedByMiscast = isMiscastConditionLocked(participant, item);
      remove.disabled = !callbacks.setStates || lockedByMiscast;
      if (lockedByMiscast) remove.title = 'Lié à un incident magique en cours : se retire à son terme';
      if (callbacks.recoverState && !lockedByMiscast && recoveryMethodsFor(item).length) {
        const recover=button('Récupérer','workspace-state-recover',{'aria-label':`Récupérer ${item.name} de ${participant.name}`,'data-focus-key':`state-recover-${participant.id}-${index}`});
        recover.dataset.workspaceAction='recover-state';recover.dataset.actorId=participant.id;recover.dataset.stateIndex=String(index);entry.appendChild(recover);
      }
      if(item.authorId||item.v5Timing?.authorId) {const authorId=item.authorId||item.v5Timing.authorId;const author=readParticipants(Store).find(actor=>actor.id===authorId);entry.appendChild(node('small','workspace-state-origin',`Auteur : ${author?.name||authorId} · Cible : ${participant.name}`));}
      entry.appendChild(remove);
      list.appendChild(entry);
    });
    const formOpen = state.stateForm?.participantId === participant.id;
    const add = button('+ état', 'workspace-state-add', {
      'aria-label': `Ajouter un état à ${participant.name}`,
      'aria-expanded': String(formOpen),
      'data-focus-key': `state-add-${participant.id}`
    });
    add.dataset.workspaceAction = 'open-state-form';
    add.dataset.actorId = participant.id;
    add.disabled = !callbacks.acquireStates && !callbacks.setStates;
    list.appendChild(add);
    states.appendChild(list);
    const criticals = participant.extensions?.v5?.criticalWounds || [];
    if (criticals.length) {
      const registry = node('div', 'workspace-critical-wounds');
      registry.appendChild(rubric('Blessures Critiques', 'p'));
      for (const critical of criticals) {
        const row = node('div', 'workspace-inline-actions');
        row.appendChild(node('span', '', `${critical.name || 'Blessure Critique'} · ${critical.location || 'Localisation inconnue'} · Round ${critical.round ?? '?'}`));
        const heal = button('Guérir', 'workspace-secondary', { 'aria-label': `Guérir ${critical.name || 'Blessure Critique'} de ${participant.name}` });
        heal.dataset.workspaceAction = 'heal-critical'; heal.dataset.actorId = participant.id; heal.dataset.criticalId = critical.id;
        heal.disabled = !callbacks.healCriticalWound; row.appendChild(heal); registry.appendChild(row);
      }
      states.appendChild(registry);
    }
    if (formOpen) states.appendChild(renderStateForm(participant));
    const momentumButton = button(`Élan : ${hasMomentum(participant) ? 'oui' : 'non'}`, 'workspace-secondary', {
      'aria-label': `Modifier l’Élan de ${participant.name}`, 'aria-pressed': String(hasMomentum(participant)),
      'data-focus-key': `momentum-${participant.id}` });
    momentumButton.dataset.workspaceAction = 'toggle-momentum'; momentumButton.dataset.actorId = participant.id;
    momentumButton.disabled = !callbacks.setMomentum; body.appendChild(momentumButton);
    if (callbacks.getFortune || callbacks.editFortune) {
      const fortune = callbacks.getFortune?.(participant.id);
      const fortuneButton = button('Fortune : ' + formatV5Balance(fortune), 'workspace-secondary', {
        'aria-label': 'Modifier la Fortune de ' + participant.name, 'data-focus-key': 'fortune-' + participant.id });
      fortuneButton.dataset.workspaceAction = 'edit-fortune'; fortuneButton.dataset.actorId = participant.id;
      fortuneButton.disabled = !callbacks.editFortune; body.appendChild(fortuneButton);
    }
    if(callbacks.getFate||callbacks.editFate){
      const fate=callbacks.getFate?.(participant.id),fateButton=button('Destin : '+(fate?.balance??'?'),'workspace-secondary',{'aria-label':'Modifier le Destin de '+participant.name,'data-focus-key':'fate-'+participant.id});
      fateButton.dataset.workspaceAction='edit-fate';fateButton.dataset.actorId=participant.id;fateButton.disabled=!callbacks.editFate;body.appendChild(fateButton);
    }
    for (const offer of Store.getReactionOpportunities?.(participant.id) || []) {
      const use = button('Assaut féroce : attaque supplémentaire (1 Élan)', 'workspace-secondary', {
        'aria-label': 'Utiliser Assaut féroce de ' + participant.name, 'data-focus-key': 'reaction-' + participant.id });
      use.dataset.workspaceAction = 'use-reaction'; use.dataset.actorId = participant.id; use.dataset.reactionId = offer.id;
      use.disabled = state.resolution.busy || state.resolution.reactionId === offer.id; body.appendChild(use);
    }
    body.appendChild(states);
    sheet.appendChild(body);
    sheet.appendChild(renderFicheDetails(participant));

    const actionsRow = node('div', 'workspace-inline-actions');
    const edit = button('Modifier', 'workspace-secondary', { 'aria-label': `Modifier ${participant.name}`, 'data-focus-key': `edit-${participant.id}` });
    edit.dataset.workspaceAction = 'edit-participant';
    edit.dataset.actorId = participant.id;
    edit.disabled = state.actionBusy || !callbacks.editParticipant;
    if (!callbacks.editParticipant) edit.title = 'Action indisponible';
    actionsRow.appendChild(edit);
    const remove = defeatedParticipantButton(participant, `remove-${participant.id}`);
    if (remove) actionsRow.appendChild(remove);
    sheet.appendChild(actionsRow);
    return sheet;
  }

  function calculationError(error) {
    const field = error instanceof ResolutionError || error?.name === 'ResolutionError'
      ? (validRoll(state.resolution.attackRoll) ? 'defense' : 'attack') : 'general';
    return { field, message: userMessage(error, 'Calcul impossible : vérifiez l’action et les jets saisis.') };
  }

  function declaredSources(value, prefix) {
    const count = value ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 100) throw userError('Le nombre de sources doit être un entier entre 0 et 100.');
    return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}`, label: `${prefix} ${index + 1}` }));
  }
  function v5Input(context, draft) {
    if (draft.v5SlModifier != null && !Number.isInteger(draft.v5SlModifier)) throw userError('Le modificateur V5 doit être un nombre entier de DR.');
    const action={...context.action,type:context.type},attack=['attack','attaque'].includes(context.type);
    const weapon=action.extensions?.equipment||context.actor?.equipment?.find(row=>row.id===action.extensions?.fiche?.equipmentId);
    const weaponContext={...(action.extensions?.v5?.initialContext||{}),...(draft.v5Context||{})};
    const metadataGroup=weaponSkillGroupInfo(weapon?.category,weapon);
    const selectedGroup=!metadataGroup&&attack?weaponSkillGroupInfo(weaponContext.weaponTrainingGroup,weapon):null;
    const attackContext=equipmentAttackContext(weapon,attack?weaponContext:{});
    return { kind: (attack?selectedGroup?.kind:null) || draft.v5Kind || inferV5Kind(action, attackContext),
      ...(draft.v5SlModifier != null ? { slModifier: draft.v5SlModifier } : context.action.extensions?.v5?.slModifier != null ? { slModifier: context.action.extensions.v5.slModifier } : {}),
      choice: draft.v5Choice, charging: draft.charging, context: { ...weaponContext, ...(context.action.id?.startsWith('broken-hide:')?{isAction:true}: {}) },
      talentChoices: { ...(draft.talentChoices || {}), 'talent-beat-blade:replace-damage': draft.beatBlade === true },
      fortuneReroll: draft.fortuneReroll === true,
      fortuneForAdvantage: draft.fortuneForAdvantage === true,
      ...(draft.fortuneForAdvantage===true&&draft.fortuneAdvantageDeclarationId?{fortuneAdvantageDeclarationId:draft.fortuneAdvantageDeclarationId}:{}),
      ...(Array.isArray(draft.fortuneRerollRolls) && draft.fortuneRerollRolls.length ? { fortuneRerollRolls: draft.fortuneRerollRolls } : {}),
      ...(draft.reverseDice === true ? { reverseDice: true } : {}),
      ...(draft.fortuneRerollRoll != null && draft.fortuneRerollRoll !== '' ? { fortuneRerollRoll: Number(draft.fortuneRerollRoll) } : {}),
      extraAttack: draft.extraAttack === true, ...(draft.reactionId ? { reactionId: draft.reactionId } : {}), aimed: draft.aimed === true,
      actorSize: draft.actorSize, targetSize: draft.targetSize,
      advantageSources: declaredSources(draft.v5Advantages, 'Avantage déclaré'), disadvantageSources: declaredSources(draft.v5Disadvantages, 'Désavantage déclaré') };
  }
  function defenseV5Input(context, draft) {
    if (draft.defenseSlModifier != null && !Number.isInteger(draft.defenseSlModifier)) throw userError('Le modificateur V5 de défense doit être un nombre entier de DR.');
    return { kind: draft.defenseKind || context.defense.option.v5?.kind || (context.defense.option.value === 'Ag' || /esquive|dodge/i.test(context.defense.option.statLabel) ? 'test' : 'melee'),
      ...(draft.defenseSlModifier != null ? { slModifier: draft.defenseSlModifier } : context.defense.option.v5?.slModifier != null ? { slModifier: context.defense.option.v5.slModifier } : {}),
      choice: draft.defenseChoice, context: { ...(draft.defenseContext || {}), ...(context.defense.option.extensions?.fiche?.skillId ? { skillId: context.defense.option.extensions.fiche.skillId } : {}) }, talentChoices: draft.defenseTalentChoices || {},
      advantageSources: declaredSources(draft.defenseAdvantages, 'Avantage déclaré en défense'),
      disadvantageSources: declaredSources(draft.defenseDisadvantages, 'Désavantage déclaré en défense') };
  }
  function clearFortuneAdvantageDraft(draft){
    const declarationId=draft.fortuneAdvantageDeclarationId,actorId=draft.actorId;
    if(declarationId&&typeof Store.declareV5FortuneAdvantage==='function')try{const pending=Store.declareV5FortuneAdvantage(actorId,{enabled:false,declarationId,baseRevision:Store.getLocalRevision()});if(pending?.catch)pending.catch(()=>{});}catch{}
    draft.fortuneForAdvantage=false;draft.fortuneAdvantageDeclarationId=null;
  }
  // U-01 : une opération ponctuelle ne s'applique qu'une fois par clé (créée au rendu) ; après succès elle reste consommée
  // jusqu'à la prochaine saisie du MJ, y compris pour un second clic tardif qui trouverait la persistance déjà finie.
  function magicOperationKey(name) {
    const draft = state.resolution;
    if (draft.magicOpSpent?.[name]) return null;
    draft.magicOpKeys = draft.magicOpKeys || {};
    return draft.magicOpKeys[name] ||= `op-${name}-${++magicOpSeq}`;
  }
  let magicOpSeq = 0;
  async function runMagicSecondary(action, fallback, onSuccess = () => {}, baseRevision = Store.getLocalRevision(), operation = null) {
    const draft = state.resolution;
    if (draft.busy) return;
    if (operation && (!operation.key || draft.magicOpKeys?.[operation.name] !== operation.key || draft.magicOpSpent?.[operation.name])) return;
    if (previewIsStale(draft.preview)) { rejectStalePreview(); return; }
    if (operation) draft.magicOpSpent = { ...draft.magicOpSpent, [operation.name]: true };
    draft.busy = true; draft.error = null;
    render();
    try {
      const result = await action(baseRevision);
      if (result?.ok === false) throw userError(typeof result.error === 'string' ? result.error : result.error?.message || fallback);
      draft.preview = null;
      onSuccess();
    } catch (error) {
      draft.error = { field: 'general', message: userMessage(error, fallback) };
      if (operation) draft.magicOpSpent = { ...draft.magicOpSpent, [operation.name]: false };
    } finally {
      draft.busy = false;
      render();
    }
  }

  const resolutionHandlers = {
    async declareCombatAction(kind, values = {}) {
      const draft = state.resolution;
      if (!callbacks.declareCombatAction || !draft.actorId || draft.busy) return;
      draft.busy = true; draft.error = null; render();
      try {
        const result = await callbacks.declareCombatAction({ actorId: draft.actorId, kind, ...values, actionId: `combat-action:${uid()}` });
        if (result?.status !== 'applied') throw new Error(result?.error || result?.reason || 'Action non enregistrée.');
      } catch (error) {
        draft.error = { field: 'general', message: userMessage(error, 'Action de combat non enregistrée.') };
      } finally { draft.busy = false; render(); }
    },
    async declareCombatMovement() {
      const draft = state.resolution;
      if (!callbacks.declareCombatMovement || !draft.actorId || draft.busy) return;
      draft.busy = true; draft.error = null; render();
      try {
        const result = await callbacks.declareCombatMovement(draft.actorId);
        if (result?.status !== 'applied') throw new Error(result?.error || result?.reason || 'Déplacement non enregistré.');
      } catch (error) {
        draft.error = { field: 'general', message: userMessage(error, 'Déplacement non enregistré.') };
      } finally { draft.busy = false; render(); }
    },
    select(patch) {
      const draft = state.resolution;
      if (Object.hasOwn(patch,'fortuneForAdvantage')) {
        const enabled=patch.fortuneForAdvantage===true;
        if(enabled===draft.fortuneForAdvantage)return;
        if(enabled&&(String(draft.attackRoll||'').trim()||draft.preview)){
          draft.error={field:'general',message:'Chance → Avantage doit être déclaré dans le Store avant de saisir le d100.'};render();return;
        }
        if(typeof Store.declareV5FortuneAdvantage!=='function'){
          draft.error={field:'general',message:'Le Store ne peut pas enregistrer la déclaration de Chance → Avantage.'};render();return;
        }
        const priorDeclarationId=draft.fortuneAdvantageDeclarationId;
        draft.busy=true;draft.error=null;render();
        void (async()=>{
          try{
            const result=await Store.declareV5FortuneAdvantage(draft.actorId,{enabled,...(!enabled&&priorDeclarationId?{declarationId:priorDeclarationId}:{}),baseRevision:Store.getLocalRevision()});
            if(result?.status!=='applied')throw new Error(result?.reason||'Déclaration de Chance → Avantage non enregistrée.');
            draft.fortuneForAdvantage=enabled;draft.fortuneAdvantageDeclarationId=enabled?result.declarationId:null;draft.preview=null;draft.comparison=null;
          }catch(error){draft.error={field:'general',message:userMessage(error,'Déclaration de Chance → Avantage non enregistrée.')};}
          finally{draft.busy=false;render();}
        })();
        return;
      }
      draft.magicOpSpent = {};
      if('brokenEscapeVisibility' in patch)draft.brokenEscapeVisibility=patch.brokenEscapeVisibility;
      if ('magicSpellId' in patch && patch.magicSpellId !== draft.magicSpellId) {
        draft.magicMjChoice = ''; draft.magicSpellFacts={}; draft.magicInteraction={};
        resetMagicDice(draft);
        for(const key of ['magicOvercastDamage','magicOvercastTargets','magicOvercastRange','magicOvercastDuration','magicOvercastAoe','magicOvercastSpecial','magicArcaneArmorPoints'])draft[key]=0;
        draft.magicArcaneEnhancedDamage=false;draft.magicArcaneChooseItem=false;draft.magicArcaneTargets={};draft.magicTargetTests={};draft.magicSecondaryTargets={};draft.magicAttributeTargets={};draft.magicChosenStats=[];draft.magicHogTier='base';draft.magicOvercastSpecific={};draft.magicUnmemorized=false;
        draft.magicBeastKey='';draft.magicBeastTraits=[];draft.magicKadonMonster='';draft.magicKadonOther=false;draft.magicApoSteps=0;draft.magicApoCritical=false;draft.magicApoRaise=false;
        if (!('magicTargetIds' in patch)) draft.magicTargetIds = [];
      }
      for (const key of ['v5Kind','v5SlModifier','v5Advantages','v5Disadvantages','charging','extraAttack','reactionId','aimed','beatBlade','fortuneReroll','fortuneForAdvantage','fortuneRerollRolls','reverseDice','fortuneRerollRoll','actorSize','targetSize','defenseKind','defenseSlModifier','defenseAdvantages','defenseDisadvantages','v5Context','defenseContext','combatDefensiveSkillId','combatAimWeaponId','combatAimWeaponName','combatAimWeaponHeldConfirmed','combatAimWeaponKindConfirmed','talentChoices','defenseTalentChoices','magicChannelMode','magicChannelType','magicLore','magicFumbleLossRoll','magicMiscastRoll','magicMajorRoll','magicSecondaryDurationRoll','magicSecondaryDamageRoll','magicSecondaryDistanceRoll','magicSecondaryLocation','magicSpellId','magicArcaneArmorPoints','magicArcaneEnhancedDamage','magicArcaneChooseItem','magicArcaneTargets','magicMjChoice','magicChosenStats','magicHogTier','magicResistanceRoll','magicVortexDirection','magicVortexDistance','magicCriticalChoice','magicOvercastDamage','magicOvercastTargets','magicOvercastRange','magicOvercastDuration','magicOvercastAoe','magicOvercastSpecial','magicBeastKey','magicRoll3d10','magicTargetIds']) if (key in patch) draft[key] = patch[key];
      for(const [key,value] of Object.entries(patch))if(/^magic[A-Z]/.test(key))draft[key]=value;
      draft.v5Choice = null; draft.defenseChoice = null;
      if ('targetId' in patch) {
        clearFortuneAdvantageDraft(draft);
        state.targetChoice = patch.targetId;
        draft.v5Context={...(draft.v5Context||{})};for(const key of ['fateAction','fateChosenRoll','fateCriticalLocation','warpBladeEnduranceTest','f2h'])delete draft.v5Context[key];
        for (const key of ['hitMorphology','hitAppendage','spiderLegSide','fallPreventedByEquipment','mountedRestraint','mountedRideTestsById','mountedRideScoresById','mountedRideRollsById']) delete draft.v5Context[key];
        draft.fortuneReroll=false;draft.fortuneRerollRolls=[];
        draft.targetSize = null;
        draft.defenseBase = null; draft.defenseSource = null;
        draft.defenseKind = null; draft.defenseSlModifier = null;
        draft.defenseAdvantages = 0; draft.defenseDisadvantages = 0; draft.defenseContext = {};
        draft.protectionContext = {};
        // Les engagés cochés valaient pour l'ancienne cible.
        if (draft.v5Context) {
          draft.v5Context = withoutOutnumberContext(draft.v5Context);
          draft.v5Context.targetEngaged = undefined; draft.v5Context.engagedWithShooter = undefined; draft.v5Context.engagedTargetIds = undefined;
          draft.v5Context.engagedTargetRoll = undefined; draft.v5Context.engagedDefensesById = undefined;
          for(const key of ['lethalIntent','lethalTableEnabled','confirmLethalDeath'])delete draft.v5Context[key];
          for (const key of ['trip','tripPrimaryResolutionId','athleticsSkillId','tripFallEnduranceRoll','tripLegLocationRoll','tripLegCriticalEffectRoll','tripExtraLocationRoll','tripExtraCriticalEffectRoll','tripFallWardRoll','tripFallCalmTest']) delete draft.v5Context[key];
        }
        draft.magicTargetIds = patch.targetId && patch.targetId !== 'none' ? [patch.targetId] : [];
      }
      const actionChanged = 'actionKey' in patch && patch.actionKey !== draft.actionKey;
      if (actionChanged) { clearFortuneAdvantageDraft(draft);draft.v5Kind = null; draft.v5SlModifier = null; draft.charging = false; draft.extraAttack = false; draft.reactionId = null; draft.reactionAction = null; draft.aimed = false; draft.beatBlade = false; draft.fortuneReroll = false; draft.fortuneRerollRoll = null;draft.fortuneRerollRolls=[]; draft.reverseDice = false; draft.actorSize = null; draft.targetSize = null; draft.v5Advantages = 0; draft.v5Disadvantages = 0; draft.v5Context = {}; draft.talentChoices = {}; draft.actionKey = patch.actionKey; draft.type = null; draft.ammunitionId = ''; draft.ammunitionArbitrated = false; draft.protectionContext = {}; }
      if ('protectionContext' in patch) draft.protectionContext = patch.protectionContext;
      if ('ammunitionId' in patch) draft.ammunitionId = patch.ammunitionId;
      if ('ammunitionArbitrated' in patch) draft.ammunitionArbitrated = patch.ammunitionArbitrated;
      if (actionChanged || ('type' in patch && patch.type !== draft.type)) resetMagicDice(draft);
      if ('type' in patch) { draft.type = patch.type; draft.v5Kind = null; draft.charging = false; }
      if ('defenseStat' in patch) { draft.defenseStat = patch.defenseStat; draft.defenseBase = null; draft.defenseKind = null; draft.defenseSlModifier = null; draft.defenseAdvantages = 0; draft.defenseDisadvantages = 0; draft.defenseContext = {}; }
      resetCritical(draft);
      draft.preview = null;
      draft.comparison = null;
      draft.error = null;
      render();
    },
    input(field, value) {
      const draft = state.resolution;
      const magicalDouble=value=>Number.isInteger(Number(value)) && Number(value)>0 && Number(value)<=100 && (Number(value)===100 || Number(value)%11===0);
      const doubleBefore=magicalDouble(draft.attackRoll);
      const miniBefore=draft.magicVortexDistance!=null && Number(draft.magicVortexDistance)<=8;
      draft[field] = value;
      const miniAfter=draft.magicVortexDistance!=null && Number(draft.magicVortexDistance)<=8;
      const layoutChanged=field==='magicVortexDistance' && miniBefore!==miniAfter || field==='attackRoll' && doubleBefore!==magicalDouble(value);
      // Une saisie réarme les opérations ponctuelles consommées ; leurs boutons inactifs sont alors redessinés.
      const rearm = Object.values(draft.magicOpSpent || {}).some(Boolean);
      draft.magicOpSpent = {};
      draft.v5Choice = null; draft.defenseChoice = null;
      // Only the first keystroke after a result re-renders; the others just
      // feed the draft, so no character can be lost.
      if (draft.preview || draft.comparison || draft.error || rearm || layoutChanged) {
        resetCritical(draft);
        draft.preview = null;
        draft.comparison = null;
        draft.error = null;
        render();
      }
    },
    roll(field) {
      const draft = state.resolution;
      draft[field === 'attack' ? 'attackRoll' : 'defenseRoll'] = String(d100());
      draft.v5Choice = null; draft.defenseChoice = null;
      resetCritical(draft);
      draft.preview = null;
      draft.comparison = null;
      draft.error = null;
      render();
    },
    // Saisie d'un jet de critique : alimente le brouillon sans vider l'aperçu ni re-rendre
    // (aucune frappe perdue) ; seule une erreur affichée sous le champ est retirée.
    criticalInput(field, value) {
      const draft = state.resolution;
      if (draft[field] !== value) forgetDeclined(draft, field);
      draft[field] = value;
      const name = field.startsWith('defender') ? `defender${DEFENDER_CRITICAL_FIELDS[field] === 'location' ? 'Location' : DEFENDER_CRITICAL_FIELDS[field] === 'effectAlternative' ? 'EffectAlternative' : 'Effect'}` : CRITICAL_ERROR_FIELDS[field];
      if (draft.criticalErrors[name]) {
        delete draft.criticalErrors[name];
        render();
      }
    },
    criticalRoll(field) {
      forgetDeclined(state.resolution, field);
      state.resolution[field] = String(d100());
      resolutionHandlers.calculate();
    },
    // Sortie d'un champ : recalcul différé, pour ne pas remplacer le bouton visé pendant le clic ;
    // un appui encore en cours (clic long) fait attendre le relâchement.
    criticalChange() {
      setTimeout(() => {
        if (press.active) press.waiting = true;
        else recalculateCritical();
      }, 200);
    },
    criticalToggle(id, checked) {
      const draft = state.resolution;
      if(previewIsStale(draft.preview)){rejectStalePreview();return;}
      const defending = id.startsWith('defender:');
      const key = defending ? 'defenderCriticalDeclined' : 'criticalDeclined';
      const itemId = defending ? id.slice(9) : id;
      draft[key] = draft[key].filter(item => item !== itemId);
      if (!checked) draft[key].push(itemId);
      resolutionHandlers.calculate(`critical-item-${id}`);
    },
    magicRevision(){return Store.getLocalRevision();},
    getHighMagicExecutions(actorId){return Store.getHighMagicExecutions(actorId);},
    magicOperationKey,
    magicAdventure(revision,key){return runMagicSecondary(baseRevision=>Store.startMagicAdventure({baseRevision}),'Aventure non renouvelée.',undefined,revision,{name:'adventure',key});},
    magicCorruptionRune(revision,key){const draft=state.resolution;return runMagicSecondary(baseRevision=>Store.rerollCorruptionWithCadai({baseRevision,actorId:playContext().actor.id,accessible:Boolean(draft.magicCadaiAccessible),castExecutionId:draft.magicCorruptionExecutionId,corruptionId:draft.magicCorruptionId || undefined,firstRoll:draft.magicCorruptionInitialRoll,reroll:draft.magicCadaiCorruptionRoll,slModifier:draft.magicCorruptionModifier}),'Relance de Corruption non appliquée.',()=>{draft.magicUseCadaiRune=false;draft.magicCadaiCorruptionRoll=null;draft.magicCorruptionInitialRoll=null;},revision,{name:'corruption-rune',key});},
    magicMindOverBody(revision,key){return runMagicSecondary(baseRevision=>Store.activateMindOverBody(playContext().actor.id,{baseRevision}),'Activation non appliquée.',undefined,revision,{name:'mind-over-body',key});},
    magicMeditation(revision,key){const draft=state.resolution;return runMagicSecondary(baseRevision=>Store.applyMagicMeditation({baseRevision,actorId:playContext().actor?.id,talentId:draft.magicMeditationId,name:draft.magicMeditationId,minutes:draft.magicMeditationMinutes,roll:draft.magicMeditationRoll,durationRolls:String(draft.magicMeditationDice || '').trim().split(/\s+/).filter(Boolean).map(Number)}),'Méditation non appliquée.',()=>{draft.magicMeditationMinutes=null;draft.magicMeditationRoll=null;draft.magicMeditationDice='';},revision,{name:'meditation',key});},
    magicRune(mode,revision,key){const draft=state.resolution;return runMagicSecondary(baseRevision=>Store.deployCadaiRune({baseRevision,actorId:playContext().actor?.id,reset:mode==='reset',roll:draft.magicRuneKnowledgeRoll,conditionsConfirmed:draft.magicRuneMaterials}),'Rune non déployée.',()=>{if(mode!=='reset'){draft.magicRuneKnowledgeRoll=null;draft.magicRuneMaterials=false;}},revision,{name:mode==='reset'?'rune-reset':'rune-deploy',key});},
    magicSpellInteraction(input,revision){ const ward=value=>{if(typeof value!=='string')return value;const dice=value.trim().split(/[\s,;]+/).filter(Boolean).map(Number);return dice.length===1?dice[0]:dice;};input={...input,wardRoll:ward(input.wardRoll),targetTests:Object.fromEntries(Object.entries(input.targetTests || {}).map(([id,data])=>[id,{...data,wardRoll:ward(data.wardRoll)}]))};return runMagicSecondary(baseRevision=>Store.applySpellInteraction({...input,baseRevision}),'Clause du sort impossible.',undefined,revision); },
    magicRecovery(revision,key){return runMagicSecondary(baseRevision=>{const actorId=playContext().actor?.id;return Store.applyBurnoutRecovery(Store.previewBurnoutRecovery({actorId}),{actorId,baseRevision});},'Récupération impossible.',undefined,revision,{name:'recovery',key});},
    async openCampaignTime(){try{await openCampaignTimeDialog({Store});}catch(error){state.resolution.error={field:'general',message:userMessage(error,'Le temps de campagne est indisponible.')};render();}},
    startTalentSession(){return runMagicSecondary(baseRevision=>Store.startTalentSession({baseRevision}),'Séance non renouvelée.');},
    situationalCritical(id,key,value){if(previewIsStale(state.resolution.preview)){rejectStalePreview();return;}const draft=state.resolution,context=draft.v5Context||{};draft.v5Context={...context,whirlwindRolls:{...context.whirlwindRolls,[id]:{...context.whirlwindRolls?.[id],[key]:value}}};resolutionHandlers.calculate();},
    situationalCriticalChoose(id,key,value){if(previewIsStale(state.resolution.preview)){rejectStalePreview();return;}const draft=state.resolution,context=draft.v5Context||{};draft.v5Context={...context,whirlwindChoices:{...context.whirlwindChoices,[id]:{...context.whirlwindChoices?.[id],[key]:value}}};resolutionHandlers.calculate();},
    criticalChoose(role,key,value){
      if(previewIsStale(state.resolution.preview)){rejectStalePreview();return;}
      const field=role==='defender'?'defenseTalentChoices':'talentChoices';state.resolution[field]={...state.resolution[field],[key]:value};resolutionHandlers.calculate();
    },
    chooseV5(role, optionId) {
      if(previewIsStale(state.resolution.preview)){rejectStalePreview();return;}
      state.resolution[role === 'actor' ? 'v5Choice' : 'defenseChoice'] = optionId;
      resolutionHandlers.calculate(`v5-choice-${role}-${optionId}`);
    },
    calculate(focusKey = null) {
      const context = playContext();
      const draft = state.resolution;
      if (!context.actor || !context.action || draft.busy) return;
      if (['channelling','cast','dispel'].includes(context.type)) {
        draft.error = null;
        draft.comparison = null;
        try {
          const rollRaw = String(draft.attackRoll).trim();
          if (!validRoll(rollRaw)) throw Object.assign(new ResolutionError('Saisissez un jet sur d100 entre 1 et 100.', 'INVALID_ROLL'), { userFacing: true });
          const secondaryRolls = {
            ...(draft.magicSecondaryDurationRoll ? { duration1d10: draft.magicSecondaryDurationRoll, conditions1d10: draft.magicSecondaryDurationRoll } : {}),
            ...(draft.magicSecondaryDamageRoll ? { damage1d10: draft.magicSecondaryDamageRoll, slLoss1d10: draft.magicSecondaryDamageRoll } : {}),
            ...(draft.magicSecondaryDistanceRoll ? { distance1d10: draft.magicSecondaryDistanceRoll } : {}),
            ...(draft.magicSecondaryLocation ? { location: draft.magicSecondaryLocation } : {}),
            ...(draft.magicNoOtherTargets ? { noOtherTargets: true } : {})
          };
          // L-07 : jets supplémentaires de l'incident 91-95 (deux résultats de 1 à 90, sans modificateurs) et leurs dés secondaires.
          if ([1, 2].some(n => draft['magicExtraRoll' + n] != null)) {
            secondaryRolls.additionalRolls = [1, 2].map(n => draft['magicExtraRoll' + n] ?? null);
            secondaryRolls.additionalSecondaryRolls = [1, 2].map(n => ({
              ...(draft['magicExtraDuration' + n] != null ? { duration1d10: draft['magicExtraDuration' + n], conditions1d10: draft['magicExtraDuration' + n] } : {}),
              ...(draft['magicExtraDamage' + n] != null ? { damage1d10: draft['magicExtraDamage' + n], slLoss1d10: draft['magicExtraDamage' + n] } : {}),
              ...(draft['magicExtraDistance' + n] != null ? { distance1d10: draft['magicExtraDistance' + n] } : {}),
              ...(draft['magicExtraLocation' + n] ? { location: draft['magicExtraLocation' + n] } : {})
            }));
          }
          // HEPG p. 84 : une rune par jet distinct ; un champ rempli = une relance demandée (payée seulement si le jet sert).
          const cadaiRerolls = draft.magicUseCadaiRune
            ? [['test', draft.magicCadaiTestRoll], ['miscast', draft.magicCadaiMiscastRoll], ...(context.type === 'cast' ? [['burnout', draft.magicCadaiBurnoutRoll]] : [])]
              .filter(([, roll]) => roll != null && roll !== '').map(([purpose, roll]) => ({ purpose, roll }))
            : [];
          const extraMagicInput={
            senseFacts:draft.magicSenseFacts || {},requireExplicitDice:true,distraction:Boolean(draft.magicDistraction),yenluiPenalty:draft.magicYenluiPenalty,
            magicDefianceTargets:draft.magicDefianceTargets || [],
            suffusedBy:draft.magicSuffusedId?[{id:draft.magicSuffusedId,distance:draft.magicSuffusedDistance}]:[],
            choice:draft.magicTestChoice || 'keep',
            assistantId:draft.magicAssistantId,assistantLinked:Boolean(draft.magicAssistantLinked),
            unmemorized:Boolean(draft.magicUnmemorized),overcastSpecific:draft.magicOvercastSpecific || undefined,
            instinctiveDiction:Boolean(draft.magicInstinctiveDiction),miscastRoll2:draft.magicMiscastRoll2,miscastChoice:draft.magicMiscastChoice,
            ...(cadaiRerolls.length ? {cadaiRerolls,cadaiAccessible:Boolean(draft.magicCadaiAccessible)} : {}),
            burnoutRoll:draft.magicBurnoutRoll,warWizard:Boolean(draft.magicWarWizard),targetTests:draft.magicTargetTests || {},chosenLore:draft.magicChosenLore || null,
            ...(draft.magicDispellerId ? {dispelReaction:{dispellerId:draft.magicDispellerId,roll:draft.magicDispelRoll,distance:dispelDistance(draft.magicDispelDistance),visible:dispelVisible(draft.magicDispelVisible)}} : {})
          };
          if (context.type === 'dispel') {
            const effect=Store.listParticipants().flatMap(p=>p.extensions?.v5?.spellEffects || []).find(e=>e.id===draft.magicPersistentId);
            if(!effect)throw new Error('Choisir un effet magique persistant.');
            const preview=Store.previewDispelPersistent(effect,{dispellerId:context.actor.id,roll:Number(rollRaw),distance:dispelDistance(draft.magicPersistentDistance),visible:dispelVisible(draft.magicPersistentVisible),...(draft.magicPersistentRestart ? {restartAttempt:true} : {})});
            draft.preview={...preview,v5MagicKind:'dispel',actorId:context.actor.id,baseRevision:Store.getLocalRevision()};
          } else if (context.type === 'channelling') {
            const magicInput = {
              ...extraMagicInput,
              actorId: context.actor.id,
              mode: draft.magicChannelMode || 'channel',
              type: draft.magicChannelType || 'winds',
              wind: draft.magicLore || context.actor.extensions?.v5?.magic?.lore || 'fire',
              roll: Number(rollRaw),
              slModifier: draft.v5SlModifier || 0,
              lossRoll: draft.magicFumbleLossRoll,
              miscastRoll: draft.magicMiscastRoll,
              ...(draft.magicMajorRoll ? { majorRoll: draft.magicMajorRoll } : {}),
              ...(Object.keys(secondaryRolls).length ? { secondaryRolls } : {}),
              advantageSources: declaredSources(draft.v5Advantages, 'Avantage déclaré'),
              disadvantageSources: declaredSources(draft.v5Disadvantages, 'Désavantage déclaré')
            };
            const channellingPreview = Store.previewChannelling(magicInput);
            draft.preview = {
              ...channellingPreview,
              v5MagicKind: 'channelling',
              actorId: context.actor.id,
              targetId: context.target?.id || null,
              baseRevision: typeof Store.getLocalRevision === 'function' ? Store.getLocalRevision() : undefined,
              magicInput
            };
          } else {
            const contracts = getAllSpellContracts();
            const firstActorSpell = context.actor.spells?.[0];
            const defaultSpell = firstActorSpell
              ? ((getSpellContract(firstActorSpell.id) || getSpellContract(firstActorSpell.name || firstActorSpell.nom || firstActorSpell))?.id || firstActorSpell.id || firstActorSpell.name || contracts[0]?.id)
              : contracts[0]?.id;
            const spellId = draft.magicSpellId || defaultSpell;
            const contract = getSpellContract(spellId);
            const channelType = contract?.domain === 'Qhaysh' || contract?.domain === 'Haute Magie' || /haute magie|high/i.test(contract?.type || '') ? 'high' : 'winds';
            const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
            const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
            const isAllyExcludingCaster = contract?.effects?.special === 'monstrous-regiment';
            let defaultTargets;
            if(contract?.effects?.excludeCaster){defaultTargets=[(context.target&&context.target.id!==context.actor.id?context.target:Store.listParticipants().find(p=>p.id!==context.actor.id&&p.zone==='active'))?.id].filter(Boolean);}
            else if (isSelfSpell) {
              defaultTargets = [context.actor.id];
            } else if (isAllyExcludingCaster) {
              defaultTargets = context.groups.allies[0] ? [context.groups.allies[0].id] : [];
            } else if (isAllyOnlySpell) {
              const targetIsAlly = context.target && (context.target.id === context.actor.id || context.groups.allies.some(a => a.id === context.target.id));
              defaultTargets = targetIsAlly ? [context.target.id] : [context.actor.id];
            } else {
              defaultTargets = context.target ? [context.target.id] : [context.actor.id];
            }
            const targetIds = Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length > 0
              ? draft.magicTargetIds
              : defaultTargets;
            const hogTier = draft.magicHogTier || (Array.isArray(draft.magicChosenStats) && draft.magicChosenStats.length > 1 ? 'overcast6' : 'base');
            const overcastChoices = {};
            if (draft.magicOvercastDamage != null && draft.magicOvercastDamage !== 0) overcastChoices.damage = draft.magicOvercastDamage;
            if (draft.magicOvercastTargets != null && draft.magicOvercastTargets !== 0) overcastChoices.targets = draft.magicOvercastTargets;
            if (draft.magicOvercastRange != null && draft.magicOvercastRange !== 0) overcastChoices.range = draft.magicOvercastRange;
            if (draft.magicOvercastDuration != null && draft.magicOvercastDuration !== 0) overcastChoices.duration = draft.magicOvercastDuration;
            if (draft.magicOvercastAoe != null && draft.magicOvercastAoe !== 0) overcastChoices.aoe = draft.magicOvercastAoe;
            if (draft.magicOvercastSpecial != null && draft.magicOvercastSpecial !== 0) overcastChoices.special = draft.magicOvercastSpecial;
            if (contract?.effects?.special === 'hand-of-glory' && hogTier === 'overcast6' && !overcastChoices.special) {
              overcastChoices.special = 6;
            }
            // A-01 / A-04 : options payées de Main de Gloire (+3, +8) et d'Apothéose (+3 par palier, +6, +10), dépense spéciale = leur coût.
            const hogOptions = contract?.effects?.special === 'hand-of-glory' && (draft.magicHogRemoveBroken || draft.magicHogPurify)
              ? { removeBroken: Boolean(draft.magicHogRemoveBroken), purify: Boolean(draft.magicHogPurify) } : null;
            if (hogOptions) {
              const six = hogTier === 'overcast6' || (Array.isArray(draft.magicChosenStats) && draft.magicChosenStats.length === 4);
              overcastChoices.special = (six ? 6 : 0) + (hogOptions.removeBroken ? 3 : 0) + (hogOptions.purify ? 8 : 0);
            }
            const apotheoseOptions = contract?.effects?.special === 'apotheose' && (draft.magicApoSteps > 0 || draft.magicApoCritical || draft.magicApoRaise)
              ? { extraHealSteps: draft.magicApoSteps || 0, criticalHeal: Boolean(draft.magicApoCritical), raiseDead: Boolean(draft.magicApoRaise) } : null;
            if (apotheoseOptions) overcastChoices.special = apotheoseOptions.extraHealSteps * 3 + (apotheoseOptions.criticalHeal ? 6 : 0) + (apotheoseOptions.raiseDead ? 10 : 0);
            // Forme bestiale (+2 DR par trait optionnel) et Kadon (+4 DR par trait ou autre cible) : dépense spéciale = coût des options.
            const transformKind = contract?.effects?.special === 'transformation-of-kadon' ? 'kadon' : contract?.effects?.special === 'beast-form' ? 'beast' : null;
            const beastTraits = transformKind && Array.isArray(draft.magicBeastTraits) ? draft.magicBeastTraits : [];
            const kadonOtherTarget = transformKind === 'kadon' && Boolean(draft.magicKadonOther);
            if (transformKind) {
              const cost = transformationOvercastCost({ kind: transformKind, traits: beastTraits.length, otherTarget: kadonOtherTarget });
              if (cost) overcastChoices.special = cost; else delete overcastChoices.special;
            }
            const deadTargetIds = contract?.effects?.special === 'apotheose' && draft.magicApoRaise ? targetIds.filter(id => draft.magicTargetTests?.[id]?.dead === true) : [];
            const monsterStats = ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Soc'];
            const monsterKey = transformKind === 'kadon' && draft.magicKadonMonster && draft.magicKadonMonster !== 'manual' ? draft.magicKadonMonster : null;
            const monsterProfile = transformKind === 'kadon' && draft.magicKadonMonster === 'manual' ? {
              name: draft.magicMonsterName || undefined, size:draft.magicMonsterSize, M: draft.magicMonsterM, hp: draft.magicMonsterHp,
              caracs: Object.fromEntries(monsterStats.map(stat => [stat, draft['magicMonster' + stat]])),
              traits: String(draft.magicMonsterTraits || '').split(',').map(text => text.trim()).filter(Boolean)
            } : null;
            const arcaneOptions = contract?.effects?.special === 'arcane-unforgiving' ? {
              armorPoints: draft.magicArcaneArmorPoints || 0,
              enhancedDamage: Boolean(draft.magicArcaneEnhancedDamage),
              chooseMagicItem: Boolean(draft.magicArcaneChooseItem)
            } : null;
            if (arcaneOptions) {
              for (const key of ['damage', 'duration', 'aoe']) delete overcastChoices[key];
              const cost = arcaneOptions.armorPoints + (arcaneOptions.enhancedDamage ? 8 : 0) + (arcaneOptions.chooseMagicItem ? 3 : 0);
              if (cost) overcastChoices.special = cost; else delete overcastChoices.special;
            }
            const spellObj = magicCastingSpell(contract, { spellId, lore: draft.magicLore, channelType });
            const castInput = {
              ...extraMagicInput,
              actorId: context.actor.id,
              roll: Number(rollRaw),
              slModifier: draft.v5SlModifier || 0,
              ...(draft.magicCriticalChoice ? { criticalChoice: draft.magicCriticalChoice } : {}),
              miscastRoll: draft.magicMiscastRoll,
              ...(draft.magicMajorRoll ? { majorRoll: draft.magicMajorRoll } : {}),
              ...(Object.keys(secondaryRolls).length ? { secondaryRolls } : {}),
              overcastChoices,
              advantageSources: declaredSources(draft.v5Advantages, 'Avantage déclaré'),
              disadvantageSources: declaredSources(draft.v5Disadvantages, 'Désavantage déclaré')
            };
            const castPreview = Store.previewCasting(spellObj, castInput);
            const chosenStats = Array.isArray(draft.magicChosenStats) && draft.magicChosenStats.length > 0
              ? draft.magicChosenStats
              : undefined;
            const magicOptions = {
              ...extraMagicInput,
              actorId: context.actor.id,
              ...(isBrokenActor(context.actor)&&typeof draft.brokenEscapeVisibility==='boolean'?{brokenEscapeFacts:{visibleToAnyEnemy:draft.brokenEscapeVisibility}}:{}),
              targetIds,
              roll: Number(rollRaw),
              slModifier: draft.v5SlModifier || 0,
              miscastRoll: draft.magicMiscastRoll,
              ...(draft.magicMajorRoll ? { majorRoll: draft.magicMajorRoll } : {}),
              ...(Object.keys(secondaryRolls).length ? { secondaryRolls } : {}),
              ...(draft.magicCriticalChoice ? { criticalChoice: draft.magicCriticalChoice } : {}),
              ...(draft.magicMjChoice ? { mjChoice: draft.magicMjChoice } : {}),
              ...(draft.magicResistanceRoll != null ? {
                resistanceRoll: draft.magicResistanceRoll,
                fellowshipRoll: draft.magicResistanceRoll,
                agilityRoll: draft.magicResistanceRoll,
                enduranceRoll: draft.magicResistanceRoll
              } : {}),
              ...(draft.magicVortexDirection ? { direction: draft.magicVortexDirection } : {}),
              ...(draft.magicVortexWillpower ? { willpowerSuccess: draft.magicVortexWillpower } : {}),
              ...(draft.magicVortexDirectionRoll != null ? { directionRoll: draft.magicVortexDirectionRoll } : {}),
              ...(draft.magicVortexDistance != null ? { distanceRoll: draft.magicVortexDistance } : {}),
              castingPreview: castPreview,
              castResult: castPreview,
              castingSl: castPreview.testSl ?? 0,
              totalCastingSl: castPreview.totalCastingSl ?? 0,
              castRoll: Number(rollRaw),
              ...(arcaneOptions ? { arcaneOptions, arcaneTargets: draft.magicArcaneTargets || {} } : {}),
              overcastDamageBonus: castPreview.overcast?.benefits?.damage || 0,
              overcastChoices,
              attributeActive: true,
              attributeTargets: draft.magicAttributeTargets || {},
              secondaryTargets: draft.magicSecondaryTargets || {},
              domainFacts: draft.magicSpellFacts || {},
              mountedRideTests: draft.magicMountedRideTests || {},
              ctRoll: draft.magicCtRoll,
              secondaryRolls: { ...(draft.magicSecondaryRolls || {}), ...secondaryRolls },
              hogTier,
              chosenStats,
              roll3d10: draft.magicRoll3d10,
              ...(hogOptions ? { hogOptions, ...(draft.magicHealRoll != null ? { healRoll: draft.magicHealRoll } : {}) } : {}),
              ...(apotheoseOptions ? { apotheoseOptions, ...(typeof draft.magicApoCriticalTest === 'boolean' ? { criticalHealTest: draft.magicApoCriticalTest } : {}) } : {}),
              ...(monsterProfile ? { monsterProfile } : {}),
              ...(Number.isInteger(draft.magicDurationAmount) && draft.magicDurationAmount > 0 ? { mjDuration: { amount: draft.magicDurationAmount, unit: draft.magicDurationUnit || 'rounds' } } : {}),
              beastKey: draft.magicBeastKey || undefined,
              ...(transformKind ? { beastTraits, ...(monsterKey ? { monsterKey } : {}), ...(kadonOtherTarget ? { kadonOtherTarget } : {}) } : {}),
              ...(deadTargetIds.length ? { deadTargetIds } : {})
            };
            const spellPreview = contract
              ? Store.previewSpellExecution(contract.id, magicOptions)
              : null;
            draft.preview = {
              v5MagicKind: 'cast',
              actorId: context.actor.id,
              targetId: context.target?.id || null,
              targetIds,
              spellId: contract?.id || spellId,
              contract,
              castPreview,
              spellPreview,
              baseRevision: typeof Store.getLocalRevision === 'function' ? Store.getLocalRevision() : undefined,
              operationId: spellPreview?.operationId || uid(),
              magicOptions,
              castInput
            };
          }
        } catch (error) {
          draft.preview = null;
          draft.error = calculationError(error);
        }
        render(draft.error && draft.error.field !== 'general' ? `roll-${draft.error.field}` : focusKey);
        return;
      }
      if (typeof Store.previewResolution !== 'function') return;
      const input = {
        actor: context.actor,
        action: { ...context.action, type: context.type },
        targetId: context.target?.id || null,
        roll: String(draft.attackRoll).trim(), protectionContext: draft.protectionContext, ammunitionId: draft.ammunitionId, ammunitionArbitrated: draft.ammunitionArbitrated
      };
      if(isBrokenActor(context.actor)&&typeof draft.brokenEscapeVisibility==='boolean')input.brokenEscapeFacts={visibleToAnyEnemy:draft.brokenEscapeVisibility};
      if (['attack','opposition'].includes(context.type) && context.target && String(draft.defenseRoll).trim()) {
        input.defense = { extensions:context.defense.option.extensions,attr:context.defense.option.attr,roll: String(draft.defenseRoll).trim(), base: draft.defenseBase, mod: context.defense.option.mod || 0, qualities: context.defense.option.qualities || [], damage:context.defense.option.damage,damageFormula:context.defense.option.damageFormula, label: context.defense.option.statLabel };
      }
      // Seuls les jets de critique valides partent au moteur ; les autres montrent l'erreur sous leur champ.
      const criticalRolls = {};
      draft.criticalErrors = {};
      Object.entries(CRITICAL_ERROR_FIELDS).forEach(([key, name]) => {
        const raw = String(draft[key]).trim();
        if (!raw) return;
        if (validRoll(raw)) criticalRolls[name] = raw;
        else draft.criticalErrors[name] = criticalRollError();
      });
      if (Object.keys(criticalRolls).length) input.criticalRolls = criticalRolls;
      if (draft.criticalDeclined.length) input.criticalDeclined = [...draft.criticalDeclined];
      const defenderCriticalRolls = {};
      for (const [key, name] of Object.entries(DEFENDER_CRITICAL_FIELDS)) {
        const raw = String(draft[key] || '').trim(); if (!raw) continue;
        if (validRoll(raw)) defenderCriticalRolls[name] = raw;
        else draft.criticalErrors[`defender${name === 'location' ? 'Location' : name === 'effectAlternative' ? 'EffectAlternative' : 'Effect'}`] = criticalRollError();
      }
      input.defenderCriticalRolls = defenderCriticalRolls; input.defenderCriticalDeclined = [...draft.defenderCriticalDeclined];
      draft.error = null;
      draft.comparison = null;
      try {
        if (input.defense && (input.defense.base == null || input.defense.base === '' || !Number.isInteger(Number(input.defense.base)) || Number(input.defense.base) < 0)) throw Object.assign(new ResolutionError('Saisissez un score de défense entier, supérieur ou égal à zéro.', 'INVALID_DEFENSE_SCORE'), { userFacing: true });
        input.v5 = v5Input(context, draft);
        if(draft.fortuneAdvantageDeclarationId)input.fortuneAdvantageDeclarationId=draft.fortuneAdvantageDeclarationId;
        const combatRound=readCombat(Store).round;let currentTurnIndex=1;try{currentTurnIndex=Number(JSON.parse(Store.getFullJSON()).extensions?.v5?.turnIndex)||1;}catch{}if(Number.isSafeInteger(combatRound)&&combatRound>0){input.round=combatRound;input.v5={...input.v5,context:{...(input.v5.context||{}),currentRound:combatRound,currentTurnIndex}};}
        if (input.defense) input.defense.v5 = defenseV5Input(context, draft);
        draft.preview = Store.previewResolution(input);
      } catch (error) {
        draft.preview = null;
        draft.error = calculationError(error);
      }
      render(draft.error && draft.error.field !== 'general' ? `roll-${draft.error.field}` : focusKey);
    },
    // Mêmes jets pour chaque cible possible (adversaires puis alliés), sans rien
    // appliquer. Le jet de défense, s'il est saisi, est opposé à la valeur de
    // défense propre à chaque cible.
    compare() {
      const context = playContext();
      const draft = state.resolution;
      if (!context.actor || !context.action || typeof Store.previewResolution !== 'function' || draft.busy) return;
      const roll = String(draft.attackRoll).trim();
      const defenseRoll = String(draft.defenseRoll).trim();
      draft.preview = null;
      // Les jets de critique visaient l'aperçu remplacé par la comparaison.
      resetCritical(draft);
      draft.error = null;
      try {
        draft.comparison = [...context.groups.adversaries, ...context.groups.allies].map(target => {
          const input = { actor: context.actor, action: { ...context.action, type: context.type }, targetId: target.id, roll, ammunitionId: draft.ammunitionId, ammunitionArbitrated: draft.ammunitionArbitrated, protectionContext: target.id === context.target?.id ? draft.protectionContext : {}, ...(isBrokenActor(context.actor)&&typeof draft.brokenEscapeVisibility==='boolean'?{brokenEscapeFacts:{visibleToAnyEnemy:draft.brokenEscapeVisibility}}:{}) };
          if (['attack','opposition'].includes(context.type) && defenseRoll) {
            // Même choix que pour la cible courante s'il existe chez elle, sinon son défaut ; la cible
            // courante garde la valeur affichée (saisie à la main comprise), comme pour « Calculer ».
            const { option } = defenseChoice(target);
            const shown = option.value === 'Autre' || target.id === context.target?.id ? draft.defenseBase : null;
            if ((shown ?? option.base) == null || shown === '' || !Number.isInteger(Number(shown ?? option.base))) throw userError(`Précisez le score de défense de ${target.name} avant la comparaison.`);
            input.defense = { extensions:option.extensions,attr:option.attr,roll: defenseRoll, base: (shown ?? option.base) ?? 0, mod: option.mod || 0, qualities: option.qualities || [], label: option.statLabel, v5: { ...defenseV5Input({ ...context, defense: { option } }, target.id === context.target?.id ? draft : { ...draft, defenseKind: null, defenseSlModifier: null, defenseAdvantages: 0, defenseDisadvantages: 0, defenseContext: {} }), choice: null } };
          }
          // Le surnombre saisi ne vaut que pour la cible sélectionnée.
          const base = v5Input(context, draft);
          input.v5 = { ...base, ...(target.id === context.target?.id ? {} : { context: withoutOutnumberContext(base.context) }), targetSize: target.id === context.target?.id ? draft.targetSize : null, choice: null };
          return { targetId: target.id, name: target.name, hp: target.hp, preview: Store.previewResolution(input) };
        });
      } catch (error) {
        draft.comparison = null;
        draft.error = calculationError(error);
      }
      render(draft.error && draft.error.field !== 'general' ? `roll-${draft.error.field}` : 'compare');
    },
    choose(targetId) {
      const draft = state.resolution;
      const entry = draft.comparison?.find(item => item.targetId === targetId);
      if (!entry || draft.busy) return;
      if(previewIsStale(entry.preview)){rejectStalePreview();return;}
      state.targetChoice = targetId;
      draft.targetSize = entry.preview.input.v5?.targetSize ?? null;
      // playContext relit la valeur de défense de la nouvelle cible ; « Autre » garde la saisie.
      if (draft.defenseStat !== 'Autre') draft.defenseBase = entry.preview.input.defense?.base == null ? null : String(entry.preview.input.defense.base);
      const comparedDefense = defenseChoice(readParticipants(Store).find(item => item.id === targetId));
      draft.defenseSource = comparedDefense.option.value === 'Autre' ? 'Autre' : `${targetId}|${comparedDefense.option.value}|${comparedDefense.option.base}`;
      draft.defenseKind = entry.preview.input.defense?.v5?.kind ?? null;
      draft.defenseSlModifier = entry.preview.input.defense?.v5?.slModifier ?? null;
      draft.defenseAdvantages = entry.preview.input.defense?.v5?.advantageSources?.length || 0;
      draft.defenseDisadvantages = entry.preview.input.defense?.v5?.disadvantageSources?.length || 0;
      draft.defenseContext = entry.preview.input.defense?.v5?.context || {};
      draft.protectionContext = entry.preview.input.protectionContext || {};
      draft.v5Choice = null; draft.defenseChoice = null;
      draft.preview = entry.preview;
      draft.comparison = null;
      render('apply');
    },
    async apply() {
      const draft = state.resolution;
      if (!draft.preview || (!callbacks.applyResolution && !draft.preview.v5MagicKind) || draft.busy) return;
      if(previewIsStale(draft.preview)){rejectStalePreview();return;}
      // Clic direct sur « Appliquer » après avoir tapé un jet de critique : l'aperçu est
      // d'abord recalculé et montré, rien n'est appliqué avec l'ancien.
      if (!draft.preview.v5MagicKind && criticalRollsChanged(draft)) { resolutionHandlers.calculate('apply'); return; }
      draft.busy = true;
      render();
      let focusKey = 'apply';
      try {
        let result;
        if (draft.preview.v5MagicKind === 'dispel') {
          result = await Store.applyDispelPersistent(draft.preview);
        } else if (draft.preview.v5MagicKind === 'channelling') {
          result = await Store.applyChannelling(draft.preview, { actorId: draft.preview.actorId });
        } else if (draft.preview.v5MagicKind === 'cast') {
          if (draft.preview.contract) {
            result = await Store.applySpellExecution(draft.preview.spellId, {
              ...draft.preview.magicOptions,
              actorId: draft.preview.actorId,
              targetIds: draft.preview.targetIds,
              baseRevision: draft.preview.baseRevision,
              operationId: draft.preview.operationId,
              preview: draft.preview.spellPreview
            });
          } else {
            result = await Store.applyCasting(draft.preview.castPreview, { actorId: draft.preview.actorId });
          }
        } else {
          result = await callbacks.applyResolution(draft.preview);
        }
        if (result?.ok === false) throw userError(typeof result.error === 'string' ? result.error : result.error?.message || 'Résultat non enregistré : réessayez.');
        if (result?.status === 'stale') {
          draft.error = { field: 'general', message: 'La partie a changé depuis le calcul : recalculez.' };
          focusKey = 'calculate';
        } else if (result?.applied === false && result?.error) {
          draft.error = { field: 'apply', message: result.error };
          focusKey = 'calculate';
        } else {
          draft.attackRoll = '';
          draft.defenseRoll = '';
          draft.v5Choice = null; draft.defenseChoice = null; draft.charging = false; draft.extraAttack = false; draft.reactionId = null; draft.reactionAction = null; draft.aimed = false; draft.beatBlade = false;
          draft.fortuneForAdvantage=false;draft.fortuneAdvantageDeclarationId=null;
          if (draft.preview.v5MagicKind) resetMagicDice(draft);
          forgetAttackAnswers(draft);
          focusKey = 'roll-attack';
        }
        draft.preview = null;
        if (result?.status !== 'stale') resetCritical(draft);
      } catch (error) {
        draft.error = { field: 'apply', message: userMessage(error, 'Résultat non appliqué : recalculez, puis réessayez.') };
      } finally {
        draft.busy = false;
        render(focusKey);
      }
    },
    cancel() {
      resetCritical(state.resolution);
      resetMagicDice(state.resolution);
      state.resolution.preview = null;
      state.resolution.comparison = null;
      state.resolution.error = null;
      render('calculate');
    }
  };

  function renderCenter(context) {
    const center = play.center;
    center.replaceChildren();
    let suddenDeathEnabled = false;
    try { suddenDeathEnabled = JSON.parse(Store.getFullJSON()).extensions?.v5?.suddenDeathEnabled === true; } catch {}
    const suddenDeath = node('section', 'workspace-card workspace-sudden-death');
    suddenDeath.setAttribute('aria-label', 'Réglage de table : mort subite des figurants');
    suddenDeath.appendChild(rubric('Mort subite des figurants'));
    const optionLabel = node('label', 'workspace-type', 'Activer la règle de table — désactivée par défaut');
    const option = document.createElement('input'); option.type = 'checkbox'; option.checked = suddenDeathEnabled;
    option.setAttribute('aria-label', 'Activer la mort subite des figurants');
    option.addEventListener('change', async () => { option.disabled = true; try { await Store.setSuddenDeathEnabled(option.checked); render(); } catch (error) { option.disabled = false; option.checked = !option.checked; suddenDeath.appendChild(node('p', 'workspace-error', userMessage(error, 'Réglage non enregistré.'))); } });
    optionLabel.prepend(option); suddenDeath.appendChild(optionLabel);
    if (suddenDeathEnabled) {
      const candidates = (context.participants || []).filter(row => ['PNJ', 'Créature'].includes(row.kind)
        && Number(row.hp) === 0 && row.extensions?.v5?.dead !== true
        && !(row.states || []).some(state => state.key === 'inconscient' || state.name === 'Inconscient'));
      for (const participant of candidates) {
        const row = node('div', 'workspace-result-line'); row.appendChild(node('span', '', `${participant.name || participant.id} · 0 Blessure`));
        const confirmLabel = node('label', 'workspace-type', 'Confirmer que c’est un PNJ secondaire');
        const confirm = document.createElement('input'); confirm.type = 'checkbox'; confirm.setAttribute('aria-label', `${participant.name || participant.id} : confirmer PNJ secondaire`); confirmLabel.prepend(confirm); row.appendChild(confirmLabel);
        const preview = () => Store.previewSuddenDeath(participant.id, confirm.checked);
        const status = node('span', 'workspace-muted', 'Choix MJ requis après confirmation du statut de figurant.'); row.appendChild(status);
        for (const [outcome, label] of [['dead', 'Choisir : mort'], ['unconscious', 'Choisir : inconscient']]) {
          const choose = button(label, 'workspace-secondary'); choose.type = 'button'; choose.disabled = true;
          confirm.addEventListener('change', () => { const plan = preview(); choose.disabled = !plan.ready; status.textContent = plan.ready ? 'Éligible — le MJ choisit une issue.' : plan.reason; });
          choose.addEventListener('click', async () => { choose.disabled = true; try { const plan = preview(); if (!plan.ready) throw new Error(plan.reason); await Store.decideSuddenDeath(participant.id, outcome, { secondaryNpcConfirmed: true, baseRevision: plan.baseRevision }); render(); } catch (error) { choose.disabled = false; status.textContent = userMessage(error, 'Décision non enregistrée.'); } });
          row.appendChild(choose);
        }
        suddenDeath.appendChild(row);
      }
      if (!candidates.length) suddenDeath.appendChild(node('p', 'workspace-muted', 'Aucun figurant à 0 Blessure à arbitrer.'));
    }
    center.appendChild(suddenDeath);
    if (!context.participants.length) {
      const empty = node('div', 'workspace-empty workspace-card workspace-play-empty');
      empty.appendChild(node('h2', '', 'Aucune rencontre en cours'));
      const prepare = button('Préparer une rencontre', 'workspace-primary', { 'data-focus-key': 'begin-encounter' });
      prepare.dataset.workspaceAction = 'begin-encounter';
      prepare.disabled = !callbacks.beginEncounter;
      if (!callbacks.beginEncounter) prepare.title = 'Action indisponible';
      empty.append(prepare, node('p', 'workspace-muted', 'ou ajoutez un profil depuis le panneau Profils'));
      center.appendChild(empty);
      const prepared = encounterList({ compact: true });
      if (prepared.list) center.append(rubric('Rencontres préparées'), prepared.list);
      return;
    }
    const duel = node('div', 'workspace-duel');
    duel.append(renderSheet(context.actor, 'actor', context), renderSheet(context.target, 'target', context));
    center.appendChild(duel);
    const escapePanel=brokenEscapePanel.render(context.participants,context.actor?.id);if(escapePanel)center.appendChild(escapePanel);
    const prayers=divinePanel.render(context.actor,context.participants);if(prayers)center.appendChild(prayers);
    const corruption=corruptionPanel.render(context.actor);if(corruption)center.appendChild(corruption);
    const aftermath=aftermathPanel.render(context.participants);if(aftermath)center.appendChild(aftermath);

    const draft = state.resolution;
    let previousWeaponAttacks = [], resolutionClock = {};
    try {
      const envelope = JSON.parse(Store.getFullJSON());
      const clockRound=envelope.combat?.round,clockTurnIndex=envelope.activeScene?.extensions?.v5?.turnIndex??envelope.extensions?.v5?.turnIndex;
      if(Number.isSafeInteger(clockRound)&&clockRound>0)resolutionClock.currentRound=clockRound;
      if(Number.isSafeInteger(clockTurnIndex)&&clockTurnIndex>0)resolutionClock.currentTurnIndex=clockTurnIndex;
      const {encounterId,turnId}=v5StoreActionClock({...envelope,combat:{...(envelope.combat||{}),currentActorId:context.actor?.id}});
      previousWeaponAttacks = (envelope.extensions?.v5?.standardTurnActions || []).filter(row => row.actorId === context.actor?.id && row.encounterId === encounterId && row.turnId === turnId && row.kind === 'action' && row.targetId)
        .map(row => ({ ...row, weaponName: context.actor?.equipment?.find(item => item.id === row.weaponId)?.name || 'Action' }));
    } catch { previousWeaponAttacks = []; }
    center.appendChild(renderResolutionPanel({
      draft,
      actor: context.actor,participants:context.participants,
      actions: context.actions,
      actionKey: draft.actionKey,
      type: context.type,
      target: context.target,
      groups: context.groups,
      defense: context.defense,
      previousWeaponAttacks,
      resolutionClock,
      canCalculate: typeof Store.previewResolution === 'function' || ['channelling', 'cast', 'dispel'].includes(context.type),
      canApply: Boolean(callbacks.applyResolution || ['channelling', 'cast', 'dispel'].includes(context.type)),
      canDeclareCombatAction: Boolean(callbacks.declareCombatAction),
      canDeclareCombatMovement: Boolean(callbacks.declareCombatMovement),
      handlers: resolutionHandlers
    }));

    const carriedPavises=(context.actor?.equipment||[]).filter(item=>item.kind==='shield'&&/pavise|pavois/i.test(item.name||item.id||''));
    if(carriedPavises.length){
      const deploymentPanel=node('section','workspace-card workspace-pavise-setup');deploymentPanel.setAttribute('aria-label','Mise en place du pavois');
      deploymentPanel.appendChild(node('h3','workspace-card-title','Mise en place du pavois'));
      for(const item of carriedPavises){
        const deployment=context.actor?.extensions?.v5?.paviseDeploymentByItemId?.[item.id]||null,wrap=node('div','workspace-v5-context');
        let actionAvailable=false,actionBlock='';
        try{const envelope=JSON.parse(Store.getFullJSON()),clock=v5StoreActionClock(envelope),isCurrent=envelope.combat?.currentActorId===context.actor.id,spent=(envelope.extensions?.v5?.standardTurnActions||[]).some(row=>row.actorId===context.actor.id&&row.encounterId===clock.encounterId&&row.turnId===clock.turnId),sameTurnSecond=deployment?.actionsPaid===1&&deployment.lastTurnId===clock.turnId;
          actionAvailable=Boolean(isCurrent&&clock.turnId&&!spent&&!sameTurnSecond);
          if(!isCurrent)actionBlock='Le porteur doit être l’acteur courant.';else if(!clock.turnId)actionBlock='Tour non suivi : l’Action ne peut pas être dépensée.';else if(spent)actionBlock='Une Action a déjà été dépensée pendant ce Tour.';else if(sameTurnSecond)actionBlock='La seconde Action exige un Tour ultérieur.';
        }catch{actionBlock='État de combat indisponible.';}
        const progress=deployment?.status==='planted'?`Planté face au ${deployment.facing} · 2/2 Actions`:deployment?.actionsPaid===1?`Première Action dépensée · face au ${deployment.facing} · en attente d’un autre Tour`: 'Non planté · 0/2 Actions';
        wrap.appendChild(node('p','workspace-result-line',`${item.name||item.id} · ${progress}`));
        if(deployment?.status!=='planted'){
          const label=node('label','workspace-type','Direction choisie par le MJ'),choice=document.createElement('select');choice.setAttribute('aria-label',label.textContent);choice.append(new Option('Choisir…',''));for(const [value,text] of [['north','Nord'],['south','Sud'],['east','Est'],['west','Ouest']])choice.append(new Option(text,value));choice.value=deployment?.facing||'';label.append(choice);wrap.appendChild(label);
          const error=node('p','workspace-error'),apply=button(deployment?.actionsPaid===1?'Dépenser la seconde Action au prochain Tour':'Dépenser la première Action de mise en place','workspace-primary');apply.type='button';choice.addEventListener('change',()=>{apply.disabled=Boolean(!choice.value||!actionAvailable||state.busy||!Store);});apply.addEventListener('click',async()=>{apply.disabled=true;error.textContent='';try{const plan=Store.previewV5PaviseDeployment({actorId:context.actor.id,equipmentId:item.id,direction:choice.value});if(!plan.ready)throw new Error(plan.error||'Mise en place non disponible.');const result=await Store.applyV5PaviseDeployment(plan);if(result?.status!=='applied')throw new Error(result?.reason||'Action du pavois non enregistrée.');render();}catch(cause){error.textContent=userMessage(cause,'Action du pavois non enregistrée.');apply.disabled=false;}});apply.disabled=Boolean(!choice.value||!actionAvailable||state.busy||!Store);wrap.append(error,apply);
          if(actionBlock)wrap.appendChild(node('p','workspace-muted',actionBlock));
        }
        deploymentPanel.appendChild(wrap);
      }
      deploymentPanel.appendChild(node('p','workspace-muted','Chaque clic dépense et journalise une Action du Tour courant. La seconde Action doit être dépensée à un Tour ultérieur; la protection n’est active qu’après les deux dépenses.'));
      center.appendChild(deploymentPanel);
    }

    const leviathanPieces=(context.actor?.equipment||[]).filter(item=>/leviathan plate|plate de leviathan/i.test(item.name||item.id||''));
    if(leviathanPieces.length){
      const panel=node('section','workspace-card workspace-leviathan-encumbrance');panel.setAttribute('aria-label','Encombrement de la plate de léviathan');panel.appendChild(node('h3','workspace-card-title','Encombrement de la plate de léviathan'));
      for(const item of leviathanPieces){const wrap=node('div','workspace-v5-context'),baseline=item.extensions?.v5?.metalEquivalentEncumbrance;
        const effective=effectiveSupplementalEncumbrance(item,baseline);wrap.appendChild(node('p','workspace-result-line',effective===null?`${item.name} · saisissez l’Encombrement de la pièce métallique équivalente pour calculer cet objet.`:`${item.name} · métal ${baseline} · léviathan ${effective} Encombrement (−1)`));
        const label=node('label','workspace-type','Encombrement de la pièce métallique équivalente (MJ)');const input=document.createElement('input');input.type='number';input.min='1';input.step='1';input.value=baseline??'';input.setAttribute('aria-label',label.textContent);label.append(input);wrap.appendChild(label);
        const error=node('p','workspace-error'),save=button('Enregistrer la référence métal','workspace-primary');save.type='button';save.addEventListener('click',async()=>{save.disabled=true;error.textContent='';try{const value=Number(input.value);if(!Number.isSafeInteger(value)||value<1)throw new Error('Saisissez un Encombrement métallique entier positif.');const fresh=(Store.listParticipants?.()||[]).find(row=>row.id===context.actor.id)||context.actor;const equipment=(fresh.equipment||[]).map(row=>row.id!==item.id?row:{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),metalEquivalentEncumbrance:value}}});const result=await Store.updateParticipant(fresh.id,{equipment});if(result?.ok===false)throw new Error(result.error||'Référence non enregistrée.');render();}catch(cause){error.textContent=userMessage(cause,'Référence non enregistrée.');save.disabled=false;}});wrap.append(error,save);panel.appendChild(wrap);
      }
      panel.appendChild(node('p','workspace-muted','Calcul stocké sur l’objet : Encombrement de la pièce métallique équivalente moins 1. Aucun autre objet ni PA/Taille ne change.'));
      center.appendChild(panel);
    }

    const reloadWeapons=(context.actor?.equipment||[]).filter(item=>item.kind==='weapon'&&!/griffonsfoot/i.test(item.name||'')&&item.keywords?.some(row=>['a-repetition','recharge','salve','salvo'].includes(typeof row==='string'?row:row?.id)));
    if(reloadWeapons.length){
      const reloadPanel=node('section','workspace-card workspace-weapon-reload');reloadPanel.setAttribute('aria-label','Rechargement des armes');
      reloadPanel.appendChild(node('h3','workspace-card-title','Rechargement des armes'));
      for(const weapon of reloadWeapons){
        const state=weapon.extensions?.v5?.reloadState,wrap=node('div','workspace-v5-context');
        const title=node('p','workspace-result-line',`${weapon.name||weapon.id} · ${state?`${state.shotsRemaining} tir(s) restant(s)`:'chargeur non initialisé'}${state?.reloading?` · recharge ${state.accumulatedSuccesses}/${state.requiredSuccesses} succès`:''}`);wrap.appendChild(title);
        const error=node('p','workspace-error');
        const apply=async input=>{try{error.textContent='';const plan=Store.previewV5WeaponReload({actorId:context.actor.id,equipmentId:weapon.id,...input});if(!plan.ready)throw new Error(plan.error||'Rechargement à préciser.');const saved=await Store.applyV5WeaponReload(plan);if(saved?.status!=='applied')throw new Error(saved?.reason||'Rechargement non enregistré.');render();}catch(cause){error.textContent=userMessage(cause,'Rechargement non enregistré.');}};
        if(!state&&weapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&String(row?.parameter).toLowerCase()==='variable')){
          const label=node('label','workspace-type','Capacité du chargeur arbitrée par le MJ '),capacity=document.createElement('input');capacity.type='number';capacity.min='1';capacity.step='1';capacity.setAttribute('aria-label',`Capacité arbitrée — ${weapon.name||weapon.id}`);const decide=button('Enregistrer l’arbitrage','workspace-primary');decide.type='button';decide.addEventListener('click',()=>{if(!capacity.value){error.textContent='Saisissez une capacité entière positive.';return;}apply({operation:'arbitrate',repeaterRating:Number(capacity.value)});});label.append(capacity);wrap.append(label,decide);
        }
        const begin=button('Commencer la recharge','workspace-secondary');begin.type='button';begin.addEventListener('click',()=>apply({operation:'begin'}));begin.disabled=state?.reloading===true;wrap.appendChild(begin);
        if(state?.reloading){
          const select=document.createElement('select');select.setAttribute('aria-label',`Résultat du Test de recharge — ${weapon.name||weapon.id}`);select.append(new Option('Résultat du Test…',''),new Option('Réussite','success'),new Option('Échec','failure'));
          const sl=document.createElement('input');sl.type='number';sl.step='1';sl.setAttribute('aria-label',`DR du Test de recharge — ${weapon.name||weapon.id}`);
          const progress=button('Enregistrer le Test','workspace-primary');progress.type='button';progress.addEventListener('click',()=>{if(!select.value||sl.value===''){error.textContent='Saisissez le résultat et la DR du Test.';return;}apply({operation:'progress',success:select.value==='success',testSl:Number(sl.value),expectedWeaponRevision:state.revision});});wrap.append(select,sl,progress);
        }
        wrap.appendChild(error);reloadPanel.appendChild(wrap);
      }
      center.appendChild(reloadPanel);
    }
    const lodged=(context.participants||[]).flatMap(participant=>(participant.extensions?.v5?.lodgedProjectiles||[]).filter(row=>row.removed!==true).map(projectile=>({participant,projectile})));
    if(lodged.length){
      const panel=node('section','workspace-card workspace-impaled-projectiles');panel.setAttribute('aria-label','Projectiles fichés');
      panel.appendChild(node('h3','workspace-card-title','Projectiles fichés — Empaleuse'));
      for(const {participant,projectile} of lodged){
        const wrap=node('div','workspace-v5-context');wrap.appendChild(node('p','workspace-result-line',`${participant.name||participant.id} · ${projectile.ammunitionId} · ${projectile.removal==='surgery'?'chirurgie requise':'Test de Guérison requis'} · 1 Blessure bloquée`));
        const error=node('p','workspace-error');let surgeryConfirmed=false,skillId='',testRoll='';
        if(projectile.removal==='surgery'){
          const label=node('label','workspace-type','Le MJ confirme la chirurgie');const check=document.createElement('input');check.type='checkbox';check.addEventListener('change',()=>{surgeryConfirmed=check.checked;});label.prepend(check);wrap.appendChild(label);
        }else{
          const skills=(participant.skills||[]).filter(row=>/gu[eé]rison|heal/iu.test(row.name||row.nom||''));
          const select=document.createElement('select');select.setAttribute('aria-label',`Compétence Guérison — ${participant.name||participant.id}`);select.append(new Option('Choisir Guérison…',''));for(const row of skills)select.append(new Option(row.name||row.nom||row.id,row.id));select.addEventListener('change',()=>{skillId=select.value;});
          const input=document.createElement('input');input.type='number';input.min='1';input.max='100';input.step='1';input.setAttribute('aria-label',`d100 du Test de Guérison — ${participant.name||participant.id}`);input.addEventListener('input',()=>{testRoll=input.value;});wrap.append(select,input);
        }
        const apply=button('Enregistrer le retrait','workspace-primary');apply.type='button';apply.addEventListener('click',async()=>{try{error.textContent='';const plan=Store.previewV5ProjectileExtraction({participantId:participant.id,projectileId:projectile.id,
            method:projectile.removal==='surgery'?'surgery':'heal-test',surgeryConfirmed,skillId,roll:testRoll===''?undefined:Number(testRoll)});if(!plan.ready)throw new Error(plan.error);const result=await Store.applyV5ProjectileExtraction(plan);if(result?.status!=='applied')throw new Error(result?.reason||'Retrait non enregistré.');render();}catch(cause){error.textContent=userMessage(cause,'Retrait non enregistré.');}});
        wrap.append(apply,error);panel.appendChild(wrap);
      }
      center.appendChild(panel);
    }

    const criticalDecisions=[];
    for(const participant of context.participants||[]){
      const v5=participant.extensions?.v5||{};
      for(const record of v5.criticalAftermath||[])if(record.sequela?.criticalDeath===true&&!record.deathDecision)criticalDecisions.push({kind:'table',participant,record});
      if(['countdown','awaiting-mj'].includes(v5.criticalDeath?.status))criticalDecisions.push({kind:'countdown',participant,countdown:v5.criticalDeath});
    }
    if(criticalDecisions.length){
      const section=node('section','workspace-card workspace-critical-death-decisions');section.setAttribute('aria-label','Décisions MJ sur les morts critiques');
      section.appendChild(rubric('Décisions du MJ — mort critique'));
      for(const item of criticalDecisions){
        const participant=item.participant,label=item.kind==='table'?`${participant.name} · ${item.record.effectName} (${item.record.source?.printedName||item.record.table})`:`${participant.name} · décompte arrivé à l’échéance du Round ${item.countdown.dueRound}`;
        const row=node('div','workspace-result-line');row.appendChild(node('span','',label));
        for(const [decision,text] of [['confirm','Confirmer la mort'],['decline','Refuser la mort']]){const button=node('button','workspace-secondary',text);button.type='button';button.disabled=state.resolution.busy;button.addEventListener('click',async()=>{button.disabled=true;try{if(item.kind==='table')await Store.decideImmediateCriticalDeath(participant.id,item.record.id,decision);else await Store.decideCriticalDeath(participant.id,decision,{round:readCombat(Store).round});render();}catch(error){button.disabled=false;const message=userMessage(error,'Décision MJ non enregistrée.');section.appendChild(node('p','workspace-error',message));}});row.appendChild(button);}
        if(item.kind==='countdown'&&item.countdown.status==='countdown')row.appendChild(node('span','workspace-muted',` — échéance Round ${item.countdown.dueRound}`));
        section.appendChild(row);
      }
      center.appendChild(section);
    }
    const amputationFollowups=[];
    for(const participant of context.participants||[])for(const record of participant.extensions?.v5?.criticalAftermath||[]){
      if(record.amputationShockStatus==='not-occurred')continue;
      const preview=Store.previewAmputationShock?.({participantId:participant.id,criticalId:record.id});
      if(preview?.status==='deferred')continue;
      if(preview?.status!=='duplicate'&&preview?.requirements?.length)amputationFollowups.push({participant,record,requirements:preview.requirements,shockPart:preview.shockPart||preview.requirements[0]?.part});
    }
    if(amputationFollowups.length){
      const section=node('section','workspace-card workspace-amputation-followups');section.setAttribute('aria-label','Chocs d’amputation à résoudre');
      section.appendChild(rubric('Chocs d’amputation — Test de Résistance'));
      for(const item of amputationFollowups){
        const {participant,record,requirements}=item,parts=[...new Set(requirements.map(row=>row.part).filter(Boolean))].join(', ')||'membre',canReject= requirements.length>0&&requirements.every(row=>row.conditional===true);
        section.appendChild(node('p','workspace-result-line',`${participant.name} · ${record.effectName} · amputation : ${parts} · Résistance ${requirements[0].difficultyDR} DR · chirurgie requise`));
        const row=node('div','workspace-critical-amputation-controls');
        const allFingersLost=requirements.some(requirement=>requirement.trigger==='all-fingers-lost'),factLabel=allFingersLost?'Tous les doigts ont été perdus':'Amputation effectivement survenue';
        const occurrenceLabel=node('label','workspace-type',factLabel),occurrence=document.createElement('select');occurrence.setAttribute('aria-label',`${factLabel} : ${participant.name}`);if(canReject)occurrence.append(new Option('À confirmer',''),new Option('Oui','true'),new Option('Non','false'));else{occurrence.append(new Option('Oui','true'));occurrenceLabel.append(node('span','workspace-muted','Amputation imposée par la ligne critique.'));}occurrenceLabel.append(occurrence);row.append(occurrenceLabel);
        const resultLabel=node('label','workspace-type','Test de Résistance'),result=document.createElement('select');result.setAttribute('aria-label',`Résultat du Test de Résistance : ${participant.name}`);result.append(new Option('À préciser',''),new Option('Réussite','success'),new Option('Échec','failure'));resultLabel.append(result);row.append(resultLabel);
        const slLabel=node('label','workspace-type','DR du Test'),sl=document.createElement('input');sl.type='number';sl.step='1';sl.setAttribute('aria-label',`DR du Test de Résistance : ${participant.name}`);slLabel.append(sl);row.append(slLabel);
        const apply=node('button','workspace-primary','Enregistrer le choc'),error=node('p','workspace-error');apply.type='button';apply.disabled=state.resolution.busy;apply.addEventListener('click',async()=>{
          error.textContent='';if(occurrence.value==='false'&&!canReject){error.textContent='Cette ligne impose l’amputation; elle ne peut pas être écartée.';return;}if(occurrence.value==='false'){
            apply.disabled=true;try{if(allFingersLost)await Store.deferAmputationShock(participant.id,record.id,item.shockPart);else{const fresh=(Store.listParticipants?.()||[]).find(row=>row.id===participant.id)||participant;const aftermath=fresh.extensions?.v5?.criticalAftermath||[];await Store.updateParticipant(participant.id,{extensions:{...(fresh.extensions||{}),v5:{...(fresh.extensions?.v5||{}),criticalAftermath:aftermath.map(row=>row.id===record.id?{...row,amputationShockStatus:'not-occurred'}:row)}}});}render();}catch(cause){error.textContent=userMessage(cause,'Absence d’amputation non enregistrée.');apply.disabled=false;}return;
          }
          if(!occurrence.value||!result.value||sl.value===''){error.textContent='Confirmez l’amputation et saisissez le résultat/DR du Test.';return;}
          const testSL=Number(sl.value),success=result.value==='success';if(!Number.isSafeInteger(testSL)||(success&&testSL<0)||(!success&&testSL>0)){error.textContent='La DR doit être entière, positive ou nulle en réussite, négative ou nulle en échec.';return;}
          apply.disabled=true;try{const plan=Store.previewAmputationShock({participantId:participant.id,criticalId:record.id,shockPart:item.shockPart,amputationOccurred:occurrence.value==='true',test:{success,sl:testSL}});if(plan.status!=='ready')throw new Error(plan.reason||'Le Test de Résistance reste à préciser.');const saved=await Store.applyAmputationShock(plan);if(saved?.status!=='applied'&&saved?.status!=='duplicate')throw new Error(saved?.reason||'Choc d’amputation non enregistré.');render();}catch(cause){error.textContent=userMessage(cause,'Choc d’amputation non enregistré.');apply.disabled=false;}
        });row.append(apply,error);section.append(row);
      }
      center.appendChild(section);
    }

    if (callbacks.renderOverview) {
      const content = node('div', 'workspace-pending-content');
      const rendered = callbacks.renderOverview(content);
      if (rendered instanceof Node) content.appendChild(rendered);
      else if (typeof rendered === 'string' && rendered) content.textContent = rendered;
      if (content.childNodes.length) {
        const pending = node('section', 'workspace-pending workspace-card');
        pending.setAttribute('aria-label', 'À traiter');
        pending.append(rubric('À traiter'), content);
        center.appendChild(pending);
      }
    }
  }

  function renderProfilesTab(content) {
    let list = content.querySelector('.workspace-side-profiles');
    if (!list) {
      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'workspace-search workspace-side-search';
      search.placeholder = 'Rechercher un profil…';
      search.setAttribute('aria-label', 'Rechercher un profil à ajouter');
      search.value = state.sideQuery;
      list = node('ul', 'workspace-side-profiles');
      search.addEventListener('input', () => { state.sideQuery = search.value; renderProfilesTab(content); });
      content.replaceChildren(search, list);
    }
    list.replaceChildren();
    const term = profileSearchText({ name: state.sideQuery });
    const profiles = readProfiles(Store).filter(profile => profileSearchText(profile).includes(term));
    if (!profiles.length) list.appendChild(node('li', 'workspace-muted', 'Aucun profil correspondant.'));
    profiles.forEach(profile => {
      const item = node('li', 'workspace-side-profile');
      const text = node('div', 'workspace-side-profile-text');
      text.append(
        node('span', 'combatant-name', profile.name || 'Sans-nom'),
        node('span', 'workspace-muted num', `${profile.kind || 'Créature'} · Init\u00a0${profile.initiative ?? 0} · PV\u00a0${profile.hp ?? 0} · BE\u00a0${toughnessBonus(profile)}`)
      );
      const add = button('+ Au combat', 'workspace-secondary', { 'aria-label': `Ajouter ${profile.name} au combat` });
      add.dataset.workspaceAction = 'add-profile-to-combat';
      add.dataset.profileId = profile.id;
      add.disabled = !callbacks.addProfileToCombat;
      if (!callbacks.addProfileToCombat) add.title = 'Action indisponible';
      const addActive=button('+ Actif', 'workspace-secondary', { 'aria-label': `Ajouter ${profile.name} actif au combat` });
      addActive.dataset.workspaceAction='add-profile-active-to-combat';addActive.dataset.profileId=profile.id;
      addActive.disabled=!callbacks.addProfileToActiveCombat;
      if(!callbacks.addProfileToActiveCombat)addActive.title='Action indisponible';
      item.append(text, add, addActive);
      list.appendChild(item);
    });
  }

  function renderRenderer(renderer, content, fallback) {
    if (!renderer) {
      content.replaceChildren(node('p', 'workspace-muted', fallback));
      return;
    }
    const rendered = renderer(content);
    if (rendered instanceof Node) content.appendChild(rendered);
    else if (typeof rendered === 'string') content.textContent = rendered;
  }

  // The play layout is built once: the side panel keeps its DOM (search,
  // filters, focus) while the track and the centre are re-rendered.
  const play = (() => {
    const grid = node('div', 'workspace-play-grid');
    const track = node('aside', 'workspace-track-column');
    track.setAttribute('aria-label', 'Piste des tours');
    const center = node('div', 'workspace-center');
    const side = initSidePanel({
      tabs: [
        { id: 'rules', label: 'Règles', render: content => renderRenderer(callbacks.renderRules, content, 'Les règles et mots-clés restent consultables sans modifier la séance.') },
        { id: 'profiles', label: 'Profils', render: renderProfilesTab },
        { id: 'log', label: 'Journal', render: content => renderRenderer(callbacks.renderLog, content, 'Aucun événement récent.') }
      ],
      onToggle: collapsed => grid.classList.toggle('is-side-collapsed', collapsed)
    });
    grid.append(track, center, side.element);
    refs.play.appendChild(grid);
    return { grid, track, center, side };
  })();

  function renderPlay() {
    const context = playContext();
    renderTrack(context);
    renderCenter(context);
  }

  function renderLibrary() {
    refs.library.replaceChildren();
    const heading = node('div', 'workspace-section-heading');
    heading.appendChild(node('h2', '', 'Bibliothèque'));
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'workspace-search';
    search.placeholder = 'Rechercher un profil…';
    search.setAttribute('aria-label', 'Rechercher dans la bibliothèque');
    search.value = state.libraryQuery;
    search.addEventListener('input', event => {
      state.libraryQuery = event.target.value;
      renderLibrary();
      refs.library.querySelector('.workspace-search')?.focus();
    });
    heading.appendChild(search);
    refs.library.appendChild(heading);

    const subnav = node('div', 'workspace-subnav');
    ['profiles', 'rules', 'favorites'].forEach(section => {
      const label = { profiles: 'Profils', rules: 'Règles et mots-clés', favorites: 'Favoris' }[section];
      const tab = button(label, 'workspace-secondary');
      tab.dataset.librarySection = section;
      tab.setAttribute('aria-pressed', String(state.librarySection === section));
      subnav.appendChild(tab);
    });
    refs.library.appendChild(subnav);

    const content = node('div', 'workspace-library-content');
    if (state.librarySection === 'profiles') {
      const term = profileSearchText({ name: state.libraryQuery });
      const profiles = readProfiles(Store).filter(profile => profileSearchText(profile).includes(term));
      if (!profiles.length) content.appendChild(node('p', 'workspace-muted', 'Aucun profil correspondant.'));
      else {
        const list = node('div', 'workspace-profile-grid');
        profiles.forEach(profile => { const card=profileSummary(profile, {
          canEdit: Boolean(callbacks.editProfile),
          canDuplicate: Boolean(callbacks.duplicateProfile),
          canRemove: Boolean(callbacks.removeProfile),
          onEdit: callbacks.editProfile,
          onDuplicate: callbacks.duplicateProfile,
          onRemove: callbacks.removeProfile
        }); card.appendChild(renderFicheDetails(profile)); list.appendChild(card); });
        content.appendChild(list);
      }
    } else if (state.librarySection === 'rules') {
      const renderer = callbacks.renderRules;
      if (renderer) {
        const rendered = renderer(content);
        if (rendered instanceof Node) content.appendChild(rendered);
        else if (typeof rendered === 'string') content.textContent = rendered;
      } else {
        content.appendChild(node('p', 'workspace-muted', 'Les règles et mots-clés restent consultables sans modifier la séance.'));
      }
    } else {
      const profiles = readProfiles(Store).filter(profile => profile.favorite);
      if (!profiles.length) content.appendChild(node('p', 'workspace-muted', 'Aucun favori enregistré.'));
      else {
        const list = node('div', 'workspace-profile-grid');
        profiles.forEach(profile => { const card=profileSummary(profile, {
          canEdit: Boolean(callbacks.editProfile),
          onEdit: callbacks.editProfile
        }); card.appendChild(renderFicheDetails(profile)); list.appendChild(card); });
        content.appendChild(list);
      }
    }
    refs.library.appendChild(content);
  }

  // The whole view is rebuilt on every Bus event: the focused control is found
  // again through its data-focus-key, with its caret position.
  function captureFocus() {
    const active = document.activeElement;
    if (!active || !refs.root.contains(active) || !active.dataset?.focusKey) return null;
    let start = null;
    let end = null;
    try { start = active.selectionStart ?? null; end = active.selectionEnd ?? null; } catch { /* champ sans sélection */ }
    return { key: active.dataset.focusKey, start, end };
  }

  function restoreFocusKey(saved) {
    if (!saved) return;
    const element = refs.root.querySelector(`[data-focus-key="${CSS.escape(saved.key)}"]`);
    if (!element || element.disabled || element === document.activeElement) return;
    element.focus({ preventScroll: true });
    if (saved.start !== null && typeof element.setSelectionRange === 'function') {
      try { element.setSelectionRange(saved.start, saved.end); } catch { /* type sans sélection */ }
    }
  }

  function render(focusKey = null) {
    const saved = focusKey ? { key: focusKey, start: null, end: null } : captureFocus();
    renderTabs();
    refs.prepare.hidden = state.space !== 'prepare';
    refs.play.hidden = state.space !== 'play';
    refs.library.hidden = state.space !== 'library';
    callbacks.spaceShown?.(state.space);
    renderPrepare();
    renderPlay();
    renderLibrary();
    restoreFocusKey(saved);
  }

  function selectActor(id) {
    if(state.resolution.actorId!==id)clearFortuneAdvantageDraft(state.resolution);
    state.actorChoice = { id, turn: turnKey(readCombat(Store)) };
    render();
  }

  function rememberFocus(target) {
    state.lastFocus = target;
    state.lastFocusSpace = target?.dataset.workspaceSpace || null;
    state.lastFocusAction = target?.dataset.workspaceAction || null;
  }

  function updateStates(participantId, next, focusKey, acquire = false, extra = {}) {
    const operation = acquire && callbacks.acquireStates ? callbacks.acquireStates : callbacks.setStates;
    const states = acquire && !callbacks.acquireStates ? [...normalizeEffects(readParticipants(Store).find(item => item.id === participantId)?.states), ...next] : next;
    return Promise.resolve(operation(participantId, states, extra))
      .then(result => { if(result?.status!=='cancelled') state.stateForm = null; render(focusKey); })
      .catch(error => {
        if (state.stateForm) state.stateForm.error = userMessage(error, 'État non enregistré : réessayez.');
        render();
      });
  }

  refs.root.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target || !refs.root.contains(target)) return;
    if (target.dataset.workspaceSpace) {
      rememberFocus(target);
      state.space = target.dataset.workspaceSpace;
      render();
      // Prévient l'application pour que l'onglet actif et le bandeau de combat suivent (goToSpace).
      refs.root.dispatchEvent(new CustomEvent('workspace-space-request', { bubbles: true, detail: { space: state.space } }));
      return;
    }
    if (target.dataset.workspaceSelect) {
      // Une ligne de la piste désigne le personnage actif (fiche de gauche, actions) ; la cible se choisit dans Résolution.
      state.space = 'play';
      selectActor(target.dataset.workspaceSelect);
      return;
    }
    if (target.dataset.librarySection) {
      state.librarySection = target.dataset.librarySection;
      callbacks.selectLibrarySection(state.librarySection);
      renderLibrary();
      return;
    }
    const action = target.dataset.workspaceAction;
    if (!action) return;
    const participantId = target.dataset.actorId;
    const participant = participantId ? readParticipants(Store).find(item => item.id === participantId) : null;
    switch (action) {
      case 'begin-encounter': callbacks.beginEncounter(); break;
      case 'edit-encounter': callbacks.editEncounter?.(target.dataset.encounterId); break;
      case 'launch-encounter': callbacks.launchEncounter?.(target.dataset.encounterId); break;
      case 'delete-encounter':
        // Le bouton cliqué disparaît avec la carte : le focus revient à « Nouvelle rencontre ».
        Promise.resolve(callbacks.deleteEncounter?.(target.dataset.encounterId)).then(done => { if (done) render('new-encounter'); }, noop);
        break;
      case 'resume-scene': callbacks.resumeScene?.(target.dataset.sceneId); break;
      case 'suspend-scene': {
        // « Suspendre » laisse place à « Reprendre » sur la même carte.
        const id = target.dataset.encounterId;
        Promise.resolve(callbacks.suspendScene?.()).then(done => { if (done) render(`resume-scene-${id}`); }, noop);
        break;
      }
      case 'restart-combat':
        Promise.resolve(callbacks.restartCombat?.()).then(done => { if (done) render(`restart-combat-${target.dataset.encounterId}`); }, noop);
        break;
      case 'show-play': callbacks.showPlay?.(); break;
      case 'create-profile': callbacks.createProfile?.(); break;
      case 'edit-profile': callbacks.editProfile(target.dataset.profileId); break;
      case 'duplicate-profile': callbacks.duplicateProfile?.(target.dataset.profileId); break;
      case 'remove-profile': callbacks.removeProfile?.(target.dataset.profileId); break;
      case 'edit-participant': callbacks.editParticipant(participantId); break;
      case 'remove-participant':
        if (canRemoveDefeated(participant)) {
          target.disabled = true;
          Promise.resolve(callbacks.removeParticipant?.(participantId)).then(() => render(), () => { target.disabled = false; });
        }
        break;
      case 'use-reaction': {
        const offer = Store.getReactionOpportunities?.(participantId).find(row => row.id === target.dataset.reactionId);
        if (!offer || state.resolution.busy) break;
        const source = actorActions(participant).find(row => row.id === offer.action.id);
        state.actorChoice = { id: participantId, turn: turnKey(readCombat(Store)) };
        state.targetChoice = offer.targetId;
        state.resolution = { ...emptyResolution(participantId), type: 'attack', v5Kind: 'melee', extraAttack: true,
          reactionId: offer.id, reactionAction: { ...offer.action, note: source?.note || 'Attaque d’Assaut féroce' } };
        const bound = state.resolution.reactionAction;
        state.resolution.actionKey = actionKey(bound, actorActions(participant).findIndex(row => row.id === bound.id));
        render('roll-attack');
        break;
      }
      case 'edit-fortune': callbacks.editFortune?.(participantId); break;
      case 'edit-fate': callbacks.editFate?.(participantId); break;
      case 'toggle-momentum': if (participant) Promise.resolve(callbacks.setMomentum?.(participantId, !hasMomentum(participant))).catch(error => { state.resolution.error = { field: 'general', message: userMessage(error, 'Élan non enregistré : réessayez.') }; render(); }); break;
      case 'adjust-hp': {
        const delta = Number(target.dataset.hpDelta);
        const healSource = delta > 0 && isHomunculusParticipant(participant) && state.healSources[participantId] ? { kind: state.healSources[participantId] } : null;
        // Le refus se lit même sans panneau de résolution ouvert : toast d'erreur (import différé : toast.js lit le DOM au chargement).
        Promise.resolve(callbacks.adjustHp?.({ participantId, delta, ...(healSource ? { source: healSource } : {}) })).catch(error => import('./toast.js').then(({ showToast }) => showToast(userMessage(error, 'PV non ajustés : réessayez.'), 'error')));
        break;
      }
      case 'enter-participant': callbacks.enterParticipant?.(participantId); break;
      case 'add-profile-to-combat': callbacks.addProfileToCombat?.(target.dataset.profileId); break;
      case 'add-profile-active-to-combat': callbacks.addProfileToActiveCombat?.(target.dataset.profileId); break;
      case 'open-state-form':
        state.stateForm = state.stateForm?.participantId === participantId
          ? null
          : { participantId, name: STATE_NAMES[0], level: '1', expiryPhase: '', expiryRound: String(Math.max(1,readCombat(Store).round)), expiryActorId: participantId, error: '' };
        render(state.stateForm ? 'state-form-name' : null);
        break;
      case 'cancel-state': {
        const id = state.stateForm?.participantId;
        state.stateForm = null;
        render(id ? `state-add-${id}` : null);
        break;
      }
      case 'add-state': {
        if (!participant || !state.stateForm) break;
        const form = state.stateForm;
        const amount=Number(form.level);
        if(!Number.isSafeInteger(amount)||amount<1){form.error='Le nombre d’États doit être un entier positif.';render();break;}
        let added = { id: `state-${uid()}`, name: form.name, level: amount, duration: null, source: { kind: 'manual' } };
        if(form.expiryPhase) {
          const round=Number(form.expiryRound);if(!Number.isSafeInteger(round)||round<1){form.error='Le Round d’expiration doit être un entier positif.';render();break;}
          const expiry={phase:form.expiryPhase,round,...(form.expiryPhase!=='endOfRound'?{turn:1,actorId:form.expiryActorId||participantId}:{})};
          added=createV5TimedEffect(added,{authorId:readCombat(Store).currentActorId||participantId,targetId:participantId,expiry});
        }
        updateStates(participantId, [added], `state-add-${participantId}`, true, { magical: form.magical === true });
        break;
      }
      case 'heal-critical': {
        if (!participant || !callbacks.healCriticalWound) break;
        target.disabled = true;
        Promise.resolve().then(() => callbacks.healCriticalWound(participantId, target.dataset.criticalId)).then(() => render(), error => {
          state.resolution.error = { field: 'general', message: userMessage(error, 'Blessure Critique non guérie.') }; render();
        });
        break;
      }
      case 'recover-state': {
        if (!participant || !callbacks.recoverState) break;
        const effect=normalizeEffects(participant.states)[Number(target.dataset.stateIndex)];if(!effect)break;
        target.disabled=true;Promise.resolve(callbacks.recoverState(participantId,effect)).then(()=>render(`state-add-${participantId}`),error=>{state.resolution.error={field:'general',message:userMessage(error,'État non récupéré : vérifiez sa cause et les résultats du Test.')};render();});break;
      }
      case 'remove-state': {
        if (!participant) break;
        const index = Number(target.dataset.stateIndex);
        updateStates(participantId, normalizeEffects(participant.states).filter((_, position) => position !== index), `state-add-${participantId}`);
        break;
      }
      default: break;
    }
  });

  refs.root.addEventListener('keydown', event => {
    // A focused command button must keep native activation semantics. The
    // global keyboard handler must not interpret its Space key as next turn.
    if (event.code === 'Space' && event.target.closest('button')) {
      event.stopPropagation();
      return;
    }
    if (event.key === 'Escape' && state.stateForm && event.target.closest('.workspace-state-form')) {
      event.preventDefault();
      event.stopPropagation();
      const id = state.stateForm.participantId;
      state.stateForm = null;
      render(`state-add-${id}`);
    }
  });

  const rerender = () => {
    render();
    play.side.refresh('profiles');
    play.side.refresh('log');
  };
  ['reserve', 'combat', 'combat:update', 'log'].forEach(event => Bus?.on?.(event, rerender));
  render();

  return Object.freeze({
    render,
    setSpace(space) {
      if (!WORKSPACE_SPACES.includes(space)) throw new RangeError(`Espace inconnu : ${space}`);
      state.space = space;
      render();
    },
    selectActor,
    openResolution(line, { roll } = {}) {
      const actor = readParticipants(Store).find(item => item.id === line.participantId && item.zone === 'active');
      if (!actor || roll != null && !validRoll(roll)) return false;
      const draft = emptyResolution(actor.id);
      const available = actorActions(actor);
      const linked = available.find(item => item.id === line.id || item.id === line.extensions?.profileActionId);
      if (inferActionType(line) !== 'attack' && !(actor.actions || []).some(item => item.id === line.id || item.id === line.extensions?.profileActionId) && Store.getDiceLines?.().some(item => item.id === line.id && item.participantId === actor.id)) draft.externalActionId = line.id;
      if (!linked && !draft.externalActionId) return false;
      state.space = 'play';
      state.actorChoice = { id: actor.id, turn: turnKey(readCombat(Store)) };
      state.resolution = draft;
      const actions = actorActions(actor);
      const action = linked || actions.find(item => item.id === line.id);
      state.resolution.actionKey = actionKey(action, actions.indexOf(action));
      if (roll != null) state.resolution.attackRoll = String(roll);
      state.targetChoice = line.targetId || null;
      render('roll-attack');
      return true;
    },
    selectTarget(id) {
      state.targetChoice = id || 'none';
      state.resolution.defenseBase = null; state.resolution.defenseSource = null;
      state.resolution.defenseKind = null; state.resolution.defenseSlModifier = null;
      state.resolution.defenseAdvantages = 0; state.resolution.defenseDisadvantages = 0; state.resolution.defenseContext = {};
      state.resolution.v5Choice = null; state.resolution.defenseChoice = null;
      state.resolution.protectionContext = {};
      resetCritical(state.resolution);
      state.resolution.preview = null;
      render();
    },
    openContext(kind) {
      if (!['rules', 'log', 'profiles'].includes(kind)) throw new RangeError(`Panneau inconnu : ${kind}`);
      play.side.open(kind);
    },
    closeContext() {
      play.side.collapse();
    },
    getViewState() {
      return { ...state, sidePanel: play.side.getState() };
    }
  });
}
