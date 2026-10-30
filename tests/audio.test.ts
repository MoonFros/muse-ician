import { describe, expect, it } from 'vitest';
import {
  analyseAudio,
  estimateKey,
  estimateTempo,
  formatClock,
  toAudioSections,
  type AudioAnalysis,
} from '../src/lib/audioAnalysis';
import { songContext, MAX_LYRICS_CHARS } from '../src/lib/aiContext';
import { defaultPreferences, normalizePreferences } from '../src/storage/defaults';
import type { Song } from '../src/lib/types';

const RATE = 11025;

/** A click track over a sustained triad, with four different energy levels. */
function buildTrack(options: {
  seconds?: number;
  bpm?: number;
  chord?: number[];
  steps?: boolean;
  rhythmic?: boolean;
}): Float32Array {
  const { seconds = 40, bpm = 120, chord = [220, 261.63, 329.63], steps = true, rhythmic = true } = options;
  const length = RATE * seconds;
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / RATE;
    const level = steps ? (t < 10 ? 0.05 : t < 20 ? 0.1 : t < 30 ? 0.18 : 0.12) : 0.1;
    let value = 0;
    for (const frequency of chord) value += Math.sin(2 * Math.PI * frequency * t) / chord.length;
    data[i] = value * level;
  }
  if (!rhythmic) return data;
  const beat = 60 / bpm;
  for (let t = 0; t < seconds; t += beat) {
    const start = Math.round(t * RATE);
    for (let k = 0; k < 220 && start + k < length; k += 1) {
      data[start + k] = data[start + k]! + 0.45 * Math.exp(-k / 60) * Math.sin((2 * Math.PI * 150 * k) / RATE);
    }
  }
  return data;
}

function analyse(track: Float32Array): AudioAnalysis {
  return analyseAudio({ sampleRate: RATE, channels: [track] });
}

describe('local audio analysis — measured values', () => {
  it('reports runtime, channels and levels from the samples', () => {
    const result = analyse(buildTrack({ seconds: 12 }));
    expect(result.durationSeconds).toBeCloseTo(12, 1);
    expect(result.channels).toBe(1);
    expect(result.peakDb).toBeGreaterThan(-12);
    expect(result.peakDb).toBeLessThanOrEqual(0);
    expect(result.rmsDb).toBeLessThan(result.peakDb);
  });

  it('reflects a real level difference between quiet and loud halves', () => {
    const quiet = new Float32Array(RATE * 10).map(() => 0.02 * Math.sin(Math.random() * Math.PI));
    const loud = new Float32Array(RATE * 10).map(() => 0.4 * Math.sin(Math.random() * Math.PI));
    const track = new Float32Array(quiet.length + loud.length);
    track.set(quiet, 0);
    track.set(loud, quiet.length);
    const result = analyse(track);
    expect(result.dynamicRangeDb).toBeGreaterThan(15);
  });

  it('finds section boundaries where the arrangement changes', () => {
    const result = analyse(buildTrack({ seconds: 40 }));
    expect(result.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.sections[0]!.startSeconds).toBe(0);
    expect(result.sections[0]!.tier).toBe('sparse');
    const last = result.sections[result.sections.length - 1]!;
    expect(last.endSeconds).toBeGreaterThanOrEqual(38);
    // Never labels a section by musical function it cannot know.
    const labels = toAudioSections(result).map((section) => section.label.toLowerCase());
    expect(labels.join(' ')).not.toMatch(/verse|chorus|bridge|drop/);
  });

  it('refuses to invent a tempo for a rhythmless drone', () => {
    const drone = buildTrack({ seconds: 15, rhythmic: false });
    const result = analyse(drone);
    expect(result.tempoBpm).toBeNull();
  });

  it('estimates the tempo of a steady beat within a BPM', () => {
    for (const bpm of [90, 120, 140]) {
      const { bpm: estimate } = estimateTempo(buildTrack({ seconds: 40, bpm }), RATE);
      expect(estimate).not.toBeNull();
      expect(Math.abs((estimate ?? 0) - bpm)).toBeLessThanOrEqual(2);
    }
  });

  it('estimates the key of a triad but refuses a single note', () => {
    const minor = estimateKey(buildTrack({ seconds: 12, chord: [220, 261.63, 329.63], rhythmic: false }), RATE);
    expect(minor.key).toBe('A minor');
    expect(minor.confidence).toBeGreaterThan(0);
    expect(minor.confidence).toBeLessThanOrEqual(1);

    const single = estimateKey(buildTrack({ seconds: 12, chord: [220], rhythmic: false }), RATE);
    expect(single.key).toBeNull();
  });

  it('states its own limits instead of overselling the numbers', () => {
    const result = analyse(buildTrack({ seconds: 30 }));
    expect(result.notes[0]).toMatch(/nothing was uploaded|never leaves|in your browser/i);
    expect(result.notes.join(' ')).toMatch(/estimate|measured/i);
  });

  it('throws on an empty file rather than returning zeroed results', () => {
    expect(() => analyseAudio({ sampleRate: RATE, channels: [new Float32Array(0)] })).toThrow(/no samples/i);
  });

  it('formats timestamps for the chapter and section UI', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(600)).toBe('10:00');
  });
});

function song(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    title: 'Low Tide',
    artist: 'Demo Artist',
    lyrics: 'I keep your coat on the wrong hook\nI learned to be quiet in rooms that were never mine',
    song_brief: 'Written the week the flat was emptied out. Not a breakup song.',
    themes: ['leaving a shared home'],
    strongest_lyrics: ['I keep your coat on the wrong hook'],
    audio_sections: [],
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  } as Song;
}

describe('lyrics and song brief in AI context', () => {
  it('sends the song brief by default', () => {
    const context = songContext(song()) as Record<string, unknown>;
    expect(context.song_brief).toMatch(/breakup/i);
  });

  it('withholds the full lyrics unless the artist opts in', () => {
    const context = songContext(song()) as Record<string, unknown>;
    expect(context.lyrics).toBeUndefined();
    expect(context.strongest_lyrics).toEqual(['I keep your coat on the wrong hook']);
  });

  it('includes lyrics on request, capped in length', () => {
    const long = 'la '.repeat(MAX_LYRICS_CHARS);
    const context = songContext(song({ lyrics: long }), { includeLyrics: true }) as Record<string, unknown>;
    expect(typeof context.lyrics).toBe('string');
    expect((context.lyrics as string).length).toBe(MAX_LYRICS_CHARS);
    expect(context.lyrics_truncated).toBe(true);
  });

  it('defaults the opt-in to off and survives old stored preferences', () => {
    expect(defaultPreferences().include_lyrics_in_ai).toBe(false);
    const migrated = normalizePreferences({ artist_name: 'Someone' } as never);
    expect(migrated.include_lyrics_in_ai).toBe(false);
  });
});
