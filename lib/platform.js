// Mesmas APIs e operações GraphQL que a Shopify CLI usa em `app init` / `app deploy` / `app env show`.
import { getApiToken } from './identity.js';
import { t } from './i18n.js';

const BUSINESS_PLATFORM_URL = 'https://destinations.shopifysvc.com/destinations/api/2020-07/graphql';
const ORGANIZATION_URL = (organizationId) =>
  `https://destinations.shopifysvc.com/organizations/api/unstable/organization/${organizationId}/graphql`;
const APP_MANAGEMENT_URL = 'https://app.shopify.com/app_management/unstable/graphql.json';
const APP_MANAGEMENT_ORG_URL = (organizationId) =>
  `https://app.shopify.com/app_management/unstable/organizations/${organizationId}/graphql.json`;

const WEBHOOKS_API_VERSION = '2026-10';

async function graphql(apiName, url, query, variables = {}) {
  const token = await getApiToken(apiName);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (response.status === 401) throw new Error(t('err.sessionExpired'));
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) throw new Error(t('err.api', { status: response.status }));
  if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join('; '));
  return body.data;
}

function throwOnUserErrors(result) {
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((error) => error.message).join('; '));
  }
}

// IDs de organização chegam como GID, às vezes em base64. Normaliza para o número.
function toNumericId(id) {
  let value = String(id);
  if (!value.startsWith('gid://') && !/^\d+$/.test(value)) {
    try {
      value = atob(value);
    } catch {
      return value;
    }
  }
  return value.startsWith('gid://') ? value.split('/').pop() : value;
}

/* ---------- Organizações e lojas (Business Platform) ---------- */

const LIST_ORGANIZATIONS = `query ListOrganizations {
  currentUserAccount {
    organizationsWithAccessToDestination(destination: APPS_CLI) {
      nodes { id name status }
    }
  }
}`;

export async function listOrganizations() {
  const data = await graphql('businessPlatform', BUSINESS_PLATFORM_URL, LIST_ORGANIZATIONS);
  const nodes = data.currentUserAccount?.organizationsWithAccessToDestination?.nodes ?? [];
  return nodes
    .map((organization) => ({ id: toNumericId(organization.id), name: organization.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const LIST_ACCESSIBLE_SHOPS = `query ListAccessibleShops($first: Int!) {
  organization {
    accessibleShops(first: $first, sort: SHOP_CREATED_AT_DESC) {
      edges { node { id name storeType primaryDomain url } }
    }
  }
}`;

const toShopDomain = (shop) => {
  const source = shop.url ?? shop.primaryDomain ?? '';
  try {
    return new URL(source.includes('://') ? source : `https://${source}`).hostname;
  } catch {
    return source;
  }
};

export async function listStores(organizationId) {
  const data = await graphql('businessPlatform', ORGANIZATION_URL(organizationId), LIST_ACCESSIBLE_SHOPS, { first: 100 });
  const edges = data.organization?.accessibleShops?.edges ?? [];
  return edges
    .map(({ node }) => ({ name: node.name, domain: toShopDomain(node), storeType: node.storeType }))
    .filter((store) => store.domain)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- Apps (App Management) ---------- */

function buildAppSource({ name, scopes, redirectUrls, appUrl }) {
  return {
    name,
    modules: [
      { type: 'app_home', config: { app_url: appUrl, embedded: false } },
      { type: 'branding', config: { name } },
      { type: 'webhooks', config: { api_version: WEBHOOKS_API_VERSION } },
      {
        type: 'app_access',
        config: {
          redirect_url_allowlist: redirectUrls,
          scopes: scopes.join(','),
          use_legacy_install_flow: true
        }
      }
    ]
  };
}

const CREATE_APP = `mutation CreateApp($initialVersion: AppVersionInput!, $organizationId: ID!) {
  appCreate(initialVersion: $initialVersion, organizationId: $organizationId) {
    app { id key }
    userErrors { category message on }
  }
}`;

export async function createApp(organizationId, config) {
  const data = await graphql('appManagement', APP_MANAGEMENT_URL, CREATE_APP, {
    organizationId: `gid://shopify/Organization/${organizationId}`,
    initialVersion: { source: buildAppSource(config) }
  });
  throwOnUserErrors(data.appCreate);
  const { id, key } = data.appCreate.app;
  return { appId: id, clientId: key };
}

const CREATE_APP_VERSION = `mutation CreateAppVersion($appId: ID!, $version: AppVersionInput!, $metadata: VersionMetadataInput) {
  appVersionCreate(appId: $appId, version: $version, metadata: $metadata) {
    version { id metadata { versionTag } }
    userErrors { field message category code on }
  }
}`;

const RELEASE_VERSION = `mutation ReleaseVersion($appId: ID!, $versionId: ID!) {
  appReleaseCreate(appId: $appId, versionId: $versionId) {
    release { version { id } }
    userErrors { field message category code on }
  }
}`;

// Igual a `shopify app deploy`: cria uma versão com o source e publica.
async function releaseSource(appId, source) {
  const created = await graphql('appManagement', APP_MANAGEMENT_URL, CREATE_APP_VERSION, {
    appId,
    version: { source },
    metadata: { message: 'Shopify App Creator' }
  });
  throwOnUserErrors(created.appVersionCreate);
  const versionId = created.appVersionCreate.version.id;

  const released = await graphql('appManagement', APP_MANAGEMENT_URL, RELEASE_VERSION, { appId, versionId });
  throwOnUserErrors(released.appReleaseCreate);
  return { versionId };
}

export const deployVersion = (appId, config) => releaseSource(appId, buildAppSource(config));

/* ---------- Apps existentes ---------- */

const LIST_APPS = `query listApps($query: String) {
  appsConnection(query: $query, first: 50) {
    edges { node { id key activeRelease { id version { name } } } }
    pageInfo { hasNextPage }
  }
}`;

export async function listApps(organizationId) {
  const data = await graphql('appManagement', APP_MANAGEMENT_ORG_URL(organizationId), LIST_APPS, { query: '' });
  const edges = data.appsConnection?.edges ?? [];
  return edges
    .map(({ node }) => ({ clientId: node.key, name: node.activeRelease?.version?.name ?? node.key }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const ACTIVE_APP_RELEASE = `query ActiveAppReleaseFromApiKey($apiKey: String!) {
  app: appByKey(key: $apiKey) {
    id
    key
    activeRelease {
      version {
        name
        appModules {
          uuid
          userIdentifier
          handle
          config
          target
          specification { identifier externalIdentifier name experience }
        }
      }
    }
  }
}`;

const parseConfig = (config) => {
  if (config && typeof config === 'object') return structuredClone(config);
  try {
    return JSON.parse(config) ?? {};
  } catch {
    return {};
  }
};

const toList = (value) =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((item) => String(item).trim())
    .filter(Boolean);

const moduleId = (module) => module.specification?.identifier;

// Lê a versão ativa inteira: dá para gerar token, editar e republicar sem perder nada.
export async function getAppDetails(clientId) {
  const data = await graphql('appManagement', APP_MANAGEMENT_URL, ACTIVE_APP_RELEASE, { apiKey: clientId });
  if (!data.app) throw new Error(t('err.appNotFound'));
  const version = data.app.activeRelease?.version;
  if (!version) throw new Error(t('err.noVersion'));

  const modules = version.appModules.map((module) => ({ ...module, config: parseConfig(module.config) }));
  const find = (id) => modules.find((module) => moduleId(module) === id)?.config ?? {};
  const access = find('app_access');

  // Extensões têm código (bundle) que só a CLI sobe; republicar sem ele apagaria a extensão.
  const extensions = modules
    .filter((module) => module.specification?.experience === 'extension')
    .map((module) => module.handle || module.specification?.name || moduleId(module));

  return {
    appId: data.app.id,
    clientId: data.app.key,
    name: version.name,
    appUrl: find('app_home').app_url ?? '',
    redirectUrls: toList(access.redirect_url_allowlist ?? access.auth?.redirect_urls),
    scopes: toList(access.scopes ?? access.access_scopes?.scopes),
    extensions,
    editable: extensions.length === 0,
    modules
  };
}

// Aplica as mudanças só nos campos editados; o resto da config vai como veio.
// Formato que não reconhecemos = erro, para nunca sobrescrever redirects/escopos às cegas.
function patchAccess(config, { scopes, redirectUrls }) {
  const mentions = (word) => JSON.stringify(config).toLowerCase().includes(word);

  if (redirectUrls) {
    if ('redirect_url_allowlist' in config) config.redirect_url_allowlist = redirectUrls;
    else if (config.auth && 'redirect_urls' in config.auth) config.auth.redirect_urls = redirectUrls;
    else if (mentions('redirect')) throw new Error(t('err.unknownConfig'));
    else config.redirect_url_allowlist = redirectUrls;
  }
  if (scopes) {
    if ('scopes' in config) config.scopes = Array.isArray(config.scopes) ? scopes : scopes.join(',');
    else if (config.access_scopes && 'scopes' in config.access_scopes) config.access_scopes.scopes = scopes.join(',');
    else if (mentions('scope')) throw new Error(t('err.unknownConfig'));
    else config.scopes = scopes.join(',');
  }
  return config;
}

function buildPatchedSource(details, patch) {
  const modules = details.modules.map((module) => {
    const config = structuredClone(module.config);
    const id = moduleId(module);
    if (id === 'branding' && patch.name) config.name = patch.name;
    if (id === 'app_home' && patch.appUrl) config.app_url = patch.appUrl;
    if (id === 'app_access') patchAccess(config, patch);

    const input = {
      type: module.specification?.externalIdentifier ?? id,
      handle: module.handle,
      uid: module.userIdentifier,
      config
    };
    if (module.target) input.target = module.target;
    return input;
  });

  if ((patch.scopes || patch.redirectUrls) && !details.modules.some((module) => moduleId(module) === 'app_access')) {
    modules.push({ type: 'app_access', config: patchAccess({}, patch) });
  }
  if (patch.name && !details.modules.some((module) => moduleId(module) === 'branding')) {
    modules.push({ type: 'branding', config: { name: patch.name } });
  }

  return { name: patch.name ?? details.name, modules };
}

// Edita um app que só tem configuração (sem extensões) e publica a versão nova.
export function updateApp(details, patch) {
  if (!details.editable) throw new Error(t('edit.blocked', { modules: details.extensions.join(', ') }));
  return releaseSource(details.appId, buildPatchedSource(details, patch));
}

const APP_CLIENT_CREDENTIALS = `query AppClientCredentials($apiKey: String!) {
  app: appByKey(key: $apiKey) {
    activeRoot { clientCredentials { secrets { key } } }
  }
}`;

export async function getClientSecret(clientId) {
  const data = await graphql('appManagement', APP_MANAGEMENT_URL, APP_CLIENT_CREDENTIALS, { apiKey: clientId });
  const secret = data.app?.activeRoot?.clientCredentials?.secrets?.[0]?.key;
  if (!secret) throw new Error(t('err.noSecret'));
  return secret;
}
