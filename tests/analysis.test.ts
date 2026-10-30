import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import { RUBRIC_DEFINITION, buildLocalAssessment, scoreIdea } from '../src/lib/analysis';
import { ideaGaps } from '../src/lib/ideas';
import type { ContentIdea } from '../src/lib/types';

const demo = buildDemoBundle(SEED_PRESETS);
const preset = SEED_PRESETS[0]!;
const song = demo.songs[0]!;

function blankIdea(overrides: Partial<ContentIdea> = {}): ContentIdea {
  return {
    ...demo.content_ideas[0]!,
    title: '',
    concept_description: '',
    hook: '',
    intended_audience: null,
    scene_sequence: [],
    shot_list: [],
    on_screen_text: [],
    editing_notes: null,
    call_to_action: null,
    audio_section: null,
    song_id: null,
    ...overrides,
  };
}

describe('readiness rubric', () => {
  it('weights sum to 100%', () => {
    const total = RUBRIC_DEFINITION.reduce((sum, item) => sum + item.weight, 0);
    expect(Math.round(total * 100)).toBe(100);
  });

  it('always returns a score between 0 and 100', () => {
    for (const idea of [blankIdea(), demo.content_ideas[0]!, demo.content_ideas[3]!]) {
      const readiness = scoreIdea({ idea, preset, song, preferences: null });
      expect(readiness.score).toBeGreaterThanOrEqual(0);
      expect(readiness.score).toBeLessThanOrEqual(100);
      expect(readiness.components).toHaveLength(RUBRIC_DEFINITION.length);
    }
  });

  it('is deterministic and re-derives the weighted score from components', () => {
    const a = scoreIdea({ idea: demo.content_ideas[0]!, preset, song });
    const b = scoreIdea({ idea: demo.content_ideas[0]!, preset, song });
    expect(a.score).toBe(b.score);
    const weighted = a.components.reduce((sum, component) => sum + component.score * component.weight, 0);
    expect(Math.abs(weighted - a.score)).toBeLessThanOrEqual(1);
  });

  it('reduces confidence when required fields are empty', () => {
    const sparse = scoreIdea({ idea: blankIdea(), preset: null, song: null });
    const full = scoreIdea({ idea: demo.content_ideas[0]!, preset, song });
    expect(sparse.confidence).toBe('low');
    expect(full.confidence).not.toBe('low');
  });

  it('calls out missing inputs rather than padding the score', () => {
    const gaps = ideaGaps(blankIdea());
    expect(gaps.length).toBeGreaterThan(2);
    expect(gaps.join(' ')).toContain('shot');
  });

  it('states that the readiness number is a heuristic', () => {
    const readiness = scoreIdea({ idea: demo.content_ideas[0]!, preset, song });
    expect(readiness.disclaimer.toLowerCase()).toContain('heuristic');
    expect(readiness.rubric_version).toMatch(/rubric/);
  });

  it('produces a local assessment with every required section', () => {
    const assessment = buildLocalAssessment(demo.content_ideas[0]!, preset, song, null);
    expect(assessment.source).toBe('local-heuristic');
    expect(assessment.summary.length).toBeGreaterThan(20);
    expect(assessment.readiness.score).toBeGreaterThanOrEqual(0);
    expect(assessment.improvements.length).toBeGreaterThan(0);
    expect(assessment.next_steps.length).toBeGreaterThan(0);
    expect(assessment.revised_concept.length).toBeGreaterThan(0);
    expect(assessment.recommended_platforms.length).toBeGreaterThan(0);
  });
});
