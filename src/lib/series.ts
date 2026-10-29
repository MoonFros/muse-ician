import type { CampaignStage, ContentIdea, IdeaSnapshot, PlannedPost, Platform, Preset, Song, WorkflowStatus } from './types';
import { SCHEMA_VERSION } from './types';
import { addDays, newId, nowIso, toDateKey } from './utils';
import { buildIdeaFromPreset, createVersion } from './ideas';

/**
 * Series planner.
 *
 * A single vertical video has one shot at a viewer; a series gives them a reason
 * to come back. This module turns one preset into a 3–5 part arc with distinct
 * jobs per part, so the parts do not repeat each other.
 *
 * Honesty note: arc shapes are editorial structure, not a growth tactic. Nothing
 * here claims a series will reach more people.
 */

export const SERIES_SHAPES = ['teaser-arc', 'making-of', 'song-dissection', 'audience-participation'] as const;
export type SeriesShape = (typeof SERIES_SHAPES)[number];

export const SERIES_SHAPE_LABELS: Record<SeriesShape, string> = {
  'teaser-arc': 'Teaser arc',
  'making-of': 'Making of',
  'song-dissection': 'Song dissection',
  'audience-participation': 'Audience participation',
};

export const SERIES_SHAPE_DESCRIPTIONS: Record<SeriesShape, string> = {
  'teaser-arc': 'Build anticipation: hint, reveal more, then drop the full thing.',
  'making-of': 'Show the process from first idea to finished take.',
  'song-dissection': 'Break the song apart: lyric, arrangement, performance, meaning.',
  'audience-participation': 'Hand decisions to the audience and follow through on camera.',
};

export type SeriesPartRole =
  | 'open'
  | 'context'
  | 'detail'
  | 'turn'
  | 'close'
  | 'ask';

export const SERIES_ROLE_LABELS: Record<SeriesPartRole, string> = {
  open: 'Open the loop',
  context: 'Give context',
  detail: 'Go deeper',
  turn: 'Change something',
  close: 'Land it',
  ask: 'Hand it over',
};

interface RoleSpec {
  role: SeriesPartRole;
  title: (ctx: SeriesContext) => string;
  goal: string;
  hook: (ctx: SeriesContext) => string;
  scene: (ctx: SeriesContext) => string;
  cta: (ctx: SeriesContext) => string;
}

interface SeriesContext {
  preset: Preset;
  song: Song | null;
  partNumber: number;
  totalParts: number;
  title: string;
}

const SONG_LINE = (ctx: SeriesContext) =>
  ctx.song ? `“${ctx.song.title}”${ctx.song.artist ? ` — ${ctx.song.artist}` : ''}` : 'this song';

const SHAPE_ROLES: Record<SeriesShape, RoleSpec[]> = {
  'teaser-arc': [
    {
      role: 'open',
      title: (ctx) => `Part 1 — the 8 seconds of ${SONG_LINE(ctx)}`,
      goal: 'Make one specific moment memorable without giving the whole song away.',
      hook: (ctx) => `There is one line in ${SONG_LINE(ctx)} I almost deleted.`,
      scene: () => 'Extreme close-up on the moment the line lands. No intro, no greeting.',
      cta: () => 'Part 2 tomorrow — follow so you do not miss it.',
    },
    {
      role: 'context',
      title: (ctx) => `Part 2 — why ${SONG_LINE(ctx)} sounds like that`,
      goal: 'Explain the choice you made in part 1 so the audience hears it differently.',
      hook: () => 'Here is why that part sounds unfinished — it is on purpose.',
      scene: () => 'Split screen: voice memo version beside the final mix.',
      cta: () => 'Which version do you prefer? Comment 1 or 2.',
    },
    {
      role: 'detail',
      title: (ctx) => `Part 3 — the take that made it into ${SONG_LINE(ctx)}`,
      goal: 'Show proof of the process: the actual take, not a re-enactment.',
      hook: () => 'This is take nine. We kept it because of one mistake.',
      scene: () => 'Raw footage with the mistake left in, captions naming it.',
      cta: () => 'Full video is up now — link in bio.',
    },
    {
      role: 'close',
      title: (ctx) => `Part 4 — the whole idea, ${ctx.totalParts} parts later`,
      goal: 'Reward the people who followed the arc with the complete piece.',
      hook: () => 'Four posts, one song. Here it is in full.',
      scene: () => 'Cold open on the strongest 3 seconds, then the full clip.',
      cta: () => 'Save this one if it is your kind of thing.',
    },
  ],
  'making-of': [
    {
      role: 'open',
      title: (ctx) => `Part 1 — the voice memo that became ${SONG_LINE(ctx)}`,
      goal: 'Start at the least polished moment so later parts feel earned.',
      hook: () => 'This is the first time this song existed.',
      scene: () => 'Phone voice memo playing, screen recording of the file.',
      cta: () => 'More of this tomorrow.',
    },
    {
      role: 'context',
      title: () => 'Part 2 — building the beat from nothing',
      goal: 'Show the smallest unit of work that made a difference.',
      hook: () => 'One drum loop, and the whole song changed direction.',
      scene: () => 'Screen capture of the arrangement being built, sped up.',
      cta: () => 'Tell me which layer you would have kept.',
    },
    {
      role: 'detail',
      title: () => 'Part 3 — recording the vocal in one room',
      goal: 'Demystify the setup: what you actually used, no myth-making.',
      hook: () => 'No booth. One blanket, one mic, three hours.',
      scene: () => 'Wide shot of the room, then close on the mic.',
      cta: () => 'Ask me anything about the setup.',
    },
    {
      role: 'ask',
      title: () => 'Part 4 — you pick the next version',
      goal: 'Hand a real decision to the audience and commit to following it.',
      hook: () => 'Two mixes left. I will post whichever wins.',
      scene: () => 'A/B playback with a visible poll sticker or comment prompt.',
      cta: () => 'Vote in the comments, I will post the result tomorrow.',
    },
  ],
  'song-dissection': [
    {
      role: 'open',
      title: (ctx) => `Part 1 — the line in ${SONG_LINE(ctx)} that matters most`,
      goal: 'Pick one lyric and commit to it; do not summarise the whole song.',
      hook: () => 'This is the only line I wrote in one go.',
      scene: () => 'Lyric on screen, read once, no music under it.',
      cta: () => 'Part 2: the arrangement behind it.',
    },
    {
      role: 'detail',
      title: () => 'Part 2 — what the arrangement is doing under that line',
      goal: 'Give the listener a new thing to notice on the next play.',
      hook: () => 'The drums drop out exactly where the lyric gets honest.',
      scene: () => 'Waveform visible, play the bar before and after the drop.',
      cta: () => 'Listen again and tell me if you hear it now.',
    },
    {
      role: 'turn',
      title: () => 'Part 3 — the version I rejected',
      goal: 'Show a real alternative so the finished choice looks deliberate.',
      hook: () => 'I tried a bigger chorus. It made the song smaller.',
      scene: () => 'Side-by-side of the two choruses, labelled.',
      cta: () => 'Which one would you have kept?',
    },
    {
      role: 'close',
      title: () => 'Part 4 — how to listen to it now',
      goal: 'Give a concrete listening instruction that rewards attention.',
      hook: () => 'Listen to the last 20 seconds with headphones.',
      scene: () => 'Headphone close-up, then the outro clip.',
      cta: () => 'Save this for your next listen.',
    },
  ],
  'audience-participation': [
    {
      role: 'open',
      title: (ctx) => `Part 1 — I need you to decide something about ${SONG_LINE(ctx)}`,
      goal: 'State the decision clearly and make the stakes small but real.',
      hook: () => 'Two options. I will actually do whichever wins.',
      scene: () => 'Both options shown on screen, labelled A and B.',
      cta: () => 'Comment A or B. I will film the result.',
    },
    {
      role: 'ask',
      title: () => 'Part 2 — the vote is close, so here is more context',
      goal: 'Report the real state of the vote without inflating it.',
      hook: () => 'It is almost split, so here is what each one costs me.',
      scene: () => 'Counts on screen as of the recording time, dated.',
      cta: () => 'Voting closes tomorrow.',
    },
    {
      role: 'turn',
      title: () => 'Part 3 — I did the thing you picked',
      goal: 'Close the loop: prove you followed through.',
      hook: () => 'You picked the harder one. Here it is.',
      scene: () => 'The performance itself, unedited.',
      cta: () => 'Next decision goes up tomorrow.',
    },
    {
      role: 'close',
      title: () => 'Part 4 — what the experiment taught me',
      goal: 'Reflect honestly, including what did not work.',
      hook: () => 'I would not do that again — here is why.',
      scene: () => 'Talking head, one take, no music.',
      cta: () => 'Suggest the next experiment in the comments.',
    },
  ],
};

function roleCountFor(parts: number): number {
  return parts >= 5 ? 5 : parts <= 3 ? 3 : 4;
}

/** Trim or extend the role list so it matches the requested part count. */
function fitRoles(shape: SeriesShape, parts: number): RoleSpec[] {
  const base = SHAPE_ROLES[shape];
  const target = roleCountFor(parts);
  if (base.length === target) return base;
  if (target < base.length) return base.slice(0, target);
  // Extend with a deeper "detail" beat before the close.
  const index = Math.max(0, base.length - 1);
  const extra: RoleSpec = {
    role: 'detail',
    title: (ctx) => `Part ${base.length} — one more detail in ${SONG_LINE(ctx)}`,
    goal: 'Add a detail that would not fit in the earlier parts.',
    hook: () => 'One more thing nobody asks about.',
    scene: () => 'Close-up on the instrument, pedal or screen involved.',
    cta: () => 'Last part tomorrow.',
  };
  const copy = [...base];
  copy.splice(index, 0, extra);
  return copy;
}

export interface SeriesPart {
  index: number;
  role: SeriesPartRole;
  roleLabel: string;
  title: string;
  goal: string;
  hook: string;
  scene: string;
  cta: string;
  scheduledDate: string;
  suggestedLengthSeconds: number;
  presetId: string | null;
  presetTitle: string | null;
}

export interface SeriesPlan {
  shape: SeriesShape;
  shapeLabel: string;
  title: string;
  summary: string;
  songId: string | null;
  presetId: string;
  parts: SeriesPart[];
  notes: string[];
}

export interface SeriesInput {
  preset: Preset;
  song?: Song | null;
  shape: SeriesShape;
  parts: number;
  startDate?: string;
  cadenceDays?: number;
}

export function buildSeriesPlan(input: SeriesInput): SeriesPlan {
  const start = input.startDate ?? toDateKey();
  const cadence = Math.max(1, input.cadenceDays ?? 2);
  const total = Math.min(5, Math.max(3, input.parts));
  const roles = fitRoles(input.shape, total);
  const song = input.song ?? null;
  const seriesTitle = song
    ? `${SERIES_SHAPE_LABELS[input.shape]} — ${song.title}`
    : `${SERIES_SHAPE_LABELS[input.shape]} — ${input.preset.title}`;

  const parts: SeriesPart[] = roles.map((spec, index) => {
    const ctx: SeriesContext = {
      preset: input.preset,
      song,
      partNumber: index + 1,
      totalParts: total,
      title: seriesTitle,
    };
    return {
      index: index + 1,
      role: spec.role,
      roleLabel: SERIES_ROLE_LABELS[spec.role],
      title: spec.title(ctx),
      goal: spec.goal,
      hook: spec.hook(ctx),
      scene: spec.scene(ctx),
      cta: spec.cta(ctx),
      scheduledDate: addDays(start, index * cadence),
      suggestedLengthSeconds: 25 + index * 5,
      presetId: input.preset.id,
      presetTitle: input.preset.title,
    };
  });

  return {
    shape: input.shape,
    shapeLabel: SERIES_SHAPE_LABELS[input.shape],
    title: seriesTitle,
    summary: `${total} parts, ${cadence === 1 ? 'daily' : `every ${cadence} days`}, built from “${input.preset.title}”. Each part has a different job so they do not repeat.`,
    songId: song?.id ?? null,
    presetId: input.preset.id,
    parts,
    notes: [
      'A series only works if each part stands alone — someone who sees part 3 first should still get value.',
      'Nothing is published for you: parts are saved as ideas and calendar entries you post yourself.',
      'Re-order or drop a part before saving; the arc is a suggestion, not a rule.',
    ],
  };
}

export interface SeriesBuildOutput {
  ideas: ContentIdea[];
  posts: PlannedPost[];
}

/**
 * Turn a plan into real records. Each idea keeps the preset as its source and
 * stores the arc position in `notes` so the workspace can show it later.
 */
export function materializeSeries(plan: SeriesPlan, preset: Preset, song: Song | null): SeriesBuildOutput {
  const now = nowIso();
  const campaignId = newId('campaign');
  const ideas: ContentIdea[] = [];
  const posts: PlannedPost[] = [];

  for (const part of plan.parts) {
    const idea = buildIdeaFromPreset(preset, {
      song,
      mode: 'customized',
      title: part.title,
      customization: `${plan.shapeLabel} part ${part.index}/${plan.parts.length}: ${part.goal}`,
    });
    idea.hook = part.hook;
    idea.call_to_action = part.cta;
    idea.scene_sequence = [part.scene, ...(idea.scene_sequence ?? []).slice(0, 3)];
    idea.notes = [
      `Series: ${plan.title}`,
      `Part ${part.index} of ${plan.parts.length} — ${part.roleLabel}.`,
      `Goal: ${part.goal}`,
      idea.notes,
    ]
      .filter(Boolean)
      .join('\n');
    idea.campaign_id = campaignId;
    idea.scheduled_date = part.scheduledDate;
    idea.status = 'planning' as WorkflowStatus;
    idea.versions = [createVersion(idea, 'Created by series planner')];
    idea.updated_at = now;
    idea.schema_version = SCHEMA_VERSION;
    ideas.push(idea);

    const platforms: Platform[] = idea.platforms?.length ? idea.platforms : ['instagram-reels'];
    posts.push({
      id: newId('post'),
      content_idea_id: idea.id,
      song_id: song?.id ?? null,
      campaign_id: campaignId,
      metadata_package_id: null,
      platform: platforms[0]!,
      scheduled_date: part.scheduledDate,
      status: 'planning',
      title: part.title,
      notes: `Series part ${part.index}/${plan.parts.length} — ${part.roleLabel}`,
      is_demo: false,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    });
  }

  return { ideas, posts };
}

export function seriesCampaign(input: {
  plan: SeriesPlan;
  song: Song | null;
  campaignId?: string;
}): {
  id: string;
  name: string;
  song_id: string | null;
  description: string;
  start_date: string;
  end_date: string;
  posting_cadence_days: number;
  stage: CampaignStage;
  status: 'active';
  is_demo: false;
  created_at: string;
  updated_at: string;
  schema_version: string;
} {
  const now = nowIso();
  const first = input.plan.parts[0]!;
  const last = input.plan.parts[input.plan.parts.length - 1]!;
  const cadence = Math.max(
    1,
    Math.round(
      (new Date(last.scheduledDate).getTime() - new Date(first.scheduledDate).getTime()) /
        (1000 * 60 * 60 * 24) /
        Math.max(1, input.plan.parts.length - 1),
    ),
  );
  return {
    id: input.campaignId ?? newId('campaign'),
    name: input.plan.title,
    song_id: input.song?.id ?? null,
    description: input.plan.summary,
    start_date: first.scheduledDate,
    end_date: last.scheduledDate,
    posting_cadence_days: Number.isFinite(cadence) ? cadence : 2,
    stage: 'pre-release',
    status: 'active',
    is_demo: false,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };
}

/** The snapshot a part would produce, used for previews before saving. */
export function previewSnapshot(idea: ContentIdea): IdeaSnapshot {
  return {
    title: idea.title,
    concept_description: idea.concept_description,
    hook: idea.hook,
    scene_sequence: idea.scene_sequence ?? [],
    shot_list: idea.shot_list ?? [],
    on_screen_text: idea.on_screen_text ?? [],
    editing_notes: idea.editing_notes ?? '',
    call_to_action: idea.call_to_action ?? '',
    audio_section: idea.audio_section ?? '',
  };
}
