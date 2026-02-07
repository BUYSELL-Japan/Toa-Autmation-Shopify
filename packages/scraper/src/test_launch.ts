import { chromium } from 'playwright'

async function testLaunch() {
    console.log('--- Browser Launch Test ---')
    console.log('Attempting to launch browser (headless: false)...')

    try {
        const browser = await chromium.launch({
            headless: false,
            args: ['--disable-blink-features=AutomationControlled']
        })
        console.log('Browser launched successfully!')

        const page = await browser.newPage()
        console.log('New page created.')

        await page.goto('https://example.com')
        console.log('Navigated to example.com')

        console.log('Waiting 5 seconds so you can see the browser...')
        await page.waitForTimeout(5000)

        await browser.close()
        console.log('Browser closed.')
        console.log('--- Test Passed ---')

    } catch (e) {
        console.error('--- Test Failed ---')
        console.error(e)
    }
}

testLaunch()
