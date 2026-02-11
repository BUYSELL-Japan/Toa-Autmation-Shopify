import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export function SettingsView() {
    const [settings, setSettings] = useState({
        profit_margin: 20,
        platform_fee: 10,
        shipping_cost: 1000
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Shopify Token State
    const [tokenStatus, setTokenStatus] = useState<any>(null);
    const [tokenLoading, setTokenLoading] = useState(true);
    const [authenticating, setAuthenticating] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchTokenStatus();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/settings`);
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    profit_margin: Number(data.profit_margin) || 20,
                    platform_fee: Number(data.platform_fee) || 10,
                    shipping_cost: Number(data.shipping_cost) || 1000
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTokenStatus = async () => {
        setTokenLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/shopify/token-status`);
            if (res.ok) {
                const data = await res.json();
                setTokenStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch token status:', error);
        } finally {
            setTokenLoading(false);
        }
    };

    const handleAuthenticate = () => {
        setAuthenticating(true);
        const width = 800;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const oauthWindow = window.open(
            `${API_BASE_URL}/shopify/auth`,
            'ShopifyOAuth',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll to check if window is closed
        const checkWindow = setInterval(() => {
            if (oauthWindow?.closed) {
                clearInterval(checkWindow);
                setAuthenticating(false);
                // Refresh token status after authentication
                setTimeout(() => fetchTokenStatus(), 1000);
            }
        }, 500);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                alert('Settings saved!');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gradient">Application Settings</h2>

            {/* Shopify Integration Section */}
            <div className="glass-panel p-8 mb-6 border border-white/5 bg-[#0f172a]/60">
                <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                    🛍️ Shopify Integration
                </h3>

                {tokenLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                        <RefreshCw size={16} className="animate-spin" />
                        Checking connection...
                    </div>
                ) : tokenStatus?.valid ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                        <p className="text-green-400 font-semibold flex items-center gap-2">
                            <CheckCircle size={20} />
                            Connected to Shopify
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Store: <span className="text-white font-medium">{tokenStatus.shopName}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Token source: {tokenStatus.source === 'database' ? 'Database (OAuth)' : 'Environment Variable'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                        <p className="text-yellow-400 font-semibold flex items-center gap-2">
                            <AlertCircle size={20} />
                            Not Connected
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            {tokenStatus?.message || 'Click the button below to authenticate with Shopify'}
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleAuthenticate}
                    disabled={authenticating}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-bold hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {authenticating ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            Authenticating...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} />
                            {tokenStatus?.valid ? 'Re-authenticate' : 'Connect to Shopify'}
                        </>
                    )}
                </button>
            </div>

            <div className="glass-panel p-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Price Calculation Rules</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Profit Margin (%)</label>
                            <input
                                type="number"
                                value={settings.profit_margin}
                                onChange={e => setSettings({ ...settings, profit_margin: Number(e.target.value) })}
                                className="w-full bg-[#0f172a] border border-[#334155] rounded p-3 text-white focus:outline-none focus:border-accent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Desired profit margin on the final selling price.</p>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Platform Fee (%)</label>
                            <input
                                type="number"
                                value={settings.platform_fee}
                                onChange={e => setSettings({ ...settings, platform_fee: Number(e.target.value) })}
                                className="w-full bg-[#0f172a] border border-[#334155] rounded p-3 text-white focus:outline-none focus:border-accent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Shopify/Payment gateway transaction fees.</p>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Shipping Cost (JPY)</label>
                            <input
                                type="number"
                                value={settings.shipping_cost}
                                onChange={e => setSettings({ ...settings, shipping_cost: Number(e.target.value) })}
                                className="w-full bg-[#0f172a] border border-[#334155] rounded p-3 text-white focus:outline-none focus:border-accent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Estimated average shipping cost per item.</p>
                        </div>
                    </div>

                    <div className="bg-[#0f172a]/50 p-4 rounded mt-4 border border-[#334155]">
                        <h4 className="font-bold text-sm text-gray-300 mb-2">Calculation Preview</h4>
                        <p className="text-sm text-gray-400">
                            Example: Cost Price 5000 JPY + Shipping {settings.shipping_cost} JPY
                            <br />
                            Target Margin {settings.profit_margin}% | Fee {settings.platform_fee}%
                        </p>
                        <p className="text-lg font-bold text-accent mt-2">
                            Selling Price ≈ {Math.ceil((5000 + settings.shipping_cost) / (1 - (settings.profit_margin / 100) - (settings.platform_fee / 100))).toLocaleString()} JPY
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 px-6 py-3 rounded bg-accent text-white font-bold hover:opacity-90 transition-opacity"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
