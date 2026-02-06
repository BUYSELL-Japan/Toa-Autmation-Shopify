import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';

export function ProductList() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Mock fetch for now
    useEffect(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setProducts([
                { id: 1, title: 'Anime Figure A', price: 5000, status: 'Draft' },
                { id: 2, title: 'Manga Set Vol.1-10', price: 8000, status: 'Active' },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Products</h2>
                <button className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Product
                </button>
            </div>

            <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-4 p-2" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <Search size={18} className="text-gray" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="bg-transparent border-none text-white w-full outline-none"
                    />
                </div>

                <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr className="text-gray border-b" style={{ borderColor: 'var(--border)' }}>
                            <th className="p-4">Title</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>
                        ) : (
                            products.map(product => (
                                <tr key={product.id} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <td className="p-4 font-bold">{product.title}</td>
                                    <td className="p-4">¥{product.price.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span
                                            className="px-2 py-1 rounded text-xs"
                                            style={{
                                                backgroundColor: product.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                color: product.status === 'Active' ? '#10b981' : '#94a3b8'
                                            }}
                                        >
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button className="text-gray hover:text-white">Edit</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
