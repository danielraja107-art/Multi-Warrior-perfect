import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  overlay?: boolean
}

export function LoadingSpinner({ size = 'md', message, overlay = false }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizeMap[size]} relative`}>
        <div className="absolute inset-0 border-2 border-storm-600 rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-accent-lightning rounded-full animate-spin" />
        <div className="absolute inset-1 border border-transparent border-t-player-red rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
      {message && (
        <p className="font-display text-xs uppercase tracking-widest text-storm-200 animate-pulse">
          {message}
        </p>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-storm-950/80 backdrop-blur-sm">
        {spinner}
      </div>
    )
  }

  return spinner
}
