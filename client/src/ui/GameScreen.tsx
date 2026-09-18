import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomPhase, ConnectionStatus } from '@storm-arena/shared'
import { useGameStore } from '../state/useGameStore'
import { HUD } from './HUD'
import { BossHealthBar } from './BossHealthBar'
import { WaveTransition } from './WaveTransition'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ConnectionStatus as ConnectionStatusBadge } from './components/ConnectionStatus'
import { reconnect } from '../network/socket'
import { GameScene } from '../game/GameScene'

export function GameScreen() {
  const navigate = useNavigate()
  const gamePhase = useGameStore((s) => s.gameState?.phase)
  const connectionStatus = useGameStore((s) => s.connection.status)

  const showWaveTransition = useGameStore((s) => s.gameUI.showWaveTransition)
  const waveNumber = useGameStore((s) => s.gameUI.waveNumber)
  const waveComplete = useGameStore((s) => s.gameUI.waveComplete)
  const weaponRespawnMessage = useGameStore((s) => s.gameUI.weaponRespawnMessage)
  const bossHealth = useGameStore((s) => s.gameUI.bossHealth)
  const bossMaxHealth = useGameStore((s) => s.gameUI.bossMaxHealth)
  const bossPhase = useGameStore((s) => s.gameUI.bossPhase)
  const bossEnraged = useGameStore((s) => s.gameUI.bossEnraged)
  const bossDefeated = useGameStore((s) => s.gameUI.bossDefeated)
  const showBossHealth = useGameStore((s) => s.gameUI.showBossHealth)
  const localPlayerDead = useGameStore((s) => s.gameUI.localPlayerDead)
  const respawnTimer = useGameStore((s) => s.gameUI.respawnTimer)
  const phaseTransitionMessage = useGameStore((s) => s.gameUI.phaseTransitionMessage)
  const setGameUI = useGameStore((s) => s.setGameUI)

  const onWaveDismiss = useCallback(() => {
    useGameStore.getState().setGameUI({ showWaveTransition: false })
  }, [])

  useEffect(() => {
    if (gamePhase === RoomPhase.VICTORY || gamePhase === RoomPhase.GAME_OVER) {
      navigate('/results')
    }
  }, [gamePhase, navigate])

  const notUsable =
    connectionStatus !== ConnectionStatus.CONNECTED &&
    connectionStatus !== ConnectionStatus.RECONNECTING

  if (notUsable) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-storm-gradient" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <ConnectionStatusBadge status={connectionStatus} onReconnect={() => reconnect()} />
          {connectionStatus === ConnectionStatus.CONNECTING && (
            <LoadingSpinner message="Connecting..." />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full w-screen h-screen overflow-hidden bg-storm-950 select-none">
      {/* 3D Arena Scene */}
      <GameScene />

      {/* UI overlay — pointer-events-none so clicks reach the 3D canvas;
          interactive elements inside re-enable pointer-events as needed */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        <HUD />
      </div>

      {showBossHealth && (
        <BossHealthBar
          health={bossHealth}
          maxHealth={bossMaxHealth}
          phase={bossPhase}
          isEnraged={bossEnraged}
          isDefeated={bossDefeated}
        />
      )}

      {phaseTransitionMessage && <PhaseBanner message={phaseTransitionMessage} />}

      {showWaveTransition && (
        <WaveTransition
          key={`${waveComplete}-${waveNumber}`}
          waveNumber={waveNumber}
          isComplete={waveComplete}
          isBossWave={waveNumber === 5}
          weaponRespawnMessage={weaponRespawnMessage}
          onDismiss={onWaveDismiss}
        />
      )}

      {localPlayerDead && <DeathOverlay respawnTimer={respawnTimer} />}
    </div>
  )
}

function PhaseBanner({ message }: { message: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      useGameStore.getState().setGameUI({ phaseTransitionMessage: null })
    }, 3200)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-30 animate-wave-enter pointer-events-none">
      <span className="px-5 py-2 font-display text-sm uppercase tracking-widest text-player-red bg-storm-950/80 border border-player-red/40 text-glow-red rounded-sm">
        {message}
      </span>
    </div>
  )
}

function DeathOverlay({ respawnTimer }: { respawnTimer: number }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-player-red/10 animate-fade-in" />
      <div className="relative z-10 text-center animate-fade-in">
        <h2 className="font-display text-6xl md:text-8xl font-black text-player-red text-glow-red tracking-wider">
          DOWN
        </h2>
        <p className="mt-4 font-body text-storm-200">
          {respawnTimer > 0 ? (
            <>
              Respawning in <span className="font-mono text-accent-lightning font-bold">{Math.ceil(respawnTimer)}</span>s
            </>
          ) : (
            'Waiting for respawn...'
          )}
        </p>
      </div>
    </div>
  )
}