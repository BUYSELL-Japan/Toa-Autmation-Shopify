
import fetch from 'node-fetch';

async function testApi() {
    console.log('Testing Scraper API...');
    try {
        const response = await fetch('http://localhost:3001/scrape', {
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
        console.log('Full Logs:', JSON.stringify(data.logs, null, 2));

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testApi();
