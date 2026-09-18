import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayerColor, WeaponType, PlayerState } from '@storm-arena/shared'
import { ProgressBar } from './components/ProgressBar'
import { ConnectionStatus as ConnectionStatusBadge } from './components/ConnectionStatus'
import { Icon, WEAPON_ICON } from './components/Icon'
import { useGameStore } from '../state/useGameStore'
import type { PlayerData } from '@storm-arena/shared'

const COLOR_ORDER = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]

const colorClasses: Record<string, string> = {
  [PlayerColor.RED]: 'bg-player-red',
  [PlayerColor.BLUE]: 'bg-player-blue',
  [PlayerColor.GREEN]: 'bg-player-green',
  [PlayerColor.YELLOW]: 'bg-player-yellow',
}

const colorBorder: Record<string, string> = {
  [PlayerColor.RED]: 'border-player-red/40',
  [PlayerColor.BLUE]: 'border-player-blue/40',
  [PlayerColor.GREEN]: 'border-player-green/40',
  [PlayerColor.YELLOW]: 'border-player-yellow/40',
}

interface HUDPlayer {
  id: string
  name: string
  color: PlayerColor
  health: number
  maxHealth: number
  weapon: WeaponType
  isAlive: boolean
  isLocal: boolean
  isDead: boolean
  powerAvailable: boolean
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

const DEMO_PLAYERS: HUDPlayer[] = [
  { id: '1', name: 'You', color: PlayerColor.RED, health: 85, maxHealth: 100, weapon: WeaponType.AXE, isAlive: true, isLocal: true, isDead: false, powerAvailable: true },
  { id: '2', name: 'Ally', color: PlayerColor.BLUE, health: 62, maxHealth: 100, weapon: WeaponType.BASEBALL_BAT, isAlive: true, isLocal: false, isDead: false, powerAvailable: true },
  { id: '3', name: 'Sniper', color: PlayerColor.GREEN, health: 100, maxHealth: 100, weapon: WeaponType.ROCK, isAlive: true, isLocal: false, isDead: false, powerAvailable: true },
  { id: '', name: '', color: PlayerColor.YELLOW, health: 0, maxHealth: 100, weapon: WeaponType.FIST, isAlive: false, isLocal: false, isDead: false, powerAvailable: true },
]

export const HUD = React.memo(function HUD() {
  const navigate = useNavigate()
  const gameState = useGameStore((s) => s.gameState)
  const localPlayerId = useGameStore((s) => s.localPlayerId)
  const connectionStatus = useGameStore((s) => s.connection.status)

  const authoritative = Boolean(gameState && Object.keys(gameState.players).length > 0)

  const players: HUDPlayer[] = authoritative
    ? COLOR_ORDER.map((color) => {
        const entry = Object.entries(gameState!.players).find(([, p]) => p.color === color)
        if (!entry) return null
        const [sessionId, p] = entry as [string, PlayerData]
        const isLocal = sessionId === localPlayerId
        return {
          id: sessionId,
          name: isLocal ? 'You' : `Player ${COLOR_ORDER.indexOf(color) + 1}`,
          color,
          health: p.health,
          maxHealth: p.maxHealth,
          weapon: p.weapon,
          isAlive: p.isAlive,
          isLocal,
          isDead: p.state === PlayerState.DEAD || !p.isAlive,
          powerAvailable: p.powerAvailable !== false,
        }
      }).filter((p): p is HUDPlayer => p !== null)
    : DEMO_PLAYERS

  const wave = gameState?.currentWave ?? 1
  const enemiesRemaining = gameState?.enemiesRemaining ?? 12
  const elapsedTime = gameState?.elapsedTime ?? 0

  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="panel p-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[10px] uppercase tracking-widest text-storm-300">Wave</span>
            <span className="font-mono text-lg font-bold text-accent-lightning">{wave}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[10px] uppercase tracking-widest text-storm-300">Enemies</span>
            <span className="font-mono text-sm font-bold text-player-red">{enemiesRemaining}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display text-[10px] uppercase tracking-widest text-storm-300">Time</span>
            <span className="font-mono text-xs text-storm-200">{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2">
        <ConnectionStatusBadge status={connectionStatus} />
        {!authoritative && (
          <button
            onClick={() => navigate('/results')}
            className="p-2 rounded-sm bg-storm-800/60 border border-storm-500/20 text-storm-400 hover:text-white hover:border-storm-400/40 transition-all"
            title="Simulate end"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9l6 3-6 3V9z" />
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} fill="none" />
            </svg>
          </button>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
        <div className="panel p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {players.map((player) => (
              <div
                key={player.id || player.color}
                className={`p-2 rounded-sm border transition-all duration-300 ${
                  !player.id
                    ? 'border-dashed border-storm-600/20 opacity-30'
                    : player.isLocal
                    ? `${colorBorder[player.color]} bg-storm-800/60`
                    : 'border-storm-600/20 bg-storm-800/30'
                }`}
              >
                {player.id ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-3 h-3 rounded-full ${colorClasses[player.color]} ${!player.isAlive ? 'opacity-30' : ''}`} />
                      <span className="font-body text-xs text-storm-200 truncate">{player.name}</span>
                      {player.isLocal && (
                        <span className="font-display text-[8px] uppercase tracking-wider text-accent-ice">You</span>
                      )}
                      {player.isDead && (
                        <span className="font-display text-[8px] uppercase tracking-wider text-player-red">Dead</span>
                      )}
                    </div>
                    <ProgressBar value={player.health} max={player.maxHealth} variant="health" size="sm" />
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-[10px] text-storm-400">{player.health}/{player.maxHealth}</span>
                      <div className="flex items-center gap-1">
                        <Icon
                          name={WEAPON_ICON[player.weapon] ?? 'fist'}
                          size={12}
                          className={player.isAlive ? 'text-storm-200' : 'text-storm-500'}
                        />
                        <span className="font-mono text-[9px] font-bold text-storm-300">
                          {String(player.weapon).toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-end">
                      {player.powerAvailable ? (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                          {player.isLocal ? '[F] POWER READY' : 'POWER READY'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono text-storm-500 border border-storm-700/40">
                          POWER USED
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colorClasses[player.color]} opacity-30`} />
                    <span className="font-body text-xs text-storm-500 italic">Empty</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});