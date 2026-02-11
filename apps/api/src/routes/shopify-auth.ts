import { Context } from 'hono'
import { env } from 'hono/adapter'

export const shopifyAuth = async (c: Context) => {
    const { SHOPIFY_CLIENT_ID, SHOPIFY_SHOP_NAME } = env<any>(c)
    let shop = c.req.query('shop') || `${SHOPIFY_SHOP_NAME}`
    if (shop && !shop.includes('.myshopify.com')) {
        shop = `${shop}.myshopify.com`
    }

    if (!shop) {
        return c.text('Missing shop parameter', 400)
    }

    // Scopes required for the app
    const scopes = [
        'read_products', 'write_products',
        'read_translations', 'write_translations',
        'read_publications', 'write_publications',
        'read_markets', 'write_markets',
        'read_inventory', 'write_inventory',
        'read_locations'
    ].join(',')

    // Redirect to Shopify permission screen
    // Using the current host for callback (works for localhost and production if configured)
    const host = c.req.header('host') || 'localhost:8787'
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/shopify/callback`

    console.log(`[OAuth] Initiating flow. Shop: ${shop}, Host: ${host}, RedirectURI: ${redirectUri}`);

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}`

    return c.redirect(authUrl)
}

export const shopifyCallback = async (c: Context) => {
    const { SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, DB } = env<any>(c)
    const { code, shop, hmac } = c.req.query()

    if (!code || !shop) {
        return c.text('Missing code or shop parameter', 400)
    }

    // TODO: Validate HMAC here for security (skipping for MVP speed, but highly recommended)

    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`
    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: SHOPIFY_CLIENT_ID,
                client_secret: SHOPIFY_CLIENT_SECRET,
                code
            })
        })

        const data = await response.json()

        if (!response.ok) {
            return c.json({ error: 'Failed to get access token', details: data }, 500)
        }

        const accessToken = (data as any).access_token

        // Store token in D1
        await DB.prepare(
            'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, strftime("%s", "now"))'
        )
            .bind('shopify_access_token', accessToken)
            .run()

        // Also store shop domain for reference
        await DB.prepare(
            'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, strftime("%s", "now"))'
        )
            .bind('shopify_shop_domain', shop)
            .run()

        return c.html(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: green;">Authentication Successful!</h1>
          <p>Access token has been safely stored.</p>
          <p>You can close this window and return to the dashboard.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `)

    } catch (e: any) {
        console.error('OAuth Error:', e)
        return c.json({ error: e.message }, 500)
    }
}
