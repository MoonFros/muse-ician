import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  ComponentBar,
  EmptyState,
  PageHeader,
  ScoreMeter,
  SearchField,
  SectionCard,
  SegmentedControl,
  StatusBadge,
} from '../components/ui/primitives';
import { Select } from '../components/ui/forms';
import type { ContentIdea } from '../lib/types';
import { RUBRIC_DEFINITION, buildLocalAssessment, scoreIdea } from '../lib/analysis';
import { relativeTime, truncate } from '../lib/utils';

export default function CreativeCoachPage() {
  const { data, integrations, upsertIdeas } = useWorkspace();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'open' | 'all'>('open');
  const [sort, setSort] = useState<'lowest' | 'highest' | 'recent'>('lowest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const scored = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.content_ideas
      .filter((idea) => (scope === 'open' ? !['archived'].includes(idea.status) : true))
      .filter((idea) =>
        term ? `${idea.title} ${idea.hook} ${idea.concept_description}`.toLowerCase().includes(term) : true,
      )
      .map((idea) => {
        const preset = data.presets.find((item) => item.id === idea.source_preset_id) ?? null;
        const song = data.songs.find((item) => item.id === idea.song_id) ?? null;
        return {
          idea,
          preset,
          song,
          score: scoreIdea({ idea, preset, song, preferences: data.preferences }),
        };
      })
      .sort((a, b) => {
        if (sort === 'highest') return b.score.score - a.score.score;
        if (sort === 'recent') return b.idea.updated_at.localeCompare(a.idea.updated_at);
        return a.score.score - b.score.score;
      });
  }, [data.content_ideas, data.preferences, data.presets, data.songs, query, scope, sort]);

  const selected = scored.find((entry) => entry.idea.id === selectedId) ?? scored[0] ?? null;

  const runReview = async (idea: ContentIdea) => {
    setBusyId(idea.id);
    try {
      const preset = data.presets.find((item) => item.id === idea.source_preset_id) ?? null;
      const song = data.songs.find((item) => item.id === idea.song_id) ?? null;
      const assessment = buildLocalAssessment(idea, preset, song, data.preferences);
      await upsertIdeas([{ ...idea, coach_assessment: assessment, updated_at: new Date().toISOString() }]);
      toast('Local review saved', {
        tone: 'success',
        description: 'Rubric-based, generated in this browser. No AI provider was used.',
      });
    } catch {
      toast('The review could not be saved', { tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Creative Coach"
        title="Evaluate before you film"
        description="A transparent editorial check on hook strength, song fit, audience clarity, pacing and feasibility. The score is a checklist, not a prediction."
        actions={
          <Link to="/library?pick=1" className="btn-primary">
            <Icon name="plus" size={15} />
            New idea
          </Link>
        }
      />

      {data.content_ideas.length === 0 ? (
        <EmptyState
          icon="coach"
          title="Nothing to assess yet"
          description="Create a content idea from a preset first. The coach works from a written concept — it will not invent one for you."
          actions={
            <Link to="/library?pick=1" className="btn-primary btn-sm">
              Browse the preset library
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchField
                value={query}
                onChange={setQuery}
                label="Search ideas"
                placeholder="Search ideas by title, hook or concept…"
                className="flex-1"
              />
              <SegmentedControl
                ariaLabel="Idea scope"
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'open', label: 'In progress' },
                  { value: 'all', label: 'All' },
                ]}
              />
              <Select
                aria-label="Sort by readiness"
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                options={[
                  { value: 'lowest', label: 'Weakest first' },
                  { value: 'highest', label: 'Strongest first' },
                  { value: 'recent', label: 'Recently edited' },
                ]}
                small
                className="w-40"
              />
            </div>

            {scored.length === 0 ? (
              <EmptyState
                compact
                icon="search"
                title="No ideas match"
                description="Try a shorter search, or switch to “All” to include published and archived ideas."
              />
            ) : (
              <ul className="space-y-2">
                {scored.map(({ idea, score, song }) => {
                  const active = selected?.idea.id === idea.id;
                  return (
                    <li key={idea.id}>
                      <div
                        className={`rounded-xl border transition-colors ${
                          active ? 'border-accent/40 bg-accent-dim/20' : 'border-ink-700/70 bg-ink-850/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(idea.id)}
                          className="flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left"
                          aria-pressed={active}
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-ink-900 text-xs font-semibold text-slate-text">
                            {score.score}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm text-slate-text">{idea.title}</span>
                              <StatusBadge status={idea.status} />
                              {idea.coach_assessment ? (
                                <span className="chip border-ok/30 text-ok">
                                  {idea.coach_assessment.source === 'ai' ? 'AI review' : 'Local review'}
                                </span>
                              ) : (
                                <span className="chip border-ink-600 text-slate-faint">Not reviewed</span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-faint">
                              {song ? song.title : 'No song linked'} · {relativeTime(idea.updated_at)}
                            </span>
                            <span className="mt-1 block truncate text-2xs text-slate-muted">
                              {truncate(idea.hook || idea.concept_description || 'No hook yet', 120)}
                            </span>
                          </span>
                          <Icon name="chevron-right" size={16} className="mt-1 shrink-0 text-slate-faint" />
                        </button>
                        <div className="flex flex-wrap items-center gap-2 border-t border-ink-700/60 px-3.5 py-2">
                          <Link to={`/ideas/${idea.id}?tab=coach`} className="btn-secondary btn-sm">
                            Open coach tab
                          </Link>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => runReview(idea)}
                            disabled={busyId === idea.id}
                          >
                            {busyId === idea.id ? 'Reviewing…' : 'Save local review'}
                          </button>
                          <Link to={`/ideas/${idea.id}`} className="btn-ghost btn-sm">
                            Edit plan
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            {selected ? (
              <SectionCard
                title="Readiness breakdown"
                description={truncate(selected.idea.title, 60)}
              >
                <ScoreMeter
                  score={selected.score.score}
                  caption={`${selected.score.confidence} confidence · ${selected.score.rubric_version}`}
                />
                <div className="mt-4 space-y-2.5">
                  {selected.score.components.map((component) => (
                    <ComponentBar
                      key={component.key}
                      label={component.label}
                      score={component.score}
                      explanation={component.explanation}
                    />
                  ))}
                </div>
                {selected.idea.coach_assessment ? (
                  <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
                    <p className="text-2xs uppercase tracking-wide text-slate-faint">Saved review</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-muted">
                      {truncate(selected.idea.coach_assessment.summary, 220)}
                    </p>
                    <Link to={`/ideas/${selected.idea.id}?tab=coach`} className="btn-secondary btn-sm mt-2">
                      Read the full assessment
                    </Link>
                  </div>
                ) : (
                  <Callout tone="neutral">
                    No assessment saved yet. Run it from the idea’s coach tab to keep strengths, weaknesses and
                    suggested improvements with the record.
                  </Callout>
                )}
              </SectionCard>
            ) : null}

            <SectionCard title="How the score works">
              <ul className="space-y-2.5 text-2xs leading-relaxed text-slate-muted">
                {RUBRIC_DEFINITION.map((item) => (
                  <li key={item.key}>
                    <p className="text-xs font-medium text-slate-text">
                      {item.label} · {Math.round(item.weight * 100)}%
                    </p>
                    <p className="mt-0.5">{item.description}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-ink-700/60 pt-3 text-2xs leading-relaxed text-slate-faint">
                Scores are computed locally from the fields you filled in. Missing information lowers confidence rather
                than adding points. Nothing here predicts views or virality.
              </p>
            </SectionCard>

            <SectionCard title="AI review">
              {integrations?.ai.configured ? (
                <p className="text-xs leading-relaxed text-slate-muted">
                  A provider is configured ({integrations.ai.provider}
                  {integrations.ai.model ? ` · ${integrations.ai.model}` : ''}). Open an idea’s coach tab to request a
                  full AI assessment, including a revised concept that preserves your original intention.
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-slate-muted">
                  No AI provider is configured, so AI reviews are unavailable. The local review uses the same rubric and
                  works entirely offline. Setup instructions are in Settings → Integrations.
                </p>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
