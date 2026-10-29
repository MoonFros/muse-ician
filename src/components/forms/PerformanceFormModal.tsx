import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Select, TextArea, TextInput } from '../ui/forms';
import { useToast } from '../ui/Toast';
import type { PerformanceRecord, Platform } from '../../lib/types';
import { PLATFORMS, PLATFORM_LABELS, SCHEMA_VERSION } from '../../lib/types';
import { newId, nowIso, parseNumberInput, toDateKey } from '../../lib/utils';
import { useWorkspace } from '../../state/workspace';

interface NumberField {
  key: keyof Pick<
    PerformanceRecord,
    | 'views'
    | 'likes'
    | 'comments'
    | 'shares'
    | 'saves'
    | 'avg_watch_time_seconds'
    | 'completion_rate'
    | 'profile_visits'
    | 'link_clicks'
    | 'followers_attributed'
  >;
  label: string;
  hint?: string;
}

const FIELDS: NumberField[] = [
  { key: 'views', label: 'Views or plays', hint: 'Whatever the platform calls it.' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves or bookmarks' },
  { key: 'avg_watch_time_seconds', label: 'Average watch time (seconds)' },
  { key: 'completion_rate', label: 'Completion rate (%)', hint: '0–100. Leave blank if the platform does not show it.' },
  { key: 'profile_visits', label: 'Profile visits' },
  { key: 'link_clicks', label: 'Music-link clicks' },
  { key: 'followers_attributed', label: 'Followers attributed' },
];

export function PerformanceFormModal({
  open,
  onClose,
  record,
  defaultIdeaId,
}: {
  open: boolean;
  onClose: () => void;
  record?: PerformanceRecord | null;
  defaultIdeaId?: string;
}) {
  const { data, upsertPerformance } = useWorkspace();
  const { toast } = useToast();
  const [ideaId, setIdeaId] = useState('');
  const [songId, setSongId] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram-reels');
  const [postUrl, setPostUrl] = useState('');
  const [publishedOn, setPublishedOn] = useState('');
  const [collectedOn, setCollectedOn] = useState(toDateKey());
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdeaId(record?.content_idea_id ?? defaultIdeaId ?? '');
    setSongId(record?.song_id ?? '');
    setPlatform(record?.platform ?? 'instagram-reels');
    setPostUrl(record?.post_url ?? '');
    setPublishedOn(record?.published_on ?? '');
    setCollectedOn(record?.collected_on ?? toDateKey());
    setNotes(record?.notes ?? '');
    setValues(
      Object.fromEntries(
        FIELDS.map((field) => {
          const value = record?.[field.key];
          return [field.key, typeof value === 'number' ? String(value) : ''];
        }),
      ),
    );
  }, [defaultIdeaId, open, record]);

  const save = async () => {
    setSaving(true);
    const now = nowIso();
    const built: PerformanceRecord = {
      id: record?.id ?? newId('perf'),
      song_id: songId || null,
      content_idea_id: ideaId || null,
      planned_post_id: record?.planned_post_id ?? null,
      platform,
      post_url: postUrl.trim() || null,
      published_on: publishedOn || null,
      views: parseNumberInput(values.views ?? ''),
      likes: parseNumberInput(values.likes ?? ''),
      comments: parseNumberInput(values.comments ?? ''),
      shares: parseNumberInput(values.shares ?? ''),
      saves: parseNumberInput(values.saves ?? ''),
      avg_watch_time_seconds: parseNumberInput(values.avg_watch_time_seconds ?? ''),
      completion_rate: parseNumberInput(values.completion_rate ?? ''),
      profile_visits: parseNumberInput(values.profile_visits ?? ''),
      link_clicks: parseNumberInput(values.link_clicks ?? ''),
      followers_attributed: parseNumberInput(values.followers_attributed ?? ''),
      notes: notes.trim() || null,
      collected_on: collectedOn || null,
      is_demo: record?.is_demo ?? false,
      created_at: record?.created_at ?? now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    };
    try {
      await upsertPerformance([built]);
      toast(record ? 'Result updated' : 'Result logged', {
        tone: 'success',
        description: 'Only the numbers you entered are stored. muse-ician cannot fetch platform analytics.',
      });
      onClose();
    } catch {
      toast('The result could not be saved', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit recorded result' : 'Log a result'}
      description="Copy the numbers from the platform’s own analytics screen. Every field is optional — record only what you can see."
      size="lg"
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : record ? 'Save result' : 'Log result'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Content idea"
            placeholder="No idea linked"
            value={ideaId}
            onChange={(event) => {
              setIdeaId(event.target.value);
              const idea = data.content_ideas.find((item) => item.id === event.target.value);
              if (idea?.song_id) setSongId(idea.song_id);
            }}
            options={data.content_ideas.map((idea) => ({ value: idea.id, label: idea.title }))}
          />
          <Select
            label="Song"
            placeholder="No song linked"
            value={songId}
            onChange={(event) => setSongId(event.target.value)}
            options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
          />
          <Select
            label="Platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            options={PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
          />
          <TextInput
            label="Post URL"
            optional
            type="url"
            value={postUrl}
            onChange={(event) => setPostUrl(event.target.value)}
            placeholder="https://"
          />
          <TextInput
            label="Publication date"
            type="date"
            value={publishedOn}
            onChange={(event) => setPublishedOn(event.target.value)}
          />
          <TextInput
            label="Data collected on"
            type="date"
            value={collectedOn}
            onChange={(event) => setCollectedOn(event.target.value)}
            hint="Numbers keep changing. Note when you captured them."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((field) => (
            <TextInput
              key={field.key}
              label={field.label}
              optional
              inputMode="decimal"
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              hint={field.hint}
            />
          ))}
        </div>

        <TextArea
          label="Notes"
          optional
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything about the post that might explain the numbers — a comment thread, a reshare, a bad thumbnail."
        />
      </div>
    </Modal>
  );
}
