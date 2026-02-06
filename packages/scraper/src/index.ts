import { chromium } from 'playwright'

export async function scrapeAmazon(keyword: string) {
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(`https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`)

    const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.s-result-item')
        return Array.from(items).map(item => {
            const title = item.querySelector('h2')?.innerText
            const price = item.querySelector('.a-price-whole')?.innerText
            const link = item.querySelector('a.a-link-normal')?.getAttribute('href')
            return { title, price, link }
        }).filter(i => i.title)
    })

    await browser.close()
    return results
}

if (require.main === module) {
    scrapeAmazon('anime figure').then(console.log).catch(console.error)
}
