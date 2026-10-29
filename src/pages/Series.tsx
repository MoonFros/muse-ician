import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import { Callout, EmptyState, PageHeader, SectionCard } from '../components/ui/primitives';
import { Field, Select, TextInput } from '../components/ui/forms';
import {
  SERIES_SHAPES,
  SERIES_SHAPE_DESCRIPTIONS,
  SERIES_SHAPE_LABELS,
  buildSeriesPlan,
  materializeSeries,
  seriesCampaign,
} from '../lib/series';
import type { SeriesShape } from '../lib/series';
import { formatShortDate, toDateKey, truncate } from '../lib/utils';

export default function SeriesPage() {
  const { data, upsertIdeas, upsertPosts, upsertCampaigns } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const presets = useMemo(
    () => data.presets.filter((preset) => !preset.is_archived),
    [data.presets],
  );

  const [presetId, setPresetId] = useState(presets[0]?.id ?? '');
  const [songId, setSongId] = useState('');
  const [shape, setShape] = useState<SeriesShape>('teaser-arc');
  const [parts, setParts] = useState('4');
  const [startDate, setStartDate] = useState(toDateKey());
  const [cadence, setCadence] = useState('2');
  const [saving, setSaving] = useState(false);

  const preset = presets.find((item) => item.id === presetId) ?? null;
  const song = data.songs.find((item) => item.id === songId) ?? null;

  const plan = useMemo(() => {
    if (!preset) return null;
    return buildSeriesPlan({
      preset,
      song,
      shape,
      parts: Number(parts) || 4,
      startDate,
      cadenceDays: Number(cadence) || 2,
    });
  }, [preset, song, shape, parts, startDate, cadence]);

  const save = async () => {
    if (!plan || !preset) return;
    setSaving(true);
    try {
      const output = materializeSeries(plan, preset, song);
      const campaign = seriesCampaign({ plan, song });
      await upsertCampaigns([campaign]);
      // Link the ideas to the campaign id that was actually persisted.
      const ideas = output.ideas.map((idea) => ({ ...idea, campaign_id: campaign.id }));
      const posts = output.posts.map((post) => ({ ...post, campaign_id: campaign.id }));
      await upsertIdeas(ideas);
      await upsertPosts(posts);
      toast(`${plan.parts.length}-part series saved`, {
        tone: 'success',
        description: 'Ideas are in the library and each part has a calendar entry. Nothing is published automatically.',
      });
      navigate(song ? `/songs/${song.id}` : '/calendar');
    } catch {
      toast('The series could not be saved', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!presets.length) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Series planner" title="Turn one preset into an arc" />
        <EmptyState
          icon="library"
          title="No presets available"
          description="Restore the starter presets in Settings to build a series."
          actions={
            <Link to="/settings" className="btn-primary btn-sm">
              Open settings
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Series planner"
        title="One idea, several parts"
        description="Build a 3–5 part arc where every part has a different job. Parts are saved as ideas with calendar entries you post yourself."
        actions={
          <button type="button" className="btn-primary" onClick={save} disabled={!plan || saving}>
            <Icon name="sparkle" size={15} />
            {saving ? 'Saving…' : 'Save series'}
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-4">
          <SectionCard title="Series setup" description="Pick the source format, the arc shape and the pacing.">
            <div className="space-y-3">
              <Field label="Source preset" hint="The video format every part is built from.">
                <Select
                  value={presetId}
                  onChange={(event) => setPresetId(event.target.value)}
                  options={presets.map((item) => ({ value: item.id, label: item.title }))}
                  aria-label="Source preset"
                />
              </Field>

              <Field label="Song" hint="Optional, but a series reads better tied to one song.">
                <Select
                  value={songId}
                  onChange={(event) => setSongId(event.target.value)}
                  placeholder="No song — generic series"
                  options={data.songs.map((item) => ({ value: item.id, label: item.title }))}
                  aria-label="Song"
                />
              </Field>

              <Field label="Arc shape">
                <div className="grid gap-1.5">
                  {SERIES_SHAPES.map((value) => {
                    const active = value === shape;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setShape(value)}
                        aria-pressed={active}
                        className={`rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                          active
                            ? 'border-accent/50 bg-accent-dim/40'
                            : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'
                        }`}
                      >
                        <span className="block text-sm text-slate-text">{SERIES_SHAPE_LABELS[value]}</span>
                        <span className="block text-2xs leading-relaxed text-slate-faint">
                          {SERIES_SHAPE_DESCRIPTIONS[value]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Parts" hint="3 to 5.">
                  <TextInput
                    type="number"
                    min={3}
                    max={5}
                    value={parts}
                    onChange={(event) => setParts(event.target.value)}
                    aria-label="Number of parts"
                  />
                </Field>
                <Field label="Gap in days">
                  <TextInput
                    type="number"
                    min={1}
                    max={14}
                    value={cadence}
                    onChange={(event) => setCadence(event.target.value)}
                    aria-label="Days between parts"
                  />
                </Field>
              </div>

              <Field label="First part goes out on">
                <TextInput
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  aria-label="First part date"
                />
              </Field>
            </div>
          </SectionCard>

          <Callout tone="neutral" title="What this is not">
            A series is structure, not a growth trick. Length, pacing and platform limits still apply, and nothing here
            is published or scheduled automatically.
          </Callout>
        </div>

        <div className="space-y-4">
          <SectionCard
            title={plan ? plan.title : 'Series preview'}
            description={plan ? plan.summary : undefined}
            actions={
              plan ? (
                <span className="chip">{plan.parts.length} parts</span>
              ) : undefined
            }
          >
            {plan ? (
              <ol className="space-y-2.5">
                {plan.parts.map((part) => (
                  <li
                    key={part.index}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.14]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-dim text-2xs font-semibold text-accent-soft">
                          {part.index}
                        </span>
                        <span className="chip">{part.roleLabel}</span>
                      </div>
                      <span className="text-2xs text-slate-faint">
                        {formatShortDate(part.scheduledDate)} · ~{part.suggestedLengthSeconds}s
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-text">{part.title}</p>
                    <p className="mt-1 text-2xs leading-relaxed text-slate-muted">
                      <span className="text-slate-faint">Goal · </span>
                      {part.goal}
                    </p>
                    <p className="mt-1 text-2xs leading-relaxed text-slate-muted">
                      <span className="text-slate-faint">Hook · </span>
                      {part.hook}
                    </p>
                    <p className="mt-1 text-2xs leading-relaxed text-slate-muted">
                      <span className="text-slate-faint">Shot · </span>
                      {truncate(part.scene, 160)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-muted">Choose a preset to build the arc.</p>
            )}
          </SectionCard>

          {plan ? (
            <SectionCard title="Before you save">
              <ul className="space-y-1.5">
                {plan.notes.map((note) => (
                  <li key={note} className="text-2xs leading-relaxed text-slate-muted">
                    · {note}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
