import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import { Callout, EmptyState, PageHeader, SectionCard } from '../components/ui/primitives';
import { Field, Select } from '../components/ui/forms';
import { RUNWAY_PHASE_DESCRIPTIONS, buildRunway } from '../lib/runway';
import type { RunwayPhase } from '../lib/runway';
import { SCHEMA_VERSION, PLATFORM_LABELS } from '../lib/types';
import type { PlannedPost } from '../lib/types';
import { formatShortDate, newId, nowIso, pluralize, toDateKey } from '../lib/utils';

const PHASE_TONE: Record<RunwayPhase, string> = {
  seed: 'border-white/10 text-slate-muted',
  build: 'border-accent/40 text-accent-soft',
  tease: 'border-warn/40 text-warn',
  launch: 'border-ok/50 text-ok',
  sustain: 'border-aqua/40 text-aqua',
};

export default function RunwayPage() {
  const { data, upsertPosts } = useWorkspace();
  const { toast } = useToast();
  const [songId, setSongId] = useState('');
  const [busy, setBusy] = useState(false);

  const song = data.songs.find((item) => item.id === songId) ?? null;
  const runway = useMemo(
    () =>
      song
        ? buildRunway({
            song,
            presets: data.presets,
            posts: data.planned_posts,
            ideas: data.content_ideas,
          })
        : null,
    [song, data.presets, data.planned_posts, data.content_ideas],
  );

  const addMissing = async () => {
    if (!runway || !song) return;
    const missing = runway.steps.filter((step) => !step.alreadyPlanned);
    if (!missing.length) {
      toast('Nothing to add', { tone: 'info', description: 'Every remaining step already has a calendar entry.' });
      return;
    }
    setBusy(true);
    try {
      const posts: PlannedPost[] = missing.map((step) => ({
        id: newId('post'),
        content_idea_id: null,
        song_id: song.id,
        campaign_id: null,
        metadata_package_id: null,
        platform: step.platform,
        scheduled_date: step.date,
        status: 'planning',
        title: step.action,
        notes: `Release runway · ${step.phaseLabel}: ${step.detail}`,
        is_demo: false,
        created_at: nowIso(),
        updated_at: nowIso(),
        schema_version: SCHEMA_VERSION,
      }));
      await upsertPosts(posts);
      toast(`${pluralize(posts.length, 'step')} added to the calendar`, {
        tone: 'success',
        description: 'They are planning records — nothing is published for you.',
      });
    } catch {
      toast('The runway could not be saved', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Release runway"
        title="Work backwards from the release"
        description="A scheduling worksheet built from the starter library. Every row says what it is for; nothing is auto-published."
        actions={
          runway ? (
            <button type="button" className="btn-primary" onClick={addMissing} disabled={busy}>
              <Icon name="calendar" size={15} />
              {busy ? 'Adding…' : 'Add missing steps to calendar'}
            </button>
          ) : undefined
        }
      />

      {!data.songs.length ? (
        <EmptyState
          icon="song"
          title="Add a song first"
          description="A runway needs a release date to count backwards from."
          actions={
            <Link to="/songs?new=1" className="btn-primary btn-sm">
              Add a song
            </Link>
          }
        />
      ) : (
        <>
          <SectionCard title="Choose the release" description="Songs with a release date produce the most useful runway.">
            <Field label="Song">
              <Select
                value={songId}
                onChange={(event) => setSongId(event.target.value)}
                placeholder="Select a song"
                options={data.songs.map((item) => ({
                  value: item.id,
                  label: `${item.title}${item.release_date ? ` · ${item.release_date}` : ' · no release date'}`,
                }))}
                aria-label="Song"
              />
            </Field>
          </SectionCard>

          {!song ? (
            <Callout tone="neutral" title="Pick a song to build the timeline">
              The runway is anchored to that song’s release date, so a date in the past gives you a post-release plan
              instead.
            </Callout>
          ) : null}

          {runway ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="stat-tile">
                  <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-slate-faint">Release date</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatShortDate(runway.releaseDate)}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-slate-faint">Today</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatShortDate(toDateKey())}</p>
                </div>
                <div className="stat-tile">
                  <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-slate-faint">Steps remaining</p>
                  <p className="mt-1 text-lg font-semibold text-white">{runway.steps.length}</p>
                </div>
              </div>

              <div className="surface panel-pad">
                <p className="text-sm font-medium text-white">{runway.headline}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-muted">
                  {RUNWAY_PHASE_DESCRIPTIONS[runway.phase]}
                </p>
              </div>

              {runway.warnings.length ? (
                <Callout tone="warning" title="Check these first">
                  <ul className="space-y-1">
                    {runway.warnings.map((warning) => (
                      <li key={warning}>· {warning}</li>
                    ))}
                  </ul>
                </Callout>
              ) : null}

              <SectionCard
                title="Timeline"
                description="Each step is a suggestion tied to a real preset. Click one to open the calendar."
              >
                <ol className="relative space-y-2.5 border-l border-white/[0.08] pl-4">
                  {runway.steps.map((step) => (
                    <li key={step.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[21px] top-3 h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(123,107,255,0.6)]"
                      />
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`chip ${PHASE_TONE[step.phase]}`}>{step.phaseLabel}</span>
                            <span className="text-2xs text-slate-faint">
                              {formatShortDate(step.date)} · {step.dayOffset === 0 ? 'release day' : `${step.dayOffset > 0 ? '+' : ''}${step.dayOffset}d`}
                            </span>
                            {step.alreadyPlanned ? <span className="chip-ok">On your calendar</span> : null}
                          </div>
                          <span className="text-2xs text-slate-faint">{PLATFORM_LABELS[step.platform]}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-text">{step.action}</p>
                        <p className="mt-1 text-2xs leading-relaxed text-slate-muted">{step.detail}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {step.presetId ? (
                            <Link to={`/library/${step.presetId}`} className="btn-ghost btn-sm">
                              <Icon name="library" size={13} />
                              {step.presetTitle ?? 'Open preset'}
                            </Link>
                          ) : (
                            <span className="text-2xs text-slate-faint">No preset — write this one yourself.</span>
                          )}
                          <Link to="/calendar" className="btn-ghost btn-sm">
                            Calendar
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </SectionCard>

              <p className="text-2xs leading-relaxed text-slate-faint">
                Spacing is a starting point, not a rule. If a date lands badly for you, move it — the calendar accepts
                drag-and-drop and the runway will show it as already planned next time.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
