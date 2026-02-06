import React, { useState } from 'react';
import { Search, Play } from 'lucide-react';

export function ResearchView() {
    const [keyword, setKeyword] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Starting research for: ${keyword}`);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Research & Scraping</h2>

            <div className="glass-panel p-6 mb-8">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1 flex items-center gap-2 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                        <Search size={20} className="text-gray" />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Enter keyword to research (e.g. 'One Piece Figure')"
                            className="bg-transparent border-none text-white w-full outline-none"
                        />
                    </div>
                    <button type="submit" className="btn-primary flex items-center gap-2">
                        <Play size={18} /> Start Scraping
                    </button>
                </form>
            </div>

            <div className="glass-panel p-6">
                <h3 className="text-xl font-bold mb-4">Research History</h3>
                <div className="text-gray text-center py-8">
                    No research missions run yet.
                </div>
            </div>
        </div>
    );
}
