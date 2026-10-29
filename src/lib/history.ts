import type { ContentIdea, IdeaVersion } from './types';

/**
 * Readiness history.
 *
 * Every saved review records the score next to the version it was taken from,
 * so you can see whether a revision actually moved the heuristic. The scores are
 * the same transparent rubric used everywhere else — this file only orders them.
 */

export interface ReadinessPoint {
  at: string;
  label: string;
  score: number;
  source: 'local-heuristic' | 'ai';
  versionId: string | null;
}

export interface ReadinessTrend {
  points: ReadinessPoint[];
  latest: ReadinessPoint | null;
  previous: ReadinessPoint | null;
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | 'none';
  summary: string;
}

/** Extract every scored review from an idea, oldest first. */
export function readinessHistory(idea: ContentIdea): ReadinessPoint[] {
  const points: ReadinessPoint[] = [];

  for (const version of idea.versions ?? []) {
    if (typeof version.readiness_score === 'number' && Number.isFinite(version.readiness_score)) {
      points.push({
        at: version.created_at,
        label: version.label,
        score: Math.round(version.readiness_score),
        source: version.readiness_source ?? 'local-heuristic',
        versionId: version.id,
      });
    }
  }

  const current = idea.coach_assessment;
  if (current) {
    points.push({
      at: current.generated_at,
      label: 'Current review',
      score: Math.round(current.readiness.score),
      source: current.source,
      versionId: null,
    });
  }

  return points
    .filter((point, index, all) => all.findIndex((other) => other.at === point.at && other.score === point.score) === index)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function readinessTrend(idea: ContentIdea): ReadinessTrend {
  const points = readinessHistory(idea);
  const latest = points[points.length - 1] ?? null;
  const previous = points[points.length - 2] ?? null;
  const delta = latest && previous ? latest.score - previous.score : null;
  const direction = delta === null ? 'none' : delta > 2 ? 'up' : delta < -2 ? 'down' : 'flat';

  const summary =
    delta === null
      ? points.length === 1
        ? 'One review so far. Save another after a revision to see movement.'
        : 'No reviews saved yet. Run the local check to start a history.'
      : direction === 'up'
        ? `Up ${delta} points since “${previous!.label}”.`
        : direction === 'down'
          ? `Down ${Math.abs(delta)} points since “${previous!.label}” — check which component dropped.`
          : `Essentially unchanged (${delta >= 0 ? '+' : ''}${delta}) since “${previous!.label}”.`;

  return { points, latest, previous, delta, direction, summary };
}

/** Attach a score to the newest version so the history has a data point. */
export function scoreLatestVersion(
  versions: IdeaVersion[] | undefined,
  score: number,
  source: 'local-heuristic' | 'ai',
): IdeaVersion[] {
  const list = versions ?? [];
  if (!list.length) return list;
  return list.map((version, index) =>
    index === 0
      ? { ...version, readiness_score: Math.round(score), readiness_source: source }
      : version,
  );
}

/** Small sparkline-ready series: score normalised to 0–100 at each point. */
export function sparklinePath(points: ReadinessPoint[], width: number, height: number): string {
  if (points.length < 2) return '';
  const stepX = width / (points.length - 1);
  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - (Math.max(0, Math.min(100, point.score)) / 100) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}
