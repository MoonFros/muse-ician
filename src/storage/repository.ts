import { openDB, type IDBPDatabase } from 'idb';
import type {
  Campaign,
  ContentIdea,
  MetadataPackage,
  PerformanceRecord,
  PlannedPost,
  Preset,
  Song,
  TrendRecord,
  UserPreferences,
  WorkspaceData,
} from '../lib/types';
import { emptyWorkspaceData, normalizePreferences } from './defaults';

export const COLLECTIONS = [
  'presets',
  'songs',
  'content_ideas',
  'metadata_packages',
  'campaigns',
  'planned_posts',
  'trends',
  'performance_records',
] as const;

export type Collection = (typeof COLLECTIONS)[number];

export interface StorageInfo {
  backend: 'indexeddb' | 'localstorage' | 'memory';
  /** True when data survives a reload. */
  persistent: boolean;
  /** True when writes are reaching durable browser storage. */
  available: boolean;
  /** Human-readable explanation shown in Settings. */
  note: string;
  /** Warning text shown in the shell when storage is not durable. */
  message?: string;
}

export interface LoadedWorkspace {
  data: WorkspaceData;
  seeded: boolean;
}

export interface WorkspaceRepository {
  info: StorageInfo;
  load(): Promise<LoadedWorkspace>;
  savePreferences(preferences: UserPreferences): Promise<void>;
  upsert<K extends Collection>(collection: K, records: WorkspaceData[K]): Promise<void>;
  remove(collection: Collection, ids: string[]): Promise<void>;
  replaceAll(data: WorkspaceData, seeded: boolean): Promise<void>;
  clear(): Promise<void>;
  markSeeded(): Promise<void>;
}

const DB_NAME = 'muse-ician';
const DB_VERSION = 1;
const META_STORE = 'meta';
const LS_KEY = 'muse-ician:workspace:v1';

type AnyRecord = { id: string };

function sortByCreated<T extends AnyRecord>(records: T[]): T[] {
  return [...records].sort((a, b) => a.id.localeCompare(b.id));
}

function assemble(
  collections: Partial<Record<Collection, AnyRecord[]>>,
  preferences: UserPreferences | null,
): LoadedWorkspace {
  const base = emptyWorkspaceData();
  return {
    data: {
      ...base,
      presets: (collections.presets ?? []) as Preset[],
      songs: (collections.songs ?? []) as Song[],
      content_ideas: (collections.content_ideas ?? []) as ContentIdea[],
      metadata_packages: (collections.metadata_packages ?? []) as MetadataPackage[],
      campaigns: (collections.campaigns ?? []) as Campaign[],
      planned_posts: (collections.planned_posts ?? []) as PlannedPost[],
      trends: (collections.trends ?? []) as TrendRecord[],
      performance_records: (collections.performance_records ?? []) as PerformanceRecord[],
      preferences: normalizePreferences(preferences ?? base.preferences),
    },
    seeded: collections.presets !== undefined && (collections.presets?.length ?? 0) > 0,
  };
}

class IndexedDbRepository implements WorkspaceRepository {
  info: StorageInfo = {
    backend: 'indexeddb',
    persistent: true,
    available: true,
    note: 'IndexedDB in this browser. Data survives reloads but not clearing site data or a different browser.',
  };

  constructor(private db: IDBPDatabase) {}

  static async open(): Promise<IndexedDbRepository> {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        for (const collection of COLLECTIONS) {
          if (!database.objectStoreNames.contains(collection)) {
            database.createObjectStore(collection, { keyPath: 'id' });
          }
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE);
        }
      },
    });
    return new IndexedDbRepository(db);
  }

  async load(): Promise<LoadedWorkspace> {
    const collections: Partial<Record<Collection, AnyRecord[]>> = {};
    await Promise.all(
      COLLECTIONS.map(async (collection) => {
        collections[collection] = sortByCreated((await this.db.getAll(collection)) as AnyRecord[]);
      }),
    );
    const preferences = (await this.db.get(META_STORE, 'preferences')) as UserPreferences | undefined;
    return assemble(collections, preferences ?? null);
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    await this.db.put(META_STORE, preferences, 'preferences');
  }

  async upsert<K extends Collection>(collection: K, records: WorkspaceData[K]): Promise<void> {
    const tx = this.db.transaction(collection, 'readwrite');
    await Promise.all([
      ...(records as unknown as AnyRecord[]).map((record) => tx.store.put(record)),
      tx.done,
    ]);
  }

  async remove(collection: Collection, ids: string[]): Promise<void> {
    const tx = this.db.transaction(collection, 'readwrite');
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  }

  async replaceAll(data: WorkspaceData, seeded: boolean): Promise<void> {
    const tx = this.db.transaction([...COLLECTIONS, META_STORE], 'readwrite');
    for (const collection of COLLECTIONS) {
      tx.objectStore(collection).clear();
      for (const record of data[collection] as unknown as AnyRecord[]) {
        void tx.objectStore(collection).put(record);
      }
    }
    void tx.objectStore(META_STORE).put(data.preferences, 'preferences');
    void tx.objectStore(META_STORE).put({ seeded }, 'seeded');
    await tx.done;
  }

  async clear(): Promise<void> {
    const tx = this.db.transaction([...COLLECTIONS, META_STORE], 'readwrite');
    for (const collection of COLLECTIONS) tx.objectStore(collection).clear();
    tx.objectStore(META_STORE).clear();
    await tx.done;
  }

  async markSeeded(): Promise<void> {
    await this.db.put(META_STORE, { seeded: true }, 'seeded');
  }

  async wasSeeded(): Promise<boolean> {
    const value = (await this.db.get(META_STORE, 'seeded')) as { seeded?: boolean } | undefined;
    return Boolean(value?.seeded);
  }
}

class LocalStorageRepository implements WorkspaceRepository {
  info: StorageInfo = {
    backend: 'localstorage',
    persistent: true,
    available: true,
    note: 'localStorage fallback. Your data survives reloads in this browser but the storage limit is smaller than IndexedDB.',
  };

  private read(): { data: WorkspaceData; seeded: boolean } | null {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data?: Partial<WorkspaceData>; seeded?: boolean };
      if (!parsed?.data) return null;
      const base = emptyWorkspaceData();
      const data = { ...base } as WorkspaceData;
      for (const collection of COLLECTIONS) {
        const value = parsed.data[collection];
        if (Array.isArray(value)) {
          (data[collection] as unknown) = sortByCreated(value as AnyRecord[]);
        }
      }
      data.preferences = normalizePreferences(parsed.data.preferences ?? base.preferences);
      return { data, seeded: Boolean(parsed.seeded) };
    } catch {
      return null;
    }
  }

  private write(data: WorkspaceData, seeded: boolean): void {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ data, seeded, saved_at: new Date().toISOString() }));
  }

  async load(): Promise<LoadedWorkspace> {
    const stored = this.read();
    if (!stored) return assemble({}, null);
    return { data: stored.data, seeded: stored.seeded };
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    const stored = this.read();
    const data = stored?.data ?? emptyWorkspaceData();
    this.write({ ...data, preferences }, stored?.seeded ?? false);
  }

  async upsert<K extends Collection>(collection: K, records: WorkspaceData[K]): Promise<void> {
    const stored = this.read();
    const data = stored?.data ?? emptyWorkspaceData();
    const map = new Map((data[collection] as unknown as AnyRecord[]).map((record) => [record.id, record]));
    for (const record of records as unknown as AnyRecord[]) map.set(record.id, record);
    (data[collection] as unknown) = Array.from(map.values());
    this.write(data, stored?.seeded ?? false);
  }

  async remove(collection: Collection, ids: string[]): Promise<void> {
    const stored = this.read();
    if (!stored) return;
    const data = stored.data;
    const remove = new Set(ids);
    (data[collection] as unknown) = (data[collection] as unknown as AnyRecord[]).filter(
      (record) => !remove.has(record.id),
    );
    this.write(data, stored.seeded);
  }

  async replaceAll(data: WorkspaceData, seeded: boolean): Promise<void> {
    this.write(data, seeded);
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(LS_KEY);
  }

  async markSeeded(): Promise<void> {
    const stored = this.read();
    if (stored) this.write(stored.data, true);
  }
}

class MemoryRepository implements WorkspaceRepository {
  info: StorageInfo = {
    backend: 'memory',
    persistent: false,
    available: false,
    note: 'Browser storage is unavailable, so everything lives in memory for this session. Export a backup before closing the tab.',
    message:
      'This browser is blocking local storage, so nothing is being saved. You can still work this session — export a backup before closing the tab.',
  };

  private data: WorkspaceData = emptyWorkspaceData();
  private seeded = false;

  async load(): Promise<LoadedWorkspace> {
    return { data: this.data, seeded: this.seeded };
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    this.data = { ...this.data, preferences };
  }

  async upsert<K extends Collection>(collection: K, records: WorkspaceData[K]): Promise<void> {
    const map = new Map((this.data[collection] as unknown as AnyRecord[]).map((record) => [record.id, record]));
    for (const record of records as unknown as AnyRecord[]) map.set(record.id, record);
    (this.data[collection] as unknown) = Array.from(map.values());
  }

  async remove(collection: Collection, ids: string[]): Promise<void> {
    const remove = new Set(ids);
    (this.data[collection] as unknown) = (this.data[collection] as unknown as AnyRecord[]).filter(
      (record) => !remove.has(record.id),
    );
  }

  async replaceAll(data: WorkspaceData, seeded: boolean): Promise<void> {
    this.data = data;
    this.seeded = seeded;
  }

  async clear(): Promise<void> {
    this.data = emptyWorkspaceData();
    this.seeded = false;
  }

  async markSeeded(): Promise<void> {
    this.seeded = true;
  }
}

/** Try IndexedDB, then localStorage, then memory. Never throws; the UI reports which backend is live. */
export async function createRepository(): Promise<WorkspaceRepository> {
  if (typeof indexedDB !== 'undefined') {
    try {
      return await IndexedDbRepository.open();
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probe = `${LS_KEY}:probe`;
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return new LocalStorageRepository();
    } catch {
      /* fall through */
    }
  }
  return new MemoryRepository();
}

export function createMemoryRepository(): WorkspaceRepository {
  return new MemoryRepository();
}
