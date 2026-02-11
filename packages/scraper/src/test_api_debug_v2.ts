
// Use native fetch (Node 18+) or standard require to avoid TS issues
const _fetch = globalThis.fetch || require('node-fetch');

async function testApi() {
    console.log('Testing Scraper API...');
    try {
        const response = await _fetch('http://localhost:3001/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: 'https://jp.mercari.com/item/m32993778186',
                subUrls: ['https://www.amazon.co.jp/dp/B0CXHTVKY9']
            })
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Body:', text);
            return;
        }

        const data = await response.json();
        console.log('API Response Status:', response.status);
        console.log('Has logs?', !!data.logs);
        console.log('Logs length:', data.logs ? data.logs.length : 0);
        console.log('First log:', data.logs ? data.logs[0] : 'N/A');

        if (data.logs) {
            console.log('--- LOGS START ---');
            data.logs.forEach((log: string) => console.log(log));
            console.log('--- LOGS END ---');
        } else {
            console.log('NO LOGS FOUND IN RESPONSE');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testApi();
