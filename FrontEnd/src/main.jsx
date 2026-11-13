import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Extrator from './pages/extrator'
import Revisao from './pages/revisao'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/extrator" replace />} />
        <Route path="/extrator" element={<Extrator />} />
        <Route path="/revisao" element={<Revisao />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)