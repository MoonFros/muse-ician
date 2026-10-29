import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import { buildCaptionVariants, buildHookVariants, scoreVariant } from '../src/lib/variants';
import { REUSE_FORMAT_LABELS, buildReuseDrafts, reuseDraftsToText } from '../src/lib/reuse';
import { SERIES_SHAPES, buildSeriesPlan, materializeSeries } from '../src/lib/series';
import { buildRunway } from '../src/lib/runway';
import { buildComparativeReport, baselineFor, relativeToBaseline, sampleConfidence } from '../src/lib/comparatives';
import { readinessHistory, readinessTrend, scoreLatestVersion, sparklinePath } from '../src/lib/history';
import { buildBatchMetadata, csvCell, packagesToCsv } from '../src/lib/batch';
import { buildMergeReview } from '../src/lib/merge';
import { COMMANDS, matchCommands } from '../src/lib/commands';
import { calendarWarnings } from '../src/lib/campaignPlan';
import { PLATFORM_CONVENTIONS } from '../src/lib/metadataTemplates';
import type { ContentIdea, PerformanceRecord, WorkspaceData } from '../src/lib/types';
import { addDays, toDateKey } from '../src/lib/utils';

const demo = buildDemoBundle(SEED_PRESETS);
const workspace: WorkspaceData = {
  ...demo,
  presets: SEED_PRESETS,
  trends: [],
  preferences: {
    id: 'preferences' as const,
    artist_name: 'Test artist',
    persona: '',
    preferred_genres: [],
    preferred_moods: [],
    preferred_platforms: ['instagram-reels'],
    budget: null,
    equipment: [],
    filming_preferences: [],
    visual_style: '',
    default_tone: 'conversational',
    language: 'English',
    posting_cadence_days: 2,
    use_local_analysis: true,
    onboarding_complete: true,
    updated_at: '2026-10-01T00:00:00.000Z',
  },
};
const idea = demo.content_ideas[0]!;
const song = demo.songs[0]!;
const preset = SEED_PRESETS.find((item) => item.id === idea.source_preset_id) ?? SEED_PRESETS[0]!;

describe('A/B variant lab', () => {
  it('scores the same text deterministically', () => {
    const first = scoreVariant({ text: 'I nearly cut this line from the song', limit: 100, song });
    const second = scoreVariant({ text: 'I nearly cut this line from the song', limit: 100, song });
    expect(first.score).toBe(second.score);
    expect(first.components).toHaveLength(5);
  });

  it('penalises text over the platform limit instead of silently truncating the score', () => {
    const long = 'x'.repeat(200);
    const result = scoreVariant({ text: long, limit: 100 });
    expect(result.components.find((component) => component.key === 'length_fit')!.score).toBe(10);
    expect(result.notes.join(' ')).toContain('Over the 100-character limit');
  });

  it('builds hook variants that respect the platform title limit', () => {
    const variants = buildHookVariants({ idea, song, preset, platform: 'youtube-shorts' });
    expect(variants.length).toBeGreaterThanOrEqual(3);
    for (const variant of variants) {
      expect(variant.text.length).toBeLessThanOrEqual(PLATFORM_CONVENTIONS['youtube-shorts'].titleLimit);
      expect(variant.score).toBeGreaterThanOrEqual(0);
      expect(variant.score).toBeLessThanOrEqual(100);
    }
    expect(new Set(variants.map((variant) => variant.text)).size).toBe(variants.length);
  });

  it('builds caption variants that fit the caption limit and include a call to action', () => {
    const variants = buildCaptionVariants({
      idea,
      song,
      preset,
      platform: 'instagram-reels',
      tone: 'conversational',
    });
    expect(variants.length).toBeGreaterThanOrEqual(2);
    for (const variant of variants) {
      expect(variant.text.length).toBeLessThanOrEqual(PLATFORM_CONVENTIONS['instagram-reels'].captionLimit);
      expect(variant.components.find((component) => component.key === 'cta')!.score).toBeGreaterThan(50);
    }
  });
});

describe('content reuse', () => {
  const drafts = buildReuseDrafts({ idea, song, preset });

  it('produces every format with real text', () => {
    expect(drafts).toHaveLength(Object.keys(REUSE_FORMAT_LABELS).length);
    for (const draft of drafts) {
      expect(draft.body.trim().length).toBeGreaterThan(10);
      expect(draft.derivedFrom.length).toBeGreaterThan(0);
    }
  });

  it('keeps the X post inside 280 characters and flags over-limit formats', () => {
    const post = drafts.find((draft) => draft.format === 'x-post')!;
    expect(post.chars).toBeLessThanOrEqual(280);
    expect(post.overLimit).toBe(false);
  });

  it('carries the idea and song ids so a draft can be traced back', () => {
    expect(drafts[0]!.derivedFrom).toContain(`idea:${idea.id}`);
    expect(drafts[0]!.derivedFrom).toContain(`song:${song.id}`);
  });

  it('exports a single copyable pack', () => {
    const text = reuseDraftsToText(drafts, { ideaTitle: idea.title });
    expect(text).toContain(idea.title);
    expect(text).toContain('=== Carousel (5 slides) ===');
  });
});

describe('series planner', () => {
  it.each(SERIES_SHAPES)('%s builds distinct parts with different jobs', (shape) => {
    const plan = buildSeriesPlan({ preset, song, shape, parts: 4, startDate: '2026-11-01', cadenceDays: 2 });
    expect(plan.parts).toHaveLength(4);
    expect(new Set(plan.parts.map((part) => part.title)).size).toBe(4);
    expect(new Set(plan.parts.map((part) => part.goal)).size).toBe(4);
    expect(plan.parts[0]!.scheduledDate).toBe('2026-11-01');
    expect(plan.parts[1]!.scheduledDate).toBe('2026-11-03');
  });

  it('clamps part counts to the supported 3–5 range', () => {
    expect(buildSeriesPlan({ preset, song, shape: 'making-of', parts: 9 }).parts).toHaveLength(5);
    expect(buildSeriesPlan({ preset, song, shape: 'making-of', parts: 1 }).parts).toHaveLength(3);
  });

  it('materialises ideas and posts that reference each other', () => {
    const plan = buildSeriesPlan({ preset, song, shape: 'teaser-arc', parts: 3, startDate: '2026-12-01' });
    const output = materializeSeries(plan, preset, song);
    expect(output.ideas).toHaveLength(3);
    expect(output.posts).toHaveLength(3);
    for (const post of output.posts) {
      expect(output.ideas.some((materialised: ContentIdea) => materialised.id === post.content_idea_id)).toBe(true);
    }
    expect(output.ideas[0]!.notes).toContain('Part 1 of 3');
    expect(output.ideas.every((materialised) => materialised.status === 'planning')).toBe(true);
  });
});

describe('release runway', () => {
  it('walks backwards from the release date and only shows future steps', () => {
    const releaseDate = addDays(toDateKey(), 21);
    const runway = buildRunway({
      song: { ...song, release_date: releaseDate },
      presets: SEED_PRESETS,
      posts: [],
      ideas: demo.content_ideas,
    });
    expect(runway.releaseDate).toBe(releaseDate);
    expect(runway.daysUntilRelease).toBe(21);
    expect(runway.steps.length).toBeGreaterThan(0);
    for (const step of runway.steps) {
      expect(step.date >= toDateKey()).toBe(true);
    }
    expect(runway.steps.some((step) => step.date === releaseDate && step.phase === 'launch')).toBe(true);
  });

  it('warns when nothing is planned for release day', () => {
    const releaseDate = addDays(toDateKey(), 10);
    const runway = buildRunway({
      song: { ...song, release_date: releaseDate },
      presets: SEED_PRESETS,
      posts: [],
      ideas: [],
    });
    expect(runway.warnings.join(' ')).toContain('Nothing is planned for release day');
  });

  it('marks a step as already planned when a post exists on that date', () => {
    const releaseDate = addDays(toDateKey(), 14);
    const runway = buildRunway({
      song: { ...song, release_date: releaseDate },
      presets: SEED_PRESETS,
      posts: [
        {
          ...demo.planned_posts[0]!,
          id: 'post-release-day',
          scheduled_date: releaseDate,
        },
      ],
      ideas: demo.content_ideas,
    });
    const launch = runway.steps.find((step) => step.date === releaseDate && step.phase === 'launch');
    expect(launch?.alreadyPlanned).toBe(true);
    expect(launch?.existingPostId).toBe('post-release-day');
  });
});

describe('comparatives', () => {
  function record(overrides: Partial<PerformanceRecord>): PerformanceRecord {
    return { ...demo.performance_records[0]!, ...overrides };
  }

  it('gates confidence on sample size', () => {
    expect(sampleConfidence(0)).toBe('too-small');
    expect(sampleConfidence(3)).toBe('low');
    expect(sampleConfidence(6)).toBe('medium');
    expect(sampleConfidence(12)).toBe('high');
  });

  it('exposes a median baseline only once there are enough posts', () => {
    expect(baselineFor([record({ views: 900 })])).toBeNull();
    const enough = [500, 900, 1300].map((views, index) => record({ id: `r${index}`, views }));
    expect(baselineFor(enough)).toBe(900);
    expect(relativeToBaseline(1300, 900)).toBe('1.4× your median');
    expect(relativeToBaseline(400, 900)).toContain('below your median');
  });

  it('refuses to rank platforms that are below the minimum sample', () => {
    const report = buildComparativeReport([record({ views: 1000 })], {
      ideas: demo.content_ideas,
      presets: SEED_PRESETS,
      songs: demo.songs,
    });
    expect(report.overall.actionable).toBe(false);
    expect(report.observations[0]!.confidence).toBe('too-small');
    expect(report.byPlatform.every((group) => !group.actionable)).toBe(true);
  });
});

describe('readiness history', () => {
  it('reads scores from versions and the current assessment, oldest first', () => {
    const scored: ContentIdea = {
      ...idea,
      versions: scoreLatestVersion(
        [
          { id: 'v2', label: 'After rewrite', created_at: '2026-10-02T10:00:00.000Z', snapshot: { title: 't', concept_description: '', hook: '', scene_sequence: [], shot_list: [], on_screen_text: [], editing_notes: '', call_to_action: '', audio_section: '' } },
          { id: 'v1', label: 'First draft', created_at: '2026-10-01T10:00:00.000Z', snapshot: { title: 't', concept_description: '', hook: '', scene_sequence: [], shot_list: [], on_screen_text: [], editing_notes: '', call_to_action: '', audio_section: '' } },
        ],
        72,
        'local-heuristic',
      ),
      coach_assessment: {
        ...demo.content_ideas.find((item) => item.coach_assessment)!.coach_assessment!,
        generated_at: '2026-10-03T10:00:00.000Z',
      },
    };
    const points = readinessHistory(scored);
    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points[0]!.at <= points[points.length - 1]!.at).toBe(true);
    expect(points.some((point) => point.source === 'local-heuristic')).toBe(true);
    expect(sparklinePath(points, 100, 40)).toContain('M');
  });

  it('reports a direction only when there are two points', () => {
    const single = readinessTrend({ ...idea, versions: [], coach_assessment: null });
    expect(single.direction).toBe('none');
    expect(single.points).toHaveLength(0);
  });
});

describe('batch metadata and CSV', () => {
  const result = buildBatchMetadata({
    ideas: demo.content_ideas.slice(0, 3),
    presets: SEED_PRESETS,
    songs: demo.songs,
    platforms: ['youtube-shorts', 'tiktok'],
    tone: 'conversational',
  });

  it('builds one package per idea per platform', () => {
    expect(result.packages).toHaveLength(6);
    expect(new Set(result.packages.map((pkg) => pkg.platform)).size).toBe(2);
  });

  it('escapes spreadsheet formulas so a caption cannot execute', () => {
    expect(csvCell('=HYPERLINK("http://evil.example")')).toBe(`"'=HYPERLINK(""http://evil.example"")"`);
    expect(csvCell('+1 555')).toBe(`'+1 555`);
    expect(csvCell('@handle')).toBe(`'@handle`);
    expect(csvCell('normal caption')).toBe('normal caption');
  });

  it('writes a header row and one row per package', () => {
    const csv = packagesToCsv(result.packages, { ideas: demo.content_ideas, songs: demo.songs });
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toContain('platform');
    expect(lines).toHaveLength(result.packages.length + 1);
  });
});

describe('collaborator merge review', () => {
  it('reports conflicts without applying anything', () => {
    const payload = {
      schema_version: '1.0.0',
      export_type: 'workspace_backup' as const,
      manifest: { app_version: '1.0.0', exported_at: '2026-10-01T00:00:00.000Z' } as never,
      songs: [{ ...demo.songs[0]!, title: 'Renamed by collaborator' }],
    };
    const review = buildMergeReview(payload, workspace, 'skip');
    const songsRow = review.rows.find((row) => row.collection === 'songs');
    expect(songsRow?.conflicts).toBe(1);
    expect(review.totals.skipped).toBe(1);
    expect(review.safeToApply).toBe(true);
    expect(review.headline).toContain('1 record');
  });

  it('reports an empty file as nothing to merge', () => {
    const review = buildMergeReview(
      { schema_version: '1.0.0', export_type: 'preset_pack' as const, manifest: { app_version: '1.0.0', exported_at: '2026-10-01T00:00:00.000Z' } as never, presets: [] },
      workspace,
      'skip',
    );
    expect(review.safeToApply).toBe(false);
    expect(review.headline).toContain('no records');
  });
});

describe('command palette', () => {
  it('every command points at a real route', () => {
    for (const command of COMMANDS) {
      expect(command.to.startsWith('/')).toBe(true);
      expect(command.label.length).toBeGreaterThan(3);
    }
    expect(new Set(COMMANDS.map((command) => command.id)).size).toBe(COMMANDS.length);
  });

  it('matches on keywords as well as labels', () => {
    expect(matchCommands('openai').some((command) => command.id === 'cmd-settings')).toBe(true);
    expect(matchCommands('runway').some((command) => command.id === 'cmd-runway')).toBe(true);
    expect(matchCommands('zzzzz')).toHaveLength(0);
  });
});

describe('calendar warnings', () => {
  it('flags three posts landing on the same day', () => {
    const date = '2026-11-05';
    const posts = [1, 2, 3].map((index) => ({
      ...demo.planned_posts[0]!,
      id: `clash-${index}`,
      content_idea_id: `idea-${index}`,
      scheduled_date: date,
    }));
    const warnings = calendarWarnings(posts, [], '2026-11-01');
    expect(warnings.some((warning) => warning.id === `clash-${date}`)).toBe(true);
  });
});
