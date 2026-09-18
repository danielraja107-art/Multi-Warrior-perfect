import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../state/useGameStore'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { createRoom, RoomError, type RoomErrorCode } from '../network/socket'

export function CreateRoom() {
  const navigate = useNavigate()
  const setLoading = useGameStore((s) => s.setLoading)
  const loadingMessage = useGameStore((s) => s.ui.loadingMessage)
  const isLoading = useGameStore((s) => s.ui.isLoading)
  const lobbyRoomCode = useGameStore((s) => s.lobby.roomCode)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<{ code: RoomErrorCode; message: string } | null>(null)

  const handleCreate = async () => {
    setLoading(true, 'Creating room...')
    setError(null)
    try {
      await createRoom()
      setLoading(false)
    } catch (err) {
      setLoading(false)
      if (err instanceof RoomError) {
        setError({ code: err.code, message: err.message })
      } else {
        setError({ code: 'CONNECTION', message: 'Failed to create room. Check the game server connection.' })
      }
    }
  }

  const handleCopy = async () => {
    if (lobbyRoomCode) {
      await navigator.clipboard.writeText(lobbyRoomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoinLobby = () => {
    navigate('/lobby')
  }

  if (isLoading) {
    return <LoadingSpinner overlay message={loadingMessage} />
  }

  const roomCode = lobbyRoomCode || null

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <button
          onClick={() => navigate('/')}
          className="absolute -top-12 left-0 font-body text-sm text-storm-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="panel p-8">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-2">Create Room</h2>
          <p className="font-body text-sm text-storm-300 text-center mb-8">
            Generate a room code and invite your friends
          </p>

          {error && (
            <div className="mb-6 animate-shake">
              <ErrorMessage code={error.code} message={error.message} onRetry={handleCreate} onDismiss={() => setError(null)} />
            </div>
          )}

          {!roomCode ? (
            <button onClick={handleCreate} className="btn-primary w-full">
              Generate Room Code
            </button>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <p className="font-body text-xs text-storm-400 uppercase tracking-widest mb-3">Your Room Code</p>
                <div className="relative group">
                  <div className="font-mono text-5xl font-bold text-accent-lightning text-glow tracking-[0.2em] select-all py-4">
                    {roomCode}
                  </div>
                  <div className="absolute -inset-4 bg-accent-lightning/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>

              <div className="storm-divider" />

              <div className="flex gap-3">
                <button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-player-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Code
                    </>
                  )}
                </button>
                <button onClick={handleJoinLobby} className="btn-primary flex-1">
                  Enter Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}