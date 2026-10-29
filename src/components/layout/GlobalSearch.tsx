import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icons';
import { PLATFORM_LABELS } from '../../lib/types';
import { useWorkspace } from '../../state/workspace';
import { truncate } from '../../lib/utils';

interface SearchResult {
  id: string;
  kind: 'Preset' | 'Song' | 'Idea' | 'Package';
  title: string;
  subtitle: string;
  to: string;
  icon: IconName;
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const matches = (values: (string | null | undefined)[]) =>
      values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));

    const presets: SearchResult[] = data.presets
      .filter(
        (preset) =>
          !preset.is_archived &&
          matches([preset.title, preset.summary, preset.description, ...preset.tags, ...preset.hook_examples]),
      )
      .slice(0, 6)
      .map((preset) => ({
        id: preset.id,
        kind: 'Preset',
        title: preset.title,
        subtitle: truncate(preset.summary, 110),
        to: `/library/${preset.id}`,
        icon: 'library',
      }));

    const songs: SearchResult[] = data.songs
      .filter((song) => matches([song.title, song.artist, song.genre, song.subgenre, ...(song.moods ?? []), ...(song.themes ?? [])]))
      .slice(0, 4)
      .map((song) => ({
        id: song.id,
        kind: 'Song',
        title: song.title,
        subtitle: [song.artist, song.genre, song.release_status].filter(Boolean).join(' · ') || 'Song record',
        to: `/songs/${song.id}`,
        icon: 'song',
      }));

    const ideas: SearchResult[] = data.content_ideas
      .filter((idea) => matches([idea.title, idea.concept_description, idea.hook, idea.notes]))
      .slice(0, 5)
      .map((idea) => {
        const song = data.songs.find((item) => item.id === idea.song_id);
        return {
          id: idea.id,
          kind: 'Idea',
          title: idea.title,
          subtitle: song ? `For ${song.title}` : 'No song linked',
          to: `/ideas/${idea.id}`,
          icon: 'sparkle',
        };
      });

    const packages: SearchResult[] = data.metadata_packages
      .filter((pkg) => matches([pkg.title, pkg.caption, pkg.description]))
      .slice(0, 4)
      .map((pkg) => ({
        id: pkg.id,
        kind: 'Package',
        title: pkg.title,
        subtitle: `${PLATFORM_LABELS[pkg.platform]} package`,
        to: `/metadata?package=${pkg.id}`,
        icon: 'tag',
      }));

    return [...presets, ...songs, ...ideas, ...packages].slice(0, 14);
  }, [data, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const go = (result: SearchResult | undefined) => {
    if (!result) return;
    navigate(result.to);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search muse-ician"
        className="relative z-10 w-full max-w-xl animate-pop-in overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0a0a14]/95 shadow-[0_40px_120px_-40px_rgba(0,0,0,1)] backdrop-blur-2xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => Math.min(results.length - 1, index + 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            go(results[activeIndex]);
          }
        }}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.08] px-4">
          <Icon name="search" size={16} className="shrink-0 text-accent-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search presets, songs, ideas, packages…"
            aria-label="Search presets, songs, ideas and packages"
            className="w-full border-0 bg-transparent py-4 text-sm text-slate-text placeholder:text-slate-faint focus:outline-none"
          />
          <button type="button" onClick={onClose} className="kbd" aria-label="Close search">
            Esc
          </button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2 scroll-thin">
          {!query.trim() ? (
            <p className="px-3 py-6 text-center text-xs text-slate-faint">
              Type to search. Matches titles, descriptions, tags, hooks, genres and moods.
            </p>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-slate-text">No matches for “{query.trim()}”</p>
              <p className="mt-1 text-xs text-slate-faint">
                Try a shorter phrase, or browse the Idea Library by filter.
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {results.map((result, index) => (
                <li key={`${result.kind}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => go(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      index === activeIndex ? 'bg-accent-dim/60 shadow-[inset_0_0_0_1px_rgba(123,107,255,0.3)]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon name={result.icon} size={15} className="mt-0.5 shrink-0 text-accent-soft" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-sm text-slate-text">{result.title}</span>
                        <span className="shrink-0 text-2xs uppercase tracking-wide text-slate-faint">
                          {result.kind}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-faint">{result.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
