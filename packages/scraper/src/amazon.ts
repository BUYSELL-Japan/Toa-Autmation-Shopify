import { chromium } from 'playwright'
import { ScrapedData } from './types'

export class AmazonScraper {
    async scrape(url: string): Promise<ScrapedData> {
        // Default to HEADED mode for Amazon as well
        const isHeadless = process.env.HEADLESS === 'true'

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
            timezoneId: 'Asia/Tokyo'
        })

        // Stealth
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        })

        const page = await context.newPage()

        try {
            console.log(`Amazon Scraping: ${url}`)
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

            // Human mimicry
            await this.mimicHuman(page)

            // 1. Title
            const title = await page.title()
            const productTitle = await page.$eval('#productTitle', el => el.textContent?.trim()).catch(() => title) || title

            // 2. Images (landingImage or altImages)
            const images: string[] = []
            try {
                // Main image
                const mainImg = await page.$eval('#landingImage', (el: any) => el.src).catch(() => null)
                if (mainImg) images.push(mainImg)

                // Alt images (often in specific container)
                const altImgs = await page.$$eval('#altImages ul li.item img', (els: any[]) => els.map(e => e.src))
                // Filter out low-res or tiny images if needed
                altImgs.forEach(img => {
                    if (img && !images.includes(img)) images.push(img)
                })
            } catch (e) {
                console.log('Error extracting images:', e)
            }

            // 3. Size / Dimensions
            // Often in technical details table
            let description = ''
            try {
                const details = await page.$$eval('#prodDetails tr', rows => {
                    return rows.map(row => {
                        const label = row.querySelector('th')?.textContent?.trim() || ''
                        const value = row.querySelector('td')?.textContent?.trim() || ''
                        return `${label}: ${value}`
                    }).filter(s => s.length > 3).join('\n')
                })
                description = details
            } catch (e) {
                console.log('Error extracting details:', e)
            }

            // Fallback for size if not in table (sometimes in bullet points)
            if (!description.includes('サイズ') && !description.includes('Dimensions')) {
                const featureBullets = await page.$eval('#feature-bullets', el => el.textContent?.trim()).catch(() => '')
                if (featureBullets) description += '\n\n' + featureBullets
            }

            console.log('Amazon Scrape Done')

            return {
                title: productTitle as string,
                price: 0, // Not requested but required by type
                description,
                images,
                url
            }

        } catch (e) {
            console.error('Amazon Scrape Error:', e)
            try {
                const debugPath = require('path').resolve(__dirname, '../debug_amazon_error.png')
                await page.screenshot({ path: debugPath, fullPage: true })
                console.log(`Saved error screenshot to: ${debugPath}`)
            } catch (err) {
                console.error('Failed to save screenshot', err)
            }
            return { url, title: 'Error Scraping Amazon' }
        } finally {
            await browser.close()
        }
    }

    private async mimicHuman(page: any) {
        console.log('🤖 Mimicking human behavior...')
        await page.mouse.move(100, 100)
        await page.waitForTimeout(1000)
        await page.evaluate(() => window.scrollBy(0, 300))
        await page.waitForTimeout(1500)
    }
}
