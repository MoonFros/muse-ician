import type { TrendRecord } from '../lib/types';
import type { AiOperation } from '../lib/types';

/** Browser client for the app's own serverless endpoints. Keys never live here. */

export interface AiStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  mock: boolean;
  reason: string | null;
}

export interface TrendStatus {
  configured: boolean;
  provider: string | null;
  reason: string | null;
}

export interface IntegrationStatus {
  reachable: boolean;
  ai: AiStatus;
  trends: TrendStatus;
  checkedAt: string;
  unreachableReason?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  constructor(message: string, code: string, status = 0, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const UNAVAILABLE_STATUS: IntegrationStatus = {
  reachable: false,
  ai: {
    configured: false,
    provider: null,
    model: null,
    mock: false,
    reason:
      'This build is running without its API layer, so AI and trend features are unavailable. Everything else — the preset library, ideas, calendar, journal and JSON import/export — works offline.',
  },
  trends: {
    configured: false,
    provider: null,
    reason:
      'Live trend research needs the API layer and a configured trend provider. Evergreen guidance is still available.',
  },
  checkedAt: new Date().toISOString(),
  unreachableReason:
    'The API endpoints did not respond. If you are previewing a static build, deploy with the included serverless functions (Vercel) or run `npm run dev`.',
};

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(UNAVAILABLE_STATUS.unreachableReason ?? 'Unexpected response', 'endpoint_unavailable', response.status);
  }
  const data = (await response.json()) as T & {
    ok?: boolean;
    error?: { code?: string; message?: string; retryable?: boolean };
  };
  if (!response.ok || data.ok === false) {
    const message = data.error?.message ?? `Request failed with status ${response.status}.`;
    throw new ApiError(
      message,
      data.error?.code ?? 'request_failed',
      response.status,
      Boolean(data.error?.retryable) || response.status === 429,
    );
  }
  return data;
}

let statusCache: { value: IntegrationStatus; at: number } | null = null;
const STATUS_TTL_MS = 60_000;

export async function getIntegrationStatus(options: { force?: boolean; signal?: AbortSignal } = {}): Promise<IntegrationStatus> {
  if (!options.force && statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) {
    return statusCache.value;
  }
  try {
    const response = await fetch('/api/status', {
      signal: options.signal,
      headers: { accept: 'application/json' },
    });
    const data = await parseResponse<{ ai: AiStatus; trends: TrendStatus }>(response);
    const value: IntegrationStatus = {
      reachable: true,
      ai: data.ai,
      trends: data.trends,
      checkedAt: new Date().toISOString(),
    };
    statusCache = { value, at: Date.now() };
    return value;
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    const value: IntegrationStatus = { ...UNAVAILABLE_STATUS, checkedAt: new Date().toISOString() };
    statusCache = { value, at: Date.now() };
    return value;
  }
}

export interface RunOperationResult<T> {
  data: T;
  meta: { provider?: string; model?: string; latency_ms?: number };
  mock: boolean;
}

export async function runOperation<T extends Record<string, unknown>>(
  operation: AiOperation,
  context: Record<string, unknown>,
  options: { signal?: AbortSignal } = {},
): Promise<RunOperationResult<T>> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    signal: options.signal,
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ operation, context }),
  });
  const data = await parseResponse<{
    data: T;
    meta: { provider?: string; model?: string; latency_ms?: number };
    mock?: boolean;
  }>(response);
  return { data: data.data, meta: data.meta ?? {}, mock: Boolean(data.mock) };
}

export interface TrendFetchResult {
  trends: TrendRecord[];
  provider: string | null;
  observedAt: string;
  note: string;
}

export async function fetchLiveTrends(options: { signal?: AbortSignal } = {}): Promise<TrendFetchResult> {
  const response = await fetch('/api/trends', {
    signal: options.signal,
    headers: { accept: 'application/json' },
  });
  const data = await parseResponse<{
    trends: TrendRecord[];
    provider: string | null;
    observed_at: string;
    note: string;
  }>(response);
  return {
    trends: data.trends ?? [],
    provider: data.provider ?? null,
    observedAt: data.observed_at,
    note: data.note ?? '',
  };
}

export function isAbortError(error: unknown): boolean {
  return (error as Error | undefined)?.name === 'AbortError';
}
