import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MercariScraper } from './mercari';
import { GenericScraper } from './generic';
import { AmazonScraper } from './amazon';

const app = express();
const PORT = 3001; // Avoid 3000 (React default) or 8787 (Hono default)

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Scraper API is running. POST to /scrape');
});

app.post('/scrape', async (req: Request, res: Response): Promise<void> => {
    const { url, subUrls } = req.body;

    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }

    console.log(`Received scrape request. Main: ${url}, Subs: ${subUrls}`);

    try {
        // 1. Scrape Main URL
        let mainData;
        if (url.includes('mercari')) {
            const scraper = new MercariScraper();
            mainData = await scraper.scrape(url);
        } else {
            const scraper = new GenericScraper();
            mainData = await scraper.scrape(url);
        }

        // Initialize logs if missing
        if (!(mainData as any).logs) {
            (mainData as any).logs = [`[Server] Scrape started for ${url}`];
        } else {
            (mainData as any).logs.unshift(`[Server] Scrape started for ${url}`);
        }

        // 2. Scrape Sub URLs
        if (subUrls && Array.isArray(subUrls) && subUrls.length > 0) {
            console.log('Scraping sub URLs...');
            for (const subUrl of subUrls) {
                if (!subUrl) continue;

                let subData;
                if (subUrl.includes('amazon')) {
                    const amzScraper = new AmazonScraper();
                    subData = await amzScraper.scrape(subUrl);
                } else {
                    const genScraper = new GenericScraper();
                    subData = await genScraper.scrape(subUrl);
                }

                if (subData) {
                    if (subData.images && subData.images.length > 0) {
                        mainData.images = (mainData.images || []).concat(subData.images);
                        mainData.images = [...new Set(mainData.images)]; // Unique
                    }
                    // Merge logs
                    if ((subData as any).logs && (subData as any).logs.length > 0) {
                        (mainData as any).logs = ((mainData as any).logs || []).concat((subData as any).logs);
                    }
                    // Merge description
                    if (subData.description) {
                        const title = subData.title || 'External';
                        const price = (subData.price && subData.price > 0) ? `(Price: ¥${subData.price.toLocaleString()})` : '';
                        mainData.description += `\n\n[Source: ${title}] ${price}\n${subData.description}`;
                    }
                    // Merge Price if main is 0
                    if (mainData.price === 0 && subData.price && subData.price > 0) {
                        mainData.price = subData.price;
                    }
                }
            }
        }

        // Initialize logs if missing
        const logs = (mainData as any).logs || [];
        logs.unshift(`[Server] Response prepared for ${url}`);

        console.log('Final Logs to return:', logs);

        const responseData = {
            ...mainData,
            logs: logs
        };

        console.log('Scrape success, sending response.');
        res.json(responseData);
    } catch (e: any) {
        console.error('Scrape failed:', e);
        res.status(500).json({
            error: 'Scraping failed',
            details: e.message,
            logs: [`[Server] Fatal Error: ${e.message}`]
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local Scraper Server running at http://localhost:${PORT}`);
    console.log(`Keep this terminal open while using the Web UI.`);
});
