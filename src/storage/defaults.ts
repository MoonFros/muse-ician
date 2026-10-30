import type { UserPreferences, WorkspaceData } from '../lib/types';
import { SCHEMA_VERSION } from '../lib/types';
import { nowIso } from '../lib/utils';

export function defaultPreferences(): UserPreferences {
  return {
    id: 'preferences',
    artist_name: '',
    persona: '',
    preferred_genres: [],
    preferred_moods: [],
    preferred_platforms: ['instagram-reels', 'tiktok', 'youtube-shorts'],
    budget: null,
    equipment: [],
    filming_preferences: [],
    visual_style: '',
    default_tone: 'conversational',
    language: 'en',
    posting_cadence_days: 3,
    use_local_analysis: true,
    include_lyrics_in_ai: false,
    onboarding_complete: false,
    updated_at: nowIso(),
    schema_version: SCHEMA_VERSION,
  };
}

export function emptyWorkspaceData(): WorkspaceData {
  return {
    presets: [],
    songs: [],
    content_ideas: [],
    metadata_packages: [],
    campaigns: [],
    planned_posts: [],
    trends: [],
    performance_records: [],
    preferences: defaultPreferences(),
  };
}

/** Normalise a preferences object coming from storage or an import. */
export function normalizePreferences(input: Partial<UserPreferences> | null | undefined): UserPreferences {
  const base = defaultPreferences();
  if (!input) return base;
  return {
    ...base,
    ...input,
    id: 'preferences',
    preferred_platforms: input.preferred_platforms?.length
      ? input.preferred_platforms
      : base.preferred_platforms,
    posting_cadence_days:
      typeof input.posting_cadence_days === 'number' && input.posting_cadence_days >= 1
        ? Math.min(60, Math.round(input.posting_cadence_days))
        : base.posting_cadence_days,
    updated_at: input.updated_at ?? nowIso(),
  };
}
