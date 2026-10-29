import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, Select, TagListInput, TextArea, TextInput } from '../ui/forms';
import { useToast } from '../ui/Toast';
import { useWorkspace } from '../../state/workspace';
import {
  BUDGETS,
  FACE_VISIBILITY,
  RELEASE_STATUSES,
  RELEASE_STATUS_LABELS,
  type Budget,
  type FaceVisibility,
  type ReleaseStatus,
  type Song,
} from '../../lib/types';
import { newId, nowIso, toDateKey } from '../../lib/utils';
import { SCHEMA_VERSION } from '../../lib/types';

interface Draft {
  title: string;
  artist: string;
  genre: string;
  subgenre: string;
  moods: string[];
  language: string;
  description: string;
  lyrics: string;
  themes: string[];
  target_audience: string;
  intended_listener_response: string;
  strongest_lyrics: string[];
  release_status: ReleaseStatus;
  release_date: string;
  streaming_url: string;
  music_video_url: string;
  persona_notes: string;
  visual_identity_notes: string;
  production_constraints: string;
  equipment: string[];
  budget: Budget | '';
  face_visibility: FaceVisibility | '';
  campaign_notes: string;
}

const FACE_OPTIONS = [
  { value: FACE_VISIBILITY[0], label: 'Face required' },
  { value: FACE_VISIBILITY[1], label: 'Face optional' },
  { value: FACE_VISIBILITY[2], label: 'No face needed' },
];

function toDraft(song: Song | null, defaults: { equipment: string[]; budget: Budget | null; language: string }): Draft {
  return {
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    genre: song?.genre ?? '',
    subgenre: song?.subgenre ?? '',
    moods: song?.moods ?? [],
    language: song?.language ?? defaults.language,
    description: song?.description ?? '',
    lyrics: song?.lyrics ?? '',
    themes: song?.themes ?? [],
    target_audience: song?.target_audience ?? '',
    intended_listener_response: song?.intended_listener_response ?? '',
    strongest_lyrics: song?.strongest_lyrics ?? [],
    release_status: song?.release_status ?? 'unreleased',
    release_date: song?.release_date ?? '',
    streaming_url: song?.streaming_url ?? '',
    music_video_url: song?.music_video_url ?? '',
    persona_notes: song?.persona_notes ?? '',
    visual_identity_notes: song?.visual_identity_notes ?? '',
    production_constraints: song?.production_constraints ?? '',
    equipment: song?.equipment ?? defaults.equipment,
    budget: song?.budget ?? defaults.budget ?? '',
    face_visibility: song?.face_visibility ?? '',
    campaign_notes: song?.campaign_notes ?? '',
  };
}

export function SongFormModal({
  open,
  onClose,
  song = null,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  song?: Song | null;
  onSaved?: (song: Song) => void;
}) {
  const { preferences, saveSong } = useWorkspace();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(song, preferences));
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(toDraft(song, preferences));
      setAdvanced(Boolean(song));
    }
  }, [open, preferences, song]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const title = draft.title.trim();
    if (!title) {
      toast('A song needs a title', { tone: 'error' });
      return;
    }
    setSaving(true);
    const now = nowIso();
    const record: Song = {
      id: song?.id ?? newId('song'),
      title,
      artist: draft.artist.trim() || preferences.artist_name || null,
      genre: draft.genre.trim() || null,
      subgenre: draft.subgenre.trim() || null,
      moods: draft.moods,
      language: draft.language.trim() || null,
      description: draft.description.trim() || null,
      lyrics: draft.lyrics.trim() || null,
      themes: draft.themes,
      target_audience: draft.target_audience.trim() || null,
      intended_listener_response: draft.intended_listener_response.trim() || null,
      strongest_lyrics: draft.strongest_lyrics,
      audio_sections: song?.audio_sections ?? [],
      bpm: song?.bpm ?? null,
      musical_key: song?.musical_key ?? null,
      release_status: draft.release_status,
      release_date: draft.release_date || null,
      cover_art_ref: song?.cover_art_ref ?? null,
      streaming_url: draft.streaming_url.trim() || null,
      music_video_url: draft.music_video_url.trim() || null,
      persona_notes: draft.persona_notes.trim() || null,
      visual_identity_notes: draft.visual_identity_notes.trim() || null,
      production_constraints: draft.production_constraints.trim() || null,
      equipment: draft.equipment,
      budget: draft.budget || null,
      filming_locations: song?.filming_locations ?? [],
      face_visibility: draft.face_visibility || null,
      animation_capability: song?.animation_capability ?? null,
      posting_frequency: song?.posting_frequency ?? null,
      campaign_notes: draft.campaign_notes.trim() || null,
      is_demo: song?.is_demo ?? false,
      created_at: song?.created_at ?? now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    };
    try {
      await saveSong(record);
      toast(song ? 'Song updated' : 'Song added', {
        tone: 'success',
        description: 'Saved in this browser. Ideas and posts can now link to it.',
      });
      onSaved?.(record);
      onClose();
    } catch (error) {
      toast('Could not save the song', {
        tone: 'error',
        description: error instanceof Error ? error.message : 'The browser storage rejected the write.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={song ? 'Edit song' : 'Add a song'}
      description="Only the title is required. Everything else sharpens the ideas and metadata muse-ician can suggest — and you can add it later."
      size="lg"
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : song ? 'Save changes' : 'Add song'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Song title"
            required
            value={draft.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="e.g. Low Tide"
            autoFocus
          />
          <TextInput
            label="Artist / project name"
            value={draft.artist}
            onChange={(event) => update('artist', event.target.value)}
            placeholder={preferences.artist_name || 'Your name'}
            hint="Defaults to the artist name in Settings."
          />
          <TextInput label="Genre" value={draft.genre} onChange={(event) => update('genre', event.target.value)} placeholder="indie pop" />
          <TextInput
            label="Subgenre"
            value={draft.subgenre}
            onChange={(event) => update('subgenre', event.target.value)}
            placeholder="bedroom pop"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Release status"
            value={draft.release_status}
            onChange={(event) => update('release_status', event.target.value as ReleaseStatus)}
            options={RELEASE_STATUSES.map((status) => ({ value: status, label: RELEASE_STATUS_LABELS[status] }))}
          />
          <TextInput
            label="Release date"
            type="date"
            value={draft.release_date ?? ''}
            onChange={(event) => update('release_date', event.target.value)}
            hint={draft.release_status === 'upcoming' ? 'Drives the countdown on your dashboard.' : undefined}
          />
        </div>

        <Field label="What is the song about?" hint="Plain language is fine. This becomes context for ideas and captions.">
          <TextArea
            rows={3}
            value={draft.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="A song about leaving a shared flat and realising you were the last one to notice it was over."
          />
        </Field>

        <TagListInput
          label="Themes"
          value={draft.themes}
          onChange={(value) => update('themes', value)}
          placeholder="leaving home, outgrowing a friendship…"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Who is this for?">
            <TextArea
              rows={2}
              value={draft.target_audience}
              onChange={(event) => update('target_audience', event.target.value)}
              placeholder="Listeners in their twenties who follow independent singer-songwriters."
            />
          </Field>
          <Field label="What should they feel?">
            <TextArea
              rows={2}
              value={draft.intended_listener_response}
              onChange={(event) => update('intended_listener_response', event.target.value)}
              placeholder="Recognition rather than sadness."
            />
          </Field>
        </div>

        <TagListInput
          label="Strongest lyrics"
          value={draft.strongest_lyrics}
          onChange={(value) => update('strongest_lyrics', value)}
          placeholder="Add a line and press Enter"
          hint="One line per entry. These become hook options in the metadata studio."
        />
        <TagListInput
          label="Moods"
          value={draft.moods}
          onChange={(value) => update('moods', value)}
          placeholder="melancholy, hopeful…"
        />

        <button
          type="button"
          className="btn-ghost btn-sm -ml-1"
          onClick={() => setAdvanced((current) => !current)}
          aria-expanded={advanced}
        >
          {advanced ? 'Hide production details' : 'Add production details'}
        </button>

        {advanced ? (
          <div className="space-y-4 rounded-xl border border-ink-700/70 bg-ink-900/40 p-3.5">
            <Field
              label="Lyrics"
              hint="Stored only in this browser. Never sent anywhere unless you copy an AI prompt that includes them."
            >
              <TextArea
                rows={5}
                value={draft.lyrics}
                onChange={(event) => update('lyrics', event.target.value)}
                placeholder="Paste the lyric sheet if you want line-level ideas."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Streaming link"
                type="url"
                value={draft.streaming_url}
                onChange={(event) => update('streaming_url', event.target.value)}
                placeholder="https://"
                hint="Used verbatim in exports. muse-ician never invents a link."
              />
              <TextInput
                label="Music video link"
                type="url"
                value={draft.music_video_url}
                onChange={(event) => update('music_video_url', event.target.value)}
                placeholder="https://"
              />
              <Select
                label="Budget"
                placeholder="Not specified"
                value={draft.budget}
                onChange={(event) => update('budget', event.target.value as Budget | '')}
                options={BUDGETS.map((budget) => ({ value: budget, label: budget }))}
              />
              <Select
                label="Face on camera"
                placeholder="Not specified"
                value={draft.face_visibility}
                onChange={(event) => update('face_visibility', event.target.value as Draft['face_visibility'])}
                options={FACE_OPTIONS}
              />
            </div>
            <TagListInput
              label="Equipment available"
              value={draft.equipment}
              onChange={(value) => update('equipment', value)}
              placeholder="phone, tripod…"
            />
            <Field label="Constraints worth remembering">
              <TextArea
                rows={2}
                value={draft.production_constraints}
                onChange={(event) => update('production_constraints', event.target.value)}
                placeholder="Can only film after 9pm. No second room. One usable take per line."
              />
            </Field>
            <Field label="Campaign notes">
              <TextArea
                rows={2}
                value={draft.campaign_notes}
                onChange={(event) => update('campaign_notes', event.target.value)}
                placeholder="What this campaign is trying to do."
              />
            </Field>
            <p className="text-2xs text-slate-faint">Last release date default: {toDateKey()} is today.</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
