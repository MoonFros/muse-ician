import type { AudioSection } from './types';

/**
 * Local audio analysis.
 *
 * Everything here runs in the browser on the user's own file. Nothing is
 * uploaded, no API key is involved and no money is spent — the point is to turn
 * a song the artist already has into *measured* facts (runtime, tempo, loudness,
 * section boundaries, an estimated key) that the rest of the app can use as
 * context.
 *
 * Honesty rules baked into this module:
 *  - measured values (duration, peak, RMS, section energy) are stated plainly;
 *  - tempo and key are *estimates* and always carry a confidence value, and the
 *    tempo is withheld when the beat is too weak to call;
 *  - section labels describe energy ("sparse", "full"), never musical function
 *    ("verse"), because a level meter cannot know that.
 */

export interface AudioAnalysis {
  /** Exactly what was measured, in seconds. */
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  /** Peak amplitude in dBFS (0 is full scale). */
  peakDb: number;
  /** Average level in dBFS over the whole file. */
  rmsDb: number;
  /** Difference between the loudest and quietest section, in dB. */
  dynamicRangeDb: number;
  /** Estimated tempo, or null when the beat is too weak to call honestly. */
  tempoBpm: number | null;
  /** 0–1. Below 0.25 the tempo is not reported at all. */
  tempoConfidence: number;
  /** e.g. "A minor (estimate)" — null when the pitch content is ambiguous. */
  keyEstimate: string | null;
  keyConfidence: number;
  sections: SectionSuggestion[];
  /** Plain-language caveats shown in the UI next to the numbers. */
  notes: string[];
}

export interface SectionSuggestion {
  startSeconds: number;
  endSeconds: number;
  /** Energy tier, not a musical function. */
  tier: 'sparse' | 'building' | 'full' | 'peak';
  /** Average level of this section in dBFS. */
  energyDb: number;
}

export interface DecodedAudio {
  name: string;
  sampleRate: number;
  channels: Float32Array[];
  durationSeconds: number;
}

/** Files above this are refused: decoding holds the whole thing in memory. */
export const MAX_AUDIO_BYTES = 48 * 1024 * 1024;

const TARGET_RATE = 11025;
const MIN_SECTION_SECONDS = 8;
const MAX_SECTIONS = 10;
const ENERGY_STEP_DB = 2.5;

/* -------------------------------------------------------------------------- */
/* Small DSP helpers                                                          */
/* -------------------------------------------------------------------------- */

/** In-place iterative radix-2 FFT. `re`/`im` must have a power-of-two length. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const uRe = re[i + k]!;
        const uIm = im[i + k]!;
        const vRe = re[i + k + len / 2]! * curRe - im[i + k + len / 2]! * curIm;
        const vIm = re[i + k + len / 2]! * curIm + im[i + k + len / 2]! * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function toDb(amplitude: number): number {
  if (amplitude <= 1e-8) return -96;
  return Math.max(-96, 20 * Math.log10(amplitude));
}

/** Mix to mono and decimate to roughly 11 kHz. Cheap, and enough for levels/beats. */
function prepareMono(channels: Float32Array[], sampleRate: number): { data: Float32Array; rate: number } {
  const length = channels[0]?.length ?? 0;
  const factor = Math.max(1, Math.floor(sampleRate / TARGET_RATE));
  const rate = sampleRate / factor;
  if (factor === 1) {
    const mono = new Float32Array(length);
    for (const channel of channels) {
      for (let i = 0; i < length; i += 1) mono[i] = mono[i]! + channel[i]! / channels.length;
    }
    return { data: mono, rate };
  }
  const outLength = Math.floor(length / factor);
  const mono = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    let sum = 0;
    const base = i * factor;
    for (let k = 0; k < factor; k += 1) {
      let frame = 0;
      for (const channel of channels) frame += channel[base + k]!;
      sum += frame / channels.length;
    }
    mono[i] = sum / factor;
  }
  return { data: mono, rate };
}

/** Frame-wise RMS of a mono signal. */
function rmsFrames(data: Float32Array, frame: number, hop: number): Float32Array {
  const count = Math.max(1, Math.floor((data.length - frame) / hop) + 1);
  const out = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const start = index * hop;
    let sum = 0;
    for (let i = 0; i < frame; i += 1) {
      const sample = data[start + i] ?? 0;
      sum += sample * sample;
    }
    out[index] = Math.sqrt(sum / frame);
  }
  return out;
}

function movingAverage(values: Float32Array, window: number): Float32Array {
  const half = Math.max(1, Math.floor(window / 2));
  const out = new Float32Array(values.length);
  let sum = 0;
  let count = 0;
  const queue: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const add = values[Math.min(values.length - 1, i + half)]!;
    const remove = i - half - 1 >= 0 ? values[i - half - 1]! : null;
    queue.push(add);
    sum += add;
    count += 1;
    if (remove !== null) {
      sum -= remove;
      count -= 1;
    }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Tempo                                                                      */
/* -------------------------------------------------------------------------- */

/** Seconds of audio used for the beat estimate. Keeps a 5-minute song fast. */
const TEMPO_WINDOW_SECONDS = 120;

/** Spectral flux: the standard onset signal. Much sharper than raw RMS changes. */
function spectralFlux(mono: Float32Array, frame: number, hop: number): Float32Array {
  const count = Math.max(0, Math.floor((mono.length - frame) / hop) + 1);
  const out = new Float32Array(count);
  if (!count) return out;
  const previous = new Float32Array(frame / 2);
  const window = new Float32Array(frame);
  for (let i = 0; i < frame; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1));
  for (let index = 0; index < count; index += 1) {
    const re = new Float32Array(frame);
    const im = new Float32Array(frame);
    for (let i = 0; i < frame; i += 1) re[i] = (mono[index * hop + i] ?? 0) * window[i]!;
    fft(re, im);
    let flux = 0;
    for (let bin = 1; bin < frame / 2; bin += 1) {
      const magnitude = Math.hypot(re[bin]!, im[bin]!);
      const difference = magnitude - previous[bin]!;
      if (difference > 0) flux += difference;
      previous[bin] = magnitude;
    }
    out[index] = flux;
  }
  return out;
}

export function estimateTempo(mono: Float32Array, rate: number): { bpm: number | null; confidence: number } {
  const frame = 1024;
  const hop = 256; // ~23 ms at 11 kHz: fine enough to resolve a beat to well under 1 BPM
  const window = mono.subarray(0, Math.min(mono.length, Math.round(TEMPO_WINDOW_SECONDS * rate)));
  const env = spectralFlux(window, frame, hop);
  if (env.length < 64) return { bpm: null, confidence: 0 };

  // Remove the slow trend so a quiet intro does not dominate the correlation.
  const trendWindow = 32;
  let running = 0;
  const onset = new Float32Array(env.length);
  for (let i = 0; i < env.length; i += 1) {
    running += env[i]!;
    if (i >= trendWindow) running -= env[i - trendWindow]!;
    onset[i] = env[i]! - running / Math.min(i + 1, trendWindow);
  }

  let energy = 0;
  for (const value of onset) energy += value * value;
  if (energy <= 1e-9) return { bpm: null, confidence: 0 };

  const hopSeconds = hop / rate;
  const minLag = Math.max(2, Math.round(60 / 200 / hopSeconds));
  const maxLag = Math.min(onset.length - 3, Math.round(60 / 55 / hopSeconds));
  if (maxLag <= minLag) return { bpm: null, confidence: 0 };

  const ac: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i + lag < onset.length; i += 1) sum += onset[i]! * onset[i + lag]!;
    ac.push(sum / (onset.length - lag));
  }
  const at = (value: number): number => {
    const floor = Math.floor(value);
    const index = floor - minLag;
    const fraction = value - floor;
    const a = ac[index] ?? 0;
    const b = ac[index + 1] ?? a;
    return a + (b - a) * fraction;
  };

  let bestIndex = -1;
  let bestScore = -Infinity;
  for (let index = 1; index < ac.length - 1; index += 1) {
    const lag = index + minLag;
    if (!(ac[index]! >= ac[index - 1]! && ac[index]! >= ac[index + 1]!)) continue;
    const bpm = 60 / (lag * hopSeconds);
    // Mild preference for tempos people actually count along to (centred on 120).
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    // Harmonics at 2× and 3× the lag reject half-tempo and double-tempo errors.
    const score = ac[index]! + 0.6 * at(lag * 2) + 0.4 * at(lag * 3) + 0.35 * ac[index]! * prior;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  if (bestIndex < 0) return { bpm: null, confidence: 0 };

  const left = ac[bestIndex - 1] ?? ac[bestIndex]!;
  const centre = ac[bestIndex]!;
  const right = ac[bestIndex + 1] ?? centre;
  const denominator = left - 2 * centre + right;
  const shift = denominator === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (left - right)) / denominator));
  let bpm = 60 / ((bestIndex + minLag + shift) * hopSeconds);
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  const sorted = [...ac].sort((a, b) => b - a);
  const runnerUp = sorted[1] ?? 0;
  const mean = ac.reduce((total, value) => total + value, 0) / ac.length;
  const prominence = centre > 0 ? Math.max(0, Math.min(1, (centre - runnerUp) / centre + 0.5)) : 0;
  const strength = mean > 0 ? Math.max(0, Math.min(1, centre / (mean * 6))) : 0;
  const confidence = Math.round(Math.max(0, Math.min(1, 0.5 * prominence + 0.5 * strength)) * 100) / 100;

  return { bpm: Math.round(bpm * 10) / 10, confidence };
}

/* -------------------------------------------------------------------------- */
/* Key (estimate)                                                             */
/* -------------------------------------------------------------------------- */

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((t, v) => t + v, 0) / n;
  const meanB = b.reduce((t, v) => t + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i]! - meanA;
    const y = b[i]! - meanB;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export function estimateKey(mono: Float32Array, rate: number): { key: string | null; confidence: number } {
  const frame = 4096;
  if (mono.length < frame * 2) return { key: null, confidence: 0 };
  const maxFrames = 48;
  const stride = Math.max(frame, Math.floor((mono.length - frame) / maxFrames));
  const chroma = new Array<number>(12).fill(0);

  for (let start = 0; start + frame <= mono.length; start += stride) {
    const re = new Float32Array(frame);
    const im = new Float32Array(frame);
    for (let i = 0; i < frame; i += 1) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1));
      re[i] = (mono[start + i] ?? 0) * window;
    }
    fft(re, im);
    for (let bin = 2; bin < frame / 2; bin += 1) {
      const frequency = (bin * rate) / frame;
      if (frequency < 55 || frequency > 2000) continue;
      const magnitude = Math.hypot(re[bin]!, im[bin]!);
      if (magnitude <= 0) continue;
      const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
      const pitchClass = ((midi % 12) + 12) % 12;
      chroma[pitchClass] = chroma[pitchClass]! + magnitude;
    }
  }

  const total = chroma.reduce((t, v) => t + v, 0);
  if (total <= 0) return { key: null, confidence: 0 };
  const normalised = chroma.map((value) => value / total);

  // A key needs a scale. One or two sustained notes cannot imply a mode, so the
  // estimate is withheld rather than guessed.
  const distinct = normalised.filter((value) => value >= 0.05).length;
  if (distinct < 3) return { key: null, confidence: 0 };

  let best = { score: -2, label: '', second: -2 };
  for (let root = 0; root < 12; root += 1) {
    for (const mode of ['major', 'minor'] as const) {
      const profile = mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE;
      const rotated = profile.map((_, index) => profile[(index - root + 12) % 12]!);
      const score = pearson(normalised, rotated as number[]);
      const label = `${NOTE_NAMES[root]} ${mode}`;
      if (score > best.score) {
        best = { score, label, second: best.score };
      } else if (score > best.second) {
        best.second = score;
      }
    }
  }

  // Below this the profile fit says nothing useful; above it, report with a
  // confidence that reflects both the fit and how far clear it is of second place.
  if (best.score < 0.5) return { key: null, confidence: 0 };
  const gap = Math.max(0, best.score - best.second);
  const fit = Math.max(0, Math.min(1, (best.score - 0.5) / 0.4));
  const clarity = Math.max(0, Math.min(1, gap / 0.25));
  const confidence = Math.round((0.55 * fit + 0.45 * clarity) * 100) / 100;
  return { key: best.label, confidence };
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

export function detectSections(mono: Float32Array, rate: number): SectionSuggestion[] {
  const frame = Math.round(rate * 0.09);
  const hop = Math.round(rate * 0.045);
  const frames = rmsFrames(mono, frame, hop);
  if (frames.length < 8) {
    return [{ startSeconds: 0, endSeconds: mono.length / rate, tier: 'building', energyDb: -96 }];
  }
  const smoothed = movingAverage(frames, Math.max(3, Math.round(1 / (hop / rate)))); // ~1 s
  const secondsPerFrame = hop / rate;
  const minFrames = Math.max(2, Math.round(MIN_SECTION_SECONDS / secondsPerFrame));
  const windowFrames = Math.max(2, Math.round(2 / secondsPerFrame));

  const boundaries = [0];
  let last = 0;
  for (let i = minFrames; i < smoothed.length - windowFrames; i += 1) {
    if (i - last < minFrames) continue;
    let before = 0;
    let after = 0;
    for (let k = 0; k < windowFrames; k += 1) {
      before += smoothed[i - windowFrames + k]!;
      after += smoothed[i + k]!;
    }
    const changeDb = Math.abs(toDb(after / windowFrames) - toDb(before / windowFrames));
    if (changeDb >= ENERGY_STEP_DB) {
      boundaries.push(i);
      last = i;
      if (boundaries.length >= MAX_SECTIONS) break;
    }
  }

  const spans: SectionSuggestion[] = [];
  for (let index = 0; index < boundaries.length; index += 1) {
    const startFrame = boundaries[index]!;
    const endFrame = boundaries[index + 1] ?? smoothed.length;
    let sum = 0;
    for (let i = startFrame; i < endFrame; i += 1) sum += smoothed[i]! ** 2;
    const rms = Math.sqrt(sum / Math.max(1, endFrame - startFrame));
    spans.push({
      startSeconds: Math.round(startFrame * secondsPerFrame),
      endSeconds: Math.round(endFrame * secondsPerFrame),
      tier: 'building',
      energyDb: Math.round(toDb(rms)),
    });
  }

  // Tier by relative level inside the song, not by absolute dBFS.
  const energyValues = spans.map((span) => span.energyDb);
  const lowest = Math.min(...energyValues);
  const highest = Math.max(...energyValues);
  const range = Math.max(1, highest - lowest);
  for (const span of spans) {
    const position = (span.energyDb - lowest) / range;
    span.tier = position < 0.3 ? 'sparse' : position < 0.7 ? 'building' : position < 0.92 ? 'full' : 'peak';
  }
  return spans;
}

/* -------------------------------------------------------------------------- */
/* Entry points                                                               */
/* -------------------------------------------------------------------------- */

export function analyseAudio(input: { sampleRate: number; channels: Float32Array[]; name?: string }): AudioAnalysis {
  const { sampleRate, channels } = input;
  const rawLength = channels[0]?.length ?? 0;
  if (!rawLength) throw new Error('That audio file contained no samples.');
  const durationSeconds = rawLength / sampleRate;

  let peak = 0;
  let sumSquares = 0;
  let count = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) {
      const value = Math.abs(channel[i]!);
      if (value > peak) peak = value;
      sumSquares += value * value;
      count += 1;
    }
  }
  const rms = count ? Math.sqrt(sumSquares / count) : 0;

  const { data: mono, rate } = prepareMono(channels, sampleRate);
  const tempo = estimateTempo(mono, rate);
  const key = estimateKey(mono, rate);
  const sections = detectSections(mono, rate);

  const energies = sections.map((section) => section.energyDb);
  const dynamicRangeDb = energies.length ? Math.max(...energies) - Math.min(...energies) : 0;

  const notes: string[] = [
    'Measured in your browser from the file you selected. Nothing was uploaded and no AI provider was called.',
  ];
  if (tempo.bpm === null || tempo.confidence < 0.25) {
    notes.push('The beat was too ambiguous to report a tempo. Tap it in by hand if you need an exact figure.');
  } else if (tempo.confidence < 0.5) {
    notes.push('Tempo is a rough estimate — verify it against your DAW before trusting it.');
  }
  if (key.key) {
    notes.push(
      key.confidence >= 0.5
        ? 'Key is estimated from the pitch content; check it by ear before publishing it as a fact.'
        : 'Key guess is weak. Treat it as a starting point only, or leave the field empty.',
    );
  } else {
    notes.push('No reliable key estimate: the pitch content is too ambiguous or too percussive.');
  }
  if (sections.length > 1) {
    notes.push(
      'Sections are found from level changes, so they mark where the arrangement shifts — they are not labelled verse or chorus, because a level meter cannot know that.',
    );
  }

  return {
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    sampleRate,
    channels: channels.length,
    peakDb: Math.round(toDb(peak) * 10) / 10,
    rmsDb: Math.round(toDb(rms) * 10) / 10,
    dynamicRangeDb: Math.round(dynamicRangeDb * 10) / 10,
    tempoBpm: tempo.bpm !== null && tempo.confidence >= 0.25 ? tempo.bpm : null,
    tempoConfidence: tempo.confidence,
    keyEstimate: key.key,
    keyConfidence: key.confidence,
    sections,
    notes,
  };
}

/** `m:ss`, the same format the metadata studio uses for chapters. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** Convert the analysis into song `audio_sections` records. */
export function toAudioSections(analysis: AudioAnalysis): AudioSection[] {
  return analysis.sections.map((section, index) => ({
    label: `Section ${index + 1} · ${tierLabel(section.tier)}`,
    timestamp: formatClock(section.startSeconds),
    note: `${formatClock(section.endSeconds)} end · ${section.energyDb} dBFS average · measured from the audio file`,
  }));
}

export function tierLabel(tier: SectionSuggestion['tier']): string {
  return tier === 'sparse'
    ? 'Sparse'
    : tier === 'building'
      ? 'Building'
      : tier === 'full'
        ? 'Full arrangement'
        : 'Peak energy';
}

/* -------------------------------------------------------------------------- */
/* Decoding                                                                   */
/* -------------------------------------------------------------------------- */

type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor {
  const candidate =
    (globalThis as { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor })
      .AudioContext ??
    (globalThis as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!candidate) {
    throw new Error(
      'This browser does not expose the Web Audio API, so the file cannot be decoded locally. Enter the details by hand instead.',
    );
  }
  return candidate;
}

/**
 * Decode a user-selected audio file on the device.
 *
 * The file is read into memory and handed to the Web Audio decoder — it is
 * never sent over the network.
 */
export async function decodeAudioFile(file: File): Promise<DecodedAudio> {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The local analyser caps at ${Math.round(
        MAX_AUDIO_BYTES / 1024 / 1024,
      )} MB so it does not exhaust browser memory.`,
    );
  }
  const Context = audioContextConstructor();
  const context = new Context();
  try {
    const buffer = await file.arrayBuffer();
    const audio = await context.decodeAudioData(buffer);
    const channels: Float32Array[] = [];
    for (let index = 0; index < audio.numberOfChannels; index += 1) {
      channels.push(audio.getChannelData(index));
    }
    return {
      name: file.name,
      sampleRate: audio.sampleRate,
      channels,
      durationSeconds: audio.duration,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message
        ? `The browser could not decode that file (${error.message}). Try a WAV, MP3, M4A or OGG export.`
        : 'The browser could not decode that file. Try a WAV, MP3, M4A or OGG export.',
    );
  } finally {
    void context.close().catch(() => undefined);
  }
}
