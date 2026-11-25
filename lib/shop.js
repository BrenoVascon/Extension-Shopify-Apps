import { t } from './i18n.js';

// Normaliza o que o usuário digitou para `loja.myshopify.com`.
// Aceita `loja`, `loja.myshopify.com`, `https://loja.myshopify.com/admin` etc.
// Retorna null para qualquer coisa que não seja um domínio myshopify, para
// nunca mandar credenciais a um host arbitrário.
export function normalizeShop(input) {
  let shop = String(input ?? '').trim().toLowerCase();
  if (!shop) return null;

  shop = shop
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/^\.+|\.+$/g, '');

  if (!shop.includes('.')) shop = `${shop}.myshopify.com`;

  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : null;
}

// Versões da Admin API tentadas no teste do token, da mais nova para a mais
// antiga: a Shopify aposenta versões e uma constante única passaria a dar 404.
const ADMIN_API_VERSIONS = ['2026-10', '2026-07', '2026-04', '2026-01', '2025-10'];

const SHOP_QUERY = `{ shop { name myshopifyDomain currencyCode plan { publicDisplayName } } }`;

// Prova que o token autentica e lê a identidade da loja.
export async function testAdminToken(shopDomain, accessToken) {
  let lastStatus = 404;

  for (const apiVersion of ADMIN_API_VERSIONS) {
    const response = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query: SHOP_QUERY })
    });

    lastStatus = response.status;
    if (response.status === 404) continue;
    if (response.status === 401) throw new Error(t('err.token401'));
    if (response.status === 403) throw new Error(t('err.token403'));

    const body = await response.json().catch(() => null);
    if (body?.errors?.length) throw new Error(body.errors.map((error) => error.message).join('; '));
    if (!response.ok || !body?.data?.shop) throw new Error(t('err.shopStatus', { status: response.status }));

    return { apiVersion, shop: body.data.shop };
  }

  throw new Error(t('err.noApiVersion', { status: lastStatus }));
}
