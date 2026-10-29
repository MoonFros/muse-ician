import type { ContentIdea, PerformanceRecord, Platform, Preset, Song } from './types';
import { PLATFORM_LABELS } from './types';
import { compactNumber, pluralize } from './utils';

/**
 * Performance comparatives.
 *
 * Compares a post against *your own* history only — never against a benchmark,
 * an industry average or anyone else's account. Groups smaller than the minimum
 * sample size are shown but explicitly marked as not actionable.
 */

export const MIN_ACTIONABLE_SAMPLE = 3;
export const MIN_OVERALL_SAMPLE = 5;

export type SampleConfidence = 'too-small' | 'low' | 'medium' | 'high';

export const SAMPLE_CONFIDENCE_LABELS: Record<SampleConfidence, string> = {
  'too-small': 'Too few posts to compare',
  low: 'Directional only',
  medium: 'Worth watching',
  high: 'Enough to compare',
};

export function sampleConfidence(count: number): SampleConfidence {
  if (count < MIN_ACTIONABLE_SAMPLE) return 'too-small';
  if (count < 5) return 'low';
  if (count < 10) return 'medium';
  return 'high';
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function numeric(values: (number | null | undefined)[]): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

export interface ComparativeGroup {
  key: string;
  label: string;
  posts: number;
  confidence: SampleConfidence;
  actionable: boolean;
  medianViews: number | null;
  medianSaves: number | null;
  medianCompletion: number | null;
  totalViews: number;
  bestRecord: { id: string; title: string; views: number } | null;
  note: string;
}

export interface ComparativeReport {
  overall: {
    posts: number;
    withViews: number;
    confidence: SampleConfidence;
    actionable: boolean;
    medianViews: number | null;
    totalViews: number;
    message: string;
  };
  byPlatform: ComparativeGroup[];
  byPreset: ComparativeGroup[];
  bySong: ComparativeGroup[];
  byIntent: ComparativeGroup[];
  observations: { text: string; confidence: SampleConfidence }[];
}

export interface ComparativeContext {
  ideas: ContentIdea[];
  presets: Preset[];
  songs: Song[];
}

function aggregate(
  key: string,
  label: string,
  records: PerformanceRecord[],
  titleOf: (record: PerformanceRecord) => string,
): ComparativeGroup {
  const views = numeric(records.map((record) => record.views));
  const saves = numeric(records.map((record) => record.saves));
  const completion = numeric(records.map((record) => record.completion_rate));
  const confidence = sampleConfidence(records.length);
  const best = records
    .filter((record) => typeof record.views === 'number' && record.views !== null)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];

  return {
    key,
    label,
    posts: records.length,
    confidence,
    actionable: records.length >= MIN_ACTIONABLE_SAMPLE,
    medianViews: median(views),
    medianSaves: median(saves),
    medianCompletion: median(completion),
    totalViews: views.reduce((total, value) => total + value, 0),
    bestRecord: best
      ? { id: best.id, title: titleOf(best), views: best.views ?? 0 }
      : null,
    note:
      records.length >= MIN_ACTIONABLE_SAMPLE
        ? `Median of ${pluralize(records.length, 'post')}.`
        : `Only ${pluralize(records.length, 'post')} — too few to treat as a pattern.`,
  };
}

export function buildComparativeReport(records: PerformanceRecord[], ctx: ComparativeContext): ComparativeReport {
  const ideaById = new Map(ctx.ideas.map((idea) => [idea.id, idea]));
  const presetById = new Map(ctx.presets.map((preset) => [preset.id, preset]));
  const songById = new Map(ctx.songs.map((song) => [song.id, song]));

  const titleOf = (record: PerformanceRecord): string => {
    const idea = record.content_idea_id ? ideaById.get(record.content_idea_id) : undefined;
    if (idea) return idea.title;
    if (record.post_url) return record.post_url;
    return `${PLATFORM_LABELS[record.platform]} post`;
  };

  const group = <T extends string>(
    keyOf: (record: PerformanceRecord) => T | null,
    labelOf: (key: T) => string,
  ): ComparativeGroup[] => {
    const map = new Map<T, PerformanceRecord[]>();
    for (const record of records) {
      const key = keyOf(record);
      if (!key) continue;
      const list = map.get(key);
      if (list) list.push(record);
      else map.set(key, [record]);
    }
    return [...map.entries()]
      .map(([key, list]) => aggregate(key, labelOf(key), list, titleOf))
      .sort((a, b) => (b.medianViews ?? -1) - (a.medianViews ?? -1));
  };

  const withViews = records.filter((record) => typeof record.views === 'number');
  const overallViews = numeric(records.map((record) => record.views));

  const overallConfidence = sampleConfidence(records.length);
  const overall = {
    posts: records.length,
    withViews: withViews.length,
    confidence: overallConfidence,
    actionable: records.length >= MIN_OVERALL_SAMPLE,
    medianViews: median(overallViews),
    totalViews: overallViews.reduce((total, value) => total + value, 0),
    message:
      records.length >= MIN_OVERALL_SAMPLE
        ? `Compared against your own ${pluralize(records.length, 'logged post')}. No external benchmark is used.`
        : `You have ${pluralize(records.length, 'logged post')}. At ${MIN_OVERALL_SAMPLE} posts these comparisons start to mean something; below that they are noise.`,
  };

  const byPlatform = group<Platform>((record) => record.platform, (platform) => PLATFORM_LABELS[platform]);
  const byPreset = group<string>(
    (record) => {
      const idea = record.content_idea_id ? ideaById.get(record.content_idea_id) : undefined;
      const preset = idea?.source_preset_id ? presetById.get(idea.source_preset_id) : undefined;
      return preset?.title ?? (idea ? 'No preset (from scratch)' : null);
    },
    (label) => label,
  );
  const bySong = group<string>(
    (record) => {
      const songId = record.song_id ?? (record.content_idea_id ? ideaById.get(record.content_idea_id)?.song_id : null);
      const song = songId ? songById.get(songId) : undefined;
      return song?.title ?? 'No song linked';
    },
    (label) => label,
  );
  const byIntent = group<string>(
    (record) => {
      const idea = record.content_idea_id ? ideaById.get(record.content_idea_id) : undefined;
      const preset = idea?.source_preset_id ? presetById.get(idea.source_preset_id) : undefined;
      return preset?.objectives?.[0] ?? null;
    },
    (label) => label.replace(/-/g, ' '),
  );

  const observations: { text: string; confidence: SampleConfidence }[] = [];
  const actionable = byPlatform.filter((groupItem) => groupItem.actionable && groupItem.medianViews !== null);
  if (actionable.length >= 2) {
    const [best, second] = actionable;
    if (best && second) {
      const ratio = second.medianViews ? best.medianViews! / second.medianViews : null;
      observations.push({
        text: `Your ${best.label} posts have a higher median view count (${compactNumber(
          best.medianViews,
        )} across ${pluralize(best.posts, 'post')}) than ${second.label} (${compactNumber(
          second.medianViews,
        )} across ${pluralize(second.posts, 'post')})${
          ratio && ratio > 1 ? ` — about ${ratio.toFixed(1)}× the median` : ''
        }.`,
        confidence: sampleConfidence(Math.min(best.posts, second.posts)),
      });
    }
  } else {
    observations.push({
      text: `No platform has ${MIN_ACTIONABLE_SAMPLE} logged posts yet, so a platform comparison would be guesswork.`,
      confidence: 'too-small',
    });
  }

  const bestPreset = byPreset.find((groupItem) => groupItem.actionable);
  if (bestPreset) {
    observations.push({
      text: `Most-logged format so far: “${bestPreset.label}” with ${pluralize(bestPreset.posts, 'post')} and a median of ${compactNumber(
        bestPreset.medianViews,
      )} views.`,
      confidence: bestPreset.confidence,
    });
  }

  return { overall, byPlatform, byPreset, bySong, byIntent, observations };
}

/** Median-based baseline used for "this post vs your usual" chips. */
export function baselineFor(records: PerformanceRecord[], platform?: Platform | null): number | null {
  const pool = platform ? records.filter((record) => record.platform === platform) : records;
  const values = numeric(pool.map((record) => record.views));
  if (values.length < MIN_ACTIONABLE_SAMPLE) return null;
  return median(values);
}

export function relativeToBaseline(views: number | null | undefined, baseline: number | null): string | null {
  if (typeof views !== 'number' || baseline === null || baseline <= 0) return null;
  const ratio = views / baseline;
  if (ratio >= 1.15) return `${ratio.toFixed(1)}× your median`;
  if (ratio <= 0.85) return `${(1 / ratio).toFixed(1)}× below your median`;
  return 'in line with your median';
}
