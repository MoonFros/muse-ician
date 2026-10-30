import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  DemoBadge,
  EmptyState,
  InfoList,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../components/ui/primitives';
import { ConfirmDialog } from '../components/ui/Modal';
import { SongFormModal } from '../components/forms/SongFormModal';
import { AudioAnalysisCard } from '../components/song/AudioAnalysisCard';
import { CampaignPlanModal } from '../components/forms/CampaignPlanModal';
import { daysBetween, formatDate, formatShortDate, toDateKey } from '../lib/utils';
import { buildCampaignExport, downloadPayload, exportFilename } from '../lib/interchange';
import { PLATFORM_LABELS } from '../lib/types';

export default function SongDetailPage() {
  const { songId } = useParams();
  const { data, removeSongs } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const song = data.songs.find((item) => item.id === songId) ?? null;
  const ideas = useMemo(
    () => data.content_ideas.filter((idea) => idea.song_id === songId),
    [data.content_ideas, songId],
  );
  const posts = useMemo(
    () =>
      data.planned_posts
        .filter((post) => post.song_id === songId)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [data.planned_posts, songId],
  );
  const packages = data.metadata_packages.filter((pkg) => pkg.song_id === songId);
  const results = data.performance_records.filter((record) => record.song_id === songId);
  const campaigns = data.campaigns.filter((campaign) => campaign.song_id === songId);
  const today = toDateKey();

  if (!song) {
    return (
      <EmptyState
        icon="song"
        title="Song not found"
        description="It may have been deleted, or it came from an import you cancelled."
        actions={
          <Link to="/songs" className="btn-primary btn-sm">
            Back to songs
          </Link>
        }
      />
    );
  }

  const exportCampaign = () => {
    const payload = buildCampaignExport(data, { songId: song.id, name: `${song.title} campaign` });
    const name = downloadPayload(payload, exportFilename(payload, `${song.title}-campaign`));
    toast('Campaign exported', { tone: 'success', description: name });
  };

  const daysToRelease =
    song.release_date && song.release_date >= today ? daysBetween(today, song.release_date) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Song campaign"
        breadcrumbs={[{ label: 'My Songs', to: '/songs' }, { label: song.title }]}
        title={song.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {song.artist ? <span>{song.artist}</span> : null}
            <span className="chip">{song.release_status ?? 'unreleased'}</span>
            {song.release_date ? <span className="chip">release {formatDate(song.release_date)}</span> : null}
            {daysToRelease !== null ? <span className="chip-accent">{daysToRelease} days</span> : null}
            {song.is_demo ? <DemoBadge /> : null}
          </span>
        }
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
              <Icon name="edit" size={15} />
              Edit song
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPlanOpen(true)}>
              <Icon name="calendar" size={15} />
              Generate plan
            </button>
            <button type="button" className="btn-secondary" onClick={exportCampaign}>
              <Icon name="download" size={15} />
              Export campaign
            </button>
            <button
              type="button"
              className="btn-icon text-danger"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete song"
              title="Delete song"
            >
              <Icon name="trash" size={16} />
            </button>
          </>
        }
      />

      {song.is_demo ? (
        <Callout tone="warning" title="Demo song record">
          This song and its linked demo records were created by demo mode. Remove them all from Settings.
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Song profile">
          {song.description ? (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-slate-muted">{song.description}</p>
          ) : null}
          {song.song_brief ? (
            <div className="mb-4">
              <h3 className="section-title">Song brief</h3>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-muted">{song.song_brief}</p>
            </div>
          ) : null}
          <InfoList
            items={[
              { label: 'Genre', value: song.genre },
              { label: 'Subgenre', value: song.subgenre },
              { label: 'Moods', value: (song.moods ?? []).join(', ') },
              { label: 'Language', value: song.language },
              { label: 'Themes', value: (song.themes ?? []).join(', ') },
              { label: 'Target audience', value: song.target_audience },
              { label: 'Intended response', value: song.intended_listener_response },
              { label: 'BPM / key', value: [song.bpm, song.musical_key].filter(Boolean).join(' · ') },
              { label: 'Streaming URL', value: song.streaming_url },
              { label: 'Music video', value: song.music_video_url },
              { label: 'Posting frequency', value: song.posting_frequency },
            ]}
          />
          {song.strongest_lyrics?.length ? (
            <div className="mt-4">
              <h3 className="section-title">Strongest lines</h3>
              <ul className="mt-1.5 space-y-1 text-sm italic text-slate-muted">
                {song.strongest_lyrics.map((line) => (
                  <li key={line}>“{line}”</li>
                ))}
              </ul>
            </div>
          ) : null}
          {song.audio_sections?.length ? (
            <div className="mt-4">
              <h3 className="section-title">Sections</h3>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-muted">
                {song.audio_sections.map((section) => (
                  <li key={section.label}>
                    <span className="text-slate-text">{section.label}</span>
                    {section.timestamp ? ` · ${section.timestamp}` : ''}
                    {section.note ? ` — ${section.note}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {song.campaign_notes ? (
            <div className="mt-4">
              <h3 className="section-title">Campaign notes</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-muted">{song.campaign_notes}</p>
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Constraints on record" description="Used for feasibility checks; never assumed.">
            <InfoList
              items={[
                { label: 'Budget', value: song.budget },
                { label: 'Equipment', value: (song.equipment ?? []).join(', ') },
                { label: 'Locations', value: (song.filming_locations ?? []).join(', ') },
                { label: 'Face on camera', value: song.face_visibility },
                { label: 'Animation', value: song.animation_capability === null ? null : song.animation_capability ? 'Available' : 'Not available' },
              ]}
            />
            {song.production_constraints ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-muted">{song.production_constraints}</p>
            ) : null}
            {!song.budget && !song.equipment?.length ? (
              <p className="mt-3 text-2xs text-slate-faint">
                No constraints recorded. Feasibility scores are capped and say so rather than guessing.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Persona and visual identity">
            <p className="text-sm leading-relaxed text-slate-muted">
              {song.persona_notes || 'No persona notes.'}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-muted">
              {song.visual_identity_notes || 'No visual identity notes.'}
            </p>
          </SectionCard>

          <SectionCard title="Campaigns" actions={<button type="button" className="btn-ghost btn-sm" onClick={() => setPlanOpen(true)}>New</button>}>
            {campaigns.length ? (
              <ul className="space-y-2">
                {campaigns.map((campaign) => (
                  <li key={campaign.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <p className="text-sm text-slate-text">{campaign.name}</p>
                    <p className="text-2xs text-slate-faint">
                      {formatShortDate(campaign.start_date)} → {formatShortDate(campaign.end_date)} · every{' '}
                      {campaign.posting_cadence_days ?? '—'} days
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-faint">No campaign yet. Generate one from the starter presets.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Content ideas"
          description={`${ideas.length} linked`}
          actions={
            <Link to="/library?pick=1" className="btn-ghost btn-sm">
              New idea
            </Link>
          }
        >
          {ideas.length ? (
            <ul className="divide-y divide-ink-700/60">
              {ideas.map((idea) => (
                <li key={idea.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/ideas/${idea.id}`} className="block truncate text-sm text-slate-text hover:text-accent-soft">
                      {idea.title}
                    </Link>
                    <p className="truncate text-2xs text-slate-faint">{idea.hook || 'No hook yet'}</p>
                  </div>
                  <StatusBadge status={idea.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon="sparkle"
              title="No ideas for this song yet"
              description="Pick a preset and adapt it to this song."
              actions={
                <Link to="/library?pick=1" className="btn-primary btn-sm">
                  Browse presets
                </Link>
              }
            />
          )}
        </SectionCard>

        <SectionCard title="Planned posts" description={`${posts.length} in the calendar`} actions={<Link to="/calendar" className="btn-ghost btn-sm">Calendar</Link>}>
          {posts.length ? (
            <ul className="divide-y divide-ink-700/60">
              {posts.slice(0, 8).map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-text">{post.title}</p>
                    <p className="text-2xs text-slate-faint">
                      {formatShortDate(post.scheduled_date)} · {PLATFORM_LABELS[post.platform]}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-faint">Nothing scheduled. Generate a plan or add a post in the calendar.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Metadata packages" actions={<Link to={`/metadata?idea=${ideas[0]?.id ?? ''}`} className="btn-ghost btn-sm">Studio</Link>}>
          {packages.length ? (
            <ul className="divide-y divide-ink-700/60">
              {packages.map((pkg) => (
                <li key={pkg.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-text">{pkg.title}</p>
                    <p className="text-2xs text-slate-faint">
                      {PLATFORM_LABELS[pkg.platform]} · {pkg.status ?? 'draft'}
                    </p>
                  </div>
                  <Link to={`/metadata?package=${pkg.id}`} className="btn-secondary btn-sm">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-faint">No packages yet. Build them in Metadata Studio.</p>
          )}
        </SectionCard>

        <SectionCard title="Recorded results" description="Manually entered — never fetched from a platform">
          {results.length ? (
            <ul className="divide-y divide-ink-700/60">
              {results.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="text-slate-text">{PLATFORM_LABELS[record.platform]}</p>
                    <p className="text-2xs text-slate-faint">{formatShortDate(record.published_on)}</p>
                  </div>
                  <div className="text-right text-xs text-slate-muted">
                    <p>{record.views?.toLocaleString() ?? '—'} views</p>
                    <p className="text-2xs text-slate-faint">{record.saves ?? '—'} saves</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-faint">No results logged for this song.</p>
          )}
          <Link to="/journal?new=1" className="btn-secondary btn-sm mt-3">
            Log a result
          </Link>
        </SectionCard>
      </div>

      <p className="text-2xs text-slate-faint">
        Song id: <span className="font-mono">{song.id}</span> · created {formatDate(song.created_at)}
      </p>

      <SongFormModal open={editOpen} onClose={() => setEditOpen(false)} song={song} />
      <CampaignPlanModal open={planOpen} onClose={() => setPlanOpen(false)} initialSongId={song.id} onCreated={() => navigate('/calendar')} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this song?"
        description={
          <>
            <p>
              “{song.title}” will be removed. Ideas, planned posts and results that reference it stay in your workspace
              but lose the link.
            </p>
            <p className="text-slate-faint">Export a campaign file first if you want to keep the structure.</p>
          </>
        }
        confirmLabel="Delete song"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await removeSongs([song.id]);
          toast('Song deleted', { tone: 'success' });
          navigate('/songs');
        }}
      />
      <AudioAnalysisCard song={song} />
    </div>
  );
}
