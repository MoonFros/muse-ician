import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icons';
import { SectionCard } from '../ui/primitives';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Install / offline status.
 *
 * `beforeinstallprompt` only fires in a production build served over HTTPS with
 * a service worker, so in `npm run dev` this card explains that instead of
 * pretending an install button exists.
 */
export function InstallCard() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setSwReady(Boolean(navigator.serviceWorker?.controller));

    navigator.serviceWorker?.ready.then(() => setSwReady(true)).catch(() => setSwReady(false));

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setMessage(choice.outcome === 'accepted' ? 'Installed.' : 'Install dismissed — you can try again from the browser menu.');
    setPromptEvent(null);
  };

  return (
    <SectionCard
      title="Install and offline use"
      description="Installed, muse-ician opens in its own window and keeps working without a connection."
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-2xs uppercase tracking-[0.12em] text-slate-faint">Service worker</p>
            <p className={`mt-1 text-sm ${swReady ? 'text-ok' : 'text-slate-muted'}`}>
              {swReady ? 'Active — the app shell is cached' : 'Not registered in this session'}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-2xs uppercase tracking-[0.12em] text-slate-faint">Install state</p>
            <p className={`mt-1 text-sm ${installed ? 'text-ok' : 'text-slate-muted'}`}>
              {installed ? 'Installed' : promptEvent ? 'Ready to install' : 'Not installed'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={install} disabled={!promptEvent || installed}>
            <Icon name="download" size={13} />
            {installed ? 'Already installed' : 'Install muse-ician'}
          </button>
        </div>

        {message ? <p className="text-2xs text-slate-muted">{message}</p> : null}

        {!promptEvent && !installed ? (
          <p className="text-2xs leading-relaxed text-slate-faint">
            The install prompt appears only for a production build served over HTTPS (your Vercel deployment). In
            <span className="font-mono"> npm run dev</span> this card stays inactive by design. Offline data lives in this
            browser either way — export a JSON backup before clearing site data.
          </p>
        ) : null}

        <p className="text-2xs leading-relaxed text-slate-faint">
          What works offline: the preset library, ideas, coaching rubric, metadata, calendar, journal, exports and
          imports. What does not: AI reviews and live trend research, which need the server.
        </p>
      </div>
    </SectionCard>
  );
}
