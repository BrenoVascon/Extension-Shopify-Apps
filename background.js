// O popup fecha sempre que outra janela ganha foco (aba de login, tela de
// autorização da loja). Por isso o login e as tarefas rodam aqui no service
// worker, e o estado fica em chrome.storage.session para o popup redesenhar
// quando for aberto de novo.
import { startDeviceLogin, waitForDeviceLogin, logout } from './lib/identity.js';
import { createApp, deployVersion, getClientSecret, getAppDetails, updateApp } from './lib/platform.js';
import { getRedirectUrl, pickCapturableRedirect, installAndGetOfflineToken } from './lib/oauth.js';
import { normalizeShop, testAdminToken } from './lib/shop.js';
import { loadLanguage, t } from './lib/i18n.js';
import { LOGIN_KEY, JOB_KEY, JOB_STEPS } from './lib/state.js';

const LOCALHOST_REDIRECT = 'http://localhost/';

const setLogin = (login) => chrome.storage.session.set({ [LOGIN_KEY]: login });
const setJob = (job) => chrome.storage.session.set({ [JOB_KEY]: job });

// Chamadas de API da extensão renovam o tempo de vida do service worker;
// sem isso ele pode ser encerrado enquanto você autoriza na outra janela.
function keepAlive() {
  const timer = setInterval(() => chrome.runtime.getPlatformInfo(), 20_000);
  return () => clearInterval(timer);
}

async function reopenPopup() {
  try {
    await chrome.action.openPopup();
  } catch {
    // Sem janela focada (ou com o popup já aberto) o Chrome não abre; o badge avisa.
  }
}

function setActionBadge(status) {
  const badge = { done: ['✓', '#3fbf74'], error: ['!', '#f0645a'] }[status];
  chrome.action.setBadgeText({ text: badge?.[0] ?? '' });
  if (badge) chrome.action.setBadgeBackgroundColor({ color: badge[1] });
}

/* ---------- Login ---------- */

let loginRun = null;

async function runLogin() {
  const runId = crypto.randomUUID();
  loginRun = runId;
  const stopKeepAlive = keepAlive();
  let tabId = null;

  try {
    await loadLanguage();
    const login = await startDeviceLogin();
    await setLogin({ status: 'waiting', userCode: login.userCode, verificationUrl: login.verificationUrl });
    ({ id: tabId } = await chrome.tabs.create({ url: login.verificationUrl }));

    await waitForDeviceLogin(login, { signal: { get aborted() { return loginRun !== runId; } } });
    await setLogin({ status: 'idle' });
    if (tabId !== null) chrome.tabs.remove(tabId).catch(() => {});
    await reopenPopup();
  } catch (error) {
    if (loginRun === runId) await setLogin({ status: 'error', error: error.message });
  } finally {
    stopKeepAlive();
  }
}

/* ---------- Tarefas ---------- */

let jobRunning = false;

// Gera o token de um app existente. Se o app não tiver um redirect que a
// extensão capture, adiciona http://localhost/ (nova versão, resto intacto).
async function tokenFlow(job, step, input) {
  const shopDomain = normalizeShop(input.shopDomain);
  if (!shopDomain) throw new Error(t('err.invalidStore'));
  job.shop = shopDomain;

  const details = await step('config', () => getAppDetails(input.clientId));
  job.title = details.name;

  let redirectUrl = pickCapturableRedirect(details.redirectUrls);
  if (redirectUrl) {
    step.skip('redirect');
  } else {
    if (!details.editable) {
      throw new Error(t('err.noRedirect', { modules: details.extensions.join(', '), url: LOCALHOST_REDIRECT }));
    }
    await step('redirect', () =>
      updateApp(details, { redirectUrls: [...details.redirectUrls, LOCALHOST_REDIRECT] })
    );
    redirectUrl = LOCALHOST_REDIRECT;
  }

  const clientSecret = await step('credentials', () => getClientSecret(details.clientId));
  return installAndTest(job, step, {
    shopDomain,
    clientId: details.clientId,
    clientSecret,
    // Vazio: a Shopify usa os escopos configurados no app.
    scopes: details.scopes,
    redirectUrl
  });
}

async function createFlow(job, step, input) {
  const shopDomain = normalizeShop(input.shopDomain);
  if (!shopDomain) throw new Error(t('err.invalidStore'));
  job.shop = shopDomain;

  const redirectUrl = getRedirectUrl();
  const appConfig = {
    name: input.appName,
    scopes: input.scopes,
    redirectUrls: [redirectUrl, LOCALHOST_REDIRECT],
    appUrl: redirectUrl
  };
  const created = await step('create', () => createApp(input.organizationId, appConfig));
  await step('version', () => deployVersion(created.appId, appConfig));

  const clientSecret = await step('credentials', () => getClientSecret(created.clientId));
  return installAndTest(job, step, {
    shopDomain,
    clientId: created.clientId,
    clientSecret,
    scopes: input.scopes,
    redirectUrl
  });
}

async function installAndTest(job, step, install) {
  const { accessToken, grantedScopes } = await step('install', () => installAndGetOfflineToken(install));
  job.result = { accessToken, grantedScopes, clientId: install.clientId };

  const tested = await step('test', () => testAdminToken(install.shopDomain, accessToken));
  job.result.shopInfo = { ...tested.shop, apiVersion: tested.apiVersion };
}

async function editFlow(job, step, input) {
  const details = await step('config', () => getAppDetails(input.clientId));
  job.title = details.name;
  await step('version', () => updateApp(details, input.patch));
  job.title = input.patch.name ?? details.name;
  job.result = { edited: true };
}

const FLOWS = { token: tokenFlow, create: createFlow, edit: editFlow };

async function runJob(kind, input) {
  jobRunning = true;
  const stopKeepAlive = keepAlive();
  await loadLanguage();

  const job = {
    kind,
    status: 'running',
    title: input.appName ?? '',
    shop: kind === 'edit' ? null : input.shopDomain,
    steps: JOB_STEPS[kind].map((id) => ({ id, status: 'pending' })),
    error: null,
    result: null,
    startedAt: Date.now()
  };

  const save = () => setJob(structuredClone(job));
  const findStep = (id) => job.steps.find((item) => item.id === id);
  const step = async (id, action) => {
    const current = findStep(id);
    current.status = 'running';
    await save();
    try {
      const value = await action();
      current.status = 'done';
      await save();
      return value;
    } catch (error) {
      current.status = 'failed';
      throw error;
    }
  };
  step.skip = (id) => {
    findStep(id).status = 'skipped';
  };

  setActionBadge(null);
  await save();

  try {
    await FLOWS[kind](job, step, input);
    job.status = 'done';
  } catch (error) {
    job.status = 'error';
    job.error = error.message;
  } finally {
    jobRunning = false;
    stopKeepAlive();
    await save();
    setActionBadge(job.status);
    await reopenPopup();
  }
}

/* ---------- Mensagens do popup ---------- */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handlers = {
    login: () => {
      runLogin();
    },
    logout: async () => {
      loginRun = null;
      await logout();
      await setLogin({ status: 'idle' });
    },
    'start-job': async () => {
      if (!FLOWS[message.kind]) throw new Error(`Unknown job: ${message.kind}`);
      if (jobRunning) {
        await loadLanguage();
        throw new Error(t('err.busy'));
      }
      runJob(message.kind, message.input);
    },
    'clear-job': async () => {
      if (jobRunning) return;
      await chrome.storage.session.remove(JOB_KEY);
      setActionBadge(null);
    }
  };

  const handler = handlers[message?.type];
  if (!handler) return false;

  Promise.resolve()
    .then(handler)
    .then(
      () => sendResponse({ ok: true }),
      (error) => sendResponse({ ok: false, error: error.message })
    );
  return true;
});

// Service worker novo = qualquer tarefa "em andamento" salva foi interrompida.
// As checagens de jobRunning/loginRun evitam marcar a tarefa que acabou de começar.
chrome.storage.session.get([JOB_KEY, LOGIN_KEY]).then(async (stored) => {
  await loadLanguage();
  if (!jobRunning && stored[JOB_KEY]?.status === 'running') {
    setJob({ ...stored[JOB_KEY], status: 'error', error: t('err.interrupted') });
  }
  if (loginRun === null && stored[LOGIN_KEY]?.status === 'waiting') {
    setLogin({ status: 'idle' });
  }
});
