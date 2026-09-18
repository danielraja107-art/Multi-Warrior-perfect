import React from 'react'
import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 text-center animate-fade-in">
        <h1 className="font-display text-8xl md:text-9xl font-black text-storm-600 select-none">404</h1>
        <p className="font-display text-xl text-storm-300 mt-4 tracking-wider">LOST IN THE STORM</p>
        <p className="font-body text-sm text-storm-400 mt-2">The page you're looking for doesn't exist</p>
        <div className="storm-divider w-32 mx-auto my-8" />
        <button onClick={() => navigate('/')} className="btn-primary">
          Return to Base
        </button>
      </div>
    </div>
  )
}
