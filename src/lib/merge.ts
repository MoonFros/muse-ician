import type { RecordKind, WorkspaceData, WorkspacePayload } from './types';
import { planImport } from './importPlan';
import { RECORD_COLLECTIONS } from './validation';

/**
 * Collaborator merge review.
 *
 * A "duo workspace" without a server: hand a backup to a collaborator, get one
 * back, and see exactly what would change before you accept it. Nothing is
 * overwritten until you pick a strategy, and the review never hides a conflict.
 */

export interface MergeRow {
  collection: RecordKind;
  collectionLabel: string;
  incoming: number;
  existing: number;
  conflicts: number;
  added: number;
  replaced: number;
  skipped: number;
  /** Titles of the first few conflicting records, so you can judge them. */
  conflictSamples: { id: string; existingTitle: string; incomingTitle: string }[];
}

export interface MergeReview {
  rows: MergeRow[];
  totals: { incoming: number; conflicts: number; added: number; replaced: number; skipped: number };
  danglingReferences: { collection: RecordKind; id: string; field: string; message: string }[];
  headline: string;
  safeToApply: boolean;
}

export const COLLECTION_LABELS: Record<RecordKind, string> = {
  presets: 'Presets',
  songs: 'Songs',
  content_ideas: 'Ideas',
  metadata_packages: 'Metadata',
  campaigns: 'Campaigns',
  planned_posts: 'Planned posts',
  trends: 'Trends',
  performance_records: 'Results',
};

export function buildMergeReview(
  incoming: WorkspacePayload,
  current: WorkspaceData,
  strategy: 'skip' | 'replace' | 'new-id' = 'skip',
): MergeReview {
  const plan = planImport(incoming, current, strategy);
  const rows: MergeRow[] = [];

  for (const collection of RECORD_COLLECTIONS) {
    const counts = plan.counts[collection];
    const conflicts = plan.conflicts.filter((conflict) => conflict.collection === collection);
    rows.push({
      collection,
      collectionLabel: COLLECTION_LABELS[collection],
      incoming: counts.incoming,
      existing: (current[collection] ?? []).length,
      conflicts: conflicts.length,
      added: counts.adding,
      replaced: counts.replacing,
      skipped: counts.skipping,
      conflictSamples: conflicts.slice(0, 4).map((conflict) => ({
        id: conflict.id,
        existingTitle: conflict.existingTitle,
        incomingTitle: conflict.incomingTitle,
      })),
    });
  }

  const totals = rows.reduce(
    (acc, row) => ({
      incoming: acc.incoming + row.incoming,
      conflicts: acc.conflicts + row.conflicts,
      added: acc.added + row.added,
      replaced: acc.replaced + row.replaced,
      skipped: acc.skipped + row.skipped,
    }),
    { incoming: 0, conflicts: 0, added: 0, replaced: 0, skipped: 0 },
  );

  const headline = totals.incoming
    ? `${totals.incoming} record${totals.incoming === 1 ? '' : 's'} in this file · ${totals.added} new · ${totals.conflicts} matching an existing id · ${totals.skipped} skipped under the current strategy.`
    : 'That file has no records to merge.';

  return {
    rows: rows.filter((row) => row.incoming > 0 || row.existing > 0),
    totals,
    danglingReferences: plan.danglingReferences.map((reference) => ({
      collection: reference.collection,
      id: reference.id,
      field: reference.field,
      message: reference.message,
    })),
    headline,
    safeToApply: totals.incoming > 0,
  };
}

/** A short, human-readable report you can paste into a chat with your collaborator. */
export function mergeReviewToText(review: MergeReview, context: { incomingName: string; currentName: string }): string {
  const lines = [
    `Merge review — ${context.incomingName} into ${context.currentName}`,
    review.headline,
    '',
  ];
  for (const row of review.rows) {
    if (!row.incoming && !row.existing) continue;
    lines.push(
      `${row.collectionLabel}: ${row.incoming} incoming, ${row.existing} existing, ${row.conflicts} conflict${row.conflicts === 1 ? '' : 's'}`,
    );
    for (const sample of row.conflictSamples) {
      lines.push(`  · ${sample.existingTitle} ↔ ${sample.incomingTitle}`);
    }
  }
  if (review.danglingReferences.length) {
    lines.push('', 'References that would break:');
    for (const reference of review.danglingReferences.slice(0, 10)) {
      lines.push(`  · ${reference.collection}/${reference.id}: ${reference.message}`);
    }
  }
  return lines.join('\n');
}
