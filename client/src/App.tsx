import React, { useEffect } from 'react'
import { Router } from './app/Router'
import { useGameStore } from './state/useGameStore'

const SETTINGS_KEY = 'storm_arena.settings'
const AUTH_KEY = 'storm_arena.auth'

export default function App() {
  useEffect(() => {
    const store = useGameStore.getState()

    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY)
      if (savedSettings) {
        store.setSettings(JSON.parse(savedSettings))
      }
    } catch {
      localStorage.removeItem(SETTINGS_KEY)
    }

    try {
      const savedAuth = localStorage.getItem(AUTH_KEY)
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth) as { token: string; userId: string; username: string; email: string }
        if (parsed.token) {
          store.setAuth({
            isAuthenticated: true,
            token: parsed.token,
            userId: parsed.userId,
            username: parsed.username,
            email: parsed.email,
          })
        }
      }
    } catch {
      localStorage.removeItem(AUTH_KEY)
    }

    const unsubscribeSettings = useGameStore.subscribe((state, prevState) => {
      if (state.settings !== prevState.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))

        // Phase 21: Notify Member 2's AudioManager & Rendering of settings change
        window.dispatchEvent(
          new CustomEvent('storm-arena-settings-changed', {
            detail: state.settings,
          })
        )
      }
      if (state.auth !== prevState.auth) {
        if (state.auth.isAuthenticated && state.auth.token) {
          localStorage.setItem(AUTH_KEY, JSON.stringify(state.auth))
        } else {
          localStorage.removeItem(AUTH_KEY)
        }
      }
    })

    return unsubscribeSettings
  }, [])

  return (
    <div className="w-full h-full w-screen h-screen overflow-hidden select-none bg-storm-950 flex flex-col">
      <Router />
    </div>
  )
}