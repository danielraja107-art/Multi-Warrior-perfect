import { useGameStore } from '../state/useGameStore';

export interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useGameStore.getState().auth.token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Please try again.');
  }

  if (res.status === 401 && token) {
    useGameStore.getState().logout();
  }

  const body = (await res.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? `Request failed with status ${res.status}.`,
    );
  }

  return body;
}

export async function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export async function post<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

export async function patch<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

export interface AuthResponse {
  user: { id: string; email: string; username: string };
  token: string;
}

export async function apiRegister(input: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return post<AuthResponse>('/api/auth/register', input);
}

export async function apiLogin(identifier: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/api/auth/login', { identifier, password });
}

export interface ProfileResponse {
  id: string;
  username: string;
  email: string;
  profile: {
    level: number;
    xp: number;
    coins: number;
    wins: number;
    losses: number;
    totalKills: number;
    totalDamage: number;
    avatar: string | null;
  };
  achievements: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }[];
}

export interface StatsResponse {
  username: string;
  email: string;
  level: number;
  xp: number;
  coins: number;
  wins: number;
  losses: number;
  totalKills: number;
  totalDamage: number;
  matchesPlayed: number;
  xpHistory: number[];
}

export interface MatchParticipantDTO {
  id: string;
  userId: string;
  color: string;
  kills: number;
  damage: number;
  deaths: number;
  xpEarned: number;
  user?: { id: string; username: string };
}

export interface MatchDTO {
  id: string;
  roomCode: string;
  arena: string;
  difficulty: string;
  wavesCleared: number;
  bossDefeated: boolean;
  duration: number;
  victory: boolean;
  createdAt: string;
  participants: MatchParticipantDTO[];
}

export interface AchievementsResponse {
  achievements: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt: string | null;
  }[];
}

export const API = {
  register: apiRegister,
  login: apiLogin,
  profile: () => get<ProfileResponse>('/api/me'),
  stats: () => get<StatsResponse>('/api/me/stats'),
  history: () => get<{ matches: MatchDTO[] }>('/api/me/history'),
  achievements: () => get<AchievementsResponse>('/api/achievements'),
  match: (id: string) => get<{ match: MatchDTO }>(`/api/matches/${id}`),
  updateAvatar: (avatar: string) => patch<{ avatar: string }>('/api/me/avatar', { avatar }),
};
