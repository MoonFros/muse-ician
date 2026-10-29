import type {
  ContentIdea,
  HashtagSuggestion,
  MetadataPackage,
  Platform,
  Preset,
  Song,
  Tone,
} from './types';
import { SCHEMA_VERSION } from './types';
import { newId, nowIso, pluralize, slugify, truncate } from './utils';

/**
 * Per-platform metadata conventions.
 *
 * These numbers were checked against platform help/creator documentation and
 * public limit trackers in October 2026. Platforms change limits without notice,
 * so every screen that shows a limit also says to re-check it before publishing.
 * Nothing here is a performance claim: matching a convention does not promise reach.
 */
export interface PlatformConvention {
  label: string;
  /** What the "title" field means on this platform. Instagram and TikTok have no separate title field. */
  titleLabel: string;
  titleLimit: number;
  captionLimit: number;
  descriptionLimit: number | null;
  hashtagTarget: number;
  hashtagLimit: number;
  /** Characters of the caption that typically show before a "more" cut. */
  visibleCaptionHint: number;
  searchable: boolean;
  pinnedComment: boolean;
  /** Long-form surfaces use the description as the primary body and support chapters. */
  longForm?: boolean;
  /** Chapters need the first timestamp at 0:00 and at least three entries. */
  chapters?: boolean;
  /** Suggested length range in seconds for this surface. */
  typicalDuration: { min: number; max: number };
  notes: string;
  sourceNote: string;
}

export const PLATFORM_CONVENTIONS: Record<Platform, PlatformConvention> = {
  'youtube-shorts': {
    label: 'YouTube Shorts',
    titleLabel: 'Short title',
    titleLimit: 100,
    captionLimit: 5000,
    descriptionLimit: 5000,
    hashtagTarget: 3,
    hashtagLimit: 15,
    visibleCaptionHint: 100,
    searchable: true,
    pinnedComment: true,
    typicalDuration: { min: 15, max: 60 },
    notes:
      'Title carries the search terms; the description is indexed but only its first ~100 characters show above the fold. First three hashtags in the description can appear above the title, and a video with more than 15 hashtags loses hashtag display entirely — so use a few, specific ones.',
    sourceNote: 'YouTube Help / Studio upload limits, verified October 2026: title 100 characters, description 5,000 characters.',
  },
  'instagram-reels': {
    label: 'Instagram Reels',
    titleLabel: 'On-screen / cover line',
    titleLimit: 125,
    captionLimit: 2200,
    descriptionLimit: null,
    hashtagTarget: 5,
    hashtagLimit: 30,
    visibleCaptionHint: 125,
    searchable: true,
    pinnedComment: true,
    typicalDuration: { min: 10, max: 90 },
    notes:
      'Reels have no separate title, so this field is the line you burn into the video and/or open the caption with. Only the first ~125 characters show before “more”, and hashtags count inside the 2,200-character caption.',
    sourceNote: 'Instagram Help Centre caption and hashtag limits, verified October 2026: caption 2,200 characters, 30 hashtags per post.',
  },
  tiktok: {
    label: 'TikTok',
    titleLabel: 'Opening caption line',
    titleLimit: 100,
    captionLimit: 2200,
    descriptionLimit: null,
    hashtagTarget: 4,
    hashtagLimit: 30,
    visibleCaptionHint: 100,
    searchable: true,
    pinnedComment: true,
    typicalDuration: { min: 10, max: 180 },
    notes:
      'TikTok has no title field — the first line of the caption is the hook, and roughly the first 100 characters show in the feed. Captions of about 150–300 characters are the practical range; keywords in the caption are read as search text.',
    sourceNote: 'TikTok Creator documentation and caption limit trackers, verified October 2026: caption 2,200 characters, 30 hashtags.',
  },
  'youtube-long': {
    label: 'YouTube (long-form)',
    titleLabel: 'Video title',
    titleLimit: 100,
    captionLimit: 5000,
    descriptionLimit: 5000,
    hashtagTarget: 3,
    hashtagLimit: 15,
    visibleCaptionHint: 157,
    searchable: true,
    pinnedComment: true,
    longForm: true,
    chapters: true,
    typicalDuration: { min: 120, max: 900 },
    notes:
      'Long-form YouTube is searched, not scrolled: the title carries the phrase someone would type, the description is indexed and holds chapters and links. Chapters need a 0:00 entry and at least three timestamps of 10 seconds or more. More than 15 hashtags in the description disables hashtag display entirely.',
    sourceNote:
      'YouTube Help / Studio upload limits, verified October 2026: title 100 characters, description 5,000 characters, tags field 500 characters total, chapters require 3+ timestamps starting at 0:00.',
  },
};

export interface LocalMetadataDraft {
  content_idea_id: string;
  song_id: string | null;
  platform: Platform;
  tone: Tone;
  title: string;
  caption: string;
  description: string | null;
  search_phrases: string[];
  hashtags: HashtagSuggestion[];
  call_to_action: string | null;
  pinned_comment: string | null;
  thumbnail_concept: string | null;
  opening_overlay: string | null;
  alternative_hooks: string[];
  suggested_duration_seconds: number | null;
  recommended_excerpt: string | null;
  accessibility_notes: string | null;
  rationale: string;
  source: 'local-template';
}

interface ToneVoice {
  opening: string;
  closing: string;
}

const TONE_VOICE: Record<Tone, ToneVoice> = {
  emotional: {
    opening: 'The part I keep coming back to:',
    closing: 'If this is your kind of thing, the full song is out now.',
  },
  direct: {
    opening: '',
    closing: 'Full version in my bio.',
  },
  conversational: {
    opening: 'Okay so —',
    closing: 'Tell me which line hit you and I will read every reply.',
  },
  funny: {
    opening: 'Not me still thinking about this line.',
    closing: 'If you guess right, the next one is for you.',
  },
  mysterious: {
    opening: 'There is one line in this song I have never explained.',
    closing: 'Guess the meaning before I say it out loud.',
  },
  cinematic: {
    opening: 'Shot this at the end of the day, one take.',
    closing: 'Full song in my bio if this is your kind of thing.',
  },
  minimal: {
    opening: '',
    closing: 'The song says the rest of it.',
  },
  storytelling: {
    opening: 'This song started because of one sentence someone said to me.',
    closing: 'Ask me anything about how this was made.',
  },
};

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function sentence(value: string | null | undefined, fallback = ''): string {
  const text = clean(value);
  if (!text) return fallback;
  return /[.!?:;]$/.test(text) ? text : `${text}.`;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

/** Turn a hashtag input string into structured suggestions, keeping reasons from `existing` where possible. */
export function parseHashtags(input: string, existing: HashtagSuggestion[] = []): HashtagSuggestion[] {
  const seen = new Set<string>();
  const out: HashtagSuggestion[] = [];
  for (const raw of input.split(/[\s,]+/)) {
    const stripped = raw.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (!stripped) continue;
    const tag = `#${stripped.toLowerCase()}`;
    if (seen.has(tag)) continue;
    seen.add(tag);
    const known = existing.find((item) => item.tag.toLowerCase() === tag);
    out.push({ tag, reason: clean(known?.reason) || 'Added by you.' });
  }
  return out;
}

export function hashtagsToInput(tags: HashtagSuggestion[] | undefined | null): string {
  return (tags ?? []).map((item) => item.tag).join(' ');
}

function tagFrom(value: string): string {
  const slug = slugify(value).replace(/-/g, '');
  return slug ? `#${slug}` : '';
}

function buildHashtags(
  platform: Platform,
  idea: ContentIdea,
  song: Song | null,
  preset: Preset | null,
): HashtagSuggestion[] {
  const convention = PLATFORM_CONVENTIONS[platform];
  const candidates: HashtagSuggestion[] = [];
  const push = (tag: string, reason: string) => {
    if (!tag) return;
    if (candidates.some((item) => item.tag.toLowerCase() === tag.toLowerCase())) return;
    candidates.push({ tag, reason });
  };

  if (song?.genre) push(tagFrom(song.genre), `Genre you saved on “${song.title}”.`);
  if (song?.subgenre) push(tagFrom(song.subgenre), 'Subgenre from the song record.');
  if (song?.moods?.length) {
    push(tagFrom(song.moods[0]), 'Mood you saved for this song — describes the feel, not a claim about reach.');
  }
  if (song?.title) {
    const titleTag = tagFrom(song.title);
    if (titleTag.length > 2 && titleTag.length <= 26) {
      push(titleTag, 'Your own song title, so a search for it can find this post.');
    }
  }

  if (preset?.genre_tags?.length) {
    push(tagFrom(preset.genre_tags[0]), `Genre tag from the “${preset.title}” preset.`);
  } else if (preset?.tags?.length) {
    const specific = preset.tags.find((tag) => !['introduction', 'storytelling', 'performance'].includes(tag.toLowerCase()));
    if (specific) push(tagFrom(specific), `Format tag from the “${preset.title}” preset.`);
  }
  if (idea.source_preset_id && song) {
    push('#originalmusic', 'Signals original work rather than a cover.');
  }

  const theme = song?.themes?.[0];
  if (theme) push(tagFrom(theme), 'Theme from your song notes — useful for topical search.');

  if (platform === 'youtube-shorts') {
    push('#shorts', 'Helps the video show in YouTube’s Shorts surfaces.');
  } else if (platform === 'instagram-reels') {
    push('#reels', 'Format tag for Instagram Reels.');
  } else if (platform === 'tiktok') {
    push('#newmusic', 'Common discovery tag for original releases. No guarantee of reach.');
  }

  push('#independentartist', 'Describes how you release music, from your own profile rather than trend data.');
  push('#songwriter', 'Craft tag that fits the lyric-focused concepts in your library.');

  return candidates.slice(0, convention.hashtagTarget);
}

function buildSearchPhrases(platform: Platform, idea: ContentIdea, song: Song | null, preset: Preset | null): string[] {
  if (!PLATFORM_CONVENTIONS[platform].searchable) return [];
  const phrases = new Set<string>();
  if (song?.title) {
    phrases.add(song.title);
    if (song.artist) phrases.add(`${song.title} ${song.artist}`);
    phrases.add(`${song.title} lyrics`);
  }
  if (song?.genre) phrases.add(`${song.genre} ${song.subgenre ?? 'artist'}`.trim());
  if (song?.moods?.length) phrases.add(`${song.moods[0]} ${song.genre ?? 'song'}`.trim());
  if (preset?.title) phrases.add(`${preset.title.toLowerCase()} video`);
  if (idea.hook) phrases.add(clean(idea.hook).split(' ').slice(0, 7).join(' '));
  if (song?.themes?.[0]) phrases.add(song.themes[0]);
  return Array.from(phrases).filter(Boolean).slice(0, 8);
}

function buildAlternatives(idea: ContentIdea, song: Song | null): string[] {
  const options: string[] = [];
  if (song?.strongest_lyrics?.length) options.push(`“${truncate(clean(song.strongest_lyrics[0]), 70)}”`);
  if (song?.title) options.push(`The line in ${song.title} that took the longest to write`);
  options.push(truncate(clean(idea.concept_description), 70));
  if (idea.intended_audience) options.push(`For ${truncate(clean(idea.intended_audience), 60)}`);
  return unique(options.filter(Boolean)).slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Chapters (long-form YouTube only)                                          */
/* -------------------------------------------------------------------------- */

export interface Chapter {
  timestamp: string;
  label: string;
}

/** Seconds → `m:ss` (or `h:mm:ss` past an hour). */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/** Parse `mm:ss` / `h:mm:ss` back to seconds, or null when it is not a timestamp. */
export function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, hours, minutes, secs] = match;
  const total = Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(secs);
  return Number.isFinite(total) ? total : null;
}

/**
 * Chapters for a long-form video.
 *
 * YouTube only honours a chapter list when it starts at 0:00, has at least
 * three entries and every entry is at least 10 seconds long, so this builder
 * enforces those rules rather than emitting something that silently fails.
 * Timestamps come from your own song notes when you saved them; otherwise the
 * video is divided evenly and the labels come from the idea's scene sequence.
 */
export function buildChapters(input: {
  idea: ContentIdea;
  song?: Song | null;
  preset?: Preset | null;
  durationSeconds?: number | null;
}): Chapter[] {
  const { idea, song } = input;
  const duration =
    input.durationSeconds ??
    (input.preset ? Math.round((input.preset.duration_seconds.min + input.preset.duration_seconds.max) / 2) : 210);

  const fromSong = (song?.audio_sections ?? [])
    .map((section) => {
      const seconds = section.timestamp ? parseTimestamp(section.timestamp) : null;
      return seconds === null ? null : { seconds, label: section.label.trim() };
    })
    .filter((entry): entry is { seconds: number; label: string } => Boolean(entry && entry.label))
    .sort((a, b) => a.seconds - b.seconds);

  const scenes = (idea.scene_sequence ?? [])
    .map((scene) => scene.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  const onScreen = (idea.on_screen_text ?? []).filter(Boolean);

  const fallbackLabels = [
    'Cold open',
    ...scenes.slice(0, 5),
    onScreen[0] ? `“${truncate(onScreen[0], 40)}”` : 'Outro',
  ];

  const entries: { seconds: number; label: string }[] = [];
  if (fromSong.length >= 3) {
    entries.push({ seconds: 0, label: fromSong[0]!.seconds === 0 ? fromSong[0]!.label : 'Intro' });
    for (const entry of fromSong) {
      if (entry.seconds === 0) continue;
      entries.push(entry);
    }
  } else {
    const count = Math.max(4, Math.min(6, fallbackLabels.length));
    for (let index = 0; index < count; index += 1) {
      entries.push({
        seconds: Math.round((duration / count) * index),
        label: truncate(fallbackLabels[index] ?? `Part ${index + 1}`, 60),
      });
    }
  }

  // Enforce YouTube's rules: start at 0:00, at least 10s apart, unique timestamps.
  const cleaned: { seconds: number; label: string }[] = [];
  for (const entry of entries) {
    const last = cleaned[cleaned.length - 1];
    if (!last) {
      cleaned.push({ seconds: 0, label: entry.label });
      continue;
    }
    if (entry.seconds - last.seconds < 10) continue;
    if (entry.seconds >= duration - 5) continue;
    cleaned.push(entry);
  }

  while (cleaned.length < 3) {
    const index = cleaned.length;
    const seconds = Math.min(duration - 5, Math.round((duration / 3) * index));
    if (cleaned.some((entry) => entry.seconds === seconds)) break;
    cleaned.push({ seconds, label: fallbackLabels[index] ?? `Part ${index + 1}` });
  }

  return cleaned.map((entry) => ({ timestamp: formatTimestamp(entry.seconds), label: truncate(entry.label, 60) }));
}

const LONG_FORM_SUFFIXES: { match: RegExp; suffix: string }[] = [
  { match: /visuali[sz]er/i, suffix: '(Official Visualiser)' },
  { match: /lyric/i, suffix: '(Lyric Video)' },
  { match: /live|session|acoustic/i, suffix: '(Live Session)' },
  { match: /documentary|making|behind/i, suffix: '(Behind the Song)' },
  { match: /full song|audio|official audio/i, suffix: '(Official Audio)' },
];

/** A searchable long-form title: the phrase someone would type, plus the format. */
export function buildLongFormTitle(input: {
  idea: ContentIdea;
  song?: Song | null;
  preset?: Preset | null;
  limit: number;
}): string {
  const { idea, song, preset } = input;
  const songPart = song ? `${song.title}${song.artist ? ` — ${song.artist}` : ''}` : clean(idea.title);
  const haystack = `${preset?.title ?? ''} ${preset?.tags?.join(' ') ?? ''} ${idea.title} ${idea.concept_description}`;
  const suffix = LONG_FORM_SUFFIXES.find((entry) => entry.match.test(haystack))?.suffix ?? '';
  const candidates = [
    [songPart, suffix].filter(Boolean).join(' '),
    [preset?.title, song ? song.title : '', suffix].filter(Boolean).join(' · '),
    songPart,
  ];
  const chosen = candidates.find((candidate) => candidate.trim().length > 0) ?? idea.title;
  return truncate(chosen.trim(), input.limit);
}

/** Chapters rendered as the block you paste into a YouTube description. */
export function chaptersToText(chapters: Chapter[]): string {
  return chapters.map((chapter) => `${chapter.timestamp} ${chapter.label}`).join('\n');
}

function defaultCta(platform: Platform, song: Song | null): string {
  if (platform === 'youtube-shorts') {
    return song ? `Full song: ${song.title} — link in the description.` : 'Full version linked in the description.';
  }
  if (platform === 'instagram-reels') return 'Save this if it lands, and tell me which line you would keep.';
  if (platform === 'youtube-long') {
    return 'If this is your kind of thing, subscribe for the next one and tell me which section to break down.';
  }
  return 'Which line would you have kept? Reply and I will answer.';
}

export function buildLocalMetadata(input: {
  idea: ContentIdea;
  preset?: Preset | null;
  song?: Song | null;
  platform: Platform;
  tone: Tone;
}): LocalMetadataDraft {
  const { idea, platform, tone } = input;
  const preset = input.preset ?? null;
  const song = input.song ?? null;
  const convention = PLATFORM_CONVENTIONS[platform];
  const voice = TONE_VOICE[tone] ?? TONE_VOICE.conversational;

  const hook = clean(idea.hook) || clean(idea.title);
  const title = convention.longForm
    ? buildLongFormTitle({ idea, song, preset, limit: convention.titleLimit })
    : truncate(hook || idea.title, convention.titleLimit);
  const cta = clean(idea.call_to_action) || defaultCta(platform, song);
  const presetDuration = preset
    ? Math.round((preset.duration_seconds.min + preset.duration_seconds.max) / 2)
    : null;
  const duration = convention.longForm
    ? Math.min(
        convention.typicalDuration.max,
        Math.max(convention.typicalDuration.min, presetDuration ?? 210),
      )
    : (presetDuration ??
      (idea.estimated_production_minutes ? Math.round(idea.estimated_production_minutes / 2) : 30));

  const chapters = convention.chapters ? buildChapters({ idea, song, preset, durationSeconds: duration }) : [];

  const credit = song
    ? `${song.title}${song.artist ? ` — ${song.artist}` : ''}${song.release_status === 'released' ? '' : ` (${song.release_status?.replace(/_/g, ' ')})`}`
    : 'Original song — title to be added';

  const excerpt =
    clean(idea.audio_section) ||
    (song?.audio_sections?.length
      ? `${song.audio_sections[0].label}${song.audio_sections[0].timestamp ? ` at ${song.audio_sections[0].timestamp}` : ''}`
      : preset?.audio_guidance) ||
    'Choose the strongest 15–20 seconds from your saved song notes.';

  let caption: string;
  let description: string | null = null;

  if (platform === 'youtube-shorts') {
    const body = [
      voice.opening ? sentence(voice.opening) : '',
      sentence(truncate(clean(idea.concept_description), 240)),
      song?.description ? sentence(truncate(clean(song.description), 180)) : '',
      `Excerpt: ${excerpt}.`,
      cta,
      `Song: ${credit}.`,
      song?.streaming_url ? `Listen: ${song.streaming_url}` : 'Streaming link: add yours before publishing.',
      '',
      'Written with muse-ician. No trend data was used, and no reach is promised.',
    ]
      .filter((line) => line !== '')
      .join('\n');
    caption = truncate(body, convention.captionLimit);
    description = truncate(
      [
        sentence(hook),
        '',
        sentence(idea.concept_description),
        '',
        `Song: ${credit}`,
        `Excerpt: ${excerpt}`,
        song?.themes?.length ? `Themes: ${song.themes.join(', ')}` : '',
        '',
        'Captions and on-screen text: turn on subtitles so the video works muted.',
        song?.streaming_url ? `Listen: ${song.streaming_url}` : 'Add your streaming link here if you have one.',
      ]
        .filter(Boolean)
        .join('\n'),
      convention.descriptionLimit ?? convention.captionLimit,
    );
  } else if (platform === 'instagram-reels') {
    caption = truncate(
      [
        `${truncate(hook, 120)}`,
        '',
        sentence(truncate(clean(idea.concept_description), 220)),
        song?.strongest_lyrics?.length ? `“${clean(song.strongest_lyrics[0])}”` : '',
        `Excerpt: ${excerpt}.`,
        '',
        cta,
        `Song: ${credit}.`,
        idea.editing_notes ? `Made with: ${sentence(idea.editing_notes)}` : '',
      ]
        .filter((line, index) => line !== '' || index < 3)
        .join('\n')
        .trim(),
      convention.captionLimit,
    );
  } else if (platform === 'youtube-long') {
    // On long-form the description *is* the primary text, so it lives in the
    // caption field end-to-end (title, links, chapters, credits) and stays
    // inside YouTube's 5,000-character limit.
    caption = truncate(
      [
        sentence(truncate(clean(preset?.summary ?? idea.concept_description), 200)),
        sentence(truncate(clean(idea.hook), 160)),
        '',
        chapters.length ? 'CHAPTERS' : '',
        chapters.length ? chaptersToText(chapters) : '',
        '',
        'THE SONG',
        credit,
        song?.strongest_lyrics?.length ? `“${clean(song.strongest_lyrics[0])}”` : '',
        song?.themes?.length ? `Themes: ${song.themes.join(', ')}` : '',
        '',
        'LISTEN',
        song?.streaming_url ? song.streaming_url : 'Add your streaming link before publishing.',
        '',
        cta,
        '',
        buildHashtags(platform, idea, song, preset)
          .map((tag) => tag.tag)
          .join(' '),
      ]
        .filter((line, index) => line !== '' || index > 2)
        .join('\n')
        .trim(),
      convention.captionLimit,
    );
  } else {
    caption = truncate(
      [
        `${truncate(hook, 90)}`,
        sentence(truncate(clean(idea.concept_description), 220)),
        song?.strongest_lyrics?.length ? `“${clean(song.strongest_lyrics[0])}”` : '',
        `Song: ${credit}.`,
        cta,
      ]
        .filter(Boolean)
        .join(' '),
      convention.captionLimit,
    );
  }

  const openingOverlay = convention.longForm
    ? truncate(`${song?.title ?? idea.title}${song?.artist ? ` — ${song.artist}` : ''}`, 60)
    : platform === 'instagram-reels' || platform === 'tiktok'
      ? truncate(hook, 52)
      : truncate(`${hook} · ${song?.title ?? 'new song'}`, 60);

  const thumbnail = convention.longForm
    ? `Custom 1280×720 thumbnail: the song title in large type over a still from the strongest scene${song?.title ? ` of “${song.title}”` : ''}. Legible at 320 px wide, no more than five words, and consistent with the other videos in this series so the channel reads as one body of work.`
    : platform === 'youtube-shorts'
      ? `Close crop of the video’s strongest frame with the line “${truncate(hook, 32)}” in the lower third. Keep text under seven words so it survives small thumbnails.`
      : `Cover frame from the ${excerpt.toLowerCase()} shot with “${truncate(hook, 28)}” over the quietest part of the frame.`;

  const pinned = convention.longForm
    ? `Chapters are in the description. If you only have a minute, start at ${chapters[Math.min(1, chapters.length - 1)]?.timestamp ?? '0:30'} — that is where the song actually begins. What should I break down next?`
    : platform === 'youtube-shorts'
      ? `If you want the full version — it’s called ${song?.title ?? 'this one'}${song?.artist ? ` by ${song.artist}` : ''}. What should I break down next?`
      : `Which line should I explain next — ${song?.strongest_lyrics?.[0] ? `“${truncate(clean(song.strongest_lyrics[0]), 40)}”` : 'the second verse'} or the one I almost cut?`;

  const accessibility = [
    'Burn in or upload subtitles for every spoken or sung line.',
    'Keep on-screen text at least 24px at 1080×1920 and use a solid backing plate behind thin type.',
    platform === 'youtube-shorts'
      ? 'Write a descriptive title instead of “#shorts #viral”; the description should still read if the audio is off.'
      : convention.longForm
        ? 'Upload a proper subtitle file rather than relying on auto-captions — a visualiser has no speech to caption, so add a description of the visuals for screen-reader users.'
        : 'Avoid flashing cuts faster than 3 per second, and do not rely on colour alone to carry meaning.',
    `Verify the current ${convention.label} limits before publishing; muse-ician’s guidance was checked October 2026.`,
  ].join(' ');

  const rationale = [
    `${convention.label}: ${convention.notes}`,
    `Written only from what you saved — the idea’s hook and concept, the ${song ? `song record “${song.title}”` : 'song fields that are still empty'}, and ${preset ? `the “${preset.title}” preset` : 'no preset'}. No live trend data, view counts or viral predictions were used.`,
    `Title limit ${convention.titleLimit}, ${convention.longForm ? 'description' : 'caption'} limit ${convention.captionLimit.toLocaleString()}, ${pluralize(convention.hashtagTarget, 'hashtag')} recommended (platform maximum ${convention.hashtagLimit}).`,
    convention.chapters
      ? `${pluralize(chapters.length, 'chapter')} generated from ${song?.audio_sections?.length ? 'the timestamps saved on the song record' : 'an even split of the estimated runtime'} — YouTube needs 3+ timestamps starting at 0:00 and every chapter at least 10 seconds long.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    content_idea_id: idea.id,
    song_id: idea.song_id ?? null,
    platform,
    tone,
    title,
    caption,
    description,
    search_phrases: buildSearchPhrases(platform, idea, song, preset),
    hashtags: buildHashtags(platform, idea, song, preset),
    call_to_action: cta,
    pinned_comment: pinned,
    thumbnail_concept: thumbnail,
    opening_overlay: openingOverlay,
    alternative_hooks: buildAlternatives(idea, song),
    suggested_duration_seconds: duration,
    recommended_excerpt: excerpt,
    accessibility_notes: accessibility,
    rationale,
    source: 'local-template',
  };
}

export function makeMetadataPackage(draft: LocalMetadataDraft): MetadataPackage {
  const now = nowIso();
  return {
    id: newId('meta'),
    content_idea_id: draft.content_idea_id,
    song_id: draft.song_id,
    platform: draft.platform,
    tone: draft.tone,
    title: draft.title,
    caption: draft.caption,
    description: draft.description,
    search_phrases: draft.search_phrases,
    hashtags: draft.hashtags,
    call_to_action: draft.call_to_action,
    pinned_comment: draft.pinned_comment,
    thumbnail_concept: draft.thumbnail_concept,
    opening_overlay: draft.opening_overlay,
    alternative_hooks: draft.alternative_hooks,
    suggested_duration_seconds: draft.suggested_duration_seconds,
    recommended_excerpt: draft.recommended_excerpt,
    accessibility_notes: draft.accessibility_notes,
    rationale: draft.rationale,
    source: 'local-template',
    status: 'draft',
    is_demo: false,
    created_at: now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };
}

/** Plain-text block for pasting into a scheduling tool or notes app. */
export function metadataPackageToText(pkg: MetadataPackage, context?: { songTitle?: string | null }): string {
  const convention = PLATFORM_CONVENTIONS[pkg.platform];
  const lines: string[] = [];
  lines.push(`${convention.label} — ${convention.titleLabel}:`);
  lines.push(pkg.title);
  lines.push('');
  lines.push('Caption:');
  lines.push(pkg.caption);
  if (pkg.description) {
    lines.push('');
    lines.push('Description:');
    lines.push(pkg.description);
  }
  if (pkg.search_phrases?.length) {
    lines.push('');
    lines.push(`Search phrases: ${pkg.search_phrases.join(' · ')}`);
  }
  if (pkg.hashtags?.length) {
    lines.push('');
    lines.push(`Hashtags: ${hashtagsToInput(pkg.hashtags)}`);
  }
  if (pkg.call_to_action) {
    lines.push('');
    lines.push(`Call to action: ${pkg.call_to_action}`);
  }
  if (pkg.pinned_comment) {
    lines.push('');
    lines.push(`Pinned comment: ${pkg.pinned_comment}`);
  }
  if (pkg.opening_overlay) {
    lines.push('');
    lines.push(`Opening overlay: ${pkg.opening_overlay}`);
  }
  if (pkg.thumbnail_concept) {
    lines.push('');
    lines.push(`Cover / thumbnail: ${pkg.thumbnail_concept}`);
  }
  if (pkg.suggested_duration_seconds) {
    lines.push('');
    lines.push(`Suggested length: ${pkg.suggested_duration_seconds} seconds`);
  }
  if (pkg.recommended_excerpt) {
    lines.push(`Recommended excerpt: ${pkg.recommended_excerpt}`);
  }
  if (pkg.alternative_hooks?.length) {
    lines.push('');
    lines.push('Alternative hooks:');
    for (const hook of pkg.alternative_hooks) lines.push(`- ${hook}`);
  }
  if (pkg.accessibility_notes) {
    lines.push('');
    lines.push(`Accessibility: ${pkg.accessibility_notes}`);
  }
  if (context?.songTitle) {
    lines.push('');
    lines.push(`Song: ${context.songTitle}`);
  }
  lines.push('');
  lines.push('Character counts (platform limits, checked October 2026):');
  lines.push(
    `Title ${pkg.title.length}/${convention.titleLimit} · Caption ${pkg.caption.length}/${convention.captionLimit}${
      pkg.description ? ` · Description ${pkg.description.length}/${convention.descriptionLimit ?? convention.captionLimit}` : ''
    }`,
  );
  return lines.join('\n');
}
