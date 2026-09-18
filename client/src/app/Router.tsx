import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainMenu } from '../ui/MainMenu';
import { CreateRoom } from '../ui/CreateRoom';
import { JoinRoom } from '../ui/JoinRoom';
import { Lobby } from '../ui/Lobby';
import { GameScreen } from '../ui/GameScreen';
import { ResultsScreen } from '../ui/ResultsScreen';
import { Settings } from '../ui/Settings';
import { Profile } from '../ui/Profile';
import { MatchDetail } from '../ui/MatchDetail';
import { Login } from '../ui/Login';
import { Registration } from '../ui/Registration';
import { NotFound } from '../ui/NotFound';
import { ProtectedRoute } from './ProtectedRoute';
import { ErrorBoundary } from '../ui/components/ErrorBoundary';

export function Router() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />

          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/join-room" element={<JoinRoom />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/settings" element={<Settings />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:matchId"
            element={
              <ProtectedRoute>
                <MatchDetail />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
