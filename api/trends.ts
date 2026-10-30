import type { IncomingMessage, ServerResponse } from 'node:http';
import { allowMethods, clientKey, rateLimit, sendError, sendJson } from './_lib/http.js';
import { trendProviderStatus } from './_lib/provider.js';

/**
 * Trend provider adapter.
 *
 * muse-ician does not scrape platforms. If TREND_PROVIDER_URL is configured,
 * this endpoint proxies a GET to that provider and maps its response into
 * TrendRecord objects, keeping the source name, URL and timestamp intact.
 * Without a provider the endpoint returns 501 with an explicit reason — it never
 * fabricates trend data.
 *
 * Expected provider response (documented in README.md):
 *   { "observed_at": "2026-10-01T12:00:00Z",
 *     "trends": [{ "id": "...", "name": "...", "platform": "tiktok",
 *                  "description": "...", "source_name": "...",
 *                  "source_url": "...", "source_timestamp": "...",
 *                  "geography": "US", "keywords": ["..."], "evidence": "..." }] }
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethods(req, res, ['GET'])) return;
  const status = trendProviderStatus();
  if (!status.configured) {
    sendJson(res, 501, {
      ok: false,
      configured: false,
      error: { code: 'trend_provider_unavailable', message: status.reason },
    });
    return;
  }

  const limited = rateLimit(`trends:${clientKey(req)}`, 10, 60_000);
  if (!limited.ok) {
    res.setHeader('retry-after', String(limited.retryAfter));
    sendError(res, 429, 'rate_limited', `Too many trend lookups. Try again in ${limited.retryAfter} seconds.`);
    return;
  }

  const url = process.env.TREND_PROVIDER_URL as string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(process.env.TREND_PROVIDER_TOKEN
          ? { authorization: `Bearer ${process.env.TREND_PROVIDER_TOKEN}` }
          : {}),
      },
    });
    if (!response.ok) {
      sendError(
        res,
        502,
        'trend_provider_error',
        `The trend provider returned ${response.status}. No trend data was loaded.`,
      );
      return;
    }
    const body = (await response.json()) as {
      observed_at?: string;
      trends?: unknown;
    };
    if (!Array.isArray(body.trends)) {
      sendError(res, 502, 'trend_provider_shape', 'The trend provider response did not contain a trends array.');
      return;
    }

    const observedAt = body.observed_at ?? new Date().toISOString();
    const trends = body.trends.slice(0, 100).map((raw, index) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const text = (key: string, max = 2000) =>
        typeof item[key] === 'string' ? (item[key] as string).slice(0, max) : null;
      return {
        id: text('id') ?? `trend-${index + 1}`,
        name: text('name', 200) ?? 'Unnamed trend',
        platform: text('platform', 100) ?? 'unknown',
        description: text('description') ?? '',
        source_name: text('source_name', 200) ?? status.provider ?? 'Unknown source',
        source_url: text('source_url', 2000),
        source_timestamp: text('source_timestamp', 60),
        observed_at: text('observed_at', 60) ?? observedAt,
        geography: text('geography', 100),
        keywords: Array.isArray(item.keywords)
          ? item.keywords.filter((keyword): keyword is string => typeof keyword === 'string').slice(0, 20)
          : [],
        evidence: text('evidence') ?? '',
        confidence: ['low', 'medium', 'high'].includes(String(item.confidence))
          ? (item.confidence as string)
          : 'low',
        schema_version: '1.0.0',
        created_at: new Date().toISOString(),
      };
    });

    sendJson(res, 200, {
      ok: true,
      configured: true,
      provider: status.provider,
      observed_at: observedAt,
      trends,
      note: 'Trend records are shown with their original source and timestamp. Verify each one at the source before adapting it, and never copy another creator’s execution wholesale.',
    });
  } catch (error) {
    const aborted = (error as Error).name === 'AbortError';
    sendError(
      res,
      502,
      aborted ? 'trend_provider_timeout' : 'trend_provider_unreachable',
      aborted
        ? 'The trend provider did not respond within 20 seconds. No trend data was loaded.'
        : 'The trend provider could not be reached. No trend data was loaded.',
    );
  } finally {
    clearTimeout(timer);
  }
}
