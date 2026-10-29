import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  CopyButton,
  PageHeader,
  SectionCard,
} from '../components/ui/primitives';
import { Checkbox, Field, Select, TextArea, TextInput } from '../components/ui/forms';
import { SEED_PRESETS } from '../data/seedPresets';
import schemaDocument from '../schema/muse-ician.schema.json';
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_RECORDS,
  checkPayloadSize,
  parseJsonSafely,
  validatePayload,
  COLLECTION_LABELS,
  type ValidationResult,
} from '../lib/validation';
import {
  applyImportPlan,
  importSummary,
  planImport,
  type DuplicateStrategy,
} from '../lib/importPlan';
import {
  buildAiImportPrompt,
  buildCampaignExport,
  buildExampleTemplate,
  buildMetadataExport,
  buildPerformanceExport,
  buildPresetExport,
  buildWorkspaceBackup,
  downloadPayload,
  exportFilename,
} from '../lib/interchange';
import { downloadTextFile, readFileText } from '../lib/utils';
import { SCHEMA_VERSION } from '../lib/types';
import { formatDateTime, pluralize, toDateKey } from '../lib/utils';

export default function ImportExportPage() {
  const { data, applyImportedData } = useWorkspace();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<DuplicateStrategy>('skip');
  const [importPreferences, setImportPreferences] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [campaignSong, setCampaignSong] = useState('');
  const [packageIdea, setPackageIdea] = useState('');
  const [promptSong, setPromptSong] = useState('');
  const [promptCount, setPromptCount] = useState('5');
  const [promptInstructions, setPromptInstructions] = useState('');
  const [includeLyrics, setIncludeLyrics] = useState(false);

  const plan = useMemo(() => {
    if (!validation?.payload) return null;
    return planImport(validation.payload, data, strategy);
  }, [data, strategy, validation]);

  const acceptedRecords = useMemo(() => {
    if (!validation) return 0;
    return Object.entries(validation.counts).reduce((sum, [key, count]) => {
      const rejected = validation.rejected[key as keyof typeof validation.rejected] ?? 0;
      return sum + Math.max(0, (count ?? 0) - rejected);
    }, 0);
  }, [validation]);

  const canConfirm =
    Boolean(validation?.payload) &&
    (validation?.fatal.length ?? 1) === 0 &&
    acceptedRecords > 0 &&
    !importing;

  const resetImport = () => {
    setValidation(null);
    setFileName(null);
    setParseError(null);
    setImportDone(null);
    setImportPreferences(false);
    setStrategy('skip');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setParseError(null);
    setImportDone(null);
    setValidation(null);
    setFileName(file.name);

    if (file.size > MAX_IMPORT_BYTES) {
      setParseError(
        `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${(
          MAX_IMPORT_BYTES /
          1024 /
          1024
        ).toFixed(0)} MB. Split the pack into smaller files.`,
      );
      return;
    }

    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setParseError('The file could not be read. Try selecting it again.');
      return;
    }

    const sizeIssue = checkPayloadSize(text);
    if (sizeIssue) {
      setParseError(sizeIssue.message);
      return;
    }

    const parsed = parseJsonSafely(text);
    if (!parsed.ok) {
      setParseError(parsed.message);
      return;
    }

    try {
      const result = await validatePayload(parsed.value);
      setValidation(result);
      if (!result.ok) {
        toast('Validation problems found', {
          tone: 'error',
          description: `${result.errors.length + result.fatal.length} issue(s). Nothing has been imported yet.`,
        });
      }
    } catch (error) {
      setParseError(`Validation could not run: ${(error as Error).message}`);
    }
  };

  const confirmImport = async () => {
    if (!validation?.payload || !plan) return;
    setImporting(true);
    try {
      const next = applyImportPlan(
        importPreferences ? plan : { ...plan, preferences: undefined },
        data,
      );
      await applyImportedData(next);
      const summaryText = importSummary(plan);
      setImportDone(summaryText);
      toast('Import complete', { tone: 'success', description: summaryText });
    } catch (error) {
      toast('The import failed', {
        tone: 'error',
        description: `${(error as Error).message} Your existing records were not changed.`,
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadExample = () => {
    const payload = buildExampleTemplate(SEED_PRESETS.find((preset) => preset.id === 'preset-lyric-that-hits')!);
    downloadTextFile('example.json', JSON.stringify(payload, null, 2));
    toast('example.json downloaded', {
      tone: 'success',
      description: 'A valid, importable template with placeholder data and instructions inside the manifest.',
    });
  };

  const downloadSchema = () => {
    downloadTextFile('muse-ician.schema.json', JSON.stringify(schemaDocument, null, 2));
    toast('Schema downloaded', { tone: 'success', description: `JSON Schema ${SCHEMA_VERSION}` });
  };

  const downloadStarterPack = () => {
    const payload = buildPresetExport(SEED_PRESETS, 'preset_pack', 'muse-ician starter preset pack');
    downloadTextFile('starter-preset-pack.json', JSON.stringify(payload, null, 2));
    toast('Starter preset pack downloaded', {
      tone: 'success',
      description: `${SEED_PRESETS.length} presets, importable as a pack.`,
    });
  };

  const backupWorkspace = () => {
    const payload = buildWorkspaceBackup(data, `muse-ician workspace ${toDateKey()}`);
    const name = downloadPayload(payload);
    toast('Workspace exported', { tone: 'success', description: name });
  };

  const exportCampaign = () => {
    if (!data.content_ideas.length) {
      toast('Nothing to export', { tone: 'error', description: 'Create an idea or campaign first.' });
      return;
    }
    const payload = buildCampaignExport(data, { songId: campaignSong || null });
    const name = downloadPayload(payload);
    toast('Campaign exported', { tone: 'success', description: name });
  };

  const exportPackages = () => {
    const list = packageIdea
      ? data.metadata_packages.filter((pkg) => pkg.content_idea_id === packageIdea)
      : data.metadata_packages;
    if (!list.length) {
      toast('No metadata packages to export', { tone: 'error' });
      return;
    }
    const payload = buildMetadataExport(list);
    const name = downloadPayload(payload);
    toast('Metadata exported', { tone: 'success', description: name });
  };

  const exportPerformance = () => {
    if (!data.performance_records.length) {
      toast('No performance records yet', { tone: 'error' });
      return;
    }
    const payload = buildPerformanceExport(data.performance_records, data.songs, data.content_ideas);
    const name = downloadPayload(payload);
    toast('Performance snapshot exported', { tone: 'success', description: name });
  };

  const promptText = () => {
    const song = data.songs.find((item) => item.id === promptSong) ?? null;
    return buildAiImportPrompt({
      count: Math.max(1, Math.min(20, Number(promptCount) || 5)),
      extraInstructions: promptInstructions,
      songContext: song
        ? [
            `Title: ${song.title}`,
            song.artist ? `Artist: ${song.artist}` : '',
            song.genre ? `Genre: ${song.genre}${song.subgenre ? ` / ${song.subgenre}` : ''}` : '',
            song.moods?.length ? `Moods: ${song.moods.join(', ')}` : '',
            song.themes?.length ? `Themes: ${song.themes.join(', ')}` : '',
            song.description ? `Description: ${song.description}` : '',
            song.target_audience ? `Audience: ${song.target_audience}` : '',
            song.production_constraints ? `Constraints: ${song.production_constraints}` : '',
            song.equipment?.length ? `Equipment: ${song.equipment.join(', ')}` : '',
            song.face_visibility ? `Face on camera: ${song.face_visibility}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        : undefined,
      lyrics:
        includeLyrics && song?.lyrics
          ? song.lyrics.slice(0, 2000)
          : includeLyrics && song?.strongest_lyrics?.length
            ? song.strongest_lyrics.join('\n')
            : undefined,
      existingIdeas: data.presets
        .slice(0, 40)
        .map((preset) => `- ${preset.title}`)
        .join('\n'),
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Import / Export"
        title="Move your work in and out as JSON"
        description="The interchange format is versioned and validated. Nothing is imported until you confirm the preview, and duplicate IDs are never silently overwritten."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Templates and schema"
          description="Start here if you want an AI tool to generate a pack."
        >
          <ul className="space-y-2">
            {[
              {
                title: 'example.json',
                body: 'Manifest, one preset, one placeholder song, one linked idea and one metadata package. Includes instructions for the AI tool.',
                action: downloadExample,
                label: 'Download JSON template',
                primary: true,
              },
              {
                title: 'muse-ician.schema.json',
                body: `Formal JSON Schema for every record type, version ${SCHEMA_VERSION}.`,
                action: downloadSchema,
                label: 'Download schema',
              },
              {
                title: 'starter-preset-pack.json',
                body: `All ${SEED_PRESETS.length} starter presets as a real, importable preset pack.`,
                action: downloadStarterPack,
                label: 'Download starter pack',
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-text">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-muted">{item.body}</p>
                </div>
                <button
                  type="button"
                  className={item.primary ? 'btn-primary btn-sm shrink-0' : 'btn-secondary btn-sm shrink-0'}
                  onClick={item.action}
                >
                  <Icon name="download" size={13} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <Callout tone="info" title="Example round trip">
            Download <span className="font-mono">example.json</span>, give it to an AI tool with the schema, then import
            the result here. Validation reports unknown fields, wrong enums and missing required fields with a JSON path
            before anything is saved.
          </Callout>
        </SectionCard>

        <SectionCard title="AI prompt builder" description="Copies a prompt that produces importable JSON.">
          <div className="space-y-3">
            <Select
              label="Song context (optional)"
              placeholder="No song context"
              value={promptSong}
              onChange={(event) => setPromptSong(event.target.value)}
              options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
              hint="Only this song’s summary fields are added to the prompt."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="How many presets?"
                inputMode="numeric"
                value={promptCount}
                onChange={(event) => setPromptCount(event.target.value)}
              />
              <div className="flex items-end pb-1">
                <Checkbox
                  label="Include selected lyrics"
                  hint="Only if you are comfortable pasting them into another tool."
                  checked={includeLyrics}
                  onChange={setIncludeLyrics}
                />
              </div>
            </div>
            <Field label="Extra instructions (optional)">
              <TextArea
                rows={3}
                value={promptInstructions}
                onChange={(event) => setPromptInstructions(event.target.value)}
                placeholder="e.g. All concepts must work with no face on camera and a phone only."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <CopyButton
                getText={promptText}
                label="Copy AI import prompt"
                copiedLabel="Prompt copied"
                className="btn-primary btn-sm"
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => downloadTextFile('muse-ician-ai-prompt.txt', promptText(), 'text/plain')}
              >
                <Icon name="download" size={13} />
                Save as .txt
              </button>
            </div>
            <p className="text-2xs leading-relaxed text-slate-faint">
              The prompt tells the model to return only JSON, preserve supplied IDs, never invent trends or statistics,
              and use null for unknown values.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Import a JSON file"
        description={`Accepted: preset packs, campaign plans, metadata packages, workspace backups and performance snapshots. Limit ${(
          MAX_IMPORT_BYTES /
          1024 /
          1024
        ).toFixed(0)} MB and ${MAX_IMPORT_RECORDS} records per collection.`}
        actions={
          validation || parseError ? (
            <button type="button" className="btn-ghost btn-sm" onClick={resetImport}>
              Clear
            </button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleFile(event.dataTransfer.files?.[0]);
            }}
            className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging ? 'border-accent/60 bg-accent-dim/20' : 'border-white/[0.10] bg-white/[0.02]'
            }`}
          >
            <Icon name="upload" size={22} className="mx-auto text-accent-soft" />
            <p className="mt-2 text-sm text-slate-text">Drop a JSON file here</p>
            <p className="mt-1 text-xs text-slate-faint">or choose a file — it is parsed and validated locally first</p>
            <label className="btn-secondary btn-sm mt-3 cursor-pointer">
              Choose file
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
            {fileName ? <p className="mt-2 text-2xs text-slate-faint">Selected: {fileName}</p> : null}
          </div>

          {parseError ? (
            <Callout tone="warning" title="This file could not be read">
              <p>{parseError}</p>
              <p className="mt-1 text-slate-faint">
                Nothing was imported and your existing records are untouched. Common causes: Markdown fences around the
                JSON, trailing commas, or a truncated response.
              </p>
            </Callout>
          ) : null}

          {validation ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`chip ${validation.fatal.length ? 'chip-danger' : validation.errors.length ? 'chip-warn' : 'chip-ok'}`}>
                  {validation.fatal.length
                    ? 'Cannot import'
                    : validation.errors.length
                      ? 'Some records are invalid'
                      : 'Valid file'}
                </span>
                <span className="text-slate-muted">
                  {validation.exportType?.replace(/_/g, ' ')} · schema {validation.schemaVersion ?? '—'}
                </span>
                <span className="text-slate-faint">
                  {acceptedRecords} valid record{acceptedRecords === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(validation.counts).map(([collection, count]) => (
                  <div key={collection} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <p className="text-2xs uppercase tracking-wide text-slate-faint">
                      {COLLECTION_LABELS[collection as keyof typeof COLLECTION_LABELS]}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-text">
                      {count}
                      {validation.rejected[collection as keyof typeof validation.rejected] ? (
                        <span className="ml-1 text-danger">
                          ({validation.rejected[collection as keyof typeof validation.rejected]} invalid)
                        </span>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>

              {validation.fatal.length || validation.errors.length ? (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                  <h3 className="text-sm font-medium text-danger">Validation problems</h3>
                  <ul className="mt-1.5 max-h-56 space-y-1 overflow-y-auto text-xs text-slate-muted scroll-thin">
                    {[...validation.fatal, ...validation.errors].slice(0, 60).map((issue, index) => (
                      <li key={index}>
                        <span className="font-mono text-2xs text-danger">{issue.path}</span> — {issue.message}
                      </li>
                    ))}
                  </ul>
                  {validation.errors.length + validation.fatal.length > 60 ? (
                    <p className="mt-1 text-2xs text-slate-faint">
                      Showing the first 60 issues. Fix these and re-import to see more.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {validation.warnings.length ? (
                <details className="rounded-xl border border-warn/25 bg-warn/5 p-3">
                  <summary className="cursor-pointer text-sm text-warn">
                    {pluralize(validation.warnings.length, 'warning')} (import can continue)
                  </summary>
                  <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-muted scroll-thin">
                    {validation.warnings.slice(0, 80).map((issue, index) => (
                      <li key={index}>
                        <span className="font-mono text-2xs text-warn">{issue.path}</span> — {issue.message}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {plan ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="If a record id already exists" hint="Nothing is overwritten silently.">
                      <div className="space-y-2">
                        {[
                          { value: 'skip' as DuplicateStrategy, label: 'Skip the incoming record' },
                          { value: 'replace' as DuplicateStrategy, label: 'Replace my existing record' },
                          { value: 'new-id' as DuplicateStrategy, label: 'Import as a new record with a new id' },
                        ].map((option) => (
                          <label key={option.value} className="flex cursor-pointer items-start gap-2 text-sm">
                            <input
                              type="radio"
                              name="duplicate-strategy"
                              value={option.value}
                              checked={strategy === option.value}
                              onChange={() => setStrategy(option.value)}
                              className="mt-0.5 h-4 w-4 accent-accent-deep"
                            />
                            <span className="text-slate-muted">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </Field>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-muted">
                        <p>
                          <span className="text-slate-text">{plan.conflicts.length}</span> id conflict
                          {plan.conflicts.length === 1 ? '' : 's'} ·{' '}
                          <span className="text-slate-text">{plan.danglingReferences.length}</span> unresolved reference
                          {plan.danglingReferences.length === 1 ? '' : 's'}
                        </p>
                        <p className="mt-1 text-slate-text">{importSummary(plan)}</p>
                      </div>
                      {validation.payload?.preferences ? (
                        <Checkbox
                          label="Also import preferences"
                          hint="Artist name, defaults and preferred platforms in the file."
                          checked={importPreferences}
                          onChange={setImportPreferences}
                        />
                      ) : null}
                    </div>
                  </div>

                  {plan.danglingReferences.length ? (
                    <div className="rounded-xl border border-warn/30 bg-warn/5 p-3">
                      <h4 className="text-sm text-warn">References that will not resolve</h4>
                      <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-muted scroll-thin">
                        {plan.danglingReferences.map((ref, index) => (
                          <li key={index}>{ref.message}</li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-2xs text-slate-faint">
                        muse-ician will not invent the missing records. Imported items keep working with an empty link.
                      </p>
                    </div>
                  ) : null}

                  {plan.preview.length ? (
                    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/[0.03] text-2xs uppercase tracking-wide text-slate-faint">
                          <tr>
                            <th className="px-3 py-2 font-medium">Record</th>
                            <th className="px-3 py-2 font-medium">Title</th>
                            <th className="px-3 py-2 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-700/60">
                          {plan.preview.slice(0, 40).map((item) => (
                            <tr key={`${item.collection}-${item.id}-${item.status}`}>
                              <td className="px-3 py-1.5 text-slate-faint">
                                {COLLECTION_LABELS[item.collection]}
                              </td>
                              <td className="px-3 py-1.5 text-slate-text">{item.title}</td>
                              <td className="px-3 py-1.5">
                                <span
                                  className={`chip ${
                                    item.status === 'new'
                                      ? 'border-ok/30 text-ok'
                                      : item.status === 'skip'
                                        ? 'border-white/[0.10] text-slate-faint'
                                        : item.status === 'replace'
                                          ? 'border-warn/30 text-warn'
                                          : 'border-accent/30 text-accent-soft'
                                  }`}
                                >
                                  {item.status === 'replace' ? 'replaces existing' : item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {plan.preview.length > 40 ? (
                        <p className="border-t border-white/[0.06] px-3 py-2 text-2xs text-slate-faint">
                          Showing 40 of {plan.preview.length} records.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={confirmImport}
                      disabled={!canConfirm}
                    >
                      {importing ? 'Importing…' : `Import ${plannedCount(plan)}`}
                    </button>
                    <button type="button" className="btn-secondary" onClick={resetImport} disabled={importing}>
                      Cancel
                    </button>
                    {!canConfirm && validation.fatal.length === 0 && acceptedRecords === 0 ? (
                      <span className="text-xs text-danger">No valid records to import.</span>
                    ) : null}
                  </div>
                  {importDone ? (
                    <Callout tone="success" title="Imported">
                      {importDone}. Your previous records that were not in this file are untouched.
                    </Callout>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Export" description="Every export is valid JSON with a schema version, timestamp and stable ids.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="text-sm text-slate-text">Complete workspace backup</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              Every record in this browser, plus preferences. This is the file to keep for yourself.
            </p>
            <p className="mt-2 text-2xs text-slate-faint">
              {data.presets.length} presets · {data.songs.length} songs · {data.content_ideas.length} ideas ·{' '}
              {data.planned_posts.length} posts · {data.performance_records.length} results
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={backupWorkspace}>
                <Icon name="download" size={13} />
                Export workspace
              </button>
              <Link to="/settings" className="btn-ghost btn-sm">
                Restore in Settings
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="text-sm text-slate-text">Preset library</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              All active presets (including yours) as a preset pack. Archived presets are excluded.
            </p>
            <div className="mt-3">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  const active = data.presets.filter((preset) => !preset.is_archived);
                  if (!active.length) {
                    toast('Nothing to export', { tone: 'error' });
                    return;
                  }
                  const payload = buildPresetExport(active, 'preset_pack');
                  const name = downloadPayload(payload, exportFilename(payload, 'preset-pack'));
                  toast('Presets exported', { tone: 'success', description: name });
                }}
              >
                <Icon name="download" size={13} />
                Export {data.presets.filter((preset) => !preset.is_archived).length} presets
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="text-sm text-slate-text">Campaign plan</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              The song, ideas, source presets, planned posts and metadata for one song.
            </p>
            <div className="mt-2 space-y-2">
              <Select
                aria-label="Choose a song to export"
                placeholder="All songs"
                value={campaignSong}
                onChange={(event) => setCampaignSong(event.target.value)}
                options={data.songs.map((song) => ({ value: song.id, label: song.title }))}
                small
              />
              <button type="button" className="btn-secondary btn-sm" onClick={exportCampaign}>
                <Icon name="download" size={13} />
                Export campaign
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="text-sm text-slate-text">Metadata packages</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              Publishing packages as JSON, optionally limited to one idea.
            </p>
            <div className="mt-2 space-y-2">
              <Select
                aria-label="Choose an idea to export packages for"
                placeholder="All packages"
                value={packageIdea}
                onChange={(event) => setPackageIdea(event.target.value)}
                options={data.content_ideas.map((idea) => ({ value: idea.id, label: idea.title }))}
                small
              />
              <button type="button" className="btn-secondary btn-sm" onClick={exportPackages}>
                <Icon name="download" size={13} />
                Export metadata
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="text-sm text-slate-text">Performance snapshot</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              Hand-entered results with the linked songs and ideas, for analysis elsewhere.
            </p>
            <div className="mt-3">
              <button type="button" className="btn-secondary btn-sm" onClick={exportPerformance}>
                <Icon name="download" size={13} />
                Export results
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="text-sm text-slate-text">Single preset</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-muted">
              Open any preset and use the download icon to export just that record.
            </p>
            <div className="mt-3">
              <Link to="/library" className="btn-secondary btn-sm">
                Open library
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Format notes">
        <dl className="space-y-2 text-xs leading-relaxed text-slate-muted">
          <div>
            <dt className="text-slate-text">Schema version</dt>
            <dd>
              Files declare <span className="font-mono">schema_version</span>. This app reads 1.x and writes{' '}
              {SCHEMA_VERSION}. A newer major version is rejected with an explanation instead of being guessed at.
            </dd>
          </div>
          <div>
            <dt className="text-slate-text">Record types</dt>
            <dd>
              presets, songs, content_ideas, metadata_packages, campaigns, planned_posts, trends, performance_records,
              plus an optional preferences object. A preset pack does not need songs or metadata.
            </dd>
          </div>
          <div>
            <dt className="text-slate-text">Safety</dt>
            <dd>
              Imported values are treated strictly as data. Nothing is evaluated, rendered as HTML, or executed. Unknown
              fields are ignored with a warning, and invalid records are never imported.
            </dd>
          </div>
          <div>
            <dt className="text-slate-text">Migration</dt>
            <dd>
              Future schema versions will ship a migration that maps older records forward. Until then, keep the export
              file: it records exactly which version wrote it.
            </dd>
          </div>
          <div>
            <dt className="text-slate-text">Last local change</dt>
            <dd>{formatDateTime(data.preferences.updated_at)}</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
}

function plannedCount(plan: ReturnType<typeof planImport>): string {
  const total = Object.values(plan.counts).reduce(
    (sum, counts) => sum + counts.adding + counts.replacing,
    0,
  );
  return `${total} record${total === 1 ? '' : 's'}`;
}
