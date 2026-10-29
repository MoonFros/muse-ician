import type { IconName } from '../components/ui/Icons';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Shown in the mobile bottom bar. */
  mobile?: boolean;
  /** Short label for the mobile bar. */
  shortLabel?: string;
  description: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', mobile: true, description: 'Next steps and recent work' },
  { to: '/library', label: 'Preset library', icon: 'library', mobile: true, description: '30 proven video formats' },
  { to: '/songs', label: 'My songs', icon: 'song', mobile: true, description: 'Songs and their campaigns' },
  { to: '/coach', label: 'Creative coach', icon: 'coach', mobile: true, description: 'Readiness scores and notes' },
  { to: '/metadata', label: 'Metadata studio', icon: 'tag', description: 'Platform-specific publishing copy' },
  { to: '/calendar', label: 'Content calendar', icon: 'calendar', mobile: true, description: 'Plan and track posts' },
  { to: '/journal', label: 'Performance journal', icon: 'journal', description: 'Results you record yourself' },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: '/trends', label: 'Trend check', icon: 'spark', description: 'Attributed evidence only' },
  { to: '/import-export', label: 'Import / export', icon: 'exchange', description: 'JSON backups and AI packs' },
  { to: '/settings', label: 'Settings', icon: 'settings', description: 'Defaults, demo data and AI status' },
];

export const MOBILE_PRIMARY: NavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[2],
  PRIMARY_NAV[3],
  PRIMARY_NAV[5],
];

export const MOBILE_OVERFLOW: NavItem[] = [
  ...PRIMARY_NAV.filter((item) => !MOBILE_PRIMARY.some((primary) => primary.to === item.to)),
  ...SECONDARY_NAV,
];

const SECTION_MAP: { pattern: RegExp; eyebrow: string; title: string }[] = [
  { pattern: /^\/$/, eyebrow: 'muse-ician', title: 'Turn your music into your next idea' },
  { pattern: /^\/library\/[^/]+$/, eyebrow: 'Preset library', title: 'Preset detail' },
  { pattern: /^\/library$/, eyebrow: 'Preset library', title: 'Find a format worth filming' },
  { pattern: /^\/ideas\/[^/]+$/, eyebrow: 'Idea workspace', title: 'Build and grade one idea' },
  { pattern: /^\/songs\/[^/]+$/, eyebrow: 'Song', title: 'Song campaign' },
  { pattern: /^\/songs$/, eyebrow: 'Songs', title: 'Your songs' },
  { pattern: /^\/coach$/, eyebrow: 'Creative coach', title: 'Is this idea ready to film?' },
  { pattern: /^\/metadata$/, eyebrow: 'Metadata studio', title: 'Publish-ready copy per platform' },
  { pattern: /^\/calendar$/, eyebrow: 'Content calendar', title: 'Plan the next few weeks' },
  { pattern: /^\/journal$/, eyebrow: 'Performance journal', title: 'What your own numbers say' },
  { pattern: /^\/trends$/, eyebrow: 'Trend check', title: 'Score attributed evidence, not hype' },
  { pattern: /^\/import-export$/, eyebrow: 'Import / export', title: 'Move your work in and out' },
  { pattern: /^\/settings$/, eyebrow: 'Settings', title: 'Defaults and data' },
];

export function sectionFor(pathname: string): { eyebrow: string; title: string } {
  const match = SECTION_MAP.find((entry) => entry.pattern.test(pathname));
  return match ? { eyebrow: match.eyebrow, title: match.title } : { eyebrow: 'muse-ician', title: 'Not found' };
}

const SHORT_LABELS: Record<string, string> = {
  '/': 'Home',
  '/library': 'Presets',
  '/songs': 'Songs',
  '/coach': 'Coach',
  '/calendar': 'Calendar',
  '/journal': 'Results',
  '/trends': 'Trends',
  '/metadata': 'Metadata',
  '/import-export': 'Transfer',
  '/settings': 'Settings',
};

export const NAV_ITEMS: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => ({
  ...item,
  shortLabel: item.shortLabel ?? SHORT_LABELS[item.to] ?? item.label,
}));

export interface SectionMeta {
  section: string;
  title: string;
  description: string;
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  'muse-ician': 'Turn your music into your next idea.',
  'Preset library': 'Reusable video formats you can adapt to any song.',
  'Preset detail': 'Everything this format needs before you film it.',
  'Idea workspace': 'Write, grade and version one idea.',
  Song: 'One song, its ideas, posts and recorded results.',
  Songs: 'Every song you are planning content for.',
  'Creative coach': 'A heuristic readiness score, not a prediction.',
  'Metadata studio': 'Platform-specific titles, captions and hashtags.',
  'Content calendar': 'Planning records only — nothing is published.',
  'Performance journal': 'Numbers you typed in, compared against your own history.',
  'Trend check': 'Only trends you can attribute to a source and a date.',
  'Import / export': 'Versioned JSON in and out, with validation.',
  Settings: 'Defaults, storage and optional providers.',
};

export function sectionForPath(pathname: string): SectionMeta {
  const { eyebrow, title } = sectionFor(pathname);
  return { section: eyebrow, title, description: SECTION_DESCRIPTIONS[eyebrow] ?? '' };
}
