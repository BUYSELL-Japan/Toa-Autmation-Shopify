import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardHome } from './pages/DashboardHome';
import { ProductList } from './pages/ProductList';
import { ResearchView } from './pages/ResearchView';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="products" element={<ProductList />} />
                    <Route path="research" element={<ResearchView />} />
                    <Route path="settings" element={<div className="p-6">Settings Page (Coming Soon)</div>} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
