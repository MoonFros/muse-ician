import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { ChoiceChips, Select, TagListInput, TextArea, TextInput } from '../ui/forms';
import { useToast } from '../ui/Toast';
import { useWorkspace } from '../../state/workspace';
import type {
  Budget,
  CampaignStage,
  Difficulty,
  FaceVisibility,
  FilmingMethod,
  Objective,
  Platform,
  Preset,
} from '../../lib/types';
import {
  BUDGETS,
  BUDGET_LABELS,
  CAMPAIGN_STAGES,
  CAMPAIGN_STAGE_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  FACE_VISIBILITY,
  FACE_VISIBILITY_LABELS,
  FILMING_METHODS,
  FILMING_METHOD_LABELS,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  PRESET_VERSION,
  SCHEMA_VERSION,
} from '../../lib/types';
import { newId, nowIso, parseListInput } from '../../lib/utils';

interface Draft {
  title: string;
  summary: string;
  description: string;
  objectives: Objective[];
  platforms: Platform[];
  minDuration: string;
  maxDuration: string;
  difficulty: Difficulty;
  budget: Budget;
  filming_methods: FilmingMethod[];
  face_visibility: FaceVisibility;
  equipment: string[];
  tags: string[];
  hook_examples: string;
  execution_steps: string;
  shot_list: string;
  on_screen_text: string;
  audio_guidance: string;
  editing_notes: string;
  cta_examples: string;
  variations: string;
  common_mistakes: string;
  accessibility_notes: string;
  campaign_stage: CampaignStage;
  estimated_minutes: string;
}

function toDraft(preset: Preset | null): Draft {
  return {
    title: preset?.title ?? '',
    summary: preset?.summary ?? '',
    description: preset?.description ?? '',
    objectives: preset?.objectives ?? ['discovery'],
    platforms: preset?.platforms ?? ['instagram-reels', 'tiktok'],
    minDuration: String(preset?.duration_seconds.min ?? 15),
    maxDuration: String(preset?.duration_seconds.max ?? 30),
    difficulty: preset?.difficulty ?? 'easy',
    budget: preset?.budget ?? 'minimal',
    filming_methods: preset?.filming_methods ?? ['live-action'],
    face_visibility: preset?.face_visibility ?? 'optional',
    equipment: preset?.equipment ?? ['phone'],
    tags: preset?.tags ?? [],
    hook_examples: (preset?.hook_examples ?? []).join('\n'),
    execution_steps: (preset?.execution_steps ?? []).join('\n'),
    shot_list: (preset?.shot_list ?? []).join('\n'),
    on_screen_text: (preset?.on_screen_text ?? []).join('\n'),
    audio_guidance: preset?.audio_guidance ?? '',
    editing_notes: preset?.editing_notes ?? '',
    cta_examples: (preset?.cta_examples ?? []).join('\n'),
    variations: (preset?.variations ?? []).join('\n'),
    common_mistakes: (preset?.common_mistakes ?? []).join('\n'),
    accessibility_notes: preset?.accessibility_notes ?? '',
    campaign_stage: preset?.campaign_stage ?? 'evergreen',
    estimated_minutes: preset?.estimated_production_minutes ? String(preset.estimated_production_minutes) : '',
  };
}

export function PresetFormModal({
  open,
  onClose,
  preset,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  preset: Preset | null;
  onSaved?: (preset: Preset) => void;
}) {
  const { upsertPresets } = useWorkspace();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(preset));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(toDraft(preset));
      setErrors({});
    }
  }, [open, preset]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim()) nextErrors.title = 'Give the preset a name.';
    if (draft.summary.trim().length < 10) nextErrors.summary = 'Summarise the format in one sentence.';
    if (draft.description.trim().length < 20) nextErrors.description = 'Describe what happens in the video.';
    if (!draft.objectives.length) nextErrors.objectives = 'Pick at least one objective.';
    if (!draft.platforms.length) nextErrors.platforms = 'Pick at least one platform.';
    if (!parseListInput(draft.hook_examples).length) nextErrors.hooks = 'Add one hook example.';
    if (!parseListInput(draft.execution_steps).length) nextErrors.steps = 'Add the steps to film it.';
    const min = Number(draft.minDuration);
    const max = Number(draft.maxDuration);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 5 || max < min) {
      nextErrors.duration = 'Use a minimum of at least 5 seconds and a maximum that is not smaller.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast('Check the highlighted fields', { tone: 'error' });
      return;
    }

    const now = nowIso();
    const record: Preset = {
      id: preset?.id ?? newId('preset'),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      objectives: draft.objectives,
      secondary_objectives: preset?.secondary_objectives ?? [],
      platforms: draft.platforms,
      duration_seconds: { min: Math.round(min), max: Math.round(max) },
      difficulty: draft.difficulty,
      budget: draft.budget,
      filming_methods: draft.filming_methods,
      face_visibility: draft.face_visibility,
      equipment: draft.equipment,
      tags: draft.tags,
      genre_tags: preset?.genre_tags ?? [],
      mood_tags: preset?.mood_tags ?? [],
      campaign_stage: draft.campaign_stage,
      song_context_required: preset?.song_context_required ?? null,
      hook_examples: parseListInput(draft.hook_examples),
      execution_steps: parseListInput(draft.execution_steps),
      shot_list: parseListInput(draft.shot_list),
      on_screen_text: parseListInput(draft.on_screen_text),
      audio_guidance: draft.audio_guidance.trim() || null,
      editing_notes: draft.editing_notes.trim() || null,
      cta_examples: parseListInput(draft.cta_examples),
      variations: parseListInput(draft.variations),
      common_mistakes: parseListInput(draft.common_mistakes),
      accessibility_notes: draft.accessibility_notes.trim() || null,
      example_metadata: preset?.example_metadata ?? null,
      estimated_production_minutes: draft.estimated_minutes ? Number(draft.estimated_minutes) || null : null,
      is_favorite: preset?.is_favorite ?? false,
      is_user_created: preset?.is_user_created ?? true,
      is_archived: preset?.is_archived ?? false,
      source_preset_id: preset?.source_preset_id ?? null,
      usage_count: preset?.usage_count ?? 0,
      is_demo: false,
      custom_note: preset?.custom_note ?? null,
      created_at: preset?.created_at ?? now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
      preset_version: preset?.preset_version ?? PRESET_VERSION,
    };

    setSaving(true);
    try {
      await upsertPresets([record]);
      toast(preset ? 'Preset updated' : 'Preset created', {
        tone: 'success',
        description: preset ? 'Your changes are saved in this browser.' : 'It appears in your library immediately.',
      });
      onSaved?.(record);
      onClose();
    } catch (error) {
      toast('The preset could not be saved', {
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
      title={preset ? 'Edit preset' : 'Create a preset'}
      description="A preset is a reusable video format. Write it once, then adapt it for any song."
      size="xl"
      busy={saving}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : preset ? 'Save preset' : 'Create preset'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Preset name"
            required
            value={draft.title}
            error={errors.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="The lyric that hits"
            autoFocus
          />
          <Select
            label="Campaign stage"
            value={draft.campaign_stage}
            onChange={(event) => update('campaign_stage', event.target.value as CampaignStage)}
            options={CAMPAIGN_STAGES.map((stage) => ({ value: stage, label: CAMPAIGN_STAGE_LABELS[stage] }))}
          />
        </div>

        <TextInput
          label="One-line summary"
          required
          value={draft.summary}
          error={errors.summary}
          onChange={(event) => update('summary', event.target.value)}
          placeholder="Show the one lyric people replay, on screen, with no performance."
        />

        <TextArea
          label="What actually happens"
          required
          rows={4}
          value={draft.description}
          error={errors.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Describe the video beat by beat: what the viewer sees first, what changes, how it ends."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <ChoiceChips
              label="Objectives"
              options={OBJECTIVES.map((objective) => ({ value: objective, label: OBJECTIVE_LABELS[objective] }))}
              value={draft.objectives}
              onChange={(value) => update('objectives', value)}
            />
            {errors.objectives ? <p className="mt-1 text-xs text-danger">{errors.objectives}</p> : null}
          </div>
          <div>
            <ChoiceChips
              label="Platforms"
              options={PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
              value={draft.platforms}
              onChange={(value) => update('platforms', value)}
            />
            {errors.platforms ? <p className="mt-1 text-xs text-danger">{errors.platforms}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput
            label="Min duration (seconds)"
            type="number"
            min={5}
            max={600}
            value={draft.minDuration}
            error={errors.duration}
            onChange={(event) => update('minDuration', event.target.value)}
          />
          <TextInput
            label="Max duration (seconds)"
            type="number"
            min={5}
            max={600}
            value={draft.maxDuration}
            onChange={(event) => update('maxDuration', event.target.value)}
          />
          <TextInput
            label="Production minutes"
            type="number"
            min={1}
            value={draft.estimated_minutes}
            onChange={(event) => update('estimated_minutes', event.target.value)}
            hint="Roughly how long filming and editing takes."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Difficulty"
            value={draft.difficulty}
            onChange={(event) => update('difficulty', event.target.value as Difficulty)}
            options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] }))}
          />
          <Select
            label="Budget"
            value={draft.budget}
            onChange={(event) => update('budget', event.target.value as Budget)}
            options={BUDGETS.map((value) => ({ value, label: BUDGET_LABELS[value] }))}
          />
        </div>

        <ChoiceChips
          label="Filming methods"
          options={FILMING_METHODS.map((value) => ({ value, label: FILMING_METHOD_LABELS[value] }))}
          value={draft.filming_methods}
          onChange={(value) => update('filming_methods', value)}
        />

        <Select
          label="Face visibility"
          value={draft.face_visibility}
          onChange={(event) => update('face_visibility', event.target.value as FaceVisibility)}
          options={FACE_VISIBILITY.map((value) => ({ value, label: FACE_VISIBILITY_LABELS[value] }))}
        />

        <TagListInput
          label="Equipment"
          value={draft.equipment}
          onChange={(value) => update('equipment', value)}
          placeholder="phone, tripod, lamp…"
        />
        <TagListInput
          label="Tags"
          value={draft.tags}
          onChange={(value) => update('tags', value)}
          placeholder="lyric, text-on-screen, single-take…"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea
            label="Hook examples"
            required
            rows={4}
            value={draft.hook_examples}
            error={errors.hooks}
            onChange={(event) => update('hook_examples', event.target.value)}
            hint="One per line. These become starting points, never auto-posted copy."
          />
          <TextArea
            label="Call-to-action examples"
            rows={4}
            value={draft.cta_examples}
            onChange={(event) => update('cta_examples', event.target.value)}
            hint="One per line."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea
            label="Execution steps"
            required
            rows={6}
            value={draft.execution_steps}
            error={errors.steps}
            onChange={(event) => update('execution_steps', event.target.value)}
            hint="One step per line, in order."
          />
          <TextArea
            label="Shot list"
            rows={6}
            value={draft.shot_list}
            onChange={(event) => update('shot_list', event.target.value)}
            hint="One shot per line."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea
            label="On-screen text"
            rows={3}
            value={draft.on_screen_text}
            onChange={(event) => update('on_screen_text', event.target.value)}
            hint="One line per entry."
          />
          <TextArea
            label="Variations"
            rows={3}
            value={draft.variations}
            onChange={(event) => update('variations', event.target.value)}
            hint="Ways to keep the format fresh."
          />
        </div>

        <TextInput
          label="Audio guidance"
          value={draft.audio_guidance}
          onChange={(event) => update('audio_guidance', event.target.value)}
          placeholder="Which part of the song to use"
        />
        <TextArea
          label="Editing notes"
          rows={3}
          value={draft.editing_notes}
          onChange={(event) => update('editing_notes', event.target.value)}
        />
        <TextArea
          label="Common mistakes"
          rows={3}
          value={draft.common_mistakes}
          onChange={(event) => update('common_mistakes', event.target.value)}
        />
        <TextArea
          label="Accessibility notes"
          rows={3}
          value={draft.accessibility_notes}
          onChange={(event) => update('accessibility_notes', event.target.value)}
          placeholder="Captions, text size, colour contrast, flashing…"
        />
      </div>
    </Modal>
  );
}
