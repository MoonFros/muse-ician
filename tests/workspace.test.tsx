import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from '../src/state/workspace';
import { createMemoryRepository } from '../src/storage/repository';
import { ToastProvider } from '../src/components/ui/Toast';
import { buildCustomIdea } from '../src/lib/ideas';

type Api = ReturnType<typeof useWorkspace>;
let api: Api | null = null;

function Probe() {
  const workspace = useWorkspace();
  api = workspace;
  return (
    <div>
      <span data-testid="presets">{workspace.data.presets.length}</span>
      <span data-testid="ideas">{workspace.data.content_ideas.length}</span>
      <span data-testid="demo">{workspace.demoRecordCount}</span>
      <span data-testid="loading">{String(workspace.loading)}</span>
      <span data-testid="songs">{workspace.data.songs.length}</span>
    </div>
  );
}

function wrap(children: ReactNode, repository = createMemoryRepository()) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <WorkspaceProvider repository={repository}>{children}</WorkspaceProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('workspace persistence', () => {
  it('seeds the 30 starter presets on first load', async () => {
    render(wrap(<Probe />));
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('presets')).toHaveTextContent('30');
  });

  it('persists records across a remount with the same storage', async () => {
    const repository = createMemoryRepository();
    const first = render(wrap(<Probe />, repository));
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    const idea = buildCustomIdea();
    idea.title = 'Persisted idea';
    await act(async () => {
      await api!.upsertIdeas([idea]);
    });
    await waitFor(() => expect(screen.getByTestId('ideas')).toHaveTextContent('1'));
    first.unmount();

    render(wrap(<Probe />, repository));
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('ideas')).toHaveTextContent('1');
    expect(api!.data.content_ideas[0]!.title).toBe('Persisted idea');
  });

  it('adds demo data clearly flagged and removes only the demo records', async () => {
    const repository = createMemoryRepository();
    render(wrap(<Probe />, repository));
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    const ownIdea = buildCustomIdea();
    await act(async () => {
      await api!.upsertIdeas([ownIdea]);
      await api!.addDemoData();
    });
    await waitFor(() => expect(screen.getByTestId('demo')).not.toHaveTextContent('0'));
    const demoCount = api!.demoRecordCount;
    expect(demoCount).toBeGreaterThan(10);
    expect(api!.data.content_ideas.every((idea) => idea.is_demo || idea.id === ownIdea.id)).toBe(true);

    await act(async () => {
      await api!.clearDemoData();
    });
    await waitFor(() => expect(screen.getByTestId('demo')).toHaveTextContent('0'));
    expect(api!.data.content_ideas).toHaveLength(1);
    expect(api!.data.content_ideas[0]!.id).toBe(ownIdea.id);
  });

  it('removes linked records without destroying the rest of the workspace', async () => {
    render(wrap(<Probe />));
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await act(async () => {
      await api!.addDemoData();
    });
    const song = api!.data.songs[0]!;
    const ideasBefore = api!.data.content_ideas.length;

    await act(async () => {
      await api!.removeSongs([song.id]);
    });
    expect(api!.data.songs).toHaveLength(0);
    expect(api!.data.content_ideas).toHaveLength(ideasBefore);
    expect(api!.data.content_ideas.every((idea) => idea.song_id !== song.id)).toBe(true);
  });
});
