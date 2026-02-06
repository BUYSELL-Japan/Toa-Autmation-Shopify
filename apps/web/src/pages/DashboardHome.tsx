import React from 'react';
import { Activity, Package, DollarSign, RefreshCw } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }: any) {
    return (
        <div className="glass-panel p-6 flex items-center justify-between">
            <div>
                <div className="text-gray text-sm mb-1">{label}</div>
                <div className="text-2xl font-bold">{value}</div>
            </div>
            <div className={`p-3 rounded-full bg-opacity-20`} style={{ backgroundColor: `${color}20`, color: color }}>
                <Icon size={24} />
            </div>
        </div>
    );
}

export function DashboardHome() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>

            <div className="grid-cols-3 mb-8">
                <StatCard icon={Package} label="Total Products" value="124" color="#8b5cf6" />
                <StatCard icon={Activity} label="Active Research" value="3" color="#f43f5e" />
                <StatCard icon={DollarSign} label="Revenue (Est)" value="¥0" color="#10b981" />
            </div>

            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Recent Activity</h3>
                    <button className="btn-primary flex items-center gap-2">
                        <RefreshCw size={16} /> Sync
                    </button>
                </div>
                <div className="text-gray text-sm">
                    No recent activity found.
                </div>
            </div>
        </div>
    );
}
