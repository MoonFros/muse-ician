import { render, screen, waitFor, within } from '@testing-library/react';
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

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <WorkspaceProvider repository={createMemoryRepository()}>
          <Capture />
          <App />
        </WorkspaceProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('core journey', () => {
  it('adds a song through the form and persists it', async () => {
    const user = userEvent.setup();
    renderApp('/songs');
    await waitFor(() => expect(api?.loading).toBe(false));

    await user.click(await screen.findByRole('button', { name: /^add song$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/song title/i), 'Low Tide');
    const genreFields = within(dialog).getAllByLabelText(/genre/i);
    await user.type(genreFields[0]!, 'indie pop');
    await user.click(within(dialog).getByRole('button', { name: /^add song$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Low Tide')).toBeInTheDocument();
    expect(api?.data.songs).toHaveLength(1);
    expect(api?.data.songs[0]?.title).toBe('Low Tide');
  });

  it('shows a validation error instead of saving a song with no title', async () => {
    const user = userEvent.setup();
    renderApp('/songs');
    await waitFor(() => expect(api?.loading).toBe(false));
    await user.click(await screen.findByRole('button', { name: /^add song$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^add song$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());
    expect(api?.data.songs).toHaveLength(0);
  });

  it('creates an idea from a preset and opens its workspace', async () => {
    const user = userEvent.setup();
    renderApp('/library?pick=1');
    await waitFor(() => expect(api?.loading).toBe(false));

    const useButtons = await screen.findAllByRole('button', { name: /use for a song/i });
    await user.click(useButtons[0]!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/copied into the idea/i)).toBeTruthy();
    const titleField = within(dialog).getByLabelText(/idea title/i);
    await user.clear(titleField);
    await user.type(titleField, 'My first idea');
    await user.click(within(dialog).getByRole('button', { name: /create idea/i }));

    await waitFor(() => expect(api?.data.content_ideas).toHaveLength(1));
    expect(api?.data.content_ideas[0]?.title).toBe('My first idea');
    expect(api?.data.content_ideas[0]?.source_preset_id).toBeTruthy();
    // Routed into the idea workspace.
    expect(await screen.findByRole('heading', { level: 1, name: /my first idea|idea workspace/i })).toBeInTheDocument();
  });

  it('records a performance result and shows it in the journal', async () => {
    const user = userEvent.setup();
    renderApp('/journal');
    await waitFor(() => expect(api?.loading).toBe(false));

    const logButtons = await screen.findAllByRole('button', { name: /log a result|log your first result/i });
    await user.click(logButtons[0]!);
    const dialog = await screen.findByRole('dialog');
    const views = within(dialog).getByLabelText(/^views/i);
    await user.clear(views);
    await user.type(views, '1200');
    await user.click(within(dialog).getByRole('button', { name: /^(log result|save result)$/i }));

    await waitFor(() => expect(api?.data.performance_records).toHaveLength(1));
    expect(api?.data.performance_records[0]?.views).toBe(1200);
  });
});
