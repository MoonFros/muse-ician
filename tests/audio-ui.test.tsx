import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { AudioAnalysisCard } from '../src/components/song/AudioAnalysisCard';
import { ToastProvider } from '../src/components/ui/Toast';
import { WorkspaceProvider, useWorkspace } from '../src/state/workspace';
import { createMemoryRepository } from '../src/storage/repository';
import type { Song } from '../src/lib/types';

const RATE = 11025;

/**
 * jsdom has no Web Audio API, so the decoder is stubbed with a real synthetic
 * buffer. Everything after decoding — the analysis and the write-back — is the
 * production code path.
 */
function buildBuffer(seconds = 24, bpm = 120) {
  const length = RATE * seconds;
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / RATE;
    const level = t < 8 ? 0.05 : t < 16 ? 0.12 : 0.2;
    data[i] =
      level *
      (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 261.63 * t) + Math.sin(2 * Math.PI * 329.63 * t)) /
      3;
  }
  const beat = 60 / bpm;
  for (let t = 0; t < seconds; t += beat) {
    const start = Math.round(t * RATE);
    for (let k = 0; k < 220 && start + k < length; k += 1) {
      data[start + k] = data[start + k]! + 0.4 * Math.exp(-k / 60) * Math.sin((2 * Math.PI * 150 * k) / RATE);
    }
  }
  return {
    numberOfChannels: 1,
    sampleRate: RATE,
    duration: seconds,
    length,
    getChannelData: () => data,
  };
}

class FakeAudioContext {
  async decodeAudioData(): Promise<unknown> {
    return buildBuffer();
  }
  async close(): Promise<void> {
    return undefined;
  }
}

const originalAudioContext = (globalThis as { AudioContext?: unknown }).AudioContext;

beforeEach(() => {
  (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
});

afterEach(() => {
  (globalThis as { AudioContext?: unknown }).AudioContext = originalAudioContext;
});

const song: Song = {
  id: 'song-ui',
  title: 'Low Tide',
  artist: 'Demo Artist',
  lyrics: 'I keep your coat on the wrong hook',
  song_brief: null,
  themes: [],
  strongest_lyrics: [],
  audio_sections: [],
  bpm: null,
  musical_key: null,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
} as Song;

function Probe() {
  const { data } = useWorkspace();
  const stored = data.songs.find((item) => item.id === song.id);
  return (
    <output data-testid="probe">
      {JSON.stringify({
        bpm: stored?.bpm ?? null,
        key: stored?.musical_key ?? null,
        sections: stored?.audio_sections?.length ?? 0,
      })}
    </output>
  );
}

function wrap(children: ReactNode) {
  return (
    <ToastProvider>
      <WorkspaceProvider repository={createMemoryRepository()}>{children}</WorkspaceProvider>
    </ToastProvider>
  );
}

function fakeFile(): File {
  const file = new File(['not really audio'], 'low-tide.wav', { type: 'audio/wav' });
  if (typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(8) });
  }
  return file;
}

describe('audio analysis card', () => {
  it('states plainly that nothing is uploaded before a file is chosen', () => {
    render(wrap(<AudioAnalysisCard song={song} />));
    expect(screen.getByRole('button', { name: /choose an audio file/i })).toBeTruthy();
    expect(screen.getByText(/nothing is uploaded/i)).toBeTruthy();
    expect(screen.getByText(/never sent|not uploaded|no ai/i)).toBeTruthy();
  });

  it('measures a file, shows the results, and only writes after Apply', async () => {
    const { container } = render(
      wrap(
        <>
          <AudioAnalysisCard song={song} />
          <Probe />
        </>,
      ),
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('"bpm":null'));

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fakeFile()] } });

    await screen.findByText(/apply to song/i, undefined, { timeout: 5000 });
    expect(screen.getByText(/runtime/i)).toBeTruthy();
    // Nothing has been written yet.
    expect(screen.getByTestId('probe')).toHaveTextContent('"bpm":null');
    expect(screen.getByTestId('probe')).toHaveTextContent('"sections":0');

    fireEvent.click(screen.getByRole('button', { name: /apply to song/i }));

    await waitFor(
      () => {
        const state = JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as {
          bpm: number | null;
          key: string | null;
          sections: number;
        };
        expect(state.sections).toBeGreaterThan(1);
        expect(state.bpm).not.toBeNull();
        expect(state.key).toMatch(/estimate/);
      },
      { timeout: 5000 },
    );
    const state = JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as { bpm: number };
    expect(Math.abs(state.bpm - 120)).toBeLessThanOrEqual(2);
  });

  it('explains itself instead of failing silently when the browser cannot decode', async () => {
    (globalThis as { AudioContext?: unknown }).AudioContext = undefined;
    const { container } = render(wrap(<AudioAnalysisCard song={song} />));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fakeFile()] } });
    expect(await screen.findByText(/web audio api/i, undefined, { timeout: 5000 })).toBeTruthy();
  });
});
