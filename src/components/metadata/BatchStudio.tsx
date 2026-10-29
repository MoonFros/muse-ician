import { useMemo, useState } from 'react';
import { useWorkspace } from '../../state/workspace';
import { useToast } from '../ui/Toast';
import { Icon } from '../ui/Icons';
import { Callout, CopyButton, EmptyState, SectionCard } from '../ui/primitives';
import { Field, Select } from '../ui/forms';
import type { MetadataPackage, Platform, Tone } from '../../lib/types';
import { PLATFORMS, PLATFORM_LABELS, TONES } from '../../lib/types';
import { PLATFORM_CONVENTIONS } from '../../lib/metadataTemplates';
import { batchSummary, buildBatchMetadata, csvCell, packagesToCsv, type BatchResult } from '../../lib/batch';
import { downloadTextFile, truncate } from '../../lib/utils';

/**
 * Batch metadata: many ideas × several platforms in one pass, with a CSV that
 * opens cleanly in Sheets or Excel.
 */
export function BatchStudio() {
  const { data, upsertMetadata } = useWorkspace();
  const { toast } = useToast();

  const [selected, setSelected] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(['youtube-shorts', 'instagram-reels', 'tiktok']);
  const [tone, setTone] = useState<Tone>(data.preferences.default_tone);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [saving, setSaving] = useState(false);

  const ideas = useMemo(
    () =>
      [...data.content_ideas]
        .filter((idea) => !['archived'].includes(idea.status))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [data.content_ideas],
  );

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const togglePlatform = (platform: Platform) =>
    setPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );

  const generate = () => {
    const chosen = ideas.filter((idea) => selected.includes(idea.id));
    if (!chosen.length) {
      toast('Select at least one idea', { tone: 'error' });
      return;
    }
    if (!platforms.length) {
      toast('Select at least one platform', { tone: 'error' });
      return;
    }
    const next = buildBatchMetadata({
      ideas: chosen,
      presets: data.presets,
      songs: data.songs,
      platforms,
      tone,
    });
    setResult(next);
    toast(batchSummary(next), {
      tone: 'success',
      description: 'Nothing is saved yet — review the preview, then save.',
    });
  };

  const save = async () => {
    if (!result?.packages.length) return;
    setSaving(true);
    try {
      await upsertMetadata(result.packages);
      toast(`${result.packages.length} packages saved`, {
        tone: 'success',
        description: 'They are drafts. Open any idea to edit its copy.',
      });
      setResult(null);
      setSelected([]);
    } catch {
      toast('The packages could not be saved', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const downloadCsv = () => {
    if (!result?.packages.length) return;
    const csv = packagesToCsv(result.packages, { ideas: data.content_ideas, songs: data.songs });
    downloadTextFile('muse-ician-batch-metadata.csv', csv, 'text/csv;charset=utf-8');
    toast('CSV downloaded', {
      tone: 'success',
      description: 'Values that could be read as spreadsheet formulas are escaped.',
    });
  };

  if (!ideas.length) {
    return (
      <EmptyState
        icon="tag"
        title="No ideas to batch yet"
        description="Batch generation needs saved ideas. Create one from the preset library first."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Batch generation"
        description="Build platform packages for several ideas at once. Packages are previews until you save them."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Platforms" hint="Each idea gets one package per platform.">
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((platform) => {
                const active = platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 text-2xs font-medium transition-all ${
                      active
                        ? 'border-accent/50 bg-accent-dim text-white'
                        : 'border-white/[0.08] text-slate-muted hover:border-white/20'
                    }`}
                  >
                    {PLATFORM_LABELS[platform]}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Tone">
            <Select
              value={tone}
              onChange={(event) => setTone(event.target.value as Tone)}
              options={TONES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
              aria-label="Tone"
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-slate-faint">
              {selected.length} of {ideas.length} ideas selected
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setSelected(ideas.map((idea) => idea.id))}
              >
                Select all
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setSelected([])}>
                Clear
              </button>
            </div>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1 scroll-thin">
            {ideas.map((idea) => {
              const active = selected.includes(idea.id);
              const song = data.songs.find((item) => item.id === idea.song_id);
              return (
                <li key={idea.id}>
                  <button
                    type="button"
                    onClick={() => toggle(idea.id)}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-accent/40 bg-accent-dim/30'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        active ? 'border-accent bg-accent text-white' : 'border-white/20'
                      }`}
                    >
                      {active ? <Icon name="check" size={11} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-text">{idea.title}</span>
                      <span className="block truncate text-2xs text-slate-faint">
                        {song?.title ?? 'No song'} · {idea.status}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={generate}>
            <Icon name="sparkle" size={15} />
            Generate preview
          </button>
          <CopyButton
            getText={() =>
              result
                ? result.packages
                    .map((pkg) => `${PLATFORM_LABELS[pkg.platform]} — ${pkg.title}\n${pkg.caption}`)
                    .join('\n\n---\n\n')
                : ''
            }
            label="Copy preview"
            disabled={!result?.packages.length}
          />
        </div>
      </SectionCard>

      {result ? (
        <SectionCard
          title={`Preview — ${result.packages.length} packages`}
          description={batchSummary(result)}
          actions={
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={downloadCsv}>
                <Icon name="download" size={13} />
                CSV
              </button>
              <button type="button" className="btn-primary btn-sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save all as drafts'}
              </button>
            </>
          }
        >
          {result.skipped.length ? (
            <div className="mb-3">
              <Callout tone="warning" title="Some ideas were skipped">
                <ul className="space-y-1">
                  {result.skipped.map((item) => (
                    <li key={item.ideaId}>· {item.title}: {item.reason}</li>
                  ))}
                </ul>
              </Callout>
            </div>
          ) : null}

          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <caption className="sr-only">Preview of generated metadata packages</caption>
              <thead>
                <tr className="border-b border-white/[0.08] text-2xs uppercase tracking-[0.1em] text-slate-faint">
                  <th scope="col" className="py-2 pr-3 font-medium">Platform</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Title field</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Caption</th>
                  <th scope="col" className="py-2 font-medium">Length</th>
                </tr>
              </thead>
              <tbody>
                {result.packages.slice(0, 40).map((pkg: MetadataPackage) => {
                  const convention = PLATFORM_CONVENTIONS[pkg.platform];
                  const over = pkg.caption.length > convention.captionLimit;
                  return (
                    <tr key={pkg.id} className="border-b border-white/[0.05] align-top">
                      <td className="py-2 pr-3 text-slate-muted">{PLATFORM_LABELS[pkg.platform]}</td>
                      <td className="py-2 pr-3 text-slate-text">{truncate(pkg.title, 60)}</td>
                      <td className="py-2 pr-3 text-slate-muted">{truncate(pkg.caption.replace(/\s+/g, ' '), 110)}</td>
                      <td className={`py-2 tabular-nums ${over ? 'text-danger' : 'text-slate-faint'}`}>
                        {pkg.caption.length}/{convention.captionLimit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.packages.length > 40 ? (
            <p className="mt-2 text-2xs text-slate-faint">
              Showing the first 40 of {result.packages.length}. The CSV and the save action include everything.
            </p>
          ) : null}
          <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
            CSV cells that start with =, +, - or @ are prefixed with an apostrophe so a caption can never execute as a
            spreadsheet formula. Example: {csvCell('=HYPERLINK("https://example.com")')}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
