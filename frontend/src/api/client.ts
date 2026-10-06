import type {
  BodyComp, Level, NutritionDay, RiskResponse, Tier, TrainingKind,
  TrendsResult, User, WeighIn, Workout,
} from './types'

/** Thrown for non-2xx responses; carries the server's error message when present. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  listUsers: () => request<User[]>('/api/users'),
  getUser: (id: string) => request<User>(`/api/users/${id}`),
  createUser: (body: {
    name: string; heightIn?: number; goalWeightLb?: number;
    medication?: string; loggingPreference?: Tier; bodyCompAccess?: string[]
  }) => request<User>('/api/users', { method: 'POST', body: JSON.stringify(body) }),

  updateUser: (id: string, body: {
    name?: string; heightIn?: number; goalWeightLb?: number;
    medication?: string; loggingPreference?: Tier; bodyCompAccess?: string[]
  }) => request<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getRisk: (id: string, date?: string) =>
    request<RiskResponse>(`/api/users/${id}/risk${date ? `?date=${date}` : ''}`),
  getTrends: (id: string, range: number, date?: string) =>
    request<TrendsResult>(`/api/users/${id}/trends?range=${range}${date ? `&date=${date}` : ''}`),

  getWeighIns: (id: string) => request<WeighIn[]>(`/api/users/${id}/weigh-ins`),
  postWeighIn: (userId: string, loggedOn: string, weightLb: number) =>
    request<WeighIn>('/api/weigh-ins', {
      method: 'POST', body: JSON.stringify({ userId, loggedOn, weightLb }),
    }),

  getNutrition: (id: string) => request<NutritionDay[]>(`/api/users/${id}/nutrition`),
  postNutritionQuick: (userId: string, loggedOn: string, level: Level) =>
    request<NutritionDay>('/api/nutrition', {
      method: 'POST', body: JSON.stringify({ userId, loggedOn, tier: 'quick', level }),
    }),
  postNutritionEstimate: (userId: string, loggedOn: string, mealLevels: Record<string, Level>) =>
    request<NutritionDay>('/api/nutrition', {
      method: 'POST', body: JSON.stringify({ userId, loggedOn, tier: 'estimate', mealLevels }),
    }),
  postNutritionPrecise: (userId: string, loggedOn: string, mealGrams: Record<string, number>) =>
    request<NutritionDay>('/api/nutrition', {
      method: 'POST', body: JSON.stringify({ userId, loggedOn, tier: 'precise', mealGrams }),
    }),

  getWorkouts: (id: string) => request<Workout[]>(`/api/users/${id}/workouts`),
  postWorkout: (body: {
    userId: string; loggedOn: string; type: TrainingKind;
    durationMin?: number; muscles?: string[]; effort?: string; cardioType?: string
  }) => request<Workout>('/api/workouts', { method: 'POST', body: JSON.stringify(body) }),

  getBodyComp: (id: string) => request<BodyComp[]>(`/api/users/${id}/body-comp`),
  postBodyComp: (body: {
    userId: string; loggedOn: string; bodyFatPct?: number; leanMassLb?: number; source?: string
  }) => request<BodyComp>('/api/body-comp', { method: 'POST', body: JSON.stringify(body) }),
}
