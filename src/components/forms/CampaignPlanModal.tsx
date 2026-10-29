import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Checkbox, Select, TextInput } from '../ui/forms';
import { useToast } from '../ui/Toast';
import { useWorkspace } from '../../state/workspace';
import { buildCampaignPlan, suggestPresetSequence } from '../../lib/campaignPlan';
import { CAMPAIGN_STAGES, CAMPAIGN_STAGE_LABELS, type CampaignStage } from '../../lib/types';
import { addDays, formatShortDate, pluralize, toDateKey } from '../../lib/utils';

export function CampaignPlanModal({
  open,
  onClose,
  initialSongId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  initialSongId?: string;
  onCreated?: () => void;
}) {
  const { data, upsertCampaigns, upsertIdeas, upsertPosts, preferences } = useWorkspace();
  const { toast } = useToast();
  const [songId, setSongId] = useState(initialSongId ?? '');
  const [startDate, setStartDate] = useState(toDateKey());
  const [cadence, setCadence] = useState('2');
  const [count, setCount] = useState('8');
  const [stage, setStage] = useState<CampaignStage>('post-release');
  const [createIdeas, setCreateIdeas] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSongId(initialSongId ?? data.songs[0]?.id ?? '');
    setStartDate(toDateKey());
    // 8 posts every 2 days spans 15 days — the default example campaign.
    setCadence('2');
    setCount('8');
    setStage('post-release');
    setCreateIdeas(true);
    setName('');
  }, [data.songs, initialSongId, open, preferences.posting_cadence_days]);

  const song = data.songs.find((item) => item.id === songId) ?? null;
  const cadenceDays = Math.max(1, Math.min(30, Number(cadence) || preferences.posting_cadence_days));
  const postCount = Math.max(1, Math.min(30, Number(count) || 8));

  const preview = useMemo(
    () => suggestPresetSequence(data.presets, postCount),
    [data.presets, postCount],
  );

  const submit = async () => {
    if (!song) {
      toast('Choose a song first', { tone: 'error', description: 'Campaigns are always tied to a song record.' });
      return;
    }
    setSaving(true);
    try {
      const plan = buildCampaignPlan({
        song,
        presets: data.presets,
        startDate,
        cadenceDays,
        postCount,
        createIdeas,
        stage,
        name },
      );
      if (!plan.posts.length) {
        toast('No presets available', { tone: 'error' });
        return;
      }
      await upsertCampaigns([plan.campaign]);
      if (plan.ideas.length) await upsertIdeas(plan.ideas);
      await upsertPosts(plan.posts);
      toast('Campaign plan created', {
        tone: 'success',
        description: `${pluralize(plan.posts.length, 'planned post')} across ${
          (plan.posts.length - 1) * cadenceDays + 1
        } days. Nothing is published — these are planning records.`,
      });
      onCreated?.();
      onClose();
    } catch (error) {
      toast('The plan could not be saved', {
        tone: 'error',
        description: error instanceof Error ? error.message : 'Browser storage rejected the write.',
      });
    } finally {
      setSaving(false);
    }
  };

  const endDate = addDays(startDate, (Math.max(1, preview.length) - 1) * cadenceDays);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a campaign plan"
      description="The default is a 15-day plan: 8 posts, two days apart. Builds one idea and one planned post per preset, all editable afterwards in Content Calendar."
      size="lg"
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving || !data.songs.length}>
            {saving ? 'Building…' : `Plan ${preview.length} posts`}
          </button>
        </>
      }
    >
      {!data.songs.length ? (
        <div className="space-y-3 text-sm text-slate-muted">
          <p>Add a song first — a campaign is always tied to a real song record.</p>
          <Link to="/songs?new=1" className="btn-primary btn-sm" onClick={onClose}>
            Add a song
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Select
            label="Song"
            value={songId}
            onChange={(event) => setSongId(event.target.value)}
            options={data.songs.map((item) => ({ value: item.id, label: item.title }))}
            hint="Ideas and posts inherit this song, so the calendar, coach and metadata studio stay in sync."
          />

          <TextInput
            label="Campaign name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={song ? `${song.title} — 15-day campaign` : 'Campaign name'}
            hint="Optional. A name is generated from the song and length if left blank."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <TextInput
              label="Start date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value || toDateKey())}
            />
            <TextInput
              label="Days between posts"
              type="number"
              min={1}
              max={30}
              value={cadence}
              onChange={(event) => setCadence(event.target.value)}
              hint={`Spans ${(Math.max(1, preview.length) - 1) * cadenceDays + 1} days`}
            />
            <TextInput
              label="Number of posts"
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>

          <Select
            label="Campaign stage"
            value={stage}
            onChange={(event) => setStage(event.target.value as CampaignStage)}
            options={CAMPAIGN_STAGES.map((value) => ({ value, label: CAMPAIGN_STAGE_LABELS[value] }))}
            hint="Pre-release builds anticipation; post-release keeps a finished song alive."
          />

          <Checkbox
            label="Create a full content idea per post"
            hint="Off means the calendar shows preset titles only, and you write the ideas later."
            checked={createIdeas}
            onChange={setCreateIdeas}
          />

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-text">Sequence preview</p>
              <p className="text-2xs text-slate-faint">
                {formatShortDate(startDate)} → {formatShortDate(endDate)} · {pluralize(preview.length, 'post')}
              </p>
            </div>
            {preview.length ? (
              <ol className="mt-2 space-y-1.5 text-xs">
                {preview.map((preset, index) => (
                  <li key={preset.id} className="flex items-baseline gap-2">
                    <span className="w-16 shrink-0 tabular-nums text-slate-faint">
                      {formatShortDate(addDays(startDate, index * cadenceDays))}
                    </span>
                    <span className="text-slate-text">{preset.title}</span>
                    <span className="text-slate-faint">
                      · {preset.difficulty} · {preset.duration_seconds.min}–{preset.duration_seconds.max}s
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-xs text-slate-faint">
                No presets available. Restore the starter presets in Settings.
              </p>
            )}
            <p className="mt-2 text-2xs leading-relaxed text-slate-faint">
              Order follows your preset library, favouring a mix of stages. Every date is a planning record you can move.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
