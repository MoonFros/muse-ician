import type { IconName } from '../components/ui/Icons';
import { SEED_PRESET_COUNT } from '../data/seedPresets';

/**
 * Command palette entries.
 *
 * Every command maps to a real route that really opens the thing — no command
 * is a placeholder. Dynamic entries (jump to a specific song or idea) are
 * appended by the palette from workspace data.
 */
export interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  to: string;
  keywords: string[];
  group: 'Create' | 'Go' | 'Data';
}

export const COMMANDS: Command[] = [
  {
    id: 'cmd-new-song',
    label: 'Add a song',
    hint: 'Opens the new-song form',
    icon: 'song',
    to: '/songs?new=1',
    keywords: ['song', 'new', 'add', 'create', 'release'],
    group: 'Create',
  },
  {
    id: 'cmd-new-idea',
    label: 'Start an idea from the library',
    hint: `Browse ${SEED_PRESET_COUNT} presets and pick one`,
    icon: 'library',
    to: '/library?pick=1',
    keywords: ['idea', 'preset', 'new', 'create', 'video'],
    group: 'Create',
  },
  {
    id: 'cmd-new-preset',
    label: 'Write a custom preset',
    hint: 'Build your own reusable format',
    icon: 'edit',
    to: '/library?new=1',
    keywords: ['preset', 'custom', 'format', 'new'],
    group: 'Create',
  },
  {
    id: 'cmd-plan-campaign',
    label: 'Plan a campaign',
    hint: 'Generates a dated sequence you can edit',
    icon: 'calendar',
    to: '/calendar?plan=1',
    keywords: ['campaign', 'plan', 'calendar', 'schedule', 'sequence'],
    group: 'Create',
  },
  {
    id: 'cmd-series',
    label: 'Build a multi-part series',
    hint: 'One preset into a 3–5 part arc',
    icon: 'film',
    to: '/series',
    keywords: ['series', 'arc', 'parts', 'multi', 'planner'],
    group: 'Create',
  },
  {
    id: 'cmd-runway',
    label: 'Open the release runway',
    hint: 'Reverse timeline from a release date',
    icon: 'clock',
    to: '/runway',
    keywords: ['release', 'runway', 'countdown', 'launch', 'timeline'],
    group: 'Create',
  },
  {
    id: 'cmd-log-result',
    label: 'Log a performance result',
    hint: 'Record numbers you can see in the app',
    icon: 'chart',
    to: '/journal?new=1',
    keywords: ['result', 'log', 'performance', 'views', 'analytics'],
    group: 'Create',
  },
  {
    id: 'cmd-metadata',
    label: 'Build platform metadata',
    hint: 'Titles, captions and hashtags per platform',
    icon: 'tag',
    to: '/metadata',
    keywords: ['metadata', 'caption', 'hashtag', 'title', 'copy'],
    group: 'Create',
  },
  {
    id: 'cmd-go-dashboard',
    label: 'Go to dashboard',
    hint: 'Next actions and recent work',
    icon: 'dashboard',
    to: '/',
    keywords: ['home', 'dashboard', 'start'],
    group: 'Go',
  },
  {
    id: 'cmd-go-library',
    label: 'Go to the preset library',
    hint: 'All video formats',
    icon: 'library',
    to: '/library',
    keywords: ['library', 'presets', 'formats'],
    group: 'Go',
  },
  {
    id: 'cmd-go-calendar',
    label: 'Go to the content calendar',
    hint: 'Plan and track posts',
    icon: 'calendar',
    to: '/calendar',
    keywords: ['calendar', 'schedule', 'posts'],
    group: 'Go',
  },
  {
    id: 'cmd-go-coach',
    label: 'Go to the creative coach',
    hint: 'Readiness scores and notes',
    icon: 'coach',
    to: '/coach',
    keywords: ['coach', 'score', 'readiness', 'review'],
    group: 'Go',
  },
  {
    id: 'cmd-go-journal',
    label: 'Go to the performance journal',
    hint: 'Your own recorded results',
    icon: 'journal',
    to: '/journal',
    keywords: ['journal', 'results', 'performance', 'compare'],
    group: 'Go',
  },
  {
    id: 'cmd-go-trends',
    label: 'Go to the trend check',
    hint: 'Attributed evidence only',
    icon: 'spark',
    to: '/trends',
    keywords: ['trend', 'trends'],
    group: 'Go',
  },
  {
    id: 'cmd-import',
    label: 'Import JSON',
    hint: 'Validate and preview before anything changes',
    icon: 'upload',
    to: '/import-export',
    keywords: ['import', 'json', 'restore', 'merge', 'backup'],
    group: 'Data',
  },
  {
    id: 'cmd-export',
    label: 'Export a backup',
    hint: 'Download everything as JSON',
    icon: 'download',
    to: '/import-export',
    keywords: ['export', 'backup', 'json', 'download', 'save'],
    group: 'Data',
  },
  {
    id: 'cmd-settings',
    label: 'Open settings',
    hint: 'Defaults, storage and AI status',
    icon: 'settings',
    to: '/settings',
    keywords: ['settings', 'preferences', 'ai', 'openai', 'keys', 'storage'],
    group: 'Data',
  },
];

export function matchCommands(query: string): Command[] {
  const term = query.trim().toLowerCase();
  if (!term) return COMMANDS;
  return COMMANDS.filter((command) => {
    const haystack = [command.label, command.hint, ...command.keywords].join(' ').toLowerCase();
    return term.split(/\s+/).every((part) => haystack.includes(part));
  });
}
