import { useMemo } from 'react';
import type { WorkspaceData, WorkspacePayload } from '../../lib/types';
import type { DuplicateStrategy } from '../../lib/importPlan';
import { buildMergeReview, mergeReviewToText } from '../../lib/merge';
import { CopyButton } from '../ui/primitives';

/**
 * Merge review for collaborator backups: a per-collection diff before anything
 * is written, plus a copyable summary you can send back to the other person.
 */
export function MergeReview({ payload, current, strategy }: { payload: WorkspacePayload; current: WorkspaceData; strategy: DuplicateStrategy }) {
  const review = useMemo(() => buildMergeReview(payload, current, strategy), [payload, current, strategy]);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-white">Merge review</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-muted">{review.headline}</p>
        </div>
        <CopyButton
          getText={() => mergeReviewToText(review, { incomingName: 'imported file', currentName: 'this workspace' })}
          label="Copy report"
          className="btn-ghost btn-sm"
        />
      </div>

      <div className="mt-3 overflow-x-auto scroll-thin">
        <table className="w-full min-w-[520px] border-collapse text-left text-xs">
          <caption className="sr-only">Incoming records compared with the current workspace, per collection</caption>
          <thead>
            <tr className="border-b border-white/[0.08] text-2xs uppercase tracking-[0.1em] text-slate-faint">
              <th scope="col" className="py-1.5 pr-3 font-medium">Collection</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Yours</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Incoming</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">New</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">Conflicts</th>
              <th scope="col" className="py-1.5 text-right font-medium">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {review.rows.map((row) => (
              <tr key={row.collection} className="border-b border-white/[0.05]">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-slate-text">
                  {row.collectionLabel}
                  {row.conflictSamples.length ? (
                    <span className="mt-0.5 block text-2xs text-slate-faint">
                      e.g. {row.conflictSamples[0]!.existingTitle} ↔ {row.conflictSamples[0]!.incomingTitle}
                    </span>
                  ) : null}
                </th>
                <td className="py-1.5 pr-3 text-right tabular-nums text-slate-muted">{row.existing}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-slate-text">{row.incoming}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-ok">{row.added}</td>
                <td className={`py-1.5 pr-3 text-right tabular-nums ${row.conflicts ? 'text-warn' : 'text-slate-faint'}`}>
                  {row.conflicts}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-faint">{row.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-2xs leading-relaxed text-slate-faint">
        This is what would change with the strategy you chose above. Nothing has been written yet — press the import
        button to apply it.
      </p>
    </div>
  );
}
