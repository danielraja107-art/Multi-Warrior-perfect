const DEFAULT_SERVER_URL = 'ws://localhost:2567'

function apiBaseUrl(): string {
  const nodeEnv =
    typeof process !== 'undefined' && process.env?.VITE_SERVER_URL
      ? process.env.VITE_SERVER_URL
      : undefined
  const viteEnv = (import.meta as { env?: { VITE_SERVER_URL?: string } }).env?.VITE_SERVER_URL
  return (nodeEnv || viteEnv || DEFAULT_SERVER_URL).replace(/^ws/, 'http').replace(/\/$/, '')
}

let lastReportAt = 0

export function reportError(
  kind: 'client' | 'render' | 'network' | 'unhandled',
  message: unknown,
  location?: unknown,
): void {
  const text = message instanceof Error ? message.message : String(message ?? 'unknown error')
  // eslint-disable-next-line no-console
  console.error(`[${kind}]`, text, location ?? '')

  if (typeof window === 'undefined') return

  try {
    const now = Date.now()
    if (now - lastReportAt < 2000) return
    lastReportAt = now

    fetch(`${apiBaseUrl()}/api/log/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: kind,
        message: text.slice(0, 1000),
        location: typeof location === 'string' ? location.slice(0, 500) : undefined,
      }),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // telemetry must never break the app
  }
}