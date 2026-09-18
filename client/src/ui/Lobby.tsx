import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Difficulty, PlayerColor, ConnectionStatus } from '@storm-arena/shared'
import { useGameStore } from '../state/useGameStore'
import { startGame, changeDifficulty, leaveRoom, reconnect } from '../network/socket'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { ConnectionStatus as ConnectionStatusBadge } from './components/ConnectionStatus'
import { Modal } from './components/Modal'
import { API, ApiError } from '../network/api'
import type { PlayerData } from '@storm-arena/shared'

const PLAYER_COLORS = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
]

const COLOR_BG: Record<string, string> = {
  [PlayerColor.RED]: 'bg-player-red',
  [PlayerColor.BLUE]: 'bg-player-blue',
  [PlayerColor.GREEN]: 'bg-player-green',
  [PlayerColor.YELLOW]: 'bg-player-yellow',
}

const DIFFICULTIES = [
  { value: Difficulty.EASY, label: 'Easy', color: 'text-player-green', border: 'border-player-green/40', hoverBg: 'hover:bg-player-green/10' },
  { value: Difficulty.NORMAL, label: 'Normal', color: 'text-accent-lightning', border: 'border-accent-lightning/40', hoverBg: 'hover:bg-accent-lightning/10' },
  { value: Difficulty.HARD, label: 'Hard', color: 'text-player-red', border: 'border-player-red/40', hoverBg: 'hover:bg-player-red/10' },
]

export function Lobby() {
  const navigate = useNavigate()
  const connectionStatus = useGameStore((s) => s.connection.status)
  const roomId = useGameStore((s) => s.connection.roomId)
  const roomCode = useGameStore((s) => s.lobby.roomCode)
  const players = useGameStore((s) => s.lobby.players)
  const lobbyDifficulty = useGameStore((s) => s.lobby.difficulty)
  const hostId = useGameStore((s) => s.lobby.hostId)
  const localPlayerId = useGameStore((s) => s.localPlayerId)
  const gamePhase = useGameStore((s) => s.gameState?.phase)
  const countdownSeconds = useGameStore((s) => s.gameState?.countdownSeconds ?? 0)
  const auth = useGameStore((s) => s.auth)
  const setAuth = useGameStore((s) => s.setAuth)
  const logout = useGameStore((s) => s.logout)
  const profile = useGameStore((s) => s.profile)
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const uiError = useGameStore((s) => s.ui.error)

  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [roomClosed, setRoomClosed] = useState<string | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authIdentifier, setAuthIdentifier] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const leavingRef = useRef(false)
  const hadRoomRef = useRef(false)

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)

    try {
      if (authMode === 'login') {
        if (!authIdentifier || !authPassword) {
          setAuthError('Please fill in all fields')
          setAuthLoading(false)
          return
        }
        const result = await API.login(authIdentifier, authPassword)
        setAuth({
          isAuthenticated: true,
          userId: result.user.id,
          username: result.user.username,
          email: result.user.email,
          token: result.token,
        })
        API.profile()
          .then((me) => {
            useGameStore.getState().setProfile({
              level: me.profile.level,
              xp: me.profile.xp,
              xpToNext: 100 * me.profile.level,
              coins: me.profile.coins,
              wins: me.profile.wins,
              losses: me.profile.losses,
              totalKills: me.profile.totalKills,
              totalDamage: me.profile.totalDamage,
            })
          })
          .catch(() => {})
        setShowAuthModal(false)
      } else {
        if (!authEmail || !authUsername || !authPassword) {
          setAuthError('Please fill in all fields')
          setAuthLoading(false)
          return
        }
        const result = await API.register({ email: authEmail, username: authUsername, password: authPassword })
        setAuth({
          isAuthenticated: true,
          userId: result.user.id,
          username: result.user.username,
          email: result.user.email,
          token: result.token,
        })
        API.profile()
          .then((me) => {
            useGameStore.getState().setProfile({
              level: me.profile.level,
              xp: me.profile.xp,
              xpToNext: 100 * me.profile.level,
              coins: me.profile.coins,
              wins: me.profile.wins,
              losses: me.profile.losses,
              totalKills: me.profile.totalKills,
              totalDamage: me.profile.totalDamage,
            })
          })
          .catch(() => {})
        setShowAuthModal(false)
      }
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Authentication failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const isHost = localPlayerId != null && localPlayerId === hostId

  useEffect(() => {
    if (lobbyDifficulty !== difficulty) {
      setDifficulty(lobbyDifficulty)
    }
  }, [lobbyDifficulty, difficulty])

  useEffect(() => {
    if (roomId) hadRoomRef.current = true
    if (!roomId && hadRoomRef.current && !leavingRef.current && connectionStatus === ConnectionStatus.DISCONNECTED) {
      setRoomClosed('The room was closed or you were disconnected from it.')
      hadRoomRef.current = false
    }
  }, [roomId, connectionStatus])

  useEffect(() => {
    if (gamePhase === 'game') {
      setStarting(false)
      navigate('/game')
    }
  }, [gamePhase, navigate])

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStart = () => {
    if (!isHost) return
    setStarting(true)
    try {
      startGame()
    } catch {
      setStarting(false)
      setRoomClosed('Could not reach the game server.')
    }
  }

  const handleDifficulty = (value: Difficulty) => {
    if (!isHost) return
    setDifficulty(value)
    try {
      changeDifficulty(value)
    } catch {
      // server will be surfaced via connection state
    }
  }

  const handleLeave = async () => {
    leavingRef.current = true
    setLeaving(true)
    await leaveRoom()
    navigate('/')
  }

  if (leaving) {
    return <LoadingSpinner overlay message="Leaving room..." />
  }

  if (starting) {
    return <LoadingSpinner overlay message="Starting game..." />
  }

  if (!roomCode && connectionStatus === ConnectionStatus.CONNECTING) {
    return <LoadingSpinner overlay message="Joining room..." />
  }

  const slots = PLAYER_COLORS.map((color) => {
    const entry = Object.entries(players).find(([, p]) => p.color === color)
    return entry as [string, PlayerData] | undefined
  })

  const filledCount = Object.keys(players).length

  const renderSlot = (entry: [string, PlayerData] | undefined, index: number) => {
    const colorBg = COLOR_BG[PLAYER_COLORS[index]]
    if (!entry) {
      return (
        <div
          key={index}
          className="flex items-center gap-3 p-3 rounded-sm border border-dashed border-storm-600/30 bg-storm-800/20"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorBg} opacity-30`}>
            <span className="font-display text-xs font-bold text-white">{index + 1}</span>
          </div>
          <p className="font-body text-sm text-storm-500 italic">Waiting for player...</p>
        </div>
      )
    }

    const [sessionId, player] = entry
    const isYou = sessionId === localPlayerId
    const name = isYou ? 'You' : `Player ${index + 1}`

    return (
      <div key={sessionId} className="flex items-center gap-3 p-3 rounded-sm border border-storm-500/20 bg-storm-800/40">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorBg}`}>
          <span className="font-display text-xs font-bold text-white">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="font-body text-sm font-medium text-storm-100 truncate">{name}</p>
          {player.isHost && (
            <span className="px-1.5 py-0.5 text-[9px] font-display uppercase tracking-wider bg-accent-fire/20 text-accent-fire rounded-sm border border-accent-fire/30">
              Host
            </span>
          )}
          {isYou && (
            <span className="px-1.5 py-0.5 text-[9px] font-display uppercase tracking-wider bg-accent-ice/20 text-accent-ice rounded-sm border border-accent-ice/30">
              You
            </span>
          )}
        </div>
        <div className="w-2 h-2 rounded-full bg-player-green" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full w-screen h-screen overflow-hidden flex items-center justify-center select-none bg-storm-950">
      <div className="absolute inset-0 bg-storm-gradient" />

      {/* Top Header Bar: Branding on Left, Settings & Sign In on Right (Exact correct location) */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-storm-950/90 via-storm-950/40 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="text-storm-400 hover:text-white transition-colors flex items-center gap-1.5 font-display text-xs uppercase tracking-wider bg-storm-800/50 hover:bg-storm-700/60 border border-storm-600/30 px-2.5 py-1.5 rounded-sm"
            title="Leave room and return to menu"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Leave
          </button>
          <div className="w-px h-4 bg-storm-700/60" />
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm tracking-wider text-white">
              STORM <span className="text-accent-lightning">ARENA</span>
            </span>
            <span className="px-2 py-0.5 rounded-xs font-display text-[10px] uppercase tracking-wider bg-storm-800/80 border border-storm-600/30 text-storm-300">
              Lobby
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sign In / Account widget */}
          {auth.isAuthenticated ? (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-storm-800/70 border border-storm-600/30 text-xs">
              <div className="w-2 h-2 rounded-full bg-player-green shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <div className="flex flex-col text-left">
                <span className="font-body font-medium text-storm-100 leading-none">
                  {auth.username || 'Player'}
                </span>
                <span className="font-mono text-[10px] text-accent-lightning leading-none mt-0.5">
                  Lv. {profile.level}
                </span>
              </div>
              <button
                onClick={logout}
                className="ml-2 text-storm-400 hover:text-player-red transition-colors text-[10px] font-display uppercase tracking-wider"
                title="Sign out of your account"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthError(null);
                setShowAuthModal(true);
              }}
              className="px-3 py-1.5 rounded-sm bg-storm-800/60 border border-storm-500/30 hover:border-accent-lightning/50 hover:bg-storm-700/50 text-storm-200 hover:text-accent-lightning transition-all flex items-center gap-1.5 font-display text-xs uppercase tracking-wider"
              title="Sign in to save match stats and XP"
            >
              <svg className="w-3.5 h-3.5 text-accent-lightning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Sign In</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-1.5 rounded-sm bg-storm-800/60 border border-storm-500/30 hover:border-storm-400/50 hover:bg-storm-700/50 text-storm-200 hover:text-white transition-all flex items-center gap-1.5 font-display text-xs uppercase tracking-wider"
            title="Audio and Graphics Settings"
          >
            <svg className="w-3.5 h-3.5 text-storm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 w-full max-w-lg mx-4 animate-slide-up mt-8">
        <div className="panel p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-body text-xs text-storm-400 uppercase tracking-widest">Room</p>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="font-mono text-2xl font-bold text-accent-lightning tracking-wider">{roomCode || '----'}</h2>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-sm bg-storm-700/50 hover:bg-storm-600/50 transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-player-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-storm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-body text-xs text-storm-400 uppercase tracking-widest">Players</p>
              <p className="font-mono text-lg font-bold text-storm-100">{filledCount}/4</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <ConnectionStatusBadge status={connectionStatus} onReconnect={() => reconnect()} />
          </div>

          {connectionStatus === ConnectionStatus.RECONNECTING && (
            <div className="mb-4">
              <ErrorMessage
                code="NETWORK_TIMEOUT"
                message="Connection interrupted. Reconnecting to the room..."
                variant="warning"
                onRetry={() => reconnect()}
              />
            </div>
          )}

          {uiError && (
            <div className="mb-4">
              <ErrorMessage code="SERVER_ERROR" message={uiError} onDismiss={() => useGameStore.getState().setError(null)} />
            </div>
          )}

          {roomClosed && (
            <div className="mb-4">
              <ErrorMessage
                code="UNEXPECTED_STATE"
                message={roomClosed}
                onDismiss={() => navigate('/')}
              />
            </div>
          )}

          <div className="storm-divider mb-6" />

          <div className="space-y-3 mb-6">{slots.map(renderSlot)}</div>

          <div className="storm-divider mb-6" />

          <div className="mb-6">
            <p className="font-display text-xs uppercase tracking-widest text-storm-300 mb-3">Difficulty</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => handleDifficulty(d.value)}
                  disabled={!isHost}
                  className={`flex-1 py-2.5 rounded-sm font-display text-xs uppercase tracking-wider border transition-all duration-200 ${
                    difficulty === d.value
                      ? `${d.color} ${d.border} bg-storm-700/50`
                      : `text-storm-400 border-storm-600/30 ${isHost ? d.hoverBg : ''}`
                  } ${!isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={filledCount < 2 || gamePhase === 'starting'}
              className={`btn-primary w-full ${filledCount < 2 || gamePhase === 'starting' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {gamePhase === 'starting' ? 'Starting...' : 'Start Game'}
            </button>
          ) : (
            <div className="text-center py-3">
              <p className="font-body text-sm text-storm-400 animate-pulse">
                {gamePhase === 'starting' ? `Deploying in ${countdownSeconds || 5}s...` : 'Waiting for host to start...'}
              </p>
            </div>
          )}

          {filledCount < 2 && (
            <p className="text-center mt-2 font-body text-xs text-storm-500">
              Need at least 2 players to start
            </p>
          )}

          <button
            onClick={handleLeave}
            className="w-full mt-3 py-2 font-body text-xs text-storm-400 hover:text-player-red transition-colors uppercase tracking-wider"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Synchronized 5-Second Room Countdown Overlay */}
      {gamePhase === 'starting' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <p className="font-display text-sm uppercase tracking-widest text-storm-300 mb-2">
            Match Starting In
          </p>
          <div className="font-display text-9xl font-extrabold text-accent-lightning animate-bounce drop-shadow-[0_0_40px_rgba(255,215,0,0.6)]">
            {countdownSeconds > 0 ? countdownSeconds : 1}
          </div>
          <p className="font-body text-xs text-storm-400 mt-6 tracking-wider uppercase">
            Synchronizing players...
          </p>
        </div>
      )}

      {/* In-Lobby Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Game Settings"
        variant="default"
        actions={
          <button
            onClick={() => setShowSettingsModal(false)}
            className="btn-primary py-2 px-5 text-xs font-display tracking-wider"
          >
            Done
          </button>
        }
      >
        <div className="space-y-4 py-2">
          {/* Master Volume */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-body">
              <span className="text-storm-200">Master Volume</span>
              <span className="font-mono text-accent-lightning">{settings.masterVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.masterVolume}
              onChange={(e) => setSettings({ masterVolume: Number(e.target.value) })}
              className="w-full h-1.5 bg-storm-700 rounded-full appearance-none cursor-pointer accent-yellow-400"
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-body">
              <span className="text-storm-200">Music Volume</span>
              <span className="font-mono text-accent-lightning">{settings.musicVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.musicVolume}
              onChange={(e) => setSettings({ musicVolume: Number(e.target.value) })}
              className="w-full h-1.5 bg-storm-700 rounded-full appearance-none cursor-pointer accent-yellow-400"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-body">
              <span className="text-storm-200">SFX Volume</span>
              <span className="font-mono text-accent-lightning">{settings.sfxVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.sfxVolume}
              onChange={(e) => setSettings({ sfxVolume: Number(e.target.value) })}
              className="w-full h-1.5 bg-storm-700 rounded-full appearance-none cursor-pointer accent-yellow-400"
            />
          </div>

          {/* Graphics Quality */}
          <div className="pt-2 border-t border-storm-700/40">
            <span className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">Graphics Quality</span>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSettings({ graphicsQuality: q })}
                  className={`py-1.5 text-xs font-display uppercase tracking-wider rounded-sm border transition-all ${
                    settings.graphicsQuality === q
                      ? 'border-accent-lightning bg-storm-700 text-white font-bold'
                      : 'border-storm-600/30 text-storm-400 hover:text-storm-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* In-Lobby Sign In / Register Modal */}
      <Modal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setAuthError(null)
        }}
        title={authMode === 'login' ? 'Sign In' : 'Create Account'}
        variant="default"
      >
        <form onSubmit={handleAuthSubmit} className="space-y-4 py-1">
          {authError && (
            <div className="p-2.5 rounded bg-player-red/10 border border-player-red/30 text-player-red text-xs">
              {authError}
            </div>
          )}

          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-display uppercase tracking-wider text-storm-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@domain.com"
                className="input-field text-xs py-2"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-storm-300 mb-1">
              {authMode === 'login' ? 'Username or Email' : 'Username'}
            </label>
            <input
              type="text"
              required
              value={authMode === 'login' ? authIdentifier : authUsername}
              onChange={(e) =>
                authMode === 'login' ? setAuthIdentifier(e.target.value) : setAuthUsername(e.target.value)
              }
              placeholder={authMode === 'login' ? 'Enter username or email' : 'Choose a username'}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-storm-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field text-xs py-2"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={authLoading}
              className="btn-primary w-full py-2.5 text-xs tracking-widest"
            >
              {authLoading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="flex justify-between items-center text-xs text-storm-400 mt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError(null)
                }}
                className="text-accent-lightning hover:underline text-xs"
              >
                {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}