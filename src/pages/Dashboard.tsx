import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import { Callout, DemoBadge, EmptyState, PageHeader, SectionCard, StatusBadge } from '../components/ui/primitives';
import { ConfirmDialog } from '../components/ui/Modal';
import { CampaignPlanModal } from '../components/forms/CampaignPlanModal';
import { IdeaFromPresetModal } from '../components/forms/IdeaFromPresetModal';
import type { Preset } from '../lib/types';
import { WORKFLOW_LABELS } from '../lib/types';
import { daysBetween, formatShortDate, pluralize, relativeTime, toDateKey, truncate } from '../lib/utils';

export default function DashboardPage() {
  const { data, demoRecordCount, addDemoData, clearDemoData, saveState } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const today = toDateKey();
  const [demoBusy, setDemoBusy] = useState(false);
  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  const hasAnyWork = data.songs.length > 0 || data.content_ideas.length > 0 || data.planned_posts.length > 0;

  const openIdeas = data.content_ideas.filter(
    (idea) => !['published', 'reviewed', 'archived'].includes(idea.status),
  );

  const upcomingPosts = useMemo(
    () =>
      [...data.planned_posts]
        .filter((post) => post.scheduled_date >= today && post.status !== 'archived')
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [data.planned_posts, today],
  );

  const recentIdeas = useMemo(
    () =>
      [...data.content_ideas]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 5),
    [data.content_ideas],
  );

  const upcomingReleases = useMemo(
    () =>
      data.songs
        .filter((song) => song.release_date && song.release_date >= today)
        .sort((a, b) => (a.release_date ?? '').localeCompare(b.release_date ?? ''))
        .slice(0, 4),
    [data.songs, today],
  );

  const publishedWithoutResults = data.content_ideas.filter(
    (idea) =>
      idea.status === 'published' &&
      !data.performance_records.some((record) => record.content_idea_id === idea.id),
  );

  const nextActions = useMemo(() => {
    const actions: { title: string; detail: string; to: string; cta: string; tone?: 'warn' | 'info' }[] = [];
    if (!data.songs.length) {
      actions.push({
        title: 'Add your first song',
        detail: 'Ideas, coaching and metadata all work from a song record.',
        to: '/songs?new=1',
        cta: 'Add song',
      });
    }
    if (data.songs.length && !data.content_ideas.length) {
      actions.push({
        title: 'Turn a preset into a content idea',
        detail: 'The starter library has 30 concepts you can adapt in a few minutes.',
        to: '/library?pick=1',
        cta: 'Browse library',
      });
    }
    if (openIdeas.length) {
      const next = openIdeas[0]!;
      actions.push({
        title: `Move “${truncate(next.title, 52)}” forward`,
        detail: `Currently ${WORKFLOW_LABELS[next.status].toLowerCase()}. Edit the plan, then put it on a date.`,
        to: `/ideas/${next.id}`,
        cta: 'Open idea',
      });
    }
    if (openIdeas.some((idea) => !idea.coach_assessment)) {
      actions.push({
        title: 'Run a creative readiness check',
        detail: 'See the rubric breakdown before you spend an afternoon filming.',
        to: '/coach',
        cta: 'Open coach',
        tone: 'info',
      });
    }
    if (publishedWithoutResults.length) {
      actions.push({
        title: `${publishedWithoutResults.length} published ${publishedWithoutResults.length === 1 ? 'idea has' : 'ideas have'} no recorded result`,
        detail: 'Log the numbers while they are still visible in the app you published from.',
        to: '/journal?new=1',
        cta: 'Log result',
      });
    }
    if (!data.planned_posts.length) {
      actions.push({
        title: 'Plan a 15-day campaign',
        detail: 'Generate a starting sequence from the starter presets, then adjust it.',
        to: '/calendar',
        cta: 'Open calendar',
      });
    }
    return actions.slice(0, 4);
  }, [data, openIdeas, publishedWithoutResults.length]);

  const recommended = useMemo(() => {
    const prefs = data.preferences;
    const scored = data.presets
      .filter((preset) => !preset.is_archived)
      .map((preset) => {
        let score = 0;
        if (prefs.preferred_platforms.some((platform) => preset.platforms.includes(platform))) score += 2;
        if (prefs.preferred_genres.some((genre) => preset.genre_tags?.includes(genre))) score += 2;
        if (prefs.preferred_moods.some((mood) => preset.mood_tags?.includes(mood))) score += 2;
        if (prefs.budget && preset.budget === prefs.budget) score += 1;
        if (preset.is_favorite) score += 2;
        return { preset, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((entry) => entry.preset);
  }, [data.preferences, data.presets]);

  const surprise = () => {
    const pool = data.presets.filter((preset) => !preset.is_archived);
    if (!pool.length) {
      toast('The preset library is empty', { tone: 'error', description: 'Restore starter presets in Settings.' });
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    setSelectedPreset(pick);
  };

  const handleDemo = async () => {
    setDemoBusy(true);
    try {
      await addDemoData();
      toast('Sample campaign added', {
        tone: 'success',
        description: 'Every demo record is labelled and can be removed from this dashboard or Settings.',
      });
    } catch {
      toast('Demo data could not be saved', { tone: 'error' });
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={data.preferences.artist_name ? `Welcome back, ${data.preferences.artist_name}` : 'What should you make next?'}
        description="A working view of your songs, ideas and schedule — no invented analytics, just the next useful step."
        actions={
          <>
            <Link to="/library?pick=1" className="btn-primary">
              <Icon name="sparkle" size={15} />
              Start an idea
            </Link>
            <button type="button" className="btn-secondary" onClick={() => setCampaignOpen(true)}>
              <Icon name="calendar" size={15} />
              Plan a campaign
            </button>
          </>
        }
      />

      {saveState.status === 'error' ? (
        <Callout tone="warning" title="Your last change was not saved">
          {saveState.message} Export a backup from Import / Export before closing this tab.
        </Callout>
      ) : null}

      {demoRecordCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/5 px-3.5 py-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-muted">
            <DemoBadge />
            <p>
              {pluralize(demoRecordCount, 'sample record')} from demo mode is in this workspace. Sample numbers are
              made up and labelled — they are never mixed into your real results.
            </p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmClearDemo(true)}>
            Remove demo data
          </button>
        </div>
      ) : null}

      {!hasAnyWork ? (
        <div className="space-y-4">
          <SectionCard
            title="Start here"
            description="muse-ician is useful before you configure anything. Pick a path."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: 'Add your first song',
                  body: 'A song record is the anchor for ideas, feasibility checks and metadata.',
                  cta: 'Add a song',
                  to: '/songs?new=1',
                  icon: 'song' as const,
                },
                {
                  title: 'Explore the starter library',
                  body: '30 ready-to-use video concepts with hooks, shot lists and common mistakes.',
                  cta: 'Browse presets',
                  to: '/library',
                  icon: 'library' as const,
                },
                {
                  title: 'Import an AI-generated preset pack',
                  body: 'Download example.json, give it to your AI tool, then validate the result here.',
                  cta: 'Open Import / Export',
                  to: '/import-export',
                  icon: 'exchange' as const,
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-ink-700/70 bg-ink-900/50 p-3.5">
                  <Icon name={item.icon} size={18} className="text-accent-soft" />
                  <h3 className="mt-2 text-sm font-medium text-slate-text">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-muted">{item.body}</p>
                  <Link to={item.to} className="btn-secondary btn-sm mt-3">
                    {item.cta}
                  </Link>
                </div>
              ))}
              <div className="rounded-xl border border-dashed border-ink-600 bg-ink-900/30 p-3.5">
                <Icon name="wave" size={18} className="text-warn" />
                <h3 className="mt-2 text-sm font-medium text-slate-text">Create a sample campaign</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-muted">
                  Adds clearly labelled demo records (one song, 8 ideas, a 15-day plan and sample results) so you can
                  explore every screen. Removable in one click.
                </p>
                <button type="button" className="btn-secondary btn-sm mt-3" onClick={handleDemo} disabled={demoBusy}>
                  {demoBusy ? 'Adding…' : 'Add demo data'}
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="How the workflow fits together" description="Each step is optional, and nothing requires an AI provider.">
            <ol className="grid gap-3 text-xs text-slate-muted sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['1. Add a song', 'Title, moods, strongest lyrics, and the constraints you actually have.'],
                ['2. Pick a preset', 'Use it as is or customise it. Preserve your own direction.'],
                ['3. Coach it', 'Check hook strength, song fit, pacing and feasibility before filming.'],
                ['4. Write the plan', 'Shot list, on-screen text, audio section and a production estimate.'],
                ['5. Build metadata', 'Separate YouTube Shorts, Reels and TikTok packages.'],
                ['6. Schedule and log', 'Plan dates, publish manually, then record the numbers you can see.'],
              ].map(([title, body]) => (
                <li key={title} className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-3.5 py-3">
                  <p className="text-sm font-medium text-slate-text">{title}</p>
                  <p className="mt-1 leading-relaxed">{body}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <SectionCard
              title="Next actions"
              description="Derived from your own records — nothing here is a prediction."
            >
              {nextActions.length ? (
                <ul className="space-y-2.5">
                  {nextActions.map((action) => (
                    <li
                      key={action.title}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink-700/60 bg-ink-900/40 px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-text">{action.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-muted">{action.detail}</p>
                      </div>
                      <Link to={action.to} className="btn-secondary btn-sm shrink-0">
                        {action.cta}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-muted">
                  Nothing is waiting on you. Publish, log the result, or start the next idea.
                </p>
              )}
            </SectionCard>

            <SectionCard
              title="Find something to make"
              description="Random prompt or preferences-based recommendation."
              actions={
                <button type="button" className="btn-secondary btn-sm" onClick={surprise}>
                  <Icon name="refresh" size={13} />
                  Surprise me
                </button>
              }
            >
              <ul className="space-y-2">
                {recommended.map((preset) => (
                  <li key={preset.id} className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/library/${preset.id}`} className="text-sm text-slate-text hover:text-accent-soft">
                          {preset.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-faint">{truncate(preset.summary, 96)}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost btn-sm shrink-0"
                        onClick={() => setSelectedPreset(preset)}
                      >
                        Use
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
                Recommendations match the platforms, genres and moods in Settings. They are not based on performance
                data.
              </p>
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Active song projects"
              description={`${pluralize(data.songs.length, 'song')} in this workspace`}
              actions={
                <Link to="/songs" className="btn-ghost btn-sm">
                  All songs
                </Link>
              }
            >
              {data.songs.length ? (
                <ul className="space-y-2.5">
                  {data.songs.slice(0, 4).map((song) => {
                    const ideas = data.content_ideas.filter((idea) => idea.song_id === song.id);
                    const done = ideas.filter((idea) => ['published', 'reviewed'].includes(idea.status)).length;
                    const pct = ideas.length ? Math.round((done / ideas.length) * 100) : 0;
                    const days =
                      song.release_date && song.release_date >= today
                        ? daysBetween(today, song.release_date)
                        : null;
                    return (
                      <li key={song.id} className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-3.5 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <Link to={`/songs/${song.id}`} className="text-sm font-medium text-slate-text hover:text-accent-soft">
                            {song.title}
                          </Link>
                          <span className="text-2xs text-slate-faint">
                            {ideas.length ? `${done}/${ideas.length} ideas published` : 'No ideas yet'}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs text-slate-faint">
                          {song.genre ? <span>{song.genre}</span> : null}
                          <span>·</span>
                          <span>{song.release_status ?? 'unreleased'}</span>
                          {song.release_date ? (
                            <>
                              <span>·</span>
                              <span>
                                {formatShortDate(song.release_date)}
                                {days !== null ? ` (${days}d)` : ''}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon="song"
                  title="No songs yet"
                  description="Add a song to group ideas, metadata and results around a release."
                  actions={
                    <Link to="/songs?new=1" className="btn-primary btn-sm">
                      Add a song
                    </Link>
                  }
                />
              )}
            </SectionCard>

            <SectionCard title="Content pipeline" description="Ideas grouped by workflow status">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(['idea', 'planning', 'scripted', 'filming', 'editing', 'ready-to-publish'] as const).map((status) => {
                  const list = data.content_ideas.filter((idea) => idea.status === status);
                  return (
                    <div key={status} className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-2.5">
                      <p className="text-2xs uppercase tracking-[0.08em] text-slate-faint">
                        {WORKFLOW_LABELS[status]}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">{list.length}</p>
                      <ul className="mt-1 space-y-0.5">
                        {list.slice(0, 2).map((idea) => (
                          <li key={idea.id} className="truncate text-2xs text-slate-muted">
                            <Link to={`/ideas/${idea.id}`} className="hover:text-accent-soft">
                              {idea.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-2xs text-slate-faint">
                <StatusBadge status="published" />
                <span>{data.content_ideas.filter((idea) => idea.status === 'published').length} published</span>
                <StatusBadge status="reviewed" />
                <span>{data.content_ideas.filter((idea) => idea.status === 'reviewed').length} reviewed</span>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Next scheduled posts"
              actions={
                <Link to="/calendar" className="btn-ghost btn-sm">
                  Calendar
                </Link>
              }
            >
              {upcomingPosts.length ? (
                <ul className="divide-y divide-ink-700/60">
                  {upcomingPosts.slice(0, 5).map((post) => (
                    <li key={post.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-text">{post.title}</p>
                        <p className="text-2xs text-slate-faint">
                          {formatShortDate(post.scheduled_date)} · {post.platform}
                        </p>
                      </div>
                      <StatusBadge status={post.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon="calendar"
                  title="Nothing scheduled"
                  description="Assign ideas to dates so the backlog becomes a plan."
                  actions={
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setCampaignOpen(true)}>
                      Generate a plan
                    </button>
                  }
                />
              )}
            </SectionCard>

            <SectionCard title="Recently edited ideas" actions={<Link to="/library" className="btn-ghost btn-sm">Library</Link>}>
              {recentIdeas.length ? (
                <ul className="divide-y divide-ink-700/60">
                  {recentIdeas.map((idea) => {
                    const song = data.songs.find((item) => item.id === idea.song_id);
                    return (
                      <li key={idea.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <Link to={`/ideas/${idea.id}`} className="truncate text-sm text-slate-text hover:text-accent-soft">
                            {idea.title}
                          </Link>
                          <p className="text-2xs text-slate-faint">
                            {song ? song.title : 'No song linked'} · edited {relativeTime(idea.updated_at)}
                          </p>
                        </div>
                        <StatusBadge status={idea.status} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon="sparkle"
                  title="No ideas yet"
                  description="Every idea starts from a preset or from scratch."
                  actions={
                    <Link to="/library?pick=1" className="btn-primary btn-sm">
                      Browse presets
                    </Link>
                  }
                />
              )}
            </SectionCard>
          </div>

          {upcomingReleases.length ? (
            <SectionCard title="Upcoming release dates" description="From your song records only">
              <ul className="grid gap-2 sm:grid-cols-2">
                {upcomingReleases.map((song) => (
                  <li key={song.id} className="flex items-center justify-between rounded-xl border border-ink-700/60 bg-ink-900/40 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <Link to={`/songs/${song.id}`} className="text-sm text-slate-text hover:text-accent-soft">
                        {song.title}
                      </Link>
                      <p className="text-2xs text-slate-faint">{formatShortDate(song.release_date)}</p>
                    </div>
                    <span className="chip-accent">{daysBetween(today, song.release_date!)} days</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard title="Open work at a glance">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Open ideas', value: openIdeas.length, to: '/library?filter=open' },
                { label: 'Scheduled posts', value: upcomingPosts.length, to: '/calendar' },
                {
                  label: 'Unlogged results',
                  value: publishedWithoutResults.length,
                  to: '/journal?new=1',
                },
                { label: 'Metadata drafts', value: data.metadata_packages.length, to: '/metadata' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-ink-700/60 bg-ink-900/40 px-3.5 py-3">
                  <dt className="text-2xs uppercase tracking-[0.08em] text-slate-faint">{item.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-white">{item.value}</span>
                    <Link to={item.to} className="text-2xs text-accent-soft hover:underline">
                      open
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </>
      )}

      <IdeaFromPresetModal preset={selectedPreset} open={Boolean(selectedPreset)} onClose={() => setSelectedPreset(null)} />
      <CampaignPlanModal
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        onCreated={() => navigate('/calendar')}
      />
      <ConfirmDialog
        open={confirmClearDemo}
        title="Remove all demo data?"
        description={
          <>
            <p>
              This removes {pluralize(demoRecordCount, 'sample record')} created by demo mode. Your own songs, ideas,
              posts and results are not affected.
            </p>
            <p className="text-slate-faint">You can add demo data again from the dashboard.</p>
          </>
        }
        confirmLabel="Remove demo data"
        tone="danger"
        onCancel={() => setConfirmClearDemo(false)}
        onConfirm={async () => {
          setConfirmClearDemo(false);
          await clearDemoData();
          toast('Demo data removed', { tone: 'success' });
        }}
      />
    </div>
  );
}
