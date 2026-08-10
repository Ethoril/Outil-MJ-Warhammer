export const uid = () => Math.random().toString(36).slice(2, 10);

export class Profile {
  constructor({ id = uid(), name, kind = 'Créature', initiative = 30, hp = 10, caracs = {}, armor = { head: 0, body: 0, arms: 0, legs: 0 }, diceLines = [], group = '' } = {}) {
    this.id = id;
    this.name = (name || 'Sans-nom').trim();
    this.kind = kind;
    this.initiative = Number(initiative) || 0;
    this.hp = Number(hp) || 0;
    this.caracs = { ...caracs };
    this.armor = { ...armor };
    this.diceLines = [...(diceLines || [])];
    this.group = (group || '').trim();
  }
}

export class Participant {
  constructor({ id = uid(), profileId, name, kind, initiative = 0, hp = 10, maxHp, states = [], zone = 'bench', color = 'default', armor = { head: 0, body: 0, arms: 0, legs: 0 }, caracs = {} } = {}) {
    this.id = id;
    this.profileId = profileId || null;
    this.name = name || '—';
    this.kind = kind || 'Créature';
    this.initiative = Number(initiative) || 0;
    this.hp = Number(hp) || 0;
    this.maxHp = maxHp !== undefined ? Number(maxHp) : Number(hp) || 0;
    this.states = [...states];
    this.zone = zone;
    this.color = color;
    this.armor = { ...armor };
    this.caracs = { ...caracs };
  }
}

export class DiceLine {
  constructor({ id = uid(), participantId = '', attr = 'Custom', base = '', mod = 0, note = '', damage = 0, targetId = null, qualities = [] } = {}) {
    this.id = id;
    this.participantId = participantId;
    this.attr = attr;
    this.base = base;
    this.mod = Number(mod) || 0;
    this.note = note;
    this.damage = Number(damage) || 0;
    this.targetId = targetId || null;
    this.qualities = Array.isArray(qualities) ? qualities : [];
  }
}

export function groupProfiles(profiles) {
  const groups = new Map();
  const ungrouped = [];
  profiles.forEach(p => {
    if (p.group) {
      if (!groups.has(p.group)) groups.set(p.group, []);
      groups.get(p.group).push(p);
    } else {
      ungrouped.push(p);
    }
  });
  return { groups, ungrouped };
}
