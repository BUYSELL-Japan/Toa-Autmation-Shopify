


async function testFormat() {
    console.log('Testing Format API...');
    try {
        const response = await fetch('http://127.0.0.1:8788/products/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Test Anime Figure",
                description: "This is a very cool figure from the popular anime Chainsaw Man. Condition is new."
            })
        });

        if (!response.ok) {
            console.error('API Error Status:', response.status);
            console.error('API Error Text:', await response.text());
            return;
        }

        const data = await response.json();
        console.log('API Success:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Network/Script Error:', error);
    }
}

testFormat();
