import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ExtracaoProvider } from './contexts/ExtracaoContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/login'
import Extrator from './pages/extrator'
import Revisao from './pages/revisao'
import Resumo from './pages/resumo'
import RevisarDepois from './pages/revisar-depois'
import Banco from './pages/banco'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ExtracaoProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Navigate to="/extrator" replace />} />
              <Route path="/extrator" element={<Extrator />} />
              <Route path="/revisao" element={<Revisao />} />
              <Route path="/resumo" element={<Resumo />} />
              <Route path="/revisar-depois" element={<RevisarDepois />} />
              <Route path="/banco" element={<Banco />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ExtracaoProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)