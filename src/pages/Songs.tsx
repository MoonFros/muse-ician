import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { Icon } from '../components/ui/Icons';
import { DemoBadge, EmptyState, PageHeader, SearchField } from '../components/ui/primitives';
import { Select } from '../components/ui/forms';
import { SongFormModal } from '../components/forms/SongFormModal';
import { RELEASE_STATUSES } from '../lib/types';
import { daysBetween, formatShortDate, pluralize, relativeTime, toDateKey, truncate } from '../lib/utils';

export default function SongsPage() {
  const { data } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const today = toDateKey();

  const songs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.songs
      .filter((song) => {
        if (status && song.release_status !== status) return false;
        if (!term) return true;
        return [song.title, song.artist, song.genre, song.subgenre, ...(song.moods ?? []), ...(song.themes ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  }, [data.songs, query, status]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="My Songs"
        title="Songs and campaigns"
        description="A song record is the anchor for everything else: ideas, feasibility checks, metadata and results."
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
            <Icon name="plus" size={15} />
            Add song
          </button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search songs"
          placeholder="Search titles, genres, moods, themes…"
          className="flex-1"
        />
        <Select
          aria-label="Filter by release status"
          placeholder="Any release status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={RELEASE_STATUSES.map((value) => ({ value, label: value }))}
          className="sm:w-48"
        />
      </div>

      {songs.length === 0 ? (
        <EmptyState
          icon="song"
          title={data.songs.length ? 'No songs match that search' : 'No songs yet'}
          description={
            data.songs.length
              ? 'Try a shorter search term or clear the release status filter.'
              : 'Add the song you are promoting. Only a title is required — every other field makes the coaching sharper, not obligatory.'
          }
          actions={
            data.songs.length ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setQuery('');
                  setStatus('');
                }}
              >
                Clear filters
              </button>
            ) : (
              <button type="button" className="btn-primary btn-sm" onClick={() => setFormOpen(true)}>
                Add your first song
              </button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {songs.map((song) => {
            const ideas = data.content_ideas.filter((idea) => idea.song_id === song.id);
            const published = ideas.filter((idea) => ['published', 'reviewed'].includes(idea.status)).length;
            const posts = data.planned_posts.filter((post) => post.song_id === song.id);
            const nextPost = [...posts]
              .filter((post) => post.scheduled_date >= today)
              .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
            const results = data.performance_records.filter((record) => record.song_id === song.id);
            const days =
              song.release_date && song.release_date >= today ? daysBetween(today, song.release_date) : null;

            return (
              <li key={song.id}>
                <article className="flex h-full flex-col rounded-xl2 border border-ink-700/70 bg-ink-850/70 p-4 transition-colors hover:border-ink-600">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-white">
                        <Link to={`/songs/${song.id}`} className="rounded hover:text-accent-soft">
                          {song.title}
                        </Link>
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-faint">{song.artist || 'No artist name'}</p>
                    </div>
                    {song.is_demo ? <DemoBadge /> : null}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="chip">{song.release_status ?? 'unreleased'}</span>
                    {song.genre ? <span className="chip">{song.genre}</span> : null}
                    {(song.moods ?? []).slice(0, 2).map((mood) => (
                      <span key={mood} className="chip">
                        {mood}
                      </span>
                    ))}
                    {days !== null ? <span className="chip-accent">{days}d to release</span> : null}
                  </div>

                  {song.description ? (
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-muted">{truncate(song.description, 140)}</p>
                  ) : null}

                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-700/60 pt-3 text-2xs text-slate-faint">
                    <div>
                      <dt>Ideas</dt>
                      <dd className="mt-0.5 text-sm text-slate-text">
                        {ideas.length}
                        <span className="ml-1 text-2xs text-slate-faint">({published} out)</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Planned</dt>
                      <dd className="mt-0.5 text-sm text-slate-text">{posts.length}</dd>
                    </div>
                    <div>
                      <dt>Results</dt>
                      <dd className="mt-0.5 text-sm text-slate-text">{results.length}</dd>
                    </div>
                  </dl>

                  <p className="mt-2 text-2xs text-slate-faint">
                    {nextPost
                      ? `Next: ${formatShortDate(nextPost.scheduled_date)} · ${nextPost.title}`
                      : 'Nothing scheduled yet'}
                  </p>
                  <p className="mt-1 text-2xs text-slate-faint">Updated {relativeTime(song.updated_at)}</p>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Link to={`/songs/${song.id}`} className="btn-secondary btn-sm">
                      Open campaign
                    </Link>
                    <Link to={`/library?pick=1`} className="btn-ghost btn-sm">
                      New idea
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-2xs text-slate-faint">
        {pluralize(data.songs.length, 'song')} stored in this browser. Song data is only sent to an AI provider when you
        press an AI action, and the prompt preview lists exactly what is included.
      </p>

      <SongFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
