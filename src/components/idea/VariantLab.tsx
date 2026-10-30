import { useEffect, useMemo, useState } from 'react';
import type { ContentIdea, Platform, Preset, Song, Tone } from '../../lib/types';
import { PLATFORMS, PLATFORM_LABELS } from '../../lib/types';
import {
  buildCaptionVariants,
  buildHookVariants,
  type Variant,
} from '../../lib/variants';
import { Callout, CopyButton, SectionCard, SegmentedControl } from '../ui/primitives';
import { Field, Select } from '../ui/forms';

/**
 * Variant lab: write several hook or caption options, score them with the
 * transparent craft heuristic and pick one. Picking never overwrites anything
 * until you press "Use this".
 */
export function VariantLab({
  idea,
  song,
  preset,
  onUseHook,
  onUseCaption,
}: {
  idea: ContentIdea;
  song: Song | null;
  preset: Preset | null;
  onUseHook: (text: string) => void;
  onUseCaption: (text: string) => void;
}) {
  const [field, setField] = useState<'hook' | 'caption'>('hook');
  const [platform, setPlatform] = useState<Platform>(idea.platforms?.[0] ?? 'instagram-reels');
  const [tone, setTone] = useState<Tone>('conversational');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [field, platform, tone, idea.id]);

  const variants = useMemo<Variant[]>(() => {
    if (field === 'hook') {
      return buildHookVariants({ idea, song, preset, platform, count: 5 });
    }
    return buildCaptionVariants({ idea, song, preset, platform, tone, count: 4 });
  }, [field, idea, song, preset, platform, tone]);

  const chosen = variants.find((variant) => variant.id === selected) ?? null;
  const best = variants[0] ?? null;

  return (
    <SectionCard
      title="A/B variant lab"
      description="Scores describe the writing, not the outcome. They are a checklist for craft — not a prediction of reach."
      actions={
        <SegmentedControl
          size="sm"
          ariaLabel="Variant field"
          value={field}
          onChange={(value) => setField(value)}
          options={[
            { value: 'hook', label: 'Hooks' },
            { value: 'caption', label: 'Captions' },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Platform limits to score against">
          <Select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            options={PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
            aria-label="Platform"
          />
        </Field>
        {field === 'caption' ? (
          <Field label="Tone">
            <Select
              value={tone}
              onChange={(event) => setTone(event.target.value as Tone)}
              aria-label="Tone"
              options={[
                'conversational',
                'funny',
                'mysterious',
                'emotional',
                'cinematic',
                'direct',
                'minimal',
                'storytelling',
              ].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
            />
          </Field>
        ) : (
          <div className="flex items-end pb-1 text-2xs leading-relaxed text-slate-faint">
            Hooks are scored on clarity, curiosity, song specificity and length fit — not on a call to action.
          </div>
        )}
      </div>

      <ul className="mt-4 space-y-2.5">
        {variants.map((variant, index) => {
          const isChosen = variant.id === selected;
          const isBest = index === 0;
          return (
            <li
              key={variant.id}
              className={`rounded-xl border p-3 transition-all duration-200 ${
                isChosen
                  ? 'border-accent/50 bg-accent-dim/25'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="chip">{variant.label}</span>
                  {isBest ? <span className="chip-accent">Highest score</span> : null}
                  <span className="text-2xs text-slate-faint">
                    {variant.chars} chars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-aqua"
                      style={{ width: `${variant.score}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold tabular-nums text-white">{variant.score}</span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-text">{variant.text}</p>
              {variant.notes.length ? (
                <ul className="mt-2 space-y-0.5">
                  {variant.notes.map((note) => (
                    <li key={note} className="text-2xs leading-relaxed text-warn">
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className={`btn-sm ${isChosen ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelected(isChosen ? null : variant.id)}
                  aria-pressed={isChosen}
                >
                  {isChosen ? 'Selected' : 'Select'}
                </button>
                <CopyButton text={variant.text} label="Copy" className="btn-ghost btn-sm" />
              </div>
            </li>
          );
        })}
      </ul>

      {chosen ? (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-slate-faint">
            Why “{chosen.label}” scores {chosen.score}
          </p>
          <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {chosen.components.map((component) => (
              <div key={component.key} className="flex items-baseline justify-between gap-2 text-2xs">
                <dt className="text-slate-muted">
                  {component.label}
                  <span className="ml-1 text-slate-faint">×{component.weight}</span>
                </dt>
                <dd className="tabular-nums text-slate-text">{component.score}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {field === 'hook' ? (
              <button type="button" className="btn-primary btn-sm" onClick={() => onUseHook(chosen.text)}>
                Use as hook
              </button>
            ) : (
              <button type="button" className="btn-primary btn-sm" onClick={() => onUseCaption(chosen.text)}>
                Append to notes
              </button>
            )}
          </div>
        </div>
      ) : null}

      {best && best.score < 55 ? (
        <div className="mt-3">
          <Callout tone="neutral" title="Every option is scoring low">
            Usually that means the idea itself is still vague, not that the wording is bad. Sharpen the concept on the
            Plan tab first, then come back.
          </Callout>
        </div>
      ) : null}
    </SectionCard>
  );
}
