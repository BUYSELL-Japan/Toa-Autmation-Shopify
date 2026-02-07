import React, { useState } from 'react';
import { Search, Play } from 'lucide-react';

export function ResearchView() {
    const [mercariUrl, setMercariUrl] = useState('');
    const [subUrl1, setSubUrl1] = useState('');
    const [subUrl2, setSubUrl2] = useState('');
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResults(null);

        try {
            console.log('Scraping:', { mercariUrl, subUrls: [subUrl1, subUrl2] });

            // 1. Scrape Main URL (Mercari)
            const response = await fetch('http://localhost:3001/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: mercariUrl })
            });

            if (!response.ok) throw new Error('Scraping failed');

            const mainData = await response.json();

            // 2. Scrape Sub URLs (Parallel)
            // TODO: Implement sub-url scraping logic similarly if needed
            // For now, just use main data

            setResults({
                title: mainData.title,
                price: mainData.price,
                description: mainData.description || 'No description extracted yet.',
                images: mainData.images || []
            });

            setLoading(false);

        } catch (error) {
            console.error(error);
            alert('Scraping failed. Make sure the local server is running (npm run serve in packages/scraper).');
            setLoading(false);
        }
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
                        {loading ? 'Scraping...' : <><Play size={18} /> Start Multi-Source Scraping</>}
                    </button>
                </form>
            </div>

            {results && (
                <div className="glass-panel p-6">
                    <h3 className="text-xl font-bold mb-4">Scraped Result (Mock)</h3>
                    <div className="flex gap-6">
                        <div className="w-1/3">
                            <img src={results.images[0]} alt={results.title} className="w-full rounded-lg mb-2" />
                            <div className="flex gap-2">
                                {results.images.slice(1).map((img: string, i: number) => (
                                    <img key={i} src={img} className="w-16 h-16 rounded object-cover" />
                                ))}
                            </div>
                        </div>
                        <div className="w-2/3">
                            <h4 className="text-lg font-bold mb-2">{results.title}</h4>
                            <p className="text-2xl font-bold text-accent mb-4">¥{results.price.toLocaleString()}</p>

                            <div className="p-4 bg-[#0f172a] rounded-lg max-h-96 overflow-y-auto">
                                <h5 className="text-sm font-bold text-gray-400 mb-2">Description & Details</h5>
                                <p className="text-gray text-sm whitespace-pre-wrap">{results.description}</p>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button className="btn-primary">Save to D1</button>
                                <button className="text-gray hover:text-white px-4 py-2">Edit</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
