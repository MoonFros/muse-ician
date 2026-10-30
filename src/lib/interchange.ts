import type {
  ContentIdea,
  ExportType,
  Manifest,
  MetadataPackage,
  PerformanceRecord,
  Preset,
  Song,
  WorkspaceData,
  WorkspacePayload,
} from './types';
import { SCHEMA_VERSION } from './types';
import { downloadTextFile, nowIso, safeJson, slugify, toDateKey } from './utils';

export const APP_VERSION = '1.0.0';

function manifestFor(
  name: string,
  description: string,
  notes?: string | null,
): Manifest {
  return {
    name,
    description,
    created_at: nowIso(),
    author: null,
    schema_version: SCHEMA_VERSION,
    exported_by: `muse-ician ${APP_VERSION}`,
    notes: notes ?? null,
  };
}

function withCounts(payload: WorkspacePayload): WorkspacePayload {
  const counts: Record<string, number> = {};
  for (const key of [
    'presets',
    'songs',
    'content_ideas',
    'metadata_packages',
    'campaigns',
    'planned_posts',
    'trends',
    'performance_records',
  ] as const) {
    const list = payload[key];
    if (Array.isArray(list)) counts[key] = list.length;
  }
  return { ...payload, manifest: { ...payload.manifest, record_counts: counts } };
}

export function buildPresetExport(
  presets: Preset[],
  type: Extract<ExportType, 'preset_pack' | 'single_preset'> = 'preset_pack',
  name?: string,
): WorkspacePayload {
  const title = name ?? (presets.length === 1 ? presets[0]?.title ?? 'Preset' : 'muse-ician preset pack');
  return withCounts({
    schema_version: SCHEMA_VERSION,
    export_type: type,
    manifest: manifestFor(
      title,
      presets.length === 1
        ? 'A single video concept preset exported from muse-ician.'
        : `${presets.length} video concept presets exported from muse-ician.`,
      'Import this file from Import / Export → Preset pack. Record ids are preserved, so re-importing updates the same presets if you choose "replace".',
    ),
    presets,
  });
}

export function buildMetadataExport(packages: MetadataPackage[]): WorkspacePayload {
  return withCounts({
    schema_version: SCHEMA_VERSION,
    export_type: 'metadata_package',
    manifest: manifestFor(
      `Metadata packages (${packages.length})`,
      'Platform publishing packages exported from muse-ician Metadata Studio.',
      'Each package references a content idea and/or song by id. If those records are not in your workspace the reference is flagged on import.',
    ),
    metadata_packages: packages,
  });
}

export function buildCampaignExport(
  data: WorkspaceData,
  options: { songId?: string | null; campaignId?: string | null; name?: string } = {},
): WorkspacePayload {
  const song = options.songId ? data.songs.find((item) => item.id === options.songId) : null;
  const campaign = options.campaignId
    ? data.campaigns.find((item) => item.id === options.campaignId)
    : null;
  const ideas = data.content_ideas.filter((idea) =>
    campaign
      ? idea.campaign_id === campaign.id
      : options.songId
        ? idea.song_id === options.songId
        : true,
  );
  const ideaIds = new Set(ideas.map((idea) => idea.id));
  const posts = data.planned_posts.filter((post) =>
    campaign
      ? post.campaign_id === campaign.id
      : options.songId
        ? post.song_id === options.songId
        : false,
  );
  const packages = data.metadata_packages.filter(
    (pkg) =>
      (pkg.content_idea_id && ideaIds.has(pkg.content_idea_id)) ||
      (options.songId ? pkg.song_id === options.songId : false),
  );
  const presets = data.presets.filter((preset) =>
    ideas.some((idea) => idea.source_preset_id === preset.id),
  );
  const songs = song ? [song] : [];

  return withCounts({
    schema_version: SCHEMA_VERSION,
    export_type: 'campaign_plan',
    manifest: manifestFor(
      options.name ?? (campaign?.name || (song ? `${song.title} campaign` : 'Campaign plan')),
      'A content campaign: the song, its ideas, the presets those ideas came from, planned posts and metadata packages.',
      'Import as a campaign plan to re-create the plan. Duplicate handling applies per record id.',
    ),
    ...(presets.length ? { presets } : {}),
    ...(songs.length ? { songs } : {}),
    ...(ideas.length ? { content_ideas: ideas } : {}),
    ...(packages.length ? { metadata_packages: packages } : {}),
    ...(campaign ? { campaigns: [campaign] } : {}),
    ...(posts.length ? { planned_posts: posts } : {}),
  });
}

export function buildWorkspaceBackup(data: WorkspaceData, name?: string): WorkspacePayload {
  return withCounts({
    schema_version: SCHEMA_VERSION,
    export_type: 'workspace_backup',
    manifest: manifestFor(
      name ?? `muse-ician workspace ${toDateKey()}`,
      'A complete backup of this browser’s muse-ician workspace, including preferences.',
      'Restore with Import / Export → Workspace backup. Importing never deletes records that are not in the file.',
    ),
    preferences: data.preferences,
    presets: data.presets,
    songs: data.songs,
    content_ideas: data.content_ideas,
    metadata_packages: data.metadata_packages,
    campaigns: data.campaigns,
    planned_posts: data.planned_posts,
    trends: data.trends,
    performance_records: data.performance_records,
  });
}

export function buildPerformanceExport(
  records: PerformanceRecord[],
  songs: Song[],
  ideas: ContentIdea[],
): WorkspacePayload {
  const songIds = new Set(records.map((record) => record.song_id).filter(Boolean));
  const ideaIds = new Set(records.map((record) => record.content_idea_id).filter(Boolean));
  return withCounts({
    schema_version: SCHEMA_VERSION,
    export_type: 'performance_snapshot',
    manifest: manifestFor(
      `Performance snapshot ${toDateKey()}`,
      'Manually recorded performance numbers exported for analysis in another tool.',
      'These numbers were typed in by hand. They are not verified by any platform.',
    ),
    songs: songs.filter((song) => songIds.has(song.id)),
    content_ideas: ideas.filter((idea) => ideaIds.has(idea.id)),
    performance_records: records,
  });
}

export function exportFilename(payload: WorkspacePayload, hint?: string): string {
  const base = slugify(hint ?? payload.manifest.name ?? payload.export_type) || payload.export_type;
  return `${base}-${toDateKey()}.json`;
}

export function downloadPayload(payload: WorkspacePayload, filename?: string): string {
  const name = filename ?? exportFilename(payload);
  downloadTextFile(name, safeJson(payload));
  return name;
}

/** The downloadable `example.json` template. */
export function buildExampleTemplate(templatePreset: Preset): WorkspacePayload {
  const now = nowIso();
  // A distinct id and placeholder title so importing the template never collides
  // with the user's own library and never looks like real seed content.
  const examplePreset: Preset = {
    ...templatePreset,
    id: 'preset-example-placeholder',
    title: 'Placeholder preset — copy this shape',
    summary:
      'PLACEHOLDER DATA — one sentence describing the video format. Replace this with a real format before using the pack.',
    is_user_created: false,
    usage_count: 0,
    is_demo: true,
    created_at: now,
    updated_at: now,
  };
  const song: Song = {
    id: 'song-example-placeholder',
    title: 'Placeholder Song Title',
    artist: 'Placeholder Artist Name',
    genre: 'indie pop',
    subgenre: 'bedroom pop',
    moods: ['melancholy', 'hopeful'],
    language: 'en',
    description:
      'PLACEHOLDER DATA — replace this with a real description. Two sentences about what the song is and how it sounds.',
    lyrics: null,
    themes: ['leaving a small town', 'outgrowing a friendship'],
    target_audience: 'Listeners aged 18–30 who follow independent singer-songwriters.',
    intended_listener_response: 'They should feel recognised rather than sad.',
    strongest_lyrics: ['I keep your coat on the wrong hook'],
    song_brief:
      'PLACEHOLDER DATA — the story behind the song in your own words: what it is about, reference points, and what not to say. Replace this.',
    audio_sections: [
      { label: 'Verse 2', timestamp: '0:48', note: 'Quietest moment before the chorus' },
      { label: 'Final chorus', timestamp: '2:10', note: 'Full arrangement, highest energy' },
    ],
    bpm: 92,
    musical_key: 'D major',
    release_status: 'upcoming',
    release_date: null,
    streaming_url: null,
    persona_notes: 'Placeholder persona notes. Remove these before using the template for real data.',
    visual_identity_notes: 'Muted greens, film grain, wide shots of empty rooms.',
    production_constraints: 'One phone, one room, no crew.',
    equipment: ['phone', 'phone-tripod', 'editing-software'],
    budget: 'minimal',
    filming_locations: ['bedroom', 'local park'],
    face_visibility: 'optional',
    animation_capability: false,
    posting_frequency: '3 posts per week',
    campaign_notes: 'PLACEHOLDER campaign note.',
    is_demo: true,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };

  const idea: ContentIdea = {
    id: 'idea-example-placeholder',
    title: 'Lyric wall — placeholder idea',
    song_id: song.id,
    source_preset_id: examplePreset.id,
    mode: 'use-as-is',
    concept_description:
      'PLACEHOLDER DATA — a short video built around the lyric "I keep your coat on the wrong hook". The camera starts on the empty hook, then tilts to the coat, then cuts to the vocal.',
    hook: 'This line is about the one thing I never moved out',
    intended_audience: 'Listeners who have recently left a shared home.',
    scene_sequence: ['Empty hook on a wall', 'Coat still hanging there', 'Cut to the sung line'],
    shot_list: ['Static shot of the hook', 'Slow tilt to the coat', 'Close-up on the vocal take'],
    on_screen_text: ['I keep your coat on the wrong hook'],
    audio_section: 'Verse 2 (0:48–1:02)',
    editing_notes: 'Two cuts, both on the beat. Hold the final frame for one second.',
    call_to_action: 'What is the thing you never moved out?',
    platforms: ['instagram-reels', 'tiktok', 'youtube-shorts'],
    estimated_production_minutes: 45,
    status: 'planning',
    scheduled_date: null,
    campaign_id: null,
    notes: 'PLACEHOLDER idea. Replace or delete before importing into a real campaign.',
    coach_assessment: null,
    versions: [],
    is_demo: true,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };

  const pkg: MetadataPackage = {
    id: 'meta-example-placeholder',
    content_idea_id: idea.id,
    song_id: song.id,
    platform: 'instagram-reels',
    tone: 'emotional',
    title: 'The thing I never moved out',
    caption:
      'PLACEHOLDER caption. One specific sentence about the line, then one ask.\n\nWhat is the thing you never moved out?',
    description: null,
    search_phrases: ['indie pop lyrics', 'songs about moving out', 'bedroom pop'],
    hashtags: [
      { tag: '#indiepop', reason: 'Genre term listeners search for' },
      { tag: '#lyrics', reason: 'Describes the format of the clip' },
    ],
    call_to_action: 'What is the thing you never moved out?',
    pinned_comment: 'Placeholder pinned comment — ask one answerable question.',
    thumbnail_concept: 'First frame: the empty hook, with the lyric in the lower third.',
    opening_overlay: 'I keep your coat on the wrong hook',
    alternative_hooks: ['The hook in my hallway is still full', 'This line is the whole song'],
    suggested_duration_seconds: 18,
    recommended_excerpt: 'Verse 2, 0:48–1:02',
    accessibility_notes: 'Burn in captions; keep the lyric text large enough to read on a phone.',
    rationale:
      'Placeholder rationale. On Reels the opening frame and burned-in text matter more than the caption.',
    source: 'manual',
    status: 'draft',
    is_demo: true,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };

  const instructions = [
    'HOW TO USE THIS TEMPLATE WITH AN AI TOOL',
    '',
    '1. Paste this entire file and the muse-ician schema (muse-ician.schema.json) into your AI tool, or use the "Copy AI import prompt" button in the app.',
    '2. Ask for one or more presets, songs, content ideas or metadata packages that follow this exact structure.',
    '3. The AI may generate: preset fields (title, summary, description, objectives, platforms, duration_seconds, difficulty, budget, filming_methods, face_visibility, equipment, tags, campaign_stage, hook_examples, execution_steps, shot_list, on_screen_text, audio_guidance, editing_notes, cta_examples, variations, common_mistakes, accessibility_notes, example_metadata), plus song, content_idea and metadata_package fields.',
    '4. The AI must NOT invent live trends, engagement statistics, view counts, sources, dates for trend evidence, or verified facts about real people. Use null or omit optional fields instead.',
    '5. Records are linked by id. Content ideas reference songs with song_id and presets with source_preset_id. Metadata packages reference content ideas with content_idea_id. References to ids that do not exist in the file are flagged on import, not invented.',
    '6. Keep schema_version "1.0.0" and a manifest. Return only JSON — no Markdown fences, no commentary.',
    '7. Placeholder values in this file are marked PLACEHOLDER or is_demo: true. Replace them before using the file for real work.',
  ].join('\n');

  return withCounts({
    schema_version: SCHEMA_VERSION,
    export_type: 'preset_pack',
    manifest: {
      name: 'Example Music Content Pack',
      description:
        'A sample pack demonstrating the muse-ician import format: one manifest, one preset, one song, one content idea and one metadata package. Every value is placeholder data.',
      created_at: now,
      author: 'Example Author',
      schema_version: SCHEMA_VERSION,
      exported_by: `muse-ician ${APP_VERSION}`,
      notes: instructions,
    },
    presets: [examplePreset],
    songs: [song],
    content_ideas: [idea],
    metadata_packages: [pkg],
    campaigns: [],
    planned_posts: [],
    trends: [],
    performance_records: [],
  });
}

export const AI_IMPORT_PROMPT = `You are generating structured content for muse-ician, an application for planning and optimizing independent musicians' social media videos.

Return only valid JSON matching the supplied muse-ician schema (schema_version 1.0.0). Do not include Markdown fences, explanations, or extra text.

Requirements:
- Generate original, practical, platform-aware ideas. Each preset must have a distinct creative purpose and a complete execution recipe (hook examples, execution steps, shot list, on-screen text, audio guidance, editing notes, CTA, variations, common mistakes, accessibility notes).
- Preserve supplied IDs when editing existing records. Use unique, lowercase, hyphenated IDs for new records (for example "preset-my-idea" or "idea-001").
- Do not invent live trends, performance statistics, sources, view counts, engagement numbers, or verified facts.
- Represent unknown values as null or omit optional fields according to the schema.
- Ensure all references, enum values, and required fields are valid. Reference songs with song_id, presets with source_preset_id, and content ideas with content_idea_id.
- Include a manifest with name, description, created_at and author, and set export_type to "preset_pack" unless told otherwise.
- Do not include any field that is not in the schema. Unknown fields are ignored with a warning.
- The output must be importable by muse-ician.

Reminder: muse-ician will validate this file against muse-ician.schema.json and will show the user a preview before anything is saved.`;

export interface AiPromptOptions {
  count: number;
  extraInstructions?: string;
  songContext?: string;
  lyrics?: string;
  existingIdeas?: string;
  exportType?: ExportType;
}

export function buildAiImportPrompt(options: AiPromptOptions): string {
  const lines = [AI_IMPORT_PROMPT, ''];
  lines.push(`TASK: Generate ${options.count} video concept preset${options.count === 1 ? '' : 's'}.`);
  lines.push(`Set export_type to "${options.exportType ?? 'preset_pack'}".`);
  if (options.songContext?.trim()) {
    lines.push('', 'SONG CONTEXT (use it, do not invent details beyond it):', options.songContext.trim());
  }
  if (options.lyrics?.trim()) {
    lines.push('', 'SELECTED LYRICS (treat as private content; do not fabricate additional lyrics):', options.lyrics.trim());
  }
  if (options.existingIdeas?.trim()) {
    lines.push('', 'IDEAS ALREADY COVERED (generate different ones):', options.existingIdeas.trim());
  }
  if (options.extraInstructions?.trim()) {
    lines.push('', 'ADDITIONAL INSTRUCTIONS FROM THE ARTIST:', options.extraInstructions.trim());
  }
  lines.push('', 'Return the JSON object only.');
  return lines.join('\n');
}
