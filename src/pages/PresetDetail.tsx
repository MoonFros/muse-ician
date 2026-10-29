import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../components/ui/primitives';
import { ConfirmDialog } from '../components/ui/Modal';
import { PresetFormModal } from '../components/forms/PresetFormModal';
import { IdeaFromPresetModal } from '../components/forms/IdeaFromPresetModal';
import type { IdeaMode, Preset } from '../lib/types';
import { PLATFORM_LABELS } from '../lib/types';
import { buildPresetExport, downloadPayload, exportFilename } from '../lib/interchange';
import { formatDateTime, formatDuration, formatMinutes, newId, nowIso, relativeTime, truncate } from '../lib/utils';

function ListBlock({
  title,
  items,
  ordered,
  empty,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  empty?: string;
}) {
  return (
    <SectionCard title={title}>
      {items.length ? (
        ordered ? (
          <ol className="space-y-2">
            {items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2.5 text-sm leading-relaxed text-slate-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-600 text-2xs text-slate-faint">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2.5 text-sm leading-relaxed text-slate-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-sm text-slate-faint">{empty ?? 'Nothing recorded for this preset.'}</p>
      )}
    </SectionCard>
  );
}

export default function PresetDetailPage() {
  const { presetId } = useParams();
  const { data, upsertPresets, removePresets } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [useMode, setUseMode] = useState<IdeaMode | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const preset = data.presets.find((item) => item.id === presetId) ?? null;

  const relatedIdeas = useMemo(
    () => data.content_ideas.filter((idea) => idea.source_preset_id === presetId),
    [data.content_ideas, presetId],
  );

  if (!preset) {
    return (
      <EmptyState
        icon="library"
        title="Preset not found"
        description="It may have been deleted, or it came from an import that you cancelled."
        actions={
          <Link to="/library" className="btn-primary btn-sm">
            Back to the library
          </Link>
        }
      />
    );
  }

  const toggleFavorite = async () => {
    await upsertPresets([{ ...preset, is_favorite: !preset.is_favorite, updated_at: nowIso() }]);
  };

  const duplicate = async () => {
    const now = nowIso();
    const copy: Preset = {
      ...preset,
      id: newId('preset'),
      title: `${preset.title} (copy)`,
      is_user_created: true,
      is_favorite: false,
      usage_count: 0,
      source_preset_id: preset.id,
      created_at: now,
      updated_at: now,
    };
    await upsertPresets([copy]);
    toast('Preset duplicated', { tone: 'success' });
    navigate(`/library/${copy.id}`);
  };

  const exportJson = () => {
    const payload = buildPresetExport([preset], 'single_preset');
    const name = downloadPayload(payload, exportFilename(payload, preset.title));
    toast('Preset exported', { tone: 'success', description: name });
  };

  const archiveToggle = async () => {
    await upsertPresets([{ ...preset, is_archived: !preset.is_archived, updated_at: nowIso() }]);
    toast(preset.is_archived ? 'Preset restored' : 'Preset archived', { tone: 'success' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Preset"
        breadcrumbs={[{ label: 'Idea Library', to: '/library' }, { label: preset.title }]}
        title={preset.title}
        description={preset.summary}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => setUseMode('use-as-is')}>
              <Icon name="sparkle" size={15} />
              Use for a song
            </button>
            <button type="button" className="btn-secondary" onClick={() => setUseMode('customized')}>
              Customize my idea
            </button>
            <button
              type="button"
              className={`btn-icon ${preset.is_favorite ? 'text-warn' : ''}`}
              onClick={toggleFavorite}
              aria-pressed={Boolean(preset.is_favorite)}
              aria-label={preset.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
              title={preset.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Icon name={preset.is_favorite ? 'star-filled' : 'star'} size={16} />
            </button>
            <button type="button" className="btn-icon" onClick={() => setEditOpen(true)} aria-label="Edit preset" title="Edit preset">
              <Icon name="edit" size={16} />
            </button>
            <button type="button" className="btn-icon" onClick={duplicate} aria-label="Duplicate preset" title="Duplicate (creates your own editable copy)">
              <Icon name="copy" size={16} />
            </button>
            <button type="button" className="btn-icon" onClick={exportJson} aria-label="Export preset as JSON" title="Export JSON">
              <Icon name="download" size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={archiveToggle}
              aria-label={preset.is_archived ? 'Restore preset' : 'Archive preset'}
              title={preset.is_archived ? 'Restore preset' : 'Archive preset'}
            >
              <Icon name={preset.is_archived ? 'restore' : 'archive'} size={16} />
            </button>
            {preset.is_user_created ? (
              <button
                type="button"
                className="btn-icon text-danger"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete preset permanently"
                title="Delete permanently"
              >
                <Icon name="trash" size={16} />
              </button>
            ) : null}
          </>
        }
      />

      {preset.is_demo ? (
        <Callout tone="warning" title="This is a demo preset">
          It was created by demo mode and can be removed with the other demo records in Settings.
        </Callout>
      ) : null}
      {preset.is_archived ? (
        <Callout tone="neutral" title="Archived">
          This preset is hidden from the default library view. It still works if an idea references it.
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <SectionCard title="The concept">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-muted">{preset.description}</p>
            {preset.song_context_required ? (
              <p className="mt-3 rounded-lg border border-ink-700/60 bg-ink-900/50 px-3 py-2 text-xs text-slate-muted">
                <span className="font-medium text-slate-text">Song context needed: </span>
                {preset.song_context_required}
              </p>
            ) : null}
            {preset.custom_note ? (
              <p className="mt-3 text-xs text-slate-faint">Note: {preset.custom_note}</p>
            ) : null}
          </SectionCard>

          <ListBlock title="Example hooks" items={preset.hook_examples} />
          <ListBlock title="Execution steps" items={preset.execution_steps} ordered />
          <ListBlock title="Suggested shot list" items={preset.shot_list} ordered />
          <div className="grid gap-4 sm:grid-cols-2">
            <ListBlock title="On-screen text" items={preset.on_screen_text ?? []} />
            <ListBlock title="Call to action examples" items={preset.cta_examples} />
            <ListBlock title="Variations" items={preset.variations ?? []} />
            <ListBlock title="Common mistakes" items={preset.common_mistakes ?? []} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title="Audio guidance">
              <p className="text-sm leading-relaxed text-slate-muted">
                {preset.audio_guidance ?? 'No audio guidance recorded for this preset.'}
              </p>
            </SectionCard>
            <SectionCard title="Editing and pacing">
              <p className="text-sm leading-relaxed text-slate-muted">
                {preset.editing_notes ?? 'No editing notes recorded for this preset.'}
              </p>
            </SectionCard>
          </div>
          <SectionCard title="Accessibility">
            <p className="text-sm leading-relaxed text-slate-muted">
              {preset.accessibility_notes ?? 'No accessibility notes recorded. Assume captions are required.'}
            </p>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Practical detail">
            <dl className="space-y-3 text-sm">
              {[
                ['Objectives', preset.objectives.join(', ')],
                ['Also supports', (preset.secondary_objectives ?? []).join(', ') || '—'],
                ['Platforms', preset.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ')],
                ['Duration', formatDuration(preset.duration_seconds)],
                ['Difficulty', preset.difficulty],
                ['Budget', preset.budget],
                ['Production time', formatMinutes(preset.estimated_production_minutes)],
                ['Filming methods', preset.filming_methods.join(', ')],
                ['Face on camera', preset.face_visibility],
                ['Equipment', preset.equipment.join(', ') || '—'],
                ['Campaign stage', preset.campaign_stage],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-ink-700/50 pb-2.5 last:border-0 last:pb-0">
                  <dt className="text-xs text-slate-faint">{label}</dt>
                  <dd className="max-w-[60%] text-right text-xs capitalize text-slate-text">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {[...preset.tags, ...(preset.genre_tags ?? []), ...(preset.mood_tags ?? [])].map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          </SectionCard>

          {preset.example_metadata ? (
            <SectionCard title="Example metadata">
              <div className="space-y-3 text-xs text-slate-muted">
                {preset.example_metadata.title_example ? (
                  <p>
                    <span className="text-slate-faint">Title: </span>
                    {preset.example_metadata.title_example}
                  </p>
                ) : null}
                {preset.example_metadata.caption_example ? (
                  <p>
                    <span className="text-slate-faint">Caption: </span>
                    {preset.example_metadata.caption_example}
                  </p>
                ) : null}
                {preset.example_metadata.hashtag_examples?.length ? (
                  <p className="text-slate-faint">{preset.example_metadata.hashtag_examples.join(' ')}</p>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Record details">
            <dl className="space-y-2 text-xs text-slate-faint">
              <div className="flex justify-between gap-2">
                <dt>ID</dt>
                <dd className="font-mono text-slate-muted">{preset.id}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Created</dt>
                <dd>{formatDateTime(preset.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Updated</dt>
                <dd>{relativeTime(preset.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Schema</dt>
                <dd>{preset.schema_version ?? '1.0.0'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Preset version</dt>
                <dd>{preset.preset_version ?? '1.0.0'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Times used</dt>
                <dd>{preset.usage_count ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Source</dt>
                <dd>{preset.is_user_created ? 'Created by you' : 'Starter library'}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Ideas using this preset"
            description={`${relatedIdeas.length} linked`}
            actions={
              <Link to="/library" className="btn-ghost btn-sm">
                Library
              </Link>
            }
          >
            {relatedIdeas.length ? (
              <ul className="divide-y divide-ink-700/60">
                {relatedIdeas.map((idea) => {
                  const song = data.songs.find((item) => item.id === idea.song_id);
                  return (
                    <li key={idea.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <Link to={`/ideas/${idea.id}`} className="block truncate text-sm text-slate-text hover:text-accent-soft">
                          {idea.title}
                        </Link>
                        <p className="truncate text-2xs text-slate-faint">{song ? song.title : 'No song linked'}</p>
                      </div>
                      <StatusBadge status={idea.status} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-faint">
                No ideas yet. Use the preset to create one — {truncate(preset.summary, 80)}
              </p>
            )}
          </SectionCard>
        </div>
      </div>

      <IdeaFromPresetModal
        preset={preset}
        open={Boolean(useMode)}
        initialMode={useMode ?? 'use-as-is'}
        onClose={() => setUseMode(null)}
      />
      <PresetFormModal open={editOpen} onClose={() => setEditOpen(false)} preset={preset} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this preset?"
        description={
          <p>
            “{preset.title}” will be removed from this browser. Linked ideas keep their own copy of the concept.
          </p>
        }
        confirmLabel="Delete preset"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await removePresets([preset.id]);
          toast('Preset deleted', { tone: 'success' });
          navigate('/library');
        }}
      />
    </div>
  );
}
