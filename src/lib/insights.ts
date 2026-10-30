import type {
  ContentIdea,
  PerformanceRecord,
  Platform,
  Preset,
  Song,
} from './types';
import { compactNumber, formatShortDate, pluralize } from './utils';

/**
 * Performance comparisons use only what the user recorded by hand.
 * Observed numbers are reported as observed; every explanation is labelled as
 * an inference. Nothing here claims causation, and cross-platform totals are
 * never summed into a single "views" figure because the platforms count differently.
 */

export type HookCategory =
  | 'performance-led'
  | 'lyric-led'
  | 'story-led'
  | 'process-led'
  | 'community-led'
  | 'other';

export const HOOK_CATEGORY_LABELS: Record<HookCategory, string> = {
  'performance-led': 'Performance-led',
  'lyric-led': 'Lyric-led',
  'story-led': 'Story-led',
  'process-led': 'Process-led',
  'community-led': 'Community / conversation-led',
  other: 'Other',
};

export function categorizeIdea(idea?: ContentIdea | null, preset?: Preset | null): HookCategory {
  const text = `${idea?.title ?? ''} ${idea?.concept_description ?? ''} ${idea?.hook ?? ''} ${
    preset?.tags?.join(' ') ?? ''
  }`.toLowerCase();
  if (/performance|one take|acoustic|live|sing|vocal/.test(text)) return 'performance-led';
  if (/lyric|text overlay|typograph|quote|line/.test(text)) return 'lyric-led';
  if (/story|behind|why|explain|inspiration|process|demo/.test(text)) return 'story-led';
  if (/produc|mix|stem|beat|studio|gear|tutorial/.test(text)) return 'process-led';
  if (/comment|feedback|guess|name this|question|community/.test(text)) return 'community-led';
  return 'other';
}

export interface Aggregate {
  key: string;
  label: string;
  posts: number;
  medianViews: number | null;
  totalSaves: number;
  totalLikes: number;
  medianEngagementRate: number | null;
  platforms: Platform[];
}

export interface PerformanceSummary {
  recordCount: number;
  metricScope: { platform: Platform; posts: number; label: string }[];
  baselineViews: number | null;
  byPlatform: Aggregate[];
  byCategory: Aggregate[];
  bySong: Aggregate[];
  byPeriod: Aggregate[];
  observations: { text: string; kind: 'observed' | 'inferred'; confidence: 'low' | 'medium' | 'high' }[];
  caveats: string[];
  missingData: string[];
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

function engagementRate(record: PerformanceRecord): number | null {
  if (!record.views || record.views <= 0) return null;
  const interactions =
    (record.likes ?? 0) + (record.comments ?? 0) + (record.shares ?? 0) + (record.saves ?? 0);
  return interactions / record.views;
}

function aggregate(
  groupKey: string,
  label: string,
  records: PerformanceRecord[],
  platformOf?: (record: PerformanceRecord) => Platform,
): Aggregate {
  const views = records.map((record) => record.views).filter((value): value is number => typeof value === 'number');
  const rates = records.map(engagementRate).filter((value): value is number => value !== null);
  return {
    key: groupKey,
    label,
    posts: records.length,
    medianViews: median(views),
    totalSaves: records.reduce((sum, record) => sum + (record.saves ?? 0), 0),
    totalLikes: records.reduce((sum, record) => sum + (record.likes ?? 0), 0),
    medianEngagementRate: rates.length ? Number(((median(rates) ?? 0) * 100).toFixed(2)) : null,
    platforms: [...new Set(records.map((record) => platformOf?.(record) ?? record.platform))],
  };
}

function groupBy<T>(items: T[], keyOf: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export function summarizePerformance(
  records: PerformanceRecord[],
  ctx: { ideas: ContentIdea[]; presets: Preset[]; songs: Song[] },
): PerformanceSummary {
  const ideaById = new Map(ctx.ideas.map((idea) => [idea.id, idea]));
  const presetById = new Map(ctx.presets.map((preset) => [preset.id, preset]));
  const songById = new Map(ctx.songs.map((song) => [song.id, song]));

  const withViews = records.filter(
    (record) => typeof record.views === 'number' && record.views !== null,
  );
  const allViews = withViews.map((record) => record.views as number);
  const baselineViews = median(allViews);

  const platformGroups = groupBy(records, (record) => record.platform);
  const byPlatform = [...platformGroups.entries()].map(([platform, list]) =>
    aggregate(platform, platform, list),
  );

  const categoryOf = (record: PerformanceRecord): HookCategory => {
    const idea = record.content_idea_id ? ideaById.get(record.content_idea_id) : undefined;
    const preset = idea?.source_preset_id ? presetById.get(idea.source_preset_id) : undefined;
    return categorizeIdea(idea, preset);
  };
  const categoryGroups = groupBy(records, (record) => categoryOf(record));
  const byCategory = [...categoryGroups.entries()].map(([category, list]) =>
    aggregate(category, HOOK_CATEGORY_LABELS[category as HookCategory] ?? category, list),
  );

  const songGroups = groupBy(records, (record) => record.song_id ?? null);
  const bySong = [...songGroups.entries()].map(([songId, list]) =>
    aggregate(songId, songById.get(songId)?.title ?? 'Unlinked song', list),
  );

  const periodGroups = groupBy(records, (record) => {
    const date = record.published_on;
    return date ? date.slice(0, 7) : null;
  });
  const byPeriod = [...periodGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, list]) => aggregate(month, `${month}`, list));

  const observations: PerformanceSummary['observations'] = [];

  const enoughForComparison = records.length >= 5;
  const minGroup = 3;

  if (!enoughForComparison) {
    observations.push({
      text: `You have ${pluralize(records.length, 'logged post')}. Comparisons become meaningful at around 5 posts, and each format needs at least ${minGroup} examples before any pattern is worth acting on.`,
      kind: 'observed',
      confidence: 'low',
    });
  } else {
    const ranked = [...byCategory]
      .filter((group) => group.posts >= minGroup && group.medianViews !== null)
      .sort((a, b) => (b.medianViews ?? 0) - (a.medianViews ?? 0));
    const top = ranked[0];
    const rest = ranked.slice(1);
    if (top && rest.length) {
      const others = rest.map((group) => `${group.label.toLowerCase()} (${compactNumber(group.medianViews)} median views, ${group.posts} posts)`);
      observations.push({
        text: `Observed: ${top.label.toLowerCase()} posts have a higher median view count (${compactNumber(
          top.medianViews,
        )} across ${pluralize(top.posts, 'post')}) than ${others.join(', ')}.`,
        kind: 'observed',
        confidence: 'medium',
      });
      observations.push({
        text: `Possible explanation (not proven): the opening frame may be easier to understand without sound. This is an inference from ${records.length} records, and small samples swing widely.`,
        kind: 'inferred',
        confidence: 'low',
      });
    }

    const saveLeader = [...byCategory]
      .filter((group) => group.posts >= minGroup && group.totalSaves > 0)
      .sort((a, b) => b.totalSaves - a.totalSaves)[0];
    if (saveLeader && (saveLeader.totalSaves ?? 0) >= 3) {
      observations.push({
        text: `Your ${saveLeader.label.toLowerCase()} posts collected the most saves (${saveLeader.totalSaves}). Saves are usually a stronger signal of intent than views, but they are counted differently on each platform.`,
        kind: 'observed',
        confidence: 'medium',
      });
    }

    const platformComparison = byPlatform.filter((group) => group.posts >= minGroup && group.medianViews);
    if (platformComparison.length >= 2) {
      observations.push({
        text: `Medians differ by platform (${platformComparison
          .map((group) => `${group.label}: ${compactNumber(group.medianViews)}`)
          .join(', ')}). Because each platform defines a "view" differently, compare a platform against its own history rather than against another platform.`,
        kind: 'observed',
        confidence: 'low',
      });
    }
  }

  const caveats = [
    'These numbers are what you typed in; the app has no connection to your accounts and cannot verify them.',
    'Platforms count views, plays and reach differently, so totals across platforms are not comparable.',
    'Comparisons describe your own posts only. They say nothing about why a post performed as it did.',
    'Small samples produce large swings. Treat every pattern here as a hypothesis worth testing, not a result.',
  ];

  const missingData: string[] = [];
  if (!records.some((record) => record.published_on)) missingData.push('publication dates');
  if (!records.some((record) => typeof record.saves === 'number')) missingData.push('saves');
  if (!records.some((record) => typeof record.avg_watch_time_seconds === 'number')) {
    missingData.push('average watch time');
  }
  if (!records.some((record) => record.content_idea_id)) missingData.push('links to content ideas');

  return {
    recordCount: records.length,
    metricScope: byPlatform.map((group) => ({
      platform: group.key as Platform,
      posts: group.posts,
      label: `${group.label}: ${pluralize(group.posts, 'post')}, median ${compactNumber(group.medianViews)} views`,
    })),
    baselineViews,
    byPlatform,
    byCategory,
    bySong,
    byPeriod,
    observations,
    caveats,
    missingData,
  };
}

export function performanceRelativeToBaseline(
  record: PerformanceRecord,
  baseline: number | null,
): { label: string; tone: 'above' | 'below' | 'neutral' } {
  if (!record.views || !baseline) return { label: 'No baseline yet', tone: 'neutral' };
  const ratio = record.views / baseline;
  if (ratio >= 1.25) return { label: `${Math.round((ratio - 1) * 100)}% above your median`, tone: 'above' };
  if (ratio <= 0.75) return { label: `${Math.round((1 - ratio) * 100)}% below your median`, tone: 'below' };
  return { label: 'Near your median', tone: 'neutral' };
}

export function performanceTimelineLabel(record: PerformanceRecord): string {
  return record.published_on ? formatShortDate(record.published_on) : 'Date not recorded';
}
