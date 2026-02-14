import React, { useState } from 'react';
import { Search, Play } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export function ResearchView() {
    const [mercariUrl, setMercariUrl] = useState('');
    const [subUrl1, setSubUrl1] = useState('');
    const [subUrl2, setSubUrl2] = useState('');
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [calc, setCalc] = useState({
        shippingCost: 0,
        feeRate: 4.5,
        profitMargin: 20,
        recommendedPrice: 0,
        profit: 0
    });
    const [markets, setMarkets] = useState<any[]>([]);
    const [marketPrices, setMarketPrices] = useState<any[]>([]);

    // Fetch markets on mount
    React.useEffect(() => {
        fetchMarkets();
    }, []);

    const fetchMarkets = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/shopify/markets`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMarkets(data.filter((m: any) => m.enabled));
            }
        } catch (e) {
            console.error("Failed to fetch markets", e);
        }
    };

    // Recalculate when weight or cost changes
    React.useEffect(() => {
        if (results?.weight_g) {
            fetchShippingRates(results.weight_g);
        }
    }, [results?.weight_g]);

    const fetchShippingRates = async (weight: number) => {
        if (!weight) return;
        try {
            const res = await fetch(`${API_BASE_URL}/shipping/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight_g: weight })
            });
            if (res.ok) {
                const rates = await res.json();
                // Default to Zone 4 (USA)
                setCalc(prev => ({ ...prev, shippingCost: rates.zone4 }));

                // Also triggers market calculation via next effect
                calculateMarketPrices(rates);
            }
        } catch (e) { console.error(e); }
    };

    const calculateMarketPrices = (rates: any) => {
        if (!markets.length) return;

        const newMarketPrices = markets.map(market => {
            const countryCode = market.regions.nodes[0]?.code;
            let zone = 'zone4';
            let shipping = rates.zone4;

            const ZONE_MAP: any = {
                'CN': 'zone1', 'KR': 'zone1', 'TW': 'zone1',
                'HK': 'zone2', 'TH': 'zone2', 'SG': 'zone2', 'MY': 'zone2', 'VN': 'zone2',
                'AU': 'zone3', 'NZ': 'zone3', 'CA': 'zone3', 'GB': 'zone3', 'DE': 'zone3', 'FR': 'zone3',
                'US': 'zone4',
                'BR': 'zone5',
            };

            if (ZONE_MAP[countryCode]) {
                zone = ZONE_MAP[countryCode];
                shipping = rates[zone];
            } else {
                if (market.name.includes('Asia')) { zone = 'zone2'; shipping = rates.zone2; }
                else if (market.name.includes('Europe')) { zone = 'zone3'; shipping = rates.zone3; }
            }

            const cost = Number(results?.price) || 0;
            const fee = calc.feeRate / 100;
            const margin = calc.profitMargin / 100;
            const divisor = 1 - fee - margin;

            let recPrice = 0;
            if (divisor > 0) {
                recPrice = Math.ceil((cost + shipping) / divisor);
            }

            return {
                marketId: market.id,
                name: market.name,
                currency: market.priceList.currency,
                zone: zone,
                recPrice: recPrice
            };
        });

        setMarketPrices(newMarketPrices);
    };

    // Calculate Main Profit
    React.useEffect(() => {
        if (!results) return;
        const cost = Number(results.price) || 0;
        const shipping = calc.shippingCost;
        const fee = calc.feeRate / 100;
        const margin = calc.profitMargin / 100;

        if (cost > 0 && shipping > 0) {
            const denominator = 1 - fee - margin;
            if (denominator > 0) {
                const price = Math.ceil((cost + shipping) / denominator);
                const actualFee = Math.floor(price * fee);
                const actualProfit = price - cost - shipping - actualFee;

                setCalc(prev => ({ ...prev, recommendedPrice: price, profit: actualProfit }));
            }
        }
    }, [results?.price, calc.shippingCost, calc.feeRate, calc.profitMargin]);


    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResults(null);

        try {
            console.log('Scraping:', { mercariUrl, subUrls: [subUrl1, subUrl2] });

            const response = await fetch('http://localhost:3001/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: mercariUrl,
                    subUrls: [subUrl1, subUrl2].filter(u => u)
                })
            });

            if (!response.ok) throw new Error('Scraping failed');

            const mainData = await response.json();

            setResults({
                title: mainData.title,
                price: mainData.price,
                description: mainData.description || 'No description extracted yet.',
                images: mainData.images || [],
                logs: mainData.logs || [],
                weight_g: 0 // Initialize
            });

            setLoading(false);

        } catch (error) {
            console.error(error);
            alert('Scraping failed. Make sure the local server is running (npm run serve in packages/scraper).');
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!results) return;

        try {
            const sources = [];
            if (mercariUrl) sources.push({ url: mercariUrl, source_type: 'mercari', price: results.price });
            if (subUrl1) sources.push({ url: subUrl1, source_type: 'generic', price: 0 });
            if (subUrl2) sources.push({ url: subUrl2, source_type: 'generic', price: 0 });

            const payload = {
                title: results.title,
                description: results.description,
                price: results.price, // Cost Price
                selling_price: calc.recommendedPrice || 0, // Calculated Selling Price
                images: results.images,
                sources: sources,
                translations: results.translations,
                weight_g: results.weight_g // Save Weight
            };

            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save');
            }

            alert('Product saved to D1 successfully!');

        } catch (e: any) {
            console.error(e);
            alert(`Save failed: ${e.message}`);
        }
    };


    const handleFormat = async () => {
        if (!results) {
            console.error('No results to format');
            alert('No scraped results found. Please scrape a product first.');
            return;
        }

        try {
            console.log('Requesting format for:', { title: results.title });
            const response = await fetch(`${API_BASE_URL}/products/format`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: results.title,
                    description: results.description
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                let errMsg = 'Formatting failed';
                try {
                    const errJson = JSON.parse(errText);
                    errMsg = errJson.error || errMsg;
                } catch (e) { errMsg = errText; }
                throw new Error(errMsg);
            }

            const formatted = await response.json();
            console.log('Formatted AI Response:', formatted);

            if (!formatted || !formatted.ja) {
                throw new Error('Invalid AI response format: Missing "ja" key');
            }

            setResults({
                ...results,
                title: formatted.ja.title,
                description: formatted.ja.body_html,
                weight_g: formatted.estimated_weight_g || 500,
                translations: []
            });

            alert('Formatted successfully!');

        } catch (e: any) {
            console.error('Format Error:', e);
            alert(`Format failed: ${e.message}`);
        }
    };

    const handlePublish = async () => {
        alert("Please go to the 'Product Management' page to publish saved items.");
    };


    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Research & Scraping</h2>

            <div className="glass-panel p-6 mb-8">
                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-gray mb-1">Mercari URL (Main - Title/Price)</label>
                        <div className="flex items-center gap-2 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                            <Search size={20} className="text-gray" />
                            <input
                                type="text"
                                value={mercariUrl}
                                onChange={(e) => setMercariUrl(e.target.value)}
                                placeholder="https://jp.mercari.com/item/..."
                                className="bg-transparent border-none text-white w-full outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="block text-sm text-gray mb-1">Sub URL 1 (Images/Desc)</label>
                            <div className="flex items-center gap-2 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                                <input
                                    type="text"
                                    value={subUrl1}
                                    onChange={(e) => setSubUrl1(e.target.value)}
                                    placeholder="https://site1.com/..."
                                    className="bg-transparent border-none text-white w-full outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray mb-1">Sub URL 2 (Images/Desc)</label>
                            <div className="flex items-center gap-2 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                                <input
                                    type="text"
                                    value={subUrl2}
                                    onChange={(e) => setSubUrl2(e.target.value)}
                                    placeholder="https://site2.com/..."
                                    className="bg-transparent border-none text-white w-full outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-2">
                        {loading ? status : <><Play size={18} /> Start Multi-Source Scraping</>}
                    </button>
                </form>
            </div>

            {results && (
                <div className="glass-panel p-6">
                    <h3 className="text-xl font-bold mb-4">Scraped Result (Mock)</h3>
                    <div className="flex gap-4">
                        <div className="w-24 flex-shrink-0">
                            <div className="w-24 h-24 bg-black/20 rounded-lg mb-2 flex items-center justify-center overflow-hidden border border-white/10">
                                <img src={results.images[0]} alt={results.title} className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold mb-1 line-clamp-2">{results.title}</h4>
                            <p className="text-lg font-bold text-accent mb-2">¥{Number(results.price || 0).toLocaleString()}</p>

                            <div className="p-4 bg-[#0f172a] rounded-lg max-h-96 overflow-y-auto mb-4">
                                <h5 className="text-sm font-bold text-gray-400 mb-2">Description & Details</h5>
                                <p className="text-gray text-sm whitespace-pre-wrap break-words">{results.description}</p>
                            </div>

                            {/* Profit Calculator in Research View */}
                            <div className="bg-accent/5 p-4 rounded-xl border border-accent/20 mb-4">
                                <h4 className="text-sm font-bold text-accent mb-3 flex items-center gap-2">
                                    💰 Profit Calculator
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Weight (g)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white text-sm"
                                            value={results.weight_g || 0}
                                            onChange={e => setResults({ ...results, weight_g: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Shipping (Zone 4)</label>
                                        <div className="p-2 text-sm text-gray-300">¥{calc.shippingCost.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Rec. Price</label>
                                        <div className="p-2 text-sm font-bold text-accent">¥{calc.recommendedPrice.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 text-right">
                                            Est. Profit: <span className="text-green-400 font-bold">¥{calc.profit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* International Pricing Section */}
                            {marketPrices.length > 0 && (
                                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 mb-4">
                                    <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        🌏 International Pricing
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {marketPrices.slice(0, 4).map((mp, idx) => ( // Show top 4
                                            <div key={idx} className="bg-[#0f172a] p-2 rounded-lg border border-white/10 text-xs">
                                                <div className="flex justify-between text-gray-400 mb-1">
                                                    <span>{mp.name}</span>
                                                    <span className="uppercase">{mp.zone}</span>
                                                </div>
                                                <div className="font-bold text-white">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: mp.currency }).format(mp.recPrice)}
                                                </div>
                                            </div>
                                        ))}
                                        {marketPrices.length > 4 && (
                                            <div className="flex items-center justify-center text-xs text-gray-500">
                                                + {marketPrices.length - 4} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                            <div className="mt-4 flex gap-2">
                                <button onClick={handleFormat} className="btn-secondary px-4 py-2 border border-accent text-accent rounded hover:bg-accent hover:text-white transition-colors">
                                    Format with AI
                                </button>
                                <button onClick={handleSave} className="btn-primary">Save to D1</button>
                                <button onClick={handlePublish} className="text-gray hover:text-white px-4 py-2">Edit / Publish</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
