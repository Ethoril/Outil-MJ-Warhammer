/** Tolérances lexicales uniquement : aucune suppression de Bonus, unité, multiplicateur ou maximum. */
export function normalizeCatalogueParameter(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[’']/g,' ').replace(/[()]/g,' ').replace(/½/g,'moitie ')
  .replace(/\bvolonte\b/g,'force mentale').replace(/\bfm\b/g,'force mentale')
  .replace(/\bsoc\.?\b|\bcharisme\b/g,'sociabilite').replace(/\bint\.?\b/g,'intelligence')
  .replace(/\bzone d effet\b|\bzone\b/g,'zde').replace(/\bdemi\b/g,'moitie')
  .replace(/initiative\s*[÷/]\s*2/g,'moitie initiative').replace(/force mentale\s*[÷/]\s*2/g,'moitie force mentale')
  .replace(/\btoucher\b/g,'contact').replace(/\binstantanee?\b|\binstant\b/g,'instantane')
  .replace(/\bspeciale\b/g,'special').replace(/\bmax\b/g,'maximum').replace(/\bmilles\b/g,'miles')
  .replace(/\b(?:de|du|la|le|l|d|en)\b/g,' ').replace(/\b1 cible\b/g,'1')
  .replace(/\s+/g,' ').trim();
}
