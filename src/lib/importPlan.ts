import type { WorkspaceData, WorkspacePayload } from './types';
import { nowIso } from './utils';
import { RECORD_COLLECTIONS, type RecordCollection } from './validation';

export type DuplicateStrategy = 'skip' | 'replace' | 'new-id';

export interface ImportConflict {
  collection: RecordCollection;
  id: string;
  existingTitle: string;
  incomingTitle: string;
}

export interface DanglingReference {
  collection: RecordCollection;
  id: string;
  field: string;
  missingId: string;
  message: string;
}

export interface ImportPreviewItem {
  collection: RecordCollection;
  id: string;
  title: string;
  status: 'new' | 'conflict' | 'replace' | 'skip' | 'renamed';
  label?: string;
}

export interface ImportPlan {
  strategy: DuplicateStrategy;
  counts: Record<RecordCollection, { incoming: number; adding: number; replacing: number; skipping: number }>;
  conflicts: ImportConflict[];
  danglingReferences: DanglingReference[];
  preview: ImportPreviewItem[];
  /** Collections ready to merge, after duplicate handling. */
  changes: Partial<Record<RecordCollection, unknown[]>>;
  deletes: Partial<Record<RecordCollection, string[]>>;
  preferences?: WorkspacePayload['preferences'];
}

type AnyRecord = { id: string } & Record<string, unknown>;

function titleOf(record: AnyRecord): string {
  const candidates = ['title', 'name', 'caption'];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return record.id;
}

function existingIndex(collection: RecordCollection, data: WorkspaceData): Map<string, AnyRecord> {
  const list = (data[collection] ?? []) as unknown as AnyRecord[];
  return new Map(list.map((record) => [record.id, record]));
}

function incomingList(payload: WorkspacePayload, collection: RecordCollection): AnyRecord[] {
  return ((payload[collection] ?? []) as unknown as AnyRecord[]) ?? [];
}

/** References that matter for a safe import. */
const REFERENCE_FIELDS: Partial<
  Record<RecordCollection, { field: string; target: RecordCollection; label: string }[]>
> = {
  content_ideas: [
    { field: 'song_id', target: 'songs', label: 'song' },
    { field: 'source_preset_id', target: 'presets', label: 'source preset' },
    { field: 'campaign_id', target: 'campaigns', label: 'campaign' },
  ],
  metadata_packages: [
    { field: 'content_idea_id', target: 'content_ideas', label: 'content idea' },
    { field: 'song_id', target: 'songs', label: 'song' },
  ],
  planned_posts: [
    { field: 'content_idea_id', target: 'content_ideas', label: 'content idea' },
    { field: 'song_id', target: 'songs', label: 'song' },
    { field: 'campaign_id', target: 'campaigns', label: 'campaign' },
    { field: 'metadata_package_id', target: 'metadata_packages', label: 'metadata package' },
  ],
  campaigns: [{ field: 'song_id', target: 'songs', label: 'song' }],
  performance_records: [
    { field: 'song_id', target: 'songs', label: 'song' },
    { field: 'content_idea_id', target: 'content_ideas', label: 'content idea' },
    { field: 'planned_post_id', target: 'planned_posts', label: 'planned post' },
  ],
  trends: [{ field: 'song_id', target: 'songs', label: 'song' }],
};

/**
 * Work out exactly what an import would do before touching stored data.
 * Duplicate ids are never silently overwritten: the caller chooses a strategy.
 */
export function planImport(
  payload: WorkspacePayload,
  current: WorkspaceData,
  strategy: DuplicateStrategy,
): ImportPlan {
  const plan: ImportPlan = {
    strategy,
    counts: {} as ImportPlan['counts'],
    conflicts: [],
    danglingReferences: [],
    preview: [],
    changes: {},
    deletes: {},
  };

  const idMap = new Map<string, string>(); // `${collection}:${oldId}` -> newId
  const addedIds = new Map<RecordCollection, Set<string>>();
  for (const collection of RECORD_COLLECTIONS) addedIds.set(collection, new Set());

  for (const collection of RECORD_COLLECTIONS) {
    const existing = existingIndex(collection, current);
    const incoming = incomingList(payload, collection);
    const counts = { incoming: incoming.length, adding: 0, replacing: 0, skipping: 0 };
    const changes: AnyRecord[] = [];
    const deletes: string[] = [];

    for (const record of incoming) {
      const originalId = record.id;
      const existingRecord = existing.get(originalId);
      const title = titleOf(record);

      if (existingRecord) {
        plan.conflicts.push({
          collection,
          id: originalId,
          existingTitle: titleOf(existingRecord),
          incomingTitle: title,
        });
        if (strategy === 'skip') {
          counts.skipping += 1;
          plan.preview.push({ collection, id: originalId, title, status: 'skip' });
          continue;
        }
        if (strategy === 'replace') {
          counts.replacing += 1;
          changes.push({ ...record });
          plan.preview.push({ collection, id: originalId, title, status: 'replace' });
          continue;
        }
        // new-id
        const newIdValue = `${originalId}-copy-${Math.random().toString(36).slice(2, 7)}`;
        idMap.set(`${collection}:${originalId}`, newIdValue);
        changes.push({ ...record, id: newIdValue });
        counts.adding += 1;
        addedIds.get(collection)!.add(newIdValue);
        plan.preview.push({ collection, id: newIdValue, title, status: 'renamed' });
        continue;
      }

      changes.push({ ...record });
      counts.adding += 1;
      addedIds.get(collection)!.add(originalId);
      plan.preview.push({ collection, id: originalId, title, status: 'new' });
    }

    plan.counts[collection] = counts;
    if (changes.length) plan.changes[collection] = changes;
    if (deletes.length) plan.deletes[collection] = deletes;
  }

  // Remap references when duplicate handling created new ids.
  if (idMap.size > 0) {
    for (const collection of RECORD_COLLECTIONS) {
      const changes = plan.changes[collection] as AnyRecord[] | undefined;
      if (!changes) continue;
      const fields = REFERENCE_FIELDS[collection] ?? [];
      for (const record of changes) {
        for (const { field } of fields) {
          const value = record[field];
          if (typeof value !== 'string') continue;
          const target = FIELD_TARGET[field];
          if (!target) continue;
          const replacement = idMap.get(`${target}:${value}`);
          if (replacement) record[field] = replacement;
        }
      }
    }
  }

  // Dangling reference detection: only flag references that resolve to nothing,
  // either in this file or in the existing workspace.
  for (const collection of RECORD_COLLECTIONS) {
    const incoming = incomingList(payload, collection);
    const fields = REFERENCE_FIELDS[collection] ?? [];
    for (const record of incoming) {
      for (const { field, target, label } of fields) {
        const value = record[field];
        if (typeof value !== 'string' || !value) continue;
        const inWorkspace = existingIndex(target, current).has(value);
        const inFile = incomingList(payload, target).some((candidate) => candidate.id === value);
        const renamedTo = idMap.get(`${target}:${value}`);
        if (!inWorkspace && !inFile && !renamedTo) {
          plan.danglingReferences.push({
            collection,
            id: record.id,
            field,
            missingId: value,
            message: `${titleOf(record)} references a ${label} (${value}) that is neither in this file nor in your workspace. The idea will be imported without a linked ${label}.`,
          });
        }
      }
    }
  }

  return plan;
}

const FIELD_TARGET: Record<string, RecordCollection> = {
  song_id: 'songs',
  content_idea_id: 'content_ideas',
  campaign_id: 'campaigns',
  planned_post_id: 'planned_posts',
  metadata_package_id: 'metadata_packages',
  source_preset_id: 'presets',
};

/** Merge a plan into the current workspace, preserving everything not in the plan. */
export function applyImportPlan(plan: ImportPlan, current: WorkspaceData): WorkspaceData {
  const next: WorkspaceData = {
    presets: [...current.presets],
    songs: [...current.songs],
    content_ideas: [...current.content_ideas],
    metadata_packages: [...current.metadata_packages],
    campaigns: [...current.campaigns],
    planned_posts: [...current.planned_posts],
    trends: [...current.trends],
    performance_records: [...current.performance_records],
    preferences: { ...current.preferences },
  };

  for (const collection of RECORD_COLLECTIONS) {
    const changes = plan.changes[collection] as AnyRecord[] | undefined;
    if (!changes?.length) continue;
    const byId = new Map(
      ((next[collection] ?? []) as unknown as AnyRecord[]).map((record) => [record.id, record]),
    );
    for (const record of changes) byId.set(record.id, record);
    (next[collection] as unknown[]) = [...byId.values()];
  }

  if (plan.preferences) {
    next.preferences = { ...next.preferences, ...plan.preferences, updated_at: nowIso() };
  }

  return next;
}

export function importSummary(plan: ImportPlan): string {
  const parts: string[] = [];
  const labels: Record<RecordCollection, [string, string]> = {
    presets: ['preset', 'presets'],
    songs: ['song', 'songs'],
    content_ideas: ['idea', 'ideas'],
    metadata_packages: ['metadata package', 'metadata packages'],
    campaigns: ['campaign', 'campaigns'],
    planned_posts: ['planned post', 'planned posts'],
    trends: ['trend record', 'trend records'],
    performance_records: ['performance record', 'performance records'],
  };
  for (const collection of RECORD_COLLECTIONS) {
    const counts = plan.counts[collection];
    if (!counts || counts.incoming === 0) continue;
    const added = counts.adding;
    const replaced = counts.replacing;
    const skipped = counts.skipping;
    const bits: string[] = [];
    if (added) bits.push(`added ${added}`);
    if (replaced) bits.push(`replaced ${replaced}`);
    if (skipped) bits.push(`skipped ${skipped}`);
    if (!bits.length) continue;
    const [singular, plural] = labels[collection];
    parts.push(`${bits.join(', ')} ${added + replaced === 1 ? singular : plural}`);
  }
  return parts.length ? parts.join(' · ') : 'Nothing to import';
}
