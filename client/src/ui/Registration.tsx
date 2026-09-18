import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/useGameStore';
import { API, ApiError } from '../network/api';
import { LoadingSpinner } from './components/LoadingSpinner';
import { StormEffect } from './components/StormEffect';

export function Registration() {
  const navigate = useNavigate();
  const setAuth = useGameStore((s) => s.setAuth);
  const setLoading = useGameStore((s) => s.setLoading);
  const loadingMessage = useGameStore((s) => s.ui.loadingMessage);
  const isLoading = useGameStore((s) => s.ui.isLoading);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true, 'Creating account...');
    setError(null);
    try {
      const result = await API.register({ email, username, password });
      setAuth({
        isAuthenticated: true,
        userId: result.user.id,
        username: result.user.username,
        email: result.user.email,
        token: result.token,
      });
      setLoading(false);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRegister();
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
          <h2 className="font-display text-2xl font-bold text-white text-center mb-2">
            Create Account
          </h2>
          <p className="font-body text-sm text-storm-300 text-center mb-8">
            Join the battle and track your progress
          </p>

          {error && (
            <div className="mb-6 p-3 bg-player-red/10 border border-player-red/30 rounded-sm text-player-red text-sm font-body animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Choose a username"
                className="input-field"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
                onKeyDown={handleKeyDown}
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
                  placeholder="At least 6 characters"
                  className="input-field pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-400 hover:text-white transition-colors"
                >
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
                </button>
              </div>
            </div>

            <div>
              <label className="block font-display text-xs uppercase tracking-widest text-storm-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Repeat password"
                className="input-field"
                autoComplete="new-password"
                onKeyDown={handleKeyDown}
              />
            </div>

            <button onClick={handleRegister} className="btn-primary w-full mt-2">
              Create Account
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-storm-600/30 text-center">
            <p className="font-body text-xs text-storm-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-accent-lightning hover:text-white transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
