/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        storm: {
          50: '#f0f1f4',
          100: '#d1d4de',
          200: '#a3a9bd',
          300: '#757e9c',
          400: '#47537b',
          500: '#2a3558',
          600: '#1e2742',
          700: '#141b2e',
          800: '#0c101c',
          900: '#06080f',
          950: '#020305',
        },
        player: {
          red: '#ef4444',
          blue: '#3b82f6',
          green: '#22c55e',
          yellow: '#eab308',
        },
        accent: {
          fire: '#f97316',
          lightning: '#facc15',
          ice: '#06b6d4',
          poison: '#a855f7',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'lightning': 'lightning 0.15s ease-in-out',
        'boss-shake': 'boss-shake 0.3s ease-in-out',
        'wave-enter': 'wave-enter 0.8s ease-out',
        'xp-fill': 'xp-fill 1.5s ease-out forwards',
        'health-pulse': 'health-pulse 1s ease-in-out infinite',
        'storm-bg': 'storm-bg 8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(250, 204, 21, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(250, 204, 21, 0.8)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'lightning': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'boss-shake': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'wave-enter': {
          '0%': { transform: 'scale(0.8) rotate(-5deg)', opacity: '0' },
          '50%': { transform: 'scale(1.1) rotate(2deg)', opacity: '0.8' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'xp-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--xp-target)' },
        },
        'health-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'storm-bg': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'storm-gradient': 'linear-gradient(135deg, #06080f 0%, #141b2e 50%, #0c101c 100%)',
        'storm-radial': 'radial-gradient(ellipse at center, #1e2742 0%, #06080f 100%)',
        'lightning-flash': 'linear-gradient(180deg, rgba(250,204,21,0.1) 0%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
