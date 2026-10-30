import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icons';
import { Menu } from '../ui/Menu';
import { PLATFORM_LABELS } from '../../lib/types';
import type { Preset } from '../../lib/types';
import { formatDuration, formatMinutes, truncate } from '../../lib/utils';

export interface PresetCardActions {
  onUse?: (preset: Preset) => void;
  onCustomize?: (preset: Preset) => void;
  onToggleFavorite?: (preset: Preset) => void;
  onDuplicate?: (preset: Preset) => void;
  onEdit?: (preset: Preset) => void;
  onArchive?: (preset: Preset) => void;
  onRestore?: (preset: Preset) => void;
  onExport?: (preset: Preset) => void;
  onDelete?: (preset: Preset) => void;
}

export function PresetCard({
  preset,
  view = 'grid',
  selected,
  onSelect,
  actions = {},
  layout = 'card',
}: {
  preset: Preset;
  view?: 'grid' | 'list';
  selected?: boolean;
  onSelect?: (preset: Preset, selected: boolean) => void;
  actions?: PresetCardActions;
  layout?: 'card' | 'compact';
}) {
  const menuItems = [
    actions.onUse ? { label: 'Use for a song', icon: 'sparkle' as const, onSelect: () => actions.onUse?.(preset) } : null,
    actions.onCustomize
      ? { label: 'Customize my idea', icon: 'edit' as const, onSelect: () => actions.onCustomize?.(preset) }
      : null,
    actions.onDuplicate ? { label: 'Duplicate', icon: 'copy' as const, onSelect: () => actions.onDuplicate?.(preset) } : null,
    actions.onEdit ? { label: 'Edit preset', icon: 'edit' as const, onSelect: () => actions.onEdit?.(preset) } : null,
    actions.onExport ? { label: 'Export JSON', icon: 'download' as const, onSelect: () => actions.onExport?.(preset) } : null,
    { separator: true as const },
    actions.onArchive && !preset.is_archived
      ? { label: 'Archive', icon: 'archive' as const, onSelect: () => actions.onArchive?.(preset) }
      : null,
    actions.onRestore && preset.is_archived
      ? { label: 'Restore', icon: 'restore' as const, onSelect: () => actions.onRestore?.(preset) }
      : null,
    actions.onDelete ? { label: 'Delete permanently', icon: 'trash' as const, danger: true, onSelect: () => actions.onDelete?.(preset) } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const platformLabels = preset.platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform);

  const header = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-white">
            <Link to={`/library/${preset.id}`} className="rounded hover:text-accent-soft">
              {preset.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-muted">
            {truncate(preset.summary, view === 'list' ? 180 : 120)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions.onToggleFavorite ? (
            <button
              type="button"
              onClick={() => actions.onToggleFavorite?.(preset)}
              className={`rounded-md p-1.5 transition-colors ${
                preset.is_favorite ? 'text-warn' : 'text-slate-faint hover:text-warn'
              }`}
              aria-pressed={Boolean(preset.is_favorite)}
              aria-label={preset.is_favorite ? `Remove ${preset.title} from favourites` : `Add ${preset.title} to favourites`}
            >
              <Icon name={preset.is_favorite ? 'star-filled' : 'star'} size={16} />
            </button>
          ) : null}
          {menuItems.length ? <Menu items={menuItems} label={`Actions for ${preset.title}`} /> : null}
        </div>
      </div>
    </>
  );

  const meta = (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="chip">{formatDuration(preset.duration_seconds)}</span>
      <span className={`chip ${preset.difficulty === 'easy' ? 'text-ok' : preset.difficulty === 'moderate' ? 'text-warn' : 'text-danger'}`}>
        {preset.difficulty}
      </span>
      <span className="chip">{preset.budget} budget</span>
      {preset.is_user_created ? <span className="chip-accent">Yours</span> : null}
      {preset.is_demo ? <span className="chip-warn">Demo</span> : null}
      {preset.is_archived ? <span className="chip border-white/[0.10] text-slate-faint">Archived</span> : null}
      {layout !== 'compact' ? (
        <span className="chip">
          <Icon name="clock" size={11} />
          {formatMinutes(preset.estimated_production_minutes)}
        </span>
      ) : null}
    </div>
  );

  if (view === 'list' || layout === 'compact') {
    return (
      <li
        className={`relative flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200 ease-spring ${
          selected
            ? 'border-accent/50 bg-accent-dim/30'
            : 'border-white/[0.07] bg-white/[0.022] hover:-translate-y-px hover:border-white/[0.16] hover:bg-white/[0.04]'
        }`}
      >
        {onSelect ? (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/[0.16] bg-ink-900 accent-accent-deep"
            checked={Boolean(selected)}
            onChange={(event) => onSelect(preset, event.target.checked)}
            aria-label={`Select ${preset.title}`}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {header}
          {layout !== 'compact' ? <p className="mt-2 hidden text-2xs text-slate-faint sm:block">{platformLabels.join(' · ')}</p> : null}
          {meta}
        </div>
        {actions.onUse ? (
          <button type="button" className="btn-primary btn-sm hidden shrink-0 sm:inline-flex" onClick={() => actions.onUse?.(preset)}>
            Use
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl2 border p-4 transition-all duration-300 ease-spring hover:-translate-y-1 ${
        selected
          ? 'border-accent/60 bg-accent-dim/25 shadow-glow'
          : 'border-white/[0.07] bg-white/[0.022] hover:border-white/[0.16] hover:bg-white/[0.04] hover:shadow-lift'
      }`}
    >
      {/* Top accent line that lights up on hover — the signature interaction. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      {onSelect ? (
        <label className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-black/50 backdrop-blur">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/[0.16] bg-ink-900 accent-accent-deep"
            checked={Boolean(selected)}
            onChange={(event) => onSelect(preset, event.target.checked)}
            aria-label={`Select ${preset.title}`}
          />
        </label>
      ) : null}
      <div className={onSelect ? 'pr-8' : ''}>{header}</div>
      {meta}
      <p className="mt-3 text-2xs leading-relaxed text-slate-faint">{platformLabels.join(' · ')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-3">
        <Link to={`/library/${preset.id}`} className="btn-secondary btn-sm">
          Details
        </Link>
        {actions.onUse ? (
          <button type="button" className="btn-primary btn-sm" onClick={() => actions.onUse?.(preset)}>
            Use for a song
          </button>
        ) : null}
      </div>
    </article>
  );
}
