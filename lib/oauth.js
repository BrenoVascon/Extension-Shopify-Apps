// Instala o app na loja pelo OAuth e devolve o token offline (shpat_).
// O retorno do OAuth é capturado sozinho, sem colar a URL de callback:
// - redirect da própria extensão (*.chromiumapp.org) → chrome.identity;
// - redirect em localhost (padrão do gerador de shpat) → aba vigiada pela extensão.
import { t } from './i18n.js';

export function getRedirectUrl() {
  return chrome.identity.getRedirectURL('shopify');
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

// Escolhe, entre os redirects cadastrados no app, um que a extensão consegue capturar.
export function pickCapturableRedirect(redirectUrls) {
  const own = getRedirectUrl();
  if (redirectUrls.includes(own)) return own;
  return (
    redirectUrls.find((url) => {
      const parsed = parseUrl(url);
      return parsed?.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname);
    }) ?? null
  );
}

const sameEndpoint = (candidate, redirectUrl) => {
  const a = parseUrl(candidate);
  const b = parseUrl(redirectUrl);
  return Boolean(a && b) && a.origin === b.origin && a.pathname === b.pathname;
};

function captureRedirectInTab(authorizeUrl, redirectUrl) {
  return new Promise((resolve, reject) => {
    let tabId = null;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };
    const onUpdated = (id, change) => {
      if (id !== tabId || !change.url || !sameEndpoint(change.url, redirectUrl)) return;
      cleanup();
      chrome.tabs.remove(id).catch(() => {});
      resolve(change.url);
    };
    const onRemoved = (id) => {
      if (id !== tabId) return;
      cleanup();
      reject(new Error(t('err.tabClosed')));
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.create({ url: authorizeUrl }).then(
      (tab) => {
        tabId = tab.id;
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}

export async function installAndGetOfflineToken({ shopDomain, clientId, clientSecret, scopes, redirectUrl }) {
  const state = crypto.randomUUID();
  const authorizeUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUrl, state });
  // Sem escopos, a Shopify usa os da configuração do app.
  if (scopes?.length) params.set('scope', scopes.join(','));
  authorizeUrl.search = params;

  const callbackUrl =
    redirectUrl === getRedirectUrl()
      ? await chrome.identity.launchWebAuthFlow({ url: authorizeUrl.toString(), interactive: true })
      : await captureRedirectInTab(authorizeUrl.toString(), redirectUrl);

  const callbackParams = new URL(callbackUrl).searchParams;

  const oauthError = callbackParams.get('error_description') ?? callbackParams.get('error');
  if (oauthError) throw new Error(t('err.installRefused', { error: oauthError }));
  if (callbackParams.get('state') !== state) {
    throw new Error(t('err.state'));
  }
  if (callbackParams.get('shop') !== shopDomain) {
    throw new Error(t('err.shopMismatch'));
  }
  if (!(await isValidHmac(callbackParams, clientSecret))) {
    throw new Error(t('err.hmac'));
  }

  return exchangeCodeForToken({
    shopDomain,
    clientId,
    clientSecret,
    code: callbackParams.get('code')
  });
}

async function exchangeCodeForToken({ shopDomain, clientId, clientSecret, code }) {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    const detail = body.error_description ?? body.error;
    throw new Error(t('err.exchange', { detail: `${response.status}${detail ? `: ${detail}` : ''}` }));
  }

  return {
    accessToken: body.access_token,
    grantedScopes: String(body.scope ?? '').split(',').map((scope) => scope.trim()).filter(Boolean)
  };
}

async function isValidHmac(params, clientSecret) {
  const receivedHmac = params.get('hmac');
  if (!receivedHmac) return false;

  const message = [...params.entries()]
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(clientSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const computedHmac = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return computedHmac === receivedHmac;
}
