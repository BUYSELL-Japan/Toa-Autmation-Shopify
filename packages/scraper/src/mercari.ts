import { chromium } from 'playwright'

export interface ScrapedData {
    title?: string
    price?: number
    description?: string
    images?: string[]
    currency?: string
    url: string
}

import * as fs from 'fs'
import * as path from 'path'

export class MercariScraper {
    async scrape(url: string): Promise<ScrapedData> {
        const isHeadless = process.env.HEADLESS !== 'false'

        // Check for auth.json
        const authPath = path.resolve(__dirname, '../auth.json')
        const hasAuth = fs.existsSync(authPath)
        if (hasAuth) console.log('Using authenticated session from auth.json')

        const browser = await chromium.launch({
            headless: isHeadless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        })
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'ja-JP',
            timezoneId: 'Asia/Tokyo',
            storageState: hasAuth ? authPath : undefined
        })

        // Stealth scripts
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            })
        })

        const page = await context.newPage()

        // Block heavy resources (relaxed for better loading chance)
        await page.route('**/*', (route) => {
            const type = route.request().resourceType()
            if (['font'].includes(type)) route.abort() // Only block fonts, allow images/scripts for now to look real
            else route.continue()
        })

        try {
            console.log(`Navigating to ${url}...`)
            await page.goto(url, { waitUntil: 'load', timeout: 60000 })

            // Wait for critical elements
            try {
                await page.waitForSelector('h1', { timeout: 10000 })
            } catch (e) {
                console.log('Timeout waiting for h1, verifying title...')
            }

            const pageTitle = await page.title()
            console.log('Page Title:', pageTitle)

            // Extract Price (Mercari specific: structured data or specific classes)
            let price = 0

            // 1. Try meta tags (robust)
            const priceMeta = await page.$('meta[property="product:price:amount"]') ||
                await page.$('meta[name="twitter:data1"]')
            if (priceMeta) {
                const content = await priceMeta.getAttribute('content')
                if (content) price = parseInt(content.replace(/[^0-9]/g, ''))
            }

            // 2. Try Merari specific structured data (mer-price)
            if (!price) {
                // New Mercari UI often uses data-testid="price"
                const priceEl = await page.$('[data-testid="price"]')
                if (priceEl) {
                    const text = await priceEl.innerText()
                    price = parseInt(text.replace(/[^0-9]/g, ''))
                }
            }

            // 3. Last reosrt: Regex on body (expensive but effective)
            if (!price) {
                const bodyText = await page.innerText('body')
                // Look for ¥12,345 pattern near top
                const match = bodyText.match(/¥([0-9,]+)/)
                if (match) {
                    price = parseInt(match[1].replace(/,/g, ''))
                }
            }

            return {
                title: pageTitle,
                price,
                description: '',
                images: [],
                url
            }

        } catch (e) {
            console.error('Mercari Scrape Error:', e)
            return { url, title: 'Error Scraping' }
        } finally {
            await browser.close()
        }
    }
}
