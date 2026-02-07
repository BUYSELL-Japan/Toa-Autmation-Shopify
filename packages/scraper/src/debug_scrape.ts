import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

async function debugScrape(url: string) {
    console.log(`Debug scraping: ${url}`)
    const browser = await chromium.launch({
        headless: true, // Keep headerless for consistent debugging environment
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    })
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo'
    })

    // Stealth
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    const page = await context.newPage()

    // 1. Capture Console Logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()))

    // 2. Capture Network Response
    page.on('response', response => {
        if (response.url() === url || response.status() > 399) {
            console.log(`RESPONSE: ${response.status()} ${response.url()}`)
            console.log('HEADERS:', JSON.stringify(response.headers(), null, 2))
        }
    })

    try {
        console.log('Navigating...')
        const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 })

        console.log('--- Navigation Complete ---')
        console.log(`Final URL: ${page.url()}`)
        console.log(`Status: ${response?.status()}`)

        const title = await page.title()
        console.log(`Page Title: ${title}`)

        // 3. Screenshot
        const screenshotPath = path.resolve(__dirname, '../debug_screenshot.png')
        await page.screenshot({ path: screenshotPath, fullPage: true })
        console.log(`Screenshot saved: ${screenshotPath}`)

        // 4. HTML Dump
        const htmlPath = path.resolve(__dirname, '../debug_page.html')
        fs.writeFileSync(htmlPath, await page.content())
        console.log(`HTML saved: ${htmlPath}`)

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
