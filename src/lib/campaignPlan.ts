import type {
  Campaign,
  ContentIdea,
  PlannedPost,
  Preset,
  Song,
  CampaignStage,
} from './types';
import { SCHEMA_VERSION } from './types';
import { addDays, newId, nowIso } from './utils';
import { buildIdea } from './ideas';

/**
 * The default 15-day example campaign.
 *
 * It is built from the real starter presets in a deliberate order: establish the
 * artist, introduce the song, show the making of it, then hand the format to the
 * audience. Dates, cadence, song and the number of posts are all adjustable.
 */

const STAGE_ORDER: CampaignStage[] = ['pre-release', 'release-week', 'post-release', 'evergreen'];

const PREFERRED_ORDER = [
  'preset-meet-the-artist',
  'preset-visual-identity',
  'preset-mini-music-video',
  'preset-direct-introduction',
  'preset-raw-performance',
  'preset-lyric-that-hits',
  'preset-behind-the-song',
  'preset-unfinished-version',
  'preset-song-dissected',
  'preset-relatable-pov',
  'preset-ask-for-feedback',
  'preset-comment-chooses-next',
];

export function suggestPresetSequence(presets: Preset[], count: number): Preset[] {
  const available = presets.filter((preset) => !preset.is_archived && !preset.is_demo);
  const ordered: Preset[] = [];
  for (const id of PREFERRED_ORDER) {
    const match = available.find((preset) => preset.id === id);
    if (match && !ordered.some((item) => item.id === match.id)) ordered.push(match);
  }
  for (const stage of STAGE_ORDER) {
    for (const preset of available) {
      if (ordered.length >= count) break;
      if (preset.campaign_stage === stage && !ordered.some((item) => item.id === preset.id)) {
        ordered.push(preset);
      }
    }
  }
  for (const preset of available) {
    if (ordered.length >= count) break;
    if (!ordered.some((item) => item.id === preset.id)) ordered.push(preset);
  }
  return ordered.slice(0, count);
}

export interface CampaignPlanInput {
  song: Song;
  presets: Preset[];
  startDate: string;
  cadenceDays: number;
  postCount: number;
  createIdeas: boolean;
  stage?: CampaignStage;
  name?: string;
}

export interface CampaignPlanOutput {
  campaign: Campaign;
  ideas: ContentIdea[];
  posts: PlannedPost[];
}

export function buildCampaignPlan(input: CampaignPlanInput): CampaignPlanOutput {
  const now = nowIso();
  const campaignId = newId('campaign');
  const sequence = suggestPresetSequence(input.presets, input.postCount);
  const spanDays = Math.max(1, (sequence.length - 1) * input.cadenceDays);

  const campaign: Campaign = {
    id: campaignId,
    name: input.name?.trim() || `${input.song.title} — ${spanDays + 1}-day campaign`,
    song_id: input.song.id,
    description:
      'Generated from the starter preset library. Adjust dates, cadence and order in Content Calendar. These are planning records only — nothing is published by muse-ician.',
    start_date: input.startDate,
    end_date: addDays(input.startDate, spanDays),
    posting_cadence_days: input.cadenceDays,
    stage: input.stage ?? 'post-release',
    status: 'active',
    is_demo: false,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };

  const ideas: ContentIdea[] = [];
  const posts: PlannedPost[] = [];

  sequence.forEach((preset, index) => {
    const scheduled = addDays(input.startDate, index * input.cadenceDays);
    const idea = buildIdea({
      preset,
      song: input.song,
      mode: 'use-as-is',
      campaignId,
      title: `${preset.title} — ${input.song.title}`,
    });
    if (input.createIdeas) ideas.push(idea);
    posts.push({
      id: newId('post'),
      content_idea_id: input.createIdeas ? idea.id : null,
      song_id: input.song.id,
      campaign_id: campaignId,
      metadata_package_id: null,
      platform: preset.platforms[0] ?? 'instagram-reels',
      scheduled_date: scheduled,
      status: 'idea',
      title: input.createIdeas ? idea.title : `${preset.title} — ${input.song.title}`,
      notes: input.createIdeas ? null : `Based on preset: ${preset.title}`,
      is_demo: false,
      created_at: now,
      updated_at: now,
      schema_version: SCHEMA_VERSION,
    });
  });

  return { campaign, ideas, posts };
}

/** Warnings the calendar surfaces before the user wastes time. */
export interface CalendarWarning {
  id: string;
  tone: 'warning' | 'info';
  message: string;
  postIds: string[];
}

export function calendarWarnings(
  posts: PlannedPost[],
  ideas: ContentIdea[],
  today: string,
): CalendarWarning[] {
  const warnings: CalendarWarning[] = [];
  const byIdea = new Map<string, PlannedPost[]>();
  for (const post of posts) {
    if (!post.content_idea_id) continue;
    const list = byIdea.get(post.content_idea_id) ?? [];
    list.push(post);
    byIdea.set(post.content_idea_id, list);
  }
  for (const [ideaId, list] of byIdea) {
    if (list.length > 1) {
      const idea = ideas.find((item) => item.id === ideaId);
      warnings.push({
        id: `duplicate-${ideaId}`,
        tone: 'warning',
        message: `“${idea?.title ?? 'An idea'}” is scheduled ${list.length} times. That is fine as a deliberate repeat, but check the dates.`,
        postIds: list.map((post) => post.id),
      });
    }
  }

  // Two posts landing on the same day can be deliberate (different platforms),
  // but three or more on one date usually means a scheduling mistake.
  const byDate = new Map<string, PlannedPost[]>();
  for (const post of posts) {
    if (post.status === 'archived') continue;
    const list = byDate.get(post.scheduled_date) ?? [];
    list.push(post);
    byDate.set(post.scheduled_date, list);
  }
  for (const [date, list] of byDate) {
    if (list.length >= 3) {
      warnings.push({
        id: `clash-${date}`,
        tone: 'warning',
        message: `${list.length} posts are planned for ${date}. Unless these are different platforms posting the same day, space them out.`,
        postIds: list.map((post) => post.id),
      });
    }
  }

  const unfinished = posts.filter(
    (post) =>
      post.scheduled_date < today &&
      !['published', 'reviewed', 'archived'].includes(post.status),
  );
  if (unfinished.length) {
    warnings.push({
      id: 'unfinished',
      tone: 'warning',
      message: `${unfinished.length} post${unfinished.length === 1 ? '' : 's'} passed their planned date without being marked published. Reschedule or update the status.`,
      postIds: unfinished.map((post) => post.id),
    });
  }
  return warnings;
}
