import type { ContentIdea } from '../../lib/types';
import { readinessTrend, sparklinePath } from '../../lib/history';
import { EmptyState, SectionCard } from '../ui/primitives';

const WIDTH = 320;
const HEIGHT = 72;

/** Readiness over revisions: every saved review becomes a point. */
export function ReadinessHistory({ idea }: { idea: ContentIdea }) {
  const trend = readinessTrend(idea);
  const { points } = trend;
  const path = sparklinePath(points, WIDTH, HEIGHT);

  return (
    <SectionCard
      title="Readiness history"
      description="Each saved review is recorded against the version it graded, so revisions can be compared."
    >
      {points.length === 0 ? (
        <EmptyState
          compact
          icon="chart"
          title="No reviews yet"
          description="Run the local check or an AI review, then save a restore point. Scores will appear here over time."
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            {path ? (
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-20 w-full"
                role="img"
                aria-label={`Readiness went from ${points[0]!.score} to ${points[points.length - 1]!.score} across ${points.length} reviews`}
              >
                <defs>
                  <linearGradient id="readiness-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7b6bff" />
                    <stop offset="100%" stopColor="#3fdcff" />
                  </linearGradient>
                  <linearGradient id="readiness-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7b6bff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7b6bff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${path} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`} fill="url(#readiness-fill)" />
                <path d={path} fill="none" stroke="url(#readiness-line)" strokeWidth="2" strokeLinecap="round" />
                {points.map((point, index) => {
                  const x = (index / Math.max(1, points.length - 1)) * WIDTH;
                  const y = HEIGHT - (Math.max(0, Math.min(100, point.score)) / 100) * HEIGHT;
                  return <circle key={`${point.at}-${index}`} cx={x} cy={y} r="3" fill="#e8e9ff" />;
                })}
              </svg>
            ) : (
              <p className="text-2xs text-slate-faint">One review so far — the line appears once there are two.</p>
            )}
            <p className="mt-1 text-xs text-slate-muted">{trend.summary}</p>
          </div>

          <ol className="space-y-1.5">
            {[...points].reverse().map((point) => (
              <li
                key={`${point.at}-${point.label}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-text">{point.label}</p>
                  <p className="text-2xs text-slate-faint">
                    {new Date(point.at).toLocaleString()} · {point.source === 'ai' ? 'AI review' : 'local heuristic'}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-white">{point.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
        A rising score means the idea answers more of the rubric more clearly. It is not a prediction of views.
      </p>
    </SectionCard>
  );
}
