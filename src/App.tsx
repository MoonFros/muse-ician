import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import DashboardPage from './pages/Dashboard';
import IdeaLibraryPage from './pages/IdeaLibrary';
import PresetDetailPage from './pages/PresetDetail';
import IdeaWorkspacePage from './pages/IdeaWorkspace';
import SongsPage from './pages/Songs';
import SongDetailPage from './pages/SongDetail';
import CreativeCoachPage from './pages/CreativeCoach';
import MetadataStudioPage from './pages/MetadataStudio';
import ContentCalendarPage from './pages/ContentCalendar';
import PerformanceJournalPage from './pages/PerformanceJournal';
import TrendsPage from './pages/Trends';
import ImportExportPage from './pages/ImportExport';
import SettingsPage from './pages/Settings';
import { EmptyState } from './components/ui/primitives';
import { LogoMark } from './components/ui/Icons';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console only: nothing about your workspace is sent anywhere.
    console.error('muse-ician render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-5 text-center">
        <LogoMark size={44} />
        <h1 className="text-xl font-semibold text-white">Something broke while rendering this screen</h1>
        <p className="text-sm leading-relaxed text-slate-muted">
          Your saved work is still in this browser — nothing was deleted. Reload to recover, and if it keeps happening
          export a backup from the Settings page once the app opens again.
        </p>
        <pre className="max-h-40 w-full overflow-auto rounded-xl border border-ink-700 bg-ink-900/60 p-3 text-left text-2xs text-slate-faint scroll-thin">
          {this.state.error.message}
        </pre>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload app
          </button>
          <a className="btn-secondary" href="/">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }
}

function NotFoundPage() {
  const location = useLocation();
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon="search"
        title="That page does not exist"
        description={`Nothing is stored at ${location.pathname}. The address may be mistyped, or the record was deleted.`}
        actions={
          <Link to="/" className="btn-primary btn-sm">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="library" element={<IdeaLibraryPage />} />
          <Route path="library/:presetId" element={<PresetDetailPage />} />
          <Route path="ideas/:ideaId" element={<IdeaWorkspacePage />} />
          <Route path="songs" element={<SongsPage />} />
          <Route path="songs/:songId" element={<SongDetailPage />} />
          <Route path="coach" element={<CreativeCoachPage />} />
          <Route path="metadata" element={<MetadataStudioPage />} />
          <Route path="calendar" element={<ContentCalendarPage />} />
          <Route path="journal" element={<PerformanceJournalPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="import-export" element={<ImportExportPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="results" element={<Navigate to="/journal" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppErrorBoundary>
  );
}
