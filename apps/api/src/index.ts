import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { ShopifyService } from './services/shopify'

type Bindings = {
  DB: D1Database
  SHOPIFY_SHOP_NAME: string
  SHOPIFY_ACCESS_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.text('TOA Automation API is running!'))

app.get('/shopify/products', async (c) => {
  const { SHOPIFY_SHOP_NAME, SHOPIFY_ACCESS_TOKEN } = env(c)
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

export default app
