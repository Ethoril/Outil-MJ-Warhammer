/**
 * Rattachement des blocs extraits aux références de l'inventaire (E0-P). Complément L18-L26 : par clé de bloc. Livres de l'inventaire initial :
 * page par page, d'abord le nom de l'inventaire retrouvé dans la zone du titre (le plus long d'abord), puis le reste dans l'ordre.
 */
const norm = text => String(text).toUpperCase().replace(/[’'`]/g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Retourne { byKey: Map(clé de bloc → entrée d'inventaire), missing: entrées sans bloc, extra: blocs sans entrée }. */
export function assignInventoryIds(blocks, inventoryProfiles) {
  const byKey = new Map();
  const missing = [];
  const extra = [];
  const added = inventoryProfiles.filter(entry => entry.blockKey);
  for (const entry of added) {
    if (blocks.some(block => block.key === entry.blockKey)) byKey.set(entry.blockKey, entry); else missing.push(entry);
  }
  const base = inventoryProfiles.filter(entry => !entry.blockKey);
  const pages = new Set(base.map(entry => `${entry.book}:${entry.physicalPage}`));
  for (const pageKey of pages) {
    const [book, page] = pageKey.split(':');
    const entries = base.filter(entry => entry.book === book && entry.physicalPage === Number(page));
    const here = blocks.filter(block => block.book === book && block.physicalPage === Number(page) && !byKey.has(block.key));
    const takenEntry = new Set();
    const takenBlock = new Set();
    const pairs = [];
    for (const entry of entries) for (const block of here) {
      const name = norm(entry.name.split(/[—–-]{1,2}/)[0]);
      const zone = norm(`${block.title || ''} ${block.zone || ''}`);
      if (name && ` ${zone} `.includes(` ${name} `)) pairs.push({ entry, block, length: name.length, near: zone.lastIndexOf(name) });
    }
    pairs.sort((a, b) => b.length - a.length || b.near - a.near);
    for (const { entry, block } of pairs) {
      if (takenEntry.has(entry) || takenBlock.has(block)) continue;
      takenEntry.add(entry); takenBlock.add(block); byKey.set(block.key, entry);
    }
    const restEntries = entries.filter(entry => !takenEntry.has(entry));
    const restBlocks = here.filter(block => !takenBlock.has(block));
    restEntries.forEach((entry, index) => { if (restBlocks[index]) byKey.set(restBlocks[index].key, entry); else missing.push(entry); });
    extra.push(...restBlocks.slice(restEntries.length));
  }
  for (const block of blocks) if (!byKey.has(block.key) && !extra.includes(block)) extra.push(block);
  return { byKey, missing, extra };
}
