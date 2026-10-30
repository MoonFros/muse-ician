import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Callout, EmptyState, PageHeader, SearchField, SegmentedControl } from '../components/ui/primitives';
import { Checkbox, Select } from '../components/ui/forms';
import { SEED_PRESET_COUNT } from '../data/seedPresets';
import { PresetCard } from '../components/presets/PresetCard';
import { PresetFormModal } from '../components/forms/PresetFormModal';
import { IdeaFromPresetModal } from '../components/forms/IdeaFromPresetModal';
import type { IdeaMode, Preset } from '../lib/types';
import {
  BUDGETS,
  CAMPAIGN_STAGES,
  DIFFICULTIES,
  FILMING_METHODS,
  OBJECTIVES,
  PLATFORMS,
  PLATFORM_LABELS,
} from '../lib/types';
import { buildIdea } from '../lib/ideas';
import { buildPresetExport, downloadPayload, exportFilename } from '../lib/interchange';
import { newId, nowIso, pluralize } from '../lib/utils';

type SortKey = 'recommended' | 'name' | 'recent' | 'difficulty' | 'favorite';

const DIFFICULTY_ORDER = { easy: 0, moderate: 1, challenging: 2 } as const;

const DURATION_BUCKETS = [
  { value: 'short', label: 'Under 15s', test: (_min: number, max: number) => max <= 15 },
  { value: 'medium', label: '15–30s', test: (min: number, max: number) => min <= 30 && max > 15 },
  { value: 'long', label: 'Over 30s', test: (min: number) => min > 30 },
];

interface Filters {
  platform: string;
  objective: string;
  difficulty: string;
  budget: string;
  equipment: string;
  filming: string;
  stage: string;
  genre: string;
  mood: string;
  duration: string;
  favorites: boolean;
  mine: boolean;
  archived: boolean;
}

const EMPTY_FILTERS: Filters = {
  platform: '',
  objective: '',
  difficulty: '',
  budget: '',
  equipment: '',
  filming: '',
  stage: '',
  genre: '',
  mood: '',
  duration: '',
  favorites: false,
  mine: false,
  archived: false,
};

export default function IdeaLibraryPage() {
  const { data, upsertPresets, removePresets, upsertIdeas } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [usingPreset, setUsingPreset] = useState<{ preset: Preset; mode: IdeaMode } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'archive'; preset: Preset }
    | { type: 'delete'; preset: Preset }
    | { type: 'bulk-archive' }
    | null
  >(null);
  const [bulkSongId, setBulkSongId] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  // Handle deep links: ?new=1 opens the preset form, ?pick=1 explains the selection mode.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingPreset(null);
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => {
    const genres = new Set<string>();
    const moods = new Set<string>();
    const equipment = new Set<string>();
    for (const preset of data.presets) {
      for (const genre of preset.genre_tags ?? []) genres.add(genre);
      for (const mood of preset.mood_tags ?? []) moods.add(mood);
      for (const item of preset.equipment ?? []) equipment.add(item);
    }
    return {
      genres: [...genres].sort(),
      moods: [...moods].sort(),
      equipment: [...equipment].sort(),
    };
  }, [data.presets]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = data.presets.filter((preset) => {
      if (!filters.archived && preset.is_archived) return false;
      if (filters.archived && !preset.is_archived) return false;
      if (filters.favorites && !preset.is_favorite) return false;
      if (filters.mine && !preset.is_user_created) return false;
      if (filters.platform && !preset.platforms.includes(filters.platform as never)) return false;
      if (filters.objective && !preset.objectives.includes(filters.objective as never)) return false;
      if (filters.difficulty && preset.difficulty !== filters.difficulty) return false;
      if (filters.budget && preset.budget !== filters.budget) return false;
      if (filters.filming && !preset.filming_methods.includes(filters.filming as never)) return false;
      if (filters.stage && preset.campaign_stage !== filters.stage) return false;
      if (filters.equipment && !preset.equipment.includes(filters.equipment)) return false;
      if (filters.genre && !(preset.genre_tags ?? []).includes(filters.genre)) return false;
      if (filters.mood && !(preset.mood_tags ?? []).includes(filters.mood)) return false;
      if (filters.duration) {
        const bucket = DURATION_BUCKETS.find((item) => item.value === filters.duration);
        if (bucket && !bucket.test(preset.duration_seconds.min, preset.duration_seconds.max)) return false;
      }
      if (term) {
        const haystack = [
          preset.title,
          preset.summary,
          preset.description,
          ...preset.tags,
          ...preset.hook_examples,
          ...(preset.genre_tags ?? []),
          ...(preset.mood_tags ?? []),
          ...preset.execution_steps,
          ...preset.on_screen_text ?? [],
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const prefs = data.preferences;
    const scored = list.map((preset) => {
      let score = 0;
      if (preset.is_favorite) score += 4;
      if (prefs.preferred_platforms.some((platform) => preset.platforms.includes(platform))) score += 3;
      if (prefs.preferred_genres.some((genre) => (preset.genre_tags ?? []).includes(genre))) score += 2;
      if (prefs.preferred_moods.some((mood) => (preset.mood_tags ?? []).includes(mood))) score += 2;
      return { preset, score };
    });

    scored.sort((a, b) => {
      if (sort === 'name') return a.preset.title.localeCompare(b.preset.title);
      if (sort === 'recent') return b.preset.updated_at.localeCompare(a.preset.updated_at);
      if (sort === 'difficulty') {
        return (
          DIFFICULTY_ORDER[a.preset.difficulty] - DIFFICULTY_ORDER[b.preset.difficulty] ||
          a.preset.title.localeCompare(b.preset.title)
        );
      }
      if (sort === 'favorite') {
        return Number(b.preset.is_favorite) - Number(a.preset.is_favorite) || a.preset.title.localeCompare(b.preset.title);
      }
      return b.score - a.score || a.preset.title.localeCompare(b.preset.title);
    });

    return scored.map((entry) => entry.preset);
  }, [data.presets, data.preferences, filters, query, sort]);

  const activeFilterCount = Object.entries(filters).filter(([, value]) =>
    typeof value === 'boolean' ? value : Boolean(value),
  ).length;

  const selectedPresets = data.presets.filter((preset) => selectedIds.includes(preset.id));
  const pickMode = searchParams.get('pick') === '1';

  const toggleSelect = (preset: Preset, selected: boolean) => {
    setSelectedIds((current) =>
      selected ? [...current, preset.id] : current.filter((id) => id !== preset.id),
    );
  };

  const duplicate = async (preset: Preset) => {
    const now = nowIso();
    const copy: Preset = {
      ...preset,
      id: newId('preset'),
      title: `${preset.title} (copy)`,
      is_user_created: true,
      is_favorite: false,
      is_archived: false,
      source_preset_id: preset.id,
      usage_count: 0,
      is_demo: false,
      created_at: now,
      updated_at: now,
    };
    await upsertPresets([copy]);
    toast('Preset duplicated', { tone: 'success', description: `“${copy.title}” is yours to edit.` });
  };

  const toggleFavorite = async (preset: Preset) => {
    await upsertPresets([{ ...preset, is_favorite: !preset.is_favorite, updated_at: nowIso() }]);
  };

  const archive = async (preset: Preset) => {
    await upsertPresets([{ ...preset, is_archived: true, updated_at: nowIso() }]);
    toast('Preset archived', { tone: 'success', description: 'Restore it from the archived filter.' });
  };

  const restore = async (preset: Preset) => {
    await upsertPresets([{ ...preset, is_archived: false, updated_at: nowIso() }]);
    toast('Preset restored', { tone: 'success' });
  };

  const remove = async (preset: Preset) => {
    await removePresets([preset.id]);
    toast('Preset deleted', { tone: 'success', description: 'Ideas created from it are not affected.' });
  };

  const exportPreset = (preset: Preset) => {
    const payload = buildPresetExport([preset], 'single_preset');
    const name = downloadPayload(payload, exportFilename(payload, preset.title));
    toast('Preset exported', { tone: 'success', description: name });
  };

  const exportSelected = () => {
    if (!selectedPresets.length) return;
    const payload = buildPresetExport(selectedPresets, 'preset_pack');
    const name = downloadPayload(payload);
    toast(`Exported ${pluralize(selectedPresets.length, 'preset')}`, { tone: 'success', description: name });
  };

  const createIdeasForSong = async () => {
    const song = data.songs.find((item) => item.id === bulkSongId);
    if (!song) {
      toast('Choose a song first', { tone: 'error' });
      return;
    }
    const ideas = selectedPresets.map((preset) =>
      buildIdea({ preset, song, mode: 'use-as-is', title: `${preset.title} — ${song.title}` }),
    );
    await upsertIdeas(ideas);
    setBulkOpen(false);
    setSelectedIds([]);
    toast(`${pluralize(ideas.length, 'idea')} added to ${song.title}`, {
      tone: 'success',
      description: 'Find them in Creative Coach with status Idea.',
    });
    navigate('/coach');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Idea Library"
        title="Video concept presets"
        description={`${SEED_PRESET_COUNT} starter concepts (short-form and long-form) plus anything you create or import. Each one is a complete execution recipe, not a slogan.`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditingPreset(null);
                setFormOpen(true);
              }}
            >
              <Icon name="plus" size={15} />
              New preset
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!data.presets.length) {
                  toast('Nothing to export yet', { tone: 'error' });
                  return;
                }
                const payload = buildPresetExport(data.presets.filter((preset) => !preset.is_archived));
                downloadPayload(payload);
                toast('Library exported', { tone: 'success' });
              }}
            >
              <Icon name="download" size={15} />
              Export library
            </button>
          </>
        }
      />

      {pickMode ? (
        <Callout tone="info" title="Pick a preset to start an idea">
          Open a preset and choose <strong className="text-slate-text">Use for a song</strong>. You can customise the
          concept before you film, and the preset itself is never modified.
        </Callout>
      ) : null}

      <div className="surface">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search presets"
              placeholder="Search titles, hooks, tags, steps…"
              className="flex-1"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Sort presets"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                options={[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'name', label: 'Name A–Z' },
                  { value: 'recent', label: 'Recently updated' },
                  { value: 'difficulty', label: 'Easiest first' },
                  { value: 'favorite', label: 'Favourites first' },
                ]}
                small
                className="w-40"
              />
              <SegmentedControl
                ariaLabel="Layout"
                value={view}
                onChange={setView}
                options={[
                  { value: 'grid', label: 'Grid', icon: 'grid' },
                  { value: 'list', label: 'List', icon: 'list' },
                ]}
              />
              <button
                type="button"
                className={`btn-secondary btn-sm ${activeFilterCount ? 'border-accent/40 text-accent-soft' : ''}`}
                onClick={() => setShowFilters((open) => !open)}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
              >
                <Icon name="filter" size={13} />
                {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}` : 'Filters'}
              </button>
            </div>
          </div>

          <div
            id="filters-panel"
            hidden={!showFilters}
            className="grid gap-2.5 border-t border-white/[0.06] pt-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Select
              aria-label="Platform"
              placeholder="Any platform"
              value={filters.platform}
              onChange={(event) => setFilters({ ...filters, platform: event.target.value })}
              options={PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
              small
            />
            <Select
              aria-label="Objective"
              placeholder="Any objective"
              value={filters.objective}
              onChange={(event) => setFilters({ ...filters, objective: event.target.value })}
              options={OBJECTIVES.map((objective) => ({ value: objective, label: objective }))}
              small
            />
            <Select
              aria-label="Difficulty"
              placeholder="Any difficulty"
              value={filters.difficulty}
              onChange={(event) => setFilters({ ...filters, difficulty: event.target.value })}
              options={DIFFICULTIES.map((value) => ({ value, label: value }))}
              small
            />
            <Select
              aria-label="Budget"
              placeholder="Any budget"
              value={filters.budget}
              onChange={(event) => setFilters({ ...filters, budget: event.target.value })}
              options={BUDGETS.map((value) => ({ value, label: value }))}
              small
            />
            <Select
              aria-label="Filming method"
              placeholder="Any filming method"
              value={filters.filming}
              onChange={(event) => setFilters({ ...filters, filming: event.target.value })}
              options={FILMING_METHODS.map((value) => ({ value, label: value }))}
              small
            />
            <Select
              aria-label="Equipment"
              placeholder="Any equipment"
              value={filters.equipment}
              onChange={(event) => setFilters({ ...filters, equipment: event.target.value })}
              options={options.equipment.map((value) => ({ value, label: value }))}
              small
            />
            <Select
              aria-label="Campaign stage"
              placeholder="Any campaign stage"
              value={filters.stage}
              onChange={(event) => setFilters({ ...filters, stage: event.target.value })}
              options={CAMPAIGN_STAGES.map((value) => ({ value, label: value }))}
              small
            />
            <Select
              aria-label="Duration"
              placeholder="Any duration"
              value={filters.duration}
              onChange={(event) => setFilters({ ...filters, duration: event.target.value })}
              options={DURATION_BUCKETS.map(({ value, label }) => ({ value, label }))}
              small
            />
            <Select
              aria-label="Genre"
              placeholder="Any genre"
              value={filters.genre}
              onChange={(event) => setFilters({ ...filters, genre: event.target.value })}
              options={options.genres.map((value) => ({ value, label: value }))}
              small
            />
            <Select
              aria-label="Mood"
              placeholder="Any mood"
              value={filters.mood}
              onChange={(event) => setFilters({ ...filters, mood: event.target.value })}
              options={options.moods.map((value) => ({ value, label: value }))}
              small
            />
            <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
              <Checkbox
                label="Favourites"
                checked={filters.favorites}
                onChange={(checked) => setFilters({ ...filters, favorites: checked })}
              />
              <Checkbox
                label="My presets"
                checked={filters.mine}
                onChange={(checked) => setFilters({ ...filters, mine: checked })}
              />
              <Checkbox
                label="Archived"
                checked={filters.archived}
                onChange={(checked) => setFilters({ ...filters, archived: checked })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-faint">
            <span>
              Showing {filtered.length} of {data.presets.length} presets
              {activeFilterCount ? ` · ${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : ''}
            </span>
            {activeFilterCount || query ? (
              <button
                type="button"
                className="rounded text-accent-soft hover:underline"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setQuery('');
                }}
              >
                Clear search and filters
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {selectedIds.length ? (
        <div className="sticky top-14 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-white/[0.06] px-3.5 py-2.5 shadow-panel backdrop-blur">
          <span className="text-xs text-slate-text">{selectedIds.length} selected</span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setBulkOpen(true)}>
            Use for a song
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={exportSelected}>
            Export selected
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setConfirmAction({ type: 'bulk-archive' })}
          >
            Archive
          </button>
          <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setSelectedIds([])}>
            Clear selection
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title={data.presets.length === 0 ? 'Your preset library is empty' : 'No presets match those filters'}
          description={
            data.presets.length === 0
              ? `Restore the ${SEED_PRESET_COUNT} starter presets in Settings, create your own, or import a preset pack.`
              : 'Search and filters work together, so a narrow combination can exclude everything. Clear one or two and try again.'
          }
          actions={
            data.presets.length === 0 ? (
              <>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => {
                    setEditingPreset(null);
                    setFormOpen(true);
                  }}
                >
                  Create a preset
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => navigate('/settings')}
                >
                  Restore starter library
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setQuery('');
                }}
              >
                Clear filters
              </button>
            )
          }
        />
      ) : view === 'grid' ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((preset) => (
            <li key={preset.id} className="min-w-0">
              <PresetCard
                preset={preset}
                selected={selectedIds.includes(preset.id)}
                onSelect={toggleSelect}
                actions={{
                  onUse: (item) => setUsingPreset({ preset: item, mode: 'use-as-is' }),
                  onCustomize: (item) => setUsingPreset({ preset: item, mode: 'customized' }),
                  onToggleFavorite: toggleFavorite,
                  onDuplicate: duplicate,
                  onEdit: (item) => {
                    setEditingPreset(item);
                    setFormOpen(true);
                  },
                  onArchive: archive,
                  onRestore: restore,
                  onExport: exportPreset,
                  onDelete: (item) => setConfirmAction({ type: 'delete', preset: item }),
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {filtered.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              view="list"
              selected={selectedIds.includes(preset.id)}
              onSelect={toggleSelect}
              actions={{
                onUse: (item) => setUsingPreset({ preset: item, mode: 'use-as-is' }),
                onCustomize: (item) => setUsingPreset({ preset: item, mode: 'customized' }),
                onToggleFavorite: toggleFavorite,
                onDuplicate: duplicate,
                onEdit: (item) => {
                  setEditingPreset(item);
                  setFormOpen(true);
                },
                onArchive: archive,
                onRestore: restore,
                onExport: exportPreset,
                onDelete: (item) => setConfirmAction({ type: 'delete', preset: item }),
              }}
            />
          ))}
        </ul>
      )}

      <PresetFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        preset={editingPreset}
        onSaved={(preset) => {
          setSelectedIds((current) => current.filter((id) => id !== preset.id));
        }}
      />

      <IdeaFromPresetModal
        preset={usingPreset?.preset ?? null}
        open={Boolean(usingPreset)}
        initialMode={usingPreset?.mode ?? 'use-as-is'}
        onClose={() => setUsingPreset(null)}
      />

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Use these presets for a song"
        description={`${selectedPresets.length} preset${selectedPresets.length === 1 ? '' : 's'} will each become its own editable idea.`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setBulkOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={createIdeasForSong} disabled={!data.songs.length}>
              Create ideas
            </button>
          </>
        }
      >
        {data.songs.length ? (
          <Select
            label="Song"
            value={bulkSongId}
            onChange={(event) => setBulkSongId(event.target.value)}
            placeholder="Choose a song"
            options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
          />
        ) : (
          <Callout tone="warning" title="No songs yet">
            Add a song first so the ideas can be linked to something. You can also create individual ideas without a
            song.
          </Callout>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'delete'
            ? 'Delete this preset?'
            : confirmAction?.type === 'bulk-archive'
              ? 'Archive the selected presets?'
              : 'Archive this preset?'
        }
        description={
          confirmAction?.type === 'delete' ? (
            <>
              <p>
                “{confirmAction.preset.title}” will be permanently removed from this browser. Ideas you already created
                from it keep their own copy of the content.
              </p>
              <p className="text-slate-faint">Export a backup first if you are unsure.</p>
            </>
          ) : (
            <>
              <p>Archived presets stay in your library but disappear from the default view.</p>
              <p className="text-slate-faint">You can restore them at any time with the Archived filter.</p>
            </>
          )
        }
        confirmLabel={confirmAction?.type === 'delete' ? 'Delete preset' : 'Archive'}
        tone={confirmAction?.type === 'delete' ? 'danger' : 'primary'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction;
          setConfirmAction(null);
          if (!action) return;
          if (action.type === 'delete') await remove(action.preset);
          if (action.type === 'archive') await archive(action.preset);
          if (action.type === 'bulk-archive') {
            const updates = selectedPresets.map((preset) => ({
              ...preset,
              is_archived: true,
              updated_at: nowIso(),
            }));
            await upsertPresets(updates);
            setSelectedIds([]);
            toast(`${pluralize(updates.length, 'preset')} archived`, { tone: 'success' });
          }
        }}
      />
    </div>
  );
}
