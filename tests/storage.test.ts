import { describe, expect, it } from 'vitest';
import { createRepository } from '../src/storage/repository';
import { SEED_PRESETS } from '../src/data/seedPresets';

describe('storage selection', () => {
  it('uses IndexedDB when it is available and keeps data across repository instances', async () => {
    const first = await createRepository();
    expect(first.info.backend).toBe('indexeddb');
    expect(first.info.persistent).toBe(true);

    const preset = SEED_PRESETS[0]!;
    await first.upsert('presets', [preset]);

    const second = await createRepository();
    const loaded = await second.load();
    expect(loaded.data.presets.some((item) => item.id === preset.id)).toBe(true);
  });

  it('round-trips preferences and removes records by id', async () => {
    const repo = await createRepository();
    const loaded = await repo.load();
    await repo.savePreferences({ ...loaded.data.preferences, artist_name: 'Stored Artist' });
    const again = await repo.load();
    expect(again.data.preferences.artist_name).toBe('Stored Artist');

    const preset = SEED_PRESETS[1]!;
    await repo.upsert('presets', [preset]);
    await repo.remove('presets', [preset.id]);
    const after = await repo.load();
    expect(after.data.presets.some((item) => item.id === preset.id)).toBe(false);
  });
});
