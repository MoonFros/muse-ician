import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { Modal } from '../src/components/ui/Modal';
import { ToastProvider, useToast } from '../src/components/ui/Toast';
import { WorkspaceProvider } from '../src/state/workspace';
import { createMemoryRepository } from '../src/storage/repository';
import App from '../src/App';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Accessible dialog" description="Focus should stay inside.">
        <label htmlFor="inside">Inside field</label>
        <input id="inside" />
      </Modal>
    </div>
  );
}

describe('accessibility', () => {
  it('closes a dialog on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText(/inside field/i)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('announces toasts in a live region', async () => {
    function Trigger() {
      const { toast } = useToast();
      return (
        <button type="button" onClick={() => toast('Saved locally', { tone: 'success' })}>
          Fire toast
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: /fire toast/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/saved locally/i);
  });

  it('gives the icon-only settings link an accessible name and a skip link', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ToastProvider>
          <WorkspaceProvider repository={createMemoryRepository()}>
            <App />
          </WorkspaceProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
    const settingsLinks = screen.getAllByRole('link', { name: /^settings$/i });
    expect(settingsLinks.length).toBeGreaterThan(0);
    for (const link of settingsLinks) expect(link).toHaveAttribute('href', '/settings');
  });
});
