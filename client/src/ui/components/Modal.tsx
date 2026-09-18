import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'confirm'
  actions?: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children, variant = 'default', actions }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const variantBorder = {
    default: 'border-storm-500/30',
    danger: 'border-player-red/40',
    confirm: 'border-accent-lightning/40',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-storm-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative panel ${variantBorder[variant]} w-full max-w-md mx-4 animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-storm-600/30">
            <h2 className="font-display text-sm uppercase tracking-wider text-storm-100">{title}</h2>
            <button onClick={onClose} className="text-storm-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {actions && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-storm-600/30">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
