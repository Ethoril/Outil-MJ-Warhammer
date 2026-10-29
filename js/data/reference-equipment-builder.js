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
    const result = [];
    text = String(text || '').normalize('NFC');
    const parts = [];
    let start = 0, depth = 0;
    for (let i = 0; i < text.length; i += 1) {
        if (text[i] === '(') depth += 1;
        else if (text[i] === ')') depth = Math.max(0, depth - 1);
        else if (!depth && /[,;]/u.test(text[i])) { parts.push(text.slice(start, i)); start = i + 1; }
        else if (!depth && /^\s+ou\s+/iu.test(text.slice(i))) {
            const separator = text.slice(i).match(/^\s+ou\s+/iu)[0];
            parts.push(text.slice(start, i)); i += separator.length - 1; start = i + 1;
        }
    }
    parts.push(text.slice(start));
    for (const entry of keywords) {
        const names = [entry.name, ...entry.aliases].map(name => fold(name).replace(/\s+(?:x|\d+)$/u, '')).filter(Boolean);
        for (const name of names) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
            const pattern = new RegExp(`^\\s*(?:ou\\s+)?${escaped}(?=$|[\\s.(])\\s*([+-]?\\d+|\\([^)]*\\))?`, 'u');
            const matches = parts.map(value => value.trim()).map(part => ({ part, asterisk: part.includes('*'), match: fold(part.replaceAll('*', '')).match(pattern) })).filter(value => value.match);
            if (matches.length) {
                const parameters = matches.map(({ part, match }) => {
                    if (!entry.parameter || !match[1]) return '';
                    const start = match.index + match[0].lastIndexOf(match[1]);
                    return part.slice(start, start + match[1].length).replace(/^\(|\)$/gu, '');
                }).filter(Boolean);
                result.push({ id: entry.id, parameter: [...new Set(parameters)].join(' ; '), ...(matches.some(({ asterisk }) => asterisk) ? { asterisk: true } : {}) }); break;
            }
        }
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
const standardAmmunitionKeys = new Set(['arc-fleches-12', 'arc-fleches-elfiques-12', 'arbalete-carreaux-12', 'fronde-balles-de-plomb-12',
    'fronde-pierres-12', 'poudre-noire-balles-et-poudre-12', 'poudre-noire-grenaille-et-poudre-12', 'poudre-noire-munitions-improvisees-et-poudre']);
const foundAmmunition = new Set();
for (const [name, defaultKind] of [['Armes Corps à Corps', 'weapon'], ['Armes à Distance', 'weapon'], ['Armures', 'armour']]) {
    for (const row of sheet(name)) {
        const category = row['Catégorie'];
        const words = parseKeywords(row['Atouts et Défauts'] || row['Atouts et Défauts (et Pénalités)']);
        let kind = defaultKind;
        if (fold(category).includes('bouclier')) kind = 'shield';
        if (/fléchettes \(lot|flèche |flèches |carreau|munition|balle.*poudre/iu.test(row.Nom)) kind = 'ammunition';
        const standardKey = name === 'Armes à Distance' ? `${slug(category)}-${slug(row.Nom)}` : null;
        if (standardAmmunitionKeys.has(standardKey)) kind = 'ammunition';
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
        // Munitions du Livre de base : identifiant historique stable (référencé par l'Outil MJ).
        const id = standardAmmunitionKeys.has(standardKey) ? `ammunition-livre-de-base-${standardKey}` : identity + (occurrence ? `-${occurrence + 1}` : '');
        if (standardAmmunitionKeys.has(standardKey)) foundAmmunition.add(standardKey);
        const layer = kind !== 'armour' ? 'none' : /^cuir souple/iu.test(category) ? 'leather'
            : /^\s*=*\s*\+/u.test(row["Valeur d'Armure (PA)"]) ? 'bonus' : words.some(word => word.id === 'flexible') ? 'flexible' : 'rigid';
        const notes = row['Atouts et Défauts'] || row['Atouts et Défauts (et Pénalités)'] || '';
        items.push({ id, baseId: id, catalogVersion: '', kind, name: row.Nom, category, damage, reach, range,
            ap: Number.isFinite(ap) ? ap : null, locations: locations(row['Zones Couvertes'] || ''), layer, keywords: words,
            notes: kind === 'shield' && words.some(word => word.id === 'bouclier') ? `${notes} ; en attaque : arme improvisée (Inoffensive, Déséquilibrée).` : notes, source, custom: false });
    }
}
// Les munitions du Livre de base (V5 EN p.302) sont désormais dans l'onglet Armes à Distance (MJ, 28/10) :
// la feuille fait foi, aucune ligne n'est plus ajoutée par ce script.
const missingAmmunition = [...standardAmmunitionKeys].filter(key => !foundAmmunition.has(key));
if (missingAmmunition.length) throw new Error(`Munitions du Livre de base absentes de la feuille : ${missingAmmunition.join(', ')}`);
if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Identifiants d’équipement en doublon');

return {items,keywords};
}
