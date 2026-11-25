// Textos em PT-BR e EN. O idioma fica nas preferências (chrome.storage.local)
// e vale tanto para o popup quanto para as mensagens do service worker.

const STRINGS = {
  pt: {
    'session.connecting': 'Conectando…',
    'session.ok': 'Conectado',
    'session.signedOut': 'Não conectado',
    'session.waiting': 'Aguardando autorização…',
    'session.loadingOrgs': 'Carregando organizações…',
    'session.error': 'Erro de conexão',
    logout: 'Sair da Shopify',
    language: 'Idioma',

    'login.title': 'Entre com sua conta Shopify',
    'login.text': 'Mesmo login da Shopify CLI. Abre uma aba da Shopify para você autorizar.',
    'login.waitingTitle': 'Autorize na aba da Shopify',
    'login.waitingText': 'Confirme o acesso na aba que abriu. Se ela der erro, use "Digitar código".',
    'login.errorTitle': 'Não foi possível entrar',
    'login.code': 'Código de confirmação',
    'login.enterCode': 'Digitar código',
    'login.button': 'Entrar com Shopify',
    'login.newCode': 'Gerar novo código',
    'login.hint': 'A sessão fica só na memória do Chrome e é renovada sozinha até você fechar o navegador.',

    'field.organization': 'Organização',
    'field.app': 'App',
    'field.appName': 'Nome do app',
    'field.appUrl': 'URL do app',
    'field.redirects': 'URLs de redirecionamento',
    'field.scopes': 'Escopos',
    'field.store': 'Loja',
    loading: 'Carregando…',
    retry: 'Tentar de novo',
    'org.choose': 'Escolha a organização',
    'org.loadFailed': 'Não foi possível carregar',
    'tab.token': 'Gerar token',
    'tab.create': 'Criar app',
    'tab.edit': 'Editar app',
    'app.chooseOrgFirst': 'Escolha a organização',
    'app.loading': 'Carregando apps…',
    'app.choose': 'Escolha o app',
    'app.none': 'Nenhum app nesta organização',
    'count.apps.one': '{n} app',
    'count.apps.other': '{n} apps',
    'count.scopes.one': '{n} escopo',
    'count.scopes.other': '{n} escopos',
    'token.hint': 'Usa os escopos e o redirect do próprio app. Se faltar o redirect em localhost, ele é adicionado sozinho.',
    'placeholder.appName': 'Integração ERP',
    'placeholder.redirects': 'http://localhost/',
    'placeholder.store': 'loja.myshopify.com',
    'scopes.none': 'Nenhum escopo escolhido',
    'store.invalid': 'Inválida',
    'store.known': 'Da organização',
    'store.other': 'Outra loja',
    'run.token': 'Gerar token',
    'run.create': 'Criar e instalar',
    'run.edit': 'Salvar e publicar',
    'edit.loading': 'Lendo configuração do app…',
    'edit.blocked': 'Esse app tem extensões ({modules}). Para não perder código, edite pela Shopify CLI.',
    'edit.hint': 'Salvar cria e publica uma versão nova do app, igual ao shopify app deploy.',
    'edit.redirectsHint': 'Uma por linha.',

    'scopes.title': 'Escopos de acesso',
    'scopes.clear': 'Limpar',
    'scopes.search': 'Buscar: pedidos, write_themes…',
    'scopes.presets': 'Combos prontos',
    'scopes.presetHint': 'Clique para somar estes escopos (clique de novo para tirar): {scopes}',
    'preset.erp': 'ERP',
    'preset.catalog': 'Catálogo / PIM',
    'preset.inventory': 'Estoque',
    'preset.logistics': 'Logística / WMS',
    'preset.crm': 'CRM e marketing',
    'preset.reports': 'Relatórios / BI',
    'preset.content': 'Tema e conteúdo',
    'preset.headless': 'Headless',
    'scopes.extra': 'Outros escopos',
    'scopes.extraPlaceholder': 'read_algo, write_outro',
    'scopes.selected.one': 'escopo selecionado',
    'scopes.selected.other': 'escopos selecionados',
    'scopes.done': 'Concluir',
    back: 'Voltar',
    'scopes.emptyChips': 'Nenhum escopo escolhido. Marque abaixo ou busque pelo nome.',
    'scopes.emptyResult': 'Nenhum escopo encontrado. Se ele existir, adicione em "Outros escopos".',
    'scopes.read': 'Ler',
    'scopes.write': 'Escrever',
    'scopes.toggleColumn': 'Marcar ou desmarcar a coluna toda (sem escopos que requerem aprovação)',
    'scopes.approval': 'Aprovação',
    'scopes.approvalTitle': 'A Shopify precisa aprovar o app antes; sem isso a criação da versão falha.',
    'scopes.deprecated': 'Descontinuado',
    'scopes.implied': 'Já incluído em {scope}',
    'scopes.remove': 'Remover {scope}',

    'job.createTitle': 'Criar app: {name}',
    'job.editTitle': 'Editar app: {name}',
    'job.errorTitle': 'Algo deu errado',
    'job.successToken': 'Token gerado e testado',
    'job.successTokenText': 'A Admin API respondeu com esse token.',
    'job.successEdit': 'Versão publicada',
    'job.successEditText': 'As mudanças já valem para o app.',
    'job.token': 'Access token',
    'job.tokenKind': 'Offline · não expira',
    'store.empty': 'Nenhuma loja encontrada. Pode digitar qualquer .myshopify.com.',
    'job.copy': 'Copiar',
    'job.copied': 'Copiado',
    'job.granted': 'Escopos concedidos',
    'job.tokenHint': 'Envie no header <code>X-Shopify-Access-Token</code>. Não expira enquanto o app estiver instalado: trate como senha.',
    'job.waiting': 'Pode fechar este popup. Quando terminar, ele abre de novo com o resultado.',
    'fact.store': 'Loja',
    'fact.plan': 'Plano',
    'fact.currency': 'Moeda',
    'fact.api': 'API',
    'footer.docs': 'Docs de escopos',

    'step.config': 'Ler configuração do app',
    'step.redirect': 'Adicionar redirect localhost ao app',
    'step.credentials': 'Buscar client secret',
    'step.install': 'Autorizar na loja',
    'step.test': 'Testar token na Admin API',
    'step.create': 'Criar app',
    'step.version': 'Criar e publicar versão',

    'err.busy': 'Já existe uma tarefa em andamento.',
    'err.invalidStore': 'Loja inválida. Use o formato loja.myshopify.com.',
    'err.noRedirect':
      'Esse app não tem redirect em localhost e tem extensões ({modules}), então a extensão não altera ele sozinha. Adicione {url} nas URLs de redirecionamento pela CLI ou pelo Dev Dashboard.',
    'err.interrupted': 'A tarefa foi interrompida. Tente de novo.',
    'err.noResponse': 'A extensão não respondeu.',
    'err.sessionExpired': 'Sessão da Shopify expirada. Entre de novo.',
    'err.api': 'Erro {status} na API da Shopify.',
    'err.appNotFound': 'App não encontrado na Shopify.',
    'err.noVersion': 'Esse app ainda não tem versão publicada.',
    'err.noSecret': 'A Shopify não devolveu o client secret do app.',
    'err.loginStart': 'Não foi possível iniciar o login na Shopify.',
    'err.loginCancelled': 'Login cancelado.',
    'err.loginDenied': 'Login recusado na página da Shopify.',
    'err.loginExpired': 'O código de login expirou. Tente de novo.',
    'err.login': 'Erro no login ({error}).',
    'err.apiAuth': 'Não foi possível autorizar o acesso à API ({error}).',
    'err.tabClosed': 'A aba de autorização foi fechada antes de terminar.',
    'err.installRefused': 'A Shopify recusou a instalação: {error}',
    'err.state': 'State inválido no retorno do OAuth.',
    'err.shopMismatch': 'A loja do retorno não é a loja escolhida.',
    'err.hmac': 'HMAC inválido no retorno do OAuth.',
    'err.exchange': 'Falha ao trocar o code pelo token ({detail}).',
    'err.token401': 'Token recusado (401): foi revogado ou é de outra loja.',
    'err.token403': 'Token sem permissão para ler a loja (403).',
    'err.shopStatus': 'A Shopify respondeu com erro {status}.',
    'err.noApiVersion': 'Nenhuma versão da Admin API respondeu (último status {status}).',
    'err.invalidUrl': 'URL inválida: {url}',
    'err.noRedirects': 'Informe pelo menos uma URL de redirecionamento.',
    'err.unknownConfig': 'A configuração de acesso desse app está num formato que a extensão não reconhece; nada foi alterado.'
  },

  en: {
    'session.connecting': 'Connecting…',
    'session.ok': 'Connected',
    'session.signedOut': 'Signed out',
    'session.waiting': 'Waiting for authorization…',
    'session.loadingOrgs': 'Loading organizations…',
    'session.error': 'Connection error',
    logout: 'Sign out of Shopify',
    language: 'Language',

    'login.title': 'Sign in with your Shopify account',
    'login.text': 'Same login as the Shopify CLI. Opens a Shopify tab for you to authorize.',
    'login.waitingTitle': 'Authorize in the Shopify tab',
    'login.waitingText': 'Confirm access in the tab that opened. If it shows an error, use "Enter code".',
    'login.errorTitle': "Couldn't sign in",
    'login.code': 'Confirmation code',
    'login.enterCode': 'Enter code',
    'login.button': 'Sign in with Shopify',
    'login.newCode': 'Get a new code',
    'login.hint': "The session lives only in Chrome's memory and renews itself until you close the browser.",

    'field.organization': 'Organization',
    'field.app': 'App',
    'field.appName': 'App name',
    'field.appUrl': 'App URL',
    'field.redirects': 'Redirect URLs',
    'field.scopes': 'Scopes',
    'field.store': 'Store',
    loading: 'Loading…',
    retry: 'Try again',
    'org.choose': 'Choose an organization',
    'org.loadFailed': "Couldn't load",
    'tab.token': 'Get token',
    'tab.create': 'Create app',
    'tab.edit': 'Edit app',
    'app.chooseOrgFirst': 'Choose an organization',
    'app.loading': 'Loading apps…',
    'app.choose': 'Choose an app',
    'app.none': 'No apps in this organization',
    'count.apps.one': '{n} app',
    'count.apps.other': '{n} apps',
    'count.scopes.one': '{n} scope',
    'count.scopes.other': '{n} scopes',
    'token.hint': "Uses the app's own scopes and redirect. If the localhost redirect is missing, it's added automatically.",
    'placeholder.appName': 'ERP integration',
    'placeholder.redirects': 'http://localhost/',
    'placeholder.store': 'store.myshopify.com',
    'scopes.none': 'No scopes selected',
    'store.invalid': 'Invalid',
    'store.known': 'In organization',
    'store.other': 'Other store',
    'run.token': 'Get token',
    'run.create': 'Create and install',
    'run.edit': 'Save and release',
    'edit.loading': 'Reading app configuration…',
    'edit.blocked': 'This app has extensions ({modules}). Edit it with the Shopify CLI so no code is lost.',
    'edit.hint': 'Saving creates and releases a new app version, like shopify app deploy.',
    'edit.redirectsHint': 'One per line.',

    'scopes.title': 'Access scopes',
    'scopes.clear': 'Clear',
    'scopes.search': 'Search: orders, write_themes…',
    'scopes.presets': 'Presets',
    'scopes.presetHint': 'Click to add these scopes (click again to remove): {scopes}',
    'preset.erp': 'ERP',
    'preset.catalog': 'Catalog / PIM',
    'preset.inventory': 'Inventory',
    'preset.logistics': 'Logistics / WMS',
    'preset.crm': 'CRM & marketing',
    'preset.reports': 'Reports / BI',
    'preset.content': 'Theme & content',
    'preset.headless': 'Headless',
    'scopes.extra': 'Other scopes',
    'scopes.extraPlaceholder': 'read_something, write_other',
    'scopes.selected.one': 'scope selected',
    'scopes.selected.other': 'scopes selected',
    'scopes.done': 'Done',
    back: 'Back',
    'scopes.emptyChips': 'No scopes yet. Tick them below or search by name.',
    'scopes.emptyResult': 'No scope found. If it exists, add it under "Other scopes".',
    'scopes.read': 'Read',
    'scopes.write': 'Write',
    'scopes.toggleColumn': 'Toggle the whole column (skips scopes that need approval)',
    'scopes.approval': 'Approval',
    'scopes.approvalTitle': 'Shopify must approve the app first; otherwise creating the version fails.',
    'scopes.deprecated': 'Deprecated',
    'scopes.implied': 'Already included in {scope}',
    'scopes.remove': 'Remove {scope}',

    'job.createTitle': 'Create app: {name}',
    'job.editTitle': 'Edit app: {name}',
    'job.errorTitle': 'Something went wrong',
    'job.successToken': 'Token generated and tested',
    'job.successTokenText': 'The Admin API accepted this token.',
    'job.successEdit': 'Version released',
    'job.successEditText': 'The changes are live for the app.',
    'job.token': 'Access token',
    'job.tokenKind': "Offline · doesn't expire",
    'store.empty': 'No store found. You can type any .myshopify.com.',
    'job.copy': 'Copy',
    'job.copied': 'Copied',
    'job.granted': 'Granted scopes',
    'job.tokenHint': "Send it in the <code>X-Shopify-Access-Token</code> header. It doesn't expire while the app is installed: treat it like a password.",
    'job.waiting': 'You can close this popup. It reopens with the result when done.',
    'fact.store': 'Store',
    'fact.plan': 'Plan',
    'fact.currency': 'Currency',
    'fact.api': 'API',
    'footer.docs': 'Scope docs',

    'step.config': 'Read app configuration',
    'step.redirect': 'Add localhost redirect to the app',
    'step.credentials': 'Fetch client secret',
    'step.install': 'Authorize on the store',
    'step.test': 'Test token on the Admin API',
    'step.create': 'Create app',
    'step.version': 'Create and release version',

    'err.busy': 'A task is already running.',
    'err.invalidStore': 'Invalid store. Use the store.myshopify.com format.',
    'err.noRedirect':
      "This app has no localhost redirect and has extensions ({modules}), so the extension won't change it on its own. Add {url} to the redirect URLs with the CLI or the Dev Dashboard.",
    'err.interrupted': 'The task was interrupted. Try again.',
    'err.noResponse': "The extension didn't respond.",
    'err.sessionExpired': 'Shopify session expired. Sign in again.',
    'err.api': 'Shopify API error {status}.',
    'err.appNotFound': 'App not found on Shopify.',
    'err.noVersion': 'This app has no released version yet.',
    'err.noSecret': "Shopify didn't return the app's client secret.",
    'err.loginStart': "Couldn't start the Shopify login.",
    'err.loginCancelled': 'Login cancelled.',
    'err.loginDenied': 'Login was denied on the Shopify page.',
    'err.loginExpired': 'The login code expired. Try again.',
    'err.login': 'Login error ({error}).',
    'err.apiAuth': "Couldn't authorize API access ({error}).",
    'err.tabClosed': 'The authorization tab was closed before finishing.',
    'err.installRefused': 'Shopify refused the install: {error}',
    'err.state': 'Invalid state in the OAuth callback.',
    'err.shopMismatch': "The callback store doesn't match the chosen store.",
    'err.hmac': 'Invalid HMAC in the OAuth callback.',
    'err.exchange': 'Failed to exchange the code for a token ({detail}).',
    'err.token401': 'Token rejected (401): revoked or from another store.',
    'err.token403': "Token can't read the store (403).",
    'err.shopStatus': 'Shopify responded with error {status}.',
    'err.noApiVersion': 'No Admin API version responded (last status {status}).',
    'err.invalidUrl': 'Invalid URL: {url}',
    'err.noRedirects': 'Add at least one redirect URL.',
    'err.unknownConfig': "This app's access configuration is in a format the extension doesn't recognize; nothing was changed."
  }
};

export const LANGUAGES = ['pt', 'en'];

let language = 'pt';

export const getLanguage = () => language;

export function setLanguage(value) {
  language = LANGUAGES.includes(value) ? value : 'pt';
  if (typeof document !== 'undefined') document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
}

const defaultLanguage = () =>
  typeof navigator !== 'undefined' && !navigator.language?.toLowerCase().startsWith('pt') ? 'en' : 'pt';

// Lê o idioma salvo; sem preferência, segue o idioma do navegador.
export async function loadLanguage() {
  const { prefs } = await chrome.storage.local.get('prefs');
  setLanguage(prefs?.language ?? defaultLanguage());
  return language;
}

export function t(key, vars = {}) {
  const text = STRINGS[language][key] ?? STRINGS.pt[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

export const tn = (key, n, vars = {}) => t(`${key}.${n === 1 ? 'one' : 'other'}`, { n, ...vars });

// Aplica as traduções nos elementos marcados com data-i18n*.
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  // Só textos fixos deste arquivo, com <code>; nunca dados de fora.
  root.querySelectorAll('[data-i18n-html]').forEach((node) => {
    node.innerHTML = t(node.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
    node.setAttribute('aria-label', node.title);
  });
}
