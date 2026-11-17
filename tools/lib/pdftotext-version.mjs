/**
 * Choix du pdftotext des générateurs du bestiaire. Les fichiers publiés de js/data/bestiary/ viennent de la version 4.00
 * (Git for Windows) ; Poppler 25.x ordonne autrement les fiches d'une même page et perd des compétences.
 * Ordre : variable d'environnement PDFTOTEXT, sinon le pdftotext de Git s'il existe, sinon celui du PATH. Toujours contrôlé : 4.00 exigée.
 */
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const PDFTOTEXT_ATTENDU = '4.00';
export const PDFTOTEXT_GIT = 'C:/Program Files/Git/mingw64/bin/pdftotext.exe';

/** « pdftotext version 4.00 » -> '4.00' ; null si la sortie n'est pas reconnue. */
export function parsePdftotextVersion(texte) {
  const m = /pdftotext version\s+(\S+)/i.exec(String(texte ?? ''));
  return m ? m[1] : null;
}

const lireVersion = (chemin, runner) => {
  const r = runner(chemin, ['-v'], { encoding: 'utf8', windowsHide: true });
  return r.error ? undefined : parsePdftotextVersion(`${r.stderr ?? ''}\n${r.stdout ?? ''}`);
};

/** { ok, path, version } ou { ok: false, raison: 'absent' | 'version', message }. */
export function resolvePdftotext({ env = process.env, exists = existsSync, runner = spawnSync } = {}) {
  const candidat = env.PDFTOTEXT || (exists(PDFTOTEXT_GIT) ? PDFTOTEXT_GIT : 'pdftotext');
  const version = lireVersion(candidat, runner);
  if (version === undefined) return { ok: false, raison: 'absent', message: `pdftotext introuvable (${candidat}). Installer Git for Windows (pdftotext ${PDFTOTEXT_ATTENDU}) ou renseigner la variable PDFTOTEXT.` };
  if (version !== PDFTOTEXT_ATTENDU) {
    return { ok: false, raison: 'version', message: `pdftotext ${version ?? 'de version inconnue'} (${candidat}) : la version ${PDFTOTEXT_ATTENDU} est exigée, celle qui a produit les fichiers publiés (Git : ${PDFTOTEXT_GIT}). Renseigner la variable PDFTOTEXT avec son chemin.` };
  }
  return { ok: true, path: candidat, version };
}

let memo = null;
/** Chemin du pdftotext 4.00 ; arrête le processus avec un message clair sinon. */
export function pdftotextPath() {
  memo ??= resolvePdftotext();
  if (!memo.ok) { console.error(memo.message); process.exit(1); }
  return memo.path;
}

/** Lance pdftotext (4.00) et rend la sortie standard (Buffer). */
export const runPdftotext = (args, options) => execFileSync(pdftotextPath(), args, options);
