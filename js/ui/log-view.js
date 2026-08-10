import { DOM } from './dom.js';

export function renderLog(Store) {
  const arr = Store.getLog();
  const frag = document.createDocumentFragment();
  arr.forEach(line => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.textContent = line;
    frag.append(div);
  });
  DOM.combat.log.replaceChildren(frag);
}
