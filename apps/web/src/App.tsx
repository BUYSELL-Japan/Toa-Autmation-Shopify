import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardHome } from './pages/DashboardHome';
import { ProductList } from './pages/ProductList';
import { ResearchView } from './pages/ResearchView';
import { SettingsView } from './pages/SettingsView';

import { EditProductView } from './pages/EditProductView';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="products" element={<ProductList />} />
                    <Route path="products/:id/edit" element={<EditProductView />} />
                    <Route path="research" element={<ResearchView />} />
                    <Route path="settings" element={<SettingsView />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
