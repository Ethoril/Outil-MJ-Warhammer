/**
 * Entrée « Jeu » du menu de l'application (chapeau multi-jeux, lot L2).
 * Le groupe est masqué (attribut `hidden` dans index.html) tant qu'un seul jeu est publié : il ne s'affiche
 * que s'il y a un autre jeu où aller. Le jeu courant est marqué, les autres sont des boutons qui ouvrent leur page.
 */
import { jeuxPublies, jeuDeLaPage, adresseDuJeu } from '../core/jeux.js';

export function initSelecteurJeu({ doc = globalThis.document, adresse = globalThis.location?.href, aller = url => globalThis.location.assign(url) } = {}) {
  const groupe = doc?.getElementById('app-menu-jeux');
  const liste = doc?.getElementById('app-menu-jeux-liste');
  if (!groupe || !liste) return { visible: false };
  const jeux = jeuxPublies();
  if (jeux.length < 2) {
    groupe.hidden = true;
    liste.replaceChildren();
    return { visible: false };
  }
  const courant = jeuDeLaPage(adresse);
  liste.replaceChildren(...jeux.map(jeu => {
    const bouton = doc.createElement('button');
    bouton.type = 'button';
    bouton.dataset.jeu = jeu.id;
    const actuel = jeu.id === courant?.id;
    bouton.textContent = actuel ? `${jeu.nom} ✓` : jeu.nom;
    if (actuel) bouton.setAttribute('aria-current', 'true');
    else bouton.addEventListener('click', () => {
      const cible = adresseDuJeu(jeu.id, adresse);
      if (cible) aller(cible);
    });
    return bouton;
  }));
  groupe.hidden = false;
  return { visible: true };
}
