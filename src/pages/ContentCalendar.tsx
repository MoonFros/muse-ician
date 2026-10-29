import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Select, TextInput } from '../components/ui/forms';
import { ConfirmDialog } from '../components/ui/Modal';
import { PlannedPostModal } from '../components/forms/PlannedPostModal';
import { CampaignPlanModal } from '../components/forms/CampaignPlanModal';
import type { PlannedPost, Platform, WorkflowStatus } from '../lib/types';
import { PLATFORMS, PLATFORM_LABELS, WORKFLOW_LABELS, WORKFLOW_STATUSES } from '../lib/types';
import {
  addDays,
  daysBetween,
  formatShortDate,
  parseDateKey,
  toDateKey,
  pluralize,
} from '../lib/utils';
import { calendarWarnings } from '../lib/campaignPlan';
import { useSearchParams } from 'react-router-dom';
import { buildCampaignExport, downloadPayload, exportFilename } from '../lib/interchange';

type ViewMode = 'month' | 'week' | 'list';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PLATFORM_COLORS: Record<Platform, string> = {
  'youtube-shorts': 'border-danger/40 bg-danger/10 text-danger',
  'instagram-reels': 'border-accent/40 bg-accent-dim text-accent-soft',
  tiktok: 'border-ok/40 bg-ok/10 text-ok',
};

export default function ContentCalendarPage() {
  const { data, upsertPosts, removePosts, updatePreferences } = useWorkspace();
  const { toast } = useToast();
  const today = toDateKey();

  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekStart, setWeekStart] = useState(() => {
    const now = parseDateKey(today);
    return addDays(today, -now.getDay());
  });
  const [songFilter, setSongFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [postOpen, setPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PlannedPost | null>(null);
  const [defaultDate, setDefaultDate] = useState(today);
  const [planOpen, setPlanOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmDelete, setConfirmDelete] = useState<PlannedPost | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const filteredPosts = useMemo(
    () =>
      data.planned_posts.filter((post) => {
        if (songFilter && post.song_id !== songFilter) return false;
        if (platformFilter && post.platform !== platformFilter) return false;
        if (statusFilter && post.status !== statusFilter) return false;
        if (campaignFilter && post.campaign_id !== campaignFilter) return false;
        return true;
      }),
    [campaignFilter, data.planned_posts, platformFilter, songFilter, statusFilter],
  );

  const warnings = useMemo(
    () => calendarWarnings(filteredPosts, data.content_ideas, today),
    [data.content_ideas, filteredPosts, today],
  );

  const monthStart = cursor;
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  useEffect(() => {
    if (searchParams.get('plan') === '1') {
      setPlanOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('plan');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const gridStart = addDays(toDateKey(monthStart), -parseDateKey(toDateKey(monthStart)).getDay());
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const postsByDate = useMemo(() => {
    const map = new Map<string, PlannedPost[]>();
    for (const post of filteredPosts) {
      const list = map.get(post.scheduled_date) ?? [];
      list.push(post);
      map.set(post.scheduled_date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.title.localeCompare(b.title));
    return map;
  }, [filteredPosts]);

  const movePost = async (postId: string, newDate: string) => {
    const post = data.planned_posts.find((item) => item.id === postId);
    if (!post || post.scheduled_date === newDate) return;
    await upsertPosts([{ ...post, scheduled_date: newDate, updated_at: new Date().toISOString() }]);
    toast('Post moved', { tone: 'success', description: `${post.title} → ${formatShortDate(newDate)}` });
  };

  /** Keyboard equivalent of drag-and-drop: Alt + ← / → moves a post one day. */
  const nudgePost = async (post: PlannedPost, deltaDays: number) => {
    const next = addDays(post.scheduled_date, deltaDays);
    await movePost(post.id, next);
  };

  const changeStatus = async (post: PlannedPost, status: WorkflowStatus) => {
    await upsertPosts([{ ...post, status, updated_at: new Date().toISOString() }]);
    toast(`Marked ${WORKFLOW_LABELS[status].toLowerCase()}`, { tone: 'success' });
  };

  const releaseCountdowns = data.songs
    .filter((song) => song.release_date && song.release_date >= today)
    .sort((a, b) => (a.release_date ?? '').localeCompare(b.release_date ?? ''))
    .slice(0, 3);

  const exportPlan = () => {
    if (!data.planned_posts.length) {
      toast('Nothing to export yet', { tone: 'error' });
      return;
    }
    const payload = buildCampaignExport(data, { name: 'muse-ician planned posts' });
    const name = downloadPayload(payload, exportFilename(payload, 'planned-posts'));
    toast('Plan exported', { tone: 'success', description: name });
  };

  const openNewPost = (date: string) => {
    setEditingPost(null);
    setDefaultDate(date);
    setPostOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Content Calendar"
        title="Plan what goes out, and when"
        description="These are planning records. muse-ician never publishes or schedules anything on a social network."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditingPost(null);
                setDefaultDate(today);
                setPostOpen(true);
              }}
            >
              <Icon name="plus" size={15} />
              Add post
            </button>
            <button type="button" className="btn-primary" onClick={() => setPlanOpen(true)}>
              <Icon name="calendar" size={15} />
              Generate 15-day plan
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel="Calendar view"
          value={view}
          onChange={setView}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'list', label: 'List', count: filteredPosts.length },
          ]}
        />

        {view !== 'list' ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-icon"
              aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
              onClick={() => {
                if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
                else setWeekStart(addDays(weekStart, -7));
              }}
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <span className="min-w-[9rem] text-center text-sm text-slate-text">
              {view === 'month' ? monthLabel : `${formatShortDate(weekDays[0]!)} – ${formatShortDate(weekDays[6]!)}`}
            </span>
            <button
              type="button"
              className="btn-icon"
              aria-label={view === 'month' ? 'Next month' : 'Next week'}
              onClick={() => {
                if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
                else setWeekStart(addDays(weekStart, 7));
              }}
            >
              <Icon name="chevron-right" size={16} />
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setWeekStart(addDays(today, -parseDateKey(today).getDay()));
              }}
            >
              Today
            </button>
          </div>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by song"
            placeholder="All songs"
            value={songFilter}
            onChange={(event) => setSongFilter(event.target.value)}
            options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
            small
            className="w-36"
          />
          <Select
            aria-label="Filter by platform"
            placeholder="All platforms"
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            options={PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
            small
            className="w-36"
          />
          <Select
            aria-label="Filter by status"
            placeholder="All statuses"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={WORKFLOW_STATUSES.map((status) => ({ value: status, label: WORKFLOW_LABELS[status] }))}
            small
            className="w-36"
          />
          <Select
            aria-label="Filter by campaign"
            placeholder="All campaigns"
            value={campaignFilter}
            onChange={(event) => setCampaignFilter(event.target.value)}
            options={data.campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
            small
            className="w-40"
          />
          <button type="button" className="btn-secondary btn-sm" onClick={exportPlan}>
            <Icon name="download" size={13} />
            Export
          </button>
        </div>
      </div>

      {releaseCountdowns.length ? (
        <div className="flex flex-wrap gap-2">
          {releaseCountdowns.map((song) => (
            <Link key={song.id} to={`/songs/${song.id}`} className="chip-accent">
              <Icon name="clock" size={11} />
              {song.title} in {daysBetween(today, song.release_date!)} days
            </Link>
          ))}
        </div>
      ) : null}

      {warnings.length ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <Callout key={warning.id} tone="warning" title="Worth checking">
              {warning.message}
            </Callout>
          ))}
        </div>
      ) : null}

      <SectionCard
        title="Posting cadence"
        description="Used when generating plans. Adjustable per campaign."
      >
        <div className="flex flex-wrap items-end gap-3">
          <TextInput
            label="Days between posts"
            inputMode="numeric"
            fieldClassName="w-32"
            value={String(data.preferences.posting_cadence_days)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value) && value >= 1 && value <= 60) {
                void updatePreferences({ posting_cadence_days: Math.round(value) });
              }
            }}
          />
          <p className="pb-2 text-xs text-slate-faint">
            A post every {data.preferences.posting_cadence_days} days ≈{' '}
            {Math.round((30 / data.preferences.posting_cadence_days) * 10) / 10} posts a month at this cadence.
          </p>
          <div className="ml-auto flex flex-wrap gap-2 pb-2">
            <Link to="/settings" className="btn-ghost btn-sm">
              Platform preferences
            </Link>
          </div>
        </div>
      </SectionCard>

      {view === 'month' ? (
        <div className="overflow-hidden rounded-xl2 border border-white/[0.07] bg-white/[0.022]">
          <div className="grid grid-cols-7 border-b border-white/[0.07] bg-white/[0.03]">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-2xs uppercase tracking-wide text-slate-faint">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day[0]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = parseDateKey(day).getMonth() === monthStart.getMonth();
              const list = postsByDate.get(day) ?? [];
              const isToday = day === today;
              return (
                <div
                  key={day}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const postId = event.dataTransfer.getData('text/plain') || dragging;
                    if (postId) void movePost(postId, day);
                    setDragging(null);
                  }}
                  className={`min-h-[92px] border-b border-r border-white/[0.05] p-1.5 sm:min-h-[112px] ${
                    inMonth ? 'bg-white/[0.03]/40' : 'bg-white/[0.02]'
                  } ${isToday ? 'ring-1 ring-inset ring-accent/40' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`text-2xs ${inMonth ? 'text-slate-muted' : 'text-slate-faint'}`}>
                      {parseDateKey(day).getDate()}
                    </span>
                    <button
                      type="button"
                      onClick={() => openNewPost(day)}
                      className="rounded p-0.5 text-slate-faint opacity-0 transition-opacity hover:text-accent-soft focus:opacity-100 sm:opacity-60"
                      aria-label={`Add a post on ${formatShortDate(day)}`}
                    >
                      <Icon name="plus" size={12} />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {list.slice(0, 3).map((post) => (
                      <li key={post.id}>
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', post.id);
                            setDragging(post.id);
                          }}
                          onClick={() => {
                            setEditingPost(post);
                            setPostOpen(true);
                          }}
                          onKeyDown={(event) => {
                            if (!event.altKey) return;
                            if (event.key === 'ArrowRight') {
                              event.preventDefault();
                              void nudgePost(post, 1);
                            } else if (event.key === 'ArrowLeft') {
                              event.preventDefault();
                              void nudgePost(post, -1);
                            }
                          }}
                          className={`w-full truncate rounded border px-1.5 py-1 text-left text-[11px] leading-tight ${PLATFORM_COLORS[post.platform]}`}
                          title={`${post.title} · ${PLATFORM_LABELS[post.platform]} · ${WORKFLOW_LABELS[post.status]} — drag, or Alt + ←/→ to move a day`}
                        >
                          {post.title}
                        </button>
                      </li>
                    ))}
                    {list.length > 3 ? (
                      <li className="px-1 text-[10px] text-slate-faint">+{list.length - 3} more</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === 'week' ? (
        <div className="grid gap-2 sm:grid-cols-7">
          {weekDays.map((day) => {
            const list = postsByDate.get(day) ?? [];
            return (
              <div
                key={day}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const postId = event.dataTransfer.getData('text/plain') || dragging;
                  if (postId) void movePost(postId, day);
                  setDragging(null);
                }}
                className={`rounded-xl border border-white/[0.06] bg-white/[0.022] p-2 ${
                  day === today ? 'ring-1 ring-accent/40' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-2xs uppercase tracking-wide text-slate-faint">
                    {WEEKDAYS[parseDateKey(day).getDay()]} {parseDateKey(day).getDate()}
                  </p>
                  <button
                    type="button"
                    onClick={() => openNewPost(day)}
                    className="rounded p-0.5 text-slate-faint hover:text-accent-soft"
                    aria-label={`Add a post on ${formatShortDate(day)}`}
                  >
                    <Icon name="plus" size={12} />
                  </button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {list.map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', post.id);
                          setDragging(post.id);
                        }}
                        onClick={() => {
                          setEditingPost(post);
                          setPostOpen(true);
                        }}
                        className={`w-full rounded border px-2 py-1.5 text-left text-2xs leading-tight ${PLATFORM_COLORS[post.platform]}`}
                      >
                        <span className="block truncate">{post.title}</span>
                        <span className="mt-0.5 block text-[10px] opacity-80">{WORKFLOW_LABELS[post.status]}</span>
                      </button>
                    </li>
                  ))}
                  {list.length === 0 ? <li className="text-[10px] text-slate-faint">Nothing planned</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === 'list' ? (
        filteredPosts.length ? (
          <SectionCard title="Planned posts" description="Sorted by date. Change status inline.">
            <ul className="divide-y divide-ink-700/60">
              {[...filteredPosts]
                .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                .map((post) => {
                  const idea = data.content_ideas.find((item) => item.id === post.content_idea_id);
                  const song = data.songs.find((item) => item.id === post.song_id);
                  return (
                    <li key={post.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="w-20 shrink-0 text-2xs text-slate-faint">{formatShortDate(post.scheduled_date)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-text">{post.title}</p>
                        <p className="truncate text-2xs text-slate-faint">
                          {PLATFORM_LABELS[post.platform]}
                          {song ? ` · ${song.title}` : ''}
                          {idea ? '' : ' · no linked idea'}
                          {post.scheduled_date < today && !['published', 'reviewed', 'archived'].includes(post.status)
                            ? ' · date passed'
                            : ''}
                        </p>
                      </div>
                      <Select
                        aria-label={`Status for ${post.title}`}
                        value={post.status}
                        onChange={(event) => void changeStatus(post, event.target.value as WorkflowStatus)}
                        options={WORKFLOW_STATUSES.map((status) => ({ value: status, label: WORKFLOW_LABELS[status] }))}
                        small
                        className="w-40"
                      />
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setEditingPost(post);
                          setPostOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-danger"
                        onClick={() => setConfirmDelete(post)}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
            </ul>
          </SectionCard>
        ) : (
          <EmptyState
            icon="calendar"
            title="No posts match those filters"
            description="Clear a filter, or add a post on a specific date."
            actions={
              <button type="button" className="btn-primary btn-sm" onClick={() => openNewPost(today)}>
                Add post
              </button>
            }
          />
        )
      ) : null}

      {view !== 'list' && filteredPosts.length === 0 ? (
        <Callout tone="neutral" title="Nothing planned in this view">
          Add a post manually, or generate a 15-day plan from the starter presets and adjust it afterwards.
        </Callout>
      ) : null}

      <p className="text-2xs leading-relaxed text-slate-faint">
        Drag a post to another day on desktop, or open it to change the date. {pluralize(filteredPosts.length, 'planned post')}{' '}
        shown{warnings.length ? ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}.
      </p>

      <PlannedPostModal
        open={postOpen}
        onClose={() => {
          setPostOpen(false);
          setEditingPost(null);
        }}
        post={editingPost}
        defaultDate={defaultDate}
      />
      <CampaignPlanModal open={planOpen} onClose={() => setPlanOpen(false)} />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this planned post?"
        description={<p>“{confirmDelete?.title}” will be removed from the calendar. The linked idea stays.</p>}
        confirmLabel="Delete post"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const post = confirmDelete;
          setConfirmDelete(null);
          if (!post) return;
          await removePosts([post.id]);
          toast('Planned post deleted', { tone: 'success' });
        }}
      />
    </div>
  );
}
