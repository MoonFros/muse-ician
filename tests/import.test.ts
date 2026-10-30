import { describe, expect, it } from 'vitest';
import { SEED_PRESETS } from '../src/data/seedPresets';
import { buildDemoBundle } from '../src/data/demoData';
import { buildMetadataExport, buildPresetExport, buildWorkspaceBackup } from '../src/lib/interchange';
import { emptyWorkspaceData, normalizePreferences } from '../src/storage/defaults';
import { validatePayload } from '../src/lib/validation';
import { applyImportPlan, importSummary, planImport } from '../src/lib/importPlan';
import type { WorkspaceData } from '../src/lib/types';

function workspaceWithPresets(count = 3): WorkspaceData {
  return {
    ...emptyWorkspaceData(),
    presets: SEED_PRESETS.slice(0, count),
    preferences: normalizePreferences({ artist_name: 'Test Artist' }),
  };
}

const renamedPreset = { ...SEED_PRESETS[0]!, title: 'Renamed by the import' };

describe('import planning', () => {
  it('skips duplicates by default and never overwrites silently', () => {
    const current = workspaceWithPresets();
    const payload = buildPresetExport([renamedPreset], 'single_preset');
    const plan = planImport(payload, current, 'skip');
    expect(plan.conflicts).toHaveLength(1);
    const next = applyImportPlan(plan, current);
    expect(next.presets.find((preset) => preset.id === renamedPreset.id)?.title).toBe(current.presets[0]!.title);
    expect(importSummary(plan).toLowerCase()).toContain('skip');
  });

  it('replaces only when the user chooses replace', () => {
    const current = workspaceWithPresets();
    const payload = buildPresetExport([renamedPreset], 'single_preset');
    const plan = planImport(payload, current, 'replace');
    const next = applyImportPlan(plan, current);
    expect(next.presets.find((preset) => preset.id === renamedPreset.id)?.title).toBe('Renamed by the import');
    expect(next.presets).toHaveLength(current.presets.length);
  });

  it('imports duplicates under a new id when asked, remapping references', () => {
    const current = workspaceWithPresets();
    const payload = buildPresetExport([renamedPreset], 'single_preset');
    const plan = planImport(payload, current, 'new-id');
    const next = applyImportPlan(plan, current);
    expect(next.presets).toHaveLength(current.presets.length + 1);
    const added = next.presets.find((preset) => preset.title === 'Renamed by the import');
    expect(added).toBeDefined();
    expect(added!.id).not.toBe(renamedPreset.id);
  });

  it('keeps records that are not in the file', () => {
    const current = workspaceWithPresets(5);
    const payload = buildPresetExport([SEED_PRESETS[9]!], 'single_preset');
    const next = applyImportPlan(planImport(payload, current, 'skip'), current);
    expect(next.presets).toHaveLength(6);
    expect(next.preferences.artist_name).toBe('Test Artist');
  });

  it('reports dangling references instead of inventing records', async () => {
    const demo = buildDemoBundle(SEED_PRESETS);
    const pkg = demo.metadata_packages[0]!;
    const payload = buildMetadataExport([{ ...pkg, content_idea_id: 'idea-that-does-not-exist' }]);
    const validation = await validatePayload(payload);
    expect(validation.ok).toBe(true);
    const plan = planImport(validation.payload!, emptyWorkspaceData(), 'skip');
    expect(plan.danglingReferences.length).toBeGreaterThan(0);
    const next = applyImportPlan(plan, emptyWorkspaceData());
    expect(next.content_ideas).toHaveLength(0);
    expect(next.metadata_packages).toHaveLength(1);
  });

  it('imports a preset pack without any songs or metadata', async () => {
    const payload = buildPresetExport(SEED_PRESETS.slice(0, 4), 'preset_pack');
    const validation = await validatePayload(payload);
    const next = applyImportPlan(planImport(validation.payload!, emptyWorkspaceData(), 'skip'), emptyWorkspaceData());
    expect(next.presets).toHaveLength(4);
    expect(next.songs).toHaveLength(0);
    expect(next.metadata_packages).toHaveLength(0);
  });

  it('applies preferences only when the caller keeps them in the plan', () => {
    const demo = buildDemoBundle(SEED_PRESETS);
    const payload = buildWorkspaceBackup({ ...emptyWorkspaceData(), ...demo }, 'backup');
    const current = workspaceWithPresets();
    const plan = planImport(payload, current, 'skip');
    const keep = applyImportPlan(plan, current);
    expect(keep.preferences.artist_name).toBe('Test Artist');
    const replacePrefs = applyImportPlan({ ...plan, preferences: payload.preferences }, current);
    expect(replacePrefs.preferences).not.toBeUndefined();
  });

  it('labels demo records so they can be removed later', () => {
    const demo = buildDemoBundle(SEED_PRESETS);
    expect(demo.songs.every((song) => song.is_demo)).toBe(true);
    expect(demo.planned_posts.every((post) => post.is_demo)).toBe(true);
    expect(demo.performance_records.every((record) => record.is_demo)).toBe(true);
  });
});
