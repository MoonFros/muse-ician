import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import { assessTrendOpportunity, trendFreshness } from '../src/lib/trends';
import { addDays, toDateKey } from '../src/lib/utils';
import type { TrendRecord } from '../src/lib/types';

const demo = buildDemoBundle(SEED_PRESETS);
const today = toDateKey();

function trend(overrides: Partial<TrendRecord> = {}): TrendRecord {
  return {
    id: 'trend-test',
    name: 'POV lyric reveal',
    platform: 'instagram-reels',
    description: 'Creators write the lyric over the first frame.',
    source_name: 'Three creators on my own feed',
    source_url: null,
    source_timestamp: today,
    observed_at: today,
    geography: null,
    keywords: ['indie pop', 'melancholy', 'pov'],
    evidence: 'Saw four creators in my niche use the same first-frame text between Monday and Wednesday.',
    song_id: demo.songs[0]!.id,
    relevance_notes: null,
    suggested_adaptation: 'Use the second verse instead of the chorus.',
    confidence: 'medium',
    review_date: null,
    is_demo: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('trend opportunity', () => {
  it('scores recent, attributed evidence against the saved song', () => {
    const assessment = assessTrendOpportunity(trend(), {
      song: demo.songs[0],
      preset: SEED_PRESETS[0],
      preferences: null,
    });
    expect(assessment.available).toBe(true);
    expect(assessment.score).toBeGreaterThan(0);
    expect(assessment.components).toHaveLength(4);
    expect(assessment.disclaimer.toLowerCase()).toContain('not a prediction');
  });

  it('is unavailable without a source timestamp', () => {
    const assessment = assessTrendOpportunity(trend({ source_timestamp: null, observed_at: '' as never }), {});
    expect(assessment.available).toBe(false);
    expect(assessment.score).toBeNull();
    expect(trendFreshness(trend({ source_timestamp: null, observed_at: '' })).level).toBe('unknown');
  });

  it('is unavailable when the evidence is stale', () => {
    const stale = trend({ source_timestamp: addDays(today, -120), observed_at: addDays(today, -120) });
    const assessment = assessTrendOpportunity(stale, {});
    expect(assessment.available).toBe(false);
    expect(assessment.reason?.toLowerCase()).toContain('days old');
  });

  it('is unavailable without a named source or evidence', () => {
    expect(assessTrendOpportunity(trend({ source_name: '' }), {}).available).toBe(false);
    expect(assessTrendOpportunity(trend({ evidence: '   ' }), {}).available).toBe(false);
  });

  it('never promises reach or virality', () => {
    const assessment = assessTrendOpportunity(trend(), {});
    const text = `${assessment.disclaimer} ${assessment.components.map((component) => component.explanation).join(' ')}`;
    expect(text.toLowerCase()).not.toMatch(/guarantee|viral success|will go viral/);
  });
});
