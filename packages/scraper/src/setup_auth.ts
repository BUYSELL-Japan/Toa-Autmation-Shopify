import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

async function setupAuth() {
    console.log('--- Mercari Auth Setup ---')
    console.log('Launching browser...')
    console.log('PLEASE LOG IN MANUALLY within the browser window.')

    // Launch non-headless browser for user interaction
    const browser = await chromium.launch({
        headless: false,
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

    try {
        await page.goto('https://jp.mercari.com/', { waitUntil: 'load' })

        console.log('Waiting for login... (Press Ctrl+C to cancel if stuck)')

        // Wait for a long time to give user time to login
        // We check for a common "logged in" indicator, e.g., the notification bell or profile icon
        // Or imply wait for user to close browser? 
        // Better: Wait for a specific URL pattern or element that appears after login.
        // Mercari specific: 'div[data-testid="notification-icon-button"]' usually appears when logged in

        try {
            await page.waitForSelector('[data-testid="notification-icon-button"]', { timeout: 0 }) // Wait indefinitely
            console.log('Login detected!')
        } catch (e) {
            console.log('Browser closed or timeout.')
        }

        // Save storage state (cookies, localStorage)
        const authPath = path.resolve(__dirname, '../auth.json')
        await context.storageState({ path: authPath })
        console.log(`\nSUCCESS: Session saved to ${authPath}`)
        console.log('You can now run the scraper script.')

    } catch (e) {
        console.error('Auth Setup Error:', e)
    } finally {
        await browser.close()
    }
}

setupAuth()
