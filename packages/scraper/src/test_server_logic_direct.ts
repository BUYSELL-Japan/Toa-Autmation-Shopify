import { MercariScraper } from './mercari';
import { GenericScraper } from './generic';
import { AmazonScraper } from './amazon';

const MERCARI_URL = 'https://jp.mercari.com/item/m32993778186';
const AMAZON_URL = 'https://www.amazon.co.jp/%E3%83%90%E3%83%B3%E3%83%97%E3%83%AC%E3%82%B9%E3%83%88-BPR89429-%E3%83%90%E3%83%B3%E3%83%97%E3%83%AC%E3%82%B9%E3%83%88%E3%80%8E%E3%82%B4%E3%82%B8%E3%83%A9x%E3%82%B3%E3%83%B3%E3%82%B0%E6%96%B0%E3%81%9F%E3%81%AA%E3%82%8B%E5%B8%9D%E5%9B%BD%E3%80%8F%E6%80%AA%E7%8D%A3%E5%92%86%E5%93%AE%E6%92%83%E3%82%B3%E3%83%B3%E3%82%B0From%E6%98%A0%E7%94%BB%E3%80%8EGODZILLAxKONGTHENEWEMPIRE%E3%80%8F2024/dp/B0CXHTVKY9/ref=sr_1_19?crid=30C82UO2ATYJG&dib=eyJ2IjoiMSJ9.Pzz9r7L-JOFvC6wenTtIKGsxI3Jy3qMmw4VWmOLKq7I6LXmqI82ChoYzRQUQaN2ZOos8gLCbE91cA70Z4Ya_WUm1JLq3BjFnmJ2kluRP0w3yRH6-hDzy8NEjg_jLR7KURcpDop9jpRAmNGR7TrVnRxoE8hfZZmxZ7V60sw7tT4fa0tnobWIKPzw2HV3nzSXrkTwtbfOhlj5I4Q-Dx4-C265y-yIWp9hIrFwCaOLY4L-6QmGLRi1JgnM3NblaNP_R7aVw3g6DX-tAy6dRLt2KUdKB1cYFkPWjucPju6oK2Is.03Vt4B6M_9aJYySvilbO4-ojAtAzBGUIlfMyLx0r5bs&dib_tag=se&keywords=%E3%82%B4%E3%82%B8%E3%83%A9x%E3%82%B3%E3%83%B3%E3%82%B0+%E6%96%B0%E3%81%9F%E3%81%AA%E3%82%8B%E5%B8%9D%E5%9B%BD+%E3%83%95%E3%82%A3%E3%82%AE%E3%83%A5%E3%82%A2&qid=1770503952&sprefix=%E3%82%B4%E3%82%B8%E3%83%A9x%E3%82%B3%E3%83%B3%E3%82%B0+%E6%96%B0%E3%81%9F%E3%81%AA%E3%82%8B%E5%B8%9D%E5%9B%BD%E3%80%80%2Caps%2C618&sr=8-19';

async function testLogic() {
    console.log('Testing Logic...');
    const url = MERCARI_URL;
    const subUrls = [AMAZON_URL, ''];

    // Logic copied from server.ts
    try {
        // 1. Scrape Main URL
        let mainData: any;
        if (url.includes('mercari')) {
            const scraper = new MercariScraper();
            mainData = await scraper.scrape(url);
        } else {
            const scraper = new GenericScraper();
            mainData = await scraper.scrape(url);
        }
        console.log('Main Data:', mainData);

        // 2. Scrape Sub URLs
        if (subUrls && Array.isArray(subUrls) && subUrls.length > 0) {
            console.log('Scraping sub URLs...');
            for (const subUrl of subUrls) {
                if (!subUrl) continue;

                let subData: any;
                if (subUrl.includes('amazon')) {
                    const amzScraper = new AmazonScraper();
                    subData = await amzScraper.scrape(subUrl);
                } else {
                    const genScraper = new GenericScraper();
                    subData = await genScraper.scrape(subUrl);
                }

                console.log('Sub Data:', subData);

                if (subData) {
                    // Merge images
                    if (subData.images && subData.images.length > 0) {
                        mainData.images = (mainData.images || []).concat(subData.images);
                        mainData.images = [...new Set(mainData.images)];
                    }
                    // Merge description
                    if (subData.description) {
                        mainData.description += `\n\n[Source: ${subData.title}]\n${subData.description}`;
                    }
                    // Merge Price
                    if (mainData.price === 0 && subData.price && subData.price > 0) {
                        mainData.price = subData.price;
                    }
                }
            }
        }

        console.log('Final Merged Data:', mainData);

    } catch (e: any) {
        console.error('Logic Failed:', e);
    }
}

testLogic();
