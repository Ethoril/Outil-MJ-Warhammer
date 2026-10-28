// Generated from fiches/tools/refresh-equipment-catalog.mjs. Regenerate; do not edit.
const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().trim();
const slug = value => fold(value).replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');

export function buildEquipmentRows(tables) {
 const sheet=name=>{const table=tables[name];if(!table)throw new Error('Source absente : '+name);const [headers,...rows]=table;return rows.filter(row=>row[headers.indexOf('Nom')]?.trim()).map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]?.trim()||'']).filter(([key])=>key))) };
const keywordRows = sheet('Mots Clés Armes et Armures');
const keywords = keywordRows.map(row => ({ id: row.Identifiant, name: row.Nom, effect: row.Effet, type: row.Type,
    parameter: row['Paramètre'], source: row.Source, edition: row['Version retenue'],
    aliases: [row['Nom EN'], ...row['Anciens noms'].split(',').map(value => value.trim())].filter(Boolean), note: row.Remarque }));
function parseKeywords(text) {
    const clean = String(text || '').normalize('NFC').trim();
    const folded = fold(clean);
    const result = [];
    for (const entry of keywords) {
        const names = [entry.name, ...entry.aliases].map(name => fold(name).replace(/\s+(?:x|\d+)$/u, '')).filter(Boolean);
        const params = [];
        let asterisk = false;
        let matched = false;
        for (const name of names) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
            const regex = new RegExp(`(?:^|[,;]|\\bou\\s)\\s*${escaped}(?=$|[\\s.(,;])\\s*([+-]?\\d+|\\([^)]*\\))?(\\*)?`, 'gu');
            for (const match of folded.matchAll(regex)) {
                if (entry.id === 'inflige') {
                    const prefix = folded.slice(0, match.index + match[0].length);
                    const specialStart = prefix.lastIndexOf('special (');
                    if (specialStart >= 0 && prefix.lastIndexOf(')') < specialStart) continue;
                }
                matched = true;
                asterisk ||= Boolean(match[2]);
                if (entry.parameter && match[1]) {
                    const start = match.index + match[0].length - (match[2] ? 1 : 0) - match[1].length;
                    const rawParam = clean.slice(start, start + match[1].length).replace(/^\(|\)$/gu, '').trim();
                    if (rawParam && !params.includes(rawParam)) params.push(rawParam);
                }
            }
            if (matched) break;
        }
        if (matched) result.push({ id: entry.id, parameter: entry.parameter ? params.join(', ') : '', ...(asterisk ? { asterisk: true } : {}) });
    }
    return result;
}
const rangeCorrections = {
    'Lasso': ['BF × 2', 'Livre de base V5 EN, p. 303'],
    'Lasso (2M)': ['BF × 2', 'Livre de base V5 EN, p. 303'],
    'Filet': ['BF', 'Livre de base V5 EN, p. 303'],
    'Bombe': ['BF', 'Livre de base V5 EN, p. 303'],
    'Bombe incendiaire': ['BF', 'Livre de base V5 EN, p. 303'],
    'Bolas': ['BF × 3', 'Livre de base V5 EN, p. 303'],
    'Couteau de lancer': ['BF × 2', 'Livre de base V5 EN, p. 303'],
    'Fléchette': ['BF × 2', 'Livre de base FR (V4), p. 295 (conservé en V5)'],
    'Hache de lancer': ['BF × 2', 'Livre de base V5 EN, p. 303'],
    'Javelot': ['BF × 3', 'Livre de base V5 EN, p. 303'],
    'Rocher': ['BF × 3', 'Livre de base V5 EN, p. 303'],
    'Javelot Blackbriar elfe sylvain': ['BF × 3', 'Archives of the Empire Volume I, p. 93'],
    'Bombe Cinderblast': ['BF', 'Dwarf Player’s Guide, p. 92'],
    'Fléchettes (lot de 12) Homme Lézard': ['Comme la sarbacane', 'Lustria, tableau Lizardman Ammunition'],
};
const locations = text => {
    const result = [];
    const value = fold(text);
    if (value.includes('toutes')) return ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];
    if (value.includes('tete')) result.push('head');
    if (value.includes('corps')) result.push('body');
    if (value.includes('bras') || value.includes('mains')) result.push('rightArm', 'leftArm');
    if (value.includes('jamb')) result.push('rightLeg', 'leftLeg');
    return result;
};
const items = [];
const identities = new Map();
for (const [name, defaultKind] of [['Armes Corps à Corps', 'weapon'], ['Armes à Distance', 'weapon'], ['Armures', 'armour']]) {
    for (const row of sheet(name)) {
        const category = row['Catégorie'];
        const words = parseKeywords(row['Atouts et Défauts'] || row['Atouts et Défauts (et Pénalités)']);
        let kind = defaultKind;
        if (fold(category).includes('bouclier')) kind = 'shield';
        if (/fléchettes \(lot|flèche |flèches |carreau|munition|balle.*poudre/iu.test(row.Nom)) kind = 'ammunition';
        let damage = (row['Dégâts'] || '').replace(/^=\s*/u, '').replace(/^\+\s*(?=BF)/iu, '').trim();
        let reach = row.Allonge || '';
        let range = row['Portée'] || '';
        let source = `Aides de jeu : ${name} / ${category} / ${row.Nom}`;
        if (!range && name === 'Armes à Distance' && rangeCorrections[row.Nom]) { // corrections de portée : armes à distance seulement (le Filet de mêlée n'a pas de portée)
            [range] = rangeCorrections[row.Nom]; source += ` ; portée : ${rangeCorrections[row.Nom][1]}`; }
        let ap = defaultKind === 'armour' ? Number((row["Valeur d'Armure (PA)"] || '').match(/\d+/u)?.[0] ?? NaN) : NaN;
        if (kind === 'shield') {
            if (!Number.isFinite(ap)) ap = Number(words.find(word => word.id === 'protectrice')?.parameter || reach.match(/\d+/u)?.[0] || NaN);
            const rawNotes = row['Atouts et Défauts'] || row['Atouts et Défauts (et Pénalités)'] || '';
            // Un bouclier V5 non posé compte en attaque comme une Arme improvisée d'allonge Personnelle (L06 p.306).
            if (!/BF/iu.test(damage)) {
                const isPlantedPavise = /posé au sol/iu.test(rawNotes);
                const hasShieldQuality = words.some(word => ['bouclier', 'protectrice'].includes(word.id)) && !isPlantedPavise;
                damage = hasShieldQuality ? 'BF + 1' : ''; reach = hasShieldQuality ? 'Personnelle' : '';
                if (hasShieldQuality) source += ' ; usage offensif : Arme improvisée (Livre de base V5 EN p.306)';
            }
        }
        const identity = `${kind}-${slug(name)}-${slug(category)}-${slug(row.Nom)}`;
        const occurrence = identities.get(identity) || 0;
        identities.set(identity, occurrence + 1);
        const id = identity + (occurrence ? `-${occurrence + 1}` : '');
        const layer = kind !== 'armour' ? 'none' : /^cuir souple/iu.test(category) ? 'leather'
            : /^\s*=*\s*\+/u.test(row["Valeur d'Armure (PA)"]) ? 'bonus' : words.some(word => word.id === 'flexible') ? 'flexible' : 'rigid';
        items.push({ id, baseId: id, catalogVersion: '', kind, name: row.Nom, category, damage, reach, range,
            ap: Number.isFinite(ap) ? ap : null, locations: locations(row['Zones Couvertes'] || ''), layer, keywords: words,
            notes: row['Atouts et Défauts'] || row['Atouts et Défauts (et Pénalités)'] || '', source, custom: false });
    }
}
// Munitions standard absentes des aides de jeu (Livre de base V5 EN p.302).
const ammunitionSource = 'Livre de base V5 EN p.302, tableau Munitions (complément absent des aides de jeu)';
const standardAmmunition = [
    ['Flèches (12)', 'Arc', '+0', 'Comme l’arc', ['empaleuse'], 'Empaleuse'],
    ['Flèches elfiques (12)', 'Arc', '+0', 'Comme l’arc + 10', ['empaleuse'], 'Empaleuse'],
    ['Carreaux (12)', 'Arbalète', '+0', 'Comme l’arbalète', ['empaleuse'], 'Empaleuse'],
    ['Balles de plomb (12)', 'Fronde', '+1', 'Comme la fronde − 10', ['assommante'], 'Assommante'],
    ['Pierres (12)', 'Fronde', '+0', 'Comme la fronde', ['assommante'], 'Assommante'],
    ['Balles et poudre (12)', 'Poudre Noire', '+0', 'Comme l’arme', ['empaleuse', 'perforante'], 'Empaleuse, Perforante'],
    ['Grenaille et poudre (12)', 'Poudre Noire', '+0', 'Comme l’arme', [{ id: 'explosion', parameter: '+1' }], 'Explosion +1'],
    ['Munitions improvisées et poudre', 'Poudre Noire', '-1', 'Moitié de la portée de l’arme', [], ''],
];
for (const [name, category, damage, range, words, notes] of standardAmmunition) {
    const id = `ammunition-livre-de-base-${slug(category)}-${slug(name)}`;
    items.push({ id, baseId: id, catalogVersion: '', kind: 'ammunition', name, category, damage, reach: '', range, ap: null, locations: [], layer: 'none',
        keywords: words.map(word => typeof word === 'string' ? { id: word, parameter: '' } : word), notes, source: ammunitionSource, custom: false });
}
if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Identifiants d’équipement en doublon');

return {items,keywords};
}
