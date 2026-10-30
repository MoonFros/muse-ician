import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import {
  PLATFORM_CONVENTIONS,
  buildLocalMetadata,
  hashtagsToInput,
  makeMetadataPackage,
  metadataPackageToText,
  parseHashtags,
} from '../src/lib/metadataTemplates';
import { PLATFORMS } from '../src/lib/types';

const demo = buildDemoBundle(SEED_PRESETS);
const idea = demo.content_ideas[0]!;
const song = demo.songs[0]!;
const preset = SEED_PRESETS.find((item) => item.id === idea.source_preset_id) ?? SEED_PRESETS[0]!;

describe('per-platform metadata', () => {
  it.each(PLATFORMS)('%s stays inside its documented limits', (platform) => {
    const draft = buildLocalMetadata({ idea, song, preset, platform, tone: 'conversational' });
    const convention = PLATFORM_CONVENTIONS[platform];
    expect(draft.title.length).toBeLessThanOrEqual(convention.titleLimit);
    expect(draft.caption.length).toBeLessThanOrEqual(convention.captionLimit);
    if (draft.description) {
      expect(draft.description.length).toBeLessThanOrEqual(convention.descriptionLimit ?? convention.captionLimit);
    }
    expect(draft.hashtags.length).toBeLessThanOrEqual(convention.hashtagTarget);
    expect(draft.hashtags.length).toBeLessThanOrEqual(convention.hashtagLimit);
    expect(draft.title.trim().length).toBeGreaterThan(0);
    expect(draft.caption.trim().length).toBeGreaterThan(20);
  });

  it('produces genuinely different copy per platform instead of one caption copied three times', () => {
    const captions = PLATFORMS.map(
      (platform) => buildLocalMetadata({ idea, song, preset, platform, tone: 'emotional' }).caption,
    );
    expect(new Set(captions).size).toBe(PLATFORMS.length);
  });

  it('explains what each piece of copy is based on and never claims trend data', () => {
    const draft = buildLocalMetadata({ idea, song, preset, platform: 'youtube-shorts', tone: 'direct' });
    expect(draft.rationale.toLowerCase()).toContain('no live trend data');
    expect(draft.rationale).toContain(PLATFORM_CONVENTIONS['youtube-shorts'].notes.slice(0, 20));
    expect(draft.accessibility_notes).toBeTruthy();
  });

  it('does not invent streaming links', () => {
    const draft = buildLocalMetadata({ idea, song: { ...song, streaming_url: null }, preset, platform: 'youtube-shorts', tone: 'direct' });
    expect(draft.caption.toLowerCase()).toContain('add yours');
    expect(draft.caption).not.toMatch(/https?:\/\/(?!.*streaming)/);
    expect(draft.caption).not.toContain('spotify.com');
  });

  it('uses a streaming link verbatim when one is saved', () => {
    const draft = buildLocalMetadata({
      idea,
      song: { ...song, streaming_url: 'https://example.com/listen' },
      preset,
      platform: 'youtube-shorts',
      tone: 'direct',
    });
    expect(draft.caption).toContain('https://example.com/listen');
  });

  it('documents hashtag reasons and normalises user input', () => {
    const parsed = parseHashtags('#IndiePop, bedroom pop   #indiepop #bad tag!', [
      { tag: '#indiepop', reason: 'Genre you saved.' },
    ]);
    // Whitespace and commas both separate tags, duplicates collapse, punctuation is stripped.
    expect(parsed.map((item) => item.tag)).toEqual(['#indiepop', '#bedroom', '#pop', '#bad', '#tag']);
    expect(parsed[0]!.reason).toContain('Genre');
    expect(parsed.slice(1).every((item) => (item.reason ?? '').includes('Added by you'))).toBe(true);
    expect(hashtagsToInput(parsed)).toBe('#indiepop #bedroom #pop #bad #tag');
  });

  it('builds a package record that is clearly sourced to the local template', () => {
    const pkg = makeMetadataPackage(
      buildLocalMetadata({ idea, song, preset, platform: 'tiktok', tone: 'funny' }),
    );
    expect(pkg.source).toBe('local-template');
    expect(pkg.status).toBe('draft');
    expect(pkg.content_idea_id).toBe(idea.id);
    expect(pkg.id).toMatch(/^meta-/);
    expect(pkg.is_demo).toBe(false);
  });

  it('exports readable plain text with character counts', () => {
    const pkg = makeMetadataPackage(
      buildLocalMetadata({ idea, song, preset, platform: 'instagram-reels', tone: 'emotional' }),
    );
    const text = metadataPackageToText(pkg);
    expect(text).toContain('Instagram Reels');
    expect(text).toContain('Caption:');
    expect(text).toContain('Character counts');
    expect(text.toLowerCase()).not.toContain('guaranteed');
  });
});
