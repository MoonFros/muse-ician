import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import { Callout, PageHeader, SectionCard } from '../components/ui/primitives';
import { Checkbox, ChoiceChips, Field, Select, TagListInput, TextArea, TextInput } from '../components/ui/forms';
import { ConfirmDialog } from '../components/ui/Modal';
import type { Budget, FilmingMethod, Platform, Tone, UserPreferences, WorkspaceData } from '../lib/types';
import {
  BUDGETS,
  FILMING_METHODS,
  PLATFORMS,
  PLATFORM_LABELS,
  SCHEMA_VERSION,
  TONES,
} from '../lib/types';
import { applyImportPlan, planImport } from '../lib/importPlan';
import { parseJsonSafely, validatePayload, MAX_IMPORT_BYTES } from '../lib/validation';
import { buildWorkspaceBackup, downloadPayload } from '../lib/interchange';
import { APP_VERSION } from '../lib/interchange';
import { SEED_PRESETS, SEED_PRESET_COUNT } from '../data/seedPresets';
import { pluralize, readFileText } from '../lib/utils';
import { AiSetup } from '../components/settings/AiSetup';
import { InstallCard } from '../components/pwa/InstallCard';

export default function SettingsPage() {
  const {
    data,
    storage,
    saveState,
    integrations,
    integrationsLoading,
    refreshIntegrations,
    updatePreferences,
    demoRecordCount,
    clearDemoData,
    addDemoData,
    resetWorkspace,
    applyImportedData,
    upsertPresets,
  } = useWorkspace();
  const { toast } = useToast();
  const [draft, setDraft] = useState<UserPreferences>(data.preferences);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    data: WorkspaceData;
    summary: string;
    counts: Record<string, number>;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(data.preferences);
    setDirty(false);
  }, [data.preferences]);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    await updatePreferences(draft);
    setDirty(false);
    toast('Preferences saved', { tone: 'success', description: 'Stored in this browser.' });
  };

  const restore = async (file: File | null | undefined) => {
    if (!file) return;
    setRestoreBusy(true);
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        toast('That file is too large to restore', { tone: 'error' });
        return;
      }
      const text = await readFileText(file);
      const parsed = parseJsonSafely(text);
      if (!parsed.ok) {
        toast('Restore failed', { tone: 'error', description: parsed.message });
        return;
      }
      const result = await validatePayload(parsed.value);
      if (!result.payload || result.fatal.length) {
        toast('Restore failed validation', {
          tone: 'error',
          description: result.fatal[0]?.message ?? 'No valid records were found. Nothing was changed.',
        });
        return;
      }
      const plan = planImport(result.payload, data, 'replace');
      const next = applyImportPlan(plan, data);
      setPendingRestore({
        data: next,
        summary: `${Object.values(plan.counts)
          .reduce((sum, counts) => sum + counts.adding + counts.replacing, 0)
          .toString()} records ready to restore`,
        counts: Object.fromEntries(
          Object.entries(plan.counts)
            .filter(([, counts]) => counts.incoming > 0)
            .map(([key, counts]) => [key, counts.adding + counts.replacing]),
        ),
      });
    } finally {
      setRestoreBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Profile, defaults and data ownership"
        description="Preferences shape recommendations and generated drafts. They are stored in this browser only."
        actions={
          <button type="button" className="btn-primary" onClick={save} disabled={!dirty}>
            {dirty ? 'Save preferences' : 'Saved'}
          </button>
        }
      />

      {saveState.status === 'error' ? (
        <Callout tone="warning" title="Saving is failing">
          {saveState.message}
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <SectionCard title="Artist profile">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Artist name"
                  value={draft.artist_name}
                  onChange={(event) => update('artist_name', event.target.value)}
                  placeholder="How you want to be credited"
                />
                <TextInput
                  label="Preferred language"
                  value={draft.language}
                  onChange={(event) => update('language', event.target.value)}
                  placeholder="e.g. English"
                />
              </div>
              <Field label="Persona" hint="How you present yourself in public. Used in metadata tone suggestions.">
                <TextArea
                  rows={3}
                  value={draft.persona}
                  onChange={(event) => update('persona', event.target.value)}
                  placeholder="Deadpan, specific, never posts motivational content…"
                />
              </Field>
              <Field label="Visual style">
                <TextArea
                  rows={2}
                  value={draft.visual_style}
                  onChange={(event) => update('visual_style', event.target.value)}
                  placeholder="Muted greens, film grain, empty rooms"
                />
              </Field>
              <TagListInput
                label="Preferred genres"
                value={draft.preferred_genres}
                onChange={(value) => update('preferred_genres', value)}
                placeholder="indie pop, r&b…"
              />
              <TagListInput
                label="Preferred moods"
                value={draft.preferred_moods}
                onChange={(value) => update('preferred_moods', value)}
                placeholder="melancholy, hopeful…"
              />
              <ChoiceChips
                label="Preferred platforms"
                options={PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
                value={draft.preferred_platforms}
                onChange={(value) => update('preferred_platforms', value as Platform[])}
              />
            </div>
          </SectionCard>

          <SectionCard title="Production defaults" description="Used for feasibility checks and local drafts.">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Budget"
                  placeholder="Not specified"
                  value={draft.budget ?? ''}
                  onChange={(event) => update('budget', (event.target.value || null) as Budget | null)}
                  options={BUDGETS.map((value) => ({ value, label: value }))}
                />
                <Select
                  label="Default metadata tone"
                  value={draft.default_tone}
                  onChange={(event) => update('default_tone', event.target.value as Tone)}
                  options={TONES.map((value) => ({ value, label: value }))}
                />
                <TextInput
                  label="Posting cadence (days between posts)"
                  inputMode="numeric"
                  value={String(draft.posting_cadence_days)}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value >= 1) update('posting_cadence_days', Math.min(60, Math.round(value)));
                  }}
                />
                <div className="flex items-end pb-1">
                  <Checkbox
                    label="Use local analysis by default"
                    hint="Local reviews and metadata templates work offline and never send data anywhere."
                    checked={draft.use_local_analysis}
                    onChange={(checked) => update('use_local_analysis', checked)}
                  />
                </div>
              </div>
              <TagListInput
                label="Equipment you actually have"
                value={draft.equipment}
                onChange={(value) => update('equipment', value)}
                placeholder="phone, phone-tripod, editing-software…"
              />
              <ChoiceChips
                label="Filming preferences"
                options={FILMING_METHODS}
                value={draft.filming_preferences}
                onChange={(value) => update('filming_preferences', value as FilmingMethod[])}
              />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Integrations"
            description="Optional. The app works fully without either."
            actions={
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => void refreshIntegrations(true)}
                disabled={integrationsLoading}
              >
                <Icon name="refresh" size={13} />
                {integrationsLoading ? 'Checking…' : 'Check again'}
              </button>
            }
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-text">AI provider</p>
                  <span className={`chip ${integrations?.ai.configured ? 'chip-ok' : 'border-white/[0.10] text-slate-faint'}`}>
                    {integrations?.ai.configured ? (integrations.ai.mock ? 'mock' : 'configured') : 'not configured'}
                  </span>
                </div>
                {integrations?.ai.configured ? (
                  <p className="mt-1 text-xs text-slate-muted">
                    Provider: {integrations.ai.provider}
                    {integrations.ai.model ? ` · model ${integrations.ai.model}` : ''}. Keys live only in server
                    environment variables.
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-slate-muted">
                    {integrations?.ai.reason ??
                      'Set AI_API_KEY (and optionally AI_PROVIDER, AI_MODEL, AI_BASE_URL) in your deployment environment. No key is ever exposed to the browser.'}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-text">Trend research</p>
                  <span className={`chip ${integrations?.trends.configured ? 'chip-ok' : 'border-white/[0.10] text-slate-faint'}`}>
                    {integrations?.trends.configured ? 'configured' : 'not configured'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-muted">
                  {integrations?.trends.reason ??
                    'A permitted trend provider is configured. Every record keeps its source and timestamp.'}
                </p>
                {!integrations?.trends.configured ? (
                  <p className="mt-1.5 text-2xs text-slate-faint">
                    muse-ician will not invent trending songs, hashtags or formats. Trend screens show evergreen guidance
                    only until a provider is configured.
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-2.5 text-2xs leading-relaxed text-slate-faint">
                <p className="font-medium text-slate-muted">Server environment variables</p>
                <p className="mt-1 font-mono">
                  AI_PROVIDER · AI_API_KEY · AI_MODEL · AI_BASE_URL · AI_TIMEOUT_MS · TREND_PROVIDER_URL ·
                  TREND_PROVIDER_TOKEN · TREND_PROVIDER_NAME
                </p>
                <p className="mt-1">
                  These are read by the serverless functions in <span className="font-mono">/api</span>. Nothing prefixed
                  with VITE_ is used for secrets.
                </p>
              </div>
            </div>
          </SectionCard>

          <AiSetup />

          <InstallCard />

          <SectionCard title="Data ownership" description="Everything below happens in this browser.">
            <div className="space-y-3">
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-faint">Storage backend</dt>
                  <dd className="text-slate-text">{storage.backend}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-faint">Storage healthy</dt>
                  <dd className={storage.available ? 'text-ok' : 'text-danger'}>
                    {storage.available ? 'yes' : 'no'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-faint">Survives reload</dt>
                  <dd className={storage.persistent ? 'text-slate-text' : 'text-warn'}>
                    {storage.persistent ? 'yes' : 'no — memory only'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-faint">Records stored</dt>
                  <dd className="text-slate-text">
                    {data.presets.length + data.songs.length + data.content_ideas.length + data.planned_posts.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-faint">Demo records</dt>
                  <dd className="text-slate-text">{demoRecordCount}</dd>
                </div>
              </dl>

              <Callout tone="info" title="This data belongs to this browser">
                It does not sync between devices and is not stored in a cloud account. Export a workspace backup
                regularly, especially before clearing site data.
              </Callout>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    const payload = buildWorkspaceBackup(data);
                    const name = downloadPayload(payload);
                    toast('Workspace exported', { tone: 'success', description: name });
                  }}
                >
                  <Icon name="download" size={13} />
                  Export backup
                </button>
                <label className="btn-secondary btn-sm cursor-pointer">
                  <Icon name="upload" size={13} />
                  {restoreBusy ? 'Reading…' : 'Restore backup'}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={(event) => void restore(event.target.files?.[0])}
                  />
                </label>
                <Link to="/import-export" className="btn-ghost btn-sm">
                  Import / Export
                </Link>
              </div>

              <div className="divider" />

              <div className="space-y-2">
                {demoRecordCount > 0 ? (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmDemo(true)}>
                    Remove {pluralize(demoRecordCount, 'demo record')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={async () => {
                      await addDemoData();
                      toast('Demo data added', { tone: 'success', description: 'Clearly labelled and removable here.' });
                    }}
                  >
                    Add demo data
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={async () => {
                    await upsertPresets(SEED_PRESETS.map((preset) => ({ ...preset })));
                    toast('Starter presets restored', {
                      tone: 'success',
                      description: `${SEED_PRESETS.length} presets re-added by id. Your own presets are untouched.`,
                    });
                  }}
                >
                  <Icon name="restore" size={13} />
                  Restore starter presets
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                  <Icon name="trash" size={13} />
                  Delete all local data
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="About">
            <dl className="space-y-2 text-xs">
              {[
                ['App version', APP_VERSION],
                ['Schema version', SCHEMA_VERSION],
                ['Starter presets', `${SEED_PRESETS.length}`],
                ['AI mode', integrations?.ai.configured ? (integrations.ai.mock ? 'mock provider' : 'configured') : 'local only'],
                ['Trend mode', integrations?.trends.configured ? 'provider configured' : 'unavailable (evergreen only)'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-slate-faint">{label}</dt>
                  <dd className="text-slate-text">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
              muse-ician plans and evaluates content. It does not publish to social platforms, edit videos, or claim to
              predict performance. Scores are editorial heuristics.
            </p>
            <p className="mt-2 text-2xs text-slate-faint">
              Privacy: lyrics, notes and workspace records stay in this browser. They are only sent to an AI provider
              when you press an AI action, and the prompt preview lists what is included.
            </p>
          </SectionCard>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <Checkbox
              label="Onboarding marked complete"
              hint="Turn this off to see the dashboard's first-run checklist again."
              checked={draft.onboarding_complete}
              onChange={(checked: boolean) => update('onboarding_complete', checked)}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        title="Restore this backup?"
        description={
          <>
            <p>{pendingRestore?.summary}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-faint">
              {pendingRestore
                ? Object.entries(pendingRestore.counts).map(([key, count]) => (
                    <li key={key}>
                      {key.replace(/_/g, ' ')}: {count}
                    </li>
                  ))
                : null}
            </ul>
            <p className="mt-2">Records with matching ids are replaced. Records only in your current workspace stay.</p>
          </>
        }
        confirmLabel="Restore backup"
        onCancel={() => setPendingRestore(null)}
        onConfirm={async () => {
          const pending = pendingRestore;
          setPendingRestore(null);
          if (!pending) return;
          try {
            await applyImportedData(pending.data);
            toast('Backup restored', { tone: 'success' });
          } catch {
            toast('Restore failed — your data was not changed', { tone: 'error' });
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete all local data?"
        description={
          <>
            <p>
              This removes every song, idea, campaign, metadata package and performance record from this browser, plus
              your preferences. The {SEED_PRESET_COUNT} starter presets are re-added.
            </p>
            <p className="text-danger">This cannot be undone. Export a backup first.</p>
          </>
        }
        confirmLabel="Delete everything"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await resetWorkspace();
          toast('Local workspace cleared', { tone: 'success', description: 'Starter presets were re-added.' });
        }}
      />

      <ConfirmDialog
        open={confirmDemo}
        title="Remove demo data?"
        description={<p>All {pluralize(demoRecordCount, 'sample record')} will be deleted. Your own records stay.</p>}
        confirmLabel="Remove demo data"
        tone="danger"
        onCancel={() => setConfirmDemo(false)}
        onConfirm={async () => {
          setConfirmDemo(false);
          await clearDemoData();
          toast('Demo data removed', { tone: 'success' });
        }}
      />
    </div>
  );
}
