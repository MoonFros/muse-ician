import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { ChoiceChips, Field, Select, TextArea, TextInput } from '../ui/forms';
import { useToast } from '../ui/Toast';
import { useWorkspace } from '../../state/workspace';
import type { ContentIdea, IdeaMode, Platform, Preset } from '../../lib/types';
import { PLATFORMS, PLATFORM_LABELS } from '../../lib/types';
import { buildIdeaFromPreset } from '../../lib/ideas';

const MODES: { value: IdeaMode; label: string; description: string }[] = [
  {
    value: 'use-as-is',
    label: 'Use as is',
    description: 'Take the preset steps and shot list exactly as written. Fastest path to filming.',
  },
  {
    value: 'customized',
    label: 'Customise',
    description: 'Keep the structure but rewrite the hook, shots or tone for your song.',
  },
  {
    value: 'from-scratch',
    label: 'Start from the concept only',
    description: 'Begin with the idea and write every field yourself.',
  },
];

export function IdeaFromPresetModal({
  preset,
  open,
  onClose,
  initialMode = 'use-as-is',
}: {
  preset: Preset | null;
  open: boolean;
  onClose: () => void;
  initialMode?: IdeaMode;
}) {
  const { data, upsertIdeas } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<IdeaMode>(initialMode);
  const [songId, setSongId] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [customization, setCustomization] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSongId(data.songs[0]?.id ?? '');
    setPlatforms(preset?.platforms ?? ['instagram-reels']);
    setCustomization('');
    setTitle(preset?.title ?? '');
  }, [data.songs, initialMode, open, preset]);

  if (!preset) return null;

  const create = async () => {
    const song = data.songs.find((item) => item.id === songId) ?? null;
    setSaving(true);
    try {
      const idea: ContentIdea = buildIdeaFromPreset(preset, {
        song,
        mode,
        platforms,
        customization: mode === 'from-scratch' ? '' : customization,
        title: title.trim() || undefined,
      });
      if (mode === 'from-scratch') {
        idea.scene_sequence = [];
        idea.shot_list = [];
        idea.concept_description = customization.trim()
          ? `Your direction: ${customization.trim()}`
          : `Based on the “${preset.title}” concept.`;
        idea.hook = '';
      }
      await upsertIdeas([idea]);
      toast('Idea created', {
        tone: 'success',
        description: 'It is not published anywhere. Next: fill in the shots, then run a readiness review.',
      });
      onClose();
      navigate(`/ideas/${idea.id}`);
    } catch (error) {
      toast('The idea could not be saved', {
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
      title={`Create an idea from “${preset.title}”`}
      description="This copies the preset into your own editable record. The preset itself is never changed."
      size="lg"
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={create} disabled={saving}>
            {saving ? 'Creating…' : 'Create idea'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Idea title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={preset.title}
          hint="Used in the calendar, coach and metadata studio. You can rename it later."
        />

        <Select
          label="Song this is for"
          value={songId}
          onChange={(event) => setSongId(event.target.value)}
          placeholder={data.songs.length ? 'No song (standalone idea)' : 'No songs yet'}
          options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
          hint={
            data.songs.length
              ? 'Linked ideas get song-fit scoring, metadata suggestions and campaign grouping.'
              : 'Add a song first if you want the coach to judge song fit. Standalone ideas still work.'
          }
        />

        <ChoiceChips
          label="Platforms"
          options={PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
          value={platforms}
          onChange={(next) => setPlatforms(next as Platform[])}
          hint="Used to keep the calendar and metadata studio relevant."
        />

        <fieldset>
          <legend className="field-label">How much do you want to change?</legend>
          <div className="space-y-2">
            {MODES.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  mode === option.value
                    ? 'border-accent/50 bg-accent-dim/40'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.10]'
                }`}
              >
                <input
                  type="radio"
                  name="idea-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="mt-1 h-4 w-4 accent-[#a78bfa]"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-text">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode !== 'use-as-is' ? (
          <Field
            label={mode === 'from-scratch' ? 'What is the idea?' : 'What should be different?'}
            hint="Your words are kept in the concept and notes so you can see what changed."
          >
            <TextArea
              rows={3}
              value={customization}
              onChange={(event) => setCustomization(event.target.value)}
              placeholder={
                mode === 'from-scratch'
                  ? 'A 20-second clip of me explaining the line nobody understands, filmed on the stairs.'
                  : 'Rewrite the hook so it mentions the lyric, and shoot it in one take with no cuts.'
              }
            />
          </Field>
        ) : null}

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-slate-muted">
          <p className="font-medium text-slate-text">Copied into the idea</p>
          <p className="mt-0.5">
            {preset.execution_steps.length} steps · {preset.shot_list.length} shots ·{' '}
            {preset.on_screen_text?.length ?? 0} on-screen lines · {preset.hook_examples.length} hook options
          </p>
          <p className="mt-1 text-slate-faint">
            Duration guide {preset.duration_seconds.min}–{preset.duration_seconds.max}s · {preset.difficulty} ·{' '}
            {preset.filming_methods.join(', ')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
