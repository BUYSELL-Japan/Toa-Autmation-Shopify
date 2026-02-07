const { chromium } = require('playwright');

(async () => {
    console.log('--- JS Test Start ---');
    try {
        console.log('Launching browser (Headless: FALSE)...');
        const browser = await chromium.launch({
            headless: false,
            // Add slight delay to ensure window creation is visible
            slowMo: 100
        });
        console.log('Browser launched!');

        const page = await browser.newPage();
        console.log('Page created.');

        await page.goto('https://google.com');
        console.log('Navigated to Google.');

        console.log('Waiting 5 seconds...');
        await new Promise(r => setTimeout(r, 5000));

        await browser.close();
        console.log('Browser closed.');
    } catch (e) {
        console.error('ERROR:', e);
    }
})();
