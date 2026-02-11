import React, { useEffect, useState } from 'react';
import { Plus, Search, UploadCloud } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export function ProductList() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (e) {
            console.error('Failed to fetch products', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handlePublish = async (id: string) => {
        if (!confirm('Are you sure you want to publish this product to Shopify?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/shopify/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error', details: 'Failed to parse error response' }));
                throw new Error(err.details || err.error || JSON.stringify(err));
            }

            const data = await res.json();
            alert(`Successfully published! Shopify ID: ${data.shopify_id}`);
            fetchProducts(); // Refresh list to show updated status

        } catch (e: any) {
            console.error('Publish Error:', e);
            alert(`Error publishing:\n${e.message}`);
        }
    };

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Product Management</h2>
                    <p className="text-gray-400 mt-1">Manage and publish your inventory</p>
                </div>
                <button className="btn-primary flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all">
                    <Plus size={18} />
                    <span className="font-bold">Add Product</span>
                </button>
            </div>

            <div className="glass-panel p-6 border border-white/5 bg-[#0f172a]/60 backdrop-blur-xl">
                <div className="relative mb-8 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={20} className="text-gray-400 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search products by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1e293b]/50 text-white pl-12 pr-4 py-4 rounded-xl border border-white/10 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 focus:outline-none transition-all placeholder-gray-500 text-lg"
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 animate-pulse">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Loading your inventory...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-[#1e293b]/30 rounded-2xl border border-dashed border-white/10">
                        <p className="text-xl text-gray-400 mb-2">No products found</p>
                        <p className="text-gray-500">Go to Research page to import new items.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
                        {filteredProducts.map(product => {
                            const images = (() => {
                                try {
                                    const parsed = JSON.parse(product.images_json || '[]');
                                    return Array.isArray(parsed) ? parsed : [];
                                } catch (e) { return []; }
                            })();
                            const mainImage = images[0] || null;

                            return (
                                <div key={product.id} className="group relative bg-[#1e293b]/40 border border-[#334155]/50 rounded-xl overflow-hidden hover:border-accent/50 hover:bg-[#1e293b]/60 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)] transition-all duration-300 flex flex-col">
                                    {/* Image Area */}
                                    <div className="relative aspect-square bg-[#0f172a] overflow-hidden">
                                        {mainImage ? (
                                            <img
                                                src={mainImage}
                                                alt={product.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600 bg-[#0f172a]">
                                                <span className="text-xs">No Image</span>
                                            </div>
                                        )}

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60"></div>

                                        {/* Status Badge */}
                                        <div className="absolute top-2 right-2 z-10">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold backdrop-blur-md border shadow-lg ${product.status === 'uploaded'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                {product.status === 'uploaded' ? 'Live' : 'Draft'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-3 flex-1 flex flex-col">
                                        <h3 className="font-bold text-xs mb-1 line-clamp-2 min-h-[2.5rem] text-gray-200 group-hover:text-white transition-colors leading-snug" title={product.title}>
                                            {product.title}
                                        </h3>

                                        <div className="mt-auto pt-2 space-y-2">
                                            <div className="bg-[#0f172a]/50 rounded-lg border border-white/5 p-2 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Cost</p>
                                                    <p className="text-xs font-medium text-gray-400">¥{product.cost_price?.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] uppercase tracking-wider text-accent/70 font-semibold">Sell</p>
                                                    <p className="text-sm font-bold text-white">
                                                        ¥{product.selling_price?.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                                                <button
                                                    onClick={() => window.location.href = `/products/${product.id}/edit`}
                                                    className="py-1.5 rounded-md bg-[#334155]/30 hover:bg-[#334155]/60 text-gray-300 hover:text-white transition-all text-xs font-medium border border-transparent hover:border-white/10"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handlePublish(product.id)}
                                                    className={`py-1.5 rounded-md bg-accent/10 hover:bg-accent text-accent hover:text-[#0f172a] border border-accent/20 hover:border-accent transition-all text-xs font-bold flex items-center justify-center gap-1.5 group/btn ${product.status === 'uploaded' ? 'opacity-80' : ''
                                                        }`}
                                                >
                                                    <UploadCloud size={12} className="group-hover/btn:animate-bounce" />
                                                    {product.status === 'uploaded' ? 'Update' : 'Pub'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
