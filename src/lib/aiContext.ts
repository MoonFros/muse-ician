import type {
  ContentIdea,
  MetadataPackage,
  PerformanceRecord,
  Preset,
  Song,
  Tone,
  TrendRecord,
  UserPreferences,
} from './types';
import type { PerformanceSummary } from './insights';

/**
 * Curated AI context builders.
 *
 * Only the fields an operation needs are sent, and nothing from other songs,
 * campaigns or notes is included. The UI states exactly what is being shared
 * before the user presses an AI action.
 */

export function songContext(song?: Song | null) {
  if (!song) return null;
  return {
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    subgenre: song.subgenre,
    moods: song.moods,
    themes: song.themes,
    description: song.description,
    target_audience: song.target_audience,
    intended_listener_response: song.intended_listener_response,
    strongest_lyrics: song.strongest_lyrics,
    audio_sections: song.audio_sections,
    bpm: song.bpm,
    musical_key: song.musical_key,
    language: song.language,
    production_constraints: song.production_constraints,
    equipment: song.equipment,
    budget: song.budget,
    filming_locations: song.filming_locations,
    face_visibility: song.face_visibility,
    animation_capability: song.animation_capability,
    persona_notes: song.persona_notes,
    visual_identity_notes: song.visual_identity_notes,
  };
}

export function presetContext(preset?: Preset | null) {
  if (!preset) return null;
  return {
    id: preset.id,
    title: preset.title,
    summary: preset.summary,
    description: preset.description,
    objectives: preset.objectives,
    platforms: preset.platforms,
    duration_seconds: preset.duration_seconds,
    difficulty: preset.difficulty,
    execution_steps: preset.execution_steps,
    shot_list: preset.shot_list,
    hook_examples: preset.hook_examples,
    common_mistakes: preset.common_mistakes,
  };
}

export function ideaContext(
  idea: ContentIdea,
  song: Song | null | undefined,
  preset: Preset | null | undefined,
  preferences?: UserPreferences | null,
) {
  return {
    idea: {
      title: idea.title,
      hook: idea.hook,
      concept_description: idea.concept_description,
      intended_audience: idea.intended_audience,
      scene_sequence: idea.scene_sequence,
      shot_list: idea.shot_list,
      on_screen_text: idea.on_screen_text,
      audio_section: idea.audio_section,
      editing_notes: idea.editing_notes,
      call_to_action: idea.call_to_action,
      platforms: idea.platforms,
      estimated_production_minutes: idea.estimated_production_minutes,
      status: idea.status,
    },
    song: songContext(song),
    source_preset: presetContext(preset),
    artist_preferences: preferences
      ? {
          visual_style: preferences.visual_style,
          filming_preferences: preferences.filming_preferences,
          budget: preferences.budget,
          equipment: preferences.equipment,
          default_tone: preferences.default_tone,
          language: preferences.language,
        }
      : null,
  };
}

export function metadataContext(
  idea: ContentIdea,
  song: Song | null | undefined,
  preset: Preset | null | undefined,
  tone: Tone,
  platforms: MetadataPackage['platform'][],
) {
  return {
    tone,
    platforms,
    idea: {
      title: idea.title,
      hook: idea.hook,
      concept_description: idea.concept_description,
      on_screen_text: idea.on_screen_text,
      audio_section: idea.audio_section,
      call_to_action: idea.call_to_action,
      scene_sequence: idea.scene_sequence,
    },
    song: songContext(song),
    source_preset: preset ? { title: preset.title, platforms: preset.platforms } : null,
    constraints: {
      do_not_invent_trends: true,
      do_not_invent_links: true,
      note: 'Do not invent a streaming URL, statistics, trending sounds or personal stories. If a link is not supplied, leave it out.',
    },
  };
}

export function performanceContext(summary: PerformanceSummary, records: PerformanceRecord[]) {
  return {
    aggregated: {
      record_count: summary.recordCount,
      baseline_median_views: summary.baselineViews,
      by_platform: summary.byPlatform,
      by_category: summary.byCategory,
      by_song: summary.bySong,
      by_period: summary.byPeriod,
    },
    records: records.slice(0, 40).map((record) => ({
      platform: record.platform,
      published_on: record.published_on,
      views: record.views,
      likes: record.likes,
      comments: record.comments,
      shares: record.shares,
      saves: record.saves,
      completion_rate: record.completion_rate,
      content_idea_id: record.content_idea_id,
      notes: record.notes,
    })),
    constraints: {
      note: 'These numbers were typed in by hand and are not verified. Do not infer causation or predict future performance. Distinguish observed data from possible explanations and mention sample size.',
    },
  };
}

export function trendContext(trend: TrendRecord, song?: Song | null, preferences?: UserPreferences | null) {
  return {
    trend: {
      name: trend.name,
      platform: trend.platform,
      description: trend.description,
      source_name: trend.source_name,
      source_url: trend.source_url,
      source_timestamp: trend.source_timestamp,
      observed_at: trend.observed_at,
      geography: trend.geography,
      keywords: trend.keywords,
      evidence: trend.evidence,
      confidence: trend.confidence,
    },
    song: songContext(song),
    artist_preferences: preferences
      ? { filming_preferences: preferences.filming_preferences, visual_style: preferences.visual_style }
      : null,
    constraints: {
      note: 'Use only the evidence supplied above. Do not claim the format is currently trending beyond what the source timestamp supports. Do not promise reach.',
    },
  };
}

/** Human-readable summary of exactly what an AI request will contain. */
export function describeContext(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).filter((key) => payload[key] !== null && payload[key] !== undefined);
  return keys.join(', ');
}
