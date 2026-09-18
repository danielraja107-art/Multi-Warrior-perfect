import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/useGameStore';
import {
  API,
  ApiError,
  ProfileResponse,
  StatsResponse,
  MatchDTO,
  AchievementsResponse,
} from '../network/api';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProgressBar } from './components/ProgressBar';
import { StormEffect } from './components/StormEffect';

type LoadState = 'loading' | 'ready' | 'error';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function Profile() {
  const navigate = useNavigate();
  const username = useGameStore((s) => s.auth.username);
  const profileState = useGameStore((s) => s.profile);
  const setProfile = useGameStore((s) => s.setProfile);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<ProfileResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [achievements, setAchievements] = useState<AchievementsResponse['achievements']>([]);
  const [avatar, setAvatar] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);

  const loadAll = async () => {
    setLoadState('loading');
    setError(null);
    try {
      const [profileRes, statsRes, historyRes, achRes] = await Promise.all([
        API.profile(),
        API.stats(),
        API.history(),
        API.achievements(),
      ]);

      setMe(profileRes);
      setStats(statsRes);
      setMatches(historyRes.matches);
      setAchievements(achRes.achievements);
      setAvatar(profileRes.profile.avatar ?? '');
      setProfile({
        level: profileRes.profile.level,
        xp: profileRes.profile.xp,
        xpToNext: 100 * profileRes.profile.level,
        coins: profileRes.profile.coins,
        wins: profileRes.profile.wins,
        losses: profileRes.profile.losses,
        totalKills: profileRes.profile.totalKills,
        totalDamage: profileRes.profile.totalDamage,
      });
      setLoadState('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load profile.');
      setLoadState('error');
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAvatar = async () => {
    setSavingAvatar(true);
    try {
      await API.updateAvatar(avatar.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save avatar.');
    } finally {
      setSavingAvatar(false);
    }
  };

  if (loadState === 'loading') {
    return <LoadingSpinner overlay message="Loading profile..." />;
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <StormEffect intensity="low" showRain={false} showLightning />
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
            <div className="flex gap-3">
              <button onClick={() => navigate('/')} className="btn-secondary text-sm">
                Main Menu
              </button>
              <button
                onClick={() => {
                  useGameStore.getState().logout();
                  navigate('/');
                }}
                className="btn-danger text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-player-red/10 border border-player-red/30 rounded-sm text-player-red text-sm font-body animate-shake">
              {error}
            </div>
          )}

          {loadState === 'error' && !stats && (
            <div className="panel p-8 text-center">
              <p className="font-body text-storm-300 mb-4">{error ?? 'Failed to load profile.'}</p>
              <button onClick={() => void loadAll()} className="btn-primary">
                Retry
              </button>
            </div>
          )}

          {(loadState === 'ready' || stats) && (
            <>
              <div className="panel p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-lightning to-accent-energy flex items-center justify-center font-display text-2xl font-bold text-white shadow-lg shadow-accent-lightning/20">
                      {(me?.username ?? username ?? 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-white">
                        {me?.username ?? username ?? 'Player'}
                      </h2>
                      <p className="font-body text-xs text-storm-400">
                        Level {stats?.level ?? profileState.level}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[220px]">
                    <ProgressBar
                      variant="xp"
                      size="md"
                      value={stats?.xp ?? profileState.xp}
                      max={100 * (stats?.level ?? profileState.level)}
                      showLabel
                      label="XP"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[10px] text-storm-400">
                        {stats?.xp ?? profileState.xp}/{100 * (stats?.level ?? profileState.level)}{' '}
                        XP
                      </span>
                      <span className="font-mono text-[10px] text-accent-energy">
                        {stats?.coins ?? profileState.coins} coins
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="Wins"
                  value={stats?.wins ?? profileState.wins}
                  accent="text-accent-lightning"
                />
                <StatCard
                  label="Losses"
                  value={stats?.losses ?? profileState.losses}
                  accent="text-storm-300"
                />
                <StatCard
                  label="Total Kills"
                  value={stats?.totalKills ?? profileState.totalKills}
                  accent="text-player-red"
                />
                <StatCard
                  label="Matches Played"
                  value={stats?.matchesPlayed ?? 0}
                  accent="text-storm-200"
                />
              </div>

              <div className="panel p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-white">Achievements</h3>
                  <span className="font-mono text-xs text-storm-400">
                    {unlockedCount}/{achievements.length} unlocked
                  </span>
                </div>
                {achievements.length === 0 ? (
                  <p className="font-body text-sm text-storm-400">No achievements defined yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {achievements.map((a) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 p-3 rounded-sm border ${
                          a.unlocked
                            ? 'border-accent-lightning/40 bg-accent-lightning/5'
                            : 'border-storm-600/30 bg-storm-800/40 opacity-60'
                        }`}
                      >
                        <span
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border ${
                            a.unlocked
                              ? 'bg-accent-lightning/10 border-accent-lightning/40 shadow-[0_0_12px_rgba(250,204,21,0.25)]'
                              : 'bg-storm-800/60 border-storm-600/30 grayscale'
                          }`}
                        >
                          {a.icon ?? '🏆'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-white">{a.name}</p>
                          <p className="font-body text-[11px] text-storm-400 leading-tight">
                            {a.description}
                          </p>
                          {a.unlockedAt && (
                            <p className="font-mono text-[10px] text-accent-lightning mt-1">
                              Unlocked {formatDate(a.unlockedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                  <h3 className="font-display text-lg font-bold text-white">Avatar</h3>
                  <div className="flex flex-1 gap-2 md:max-w-sm">
                    <input
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="Avatar URL (optional)"
                      className="input-field flex-1"
                    />
                    <button
                      onClick={() => void saveAvatar()}
                      disabled={savingAvatar}
                      className="btn-secondary text-sm shrink-0"
                    >
                      {savingAvatar ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel p-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">Match History</h3>
                {matches.length === 0 ? (
                  <p className="font-body text-sm text-storm-400">
                    No matches played yet. Jump into the arena and make history.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m) => {
                      const my = m.participants.find((p) => p.userId === me?.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => navigate(`/profile/${m.id}`)}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-sm border border-storm-600/30 bg-storm-800/40 hover:border-accent-lightning/40 hover:bg-storm-800/70 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block w-10 text-center font-display text-xs font-bold ${m.victory ? 'text-accent-lightning' : 'text-player-red'}`}
                            >
                              {m.victory ? 'WIN' : 'LOSS'}
                            </span>
                            <div>
                              <p className="font-display text-sm font-bold text-white">
                                {m.difficulty} · {m.arena}
                              </p>
                              <p className="font-body text-xs text-storm-400">
                                Wave {m.wavesCleared} · {formatDuration(m.duration)} ·{' '}
                                {m.participants.length} player
                                {(m.participants.length ?? 1) > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs text-storm-300">
                              {formatDate(m.createdAt)}
                            </p>
                            {my && (
                              <p className="font-mono text-xs text-accent-energy">
                                {my.kills} K · {my.damage} D · +{my.xpEarned} XP
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="panel p-4 text-center">
      <p className={`font-display text-2xl font-bold ${accent}`}>{value.toLocaleString()}</p>
      <p className="font-display text-[10px] uppercase tracking-widest text-storm-400 mt-1">
        {label}
      </p>
    </div>
  );
}
