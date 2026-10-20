/**
 * Gestionnaires d'effet divins (T4) : Traits, États spéciaux, Actions, Talents, bonus d'arme et modificateurs de Test.
 * Les couches portent la donnée ; Traits, actions, bonus d'arme et Talents n'étant pas lus gratuitement par le recalcul des valeurs,
 * `projectDivineGear` les reconstruit depuis `divineEffects` (appelée par recomputeLayerValues) : fin d'effet, Undo et synchro
 * nettoient donc seuls ce qu'ils ont posé.
 */
const clone = value => structuredClone(value);
const need = (field, label) => ({ field, label });
const isText = value => typeof value === 'string' && value.trim() !== '';
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const specialStateKeys = new Set(['fearImmune', 'terrorAsFear', 'ignoreConditionPenalties', 'cannotRaiseUndead', 'doesNotBreathe']);
// Talents dont le moteur lit un contrat mécanique : seuls ceux-là sont injectés pour de vrai (les autres restent une étiquette).
export const injectableTalentIds = new Set(['talent-fearless', 'talent-strong-legs', 'talent-menacing', 'talent-catfall', 'talent-drilled', 'talent-hatred', 'talent-frenzy', 'talent-strike-to-injure']);
const weaponFacts = input => input?.facts?.weapon;
const characteristicBonus = (participant, key) => {
  const score = Number(participant?.caracs?.[key]);
  return Number.isFinite(score) ? Math.floor(score / 10) : null;
};
const SPECIALIZATION_LABEL = 'Ennemi visé (espèce ou individu)';
const SPECIALIZATION_MAX = 60;
const cleanSpecialization = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
const liveLayer = (participant, layer) => layer && (participant.extensions?.v5?.divineEffects || []).find(row => row.id === layer.id);

const handlers = {
  'grant-trait': {
    validate: effect => !Array.isArray(effect.traits) || !effect.traits.length || !effect.traits.every(isText) ? 'grant-trait exige traits (liste de textes).' : null,
    needs: effect => Array.isArray(effect.traits) && effect.traits.length && effect.traits.every(isText) ? [] : [need('contract.effects.traits', 'Traits sourcés requis')],
    // Portée réservée au prêtre (`appliesTo: 'caster'`, ou son alias `casterOnly`, ex. Peur de Flambeau de Vertu) : filtrée par le moteur.
    buildLayer: effect => ({ traits: [...effect.traits] })
  },
  'special-state': {
    validate(effect) {
      const keys = Object.keys(effect).filter(key => specialStateKeys.has(key));
      if (!keys.length) return `special-state exige l’un de ${[...specialStateKeys].join(', ')}.`;
      return keys.some(key => effect[key] !== true) ? 'special-state : chaque drapeau doit valoir true.' : null;
    },
    needs: effect => Object.keys(effect).some(key => specialStateKeys.has(key)) ? [] : [need('contract.effects.specialState', 'État spécial sourcé requis')],
    buildLayer: effect => ({ specialState: Object.fromEntries(Object.keys(effect).filter(key => specialStateKeys.has(key)).map(key => [key, true])) })
  },
  'grant-immunity': {
    validate: effect => !Array.isArray(effect.conditions) || !effect.conditions.length || !effect.conditions.every(isText) ? 'grant-immunity exige conditions (liste de textes).' : null,
    needs: effect => Array.isArray(effect.conditions) && effect.conditions.length ? [] : [need('contract.effects.conditions', 'Conditions sourcées requises')],
    buildLayer: effect => ({ immunities: { conditions: [...effect.conditions] } })
  },
  // Bonus au jet de gravité des Blessures Critiques infligées par le porteur de la couche (attaque, défense, second critique) ;
  // lu par resolution.js, qui ne regarde que les couches de celui qui inflige le critique.
  'critical-severity-bonus': {
    validate: effect => Number.isFinite(effect.amount) ? null : 'critical-severity-bonus exige amount (nombre).',
    needs: effect => Number.isFinite(effect.amount) ? [] : [need('contract.effects.amount', 'Bonus de gravité sourcé requis')],
    buildLayer: effect => ({ criticalSeverityBonus: effect.amount })
  },
  // Pénalité divine au Test d'Incantation d'un sort visant un porteur de la couche ; lu par v5-spell-contracts.js.
  'casting-penalty': {
    validate: effect => Number.isSafeInteger(effect.amount) && effect.amount > 0 ? null : 'casting-penalty exige amount (entier positif).',
    needs: effect => Number.isSafeInteger(effect.amount) && effect.amount > 0 ? [] : [need('contract.effects.amount', 'Pénalité d’incantation sourcée requise')],
    buildLayer: effect => ({ castingSlPenalty: effect.amount })
  },
  // Dissuasion d’attaque (ex. Bénédiction de Protection) : un ennemi qui vise le porteur doit réussir un Test (`skill`, +`slBonus` DR) ;
  // le MJ saisit le résultat dans `v5.context.protectionCalm`, lu par resolution.js au moment de l’attaque.
  'attack-deterrent': {
    validate: effect => isText(effect.skill) && Number.isSafeInteger(effect.slBonus) ? null : 'attack-deterrent exige skill (texte non vide) et slBonus (entier).',
    needs: effect => isText(effect.skill) && Number.isSafeInteger(effect.slBonus) ? [] : [need('contract.effects.skill', 'Test de dissuasion sourcé requis')],
    buildLayer: effect => ({ attackDeterrent: { skill: effect.skill, slBonus: effect.slBonus } })
  },
  'grant-actions': {
    validate: effect => !Array.isArray(effect.actions) || !effect.actions.length
      || !effect.actions.every(action => isRecord(action) && isText(action.id) && isText(action.name) && isText(action.damageFormula)) ? 'grant-actions exige actions [{id, name, damageFormula}].' : null,
    needs: effect => Array.isArray(effect.actions) && effect.actions.length ? [] : [need('contract.effects.actions', 'Actions sourcées requises')],
    buildLayer: effect => ({ grantedActions: effect.actions.map(action => ({ id: action.id, note: action.name, type: 'attack', attr: action.attr || 'CC',
      damageFormula: action.damageFormula, qualities: clone(action.qualities || []), extensions: { v5: { kind: 'melee', materialized: true } } })) })
  },
  'grant-talent': {
    validate(effect) {
      if (!Array.isArray(effect.talents) || !effect.talents.length
        || !effect.talents.every(row => isRecord(row) && isText(row.id) && Number.isSafeInteger(row.rank ?? 1) && (row.rank ?? 1) >= 1)) return 'grant-talent exige talents [{id, rank}].';
      if (effect.consumeOn !== undefined && effect.consumeOn !== 'critical') return 'grant-talent : consumeOn ne peut valoir que critical.';
      return effect.specializationFrom !== undefined && effect.specializationFrom !== 'input' ? 'grant-talent : specializationFrom ne peut valoir que input.' : null;
    },
    needs(effect, { input } = {}) {
      if (!Array.isArray(effect.talents) || !effect.talents.length) return [need('contract.effects.talents', 'Talents sourcés requis')];
      if (effect.specializationFrom !== 'input') return [];
      const text = cleanSpecialization(input?.talent?.specialization);
      if (!text) return [need('talent.specialization', SPECIALIZATION_LABEL)];
      return text.length > SPECIALIZATION_MAX ? [need('talent.specialization', `${SPECIALIZATION_LABEL} : ${SPECIALIZATION_MAX} caractères au plus`)] : [];
    },
    // Spécialisation saisie au lancement : figée ici (aperçu), l'application ne relit plus la saisie.
    resolve(effect, { input } = {}) {
      if (effect.specializationFrom !== 'input') return effect;
      const missing = handlers['grant-talent'].needs(effect, { input });
      if (missing.length) return { error: missing.map(row => row.label).join(' ; '), needs: missing };
      const specialization = cleanSpecialization(input.talent.specialization);
      const { specializationFrom, ...resolved } = effect;
      return { ...resolved, talents: effect.talents.map(row => ({ ...row, specialization })) };
    },
    inputFields: effect => effect.specializationFrom === 'input' ? [{ path: 'talent.specialization', label: SPECIALIZATION_LABEL, kind: 'text', scope: 'effect' }] : [],
    // `consumeOn: 'critical'` : la couche prend fin au prochain Coup Critique infligé par son porteur (voir consumeDivineLayers).
    buildLayer: effect => ({ grantedTalents: effect.talents.map(row => ({ id: row.id, rank: row.rank ?? 1, ...(row.name ? { name: row.name } : {}), ...(row.specialization ? { specialization: row.specialization } : {}) })),
      ...(effect.consumeOn ? { consumeOn: effect.consumeOn } : {}) })
  },
  'weapon-bonus': {
    validate(effect) {
      if (effect.damage !== undefined && !Number.isFinite(effect.damage)) return 'weapon-bonus : damage doit être un nombre.';
      if (effect.replaceDamageBonus !== undefined && !Number.isFinite(effect.replaceDamageBonus)) return 'weapon-bonus : replaceDamageBonus doit être un nombre.';
      if (effect.damageFrom !== undefined && !isText(effect.damageFrom)) return 'weapon-bonus : damageFrom doit nommer une caractéristique.';
      for (const key of ['qualities', 'hitConditions']) if (effect[key] !== undefined && (!Array.isArray(effect[key]) || !effect[key].every(isText))) return `weapon-bonus : ${key} doit être une liste de textes.`;
      return ['magical', 'qualities', 'hitConditions', 'damage', 'damageFrom', 'replaceDamageBonus', 'damageFormula', 'value'].some(key => effect[key] !== undefined) ? null : 'weapon-bonus exige au moins un bonus.';
    },
    // Contrôle souple (A10) : l'arme désignée est demandée, sa classe (marteau, hache…) n'est jamais vérifiée ni bloquante.
    needs: (effect, { input } = {}) => effect.designatedWeapon === true && !isText(weaponFacts(input)?.equipmentId)
      ? [need('facts.weapon.equipmentId', `${effect.weaponOwner === 'target' ? 'Arme maniée par la cible' : 'Arme maniée par le prêtre'}${effect.weaponClass ? ` (${effect.weaponClass})` : ''}`)] : [],
    buildLayer: (effect, { contract }) => ({ weaponBonus: {
      spellName: contract?.name,
      ...(effect.magical === true ? { magical: true } : {}),
      ...(Number.isFinite(effect.damage) ? { damage: effect.damage } : {}),
      ...(Number.isFinite(effect.replaceDamageBonus) ? { replaceDamageBonus: effect.replaceDamageBonus } : {}),
      ...(effect.damageFormula ? { damageFormula: effect.damageFormula } : {}),
      ...(effect.qualities?.length ? { qualities: [...effect.qualities] } : {}),
      ...(effect.hitConditions?.length ? { hitConditions: [...effect.hitConditions] } : {}),
      ...(effect.onWoundsOnly === true ? { onWoundsOnly: true } : {}),
      ...(effect.unarmedOnly === true ? { unarmedOnly: true } : {}),
      ...(effect.ranged === true ? { ranged: true } : {}),
      ...(effect.weaponClass ? { weaponClass: effect.weaponClass } : {})
    }, ...(Number.isFinite(effect.value) ? { weaponDamageProgression: effect.value } : {}) }),
    // Bonus dépendant du prêtre ou de la désignation : résolu à l'application, écrit sur la couche vivante.
    applyInstant(participant, effect, { layer, input }) {
      const live = liveLayer(participant, layer);
      if (!live?.weaponBonus) return null;
      const result = {};
      const fromCharacteristic = effect.damageFrom ? characteristicBonus(participant, effect.damageFrom) : 0;
      const progression = Number.isFinite(live.weaponDamageProgression) ? live.weaponDamageProgression : 0;
      if (fromCharacteristic === null) throw Object.assign(new Error(`Caractéristique ${effect.damageFrom} inconnue pour le bonus d’arme.`), { code: 'DIVINE_WEAPON_BONUS' });
      if (effect.damageFrom || progression) {
        live.weaponBonus.damage = (live.weaponBonus.damage || 0) + fromCharacteristic + progression;
        result.damage = live.weaponBonus.damage;
      }
      delete live.weaponDamageProgression;
      if (effect.designatedWeapon === true) {
        const weapon = weaponFacts(input);
        live.weaponBonus.equipmentId = weapon.equipmentId;
        live.weaponBonus.classConfirmed = weapon.classConfirmed === true;
        result.equipmentId = weapon.equipmentId;
        result.classConfirmed = live.weaponBonus.classConfirmed;
      }
      return result;
    },
    receipt: (effect, { targetId }, result) => result ? { targetId, type: effect.type, result: clone(result) } : null
  }
};
export default handlers;

/**
 * Projection dérivée des couches divines vers la fiche : Traits (temporaryTraits et alias `traits`), bonus d'arme, actions
 * matérialisées et Talents réellement injectés. Idempotente ; sans couche divine concernée, ne touche à rien.
 */
export function projectDivineGear(next) {
  const v5 = next?.extensions?.v5;
  if (!v5) return next;
  const layers = (Array.isArray(v5.divineEffects) ? v5.divineEffects : []).filter(isRecord);
  projectTraits(next, v5, layers);
  projectWeaponBonuses(v5, layers);
  projectActions(next, layers);
  projectTalents(next, layers);
  return next;
}

/**
 * Couches divines consommées par un événement (`consumeOn`, ex. Sauvagerie au Coup Critique infligé). Renvoie une copie du participant
 * sans ces couches, ou null s'il n'en porte aucune ; l'appelant recalcule ensuite les valeurs effectives (refreshEffectLayers).
 */
export function consumeDivineLayers(participant, event) {
  const layers = participant?.extensions?.v5?.divineEffects;
  if (!Array.isArray(layers) || !layers.some(layer => layer?.consumeOn === event)) return null;
  const next = clone(participant);
  next.extensions.v5.divineEffects = next.extensions.v5.divineEffects.filter(layer => layer?.consumeOn !== event);
  return next;
}

function projectTraits(next, v5, layers) {
  const wanted = [...new Set(layers.flatMap(layer => Array.isArray(layer.traits) ? layer.traits.filter(isText) : []))];
  const previous = Array.isArray(v5.divineTraits) ? v5.divineTraits : [];
  if (!wanted.length && !previous.length) return;
  if (!Array.isArray(v5.baseTraits)) v5.baseTraits = Array.isArray(next.traits) ? [...next.traits] : Array.isArray(next.extensions?.traits) ? [...next.extensions.traits] : [];
  const others = new Set([...(v5.spellEffects || []).flatMap(effect => effect?.traits || []), ...(v5.miscastEffects || []).flatMap(effect => effect?.traitsGained || [])]);
  const kept = (Array.isArray(v5.temporaryTraits) ? v5.temporaryTraits : []).filter(trait => !previous.includes(trait) || others.has(trait));
  v5.temporaryTraits = [...new Set([...kept, ...wanted])];
  next.traits = [...new Set([...v5.baseTraits, ...v5.temporaryTraits])].filter(isText);
  if (wanted.length) v5.divineTraits = wanted; else delete v5.divineTraits;
}

function projectWeaponBonuses(v5, layers) {
  const own = layers.filter(layer => isRecord(layer.weaponBonus));
  const rows = Array.isArray(v5.weaponBonuses) ? v5.weaponBonuses : [];
  if (!own.length && !rows.some(row => row?.divineEffectId)) return;
  const ids = new Set(layers.map(layer => layer.id));
  const kept = rows.filter(row => !row?.divineEffectId && !ids.has(row?.effectId));
  const bonuses = [...kept, ...own.map(layer => ({ effectId: layer.id, divineEffectId: layer.id, ...clone(layer.weaponBonus) }))];
  if (bonuses.length) v5.weaponBonuses = bonuses; else delete v5.weaponBonuses;
}

// « BF+3 » -> 3 : la formule d'une action de Force garde son bonus fixe dans `damage` (voir damage.js).
const damageBonusOf = formula => Number(String(formula).match(/^BF\s*([+-]\s*\d+)?$/i)?.[1]?.replace(/\s+/g, '') || 0);

function projectActions(next, layers) {
  const wanted = layers.flatMap(layer => (Array.isArray(layer.grantedActions) ? layer.grantedActions : []).map(action => ({ ...clone(action), id: `divine-action:${layer.id}:${action.id}`,
    extensions: { ...action.extensions, v5: { ...action.extensions?.v5, divineEffectId: layer.id } } })));
  const actions = Array.isArray(next.actions) ? next.actions : [];
  const ids = new Set(wanted.map(action => action.id));
  const stale = actions.some(action => action?.extensions?.v5?.divineEffectId && !ids.has(action.id));
  if (!wanted.length && !stale) return;
  const base = Number((next.extensions.v5.baseCaracs || next.baseCaracs)?.CC ?? next.caracs?.CC);
  const present = new Set(actions.map(action => action?.id));
  next.actions = [...actions.filter(action => !action?.extensions?.v5?.divineEffectId || ids.has(action.id)),
    ...wanted.filter(action => !present.has(action.id)).map(action => ({ ...action, base: Number.isFinite(base) ? base : 0, mod: 0, damage: damageBonusOf(action.damageFormula) }))];
}

// Talents injectés : seulement la liste blanche à contrat mécanique, rattachés à leur couche pour partir avec elle.
function projectTalents(next, layers) {
  const wanted = layers.flatMap(layer => (Array.isArray(layer.grantedTalents) ? layer.grantedTalents : [])
    .filter(row => injectableTalentIds.has(row.id)).map(row => ({ layerId: layer.id, ...row })));
  const talents = Array.isArray(next.talents) ? next.talents : [];
  const marked = row => typeof row?.divineEffectId === 'string';
  if (!wanted.length && !talents.some(marked)) return;
  const kept = talents.filter(row => !marked(row));
  const injected = wanted
    .filter(row => !kept.some(own => own?.status === 'resolved' && own.id === row.id && Number(own.rank) >= row.rank && (own.specialization || own.specialty || null) === (row.specialization || null)))
    .map(row => ({ id: row.id, name: row.name || row.id, status: 'resolved', rank: row.rank, ...(row.specialization ? { specialization: row.specialization } : {}), divineEffectId: row.layerId, temporary: true }));
  next.talents = [...kept, ...injected];
}
