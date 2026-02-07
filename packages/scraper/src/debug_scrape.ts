import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

async function debugScrape(url: string) {
    console.log(`Debug scraping: ${url}`)
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    })
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'ja-JP'
    })

    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    const page = await context.newPage()

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 })

        // Take Screenshot
        const text = await page.title()
        console.log(`Page Title: ${text}`)

        const screenshotPath = path.resolve(__dirname, '../debug_screenshot.png')
        await page.screenshot({ path: screenshotPath, fullPage: true })
        console.log(`Screenshot saved to: ${screenshotPath}`)

        // Dump HTML
        const htmlPath = path.resolve(__dirname, '../debug_page.html')
        fs.writeFileSync(htmlPath, await page.content())
        console.log(`HTML saved to: ${htmlPath}`)

    } catch (e) {
        console.error('Debug Error:', e)
    } finally {
        await browser.close()
    }
}

if (require.main === module) {
    const url = process.argv[2] || 'https://jp.mercari.com/item/m53873406323'
    debugScrape(url)
}
