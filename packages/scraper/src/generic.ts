import { chromium } from 'playwright'
import { ScrapedData } from './mercari'

export class GenericScraper {
    async scrape(url: string): Promise<ScrapedData> {
        const browser = await chromium.launch({ headless: true })
        const page = await browser.newPage()

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

            const title = await page.title()

            // Extract Description from OGP or Meta
            let description = await page.getAttribute('meta[property="og:description"]', 'content') ||
                await page.getAttribute('meta[name="description"]', 'content') ||
                ''

            // Extract Images from OGP or largest images
            const ogImage = await page.getAttribute('meta[property="og:image"]', 'content')
            const images = ogImage ? [ogImage] : []

            return {
                title,
                price: 0, // Generic scraper doesn't guess price
                description,
                images,
                url
            }

        } catch (e) {
            console.error('Generic Scrape Error:', e)
            return { url, title: 'Error Scraping' }
        } finally {
            await browser.close()
        }
    }
}
