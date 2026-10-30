import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  ComponentBar,
  CopyButton,
  EmptyState,
  PageHeader,
  ScoreMeter,
  SectionCard,
  SegmentedControl,
  StatusBadge,
} from '../components/ui/primitives';
import { ChoiceChips, Field, Select, TextArea, TextInput } from '../components/ui/forms';
import { ConfirmDialog } from '../components/ui/Modal';
import type { ContentIdea, CoachAssessment, Platform, WorkflowStatus } from '../lib/types';
import {
  PLATFORMS,
  PLATFORM_LABELS,
  SCHEMA_VERSION,
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
} from '../lib/types';
import { RUBRIC_DEFINITION, buildLocalAssessment, scoreIdea } from '../lib/analysis';
import { applySnapshot, buildIdea, makeVersion } from '../lib/ideas';
import { ideaContext } from '../lib/aiContext';
import { parseCoachAssessment, describeAiError } from '../lib/aiSchemas';
import { runOperation, isAbortError } from '../services/apiClient';
import { newId, nowIso, parseNumberInput, relativeTime, truncate } from '../lib/utils';
import { scoreLatestVersion } from '../lib/history';
import { VariantLab } from '../components/idea/VariantLab';
import { ReusePanel } from '../components/idea/ReusePanel';
import { ReadinessHistory } from '../components/idea/ReadinessHistory';

interface Draft {
  title: string;
  songId: string;
  concept: string;
  hook: string;
  audience: string;
  scenes: string;
  shots: string;
  overlays: string;
  audio: string;
  editing: string;
  cta: string;
  notes: string;
  platforms: Platform[];
  status: WorkflowStatus;
  scheduledDate: string;
  campaignId: string;
  estimatedMinutes: string;
}

function draftFrom(idea: ContentIdea): Draft {
  return {
    title: idea.title,
    songId: idea.song_id ?? '',
    concept: idea.concept_description,
    hook: idea.hook,
    audience: idea.intended_audience ?? '',
    scenes: (idea.scene_sequence ?? []).join('\n'),
    shots: (idea.shot_list ?? []).join('\n'),
    overlays: (idea.on_screen_text ?? []).join('\n'),
    audio: idea.audio_section ?? '',
    editing: idea.editing_notes ?? '',
    cta: idea.call_to_action ?? '',
    notes: idea.notes ?? '',
    platforms: idea.platforms ?? [],
    status: idea.status,
    scheduledDate: idea.scheduled_date ?? '',
    campaignId: idea.campaign_id ?? '',
    estimatedMinutes: idea.estimated_production_minutes ? String(idea.estimated_production_minutes) : '',
  };
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function LinesEditor({
  label,
  value,
  onChange,
  hint,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
}) {
  const count = lines(value).length;
  return (
    <Field label={label} hint={hint ?? `${count} line${count === 1 ? '' : 's'} · one item per line`}>
      <textarea
        className="input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export default function IdeaWorkspacePage() {
  const { ideaId } = useParams();
  const { data, upsertIdeas, removeIdeas } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as 'plan' | 'coach' | 'variants' | 'reuse' | 'versions') ?? 'plan';

  const idea = data.content_ideas.find((item) => item.id === ideaId) ?? null;
  const song = useMemo(() => data.songs.find((item) => item.id === idea?.song_id) ?? null, [data.songs, idea?.song_id]);
  const preset = useMemo(
    () => data.presets.find((item) => item.id === idea?.source_preset_id) ?? null,
    [data.presets, idea?.source_preset_id],
  );

  const integration = useIntegration();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(idea ?? fallbackIdea()));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<CoachAssessment | null>(idea?.coach_assessment ?? null);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!idea) return;
    setDraft(draftFrom(idea));
    setAssessment(idea.coach_assessment ?? null);
    setDirty(false);
    setAiError(null);
    setAiState('idle');
  }, [idea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!idea) {
    return (
      <EmptyState
        icon="sparkle"
        title="Idea not found"
        description="This idea may have been deleted, or the link came from an import that was cancelled."
        actions={
          <Link to="/library" className="btn-primary btn-sm">
            Start from the library
          </Link>
        }
      />
    );
  }

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const draftIdea: ContentIdea = {
    ...idea,
    title: draft.title.trim() || 'Untitled idea',
    song_id: draft.songId || null,
    concept_description: draft.concept,
    hook: draft.hook,
    intended_audience: draft.audience,
    scene_sequence: lines(draft.scenes),
    shot_list: lines(draft.shots),
    on_screen_text: lines(draft.overlays),
    audio_section: draft.audio,
    editing_notes: draft.editing,
    call_to_action: draft.cta,
    notes: draft.notes,
    platforms: draft.platforms,
    status: draft.status,
    scheduled_date: draft.scheduledDate || null,
    campaign_id: draft.campaignId || null,
    estimated_production_minutes: parseNumberInput(draft.estimatedMinutes),
  };

  const localScore = scoreIdea({
    idea: draftIdea,
    preset,
    song: data.songs.find((item) => item.id === draftIdea.song_id) ?? null,
    preferences: data.preferences,
  });

  const save = async (options: { snapshot?: boolean; silent?: boolean } = {}) => {
    setSaving(true);
    try {
      const versions = options.snapshot === false ? idea.versions ?? [] : [makeVersion(idea, `Before edit — ${new Date().toLocaleString()}`), ...(idea.versions ?? [])].slice(0, 25);
      const next: ContentIdea = {
        ...draftIdea,
        coach_assessment: assessment ?? idea.coach_assessment ?? null,
        versions,
        updated_at: nowIso(),
        schema_version: SCHEMA_VERSION,
      };
      await upsertIdeas([next]);
      setDirty(false);
      if (!options.silent) {
        toast('Idea saved', {
          tone: 'success',
          description: options.snapshot === false ? 'Saved to this browser.' : 'A restore point was added in Versions.',
        });
      }
    } catch {
      toast('The idea could not be saved', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveAssessment = async (next: CoachAssessment) => {
    setAssessment(next);
    const withAssessment: ContentIdea = {
      ...draftIdea,
      coach_assessment: next,
      versions: scoreLatestVersion(
        [makeVersion(idea, 'Before assessment'), ...(idea.versions ?? [])].slice(0, 25),
        next.readiness.score,
        next.source,
      ),
      updated_at: nowIso(),
    };
    await upsertIdeas([withAssessment]);
    setDirty(false);
  };

  const runLocalReview = async () => {
    const next = buildLocalAssessment(
      draftIdea,
      preset,
      data.songs.find((item) => item.id === draftIdea.song_id) ?? null,
      data.preferences,
    );
    await saveAssessment(next);
    toast('Local review saved', {
      tone: 'success',
      description: 'This is a transparent rubric check, not an AI response.',
    });
  };

  const runAiReview = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setAiState('loading');
    setAiError(null);
    try {
      const result = await runOperation<Record<string, unknown>>(
        'evaluate-concept',
        ideaContext(
          draftIdea,
          data.songs.find((item) => item.id === draftIdea.song_id) ?? null,
          preset,
          data.preferences,
        ),
        { signal: controller.signal },
      );
      if (result.mock) {
        throw new Error(
          'The server is running the mock AI provider, which returns no real content. Configure a provider key to use AI review.',
        );
      }
      const parsed = parseCoachAssessment(result.data);
      await saveAssessment(parsed);
      toast('AI review saved', {
        tone: 'success',
        description: result.meta.model ? `Model: ${result.meta.model}.` : undefined,
      });
      setAiState('idle');
    } catch (error) {
      if (isAbortError(error)) {
        setAiState('idle');
        toast('AI review cancelled', { tone: 'info' });
        return;
      }
      setAiState('error');
      setAiError(describeAiError(error));
    } finally {
      abortRef.current = null;
    }
  };

  const deleteIdea = async () => {
    await removeIdeas([idea.id]);
    toast('Idea deleted', { tone: 'success' });
    navigate('/library');
  };

  const duplicate = async () => {
    const copy = buildIdea({
      preset,
      song,
      mode: idea.mode ?? 'from-scratch',
      title: `${idea.title} (copy)`,
      customization: idea.concept_description,
      hook: idea.hook,
      campaignId: idea.campaign_id ?? null,
      platforms: idea.platforms,
    });
    await upsertIdeas([copy]);
    toast('Idea duplicated', { tone: 'success' });
    navigate(`/ideas/${copy.id}`);
  };

  function appendCaptionToNotes(text: string) {
    const heading = 'Caption option — ' + new Date().toLocaleDateString();
    const next = [draft.notes, heading, text].filter(Boolean).join('\n\n');
    update('notes', next);
    toast('Caption saved into notes', { tone: 'success', description: 'Save the idea to keep it.' });
  }

  const aiConfigured = Boolean(integration.ai.configured);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Idea workspace"
        breadcrumbs={[
          { label: 'Idea Library', to: '/library' },
          ...(preset ? [{ label: preset.title, to: `/library/${preset.id}` }] : []),
          { label: truncate(idea.title, 40) },
        ]}
        title={draft.title || 'Untitled idea'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={draft.status} />
            {song ? (
              <Link to={`/songs/${song.id}`} className="chip-accent">
                <Icon name="song" size={11} />
                {song.title}
              </Link>
            ) : (
              <span className="chip border-warn/30 text-warn">No song linked</span>
            )}
            {preset ? (
              <Link to={`/library/${preset.id}`} className="chip">
                <Icon name="library" size={11} />
                {preset.title}
              </Link>
            ) : null}
            {dirty ? <span className="chip border-warn/30 text-warn">Unsaved changes</span> : null}
          </span>
        }
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => save()} disabled={saving || !dirty}>
              {saving ? 'Saving…' : dirty ? 'Save idea' : 'Saved'}
            </button>
            <Link to={`/metadata?idea=${idea.id}`} className="btn-secondary">
              <Icon name="tag" size={15} />
              Metadata Studio
            </Link>
            <button type="button" className="btn-icon" onClick={duplicate} title="Duplicate idea" aria-label="Duplicate idea">
              <Icon name="copy" size={16} />
            </button>
            <button
              type="button"
              className="btn-icon text-danger"
              onClick={() => setConfirmDelete(true)}
              title="Delete idea"
              aria-label="Delete idea"
            >
              <Icon name="trash" size={16} />
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          ariaLabel="Idea workspace sections"
          value={tab}
          onChange={(value) => setSearchParams(value === 'plan' ? {} : { tab: value })}
          options={[
            { value: 'plan', label: 'Plan', icon: 'edit' },
            { value: 'coach', label: 'Creative coach', icon: 'coach' },
            { value: 'variants', label: 'A/B variants', icon: 'spark' },
            { value: 'reuse', label: 'Reuse', icon: 'exchange' },
            { value: 'versions', label: 'Versions', icon: 'undo', count: (idea.versions ?? []).length },
          ]}
        />
        <div className="flex items-center gap-2 text-2xs text-slate-faint">
          <span>Local readiness {localScore.score}/100</span>
          <span>·</span>
          <span>Updated {relativeTime(idea.updated_at)}</span>
        </div>
      </div>

      {tab === 'plan' ? (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <SectionCard title="The idea" description="Everything here is editable and saved in this browser.">
              <div className="space-y-4">
                <TextInput label="Working title" value={draft.title} onChange={(event) => update('title', event.target.value)} />
                <Field label="Opening hook" hint="The first thing a viewer reads or hears. Be specific, not atmospheric.">
                  <TextArea
                    rows={2}
                    value={draft.hook}
                    onChange={(event) => update('hook', event.target.value)}
                    placeholder="POV: you are driving home and realise you are the one who changed"
                  />
                </Field>
                <Field label="Concept description" hint="What happens, in order. Keep your original direction even if the coach suggests changes.">
                  <TextArea
                    rows={6}
                    value={draft.concept}
                    onChange={(event) => update('concept', event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Intended audience" hint="Who should stop scrolling?">
                    <TextArea
                      rows={2}
                      value={draft.audience}
                      onChange={(event) => update('audience', event.target.value)}
                    />
                  </Field>
                  <Field label="Audio section" hint="Use a timestamp or a section label from the song.">
                    <TextArea rows={2} value={draft.audio} onChange={(event) => update('audio', event.target.value)} />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Execution">
              <div className="grid gap-4 sm:grid-cols-2">
                <LinesEditor
                  label="Scene sequence"
                  value={draft.scenes}
                  onChange={(value) => update('scenes', value)}
                  placeholder={'Empty hook on the wall\nSlow tilt to the coat\nCut to the vocal'}
                />
                <LinesEditor
                  label="Shot list"
                  value={draft.shots}
                  onChange={(value) => update('shots', value)}
                  placeholder={'Static wide\nInsert: coat\nClose-up: vocal'}
                />
                <LinesEditor
                  label="On-screen text"
                  value={draft.overlays}
                  onChange={(value) => update('overlays', value)}
                  rows={3}
                  placeholder="One text line per row"
                />
                <Field label="Editing and pacing">
                  <TextArea rows={3} value={draft.editing} onChange={(event) => update('editing', event.target.value)} />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Call to action">
                  <TextArea rows={2} value={draft.cta} onChange={(event) => update('cta', event.target.value)} />
                </Field>
                <Field label="Notes" hint="Private working notes. Not sent anywhere automatically.">
                  <TextArea rows={2} value={draft.notes} onChange={(event) => update('notes', event.target.value)} />
                </Field>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Status and scheduling">
              <div className="space-y-4">
                <Select
                  label="Workflow status"
                  value={draft.status}
                  onChange={(event) => update('status', event.target.value as WorkflowStatus)}
                  options={WORKFLOW_STATUSES.map((status) => ({ value: status, label: WORKFLOW_LABELS[status] }))}
                />
                <TextInput
                  label="Planned date"
                  type="date"
                  value={draft.scheduledDate}
                  onChange={(event) => update('scheduledDate', event.target.value)}
                  hint="Creates or updates nothing on the calendar by itself — add a planned post there."
                />
                <Select
                  label="Campaign"
                  placeholder="No campaign"
                  value={draft.campaignId}
                  onChange={(event) => update('campaignId', event.target.value)}
                  options={data.campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
                />
                <Select
                  label="Linked song"
                  placeholder="No song linked"
                  value={draft.songId}
                  onChange={(event) => update('songId', event.target.value)}
                  options={data.songs.map((item) => ({ value: item.id, label: item.title }))}
                />
                <TextInput
                  label="Estimated production minutes"
                  inputMode="numeric"
                  value={draft.estimatedMinutes}
                  onChange={(event) => update('estimatedMinutes', event.target.value)}
                />
                <ChoiceChips
                  label="Platforms"
                  options={PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
                  value={draft.platforms}
                  onChange={(value) => update('platforms', value)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Local readiness preview" description="Updates as you edit. Saved scores appear in Creative Coach.">
              <ScoreMeter
                score={localScore.score}
                caption={`${localScore.confidence} confidence · rubric ${localScore.rubric_version}`}
              />
              <div className="mt-4 space-y-2.5">
                {localScore.components.map((component) => (
                  <ComponentBar
                    key={component.key}
                    label={component.label}
                    score={component.score}
                    explanation={component.explanation}
                  />
                ))}
              </div>
              <p className="mt-3 text-2xs leading-relaxed text-slate-faint">{localScore.disclaimer}</p>
            </SectionCard>

            <SectionCard title="Source preset">
              {preset ? (
                <div className="space-y-2 text-xs text-slate-muted">
                  <Link to={`/library/${preset.id}`} className="text-sm text-slate-text hover:text-accent-soft">
                    {preset.title}
                  </Link>
                  <p className="leading-relaxed">{truncate(preset.summary, 160)}</p>
                  <p className="text-2xs text-slate-faint">
                    {preset.execution_steps.length} steps · {preset.shot_list.length} shots ·{' '}
                    {preset.common_mistakes?.length ?? 0} common mistakes
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-faint">
                  This idea did not come from a preset. You can still export it inside a campaign plan.
                </p>
              )}
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'coach' ? (
        <CoachTab
          idea={idea}
          draftIdea={draftIdea}
          assessment={assessment}
          localScore={localScore}
          aiConfigured={aiConfigured}
          aiState={aiState}
          aiError={aiError}
          onLocalReview={runLocalReview}
          onAiReview={runAiReview}
          onCancelAi={() => abortRef.current?.abort()}
          onAcceptImprovement={(text) => {
            update('notes', `${draft.notes ? `${draft.notes}\n` : ''}[Accepted suggestion] ${text}`);
            toast('Suggestion added to your notes', {
              tone: 'success',
              description: 'Your concept text was not replaced. Save when you are ready.',
            });
          }}
          onApplyRevised={(text) => {
            update('concept', text);
            toast('Revised concept applied', {
              tone: 'success',
              description: 'The previous version is kept in Versions after you save.',
            });
          }}
          onClearAssessment={async () => {
            setAssessment(null);
            await upsertIdeas([{ ...idea, coach_assessment: null, updated_at: nowIso() }]);
            toast('Assessment cleared', { tone: 'success' });
          }}
          draftDirty={dirty}
          songTitle={song?.title ?? null}
        />
      ) : null}

      {tab === 'variants' ? (
        <div className="space-y-4">
          <VariantLab
            idea={draftIdea}
            song={song}
            preset={preset}
            onUseHook={(text) => {
              update('hook', text);
              toast('Hook updated in the editor', {
                tone: 'success',
                description: 'Save the idea to keep it. The previous version stays in Versions after you save.',
              });
            }}
            onUseCaption={appendCaptionToNotes}
          />
          <ReadinessHistory idea={idea} />
        </div>
      ) : null}

      {tab === 'reuse' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ReusePanel idea={draftIdea} song={song} preset={preset} />
          <div className="space-y-4">
            <SectionCard title="How to reuse without repeating yourself" description="Three rules that keep reposts from feeling like spam.">
              <ul className="space-y-2 text-sm leading-relaxed text-slate-muted">
                <li>
                  <span className="text-slate-text">Change the frame, not the footage.</span> A carousel asks for a swipe,
                  a Story asks for a tap — the same clip can serve both if the words change.
                </li>
                <li>
                  <span className="text-slate-text">Space it out.</span> Wait at least a week before the same clip
                  reappears on the same platform.
                </li>
                <li>
                  <span className="text-slate-text">Log it separately.</span> Record a result for each surface so your
                  comparatives stay honest.
                </li>
              </ul>
            </SectionCard>
            <ReadinessHistory idea={idea} />
          </div>
        </div>
      ) : null}

      {tab === 'versions' ? (
        <SectionCard
          title="Saved versions"
          description={`${(idea.versions ?? []).length} restore points · the last 25 are kept`}
          actions={
            <button type="button" className="btn-secondary btn-sm" onClick={() => save({ snapshot: true })} disabled={saving}>
              Save a restore point
            </button>
          }
        >
          {(idea.versions ?? []).length ? (
            <ul className="divide-y divide-ink-700/60">
              {idea.versions!.map((version) => (
                <li key={version.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-text">{version.label}</p>
                    <p className="text-2xs text-slate-faint">
                      {new Date(version.created_at).toLocaleString()} · “{truncate(version.snapshot.title, 60)}”
                    </p>
                    <p className="mt-1 max-w-xl text-2xs leading-relaxed text-slate-muted">
                      {truncate(version.snapshot.hook || version.snapshot.concept_description, 160)}
                    </p>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setRestoreTarget(version.id)}>
                    <Icon name="undo" size={13} />
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon="undo"
              title="No versions yet"
              description="Each save adds a restore point so you can go back to an earlier direction."
            />
          )}
        </SectionCard>
      ) : null}

      {tab === 'versions' ? <ReadinessHistory idea={idea} /> : null}

      {dirty ? (
        <div className="sticky bottom-20 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warn/30 bg-white/[0.06] px-3.5 py-2.5 shadow-panel backdrop-blur lg:bottom-4">
          <p className="text-xs text-warn">You have unsaved changes.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setDraft(draftFrom(idea));
                setDirty(false);
              }}
            >
              Discard
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={() => save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save idea'}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this idea?"
        description={
          <p>
            “{idea.title}” and its saved versions will be removed from this browser. Metadata packages and performance
            records that reference it stay, but lose the link.
          </p>
        }
        confirmLabel="Delete idea"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteIdea}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore this version?"
        description={
          <p>
            The current content will be saved as a new restore point first, then replaced with the version you chose.
            Nothing is lost.
          </p>
        }
        confirmLabel="Restore version"
        onCancel={() => setRestoreTarget(null)}
        onConfirm={async () => {
          const version = (idea.versions ?? []).find((item) => item.id === restoreTarget);
          setRestoreTarget(null);
          if (!version) return;
          const restored = applySnapshot(idea, version.snapshot);
          const next: ContentIdea = {
            ...restored,
            versions: [makeVersion(idea, `Before restoring “${version.label}”`), ...(idea.versions ?? [])].slice(0, 25),
            updated_at: nowIso(),
          };
          await upsertIdeas([next]);
          setDraft(draftFrom(next));
          setDirty(false);
          toast('Version restored', { tone: 'success' });
        }}
      />
    </div>
  );
}

function fallbackIdea(): ContentIdea {
  const now = nowIso();
  return {
    id: newId('idea'),
    title: '',
    concept_description: '',
    hook: '',
    status: 'idea',
    created_at: now,
    updated_at: now,
  };
}

function useIntegration() {
  // Kept as a tiny hook so the coach tab can read integration state without prop drilling.
  const { integrations } = useWorkspace();
  return integrations ?? { ai: { configured: false, mock: false, provider: null, model: null, reason: null }, trends: { configured: false, provider: null, reason: null }, reachable: false, checkedAt: '' };
}

function CoachTab({
  idea,
  draftIdea,
  assessment,
  localScore,
  aiConfigured,
  aiState,
  aiError,
  onLocalReview,
  onAiReview,
  onCancelAi,
  onAcceptImprovement,
  onApplyRevised,
  onClearAssessment,
  draftDirty,
  songTitle,
}: {
  idea: ContentIdea;
  draftIdea: ContentIdea;
  assessment: CoachAssessment | null;
  localScore: ReturnType<typeof scoreIdea>;
  aiConfigured: boolean;
  aiState: 'idle' | 'loading' | 'error';
  aiError: string | null;
  onLocalReview: () => Promise<void>;
  onAiReview: () => Promise<void>;
  onCancelAi: () => void;
  onAcceptImprovement: (text: string) => void;
  onApplyRevised: (text: string) => void;
  onClearAssessment: () => Promise<void>;
  draftDirty: boolean;
  songTitle: string | null;
}) {
  const [showRubric, setShowRubric] = useState(false);
  const { integrations } = useWorkspace();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <SectionCard
          title="Readiness score"
          description={
            assessment
              ? `${assessment.source === 'ai' ? 'AI assessment' : 'Local heuristic'} · ${new Date(assessment.generated_at).toLocaleString()}`
              : 'Not assessed yet'
          }
        >
          <ScoreMeter
            score={assessment?.readiness.score ?? localScore.score}
            caption={
              assessment
                ? `${assessment.readiness.confidence} confidence · rubric ${assessment.readiness.rubric_version}`
                : `${localScore.confidence} confidence · live preview from the current saved idea`
            }
          />
          <div className="mt-4 space-y-2.5">
            {(assessment?.readiness.components ?? localScore.components).map((component) => (
              <ComponentBar
                key={component.key}
                label={component.label}
                score={component.score}
                explanation={component.explanation}
              />
            ))}
          </div>
          <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
            {assessment?.readiness.disclaimer ?? localScore.disclaimer}
          </p>
          <button
            type="button"
            className="mt-3 rounded text-2xs text-accent-soft hover:underline"
            onClick={() => setShowRubric((value) => !value)}
            aria-expanded={showRubric}
          >
            {showRubric ? 'Hide rubric definition' : 'How is this scored?'}
          </button>
          {showRubric ? (
            <ul className="mt-2 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.025] p-3 text-2xs leading-relaxed text-slate-muted">
              {RUBRIC_DEFINITION.map((item) => (
                <li key={item.key}>
                  <span className="font-medium text-slate-text">
                    {item.label} ({Math.round(item.weight * 100)}%)
                  </span>
                  <br />
                  {item.description}
                </li>
              ))}
              <li className="text-slate-faint">
                Scores come from the fields you filled in. Missing information lowers confidence; it never adds points.
              </li>
            </ul>
          ) : null}
        </SectionCard>

        <SectionCard title="Run a review" description="Choose a transparent local check or an AI review when a provider is configured.">
          <div className="space-y-3">
            <button type="button" className="btn-secondary w-full justify-start" onClick={onLocalReview}>
              <Icon name="wave" size={15} />
              Run local review (no AI, no network)
            </button>
            <button
              type="button"
              className="btn-primary w-full justify-start"
              onClick={onAiReview}
              disabled={!aiConfigured || aiState === 'loading'}
            >
              <Icon name="sparkle" size={15} />
              {aiState === 'loading' ? 'Reviewing…' : 'Run AI review'}
            </button>
            {!aiConfigured ? (
              <Callout tone="neutral">
                AI review is unavailable because no provider is configured on the server. The local review works
                offline and uses the same rubric. See Settings → Integrations for setup.
              </Callout>
            ) : (
              <Callout tone="info" title="What will be sent">
                The pitch you are working on, the linked song’s title, themes, strongest lyrics, constraints and this
                idea’s fields. Nothing else from your workspace, and no full lyrics unless you added them to the
                strongest-lyrics list.
              </Callout>
            )}
            {aiState === 'loading' ? (
              <button type="button" className="btn-ghost btn-sm" onClick={onCancelAi}>
                Cancel request
              </button>
            ) : null}
            {aiError ? (
              <Callout tone="warning" title="The review failed">
                <p>{aiError}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={onAiReview}>
                    Retry
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={onLocalReview}>
                    Use local review instead
                  </button>
                </div>
              </Callout>
            ) : null}
            {draftDirty ? (
              <p className="text-2xs text-warn">You have unsaved edits — the review uses the fields as they are now.</p>
            ) : null}
            {assessment ? (
              <button type="button" className="btn-ghost btn-sm" onClick={onClearAssessment}>
                Clear saved assessment
              </button>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {!assessment ? (
        <EmptyState
          icon="coach"
          title="No assessment yet"
          description={
            <>
              Run a review to see strengths, weaknesses, hook feedback, pacing suggestions and a revised version that
              keeps your original intention{songTitle ? ` for “${songTitle}”` : ''}.
            </>
          }
          actions={
            <button type="button" className="btn-primary btn-sm" onClick={onLocalReview}>
              Run local review
            </button>
          }
        />
      ) : (
        <>
          <SectionCard
            title="Assessment"
            description={`${assessment.source === 'ai' ? 'AI-generated' : 'Local heuristic'} · ${new Date(
              assessment.generated_at,
            ).toLocaleString()}`}
            actions={
              <CopyButton
                label="Copy assessment"
                getText={() =>
                  [
                    `Summary: ${assessment.summary}`,
                    '',
                    'Strengths:',
                    ...assessment.strengths.map((item) => `- ${item}`),
                    '',
                    'Weaknesses:',
                    ...assessment.weaknesses.map((item) => `- ${item}`),
                    '',
                    `Hook: ${assessment.hook_assessment}`,
                    `Song fit: ${assessment.song_fit}`,
                    `Audience: ${assessment.audience_fit}`,
                    `Feasibility: ${assessment.feasibility}`,
                    '',
                    'Revised concept:',
                    assessment.revised_concept,
                  ].join('\n')
                }
              />
            }
          >
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-text">{assessment.summary}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-ok">What works</h4>
                  <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-muted">
                    {assessment.strengths.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <Icon name="check" size={13} className="mt-0.5 shrink-0 text-ok" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-warn">Weak or unclear</h4>
                  <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-slate-muted">
                    {assessment.weaknesses.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <Icon name="warning" size={13} className="mt-0.5 shrink-0 text-warn" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              ['Hook assessment', assessment.hook_assessment],
              ['Song fit', assessment.song_fit],
              ['Audience fit', assessment.audience_fit],
              ['Feasibility', assessment.feasibility],
            ].map(([label, body]) => (
              <SectionCard key={label} title={label}>
                <p className="text-sm leading-relaxed text-slate-muted">{body}</p>
              </SectionCard>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Pacing and visual progression">
              <ul className="space-y-2 text-sm leading-relaxed text-slate-muted">
                {assessment.pacing_suggestions.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Recommended platforms">
              <ul className="space-y-2 text-sm leading-relaxed text-slate-muted">
                {assessment.recommended_platforms.map((item) => (
                  <li key={item.platform}>
                    <span className="text-slate-text">{PLATFORM_LABELS[item.platform]}</span> — {item.reason}
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          <SectionCard
            title="Suggested improvements"
            description="Accept individual suggestions — you never have to replace the whole concept."
          >
            {assessment.improvements.length ? (
              <ul className="space-y-2">
                {assessment.improvements.map((improvement, index) => (
                  <li
                    key={`${improvement.area}-${index}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm text-slate-text">
                        {improvement.area}
                        <span
                          className={`chip ${
                            improvement.impact === 'high'
                              ? 'border-danger/30 text-danger'
                              : improvement.impact === 'medium'
                                ? 'border-warn/30 text-warn'
                                : 'border-white/[0.10] text-slate-faint'
                          }`}
                        >
                          {improvement.impact} impact
                        </span>
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-muted">{improvement.suggestion}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary btn-sm shrink-0"
                      onClick={() =>
                        onAcceptImprovement(`${improvement.area}: ${improvement.suggestion}`)
                      }
                    >
                      Accept into notes
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-faint">No specific improvements were returned.</p>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Revised version"
              description="Keeps your original intention; additions are explicit."
              actions={
                <>
                  <CopyButton text={assessment.revised_concept} label="Copy" />
                  <button type="button" className="btn-primary btn-sm" onClick={() => onApplyRevised(assessment.revised_concept)}>
                    Apply to concept
                  </button>
                </>
              }
            >
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-muted">{assessment.revised_concept}</p>
            </SectionCard>
            <SectionCard
              title="Alternative version"
              actions={assessment.alternative_concept ? <CopyButton text={assessment.alternative_concept} label="Copy" /> : undefined}
            >
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-muted">
                {assessment.alternative_concept ?? 'No alternative was suggested.'}
              </p>
            </SectionCard>
          </div>

          <SectionCard title="Next steps">
            <ol className="space-y-2 text-sm leading-relaxed text-slate-muted">
              {assessment.next_steps.map((step, index) => (
                <li key={index} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-2xs text-slate-faint">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/metadata?idea=${idea.id}`} className="btn-primary btn-sm">
                Build platform metadata
              </Link>
              <Link to="/calendar" className="btn-secondary btn-sm">
                Put it on a date
              </Link>
            </div>
          </SectionCard>
        </>
      )}

      {integrations?.ai.mock ? (
        <Callout tone="warning" title="Mock AI provider is enabled">
          The server is using AI_PROVIDER=mock, which returns no generated content. Reviews will fail validation by
          design, so nothing fake is saved.
        </Callout>
      ) : null}

      <p className="text-2xs leading-relaxed text-slate-faint">
        Readiness is an editorial checklist, not a forecast. {draftIdea.title ? `Idea: ${draftIdea.title}. ` : ''}
        Nothing here guarantees views, growth or virality.
      </p>
    </div>
  );
}
