import type { ContentIdea, Platform, Preset, Song } from './types';
import { PLATFORM_LABELS } from './types';
import { truncate, unique } from './utils';

/**
 * Content reuse engine.
 *
 * One finished vertical video is raw material for several other surfaces. These
 * builders are deterministic text transforms of the idea you already wrote —
 * nothing is invented about performance, and the app never claims a repurposed
 * post will do better than the original.
 *
 * Every draft tells you what it was derived from, so you can trace a caption
 * back to the idea it came from.
 */

export const REUSE_FORMATS = [
  'x-post',
  'instagram-story',
  'carousel',
  'email-blast',
  'newsletter-section',
  'community-post',
  'lyric-card',
] as const;

export type ReuseFormat = (typeof REUSE_FORMATS)[number];

export const REUSE_FORMAT_LABELS: Record<ReuseFormat, string> = {
  'x-post': 'X / Threads post',
  'instagram-story': 'Instagram Story sequence',
  carousel: 'Carousel (5 slides)',
  'email-blast': 'Email to your list',
  'newsletter-section': 'Newsletter section',
  'community-post': 'Community post (Discord / Reddit)',
  'lyric-card': 'Lyric card text',
};

export const REUSE_FORMAT_LIMITS: Partial<Record<ReuseFormat, { label: string; limit: number }>> = {
  'x-post': { label: 'Post', limit: 280 },
  carousel: { label: 'Slide copy', limit: 220 },
  'lyric-card': { label: 'On-image text', limit: 90 },
  'instagram-story': { label: 'Frame text', limit: 140 },
};

export interface ReuseDraft {
  format: ReuseFormat;
  label: string;
  /** Optional subject line (email). */
  subject?: string;
  /** The main text, ready to copy. */
  body: string;
  /** Structured extra blocks: carousel slides, story frames, community bullets. */
  blocks: { label: string; text: string }[];
  limit?: { label: string; limit: number };
  chars: number;
  overLimit: boolean;
  notes: string[];
  derivedFrom: string[];
}

function sentences(text?: string | null): string[] {
  return (text ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export interface ReuseInput {
  idea: ContentIdea;
  song?: Song | null;
  preset?: Preset | null;
  platform?: Platform | null;
}

export function buildReuseDrafts(input: ReuseInput): ReuseDraft[] {
  const { idea } = input;
  const song = input.song ?? null;
  const preset = input.preset ?? null;
  const platform = input.platform ?? idea.platforms?.[0] ?? null;

  const hook = (idea.hook || idea.title).replace(/[\s.!?]+$/u, '');
  const cta = (idea.call_to_action || 'Tell me what you think.').replace(/[\s.!?]+$/u, '');
  const credit = song
    ? `${song.title}${song.artist ? ` — ${song.artist}` : ''}`
    : 'Original song';
  const concept = sentences(idea.concept_description).slice(0, 3);
  const scenes = (idea.scene_sequence ?? []).map((step) => step.replace(/^\d+[.)]\s*/, ''));
  const onScreen = (idea.on_screen_text ?? []).filter(Boolean);
  const excerpt = idea.audio_section ? `Audio: ${idea.audio_section}` : 'Audio: pick your strongest 15 seconds.';
  const songLink = song?.streaming_url ?? song?.music_video_url ?? null;
  const linkLine = songLink ? `Listen: ${songLink}` : 'Link in bio.';
  const tagLine = preset ? `Format: ${preset.title}.` : '';
  const derivedFrom = unique(
    [
      `idea:${idea.id}`,
      song ? `song:${song.id}` : '',
      preset ? `preset:${preset.id}` : '',
      platform ? `platform:${platform}` : '',
    ].filter(Boolean),
  );

  const drafts: ReuseDraft[] = [];

  /* ---------------- X / Threads ---------------- */
  const xLimit = REUSE_FORMAT_LIMITS['x-post']!.limit;
  const xBody = truncate(
    [hook, concept[0], credit, cta].filter(Boolean).join('\n\n'),
    xLimit,
  );
  drafts.push({
    format: 'x-post',
    label: REUSE_FORMAT_LABELS['x-post'],
    body: xBody,
    blocks: [],
    limit: REUSE_FORMAT_LIMITS['x-post'],
    chars: xBody.length,
    overLimit: xBody.length > xLimit,
    notes: [
      'Text only — link the video in a reply if you need the clip to stay visible.',
      'No hashtags: they read as spam on this surface.',
    ],
    derivedFrom,
  });

  /* ---------------- Story sequence ---------------- */
  const storyFrames = [
    { label: 'Frame 1 — hook', text: hook },
    { label: 'Frame 2 — context', text: concept[0] ?? credit },
    { label: 'Frame 3 — proof', text: excerpt },
    { label: 'Frame 4 — ask', text: `${cta} (poll or question sticker)` },
  ];
  const storyBody = storyFrames.map((frame) => `${frame.label}\n${frame.text}`).join('\n\n');
  drafts.push({
    format: 'instagram-story',
    label: REUSE_FORMAT_LABELS['instagram-story'],
    body: storyBody,
    blocks: storyFrames,
    limit: REUSE_FORMAT_LIMITS['instagram-story'],
    chars: Math.max(...storyFrames.map((frame) => frame.text.length)),
    overLimit: storyFrames.some((frame) => frame.text.length > REUSE_FORMAT_LIMITS['instagram-story']!.limit),
    notes: [
      'Stories live for 24 hours — pair them with a highlight if the idea is evergreen.',
      'Add the video as the last frame so the ask arrives after the proof.',
    ],
    derivedFrom,
  });

  /* ---------------- Carousel ---------------- */
  const slides = [
    { label: 'Slide 1 (cover)', text: truncate(hook, 90) },
    { label: 'Slide 2', text: truncate(concept[0] ?? `How ${credit} came together.`, 220) },
    {
      label: 'Slide 3',
      text: truncate(scenes[0] ? scenes[0] : (concept[1] ?? excerpt), 220),
    },
    {
      label: 'Slide 4',
      text: truncate(onScreen[0] ? `“${onScreen[0]}”` : (concept[2] ?? excerpt), 220),
    },
    { label: 'Slide 5 (ask)', text: truncate(`${cta}\n${linkLine}`, 220) },
  ];
  const carouselBody = slides.map((slide) => `${slide.label}: ${slide.text}`).join('\n\n');
  drafts.push({
    format: 'carousel',
    label: REUSE_FORMAT_LABELS.carousel,
    body: carouselBody,
    blocks: slides,
    limit: REUSE_FORMAT_LIMITS.carousel,
    chars: Math.max(...slides.map((slide) => slide.text.length)),
    overLimit: slides.some((slide) => slide.text.length > REUSE_FORMAT_LIMITS.carousel!.limit),
    notes: [
      'Screenshot frames from the finished video instead of filming again.',
      `Base the cover on the on-screen text you already wrote${onScreen[0] ? ` (“${truncate(onScreen[0], 60)}”)` : ''}.`,
    ],
    derivedFrom,
  });

  /* ---------------- Email ---------------- */
  const subject = truncate(`${hook} — new from ${song?.artist || 'me'}`, 78);
  const emailBody = [
    `Hi —`,
    '',
    concept[0] ?? `I made something from ${credit}.`,
    '',
    `${credit}. ${excerpt}`,
    '',
    `The short version: ${hook}.`,
    '',
    `${cta}`,
    '',
    linkLine,
    '',
    song?.artist || '—',
  ].join('\n');
  drafts.push({
    format: 'email-blast',
    label: REUSE_FORMAT_LABELS['email-blast'],
    subject,
    body: emailBody,
    blocks: [{ label: 'Preheader', text: truncate(hook, 100) }],
    chars: emailBody.length,
    overLimit: false,
    notes: [
      'Only send to people who opted in; this app never sends email for you.',
      'Keep the video link above the fold on mobile.',
    ],
    derivedFrom,
  });

  /* ---------------- Newsletter section ---------------- */
  const newsletterBody = [
    `## ${hook}`,
    '',
    concept.join(' ') || `A short note about ${credit}.`,
    '',
    `> ${excerpt}`,
    '',
    `[Watch the video](${songLink ?? '#'}) · [Listen to ${credit}](${songLink ?? '#'})`,
    '',
    tagLine ? `_${tagLine}_` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
  drafts.push({
    format: 'newsletter-section',
    label: REUSE_FORMAT_LABELS['newsletter-section'],
    body: newsletterBody,
    blocks: [],
    chars: newsletterBody.length,
    overLimit: false,
    notes: ['Markdown — paste into Substack, Buttondown, Ghost or Mailchimp custom HTML.'],
    derivedFrom,
  });

  /* ---------------- Community post ---------------- */
  const communityBody = [
    `${hook}.`,
    '',
    concept[0] ?? '',
    scenes.length ? `What went into it:\n${scenes.slice(0, 4).map((scene) => `- ${scene}`).join('\n')}` : '',
    '',
    `${excerpt}`,
    '',
    `Honest question for this community: ${cta}`,
  ]
    .filter(Boolean)
    .join('\n');
  drafts.push({
    format: 'community-post',
    label: REUSE_FORMAT_LABELS['community-post'],
    body: communityBody,
    blocks: [],
    chars: communityBody.length,
    overLimit: false,
    notes: [
      'Read the server or subreddit rules first — many ban self-promotion without participation.',
      'Ask a real question; drive-by links get removed.',
    ],
    derivedFrom,
  });

  /* ---------------- Lyric card ---------------- */
  const lyricLine = onScreen[0] || hook;
  const lyricBody = truncate(lyricLine, REUSE_FORMAT_LIMITS['lyric-card']!.limit);
  drafts.push({
    format: 'lyric-card',
    label: REUSE_FORMAT_LABELS['lyric-card'],
    body: lyricBody,
    blocks: [{ label: 'Attribution line', text: `${credit} · out now` }],
    chars: lyricBody.length,
    overLimit: lyricBody.length > REUSE_FORMAT_LIMITS['lyric-card']!.limit,
    notes: [
      'Use your own artwork or a still from the video — do not reuse someone else’s image.',
      'Keep the lyric legible at thumbnail size: 3–7 words per line.',
    ],
    derivedFrom,
  });

  return drafts;
}

/** Plain text of everything, for pasting into a note. */
export function reuseDraftsToText(drafts: ReuseDraft[], context: { ideaTitle: string }): string {
  const lines = [`Reuse pack — ${context.ideaTitle}`, 'Derived from one idea in muse-ician.', ''];
  for (const draft of drafts) {
    lines.push(`=== ${draft.label} ===`);
    if (draft.subject) lines.push(`Subject: ${draft.subject}`);
    lines.push(draft.body);
    if (draft.notes.length) lines.push('', ...draft.notes.map((note) => `· ${note}`));
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function platformLabel(platform?: Platform | null): string {
  return platform ? PLATFORM_LABELS[platform] : 'No platform set';
}
