import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Dashboard2 from './pages/Dashboard2';
import Main2 from './pages/Main2';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main2 />} />
        <Route path="/old" element={<Landing />} />
        <Route path="/fitting" element={<Dashboard />} />
        <Route path="/fitting2" element={<Dashboard2 />} />
        <Route path="/video" element={<Dashboard />} />
        <Route path="/reservation" element={<Dashboard />} />
        <Route path="/help" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
