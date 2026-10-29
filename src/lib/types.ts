/**
 * muse-ician domain model.
 *
 * Field names use snake_case on purpose: these records are the same shape that
 * the app imports, exports, validates against `public/muse-ician.schema.json`,
 * and hands to external AI tools. One representation avoids lossy mapping
 * layers and keeps export → import round trips exact.
 */

export const SCHEMA_VERSION = '1.0.0';
export const PRESET_VERSION = '1.0.0';

export const PLATFORMS = ['youtube-shorts', 'instagram-reels', 'tiktok'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  'youtube-shorts': 'YouTube Shorts',
  'instagram-reels': 'Instagram Reels',
  tiktok: 'TikTok',
};

export const OBJECTIVES = [
  'discovery',
  'song-promotion',
  'audience-engagement',
  'community-building',
  'storytelling',
  'artist-identity',
  'education',
  'behind-the-scenes',
  'trend-participation',
  'feedback-gathering',
] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const DIFFICULTIES = ['easy', 'moderate', 'challenging'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const BUDGETS = ['minimal', 'low', 'moderate', 'high'] as const;
export type Budget = (typeof BUDGETS)[number];

export const FILMING_METHODS = [
  'live-action',
  'animation',
  'screen-recording',
  'archival-footage',
  'static-text',
  'hybrid',
] as const;
export type FilmingMethod = (typeof FILMING_METHODS)[number];

export const FACE_VISIBILITY = ['required', 'optional', 'none'] as const;
export type FaceVisibility = (typeof FACE_VISIBILITY)[number];

export const CAMPAIGN_STAGES = ['pre-release', 'release-week', 'post-release', 'evergreen'] as const;
export type CampaignStage = (typeof CAMPAIGN_STAGES)[number];

export const WORKFLOW_STATUSES = [
  'idea',
  'planning',
  'scripted',
  'filming',
  'editing',
  'ready-to-publish',
  'published',
  'reviewed',
  'archived',
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  idea: 'Idea',
  planning: 'Planning',
  scripted: 'Scripted',
  filming: 'Filming',
  editing: 'Editing',
  'ready-to-publish': 'Ready to publish',
  published: 'Published',
  reviewed: 'Reviewed',
  archived: 'Archived',
};

export const RELEASE_STATUSES = ['unreleased', 'upcoming', 'released', 'archived'] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  unreleased: 'Unreleased',
  upcoming: 'Upcoming',
  released: 'Released',
  archived: 'Archived',
};

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  discovery: 'Discovery',
  'song-promotion': 'Song promotion',
  'audience-engagement': 'Audience engagement',
  'community-building': 'Community building',
  storytelling: 'Storytelling',
  'artist-identity': 'Artist identity',
  education: 'Education',
  'behind-the-scenes': 'Behind the scenes',
  'trend-participation': 'Trend participation',
  'feedback-gathering': 'Feedback gathering',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
};

export const BUDGET_LABELS: Record<Budget, string> = {
  minimal: 'Minimal',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export const FILMING_METHOD_LABELS: Record<FilmingMethod, string> = {
  'live-action': 'Live action',
  animation: 'Animation',
  'screen-recording': 'Screen recording',
  'archival-footage': 'Archival footage',
  'static-text': 'Static text',
  hybrid: 'Hybrid',
};

export const FACE_VISIBILITY_LABELS: Record<FaceVisibility, string> = {
  required: 'Face required',
  optional: 'Face optional',
  none: 'No face needed',
};

export const CAMPAIGN_STAGE_LABELS: Record<CampaignStage, string> = {
  'pre-release': 'Pre-release',
  'release-week': 'Release week',
  'post-release': 'Post-release',
  evergreen: 'Evergreen',
};

export const TONE_LABELS: Record<Tone, string> = {
  conversational: 'Conversational',
  funny: 'Funny',
  mysterious: 'Mysterious',
  emotional: 'Emotional',
  cinematic: 'Cinematic',
  direct: 'Direct',
  minimal: 'Minimal',
  storytelling: 'Storytelling',
};

export const TONES = [
  'conversational',
  'funny',
  'mysterious',
  'emotional',
  'cinematic',
  'direct',
  'minimal',
  'storytelling',
] as const;
export type Tone = (typeof TONES)[number];

export const TREND_CONFIDENCE = ['low', 'medium', 'high'] as const;
export type TrendConfidence = (typeof TREND_CONFIDENCE)[number];

export const IDEA_MODES = ['use-as-is', 'customized', 'from-scratch'] as const;
export type IdeaMode = (typeof IDEA_MODES)[number];

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const EXPORT_TYPES = [
  'preset_pack',
  'campaign_plan',
  'metadata_package',
  'workspace_backup',
  'single_preset',
  'performance_snapshot',
] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

export type ISODate = string;

export interface Manifest {
  name: string;
  description?: string | null;
  created_at: ISODate;
  author?: string | null;
  schema_version?: string;
  exported_by?: string | null;
  record_counts?: Record<string, number>;
  notes?: string | null;
}

export interface DurationRange {
  min: number;
  max: number;
}

export interface AudioSection {
  label: string;
  timestamp?: string | null;
  note?: string | null;
}

export interface ExampleMetadata {
  tone?: Tone | null;
  caption_example?: string | null;
  hashtag_examples?: string[];
  title_example?: string | null;
}

export interface Song {
  id: string;
  title: string;
  artist?: string | null;
  genre?: string | null;
  subgenre?: string | null;
  moods?: string[];
  language?: string | null;
  description?: string | null;
  lyrics?: string | null;
  themes?: string[];
  target_audience?: string | null;
  intended_listener_response?: string | null;
  strongest_lyrics?: string[];
  audio_sections?: AudioSection[];
  bpm?: number | null;
  musical_key?: string | null;
  release_status?: ReleaseStatus;
  release_date?: ISODate | null;
  cover_art_ref?: string | null;
  streaming_url?: string | null;
  music_video_url?: string | null;
  persona_notes?: string | null;
  visual_identity_notes?: string | null;
  production_constraints?: string | null;
  equipment?: string[];
  budget?: Budget | null;
  filming_locations?: string[];
  face_visibility?: FaceVisibility | null;
  animation_capability?: boolean | null;
  posting_frequency?: string | null;
  campaign_notes?: string | null;
  is_demo?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
}

export interface Preset {
  id: string;
  title: string;
  summary: string;
  description: string;
  objectives: Objective[];
  secondary_objectives?: Objective[];
  platforms: Platform[];
  duration_seconds: DurationRange;
  difficulty: Difficulty;
  budget: Budget;
  filming_methods: FilmingMethod[];
  face_visibility: FaceVisibility;
  equipment: string[];
  tags: string[];
  genre_tags?: string[];
  mood_tags?: string[];
  campaign_stage: CampaignStage;
  song_context_required?: string | null;
  hook_examples: string[];
  execution_steps: string[];
  shot_list: string[];
  on_screen_text?: string[];
  audio_guidance?: string | null;
  editing_notes?: string | null;
  cta_examples: string[];
  variations?: string[];
  common_mistakes?: string[];
  accessibility_notes?: string | null;
  example_metadata?: ExampleMetadata | null;
  estimated_production_minutes?: number | null;
  is_favorite?: boolean;
  is_user_created?: boolean;
  is_archived?: boolean;
  source_preset_id?: string | null;
  usage_count?: number;
  is_demo?: boolean;
  custom_note?: string | null;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
  preset_version?: string;
}

export type RubricComponentKey =
  | 'hook'
  | 'song_fit'
  | 'audience'
  | 'visual_progression'
  | 'feasibility'
  | 'distinctiveness';

export interface RubricComponent {
  key: RubricComponentKey;
  label: string;
  score: number;
  weight: number;
  explanation: string;
}

export interface ReadinessAssessment {
  score: number;
  confidence: ConfidenceLevel;
  components: RubricComponent[];
  rubric_version: string;
  disclaimer: string;
}

export interface Improvement {
  area: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CoachAssessment {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  hook_assessment: string;
  song_fit: string;
  audience_fit: string;
  feasibility: string;
  pacing_suggestions: string[];
  improvements: Improvement[];
  revised_concept: string;
  alternative_concept?: string | null;
  recommended_platforms: { platform: Platform; reason: string }[];
  next_steps: string[];
  readiness: ReadinessAssessment;
  source: 'ai' | 'local-heuristic';
  generated_at: ISODate;
}

export interface IdeaVersion {
  id: string;
  label: string;
  created_at: ISODate;
  snapshot: IdeaSnapshot;
}

export interface IdeaSnapshot {
  title: string;
  concept_description: string;
  hook: string;
  scene_sequence: string[];
  shot_list: string[];
  on_screen_text: string[];
  editing_notes: string;
  call_to_action: string;
  audio_section: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  song_id?: string | null;
  source_preset_id?: string | null;
  mode?: IdeaMode;
  concept_description: string;
  hook: string;
  intended_audience?: string | null;
  scene_sequence?: string[];
  shot_list?: string[];
  on_screen_text?: string[];
  audio_section?: string | null;
  editing_notes?: string | null;
  call_to_action?: string | null;
  platforms?: Platform[];
  estimated_production_minutes?: number | null;
  status: WorkflowStatus;
  scheduled_date?: ISODate | null;
  campaign_id?: string | null;
  notes?: string | null;
  coach_assessment?: CoachAssessment | null;
  versions?: IdeaVersion[];
  is_demo?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
}

export interface HashtagSuggestion {
  tag: string;
  reason?: string | null;
}

export interface MetadataPackage {
  id: string;
  content_idea_id?: string | null;
  song_id?: string | null;
  platform: Platform;
  tone: Tone;
  title: string;
  caption: string;
  description?: string | null;
  search_phrases?: string[];
  hashtags?: HashtagSuggestion[];
  call_to_action?: string | null;
  pinned_comment?: string | null;
  thumbnail_concept?: string | null;
  opening_overlay?: string | null;
  alternative_hooks?: string[];
  suggested_duration_seconds?: number | null;
  recommended_excerpt?: string | null;
  accessibility_notes?: string | null;
  rationale?: string | null;
  source?: 'ai' | 'local-template' | 'manual';
  status?: 'draft' | 'final';
  is_demo?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
}

export interface Campaign {
  id: string;
  name: string;
  song_id?: string | null;
  description?: string | null;
  start_date?: ISODate | null;
  end_date?: ISODate | null;
  posting_cadence_days?: number | null;
  stage?: CampaignStage;
  status?: 'active' | 'paused' | 'complete';
  is_demo?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
}

export interface PlannedPost {
  id: string;
  content_idea_id?: string | null;
  song_id?: string | null;
  campaign_id?: string | null;
  metadata_package_id?: string | null;
  platform: Platform;
  scheduled_date: ISODate;
  status: WorkflowStatus;
  title: string;
  notes?: string | null;
  is_demo?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
}

export interface TrendRecord {
  id: string;
  name: string;
  platform: Platform | string;
  description: string;
  source_name: string;
  source_url?: string | null;
  source_timestamp?: ISODate | null;
  observed_at: ISODate;
  geography?: string | null;
  keywords?: string[];
  evidence: string;
  song_id?: string | null;
  relevance_notes?: string | null;
  suggested_adaptation?: string | null;
  confidence: TrendConfidence;
  review_date?: ISODate | null;
  is_demo?: boolean;
  created_at: ISODate;
  schema_version?: string;
}

export interface PerformanceRecord {
  id: string;
  song_id?: string | null;
  content_idea_id?: string | null;
  planned_post_id?: string | null;
  platform: Platform;
  post_url?: string | null;
  published_on?: ISODate | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  avg_watch_time_seconds?: number | null;
  completion_rate?: number | null;
  profile_visits?: number | null;
  link_clicks?: number | null;
  followers_attributed?: number | null;
  notes?: string | null;
  collected_on?: ISODate | null;
  is_demo?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  schema_version?: string;
}

export interface UserPreferences {
  id: 'preferences';
  artist_name: string;
  persona: string;
  preferred_genres: string[];
  preferred_moods: string[];
  preferred_platforms: Platform[];
  budget: Budget | null;
  equipment: string[];
  filming_preferences: FilmingMethod[];
  visual_style: string;
  default_tone: Tone;
  language: string;
  posting_cadence_days: number;
  use_local_analysis: boolean;
  onboarding_complete: boolean;
  updated_at: ISODate;
  schema_version?: string;
}

export interface ImportManifest {
  schema_version: string;
  export_type: ExportType;
  manifest: Manifest;
  source_file?: string;
  imported_at?: ISODate;
}

export interface ExportManifest extends Manifest {
  schema_version: string;
  export_type: ExportType;
  exported_at: ISODate;
}

/** The envelope every import/export file uses. */
export interface WorkspacePayload {
  schema_version: string;
  export_type: ExportType;
  manifest: Manifest;
  presets?: Preset[];
  songs?: Song[];
  content_ideas?: ContentIdea[];
  metadata_packages?: MetadataPackage[];
  campaigns?: Campaign[];
  planned_posts?: PlannedPost[];
  trends?: TrendRecord[];
  performance_records?: PerformanceRecord[];
  preferences?: UserPreferences | null;
}

export type RecordKind =
  | 'presets'
  | 'songs'
  | 'content_ideas'
  | 'metadata_packages'
  | 'campaigns'
  | 'planned_posts'
  | 'trends'
  | 'performance_records';

/** Every stored record type keyed by collection name. */
export interface WorkspaceData {
  presets: Preset[];
  songs: Song[];
  content_ideas: ContentIdea[];
  metadata_packages: MetadataPackage[];
  campaigns: Campaign[];
  planned_posts: PlannedPost[];
  trends: TrendRecord[];
  performance_records: PerformanceRecord[];
  preferences: UserPreferences;
}

export interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
  at?: ISODate;
}

export type AiOperation =
  | 'generate-ideas'
  | 'customize-preset'
  | 'evaluate-concept'
  | 'create-filming-plan'
  | 'generate-metadata'
  | 'summarize-performance'
  | 'explain-trend';
