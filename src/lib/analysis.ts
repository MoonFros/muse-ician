import type {
  CoachAssessment,
  ConfidenceLevel,
  ContentIdea,
  Improvement,
  Platform,
  Preset,
  ReadinessAssessment,
  RubricComponent,
  Song,
  UserPreferences,
} from './types';
import { clamp, nowIso, truncate, unique } from './utils';

/**
 * Creative Readiness is an editorial heuristic, not a prediction.
 *
 * Every number below comes from something the user typed or selected. The rubric
 * is published in the UI and in docs/SCHEMA.md so the score is auditable, and it
 * deliberately rewards specificity (named objects, timed shots, an identified
 * audience) over adjectives. It never estimates views, reach or virality.
 */
export const RUBRIC_VERSION = 'local-rubric-1.0.0';

export const RUBRIC_DEFINITION: {
  key: RubricComponent['key'];
  label: string;
  weight: number;
  description: string;
}[] = [
  {
    key: 'hook',
    label: 'Opening clarity & hook strength',
    weight: 0.25,
    description:
      'Is there one specific opening line a stranger could understand in two seconds? Does it make a promise the clip can keep?',
  },
  {
    key: 'song_fit',
    label: 'Concept & song fit',
    weight: 0.2,
    description:
      'Does the concept use a real moment from this song — a section, lyric or production detail — rather than generic promotion?',
  },
  {
    key: 'audience',
    label: 'Audience relevance',
    weight: 0.15,
    description: 'Is the intended viewer named? Can you describe who should stop scrolling and why?',
  },
  {
    key: 'visual_progression',
    label: 'Visual progression & payoff',
    weight: 0.15,
    description: 'Does the clip move? Are there beats of visual change and a moment worth waiting for?',
  },
  {
    key: 'feasibility',
    label: 'Feasibility with your resources',
    weight: 0.15,
    description:
      'Can you shoot this with the equipment, space, face-visibility and time you actually have?',
  },
  {
    key: 'distinctiveness',
    label: 'Distinctiveness',
    weight: 0.1,
    description: 'Is this your version of the concept, or a copy of the template everyone else posts?',
  },
];

const DISCLAIMER =
  'Creative Readiness is a heuristic editorial checklist score, not a measurement and not a prediction of views, reach or streaming growth. It scores how complete and specific your plan is, so treat it as a prompt for revision rather than a guarantee.';

const GENERIC_PHRASES = [
  'check it out',
  'link in bio',
  'new song out now',
  'my new single',
  'hope you like it',
  'let me know what you think',
  'follow for more',
  'like and subscribe',
];

const AUDIENCE_WORDS = ['for ', 'people who', 'anyone who', 'fans of', 'listeners who'];

const CONCRETE_MARKERS = [
  /\d/,
  /"(?:[^"]+)"/,
  /night|morning|2am|room|kitchen|bus|train|car|phone|mirror|door|street|window/i,
];

function hasAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface ScoringContext {
  idea: Pick<
    ContentIdea,
    | 'title'
    | 'concept_description'
    | 'hook'
    | 'intended_audience'
    | 'scene_sequence'
    | 'shot_list'
    | 'on_screen_text'
    | 'editing_notes'
    | 'call_to_action'
    | 'audio_section'
    | 'platforms'
    | 'estimated_production_minutes'
    | 'mode'
    | 'source_preset_id'
  >;
  preset?: Preset | null;
  song?: Song | null;
  preferences?: UserPreferences | null;
}

function budgetRank(value?: string | null): number {
  return ['minimal', 'low', 'moderate', 'high'].indexOf(value ?? 'minimal');
}

/** Pure, deterministic readiness scoring. */
export function scoreIdea(ctx: ScoringContext): ReadinessAssessment {
  const { idea, preset, song, preferences } = ctx;
  const hook = idea.hook.trim();
  const concept = idea.concept_description.trim();
  const components: RubricComponent[] = [];
  let knownInputs = 0;

  // --- Hook ---------------------------------------------------------------
  let hookScore = 20;
  const hookNotes: string[] = [];
  if (!hook) {
    hookScore = 10;
    hookNotes.push('no opening line yet');
  } else {
    hookScore = 40;
    if (hook.length >= 12 && hook.length <= 120) {
      hookScore += 15;
      hookNotes.push('a readable length for a first frame');
    } else if (hook.length > 160) {
      hookScore -= 10;
      hookNotes.push('too long to read in the first two seconds');
    }
    if (hasAny(hook, ['pov:', '?', ':']) || /^(why|how|what|nobody|everyone|i |this )/i.test(hook)) {
      hookScore += 10;
      hookNotes.push('uses a recognisable opening pattern');
    }
    if (CONCRETE_MARKERS.some((pattern) => pattern.test(hook))) {
      hookScore += 15;
      hookNotes.push('contains a concrete detail rather than a mood');
    } else {
      hookNotes.push('no concrete detail (a time, object or quoted line would sharpen it)');
    }
    if (hasAny(hook, GENERIC_PHRASES)) {
      hookScore -= 25;
      hookNotes.push('contains a generic promo phrase');
    }
    const titleOrTheme = [song?.title, ...(song?.themes ?? []), ...(song?.moods ?? [])]
      .filter(Boolean)
      .some((value) => hook.toLowerCase().includes(String(value).toLowerCase().slice(0, 12)));
    if (titleOrTheme) {
      hookScore += 5;
      hookNotes.push('connects to the song');
    }
  }
  if (hook) knownInputs += 1;
  components.push({
    key: 'hook',
    label: 'Opening clarity & hook strength',
    weight: 0.25,
    score: clamp(Math.round(hookScore), 0, 100),
    explanation: hook ? `Hook is ${hook.length} characters; ${hookNotes.join('; ')}.` : 'Add a specific opening line.',
  });

  // --- Song fit -----------------------------------------------------------
  let songFit = 20;
  const fitNotes: string[] = [];
  if (song) {
    songFit += 20;
    knownInputs += 1;
    fitNotes.push(`linked to "${song.title}"`);
    if ((song.themes ?? []).length || (song.moods ?? []).length) {
      songFit += 15;
      knownInputs += 1;
      fitNotes.push('the song has documented themes');
    } else {
      fitNotes.push('the song has no themes listed yet');
    }
    if (idea.audio_section && idea.audio_section.trim()) {
      songFit += 15;
      fitNotes.push(`uses a specific audio section (${idea.audio_section})`);
    } else {
      fitNotes.push('no audio section chosen');
    }
    if ((song.strongest_lyrics ?? []).length) songFit += 5;
    const songWords = [
      song.title,
      ...(song.themes ?? []),
      ...(song.moods ?? []),
      ...(song.strongest_lyrics ?? []),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    if (songWords.some((word) => word.length > 3 && concept.toLowerCase().includes(word.slice(0, 16)))) {
      songFit += 10;
      fitNotes.push('the concept text references this song specifically');
    } else {
      fitNotes.push('the concept could be about any song as written');
    }
  } else {
    fitNotes.push('no song linked, so the concept cannot be checked against your material');
  }
  if (preset) {
    if ((preset.objectives ?? []).length) songFit += 5;
  }
  components.push({
    key: 'song_fit',
    label: 'Concept & song fit',
    weight: 0.2,
    score: clamp(Math.round(songFit), 0, 100),
    explanation: fitNotes.join('; ') + '.',
  });

  // --- Audience -----------------------------------------------------------
  let audience = 25;
  const audienceNotes: string[] = [];
  if (idea.intended_audience && words(idea.intended_audience) >= 3) {
    audience += 30;
    knownInputs += 1;
    audienceNotes.push('the intended viewer is named');
  } else {
    audienceNotes.push('no named intended viewer');
  }
  if (song?.target_audience) {
    audience += 20;
    audienceNotes.push('the song record names an audience');
  }
  if (idea.intended_audience && hasAny(idea.intended_audience, AUDIENCE_WORDS)) {
    audience += 10;
    audienceNotes.push('described as a group of people rather than a demographic label');
  }
  if (idea.call_to_action && idea.call_to_action.trim()) {
    audience += 10;
    audienceNotes.push('there is a next step for that viewer');
  }
  components.push({
    key: 'audience',
    label: 'Audience relevance',
    weight: 0.15,
    score: clamp(Math.round(audience), 0, 100),
    explanation: audienceNotes.join('; ') + '.',
  });

  // --- Visual progression -------------------------------------------------
  const scenes = (idea.scene_sequence ?? []).filter((entry) => entry.trim());
  const shots = (idea.shot_list ?? []).filter((entry) => entry.trim());
  const overlays = (idea.on_screen_text ?? []).filter((entry) => entry.trim());
  let progression = 15;
  const progressionNotes: string[] = [];
  progression += Math.min(scenes.length, 5) * 9;
  progression += Math.min(shots.length, 4) * 5;
  if (overlays.length) progression += 8;
  if (idea.editing_notes && /pace|pacing|cut|beat|timing|second/i.test(idea.editing_notes)) {
    progression += 10;
    progressionNotes.push('editing notes mention timing');
  }
  if (scenes.length >= 3) progressionNotes.push(`${scenes.length} scenes give the clip movement`);
  else progressionNotes.push('fewer than three scenes means little visual change');
  if (shots.length < 2) progressionNotes.push('the shot list is thin');
  if (overlays.length === 0) progressionNotes.push('no on-screen text planned');
  components.push({
    key: 'visual_progression',
    label: 'Visual progression & payoff',
    weight: 0.15,
    score: clamp(Math.round(progression), 0, 100),
    explanation: progressionNotes.join('; ') + '.',
  });

  // --- Feasibility --------------------------------------------------------
  let feasibility = 55;
  const feasibilityNotes: string[] = [];
  let constraintsKnown = false;
  const availableEquipment = unique([
    ...(song?.equipment ?? []),
    ...(preferences?.equipment ?? []),
  ]).map((item) => item.toLowerCase());
  if (availableEquipment.length) constraintsKnown = true;

  if (preset) {
    const required = preset.equipment.map((item) => item.toLowerCase());
    if (availableEquipment.length) {
      const missing = required.filter(
        (item) => !availableEquipment.some((owned) => owned.includes(item) || item.includes(owned)),
      );
      if (missing.length === 0) {
        feasibility += 20;
        feasibilityNotes.push('your listed equipment covers this preset');
      } else {
        feasibility -= 15;
        feasibilityNotes.push(`missing from your equipment list: ${missing.join(', ')}`);
      }
    } else {
      feasibility -= 5;
      feasibilityNotes.push('no equipment listed, so required gear could not be checked');
    }
    if (preset.face_visibility === 'required' && song?.face_visibility === 'none') {
      feasibility -= 35;
      feasibilityNotes.push('the preset needs your face on camera but the song record says no face');
    }
    if (preset.face_visibility === 'required' && song?.face_visibility === 'optional') {
      feasibility -= 10;
      feasibilityNotes.push('the preset assumes your face is on camera; the song record marks it optional');
    }
    if (preset.filming_methods.includes('animation') && song?.animation_capability === false) {
      feasibility -= 20;
      feasibilityNotes.push('the preset offers animation, which you marked as unavailable');
    }
    if (song?.budget) {
      const gap = budgetRank(preset.budget) - budgetRank(song.budget);
      if (gap > 0) {
        feasibility -= 10 * gap;
        feasibilityNotes.push(`preset budget (${preset.budget}) is above the song budget (${song.budget})`);
      } else if (gap === 0) {
        feasibility += 5;
      }
      constraintsKnown = true;
    }
    if (preset.difficulty === 'challenging') feasibility -= 5;
  }

  const estimated = idea.estimated_production_minutes ?? null;
  if (estimated !== null) {
    constraintsKnown = true;
    if (estimated > 240) {
      feasibility -= 15;
      feasibilityNotes.push(`an estimated ${estimated} minutes is a long block for one short video`);
    } else if (estimated <= 90) {
      feasibility += 10;
      feasibilityNotes.push(`an estimated ${estimated} minutes fits a single session`);
    }
  } else {
    feasibilityNotes.push('no production time estimate');
  }

  if (!constraintsKnown) {
    feasibility = Math.min(feasibility, 70);
    feasibilityNotes.push('budget, equipment and time are unknown, so this is capped at 70');
  }
  if (!feasibilityNotes.length) feasibilityNotes.push('no blocking constraints detected');
  components.push({
    key: 'feasibility',
    label: 'Feasibility with your resources',
    weight: 0.15,
    score: clamp(Math.round(feasibility), 0, 100),
    explanation: feasibilityNotes.join('; ') + '.',
  });

  // --- Distinctiveness ----------------------------------------------------
  let distinctiveness = 40;
  const distinctNotes: string[] = [];
  if (idea.mode === 'customized' || idea.mode === 'from-scratch') {
    distinctiveness += 20;
    distinctNotes.push('this is your own adaptation, not the template verbatim');
  } else {
    distinctNotes.push('this is the preset used as-is');
  }
  if (preset && concept.length > preset.summary.length * 1.4) {
    distinctiveness += 10;
    distinctNotes.push('the concept description goes beyond the preset summary');
  }
  if (preset && (preset.usage_count ?? 0) >= 5) {
    distinctiveness -= 15;
    distinctNotes.push('you have used this preset often, so it may feel familiar to your audience');
  } else if (preset) {
    distinctiveness += 5;
  }
  if (preset && hook && !preset.hook_examples.includes(hook)) {
    distinctiveness += 10;
    distinctNotes.push('the hook is your own rather than a preset example');
  }
  if (hasAny(concept, GENERIC_PHRASES)) {
    distinctiveness -= 20;
    distinctNotes.push('generic promo language lowers distinctiveness');
  }
  if (concept.length > 220) {
    distinctiveness += 5;
    distinctNotes.push('there is enough written concept to look original');
  }
  components.push({
    key: 'distinctiveness',
    label: 'Distinctiveness',
    weight: 0.1,
    score: clamp(Math.round(distinctiveness), 0, 100),
    explanation: distinctNotes.join('; ') + '.',
  });

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const weighted = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const score = Math.round(weighted / totalWeight);

  const confidence: ConfidenceLevel =
    knownInputs >= 4 ? 'high' : knownInputs >= 2 ? 'medium' : 'low';

  return {
    score: clamp(score, 0, 100),
    confidence,
    components,
    rubric_version: RUBRIC_VERSION,
    disclaimer: DISCLAIMER,
  };
}

const PLATFORM_REASONS: Record<Platform, string> = {
  'youtube-shorts':
    'Shorts rewards a clear title and a searchable topic; good when the concept explains something about the song.',
  'instagram-reels':
    'Reels favours a strong first frame that works on mute; good when the concept is visual or text-led.',
  tiktok:
    'TikTok favours a native, immediate opening and repeated watch loops; good when the concept has a fast turn.',
};

const PLATFORM_TAGS: Record<'text' | 'performance' | 'story' | 'visual', Platform[]> = {
  text: ['instagram-reels', 'tiktok'],
  performance: ['tiktok', 'instagram-reels'],
  story: ['youtube-shorts', 'instagram-reels'],
  visual: ['instagram-reels', 'youtube-shorts'],
};

function classifyConcept(idea: ContentIdea, preset?: Preset | null): 'text' | 'performance' | 'story' | 'visual' {
  const text = `${idea.title} ${idea.concept_description} ${idea.hook}`.toLowerCase();
  if (/lyric|text|typograph|interpre|quote/.test(text)) return 'text';
  if (/perform|sing|take|acoustic|vocal/.test(text)) return 'performance';
  if (/story|behind|explain|why|process|writing/.test(text)) return 'story';
  if (preset?.filming_methods.includes('animation')) return 'visual';
  return 'visual';
}

/**
 * A transparent local assessment used when no AI provider is configured.
 * It is explicitly labelled as non-AI in the UI so nobody mistakes it for one.
 */
export function buildLocalAssessment(
  idea: ContentIdea,
  preset: Preset | null | undefined,
  song: Song | null | undefined,
  preferences?: UserPreferences | null,
): CoachAssessment {
  const readiness = scoreIdea({ idea, preset, song, preferences });
  const byKey = Object.fromEntries(readiness.components.map((c) => [c.key, c])) as Record<
    RubricComponent['key'],
    RubricComponent
  >;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const component of readiness.components) {
    if (component.score >= 75) strengths.push(`${component.label}: ${component.explanation}`);
    else if (component.score < 55) weaknesses.push(`${component.label}: ${component.explanation}`);
  }
  if (!strengths.length) {
    strengths.push(
      'The plan is written down and has a source concept, which means it can be improved. Nothing here is a dead end.',
    );
  }

  const improvements: Improvement[] = [];
  const pushImprovement = (area: string, suggestion: string, impact: Improvement['impact']) =>
    improvements.push({ area, suggestion, impact });

  if (byKey.hook.score < 70) {
    pushImprovement(
      'Hook',
      idea.hook.trim()
        ? 'Rewrite the opening line so a stranger can picture one specific thing — a time, an object, or a quoted sentence — within two seconds.'
        : 'Write one opening line before you film. Use a concrete detail rather than describing the mood of the song.',
      'high',
    );
  }
  if (byKey.song_fit.score < 70) {
    pushImprovement(
      'Song fit',
      'Name the exact section of the song this uses (timestamp or section label) and reference one lyric or production detail in the concept description.',
      'high',
    );
  }
  if (byKey.visual_progression.score < 70) {
    pushImprovement(
      'Pacing',
      'Add a third visual beat. Three short beats — setup, turn, payoff — give the viewer a reason to keep watching to the end.',
      'medium',
    );
  }
  if (byKey.audience.score < 70) {
    pushImprovement(
      'Audience',
      'Write one sentence describing who should stop scrolling. If it could apply to everyone, it will feel personal to no one.',
      'medium',
    );
  }
  if (byKey.feasibility.score < 70) {
    pushImprovement(
      'Feasibility',
      'Cut one requirement rather than adding one: shoot in a single location, use the equipment you already listed, and cap the edit at three cuts.',
      'high',
    );
  }
  if (byKey.distinctiveness.score < 70) {
    pushImprovement(
      'Distinctiveness',
      'Change one element that is yours alone — a location no one else has, a specific object, or a line only you could write. Keep the underlying format.',
      'medium',
    );
  }
  if (!improvements.length) {
    pushImprovement(
      'Next check',
      'The plan is specific enough to film. Shoot the first three seconds as a test before committing to the full edit.',
      'low',
    );
  }
  improvements.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    return rank[a.impact] - rank[b.impact];
  });

  const kind = classifyConcept(idea, preset);
  const candidatePlatforms = unique([
    ...(idea.platforms ?? []),
    ...PLATFORM_TAGS[kind],
  ]) as Platform[];

  const scenes = (idea.scene_sequence ?? []).filter(Boolean);
  const shots = (idea.shot_list ?? []).filter(Boolean);
  const revisedConcept = [
    idea.concept_description.trim() ||
      preset?.description.trim() ||
      'Describe what the clip shows, in order, in two or three sentences.',
    '',
    `Opening (0–2s): ${idea.hook.trim() || 'state the specific situation in one concrete line'}.`,
    scenes.length ? `Beats: ${scenes.map((scene, index) => `${index + 1}) ${scene}`).join(' ')}` : '',
    idea.audio_section ? `Audio: ${idea.audio_section}.` : 'Audio: name the exact section of the song before shooting.',
    idea.editing_notes ? `Edit: ${idea.editing_notes}` : 'Edit: cut on the musical change, not on a random frame.',
    idea.call_to_action ? `Close: ${idea.call_to_action}` : 'Close: one ask that a viewer can do in a single tap.',
  ]
    .filter(Boolean)
    .join('\n');

  const alternative =
    preset?.variations?.[0] ??
    (kind === 'performance'
      ? 'Try the same idea as a single unedited take to compare delivery against production.'
      : 'Try a text-first version with no footage: the hook, one lyric, and the payoff, all as type on a plain background.');

  const audienceLine = idea.intended_audience
    ? `You have named the viewer as: ${truncate(idea.intended_audience, 140)}`
    : 'No intended viewer is named yet, so this section cannot be specific.';
  const songLine = song
    ? `Linked to "${song.title}"${song.moods?.length ? ` (${song.moods.join(', ')})` : ''}. ${
        (song.themes ?? []).length ? `Themes on record: ${(song.themes ?? []).join(', ')}.` : ''
      }`
    : 'No song is linked, so song fit is judged from the idea text alone.';

  return {
    summary: `${idea.title}: ${truncate(
      idea.concept_description.trim() || 'no concept description yet',
      220,
    )} Readiness ${readiness.score}/100 (${readiness.confidence} confidence).`,
    strengths,
    weaknesses: weaknesses.length
      ? weaknesses
      : ['No component scored below 55. The remaining risk is execution, not planning.'],
    hook_assessment: idea.hook.trim()
      ? `"${idea.hook.trim()}" — scored ${byKey.hook.score}/100. ${byKey.hook.explanation}`
      : 'There is no hook yet. Without an opening line, the first frame has to carry everything.',
    song_fit: `${songLine} Scored ${byKey.song_fit.score}/100.`,
    audience_fit: `${audienceLine} Scored ${byKey.audience.score}/100.`,
    feasibility: `${byKey.feasibility.explanation} Scored ${byKey.feasibility.score}/100.`,
    pacing_suggestions: [
      scenes.length >= 3
        ? `Keep the ${scenes.length}-beat structure but put the payoff in the last quarter of the clip.`
        : 'Add a third beat: setup, turn, payoff. Two beats usually feels like an unfinished clip.',
      shots.length >= 4
        ? 'Shoot the payoff shot first while the light and your energy are best.'
        : 'Plan at least four shots so you have material to cut against.',
      'Let the strongest 2 seconds of the audio happen at the moment the visual changes.',
    ],
    improvements,
    revised_concept: revisedConcept,
    alternative_concept: alternative,
    recommended_platforms: candidatePlatforms.slice(0, 3).map((platform) => ({
      platform,
      reason: PLATFORM_REASONS[platform],
    })),
    next_steps: [
      'Save this version so you can restore it later.',
      'Generate the platform packages in Metadata Studio using the same section and hook.',
      'Put the idea on a date in Content Calendar so it leaves the backlog.',
    ],
    readiness,
    source: 'local-heuristic',
    generated_at: nowIso(),
  };
}

export function improvementAcceptText(improvement: Improvement): string {
  return `${improvement.area}: ${improvement.suggestion}`;
}
