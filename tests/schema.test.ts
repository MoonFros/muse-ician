import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { validatePayload } from '../src/lib/validation';
import { buildExampleTemplate, buildPresetExport, buildWorkspaceBackup } from '../src/lib/interchange';
import { emptyWorkspaceData } from '../src/storage/defaults';
import { buildDemoBundle } from '../src/data/demoData';

const root = path.resolve(__dirname, '..');
const readJson = (relative: string) => JSON.parse(readFileSync(path.join(root, relative), 'utf8')) as unknown;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('committed JSON artifacts', () => {
  it('ships a schema copy identical to the source schema', () => {
    expect(readJson('public/muse-ician.schema.json')).toEqual(readJson('src/schema/muse-ician.schema.json'));
  });

  it.each([
    'public/example.json',
    'samples/example.json',
    'samples/starter-preset-pack.json',
    'samples/sample-ai-preset-pack.json',
    'samples/sample-workspace-backup.json',
  ])('%s validates against the schema', async (file) => {
    const result = await validatePayload(readJson(file));
    expect(result.fatal).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('starter pack contains all starter presets and needs no songs', async () => {
    const payload = readJson('samples/starter-preset-pack.json') as {
      presets: { id: string; platforms: string[] }[];
      songs?: unknown[];
    };
    expect(payload.presets).toHaveLength(SEED_PRESETS.length);
    expect(SEED_PRESETS.length).toBeGreaterThanOrEqual(35);
    expect(payload.songs ?? []).toHaveLength(0);
    const longForm = payload.presets.filter((preset) => preset.platforms.includes('youtube-long'));
    expect(longForm.length).toBeGreaterThanOrEqual(5);
    const result = await validatePayload(payload);
    expect(result.ok).toBe(true);
    expect(result.counts.presets).toBe(SEED_PRESETS.length);
  });

  it('example.json contains instructions and clearly placeholder records', () => {
    const raw = readFileSync(path.join(root, 'public/example.json'), 'utf8');
    expect(raw).toContain('manifest');
    expect(raw.toLowerCase()).toContain('placeholder');
  });
});

describe('schema enforcement', () => {
  it('rejects a payload with no manifest', async () => {
    const broken = clone(readJson('public/example.json')) as Record<string, unknown>;
    delete broken.manifest;
    const result = await validatePayload(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.length + result.fatal.length).toBeGreaterThan(0);
  });

  it('rejects an unsupported export type', async () => {
    const broken = clone(readJson('public/example.json')) as Record<string, unknown>;
    broken.export_type = 'totally_made_up';
    const result = await validatePayload(broken);
    expect(result.ok).toBe(false);
  });

  it('rejects a schema major version it does not understand', async () => {
    const broken = clone(readJson('public/example.json')) as Record<string, unknown>;
    broken.schema_version = '2.0.0';
    const result = await validatePayload(broken);
    expect(result.ok).toBe(false);
    expect(result.fatal.length + result.errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid enum value inside a record', async () => {
    const broken = clone(readJson('samples/sample-ai-preset-pack.json')) as {
      presets: Record<string, unknown>[];
    };
    broken.presets[0]!.difficulty = 'impossible';
    const result = await validatePayload(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.path.includes('difficulty'))).toBe(true);
  });

  it('does not execute or evaluate imported text', async () => {
    const payload = clone(readJson('samples/sample-ai-preset-pack.json')) as {
      presets: { title: string }[];
    };
    payload.presets[0]!.title = '<img src=x onerror="alert(1)">';
    const result = await validatePayload(payload);
    // Stored as a plain string; React escapes it when rendered.
    expect(result.ok).toBe(true);
    expect(result.payload?.presets?.[0]?.title ?? '').toContain('<img');
  });
});

describe('export builders', () => {
  it('round-trips a preset pack through validation', async () => {
    const payload = buildPresetExport(SEED_PRESETS, 'preset_pack');
    const result = await validatePayload(payload);
    expect(result.ok).toBe(true);
    expect(result.exportType).toBe('preset_pack');
  });

  it('round-trips a demo workspace backup', async () => {
    const demo = buildDemoBundle(SEED_PRESETS);
    const payload = buildWorkspaceBackup({ ...emptyWorkspaceData(), ...demo });
    const result = await validatePayload(payload);
    expect(result.ok).toBe(true);
    expect(result.counts.content_ideas).toBe(demo.content_ideas.length);
  });

  it('builds an example template that validates', async () => {
    const payload = buildExampleTemplate(SEED_PRESETS[0]!);
    const result = await validatePayload(payload);
    expect(result.ok).toBe(true);
  });

  it('every seed preset satisfies the schema', async () => {
    for (const preset of SEED_PRESETS) {
      const result = await validatePayload(buildPresetExport([preset], 'single_preset'));
      expect(result.ok, `${preset.id}: ${JSON.stringify(result.errors.slice(0, 2))}`).toBe(true);
    }
  });
});
