import type { Preset, Song, TrendRecord, UserPreferences } from './types';
import { PLATFORM_LABELS } from './types';
import { daysBetween, toDateKey } from './utils';

/**
 * Trend intelligence runs in two honest modes.
 *
 * Mode A (no provider configured): the UI states that live trend data is
 * unavailable and offers evergreen creative guidance only. Nothing here claims
 * a format is currently trending.
 *
 * Mode B (provider configured): every record must carry a source, a timestamp
 * and evidence. Freshness is computed from those timestamps, and the opportunity
 * assessment is withheld when the evidence is too old.
 */

export const TREND_MAX_FRESH_DAYS = 7;
export const TREND_MAX_USABLE_DAYS = 45;

export interface TrendFreshness {
  level: 'fresh' | 'aging' | 'stale' | 'unknown';
  days: number | null;
  label: string;
}

export function trendFreshness(trend: TrendRecord, today = toDateKey()): TrendFreshness {
  const reference = trend.source_timestamp ?? trend.observed_at;
  if (!reference) {
    return { level: 'unknown', days: null, label: 'No timestamp — freshness cannot be checked' };
  }
  const days = Math.max(0, daysBetween(reference.slice(0, 10), today));
  if (days <= TREND_MAX_FRESH_DAYS) {
    return { level: 'fresh', days, label: `Evidence is ${days === 0 ? 'from today' : `${days} day${days === 1 ? '' : 's'} old`}` };
  }
  if (days <= TREND_MAX_USABLE_DAYS) {
    return {
      level: 'aging',
      days,
      label: `${days} days old — verify it is still active before adapting it`,
    };
  }
  return {
    level: 'stale',
    days,
    label: `${days} days old — treat this as historical, not current`,
  };
}

export interface TrendOpportunityComponent {
  key: 'currentness' | 'relevance' | 'adaptability' | 'identity_fit';
  label: string;
  score: number;
  explanation: string;
}

export interface TrendOpportunityAssessment {
  available: boolean;
  reason?: string;
  score: number | null;
  components: TrendOpportunityComponent[];
  freshness: TrendFreshness;
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
}

const DISCLAIMER =
  'Trend Opportunity measures how well the recorded evidence fits your song and constraints. It is not a prediction of reach or virality, and it cannot be calculated without recent, attributed evidence.';

export function assessTrendOpportunity(
  trend: TrendRecord,
  context: { song?: Song | null; preset?: Preset | null; preferences?: UserPreferences | null },
  today = toDateKey(),
): TrendOpportunityAssessment {
  const freshness = trendFreshness(trend, today);
  const unavailable = (reason: string): TrendOpportunityAssessment => ({
    available: false,
    reason,
    score: null,
    components: [],
    freshness,
    confidence: trend.confidence,
    disclaimer: DISCLAIMER,
  });

  if (freshness.level === 'unknown') {
    return unavailable('This record has no source timestamp, so currentness cannot be evaluated.');
  }
  if (freshness.level === 'stale') {
    return unavailable(
      `The evidence is ${freshness.days} days old. Add fresh evidence from a permitted source before treating this as a live opportunity.`,
    );
  }
  if (!trend.source_name || !trend.evidence?.trim()) {
    return unavailable('No source or evidence is recorded for this trend, so it cannot be assessed.');
  }

  const { song, preset, preferences } = context;
  const haystack = `${trend.name} ${trend.description} ${(trend.keywords ?? []).join(' ')}`.toLowerCase();

  const currentness = freshness.days === null ? 0 : Math.round(100 - Math.min(freshness.days, 45) * 2);

  const songWords = [
    song?.genre,
    song?.subgenre,
    ...(song?.moods ?? []),
    ...(song?.themes ?? []),
    ...(preset?.tags ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const matches = songWords.filter((word) => haystack.includes(word));
  const relevance = Math.min(100, 30 + matches.length * 20);

  let adaptability = 60;
  const adaptationNotes: string[] = [];
  if (preset) {
    adaptability += preset.difficulty === 'easy' ? 20 : preset.difficulty === 'moderate' ? 5 : -15;
    adaptationNotes.push(`closest preset difficulty: ${preset.difficulty}`);
  }
  if (trend.suggested_adaptation?.trim()) {
    adaptability += 10;
    adaptationNotes.push('an adaptation path is documented');
  }
  if (preset?.face_visibility === 'none' && song?.face_visibility === 'none') {
    adaptability += 5;
    adaptationNotes.push('works without showing your face');
  }

  let identityFit = 55;
  const identityNotes: string[] = [];
  const preferenceWords = [
    ...(preferences?.preferred_genres ?? []),
    ...(preferences?.preferred_moods ?? []),
    preferences?.visual_style,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => String(value).toLowerCase());
  const identityMatches = preferenceWords.filter((word) => haystack.includes(word));
  identityFit += Math.min(30, identityMatches.length * 15);
  if (preferences?.filming_preferences?.length) {
    identityFit += 5;
    identityNotes.push('your filming preferences are recorded');
  }

  const components: TrendOpportunityComponent[] = [
    {
      key: 'currentness',
      label: 'Currentness of the evidence',
      score: Math.max(0, Math.min(100, currentness)),
      explanation: `${freshness.label}. Confidence in the record is ${trend.confidence}.`,
    },
    {
      key: 'relevance',
      label: 'Relevance to song and audience',
      score: Math.max(0, Math.min(100, relevance)),
      explanation: matches.length
        ? `Matches your song on: ${matches.join(', ')}.`
        : 'No overlap found between the trend keywords and your song’s genre, moods or themes.',
    },
    {
      key: 'adaptability',
      label: 'Ease of adapting the format',
      score: Math.max(0, Math.min(100, adaptability)),
      explanation: adaptationNotes.join('; ') || 'No preset is linked, so effort is estimated from the description.',
    },
    {
      key: 'identity_fit',
      label: 'Fit with your identity',
      score: Math.max(0, Math.min(100, identityFit)),
      explanation: identityMatches.length
        ? `Aligns with your stated preferences: ${identityMatches.join(', ')}.`
        : identityNotes.join('; ') || 'Your preferences do not overlap with this format.',
    },
  ];

  const score = Math.round(
    components.reduce((sum, component) => sum + component.score, 0) / components.length,
  );

  return {
    available: true,
    score,
    components,
    freshness,
    confidence: trend.confidence,
    disclaimer: DISCLAIMER,
  };
}

export function trendPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform;
}

/** Evergreen guidance shown when no trend provider is configured. */
export const EVERGREEN_GUIDANCE: { title: string; body: string }[] = [
  {
    title: 'Specific beats broad',
    body: 'A concrete time, object or sentence in the first two seconds outperforms a general mood statement. "Reading their message at 2am" is a hook; "when you are sad" is a topic.',
  },
  {
    title: 'Use the strongest 8 seconds',
    body: 'Pick the section of the song where something changes. Opening on a cold intro gives the scroll no reason to stop.',
  },
  {
    title: 'Design for sound off',
    body: 'A large share of short-form viewing happens muted. Plan text that carries the meaning without audio.',
  },
  {
    title: 'One idea per video',
    body: 'If the concept needs two explanations, it is two videos. Splitting it also gives you a follow-up that references the first.',
  },
  {
    title: 'Repeatable formats beat one-offs',
    body: 'A format you can shoot in an hour, and repeat monthly, builds recognition. Originality lives in your specifics, not a new layout every time.',
  },
  {
    title: 'Verify trends at the source',
    body: 'Before adapting a format, check the platform itself and read the original creator’s context. Adapt the structure, do not copy the execution.',
  },
];
