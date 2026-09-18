import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../state/useGameStore'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { joinRoom, RoomError, type RoomErrorCode } from '../network/socket'

export function JoinRoom() {
  const navigate = useNavigate()
  const setLoading = useGameStore((s) => s.setLoading)
  const loadingMessage = useGameStore((s) => s.ui.loadingMessage)
  const isLoading = useGameStore((s) => s.ui.isLoading)
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState<{ code: RoomErrorCode; message: string } | null>(null)

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase()
    if (code.length < 4) {
      setError({ code: 'INVALID_INPUT', message: 'Room codes are at least 4 characters.' })
      return
    }

    setLoading(true, 'Joining room...')
    setError(null)
    try {
      await joinRoom(code)
      setLoading(false)
      navigate('/lobby')
    } catch (err) {
      setLoading(false)
      if (err instanceof RoomError) {
        setError({ code: err.code, message: err.message })
      } else {
        setError({ code: 'SERVER_ERROR', message: 'Failed to join room. Please try again.' })
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin()
  }

  if (isLoading) {
    return <LoadingSpinner overlay message={loadingMessage} />
  }

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
          <h2 className="font-display text-2xl font-bold text-white text-center mb-2">Join Room</h2>
          <p className="font-body text-sm text-storm-300 text-center mb-8">
            Enter the room code shared by your friend
          </p>

          {error && (
            <div className="mb-6 animate-shake">
              <ErrorMessage code={error.code} message={error.message} onDismiss={() => setError(null)} />
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter code..."
                maxLength={8}
                className="input-field text-center text-2xl font-mono tracking-[0.3em] uppercase"
                autoFocus
              />
            </div>

            <button onClick={handleJoin} className="btn-primary w-full" disabled={roomCode.length < 4}>
              Join Room
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-storm-600/30 text-center">
            <p className="font-body text-xs text-storm-400">
              Don't have a code?{' '}
              <button onClick={() => navigate('/create-room')} className="text-accent-lightning hover:text-white transition-colors">
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}