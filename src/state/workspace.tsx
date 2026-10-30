import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SEED_PRESETS } from '../data/seedPresets';
import { buildDemoBundle } from '../data/demoData';
import type {
  Campaign,
  ContentIdea,
  MetadataPackage,
  PerformanceRecord,
  PlannedPost,
  Preset,
  SaveState,
  Song,
  TrendRecord,
  UserPreferences,
  WorkspaceData,
} from '../lib/types';
import { nowIso } from '../lib/utils';
import {
  COLLECTIONS,
  createMemoryRepository,
  createRepository,
  type Collection,
  type StorageInfo,
  type WorkspaceRepository,
} from '../storage/repository';
import { emptyWorkspaceData, normalizePreferences } from '../storage/defaults';
import { getIntegrationStatus, type IntegrationStatus } from '../services/apiClient';

interface WorkspaceContextValue {
  data: WorkspaceData;
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
  /** Alias kept for the shell banner. */
  loadError: string | null;
  storage: StorageInfo;
  saveState: SaveState;
  integrations: IntegrationStatus | null;
  integrationsLoading: boolean;
  demoRecordCount: number;
  refreshIntegrations: (force?: boolean) => Promise<void>;
  reload: () => Promise<void>;

  savePreset: (preset: Preset) => Promise<void>;
  upsertPresets: (presets: Preset[]) => Promise<void>;
  removePresets: (ids: string[]) => Promise<void>;

  saveSong: (song: Song) => Promise<void>;
  upsertSongs: (songs: Song[]) => Promise<void>;
  removeSongs: (ids: string[]) => Promise<void>;

  saveIdea: (idea: ContentIdea) => Promise<void>;
  upsertIdeas: (ideas: ContentIdea[]) => Promise<void>;
  removeIdeas: (ids: string[]) => Promise<void>;

  saveMetadata: (pkg: MetadataPackage) => Promise<void>;
  upsertMetadata: (packages: MetadataPackage[]) => Promise<void>;
  removeMetadata: (ids: string[]) => Promise<void>;

  saveCampaign: (campaign: Campaign) => Promise<void>;
  upsertCampaigns: (campaigns: Campaign[]) => Promise<void>;
  removeCampaigns: (ids: string[]) => Promise<void>;

  savePost: (post: PlannedPost) => Promise<void>;
  upsertPosts: (posts: PlannedPost[]) => Promise<void>;
  removePosts: (ids: string[]) => Promise<void>;

  savePerformance: (record: PerformanceRecord) => Promise<void>;
  upsertPerformance: (records: PerformanceRecord[]) => Promise<void>;
  removePerformance: (ids: string[]) => Promise<void>;

  upsertTrends: (trends: TrendRecord[]) => Promise<void>;
  removeTrends: (ids: string[]) => Promise<void>;

  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  addDemoData: () => Promise<number>;
  clearDemoData: () => Promise<number>;
  resetWorkspace: () => Promise<void>;
  applyImportedData: (data: WorkspaceData) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const DEFAULT_STORAGE: StorageInfo = {
  backend: 'memory',
  persistent: false,
  available: false,
  note: 'Loading…',
};

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((record) => [record.id, record]));
  for (const record of incoming) map.set(record.id, record);
  return Array.from(map.values());
}

export interface WorkspaceProviderProps {
  children: ReactNode;
  /** Inject a repository in tests. */
  repository?: WorkspaceRepository;
}

export function WorkspaceProvider({ children, repository }: WorkspaceProviderProps) {
  const repoRef = useRef<WorkspaceRepository | null>(repository ?? null);
  const [ready, setReady] = useState(Boolean(repository));
  const [data, setData] = useState<WorkspaceData>(() => emptyWorkspaceData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageInfo>(repository?.info ?? DEFAULT_STORAGE);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const dataRef = useRef(data);

  const updateData = useCallback((updater: (current: WorkspaceData) => WorkspaceData) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    return next;
  }, []);

  const fail = useCallback((caught: unknown, fallback: string) => {
    setSaveState({
      status: 'error',
      message:
        caught instanceof Error
          ? `${fallback} (${caught.message})`
          : fallback,
      at: nowIso(),
    });
  }, []);

  const persist = useCallback(
    async <K extends Collection>(collection: K, records: WorkspaceData[K]) => {
      const repo = repoRef.current;
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.upsert(collection, records);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(
          caught,
          'The browser refused to save. If storage is full, export a backup and remove demo data.',
        );
        throw caught;
      }
    },
    [fail],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!repoRef.current) {
        repoRef.current = await createRepository();
        setStorage(repoRef.current.info);
      }
      const repo = repoRef.current;
      const loaded = await repo.load();
      if (!loaded.seeded) {
        const now = nowIso();
        const seeds = SEED_PRESETS.map((preset) => ({ ...preset, created_at: now, updated_at: now }));
        await repo.upsert('presets', seeds);
        await repo.markSeeded();
        updateData(() => ({ ...loaded.data, presets: seeds }));
      } else {
        updateData(() => loaded.data);
      }
      setReady(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Your workspace could not be read (${caught.message}). You can keep working, but nothing will be saved until storage works.`
          : 'Your workspace could not be read.',
      );
      repoRef.current = createMemoryRepository();
      setStorage(repoRef.current.info);
      updateData(() => ({ ...emptyWorkspaceData(), presets: SEED_PRESETS.map((preset) => ({ ...preset })) }));
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshIntegrations = useCallback(async (force = false) => {
    setIntegrationsLoading(true);
    try {
      const status = await getIntegrationStatus({ force });
      setIntegrations(status);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshIntegrations();
  }, [refreshIntegrations]);

  const upsertPresets = useCallback(
    async (presets: Preset[]) => {
      const stamped = presets.map((preset) => ({ ...preset, updated_at: nowIso() }));
      updateData((current) => ({ ...current, presets: mergeById(current.presets, stamped) }));
      await persist('presets', stamped);
    },
    [persist],
  );

  const removePresets = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      const ideas = dataRef.current.content_ideas
        .filter((idea) => idea.source_preset_id && removable.has(idea.source_preset_id))
        .map((idea) => ({ ...idea, source_preset_id: null, updated_at: nowIso() }));
      updateData((current) => ({
        ...current,
        presets: current.presets.filter((preset) => !removable.has(preset.id)),
        content_ideas: current.content_ideas.map(
          (idea) => ideas.find((next) => next.id === idea.id) ?? idea,
        ),
      }));
      await persist('presets', [] as Preset[]);
      const repo = repoRef.current;
      if (repo) {
        setSaveState({ status: 'saving' });
        try {
          await repo.remove('presets', ids);
          setSaveState({ status: 'saved', at: nowIso() });
        } catch (caught) {
          fail(caught, 'The presets could not be removed.');
          throw caught;
        }
      }
      if (ideas.length) await persist('content_ideas', ideas);
    },
    [fail, persist],
  );

  const upsertSongs = useCallback(
    async (songs: Song[]) => {
      const stamped = songs.map((song) => ({ ...song, updated_at: nowIso() }));
      updateData((current) => ({ ...current, songs: mergeById(current.songs, stamped) }));
      await persist('songs', stamped);
    },
    [persist],
  );

  const removeSongs = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      const ideas = dataRef.current.content_ideas
        .filter((idea) => idea.song_id && removable.has(idea.song_id))
        .map((idea) => ({ ...idea, song_id: null, updated_at: nowIso() }));
      const posts = dataRef.current.planned_posts
        .filter((post) => post.song_id && removable.has(post.song_id))
        .map((post) => ({ ...post, song_id: null, updated_at: nowIso() }));
      const packages = dataRef.current.metadata_packages
        .filter((pkg) => pkg.song_id && removable.has(pkg.song_id))
        .map((pkg) => ({ ...pkg, song_id: null, updated_at: nowIso() }));
      const records = dataRef.current.performance_records
        .filter((record) => record.song_id && removable.has(record.song_id))
        .map((record) => ({ ...record, song_id: null, updated_at: nowIso() }));
      const campaigns = dataRef.current.campaigns
        .filter((campaign) => campaign.song_id && removable.has(campaign.song_id))
        .map((campaign) => ({ ...campaign, song_id: null, updated_at: nowIso() }));

      updateData((current) => ({
        ...current,
        songs: current.songs.filter((song) => !removable.has(song.id)),
        content_ideas: current.content_ideas.map((idea) => ideas.find((next) => next.id === idea.id) ?? idea),
        planned_posts: current.planned_posts.map((post) => posts.find((next) => next.id === post.id) ?? post),
        metadata_packages: current.metadata_packages.map((pkg) => packages.find((next) => next.id === pkg.id) ?? pkg),
        performance_records: current.performance_records.map(
          (record) => records.find((next) => next.id === record.id) ?? record,
        ),
        campaigns: current.campaigns.map((campaign) => campaigns.find((next) => next.id === campaign.id) ?? campaign),
      }));

      const repo = repoRef.current;
      if (repo) {
        setSaveState({ status: 'saving' });
        try {
          await repo.remove('songs', ids);
          setSaveState({ status: 'saved', at: nowIso() });
        } catch (caught) {
          fail(caught, 'The song could not be removed.');
          throw caught;
        }
      }
      if (ideas.length) await persist('content_ideas', ideas);
      if (posts.length) await persist('planned_posts', posts);
      if (packages.length) await persist('metadata_packages', packages);
      if (records.length) await persist('performance_records', records);
      if (campaigns.length) await persist('campaigns', campaigns);
    },
    [fail, persist],
  );

  const upsertIdeas = useCallback(
    async (ideas: ContentIdea[]) => {
      const stamped = ideas.map((idea) => ({ ...idea, updated_at: nowIso() }));
      updateData((current) => ({ ...current, content_ideas: mergeById(current.content_ideas, stamped) }));
      await persist('content_ideas', stamped);
    },
    [persist],
  );

  const removeIdeas = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      const packages = dataRef.current.metadata_packages
        .filter((pkg) => pkg.content_idea_id && removable.has(pkg.content_idea_id))
        .map((pkg) => ({ ...pkg, content_idea_id: null, updated_at: nowIso() }));
      const posts = dataRef.current.planned_posts
        .filter((post) => post.content_idea_id && removable.has(post.content_idea_id))
        .map((post) => ({ ...post, content_idea_id: null, updated_at: nowIso() }));
      const records = dataRef.current.performance_records
        .filter((record) => record.content_idea_id && removable.has(record.content_idea_id))
        .map((record) => ({ ...record, content_idea_id: null, updated_at: nowIso() }));

      updateData((current) => ({
        ...current,
        content_ideas: current.content_ideas.filter((idea) => !removable.has(idea.id)),
        metadata_packages: current.metadata_packages.map((pkg) => packages.find((next) => next.id === pkg.id) ?? pkg),
        planned_posts: current.planned_posts.map((post) => posts.find((next) => next.id === post.id) ?? post),
        performance_records: current.performance_records.map(
          (record) => records.find((next) => next.id === record.id) ?? record,
        ),
      }));

      const repo = repoRef.current;
      if (repo) {
        setSaveState({ status: 'saving' });
        try {
          await repo.remove('content_ideas', ids);
          setSaveState({ status: 'saved', at: nowIso() });
        } catch (caught) {
          fail(caught, 'The idea could not be removed.');
          throw caught;
        }
      }
      if (packages.length) await persist('metadata_packages', packages);
      if (posts.length) await persist('planned_posts', posts);
      if (records.length) await persist('performance_records', records);
    },
    [fail, persist],
  );

  const upsertMetadata = useCallback(
    async (packages: MetadataPackage[]) => {
      const stamped = packages.map((pkg) => ({ ...pkg, updated_at: nowIso() }));
      updateData((current) => ({ ...current, metadata_packages: mergeById(current.metadata_packages, stamped) }));
      await persist('metadata_packages', stamped);
    },
    [persist],
  );

  const removeMetadata = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      updateData((current) => ({
        ...current,
        metadata_packages: current.metadata_packages.filter((pkg) => !removable.has(pkg.id)),
        planned_posts: current.planned_posts.map((post) =>
          post.metadata_package_id && removable.has(post.metadata_package_id)
            ? { ...post, metadata_package_id: null, updated_at: nowIso() }
            : post,
        ),
      }));
      const repo = repoRef.current;
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.remove('metadata_packages', ids);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(caught, 'The package could not be removed.');
        throw caught;
      }
    },
    [fail],
  );

  const upsertCampaigns = useCallback(
    async (campaigns: Campaign[]) => {
      const stamped = campaigns.map((campaign) => ({ ...campaign, updated_at: nowIso() }));
      updateData((current) => ({ ...current, campaigns: mergeById(current.campaigns, stamped) }));
      await persist('campaigns', stamped);
    },
    [persist],
  );

  const removeCampaigns = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      const ideas = dataRef.current.content_ideas
        .filter((idea) => idea.campaign_id && removable.has(idea.campaign_id))
        .map((idea) => ({ ...idea, campaign_id: null, updated_at: nowIso() }));
      const posts = dataRef.current.planned_posts
        .filter((post) => post.campaign_id && removable.has(post.campaign_id))
        .map((post) => ({ ...post, campaign_id: null, updated_at: nowIso() }));
      updateData((current) => ({
        ...current,
        campaigns: current.campaigns.filter((campaign) => !removable.has(campaign.id)),
        content_ideas: current.content_ideas.map((idea) => ideas.find((next) => next.id === idea.id) ?? idea),
        planned_posts: current.planned_posts.map((post) => posts.find((next) => next.id === post.id) ?? post),
      }));
      const repo = repoRef.current;
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.remove('campaigns', ids);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(caught, 'The campaign could not be removed.');
        throw caught;
      }
      if (ideas.length) await persist('content_ideas', ideas);
      if (posts.length) await persist('planned_posts', posts);
    },
    [fail, persist],
  );

  const upsertPosts = useCallback(
    async (posts: PlannedPost[]) => {
      const stamped = posts.map((post) => ({ ...post, updated_at: nowIso() }));
      updateData((current) => ({ ...current, planned_posts: mergeById(current.planned_posts, stamped) }));
      await persist('planned_posts', stamped);
    },
    [persist],
  );

  const removePosts = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      updateData((current) => ({
        ...current,
        planned_posts: current.planned_posts.filter((post) => !removable.has(post.id)),
      }));
      const repo = repoRef.current;
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.remove('planned_posts', ids);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(caught, 'The post could not be removed.');
        throw caught;
      }
    },
    [fail],
  );

  const upsertPerformance = useCallback(
    async (records: PerformanceRecord[]) => {
      const stamped = records.map((record) => ({ ...record, updated_at: nowIso() }));
      updateData((current) => ({ ...current, performance_records: mergeById(current.performance_records, stamped) }));
      await persist('performance_records', stamped);
    },
    [persist],
  );

  const removePerformance = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      updateData((current) => ({
        ...current,
        performance_records: current.performance_records.filter((record) => !removable.has(record.id)),
      }));
      const repo = repoRef.current;
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.remove('performance_records', ids);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(caught, 'The record could not be removed.');
        throw caught;
      }
    },
    [fail],
  );

  const upsertTrends = useCallback(
    async (trends: TrendRecord[]) => {
      updateData((current) => ({ ...current, trends: mergeById(current.trends, trends) }));
      await persist('trends', trends);
    },
    [persist],
  );

  const removeTrends = useCallback(
    async (ids: string[]) => {
      const removable = new Set(ids);
      updateData((current) => ({ ...current, trends: current.trends.filter((trend) => !removable.has(trend.id)) }));
      const repo = repoRef.current;
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.remove('trends', ids);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(caught, 'The trend record could not be removed.');
        throw caught;
      }
    },
    [fail],
  );

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const next = normalizePreferences({ ...dataRef.current.preferences, ...patch, updated_at: nowIso() });
    updateData((current) => ({ ...current, preferences: next }));
    const repo = repoRef.current;
    if (!repo) return;
    setSaveState({ status: 'saving' });
    try {
      await repo.savePreferences(next);
      setSaveState({ status: 'saved', at: nowIso() });
    } catch (caught) {
      fail(caught, 'Preferences could not be saved.');
      throw caught;
    }
  }, [fail]);

  const applyImportedData = useCallback(
    async (next: WorkspaceData) => {
      const repo = repoRef.current;
      updateData(() => next);
      if (!repo) return;
      setSaveState({ status: 'saving' });
      try {
        await repo.replaceAll(next, true);
        setSaveState({ status: 'saved', at: nowIso() });
      } catch (caught) {
        fail(caught, 'The import could not be written to storage. Your previous records are still in the database.');
        throw caught;
      }
    },
    [fail, updateData],
  );

  const addDemoData = useCallback(async () => {
    const current = dataRef.current;
    const bundle = buildDemoBundle(current.presets);
    const next: WorkspaceData = {
      ...current,
      songs: mergeById(current.songs, bundle.songs),
      campaigns: mergeById(current.campaigns, bundle.campaigns),
      content_ideas: mergeById(current.content_ideas, bundle.content_ideas),
      metadata_packages: mergeById(current.metadata_packages, bundle.metadata_packages),
      planned_posts: mergeById(current.planned_posts, bundle.planned_posts),
      performance_records: mergeById(current.performance_records, bundle.performance_records),
    };
    await applyImportedData(next);
    return (
      bundle.songs.length +
      bundle.campaigns.length +
      bundle.content_ideas.length +
      bundle.metadata_packages.length +
      bundle.planned_posts.length +
      bundle.performance_records.length
    );
  }, [applyImportedData]);

  const demoRecordCount = useMemo(() => {
    let count = 0;
    for (const collection of COLLECTIONS) {
      const records = data[collection] as unknown as { is_demo?: boolean }[];
      count += records.filter((record) => record.is_demo).length;
    }
    return count;
  }, [data]);

  const clearDemoData = useCallback(async () => {
    const next = { ...dataRef.current } as WorkspaceData;
    let removed = 0;
    for (const collection of COLLECTIONS) {
      const records = dataRef.current[collection] as unknown as { id: string; is_demo?: boolean }[];
      const kept = records.filter((record) => !record.is_demo);
      removed += records.length - kept.length;
      (next[collection] as unknown) = kept;
    }
    await applyImportedData(next);
    return removed;
  }, [applyImportedData]);

  const resetWorkspace = useCallback(async () => {
    const fresh = emptyWorkspaceData();
    const now = nowIso();
    const seeds = SEED_PRESETS.map((preset) => ({ ...preset, created_at: now, updated_at: now }));
    await applyImportedData({ ...fresh, presets: seeds });
  }, [applyImportedData]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      data,
      preferences: data.preferences,
      loading: loading || !ready,
      error,
      loadError: error,
      storage,
      saveState,
      integrations,
      integrationsLoading,
      demoRecordCount,
      refreshIntegrations,
      reload: load,
      savePreset: (preset) => upsertPresets([preset]),
      upsertPresets,
      removePresets,
      saveSong: (song) => upsertSongs([song]),
      upsertSongs,
      removeSongs,
      saveIdea: (idea) => upsertIdeas([idea]),
      upsertIdeas,
      removeIdeas,
      saveMetadata: (pkg) => upsertMetadata([pkg]),
      upsertMetadata,
      removeMetadata,
      saveCampaign: (campaign) => upsertCampaigns([campaign]),
      upsertCampaigns,
      removeCampaigns,
      savePost: (post) => upsertPosts([post]),
      upsertPosts,
      removePosts,
      savePerformance: (record) => upsertPerformance([record]),
      upsertPerformance,
      removePerformance,
      upsertTrends,
      removeTrends,
      updatePreferences,
      addDemoData,
      clearDemoData,
      resetWorkspace,
      applyImportedData,
    }),
    [
      addDemoData,
      applyImportedData,
      clearDemoData,
      data,
      demoRecordCount,
      error,
      integrations,
      integrationsLoading,
      load,
      loading,
      ready,
      refreshIntegrations,
      removeCampaigns,
      removeIdeas,
      removeMetadata,
      removePerformance,
      removePosts,
      removePresets,
      removeSongs,
      removeTrends,
      resetWorkspace,
      saveState,
      storage,
      updatePreferences,
      upsertCampaigns,
      upsertIdeas,
      upsertMetadata,
      upsertPerformance,
      upsertPosts,
      upsertPresets,
      upsertSongs,
      upsertTrends,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside a WorkspaceProvider');
  return context;
}

export type { Collection, StorageInfo };
