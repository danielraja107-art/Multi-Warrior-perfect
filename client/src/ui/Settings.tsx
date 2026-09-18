import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../state/useGameStore'

export function Settings() {
  const navigate = useNavigate()
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)

  const [musicVolume, setMusicVolume] = useState(settings.musicVolume)
  const [sfxVolume, setSfxVolume] = useState(settings.sfxVolume)
  const [masterVolume, setMasterVolume] = useState(settings.masterVolume)
  const [graphicsQuality, setGraphicsQuality] = useState(settings.graphicsQuality)

  const handleSave = () => {
    setSettings({ musicVolume, sfxVolume, masterVolume, graphicsQuality })
    navigate(-1)
  }

  const handleReset = () => {
    setMusicVolume(70)
    setSfxVolume(80)
    setMasterVolume(100)
    setGraphicsQuality('medium')
  }

  const QUALITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'text-storm-300', border: 'border-storm-500/40' },
    { value: 'medium', label: 'Medium', color: 'text-accent-lightning', border: 'border-accent-lightning/40' },
    { value: 'high', label: 'High', color: 'text-player-green', border: 'border-player-green/40' },
  ]

  const VolumeSlider = ({
    label,
    value,
    onChange,
    icon,
  }: {
    label: string
    value: number
    onChange: (v: number) => void
    icon: React.ReactNode
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-body text-sm text-storm-200">{label}</span>
        </div>
        <span className="font-mono text-xs text-storm-400">{value}%</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-storm-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent-lightning
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(250,204,21,0.5)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <div
          className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-accent-lightning to-accent-ice rounded-full pointer-events-none"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <button
          onClick={() => navigate(-1)}
          className="absolute -top-12 left-0 font-body text-sm text-storm-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="panel p-8">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-2">Settings</h2>
          <p className="font-body text-sm text-storm-300 text-center mb-8">Customize your experience</p>

          <div className="space-y-6">
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-storm-300 mb-4">Audio</p>
              <div className="space-y-5">
                <VolumeSlider
                  label="Master Volume"
                  value={masterVolume}
                  onChange={setMasterVolume}
                  icon={
                    <svg className="w-4 h-4 text-storm-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                    </svg>
                  }
                />
                <VolumeSlider
                  label="Music"
                  value={musicVolume}
                  onChange={setMusicVolume}
                  icon={
                    <svg className="w-4 h-4 text-storm-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  }
                />
                <VolumeSlider
                  label="Sound Effects"
                  value={sfxVolume}
                  onChange={setSfxVolume}
                  icon={
                    <svg className="w-4 h-4 text-storm-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.5 4a1 1 0 011.5-.87l3 1.732a1 1 0 010 1.74l-3 1.732A1 1 0 0114.5 6.464V4z" clipRule="evenodd" />
                    </svg>
                  }
                />
              </div>
            </div>

            <div className="storm-divider" />

            <div>
              <p className="font-display text-xs uppercase tracking-widest text-storm-300 mb-4">Graphics</p>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setGraphicsQuality(q.value as 'low' | 'medium' | 'high')}
                    className={`flex-1 py-2.5 rounded-sm font-display text-xs uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                      graphicsQuality === q.value
                        ? `${q.color} ${q.border} bg-storm-700/50`
                        : 'text-storm-400 border-storm-600/30 hover:bg-storm-800/40'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-body text-xs text-storm-500">
                Select the rendering quality to match your device. High uses more visual effects.
              </p>
            </div>

            <div className="storm-divider" />

            <div>
              <p className="font-display text-xs uppercase tracking-widest text-storm-300 mb-4">Controls</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-storm-800/40 rounded-sm">
                  <span className="text-storm-400">Move</span>
                  <span className="font-mono text-storm-200">WASD</span>
                </div>
                <div className="flex justify-between p-2 bg-storm-800/40 rounded-sm">
                  <span className="text-storm-400">Attack</span>
                  <span className="font-mono text-storm-200">Left Click</span>
                </div>
                <div className="flex justify-between p-2 bg-storm-800/40 rounded-sm">
                  <span className="text-storm-400">Block</span>
                  <span className="font-mono text-storm-200">Right Click</span>
                </div>
                <div className="flex justify-between p-2 bg-storm-800/40 rounded-sm">
                  <span className="text-storm-400">Dodge</span>
                  <span className="font-mono text-storm-200">Space</span>
                </div>
                <div className="flex justify-between p-2 bg-storm-800/40 rounded-sm">
                  <span className="text-storm-400">Pickup</span>
                  <span className="font-mono text-storm-200">E</span>
                </div>
                <div className="flex justify-between p-2 bg-storm-800/40 rounded-sm">
                  <span className="text-storm-400">Throw</span>
                  <span className="font-mono text-storm-200">Q</span>
                </div>
              </div>
            </div>

            <div className="storm-divider" />

            <div className="flex gap-3">
              <button onClick={handleReset} className="btn-ghost flex-1">
                Reset Defaults
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
