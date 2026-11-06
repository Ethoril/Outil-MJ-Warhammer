#!/usr/bin/env node
/**
 * U8 L7 (CA10) · génère `docs/specs/moteur-effets-unifie/briques.md`, la liste des briques d'effet utilisables dans un JSON de
 * supplément, depuis le validateur même (`effect-engine.js`, `supplement-loader.js`). Aucune liste n'est recopiée à la main.
 *
 *   node tools/build-effect-bricks.mjs           écrit le fichier
 *   node tools/build-effect-bricks.mjs --check   échoue si le fichier n'est pas à jour
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CLAUSE_EVENTS, CLAUSE_ROLES, CLAUSE_FIELDS, PREDICATE_OPS, OP_PHASES, STACK_POLICIES, BEARER_KINDS, BETWEEN_GROUPS } from '../js/core/effect-engine.js';
import { SUPPLEMENT_SCHEMA_VERSION, SUPPLEMENT_FAMILIES, LAYER_BRICKS, SPELL_OVERCAST_OPTIONS, PRAYER_PARAM_KINDS } from '../js/core/supplement-loader.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BRICKS_PATH = join(root, 'docs', 'specs', 'moteur-effets-unifie', 'briques.md');

const code = value => `\`${value}\``;
const list = values => [...values].map(code).join(', ');

export function renderBricks() {
  const lines = [];
  const add = (...rows) => lines.push(...rows);
  add('# U8 · Briques d’effet', '',
    '<!-- Fichier généré par `node tools/build-effect-bricks.mjs` depuis `js/core/effect-engine.js` et `js/core/supplement-loader.js`. Ne pas modifier à la main. -->', '',
    'Ce qu’un supplément peut déclarer **sans JS** dans `js/data/v5-supplements.json`. Tout ce qui n’est pas listé ici est refusé au chargement, avec un message qui nomme le supplément, l’élément et le champ ; l’élément est écarté, l’application démarre quand même, avec un bandeau d’erreurs qui reste affiché en tête de l’espace tant que le fichier n’est pas corrigé.', '');

  add('## Format du fichier', '', '```json', JSON.stringify({ schemaVersion: SUPPLEMENT_SCHEMA_VERSION, supplements: [{
    id: 'sea-of-claws', title: 'Sea of Claws', version: '1', edition: 'V5', reference: 'Sea of Claws (V5)',
    talents: ['… talent …'], prayers: ['… prière …'], spells: ['… sort …'] }] }, null, 2), '```', '',
    `- Familles : ${Object.entries(SUPPLEMENT_FAMILIES).map(([key, kind]) => `${code(key)} (porteur ${code(kind)})`).join(', ')}. Le porteur (\`bearer\`) est déduit de la famille : ne pas l’écrire.`,
    '- Un identifiant déjà pris par le livre ou par un autre supplément est refusé.', '');

  add('### Talent', '', 'Contrat v2 des talents (même évaluateur que les talents du livre) :', '', '```json', JSON.stringify({
    id: 'talent-exemple', name: 'Exemple', description: 'Texte de l’effet, tel que publié.', status: 'validated',
    source: { reference: 'Sea of Claws, p. …', effectHash: 'sha256:<64 hex>' },
    clauses: [{ id: 'bonus', event: 'test.beforeRoll', role: 'actor', when: [{ field: 'onOcean', op: 'eq', value: true }],
      effects: [{ op: 'modifySL', amount: 1, stackGroup: 'talent-exemple', stack: 'max' }] }] }, null, 2), '```', '',
    '- `status` : `validated` (appliqué) ou `draft` (tracé, jamais appliqué).',
    '- `source.effectHash` : empreinte sha256 du texte `description` (`node -e "console.log(\'sha256:\'+require(\'crypto\').createHash(\'sha256\').update(process.argv[1]).digest(\'hex\'))" "<texte>"`) ; vérifiée par `tests/unit/moteur/supplement-sans-js.test.js`.',
    '- Coûts, exemptions et quotas d’action (`costs`, `exemptions`, `quotas`) : vocabulaire de `js/core/v5-action-costs-schema.js`. Coût `{ id, resource, amount, actorId? }` (ressource `momentum`, `fate` ou ressource déclarée) ; exemption `{ costId, sourceId }` ; quota `{ id, scope, maximum, amount? }`, portée `turn`, `round`, `encounter` ou `session` (« une fois par Round » : `{ id: "…", scope: "round", maximum: 1 }`).',
    '- Le personnage acquiert le talent par son identifiant (`talents: [{ id, status: "resolved", rank }]`).', '');

  add('### Sort', '', 'Lançable par le panneau de magie comme un sort du livre (NI, portée, cible, durée du JSON) ; ses effets sont des effets de couche :', '', '```json', JSON.stringify({
    id: 'spell-exemple', name: 'Exemple', description: 'Texte affiché en rappel.', reference: 'Sea of Claws, p. …', page: 42,
    lore: 'Domaine de …', domain: null, wind: null, cn: 3, range: 'Bonus de Force Mentale mètres', target: '1', duration: 'Bonus de Force Mentale Rounds',
    overcast: { allowed: true, options: ['range', 'duration', 'targets'] }, aoe: false,
    clauses: [{ id: 'endurance', event: LAYER_BRICKS.event, role: LAYER_BRICKS.role, when: [], effects: [{ op: 'modifySL', amount: 2, key: 'carac:e' }] }] }, null, 2), '```', '',
    `- \`cn\` : NI entière ; \`range\`, \`target\`, \`duration\` : textes du livre, lus comme ceux des sorts du livre (« Vous », « Bonus de Force Mentale mètres », « Bonus de Force Mentale Rounds »…) ; \`lore\` : libellé du Domaine ; surincantation : options parmi ${list(SPELL_OVERCAST_OPTIONS)}.`, '');
  add('### Prière', '', 'Invocable par le panneau divin comme une prière du livre ; le talent requis (Béni / Invocation du dieu) et la progression par DR sont repris d’une prière du livre du même dieu et du même type :', '', '```json', JSON.stringify({
    id: 'divine:sea-of-claws:exemple', name: 'Exemple', description: 'Texte affiché.', reference: 'Sea of Claws, p. …', page: 42, type: 'miracle', deity: 'Manann',
    range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' },
    clauses: [{ id: 'resistance', event: LAYER_BRICKS.event, role: LAYER_BRICKS.role, when: [], effects: [{ op: 'modifySL', amount: 2, key: 'Résistance' }] }] }, null, 2), '```', '',
    '- `type` : `blessing` ou `miracle` ; `deity` : un dieu qui a déjà une prière de ce type au livre.',
    ...Object.entries(PRAYER_PARAM_KINDS).map(([name, kinds]) => `- \`${name}\` : \`kind\` parmi ${list(kinds)} ; \`value\` entière pour \`fixed\` / \`count\`, \`characteristic\` (CC, CT, F, E, I, Ag, Dex, Int, FM, Soc) pour \`characteristic*\`${name === 'range' ? ', `unit: "yards"` (mètres, même valeur)' : name === 'duration' ? ', `unit` : `rounds`, `minutes`, `hours` ou `days`' : ''}.`), '');
  add('### Effets de couche (sort et prière)', '',
    `- Événement ${code(LAYER_BRICKS.event)}, rôle ${code(LAYER_BRICKS.role)}, \`when\` vide, opération(s) : ${list(LAYER_BRICKS.ops)}.`,
    '- `key` : clé de Test (« Endurance », « Corps à corps (Escrime) », « carac:e », « all » ou « Tous les Tests », « Perception adverse »).',
    '- `amount` : entier non nul ; `stackable: true` (sur tous les effets de l’élément) pour une exception cumulée explicite du livre.',
    `- Cumul imposé par la famille : ${code(LAYER_BRICKS.stack)} (groupe ${code(LAYER_BRICKS.stackGroup)}) ; une couche = une source, ses clés visant le même Test s’additionnent (Q13).`,
    '- Les autres effets des sorts et prières (dégâts, États, Traits, PA…) ne sont pas encore des briques : ils restent dans les formats actuels (`v5-spell-contracts.json`, `v5-divine-contracts.json`), décision Q7 du MJ ; L8 et L9 les ajouteront.', '');

  add('## Événements', '', list(CLAUSE_EVENTS), '', '## Rôles', '', list(CLAUSE_ROLES), '');
  add('## Conditions (`when`)', '', `Opérateurs : ${list(PREDICATE_OPS)} (\`lteField\` compare à \`otherField\`, \`matchesSpecialization\` à la spécialité du talent, sans \`value\`).`, '',
    `Champs du contexte : ${list([...CLAUSE_FIELDS].sort())}.`, '');

  add('## Opérations', '', '| Opération | Forme | Événements admis |', '|---|---|---|');
  for (const [op, phases] of Object.entries(OP_PHASES.numeric)) add(`| ${code(op)} | numérique : \`amount\` entier ou \`{ base, perRank, maximum? }\`, \`stack\` \`max\` ou \`add\` | ${list(phases)} |`);
  for (const [op, phases] of Object.entries(OP_PHASES.unique)) add(`| ${code(op)} | unique : \`key\` éventuelle, \`stack\` \`unique\` | ${list(phases)} |`);
  for (const [op, phases] of Object.entries(OP_PHASES.fixed)) add(`| ${code(op)} | forme fixe (voir \`validateClauseEffect\`) | ${list(phases)} |`);
  add('', 'Tout effet porte un `stackGroup` (groupe de cumul) : deux effets d’un même groupe se cumulent selon leur `stack`.', '');

  add('## Règles de cumul dans une famille (`stack`)', '', '| Politique | Effet | Référence |', '|---|---|---|');
  for (const [name, policy] of Object.entries(STACK_POLICIES)) add(`| ${code(name)} | ${policy.label} | ${policy.reference} |`);
  add('');

  add('## Familles et cumul entre familles', '', `Familles (porteurs) : ${list(BEARER_KINDS)}.`, '', '| Paire | Politique | Référence |', '|---|---|---|');
  for (const row of Object.values(BETWEEN_GROUPS)) add(`| ${row.kinds.join(' + ')} | ${row.policy} | ${row.reference} |`);
  add('', 'Une paire absente de cette table est signalée au MJ, jamais additionnée ni écartée en silence (CA5).', '');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const content = renderBricks();
  if (process.argv.includes('--check')) {
    let current = null; try { current = readFileSync(BRICKS_PATH, 'utf8'); } catch { /* absent */ }
    if (current !== content) { console.error(`${BRICKS_PATH} n’est pas à jour : node tools/build-effect-bricks.mjs`); process.exit(1); }
    console.log('briques.md à jour');
  } else { writeFileSync(BRICKS_PATH, content); console.log(`écrit : ${BRICKS_PATH}`); }
}
