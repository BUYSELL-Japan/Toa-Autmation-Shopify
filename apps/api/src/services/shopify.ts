type ShopifyConfig = {
    shopName: string
    accessToken: string
}

export class ShopifyService {
    private baseUrl: string
    private headers: HeadersInit

    constructor(config: ShopifyConfig) {
        this.baseUrl = `https://${config.shopName}.myshopify.com/admin/api/2024-01`
        this.headers = {
            'X-Shopify-Access-Token': config.accessToken,
            'Content-Type': 'application/json',
        }
    }

    async listProducts(limit = 10) {
        const url = `${this.baseUrl}/products.json?limit=${limit}`
        const response = await fetch(url, { headers: this.headers })
        if (!response.ok) {
            throw new Error(`Shopify API Error: ${response.statusText}`)
        }
        return await response.json()
    }

    async createProduct(product: any) {
        const url = `${this.baseUrl}/products.json`
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ product }),
        })
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Failed to create product: ${error}`)
        }
        return await response.json()
    }
}
