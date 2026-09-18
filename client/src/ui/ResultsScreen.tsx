import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerColor } from '@storm-arena/shared';
import { useGameStore } from '../state/useGameStore';
import { ProgressBar } from './components/ProgressBar';
import { StormEffect } from './components/StormEffect';

interface PlayerResult {
  id: string;
  name: string;
  color: PlayerColor;
  kills: number;
  damage: number;
  deaths: number;
  xpEarned: number;
  isLocal: boolean;
}

interface ResultsData {
  victory: boolean;
  wavesCleared: number;
  bossDefeated: boolean;
  duration: number;
  xpEarned: number;
  players: PlayerResult[];
}

export function ResultsScreen() {
  const navigate = useNavigate();
  const isAuthenticated = useGameStore((s) => s.auth.isAuthenticated);

  const results: ResultsData = {
    victory: true,
    wavesCleared: 5,
    bossDefeated: true,
    duration: 847,
    xpEarned: 320,
    players: [
      {
        id: '1',
        name: 'You',
        color: PlayerColor.RED,
        kills: 24,
        damage: 3450,
        deaths: 1,
        xpEarned: 320,
        isLocal: true,
      },
      {
        id: '2',
        name: 'Ally',
        color: PlayerColor.BLUE,
        kills: 18,
        damage: 2890,
        deaths: 0,
        xpEarned: 280,
        isLocal: false,
      },
      {
        id: '3',
        name: 'Sniper',
        color: PlayerColor.GREEN,
        kills: 31,
        damage: 4120,
        deaths: 2,
        xpEarned: 350,
        isLocal: false,
      },
    ],
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}m ${sec}s`;
  };

  const hasData = results.players.length > 0;

  const colorClasses: Record<string, string> = {
    [PlayerColor.RED]: 'bg-player-red',
    [PlayerColor.BLUE]: 'bg-player-blue',
    [PlayerColor.GREEN]: 'bg-player-green',
    [PlayerColor.YELLOW]: 'bg-player-yellow',
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <StormEffect intensity="low" showRain={false} showLightning />

      <div className="relative z-10 w-full max-w-2xl mx-4 animate-slide-up">
        <div className="panel p-8">
          <div className="text-center mb-8">
            {results.victory ? (
              <>
                <h1 className="font-display text-5xl md:text-6xl font-black text-accent-lightning text-glow tracking-wider animate-pulse-glow">
                  VICTORY
                </h1>
                <p className="font-body text-sm text-storm-300 mt-3 tracking-wider uppercase">
                  The Storm Has Been Conquered
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-5xl md:text-6xl font-black text-player-red text-glow-red tracking-wider">
                  DEFEATED
                </h1>
                <p className="font-body text-sm text-storm-300 mt-3 tracking-wider uppercase">
                  The Storm Was Too Strong
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="panel p-3 text-center">
              <p className="font-display text-[10px] uppercase tracking-widest text-storm-400 mb-1">
                Waves
              </p>
              <p className="font-mono text-2xl font-bold text-white">{results.wavesCleared}</p>
            </div>
            <div className="panel p-3 text-center">
              <p className="font-display text-[10px] uppercase tracking-widest text-storm-400 mb-1">
                Boss
              </p>
              <p
                className={`font-mono text-2xl font-bold ${results.bossDefeated ? 'text-player-green' : 'text-player-red'}`}
              >
                {results.bossDefeated ? 'Clear' : 'Failed'}
              </p>
            </div>
            <div className="panel p-3 text-center">
              <p className="font-display text-[10px] uppercase tracking-widest text-storm-400 mb-1">
                Duration
              </p>
              <p className="font-mono text-2xl font-bold text-white">
                {formatTime(results.duration)}
              </p>
            </div>
            <div className="panel p-3 text-center">
              <p className="font-display text-[10px] uppercase tracking-widest text-storm-400 mb-1">
                Total XP
              </p>
              <p className="font-mono text-2xl font-bold text-accent-lightning">
                {results.xpEarned}
              </p>
            </div>
          </div>

          <div className="storm-divider mb-6" />

          <div className="mb-6">
            <p className="font-display text-xs uppercase tracking-widest text-storm-300 mb-4">
              Player Stats
            </p>
            {hasData ? (
              <div className="space-y-3">
                {results.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-3 rounded-sm border ${
                      player.isLocal
                        ? 'border-accent-lightning/30 bg-storm-700/40'
                        : 'border-storm-600/20 bg-storm-800/30'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[player.color]}`}
                    >
                      <span className="font-display text-xs font-bold text-white">
                        {player.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-sm font-medium text-storm-100">
                          {player.name}
                        </span>
                        {player.isLocal && (
                          <span className="font-display text-[8px] uppercase tracking-wider text-accent-lightning bg-accent-lightning/10 px-1.5 py-0.5 rounded-sm border border-accent-lightning/30">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="font-mono text-xs text-storm-400">K: {player.kills}</span>
                        <span className="font-mono text-xs text-storm-400">
                          Dmg: {player.damage.toLocaleString()}
                        </span>
                        <span className="font-mono text-xs text-storm-400">
                          Deaths: {player.deaths}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-accent-lightning">
                        +{player.xpEarned} XP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-sm text-storm-400">No player data available.</p>
            )}
          </div>

          <div className="storm-divider mb-6" />

          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">
              Main Menu
            </button>
            {isAuthenticated && (
              <button onClick={() => navigate('/profile')} className="btn-secondary flex-1">
                Profile
              </button>
            )}
            <button onClick={() => navigate('/lobby')} className="btn-primary flex-1">
              Play Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
