import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/useGameStore';
import { API, ApiError } from '../network/api';
import { LoadingSpinner } from './components/LoadingSpinner';
import { StormEffect } from './components/StormEffect';

export function Login() {
  const navigate = useNavigate();
  const setAuth = useGameStore((s) => s.setAuth);
  const setLoading = useGameStore((s) => s.setLoading);
  const loadingMessage = useGameStore((s) => s.ui.loadingMessage);
  const isLoading = useGameStore((s) => s.ui.isLoading);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true, 'Signing in...');
    setError(null);
    try {
      const result = await API.login(identifier, password);
      setAuth({
        isAuthenticated: true,
        userId: result.user.id,
        username: result.user.username,
        email: result.user.email,
        token: result.token,
      });

      API.profile()
        .then((me) => {
          useGameStore.getState().setProfile({
            level: me.profile.level,
            xp: me.profile.xp,
            xpToNext: 100 * me.profile.level,
            coins: me.profile.coins,
            wins: me.profile.wins,
            losses: me.profile.losses,
            totalKills: me.profile.totalKills,
            totalDamage: me.profile.totalDamage,
          });
        })
        .catch(() => {
          void 0;
        });

      setLoading(false);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  if (isLoading) {
    return <LoadingSpinner overlay message={loadingMessage} />;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <StormEffect intensity="low" showRain={false} showLightning />
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <button
          onClick={() => navigate('/')}
          className="absolute -top-12 left-0 font-body text-sm text-storm-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <div className="panel p-8">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-2">Sign In</h2>
          <p className="font-body text-sm text-storm-300 text-center mb-8">
            Welcome back to the arena
          </p>

          {error && (
            <div className="mb-6 p-3 bg-player-red/10 border border-player-red/30 rounded-sm text-player-red text-sm font-body animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">
                Email or Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="you@example.com"
                className="input-field"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter password"
                  className="input-field pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button onClick={handleLogin} className="btn-primary w-full">
              Sign In
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-storm-600/30 text-center">
            <p className="font-body text-xs text-storm-400">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-accent-lightning hover:text-white transition-colors"
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
