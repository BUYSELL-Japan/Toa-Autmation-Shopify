import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'
import { ShopifyService } from './services/shopify'
import { OpenAIService } from './services/openai'
import { getShopifyAccessToken } from './services/shopify-token'
import { shopifyAuth, shopifyCallback } from './routes/shopify-auth'
import { ShopifyTranslationService } from './services/shopify-translation'
import { ShopifyChannelService } from './services/shopify-channel'
import { getAllShippingRates, getShippingRate } from './data/shipping-rates'

type Bindings = {
  DB: D1Database
  SHOPIFY_SHOP_NAME: string
  SHOPIFY_ACCESS_TOKEN: string
  SHOPIFY_CLIENT_ID: string
  SHOPIFY_CLIENT_SECRET: string
  OPENAI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

app.get('/', (c) => c.text('TOA Automation API is running!'))

app.get('/status', (c) => {
  // Debug endpoint to check env vars
  const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN } = env<Bindings>(c);
  console.log('Status check - Bindings:', Object.keys(c.env));

  return c.json({
    status: 'ok',
    env_check: {
      SHOPIFY_SHOP_NAME: SHOPIFY_SHOP_NAME ? 'Present' : 'Missing',
      SHOPIFY_ACCESS_TOKEN: SHOPIFY_ACCESS_TOKEN ? 'Present' : 'Missing',
      SHOPIFY_ACCESS_TOKEN_LENGTH: SHOPIFY_ACCESS_TOKEN ? SHOPIFY_ACCESS_TOKEN.length : 0
    }
  });
})

// OAuth Routes
app.get('/shopify/auth', shopifyAuth)
app.get('/shopify/callback', shopifyCallback)

app.get('/shopify/products', async (c) => {
  const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN } = env<Bindings>(c)
  if (!SHOPIFY_SHOP_NAME || !SHOPIFY_ACCESS_TOKEN) {
    return c.json({ error: 'Missing Shopify credentials' }, 500)
  }
  const service = new ShopifyService({
    shopName: SHOPIFY_SHOP_NAME,
    accessToken: SHOPIFY_ACCESS_TOKEN
  })
  try {
    const products = await service.listProducts()
    return c.json(products)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/products', async (c) => {
  const { DB } = env<Bindings>(c)
  console.log('[API] GET /products called. DB available:', !!DB);
  try {
    const { results } = await DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
    console.log('[API] GET /products success. Count:', results?.length || 0);
    return c.json(results || [])
  } catch (e: any) {
    console.error('[API] GET /products failed:', e.message);
    return c.json({ error: e.message }, 500)
  }
})

app.get('/settings', async (c) => {
  const { DB } = env<Bindings>(c)
  try {
    const { results } = await DB.prepare('SELECT * FROM app_settings').all()
    const settings = results.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value
      return acc
    }, {})
    // Set defaults if missing
    if (!settings.profit_margin) settings.profit_margin = 20
    if (!settings.platform_fee) settings.platform_fee = 10
    if (!settings.shipping_cost) settings.shipping_cost = 1000

    return c.json(settings)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/settings', async (c) => {
  const { DB } = env<Bindings>(c)
  try {
    const body = await c.req.json()
    const validKeys = ['profit_margin', 'platform_fee', 'shipping_cost']
    const updates = []

    for (const [key, value] of Object.entries(body)) {
      if (validKeys.includes(key)) {
        updates.push(
          DB.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, strftime("%s", "now"))')
            .bind(key, String(value))
        )
      }
    }

    if (updates.length > 0) await DB.batch(updates)
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/products', async (c) => {
  const { DB } = env<Bindings>(c)
  try {
    const body = await c.req.json()
    const id = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    // Basic validation
    if (!body.title) return c.json({ error: 'Title is required' }, 400)

    // Get Settings for Calculation
    const { results: settingsRows } = await DB.prepare('SELECT * FROM app_settings').all()
    const settings = settingsRows.reduce((acc: any, curr: any) => {
      acc[curr.key] = Number(curr.value)
      return acc
    }, { profit_margin: 20, platform_fee: 10, shipping_cost: 1000 })

    // Price Calculation
    // Formula: Selling * (1 - fee - margin) = Cost + Shipping
    // Selling = (Cost + Shipping) / (1 - fee - margin)
    const costPrice = Number(body.price) || 0 // Input 'price' from frontend is treated as Cost Price
    const marginRate = settings.profit_margin / 100
    const feeRate = settings.platform_fee / 100
    const shipping = settings.shipping_cost

    let sellingPrice = Number(body.selling_price) || 0; // Use provided selling price if available

    if (sellingPrice === 0 && costPrice > 0) {
      const divisor = 1 - marginRate - feeRate
      if (divisor > 0.01) {
        sellingPrice = Math.ceil((costPrice + shipping) / divisor)
      } else {
        console.warn('Invalid rates for calculation', { marginRate, feeRate })
        sellingPrice = (costPrice + shipping) * 1.5
      }
    }

    console.log(`Price Calc: Cost=${costPrice}, Shipping=${shipping}, Margin=${settings.profit_margin}%, Fee=${settings.platform_fee}% -> Selling=${sellingPrice}`);

    // Insert Product (Main - Japanese)
    const ja = body.translations?.ja || { title: body.title, body_html: body.description };

    await DB.prepare(`
            INSERT INTO products (
                id, title, body_html, 
                cost_price, selling_price, 
                currency, images_json, status, 
                created_at, updated_at,
                tags, weight_g
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
      id,
      ja.title,
      ja.body_html || '',
      costPrice,
      sellingPrice,
      'JPY',
      JSON.stringify(body.images || []),
      'draft',
      now,
      now,
      'exported_from_toa', // Default tag
      body.weight_g || 0
    ).run()

    // Insert Translations (EN, ZH_TW, KO)
    if (body.translations) {
      const stmt = DB.prepare(`
            INSERT INTO product_translations (product_id, language_code, title, body_html, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

      const languages = ['en', 'zh_tw', 'zh_cn', 'ko', 'th'];
      const batch = [];

      for (const lang of languages) {
        if (body.translations[lang]) {
          const t = body.translations[lang];
          batch.push(stmt.bind(id, lang, t.title, t.body_html, now));
        }
      }

      if (batch.length > 0) await DB.batch(batch);
    }

    // Insert Sources if provided
    if (body.sources && Array.isArray(body.sources)) {
      const stmt = DB.prepare(`
                INSERT INTO product_sources (id, product_id, url, source_type, status, price, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
      const batch = body.sources.map((src: any) => stmt.bind(
        crypto.randomUUID(),
        id,
        src.url,
        src.source_type || 'unknown',
        'active',
        src.price || 0,
        now
      ))
      await DB.batch(batch)
    }

    return c.json({ id, message: 'Product created', calculated_price: sellingPrice }, 201)
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

// GET Single Product
app.get('/products/:id', async (c) => {
  const { DB } = env<Bindings>(c)
  const id = c.req.param('id')
  try {
    const product: any = await DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
    if (!product) return c.json({ error: 'Product not found' }, 404)

    // Fetch translations
    const { results: translations } = await DB.prepare('SELECT * FROM product_translations WHERE product_id = ?').bind(id).all()

    // Fetch sources
    const { results: sources } = await DB.prepare('SELECT * FROM product_sources WHERE product_id = ?').bind(id).all()

    return c.json({ ...product, translations, sources })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// UPDATE Product
app.put('/products/:id', async (c) => {
  const { DB } = env<Bindings>(c)
  const id = c.req.param('id')
  try {
    const body = await c.req.json()
    const now = Math.floor(Date.now() / 1000)

    // Update main product fields
    // Allow updating title, description, cost_price, selling_price, inventory_quantity
    const updates: string[] = []
    const params: any[] = []

    if (body.title) { updates.push('title = ?'); params.push(body.title) }
    if (body.body_html) { updates.push('body_html = ?'); params.push(body.body_html) }
    if (body.cost_price !== undefined) { updates.push('cost_price = ?'); params.push(body.cost_price) }
    if (body.selling_price !== undefined) { updates.push('selling_price = ?'); params.push(body.selling_price) }
    if (body.inventory_quantity !== undefined) { updates.push('inventory_quantity = ?'); params.push(body.inventory_quantity) }
    if (body.weight_g !== undefined) { updates.push('weight_g = ?'); params.push(body.weight_g) }

    if (updates.length > 0) {
      updates.push('updated_at = ?'); params.push(now);
      params.push(id)

      await DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run()
    }

    // Update Translations if provided
    if (body.translations) {
      // 1. Delete existing translations for this product
      // (Simple strategy: wipe and recreate)
      await DB.prepare('DELETE FROM product_translations WHERE product_id = ?').bind(id).run()

      // 2. Insert new translations
      // body.translations is expected to be { en: {title, body_html}, ... } OR array
      // Let's support the Object format returned by OpenAI

      const insertStmt = DB.prepare(`
        INSERT INTO product_translations (product_id, language_code, title, body_html)
        VALUES (?, ?, ?, ?)
      `)

      const batch = []
      // Check if it's object or array. OpenAI returns object { en: {...}, ... }
      // ResearchView might send it differently. Let's handle Object format primarily.

      const transMap = body.translations;
      if (typeof transMap === 'object' && !Array.isArray(transMap)) {
        for (const [lang, content] of Object.entries(transMap)) {
          if (content && typeof content === 'object') {
            batch.push(insertStmt.bind(id, lang, (content as any).title, (content as any).body_html));
          }
        }
      } else if (Array.isArray(transMap)) {
        // Fallback if array format is used
        for (const t of transMap) {
          batch.push(insertStmt.bind(id, t.language_code, t.title, t.body_html));
        }
      }

      if (batch.length > 0) await DB.batch(batch);
    }

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// DELETE Product
app.delete('/products/:id', async (c) => {
  const { DB } = env<Bindings>(c)
  const id = c.req.param('id')
  try {
    // D1 doesn't support cascading deletes perfectly in all modes, so manual cleanup is safer or rely on FK if configured
    // Tables: products, product_translations, product_sources
    // FKs are set to CASCADE in schema, so deleting parent should work.

    // 1. Fetch product to get shopify_product_id
    const product: any = await DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
    if (!product) return c.json({ error: 'Product not found' }, 404)

    // 2. Delete from Shopify if synced
    if (product.shopify_product_id) {
      const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = env<Bindings>(c)

      let token = SHOPIFY_ACCESS_TOKEN;
      if (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET) {
        try {
          const dynamicToken = await getShopifyAccessToken({
            shopName: SHOPIFY_SHOP_NAME,
            clientId: SHOPIFY_CLIENT_ID,
            clientSecret: SHOPIFY_CLIENT_SECRET,
            DB,
            envToken: SHOPIFY_ACCESS_TOKEN
          })
          if (dynamicToken) token = dynamicToken;
        } catch (e) { }
      }

      if (SHOPIFY_SHOP_NAME && token) {
        try {
          const mutation = `
             mutation productDelete($input: ProductDeleteInput!) {
               productDelete(input: $input) {
                 deletedProductId
                 userErrors {
                   field
                   message
                 }
               }
             }
           `
          const response = await fetch(`https://${SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
            },
            body: JSON.stringify({
              query: mutation,
              variables: { input: { id: product.shopify_product_id } }
            })
          })
          const result = await response.json() as any
          if (result.data?.productDelete?.userErrors?.length > 0) {
            console.error('Shopify Delete Error:', result.data.productDelete.userErrors)
          } else {
            console.log('Deleted from Shopify:', product.shopify_product_id)
          }
        } catch (e) {
          console.error('Failed to delete from Shopify:', e)
        }
      }
    }

    const result = await DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Product not found' }, 404)
    }

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/products/format', async (c) => {
  // Debug: Log available bindings (redacted)
  console.log('Available Bindings:', Object.keys(c.env));

  const apiKey = c.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OPENAI_API_KEY is missing from c.env');
    return c.json({ error: 'Missing OPENAI_API_KEY' }, 500)
  }

  try {
    const body = await c.req.json()
    const { title, description } = body
    if (!title) return c.json({ error: 'Title is required' }, 400)

    const openai = new OpenAIService(apiKey)
    const result = await openai.formatProduct(title, description || '')

    return c.json(result)
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

app.post('/products/translate', async (c) => {
  const apiKey = c.env.OPENAI_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'Missing OPENAI_API_KEY' }, 500)
  }

  try {
    const body = await c.req.json()
    const { title, body_html } = body
    if (!title || !body_html) return c.json({ error: 'Title and body_html are required' }, 400)

    const openai = new OpenAIService(apiKey)
    const result = await openai.translateProduct(title, body_html)

    return c.json(result)
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})



app.get('/shopify/markets', async (c) => {
  const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = env<Bindings>(c)

  // Try to use dynamic token if Client ID/Secret are available, otherwise fall back to static env var
  let token = SHOPIFY_ACCESS_TOKEN;
  if (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET) {
    try {
      token = await getShopifyAccessToken({
        shopName: SHOPIFY_SHOP_NAME,
        clientId: SHOPIFY_CLIENT_ID,
        clientSecret: SHOPIFY_CLIENT_SECRET,
        DB: c.env.DB,
        envToken: SHOPIFY_ACCESS_TOKEN
      }) || token;
      console.log('[Create] Using Token:', token ? token.substring(0, 10) + '...' : 'null');
    } catch (e) {
      console.warn('Failed to fetch dynamic token, using static fallback:', e);
    }
  }

  if (!SHOPIFY_SHOP_NAME || !token) {
    return c.json({ error: 'Shopify credentials not configured' }, 500)
  }

  const query = `
    query {
      markets(first: 20) {
        nodes {
          id
          name
          enabled
          priceList {
            id
            currency
          }
          regions(first: 10) {
            nodes {
              ... on MarketRegionCountry {
                code
                name
              }
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(`https://${SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({ query })
    })

    const result = await response.json() as any
    if (result.errors) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '))
    }

    return c.json(result.data.markets.nodes)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

app.post('/shipping/calculate', async (c) => {
  try {
    const body = await c.req.json();
    const weightG = body.weight_g;
    if (weightG === undefined) return c.json({ error: 'weight_g is required' }, 400);

    const { getAllShippingRates } = await import('./data/shipping-rates');
    const rates = getAllShippingRates(Number(weightG));

    return c.json(rates);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
})

app.get('/exchange-rates', async (c) => {
  try {
    // Try converting JPY to others. Base: JPY
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/JPY');
    if (res.ok) {
      const data = await res.json() as any;
      return c.json(data);
    }
    throw new Error('Failed to fetch from external API');
  } catch (e) {
    console.error('Exchange rate fetch failed, using fallback', e);
    // Fallback rates (approximate)
    return c.json({
      base: 'JPY',
      rates: {
        JPY: 1,
        USD: 0.0067, // ~150 JPY/USD
        EUR: 0.0062, // ~160 JPY/EUR
        GBP: 0.0053,
        AUD: 0.010,
        CAD: 0.0090,
        CNY: 0.048,
        KRW: 9.0,
        TWD: 0.21,
        HKD: 0.052,
        THB: 0.24,
        SGD: 0.0090,
        MYR: 0.031,
        VND: 165.0
      }
    });
  }
})

app.post('/shopify/create', async (c) => {
  try {
    const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, DB } = env<Bindings>(c)
    console.log('[Create] Handler started. Shop:', SHOPIFY_SHOP_NAME);

    if (!SHOPIFY_SHOP_NAME || !SHOPIFY_ACCESS_TOKEN) {
      return c.json({ error: 'Shopify credentials not configured' }, 500)
    }

    if (!DB) {
      return c.json({ error: 'D1 Database binding (DB) is missing' }, 500)
    }

    // Try to use dynamic token if Client ID/Secret are available
    let token = SHOPIFY_ACCESS_TOKEN;
    if (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET) {
      try {
        const dynamicToken = await getShopifyAccessToken({
          shopName: SHOPIFY_SHOP_NAME,
          clientId: SHOPIFY_CLIENT_ID,
          clientSecret: SHOPIFY_CLIENT_SECRET,
          DB,
          envToken: SHOPIFY_ACCESS_TOKEN
        });
        if (dynamicToken) {
          token = dynamicToken;
          console.log('[Create] Using dynamic token:', token.substring(0, 10) + '...');
        }
      } catch (e) {
        console.warn('Failed to fetch dynamic token in create, using fallback:', e);
      }
    }

    try {
      const body = await c.req.json()
      const { id, market_prices, publicationIds } = body

      if (!id) return c.json({ error: 'Product ID is required' }, 400)

      const product = await DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first() as any
      if (!product) return c.json({ error: 'Product not found' }, 404)

      // 0. Fetch Shop Currency
      let shopCurrency = 'JPY';
      try {
        const shopQuery = `{ shop { currencyCode } }`;
        const shopRes = await fetch(`https://${SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token
          },
          body: JSON.stringify({ query: shopQuery })
        });
        const shopData = await shopRes.json() as any;
        if (shopData.data?.shop?.currencyCode) {
          shopCurrency = shopData.data.shop.currencyCode;
        }
      } catch (e) { console.error('Failed to fetch shop currency', e); }

      // 0.5 Fetch Exchange Rates
      let rates: any = { JPY: 1 };
      try {
        const rateRes = await fetch('https://api.exchangerate-api.com/v4/latest/JPY');
        if (rateRes.ok) {
          const data = await rateRes.json() as any;
          rates = data.rates;
        }
      } catch (e) { rates = { JPY: 1, USD: 0.0067, EUR: 0.0062 }; }

      // Calculate Base Price
      const weightG = Number(product.weight_g) || 500;
      const shippingCost = getShippingRate(weightG, 'zone4');
      const costPrice = Number(product.cost_price);
      const feeRate = 0.045;
      const profitMargin = 0.20;

      const safeNumber = (val: any) => {
        if (!val) return 0;
        const str = String(val).replace(/[^0-9.-]/g, '');
        return Number(str) || 0;
      }
      let basePriceJPY = safeNumber(product.selling_price);

      if (basePriceJPY <= 0) {
        const denominator = 1 - feeRate - profitMargin;
        basePriceJPY = Math.ceil((costPrice + shippingCost) / denominator);
      }

      let finalBasePrice = basePriceJPY;
      if (shopCurrency !== 'JPY' && rates[shopCurrency]) {
        finalBasePrice = Math.ceil(basePriceJPY * rates[shopCurrency]);
      }
      if (finalBasePrice <= 0 || isNaN(finalBasePrice)) finalBasePrice = 999999;

      // --- REST API ---
      const shopUrl = `https://${SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01`;
      const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token };

      const productPayload: any = {
        title: product.title,
        body_html: product.body_html,
        status: 'active',
        vendor: 'TOA Automation',
        product_type: 'Anime Goods',
        variants: [{
          price: String(finalBasePrice),
          weight: weightG,
          weight_unit: "g",
          requires_shipping: true,
          inventory_management: 'shopify',
          inventory_policy: 'deny'
        }]
      };

      if (!product.shopify_product_id) {
        const imagesStr = String(product.images_json || '[]');
        productPayload.images = (JSON.parse(imagesStr) as string[]).map(src => ({ src }));
      }

      const extractId = (gid: any) => {
        if (!gid) return '';
        let str = String(gid);
        if (str.endsWith('.0')) str = str.slice(0, -2);
        return str.includes('/') ? str.split('/').pop() || '' : str;
      };

      let shopifyProductId = extractId(product.shopify_product_id);
      let defaultVariantId = null;

      if (shopifyProductId) {
        // UPDATE
        const getRes = await fetch(`${shopUrl}/products/${shopifyProductId}.json`, { headers });
        if (getRes.ok) {
          const getData = await getRes.json() as any;
          if (getData.product?.variants?.length > 0) {
            defaultVariantId = getData.product.variants[0].id;
            productPayload.variants[0].id = defaultVariantId;
          }
        }
        const res = await fetch(`${shopUrl}/products/${shopifyProductId}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ product: productPayload })
        });
        const resText = await res.text();
        if (!res.ok) throw new Error(`Update failed: ${resText}`);
        const result = JSON.parse(resText);
        console.log('[REST] Update Success:', result.product.id);
      } else {
        // CREATE
        const res = await fetch(`${shopUrl}/products.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ product: productPayload })
        });
        const resText = await res.text();
        if (!res.ok) throw new Error(`Create failed: ${resText}`);
        const result = JSON.parse(resText);
        shopifyProductId = result.product.id;
        defaultVariantId = result.product.variants[0].id;
        console.log('[REST] Create Success:', shopifyProductId);
      }

      // INVENTORY
      if (defaultVariantId && product.inventory_quantity !== undefined) {
        try {
          const varRes = await fetch(`${shopUrl}/variants/${defaultVariantId}.json`, { headers });
          const varData = await varRes.json() as any;
          const inventoryItemId = varData.variant?.inventory_item_id;
          if (inventoryItemId) {
            const locRes = await fetch(`${shopUrl}/locations.json`, { headers });
            const locData = await locRes.json() as any;
            const locationId = locData.locations?.[0]?.id;
            if (locationId) {
              await fetch(`${shopUrl}/inventory_levels/set.json`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  location_id: locationId,
                  inventory_item_id: inventoryItemId,
                  available: Number(product.inventory_quantity)
                })
              });
            }
          }
        } catch (e) { console.error('Inventory Sync failed', e); }
      }

      // MARKET PRICES
      if (market_prices && Array.isArray(market_prices)) {
        for (const mp of market_prices) {
          const q = `mutation p($lid: ID!, $ps: [PriceListFixedPriceInput!]!) { priceListFixedPricesAdd(priceListId: $lid, prices: $ps) { userErrors { message } } }`;
          const v = { lid: mp.priceListId, ps: [{ variantId: `gid://shopify/ProductVariant/${defaultVariantId}`, price: { amount: String(mp.price), currencyCode: mp.currency } }] };
          await fetch(`https://${SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ query: q, variables: v })
          });
        }
      }

      // TRANSLATIONS
      const { results: translations } = await DB.prepare('SELECT * FROM product_translations WHERE product_id = ?').bind(id).all() as { results: any[] };
      let translationResults = null;
      if (translations?.length > 0) {
        const tService = new ShopifyTranslationService({ shopName: SHOPIFY_SHOP_NAME, accessToken: token });
        const tData: any = {};
        for (const t of translations) {
          tData[t.language_code.toLowerCase()] = { title: t.title, body_html: t.body_html };
        }
        translationResults = await tService.registerTranslations(shopifyProductId, tData);
      }

      await DB.prepare("UPDATE products SET status = 'uploaded', shopify_product_id = ? WHERE id = ?").bind(shopifyProductId, id).run();

      // CHANNELS
      if (publicationIds?.length > 0) {
        const cService = new ShopifyChannelService({ shopName: SHOPIFY_SHOP_NAME, accessToken: token });
        for (const pubId of publicationIds) await cService.publishProduct(shopifyProductId, pubId);
      }

      return c.json({ success: true, productId: shopifyProductId, translationResults });

    } catch (e: any) {
      console.error('Error in /shopify/create:', e)
      return c.json({
        error: e.message,
        stack: e.stack,
        // @ts-ignore
        details: e.response ? await e.response.text() : undefined
      }, 500)
    }
  } catch (globalErr: any) {
    console.error('CRITICAL GLOBAL CRASH in /shopify/create:', globalErr);
    return c.json({
      error: 'Critical Global Crash',
      message: globalErr.message,
      stack: globalErr.stack
    }, 500);
  }
})

// Token Status Endpoint
app.get('/shopify/token-status', async (c) => {
  const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, DB } = env<Bindings>(c);

  // Get token from D1 or env
  let token = SHOPIFY_ACCESS_TOKEN;
  let tokenSource = 'env';

  if (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET) {
    try {
      const { getShopifyAccessToken } = await import('./services/shopify-token');
      const dbToken = await getShopifyAccessToken({
        shopName: SHOPIFY_SHOP_NAME,
        clientId: SHOPIFY_CLIENT_ID,
        clientSecret: SHOPIFY_CLIENT_SECRET,
        DB: c.env.DB,
        envToken: SHOPIFY_ACCESS_TOKEN
      });
      if (dbToken) {
        token = dbToken;
        tokenSource = 'database';
      }
    } catch (e) {
      console.warn('[TokenStatus] Failed to fetch token from D1:', e);
    }
  }

  if (!token) {
    return c.json({
      hasToken: false,
      valid: false,
      message: 'No access token configured'
    });
  }

  // Test token validity with a simple GraphQL query
  try {
    const response = await fetch(`https://${SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({
        query: '{ shop { name } }'
      })
    });

    const result = await response.json() as any;

    if (result.errors) {
      return c.json({
        hasToken: true,
        valid: false,
        source: tokenSource,
        message: 'Token is invalid or missing permissions',
        errors: result.errors
      });
    }

    return c.json({
      hasToken: true,
      valid: true,
      source: tokenSource,
      shopName: result.data?.shop?.name || SHOPIFY_SHOP_NAME,
      message: 'Token is valid'
    });
  } catch (e: any) {
    console.error('[TokenStatus] Error:', e);
    return c.json({
      hasToken: true,
      valid: false,
      source: tokenSource,
      message: e.message
    }, 500);
  }
});

app.get('/shopify/publications', async (c) => {
  const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = env<Bindings>(c)

  // Dynamic Token
  let token = SHOPIFY_ACCESS_TOKEN;
  if (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET) {
    try {
      const { getShopifyAccessToken } = await import('./services/shopify-token');
      token = await getShopifyAccessToken({
        shopName: SHOPIFY_SHOP_NAME,
        clientId: SHOPIFY_CLIENT_ID,
        clientSecret: SHOPIFY_CLIENT_SECRET,
        DB: c.env.DB,
        envToken: SHOPIFY_ACCESS_TOKEN
      }) || token;
    } catch (e) {
      console.warn('Failed to fetch token for publications:', e);
    }
  }

  if (!token) return c.json({ error: 'Missing credentials' }, 500);

  try {
    const { ShopifyChannelService } = await import('./services/shopify-channel');
    const service = new ShopifyChannelService({
      shopName: SHOPIFY_SHOP_NAME,
      accessToken: token
    });
    const pubs = await service.getPublications();
    return c.json(pubs);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
})

export default app
