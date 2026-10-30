import { describe, expect, it } from 'vitest';
import { EXPANSION_PRESETS_RAW } from '../src/data/expansionPresets';
import { SEED_PRESETS } from '../src/data/seedPresets';

/**
 * The starter library is shipped as data, so these tests guard the properties
 * that make it useful rather than merely large: stable unique ids, no format
 * added twice under different names, and a complete execution recipe in every
 * entry.
 */
describe('starter preset library', () => {
  it('has no duplicate ids or titles', () => {
    const ids = SEED_PRESETS.map((preset) => preset.id);
    const titles = SEED_PRESETS.map((preset) => preset.title.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('includes every newer format exactly once and keeps the original set intact', () => {
    expect(EXPANSION_PRESETS_RAW).toHaveLength(16);
    for (const preset of EXPANSION_PRESETS_RAW) {
      expect(SEED_PRESETS.filter((item) => item.id === preset.id)).toHaveLength(1);
    }
    for (const original of ['preset-relatable-pov', 'preset-mini-music-video', 'preset-visualiser-loop']) {
      expect(SEED_PRESETS.some((preset) => preset.id === original)).toBe(true);
    }
  });

  it.each(SEED_PRESETS.map((preset) => [preset.title, preset] as const))(
    '%s ships a complete execution recipe',
    (_title, preset) => {
      expect(preset.summary.length).toBeGreaterThan(30);
      expect(preset.description.length).toBeGreaterThan(200);
      expect(preset.objectives.length).toBeGreaterThan(0);
      expect(preset.hook_examples.length).toBeGreaterThanOrEqual(3);
      expect(preset.execution_steps.length).toBeGreaterThanOrEqual(5);
      expect(preset.shot_list.length).toBeGreaterThanOrEqual(1);
      expect(preset.cta_examples.length).toBeGreaterThanOrEqual(2);
      expect(preset.common_mistakes?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(preset.accessibility_notes?.length ?? 0).toBeGreaterThan(40);
      expect(preset.estimated_production_minutes ?? 0).toBeGreaterThan(0);
      expect(preset.duration_seconds.min).toBeLessThanOrEqual(preset.duration_seconds.max);
      expect(preset.platforms.length).toBeLessThanOrEqual(3);
      expect(preset.example_metadata?.caption_example?.length ?? 0).toBeGreaterThan(40);
    },
  );

  it('keeps long-form formats on the long-form platform only', () => {
    const longForm = SEED_PRESETS.filter((preset) => preset.platforms.includes('youtube-long'));
    expect(longForm).toHaveLength(5);
    for (const preset of longForm) {
      expect(preset.platforms).toEqual(['youtube-long']);
      expect(preset.duration_seconds.min).toBeGreaterThanOrEqual(120);
    }
  });
});
