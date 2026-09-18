import React from 'react'
import { ConnectionStatus as ConnectionStatusEnum } from '@storm-arena/shared'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import type { RoomErrorCode } from '../../network/socket'

interface ConnectionStatusProps {
  status?: ConnectionStatusEnum
  errorCode?: RoomErrorCode | null
  message?: string | null
  loading?: boolean
  onReconnect?: () => void
  onRetry?: () => void
}

const ERROR_LABELS: Record<RoomErrorCode, string> = {
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_FULL: 'Room full',
  AUTH_FAILED: 'Authentication failure',
  SERVER_ERROR: 'Server error',
  NETWORK_TIMEOUT: 'Network timeout',
  CONNECTION: 'Connection error',
  INVALID_INPUT: 'Invalid input',
  UNEXPECTED_STATE: 'Unexpected game state',
}

const ERROR_VARIANTS: Record<RoomErrorCode, 'error' | 'warning' | 'info'> = {
  ROOM_NOT_FOUND: 'warning',
  ROOM_FULL: 'warning',
  AUTH_FAILED: 'error',
  SERVER_ERROR: 'error',
  NETWORK_TIMEOUT: 'error',
  CONNECTION: 'error',
  INVALID_INPUT: 'warning',
  UNEXPECTED_STATE: 'error',
}

export function ConnectionStatus({
  status,
  errorCode,
  message,
  loading = false,
  onReconnect,
  onRetry,
}: ConnectionStatusProps) {
  if (loading) {
    return <LoadingSpinner message={message ?? 'Loading...'} />
  }

  if (errorCode) {
    return (
      <ErrorMessage
        code={errorCode}
        message={message ?? ERROR_LABELS[errorCode]}
        variant={ERROR_VARIANTS[errorCode]}
        onRetry={onRetry}
      />
    )
  }

  if (status === ConnectionStatusEnum.CONNECTING) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-sm border border-accent-ice/30 bg-accent-ice/5 animate-fade-in">
        <LoadingSpinner size="sm" message="Connecting..." />
      </div>
    )
  }

  if (status === ConnectionStatusEnum.RECONNECTING) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-sm border border-accent-fire/40 bg-accent-fire/5 animate-fade-in">
        <LoadingSpinner size="sm" message="Connection lost — reconnecting..." />
        {onReconnect && (
          <button
            onClick={onReconnect}
            className="btn-ghost text-xs flex-shrink-0"
            title="Reconnect now"
          >
            Reconnect
          </button>
        )}
      </div>
    )
  }

  if (status === ConnectionStatusEnum.CONNECTED) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-player-green/40 bg-player-green/10 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-player-green animate-pulse" />
        <span className="font-display text-[10px] uppercase tracking-widest text-player-green">
          Connected
        </span>
      </div>
    )
  }

  if (status === ConnectionStatusEnum.DISCONNECTED) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-storm-500/40 bg-storm-800/40 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-storm-400" />
        <span className="font-display text-[10px] uppercase tracking-widest text-storm-300">
          Disconnected
        </span>
      </div>
    )
  }

  return null
}