import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return null // espera o Supabase recuperar a sessão salva
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}