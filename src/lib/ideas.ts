import type { ContentIdea, IdeaSnapshot, IdeaVersion, Preset, Song } from './types';
import { SCHEMA_VERSION } from './types';
import { newId, nowIso } from './utils';

export interface IdeaOptions {
  song?: Song | null;
  mode?: ContentIdea['mode'];
  title?: string;
  platforms?: ContentIdea['platforms'];
  customization?: string;
}

function presetPlatforms(preset: Preset | null): ContentIdea['platforms'] {
  if (preset?.platforms?.length) return [...preset.platforms];
  return ['instagram-reels', 'tiktok', 'youtube-shorts'];
}

export function buildIdeaFromPreset(preset: Preset, options: IdeaOptions = {}): ContentIdea {
  const now = nowIso();
  const mode = options.mode ?? 'customized';
  const song = options.song ?? null;
  const customization = options.customization?.trim() ?? '';

  const concept = [
    preset.summary,
    customization ? `Your direction: ${customization}` : '',
    song ? `Song: ${song.title}${song.genre ? ` (${song.genre}${song.subgenre ? ` / ${song.subgenre}` : ''})` : ''}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: newId('idea'),
    title: options.title?.trim() || (song ? `${preset.title} — ${song.title}` : preset.title),
    song_id: song?.id ?? null,
    source_preset_id: preset.id,
    mode,
    concept_description: concept,
    hook: preset.hook_examples[0] ?? preset.title,
    intended_audience: song?.target_audience ?? null,
    scene_sequence: [...preset.execution_steps],
    shot_list: [...preset.shot_list],
    on_screen_text: preset.on_screen_text?.length ? [...preset.on_screen_text] : [preset.title],
    audio_section: song?.audio_sections?.[0]?.label ?? preset.audio_guidance ?? null,
    editing_notes: preset.editing_notes ?? null,
    call_to_action: preset.cta_examples[0] ?? null,
    platforms: options.platforms?.length ? [...options.platforms] : presetPlatforms(preset),
    estimated_production_minutes: preset.estimated_production_minutes ?? null,
    status: 'idea',
    scheduled_date: null,
    campaign_id: null,
    notes: customization ? `Customised from “${preset.title}”: ${customization}` : `Created from “${preset.title}”.`,
    coach_assessment: null,
    versions: [],
    is_demo: false,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };
}

export function buildCustomIdea(song?: Song | null): ContentIdea {
  const now = nowIso();
  return {
    id: newId('idea'),
    title: song ? `New idea for ${song.title}` : 'New idea',
    song_id: song?.id ?? null,
    source_preset_id: null,
    mode: 'from-scratch',
    concept_description: '',
    hook: '',
    intended_audience: song?.target_audience ?? null,
    scene_sequence: [],
    shot_list: [],
    on_screen_text: [],
    audio_section: null,
    editing_notes: null,
    call_to_action: null,
    platforms: ['instagram-reels', 'tiktok'],
    estimated_production_minutes: null,
    status: 'idea',
    scheduled_date: null,
    campaign_id: null,
    notes: null,
    coach_assessment: null,
    versions: [],
    is_demo: false,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };
}

export function toSnapshot(idea: ContentIdea): IdeaSnapshot {
  return {
    title: idea.title,
    concept_description: idea.concept_description,
    hook: idea.hook,
    scene_sequence: [...(idea.scene_sequence ?? [])],
    shot_list: [...(idea.shot_list ?? [])],
    on_screen_text: [...(idea.on_screen_text ?? [])],
    editing_notes: idea.editing_notes ?? '',
    call_to_action: idea.call_to_action ?? '',
    audio_section: idea.audio_section ?? '',
  };
}

export function createVersion(idea: ContentIdea, label?: string): IdeaVersion {
  return {
    id: newId('version'),
    label: label ?? `Saved ${new Date().toLocaleString()}`,
    created_at: nowIso(),
    snapshot: toSnapshot(idea),
  };
}

/** Apply a snapshot back onto an idea, leaving ids, links and assessments untouched. */
export function applySnapshot(idea: ContentIdea, snapshot: IdeaSnapshot): ContentIdea {
  return {
    ...idea,
    title: snapshot.title,
    concept_description: snapshot.concept_description,
    hook: snapshot.hook,
    scene_sequence: [...snapshot.scene_sequence],
    shot_list: [...snapshot.shot_list],
    on_screen_text: [...snapshot.on_screen_text],
    editing_notes: snapshot.editing_notes || null,
    call_to_action: snapshot.call_to_action || null,
    audio_section: snapshot.audio_section || null,
    // Edits invalidate the previous score: it was written against different text.
    coach_assessment: null,
    updated_at: nowIso(),
  };
}

export const EMPTY_SNAPSHOT: IdeaSnapshot = {
  title: '',
  concept_description: '',
  hook: '',
  scene_sequence: [],
  shot_list: [],
  on_screen_text: [],
  editing_notes: '',
  call_to_action: '',
  audio_section: '',
};

/** Rough completeness check used before running a review. */
/** Alias used by the calendar planner: build an idea from a preset with campaign linkage. */
export function buildIdea(options: {
  preset?: Preset | null;
  song?: Song | null;
  mode?: ContentIdea['mode'];
  title?: string;
  campaignId?: string | null;
  platforms?: ContentIdea['platforms'];
  customization?: string;
  hook?: string;
}): ContentIdea {
  const idea = options.preset
    ? buildIdeaFromPreset(options.preset, {
        song: options.song,
        mode: options.mode,
        title: options.title,
        platforms: options.platforms,
        customization: options.customization,
      })
    : buildCustomIdea(options.song ?? null);
  if (options.title) idea.title = options.title;
  if (options.campaignId) idea.campaign_id = options.campaignId;
  if (options.hook) idea.hook = options.hook;
  if (options.customization && !options.preset) {
    idea.concept_description = options.customization;
  }
  return idea;
}

/** Alias for createVersion. */
export const makeVersion = createVersion;

export function ideaGaps(idea: ContentIdea): string[] {
  const gaps: string[] = [];
  if (idea.concept_description.trim().length < 40) gaps.push('Describe the concept in at least a sentence or two.');
  if (idea.hook.trim().length < 8) gaps.push('Write the first line or on-screen text that stops the scroll.');
  if (!(idea.shot_list ?? []).length) gaps.push('Add at least one shot so the video is filmable.');
  if (!idea.call_to_action) gaps.push('Decide what the viewer should do at the end.');
  if (!idea.song_id) gaps.push('Link a song so the coach can judge song fit.');
  return gaps;
}
