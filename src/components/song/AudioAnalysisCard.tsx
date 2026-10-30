import { useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icons';
import { Callout, SectionCard } from '../ui/primitives';
import { Checkbox } from '../ui/forms';
import { useToast } from '../ui/Toast';
import { useWorkspace } from '../../state/workspace';
import type { Song } from '../../lib/types';
import {
  MAX_AUDIO_BYTES,
  analyseAudio,
  decodeAudioFile,
  formatClock,
  tierLabel,
  toAudioSections,
  type AudioAnalysis,
} from '../../lib/audioAnalysis';

type Status = 'idle' | 'reading' | 'done' | 'error';

function confidenceWord(value: number): string {
  if (value >= 0.7) return 'strong';
  if (value >= 0.45) return 'moderate';
  return 'weak';
}

/**
 * Local audio analysis for one song.
 *
 * The file is decoded and measured in this browser tab. It is never uploaded,
 * no AI provider is called, and nothing here costs anything. Results are shown
 * before they are written, and existing values are only replaced on purpose.
 */
export function AudioAnalysisCard({ song }: { song: Song }) {
  const { saveSong } = useWorkspace();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [applyTempo, setApplyTempo] = useState(true);
  const [applyKey, setApplyKey] = useState(true);
  const [applySections, setApplySections] = useState(true);
  const [saving, setSaving] = useState(false);

  const suggestedSections = useMemo(() => (analysis ? toAudioSections(analysis) : []), [analysis]);

  const hasExisting = Boolean(song.bpm || song.musical_key || (song.audio_sections ?? []).length);

  const reset = () => {
    setAnalysis(null);
    setFileLabel(null);
    setError(null);
    setStatus('idle');
    setReplaceExisting(false);
    setApplyTempo(true);
    setApplyKey(true);
    setApplySections(true);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus('reading');
    setError(null);
    setAnalysis(null);
    setFileLabel(file.name);
    try {
      const decoded = await decodeAudioFile(file);
      // Yield once so the “analysing” state paints before the clock is busy.
      await new Promise((resolve) => setTimeout(resolve, 20));
      const result = analyseAudio(decoded);
      setAnalysis(result);
      setStatus('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The file could not be analysed.');
      setStatus('error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const apply = async () => {
    if (!analysis) return;
    const canWriteBpm = applyTempo && analysis.tempoBpm !== null && (replaceExisting || !song.bpm);
    const canWriteKey = applyKey && analysis.keyEstimate !== null && (replaceExisting || !song.musical_key);
    const canWriteSections =
      applySections && suggestedSections.length > 0 && (replaceExisting || !(song.audio_sections ?? []).length);

    if (!canWriteBpm && !canWriteKey && !canWriteSections) {
      toast('Nothing to write', {
        tone: 'error',
        description: hasExisting
          ? 'Those fields already hold values. Tick “Replace existing values” to overwrite them.'
          : 'Nothing was selected.',
      });
      return;
    }

    setSaving(true);
    try {
      const next: Song = {
        ...song,
        bpm: canWriteBpm ? Math.round(analysis.tempoBpm!) : song.bpm ?? null,
        musical_key: canWriteKey ? `${analysis.keyEstimate} (estimate)` : song.musical_key ?? null,
        audio_sections: canWriteSections ? suggestedSections : song.audio_sections ?? [],
      };
      await saveSong(next);
      const written = [
        canWriteBpm ? 'tempo' : null,
        canWriteKey ? 'key estimate' : null,
        canWriteSections ? `${suggestedSections.length} sections` : null,
      ].filter(Boolean);
      toast('Song updated from the audio file', {
        tone: 'success',
        description: `Wrote ${written.join(', ')}. Measured on this device.`,
      });
      setAnalysis(null);
      setStatus('idle');
      setFileLabel(null);
    } catch (cause) {
      toast('The song could not be saved', {
        tone: 'error',
        description: cause instanceof Error ? cause.message : 'The browser storage rejected the write.',
      });
    } finally {
      setSaving(false);
    }
  };

  const busy = status === 'reading';

  return (
    <SectionCard
      title="Listen to the file (on this device)"
      description="Decodes your own export in the browser and measures it. Nothing is uploaded, no AI is called, and it costs nothing."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={`audio-file-${song.id}`}
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Icon name="song" size={14} />
            {busy ? 'Reading the file…' : 'Choose an audio file'}
          </button>
          {fileLabel ? <span className="text-2xs text-slate-faint">{fileLabel}</span> : null}
          {analysis ? (
            <button type="button" className="btn-ghost btn-sm" onClick={reset}>
              Clear
            </button>
          ) : null}
        </div>
        <p className="text-2xs text-slate-faint">
          WAV, MP3, M4A or OGG up to {Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB. A full mix or a bounced master both
          work — the analysis is about levels and timing, not the arrangement.
        </p>

        <div aria-live="polite" className="space-y-3">
          {status === 'reading' ? (
            <p className="text-xs text-slate-muted">Decoding and measuring. This can take a few seconds for a long file.</p>
          ) : null}

          {error ? (
            <Callout tone="danger" title="The file could not be read">
              {error}
            </Callout>
          ) : null}

          {analysis ? (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                  <dt className="text-2xs text-slate-faint">Runtime</dt>
                  <dd className="mt-0.5 font-medium text-slate-text">{formatClock(analysis.durationSeconds)}</dd>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                  <dt className="text-2xs text-slate-faint">Tempo</dt>
                  <dd className="mt-0.5 font-medium text-slate-text">
                    {analysis.tempoBpm === null ? 'Not clear' : `${analysis.tempoBpm} BPM`}
                  </dd>
                  <dd className="text-2xs text-slate-faint">
                    {analysis.tempoBpm === null ? 'too ambiguous' : `${confidenceWord(analysis.tempoConfidence)} match`}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                  <dt className="text-2xs text-slate-faint">Key</dt>
                  <dd className="mt-0.5 font-medium text-slate-text">
                    {analysis.keyEstimate ?? 'Not clear'}
                  </dd>
                  <dd className="text-2xs text-slate-faint">
                    {analysis.keyEstimate ? `estimate · ${confidenceWord(analysis.keyConfidence)}` : 'too few pitches'}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                  <dt className="text-2xs text-slate-faint">Levels</dt>
                  <dd className="mt-0.5 font-medium text-slate-text">
                    peak {analysis.peakDb} dBFS
                  </dd>
                  <dd className="text-2xs text-slate-faint">
                    average {analysis.rmsDb} · range {analysis.dynamicRangeDb} dB
                  </dd>
                </div>
              </dl>

              {analysis.sections.length > 1 ? (
                <div>
                  <h4 className="field-label mb-1.5">Where the arrangement changes</h4>
                  <ol className="space-y-1 text-xs text-slate-muted">
                    {analysis.sections.map((section, index) => (
                      <li key={`${section.startSeconds}-${index}`} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-slate-text">{formatClock(section.startSeconds)}</span>
                        <span>{tierLabel(section.tier)}</span>
                        <span className="text-2xs text-slate-faint">
                          {formatClock(section.endSeconds)} · {section.energyDb} dBFS
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <details className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                <summary className="cursor-pointer text-xs text-slate-text">How to read these numbers</summary>
                <ul className="mt-2 space-y-1 text-2xs leading-relaxed text-slate-faint">
                  {analysis.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </details>

              <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <p className="field-label mb-0">Write to this song</p>
                <Checkbox
                  label={analysis.tempoBpm === null ? 'Tempo — not available from this file' : `Tempo — ${analysis.tempoBpm} BPM`}
                  hint={song.bpm ? `Current value: ${song.bpm} BPM.` : 'Currently empty.'}
                  disabled={analysis.tempoBpm === null}
                  checked={applyTempo && analysis.tempoBpm !== null}
                  onChange={setApplyTempo}
                />
                <Checkbox
                  label={
                    analysis.keyEstimate === null
                      ? 'Key estimate — not available from this file'
                      : `Key estimate — ${analysis.keyEstimate} (estimate)`
                  }
                  hint={song.musical_key ? `Current value: ${song.musical_key}.` : 'Currently empty.'}
                  disabled={analysis.keyEstimate === null}
                  checked={applyKey && analysis.keyEstimate !== null}
                  onChange={setApplyKey}
                />
                <Checkbox
                  label={`Section map — ${suggestedSections.length} timestamps`}
                  hint={
                    (song.audio_sections ?? []).length
                      ? `Current value: ${(song.audio_sections ?? []).length} sections already saved.`
                      : 'Currently empty. These also feed the long-form chapter planner.'
                  }
                  checked={applySections}
                  onChange={setApplySections}
                />
                {hasExisting ? (
                  <Checkbox
                    label="Replace the values already on this song"
                    hint="Off by default: empty fields are filled, existing ones are left alone."
                    checked={replaceExisting}
                    onChange={setReplaceExisting}
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button type="button" className="btn-primary btn-sm" onClick={() => void apply()} disabled={saving}>
                    {saving ? 'Saving…' : 'Apply to song'}
                  </button>
                  <span className="text-2xs text-slate-faint">
                    Nothing is written until you press this. You can edit every value afterwards.
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {status === 'idle' && !analysis ? (
            <p className="text-2xs text-slate-faint">
              Tempo and key are estimates and are labelled as such; runtime, peak and section levels are measured values.
              A level meter cannot tell a verse from a chorus, so sections are named by energy, not by function.
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
