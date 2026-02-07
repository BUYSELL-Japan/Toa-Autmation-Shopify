import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MercariScraper } from './mercari';
import { GenericScraper } from './generic';

const app = express();
const PORT = 3001; // Avoid 3000 (React default) or 8787 (Hono default)

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Scraper API is running. POST to /scrape');
});

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Received scrape request for: ${url}`);

    try {
        let data;
        if (url.includes('mercari')) {
            const scraper = new MercariScraper();
            data = await scraper.scrape(url);
        } else {
            const scraper = new GenericScraper();
            data = await scraper.scrape(url);
        }

        console.log('Scrape success:', data);
        res.json(data);
    } catch (e: any) {
        console.error('Scrape failed:', e);
        res.status(500).json({
            error: 'Scraping failed',
            details: e.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local Scraper Server running at http://localhost:${PORT}`);
    console.log(`Keep this terminal open while using the Web UI.`);
});
