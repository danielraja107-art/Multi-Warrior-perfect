import React, { useEffect, useState } from 'react'
import { Icon } from './components/Icon'

interface WaveTransitionProps {
  waveNumber: number
  isComplete: boolean
  xpReward?: number
  nextWaveIn?: number
  isBossWave?: boolean
  weaponRespawnMessage?: string | null
  onDismiss?: () => void
}

export function WaveTransition({
  waveNumber,
  isComplete,
  xpReward = 50,
  nextWaveIn = 10,
  isBossWave = false,
  weaponRespawnMessage = null,
  onDismiss,
}: WaveTransitionProps) {
  const [visible, setVisible] = useState(true)
  const [countdown, setCountdown] = useState(nextWaveIn)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          setTimeout(() => {
            setVisible(false)
            onDismiss?.()
          }, 1000)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-storm-950/60 backdrop-blur-sm animate-fade-in" />
      <div className="relative z-10 text-center animate-wave-enter">
        {isComplete ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-5xl md:text-7xl font-black text-accent-lightning text-glow tracking-wider">
                WAVE {waveNumber}
              </h2>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-white mt-2 tracking-wider">
                COMPLETE!
              </h3>
            </div>

            <div className="panel p-4 inline-block">
              <p className="font-body text-sm text-storm-300 mb-1">XP Earned</p>
              <p className="font-mono text-2xl font-bold text-accent-lightning">+{xpReward} XP</p>
            </div>

            {weaponRespawnMessage && (
              <p className="font-body text-sm text-accent-fire flex items-center justify-center gap-1.5">
                <Icon name="crossed-swords" size={14} />
                {weaponRespawnMessage}
              </p>
            )}

            {countdown > 0 && (
              <p className="font-body text-sm text-storm-400">
                Next wave in <span className="font-mono text-accent-lightning">{countdown}</span>s
              </p>
            )}
          </div>
        ) : isBossWave ? (
          <div className="space-y-4">
            <h2 className="font-display text-6xl md:text-8xl font-black text-player-red text-glow-red tracking-wider animate-pulse">
              BOSS
            </h2>
            <h3 className="font-display text-2xl text-white tracking-wider">PREPARE YOURSELF</h3>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-6xl md:text-8xl font-black text-white tracking-wider">
              WAVE {waveNumber}
            </h2>
            <div className="storm-divider w-48 mx-auto mt-4" />
          </div>
        )}
      </div>
    </div>
  )
}
