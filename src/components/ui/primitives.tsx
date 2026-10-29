import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icons';
import { useToast } from './Toast';
import { copyToClipboard, toDateKey } from '../../lib/utils';
import type { SaveState, WorkflowStatus } from '../../lib/types';
import { WORKFLOW_LABELS } from '../../lib/types';

export interface Breadcrumb {
  label: string;
  to?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
}) {
  return (
    <header className="relative flex flex-wrap items-start justify-between gap-4 pb-5">
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1.5 text-2xs text-slate-faint">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden="true" className="text-white/20">/</span> : null}
                  {crumb.to ? (
                    <Link to={crumb.to} className="rounded hover:text-slate-text">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-slate-muted">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? (
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-slate-faint">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(123,107,255,0.7)]" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-4xl">
          <span className="gradient-text">{title}</span>
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      <div aria-hidden="true" className="rule-glow absolute inset-x-0 bottom-0" />
    </header>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
  as: Tag = 'section',
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'aside' | 'div';
}) {
  return (
    <Tag className={`surface panel-pad ${className}`}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-white">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-slate-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  actions,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl2 border border-dashed border-white/[0.12] text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-12'
      }`}
      style={{
        background:
          'radial-gradient(120% 100% at 50% 0%, rgba(123,107,255,0.10), rgba(255,255,255,0.01) 55%, transparent 100%)',
      }}
    >
      <span
        className={`mb-3 inline-flex items-center justify-center rounded-2xl border border-white/10 text-accent-soft shadow-glow-sm ${
          compact ? 'h-9 w-9' : 'h-12 w-12'
        }`}
        style={{ background: 'linear-gradient(160deg, rgba(123,107,255,0.22), rgba(63,220,255,0.10))' }}
      >
        <Icon name={icon} size={compact ? 17 : 21} />
      </span>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-muted">{description}</p>
      {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type CalloutTone = 'info' | 'neutral' | 'warn' | 'warning' | 'danger' | 'success';

export function Callout({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  const styles = {
    info: { wrap: 'border-accent/30 text-accent-soft', bar: 'from-accent/80 to-aqua/50', icon: 'info' as IconName },
    neutral: { wrap: 'border-white/10 text-slate-muted', bar: 'from-white/30 to-white/5', icon: 'info' as IconName },
    warn: { wrap: 'border-warn/30 text-warn', bar: 'from-warn/80 to-warn/20', icon: 'warning' as IconName },
    warning: { wrap: 'border-warn/30 text-warn', bar: 'from-warn/80 to-warn/20', icon: 'warning' as IconName },
    danger: { wrap: 'border-danger/30 text-danger', bar: 'from-danger/80 to-danger/20', icon: 'warning' as IconName },
    success: { wrap: 'border-ok/30 text-ok', bar: 'from-ok/80 to-ok/20', icon: 'check' as IconName },
  }[tone];

  return (
    <div
      className={`relative flex items-start gap-3 overflow-hidden rounded-xl border px-3.5 py-3 ${styles.wrap}`}
      style={{ background: 'linear-gradient(120deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012))' }}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${styles.bar}`} />
      <Icon name={styles.icon} size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        {title ? <p className="text-sm font-medium text-slate-text">{title}</p> : null}
        <div className={title ? 'mt-0.5 text-slate-muted' : 'text-slate-muted'}>{children}</div>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function InfoList({
  items,
  columns = 2,
}: {
  items: { label: string; value: ReactNode; wide?: boolean }[];
  columns?: 1 | 2 | 3;
}) {
  const grid = columns === 1 ? 'sm:grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <dl className={`grid grid-cols-1 gap-x-5 gap-y-3 ${grid}`}>
      {items.map((item) => (
        <div key={item.label} className={item.wide ? 'sm:col-span-2' : undefined}>
          <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-slate-faint">{item.label}</dt>
          <dd className="mt-0.5 text-sm leading-relaxed break-words text-slate-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  onClear,
  className = '',
  ariaLabel,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  ariaLabel?: string;
  /** Optional visible label above the input. */
  label?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      ) : null}
      <div className="relative">
      <label htmlFor={id} className="sr-only">
        {ariaLabel ?? label ?? placeholder}
      </label>
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-faint" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-9"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-faint hover:text-slate-text"
          aria-label="Clear search"
        >
          <Icon name="close" size={14} />
        </button>
      ) : null}
      </div>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  options: { value: T; label: ReactNode; count?: number; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200 ease-spring ${
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
            } ${
              active
                ? 'bg-accent-dim text-white shadow-[inset_0_0_0_1px_rgba(123,107,255,0.45)]'
                : 'text-slate-muted hover:bg-white/[0.04] hover:text-slate-text'
            }`}
          >
            {option.icon ? <Icon name={option.icon} size={13} /> : null}
            {option.label}
            {typeof option.count === 'number' ? (
              <span className={`text-2xs ${active ? 'text-accent-soft' : 'text-slate-faint'}`}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ScoreMeter({
  score,
  label = 'Readiness',
  size = 96,
  caption,
  tone,
}: {
  score: number | null;
  label?: string;
  size?: number;
  caption?: ReactNode;
  tone?: 'accent' | 'ok' | 'warn' | 'danger';
}) {
  const numeric = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  const resolvedTone =
    tone ?? (numeric === null ? 'accent' : numeric >= 75 ? 'ok' : numeric >= 50 ? 'warn' : 'danger');
  const stroke = {
    accent: '#7b6bff',
    ok: '#4ade9b',
    warn: '#ffc663',
    danger: '#ff7a90',
  }[resolvedTone];
  const gradientId = `score-${resolvedTone}`;
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const progress = numeric === null ? 0 : (numeric / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-60 blur-xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${stroke}33, transparent 70%)` }}
        />
        <svg width={size} height={size} className="relative -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stroke} />
              <stop offset="100%" stopColor="#3fdcff" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700 ease-spring"
            style={{ filter: `drop-shadow(0 0 6px ${stroke}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-white">{numeric === null ? '—' : Math.round(numeric)}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-faint">/ 100</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-text">{label}</p>
        {caption ? <div className="mt-0.5 text-xs leading-relaxed text-slate-muted">{caption}</div> : null}
      </div>
    </div>
  );
}

export function ComponentBar({
  label,
  value,
  score,
  hint,
  explanation,
}: {
  label: string;
  value?: number | null;
  score?: number | null;
  hint?: string;
  explanation?: string;
}) {
  const raw = typeof score === 'number' ? score : value;
  const numeric = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate-muted">{label}</span>
        <span className="text-2xs tabular-nums text-slate-faint">{numeric === null ? 'not scored' : Math.round(numeric)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-spring"
          style={{
            width: `${numeric ?? 0}%`,
            background:
              numeric === null
                ? 'rgba(255,255,255,0.12)'
                : numeric >= 75
                  ? 'linear-gradient(90deg, #4ade9b, #3fdcff)'
                  : numeric >= 50
                    ? 'linear-gradient(90deg, #ffc663, #c6f24e)'
                    : 'linear-gradient(90deg, #ff7a90, #ffb184)',
            boxShadow: numeric === null ? 'none' : '0 0 12px -2px rgba(63,220,255,0.5)',
          }}
        />
      </div>
      {hint ?? explanation ? (
        <p className="mt-1 text-2xs leading-relaxed text-slate-faint">{hint ?? explanation}</p>
      ) : null}
    </div>
  );
}

export function CopyButton({
  text,
  getText,
  label = 'Copy',
  copiedLabel = 'Copied',
  className = 'btn-secondary btn-sm',
  disabled,
}: {
  text?: string;
  /** Resolve the clipboard contents at click time. */
  getText?: () => string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={async () => {
        const ok = await copyToClipboard(getText ? getText() : (text ?? ''));
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast('Could not copy', {
            tone: 'error',
            description: 'Your browser blocked clipboard access. Select the text and copy it manually.',
          });
        }
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? copiedLabel : label}
    </button>
  );
}

const STATUS_TONES: Record<WorkflowStatus, string> = {
  idea: 'border-white/10 text-slate-muted',
  planning: 'border-accent/35 text-accent-soft',
  scripted: 'border-accent/50 text-accent-soft',
  filming: 'border-warn/35 text-warn',
  editing: 'border-warn/50 text-warn',
  'ready-to-publish': 'border-aqua/50 text-aqua',
  published: 'border-ok/50 text-ok',
  reviewed: 'border-ok/35 text-ok',
  archived: 'border-white/[0.08] text-slate-faint',
};

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  return <span className={`chip ${STATUS_TONES[status]}`}>{WORKFLOW_LABELS[status]}</span>;
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`chip border-warn/30 bg-warn/10 text-warn ${className}`}
      title="Sample record created by demo mode. It is not your data and can be removed in Settings."
    >
      Demo data
    </span>
  );
}

export function SaveIndicator({
  state,
  status,
  message,
  at,
}: {
  state?: SaveState;
  status?: SaveState['status'];
  message?: string;
  at?: string;
}) {
  const resolved: SaveState = state ?? { status: status ?? 'idle', message, at };
  const content =
    resolved.status === 'saving'
      ? { text: 'Saving…', className: 'text-slate-faint' }
      : resolved.status === 'saved'
        ? { text: 'Saved locally', className: 'text-ok' }
        : resolved.status === 'error'
          ? { text: 'Not saved', className: 'text-danger' }
          : { text: 'Local only', className: 'text-slate-faint' };

  return (
    <span
      className={`hidden items-center gap-1.5 text-2xs sm:inline-flex ${content.className}`}
      title={
        resolved.status === 'error'
          ? resolved.message
          : 'Everything is stored in this browser only. Export a backup from Import / export.'
      }
      role="status"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${resolved.status === 'error' ? 'bg-danger' : 'bg-current'} ${
          resolved.status === 'saving' ? 'animate-pulse' : ''
        } ${resolved.status === 'saved' ? 'shadow-[0_0_8px_1px_currentColor]' : ''}`}
      />
      {content.text}
    </span>
  );
}

export function CountPill({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-xs text-slate-muted">
      <span className="text-sm font-semibold tabular-nums text-slate-text">{value}</span>
      {label}
    </span>
  );
}

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const key = value.slice(0, 10);
  return key === toDateKey() ? 'Today' : key;
}
