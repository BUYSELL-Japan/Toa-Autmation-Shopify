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

        const logs: string[] = [];
        const log = (msg: string) => {
            console.log(msg);
            logs.push(`[${new Date().toISOString()}] ${msg}`);
        };

        try {
            log(`Amazon Scraping: ${url}`);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
            log('Page loaded');

            // Human mimicry
            await this.mimicHuman(page)
            log('Human mimicry done');

            // 1. Title
            const title = await page.title()
            log(`Page Title: ${title}`);

            const productTitle = await page.$eval('#productTitle', el => el.textContent?.trim()).catch(() => title) || title

            // Price extraction
            let price = 0
            try {
                const priceText = await page.$eval('.a-price .a-offscreen', el => el.textContent).catch(() => null) ||
                    await page.$eval('#priceblock_ourprice', el => el.textContent).catch(() => null) ||
                    await page.$eval('#priceblock_dealprice', el => el.textContent).catch(() => null) ||
                    await page.$eval('.a-price-whole', el => el.textContent).catch(() => null) ||
                    await page.$eval('#corePriceDisplay_desktop_feature_div .a-price-whole', el => el.textContent).catch(() => null);

                log(`Raw Price Text: ${priceText}`);

                if (priceText) {
                    price = parseInt(priceText.replace(/[^0-9]/g, ''))
                }
            } catch (e) {
                log(`Price extraction failed: ${e}`);
            }

            // 2. Images (landingImage or altImages)
            const images: string[] = []
            try {
                // Helper to clean URL to high-res
                const toHighRes = (src: string | null) => {
                    if (!src) return null;
                    // Replace ._AC_..._. with . (Amazon's pattern)
                    return src.replace(/\._AC_.*_\./, '.');
                };

                // Main image
                const mainImg = await page.$eval('#landingImage', (el: any) => el.src).catch(() => null)
                if (mainImg) {
                    const hi = toHighRes(mainImg);
                    if (hi) images.push(hi);
                }

                // Alt images (often in specific container)
                const altImgs = await page.$$eval('#altImages ul li.item img', (els: any[]) => els.map(e => e.src))

                // Additional Image Selectors
                if (images.length === 0) {
                    const dynamicImgs = await page.$$eval('.a-dynamic-image', (els: any[]) => els.map(e => e.getAttribute('data-a-dynamic-image')))
                    dynamicImgs.forEach(json => {
                        if (json) {
                            try {
                                const urls = Object.keys(JSON.parse(json));
                                urls.forEach(u => {
                                    const hi = toHighRes(u);
                                    if (hi && !images.includes(hi)) images.push(hi);
                                });
                            } catch (e) { }
                        }
                    });
                }

                altImgs.forEach(img => {
                    const hi = toHighRes(img);
                    if (hi && !images.includes(hi)) images.push(hi)
                })

                // Fallback: If no images, try finding any large image
                if (images.length === 0) {
                    const anyImg = await page.$eval('#imgTagWrapperId img', (el: any) => el.src).catch(() => null);
                    const hi = toHighRes(anyImg);
                    if (hi && !images.includes(hi)) images.push(hi);
                }

                log(`Found ${images.length} images`);
            } catch (e) {
                log(`Error extracting images: ${e}`);
            }

            // 3. Size / Dimensions / Description
            let description = ''
            try {
                // Technical Details
                const details = await page.$$eval('#prodDetails tr', rows => {
                    return rows.map(row => {
                        const label = row.querySelector('th')?.textContent?.trim() || ''
                        const value = row.querySelector('td')?.textContent?.trim() || ''
                        return `${label}: ${value}`
                    }).filter(s => s.length > 3).join('\n')
                })
                if (details) description += `[Details]\n${details}\n\n`

                // Feature Bullets
                const featureBullets = await page.$eval('#feature-bullets', el => el.textContent?.trim()).catch(() => '')
                if (featureBullets) description += `[Features]\n${featureBullets}\n\n`

                // Main Product Description
                const mainDesc = await page.$eval('#productDescription', el => el.textContent?.trim()).catch(() => '')
                if (mainDesc) description += `[Description]\n${mainDesc}`

                log('Description extraction done');
            } catch (e) {
                log(`Error extracting details: ${e}`);
            }

            // 4. Weight Extraction
            let weight_g = 0
            try {
                const weightText = await page.$$eval('#prodDetails tr, #detailBullets_feature_div li', (els: any[]) => {
                    for (const el of els) {
                        const text = el.textContent?.toLowerCase() || ''
                        if (text.includes('weight') || text.includes('重さ') || text.includes('重量')) {
                            return text
                        }
                    }
                    return null
                })

                if (weightText) {
                    log(`Found Weight Text: ${weightText}`)
                    const match = weightText.match(/(\d+(\.\d+)?)\s*(g|kg|lbs?|ounds?|oz|pounds?|グラム|キロ)/i)
                    if (match) {
                        const value = parseFloat(match[1])
                        const unit = match[3].toLowerCase()

                        if (unit.startsWith('k')) weight_g = value * 1000
                        else if (unit.startsWith('lb') || unit.startsWith('pound')) weight_g = value * 453.592
                        else if (unit.startsWith('oz') || unit.startsWith('ound')) weight_g = value * 28.3495
                        else weight_g = value // grams

                        weight_g = Math.round(weight_g)
                    }
                }
            } catch (e) {
                log(`Error extracting weight: ${e}`)
            }

            log('Amazon Scrape Done');

            return {
                title: productTitle as string,
                price, // Use extracted price
                description,
                images,
                url,
                weight_g,
                logs
            }

        } catch (e) {
            log(`FATAL ERROR: ${e}`);

            try {
                const debugPath = require('path').resolve(__dirname, '../debug_amazon_error.png')
                await page.screenshot({ path: debugPath, fullPage: true })
                log(`Saved error screenshot to: ${debugPath}`);
            } catch (err) {
                log(`Failed to save screenshot: ${err}`);
            }
            return {
                url,
                title: 'Error Scraping Amazon',
                price: 0,
                description: 'Failed to scrape this URL.',
                images: [],
                logs
            }
        } finally {
            await browser.close()
        }
    }

    private async mimicHuman(page: any) {
        await page.mouse.move(100, 100)
        await page.waitForTimeout(1000)
        await page.evaluate(() => window.scrollBy(0, 300))
        await page.waitForTimeout(1500)
    }
}
