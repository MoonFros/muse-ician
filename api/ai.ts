import type { IncomingMessage, ServerResponse } from 'node:http';
import { allowMethods, clientKey, rateLimit, readJsonBody, sendError, sendJson } from './_lib/http.js';
import { ProviderError, callProvider, readProviderConfig } from './_lib/provider.js';
import { OPERATIONS, buildMessages, isOperation, limitContext } from './_lib/prompts.js';

/**
 * Server-side AI proxy. The browser never sees a provider key: it posts a
 * structured context, this handler talks to the provider and returns validated
 * JSON. Failures are mapped to explicit error codes the client can explain.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethods(req, res, ['POST'])) return;

  const config = readProviderConfig();
  if (!config.configured) {
    sendError(res, 503, 'not_configured', config.missingReason ?? 'AI provider is not configured.');
    return;
  }

  const limited = rateLimit(`ai:${clientKey(req)}`, 30, 60_000);
  if (!limited.ok) {
    res.setHeader('retry-after', String(limited.retryAfter));
    sendError(res, 429, 'rate_limited', `Too many AI requests. Try again in ${limited.retryAfter} seconds.`);
    return;
  }

  const body = await readJsonBody(req);
  if (!body.ok) {
    sendError(res, 400, body.code, body.message);
    return;
  }
  const payload = body.value as { operation?: unknown; context?: unknown };
  if (!isOperation(payload.operation)) {
    sendError(res, 400, 'unknown_operation', `operation must be one of: ${Object.keys(OPERATIONS).join(', ')}`);
    return;
  }

  const context = limitContext(payload.context ?? {});
  const spec = OPERATIONS[payload.operation];
  const started = Date.now();

  try {
    const result = await callProvider(buildMessages(payload.operation, context), {
      maxTokens: spec.maxTokens,
      jsonMode: true,
    });

    let data: unknown;
    try {
      data = JSON.parse(stripFences(result.text));
    } catch {
      sendError(
        res,
        502,
        'invalid_provider_json',
        'The AI provider returned text that was not valid JSON. Nothing was saved. Try again, or use the local analysis instead.',
      );
      return;
    }

    if (result.provider === 'mock') {
      sendJson(res, 200, {
        ok: true,
        mock: true,
        operation: payload.operation,
        data,
        meta: { provider: 'mock', model: 'mock', latency_ms: Date.now() - started },
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      mock: false,
      operation: payload.operation,
      data,
      meta: {
        provider: result.provider,
        model: result.model,
        latency_ms: Date.now() - started,
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      sendError(res, error.status, error.code, error.message, { retryable: error.retryable });
      return;
    }
    sendError(res, 500, 'unexpected_error', (error as Error).message);
  }
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}
