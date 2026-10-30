import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Select, TextArea, TextInput } from '../ui/forms';
import { useToast } from '../ui/Toast';
import { useWorkspace } from '../../state/workspace';
import type { PlannedPost, Platform, WorkflowStatus } from '../../lib/types';
import {
  PLATFORMS,
  PLATFORM_LABELS,
  SCHEMA_VERSION,
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
} from '../../lib/types';
import { newId, nowIso, toDateKey } from '../../lib/utils';

const POST_STATUSES: WorkflowStatus[] = WORKFLOW_STATUSES.filter((status) => status !== 'reviewed');

export function PlannedPostModal({
  open,
  onClose,
  post,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  post?: PlannedPost | null;
  defaultDate?: string | null;
}) {
  const { data, upsertPosts, upsertIdeas } = useWorkspace();
  const { toast } = useToast();
  const [ideaId, setIdeaId] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram-reels');
  const [date, setDate] = useState(toDateKey());
  const [status, setStatus] = useState<WorkflowStatus>('idea');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const ideaOptions = useMemo(
    () => data.content_ideas.map((idea) => ({ value: idea.id, label: idea.title })),
    [data.content_ideas],
  );

  useEffect(() => {
    if (!open) return;
    setIdeaId(post?.content_idea_id ?? data.content_ideas[0]?.id ?? '');
    setPlatform(post?.platform ?? 'instagram-reels');
    setDate(post?.scheduled_date?.slice(0, 10) ?? defaultDate ?? toDateKey());
    setStatus(post?.status ?? 'idea');
    setTitle(post?.title ?? '');
    setNotes(post?.notes ?? '');
  }, [data.content_ideas, defaultDate, open, post]);

  const selectedIdea = data.content_ideas.find((idea) => idea.id === ideaId) ?? null;

  const submit = async () => {
    const resolvedTitle = title.trim() || selectedIdea?.title || 'Untitled post';
    const now = nowIso();
    const record: PlannedPost = {
      id: post?.id ?? newId('post'),
      content_idea_id: ideaId || null,
      song_id: selectedIdea?.song_id ?? post?.song_id ?? null,
      campaign_id: post?.campaign_id ?? selectedIdea?.campaign_id ?? null,
      metadata_package_id: post?.metadata_package_id ?? null,
      platform,
      scheduled_date: date,
      status,
      title: resolvedTitle,
      notes: notes.trim() || null,
      is_demo: post?.is_demo ?? false,
      created_at: post?.created_at ?? now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    };
    setSaving(true);
    try {
      await upsertPosts([record]);
      if (selectedIdea && selectedIdea.status === 'idea' && !['idea', 'archived'].includes(status)) {
        await upsertIdeas([{ ...selectedIdea, status, updated_at: now }]);
      }
      toast(post ? 'Post updated' : 'Post added to the calendar', {
        tone: 'success',
        description: 'Planning record only — muse-ician does not publish anywhere.',
      });
      onClose();
    } catch (error) {
      toast('The post could not be saved', {
        tone: 'error',
        description: error instanceof Error ? error.message : 'Browser storage rejected the write.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={post ? 'Edit planned post' : 'Plan a post'}
      description="A planning record for your own calendar. Nothing is posted to any platform."
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : post ? 'Save post' : 'Add to calendar'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Content idea"
          value={ideaId}
          onChange={(event) => setIdeaId(event.target.value)}
          placeholder={data.content_ideas.length ? 'No idea linked' : 'No ideas yet'}
          options={ideaOptions}
          hint={
            data.content_ideas.length
              ? 'Linking an idea keeps the calendar, coach and journal connected. It is optional.'
              : 'Create an idea first if you want the post to keep its concept and shots.'
          }
        />
        <TextInput
          label="Post title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={selectedIdea?.title ?? 'e.g. Lyric clip — Low Tide'}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            options={PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
          />
          <TextInput label="Scheduled date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as WorkflowStatus)}
          options={POST_STATUSES.map((value) => ({ value, label: WORKFLOW_LABELS[value] }))}
          hint="You update this yourself. It is not synced from any platform."
        />
        <TextArea
          label="Notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything you need on the day: location, outfit, caption reminder."
        />
        {selectedIdea?.song_id ? (
          <p className="text-2xs text-slate-faint">
            Song: {data.songs.find((song) => song.id === selectedIdea.song_id)?.title ?? 'linked song'}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
