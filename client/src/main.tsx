import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { reportError } from './network/telemetry'
import { ErrorBoundary } from './ui/components/ErrorBoundary'
import './index.css'

window.addEventListener('error', (event) => {
  reportError('unhandled', event.error ?? event.message, 'window error')
})

window.addEventListener('unhandledrejection', (event) => {
  reportError('unhandled', event.reason, 'unhandled promise rejection')
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)