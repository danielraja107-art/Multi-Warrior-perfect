import React, { useMemo } from 'react'

interface StormEffectProps {
  intensity?: 'low' | 'medium' | 'high'
  showRain?: boolean
  showLightning?: boolean
}

export function StormEffect({ intensity = 'medium', showRain = true, showLightning = true }: StormEffectProps) {
  const rainDrops = useMemo(() => {
    const count = intensity === 'low' ? 20 : intensity === 'medium' ? 40 : 60
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 1.5 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.3,
    }))
  }, [intensity])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 bg-storm-gradient animate-storm-bg" style={{ backgroundSize: '200% 200%' }} />

      {showLightning && (
        <div className="absolute inset-0 storm-lightning-overlay bg-gradient-to-b from-accent-lightning/5 via-transparent to-transparent" />
      )}

      {showRain && (
        <div className="absolute inset-0">
          {rainDrops.map((drop) => (
            <div
              key={drop.id}
              className="rain-particle absolute w-px bg-gradient-to-b from-transparent via-storm-300 to-transparent"
              style={{
                left: `${drop.left}%`,
                height: '30px',
                animationDelay: `${drop.delay}s`,
                animationDuration: `${drop.duration}s`,
                opacity: drop.opacity,
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-0 scan-line bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-storm-950/50 to-transparent" />
    </div>
  )
}
