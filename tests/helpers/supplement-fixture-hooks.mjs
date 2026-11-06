// U8 L7 · test seulement : remplace `js/data/v5-supplements.json` par la fixture des suppléments fictifs avant le chargement des
// modules, pour vérifier les chemins réels (registre des talents, lancement des sorts et prières) sans toucher au fichier livré.
// À importer avant tout module de l'application, puis charger ceux-ci par `await import(...)`.
import { registerHooks } from 'node:module';
const FIXTURE = new URL('../fixtures/supplements/supplement-fictif.json', import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    const result = next(specifier, context);
    return result.url.endsWith('/js/data/v5-supplements.json') ? { ...result, url: FIXTURE } : result;
  },
});
