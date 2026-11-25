// Login na Shopify Identity do mesmo jeito que a Shopify CLI faz:
// device authorization flow + token exchange por API (audience).
// Valores tirados do bundle da @shopify/cli 5.1.0.
import { t } from './i18n.js';

const IDENTITY_ORIGIN = 'https://accounts.shopify.com';
const CLI_CLIENT_ID = 'fbdb2649-e327-4907-8f67-908d24cfd7e3';

const SCOPE_APP_MANAGEMENT = 'https://api.shopify.com/auth/organization.apps.manage';
const SCOPE_DESTINATIONS = 'https://api.shopify.com/auth/destinations.readonly';

export const AUDIENCES = {
  appManagement: { audience: '7ee65a63608843c577db8b23c4d7316ea0a01bd2f7594f8a9c06ea668c1b775c', scope: SCOPE_APP_MANAGEMENT },
  businessPlatform: { audience: '32ff8ee5-82b8-4d93-9f8a-c6997cefb7dc', scope: SCOPE_DESTINATIONS }
};

// Fica só na memória do navegador: some quando o Chrome fecha. Enquanto ele
// estiver aberto, o refresh token renova o acesso sem pedir login de novo.
export const SESSION_KEY = 'shopifySession';
const EXPIRY_MARGIN_MS = 60_000;

async function postForm(path, params) {
  const response = await fetch(`${IDENTITY_ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params).toString()
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

const toExpiry = (expiresInSeconds) => Date.now() + (Number(expiresInSeconds) || 3600) * 1000;
const isValid = (token) => Boolean(token?.accessToken) && token.expiresAt - EXPIRY_MARGIN_MS > Date.now();

async function readSession() {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  return stored[SESSION_KEY] ?? null;
}

async function writeSession(session) {
  await chrome.storage.session.set({ [SESSION_KEY]: session });
}

export async function logout() {
  await chrome.storage.session.remove(SESSION_KEY);
}

const toIdentity = (body, previous = {}) => ({
  accessToken: body.access_token,
  refreshToken: body.refresh_token ?? previous.refreshToken,
  expiresAt: toExpiry(body.expires_in)
});

// Igual à CLI: troca o refresh token por um access token novo sem pedir login.
async function refreshIdentity(session) {
  const { refreshToken, accessToken } = session.identity ?? {};
  if (!refreshToken) return null;

  const { ok, body } = await postForm('/oauth/token', {
    grant_type: 'refresh_token',
    access_token: accessToken,
    refresh_token: refreshToken,
    client_id: CLI_CLIENT_ID
  });
  if (!ok || !body.access_token) {
    await logout();
    return null;
  }

  const refreshed = { identity: toIdentity(body, session.identity), apis: {} };
  await writeSession(refreshed);
  return refreshed;
}

// Sessão válida (renovando se preciso) ou null.
async function readValidSession() {
  const session = await readSession();
  if (!session) return null;
  if (isValid(session.identity)) return session;
  return refreshIdentity(session);
}

export async function hasSession() {
  return Boolean(await readValidSession());
}

export async function startDeviceLogin() {
  const { ok, body } = await postForm('/oauth/device_authorization', {
    client_id: CLI_CLIENT_ID,
    scope: ['openid', SCOPE_APP_MANAGEMENT, SCOPE_DESTINATIONS].join(' ')
  });
  if (!ok || !body.device_code || !body.verification_uri_complete) {
    throw new Error(body.error_description || t('err.loginStart'));
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUrl: body.verification_uri_complete,
    intervalSeconds: Number(body.interval) || 5,
    expiresAt: toExpiry(body.expires_in || 600)
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForDeviceLogin(login, { signal } = {}) {
  let intervalMs = login.intervalSeconds * 1000;

  while (Date.now() < login.expiresAt) {
    await sleep(intervalMs);
    if (signal?.aborted) throw new Error(t('err.loginCancelled'));

    const { ok, body } = await postForm('/oauth/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: login.deviceCode,
      client_id: CLI_CLIENT_ID
    });

    if (ok) {
      await writeSession({ identity: toIdentity(body), apis: {} });
      return;
    }

    if (body.error === 'authorization_pending') continue;
    if (body.error === 'slow_down') {
      intervalMs += 5000;
      continue;
    }
    if (body.error === 'access_denied') throw new Error(t('err.loginDenied'));
    if (body.error === 'expired_token') break;
    throw new Error(body.error_description || t('err.login', { error: body.error ?? '?' }));
  }
  throw new Error(t('err.loginExpired'));
}

export async function getApiToken(apiName) {
  const session = await readValidSession();
  if (!session) {
    throw new Error(t('err.sessionExpired'));
  }

  const cached = session.apis?.[apiName];
  if (isValid(cached)) return cached.accessToken;

  const { audience, scope } = AUDIENCES[apiName];
  const { ok, body } = await postForm('/oauth/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    client_id: CLI_CLIENT_ID,
    audience,
    scope,
    subject_token: session.identity.accessToken
  });
  if (!ok) {
    throw new Error(body.error_description || t('err.apiAuth', { error: body.error ?? '?' }));
  }

  const token = { accessToken: body.access_token, expiresAt: toExpiry(body.expires_in) };
  await writeSession({ ...session, apis: { ...session.apis, [apiName]: token } });
  return token.accessToken;
}
