import { useMemo, useState } from 'react';
import type { ContentIdea, Preset, Song } from '../../lib/types';
import {
  buildReuseDrafts,
  REUSE_FORMAT_LABELS,
  reuseDraftsToText,
  type ReuseDraft,
  type ReuseFormat,
} from '../../lib/reuse';
import { CopyButton, SectionCard } from '../ui/primitives';

/**
 * Reuse panel: turn a finished idea into the other surfaces it can feed.
 * Everything is derived from text you already wrote; nothing is invented.
 */
export function ReusePanel({ idea, song, preset }: { idea: ContentIdea; song: Song | null; preset: Preset | null }) {
  const drafts = useMemo(() => buildReuseDrafts({ idea, song, preset }), [idea, song, preset]);
  const [active, setActive] = useState<ReuseFormat>(drafts[0]?.format ?? 'x-post');
  const current: ReuseDraft | undefined = drafts.find((draft) => draft.format === active) ?? drafts[0];

  return (
    <SectionCard
      title="Reuse this idea"
      description="One video, several surfaces. Drafts are generated from your own words — edit them before posting."
      actions={<CopyButton getText={() => reuseDraftsToText(drafts, { ideaTitle: idea.title })} label="Copy all" />}
    >
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Reuse formats">
        {drafts.map((draft) => {
          const selected = draft.format === current?.format;
          return (
            <button
              key={draft.format}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(draft.format)}
              className={`rounded-full border px-2.5 py-1 text-2xs font-medium transition-all duration-200 ${
                selected
                  ? 'border-accent/50 bg-accent-dim text-white'
                  : 'border-white/[0.08] text-slate-muted hover:border-white/20 hover:text-slate-text'
              }`}
            >
              {REUSE_FORMAT_LABELS[draft.format]}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-white">{current.label}</p>
            <div className="flex items-center gap-2">
              {current.limit ? (
                <span className={`text-2xs ${current.overLimit ? 'text-danger' : 'text-slate-faint'}`}>
                  {current.chars}/{current.limit.limit} {current.limit.label.toLowerCase()}
                </span>
              ) : (
                <span className="text-2xs text-slate-faint">{current.chars} chars</span>
              )}
              <CopyButton text={current.body} label="Copy" />
            </div>
          </div>

          {current.subject ? (
            <p className="mt-2 text-xs text-slate-muted">
              <span className="text-slate-faint">Subject: </span>
              {current.subject}
            </p>
          ) : null}

          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.06] bg-black/30 p-3 font-sans text-xs leading-relaxed text-slate-text scroll-thin">
            {current.body}
          </pre>

          {current.notes.length ? (
            <ul className="mt-2 space-y-1">
              {current.notes.map((note) => (
                <li key={note} className="text-2xs leading-relaxed text-slate-faint">
                  · {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
        Derived from this idea{current?.derivedFrom.length ? ` (${current.derivedFrom.join(', ')})` : ''}. Reusing a post
        does not promise it will perform like the original — your own logged results are the only evidence that counts.
      </p>
    </SectionCard>
  );
}
