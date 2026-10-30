/**
 * Provider-agnostic AI client for the serverless layer.
 *
 * Configuration lives only in server environment variables. Nothing here is
 * prefixed with VITE_, so no key can be bundled into the browser build.
 *
 *   AI_PROVIDER   openai | openai-compatible | anthropic | mock
 *   AI_API_KEY    provider key
 *   AI_BASE_URL   optional base URL for OpenAI-compatible endpoints
 *   AI_MODEL      optional model name
 *   AI_TIMEOUT_MS optional request timeout (default 60000)
 */

export type ProviderName = 'openai' | 'openai-compatible' | 'anthropic' | 'mock';

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
  baseUrl: string;
  configured: boolean;
  missingReason?: string;
}

export function readProviderConfig(): ProviderConfig {
  const rawProvider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
  const provider: ProviderName = ['openai', 'openai-compatible', 'anthropic', 'mock'].includes(rawProvider)
    ? (rawProvider as ProviderName)
    : 'openai';
  const baseUrl = (
    process.env.AI_BASE_URL ??
    (provider === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1')
  ).replace(/\/$/, '');
  const model =
    process.env.AI_MODEL ?? (provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gpt-4o-mini');
  const key = process.env.AI_API_KEY;

  if (provider === 'mock') {
    return { provider, model: 'mock', baseUrl, configured: true };
  }
  if (!key) {
    return {
      provider,
      model,
      baseUrl,
      configured: false,
      missingReason:
        'No AI provider is configured on the server. Add AI_API_KEY (and optionally AI_PROVIDER, AI_MODEL, AI_BASE_URL) to the deployment environment, then redeploy.',
    };
  }
  return { provider, model, baseUrl, configured: true };
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export class ProviderError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  constructor(message: string, code: string, status = 502, retryable = false) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function timeoutMs(): number {
  const parsed = Number(process.env.AI_TIMEOUT_MS ?? 60000);
  return Number.isFinite(parsed) && parsed > 1000 ? parsed : 60000;
}

/**
 * MOCK mode is for local development of the UI states only. It returns a
 * deliberately labelled stub so it can never be mistaken for a live AI reply.
 */
function mockResponse(operation: string): string {
  return JSON.stringify({
    __mock_provider: true,
    operation,
    message:
      'MOCK PROVIDER: this response came from AI_PROVIDER=mock and contains no generated content. Configure a real provider to use this operation.',
  });
}

export async function callProvider(
  messages: ChatMessage[],
  options: { maxTokens?: number; signal?: AbortSignal; jsonMode?: boolean } = {},
): Promise<{ text: string; model: string; provider: ProviderName }> {
  const config = readProviderConfig();
  if (!config.configured) {
    throw new ProviderError(config.missingReason ?? 'AI provider is not configured.', 'not_configured', 503);
  }
  if (config.provider === 'mock') {
    return { text: mockResponse('mock'), model: 'mock', provider: 'mock' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  const abortHandler = () => controller.abort();
  options.signal?.addEventListener('abort', abortHandler);

  try {
    if (config.provider === 'anthropic') {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.AI_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: options.maxTokens ?? 1600,
          system: messages.find((message) => message.role === 'system')?.content ?? '',
          messages: messages
            .filter((message) => message.role === 'user')
            .map((message) => ({ role: 'user', content: message.content })),
          temperature: 0.7,
        }),
      });
      if (!response.ok) throw await mapHttpError(response);
      const data = (await response.json()) as { content?: { type: string; text?: string }[] };
      const text = (data.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('\n');
      if (!text.trim()) throw new ProviderError('The provider returned an empty response.', 'empty_response');
      return { text, model: config.model, provider: config.provider };
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.AI_API_KEY ?? ''}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: options.maxTokens ?? 1600,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!response.ok) throw await mapHttpError(response);
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new ProviderError('The provider returned an empty response.', 'empty_response');
    return { text, model: config.model, provider: config.provider };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ProviderError(
        `The AI provider did not respond within ${Math.round(timeoutMs() / 1000)} seconds. Try again, or ask for less output.`,
        'timeout',
        504,
        true,
      );
    }
    throw new ProviderError(
      `Could not reach the AI provider: ${(error as Error).message}`,
      'network_error',
      502,
      true,
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortHandler);
  }
}

async function mapHttpError(response: Response): Promise<ProviderError> {
  let detail = '';
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    detail = body.error?.message ?? '';
  } catch {
    detail = '';
  }
  if (response.status === 401 || response.status === 403) {
    return new ProviderError(
      'The AI provider rejected the server credentials. Check AI_API_KEY in your deployment environment.',
      'provider_auth_failed',
      502,
    );
  }
  if (response.status === 429) {
    return new ProviderError(
      'The AI provider rate-limited this request. Wait a moment and retry.',
      'provider_rate_limited',
      429,
      true,
    );
  }
  if (response.status === 400 && /context|token/i.test(detail)) {
    return new ProviderError(
      'The request was too large for the configured model. Reduce the context you sent and retry.',
      'context_too_large',
      413,
    );
  }
  return new ProviderError(
    `The AI provider returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}.`,
    'provider_error',
    502,
    response.status >= 500,
  );
}

export function statusPayload() {
  const config = readProviderConfig();
  return {
    ok: true,
    ai: {
      configured: config.configured,
      provider: config.configured ? config.provider : null,
      model: config.configured ? config.model : null,
      mock: config.provider === 'mock',
      reason: config.missingReason ?? null,
    },
    trends: trendProviderStatus(),
  };
}

export function trendProviderStatus() {
  const url = process.env.TREND_PROVIDER_URL;
  const name = process.env.TREND_PROVIDER_NAME ?? 'Configured trend provider';
  if (!url) {
    return {
      configured: false,
      provider: null,
      reason:
        'No trend provider is configured. Live trend data is unavailable, so muse-ician shows evergreen creative guidance only and does not invent trending formats, sounds or hashtags.',
    };
  }
  return { configured: true, provider: name, reason: null };
}
