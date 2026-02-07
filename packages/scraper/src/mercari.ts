import { chromium } from 'playwright'

export interface ScrapedData {
    title?: string
    price?: number
    description?: string
    images?: string[]
    currency?: string
    url: string
}

export class MercariScraper {
    async scrape(url: string): Promise<ScrapedData> {
        const browser = await chromium.launch({ headless: true }) // Set headless: false for debugging
        const page = await browser.newPage()

        // Block images/fonts to speed up
        await page.route('**/*', (route) => {
            const type = route.request().resourceType()
            if (['image', 'font', 'stylesheet'].includes(type)) route.abort()
            else route.continue()
        })

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

            // Generic fallback selectors + specific Mercari handling
            const title = await page.title()

            // Try to find price via common meta tags or structured data
            // Mercari often puts price in og:price:amount or json-ld
            let price = 0
            const priceMeta = await page.$('meta[name="twitter:data1"]') // Sometimes price is here
            if (priceMeta) {
                const content = await priceMeta.getAttribute('content')
                if (content) price = parseInt(content.replace(/[^0-9]/g, ''))
            }

            // Fallback: try finding price in DOM
            if (!price) {
                // This selector is fragile and might key changing. 
                // Better approach: Look for currency symbol near numbers
                const bodyText = await page.innerText('body')
                const priceMatch = bodyText.match(/¥\s*([0-9,]+)/)
                if (priceMatch) {
                    price = parseInt(priceMatch[1].replace(/,/g, ''))
                }
            }

            return {
                title: await page.title(),
                price,
                description: '', // Mercari desc is usually complex to extract cleanly without specific selectors
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
