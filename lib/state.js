// Chaves e etapas compartilhadas entre o popup e o service worker.
export const LOGIN_KEY = 'loginState';
export const JOB_KEY = 'jobState';
// Preferências não sensíveis (idioma, última organização, app, loja): ficam no disco.
export const PREFS_KEY = 'prefs';

// O texto de cada etapa é a chave `step.<id>` em lib/i18n.js.
// Etapas "skipped" (ex.: o redirect já existia) não aparecem no popup.
export const JOB_STEPS = {
  token: ['config', 'redirect', 'credentials', 'install', 'test'],
  create: ['create', 'version', 'credentials', 'install', 'test'],
  edit: ['config', 'version']
};
