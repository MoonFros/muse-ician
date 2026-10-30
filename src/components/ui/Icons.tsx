import type { SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'library'
  | 'song'
  | 'coach'
  | 'tag'
  | 'calendar'
  | 'journal'
  | 'exchange'
  | 'settings'
  | 'search'
  | 'plus'
  | 'star'
  | 'star-filled'
  | 'restore'
  | 'wave'
  | 'bulb'
  | 'check'
  | 'close'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'copy'
  | 'download'
  | 'upload'
  | 'trash'
  | 'edit'
  | 'filter'
  | 'grid'
  | 'list'
  | 'play'
  | 'clock'
  | 'warning'
  | 'info'
  | 'external'
  | 'menu'
  | 'more'
  | 'archive'
  | 'refresh'
  | 'undo'
  | 'sparkle'
  | 'chart'
  | 'spark'
  | 'lightning'
  | 'film'
  | 'text'
  | 'drag'
  | 'lock';

const PATHS: Record<IconName, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  library: 'M4 19V5a1 1 0 0 1 1-1h2M10 19V5a1 1 0 0 1 1-1h2M16 19V6l4 13M4 19h16',
  song: 'M9 18V5l10-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  coach: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  tag: 'M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  calendar: 'M4 6h16v14H4zM8 3v4M16 3v4M4 11h16',
  journal: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  exchange: 'M4 8h13l-3-3M20 16H7l3 3',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.4-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 0z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z',
  'star-filled': 'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z',
  restore: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  wave: 'M2 12h2l2-7 3 14 3-11 2 6h2l2-3h4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  check: 'M20 6 9 17l-5-5',
  close: 'M18 6 6 18M6 6l12 12',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 13l5-5 5 5M4 4h16',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  play: 'M8 5l12 7-12 7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  warning: 'M12 3 2 20h20L12 3zM12 9v5M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7h.01',
  external: 'M14 4h6v6M20 4 11 13M18 14v6H4V6h6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  refresh: 'M20 11a8 8 0 1 0-2 6M20 4v7h-7',
  undo: 'M4 10h9a5 5 0 0 1 0 10H8M4 10l5-5M4 10l5 5',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  spark: 'M13 2 4 14h6l-1 8 9-12h-6z',
  lightning: 'M13 2 4 14h6l-1 8 9-12h-6z',
  film: 'M3 5h18v14H3zM3 10h18M3 15h18M8 5v14M16 5v14',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  lock: 'M6 11h12v10H6zM9 11V8a3 3 0 0 1 6 0v3',
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  const id = `logo-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#161327" />
          <stop offset="100%" stopColor="#0a0a15" />
        </linearGradient>
        <linearGradient id={`${id}-wave`} x1="4" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b7adff" />
          <stop offset="55%" stopColor="#7b6bff" />
          <stop offset="100%" stopColor="#3fdcff" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9.5" fill={`url(#${id}-bg)`} stroke="rgba(255,255,255,0.16)" />
      <path
        d="M8 21V11.5l4.2 6 4.3-6V21"
        stroke={`url(#${id}-wave)`}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 21V12l4 4.4" stroke={`url(#${id}-wave)`} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="10.4" r="1.9" fill="#c6f24e" />
    </svg>
  );
}

export function PlatformGlyph({ platform, size = 16 }: { platform: string; size?: number }) {
  const label =
    platform === 'youtube-long'
      ? 'YT'
      : platform === 'youtube-shorts'
        ? 'YT'
        : platform === 'instagram-reels'
          ? 'IG'
          : platform === 'tiktok'
            ? 'TT'
            : '–';
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-md border border-white/[0.10] bg-white/[0.04] text-[9px] font-semibold tracking-wide text-slate-muted"
      style={{ width: size + 8, height: size, fontSize: Math.max(8, size * 0.5) }}
    >
      {label}
    </span>
  );
}
