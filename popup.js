import { listOrganizations, listStores, listApps, getAppDetails } from './lib/platform.js';
import { hasSession, SESSION_KEY } from './lib/identity.js';
import { SCOPE_GROUPS, SCOPE_PRESETS, getScopesOfItem, scopeLabel } from './lib/scopes.js';
import { normalizeShop } from './lib/shop.js';
import { applyI18n, getLanguage, loadLanguage, setLanguage, t, tn } from './lib/i18n.js';
import { LOGIN_KEY, JOB_KEY, PREFS_KEY } from './lib/state.js';

const $ = (id) => document.getElementById(id);

const el = {
  sessionPill: $('session-pill'),
  sessionText: $('session-text'),
  langButtons: document.querySelectorAll('[data-lang]'),
  logoutButton: $('logout-button'),
  views: { login: $('login-view'), main: $('main-view'), scopes: $('scopes-view'), job: $('job-view') },

  loginBanner: $('login-banner'),
  loginTitle: $('login-title'),
  loginText: $('login-text'),
  loginCodeBox: $('login-code-box'),
  loginCode: $('login-code'),
  loginButton: $('login-button'),

  loadError: $('load-error'),
  loadErrorText: $('load-error-text'),
  retryButton: $('retry-button'),
  organizationSelect: $('organization-select'),
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('[data-panels]'),
  appSelect: $('app-select'),
  appPill: $('app-pill'),
  editStatus: $('edit-status'),
  editStatusText: $('edit-status-text'),
  appFields: $('app-fields'),
  appNameInput: $('app-name-input'),
  appUrlInput: $('app-url-input'),
  redirectsInput: $('redirects-input'),
  scopesPill: $('scopes-pill'),
  scopesPreview: $('scopes-preview'),
  openScopesButton: $('open-scopes-button'),
  storeInput: $('store-input'),
  storeList: $('store-list'),
  storePill: $('store-pill'),
  runButton: $('run-button'),

  closeScopesButton: $('close-scopes-button'),
  doneScopesButton: $('done-scopes-button'),
  clearScopesButton: $('clear-scopes-button'),
  selectedScopesOutput: $('selected-scopes'),
  scopePresets: $('scope-presets'),
  scopeSearchInput: $('scope-search-input'),
  scopeTopicNav: $('scope-topic-nav'),
  scopeGroupList: $('scope-group-list'),
  extraScopesInput: $('extra-scopes-input'),
  scopeCountOutput: $('scope-count-output'),

  jobTitle: $('job-title'),
  jobShop: $('job-shop'),
  jobSteps: $('job-steps'),
  jobSuccess: $('job-success'),
  jobSuccessTitle: $('job-success-title'),
  jobSuccessText: $('job-success-text'),
  jobError: $('job-error'),
  jobErrorText: $('job-error-text'),
  jobResult: $('job-result'),
  jobWaitingHint: $('job-waiting-hint'),
  tokenOutput: $('token-output'),
  copyTokenButton: $('copy-token-button'),
  shopFacts: $('shop-facts'),
  grantedCount: $('granted-count'),
  grantedScopesOutput: $('granted-scopes-output'),
  newJobButton: $('new-job-button')
};

const ALL_SCOPE_ITEMS = SCOPE_GROUPS.flatMap((group) => group.items);
const KNOWN_SCOPES = new Set(ALL_SCOPE_ITEMS.flatMap(getScopesOfItem));
const ITEM_BY_SCOPE = new Map(ALL_SCOPE_ITEMS.flatMap((item) => getScopesOfItem(item).map((scope) => [scope, item])));

const prefs = {
  language: null,
  tab: 'token',
  organizationId: '',
  clientId: '',
  shop: '',
  appName: '',
  scopes: [],
  extraScopes: ''
};

// Cada aba tem sua própria seleção de escopos: a de "Criar" fica salva, a de
// "Editar" vem do app carregado.
const scopeState = {
  create: { set: new Set(), extra: '' },
  edit: { set: new Set(), extra: '' }
};
const activeScopes = () => scopeState[prefs.tab === 'edit' ? 'edit' : 'create'];

const orgData = new Map(); // organizationId → { apps, stores }
const appDetailsCache = new Map(); // clientId → detalhes da versão ativa
let editDetails = null;
let editStatus = null; // { tone, key, vars }
let sessionPillState = { state: 'loading', key: 'session.connecting' };
let currentView = null;
let currentJob = null;
let currentLogin = null;
let organizationsLoaded = false;

/* ---------- Helpers ---------- */

const normalizeText = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const parseList = (text, separator = ',') => text.split(separator).map((item) => item.trim()).filter(Boolean);
const sameList = (a, b) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

function icon(name, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function setPill(pill, text, tone = '') {
  pill.textContent = text;
  pill.dataset.tone = tone;
}

// O placeholder guarda a chave de tradução para ser retraduzido ao trocar o idioma.
function fillSelect(select, items, placeholderKey) {
  select.dataset.placeholderKey = placeholderKey;
  select.replaceChildren(new Option(t(placeholderKey), ''), ...items.map((item) => new Option(item.label, item.value)));
}

function isValidUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error ?? t('err.noResponse'));
}

let savePrefsTimer = null;
function savePrefs() {
  clearTimeout(savePrefsTimer);
  savePrefsTimer = setTimeout(() => {
    prefs.scopes = [...scopeState.create.set];
    prefs.extraScopes = scopeState.create.extra;
    chrome.storage.local.set({ [PREFS_KEY]: prefs });
  }, 150);
}

function setSessionPill(state, key) {
  sessionPillState = { state, key };
  el.sessionPill.dataset.state = state;
  el.sessionText.textContent = t(key);
  el.logoutButton.hidden = state !== 'ok';
}

function showView(name) {
  currentView = name;
  document.body.dataset.view = name;
  Object.entries(el.views).forEach(([key, view]) => {
    view.hidden = key !== name;
  });
}

/* ---------- Idioma ---------- */

function renderLanguageSwitch() {
  el.langButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === getLanguage())));
}

// Retraduz tudo que é montado no JS (o HTML estático sai do applyI18n).
function relabel() {
  applyI18n();
  renderLanguageSwitch();
  setSessionPill(sessionPillState.state, sessionPillState.key);
  document.querySelectorAll('select[data-placeholder-key]').forEach((select) => {
    select.options[0].text = t(select.dataset.placeholderKey);
  });
  const appCount = orgData.get(el.organizationSelect.value)?.apps.length;
  if (appCount !== undefined) setPill(el.appPill, tn('count.apps', appCount));
  renderScopePicker();
  refreshScopes();
  setTab(prefs.tab);
  renderEditStatus();
  if (currentView === 'login') renderLogin(currentLogin);
  if (currentView === 'job' && currentJob) renderJob(currentJob);
}

function changeLanguage(language) {
  if (language === getLanguage()) return;
  setLanguage(language);
  prefs.language = language;
  savePrefs();
  relabel();
}

/* ---------- Login ---------- */

function renderLogin(login) {
  currentLogin = login;
  const waiting = login?.status === 'waiting';
  const failed = login?.status === 'error';

  el.loginBanner.dataset.tone = failed ? 'error' : 'neutral';
  el.loginBanner.dataset.busy = String(waiting);
  el.loginBanner.querySelector('.banner-icon').replaceChildren(icon(waiting ? 'loader' : failed ? 'alert' : 'bag'));

  el.loginTitle.textContent = t(waiting ? 'login.waitingTitle' : failed ? 'login.errorTitle' : 'login.title');
  el.loginText.textContent = failed ? login.error : t(waiting ? 'login.waitingText' : 'login.text');

  el.loginCodeBox.hidden = !waiting;
  el.loginCode.textContent = waiting ? login.userCode : '';
  el.loginButton.querySelector('span').textContent = t(waiting ? 'login.newCode' : 'login.button');
  el.loginButton.classList.toggle('button-primary', !waiting);
  el.loginButton.classList.toggle('button-ghost', waiting);

  setSessionPill(waiting ? 'loading' : failed ? 'error' : 'idle', waiting ? 'session.waiting' : 'session.signedOut');
}

async function showLogin() {
  const { [LOGIN_KEY]: login } = await chrome.storage.session.get(LOGIN_KEY);
  renderLogin(login);
  showView('login');
}

async function handleLogin() {
  el.loginButton.disabled = true;
  try {
    await send('login');
  } catch (error) {
    renderLogin({ status: 'error', error: error.message });
  } finally {
    el.loginButton.disabled = false;
  }
}

async function handleLogout() {
  await send('logout');
  organizationsLoaded = false;
  orgData.clear();
  appDetailsCache.clear();
  await showLogin();
}

/* ---------- Organização, apps e lojas ---------- */

function showLoadError(message) {
  el.loadError.hidden = !message;
  el.loadErrorText.textContent = message ?? '';
}

async function loadOrganizations() {
  showLoadError(null);
  setSessionPill('loading', 'session.loadingOrgs');
  fillSelect(el.organizationSelect, [], 'loading');
  try {
    const organizations = await listOrganizations();
    fillSelect(
      el.organizationSelect,
      organizations.map((organization) => ({ value: organization.id, label: organization.name })),
      'org.choose'
    );
    organizationsLoaded = true;
    setSessionPill('ok', 'session.ok');
    if (organizations.some((organization) => organization.id === prefs.organizationId)) {
      el.organizationSelect.value = prefs.organizationId;
      await loadOrganizationData();
    } else if (organizations.length === 1) {
      el.organizationSelect.value = organizations[0].id;
      await handleOrganizationChange();
    }
  } catch (error) {
    fillSelect(el.organizationSelect, [], 'org.loadFailed');
    setSessionPill('error', 'session.error');
    showLoadError(error.message);
  }
  refreshForm();
}

async function handleOrganizationChange() {
  prefs.organizationId = el.organizationSelect.value;
  prefs.clientId = '';
  savePrefs();
  await loadOrganizationData();
}

async function loadOrganizationData() {
  const organizationId = el.organizationSelect.value;
  el.appSelect.disabled = true;
  closeStoreList();
  setPill(el.appPill, '');
  fillSelect(el.appSelect, [], organizationId ? 'app.loading' : 'app.chooseOrgFirst');
  resetEdit();
  refreshForm();
  if (!organizationId) return;

  showLoadError(null);
  try {
    if (!orgData.has(organizationId)) {
      const [apps, stores] = await Promise.all([listApps(organizationId), listStores(organizationId)]);
      orgData.set(organizationId, { apps, stores });
    }
    if (el.organizationSelect.value !== organizationId) return;
    const { apps, stores } = orgData.get(organizationId);

    fillSelect(
      el.appSelect,
      apps.map((app) => ({ value: app.clientId, label: app.name })),
      apps.length ? 'app.choose' : 'app.none'
    );
    el.appSelect.disabled = apps.length === 0;
    if (apps.some((app) => app.clientId === prefs.clientId)) el.appSelect.value = prefs.clientId;
    setPill(el.appPill, tn('count.apps', apps.length));

  } catch (error) {
    fillSelect(el.appSelect, [], 'org.loadFailed');
    showLoadError(error.message);
  }
  refreshForm();
  if (prefs.tab === 'edit') loadEditDetails();
}

/* ---------- Combobox de lojas ---------- */

// Lista própria no lugar do <datalist>: o nativo abre fora do popup, por cima da página.
let storeMatches = [];
let storeActiveIndex = -1;

function highlight(text, query) {
  const fragment = document.createDocumentFragment();
  const index = query ? normalizeText(text).indexOf(query) : -1;
  if (index < 0) {
    fragment.append(text);
    return fragment;
  }
  const mark = document.createElement('mark');
  mark.textContent = text.slice(index, index + query.length);
  fragment.append(text.slice(0, index), mark, text.slice(index + query.length));
  return fragment;
}

function renderStoreList() {
  const stores = orgData.get(el.organizationSelect.value)?.stores ?? [];
  const query = normalizeText(el.storeInput.value.trim());
  storeMatches = stores
    .filter((store) => !query || normalizeText(`${store.name} ${store.domain}`).includes(query))
    .slice(0, 60);
  storeActiveIndex = Math.min(storeActiveIndex, storeMatches.length - 1);

  if (!stores.length) {
    closeStoreList();
    return;
  }

  el.storeList.replaceChildren(
    ...(storeMatches.length
      ? storeMatches.map((store, index) => {
          const option = document.createElement('li');
          option.className = 'combo-option';
          option.id = `store-option-${index}`;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', String(index === storeActiveIndex));
          const name = document.createElement('span');
          name.className = 'combo-option-name';
          name.append(highlight(store.name, query));
          const domain = document.createElement('span');
          domain.className = 'combo-option-domain';
          domain.append(highlight(store.domain, query));
          option.append(name, domain);
          // mousedown: escolhe antes do blur do campo fechar a lista.
          option.addEventListener('mousedown', (event) => {
            event.preventDefault();
            chooseStore(store);
          });
          return option;
        })
      : [Object.assign(document.createElement('li'), { className: 'combo-empty', textContent: t('store.empty') })])
  );
  el.storeList.hidden = false;
  el.storeInput.setAttribute('aria-expanded', 'true');
  if (storeActiveIndex >= 0) {
    el.storeInput.setAttribute('aria-activedescendant', `store-option-${storeActiveIndex}`);
    $(`store-option-${storeActiveIndex}`)?.scrollIntoView({ block: 'nearest' });
  } else {
    el.storeInput.removeAttribute('aria-activedescendant');
  }
}

function closeStoreList() {
  el.storeList.hidden = true;
  el.storeInput.setAttribute('aria-expanded', 'false');
  el.storeInput.removeAttribute('aria-activedescendant');
  storeActiveIndex = -1;
}

function chooseStore(store) {
  el.storeInput.value = store.domain;
  prefs.shop = store.domain;
  savePrefs();
  closeStoreList();
  refreshForm();
}

function handleStoreKeydown(event) {
  const open = !el.storeList.hidden;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!open) storeActiveIndex = -1;
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const count = Math.max(storeMatches.length, 1);
    storeActiveIndex = open ? (storeActiveIndex + step + count) % count : 0;
    renderStoreList();
  } else if (event.key === 'Enter' && open && storeMatches[storeActiveIndex]) {
    event.preventDefault();
    chooseStore(storeMatches[storeActiveIndex]);
  } else if (event.key === 'Escape' && open) {
    event.preventDefault();
    closeStoreList();
  }
}

/* ---------- Editar app ---------- */

function renderEditStatus() {
  el.editStatus.hidden = !editStatus;
  if (!editStatus) return;
  el.editStatus.dataset.tone = editStatus.tone;
  el.editStatus.dataset.busy = String(editStatus.tone === 'neutral');
  el.editStatus.querySelector('.banner-icon').replaceChildren(icon(editStatus.tone === 'neutral' ? 'loader' : 'alert'));
  el.editStatusText.textContent = editStatus.key ? t(editStatus.key, editStatus.vars) : editStatus.text;
}

function setEditStatus(status) {
  editStatus = status;
  renderEditStatus();
}

function resetEdit() {
  editDetails = null;
  setEditStatus(null);
  if (prefs.tab === 'edit') fillEditFields(null);
}

function fillEditFields(details) {
  el.appNameInput.value = details?.name ?? '';
  el.appUrlInput.value = details?.appUrl ?? '';
  el.redirectsInput.value = details?.redirectUrls.join('\n') ?? '';
  const state = scopeState.edit;
  state.set = new Set((details?.scopes ?? []).filter((scope) => KNOWN_SCOPES.has(scope)));
  state.extra = (details?.scopes ?? []).filter((scope) => !KNOWN_SCOPES.has(scope)).join(', ');
  el.appFields.dataset.disabled = String(!details?.editable);
  refreshScopes();
}

async function loadEditDetails() {
  const clientId = el.appSelect.value;
  editDetails = null;
  fillEditFields(null);
  if (!clientId) {
    setEditStatus(null);
    return;
  }

  setEditStatus({ tone: 'neutral', key: 'edit.loading' });
  try {
    if (!appDetailsCache.has(clientId)) appDetailsCache.set(clientId, await getAppDetails(clientId));
    if (el.appSelect.value !== clientId || prefs.tab !== 'edit') return;
    editDetails = appDetailsCache.get(clientId);
    fillEditFields(editDetails);
    setEditStatus(
      editDetails.editable ? null : { tone: 'warning', key: 'edit.blocked', vars: { modules: editDetails.extensions.join(', ') } }
    );
  } catch (error) {
    setEditStatus({ tone: 'error', text: error.message });
  }
  refreshForm();
}

// Só manda o que mudou; o resto da configuração do app fica como está.
function getEditPatch() {
  if (!editDetails?.editable) return { patch: null, error: null };
  const patch = {};
  const name = el.appNameInput.value.trim();
  const appUrl = el.appUrlInput.value.trim();
  const redirectUrls = parseList(el.redirectsInput.value, '\n');
  const scopes = getSelectedScopes();

  const invalid = [appUrl, ...redirectUrls].find((url) => url && !isValidUrl(url));
  if (invalid) return { patch: null, error: t('err.invalidUrl', { url: invalid }) };
  if (!redirectUrls.length) return { patch: null, error: t('err.noRedirects') };

  if (name && name !== editDetails.name) patch.name = name;
  if (appUrl && appUrl !== editDetails.appUrl) patch.appUrl = appUrl;
  if (!sameList(redirectUrls, editDetails.redirectUrls)) patch.redirectUrls = redirectUrls;
  if (!sameList(scopes, editDetails.scopes)) patch.scopes = scopes;

  return { patch: Object.keys(patch).length ? patch : null, error: null };
}

/* ---------- Formulário ---------- */

const RUN_BUTTON = {
  token: { icon: 'key', key: 'run.token' },
  create: { icon: 'rocket', key: 'run.create' },
  edit: { icon: 'save', key: 'run.edit' }
};

function setTab(tab) {
  const changed = prefs.tab !== tab;
  prefs.tab = tab;
  closeStoreList();
  el.tabs.forEach((button) => button.setAttribute('aria-selected', String(button.dataset.tab === tab)));
  el.panels.forEach((panel) => {
    panel.hidden = !panel.dataset.panels.split(' ').includes(tab);
  });
  el.runButton.replaceChildren(
    icon(RUN_BUTTON[tab].icon),
    Object.assign(document.createElement('span'), { textContent: t(RUN_BUTTON[tab].key) })
  );

  if (changed) {
    if (tab === 'edit') {
      loadEditDetails();
    } else {
      el.appNameInput.value = tab === 'create' ? prefs.appName ?? '' : el.appNameInput.value;
      el.appFields.dataset.disabled = 'false';
      setEditStatus(null);
      editDetails = null;
    }
    savePrefs();
  }
  refreshScopes();
}

function getSelectedScopes() {
  const state = activeScopes();
  return [...new Set([...state.set, ...parseList(state.extra)])];
}

function getStoreStatus() {
  const raw = el.storeInput.value.trim();
  if (!raw) return { domain: null, text: '', tone: '' };
  const domain = normalizeShop(raw);
  if (!domain) return { domain: null, text: t('store.invalid'), tone: 'error' };
  const stores = orgData.get(el.organizationSelect.value)?.stores ?? [];
  const known = stores.some((store) => store.domain === domain);
  return { domain, text: t(known ? 'store.known' : 'store.other'), tone: known ? 'success' : 'warning' };
}

function refreshForm() {
  const store = getStoreStatus();
  setPill(el.storePill, store.text, store.tone);

  const scopes = getSelectedScopes();
  setPill(el.scopesPill, scopes.length ? tn('count.scopes', scopes.length) : '', 'success');
  el.scopesPreview.textContent = scopes.length ? scopes.join(', ') : t('scopes.none');
  el.scopesPreview.dataset.empty = String(!scopes.length);

  const hasOrganization = organizationsLoaded && Boolean(el.organizationSelect.value);
  let ready = false;
  if (prefs.tab === 'token') ready = hasOrganization && Boolean(el.appSelect.value) && Boolean(store.domain);
  if (prefs.tab === 'create') {
    ready = hasOrganization && Boolean(store.domain) && Boolean(el.appNameInput.value.trim()) && scopes.length > 0;
  }
  if (prefs.tab === 'edit') {
    const { patch, error } = getEditPatch();
    ready = hasOrganization && Boolean(patch);
    el.runButton.title = error ?? '';
  } else {
    el.runButton.title = '';
  }
  el.runButton.disabled = !ready;
}

function buildJobInput() {
  const organizationId = el.organizationSelect.value;
  const shopDomain = getStoreStatus().domain;
  const appName = el.appSelect.selectedOptions[0]?.textContent;

  if (prefs.tab === 'token') return { organizationId, clientId: el.appSelect.value, appName, shopDomain };
  if (prefs.tab === 'create') {
    return { organizationId, appName: el.appNameInput.value.trim(), scopes: getSelectedScopes(), shopDomain };
  }
  return { organizationId, clientId: el.appSelect.value, appName, patch: getEditPatch().patch };
}

async function handleRun() {
  if (el.runButton.disabled) return;
  const kind = prefs.tab;
  const input = buildJobInput();

  el.runButton.disabled = true;
  el.runButton.dataset.busy = 'true';
  try {
    await send('start-job', { kind, input });
    // A versão ativa vai mudar (edição ou redirect adicionado): relê da próxima vez.
    appDetailsCache.delete(input.clientId);
  } catch (error) {
    showLoadError(error.message);
  } finally {
    el.runButton.dataset.busy = 'false';
    refreshForm();
  }
}

/* ---------- Escopos ---------- */

function isReadImplied(item) {
  return Boolean(item.read && item.write && activeScopes().set.has(item.write));
}

function toggleScope(item, column, isChecked) {
  const { set } = activeScopes();
  const scope = item[column];
  if (isChecked) {
    set.add(scope);
    if (column === 'write' && item.read) set.delete(item.read);
  } else {
    set.delete(scope);
  }
}

function createScopeCell(item, column) {
  const cell = document.createElement('span');
  cell.className = 'scope-cell';

  if (!item[column]) {
    cell.classList.add('scope-cell-empty');
    cell.textContent = '–';
    return cell;
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.scope = item[column];
  checkbox.dataset.column = column;
  checkbox.setAttribute('aria-label', `${t(column === 'read' ? 'scopes.read' : 'scopes.write')}: ${item.resource}`);
  checkbox.addEventListener('change', () => {
    toggleScope(item, column, checkbox.checked);
    refreshScopes();
  });
  cell.append(checkbox);
  return cell;
}

function createBadge(text, tone, title) {
  const badge = document.createElement('span');
  badge.className = 'pill';
  badge.dataset.tone = tone;
  badge.textContent = text;
  if (title) badge.title = title;
  return badge;
}

function createScopeRow(item) {
  const language = getLanguage();
  const label = scopeLabel(item.resource, language);
  const row = document.createElement('div');
  row.className = 'scope-row';
  row.dataset.searchText = normalizeText(
    [item.resource, scopeLabel(item.resource, 'en'), item.read, item.write].filter(Boolean).join(' ')
  );

  const resource = document.createElement('div');
  resource.className = 'scope-resource';

  const resourceName = document.createElement('span');
  resourceName.className = 'scope-resource-name';
  resourceName.textContent = label;
  if (item.approval) resourceName.append(createBadge(t('scopes.approval'), 'warning', t('scopes.approvalTitle')));
  if (item.deprecated) resourceName.append(createBadge(t('scopes.deprecated'), 'muted'));

  const codes = document.createElement('span');
  codes.className = 'scope-codes';
  codes.textContent = getScopesOfItem(item).join('  ·  ');

  resource.append(resourceName, codes);
  row.append(resource, createScopeCell(item, 'read'), createScopeCell(item, 'write'));
  return row;
}

function toggleGroupColumn(group, column) {
  const { set } = activeScopes();
  const bulkItems = group.items.filter((item) => item[column] && !item.approval && !item.deprecated);
  const isAllSelected = bulkItems.every((item) =>
    column === 'read' ? set.has(item.read) || isReadImplied(item) : set.has(item.write)
  );
  bulkItems.forEach((item) => {
    if (column === 'read' && isReadImplied(item)) return;
    toggleScope(item, column, !isAllSelected);
  });
  refreshScopes();
}

/* ---------- Presets ---------- */

// "read_x" conta como coberto quando "write_x" está marcado.
function isScopeCovered(scope) {
  const { set } = activeScopes();
  const item = ITEM_BY_SCOPE.get(scope);
  return set.has(scope) || Boolean(item && item.read === scope && item.write && set.has(item.write));
}

const isPresetApplied = (preset) => preset.scopes.every(isScopeCovered);

function togglePreset(preset) {
  const { set } = activeScopes();
  if (isPresetApplied(preset)) {
    preset.scopes.forEach((scope) => set.delete(scope));
  } else {
    preset.scopes.forEach((scope) => {
      const item = ITEM_BY_SCOPE.get(scope);
      if (item && item.read === scope && item.write && set.has(item.write)) return;
      set.add(scope);
      if (item && item.write === scope && item.read) set.delete(item.read);
    });
  }
  refreshScopes();
}

function renderPresets() {
  el.scopePresets.replaceChildren(
    ...SCOPE_PRESETS.map((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset';
      button.dataset.preset = preset.id;
      button.title = t('scopes.presetHint', { scopes: preset.scopes.join(', ') });
      const count = document.createElement('span');
      count.className = 'preset-count';
      count.textContent = preset.scopes.length;
      button.append(icon('plus'), t(`preset.${preset.id}`), count);
      button.addEventListener('click', () => togglePreset(preset));
      return button;
    })
  );
}

function refreshPresets() {
  SCOPE_PRESETS.forEach((preset) => {
    const applied = isPresetApplied(preset);
    const button = el.scopePresets.querySelector(`[data-preset="${preset.id}"]`);
    button.setAttribute('aria-pressed', String(applied));
    button.querySelector('use').setAttribute('href', applied ? '#i-check' : '#i-plus');
  });
}

function renderScopePicker() {
  renderPresets();
  const language = getLanguage();
  const sections = SCOPE_GROUPS.map((group) => {
    const section = document.createElement('section');
    section.className = 'scope-group';
    section.id = `scope-group-${group.id}`;

    const header = document.createElement('div');
    header.className = 'scope-group-header';
    const title = document.createElement('h3');
    title.textContent = scopeLabel(group.title, language);
    header.append(title);

    ['read', 'write'].forEach((column) => {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'column-toggle';
      toggle.textContent = t(column === 'read' ? 'scopes.read' : 'scopes.write');
      toggle.title = t('scopes.toggleColumn');
      toggle.addEventListener('click', () => toggleGroupColumn(group, column));
      header.append(toggle);
    });

    section.append(header, ...group.items.map(createScopeRow));
    return section;
  });

  const emptyResult = document.createElement('p');
  emptyResult.className = 'scope-empty-result';
  emptyResult.id = 'scope-empty-result';
  emptyResult.textContent = t('scopes.emptyResult');
  emptyResult.hidden = true;

  el.scopeGroupList.replaceChildren(...sections, emptyResult);

  el.scopeTopicNav.replaceChildren(
    ...SCOPE_GROUPS.map((group) => {
      const topic = document.createElement('button');
      topic.type = 'button';
      topic.className = 'topic';
      topic.dataset.groupId = group.id;
      const label = document.createElement('span');
      label.textContent = scopeLabel(group.title, language);
      const count = document.createElement('span');
      count.className = 'topic-count';
      topic.append(label, count);
      topic.addEventListener('click', () => {
        $(`scope-group-${group.id}`).scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      return topic;
    })
  );
  filterScopes();
}

function refreshScopes() {
  const { set } = activeScopes();
  el.scopeGroupList.querySelectorAll('input[data-scope]').forEach((checkbox) => {
    const item = ALL_SCOPE_ITEMS.find((candidate) => candidate[checkbox.dataset.column] === checkbox.dataset.scope);
    const isImplied = checkbox.dataset.column === 'read' && isReadImplied(item);
    checkbox.checked = isImplied || set.has(checkbox.dataset.scope);
    checkbox.disabled = isImplied;
    checkbox.title = isImplied ? t('scopes.implied', { scope: item.write }) : '';
  });

  SCOPE_GROUPS.forEach((group) => {
    const selectedCount = group.items.flatMap(getScopesOfItem).filter((scope) => set.has(scope)).length;
    const topic = el.scopeTopicNav.querySelector(`[data-group-id="${group.id}"]`);
    topic.dataset.hasSelection = String(selectedCount > 0);
    topic.querySelector('.topic-count').textContent = selectedCount > 0 ? selectedCount : '';
  });

  const totalCount = getSelectedScopes().length;
  const strong = document.createElement('strong');
  strong.textContent = totalCount;
  el.scopeCountOutput.replaceChildren(strong, ` ${t(totalCount === 1 ? 'scopes.selected.one' : 'scopes.selected.other')}`);

  renderSelectedChips();
  refreshPresets();
  refreshForm();
  if (prefs.tab !== 'edit') savePrefs();
}

function filterScopes() {
  const query = normalizeText(el.scopeSearchInput.value.trim());
  let visibleRowCount = 0;

  el.scopeGroupList.querySelectorAll('.scope-group').forEach((section) => {
    let visibleInGroup = 0;
    section.querySelectorAll('.scope-row').forEach((row) => {
      const isVisible = !query || row.dataset.searchText.includes(query);
      row.hidden = !isVisible;
      if (isVisible) visibleInGroup += 1;
    });
    section.hidden = visibleInGroup === 0;
    el.scopeTopicNav.querySelector(`[data-group-id="${section.id.replace('scope-group-', '')}"]`).hidden = section.hidden;
    visibleRowCount += visibleInGroup;
  });

  $('scope-empty-result').hidden = visibleRowCount > 0;
}

function removeScope(scope) {
  const state = activeScopes();
  state.set.delete(scope);
  state.extra = parseList(state.extra).filter((extra) => extra !== scope).join(', ');
  el.extraScopesInput.value = state.extra;
  refreshScopes();
}

function createChip(scope, onRemove) {
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.append(scope);
  if (onRemove) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', t('scopes.remove', { scope }));
    removeButton.append(icon('x'));
    removeButton.addEventListener('click', onRemove);
    chip.append(removeButton);
  } else {
    chip.classList.add('chip-static');
  }
  return chip;
}

function renderSelectedChips() {
  const scopes = getSelectedScopes();
  if (scopes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chip-box-empty';
    empty.textContent = t('scopes.emptyChips');
    el.selectedScopesOutput.replaceChildren(empty);
    return;
  }
  el.selectedScopesOutput.replaceChildren(...scopes.map((scope) => createChip(scope, () => removeScope(scope))));
}

function openScopes() {
  el.extraScopesInput.value = activeScopes().extra;
  refreshScopes();
  showView('scopes');
  el.scopeSearchInput.focus({ preventScroll: true });
}

/* ---------- Tarefa (roda no service worker) ---------- */

function renderJob(job) {
  currentJob = job;
  const running = job.status === 'running';
  const titles = { create: 'job.createTitle', edit: 'job.editTitle' };

  el.jobTitle.textContent = titles[job.kind] ? t(titles[job.kind], { name: job.title }) : job.title;
  el.jobShop.textContent = job.shop ?? '';

  el.jobSteps.replaceChildren(
    ...job.steps
      .filter((step) => step.status !== 'skipped')
      .map((step) => {
        const item = document.createElement('li');
        item.className = 'step';
        if (step.status !== 'pending') item.dataset.status = step.status;
        const marker = document.createElement('span');
        marker.className = 'step-icon';
        if (step.status === 'done') marker.append(icon('check'));
        if (step.status === 'failed') marker.append(icon('x'));
        item.append(marker, t(`step.${step.id}`));
        return item;
      })
  );

  // Tudo certo: as etapas viram uma linha só e sobra espaço para o token.
  const done = job.status === 'done';
  el.jobSteps.hidden = done;
  el.jobSuccess.hidden = !done;
  el.jobSuccessTitle.textContent = t(job.kind === 'edit' ? 'job.successEdit' : 'job.successToken');
  el.jobSuccessText.textContent = t(job.kind === 'edit' ? 'job.successEditText' : 'job.successTokenText');
  el.jobError.hidden = job.status !== 'error';
  el.jobErrorText.textContent = job.error ?? '';

  const result = job.result;
  el.jobResult.hidden = !result?.accessToken;
  if (result?.accessToken) {
    el.tokenOutput.textContent = result.accessToken;
    el.tokenOutput.title = result.accessToken;
    el.grantedScopesOutput.replaceChildren(...result.grantedScopes.map((scope) => createChip(scope)));
    setPill(el.grantedCount, String(result.grantedScopes.length));

    const info = result.shopInfo;
    el.shopFacts.hidden = !info;
    if (info) {
      const facts = {
        name: info.name,
        plan: info.plan?.publicDisplayName ?? '—',
        currencyCode: info.currencyCode,
        apiVersion: info.apiVersion
      };
      Object.entries(facts).forEach(([key, value]) => {
        el.shopFacts.querySelector(`[data-fact="${key}"]`).textContent = value;
      });
    }
  }

  el.jobWaitingHint.hidden = !running || job.kind === 'edit';
  el.newJobButton.hidden = running;
  showView('job');
  if (!running) chrome.action.setBadgeText({ text: '' });
}

async function handleNewJob() {
  await send('clear-job');
}

async function handleCopyToken() {
  await navigator.clipboard.writeText(el.tokenOutput.textContent);
  const label = el.copyTokenButton.querySelector('span');
  el.copyTokenButton.dataset.copied = 'true';
  label.textContent = t('job.copied');
  setTimeout(() => {
    el.copyTokenButton.dataset.copied = 'false';
    label.textContent = t('job.copy');
  }, 1800);
}

/* ---------- Roteamento ---------- */

async function route() {
  const { [JOB_KEY]: job } = await chrome.storage.session.get(JOB_KEY);
  if (job) {
    renderJob(job);
    if (await hasSession()) setSessionPill('ok', 'session.ok');
    else setSessionPill('idle', 'session.signedOut');
    return;
  }
  currentJob = null;
  if (!(await hasSession())) {
    await showLogin();
    return;
  }
  if (currentView !== 'main' && currentView !== 'scopes') showView('main');
  if (!organizationsLoaded) await loadOrganizations();
  else {
    setSessionPill('ok', 'session.ok');
    if (prefs.tab === 'edit') loadEditDetails();
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  if (JOB_KEY in changes) {
    const job = changes[JOB_KEY].newValue;
    if (job) renderJob(job);
    else route();
    return;
  }
  if (LOGIN_KEY in changes && currentView === 'login') {
    const login = changes[LOGIN_KEY].newValue;
    if (login?.status === 'idle') route();
    else renderLogin(login);
    return;
  }
  if (SESSION_KEY in changes && !changes[SESSION_KEY].newValue && currentView !== 'job') {
    organizationsLoaded = false;
    showLogin();
  }
});

/* ---------- Init ---------- */

async function init() {
  const { [PREFS_KEY]: saved } = await chrome.storage.local.get(PREFS_KEY);
  Object.assign(prefs, saved ?? {});
  prefs.language = await loadLanguage();
  if (!['token', 'create', 'edit'].includes(prefs.tab)) prefs.tab = 'token';

  scopeState.create.set = new Set(prefs.scopes ?? []);
  scopeState.create.extra = prefs.extraScopes ?? '';
  el.appNameInput.value = prefs.tab === 'create' ? prefs.appName ?? '' : '';
  el.storeInput.value = prefs.shop ?? '';

  applyI18n();
  renderLanguageSwitch();
  setSessionPill('loading', 'session.connecting');
  renderScopePicker();
  setTab(prefs.tab);

  await route();
}

el.langButtons.forEach((button) => button.addEventListener('click', () => changeLanguage(button.dataset.lang)));
el.loginButton.addEventListener('click', handleLogin);
el.logoutButton.addEventListener('click', handleLogout);
el.retryButton.addEventListener('click', () => {
  orgData.delete(el.organizationSelect.value);
  return organizationsLoaded ? loadOrganizationData() : loadOrganizations();
});
el.organizationSelect.addEventListener('change', handleOrganizationChange);
el.tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
el.appSelect.addEventListener('change', () => {
  prefs.clientId = el.appSelect.value;
  savePrefs();
  if (prefs.tab === 'edit') loadEditDetails();
  refreshForm();
});
el.appNameInput.addEventListener('input', () => {
  if (prefs.tab === 'create') {
    prefs.appName = el.appNameInput.value;
    savePrefs();
  }
  refreshForm();
});
el.appUrlInput.addEventListener('input', refreshForm);
el.redirectsInput.addEventListener('input', refreshForm);
el.storeInput.addEventListener('input', () => {
  prefs.shop = el.storeInput.value.trim();
  savePrefs();
  storeActiveIndex = -1;
  renderStoreList();
  refreshForm();
});
el.storeInput.addEventListener('focus', renderStoreList);
el.storeInput.addEventListener('click', () => {
  if (el.storeList.hidden) renderStoreList();
});
el.storeInput.addEventListener('blur', closeStoreList);
el.storeInput.addEventListener('keydown', handleStoreKeydown);
el.runButton.addEventListener('click', handleRun);

el.openScopesButton.addEventListener('click', openScopes);
el.closeScopesButton.addEventListener('click', () => showView('main'));
el.doneScopesButton.addEventListener('click', () => showView('main'));
el.clearScopesButton.addEventListener('click', () => {
  const state = activeScopes();
  state.set.clear();
  state.extra = '';
  el.extraScopesInput.value = '';
  refreshScopes();
});
el.scopeSearchInput.addEventListener('input', filterScopes);
el.extraScopesInput.addEventListener('input', () => {
  activeScopes().extra = el.extraScopesInput.value;
  refreshScopes();
});

el.copyTokenButton.addEventListener('click', handleCopyToken);
el.newJobButton.addEventListener('click', handleNewJob);

init();
