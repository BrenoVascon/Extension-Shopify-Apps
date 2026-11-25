const scope = (resource, read, write, flags = {}) => ({ resource, read, write, ...flags });

export const SCOPE_GROUPS = [
  {
    id: 'products',
    title: 'Produtos e catálogo',
    items: [
      scope('Produtos, variantes e coleções', 'read_products', 'write_products'),
      scope('Listagem de produtos no canal', 'read_product_listings', null),
      scope('Publicações e canais', 'read_publications', 'write_publications'),
      scope('Feedback de recursos', 'read_resource_feedbacks', 'write_resource_feedbacks'),
      scope('Arquivos e mídias', 'read_files', 'write_files')
    ]
  },
  {
    id: 'orders',
    title: 'Pedidos',
    items: [
      scope('Pedidos (últimos 60 dias)', 'read_orders', 'write_orders'),
      scope('Todos os pedidos (histórico)', 'read_all_orders', null, { approval: true }),
      scope('Pedidos rascunho', 'read_draft_orders', 'write_draft_orders'),
      scope('Edição de pedidos', 'read_order_edits', 'write_order_edits'),
      scope('Devoluções', 'read_returns', 'write_returns'),
      scope('Pedidos de marketplace', 'read_marketplace_orders', 'write_marketplace_orders', { approval: true }),
      scope('Devoluções de marketplace', 'read_marketplace_returns', 'write_marketplace_returns', { approval: true })
    ]
  },
  {
    id: 'fulfillment',
    title: 'Fulfillment e entrega',
    items: [
      scope('Fulfillment atribuído ao app', 'read_assigned_fulfillment_orders', 'write_assigned_fulfillment_orders'),
      scope('Fulfillment gerenciado pela loja', 'read_merchant_managed_fulfillment_orders', 'write_merchant_managed_fulfillment_orders'),
      scope('Fulfillment de terceiros', 'read_third_party_fulfillment_orders', 'write_third_party_fulfillment_orders'),
      scope('Fulfillment de marketplace', 'read_marketplace_fulfillment_orders', null, { approval: true }),
      scope('Serviços de fulfillment', 'read_fulfillments', 'write_fulfillments'),
      scope('Regras de restrição de fulfillment', 'read_fulfillment_constraint_rules', 'write_fulfillment_constraint_rules'),
      scope('App que criou retenções', 'read_apps', null, { approval: true }),
      scope('Frete e transportadoras', 'read_shipping', 'write_shipping'),
      scope('Personalização de entrega', 'read_delivery_customizations', 'write_delivery_customizations'),
      scope('Promessas de entrega', 'read_delivery_promises', 'write_delivery_promises', { approval: true })
    ]
  },
  {
    id: 'inventory',
    title: 'Estoque e locais',
    items: [
      scope('Itens e níveis de estoque', 'read_inventory', 'write_inventory'),
      scope('Remessas de estoque', 'read_inventory_shipments', 'write_inventory_shipments'),
      scope('Itens recebidos em remessas', 'read_inventory_shipments_received_items', 'write_inventory_shipments_received_items'),
      scope('Transferências de estoque', 'read_inventory_transfers', 'write_inventory_transfers'),
      scope('Locais', 'read_locations', 'write_locations')
    ]
  },
  {
    id: 'customers',
    title: 'Clientes e B2B',
    items: [
      scope('Clientes e segmentos', 'read_customers', 'write_customers'),
      scope('Empresas (B2B)', 'read_companies', 'write_companies'),
      scope('Mesclagem de clientes', 'read_customer_merge', 'write_customer_merge'),
      scope('Exclusão de dados do cliente', 'read_customer_data_erasure', 'write_customer_data_erasure'),
      scope('Métodos de pagamento do cliente', 'read_customer_payment_methods', null, { approval: true }),
      scope('Contas de crédito da loja', 'read_store_credit_accounts', null),
      scope('Transações de crédito da loja', 'read_store_credit_account_transactions', 'write_store_credit_account_transactions')
    ]
  },
  {
    id: 'discounts',
    title: 'Descontos, marketing e vale-presente',
    items: [
      scope('Descontos', 'read_discounts', 'write_discounts'),
      scope('Price rules (removido na 2026-10)', 'read_price_rules', 'write_price_rules', { deprecated: true }),
      scope('Rollouts de descontos', 'read_rollouts', null),
      scope('Eventos de marketing', 'read_marketing_events', 'write_marketing_events'),
      scope('Vale-presentes', 'read_gift_cards', 'write_gift_cards'),
      scope('Transações de vale-presente', 'read_gift_card_transactions', 'write_gift_card_transactions')
    ]
  },
  {
    id: 'checkout',
    title: 'Checkout e pagamentos',
    items: [
      scope('Marca do checkout', 'read_checkout_branding_settings', 'write_checkout_branding_settings'),
      scope('Configuração de checkout e contas', 'read_checkout_and_accounts_configurations', 'write_checkout_and_accounts_configurations'),
      scope('Configurações de checkout', 'read_checkout_settings', 'write_checkout_settings', { approval: true }),
      scope('Transformação de carrinho', 'read_cart_transforms', 'write_cart_transforms'),
      scope('Validações', 'read_validations', 'write_validations'),
      scope('Personalização de pagamento', 'read_payment_customizations', 'write_payment_customizations'),
      scope('Condições de pagamento', 'read_payment_terms', 'write_payment_terms'),
      scope('Gateways de pagamento', 'read_payment_gateways', 'write_payment_gateways', { approval: true }),
      scope('Sessões de pagamento', 'read_payment_sessions', 'write_payment_sessions', { approval: true }),
      scope('Mandatos de pagamento', 'read_payment_mandate', 'write_payment_mandate', { approval: true }),
      scope('Contratos de assinatura do app', 'read_own_subscription_contracts', 'write_own_subscription_contracts', { approval: true }),
      scope('Caixa do PDV', 'read_cash_tracking', 'write_cash_tracking')
    ]
  },
  {
    id: 'shopify-payments',
    title: 'Shopify Payments',
    items: [
      scope('Conta e agenda de repasses', 'read_shopify_payments', null, { approval: true }),
      scope('Contas', 'read_shopify_payments_accounts', null),
      scope('Dados sensíveis da conta', 'read_shopify_payments_accounts_sensitive', null, { approval: true }),
      scope('Contas bancárias', 'read_shopify_payments_bank_accounts', null),
      scope('Repasses e saldo', 'read_shopify_payments_payouts', null),
      scope('Disputas', 'read_shopify_payments_disputes', null),
      scope('Evidências de disputa', 'read_shopify_payments_dispute_evidences', 'write_shopify_payments_dispute_evidences', { approval: true }),
      scope('Upload de arquivos de disputa', 'read_shopify_payments_dispute_file_uploads', 'write_shopify_payments_dispute_file_uploads', { approval: true }),
      scope('Informações KYC financeiras', 'read_financial_kyc_information', null, { approval: true })
    ]
  },
  {
    id: 'online-store',
    title: 'Loja online e conteúdo',
    items: [
      scope('Temas', 'read_themes', 'write_themes'),
      scope('Blogs, artigos e páginas', 'read_content', 'write_content'),
      scope('Páginas da loja online', 'read_online_store_pages', 'write_online_store_pages'),
      scope('Navegação e redirecionamentos', 'read_online_store_navigation', 'write_online_store_navigation'),
      scope('Metaobjetos', 'read_metaobjects', 'write_metaobjects'),
      scope('Definições de metaobjetos', 'read_metaobject_definitions', 'write_metaobject_definitions'),
      scope('Script tags', 'read_script_tags', 'write_script_tags'),
      scope('App proxy', null, 'write_app_proxy'),
      scope('Políticas da loja', 'read_legal_policies', 'write_legal_policies'),
      scope('Privacidade e banner de cookies', 'read_privacy_settings', 'write_privacy_settings')
    ]
  },
  {
    id: 'markets',
    title: 'Mercados e idiomas',
    items: [
      scope('Mercados', 'read_markets', 'write_markets'),
      scope('Metafields de mercados', 'read_market_metafields', 'write_market_metafields'),
      scope('Idiomas da loja', 'read_locales', 'write_locales'),
      scope('Traduções', 'read_translations', 'write_translations')
    ]
  },
  {
    id: 'analytics',
    title: 'Análises e pixels',
    items: [
      scope('Relatórios (ShopifyQL)', 'read_reports', 'write_reports'),
      scope('Anotações de análise', 'read_analytics_annotations', 'write_analytics_annotations'),
      scope('Pixels web e de servidor', 'read_pixels', 'write_pixels'),
      scope('Eventos do cliente', 'read_customer_events', null)
    ]
  },
  {
    id: 'store-settings',
    title: 'Loja, equipe e impostos',
    items: [
      scope('Equipe (staff)', 'read_users', null, { approval: true }),
      scope('Leitura de impostos', 'read_taxes', null, { approval: true }),
      scope('Cálculo de impostos', null, 'write_taxes', { approval: true }),
      scope('Sinais de aprovação do lojista', 'read_merchant_approval_signals', null, { approval: true }),
      scope('Apps mobile da loja', 'read_mobile_platform_applications', 'write_mobile_platform_applications', { approval: true })
    ]
  },
  {
    id: 'storefront',
    title: 'Storefront API',
    items: [
      scope('Carrinho', 'unauthenticated_read_checkouts', 'unauthenticated_write_checkouts'),
      scope('Clientes', 'unauthenticated_read_customers', 'unauthenticated_write_customers'),
      scope('Tags de clientes', 'unauthenticated_read_customer_tags', null),
      scope('Conteúdo', 'unauthenticated_read_content', null),
      scope('Metaobjetos', 'unauthenticated_read_metaobjects', null),
      scope('Produtos e coleções', 'unauthenticated_read_product_listings', null),
      scope('Estoque disponível', 'unauthenticated_read_product_inventory', null),
      scope('Locais de retirada', 'unauthenticated_read_product_pickup_locations', null),
      scope('Tags de produtos', 'unauthenticated_read_product_tags', null),
      scope('Planos de venda', 'unauthenticated_read_selling_plans', null),
      scope('Parcelamento Shop Pay', 'unauthenticated_read_shop_pay_installments_pricing', null)
    ]
  },
  {
    id: 'customer-account',
    title: 'Customer Account API',
    items: [
      scope('Clientes', 'customer_read_customers', 'customer_write_customers'),
      scope('Pedidos', 'customer_read_orders', 'customer_write_orders'),
      scope('Pedidos rascunho', 'customer_read_draft_orders', null),
      scope('Empresas', 'customer_read_companies', 'customer_write_companies'),
      scope('Locais da empresa', 'customer_read_locations', 'customer_write_locations'),
      scope('Mercados', 'customer_read_markets', null),
      scope('Metaobjetos', 'customer_read_metaobjects', null),
      scope('Assinaturas do app', 'customer_read_own_subscription_contracts', 'customer_write_own_subscription_contracts'),
      scope('Todas as assinaturas (Hydrogen/Headless)', null, 'customer_write_subscription_contracts'),
      scope('Contas de crédito', 'customer_read_store_credit_accounts', null),
      scope('Transações de crédito', 'customer_read_store_credit_account_transactions', null)
    ]
  }
];

export const getScopesOfItem = (item) => [item.read, item.write].filter(Boolean);

// Nomes em inglês para o seletor de idioma (chave = texto em português).
const LABELS_EN = {
  'Produtos e catálogo': 'Products and catalog',
  Pedidos: 'Orders',
  'Fulfillment e entrega': 'Fulfillment and delivery',
  'Estoque e locais': 'Inventory and locations',
  'Clientes e B2B': 'Customers and B2B',
  'Descontos, marketing e vale-presente': 'Discounts, marketing and gift cards',
  'Checkout e pagamentos': 'Checkout and payments',
  'Loja online e conteúdo': 'Online store and content',
  'Mercados e idiomas': 'Markets and languages',
  'Análises e pixels': 'Analytics and pixels',
  'Loja, equipe e impostos': 'Store, staff and taxes',
  'Produtos, variantes e coleções': 'Products, variants and collections',
  'Listagem de produtos no canal': 'Channel product listings',
  'Publicações e canais': 'Publications and channels',
  'Feedback de recursos': 'Resource feedback',
  'Arquivos e mídias': 'Files and media',
  'Pedidos (últimos 60 dias)': 'Orders (last 60 days)',
  'Todos os pedidos (histórico)': 'All orders (history)',
  'Pedidos rascunho': 'Draft orders',
  'Edição de pedidos': 'Order edits',
  Devoluções: 'Returns',
  'Pedidos de marketplace': 'Marketplace orders',
  'Devoluções de marketplace': 'Marketplace returns',
  'Fulfillment atribuído ao app': 'Fulfillment assigned to the app',
  'Fulfillment gerenciado pela loja': 'Merchant-managed fulfillment',
  'Fulfillment de terceiros': 'Third-party fulfillment',
  'Fulfillment de marketplace': 'Marketplace fulfillment',
  'Serviços de fulfillment': 'Fulfillment services',
  'Regras de restrição de fulfillment': 'Fulfillment constraint rules',
  'App que criou retenções': 'App that created holds',
  'Frete e transportadoras': 'Shipping and carriers',
  'Personalização de entrega': 'Delivery customizations',
  'Promessas de entrega': 'Delivery promises',
  'Itens e níveis de estoque': 'Inventory items and levels',
  'Remessas de estoque': 'Inventory shipments',
  'Itens recebidos em remessas': 'Received shipment items',
  'Transferências de estoque': 'Inventory transfers',
  Locais: 'Locations',
  'Clientes e segmentos': 'Customers and segments',
  'Empresas (B2B)': 'Companies (B2B)',
  'Mesclagem de clientes': 'Customer merge',
  'Exclusão de dados do cliente': 'Customer data erasure',
  'Métodos de pagamento do cliente': 'Customer payment methods',
  'Contas de crédito da loja': 'Store credit accounts',
  'Transações de crédito da loja': 'Store credit transactions',
  Descontos: 'Discounts',
  'Price rules (removido na 2026-10)': 'Price rules (removed in 2026-10)',
  'Rollouts de descontos': 'Discount rollouts',
  'Eventos de marketing': 'Marketing events',
  'Vale-presentes': 'Gift cards',
  'Transações de vale-presente': 'Gift card transactions',
  'Marca do checkout': 'Checkout branding',
  'Configuração de checkout e contas': 'Checkout and accounts configuration',
  'Configurações de checkout': 'Checkout settings',
  'Transformação de carrinho': 'Cart transforms',
  Validações: 'Validations',
  'Personalização de pagamento': 'Payment customizations',
  'Condições de pagamento': 'Payment terms',
  'Gateways de pagamento': 'Payment gateways',
  'Sessões de pagamento': 'Payment sessions',
  'Mandatos de pagamento': 'Payment mandates',
  'Contratos de assinatura do app': "App's subscription contracts",
  'Caixa do PDV': 'POS cash tracking',
  'Conta e agenda de repasses': 'Payouts account and schedule',
  Contas: 'Accounts',
  'Dados sensíveis da conta': 'Sensitive account data',
  'Contas bancárias': 'Bank accounts',
  'Repasses e saldo': 'Payouts and balance',
  Disputas: 'Disputes',
  'Evidências de disputa': 'Dispute evidence',
  'Upload de arquivos de disputa': 'Dispute file uploads',
  'Informações KYC financeiras': 'Financial KYC information',
  Temas: 'Themes',
  'Blogs, artigos e páginas': 'Blogs, articles and pages',
  'Páginas da loja online': 'Online store pages',
  'Navegação e redirecionamentos': 'Navigation and redirects',
  Metaobjetos: 'Metaobjects',
  'Definições de metaobjetos': 'Metaobject definitions',
  'Políticas da loja': 'Store policies',
  'Privacidade e banner de cookies': 'Privacy and cookie banner',
  Mercados: 'Markets',
  'Metafields de mercados': 'Market metafields',
  'Idiomas da loja': 'Store languages',
  Traduções: 'Translations',
  'Relatórios (ShopifyQL)': 'Reports (ShopifyQL)',
  'Anotações de análise': 'Analytics annotations',
  'Pixels web e de servidor': 'Web and server pixels',
  'Eventos do cliente': 'Customer events',
  'Equipe (staff)': 'Staff',
  'Leitura de impostos': 'Read taxes',
  'Cálculo de impostos': 'Tax calculation',
  'Sinais de aprovação do lojista': 'Merchant approval signals',
  'Apps mobile da loja': 'Store mobile apps',
  Carrinho: 'Cart',
  Clientes: 'Customers',
  'Tags de clientes': 'Customer tags',
  Conteúdo: 'Content',
  'Produtos e coleções': 'Products and collections',
  'Estoque disponível': 'Available inventory',
  'Locais de retirada': 'Pickup locations',
  'Tags de produtos': 'Product tags',
  'Planos de venda': 'Selling plans',
  'Parcelamento Shop Pay': 'Shop Pay Installments',
  Empresas: 'Companies',
  'Locais da empresa': 'Company locations',
  'Assinaturas do app': "App's subscriptions",
  'Todas as assinaturas (Hydrogen/Headless)': 'All subscriptions (Hydrogen/Headless)',
  'Contas de crédito': 'Credit accounts',
  'Transações de crédito': 'Credit transactions'
};

export const scopeLabel = (text, language) => (language === 'en' ? LABELS_EN[text] ?? text : text);

// Combos prontos para os tipos de app mais comuns. Só escopos que não pedem
// aprovação da Shopify; "write_x" já inclui "read_x". Nomes em lib/i18n.js (preset.<id>).
export const SCOPE_PRESETS = [
  {
    id: 'erp',
    scopes: ['write_products', 'write_inventory', 'read_locations', 'write_orders', 'write_customers', 'write_merchant_managed_fulfillment_orders', 'read_returns']
  },
  {
    id: 'catalog',
    scopes: ['write_products', 'write_inventory', 'read_locations', 'write_publications', 'write_files', 'write_metaobjects']
  },
  { id: 'inventory', scopes: ['read_products', 'write_inventory', 'read_locations'] },
  {
    id: 'logistics',
    scopes: ['read_products', 'read_orders', 'read_locations', 'write_inventory', 'write_merchant_managed_fulfillment_orders', 'write_assigned_fulfillment_orders', 'write_fulfillments', 'read_shipping']
  },
  { id: 'crm', scopes: ['write_customers', 'read_orders', 'read_products', 'write_discounts', 'write_marketing_events'] },
  {
    id: 'reports',
    scopes: ['read_orders', 'read_products', 'read_customers', 'read_inventory', 'read_locations', 'read_reports', 'read_discounts']
  },
  {
    id: 'content',
    scopes: ['write_themes', 'write_content', 'write_online_store_pages', 'write_online_store_navigation', 'write_metaobjects', 'write_metaobject_definitions', 'write_files']
  },
  {
    id: 'headless',
    scopes: ['unauthenticated_read_product_listings', 'unauthenticated_read_product_inventory', 'unauthenticated_read_content', 'unauthenticated_read_metaobjects', 'unauthenticated_write_checkouts', 'unauthenticated_write_customers']
  }
];
