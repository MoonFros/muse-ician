/**
 * Generates the download artifacts that ship with the app and are committed to
 * the repository: the JSON template, the schema copy, the starter preset pack
 * and the sample imports. Everything is produced from the same builders the app
 * uses, then validated against the real schema — so no committed sample can
 * drift away from the format.
 *
 *   npm run artifacts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import {
  buildAiImportPrompt,
  buildExampleTemplate,
  buildPresetExport,
  buildWorkspaceBackup,
} from '../src/lib/interchange';
import { validatePayload } from '../src/lib/validation';
import { emptyWorkspaceData, normalizePreferences } from '../src/storage/defaults';
import type { Preset, WorkspacePayload } from '../src/lib/types';
import { SCHEMA_VERSION } from '../src/lib/types';

const root = process.cwd();
const schemaPath = path.join(root, 'src/schema/muse-ician.schema.json');
const publicDir = path.join(root, 'public');
const samplesDir = path.join(root, 'samples');

mkdirSync(publicDir, { recursive: true });
mkdirSync(samplesDir, { recursive: true });

function writeJson(relativePath: string, payload: unknown): void {
  writeFileSync(path.join(root, relativePath), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function clone(preset: Preset, overrides: Partial<Preset>): Preset {
  return {
    ...preset,
    ...overrides,
    id: overrides.id ?? preset.id,
    created_at: preset.created_at,
    updated_at: preset.updated_at,
  };
}

const base = SEED_PRESETS[0]!;
const lyricPreset = SEED_PRESETS.find((preset) => preset.id === 'preset-lyric-that-hits') ?? base;

/** Three presets in the shape an external AI tool should produce. */
const aiStylePack: Preset[] = [
  clone(base, {
    id: 'preset-shelf-life',
    title: 'The demo that almost made the album',
    summary: 'Play the voice-note version, then the finished mix, and let the difference speak.',
    description:
      'Open on the phone screen showing the original voice note date. Play four seconds of the rough take, cut to the finished chorus, then show the single line you changed. End on the song title card with the release date.',
    hook_examples: [
      'This is the demo I almost deleted in 2022',
      'You can hear the exact moment I changed the chorus',
    ],
    tags: ['archive', 'demo', 'songwriting'],
    on_screen_text: ['voice note · 2022', 'final version', 'the line I changed'],
    execution_steps: [
      'Screen-record the voice note with its date visible.',
      'Record four seconds of the rough take playing out loud.',
      'Cut on the beat into the finished chorus.',
      'Show the old line and the new line as text over the quietest moment.',
      'End on the song title and where to hear it.',
    ],
    shot_list: [
      'Static shot of the phone screen, date visible.',
      'Mid shot of you pressing play, out of focus behind the phone.',
      'Close-up of the notebook line, crossed out and rewritten.',
    ],
    cta_examples: ['Should I post the whole voice note?', 'Which version do you prefer?'],
    estimated_production_minutes: 45,
    is_user_created: false,
    usage_count: 0,
  }),
  clone(base, {
    id: 'preset-room-tone',
    title: 'Same song, three rooms',
    summary: 'Sing one line in three different rooms to show how space changes a song.',
    description:
      'Film the same eight seconds in a bathroom, a stairwell and a bedroom. Cut between them on the same lyric. Let the reverb carry the point instead of explaining it. Caption the rooms, not the emotion.',
    platforms: ['instagram-reels', 'tiktok'],
    hook_examples: ['Same eight seconds, three rooms', 'The stairwell version is the real one'],
    tags: ['acoustic', 'texture', 'performance'],
    on_screen_text: ['bathroom', 'stairwell', 'bedroom'],
    execution_steps: [
      'Pick one eight-second line that works unaccompanied.',
      'Film it in three rooms with the phone in the same position.',
      'Cut on the same word in each take so the rooms swap in time.',
      'Label each room in small text.',
    ],
    shot_list: [
      'Vertical shot, chest up, bathroom.',
      'Vertical shot, chest up, stairwell.',
      'Vertical shot, chest up, bedroom with the lamp on.',
    ],
    cta_examples: ['Which room sounds like the song to you?'],
    difficulty: 'easy',
    budget: 'minimal',
    estimated_production_minutes: 30,
    is_user_created: false,
    usage_count: 0,
  }),
  clone(lyricPreset, {
    id: 'preset-lyric-under-mic',
    title: 'Write the lyric under the mic',
    summary: 'Write the line in real time directly under the microphone, then record it.',
    description:
      'Overhead shot of a notebook under the microphone. Write the lyric, cross out two words, write the better version, then record the line. The rewrite is the content; the performance is the payoff.',
    platforms: ['instagram-reels', 'youtube-shorts'],
    hook_examples: ['Watch me fix the worst line in this song', 'This line took four drafts'],
    tags: ['lyric', 'process', 'writing'],
    on_screen_text: ['draft 1', 'draft 4'],
    execution_steps: [
      'Set the phone overhead so the page and the mic are both in frame.',
      'Write the first draft legibly.',
      'Cross out and rewrite while the audio stays quiet.',
      'Record the final line straight after the final edit.',
    ],
    shot_list: [
      'Overhead shot of notebook and microphone.',
      'Close-up of the pen crossing out two words.',
      'Side shot of you recording the line.',
    ],
    cta_examples: ['Which draft would you keep?'],
    estimated_production_minutes: 40,
    is_user_created: false,
    usage_count: 0,
  }),
];

async function assertValid(label: string, payload: WorkspacePayload): Promise<void> {
  const result = await validatePayload(payload);
  if (!result.ok) {
    const issues = [...result.fatal, ...result.errors].slice(0, 6);
    throw new Error(
      `${label} failed schema validation:\n${issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n')}`,
    );
  }
}

async function main(): Promise<void> {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as { $id?: string };
  writeJson('public/muse-ician.schema.json', schema);

  const example = buildExampleTemplate(lyricPreset);
  await assertValid('example.json', example);
  writeJson('public/example.json', example);
  writeJson('samples/example.json', example);

  const starterPack = buildPresetExport(SEED_PRESETS, 'preset_pack', 'muse-ician starter preset pack');
  await assertValid('starter-preset-pack.json', starterPack);
  writeJson('samples/starter-preset-pack.json', starterPack);

  const aiPack = buildPresetExport(aiStylePack, 'preset_pack', 'Sample pack — written in the AI import format');
  aiPack.manifest.description =
    'Three example presets showing the shape an AI tool should return when given the muse-ician import prompt. Import it to see how a pack behaves; nothing here is trend data.';
  aiPack.manifest.author = 'muse-ician sample';
  await assertValid('sample-ai-preset-pack.json', aiPack);
  writeJson('samples/sample-ai-preset-pack.json', aiPack);

  const demo = buildDemoBundle(SEED_PRESETS);
  const workspace = {
    ...emptyWorkspaceData(),
    ...demo,
    presets: SEED_PRESETS.filter((preset) =>
      demo.content_ideas.some((idea) => idea.source_preset_id === preset.id),
    ),
    preferences: normalizePreferences({
      artist_name: 'Demo Artist',
      persona: 'Sample data for exploring muse-ician. Every record is labelled as demo data and can be removed in Settings.',
      preferred_genres: ['indie pop'],
      preferred_moods: ['melancholy'],
      posting_cadence_days: 3,
      onboarding_complete: true,
      equipment: ['phone', 'phone-tripod'],
      visual_style: 'Muted, natural light, no performance face-on shots.',
    }),
  };
  const backup = buildWorkspaceBackup(workspace, 'muse-ician sample workspace (demo data)');
  await assertValid('sample-workspace-backup.json', backup);
  writeJson('samples/sample-workspace-backup.json', backup);

  const prompt = buildAiImportPrompt({
    count: 5,
    extraInstructions:
      'All concepts must be filmable alone, with a phone, no face on camera, and in under 30 minutes.',
  });
  writeFileSync(path.join(samplesDir, 'ai-import-prompt.txt'), `${prompt}\n`, 'utf8');

  console.log('Artifacts written:');
  console.log(`  public/example.json (schema ${SCHEMA_VERSION})`);
  console.log('  public/muse-ician.schema.json');
  console.log(`  samples/starter-preset-pack.json (${SEED_PRESETS.length} presets)`);
  console.log(`  samples/sample-ai-preset-pack.json (${aiStylePack.length} presets)`);
  console.log(
    `  samples/sample-workspace-backup.json (${(backup.songs ?? []).length} song, ${(backup.content_ideas ?? []).length} ideas, ${(backup.planned_posts ?? []).length} posts, ${(backup.performance_records ?? []).length} results)`,
  );
  console.log('  samples/ai-import-prompt.txt');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
