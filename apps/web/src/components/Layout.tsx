import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
    return (
        <div className="flex">
            <Sidebar />
            <main className="main-content w-full">
                <div className="container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
