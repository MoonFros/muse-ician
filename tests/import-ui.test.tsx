import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { WorkspaceProvider, useWorkspace } from '../src/state/workspace';
import { createMemoryRepository } from '../src/storage/repository';
import { ToastProvider } from '../src/components/ui/Toast';

type Api = ReturnType<typeof useWorkspace>;
let api: Api | null = null;

function Capture() {
  api = useWorkspace();
  return null;
}

const example = readFileSync(path.resolve(__dirname, '../public/example.json'), 'utf8');

function renderImport() {
  return render(
    <MemoryRouter initialEntries={['/import-export']}>
      <ToastProvider>
        <WorkspaceProvider repository={createMemoryRepository()}>
          <Capture />
          <App />
        </WorkspaceProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('import screen', () => {
  it('validates an uploaded file, previews it and imports only after confirmation', async () => {
    const user = userEvent.setup();
    renderImport();
    await waitFor(() => expect(api?.loading).toBe(false));

    const presetsBefore = api!.data.presets.length;
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File([example], 'example.json', { type: 'application/json' }));

    expect(await screen.findByText(/valid file/i)).toBeInTheDocument();
    expect(api!.data.presets.length).toBe(presetsBefore);

    const importButton = await screen.findByRole('button', { name: /^import \d+ record/i });
    await user.click(importButton);

    await waitFor(() => expect(api!.data.content_ideas.length).toBeGreaterThan(0));
    expect(api!.data.presets.some((preset) => preset.title === 'Placeholder preset — copy this shape')).toBe(true);
    // Nothing from the template is passed off as real: the placeholder song stays labelled.
    const song = api!.data.songs[0]!;
    expect(song.title.toLowerCase()).toContain('placeholder');
  });

  it('rejects a file that is not valid JSON without touching the workspace', async () => {
    const user = userEvent.setup();
    renderImport();
    await waitFor(() => expect(api?.loading).toBe(false));
    const before = JSON.stringify(api!.data);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['{ not json'], 'broken.json', { type: 'application/json' }));

    expect((await screen.findAllByText(/could not be read/i)).length).toBeGreaterThan(0);
    expect(JSON.stringify(api!.data)).toBe(before);
  });
});
