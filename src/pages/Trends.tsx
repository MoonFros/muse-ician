import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  ComponentBar,
  EmptyState,
  InfoList,
  PageHeader,
  ScoreMeter,
  SectionCard,
} from '../components/ui/primitives';
import { Select, TextArea, TextInput } from '../components/ui/forms';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { PLATFORMS, PLATFORM_LABELS, SCHEMA_VERSION, TREND_CONFIDENCE, type Platform, type TrendConfidence } from '../lib/types';
import { EVERGREEN_GUIDANCE, assessTrendOpportunity, trendFreshness, trendPlatformLabel } from '../lib/trends';
import { fetchLiveTrends, isAbortError } from '../services/apiClient';
import { formatShortDate, newId, nowIso, relativeTime, toDateKey, truncate } from '../lib/utils';

interface TrendDraft {
  name: string;
  platform: Platform;
  description: string;
  source_name: string;
  source_url: string;
  observed_at: string;
  evidence: string;
  keywords: string;
  confidence: TrendConfidence;
  relevance_notes: string;
  suggested_adaptation: string;
}

const EMPTY_DRAFT: TrendDraft = {
  name: '',
  platform: 'instagram-reels',
  description: '',
  source_name: '',
  source_url: '',
  observed_at: toDateKey(),
  evidence: '',
  keywords: '',
  confidence: 'low',
  relevance_notes: '',
  suggested_adaptation: '',
};

export default function TrendsPage() {
  const { data, preferences, integrations, upsertTrends, removeTrends, refreshIntegrations } = useWorkspace();
  const { toast } = useToast();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<TrendDraft>(EMPTY_DRAFT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trends = useMemo(
    () => [...data.trends].sort((a, b) => (b.observed_at ?? '').localeCompare(a.observed_at ?? '')),
    [data.trends],
  );
  const selected = trends.find((trend) => trend.id === selectedId) ?? trends[0] ?? null;

  const assessment = useMemo(() => {
    if (!selected) return null;
    const song = data.songs.find((item) => item.id === selected.song_id) ?? null;
    return assessTrendOpportunity(selected, { song, preferences });
  }, [data.songs, preferences, selected]);

  useEffect(() => {
    const first = trends[0];
    if (first && !selectedId) setSelectedId(first.id);
  }, [selectedId, trends]);

  const runFetch = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const result = await fetchLiveTrends();
      if (!result.trends.length) {
        setFetchError(
          'The trend provider returned no records. muse-ician will not fill the gap with invented trends — add a record manually if you observed something yourself.',
        );
        return;
      }
      const records = result.trends.map((trend) => ({
        ...trend,
        is_demo: false,
        created_at: trend.created_at ?? nowIso(),
      }));
      await upsertTrends(records);
      toast('Trend records saved', {
        tone: 'success',
        description: `${records.length} record(s) from ${result.provider ?? 'your provider'}, each keeping its source and timestamp.`,
      });
      await refreshIntegrations(true);
    } catch (error) {
      if (isAbortError(error)) return;
      setFetchError(error instanceof Error ? error.message : 'The trend request failed.');
    } finally {
      setFetching(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || !draft.source_name.trim() || !draft.evidence.trim()) {
      toast('Name, source and evidence are required', {
        tone: 'error',
        description: 'A trend record without attributed evidence cannot be assessed.',
      });
      return;
    }
    setSaving(true);
    try {
      await upsertTrends([
        {
          id: newId('trend'),
          name: draft.name.trim(),
          platform: draft.platform,
          description: draft.description.trim(),
          source_name: draft.source_name.trim(),
          source_url: draft.source_url.trim() || null,
          source_timestamp: draft.observed_at,
          observed_at: draft.observed_at,
          geography: null,
          keywords: draft.keywords
            .split(',')
            .map((word) => word.trim())
            .filter(Boolean),
          evidence: draft.evidence.trim(),
          song_id: null,
          relevance_notes: draft.relevance_notes.trim() || null,
          suggested_adaptation: draft.suggested_adaptation.trim() || null,
          confidence: draft.confidence,
          review_date: null,
          is_demo: false,
          created_at: nowIso(),
          schema_version: SCHEMA_VERSION,
        },
      ]);
      toast('Trend record saved', {
        tone: 'success',
        description: 'Stored locally with its source and observation date so it can be re-checked.',
      });
      setDraft(EMPTY_DRAFT);
      setDraftOpen(false);
    } catch (error) {
      toast('The record could not be saved', {
        tone: 'error',
        description: error instanceof Error ? error.message : 'Browser storage rejected the write.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Trend check"
        title="Only assess what you can attribute"
        description="muse-ician stores trend records with a named source, a date and the evidence you actually observed. Without those, the opportunity score stays unavailable rather than inventing a number."
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => setDraftOpen(true)}>
              <Icon name="plus" size={15} />
              Record a trend
            </button>
            {integrations?.trends.configured ? (
              <button type="button" className="btn-secondary" onClick={runFetch} disabled={fetching}>
                <Icon name="refresh" size={15} />
                {fetching ? 'Fetching…' : 'Fetch permitted data'}
              </button>
            ) : null}
          </>
        }
      />

      {!integrations?.trends.configured ? (
        <Callout tone="info" title="No trend provider is configured">
          <p>
            {integrations?.trends.reason ??
              'Live trend research is optional. Set TREND_PROVIDER_URL (and TREND_PROVIDER_NAME/TOKEN) on the server to enable it.'}
          </p>
          <p className="mt-1">
            This page still works: record something you saw yourself, with the source and the date. muse-ician will score
            how well it fits your song and constraints — never how likely it is to go viral.
          </p>
        </Callout>
      ) : null}

      {fetchError ? (
        <Callout tone="warning" title="Nothing was fetched">
          <p>{fetchError}</p>
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <SectionCard
            title="Recorded trends"
            description="Your own observations and any provider results, newest first."
          >
            {trends.length === 0 ? (
              <EmptyState
                compact
                icon="spark"
                title="No trend records yet"
                description="Record a format, sound or topic you actually saw — with where you saw it and when."
                actions={
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setDraftOpen(true)}>
                    Add the first record
                  </button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {trends.map((trend) => {
                  const freshness = trendFreshness(trend);
                  const active = selected?.id === trend.id;
                  return (
                    <li key={trend.id}>
                      <div
                        className={`rounded-xl border transition-colors ${
                          active ? 'border-accent/40 bg-accent-dim/20' : 'border-white/[0.07] bg-white/[0.025]'
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full px-3.5 py-3 text-left"
                          onClick={() => setSelectedId(trend.id)}
                          aria-pressed={active}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-text">{trend.name}</span>
                            <span className="chip">{trendPlatformLabel(trend.platform)}</span>
                            <span
                              className={`chip ${
                                freshness.level === 'fresh'
                                  ? 'border-ok/30 text-ok'
                                  : freshness.level === 'aging'
                                    ? 'border-warn/30 text-warn'
                                    : freshness.level === 'stale'
                                      ? 'border-danger/30 text-danger'
                                      : 'border-white/[0.10] text-slate-faint'
                              }`}
                            >
                              {freshness.level === 'unknown' ? 'No date' : `${freshness.days}d old`}
                            </span>
                            <span className="chip border-white/[0.10] text-slate-faint">{trend.confidence} confidence</span>
                          </span>
                          <span className="mt-1 block text-2xs text-slate-faint">
                            Source: {trend.source_name} · observed {formatShortDate(trend.observed_at)} · added{' '}
                            {relativeTime(trend.created_at)}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-muted">
                            {truncate(trend.evidence, 180)}
                          </span>
                        </button>
                        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-3.5 py-2">
                          {trend.source_url ? (
                            <a
                              href={trend.source_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="btn-ghost btn-sm"
                            >
                              <Icon name="external" size={13} />
                              Open source
                            </a>
                          ) : (
                            <span className="text-2xs text-slate-faint">No source URL recorded</span>
                          )}
                          <button
                            type="button"
                            className="btn-ghost btn-sm ml-auto text-danger"
                            onClick={() => setConfirmDelete(trend.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Evergreen guidance"
            description="Independent of any trend feed. These are craft principles, not data."
          >
            <ul className="space-y-2.5">
              {EVERGREEN_GUIDANCE.map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-medium text-slate-text">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-4">
          {selected && assessment ? (
            <SectionCard title="Trend opportunity" description={truncate(selected.name, 60)}>
              {assessment.available ? (
                <>
                  <ScoreMeter
                    score={assessment.score}
                    label="Opportunity"
                    caption={`${assessment.confidence} confidence in the underlying record`}
                  />
                  <div className="mt-4 space-y-2.5">
                    {assessment.components.map((component) => (
                      <ComponentBar
                        key={component.key}
                        label={component.label}
                        score={component.score}
                        explanation={component.explanation}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Callout tone="warning" title="Assessment unavailable">
                  {assessment.reason}
                </Callout>
              )}
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-2xs leading-relaxed text-slate-faint">
                {assessment.disclaimer}
              </p>
              <div className="mt-3 space-y-2">
                <InfoList
                  columns={1}
                  items={[
                    { label: 'Freshness', value: assessment.freshness.label },
                    { label: 'Evidence', value: selected.evidence },
                    {
                      label: 'Suggested adaptation',
                      value: selected.suggested_adaptation ?? 'Decide how you would make it yours before filming.',
                    },
                  ]}
                />
                <Link to="/library?pick=1" className="btn-secondary btn-sm">
                  <Icon name="library" size={13} />
                  Pick a preset to adapt
                </Link>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Trend opportunity">
              <p className="text-sm text-slate-muted">
                Select a record to see how well it fits your song and constraints. Without recent, attributed evidence no
                score is produced.
              </p>
            </SectionCard>
          )}

          <SectionCard title="What this score is not">
            <ul className="space-y-1.5 text-2xs leading-relaxed text-slate-muted">
              <li>• Not a prediction of views, reach or virality.</li>
              <li>• Not a live trend feed unless you configured a provider.</li>
              <li>• Not a substitute for your own judgement about your audience.</li>
              <li>• Records older than 45 days are treated as historical and score nothing.</li>
            </ul>
          </SectionCard>
        </div>
      </div>

      <Modal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        title="Record a trend you observed"
        description="Only record what you actually saw, and say where you saw it. This becomes evidence, not a guess."
        size="lg"
        busy={saving}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDraftOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={saveDraft} disabled={saving}>
              {saving ? 'Saving…' : 'Save record'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Trend name"
              required
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Spotify-wrapped style recaps"
            />
            <Select
              label="Platform"
              value={draft.platform}
              onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value as Platform }))}
              options={PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
            />
          </div>
          <TextArea
            label="Description"
            rows={2}
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="What the format actually is."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Where you saw it"
              required
              value={draft.source_name}
              onChange={(event) => setDraft((current) => ({ ...current, source_name: event.target.value }))}
              placeholder="e.g. three creators on my own For You page"
              hint="A named source makes the record reviewable. Never write “the algorithm”."
            />
            <TextInput
              label="Source link"
              type="url"
              value={draft.source_url}
              onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))}
              placeholder="https://"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Observed on"
              type="date"
              value={draft.observed_at}
              onChange={(event) => setDraft((current) => ({ ...current, observed_at: event.target.value }))}
              hint="Records older than 45 days stop being scoreable."
            />
            <Select
              label="Confidence"
              value={draft.confidence}
              onChange={(event) =>
                setDraft((current) => ({ ...current, confidence: event.target.value as TrendConfidence }))
              }
              options={TREND_CONFIDENCE.map((value) => ({ value, label: value }))}
              hint="Low confidence is honest when you saw it once."
            />
          </div>
          <TextArea
            label="Evidence"
            required
            rows={3}
            value={draft.evidence}
            onChange={(event) => setDraft((current) => ({ ...current, evidence: event.target.value }))}
            placeholder="e.g. Saw 4 creators in my niche using the same POV caption format between Monday and Wednesday."
          />
          <TextInput
            label="Keywords"
            value={draft.keywords}
            onChange={(event) => setDraft((current) => ({ ...current, keywords: event.target.value }))}
            placeholder="pov, indie pop, lyric reveal"
            hint="Comma separated. Used to match against your song's genre, moods and themes."
          />
          <TextArea
            label="How you could adapt it without losing your identity"
            rows={2}
            value={draft.suggested_adaptation}
            onChange={(event) => setDraft((current) => ({ ...current, suggested_adaptation: event.target.value }))}
          />
          <TextArea
            label="Why it fits (or does not fit) your song"
            rows={2}
            value={draft.relevance_notes}
            onChange={(event) => setDraft((current) => ({ ...current, relevance_notes: event.target.value }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this trend record?"
        description={<p>The evidence, source and assessment inputs will be removed from this browser.</p>}
        confirmLabel="Delete record"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const id = confirmDelete;
          setConfirmDelete(null);
          if (!id) return;
          await removeTrends([id]);
          toast('Trend record deleted', { tone: 'success' });
        }}
      />
    </div>
  );
}
