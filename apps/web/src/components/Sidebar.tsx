import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Database, Settings } from 'lucide-react';

export function Sidebar() {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: ShoppingBag, label: 'Products', path: '/products' },
        { icon: Database, label: 'Research', path: '/research' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className="sidebar">
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)', borderBottomStyle: 'solid', borderBottomWidth: '1px' }}>
                <h1 className="text-xl font-bold text-gradient">
                    TOA Auto
                </h1>
            </div>
            <nav className="flex-1 p-4 flex flex-col gap-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 mt-auto text-sm text-gray" style={{ borderTop: '1px solid var(--border)' }}>
                v1.0.0
            </div>
        </aside>
    );
}
