import type {
  Campaign,
  ContentIdea,
  MetadataPackage,
  PerformanceRecord,
  PlannedPost,
  Preset,
  Song,
  WorkflowStatus,
} from '../lib/types';
import { SCHEMA_VERSION } from '../lib/types';
import { addDays, nowIso, toDateKey } from '../lib/utils';
import { buildLocalAssessment } from '../lib/analysis';
import { buildLocalMetadata, makeMetadataPackage } from '../lib/metadataTemplates';

/**
 * Demo data is explicit, labelled (`is_demo: true`) and removable in one click
 * from the dashboard or Settings. Nothing here claims to be the user's own data,
 * and no performance numbers are presented as real analytics — they are sample
 * records so the Performance Journal has something to compare.
 */

export interface DemoBundle {
  songs: Song[];
  campaigns: Campaign[];
  content_ideas: ContentIdea[];
  metadata_packages: MetadataPackage[];
  planned_posts: PlannedPost[];
  performance_records: PerformanceRecord[];
}

const PLAN: { presetId: string; dayOffset: number; status: WorkflowStatus; platform: PlannedPost['platform'] }[] = [
  { presetId: 'preset-direct-introduction', dayOffset: 0, status: 'published', platform: 'instagram-reels' },
  { presetId: 'preset-lyric-that-hits', dayOffset: 1, status: 'published', platform: 'tiktok' },
  { presetId: 'preset-behind-the-song', dayOffset: 3, status: 'editing', platform: 'youtube-shorts' },
  { presetId: 'preset-relatable-pov', dayOffset: 5, status: 'filming', platform: 'instagram-reels' },
  { presetId: 'preset-unfinished-version', dayOffset: 7, status: 'scripted', platform: 'tiktok' },
  { presetId: 'preset-song-dissected', dayOffset: 9, status: 'planning', platform: 'youtube-shorts' },
  { presetId: 'preset-one-line-interpretation', dayOffset: 11, status: 'planning', platform: 'instagram-reels' },
  { presetId: 'preset-comment-chooses-next', dayOffset: 14, status: 'idea', platform: 'tiktok' },
];

const IDEA_COPY: Record<string, { title: string; hook: string; description: string; audience: string }> = {
  'preset-direct-introduction': {
    title: 'Low Tide — introduction for first-time listeners',
    hook: 'This song is for anyone who waited for someone to change their mind',
    description:
      'Open on the song title card for one second, cut straight to the pre-chorus performed to camera, then a single sentence about who the song is for. Close on the song name and where to hear it.',
    audience: 'Listeners who found one song and want to know what the artist is about.',
  },
  'preset-lyric-that-hits': {
    title: 'The coat on the wrong hook',
    hook: 'This line took four months to write',
    description:
      'Show the empty coat hook in the hallway, type the lyric in two beats, and time the last word to the vocal. Hold the finished frame so it can be screenshotted.',
    audience: 'People who have recently left a shared home.',
  },
  'preset-behind-the-song': {
    title: 'Why the bridge is a phone recording',
    hook: 'The bridge you hear is a phone memo from 3am',
    description:
      'Explain the decision to keep the phone recording instead of the studio take, show the file timestamp, then play the four seconds that survived.',
    audience: 'Songwriters and listeners who like knowing how records are made.',
  },
  'preset-relatable-pov': {
    title: 'POV: you are fine until this song comes on',
    hook: 'POV: you are fine until this song comes on in the car',
    description:
      'Film a static shot from the passenger seat, song entering when the chorus line lands, then cut to the reaction shot.',
    audience: 'Listeners who use music to finally feel something after a long week.',
  },
  'preset-unfinished-version': {
    title: 'Voice memo vs final mix',
    hook: 'The voice memo is nine months older than the finished song',
    description:
      'Play the same phrase from the 2025 voice memo and the final mix, cut on the same word, label both with dates.',
    audience: 'Producers and bedroom-pop listeners curious about process.',
  },
  'preset-song-dissected': {
    title: 'Four bass notes carry the chorus',
    hook: 'Four bass notes are doing all the work in this chorus',
    description:
      'Solo the bass, add drums, then reveal the full mix on the downbeat. Label each stage on screen.',
    audience: 'Producers and music students.',
  },
  'preset-one-line-interpretation': {
    title: 'What does this line mean to you?',
    hook: 'Tell me what this line means to you',
    description:
      'Show the lyric on a plain background with the verse underneath, ask one question, and pin the best answer.',
    audience: 'Comment-heavy listeners who like analysing lyrics.',
  },
  'preset-comment-chooses-next': {
    title: 'A comment picked this video',
    hook: 'Someone asked for the acoustic version, so here it is',
    description:
      'Show the comment, perform the requested acoustic verse, and ask for the next request.',
    audience: 'Return viewers who want to steer the next post.',
  },
};

export function buildDemoBundle(presets: Preset[], startDate = toDateKey()): DemoBundle {
  const now = nowIso();
  const presetById = new Map(presets.map((preset) => [preset.id, preset]));
  const songId = 'demo-song-low-tide';

  const song: Song = {
    id: songId,
    title: 'Low Tide (demo record)',
    artist: 'Demo Artist',
    genre: 'indie pop',
    subgenre: 'bedroom pop',
    moods: ['melancholy', 'hopeful'],
    language: 'en',
    description:
      'Sample song record created by muse-ician’s demo mode, inspired by the example in the seed preset library. Replace it with a real song when you are ready.',
    lyrics: 'I keep your coat on the wrong hook\nI learned to be quiet in rooms that were never mine',
    themes: ['leaving a shared home', 'outgrowing a friendship'],
    target_audience: 'Listeners in their twenties who follow independent singer-songwriters.',
    intended_listener_response: 'Recognition rather than sadness.',
    strongest_lyrics: ['I keep your coat on the wrong hook'],
    song_brief:
      'Demo brief: written the week the flat was emptied out. Reference points are late-night bedroom pop and a lot of tape hiss. Do not call it a breakup song — it is about the room, not the person.',
    audio_sections: [
      { label: 'Verse 2', timestamp: '0:48', note: 'Quietest moment before the chorus' },
      { label: 'Final chorus', timestamp: '2:10', note: 'Full arrangement' },
    ],
    bpm: 92,
    musical_key: 'D major',
    release_status: 'released',
    release_date: addDays(startDate, -5),
    streaming_url: null,
    persona_notes: 'Quiet, specific, unsentimental.',
    visual_identity_notes: 'Muted greens, film grain, empty rooms.',
    production_constraints: 'One phone, one room, no crew.',
    equipment: ['phone', 'phone-tripod', 'editing-software'],
    budget: 'minimal',
    filming_locations: ['hallway', 'parked car'],
    face_visibility: 'optional',
    animation_capability: false,
    posting_frequency: '3 posts per week',
    campaign_notes: 'Demo campaign spans 15 days from today.',
    is_demo: true,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };

  const campaign: Campaign = {
    id: 'demo-campaign-low-tide',
    name: 'Low Tide — 15 day demo campaign',
    song_id: songId,
    description:
      'Sample 15-day plan built from the starter preset library. Adjust the dates, frequency or order in Content Calendar.',
    start_date: startDate,
    end_date: addDays(startDate, 14),
    posting_cadence_days: 2,
    stage: 'post-release',
    status: 'active',
    is_demo: true,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };

  const contentIdeas: ContentIdea[] = [];
  const metadataPackages: MetadataPackage[] = [];
  const plannedPosts: PlannedPost[] = [];

  PLAN.forEach((entry, index) => {
    const preset = presetById.get(entry.presetId);
    if (!preset) return;
    const copy = IDEA_COPY[entry.presetId] ?? {
      title: preset.title,
      hook: preset.hook_examples[0] ?? '',
      description: preset.summary,
      audience: '',
    };
    const ideaId = `demo-idea-${index + 1}`;
    const idea: ContentIdea = {
      id: ideaId,
      title: copy.title,
      song_id: songId,
      source_preset_id: preset.id,
      mode: 'customized',
      concept_description: copy.description,
      hook: copy.hook,
      intended_audience: copy.audience,
      scene_sequence: preset.shot_list.slice(0, 3),
      shot_list: preset.shot_list,
      on_screen_text: preset.on_screen_text,
      audio_section: 'Verse 2 (0:48–1:02)',
      editing_notes: 'Two cuts, both on the beat. Hold the final frame for one second.',
      call_to_action: preset.cta_examples[0] ?? '',
      platforms: preset.platforms,
      estimated_production_minutes: preset.estimated_production_minutes ?? 45,
      status: entry.status,
      scheduled_date: addDays(startDate, entry.dayOffset),
      campaign_id: campaign.id,
      notes: 'Demo record — safe to delete.',
      coach_assessment: null,
      versions: [],
      is_demo: true,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    };
    idea.coach_assessment = buildLocalAssessment(idea, preset, song, null);
    contentIdeas.push(idea);

    if (index < 4) {
      const draft = buildLocalMetadata({
        idea,
        preset,
        song,
        platform: entry.platform,
        tone: index % 2 === 0 ? 'emotional' : 'conversational',
      });
      metadataPackages.push({ ...makeMetadataPackage(draft), id: `demo-meta-${index + 1}`, is_demo: true });
    }

    plannedPosts.push({
      id: `demo-post-${index + 1}`,
      content_idea_id: ideaId,
      song_id: songId,
      campaign_id: campaign.id,
      metadata_package_id: index < 4 ? `demo-meta-${index + 1}` : null,
      platform: entry.platform,
      scheduled_date: addDays(startDate, entry.dayOffset),
      status: entry.status,
      title: copy.title,
      notes: 'Demo planned post.',
      is_demo: true,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    });
  });

  const performance: PerformanceRecord[] = [
    {
      id: 'demo-perf-1',
      song_id: songId,
      content_idea_id: 'demo-idea-1',
      platform: 'instagram-reels',
      post_url: null,
      published_on: addDays(startDate, 0),
      views: 1840,
      likes: 143,
      comments: 21,
      shares: 12,
      saves: 58,
      avg_watch_time_seconds: 11.2,
      completion_rate: 46,
      profile_visits: 62,
      link_clicks: 18,
      followers_attributed: 9,
      notes: 'Sample record so the journal has data to compare. These are not real analytics.',
      collected_on: addDays(startDate, 2),
      is_demo: true,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    },
    {
      id: 'demo-perf-2',
      song_id: songId,
      content_idea_id: 'demo-idea-2',
      platform: 'tiktok',
      post_url: null,
      published_on: addDays(startDate, 1),
      views: 6420,
      likes: 512,
      comments: 74,
      shares: 39,
      saves: 96,
      avg_watch_time_seconds: 9.4,
      completion_rate: 38,
      profile_visits: 121,
      link_clicks: 24,
      followers_attributed: 31,
      notes: 'Sample record. Numbers were invented for the demo and are labelled as demo data.',
      collected_on: addDays(startDate, 3),
      is_demo: true,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    },
    {
      id: 'demo-perf-3',
      song_id: songId,
      content_idea_id: 'demo-idea-3',
      platform: 'youtube-shorts',
      post_url: null,
      published_on: addDays(startDate, -3),
      views: 910,
      likes: 64,
      comments: 9,
      shares: 4,
      saves: 12,
      avg_watch_time_seconds: null,
      completion_rate: null,
      profile_visits: 11,
      link_clicks: 3,
      followers_attributed: 2,
      notes: 'Sample record. Demo data only.',
      collected_on: addDays(startDate, -1),
      is_demo: true,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    },
  ];

  return {
    songs: [song],
    campaigns: [campaign],
    content_ideas: contentIdeas,
    metadata_packages: metadataPackages,
    planned_posts: plannedPosts,
    performance_records: performance,
  };
}

export const DEMO_COLLECTIONS = [
  'songs',
  'campaigns',
  'content_ideas',
  'metadata_packages',
  'planned_posts',
  'performance_records',
] as const;
