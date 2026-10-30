import type { IncomingMessage, ServerResponse } from 'node:http';

export const MAX_BODY_BYTES = 120_000;

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(body);
}

export function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): void {
  sendJson(res, status, { ok: false, error: { code, message, ...extra } });
}

export async function readJsonBody(req: IncomingMessage): Promise<{ ok: true; value: unknown } | { ok: false; message: string; code: string }> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) {
      return { ok: false, code: 'payload_too_large', message: `Request body exceeds ${MAX_BODY_BYTES} bytes.` };
    }
    chunks.push(buffer);
  }
  if (!chunks.length) return { ok: false, code: 'empty_body', message: 'Request body is required.' };
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, code: 'invalid_json', message: 'Request body must be valid JSON.' };
  }
}

export function allowMethods(req: IncomingMessage, res: ServerResponse, methods: string[]): boolean {
  if (methods.includes(req.method ?? '')) return true;
  res.setHeader('allow', methods.join(', '));
  sendError(res, 405, 'method_not_allowed', `Use ${methods.join(' or ')} for this endpoint.`);
  return false;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Best-effort in-memory rate limit. Serverless instances do not share memory, so this is a speed bump, not a quota system. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0]!.trim();
  return req.socket?.remoteAddress ?? 'unknown';
}
