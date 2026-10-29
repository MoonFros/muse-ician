import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon, LogoMark, type IconName } from '../ui/Icons';
import { SaveIndicator } from '../ui/primitives';
import { Modal } from '../ui/Modal';
import { GlobalSearch } from './GlobalSearch';
import { NAV_ITEMS, sectionForPath } from '../../lib/navigation';
import { useWorkspace } from '../../state/workspace';
import { PLATFORM_LABELS } from '../../lib/types';
import { SEED_PRESET_COUNT } from '../../data/seedPresets';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data, demoRecordCount } = useWorkspace();
  const scheduled = data.planned_posts.filter((post) => post.status !== 'archived').length;
  const unreviewed = data.content_ideas.filter(
    (idea) => idea.status === 'published' && !data.performance_records.some((record) => record.content_idea_id === idea.id),
  ).length;

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        className="group flex items-center gap-3 rounded-xl px-2 py-1.5 focus-visible:outline-none"
        aria-label="muse-ician dashboard"
      >
        <span className="relative">
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-2xl bg-accent/25 opacity-70 blur-md transition-opacity duration-300 group-hover:opacity-100"
          />
          <LogoMark size={34} className="relative" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-[-0.02em] text-white">muse-ician</span>
          <span className="block truncate text-2xs text-slate-faint">Turn your music into your next idea</span>
        </span>
      </Link>

      <nav aria-label="Main" className="mt-7 flex-1">
        <p className="mb-2 px-2.5 text-3xs font-semibold uppercase tracking-[0.18em] text-slate-faint">Workspace</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200 ease-spring ${
                    isActive
                      ? 'bg-gradient-to-r from-accent/20 via-accent/[0.08] to-transparent font-medium text-white shadow-[inset_0_0_0_1px_rgba(123,107,255,0.28)]'
                      : 'text-slate-muted hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 h-5 w-[3px] rounded-full bg-gradient-to-b from-accent to-aqua transition-all duration-300 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <Icon
                      name={item.icon}
                      size={17}
                      className={
                        isActive
                          ? 'text-accent-soft drop-shadow-[0_0_6px_rgba(123,107,255,0.8)]'
                          : 'text-slate-faint transition-colors group-hover:text-slate-muted'
                      }
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/library' ? (
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-3xs tabular-nums text-slate-faint">
                        {data.presets.filter((preset) => !preset.is_archived).length}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
        <dl className="grid grid-cols-2 gap-2 text-2xs text-slate-faint">
          {[
            { label: 'Songs', value: data.songs.length },
            { label: 'Ideas', value: data.content_ideas.length },
            { label: 'Scheduled', value: scheduled },
            { label: 'To review', value: unreviewed },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 transition-colors hover:border-white/[0.12]"
            >
              <dt>{stat.label}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>
        {demoRecordCount > 0 ? (
          <p className="rounded-lg border border-warn/25 bg-warn/5 px-2.5 py-2 text-2xs leading-relaxed text-warn">
            {demoRecordCount} demo records are in this workspace. Sample data is labelled and removable in Settings.
          </p>
        ) : null}
        <p className="px-1 text-2xs leading-relaxed text-slate-faint">
          Saved in this browser only. Export a backup from Import / Export.
        </p>
      </div>
    </div>
  );
}

function QuickAddMenu({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const actions: { label: string; description: string; icon: IconName; to: string }[] = [
    {
      label: 'New song',
      description: 'Create a song record to plan around',
      icon: 'song',
      to: '/songs?new=1',
    },
    {
      label: 'New idea from a preset',
      description: `Browse ${SEED_PRESET_COUNT} starter concepts`,
      icon: 'library',
      to: '/library?pick=1',
    },
    {
      label: 'New custom preset',
      description: 'Build a reusable concept of your own',
      icon: 'sparkle',
      to: '/library?new=1',
    },
    {
      label: 'Log a result',
      description: 'Record how a published post did',
      icon: 'chart',
      to: '/journal?new=1',
    },
  ];

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 animate-pop-in overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b0b16]/95 p-1.5 shadow-lift backdrop-blur-xl">
      <p className="px-2.5 py-1.5 text-2xs uppercase tracking-[0.1em] text-slate-faint">Quick add</p>
      <ul>
        {actions.map((action) => (
          <li key={action.to}>
            <button
              type="button"
              onClick={() => {
                navigate(action.to);
                onClose();
              }}
              className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <Icon name={action.icon} size={15} className="mt-0.5 text-accent-soft drop-shadow-[0_0_6px_rgba(123,107,255,0.6)]" />
              <span>
                <span className="block text-sm text-slate-text">{action.label}</span>
                <span className="block text-2xs text-slate-faint">{action.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const { saveState, storage, loading, loadError, integrations, data } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const meta = sectionForPath(location.pathname);

  const mobileItems = useMemo(() => NAV_ITEMS.filter((item) => item.mobile), []);
  const overflowItems = useMemo(() => NAV_ITEMS.filter((item) => !item.mobile), []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === '/' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setQuickAddOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-accent-deep focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <aside className="relative hidden border-r border-white/[0.06] bg-[#06060c]/60 p-3 backdrop-blur-xl lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
        <SidebarContent />
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07070f]/70 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link to="/" className="lg:hidden" aria-label="muse-ician dashboard">
              <LogoMark size={28} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-3xs font-semibold uppercase tracking-[0.18em] text-slate-faint">
                <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-aqua shadow-[0_0_8px_2px_rgba(63,220,255,0.6)]" />
                {meta.section}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-white">{meta.title}</p>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-xs text-slate-faint transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-text sm:flex"
            >
              <Icon name="search" size={14} />
              Search
              <span className="kbd">⌘K</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickAddOpen((open) => !open)}
                className="btn-primary btn-sm"
                aria-expanded={quickAddOpen}
                aria-haspopup="menu"
              >
                <Icon name="plus" size={14} />
                <span className="hidden sm:inline">New</span>
              </button>
              {quickAddOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setQuickAddOpen(false)}
                    aria-hidden="true"
                  />
                  <div role="menu" aria-label="Quick add">
                    <QuickAddMenu onClose={() => setQuickAddOpen(false)} />
                  </div>
                </>
              ) : null}
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <Link to="/settings" className="btn-icon" aria-label="Settings" title="Settings">
                <Icon name="settings" size={16} />
              </Link>
            </div>

            <div className="hidden lg:block">
              <SaveIndicator status={saveState.status} message={saveState.message} at={saveState.at} />
            </div>
          </div>

          {loadError || !storage.available ? (
            <div className="border-t border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger sm:px-6 lg:px-8">
              {loadError ?? storage.message}
            </div>
          ) : null}
          {integrations && !integrations.ai.configured && !integrations.ai.mock ? (
            <div className="border-t border-white/[0.06] bg-white/[0.025] px-4 py-1.5 text-2xs text-slate-faint sm:px-6 lg:px-8">
              Local mode: AI coaching and live trend research are optional and currently off. Everything else works.
            </div>
          ) : null}
        </header>

        <main id="main" className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12">
          <div className="mx-auto w-full max-w-[1180px]">
            {loading ? (
              <div className="space-y-3" role="status" aria-label="Loading workspace">
                <div className="skeleton h-8 w-64" />
                <div className="skeleton h-4 w-96" />
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="skeleton h-36" />
                  <div className="skeleton h-36" />
                  <div className="skeleton h-36" />
                </div>
              </div>
            ) : (
              <div key={location.pathname} className="animate-fade-up">
                <Outlet />
              </div>
            )}
          </div>
        </main>

        <footer className="hidden border-t border-white/[0.05] px-4 py-3 text-2xs text-slate-faint sm:block sm:px-6 lg:px-8">
          <span>muse-ician v1.0.0 · schema 1.0.0 · </span>
          <span>
            Built for independent musicians. Scores and suggestions are editorial guidance, not predictions of reach.
          </span>
        </footer>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#07070f]/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {mobileItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                    isActive ? 'text-white' : 'text-slate-faint'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-4 top-0 h-[2px] rounded-full bg-gradient-to-r from-accent to-aqua transition-opacity duration-300 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <Icon
                      name={item.icon}
                      size={19}
                      className={
                        isActive
                          ? 'text-accent-soft drop-shadow-[0_0_8px_rgba(123,107,255,0.8)]'
                          : 'text-slate-faint'
                      }
                    />
                    {item.shortLabel}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[10px] text-slate-faint transition-colors hover:text-slate-muted"
            >
              <Icon name="more" size={19} />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        description="Also available on desktop from the sidebar."
        size="sm"
      >
        <ul className="space-y-1">
          {[...overflowItems, ...NAV_ITEMS.filter((item) => item.to === '/settings')].map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.05]"
              >
                <Icon name={item.icon} size={17} className="mt-0.5 text-accent-soft" />
                <span>
                  <span className="block text-sm text-slate-text">{item.label}</span>
                  <span className="block text-2xs text-slate-faint">{item.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
          <SaveIndicator status={saveState.status} message={saveState.message} at={saveState.at} />
          <p className="mt-2 text-2xs leading-relaxed text-slate-faint">
            Stored in this browser ({storage.backend}). It does not sync between devices.
          </p>
        </div>
        <p className="mt-3 text-2xs text-slate-faint">
          Preferred platforms: {data.preferences.preferred_platforms.map((p) => PLATFORM_LABELS[p]).join(', ') || 'none set'}
        </p>
      </Modal>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
