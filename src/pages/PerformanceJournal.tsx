import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  SegmentedControl,
} from '../components/ui/primitives';
import { Select } from '../components/ui/forms';
import { ConfirmDialog } from '../components/ui/Modal';
import { PerformanceFormModal } from '../components/forms/PerformanceFormModal';
import type { PerformanceRecord } from '../lib/types';
import { PLATFORMS, PLATFORM_LABELS } from '../lib/types';
import {
  HOOK_CATEGORY_LABELS,
  performanceRelativeToBaseline,
  summarizePerformance,
  type PerformanceSummary,
} from '../lib/insights';
import { performanceContext } from '../lib/aiContext';
import { parsePerformanceSummary, describeAiError, type AiPerformanceSummary } from '../lib/aiSchemas';
import { runOperation, isAbortError } from '../services/apiClient';
import { buildPerformanceExport, downloadPayload, exportFilename } from '../lib/interchange';
import { ComparativesPanel } from '../components/journal/ComparativesPanel';
import { compactNumber, formatNumber, formatShortDate, pluralize } from '../lib/utils';

export default function PerformanceJournalPage() {
  const { data, removePerformance, integrations } = useWorkspace();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceRecord | null>(null);
  const [defaultIdeaId, setDefaultIdeaId] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [songFilter, setSongFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<PerformanceRecord | null>(null);
  const [aiSummary, setAiSummary] = useState<AiPerformanceSummary | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<'category' | 'platform' | 'song' | 'period'>('category');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const records = useMemo(
    () =>
      data.performance_records
        .filter((record) => (platformFilter ? record.platform === platformFilter : true))
        .filter((record) => (songFilter ? record.song_id === songFilter : true))
        .sort((a, b) => (b.published_on ?? b.created_at).localeCompare(a.published_on ?? a.created_at)),
    [data.performance_records, platformFilter, songFilter],
  );

  const summary: PerformanceSummary = useMemo(
    () => summarizePerformance(records, { ideas: data.content_ideas, presets: data.presets, songs: data.songs }),
    [data.content_ideas, data.presets, data.songs, records],
  );

  const runAiSummary = async () => {
    setAiState('loading');
    setAiError(null);
    try {
      const result = await runOperation<Record<string, unknown>>(
        'summarize-performance',
        performanceContext(summary, records),
        {},
      );
      if (result.mock) throw new Error('The mock AI provider returned no usable content.');
      setAiSummary(parsePerformanceSummary(result.data));
      setAiState('idle');
    } catch (error) {
      if (isAbortError(error)) {
        setAiState('idle');
        return;
      }
      setAiState('error');
      setAiError(describeAiError(error));
    }
  };

  const exportData = () => {
    if (!records.length) {
      toast('Nothing to export', { tone: 'error' });
      return;
    }
    const payload = buildPerformanceExport(records, data.songs, data.content_ideas);
    const name = downloadPayload(payload, exportFilename(payload, 'performance-snapshot'));
    toast('Snapshot exported', { tone: 'success', description: name });
  };

  const comparisonRows = {
    category: summary.byCategory,
    platform: summary.byPlatform,
    song: summary.bySong,
    period: summary.byPeriod,
  }[comparison];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Performance Journal"
        title="Results you recorded yourself"
        description="muse-ician cannot read platform analytics. These numbers are typed in by you, compared against your own history, and explained without claiming causation."
        actions={
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setDefaultIdeaId('');
                setFormOpen(true);
              }}
            >
              <Icon name="plus" size={15} />
              Log a result
            </button>
            <button type="button" className="btn-secondary" onClick={exportData}>
              <Icon name="download" size={15} />
              Export snapshot
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by platform"
          placeholder="All platforms"
          value={platformFilter}
          onChange={(event) => setPlatformFilter(event.target.value)}
          options={PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
          small
          className="w-40"
        />
        <Select
          aria-label="Filter by song"
          placeholder="All songs"
          value={songFilter}
          onChange={(event) => setSongFilter(event.target.value)}
          options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
          small
          className="w-44"
        />
        <span className="text-2xs text-slate-faint">
          {pluralize(records.length, 'record')} shown · baseline median{' '}
          {summary.baselineViews ? `${compactNumber(summary.baselineViews)} views` : 'not enough data'}
        </span>
      </div>

      {data.performance_records.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No results logged yet"
          description="Publish something, then copy the numbers from the platform’s analytics screen. Views, saves and completion rate are the most useful to start with."
          actions={
            <button type="button" className="btn-primary btn-sm" onClick={() => setFormOpen(true)}>
              Log your first result
            </button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <SectionCard title="What the data shows" description="Observed numbers are separated from possible explanations.">
              {summary.observations.length ? (
                <ul className="space-y-2.5">
                  {summary.observations.map((observation, index) => (
                    <li
                      key={index}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`chip ${
                            observation.kind === 'observed'
                              ? 'border-accent/30 text-accent-soft'
                              : 'border-warn/30 text-warn'
                          }`}
                        >
                          {observation.kind === 'observed' ? 'Observed' : 'Possible explanation'}
                        </span>
                        <span className="chip border-white/[0.10] text-slate-faint">
                          {observation.confidence} confidence
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-muted">{observation.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-muted">
                  Not enough records yet to say anything useful. Log at least five posts across two formats.
                </p>
              )}
              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-faint">Limits of this view</h3>
                <ul className="mt-1.5 space-y-1 text-2xs leading-relaxed text-slate-faint">
                  {summary.caveats.map((caveat) => (
                    <li key={caveat}>• {caveat}</li>
                  ))}
                </ul>
                {summary.missingData.length ? (
                  <p className="mt-2 text-2xs text-slate-faint">
                    Missing for richer comparisons: {summary.missingData.join(', ')}.
                  </p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Compare"
              description="Only your own recorded posts. Each platform counts views differently."
            >
              <SegmentedControl
                ariaLabel="Comparison grouping"
                value={comparison}
                onChange={setComparison}
                options={[
                  { value: 'category', label: 'Concept type' },
                  { value: 'platform', label: 'Platform' },
                  { value: 'song', label: 'Song' },
                  { value: 'period', label: 'Period' },
                ]}
              />
              {comparisonRows.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[22rem] text-left text-xs">
                    <thead>
                      <tr className="text-2xs uppercase tracking-wide text-slate-faint">
                        <th className="py-1.5 pr-2 font-medium">
                          {comparison === 'category'
                            ? 'Concept type'
                            : comparison === 'platform'
                              ? 'Platform'
                              : comparison === 'song'
                                ? 'Song'
                                : 'Month'}
                        </th>
                        <th className="py-1.5 pr-2 font-medium">Posts</th>
                        <th className="py-1.5 pr-2 font-medium">Median views</th>
                        <th className="py-1.5 pr-2 font-medium">Saves</th>
                        <th className="py-1.5 font-medium">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60">
                      {comparisonRows.map((row) => (
                        <tr key={row.key}>
                          <td className="py-2 pr-2 text-slate-text">
                            {comparison === 'category'
                              ? HOOK_CATEGORY_LABELS[row.key as keyof typeof HOOK_CATEGORY_LABELS] ?? row.label
                              : comparison === 'platform'
                                ? PLATFORM_LABELS[row.key as keyof typeof PLATFORM_LABELS] ?? row.label
                                : row.label}
                          </td>
                          <td className="py-2 pr-2 text-slate-muted">{row.posts}</td>
                          <td className="py-2 pr-2 text-slate-muted">{compactNumber(row.medianViews)}</td>
                          <td className="py-2 pr-2 text-slate-muted">{row.totalSaves}</td>
                          <td className="py-2 text-slate-muted">
                            {row.medianEngagementRate === null ? '—' : `${row.medianEngagementRate}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-faint">No grouped data yet for this view.</p>
              )}
              <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
                Engagement is (likes + comments + shares + saves) ÷ views, calculated per post then medianed. It is not
                the same as any platform’s own reported rate.
              </p>
            </SectionCard>
          </div>

          <SectionCard
            title="AI reading of these records"
            description="Optional. Sends the aggregated numbers and up to 40 records, nothing else."
            actions={
              <>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={runAiSummary}
                  disabled={!integrations?.ai.configured || aiState === 'loading'}
                >
                  <Icon name="sparkle" size={13} />
                  {aiState === 'loading' ? 'Analysing…' : 'Analyse with AI'}
                </button>
              </>
            }
          >
            {!integrations?.ai.configured ? (
              <p className="text-xs leading-relaxed text-slate-muted">
                No AI provider is configured. The comparisons above are computed locally and need no provider.
              </p>
            ) : null}
            {aiState === 'error' && aiError ? (
              <Callout tone="warning" title="The AI summary failed">
                <p>{aiError}</p>
                <button type="button" className="btn-secondary btn-sm mt-2" onClick={runAiSummary}>
                  Retry
                </button>
              </Callout>
            ) : null}
            {aiSummary ? (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {aiSummary.observations.map((observation, index) => (
                    <li key={index} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span
                        className={`chip ${
                          observation.kind === 'observed' ? 'border-accent/30 text-accent-soft' : 'border-warn/30 text-warn'
                        }`}
                      >
                        {observation.kind === 'observed' ? 'Observed' : 'Possible explanation'} ·{' '}
                        {observation.confidence}
                      </span>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-muted">{observation.text}</p>
                    </li>
                  ))}
                </ul>
                {aiSummary.caveats.length ? (
                  <div className="text-2xs text-slate-faint">
                    {aiSummary.caveats.map((caveat) => (
                      <p key={caveat}>• {caveat}</p>
                    ))}
                  </div>
                ) : null}
                {aiSummary.suggested_tests.length ? (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-text">Tests worth trying</h4>
                    <ul className="mt-1 space-y-1 text-xs text-slate-muted">
                      {aiSummary.suggested_tests.map((test, index) => (
                        <li key={index}>
                          <span className="text-slate-text">{test.hypothesis}</span> — {test.test}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : integrations?.ai.configured && aiState !== 'error' ? (
              <p className="text-xs text-slate-faint">
                Nothing analysed yet. This is a reading of your own hand-entered numbers, not platform analytics.
              </p>
            ) : null}
          </SectionCard>

          <ComparativesPanel />

          <SectionCard title="Records" description="Compare each post against your own median.">
            <ul className="divide-y divide-ink-700/60">
              {records.map((record) => {
                const relative = performanceRelativeToBaseline(record, summary.baselineViews);
                const idea = data.content_ideas.find((item) => item.id === record.content_idea_id);
                const song = data.songs.find((item) => item.id === record.song_id);
                return (
                  <li key={record.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-text">
                        {PLATFORM_LABELS[record.platform]}
                        <span
                          className={`chip ${
                            relative.tone === 'above'
                              ? 'border-ok/30 text-ok'
                              : relative.tone === 'below'
                                ? 'border-danger/30 text-danger'
                                : 'border-white/[0.10] text-slate-faint'
                          }`}
                        >
                          {relative.label}
                        </span>
                        {record.is_demo ? <span className="chip border-warn/30 text-warn">Demo</span> : null}
                      </p>
                      <p className="mt-0.5 text-2xs text-slate-faint">
                        {formatShortDate(record.published_on)} · {song?.title ?? 'No song linked'} ·{' '}
                        {idea ? idea.title : 'No idea linked'}
                      </p>
                      <p className="mt-1 text-xs text-slate-muted">
                        {formatNumber(record.views)} views · {formatNumber(record.saves)} saves ·{' '}
                        {formatNumber(record.likes)} likes · {formatNumber(record.comments)} comments
                      </p>
                      {record.notes ? <p className="mt-1 text-2xs text-slate-faint">{record.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setEditing(record);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-danger"
                        onClick={() => setConfirmDelete(record)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </>
      )}

      <p className="text-2xs leading-relaxed text-slate-faint">
        muse-ician has no connection to your social accounts. Numbers are typed in manually and stored in this browser.
        Read more about how comparisons are calculated in the Performance Journal section of the README.
      </p>

      <PerformanceFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        record={editing}
        defaultIdeaId={defaultIdeaId}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this record?"
        description={
          <p>
            The recorded numbers for {PLATFORM_LABELS[confirmDelete?.platform ?? 'instagram-reels']} on{' '}
            {formatShortDate(confirmDelete?.published_on)} will be removed. Nothing else is affected.
          </p>
        }
        confirmLabel="Delete record"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const record = confirmDelete;
          setConfirmDelete(null);
          if (!record) return;
          await removePerformance([record.id]);
          toast('Record deleted', { tone: 'success' });
        }}
      />
    </div>
  );
}
