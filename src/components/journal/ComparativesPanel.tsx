import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../state/workspace';
import { Callout, SectionCard, SegmentedControl } from '../ui/primitives';
import {
  MIN_ACTIONABLE_SAMPLE,
  SAMPLE_CONFIDENCE_LABELS,
  buildComparativeReport,
  type ComparativeGroup,
} from '../../lib/comparatives';
import { compactNumber, pluralize } from '../../lib/utils';

const VIEWS: { value: 'platform' | 'preset' | 'song' | 'intent'; label: string }[] = [
  { value: 'platform', label: 'Platform' },
  { value: 'preset', label: 'Preset' },
  { value: 'song', label: 'Song' },
  { value: 'intent', label: 'Objective' },
];

function GroupTable({ groups, emptyLabel }: { groups: ComparativeGroup[]; emptyLabel: string }) {
  if (!groups.length) return <p className="text-sm text-slate-faint">{emptyLabel}</p>;
  return (
    <ul className="space-y-2">
      {groups.map((group) => (
        <li
          key={group.key}
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.14]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-text">{group.label}</span>
              <span className="chip">{pluralize(group.posts, 'post')}</span>
              <span className={`chip ${group.actionable ? 'chip-ok' : 'chip-warn'}`}>
                {SAMPLE_CONFIDENCE_LABELS[group.confidence]}
              </span>
            </div>
            <div className="flex items-baseline gap-3 text-2xs text-slate-faint">
              <span>
                median <span className="text-sm font-semibold tabular-nums text-white">{compactNumber(group.medianViews)}</span> views
              </span>
              {group.medianSaves !== null ? <span>{compactNumber(group.medianSaves)} saves</span> : null}
              {group.medianCompletion !== null ? <span>{Math.round(group.medianCompletion)}% completion</span> : null}
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className={`h-full rounded-full ${group.actionable ? 'bg-gradient-to-r from-accent to-aqua' : 'bg-white/20'}`}
              style={{
                width: `${Math.min(
                  100,
                  ((group.medianViews ?? 0) / Math.max(1, ...groups.map((item) => item.medianViews ?? 0))) * 100,
                )}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-2xs leading-relaxed text-slate-faint">
            {group.note}
            {group.bestRecord ? ` Best logged: “${group.bestRecord.title}” at ${compactNumber(group.bestRecord.views)} views.` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Comparatives: your own median by platform, preset, song and objective, with
 * explicit sample-size gating. No external benchmark is ever used.
 */
export function ComparativesPanel() {
  const { data } = useWorkspace();
  const [view, setView] = useState<'platform' | 'preset' | 'song' | 'intent'>('platform');

  const report = useMemo(
    () =>
      buildComparativeReport(data.performance_records, {
        ideas: data.content_ideas,
        presets: data.presets,
        songs: data.songs,
      }),
    [data.performance_records, data.content_ideas, data.presets, data.songs],
  );

  const groups =
    view === 'platform'
      ? report.byPlatform
      : view === 'preset'
        ? report.byPreset
        : view === 'song'
          ? report.bySong
          : report.byIntent;

  return (
    <SectionCard
      title="Comparatives"
      description="Median of your own posts, grouped. Groups below three posts are shown but marked as noise."
      actions={
        <SegmentedControl
          size="sm"
          ariaLabel="Compare by"
          value={view}
          onChange={(value) => setView(value)}
          options={VIEWS.map((item) => ({ value: item.value, label: item.label }))}
        />
      }
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="stat-tile">
            <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-slate-faint">Logged posts</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{report.overall.posts}</p>
          </div>
          <div className="stat-tile">
            <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-slate-faint">Your median</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {report.overall.medianViews === null ? '—' : compactNumber(report.overall.medianViews)}
            </p>
          </div>
          <div className="stat-tile">
            <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-slate-faint">Confidence</p>
            <p className="mt-1 text-sm font-medium text-white">
              {SAMPLE_CONFIDENCE_LABELS[report.overall.confidence]}
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-muted">{report.overall.message}</p>

        {!report.overall.actionable ? (
          <Callout tone="neutral" title={`Log ${MIN_ACTIONABLE_SAMPLE - report.overall.posts > 0 ? MIN_ACTIONABLE_SAMPLE - report.overall.posts : 1} more result${MIN_ACTIONABLE_SAMPLE - report.overall.posts === 1 ? '' : 's'}`}>
            Below {MIN_ACTIONABLE_SAMPLE} posts per group, a difference is as likely to be luck as a pattern. Keep logging
            before you change your whole format.
          </Callout>
        ) : null}

        <GroupTable
          groups={groups}
          emptyLabel={
            view === 'preset'
              ? 'No logged post is linked to a preset yet. Link ideas to a preset to compare formats.'
              : 'Nothing logged in this grouping yet.'
          }
        />

        {report.observations.length ? (
          <ul className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            {report.observations.map((observation) => (
              <li key={observation.text} className="text-2xs leading-relaxed text-slate-muted">
                · {observation.text}{' '}
                <span className="text-slate-faint">({SAMPLE_CONFIDENCE_LABELS[observation.confidence].toLowerCase()})</span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-2xs leading-relaxed text-slate-faint">
          These numbers come only from what you typed in.{' '}
          <Link to="/journal?new=1" className="link">
            Log another result
          </Link>{' '}
          to sharpen the picture. muse-ician never pulls platform analytics and never compares you to another account.
        </p>
      </div>
    </SectionCard>
  );
}
