/**
 * Cliente tipado da API /api/v1, usado pela web e pelo app móvel. Cada
 * plataforma injeta como autenticar (cookie do navegador ou cookie guardado
 * no SecureStore) e o que fazer quando a sessão expira.
 */
import type { PreferencesInput, ProfileInput, SessionCommand, WorkoutInput, ExerciseInput } from './schemas';
import type {
  ApiError,
  DashboardDTO,
  ExerciseDTO,
  MeDTO,
  SessionDTO,
  SessionListItemDTO,
  SessionStatus,
  WorkoutDTO,
  WorkoutSummaryDTO,
} from './index';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  /** Ex.: "" (mesma origem, web) ou "http://192.168.0.10:3000" (app). */
  baseUrl: string;
  /** Cabeçalhos extras por requisição (ex.: cookie de sessão no app). */
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
  /** `include` quando a API está em outra origem com cookies (Expo web em dev). */
  credentials?: RequestCredentials;
  onUnauthorized?: () => void;
}

export interface RequestInitLite {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export function createApiClient(opts: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInitLite = {}): Promise<T> {
    const extra = (await opts.headers?.()) ?? {};
    let res: Response;
    try {
      res = await fetch(`${opts.baseUrl}/api/v1${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...extra,
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        credentials: opts.credentials ?? 'same-origin',
        cache: 'no-store',
        signal: init.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new ApiClientError('Sem conexão com o servidor. Verifique sua internet e tente novamente.', 0, 'network');
    }
    if (res.status === 401) opts.onUnauthorized?.();
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const e = (data as ApiError | null)?.error;
      throw new ApiClientError(e?.message ?? 'Erro inesperado.', res.status, e?.code ?? 'unknown', e?.issues);
    }
    return data as T;
  }

  const qs = (params: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return {
    request,
    me: {
      get: () => request<MeDTO>('/me'),
      updateProfile: (input: ProfileInput) => request<MeDTO>('/me', { method: 'PUT', body: input }),
      updatePreferences: (input: PreferencesInput) => request<MeDTO>('/me/preferences', { method: 'PATCH', body: input }),
    },
    dashboard: (tz: string) => request<DashboardDTO>(`/dashboard${qs({ tz })}`),
    exercises: {
      list: (q: { q?: string; muscleGroup?: string; equipment?: string; scope?: string } = {}, signal?: AbortSignal) =>
        request<ExerciseDTO[]>(`/exercises${qs(q)}`, { signal }),
      get: (id: string) => request<ExerciseDTO>(`/exercises/${id}`),
      create: (input: ExerciseInput) => request<ExerciseDTO>('/exercises', { method: 'POST', body: input }),
      update: (id: string, input: ExerciseInput) => request<ExerciseDTO>(`/exercises/${id}`, { method: 'PATCH', body: input }),
      archive: (id: string) => request<{ ok: true }>(`/exercises/${id}`, { method: 'DELETE' }),
      favorite: (id: string, favorite: boolean) => request<{ favorite: boolean }>(`/exercises/${id}/favorite`, { method: 'PUT', body: { favorite } }),
    },
    workouts: {
      list: () => request<WorkoutSummaryDTO[]>('/workouts'),
      get: (id: string) => request<WorkoutDTO>(`/workouts/${id}`),
      create: (input: WorkoutInput) => request<WorkoutDTO>('/workouts', { method: 'POST', body: input }),
      update: (id: string, input: WorkoutInput) => request<WorkoutDTO>(`/workouts/${id}`, { method: 'PUT', body: input }),
      archive: (id: string) => request<{ ok: true }>(`/workouts/${id}`, { method: 'DELETE' }),
      duplicate: (id: string) => request<WorkoutDTO>(`/workouts/${id}/duplicate`, { method: 'POST', body: {} }),
    },
    sessions: {
      start: (workoutId: string) => request<SessionDTO>('/sessions', { method: 'POST', body: { workoutId } }),
      active: () =>
        request<{ session: { id: string; workoutName: string; startedAt: string; status: SessionStatus } | null }>('/sessions/active'),
      get: (id: string) => request<SessionDTO>(`/sessions/${id}`),
      list: (q: { limit?: number; before?: string } = {}) => request<SessionListItemDTO[]>(`/sessions${qs(q)}`),
      command: (id: string, cmd: SessionCommand) => request<SessionDTO>(`/sessions/${id}/commands`, { method: 'POST', body: cmd }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
