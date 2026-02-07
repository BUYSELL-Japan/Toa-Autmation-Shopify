import { MercariScraper, ScrapedData } from './mercari'
import { GenericScraper } from './generic'

export interface MultiSourceData {
    type: 'main' | 'sub'
    data: ScrapedData
}

export async function scrapeProduct(mercariUrl: string, subUrls: string[]): Promise<MultiSourceData[]> {
    const results: MultiSourceData[] = []

    // 1. Scrape Mercari (Main Source for Price/Title)
    if (mercariUrl) {
        const mercari = new MercariScraper()
        const data = await mercari.scrape(mercariUrl)
        results.push({ type: 'main', data })
    }

    // 2. Scrape Sub URLs (Source for Images/Desc)
    const generic = new GenericScraper()
    for (const url of subUrls) {
        if (!url) continue
        const data = await generic.scrape(url)
        results.push({ type: 'sub', data })
    }

    return results
}

if (require.main === module) {
    // Basic CLI test
    const args = process.argv.slice(2)
    if (args.length > 0) {
        scrapeProduct(args[0], args.slice(1)).then(console.log).catch(console.error)
    } else {
        console.log('Usage: ts-node src/index.ts <mercari_url> [sub_url_1] [sub_url_2]')
    }
}
