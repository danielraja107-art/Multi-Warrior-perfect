import React from 'react'

interface ProgressBarProps {
  value: number
  max: number
  variant?: 'health' | 'xp' | 'boss' | 'default'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  animated?: boolean
  color?: string
}

const variantClasses = {
  health: 'health-bar-fill',
  xp: 'xp-bar-fill',
  boss: 'boss-health-fill',
  default: 'bg-storm-400',
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-3',
  lg: 'h-5',
}

export function ProgressBar({
  value,
  max,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  color,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const fillClass = variantClasses[variant]
  const heightClass = sizeClasses[size]

  const getHealthClass = () => {
    if (variant !== 'health') return fillClass
    if (percentage <= 25) return `${fillClass} health-bar-fill-low animate-health-pulse`
    if (percentage <= 50) return `${fillClass} health-bar-fill-medium`
    return fillClass
  }

  return (
    <div className="w-full">
      {showLabel && label && (
        <div className="flex justify-between items-center mb-1">
          <span className="font-display text-[10px] uppercase tracking-wider text-storm-300">{label}</span>
          <span className="font-mono text-[10px] text-storm-300">
            {Math.round(value)}/{max}
          </span>
        </div>
      )}
      <div className={`w-full ${heightClass} bg-storm-800 rounded-sm overflow-hidden border border-storm-600/30`}>
        <div
          className={`${getHealthClass()} ${animated ? 'transition-all duration-500' : ''}`}
          style={{
            width: `${percentage}%`,
            ...(color ? { background: color, boxShadow: `0 0 8px ${color}80` } : {}),
          }}
        />
      </div>
    </div>
  )
}
