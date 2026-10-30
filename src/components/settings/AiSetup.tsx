import { useState } from 'react';
import { useWorkspace } from '../../state/workspace';
import { useToast } from '../ui/Toast';
import { Icon } from '../ui/Icons';
import { Callout, CopyButton, SectionCard } from '../ui/primitives';
import { runOperation, ApiError } from '../../services/apiClient';

/**
 * OpenAI setup guide.
 *
 * The key never touches the browser: this panel documents the two environment
 * variables the serverless function reads and, crucially, can test the live
 * connection so "configured" is never just a claim on a settings screen.
 */

const SAMPLE_ENV = `AI_PROVIDER=openai
AI_API_KEY=sk-...your-key...
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=30000`;

const MODEL_ROWS = [
  { model: 'gpt-4o-mini', note: 'Cheapest sensible default. Good enough for coaching notes and captions.' },
  { model: 'gpt-4.1-mini', note: 'Slightly stronger reasoning, still inexpensive.' },
  { model: 'gpt-4o', note: 'Best quality here; only worth it if you review ideas often.' },
  { model: 'o4-mini', note: 'Reasoning model. Slower; raise AI_TIMEOUT_MS to 60000 if you use it.' },
];

export function AiSetup() {
  const { integrations, refreshIntegrations, integrationsLoading } = useWorkspace();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const configured = Boolean(integrations?.ai.configured);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await runOperation<Record<string, unknown>>(
        'evaluate-concept',
        {
          idea: {
            title: 'Connection test',
            hook: 'A two-line test idea used to verify the AI provider is reachable.',
            concept_description: 'Short test payload. Nothing is saved from this call.',
            platforms: ['instagram-reels'],
          },
          request: { focus: 'connection test' },
        },
        { signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined },
      );
      setTestResult({
        ok: true,
        message: `The provider answered${result.meta?.model ? ` using ${result.meta.model}` : ''}. Response validated against the app schema.`,
      });
      toast('AI connection works', { tone: 'success' });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const message =
        apiError?.message ??
        (error instanceof Error ? error.message : 'The provider could not be reached.');
      setTestResult({ ok: false, message });
      toast('AI connection failed', { tone: 'error', description: message });
    } finally {
      setTesting(false);
      void refreshIntegrations(true);
    }
  };

  return (
    <SectionCard
      title="Connect OpenAI (or any compatible provider)"
      description="Keys live in server environment variables only. The browser never sees them."
      actions={
        <>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => void refreshIntegrations(true)}
            disabled={integrationsLoading}
          >
            <Icon name="refresh" size={13} />
            {integrationsLoading ? 'Checking…' : 'Re-check'}
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={testConnection}
            disabled={testing || !configured}
            title={configured ? 'Send a tiny test request' : 'Configure a key first'}
          >
            <Icon name="spark" size={13} />
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-text">Status</p>
            <span className={`chip ${configured ? 'chip-ok' : 'border-white/[0.10] text-slate-faint'}`}>
              {configured ? (integrations?.ai.mock ? 'mock provider' : 'configured') : 'not configured'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-muted">
            {configured
              ? `Provider ${integrations?.ai.provider ?? 'unknown'}${integrations?.ai.model ? ` · model ${integrations.ai.model}` : ''}.`
              : (integrations?.ai.reason ??
                'Add AI_API_KEY to your deployment environment, then redeploy. Until then every AI button explains that it is off.')}
          </p>
          {testResult ? (
            <p className={`mt-2 text-2xs leading-relaxed ${testResult.ok ? 'text-ok' : 'text-danger'}`}>
              {testResult.ok ? '✓ ' : '✕ '}
              {testResult.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-slate-faint">1 · Get a key</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              Create a key at platform.openai.com. A free-tier or low-budget key works: every AI action here is a single
              short request, and nothing runs unless you press a button.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-slate-faint">2 · Add two variables</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              In Vercel: Project → Settings → Environment Variables. Locally: a <span className="font-mono">.env</span>{' '}
              file at the repo root. Add them to Production <em>and</em> Preview.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-slate-faint">Environment</p>
            <CopyButton text={SAMPLE_ENV} label="Copy" className="btn-ghost btn-sm" />
          </div>
          <pre className="mt-2 overflow-x-auto whitespace-pre font-mono text-2xs leading-relaxed text-slate-text scroll-thin">
            {SAMPLE_ENV}
          </pre>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-slate-faint">Suggested models</p>
          <ul className="mt-1.5 space-y-1">
            {MODEL_ROWS.map((row) => (
              <li key={row.model} className="flex flex-wrap items-baseline gap-2 text-2xs leading-relaxed">
                <span className="font-mono text-slate-text">{row.model}</span>
                <span className="text-slate-muted">{row.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <Callout tone="neutral" title="Why the key cannot be entered in this app">
          Anything typed into a browser field is readable by anyone with access to that browser, and this app ships as
          static files. Environment variables keep the key on the server, where only your deployment can read it. If you
          need to change providers, change the variables and redeploy — no code change required.
        </Callout>

        <p className="text-2xs leading-relaxed text-slate-faint">
          Common failures: 503 <span className="font-mono">not_configured</span> means the variable is missing in that
          environment; 401/403 means the key is wrong or has no credit; 429 means the provider rate-limited you; 504 means
          the model took too long — raise <span className="font-mono">AI_TIMEOUT_MS</span>. The app keeps working in every
          one of those cases.
        </p>
      </div>
    </SectionCard>
  );
}
