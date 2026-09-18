import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API, ApiError, MatchDTO } from '../network/api';
import { LoadingSpinner } from './components/LoadingSpinner';
import { StormEffect } from './components/StormEffect';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    API.match(matchId)
      .then((res) => {
        setMatch(res.match);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not load match.');
        setLoading(false);
      });
  }, [matchId]);

  if (loading) {
    return <LoadingSpinner overlay message="Loading match..." />;
  }

  const ranked = match?.participants
    ? [...match.participants].sort((a, b) => b.xpEarned - a.xpEarned)
    : [];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <StormEffect intensity="low" showRain={false} showLightning />
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/profile')} className="btn-secondary text-sm">
              ← Back to Profile
            </button>
            {match && (
              <span
                className={`font-display text-xs font-bold px-3 py-1 rounded-sm ${
                  match.victory
                    ? 'bg-accent-lightning/15 text-accent-lightning'
                    : 'bg-player-red/15 text-player-red'
                }`}
              >
                {match.victory ? 'VICTORY' : 'DEFEAT'}
              </span>
            )}
          </div>

          {error && (
            <div className="p-4 bg-player-red/10 border border-player-red/30 rounded-sm text-player-red text-sm font-body mb-6">
              {error}
            </div>
          )}

          {match && (
            <>
              <div className="panel p-6 mb-6">
                <h1 className="font-display text-2xl font-bold text-white mb-4">Match Details</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Detail label="Room" value={match.roomCode} />
                  <Detail label="Difficulty" value={match.difficulty} />
                  <Detail label="Waves Cleared" value={`${match.wavesCleared}`} />
                  <Detail label="Duration" value={formatDuration(match.duration)} />
                  <Detail label="Arena" value={match.arena} />
                  <Detail label="Players" value={`${match.participants.length}`} />
                  <Detail label="Boss Defeated" value={match.bossDefeated ? 'Yes' : 'No'} />
                  <Detail label="Date" value={new Date(match.createdAt).toLocaleDateString()} />
                </div>
              </div>

              <div className="panel p-6">
                <h2 className="font-display text-lg font-bold text-white mb-4">Leaderboard</h2>
                <div className="space-y-2">
                  {ranked.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 p-3 rounded-sm border border-storm-600/30 bg-storm-800/40"
                    >
                      <span
                        className={`font-display w-6 text-center font-bold ${i === 0 ? 'text-accent-energy' : 'text-storm-400'}`}
                      >
                        {i + 1}
                      </span>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-display text-sm font-bold text-white flex-1">
                        {p.user?.username ?? p.userId.slice(0, 8)}
                      </span>
                      <div className="flex gap-4 text-right">
                        <span className="font-mono text-xs text-storm-300">{p.kills} kills</span>
                        <span className="font-mono text-xs text-storm-300">{p.damage} dmg</span>
                        <span className="font-mono text-xs text-storm-300">{p.deaths} deaths</span>
                      </div>
                      <span className="font-mono text-sm text-accent-energy font-bold">
                        +{p.xpEarned} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[10px] uppercase tracking-widest text-storm-400 mb-1">
        {label}
      </p>
      <p className="font-display text-sm font-bold text-white">{value}</p>
    </div>
  );
}
