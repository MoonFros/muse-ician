import type { ContentIdea, MetadataPackage, Platform, Preset, Song, Tone } from './types';
import { PLATFORM_LABELS } from './types';
import { buildLocalMetadata, makeMetadataPackage, PLATFORM_CONVENTIONS } from './metadataTemplates';
import { hashtagsToInput } from './metadataTemplates';

/**
 * Batch metadata.
 *
 * Generating one package at a time is correct but slow when a whole campaign
 * needs copy. This module builds packages for many ideas and emits a spreadsheet
 * safe CSV — including formula-injection escaping, because a caption that starts
 * with "=" must never execute when the CSV lands in Excel or Sheets.
 */

export interface BatchRequest {
  ideas: ContentIdea[];
  presets: Preset[];
  songs: Song[];
  platforms: Platform[];
  tone: Tone;
}

export interface BatchResult {
  packages: MetadataPackage[];
  skipped: { ideaId: string; title: string; reason: string }[];
}

export function buildBatchMetadata(request: BatchRequest): BatchResult {
  const presetById = new Map(request.presets.map((preset) => [preset.id, preset]));
  const songById = new Map(request.songs.map((song) => [song.id, song]));
  const packages: MetadataPackage[] = [];
  const skipped: BatchResult['skipped'] = [];

  for (const idea of request.ideas) {
    if (!idea.hook?.trim() && !idea.title?.trim()) {
      skipped.push({ ideaId: idea.id, title: idea.title || '(untitled)', reason: 'No hook or title to build copy from.' });
      continue;
    }
    const platforms = request.platforms.length
      ? request.platforms
      : (idea.platforms ?? []).length
        ? idea.platforms!
        : (['instagram-reels'] as Platform[]);

    for (const platform of platforms) {
      const draft = buildLocalMetadata({
        idea,
        preset: idea.source_preset_id ? presetById.get(idea.source_preset_id) ?? null : null,
        song: idea.song_id ? songById.get(idea.song_id) ?? null : null,
        platform,
        tone: request.tone,
      });
      packages.push(makeMetadataPackage(draft));
    }
  }

  return { packages, skipped };
}

/* -------------------------------------------------------------------------- */
/* CSV                                                                        */
/* -------------------------------------------------------------------------- */

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escape a value for CSV. Formula-injection is neutralised by prefixing a
 * single quote, which spreadsheets render as text rather than executing.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (DANGEROUS_PREFIX.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export const BATCH_CSV_COLUMNS = [
  'idea',
  'song',
  'platform',
  'title_field',
  'title',
  'caption',
  'hashtags',
  'search_phrases',
  'call_to_action',
  'pinned_comment',
  'suggested_seconds',
  'caption_chars',
  'caption_limit',
  'over_limit',
  'notes',
] as const;

export function packagesToCsv(
  packages: MetadataPackage[],
  ctx: { ideas: ContentIdea[]; songs: Song[] },
): string {
  const ideaById = new Map(ctx.ideas.map((idea) => [idea.id, idea]));
  const songById = new Map(ctx.songs.map((song) => [song.id, song]));

  const rows = packages.map((pkg) => {
    const idea = pkg.content_idea_id ? ideaById.get(pkg.content_idea_id) : undefined;
    const song = pkg.song_id ? songById.get(pkg.song_id) : undefined;
    const convention = PLATFORM_CONVENTIONS[pkg.platform];
    const captionChars = pkg.caption.length;
    return [
      idea?.title ?? '(deleted idea)',
      song?.title ?? '',
      PLATFORM_LABELS[pkg.platform],
      convention.titleLabel,
      pkg.title,
      pkg.caption,
      hashtagsToInput(pkg.hashtags),
      (pkg.search_phrases ?? []).join('; '),
      pkg.call_to_action ?? '',
      pkg.pinned_comment ?? '',
      pkg.suggested_duration_seconds ?? '',
      captionChars,
      convention.captionLimit,
      captionChars > convention.captionLimit ? 'yes' : 'no',
      pkg.rationale ?? '',
    ];
  });

  const header = BATCH_CSV_COLUMNS.join(',');
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  return `${header}\r\n${body}\r\n`;
}

export function batchSummary(result: BatchResult): string {
  const count = result.packages.length;
  const platforms = new Set(result.packages.map((pkg) => pkg.platform));
  const skipped = result.skipped.length
    ? ` ${result.skipped.length} idea${result.skipped.length === 1 ? '' : 's'} skipped.`
    : '';
  return `${count} package${count === 1 ? '' : 's'} across ${platforms.size} platform${platforms.size === 1 ? '' : 's'}.${skipped}`;
}
