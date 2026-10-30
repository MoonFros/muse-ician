import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import {
  PLATFORM_CONVENTIONS,
  buildChapters,
  buildLocalMetadata,
  chaptersToText,
  formatTimestamp,
  parseTimestamp,
} from '../src/lib/metadataTemplates';
import { LONG_FORM_PLATFORMS, PLATFORM_LABELS, PLATFORM_SHORT_LABELS, PLATFORMS, isLongForm } from '../src/lib/types';

const conventions = PLATFORM_CONVENTIONS['youtube-long'];
const demo = buildDemoBundle(SEED_PRESETS);
const idea = demo.content_ideas[0]!;
const song = demo.songs[0]!;
const longFormPreset = SEED_PRESETS.find((preset) => preset.id === 'preset-visualiser-loop')!;

describe('long-form platform surface', () => {
  it('is registered as a fourth platform with its own labels', () => {
    expect(PLATFORMS).toContain('youtube-long');
    expect(PLATFORMS).toHaveLength(4);
    expect(PLATFORM_LABELS['youtube-long']).toMatch(/long-form/i);
    expect(PLATFORM_SHORT_LABELS['youtube-long']).toBe('YouTube');
    expect(LONG_FORM_PLATFORMS).toContain('youtube-long');
    expect(isLongForm('youtube-long')).toBe(true);
    expect(isLongForm('youtube-shorts')).toBe(false);
  });

  it('publishes the real YouTube limits', () => {
    expect(conventions.titleLimit).toBe(100);
    expect(conventions.captionLimit).toBe(5000);
    expect(conventions.hashtagLimit).toBe(15);
    expect(conventions.longForm).toBe(true);
    expect(conventions.chapters).toBe(true);
    expect(conventions.typicalDuration.min).toBeGreaterThanOrEqual(120);
  });

  it('ships long-form presets that target it', () => {
    const longForm = SEED_PRESETS.filter((preset) => preset.platforms.includes('youtube-long'));
    expect(longForm.length).toBeGreaterThanOrEqual(5);
    for (const preset of longForm) {
      expect(preset.duration_seconds.min).toBeGreaterThanOrEqual(120);
      expect(preset.platforms).toEqual(['youtube-long']);
    }
  });
});

describe('chapters', () => {
  it('formats and parses timestamps', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(95)).toBe('1:35');
    expect(formatTimestamp(3725)).toBe('1:02:05');
    expect(parseTimestamp('1:35')).toBe(95);
    expect(parseTimestamp('1:02:05')).toBe(3725);
    expect(parseTimestamp('later')).toBeNull();
  });

  it('always starts at 0:00 with at least three entries, 10s apart', () => {
    const chapters = buildChapters({ idea, song, preset: longFormPreset });
    expect(chapters.length).toBeGreaterThanOrEqual(3);
    expect(chapters[0]!.timestamp).toBe('0:00');
    const seconds = chapters.map((chapter) => parseTimestamp(chapter.timestamp)!);
    for (let index = 1; index < seconds.length; index += 1) {
      expect(seconds[index]! - seconds[index - 1]!).toBeGreaterThanOrEqual(10);
    }
    expect(chaptersToText(chapters).split('\n')).toHaveLength(chapters.length);
  });

  it('respects a short runtime without emitting out-of-range timestamps', () => {
    const chapters = buildChapters({ idea, song, preset: longFormPreset, durationSeconds: 130 });
    for (const chapter of chapters) expect(parseTimestamp(chapter.timestamp)!).toBeLessThan(130);
  });
});

describe('long-form metadata draft', () => {
  const draft = buildLocalMetadata({
    idea,
    song,
    preset: longFormPreset,
    platform: 'youtube-long',
    tone: 'conversational',
  });

  it('writes a searchable title inside the limit', () => {
    expect(draft.title.length).toBeLessThanOrEqual(conventions.titleLimit);
    expect(draft.title).toMatch(/visualiser/i);
    expect(draft.title.toLowerCase()).not.toContain('#shorts');
  });

  it('puts chapters and a listen link in the description', () => {
    expect(draft.caption).toContain('CHAPTERS');
    expect(draft.caption).toContain('0:00');
    expect(draft.caption).toMatch(/LISTEN/);
    expect(draft.caption.length).toBeLessThanOrEqual(conventions.captionLimit);
  });

  it('writes long-form specific thumbnail, pinned comment and accessibility notes', () => {
    expect(draft.thumbnail_concept).toMatch(/1280×720/);
    expect(draft.pinned_comment).toMatch(/chapter/i);
    expect(draft.accessibility_notes).toMatch(/subtitle|caption/i);
    expect(draft.rationale).toMatch(/chapter/i);
  });

  it('keeps hashtags honest — no #shorts on a long-form video', () => {
    const tags = draft.hashtags.map((tag) => tag.tag.toLowerCase());
    expect(tags).not.toContain('#shorts');
    expect(tags.length).toBeLessThanOrEqual(conventions.hashtagLimit);
  });

  it('does not leak long-form copy into the short-form drafts', () => {
    const shorts = buildLocalMetadata({
      idea,
      song,
      preset: SEED_PRESETS.find((preset) => preset.platforms.includes('youtube-shorts'))!,
      platform: 'youtube-shorts',
      tone: 'conversational',
    });
    expect(shorts.caption).not.toContain('CHAPTERS');
    expect(shorts.title.length).toBeLessThanOrEqual(PLATFORM_CONVENTIONS['youtube-shorts'].titleLimit);
  });
});
