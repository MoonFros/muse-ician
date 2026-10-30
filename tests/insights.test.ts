import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import { performanceRelativeToBaseline, summarizePerformance } from '../src/lib/insights';
import type { PerformanceRecord } from '../src/lib/types';

const demo = buildDemoBundle(SEED_PRESETS);
const ctx = { ideas: demo.content_ideas, presets: SEED_PRESETS, songs: demo.songs };

function record(overrides: Partial<PerformanceRecord>): PerformanceRecord {
  return { ...demo.performance_records[0]!, ...overrides };
}

describe('performance insights', () => {
  it('refuses to claim patterns from too few records', () => {
    const summary = summarizePerformance([record({ views: 1200 })], ctx);
    expect(summary.observations).toHaveLength(1);
    expect(summary.observations[0]!.text.toLowerCase()).toContain('comparisons become meaningful');
    expect(summary.observations[0]!.kind).toBe('observed');
  });

  it('separates observations from possible explanations', () => {
    const records = Array.from({ length: 8 }, (_, index) =>
      record({
        id: `record-${index}`,
        views: 500 + index * 250,
        platform: index % 2 === 0 ? 'instagram-reels' : 'tiktok',
        content_idea_id: demo.content_ideas[index % demo.content_ideas.length]!.id,
        published_on: `2026-09-${String(index + 1).padStart(2, '0')}`,
      }),
    );
    const summary = summarizePerformance(records, ctx);
    const kinds = new Set(summary.observations.map((observation) => observation.kind));
    expect(kinds.size).toBeGreaterThan(0);
    for (const observation of summary.observations) {
      expect(['observed', 'inferred']).toContain(observation.kind);
      expect(['low', 'medium', 'high']).toContain(observation.confidence);
      expect(observation.text).not.toEqual('');
    }
  });

  it('always states that numbers are hand-typed and platforms are not comparable', () => {
    const summary = summarizePerformance(demo.performance_records, ctx);
    const caveats = summary.caveats.join(' ').toLowerCase();
    expect(caveats).toContain('typed');
    expect(caveats).toMatch(/not .*comparable|differ/);
  });

  it('computes a baseline median and labels records relative to it', () => {
    const summary = summarizePerformance(demo.performance_records, ctx);
    expect(summary.baselineViews).toBeGreaterThan(0);
    const above = performanceRelativeToBaseline(record({ views: (summary.baselineViews ?? 0) * 3 }), summary.baselineViews);
    const below = performanceRelativeToBaseline(record({ views: 1 }), summary.baselineViews);
    expect(above.tone).toBe('above');
    expect(below.tone).toBe('below');
    expect(above.label).toContain('above');
  });

  it('reports missing metrics instead of assuming them', () => {
    const summary = summarizePerformance(
      [record({ completion_rate: null, avg_watch_time_seconds: null, saves: null })],
      ctx,
    );
    expect(summary.missingData.length).toBeGreaterThan(0);
  });
});
