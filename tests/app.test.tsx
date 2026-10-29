import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { WorkspaceProvider } from '../src/state/workspace';
import { createMemoryRepository } from '../src/storage/repository';
import { ToastProvider } from '../src/components/ui/Toast';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <WorkspaceProvider repository={createMemoryRepository()}>
          <App />
        </WorkspaceProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('routing', () => {
  it('renders the dashboard', async () => {
    renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: /what should you make next/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Turn your music into your next idea/i).length).toBeGreaterThan(0);
  });

  it.each([
    ['/library', /video concept presets/i],
    ['/songs', /songs and campaigns/i],
    ['/coach', /evaluate before you film/i],
    ['/metadata', /publishing packages/i],
    ['/calendar', /plan what goes out/i],
    ['/series', /one idea, several parts/i],
    ['/runway', /work backwards from the release/i],
    ['/journal', /results you recorded yourself/i],
    ['/trends', /only assess what you can attribute/i],
    ['/import-export', /move your work in and out/i],
    ['/settings', /profile, defaults and data ownership/i],
  ])('renders %s without crashing', async (path, heading) => {
    renderRoute(path);
    const match = await screen.findAllByRole('heading', { level: 1 });
    expect(match.length).toBeGreaterThan(0);
    await waitFor(() => expect(match[0]!.textContent ?? '').toMatch(heading));
  });

  it('shows a not-found page for unknown routes', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByText(/that page does not exist/i)).toBeInTheDocument();
  });

  it('lists every primary destination in the navigation', async () => {
    renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    const nav = screen.getAllByRole('navigation', { name: /main/i })[0]!;
    expect(nav.textContent).toMatch(/Preset library/);
    expect(nav.textContent).toMatch(/Content calendar/);
    expect(nav.textContent).toMatch(/Performance journal/);
  });
});
