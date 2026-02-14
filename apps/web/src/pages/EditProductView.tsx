import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, UploadCloud } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export function EditProductView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState<any>(null);
    const [translating, setTranslating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [calc, setCalc] = useState({
        shippingCost: 0,
        feeRate: 4.5,
        profitMargin: 20,
        recommendedPrice: 0,
        profit: 0
    });
    const [markets, setMarkets] = useState<any[]>([]);
    const [marketPrices, setMarketPrices] = useState<any[]>([]);
    const [rates, setRates] = useState<any>({ JPY: 1 });

    // Sales Channels State
    const [publications, setPublications] = useState<any[]>([]);
    const [selectedPublications, setSelectedPublications] = useState<string[]>([]);
    const [showPublishModal, setShowPublishModal] = useState(false);

    useEffect(() => {
        if (id) fetchProduct(id);
        fetchMarkets();
        fetchRates();
        fetchPublications();
    }, [id]);

    const fetchPublications = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/shopify/publications`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setPublications(data);
                    // Default select all
                    setSelectedPublications(data.map((p: any) => p.id));
                }
            }
        } catch (e) {
            console.error('Failed to fetch publications', e);
        }
    };

    const fetchRates = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/exchange-rates`);
            if (res.ok) {
                const data = await res.json();
                setRates(data.rates);
            }
        } catch (e) { console.error('Failed to fetch rates', e); }
    };

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

    const fetchProduct = async (productId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/products/${productId}`);
            if (res.ok) {
                const data = await res.json();
                // Default inventory to 1 if 0/undefined
                if (data.inventory_quantity === undefined || data.inventory_quantity === 0) {
                    data.inventory_quantity = 1;
                }
                // Ensure tags is handled
                if (!data.tags) data.tags = '';
                setProduct(data);
            } else {
                alert('Product not found');
                navigate('/products');
            }
        } catch (error) {
            console.error('Failed to load product:', error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (product?.weight_g) {
            fetchShippingRates(product.weight_g);
        }
    }, [product?.weight_g]);

    useEffect(() => {
        if (!product) return;
        const cost = Number(product.cost_price) || 0;
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
    }, [product?.cost_price, calc.shippingCost, calc.feeRate, calc.profitMargin]);

    useEffect(() => {
        if (markets.length > 0 && product?.weight_g) {
            calculateMarketPrices();
        }
    }, [product?.cost_price, calc.shippingCost, calc.feeRate, calc.profitMargin, markets, product?.weight_g, rates]);

    const calculateMarketPrices = async () => {
        if (!product?.weight_g) return;

        try {
            const res = await fetch(`${API_BASE_URL}/shipping/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight_g: Number(product.weight_g) })
            });
            const shipRates = await res.json();

            const newMarketPrices = markets.map(market => {
                const countryCode = market.regions.nodes[0]?.code;
                let zone = 'zone4';
                let shipping = shipRates.zone4;

                const ZONE_MAP: any = {
                    'CN': 'zone1', 'KR': 'zone1', 'TW': 'zone1',
                    'HK': 'zone2', 'TH': 'zone2', 'SG': 'zone2', 'MY': 'zone2', 'VN': 'zone2',
                    'AU': 'zone3', 'NZ': 'zone3', 'CA': 'zone3', 'GB': 'zone3', 'DE': 'zone3', 'FR': 'zone3',
                    'US': 'zone4',
                    'BR': 'zone5',
                };

                if (ZONE_MAP[countryCode]) {
                    zone = ZONE_MAP[countryCode];
                    shipping = shipRates[zone];
                } else {
                    if (market.name.includes('Asia')) { zone = 'zone2'; shipping = shipRates.zone2; }
                    else if (market.name.includes('Europe')) { zone = 'zone3'; shipping = shipRates.zone3; }
                }

                const cost = Number(product.cost_price);
                const fee = calc.feeRate / 100;
                const margin = calc.profitMargin / 100;
                const divisor = 1 - fee - margin;

                let recPriceJPY = 0;
                if (divisor > 0) {
                    recPriceJPY = Math.ceil((cost + shipping) / divisor);
                }

                // Convert JPY to Target Currency
                const currency = market.priceList.currency;
                let convertedPrice = recPriceJPY;
                if (currency !== 'JPY' && rates[currency]) {
                    convertedPrice = Math.ceil(recPriceJPY * rates[currency]);
                }

                return {
                    marketId: market.id,
                    name: market.name,
                    priceListId: market.priceList.id,
                    currency: currency,
                    zone: zone,
                    shipping: shipping,
                    price: convertedPrice, // Use converted price for backend
                    recPrice: convertedPrice // Use converted price for display
                };
            });

            setMarketPrices(newMarketPrices);
        } catch (e) {
            console.error(e);
        }
    };

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
            }
        } catch (e) { console.error(e); }
    };

    const applyPrice = () => {
        if (product && calc.recommendedPrice) {
            setProduct({ ...product, selling_price: calc.recommendedPrice });
        }
    };
    const handleTranslate = async () => {
        if (!product.title || !product.body_html) {
            alert('Please format/save title and description (Japanese) first.');
            return;
        }
        setTranslating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/products/format`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: product.title,
                    description: product.body_html // format endpoint expects 'description'
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Formatting failed');
            }

            const result = await res.json();

            // Result contains { ja: {...}, estimated_weight_g: ..., tags: [...] }

            // 1. Update Japanese Content
            const updatedProduct = {
                ...product,
                title: result.ja.title,
                body_html: result.ja.body_html,
                weight_g: result.estimated_weight_g || product.weight_g
            };

            // 2. Merge Tags (Bilingual)
            const enTags = result.tags || [];
            const jaTags = result.tags_ja || [];
            if (enTags.length > 0 || jaTags.length > 0) {
                const currentTags = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
                // Normalize and merge unique tags
                const mergedTags = Array.from(new Set([...currentTags, ...enTags, ...jaTags]))
                    .map((t: any) => typeof t === 'string' ? t.trim() : '')
                    .filter(t => t);
                updatedProduct.tags = mergedTags;
            }

            setProduct(updatedProduct);

            // Trigger translation for other languages after formatting
            // This is a two-step process: Format (JA) -> Translate (EN/ZH/etc)
            // But currently handleTranslate was doing simple translation. 
            // The user asked to "Format with AI" separately or just translate?
            // "Format with AI" usually does the JA format.
            // Let's assume this button is "Format with AI + Tag Extraction" now.

            alert('Format & Tag Extraction completed! You can now generate translations.');

        } catch (e: any) {
            console.error(e);
            alert(`Format failed: ${e.message}`);
        } finally {
            setTranslating(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: product.title,
                    body_html: product.body_html,
                    cost_price: Number(product.cost_price),
                    selling_price: Number(product.selling_price),
                    inventory_quantity: Number(product.inventory_quantity),
                    weight_g: Number(product.weight_g),
                    translations: product.translations,
                    tags: Array.isArray(product.tags) ? product.tags.join(',') : product.tags
                })
            });

            if (res.ok) {
                alert('Product updated successfully!');
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update product');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to DELETE this product? This action cannot be undone.')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Product deleted.');
                navigate('/products');
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to delete product');
        }
    };

    const handlePublish = async () => {
        console.log('Opening Publish Modal...');
        setShowPublishModal(true);
    };

    const executePublish = async () => {
        try {
            // Filter tags for Shopify: English Only (ASCII)
            const allTags = Array.isArray(product.tags) ? product.tags : (product.tags ? product.tags.split(',') : []);
            const shopifyTags = allTags.filter((t: string) => /^[\x00-\x7F]*$/.test(t.trim()));

            const res = await fetch(`${API_BASE_URL}/shopify/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    market_prices: marketPrices,
                    publicationIds: selectedPublications,
                    inventory_quantity: product.inventory_quantity !== undefined ? Number(product.inventory_quantity) : 1,
                    tags: shopifyTags // Override tags with filtered list for Shopify
                })
            });
            if (res.ok) {
                alert('Successfully published to Shopify!');
                setShowPublishModal(false);
                fetchProduct(id!);
            } else {
                const err = await res.json();
                alert(`Publish failed: ${err.error}`);
            }
        } catch (e: any) {
            alert(`Error publishing: ${e.message}`);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading product...</div>;
    if (!product) return <div className="p-8 text-center text-red-400">Product not found</div>;

    const images = JSON.parse(product.images_json || '[]');

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/products')} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                    <ArrowLeft size={20} /> Back to List
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all font-bold"
                        type="button"
                    >
                        <Trash2 size={18} /> Delete
                    </button>
                    <button
                        onClick={handlePublish}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all font-bold ${product.status === 'uploaded' ? 'opacity-80' : ''
                            }`}
                        type="button"
                    >
                        <UploadCloud size={18} /> {product.status === 'uploaded' ? 'Re-publish' : 'Publish to Shopify'}
                    </button>
                </div>
            </div>

            <div className="glass-panel p-8 border border-white/5 bg-[#0f172a]/60 backdrop-blur-xl relative overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-0 right-0 p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${product.status === 'uploaded'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                        Status: {product.status || 'DRAFT'}
                    </span>
                </div>

                {/* Sales Channels Modal */}
                {showPublishModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1e293b] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <UploadCloud size={24} className="text-accent" />
                                Publish to Shopify
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Select the Sales Channels you want to publish this product to.
                            </p>

                            <div className="space-y-3 mb-8">
                                {publications.length === 0 ? (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <p className="text-blue-400 text-sm font-semibold mb-2">📌 販売チャネルが取得できません</p>
                                        <p className="text-gray-400 text-xs">
                                            商品はデフォルトで<span className="text-white font-bold">オンラインストア</span>に公開されます。
                                            販売チャネルの選択なしでそのまま進めます。
                                        </p>
                                    </div>
                                ) : (
                                    publications.map((pub: any) => (
                                        <label key={pub.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f172a] border border-white/5 hover:border-accent/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-accent"
                                                checked={selectedPublications.includes(pub.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPublications([...selectedPublications, pub.id]);
                                                    } else {
                                                        setSelectedPublications(selectedPublications.filter(id => id !== pub.id));
                                                    }
                                                }}
                                            />
                                            <span className="text-gray-200 font-medium">{pub.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPublishModal(false)}
                                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executePublish}
                                    className="px-6 py-2 rounded-lg bg-accent text-white font-bold hover:bg-accent/80 transition-all"
                                >
                                    {publications.length === 0 ? 'Publish (Default Channels)' : 'Confirm Publish'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Column: Images */}
                        <div className="w-full lg:w-auto shrink-0 space-y-4">
                            <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-white/5 sticky top-4">
                                <label className="block text-sm text-gray-400 mb-3">Product Images</label>
                                <div className="flex flex-col gap-4">
                                    {images.length > 0 && (
                                        <div className="w-32 aspect-square bg-black/20 rounded-xl overflow-hidden border border-white/10 relative group">
                                            <img src={images[0]} alt="Main" className="w-full h-full object-contain" />
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white font-bold backdrop-blur">Main</div>
                                        </div>
                                    )}
                                    {images.length > 1 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Sub Images</p>
                                            <div className="flex flex-wrap gap-2 w-64">
                                                {images.slice(1).map((img: string, idx: number) => (
                                                    <div key={idx} className="w-12 h-12 aspect-square rounded-md overflow-hidden border border-white/10 hover:border-accent/50 transition-colors bg-black/20 shrink-0">
                                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Key Info (Title, Pricing, Inventory) */}
                        <div className="flex-1 space-y-6 w-full">
                            {/* Main Info */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Product Title (Japanese)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#1e293b] border border-white/10 rounded-lg p-3 text-white focus:border-accent focus:outline-none"
                                    value={product.title}
                                    onChange={e => setProduct({ ...product, title: e.target.value })}
                                />
                            </div>

                            {/* International Pricing Section */}
                            {marketPrices.length > 0 && (
                                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                    <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        🌏 International Pricing
                                        <span className="text-xs font-normal text-gray-400 ml-auto">Auto-calculated</span>
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {marketPrices.map((mp, idx) => (
                                            <div key={idx} className="bg-[#0f172a] p-2 rounded-lg border border-white/10 text-xs">
                                                <div className="flex justify-between text-gray-400 mb-1">
                                                    <span className="truncate max-w-[80px]">{mp.name}</span>
                                                    <span className="uppercase">{mp.zone}</span>
                                                </div>
                                                <div className="font-bold text-white">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: mp.currency }).format(mp.recPrice)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Cost Price (¥)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#1e293b] border border-white/10 rounded-lg p-3 text-white focus:border-accent focus:outline-none"
                                        value={product.cost_price}
                                        onChange={e => setProduct({ ...product, cost_price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Inventory Qty</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#1e293b] border border-white/10 rounded-lg p-3 text-white focus:border-accent focus:outline-none"
                                        value={product.inventory_quantity || 0}
                                        onChange={e => setProduct({ ...product, inventory_quantity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Selling Price (¥)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#1e293b] border border-white/10 rounded-lg p-3 text-accent font-bold focus:border-accent focus:outline-none"
                                        value={product.selling_price}
                                        onChange={e => setProduct({ ...product, selling_price: e.target.value })}
                                    />
                                </div>
                                {/* Profit Calculator UI */}
                                <div className="bg-accent/5 p-4 rounded-xl border border-accent/20">
                                    <h4 className="text-xs font-bold text-accent mb-2">Profit Calc</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Weight</span>
                                            <input
                                                type="number"
                                                className="w-16 bg-[#0f172a] border border-white/10 rounded px-1 text-right text-white"
                                                value={product.weight_g || 0}
                                                onChange={e => setProduct({ ...product, weight_g: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Rec. Price</span>
                                            <span className="font-bold text-accent">¥{calc.recommendedPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <button
                                                type="button"
                                                onClick={applyPrice}
                                                className="text-[10px] py-1 px-2 border border-accent/30 text-accent hover:bg-accent hover:text-white rounded"
                                            >
                                                Apply
                                            </button>
                                            <span className="text-xs font-bold text-green-400">¥{calc.profit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description Editor */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Description (HTML - Japanese)</label>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <textarea
                                className="w-full h-96 bg-[#1e293b] border border-white/10 rounded-lg p-4 text-gray-300 font-mono text-sm focus:border-accent focus:outline-none resize-none"
                                value={product.body_html || ''}
                                onChange={e => setProduct({ ...product, body_html: e.target.value })}
                            />
                            <div className="h-96 bg-white/5 rounded-lg p-4 overflow-y-auto prose prose-invert prose-sm max-w-none border border-white/10">
                                <div dangerouslySetInnerHTML={{ __html: product.body_html || '' }} />
                            </div>
                        </div>
                    </div>

                    {/* Translations Section */}
                    <div className="pt-8 border-t border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-2 h-6 bg-accent rounded-full"></span>
                                Multi-Language Translations
                            </h3>
                            <button
                                type="button"
                                onClick={handleTranslate}
                                disabled={translating}
                                className="btn-secondary flex items-center gap-2 px-4 py-2 border border-accent/50 text-accent hover:bg-accent hover:text-white transition-all rounded-lg"
                            >
                                {translating ? <span className="animate-pulse">Translating...</span> : 'Generate Translations (AI)'}
                            </button>
                        </div>

                        {product.translations && product.translations.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {product.translations.map((t: any, idx: number) => (
                                    <div key={idx} className="bg-[#1e293b]/50 p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded uppercase text-gray-300">{t.language_code}</span>
                                            <h4 className="font-bold text-white text-sm">Target Language</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Title</label>
                                                <input
                                                    className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:border-accent focus:outline-none"
                                                    value={t.title}
                                                    onChange={(e) => {
                                                        const newTrans = [...product.translations];
                                                        newTrans[idx].title = e.target.value;
                                                        setProduct({ ...product, translations: newTrans });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Description</label>
                                                <textarea
                                                    className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-3 text-sm text-gray-300 h-32 focus:border-accent focus:outline-none"
                                                    value={t.body_html}
                                                    onChange={(e) => {
                                                        const newTrans = [...product.translations];
                                                        newTrans[idx].body_html = e.target.value;
                                                        setProduct({ ...product, translations: newTrans });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-gray-500">
                                No translations generated yet. Click the button above to generate.
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    <div className="pt-8 border-t border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-accent rounded-full"></span>
                            Tags & Attributes
                        </h3>
                        <div className="bg-[#1e293b]/50 p-6 rounded-xl border border-white/5">
                            {/* Rarity Dropdown */}
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2">Rarity</label>
                                <select
                                    className="w-full md:w-1/3 bg-[#0f172a] border border-white/10 rounded-lg p-3 text-white focus:border-accent focus:outline-none"
                                    value={(Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',')).find((t: string) => t.trim().startsWith('Rarity:'))?.split(':')[1]?.trim() || 'Common'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const currentTags = Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',');
                                        // Remove existing Rarity tag
                                        const newTags = currentTags.filter((t: string) => !t.trim().startsWith('Rarity:'));
                                        // Add new Rarity tag
                                        newTags.push(`Rarity:${val}`);
                                        setProduct({ ...product, tags: newTags });
                                    }}
                                >
                                    <option value="Common">Common (General Check)</option>
                                    <option value="Uncommon">Uncommon (Minor Prize)</option>
                                    <option value="Rare">Rare (Standard Scale/Nendoroid)</option>
                                    <option value="Very Rare">Very Rare (Limited/Ichiban Kuji)</option>
                                    <option value="Ultra Rare">Ultra Rare (Vintage/Numbered)</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {product.tags && (typeof product.tags === 'string' ? product.tags.split(',') : product.tags).map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-accent/10 border border-accent/20 text-accent px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                        {tag.trim()}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentTags = typeof product.tags === 'string' ? product.tags.split(',') : product.tags;
                                                const newTags = currentTags.filter((_: any, i: number) => i !== idx);
                                                setProduct({ ...product, tags: newTags });
                                            }}
                                            className="hover:text-white"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a tag..."
                                    className="flex-1 bg-[#0f172a] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent focus:outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                                const currentTags = product.tags ? (typeof product.tags === 'string' ? product.tags.split(',') : product.tags) : [];
                                                setProduct({ ...product, tags: [...currentTags, val] });
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-500 self-center">Press Enter to add</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 px-8 py-3 text-lg shadow-lg hover:shadow-accent/20"
                        >
                            <Save size={20} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
