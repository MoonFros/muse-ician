import type {
  CoachAssessment,
  ConfidenceLevel,
  Improvement,
  Platform,
  RubricComponent,
  Tone,
} from './types';
import { PLATFORMS, TONES } from './types';
import { clamp, nowIso, truncate } from './utils';

/**
 * Runtime validators for AI responses.
 *
 * A model can return anything, so every value is checked before it is saved.
 * Unknown or malformed fields are dropped; if the essential structure is missing
 * the whole response is rejected and the UI explains why nothing was saved.
 */

export class AiResponseError extends Error {
  readonly detail: string;
  constructor(message: string, detail = '') {
    super(message);
    this.name = 'AiResponseError';
    this.detail = detail;
  }
}

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, max = 4000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function strArray(value: unknown, maxItems = 20, maxLength = 600): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => str(item, maxLength))
    .filter((item): item is string => item !== null)
    .slice(0, maxItems);
}

function num(value: unknown, min = 0, max = 100): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return clamp(Math.round(value * 100) / 100, min, max);
}

function confidence(value: unknown): ConfidenceLevel {
  return value === 'high' || value === 'medium' ? value : 'low';
}

function platform(value: unknown): Platform | null {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value)
    ? (value as Platform)
    : null;
}

export interface AiIdeaSuggestion {
  title: string;
  concept_description: string;
  hook: string;
  platforms: Platform[];
  why_it_fits: string;
  source_preset_id: string | null;
}

export function parseIdeaSuggestions(data: unknown): AiIdeaSuggestion[] {
  const list = isObj(data) && Array.isArray(data.ideas) ? data.ideas : Array.isArray(data) ? data : null;
  if (!list) throw new AiResponseError('The AI response did not contain an ideas array.');
  const ideas = list
    .filter(isObj)
    .map((item) => {
      const title = str(item.title, 120);
      const concept = str(item.concept_description ?? item.concept, 2000);
      if (!title || !concept) return null;
      return {
        title,
        concept_description: concept,
        hook: str(item.hook, 300) ?? '',
        platforms: (Array.isArray(item.platforms) ? item.platforms : [])
          .map(platform)
          .filter((value): value is Platform => value !== null),
        why_it_fits: str(item.why_it_fits, 800) ?? '',
        source_preset_id: str(item.source_preset_id, 120),
      };
    })
    .filter((item): item is AiIdeaSuggestion => item !== null);
  if (!ideas.length) throw new AiResponseError('The AI response contained no usable ideas.');
  return ideas.slice(0, 8);
}

export interface AiIdeaPatch {
  title?: string;
  hook?: string;
  concept_description?: string;
  scene_sequence?: string[];
  shot_list?: string[];
  on_screen_text?: string[];
  editing_notes?: string;
  call_to_action?: string;
  audio_section?: string;
  estimated_production_minutes?: number | null;
  reasoning: string;
}

export function parseIdeaPatch(data: unknown): AiIdeaPatch {
  if (!isObj(data)) throw new AiResponseError('The AI response was not a JSON object.');
  const patch: AiIdeaPatch = {
    reasoning: str(data.reasoning, 2000) ?? 'No reasoning was returned by the provider.',
  };
  const title = str(data.title, 160);
  if (title) patch.title = title;
  const hook = str(data.hook, 300);
  if (hook) patch.hook = hook;
  const concept = str(data.concept_description, 3000);
  if (concept) patch.concept_description = concept;
  const scenes = strArray(data.scene_sequence, 12);
  if (scenes.length) patch.scene_sequence = scenes;
  const shots = strArray(data.shot_list, 20);
  if (shots.length) patch.shot_list = shots;
  const overlays = strArray(data.on_screen_text, 10);
  if (overlays.length) patch.on_screen_text = overlays;
  const editing = str(data.editing_notes, 1500);
  if (editing) patch.editing_notes = editing;
  const cta = str(data.call_to_action, 500);
  if (cta) patch.call_to_action = cta;
  const section = str(data.audio_section, 300);
  if (section) patch.audio_section = section;
  const minutes = num(data.estimated_production_minutes, 0, 1440);
  if (minutes !== null) patch.estimated_production_minutes = Math.round(minutes);
  if (!patch.title && !patch.hook && !patch.concept_description && !patch.shot_list) {
    throw new AiResponseError('The AI response did not include any usable idea fields.');
  }
  return patch;
}

const RUBRIC_KEYS: RubricComponent['key'][] = [
  'hook',
  'song_fit',
  'audience',
  'visual_progression',
  'feasibility',
  'distinctiveness',
];

const WEIGHTS: Record<RubricComponent['key'], number> = {
  hook: 0.25,
  song_fit: 0.2,
  audience: 0.15,
  visual_progression: 0.15,
  feasibility: 0.15,
  distinctiveness: 0.1,
};

const LABELS: Record<RubricComponent['key'], string> = {
  hook: 'Opening clarity & hook strength',
  song_fit: 'Concept & song fit',
  audience: 'Audience relevance',
  visual_progression: 'Visual progression & payoff',
  feasibility: 'Feasibility with your resources',
  distinctiveness: 'Distinctiveness',
};

const READINESS_DISCLAIMER =
  'Creative Readiness is an editorial heuristic based on the rubric shown here, not a statistical prediction of views, reach or streaming growth.';

export function parseCoachAssessment(data: unknown): CoachAssessment {
  if (!isObj(data)) throw new AiResponseError('The AI assessment was not a JSON object.');
  const summary = str(data.summary, 2000);
  const hook = str(data.hook_assessment, 2000);
  const songFit = str(data.song_fit, 2000);
  const feasibility = str(data.feasibility, 2000);
  const revised = str(data.revised_concept, 4000);
  if (!summary || !hook || !songFit || !feasibility || !revised) {
    throw new AiResponseError(
      'The AI assessment was missing required sections (summary, hook, song fit, feasibility or revised concept). Nothing was saved.',
    );
  }

  const readinessRaw = isObj(data.readiness) ? data.readiness : null;
  let components: RubricComponent[] = [];
  if (readinessRaw && Array.isArray(readinessRaw.components)) {
    components = readinessRaw.components
      .filter(isObj)
      .map((component) => {
        const key = component.key;
        if (typeof key !== 'string' || !RUBRIC_KEYS.includes(key as RubricComponent['key'])) return null;
        const typedKey = key as RubricComponent['key'];
        const score = num(component.score, 0, 100);
        if (score === null) return null;
        return {
          key: typedKey,
          label: str(component.label, 120) ?? LABELS[typedKey],
          score,
          weight: WEIGHTS[typedKey],
          explanation: str(component.explanation, 1200) ?? 'No explanation supplied.',
        } satisfies RubricComponent;
      })
      .filter((component): component is RubricComponent => component !== null);
  }

  // Fill any missing rubric dimensions with a neutral score and an honest note
  // rather than silently reweighting the score.
  for (const key of RUBRIC_KEYS) {
    if (!components.some((component) => component.key === key)) {
      components.push({
        key,
        label: LABELS[key],
        score: 50,
        weight: WEIGHTS[key],
        explanation: 'The AI response did not include this dimension; a neutral 50 was applied.',
      });
    }
  }

  const weighted = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const computedScore = Math.round(weighted);
  const reportedScore = readinessRaw ? num(readinessRaw.score, 0, 100) : null;

  const improvements: Improvement[] = Array.isArray(data.improvements)
    ? data.improvements
        .filter(isObj)
        .map((item) => {
          const area = str(item.area, 120);
          const suggestion = str(item.suggestion, 1500);
          if (!area || !suggestion) return null;
          const impact =
            item.impact === 'high' || item.impact === 'medium' || item.impact === 'low'
              ? item.impact
              : 'medium';
          return { area, suggestion, impact } satisfies Improvement;
        })
        .filter((item): item is Improvement => item !== null)
        .slice(0, 12)
    : [];

  const recommended = Array.isArray(data.recommended_platforms)
    ? data.recommended_platforms
        .filter(isObj)
        .map((item) => {
          const value = platform(item.platform);
          const reason = str(item.reason, 800);
          return value && reason ? { platform: value, reason } : null;
        })
        .filter((item): item is { platform: Platform; reason: string } => item !== null)
        .slice(0, 3)
    : [];

  return {
    summary,
    strengths: strArray(data.strengths, 10),
    weaknesses: strArray(data.weaknesses, 10),
    hook_assessment: hook,
    song_fit: songFit,
    audience_fit: str(data.audience_fit, 2000) ?? 'No audience assessment was returned.',
    feasibility,
    pacing_suggestions: strArray(data.pacing_suggestions, 10),
    improvements,
    revised_concept: revised,
    alternative_concept: str(data.alternative_concept, 4000),
    recommended_platforms: recommended,
    next_steps: strArray(data.next_steps, 10),
    readiness: {
      score: reportedScore ?? computedScore,
      confidence: confidence(readinessRaw?.confidence),
      components,
      rubric_version: 'ai-1.0.0',
      disclaimer: READINESS_DISCLAIMER,
    },
    source: 'ai',
    generated_at: nowIso(),
  };
}

export interface AiFilmingPlan {
  shot_list: { shot: string; framing: string; duration_seconds: number; notes: string }[];
  session_plan: { block: string; minutes: number; task: string }[];
  equipment_checklist: string[];
  location_notes: string[];
  risks: string[];
  total_minutes: number | null;
}

export function parseFilmingPlan(data: unknown): AiFilmingPlan {
  if (!isObj(data)) throw new AiResponseError('The filming plan was not a JSON object.');
  const shots = Array.isArray(data.shot_list)
    ? data.shot_list
        .filter(isObj)
        .map((item) => {
          const shot = str(item.shot, 600);
          if (!shot) return null;
          return {
            shot,
            framing: str(item.framing, 300) ?? '',
            duration_seconds: num(item.duration_seconds, 0, 600) ?? 0,
            notes: str(item.notes, 600) ?? '',
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  if (!shots.length) throw new AiResponseError('The AI response contained no shots.');
  return {
    shot_list: shots,
    session_plan: Array.isArray(data.session_plan)
      ? data.session_plan
          .filter(isObj)
          .map((item) => ({
            block: str(item.block, 200) ?? 'Session',
            minutes: Math.round(num(item.minutes, 0, 480) ?? 0),
            task: str(item.task, 600) ?? '',
          }))
      : [],
    equipment_checklist: strArray(data.equipment_checklist, 20),
    location_notes: strArray(data.location_notes, 10),
    risks: strArray(data.risks, 10),
    total_minutes: (() => {
      const value = num(data.total_minutes, 0, 2400);
      return value === null ? null : Math.round(value);
    })(),
  };
}

export interface AiMetadataPlatform {
  platform: Platform;
  title: string;
  caption: string;
  description: string | null;
  search_phrases: string[];
  hashtags: { tag: string; reason: string | null }[];
  call_to_action: string | null;
  pinned_comment: string | null;
  thumbnail_concept: string | null;
  opening_overlay: string | null;
  alternative_hooks: string[];
  suggested_duration_seconds: number | null;
  recommended_excerpt: string | null;
  accessibility_notes: string | null;
  rationale: string | null;
}

export function parseMetadataPlatforms(data: unknown): AiMetadataPlatform[] {
  const list = isObj(data) && Array.isArray(data.platforms) ? data.platforms : Array.isArray(data) ? data : null;
  if (!list) throw new AiResponseError('The AI response did not contain a platforms array.');
  const parsed = list
    .filter(isObj)
    .map((item) => {
      const platformValue = platform(item.platform);
      const title = str(item.title, 300);
      const caption = str(item.caption, 4000);
      if (!platformValue || !title || !caption) return null;
      return {
        platform: platformValue,
        title,
        caption,
        description: str(item.description, 6000),
        search_phrases: strArray(item.search_phrases, 12, 160),
        hashtags: Array.isArray(item.hashtags)
          ? item.hashtags
              .map((tag) => (typeof tag === 'string' ? { tag, reason: null } : isObj(tag) ? {
                tag: str(tag.tag, 80) ?? '',
                reason: str(tag.reason, 300),
              } : null))
              .filter((tag): tag is { tag: string; reason: string | null } => Boolean(tag && tag.tag))
              .slice(0, 30)
          : [],
        call_to_action: str(item.call_to_action, 500),
        pinned_comment: str(item.pinned_comment, 600),
        thumbnail_concept: str(item.thumbnail_concept, 600),
        opening_overlay: str(item.opening_overlay, 300),
        alternative_hooks: strArray(item.alternative_hooks, 6, 300),
        suggested_duration_seconds: (() => {
          const value = num(item.suggested_duration_seconds, 0, 600);
          return value === null ? null : Math.round(value);
        })(),
        recommended_excerpt: str(item.recommended_excerpt, 300),
        accessibility_notes: str(item.accessibility_notes, 800),
        rationale: str(item.rationale, 1500),
      } satisfies AiMetadataPlatform;
    })
    .filter((item): item is AiMetadataPlatform => item !== null);
  if (!parsed.length) throw new AiResponseError('The AI response contained no usable platform packages.');
  return parsed;
}

export interface AiPerformanceSummary {
  observations: { text: string; kind: 'observed' | 'inferred'; confidence: ConfidenceLevel }[];
  caveats: string[];
  suggested_tests: { hypothesis: string; test: string }[];
}

export function parsePerformanceSummary(data: unknown): AiPerformanceSummary {
  if (!isObj(data)) throw new AiResponseError('The AI summary was not a JSON object.');
  const observations = Array.isArray(data.observations)
    ? data.observations
        .filter(isObj)
        .map((item) => {
          const text = str(item.text, 1200);
          if (!text) return null;
          return {
            text,
            kind: item.kind === 'inferred' ? ('inferred' as const) : ('observed' as const),
            confidence: confidence(item.confidence),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item))
    : [];
  if (!observations.length) throw new AiResponseError('The AI response contained no observations.');
  return {
    observations,
    caveats: strArray(data.caveats, 8, 600),
    suggested_tests: Array.isArray(data.suggested_tests)
      ? data.suggested_tests
          .filter(isObj)
          .map((item) => ({
            hypothesis: str(item.hypothesis, 600) ?? '',
            test: str(item.test, 800) ?? '',
          }))
          .filter((item) => item.hypothesis && item.test)
      : [],
  };
}

export interface AiTrendExplanation {
  what_it_is: string;
  evidence_reading: string;
  song_fit: string;
  adaptation: string;
  declining_risk: string | null;
  uncertainty: string;
  recommended_platforms: string[];
}

export function parseTrendExplanation(data: unknown): AiTrendExplanation {
  if (!isObj(data)) throw new AiResponseError('The AI explanation was not a JSON object.');
  const what = str(data.what_it_is, 2000);
  const evidence = str(data.evidence_reading, 2000);
  const fit = str(data.song_fit, 2000);
  const adaptation = str(data.adaptation, 2000);
  const uncertainty = str(data.uncertainty, 2000);
  if (!what || !evidence || !fit || !adaptation || !uncertainty) {
    throw new AiResponseError('The AI trend explanation was incomplete.');
  }
  return {
    what_it_is: what,
    evidence_reading: evidence,
    song_fit: fit,
    adaptation,
    declining_risk: str(data.declining_risk, 1000),
    uncertainty,
    recommended_platforms: strArray(data.recommended_platforms, 4, 80),
  };
}

export function parseTone(value: string): Tone {
  return (TONES as readonly string[]).includes(value) ? (value as Tone) : 'conversational';
}

export function describeAiError(error: unknown): string {
  if (error instanceof AiResponseError) return error.message;
  if (error instanceof Error) return truncate(error.message, 400);
  return 'The AI operation failed for an unknown reason.';
}
