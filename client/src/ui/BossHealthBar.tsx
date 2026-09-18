import React, { useEffect, useRef, useState } from 'react'
import { BossPhase } from '@storm-arena/shared'
import { ProgressBar } from './components/ProgressBar'
import { Icon } from './components/Icon'

interface BossHealthBarProps {
  health: number
  maxHealth: number
  phase: BossPhase
  isEnraged: boolean
  isDefeated: boolean
  bossName?: string
}

const phaseLabels: Record<string, string> = {
  [BossPhase.PHASE_1]: 'Phase 1',
  [BossPhase.PHASE_2]: 'Phase 2',
  [BossPhase.PHASE_3]: 'Phase 3',
  [BossPhase.ENRAGED]: 'ENRAGED',
}

export const BossHealthBar = React.memo(function BossHealthBar({
  health,
  maxHealth,
  phase,
  isEnraged,
  isDefeated,
  bossName = 'STORM GUARDIAN',
}: BossHealthBarProps) {
  const [transition, setTransition] = useState<string | null>(null)
  const prevPhase = useRef<BossPhase | null>(null)

  useEffect(() => {
    const next = prevPhase.current
    prevPhase.current = phase
    if (next && next !== phase) {
      const label = phase === BossPhase.ENRAGED ? 'ENRAGED' : phaseLabels[phase] ?? phase
      setTransition(`BOSS PHASE ${label}`)
      const timer = setTimeout(() => setTransition(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  if (isDefeated) return null

  const healthPercent = Math.max((health / maxHealth) * 100, 0)

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 animate-slide-down">
      <div className={`panel p-4 ${isEnraged ? 'border-player-red/50 animate-boss-shake' : 'border-storm-500/20'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isEnraged && (
              <Icon name="warning" size={14} className="text-player-red animate-pulse" />
            )}
            <span className={`font-display text-xs uppercase tracking-widest ${isEnraged ? 'text-player-red text-glow-red' : 'text-storm-200'}`}>
              {bossName}
            </span>
          </div>
          <span className={`font-display text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
            isEnraged
              ? 'text-player-red border-player-red/40 bg-player-red/10'
              : 'text-accent-lightning border-accent-lightning/40 bg-accent-lightning/10'
          }`}>
            {phaseLabels[phase] || phase}
          </span>
        </div>

        <div className="relative">
          <ProgressBar value={health} max={maxHealth} variant="boss" size="md" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[10px] font-bold text-white drop-shadow-lg">
              {Math.round(healthPercent)}%
            </span>
          </div>
        </div>

        <div className="flex justify-between mt-2">
          <span className="font-mono text-[10px] text-storm-400">{Math.round(health)}/{maxHealth}</span>
          <span className="font-mono text-[10px] text-storm-400">
            {isEnraged ? 'Phase: Berserk' : `Phase: ${phaseLabels[phase]}`}
          </span>
        </div>
      </div>

      {transition && (
        <div className="mt-3 flex justify-center animate-wave-enter">
          <span className="px-4 py-2 font-display text-xs uppercase tracking-widest text-player-red bg-storm-950/80 border border-player-red/40 text-glow-red rounded-sm">
            {transition}
          </span>
        </div>
      )}
    </div>
  )
})
