import type { ContentIdea, Platform, Preset, Song, Tone } from './types';
import { PLATFORM_CONVENTIONS } from './metadataTemplates';
import { newId, truncate, unique } from './utils';

/**
 * A/B variant scoring.
 *
 * Everything in this file is a transparent editorial heuristic. The scores
 * describe craft properties of the text (clarity, curiosity, specificity,
 * length fit, call-to-action strength) — they are NOT predictions of views,
 * retention or virality. The UI labels them accordingly and never compares
 * them to other people's numbers.
 */

export interface VariantScoreComponent {
  key: 'clarity' | 'curiosity' | 'specificity' | 'length_fit' | 'cta';
  label: string;
  score: number;
  weight: number;
  explanation: string;
}

export interface Variant {
  id: string;
  label: string;
  text: string;
  /** 0–100 heuristic craft score. */
  score: number;
  components: VariantScoreComponent[];
  notes: string[];
  chars: number;
}

export const VARIANT_WEIGHTS: Record<VariantScoreComponent['key'], number> = {
  clarity: 0.28,
  curiosity: 0.24,
  specificity: 0.2,
  length_fit: 0.16,
  cta: 0.12,
};

export const VARIANT_LABELS: Record<VariantScoreComponent['key'], string> = {
  clarity: 'Clarity',
  curiosity: 'Curiosity',
  specificity: 'Song specificity',
  length_fit: 'Length fit',
  cta: 'Call to action',
};

const HEDGE_WORDS = ['maybe', 'kind of', 'sort of', 'i think', 'probably', 'hopefully'];
const CURIOSITY_CUES = [
  'why',
  'how',
  'what happened',
  'nobody',
  'until',
  'before',
  'secret',
  'mistake',
  'actually',
  'never',
  'still',
  'wrong',
];
const CTA_VERBS = [
  'listen',
  'watch',
  'comment',
  'tell me',
  'save',
  'share',
  'follow',
  'vote',
  'guess',
  'pick',
  'drop',
  'reply',
  'join',
  'tag',
  'let me know',
  'stream',
  'link in bio',
  'turn the sound on',
];

function countMatches(text: string, needles: string[]): number {
  const lower = text.toLowerCase();
  return needles.reduce((total, needle) => (lower.includes(needle) ? total + 1 : total), 0);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function titleCaseFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function stripTrailingPunctuation(text: string): string {
  return text.replace(/[\s.,;:!—-]+$/u, '');
}

/** Words that make a hook specific to *this* song rather than any song. */
function specificityTokens(song?: Song | null): string[] {
  if (!song) return [];
  return unique(
    [
      song.title,
      song.artist,
      song.genre,
      song.subgenre,
      ...(song.moods ?? []),
      ...(song.themes ?? []),
    ]
      .filter((value): value is string => Boolean(value && value.trim()))
      .flatMap((value) => value.toLowerCase().split(/\s+/))
      .filter((word) => word.length > 3),
  );
}

export interface ScoreInput {
  text: string;
  /** Hard character limit for the field being scored. */
  limit: number;
  /** Sweet spot for this field; defaults to 60–90 % of the limit. */
  idealMin?: number;
  idealMax?: number;
  song?: Song | null;
  /**
   * A call to action usually lives in the caption rather than the hook, so
   * hooks are not penalised for missing one.
   */
  expectsCta?: boolean;
}

export function scoreVariant(input: ScoreInput): { score: number; components: VariantScoreComponent[]; notes: string[] } {
  const text = input.text.trim();
  const chars = text.length;
  const wordCount = words(text).length;
  const notes: string[] = [];

  const idealMin = input.idealMin ?? Math.round(input.limit * 0.6);
  const idealMax = input.idealMax ?? Math.round(input.limit * 0.9);

  // --- Clarity -------------------------------------------------------------
  let clarity = 70;
  if (!text) clarity = 0;
  else {
    if (wordCount <= 18) clarity += 12;
    else if (wordCount <= 26) clarity += 4;
    else clarity -= 18;
    if (text.split(/[.!?]/).filter((part) => part.trim()).length > 3) clarity -= 8;
    if (/\b[A-Z]{4,}\b/.test(text)) clarity -= 10;
    if (countMatches(text, HEDGE_WORDS) > 0) clarity -= 8;
    const emoji = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) ?? []).length;
    if (emoji > 3) clarity -= 8;
    if (/[,;:]/.test(text) && wordCount > 24) clarity -= 4;
    if (/\d/.test(text)) clarity += 4;
  }
  clarity = Math.max(0, Math.min(100, clarity));
  if (clarity < 55) notes.push('Hard to follow in one read — cut clauses until it fits on one screen.');

  // --- Curiosity -----------------------------------------------------------
  let curiosity = 52;
  if (!text) curiosity = 0;
  else {
    if (/\?/.test(text)) curiosity += 14;
    curiosity += Math.min(18, countMatches(text, CURIOSITY_CUES) * 8);
    if (/\b(i|we|my|our)\b/i.test(text)) curiosity += 6;
    if (/\b(you|your)\b/i.test(text)) curiosity += 6;
    if (/^[^.!?]*[.!]$/.test(text) && !text.endsWith('.')) curiosity += 2;
    if (wordCount > 30) curiosity -= 6;
    if (countMatches(text, HEDGE_WORDS) > 0) curiosity -= 10;
  }
  curiosity = Math.max(0, Math.min(100, curiosity));
  if (curiosity < 55) notes.push('Add an open loop: a question, a reveal, or a reason to keep watching.');

  // --- Specificity ---------------------------------------------------------
  const tokens = specificityTokens(input.song);
  const haystack = text.toLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  let specificity = 45;
  if (!text) specificity = 0;
  else {
    specificity += Math.min(38, hits * 13);
    if (input.song?.title && haystack.includes(input.song.title.toLowerCase())) specificity += 10;
    if (/\b(this song|the track|it)\b/.test(haystack) && hits === 0) specificity -= 10;
  }
  specificity = Math.max(0, Math.min(100, specificity));
  if (specificity < 55) notes.push('Name the song, lyric or moment — generic hooks blend into the feed.');

  // --- Length fit ----------------------------------------------------------
  let lengthFit = 100;
  if (chars > input.limit) lengthFit = 10;
  else if (chars >= idealMin && chars <= idealMax) lengthFit = 96;
  else if (chars < idealMin) lengthFit = Math.max(35, Math.round(96 - (idealMin - chars) * 2));
  else lengthFit = Math.max(50, Math.round(96 - (chars - idealMax) * 1.5));
  if (chars > input.limit) notes.push(`Over the ${input.limit}-character limit by ${chars - input.limit}.`);

  // --- Call to action ------------------------------------------------------
  let cta = input.expectsCta ? 45 : 72;
  if (!text) cta = 0;
  else {
    const hasCta =
      countMatches(text, CTA_VERBS) > 0 || /\b(dm|link in bio|comments?|poll|sticker)\b/i.test(text) || text.includes('?');
    if (input.expectsCta) {
      if (hasCta) cta = 92;
      else notes.push('No clear next step — tell people exactly what to do.');
    } else if (hasCta) {
      cta = 80;
    }
  }
  cta = Math.max(0, Math.min(100, cta));

  const components: VariantScoreComponent[] = (
    [
      { key: 'clarity', score: clarity, explanation: 'Sentence length, hedging and scannability.' },
      { key: 'curiosity', score: curiosity, explanation: 'Open loops, questions and tension.' },
      { key: 'specificity', score: specificity, explanation: 'How tied the words are to this song, not any song.' },
      { key: 'length_fit', score: lengthFit, explanation: `Fits the ${input.limit}-character field without truncation.` },
      { key: 'cta', score: cta, explanation: input.expectsCta ? 'Names one concrete next step.' : 'A hook does not need one.' },
    ] as const
  ).map((component) => ({
    key: component.key,
    label: VARIANT_LABELS[component.key],
    score: component.score,
    weight: VARIANT_WEIGHTS[component.key],
    explanation: component.explanation,
  }));

  const score = Math.round(components.reduce((total, item) => total + item.score * item.weight, 0));
  return { score, components, notes: unique(notes) };
}

/* -------------------------------------------------------------------------- */
/* Hook variants                                                              */
/* -------------------------------------------------------------------------- */

interface HookTemplate {
  label: string;
  build: (ctx: HookContext) => string;
}

interface HookContext {
  hook: string;
  title: string;
  song: Song | null;
  idea: ContentIdea;
  preset: Preset | null;
}

const HOOK_TEMPLATES: HookTemplate[] = [
  {
    label: 'Direct',
    build: (ctx) => titleCaseFirst(stripTrailingPunctuation(ctx.hook || ctx.title)),
  },
  {
    label: 'Question',
    build: (ctx) => {
      const core = stripTrailingPunctuation(ctx.hook || ctx.title).replace(/^(why|how|what)\b/i, '');
      return `What if ${core.toLowerCase()}?`;
    },
  },
  {
    label: 'Confession',
    build: (ctx) => `I almost scrapped this. ${stripTrailingPunctuation(ctx.hook || ctx.title)}.`,
  },
  {
    label: 'Specific detail',
    build: (ctx) =>
      ctx.song
        ? `${ctx.song.title}: ${stripTrailingPunctuation(ctx.hook || ctx.title).toLowerCase()}`
        : stripTrailingPunctuation(ctx.hook || ctx.title),
  },
  {
    label: 'Stakes',
    build: (ctx) => `Nobody told me ${stripTrailingPunctuation(ctx.hook || ctx.title).toLowerCase()} until year three.`,
  },
  {
    label: 'Invitation',
    build: (ctx) => `Watch me try ${stripTrailingPunctuation(ctx.hook || ctx.title).toLowerCase()} in one take.`,
  },
];

export interface HookVariantInput {
  idea: ContentIdea;
  song?: Song | null;
  preset?: Preset | null;
  platform?: Platform;
  count?: number;
}

export function buildHookVariants(input: HookVariantInput): Variant[] {
  const platform = input.platform ?? input.idea.platforms?.[0] ?? 'instagram-reels';
  const limit = PLATFORM_CONVENTIONS[platform].titleLimit;
  const ctx: HookContext = {
    hook: input.idea.hook ?? '',
    title: input.idea.title,
    song: input.song ?? null,
    idea: input.idea,
    preset: input.preset ?? null,
  };

  // If the idea already has alternatives saved by hand, score those too.
  const manual = (input.idea.call_to_action ? [] : []).slice(0, 0);
  const candidates = unique(
    [...HOOK_TEMPLATES.map((template) => template.build(ctx)), ...manual].map((text) => truncate(text.trim(), limit)),
  );

  const variants = candidates.map((text, index) => {
    const scored = scoreVariant({ text, limit, song: input.song ?? null, idealMin: 35, idealMax: limit });
    return {
      id: `hook-${index}`,
      label: HOOK_TEMPLATES[index]?.label ?? `Variant ${index + 1}`,
      text,
      chars: text.length,
      ...scored,
    };
  });

  const take = Math.max(3, Math.min(input.count ?? 5, variants.length));
  return variants.sort((a, b) => b.score - a.score).slice(0, take);
}

/* -------------------------------------------------------------------------- */
/* Caption variants                                                           */
/* -------------------------------------------------------------------------- */

const TONE_OPENERS: Record<Tone, string> = {
  conversational: 'So I finally finished this bit.',
  funny: 'Okay, hear me out.',
  mysterious: 'There is a version of this song that only exists at 2am.',
  emotional: 'This one is for the people who stayed.',
  cinematic: 'Picture this as the last scene.',
  direct: 'Here it is.',
  minimal: 'No filter on this one.',
  storytelling: 'I wrote this in a room by myself.',
};

const TONE_CLOSERS: Record<Tone, string> = {
  conversational: 'I will reply to every comment on this one.',
  funny: 'Guess the next line in the comments.',
  mysterious: 'Watch it twice — the second time lands differently.',
  emotional: 'Tell me which line hit hardest for you.',
  cinematic: 'Turn the sound on. That is all I ask.',
  direct: 'Listen and tell me what you think.',
  minimal: 'Comment the line you would have cut.',
  storytelling: 'Save this if it sounds like your week.',
};

export interface CaptionVariantInput {
  idea: ContentIdea;
  song?: Song | null;
  preset?: Preset | null;
  platform: Platform;
  tone: Tone;
  hashtags?: string[];
  count?: number;
}

export function buildCaptionVariants(input: CaptionVariantInput): Variant[] {
  const { idea, platform, tone } = input;
  const song = input.song ?? null;
  const convention = PLATFORM_CONVENTIONS[platform];
  const limit = convention.captionLimit;
  const tags = (input.hashtags ?? []).slice(0, convention.hashtagTarget);
  const tagLine = tags.length ? `\n\n${tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}` : '';

  const credit = song
    ? `${song.title}${song.artist ? ` — ${song.artist}` : ''}${song.release_status === 'released' ? '' : ` (${song.release_status ?? 'unreleased'})`}`
    : 'New song — title in the on-screen text.';
  const hook = stripTrailingPunctuation(idea.hook || idea.title);
  const detail = stripTrailingPunctuation(idea.concept_description || '');
  const cta = stripTrailingPunctuation(idea.call_to_action || TONE_CLOSERS[tone]);
  const scene = idea.scene_sequence?.[0]?.trim();

  const bodies = [
    // 1. Story-first
    [TONE_OPENERS[tone], hook + '.', credit, cta].filter(Boolean).join('\n\n'),
    // 2. Detail-first
    [hook + '.', scene ? `Shot ${scene.replace(/^\d+[.)]\s*/, '')} — one take, no cuts.` : detail, credit, cta]
      .filter(Boolean)
      .join('\n\n'),
    // 3. Short and sharp (platform-appropriate)
    [hook + '.', credit, cta].filter(Boolean).join('\n\n'),
    // 4. List format
    [
      `What went into this one:`,
      idea.scene_sequence?.length
        ? idea.scene_sequence
            .slice(0, 3)
            .map((step, index) => `${index + 1}. ${step.replace(/^\d+[.)]\s*/, '')}`)
            .join('\n')
        : `1. ${hook}`,
      cta,
    ].join('\n\n'),
  ];

  const variants = bodies.map((body, index) => {
    const text = truncate(`${body.trim()}${tagLine}`, limit);
    const scored = scoreVariant({
      text,
      limit,
      song,
      idealMin: Math.round(limit * 0.25),
      idealMax: Math.round(limit * 0.85),
      expectsCta: true,
    });
    return {
      id: `caption-${index}`,
      label: ['Story-first', 'Detail-first', 'Short cut', 'List'][index] ?? `Variant ${index + 1}`,
      text,
      chars: text.length,
      ...scored,
    };
  });

  const take = Math.max(2, Math.min(input.count ?? 4, variants.length));
  return variants.sort((a, b) => b.score - a.score).slice(0, take);
}

/* -------------------------------------------------------------------------- */
/* Saved comparison                                                           */
/* -------------------------------------------------------------------------- */

export interface AbTestRecord {
  id: string;
  idea_id: string;
  platform: Platform;
  field: 'hook' | 'caption';
  variant_ids: string[];
  chosen_id: string;
  chosen_text: string;
  score: number;
  created_at: string;
}

/** Build a record of which variant was chosen, so the decision is auditable later. */
export function makeAbChoice(input: {
  ideaId: string;
  platform: Platform;
  field: 'hook' | 'caption';
  variants: Variant[];
  chosenId: string;
  now: string;
}): AbTestRecord {
  const chosen = input.variants.find((variant) => variant.id === input.chosenId) ?? input.variants[0]!;
  return {
    id: newId('ab'),
    idea_id: input.ideaId,
    platform: input.platform,
    field: input.field,
    variant_ids: input.variants.map((variant) => variant.id),
    chosen_id: chosen.id,
    chosen_text: chosen.text,
    score: chosen.score,
    created_at: input.now,
  };
}
