import type { ContentIdea, PlannedPost, Platform, Preset, Song } from './types';
import { PLATFORM_LABELS } from './types';
import { addDays, daysBetween, pluralize, toDateKey } from './utils';

/**
 * Release runway.
 *
 * Works backwards from a release date and proposes which kind of post belongs
 * where. It is a scheduling worksheet built from the starter library, not a
 * promise: every row says what it is for, and nothing is auto-published.
 */

export type RunwayPhase = 'seed' | 'build' | 'tease' | 'launch' | 'sustain';

export const RUNWAY_PHASE_LABELS: Record<RunwayPhase, string> = {
  seed: 'Seed',
  build: 'Build',
  tease: 'Tease',
  launch: 'Launch',
  sustain: 'Sustain',
};

export const RUNWAY_PHASE_DESCRIPTIONS: Record<RunwayPhase, string> = {
  seed: 'Introduce the world of the song before anyone knows it exists.',
  build: 'Show process and craft. Earn attention with work, not announcements.',
  tease: 'Short, high-recognition moments from the finished thing.',
  launch: 'Release day and the 48 hours after it.',
  sustain: 'Keep the song alive with formats that do not need a new shoot.',
};

export interface RunwayStep {
  id: string;
  dayOffset: number;
  date: string;
  phase: RunwayPhase;
  phaseLabel: string;
  action: string;
  detail: string;
  platform: Platform;
  platformLabel: string;
  presetId: string | null;
  presetTitle: string | null;
  /** True when this row already has a planned post on that date. */
  alreadyPlanned: boolean;
  existingPostId: string | null;
}

export interface Runway {
  releaseDate: string;
  today: string;
  daysUntilRelease: number;
  phase: RunwayPhase;
  headline: string;
  steps: RunwayStep[];
  warnings: string[];
}

interface SlotSpec {
  /** Days relative to the release date (negative = before). */
  offset: number;
  phase: RunwayPhase;
  action: string;
  detail: string;
  presetId: string | null;
  platforms?: Platform[];
}

/** The default runway, ordered by how far from release it sits. */
const SLOTS: SlotSpec[] = [
  {
    offset: -21,
    phase: 'seed',
    action: 'Meet the artist',
    detail: 'A short introduction so new viewers have a face and a reason to follow.',
    presetId: 'preset-meet-the-artist',
  },
  {
    offset: -17,
    phase: 'seed',
    action: 'Visual identity',
    detail: 'Establish the colour, texture and typography this song will be recognised by.',
    presetId: 'preset-visual-identity',
  },
  {
    offset: -14,
    phase: 'build',
    action: 'Behind the song',
    detail: 'The real story of how the song started. Keep it under 40 seconds.',
    presetId: 'preset-behind-the-song',
  },
  {
    offset: -11,
    phase: 'build',
    action: 'Song dissected',
    detail: 'Break down one arrangement choice so repeat listens pay off.',
    presetId: 'preset-song-dissected',
  },
  {
    offset: -8,
    phase: 'build',
    action: 'Unfinished version',
    detail: 'A demo nobody has heard, with the final version teased at the end.',
    presetId: 'preset-unfinished-version',
  },
  {
    offset: -5,
    phase: 'tease',
    action: 'Lyric that hits',
    detail: 'The single most quotable line, on screen, with the audio under it.',
    presetId: 'preset-lyric-that-hits',
  },
  {
    offset: -2,
    phase: 'tease',
    action: 'Countdown',
    detail: 'Two days out: date, cover art, one line of the hook. Nothing else.',
    presetId: null,
    platforms: ['instagram-reels', 'tiktok'],
  },
  {
    offset: 0,
    phase: 'launch',
    action: 'Release day',
    detail: 'Full clip plus every link. Post the same moment on each platform, then pin it.',
    presetId: 'preset-mini-music-video',
  },
  {
    offset: 1,
    phase: 'launch',
    action: 'Raw performance',
    detail: 'One take, no edit tricks. Proves the song is real.',
    presetId: 'preset-raw-performance',
  },
  {
    offset: 3,
    phase: 'sustain',
    action: 'Relatable POV',
    detail: 'Put the song in someone else’s situation so it can travel without you.',
    presetId: 'preset-relatable-pov',
  },
  {
    offset: 6,
    phase: 'sustain',
    action: 'Ask for feedback',
    detail: 'A genuine question about the song, not engagement bait.',
    presetId: 'preset-ask-for-feedback',
  },
  {
    offset: 10,
    phase: 'sustain',
    action: 'Comment chooses next',
    detail: 'Hand the next decision to the audience and follow through on camera.',
    presetId: 'preset-comment-chooses-next',
  },
];

export interface RunwayInput {
  song: Song;
  presets: Preset[];
  posts: PlannedPost[];
  ideas: ContentIdea[];
  /** Only include slots at or after today. Defaults to true. */
  futureOnly?: boolean;
}

export function buildRunway(input: RunwayInput): Runway {
  const today = toDateKey();
  const releaseDate = input.song.release_date ?? today;
  const presetById = new Map(input.presets.map((preset) => [preset.id, preset]));
  const daysUntilRelease = daysBetween(today, releaseDate);

  const warnings: string[] = [];
  if (!input.song.release_date) {
    warnings.push('This song has no release date yet — the runway is anchored to today. Add a date on the song to make it real.');
  }

  const steps: RunwayStep[] = [];
  for (const slot of SLOTS) {
    const date = addDays(releaseDate, slot.offset);
    if (input.futureOnly !== false && date < today) continue;
    const preset = slot.presetId ? presetById.get(slot.presetId) ?? null : null;
    const platforms = slot.platforms ?? preset?.platforms ?? ['instagram-reels'];
    const existing = input.posts.find((post) => post.scheduled_date === date);
    steps.push({
      id: `runway-${slot.offset}`,
      dayOffset: slot.offset,
      date,
      phase: slot.phase,
      phaseLabel: RUNWAY_PHASE_LABELS[slot.phase],
      action: slot.action,
      detail: slot.detail,
      platform: platforms[0]!,
      platformLabel: platforms.map((platform) => PLATFORM_LABELS[platform]).join(', '),
      presetId: preset?.id ?? null,
      presetTitle: preset?.title ?? null,
      alreadyPlanned: Boolean(existing),
      existingPostId: existing?.id ?? null,
    });
  }

  if (!steps.length) {
    warnings.push('This release date is in the past, so no runway steps remain. Pick a future date or plan a post-release push instead.');
  }

  const launchDayPosts = input.posts.filter((post) => post.scheduled_date === releaseDate);
  if (input.song.release_date && !launchDayPosts.length) {
    warnings.push('Nothing is planned for release day itself. That is the one date worth defending.');
  }

  const phase: RunwayPhase =
    daysUntilRelease > 14 ? 'seed' : daysUntilRelease > 5 ? 'build' : daysUntilRelease > 0 ? 'tease' : daysUntilRelease === 0 ? 'launch' : 'sustain';

  const headline =
    daysUntilRelease > 0
      ? `${pluralize(daysUntilRelease, 'day')} until release — ${RUNWAY_PHASE_LABELS[phase].toLowerCase()} phase.`
      : daysUntilRelease === 0
        ? 'Release day. Post, pin, then reply to everyone.'
        : `${pluralize(Math.abs(daysUntilRelease), 'day')} since release — keep it alive with formats that do not need a new shoot.`;

  return {
    releaseDate,
    today,
    daysUntilRelease,
    phase,
    headline,
    steps,
    warnings,
  };
}

/** A compact calendar projection so a runway can be previewed before saving. */
export function runwayToPosts(runway: Runway): { date: string; title: string; platform: Platform }[] {
  return runway.steps.map((step) => ({
    date: step.date,
    title: step.action,
    platform: step.platform,
  }));
}
