import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useGameStore } from '../state/useGameStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = useGameStore((s) => s.auth.isAuthenticated)
  const isMatchActive = useGameStore((s) => s.isMatchActive)

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (isMatchActive && !location.pathname.startsWith('/game')) {
    return <Navigate to="/game" replace />
  }

  return <>{children}</>
}
